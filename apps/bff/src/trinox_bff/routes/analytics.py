"""Analytics endpoints (scatter, trends)."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Integer, and_, case, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from trinox_bff.core.database import get_session
from trinox_bff.models.history import QueryHistory

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _range(since: datetime | None, until: datetime | None) -> tuple[datetime, datetime]:
    now = datetime.utcnow()
    return since or (now - timedelta(hours=24)), until or now


@router.get("/scatter")
async def scatter(
    since: datetime | None = None,
    until: datetime | None = None,
    catalog: str | None = None,
    user: str | None = None,
    state: str | None = None,
    query_type: str | None = None,
    limit: int = Query(5000, ge=1, le=50_000),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    start, end = _range(since, until)
    conds = [QueryHistory.created_at >= start, QueryHistory.created_at <= end]
    if catalog:
        conds.append(QueryHistory.catalog == catalog)
    if user:
        conds.append(QueryHistory.user == user)
    if state:
        conds.append(QueryHistory.state == state)
    if query_type:
        conds.append(QueryHistory.query_type == query_type)

    stmt = (
        select(
            QueryHistory.query_id,
            QueryHistory.state,
            QueryHistory.user,
            QueryHistory.catalog,
            QueryHistory.query_type,
            QueryHistory.created_at,
            QueryHistory.elapsed_time_ms,
            QueryHistory.processed_rows,
            QueryHistory.peak_memory_bytes,
        )
        .where(and_(*conds))
        .where(QueryHistory.elapsed_time_ms.is_not(None))
        .order_by(QueryHistory.created_at.desc())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).all()
    return [
        {
            "queryId": r.query_id,
            "state": r.state,
            "user": r.user,
            "catalog": r.catalog,
            "queryType": r.query_type,
            "createdAt": r.created_at.isoformat() + "Z" if r.created_at else None,
            "elapsedMs": r.elapsed_time_ms,
            "rows": r.processed_rows,
            "peakMemoryBytes": r.peak_memory_bytes,
        }
        for r in rows
    ]


@router.get("/trends")
async def trends(
    since: datetime | None = None,
    until: datetime | None = None,
    bucket_minutes: int = Query(5, ge=1, le=1440),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    """Time-bucketed QPS + latency percentiles + failure rate.

    Percentile functions are emulated cross-dialect by sorting in Python
    after fetching the bucketed rows.
    """
    start, end = _range(since, until)
    # SQLite lacks date_trunc / PERCENTILE_CONT. Bucket by epoch-seconds / N.
    bucket_seconds = bucket_minutes * 60
    epoch = func.strftime("%s", QueryHistory.created_at)
    dialect = session.bind.dialect.name if session.bind is not None else "sqlite"
    is_sqlite = dialect == "sqlite"
    if is_sqlite:
        bucket = (cast(epoch, Integer) / bucket_seconds) * bucket_seconds
    else:
        bucket = (
            func.floor(func.extract("epoch", QueryHistory.created_at) / bucket_seconds)
            * bucket_seconds
        )

    stmt = (
        select(
            bucket.label("bucket"),
            func.count().label("total"),
            func.sum(
                case((QueryHistory.state == "FAILED", 1), else_=0)
            ).label("failed"),
            func.avg(QueryHistory.elapsed_time_ms).label("avg_ms"),
            func.min(QueryHistory.elapsed_time_ms).label("min_ms"),
            func.max(QueryHistory.elapsed_time_ms).label("max_ms"),
        )
        .where(and_(QueryHistory.created_at >= start, QueryHistory.created_at <= end))
        .group_by("bucket")
        .order_by("bucket")
    )
    rows = (await session.execute(stmt)).all()

    # Load raw elapsed values per bucket for percentile computation.
    per_bucket_stmt = (
        select(bucket.label("bucket"), QueryHistory.elapsed_time_ms)
        .where(
            and_(
                QueryHistory.created_at >= start,
                QueryHistory.created_at <= end,
                QueryHistory.elapsed_time_ms.is_not(None),
            )
        )
    )
    raw = (await session.execute(per_bucket_stmt)).all()
    groups: dict[int, list[int]] = {}
    for bk, ms in raw:
        if bk is None or ms is None:
            continue
        groups.setdefault(int(bk), []).append(int(ms))

    def _pct(sorted_vals: list[int], p: float) -> float | None:
        if not sorted_vals:
            return None
        k = (len(sorted_vals) - 1) * p
        f = int(k)
        c = min(f + 1, len(sorted_vals) - 1)
        if f == c:
            return float(sorted_vals[f])
        return sorted_vals[f] + (sorted_vals[c] - sorted_vals[f]) * (k - f)

    out: list[dict] = []
    for row in rows:
        bk = int(row.bucket) if row.bucket is not None else 0
        vals = sorted(groups.get(bk, []))
        out.append(
            {
                "time": datetime.utcfromtimestamp(bk).isoformat() + "Z",
                "total": row.total,
                "failed": int(row.failed or 0),
                "failureRate": (row.failed or 0) / row.total if row.total else 0.0,
                "avgMs": float(row.avg_ms) if row.avg_ms is not None else None,
                "p50Ms": _pct(vals, 0.5),
                "p95Ms": _pct(vals, 0.95),
                "p99Ms": _pct(vals, 0.99),
                "minMs": row.min_ms,
                "maxMs": row.max_ms,
            }
        )
    return out


@router.get("/summary")
async def summary(
    since: datetime | None = None,
    until: datetime | None = None,
    session: AsyncSession = Depends(get_session),
) -> dict:
    start, end = _range(since, until)
    stmt = select(
        func.count().label("total"),
        func.sum(case((QueryHistory.state == "FAILED", 1), else_=0)).label("failed"),
        func.sum(case((QueryHistory.state == "FINISHED", 1), else_=0)).label("finished"),
        func.avg(QueryHistory.elapsed_time_ms).label("avg_ms"),
    ).where(and_(QueryHistory.created_at >= start, QueryHistory.created_at <= end))
    row = (await session.execute(stmt)).one()
    total = int(row.total or 0)
    return {
        "total": total,
        "failed": int(row.failed or 0),
        "finished": int(row.finished or 0),
        "failureRate": (row.failed or 0) / total if total else 0.0,
        "avgMs": float(row.avg_ms) if row.avg_ms is not None else None,
    }


@router.get("/top-users")
async def top_users(
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    start, end = _range(since, until)
    stmt = (
        select(
            QueryHistory.user,
            func.count().label("total"),
            func.avg(QueryHistory.elapsed_time_ms).label("avg_ms"),
        )
        .where(and_(QueryHistory.created_at >= start, QueryHistory.created_at <= end))
        .group_by(QueryHistory.user)
        .order_by(func.count().desc())
        .limit(limit)
    )
    rows = (await session.execute(stmt)).all()
    return [
        {"user": r.user or "(unknown)", "total": r.total, "avgMs": float(r.avg_ms or 0)}
        for r in rows
    ]
