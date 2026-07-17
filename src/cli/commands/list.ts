import { Command } from "commander";
import { QueueService } from "../../queue/QueueService";

export function registerListCommand(program: Command): void {
    program
        .command("list")
        .description("List queued jobs")
        .option("--state <state>", "Filter jobs by state")
        .action((options) => {
            try {
                const queueService = new QueueService();

                const jobs = queueService.listJobs(options.state);

                if (jobs.length === 0) {
                    console.log("No jobs found.");
                    return;
                }

                console.table(
                    jobs.map((job) => ({
                        ID: job.id,
                        State: job.state,
                        Command: job.command,
                        Attempts: job.attempts,
                        Retries: job.max_retries,
                        Created: job.created_at,
                    }))
                );
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });
}