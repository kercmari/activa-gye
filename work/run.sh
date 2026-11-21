#!/usr/bin/env bash
# Usage: work/run.sh <name> <haiku|sonnet|opus> <brief.md> [max-usd]
# Runs one headless agent from a brief. Launched by the owner only.
# The whole body is inside main(), called on the last line: editing this file while it runs cannot break it.
main() {
set -euo pipefail

  name="${1:?name}"; model="${2:?model}"; brief="${3:?brief}"; budget="${4:-5}"
  case "$model" in haiku|sonnet|opus) ;; *) echo "model must be haiku|sonnet|opus" >&2; exit 2;; esac
  [ -f "$brief" ] || { echo "brief not found: $brief" >&2; exit 2; }

  root="$(cd "$(dirname "$0")/.." && pwd)"
  cd "$root"
  out="work/out/$name"
  mkdir -p "$out"

  prompt="Read $brief and do exactly what it says. Follow work/TOKEN-PROTOCOL.md. Do all the work yourself, never delegate, run long commands in the foreground. Do not stop until the deliverable is committed and gates are green, or you are truly blocked. You ARE the run for this brief: other claude processes on this machine belong to other briefs or projects; never wait for them and never treat yourself as a second run."
  # Retry from work/chain.sh: continue the previous attempt instead of starting over.
  if [ "${RUN_RESUME:-0}" = "1" ]; then
    prompt="$prompt RESUME, DO NOT RESTART: a previous attempt of this brief was cut. Check git log, git status and $out/ first, keep what is already done and committed, and finish only what is missing."
  fi

  # Cap test runners: jest already runs --runInBand; keep node and pytest modest.
  export NODE_OPTIONS="--max-old-space-size=4096"
  export PYTEST_ADDOPTS="-p no:xdist"
  export CI=1

  # Own cap: 60 min (the chain adds a 90-min outer cap).
  cmd=(timeout --kill-after=60 "${RUN_CAP_SECONDS:-3600}" claude -p "$prompt"
    --model "$model"
    --permission-mode acceptEdits
    --disallowedTools Agent
    --allowedTools Bash Read Edit Write Grep Glob
    --max-budget-usd "$budget"
    --output-format stream-json --verbose)

  # Cap CPU and memory when a user systemd instance is available.
  if command -v systemd-run >/dev/null && systemctl --user is-system-running >/dev/null 2>&1; then
    cmd=(systemd-run --user --scope --quiet -p MemoryMax=8G -p CPUQuota=600% -- "${cmd[@]}")
  fi

  echo "[run.sh] $name · $model · $brief · max \$$budget → $out/stream.jsonl"
  set +e
  "${cmd[@]}" > "$out/stream.jsonl"
  status=$?
  set -e

  jq -c 'select(.type=="result")' "$out/stream.jsonl" | tail -1 > "$out/result.json" || true
  jq -r '.result // empty' "$out/result.json" > "$out/final.txt" 2>/dev/null || true

  echo "[run.sh] exit=$status"
  jq -r '"cost_usd=\(.total_cost_usd // "?")  turns=\(.num_turns // "?")  subtype=\(.subtype // "?")"' "$out/result.json" 2>/dev/null || echo "no result line"
  echo "--- final.txt ---"; cat "$out/final.txt" 2>/dev/null || true
  return "$status"
}

main "$@"
