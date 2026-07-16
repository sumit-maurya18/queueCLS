import { Command } from "commander";

export function registerListCommand(program: Command): void {
    program
        .command("list")
        .description("List jobs")
        .action(() => {
            console.log("List command");
        });
}