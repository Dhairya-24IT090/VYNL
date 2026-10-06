from pydantic_settings import BaseSettings

class WrapSettings(BaseSettings):
    SERVICE_NAME: str = "wrap-service"
    PORT: int = 8002
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/vynl_wrap"
    REDIS_URL: str = "redis://127.0.0.1:6379"
    INTERNAL_AUTH_SECRET: str = "dev-secret-internal-key-minimum-32-chars-long"

    class Config:
        env_prefix = "VYNL_WRAP_"
