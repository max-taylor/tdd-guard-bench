# LLM Judge Rubric

You are evaluating two anonymized implementations of the same task. The implementations were produced by autonomous coding agents under different methodologies. You do not know which methodology produced which candidate. Your only goal is to compare the two implementations on the dimensions below and report which is stronger on each, or that they tie.

## Dimensions

### 1. test_quality
Which test suite is more useful as a regression net?
- Coverage of the spec'd behaviour
- Coverage of plausible failure modes the spec implies but doesn't enumerate (boundary values, empty inputs, malformed inputs)
- Quality of assertions (specific vs vague; readable)
- Avoidance of redundant or trivially-passing tests
- Tests that would actually catch a regression if the impl was broken

A wider test suite that is genuinely diagnostic beats a narrower one. A narrower test suite that is sharply targeted beats a wide one that is shallow or redundant.

### 2. design_quality
Which implementation is better-designed as code a maintainer would want to inherit?
- Clarity and readability of the control flow
- Appropriate use of abstractions (not over-engineered, not under-structured)
- Naming, organisation, separation of concerns
- Absence of dead code, redundant branches, copy-paste
- Defensive programming where it earns its keep, absence where it does not

"Better design" does not mean "more abstract". A flat, obvious implementation often beats a clever one.

### 3. spec_adherence
Which implementation more faithfully satisfies what the spec (provided to you below) requires?
- Implements every behaviour the spec describes
- Implements behaviour the spec describes correctly (not just by coincidence)
- Handles boundary conditions consistently with what the spec implies
- Does not skip or partially implement requirements

This is about correctness against the spec, not against best practice in general.

### 4. restraint
Which implementation shows more discipline about NOT doing things outside the spec?
- Did the agent add features the spec didn't ask for?
- Did the agent over-engineer with abstractions, configuration knobs, or generality the spec didn't require?
- Did the agent add error handling for scenarios that can't happen given the spec?
- Did the agent leave clean boundaries vs introduce surface area?

Higher restraint = closer to "exactly what the spec said, nothing more". Lower restraint = scope creep.

## Output format

You must output strict JSON conforming to the schema provided. For each dimension, return `"A"`, `"B"`, or `"tie"`. Include a one-sentence justification per dimension explaining what tipped the verdict.

Do not refer to "candidate A" or "candidate B" by any other name. Do not reveal anything about TDD, testing discipline, or methodology — judge what is in front of you, not what you suspect produced it.
