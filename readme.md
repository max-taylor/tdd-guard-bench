# tdd-guard-bench

**Verdict question:** Does mechanical TDD enforcement produce better code, or just compliant code?

Research harness comparing Claude Code under three TDD-enforcement conditions. Not a product — see `CLAUDE.md` for how the harness works and `findings.md` for the write-up.

**Results:** [findings.md](findings.md)

## Conditions

1. **A — no-instruction** — bare template, control.
2. **B — claude-md-tdd** — TDD rules given as `CLAUDE.md` instructions.
3. **C — tdd-guard** — same rules enforced via the `tdd-guard` PreToolUse hook.

B and C share the same rule set; only the enforcement mechanism differs.

## Running

```bash
./harness/run.sh specs/<name>.md                                  # single spec, 3 conditions in parallel
./harness/run.sh specs/<name>.md --followup followups/<name>.md   # + round-2 extension prompt
./harness/run-all.sh                                               # every (spec, followup) pair
npm run judge                                                      # LLM pairwise judging (needs OPENAI_API_KEY)
```

Each run writes to `runs/<spec>-<timestamp>/{A,B,C}-*/` with a `summary.json` aggregating cost, wall-clock time, hook-denial counts, and test pass/fail.

## Specs

- **rate-limiter** — state-heavy, multiple valid algorithms.
- **csv-parser** — transformational, character-level state machine.
- **retry** — control-flow heavy, async backoff with jitter.

Each spec is functional-requirements-only, with a private grading rubric under `specs/tests/` and `rubric/`, and an optional round-2 followup under `followups/` that demands backwards compatibility.

## Judging

Pairwise LLM comparison (`harness/judge.ts`), cross-family judge (not Claude), condition labels stripped before judging, shuffled order to control position bias.
