import asyncio
import time
from unittest.mock import patch
import pytest

from service_kit.errors import DependencyUnavailableError
from service_kit.resilience import CircuitBreaker, CircuitState, retry_with_backoff

@pytest.mark.asyncio
async def test_retry_with_exponential_backoff_and_full_jitter():
    """
    Task 43: Verifies exponential backoff with full jitter and retry limits.
    """
    attempts = 0
    sleeps = []

    async def transient_failing_func():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise ConnectionResetError("Transient network failure")
        return "success"

    # Intercept sleep to record backoff delays without slowing tests
    async def mock_sleep(delay):
        sleeps.append(delay)

    with patch("asyncio.sleep", side_effect=mock_sleep):
        result = await retry_with_backoff(
            transient_failing_func,
            max_retries=3,
            base_delay=1.0,
            max_delay=10.0,
            retryable_exceptions=(ConnectionResetError,),
        )

    assert result == "success"
    assert attempts == 3
    assert len(sleeps) == 2

    # Attempt 1: delay in [0, 1.0 * 2^0] = [0, 1.0]
    assert 0.0 <= sleeps[0] <= 1.0
    # Attempt 2: delay in [0, 1.0 * 2^1] = [0, 2.0]
    assert 0.0 <= sleeps[1] <= 2.0

@pytest.mark.asyncio
async def test_retry_exceeds_max_retries_raises_exception():
    """
    When retries are exhausted, the original exception is re-raised.
    """
    attempts = 0

    async def persistently_failing_func():
        nonlocal attempts
        attempts += 1
        raise ValueError("Fatal failure")

    with patch("asyncio.sleep", return_value=None):
        with pytest.raises(ValueError) as exc_info:
            await retry_with_backoff(
                persistently_failing_func,
                max_retries=2,
                base_delay=0.1,
                retryable_exceptions=(ValueError,),
            )
    assert attempts == 3  # Initial try + 2 retries
    assert "Fatal failure" in str(exc_info.value)

@pytest.mark.asyncio
async def test_circuit_breaker_tripping_probing_and_recovery():
    """
    Task 43: Circuit breaker transitions:
    CLOSED -> (failures >= threshold) -> OPEN
    OPEN -> (probe timeout) -> HALF_OPEN
    HALF_OPEN -> (probe succeeds) -> CLOSED
    HALF_OPEN -> (probe fails) -> OPEN
    """
    cb = CircuitBreaker(
        name="test_service",
        failure_threshold=3,
        probe_timeout_seconds=0.1,  # Fast probe for test
    )
    assert cb.state == CircuitState.CLOSED

    async def fail_call():
        raise RuntimeError("Service down")

    async def success_call():
        return "ok"

    # 1. Trigger failures until threshold reached
    for _ in range(3):
        with pytest.raises(RuntimeError):
            await cb.call(fail_call)

    # 2. Breaker must now be OPEN
    assert cb.state == CircuitState.OPEN

    # Calls while OPEN fail immediately with DependencyUnavailableError (fail-fast)
    with pytest.raises(DependencyUnavailableError) as exc_info:
        await cb.call(success_call)
    assert exc_info.value.status_code == 503
    assert "OPEN" in str(exc_info.value.message)
    assert exc_info.value.retry_after > 0

    # 3. Wait for probe timeout
    await asyncio.sleep(0.12)

    # State transitions to HALF_OPEN on next call attempt
    assert cb.can_execute() is True
    assert cb.state == CircuitState.HALF_OPEN

    # 4. Probe success closes the circuit
    res = await cb.call(success_call)
    assert res == "ok"
    assert cb.state == CircuitState.CLOSED

    # 5. Verify probe failure immediately re-opens the circuit
    # Trip again
    for _ in range(3):
        with pytest.raises(RuntimeError):
            await cb.call(fail_call)
    assert cb.state == CircuitState.OPEN

    # Wait for probe
    await asyncio.sleep(0.12)
    assert cb.can_execute() is True
    assert cb.state == CircuitState.HALF_OPEN

    # Probe fails -> immediately OPEN again
    with pytest.raises(RuntimeError):
        await cb.call(fail_call)
    assert cb.state == CircuitState.OPEN
