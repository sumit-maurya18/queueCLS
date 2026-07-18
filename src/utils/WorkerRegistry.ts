import fs from "fs";
import path from "path";

interface WorkerInfo {
    pid: number;
    startedAt: string;
}

interface Registry {
    workers: WorkerInfo[];
}

export class WorkerRegistry {
    private readonly registryFile = path.join(
        process.cwd(),
        "worker_registry.json"
    );

    private read(): Registry {
        if (!fs.existsSync(this.registryFile)) {
            return { workers: [] };
        }

        return JSON.parse(
            fs.readFileSync(this.registryFile, "utf8")
        ) as Registry;
    }

    private write(registry: Registry): void {
        fs.writeFileSync(
            this.registryFile,
            JSON.stringify(registry, null, 4)
        );
    }

    add(pid: number): void {
        const registry = this.read();

        registry.workers.push({
            pid,
            startedAt: new Date().toISOString(),
        });

        this.write(registry);
    }

    getAll(): WorkerInfo[] {
        return this.read().workers;
    }

    clear(): void {
        this.write({
            workers: [],
        });
    }
}