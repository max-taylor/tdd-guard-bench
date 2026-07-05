# LLM judge — rate-limiter

Model: `gpt-5-mini`. Runs per pair: 3 (majority verdict per dimension). Position-bias controlled by per-call random slot assignment.

## Win rates by dimension

| Condition pair | Dimension | Cond1 wins | Cond2 wins | Ties | n pairs |
|----------------|-----------|------------|------------|------|---------|
| A vs B | test_quality | 8 | 1 | 0 | 9 |
| A vs B | design_quality | 7 | 2 | 0 | 9 |
| A vs B | spec_adherence | 0 | 0 | 9 | 9 |
| A vs B | restraint | 3 | 6 | 0 | 9 |
| A vs C | test_quality | 6 | 3 | 0 | 9 |
| A vs C | design_quality | 8 | 1 | 0 | 9 |
| A vs C | spec_adherence | 1 | 0 | 8 | 9 |
| A vs C | restraint | 1 | 7 | 1 | 9 |
| B vs C | test_quality | 0 | 9 | 0 | 9 |
| B vs C | design_quality | 9 | 0 | 0 | 9 |
| B vs C | spec_adherence | 0 | 0 | 9 | 9 |
| B vs C | restraint | 0 | 9 | 0 | 9 |

## Per-pair detail

### rate-limiter::AvsB::rate-limiter-20260511-143320_vs_rate-limiter-20260511-143320
- **test_quality**: B — Condition [A]'s tests explicitly cover the required reset behaviour (for both modes) and basic failure modes while Condition [[A]], although having stronger timing/boundary checks, omits any tests for reset so [[A]]'s suite is more directly protective of the spec extension.
- **design_quality**: A — Condition [[A]]'s implementation is slightly cleaner and more efficient (sliding window trims with a single slice/index instead of repeated shifts, clearer naming) while remaining straightforward and readable.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes, per-key tracking, and the required reset semantics, matching the spec's behaviors and boundary treatment.
- **restraint**: A — Condition [[A]] sticks closely to the spec (uses Date.now, no extra test hooks or extra API surface), whereas Condition [A] added an injected now() option beyond the required interface.

### rate-limiter::AvsB::rate-limiter-20260511-143320_vs_rate-limiter-20260511-151731
- **test_quality**: A — Condition [A]'s test suite is broader and checks many edge cases (window boundaries, mid-window behaviour, half-open semantics, independent keys) making it more likely to catch regressions, whereas [B]'s suite is smaller (though it does include a reset test and deterministic time injection).
- **design_quality**: B — Condition [B] has a cleaner, more testable design (injectable now() for deterministic timing) and consistent, simple control flow, making it easier to maintain and test than [A]'s direct Date.now usage.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes and the per-key reset behaviour as required, including the intended boundary semantics, so neither is clearly more faithful to the spec.
- **restraint**: A — Condition [B] adds an extra now() injection option (useful but outside the requested surface), while Condition [A] implements only the required API without extra configuration. 

### rate-limiter::AvsB::rate-limiter-20260511-143320_vs_rate-limiter-20260511-153908
- **test_quality**: A — Condition [A] provides a broader, more detailed test suite (fake timers, window-boundary and half-open interval edge cases, independent-key tests) that would catch more regressions than [B]'s narrower suite.
- **design_quality**: B — Condition [B] has a slightly cleaner design for maintainers (injectable now() for testability and clearer sliding-window filtering) versus [A]'s micro-optimized but more complex pruning logic and direct Date.now usage.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes, per-key tracking, and the required reset(key) behaviour, including proper handling of window boundaries.
- **restraint**: A — Condition [A] sticks closely to the spec surface, while [B] adds an extra constructor option (now) that expands the public surface beyond the requested interface.

