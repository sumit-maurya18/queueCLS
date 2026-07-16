import { Command } from "commander";

export function registerWorkerCommand(program: Command): void {
    program
        .command("worker")
        .description("Manage workers")
        .action(() => {
            console.log("Worker command");
        });
}