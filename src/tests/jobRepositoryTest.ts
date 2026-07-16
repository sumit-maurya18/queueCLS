import { JobRepository } from "../repository/JobRepository";
import { Job } from "../models/Job";

const repository = new JobRepository();

const job: Job = {
    id: "job-1",
    command: "echo Hello World",
    state: "pending",
    attempts: 0,
    max_retries: 3,
    last_error: null,
    next_retry_at: null,
    locked_by: null,
    locked_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

console.log("========== Repository Test ==========\n");

// Create
console.log("Creating Job...");
repository.create(job);
console.log("Job Created\n");

// Exists
console.log("Checking Exists...");
console.log(repository.exists("job-1"));
console.log();

// Find By ID
console.log("Finding By ID...");
console.log(repository.findById("job-1"));
console.log();

// Find All
console.log("Finding All Jobs...");
console.log(repository.findAll());
console.log();

console.log("========== Test Completed ==========");