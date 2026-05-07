**Verdict question:** Does mechanical TDD enforcement produce better code, or just compliant code?

**Three conditions** (n=3-5 runs each):
1. No TDD instruction (control)
2. CLAUDE.md with TDD rules
3. tdd-guard hook installed

**Task:** Greenfield, design-rich, tight spec. Lead candidate: rate limiter (multiple valid algorithms — token bucket, sliding window, leaky bucket — design quality differentiates clearly).

**Spec rule:** Functional requirements only. No edge case hints. Let each condition surface its own.

**Pre-register before running** (commit to repo with timestamp):
- Spec given to agent
- Edge case list (your grading rubric — withheld from agent)
- Expected verdict (your gut prediction)
- Judge rubric and prompt
- Versions locked: model, CC, tdd-guard

**Harness:** Bash script, ~50 lines. Fresh git worktree per run. CC headless mode, same prompt every time. Parallelize.

**Per run, capture:**
- Final source + tests
- Test pass/fail
- Wall-clock time, token count
- Guard intervention count + content (condition 3 only)

**Judging:**
- Direct API, not CC. Temp 0, structured JSON.
- Cross-family judge (OpenAI or Google), NOT Claude. Optionally run two judges and report agreement.
- Pairwise comparison, shuffled order to control position bias.
- Strip condition labels (A1-A5, B1-B5, C1-C5) before judging — blind only.

**Measurement, two layers:**

Objective (programmatic):
- Spec adherence (line-by-line)
- Edge cases independently surfaced vs your pre-registered list
- Tests passing at end
- Cyclomatic complexity (radon, complexity-report)
- Guard intervention count

Judgment (LLM judge):
- Test quality — behavior vs implementation detail, brittleness
- Design quality — coupling, separation, simplicity
- Over-engineering — abstractions justified by spec

Don't measure: test count, coverage %, maintainability, scalability. Snapshot evals can't see those.

**Gate before storyboarding:** Lock one of these as the close.
- Kept: hook produces measurably better code → "earns its place"
- Conditional: same final quality, different paths → "compliance theatre"
- Dropped: both fine, hook is friction → "just write good prompts"
