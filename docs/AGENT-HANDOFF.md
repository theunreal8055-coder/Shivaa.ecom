# AGENT HANDOFF — v178 published, not live-verified (24 Sep 2026)

> **Current release: 178.** The v169 block below is history. Read the
> *CURRENT STATE — v178* section first, then the v177 record (now history),
> then the v176 record, then the v169 record, then the historical notes.
> **Forward only — never revert to an older release.**

## Deployment control update — owner approval required (22 Sep 2026)

PR #90 is merged at `2393a7949852b9bb1f16cdbfa8b138f83da8235e`; the owner
reports the Hostinger MySQL migration of 77 products succeeded. Live `/api/version`
last reported release **170**; the newest published package is **v178** (source commit `0c8cd29`). **Never deploy an older tree over a newer live site, and never deploy
anything without the owner's explicit yes.** Any next application release must
move forward from **179** and pass the anti-downgrade gate. Production deployment
is manual-only: ask the owner first, then use the approval-gated workflow from
`main`. Merges do not authorize deployment.
Credentials stay in GitHub Actions secrets, and the old Hostinger cron code writer
must be disabled (`deploy_code:false`). See `HOSTINGER-AUTO-DEPLOY.md`.

## CURRENT STATE — v179 in progress: bullion rates, the permanent fix (24 Sep 2026)

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
  `538ccebf4768706bef942435e0592c5b0a809619` (= local `git hash-object`);
  authenticated download byte-identical.
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

## CURRENT STATE — v177 published: the v176 rework, fixed (24 Sep 2026) — HISTORY, superseded as current by v178

**This section supersedes the v176 "CURRENT STATE" below for anything about
the current release.** v177 is the owner-requested *"make v176 again but
better, without bugs and errors"* — a forward release, not a reset: the same
seven files, the same owner flow, five v176 defects repaired and executed
PHP tests added that catch each one.

- **Branch / HEAD:** `arena/01a0d168-shivaa-ecom`, branched from `bc666f3`
  (PR #93 merge, which carried v171–v176 onto `main`). Commits this release:
  `a77dacf` (the five fixes + stamps + both v177 suites + builder) ·
  `29e2c0d` (builder assertion fix; the ZIP is built from this commit).
- **Latest download:**
  https://github.com/theunreal8055-coder/Shivaa.ecom/raw/557fb51c194f4acfbe08bd0f7e69e4660c4da0cf/shivaa-update-v177.zip
- **Archive:** 7 files, **427,896 bytes**, SHA-256
  `2c9fff1a8b39e186093e44ecac0980189e7ca783337be677e35d5bea6b35dec2`,
  built from source `29e2c0d86867acc73bb0c86da86bf5558c1329ee`, publication
  commit `557fb51c194f4acfbe08bd0f7e69e4660c4da0cf`.
  Deterministic (two runs, identical hash); every member byte-matches its
  committed `cms/` source. Remote-verified after push: contents API size
  427896 + blob `c9224cc8940220a42b095dd4bce84e144585f99c` (= local
  `git hash-object`), authenticated download byte-identical. Builder:
  `tools/mega/make-v177-zip.py`.
- **Stamps:** release **177** in lockstep (`__SHIVAA_REL=177`,
  `APP_REL = 177`, `SHELL='shivaa-shell-v177'`, `REL=177`, `'rel' => 177`),
  54 `?v=177` asset stamps in `index.html` + 49 in `sw.js`. MEDIA cache
  deliberately stays `shivaa-media-v168` (no media changed).
- **NOT deployed, NOT owner-installed, NOT live-verified.** The v176 ZIP and
  link remain unchanged and valid. The test-order purge has **not** been run
  anywhere — it is an owner action on his own server (and, unlike in v176,
  it can now actually complete).

### The five v176 defects, repaired

1. **The confirmed purge could never run.** The backup line called
   `json_encode()` with `JSON_UNESIGNED_SLASHES` / `JSON_UNESIGNED_UNICODE`
   — constants that do not exist in PHP. Every confirmed POST
   `/api/admin/purge-unpaid` threw *"Undefined constant"* and 500'd AFTER
   the owner typed the phrase: no backup, no delete, generic error. This is
   why a parser pass and a Python simulation can both be green while the
   feature is dead. v177 uses the real `JSON_UNESCAPED_*` pair;
   `v177-check.js` asserts the typo can never return.
2. **The preview ignored `?scope=`.** The UI previews via
   `GET …/purge-unpaid?scope=…`, but v176 read the scope only from the POST
   body, so every preview answered `unpaid`: "every order" selected showed a
   partial preview, the short phrase and no all-sales warning. v177 reads
   GET from the query and POST from the body; unknown values collapse to
   the safe `unpaid`.
3. **Same-second backups could overwrite each other**
   (`db-before-purge-<Ymd-His>.json` collision). The name is now made
   unique (numeric suffix) before writing; three same-second purges produce
   three distinct valid backups (executed test).
4. **The day book's COD tile read ₹0 forever** (creation-day filter +
   `order_money_received()` excluding COD until delivery). The cash book now
   counts money on the day it arrives, from the order's payment ledger:
   online/UPI rows on receipt day, a UPI proof on the day the owner approves
   it (`approvedAt`), COD on the day its row is written (cash in hand),
   pre-ledger legacy rows on `paidAt` then `createdAt`; cancelled excluded;
   no double counting. Tile renamed **"COD collected"**.
