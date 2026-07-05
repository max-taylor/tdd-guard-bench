# LLM judge — csv-parser

Model: `gpt-5-mini`. Runs per pair: 3 (majority verdict per dimension). Position-bias controlled by per-call random slot assignment.

## Win rates by dimension

| Condition pair | Dimension | Cond1 wins | Cond2 wins | Ties | n pairs |
|----------------|-----------|------------|------------|------|---------|
| A vs B | test_quality | 9 | 0 | 0 | 9 |
| A vs B | design_quality | 9 | 0 | 0 | 9 |
| A vs B | spec_adherence | 9 | 0 | 0 | 9 |
| A vs B | restraint | 3 | 6 | 0 | 9 |
| A vs C | test_quality | 9 | 0 | 0 | 9 |
| A vs C | design_quality | 9 | 0 | 0 | 9 |
| A vs C | spec_adherence | 8 | 0 | 1 | 9 |
| A vs C | restraint | 1 | 7 | 1 | 9 |
| B vs C | test_quality | 0 | 7 | 2 | 9 |
| B vs C | design_quality | 4 | 3 | 2 | 9 |
| B vs C | spec_adherence | 0 | 0 | 9 | 9 |
| B vs C | restraint | 0 | 0 | 9 | 9 |

## Per-pair detail

### csv-parser::AvsB::csv-parser-20260511-142614_vs_csv-parser-20260511-142614
- **test_quality**: A — Condition [A] has a larger, more targeted test suite that covers empty input, trailing newline, tricky escaped-quote cases and multiple quoted-field patterns that would catch regressions [B]'s suite would miss.
- **design_quality**: A — Condition [A]'s parser is slightly more careful and defensive (correct final-state handling, avoids unneeded unconditional pushes) and its control flow prevents the subtle bug present in [B].
- **spec_adherence**: A — Condition [A] correctly avoids producing spurious empty rows for empty input or trailing newlines while [B] unconditionally appends a final empty row, violating expected parsing behavior.
- **restraint**: A — Condition [A] implements the required parsing behaviors without introducing extra surface area or surprising outputs, whereas [B]'s unconditional final push produces behavior outside the spec's intent.

### csv-parser::AvsB::csv-parser-20260511-142614_vs_csv-parser-20260511-151126
- **test_quality**: A — Condition [A]'s test suite is broader and more diagnostic — it covers empty input, trailing newlines, empty/leading/trailing fields and several quoted-edge cases that would catch regressions [B]'s tests miss.
- **design_quality**: A — Condition [B]'s parser has a simpler, flatter control flow (single for loop, fewer early-continues) and clearer branching which is easier for a maintainer to follow.
- **spec_adherence**: A — Condition [A] more faithfully implements the spec (notably empty input and trailing-newline handling) while [B] produces spurious empty rows for empty input/trailing newlines.
- **restraint**: A — Condition [A] stays tightly focused on the CSV behaviours in the spec and its tests stay relevant; [B]'s unconditional final push yields behavior (an extra empty row) beyond what the spec implies.

### csv-parser::AvsB::csv-parser-20260511-142614_vs_csv-parser-20260511-153335
- **test_quality**: A — Condition [A]'s test suite is larger and covers many useful edge cases (empty input, empty/trailing/leading fields, escaped-quote-only field, multiple quoted fields) while Condition [B]'s tests are narrower (mostly CRLF-focused) and omit important cases like empty input.
- **design_quality**: A — Condition [A]'s implementation has clearer control flow and safer end-of-input handling (no mixing of for-loop increments and manual i++), whereas Condition [B] mutates the for-loop index and ends with a brittle unconditional push.
- **spec_adherence**: A — Condition [A] correctly implements the spec and follow-up (including returning [] for empty input and preserving CRLF inside quotes), while Condition [B] violates the spec by returning [['']] for empty input.
- **restraint**: A — Condition [A] stays close to the spec without adding unnecessary surface area; Condition [B] introduces an unintended behavior (always emitting a row for empty input) and mixes loop-index mutation that expands surface area unnecessarily.

