# QueueCTL — System Design and Architecture

## 1. Introduction

QueueCTL is a persistent command-line job queue system built with Node.js and TypeScript.

It allows users to submit operating-system commands as jobs, persist them in a local SQLite database, process them asynchronously using background workers, retry failed jobs with exponential backoff, and move permanently failed jobs into a Dead Letter Queue (DLQ).

QueueCTL is designed as a self-contained local queue system. It does not require an external message broker or database server. The system uses SQLite for persistence and exposes its functionality through a command-line interface.

The project demonstrates several backend and distributed-systems concepts in a compact environment:

- Persistent job queues
- Background job processing
- Worker polling
- Concurrent job execution
- Atomic job claiming
- Retry scheduling
- Exponential backoff
- Dead Letter Queues
- Persistent runtime configuration
- Process execution and exit-code tracking
- Graceful worker shutdown
- Layered architecture
- Repository pattern
- Automated unit testing
- Integration testing
- Regression testing

---

# 2. Problem Statement

Applications frequently need to execute work asynchronously instead of blocking the main application flow.

Examples include:

- Running scripts
- Processing files
- Sending notifications
- Executing scheduled operations
- Performing background computations
- Running maintenance tasks

Executing these tasks directly introduces several problems.

A command may fail.

A process may terminate unexpectedly.

Multiple workers may attempt to process the same task.

A failed task may need to be retried.

Repeatedly failing tasks should not retry indefinitely.

Worker concurrency must be controlled.

Job state must survive application restarts.

QueueCTL addresses these problems using a persistent job queue with controlled worker execution.

---

# 3. Design Goals

QueueCTL was designed around the following primary goals.

## 3.1 Persistence

Jobs must survive process termination and application restarts.

All important job information is stored in SQLite rather than only being held in application memory.

Persistent information includes:

- Job ID
- Command
- Current state
- Attempt count
- Maximum retry count
- Last execution error
- Exit code
- Next retry timestamp
- Worker lock information
- Creation timestamp
- Update timestamp

This allows QueueCTL to recover queue state after restarting.

---

## 3.2 Reliability

Every job must have a deterministic lifecycle.

A job cannot simply disappear after being submitted.

The system records whether a job is:

- Waiting for execution
- Currently executing
- Waiting for retry
- Successfully completed
- Permanently failed

Execution failures are persisted along with diagnostic information.

---

## 3.3 Safe Job Claiming

Multiple workers may attempt to process jobs simultaneously.

The system must guarantee that two workers do not normally execute the same pending job at the same time.

QueueCTL achieves this using atomic database-level job locking.

---

## 3.4 Controlled Concurrency

Workers should be capable of executing multiple jobs concurrently.

However, unlimited concurrency can exhaust system resources.

QueueCTL therefore enforces a configurable worker concurrency limit.

---

## 3.5 Failure Recovery

A failed command should not necessarily be treated as permanently failed.

QueueCTL allows failed jobs to be retried automatically.

Retry behavior is controlled by:

- Current attempt count
- Maximum retry limit
- Base retry delay
- Exponential backoff

---

## 3.6 Dead Letter Queue

A job that repeatedly fails should eventually stop consuming worker resources.

When the maximum number of execution attempts is reached, the job transitions to the Dead Letter Queue.

The failed job remains stored for inspection.

---

## 3.7 Configurability

Operational parameters should not be scattered as hardcoded constants throughout the application.

QueueCTL therefore provides persistent runtime configuration.

Important configurable values include:

- Worker concurrency
- Worker polling interval
- Base retry delay
- Default maximum retries

---

## 3.8 Testability

The architecture separates:

- CLI handling
- Queue business logic
- Worker execution
- Retry logic
- Configuration management
- Database access

This separation makes components independently testable.

QueueCTL includes:

- Unit tests
- Integration tests
- Regression tests
- Separate manual tests

---

# 4. Technology Stack

QueueCTL uses the following core technologies.

