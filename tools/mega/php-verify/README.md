# php-rates gate — execute the real `api.php`, prove the rate contract

The jsdom suites (`tools/mega/smoke/*.js`) never run PHP. This gate does: it copies
the real `cms/api.php` (+ its includes and a **copy** of `data/db.json`) into a scratch
dir, seeds a deterministic MCX tick, executes the route, and asserts the v119 rate
contract:

| Check | Value |
|-------|-------|
| `premium.gold22` | **398** — the Task-2 owner decision (desk physical) |
| `anchorLevel.mode` | `mcx-future` (or `spot` / `override`, both also valid) |
| `jaipur.gold22` | `php_round(anchorLevel.goldPerG × 0.9167) + 398` |
| `jaipur.gold24` | `php_round(goldPerG) + 55` — the 24K line must stay on 55 |
| first product | its `ratePerGram` equals `jaipur.gold22` |

With the fixed tick (`gold ltp 150840`) the expected output is
`premium.gold22=398`, `anchorLevel.mode=mcx-future`, `jaipur.gold22=14226`,
`jaipur.gold24=15139`, `PGS5004 rate ₹14226/g` — i.e. **+₹343/g** over v118 for 22K.

## Run it

PHP is not installed in the sandbox by default. npm works even when GitHub release
assets are blocked:

```bash
mkdir -p ~/phpwasm && cd ~/phpwasm && npm install @php-wasm/cli --no-audit
cd /path/to/repo
PHP_BIN=~/phpwasm/node_modules/.bin/php-wasm-cli bash tools/mega/php-verify/gate.sh
```

`gate.sh` also auto-detects a plain `php`/`php-wasm-cli` if `PHP_BIN` is unset.

**Never change the expected numbers in `assert_rates.py` to make a run pass** — the
398 premium and the anchor formula are the owner's locked decision; if a number moved,
that is the bug. The scratch DB is disposable; `cms/data/db.json` is never written.
