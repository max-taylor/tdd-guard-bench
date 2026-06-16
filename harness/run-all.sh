#!/usr/bin/env bash
# Run all specs sequentially (each spec parallelises its 3 conditions internally).
# Set-and-forget: walks the SPECS table below in order, invoking run.sh per pair.
#
# Usage:
#   ./harness/run-all.sh [--model <id>] [--no-followup]
#
# Add or remove pairs by editing the SPECS array below. Format: "spec_path|followup_path".
# Use empty followup to skip the second round for that spec: "specs/foo.md|".

set -euo pipefail

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Edit this list to control what runs.
SPECS=(
  "specs/csv-parser.md|followups/csv-crlf.md"
  "specs/rate-limiter.md|followups/rate-limiter-reset.md"
  "specs/retry.md|followups/retry-retry-after.md"
)

# ------------------------------------------------------------------ args
MODEL=""
SKIP_FOLLOWUP=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --model)        MODEL="$2"; shift 2 ;;
    --no-followup)  SKIP_FOLLOWUP=1; shift ;;
    -h|--help)      sed -n '2,9p' "$0"; exit 0 ;;
    *)              echo "Unknown flag: $1" >&2; exit 2 ;;
  esac
done

# ------------------------------------------------------------------ run
overall_started="$( date +%s )"
n_total="${#SPECS[@]}"
n_ok=0
n_fail=0
failed=()

for idx in "${!SPECS[@]}"; do
  pair="${SPECS[$idx]}"
  spec="${pair%%|*}"
  followup="${pair##*|}"

  echo
  echo "======================================================================"
  printf "[%d/%d] spec=%s  followup=%s\n" "$(( idx + 1 ))" "$n_total" "$spec" "${followup:-<none>}"
  echo "======================================================================"

  args=( "$ROOT/$spec" )
  [[ -n "$MODEL" ]] && args+=( --model "$MODEL" )
  if [[ $SKIP_FOLLOWUP -eq 0 && -n "$followup" ]]; then
    args+=( --followup "$ROOT/$followup" )
  fi

  spec_started="$( date +%s )"
  if "$ROOT/harness/run.sh" "${args[@]}"; then
    spec_elapsed=$(( $( date +%s ) - spec_started ))
    n_ok=$(( n_ok + 1 ))
    printf "==> [%d/%d] OK in %ds\n" "$(( idx + 1 ))" "$n_total" "$spec_elapsed"
  else
    spec_elapsed=$(( $( date +%s ) - spec_started ))
    n_fail=$(( n_fail + 1 ))
    failed+=( "$spec" )
    printf "==> [%d/%d] FAIL in %ds (continuing)\n" "$(( idx + 1 ))" "$n_total" "$spec_elapsed"
  fi
done

# ------------------------------------------------------------------ tally
overall_elapsed=$(( $( date +%s ) - overall_started ))
echo
echo "======================================================================"
echo "ALL DONE  total=${overall_elapsed}s  ok=$n_ok  fail=$n_fail"
if (( n_fail > 0 )); then
  echo "failed specs:"
  for s in "${failed[@]}"; do echo "  - $s"; done
fi
echo "Latest runs:"
ls -1t "$ROOT/runs" | head -"$n_total"
