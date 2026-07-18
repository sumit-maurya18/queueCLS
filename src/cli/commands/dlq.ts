import { Command } from "commander";
import { JobRepository } from "../../repository/JobRepository";
import { RetryService } from "../../services/RetryService";

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
        .argument("<job-id>", "Job ID")
        .action((jobId: string) => {
            try {
                const retryService = new RetryService();

                retryService.retryDLQJob(jobId);
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }

                process.exitCode = 1;
            }
        });

    dlq
        .command("delete")
        .description("Delete a job from the dead letter queue")
        .argument("<job-id>", "Job ID")
        .action((jobId: string) => {
            try {
                const repository = new JobRepository();

                const job = repository.findById(jobId);

                if (!job) {
                    console.error(
                        `Job with ID '${jobId}' not found.`
                    );
                    return;
                }

                if (job.state !== "dlq") {
                    console.error(
                        `Job '${jobId}' is not in the DLQ.`
                    );
                    return;
                }

                repository.delete(jobId);

                console.log(
                    `Job '${jobId}' deleted from DLQ.`
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