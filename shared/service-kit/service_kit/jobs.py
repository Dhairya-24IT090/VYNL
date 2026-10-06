import asyncio
import json
import logging
import random
import time
import uuid
from typing import Any, Callable, Coroutine, Dict, Optional
import redis.asyncio as redis
from service_kit.redis_ import RedisManager

# Lua script for atomic deduplication check and enqueue
ENQUEUE_DEDUPE_LUA = """
local stream_key = KEYS[1]
local dedupe_key = KEYS[2]
local dedupe_ttl = tonumber(ARGV[1])
local job_id = ARGV[2]
local envelope_json = ARGV[3]

local set_res = redis.call('SET', dedupe_key, job_id, 'EX', dedupe_ttl, 'NX')
if set_res then
    redis.call('XADD', stream_key, '*', 'envelope', envelope_json)
    return 1
else
    return 0
end
"""

class JobQueue:
    def __init__(self, redis_manager: RedisManager, dlq_stream: str = "vynl:jobs:dlq"):
        self.redis_manager = redis_manager
        self.dlq_stream = dlq_stream
        self._enqueue_script = None

    async def _get_script(self):
        if self._enqueue_script is None:
            client = await self.redis_manager.get_client()
            self._enqueue_script = client.register_script(ENQUEUE_DEDUPE_LUA)
        return self._enqueue_script

    async def enqueue(
        self,
        job_name: str,
        payload: Dict[str, Any],
        dedupe_key: Optional[str] = None,
        dedupe_ttl: int = 3600,
        traceparent: Optional[str] = None,
        max_retries: int = 3,
    ) -> Optional[str]:
        client = await self.redis_manager.get_client()
        stream_key = f"vynl:jobs:{job_name}"
        job_id = str(uuid.uuid4())

        envelope = {
            "job_id": job_id,
            "job_name": job_name,
            "payload": payload,
            "traceparent": traceparent or f"00-{uuid.uuid4().hex}-0000000000000001-01",
            "attempt": 1,
            "max_retries": max_retries,
            "enqueued_at": time.time(),
            "dedupe_key": dedupe_key,
        }
        envelope_json = json.dumps(envelope)

        if dedupe_key:
            full_dedupe_key = f"vynl:dedupe:{dedupe_key}"
            script = await self._get_script()
            res = await script(
                keys=[stream_key, full_dedupe_key],
                args=[dedupe_ttl, job_id, envelope_json],
            )
            if res == 1:
                return job_id
            return None  # Deduplicated
        else:
            await client.xadd(stream_key, {"envelope": envelope_json})
            return job_id

    async def send_to_dlq(self, job_name: str, envelope: Dict[str, Any], error: str):
        client = await self.redis_manager.get_client()
        dlq_entry = {
            "job_name": job_name,
            "envelope": json.dumps(envelope),
            "error": error,
            "exhausted_at": time.time(),
        }
        await client.xadd(self.dlq_stream, dlq_entry)

class JobWorker:
    def __init__(
        self,
        redis_manager: RedisManager,
        job_name: str,
        handler: Callable[[Dict[str, Any], Dict[str, Any]], Coroutine[Any, Any, None]],
        consumer_group: str = "workers",
        worker_id: Optional[str] = None,
    ):
        self.redis_manager = redis_manager
        self.job_name = job_name
        self.stream_key = f"vynl:jobs:{job_name}"
        self.handler = handler
        self.consumer_group = consumer_group
        self.worker_id = worker_id or f"worker-{uuid.uuid4().hex[:8]}"
        self.queue = JobQueue(redis_manager)
        self.running = False
        self._task: Optional[asyncio.Task] = None

    async def init_group(self):
        client = await self.redis_manager.get_client()
        try:
            await client.xgroup_create(self.stream_key, self.consumer_group, id="0", mkstream=True)
        except Exception as e:
            # Group already exists
            pass

    async def start(self):
        await self.init_group()
        self.running = True
        self._task = asyncio.create_task(self._worker_loop())

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _worker_loop(self):
        client = await self.redis_manager.get_client()
        while self.running:
            try:
                # Read new messages or pending claims
                messages = await client.xreadgroup(
                    groupname=self.consumer_group,
                    consumername=self.worker_id,
                    streams={self.stream_key: ">"},
                    count=1,
                    block=1000,
                )
                if not messages:
                    continue

                for stream, stream_msgs in messages:
                    for msg_id, fields in stream_msgs:
                        await self._process_message(client, msg_id, fields)

            except asyncio.CancelledError:
                break
            except Exception as e:
                await asyncio.sleep(1)

    async def _process_message(self, client: redis.Redis, msg_id: str, fields: Dict[str, Any]):
        envelope_raw = fields.get("envelope")
        if not envelope_raw:
            await client.xack(self.stream_key, self.consumer_group, msg_id)
            return

        envelope = json.loads(envelope_raw)
        payload = envelope["payload"]
        attempt = envelope.get("attempt", 1)
        max_retries = envelope.get("max_retries", 3)

        try:
            # Execute handler (which commits its DB transaction BEFORE returning)
            await self.handler(payload, envelope)
            # CRITICAL INVARIANT: XACK only after successful completion
            await client.xack(self.stream_key, self.consumer_group, msg_id)
        except Exception as exc:
            logging.error(f"Worker {self.worker_id} failed processing {msg_id}: {exc}")
            if attempt < max_retries:
                # Retry with backoff
                envelope["attempt"] = attempt + 1
                backoff = min(30.0, 0.5 * (2 ** (attempt - 1))) + random.uniform(0, 0.5)
                await asyncio.sleep(backoff)
                await client.xadd(self.stream_key, {"envelope": json.dumps(envelope)})
                # Ack the old failed instance since we re-enqueued
                await client.xack(self.stream_key, self.consumer_group, msg_id)
            else:
                # Permanent failure -> Straight to DLQ
                await self.queue.send_to_dlq(self.job_name, envelope, str(exc))
                await client.xack(self.stream_key, self.consumer_group, msg_id)
