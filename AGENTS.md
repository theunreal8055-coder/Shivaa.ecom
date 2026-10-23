> ## CURRENT STATE — **v236 PACKAGED, AWAITING THE OWNER'S YES** (23 Oct 2026). This block first, then `docs/NEXT-CHAT-HEAD.md`.
>
> - **v236 “The Counter Book” is the newest release** — packaged 23 Oct 2026, **not deployed**.
>   `shivaa-update-v236.zip` — **368 files · 37,445,481 B ·
>   `b6483f250bc1600b4cde420d80d78abf68ca65a4f3137c781417d09d129d6655`**. **Next release number: v237.**
>   The build the owner actually applied is **v234** (23 Oct 2026); v235 and v236 are both packaged and
>   waiting. Chain: v228 (17 Oct) → v232 (21 Oct) → v233 (23 Oct) → v234 (23 Oct, applied) →
>   v235 (23 Oct, packaged) → **v236 (23 Oct, packaged)**.
> - **What v236 does.** Six things a working counter was missing, none of which moves a price.
>   **Money:** `POST /api/bullion/orders/<id>/pay` records cash / UPI / RTGS / cheque with a reference and
>   the deal carries `paid`, `due`, `total = value + TCS` — overpaying is refused with the figure still
>   open, a bank receipt without a reference is refused, a cancelled deal takes nothing. **Ledger:**
>   `GET /api/bullion/ledger?from&to` carries an **opening balance from before the window**, so the closing
>   figure is the real one (`closing = opening + window due`); one function `bullion_order_due()` feeds the
>   ledger, day book, limit and invoice so they cannot disagree. **Invoice:** a slip becomes a GST invoice
>   with HSN 7108 (gold) / 7106 (silver), place of supply, TCS 206C(1H) @ 0.1 % on a buy, and the amount in
>   words. **Told once:** `POST /api/bullion/alerts/claim` hands each reached alert out exactly once
>   (`notifiedAt` written server-side) and the desk draws it through the service worker. **Limit:** the
>   office sets a rupee limit per partner; a deal that would cross it is refused *before it is written* with
>   all three figures. **Book:** deals filter server-side by text, date and status, and the filter survives
>   a reload. Plus the honesty fix: “unfix” is a **request queue with a status**, answered by the office —
>   every string that promised a rate lock the code did not deliver is rewritten.
> - **Proof:** `qa/browser/t-v236-book.mjs` (**109**), new gate `bash qa/v236-gate.sh` → **27 checks, 0 red**
>   (v235-live 71, v234-desk 111, v233-nidhi 146, v232-idle 87, v229-bills 102, v231-ink 53, v230-cert 61,
>   v229-black 88, `qa/v229-routes.py` 61, bundle 36, appfeel 80 — all 0 red). Stylesheet is **70 layers /
>   70 blocks**, still one request: 942,329 B raw / 185,156 B gzipped.
> - **Work branch: `arena/800194ed-shivaa-ecom`** — the Arena session's branch, based on the release
>   branch `arena/e8a470c6-shivaa-ecom` at `fd90c0f` (v232 content). `qa/where-am-i.sh` names
>   `e8a470c6` as the release line and reports this tree as "newest content, wrong branch" (exit 2) —
>   that is this session's normal state; commit and push to `arena/800194ed-shivaa-ecom` only.
>   **PR #107 is MERGED** (21 Oct 2026) into `arena/5529f0ec-shivaa-ecom` as `c6337db`; **`main` is
>   untouched (`7d23eea`, v184)** and the Hostinger workflow is `workflow_dispatch` only — no merge has
>   ever deployed anything.
> - **FIRST COMMAND OF EVERY CHAT, ON ANY BRANCH:** `bash qa/where-am-i.sh` (≥120 s). It fetches origin,
>   reads the release stamp out of `cms/js/app.js` on **every** branch, and says **FORWARD** (exit 0) or
>   **BEHIND** (exit 3) for the tree you are standing in. Exit 3 = stop: do not edit `cms/`, do not build
>   a zip, do not write docs; run the three commands it prints. **Never work on a tree older than the
>   newest release, and never rebuild a spent number.**
> - **Machine truth: `docs/release-ledger.json`** (readable twin `docs/RELEASE-LEDGER.md`). `live` there
>   means *newest release in the ledger*; whether the owner has applied it is the `deployed`/`awaiting`
>   fields and the docs' countdown. `python3 qa/check-handoff.py` proves ledger ⟷ stamps ⟷ zips (sha256,
>   bytes, file count, committed in git) ⟷ these docs. **172 checks, 0 red** at v236's close.
> - **Forward-only (absolute):** a release number is spent the moment it is in the ledger. Never renumber
>   it, rebuild it with different bytes, re-ship it, revert or force-push. `qa/make-update-zip.py` refuses
>   a spent number, and its `ADDED` map is where a release declares any new file other than its css layer
>   (v234 declared `desk.html`, `desk.webmanifest`, `js/v234.js`; v235 and v236 add only their css
>   layer). Owner approval before anything goes live; rollback is the previous ledger row (v235).
> - **Sandbox resets between turns** — more than twice now the tree came back at the base commit with the
>   branch name intact. First `git fetch origin arena/800194ed-shivaa-ecom && git reset --hard FETCH_HEAD`,
>   then `bash qa/where-am-i.sh`, then `npm install --prefix /tmp jsdom@26 --no-audit --no-fund`,
>   `python3 qa/build-test-db.py --with-staff`, `python3 qa/preview_shim.py --port 8090` — or just run
>   `bash qa/v236-gate.sh`, which owns the port and rebuilds the database between phases.
>   **`pkill -f preview_shim` kills your own shell** (the pattern matches your command line) — use the
>   process tool or let the gate own the port.
> - **The rules that never change** (full text in `docs/NEXT-CHAT-HEAD.md` §7–§10): one stylesheet — never
>   hand-edit `cms/css/shivaa.css`, edit the layer and run `python3 tools/build-css-bundle.py --write`;
>   the order in `tools/css-bundle-order.txt` is load-bearing (**70 positions**, `v186.css` twice,
>   `v236.css` last); never hand-edit `cms/desk.html` — **regenerate** it with
>   `python3 tools/build-desk-shell.py`; films load only via `wake()`; never animate a layout property, a
>   `filter` or `background-position` in a loop; **no markup rebuild inside a timer** (v224) and **no
>   forced layout read to restart an animation** (v235 — use `flashClass()`); zero idle frames and no
>   per-event `getBoundingClientRect()` in any move listener; the member percentage is one setting, ships
>   **20**; `content-visibility` stays sealed (v217); `cms/data/db.json` is never committed, never ships.
> - **Open, waiting on the owner rather than on code:** Google Play fingerprints (both SHA-256 into both
>   `assetlinks.json` copies), the UGC/reviews declaration, the Play account type (personal ⇒ 12 testers
>   × 14 days), the private bills folder `.shivaa-private-bills` **beside** `public_html`
>   (`DEPLOY-v229.md` §2), and who answers a rate-lock request and a credit-limit change **on the phone**
>   (v236 makes both a real queue; a human still has to answer it). The service-worker `push` handler is
>   wired but **nothing sends a push** until a sender exists — the 20 s claim loop is what announces an
>   alert today. Details: `docs/NEXT-CHAT-HEAD.md` §12.
> - **Open, waiting on the owner rather than on code:** Google Play fingerprints (both SHA-256 into both
>   `assetlinks.json` copies), the UGC/reviews declaration, the Play account type (personal ⇒ 12 testers
>   × 14 days), the private bills folder `.shivaa-private-bills` **beside** `public_html`
>   (`DEPLOY-v229.md` §2), and `partnerWatch`'s missing `$db` init entry (harmless; queued for v236).
>   Details: `docs/NEXT-CHAT-HEAD.md` §12.