### csv-parser::AvsB::csv-parser-20260511-151126_vs_csv-parser-20260511-142614
- **test_quality**: A — [A] has a much broader, more diagnostic test suite (empty input, empty/leading/trailing fields, quoted-empty, fully-quoted fields, multiple newlines inside quotes, escaped-quote edge cases) that exercises many plausible failure modes [[A]]'s suite misses.
- **design_quality**: A — [A]'s implementation has clearer, more consistent control flow (while loop with explicit index management, early continues, and a guarded final push) and avoids the end-of-input push bug present in [[A]]; [[A]] is simpler but less robust.
- **spec_adherence**: A — [A] more faithfully implements the spec and reasonable implied behaviors (correct handling of empty input, trailing newline not creating an extra row, varied quoted-field edge cases) while [[A]] can produce spurious empty rows for empty input or trailing newlines.
- **restraint**: B — [[A]] stays closer to the explicit spec and doesn't add many extra behaviors or test cases beyond the requirements, whereas [A] expands scope with many additional cases and behaviors not strictly required. 

### csv-parser::AvsB::csv-parser-20260511-151126_vs_csv-parser-20260511-151126
- **test_quality**: A — Condition [A] provides a much larger, more diagnostic test suite that covers empty input, leading/trailing empty fields, trailing-newline behavior, many quoted-field edge cases, and specific assertions that would catch regressions.
- **design_quality**: A — Condition [A]'s implementation has clearer control flow (explicit index handling, well-structured inQuotes logic and clean termination handling) and avoids the subtle index-modification-in-a-for-loop pattern in [B] that makes reasoning harder.
- **spec_adherence**: A — Condition [A] more completely matches the spec and implied CSV behaviors (preserves bare CR, preserves CRLF inside quotes, treats a trailing newline as not producing an extra empty row, and handles the empty-input case sensibly), whereas [B] returns an extra empty row for empty or trailing-newline inputs.
- **restraint**: B — Condition [B] is more minimal and stays narrowly scoped to parsing logic (no extra export shim/index file) while Condition [A] adds an extra index export and a broader set of behaviors/tests beyond the bare minimum. 

### csv-parser::AvsB::csv-parser-20260511-151126_vs_csv-parser-20260511-153335
- **test_quality**: A — Condition [[A]]'s test suite is broader and more diagnostic — it covers many boundary cases (empty input, empty/leading/trailing fields, trailing newline, fully quoted/only-escaped-quote cases) that would catch regressions Condition [A]'s slimmer suite would miss.
- **design_quality**: A — Condition [[A]]'s implementation has clearer control flow (explicit continues, careful index management), a correct end-of-input check to avoid spurious empty rows, and a tidy export, making it more maintainable and less bug-prone.
- **spec_adherence**: A — Both implementations implement the core CSV rules and CRLF behaviour, but Condition [A] unconditionally appends a final row (producing an extra empty row for empty input or a trailing newline) whereas Condition [[A]] handles these boundary cases correctly.
- **restraint**: B — Condition [A] stays narrowly focused on the spec, while Condition [[A]] adds many extra features and tests (empty-input semantics, many additional edge cases) beyond the explicit requirements. 

### csv-parser::AvsB::csv-parser-20260511-153335_vs_csv-parser-20260511-142614
- **test_quality**: A — Condition [A] has a much broader, more diagnostic test suite (empty input, trailing newline avoidance, many quoted/empty-field edge cases) while [B]'s tests are smaller and miss several plausible failure modes.
- **design_quality**: A — [A]'s implementation, though slightly more complex, defensively handles edge cases (no phantom trailing row, empty input) and avoids subtle bugs that [B]'s simpler code contains.
- **spec_adherence**: A — [A] implements the CSV rules including CRLF handling, quoted multi-line fields and preserves bare CR, and avoids producing a phantom extra row on trailing newlines whereas [B] produces an extra empty row/incorrect result for those cases.
- **restraint**: B — [B] stays closer to a minimal implementation and adds fewer extra behaviors/tests beyond the spec, whereas [A] expands the surface (many additional tests and handling) beyond what was strictly requested.

### csv-parser::AvsB::csv-parser-20260511-153335_vs_csv-parser-20260511-151126
- **test_quality**: A — [A]'s test suite is much broader and more diagnostic—covering empty input, empty/leading/trailing fields, trailing-newline phantom rows, tricky quote sequences and multiple newlines—so it would catch many more regressions than [[A]]'s smaller set (even though [[A]] includes some CRLF tests).
- **design_quality**: A — [A] uses an explicit stateful loop with a clear separation of cases and a deliberate fieldStarted guard to avoid phantom rows, making the control flow more robust and easier to reason about for edge cases than [[A]]'s minimal loop.
- **spec_adherence**: A — [A] implements the required quoted-field, escaped-quote, newline- and CRLF-handling and also correctly avoids producing phantom rows and handles empty input, so it more fully matches the spec and likely implied expectations. 
- **restraint**: B — [[A]] is more minimal and sticks closely to the core parsing logic without adding extra guards/behaviour beyond the spec, whereas [A] adds additional handling and tests (empty-input semantics, fieldStarted flag) that go beyond the written requirements.

