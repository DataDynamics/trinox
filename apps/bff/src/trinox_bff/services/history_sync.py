"""Background job that polls Trino's query list and upserts into history DB."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from trinox_bff.core.database import SessionLocal
from trinox_bff.models.history import QueryHistory
from trinox_bff.services.trino_client import get_rest_client

logger = logging.getLogger(__name__)


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _ms(value: Any) -> int | None:
    """Parse a Trino duration string like ``12.34s`` / ``1.2m`` to milliseconds."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    s = str(value).strip()
    try:
        if s.endswith("ms"):
            return int(float(s[:-2]))
        if s.endswith("us"):
            return int(float(s[:-2]) / 1000)
        if s.endswith("ns"):
            return int(float(s[:-2]) / 1_000_000)
        if s.endswith("s"):
            return int(float(s[:-1]) * 1000)
        if s.endswith("m"):
            return int(float(s[:-1]) * 60_000)
        if s.endswith("h"):
            return int(float(s[:-1]) * 3_600_000)
        return int(float(s))
    except ValueError:
        return None


def _bytes(value: Any) -> int | None:
    """Parse a Trino size string like ``12.34MB`` to bytes."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    s = str(value).strip().upper()
    units = {"B": 1, "KB": 1024, "MB": 1024**2, "GB": 1024**3, "TB": 1024**4, "PB": 1024**5}
    for suffix, mul in units.items():
        if s.endswith(suffix):
            try:
                return int(float(s[: -len(suffix)]) * mul)
            except ValueError:
                return None
    try:
        return int(float(s))
    except ValueError:
        return None


def _guess_query_type(sql: str | None) -> str | None:
    if not sql:
        return None
    stripped = sql.strip().lstrip("(").upper()
    for kw in ("SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "DROP",
              "ALTER", "EXPLAIN", "SHOW", "USE", "DESCRIBE", "WITH"):
        if stripped.startswith(kw):
            return "SELECT" if kw == "WITH" else kw
    return "OTHER"


def normalize(q: dict[str, Any]) -> dict[str, Any]:
    """Convert a Trino coordinator query payload into a flat history row."""
    session = q.get("session", {}) or {}
    stats = q.get("queryStats") or q.get("stats") or {}
    error = q.get("errorInfo") or {}
    error_code = q.get("errorCode") or {}
    query_id = q.get("queryId") or q.get("id")

    return {
        "query_id": query_id,
        "state": q.get("state", "UNKNOWN"),
        "user": session.get("user") or q.get("user"),
        "source": session.get("source") or q.get("source"),
        "catalog": session.get("catalog") or q.get("catalog"),
        "db_schema": session.get("schema") or q.get("schema"),
        "query_type": q.get("queryType") or _guess_query_type(q.get("query")),
        "sql_text": q.get("query", ""),
        "created_at": _parse_iso(q.get("createTime") or stats.get("createTime"))
        or datetime.utcnow(),
        "started_at": _parse_iso(stats.get("executionStartTime") or q.get("executionStartTime")),
        "ended_at": _parse_iso(q.get("endTime") or stats.get("endTime")),
        "queued_time_ms": _ms(stats.get("queuedTime")),
        "analysis_time_ms": _ms(stats.get("analysisTime")),
        "elapsed_time_ms": _ms(stats.get("elapsedTime")),
        "execution_time_ms": _ms(stats.get("executionTime")),
        "cpu_time_ms": _ms(stats.get("totalCpuTime")),
        "peak_memory_bytes": _bytes(stats.get("peakMemoryBytes") or stats.get("peakUserMemoryReservation")),
        "total_memory_bytes": _bytes(stats.get("totalMemoryReservation")),
        "processed_rows": stats.get("processedRows") or stats.get("totalRows"),
        "processed_bytes": _bytes(stats.get("processedBytes") or stats.get("totalBytes")),
        "output_rows": stats.get("outputRows"),
        "output_bytes": _bytes(stats.get("outputBytes")),
        "error_code": error_code.get("name") or error.get("name"),
        "error_name": error_code.get("name") or error.get("name"),
        "error_type": error_code.get("type") or error.get("type"),
        "error_message": (q.get("errorInfo") or {}).get("message") or q.get("failureInfo", {}).get("message"),
        "progress": stats.get("progressPercentage"),
        "raw": None,
    }


async def upsert_history(session: AsyncSession, rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    dialect = session.bind.dialect.name if session.bind else ""
    inserted = 0
    for row in rows:
        if not row.get("query_id"):
            continue
        if dialect == "sqlite":
            stmt = sqlite_insert(QueryHistory).values(**row)
            update_cols = {c: stmt.excluded[c] for c in row.keys() if c != "query_id"}
            stmt = stmt.on_conflict_do_update(index_elements=["query_id"], set_=update_cols)
            await session.execute(stmt)
        else:
            from sqlalchemy.dialects.postgresql import insert as pg_insert

            stmt = pg_insert(QueryHistory).values(**row)
            update_cols = {c: stmt.excluded[c] for c in row.keys() if c != "query_id"}
            stmt = stmt.on_conflict_do_update(index_elements=["query_id"], set_=update_cols)
            await session.execute(stmt)
        inserted += 1
    await session.commit()
    return inserted


async def sync_history_once() -> int:
    """Pull current queries from Trino and upsert them into the history DB."""
    rest = get_rest_client()
    try:
        queries = await rest.list_queries()
    except Exception as exc:  # pragma: no cover - external dependency
        logger.warning("Failed to pull queries from Trino: %s", exc)
        return 0
    rows = [normalize(q) for q in queries]
    async with SessionLocal() as session:
        return await upsert_history(session, rows)
