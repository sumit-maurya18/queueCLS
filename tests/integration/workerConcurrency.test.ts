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

describe("Worker Concurrency Integration", () => {
    let queueService: QueueService;
    let repository: JobRepository;
    let configService: ConfigService;

    beforeEach(() => {
        resetTestDatabase();

        queueService = new QueueService();
        repository = new JobRepository();
        configService = new ConfigService();

        configService.set(
            "poll_interval_ms",
            "50"
        );
    });

    async function waitForAllCompleted(
        jobIds: string[],
        timeout: number = 5000
    ): Promise<void> {
        const startTime = Date.now();

        while (
            Date.now() - startTime < timeout
        ) {
            const jobs = jobIds.map(
                (id) =>
                    repository.findById(id)
            );

            const allCompleted =
                jobs.every(
                    (job) =>
                        job?.state === "completed"
                );

            if (allCompleted) {
                return;
            }

            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 50)
            );
        }

        throw new Error(
            "Jobs did not complete within timeout."
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
        "should process multiple jobs with configured concurrency",
        async () => {
            const jobIds = [
                "concurrent-job-1",
                "concurrent-job-2",
                "concurrent-job-3"
            ];

            queueService.enqueue(
                jobIds[0],
                "node -e \"setTimeout(() => {}, 200)\""
            );

            queueService.enqueue(
                jobIds[1],
                "node -e \"setTimeout(() => {}, 200)\""
            );

            queueService.enqueue(
                jobIds[2],
                "node -e \"setTimeout(() => {}, 200)\""
            );

            const worker =
                new WorkerService(2);

            worker.start();

            /*
             * Allow worker enough time to claim jobs.
             */
            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 100)
            );

            const runningJobs =
                repository.findByState(
                    "running"
                );

            /*
             * With concurrency = 2, no more than
             * two jobs should run simultaneously.
             */
            expect(
                runningJobs.length
            ).toBeLessThanOrEqual(2);

            await waitForAllCompleted(
                jobIds
            );

            stopWorkerForTest(worker);

            for (const id of jobIds) {
                const job =
                    repository.findById(id);

                expect(job?.state).toBe(
                    "completed"
                );

                expect(job?.attempts).toBe(
                    1
                );

                expect(job?.exit_code).toBe(
                    0
                );
            }
        }
    );

    it(
        "should prevent duplicate execution when two workers compete for one job",
        async () => {
            queueService.enqueue(
                "shared-job",
                "node -e \"setTimeout(() => {}, 200)\""
            );

            const worker1 =
                new WorkerService(1);

            const worker2 =
                new WorkerService(1);

            worker1.start();
            worker2.start();

            await waitForAllCompleted(
                ["shared-job"]
            );

            stopWorkerForTest(worker1);
            stopWorkerForTest(worker2);

            const job =
                repository.findById(
                    "shared-job"
                );

            expect(job?.state).toBe(
                "completed"
            );

            /*
             * Atomic locking must ensure the job
             * was executed exactly once.
             */
            expect(job?.attempts).toBe(1);

            expect(job?.exit_code).toBe(0);

            expect(
                job?.locked_by
            ).toBeNull();

            expect(
                job?.locked_at
            ).toBeNull();
        }
    );
});