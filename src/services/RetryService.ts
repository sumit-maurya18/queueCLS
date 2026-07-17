import { Job } from "../models/Job";
import { JobRepository } from "../repository/JobRepository";
import { ConfigService } from "./ConfigService";

export class RetryService {
    private readonly repository = new JobRepository();
    private readonly configService = new ConfigService();

    handleFailure(
        job: Job,
        exitCode: number | null,
        errorMessage: string
    ): void {
        const currentAttempts = job.attempts + 1;

        if (currentAttempts >= job.max_retries) {
            this.repository.moveToDLQ(
                job.id,
                exitCode,
                errorMessage
            );

            console.log(
                `Job ${job.id} moved to DLQ after ${currentAttempts} attempts.`
            );

            return;
        }

        const retryDelay =
            this.calculateBackoff(currentAttempts);

        const nextRetryAt = new Date(
            Date.now() + retryDelay
        ).toISOString();

        this.repository.scheduleRetry(
            job.id,
            nextRetryAt,
            exitCode,
            errorMessage
        );

        console.log(
            `Job ${job.id} scheduled for retry at ${nextRetryAt}.`
        );
    }

    processRetries(): void {
        const jobs =
            this.repository.findJobsReadyForRetry();

        for (const job of jobs) {
            this.repository.markPendingForRetry(
                job.id
            );

            console.log(
                `Job ${job.id} is ready for retry.`
            );
        }
    }

    private calculateBackoff(
        attempts: number
    ): number {
        const baseRetryDelay =
            this.configService.getNumber(
                "base_retry_delay_ms"
            );

        return (
            baseRetryDelay *
            Math.pow(2, attempts - 1)
        );
    }
}