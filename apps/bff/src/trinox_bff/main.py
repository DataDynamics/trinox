"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from trinox_bff import __version__
from trinox_bff.core.database import init_db
from trinox_bff.core.settings import get_settings
from trinox_bff.routes import analytics, catalog, cluster, history, queries, sql
from trinox_bff.services.history_sync import sync_history_once

logger = logging.getLogger("trinox")
settings = get_settings()
logging.basicConfig(level=settings.log_level)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    if settings.history_poll_interval > 0:
        scheduler.add_job(
            sync_history_once,
            "interval",
            seconds=settings.history_poll_interval,
            id="history-sync",
            coalesce=True,
            max_instances=1,
            next_run_time=None,
        )
        scheduler.start()
        logger.info(
            "History sync scheduled every %ss", settings.history_poll_interval
        )
    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)


app = FastAPI(
    title="Trinox BFF",
    version=__version__,
    description="Backend-for-Frontend for the Trinox Trino monitoring UI.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cluster.router)
app.include_router(queries.router)
app.include_router(catalog.router)
app.include_router(sql.router)
app.include_router(history.router)
app.include_router(analytics.router)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "version": __version__}
