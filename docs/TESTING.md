# QueueCTL Testing Guide

This document explains how to verify QueueCTL using manual and automated tests.

---

## 1. Testing Overview

QueueCTL uses two separate testing approaches:

```text
Manual Tests
    └── Used to test and observe individual functionality manually

Automated Tests
    └── Unit
    └── Integration
    └── Regression
```

Manual development tests are kept separate from the automated Vitest suite.

---

## 2. Prerequisites

Install dependencies:

```bash
npm install
```

Verify that the project compiles:

```bash
npm run build
```

---

# 3. Manual Testing

Manual tests are used to verify QueueCTL functionality directly during development.

These tests cover functionality such as:

- Database operations
- Job creation and persistence
- Queue operations
- Worker execution
- Job locking
- Retry handling
- Exponential backoff
- Dead Letter Queue behavior
- Worker concurrency
- Configuration

Run the required manual test file using the development environment or the command documented inside the corresponding test file.

Manual CLI functionality can also be verified using:

```bash
npm run dev -- --help
```

For a complete CLI demonstration, refer to:

```text
docs/CLI.md
```

---

# 4. Automated Testing

The automated test suite is located in:

```text
tests/
├── helpers/
├── unit/
├── integration/
└── regression/
```

Automated tests use Vitest.

They are independent of the manual development tests.

---

## Unit Tests

Unit tests verify individual components in isolation.

The unit suite covers:

```text
Database isolation
JobRepository
ConfigService
QueueService
RetryService
```

Run a specific unit test:

```bash
npx vitest run tests/unit/<test-file>.test.ts
```

Example:

```bash
npx vitest run tests/unit/jobRepository.test.ts
```

```bash
npx vitest run tests/unit/queueService.test.ts
```

---

## Integration Tests

Integration tests verify that multiple QueueCTL components work correctly together.

The integration suite covers:

```text
Worker execution
Retry and DLQ lifecycle
Worker concurrency
Duplicate claim prevention
Configuration integration
```

Run a specific integration test:

```bash
npx vitest run tests/integration/<test-file>.test.ts
```

Example:

```bash
npx vitest run tests/integration/retryDlqLifecycle.test.ts
```

---

## Regression Tests

Regression tests verify that the complete QueueCTL workflow continues working after changes to the codebase.

Run a specific regression test:

```bash
npx vitest run tests/regression/<test-file>.test.ts
```

Regression tests protect previously implemented behavior from future changes.

---

# 5. Run the Complete Automated Test Suite

Run:

```bash
npm test
```

This executes the complete automated test suite.

A successful run should report all test files and tests as passing.

---

# 6. Test Database Isolation

Automated tests use isolated test database state.

Tests should not depend on or modify the user's normal QueueCTL runtime data.

Test database files are excluded from Git:

```text
tests/database/*.db
tests/database/*.db-shm
tests/database/*.db-wal
```

The test database is recreated or reset as required by the test suite.

This makes automated tests repeatable and independent.

---

# 7. Recommended Evaluator Verification

For a quick complete verification, run:

```bash
npm install
npm run build
npm test
```

Then verify the CLI:

```bash
npm run dev -- --help
```

Check configuration:

```bash
npm run dev -- config
```

For practical application usage and manual feature demonstrations, follow:

```text
docs/CLI.md
```

The expected verification flow is:

```text
Install Dependencies
        ↓
Build Project
        ↓
Run Automated Tests
        ↓
Verify CLI
        ↓
Run Manual CLI Demonstration
```

If `npm run build` and `npm test` complete successfully, the implementation has passed compilation and the automated unit, integration, and regression verification included with the project.