# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A research harness, not a product. It runs Claude Code in headless mode against the same spec under three TDD-enforcement conditions and captures token cost, wall-clock time, hook-denial counts, and final test pass/fail so the conditions can be compared. Findings are written up by hand in `findings.md`. The verdict question (`readme.md`): does mechanical TDD enforcement produce better code, or just compliant code?

There is no application code to build, lint, or ship. All "code under test" is generated *by* the agent inside `runs/<spec>-<timestamp>/{A,B,C}-*/` and is disposable.

## Running experiments

```bash
./harness/run.sh specs/<name>.md                                  # single spec, 3 conditions in parallel
./harness/run.sh specs/<name>.md --followup followups/<name>.md   # adds a round-2 extension prompt per condition
./harness/run-all.sh                                              # walks every (spec, followup) pair in run-all.sh's SPECS array
./harness/run.sh specs/<name>.md --seq                            # serial conditions (debugging only)
```

Each invocation creates `runs/<spec>-<timestamp>/` with three sibling dirs (`A-no-instruction`, `B-claude-md-tdd`, `C-tdd-guard`) and a `summary.json` aggregating per-run metadata from `*/.harness/meta.json`. Per-run logs (`stream.jsonl`, `stderr.log`, `test-output.txt`) live under each condition's `.harness/`. Round-2 artifacts use a `round2-` prefix; round-1 paths are unchanged.

`runs/` is gitignored and intentionally messy — it accumulates. `findings.md` is hand-curated and is the source of truth for what was learned.

## The three conditions

All three start from the identical `template/` (TypeScript + vitest + `tdd-guard-vitest` reporter pre-installed) with the spec copied in as `README.md`. The only difference between conditions is:

- **A — `no-instruction`**: bare template.
- **B — `claude-md-tdd`**: `harness/claude-md-tdd.md` copied in as `CLAUDE.md`. Contains the same TDD rules `tdd-guard` enforces, presented as instructions only.
- **C — `tdd-guard`**: `harness/settings-tdd-guard.json` copied to `.claude/settings.json`, wiring the `tdd-guard` PreToolUse hook on `Write|Edit|MultiEdit|TodoWrite`.

B and C share the *same rule set* — the only variable is enforcement mechanism (instruction vs hook). Keep this invariant when editing `harness/claude-md-tdd.md` or the `RULES` source it mirrors.

## Reproducibility invariants — do not weaken

These are deliberate and load-bearing for between-condition comparison:

- `--setting-sources project` — blocks user `~/.claude/settings.*.json`. Caveat: it does *not* block user `~/.claude/CLAUDE.md`; the current global is communication-style only and not a confounder, but a future global with TDD/test wording would silently bias B and C convergence.
- `--no-session-persistence`, no `--resume` — round 2 is "come back next week, fresh context."
- `--permission-mode bypassPermissions` — agent runs fully autonomously.
- `--model claude-opus-4-7` is the pinned default. Override with `--model` only for deliberate cross-model comparisons; record it in findings.
- Conditions run in parallel within a spec, sequential across specs (so concurrent API load is comparable across conditions).
- Tests are run *after* the agent exits (`npm test --run`) — `tests_pass` reflects the artifact, not the agent's claim.

## Adding a spec

1. Drop `specs/<name>.md` (functional requirements only — no edge-case hints; `template/README.md` has the shape).
2. Drop `specs/tests/<name>.md` — your private grading rubric (commit *before* running so it's pre-registered).
3. Optional: drop `followups/<name>.md` for a round-2 extension that demands backwards-compatibility.
4. Add `"specs/<name>.md|followups/<name>.md"` to the `SPECS` array in `harness/run-all.sh`.

## Schema notes (summary.json)

- `cost_usd` is the max across `result` events (cost is monotonic; CC sometimes emits a wrap-up follow-up `result`).
- `num_turns`, token counts, and `permission_denials` are *summed* across `result` events.
- `hook_fires` counts every `tdd-guard` invocation (allowed *or* denied); `hook_denials` is the subset that blocked the tool. Only meaningful for condition C.

## Style

The user-global `~/.claude/CLAUDE.md` (terse output, no preamble/postamble, `DONE/NOTE/NEXT` for status) applies here. Don't write planning docs or long summaries unless asked — `findings.md` is the only narrative artifact.