### rate-limiter::AvsB::rate-limiter-20260511-151731_vs_rate-limiter-20260511-143320
- **test_quality**: A — Condition [[A]] has a substantially more thorough and diagnostic test suite (construction validation, more sliding/fixed edge cases, clock manipulation and default-clock test) that would catch more regressions than [[A]]'s narrower tests.
- **design_quality**: A — Condition [[A]] is better organized and defensive (clearer naming, separate maps per mode, constructor validation, small helper clock in tests and explicit exports), making it easier for a maintainer to understand and extend.
- **spec_adherence**: tie — Both implementations meet the functional requirements including reset, but [A] more comprehensively exercises edge cases and validates inputs, giving stronger confidence it meets the spec across scenarios.
- **restraint**: B — Condition [A] implements only the required behaviour with minimal extra surface area, whereas [A] adds input validation and extra exports/tests beyond the strict spec requirements.

### rate-limiter::AvsB::rate-limiter-20260511-151731_vs_rate-limiter-20260511-151731
- **test_quality**: A — [A] has a much more comprehensive test suite (constructor validation, more fixed/sliding edge cases, reset for both modes, default clock) that would catch regressions [[A]]'s smaller suite misses.
- **design_quality**: A — [A]'s implementation is slightly more maintainable—clearer constructor validation, explicit types/exports and organized structure—making intent and failure modes easier to reason about.
- **spec_adherence**: tie — Both implementations correctly implement per-key tracking, fixed and sliding semantics, and the per-key reset behaviour required by the spec.
- **restraint**: B — [[A]] sticks closer to the requested surface area (no extra validation/exports); [A] adds input validation and extra surface that go beyond the explicit spec. 

### rate-limiter::AvsB::rate-limiter-20260511-151731_vs_rate-limiter-20260511-153908
- **test_quality**: A — Condition [A] provides a much more thorough and diagnostic test suite (constructor validation, many fixed/sliding edge cases, independent keys, reset no-op, default clock) while Condition [B]'s tests are smaller and miss several failure modes and boundaries.
- **design_quality**: A — Condition [A] shows clearer structure and defensive programming (runtime validation of options, explicit now injection, well-named private maps and methods) making it easier to read and maintain than [B].
- **spec_adherence**: tie — Condition [B] implements fixed windows as globally-aligned discrete windows (Math.floor(t/windowMs)*windowMs) which matches the spec's 'discrete time windows' intent, whereas [A] anchors windows to the first request per key and thus deviates from typical fixed-window semantics.
- **restraint**: B — Condition [B] sticks closer to the minimal spec surface (no extra runtime validation or added helpers), while Condition [A] adds constructor validation and extra behavior beyond the bare requirements.

### rate-limiter::AvsB::rate-limiter-20260511-153908_vs_rate-limiter-20260511-143320
- **test_quality**: A — Condition [[A]]'s test suite is larger and more targeted — it checks window-alignment, exact cutoff edge cases, default clock behavior, and more boundary scenarios that would catch regressions beyond the basic cases in [[A]].
- **design_quality**: A — Condition [[A]] has clearer naming and separation (fixedBuckets/slidingTimestamps), a more efficient timestamp-trimming implementation (compute-and-splice vs repeated shift), and a slightly more modular export layout, making it easier to maintain.
- **spec_adherence**: tie — Both implementations correctly implement per-key tracking, fixed and sliding semantics, and the required reset behavior, and their tests validate the same functional requirements from the spec.
- **restraint**: B — Condition [A] sticks closely to the required functionality with a minimal file surface and no extra exports or ancillary construction tests, while [A] adds small extras (re-export file, additional tests/fixtures) beyond the spec.

### rate-limiter::AvsB::rate-limiter-20260511-153908_vs_rate-limiter-20260511-151731
- **test_quality**: A — Condition [A] has a much more thorough test suite that covers boundary/window-alignment cases, sliding-window aging edge cases, reset semantics (including no-op for unknown keys) and the default clock, whereas [B]'s tests are simpler and miss several of these important edge cases.
- **design_quality**: A — Both implementations are similar, but [A] is slightly clearer (explicit RateLimiterMode type, explicit now binding, well-named helper methods and an index exporter) which aids readability and maintainability.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes, per-key tracking and the reset behaviour from the spec; neither misses a required behaviour.
- **restraint**: B — Neither implementation introduces large out-of-spec features — both only add a small optional clock hook and implement the requested reset without unnecessary surface area.

