# Test-Driven Development

You must follow strict Test-Driven Development for all work in this repository. The rules below are the same ones used by tdd-guard; treat them as binding constraints on every code change you make.

## TDD Fundamentals

### The TDD Cycle
The foundation of TDD is the Red-Green-Refactor cycle:

1. **Red Phase**: Write ONE failing test that describes desired behavior
   - The test must fail for the RIGHT reason (not syntax/import errors)
   - Only one test at a time - this is critical for TDD discipline
   - **Adding a single test to a test file is ALWAYS allowed** - no prior test output needed
   - Starting TDD for a new feature is always valid, even if test output shows unrelated work

2. **Green Phase**: Write MINIMAL code to make the test pass
   - Implement only what's needed for the current failing test
   - No anticipatory coding or extra features
   - Address the specific failure message

3. **Refactor Phase**: Improve code structure while keeping tests green
   - Only allowed when relevant tests are passing
   - Requires proof that tests have been run and are green
   - Applies to BOTH implementation code and behavioral changes in test code (what assertions check)
   - No refactoring with failing tests - fix them first

### Core Violations

1. **Multiple Test Addition**
   - Adding more than one new test at once
   - Exception: Initial test file setup or extracting shared test utilities

2. **Over-Implementation**
   - Code that exceeds what's needed to pass the current failing test
   - Adding untested features, methods, or error handling
   - Implementing multiple methods when test only requires one

3. **Premature Implementation**
   - Adding implementation before a test exists and fails properly
   - Adding implementation without running the test first
   - Behavioral refactoring when tests haven't been run or are failing

### Critical Principle: Incremental Development
Each step in TDD should address ONE specific issue:
- Test can't locate the impl (import/symbol unresolved) → Create empty stub only
- Test errors calling the impl (signature or call mismatch) → Adjust signature, stub body minimally
- Test fails on assertion (expected vs received) → Implement minimal logic only

### Reaching a Clean Red
Before a failing test becomes a useful Red, it has to run far enough to evaluate an assertion. Some failures happen before that point:
- The reporter shows no tests ran — the test file couldn't load (missing import, unresolved symbol).
- A test errored before its assertion — the impl's signature doesn't match the call, or the call threw mid-execution.

In both cases, you may adjust the impl: create missing stubs, change the signature to accept the test's call, or replace the body with a minimal form (empty, constant return, unchanged body with new params). This is part of reaching Red, not Refactoring.
No new logic is permitted at this step.

### General Information
- In the refactor phase, it is perfectly fine to refactor both test and implementation code. That said, completely new functionality is not allowed. Types, clean up, abstractions, and helpers are allowed as long as they do not introduce new behavior.
- When a test-file diff restructures existing tests (new names, reordered, combined, split) and the intent isn't clearly "add many new tests," default to keeping it within TDD discipline. The one-new-test rule is about intent to add behavior, not surface diff count.
- During refactor (tests green), adding types, interfaces, or constant literals to an existing or new file is always allowed — they add no runtime behavior by construction.
- During refactor (tests green), extracting helpers or functions whose behavior already lives elsewhere (covered by existing tests) into an existing or new file is also allowed. A function whose behavior appears nowhere else is net-new, not extraction, and requires a failing test first.

## How to Count New Tests

**CRITICAL**: A test is only "new" if it doesn't exist in the old content.

1. **Compare old content vs new content:**
   - Find test declarations: `test(`, `it(`, `describe(`
   - A test that exists in both old and new is NOT new
   - Only count tests that appear in new but not in old

2. **What counts as a new test:**
   - A test block that wasn't in the old content
   - NOT: Moving an existing test to a different location
   - NOT: Renaming an existing test
   - NOT: Reformatting or refactoring existing tests
   - NOT: Combining two existing tests into one
   - NOT: Splitting one existing test into multiple tests that cover the same assertions

3. **Multiple test check:**
   - One new test = Allowed (part of TDD cycle)
   - Two or more new tests = Violation

## Matching Implementation to Failure Type

1. **Check the test output** to understand the current failure
2. **Match implementation to failure type:**
   - Import or symbol unresolved → Only create empty stub
   - Impl exists but call fails (signature mismatch, error before assertion) → Adjust signature, stub body minimally
   - Assertion failure (expected vs received) → Implement minimal logic to pass

3. **Verify minimal implementation:**
   - Don't add extra methods
   - Don't add error handling unless tested
   - Don't implement features beyond current test

## Operating procedure

- Run the test suite (`npm test`) after every change. Do not batch.
- Before adding implementation, confirm the relevant test has been run and is failing for the right reason.
- Before refactoring, confirm the relevant tests have been run and are green.
- Stop and re-read these rules if you are about to write more than the minimum the current failing test requires.
