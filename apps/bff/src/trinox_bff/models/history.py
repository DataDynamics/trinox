"""Long-term query history model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, BigInteger, DateTime, Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from trinox_bff.core.database import Base


class QueryHistory(Base):
    __tablename__ = "query_history"

    query_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    state: Mapped[str] = mapped_column(String(32), index=True)
    user: Mapped[str | None] = mapped_column(String(128), index=True)
    source: Mapped[str | None] = mapped_column(String(128))
    catalog: Mapped[str | None] = mapped_column(String(128), index=True)
    db_schema: Mapped[str | None] = mapped_column("schema", String(128))
    query_type: Mapped[str | None] = mapped_column(String(32), index=True)

    sql_text: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, index=True)

    queued_time_ms: Mapped[int | None] = mapped_column(BigInteger)
    analysis_time_ms: Mapped[int | None] = mapped_column(BigInteger)
    elapsed_time_ms: Mapped[int | None] = mapped_column(BigInteger, index=True)
    execution_time_ms: Mapped[int | None] = mapped_column(BigInteger)

    cpu_time_ms: Mapped[int | None] = mapped_column(BigInteger)
    peak_memory_bytes: Mapped[int | None] = mapped_column(BigInteger)
    total_memory_bytes: Mapped[int | None] = mapped_column(BigInteger)

    processed_rows: Mapped[int | None] = mapped_column(BigInteger)
    processed_bytes: Mapped[int | None] = mapped_column(BigInteger)
    output_rows: Mapped[int | None] = mapped_column(BigInteger)
    output_bytes: Mapped[int | None] = mapped_column(BigInteger)

    error_code: Mapped[str | None] = mapped_column(String(64))
    error_name: Mapped[str | None] = mapped_column(String(128))
    error_type: Mapped[str | None] = mapped_column(String(32))
    error_message: Mapped[str | None] = mapped_column(Text)

    progress: Mapped[float | None] = mapped_column(Float)
    raw: Mapped[dict | None] = mapped_column(JSON)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


Index("ix_query_history_user_created", QueryHistory.user, QueryHistory.created_at)
Index("ix_query_history_state_created", QueryHistory.state, QueryHistory.created_at)
