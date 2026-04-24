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
export TRINO_HOST=localhost TRINO_PORT=8080 TRINO_USER=admin
uvicorn trinox_bff.main:app --reload --port 8000

# 3. Start the web app
cd ../web
pnpm dev   # http://localhost:5173
```

### Docker

```bash
docker-compose up
# web:   http://localhost:5173
# bff:   http://localhost:8000
# trino: http://localhost:8080
```

## Configuration

All backend settings are driven by environment variables — see `apps/bff/.env.example`.

| Variable | Default | Description |
|---|---|---|
| `TRINO_HOST` | `localhost` | Trino coordinator host |
| `TRINO_PORT` | `8080` | Trino coordinator port |
| `TRINO_USER` | `trinox` | Trino auth user |
| `TRINO_HTTP_SCHEME` | `http` | `http` or `https` |
| `DATABASE_URL` | `sqlite:///./trinox.db` | History DB (SQLite or PostgreSQL) |
| `HISTORY_POLL_INTERVAL` | `10` | seconds between cluster history syncs |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |

## License

MIT
