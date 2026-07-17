# QueueCTL — System Design and Architecture

## 1. Introduction

QueueCTL is a persistent command-line job queue system designed to enqueue, store, execute, retry, and track background command-based jobs.

The system uses SQLite for persistent storage and provides a CLI interface for interacting with the queue. Workers continuously poll the queue, atomically claim pending jobs, execute commands, and update job states based on execution results.

QueueCTL supports:

- Persistent job storage
- Command-line job management
- Background worker execution
- Configurable worker concurrency
- Atomic job locking
- Retry handling
- Exponential backoff
- Dead Letter Queue (DLQ)
- Runtime configuration
- Graceful worker shutdown
- Automated unit, integration, and regression testing

---

# 2. Design Goals

QueueCTL was designed around the following principles.

## 2.1 Persistence

Jobs must survive application restarts.

SQLite provides persistent local storage without requiring an external database server.

## 2.2 Reliability

A job must have a clearly defined lifecycle. Execution results, attempts, errors, and exit codes are persisted.

## 2.3 Safe Concurrent Processing

Multiple workers may compete for pending jobs.

Atomic database-level locking ensures that only one worker can successfully claim a specific job.

## 2.4 Controlled Concurrency

A worker can execute multiple jobs concurrently while respecting a configured concurrency limit.

## 2.5 Failure Recovery

Failed jobs are not immediately discarded.

Eligible jobs are scheduled for retry using exponential backoff.

## 2.6 Dead Letter Queue

Jobs that exhaust their maximum allowed attempts are moved to the `dlq` state for inspection.

## 2.7 Configurability

Important runtime behavior can be controlled through persisted configuration values.

## 2.8 Testability

The system separates queue logic, persistence, retry handling, configuration, and worker execution to allow unit and integration testing.

---

# 3. High-Level Architecture

```text
                     ┌───────────────────┐
                     │       User        │
                     └─────────┬─────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │   QueueCTL CLI    │
                     └─────────┬─────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
      ┌────────────────┐               ┌────────────────┐
      │  QueueService  │               │ ConfigService  │
      └───────┬────────┘               └───────┬────────┘
              │                                 │
              ▼                                 │
      ┌────────────────┐                        │
      │ JobRepository  │◄───────────────────────┘
      └───────┬────────┘
              │
              ▼
      ┌────────────────┐
      │     SQLite     │
      └────────────────┘


      ┌────────────────┐
      │ WorkerService  │
      └───────┬────────┘
              │
              ▼
        Find Pending Job
              │
              ▼
         Atomic Lock
              │
              ▼
      Increment Attempts
              │
              ▼
       Execute Command
          │         │
          │         │
       Success    Failure
          │         │
          ▼         ▼
     completed  RetryService
                    │
             ┌──────┴───────┐
             │              │
             ▼              ▼
        retry_wait          dlq
             │
             ▼
          pending