import asyncio
import inspect
import logging
import signal
import sys
from typing import Callable, List, Optional

class GracefulShutdownManager:
    def __init__(
        self,
        service_name: str,
        drain_timeout_seconds: float = 25.0,
        readiness_delay_seconds: float = 3.0,
    ):
        self.service_name = service_name
        self.drain_timeout_seconds = drain_timeout_seconds
        self.readiness_delay_seconds = readiness_delay_seconds
        self.is_draining = False
        self._cleanup_callbacks: List[Callable[[], asyncio.Future]] = []
        self._ws_close_callbacks: List[Callable[[], asyncio.Future]] = []

    def register_cleanup(self, callback: Callable):
        self._cleanup_callbacks.append(callback)

    def register_ws_closer(self, callback: Callable):
        self._ws_close_callbacks.append(callback)

    def install_signal_handlers(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        target_loop = loop or asyncio.get_event_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                target_loop.add_signal_handler(
                    sig,
                    lambda s=sig: asyncio.create_task(self.initiate_shutdown(s)),
                )
            except (NotImplementedError, AttributeError):
                # Windows event loop fallback
                signal.signal(sig, lambda s, f: asyncio.create_task(self.initiate_shutdown(s)))

    async def initiate_shutdown(self, sig: Optional[signal.Signals] = None):
        if self.is_draining:
            return
        self.is_draining = True
        logging.info(f"[{self.service_name}] Caught signal {sig}. Initiating graceful shutdown...")

        # 1. Flip readiness to 503 and wait for propagation delay
        if self.readiness_delay_seconds > 0:
            await asyncio.sleep(self.readiness_delay_seconds)

        # 2. Close active WebSocket connections with code 1001 (Going Away)
        for ws_closer in self._ws_close_callbacks:
            try:
                if inspect.iscoroutinefunction(ws_closer):
                    await ws_closer()
                else:
                    ws_closer()
            except Exception as e:
                logging.error(f"Error during WS close callback: {e}")

        # 3. Drain in-flight operations with timeout
        try:
            async with asyncio.timeout(self.drain_timeout_seconds):
                for cleanup in self._cleanup_callbacks:
                    try:
                        if inspect.iscoroutinefunction(cleanup):
                            await cleanup()
                        else:
                            cleanup()
                    except Exception as e:
                        logging.error(f"Error in cleanup handler: {e}")
        except asyncio.TimeoutError:
            logging.warning(f"[{self.service_name}] Drain timeout exceeded! Forcing shutdown.")

        logging.info(f"[{self.service_name}] Graceful shutdown complete. Exiting 0.")
