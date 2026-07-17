import { exec } from "child_process";
import { JobRepository } from "../repository/JobRepository";

export class WorkerService {
    private repository = new JobRepository();

    processNextJob(): void {
        const job = this.repository.findNextPendingJob();

        if (!job) {
            console.log("No pending jobs.");
            return;
        }

        console.log(`Processing job: ${job.id}`);

        this.repository.updateJobState(job.id, "running");
        this.repository.incrementAttempts(job.id);

        exec(job.command, (error) => {
            if (error) {
                console.error(`Job ${job.id} failed.`);
                this.repository.updateJobState(job.id, "failed");
                return;
            }

            console.log(`Job ${job.id} completed.`);
            this.repository.updateJobState(job.id, "completed");
        });
    }
}