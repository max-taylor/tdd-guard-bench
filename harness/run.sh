#!/usr/bin/env bash
# Run a single spec across three TDD-enforcement conditions, in parallel.
#
# Usage:
#   ./harness/run.sh <spec-file> [--model <id>] [--seq] [--keep]
#
# Example:
#   ./harness/run.sh specs/rate-limiter.md
#   ./harness/run.sh specs/rate-limiter.md --model claude-opus-4-7 --seq
#
# Conditions:
#   A = no-instruction  : bare template, no TDD guidance
#   B = claude-md-tdd   : template + CLAUDE.md describing TDD discipline
#   C = tdd-guard       : template + .claude/settings.json with tdd-guard PreToolUse hook
#
# Each run executes Claude Code in fully autonomous mode (bypassPermissions),
# captures the full event stream, runs the test suite at the end, and writes a
# summary.json. The user-global ~/.claude config is NOT loaded (--setting-sources
# project) so results are reproducible across machines.

set -euo pipefail

# ------------------------------------------------------------------ args
SPEC_PATH=""
MODEL="claude-opus-4-7"
SEQUENTIAL=0
KEEP=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model) MODEL="$2"; shift 2 ;;
    --seq)   SEQUENTIAL=1; shift ;;
    --keep)  KEEP=1; shift ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    -*)
      echo "Unknown flag: $1" >&2; exit 2 ;;
    *)
      if [[ -z "$SPEC_PATH" ]]; then SPEC_PATH="$1"; shift
      else echo "Unexpected arg: $1" >&2; exit 2; fi
      ;;
  esac
done

if [[ -z "$SPEC_PATH" ]]; then
  echo "error: spec file path required" >&2
  echo "usage: $0 <spec-file> [--model ID] [--seq] [--keep]" >&2
  exit 2
fi
if [[ ! -f "$SPEC_PATH" ]]; then
  echo "error: spec file not found: $SPEC_PATH" >&2
  exit 2
fi

# ------------------------------------------------------------------ paths
ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
TEMPLATE_DIR="$ROOT/template"
HARNESS_DIR="$ROOT/harness"
SPEC_ABS="$( cd "$( dirname "$SPEC_PATH" )" && pwd )/$( basename "$SPEC_PATH" )"
SPEC_NAME="$( basename "${SPEC_PATH%.*}" )"
TIMESTAMP="$( date +%Y%m%d-%H%M%S )"
RUN_ROOT="$ROOT/runs/$SPEC_NAME-$TIMESTAMP"

# ------------------------------------------------------------------ preflight
command -v claude >/dev/null 2>&1 || { echo "error: 'claude' CLI not on PATH" >&2; exit 1; }
command -v jq     >/dev/null 2>&1 || { echo "error: 'jq' not on PATH" >&2; exit 1; }
command -v node   >/dev/null 2>&1 || { echo "error: 'node' not on PATH" >&2; exit 1; }

[[ -d "$TEMPLATE_DIR" ]] || { echo "error: template/ not found at $TEMPLATE_DIR" >&2; exit 1; }
[[ -f "$HARNESS_DIR/prompt.txt" ]] || { echo "error: harness/prompt.txt missing" >&2; exit 1; }
[[ -f "$HARNESS_DIR/claude-md-tdd.md" ]] || { echo "error: harness/claude-md-tdd.md missing" >&2; exit 1; }
[[ -f "$HARNESS_DIR/settings-tdd-guard.json" ]] || { echo "error: harness/settings-tdd-guard.json missing" >&2; exit 1; }

PROMPT="$( cat "$HARNESS_DIR/prompt.txt" )"

mkdir -p "$RUN_ROOT"
echo "==> run root: $RUN_ROOT"
echo "==> spec:     $SPEC_ABS"
echo "==> model:    $MODEL"
echo "==> mode:     $([[ $SEQUENTIAL -eq 1 ]] && echo sequential || echo parallel)"

# ------------------------------------------------------------------ stage a condition directory
stage_condition() {
  local cond="$1"   # A | B | C
  local label="$2"  # human label
  local dest="$RUN_ROOT/$cond-$label"

  mkdir -p "$dest"
  # Copy template (including dotfiles) but skip node_modules if any.
  rsync -a --exclude='node_modules' --exclude='.git' "$TEMPLATE_DIR/" "$dest/"
  # Drop the spec into the run dir as README.md (overwrites placeholder).
  cp "$SPEC_ABS" "$dest/README.md"

  case "$cond" in
    A) ;; # no extra apparatus
    B) cp "$HARNESS_DIR/claude-md-tdd.md" "$dest/CLAUDE.md" ;;
    C) mkdir -p "$dest/.claude"
       cp "$HARNESS_DIR/settings-tdd-guard.json" "$dest/.claude/settings.json" ;;
    *) echo "unknown condition: $cond" >&2; exit 2 ;;
  esac

  echo "$dest"
}

