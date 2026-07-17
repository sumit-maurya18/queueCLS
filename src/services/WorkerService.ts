import { exec } from "child_process";
import crypto from "crypto";
import { JobRepository } from "../repository/JobRepository";

export class WorkerService {
    private repository = new JobRepository();

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

        const job = this.repository.findNextPendingJob();

        if (!job) {
            setTimeout(() => this.processJobs(), this.POLL_INTERVAL);
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

        console.log(`Processing job: ${job.id}`);

        this.repository.incrementAttempts(job.id);

exec(job.command, (error) => {

    if (error) {

        this.repository.updateJobResult(
            job.id,
            "failed",
            error.code ?? 1,
            error.message,
            null
        );

        console.error(`Job ${job.id} failed.`);
    }
    else {

        this.repository.updateJobResult(
            job.id,
            "completed",
            0,
            null,
            null
        );

        console.log(`Job ${job.id} completed.`);
    }

    setImmediate(() => this.processJobs());
});
    }
}