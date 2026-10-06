import time
import uuid
from typing import Optional
from service_kit.context import Actor

class ActorFactory:
    @staticmethod
    def create_owner(user_id: Optional[str] = None) -> Actor:
        return Actor(user_id=user_id or str(uuid.uuid4()), role="owner", is_internal=False)

    @staticmethod
    def create_editor(user_id: Optional[str] = None) -> Actor:
        return Actor(user_id=user_id or str(uuid.uuid4()), role="editor", is_internal=False)

    @staticmethod
    def create_viewer(user_id: Optional[str] = None) -> Actor:
        return Actor(user_id=user_id or str(uuid.uuid4()), role="viewer", is_internal=False)

    @staticmethod
    def create_stranger(user_id: Optional[str] = None) -> Actor:
        return Actor(user_id=user_id or str(uuid.uuid4()), role=None, is_internal=False)

    @staticmethod
    def create_internal() -> Actor:
        return Actor(user_id=None, role=None, is_internal=True)

class FakeClock:
    def __init__(self, initial_time: Optional[float] = None):
        self._current_time = initial_time or time.time()

    def now(self) -> float:
        return self._current_time

    def advance(self, seconds: float):
        self._current_time += seconds

class CanaryFixture:
    @staticmethod
    def generate_canaries() -> dict:
        return {
            "session_token": f"canary_session_{uuid.uuid4().hex}",
            "invite_token": f"canary_invite_{uuid.uuid4().hex}",
            "internal_secret": f"canary_secret_{uuid.uuid4().hex}",
            "api_key": f"canary_key_{uuid.uuid4().hex}",
            "file_id": f"file_id:canary_file_{uuid.uuid4().hex}",
            "storage_ref": f"storage_ref:canary_ref_{uuid.uuid4().hex}",
            "presigned_url": f"https://storage.vynl.local/audio.mp4?token=canary_token_{uuid.uuid4().hex}",
            "prompt_text": f"PROMPT_CANARY_{uuid.uuid4().hex}",
        }
