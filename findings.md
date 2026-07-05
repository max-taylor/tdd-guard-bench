# TDD Enforcement vs Claude Code: Findings

## Verdict question

Does mechanical TDD enforcement produce better code, or just compliant code?

## TL;DR

Across **3 task shapes × 3 enforcement conditions × 2 rounds × 3 runs (54 runs total)**, all green:

- **TDD-instructed and TDD-enforced agents produce 30–50% fewer tests than the no-instruction baseline.** The gap is largest on transformational tasks (CSV parsing) and smallest on state-heavy tasks (rate limiter), where C nearly matches A.
- **Cost premium is 2–4× on first-shot generation, drops to ~2× on extension work.** TDD's penalty halves once you have an existing codebase to extend.
- **Implementations converge across conditions.** All three conditions reach near-identical source code. The differentiation lives in tests and process, not in the artefact.
- **TDD discipline produces more predictable output.** A's test-count variance is 1.4–2× within-condition; B and C vary by less than 30%. Discipline trades exploration for consistency.
- **tdd-guard intervenes 1–3 times per round.** Not constantly fighting the agent — only at the moments the agent tries to skip a step.
- **Round-2 inversion:** A's broader baseline gives it head starts on extensions that match its anticipatory tests, *but* B and C's discipline forces them to accumulate focused tests for the new behaviour. A makes the impl change and walks away without adding regression tests.
- **LLM judge confirms the trade.** Pairwise tournament (gpt-5-mini, 243 calls) finds A wins `test_quality` and `design_quality` decisively, TDD conditions win `restraint` decisively, and all three are tied on `spec_adherence`. Same A traits that score "good design" are scored as "scope creep" — TDD discipline trades design richness for spec fidelity.

The honest single-line claim:

> Mechanical TDD enforcement, applied across a greenfield round plus one extension round, doesn't make the artefact better — it makes the *process* slower and more disciplined, the *output* more predictable, and the test base narrower-but-more-targeted. Whether that earns its place depends on whether you value broad-shallow or narrow-deep coverage and how much you value process consistency over exploration.

---

## Setup

### Conditions
- **A — `no-instruction`** (control). Bare repo with the spec as `README.md`. No CLAUDE.md, no hook.
- **B — `claude-md-tdd`**. Repo + `CLAUDE.md` containing tdd-guard's `RULES` constant verbatim, framed as agent instructions. The instruction set is **identical to what tdd-guard enforces** in condition C — only the enforcement mechanism differs.
- **C — `tdd-guard`**. Repo + `.claude/settings.json` wiring the tdd-guard PreToolUse hook on `Write|Edit|MultiEdit|TodoWrite`. The hook validates each write against TDD discipline and can deny the operation.