| Technology | Responsibility |
|---|---|
| Node.js | Runtime environment |
| TypeScript | Application language and static type safety |
| SQLite | Persistent local database |
| better-sqlite3 | Synchronous SQLite database access |
| Commander.js | Command-line interface |
| Node.js `child_process` | Operating-system command execution |
| Vitest | Automated testing |
| npm | Dependency and script management |

The architecture intentionally avoids requiring an external database server or message broker.

---

# 5. High-Level Architecture

The QueueCTL architecture consists of several layers.

```text
                        ┌──────────────────────┐
                        │         User         │
                        └──────────┬───────────┘
                                   │
                                   │ CLI Commands
                                   ▼
                        ┌──────────────────────┐
                        │     QueueCTL CLI     │
                        │     Command Layer    │
                        └──────────┬───────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 │                                   │
                 ▼                                   ▼
        ┌──────────────────┐                ┌──────────────────┐
        │   QueueService   │                │  ConfigService   │
        └────────┬─────────┘                └────────┬─────────┘
                 │                                   │
                 │                                   │
                 ▼                                   │
        ┌──────────────────┐                         │
        │  JobRepository   │◄────────────────────────┘
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │      SQLite      │
        │ Persistent Store │
        └──────────────────┘


                        Background Processing

                        ┌──────────────────┐
                        │  WorkerService   │
                        └────────┬─────────┘
                                 │
                                 ▼
                         Process Retries
                                 │
                                 ▼
                       Find Pending Job
                                 │
                                 ▼
                         Atomic Job Lock
                                 │
                                 ▼
                       Increment Attempts
                                 │
                                 ▼
                        Execute Command
                                 │
                       ┌─────────┴─────────┐
                       │                   │
                    Success             Failure
                       │                   │
                       ▼                   ▼
                  completed          RetryService
                                           │
                                  ┌────────┴────────┐
                                  │                 │
                            Attempts Remain    Limit Reached
                                  │                 │
                                  ▼                 ▼
                             retry_wait            dlq
                                  │
                           Retry Time Reached
                                  │
                                  ▼
                               pending
```

---

# 6. Layered Architecture

QueueCTL follows a layered architecture.

```text
┌──────────────────────────────┐
│          CLI Layer           │
├──────────────────────────────┤
│        Service Layer         │
├──────────────────────────────┤
│       Repository Layer       │
├──────────────────────────────┤
│        Database Layer        │
└──────────────────────────────┘
```

Each layer has a distinct responsibility.

This reduces coupling and prevents unrelated concerns from being mixed together.

---

# 7. CLI Layer

The CLI layer is the user-facing entry point.

It is responsible for:

- Parsing commands
- Parsing options and arguments
- Performing CLI-level validation
- Invoking application services
- Formatting results
- Displaying errors

The CLI does not directly implement queue persistence or worker execution logic.

Conceptually:

```text
User Command
     │
     ▼
CLI Parser
     │
     ▼
Command Handler
     │
     ▼
Application Service
```

Example:

```text
enqueue command
      │
      ▼
QueueService.enqueue()
      │
      ▼
JobRepository.create()
      │
      ▼
SQLite
```

This keeps command parsing separate from business logic.

---

# 8. Service Layer

The service layer contains the primary application logic.

The main services are:

```text
QueueService
WorkerService
RetryService
ConfigService
```

Each service has a specialized responsibility.

---

# 9. QueueService

`QueueService` manages queue-level operations.

Its responsibilities include:

- Creating jobs
- Validating job IDs
- Validating commands
- Preventing duplicate job IDs
- Determining maximum retry limits
- Applying configured default retry values
- Allowing explicit retry overrides
- Retrieving individual jobs
- Listing jobs
- Deleting jobs

---

## 9.1 Job Creation

When a job is enqueued:

```text
User
 │
 ▼
enqueue
 │
 ▼
QueueService.enqueue()
 │
 ├── Trim job ID
 ├── Trim command
 ├── Validate job ID
 ├── Validate command
 ├── Check duplicate ID
 ├── Determine max retries
 │
 ▼
Create Job
 │
 ▼
JobRepository
 │
 ▼
SQLite
```

