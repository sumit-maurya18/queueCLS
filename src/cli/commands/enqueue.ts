import { Command } from "commander";
import { QueueService } from "../../queue/QueueService";

interface EnqueueInput {
    id: string;
    command: string;
    max_retries?: number;
}

export function registerEnqueueCommand(
    program: Command
): void {

    program
        .command("enqueue [job]")
        .description(
            "Add a job to the queue using JSON or command-line options"
        )
        .option(
            "--id <id>",
            "Unique job ID"
        )
        .option(
            "--command <command>",
            "Command to execute"
        )
        .option(
            "--max-retries <number>",
            "Maximum execution attempts"
        )
        .action((
            jobInput: string | undefined,
            options: {
                id?: string;
                command?: string;
                maxRetries?: string;
            }
        ) => {

            try {

                let input: EnqueueInput;

                // Mode 1: JSON input
                if (jobInput !== undefined) {

                    let parsed: unknown;

                    try {
                        parsed =
                            JSON.parse(jobInput);
                    } catch {
                        throw new Error(
                            "Invalid JSON input. " +
                            "If your shell modifies JSON quoting, " +
                            "use: queuectl enqueue --id <id> --command <command>"
                        );
                    }

                    if (
                        typeof parsed !== "object" ||
                        parsed === null ||
                        Array.isArray(parsed)
                    ) {
                        throw new Error(
                            "Job input must be a JSON object."
                        );
                    }

                    const job =
                        parsed as Record<
                            string,
                            unknown
                        >;

                    if (
                        typeof job.id !==
                        "string"
                    ) {
                        throw new Error(
                            "Job JSON must contain a string 'id'."
                        );
                    }

                    if (
                        typeof job.command !==
                        "string"
                    ) {
                        throw new Error(
                            "Job JSON must contain a string 'command'."
                        );
                    }

                    if (
                        job.max_retries !==
                            undefined &&
                        (
                            typeof job.max_retries !==
                                "number" ||
                            !Number.isInteger(
                                job.max_retries
                            )
                        )
                    ) {
                        throw new Error(
                            "'max_retries' must be an integer."
                        );
                    }

                    input = {
                        id: job.id,
                        command: job.command,
                        max_retries:
                            job.max_retries as
                                | number
                                | undefined
                    };

                // Mode 2: CLI options
                } else {

                    if (!options.id) {
                        throw new Error(
                            "Job ID is required. Use --id <id>."
                        );
                    }

                    if (!options.command) {
                        throw new Error(
                            "Command is required. Use --command <command>."
                        );
                    }

                    let maxRetries:
                        number | undefined;

                    if (
                        options.maxRetries !==
                        undefined
                    ) {

                        maxRetries = Number(
                            options.maxRetries
                        );

                        if (
                            !Number.isInteger(
                                maxRetries
                            )
                        ) {
                            throw new Error(
                                "--max-retries must be an integer."
                            );
                        }
                    }

                    input = {
                        id: options.id,
                        command:
                            options.command,
                        max_retries:
                            maxRetries
                    };
                }

                const queueService =
                    new QueueService();

                const job =
                    queueService.enqueue(
                        input.id,
                        input.command,
                        input.max_retries
                    );

                console.log(
                    "\nJob created successfully.\n"
                );

                console.table([
                    {
                        ID: job.id,
                        Command:
                            job.command,
                        State:
                            job.state,
                        Retries:
                            job.max_retries,
                        Created:
                            job.created_at
                    }
                ]);

            } catch (error) {

                const message =
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred.";

                console.error(
                    `Error: ${message}`
                );

                process.exitCode = 1;
            }
        });
}