### rate-limiter::AvsB::rate-limiter-20260511-153908_vs_rate-limiter-20260511-153908
- **test_quality**: A — Condition [A] includes a much more comprehensive and targeted test suite (boundary window alignment, sliding strictness, reset for both modes, no-op reset, default clock) that would catch more regressions than [B]'s smaller, shallower set.
- **design_quality**: A — Condition [A] has clearer naming, a small export barrel, well-separated private methods and an efficient in-place trimming of sliding timestamps, making it easier to read and maintain.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding semantics, per-key tracking, and the per-key reset behaviour required by the spec.
- **restraint**: B — Condition [B] is slightly more minimal and doesn’t introduce the small extra surface (additional export file and micro-optimizations) present in [A], keeping closer to the core spec. 

### rate-limiter::AvsC::rate-limiter-20260511-143320_vs_rate-limiter-20260511-143320
- **test_quality**: C — Condition C's test suite covers the reset behaviour from the follow-up plus more explicit boundary and interaction cases (including no-op reset), giving stronger regression protection than [A]'s suite which omits reset tests.
- **design_quality**: A — Condition [A] has clearer separation of concerns (private helpers for modes), explicit TypeScript types/readonly fields and slightly cleaner naming/organisation, making it easier to maintain.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes and the per-key reset semantics required by the spec; neither omits or misimplements the specified behaviours.
- **restraint**: tie — Condition [A] stays closer to a minimal, focused implementation with tidy abstractions and no evident scope creep, whereas [C] includes small extra surface (less-typed public shapes and similar duplication).

### rate-limiter::AvsC::rate-limiter-20260511-143320_vs_rate-limiter-20260511-151731
- **test_quality**: C — [C] has a larger, more targeted test suite (including reset behaviour, unseen-key noop, and additional edge cases) that would catch regressions the spec implies; [A]'s tests miss the reset cases and are slightly narrower.
- **design_quality**: C — [C] is marginally better organised (clearer file layout/exports and slightly clearer control flow), with equivalent implementations but a cleaner module surface for maintainers.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding semantics per-window and provide the required per-key reset behaviour with appropriate handling of unseen keys.
- **restraint**: A — [A] sticks closer to the minimal spec (no extra barrel export and fewer extraneous tests/features), while [C] adds a small index re-export and a few extra test cases beyond the strict requirements.

### rate-limiter::AvsC::rate-limiter-20260511-143320_vs_rate-limiter-20260511-153908
- **test_quality**: C — Condition C's test suite explicitly covers the required reset behaviour (including no-op), exercises both modes, and checks cross-key isolation, making it a more complete regression net for the full spec extension.
- **design_quality**: A — Condition [C] uses clearer organization and a slightly cleaner, more efficient sliding-window cleanup (scan+slice vs repeated shift), and its tests are well-structured into mode-specific suites.
- **spec_adherence**: tie — Both implementations and their code correctly implement fixed and sliding modes, per-key tracking, and the reset(key) behaviour required by the spec.
- **restraint**: C — Condition C stays closer to a simple, direct implementation and tests the spec's requirements without the small optimizations and extra boundary-focused assertions that [A] introduced.

### rate-limiter::AvsC::rate-limiter-20260511-151731_vs_rate-limiter-20260511-143320
- **test_quality**: A — [A]'s test suite is broader and more diagnostic — it validates constructor errors, default-clock behavior, mid-window edge cases and timestamp-aging scenarios in addition to the core cases covered by [C], so it would catch more regressions.
- **design_quality**: A — [A] has clearer separation of concerns (allowFixed/allowSliding), option validation, a pluggable clock for deterministic testing, and overall cleaner, more maintainable structure than [C]'s smaller but flatter implementation.
- **spec_adherence**: tie — Both implementations correctly implement per-key tracking, fixed and sliding behaviour, and the reset(key) requirement with matching observable behaviour, so neither is meaningfully more faithful to the spec.
- **restraint**: C — [C] implements the requested functionality with minimal surface area, whereas [A] adds extra features (option validation, an injectable clock, an export file) beyond the spec.

