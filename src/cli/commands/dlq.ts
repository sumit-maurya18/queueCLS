import { Command } from "commander";
import { JobRepository } from "../../repository/JobRepository";

export function registerDLQCommand(program: Command): void {
    const dlq = program
        .command("dlq")
        .description("Manage dead letter queue jobs");

    dlq
        .command("list")
        .description("List all jobs in the dead letter queue")
        .action(() => {
            try {
                const repository = new JobRepository();

                const jobs = repository.findDLQJobs();

                if (jobs.length === 0) {
                    console.log("No jobs found in DLQ.");
                    return;
                }

                console.table(
                    jobs.map((job) => ({
                        ID: job.id,
                        Command: job.command,
                        Attempts: job.attempts,
                        Retries: job.max_retries,
                        "Exit Code": job.exit_code ?? "-",
                        "Last Error": job.last_error ?? "-",
                        Updated: job.updated_at
                    }))
                );
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });

    dlq
        .command("retry")
        .description("Retry a job from the dead letter queue")
        .requiredOption("--id <id>", "Job ID")
        .action((options) => {
            try {
                const repository = new JobRepository();

                const job = repository.findById(options.id);

                if (!job) {
                    console.error(
                        `Job with ID '${options.id}' not found.`
                    );
                    return;
                }

                if (job.state !== "dlq") {
                    console.error(
                        `Job '${options.id}' is not in the DLQ.`
                    );
                    return;
                }

                repository.retryDLQJob(options.id);

                console.log(
                    `Job '${options.id}' moved from DLQ to pending.`
                );
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });

    dlq
        .command("delete")
        .description("Delete a job from the dead letter queue")
        .requiredOption("--id <id>", "Job ID")
        .action((options) => {
            try {
                const repository = new JobRepository();

                const job = repository.findById(options.id);

                if (!job) {
                    console.error(
                        `Job with ID '${options.id}' not found.`
                    );
                    return;
                }

                if (job.state !== "dlq") {
                    console.error(
                        `Job '${options.id}' is not in the DLQ.`
                    );
                    return;
                }

                repository.delete(options.id);

                console.log(
                    `Job '${options.id}' deleted from DLQ.`
                );
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });
}