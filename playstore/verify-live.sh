#!/usr/bin/env bash
# playstore/verify-live.sh — "kya mera assetlinks fix live pahunch gaya?"
#
# Run this from the repo root on YOUR machine, after you paste the fingerprints
# and upload the single .well-known/assetlinks.json file to the server.
#
#   bash playstore/verify-live.sh                 # checks https://shivaa.in
#   bash playstore/verify-live.sh https://staging.shivaa.in
#
# Exit: 0 the live site is ready for Google's app-link verifier
#       2 not ready yet (each failing line says exactly what is wrong)
#       1 the repo's own copies disagree — fix that before uploading anything
#
# It reads nothing secret: assetlinks.json is public by design.

set -u
cd "$(dirname "$0")/.." || exit 1
HOST="${1:-https://shivaa.in}"
HOST="${HOST%/}"
KIT="playstore/assetlinks.json"
SHIPPED="cms/.well-known/assetlinks.json"
PKG=$(node -p "JSON.parse(require('fs').readFileSync('$KIT','utf8'))[0].target.package_name" 2>/dev/null || echo '?')

ok()   { printf '  [ok]    %s\n' "$*"; }
bad()  { printf '  [FAIL]  %s\n' "$*"; N=$((N+1)); }
note() { printf '  [note]  %s\n' "$*"; }
say()  { printf '%s\n' "$*"; }
N=0

# one http code, always three digits, never doubled ("000000" was a bug once)
http_code() { curl -sS -m 15 -o /dev/null -w '%{http_code}' "$1" 2>/dev/null | tail -c 4 || printf '000'; }
fetch()     { curl -sS -m 20 -L "$1" 2>/dev/null || true; }

if ! command -v curl >/dev/null 2>&1; then
  say "curl is required. Install it and rerun."
  exit 1
fi

say "verify-live · $HOST · package $PKG"
say ""

# ── 0 · the two repo copies must agree before anything is uploaded ─────────
if cmp -s "$KIT" "$SHIPPED"; then
  ok "repo: the two assetlinks copies are identical"
else
  bad "repo: playstore/assetlinks.json and cms/.well-known/assetlinks.json DIFFER — run set-fingerprint.mjs again"
  say ""
  say "Stopping: uploading one copy while the other disagrees is how the app"
  say "ends up with an address bar. Fix the repo first."
  exit 1
fi

if grep -q 'REPLACE_WITH' "$KIT"; then
  bad "repo: the file you are about to upload still contains REPLACE_WITH_… placeholders"
  say "        run: node playstore/set-fingerprint.mjs \"<upload-sha256>\" \"<play-signing-sha256>\""
fi

# ── 1 · the live file Google actually fetches ─────────────────────────────
say ""
say "1 · .well-known/assetlinks.json  (the only file Google reads)"
CODE=$(http_code "$HOST/.well-known/assetlinks.json")
LIVE=$(fetch "$HOST/.well-known/assetlinks.json")
say "     http $CODE"
if [ "$CODE" = "403" ]; then
  bad "403 — the parent .htaccess denies *.json and .well-known/.htaccess did not land.
          Paste the block from playstore/htaccess-wellknown.txt at the end of the site .htaccess."
elif [ "$CODE" = "404" ]; then
  bad "404 — the file is not on the server. Upload cms/.well-known/assetlinks.json to public_html/.well-known/assetlinks.json"
elif [ "$CODE" != "200" ]; then
  bad "http $CODE — could not fetch the file (host down, redirect loop, or the URL is wrong)"
elif ! printf '%s' "$LIVE" | grep -q '"namespace"'; then
  bad "the reply is not the assetlinks JSON (an HTML error page, or a login wall)"
elif printf '%s' "$LIVE" | grep -q 'REPLACE_WITH'; then
  bad "the LIVE file still has placeholder fingerprints — this is the file Google reads.
          Upload the fixed cms/.well-known/assetlinks.json (one file, nothing else)."
