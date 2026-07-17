import { Command } from "commander";
import { QueueService } from "../../queue/QueueService";

export function registerStatusCommand(program: Command): void {
    program
        .command("status")
        .description("Show the status of a job")
        .requiredOption("--id <id>", "Job ID")
        .action((options) => {
            try {
                const queueService = new QueueService();

                const job = queueService.getJob(options.id);

                if (!job) {
                    console.error(
                        `Job with ID '${options.id}' not found.`
                    );
                    return;
                }

                console.table([
                    {
                        ID: job.id,
                        State: job.state,
                        Command: job.command,
                        Attempts: job.attempts,
                        Retries: job.max_retries,
                        "Last Error": job.last_error ?? "-",
                        "Exit Code": job.exit_code ?? "-",
                        "Next Retry": job.next_retry_at ?? "-",
                        "Locked By": job.locked_by ?? "-",
                        "Locked At": job.locked_at ?? "-",
                        Created: job.created_at,
                        Updated: job.updated_at
                    }
                ]);
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });
}