### rate-limiter::AvsC::rate-limiter-20260511-151731_vs_rate-limiter-20260511-151731
- **test_quality**: A — Condition [A] supplies a broader, more targeted test suite (constructor validation, default clock, mid-window behavior, and detailed sliding+reset cases) that exercises edge cases and would catch regressions more effectively.
- **design_quality**: A — Condition [A] is better structured for maintainability — it validates inputs, injects a controllable clock for testability, and keeps clear per-mode data structures and methods.
- **spec_adherence**: tie — Condition C implements fixed windows as epoch-aligned discrete windows (Math.floor(now/windowMs)*windowMs), which more directly matches the spec's "discrete time windows" interpretation.
- **restraint**: C — Condition C sticks closer to the requested surface area (no optional clock injection or extra validation logic), while Condition [A] adds convenience/test features beyond the spec.

### rate-limiter::AvsC::rate-limiter-20260511-151731_vs_rate-limiter-20260511-153908
- **test_quality**: A — Condition [C]'s test suite is broader and more diagnostic — it validates constructor errors, exercises mid-window boundary behavior, injects a deterministic clock, and checks default-clock behavior, catching more plausible regressions than [C]'s suite.
- **design_quality**: A — Condition [C] shows clearer organization, better naming, input validation and a pluggable clock for testability, making it easier to maintain than [C]'s flatter implementation.
- **spec_adherence**: tie — Condition C implements the fixed-window semantics as discrete windows aligned to epoch boundaries as implied by the spec, whereas [A] uses per-key window starts (anchored to first request) which deviates from the described fixed-window behaviour.
- **restraint**: C — Condition C sticks closely to the requested API and behaviour, while Condition [C] adds extra features (input validation, injectable clock, extra exports) beyond the spec. 

### rate-limiter::AvsC::rate-limiter-20260511-153908_vs_rate-limiter-20260511-143320
- **test_quality**: A — Condition [A]'s test suite is broader and more diagnostic — it covers window-boundary alignment, strict ageing semantics, reset no-op and default-clock behavior, catching edge cases Condition C's tests miss.
- **design_quality**: A — Condition [A] has clearer structure and naming (separate allowFixed/allowSliding methods), explicit TypeScript types and an injectable clock for testability, making it easier to read and maintain.
- **spec_adherence**: A — Both implementations meet the functional requirements (modes, per-key tracking, reset), but Condition [A] more fully exercises and encodes the spec (including default Date.now behaviour and precise window semantics).
- **restraint**: C — Condition C stays closer to the minimal spec surface (no test-only clock injection or extra exports) while Condition [A] adds a now hook and extra wiring that go beyond the strict requirements.

### rate-limiter::AvsC::rate-limiter-20260511-153908_vs_rate-limiter-20260511-151731
- **test_quality**: A — [A]'s test suite is more thorough and diagnostic — it includes finer boundary checks for sliding windows, verifies window-aligned semantics and the default Date.now behaviour, and is better organized, whereas [C]'s tests are good but cover fewer edge cases.
- **design_quality**: A — [A]'s implementation is cleaner and more maintainable (injectable clock for testability, in-place timestamp maintenance, clearer separation and naming), while [C] is simpler but less flexible.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes, per-key tracking, and the reset behaviour as required by the spec.
- **restraint**: C — [C] sticks closely to the requested API and behaviour, while [A] adds an extra optional now clock in the constructor (useful but beyond the spec).

