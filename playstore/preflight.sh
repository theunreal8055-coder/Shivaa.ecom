#!/usr/bin/env bash
# playstore/preflight.sh — run this on YOUR machine, in the repo root, before a
# Play upload. It checks the six things that actually burn an hour, in the
# order they burn it, and prints GO / WAITING / BLOCKED.
#
#   bash playstore/preflight.sh
#
# Exit: 0 GO · 2 waiting on the owner (fingerprints / screenshots / version
#       code / account) · 1 something in the repo is genuinely broken.
#
# It changes nothing. Safe to run as often as you like.

set -u
cd "$(dirname "$0")/.." || exit 1
ROOT="$PWD"

say()  { printf '%s\n' "$*"; }
ok()   { printf '  [ok]    %s\n' "$*"; }
warn() { printf '  [todo]  %s\n' "$*"; TODO=$((TODO+1)); }
bad()  { printf '  [FAIL]  %s\n' "$*"; BAD=$((BAD+1)); }
head1(){ printf '\n%s\n' "$*"; }
TODO=0; BAD=0

say "Shivaa · Play pre-flight   ($(date '+%d %b %Y, %H:%M'))"
say "repo: $ROOT"

# ── 1 · the machine ────────────────────────────────────────────────────────
head1 "1 · The machine you are building on"
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  if [ "$NODE_MAJOR" -ge 18 ]; then ok "node $(node -v)"; else bad "node $(node -v) — bubblewrap needs 18 or newer"; fi
else
  bad "node is not installed — https://nodejs.org (18+)"
fi
if command -v keytool >/dev/null 2>&1; then
  ok "keytool present (JDK found)"
else
  warn "no keytool — either install a JDK 17, or let 'bubblewrap build' download one for you"
fi
command -v curl >/dev/null 2>&1 && ok "curl present" || warn "curl missing — the live-site checks below will be skipped"

# ── 2 · the kit in the repo ────────────────────────────────────────────────
head1 "2 · The launch kit"
for f in playstore/twa-manifest.json playstore/assetlinks.json cms/.well-known/assetlinks.json \
         cms/.well-known/.htaccess playstore/graphics/out/icon-512.png \
         playstore/graphics/out/feature-graphic-1024x500.png; do
  [ -f "$f" ] && ok "$f" || bad "$f is missing"
done
if cmp -s playstore/assetlinks.json cms/.well-known/assetlinks.json; then
  ok "the two assetlinks copies are identical"
else
  bad "the two assetlinks copies DIFFER — run: node playstore/set-fingerprint.mjs --status"
fi
SHOTS=$(ls playstore/screenshots/*.png 2>/dev/null | wc -l | tr -d ' ')
if [ "$SHOTS" -ge 2 ]; then ok "$SHOTS framed screenshot(s)"; else warn "only $SHOTS screenshot(s) — Play needs 2+ (playstore/screenshots/CAPTURE.md)"; fi
[ -f shivaa-update-v228.zip ] && ok "shivaa-update-v228.zip is here (the web half ships inside the app)" \
  || warn "shivaa-update-v228.zip not in the repo root — download it from the release branch"

# ── 3 · the kit's own verifier ─────────────────────────────────────────────
head1 "3 · The 17-check kit verifier"
if command -v node >/dev/null 2>&1 && [ -f playstore/verify.mjs ]; then
  VOUT=$(node playstore/verify.mjs 2>&1); VCODE=$?
  printf '%s\n' "$VOUT" | grep -E '^(PASS|WARN|FAIL)' | sed 's/^/  /'
  case "$VCODE" in
    0) ok "verify.mjs: ready" ;;
    2) warn "verify.mjs: waiting on you (its warnings above are the list)" ;;
    *) bad "verify.mjs: something is broken (exit $VCODE)" ;;
  esac
else
  bad "cannot run playstore/verify.mjs"
fi

# ── 4 · fingerprints ───────────────────────────────────────────────────────
head1 "4 · Signing fingerprints (Digital Asset Links)"
if [ -f playstore/set-fingerprint.mjs ]; then
  FP=$(node playstore/set-fingerprint.mjs --status 2>&1); FPCODE=$?
  printf '%s\n' "$FP" | sed 's/^/  /'
  if [ "$FPCODE" -eq 0 ]; then ok "both fingerprints are real and the copies agree"
  else warn "fingerprints still missing — run: node playstore/set-fingerprint.mjs \"<upload>\" \"<play-signing>\""; fi
else
  bad "playstore/set-fingerprint.mjs is missing"
fi

# ── 5 · version codes ──────────────────────────────────────────────────────
head1 "5 · Version codes (Play refuses a reused one AFTER the upload)"
if [ -f playstore/version-bump.mjs ]; then
  VB=$(node playstore/version-bump.mjs --status 2>&1); VBCODE=$?
  printf '%s\n' "$VB" | sed 's/^/  /'
  if [ "$VBCODE" -eq 0 ]; then ok "the manifest holds a code Play has never seen"
  else warn "fix the version code before building — see the lines above"; fi
else
  bad "playstore/version-bump.mjs is missing"
fi

# ── 6 · the live site the app opens ────────────────────────────────────────
head1 "6 · The website the app opens (must be the newest release)"
if command -v curl >/dev/null 2>&1; then
  VER=$(curl -sS -m 12 https://shivaa.in/api/version 2>/dev/null || true)
  if [ -z "$VER" ]; then
    warn "could not reach https://shivaa.in/api/version from here (no network, host down, or a firewall)"
  else
    REL=$(printf '%s' "$VER" | grep -o '"rel":[0-9]*' | head -1 | cut -d: -f2)
    DBMODE=$(printf '%s' "$VER" | grep -o '"mode":"[a-z]*"' | head -1 | cut -d'"' -f4)
    [ "${REL:-0}" -ge 228 ] && ok "live release: v${REL}" \
      || warn "live release is v${REL:-?} — deploy shivaa-update-v228.zip first (the app shows the live site)"
    [ "${DBMODE:-}" = "mysql" ] && ok "data source: mysql" || warn "data source: ${DBMODE:-unknown} (JSON safety net is fine, just not SQL reads)"
  fi
  AL=$(curl -sS -m 12 https://shivaa.in/.well-known/assetlinks.json 2>/dev/null || true)
  if [ -z "$AL" ]; then
    warn "could not fetch the live assetlinks.json from here"
  elif printf '%s' "$AL" | grep -q 'REPLACE_WITH'; then
    warn "the LIVE assetlinks.json still has placeholder fingerprints — Play will not verify the app"
  elif printf '%s' "$AL" | grep -q 'sha256_cert_fingerprints'; then
    ok "the live assetlinks.json looks like real JSON"
  else
    warn "the live assetlinks.json is not the expected JSON (403 or an HTML error page?)"
  fi
else
  warn "curl missing — skipped"
fi

# ── verdict ────────────────────────────────────────────────────────────────
head1 "──────────────────────────────────────────────"
if [ "$BAD" -gt 0 ]; then
  say "BLOCKED — $BAD broken item(s), $TODO to do. Fix the [FAIL] lines first."
  exit 1
elif [ "$TODO" -gt 0 ]; then
  say "WAITING — $TODO item(s) need you (they are all listed above)."
  say "Next: node playstore/version-bump.mjs --status · playstore/UPLOAD-STEPS.md"
  exit 2
else
  say "GO — build with playstore/make-aab.sh, upload, then record it with version-bump.mjs."
  exit 0
fi
