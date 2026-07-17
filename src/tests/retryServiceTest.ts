import { JobRepository } from "../repository/JobRepository";
import { RetryService } from "../services/RetryService";
import { Job } from "../models/Job";

const repository = new JobRepository();
const retryService = new RetryService();

console.log("==================================");
console.log("RETRY SERVICE TEST");
console.log("==================================");

const id = `retry-test-${Date.now()}`;
const timestamp = new Date().toISOString();

const job: Job = {
    id,
    command: "invalid_command",
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

console.log("\nTest 1 - First Failure");

retryService.handleFailure(
    job,
    1,
    "Test failure 1"
);

let updatedJob = repository.findById(id);

console.log(updatedJob);

console.log("\nTest 2 - Second Failure");

if (updatedJob) {
    updatedJob.attempts = 1;

    retryService.handleFailure(
        updatedJob,
        1,
        "Test failure 2"
    );
}

updatedJob = repository.findById(id);

console.log(updatedJob);

console.log("\nTest 3 - Maximum Attempts");

if (updatedJob) {
    updatedJob.attempts = 2;

    retryService.handleFailure(
        updatedJob,
        1,
        "Test failure 3"
    );
}

updatedJob = repository.findById(id);

console.log(updatedJob);

console.log("\nTest 4 - DLQ Verification");

const dlqJobs = repository.findDLQJobs();

console.log(
    "Found in DLQ:",
    dlqJobs.some((dlqJob) => dlqJob.id === id)
);

repository.delete(id);

console.log("\n==================================");
console.log("RETRY SERVICE TEST FINISHED");
console.log("==================================");