# ------------------------------------------------------------------ run a single condition
run_condition() {
  local cond="$1"
  local label="$2"
  local dest="$3"
  local logdir="$dest/.harness"
  mkdir -p "$logdir"

  local stream="$logdir/stream.jsonl"
  local stderr="$logdir/stderr.log"
  local meta="$logdir/meta.json"
  local test_out="$logdir/test-output.txt"

  local started ended elapsed exit_code
  started="$( date +%s )"

  # Run Claude in fully autonomous mode. stream-json gives us hook events,
  # token usage, tool calls, and the final result message.
  set +e
  ( cd "$dest" && claude \
      --print \
      --output-format stream-json \
      --include-hook-events \
      --verbose \
      --permission-mode bypassPermissions \
      --setting-sources project \
      --no-session-persistence \
      --model "$MODEL" \
      "$PROMPT" \
      >"$stream" 2>"$stderr"
  )
  exit_code=$?
  set -e

  ended="$( date +%s )"
  elapsed=$(( ended - started ))

  # Run the test suite to capture final pass/fail (independent of agent claims).
  local tests_pass="unknown"
  if [[ -f "$dest/package.json" ]]; then
    set +e
    ( cd "$dest" && npm test --silent -- --run --reporter=verbose ) >"$test_out" 2>&1
    local test_rc=$?
    set -e
    if [[ $test_rc -eq 0 ]]; then tests_pass="true"; else tests_pass="false"; fi
  fi

  # Aggregate stream-json metrics.
  local hook_denials=0
  local total_cost="null"
  local input_tokens="null"
  local output_tokens="null"
  local cache_read="null"
  local cache_create="null"
  local stop_reason="null"
  local num_turns="null"

  if [[ -s "$stream" ]]; then
    # Hook denials: any hook event with decision == "deny" or "block".
    hook_denials="$( jq -s '
      [ .[] | select(.type=="system" and (.subtype // "")=="hook_event")
            | .hook_result.decision // .hook_response.decision // empty ]
      | map(select(. == "deny" or . == "block"))
      | length
    ' "$stream" 2>/dev/null || echo 0 )"

    # Final result event carries usage/cost.
    local result_obj
    result_obj="$( jq -s 'map(select(.type=="result")) | last // {}' "$stream" 2>/dev/null || echo '{}' )"
    total_cost="$( echo "$result_obj"   | jq '.total_cost_usd // null' )"
    input_tokens="$( echo "$result_obj" | jq '.usage.input_tokens // null' )"
    output_tokens="$( echo "$result_obj"| jq '.usage.output_tokens // null' )"
    cache_read="$( echo "$result_obj"   | jq '.usage.cache_read_input_tokens // null' )"
    cache_create="$( echo "$result_obj" | jq '.usage.cache_creation_input_tokens // null' )"
    stop_reason="$( echo "$result_obj"  | jq '.stop_reason // .subtype // null' )"
    num_turns="$( echo "$result_obj"    | jq '.num_turns // null' )"
  fi

  jq -n \
    --arg cond "$cond" \
    --arg label "$label" \
    --arg model "$MODEL" \
    --argjson exit_code "$exit_code" \
    --argjson elapsed_s "$elapsed" \
    --argjson hook_denials "${hook_denials:-0}" \
    --argjson cost_usd "$total_cost" \
    --argjson input_tokens "$input_tokens" \
    --argjson output_tokens "$output_tokens" \
    --argjson cache_read "$cache_read" \
    --argjson cache_create "$cache_create" \
    --argjson num_turns "$num_turns" \
    --argjson stop_reason "$stop_reason" \
    --arg tests_pass "$tests_pass" \
    '{condition:$cond, label:$label, model:$model, exit_code:$exit_code,
      elapsed_s:$elapsed_s, tests_pass:$tests_pass, hook_denials:$hook_denials,
      cost_usd:$cost_usd, input_tokens:$input_tokens, output_tokens:$output_tokens,
      cache_read_input_tokens:$cache_read, cache_creation_input_tokens:$cache_create,
      num_turns:$num_turns, stop_reason:$stop_reason}' \
    > "$meta"

  echo "[$cond/$label] exit=$exit_code  elapsed=${elapsed}s  tests=$tests_pass  denials=$hook_denials"
}

# ------------------------------------------------------------------ stage all three
DEST_A="$( stage_condition A no-instruction )"
DEST_B="$( stage_condition B claude-md-tdd  )"
DEST_C="$( stage_condition C tdd-guard      )"

# ------------------------------------------------------------------ execute
if [[ $SEQUENTIAL -eq 1 ]]; then
  run_condition A no-instruction "$DEST_A"
  run_condition B claude-md-tdd  "$DEST_B"
  run_condition C tdd-guard      "$DEST_C"
else
  run_condition A no-instruction "$DEST_A" &  pid_a=$!
  run_condition B claude-md-tdd  "$DEST_B" &  pid_b=$!
  run_condition C tdd-guard      "$DEST_C" &  pid_c=$!
  wait "$pid_a" || true
  wait "$pid_b" || true
  wait "$pid_c" || true
fi

# ------------------------------------------------------------------ summary
SUMMARY="$RUN_ROOT/summary.json"
jq -s '{spec: $spec, timestamp: $ts, model: $model, runs: .}' \
   --arg spec "$SPEC_NAME" \
   --arg ts "$TIMESTAMP" \
   --arg model "$MODEL" \
   "$RUN_ROOT"/*/.harness/meta.json > "$SUMMARY"

echo
echo "==> summary: $SUMMARY"
jq . "$SUMMARY"
