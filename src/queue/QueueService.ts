import { Job } from "../models/Job";
import { JobRepository } from "../repository/JobRepository";
import { ConfigService } from "../services/ConfigService";
import { ValidationError } from "../errors/ValidationError";
import { DuplicateJobError } from "../errors/DuplicateJobError";

export class QueueService {
    private readonly repository: JobRepository;
    private readonly configService: ConfigService;

    constructor() {
        this.repository = new JobRepository();
        this.configService = new ConfigService();
    }

    enqueue(
        id: string,
        command: string,
        maxRetries?: number
    ): Job {
        id = id.trim();
        command = command.trim();

        if (id.length === 0) {
            throw new ValidationError(
                "Job ID cannot be empty."
            );
        }

        if (command.length === 0) {
            throw new ValidationError(
                "Command cannot be empty."
            );
        }

        const retries =
            maxRetries ??
            this.configService.getNumber(
                "default_max_retries"
            );

        if (
            !Number.isInteger(retries) ||
            retries < 1
        ) {
            throw new ValidationError(
                "Maximum retries must be at least 1."
            );
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
            max_retries: retries,
            last_error: null,
            exit_code: null,
            next_retry_at: null,
            locked_by: null,
            locked_at: null,
            created_at: timestamp,
            updated_at: timestamp
        };

        this.repository.create(job);

        return job;
    }

    getJob(id: string): Job | undefined {
        id = id.trim();

        if (id.length === 0) {
            throw new ValidationError(
                "Job ID cannot be empty."
            );
        }

        return this.repository.findById(id);
    }

    listJobs(state?: string): Job[] {
        if (state) {
            return this.repository.findByState(
                state.trim()
            );
        }

        return this.repository.findAll();
    }

    deleteJob(id: string): void {
        id = id.trim();

        if (id.length === 0) {
            throw new ValidationError(
                "Job ID cannot be empty."
            );
        }

        if (!this.repository.exists(id)) {
            throw new Error(
                `Job with ID '${id}' does not exist.`
            );
        }

        this.repository.delete(id);
    }
}