import {
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import { RetryService } from "../../src/services/RetryService";
import { JobRepository } from "../../src/repository/JobRepository";
import { ConfigService } from "../../src/services/ConfigService";
import { Job } from "../../src/models/Job";
import { resetTestDatabase } from "../helpers/testDatabase";

describe("RetryService", () => {
    let retryService: RetryService;
    let repository: JobRepository;
    let configService: ConfigService;

    beforeEach(() => {
        resetTestDatabase();

        repository = new JobRepository();
        configService = new ConfigService();
        retryService = new RetryService();
    });

    function createTestJob(
        id: string,
        attempts: number = 0,
        maxRetries: number = 3
    ): Job {
        const timestamp = new Date().toISOString();

        return {
            id,
            command: "invalid_command",
            state: "running",
            attempts,
            max_retries: maxRetries,
            last_error: null,
            exit_code: null,
            next_retry_at: null,
            locked_by: "test-worker",
            locked_at: timestamp,
            created_at: timestamp,
            updated_at: timestamp
        };
    }

    it("should schedule a failed job for retry", () => {
        const job = createTestJob(
            "retry-job",
            0,
            3
        );

        repository.create(job);

        retryService.handleFailure(
            job,
            1,
            "Command failed"
        );

        const updatedJob =
            repository.findById(job.id);

        expect(updatedJob).toBeDefined();

        expect(updatedJob?.state).toBe(
            "retry_wait"
        );

        expect(updatedJob?.exit_code).toBe(1);

        expect(updatedJob?.last_error).toBe(
            "Command failed"
        );

        expect(
            updatedJob?.next_retry_at
        ).not.toBeNull();

        expect(
            updatedJob?.locked_by
        ).toBeNull();

        expect(
            updatedJob?.locked_at
        ).toBeNull();
    });

    it("should use configured base retry delay", () => {
        configService.set(
            "base_retry_delay_ms",
            "2000"
        );

        const job = createTestJob(
            "delay-job",
            0,
            3
        );

        repository.create(job);

        const before = Date.now();

        retryService.handleFailure(
            job,
            1,
            "Command failed"
        );

        const after = Date.now();

        const updatedJob =
            repository.findById(job.id);

        expect(
            updatedJob?.next_retry_at
        ).not.toBeNull();

        const retryTime = new Date(
            updatedJob!.next_retry_at!
        ).getTime();

        expect(retryTime).toBeGreaterThanOrEqual(
            before + 2000
        );

        expect(retryTime).toBeLessThanOrEqual(
            after + 2000
        );
    });

    it("should apply exponential backoff", () => {
        configService.set(
            "base_retry_delay_ms",
            "1000"
        );

        const job = createTestJob(
            "backoff-job",
            1,
            4
        );

        repository.create(job);

        const before = Date.now();

        retryService.handleFailure(
            job,
            1,
            "Second attempt failed"
        );

        const after = Date.now();

        const updatedJob =
            repository.findById(job.id);

        expect(
            updatedJob?.next_retry_at
        ).not.toBeNull();

        const retryTime = new Date(
            updatedJob!.next_retry_at!
        ).getTime();

        expect(retryTime).toBeGreaterThanOrEqual(
            before + 2000
        );

        expect(retryTime).toBeLessThanOrEqual(
            after + 2000
        );
    });

    it("should move job to DLQ when max attempts are reached", () => {
        const job = createTestJob(
            "dlq-job",
            2,
            3
        );

        repository.create(job);

        retryService.handleFailure(
            job,
            1,
            "Final failure"
        );

        const updatedJob =
            repository.findById(job.id);

        expect(updatedJob?.state).toBe(
            "dlq"
        );

        expect(updatedJob?.exit_code).toBe(1);

        expect(updatedJob?.last_error).toBe(
            "Final failure"
        );

        expect(
            updatedJob?.next_retry_at
        ).toBeNull();

        expect(
            updatedJob?.locked_by
        ).toBeNull();

        expect(
            updatedJob?.locked_at
        ).toBeNull();
    });

    it("should move retry-ready jobs back to pending", () => {
        const job = createTestJob(
            "ready-job",
            1,
            3
        );

        job.state = "retry_wait";

        job.next_retry_at = new Date(
            Date.now() - 1000
        ).toISOString();

        job.locked_by = null;
        job.locked_at = null;

        repository.create(job);

        retryService.processRetries();

        const updatedJob =
            repository.findById(job.id);

        expect(updatedJob?.state).toBe(
            "pending"
        );

        expect(
            updatedJob?.next_retry_at
        ).toBeNull();
    });

    it("should not process jobs whose retry time is in the future", () => {
        const job = createTestJob(
            "future-job",
            1,
            3
        );

        job.state = "retry_wait";

        job.next_retry_at = new Date(
            Date.now() + 60000
        ).toISOString();

        job.locked_by = null;
        job.locked_at = null;

        repository.create(job);

        retryService.processRetries();

        const updatedJob =
            repository.findById(job.id);

        expect(updatedJob?.state).toBe(
            "retry_wait"
        );

        expect(
            updatedJob?.next_retry_at
        ).not.toBeNull();
    });

    it("should preserve attempts when scheduling a retry", () => {
        const job = createTestJob(
            "attempt-job",
            1,
            3
        );

        repository.create(job);

        retryService.handleFailure(
            job,
            1,
            "Command failed"
        );

        const updatedJob =
            repository.findById(job.id);

        expect(updatedJob?.attempts).toBe(1);
    });
});