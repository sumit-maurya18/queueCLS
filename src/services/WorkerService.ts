import { exec } from "child_process";
import crypto from "crypto";
import { JobRepository } from "../repository/JobRepository";
import { RetryService } from "./RetryService";
import { ConfigService } from "./ConfigService";

export class WorkerService {
    private readonly repository = new JobRepository();
    private readonly retryService = new RetryService();
    private readonly configService = new ConfigService();

    private readonly workerId = crypto.randomUUID();

    private readonly concurrency: number;
    private readonly pollInterval: number;

    private activeJobs = 0;
    private running = false;

    constructor(concurrency?: number) {
        this.concurrency =
            concurrency ??
            this.configService.getNumber("worker_concurrency");

        this.pollInterval =
            this.configService.getNumber("poll_interval_ms");

        if (
            !Number.isInteger(this.concurrency) ||
            this.concurrency < 1
        ) {
            throw new Error(
                "Worker concurrency must be at least 1."
            );
        }

        if (
            !Number.isInteger(this.pollInterval) ||
            this.pollInterval < 1
        ) {
            throw new Error(
                "Worker poll interval must be at least 1 ms."
            );
        }
    }

    start(): void {
        if (this.running) {
            return;
        }

        this.running = true;

        console.log(
            `Worker started (${this.workerId})`
        );

        console.log(
            `Concurrency limit: ${this.concurrency}`
        );

        console.log(
            `Poll interval: ${this.pollInterval} ms`
        );

        process.on("SIGINT", () => {
            console.log("\nShutdown requested...");
            this.stop();
        });

        this.processJobs();
    }

    stop(): void {
        this.running = false;

        if (this.activeJobs === 0) {
            console.log("Worker stopped.");
            process.exit(0);
        }

        console.log(
            `Waiting for ${this.activeJobs} active job(s) to finish...`
        );
    }

    private processJobs(): void {
        if (!this.running) {
            return;
        }

        this.retryService.processRetries();

        while (
            this.running &&
            this.activeJobs < this.concurrency
        ) {
            const job =
                this.repository.findNextPendingJob();

            if (!job) {
                break;
            }

            const locked = this.repository.lockJob(
                job.id,
                this.workerId
            );

            if (!locked) {
                continue;
            }

            this.activeJobs++;

            console.log(
                `Processing job: ${job.id} | Active: ${this.activeJobs}/${this.concurrency}`
            );

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

                this.activeJobs--;

                console.log(
                    `Active jobs: ${this.activeJobs}/${this.concurrency}`
                );

                if (!this.running) {
                    if (this.activeJobs === 0) {
                        console.log("Worker stopped.");
                        process.exit(0);
                    }

                    return;
                }

                setImmediate(
                    () => this.processJobs()
                );
            });
        }

        if (
            this.running &&
            this.activeJobs < this.concurrency
        ) {
            setTimeout(
                () => this.processJobs(),
                this.pollInterval
            );
        }
    }
}