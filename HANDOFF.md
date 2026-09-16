# SHIVAA JEWELLERY — HANDOFF DOCUMENT

**Last updated: 2026-09-16 (v123 — category-photo refresh: 17 real AI-cleaned owner tiles + ?v=123 cache-bust).**
**v123 STATUS: MERGED + LIVE — merged as PR #48 (`bfc3908`) into `main`; owner live-verified 16 Sep, `https://shivaa.in/sw.js` → `SHELL = 'shivaa-shell-v123'`.**
**v123 is the required forward baseline: never restore the v113b placeholder category tiles, and never re-publish a `?v=` stamp older than 123.**
**Live site: https://shivaa.in · Repo: theunreal8055-coder/Shivaa.ecom**
**THIS FILE IS THE SINGLE SOURCE OF TRUTH. It is on GitHub. Any new chat reads this and continues.**

---

## 🚀 v119 — 22K PREMIUM ₹398 (desk physical) + PUBLISHED RATE ANCHOR + FIRST-PAINT PACK (2026-09-15)

**✅ LIVE ON shivaa.in — VERIFIED FROM THE LIVE SITE (15 Sep 2026, 20:48 IST, reads not assumptions; re-confirmed 20:54 IST).**
Merged to `main` via PR #45 (merge `e2a4dd5`, 19:31 IST). `/api/rates` → `premium.gold22 = 398`,
`anchorLevel.mode = mcx-future`, `jaipur.gold22 = 14200` = `round(15056 × 0.9167) + 398`.
Every 22K piece is **+₹343/g** over v118. `/api/products` → all 22K rings ≈ ₹14,231/g;
PGS5004 (3.83 g) = ₹62,877. `/sw.js` → `SHELL = 'shivaa-shell-v119'`; `/js/v119.js` served as
real JS → the zip landed in the `public_html` ROOT (not a sub-folder). Re-check 20:54 IST:
anchor goldPerG 15040 → jaipur.gold22 14185 = `round(15040 × 0.9167) + 398` ✓ (formula holds
as the tick moves). **Rate factors LOCKED — never change a premium or the anchor formula
without an explicit owner instruction.**
**Deploy warning:** the server's main-tracking auto-sync cron did NOT fire for PR #45 (live
still read v118 ~50 min after the merge); the release shipped by manual zip upload.
Investigate the cron (config branch value, GitHub PAT expiry, cron logs) before trusting
push-to-deploy for any future release. Post-merge, the owner uploaded
`67 rings ladies plain hitesh bhai_compressed.pdf` to `main` (`82dc23b`, zero `cms/`
changes — v119 code intact): next catalogue batch intake (ladies' plain rings, supplier
Hitesh). **PR #43 (pre-v118 Feather) and PR #38 (stale hero/Quick View) were closed
UNMERGED on 15 Sep 2026 — never merge them.**

**Owner decision implemented (Task 2, LOCKED — do not change the numbers):** the 22K
retail premium is **₹398/g on the desk-physical basis**. `/api/rates` now publishes
`premium.gold22` and an `anchorLevel` block, and `jaipur.gold22` is derived from that
one anchor:

* `premium: {gold22: 398, gold: 55, silver: 3}` — `gold` stays the 24K line
* `anchorLevel: {mode: "mcx-future" | "spot" | "override", goldPerG, silverPerG, source, at, ageMs}`
* `jaipur.gold22 = round(anchorLevel.goldPerG × 0.9167) + 398`
  (live example: anchor 15,084 → 13828 + 398 = **14,226**)
* 24K/18K lines keep `jaipurPremium` (55) untouched; an admin override still wins.
* Every 22K piece is **₹343/g** dearer than v118 (398 − 55). A 3.83 g ring (PGS5004)
  moved ₹61,340 → ₹62,855 — the per-gram rate is exactly +343, the total also carries
  the percentage making charge.

