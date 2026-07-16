import { Command } from "commander";
import { registerCommands } from "./registerCommands";

export function createCLI(): void {
    const program = new Command();

    program
        .name("queuectl")
        .description("CLI-based Background Job Queue")
        .version("1.0.0");

    registerCommands(program);

    program.parse(process.argv);
}