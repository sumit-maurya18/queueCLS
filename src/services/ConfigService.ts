import { Config } from "../models/Config";
import { ConfigRepository } from "../repository/ConfigRepository";

export class ConfigService {
    private readonly repository = new ConfigRepository();

    private readonly allowedKeys = new Set([
        "worker_concurrency",
        "poll_interval_ms",
        "base_retry_delay_ms",
        "default_max_retries"
    ]);

    getAll(): Config[] {
        return this.repository.findAll();
    }

    get(key: string): Config {
        this.validateKey(key);

        const config = this.repository.findByKey(key);

        if (!config) {
            throw new Error(
                `Configuration '${key}' not found.`
            );
        }

        return config;
    }

    getNumber(key: string): number {
        const config = this.get(key);

        const value = Number(config.value);

        if (!Number.isFinite(value)) {
            throw new Error(
                `Configuration '${key}' must contain a numeric value.`
            );
        }

        return value;
    }

    set(key: string, value: string): void {
        this.validateKey(key);
        this.validateValue(key, value);

        this.repository.set(key, value);
    }

    private validateKey(key: string): void {
        if (!this.allowedKeys.has(key)) {
            throw new Error(
                `Unknown configuration key '${key}'.`
            );
        }
    }

    private validateValue(
        key: string,
        value: string
    ): void {
        const numericValue = Number(value);

        if (
            !Number.isFinite(numericValue) ||
            !Number.isInteger(numericValue)
        ) {
            throw new Error(
                `Configuration '${key}' must be an integer.`
            );
        }

        switch (key) {
            case "worker_concurrency":
                if (numericValue < 1) {
                    throw new Error(
                        "worker_concurrency must be at least 1."
                    );
                }
                break;

            case "poll_interval_ms":
                if (numericValue < 1) {
                    throw new Error(
                        "poll_interval_ms must be at least 1."
                    );
                }
                break;

            case "base_retry_delay_ms":
                if (numericValue < 1) {
                    throw new Error(
                        "base_retry_delay_ms must be at least 1."
                    );
                }
                break;

            case "default_max_retries":
                if (numericValue < 1) {
                    throw new Error(
                        "default_max_retries must be at least 1."
                    );
                }
                break;
        }
    }
}