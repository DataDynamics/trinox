"""Live query endpoints (list / detail / kill)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from trinox_bff.services.trino_client import get_rest_client

router = APIRouter(prefix="/api/queries", tags=["queries"])


@router.get("/live")
async def live_queries() -> list[dict]:
    """All queries currently known to the coordinator (running + recently finished)."""
    try:
        queries = await get_rest_client().list_queries()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Trino unreachable: {exc}") from exc

    # Slim down the payload to fields the UI cares about.
    out: list[dict] = []
    for q in queries:
        session = q.get("session", {}) or {}
        stats = q.get("queryStats") or q.get("stats") or {}
        out.append(
            {
                "queryId": q.get("queryId"),
                "state": q.get("state"),
                "query": q.get("query"),
                "queryType": q.get("queryType"),
                "user": session.get("user") or q.get("user"),
                "source": session.get("source"),
                "catalog": session.get("catalog"),
                "schema": session.get("schema"),
                "createTime": q.get("createTime"),
                "endTime": q.get("endTime"),
                "elapsedTime": stats.get("elapsedTime"),
                "queuedTime": stats.get("queuedTime"),
                "executionTime": stats.get("executionTime"),
                "cpuTime": stats.get("totalCpuTime"),
                "peakMemoryBytes": stats.get("peakMemoryBytes"),
                "processedRows": stats.get("processedRows") or stats.get("totalRows"),
                "processedBytes": stats.get("processedBytes") or stats.get("totalBytes"),
                "runningDrivers": stats.get("runningDrivers"),
                "completedDrivers": stats.get("completedDrivers"),
                "totalDrivers": stats.get("totalDrivers"),
                "progressPercentage": stats.get("progressPercentage"),
                "errorCode": q.get("errorCode"),
            }
        )
    return out


@router.get("/{query_id}")
async def query_detail(query_id: str) -> dict:
    try:
        return await get_rest_client().get_query(query_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Trino unreachable: {exc}") from exc


@router.delete("/{query_id}")
async def kill_query(query_id: str) -> dict:
    try:
        await get_rest_client().kill_query(query_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Trino unreachable: {exc}") from exc
    return {"queryId": query_id, "killed": True}
