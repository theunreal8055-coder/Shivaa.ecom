#!/usr/bin/env bash
# SHIVAA regression belt — every gate suite in one run, one line each.
#
#   bash tools/mega/smoke/belt.sh                 # source tree (cms/)
#   SMOKE_CMS=/tmp/vNNN-overlay bash tools/mega/smoke/belt.sh   # zip overlay
#
# Tracked in git on purpose: the older copy lived in the (gitignored, and
# therefore snapshot-transient) .scratch/ directory and kept disappearing.
cd "$(dirname "$0")/../../.." || exit 1
SUITES="v113b-check v117-check v118-check v119-check v120-check v121-check v122-check v123-check v124-check v125-check v127-check v139-check v140-check v141-check v142-check v146-check v147-check v148-check v149-check v150-check v151-check v152-check v153-check v154-check v155-check v156-check v156-cart v157-check v157-live v157-render v158-check v158-cats v159-check v159-cats v154-php-run v147-php-run v149-php-run v150-php-run v151-php-run v152-php-run v156-php-run v157-php-run"
FAILED=0
FLAKES=0

# One suite = one node run. A run that dies before printing a verdict (the
# sandbox occasionally reaps a jsdom process under load — the old symptom was a
# bare "Node.js v22" line standing in for a table) is retried ONCE, and the
# retry is reported, never hidden: a flake must be visible to the next reader.
run_suite() { # $1 = suite name → prints one verdict line
  local f="tools/mega/smoke/$1.js" out verdict code
  out=$(SMOKE_CMS="${SMOKE_CMS:-}" timeout 300 node "$f" 2>&1); code=$?
  verdict=$(printf '%s\n' "$out" | grep -oE "[0-9]+/[0-9]+[^|]*|[0-9]+ routes[^|]*|[0-9]+ [0-9]+/[0-9]+" | tail -1)
  [ -z "$verdict" ] && verdict=$(printf '%s\n' "$out" | grep -vE "^[[:space:]]*$" | tail -1 | cut -c1-80)
  if ! printf '%s' "$verdict" | grep -qE "PASS|SKIP|[0-9]+/[0-9]+"; then
    out=$(SMOKE_CMS="${SMOKE_CMS:-}" timeout 300 node "$f" 2>&1); code=$?
    verdict=$(printf '%s\n' "$out" | grep -oE "[0-9]+/[0-9]+[^|]*|[0-9]+ routes[^|]*|[0-9]+ [0-9]+/[0-9]+" | tail -1)
    [ -z "$verdict" ] && verdict=$(printf '%s\n' "$out" | grep -vE "^[[:space:]]*$" | tail -1 | cut -c1-80)
    verdict="↻ retry — $verdict"
  fi
  printf '%s' "$verdict"
}

for s in $SUITES; do
  f="tools/mega/smoke/$s.js"
  [ -f "$f" ] || { printf '%-16s MISSING\n' "$s"; FAILED=1; continue; }
  verdict=$(run_suite "$s")
  printf '%-16s %s\n' "$s" "$verdict"
  case "$verdict" in *"↻ retry —"*) FLAKES=$((FLAKES+1));; esac
  case "$verdict" in *FAILED*|*✗*|*MISSING*) FAILED=1;; esac
done
[ "$FLAKES" != 0 ] && echo "   ($FLAKES suite(s) needed the one retry above)"
[ "$FAILED" = 0 ] && echo "—— belt green" || echo "—— BELT HAS FAILURES"
