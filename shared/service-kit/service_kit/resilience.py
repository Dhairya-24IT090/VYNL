import asyncio
import random
import time
from enum import Enum
from typing import Any, Callable, Coroutine, List, Optional, Tuple, Type
from service_kit.errors import DependencyUnavailableError

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        error_rate_threshold: float = 0.5,
        window_seconds: float = 30.0,
        probe_timeout_seconds: float = 30.0,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.error_rate_threshold = error_rate_threshold
        self.window_seconds = window_seconds
        self.probe_timeout_seconds = probe_timeout_seconds

        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.last_state_change = time.monotonic()
        self._history: List[Tuple[float, bool]] = []  # (timestamp, success)

    def _clean_history(self, now: float):
        cutoff = now - self.window_seconds
        self._history = [entry for entry in self._history if entry[0] >= cutoff]

    def _should_open(self, now: float) -> bool:
        if self.consecutive_failures >= self.failure_threshold:
            return True
        self._clean_history(now)
        if len(self._history) >= 10:  # Minimum sample size to trigger percentage trip
            failures = sum(1 for _, ok in self._history if not ok)
            rate = failures / len(self._history)
            if rate >= self.error_rate_threshold:
                return True
        return False

    def can_execute(self) -> bool:
        now = time.monotonic()
        if self.state == CircuitState.CLOSED:
            return True
        elif self.state == CircuitState.OPEN:
            if now - self.last_state_change >= self.probe_timeout_seconds:
                self.state = CircuitState.HALF_OPEN
                self.last_state_change = now
                return True
            return False
        elif self.state == CircuitState.HALF_OPEN:
            return True
        return False

    def record_success(self):
        now = time.monotonic()
        self.consecutive_failures = 0
        self._history.append((now, True))
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            self.last_state_change = now

    def record_failure(self):
        now = time.monotonic()
        self.consecutive_failures += 1
        self._history.append((now, False))
        if self.state in (CircuitState.CLOSED, CircuitState.HALF_OPEN):
            if self._should_open(now) or self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                self.last_state_change = now

    async def call(self, func: Callable[..., Coroutine[Any, Any, Any]], *args: Any, **kwargs: Any) -> Any:
        if not self.can_execute():
            remaining = max(1, int(self.probe_timeout_seconds - (time.monotonic() - self.last_state_change)))
            raise DependencyUnavailableError(
                message=f"Circuit breaker '{self.name}' is OPEN",
                retry_after=remaining,
            )
        try:
            result = await func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise e

async def retry_with_backoff(
    func: Callable[..., Coroutine[Any, Any, Any]],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 10.0,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    **kwargs: Any,
) -> Any:
    """Executes func with exponential backoff and full jitter."""
    attempt = 0
    while True:
        try:
            return await func(*args, **kwargs)
        except retryable_exceptions as e:
            attempt += 1
            if attempt > max_retries:
                raise e
            # Full jitter: random between 0 and min(max_delay, base_delay * 2**(attempt - 1))
            temp_delay = min(max_delay, base_delay * (2 ** (attempt - 1)))
            sleep_duration = random.uniform(0, temp_delay)
            await asyncio.sleep(sleep_duration)
