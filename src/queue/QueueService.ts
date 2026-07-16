import { Job } from "../models/Job";
import { JobRepository } from "../repository/JobRepository";
import { ValidationError } from "../errors/ValidationError";
import { DuplicateJobError } from "../errors/DuplicateJobError";
import { DatabaseError } from "../errors/DatabaseError";

export class QueueService {

    private readonly repository: JobRepository;

    constructor() {
        this.repository = new JobRepository();
    }

    enqueue(
        id: string,
        command: string,
        maxRetries: number = 3
    ): Job {

        id = id.trim();
        command = command.trim();

        if (id.length === 0) {
            throw new ValidationError("Job ID cannot be empty.");
        }

        if (command.length === 0) {
            throw new ValidationError("Command cannot be empty.");
        }

        if (maxRetries < 0) {
            throw new ValidationError("Maximum retries cannot be negative.");
        }

        if (this.repository.exists(id)) {
            throw new DuplicateJobError(id);
        }

        const timestamp = new Date().toISOString();

        const job: Job = {
            id,
            command,
            state: "pending",
            attempts: 0,
            max_retries: maxRetries,
            last_error: null,
            next_retry_at: null,
            locked_by: null,
            locked_at: null,
            created_at: timestamp,
            updated_at: timestamp
        };

        try {

            this.repository.create(job);

        } catch (error) {

            if (error instanceof Error) {
                throw new DatabaseError(error.message);
            }

            throw new DatabaseError("Unknown database error.");

        }

        return job;

    }

}