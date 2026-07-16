import database from "../database/database";
import { Job } from "../models/Job";

export class JobRepository {

    /**
     * Inserts a new job into the database.
     */
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

    /**
     * Returns true if the job exists.
     */
    exists(id: string): boolean {

        const statement = database.prepare(`
            SELECT id
            FROM jobs
            WHERE id = ?
        `);

        const row = statement.get(id);

        return row !== undefined;

    }

    /**
     * Returns a job by its ID.
     */
    findById(id: string): Job | undefined {

        const statement = database.prepare(`
            SELECT *
            FROM jobs
            WHERE id = ?
        `);

        return statement.get(id) as Job | undefined;

    }

    /**
     * Returns all jobs.
     */
    findAll(): Job[] {

        const statement = database.prepare(`
            SELECT *
            FROM jobs
        `);

        return statement.all() as Job[];

    }

}