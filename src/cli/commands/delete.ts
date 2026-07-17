import { Command } from "commander";
import { QueueService } from "../../queue/QueueService";

export function registerDeleteCommand(program: Command): void {
    program
        .command("delete")
        .description("Delete a job from the queue")
        .requiredOption("--id <id>", "Job ID")
        .action((options) => {
            try {
                const queueService = new QueueService();

                queueService.deleteJob(options.id);

                console.log(`Job '${options.id}' deleted successfully.`);
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });
}