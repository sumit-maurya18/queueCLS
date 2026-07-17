import { exec } from "child_process";
import { JobRepository } from "../repository/JobRepository";

export class WorkerService {
    private repository = new JobRepository();
    private readonly POLL_INTERVAL = 1000;

    private running = false;

    start(): void {
        if (this.running) {
            return;
        }

        this.running = true;

        console.log("Worker started.");

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

        console.log(`Processing job: ${job.id}`);

        this.repository.updateJobState(job.id, "running");
        this.repository.incrementAttempts(job.id);

        exec(job.command, (error) => {

            if (error) {
                console.error(`Job ${job.id} failed.`);
                this.repository.updateJobState(job.id, "failed");
            } else {
                console.log(`Job ${job.id} completed.`);
                this.repository.updateJobState(job.id, "completed");
            }

            setImmediate(() => this.processJobs());
        });
    }
}