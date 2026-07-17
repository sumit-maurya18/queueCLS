import database from "../database/database";
import { Config } from "../models/Config";

export class ConfigRepository {

    findAll(): Config[] {
        const statement = database.prepare(`
            SELECT *
            FROM config
            ORDER BY key ASC
        `);

        return statement.all() as Config[];
    }

    findByKey(key: string): Config | undefined {
        const statement = database.prepare(`
            SELECT *
            FROM config
            WHERE key = ?
        `);

        return statement.get(key) as Config | undefined;
    }

    set(key: string, value: string): void {
        const statement = database.prepare(`
            INSERT INTO config (
                key,
                value,
                updated_at
            )
            VALUES (?, ?, ?)

            ON CONFLICT(key)
            DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        `);

        statement.run(
            key,
            value,
            new Date().toISOString()
        );
    }
}