### rate-limiter::AvsC::rate-limiter-20260511-153908_vs_rate-limiter-20260511-153908
- **test_quality**: A — [A]'s test suite is more comprehensive and targeted—it exercises tricky boundary cases (exact window boundaries, precise sliding cutoff behavior), isolates modes with clear describe blocks, and includes a default-clock construction test, so it's more likely to catch regressions.
- **design_quality**: A — [A] shows cleaner design (injectable clock for deterministic tests, small performance-minded pruning using splice instead of repeated shift, clearer exports and types), making it easier to maintain and reason about.
- **spec_adherence**: tie — Both implementations correctly implement per-key tracking, fixed and sliding semantics, and the new per-key reset behaviour as required by the spec.
- **restraint**: C — [C] sticks closely to the requested API and behaviour, whereas [A] adds extras (an injectable now() clock and an index export) beyond the spec. 

### rate-limiter::BvsC::rate-limiter-20260511-143320_vs_rate-limiter-20260511-143320
- **test_quality**: C — Condition C's tests exercise more boundary conditions and sequences (fake timers, window-boundary cases, full re-capacity after reset, and separate-key checks), giving better regression coverage.
- **design_quality**: B — Condition [B]'s implementation is better structured and documented (clear types, injected now() for testability, and separated allowFixed/allowSliding methods), which improves readability and maintainability.
- **spec_adherence**: tie — Both implementations correctly implement per-key tracking, fixed and sliding semantics, and the per-key reset behavior as specified with no observable deviations.
- **restraint**: C — Condition [B] introduces extra testability support (now injection) and additional abstractions beyond the spec, while Condition C sticks closer to the requested surface area.

### rate-limiter::BvsC::rate-limiter-20260511-143320_vs_rate-limiter-20260511-151731
- **test_quality**: C — Condition C's tests cover the same behaviors as [B] plus additional nuanced cases (e.g., sliding behaviour across window boundaries), and use fake timers to exercise time-based transitions, giving broader regression coverage.
- **design_quality**: B — Condition [B] has a cleaner internal API (injectable now()), clearer separation of concerns and well-named structures which improves testability and maintainability.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes, per-key tracking, and the required reset behaviour as exercised by their tests.
- **restraint**: C — Condition C sticks closely to the requested surface (RateLimiter + reset, plus an index export), while [B] adds an extra now() injection option beyond the spec. 

### rate-limiter::BvsC::rate-limiter-20260511-143320_vs_rate-limiter-20260511-153908
- **test_quality**: C — Condition C's test suite is more thorough (uses fake timers for precise timing, checks more edge cases like configurable max and cross-boundary sliding behaviour, and asserts post-reset capacity), making it more likely to catch regressions.
- **design_quality**: B — Condition [C]'s implementation is slightly better structured for maintainability and testability (injectable now() for deterministic timing, clear separation of fixed/sliding state, and in-place map mutation avoids needless map writes).
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes, per-key tracking, and the per-key reset behaviour as required by the spec with no observable deviations.
- **restraint**: C — Condition [C] adds an extra injectable now() option (useful but beyond the spec), whereas Condition C sticks closer to the minimal required surface area.

### rate-limiter::BvsC::rate-limiter-20260511-151731_vs_rate-limiter-20260511-143320
- **test_quality**: C — Condition C's test suite is more comprehensive and targeted — it covers both modes, window boundaries, sliding aging, reset behaviours (including no-op and key-isolation) and uses fake timers for precise control, so it would catch more regressions.
- **design_quality**: B — Condition [B] has clearer separation of concerns (private allowFixed/allowSliding), better naming, readonly fields and an injectable now() for testability, making it easier to read and maintain.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding semantics per key and the required reset(key) behaviour, with no observable violations of the spec.
- **restraint**: C — Condition C implements only the requested behaviour concisely, while Condition [B] adds extras like an injected now() option and a public options interface beyond the spec. 