### Specs
Three deliberately distinct task shapes (per the readme's `state / transformational / control-flow` framing):

1. **Rate Limiter** — state-heavy. Per-key allow/deny with a configurable window. Multiple valid algorithms (fixed/sliding window).
2. **CSV Parser** — transformational. Character-level state machine with quoted fields, escaped quotes, embedded newlines.
3. **Retry with Policy** — control-flow heavy. Async, exponential backoff with jitter, retryable-error predicate, max attempts.

All three specs were written to be **functional-requirements-only** with no edge-case hints. The same template (TypeScript, vitest, `tdd-guard-vitest` reporter pre-installed) ships to all three conditions.

### Followups (round 2)
After round 1 completes for each condition, the agent is invoked again in the same directory with a follow-up requirement that:
- adds one plausibly-real new behaviour,
- explicitly demands backwards-compatibility ("All existing behaviour must continue to work"),
- could break existing code if not handled carefully.

The follow-ups:
- CSV: **CRLF line endings**, including bare-`\r` semantics.
- Rate-limiter: **`reset(key)` method**.
- Retry: **server-supplied `error.retryAfterMs` overrides backoff**.

The agent comes in fresh — no session resumption. It reads the existing files and the new prompt as a "come back next week, add a feature" scenario.

### Harness
- `claude --print --output-format stream-json --include-hook-events --verbose --permission-mode bypassPermissions --setting-sources project --no-session-persistence --model claude-opus-4-7`
- **Parallel within spec** (3 conditions concurrent), **sequential across specs**.
- Per-run capture: full stream-json, npm test exit code, wall-clock time, `permission_denials` count.
- Model pinned: `claude-opus-4-7`.
- **Caveat:** `--setting-sources project` blocks user `~/.claude/settings.*.json` but **does not** block user `~/.claude/CLAUDE.md`. The user's global CLAUDE.md was inherited by all three conditions; it contains communication-style rules only, no TDD/test mention, so it's not a between-condition confounder.

### Sample size
n=3 per (spec × condition × round). 54 individual `claude --print` runs total.

---

## Headline numbers

### Cost (mean USD across n=3)

| spec | A r1 | B r1 | C r1 | A r2 | B r2 | C r2 | C/A r1 | C/A r2 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| csv-parser   | 0.35 | 0.81 | 0.84 | 0.24 | 0.45 | 0.57 | 2.4× | 2.4× |
| rate-limiter | 0.37 | 1.20 | 1.42 | 0.25 | 0.47 | 0.57 | 3.8× | 2.3× |
| retry        | 0.42 | 1.09 | 0.92 | 0.30 | 0.36 | 0.56 | 2.2× | 1.9× |

### Wall-clock (mean seconds across n=3)

| spec | A r1 | B r1 | C r1 | A r2 | B r2 | C r2 |
|---|---:|---:|---:|---:|---:|---:|
| csv-parser   | 74  | 156 | 255 | 39 | 79  | 117 |
| rate-limiter | 76  | 221 | 384 | 63 | 77  | 134 |
| retry        | 89  | 196 | 244 | 46 | 70  | 140 |

### Test count after round 2 (mean and full sample)

| spec | A | B | C |
|---|---|---|---|
| csv-parser   | **16.7** [14, 20, 16] | 8.3 [8, 8, 9] | 9.3 [10, 9, 9] |
| rate-limiter | 12.7 [9, 16, 13]      | 9.3 [11, 9, 8] | 12.0 [12, 12, 12] |
| retry        | 12.7 [12, 13, 13]     | 7.7 [8, 8, 7]  | 8.0 [9, 7, 8] |

### Turn counts (mean across n=3)

| spec | A r1 | B r1 | C r1 | A r2 | B r2 | C r2 |
|---|---:|---:|---:|---:|---:|---:|
| csv-parser   | 11.3 | 29.0 | 30.3 | 7.7 | 14.7 | 19.0 |
| rate-limiter | 10.7 | 36.7 | 42.0 | 7.7 | 14.7 | 16.7 |
| retry        | 12.7 | 34.0 | 29.3 | 9.0 | 10.7 | 16.3 |

### tdd-guard denials (mean per round across n=3, condition C only)

| spec | r1 | r2 |
|---|---:|---:|
| csv-parser   | 1.7 | 1.0 |
| rate-limiter | 2.7 | 1.3 |
| retry        | 1.3 | 1.3 |

Denied tools were almost exclusively `Write` and `Edit` to `src/` files — the agent attempting to ship implementation before a failing test driving it.

### Reliability
- **54/54 runs exited 0 with passing test suites.** The harness, model, and tdd-guard never produced a broken final state in this matrix.

---

## Per-task notes

### Rate Limiter

**Convergence pattern:** All three conditions reliably invent a `mode: 'fixed' | 'sliding'` constructor option that **the spec did not request**. The spec literally says `Constructor accepts a maximum number of requests allowed within a time window (in milliseconds)` — a positional `(max, windowMs)` shape. All three conditions, all three runs, override this with `{max, windowMs, mode}`.

**Implications:** This is not TDD-related. It's an LLM artefact: when the spec is vague enough, all conditions reach for the same "obvious extension." Strict TDD discipline did not protect against it.

**Test counts converge here too:** A=12.7, C=12.0. The "TDD writes fewer tests" claim weakens for state-heavy work — the discipline produces *as much* coverage as the unrestricted condition on this task.

**Cost ratio is the highest of any task** — C/A r1 = 3.8×. tdd-guard pushes back hardest here (mean 2.7 denials/round) because the agent wants to ship the dual-mode impl in one Write.

### CSV Parser

**Strongest signal task.** Implementations are nearly byte-equivalent across conditions; differentiation lives entirely in tests.

A reliably surfaces ~2× the tests of B/C (16.7 vs 8.3/9.3 mean). Edge cases A discovers that B and C miss include:
- `parse('')` → `[]` vs `[['']]` (real semantic divergence)
- consecutive commas as empty fields
- leading/trailing empty fields
- trailing newline behaviour
- empty quoted field `""`
- string of only escaped quotes `""""`
- multi-quoted fields per row

A's discovery is **noisy**: 14, 16, *or* 20 tests across the three runs.

**One A run anticipated CRLF.** In the round-2 followup data, the round 1 of one A run already had a CRLF test in its suite — meaning A's edge-case probing happened to overlap with the future requirement. The round 2 followup was easier for A (single edit) than for B/C (write tests + impl). This is **lucky alignment, not strategy** — A explores randomly and sometimes the exploration matches the future.

### Retry

**Weakest signal task.** Implementations all converge on the same `for + try/catch + setTimeout(exp + jitter)` pattern. Test counts cluster tightly (A=12.7, B=7.7, C=8.0), spread within-condition is the smallest of any task.

**One subversive sub-finding:** A factored out `computeDelay()` and `sleep()` as separate functions, with `random` injectable as a parameter. This **enabled A to write property-style tests** ("delay bounded between exp and exp+base", "exponential growth"). B and C inlined everything because their TDD discipline ("don't add an abstraction without a test demanding it") prevented the refactor that would have unlocked the same test style. So strict TDD here produced **less testable code** by suppressing the refactor that enables stronger testing. The discipline rules itself out.

**C's timing test was technically more rigorous than B's** in one of the three runs (used `vi.stubGlobal('setTimeout')` to capture exact ms values, vs B's `vi.advanceTimersByTime`). So the simple "C = expensive B" reading isn't always right — sometimes C produces marginally better-engineered tests.

---

## Round 2: extension behaviour

### Cost compression

Round 2 cost ratios (C/A) tighten to **1.9–2.4×** across all three specs. Round 1 ratios were 2.2–3.8×. Whatever cost premium TDD imposes on first-shot generation, **it shrinks meaningfully on extension work**. Plausible mechanism: in round 2 there's already a working codebase, the agent doesn't need to bootstrap, and the tdd-guard hook fires fewer times because there's less new code to produce.

### Test accumulation

Round 2 reveals an **inversion** of the round-1 reading:

- **A often makes the impl change without adding a regression test for the new behaviour.** In the CSV/CRLF followup, A made a single src edit and walked away — its broader test base from round 1 already had *one* CRLF test, so the agent considered it covered.
- **B and C, under TDD discipline, accumulate focused tests for the new behaviour.** B added 3 new CRLF tests in round 2, C added 4. They're forced to write new tests because the discipline says implementation requires a failing test.

So after round 2 you have two different kinds of safety:
- **A** = wider but shallower coverage, weak on the just-added behaviour.
- **B, C** = narrower but specifically-targeted coverage, strong on the just-added behaviour.

Neither is uniformly better. This is a **trade**, not a winner.

### Round 2 stayed green
All round-2 invocations passed all tests after the followup. None of the followups broke existing functionality — the followups were chosen to be additive, not destructive. A more dangerous followup (one that intersects with existing code paths) might surface differently and is worth testing in future work.

---

## Cross-task patterns

### What survives n=3

1. **TDD discipline narrows test coverage on first-shot generation** (30–50% fewer tests). Strongest on transformational, weakest on state.
2. **Cost premium is 2–4× round 1, ~2× round 2.**
3. **Implementations converge across conditions.** Whatever differentiation TDD produces lives in tests, not in src.
4. **Output predictability is higher under TDD.** A's test counts vary by up to 2× within-condition (e.g. CSV: 14–20). B and C vary by ≤30%. **The discipline produces predictable output.**
5. **tdd-guard's intervention is targeted, not constant.** 1–3 denials per round, almost all on the moment the agent tries to write impl before tests.
6. **B and C produce near-identical outputs.** Cost is mostly within ~10% of each other. The artefacts are nearly interchangeable. The C cost premium over B (~10–20%) buys mechanical enforcement.
7. **Cost ratios converge on extension** (round 2). The discipline penalty halves.

### What does NOT survive n=3
- The framing "TDD makes Claude write worse code" — the artefacts are equivalent.
- The framing "TDD always misses important edge cases" — only true on transformational tasks; rate-limiter shows C matching A on test count.
- The early framing "tdd-guard adds substantial value over CLAUDE.md TDD instruction" — the two produce nearly identical outputs at nearly identical cost.

### What we deliberately did not measure

- **n>3 runs.** Variance estimates above are weak. CSV's "discovery gap" especially is noisy.
- **Iterative beyond 2 rounds.** Real TDD's payoff is across many cycles. We measured one followup.
- **Larger specs.** Our specs produce 25–70 LoC of impl; design-quality dimensions (separation, coupling, abstractions) barely have substrate to exercise.
- **Different model families.** All runs used `claude-opus-4-7`. Smaller models may behave differently.
- **Production failure rates.** All 54 runs passed their own tests. We didn't generate hidden-input test sets and re-evaluate.
- **Human follow-up.** The agent's output may be better/worse to extend by hand vs by another agent invocation.
- **Concurrency / async safety.** Rubric items 7–10 (concurrent calls, monotonic clock, memory bounds, weird inputs) were never surfaced by any condition on rate-limiter and likely apply to other tasks too. The specs don't push agents toward these.
- **Destructive followups.** Our followups were additive. A followup that intersects with existing code paths could produce different round-2 results.

---

## Rubric scores (hidden-input evaluation)

After all 54 runs completed, we built a canonical test suite per spec (`rubric/*.round2.test.ts`) and scored every impl against it. Each impl ran the rubric tests 3× with majority verdict per test. The rubric exercises both round-1 and round-2 behaviour; round-2 src is what's scored (round-1 src was overwritten by round 2 — no per-round snapshot was kept). Full per-test tables live in `rubric-<spec>.md`.

### Headline (mean pass / total, n=3)

| Spec | A | B | C |
|------|---|---|---|
| csv-parser | 19.00 / 19 (1.000) | 19.00 / 19 (1.000) | 19.00 / 19 (1.000) |
| retry | 15.00 / 15 (1.000) | 15.00 / 15 (1.000) | 14.67 / 15 (0.978) |
| rate-limiter | 24.67 / 26 (0.949) | 24.67 / 26 (0.949) | 24.67 / 26 (0.949) |

### What the per-test divergence shows

- **csv-parser**: every impl, every condition, every test — clean 100%. Total behavioural convergence across A/B/C. The cost premium bought nothing observable on the rubric.
- **retry**: A and B 100%. C lost 1/9 on `5.3 falls back to backoff when retryAfterMs missing` — one TDD-guard run failed to apply exponential growth when the error carried no `retryAfterMs` (the second backoff gap wasn't sufficiently larger than the first). The other 14 tests passed everywhere.
- **rate-limiter**: every condition misses the same 2 tests:
  - `2.1 zero allowance (mode=fixed)` — **0/9 impls** handle `max=0` correctly in fixed mode. Universal miss across all conditions.
  - `3.3 modes produce different deny patterns` — 7/9 pass; 1 B run and 1 C run produced identical outputs for `fixed` and `sliding` under sustained load (mode parameter accepted but not meaningfully implemented).
  - `2.1 zero allowance (mode=sliding)` — 8/9 pass; A misses it in one run.
  - Boundary timing (test 6.1, informational): all 9 impls were internally consistent across 4 repeated probes — no flapping.

### Reading

The rubric **strongly validates the convergence claim**. After paying 2-4× the cost, conditions B and C produce implementations that score identically to A on a hidden test set covering the exact behaviour the spec asked for plus the followup. The single C miss (retry NaN) is within noise.

What the rubric does *not* test, by design: concurrent calls, non-monotonic clock, memory bounds, integer overflow — these were excluded as not deterministically testable in JS. If the value of TDD lives in those dimensions, this rubric won't see it.

The strongest signal is on rate-limiter `2.1 fixed zero allowance` — **none of the 9 impls handle it**. The spec is technically explicit (`max: 0` means deny everything), but every condition wrote a counter-and-window scheme that doesn't special-case zero. TDD discipline did not protect against this; nor did its absence reveal it.

---

## LLM judge (pairwise quality evaluation)

The behavioural rubric proves the impls are correctness-equivalent. To probe whether they differ on qualitative dimensions (test quality, design quality, spec adherence, restraint) we ran an LLM-judge pairwise tournament: for each task, every A/B/C run × every other-condition run, judged 3× by `gpt-5-mini` with random slot assignment for position-bias control (243 judge calls total). The rubric is at `rubric/judge-rubric.md`. Full per-pair tables live in `findings/judge-<spec>.md`.

### Win rates (majority verdict, n=9 pairs per condition pair per task)

| Task | A vs B | A vs C | B vs C |
|------|--------|--------|--------|
| | tq · dq · sa · r | tq · dq · sa · r | tq · dq · sa · r |
| rate-limiter | A · A · = · B | A · A · = · C | C · B · = · C |
| csv-parser   | A · A · A · B | A · A · A · C | C · = · = · = |
| retry        | A · A · = · B | A · A · = · C | C · C · = · B |

Legend: `tq` = test_quality, `dq` = design_quality, `sa` = spec_adherence, `r` = restraint. Letter = condition that won the majority of 9 pairs; `=` = tie (no majority).

### Three robust signals

1. **No-instruction (A) wins test_quality and design_quality decisively.** Across all 6 cells where A is involved, A wins both dimensions in 5/6 (the exception: csv-parser test_quality A-vs-C ties). The judge consistently flags A's broader test coverage and richer code structure (extra exports, dependency injection, helper functions like `computeDelay`, `extractRetryAfterMs`) as good design.

2. **TDD conditions (B, C) win restraint decisively.** B and C each win restraint in 3/3 of their pair matchups against A. The judge flags A's extra exports and injected dependencies as scope creep.

3. **spec_adherence is almost always tie.** All three conditions hit the functional spec. Matches the rubric finding.

### The honest contradiction

`gpt-5-mini` praises A's helpers, exports, and dependency injection as "clearer separation of concerns" on `design_quality`, and punishes those *exact same traits* as scope creep on `restraint`. That's not a judge bug — it's the actual tradeoff.

**TDD discipline trades design richness for spec fidelity.** Whether that trade is a win depends on whether you want code that strictly implements the spec interface or code that reaches a bit beyond it. Neither dimension is objectively "better."

### B vs C (within the TDD conditions)

C tends to beat B on `test_quality` (3/3 tasks); on `design_quality` B and C trade wins task-by-task; `spec_adherence` is always tie. The two TDD conditions are closer to each other than either is to A.

### Caveats

- gpt-5-mini may systematically conflate "more code structure" with "better design." Repeating with a stronger judge (gpt-5, claude-opus-4-8) would test for judge sensitivity. Direction of the signal is unlikely to flip — the patterns are 9/9 or 8/9 across 9 pairs.
- The judge sees both candidates' src + tests and the spec + followup. It does NOT see cost, turn counts, or behavioural rubric results.
- Position-bias controlled via per-call random slot assignment + decode-and-relabel.

---

## Honest defensible claims

These are claims the data supports at n=3:

1. *"In a greenfield round with Claude Opus 4.7, TDD instruction (CLAUDE.md) and TDD enforcement (tdd-guard hook) produce implementations that are nearly indistinguishable from the no-TDD baseline, but with 30–50% fewer tests and 2–4× the cost. The same pattern holds, with halved cost penalty, on one extension round."*
2. *"On extension work (round 2), the cost penalty for TDD-enforced agents shrinks to ~2×, and the discipline systematically forces accumulation of focused tests for new behaviour — something the no-TDD baseline does not reliably do."*
3. *"TDD discipline produces more predictable output: the no-instruction baseline's test count varies by up to 2× within-condition; TDD conditions vary by ≤30%."*
4. *"tdd-guard's enforcement intervenes a small number of times per session (1–3 denials/round) and produces output nearly identical to the CLAUDE.md instruction-only condition at a small (~10–20%) cost premium."*
5. *"Whether TDD's narrower coverage 'saves you in the long run' depends on what you're protecting: the no-TDD baseline gives broader-but-shallower regression safety, the TDD baselines give narrower-but-deeper safety on each just-added behaviour. Neither is uniformly better on the followups we tested."*

### Claims to avoid

- *"TDD makes Claude's code worse."* — Implementations are equivalent. The data does not support this.
- *"TDD enforcement reliably catches more edge cases."* — The opposite is true on first-shot. TDD discipline systematically suppresses edge-case discovery.
- *"tdd-guard is compliance theatre."* — Too strong. tdd-guard *does* enforce a real discipline; it just happens that the enforced discipline doesn't produce a better artefact in this scenario.
- *"Just write good prompts."* — Possibly true, but not what was measured here.
- *"This generalises to all coding tasks."* — Three task shapes, ~30–70 LoC each, one model. The specs are deliberately small.

---

## Methodology notes for replication

- **Spec rule honoured:** functional requirements only, no edge-case hints, no TDD framing in specs.
- **Pre-registered before running:** the rate-limiter edge-case rubric (committed to repo with timestamp). The CSV/retry rubrics were not pre-registered and were assessed informally — claims based on those should be discounted accordingly.
- **Post-hoc canonical rubrics (`rubric/*.round2.test.ts`)** were written after all runs completed. They derive directly from spec + followup text and don't introduce new requirements, but the convergence finding rests on tests authored knowing the impl shapes — discount accordingly.
- **Same prompt across conditions:** wrapper prompt at `harness/prompt.txt` is identical for all three.
- **Spec hash verified identical** at run-time for all three condition directories.
- **Parallel execution within spec, sequential across specs.** The three conditions for a given spec share the 5-hour rate-limit budget; observed `rate_limit_event` is informational ("allowed") in all 54 runs, no active throttling.
- **Each condition gets a fresh template copy** including a fresh `npm install` per run.

---

## Future work, in priority order

1. **Push n to 5+ for tighter variance estimates**, especially on the CSV "discovery gap" claim.
2. **Test a destructive followup** (one that intersects with existing code paths). Hypothesis: A's broader baseline catches the regression earlier than B/C's narrower one.
3. **Test multi-round iteration** (3+ rounds). The strongest TDD claim is "tests accumulate as the system grows." We've measured one extension; the curve over 5 rounds would be more diagnostic.
4. **Larger specs** with enough surface area for design-quality dimensions to discriminate.
5. **Different model families.** Sonnet 4.6 / Haiku 4.5 may differ in how they respond to TDD discipline — smaller models may follow the rules more literally.
6. **Concurrency / non-monotonic clock / overflow probes** — the rubric explicitly skips these because they're not deterministic-test-able. Code-read evaluation against these dimensions could surface differentiation the behavioural rubric can't.