### csv-parser::AvsB::csv-parser-20260511-153335_vs_csv-parser-20260511-153335
- **test_quality**: A — Condition [A]'s test suite is broader and exercises many edge cases (empty input, trailing-newline phantom row, empty/odd quoted fields, empty fields) that would catch regressions Condition [B]'s suite misses.
- **design_quality**: A — Condition [A]'s parser is more carefully structured (handles trailing-newline/empty-input with a fieldStarted guard and clear state transitions) while Condition [B]'s simpler final unconditional push leads to incorrect outputs (phantom rows).
- **spec_adherence**: A — Condition [A] correctly implements the CSV rules including quoted fields, escaped quotes, multiline quotes and CRLF handling and avoids phantom rows on empty/trailing-newline input, whereas Condition [B] produces incorrect outputs for empty input and trailing-newline cases.
- **restraint**: B — Neither implementation introduces large unrelated features or abstractions beyond the spec; [A] adds defensive handling and more tests while [B] sticks to a minimal implementation (but with correctness gaps), so overall neither clearly overreaches.

### csv-parser::AvsC::csv-parser-20260511-142614_vs_csv-parser-20260511-142614
- **test_quality**: A — Condition [A]'s tests cover more spec-critical edge cases (empty input, trailing newline, empty quoted field, tricky escaped-quote sequences) that would catch regressions [C]'s suite would miss.
- **design_quality**: A — Condition [A]'s parser is slightly more careful and robust (correct final-state handling, conditional final push, explicit CRLF handling) while [C]'s simpler flow contains a subtle end-of-input bug (unconditional final push).
- **spec_adherence**: A — Condition [A] correctly implements the spec including empty input and trailing-newline semantics and CRLF handling; Condition C produces an extra row for empty input/trailing newlines, violating the spec.
- **restraint**: A — Condition [A] stays focused on the required behaviour without adding extraneous surface area, whereas Condition C's unconditional final push introduces behavior outside the spec (extra empty row).

### csv-parser::AvsC::csv-parser-20260511-142614_vs_csv-parser-20260511-151126
- **test_quality**: A — [A] has a much larger, more diagnostic test suite (empty input, empty/leading/trailing fields, trailing newline, multiple quoted-field cases) that covers many edge and boundary cases [C]'s tests miss.
- **design_quality**: A — [A]'s implementation has clearer control flow (explicit inQuotes block and manual index), better end-of-input handling, and a tidy export, making it easier to read and maintain.
- **spec_adherence**: A — [A] handles the full set of required behaviors plus implied edge cases (empty fields, trailing newline, empty input) more correctly; [C] returns a spurious [['']] for empty input and has a smaller test surface.
- **restraint**: C — [C] stays closer to the minimal spec and tests without adding extra conveniences or exports that [A] introduced ([A] adds extra behaviors and an export file beyond the core requirement).

### csv-parser::AvsC::csv-parser-20260511-142614_vs_csv-parser-20260511-153335
- **test_quality**: A — [A]'s test suite is broader and more diagnostic—covers empty input, trailing newlines, empty/leading/trailing fields and several quoted-field edge cases that would catch regressions [C]'s suite misses.
- **design_quality**: A — [A]'s implementation is slightly better structured and defensive (guards against spurious final empty row, small project export), whereas [C] always pushes a final row unconditionally which is error-prone.
- **spec_adherence**: A — [A] correctly implements quoted fields, escaped quotes, multiline quoted fields, CRLF handling and returns [] for empty input; [C] produces an extra row for empty input/trailing-newline cases and therefore fails parts of the spec.
- **restraint**: C — [A] sticks closely to the spec (including avoiding emitting a spurious final row); [C]'s unconditional final push expands output beyond the spec (extra empty rows) and thus shows less restraint.

