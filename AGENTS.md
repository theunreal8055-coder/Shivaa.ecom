# Shivaa — agent working guide

## Deployment control update — owner approval required (22 Sep 2026)

- PR #90 is merged on `main` (`2393a7949852b9bb1f16cdbfa8b138f83da8235e`):
  MySQL/PDO support, the installer/template and manufacturing-weight workflow are
  retained. The owner reports the 77-product Hostinger migration completed.
- The public `/api/version` currently reports **release 170** with matching
  index/app/worker stamps, while this GitHub `main` tree still carries application
  release **169**. **Never deploy the current 169 tree over live 170.** The next
  application release must move forward (normally 171+) and pass the anti-downgrade gate.
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

1. `docs/SESSION-STATE-2026-09-21-v169.md`, then the final-state sections of
   `docs/AGENT-HANDOFF.md`, `MEMORY.md`, `HANDOFF.md`, `ARENA-STATE.md`.
   Older “current/newest”, no-ZIP and release-freeze banners are historical.
2. `tools/mega/audit/DEFECT-LEDGER-v169.md` and `DEPLOY-v169.md`.
3. Actual branch, diff and code. Documents have contained stale counts/labels;
   verify before repeating them.

## Current source state (21 September 2026)

- Storefront/source release **169**; hardened media cache deliberately stays
  **168** because no media changed.
- Prior ledgers:104 repairs; v169 adds **36**, for **140 cumulatively recorded**.
  B20 is separately identified hardening, not a claimed cross-customer exploit.
- **Published, remotely verified, NOT live-deployed.** Publication commit
  `f847d85057a112296c59ef58a35731a184b74194`; source `db52583`. The owner received the
  immutable link recorded in the final session record. The new
  `shivaa-update-v169.zip`:17 cumulative code files, built from `db52583`.
  Requires full v165+; see `DEPLOY-v169.md` for hash/extraction/overlay evidence.
  No DB/uploads/credentials/media/host configuration is packaged.
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

- Preserve the latest verified source. New fixes are targeted forward commits;
  no release reset/revert, old-file/ZIP restoration or rewritten/force-pushed
  history. The old v125 freeze was superseded by owner-requested releases
  through v169; rejected v126 and Truecaller must remain retired.
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

- Last verified belt: **38 active suites pass, 16 retired-feature suites skip,
  0 fail**. The runner explicitly distinguishes SKIP from PASS.
- PHP can execute via the installed PHP-WASM dependency. A parser pass is not
  runtime proof; test the relevant real PHP block/endpoints too.
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
