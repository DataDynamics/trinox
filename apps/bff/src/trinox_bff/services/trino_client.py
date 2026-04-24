"""Thin async wrappers around the Trino coordinator's REST and SQL APIs."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
from trino.auth import BasicAuthentication
from trino.dbapi import connect

from trinox_bff.core.settings import Settings, get_settings


class TrinoRestClient:
    """Async proxy to Trino's coordinator REST endpoints (``/v1/...``)."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client = httpx.AsyncClient(
            base_url=self.settings.trino_base_url,
            timeout=httpx.Timeout(15.0, connect=5.0),
            headers={"X-Trino-User": self.settings.trino_user},
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str) -> Any:
        resp = await self._client.get(path)
        resp.raise_for_status()
        return resp.json()

    async def info(self) -> dict[str, Any]:
        return await self._get("/v1/info")

    async def cluster(self) -> dict[str, Any]:
        return await self._get("/v1/cluster")

    async def nodes(self) -> list[dict[str, Any]]:
        return await self._get("/v1/node")

    async def failed_nodes(self) -> list[dict[str, Any]]:
        return await self._get("/v1/node/failed")

    async def list_queries(self) -> list[dict[str, Any]]:
        return await self._get("/v1/query")

    async def get_query(self, query_id: str) -> dict[str, Any]:
        return await self._get(f"/v1/query/{query_id}")

    async def kill_query(self, query_id: str) -> None:
        resp = await self._client.delete(f"/v1/query/{query_id}")
        resp.raise_for_status()


class TrinoSqlClient:
    """Synchronous Trino SQL client wrapped in ``asyncio.to_thread``."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _connect(self, user: str | None = None):
        auth = None
        if self.settings.trino_password:
            auth = BasicAuthentication(
                self.settings.trino_user, self.settings.trino_password
            )
        return connect(
            host=self.settings.trino_host,
            port=self.settings.trino_port,
            user=user or self.settings.trino_user,
            http_scheme=self.settings.trino_http_scheme,
            auth=auth,
            catalog=self.settings.trino_catalog,
            schema=self.settings.trino_schema,
        )

    def _execute(
        self,
        sql: str,
        *,
        user: str | None,
        catalog: str | None,
        schema: str | None,
        limit: int | None,
    ) -> dict[str, Any]:
        conn = self._connect(user=user)
        cur = conn.cursor()
        if catalog:
            cur.execute(f"USE {catalog}")
            cur.fetchall()
        if schema and catalog:
            cur.execute(f"USE {catalog}.{schema}")
            cur.fetchall()
        cur.execute(sql)
        rows: list[list[Any]] = []
        for idx, row in enumerate(cur):
            if limit is not None and idx >= limit:
                break
            rows.append(list(row))
        columns = [
            {"name": d[0], "type": str(d[1]) if len(d) > 1 else "unknown"}
            for d in (cur.description or [])
        ]
        query_id = getattr(cur, "query_id", None)
        stats = getattr(cur, "stats", None)
        cur.close()
        conn.close()
        return {
            "query_id": query_id,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "stats": stats,
        }

    async def execute(
        self,
        sql: str,
        *,
        user: str | None = None,
        catalog: str | None = None,
        schema: str | None = None,
        limit: int | None = None,
    ) -> dict[str, Any]:
        return await asyncio.to_thread(
            self._execute,
            sql,
            user=user,
            catalog=catalog,
            schema=schema,
            limit=limit,
        )

    async def scalar(self, sql: str) -> Any:
        result = await self.execute(sql, limit=1)
        if result["rows"]:
            return result["rows"][0][0]
        return None

    async def list_scalars(self, sql: str) -> list[Any]:
        result = await self.execute(sql)
        return [row[0] for row in result["rows"]]


_rest_client: TrinoRestClient | None = None
_sql_client: TrinoSqlClient | None = None


def get_rest_client() -> TrinoRestClient:
    global _rest_client
    if _rest_client is None:
        _rest_client = TrinoRestClient()
    return _rest_client


def get_sql_client() -> TrinoSqlClient:
    global _sql_client
    if _sql_client is None:
        _sql_client = TrinoSqlClient()
    return _sql_client
