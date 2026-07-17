import {
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import { QueueService } from "../../src/queue/QueueService";
import { JobRepository } from "../../src/repository/JobRepository";
import { WorkerService } from "../../src/services/WorkerService";
import { ConfigService } from "../../src/services/ConfigService";
import { resetTestDatabase } from "../helpers/testDatabase";

describe("Worker Execution Integration", () => {
    let queueService: QueueService;
    let repository: JobRepository;
    let configService: ConfigService;

    beforeEach(() => {
        resetTestDatabase();

        queueService = new QueueService();
        repository = new JobRepository();
        configService = new ConfigService();

        // Keep polling fast during automated tests.
        configService.set(
            "poll_interval_ms",
            "50"
        );
    });

    async function waitForJobState(
        jobId: string,
        expectedState: string,
        timeout: number = 3000
    ): Promise<void> {
        const startTime = Date.now();

        while (
            Date.now() - startTime < timeout
        ) {
            const job =
                repository.findById(jobId);

            if (
                job?.state === expectedState
            ) {
                return;
            }

            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 50)
            );
        }

        throw new Error(
            `Job '${jobId}' did not reach state '${expectedState}' within ${timeout} ms.`
        );
    }

    function stopWorkerForTest(
        worker: WorkerService
    ): void {
        (
            worker as unknown as {
                running: boolean;
            }
        ).running = false;
    }

    it(
        "should process a pending job successfully",
        async () => {
            queueService.enqueue(
                "worker-success-job",
                "echo Worker Integration Test"
            );

            const worker =
                new WorkerService(1);

            worker.start();

            await waitForJobState(
                "worker-success-job",
                "completed"
            );

            stopWorkerForTest(worker);

            const job =
                repository.findById(
                    "worker-success-job"
                );

            expect(job).toBeDefined();

            expect(job?.state).toBe(
                "completed"
            );

            expect(job?.attempts).toBe(1);

            expect(job?.exit_code).toBe(0);

            expect(
                job?.last_error
            ).toBeNull();

            expect(
                job?.locked_by
            ).toBeNull();

            expect(
                job?.locked_at
            ).toBeNull();
        }
    );

    it(
        "should execute a completed job only once",
        async () => {
            queueService.enqueue(
                "single-execution-job",
                "echo Single Execution"
            );

            const worker =
                new WorkerService(1);

            worker.start();

            await waitForJobState(
                "single-execution-job",
                "completed"
            );

            // Give the worker another polling cycle.
            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 150)
            );

            stopWorkerForTest(worker);

            const job =
                repository.findById(
                    "single-execution-job"
                );

            expect(job?.state).toBe(
                "completed"
            );

            expect(job?.attempts).toBe(1);
        }
    );
});