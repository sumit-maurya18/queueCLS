import {
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import { QueueService } from "../../src/queue/QueueService";
import { ConfigService } from "../../src/services/ConfigService";
import { resetTestDatabase } from "../helpers/testDatabase";

describe("QueueService", () => {
    let queueService: QueueService;
    let configService: ConfigService;

    beforeEach(() => {
        resetTestDatabase();

        queueService = new QueueService();
        configService = new ConfigService();
    });

    it("should enqueue a valid job", () => {
        const job = queueService.enqueue(
            "job-1",
            "echo Hello"
        );

        expect(job.id).toBe("job-1");
        expect(job.command).toBe("echo Hello");
        expect(job.state).toBe("pending");
        expect(job.attempts).toBe(0);
        expect(job.max_retries).toBe(3);
        expect(job.exit_code).toBeNull();
    });

    it("should trim job ID and command", () => {
        const job = queueService.enqueue(
            "  job-1  ",
            "  echo Hello  "
        );

        expect(job.id).toBe("job-1");
        expect(job.command).toBe("echo Hello");
    });

    it("should reject an empty job ID", () => {
        expect(() => {
            queueService.enqueue(
                "",
                "echo Hello"
            );
        }).toThrow(
            "Job ID cannot be empty."
        );
    });

    it("should reject a whitespace-only job ID", () => {
        expect(() => {
            queueService.enqueue(
                "   ",
                "echo Hello"
            );
        }).toThrow(
            "Job ID cannot be empty."
        );
    });

    it("should reject an empty command", () => {
        expect(() => {
            queueService.enqueue(
                "job-1",
                ""
            );
        }).toThrow(
            "Command cannot be empty."
        );
    });

    it("should reject a whitespace-only command", () => {
        expect(() => {
            queueService.enqueue(
                "job-1",
                "   "
            );
        }).toThrow(
            "Command cannot be empty."
        );
    });

    it("should reject duplicate job IDs", () => {
        queueService.enqueue(
            "duplicate-job",
            "echo First"
        );

        expect(() => {
            queueService.enqueue(
                "duplicate-job",
                "echo Second"
            );
        }).toThrow(
            "already exists"
        );
    });

    it("should use configured default max retries", () => {
        configService.set(
            "default_max_retries",
            "5"
        );

        const job = queueService.enqueue(
            "configured-retry-job",
            "echo Hello"
        );

        expect(job.max_retries).toBe(5);
    });

    it("should allow explicit max retries to override configuration", () => {
        configService.set(
            "default_max_retries",
            "5"
        );

        const job = queueService.enqueue(
            "override-job",
            "echo Hello",
            2
        );

        expect(job.max_retries).toBe(2);
    });

    it("should reject zero max retries", () => {
        expect(() => {
            queueService.enqueue(
                "zero-retry-job",
                "echo Hello",
                0
            );
        }).toThrow(
            "Maximum retries must be at least 1."
        );
    });

    it("should reject negative max retries", () => {
        expect(() => {
            queueService.enqueue(
                "negative-retry-job",
                "echo Hello",
                -1
            );
        }).toThrow(
            "Maximum retries must be at least 1."
        );
    });

    it("should reject non-integer max retries", () => {
        expect(() => {
            queueService.enqueue(
                "decimal-retry-job",
                "echo Hello",
                2.5
            );
        }).toThrow(
            "Maximum retries must be at least 1."
        );
    });

    it("should retrieve a job by ID", () => {
        queueService.enqueue(
            "find-job",
            "echo Hello"
        );

        const job =
            queueService.getJob("find-job");

        expect(job).toBeDefined();
        expect(job?.id).toBe("find-job");
    });

    it("should return undefined for an unknown job", () => {
        const job =
            queueService.getJob(
                "unknown-job"
            );

        expect(job).toBeUndefined();
    });

    it("should list all jobs", () => {
        queueService.enqueue(
            "job-1",
            "echo One"
        );

        queueService.enqueue(
            "job-2",
            "echo Two"
        );

        const jobs =
            queueService.listJobs();

        expect(jobs).toHaveLength(2);
    });

    it("should delete a job", () => {
        queueService.enqueue(
            "delete-job",
            "echo Delete"
        );

        queueService.deleteJob(
            "delete-job"
        );

        expect(
            queueService.getJob(
                "delete-job"
            )
        ).toBeUndefined();
    });

    it("should reject deletion of an unknown job", () => {
        expect(() => {
            queueService.deleteJob(
                "missing-job"
            );
        }).toThrow(
            "does not exist"
        );
    });
});