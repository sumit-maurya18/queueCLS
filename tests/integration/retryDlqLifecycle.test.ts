import {
    beforeEach,
    describe,
    expect,
    it
} from "vitest";

import { QueueService } from "../../src/queue/QueueService";
import { JobRepository } from "../../src/repository/JobRepository";
import { RetryService } from "../../src/services/RetryService";
import { ConfigService } from "../../src/services/ConfigService";
import { resetTestDatabase } from "../helpers/testDatabase";

describe("Retry and DLQ Lifecycle Integration", () => {
    let queueService: QueueService;
    let repository: JobRepository;
    let retryService: RetryService;
    let configService: ConfigService;

    beforeEach(() => {
        resetTestDatabase();

        queueService = new QueueService();
        repository = new JobRepository();
        retryService = new RetryService();
        configService = new ConfigService();

        configService.set(
            "base_retry_delay_ms",
            "1"
        );
    });

    it(
        "should move a failed job through retry lifecycle to DLQ",
        async () => {
            queueService.enqueue(
                "retry-lifecycle-job",
                "invalid_command",
                3
            );

            /*
             * FIRST ATTEMPT
             */

            const initialJob =
                repository.findById(
                    "retry-lifecycle-job"
                );

            expect(initialJob).toBeDefined();

            repository.lockJob(
                initialJob!.id,
                "worker-1"
            );

            repository.incrementAttempts(
                initialJob!.id
            );

            retryService.handleFailure(
                initialJob!,
                1,
                "First failure"
            );

            let currentJob =
                repository.findById(
                    initialJob!.id
                );

            expect(
                currentJob?.state
            ).toBe("retry_wait");

            expect(
                currentJob?.attempts
            ).toBe(1);

            /*
             * WAIT FOR RETRY
             */

            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 10)
            );

            retryService.processRetries();

            currentJob =
                repository.findById(
                    initialJob!.id
                );

            expect(
                currentJob?.state
            ).toBe("pending");

            /*
             * SECOND ATTEMPT
             */

            const jobBeforeSecondAttempt =
                currentJob!;

            repository.lockJob(
                jobBeforeSecondAttempt.id,
                "worker-2"
            );

            repository.incrementAttempts(
                jobBeforeSecondAttempt.id
            );

            retryService.handleFailure(
                jobBeforeSecondAttempt,
                1,
                "Second failure"
            );

            currentJob =
                repository.findById(
                    initialJob!.id
                );

            expect(
                currentJob?.state
            ).toBe("retry_wait");

            expect(
                currentJob?.attempts
            ).toBe(2);

            /*
             * WAIT FOR FINAL RETRY
             */

            await new Promise(
                (resolve) =>
                    setTimeout(resolve, 10)
            );

            retryService.processRetries();

            currentJob =
                repository.findById(
                    initialJob!.id
                );

            expect(
                currentJob?.state
            ).toBe("pending");

            /*
             * THIRD ATTEMPT
             */

            const jobBeforeFinalAttempt =
                currentJob!;

            repository.lockJob(
                jobBeforeFinalAttempt.id,
                "worker-3"
            );

            repository.incrementAttempts(
                jobBeforeFinalAttempt.id
            );

            retryService.handleFailure(
                jobBeforeFinalAttempt,
                1,
                "Final failure"
            );

            const dlqJob =
                repository.findById(
                    initialJob!.id
                );

            expect(dlqJob?.state).toBe(
                "dlq"
            );

            expect(dlqJob?.attempts).toBe(
                3
            );

            expect(
                dlqJob?.exit_code
            ).toBe(1);

            expect(
                dlqJob?.last_error
            ).toBe(
                "Final failure"
            );

            expect(
                dlqJob?.next_retry_at
            ).toBeNull();

            expect(
                dlqJob?.locked_by
            ).toBeNull();

            expect(
                dlqJob?.locked_at
            ).toBeNull();
        }
    );
});