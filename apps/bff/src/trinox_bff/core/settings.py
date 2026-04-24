"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Trino
    trino_host: str = "localhost"
    trino_port: int = 8080
    trino_user: str = "trinox"
    trino_password: str | None = None
    trino_http_scheme: str = "http"
    trino_catalog: str | None = None
    trino_schema: str | None = None

    # Persistence
    database_url: str = "sqlite+aiosqlite:///./trinox.db"

    # Scheduler
    history_poll_interval: int = 10  # seconds

    # Server
    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"

    # Limits
    query_preview_limit: int = 1000

    @property
    def trino_base_url(self) -> str:
        return f"{self.trino_http_scheme}://{self.trino_host}:{self.trino_port}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
