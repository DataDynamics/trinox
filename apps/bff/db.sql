-- Trinox BFF schema bootstrap.
-- This file is executed on application startup if the target tables don't
-- already exist. Statements are split on ``;`` and run individually, so keep
-- each statement terminated with a single trailing semicolon.
--
-- Reserved words (``user``, ``schema``) are double-quoted so the same file
-- works on both SQLite and PostgreSQL.

CREATE TABLE IF NOT EXISTS query_history (
    query_id           VARCHAR(128) PRIMARY KEY,
    state              VARCHAR(32),
    "user"             VARCHAR(128),
    source             VARCHAR(128),
    catalog            VARCHAR(128),
    "schema"           VARCHAR(128),
    query_type         VARCHAR(32),
    sql_text           TEXT NOT NULL,
    created_at         TIMESTAMP NOT NULL,
    started_at         TIMESTAMP,
    ended_at           TIMESTAMP,
    queued_time_ms     BIGINT,
    analysis_time_ms   BIGINT,
    elapsed_time_ms    BIGINT,
    execution_time_ms  BIGINT,
    cpu_time_ms        BIGINT,
    peak_memory_bytes  BIGINT,
    total_memory_bytes BIGINT,
    processed_rows     BIGINT,
    processed_bytes    BIGINT,
    output_rows        BIGINT,
    output_bytes       BIGINT,
    error_code         VARCHAR(64),
    error_name         VARCHAR(128),
    error_type         VARCHAR(32),
    error_message      TEXT,
    progress           DOUBLE PRECISION,
    raw                TEXT,
    updated_at         TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_query_history_state        ON query_history (state);
CREATE INDEX IF NOT EXISTS ix_query_history_user         ON query_history ("user");
CREATE INDEX IF NOT EXISTS ix_query_history_catalog      ON query_history (catalog);
CREATE INDEX IF NOT EXISTS ix_query_history_query_type   ON query_history (query_type);
CREATE INDEX IF NOT EXISTS ix_query_history_created_at   ON query_history (created_at);
CREATE INDEX IF NOT EXISTS ix_query_history_ended_at     ON query_history (ended_at);
CREATE INDEX IF NOT EXISTS ix_query_history_elapsed      ON query_history (elapsed_time_ms);
CREATE INDEX IF NOT EXISTS ix_query_history_user_created ON query_history ("user", created_at);
CREATE INDEX IF NOT EXISTS ix_query_history_state_created ON query_history (state, created_at);
