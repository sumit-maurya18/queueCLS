import { Job } from "../models/Job";
import { JobRepository } from "../repository/JobRepository";

export class RetryService {
    private readonly repository = new JobRepository();

    private readonly BASE_RETRY_DELAY_MS = 1000;

    handleFailure(
        job: Job,
        exitCode: number | null,
        errorMessage: string
    ): void {
        /*
         * attempts has already been incremented by WorkerService
         * before executing the command.
         *
         * Example with max_retries = 3:
         *
         * attempt 1 fails -> retry
         * attempt 2 fails -> retry
         * attempt 3 fails -> DLQ
         */

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

        const retryDelay = this.calculateBackoff(currentAttempts);

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
        const jobs = this.repository.findJobsReadyForRetry();

        for (const job of jobs) {
            this.repository.markPendingForRetry(job.id);

            console.log(
                `Job ${job.id} is ready for retry.`
            );
        }
    }

    private calculateBackoff(attempts: number): number {
        return (
            this.BASE_RETRY_DELAY_MS *
            Math.pow(2, attempts - 1)
        );
    }
}