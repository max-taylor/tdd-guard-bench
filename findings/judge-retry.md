# LLM judge — retry

Model: `gpt-5-mini`. Runs per pair: 3 (majority verdict per dimension). Position-bias controlled by per-call random slot assignment.

## Win rates by dimension

| Condition pair | Dimension | Cond1 wins | Cond2 wins | Ties | n pairs |
|----------------|-----------|------------|------------|------|---------|
| A vs B | test_quality | 9 | 0 | 0 | 9 |
| A vs B | design_quality | 9 | 0 | 0 | 9 |
| A vs B | spec_adherence | 3 | 0 | 6 | 9 |
| A vs B | restraint | 0 | 9 | 0 | 9 |
| A vs C | test_quality | 8 | 1 | 0 | 9 |
| A vs C | design_quality | 8 | 1 | 0 | 9 |
| A vs C | spec_adherence | 3 | 0 | 6 | 9 |
| A vs C | restraint | 0 | 9 | 0 | 9 |
| B vs C | test_quality | 3 | 6 | 0 | 9 |
| B vs C | design_quality | 0 | 9 | 0 | 9 |
| B vs C | spec_adherence | 0 | 2 | 7 | 9 |
| B vs C | restraint | 9 | 0 | 0 | 9 |

## Per-pair detail

### retry::AvsB::retry-20260511-144230_vs_retry-20260511-144230
- **test_quality**: A — Condition [A] has a broader, more targeted test suite (unit tests for computeDelay, injected sleep/random for deterministic tests, explicit checks for shouldRetry invocation and no-sleep-on-success/final-attempt) that would catch more regressions.
- **design_quality**: A — Condition [A] is better structured and more maintainable (clear helper extractRetryAfterMs, separable computeDelay, and injectable sleep/random for testability) compared with [B]'s more tightly coupled implementation.
- **spec_adherence**: tie — Both implement the core retry and server-delay behaviour, but [A] more consistently follows the spec (calls shouldRetry on each failure and cleanly applies server-supplied retryAfterMs without jitter); [B] skips calling shouldRetry on the final attempt and uses a non-obvious jitter formula.
- **restraint**: B — Condition [B] sticks closer to the minimal spec surface (no extra injectable hooks or exported helpers) while [A] adds extra options and an exported computeDelay beyond what was requested.

### retry::AvsB::retry-20260511-144230_vs_retry-20260511-152535
- **test_quality**: A — [A]'s tests are more thorough and targeted (injectable sleep/random for deterministic checks, computeDelay unit tests, explicit checks for no-sleep on success and shouldRetry behavior) making them better regression detectors than [[A]]'s timer-heavy, slightly more integration-style suite.
- **design_quality**: A — [A] has cleaner separation of concerns (computeDelay, extractRetryAfterMs), dependency injection (sleep/random) and explicit types/exports, making it easier to read, test and maintain than [[A]]'s single-function implementation.
- **spec_adherence**: tie — Both implementations correctly implement retry attempts, shouldRetry gating, exponential backoff with jitter, server-supplied retryAfterMs (no jitter) and final-error propagation, so they equally satisfy the spec.
- **restraint**: B — [[A]] implements just the required surface (no extra helpers or injected hooks), whereas [A] adds extra APIs (computeDelay, injectable sleep/random, re-exports) beyond the spec. 

### retry::AvsB::retry-20260511-144230_vs_retry-20260511-154755
- **test_quality**: A — Condition [B]'s tests explicitly cover the server-supplied retryAfterMs requirement from the spec extension and verify actual timers, while Condition [A]'s suite — though broader in other areas — omits a test for retryAfterMs so it would miss regressions for that new behaviour.
- **design_quality**: A — Condition [A] is better structured and more maintainable: it extracts computeDelay and retry-after parsing, injects sleep/random for testability, and keeps concerns separated, whereas [B] is a single monolithic function using globals.
- **spec_adherence**: A — Both implementations correctly implement the core retry semantics and the server-supplied retryAfterMs override per attempt, so neither is clearly more faithful to the spec.
- **restraint**: B — Condition [B] sticks closely to the requested API and behaviour with minimal extras, while Condition [A] adds extra public hooks (sleep/random/computeDelay) and exports beyond the spec. 

