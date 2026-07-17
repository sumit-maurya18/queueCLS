import database from "../../src/database/database";

export function clearJobs(): void {
    database
        .prepare(`
            DELETE FROM jobs
        `)
        .run();
}

export function resetConfig(): void {
    const timestamp =
        new Date().toISOString();

    const statement =
        database.prepare(`
            UPDATE config
            SET
                value = ?,
                updated_at = ?
            WHERE key = ?
        `);

    statement.run(
        "3",
        timestamp,
        "worker_concurrency"
    );

    statement.run(
        "1000",
        timestamp,
        "poll_interval_ms"
    );

    statement.run(
        "1000",
        timestamp,
        "base_retry_delay_ms"
    );

    statement.run(
        "3",
        timestamp,
        "default_max_retries"
    );
}

export function resetTestDatabase(): void {
    clearJobs();
    resetConfig();
}

export function closeTestDatabase(): void {
    database.close();
}