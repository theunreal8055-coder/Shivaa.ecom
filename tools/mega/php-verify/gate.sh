#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# SHIVAA php-rates gate — executes the REAL cms/api.php and asserts the v119
# rate contract (22K premium ₹398 desk-physical, published anchorLevel).
#
#   bash tools/mega/php-verify/gate.sh            # auto-detect a PHP binary
#   PHP_BIN=/path/to/php bash tools/mega/php-verify/gate.sh
#
# PHP itself is NOT in the sandbox by default. Install one from npm (the npm
# registry is reachable even when GitHub release assets are not):
#
#   mkdir -p ~/phpwasm && cd ~/phpwasm && npm install @php-wasm/cli --no-audit
#   PHP_BIN=~/phpwasm/node_modules/.bin/php-wasm-cli bash tools/mega/php-verify/gate.sh
#
# The scratch DB is a COPY — this never touches cms/data/db.json.
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HERE="$ROOT/tools/mega/php-verify"
CMS="$ROOT/cms"
WORK="$(mktemp -d)"

PHP_BIN="${PHP_BIN:-}"
if [ -z "$PHP_BIN" ]; then
  for c in php ~/phpwasm/node_modules/.bin/php-wasm-cli /tmp/phpwasm/node_modules/.bin/php-wasm-cli; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then PHP_BIN="$c"; break; fi
  done
fi
if [ -z "$PHP_BIN" ]; then
  echo "no PHP found — see the header of this file for the npm install one-liner" >&2
  exit 2
fi
echo "· php    : $PHP_BIN ($("$PHP_BIN" -v 2>/dev/null | head -1))"

# 1 · scratch site: the real PHP sources + a COPY of the master db
mkdir -p "$WORK/data"
cp "$CMS/api.php" "$CMS/hallmark.php" "$CMS/trust.php" "$CMS/sms.php" "$CMS/mail.php" "$WORK/"
cp "$CMS/data/db.json" "$WORK/data/db.json"
cp "$HERE/rates_probe.php" "$WORK/"

# 2 · a deliberate MCX tick so the anchor path (not the stale stamp) is used
python3 - "$WORK/data/.angel-tick.json" <<'PY'
import json, sys, time
json.dump({
    "ts": time.time(), "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "relay": False, "open": True, "servedFrom": "php-verify-gate",
    "gold":   {"ltp": 150840, "bid": 150800, "ask": 150880, "chgPct": 0.21},   # → ₹15,084/g
    "silver": {"ltp": 233200, "bid": 233000, "ask": 233400, "chgPct": 0.34},   # → ₹233.20/g
}, open(sys.argv[1], "w"))
PY
echo "· tick   : gold ₹15,084/g · silver ₹233.20/g (fixed, deterministic)"

echo "· lint   : $("$PHP_BIN" -l "$WORK/api.php" 2>&1 | grep -c 'No syntax errors') syntax-clean"
[ "$("$PHP_BIN" -l "$WORK/api.php" 2>&1 | grep -c 'No syntax errors')" = "1" ] || { echo "api.php has a syntax error" >&2; exit 1; }

# 3 · rates contract
echo "· /api/rates"
( cd "$WORK" && "$PHP_BIN" rates_probe.php rates 2>/dev/null ) | python3 "$HERE/assert_rates.py"

# 4 · the same anchor must reach a real product price
echo "· /api/products (first piece)"
( cd "$WORK" && "$PHP_BIN" rates_probe.php rates 2>/dev/null > "$WORK/rates.json" )
( cd "$WORK" && "$PHP_BIN" rates_probe.php products 2>/dev/null > "$WORK/products.json" )
python3 "$HERE/assert_rates.py" "$WORK/rates.json" "$WORK/products.json"

rm -rf "$WORK"
echo "✓ php-rates gate done"