### csv-parser::AvsC::csv-parser-20260511-151126_vs_csv-parser-20260511-142614
- **test_quality**: A — [A]'s test suite is broader and more diagnostic (covers empty input, leading/trailing empty fields, quoted-empty, fully-quoted cases, multiple newlines and escaped-quote edge cases) while [C]'s tests are thinner and miss many likely regressions.
- **design_quality**: A — [A]'s implementation has clearer control flow with well-placed early continues and a final check to avoid spurious rows (e.g. from trailing newlines), making it easier to reason about and maintain than [C]'s simpler but error-prone for-loop that unconditionally appends a final row.
- **spec_adherence**: A — [A] correctly implements the required CSV behaviours and also avoids producing an extra empty row for inputs like trailing newlines or empty input, whereas [C] unconditionally appends a final row (yielding [['']] for empty input or an extra empty row for a trailing newline).
- **restraint**: C — [C] sticks closer to the minimal parser and tests required by the spec, while [A] adds extra surface area (an index export file and many additional test cases and behaviors beyond the explicit spec).

### csv-parser::AvsC::csv-parser-20260511-151126_vs_csv-parser-20260511-151126
- **test_quality**: A — Condition [A] has a much more thorough and diagnostic test suite (empty input, trailing newline, many quoted-edge cases and CR/LF variants) while [C]'s tests are narrower and miss important failure modes (e.g. empty input/trailing-newline behavior).
- **design_quality**: A — Condition [A]'s parser code is slightly more robust and explicit (correctly avoids producing spurious rows for empty/trailing-newline inputs) and its control flow and final-commit logic are clearer than [C]'s simpler-but-buggy unconditional final push.
- **spec_adherence**: A — Condition [A] more faithfully implements the spec (including preserving bare CR, CRLF handling, and not creating an extra empty row on empty or trailing-newline input) whereas [C] produces incorrect extra rows in those cases.
- **restraint**: C — Neither implementation introduces significant out-of-spec features — [A]'s small extra re-export and [C]'s minimal implementation are both within reasonable scope, so neither shows clear overreach.

### csv-parser::AvsC::csv-parser-20260511-151126_vs_csv-parser-20260511-153335
- **test_quality**: A — Condition [C] has a much more comprehensive, targeted test suite (empty input, leading/trailing empty fields, trailing-newline behavior, fully quoted/escaped-quote cases and multiple newlines) that would catch many regressions the spec implies.
- **design_quality**: A — Condition [C]'s parser includes a deliberate end-of-input check to avoid spurious empty rows and otherwise has clear, concise control flow, making it easier to maintain and correct in edge cases.
- **spec_adherence**: A — Condition [C] handles the required CSV behaviors plus sensible edge cases (empty input and trailing-newline handling) that Condition C mishandles by unconditionally emitting an extra empty row at end-of-input.
- **restraint**: C — Condition C sticks closer to just the requested functionality and tests the spec examples, while [A] adds extra test cases and an additional index export beyond the minimal spec.

### csv-parser::AvsC::csv-parser-20260511-153335_vs_csv-parser-20260511-142614
- **test_quality**: A — Condition [C]'s test suite is broader and more diagnostic — it covers empty input, empty fields, leading/trailing empties, trailing-newline phantom rows and many quoted-field edge cases that would catch common regressions that [C]'s tests miss.
- **design_quality**: A — Condition [C]'s implementation is more robust and deliberately stateful (avoids phantom trailing rows, preserves empty/quoted-field semantics) making it easier to maintain despite slightly more complex control flow.
- **spec_adherence**: tie — Both implementations correctly implement the required CSV behaviours (commas, newlines, quoted fields, doubled quotes, multi-line quoted fields and CRLF handling) so neither clearly out- or under-implements the spec.
- **restraint**: C — Condition C stays closer to the requested scope and tests only the spec and its CRLF extension, while [A] adds numerous extra behaviours and tests beyond what was asked for.

### csv-parser::AvsC::csv-parser-20260511-153335_vs_csv-parser-20260511-151126
- **test_quality**: A — [A]'s test suite is much more comprehensive—covers empty input, empty/leading/trailing fields, trailing-newline behavior, multiple quoted/newline edge cases and tricky escaped-quote forms—so it would catch more regressions.
- **design_quality**: A — [A]'s implementation has clearer, more maintainable control flow (explicit while loop, inQuotes branch, fieldStarted to avoid phantom rows) and avoids subtle end-of-input bugs present in [C].
- **spec_adherence**: A — [A] implements all required behaviours (commas, quoted fields, escaped quotes, multiline quoted fields, CRLF handling) and also avoids producing a phantom empty row for trailing newlines, whereas [C] would produce an unexpected row for empty input.
- **restraint**: tie — [C] sticks closely to the spec and tests the specified examples (plus CRLF) without adding the broad set of extra edge-case behaviours and test cases present in [A].