A newly created job begins with values conceptually equivalent to:

```text
state         = pending
attempts      = 0
last_error    = null
exit_code     = null
next_retry_at = null
locked_by     = null
locked_at     = null
```

---

## 9.2 Duplicate Job Prevention

Job IDs are unique.

Before creating a job, QueueCTL verifies whether the requested ID already exists.

Conceptually:

```text
enqueue("job-1")
      │
      ▼
Does job-1 exist?
      │
   ┌──┴──┐
  Yes    No
   │      │
   ▼      ▼
 Error   Create
```

This prevents accidental overwriting of existing jobs.

---

# 10. Job Model

A QueueCTL job contains the following fields:

```text
Job
├── id
├── command
├── state
├── attempts
├── max_retries
├── last_error
├── exit_code
├── next_retry_at
├── locked_by
├── locked_at
├── created_at
└── updated_at
```

---

## 10.1 `id`

Unique identifier for the job.

The ID is used for:

- Job lookup
- Status queries
- Updates
- Deletion
- Worker processing

---

## 10.2 `command`

The operating-system command executed by a worker.

Example:

```text
echo Hello QueueCTL
```

The worker passes this command to the operating system using Node.js process execution functionality.

---

## 10.3 `state`

Represents the current lifecycle state.

Supported lifecycle states include:

```text
pending
running
retry_wait
completed
dlq
```

---

## 10.4 `attempts`

Tracks how many times execution has been attempted.

The attempt count increases when a worker begins processing a claimed job.

---

## 10.5 `max_retries`

Defines the maximum allowed execution attempts before permanent failure handling.

The value may come from:

```text
Explicit enqueue option
        │
        ▼
Use provided value

Otherwise
        │
        ▼
default_max_retries configuration
```

---

## 10.6 `last_error`

Stores diagnostic information from the most recent command failure.

Successful jobs normally contain:

```text
null
```

---

## 10.7 `exit_code`

Stores the command's execution exit code.

Typical successful execution:

```text
0
```

Failed execution normally contains a non-zero value.

---

## 10.8 `next_retry_at`

Stores the timestamp when a failed job becomes eligible for retry.

It is used only while the job is waiting for another execution attempt.

---

## 10.9 `locked_by`

Stores the unique identifier of the worker currently processing the job.

This provides ownership information while the job is running.

---

## 10.10 `locked_at`

Stores the timestamp at which the worker acquired the job.

---

## 10.11 `created_at`

Stores the creation timestamp.

---

## 10.12 `updated_at`

Stores the most recent update timestamp.

---

# 11. Job State Machine

QueueCTL uses a state-based lifecycle.

```text
                         ┌───────────────┐
                         │    pending    │
                         └───────┬───────┘
                                 │
                           Worker Claims
                                 │
                                 ▼
                         ┌───────────────┐
                         │    running    │
                         └───────┬───────┘
                                 │
                     ┌───────────┴───────────┐
                     │                       │
                  Success                  Failure
                     │                       │
                     ▼                       ▼
             ┌───────────────┐       ┌───────────────┐
             │   completed   │       │  Retry Check  │
             └───────────────┘       └───────┬───────┘
                                             │
                                 ┌───────────┴───────────┐
                                 │                       │
                           Attempts Remain          Limit Reached
                                 │                       │
                                 ▼                       ▼
                         ┌───────────────┐       ┌───────────────┐
                         │  retry_wait   │       │      dlq      │
                         └───────┬───────┘       └───────────────┘
                                 │
                          Retry Time Reached
                                 │
                                 ▼
                         ┌───────────────┐
                         │    pending    │
                         └───────────────┘
```

---

# 12. State Definitions

## `pending`

The job is available for a worker to claim.

---

## `running`

A worker has successfully claimed the job and execution is in progress.

---

## `retry_wait`

The previous execution failed, but the job still has retry attempts available.

The job remains unavailable until `next_retry_at` is reached.

---

## `completed`

The command executed successfully.

This is a terminal success state.

---

## `dlq`

The job exhausted its allowed execution attempts.

