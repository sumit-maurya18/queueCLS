import { Command } from "commander";

import { registerEnqueueCommand } from "./commands/enqueue";
import { registerWorkerCommand } from "./commands/worker";
import { registerStatusCommand } from "./commands/status";
import { registerListCommand } from "./commands/list";
import { registerConfigCommand } from "./commands/config";
import { registerDLQCommand } from "./commands/dlq";

export function registerCommands(program: Command): void {
    registerEnqueueCommand(program);
    registerWorkerCommand(program);
    registerStatusCommand(program);
    registerListCommand(program);
    registerConfigCommand(program);
    registerDLQCommand(program);
}