# Shivaa — agent working guide

> **The one-line answer (21 Oct 2026): LIVE is v232, next is v233, work on
> `arena/e8a470c6-shivaa-ecom`, and run `bash qa/where-am-i.sh` before touching a file.**
> Machine truth: `docs/release-ledger.json`. Paste-first handoff: `docs/NEXT-CHAT-HEAD.md`.
> Everything below that calls v180–v222 "live" or "newest" is **history** — it is kept for the
> lessons, not for the current state.

## Plan session (24 Sep 2026) — read before touching SQL/billing/catalogue work

- The agreed master roadmap for the SQL-at-3-lakh migration, the standing ZIP
  update ritual, the auto-catalogue review-queue, and the owner's billing-software
  deployment is `docs/PLAN-SQL-BILLING-CATALOGUE-2026-09-24.md`. **Phase 1+2
  (SQL runtime) is now BUILT as v180** (dual-mode overlay + mirror-on-save +
  ZIP-only `upgrade-sql.php` reconciler; belt 41/21/0 + chain 171/171 + sweep
  212/0) — delivered as `shivaa-update-v180.zip` + `DEPLOY-v180.md`, **not
  deployed** (owner yes required). Billing upload + catalogue gate choice
  still pending. Live is 179; forward-only 180+.
- Verified fact, updated for v180: **product catalogue reads/writes now
  ENGAGE MySQL when `db_driver => 'mysql'`** (overlay + mirror-on-save with
  the JSON safety net — see the v180 CURRENT STATE section in
  `docs/AGENT-HANDOFF.md`), but **orders/settings SQL tables are still empty
  and money routes still run on extract-only JSON until Phase 3.** Until
  v180 is deployed AND `upgrade-sql.php` has run, live behaviour is still
  pure JSON. "Tables exist" ≠ "site runs on MySQL" — `db.mode` on
  `/api/version` is the truth. **Never add a helper called from inside
  `db_load`/`db_save` without a `function_exists` guard** — legacy suites
  extract only those two bodies and fatal otherwise.

