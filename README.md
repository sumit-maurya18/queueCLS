# QueueCTL

## 🎥 Demo Video

**Demo Link:** [Demo Video Link](https://drive.google.com/file/d/1rtQ1UHGhReffhwHfh9oQgc_iU8abVDDO/view?usp=drive_link)

---

A persistent command-line job queue and worker execution system built with Node.js, TypeScript, and SQLite.

QueueCTL allows commands to be submitted as background jobs, persisted locally, and processed asynchronously by configurable workers. It implements core job-processing concepts including atomic job claiming, concurrent execution, automatic retries with exponential backoff, Dead Letter Queue handling, persistent configuration, and graceful worker shutdown.

The project is designed to demonstrate the internal architecture and reliability mechanisms behind a background job-processing system without requiring external infrastructure such as Redis, RabbitMQ, Kafka, or a separate database server.

---

## Features

- Persistent SQLite-backed job queue
- Command-line interface for queue management
- Asynchronous background workers
- Configurable worker concurrency
- Atomic job claiming
- Multiple-worker coordination
- Execution attempt tracking
- Automatic failure retries
- Exponential retry backoff
- Dead Letter Queue (DLQ)
- Persistent runtime configuration
- Job status inspection
- Graceful worker shutdown
- Unit, integration, and regression tests
- Isolated automated test database
- Zero external database or message broker dependencies

---

## Architecture

QueueCTL uses a layered architecture with clear separation between CLI interaction, application logic, persistence, and execution.

```text
                    ┌───────────────┐
                    │      CLI      │
                    └───────┬───────┘
                            │
                            ▼
                   Application Layer
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
      QueueService    WorkerService   ConfigService
                            │
                            ▼
                       RetryService
                            │
                            ▼
                      JobRepository
                            │
                            ▼
                         SQLite
```

A job normally moves through the following lifecycle:

```text
Successful Job

pending → running → completed
```

Failed jobs with remaining attempts are scheduled for retry:

```text
pending → running → retry_wait → pending → running
```

Jobs that exhaust their configured attempt limit are moved to the Dead Letter Queue:

```text
pending → running → retry_wait → ... → running → dlq
```

Workers coordinate through atomic database state transitions, preventing multiple workers from simultaneously claiming the same pending job through the normal claim operation.

For the complete architecture, state machine, concurrency model, retry design, and engineering trade-offs, see [`DESIGN.md`](./DESIGN.md).

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Application runtime |
| TypeScript | Type-safe application development |
| SQLite | Persistent job and configuration storage |
| better-sqlite3 | SQLite database driver |
| Commander.js | Command-line interface |
| Node.js `child_process` | Command execution |
| Vitest | Automated testing |
| npm | Dependency management |

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd queuectl
```

### 2. Install Dependencies

```bash
npm install
```

All required Node.js dependencies are installed from `package.json` and `package-lock.json`.

No separate database installation is required.

### 3. Build the Project

```bash
npm run build
```

### 4. Verify the CLI

```bash
queuectl --help
```

### 5. Verify Configuration

```bash
queuectl config get max-retries
```

QueueCTL automatically initializes the required SQLite database and default configuration on first run.

---

## CLI Usage

QueueCTL provides a command-line interface for managing jobs, workers, configuration, and the Dead Letter Queue.

Display all available commands:

```bash
queuectl --help
```

Display help for worker commands:

```bash
queuectl worker --help
```

### Core Commands

| Command | Description |
|----------|-------------|
| `queuectl enqueue '{"id":"job1","command":"sleep 2"}'` | Enqueue a new background job |
| `queuectl worker start --count 3` | Start worker processes |
| `queuectl worker stop` | Gracefully stop all workers |
| `queuectl status` | Show queue statistics |
| `queuectl list` | List all jobs |
| `queuectl list --state pending` | List jobs by state |
| `queuectl dlq list` | View Dead Letter Queue |
| `queuectl dlq retry <job-id>` | Retry a job from the Dead Letter Queue |
| `queuectl config get max-retries` | View configuration |
| `queuectl config set max-retries 3` | Update configuration |

For more examples, see **docs/CLI.md**.

## Configuration

QueueCTL stores operational configuration persistently in SQLite.

The primary configuration values are:

| Configuration | Purpose |
|---|---|
| `default_max_retries` | Default execution attempt/retry policy |
| `base_retry_delay_ms` | Base delay used for retry backoff |
| `worker_concurrency` | Maximum concurrent jobs processed by a worker |
| `poll_interval_ms` | Delay between worker polling cycles |

View configuration:

```bash
queuectl config get max-retries
```

Update configuration:

```bash
queuectl config set max-retries 3
```

Configuration persists across normal application restarts.

---

## Worker Processing

Workers are responsible for executing queued commands.

The high-level processing loop is:

```text
Worker Starts
      │
      ▼
Process Eligible Retries
      │
      ▼
Find Pending Job
      │
      ▼
Atomic Job Claim
      │
      ▼
Increment Attempts
      │
      ▼
Execute Command
      │
      ├──────── Success ────────► completed
      │
      └──────── Failure
                    │
                    ▼
                RetryService
                    │
             ┌──────┴──────┐
             │             │
             ▼             ▼
        retry_wait          dlq
```

Worker behavior is controlled by persistent configuration.

Multiple worker processes can operate against the same SQLite queue. Job claiming uses conditional database updates so that only one worker can successfully claim a specific pending job.

---

## Reliability Model

QueueCTL implements several mechanisms for reliable background processing.

### Persistent State

Jobs and configuration are stored in SQLite and survive normal process restarts.

### Atomic Job Claiming

A pending job must be atomically transitioned to `running` before execution.

This prevents concurrent workers from successfully claiming the same pending job.

### Retry Handling

Failed jobs with remaining attempts transition to `retry_wait`.

When `next_retry_at` becomes eligible, the job returns to `pending`.

### Exponential Backoff

Retry delays increase after repeated failures, preventing permanently failing commands from executing continuously in a tight retry loop.

### Dead Letter Queue

Jobs that exhaust their configured attempt limit transition to `dlq`.

The failure information remains persisted for inspection.

### Graceful Shutdown

When a worker receives a shutdown request, it stops accepting new work and allows active jobs to finish before exiting normally.

> QueueCTL provides atomic job claiming but does not claim universal exactly-once side-effect execution. A process crash between external command execution and persistence of the final result can create ambiguity. See `DESIGN.md` for the detailed delivery-semantics discussion.

---

## Testing

QueueCTL includes a separate automated test suite covering unit, integration, and regression behavior.

```text
tests/
├── helpers/
├── unit/
├── integration/
└── regression/
```

Run the complete automated test suite:

```bash
npm test
```

Run a specific test:

```bash
npx vitest run <test-file>
```

Example:

```bash
npx vitest run tests/unit/jobRepository.test.ts
```

The automated tests cover areas including:

- Database isolation
- Repository operations
- Queue operations
- Configuration
- Retry behavior
- Exponential backoff
- Worker execution
- Concurrency
- Duplicate claim prevention
- Retry and DLQ lifecycle
- End-to-end regression behavior

Automated tests use isolated database state and do not depend on normal QueueCTL runtime data.

For complete testing instructions, see [`docs/TESTING.md`](./docs/TESTING.md).

---

## Project Structure

```text
queuectl/
├── src/
│   ├── cli/
│   │   └── commands/
│   ├── database/
│   ├── models/
│   ├── queue/
│   ├── repository/
│   ├── services/
│   └── main.ts
│
├── tests/
│   ├── helpers/
│   ├── unit/
│   ├── integration/
│   └── regression/
│
├── docs/
│   ├── CLI.md
│   └── TESTING.md
│
├── DESIGN.md
├── INSTALLATION.md
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
└── vitest.config.ts
```

The architecture separates responsibilities as follows:

```text
CLI
    User-facing commands

QueueService
    Queue business operations

JobRepository
    Persistent job access

WorkerService
    Job discovery and command execution

RetryService
    Failure handling and retry policy

ConfigService
    Persistent operational configuration

SQLite
    Job persistence and worker coordination
```

---

## Documentation

| Document | Purpose |
|---|---|
| [`README.md`](./README.md) | Project overview and quick start |
| [`INSTALLATION.md`](./INSTALLATION.md) | Installation and environment setup |
| [`DESIGN.md`](./DESIGN.md) | Architecture, internals, state machine, and design decisions |
| [`docs/CLI.md`](./docs/CLI.md) | CLI usage and application demonstration |
| [`docs/TESTING.md`](./docs/TESTING.md) | Manual and automated testing guide |

---

## Quick Verification

For a clean installation, the core verification sequence is:

```bash
npm install
npm run build
npm test
npm run dev -- --help
npm run dev -- config
```

After these commands succeed:

1. Enqueue a job.
2. Verify that it enters the `pending` state.
3. Start a worker.
4. Verify successful transition to `completed`.
5. Submit multiple jobs to verify concurrency.
6. Submit a failing job to observe retry behavior.
7. Allow retries to exhaust to verify the `dlq` state.

The complete CLI demonstration is available in [`docs/CLI.md`](./docs/CLI.md).

---

## Design Scope

QueueCTL is intentionally designed as a self-contained persistent command queue.

It demonstrates the foundational mechanisms used by background job-processing systems while keeping infrastructure requirements minimal.

The current architecture prioritizes:

- Correct state transitions
- Persistent queue state
- Safe job claiming
- Controlled concurrency
- Failure recovery
- Retry isolation
- Testability
- Reproducibility
- Clear architectural boundaries