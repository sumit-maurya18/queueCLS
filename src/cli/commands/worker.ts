import { Command } from "commander";
import { WorkerService } from "../../services/WorkerService";

export function registerWorkerCommand(program: Command): void {
    program
        .command("worker")
        .description("Start the background job worker")
        .option(
            "-c, --concurrency <number>",
            "Maximum number of jobs processed concurrently"
        )
        .action((options) => {
            try {
                let concurrency: number | undefined;

                if (options.concurrency !== undefined) {
                    concurrency = Number(
                        options.concurrency
                    );

                    if (
                        !Number.isInteger(concurrency) ||
                        concurrency < 1
                    ) {
                        console.error(
                            "Concurrency must be a positive integer."
                        );
                        return;
                    }
                }

                const worker =
                    new WorkerService(concurrency);

                worker.start();
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });
}