else
  ok "the live file is real JSON with no placeholders"
  for FP in $(node -e '
    const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));
    j[0].target.sha256_cert_fingerprints.forEach(f=>console.log(f));
  ' "$KIT" 2>/dev/null); do
    if printf '%s' "$LIVE" | grep -q "$FP"; then ok "fingerprint present: ${FP:0:17}…${FP: -8}"
    else bad "the live file is MISSING ${FP:0:17}…${FP: -8} — it is in the repo copy but not on the server"; fi
  done
  printf '%s' "$LIVE" | grep -q "$PKG" && ok "package name matches: $PKG" || bad "the live file names a different package than $PKG"
fi

# ── 2 · is the deployed APP the release Play will show? ───────────────────
say ""
say "2 · the deployed app (the TWA window shows exactly this)"
INDEX=$(fetch "$HOST/")
if printf '%s' "$INDEX" | grep -q '__SHIVAA_REL'; then
  IREL=$(printf '%s' "$INDEX" | grep -o '__SHIVAA_REL *= *[0-9]*' | head -1 | grep -o '[0-9]*$')
  ok "index.html is the app shell (rel ${IREL:-?})"
else
  bad "index.html is not the app shell — a parked page, an error page, or a proxy in front"
fi
APPJS=$(fetch "$HOST/js/app.js")
if printf '%s' "$APPJS" | grep -q "pages\['delete-account'\]"; then
  ok "the deployed app.js contains the erasure page Play requires"
else
  bad "the deployed app.js does NOT contain #/delete-account — the live tree is older than v228.
          Deploy shivaa-update-v232.zip (or any newer release) before pointing Play at this URL."
fi
AREL=$(printf '%s' "$APPJS" | grep -o 'APP_REL *= *[0-9]*' | head -1 | grep -o '[0-9]*$')
[ -n "${AREL:-}" ] && ok "APP_REL ${AREL}" || note "APP_REL not found in the deployed js (minified?)"

say ""
say "3 · /api/version (what the app reports about itself)"
VER=$(fetch "$HOST/api/version")
if [ -z "$VER" ]; then
  bad "/api/version did not answer — the app would open to an error"
else
  REL=$(printf '%s' "$VER" | grep -o '"rel"[[:space:]]*:[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*$')
  DB=$(printf '%s' "$VER" | grep -o '"mode"[[:space:]]*:[[:space:]]*"[a-z]*"' | head -1 | cut -d'"' -f4)
  MT=$(printf '%s' "$VER" | grep -o '"matched"[[:space:]]*:[[:space:]]*\(true\|false\)' | head -1 | grep -o '\(true\|false\)$')
  # -ge 228, NOT an equality: the erasure page Play requires shipped at v228 and
  # the live site is v228 today. Rolling this to the newest release would fail for
  # a package the owner has not uploaded yet — the normal state between releases.
  [ "${REL:-0}" -ge 228 ] && ok "live release v$REL" || bad "live release is v${REL:-?} — deploy shivaa-update-v232.zip (or newer)"
  [ "${MT:-}" = "true" ] && ok "release stamps are consistent (index = app = sw)" || note "stamp.matched=${MT:-?} — index/app/sw disagree, check the deploy"
  [ "${DB:-}" = "mysql" ] && ok "data source: mysql" || note "data source: ${DB:-unknown} (JSON safety net — the app is unaffected)"
fi

# ── 4 · the two URLs Play Console asks for are CLIENT routes ──────────────
say ""
say "4 · the two URLs Play asks for are #/ hash routes on the same page"
say "     https://shivaa.in/#/privacy        → privacy policy"
say "     https://shivaa.in/#/delete-account → account deletion (v228 page)"
say "     A server cannot verify a #/ route; open both on a phone once. If"
say "     /#/delete-account opens Home, the deployed tree is older than v228 (see 2)."

say ""
if [ "$N" -gt 0 ]; then
  say "NOT READY — $N problem(s) above. Google's verifier fails while these exist."
  exit 2
fi
say "READY — assetlinks live hai, app v${REL:-?} deployed hai, URLs up hain."
say "Ab phone par app uninstall → reinstall karo (verification cache clear hota hai):"
say "  Play Console → Internal testing → opt-in link → install → open"
say "  Address bar nahi dikhna chahiye. Dikh raha hai? 60 s ruko, app data clear karo, phir kholo."
exit 0
