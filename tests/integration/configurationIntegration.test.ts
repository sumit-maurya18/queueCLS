import {
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import { QueueService } from "../../src/queue/QueueService";
import { JobRepository } from "../../src/repository/JobRepository";
import { ConfigService } from "../../src/services/ConfigService";
import { RetryService } from "../../src/services/RetryService";
import { WorkerService } from "../../src/services/WorkerService";
import { resetTestDatabase } from "../helpers/testDatabase";

describe("Configuration Integration", () => {
    let queueService: QueueService;
    let repository: JobRepository;
    let configService: ConfigService;
    let retryService: RetryService;

    beforeEach(() => {
        resetTestDatabase();

        queueService = new QueueService();
        repository = new JobRepository();
        configService = new ConfigService();
        retryService = new RetryService();
    });

    it(
        "should use configured default max retries when enqueueing a job",
        () => {
            configService.set(
                "default_max_retries",
                "5"
            );

            const job = queueService.enqueue(
                "configured-job",
                "echo Configuration Test"
            );

            expect(
                job.max_retries
            ).toBe(5);

            const persistedJob =
                repository.findById(
                    "configured-job"
                );

            expect(
                persistedJob?.max_retries
            ).toBe(5);
        }
    );

    it(
        "should allow explicit max retries to override configured default",
        () => {
            configService.set(
                "default_max_retries",
                "5"
            );

            const job = queueService.enqueue(
                "override-job",
                "echo Override Test",
                2
            );

            expect(
                job.max_retries
            ).toBe(2);

            const persistedJob =
                repository.findById(
                    "override-job"
                );

            expect(
                persistedJob?.max_retries
            ).toBe(2);
        }
    );

    it(
        "should use configured retry delay",
        () => {
            configService.set(
                "base_retry_delay_ms",
                "2000"
            );

            const job = queueService.enqueue(
                "retry-delay-job",
                "invalid_command",
                3
            );

            repository.lockJob(
                job.id,
                "test-worker"
            );

            repository.incrementAttempts(
                job.id
            );

            const before =
                Date.now();

            /*
             * Pass the original job object because
             * WorkerService does the same after
             * incrementing the persisted attempt count.
             */
            retryService.handleFailure(
                job,
                1,
                "Command failed"
            );

            const after =
                Date.now();

            const updatedJob =
                repository.findById(
                    job.id
                );

            expect(
                updatedJob?.state
            ).toBe("retry_wait");

            expect(
                updatedJob?.next_retry_at
            ).not.toBeNull();

            const retryTime =
                new Date(
                    updatedJob!.next_retry_at!
                ).getTime();

            expect(
                retryTime
            ).toBeGreaterThanOrEqual(
                before + 2000
            );

            expect(
                retryTime
            ).toBeLessThanOrEqual(
                after + 2000
            );
        }
    );

    it(
        "should initialize WorkerService using configured worker concurrency",
        () => {
            configService.set(
                "worker_concurrency",
                "4"
            );

            const worker =
                new WorkerService();

            const concurrency =
                (
                    worker as unknown as {
                        concurrency: number;
                    }
                ).concurrency;

            expect(
                concurrency
            ).toBe(4);
        }
    );

    it(
        "should initialize WorkerService using configured poll interval",
        () => {
            configService.set(
                "poll_interval_ms",
                "250"
            );

            const worker =
                new WorkerService();

            const pollInterval =
                (
                    worker as unknown as {
                        pollInterval: number;
                    }
                ).pollInterval;

            expect(
                pollInterval
            ).toBe(250);
        }
    );

    it(
        "should allow constructor concurrency to override configured concurrency",
        () => {
            configService.set(
                "worker_concurrency",
                "4"
            );

            const worker =
                new WorkerService(2);

            const concurrency =
                (
                    worker as unknown as {
                        concurrency: number;
                    }
                ).concurrency;

            expect(
                concurrency
            ).toBe(2);
        }
    );
});