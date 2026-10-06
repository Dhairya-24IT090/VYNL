from dataclasses import dataclass
from typing import Optional
import time

@dataclass
class Actor:
    user_id: Optional[str]
    is_internal: bool = False
    role: Optional[str] = None  # "owner", "editor", "viewer", None

    @property
    def is_authenticated(self) -> bool:
        return self.user_id is not None or self.is_internal

@dataclass
class RequestContext:
    request_id: str
    trace_id: str
    actor: Actor
    deadline: Optional[float] = None  # monotonic timestamp
    is_cancelled: bool = False

    @property
    def user_id(self) -> Optional[str]:
        return self.actor.user_id

    def is_expired(self) -> bool:
        if self.deadline is None:
            return False
        return time.monotonic() >= self.deadline

    def remaining_time(self) -> Optional[float]:
        if self.deadline is None:
            return None
        return max(0.0, self.deadline - time.monotonic())
