"""Metadata browsing endpoints (catalogs / schemas / tables / columns)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from trinox_bff.services.trino_client import get_sql_client

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


def _escape(ident: str) -> str:
    return '"' + ident.replace('"', '""') + '"'


@router.get("/catalogs")
async def list_catalogs() -> list[str]:
    try:
        return await get_sql_client().list_scalars("SHOW CATALOGS")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/{catalog}/schemas")
async def list_schemas(catalog: str) -> list[str]:
    try:
        return await get_sql_client().list_scalars(f"SHOW SCHEMAS FROM {_escape(catalog)}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/{catalog}/{schema}/tables")
async def list_tables(catalog: str, schema: str) -> list[str]:
    try:
        return await get_sql_client().list_scalars(
            f"SHOW TABLES FROM {_escape(catalog)}.{_escape(schema)}"
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/{catalog}/{schema}/{table}/columns")
async def describe_table(catalog: str, schema: str, table: str) -> list[dict]:
    sql = f"DESCRIBE {_escape(catalog)}.{_escape(schema)}.{_escape(table)}"
    try:
        result = await get_sql_client().execute(sql)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    col_names = [c["name"] for c in result["columns"]]
    return [dict(zip(col_names, row, strict=False)) for row in result["rows"]]


@router.get("/{catalog}/{schema}/{table}/ddl")
async def table_ddl(catalog: str, schema: str, table: str) -> dict:
    sql = f"SHOW CREATE TABLE {_escape(catalog)}.{_escape(schema)}.{_escape(table)}"
    try:
        result = await get_sql_client().execute(sql, limit=1)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    ddl = result["rows"][0][0] if result["rows"] else ""
    return {"ddl": ddl}


@router.get("/{catalog}/{schema}/{table}/preview")
async def preview_table(
    catalog: str,
    schema: str,
    table: str,
    limit: int = Query(100, ge=1, le=10_000),
) -> dict:
    sql = (
        f"SELECT * FROM {_escape(catalog)}.{_escape(schema)}.{_escape(table)} LIMIT {limit}"
    )
    try:
        return await get_sql_client().execute(sql, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
