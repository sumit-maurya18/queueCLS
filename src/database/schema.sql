CREATE TABLE IF NOT EXISTS jobs (

    id TEXT PRIMARY KEY,

    command TEXT NOT NULL,

    state TEXT NOT NULL,

    attempts INTEGER NOT NULL DEFAULT 0,

    max_retries INTEGER NOT NULL DEFAULT 3,

    last_error TEXT,

    exit_code INTEGER,

    next_retry_at TEXT,

    locked_by TEXT,

    locked_at TEXT,

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL

);

CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_state
ON jobs(state);

CREATE INDEX IF NOT EXISTS idx_jobs_retry
ON jobs(next_retry_at);

INSERT OR IGNORE INTO config (
    key,
    value,
    updated_at
)
VALUES
    (
        'worker_concurrency',
        '3',
        CURRENT_TIMESTAMP
    ),
    (
        'poll_interval_ms',
        '1000',
        CURRENT_TIMESTAMP
    ),
    (
        'base_retry_delay_ms',
        '1000',
        CURRENT_TIMESTAMP
    ),
    (
        'default_max_retries',
        '3',
        CURRENT_TIMESTAMP
    );