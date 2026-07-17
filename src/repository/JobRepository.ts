import database from "../database/database";
import { Job } from "../models/Job";

export class JobRepository {

    create(job: Job): void {

        const statement = database.prepare(`
            INSERT INTO jobs (
                id,
                command,
                state,
                attempts,
                max_retries,
                last_error,
                next_retry_at,
                locked_by,
                locked_at,
                created_at,
                updated_at
            )
            VALUES (
                @id,
                @command,
                @state,
                @attempts,
                @max_retries,
                @last_error,
                @next_retry_at,
                @locked_by,
                @locked_at,
                @created_at,
                @updated_at
            )
        `);

        statement.run(job);

    }

    exists(id: string): boolean {

        const statement = database.prepare(`
            SELECT id
            FROM jobs
            WHERE id = ?
        `);

        return statement.get(id) !== undefined;

    }

    findById(id: string): Job | undefined {

        const statement = database.prepare(`
            SELECT *
            FROM jobs
            WHERE id = ?
        `);

        return statement.get(id) as Job | undefined;

    }

    findAll(): Job[] {

        const statement = database.prepare(`
            SELECT *
            FROM jobs
            ORDER BY created_at ASC
        `);

        return statement.all() as Job[];

    }

    findByState(state: string): Job[] {

        const statement = database.prepare(`
            SELECT *
            FROM jobs
            WHERE state = ?
            ORDER BY created_at ASC
        `);

        return statement.all(state) as Job[];

    }

    findNextPendingJob(): Job | undefined {

        const statement = database.prepare(`
            SELECT *
            FROM jobs
            WHERE state = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
        `);

        return statement.get() as Job | undefined;

    }

    update(job: Job): void {

        const statement = database.prepare(`
            UPDATE jobs
            SET
                command = @command,
                state = @state,
                attempts = @attempts,
                max_retries = @max_retries,
                last_error = @last_error,
                next_retry_at = @next_retry_at,
                locked_by = @locked_by,
                locked_at = @locked_at,
                updated_at = @updated_at
            WHERE id = @id
        `);

        statement.run(job);

    }

    updateJobState(id: string, state: string): void {

        const statement = database.prepare(`
            UPDATE jobs
            SET
                state = ?,
                updated_at = ?
            WHERE id = ?
        `);

        statement.run(
            state,
            new Date().toISOString(),
            id
        );

    }

    incrementAttempts(id: string): void {

        const statement = database.prepare(`
            UPDATE jobs
            SET
                attempts = attempts + 1,
                updated_at = ?
            WHERE id = ?
        `);

        statement.run(
            new Date().toISOString(),
            id
        );

    }

    delete(id: string): void {

        const statement = database.prepare(`
            DELETE FROM jobs
            WHERE id = ?
        `);

        statement.run(id);

    }

}