### retry::AvsB::retry-20260511-152535_vs_retry-20260511-144230
- **test_quality**: A — Condition [A]'s test suite is far more comprehensive and targeted — it covers many edge cases (invalid retryAfterMs values, zero, per-attempt differences), checks jitter/backoff math, ensures no final sleep, and asserts shouldRetry receives the thrown error, whereas [B]'s tests are narrower.
- **design_quality**: A — Condition [A] is better structured and more maintainable (clear helper for retryAfter logic, configurable sleep/random for testability, straightforward loop), while [B] is flatter and uses a less-considered jitter implementation.
- **spec_adherence**: A — Condition [A] explicitly implements all specified behaviours (per-attempt decision, server-supplied retryAfterMs without added jitter, exponential backoff with jitter, correct maxAttempts handling) and tests those edge cases; [B] mostly complies but is less explicit in several edge behaviours.
- **restraint**: B — Condition [B] sticks closely to the spec with a minimal API and no test-only hooks or extra options, while [A] adds injected sleep/random and an export wrapper beyond the requested interface.

### retry::AvsB::retry-20260511-152535_vs_retry-20260511-152535
- **test_quality**: A — Condition [[A]] has a much more comprehensive, deterministic test suite (injectable sleep/random, exact delay checks, many edge cases like invalid retryAfterMs and per-attempt behaviour) that would catch regressions more reliably than [[A]]'s smaller, less exhaustive tests.
- **design_quality**: A — Condition [[A]] is better structured and more maintainable (clear types, small helper for retryAfter logic, dependency injection for sleep/random, and clean control flow), making it easier for a maintainer to understand and test.
- **spec_adherence**: tie — Both implementations correctly implement the retry semantics, exponential backoff with jitter, and the server-supplied retryAfterMs rule per attempt, matching the spec.
- **restraint**: B — Condition [A] sticks closely to the spec without adding testability/configuration hooks or additional exports, whereas [A] introduced extra options/exports beyond the requested interface. 

### retry::AvsB::retry-20260511-152535_vs_retry-20260511-154755
- **test_quality**: A — Condition [A] provides a much more comprehensive and targeted test suite (covers jitter determinism, invalid retryAfterMs values, per-attempt decisions, zero retryAfterMs, and that shouldRetry receives the error), so it's more likely to catch regressions than [B]'s slimmer suite.
- **design_quality**: A — Condition [A] is better structured and more maintainable (clear helper for retryAfterMs, dependency injection for sleep/random to decouple timing and make tests deterministic, and an index export), whereas [B] is flatter and less test-friendly.
- **spec_adherence**: tie — Condition [A] implements all required behaviors (calls shouldRetry, respects server-supplied retryAfterMs without additional jitter, correct backoff and retry counting); [B] skips calling shouldRetry on the final attempt and omits injectable test seams.
- **restraint**: B — Condition [B] sticks closely to the minimal spec with no extra configuration or test hooks, while [A] adds optional sleep/random injections and an index export beyond what was requested.

### retry::AvsB::retry-20260511-154755_vs_retry-20260511-144230
- **test_quality**: A — Condition [[A]]'s tests are more comprehensive and deterministic (injected sleep/random), cover more edge cases (invalid retryAfterMs, no-sleep-before-first-call, per-attempt decision) and make stronger assertions about behavior.
- **design_quality**: A — Condition [[A]] has clearer control flow and better separation (injectable sleep/random, explicit exports), improving testability and maintainability compared with [[A]]'s simpler but more global approach.
- **spec_adherence**: tie — Both implementations correctly implement the required retry semantics (maxAttempts, shouldRetry gating, exponential backoff with jitter, server-supplied retryAfterMs handling per attempt) and pass the spec tests.
- **restraint**: B — Condition [A] implements the spec directly with minimal extras, whereas [A] adds extra options and re-exports not required by the spec, increasing surface area beyond the assignment.

### retry::AvsB::retry-20260511-154755_vs_retry-20260511-152535
- **test_quality**: A — Condition [[A]]'s test suite is more comprehensive and targeted — it injects sleep/random to make assertions deterministic, covers more edge cases (invalid retryAfterMs variants, no-sleep-before-first-call, per-attempt decisions, shouldRetry invocation) and checks exact delay values and bounds, whereas [[A]]'s tests are solid but narrower.
- **design_quality**: A — Condition [[A]] is better structured and more maintainable: it defines a RetryOptions type, clean control flow, and supports dependency injection (sleep/random) for testability, while [[A]] is flatter and relies on globals (Math.random/setTimeout).
- **spec_adherence**: tie — Both implementations correctly implement the required retry logic, exponential backoff with jitter, honour server-provided retryAfterMs (no extra jitter), respect shouldRetry, and stop after maxAttempts, so neither is measurably more faithful to the spec.
- **restraint**: B — Condition [A] sticks closely to the specified interface and options, whereas [A] adds optional sleep/random hooks and an export wrapper beyond the spec (helpful but scope expansion).

