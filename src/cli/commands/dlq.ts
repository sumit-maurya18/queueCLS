import { Command } from "commander";

export function registerDLQCommand(program: Command): void {
    program
        .command("dlq")
        .description("Manage dead letter queue")
        .action(() => {
            console.log("DLQ command");
        });
}