import { Command } from "commander";
import { QueueService } from "../../queue/QueueService";

export function registerStatusCommand(
    program: Command
): void {

    program
        .command("status")
        .description(
            "Show queue summary or status of a specific job"
        )
        .option(
            "--id <id>",
            "Show detailed status for a specific job"
        )
        .action((options) => {

            try {

                const queueService =
                    new QueueService();

                // Specific job status
                if (options.id) {

                    const job =
                        queueService.getJob(
                            options.id
                        );

                    if (!job) {
                        console.error(
                            `Job '${options.id}' not found.`
                        );

                        process.exitCode = 1;
                        return;
                    }

                    console.table([
                        {
                            ID: job.id,
                            State: job.state,
                            Command: job.command,
                            Attempts: job.attempts,
                            Retries:
                                job.max_retries,
                            "Last Error":
                                job.last_error ??
                                "-",
                            "Exit Code":
                                job.exit_code ??
                                "-",
                            "Next Retry":
                                job.next_retry_at ??
                                "-",
                            "Locked By":
                                job.locked_by ??
                                "-",
                            "Locked At":
                                job.locked_at ??
                                "-",
                            Created:
                                job.created_at,
                            Updated:
                                job.updated_at
                        }
                    ]);

                    return;
                }

                // Overall queue summary
                const jobs =
                    queueService.listJobs();

                const summary = {
                    Total: jobs.length,
                    Pending: 0,
                    Running: 0,
                    "Retry Wait": 0,
                    Completed: 0,
                    DLQ: 0
                };

                for (const job of jobs) {

                    switch (job.state) {

                        case "pending":
                            summary.Pending++;
                            break;

                        case "running":
                            summary.Running++;
                            break;

                        case "retry_wait":
                            summary["Retry Wait"]++;
                            break;

                        case "completed":
                            summary.Completed++;
                            break;

                        case "dlq":
                            summary.DLQ++;
                            break;
                    }
                }

                console.log(
                    "\nQueueCTL Status\n"
                );

                console.table([
                    summary
                ]);

            } catch (error) {

                const message =
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred.";

                console.error(
                    `Error: ${message}`
                );

                process.exitCode = 1;
            }
        });
}