"""Arbitrary SQL execution + formatting endpoints."""

from __future__ import annotations

import csv
import io
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from trinox_bff.schemas.common import (
    SqlExecuteRequest,
    SqlExecuteResponse,
    SqlFormatRequest,
    SqlFormatResponse,
)
from trinox_bff.services.sql_format import format_sql
from trinox_bff.services.trino_client import get_sql_client

router = APIRouter(prefix="/api/sql", tags=["sql"])


@router.post("/execute", response_model=SqlExecuteResponse)
async def execute(req: SqlExecuteRequest) -> SqlExecuteResponse:
    try:
        result = await get_sql_client().execute(
            req.sql,
            user=req.user,
            catalog=req.catalog,
            schema=req.schema,
            limit=req.limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return SqlExecuteResponse(**result)


@router.post("/format", response_model=SqlFormatResponse)
async def format_query(req: SqlFormatRequest) -> SqlFormatResponse:
    return SqlFormatResponse(
        formatted=format_sql(
            req.sql,
            uppercase_keywords=req.uppercase_keywords,
            indent_width=req.indent_width,
            strip_comments=req.strip_comments,
        )
    )


@router.post("/export/csv")
async def export_csv(req: SqlExecuteRequest):
    try:
        result = await get_sql_client().execute(
            req.sql,
            user=req.user,
            catalog=req.catalog,
            schema=req.schema,
            limit=req.limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([c["name"] for c in result["columns"]])
    for row in result["rows"]:
        writer.writerow(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="trinox-result.csv"'},
    )


@router.post("/export/json")
async def export_json(req: SqlExecuteRequest):
    try:
        result = await get_sql_client().execute(
            req.sql,
            user=req.user,
            catalog=req.catalog,
            schema=req.schema,
            limit=req.limit,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    cols = [c["name"] for c in result["columns"]]
    payload = [dict(zip(cols, row, strict=False)) for row in result["rows"]]
    return StreamingResponse(
        iter([json.dumps(payload, default=str, ensure_ascii=False, indent=2)]),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="trinox-result.json"'},
    )