### rate-limiter::BvsC::rate-limiter-20260511-151731_vs_rate-limiter-20260511-151731
- **test_quality**: C — [C] has a broader, more diagnostic test suite (fake timers, reset behaviour for sliding mode, no-op and per-key reset checks) that would catch more regressions than [[C]]'s narrower tests.
- **design_quality**: B — [[C]] shows better design-for-testability and clarity by injecting a now() function and keeping mode-specific logic simple and well-separated.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding semantics, per-key tracking, and the required reset behaviour, with no observed deviation from the spec.
- **restraint**: C — [C] sticks closely to the requested API (no test-injection hooks) and only adds a small index/type export, whereas [[C]] widens the public options with a now hook that the spec did not request.

### rate-limiter::BvsC::rate-limiter-20260511-151731_vs_rate-limiter-20260511-153908
- **test_quality**: C — Condition C has a broader, more thorough test suite (both modes, reset behaviour including no-op and per-key isolation, boundary/time-advance cases, and fake-timer usage) while [B]'s tests are smaller and omit several edge and reset cases.
- **design_quality**: B — Condition [B]'s implementation is slightly cleaner and more maintainable — it accepts an injected clock for testability and trims sliding-window stamps with an index+slice (avoiding repeated shifts), leading to clearer control flow and better performance characteristics.
- **spec_adherence**: tie — Both implementations correctly implement per-key tracking, fixed and sliding window semantics, and the per-key reset API as required by the spec with consistent window calculations.
- **restraint**: C — Condition C implements only the requested options and behaviour, whereas [B] adds an extra optional now() dependency-injection parameter (useful but beyond the spec).

### rate-limiter::BvsC::rate-limiter-20260511-153908_vs_rate-limiter-20260511-143320
- **test_quality**: C — Condition C has a broader and more rigorous test suite (uses fake timers, tests reset for both modes, tests no-op reset and per-key isolation) that would catch more regressions than [[C]]'s narrower tests.
- **design_quality**: B — Condition [C] has clearer typing, a pluggable now() for deterministic testing, and neatly separated fixed/sliding logic making it easier to read and maintain.
- **spec_adherence**: tie — Both implementations correctly implement fixed and sliding modes, per-key tracking, and the per-key reset semantics required by the spec with no observable deviations.
- **restraint**: C — Condition C implements the required features without adding extra injection/configuration (no now() hook) or other surface area beyond the spec.

### rate-limiter::BvsC::rate-limiter-20260511-153908_vs_rate-limiter-20260511-151731
- **test_quality**: C — Condition C's test suite is larger and more thorough (fake timers, more edge cases, reset for sliding mode and no-op behavior) and would catch more regressions than [[C]]'s smaller, less-complete tests.
- **design_quality**: B — Condition C's implementation has slightly clearer naming, cleaner separation (passing now into private helpers, concise timestamp trimming) and a tidy export surface, making it marginally easier to maintain.
- **spec_adherence**: tie — Both implementations correctly implement fixed/sliding semantics, per-key tracking, and the reset API from the spec with no observable departures in behavior.
- **restraint**: C — Condition [C] added an optional now() injection (helpful but outside the spec), whereas [C] stays closer to the requested surface (only a small index export), so [C] shows marginally more restraint.

### rate-limiter::BvsC::rate-limiter-20260511-153908_vs_rate-limiter-20260511-153908
- **test_quality**: C — Condition C has a broader, more diagnostic test suite (fake-timer setup, sliding and fixed edge cases, reset for sliding, unknown-key no-op and per-key isolation) that would catch more regressions than [[C]]'s narrower tests.
- **design_quality**: B — Condition [C]'s implementation is slightly more maintainable (injectable now() for deterministic time in tests, clear types and separation of concerns) making it easier to reason about and test.
- **spec_adherence**: tie — Both implementations correctly implement per-key tracking, fixed and sliding behaviours, and the per-key reset semantics required by the spec.
- **restraint**: C — Condition C sticks closely to the spec surface without adding extras (no injected now() or expanded public types) while [[C]] introduces extra testability API surface beyond the requirements.
