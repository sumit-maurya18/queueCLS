import {
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import { ConfigService } from "../../src/services/ConfigService";
import { resetTestDatabase } from "../helpers/testDatabase";

describe("ConfigService", () => {
    let configService: ConfigService;

    beforeEach(() => {
        resetTestDatabase();
        configService = new ConfigService();
    });

    it("should return all configuration values", () => {
        const configs = configService.getAll();

        expect(configs).toHaveLength(4);

        const keys = configs.map(
            (config) => config.key
        );

        expect(keys).toContain(
            "worker_concurrency"
        );

        expect(keys).toContain(
            "poll_interval_ms"
        );

        expect(keys).toContain(
            "base_retry_delay_ms"
        );

        expect(keys).toContain(
            "default_max_retries"
        );
    });

    it("should get configuration by key", () => {
        const config = configService.get(
            "worker_concurrency"
        );

        expect(config.key).toBe(
            "worker_concurrency"
        );

        expect(config.value).toBe("3");
    });

    it("should return configuration as a number", () => {
        const value = configService.getNumber(
            "worker_concurrency"
        );

        expect(value).toBe(3);
        expect(typeof value).toBe("number");
    });

    it("should update worker concurrency", () => {
        configService.set(
            "worker_concurrency",
            "5"
        );

        const config = configService.get(
            "worker_concurrency"
        );

        expect(config.value).toBe("5");
    });

    it("should persist updated configuration", () => {
        configService.set(
            "poll_interval_ms",
            "2000"
        );

        const anotherService =
            new ConfigService();

        const config = anotherService.get(
            "poll_interval_ms"
        );

        expect(config.value).toBe("2000");
    });

    it("should reject an unknown configuration key", () => {
        expect(() => {
            configService.get(
                "invalid_key"
            );
        }).toThrow(
            "Unknown configuration key 'invalid_key'."
        );
    });

    it("should reject setting an unknown configuration key", () => {
        expect(() => {
            configService.set(
                "invalid_key",
                "10"
            );
        }).toThrow(
            "Unknown configuration key 'invalid_key'."
        );
    });

    it("should reject non-numeric configuration values", () => {
        expect(() => {
            configService.set(
                "worker_concurrency",
                "abc"
            );
        }).toThrow(
            "Configuration 'worker_concurrency' must be an integer."
        );
    });

    it("should reject decimal configuration values", () => {
        expect(() => {
            configService.set(
                "worker_concurrency",
                "2.5"
            );
        }).toThrow(
            "Configuration 'worker_concurrency' must be an integer."
        );
    });

    it("should reject worker concurrency below 1", () => {
        expect(() => {
            configService.set(
                "worker_concurrency",
                "0"
            );
        }).toThrow(
            "worker_concurrency must be at least 1."
        );
    });

    it("should reject poll interval below 1", () => {
        expect(() => {
            configService.set(
                "poll_interval_ms",
                "0"
            );
        }).toThrow(
            "poll_interval_ms must be at least 1."
        );
    });

    it("should reject base retry delay below 1", () => {
        expect(() => {
            configService.set(
                "base_retry_delay_ms",
                "0"
            );
        }).toThrow(
            "base_retry_delay_ms must be at least 1."
        );
    });

    it("should reject default max retries below 1", () => {
        expect(() => {
            configService.set(
                "default_max_retries",
                "0"
            );
        }).toThrow(
            "default_max_retries must be at least 1."
        );
    });

    it("should independently update all supported configurations", () => {
        configService.set(
            "worker_concurrency",
            "4"
        );

        configService.set(
            "poll_interval_ms",
            "500"
        );

        configService.set(
            "base_retry_delay_ms",
            "2000"
        );

        configService.set(
            "default_max_retries",
            "5"
        );

        expect(
            configService.getNumber(
                "worker_concurrency"
            )
        ).toBe(4);

        expect(
            configService.getNumber(
                "poll_interval_ms"
            )
        ).toBe(500);

        expect(
            configService.getNumber(
                "base_retry_delay_ms"
            )
        ).toBe(2000);

        expect(
            configService.getNumber(
                "default_max_retries"
            )
        ).toBe(5);
    });
});