### retry::AvsB::retry-20260511-154755_vs_retry-20260511-154755
- **test_quality**: A — Condition [[A]]'s tests are more thorough and precise (dependency-injected sleep/random, checks for no pre-call sleep, per-attempt retryAfterMs behaviour, invalid values, and shouldRetry argument), making them better regression guards.
- **design_quality**: A — Condition [[A]] separates concerns (injectable sleep/random), has clearer control flow and better testability/abstractions without clutter, making it easier to maintain.
- **spec_adherence**: A — Condition [[A]] more faithfully follows the spec (calls shouldRetry on each rejection, avoids sleeping after the final attempt, and exercises per-attempt retryAfterMs rules in tests); Condition [A] may skip shouldRetry on the final failure.
- **restraint**: B — Condition [A] implements the required behaviour more narrowly with no extra injection points or exports, whereas Condition [[A]] adds optional hooks and an extra index export beyond the spec.

### retry::AvsC::retry-20260511-144230_vs_retry-20260511-144230
- **test_quality**: C — Condition C's tests cover the full spec including the server-supplied retryAfterMs (valid, invalid, zero), exponential backoff with jitter, boundary cases and final-attempt behaviour, whereas [A]'s suite omits explicit tests for retryAfterMs and some edge permutations.
- **design_quality**: A — Condition [C] is more modular and clearer (separates computeDelay, extracts retryAfterMs, uses explicit destructuring and an index export), making the control flow and responsibilities easier to maintain.
- **spec_adherence**: tie — Both implementations correctly implement the retry loop, shouldRetry gating, exponential backoff with jitter, per-attempt fallback, and the server-provided retryAfterMs rules, and neither violates the spec.
- **restraint**: C — Condition C keeps a smaller public surface and only internal helpers, while [A] introduces an extra exported helper (computeDelay) and re-exports, expanding the API beyond the requested retry function.

### retry::AvsC::retry-20260511-144230_vs_retry-20260511-152535
- **test_quality**: A — Condition [C] has a broader, more precise test suite (checks call counts, shouldRetry receives the error, no-sleep-on-success, computeDelay unit tests, deterministic jitter checks) while [C]'s tests cover core flows but are narrower.
- **design_quality**: A — Condition [C] is better structured and more maintainable — clear function decomposition, dependency-injection for sleep/random, and explicit exports improve readability and testability.
- **spec_adherence**: A — [A] faithfully follows the spec (including calling shouldRetry on each rejection and honoring server-supplied retryAfterMs), whereas [C] fails to call shouldRetry on the final failed attempt before propagating the error.
- **restraint**: C — Condition C is more restrained and implements only the required surface, while [A] adds extras (sleep/random options and extra exports) beyond the spec. 

### retry::AvsC::retry-20260511-144230_vs_retry-20260511-154755
- **test_quality**: A — [A]'s tests are more granular and deterministic (injecting sleep/random), cover more edge assertions (shouldRetry receives the error, no sleep on success, exact call counts, computeDelay unit tests) making them better regression guards.
- **design_quality**: A — [A] has a clearer, more maintainable structure (injections for sleep/random, exported computeDelay, small helper extraction, explicit option defaults and an index export) that aids readability and testability.
- **spec_adherence**: A — [A] more faithfully follows the spec semantics (e.g., always passes the thrown error to shouldRetry and cleanly handles server-supplied retryAfterMs) while [C] skips calling shouldRetry on the final attempt.
- **restraint**: C — [C] implements the required behaviour minimally without adding optional hooks or extra exports, whereas [A] introduces additional API surface (sleep/random injection and re-exports) beyond the spec.