## Deployment control update — owner approval required (22 Sep 2026)

- PR #90 is merged on `main` (`2393a7949852b9bb1f16cdbfa8b138f83da8235e`):
  MySQL/PDO support, the installer/template and manufacturing-weight workflow are
  retained. The owner reports the 77-product Hostinger migration completed.
- The public `/api/version` last reported **release 170** with matching
  index/app/worker stamps. The newest published package is **v178** (source commit `0c8cd29`). **Never deploy an older tree over a newer live site, and never
  deploy anything without the owner's explicit yes.** Any next application
  release must move forward from **179** and pass the anti-downgrade gate.
- Production is now manual-only by owner policy. A push/merge must never update
  Hostinger or the live catalogue. Explain the proposed deployment and ask the
  owner first; one explicit yes authorizes only that one run.
- `.github/workflows/hostinger-deploy.yml` requires a manual dispatch from `main`
  plus `DEPLOY SHIVAA LIVE`; catalogue and ring-reset workflows have separate
  explicit phrases. Protected data/uploads/config/installer/`.htaccess` stay excluded.
- The owner must store Hostinger FTPS values only as GitHub Actions secrets and
  disable the old Hostinger `auto_sync.php` code writer (`deploy_code:false`). Never
  request credentials in chat. See `HOSTINGER-AUTO-DEPLOY.md`.
- No live deployment was performed while installing these controls.

## Read first

1. **The *CURRENT STATE — v183 BUILT* section of `docs/AGENT-HANDOFF.md`
   and `MEMORY.md`, plus `DEPLOY-v183.md` and `playstore/README.md`.** These are
   the build record for the Play Store release (live remains **181** until the
   owner deploys v183, which is a superset of the never-deployed v182).
   `DEPLOY-v177.md` / `DEPLOY-v176.md` and those sections are history
   (v177 and v176 stay shipped).
   `DEPLOY-v176.md` and the v176 section are history (v176 stays shipped).
2. `docs/SESSION-STATE-2026-09-21-v169.md` and `DEPLOY-v169.md` for the v169
   baseline, then `docs/AGENT-HANDOFF.md`, `MEMORY.md`, `HANDOFF.md`,
   `ARENA-STATE.md`. Older “current/newest”, no-ZIP and release-freeze banners
   are historical — the v169 “final state” is history, not a restore
   instruction.