This is a terminal failure state unless future functionality explicitly requeues the job.

---

# 13. Repository Layer

`JobRepository` isolates database operations from application logic.

Its responsibilities include:

- Creating jobs
- Finding jobs by ID
- Listing jobs
- Finding jobs by state
- Finding the next pending job
- Updating jobs
- Deleting jobs
- Incrementing attempts
- Locking jobs
- Persisting execution results

Architecture:

```text
Service
   │
   ▼
JobRepository
   │
   ▼
SQL
   │
   ▼
SQLite
```

The service layer therefore does not need to directly construct SQL queries.

---

# 14. Atomic Job Locking

Atomic job locking is one of the most important correctness mechanisms in QueueCTL.

Consider two workers:

```text
Worker A                       Worker B
   │                              │
   │ Find pending Job X           │ Find pending Job X
   │                              │
   └──────────────┬───────────────┘
                  │
                  ▼
            Both know Job X
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
      Lock Job X       Lock Job X
          │                │
       SUCCESS            FAIL
          │                │
          ▼                ▼
      Execute X       Find another job
```

The lock operation is conditional.

Conceptually:

```sql
UPDATE jobs
SET
    state = 'running',
    locked_by = ?,
    locked_at = ?
WHERE
    id = ?
    AND state = 'pending';
```

The important condition is:

```sql
AND state = 'pending'
```

Once one worker changes the state to `running`, another worker cannot perform the same transition.

This provides database-level coordination between workers.

---

# 15. WorkerService

`WorkerService` performs background execution.

Each worker receives a unique worker identifier.

The worker maintains:

```text
workerId
concurrency
pollInterval
activeJobs
running
```

---

## 15.1 Worker Startup

When the worker starts:

```text
WorkerService.start()
        │
        ▼
Set running = true
        │
        ▼
Register shutdown handling
        │
        ▼
Start processing loop
```

The worker then begins polling for jobs.

---

## 15.2 Worker Processing Loop

The processing loop behaves conceptually as follows:

```text
processJobs()
      │
      ▼
Is worker running?
      │
      ├── No ──► Return
      │
      ▼
Process eligible retries
      │
      ▼
Is capacity available?
      │
      ├── No ──► Wait
      │
      ▼
Find pending job
      │
      ├── None ──► Schedule next poll
      │
      ▼
Attempt atomic lock
      │
      ├── Failed ──► Search again
      │
      ▼
Increment activeJobs
      │
      ▼
Increment job attempts
      │
      ▼
Execute command
```

---

# 16. Command Execution

The worker executes the stored command through Node.js process execution.

Conceptually:

```text
Job Command
    │
    ▼
child_process execution
    │
    ├───────────────┐
    │               │
 Success          Error
    │               │
    ▼               ▼
exit_code = 0   Capture failure
    │               │
    ▼               ▼
completed       RetryService
```

Successful execution updates the job to:

```text
state      = completed
exit_code  = 0
last_error = null
```

Worker lock information is cleared when execution finishes.

---

# 17. Worker Concurrency

QueueCTL supports concurrent execution within a worker.

The configured concurrency determines the maximum number of active jobs.

Example:

```text
worker_concurrency = 3
```

Execution:

```text
Worker
│
├── Job A ───────── running
│
├── Job B ───────── running
│
├── Job C ───────── running
│
└── Job D ───────── pending
```

The worker tracks:

```text
activeJobs
```

A job can be claimed only while:

```text
activeJobs < concurrency
```

When a job begins:

```text
activeJobs++
```

When execution finishes:

```text
activeJobs--
```

Capacity then becomes available for another job.

---

# 18. Multiple Worker Safety

Worker concurrency and multiple workers are separate concepts.

A single worker may have:

```text
concurrency = 3
```

Multiple worker processes may also run simultaneously.

For example:

```text
Worker A
├── Job 1
├── Job 2
└── Job 3

Worker B
├── Job 4
├── Job 5
└── Job 6
```

Atomic database locking prevents both workers from successfully claiming the same pending job.

Therefore:

