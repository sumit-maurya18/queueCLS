import { Command } from "commander";
import { QueueService } from "../../queue/QueueService";

export function registerEnqueueCommand(program: Command): void {

    program
        .command("enqueue")
        .description("Add a job to the queue")
        .requiredOption(
            "--id <id>",
            "Unique Job ID"
        )
        .requiredOption(
            "--command <command>",
            "Command to execute"
        )
        .action((options) => {

            try {

                const queueService = new QueueService();

                const job = queueService.enqueue(
                    options.id,
                    options.command
                );

                console.log("\nJob created successfully.\n");

                console.table([
                    {
                        ID: job.id,
                        Command: job.command,
                        State: job.state,
                        Retries: job.max_retries,
                        Created: job.created_at
                    }
                ]);

            } catch (error) {

                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error occurred.");
                }

            }

        });

}