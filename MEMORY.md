# SHIVAA — Persistent Memory (auto-loaded every chat)

> This file lives on `main` so ANY new Arena chat (any account, any device) starts with full history.
> Updated: 2026-09-15 — branch `arena/01a0a2e9-shivaa-ecom` (v114 checkout invoice FY TypeError)
> **Owner magic phrase for next chat:** `Read ARENA-STATE.md and HANDOFF.md and MEMORY.md first, then continue.`

## Session 2026-09-15 (arena/01a0a2e9) — v114 invoice FY
- Checkout 500: `str_pad(((int)date('y')) ± 1, …)` TypeError under `strict_types=1`. Fixed with `$fyStart` (Apr–Mar IST) + `(string)` `str_pad`. Invoice still `SHV/{fy}/{seq}`.
- Zip: `shivaa-update-v114.zip` → overwrite `public_html/api.php`. Gate: `node tools/mega/php-sweep/sweep.mjs` → `211 routes · 0 exceptions`.

## Session 2026-09-14 #2 (arena/01a0a0a6) — zoom batch 2, live verify, docs persist
- **Lost commit 0a2b3f5 = UNRECOVERABLE (verified, not assumed).** It was never pushed anywhere: GitHub API `GET /commits/0a2b3f5` → HTTP 422 "No commit found"; no `refs/heads/*`, `refs/pull/*` or tag contains it; not in 60-commit deepened main history; no on-disk leftovers (`/home/user/work_shots` absent). Its supposed content — the 8 pulled-back covers PGS5011–5020 — was **re-done from scratch** this session.
- **Batch 2 DONE (PR #32, merged to main as `1a98b6c`):** covers PGS5005 re-roll + PGS5011–5020 and editorial PGS5003 regenerated pulled-back, finalized (badge + 896×1195), PASS the zoom gate ON THE INSTALLED FILES, installed to `cms/images/designs/rings/` (keep original filenames: `_face.jpg` for 5011–5020) + `demo65/media/<SKU>/shot_studio.jpg` (staging contract) / `shot_editorial.jpg`. Re-roll lessons: 5011/5018 needed the "≤60% width + 18% margins" variant; 5003 editorial's first re-roll drew the pavé plate as a QR-code + warm edge bokeh (both fool zoom_check) — second re-roll clean.
- **Remaining zoom work: 25 covers + 17 editorials (batches 3–7)** — ledger + prompts in `tools/photoshoot/ZOOMFIX-STATE.md`. 10 generate_image calls max per turn.
- **GO-LIVE marker re-bumped** (`deploy/GO-LIVE-v111.txt`, retrigger 2026-09-14T16:18Z, still `GO` + `ZOOM_GATE=NO`) → PR #32 merge fired live Catalogue Deploy **run 34868057801** (refreshes the batch-2 photos on the same 65 SKUs; product count unchanged).
- **Live catalogue verified by FULL end-to-end read (2026-09-14 ~16:25Z, all 10 chunks of `/api/products`):** exactly **65 products, SKUs PGS5001–PGS5065, zero duplicates, zero non-PGS/sample products, 4 images each**. This is the ground truth the owner asked to confirm.
- Owner next wants **app changes** (list pending) — implement on a fresh arena branch from tip of main.

## What we did in session 2026-09-14 #1 (v112 — MERGED to main via PR #31)
- **Repo:** `theunreal8055-coder/Shivaa.ecom` — was `arena/01a0a030-shivaa-ecom`, now on `main`.
- **Live host reality:** Hostinger `public_html/api.php` IS the live API (not `public_html/cms/api.php`). Owner uploads there. `app.js` found via File Manager Search for `app.js` (either `public_html/js/app.js` or `public_html/cms/js/app.js`).
- **PayU fix (4 hunks):** B1 address array `['phone']` bug, B2/B3 key/salt regex relaxed, B4 strict txnid reconcile, B5 probe `No Transaction Found`. Files: `cms/api.php`, `cms/payu.gateway.fixed.php`, `cms/PAYU_BUGFIX_REPORT.md`, `payu-update-20260914.zip`. Owner uploaded to `public_html/api.php` ✅.
- **Bullion millisecond:** `cms/js/app.js` 15s→1s poll, 60fps `_msTick` RAF lerp. Zip: `bullion-update-20260914.zip`.
- **Rates drift:** 63.10 vs 63.01 (FX mix), 4277 vs 4279 (spot vs future), 154890 vs 155500 (Jaipur premium +55 too low). Fix: Angel tokens + raise jaipurPremium in Admin.
- **Connect live rates ↔ bullion:** `current_rates()` prefers `live_tick_quote(120s)` → `jaipur_live_from_tick()`. Zip: `connect-rates-bullion-20260914.zip`.

## How to continue (for next agent)
1. `git fetch origin main && git log --oneline -3 origin/main` + `head -20 ARENA-STATE.md` — both must agree; if behind, merge main first.
2. Work ONLY on the new session `arena/...` branch; never start from an old arena branch; finish via PR → main (branch is protected; no force-push ever).
3. Zoom batches 3–7 per `tools/photoshoot/ZOOMFIX-STATE.md`: unbadge → generate (≤10/turn) → finalize → `zoom_check.py` QA → install cms + demo65 → update ledgers → PR.
4. When ALL 130 cover/editorial checks PASS, a future GO-LIVE bump can drop `ZOOM_GATE=NO` for a fully-gated refresh.
5. Never ask owner for credentials; `gh` is authed. Live state readable via fetch_page on `https://shivaa.in/api/products` (bash/curl to shivaa.in is TLS-blocked from sandbox).

## Pending owner deploys (Hostinger)
- `bullion-update-20260914.zip` → `app.js` at found path; `connect-rates-bullion-20260914.zip` → `public_html/api.php` (status unknown; code is on main via PR #31 so the auto-sync cron deploys cms/ code regardless).