```text
Concurrency Control
        +
Atomic Locking
        =
Safe Parallel Processing
```

---

# 19. RetryService

`RetryService` manages failed jobs.

When execution fails, the worker delegates failure handling to the retry service.

Flow:

```text
Command Failure
      │
      ▼
RetryService.handleFailure()
      │
      ▼
Determine Current Attempt
      │
      ▼
Maximum Attempts Reached?
      │
   ┌──┴───┐
  Yes     No
   │       │
   ▼       ▼
  dlq   Calculate Retry Delay
           │
           ▼
       retry_wait
```

---

# 20. Retry Scheduling

When attempts remain, QueueCTL calculates a future retry timestamp.

The job transitions:

```text
running
   │
   ▼
retry_wait
```

The following information is persisted:

```text
state
exit_code
last_error
next_retry_at
```

The worker lock is released.

The job cannot be immediately claimed because it is not in the `pending` state.

---

# 21. Exponential Backoff

QueueCTL uses exponential backoff to prevent continuously failing jobs from executing in a tight loop.

Based on the implemented retry behavior, the retry delay increases with the attempt count.

Conceptually:

```text
retryDelay = baseRetryDelay × 2^attemptIndex
```

For a base retry delay of:

```text
1000 ms
```

the retry progression is conceptually:

```text
First retry     → 1000 ms
Second retry    → 2000 ms
Third retry     → 4000 ms
Fourth retry    → 8000 ms
```

The exact delay is calculated from the current retry attempt according to the production `RetryService` implementation.

The purpose of exponential backoff is to:

- Reduce repeated pressure from failing jobs
- Avoid tight failure loops
- Give transient external failures time to recover
- Reduce unnecessary CPU and process execution

---

# 22. Retry Processing

Before processing new pending jobs, the worker invokes retry processing.

The retry service identifies jobs where:

```text
state = retry_wait
```

and:

```text
next_retry_at <= current time
```

Eligible jobs transition:

```text
retry_wait
    │
    ▼
pending
```

Their retry timestamp is cleared.

The job can then be claimed by a worker again.

Jobs whose retry timestamp is still in the future remain:

```text
retry_wait
```

---

# 23. Dead Letter Queue

A job moves to the Dead Letter Queue when its maximum allowed attempts are exhausted.

Flow:

```text
running
   │
   ▼
Execution Failure
   │
   ▼
RetryService
   │
   ▼
Attempt Limit Reached
   │
   ▼
dlq
```

A DLQ job preserves diagnostic information including:

```text
id
command
attempts
max_retries
exit_code
last_error
created_at
updated_at
```

Lock and retry scheduling information is cleared.

The purpose of the DLQ is to prevent indefinitely failing jobs from continuously consuming worker resources while preserving them for inspection.

---

# 24. ConfigService

`ConfigService` manages persistent runtime configuration.

The primary configuration values are:

```text
worker_concurrency
poll_interval_ms
base_retry_delay_ms
default_max_retries
```

These settings influence multiple components.

```text
Configuration
     │
     ├────────► QueueService
     │             │
     │             └── default_max_retries
     │
     ├────────► WorkerService
     │             │
     │             ├── worker_concurrency
     │             └── poll_interval_ms
     │
     └────────► RetryService
                   │
                   └── base_retry_delay_ms
```

---

# 25. Worker Concurrency Configuration

Configuration:

```text
worker_concurrency
```

Controls how many jobs a worker may execute simultaneously.

The worker may also accept an explicit constructor concurrency value.

When explicitly provided, that value overrides the persisted default configuration for that worker instance.

---

# 26. Poll Interval Configuration

Configuration:

```text
poll_interval_ms
```

Controls how frequently an idle worker checks for additional work.

Without a polling delay, an idle worker could continuously query the database in a tight loop.

The poll interval reduces unnecessary CPU and database activity.

---

# 27. Base Retry Delay Configuration

Configuration:

```text
base_retry_delay_ms
```

Defines the base value used by exponential retry scheduling.

Increasing this value causes retries to occur less frequently.

