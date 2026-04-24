"""Application settings loaded from ``config.yaml``.

The location of the config file can be overridden with the ``CONFIG_FILE``
environment variable. Every section has defaults, so partial configs are OK.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, ConfigDict, Field


class ServerConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8001
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])


class DatabaseConfig(BaseModel):
    url: str = "sqlite+aiosqlite:///./trinox.db"
    schema_file: str = "db.sql"
    bootstrap: bool = True


class TrinoConfig(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    host: str = "localhost"
    port: int = 8080
    user: str = "trinox"
    http_scheme: str = "http"
    password: str | None = None
    catalog: str | None = None
    schema: str | None = None

    @property
    def base_url(self) -> str:
        return f"{self.http_scheme}://{self.host}:{self.port}"


class HistoryConfig(BaseModel):
    poll_interval_seconds: int = 10


class LoggingConfig(BaseModel):
    level: str = "INFO"
    directory: str = "logs"
    filename_prefix: str = "app"
    console: bool = True
    retention_days: int = 30
    format: str = "%(asctime)s %(levelname)-7s [%(name)s] %(message)s"
    date_format: str = "%Y-%m-%d %H:%M:%S"


class Settings(BaseModel):
    server: ServerConfig = Field(default_factory=ServerConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    trino: TrinoConfig = Field(default_factory=TrinoConfig)
    history: HistoryConfig = Field(default_factory=HistoryConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)

    # The directory the config file lives in. Used as the base for resolving
    # relative paths (``schema_file``, ``logging.directory``).
    config_dir: Path = Field(default_factory=Path.cwd, exclude=True)

    def resolve(self, path: str) -> Path:
        """Resolve ``path`` relative to the config file directory."""
        p = Path(path)
        return p if p.is_absolute() else (self.config_dir / p)


def _default_config_path() -> Path:
    """Find the default config path.

    Search order:
    1. ``$CONFIG_FILE``
    2. ``./config.yaml`` in the current working directory
    3. ``config.yaml`` alongside the ``trinox_bff`` package (dev install)
    """
    env = os.environ.get("CONFIG_FILE")
    if env:
        return Path(env)
    cwd_cfg = Path.cwd() / "config.yaml"
    if cwd_cfg.exists():
        return cwd_cfg
    # apps/bff/config.yaml (one level above the ``src`` tree).
    pkg_cfg = Path(__file__).resolve().parents[3] / "config.yaml"
    return pkg_cfg


def load_settings(path: str | os.PathLike[str] | None = None) -> Settings:
    cfg_path = Path(path) if path else _default_config_path()
    raw: dict[str, Any] = {}
    if cfg_path.exists():
        with cfg_path.open("r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh) or {}
    settings = Settings(**raw)
    if cfg_path.exists():
        settings.config_dir = cfg_path.parent.resolve()
    return settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()
