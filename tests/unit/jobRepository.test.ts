import {
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import { JobRepository } from "../../src/repository/JobRepository";
import { Job } from "../../src/models/Job";
import { resetTestDatabase } from "../helpers/testDatabase";

describe("JobRepository", () => {
    let repository: JobRepository;

    beforeEach(() => {
        resetTestDatabase();
        repository = new JobRepository();
    });

    function createTestJob(
        id: string = "test-job"
    ): Job {
        const timestamp = new Date().toISOString();

        return {
            id,
            command: "echo Hello QueueCTL",
            state: "pending",
            attempts: 0,
            max_retries: 3,
            last_error: null,
            exit_code: null,
            next_retry_at: null,
            locked_by: null,
            locked_at: null,
            created_at: timestamp,
            updated_at: timestamp
        };
    }

    it("should create a job", () => {
        const job = createTestJob();

        repository.create(job);

        const savedJob =
            repository.findById(job.id);

        expect(savedJob).toBeDefined();
        expect(savedJob?.id).toBe(job.id);
        expect(savedJob?.command).toBe(job.command);
        expect(savedJob?.state).toBe("pending");
    });

    it("should return true when a job exists", () => {
        const job = createTestJob();

        repository.create(job);

        expect(
            repository.exists(job.id)
        ).toBe(true);
    });

    it("should return false when a job does not exist", () => {
        expect(
            repository.exists("missing-job")
        ).toBe(false);
    });

    it("should find a job by ID", () => {
        const job = createTestJob();

        repository.create(job);

        const result =
            repository.findById(job.id);

        expect(result).toBeDefined();
        expect(result?.id).toBe(job.id);
    });

    it("should return undefined for an unknown job ID", () => {
        const result =
            repository.findById("unknown-job");

        expect(result).toBeUndefined();
    });

    it("should return all jobs", () => {
        repository.create(
            createTestJob("job-1")
        );

        repository.create(
            createTestJob("job-2")
        );

        const jobs = repository.findAll();

        expect(jobs).toHaveLength(2);
    });

    it("should find jobs by state", () => {
        const pendingJob =
            createTestJob("pending-job");

        const completedJob =
            createTestJob("completed-job");

        completedJob.state = "completed";

        repository.create(pendingJob);
        repository.create(completedJob);

        const pendingJobs =
            repository.findByState("pending");

        expect(pendingJobs).toHaveLength(1);
        expect(pendingJobs[0].id).toBe(
            "pending-job"
        );
    });

    it("should update a job", () => {
        const job = createTestJob();

        repository.create(job);

        job.state = "completed";
        job.updated_at =
            new Date().toISOString();

        repository.update(job);

        const updatedJob =
            repository.findById(job.id);

        expect(updatedJob?.state).toBe(
            "completed"
        );
    });

    it("should delete a job", () => {
        const job = createTestJob();

        repository.create(job);

        repository.delete(job.id);

        expect(
            repository.exists(job.id)
        ).toBe(false);
    });

    it("should increment job attempts", () => {
        const job = createTestJob();

        repository.create(job);

        repository.incrementAttempts(job.id);

        const updatedJob =
            repository.findById(job.id);

        expect(updatedJob?.attempts).toBe(1);
    });

    it("should atomically lock a pending job", () => {
        const job = createTestJob();

        repository.create(job);

        const locked =
            repository.lockJob(
                job.id,
                "worker-1"
            );

        const lockedJob =
            repository.findById(job.id);

        expect(locked).toBe(true);
        expect(lockedJob?.state).toBe(
            "running"
        );
        expect(lockedJob?.locked_by).toBe(
            "worker-1"
        );
        expect(
            lockedJob?.locked_at
        ).not.toBeNull();
    });

    it("should prevent two workers from locking the same job", () => {
        const job = createTestJob();

        repository.create(job);

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
        expect(secondLock).toBe(false);

        const lockedJob =
            repository.findById(job.id);

        expect(lockedJob?.locked_by).toBe(
            "worker-1"
        );
    });

    it("should complete a job and release its lock", () => {
        const job = createTestJob();

        repository.create(job);

        repository.lockJob(
            job.id,
            "worker-1"
        );

        repository.incrementAttempts(
            job.id
        );

        repository.updateJobResult(
            job.id,
            "completed",
            0,
            null,
            null
        );

        const completedJob =
            repository.findById(job.id);

        expect(completedJob?.state).toBe(
            "completed"
        );

        expect(completedJob?.attempts).toBe(
            1
        );

        expect(completedJob?.exit_code).toBe(
            0
        );

        expect(
            completedJob?.locked_by
        ).toBeNull();

        expect(
            completedJob?.locked_at
        ).toBeNull();
    });
});