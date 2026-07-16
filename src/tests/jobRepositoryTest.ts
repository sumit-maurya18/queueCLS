import { JobRepository } from "../repository/JobRepository";
import { Job } from "../models/Job";

const repository = new JobRepository();

console.log("==================================");
console.log("JOB REPOSITORY TEST");
console.log("==================================");

const id = `job-${Date.now()}`;

const job: Job = {
    id,
    command: "echo Hello QueueCTL",
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

console.log("\nCreating Job...");
repository.create(job);

console.log("\nChecking Exists...");
console.log(repository.exists(id));

console.log("\nFinding By ID...");
console.log(repository.findById(id));

console.log("\nFinding Pending Jobs...");
console.log(repository.findByState("pending"));

console.log("\nUpdating Job...");

job.state = "completed";
job.updated_at = new Date().toISOString();

repository.update(job);

console.log(repository.findById(id));

console.log("\nDeleting Job...");
repository.delete(id);

console.log("\nChecking Exists After Delete...");
console.log(repository.exists(id));

console.log("\nAll Jobs...");
console.log(repository.findAll());

console.log("\n==================================");
console.log("TEST FINISHED");
console.log("==================================");