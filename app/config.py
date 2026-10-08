from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PORT: int = 8001
    BASE_URL: str = "http://localhost:8001"
    FRONTEND_URL: str = "http://localhost:5173"
    STREAMING_SERVICE_URL: str = "http://localhost:8000"

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "vynl_backend"

    JWT_SECRET_KEY: str = "vynl-insecure-dev-secret-key-change-in-production-32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
