# SHIVAA — Persistent Memory (auto-loaded every chat)

> This file lives on `main` so ANY new Arena chat (any account, any device) starts with full history.
> Updated: 2026-09-14 — branch `arena/01a0a030-shivaa-ecom` (PayU + Bullion + Rates Connect)
> **Owner magic phrase for next chat:** `Read ARENA-STATE.md and HANDOFF.md and MEMORY.md first, then continue.`

## What we did in this session (v112)
- **Repo:** `theunreal8055-coder/Shivaa.ecom` — session branch `arena/01a0a030-shivaa-ecom` (branched from `93b5180` on 2026-09-14 Asia/Calcutta)
- **Live host reality:** Hostinger `public_html/api.php` IS the live API (not `public_html/cms/api.php`). Owner uploads there. `app.js` is at path found via File Manager Search for `app.js` (either `public_html/js/app.js` or `public_html/cms/js/app.js`).
- **PayU fix (4 hunks, no other code touched):** B1 array `['phone']` bug, B2/B3 regex relaxed, B4 strict txnid, B5 probe `No Transaction Found`. Files: `cms/api.php`, `cms/payu.gateway.fixed.php`, `cms/PAYU_BUGFIX_REPORT.md`, `payu-update-20260914.zip`
- **Bullion millisecond:** `cms/js/app.js` 15s→1s, 60s→5s, added `_msTick` RAF lerp. Zip: `bullion-update-20260914.zip`
- **Rates drift:** Explained 63.10 vs 63.01 (FX), 4277 vs 4279 (spot vs future), 154890 vs 155500 (Jaipur premium +55). Fix: set Angel tokens + increase jaipurPremium in Admin.
- **Connect live rates ↔ bullion:** `current_rates()` now prefers `live_tick_quote(120s)` → `jaipur_live_from_tick()` so storefront always equals bullion `.angel-tick.json`. Zip: `connect-rates-bullion-20260914.zip`
- **Zips pushed to branch:** `payu-update-20260914.zip` (101KB), `bullion-update-20260914.zip` (151KB), `connect-rates-bullion-20260914.zip` (101KB). Owner already deployed PayU zip to `public_html/api.php`.

## How to continue (for next agent)
1. `git fetch origin main && git fetch origin arena/01a0a030-shivaa-ecom`
2. `git log --oneline -5 origin/main` and `head -20 ARENA-STATE.md` — if main is behind this branch, PR `arena/01a0a030-shivaa-ecom` → `main` and merge.
3. Read `HANDOFF.md` v112 section + this file. Work only on new `arena/...` branch from tip of `main`.
4. Never ask owner for credentials; use `gh` already authed.

## Pending owner deploys
- Upload `bullion-update-20260914.zip` `app.js` to found `app.js` path
- Upload `connect-rates-bullion-20260914.zip` `cms_api_connected.php` as `public_html/api.php` (or just keep last api.php if you merge branch — it already contains all fixes)
- Then merge branch to main: `gh pr create --base main --head arena/01a0a030-shivaa-ecom --title "v112 PayU+Bullion hotfixes" --body "See HANDOFF v112" && gh pr merge --merge`