### csv-parser::AvsC::csv-parser-20260511-153335_vs_csv-parser-20260511-153335
- **test_quality**: A — Condition [C]'s test suite covers many more edge cases and failure modes (empty input, empty fields, trailing newline, various quoted-field permutations) providing stronger regression protection than [C]'s narrower, mostly spec-example-focused tests.
- **design_quality**: A — Condition [C] uses small, purposeful state (fieldStarted) and explicit final-row logic to avoid phantom rows and handles many corner cases cleanly, making the control flow slightly more complex but clearer and more robust than [C]'s simpler but less defensive code.
- **spec_adherence**: A — Both implementations implement the core CSV and CRLF behaviors, but [A] handles additional important cases (empty input, trailing-newline suppression) that make its behavior more correct and robust against realistic inputs.
- **restraint**: C — Condition C sticks closely to the spec and implements only the required behaviors, while [A] adds extra features and tests (empty-input semantics and extra edge-case handling) beyond the explicit requirements.

### csv-parser::BvsC::csv-parser-20260511-142614_vs_csv-parser-20260511-142614
- **test_quality**: C — [C]'s test suite is broader and more targeted (adds a single-field case and a mixed CRLF/LF case) and its tests are more granular, so it covers extra edge cases that would catch regressions.
- **design_quality**: tie — [C]'s parser has slightly clearer control flow (fewer nested branches) and its tests are organized into more focused cases, making the codebase marginally easier to maintain.
- **spec_adherence**: tie — Both implementations correctly implement the spec features (commas, newlines, quoted fields, escaped quotes, multiline quoted fields, and CRLF behavior) with equivalent behavior.
- **restraint**: tie — Neither candidate adds unnecessary features or heavy abstractions beyond the spec; both stick closely to the required functionality.

### csv-parser::BvsC::csv-parser-20260511-142614_vs_csv-parser-20260511-151126
- **test_quality**: C — [C]'s test suite is slightly more comprehensive (it includes mixed CRLF+LF row-separator coverage and multiple placements of bare CR), so it exercises more of the spec's edge cases.
- **design_quality**: B — [B]'s parser has a clearer separation of inQuotes vs out-of-quotes logic, with fewer repeated conditions and more straightforward control flow, making it easier to read and maintain.
- **spec_adherence**: tie — Both implementations correctly implement the required CSV behaviours (commas, quoted fields, doubled quotes, multiline quoted fields, CRLF as row separator, and preserving bare CR), so neither is measurably more faithful to the spec.
- **restraint**: tie — Neither candidate adds features beyond the spec or over-engineers the solution; both implement the required functionality without unnecessary surface area.

### csv-parser::BvsC::csv-parser-20260511-142614_vs_csv-parser-20260511-153335
- **test_quality**: C — [C]'s test suite includes all the same core examples plus an extra explicit test for mixed CRLF/LF separators and generally has slightly clearer, targeted assertions that would catch regressions.
- **design_quality**: B — [C]'s while/continue style and explicit i += 2 for escaped quotes produces clearer, less error-prone control flow and is easier for a maintainer to follow than [[C]]'s for-loop with implicit increments.
- **spec_adherence**: tie — Both implementations correctly implement quoted fields, doubled-quote escaping, multiline quoted fields, CRLF row separation, and preservation of bare CR, matching the spec and examples.
- **restraint**: tie — Neither candidate adds functionality beyond the spec or introduces unnecessary abstractions—both implement the required behavior straightforwardly.

### csv-parser::BvsC::csv-parser-20260511-151126_vs_csv-parser-20260511-142614
- **test_quality**: C — Condition C's test suite is broader and more targeted (explicit single-field and comma-splitting tests plus a mixed CRLF/LF case), covering more edge cases and likely catching more regressions.
- **design_quality**: tie — The implementations are essentially the same in structure and clarity (simple state machine, clear names, no dead code), so neither shows a maintainability advantage.
- **spec_adherence**: tie — Both implementations correctly handle commas, quoted fields, doubled quotes, multiline quoted fields, CRLF row endings, and bare CR preservation as required by the spec.
- **restraint**: tie — Neither implementation introduces features or defensive complexity beyond the spec; both stay narrowly focused on the required CSV parsing behavior.

