# SHIVAA — Persistent Memory (auto-loaded every chat)

> This file lives on `main` so ANY new Arena chat (any account, any device) starts with full history.
> Updated: 2026-09-15 — branch `arena/01a0a310-shivaa-ecom` (v115 categories-back + phone self-heal)
> **Owner magic phrase for next chat:** `Read ARENA-STATE.md and HANDOFF.md and MEMORY.md first, then continue.`

## Session 2026-09-15 #3 (arena/01a0a32d) — v115-FI: fresh install of everything, v1 → v115
- **Owner ask:** "full fledged e-commerce store using all version from 1 to 115 and fresh install". Chosen shape: consolidate + audit, then package — not replay 115 archives (only 53 survive) and not a rewrite.
- **Built:** `tools/fresh-install/` (lib_pack · lineage-audit · make-seed · build · verify · php-syntax · php-semantics) + `cms/install.php` + `cms/data/db.seed.json` + `docs/VERSION-LINEAGE-v1-v115.md` + `FRESH-INSTALL-v115.md` + `qa/browser/t11-gift-concierge.mjs`. Bundles land in `dist/` (gitignored): core 225 entries ≈37 MB, media 382 ≈185 MB, `--tier all` for one fat zip.
- **Method that mattered:** absorption auditing (archive lines ↔ tree) instead of trusting memory. It surfaced 3 real losses — `relay/` (v78–v80, never committed), `cms/data/.htaccess` (gone after v51), the v42 Gift Concierge (killed by a later home rewrite). All three restored; the other flagged drops (home-v43/hallmark-v43/v105 css+js) are adjudicated in `tools/fresh-install/lineage-adjudications.json` with reasons, and the audit exits 1 while any drop is unexplained.
- **No PHP in the sandbox:** got a real grammar instead — `pip install --break-system-packages tree-sitter tree-sitter-php`, then `tools/fresh-install/php-syntax.py` (parse, ERROR/MISSING nodes) + `php-semantics.py` (function scope + derived builtin vocabulary). php-semantics caught a genuine bug in my installer (`followups()` reading `$ROOT` without `global`) — exactly the v114/v113 class of fault. Say plainly: `install.php` is verified by parse + gates, **never executed**.
- **Clean-store seed rules:** keep settings/rates/makingCharges/products/coupons/catalogs; empty users·orders·reviews·partners·settlements·tokens·otps·loginfails·securityLog·*Orders; `bullion` money zeroed **but the book shape kept** (collapsing it to 0 would break the Bullion Desk); `products[].reviews` counters reset to agree with the empty review list; rates history → newest 12; `indent=1, ensure_ascii=False` to match db.json style.
- **Bundles carry NO live `data/db.json`** (a fresh host must not inherit another host's customers) and the media pack contains no `js/ css/ data/ index.html api.php` at all — G8 asserts it, so "a media pack can never overwrite your install" is a fact, not a promise.
- **Gates to re-run before any fresh-install merge:** `make-seed.py --check` · `lineage-audit.py` · `build.py` · `verify.py` (unpacks the zip, copies seed→db.json, runs v113b 32/32 + php gates) · `t11` (needs `python3 qa/preview_shim.py` + jsdom; `ln -s <repo>/tools/mega/smoke/node_modules /tmp/node_modules` so harness.mjs resolves it).
- **Packing rule worth keeping:** a folder's `.htaccess`/`.gitkeep` is a LOCK, not content — `lib_pack.tier_of` must send it to **core** even when the folder's media goes to the media pack, or a core-only install gets bare `uploads/kyc/`. `verify.py` G4 asserts the nine guards plus `install.php`'s re-write path. Same sweep: `cms/make_icons.py` out of the web bundle, `images/reviews/*` out of a bundle whose seed has no reviews.
- **Housekeeping:** `.gitignore` now excludes `dist/` and `node_modules/`; the *core* bundle is committed at the repo root like any other release zip (35.1 MB, under GitHub's wall). `qa/browser/t8/t9/t10` hang on this tree **without** my changes too (they target the v106–v109 baselines per README) — the canonical current gates remain v113b-check + php-sweep, both green.

## Session 2026-09-15 #2 (arena/01a0a310) — v115: "v113 deleted my categories"
- **Owner complaint:** after extracting v113 all product categories "removed"; quick view still bounced; hero swipes still dead on Android Chrome.
- **Truth (verified live):** all 65 products intact on `/api/products`. v113's app.js carried v111's `LIVE_CATS()` (hide categories with no products) → rings-only catalogue = one "Rings" tile everywhere. Display filter, not data loss.
- **v115 fixes:** `LIVE_CATS()` → full CATS (all 17 tiles); index.html↔app.js release handshake (`__SHIVAA_REL` vs `APP_REL`, one guarded reload) so a phone can't pair fresh shell + stale script; quick view falls back to `/api/products` list (SW-cached) and never navigates away; carousel `touch-action:pan-y` on the container + `draggable="false"` on banners + vertical-intent 14px/×1.35; **rtgs_strip() display-unit bug** (was per-gram under ₹/10g label — ₹15,491 "per 10 g"; now ×10/×1000 like the desk renders). SW shell → `shivaa-shell-v115`.
- **Deploy:** zip `shivaa-update-v115.zip` (6 files, root layout) + auto-sync from `main`. **Owner phone step after upload: close ALL Chrome tabs of shivaa.in, reopen fresh (or pull-to-refresh twice); last resort Site settings → Clear & reset.**
- Gates: smoke 32/32 (new: home grid shows 17 tiles), re-run on the zip overlay; php-sweep 211/0; sw precache == index.html 21/21.

## Session 2026-09-15 #1 (arena/01a0a2e9) — v114 invoice FY
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