5. **Crash-proofing + an honest note.** `admin/stats` byDay could 500 on a
   legacy row without `createdAt` (PHP 8 undefined-key + `substr(null)`);
   the preview sample `TypeError`'d on a legacy scalar `address`; the audit
   line re-read the bearer mid-route (now uses `need_admin`'s result); the
   scope-`all` success note no longer claims "every paid order was
   untouched".

**Unchanged:** the money-received core (dashboard, reports and cash book
still count only money actually received), the phrases, backup-first
ordering, last-10 retention, and the scope: **only `db['orders']` is ever
spliced** — B2B and B2C customers, partners, products, settlements, reviews
and coupons are provably out of reach (the builder asserts it).

### What was verified, and what was NOT

**Verified (executed, on the shipped ZIP bytes as well as the working
tree):** `v177-php-run.js` **17/17** under PHP 8.3 — revenue trio on the
10-order book; preview scope honesty; refused phrases write nothing; the
safe delete removes exactly the 5 unpaid attempts with a full pre-purge
backup, byte-identical customers/partners/products and an audit line naming
the admin; `all` refuses the short phrase; same-second backup uniqueness;
retention trims to 10; legacy-row crash cases; COD cash only on collection
day; proof on approval day; legacy rows once; cancelled excluded;
`/api/version` 177 matched handshake. `v177-check.js` **11/11**. Full belt
**40 suites pass, 16 retired skip, 0 fail** (baseline before edits:
38/16/0). Prior gates on shipped bytes: v169 PHP 28/28, v169 pages 25/25,
v168 signatures 12/12. Static sweep 212 routes / 0 exceptions. `node
--check` on shipped JS. ZIP `testzip` + member match + deterministic hash.

**NOT verified — state this plainly:** no owner install; the live site is
unreachable from the sandbox; the purge itself has not been run anywhere;
no main merge, no Hostinger deployment, no real payment.

### Standing rules that still bind (do not lose these)

- **FORWARD ONLY.** v176 and v177 are both shipped; new work is targeted
  forward commits. Never reset/revert, restore an old ZIP, force-push or
  rewrite history. **Next release is 178+.**
- Owner-approved **manual deploys only.** A push/merge is not deployment
  approval. Nothing here was deployed.
- **Never hand-edit `cms/data/db.json`.** "Delete the data" requests get a
  guarded server-side tool, never a file edit.
- **Never swap `sw.js` alone.** Index, app, worker, API release and every
  asset URL move coherently.
- B2B and B2C customers are explicitly out of scope for any sales cleanup.

## CURRENT STATE — v176 published; failed payments are no longer sales (23 Sep 2026)

> **Historical record — the current release is v177.** See the
> *CURRENT STATE — v177* section above and `DEPLOY-v177.md`. The v176
> release stays shipped; its ZIP/link are unchanged. Two of v176's defects
> (the undefined-JSON-constant purge 500 and the scope-blind preview) are
> recorded above and fixed in v177 — read v176's "NOT verified" list with
> that in mind.

**This section supersedes the v169 "Final verified state" below for anything
about the current release.** v170–v176 were delivered after that record; the
v169 section stays as history, not as a restore instruction.

- **Branch / HEAD:** `arena/01a0cd08-shivaa-ecom` → `64c46a9d2a97f20bccf377be6494dc0d8f5362d0`.
  Commits this release: `a1e2698` (the fix + purge + UI + stamps) ·
  `212d9d0` (sw.js changelog comment de-hardened from a literal `?v=175`) ·
  `64c46a9` (ZIP rebuilt from the final tree — the earlier blob was 3 bytes
  stale, caught by comparing the GitHub blob size to the local file).
- **Latest download:**
  https://github.com/theunreal8055-coder/Shivaa.ecom/raw/64c46a9d2a97f20bccf377be6494dc0d8f5362d0/shivaa-update-v176.zip
- **Archive:** 7 files, **426,252 bytes**, SHA-256
  `ca53b8b9df9662435f4880b7d3bead8e2132ac1017f3cecc956c550cd6f72674`.
  GitHub blob `1b91023bebfa033f83886c2ccd77e1f3ee73c3a1` remotely verified
  (size + `git hash-object` both match local). Build is deterministic — two
  runs produced the identical hash. Builder: `tools/mega/make-v176-zip.py`.
- **Files:** `api.php`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`,
  `css/v175.css`, `css/v174.css` (cumulative v171→v176). Installing v176 alone
  on a v165+ site delivers all six. No data / uploads / credentials / media /
  host `.htaccess` in the archive.
- **Stamps:** release **176** in lockstep (`__SHIVAA_REL`, `APP_REL`,
  `SHELL='shivaa-shell-v176'`, `REL=176`, `'rel' => 176`), 54 `?v=176` asset
  stamps in `index.html` + 49 in `sw.js`. MEDIA cache deliberately stays
  `shivaa-media-v168` (no media changed).
- **NOT deployed, NOT owner-installed, NOT live-verified.** Do not record it as
  live until the owner reports extracting the zip and re-checking the dashboard.

### The defect — why a failed payment was reported as a sale

Owner report, verbatim: *"how can you show sales even if the payment is failed"*.

**A Cashfree payment that fails, is dropped at the bank page, or is never
completed NEVER marks the order Failed.** `cashfree_apply()` writes the failure
to `cfLastFailure` and leaves `paymentStatus` exactly where order creation put
it: `Awaiting payment`. The row stays in `db['orders']` with a live fulfilment
status, so nothing about it looks wrong.

Three admin endpoints then computed revenue from **fulfilment status alone**:

| endpoint | the old line |
|---|---|
| `admin/stats` (dashboard) | `$rev = array_sum(array_column($liveOrders,'total'));` |
| `admin/reports` (GST/CA pack) | `$revenue += (int)($o['total'] ?? 0);` |
| `admin/cashbook` (day book) | `$orderSales += (int)($o['total'] ?? 0);` |

Each filtered `($o['status'] ?? '') !== 'Cancelled'` and **never read
`paymentStatus`**. So every gateway test the owner ran while deploying Cashfree
was summed into revenue, AOV and the daily chart at its **full order total**.
Measured on a synthetic order book shaped like the owner's: **56% of the
reported revenue was money that never arrived.**

**The fix — one definition, three call sites.** New helpers in `api.php`:
`order_money_received()` (Paid → `total`; Partially paid → `amountPaid` clamped
to `total`; everything else → 0), `order_is_paid_sale()`,
`order_is_unpaid_attempt()`. COD is excluded too — that money is still in the
customer's pocket until delivery. Order **count** still reports every order
placed, and `paidOrders` / `unpaidOrders` are now returned so the dashboard
shows the split instead of hiding it. The Overview card surfaces the
unpaid-attempt count next to revenue.

### The purge — one admin action, backup first, customers untouchable

The owner also asked for the data itself gone. **The live data could NOT be
deleted from this workspace:** `cms/data/db.json` here is a snapshot with
`orders: []` — the test sales exist only on the Hostinger server — and house law
forbids hand-editing the live DB. So the tool ships **on the dashboard**
(Orders tab, top card) and runs on the server with the owner's own credentials.

- `GET /api/admin/purge-unpaid` — **dry-run preview only, writes nothing.**
  Returns total orders, would-delete, would-keep, value removed, a breakdown by
  `paymentStatus` and by `paymentMethod`, and the first 25 rows.
- `POST /api/admin/purge-unpaid` — the real delete, **only** with the exact
  confirmation phrase. `scope:'unpaid'` (default, safe) needs `DELETE UNPAID`;
  `scope:'all'` (a full sales reset) needs the longer `DELETE ALL SALES` so a
  stray click cannot reach it.
- **Before a single row is removed** the FULL database is written to
  `data/backups/db-before-purge-<timestamp>.json` (web-denied by `.htaccess`),
  the last 10 such backups are retained, and the action is audit-logged as
  `sales.purge-unpaid`. If the backup write fails the purge aborts with 500 and
  deletes nothing.
- **Only `db['orders']` is ever spliced.** `users` (B2B + B2C), `partners`,
  `products`, `settlements`, `reviews`, `coupons` and `catalogs` are provably
  out of reach — the release builder **asserts** those keys do not appear in the
  purge route's block. Paid / Partially paid / COD / Refunded orders survive,
  because that money is real.
- Logic verified by simulation before shipping: a 10-row book (2 failed
  gateway tests, 2 paid, 1 COD, 1 WhatsApp, 1 proof-submitted, 1 partial, 1
  refunded, 1 cancelled) → 5 unpaid attempts removed, 5 paid/COD/refunded kept,
  all 3 customer rows and the partner record byte-identical.

### What was verified, and what was NOT

**Verified:** `php-parser` clean on `api.php` (139 statements) · `node --check`
clean on `js/admin.js` and `js/app.js`, on the **shipped zip bytes** not just
the working tree · the revenue + purge logic simulated in Python with
assertions on every paymentStatus value · the builder asserts all cumulative
prior repairs (v171–v175) plus the new v176 invariants · no `?v=175` leftovers
anywhere · ZIP integrity (`testzip`, namelist, byte-for-byte member match) ·
remote blob size and git-hash equal to local.

**NOT verified — state this plainly, do not upgrade it:**
- **No PHP binary in this sandbox. `api.php` was never executed.** A parser
  pass is not a run. The purge endpoint and the three revenue sites have had no
  runtime test.
- **No browser/jsdom test of the new admin card.** The UI was syntax-checked
  only.
- **The smoke suite was not re-run for v176** and no v176 suite was added.
- **The test-order purge has NOT happened.** It is an owner action: install
  v176, open Orders → *Clear the failed-payment test orders* → Preview → type
  the phrase. Until he does, the inflated figures remain in the live dashboard
  and the owner should read them with that in mind.
- Live site unreachable from the sandbox; nothing here is live-verified.

### Standing rules that still bind (do not lose these)

- **FORWARD ONLY.** Preserve v176 and its tests; new work is targeted forward
  commits. Never reset/revert to an older release, restore an old ZIP,
  force-push this branch, or rewrite history. Next release is **177+**.
- Owner-approved **manual deploys only**. A push/merge is not deployment
  approval. Nothing here was deployed.
- **Never hand-edit `cms/data/db.json`.** This collided with the owner's
  "delete all the sales data" and was resolved by shipping a server-side,
  backup-first admin tool instead of touching the file — record that choice,
  do not silently "fix" the collision the other way next time.
- **Never swap `sw.js` alone.** Index, app, worker, API release and every asset
  URL move coherently.
- B2B and B2C customers are explicitly out of scope for any sales cleanup.

## ~~Final verified state~~ — v169, SUPERSEDED by v176 (21 Sep 2026)

> **Historical record. The current release is v176 — read the *CURRENT STATE —
> v176* section at the top of this file and `DEPLOY-v176.md` instead.**
> Do not restore or re-point anything to v169.

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


**Owner:** Shivaa Jewellers (shivaa.in), non-technical. Talk plainly, no jargon
dumps. **Repo = single source of truth.** Live site = PHP CMS in `cms/`
(v37) + JSON db on Hostinger; batch automation in `pipeline/`; current batch
workspace pattern `demo65/` (one folder per supplier batch).

## Historical — v159 10g GOLD BISCUIT CAMPAIGN FUNNEL & CURATED 6 STUDS (20 Sep 2026, branch `arena/01a0bf5c-shivaa-ecom`)

### What Was Delivered in v157 → v158 → v159:
1. **Curated 6 Studs 10g Gold Biscuit Funnel (`#/scheme`, `#/finale`):**
   - 3 Men's 22K Gold Studs (`p_stud_m1` Shivaa Rudra, `p_stud_m2` Shivaa Veer, `p_stud_m3` Shivaa Surya).
   - 3 Women's 22K Gold Studs (`p_stud_w1` Shivaa Mayura, `p_stud_w2` Shivaa Chandrika, `p_stud_w3` Shivaa Tara).
   - Dynamic 22K live pricing with 12% making charge and 3% GST.

2. **1-Click Direct Cashfree Checkout & Failure/Cancel Fallback:**
   - Clicking **"⚡ Buy Now"** on any of the 6 studs immediately creates the order and opens Cashfree hosted checkout directly.
   - If payment succeeds: directs immediately to the **1-Attempt CA-Witnessed Quiz** (`#/scheme?step=quiz&orderId=...`).
   - If payment is cancelled, dismissed, or fails: directs immediately back to the **Ear Studs Showcase page** (`#/scheme?step=products&gender=...`) for instant retry with friendly notification, never dropping customers to the homepage.

3. **Strict 1-Attempt Post-Payment Quiz Engine:**
   - Backend endpoint `/api/finale/submit` verifies paid qualifying order via order PIN or user session.
   - Strictly enforces 1 attempt per order/buyer; records score in the cryptographic CA audit ledger and issues an official Certificate of Entry.

4. **Aura AI Voice Assistant — Pure Conversational Hindi:**
   - Warm, polite Indian hospitality dialogues (*"नमस्ते जी! आपका शिवा में हार्दिक स्वागत है..."*).
   - `hi-IN` speech synthesis (`Swara`, `Lekha`, `Neerja`) with soothing cadence (`rate: 0.90`, `pitch: 1.12`).
   - Animated sound equalizer wave visualizer and tap-to-listen button.

5. **Full Mobile Optimization:**
   - Horizontally scrollable 5-step stepper bar with smooth touch momentum and zero line-wrapping.
   - Touch targets enlarged to 48px+ for easy single-thumb reach.
   - Top festive ribbon completely removed from website header as requested.
   - Responsive `clamp()` typography and 1-column layouts for `< 768px` and `< 480px`.

6. **Release Package:**
   - `shivaa-update-v159.zip` (14 files, root layout into `public_html/`).
   - Version stamps synchronized to `159` across `index.html`, `sw.js`, `app.js`, `finale.css`, and `api.php`.

**Owner:** Shivaa Jewellers (shivaa.in), non-technical. Talk plainly, no jargon
dumps. **Repo = single source of truth.** Live site = PHP CMS in `cms/`
(v37) + JSON db on Hostinger; batch automation in `pipeline/`; current batch
workspace pattern `demo65/` (one folder per supplier batch).

## Historical — LAUNCH FILM (20 Sep 2026, branch `arena/01a0ba75-shivaa-ecom`, **PR #78 merging to main on owner order**)

Not a CMS release. **Do not bump storefront stamps.** Storefront on main is **v156**; this session did not edit cms/.

| What | Where |
|---|---|
| Owner studio VO (approved; **never clone**) | `launch/voice-studio/Shivaa-Trailer-VOICE-studio.mp3` (~2:39) |
| 20×8s Omni prompts (picture+SFX, VO-timed) | `launch/OMNI-8s-PROMPTS.md` |
| Presenter prompts (same Hindi, female employee speaks) | `launch/OMNI-8s-PROMPTS-PRESENTER.md` |
| 64s mass-film prompts (**new** script, logo SHIVAA) | `launch/OMNI-60s-MASS-TRAILER.md` |
| Joined presenter master | `launch/out/Shivaa-Jewels-Launch-Trailer-PRESENTER.mp4` (~2:40) |
| Joined mass master | `launch/out/Shivaa-Jewels-Launch-Trailer-60s-MASS.mp4` (~64s) |

**Laws for the next agent**
- Do **not** clone the owner’s voice. Do **not** mux the studio MP3 onto Omni presenter/mass audio.
- Talking-head + screencast were **never uploaded** — do not fabricate.
- 9:16 crop-paste into 16:9 was **rejected**. Full-bleed 16:9 only.
- Omni 8s clips **do not share faces/score**. Concat feels disconnected; unity needs **extend + last frame + character stills + one music bed**.
- Never write Jaipur. Brand **Shivaa Jewels / shivaa.in**.
- PR #78 merging on owner order (large MP4s).

## v151 THE PROFILE AUDIT (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, **UNDEPLOYED — owner extracts `shivaa-update-v151.zip`, md5 `8f827df579540391088b86616b265ec9`, into `public_html/cms/`**)
The owner reported the hiccup "still there" — the live v150 doctor showed the opposite: the fetch now hits /v1/default and Truecaller returns a REAL profile. The profile is the shop's OWN business account (name "SHIVAA JEWELS Pvt Ltd", one landline-shaped phoneNumbers entry) because the owner's test phone is signed into Truecaller as the business; no mobile exists there, and the checkout (server + all seven page gates) requires a 10-digit [6-9] mobile — rejection is CORRECT behavior, not a bug. What is still unknown after that: real customers' taps may already work, OR the console may serve the developer profile to every consent (test mode). v151 = api.php-only tc_profile_audit: 'who=<name initials> p=<mobile|landline|short|odd>:<count>[ business]' — privacy-safe by construction (no digits, initials only, 59-node budget) — stored on EVERY consent/refetch outcome and exposed as NEW public key lastProfile on /api/auth/truecaller/config. ONE tap from a second personal-Truecaller phone then decides everything: same who= twice = fix it in the Truecaller console (not code); different who= with p=mobile:1 = customer flow works TODAY. QA: 17/17 static + 11/11 EXECUTED (the live business body audits to who=SP p=landline:1 business verbatim) + full regression on source AND the main+v147..v151 overlay incl. v125; page byte-identical except stamps (151 lockstep; admin loader frozen ?v=147). Rollback = v150 zip 94c5928…

## v150 TRUECALLER ENDPOINT NORMALISATION + SELF-REPORTING DOCTOR (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, **UNDEPLOYED — owner extracts `shivaa-update-v150.zip`, md5 `94c592867c2373519d9ea640f7f6713f`, into `public_html/cms/`**)
The owner confirmed v149's one-tap works live (tap → Truecaller sheet, no page) but the number read still hiccuped. The LIVE DOCTOR found the root: HTTP 200 + valid JSON with zero digits = the fetch hit the BARE PROFILE HOST; the documented endpoint is that host + `/v1/default`. v150 = cms/api.php ONLY (page byte-identical to v149 — the verified flow cannot regress): tc_norm_endpoint normalises bare/root URLs to `/v1/default` BEFORE allowlist+fetch (real paths/queries untouched, junk still refused); the GET sends a compatible UA and follows ≤2 redirects; failures log lastEp + a digit-masked, token-masked body snippet in the PUBLIC doctor (one tap = the whole story, no ssh); JSON-inside-a-string payloads parse; the refetch keeps its own lastRefetchError so consent evidence survives. QA: 16/16 static + 11/11 EXECUTED via php-wasm (it caught a real #-delimiter bug every static gate accepted — shipped regexes now require run-cases); legacy suites v117–v124/v140–v142 stamp pins converted to numeric FLOORS — the last release any stamp bump can break them; 19 legacy + patience + instant + autobuy + php-run all green on source and on a fresh main+v147..v150-zip overlay incl. v125 owner-lock. Verify live: api/health "release":150, config shows lastEp; rollback = v149 zip 7b4b089…

**Status at session close (19 Sep):** commits `be2c57c` → `3c0cf59` → `589c34a` pushed on the branch; every suite green on source and on the rebuilt overlay (122/122 static + 11/11 executed, incl. v125 owner-lock); owner handed the root cause, the deploy plan and the standing deal that ONE `api/auth/truecaller/config` fetch explains any residual hiccup (lastEp + [keys:] + masked snippet). PR #74 OPEN, unmerged, on the owner's word. **If you are the next agent: read the ▶ NEXT-CHAT PLAYBOOK in ARENA-STATE.md §1 first — it encodes the deploy-confirmed path, the residual-hiccup diagnosis path, and the full release ritual (stamps, suites, overlay rebuild, zip-from-HEAD).**

## v149 INSTANT ONE-TAP + SELF-HEALING PROFILE READ (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, **UNDEPLOYED — owner extracts `shivaa-update-v149.zip` (md5 `7b4b08912fe874ea6b153b8323b9361d`, 4 files) when he says so**)
The owner's live test of v148 said two things and both are answered here. **(1) The hiccup:** "Truecaller confirmed you, but reading the number hiccuped" — and the LIVE doctor caught the exact cause: `lastOk:0, lastError:"profile had no Indian mobile number"`. Truecaller HAD confirmed; our server fetched a 200 profile whose number sat under a shape v148's reader never checked. v149 replaces the two-key lookup with `tc_profile_extract` — a bounded deep walk (nesting, `data:{}`, `phoneNumbers[]`, `msisdn`, `+91 0…`, `00-91`…) plus a callback-BODY fallback, and adds a **server-side second look**: failed entries keep the still-valid token (`tk`/`ep`, file 0600) and a new public `auth/truecaller/refetch` (12 s throttle) re-reads OUR side BEFORE the customer is ever asked to re-tap. The doctor's `lastError` now also logs the profile's key names, so any future gap is diagnosed by one live tap. **(2) The flow:** "why do you even open this page … they should directly go to cashfree … only on that page". Hard truth: Cashfree's checkout page belongs to Cashfree — no third-party script can run on it, so Truecaller cannot live there; what v149 does instead is REMOVE every intermediate page: tapping **Make It Yours** or the cart's **Proceed to Checkout** (data-tcinstant ×3, upgraded only on Android+Truecaller with a warm config cache) fires the deep link IN PLACE behind a floating pill; the verified number answers from OUR server, the guest order is placed silently (boundary address + tcNonce) and the first page the customer loads is Cashfree. Rejected/failed/timeout hands off to the Express page with the SAME nonce re-attached (v148's card + typed fallback untouched), and an Android tab reclaimed mid-round-trip RESUMES at boot. QA: `v149-check.js` 31/31, `v149-php-run.js` 12/12 (the reader EXECUTED on eight real-world shapes — it caught a 14-digit `0091` prefix off-by-one, fixed), `v149-tc-instant.js` 20/20 (in-place buy · refetch rescue buys WITHOUT a re-tap · named desktop control = v148 behaviour · resume completes on the same nonce); ALL 19 legacy suites + patience 16/16 + autobuy 14/14 + pay-audit 10/10 green on source and on the stacked overlay main+v147+v148+v149. Stamps 149×4; admin loader stays ?v=147 (admin.js untouched). **v148 suite maintenance:** the clock-compression hook is now `/g` (two engines) and the stamp/terminal-state pins are numeric/shape-insensitive — keep new gates fix-forward like this.

## v148 TRUECALLER PATIENCE (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, **✅ LIVE — owner extracted the zip; agent live-verified the sw.js v148 stamp on www.shivaa.in**)

**Owner's live-test report, verbatim (19 Sep, after extracting v147):** *"…when I click verify with Truecaller then it is shows my number and when I click on that number … it tells me that Truecaller is open tap continue on your number this page does the rest and nothing happens … when I manually enter my number and click on make it yours then the cash free payment gateway opens that means Truecaller is not still working."*

**Diagnosis (not a guess — the live doctor proved it):** Truecaller's consent POST reached `shivaa.in` and was stored (`lastKind=consent`, 13:48:40 IST — minutes after the tap). The page had stopped polling at ~40 s (v147's hard `polls >= 55 → fallback`). Consent arriving late = silently wasted. The order/Cashfree path was never at fault.

**The repair (v148, all gated):**
* patient watch: 40 s at 700 ms, then 3.5 s polls to a 9-min deadline (Truecaller's own TTL is 10); the typed-number hint appears mid-wait **without** killing the auto-continue — a minute-8 number still fills itself, places the order and opens Cashfree by itself;
* leaving One-Tap Buy mid-wait stops the poll (no hijack) and coming back RE-ARMS from the still-fresh pending nonce (window 3→9 min, item restore matches);
* a server-side profile-read failure now stores a terminal `failed` state and the page SAYS SO with a fresh-nonce "Try Truecaller again" instead of spinning;
* api.php: profile-endpoint allowlist accepts real reply shapes (`?query`, bare `truecaller.com`) with identical strictness otherwise; config doctor exposes `lastOk` + sanitized `lastError`;
* every poll respects `placed` — no double-buy races.
* QA: NEW `v148-tc-patience.js` **16/16** jsdom (incl. NAMED CONTROL reproducing v147's give-up → places NOTHING) · `v147-php-run.js` **20/20** real PHP (4 new cases) · all 18 historical suites green on source AND on the v147-live+v148-zip overlay · **historical stamp pins converted to numeric/range — never re-pin**.
* Deploy = `DEPLOY-v148.md` (4 files, back up v147 copies first; test = the SAME tap flow the owner tried, now with minutes of slack). Rollback = restore the four v147 files.

## ✅ v147 TRUECALLER ONE TAP → STRAIGHT TO CASHFREE (19 Sep 2026, branch `arena/01a0b86b-shivaa-ecom`, tip `3e8d8b9`, **✅ LIVE — owner extracted 19 Sep; verified on-site; PR #74 still OPEN**)

**Owner ask, verbatim:** *"now the only issue is after Verify with Truecaller and Continue in the Truecaller app it is still asking the customer to type the 10 digit number … automatically truecaller take the customer to the cashfree page with prefill address in one click of Truecaller."*

**How it works after v147:** tap *Continue in the Truecaller app* → approve in the app → back in the browser the phone field **fills itself** (Truecaller's servers POST the verified number to our callback) and the order + Cashfree checkout **open by themselves**, address pre-filled. **Zero typing.** Typing survives only as fallback (no app installed / "Not now" / a host that swallows the POST).

| Piece | Where |
|---|---|
| Callback honours all 3 Truecaller messages (`flow_invoked` / consent / `user_rejected`); answers 2xx BEFORE the profile fetch; atomic per-nonce store + diagnostics | `cms/api.php` (`shv_tc_entry_*`, `auth/truecaller/callback`) |
| Verified phone **overrides** typed phone server-side; order tagged `truecaller:verified`; SSRF allowlist on the profile endpoint | `cms/api.php` (`POST /api/orders` tcNonce block) |
| One shared `doBuy()`; auto-wait poll + auto-fire; nonce/item survive tab-reload (localStorage); per-device phone memory | `cms/js/app.js` (`pages.express` + Truecaller widget) |
| Callback URL printed for the console + "Check Truecaller connection" doctor (`dataWritable`, `lastCallbackAt/lastKind`) | `cms/js/admin.js` (Payments → Truecaller) |
| Stamps 147/147/147 in lockstep; sw.js deliberately in the zip (same-version pair); v116.js stays `?v=142` | `cms/index.html`, `cms/sw.js`, `cms/js/app.js` |

**QA — the big one:** `@php-wasm/node` now **EXECUTES the real api.php** in this sandbox (`tools/mega/smoke/v147-php-run.js`, 16/16 — it was never just parsed before; the old "no PHP binary" wall was a usage bug: set `emscriptenOptions.processId` when creating the PHP instance). Plus `v147-tc-autobuy.js` (14/14): a jsdom boot of the real storefront shell proving one tap → order placed with NOTHING typed → Cashfree hand-off, with a named regression control. All historical suites green on source AND on the **zip overlay**.

**Deploy:** `DEPLOY-v147.md`. Step 0 backup, 5 files into `public_html` ROOT, then **set the Truecaller console Callback URL** — without it the number never arrives and the page falls back to typing (today's behaviour). After deploy: phone test + admin doctor check. Rollback: restore v146 backups (`shivaa-update-v146.zip`).

**Things the next agent must not get wrong**
- **The Callback URL lives in Truecaller's console, not in our code.** Admin → Payments prints the exact string; developer.truecaller.com must match it.
- `lastCallbackAt` empty after a live tap = Truecaller's POST never reached the host (server-side block) — typed fallback still works; this is diagnostic, not a code bug.
- First-time numbers may still quick-verify **on Cashfree's own page** — Cashfree's rule, never promise around it.
- Desktop = web-popup flow = no push-back by design; typed entry stays there.
- `cms/data/tc-verify/` must stay writable (admin doctor shows `dataWritable`); callback route is lockless — **never add db_save() there**.

## Historical — v142 AUTOMATIC GUEST CHECKOUT (18 Sep 2026, branch `arena/01a0b3ff-shivaa-ecom`, **MERGED TO `main` AS PR #71** on the owner's instruction "update memory doc handoff and agent doc and merge the PR". Ships v140 → v141 → v142.)

**Owner brief, verbatim:** *"Make the most advanced and Fully automatic checkout, without even otp, still verifying the name number address and payment methods automatically — once a person clicks make it yours then it's automatically purchased, just the customer needs to fill their UPI pin or NetBanking password, everything else is automated."*

**How it works (switch ON, signed-out visitor):** tap **Make It Yours** → order placed instantly → browser goes **straight to Cashfree's page** → Cashfree auto-verifies name / number / address from its One Click Checkout registry and shows the saved payment method → the customer types **only** their UPI PIN / net-banking password → done. **Ships OFF by default** (Admin → Settings → Payments → "⚡ Automatic Guest Checkout (One-Tap Buy)"); untick = instant rollback, no migration.

### What shipped (all gated OFF until the owner switches it on)
| Piece | Where |
|---|---|
| one-tap buy page + hand-off to Cashfree | `cms/js/app.js` (`pdBuy` → `pages.express` → `payForOrder`), signed-out only |
| guest order gate + one-way access PIN | `cms/api.php` (id always `'guest'`; PIN = `substr(sha256(id\|createdAt\|entropy),0,16)`, never persisted, constant-time) |
| **prepaid-only, server-enforced** | `cms/api.php` — `if (!$u && $pm !== 'Online') jout(400,…)` kills crafted COD/WhatsApp |
| per-order gateway-session cap (3 guest / 12 member) | `cms/api.php` (`shv_cap_cf_create`) |
| admin switch + Cashfree-verified address on dispatch/invoice | `cms/js/admin.js` (prefers `o.cfCheckout.shipping`, badged) |
| release triple re-stamp 141→142 (v116/v117 lockstep) + admin bundle `?v=142` | `cms/index.html`, `cms/js/app.js`, `cms/sw.js` |

### Verification (all run before the PR opened)
13 gate suites (v113b 32/32 … **v142 13/13**) · php-sweep **208 routes · 0 exceptions** · `api.php` parse-clean vs a **proven broken negative control** · pay-audit **10/10 invariants** (2/18 pre-existing findings unchanged) · jsdom end-to-end (PDP → Make It Yours → One-Tap Buy → guest order → poller) **zero errors**.

### Deploy → rollback
`shivaa-update-v142.zip` (md5 `87f56fb46b63af6a4b793ca95abad6a9`, 6 files) into `public_html` ROOT. Rollback = untick the switch (or redeploy the prior `shivaa-update-v141.zip`). Supersedes v140/v141 zips.

### Things the next agent must not get wrong
- **A live Cashfree sandbox ₹1 order is STILL OWED** — no PHP binary in the sandbox; the path is parse-checked + jsdom-exercised only. `cfOcc` ships OFF.
- **A brand-new number must verify ONCE on Cashfree's own page** — that is Cashfree's security rule, not a site limitation. Do not promise "zero OTP for every number ever".
- **Never print the Cashfree secret** — it belongs only in the admin settings.
- Guests can NEVER use member coupons / loyalty points / rate lock, and no account is created (id stays `'guest'`).

## Historical — v139 SHOP-EXPERIENCE PASS (18 Sep 2026, branch `arena/01a0b366-shivaa-ecom`, **MERGED TO `main` AS PR #70** — the owner's hold *"don't merge the PR until you are told to do so"* was **lifted** at session close with *"perge this PR to main"*, so the merge is authorised and spent. Merged forward-only as a merge commit per owner law.)

**Owner's five reports, verbatim:** *"the check out button doesn't work and
doesn't take us to the payment page"* · *"when you click on any category and go
to that category page then still that 17 photos are on the page the images are
only there"* · *"place order button is always there on the screen in the phone
… place order button should be down"* · *"I have selected the one tab quick
check out button from the cash free but I cannot see … that the information is
pre filled or the addresses are prefilled or the numbers are automatically
verified"* · *"the update popup that keeps coming on the page is not needed"*.

**The fifth one was two popups, not one** — `app.js`'s "New version available ·
Update now" toast with its `confirm()`, and `js/v107.js`'s "Update available ·
Reload / Dismiss" prompt that came back **every 30 minutes**. Both **deleted**,
not restyled: a service-worker update now installs silently, waits for
`visibilitychange` → *hidden*, and swaps then — and a form-safety check means a
filled checkout/payment/login form is **never** reloaded over. `js/v107.js`
therefore ships in the zip **even though the release number did not move**,
because its bytes changed and its `?v=139` had never been served to anybody yet.
**That exception is valid only for an undeployed release** — on a deployed one
the immutable-`?v=` rule wins and every changed file's stamp must be bumped.

**Every one was reproduced and measured before it was fixed** — the probes are
kept in the repo: `tools/mega/smoke/probe-owner-issues.js` and
`probe-control-timing.js`.

### The lesson this release adds to the standing list

**A tap that looks dead is usually a tap being out-raced — and the same defect
can live in every overlay, not just the two you fixed.** v127 removed the
dismiss-first `history.back()` race from `#mainNav` and `#searchSugg` and was
recorded as complete. The bag drawer (`#cartDrawer`) had the identical wiring
and was never in scope, so the shop's **most important button** stayed broken
for two releases. Measured event order before the fix:

```
history.back() @hash=#/      ← queued while the URL is still the page you came from
popstate @hash=#/checkout
hashchange -> #/checkout     backs=1
```

**Standing review question #2 for this codebase** (alongside *"what happens to
it if the purchase never completes?"*): **every** overlay that pushes a history
entry — modal, bag, search, menu, PDF — must be asked *"who owns a tap on a link
inside me?"*. If the answer is "the browser's default action", it is a bug
waiting for the traversal to win.

### What shipped

| Fix | Where |
|---|---|
| the bag drawer owns its own taps (navigate → arm `__shvNavigating` → close) | **new `cms/js/v139.js`**, capture phase, loaded last |
| a filtered category page renders a text chip strip, not 20 photographs | `catChipsHTML()` + the `filtered` branch in `pages.shop` |
| the drawer's 17-category list folds shut on navigation | `foldCatList()` in `js/v139.js` |
| the payment page's Place Order bar joins the page flow | `mcta-inline` + `css/v139.css` (`position: static`) |
| Cashfree One Click Checkout: `products.one_click_checkout` + `cart_details` + Get Order Extended | `cashfree_occ_block()` / `cashfree_fetch_order_extended()` / `cashfree_occ_capture()` in `cms/api.php`, switches in `cms/js/admin.js` |
| the shop's own address prefill (the half Cashfree can never do) | `pages.checkout` reads the v84 address book, chips, `shv_lastAddr`, "save this address" |

### 5 · the endless "update" popup (the owner's follow-up message)

*"it says update, when we press update it again pops up and says update, i don't
want these popups of update to be shown, website should be updated automatically
from back-end."* There were **two** popups — `js/app.js`'s `#swUpdate` (*"A newer,
better Shivaa is ready"*) and `js/v107.js`'s `#v107Upd` (*"A fresher Shivaa is
ready"*). The loop's exact cause: the button ran `postMessage('SKIP_WAITING')`
and then `location.reload()` **immediately** — `postMessage` only *asks*, so the
reloaded page found the worker still waiting and offered the same button again.
The `prompted` flag could not help: it is a variable, and every reload starts a
fresh one. Both popups are **deleted**. `sw.js` already self-activates
(`skipWaiting()` in its own install handler + `clients.claim()` on activate) and
the shell is network-first, so **no prompt was ever necessary** — it was asking
the customer to do something that had already happened. A waiting worker is now
activated silently and the swap reloads only while the tab is hidden, never over
a form, once per session, never offline.

**Standing review question #3 for this codebase:** *before adding any "please
update" prompt, check whether the thing already updates itself.* This one did.

### ⚠ Five things the next agent must not get wrong

1. **An OCC refusal must never block a payment.** The create-order call retries
   ONCE without `products`/`cart_details` and audit-logs
   `payment.cashfree-occ-fallback`. Do not "simplify" that away — it is the only
   thing standing between a rejected optional feature and a customer who cannot
   pay. `cfCheckout` is stored **alongside** the typed address, never over it.
2. **`cfOcc` defaults to OFF and must stay that way** until the owner confirms
   PG Products → One Click Checkout reads *Active* on the account. Ticking the
   box without an activated product just produces fallbacks.
3. **The forward-compat sweep has three shapes, and a stamp bump breaks all of
   them.** v139 broke 15 assertions across 9 gates until alternation `|138)`
   (47), quoted `'138'` (9) **and** bounded class `13[0-8]` (25) were all swept.
   A single regex sweep misses the third — this is the second time.
4. **A changed stamped file MUST move its `?v=`.** `.htaccess` serves `?v=`
   assets `immutable` for a year (line 53). v139 changed `js/v107.js`, so its
   stamp moved `?v=107 → ?v=139` in **both** `index.html` and the `sw.js`
   precache. Forget either half and returning phones keep the old file — and the
   old popup — forever. `v117-check.js` enforces precache == requested.
5. **v118's rail guarantee was re-pointed, not deleted.** Its "category rail
   photos eager-load on a phone" assertion now measures the *unfiltered* shop
   page, because a filtered page no longer has a rail. If that check ever fails
   again, the rail is gone from `#/shop` — that is a real regression.

### Verification

`v139-check.js` **56/56** (19 static · 33 live · 4 control) — including the
named regression control: strip `/js/v139.js` and the same tap **does** queue
`history.back()` at `hash=#/`. Full suite re-run **against the zip's own
extracted bytes**: v113b 32/32 · v117 27/27 · v118 19/19 · v119 27/27 · v120
24/24 · v121 14/14 · v122 22/22 · v123 14/14 · v124 20/20 · v125 25/27 · v127
26/27 · pay-audit 2/18 present · 10/10 invariants · php-sweep **207 routes · 0
exceptions**.

**Honest limit, stated twice because it matters:** jsdom performs no real
cross-document navigation, so the *visible* bounce on a phone is inferred from
the identical v127 mechanism (which the owner live-verified), **not measured
here** — the measured quantity is the queued traversal. And there is **still no
PHP binary in the sandbox**, so the Cashfree path was never executed: `api.php`
got a `php-parser` parse check (128 top-level nodes) proven against a
deliberately broken negative control, which is a parse check and **not** a run.

**Deliverable:** `shivaa-update-v139.zip` — md5 `cfd64d3ba65641a39140ec0c53533be7`,
8 files, root layout, all 16 fix markers grepped inside the built zip.
`DEPLOY-v139.md` carries the owner's install steps **and** the four dashboard
actions One Click Checkout needs from him.

### Forward baseline from here

**v125 + v127 + v135/v136/v137/v138 + v139.** Preserve all of it. v127 owns
`#mainNav` + `#searchSugg`; **v139 owns `#cartDrawer`** — two layers, two
overlays, never the same tap.

---

## Historical — v135 → v138 PAYMENT CORRECTNESS PASS — MERGED to `main` (18 Sep 2026, PR #69, branch `arena/01a0b25e-shivaa-ecom`)

**Owner's report that started it:** *"even if someone does not pay and comes back
silently then Shiva automatically issues invoices against but the right thing to be
done is when a customer pace then only we should issue invoice."* It had **not** been
fixed and was in **no** prior audit — it became finding **#25**. Chasing it found the
same defect class twice more: **loyalty points (#16)** and **reserved stock (#26)**.

**The unifying lesson — now a standing review question for this codebase:** whenever
anything is granted, deducted or reserved, ask *"what happens to it if the purchase
never completes?"*

### What shipped

| Release | Commit | Fix |
|---|---|---|
| v135 | `b95ec74` | 13 payment findings from the Part-2 audit |
| v136 | `b1a47e9` | GST Tax Invoice issued on `Paid`, not at checkout |
| v137 | `4eefb91` | Points earned on `Paid`, clawed back on full refund, restored on cancel |
| v137.1 | `73df782` | **Fix to v137** — double-earn hazard on pre-existing orders |
| v138 | `abae753` | Reserved stock returned on cancellation |

Plus `c61498b` (the shell pointed at `/js/app.js?v=133`, a file that does not exist in
`cms/js`, so `cms/` could not boot), `4b1624d` + `74c8cc1` (the audit and its gate),
and `a3d4c0c` / `13fa83e` / `fec5e9c` (audit notes).

### 🔴 The lesson that matters most

**Deferring a side effect creates a migration hazard on the rows that already exist.**
Moving point-*earning* from creation to `Paid` meant every order already in the
database — which had banked its points at creation and carried no marker — could be
credited **a second time** when later marked Paid. Guarding on the *new* flag alone is
not enough. The fix: **stamp an explicit marker at creation (`pointsDeferred`) and make
the new helper refuse to act without it.** Found in self-review, shipped as v137.1
before the owner ever saw v137.

Second: **a rebuilt fix invalidates the zip you already handed over.** The first v137
zip predated that fix and would have deployed the bug. After any post-build edit,
**grep inside the zip for the fix marker and re-publish the md5.**

### Deploy

**`shivaa-update-v138.zip` — md5 `e3e48f6ad116b7bbaaaffc381f32c948`, 5 files, stamps
138/138/138**, root layout into `public_html` ROOT. Verified a **strict superset** of
v135+v136+v137 by diffing every fix marker across all four zips. **Deploy v138 only and
delete the other three.** `boost.js` deliberately stays `?v=134`.

### ⚠ Four things the next agent must not get wrong

1. **No PHP binary exists in the sandbox — nothing was executed.** The `php-parser`
   check is clean (125 top-level nodes, proven against a broken negative control) but a
   parse check is **not** a run. No `php -l`, no 211-route php-sweep, **no payment path
   exercised.** Do not retry obtaining PHP — apt unreachable, asset hosts blocked,
   `@php-wasm/node` throws `PHPLoader.processId must be set before init`. **A live
   Cashfree sandbox test is still owed before this is trusted with real money.**
2. **`.htaccess` is EXCLUDED from the Hostinger auto-sync.** This release tightens the
   CSP there (drops the PayU hosts v128 deleted and a stale `*.onrender.com` relay), so
   **that fix ships only via the zip, never via auto-deploy.** Safe to drop: nothing in
   `cms/` calls PayU any more and `angelRelayUrl` is unset.
3. **The Hostinger FTP secrets are STILL not set** — all 4 historical runs of
   `hostinger-deploy.yml` failed at preflight with *"Nothing was deployed."* Merging
   PR #69 therefore deployed nothing. **If those secrets are ever added, merging any PR
   touching `cms/**` becomes an unconfirmed live deploy** — the v126 failure mode, one
   secret away.
4. **Finding #27 must not be fixed the easy way.** A lazy expiry sweep cannot run on the
   read path: `shv_wants_write_lock()` returns `false` for `GET`/`HEAD`/`OPTIONS`, so the
   `orders` GET holds no lock and a `db_save()` there writes a stale snapshot back over
   the whole database — reintroducing finding #10. Any sweep must live on a lock-taking
   POST or acquire the lock explicitly and re-read under it. There is no `cron` route and
   no scheduler. **No expiry window has been chosen — do not invent one.**

### Still open — all blocked on the owner, not on code

**#14** settlement reconciliation (live settlement data) · **#27** abandoned-order points
(expiry window) · **#2** receipt email · **#4** EMI · **#5** unpaid-order recovery ·
**#6** Payment Links.

**#2 is NOT blocked on credentials.** `cms/mail.php` is a real working `mail()` mailer —
`shivaa_mail_send()` at :90, `-f<from>` envelope attempt then plain-`mail()` fallback,
header-injection guard, per-IP relay cap; required at `api.php:25`. The blockers are its
**OTP-only `/^\d{4,6}$/` guard at :96** and the owner's wording. **Do not repeat the old
"blocked on mail credentials" claim without opening the file — it was wrong once already.**

### Traps re-confirmed this session

- **Sandbox reset** wipes `/tmp` and `node_modules` **and rewinds local git history to the
  branch point** while leaving the tree intact. Recovery: `git fetch origin <branch>`
  (the default refspec covers only `main`, so the branch has no local tracking ref),
  confirm the tree already equals the remote tip, then `git reset --mixed <remote-tip>`.
  **Never force-push. Always verify a push landed** via `git ls-remote`.
- **Gate allow-lists come in three shapes** — regex alternation `|137)`, quoted array
  `'137']`, **and bounded character class `13[0-7]`**. Bumping to 138 broke 15 assertions
  until all three were found; a single regex sweep misses the third.
- **`\+` in a BRE grep pattern is a quantifier, not a literal `+`** — it made a
  "stock is never restored" scan match the decrement and nearly produced a false finding.
  Verify with python fixed-string matching.
- **A fixed-width `sed` window over a function body lies** — brace-match with python.
- **`grep -c` returning 0 breaks a `&&` chain** and silently truncates the rest of a script.
- **Never build a directory symlink and write through it** — that writes into the real repo.
- **Zip recipe: build from `git diff --name-only <branch-point> -- cms/`, never `HEAD`**,
  else files committed in a prior release silently drop out.
- **`shivaa.in` is unreachable from the sandbox** — no live behaviour is verifiable here.

### Standing owner rules, unchanged

Owner is **non-technical** — talk plainly. **Never fabricate** supplier, payment, courier,
notification, legal, BIS, HUID, GSTIN, certificate or analytics data; no mock success
fallbacks. **Backup before deploy; nothing ships until the owner says so; a repair must
not swap `sw.js`** (rule #3). Rates are **owner-locked** (`premium.gold22 = 398`, anchor
formula). Never hand-edit live `db.json`; products only via API/upsert. Every release
bumps every `?v=` in `cms/index.html` together. **Forward-only history: merge commits,
never squash or rebase onto `main`.**

### Forward baseline from here

**v125 + v127 + v135/v136/v137/v138.** Preserve all of it. The v127 layer still owns the
sidebar and search-palette taps.

---

## Historical — v127 NAVIGATION REPAIR — LIVE + OWNER-VERIFIED (17 Sep 2026, branch `arena/01a0ad8d-shivaa-ecom`)

**Owner's word (17 Sep 2026, verbatim):** *"The version 127 update is working very fine and I
installed it and extracted in public HTML folder and its working fine now."* → **v127 is the
live, owner-confirmed state of shivaa.in.** He extracted `shivaa-update-v127.zip` into the
`public_html` ROOT himself; the auto-sync cron was not involved in that install.

**Independently re-checked from the sandbox:** `fetch_page` on `https://shivaa.in/js/v127.js`
returned **HTTP 200 with the full, correct file**. The `<script src="/js/v127.js?v=127">` tag
in the live shell was **not** directly read — the fetch tool strips `<script>` elements — so
that half is inferred from the owner's working buttons, not observed.

**⚠ HOW TO CONFIRM IT IS LIVE — the old trick no longer works.** Reading
`https://shivaa.in/sw.js` will still show `SHELL = 'shivaa-shell-v125'` **and that is
correct, not a failed deploy** — v127 is a repair and deliberately left `sw.js` and the
version triple alone. The live proof is `https://shivaa.in/js/v127.js` returning real
JavaScript, and `<script src="/js/v127.js?v=127" defer>` in the view-source of
`https://shivaa.in/`.

**Forward baseline from here: v125 + v127.** Preserve both. The v127 layer owns the sidebar
and search-palette taps, so anything editing drawer or palette markup must keep `#mainNav`,
`#searchSugg`, `a.sugg-cat` and the `href="#/…"` contract intact, and must re-run
`v127-check.js` (27) alongside the other gates.

### The repair itself

The owner asked for exactly two things and nothing else: the **search-bar category chips**
and **every sidebar row** were landing on the home page instead of their own page. Cause:
`app.js` dismissed the sheet *inside* the click and let the anchor's default action navigate,
while `js/v120.js`'s back-button helper answered a sheet closing with `history.back()` — the
traversal out-raced the navigation (search bar); and the drawer rows never performed a
navigation at all, leaning entirely on the native anchor action (sidebar). Fix: **new
`cms/js/v127.js` + one `<script defer>` line in `cms/index.html`**, loaded last, taking those
taps in the capture phase — `preventDefault()` → arm `window.__shvNavigating` (the flag
`v120.js` already honours) → navigate through the hash itself → *then* close the sheet.
**It is a REPAIR, not a release: `__SHIVAA_REL`/`APP_REL`/`SHELL` all stay 125 and `sw.js` is
NOT in the zip (owner rule #3).** `v117-check.js` carries a documented `NETWORK_ONLY`
allow-list for the one deliberately-unpreached file. Deliverable `shivaa-update-v127.zip`
(2 files, 11 KB) + `DEPLOY-v127.md`. Gates 252/252 on source and on the zip overlay,
php-sweep 211/0. **Owner live-verification pending — do not record it until he reports it.**
Full detail: `HANDOFF.md` → § v127, `MEMORY.md` → Session 2026-09-17 #2.

**v126 contamination check (the owner asked directly; answered with reads, 17 Sep 2026): NO.**
The zip holds 2 files; the string `126` occurs **0 times** in either; no `v126` file exists
under `cms/js/` or `cms/css/`; `git ls-tree -r --name-only origin/main | grep -i 126` is
**empty**, and so is the same command on this branch. The branch changes exactly 2 files
inside `cms/`. `sw.js` / `app.js` / `boost.js` / `boost.css` / `.htaccess` / `api.php` /
`db.json` are untouched and the triple stays **125**. The only "126" left in `cms/` is colour
values (`rgba(228,201,126,…)`) and QR tables in `js/qr.js` — neither is a version reference.

### ✅ STATE — v127 is MERGED to `main` (17 Sep 2026, 05:15 UTC, merge commit `5ed09a5`)

**`main` tip = `5ed09a5`. A new chat branching from `main` sees v127 as the newest, live,
owner-verified state — no recovery step is needed.** The owner was asked directly and chose
to merge; it was a fast-forward from `4be9a54`, so no conflicts were possible.

The PR had been held back earlier because merging fires the Hostinger auto-sync cron within
~5 min and would have deployed `cms/` before the owner took his `public_html` backup (owner
rules #1 and #4 — the v126 failure mode). That reason expired when he took his own path:
extracted the zip himself and live-verified it. By merge time `main`'s `cms/` was
byte-identical to what was already live, so the cron re-deploys the same two files — a no-op
for the shopper. It excludes `data/` and `uploads/`, so the live DB and media are untouched.
(The cron has failed silently once before, v119/PR #45; if it does not fire, nothing is lost.)

Verified after the merge by reading `origin/main`, not assumed: `cms/js/v127.js` present
(8465 bytes) · `cms/index.html` references `/js/v127.js?v=127` (1×) ·
`shivaa-update-v127.zip` present (10896 bytes, md5 `a3bc6214eaff1b19f43a6da9465966c0`) ·
`git diff origin/main HEAD -- cms/` **empty** · `git ls-tree -r --name-only origin/main |
grep -i 126` still **empty**.

Gates, re-run on the shipped zip's own contents: **252/252** (v113b 32 · v117 27 · v118 18 ·
v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 27 · v127 27) + php-sweep
**211 routes · 0 exceptions**.

**Still open, deliberately untouched:** `js/v120.js` stores `openHash[id] = location.hash`,
which is the empty string on a bare `shivaa.in/` visit — falsy — so on the home page the
close branch never runs and *every* class mutation while a sheet is open pushes another
history entry (instrumented: 2 pushStates for one drawer open). It pollutes the Back button;
it does not bounce navigation. Fixing it means editing `v120.js` — **ask the owner first.**

## CURRENT FORWARD BASELINE — v124 (16 Sep 2026)

The storefront baseline is **v124** — the v119 baseline plus the v120 bug-fix/mobile pack, the v121 smoothness pack, the v122 B2B design desk, the v123 category-photo refresh and the v124 slider faces (Punach + New In). **v123's provenance (restored this session after its own doc commits were lost):** merged as PR **#48**, merge commit **`bfc3908`** on `main`, and **owner live-verified on 16 Sep 2026 — `https://shivaa.in/sw.js` → `SHELL = 'shivaa-shell-v123'`** (owner-reported; the sandbox has no route to shivaa.in). Deliverables: `shivaa-update-v123.zip` (22 files) + `DEPLOY-v123.md`, then `shivaa-update-v124.zip` (7 files) + `DEPLOY-v124.md`. v124's merge/live record is the newest entry in `HANDOFF.md`'s session step log. **Everything v119 and v118 guarantee still stands** (see the lists below) and must not be reverted.

- **Slider faces (v124):** 18 faces live in `cms/images/categories/` — the 17 `CATS` keys plus `newin.jpg`, which the New In chip now uses instead of borrowing `/images/products/mangalsutra-modern.jpg` (product imagery is never category art). `punach.jpg` is the owner's kundan-kada photo (`ponchi-500x500.jpg`), which retired the v123 "forced leftover fit" tile. Every face is 420×420 q82, cropped centred on the trimmed content box so the round tile crop cannot clip a piece. **A bump must sweep BOTH `?v=` and the `&v=` branch** of the tile URL builder — a `?v=`-only sweep silently leaves half the tiles on the old stamp.

- **Category tiles (v123):** all 17 homepage/shop category-slider tiles are the owner's own photographs, AI-cleaned (third-party watermarks / ad text removed — NAKODA, MAHAKALI, nakodapayal, chhatralajewels, "Kada Payal"), 420×420, centred circle-crop-safe, in `cms/images/categories/`. Never re-publish the v113b placeholder art. Owner-source jpgs for every tile live at the repo root and map 1:1 onto the `CATS` keys (see `MEMORY.md` → *Mapping (for swaps)*); `punach` currently carries the delicate leaf-chain set, the one forced fit the owner may swap on a word.
- **Version triple:** `__SHIVAA_REL` / `APP_REL` / SW `SHELL` are all **124**, all six category-photo render sites + the pre-boot `v116` list carry `?v=124` (and `&v=124` in the already-queried branch), and the SW precache pins `app.js?v=124` + `v116.js?v=124`. The media cache intentionally stays `shivaa-media-v120`. Any new release bumps **all of them together** and makes the older suites forward-compatible (house pattern) rather than editing them down.
- **v120 pack:** rates page patches values in place (no more blank-white page, alert typing survives a poll tick); every category photo has the logo→hide fallback plus the monogram underlay, so a tile can never render as bare text; tap haptics; back button owns search/modals/drawers; safe-area + `dvh` + 16 px inputs mobile CSS. Suite `tools/mega/smoke/v120-check.js` (24).
- **v121 pack:** phone-sized hero banner (`poster-heritage-m.jpg`, srcset + matching head preload), cards drop permanent GPU layers + `content-visibility` on phones, banner shine repaints only on the visible slide, tickers rest while the tab is hidden. Media cache deliberately stays `shivaa-media-v120` (no gratuitous purge). Suite (14).
- **v122 pack:** B2B design desk `#/catalogues` — name/SKU search (debounced, persisted) + 5-way sort incl. selected-first; sticky bill bar gated on the top total; second gallery shots load near-view only; card-photo logo fallback; wishlist crash guard; honest empty-catalogue note. Billing math verified byte-identical. Suite (22).
- **Rates:** untouched since v119 — `premium.gold22 = 398` and the anchor formula are **owner-locked**; `api.php`, `.htaccess` and `db.json` shipped in **none** of the v120–v123 zips.
- **Catalogue:** master PGS set is **77** rings (the 65 signature rings + Ladies-67 tranche 1, PGS5066–5077, via PR #46); each still carries four images.
- **Gates required before any later release:** `v113b-check.js` (32) · `v117-check.js` (27) · `v118-check.js` (18) · `v119-check.js` (27) · `v120-check.js` (24) · `v121-check.js` (14) · `v122-check.js` (22) · `v123-check.js` (14) · **`v124-check.js` (20)** · php-sweep (211/0) · catalogue 77 with four images each — all re-run on the built zip overlay, plus a real-PHP probe of the shipped `api.php` whenever it changes.
- **Deploy caution:** the auto-sync cron did **not** fire for PR #45; never trust push-to-deploy until a merge is seen reaching shivaa.in on its own. The zip extracted into `public_html` ROOT is the fast path; `main` is the durable one.

## Earlier baseline — v123 (16 Sep 2026)

The baseline was **v123** — 17 real AI-cleaned owner tiles + `?v=123`; merged as **PR #48 (`bfc3908`)**, owner live-verified 16 Sep (`sw.js` = `shivaa-shell-v123`). Nothing in v124 reverts it: v124 only retook the `punach` face and gave the New In chip its own.

## Earlier baseline — v119 (15 Sep 2026)

The baseline was **v119** — the v118 baseline plus the owner-locked rate decision and the first-paint/mobile pack. Deliverable `shivaa-update-v119.zip` (10 files, root layout). **Everything v118 guarantees still stands** (see the v118 list below) and must not be reverted.

- **Rates (owner-locked, do not change the numbers):** the 22K retail premium is **₹398/g, desk physical** (`settings.gold22Premium`, default 398, admin-editable). `/api/rates` publishes `premium.gold22` **and** `anchorLevel {mode, goldPerG, silverPerG, …}`, and `jaipur.gold22` is derived from that one anchor: `round(anchorLevel.goldPerG × 0.9167) + 398`. The 24K/18K lines keep `jaipurPremium` (55) and an admin override still wins. Every 22K piece is ₹343/g dearer than v118.
- **First paint:** `index.html` ships a skeleton inside `<main id="view">` and `skeleton → body.shv-ready` retires it.
- **Shop slices:** the grid renders 20 cards at a time and grows through `#shopSentinel` (IntersectionObserver) — the filtered list is still computed whole.
- **HUID chip (honesty rule applies):** the PDP chip prints a HUID **only** when the catalogue carries one (`p.huid` or `hallmark.entries[].huid`); otherwise it is a labelled *HUID check* guide linking to the BIS Care walkthrough. Never invent a HUID.
- **Install chip:** appears from the **second visit** onward, only when the browser fires `beforeinstallprompt`; Close is remembered per device.
- **Pinch zoom:** Quick View photo zooms 1×–4× with two fingers without swiping shots; double-tap/pan unchanged.
- **.htaccess:** brotli (guarded) + `immutable` caching for `?v=` assets; deflate kept. **Merge, never blind-overwrite** if panel rules exist.
- **Gates required before any later release:** `v113b-check.js` (32) · `v117-check.js` (27) · `v118-check.js` (18) · **`v119-check.js` (27)** · php-sweep (211/0) · catalogue 65 with four images each — all re-run on the built zip overlay, plus a real-PHP probe of the shipped `api.php`.

## Earlier baseline — v118 (15 Sep 2026)

The baseline was **v118**, branch `arena/01a0a48d-shivaa-ecom`, commit `0f699f8`, PR #41, deliverable `shivaa-update-v118.zip`. The owner installed/tested it and reported all fixes working. Preserve it in every future change.

- Product pages reliably navigate all four photos by arrows, button dots and horizontal swipe/drag; pointer capture and vertical-intent handling must remain.
- Quick View opens on captured final `click`, never `pointerup`, and must stay in its modal rather than navigate.
- Category links are key-guarded, same-hash taps redraw, empty categories show the honest cataloguing page, and phone category thumbnails eagerly load with fallback.
- PayU submits only to HTTPS `*.payu.in` through the native form prototype and always retains visible Continue/Try again/Return recovery controls.
- Release handshake and SW shell are 118. Catalogue remains exactly 65 PGS rings with four images each; v118 changed no DB/API/payment keys/orders/customer data.
- Required gates before any later UI release: `v113b-check.js` (32), `v117-check.js` (27), `v118-check.js` (18), PHP sweep (211/0), catalogue 65 + four images each.

**Forward-only law:** do not revert any v118 mechanism, overwrite it with an older ZIP/file, or branch future work from pre-v118 code. Check `ARENA-STATE.md`, `HANDOFF.md`, and `MEMORY.md` for the detailed ledger before starting.

## Current feature work (6 Sep 2026)

Feature 13 **Compare + Shareable Shortlist** is live per owner and must be
preserved. The current task is the owner's 1–21 roadmap, **one feature at a
time**, starting with Feature 1 (BIS hallmark / HUID lookup).

Read [`FEATURE-ROADMAP.md`](FEATURE-ROADMAP.md),
[`FEATURE-01-HUID.md`](FEATURE-01-HUID.md) and
[`FEATURE-02-TRUST.md`](FEATURE-02-TRUST.md).

- **Feature 1 is live**, released via PR #5 (`77d5069`); public status, entrypoint
  and HUID JS confirmed on 6 Sep 2026. Automatic BIS verification is still **not
  connected**. Accepted format and staff references never mean BIS verified.
- **Feature 2 is live**, released via PR #6 (`fad5aca`), with the live API and
  v40 JS/CSS confirmed on 6 Sep 2026. Why Trust Shivaa uses only the existing
  owner-confirmed CIN, UDYAM, address and GSTIN (published in v105).
  Certificates stay empty pending real files. The profile is not a government registry result or product
  certificate.
- Stop after Feature 2. The rest of the original owner list
  is not in this checkout; ask for the exact Feature 3 specification.

Owner rule: **never fabricate supplier, payment, courier, notification, legal,
BIS, HUID, GSTIN, certificate or analytics data.** Existing legacy placeholders
are not evidence that any such integration is live. Do not add mock success
fallbacks. New HUID tests use only labelled temporary QA fixtures and leave the
repository DB untouched.

## FIRST MESSAGE for a new chat (paste this)
> Repo connected. Read `docs/AGENT-HANDOFF.md` fully, run `demo65/status.py`
> (or the current batch folder's), verify state against
> `work/designs.json` + git log, then continue where the ledger stops.
> Admin password for shivaa.in: I'll give when needed (never stored in repo).

## The automation architecture (already live — do not rebuild)
1. **You (agent)**: intake (PDF/photos/info from owner in chat) →
   `pipeline/01_ingest_pdf.py` (crops) → read supplier tags VISUALLY
   (green tags; contact sheets via `demo65/tools/`) → `suppliers/tags.csv`
   (real codes+weights; NEVER invent) → `02_normalize` → shots via
   `generate_image` (10/message cap; reference `media/designs/{SKU}.jpg`;
   **men's styling: worn shots on a man's hand** — owner directive) →
   `04_render_video.py` (720², CRF27, SHIVAA.IN mark) → `05_metadata.py`
   (provider `template`, spec-lock) → **commit + push**.
2. **Owner's Hostinger server (cron, every 5 min)**: `~/auto_sync.php`
   pulls the latest **default branch (main)** from GitHub (PAT tarball),
   then: (a) **auto-deploys `cms/` code** to public_html — excluding `data/`
   and `uploads/`, php -l gate, 1-gen backup in `~/shivaa-deploy-backup/`;
   (b) **auto-uploads** every design with 4 shots + film + meta that isn't in
   `~/shivaa-sync-ledger.json` (media POST /api/media, product upsert by SKU;
   category + `mens`-style tag per owner's section). Config: `~/.shivaa-sync.json`
   (0600). Logs: `~/shivaa-sync.log`. Owner set this up once via
   `deploy/upload_bridge.php` (self-destructed afterwards).
3. Therefore: **push to main (via PR) = goes live within ~5 min.** New chats
   branch from main → see everything; finish work → PR into main → live.

## Branch/PR rules (Arena)
Work on your session branch (`arena/…`); commit+push there every turn
(**media is TRACKED in git — snapshots respect .gitignore, untracked media
dies on sandbox restarts**); open a PR `arena/… → main` and merge at milestones
/ session end so future chats and the sync worker (main) pick it up.

## Sandbox survival kit (restarts happen between turns!)
- Workspace may reset to the branch base: `git fetch origin <branch> &&
  git reset --hard FETCH_HEAD` recovers everything pushed.
- pip + /home/user/tools vanish: `pip3 install --break-system-packages
  imageio-ffmpeg pymupdf`; `mkdir -p /home/user/tools/bin &&
  ln -sf $(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") /home/user/tools/bin/ffmpeg`
- apt is BROKEN (egress); RAR5 via npm `node-unrar-js`; shivaa.in UNREACHABLE
  from sandbox (uploads happen on the server, never from here).
- **PHP CAN run in the sandbox since v147** (replaces the old "no PHP binary"
  law everywhere): `cd tools/mega/smoke && npm i @php-wasm/node@3.1.54
  jsdom@30` (node_modules never survives a restart — reinstall, npm works).
  `new PHP(await loadNodeRuntime('8.3',{emscriptenOptions:{processId:1}}))`;
  result has `bytes` (NOT stdoutText in v3); `php.mkdirTree()` before
  writeFile; unregister the `php://` stream wrapper to fake `php_sapi_name()`.
  Pattern: `tools/mega/smoke/v147-php-run.js`. jsdom: `resources:'usable'`
  does NOT use a custom fetch — serve the shell over a localhost HTTP server
  (pattern: `tools/mega/smoke/v147-tc-autobuy.js`).
- `generate_image` paths are repo-root-relative.
- ffmpeg-7 quirks already patched in `04_render_video.py` (no drawtext →
  blend-screen watermark; `[0:v]` pad labels).

## Ground-truth rules (owner's law)
Never fabricate weight/purity/price/stones. Weights come only from supplier
tags (visual read; page order is ARBITRARY — verify contiguity, cf.
`demo65/work/page_map.csv`). Unreadable tags → quarantine, ask owner.
Names/SEO copy may be creative. Exemplar live names stay: PGS5001
"Rajkumari", PGS5004 "Mughal Moti".

## Current batch state (demo65, men's rings, 65 SKUs PGS5001–5065)
On branch `arena/01a0768e-shivaa-ecom` (6 Sep 2026): COMPLETE 39/65
(shots+films+meta), SHOTS 156/260, VIDEOS 39/65, META 65/65, CROPS 65/65.
**Rule: never merge a PR containing a shot that failed visual QA** — the
Hostinger auto-uploader reads `main` and would publish it. (First case:
PGS5036 — all 4 shots failed first pass: "AU 750" 18K engraving / pink
stones / brand on box / supplier tag. Reshoot 2nd pass PASSED 4/4, film
re-rendered + frame-verified 6 Sep 2026.)
Queue order = `work/designs.json` order; `status.py` prints next batch
(now: PGS5040, PGS5020, PGS5019 … 26 designs / 104 shots).
Work per turn: ≤10 shots → visual QA each (read back; regenerate failures
within the same 10) → films for completers → commit → push. At 65/65: verify
via owner screenshots (sandbox can't reach site); build
`shivaa-batch65-media.zip` in `deploy/` only if owner asks.

### Shot QA protocol (6 Sep 2026 — from the PGS5036 failures)
Guarded prompts in `demo65/config.json` (no tag / no text / no branding /
stones-as-reference) are MANDATORY for every new shot. After generation, READ
BACK each shot (10/turn) and check: supplier tag · any engraving or text
(purity must be 22K — "AU 750" = 18K is a fail) · brand names/monograms on
boxes · stone colour vs the reference crop. `demo65/tools/tag_scan.py` is a
bright-tag first pass ONLY (misses dark-scene tags — documented failure).
The other 30 completed designs were not re-QA'd; if the owner reports odd
shots on the live site, reshoot that SKU + re-render + re-upload.

### Catalog batch (10–15k images/hr target) — PLANNED, not started
Owner wants the full 3-lakh-design catalogue at 10,000–15,000 images/hr.
Agreed in chat (6 Sep 2026): in-chat `generate_image` (10/turn) can't do that
— it needs a batch job on a VPS calling Replicate directly with parallel
workers + a hard budget cap. Decisions: provider = Replicate; A/B test models
= FLUX.1 schnell (Apache-2.0, ~$0.003/img) vs FLUX.2 pro (~$0.03/img) —
FLUX.1/2 [dev] are EXCLUDED (non-commercial licence; this is a commercial
site); test-first gate = paid A/B on 20 designs before any full run. Owner to
provide: Replicate token (pay-as-you-go), a VPS (or confirm their Hostinger
plan is a VPS), and per supplier drop: weights CSV + photos zip. NOTHING is
built yet (that chat was interrupted); owner's priority = finish demo65 first.

## Historical site-change/deployment notes (not active authorization)

Do not follow the old PR/main/deploy sequence below without a new owner request.
Current session restrictions and the final v169 record take precedence.

Edit `cms/` on your branch; bump every `?v=` in `cms/index.html` (currently 11 refs) whenever
js/css change; PR → main → cron auto-deploys. NEVER edit live db.json by
hand; products only via API/upsert. Warn owner: hand-edits in hPanel File
Manager get overwritten by the next auto-deploy — changes go through chat.

## Key files
`pipeline/*` stages · `demo65/{config.json,status.py,tools/}` ·
`deploy/{upload_bridge.php,auto_sync.php,UPLOAD-RUNBOOK.md,AUTOMATION.md}` ·
`qa/php_router.php` (isolated PHP QA/read-only preview; never deploy) ·
`qa/preview_shim.py` (older read-only Python shim; does not implement Feature 1) ·
`docs/SESSION-STATE-2026-09-05.md` (history + lessons).
