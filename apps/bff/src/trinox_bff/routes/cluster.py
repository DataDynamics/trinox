"""Cluster health & node endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from trinox_bff.services.trino_client import get_rest_client

router = APIRouter(prefix="/api/cluster", tags=["cluster"])


@router.get("/info")
async def info() -> dict:
    try:
        return await get_rest_client().info()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Trino unreachable: {exc}") from exc


@router.get("/overview")
async def overview() -> dict:
    try:
        return await get_rest_client().cluster()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Trino unreachable: {exc}") from exc


@router.get("/nodes")
async def nodes() -> list[dict]:
    try:
        nodes = await get_rest_client().nodes()
        try:
            failed = await get_rest_client().failed_nodes()
        except Exception:
            failed = []
        failed_ids = {f.get("nodeIdentifier") for f in failed}
        for n in nodes:
            n["failed"] = n.get("nodeIdentifier") in failed_ids
        return nodes
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Trino unreachable: {exc}") from exc
