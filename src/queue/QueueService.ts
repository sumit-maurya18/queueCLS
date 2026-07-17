import { Job } from "../models/Job";
import { JobRepository } from "../repository/JobRepository";
import { ValidationError } from "../errors/ValidationError";
import { DuplicateJobError } from "../errors/DuplicateJobError";
import { DatabaseError } from "../errors/DatabaseError";

export class QueueService {
    private repository = new JobRepository();

    enqueue(id: string, command: string, maxRetries: number = 3): Job {
        id = id.trim();
        command = command.trim();

        if (!id) {
            throw new ValidationError("Job ID cannot be empty.");
        }

        if (!command) {
            throw new ValidationError("Command cannot be empty.");
        }

        if (maxRetries < 0) {
            throw new ValidationError("Maximum retries cannot be negative.");
        }

        if (this.repository.exists(id)) {
            throw new DuplicateJobError(`Job with ID '${id}' already exists.`);
        }

        const now = new Date().toISOString();

        const job: Job = {
            id,
            command,
            state: "pending",
            attempts: 0,
            max_retries: maxRetries,
            last_error: null,
            exit_code: null,
            next_retry_at: null,
            locked_by: null,
            locked_at: null,
            created_at: now,
            updated_at: now,
        };

        try {
            this.repository.create(job);
            return job;
        } catch (error) {
            throw new DatabaseError(
                error instanceof Error ? error.message : "Failed to create job."
            );
        }
    }

    listJobs(state?: string): Job[] {
        return state
            ? this.repository.findByState(state)
            : this.repository.findAll();
    }

    getJob(id: string): Job {
        if (!id.trim()) {
            throw new ValidationError("Job ID cannot be empty.");
        }

        const job = this.repository.findById(id);

        if (!job) {
            throw new ValidationError(`Job with ID '${id}' not found.`);
        }

        return job;
    }

    deleteJob(id: string): void {
        if (!id.trim()) {
            throw new ValidationError("Job ID cannot be empty.");
        }

        if (!this.repository.exists(id)) {
            throw new ValidationError(`Job with ID '${id}' not found.`);
        }

        this.repository.delete(id);
    }
}