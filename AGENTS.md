# Shivaa — agent working guide

## Current session state — 1 October 2026

- Work stays on Arena's fixed branch `arena/01a0f602-shivaa-ecom`. Release
  **183** is the last completed/pushed release (`7b937fc`); v184 is the next
  source/package batch. The current live production version has **not** been
  verified in this session. Do not repeat historic v179/v181 figures as live.
- v184 adds a read-only, admin-gated Cashfree settlement report to Admin →
  Reports. It uses the documented event-level `POST /pg/settlement/recon` API
  version `2026-01-01` for this call only; ordinary Cashfree calls stay on
  `2023-08-01`. It compares provider payment/order IDs and gross amounts with
  existing local payments and recorded overpayments, displays event settlement
  amounts separately, and requires manual cursor paging. It does not run on a schedule,
  mutate payment records, or change loyalty/order expiry behavior.
- Payment finding #27 remains blocked on the owner's commercial order-expiry
  policy. Never invent an expiry duration, auto-cancel, or points-release rule.
- v184 has no merchant-account verification; no Cashfree credentials are stored
  in the repo or requested in chat. Staging, real-provider, visual approval,
  and production checks remain pending. Read `DEPLOY-v184.md`,
  `docs/PAYMENT-EXPERIENCE-NEXT.md`, and `CASHFREE-INTEGRATION.md` before the
  next payment batch.

## Deployment and safety gates — standing rules

- Production is manual-only. A push/merge must never update Hostinger or the
  live catalogue. Stage first, verify the release handshake/cache behavior,
  then request explicit owner approval for that deployment; one yes authorizes
  only one run. No staging or production deployment occurred for v184.
- Never deploy an older tree over a newer live site. Check `/api/version` on
  the authorized target before deploying and stop if its release is newer than
  the package. Do not assume a live version from old handoff notes.
- Hostinger credentials belong only in the configured GitHub Actions secrets;
  never request secrets in chat. Keep protected data/uploads/config/installer/
  `.htaccess` out of code packages. See `HOSTINGER-AUTO-DEPLOY.md`.
- Preserve the current brand theme, logo artwork, and Gold Biscuit campaign
  surfaces unless specifically asked to change them. Source fixes are not live
  fixes until a permitted deployment is verified.

## Read first

1. `DEPLOY-v184.md` for the current source/package record (not a deployment
   authorization); `docs/PAYMENT-EXPERIENCE-NEXT.md` and
   `CASHFREE-INTEGRATION.md` for the payment-audit delta and current endpoint
   version notes.
2. Check the actual branch, git status/diff, and source. Many historical
   handoff documents—including the v180/v179 figures below—are stale and must
   not be used as current release/live truth.
3. For SQL/catalogue work, consult the relevant plan and install record; verify
   `/api/version` on the authorized server rather than assuming live MySQL or a
   release number from repository notes.

## Historical source ledger — v180 snapshot (24 September 2026; superseded by v184)

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

- Preserve the latest source (currently **v184** on
  `arena/01a0f602-shivaa-ecom`; live deployment status is unverified). New
  fixes are targeted forward commits; **no release reset or revert, no old-file
  or old-ZIP restoration, no rewritten or force-pushed history. The next release
  is 185 or higher — never reuse or renumber a shipped release, never deploy an
  older tree over a newer live site.** The old v125 freeze was superseded by
  owner-requested releases through v184; rejected v126 and Truecaller must
  remain retired.
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