**Also in v119 (the first-paint/mobile pack, ported additively from the unshipped
PR #43 "Feather" line — never wholesale, PR #43 is pre-v118 and would revert v118):**

* **Skeleton** inside `<main id="view">` → real first paint before `app.js` runs;
  `body.shv-ready` retires it, `js/v119.js` adds a 9 s honest "tap to retry" safety net.
* **Shop slices:** the grid renders 20 cards, then grows via `#shopSentinel` +
  IntersectionObserver (`Shivaa.shopLoadMore()`); the filter/sort list is still whole.
* **HUID chip (honest):** prints a HUID only when the catalogue carries one
  (`p.huid` / `hallmark.entries[].huid` — all 63 records are `not_provided` today);
  otherwise it is a labelled *HUID check* guide to the BIS Care walkthrough.
* **Install chip** from the **2nd visit**, only when `beforeinstallprompt` fires; Close
  is remembered, `display-mode: standalone` hides it.
* **Pinch zoom** on the Quick View photo (1×–4×, never swipes a shot) + tap zoom kept.
* **.htaccess:** guarded brotli + `immutable` caching for `?v=` assets (deflate kept).
  **Merge it — never blind-overwrite** a panel `.htaccess`.
* Deliberately **skipped:** the PR #43 `srcset` (its `-400/-800` derivatives do not
  exist on the server; a missing file would trip every card's `onerror` fallback).

**Proof (all re-run on source AND on the extracted zip overlay):** v113b **32/32** ·
v117 **27/27** · v118 **18/18** · **v119 27/27** · php-sweep **211 routes · 0
exceptions**. The shipped `api.php` was additionally executed under a real PHP 8.5
(php-wasm) with a seeded MCX tick: `premium.gold22=398`, `anchorLevel.mode=mcx-future`,
`jaipur.gold22=14226` (matches the formula), plus the `spot` and `override` paths.

**Deliverable:** `shivaa-update-v119.zip` (10 files — `index.html`, `sw.js`,
`.htaccess`, `api.php`, `js/app.js`, `js/v107.js`, `js/admin.js`, `js/v119.js`,
`css/v119.css`, `DEPLOY-v119.md`) + `cms/DEPLOY-v119.md` with the merge-the-.htaccess
instruction and the 5-minute owner phone pass.

**Owner phone pass (5 min):** shop scroll slices · tap/pinch zoom · HUID chip · rates
page (22K premium + anchor) · install chip on the 2nd visit.

---

## 🚀 v112 — PayU + Bullion LIVE FIXES (2026-09-14, branch `arena/01a0a030-shivaa-ecom` — READY TO MERGE)

**Owner tasks (one chat, 4 fixes):**
1. **PayU payment gateway broken** — "Merchant Key and Salt not matching" + checkout fell back to 9999999999/Customer
2. **Bullion app every-millisecond** — rates updated every 15 sec, wanted smooth ms motion
3. **Rate drift** — silver $63.01 vs $63.10, gold $4277.80 vs $4279, Jaipur 154890 vs 155500 (≈200₹ low)
4. **Connect live rates panel to bullion panel** — take data from bullion, leave interface as is

**What was done — PayU (cms/api.php + isolated file):**
- **B1 CRITICAL** `pay/order` used `($o['address']->phone ?? '')` on ARRAY-stored address → always null, fell back to placeholder + PHP Warning. Fixed to `['phone']`/`['name']` (also PhonePe dormant block).
- **B2/B3** `payuKey` regex `^[A-Za-z0-9]{4,32}$` and `payuSalt` `^[A-Za-z0-9]{8,80}$` rejected real salts with `_/-`. Relaxed to `^[A-Za-z0-9_\-]{4,40}$` and `^[^\s|]{8,128}$` — the "not matching" was local validation, not PayU.
- **B4** `payu_reconcile` fallback `array_key_first` could credit WRONG txn — removed, strict `$details[$txnid] ?? null` only.
- **B5** `admin/pay-test` probe looked for `"not exist"` but PayU returns `"No Transaction Found"` → valid test creds always said rejected. Now checks `invalid key/hash/auth` absence and treats 200 JSON as valid.
- Files: `cms/api.php` (4 hunks), isolated `cms/payu.gateway.fixed.php` (260 lines, `if (!function_exists)` drop-in + `payu_validate_settings` helper), `cms/PAYU_BUGFIX_REPORT.md`, `payu-update-20260914.zip` (payu.gateway.fixed.php + report + cms_api_fixed.php + README).

**Bullion millisecond:**
- `cms/js/app.js` `scheduleRatesPoll` 15s→1s live, 60s→5s off-hours; `visibility` maxAge 20/90s→3/10s.
- Added 60fps `requestAnimationFrame` lerp (`_msTick`) between 1-sec MCX ticks so ticker LOOKS like every ms (real MCX is 1/sec exchange limit).
- Files: `bullion-update-20260914.zip` (app.js + README), committed to branch.

**Rate drift investigation (no code, settings fix):**
- Root causes: source mix (MCX future vs Yahoo spot vs gold-api spot → 1-2$ diff), FX provider mix (Yahoo vs ECB → 63.10 vs 63.01), Jaipur premium `+55` vs real Jaipur ~+200, rounding `int(round())` vs exact decimals, 10-min DB vs 1-sec tick cache.
- Fix: fill Angel tokens/relay → `source=live-mcx`; adjust `jaipurPremium`/`jaipurSilverPremium` in Admin Settings to add 200₹ diff; keep decimals if needed.

**Connect live rates ↔ bullion (2026-09-14 afternoon):**
- `current_rates()` now checks `live_tick_quote($db,120)` first → `jaipur_live_from_tick()` — so storefront ticker/product/cart/checkout ALWAYS show same gold/silver as bullion panel (`.angel-tick.json`). Interface unchanged, only data wired.
- Fallback to `db['rates']['last']` only if bullion stale >120s.
- Zip: `connect-rates-bullion-20260914.zip` (cms_api_connected.php + README).

**Live deployment reality (Hostinger):**
- Owner found `api.php` directly in `public_html/` (not `public_html/cms/`). That IS the live API — deploy = overwrite `public_html/api.php` (and `public_html/js/app.js` or `public_html/cms/js/app.js` — search for `app.js` to find).
- Owner already uploaded `payu-update-20260914.zip` → `public_html/api.php` replaced correctly.
- Next uploads: `bullion-update-20260914.zip` → `app.js` at found path; `connect-rates-bullion-20260914.zip` → `api.php` again (or just keep last api.php which already includes both fixes if merged).

**Branch state:**
- All v112 work on `arena/01a0a030-shivaa-ecom` (4 commits: PayU, bullion, connect, zips). Pushed, not yet merged to `main` — **to make persistent for ANY new Arena account, merge this branch → main via PR** (see ARENA-STATE.md §2 rule 3).


---

## 🚨 v111 — OWNER ORDERS (2026-09-14): no sample products · fix zoomed ring photos · 65 rings live

**What the owner asked (verbatim intent):** "I don't need any kind of sample
products. I just need 65 rings perfect photoshoots, visible in the ring
section. Some rings are too zoomed in — people cannot even see the ring design
perfectly. Fix that and post and upload all the 65 rings into my website."

**Ground truth discovered this session:**
1. The 2026-09-13 "Ring Reset" GitHub Actions run (looked failed) actually
   PARTIALLY worked: it deleted the old live rings and uploaded PGS5001–5007
   (that's why the live shop shows 7 products), then died on PGS5008 because
   its staged meta.json carried a `hallmark` key the API rejects
   (`hallmark_guard_product_write`). Connectivity GitHub-runner → shivaa.in and
   the `SHIVAA_ADMIN_PASSWORD` secret are BOTH proven working.
2. Programmatic zoom audit (`tools/photoshoot/zoom_check.py`, gold-blob margin
   analysis): **43 of 65 covers were too zoomed** (41 spanned 100% of the frame
   width, cut at both side edges; 2 more spanned 86–92%) + **18 editorials**
   genuinely cut (deep gold at the frame edge). Root cause: `finalize.py`
   centre-crops generated (often 2:3) images to 896×1195, slicing wide ring
   shots at the sides. QA standard: covers = strict (margins ≥3%, span ≤88%);
   editorials = crop-only (span ≤95%, no deep-gold cut) — campaign shots may
   sit near an edge if the ring is whole.
3. Live state is readable from the sandbox via `fetch_page` on
   `https://shivaa.in/api/products` (bash/curl is TLS-blocked; the page fetcher
   is not). Use this to verify live state any time.

**Done this session (branch `arena/01a09f6d-shivaa-ecom`):**
- Master `cms/data/db.json`: 405 → **65 products (PGS rings only)**. The 340
  sample products are archived verbatim at `qa/archive/samples-340-v111.json`
  (restore = merge `products` back). Diff is pure deletion; byte-faithful
  round-trip preserved (indent=1, ensure_ascii=False).
- `cms/js/app.js`: new `LIVE_CATS()` — all category menus/filters/sliders
  (nav mega-menu, mobile menu, footer, home mini-cards, shop checkboxes,
  search suggestions, B2B select) now render only categories that have
  products, so nothing links to empty shops.
- New tools: `tools/photoshoot/unbadge.py` (strips the baked-in Shivaa INC.
  badge before regen) and `tools/photoshoot/zoom_check.py` (zoom/crop QA gate;
  PASS = margins ≥3% each side, ring span ≤88% width).
- Zoom-fix batch 1 DONE (PR #25 merged): covers PGS5001–5010 regenerated
  (pulled-back camera, full ring visible, badge re-applied), installed to
  `cms/images/designs/rings/` + `demo65/media/*/shot_studio.jpg`. 9/10 PASS zoom
  QA; PGS5005 needs one re-roll. Remaining: 34 covers + 18 editorials (52
  generations ≈ 6 turns at the 10-img cap). Batch ledger + per-turn
  instructions: `tools/photoshoot/ZOOMFIX-STATE.md`.
- New deploy path: `deploy/catalogue_deploy.py` + `.github/workflows/catalogue-deploy.yml`
  — makes the live catalogue EXACTLY the 65 PGS rings (deletes non-PGS strays,
  uploads 4 photos per ring via `/api/media`, PUT-updates existing SKUs in
  place / POSTs new ones, strips the API-rejected `id`/`createdAt`/`hallmark*`
  keys — the exact bug that killed the 2026-09-13 run — plus retries + resumable
  ledger + independent verify step). Zoom-QA gate blocks `live=YES` until all
  130 cover/editorial checks PASS (override input exists for emergencies).

**🚀 GO-LIVE this session (branch `arena/01a0a077-shivaa-ecom`):**
- Ground truth before this run: live `/api/products` still had only PGS5001–5007
  (the 2026-09-13 partial ring-reset). Master `cms/data/db.json` already has
  exactly 65 PGS rings, 4 shots each, no videos, all files on disk.
- Arena cannot `workflow_dispatch` (403). PR #27 added the push trigger on
  `deploy/GO-LIVE-v111.txt` but never committed the marker (it was waiting on
  zoom batches 2–7). Owner this turn: push finished v111 and go live.
- Marker is now committed with `GO` + `ZOOM_GATE=NO` (conscious override so
  remaining zoom FAILs do not abort the live write). Workflow also fixed:
  verify-step email was `inputs.email` (empty on push → login would fail after
  a successful upload).
- Merging this PR to `main` fires Catalogue Deploy LIVE=YES. Verify after the
  Actions run: https://shivaa.in/api/products → 65 PGS, 0 samples, 0 videos.

**⏳ FOLLOW-UP (does not block live): zoom batches 2–7** per
`tools/photoshoot/ZOOMFIX-STATE.md`. **Batch 2 DONE** (session arena/01a0a0a6, PR #32 → main `1a98b6c`:
covers 5005 re-roll + 5011–5020, editorial 5003 — all PASS, installed to cms +
demo65; GO-LIVE marker re-bumped so the merge fired Catalogue Deploy run
34868057801 to refresh live photos). Remaining: 25 covers + 17 editorials
(batches 3–7). Lost commit 0a2b3f5 was verified unrecoverable (GitHub API 422 —
it was never pushed) and re-done from scratch. **Live catalogue re-verified by
full read of `/api/products` (~16:25Z): exactly 65 products, SKUs PGS5001–5065,
0 samples, 4 shots each.** Owner next wants app changes (list pending).

**v110 bridge (`deploy/catalogue_sync_bridge.php`) is SUPERSEDED by the
Catalogue Deploy workflow** — the live catalogue is the 65 rings, not 405.
Do not run the v110 bridge.

---

## 🎯 v110 — (2026-09-14) full-catalogue delivery bridge — SUPERSEDED by v111

**Owner reported:** opening shivaa.in's product section shows only seven products.
**Root cause (verified in code):** the storefront loads products from the LIVE
server's `public_html/data/db.json` via `/api/products`. The auto-sync cron deploys
`cms/` CODE (including all `/images/...` photos) but is hard-forbidden from touching
live `data/` + `uploads/` (protects live orders). The 405-product master
(`cms/data/db.json`) therefore never reached the live database — only ~7 old items
were in it. The sandbox still cannot reach shivaa.in directly (`SSL_ERROR_SYSCALL`,
re-verified today), so delivery must run server-side, exactly like the v44 ring reset.

**Fix built (owner-approved path = tablet bridge, keep existing live items):**
- `deploy/catalogue_sync_bridge.php` — one file, same proven pattern as
  `ring_reset_bridge.php`. Steps: login → (1) download master db.json from GitHub
  main + show plan (adds/refreshes/kept/photos) → (2) upsert products 30/tap
  (POST new / PUT existing by SKU, ledger-resumable, strips the API-rejected
  `hallmark*`/`id`/`createdAt` keys, NEVER deletes) → (3) fetch any missing
  `/images/...` photos 25/tap → (4) verify per-category counts (want 405) →
  (5) self-destruct. Runbook: `deploy/CATALOGUE-SYNC-BRIDGE.md`.
- Pre-flight verified: all 405 records have name + weightG>0 + sku + ≥1 image;
  all 334 unique referenced photos exist in `cms/images` (zero missing; 91.6 MB tree).

**⏳ PENDING (owner action, ~10 min on the tablet):** ~~run the bridge~~ **CANCELLED
by v111** — the owner ordered samples removed, so the live catalogue will be the
65 rings only, delivered by the v111 Catalogue Deploy workflow instead. Do NOT
run this bridge.

**Known cosmetic follow-up (NOT changed without owner approval):** 340 products
(all 20 × 16 non-ring categories + the 20 original rings) carry tag `sample`,
which the card renders as a literal "sample" badge (`app.js` TAGS has no mapping).
The 65 PGS rings do not. Ask the owner before stripping the tag in master + live.

**Do NOT merge stale PR #23** (`arena/01a06a7a…`, auto-titled "Arena/01a06a7a"):
it predates consolidation, contains only **342 products**, and merging would delete
~83k lines / 1,000+ files. Close it without merging (branch stays archived).

---

## 🎯 CONSOLIDATION (2026-09-14) — the "never start from zero again" merge

**Problem the owner reported:** new chats branched from a stale `main` while the
newest work (v105–v109) lived only on side branches — every few sessions it felt
like work was lost and had to restart from 0.
**Fix (this merge, `arena/01a09f25-shivaa-ecom` → `main`):**
- Base = v108-MEGA tree (`arena/01a09dc4` @ `60b6c8d`): full v107.4 line
  (PR #21) + boost layer + cinematic films + banners + owner zips v56–v92.
  Verified a strict superset of `main` (zero main-only files, trees identical).
- Layered on top = v109 line (`arena/01a09edc` @ `931ff72`): shopper polish
  (`v108.css`/`v108.js`, 2nd card photo, WhatsApp chat, share) + 100-feature
  pack (`v109.js`). 3-way merge vs v107.4: 3 files taken from v109 (`app.js`,
  `sw.js`, HANDOFF), 1 hand-merged (`index.html` keeps boost AND v108/v109
  wiring), `db.json` kept from v108, 3 new files added, 98 v108-only files kept.
- 1-line fix: precache `/js/v109.js` in `sw.js` (the pack forgot its own entry).
- PRs #21, #11, #15, #19 closed as contained-in-main; their branches stay on
  GitHub as archives. `main` is now the single source of truth — see
  [`ARENA-STATE.md`](ARENA-STATE.md) for the forward-only rules every chat follows.

---

## 🎯 v108 — SHOPPER POLISH (2026-09-14)

Additive layer on v107.4. Catalogue, weights, prices untouched (405 products).
- Second photo on every product card (all 405 have 2+ images) — hover on desktop, flip chip on phone
- WhatsApp chat button (the old `.wa-fab` was `display:none !important` and never injected)
- Skip-to-jewellery, share on the product page, category counts, phone snap-scroll on bestsellers
- Files: `cms/css/v108.css`, `cms/js/v108.js` (removable). `app.js` productCard only. SW shell `shivaa-shell-v108`.
- Rollback: delete the two v108 tags in `cms/index.html`.

---

## ⚠️ DISCREPANCY NOTE (2026-09-08) — verified ground truth vs. earlier chat claims

An earlier chat reported "39 creamy-white `_face.jpg` images generated and committed
locally (`bd2c1eb`)". **Verified false on 2026-09-08:** commit `bd2c1eb` exists on no
branch (local or origin), and zero `_face.jpg` files existed anywhere in history.
What IS true (all verified against origin):
- PR #14 merged to `main` (`ba3f69c`): 65/65 PGS rings full photoshoots ✅
- PR #14 also included "white-bg batch 1/7" (`ef6ef73`): the `_shot_studio.jpg` of
  PGS5001–PGS5010 was REPLACED in place with a creamy-white version (not saved as `_face.jpg`)
- Corner-luminance scan of all 65 studio shots: **34 already have a creamy-white face**
  (5001-5010, 5014, 5015, 5022, 5023, 5025-5027, 5029, 5032, 5033, 5035, 5036, 5043-5045,
  5047, 5049, 5050, 5058, 5061-5065) and **31 were still dark** at the start of this pass.
Treat any other claim from that chat as unverified until checked on disk/origin.

---


## 🎯 v45 — GITHUB ACTIONS RING RESET WORKFLOW (2026-09-08)

Owner requested a repo-secret based workflow so the live ring reset can run from GitHub Actions instead of tablet/Hostinger steps. Added `.github/workflows/ring-reset.yml` on the current Arena branch and will merge it to `main` before running. The workflow:
- requires manual `workflow_dispatch` input `live=YES` before it performs live writes; any other value is a dry-run,
- uses repo secret `SHIVAA_ADMIN_PASSWORD` with admin email `admin@shivaa.in`,
- runs `deploy/ring_reset.py --live` to delete live rings and upload the staged 65 PGS rings,
- independently verifies the live catalogue has exactly 65 PGS rings and 0 ring videos.

---

## 🎯 v44 — CREAMY-WHITE FACE + RING RESET (owner-approved) — REPO WORK ✅ COMPLETE

Plan approved by the owner (do NOT re-ask):
1. ✅ Creamy-white face for every dark PGS ring → `cms/images/designs/rings/{SKU}_face.jpg`
   (31 generated this session; the other 34 already had white `_shot_studio.jpg` covers).
2. ✅ db.json wired: `images[0]` = white face cover, `images[1..3]` = editorial/worn/gift,
   **`video` removed from all 65 PGS rings**. 405 products intact, every image verified on disk.
   (Frontend needs no change — `app.js` renders the FILM badge/slide only when `p.video` exists.)
3. ✅ `demo65/media/{SKU}/` staging synced: `shot_studio.jpg` = white face cover, `video.mp4`
   deleted, `meta.json` images updated + video key removed (65/65).
4. ⏳ LIVE SITE (the only remaining step — needs a non-sandbox machine; PR #16 MERGED to main
   on 2026-09-08, so all media/meta are fetchable from GitHub main):
   **delete all 85 rings → re-upload 65 (4 images, no video)** — two equivalent paths:
   - **Tablet/phone (no terminal): `deploy/ring_reset_bridge.php`** ← owner is on a tablet.
     hPanel File Manager → create secret folder in public_html (e.g. `rst-x7k2q`) → upload
     this one file → open `https://shivaa.in/<folder>/ring_reset_bridge.php` → login →
     Step 1 Delete → Step 2 Upload (tap ~17×, 4 rings/tap; server pulls media itself from
     raw.githubusercontent.com main) → Step 3 Verify (65 rings, 0 videos) → SELF-DESTRUCT,
     delete folder, rotate admin password. Ledger-resumable, rings-only.
   - Laptop/SSH: `python3 deploy/ring_reset.py --email … --password …` (dry-run), then `--live`.
   NOTE: the auto_sync.php cron (if ever installed) requires video.mp4 per design and thus
   will NOT sync this no-video batch — the bridge/script above is the correct path. Also
   remember to deploy the new `cms/` code (db.json face covers) via zip or auto-sync AFTER
   the reset, or product pages will still reference old media on stale caches.

### Face-pass ledger (31 dark rings) — ALL DONE ✅
- batch 2 (10, `b1545df`): PGS5011 5012 5013 5016 5017 5018 5019 5020 5021 5024
- batch 3 (10, `37de002`): PGS5028 5030 5031 5034 5037 5038 5039 5040 5041 5042
  (5037 ref had a white price tag — cropped out before generation)
- batch 4 (8, `ba45553`): PGS5046 5048 5051 5052 5054 5055 5056 5059
- final (3, this commit): PGS5053 (re-rolled: first gen broke the shank), PGS5057
  (re-rolled: pavé bars offset), PGS5060

---

## 🚀 HOW ANY NEW CHAT STARTS (owner: just do these two things)

1. Open a new chat (any branch session) and connect it to this GitHub repo.
2. Say: **"Read HANDOFF.md first before doing anything"** — then paste/ask your task.

The agent reads this file + `tools/photoshoot/SESSION-STATE.md` and knows:
what exists, what is done, what is pending, how to deploy, and what never to touch.
**No information needs to be re-explained. Ever. This file is always updated after every work session.**

---

## ⛔ STRICT RULES — NEVER BREAK (carried from v42, still law)

1. DO NOT delete any existing products, data, features, or files unless the owner explicitly asks
2. Read `cms/data/db.json` BEFORE making changes — understand what exists
3. Back up before major changes — `git add -A && git commit -m "backup before [change]"`
4. After changes, verify nothing was lost — count products, count images
5. When adding new data, verify it actually got added — count and confirm
6. Ask the owner before removing anything — even if it seems unused
7. **Update THIS HANDOFF (or `tools/photoshoot/SESSION-STATE.md`) after EVERY work session — every step, every product**
8. Only move FORWARD — never undo working features
9. COMMIT EVERY TURN and `git push origin <branch>` — sandbox resets can wipe uncommitted work
10. Work only on the current session branch (the `arena/…` branch Arena gives you). Never switch branches.

---

## 📡 DEPLOYMENT — HOW IT WORKS (read this before saying "deploy")

**Hard fact (verified 7 Sep 2026):** the Arena chat sandbox CANNOT reach shivaa.in.
DNS resolves but the firewall kills the TLS handshake (`SSL_ERROR_SYSCALL`, curl exit 35,
3/3 attempts). No chat — this one or any future one — can call the live site's API directly.
That is why `deploy/UPLOAD-RUNBOOK.md` and `deploy/AUTOMATION.md` exist.

**Therefore deployment = GitHub push + server-side auto-sync:**

1. **One-time owner setup (~5 min, per `deploy/AUTOMATION.md`):**
   - On the Hostinger server: put `deploy/auto_sync.php` in the home dir.
   - Save its config (`~/.shivaa-sync.json`, 0600) with: admin email + password,
     `repo: theunreal8055-coder/Shivaa.ecom`, **`branch: arena/01a07bb3-shivaa-ecom`** ← the
     branch the agent works on (older docs mention `arena/01a07082-…` — that is WRONG now),
     optional read-only GitHub PAT, `deploy_code: true`.
   - hPanel cron: `php /home/<USER>/auto_sync.php` every 5 minutes.
2. **From then on, EVERY deploy from EVERY chat is just:** finish the work →
   `git add -A && git commit && git push origin <branch>`. Within ~5 minutes the server
   pulls the branch and automatically:
   - deploys changed `cms/` code to `public_html` (verified + smoke-tested + auto-rollback;
     **never** touches live `data/` or `uploads/`), and
   - uploads every design in `<batch>/media/{SKU}/` that has complete media
     (4 shots + `video.mp4` + `meta.json`, staged by the agent) to the live catalogue
     via `/api/media` + `/api/products` (upsert by SKU, ledger-deduped, resumable).
3. **Manual alternative paths** (if cron not installed):
   - Zip: `shivaa-update-v43-rings-batch1.zip` (9 rings) — see `DEPLOY-v43-RINGS-BATCH1.md`.
   - API from any online machine: `python3 pipeline/06_upload.py --config demo65/config.json --live --only <SKUs>`.

**When the owner says "deploy" in a chat, the agent's job is:** finish + verify staging,
commit, push, confirm in HANDOFF that batch N is pushed, and remind the owner the server
cron deploys it within ~5 min (or run Path B manually if no cron).

---

## ✅ CURRENT STATE (v43 COMPLETE — 65/65 full photoshoots)

### Product counts (405 total in db.json — MUST stay 405 unless owner orders otherwise)
| Category | Count | Status |
|----------|-------|--------|
| Rings | 85 = 65 PGS + 20 original | ✅ ALL 65 PGS full photoshoot (4 shots + film each) |
| Necklaces, Earrings, Bangles, Bracelets, Pendants, Mangalsutra, Nosepins, Silver, Bajubandh, Rakhdi, Aad, Sheeshphool, Hathphool, Punach, Bridal Anklets, Chains | 16 × 20 = 320 | Untouched, live |

### PGS RING LEDGER (all 65 — agent: keep this exact table current)
**✅ Full photoshoot since v42 (39):**
PGS5001 5002 5003 5004 5005 5006 5007 5014 5015 5016 5017 5018 5022 5023 5024 5025 5026 5027 5029 5032 5033 5035 5036 5043 5044 5045 5046 5047 5049 5050 5051 5057 5058 5060 5061 5062 5063 5064 5065

**✅ Full photoshoot completed in v43 (26):**
PGS5008 Mehndi · PGS5009 Jharokha · PGS5010 Marudhara · PGS5011 Sheesh Mahal ·
PGS5012 Hawa Mahal · PGS5013 City Palace · PGS5019 Heera · PGS5020 Panna · PGS5021 Manik ·
PGS5028 Banas · PGS5030 Thar · PGS5031 Shekhawati · PGS5034 Udaipur ·
PGS5037 Kumbhal · PGS5038 Ranakpur · PGS5039 Dilwara · PGS5040 Nahargarh ·
PGS5041 Baori · PGS5042 Sindoor · PGS5048 Kesar · PGS5052 Kundan ·
PGS5053 Jadau · PGS5054 Thewa · PGS5055 Minakari · PGS5056 Rani Padmini ·
PGS5059 Kanchan
(each: 4 AI shots 896×1195 + 10s 720×720 film, in `cms/images/designs/rings/`, wired in db.json,
 media staged in `demo65/media/{SKU}/` for the uploader)

**✅ MILESTONE REACHED — all 65 PGS rings now have full photoshoots** (39 pre-v42 + 26 in v43).

**Owner's "31 rings / 93 images" note:** ground truth on repo = the 26 PGS rings above
(all 26 were pending when v43 started). No PGS5066+ exists anywhere.

### Key files
| File | Purpose |
|------|---------|
| `cms/data/db.json` | Product DB (405). api.php serves it. Byte-faithful round-trip: `json.dumps(db, indent=2, ensure_ascii=True)` |
| `cms/images/designs/rings/` | All ring media (refs + shots + videos) |
| `tools/photoshoot/` | make_refs.py · finalize.py · video.py · db_update.py · badge assets · SESSION-STATE.md |
| `demo65/` | Batch-1 staging: `work/designs.json` (65 designs) + `media/{SKU}/` for the uploader |
| `deploy/auto_sync.php` | Server cron worker (pull + deploy + upload). Setup: `deploy/AUTOMATION.md` |
| `pipeline/06_upload.py` | Manual API uploader (Path B) |
| `DEPLOY-v43-RINGS-BATCH1.md` | Batch-1 deploy instructions (zip + API paths) |

### Gold rates (per gram): 24K ₹15,600 · 22K ₹14,300 · 18K ₹11,603 · Silver ₹239

---

## 📝 SESSION STEP LOG (newest first — append every session)

**2026-09-16 — v123 category-photo refresh (branch `arena/01a0a7e6-shivaa-ecom`) — MERGED + OWNER LIVE-VERIFIED**
1. Owner asked for new homepage category-slider photos; read MEMORY/HANDOFF/ARENA-STATE first; branch verified at tip of main (`2ad3bad`, PR #47), worktree clean.
2. Discovered the 17 hash-named owner jpgs at the repo root map 1:1 onto the 17 `CATS` keys (owner upload that arrived with PR #47); 14 were re-attached in chat, 3 read from the root. Mapping: rings 12747ae · necklaces de394b8 · earrings 94aa472 · bangles d1e2bb8 · bracelets 18da0318 · chains 98af24b · pendants 4f829c7 · mangalsutra e74d8a1 · bajubandh 921a4a7 · rakhdi d2cf594 · aad a040aef · sheeshphool c361740 · hathphool 3c38980 · punach b5aa894 · bridalanklets 91c89e0 · nosepins 57181fc · silver c7c3804.
3. AI-edited each photo (generate_image, reference edit): watermarks/ad text removed (NAKODA, MAHAKALI, nakodapayal, chhatralajewels, "Kada Payal"), jewellery kept identical; finalized 420×420 q82 with Pillow; every tile read back and QA'd; old 17 placeholders backed up to /home/user/cat_backup_v122 and restorable from `2ad3bad`.
4. Re-versioned all six render sites + v116 pre-boot list `?v=120`→`?v=123`; handshake triple → 123; SW `shivaa-shell-v123`; precache app.js/v116 at 123. New `tools/mega/smoke/v123-check.js` (14); v117–v122 suites forward-compatible.
5. Gates on finished tree: 32/32 · 27/27 · 18/18 · 27/27 · 24/24 · 14/14 · 22/22 · 14/14 · php-sweep 211/0. Deliverable `shivaa-update-v123.zip` (22 files, root layout) + `DEPLOY-v123.md`. Rates LOCKED, api.php/.htaccess/db.json untouched. PR → main.
6. Lesson: the image-edit endpoint drops long prompts with empty responses — short prompts go through.
7. **Merged:** PR **#48** merged to `main` as `bfc3908`. **Owner live-verified 16 Sep:** `https://shivaa.in/sw.js` → `SHELL = 'shivaa-shell-v123'` (the real photos serving on the homepage + shop sliders). These two lines existed only as local-only doc commits in that session's sandbox — re-added to `MEMORY.md` / `HANDOFF.md` / `docs/AGENT-HANDOFF.md` on 16 Sep so the merged+live state survives a reset. (PR #48 merge re-verified from GitHub: `MERGED`, merge commit `bfc3908`, `mergedAt 2026-09-16T02:37:32Z`.)

**2026-09-15 — v118 storefront repair (branch `arena/01a0a48d-shivaa-ecom`, commit `0f699f8`, PR #41) — OWNER CONFIRMED WORKING**
1. **Intake/continuity:** owner reported five storefront failures and requested an update ZIP. Read `docs/AGENT-HANDOFF.md`, `MEMORY.md`, `READ-ME-FIRST.txt`, `HANDOFF.md` and `ARENA-STATE.md` before editing; verified branch started at v117/main commit `ea2d48b` and the worktree was clean.
2. **Four-photo PDP gallery:** preserved the 4 existing images per product. Converted gallery dots to labelled buttons; added active/`aria-current` state; kept arrow controls; used `translate3d`; captured the pointer so a finger leaving the frame cannot kill a swipe; handled pointer cancel/lost capture; distinguished vertical page scrolling from horizontal gallery intent; lowered horizontal threshold to 36px; put 44px controls above zoom/lightbox layers.
3. **Quick View:** diagnosed the v116 capture delegate opening on `pointerup`. On Android the subsequent synthetic click could land on the product anchor, explaining the direct full-page navigation. Changed the delegate to captured `click`, with preventDefault, stopPropagation, stopImmediatePropagation and tap debounce. Quick View continues to fetch an uncached item via product endpoint then cached product list and never deliberately redirects.
4. **Categories:** protected the shop title from unknown category keys; validated delegated category values; explicitly redraws when the selected category hash is already current. Populated Rings shows its cards. Empty categories remain on-page with the honest cataloguing message and rings CTA; no inventory fabricated. Category images now use safe URL, eager loading, async decode, low priority, logo fallback and phone visibility/sizing rules.
5. **PayU:** kept server-generated signed fields and verification unchanged. Client now verifies HTTPS `payu.in`, builds a hidden current-tab POST form and invokes `HTMLFormElement.prototype.submit.call`. Handoff screen has Continue, automatic attempt, Try again after 5s and Return to my order; a blocked handoff can no longer strand the customer with only an endless spinner.
6. **Release wiring:** `APP_REL=118`, shell stamp 118, changed JS cache keys 118, new `css/v118.css` + `js/v118.js`, and SW cache `shivaa-shell-v118` with complete precache parity.
7. **Safety:** no database or API/PHP edits; 65 PGS products preserved and every one still has exactly four images; no product weights, prices, customers, orders, uploads, PayU credentials or merchant configuration changed.
8. **Tests:** JS syntax clean; `git diff --check` clean; v113b **32/32**, v117 **27/27**, v118 **18/18**; all three repeated on the unzipped deliverable overlay; PHP sweep **211 routes / 0 exceptions**.
9. **Delivery:** `shivaa-update-v118.zip` contains seven deployable files in `public_html` layout: `index.html`, `sw.js`, `js/app.js`, `js/v116.js`, `js/v118.js`, `css/v118.css`, `DEPLOY-v118.md`. Commit pushed and PR #41 opened.
10. **Owner confirmation:** after using the update, owner said all updates were “very good and fixed.” v118 is now the required forward-only baseline. Future work must preserve every item above and must not restore pointerup Quick View, inert gallery dots, lazy-hidden phone category images, or spinner-only PayU handoff.

**2026-09-15 — v117 "butter" (branch arena/01a0a44f-shivaa-ecom)**
1. Owner: "website very slow — make it fast and butter; hero banner button sliders are out of place: whenever we click them they shift to the bottom of the page." Read ARENA-STATE/HANDOFF/MEMORY; branch verified at tip of main (d52d1bc, v116).
2. Diagnosed the tap-jump **without a browser repro** (sandbox has no Chrome — downloads blocked): root cause = **focus scroll**. `.carousel` is `tabindex=0`; arrows are real `<button>`s; dot taps delegate focus to the carousel; the browser scrolls the page to fully reveal the 430–600 px deck ⇒ "buttons shift to the bottom of the page on click". Proven live in the new `tools/mega/smoke/v117-check.js` (jsdom: pointerdown on the carousel is defaultPrevented; dot/arrow taps still drive the deck). Also fixed `aurum.css`'s `.c-arrow:active{transform:scale(.9)}` which REPLACED `translateY(-50%)` while pressed (arrow dropped mid-tap); `css/v117.css` keeps the translate + adds squash (scoped `#heroCarousel`, `!important`). Track moved to GPU `translate3d`.
3. Speed pass (all in boot/render path, no data touched): boot = ONE parallel API batch (rates in the batch, footer `/api/pages` backgrounded; was 3 serial rounds before the preloader lifted) + 6 s hard cap with quiet re-paint on late batches + independent 6.5 s splash cap in new `js/v117.js`.
4. Fonts: `css/fonts.css` was 354 KB of render-blocking base64 — only 3 UNIQUE fonts duplicated per weight. Extracted to `/fonts/{jost,cormorant-garamond,marcellus-400}.woff2` (78 KB) via new `tools/fonts/extract_fonts.py` (idempotent, re-runnable); fonts.css now 2 KB; all 3 preloaded; swap; rendering byte-identical.
5. Deferred ~200 KB CSS (hallmark/trust/motion/aurum/v107/boost via preload-swap + noscript) and ~110 KB JS (aurum/motion/boost now injected post-paint by js/v117.js, same order, `async=false`; none register routes, all self-guarding). Mobile: `content-visibility:auto` on sections ≥5 + footer; phone GPU trims. SW → `shivaa-shell-v117`, precache one-for-one with the new shell.
6. Gates: v113b smoke **32/32** + new v117-check **27/27**, both re-run PASS on the built zip overlay (`SMOKE_CMS=<dir>`). Deliverables: `shivaa-update-v117.zip` (10 files) + `cms/DEPLOY-v117.md`.
7. Docs updated (this log, ARENA-STATE §1, MEMORY.md). PR → main follows the forward-only rules.



**2026-09-14 — v111 GO-LIVE (branch arena/01a0a077-shivaa-ecom)**
1. Read ARENA-STATE/HANDOFF. Session branch = origin/main tip (`93b5180`, the
   squash of PR #27). Master db = 65 PGS rings, 0 missing shots, 0 videos.
2. Live `/api/products` still only PGS5001–5007. Catalogue Deploy never ran as
   a `main` push: the GO-LIVE marker file was deliberately not committed until
   zoom batches 2–7 passed; Arena token cannot workflow_dispatch (403).
3. Owner this turn: push finished v111 and go live. PR #28: GO-LIVE marker
   (`GO` + `ZOOM_GATE=NO`) + verify-step email fix. First live run logged in
   then crashed on `POST /api/media` (`bytes + str`). PR #29 fixed multipart
   to `b'\\r\\n'` (same as ring_reset.py) and retriggered.
4. Catalogue Deploy 34861781402 SUCCESS (16m). Independent verify + fetch_page:
   65 PGS, 4 shots, 0 samples, 0 videos. Zoom batches 2–7 remain photo follow-up.

**2026-09-14 — v110 full-catalogue bridge (branch arena/01a09f4b-shivaa-ecom)**
1. Read ARENA-STATE/HANDOFF; verified session branch = origin/main tip (6d8b1f9,
   main-guard workflow green; backup tag `backup/main-20260914-093342-6d8b1f9`).
2. Diagnosed owner report "live shop shows 7 products": live API serves the
   server's own data/db.json, which auto-sync never overwrites; master 405-product
   db had never been delivered to live. All 940 image refs are `/images/...`
   (code-deployed), so only the catalogue data was missing.
3. Built + bracket-linted `deploy/catalogue_sync_bridge.php` (login → fetch master
   from GitHub → SKU upserts 30/tap, resumable, no deletes, strips hallmark*/id
   keys → missing-photo fetch 25/tap → per-category verify → self-destruct) and
   `deploy/CATALOGUE-SYNC-BRIDGE.md`. Owner chose: keep existing live products.
4. Preflight: 405/405 valid records (63 carry `hallmark` key — stripped on write);
   334/334 referenced photos present in repo.
5. Flagged (unchanged, awaiting owner OK): 340 products display a literal "sample"
   tag chip; stale PR #23 (342 products) must be closed, not merged.
6. Pending owner: run bridge on tablet → verify 405 → self-destruct → rotate pw.

**2026-09-07 — v43 batch 1 (this session)**
1. Read HANDOFF v42; found 26 PGS rings with reference photo only (their `_shot_studio.jpg` was a byte-copy of the raw photo incl. green price tag).
2. Built + tested photoshoot toolchain (now in `tools/photoshoot/`): tag-free ref cropper, house-style finisher (896×1195 + Shivaa INC. badge), ken-burns video renderer (10s 720×720 25fps — matches the 39 existing films), byte-faithful db updater.
3. Generated full photoshoots for 9 rings: PGS5008 5009 5010 5011 5012 5013 5019 5020 5021 (36 shots + 9 films), every shot QA'd against the reference; re-rolled off-design renders (PGS5010 studio/gift, PGS5021 editorial prop-card) until faithful.
4. Wired all 9 into db.json (images[4] + video + mediaNote). 405 products intact before/after.
5. Staged `demo65/media/{9 SKUs}/` (shots + video + meta.json) for the auto-sync/manual uploader.
6. Built `shivaa-update-v43-rings-batch1.zip` (14.7 MB, 46 files) + `DEPLOY-v43-RINGS-BATCH1.md`.
7. Opened PR #13 (`arena/01a07bb3-shivaa-ecom` → `main`); all work pushed.
8. Verified sandbox→shivaa.in blocked (TLS killed) → documented auto-sync deployment path (above).
9. Rewrote this HANDOFF as the permanent single source of truth.
10. (same session, later turns) +2 rings: PGS5020 Panna, PGS5021 Manik (5021 editorial re-rolled for garbled prop text). +2 rings: PGS5028 Banas, PGS5030 Thar. +2 rings: PGS5031 Shekhawati, PGS5034 Udaipur (074f020). +2 rings: PGS5037 Kumbhal, PGS5038 Ranakpur (04d6509; 5037 ref needed white-tag removal — median-fill inpaint). +2 rings: PGS5039 Dilwara, PGS5040 Nahargarh (c48a8a4, first-pass clean). +2 rings: PGS5041 Baori, PGS5042 Sindoor (e9b5aff). +2 rings: PGS5048 Kesar, PGS5052 Kundan (aae17f7). +2 rings: PGS5053 Jadau, PGS5054 Thewa (e04a557). All 4-shot+film+db+uploader-staged. 3 rings pending (PGS5055 5056 5059). Deployment zip from step 6 covers the first 9; auto-sync cron deploys all 13 automatically once set up.
11. (new chat, branch `arena/01a07cae-shivaa-ecom`) +2 rings: PGS5055 Minakari, PGS5056 Rani Padmini — full photoshoots, 25 of 26 complete, pushed. PGS5059 Kanchan is the last remaining (studio+editorial generated this turn; worn+gift pending the 10-img/turn cap).
12. (same chat) +1 ring: PGS5059 Kanchan — worn+gift shots, film, db wiring, staging. **26/26 v43 batch done → all 65 PGS rings now have full photoshoots.** Verified: 65/65 db-wired + 65/65 disk media + 26/26 demo65 staged + 405 products intact. Committed a5c9743, pushed to `arena/01a07cae-shivaa-ecom`.

**Pre-v42 (summary):** 65 PGS rings imported; 39 photographed; v42 bug-fix set (see git tag `v42-stable`).

---

## ⛔ DO NOT TOUCH
- `cms/deadstock.html` — owner explicitly said leave it alone
- Existing product data (weights, purities, prices) — unless explicitly asked
- Carousel/gallery auto-advance — tuned, don't disable
- Live `data/db.json` + `uploads/` on the server — only via API upsert / cron; never clobber via manual file copy if live orders exist (Path A zip warning in `DEPLOY-v43-RINGS-BATCH1.md`)

---

## 💡 OWNER QUICK RECIPES
- **Continue ring photoshoots:** new chat → connect repo → "Read HANDOFF.md first, continue the ring photoshoots" (agent follows `tools/photoshoot/SESSION-STATE.md`, 2 rings/turn).
- **Deploy what's done:** new chat → "Read HANDOFF.md first, deploy" (agent verifies staging, commits, pushes; server cron finishes within ~5 min — or agent gives you the one Path B command if no cron yet).
- **One-time auto-deploy setup:** follow `deploy/AUTOMATION.md` (5 minutes), then deployment is fully automatic forever.
