#!/usr/bin/env bash
# where-am-i.sh — the forward-only guard for the Shivaa repo.
#
#   bash qa/where-am-i.sh
#
# Run this FIRST in every chat, on ANY branch, in any clone. It never changes the
# working tree: it only fetches (read-only) and reads.
#
# It answers one question — is this tree the newest thing in the repository, or is it
# an older tree somebody left checked out? — by reading the release stamp out of
# cms/js/app.js on every remote branch, not by trusting the file on disk or a branch
# name. That is deliberate: an old branch's own docs cannot tell you it is old.
#
# Exit codes
#   0  FORWARD   this tree carries the newest release — work here
#   2  WARN      newest content, but the wrong branch — commit/push only to the release branch
#   3  BEHIND    an older tree — STOP, the three commands to move forward are printed
#   4  UNKNOWN   no git, no origin, or no branch carries a release stamp
#   5  AHEAD     this tree carries a release number no remote branch has (unpushed work)

set -u

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "where-am-i: not a git repository"; exit 4; }
cd "$ROOT" || exit 4

RELEASE_BRANCH="arena/e8a470c6-shivaa-ecom"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
HEAD_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"

stamp_in_ref() {   # $1 = ref → release number, or empty
  git show "$1:cms/js/app.js" 2>/dev/null \
    | sed -n 's/^const APP_REL = \([0-9][0-9]*\);.*/\1/p' | head -1
}
stamp_in_tree() {  # the working tree, which may be dirty
  [ -f cms/js/app.js ] && sed -n 's/^const APP_REL = \([0-9][0-9]*\);.*/\1/p' cms/js/app.js | head -1
}

echo "Shivaa forward-only guard"
echo "  repo    : $ROOT"
echo "  branch  : $BRANCH"
echo "  head    : $HEAD_SHA  $(git log -1 --format='%s' 2>/dev/null | cut -c1-72)"

if git remote get-url origin >/dev/null 2>&1; then
  if ! git fetch --quiet --prune origin '+refs/heads/*:refs/remotes/origin/*' 2>/dev/null; then
    echo "  fetch   : FAILED (offline?) — judging on the refs already fetched"
  fi
else
  echo "  fetch   : no 'origin' remote — judging on local refs only"
fi

BEST=0
BEST_REFS=""
while read -r ref; do
  [ -z "$ref" ] && continue
  n="$(stamp_in_ref "$ref")"
  [ -z "$n" ] && continue
  if [ "$n" -gt "$BEST" ]; then
    BEST="$n"; BEST_REFS="$ref"
  elif [ "$n" -eq "$BEST" ] && [ -n "$BEST_REFS" ]; then
    BEST_REFS="$BEST_REFS $ref"
  fi
done < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin 2>/dev/null | grep -v '/HEAD$')

LOCAL="$(stamp_in_tree)"; LOCAL="${LOCAL:-0}"

if [ "$BEST" -eq 0 ]; then
  echo "  result  : UNKNOWN — no remote branch carries an APP_REL stamp"
  echo
  echo "Fetch the release branch by hand and try again:"
  echo "  git fetch origin $RELEASE_BRANCH && git reset --hard FETCH_HEAD"
  exit 4
fi

echo "  tree    : v$LOCAL"
echo "  newest  : v$BEST on $BEST_REFS"

# The ledger that belongs to the NEWEST tree — not the one on disk.
LEDGER_REF="$(echo "$BEST_REFS" | tr ' ' '\n' | grep -m1 -x "origin/$RELEASE_BRANCH" || true)"
[ -z "$LEDGER_REF" ] && LEDGER_REF="$(echo "$BEST_REFS" | awk '{print $1}')"
NEXT="$(git show "$LEDGER_REF:docs/release-ledger.json" 2>/dev/null \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("next_release",""))' 2>/dev/null)"
LIVE_ZIP="$(git show "$LEDGER_REF:docs/release-ledger.json" 2>/dev/null \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("live",{}).get("zip",""))' 2>/dev/null)"
[ -n "$NEXT" ] && echo "  ledger  : live package $LIVE_ZIP · next release v$NEXT"

if [ "$LOCAL" -lt "$BEST" ]; then
  echo "  result  : BEHIND by $((BEST - LOCAL)) release(s) — DO NOT WORK ON THIS TREE"
  echo
  echo "Move forward first (this is the only allowed direction):"
  echo "  git fetch origin $RELEASE_BRANCH"
  echo "  git reset --hard FETCH_HEAD"
  echo "  bash qa/where-am-i.sh          # must print FORWARD before you touch anything"
  echo
  echo "Never build a release, edit cms/, or write docs on this tree. If it contains"
  echo "uncommitted work, save it to a patch file first: git diff > /tmp/mine.patch"
  exit 3
fi

if [ "$LOCAL" -gt "$BEST" ]; then
  echo "  result  : AHEAD of every remote branch — v$LOCAL exists only here"
  echo
  echo "That is unpublished work, not a forward step. Push it to $RELEASE_BRANCH"
  echo "or throw it away deliberately — do not build a package on top of it until it is pushed."
  exit 5
fi

if [ "$BRANCH" != "$RELEASE_BRANCH" ]; then
  echo "  result  : newest content, WRONG BRANCH"
  echo
  echo "This tree is v$BEST, same as the release branch, but you are on '$BRANCH'."
  echo "Commit and push only to $RELEASE_BRANCH. Move over before you write anything:"
  echo "  git fetch origin $RELEASE_BRANCH && git reset --hard FETCH_HEAD"
  exit 2
fi

echo "  result  : FORWARD — this is the newest tree, on the release branch"
[ -n "$NEXT" ] && echo "  next    : v$NEXT (a new number; never reuse v$BEST)"
exit 0
