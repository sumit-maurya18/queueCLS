# QueueCTL CLI Usage Guide

This document explains how to use QueueCTL through the command-line interface.

Run all commands from the project root.

## Command Format

```bash
queuectl <command> [options]
```

## Available Commands

| Command | Purpose | Parameters |
|---|---|---|
| `enqueue` | Add a new job to the queue | Job JSON |
| `status` | View queue status | None |
| `list` | List jobs | Optional state filter |
| `delete` | Delete a job | Job ID |
| `worker start` | Start worker processes | Worker count |
| `worker stop` | Stop all workers | None |
| `dlq list` | List jobs in the Dead Letter Queue | None |
| `dlq retry` | Retry a job from the Dead Letter Queue | Job ID |
| `config get` | View configuration | Configuration key |
| `config set` | Change configuration | Configuration key and value |

To see the exact options for any command:

```bash
queuectl <command> --help
```

---

# 1. View CLI Help

Display all available commands:

```bash
queuectl --help
```

Display help for a specific command:

```bash
queuectl enqueue --help
```

---

# 2. View Configuration

Display the current QueueCTL configuration:

```bash
queuectl config get max-retries
```

---

# 3. Change Configuration

Set the maximum retry count:

```bash
queuectl config set max-retries 3
```

Verify the change:

```bash
queuectl config get max-retries
```

---

# 4. Enqueue a Job

Use `enqueue` to add a command to the queue.

Example:

```bash
queuectl enqueue '{"id":"demo-job","command":"echo Hello QueueCTL"}'
```

After enqueueing, the job starts in:

```text
pending
```

The command is not executed until a worker processes it.

---

# 5. View Queue Status

Display the current queue status:

```bash
queuectl status
```

---

# 6. List Jobs

Display all jobs:

```bash
queuectl list
```

Filter by state if required:

```bash
queuectl list --state pending
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

# 7. Start Workers

The worker processes pending jobs.

Open another terminal and run:

```bash
queuectl worker start --count 3
```

A successful job follows:

```text
pending → running → completed
```

---

# 8. Run Multiple Jobs

Enqueue multiple jobs.

Example:

```text
job-1 → echo First
job-2 → echo Second
job-3 → echo Third
```

Start three workers:

```bash
queuectl worker start --count 3
```

The jobs should complete concurrently.

---

# 9. Test Retry Behavior

Configure retries:

```bash
queuectl config set max-retries 3
```

Enqueue a command that always fails.

Start a worker:

```bash
queuectl worker start --count 1
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

---

# 10. Test Dead Letter Queue

After the retry limit is exhausted, the job moves to:

```text
dlq
```

View DLQ jobs:

```bash
queuectl dlq list
```

Retry a DLQ job:

```bash
queuectl dlq retry demo-job
```

---

# 11. Delete a Job

Delete a job:

```bash
queuectl delete --help
```

After deletion, querying the same job ID should report that the job does not exist.

---

# 12. Stop Workers

Stop all running workers:

```bash
queuectl worker stop
```

Workers finish active jobs before shutting down.

---

# Quick Demonstration

```bash
npm install
npm run build
npm test

queuectl config set max-retries 3

queuectl enqueue '{"id":"job1","command":"echo Hello QueueCTL"}'

queuectl worker start --count 3

queuectl status

queuectl list

queuectl enqueue '{"id":"fail1","command":"invalid_command"}'

queuectl dlq list

queuectl dlq retry fail1

queuectl delete job1

queuectl worker stop
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
queuectl <command> --help
```