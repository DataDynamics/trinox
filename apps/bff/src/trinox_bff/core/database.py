"""Async SQLAlchemy engine / session factory + schema bootstrap from ``db.sql``."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from trinox_bff.core.settings import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


_settings = get_settings()
engine = create_async_engine(_settings.database.url, future=True, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


def _split_statements(sql_text: str) -> list[str]:
    """Split a SQL script into statements on ``;``.

    Comments starting with ``--`` are stripped line-by-line first so that
    semicolons inside comments don't confuse the splitter.
    """
    stripped_lines = []
    for line in sql_text.splitlines():
        idx = line.find("--")
        if idx >= 0:
            line = line[:idx]
        stripped_lines.append(line)
    cleaned = "\n".join(stripped_lines)
    return [s.strip() for s in cleaned.split(";") if s.strip()]


async def _run_sql_file(path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    statements = _split_statements(sql)
    async with engine.begin() as conn:
        for stmt in statements:
            await conn.execute(text(stmt))


async def init_db() -> None:
    """Bootstrap the database schema from ``db.sql`` (if enabled).

    Falls back to SQLAlchemy's ``create_all`` if the schema file is missing,
    so dev setups without an external SQL file still work.
    """
    # Import models so Base.metadata is populated for the fallback path.
    from trinox_bff.models import history  # noqa: F401

    cfg = _settings.database
    if cfg.bootstrap:
        schema_path = _settings.resolve(cfg.schema_file)
        if schema_path.exists():
            logger.info("Bootstrapping schema from %s", schema_path)
            await _run_sql_file(schema_path)
            return
        logger.warning(
            "schema_file %s not found; falling back to SQLAlchemy create_all",
            schema_path,
        )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
