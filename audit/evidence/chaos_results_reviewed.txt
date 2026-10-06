# VYNL Chaos Testing Results (`docs/CHAOS_RESULTS.md`)

**Last Executed**: `2026-10-06 18:36:48 UTC`  
**Test Suite**: `scripts/chaos.py` (Repeatable automated chaos runner)  
**Status**: **ALL INVARIANTS PASSED (3/3)**

---

## 1. Summary of Executed Fault Injections

| # | Experiment | Injected Fault | System Invariant | Outcome |
|---|---|---|---|---|
| 1 | Redis Outage & Circuit Breaker Probing | Simulated Redis TCP Connection Refused | Graceful resilience / no crash | **PASSED** |
| 2 | Transient Flakiness Backoff & Jitter | Transient Timeout in Downstream Service (2 consecutive failures) | Graceful resilience / no crash | **PASSED** |
| 3 | Connection Saturation & Deadline Exceeded | Simulated 500ms pool wait with 50ms deadline | Graceful resilience / no crash | **PASSED** |

---

## 2. Detailed Experiment Metrics

### Redis Outage & Circuit Breaker Probing
- **Fault**: Simulated Redis TCP Connection Refused
- **Invariants Verified**: Yes
- **Execution Metrics**:
  - `initial_successes`: `5`
  - `consecutive_failures_before_trip`: `3`
  - `fast_failed_open_calls`: `2`
  - `recovery_probe_success`: `True`
  - `final_state`: `closed`

### Transient Flakiness Backoff & Jitter
- **Fault**: Transient Timeout in Downstream Service (2 consecutive failures)
- **Invariants Verified**: Yes
- **Execution Metrics**:
  - `attempts_required`: `3`
  - `backoff_elapsed_seconds`: `0.0475`
  - `recovered_cleanly`: `True`

### Connection Saturation & Deadline Exceeded
- **Fault**: Simulated 500ms pool wait with 50ms deadline
- **Invariants Verified**: Yes
- **Execution Metrics**:
  - `deadline_enforced`: `True`
  - `clean_timeout_interruption`: `True`

---

## 3. Resilience Guardrails Demonstrated

1. **Circuit Breaker Fast-Failing**: When Redis fails consecutively (threshold=3), downstream callers do not queue or hang; they are fast-failed with `503 Service Unavailable` and standard `Retry-After` headers.
2. **Canary Recovery**: The circuit breaker probes downstream health via `HALF_OPEN` state, immediately restoring traffic once healthy without human intervention.
3. **Exponential Backoff with Full Jitter**: Retries distribute load across random intervals preventing thundering herds.
4. **Strict Deadlines**: Connection saturation and database deadlocks are aborted within the 15-second request timeout boundary.