---

# 28. Default Maximum Retry Configuration

Configuration:

```text
default_max_retries
```

Defines the retry limit assigned to new jobs when no explicit value is supplied.

Flow:

```text
enqueue job
    │
    ▼
Explicit max retries supplied?
    │
 ┌──┴───┐
Yes     No
 │       │
 ▼       ▼
Use     Read
value   default_max_retries
```

---

# 29. Persistence Architecture

QueueCTL uses SQLite for persistence.

The database stores two primary categories of information:

```text
SQLite
│
├── Jobs
│   ├── Queue state
│   ├── Execution state
│   ├── Retry state
│   └── Worker locking state
│
└── Configuration
    └── Runtime operational settings
```

SQLite was selected because QueueCTL is intended to remain self-contained.

Benefits include:

- No external database server
- Simple installation
- Persistent local storage
- Transactional updates
- Suitable atomic update operations
- Easy development and testing

---

# 30. Database Initialization

QueueCTL's database layer is responsible for ensuring that required database structures exist.

The application should be capable of starting without requiring the evaluator to manually execute SQL statements.

The intended startup model is:

```text
Application Starts
       │
       ▼
Open SQLite Database
       │
       ▼
Ensure Required Tables Exist
       │
       ▼
Ensure Required Configuration Exists
       │
       ▼
Application Ready
```

Generated runtime database files are not part of source control.

This ensures that a fresh installation begins with clean runtime state.

---

# 31. Graceful Worker Shutdown

QueueCTL workers handle normal shutdown requests.

When a shutdown signal such as `SIGINT` is received:

```text
SIGINT
   │
   ▼
running = false
   │
   ▼
Stop claiming new jobs
   │
   ▼
Are active jobs running?
   │
 ┌─┴─┐
Yes  No
 │    │
 ▼    ▼
Wait  Exit
 │
 ▼
Active jobs finish
 │
 ▼
Exit
```

The worker does not intentionally claim additional jobs after shutdown begins.

This provides a cleaner termination path for active worker processes.

---

# 32. Error Handling

QueueCTL handles errors at multiple layers.

## Input Errors

Examples:

```text
Empty job ID
Empty command
Invalid retry count
Duplicate job ID
```

These errors are rejected before invalid jobs enter the queue.

## Execution Errors

When a command fails:

```text
exit_code
last_error
```

are persisted.

The retry system then determines whether the job should retry or move to DLQ.

## Configuration Errors

Invalid operational values are rejected.

Examples include invalid concurrency or polling values.

This prevents workers from starting with unusable configuration.

---

# 33. Testing Architecture

QueueCTL separates development/manual testing from automated testing.

```text
queuectl/
│
├── src/
│   └── tests/
│       └── Manual development tests
│
└── tests/
    ├── helpers/
    ├── unit/
    ├── integration/
    └── regression/
```

This separation ensures that existing manual verification procedures remain available while automated tests can run independently.

---

# 34. Test Database Isolation

Automated tests use isolated database state.

The test infrastructure resets the test database before tests where required.

Conceptually:

```text
Test Starts
    │
    ▼
Reset Test Database
    │
    ▼
Initialize Clean Schema
    │
    ▼
Run Test
    │
    ▼
Assertions
```

This prevents:

- Production/local runtime data from affecting tests
- One test contaminating another test
- Existing jobs causing duplicate ID failures
- Existing configuration changing test results

---

# 35. Unit Testing

Unit tests validate individual components and their direct behavior.

Current unit coverage includes:

```text
tests/unit/
├── databaseIsolation.test.ts
├── jobRepository.test.ts
├── queueService.test.ts
├── configService.test.ts
└── retryService.test.ts
```

Unit tests verify behavior such as:

- Job creation
- Job retrieval
- Job updates
- Job deletion
- State filtering
- Attempt tracking
- Atomic locking
- Duplicate locking prevention
- Queue validation
- Duplicate job prevention
- Configuration handling
- Retry scheduling
- Exponential backoff
- Retry eligibility
- DLQ transition

---

# 36. Integration Testing

