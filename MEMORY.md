# SHIVAA — Persistent Memory (auto-loaded every chat)

## SESSION INTAKE — v183 FY 2026–27 Growth Mission deck (3 Oct 2026, branch `arena/01a10051-shivaa-ecom`)

- **Owner's brief, verbatim intent:** an interactive dashboard for the two FY
  numbers — **B2B partners 700** and **retail customers 1100** — both to be
  completed **before 30 March 2027**, with a **live countdown**, available
  **only on the admin portal**, "high FY ultra luxurious" UI. Delivered as
  **v183** (live is still **181**; v182 was built 25 Sep and not yet installed).
- **v183 = the FY Mission deck, built and gated this session:**
  - `cms/api.php`: `shv_fy_defaults/config/records/lane/history/view` + four
    routes, **all `need_admin`**: `GET|POST admin/fy-targets`,
    `POST admin/fy-targets/entry`, `POST admin/fy-targets/entry-undo`.
  - **Every figure is DERIVED, never invented** (the same provenance law as the
    catalogue importer): B2B = `partners` rows with `status=approved` (pending
    KYC shown separately), retail = `users` rows with `role=customer` (buyers
    shown separately), plus the owner's **opening baseline** and his own
    **ledger rows** — and a ledger row is **refused unless its source is named**
    ("counts are NEVER invented"). Growth curve = real `joined`/`appliedAt`/
    `createdAt` timestamps; no recorded growth ⇒ **no projection invented**
    (verdict reads `stalled`).
  - Targets / deadline / FY start / opening counts are owner-editable and
    range-checked (whole numbers 1–1,000,000; a past finish line and an
    FY-after-deadline are refused; corrupt stored values re-typed on read).
  - Countdown is **server-pinned**: the API publishes `serverNow` (epoch-ms) +
    `deadlineTs`, the browser computes the offset so a wrong device clock
    cannot lie about the finish line; the ticker self-clears when the deck
    leaves the DOM.
  - Admin UI: **👑 FY Mission** tab (2nd in the rail) in `cms/js/admin.js`;
    design system in the NEW `cms/css/v183.css`, **scoped entirely to
    `.fy-deck`** and loaded with the **v117 non-blocking preload-swap** (an
    admin-only sheet must not sit in a shopper's blocking paint path).
  - `fyTargets` / `fyEntries` are **JSON collections** in v183 (precedent:
    `khata`, `cashbook`, `savingsPlans`) — **no new MySQL schema**, so the deck
    needs no reconciler run of its own.
  - Stamps 183 lockstep (58×`?v=183` index, 52× sw, `shivaa-shell-v183`,
    `REL=183`, `APP_REL=183`, `'rel'=>183`); MEDIA stays `shivaa-media-v168`;
    **`v183.css` is now the last stylesheet** (v178.css no longer is — the
    v182-check S02 assertion about v178 being last SKIPs forward at 183).
- **Belt at close:** deploy gate **20/20** · new `v183-check` **11/11**
  (incl. an **executed jsdom render of the shipped `admin.js`** — lanes, live
  ticking seconds, ledger, settings, and a non-admin getting only the sign-in
  card) · new `v183-php-run` **12/12** (real `api.php` under PHP 8.3) ·
  v182-php 9 · v181-php 6 · v180-php 8 · v179-php 25 · v169 25+28 ·
  v168 39+12 · php-sweep **226 routes / 0 exceptions** · regression
  **44 passed / 24 skipped / 0 failed**. Both new suites re-run green on the
  **unzipped ZIP overlay**. `v182-php-run` P01 made forward-tolerant
  (rel floor ≥182), matching v181's pattern.
- **Known environmental failure, NOT caused by v183:** `v179-relay.js` fails
  0/7 **in this sandbox** (needs the live MCX socket). Proven pre-existing by
  running it in a separate worktree at the untouched base commit `2e063ee`
  (release 182) — identical 0/7.
- **Package:** `shivaa-update-v183.zip` — **7 files, 471,325 bytes**, SHA-256
  `20509869515bfae9931b504b79edf59f5479d1081203a21f942802d2ab4b40e3`, source
  `557662e`. Includes `upgrade-sql.php` **unchanged from v182** so that a live
  site still on 181 is complete after one install (idempotent; skip it if v182
  already ran it). Builder `tools/mega/make-v183-zip.py`; see `DEPLOY-v183.md`.
- **Preview tooling:** `tools/preview-server.js` now mocks the FY deck + a
  preview admin sign-in and stamps every served page with a **"Local preview ·
  fixture data · not the live store"** ribbon — its numbers are **fixtures
  derived from the repo's `db.json`**, never live figures.
- **Forward-only: live 181 → never deploy < 183 from here.** Still awaiting the
  owner: the billing app zip, and an explicit yes before any live install.

## SESSION INTAKE — v182 Auto-Catalogue Phase 4 + billing bridge (25 Sep 2026, branch `arena/01a0d6ef-shivaa-ecom`)

- **Live is 181 (verified 25 Sep 2026):** `/api/version` returned `rel:181`,
  stamps matched, `db.driver/mode: mysql`, 78 products, mirrorBehind:false;
  MySQL reconciled — products 78 · orders 5 · users 17 · settings 58 ·
  reviews 767 · coupons 12 · settlements 10 (composite-key fix
  `shv_settlement_id` = `partnerId_weekEnding` ran on live during that
  session's reconcile — but it had NOT been committed; **re-applied into the
  repo tree here** (api.php + upgrade-sql.php + v181-check S07 restored),
  so v182 ships live parity instead of regressing those10 rows).
- **v182 BUILT this session = Auto-Catalogue Intake & Review Queue (Phase 4)
  + billing sync bridge:**
  - Staged designs are ordinary products rows (`active=0`,
    `status='pending_review'`, `batchId`) — they ride the v180 product
    overlay/mirror untouched; storefront list filters `active`, PDP now 404s
    unapproved pieces for shoppers (admin can preview).
  - New admin routes (`need_admin` + audit): `admin/catalogue/batch` (batch
    ledger row), `admin/catalogue/upload` (batch photo upload →
    `uploads/catalogue/<batchId>/`, magic-byte checked, ≤8 MB ×24),
    `admin/catalogue/import` (JSON chunk ≤200 — **REJECTS rows missing
    weightG>0 / purity / weightSource** (standing law: never invent weights,
    purity, prices), `admin/catalogue/queue` + `batches`, `approve`
    (single ids or `{batchId,all:true}` = batch publish — flips
    active=1,status=live), `skip`.
  - `$db['catalogBatches']` dual-mode overlay/mirror ↔ `catalog_batches`
    (added `data_json` column) with the Phase-3 laws; `products.status` +
    `products.batch_id` columns (+ idx_status/idx_batch, one-time backfill)
    added idempotently in `upgrade-sql.php`, which also now syncs/verifies
    the batch ledger and uses composite settlement IDs.
  - Admin UI: new **📦 Catalogue Intake** tab (batch ledger, photo upload,
    JSON import w/ template, review cards showing photo/title/desc/
    **weight source** + Approve/Skip + Batch publish).
  - **Billing sync bridge** (priority 2): `GET /api/billing/stock` +
    `POST /api/billing/stock-movement` — HMAC-signed
    (`X-Shivaa-Ts`/`X-Shivaa-Signature` over `ts\nMETHOD\nroute\nrawbody`,
    ±5 min window, hash_equals), shared secret in
    `settings.billingSyncSecret` (admin-pasted, blank-keeps, write-only);
    **bridge answers 403 until configured**. movementId idempotency key;
    stock clamped ≥0; movements audited + mirrored to MySQL like any stock
    change. Contract: `docs/BILLING-SYNC-CONTRACT.md`. Doorway only — no
    merged billing logic (per plan §4).
  - Stamps 182 lockstep (56×`?v=182` index, 51× sw, `shivaa-shell-v182`,
    `REL=182`, `APP_REL=182`, `'rel'=>182`; MEDIA stays v168, v178.css stays
    last stylesheet).
  - Belt green **188/188** (deploy gate 20 · v182-check 9 · v182-php-run 9 ·
    v181-php-run 6 · v180-php-run 8 · v179-php 25 · relay 7 · v169 25+28 ·
    v168 39+12; v181-check + v180-check self-SKIP as superseded stamp-exact
    suites — S07 settlement content lives on in v182-check S05/P07).
  - Legacy suites made forward-tolerant: v181-php-run P01 (rel floor ≥181),
    v180-php-run X05 (data_json = LAST slot, COLS≥19 — row grew status+batch_id).
- Package: `shivaa-update-v182.zip` + `DEPLOY-v182.md` (run upgrade-sql.php
  right after extract — adds the new columns before the product mirror needs
  them; interim browsing stays on the JSON safety net).
- **Forward-only: live 181 → never deploy < 182 from here.** Still awaiting
  owner: the billing app zip (install stays `public_html/billing/`, outside
  every shop ZIP); review-queue is NOW BUILT (was the open question — queue
  is the default and the only implemented path; auto-approve would be a
  per-batch opt-in later).

## SESSION INTAKE — SQL scaling plan + billing + auto-catalogue (24 Sep 2026, branch `arena/01a0d219-shivaa-ecom`)

- Owner returned with three screenshots (10:16 am): hPanel `shivaa.in` (Business
  Web Hosting, SSL/CDN ✓, disk **0.71 GB / 200 GB**, inodes 5.26K/600K); MySQL
  management page (DB+user `u486999505_Shivaa`, created 21 Sep); phpMyAdmin
  showing **`products` 77 rows · `orders` 0 · `settings` 0**.
- **Honest code-verified state (do not overstate):** the 77 product rows are the
  one-way `setup-mysql.php` copy. The running app is **still 100% JSON at
  runtime** — `get_db_pdo()` has **zero call sites**, `db_driver` in
  `config.php` is never read, `db_load`/`db_save` still own every read/write
  (`cms/data/db.json` 0.42 MB, 83 products local). Empty `orders`/`settings`
  tables confirm nothing writes SQL yet. MySQL today = passive product mirror,
  not the live brain. The real "shift to SQL" = Phases 1–3 ahead.
- **Plan of record written:** `docs/PLAN-SQL-BILLING-CATALOGUE-2026-09-24.md` —
  (1) SQL migration phases (schema/fulltext → dual-mode runtime with JSON
  fallback + Data Source strip → collection-by-collection cutover → scale
  truths: images ≈180 GB at 300k×4 shots exceed the 200 GB disk ⇒ CDN/object
  storage decision, films stay featured-only); (2) update-ZIP ritual unchanged
  (backup → extract → `/api/version`), SQL releases add one idempotent
  `upgrade-sql.php` URL; (3) auto-catalogue: raw images → agent metadata
  (creative fields agent-written; weights/prices ONLY from owner CSV/tags) →
  MySQL `pending_review` → owner Approve queue → batch ledger; (4) owner's own
  billing-software zip installs to `public_html/billing/` (or subdomain) —
  **outside every shop ZIP** — plus one Admin→Settings link tile.
- **v181 EXECUTED (24 Sep 2026, branch `arena/01a0d340-shivaa-ecom`):**
  Phase 3 SQL migration built: `orders`, `settings`, `users`, `reviews`, `coupons`, and `settlements` wired for dual-mode MySQL overlay (`shv_sql_phase3_overlay`) and mirror-on-save (`shv_sql_phase3_mirror`) with JSON safety net.
  `upgrade-sql.php` adds `orders.data_json`, syncs all collections, checks counts, spot-checks row hashes, clears mirror flag.
  Admin Settings gains the "Billing Software ↗" doorway tile (`/billing/` new tab).
  Release stamps 180 → 181 lockstep (56×`?v=181` index, 51×`?v=181` sw, app 181, api 181; media stays v168).
  All smoke suites pass (`npm test` green: 20 deploy + 6 v181 check + v180 skip + 6 v181 php + 8 v180 php + 25 v179 php + 7 relay + 25 v169 pages + 28 v169 php + 39 v168 check + 12 v168 php).
  Package: `shivaa-update-v181.zip` (6 files, 445,347 bytes, SHA-256 `17f8d30bc4884c630d771470aea05893e44b36ed7442f221d91288121b3f2361`) + `DEPLOY-v181.md`.

- **Same-day status update: owner chose step-by-step → Phase 1+2 EXECUTED —
  v180 SQL runtime BUILT (dual-mode overlay + mirror-on-save + ZIP-only
  `upgrade-sql.php`), belt green, ZIP + `DEPLOY-v180.md` published.
  DEPLOYED AND LIVE-VERIFIED ON HOSTINGER (24 Sep 2026): `/api/version`
  probed and returns `rel: 180, db.driver: "mysql", db.mode: "mysql", sqlCount: 78, jsonCount: 78, mirrorBehind: false`.
  Hostinger MySQL is actively serving the catalogue, synchronized with the JSON mirror.
  Handoff document created: `docs/HANDOFF-NEXT-2026-09-24-v180.md`.
  deployed; live host deploy needs his explicit yes on `main`.** Still
  awaiting owner: billing zip upload, review-queue vs auto-approve choice.
  Forward-only: live 179, next release 181+.

## Deployment control update — owner approval required (22 Sep 2026)

- PR #90 merged to `main` at `2393a7949852b9bb1f16cdbfa8b138f83da8235e`;
  MySQL support and the gold scale-weight/refund workflow are the forward baseline.
  The owner reports 77 products migrated successfully on Hostinger.
- Live `/api/version` reports **170** with matched index/app/worker stamps. GitHub
  `main` still carries app stamp **169**. Do not deploy it; create the next approved
  application change as a forward release (normally 171+).
- Owner policy: **ask before every live update**. A merge is not deployment approval.
  The Hostinger workflow is manual-only and requires `DEPLOY SHIVAA LIVE` from `main`;
  it blocks downgrades and excludes data/uploads/config/installer/`.htaccess`. Live
  catalogue and Ring Reset have separate manual confirmation phrases.
- Hostinger credentials must exist only as GitHub Actions secrets. Never request or
  print them in chat. Disable the old Hostinger cron code sync with
  `deploy_code:false`. See `HOSTINGER-AUTO-DEPLOY.md`. No live deployment was made
  while adding these controls.

## Hostinger preview prepared — dry-run not yet started (22 Sep 2026)

> **Status: still an open owner action, unchanged.** Its numbers are historical:
> it was measured against `main` = 169, and the newest published release is now
> **v176** (see the v176 block below). The stamp references below (`shivaa-shell-v169`,
> "repo 169 < live 170") describe that day's measurement, **not** current state —
> do not quote them as the current release. The one durable fact: **the Hostinger
> deploy workflow cannot be started from this sandbox (Arena token is read-only for
> Actions, HTTP 403 on dispatch), so the owner must start it himself.** No deploy,
> FTPS write or data change has happened.

- Owner asked for the preview/dry-run only. **The real workflow run was NOT
  started from the sandbox:** the Arena session token is read-only for Actions
  (`gh workflow run` → HTTP 403 on the dispatch endpoint; `actions/secrets` also
  403). The preview button therefore remains an owner action.
- The workflow's entire preflight was reproduced locally from `origin/main` =
  `9e8b2b98` using the new tracked tool
  `tools/mega/hostinger-preview-replica.js`: **10 PASS / 2 WARN / 0 FAIL** —
  critical files, no tracked `config.php`, stamps 169 lockstep
  (`shivaa-shell-v169`), PHP syntax clean on all 10 `cms/*.php` under real PHP
  8.3 via php-wasm (negative control fires), and the transfer plan: 760 sync
  candidates / 247.9 MB after the exclude list, 48 files withheld
  (`.htaccess`, `setup-mysql.php`, `data/**`, `uploads/**`). The repo's own
  `deploy-approval-check.js` gate is **20/20**.
- Live `/api/version` reads **170** with `stamp.matched:true`, so the real
  preview will log `::warning::ANTI-DOWNGRADE` (repo 169 < live 170) and
  continue; `mode=deploy` would abort before any upload.
- **Owner’s one click:** Actions → *Hostinger Deploy (approval required)* →
  *Run workflow* → branch `main` → `mode=preview`, or
  `gh workflow run hostinger-deploy.yml --ref main -f mode=preview`.
- Evidence: `docs/HOSTINGER-PREVIEW-2026-09-22.md`. No live deployment, no FTPS
  write, no catalogue/DB/upload/credential change; live stays 170, GitHub `main`
  stays 169.
- **RETRY, same day, after the owner reported all three FTPS secrets added: the
  dispatch is STILL refused — HTTP 403 on `workflow_dispatch` (CLI and REST both
  re-run and re-proven this turn).** The secrets gate and the dispatch gate are
  different things: adding the secrets clears the workflow's *internal*
  preflight (step *Preflight — credentials, release handshake and PHP syntax*;
  the last real run `35680829125` failed there with “Hostinger FTPS secrets are
  not configured”), but it cannot grant the Arena GitHub connection **Actions
  write**, which is what starting a run requires. Re-verified locally this turn:
  `deploy-approval-check.js` **20/20**, replica **10 PASS / 2 WARN / 0 FAIL**,
  live `/api/version` still **170/matched**. The run must be started owner-side:
  Actions → *Hostinger Deploy (approval required)* → *Run workflow* → `main` →
  `mode=preview` (default). Preview forces `dry-run: true`, so it cannot write;
  `mode=deploy` would additionally abort on the anti-downgrade gate (169 < 170).
  Optional future unblock: grant the Arena GitHub connection Actions **write**.
- Noted, not acted on: `cms/shivaa-update-v161..v163.zip` (≈10 MB) sit inside
  the synced directory and are not matched by the exclude list, so a future code
  deploy would upload them (owner decision).

## CURRENT STATE — v180 BUILT: SQL runtime (dual-mode), belt green; LIVE STAYS 179 until owner deploys (24 Sep 2026)

**v180 = the Hostinger MySQL runtime switch (roadmap Phase 1+2), built and
gated this session; NOT yet deployed — manual host deploy needs the owner's
explicit yes on `main` like every release before it.** 6-file ZIP:
`api.php` · `index.html` · `sw.js` · `js/app.js` · `js/admin.js` ·
`upgrade-sql.php` (NEW, ZIP-only, excluded from the GitHub auto-deploy
alongside `setup-mysql.php`).

**What actually engages SQL now:** `db_driver => 'mysql'` in `config.php`
is finally READ. Product catalogue reads overlay from Hostinger MySQL
(`shv_sql_products_overlay`) ONLY when every safety check passes: PDO
connects ∧ no `data/.sql-mirror-behind` flag ∧ verdict == '' (counts equal,
every JSON id present in SQL, non-empty). JSON stays the write source of
truth (flock/atomic/409 all unchanged) and defines membership + order; SQL
content wins per id. Any doubt → the JSON net with the exact reason on
`/api/version` → `db.reason` (`driver-json` · `no-connection` ·
`mirror-behind` · `count-mismatch` · `id-mismatch` · `sql-empty` ·
`sql-error`) — booleans/counts only, never credentials.

**Mirror-on-save:** after the PROVEN JSON save succeeds, `shv_sql_products_mirror`
diffs the post-save snapshot vs the pre-save load and upserts+deletes per id
in one transaction (GET/HEAD never mirror — rate polls cost nothing). Every
mutation site is covered without touching a route. A mirror failure never
fails the request: it writes the flag; while the flag exists, reads AND
mirror-writes stay OFF until `/upgrade-sql.php` reconciles (healing is
installer-owned, audited, never silent).

**`upgrade-sql.php` (one idempotent URL):** same bcrypt/legacy password gate
+ per-IP throttle as api.php → **BACKUP `db.json` FIRST** (`db-before-sql-
reconcile-…json`) → schema up/grades (`data_json` full-row column, FULLTEXT
`(name,desc)` for 300k search, LONGTEXT desc, Phase-3 `catalog_batches`/
`catalog_assets`/`catalog_jobs` prepared) → full product upsert → count +
byte-identical spot-check verify → flag unlink (reads engage next request).
Standalone file (never includes api.php) — shipped via ZIP only.

**Also in v180:** `compute_price` hardened (row missing metal/pricing purity
now prices with catalogue defaults — found by the EXECUTED gate, X07; no
real catalogue row lacks those keys, so no existing price changes);
admin → Live Rates gains the **v180 Data Source strip** (green MySQL vs
amber safety-net + plain-English reason + open `/upgrade-sql.php` fix +
`db_driver => 'json'` one-line rollback); stamps 179 → 180 lockstep
(56×`?v=180` index · 51×`?v=180` sw · MEDIA stays `shivaa-media-v168`).

**Honest test limit (do not overstate):** the sandbox has NO MySQL server
and no `pdo_mysql` in php-wasm — the real SQL round-trip is NOT verified
here. Covered instead by installer count/verify logic + the belt's fallback
ladders; server acceptance = `upgrade-sql.php` report counts + `/api/version`
`db.mode`/`db.reason` after deploy.

**Belt at close: deploy-approval 20/20 · chained `npm test` exit 0 (171
executed checks: 20 deploy + 7 v180-check + 25 v179-php-run + 8 v180-php-run
+ 7 v179-relay + 25 v169 page/print + 28 v169 PHP + 39 v168-check + 12
v168-php, 0 failures; relay under full-chain load may flake T05/T06 —
standalone 7/7, rerun standalone before believing a red) · regression
`41 pass / 21 retired-feature SKIP / 0 fail` · php-sweep `212 routes / 0
exceptions`.** Three new suites: `v180-check.js` (7 — stamps, overlay/mirror
function map, installer order/password/backup markers, workflow excludes,
compute_price hardening, config default, admin strip) and `v180-php-run.js`
(8 — X01 default json-mode · X02 mysql+no-PDO honest fallback · X03
mirror-behind read ladder · X04 pure verdict boundaries · X05 sha256/stable
overlay (IDENTICAL|STABLE|SENSITIVE|COLS19) · X06 no-credential leak ·
X07 full JSON+mirror CRUD round-trip incl. GET product price · X08 installer
backup-first + wrong-password throttle + unlink order). The five stamp-exact
v177–v179 suites now carry SUPERSEDED-PROBE SKIPs (exit 0 when
`__SHIVAA_REL` > their release; they still RUN on their own release +
overlay) — this is how the forward-only law is mechanically enforced in the
regression belt.

**Laws learned this session (permanent):** (1) any helper CALLED FROM
INSIDE `db_load`/`db_save` must be `function_exists`-guarded in those two
bodies — legacy suites extract only those bodies and fatal (255) on an
unguarded call (v169 B01/B01-control/B22 proved it; fixed in api.php, never
in the historical suites); (2) the `@unlink` semicolon lives INSIDE the
backtick template (`F.run(`@unlink('…');`)`); (3) php-wasm suites must
AWRITE awaited config writes (X03 race); (4) `compute_price` runs on EVERY
GET product — payload fixtures need metal/purity or `??` defaults (shipped).

**Prerequisite:** live v179+ (owner-deployed). **Rollback:** restore the
five pre-existing files and/or `db_driver => 'json'` (installer file can
stay — inert). **Not yet (Phase 3):** orders/users/settings runtime, media
object-storage (~180 GB at 300k), GET-side pagination — money routes must
leave extract-only JSON together, with a staged read-compatible backfill
(first rows both stores) before any write cutover; `orders`/`settings`
tables are still empty and that has NOT changed by v180.

**Pending from owner (unchanged):** LiteSpeed Quantum/Varnish choice ·
object-storage decision + bucket creds · cron-stress choice · billing zip
upload (`public_html/billing/`) · auto-catalogue review-queue vs
auto-approve gate.

## CURRENT STATE — v179 DEPLOYED BY OWNER, relay error resolved (24 Sep 2026)

- **Live is 179** — owner uploaded `shivaa-update-v179.zip` to Hostinger;
  `/api/version` = 179 confirmed by the owner (site unreachable from this
  sandbox, so live verification is owner-confirmed, not agent-confirmed).
- The old v78 Render relay was cut out: both relay Settings fields cleared
  (*Relay server URL* + *Browser push URL* — the board's SSE line fed from the
  push-URL field; the board status line displays `t.error` verbatim from stale
  relay frames, which is where "signal is aborted without reason" surfaced),
  old Render service deleted. Owner confirms the error is gone.
- One-time Angel creds entered in Admin → Settings ("Enable official MCX feed"
  section); site direct feed is the MCX source. New relay (Phase 2,
  `cms/relay`) NOT yet deployed — public 1 s board motion waits for it; prices
  are correct without it (10-min stamp, v179 estimate ladder when MCX dark).
- Owner asked "is it permanently fixed?" — answer given: the known failure
  modes are self-healing by construction + tested; live acceptance = tonight
  23:40 IST market close → strip turns amber auto-estimate, nothing touched;
  09:00 next day → back to green. Optional: deploy new relay for the 1 s board.

## SUPERSEDED — v179 BUILT, belt green (24 Sep 2026)
**Implementation COMPLETE (24 Sep 2026, this session):**
- `4670cb8` — the v179 core on the 179 tree: `cms/api.php` (calibrated
  premium `premium_calibrate`/`premium_factor_for`, honest `mcx-est`
  ladder with `premiumEst` + `spotKind` + fresh `quotedAt`,
  `rates.mcxLastGood` persistence, `rates_health()` on the public
  `/api/rates`, the **GET-route `db_save` before `jout()` exits** —
  without it every poll's calibration/last-good was silently discarded,
  throttled `.relay-health.json` side-file), `cms/relay/relay.js` +
  `package.json` + `README-RENDER.md` (relay v2, zero-dep Node 18+,
  same `/tick` + `/stream` contract + `/healthz`, self-heal for every
  failure mode incl. "signal is aborted without reason", TOTP verified
  against the RFC 6238 vectors), the admin **Pipeline health strip**
  (Live Rates tab) and the honest storefront `mcx-est` label, stamps
  178 → 179 in lockstep (MEDIA stays v168).
- `d51a7c8` — `shivaa-update-v179.zip` (9 files, 450,237 B, SHA-256
  `e6f4265f…54e8d`, built from `4670cb8`), DEPLOY-v179.md, the belt
  rotated to the v179 chain (v178 suites on disk, off chain; their
  regression content re-executes inside v179-php-run).
- **Belt: 164 executed checks, 0 failures** — deploy gate 20,
  v179-check 8 (incl. the relay TOTP run against the RFC vectors),
  v179-php-run 25 (v178/v177 purge+stats regression carried + R01–R08
  executing the rates engine end-to-end, incl. the RTGS strip staying
  on-market with MCX down), v179-relay 7 (the real relay vs a mock
  Angel: backoff self-heal, 401 → re-login, crash → last tick served),
  v169 25+28 (B21 tests now assert the v179 premium on live legs),
  v168 39+12.
- **PENDING — GitHub connection:** the sandbox token expired mid-session
  (`GH_TOKEN` no longer valid) → the branch `arena/01a0d168-shivaa-ecom`
  is **not pushed past `39e9fc9`** (v178); local tip is `bb3a8d3`.
  After the owner reconnects GitHub in Arena: push
  `git push origin arena/01a0d168-shivaa-ecom`, then remote-verify the
  published ZIP (contents API at ref `d51a7c8`: size 450,237 + byte
  comparison of an authenticated download) and record it in
  DEPLOY-v179.md. NOTHING is deployed — owner deploys manually from
  DEPLOY-v179.md + `cms/relay/README-RENDER.md`.



> **Work order from the owner (verbatim):** *"signal is aborted without
> reason, in MCX and dollar connection in bullion rates, the dollar
> connection is working fine, but mcx connection from render is showing
> this error … please give me a permanent solution for bullion rates that
> I don't ever have to touch the rates in the next update, but first
> update agent handoff and memory doc then work on this update."*

**Diagnosis (recon complete, no code yet):**
- "signal is aborted without reason" is a Node/undici AbortError — it
  comes from the **v78 push relay**, a standalone Node service running on
  **Render** whose source is NOT in this repository (it was handed over
  for deployment there). Its long-lived Angel SmartStream connection gets
  aborted (platform/code timeout) and the relay does not self-heal.
- The **dollar leg** is fine because it is PHP on the Hostinger box with
  a multi-tier provider ladder (gold-api / ECB / exchange-rate / Yahoo /
  jsDelivr) — no single point of failure.
- The MCX leg depends on the Render relay as its live source. While the
  relay is dead: the live board freezes, and `rates_refresh` falls back
  to a **RAW spot conversion** (`gold24 = XAU_USD × USDINR / OZ`) that is
  systematically ~10–14% BELOW the real market, because MCX futures carry
  duty + premium. **That is why the owner has to touch the rates manually
  every time the relay dies.** The premium factors already exist in the
  codebase (`spotImpliedGoldFactor` ≈ 1.1371, `spotImpliedSilverFactor`
  ≈ 1.1838, owner-tunable in settings) but are only used MCX→USD, never
  USD→MCX-estimate.

**v179 design (agreed shape; builds on the v178 tree, stamps 178 → 179,
MEDIA stays v168, ZIP stays the same 9-file cumulative union):**
1. **Site self-sufficiency (the permanent part).** The Hostinger box
   becomes the permanent MCX source: Angel SmartAPI credentials go in the
   site's own admin panel (fields already exist: angelEnabled/ApiKey/
   Client/Mpin/TotpSecret). TOTP self-heals the daily 3:30 AM expiry;
   contract rollover auto-resolves via Search Scrip. After this one-time
   setup the Render relay is OPTIONAL board polish — its death can never
   blank or skew prices again.
2. **Premium-aware automatic fallback.** When MCX is dead (relay down AND
   Angel unconfigured/failing/cooling), `rates_refresh` prices
   `gold24 = spotXau × USDINR / OZ × premium` with an **auto-calibrated**
   factor: every time MCX and spot are both live, the live ratio is
   recorded (rolling median, stored in `db['rates']['premiumCalib']`);
   the calibrated value wins when fresh (< 7 d) and sane (0.9–1.5),
   otherwise the settings factor. Labeled `source = 'mcx-est'` — honest,
   visible, and ≈ market without the owner touching anything.
3. **Last-good persistence + honest freshness.** The last official MCX
   pack persists (`db['rates']['mcxLastGood']` with timestamp); the
   public `/api/rates` payload carries a `health` object (mcx source +
   age, premium factor + calibrated?, relay last-ok, spot sources); the
   storefront ticker shows a small honest tag (MCX live / MCX est. /
   delayed); the admin Live Rates tab shows a plain-English health strip
   (green/amber per leg) so "all good" is one glance.
4. **Relay v2 IN THIS REPO** (`cms/relay/relay.js`, zero npm deps, Node
   18+): a self-healing Angel **REST** poller — same public contract as
   v78 (`/tick` + `/stream?key=` SSE, X-Relay-Key auth, /healthz), but
   built only on the SmartAPI endpoints this codebase already proves
   (loginByPassword + TOTP, searchScrip, quote @ 1 rps): auto re-login on
   401/daily expiry, contract re-resolution at rollover, exponential
   backoff + jitter on ANY error (including aborts), no-frame watchdog,
   last-tick persisted to disk. Deployable to Render in two minutes; if
   it ever dies again, 1–3 hold the prices.
5. **Belt:** `v179-check.js` (static invariants) + `v179-php-run.js`
   (carries the v178/v177 purge+stats regression over, adds the rates
   engine tests: MCX live → live-mcx + calibration recorded; MCX dead →
   mcx-est within the sane band using the calibrated factor; both dead →
   last stamp; health payload; legacy-db safety) + `v179-relay.js`
   (Node, against a mock Angel: backoff on abort, re-login on 401, /tick
   survives a crash, stream clients get frames). Release-check suites of
   superseded releases leave the chain (stay on disk).

**One-time owner action after deploying v179:** paste the five Angel
credentials into admin → Live Rates (or Settings) and save. Nothing else,
ever. Until that is done, layers 2–4 still remove the manual fixing
(spot+premium estimate instead of raw spot).


## CURRENT STATE — v178: use Shivaa like an app — the in-footer PWA band (24 Sep 2026)

**Supersedes the v177 record below as the current release.** Owner request:
*"How can we give customers an option to download the app in their mobile
without even uploading it to the playstore — is apk better or webapp or a
smarter way?"* Agreed with the owner: **PWA first.** The site already
ships the whole app substrate (standalone manifest, 192/512 + maskable
icons, service worker, iOS meta tags, offline shell); v178 adds only the
missing nudge. No APK, no Play Store, no signing key, no upload — future
releases update the "app" through the existing release dial.

- **The change:** a quiet **in-footer app band** (plain HTML between the
  footer nav and the trust row) with a **client-drawn QR** of
  `https://shivaa.in/` and a CTA. Android Chrome/Edge: the real
  `beforeinstallprompt` is captured (`preventDefault`) and fired **only on
  the CTA tap**; `appinstalled` hides the band. iPhone: a **tap-only
  two-step sheet** (Share ▢ → "Add to Home Screen"). Other Android
  browsers: ⋮ menu → "Add to Home screen". Desktop: browser menu →
  Install. The sheet closes instantly (×, backdrop, Esc). The card's
  **Hide** is instant and **persists** (versioned `localStorage` key,
  30-day courtesy re-show). Standalone (Chrome `display-mode` + iOS
  `navigator`) never shows the band. New assets: `css/v178.css` (last
  stylesheet) and `js/v178.js` (last deferred layer; qrcode-generator
  1.4.4 vendored verbatim — MIT, © 2009 Kazuhiko Arase — in its own IIFE).
- **The v140 law — enforced by tests, not memory:** the band uses no
  `position:fixed/absolute`, the file contains **no timers**, no browser
  alerts, **never creates the dead floating install chip's element id**,
  the only overlay is the tap-open sheet, and every close is instant with
  a persisted dismiss.
- **Stamps 178 lockstep** (`__SHIVAA_REL=178` / `APP_REL = 178` /
  `shivaa-shell-v178` / `REL = 178` / `'rel' => 178`), 56 `?v=178` in
  `index.html` + 51 in `sw.js`, both new assets precached. MEDIA stays
  `shivaa-media-v168` (no media changed). **No API route, no admin
  surface, no money code, no customers/orders changed.**
- **Download:**
  https://github.com/theunreal8055-coder/Shivaa.ecom/raw/e8fbf5234729dfa98533fa79c9dbfdf479615db5/shivaa-update-v178.zip
  **9 files, 445,829 B, SHA-256**
  `72464db96b0fe9c91d11c4b6c4f9785da0b59b88b68d6c3a4bcc7c18b31f509f`,
  built from source `0c8cd291510999503259f370d49eccf044dc4866`;
  publication commit `e8fbf5234729dfa98533fa79c9dbfdf479615db5`;
  builder `tools/mega/make-v178-zip.py`; deterministic; every member
  byte-matches its committed `cms/` source.
- **Remote-verified after push:** contents API size **445,829** + Git blob
  `538ccebf…619` = local `git hash-object`; authenticated download
  byte-identical.
- **Verified (executed, on the shipped ZIP bytes):** `v178-check.js`
  **17/17** (static invariants + the vendored QR encoder executed:
  version-1 grid, finder patterns, timing dark-on-even, determinism, grid
  growth + DOM behaviour of the real shipped band in an isolated browser:
  first visit shows the card with the QR drawn on-device; the captured
  prompt fires only on the CTA tap and never alone; a declined prompt
  leaves the card exactly as it was; the iPhone sheet names "Share" and
  "Add to Home Screen" and closes instantly via button, Esc and backdrop;
  the Android fallback names the ⋮ menu; `appinstalled` hides and
  remembers; the dismiss persists across reloads with the 30-day re-show
  honoured; standalone never shows the band) · `v178-php-run.js`
  **17/17** (PHP 8.3; the complete v177 regression carried over unchanged
  + `/api/version` now 178 with a matched handshake) · full belt
  **158 executed checks, 0 failures** (approval gate 20, v178 17, v178
  PHP 17, v169 pages 25, v169 PHP 28, v168 boundary 39, v168 PHP 12). The
  superseded v177 static suite stays on disk, off the belt chain. NOT
  verified: no owner install, live site unreachable, real Chrome/Safari
  install flows not run (faithful stubs) — a physical phone is the final
  acceptance. No main merge, no Hostinger deployment, no real payment.
- **Commits:** `0c8cd29` (source: band + two assets + 178 stamps + both
  suites + builder) · `e8fbf52` (the ZIP publication).

### Forward-only (restated)
v176, v177 AND v178 are shipped — never reset/revert, restore an old ZIP,
force-push or rewrite history. **Next release is 179+.** Owner-approved
manual deploys only; a push is not approval. Never hand-edit
`cms/data/db.json`. Never swap `sw.js` alone. B2B and B2C customers are
out of scope for any sales cleanup. Agreed future phases (owner to
approve later): Android web push (VAPID) as optional Phase 2 — iPhone web
push is impossible, iPhone stays on the WhatsApp/SMS lanes; a direct APK
only if ever demanded (it would introduce a permanent signing key).

## CURRENT STATE — v177: the v176 rework, fixed (24 Sep 2026) — HISTORY, superseded as current by v178

**Supersedes the v176 record below as the current release.** Owner request:
*"make v176 again but better, without bugs and errors."* Forward release
177 — v176 stays shipped, same seven files, five defects repaired, executed
PHP tests added that catch each one. Branch `arena/01a0d168-shivaa-ecom`
(branched from `bc666f3`, the PR #93 merge carrying v171–v176 onto `main`);
commits `a77dacf` (fixes + suites + builder) and `29e2c0d` (builder assert
fix; ZIP built from this commit).

- **Download:**
  https://github.com/theunreal8055-coder/Shivaa.ecom/raw/557fb51c194f4acfbe08bd0f7e69e4660c4da0cf/shivaa-update-v177.zip
  **7 files, 427,896 B, SHA-256 `2c9fff1a…5dec2`** (full:
  `2c9fff1a8b39e186093e44ecac0980189e7ca783337be677e35d5bea6b35dec2`),
  publication commit `557fb51c194f4acfbe08bd0f7e69e4660c4da0cf`;
  builder `tools/mega/make-v177-zip.py`; deterministic (two runs, same
  hash); member bytes match the committed source; remote-verified after
  push (contents API size + blob `c9224cc8…` = local `git hash-object`;
  authenticated download byte-identical).
- **Stamps 177 lockstep** (`__SHIVAA_REL=177`/`APP_REL = 177`/
  `shivaa-shell-v177`/`REL=177`/`'rel' => 177`), 54 `?v=177` in index.html +
  49 in sw.js. MEDIA stays `shivaa-media-v168`.
- **NOT deployed, NOT owner-installed, NOT live-verified.** The test-order
  purge has not been run anywhere — owner action on his own server (and,
  unlike v176, it can now complete).

### The five v176 defects, repaired (see DEPLOY-v177.md for the full record)

1. **KILLER — the confirmed purge could never run:** the backup line used
   `JSON_UNESIGNED_SLASHES` / `JSON_UNESIGNED_UNICODE` — constants that do
   not exist. Every confirmed POST threw "Undefined constant" and 500'd
   AFTER the phrase: no backup, no delete. Fixed to the real
   `JSON_UNESCAPED_*` pair; `v177-check.js` guards the typo.
2. **Preview ignored `?scope=`** (scope read only from the POST body) —
   "every order" selected showed the safe slice, the short phrase and no
   all-sales warning. GET now reads the query, POST the body; unknown →
   safe `unpaid`.
3. **Same-second backups could overwrite each other** — name now made
   unique before writing (three same-second purges → three distinct valid
   backups, executed).
4. **Day book COD tile was structurally always ₹0** — now counts money on
   the day it arrives from the order's payment ledger (online/UPI on
   receipt day, proof on approval day, COD on collection day, legacy rows
   on paidAt/createdAt; cancelled excluded; no double count). Tile renamed
   "COD collected".
5. **Crash-proofing + honest note:** stats byDay 500 on a row missing
   `createdAt`; preview `TypeError` on a scalar legacy `address`; audit
   line re-read the bearer mid-route; scope-`all` note no longer claims
   "every paid order was untouched".

Unchanged: the money-received core across dashboard/reports/cash book, the
phrases, backup-first ordering, last-10 retention, and **only `db['orders']`
is ever spliced** (customers/partners/products/settlements/reviews/coupons
provably untouched — builder asserts it).

### Verification — executed, on shipped bytes
`v177-php-run.js` **17/17** (PHP 8.3 fixture; also against the extracted ZIP
bytes) · `v177-check.js` **11/11** · full belt **40 pass / 16 retired skip /
0 fail** (pre-edit baseline 38/16/0) · v169 gates on shipped bytes
28/28 PHP + 25/25 pages · v168 signatures 12/12 · php-sweep 212 routes / 0
exceptions · `node --check` on shipped JS · ZIP testzip + member match +
deterministic hash. NOT verified: no owner install, live unreachable, purge
not run anywhere, no main merge/deployment/real payment.

### Forward-only (restated)
v176 AND v177 are shipped — never reset/revert, restore an old ZIP,
force-push or rewrite history. **Next release is 178+.** Owner-approved
manual deploys only; a push is not approval. Never hand-edit
`cms/data/db.json`. Never swap `sw.js` alone. B2B and B2C customers are out
of scope for any sales cleanup.

## CURRENT STATE — v176: failed payments stopped counting as sales (23 Sep 2026)

> **Historical record — the current release is v177.** See the
> *CURRENT STATE — v177* section above and `DEPLOY-v177.md`. The v176
> release stays shipped (ZIP/link unchanged); its two known defects
> (undefined-JSON-constant purge 500, scope-blind preview) are fixed in
> v177.

**Supersedes the v169 record below as the current release.** v170–v176 all landed
after it. Branch `arena/01a0cd08-shivaa-ecom`, HEAD
`64c46a9d2a97f20bccf377be6494dc0d8f5362d0` (commits `a1e2698` fix · `212d9d0`
sw.js comment · `64c46a9` ZIP rebuild).

- **Download:** https://github.com/theunreal8055-coder/Shivaa.ecom/raw/64c46a9d2a97f20bccf377be6494dc0d8f5362d0/shivaa-update-v176.zip
  **7 files, 426,252 B, SHA-256 `ca53b8b9…6f72674`**; builder
  `tools/mega/make-v176-zip.py`; deterministic (two runs, same hash); remote
  GitHub blob `1b91023b…` matches local size and `git hash-object`.
- **Stamps 176 lockstep** (`__SHIVAA_REL`/`APP_REL`/`shivaa-shell-v176`/`REL`/`'rel'`),
  54 `?v=176` in index.html + 49 in sw.js. MEDIA stays `shivaa-media-v168`.
- **NOT deployed, NOT owner-installed, NOT live-verified.** The test-order
  purge has **not** been run — that is an owner click on his own server.

### Owner report (verbatim)
*"Actually can you reset all the sales data, because when i was deploying the
payment gateway integration I was trying sales without actually paying and its
showing in sales in my dashboard, how can you show sales even if the payment is
failed, first Delete all the sales data, don't touch b2b and b2c customers"*

### Root cause — a failed payment is never marked Failed
`cashfree_apply()` records a failure in `cfLastFailure` and **leaves
`paymentStatus` at `Awaiting payment`**, the value order creation assigned. The
row keeps a live fulfilment status, so it looks like a normal order. Three
endpoints then summed revenue from fulfilment status alone, never reading
`paymentStatus`:

- `admin/stats` — `$rev = array_sum(array_column($liveOrders,'total'));`
- `admin/reports` — `$revenue += (int)($o['total'] ?? 0);`
- `admin/cashbook` — `$orderSales += (int)($o['total'] ?? 0);`

All three filtered only `status !== 'Cancelled'`. Every gateway test run during
the Cashfree deployment was therefore counted at full order total. On a
synthetic book shaped like the owner's, **56% of reported revenue was phantom.**

### The fix — one definition of "money received"
`order_money_received()` (Paid → total · Partially paid → amountPaid clamped ·
everything else → 0) plus `order_is_paid_sale()` and
`order_is_unpaid_attempt()`. All three endpoints route through it. COD is
excluded — the money is still the customer's until delivery. Order count still
reports every order placed; `paidOrders`/`unpaidOrders` are now returned and the
Overview card shows the unpaid count next to revenue.

### The purge — server-side, backup-first, customers untouchable
The live data could not be deleted from here: local `db.json` has `orders: []`,
and house law forbids hand-editing the live DB. So the tool ships on the
dashboard (Orders tab, top card):

- `GET /api/admin/purge-unpaid` = dry-run preview, writes nothing (counts,
  value, per-`paymentStatus` and per-method breakdown, first 25 rows).
- `POST` = delete, only with the exact phrase. `scope:'unpaid'` (default) needs
  `DELETE UNPAID`; `scope:'all'` needs `DELETE ALL SALES`.
- Full DB written to `data/backups/db-before-purge-<ts>.json` (web-denied)
  **before** any removal; last 10 kept; audit-logged `sales.purge-unpaid`;
  a failed backup write aborts the purge with 500.
- Only `db['orders']` is spliced — the release builder **asserts** `users`,
  `partners`, `products`, `settlements`, `reviews`, `coupons` never appear in
  the purge route. Paid / Partially paid / COD / Refunded survive.
- Simulated before shipping: 10-row book → 5 unpaid attempts removed, 5
  paid/COD/refunded kept, all 3 customer rows + the partner record untouched.

### Judgement call recorded (do not silently reverse it)
The owner said "delete all the sales data", which read literally includes paid
orders. I shipped a **conservative default** (`unpaid` only) and put the full
reset behind a longer confirmation phrase, because destroying real money on my
own judgement is worse than asking him to choose. The preview shows the stakes
either way.

### Verification status — measured, honest
- **Passed:** php-parser clean (139 statements) · `node --check` on admin.js and
  app.js **on the shipped zip bytes** · revenue + purge logic simulated in Python
  with assertions across every paymentStatus value · builder asserts all
  cumulative v171–v175 repairs + new v176 invariants · zero `?v=175` leftovers ·
  ZIP integrity + deterministic hash + remote blob equality.
- **NOT passed / not attempted:** **no PHP binary — `api.php` never executed** ·
  no browser/jsdom test of the new admin card · smoke suite not re-run and no
  v176 suite added · the purge itself has not been run anywhere · live site
  unreachable from the sandbox.

### Forward-only (standing, restated because the owner asked for it)
Preserve v176 and its tests. New work is targeted forward commits — never
reset/revert to an older release, restore an old ZIP, force-push
`arena/01a0cd08-shivaa-ecom`, or rewrite history. **Next release is 177+.**
Owner-approved manual deploys only; a push is not approval. Never hand-edit
`cms/data/db.json`. Never swap `sw.js` alone. B2B and B2C customers are out of
scope for any sales cleanup.

## ~~Final verified state~~ — v169, SUPERSEDED by v176 (21 Sep 2026)

> **Historical record — the current release is v176.** See the *CURRENT STATE — v176* section at the top of this file and `DEPLOY-v176.md`. Do not restore or re-point anything to v169.

**Read `docs/SESSION-STATE-2026-09-21-v169.md`** for the complete v169 change
inventory, commit/evidence map, permanent download and remaining work. This
section supersedes every older “current/newest”, no-ZIP, old-HEAD or release-freeze
banner below. Earlier notes are history, not commands to restore old code.

- **Completed and pushed:** source `db525839d91800a07616b3f2ce26b17e61490503`;
  package publication `f847d85057a112296c59ef58a35731a184b74194` on
  `arena/01a0c31d-shivaa-ecom`. Later docs-only commits do not change those
  identities; inspect git for the actual HEAD.
- **Latest download:** https://github.com/theunreal8055-coder/Shivaa.ecom/raw/f847d85057a112296c59ef58a35731a184b74194/shivaa-update-v169.zip
- **Archive:**17 files,540,823 bytes; SHA-256
  `9ff5aad3856c2efcdf52ec3eddb4b6d7bc04503436017eb39673413dbb0088fb`;
  GitHub blob `320fa3ae85b202dc2edaa209ff4d90a3a1576cb8` remotely verified.
  Full v165+ prerequisite; backup first; root-layout extraction beside
  index.html/api.php. No data/uploads/credentials/media/host `.htaccess`.
- **Release169, media cache168 intentionally.** 36 additional recorded repairs
  →140 cumulative; B20 hardening separately uncounted. Ledgers v168/v169
  contain the individual completed fixes. Do not count53 checks as53 bugs.
- **Recorded checks:**28/28 PHP,25/25 pages; full belt38 PASS/16 retired SKIP/0 FAIL.
  Actual ZIP overlay and negative-control evidence are in the final session
  record and `DEPLOY-v169.md`. These are not native/live-host certifications.
- **NOT deployed or owner-confirmed installed.** No main merge, live payment,
  real OTP/GST lookup or customer/supplier-data update in this audit/publication.
- **Forward only:** preserve v169 and its tests; make new targeted forward fixes,
  never reset/revert to an old release, restore an old ZIP, force-push history,
  rerun the ignored one-time patch scripts, or repeat/recount ledger repairs.
  The historical v125 freeze is superseded; rejected v126/Truecaller stay retired.
  Old merge/deploy permissions are not new authorization. Never deploy just sw.js.
- This closeout changes documentation only: no new release, rebuilt ZIP or
  repeated repair. Future work begins with the owner's next request and the
  final record's open-work list, not another replay of this audit.

## Historical session notes below — superseded where inconsistent

## Historical package preparation — v169 GitHub download (21 Sep 2026)

The owner requested the latest update-file link. **`shivaa-update-v169.zip` is
now built and verified** from source `db525839d91800a07616b3f2ce26b17e61490503`:
**17 files, 540,823 bytes**, SHA-256
`9ff5aad3856c2efcdf52ec3eddb4b6d7bc04503436017eb39673413dbb0088fb`.
Cumulative v166–v169 code files; requires full **v165+**. Root-layout extraction
beside index.html/api.php, backup first. No data/uploads/credentials/media or
host-managed `.htaccess`. See `DEPLOY-v169.md` and `tools/mega/make-v169-zip.py`.
Actual ZIP over isolated original-v167 code passes25/25 pages,28/28 PHP,
39/39 previous boundaries,12/12 signatures,17/17 v164 PHP,24/24 direct checkout,
36/36 v167. The separate Apache-comment repair was applied only in that fixture.
Publishing is only on `arena/01a0c31d-shivaa-ecom`; **no main merge/live deployment
or real payment**. GitHub download requires repository access. This supersedes
the historical “no v169 ZIP / no commit” status below. The old v168 ZIP is unchanged.


## Historical pre-publication audit — v169 deeper audit (21 Sep 2026)

Historical status at the audit stage: source repairs were not yet packaged or
pushed. The final record above supersedes that status; no deployment occurred. Branch remains
`arena/01a0c31d-shivaa-ecom`; the audit-stage baseline was published v168 `f2b6c4467fe6fa3822b223cda73e5d513fc604ef`.
The existing **v168 ZIP/link is unchanged and excludes these v169 repairs**.

- **36 additional recorded defect repairs + one separately uncounted hardening
  change (B20).** Prior 104 → **140 cumulatively recorded**, not 140 new bugs,
  not 53 bugs merely because there are 53 new checks. Ledger/evidence/limits:
  `tools/mega/audit/DEFECT-LEDGER-v169.md`; future packaging: `DEPLOY-v169.md`.
- New executed PHP tests **28/28**; v168 control **1/28**. New page/print tests
  **25/25**; v168 control **0/25**. Full belt **38 active PASS, 16 retired SKIP,
  0 FAIL**. Direct checkout **24/24**; prior v164 PHP **17/17**. Static sweep
  **209 routes / 0 exceptions**, NOT 209 executed endpoints. PHP parser plus
  changed JS syntax and whitespace checks pass.
- Backend repairs: stale whole-DB saves reject with409; lock/staging failures
  fail closed; OTP/attempt/metal/bullion/GST reference writes persist; approval
  no longer creates random Paid settlements; guest order/payment throttles are
  not one global bucket; checkout line/phone/future-lock/dead-rate validation;
  actual reserved stock restored on cancellation; delivery reminders and
  referral qualification; OCC dispatch field mapping; canonical manual Paid.
- Feed outages no longer randomly jitter/clamp quotes. Preserve healthy legs,
  known cached rates/quote time, zero missing anchors and existing healthy
  ₹398 retail premium rules. No supplier prices/weights/data were fabricated.
- Frontend repairs: successful async responses/polls/timers cannot overwrite
  newer routes in the covered pages; URL flags/partial status are not full
  payment proof; scheme uses the actual status response and never fakes quiz
  eligibility after errors; invoices require saved issuance and show saved
  adjustments; thermal totals/escaping/popup handling; honest guest wording
  and per-item metal rate summaries, including missing legacy snapshots.
- B20 strips private pin entropy from customer projections. Existing access
  controls already protected those responses; do NOT claim this proved a
  cross-customer exploit. Derived guest pins and rightful access still work.
- No DB/catalogue/customer/media/credential changes; no real OTP/payment/GST
  lookup or production deployment. Direct checkout and approved films/design
  retained. Existing settlement/stock/quote history was NOT rewritten.
- Six deployable source files differ from v168: `api.php`, `index.html`,
  `sw.js`, `js/app.js`, `js/admin.js`, `js/v117.js`. Release/shell stamps **169**;
  hardened media cache intentionally stays **168** (no media changes).
  A six-file v168 overlay passes25/25 page,28/28 PHP,24/24 direct checks.
  Any future six-file delta requires full v168; never deploy only the worker.
  Host-managed `.htaccess` remains separate and excluded from a future ZIP.
- Reusable tests: `tools/mega/smoke/php-api-fixture.js`, `v169-php-run.js`,
  `v169-check.js`; `npm test` runs v169 plus v168. Existing regression runner
  discovers the new suites and logs to ignored `work/audit169/regression/`
  (`SMOKE_LOG_DIR` override). The v155/v156 source-shape assertions were updated
  for legitimate guards, not counted as new product fixes. v156 also passes
  unchanged v168. Harness deadlines prevent silent unresolved-promise success.
- Concurrency caution: request-level snapshot checking is not a native load
  test. Current nested GST callers reload after cache merge; Cashfree locks and
  reloads before reconciliation. Future nested loads must not refresh a hash
  then save an old array. Do not automatically retry money-changing POSTs on
  409. Slow gateway calls under locks remain an operational follow-up.
- Remaining: native Hostinger/PWA/WebView/thermal-printer/gateway checks,
  historical financial-data review, other async form/admin continuations,
  referral actual-credit reconciliation and supplier-backed certificate/legal
  review. The whole website is not certified bug-free. At this pre-publication stage
  no v169 ZIP existed; the final record above documents its later publication.


## Update-package follow-up — requested GitHub download (21 Sep 2026)

`shivaa-update-v168.zip` is now built from committed source
`e5b2905de68e99b45508f1d58496610cb223b453`: **17 files, 539,228 bytes**,
SHA-256 `efaa0f46035296cc4296cb06954d6fcf72248880c4334cf1f81e8d00cc62478f`.
It includes the v166–v168 code-file union for a full v165-or-newer CMS.
No DB, uploads, credentials or `.htaccess`. The host-comment repair is separate.
Isolated v167 + ZIP overlay tests (with the separate host-comment fix applied
in the sandbox): v168 **39/39**, signatures **12/12**, v167 **36/36**, executed
v164 PHP **17/17**, direct checkout **24/24**. ZIP members match their source
commit byte-for-byte. See `DEPLOY-v168.md` for extraction and host-config notes.
The owner requested publishing the package on the current GitHub branch only;
**no main merge or live-site deployment**. This supersedes the earlier
“no ZIP produced” status below. Private GitHub download requires sign-in.



## Historical pre-publication audit — v168 specialist audit (21 Sep 2026)

**Branch:** `arena/01a0c31d-shivaa-ecom`, based on `5b0c380`. **Status: source
changes only; NOT deployed, not merged, no live payment tested, no ZIP produced.**
This section supersedes older “current/newest” release labels below; retain those
sections as history, not instructions to restore an older version.

- Continued the v167 ledger: **40 additional verified fixes**, plus its previous
  **64 fixed**, for **104 cumulatively recorded**. Do NOT describe this as 100
  newly found bugs in this session. Ledger, repros and caveats:
  `tools/mega/audit/DEFECT-LEDGER-v168.md`; deployment boundaries: `DEPLOY-v168.md`.
- Main fixes: invalid Apache HTML comments; damaged/blocked browser storage;
  API body timeouts, cancellation, headers, invalid JSON and late-401 races;
  route error races, staff query links, modal scroll-lock ownership; label
  overrides; scoped/private-safe/expiry-aware worker caches; font tokens and
  PWA metadata; invoice adjustments, escaping, popup recovery and false GST
  wording; advertised WebM uploads and extension/signature correspondence.
- No catalogue, DB, customer, payment configuration, product media or owner-film
  changes. Preserve the direct Cashfree flow, 6 campaign studs, category tiles,
  24K premium rule, HUID honesty and the removal of the old verification vendor.
- Release handshake and asset stamps **168**, media cache **168** deliberately
  purges old private/HTML entries. Never deploy the worker alone. `.htaccess`
  remains host-managed: apply/review only the tiny comment fix, never wholesale
  overwrite it or ship it in an update ZIP.
- Reproducible tests: `cd tools/mega/smoke && npm ci && npm test` → **39/39 JS/DOM/
  worker/config checks + 12/12 executed PHP signature cases**. Against v167:
  **0/39 and 9/12**, proving the new gate can see the old failures. Full belt:
  `npm run test:regression` → **36 active suites pass, 16 retired-feature
  suites explicitly skip, 0 fail**; detailed logs regenerate under ignored
  `work/audit168/regression/`. The actual tests are tracked, not scratch-only.
- v155 direct-checkout harness repaired (not a new product defect): it used to
  start after the six campaign studs populated the cache but BEFORE settings.
  Now waits for settings plus a real catalogue fixture and closes jsdom windows.
  **24/24 passes on BOTH original v167 and current code**. Four older cache
  generation pins now accept a deliberate forward media generation; actual
  privacy/expiry behaviors are checked by the new worker tests.
- Important corrected assumptions: v167 #65 unused invoice accumulators did NOT
  prove a wrong grand total (already `o.total`). Lint-only warnings are not fixed
  bugs; empty category tiles are owner's intent. See historical triage in ledger.
  Source DB currently contains **77 PGS rows, all four-image** (unchanged), not
  the stale “65 rows” claim. `demo65/status.py`: 65 crops, 260 shots, 65 metadata,
  **0 videos in this checkout**. Do not regenerate films without an owner request.
- Outstanding: native Hostinger validation, installed-PWA/real-device visual QA,
  genuine Cashfree payment/MID limit confirmation, CA review of tax presentation,
  and async page-success cancellation beyond the error races repaired here.


> **v167 EVERY FIELD HAS A NAME, EVERY PAGE HAS A HEADING — the 100-bug hunt, release 1 (2026-09-21, branch `arena/01a0c2bf-shivaa-ecom`, zip `shivaa-update-v167.zip` md5 `f7219538fdad9300f1d342d32e58e448`, 12 files):** owner's brief was to *find and fix 100 bugs* like a specialist doctor. This release ships **64 reproduced, fixed defects** (ledger `tools/mega/audit/DEFECT-LEDGER-v167.md`, 87 rows incl. 12 open + a "ruled out" table). Method, not luck: jsdom crawl of 44 routes, a stateful interactive harness (`work/audit/harness.js`), a ~700-tap sweep, a11y/listener/resize/noh1 probes. **Headline:** the login sheet mounted **two elements with `id="shvErr"`** (retail + jeweller panes on step 1) and `$('#shvErr')` = getElementById → every error landed in the hidden pane, so a partner's wrong password showed a spinner that stopped and *nothing else* (errors are now per-pane + a visible-pane resolver; `work/audit/probe-login-jwl.js` proves before/after). **Biggest class:** 140+ generated fields (`admin.js` 94, `app.js` 47) had a visible `<label>` never tied to its control → "edit text, blank" for every screen reader; fixed by **one delegated layer `js/v167.js`** (pairs label↔control in `.fld` blocks, ids unnamed controls, names a block's *second* control — the savings/buyback sliders — and derives names for strays; attrs only, idempotent, try/caught, ships a control run that proves the page without it is still broken). Ten routes had **no h1** and nineteen skipped a level (empty bag, empty quote, order/invoice/certificate not-found, retired CMS page, the route-error + unknown-URL fallbacks, legal/contact/rates/care/services/sizer/privacy/PDP hallmark) — now standard hero + `h2`, with `css/v167.css` reproducing each old size/family/margin so nothing moves on screen. Five member routes (account, track, certificates, invoice, **certificate**) opened the login sheet over an **empty page**; `#modalBox` had role=dialog with **no name** and a close button named "✕"; `#searchInput`'s `outline:none` beat every generic `:focus-visible` (ID specificity + a duplicated rule in `aurum.css`); the B2B card dropzone was click-only. **Honesty bugs:** `toast()` threw on a missing `#toastWrap`; filter badge `+ (value < 1500000 ? 0 : 0)` could never count the price filter and didn't refresh while the drawer was open; the slider's top stop said "Any" but hid >₹15L pieces; prepaid saving used `|| 2` while api.php uses `??` (owner-set 0% promised a discount that never came off) → one `prepaidPct()` reader; `#coShipRow` was found via `.sum-row:nth-last-child(2)` = the **COD** row, so shipping was never repainted when a rate tick crossed the free-ship threshold; `freeShipAbove` fallback "₹0"; `cartMoveBack` compared `x.size === x.size` (size-16 save merged into the size-12 line); `kycOtpVerify` wrote to another function's `let` (strict ReferenceError → silent form after a rejected OTP); `initCatbar` leaked a resize listener per navigation (7 → 14 measured); `pages.order` dereferenced a null order; v166's graphics failsafe re-fetched its own frozen `?v=166` URLs; `sw.js` declared `MEDIA_TTL` (v120) and never enforced it. **RESULT: a11y probe 68 → 0 on 44 routes**; v167-check 36/36, v166-check 32/32 (its stamp pin made forward-tolerant: the release triple is read from the shell, floor 166), v164 114 · v165 28 · v139 56 · whole belt green · php-sweep 209/0 · pay-audit 10/10. **`v155-direct.js` is flaky on baseline too** (23/24 vs 24/24, same code, proven on a clean worktree) — not a product bug. Lessons: a duplicate id is a *silent* failure amplifier when the duplicate pair is one visible + one hidden pane; a11y repairs that must not move pixels belong in a delegated layer + one CSS file, not 140 call sites; when a gate pins a literal release number it must be converted to a floor + lockstep read (never re-pin).
> **v165 CASHFREE FAILURES TELL THE TRUTH — the 6-ear-studs error (2026-09-21, branch `arena/01a0c227-shivaa-ecom`):** owner's report — exact error "Cashfree could not start this payment — choose WhatsApp/COD, the UPI QR tab, or retry in a moment" ONLY on the 6 Gold Biscuit scheme studs (₹49.6k–₹55.1k each at live rates), everything lighter pays fine. Root cause: the ONLY per-product field in the Create-Order payload is `order_amount`; Cashfree's own troubleshooting names **"exceeded the maximum amount limit set for your MID"** (young MIDs get a ~₹50k per-txn cap until raised) — deterministic, hits both the OCC attempt AND the standard fallback, so the occ-fallback net can't rescue it. v165: api.php classifies the amount-limit rejection (code `order_amount_invalid` + message regex) → honest customer line + `kind:'amount-limit'` + `amount` in the init-fail audit row; app.js `api()` attaches `gatewayCode`/`gatewayMessage` to every thrown error + console.warn `[shivaa-gateway]`; admin audit viewer shows a "gateway details" expander with the full Cashfree meta. Stamps 165. **REAL fix = owner asks Cashfree to raise the MID per-transaction limit (jewellery UPI allows ₹2L/txn since 15 Sep 2025); UPI QR / WhatsApp / COD sell every stud meanwhile — no site change needed once raised.** QA: v165-check 31/31, v165-php-run 12/12 (executed php-wasm: classification extracted byte-exact, five gateway outcomes + fall-through byte-lock), v164-check 114/114 + v164-php-run 17/17 (their exact stamp pins converted to NUMERIC FLOORS — the never-re-pin rule applied one release late), pay-audit invariants 10/10 unchanged, php-parser + node --check clean. Deliverable `shivaa-update-v165.zip` (5 files, md5 `06bbc6f7a2198e63b2896b43958832de`) + DEPLOY-v165.md. Lesson banked: when a per-product failure has product-independent code, diff the PAYLOAD, not the page — the one field that varies is the story.

> **v160 REAL TOPS + 24 PHOTOS + MOBILE + PAY-FAIL RETURN (2026-09-21, branch `arena/01a0c003-shivaa-ecom`, PR #80 merged to main, zip `shivaa-update-v160.zip` md5 `5506bd0854bcb176dbdda6f67d13dde6`, 31 files):** owner's 6 real tops replace AI concepts — gents 3.00g×3 (Veer/Rudra/Bali), ladies 3.255/2.928/3.086g (Heer/Morni/Sitara, tag truth; owner typed 3.225 for paisley vs tag 3.255 — used tag, flagged), all 22K 15% MC; 24 AI photoshoot photos (studio/macro/worn/gift per design, 1000px square, QA'd faithful, no re-rolls needed); card 4-thumb gallery; gender banners re-montaged; mobile overlap class killed (stepper 58px+safe-area, badge constraints, ≤380px stacks) + blur class killed (square natives); pay-fail from ALL 3 surfaces auto-returns to the gender-correct 3-design showcase (gender resolver, 4s auto-return on ?cf=fail); stamps 160; gate v160-check 63/63. Lessons: image budget = 10 ATTEMPTS/user-turn (empties count) — plan 10+10+4 across user nudges; test-window bugs (slice into next product) — bound blocks by structure; square natives beat CSS for sharpness.

> **v159 SCHEME FUNNEL & CURATED 6 STUDS (2026-09-20, branch `arena/01a0bf5c-shivaa-ecom`, PR created and merged to `main`).**
> **Release Package:** `shivaa-update-v159.zip` (md5 `8cb48328b0246b80b0a0c21c84661555`, 14 files root layout).
> **Features:**
> 1. Curated 6 22K Gold Studs Funnel (`#/scheme`, `#/finale`) exclusively qualifying for the 10g 24K Gold Biscuit CA-witnessed live draw.
> 2. Direct 1-Click Cashfree Checkout on "⚡ Buy Now" across all 6 studs (`p_stud_m1` through `p_stud_w3`).
> 3. Post-payment direct routing to the strict 1-attempt CA-witnessed quiz (`#/scheme?step=quiz&orderId=...`).
> 4. Cashfree cancel/fail immediate fallback to Ear Studs Showcase (`#/scheme?step=products&gender=...`) for instant retry — never drops customers to home.
> 5. Pure conversational Hindi Aura AI Speech Engine (`hi-IN`) with warm Indian hospitality dialogues, rate 0.90, pitch 1.12.
> 6. Complete mobile optimization (<768px and <480px): horizontally scrollable 5-step stepper, 48px+ touch targets, responsive clamp typography, top ribbon removed.
> 7. All 152 regression and behavior checks green.

> **LAUNCH FILM (2026-09-20, branch `arena/01a0ba75-shivaa-ecom`, PR #78 merging to main on owner order).** Not a storefront release. Storefront on main is **v156**; this session did not edit cms/. Owner VO `launch/voice-studio/Shivaa-Trailer-VOICE-studio.mp3` (~2:39) approved; **never clone**. Talking-head/screencast **not in repo**. 9:16 crop-paste rejected. Omni 1.1: `launch/OMNI-8s-PROMPTS.md` (20×8s silent+SFX) · `OMNI-8s-PROMPTS-PRESENTER.md` (female employee, same dialogues) · `OMNI-60s-MASS-TRAILER.md` (8×8s new mass script, logo **SHIVAA**). Masters: `launch/out/…-PRESENTER.mp4` (~2:40) · `…-60s-MASS.mp4` (~64s). Mass clips feel disconnected because each Omni 8s is a new film (faces/locations/score restart) — concat cannot unify; next generate needs last-frame/extend + character stills + one music bed. Do not mux owner MP3 onto Omni presenter/mass audio. Never say Jaipur. Brand Shivaa Jewels / shivaa.in. 16:9 full-bleed.
> **v156 SHIVAA RATES + 24K PREMIUM + BUG SWEEP (2026-09-19, branch `arena/01a0ba4b-shivaa-ecom`, zip `shivaa-update-v156.zip` md5 `b5c1c6ea9fae91c5bb3e15c50be72518`, 7 files — api.php, index.html, sw.js, js/app.js, js/admin.js, js/v107.js, js/v120.js):** owner's three orders, all B2C-only, B2B provably untouched. **(1) "wherever Jaipur is mentioned, mention Shivaa"** — every customer-facing rate-brand string renamed Jaipur → Shivaa (ticker `SHIVAA LIVE`, rates badge `✦ SHIVAA LIVE RATE`, tiles `GOLD 24K · SHIVAA`, both premium rows, terms/FAQ/cart/quote/compare/buyback/savings/metal/certificate copy, v107 tracking, sidebar, api quiz). Real geography (Jaipur/Nagaur pickup, city chips, reviewer hometown) keeps its name; B2B pages / partner portal / admin / RTGS board byte-untouched; bot.js + v109.js are dead files (not loaded) — skipped. **(2) 24K premium = the 22K premium (₹398/g), same total** — owner's explicit pick (not +on-top, not mirrored-knob): new `gold24_premium()` + `gold24Premium` setting (default 398, admin field + PUT whitelist + `premium.gold24` published); `jaipur_from_anchor()` and the `current_rates()` fallback both use it; legacy ₹55 jaipurPremium now feeds ONLY gold18 (×0.75); override still absolute; rate card shows BOTH premiums and live-patches prem24. 22K/18K/silver math byte-identical; executed-PHP proof: gold24 = anchor+398, knob=500 moves ONLY 24K, **rtgs block byte-identical across premium worlds (B2B never noticed)**. **(3) Bugs killed:** **B1** v120.js openHash '' falsy — bare-home drawer opens stored a falsy marker so every class mutation pushed another dead history entry (Back buried; the bug documented at v127 awaiting the owner's word — this was it): map initialised `false`, strict `=== false`/`!== false` compares, storm-tested one-open-one-entry. **B2** the 1-second rates poll REBUILT the whole cart page — pincode delivery input wiped mid-typing every tick (v120-Bug-A's sibling): `refreshCartPage()` patches in place via data-cart-* hooks (+ci-right prices joined to .js-price); only the free-shipping free↔fee structural flip re-renders, carrying the pincode; jsdom-proven through the real online→loadRates path (focus+expando survive; flip → expando dies, pincode carried). **B3** drawRateChart divided 0/0 on a 1-stamp or dead-feed history (NaN canvas) — positive-finite filter + ≥2 points. Stamps 156 lockstep (loader ?v= included). QA: v156-check 33/33 · v156-cart 24/24 jsdom · v156-php-run 14/14 executed PHP-8.3 — also green on the zip overlay (SMOKE_CMS) · full belt green (v155-check era-guarded 34/34, v155-direct 24/24, v154-php-run 11/11, v139–v127 all green incl. v119's two Jaipur-copy pins era-guarded to Shivaa). Lessons: brand names in copy are code assets — keep exact-string suites in lockstep with renames; falsy traps wherever '' is a legal value; wholesale-rerender-on-poll is a bug CLASS — always fix the siblings; v125-check's git-HEAD byte-lock only passes post-commit (run it last).

> **v155 SILENT LANE (2026-09-19, zip `shivaa-update-v155.zip` md5 `1c79556e77fc7277d6e56fb849422784`, 5 files; **owner's release order EXECUTED: #74 retitled to the truth + MERGED → main @ `8d23968` (tree proven: rel 155, zero overlay/field/vendor residue). One-PR-per-head-branch is why #74 was reused; it delivered the TIP tree, not the v147 body**):** third repeat of "…redirect customers DIRECTLY to the cashfree payment portal…" ⇒ remove our RENDER too. v154's lane still showed exBusy overlay + payForOrder's toast/sheet and burned 3 round-trips (payForOrder double-mints by design — for the STALE-session retry case). v155's lane: ONE boundary order → ONE /api/pay/order mint → cashfreeCheckout opened the instant it lands; exBusy/exShell/exClose/#shvExCard deleted; declined handoff lands silently on the order view (retry+QR+pin live underneath), refused order toasts once. RESUME: order view first, exHandoff().catch(()=>{}) on top — re-PAY possible, re-PLACE impossible. **v155 found a REAL bug: EX.busy was claimed after the gate await → concurrent taps raced multiple boundary orders since v153; claim is synchronous now (storm-tested).** api.php = v154 byte-identical except stamps — server physics (exact signature+switch+provider, boundary-line pay rule, paid sweep promotion) unchanged and STILL proven by v154-php-run 11/11 (forward-tolerant version pin now: rel>=154 self-consistent). QA 37/37 static + 24/24 jsdom×9 (body-text/status-line absence, no-payForOrder-in-lane, overlay-id tripwire that fails ANY future regression) — source AND prod overlay v150→v154→v155; v154 pair guarded via exHandoff probe; v139–v142 green (v142 learned exHandoff). Lessons: match helper hardening to the interaction (retries wait, first taps don't); busy-flags before first await; sequential tests miss races; exact-version pins in suites must go forward-tolerant when eras baseline. PR #74/#65/#67 remain stale-by-design open — rebuild from this branch if he ever revives Truecaller.

> **v154 FIELDLESS (2026-09-19, zip `shivaa-update-v154.zip` md5 `b8eb964953e6647a3b068b748696dc8c`, 5 files — **superseded same-day by v155; ship v155 or main)** was: PUSHED, awaiting owner extract; supersedes v153 AND v152 zips):** owner repeated the v153 instruction verbatim ⇒ remove even the one-field card + device memory. Insight: v143's incident was an EMPTY phone at Cashfree create-order, never a syntactically-valid one — and OCC checkoutAuthenticate collects + OTP-verifies the REAL number on Cashfree's page (owner's standing acceptance). Guest taps place the CANONICAL boundary order (EX_BOUNDARY sentinel row) — accepted ONLY on exact-field match AND guestCheckout===true AND payProvider cashfree (switch off ⇒ whole guest lane 401s); empty phone still dies in v84; pay/order accepts the sentinel ONLY on a boundary-line order (no stranded in-flight payments); the PAID sweep PROMOTES cfCheckout phone/name/shipping into the address row (typed flows untouched; pin hash already excludes phone). app.js: exmPhone/exTotals/exMemPhone/shv_exp_contact DELETED — exDirect asks the shopper NOTHING, ever; reclaim resume pays the same id; cf-pending anchor only after a declined handoff. Stamps 154 incl. loader stamps. QA: 24/24 + 17/17 jsdom×8 (overlay tripwire: NO form field may ever mount in the lane again) + 11/11 executed-PHP lattice; source AND v150→v154 overlay; v153/v152/tc suites era-guarded SKIP, full-run on older trees; v139–v142 green. Lessons: (a) a REPEATED instruction = the last interpretation was insufficient — delete the SURFACE, don't polish it; (b) read the ORIGINAL incident doc before trusting a hardening comment; (c) test signature exactness with CASE, not whitespace (the sanitiser canonicalises whitespace before the match).

> **v153 PAGELESS DIRECT BUY (2026-09-19, zip `shivaa-update-v153.zip` md5 `e6948a2b38628359683601cccb139d63`, 5 files — PUSHED, awaiting owner extract; SUPERSEDES v152's zip too):** owner: "completely remove the one tap page … redirect customers directly to the cashfree payment portal once they click on buy now check out or make it yours". pages.express DELETED; every CTA now buys IN PLACE via Shivaa.exDirect (gate: guestCheckout switch + async cashfree/OCC recheck). Returning device = zero UI (shv_exp_contact 180d → order → cf-pending anchor FIRST → payForOrder handoff); new device = one-field card OVER the current page (exmPhone; local validation; Cancel clears the stash). '#/express' URLs bounce (guest #/cart / member #/checkout) — zero literals left. RECLAIM RESUME upgraded: fresh shv_express{orderId,pin,at<10min} RESUMES payment on the same order (orders POST provably never re-fires — fixes v152's double-place); fresh stash re-runs flow; stale clears. v84 gate + v143 CF-phone + boundary address + Online-only + members-classic all pinned intact. Stamps 153 (loader stamps index+sw ?v= included — v152 had shipped them at 152!; new v153-check pins loader-stamps forever). QA: 27/27 static + 23/23 jsdom-9-scenarios, source AND prod-overlay; v152 suites page-probe-guarded; v142 forward-tolerated. Lesson kept: a full-text sed of __SHIVAA_REL does NOT move the script-tag version — the loader stamps are separate bytes; bump them explicitly and grep them.

> **v152 THE DELETION (2026-09-19, zip `shivaa-update-v152.zip` md5 `542fa9e199db9f6be15889032a985538`, sha256 `8177d8b9…e2395`, 5 files incl js/admin.js — PUSHED, awaiting owner extract; v151's zip is OBSOLETE, do not deploy it):** owner ordered FULL removal, everywhere in the file, comments included: "…directly take them to the cashfree payment portal". Every tc mechanism excised from app.js (instant engine, prefill/route/resume IIFEs, data-tcinstant, hero copy), api.php (helpers, consent routes → Unknown API 404, nonce consumption, order tag, config route, settings handler, version tc key) and admin.js (fieldset/doctor/save-prop) — while the two legal floors STAY: v84 address gate + Cashfree's mandatory 10-digit customer_phone. The new flow contract: guest first buy = ONE field on #/express (typed → order → Cashfree); every later buy = `shv_exp_contact` (localStorage, 180d) prefills AND auto-fires doBuy() after 450 ms → tap→Cashfree zero typing; members keep classic checkout; stale `tcNonce` from cached PWAs silently ignored (v152-php-run proves 200). tcAppKey: blocked from public settings projection ('appkey' in blockedSubs) + wiped by the legacy-cred list on next admin save. Admin loader stamp now FOLLOWS APP_REL (v141 bug-class closed at root; v141/v142 checks accept either form). Stamps 152×4. QA: v152-check 21/21 (zero-residue grep incl. comments) + v152-express 14/14 jsdom (RUNTIME PASS CAUGHT the `tcPhone` ReferenceError survivor static greps missed — legacy lesson: deletion demands a behaviour suite) + v152-php-run 11/11 (real PHP: dead routes, surviving gates, version truth) — all green on source AND prod-shaped overlay (full cms copy → v150 zip → v152 zip). All 13 tc-era legacy suites carry a probe-guard: SKIP on new trees, full-run on SMOKE_CMS overlays. PR #74 still OPEN unmerged — WARNING: it carries the v143–v151 tc stack and would REINTRODUCE the feature if merged now; rebuild from this branch if the owner wants it merged.

> **v151 (2026-09-19, branch `arena/01a0b86b-shivaa-ecom`, zip `shivaa-update-v151.zip` md5 `8f827df579540391088b86616b265ec9`, 4 files — ⚠ SUPERSEDED by v152 (v152 deleted the feature; this zip must NOT be deployed), PUSHED, awaiting owner extract):** owner: "the Truecaller problem is still there" — but the LIVE v150 doctor proved the FETCH IS FIXED: lastEp=…/v1/default, HTTP 200, REAL profile keys (id,userId,phoneNumbers,name,addresses,onlineIdentities,badges,companyName,jobTitle,history). What came back is the SHOP'S OWN BUSINESS PROFILE (name.first "SHIVAA JEWELS", last "Pvt Ltd", phoneNumbers ONE landline-shaped digit run) — the test phone's Truecaller app IS the business account; no mobile exists in that profile, and every storefront gate (server + 7 page-side [6-9] checks) rightly demands a mobile. Two worlds remain and ONE second-phone tap + v151's new doctor key separates them: (a) customers with personal Truecaller already work on v150 — only business-device tests can fail; (b) Truecaller console TEST MODE serves the developer profile to EVERY consent — then the fix lives in Truecaller's console, not our code. v151 = api.php-only: tc_profile_audit($p) → 'who=<initials> p=<class>:<count>[ business]' — initials only, phone CLASSES via tc_norm_phone only (never a digit), 59-node budget, degenerate-safe (null→'no-profile'), 5+-digit runs impossible by construction; wired into EVERY outcome line: consent-fail `[aud …]` inside lastError, consent+refetch successes and refetch failure via new PUBLIC config key lastProfile. QA: v151-check 17/17 + v151-php-run 11/11 EXECUTED — including the EXACT live business body → who=SP p=landline:1 business, from-body consent end-to-end, lookalike/bare-host/evidence-lane regressions; page provably untouched (no v151 strings in app.js, 7 mobile gates intact, admin ?v=147); v150 16/16+11/11, v149 31/31+20/20, v148 20/20+16/16, v147 28/28+20/20+14/14, v125 27/27 at commit, ALL on source AND on the full main+v147..v151 overlay (note: run-suites need hallmark/trust/sms/mail.php next to the overlaid api.php — copy them from the main tree; a zip-only root is NOT runnable for php-run). Lesson (kept from v150 sweep): bounded pins are dead — floors only. Stamps 151 lockstep. ANSWER TO "Checked the app version?" (owner): YES, and it exposed a doc-lie — every DEPLOY verify line cited /api/health, a route that NEVER EXISTED (404 Unknown API was api.php's fallback all along). v151 (rebuilt zip md5 8f827df…, v150's md5 94c5928… stays live-known-good) now SHIPS api/version: reads sw.js/index/app stamps from its OWN docroot + the tc verdict {at,kind,ok,who} — ONE honest URL answers "what's live" AND "whose profile last". Live-state facts recorded: www.shivaa.in/sw.js verbatim = shell-v150 (v150 IS deployed); apex shivaa.in 301s to www (single docroot, callback apex URL harmless); config timestamp frozen at 1789819814 since the owner's v150 tap = NO new tap recorded after it ("still there" report = re-reading the SAME business-profile evidence, nothing new failed server-side); PWA manifest "Shivaa" + network-first shell + v115 stale-script auto-reload means the installed app cannot pin old JS while online; official docs confirm accessToken is USER-SCOPED ("fetch the profile only of the related user granting the authorization") + 10-min TTL → the SHIVAA JEWELS profile IS the tapper's identity = the owner tests on the business Truecaller account. QA grew: v151 19/19 + 14/14 (version EXECUTED incl. neighbour-file reads — sandbox needed sw/index/app copied beside /tcrun; static lesson: a check forbidding the STRING '/api/health' in api.php tripped on the comment that HISTORIANS it — check ROUTES, not prose).
> **v150 (2026-09-19, branch `arena/01a0b86b-shivaa-ecom`, zip `shivaa-update-v150.zip` md5 `94c592867c2373519d9ea640f7f6713f`, 4 files — PUSHED, awaiting owner extract):** the Truecaller hiccup's ROOT, found from the v149 live doctor verbatim: lastKind:refetch, lastOk:0, "refetch: still no number" with HTTP 200 + valid JSON + zero digits = the fetch was hitting the BARE PROFILE HOST — when the callback reports "https://profile4-…truecaller.com" the real endpoint is that + `/v1/default` (docs + Caratlane sample). v150 = cms/api.php ONLY, page byte-identical to v149 (the verified one-tap cannot regress): (1) tc_norm_endpoint pure normaliser (bare/root → /v1/default, real paths untouched, fragment dies, junk passes to policy) applied BEFORE the allowlist+fetch; (2) curl guard BELOW the policy so QA executes the whole route; GET gains compatible UA + FOLLOWLOCATION≤2; (3) tc_snip: every failure logs lastEp + a PRIVACY-SCRUBBED body snippet (digits→#, 16+-blobs→<tok>, 300 cap) in the PUBLIC doctor — one live tap = the whole story, no ssh; (4) tc_profile_extract parses JSON-inside-a-string + is_scalar-hardened guards; (5) refetch writes its OWN lastRefetchError (v149 overwrote the consent evidence it needed). QA: v150-check 16/16 static + v150-php-run 11/11 EXECUTED — the exec gate caught a REAL ship-blocker php-parser accepted: unescaped # inside [^?#] of a #-delimited regex → "Unknown modifier ']'" (parse≠valid — every shipped regex now gets a run-case). Legacy stamp pins STILL had bounded ranges that broke at 150 (v117–v124, v140–v142) → converted to numeric FLOORS via st() helper — the LAST time any bump touches them; all 19 legacy suites + patience 16/16 + instant 20/20 + autobuy 14/14 + php-run 20/20 green on source AND fresh overlay (main+v147..v150 zips) incl. v125 owner-lock 27/27. Stamps 150/150/150/150; admin.js ?v=147 untouched. Rollback = v149 zip 7b4b089…; after deploy api/health must read "release":150 and the config shows lastEp — if a tap STILL hiccups the masked snippet names the fix. **SESSION CLOSED 2026-09-19 at v150 — commit chain on `arena/01a0b86b-shivaa-ecom`: `be2c57c` (code + QA suites + zip) → `3c0cf59` (DEPLOY-v150.md + README-PATCH.txt) → `589c34a` (state-doc sweep); ALL PUSHED; final clean-tree re-run 16/16 + 31/31 + 20/20 green; owner replied with the root-cause story, deploy steps, and the standing promise that ONE `api/auth/truecaller/config` JSON explains any residual hiccup. PR #74 verified still OPEN, unmerged, on the owner's word. NEXT-CHAT playbook lives in ARENA-STATE §1. Lesson bank: (a) **PCRE `#`-delimited patterns — a bare `#` inside a char class ends the pattern**; `[^?#]` inside a `#…#i` regex = "Unknown modifier ']'" at runtime, php-parser + every static gate ACCEPTED the broken bytes and the feature silently no-oped — eval-exec caught it pre-ship; **shipped regexes need run-cases, parse≠valid**; (b) **bounded stamp pins (12x|13x|14x) are time bombs** — past their cap they red-fail green code; v150 converted the last ones (v117–v124, v140–v142) to numeric FLOORS via the suites' `st()` helper — no stamp bump ever touches legacy suites again, new suites use floors from day one; (c) **a refetch/refresh path must never reuse the primary path's diagnostic slot** (v149's refetch erased the consent [keys:] evidence it existed to explain) — separate keys lastError/lastRefetchError; (d) **sandbox /tmp scratch is not durable across re-provisions** — the deploy-proof overlay rebuilds deterministically: `git archive <main-sha> | tar x` + unzip v147→v148→v149→v150 zips in order, then run every SHIVAA_ROOT-gated suite there (122/122 static + 11/11 executed on the v150 overlay).
> **v149 (2026-09-19, branch `arena/01a0b86b-shivaa-ecom`, zip `shivaa-update-v149.zip` md5 `7b4b08912fe874ea6b153b8323b9361d`, 4 files — UNDEPLOYED until owner extracts):** the two live-test verdicts answered: (1) "reading the number hiccuped" — live doctor proved lastOk:0 + "profile had no Indian mobile number" → deep recursive tc_profile_extract (any nesting/key/prefix incl 0091→14-digit; body-number fallback; id/token keys excluded) + failed entries store tk/ep (0600) + public refetch route re-reads OUR side once per 12 s before ANY re-tap; doctor lastError logs profile key NAMES. (2) "why open this page → directly to cashfree" — Cashfree hosts THEIR page (no third-party JS possible there), so v149 deletes the waiting page instead: Buy Now / cart CTA (data-tcinstant ×3, warm-cache gate) fire the deep link IN PLACE (floating pill), verified number → silent order (boundary address+tcNonce) → payForOrder = FIRST page; reject/failed/deadline hand off to #/express SAME nonce (typed fallback untouched); boot RESUMES a reclaimed tab via pending mode:'instant'. Single tcDeepLink builder, cached config via Shivaa._tcCfg. Stamps 149 lockstep; admin loader stays ?v=147. QA 31/31 + 12/12 php-run + 20/20 instant jsdom (named desktop control) + 19 legacy suites green on source and on main+v147+v148+v149 overlay; v148 suites made forward-compatible (/g clock, numeric stamps). Lesson bank: guard `buy()` with `placed` only — finish() sets `done` on purpose (a `done` guard deadlocked the first instant buy); test asserts must respect the cashfreeRedirectSheet design (payForOrder holds until redirect/cancel — assert __cfOpened + #cfHandoff, never a post-pay hash); regex pins in JS test files need ONE backslash level less than shell-escaped; v125 owner-lock FAIL "api.php changed" is by-design and flips green at the commit.
> **v148 (2026-09-19, branch `arena/01a0b86b-shivaa-ecom`, ✅ DEPLOYED + LIVE-VERIFIED 19 Sep — fetched www.shivaa.in/sw.js is verbatim `shivaa-shell-v148` with precache `app.js?v=148`; that file exists only in the v148 zip, so all 4 files are on the origin):** TRUECALLER PATIENCE. Owner's live test: one tap worked up to the app (the server RECEIVED Truecaller's consent minutes later — lastKind=consent) but the page "did nothing" — v147 stopped polling at 40 s. v148: 40 s fast + a 3.5 s slow watch to 9 min (typed hint offered WITHOUT killing the auto path — late numbers still buy by themselves), re-attach on return after navigating away, loud "Try again" with a fresh nonce when the server-side profile read fails, api.php stores a terminal failed state + config doctor gained lastOk/lastError, profile-endpoint allowlist accepts real reply shapes (query string, bare truecaller.com; lookalikes still refused). Zip `shivaa-update-v148.zip` md5 `221a807059a121f919f35415f28db617`, **4 files** (admin.js untouched, loader stays ?v=147 — per-file rule now gated). QA: new v148-tc-patience.js 16/16 with named control · php-run 20/20 · ALL 18 historical suites green on the overlay and their stamp pins converted numeric (NEVER RE-PIN). PR #74 OPEN.

> **✅ v147 LIVE (2026-09-19, branch `arena/01a0b86b-shivaa-ecom`, tip `3e8d8b9`; owner extracted, agent verified stamps on the site + a REAL Truecaller consent callback landed with `dataWritable:true`):** Truecaller ONE TAP → Cashfree, zero typing. Callback now honours all three Truecaller messages (handshake/consent/reject), answers 2xx before the profile fetch, stores verified numbers per-nonce in `cms/data/tc-verify/` (atomic, TTL, SSRF-allowlisted); `POST /api/orders` OVERRIDES the typed phone with the server-side verified one when `tcNonce` is live; the One-Tap Buy page fills the phone and fires order+Cashfree hand-off BY ITSELF when the verified number arrives (typing = fallback only). Admin Truecaller card prints the exact console Callback URL + connection doctor. Stamps 147/147/147. **QA WALL BROKEN: `@php-wasm/node` executes real api.php (16/16 gate) — set `emscriptenOptions.processId`; jsdom shell probe proves one-tap end-to-end (14/14, with named control).** Zip `shivaa-update-v147.zip` md5 `5e8e5af76d31aac5bcea7eed761aad4c`, 5 files. **The console Callback URL IS set (apex `https://shivaa.in/api/auth/truecaller/callback`) — a real consent POST was recorded by the deployed code minutes after extract.** PR #74 OPEN, unmerged. Live site is v147.

> **v146 (2026-09-19, branch `arena/01a0b85e-shivaa-ecom`):** live was v144. Cart → Checkout crash ("Something slipped") fixed. Guest cart checkout goes to One-Tap Buy. Truecaller no longer waits on Hostinger-blocked callback — customer types the number they saw in the app. Phone required. Zip `shivaa-update-v146.zip` md5 `a78fbe885808a4e8cdc9a66210a50674`, 5 files, stamps 146. Partner Key already saved live; Cashfree OCC Active.

> **✅ MERGED (2026-09-18): PR #71 — v142, AUTOMATIC GUEST CHECKOUT ("Make It Yours" = one-tap purchase).** Owner brief, verbatim: *"Make the most advanced and Fully automatic checkout, without even otp, still verifying the name number address and payment methods automatically — once a person clicks make it yours then it's automatically purchased, just the customer needs to fill their UPI pin or NetBanking password, everything else is automated."* Ships **v140 → v141 → v142** (v140: install-popup removal + jeweller/retail same-browser auto-landing; v141: admin-bundle stamp fix; v142: the guest express path). **Ships OFF by default** — activates only when Admin → Settings → Payments → **"⚡ Automatic Guest Checkout (One-Tap Buy)"** is ticked AND Cashfree connected AND Cashfree One Click Checkout is *Active* on the account; untick = instant rollback, no migration. Tap **Make It Yours** (signed-out) → order placed instantly → Cashfree's page → Cashfree **auto-verifies name / number / address** + saved payment method → customer types **ONLY** their UPI PIN / net-banking password / bank-required field. **Cashfree's unavoidable rule (not ours):** a brand-new number is verified **once** on Cashfree's own page (Truecaller-style — verify once, remember forever); from the customer's **second** purchase even that disappears. Signed-in members keep the classic checkout (saved address, loyalty). Guests are **prepaid-only (server-enforced in `api.php`)** and always id `'guest'` (no account, no coupons/points/rate-lock); order access rides a one-way PIN (hash of `id | createdAt | per-order entropy`, constant-time, never persisted); per-order gateway-session cap 3 guest / 12 member; dispatch + GST invoice prefer the Cashfree-verified `cfCheckout` address. **A live Cashfree sandbox ₹1 order is STILL OWED before real money.** Deliverable `shivaa-update-v142.zip`, md5 `87f56fb46b63af6a4b793ca95abad6a9`, 6 files, supersedes v140/v141 zips. Gates: 13 suites green (v113b→v142), php-sweep 208 routes · 0 exceptions, pay-audit 10/10 invariants, jsdom end-to-end 0 errors. Branch `arena/01a0b3ff-shivaa-ecom`, tip `f8de57c`.
> This file lives on `main` so ANY new Arena chat (any account, any device) starts with full history.
> Updated: 2026-09-18 — **PAYMENT CORRECTNESS PASS MERGED TO `main` AS PR #69 (v135 → v138).** Three owner-reported defects fixed: GST invoices were issued for orders nobody paid, loyalty points were granted at checkout and never clawed back, and reserved stock was never returned on cancellation. All three were the same mistake — value committed when the checkout form was submitted instead of when money arrived. **`shivaa-update-v138.zip` (md5 `e3e48f6ad116b7bbaaaffc381f32c948`) supersedes v135/v136/v137 — deploy that one only.** Gates 250/252, 10/10 payment invariants, 2/18 audit findings open (#14, #27). **⚠ No PHP binary in the sandbox: the payment path was never executed — a live Cashfree sandbox test is still owed.** **⚠ `.htaccess` is excluded from the Hostinger auto-sync, so this release's CSP fix ships only via the zip.** v127 remains LIVE and owner-verified underneath all of this. Next session starts from this tip.
> **✅ MERGED (2026-09-18): PR #70 — v139, five owner-reported shop fixes.** The owner's hold *"don't merge the PR until you are told to do so"* was lifted at session close (*"perge this PR to main"*), so the merge is authorised and spent — do not treat v139 as pending. **⚠ BUT WHETHER IT REACHED THE LIVE SITE IS UNCONFIRMED:** the Hostinger auto-sync fires on a merge to `main`, and `gh secret list` returns **403 Resource not accessible by integration**, so the FTP credentials could not be read. If they are set, `cms/**` is live as v139; if they were removed, **nothing deployed and the owner must install the zip himself.** Ask, do not assume. Artefact `shivaa-update-v139.zip`, md5 **`cfd64d3ba65641a39140ec0c53533be7`**, **9 files** — the earlier md5s `1863326f…` and `0a3ec3d2…` are void, the zip was rebuilt twice. Gate **56/56**.
> **Previous tip (2026-09-17):** The owner installed `shivaa-update-v127.zip` himself and reported the search-bar categories and the sidebar buttons now work. Live site = the frozen **v125** baseline + the v127 navigation repair (2 files: `index.html`, `js/v127.js`). Version stamps stay **125** on purpose — v127 is a repair, not a release. v126 and the "v125-fix" zip remain dead — do not resurrect them. Next session starts from this tip.
> **Owner magic phrase for next chat:** `Read ARENA-STATE.md and HANDOFF.md and MEMORY.md first, then continue.`

## Session 2026-09-18 #3 (arena/01a0b3ff) — v142 AUTOMATIC GUEST CHECKOUT — MERGED to `main` as PR #71

Owner brief (verbatim): *"Make the most advanced and Fully automatic checkout, without even otp, still verifying the name number address and payment methods automatically — once a person clicks make it yours then it's automatically purchased, just the customer needs to fill their UPI pin or NetBanking password, everything else is automated."*

**What shipped — always gated OFF by default (Admin → Settings → Payments → "⚡ Automatic Guest Checkout (One-Tap Buy)"), off until the owner switches it on:**
- **Guest express path (`cms/js/app.js`)** — `pdBuy` routes a **signed-out** visitor from **Make It Yours** to the One-Tap Buy page; it places the order (`POST /api/orders`) and immediately opens Cashfree (`payForOrder`). Members keep the classic checkout (saved address, loyalty).
- **Cashfree hand-off** — name/number/address auto-verified by Cashfree's One Click Checkout registry; the only customer keystrokes are the UPI PIN / net-banking password / bank-required field on Cashfree's own page.
- **Server gate (`cms/api.php`)** — guest orders only when `settings.guestCheckout` is truthy; id always `'guest'`; **prepaid-only enforced server-side** (`if (!$u && $pm !== 'Online') jout(400, …)` — crafted COD/WhatsApp rejected); coupons/points/rate-lock skipped; order tagged `guest:true`. Access PIN = `substr(sha256(id|createdAt|entropy),0,16)`, returned once, never persisted, constant-time compared; carries the return URL (`?pin=`) and re-verified there. Per-order gateway-session cap 3 guest / 12 member.
- **Admin (`cms/js/admin.js`)** — the switch + payload; dispatch + GST invoice prefer Cashfree-verified `cfCheckout.shipping` and badge it.
- **Stamps** — 142/142/142 in `index.html` + `app.js` + `sw.js` with `v116.js`/`v117.js` in lockstep; staff bundle `/js/admin.js?v=142`. Historical gates widened to 142 (forward-march, same as 140→141).

**Verified:** 13 gate suites (v113b 32/32 … v142 13/13) · php-sweep 208 routes 0 exceptions · `api.php` parse-clean vs a proven broken negative control · pay-audit 10/10 invariants (2/18 pre-existing findings unchanged) · jsdom end-to-end (PDP → Make It Yours → One-Tap Buy → guest order → poller) zero errors. **Still owed before real money: one live Cashfree sandbox ₹1 order.**

- **DEPLOY: `shivaa-update-v142.zip`, md5 `87f56fb46b63af6a4b793ca95abad6a9`, 6 files** (`DEPLOY-v142.md`, `api.php`, `index.html`, `js/admin.js`, `js/app.js`, `sw.js`), root layout, extracts into `public_html` ROOT. Supersedes v140/v141 zips (v140 off-bundle `index.html` changelog layering is now folded through v141; both stay in the repo as history, deploy v142 only).
- **PR #71 merged to `main` (forward-only merge).** Branch `arena/01a0b3ff-shivaa-ecom` → `main`, merged on the owner's instruction to update the handoff docs and merge. `main` tip moved from `848bf41` (owner's 2 screenshot upload) to the merge commit; merge-base `5e09532` (PR #70), neither side touched the other's files (`cms/` + `tools/` vs screenshots), so the merge is clean.
- **Standing:** never fabricate · never hand-edit live `db.json` · forward-only history · bump every `?v=` together · changed stamped files also update `sw.js` · never swap `sw.js` · backup before deploy · nothing ships until owner says · talk plainly · never print the Cashfree secret.

## Session 2026-09-18 #2 (arena/01a0b366) — v139 SHOP-EXPERIENCE PASS: five owner reports, PR #70 OPEN AND **NOT MERGED**

Owner (non-technical) reported five things by phone-style message. **All five were reproduced and measured before being fixed**, and none was taken on trust.

1. **Bag drawer → Checkout did nothing.** Not a dead tap, an **out-raced** one: `app.js:3433`'s anchor and `:3481`'s bubble-phase `[data-mc-close]` handler both ran, `closeCart()` fired inside the click, and `v120.js`'s observer answered a closing sheet with `history.back()` because `sameHash && !__shvNavigating` was still true. Measured with `tools/mega/smoke/probe-control-timing.js`: stripped tree = `history.back() @hash=#/` then `popstate @hash=#/checkout`, `backs=1`; fixed = `popstate @hash=#/checkout` → `hashchange`, `backs=0`. **This is the same defect class v127 removed from `#mainNav` and `#searchSugg` — the bag drawer was never in v127's scope, so the shop's most important button stayed broken for two releases.** Fix: new `cms/js/v139.js` owns the bag's taps in the **capture phase** — navigate, arm `window.__shvNavigating` (which `v120.js` already honours), *then* close. `"Continue shopping"` (a button with no href) deliberately keeps the old path; there the traversal is correct. Animations improved per the owner's aside: depth on arrival, staggered rows, one slow gold sheen on **Checkout ✦** — once, not looping; transform/opacity only, all silenced by `prefers-reduced-motion`.
2. **17 category photos still on a category page.** Measured before the fix: `#/shop?category=earrings` painted **20 tiles / 20 `<img>`** above a grid with **0 pieces**. A *filtered* shop page is a results page — `catChipsHTML()` now renders a compact **text chip strip** there and **zero** photographs; the photo slider stays on the unfiltered `#/shop` and the home page. Side benefit: 20 image requests gone per category page. The drawer's expanded list **folds shut** on navigation. The 17 categories themselves untouched (owner's own v115 decision).
3. **Place Order floated over the phone screen.** Bar is now `mcta-bar mcta-inline` (`id=coBar`) → `position: static` from `css/v139.css`, in the page flow at the end of the form, overriding `mobile.css:315-328`/`:524-526` and `v116.css:166-176`. The **cart** page's bar is still pinned — not reported, and nothing is being typed under it.
4. **Cashfree One Click Checkout did nothing.** **Not a website bug — a missing API call.** Cashfree's *Custom website* OCC guide requires the merchant to extend Create Order with `products.one_click_checkout` (+ `cart_details.cart_items[]`, header `x-api-version: 2025-01-01`) and to read the result back with `GET /pg/orders/{id}/extended`. This site sent neither, so Cashfree served plain hosted checkout with no reason to log anyone in. Added `cashfree_occ_block()` / `cashfree_fetch_order_extended()` / `cashfree_occ_capture()` in `api.php`, three admin switches (`cfOcc`, `cfOccAddress`, `cfOccAuth`) **defaulting OFF**, and the extended response stored as `cfCheckout` **alongside, never over**, the address typed here. **Any OCC refusal triggers one retry as a standard checkout, audit-logged `payment.cashfree-occ-fallback`** — nobody is ever unable to pay because an optional feature was rejected. `pay-audit` finding #10's `fetch < lock < db_load < apply` ordering preserved. **The half Cashfree can never do is now done by the shop:** `pages.checkout` pre-fills from the v84 address book (`GET/POST /api/addresses`, which existed but was never read at checkout), offers each saved address as a one-tap chip, remembers the last used, and can save a new one.
5. **"the update popup that keeps coming on the page is not needed."** Two popups, both **deleted**, not restyled: `app.js`'s "New version available · Update now" toast + `confirm()`, and `js/v107.js`'s "Update available · Reload / Dismiss" prompt that re-appeared **every 30 minutes**. A service-worker update now installs silently, waits for `visibilitychange` → *hidden*, and swaps then. Both are behind a form-safety check so a filled checkout/payment/login form is **never** reloaded over.

- **DEPLOY: `shivaa-update-v139.zip`, md5 `cfd64d3ba65641a39140ec0c53533be7`, 9 files** (`index.html`, `sw.js`, `js/app.js`, `js/v107.js`, `js/v139.js`, `js/admin.js`, `css/v139.css`, `api.php`, `DEPLOY-v139.md`), root layout into `public_html` **ROOT**. Triple **139/139/139**. `.htaccess` and `data/db.json` untouched; `boost.js` stays `?v=46`/`?v=134`. `js/v116.js`/`js/v117.js` are stamp-only and stay out of the zip.
- **GATES, run against the zip's OWN extracted bytes:** v139 **56/56** (50 static · 2 live · 4 control) · v113b 32/32 · v117 27/27 · v118 **19/19** · v119 27/27 · v120 24/24 · v121 14/14 · v122 22/22 · v123 14/14 · v124 20/20 · v125 26/27 · v127 26/27 · **10/10** payment invariants · **2/18** audit findings unchanged · php-sweep **207 routes, 0 exceptions** · `php-parser` clean on `api.php` (128 nodes, proven against a deliberately broken negative control). The 2 v125/v127 failures are those releases' own frozen-triple scope rules (they fail at 138 too) — left failing, never weakened.
- **🔴 NEVER WRITE A BEHAVIOURAL CLAIM INTO A DEPLOY DOC OR A ZIP README BEFORE RUNNING A TEST FOR IT.** The "the 17-category list folds shut on navigation" sentence shipped into `DEPLOY-v139.md` and the zip **untested**. It happened to be true, but that was luck, not verification — `tools/mega/smoke/fold-check.js` was written *afterwards* and only then proved it. Test first, document second. This is the same class of error as the v137 zip that predated its own fix.
- **🔴 BUMPING THE RELEASE STAMP IS NOT FREE.** It silently breaks every past-release gate carrying a bounded version allow-list — and those allow-lists come in **three** shapes: regex alternation `|138)` (47×), quoted array `'138'` (9×), bounded class `13[0-8]` (25×). One python3 sweep covered all three. **Run the whole suite after any stamp bump, before writing any docs.**
- **A past-release gate can legitimately conflict with an owner-requested change.** v118 asserted "the mobile category rail carries all image thumbnails" against `#/shop?category=rings` — exactly the page the owner asked to strip. Fixed by **re-pointing the assertion at the unfiltered `#/shop`** where the rail still lives, plus a rail-exists guard. **Preserve the guarantee, don't delete the check.**
- **`v125-check.js`'s "owner locks respected" hashes `git show HEAD:cms/<file>`**, so it fails for any session that edits `api.php` *before* committing and clears on its own afterwards (25/27 → 26/27, observed both times). Do not "fix" it mid-session.
- **`gh pr edit --body-file` now dies on GitHub's Projects-classic deprecation** (`repository.pullRequest.projectCards`) and leaves the body silently unchanged — the command still exits 0. **Use `gh api -X PATCH repos/<owner>/<repo>/pulls/<n> --input <json>` and re-read the body from the server to confirm.**
- **🔴 SANDBOX RESET TRAP, hit a third time.** Local history was rewound to the branch point `ee30b4d` while the tree stayed intact, so `git status` listed files already committed. Recovery, as documented: `git fetch origin <branch>` explicitly (the default refspec covers only `main`), then `git reset --mixed <remote-tip>`. The remaining diff was then exactly the new work. Never force-push.
- **What was NOT verified, stated plainly:** there is **no PHP binary in this sandbox**, so the Cashfree path was **never executed end to end** — a parse check is not a run, and a live Cashfree **sandbox** order is still owed. **jsdom performs no real cross-document navigation**, so the *visible* on-phone bounce is **inferred** from the identical v127 mechanism (owner live-verified), not measured; the measured quantity is the queued traversal. **One Click Checkout cannot be confirmed at all** until the owner checks that **PG Products → One Click Checkout** reads *Active* on the account.
- **Still blocked on the owner:** #14 settlement reconciliation · #27 abandoned-order points (and **no expiry window has been chosen — do not invent one**; a lazy sweep cannot run on the read path because `shv_wants_write_lock()` is `false` for GET) · #2 receipt email (`cms/mail.php` rejects senders failing `/^\d{4,6}$/`) · #4 EMI (dashboard enablement) · #5 unpaid-order recovery (SMS/WhatsApp creds) · #6 Payment Links (sandbox key).

## Session 2026-09-18 (arena/01a0b25e) — PAYMENT CORRECTNESS PASS: "even if someone does not pay … Shiva automatically issues invoices"

- **Owner's words:** *"When on a payment ways even if someone does not pay and comes back silently then Shiva automatically issues invoices against but the right thing to be done is when a customer pace then only we should issue invoice have you fixed that?"* — then, on being told loyalty points had the identical flaw, *"Continue."*
- **Answer: it had NOT been fixed, and it was in NO prior audit.** It became finding **#25**. Chasing it found the same defect class twice more — loyalty points (#16) and reserved stock (#26). The unifying lesson, now a standing review question for this codebase: **whenever something is granted, deducted or reserved, ask "what happens to it if the purchase never completes?"**
- **THE THREE FIXES.**
  1. **Invoice on payment, not on checkout (v136, `b1a47e9`).** Order creation no longer mints `invoiceNo`. New idempotent `order_issue_invoice(array &$db, array &$ord)` returns early on a non-empty `invoiceNo`, requires `paymentStatus === 'Paid'` and `total > 0`, mints `SHV/{FY}/{seq}` (FY = Apr–Mar IST), sets `invoicedAt`, logs `invoice.issued`. Wired into **five** settling paths. **COD included — invoice after the cash is collected, not at dispatch** (owner decision). **Existing orders keep their numbers so the GST series stays continuous.**
  2. **Loyalty points on payment, with clawback (v137 `4eefb91` + v137.1 `73df782`).** Creation now deducts `pointsUsed` only and stamps `'pointsDeferred' => true`. Three helpers: `order_grant_points` (guards **`empty($ord['pointsDeferred'])` → return first**, then `pointsGranted`, then requires `Paid`; flags only if a user row actually matched, else logs `loyalty.grant-skipped` and leaves the order unflagged for retry) · `order_revoke_points` (guarded on `pointsGranted`, clamps at zero, **full refund only**, wired at **2** refund sites) · `order_restore_points` (guarded on `pointsRestored`, flag set even when `pointsUsed` is 0). Grant wired at **4** call sites alongside the invoice.
  3. **Stock returned on cancellation (v138, `abae753`).** `order_restore_stock()` deliberately mirrors `order_restore_points()` — same `Cancelled` guard, same one-shot `stockRestored` flag, same audit-event shape (`stock.restored`), `unset()` on the by-ref loop var. **Impact stated honestly, not inflated:** stock here is advisory — no route refuses an order on it, no buy button disables on it, all 77 products carry a nominal 8 or 10 — so this corrects the `stock <= 3` low-stock report, it does not change what a customer can buy.
- **🔴 THE MOST IMPORTANT LESSON OF THIS SESSION — deferring a side effect creates a migration hazard on rows that already exist.** Moving point-*earning* from creation to `Paid` meant every order already in the database — which had banked its points at creation and carried no marker — could be credited **a second time** when later marked Paid. Guarding on the *new* flag alone is not enough. **The fix: stamp an explicit marker at creation (`pointsDeferred`) and make the new helper refuse to act without it.** Found in self-review, shipped as v137.1 before the owner ever saw v137. **Ask "what happens to the rows that already exist?" every time you change *when* something is granted.**
- **🔴 SECOND LESSON — a rebuilt fix invalidates the zip you already handed over.** The first v137 zip predated the `pointsDeferred` fix and would have deployed the bug. **After any post-build edit, grep inside the zip for the fix marker and re-publish the md5.** The v137 md5 changed for exactly this reason; the owner was told to discard any earlier download.
- **DEPLOY: `shivaa-update-v138.zip`, md5 `e3e48f6ad116b7bbaaaffc381f32c948`, 5 files** (`.htaccess` 5,310 · `api.php` 386,936 · `index.html` 26,649 · `js/app.js` 560,283 · `sw.js` 7,212), root layout into `public_html` ROOT. **Verified a strict superset of v135+v136+v137** by diffing every fix marker across all four zips — no marker present in an earlier zip is missing from v138, and v138 ships every file they shipped. **Deploy v138 only; delete v135/v136/v137.** Triple **138/138/138** (`__SHIVAA_REL` index.html:71 · `APP_REL` app.js:14 · `SHELL` sw.js:19). **`boost.js` deliberately stays `?v=134`** (injected by `v117.js:49`).
- **GATES, run on the zip's OWN extracted bytes (not the working tree): 250/252** smoke · **2/18** audit findings present · **10/10** invariants. The 2 failures are past-release scope rules, left failing rather than weakened: v125's "no stale `?v=125` stamp" (written for a release that never shipped) and v127's "the frozen v125 triple is untouched" (v127 was a *repair*; v138 is a *release*).
- **🔴 NO PHP BINARY IN THE SANDBOX — NOTHING WAS EXECUTED.** apt repos unreachable, GitHub asset hosts blocked, `@php-wasm/node` 3.1.54 throws `PHPLoader.processId must be set before init`. **Do not retry.** Use `php-parser` and say plainly it is a parse check: `cd /tmp/phpwasm && npm i php-parser`, then `parseCode()`; clean = 125 top-level nodes. **Always include a negative control** (a deliberately broken sample) or the check proves nothing. No `php -l`, no 211-route php-sweep, **no payment path exercised**. A live Cashfree sandbox test is still owed.
- **STILL OPEN — each blocked on owner input, not code.** **#14** settlement reconciliation (needs live settlement data) · **#27** redeemed points on an abandoned order are released only by a manual admin cancel · **#2** receipt email · **#4** EMI · **#5** unpaid-order recovery · **#6** Payment Links.
  - **#2 is NOT blocked on credentials.** `cms/mail.php` (128 lines) is a **real working mailer** — `shivaa_mail_send()` at :90 uses PHP `mail()` with a `-f<from>` envelope attempt then a plain-`mail()` fallback, plus a header-injection guard and a per-IP relay cap; `api.php:25` requires it. The real blockers are its **OTP-only `/^\d{4,6}$/` guard at :96** and the owner's wording. **Do not repeat the earlier "blocked on mail credentials" claim without opening the file — that was wrong once already.**
  - **#27 must not be fixed the easy way.** The natural lazy sweep (release points/stock when an unpaid order is read past a window) **cannot run on the read path**: `shv_wants_write_lock()` returns `false` for `GET`/`HEAD`/`OPTIONS` and `shv_acquire_lock()` returns immediately when it does, so the `orders` GET holds **no lock** — a `db_save()` there writes a stale snapshot back over the whole database, reintroducing finding **#10**. Any sweep must live on a lock-taking POST, or acquire the lock explicitly and re-read under it (the v135 Cashfree-reconcile shape). **There is also no `cron` route and no scheduler in this deployment.** And **no expiry window has been chosen — do not invent one.**
- **⚠ `.htaccess` IS EXCLUDED FROM THE HOSTINGER AUTO-SYNC** (`exclude:` in `.github/workflows/hostinger-deploy.yml`, with `data/**` and `uploads/**`). This release tightens the CSP there (drops the PayU hosts v128 deleted and a stale `*.onrender.com` relay), so **that fix ships only via the zip, never via auto-deploy.** Verified safe: nothing in `cms/` calls PayU (3 surviving mentions are a comment, a credential-wipe loop, a chatbot keyword regex) and `angelRelayUrl` is unset.
- **⚠ THE HOSTINGER FTP SECRETS ARE STILL NOT SET.** All 4 historical `hostinger-deploy.yml` runs failed at preflight: *"Hostinger FTP secrets are not set … Nothing was deployed."* Merging PR #69 therefore fired the workflow and deployed nothing. **If those secrets are ever added, merging any PR touching `cms/**` becomes an unconfirmed live deploy** — the v126 failure mode, one secret away. `[skip deploy]` in the commit message opts out one push.
- **PR #69 → `main`, merged as a MERGE COMMIT** (not squash, not rebase) so every release commit survives and history stays strictly forward — the forward-only contract in `ARENA-STATE.md` and `main-guard.yml` is intact. `main-guard` passes: `ARENA-STATE.md` present, file count 1488 → 1498. **The one red PR check is unrelated** — "Make live catalogue exactly the master PGS rings" failed with `login failed (401): Invalid email or password` in the *catalogue* deployer; this branch touches zero catalogue or `deploy/` files and that check failed before this work existed.
- **🔴 SANDBOX RESET TRAP, hit again this session.** The sandbox wiped `/tmp` and `node_modules` **and rewound local git history to the branch point `9283ba9`** while leaving the working tree intact. A fresh commit then silently squashed everything and the push was rejected. **Recovery that worked: `git fetch origin <branch>` (the default refspec here covers only `main`, so the branch has no local tracking ref — fetch it explicitly), confirm the working tree already equals the remote tip, then `git reset --mixed <remote-tip>`.** Never force-push. **Always verify a push actually landed** — `git rev-parse HEAD` vs `git ls-remote origin <branch>`; v137.1 sat committed-but-unpushed until checked. A simultaneous all-suite crash means a missing `node_modules`, not your edits.
- **🔴 GATE ALLOW-LISTS COME IN THREE SHAPES — a single regex sweep misses one.** Bumping the release to 138 broke 15 assertions until all three were found: regex alternation `(118|119|…|137)`, quoted numeric array `['123','124','137']`, **and bounded character class `13[0-7]`**. Patching only the first two left the gate 3 assertions worse than before; `v120` and `v123` were the character classes. **Enumerate with python, never with one `sed`.**
- **OTHER TRAPS re-confirmed.** A fixed-width `sed` window over a function body lies — it bled into the next function and produced a bogus defect report; **brace-match with python**. `grep -c` returning 0 breaks a `&&` chain and silently truncates the rest of a script. `\+` in a BRE grep pattern is a *quantifier*, not a literal `+` — it made a "stock is never restored" scan match the decrement and nearly produced a false finding; **verify with python fixed-string matching**. `unzip`/overlay recipes must never build a directory symlink and then write through it — that writes into the real repo; **create real directories, symlink only files, `os.remove` before writing**. Never redirect output onto a symlink pointing into the workspace. Never build a blind full-symlink overlay of `cms/` (252 MB).
- **A wrong assertion is worse than none — it bit five times.** `indexOf` returning `-1` satisfies `<`; fixed-width slices silently truncate a grown function; multi-clause negation inverts easily; hardcoding a release number inside an invariant turns it into a release test; an allow-list written `['123',…].includes(…)` is a frozen-release check. **Re-run the gate and read the failure against the source before believing either side.**
- **Zip recipe (root layout): build from `git diff --name-only <branch-point> -- cms/` — the BRANCH POINT, never `HEAD`**, else files already committed in a prior release silently drop out. Overlay recipe: real dirs + per-file symlinks, then overwrite the shipped files with real zip bytes, run gates with `SMOKE_CMS=<dir>`. **`shivaa.in` is unreachable from the sandbox** — no live behaviour is verifiable here.

## Session 2026-09-17 #2 (arena/01a0ad8d) — v127 REPAIR: "the search-bar categories and every sidebar button take me to the home page"
- **Owner's words:** "in the search bar whenever you click on any category then it directly shifts us to the homepage rather than that category … in the sidebar whenever you click any button — Live Rates, Swarna Nidhi, Gold Buyback — it directly takes us to the home page. They are perfect in line, shape and text, but they do not direct us to anything; the buttons are there but they are not functional. Make the buttons of the search bar and sidebar perfect and functional. Do not touch anything other than that. Just give me an update zip, only these two changes."
- **SEARCH-BAR ROOT CAUSE (reproduced, not guessed).** `app.js` dismissed the palette *inside* the click and let the anchor's own default action navigate: `const cat = e.target.closest('a.sugg-cat'); if (cat) { closeSearch(); return; }` — comment says *"native anchor navigates"*. `js/v120.js`'s back-button helper watches overlay classes and, when a sheet closes on an unchanged hash, calls `history.back()` to release the entry the open had pushed. So the tap queued a traversal **and** (a beat later, as the default action) pushed the new hash. **An instrumented run of the shipped tree records `history.back()` firing on exactly this tap** (`[v120] close search was="#/" … sameHash=true nav=false` → `history.back()`); in a real browser the traversal runs after the hash change and drops the shopper on the pre-overlay entry = the home page. jsdom's traversal order hides it, which is why the first repro looked fine — **the gate counts `history.back()` calls rather than trusting the final hash.**
- **SIDEBAR ROOT CAUSE.** Every drawer row (`#/rates`, `#/buyback`, `#/savings`, `#/services`, `#/catalogues`, `#/finale`, `#/b2b`, the four photo tiles, the 17-category list, the three footer links) leaned entirely on the browser's native anchor action, with the drawer closing 90 ms later — **the app itself never performed the navigation.** Anything that swallowed or out-raced that default action left the tap dead, and a dead tap while standing on the home page reads exactly as "it took me to the home page".
- **THE FIX — `cms/js/v127.js` (new) + ONE `<script defer>` line in `cms/index.html`, loaded last. Nothing else.** Capture-phase handlers on `#mainNav a[href^="#/"]` and `#searchSugg a.sugg-cat`: `preventDefault()` → arm `window.__shvNavigating` (the house flag `v120.js` already honours, so no traversal can be queued against a navigation in flight) → navigate through the hash itself → *then* close the sheet. Same-hash taps call `Shivaa.redraw()` (debounced 250 ms) instead of dying.
- **TWO TRAPS this fix had to survive, both found by the gate and not by reading:**
  1. **`e.defaultPrevented` must NOT be a bail-out.** `js/v118.js` preventDefaults a same-hash *category* tap in the document capture phase (it redraws). Bailing on it handed the tap back to the old dismiss-first path — the palette closed with `__shvNavigating` false and `history.back()` fired again — and left the drawer stuck open on a repeat tap. The layer now owns the tap regardless and debounces the double redraw.
  2. **A repair must not swap `sw.js`** (owner rule #3 after v126), but `v117-check.js` demands precache == shell requests. Resolved the house way: `v117-check.js` gained a documented `NETWORK_ONLY` allow-list naming `/js/v127.js?v=127` (worker is network-first for scripts, so the fetch handler caches it on first paint). The gate still fails on any other gap and on any relic — **verified by adding a dummy `<script>` and watching it fail.**
- **Deliberately NOT done:** no `sw.js`, no version-triple bump (`__SHIVAA_REL`/`APP_REL`/`SHELL` all stay **125**), no `app.js`/`v120.js` edit, no `.htaccess`, no `api.php`, no `db.json`. **Known-but-untouched (found, not fixed, out of scope):** `js/v120.js` stores `openHash[id] = location.hash`, which is the empty string on a bare `shivaa.in/` visit — falsy — so on the home page the close branch never runs and *every* class mutation while a sheet is open pushes another history entry (instrumented: 2 pushStates for one drawer open). It pollutes the Back button; it does not bounce navigation. Fixing it would mean editing `v120.js`, which this repair was told not to touch. **Ask the owner before doing it.**
- **Gates: 252/252 on source AND on the built zip overlay** (v113b 32 · v117 27 · v118 18 · v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 27 · **v127 27**) · php-sweep **211 routes · 0 exceptions**. `tools/mega/smoke/v127-check.js` boots the real shell, taps every button the owner named, asserts `history.back()` is never queued against a tap, and carries a **named regression check**: the same chip tap on the shell with `js/v127.js` stripped out **does** fire `history.back()` — proof the bug was real and that the gate still sees it.
- **Deliverable:** `shivaa-update-v127.zip` (**2 files, 11 KB**, root layout: `index.html` + `js/v127.js`) at the repo root + `DEPLOY-v127.md` (backup-first runbook, 8-step owner check list). A sandbox preview server (`tools/mega/smoke/preview-server.js`, static + db.json API emulation) was left running so the owner can tap the buttons himself.
- **Live verification is the owner's — do not record it until he reports it.**

### SESSION CLOSE (17 Sep 2026) — owner asked "have you updated any v126 files in v127?" and then "close this chat"
- **Answer, verified not asserted: NO. Zero v126 content in v127.** Evidence, all re-run at close: the zip holds exactly 2 files (`index.html`, `js/v127.js`); the string `126` appears **0 times** in either of them; no `v126` file exists under `cms/js/` or `cms/css/`; `git ls-tree -r --name-only origin/main | grep -i 126` → **empty**, and the same command on `arena/01a0ad8d-shivaa-ecom` → **empty**. The whole branch changes exactly **2 files inside `cms/`**: `index.html` (+4 lines) and the new `cms/js/v127.js`. The only surviving "126" in `cms/` is colour values (`rgba(228,201,126,…)` in `styles.css`) and QR tables in `js/qr.js` — neither is a version reference. **`sw.js`, `app.js`, `boost.js`, `boost.css`, `.htaccess`, `api.php`, `db.json` all untouched; the triple stays 125.**
- **Ledger correction made at close:** the 16 Sep `HANDOFF.md` line claiming `shivaa-update-v126.zip` / `DEPLOY-v126.md` / the v126 tools "still sit at the repo root on `main` — inert" was **stale and false**. They are gone from the tree entirely; no cleanup is pending. Corrected in `HANDOFF.md` (commit `d6782ba`, doc-only — `cms/` and the zip unchanged, md5s identical before and after).
- **Branch / PR state at close:** commits `da6e5cb` (the fix) + `d6782ba` (the doc correction) on `arena/01a0ad8d-shivaa-ecom`, pushed. **PR #59 → `main` was OPEN AND DELIBERATELY UNMERGED at the time of writing** *(superseded — merged as `5ed09a5`; see ✅ MERGED below)*. Merging fires the Hostinger auto-sync cron within ~5 min and would deploy `cms/` to `public_html` **before the owner has taken his backup** — that breaks owner rule #1 (backup first) and rule #4 (nothing is shipped until he says so), which is exactly the v126 failure mode. **This instruction is now spent: the owner was asked, chose to merge, and PR #59 is merged as `5ed09a5`.**
- **⚠ THE LEDGER TRAP THIS CREATED** *(now closed by the merge — kept as history)*: because PR #59 was unmerged, **this v127 session entry, the `HANDOFF.md` § v127 and the `docs/AGENT-HANDOFF.md` note all live ONLY on `arena/01a0ad8d-shivaa-ecom`, not on `main`.** A new chat branching from `main` will not see them. Recover first:
  `git fetch origin arena/01a0ad8d-shivaa-ecom && git log --oneline -3 FETCH_HEAD`
  (`da6e5cb` fix · `d6782ba` doc correction). Deliverable `shivaa-update-v127.zip` (2 files, 11 KB, md5 `a3bc6214eaff1b19f43a6da9465966c0`) is on that branch.
- **Pending, in order:** (1) owner downloads a full `public_html` backup zip; (2) owner extracts `shivaa-update-v127.zip` into `public_html` ROOT, or says the word and PR #59 is merged; (3) owner runs the 8-step check list in `DEPLOY-v127.md`; (4) **only then** is v127 recorded as live-verified. Gates at close, on the shipped zip's own contents: **252/252** + php-sweep **211/0**.
- **Known-but-untouched, still open (ask before fixing):** the `js/v120.js` falsy-`openHash` history-entry leak described above. Fixing it means editing `v120.js`, which this repair was told not to touch.
- Sandbox note: `tools/mega/smoke/preview-server.js` (static + `db.json` API emulation) was added so the owner can tap the buttons without deploying; it is a sandbox tool and is never part of a zip.

### ✅ OWNER LIVE-VERIFIED — 17 Sep 2026 (this supersedes the "Pending" list above; steps 1–3 are DONE)
- **Owner's words (verbatim):** *"The version 127 update is working very fine and I installed it and extracted in public HTML folder and its working fine now."* → **v127 is the live, owner-confirmed state of shivaa.in. Per house law this is the first point at which it may be recorded as live-verified — and it is now so recorded.**
- **Independently re-checked from the sandbox (not just taken on report):** `fetch_page` on
  `https://shivaa.in/js/v127.js` returned **HTTP 200 with the full, correct file** — the v127
  header comment, `arm()`, `navigate()`, `onDrawerTap()`, `onPaletteTap()` and the capture-phase
  `bind()`, all as shipped. **The `<script src="/js/v127.js?v=127">` tag in the live shell was
  NOT directly read** — the fetch tool returns markdown and strips `<script>` elements. It is
  inferred, not observed: the tag can only be absent if `index.html` was not extracted, and
  without it the layer never loads and the buttons could not work, which the owner confirms
  they do. Both files ship in the one zip, so extracting it necessarily replaced both.
- **How it got live:** the owner's own path — he extracted `shivaa-update-v127.zip` into the `public_html` **ROOT** himself. **The Hostinger auto-sync cron was NOT involved in that install** (PR #59 was merged later, as `5ed09a5`). So the live tree is v125 + the two v127 files, and nothing else changed.
- **⚠ HOW TO CONFIRM v127 IS LIVE — do NOT use the old trick.** Every previous release was verified by reading `https://shivaa.in/sw.js` for the `SHELL` stamp. **That check will read `shivaa-shell-v125` and that is CORRECT, not a failure** — v127 is a repair and deliberately did not re-stamp the shell or touch `sw.js`. The live proof of v127 is: `https://shivaa.in/js/v127.js` returns real JavaScript, and `https://shivaa.in/` view-source contains `<script src="/js/v127.js?v=127" defer>`. (The sandbox has no route to shivaa.in — `fetch_page` can read it, bash/curl cannot.)
- **What is confirmed working on the owner's device:** the search-bar category chips land on their own category, and the sidebar buttons (Live Rates, Gold Buyback, Swarna Nidhi, and the rest) land on their own pages. No regression reported.
- **PR #59 (`arena/01a0ad8d-shivaa-ecom` → `main`) was OPEN and UNMERGED at this point** *(superseded — merged as `5ed09a5`; see ✅ MERGED below)*. The reason for holding it (deploy before the owner's backup) no longer applies: he has deployed and verified. Merging now is safe in principle — `main`'s `cms/` would match what is already live, so the auto-sync cron would deploy identical files — and it is the only way this ledger reaches `main`. **He was asked, chose "Yes, merge PR #59", and it is merged as `5ed09a5`.**
- **⚠ THE LEDGER TRAP WAS LIVE** *(now closed by the merge)*: until PR #59 merged, **this whole session entry, `HANDOFF.md` § v127 and the `docs/AGENT-HANDOFF.md` note exist ONLY on `arena/01a0ad8d-shivaa-ecom`.** A new chat branching from `main` sees v125 as the newest state and would not know v127 is live. Recover first:
  `git fetch origin arena/01a0ad8d-shivaa-ecom && git log --oneline -4 FETCH_HEAD`
  (`da6e5cb` fix · `d6782ba` doc correction · `69ebacf` session close · `<this entry>`). Zip md5 `a3bc6214eaff1b19f43a6da9465966c0`.
- **Forward baseline from here:** v125 + v127. Any future change must preserve BOTH — the v127 layer owns the sidebar and search-palette taps, so a later release that edits drawer or palette markup must keep `#mainNav`, `#searchSugg`, `a.sugg-cat` and the `href="#/…"` contract intact, and must re-run `v127-check.js` (27) alongside the other gates.

### ✅ MERGED TO `main` — 17 Sep 2026, 05:15 UTC · merge commit `5ed09a5` (PR #59) — THE LEDGER TRAP IS CLOSED
- The owner was asked directly and chose **"Yes, merge PR #59"**. Fast-forward from `4be9a54`, so no conflicts were possible. **`main` tip = `5ed09a5`.**
- **Verified by reading `origin/main`, not assumed:** `cms/js/v127.js` present (8465 bytes) · `cms/index.html` references `/js/v127.js?v=127` (1×) · `shivaa-update-v127.zip` present (10896 bytes) · **`git diff origin/main HEAD -- cms/` is EMPTY** (main's `cms/` is byte-identical to the tree that passed 252/252 and to what the owner installed) · `git ls-tree -r --name-only origin/main | grep -i 126` still empty.
- **A new chat branching from `main` now sees v127 as the newest, live, owner-verified state.** No recovery command is needed any more; the `git fetch origin arena/01a0ad8d-shivaa-ecom` instructions above are history.
- **Deploy note:** the merge fires the Hostinger auto-sync cron, which re-deploys `cms/` within ~5 min. That is a no-op for the shopper — the same two files the owner already extracted by hand — and it excludes `data/` and `uploads/`, so the live DB and media are untouched. (The cron has failed silently once before, v119/PR #45; if it does not fire, nothing is lost — the owner's manual extract is already live.)
- **Forward baseline, final for this session: v125 + v127, both on `main`, live and owner-verified.**

## Historical session 2026-09-16 #2 (arena/01a0ab0c) — v125 freeze, superseded by later owner-requested releases through v169. v126 and the "v125-fix" zip are dead
- **Owner's words (after the 3-file fix made the live site bad again in his judgment):** "please dont be oversmart now i just feel my store right, you just forget everything you did for v126 and for v125 fix zip, ok?" → **Standing law: v125 = the stable live baseline. Do not propose, build, upload or reference v126, `shivaa-update-v126.zip`, or the 3-file fix (`sw.js`/`js/boost.js`/`css/boost.css`) again in any session — unless the owner himself explicitly asks.**
- **Owner's recovery (his moves, do not touch):** downloaded the full `public_html` zip from Hostinger (his backup) → extracted it → re-extracted `shivaa-update-v125.zip` over the top → "now everything is ok / my store right". **That is the live state. Leave it alone.**
- **Facts, honestly recorded (no diagnosis pushed on the owner):** the 3-file fix was byte-identical v125-era content (its `sw.js` == the v125 zip's own `sw.js`; `boost.js`/`boost.css` = the pre-v126 versions), verified and gated. It still made the live site worse in the owner's experience. **Lessons (labelled as such, not facts):** (a) swapping `sw.js` out-of-band makes every device's service worker wipe and re-fetch its whole cache — a big visible churn on the next visit; (b) v125-era `boost.js` re-mounts ~47 MB of EAGER autoplay films (hero 16 MB + four ambients) — the exact weight v126 later made cold, whose lightness the owner had since had. **"Byte-identical to an old file" is not the same as "safe to deploy" on this site.**
- **Actions taken (repo only, zero live impact):** `shivaa-fix-v125.zip` + `DEPLOY-v125-FIX.md` REMOVED from the branch tip (removal commit on top of 24a254c; they remain only in history, referenced nowhere). Repo `cms/` = pure v125 (PR #55 revert, untouched). Stale `shivaa-update-v126.zip` still sits at the repo root on main — inert (nothing loads it); the owner may ask to delete it later.
- **Ground rules for any FUTURE change (owner-driven, in this order):** (1) owner downloads a full `public_html` backup zip from Hostinger FIRST; (2) at most ONE small numbered zip, root layout, minimum files; (3) `sw.js` is NEVER swapped in a "repair" — only inside a full release that re-stamps everything; (4) owner extracts, owner verifies on his own device — nothing is "shipped" until he says it is.
- **Owner's final word (end of session):** "my website should be v125 only and no changes" — the live site is left exactly as he restored it (his backup zip + v125 re-extract); no further live probing, deploys or proposals in any session unless he asks. Branch `arena/01a0ab0c-shivaa-ecom` merged to `main` via **PR #56** and closed — `main` = pure v125 (`43eae10`) + these handoff updates only.

## Session 2026-09-17 #1 (arena/01a0aab2) — v126 THE LAPTOP (film budget · the glow · the desktop layer)
- **Owner's four complaints (laptop screenshot + phone):** loads very slowly on the laptop · >70% of the laptop screen is empty · the gold thread doesn't glow · on mobile the FIFTH Gold Thread film never loads. Plus the direct question: *"should we introduce more elements and graphics only for laptop/desktop users, which will be only visible to desktop users? in mobile it's perfect."* → **answered yes, shipped, and gated so a phone cannot see one byte of it.**
- **THE SPEED ROOT CAUSE (measured, not guessed — grep the file, do not assume):** `cms/js/boost.js enhanceHome()` mounted five eager `autoplay` films the instant the home template existed: `hero.mp4` **16.3 MB** + heritage 7.5 + bridal-lux 6.0 + rings-worn 6.1 + gold-flow 11.8 ≈ **47 MB**, plus v125's nine films at `preload="metadata"` and the bridal CTA film. **No device / save-data / viewport guard at all** — a laptop and a phone paid the same price. (Ambient films are also LONG: hero 11:51, heritage/gold-flow 14:08 at 1920×1080.)
- **Lesson for any future "site is slow" report:** before touching boot/JS, grep every layer for `<video`/`autoplay`/`preload` — the biggest payload on this homepage was not CSS or JS, it was five films nobody had audited since v46.
- **The fix = a film budget, not a queue.** All films cold (`preload="none"`, URL in `data-film`); `js/v126.js` hands out bytes under a budget of 4 (laptop) / 3 (phone) / 0 (save-data or au-lite); warms at 75% of a viewport away, plays at 22% visibility, evicts the live film **furthest from the viewport**, retries `error`/`stalled` twice then parks on the poster, and a 2.2 s watchdog re-arms any film with `svWant=1` still at `readyState 0`. The 16 MB hero film also waits for `load` + 2.2 s idle.
- **WHY THREAD 05 DIED (the phone bug):** nine films × `preload=metadata` competing for ≈4 hardware decoders, handed out in **creation order** — the last element in the queue lost. Creation order is case 01–04 then thread 01–05, so 05 · Forever, Reimagined was last. Pinned by a named regression check in `v126-check.js`: *"THE FIFTH FILM ALWAYS GETS ITS BYTES — with every other film holding the budget, 05 still acquires"*.
- **v125 contract, extended additively (never rewritten):** `splay()`/`shut()` are now the ONLY play/pause doors and stamp `dataset.svWant` so a film the governor detached can be replayed the moment it is re-armed. Films keep their `src` (so a browser without v126 still plays them) — `preload="none"` is what stops the bytes.
- **The glow:** two halo strokes under `.sv-draw` (outer blurred with `filter:url(#svGlowF)`), a CSS drop-shadow bloom, an ember riding the tip via `getPointAtLength`. **The ember mirrors v125's own dash geometry (`strokeDasharray`/`strokeDashoffset` on `#svThreadPath`) instead of recomputing progress — one source of truth, and the gate asserts the two always match.** Stroke widths stay small: the thread SVG is `preserveAspectRatio="none"` and stretches ≈3.1× horizontally on a 1240 px column, so a stroke-width of 8 paints ≈25 px.
- **Desktop-only layer:** gutter rails (≥1280 px + mouse) in the empty margins, a clickable 4-chapter rail under the Revolving Case driving v125's own `caseFront()`/`open()`, chapter medallions + filigree + wider rows/bigger films in the Gold Thread (≥1024 px). **Every rule inside a `min-width` query, every element created only for matching media, and `undesk()` removes it all if the window is dragged narrow.** The gate boots a phone-shaped jsdom and asserts zero desktop ornament while both features and all nine films remain.
- **⚠ CACHE STAMP TRAP (new house rule):** v126 EDITED `boost.js`, which is loaded with a **`?v=46`** stamp by the v117 post-paint injector and precached with the same stamp. Re-stamping only app/index/sw would have shipped the fix to fresh visitors and left every returning visitor on the eager-video build — with no visible change at all. **Always grep for every `<script>`/injector/prescache reference to a file you edit, not just the release triple.** The v117 gate now reads the boost stamp from `v117.js` so it can never desync again.
- **The sandbox has NO browser** (playwright's chromium download is blocked, apt is not root): every claim here comes from source reading + jsdom gates. jsdom reports `hardwareConcurrency = 2`, which makes `aurum.js` flip `au-lite` on after first paint — so any gate that asserts a non-lite budget must pin `navigator.hardwareConcurrency = 8` in `beforeParse`.
- **Gates: 264/264 on source AND on the zip overlay** (v113b 32 · v117 27 · v118 18 · v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 27 · **v126 39**) · php-sweep 211/0. Zip `shivaa-update-v126.zip` (10 files, 216 KB, code only — no media) + `DEPLOY-v126.md`. **Live verification is the owner's — do not record it until he reports it.**

## Session 2026-09-16 #7 (arena/01a0a860) — v125 SHIPPED — the owner said "Ship it"
- **Owner's word received (16 Sep night): "Ship it and also give me a update zip file in the GitHub if you can't auto deploy."** → **PR #51 MERGED to main as `b2eb791` (16 Sep 2026, 13:46 UTC)** — merge verified: main's `cms/sw.js` = `shivaa-shell-v125`, `cms/js/v125.js` carries THREAD_FILMS, `shivaa-update-v125.zip` (11.0 MB) at repo root. All nine films real, 224/224 gates, php-sweep 211/0.
- **Deploy routes both live:** (1) main-merge auto-sync cron (Hostinger-side; it failed silently once before — v119/PR #45 lesson: never trust it until the merge is SEEN live), (2) `shivaa-update-v125.zip` at the repo root on main (25 files, 11.0 MB, root layout, no api.php/.htaccess/db.json) + `DEPLOY-v125.md` runbook (2-min Hostinger extract into public_html).
- **Owner live-verification checklist (his, not ours — no route to shivaa.in from sandbox):** close ALL shivaa.in tabs → reopen; home shows the Revolving Case (bride arc, The Unboxing fronts) below the category slider and the Gold Thread (fire-to-forever, 5 chapters) after Bestsellers; old "house in motion" strip gone; tap a film → full screen with sound; `/sw.js` view-source shows `shivaa-shell-v125`; data-saver ON → posters only.
- **Do NOT record "owner live-verified" until he actually reports it (house law).**
- Post-ship film fixes = one re-roll + `film-0X.mp4`/`thread-0X.mp4` overwrite + re-zip; stand-ins and all prior states recoverable from git history.

## Session 2026-09-16 #6 (arena/01a0a860) — v125 case films INSTALLED — ALL NINE films are the owner's real footage
- **Owner uploaded the 4 case videos to `main`** (commit `ac69a5a`, root): `Bride_unboxing_Shivaa_Jewels_box` · `Mother_puts_ring_on_bride` · `Woman_modeling_Shivaa_Jewels_gold` · `Woman_wearing_Shivaa_Jewels_jewelry` — all 1080×1920 9:16, 10.00 s, 24 fps, 5.5–7.5 MB raw, timestamps 18:59–19:02 (sequential = intended order). He offered links; none needed (repo upload is the reliable channel, as always).
- **Installed over the stand-in paths** `cms/images/films/film-01..04.mp4` (compressed 720×1280 CRF 26 faststart, 1298–1665 KB each) + posters (26–71 KB; unboxing poster at 6 s so the box is open). **AI stand-ins are gone from the shipping tree — recoverable from git history (`62b0477`) if ever needed.**
- **Case arc retitled to the bride's journey:** 01 The Unboxing "The box opens, and the room goes quiet." · 02 The Blessing "A mother's hands. A promise in gold." · 03 The Muse "Some gold waits its whole life for her." · 04 The Wearing "Then one day, it is simply hers." (Case fronts The Unboxing; thread = the gold's journey, case = the bride's — two journeys, one homepage.)
- **Gates: v125-check 26/26** (new static: case arc titles; counter now `01 / 04 · THE UNBOXING`; case reel test opens The Blessing; stale "stand-in" labels cleaned). **Suite 224/224** (v113b 32 · v117 27 · v118 18 · v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 26) on source AND zip overlay; php-sweep 211/0. **Zip 25 files / 11.0 MB.**
- **PR #51 OPEN — the only remaining gate is the owner's "ship it".** No stand-ins left anywhere. Owner eyeball pass suggested before shipping: the unboxing film shows the box branding ("Shivaa Jewels" per the filename) and AI generators sometimes mangle on-screen text — the sandbox has no vision this session, so that visual check is the owner's.
- ffmpeg note: sources emit harmless `mmco: unref short failure` decoder warnings (AI-encode quirk); outputs are clean.

## Session 2026-09-16 #5 (arena/01a0a860) — v125 thread films INSTALLED: the owner's five real story films
- **Owner uploaded 5 videos straight to `main`** (commit `5d3aff0`, repo root, "Add files via upload"). All 1080×1920 true 9:16, exactly 10.00 s, H.264 24 fps, 3.5–4.9 MB each — matched the five prompts 1:1 by filename + timestamp: Molten pour → **The Beginning**, Sketch→bangle → **From Paper to Gold**, Marble → **The Pieces**, Woman bangles → **The Modern Bride**, Velvet bangles → **Forever, Reimagined**. Story = "traditional values, modern methods" (owner chose the blend over pure-traditional or pure-modern).
- **GIT LESSON: this sandbox is a SHALLOW clone** — `git merge origin/main` fails "refusing to merge unrelated histories" even though the upload's parent IS the branch point (graft boundary). Workaround used: `git checkout origin/main -- <paths>` then commit on the session branch. Verify with `git rev-parse --is-shallow-repository`.
- **Installed:** compressed to 720×1280 CRF 26 faststart (`thread-01..05.mp4`, 689–1214 KB, ~4.6 MB total) + posters (frame at 5 s; sketch one at 7.5 s post-transform; 40–58 KB) in `cms/images/films/`. Raw uploads stay at repo root (house pattern, like `ponchi-500x500.jpg`).
- **v125.js restructure:** `FILMS` split into `CASE_FILMS` (4 AI stand-ins — case footage still pending) and `THREAD_FILMS` (5 real, story titles/captions fire-to-forever). The Reel is list-aware: `reel.list` set at open, bars rebuilt when the list changes (`reelBuildBars`), counter "0X / 05". Thread SVG path redrawn with **5 weaves** (one per chapter). New test API `ShivaaV125.openThread`. Thread intro copy: "Five chapters, fire to forever."
- **Gate: v125-check now 25/25** (new asserts: 9 films + posters on disk, story arc text, thread srcs `thread-0[1-5]`, thread reel round-trip with own counter, au-lite = 4 + 5 posters). **Test bug (not a site bug): my first check opened chapter 3 expecting The Modern Bride — she is chapter 04 (index 3); the feature was right, the expectation was wrong.**
- **Suite: 223/223** (v113b 32 · v117 27 · v118 18 · v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 25) on source AND on the rebuilt zip overlay; php-sweep 211/0. **Zip `shivaa-update-v125.zip` now 25 files / 6.4 MB** (adds 5 thread films + 5 posters), still no api.php/.htaccess/db.json.
- **PR #51 still OPEN, deliberately unmerged:** the thread is real footage now, but the **Case still runs 4 AI stand-ins** — merge only on the owner's "ship it" (accepting case stand-ins) or after he sends the 4 case films.

## Session 2026-09-16 #4 (arena/01a0a860) — v125 THE FOUR FILMS: Revolving Case + Gold Thread (owner picked ways 12 + 17)
- **Owner pick:** "I select no 12 and no 17" — Way 17 Revolving Case (round-4 `index.html`) + Way 12 Gold Thread (round-3 `round3.html`) built for real on the live homepage as **v125**, plus the full-screen **Reel** player. First-ever `cms/` edit session on this branch.
- **New files:** `cms/js/v125.js` (self-guarding IIFE, house style) + `cms/css/v125.css` (all styles `sv-` prefixed) + 8 stand-in films in `cms/images/films/` (`film-01..04.mp4` 209–355 KB + `film-01..04.jpg` posters; total ~1.2 MB video). **THE FILMS ARE AI STAND-INS — disclosed in DEPLOY-v125.md; owner sends real 9:16 footage → drop in as `film-0X.mp4`, bump film path `?v=` in v125.js, re-ship. Nothing else changes.**
- **Home template (app.js):** Case section between category-slider and Bestsellers (`<div id="svCaseMount">`), Thread section after Bestsellers before the spotlight block (`<div id="svThreadMount">`); both static skeletons, filled by v125.js at mount (idempotent `dataset.mnt`, MutationObserver on `#view`).
- **Case mechanics:** 3D ring, pointer events (touch+mouse), inertia + magnetic snap, **rapid-click queue preserved** (`stepBy` computes from `snapTo` when a snap is in flight — the round-4 bug fix). **Direction gotcha: front() = −rot/STEP so "next" = `snapTo = base − d*STEP`** (first port had it inverted — caught by gate math before ship). rAF loop self-stops when settled; restarts on input.
- **Thread mechanics:** scroll-drawn SVG path (getTotalLength guarded, 2400 fallback), one global passive scroll listener → rAF throttle, films ignite when the thread tip passes their centre. Reel: single DOM instance on body, FLIP zoom from origin (skipped when REDUCED or zero rects), sound on gesture, swipe + arrows + auto-advance + progress bars, Escape/hashchange/pagehide close, `html.sv-reel-open` scroll lock, pauses case/thread films while open.
- **Data discipline:** muted + playsinline + poster-first + plays only while visible; **au-lite/saveData → NO `<video>` mounts at all** (posters only, reel loads on explicit tap); REDUCED → no autoplay, no zoom. LITE re-checked at every mount (aurum.js can land late).
- **v125 supersedes boost's "house in motion" films row** (display layer only — v125.js removes `[data-boost="films"]` from home via the #view MutationObserver because boost inserts post-paint; boost.js itself untouched; delete the supersede block to restore). Hero film + all other boost sections untouched.
- **Stamps 124 → 125:** index.html (REL + 2), app.js (APP_REL + 14 incl. the `&v=` branch), v116.js (1), sw.js (SHELL `shivaa-shell-v125` + 2 re-pins + 2 new precache entries). **MEDIA stays `shivaa-media-v120` (owner lock).**
- **Gates: NEW `v125-check.js` 23/23** (12 static + 11 live incl. au-lite zero-video boot). Older suites extended for 125 (house pattern): v117–v122 `|125`, v123 `['123','124','125']` + `12[345]`, v124 `['124','125']` + `?v=(124|125)` ×23, **and v120's own `?v=12(0|3|4)` tile alternations needed widening to `12(0|3|4|5)` — v120 broke 20/24 until that was found (its pattern style differs from the others')**. Full suite: **v113b 32 · v117 27 · v118 18 · v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 23 = 221/221 on source AND on the zip overlay** · php-sweep 211/0.
- **Deliverable:** `shivaa-update-v125.zip` (15 files, root layout, 2.1 MB, NO api.php/.htaccess/db.json — gated) + `DEPLOY-v125.md` (stand-in disclosure at the top, owner phone pass, rollback).
- **NOT MERGED on purpose:** PR open to main, **do not merge until the owner either accepts the AI stand-in films or sends the real four** — merging auto-deploys to the live site.

## Session 2026-09-16 #3 (arena/01a0a860) — 5 homepage-video presentation proposals (NOT a release)
- **Owner question:** "if I give you 4 cinematic videos of shivaa jewels, can you beautifully show them on the home page? tell me 5 ways and 5 previews." **Owner correction mid-turn: the films are 9:16 vertical** — all five layouts were designed for portrait accordingly.
- **Built `previews/homepage-videos/`** (self-contained, no cms/ change, no release, rates untouched): one page, five LIVE interactive demos in the site's exact tokens + fonts (copied woff2): **1 Reels Row** (round gold chips → fullscreen reel viewer: sound, swipe, progress bars, auto-advance — recommendation), **2 Film Hero** (headline + tall film card, blurred ambient backdrop, 4 chapter dots), **3 Films Rail** (poster-card shelf, play-on-view/pause-off-view, tap→reel viewer), **4 Story Blocks** (editorial "chapters", gold-framed windows, scroll reveal — pairs with 1), **5 Boutique Wall** (dark maroon band, all four playing, hover-spotlight, phone→swipe row). Every demo uses the shipping technique: muted, playsinline, poster-first, IntersectionObserver play/pause, tap-to-load data rule for the reel viewer (matches the PDP 360° pattern).
- **Stand-in footage:** 4 AI 9:16 stills → 8 s 720×1280 H.264 Ken Burns films (zoom/tilt/drift, 0.2–0.36 MB each) + posters, rendered with imageio-ffmpeg's static ffmpeg (`/home/user/tools/bin/ffmpeg`, re-linked per survival kit). Real films will replace files 1:1. No visual QA possible (image reads return placeholders this session) — owner eyeballs the live preview.
- **jsdom boot gate 14/14** (`/tmp/pv-check.js`, re-usable pattern): containers build, reel viewer opens/titles/counts, hero dots swap, Escape closes. Caught + fixed: matchMedia/IntersectionObserver guards, safe-play helper (`splay` — older Androids return undefined from play()).
- **TOOLING LESSON (important): parallel `edit_file` calls on the SAME file race — each reads the original and the last write wins, silently losing edits (lost 2/5 and 2/3 in two batches). Sequential python patch scripts with asserts are the safe pattern for multi-edit turns.**
- **Round 2 (same session):** owner found the first five "too simple" → built `previews/homepage-videos/advanced.html` — five ADVANCED live demos, same tokens/footage/reel-viewer (now with FLIP zoom-from-origin): **6 Scroll Cinema** (380dvh pinned scrollytelling, crossfade+settle-zoom, chapter rail, skip button, only active film plays), **7 Chapter Ring** (watch-bezel dial: rotating engraved SVG textPath ring, 4 poster nodes, double-buffer film crossfade, 90° bezel spin per change), **8 Living Bento** (4×5 named-area grid mixing films + trust tiles: 22K/BIS, live-rate count-up ₹14,200 = the documented 15 Sep number, 77 designs, 1987 Jaipur, CTA), **9 3D Showcase** (CSS perspective shelf, cursor-tilt lerp via --rx/--ry, hover translateZ(150px), poster reflections, gold dust; <820px flattens to snap row), **10 Spotlight Vault** (620px blend-screen spotlight lerped to cursor, per-tile --lit distance lighting, magnifying dock (gaussian), FLIP zoom open; touch follows thumb). jsdom gate 22/22 incl. chapter switching + FLIP; jsdom "Not implemented: HTMLMediaElement play/pause" virtual-console noise must be filtered in checks (scroll-cinema boots film state without IO). **Round 3 (same session, after "Na i need 5 more advanced ways"):** `previews/homepage-videos/` reorganised so the NEWEST set is always the front page — `index.html` = Round 3 (ways 11–15), `round2.html` = ways 6–10, `simple.html` = ways 1–5; every page cross-links the others in the scrollable topnav. Round 3 ways (all vanilla JS, house rules kept): **11 Film Highway** (320dvh pinned horizontal scroll-jack; ghosts parallax counter to track; skip button) · **12 Gold Thread** (scroll-drawn SVG stroke weaving between 4 films; getTotalLength guarded with 2400 fallback; films ignite as the tip passes) · **13 The Loupe** (single live video magnified 1.75× inside a 230px lens following cursor/thumb; only the lens stream plays; touch offsets −120px) · **14 Swipe Deck** (pointer-capture card physics, ±90px throw threshold, KEEP/NEXT stamps, endless reshuffle; only top card plays) · **15 The Channel** (maroon TV set, CH 1–4, scanlines, marquee; on leaving viewport the video element is appendChild'd into a fixed corner mini-player and keeps playing; IO undocks on return; ✕ respects closure). jsdom gate 18/18 (fling rotates order, chSet badge/marquee, FLIP from loupe tile). Recommendation recorded: 13 + 15, or 11 alone. **Round 4 (same session, "more 5 ways more graphically advanced + compatibility for both mobile and laptop"):** index.html is again the newest set (ways 16–20; round3.html holds 11–15). All five are dual-input (pointer events, touch-action:pan-y so vertical scroll stays free) and graphical: **16 Molten Gallery** (CSS morphing blob frames on staggered clocks + 34-orb bokeh canvas, DPR-capped 1.5, halves on phones) · **17 Revolving Case** (3D cylinder, drag inertia + magnetic snap; rapid arrow clicks QUEUE via base=snapTo||round(rot) — the stale-rot click-eating bug was caught by the gate and fixed; only front film plays) · **18 The Compare** (clip-path split screen, draggable gold seam clamped 8–92%, any-pair pickers with same-film bump) · **19 Kinetic Bands** (scroll-velocity-driven marquee tracks, duplicated spans, half-width wrap; REDUCED = static) · **20 Gold Dust Wall** (420/900-particle generative canvas, pointer vortex, twinkle, IO+visibility gated). jsdom gate 11/11 (canvas getContext returns null in jsdom — guard `cv.getContext?…:null` + filter HTMLCanvasElement noise in checks; band-span checks must count DIRECT children `.children.length`, phrases contain nested styled spans). **Twenty ways across four rounds; owner still has not picked.**
- **State:** awaiting owner's pick across all ten ways (R1 rec: 1 + 4; R2 rec: 6 + 10). Chosen way becomes v125 with full gates. Video delivery advice given: chat attach, or GitHub web upload (≤25 MB/file), or WhatsApp-compressed. Live preview server on :8080 (sandbox-only, not deployable).

## Session 2026-09-16 #2 (arena/01a0a845) — v124: Punach swap + New In face (owner-supplied photos)
- **Owner tasks, two:** (1) re-add the two doc lines the v123 session lost with its unpushed local-only commits — *merged as PR #48 `bfc3908`* + *owner live-verified 16 Sep, `sw.js` = `shivaa-shell-v123`* — and bump `docs/AGENT-HANDOFF.md` to a v123 baseline (commit `5ba446b`); (2) "edit the attached image and paste it in the punach title of category slider", widened in follow-up to a second photo "for new in jewellery".
- **Photo delivery:** the chat attachment never reached disk (announced at `/home/user/uploads/`, which did not exist); the owner uploaded both files to `main` instead (`2cadc34`: `ponchi-500x500.jpg` 500×333 — NOT square despite its name — and `e94d7c530ea31e50aeed8df7d9200fc0.jpg` 736×985). Merged `main` into the session branch before touching anything. **Lesson: before reporting "the attachment is missing", `git fetch origin` — an owner "Add files via upload" commit is a more reliable delivery channel than chat here.**
- **Done:** both photos AI-cleaned to a plain cream field (long prompts STILL return "Response contains no images" — 2 of 2 first attempts failed, the one-liner worked), finalised 420×420 q82 and cropped **centred on the trimmed content box** (fuzz-trim bbox → clamped crop offset) instead of the frame, so the round tile crop cannot clip the jewellery. Installed over `punach.jpg` (replacing v123's self-declared *forced leftover fit*; md5 before `a5fcfd5acd66b0edecb45e74e3d6be85`) and as the new `cms/images/categories/newin.jpg`. The New In chip no longer borrows `/images/products/mangalsutra-modern.jpg` — that product file stays on disk, just no longer used as category art.
- **v124 stamps:** triple 124 (`__SHIVAA_REL` / `APP_REL` / `shivaa-shell-v124`); 13 `?v=123` sites bumped **and the `'&v=123' : '?v=123'` branch of the tile URL builder too — a `?v=`-only sweep silently leaves that half at 123** (caught by grep, now asserted by the v124 gate). Media cache deliberately stays `shivaa-media-v120`: the `?v=` change already forces a refetch of the two files, so no phone loses its cached product photos.
- **Gates:** v113b 32 · v117 27 · v118 18 · v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · **v124 20 (new)** = 198/198 on source AND on the extracted `shivaa-update-v124.zip` overlay; php-sweep 211/0; `api.php`/`db.json`/`.htaccess` untouched, rates still 398-locked. v117–v123 extended with `|124` (house pattern) — note v120-check's `?v=12(0|3)` tile patterns also needed widening.
- **MERGED (recorded on `main`, not just the branch — the v123 lesson applied the same session):** PR **#49** → `5145ab2`, 16 Sep 2026. No owner live-verification of v124 exists yet; do not write one until the owner reports it (v123's line above is the pattern: "owner live-verified 16 Sep, `sw.js` = `shivaa-shell-v123`").
- **Honest limit:** nobody in this sandbox saw the two tiles — image reads return placeholders and there is no route to shivaa.in, so visual QA is the owner's (`present_file` was used to show the Punach tile). Programmatic substitutes recorded: 420×420 baseline JPEG, centre-band sd 24.4 (punach) / 18.2 (newin) against edge-band sd ≈ 8 → content centred, margins clean.

## Session 2026-09-16 (arena/01a0a7e6) — v123 category-photo refresh
- **Owner task:** "update those photos" on the homepage category slider; 17 owner photos supplied (14 attached + 3 already at repo root from the PR #47 upload). The 17 hash-named jpgs map 1:1 to the 17 CATS keys — that IS the "previous data" mapping.
- **Done:** every tile AI-edited from the owner's own photo (watermarks/ad text removed: NAKODA, MAHAKALI, nakodapayal, chhatralajewels, "Kada Payal"; jewellery identical), 420×420, installed over the 16 v113b placeholders + old rings photo in `cms/images/categories/`; each read back + QA'd. All six render sites + pre-boot v116 list `?v=120`→`?v=123`; handshake triple 123; SW `shivaa-shell-v123`. New `v123-check.js` 14/14; older suites forward-compatible. Rates LOCKED untouched; api.php/.htaccess/db.json not in the release. `shivaa-update-v123.zip` (22 files) + `DEPLOY-v123.md`; gates 178/178 + php-sweep 211/0; PR → main.
- **Mapping (for swaps):** rings 12747ae · necklaces de394b8 (floral V set) · earrings 94aa472 · bangles d1e2bb8 · bracelets 18da0318 · chains 98af24b · pendants 4f829c7 · mangalsutra e74d8a1 · bajubandh 921a4a7 · rakhdi d2cf594 · aad a040aef · sheeshphool c361740 · hathphool 3c38980 · punach b5aa894 (was the forced leftover fit — **swapped in v124 to the owner's `ponchi-500x500.jpg`, the kundan kada pair**) · bridalanklets 91c89e0 (ornate silver payal) · nosepins 57181fc · silver c7c3804 (plain kada payal). New In chip: `e94d7c530ea31e50aeed8df7d9200fc0.jpg` → `images/categories/newin.jpg` (v124).
- **MERGED + LIVE (re-added 16 Sep — this text lived only in two LOCAL-ONLY doc commits of the v123 session and was lost when that sandbox reset):** v123 **merged as PR #48 → `bfc3908`** on `main`, and the **owner live-verified it on 16 Sep — `sw.js` = `shivaa-shell-v123`** on https://shivaa.in. Both facts are now on `main`, so no later chat can treat v123 as unshipped. (PR #48 merge verified from GitHub — `mergedAt 2026-09-16T02:37:32Z`; the sw.js read is the **owner's** live confirmation — the sandbox has no route to shivaa.in, so it was not re-probed here.)
- **Lesson:** the image-edit endpoint returns empty responses on long prompts; short prompts succeed. Keep edit prompts one-liners.
- **Lesson (fourth time in this repo):** a doc commit that is never pushed does not exist — the merge/verification notes above had to be reconstructed. Commit AND push every turn.

## Session 2026-09-15 #6 (arena/01a0a5aa) — v119 live-verified + rates-blank & category-photo diagnosis + v120 planning
- **v119 is MERGED + LIVE (re-recorded here — the v119 session's doc commit was never pushed):** PR #45 merged to `main` as `e2a4dd5` (15 Sep 2026, 19:31 IST). Live read 20:48 IST: `/api/rates` → `premium.gold22 = 398`, `anchorLevel.mode = mcx-future`, `jaipur.gold22 = 14200` = `round(15056 × 0.9167) + 398`; every 22K piece **+₹343/g** vs v118; `/api/products` → all 22K rings ≈ ₹14,231/g, PGS5004 (3.83 g) = ₹62,877; `/sw.js` SHELL `shivaa-shell-v119`; `/js/v119.js` real JS → zip landed in `public_html` ROOT. Re-confirmed 20:54 IST: anchor 15040 → jaipur.gold22 14185 = `round(15040 × 0.9167) + 398` ✓. **OWNER DECISION LOCKED:** 22K premium ₹398 (desk physical) + the anchor formula — never change a rate factor without an explicit owner instruction.
- **Cron warning (not visible on GitHub):** the main-tracking auto-sync did NOT fire for PR #45 (live still v118 ~50 min post-merge); shipped by manual zip. Suspects for the server-side check: `~/.shivaa-sync.json` branch value (HANDOFF's old setup text still names a session branch — must be `main`), GitHub PAT expiry, cron daemon/logs. Never trust push-to-deploy until a merge is seen going live on its own.
- **main tip is `82dc23b`** (verified: exactly ONE added file vs `e2a4dd5`, zero `cms/` changes — v119 code intact): owner web-upload of `67 rings ladies plain hitesh bhai_compressed.pdf` (7 MB) → next catalogue batch intake (ladies' plain rings, supplier Hitesh). PR #43 + PR #38 closed UNMERGED this session (pre-v118 / stale; branches kept as archives).
- **Bug A (owner-reported, queued for v120): `#/rates` goes blank-white seconds after opening. ROOT CAUSE FOUND IN CODE:** every rates poll dispatches `rates` → the listener calls `pages.rates($('#view'))` (full `innerHTML` re-render) but never re-runs `bindReveal()`; the page's hero/cards carry `.rv` (`opacity: 0` until `.in` is added — `styles.css:531-532`), and `.in` is only added by `route()` at navigation time. So the first poll tick after opening strands every rate card invisible — permanently. Secondary damage: each tick also wipes the rate-alert form mid-typing. v120 fix design: stop full re-render on poll — update values in place (like `renderRateStrip`/`.js-price` already do); drop `rv` from live-data elements; new gate: dispatch `rates` twice in smoke → values update + zero `.rv`-without-`.in` + form input survives.
- **Bug B (owner-reported): category photos show on some phones, text-only on others. PRIME SUSPECT (needs owner confirmation): stale pre-v118 app.js on the failing phones** — the pre-v118 rail `<img>` had no `onerror` fallback + `loading="lazy"` and phone CSS hid rail images: a byte-exact match for "just font written there". Current code (safeUrl + eager + logo fallback, v118 forced-visible `.cb-img` CSS) is correct, and the 17 faces on the server are tiny (~12–26 KB). Asked owner for: which page, a screenshot, failing-vs-working phone details. v120 hardening regardless of cause: monogram tile-face UNDERLAY (a tile can never be text-only again), `?v=` on category imgs, MEDIA cache generation bump (drop pre-v113 poisoned entries from when the faces 404'd into the SPA fallback), audit fallback-less category `<img>` sites (e.g. search suggestions).
- **v120 feature menu proposed** (owner picks; the two bug fixes above are the headliners): (1) ladies' rings batch intake from the Hitesh PDF (photoshoot pipeline + catalogue — owner already started it); (2) WhatsApp rate alerts (make the rates-page alert form real); (3) old-gold exchange calculator; (4) Hindi language toggle; (5) making-charge chart page (dead `MAKING CHARGES PAGE` header — never implemented); (6) EMI display on PDP; (7) photo reviews push; (8) pincode delivery checker (owner-supplied list); (9) Dhanteras gifting push (gift-card page exists); (10) product image srcset/WebP (needs derivatives generated + deployed). Awaiting owner's pick.
- **Lesson (third time in this repo):** unpushed work does not exist. Commit + push every turn.

## Session 2026-09-15 #5 (arena/01a0a548) — v119: 22K premium ₹398 (desk physical) + published rate anchor + first-paint/mobile pack
- **Intake correction (important):** the handoff said v119 was coded, committed and gated on `arena/01a0a512-shivaa-ecom`. **It did not exist.** Verified exhaustively: every remote branch tip ≤ main's `72cfe1a` (the v118 Step-0 landing, PR #44), no `shivaa-update-v119.zip`, no `cms/DEPLOY-v119.md`, no `v119-check.js`, grep for `v119` matched only one line of `ARENA-STATE.md`. The sandbox was a fresh shallow clone — the previous session's 14 commits lived only in a sandbox that had reset. Owner chose **rebuild from the documented spec** + **both deploy routes**.
- **Rates (owner decision, LOCKED):** new `settings.gold22Premium` = **398** (desk physical; admin field + PUT whitelist 0–100 000). `api.php` gains `gold22_premium()` / `jaipur_from_anchor()` / `anchor_level()`; `/api/rates` publishes `premium.gold22` and `anchorLevel {mode, goldPerG, silverPerG, source, at, ageMs}` and derives `jaipur` from that single anchor: `round(anchorLevel.goldPerG × 0.9167) + 398`. 24K/18K keep `jaipurPremium` (55); admin override still wins. Master `db.json` + `migrate-repair.php` seed the key; `app.js` rate card shows the 22K premium + *Rate anchor* row; `v107.js` basis line quotes the 22K premium; `admin.js` exposes the field.
- **Real-PHP proof (new capability):** PHP 8.5.10 via `@php-wasm/cli` (npm works in this sandbox; GitHub release assets are blocked). Seeded an MCX tick (ltp 150840 → ₹15,084/g) and executed the real route: `premium.gold22=398`, `anchorLevel.mode=mcx-future`, `jaipur.gold22=14226` = round(15084×0.9167)+398 ✓, v118 baseline on the same data = 13883 → **+343/g** ✓; `spot` path → mode `spot` and the same formula; override → mode `override`; PGS5004 3.83 g priced 13,883 → **14,226/g** (total 61,340 → 62,855). `php -l` clean.
- **Feather pack (additive port — NOT a PR #43 merge, that branch is pre-v118):** skeleton in `<main id="view">` + `body.shv-ready` (9 s retry note), shop **slices** (20 cards, `#shopSentinel`, `Shivaa.shopLoadMore()`, no double-render, whole list reachable), **honest HUID chip** (real HUID only from `p.huid`/`hallmark.entries[].huid`; all 63 records are `not_provided` → *HUID check* guide), **install chip on the 2nd visit** (`beforeinstallprompt`, `shv_visits`/`shv_install_closed`, standalone-hidden), **pinch zoom** 1×–4× in Quick View (never swipes), hero preload, `enterkeyhint`, guarded brotli + `immutable ?v=` in `.htaccess` (**merge**, never blind-overwrite). PR #43's `srcset` skipped deliberately (no `-400/-800` files on the server → each card's `onerror` would blank).
- **Gates (all on source AND on the extracted zip overlay):** v113b **32/32** · v117 **27/27** · v118 **18/18** · **v119 27/27** · php-sweep **211/0**. `v118-check.js` was made forward-compatible (handshake/shell accept 118/119) exactly as v117-check had been.
- **Deliverable:** `shivaa-update-v119.zip` (10 files, root layout) + `cms/DEPLOY-v119.md` (upload steps, **.htaccess merge snippet**, live curl checks, 5-minute phone pass, rollback).
- **Lesson repeated (twice now in this repo):** work that is not pushed does not exist. Commit + push every turn; the sandbox resets between sessions.

## Session 2026-09-15 #4 (arena/01a0a48d) — v118 storefront repair — OWNER CONFIRMED WORKING
- **Request:** fix all four-photo product-page navigation; Quick View opening the full product page; category clicks producing a vanished/blank page; missing category thumbnails on phones; and Place Order leaving an endless PayU loading screen. Owner explicitly required reading handoff/memory first; done before editing.
- **PDP gallery:** retained every photo and replaced inert dot spans with accessible buttons. Added arrow/dot state, `aria-current`, pointer capture, lost-capture cleanup, vertical-vs-horizontal gesture intent, one-slide swipe threshold, GPU `translate3d`, 44px controls and stacking above zoom/lightbox layers. Vertical page scroll remains available.
- **Quick View root cause/fix:** v116 opened Quick View on `pointerup`; Android could deliver its synthetic final click to the product anchor beneath the newly opened overlay. Delegation now runs on captured final `click`, cancels navigation/propagation and debounces repeat taps. Existing API/list cache fallback remains.
- **Categories:** guarded stale/unknown category keys; validated category-link keys; same-current-hash taps call redraw explicitly. Populated categories render products; empty categories render the honest cataloguing state and route to available rings. No fake inventory was added. Category rail images use safe URL + eager load + async decode + logo fallback, with explicit phone visibility/sizing CSS.
- **PayU:** replaced fragile `form.submit()` with the native prototype call, current-tab target and HTTPS `*.payu.in` allowlist. The handoff no longer offers only a permanent spinner: it has Continue, five-second Try again recovery, and Return to my order. PayU server signing/verification, merchant configuration and financial data were untouched.
- **Version/cache:** release handshake 118; changed scripts cache-busted to 118; new `v118.css/js`; SW `shivaa-shell-v118` with exact precache parity.
- **Safety:** `db.json` unchanged; 65 PGS products preserved; all have four images; no weights/prices/customers/orders/uploads/credentials changed.
- **QA:** v113b 32/32, v117 27/27, v118 18/18; repeated against ZIP overlay; PHP 211/0; JS syntax and diff checks clean.
- **Delivery:** commit `0f699f8`, pushed branch `arena/01a0a48d-shivaa-ecom`; PR #41 opened; `shivaa-update-v118.zip` supplied with root-layout deploy files and `cms/DEPLOY-v118.md`.
- **Owner verification:** owner subsequently reported, “all the updates are very good and fixed.” Treat v118 as the forward baseline. Never revert these fixes in a later release.

## Session 2026-09-15 #3 (arena/01a0a44f) — v117: "slow site + hero buttons jump to the bottom of the page" (branch merged; v117 IS live)
- **Slider tap-jump = FOCUS SCROLL (root cause, verified in the v117 harness):** carousel is `tabindex=0`, arrows are real `<button>`s, dots delegate focus up — every tap made the browser scroll the page until the whole 430–600 px deck was in view. Fix: `pointerdown` → `preventDefault()` in `initCarousel()` (taps/clicks/swipes unaffected; Tab-focus still scrolls). Second: `aurum.css`'s `.c-arrow:active{transform:scale(.9)}` was REPLACING the arrow's `translateY(-50%)` while pressed (arrow visibly dropped); `css/v117.css` keeps the translate and adds the squash on top. Track now `translate3d` (GPU).
- **Speed boot-crit:** first paint was held by THREE serial network rounds (batch → `await loadRates()` → `await /api/pages`). Now ONE parallel batch, footer pages backgrounded, 6 s hard cap (quiet re-paint when a slow batch lands) + `js/v117.js` splash cap 6.5 s.
- **Fonts were the silent killer:** `css/fonts.css` = 354 KB render-blocking base64… and only THREE unique fonts (same woff2 embedded per declared weight). Now `/fonts/jost.woff2` (26 KB), `cormorant-garamond.woff2` (37 KB), `marcellus-400.woff2` (14 KB), file-based 2 KB fonts.css, all preloaded, swap. Regenerate: `python3 tools/fonts/extract_fonts.py`.
- **Defer layers:** hallmark/trust/motion/aurum/v107/boost CSS → preload-swap (+noscript); aurum/motion/boost JS → `js/v117.js` injects post-paint in order (`async=false`). ~310 KB of blocking front-end moved out of the first screen's way.
- **Mobile scroll:** `content-visibility:auto` on sections ≥5th + footer; phone GPU trims.
- Gates: v113b smoke 32/32 + new `tools/mega/smoke/v117-check.js` 27/27, both re-run on the built zip overlay. Zip: `shivaa-update-v117.zip` (10 files). SW → `shivaa-shell-v117`.

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
