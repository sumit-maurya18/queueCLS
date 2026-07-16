import { Command } from "commander";

export function registerEnqueueCommand(program: Command): void {
    program
        .command("enqueue")
        .description("Add a job to the queue")
        .action(() => {
            console.log("Enqueue command");
        });
}