Integration tests validate multiple components working together.

Current integration coverage includes:

```text
tests/integration/
├── workerService.test.ts
├── retryDlqLifecycle.test.ts
├── workerConcurrency.test.ts
└── configurationIntegration.test.ts
```

These tests validate:

- Worker command execution
- Queue-to-worker interaction
- Job completion
- Retry lifecycle
- Retry-to-pending transition
- DLQ lifecycle
- Worker concurrency
- Atomic duplicate-execution protection
- Configuration consumption by services

---

# 37. Regression Testing

Regression tests verify that previously implemented behavior remains functional after later project changes.

Current regression coverage includes:

```text
tests/regression/
└── fullWorkflow.test.ts
```

The regression suite validates critical workflows such as:

- Job enqueueing
- Pending state
- Worker locking
- Running state
- Attempt tracking
- Successful completion
- Retry scheduling
- Configuration behavior
- Atomic locking
- Duplicate ID prevention
- Job retrieval and listing

---

# 38. Manual and Automated Testing Separation

QueueCTL intentionally preserves both approaches.

```text
Manual Tests
     │
     └── Human-driven verification
         using explicit scenarios

Automated Tests
     │
     ├── Unit
     ├── Integration
     └── Regression
```

Manual testing is useful for:

- CLI behavior
- Human-readable output
- Interactive workflows
- Worker observation
- Demonstrations

Automated testing is useful for:

- Repeatable verification
- Regression detection
- Repository correctness
- Service integration
- Continuous development

Detailed test execution procedures are documented separately in:

```text
docs/TESTING.md
```

---

# 39. Reproducibility

QueueCTL is designed so another developer or evaluator can reconstruct the project environment from the repository.

Source-controlled dependency metadata includes:

```text
package.json
package-lock.json
```

Generated artifacts are excluded from source control.

Examples:

```text
node_modules/
dist/
build/
coverage/
runtime database files
test database files
logs
temporary files
```

The intended dependency setup is:

```text
Repository
    │
    ▼
npm install
    │
    ▼
Dependencies reconstructed
```

Build output is generated using the project's build command rather than being committed.

---

# 40. Design Decisions and Trade-offs

## 40.1 SQLite Instead of PostgreSQL or MySQL

### Decision

Use SQLite as the persistent data store.

### Reason

QueueCTL is a local command-line queue and should not require users to install or configure an external database server.

### Benefits

- Simple installation
- Self-contained
- Persistent
- Transactional
- Easy testing

### Trade-off

SQLite is not intended to provide the same distributed scalability characteristics as a dedicated network database used by large distributed queue systems.

---

## 40.2 Polling Instead of Event-Driven Messaging

### Decision

Workers poll the database for available jobs.

### Reason

Polling avoids introducing external infrastructure such as:

- Redis
- RabbitMQ
- Kafka

### Benefits

- Simple architecture
- Minimal dependencies
- Easy local execution

### Trade-off

Job discovery may be delayed by the configured polling interval.

---

## 40.3 Database-Level Locking Instead of In-Memory Locks

### Decision

Use conditional persistent state updates for job claiming.

### Reason

In-memory locks only protect threads or operations inside one process.

They cannot safely coordinate separate worker processes.

### Benefit

Database-level atomic locking allows multiple worker instances to coordinate through shared persistent state.

---

## 40.4 Repository Pattern

### Decision

Place job persistence logic inside `JobRepository`.

### Reason

Business services should not directly depend on SQL implementation details.

### Benefits

- Lower coupling
- Easier testing
- Centralized persistence logic
- Easier future database changes

---

## 40.5 Dedicated RetryService

### Decision

Separate retry logic from WorkerService.

### Reason

Worker execution and failure policy are different responsibilities.

### Benefits

- Cleaner WorkerService
- Independently testable retry logic
- Centralized backoff behavior
- Easier future retry-policy changes

---

## 40.6 Persistent Configuration

### Decision

Store operational configuration persistently.

### Reason

Worker and retry behavior should be adjustable without modifying source code.

### Benefits