3. Actual branch, diff and code. Documents have contained stale counts/labels;
   verify before repeating them.

## Current source state (9 October 2026) — release 183 (built; live 181)

- **Storefront/source release 183** — the **Play Store release**: Shivaa goes to
  Google Play as a **Trusted Web Activity** of `shivaa.in`. 11-file ZIP:
  `api.php` · `index.html` · `js/app.js` · `js/admin.js` · `sw.js` ·
  `upgrade-sql.php` · `manifest.json` · `manifest.webmanifest` · `sitemap.php` ·
  `.well-known/assetlinks.json` (NEW) · `.well-known/.htaccess` (NEW).
- **The three web pieces the app depends on:** Digital Asset Links
  (`/.well-known/assetlinks.json`) — and the **trap** that the parent
  `.htaccess` denies every `*.json`, which 403s exactly that file; fixed by
  shipping a `.htaccess` *inside* `.well-known/`, because a deeper `.htaccess`
  merges after its parent. Plus a stable `"id": "/"` in both web manifests, and
  the erasure page listed in `sitemap.php`.
- **The one Play blocker that had to be built:** `POST /api/auth/delete-account`
  and the "Privacy & my data" page. Play's User Data policy requires in-app
  account deletion plus a web URL; emailing the Grievance Officer does not count.
  The route anonymises the row exactly as `admin/user-data/*/anonymize` has since
  v86, revokes every token, keeps order/KYC rows for tax + PMLA retention, and
  never hard-deletes. Session **or** a freshly verified OTP — and the OTP must be
  checked against the code itself, because the page never calls
  `/auth/otp-login`.
- **`playstore/` is the launch kit** — `README.md` is the step-by-step plan with
  the two gates (account type; identity verification), `CHECKLIST.md` the
  runbook, `listing.md` the paste-ready copy and App-content answers,
  `twa-manifest.json` the Bubblewrap config, `verify.mjs` 17 offline checks.
  Run `python3 playstore/graphics/make-graphics.py` for the icon, the 1024×500
  feature graphic and the screenshot framer.