### retry::AvsC::retry-20260511-152535_vs_retry-20260511-144230
- **test_quality**: A — Condition [A] has a much more exhaustive, explicit test suite (exact jitter values, many invalid retryAfterMs cases, per-attempt behaviour, shouldRetry invocation) that would catch more regressions than [C]'s looser/range-based tests.
- **design_quality**: A — Condition [A] is slightly better structured and readable (clear helper for retryAfterMs, explicit option destructuring, type exports and an index re-export) making it easier to maintain.
- **spec_adherence**: tie — Both implementations faithfully implement the core spec and the retryAfterMs extension (per-attempt server delay, fallback to exponential backoff with jitter, shouldRetry gating and maxAttempts behaviour).
- **restraint**: C — Condition C is leaner and avoids extra surface area (no top-level re-export file and slightly less auxiliary plumbing) so it stays closer to the spec's surface. 

### retry::AvsC::retry-20260511-152535_vs_retry-20260511-152535
- **test_quality**: A — Condition [C]'s test suite is more thorough and targeted — it covers many edge cases (invalid retryAfterMs values, zero, per-attempt behavior, that shouldRetry receives the error, no sleep after final attempt) and uses deterministic injection to make assertions robust.
- **design_quality**: A — Condition [C] has clearer modular design and testability (injectable sleep and random, small helper functions, explicit defaults) making the code easier to maintain and reason about.
- **spec_adherence**: A — Condition [C] more faithfully follows the spec (it always calls shouldRetry with the thrown error, correctly handles per-attempt server-supplied retryAfterMs and fallbacks, and avoids sleeping after the final attempt).
- **restraint**: C — Condition C sticks closely to the requested interface and behavior without adding extras like injectable sleep/random options or an additional index export file.

### retry::AvsC::retry-20260511-152535_vs_retry-20260511-154755
- **test_quality**: A — Condition [A]'s tests are broader and more granular (explicit delay arrays, per-attempt retryAfterMs checks, zero-delay, final-attempt no-sleep, and shouldRetry invocation) and would catch more regressions than [C]'s good but slightly narrower timer-based suite.
- **design_quality**: A — Condition [A]'s implementation is slightly more maintainable and testable (clear control flow, small helpers, and injectable sleep/random for deterministic testing) while remaining simple and readable.
- **spec_adherence**: tie — Both implementations correctly implement retries, shouldRetry gating, exponential backoff with jitter, server-supplied retryAfterMs handling, and final-error propagation as required by the spec and extension.
- **restraint**: C — Condition C sticks closely to the spec surface (only the requested options) while Condition [A] adds extra injectable options (sleep/random) and exports beyond the minimal interface, increasing surface area beyond the spec.

### retry::AvsC::retry-20260511-154755_vs_retry-20260511-144230
- **test_quality**: A — Condition [A]'s test suite is noticeably larger and more diagnostic—covering no-delay-before-first-call, jitter differences, bounded jitter windows, shouldRetry call behaviour, and many invalid retryAfterMs cases—whereas [C]'s tests are narrower though correct.
- **design_quality**: C — Condition C's implementation is slightly cleaner and easier to follow (explicit for-loop, small well-named helper readRetryAfterMs, and straightforward control flow) compared with [A]'s catch/increment/while loop and inline logic.
- **spec_adherence**: tie — Both implementations meet the spec, but [C] more explicitly and robustly handles retryAfterMs parsing and uses a clearer attempt/indexing scheme that reduces off-by-one subtlety.
- **restraint**: C — Condition C stays closer to the minimal required surface (concise helper and loop) while [A] introduces extra re-exports and slightly more opinionated jitter logic beyond the spec's needs.

### retry::AvsC::retry-20260511-154755_vs_retry-20260511-152535
- **test_quality**: A — [A]'s test suite is much more comprehensive and deterministic (injected sleep/random), covering many edge cases (no-sleep-before-first-call, final-attempt behaviour, invalid retryAfterMs, per-attempt decisions, shouldRetry invocation) that [C]'s narrower, partly non-deterministic tests do not.
- **design_quality**: A — [A] has a clearer, more testable design (injected sleep/random, small well-named variables, explicit exports) that makes the code easier to maintain and reason about than [C]'s minimal but less test-friendly structure.
- **spec_adherence**: tie — Both implementations correctly implement the retry loop, shouldRetry gating, exponential backoff with jitter, and honor a valid error.retryAfterMs without applying jitter, satisfying the spec.
- **restraint**: C — [C] sticks closely to the requested API and behavior while [A] adds extra options (sleep/random and an index export) beyond the spec, increasing surface area despite improving testability.

