# QueueCTL CLI Usage Guide

This document explains how to use QueueCTL through the command-line interface.

Run all commands from the project root.

## Command Format

```bash
npm run dev -- <command> [options]
```

## Available Commands

| Command | Purpose | Parameters |
|---|---|---|
| `enqueue` | Add a new job to the queue | Job ID, command, optional max retries |
| `status` | View a specific job | Job ID |
| `list` | List jobs | Optional state filter |
| `delete` | Delete a job | Job ID |
| `worker` | Start processing jobs | Optional concurrency |
| `config` | View configuration | None |
| `config set` | Change configuration | Configuration key and value |

To see the exact options for any command:

```bash
npm run dev -- <command> --help
```

---

# 1. View CLI Help

Display all available commands:

```bash
npm run dev -- --help
```

Display help for a specific command:

```bash
npm run dev -- enqueue --help
```

---

# 2. View Configuration

Display the current QueueCTL configuration:

```bash
npm run dev -- config
```

The main configuration values are:

```text
default_max_retries
base_retry_delay_ms
worker_concurrency
poll_interval_ms
```

---

# 3. Change Configuration

Syntax:

```bash
npm run dev -- config set <key> <value>
```

Examples:

```bash
npm run dev -- config set default_max_retries 3
```

```bash
npm run dev -- config set base_retry_delay_ms 1000
```

```bash
npm run dev -- config set worker_concurrency 3
```

```bash
npm run dev -- config set poll_interval_ms 500
```

Verify the changes:

```bash
npm run dev -- config
```

---

# 4. Enqueue a Job

Use `enqueue` to add a command to the queue.

Required parameters:

```text
Job ID   → Unique identifier for the job
Command  → Operating-system command to execute
```

An optional maximum retry value can override the configured default if supported by the command.

Check the exact syntax:

```bash
npm run dev -- enqueue --help
```

Example job:

```text
ID: demo-job
Command: echo Hello QueueCTL
```

After enqueueing, the job starts in:

```text
pending
```

The command is not executed until a worker processes it.

---

# 5. View Job Status

Use `status` to inspect a job.

Required parameter:

```text
Job ID
```

Check the exact syntax:

```bash
npm run dev -- status --help
```

Example:

```text
demo-job
```

Before worker execution, the job should show:

```text
State: pending
Attempts: 0
```

After successful execution:

```text
State: completed
Attempts: 1
Exit Code: 0
```

---

# 6. List Jobs

Use `list` to display jobs stored in QueueCTL.

```bash
npm run dev -- list
```

If state filtering is supported, check:

```bash
npm run dev -- list --help
```

Possible job states are:

```text
pending
running
retry_wait
completed
dlq
```

---

# 7. Start a Worker

The worker processes pending jobs.

Open another terminal in the project directory and run:

```bash
npm run dev -- worker
```

The worker continuously checks for available jobs.

A successful job follows:

```text
pending → running → completed
```

For example, enqueue a job containing:

```text
echo Hello QueueCTL
```

Start the worker.

The worker claims and executes the job.

Check the job status afterward.

Expected:

```text
State: completed
Attempts: 1
Exit Code: 0
```

---

# 8. Run Multiple Jobs

Enqueue multiple jobs with unique IDs.

Example:

```text
job-1 → echo First
job-2 → echo Second
job-3 → echo Third
```

Start the worker:

```bash
npm run dev -- worker
```

If:

```text
worker_concurrency = 3
```

the worker can process up to three jobs concurrently.

After successful execution:

```text
job-1 → completed
job-2 → completed
job-3 → completed
```

---

# 9. Test Retry Behavior

Configure a short retry delay:

```bash
npm run dev -- config set default_max_retries 3
```

```bash
npm run dev -- config set base_retry_delay_ms 1000
```

Enqueue a command that always fails.

Start the worker:

```bash
npm run dev -- worker
```

The job lifecycle becomes:

```text
pending
   ↓
running
   ↓
retry_wait
   ↓
pending
   ↓
running
```

Each execution increases:

```text
attempts
```

The next retry time is stored in:

```text
next_retry_at
```

---

# 10. Test Dead Letter Queue

Keep a permanently failing job running with:

```text
default_max_retries = 3
```

After the allowed attempts are exhausted, the job moves to:

```text
dlq
```

The final status should contain information similar to:

```text
State: dlq
Attempts: 3
Last Error: <execution error>
Exit Code: <non-zero exit code>
```

The worker will no longer automatically retry the job.

---

# 11. Delete a Job

Use `delete` to permanently remove a job.

Required parameter:

```text
Job ID
```

Check the exact syntax:

```bash
npm run dev -- delete --help
```

After deletion, querying the same job ID should report that the job does not exist.

---

# 12. Stop the Worker

Press:

```text
Ctrl + C
```

The worker stops accepting new jobs.

If jobs are currently running, QueueCTL waits for active jobs to finish before stopping.

---

# Quick Demonstration

An evaluator can verify the application using this sequence:

```bash
npm install
npm run build
npm test
npm run dev -- config
```

Configure the queue:

```bash
npm run dev -- config set default_max_retries 3
npm run dev -- config set base_retry_delay_ms 1000
npm run dev -- config set worker_concurrency 3
npm run dev -- config set poll_interval_ms 500
```

Then:

```text
1. Enqueue a successful job.
2. Check its status → pending.
3. Start the worker.
4. Check its status → completed.
5. Enqueue multiple jobs to test concurrency.
6. Enqueue a failing job to observe retry_wait.
7. Allow it to exhaust its attempts to observe dlq.
8. Use list to inspect all jobs.
9. Use delete to remove a job.
10. Press Ctrl + C to stop the worker.
```

The complete job lifecycle is:

```text
Successful Job:

pending → running → completed


Retryable Failure:

pending → running → retry_wait → pending → running


Permanent Failure:

pending → running → retry_wait → ... → running → dlq
```

For exact command arguments and options supported by the current version:

```bash
npm run dev -- <command> --help
```