- **Verified live, not from memory:** Play requires **target API 36** for new
  apps since 31 Aug 2026 (Bubblewrap 1.26's template already targets 36), and a
  **personal account created after 13 Nov 2023 needs a closed test with 12
  testers over 14 continuous days** before production access. Say that plainly
  whenever "launch today" comes up.
- **Belt: 190 passing** (deploy gate 20 · v183-check 9 · v183-php-run 9 ·
  v182-php 9 · v181-php 6 · v180-php 8 · v179-php 25 · v169 pages 25 · v169 PHP
  28 · v168 39 + N40 12), re-run on the **extracted ZIP bytes**. v179-relay fails
  7/7 identically on pristine HEAD in this sandbox — pre-existing.
- **Not verified:** no AAB built or signed (no JDK/Android SDK/dl.google.com
  here), no live site probed, no screenshot invented, Google's app-link
  verification and Play's review not run.

## HISTORY — release 180 built, live 179 (24 September 2026)

- Storefront/source release **180** (SQL runtime, built this session; live
  is still **179** until the owner deploys); hardened media cache
  deliberately stays **168** because no media changed. v180: 6-file ZIP
  (api/index/sw/app/admin/`upgrade-sql.php`), stamps 179 → 180 lockstep,
  dual-mode SQL overlay + mirror-on-save + installer, compute_price
  hardening, admin Data-Source strip; suites `v180-check` 7/7 +
  `v180-php-run` 8/8; superseded stamp-exact suites SKIP-forward.
  Builder: `tools/mega/make-v180-zip.py`. See `DEPLOY-v180.md`.
- (Prior source release **177** record follows.) Release stamps move in lockstep
  (`__SHIVAA_REL=177`, `APP_REL = 177`, `shivaa-shell-v177`, `REL=177`,
  `'rel' => 177`) plus every `?v=` asset stamp in `index.html` and `sw.js`.
- v178 is the in-footer PWA app band the owner asked for ("download the
  app without the Play Store"): a quiet footer card with a client-drawn
  QR of `https://shivaa.in/` (qrcode-generator 1.4.4 vendored verbatim,
  MIT) and a CTA; the captured `beforeinstallprompt` fires only on the
  tap; the iPhone/Android/desktop guide sheet is tap-only and closes
  instantly; the dismiss persists (30-day re-show); standalone never
  shows the band. The v140 law (no floating install chip, no auto
  pop-ups, instant persisted dismiss) is asserted by `v178-check.js`.
  New assets `css/v178.css` (last sheet) + `js/v178.js` (last deferred
  layer); stamps 177 → 178 lockstep; MEDIA stays `shivaa-media-v168`;
  no API/admin/money changes. `v178-check.js` 17/17 +
  `v178-php-run.js` 17/17; belt 158 checks, 0 failures. Builder:
  `tools/mega/make-v178-zip.py`. See `DEPLOY-v178.md`.
- v177 is the owner-requested rework of v176: five defects repaired (the
  confirmed purge 500'd on undefined `JSON_UNESIGNED_*` constants, the GET
  preview ignored `?scope=`, same-second backups could clobber each other,
  the day-book COD tile was structurally always ₹0, and legacy rows could
  500 stats/the preview). New executed suites `tools/mega/smoke/v177-php-run.js`
  (17/17, PHP 8.3) and `v177-check.js` (11/11) guard each repair; the belt is
  40 pass / 16 retired skip / 0 fail. Builder: `tools/mega/make-v177-zip.py`.
- This session's branch: `arena/01a0d168-shivaa-ecom` (branched from
  `bc666f3`, the PR #93 merge carrying v171–v176 onto `main`). v177 commits:
  `a77dacf` + `29e2c0d` (ZIP built from `29e2c0d`).
- Prior ledgers:104 repairs; v169 adds **36**, for **140 cumulatively recorded**.
  B20 is separately identified hardening, not a claimed cross-customer exploit.
  **v170–v178 are separate owner-requested releases recorded in the handoff, not
  new ledger rows — do not recount them as bugs.** (The five v177 defects were
  genuine defects in the shipped v176 release, fixed forward — not ledger
  re-counts.)
- **Published, NOT live-deployed.** v177: `shivaa-update-v177.zip`, 7 files,
  427,896 bytes, SHA-256
  `2c9fff1a8b39e186093e44ecac0980189e7ca783337be677e35d5bea6b35dec2`, built
  from source `29e2c0d` (commits `a77dacf`/`29e2c0d` on this session branch);
  requires full v165+; see `DEPLOY-v177.md`. The v176 ZIP/link is unchanged
  and must stay available. No DB/uploads/credentials/media/host configuration
  is packaged.
- Actual ZIP overlay checks pass:25/25 page,28/28 PHP,39/39 v168 boundaries,
  12/12 signatures,17/17 v164 PHP,24/24 direct checkout,36/36 v167.
  Existing v168 ZIP is unchanged; the new archive is reproducible using
  `tools/mega/make-v169-zip.py` and the documented source commit.
- Current session branch: `arena/01a0c31d-shivaa-ecom`. Obey the active Arena
  session's branch restrictions; do not switch branches or merge main on the
  strength of an old handoff instruction.
- App: `cms/` (PHP 8 API, vanilla JS hash-routed SPA, JSON-backed production data).
- Do not mistake the static preview's fixture responses for a live backend.

## Forward-only / do not repeat completed work

**FORWARD ONLY — the owner restated this rule at the close of the v176 session;
it is absolute.**

- Preserve the latest verified source (currently **v180** — built, awaiting
  owner deploy; live 179). New fixes are targeted forward commits; **no
  release reset or revert, no old-file or old-ZIP restoration, no rewritten
  or force-pushed history. The next release is 181 or higher — never reuse
  or renumber a shipped release, never deploy an older tree over a newer
  live site.** The old v125 freeze was superseded by owner-requested
  releases through v180; rejected v126 and Truecaller must remain retired.
- Consult the completed v168/v169 ledger IDs and tests before changing a path.
  Missing scratch logs do not mean a fix is absent. Do not replay non-idempotent
  `work/audit169/backend.py` / `frontend.py` patch scripts.
- The complete product/test/package inventory and remaining work are recorded
  in `docs/SESSION-STATE-2026-09-21-v169.md`. Do not redo or recount those repairs.
- A docs-only update needs no new app release or replacement archive. Preserve
  the published ZIP/hash and immutable download link. Do not call it installed
  or live without owner/host evidence.
- Historical merge/deploy instructions are not new authorization. Stay on this
  session's branch; do not merge main or trigger live workflows for continuity.

## Safety and owner rules

- Work forward from the current source. Preserve the approved design, category
  tiles, films, direct Cashfree checkout and six campaign studs.
- Never invent supplier weights, purity, prices, legal/HUID verification,
  government data, analytics, payment/courier status or customer confirmations.
- Do not edit `cms/data/db.json`, customer orders, credentials or uploads to make
  tests pass. Use isolated, clearly labelled QA fixtures.
  **v176 collision, already resolved — do not resolve it the other way.** The
  owner asked to "delete all the sales data", which read literally means editing
  the live `db.json`. House law forbids that, and this workspace's copy has
  `orders: []` anyway, so the purge ships as a server-side, admin-only,
  backup-first dashboard action (`/api/admin/purge-unpaid`) instead. Any future
  "delete the data" request gets the same treatment: build the guarded tool,
  never hand-edit the database.
- Never restore the retired verification integration or the rejected v126 work.
- `.htaccess` is host-managed for deployment. Review its tiny Apache comment fix
  separately; never overwrite the live file wholesale or package it in a ZIP.
- Never replace `sw.js` alone. Index, app, worker, API release and every asset
  URL must move coherently. Staff loader follows APP_REL. Only Shivaa-owned cache
  namespaces may be purged.
- Source fixes are not production fixes until deployment is approved and checked.
  Live gateway limits cannot be repaired by frontend code.
- Communicate plainly; no “100 bugs fixed” by counting tests, lint warnings or
  speculative findings. Keep defect IDs and distinguish new/cumulative counts.

## Verification

```bash
cd tools/mega/smoke
npm ci --no-audit --no-fund
npm test
npm run test:regression
cd ../../..
node tools/mega/php-sweep/sweep.mjs
```

- Last verified belt (v180 close): **41 active suites pass, 21 retired/
  superseded-feature suites skip, 0 fail** · chained `npm test` **exit 0,
  171 executed checks** (relay may flake T05/T06 under chain load —
  standalone 7/7) · php-sweep **212 routes / 0 exceptions** · deploy-approval
  **20/20**. The runner explicitly distinguishes SKIP from PASS; five
  stamp-exact v177–v179 suites SKIP-forward on trees newer than their
  release (forward-only made mechanical).
- PHP can execute via the installed PHP-WASM dependency. A parser pass is not
  runtime proof; test the relevant real PHP block/endpoints too. (The v176
  purge 500'd on nonexistent `JSON_UNESIGNED_*` constants while every parser
  and the Python simulation were green — this is why the v177 suites execute
  the real endpoints.)
- v169 gates: **28/28 executed PHP**, **25/25 executed page/print cases**.
  Same tests on published v168: **1/28** and **0/25**. Tests are not bug counts.
  `SMOKE_CMS` selects isolated code; PHP fixtures use a separate in-memory DB.
  Never point mutating tests at production. New helpers live in tracked
  `tools/mega/smoke/php-api-fixture.js`; scratch logs stay in `work/audit169/`.
- `db_save` rejects stale snapshots with409. Do not blindly retry money-changing
  POSTs. Any future nested `db_load` must not permit saving an older outer array.
  Native locking/load/gateway tests remain separate from deterministic fixtures.
- `work/` and `node_modules/` are transient/ignored. Keep reusable tests and
  findings in tracked `tools/mega/`, not only in scratch directories.
- After edits update the memory, handoff and agent guide with measured results,
  honest deployment status and remaining checks. Keep generated bulk media out
  of this audit unless the owner explicitly requests it.
