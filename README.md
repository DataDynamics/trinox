# Trinox

A modern Trino monitoring & query UI built with **Ant Design 5**, **React**, and **FastAPI**.

## Features (Phase 1 & 2)

### Phase 1 — MVP
- **Dashboard** — cluster overview with stat cards, memory gauge, query rate
- **Live Queries** — real-time running queries with kill/detail actions
- **Query Detail** — stages, tasks, plan, session properties
- **SQL Editor** — Monaco-based editor with catalog tree and result grid
- **SQL Formatter** — Trino-dialect pretty printer with diff view
- **Catalog Browser** — catalog/schema/table/column browsing with DDL & sample data

### Phase 2 — Analytics & polish
- **Scatter Chart** — query response time scatter plot with brushing/drill-down
- **Trends** — time-series analytics (QPS, latency p50/p95/p99, failure rate)
- **Query History** — long-term storage (SQLite/PostgreSQL) with advanced search
- **Result Export** — CSV / JSON / Excel
- **Dark Mode** & **i18n** (Korean / English)

## Architecture

```
trinox/
├── apps/
│   ├── web/    # React 18 + Vite + TS + Ant Design 5
│   └── bff/    # FastAPI Backend-for-Frontend (Trino proxy + history)
├── packages/
└── docker-compose.yml
```

## Quickstart

### Prerequisites
- Node.js >= 18, pnpm >= 8
- Python >= 3.11
- A running Trino cluster (or use `docker-compose up trino`)

### Development

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Start the BFF (FastAPI)
cd apps/bff
python -m venv .venv && source .venv/bin/activate
pip install -e .
trinox-bff                        # reads ./config.yaml

# 3. Start the web app
cd ../web
pnpm dev                          # http://localhost:5173
```

### Docker

```bash
docker-compose up
# web:   http://localhost:5173
# bff:   http://localhost:8000
# trino: http://localhost:8080
```

## Configuration

All backend settings live in **`apps/bff/config.yaml`**. Point to an alternate
file with the `CONFIG_FILE` environment variable.

```yaml
server:
  host: 0.0.0.0
  port: 8000
  cors_origins: [http://localhost:5173]

database:
  url: sqlite+aiosqlite:///./trinox.db   # or postgresql+psycopg://...
  schema_file: db.sql                    # executed on startup
  bootstrap: true

trino:
  host: localhost
  port: 8080
  user: trinox
  http_scheme: http

history:
  poll_interval_seconds: 10              # 0 = disable history sync

logging:
  level: INFO
  directory: logs                        # log file directory
  filename_prefix: app                   # → logs/app-YYYYMMDD.log, rolls daily
  console: true
  retention_days: 30                     # 0 = keep forever
```

### Schema

The database schema lives in [`apps/bff/db.sql`](apps/bff/db.sql) and is
executed on application startup (`CREATE TABLE IF NOT EXISTS ...`). Edit it
directly to add columns or indexes — no migration tool required for dev.

### Logging

Logs are written to `logs/app-YYYYMMDD.log` and roll automatically at local
midnight. Each day's file keeps its date in the filename, so yesterday's file
is left in place (no rename needed). Files older than `retention_days` are
pruned on startup and on each rotation.

## License

MIT
