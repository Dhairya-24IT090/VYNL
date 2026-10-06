import sys
from typing import List, Type
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import ValidationError

class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENV: str = "development"
    PORT: int = 8000
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/vynl"
    REDIS_URL: str = "redis://localhost:6379/0"
    INTERNAL_AUTH_SECRET: str = "dev-internal-auth-secret-key-32charsmin"
    INVITE_SIGNING_KEYS: str = "dev-invite-secret-key-1,dev-invite-secret-key-old"

    def get_invite_signing_keys(self) -> List[str]:
        return [k.strip() for k in self.INVITE_SIGNING_KEYS.split(",") if k.strip()]

def validate_or_exit(settings_cls: Type[BaseServiceSettings]) -> BaseServiceSettings:
    try:
        settings = settings_cls()
    except ValidationError as e:
        sys.stderr.write("CONFIGURATION ERROR: The following required environment variables are missing or invalid:\n")
        # Print NAMES ONLY to stderr - never values
        for err in e.errors():
            field_name = ".".join(str(loc) for loc in err["loc"])
            sys.stderr.write(f"  - {field_name}\n")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write("CONFIGURATION ERROR: Failed to parse application configuration.\n")
        sys.exit(1)

    # In production, enforce TLS and secure configuration
    if settings.ENV.lower() == "production":
        errors = []
        if not settings.REDIS_URL.startswith("rediss://"):
            errors.append("REDIS_URL must use TLS (rediss://) in production")
        if "sslmode=require" not in settings.DATABASE_URL:
            errors.append("DATABASE_URL must enforce sslmode=require in production")
        if not settings.INTERNAL_AUTH_SECRET or len(settings.INTERNAL_AUTH_SECRET) < 32:
            errors.append("INTERNAL_AUTH_SECRET must be at least 32 characters in production")
        if not settings.get_invite_signing_keys():
            errors.append("INVITE_SIGNING_KEYS must contain at least one valid key in production")

        if errors:
            sys.stderr.write("PRODUCTION CONFIGURATION ERROR:\n")
            for err_msg in errors:
                sys.stderr.write(f"  - {err_msg}\n")
            sys.exit(1)

    return settings