### retry::AvsC::retry-20260511-154755_vs_retry-20260511-154755
- **test_quality**: A — [A]'s tests are more deterministic and comprehensive (injecting sleep/random, checking no-first-call delay, no sleep after final attempt, per-attempt retryAfterMs behavior, and many invalid cases), making them a stronger regression net.
- **design_quality**: A — [A] has clearer structure and maintainability (well-named locals, bounded loop, exported types, and dependency injection for sleep/random which improves testability and reuse).
- **spec_adherence**: tie — Both implementations correctly implement the retry semantics, exponential backoff with jitter, per-attempt handling of server-supplied retryAfterMs, shouldRetry gating, and maxAttempts behavior as required by the spec.
- **restraint**: C — [C] sticks closely to the spec surface (no extra options or exports) while [A] adds extra API surface (sleep/random injection and an index export) beyond what was requested.

### retry::BvsC::retry-20260511-144230_vs_retry-20260511-144230
- **test_quality**: C — Condition C's tests exercise more edge cases (invalid retryAfterMs values, zero retryAfterMs, no-sleep-after-final-attempt), use injected sleep/random for deterministic assertions, and check useful properties of delays, making the suite more diagnostic and robust.
- **design_quality**: C — Condition C structures concerns cleanly (readRetryAfterMs helper, injectable sleep/random with sensible defaults), improving testability and maintainability compared with [[C]]'s minimal-but-tighter implementation.
- **spec_adherence**: C — Both implementations meet the spec, but [[C]]'s additive backoff+jitter preserves the baseDelayMs as a clear exponential baseline matching the examples, whereas [C]'s multiplicative jitter can produce delays below the base and thus slightly diverges from the common backoff interpretation in the spec.
- **restraint**: B — Condition [C] sticks closely to the requested API and behavior without adding optional hooks or configuration, while [C] introduces extra injection points (sleep/random) beyond the spec.

### retry::BvsC::retry-20260511-144230_vs_retry-20260511-152535
- **test_quality**: B — Condition [C]'s tests are slightly more targeted and varied (fake timers + timer-count checks, deterministic RNG checks, exact-delay assertions) which better exercise timing and edge behaviours for regressions.
- **design_quality**: C — Condition C has clearer, more modular structure (separate serverSuppliedDelay and computeDelay, explicit loop with final throw) and a more conventional jitter/backoff calculation, making it easier to read and maintain.
- **spec_adherence**: tie — Both implementations correctly implement the retry semantics including shouldRetry gating, exponential backoff with jitter, and honoring a finite non-negative retryAfterMs without added jitter.
- **restraint**: B — Condition [C] keeps a simpler implementation surface (fewer small helper abstractions) and avoids adding behavior beyond the spec, whereas [C] introduces extra helper decomposition and slightly different jitter scaling. 

### retry::BvsC::retry-20260511-144230_vs_retry-20260511-154755
- **test_quality**: C — Condition C's test suite is more thorough and diagnostic — it checks call counts, verifies fallback behavior for many invalid retryAfterMs values, and explicitly tests jitter differences, so it would catch more regressions.
- **design_quality**: C — Condition C has clearer separation of concerns (retryAfterFromError, computeDelay, sleep), more robust type checks, and a more sensible jitter strategy, making the code easier to maintain.
- **spec_adherence**: C — Condition C precisely implements per-attempt server-supplied retryAfterMs (with correct fallbacks for invalid values) and its tests validate those edge cases, so it more fully and explicitly satisfies the spec.
- **restraint**: B — Condition [C] stays closer to a minimal implementation of the spec with fewer extra helpers and less additional behavior beyond what was required.

### retry::BvsC::retry-20260511-152535_vs_retry-20260511-144230
- **test_quality**: C — Condition C's tests are more thorough and deterministic (injectable sleep/random), cover more edge cases (invalid retryAfterMs variants, zero, no-sleep-after-final), and assert precise numeric expectations, making them better regression guards.
- **design_quality**: C — Condition C has clearer separation of concerns (readRetryAfterMs helper), a typed RetryOptions, and dependency injection for sleep/random which improves testability and maintainability compared with [[C]]'s direct use of globals.
- **spec_adherence**: tie — Both implementations correctly implement retries, shouldRetry gating, exponential backoff with jitter, respect server-supplied retryAfterMs without additional jitter, and propagate the final error as specified.
- **restraint**: B — Condition [C] sticks closely to the requested signature and behavior without adding extra injectable options or exported types, whereas [C] introduces additional API surface (sleep/random) beyond the spec.

