import { JobRepository } from "../repository/JobRepository";
import { Job } from "../models/Job";

const repository = new JobRepository();

console.log("==================================");
console.log("WORKER POOL TEST");
console.log("==================================");

const timestamp = new Date().toISOString();

const jobIds = [
    `pool-test-${Date.now()}-1`,
    `pool-test-${Date.now()}-2`,
    `pool-test-${Date.now()}-3`,
    `pool-test-${Date.now()}-4`
];

console.log("\nTest 1 - Creating Pending Jobs");

for (const id of jobIds) {
    const job: Job = {
        id,
        command: "powershell -Command Start-Sleep -Seconds 2",
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
}

console.log(`Created ${jobIds.length} pending jobs.`);

console.log("\nTest 2 - Verify Pending Jobs");

for (const id of jobIds) {
    const job = repository.findById(id);

    console.log(
        `${id}: state=${job?.state}, attempts=${job?.attempts}`
    );
}

console.log("\nTest 3 - Atomic Locking");

const firstJobId = jobIds[0];

const firstLock = repository.lockJob(
    firstJobId,
    "test-worker-1"
);

const secondLock = repository.lockJob(
    firstJobId,
    "test-worker-2"
);

console.log("First worker acquired lock:", firstLock);
console.log("Second worker acquired lock:", secondLock);

if (firstLock !== true) {
    throw new Error(
        "TEST FAILED: First worker should acquire the lock."
    );
}

if (secondLock !== false) {
    throw new Error(
        "TEST FAILED: Second worker should not acquire the same job."
    );
}

console.log("\nAtomic locking verified.");

console.log("\nTest 4 - Verify Locked Job");

const lockedJob = repository.findById(firstJobId);

console.log(lockedJob);

if (lockedJob?.state !== "running") {
    throw new Error(
        "TEST FAILED: Locked job should be running."
    );
}

if (lockedJob?.locked_by !== "test-worker-1") {
    throw new Error(
        "TEST FAILED: Job has incorrect worker lock."
    );
}

console.log("\nTest 5 - Complete Locked Job");

repository.incrementAttempts(firstJobId);

repository.updateJobResult(
    firstJobId,
    "completed",
    0,
    null,
    null
);

const completedJob = repository.findById(firstJobId);

console.log(completedJob);

if (completedJob?.state !== "completed") {
    throw new Error(
        "TEST FAILED: Job should be completed."
    );
}

if (completedJob?.attempts !== 1) {
    throw new Error(
        "TEST FAILED: Job attempts should equal 1."
    );
}

if (
    completedJob?.locked_by !== null ||
    completedJob?.locked_at !== null
) {
    throw new Error(
        "TEST FAILED: Job lock should be released."
    );
}

console.log("\nTest 6 - Cleanup");

for (const id of jobIds) {
    repository.delete(id);
}

console.log("Test jobs deleted.");

console.log("\n==================================");
console.log("WORKER POOL TEST PASSED");
console.log("==================================");