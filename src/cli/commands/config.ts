import { Command } from "commander";

export function registerConfigCommand(program: Command): void {
    program
        .command("config")
        .description("Manage configuration")
        .action(() => {
            console.log("Config command");
        });
}