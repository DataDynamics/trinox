"""Common Pydantic schemas shared across routes."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PageMeta(BaseModel):
    page: int = 1
    page_size: int = 50
    total: int = 0


class PagedResponse(BaseModel):
    items: list[Any]
    meta: PageMeta


class QueryHistoryItem(ORMModel):
    query_id: str
    state: str
    user: str | None = None
    source: str | None = None
    catalog: str | None = None
    db_schema: str | None = Field(default=None, alias="schema")
    query_type: str | None = None
    sql_text: str
    created_at: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None
    elapsed_time_ms: int | None = None
    queued_time_ms: int | None = None
    execution_time_ms: int | None = None
    cpu_time_ms: int | None = None
    peak_memory_bytes: int | None = None
    processed_rows: int | None = None
    processed_bytes: int | None = None
    output_rows: int | None = None
    output_bytes: int | None = None
    error_code: str | None = None
    error_message: str | None = None
    progress: float | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SqlExecuteRequest(BaseModel):
    sql: str
    catalog: str | None = None
    schema: str | None = None
    limit: int | None = 1000
    user: str | None = None


class SqlExecuteResponse(BaseModel):
    query_id: str | None = None
    columns: list[dict[str, Any]]
    rows: list[list[Any]]
    row_count: int
    stats: dict[str, Any] | None = None


class SqlFormatRequest(BaseModel):
    sql: str
    uppercase_keywords: bool = True
    indent_width: int = 2
    strip_comments: bool = False


class SqlFormatResponse(BaseModel):
    formatted: str