### retry::BvsC::retry-20260511-152535_vs_retry-20260511-152535
- **test_quality**: B — [B]'s test suite is more robust and deterministic (uses fake timers and mocks Math.random where needed) and exercises timing, jitter, and server-supplied delays in a way that will reliably catch regressions.
- **design_quality**: C — [C] has clearer structure and separation of concerns (typed RetryOptions, small helper functions for server delay, delay computation and sleep) which improves readability and maintainability.
- **spec_adherence**: tie — Both implementations correctly implement retries, shouldRetry gating, exponential backoff with jitter, per-attempt server-supplied retryAfterMs handling, and proper maxAttempts behaviour.
- **restraint**: B — [B] is more compact and stays narrowly focused on the spec without adding exported helper interfaces or extra abstractions beyond the required behavior.

### retry::BvsC::retry-20260511-152535_vs_retry-20260511-154755
- **test_quality**: C — Condition C's tests are more comprehensive and targeted (explicit checks for many invalid retryAfterMs shapes, exact expected delays, and clearer assertions about jitter and backoff), so they better catch regressions.
- **design_quality**: C — Condition C separates concerns into small helpers (sleep, computeDelay, retryAfterFromError) and exposes a clear RetryOptions type, making the implementation easier to read and maintain than [B]'s single large function.
- **spec_adherence**: tie — Both implementations correctly implement retries, shouldRetry gating, exponential backoff with jitter, and the server-provided retryAfterMs rule per attempt, so neither is notably more faithful to the spec.
- **restraint**: B — Condition [B] is more minimal and avoids extra exported types and auxiliary helpers, sticking closer to the core spec without adding extra surface area or utilities.

### retry::BvsC::retry-20260511-154755_vs_retry-20260511-144230
- **test_quality**: C — Condition C has a broader, more precise test suite (covers jitter bounds, no-final-sleep, many invalid retryAfterMs cases, zero delay) that would catch more regressions than [B]'s narrower set.
- **design_quality**: C — Condition C is better structured for maintainability (clear helper for retryAfter parsing, DI for sleep/random, default implementations) making the control flow and testability clearer.
- **spec_adherence**: tie — Both implementations correctly implement the required retry/backoff/jitter and the server-supplied retryAfterMs behaviour and propagate errors as specified.
- **restraint**: B — Condition [B] sticks closely to the spec surface and avoids added testing hooks/options, whereas [C] introduced extra options (sleep/random) and helpers beyond the requested API.

### retry::BvsC::retry-20260511-154755_vs_retry-20260511-152535
- **test_quality**: B — [B]'s tests are more robust and deterministic (it mocks Math.random to exercise jitter and asserts the exact final error object), whereas [C]'s jitter test compares two runs non-deterministically and is more likely to flake.
- **design_quality**: C — [C] has clearer structure and separation of concerns (serverSuppliedDelay/computeDelay/sleep helpers and a bounded for-loop), making it easier to read and maintain than [B]'s single long function.
- **spec_adherence**: tie — Both implementations correctly implement retries, shouldRetry gating, exponential backoff with jitter, server-supplied retryAfterMs without added jitter, and final-error propagation per the spec.
- **restraint**: B — [B] is more minimal and stays close to the spec without adding extra helper abstractions or state ([C] introduces additional helper functions and a lastError variable beyond the strict requirements).

### retry::BvsC::retry-20260511-154755_vs_retry-20260511-154755
- **test_quality**: C — [C] has a broader, more precise test suite (fake timers, call-count assertions, explicit invalid retryAfterMs cases, and clearer timer inspections) so it would catch regressions more reliably.
- **design_quality**: C — [C] has clearer separation of concerns (sleep/computeDelay/retryAfterFromError), better naming and structure, making it easier for a maintainer to reason about and modify.
- **spec_adherence**: tie — Both implementations correctly implement the retry rules (maxAttempts, shouldRetry gating, exponential backoff with jitter, and honoring server-supplied retryAfterMs without added jitter) so neither is superior on correctness.
- **restraint**: B — [[C]] is more minimal and implements the required behavior inline without adding extra helper abstractions or surface area beyond the spec.
