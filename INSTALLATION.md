# QueueCTL — Installation and Setup Guide

This guide explains how to install, build, and run QueueCTL on a clean system.

QueueCTL is designed to require minimal external configuration. It uses SQLite as its persistent database, so no separate database server is required.

---

# 1. Prerequisites

Install the following software before running QueueCTL:

- Node.js
- npm
- Git

Verify the installations:

```bash
node --version
npm --version
git --version
```

---

# 2. Clone the Repository

Clone the QueueCTL repository:

```bash
git clone <repository-url>
```

Move into the project directory:

```bash
cd queuectl
```

---

# 3. Install Dependencies

Install all project dependencies:

```bash
npm install
```

The dependencies required by QueueCTL are defined in:

```text
package.json
package-lock.json
```

The `node_modules` directory is generated automatically and is not stored in Git.

No individual dependency installation should be required.

---

# 4. Build the Project

Compile the TypeScript source code:

```bash
npm run build
```

A successful build confirms that the TypeScript source compiles correctly.

Generated build output is not stored in Git and can be recreated from the source code.

---

# 5. Database Setup

QueueCTL uses SQLite for persistent storage.

No PostgreSQL, MySQL, MongoDB, Redis, or other external database service is required.

The application database is initialized by the QueueCTL database layer.

Required tables and default configuration are created automatically when the application initializes.

The evaluator does not need to manually execute SQL scripts.

The expected initialization flow is:

```text
Start QueueCTL
      │
      ▼
Open SQLite Database
      │
      ▼
Database Missing?
      │
      ├── Yes ──► Create Database
      │
      └── No ───► Use Existing Database
      │
      ▼
Ensure Required Tables
      │
      ▼
Ensure Default Configuration
      │
      ▼
QueueCTL Ready
```

Runtime SQLite database files are intentionally excluded from Git.

This ensures that every new installation starts with clean runtime state.

---

# 6. Quick Setup

For a fresh clone, the primary setup sequence is:

```bash
git clone <repository-url>
cd queuectl
npm install
npm run build
```

After this, QueueCTL is ready to run.

---

# 7. Running QueueCTL in Development Mode

QueueCTL commands can be executed through the development script.

General format:

```bash
npm run dev -- <command>
```

For example:

```bash
npm run dev -- config
```

This displays the current QueueCTL configuration.

---

# 8. Verify Configuration

Run:

```bash
npm run dev -- config
```

The command should display the current configuration values.

Typical configuration keys include:

```text
default_max_retries
base_retry_delay_ms
worker_concurrency
poll_interval_ms
```

This confirms that:

- QueueCTL starts successfully
- SQLite is accessible
- Database initialization succeeded
- Configuration initialization succeeded

---

# 9. Enqueue a Job

Use the QueueCTL enqueue command to create a job.

Refer to:

```text
docs/CLI.md
```

for the exact command syntax and supported options.

After enqueueing, the job should initially have the state:

```text
pending
```

The job remains persisted in SQLite until processed by a worker.

---

# 10. Start a Worker

Start the QueueCTL worker using the worker command documented in:

```text
docs/CLI.md
```

The worker will:

1. Start polling the queue.
2. Process eligible retries.
3. Find pending jobs.
4. Atomically claim available jobs.
5. Execute commands.
6. Record execution results.
7. Retry failed jobs when applicable.
8. Move exhausted jobs to the DLQ.

The worker continues polling until it is stopped.

---

# 11. Stopping a Worker

A running worker can be stopped using:

```text
Ctrl + C
```

QueueCTL handles the interrupt signal and begins graceful shutdown.

The worker stops claiming new jobs and allows active jobs to complete before exiting normally.

---

# 12. Running Automated Tests

Run the complete automated test suite:

```bash
npm test
```

The automated tests are stored under:

```text
tests/
├── helpers/
├── unit/
├── integration/
└── regression/
```

The test suite is independent of the manual development tests.

Detailed testing instructions are available in:

```text
docs/TESTING.md
```

---

# 13. Running a Specific Test File

A specific Vitest file can be executed using:

```bash
npx vitest run <test-file>
```

Example:

```bash
npx vitest run tests/unit/queueService.test.ts
```

This is useful when validating a specific component.

---

# 14. Verify TypeScript Compilation

At any time, verify that the project compiles using:

```bash
npm run build
```

The command should complete without TypeScript compilation errors.

---

# 15. Recommended Verification Sequence

After installing QueueCTL on a clean system, use the following verification sequence:

```text
1. Install dependencies
        │
        ▼
2. Build project
        │
        ▼
3. Read configuration
        │
        ▼
4. Run automated tests
        │
        ▼
5. Enqueue test job
        │
        ▼
6. Start worker
        │
        ▼
7. Verify job completion
```

Commands:

```bash
npm install
npm run build
npm run dev -- config
npm test
```

After these commands succeed, use the CLI workflow documented in `docs/CLI.md` to enqueue and process a test job.

---

# 16. Project Documentation

QueueCTL documentation is divided by responsibility.

```text
README.md
    Project overview and quick start

DESIGN.md
    System architecture and technical design

INSTALLATION.md
    Installation and environment setup

docs/CLI.md
    Complete CLI command reference

docs/TESTING.md
    Manual and automated testing procedures
```

For architectural details, refer to:

```text
DESIGN.md
```

For command syntax, refer to:

```text
docs/CLI.md
```

For complete verification procedures, refer to:

```text
docs/TESTING.md
```

---

# 17. Reproducibility

QueueCTL is designed so generated artifacts do not need to be committed to the repository.

The following are reconstructed locally:

```text
node_modules/
build output
runtime SQLite database
test SQLite databases
coverage output
```

The repository contains the source files and dependency metadata required to recreate the environment.

The expected reproducibility model is:

```text
Git Repository
      │
      ▼
npm install
      │
      ▼
Dependencies Installed
      │
      ▼
npm run build
      │
      ▼
Application Compiled
      │
      ▼
Run QueueCTL
      │
      ▼
SQLite Initialized
      │
      ▼
Ready
```

---

# 18. Clean Installation Checklist

A clean installation is successful when all of the following conditions are satisfied:

- Node.js is installed
- npm is installed
- Git is installed
- Repository clones successfully
- `npm install` completes successfully
- `npm run build` completes without errors
- QueueCTL initializes its SQLite database
- `npm run dev -- config` displays configuration
- `npm test` passes
- Jobs can be enqueued
- Workers can process jobs
- Successful jobs reach `completed`
- Failed jobs follow retry behavior
- Exhausted jobs reach `dlq`

No external database or message broker should be required.

---

# 19. Minimal Evaluator Setup

The minimal installation flow is:

```bash
git clone <repository-url>
cd queuectl
npm install
npm run build
npm test
```

The application can then be used through:

```bash
npm run dev -- <command>
```

All required Node.js dependencies are installed through `npm install`.

SQLite persistence is managed internally by QueueCTL.

No manual database configuration is required.