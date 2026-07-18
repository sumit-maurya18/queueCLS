import path from "path";
import { spawn } from "child_process";
import { Command } from "commander";
import { WorkerService } from "../../services/WorkerService";
import { WorkerRegistry } from "../../utils/WorkerRegistry";

export function registerWorkerCommand(program: Command): void {
    const worker = program
        .command("worker")
        .description("Manage background workers");

    worker
        .command("run")
        .description("Run a worker process")
        .option(
            "--concurrency <number>",
            "Maximum number of jobs processed concurrently"
        )
        .action((options) => {
            try {
                let concurrency: number | undefined;

                if (options.concurrency !== undefined) {
                    concurrency = Number(options.concurrency);

                    if (
                        !Number.isInteger(concurrency) ||
                        concurrency < 1
                    ) {
                        console.error(
                            "Concurrency must be a positive integer."
                        );
                        return;
                    }
                }

                const service = new WorkerService(concurrency);

                service.start();
            } catch (error) {
                if (error instanceof Error) {
                    console.error(error.message);
                } else {
                    console.error("Unknown error.");
                }
            }
        });

    worker
        .command("start")
        .description("Start one or more worker processes")
        .option(
            "-c, --count <number>",
            "Number of worker processes",
            "1"
        )
        .action((options) => {
            const count = Number(options.count);

            if (
                !Number.isInteger(count) ||
                count < 1
            ) {
                console.error(
                    "Worker count must be a positive integer."
                );
                return;
            }

            const registry = new WorkerRegistry();

            for (let i = 0; i < count; i++) {

                const child = spawn(
                    process.execPath,
                    [
                        path.join(
                            process.cwd(),
                            "dist",
                            "main.js"
                        ),
                        "worker",
                        "run"
                    ],
                    {
                        detached: true,
                        stdio: "ignore"
                    }
                );

                child.on("error", (err) => {
                    console.error(
                        `Failed to start worker: ${err.message}`
                    );
                });

                child.unref();

                if (child.pid) {
                    registry.add(child.pid);

                    console.log(
                        `Started worker PID ${child.pid}`
                    );
                }
            }

            console.log(
                `${count} worker(s) started successfully.`
            );
        });

    worker
        .command("stop")
        .description("Stop all worker processes")
        .action(() => {

            const registry = new WorkerRegistry();

            const workers = registry.getAll();

            if (workers.length === 0) {
                console.log(
                    "No running workers found."
                );
                return;
            }

            let stopped = 0;

            for (const worker of workers) {
                try {
                    process.kill(
                        worker.pid,
                        "SIGTERM"
                    );

                    stopped++;

                    console.log(
                        `Stopped worker PID ${worker.pid}`
                    );
                } catch {
                    console.log(
                        `Worker PID ${worker.pid} is not running.`
                    );
                }
            }

            registry.clear();

            console.log(
                `${stopped} worker(s) stopped.`
            );
        });

    // Backward compatibility
    worker.action(() => {
        const service = new WorkerService();
        service.start();
    });
}