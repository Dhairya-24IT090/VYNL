from service_kit.config import BaseServiceSettings

class PlaylistSettings(BaseServiceSettings):
    SERVICE_NAME: str = "playlist-service"
    AUTO_MIGRATE: bool = False
    MAX_ITEMS_PER_PLAYLIST: int = 500
    DRAFT_TTL_SECONDS: int = 3600
    INVITE_TTL_SECONDS: int = 86400  # 24 hours
