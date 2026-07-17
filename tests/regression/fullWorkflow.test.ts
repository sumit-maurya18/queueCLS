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
import { resetTestDatabase } from "../helpers/testDatabase";

describe("QueueCTL Full Workflow Regression", () => {
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
        "should preserve the complete successful job lifecycle",
        () => {
            const job = queueService.enqueue(
                "regression-success-job",
                "echo Regression Test"
            );

            expect(job.state).toBe(
                "pending"
            );

            expect(job.attempts).toBe(0);

            const locked =
                repository.lockJob(
                    job.id,
                    "regression-worker"
                );

            expect(locked).toBe(true);

            repository.incrementAttempts(
                job.id
            );

            let persistedJob =
                repository.findById(
                    job.id
                );

            expect(
                persistedJob?.state
            ).toBe("running");

            expect(
                persistedJob?.attempts
            ).toBe(1);

            expect(
                persistedJob?.locked_by
            ).toBe(
                "regression-worker"
            );

            repository.updateJobResult(
                job.id,
                "completed",
                0,
                null,
                null
            );

            persistedJob =
                repository.findById(
                    job.id
                );

            expect(
                persistedJob?.state
            ).toBe("completed");

            expect(
                persistedJob?.attempts
            ).toBe(1);

            expect(
                persistedJob?.exit_code
            ).toBe(0);

            expect(
                persistedJob?.last_error
            ).toBeNull();

            expect(
                persistedJob?.locked_by
            ).toBeNull();

            expect(
                persistedJob?.locked_at
            ).toBeNull();
        }
    );

    it(
        "should preserve configured default retry behavior",
        () => {
            configService.set(
                "default_max_retries",
                "5"
            );

            const job = queueService.enqueue(
                "configured-regression-job",
                "echo Config Regression"
            );

            expect(
                job.max_retries
            ).toBe(5);

            const persistedJob =
                repository.findById(
                    job.id
                );

            expect(
                persistedJob?.max_retries
            ).toBe(5);
        }
    );

    it(
        "should preserve retry scheduling behavior",
        () => {
            configService.set(
                "base_retry_delay_ms",
                "1000"
            );

            const job = queueService.enqueue(
                "retry-regression-job",
                "invalid_command",
                3
            );

            repository.lockJob(
                job.id,
                "regression-worker"
            );

            repository.incrementAttempts(
                job.id
            );

            retryService.handleFailure(
                job,
                1,
                "Regression failure"
            );

            const failedJob =
                repository.findById(
                    job.id
                );

            expect(
                failedJob?.state
            ).toBe("retry_wait");

            expect(
                failedJob?.attempts
            ).toBe(1);

            expect(
                failedJob?.exit_code
            ).toBe(1);

            expect(
                failedJob?.last_error
            ).toBe(
                "Regression failure"
            );

            expect(
                failedJob?.next_retry_at
            ).not.toBeNull();

            expect(
                failedJob?.locked_by
            ).toBeNull();

            expect(
                failedJob?.locked_at
            ).toBeNull();
        }
    );

    it(
        "should preserve atomic locking behavior",
        () => {
            const job = queueService.enqueue(
                "locking-regression-job",
                "echo Lock Test"
            );

            const firstLock =
                repository.lockJob(
                    job.id,
                    "worker-1"
                );

            const secondLock =
                repository.lockJob(
                    job.id,
                    "worker-2"
                );

            expect(firstLock).toBe(true);

            expect(secondLock).toBe(
                false
            );

            const persistedJob =
                repository.findById(
                    job.id
                );

            expect(
                persistedJob?.locked_by
            ).toBe("worker-1");
        }
    );

    it(
        "should preserve duplicate job ID prevention",
        () => {
            queueService.enqueue(
                "duplicate-regression-job",
                "echo First"
            );

            expect(() => {
                queueService.enqueue(
                    "duplicate-regression-job",
                    "echo Second"
                );
            }).toThrow(
                "already exists"
            );
        }
    );

    it(
        "should preserve job retrieval and listing",
        () => {
            queueService.enqueue(
                "list-job-1",
                "echo One"
            );

            queueService.enqueue(
                "list-job-2",
                "echo Two"
            );

            const firstJob =
                queueService.getJob(
                    "list-job-1"
                );

            expect(firstJob).toBeDefined();

            expect(firstJob?.id).toBe(
                "list-job-1"
            );

            const jobs =
                queueService.listJobs();

            expect(jobs).toHaveLength(2);
        }
    );
});