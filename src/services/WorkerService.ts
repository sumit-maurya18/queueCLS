import { exec } from "child_process";
import crypto from "crypto";
import { JobRepository } from "../repository/JobRepository";
import { RetryService } from "./RetryService";

export class WorkerService {
    private readonly repository = new JobRepository();
    private readonly retryService = new RetryService();

    private readonly POLL_INTERVAL = 1000;
    private readonly workerId = crypto.randomUUID();

    private running = false;

    start(): void {
        if (this.running) {
            return;
        }

        this.running = true;

        console.log(`Worker started (${this.workerId})`);

        this.processJobs();

        process.on("SIGINT", () => {
            console.log("\nStopping worker...");
            this.stop();
        });
    }

    stop(): void {
        this.running = false;

        console.log("Worker stopped.");

        process.exit(0);
    }

    private processJobs(): void {
        if (!this.running) {
            return;
        }

        /*
         * Move retry_wait jobs whose retry time has arrived
         * back to the pending state.
         */
        this.retryService.processRetries();

        const job = this.repository.findNextPendingJob();

        if (!job) {
            setTimeout(
                () => this.processJobs(),
                this.POLL_INTERVAL
            );

            return;
        }

        const locked = this.repository.lockJob(
            job.id,
            this.workerId
        );

        if (!locked) {
            setImmediate(() => this.processJobs());
            return;
        }

        console.log(
            `Worker ${this.workerId} processing job: ${job.id}`
        );

        /*
         * Increment before execution.
         *
         * The Job object was fetched before this increment,
         * so RetryService calculates the current attempt as:
         *
         * job.attempts + 1
         */
        this.repository.incrementAttempts(job.id);

        exec(job.command, (error) => {

            if (error) {
                console.error(
                    `Job ${job.id} failed.`
                );

                const exitCode =
                    typeof error.code === "number"
                        ? error.code
                        : 1;

                this.retryService.handleFailure(
                    job,
                    exitCode,
                    error.message
                );
            } else {
                this.repository.updateJobResult(
                    job.id,
                    "completed",
                    0,
                    null,
                    null
                );

                console.log(
                    `Job ${job.id} completed.`
                );
            }

            setImmediate(
                () => this.processJobs()
            );
        });
    }
}