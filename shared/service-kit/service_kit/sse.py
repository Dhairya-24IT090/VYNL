import asyncio
import json
import time
from typing import AsyncGenerator, Dict, Optional
import redis.asyncio as redis

class SSEManager:
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client

    async def publish_event(self, user_id: str, event_type: str, data: Dict, event_id: Optional[str] = None):
        if not self.redis:
            return
        stream_key = f"vynl:events:{user_id}"
        payload = {
            "type": event_type,
            "data": json.dumps(data),
            "ts": str(time.time()),
        }
        await self.redis.xadd(stream_key, payload, id=event_id or "*", maxlen=1000, approximate=True)

    async def event_stream(
        self,
        user_id: str,
        last_event_id: Optional[str] = None,
        heartbeat_interval: float = 15.0,
    ) -> AsyncGenerator[str, None]:
        stream_key = f"vynl:events:{user_id}"
        last_id = last_event_id or "$"

        # Yield initial connected event
        yield f": connected\n\n"

        while True:
            try:
                if self.redis:
                    # Read messages or wait up to heartbeat_interval
                    block_ms = int(heartbeat_interval * 1000)
                    response = await self.redis.xread(
                        streams={stream_key: last_id},
                        count=10,
                        block=block_ms,
                    )
                    if response:
                        for _, messages in response:
                            for msg_id, fields in messages:
                                last_id = msg_id
                                ev_type = fields.get("type", "message")
                                ev_data = fields.get("data", "{}")
                                yield f"id: {msg_id}\nevent: {ev_type}\ndata: {ev_data}\n\n"
                    else:
                        # Heartbeat comment
                        yield f": heartbeat\n\n"
                else:
                    await asyncio.sleep(heartbeat_interval)
                    yield f": heartbeat\n\n"

            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(1)
                yield f": heartbeat\n\n"