- Runtime configurability
- Centralized configuration
- Reduced hardcoding
- Easier testing of different operational behavior

---

## 40.7 Dead Letter Queue

### Decision

Move exhausted jobs to a dedicated `dlq` state.

### Reason

Deleting permanently failed jobs would remove useful diagnostic information.

Retrying them indefinitely would waste resources.

### Benefit

DLQ provides a terminal failure state while preserving job history.

---

## 40.8 Separate Manual and Automated Tests

### Decision

Keep original manual tests while adding a separate automated test hierarchy.

### Reason

Manual tests remain useful for demonstration and CLI verification, while automated tests provide repeatability.

### Benefit

Evaluators can either:

- Follow documented manual scenarios
- Run automated suites
- Use both approaches

---

# 41. Known Architectural Scope

QueueCTL is intentionally designed as a local persistent command queue.

The current architecture focuses on:

- Local SQLite persistence
- Local operating-system command execution
- One or more workers sharing the same queue database
- Configurable local concurrency
- Retry and DLQ behavior

The project does not attempt to replace distributed queue platforms such as:

- RabbitMQ
- Apache Kafka
- AWS SQS
- Redis-based distributed queues

Those systems address larger-scale distributed messaging requirements.

QueueCTL instead demonstrates the foundational mechanisms behind queue processing in a compact and inspectable implementation.

---

# 42. Future Extension Possibilities

The architecture could be extended in the future with features such as:

- Job priorities
- Scheduled jobs
- Job cancellation
- Job timeouts
- DLQ requeue commands
- Job dependency graphs
- Worker heartbeats
- Stale lock recovery
- Execution duration tracking
- Structured command output capture
- Queue statistics
- Metrics
- Web dashboard
- REST API
- Remote workers
- Database migrations
- Distributed database support

These features are outside the current project scope but can be added without fundamentally changing the separation between CLI, services, repository, and persistence layers.

---

# 43. Complete System Flow

The complete QueueCTL lifecycle can be summarized as:

```text
                         USER
                           │
                           ▼
                     QueueCTL CLI
                           │
                           ▼
                     QueueService
                           │
                           ▼
                    JobRepository
                           │
                           ▼
                        SQLite
                           │
                           │
                    Job = pending
                           │
                           ▼
                     WorkerService
                           │
                    Process Retries
                           │
                           ▼
                  Find Pending Job
                           │
                           ▼
                    Atomic Lock
                           │
                           ▼
                  Job = running
                           │
                           ▼
                  Increment Attempts
                           │
                           ▼
                   Execute Command
                           │
              ┌────────────┴────────────┐
              │                         │
           SUCCESS                    FAILURE
              │                         │
              ▼                         ▼
        exit_code = 0              RetryService
              │                         │
              ▼              ┌──────────┴──────────┐
         completed           │                     │
                             │                     │
                      Attempts Remain       Attempts Exhausted
                             │                     │
                             ▼                     ▼
                        retry_wait                dlq
                             │
                       Wait Until
                      next_retry_at
                             │
                             ▼
                          pending
                             │
                             └──────────► WorkerService
```

---

# 44. Summary

QueueCTL is structured around a persistent queue-processing architecture with clear separation of responsibilities.

The CLI provides the user interface.

`QueueService` manages queue operations.

`JobRepository` manages persistent job data and atomic job claiming.

`WorkerService` performs concurrent background command execution.

`RetryService` manages failure recovery, exponential backoff, and DLQ transitions.

`ConfigService` provides persistent operational configuration.

SQLite provides self-contained persistence.

The testing architecture validates individual components, cross-component interactions, and complete workflows.

The resulting design provides the core properties expected from a persistent job queue:

- Durable job storage
- Explicit job lifecycle
- Safe worker claiming
- Controlled concurrency
- Failure tracking
- Automatic retries
- Exponential backoff
- Dead Letter Queue handling
- Persistent configuration
- Reproducible testing

QueueCTL intentionally keeps the infrastructure minimal while exposing the internal mechanisms that make reliable background job processing possible.