import { Command } from "commander";
import { WorkerService } from "../../services/WorkerService";

export function registerWorkerCommand(program: Command): void {
    program
        .command("worker")
        .description("Process the next pending job")
        .action(() => {
            try {
                const worker = new WorkerService();
                worker.processNextJob();
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });
}