### csv-parser::BvsC::csv-parser-20260511-151126_vs_csv-parser-20260511-151126
- **test_quality**: C — Condition C's test suite covers the same core cases as [B] plus an additional mixed CRLF/LF separators test and a clear bare-CR test, giving slightly broader, more diagnostic coverage.
- **design_quality**: B — Condition [B] has a clearer control flow by separating the inQuotes branch up front and using a concise if/else chain, which is easier to read and maintain than [C]'s scattered continues.
- **spec_adherence**: tie — Both implementations correctly implement quoted fields, escaped quotes, multiline quoted fields, CRLF row separators, and preservation of bare CR, satisfying the spec and extension.
- **restraint**: tie — Neither candidate adds functionality beyond the spec or introduces unnecessary abstractions; both implement the required behaviour without notable scope creep.

### csv-parser::BvsC::csv-parser-20260511-151126_vs_csv-parser-20260511-153335
- **test_quality**: C — [C]'s test suite includes all the same core cases plus an explicit mixed CRLF/LF separator test, giving slightly better coverage of plausible line-ending permutations that would catch regressions.
- **design_quality**: C — [C]'s implementation has clearer, linear control flow (explicit index management and early continues) and more straightforward separation of cases, making it easier to read and maintain than [[C]]'s for-loop with scattered increments.
- **spec_adherence**: tie — Both implementations correctly implement the CSV rules including quoted fields, doubled quotes, multi-line quoted fields, CRLF as a separator, and preserving bare CR, so neither has a clear correctness advantage.
- **restraint**: tie — Neither candidate adds functionality beyond the spec nor introduces unnecessary abstractions; both implement the required features without evident scope creep.

### csv-parser::BvsC::csv-parser-20260511-153335_vs_csv-parser-20260511-142614
- **test_quality**: C — [C]'s test suite is slightly more granular and diagnostic (separate single-field and comma/row-splitting tests) while covering the same edge cases [[C]] covers, so it's more useful as a regression net.
- **design_quality**: C — [C]'s parser source is marginally clearer (flat else-if chain, slightly cleaner control flow) while providing the same behavior as [[C]]; [[C]]'s nested branching is a bit harder to read.
- **spec_adherence**: tie — Both implementations correctly implement the spec and extension (commas, newlines, quoted fields, doubled quotes, multiline quoted fields, CRLF as separator, and bare CR preservation) with equivalent behavior.
- **restraint**: tie — Neither candidate adds functionality beyond the spec or introduces unnecessary abstractions — differences are limited to minor test organization and stylistic choices.

### csv-parser::BvsC::csv-parser-20260511-153335_vs_csv-parser-20260511-151126
- **test_quality**: tie — Both test suites exercise the same behaviours from the spec (commas, newlines, quoted fields, escaped quotes, multiline quoted fields, CRLF, bare CR and mixed separators) with specific assertions and no obvious redundant/trivial tests, so neither is clearly stronger.
- **design_quality**: C — Condition C has a slightly clearer, flatter control flow (early continues, explicit !inQuotes checks for separators) and is easier to read and maintain than [[C]]'s more nested branching.
- **spec_adherence**: tie — Both implementations and their tests correctly implement the required CSV behaviours including quoted fields, escaped quotes, multiline quoted fields, CRLF row separators, and preserving bare CR, so they equally satisfy the spec.
- **restraint**: tie — Neither candidate adds functionality beyond the spec or unnecessary configuration/abstractions; both implement the parser logic directly without evident scope creep.

### csv-parser::BvsC::csv-parser-20260511-153335_vs_csv-parser-20260511-153335
- **test_quality**: tie — Both test suites exercise the same set of behaviours (comma separation, newlines, quoted fields, escaped quotes, multiline quoted fields, CRLF, bare CR, and mixed separators) with clear, specific assertions, so neither provides a noticeably stronger regression net.
- **design_quality**: B — [C] has clearer, more explicit control flow (while loop with explicit index increments and continues) that makes quote/escape handling less subtle and easier to follow than [[C]]'s reliance on implicit for-loop increments.
- **spec_adherence**: tie — Both implementations faithfully implement the spec and its CRLF extension (commas, newlines/CRLF as separators, quoted fields, doubled-quote escaping, multiline quoted fields, and preservation of bare CR).
- **restraint**: tie — Neither candidate adds functionality beyond the spec or introduces unnecessary abstraction or error handling; both stick closely to the required parsing behaviour.
