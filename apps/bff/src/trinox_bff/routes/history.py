"""Long-term query history endpoints (search / detail)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from trinox_bff.core.database import get_session
from trinox_bff.models.history import QueryHistory
from trinox_bff.schemas.common import PageMeta, PagedResponse, QueryHistoryItem

router = APIRouter(prefix="/api/history", tags=["history"])


def _filters(
    user: str | None,
    state: str | None,
    catalog: str | None,
    query_type: str | None,
    search: str | None,
    since: datetime | None,
    until: datetime | None,
    min_ms: int | None,
    max_ms: int | None,
):
    conds = []
    if user:
        conds.append(QueryHistory.user == user)
    if state:
        conds.append(QueryHistory.state == state)
    if catalog:
        conds.append(QueryHistory.catalog == catalog)
    if query_type:
        conds.append(QueryHistory.query_type == query_type)
    if search:
        conds.append(QueryHistory.sql_text.ilike(f"%{search}%"))
    if since:
        conds.append(QueryHistory.created_at >= since)
    if until:
        conds.append(QueryHistory.created_at <= until)
    if min_ms is not None:
        conds.append(QueryHistory.elapsed_time_ms >= min_ms)
    if max_ms is not None:
        conds.append(QueryHistory.elapsed_time_ms <= max_ms)
    return and_(*conds) if conds else None


@router.get("", response_model=PagedResponse)
async def list_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    user: str | None = None,
    state: str | None = None,
    catalog: str | None = None,
    query_type: str | None = None,
    search: str | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    min_elapsed_ms: int | None = None,
    max_elapsed_ms: int | None = None,
    session: AsyncSession = Depends(get_session),
) -> PagedResponse:
    where = _filters(
        user, state, catalog, query_type, search, since, until,
        min_elapsed_ms, max_elapsed_ms,
    )
    base = select(QueryHistory)
    if where is not None:
        base = base.where(where)
    total = (await session.execute(
        select(func.count()).select_from(base.subquery())
    )).scalar() or 0
    stmt = (
        base.order_by(QueryHistory.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await session.execute(stmt)).scalars().all()
    items = [QueryHistoryItem.model_validate(r).model_dump(by_alias=True) for r in rows]
    return PagedResponse(items=items, meta=PageMeta(page=page, page_size=page_size, total=total))


@router.get("/{query_id}", response_model=QueryHistoryItem)
async def get_history_item(
    query_id: str,
    session: AsyncSession = Depends(get_session),
) -> QueryHistoryItem:
    row = (
        await session.execute(select(QueryHistory).where(QueryHistory.query_id == query_id))
    ).scalar_one_or_none()
    if row is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Query not found")
    return QueryHistoryItem.model_validate(row)


@router.get("/facets/catalogs", response_model=list[str])
async def facet_catalogs(session: AsyncSession = Depends(get_session)) -> list[str]:
    rows = (
        await session.execute(
            select(QueryHistory.catalog).distinct().where(QueryHistory.catalog.is_not(None))
        )
    ).scalars().all()
    return sorted(x for x in rows if x)


@router.get("/facets/users", response_model=list[str])
async def facet_users(session: AsyncSession = Depends(get_session)) -> list[str]:
    rows = (
        await session.execute(
            select(QueryHistory.user).distinct().where(QueryHistory.user.is_not(None))
        )
    ).scalars().all()
    return sorted(x for x in rows if x)
