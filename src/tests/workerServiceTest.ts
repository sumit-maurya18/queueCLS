import { JobRepository } from "../repository/JobRepository";
import { Job } from "../models/Job";

const repository = new JobRepository();

console.log("==================================");
console.log("WORKER ENGINE TEST");
console.log("==================================");

const id = `worker-test-${Date.now()}`;
const timestamp = new Date().toISOString();

const job: Job = {
    id,
    command: "echo Worker Test",
    state: "pending",
    attempts: 0,
    max_retries: 3,
    last_error: null,
    exit_code: null,
    next_retry_at: null,
    locked_by: null,
    locked_at: null,
    created_at: timestamp,
    updated_at: timestamp
};

repository.create(job);

console.log("\nTest 1 - Pending Job");
console.log(repository.findById(id));

const locked = repository.lockJob(
    id,
    "test-worker"
);

console.log("\nTest 2 - Job Lock");
console.log("Locked:", locked);

repository.incrementAttempts(id);

console.log("\nTest 3 - Running Job");
console.log(repository.findById(id));

repository.updateJobResult(
    id,
    "completed",
    0,
    null,
    null
);

console.log("\nTest 4 - Completed Job");
console.log(repository.findById(id));

repository.delete(id);

console.log("\n==================================");
console.log("WORKER ENGINE TEST FINISHED");
console.log("==================================");