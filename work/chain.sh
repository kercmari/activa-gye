#!/usr/bin/env bash
# Usage: work/chain.sh <block-file>
# Runs a fixed, ordered block of briefs with work/run.sh (chain rules, 2026-10-17).
#
# Block line:  <name> <haiku|opus> <brief.md> [max-usd] [after=a,b] [wt=<path>] [final]
#   after=  briefs it depends on (paused if any of them failed)
#   wt=     worktree it runs in (default: this repo); briefs sharing a failed
#           brief's worktree are paused too
#   final   the closing Opus review: always runs, even after failures
# Blank lines and lines starting with # are skipped. A name containing
# "-review" is a review.
#
# DONE: implementer → result.json ok AND report.md, or (fallback) report.md + a commit tagged
#       "<name>:" since its .base. Review → its report.md (findings) exists.
# Failure → one retry with RESUME (RUN_RESUME=1); a second failure is logged
#       and the chain goes on with whatever does not depend on it.
# Caps: 90 min outer (here) over run.sh's own 60 min.
# Resumable: re-running skips every brief already DONE.
# One run per worktree: a lock, plus waiting for any run.sh already working there.
# Log: work/out/chain.log — RUN / OK / RETRY / FAIL / SKIP / TIMEOUT / WAIT / DONE.
# The owner launches the chain. Nothing here pushes or deploys.

main() {
  set -uo pipefail
  local block="${1:?block file}"
  [ -f "$block" ] || { echo "block not found: $block" >&2; exit 2; }
  local root; root="$(cd "$(dirname "$0")/.." && pwd)"
  cd "$root" || exit 2
  mkdir -p work/out
  LOG="$root/work/out/chain.log"
  OUTER_CAP="${CHAIN_OUTER_CAP_SECONDS:-5400}"

  local -a failed=() failed_wts=()
  local line name model brief budget after wt final word dep f skip
  # The block is read whole before anything runs: editing it mid-run changes nothing.
  mapfile -t lines < "$block"
  log RUN "chain $block (${#lines[@]} lines)"

  for line in "${lines[@]}"; do
    line="${line%%#*}"; [ -z "${line// }" ] && continue
    read -r name model brief budget _rest <<< "$line"
    case "${budget:-}" in after=*|wt=*|final|"") _rest="${budget:-} ${_rest:-}"; budget=5;; esac
    after=""; wt="$root"; final=0
    for word in ${_rest:-}; do
      case "$word" in
        after=*) after="${word#after=}";;
        wt=*) wt="$(cd "${word#wt=}" 2>/dev/null && pwd)" || { log FAIL "$name: worktree ${word#wt=} not found"; failed+=("$name"); continue 2; };;
        final) final=1;;
      esac
    done

    if is_done "$name" "$wt"; then log SKIP "$name already DONE"; continue; fi

    skip=""
    if [ "$final" -eq 0 ]; then
      for dep in ${after//,/ }; do for f in "${failed[@]}"; do [ "$dep" = "$f" ] && skip="depends on failed $f"; done; done
      for f in "${failed_wts[@]}"; do [ "$wt" = "$f" ] && skip="${skip:-shares the worktree of a failed brief}"; done
    fi
    if [ -n "$skip" ]; then log SKIP "$name: $skip"; failed+=("$name"); continue; fi

    if run_with_retry "$name" "$model" "$brief" "$budget" "$wt"; then
      log OK "$name$(verdict "$name" "$wt")"
    else
      log FAIL "$name (after retry)"; failed+=("$name"); failed_wts+=("$wt")
    fi
  done
  log DONE "failed=[${failed[*]}]"
  [ "${#failed[@]}" -eq 0 ]
}

log() { printf '%s %-7s %s\n' "$(date '+%F %T')" "$1" "$2" | tee -a "$LOG"; }

is_review() { case "$1" in *-review*) return 0;; *) return 1;; esac; }

# DONE per the chain rules. For implementers the fallback needs the .base written when it started.
is_done() {
  local name="$1" wt="$2" out="$2/work/out/$1"
  if is_review "$name"; then [ -f "$out/report.md" ]; return; fi
  # An implementer is DONE only with its report: a "successful" session that wrote nothing (e.g. it waited
  # on another process until the cap) is not done.
  if [ -f "$out/result.json" ] && [ -f "$out/report.md" ] && jq -e '.subtype=="success" and (.is_error|not)' "$out/result.json" >/dev/null 2>&1; then return 0; fi
  [ -f "$out/report.md" ] && [ -f "$wt/work/out/$name.base" ] || return 1
  git -C "$wt" log --format=%s "$(cat "$wt/work/out/$name.base")..HEAD" 2>/dev/null | grep -qE "^$name(:| )|\($name\)"
}

verdict() {
  is_review "$1" || return 0
  # 1) an explicit "Verdict: SHIP|DO NOT SHIP" line; 2) else any "DO NOT SHIP" (per-brief verdicts,
  # Spanish headings); 3) else a bare SHIP. Round-2 reports quote round 1, so the explicit line goes first.
  local f="$2/work/out/$1/report.md" v=""
  v="$(grep -oiE '(verdict|veredicto)[^A-Za-z]*\**[^A-Za-z]*(DO NOT SHIP|SHIP)' "$f" 2>/dev/null | head -1 | grep -oiE 'DO NOT SHIP|SHIP')"
  if [ -z "$v" ]; then
    if grep -qi 'DO NOT SHIP' "$f" 2>/dev/null; then v="DO NOT SHIP"
    elif grep -qw 'SHIP' "$f" 2>/dev/null; then v="SHIP"; fi
  fi
  echo " verdict=${v:-none}"
}

# One worktree, one run: the lock covers chains; the pgrep covers a run.sh launched by hand.
wait_for_worktree() {
  local wt="$1" lock="$1/work/out/.chain.lock" pid busy
  exec 9>"$lock"
  while :; do
    busy=""
    for pid in $(pgrep -f 'claude -p Read work/briefs/' 2>/dev/null); do
      [ "$(readlink "/proc/$pid/cwd" 2>/dev/null)" = "$wt" ] && busy="$pid"
    done
    if [ -z "$busy" ] && flock -n 9; then return 0; fi
    log WAIT "$wt busy${busy:+ (pid $busy)}; checking again in 60 s"
    sleep 60
  done
}

run_once() {
  local name="$1" model="$2" brief="$3" budget="$4" wt="$5" resume="$6" status
  wait_for_worktree "$wt"
  ( cd "$wt" && RUN_RESUME="$resume" timeout --kill-after=60 "$OUTER_CAP" ./work/run.sh "$name" "$model" "$brief" "$budget" ) >> "$LOG" 2>&1
  status=$?
  flock -u 9
  [ "$status" -eq 124 ] && log TIMEOUT "$name hit the ${OUTER_CAP}s outer cap"
  is_done "$name" "$wt"
}

run_with_retry() {
  local name="$1" model="$2" brief="$3" budget="$4" wt="$5"
  is_review "$name" || [ -f "$wt/work/out/$name.base" ] || git -C "$wt" rev-parse --short HEAD > "$wt/work/out/$name.base"
  log RUN "$name ($model, \$$budget, $brief)"
  run_once "$name" "$model" "$brief" "$budget" "$wt" 0 && return 0
  log RETRY "$name (RESUME, DO NOT RESTART)"
  run_once "$name" "$model" "$brief" "$budget" "$wt" 1
}

main "$@"
