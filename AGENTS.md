# Shivaa — agent working guide

## Read first

1. `docs/SESSION-STATE-2026-09-21-v170.md`, `DEPLOY-v170.md`, and current
   sections of `docs/AGENT-HANDOFF.md`, `MEMORY.md`, `HANDOFF.md`, `ARENA-STATE.md`.
2. For the preserved prior audit: `docs/SESSION-STATE-2026-09-21-v169.md` and
   `tools/mega/audit/DEFECT-LEDGER-v169.md`. Old release/branch banners are history.
3. Actual branch, diff and code; verify document claims before repeating them.

## Current source state (21 September 2026)

- **v170 category fix**, source `0b0a7e8`, package `b601c23`. Shell release170,
  media cache168 intentionally unchanged. Active branch `arena/01a0c384-shivaa-ecom`;
  always obey the live Arena session branch restriction over historical notes.
- New archive: `shivaa-update-v170.zip`, 19 cumulative files /545,711 bytes,
  full v165+ required. Hash/install/permanent link in the v170 session record.
- Shop selectors exclude page-transition snapshot controls; desktop menu moved
  outside blurred header, bounded to viewport; scroll no longer kills selection;
  navigation before dismissal; repeat/modified/keyboard/mobile/resize fixes.
- **97/97 real Chromium tests** pass on source and actual ZIP overlay; unchanged
  v169 control19/97. `npm run test:categories` in tools/mega/smoke is essential:
  jsdom cannot expose geometry, WAAPI snapshot or real pointer-sequence failures.
- All38 active legacy suites have passing evidence. Last full run37 PASS/16 SKIP/
  1 FAIL (v156 whole RTGS object comparison); unchanged isolated rerun14/14 passes.
  Do not hide that intermittent harness result or claim all tests always pass.
- **NOT live-deployed.** No main merge, hosting workflow, real payment, catalogue,
  database, credentials or uploads changed. Prior v169 ZIP/hash unchanged.
- App: `cms/` (PHP8 API, vanilla JS hash SPA, JSON-backed production data).
  Static/browser fixtures are not a live backend.

## Forward-only / do not repeat completed work

- Preserve the latest verified source. New fixes are targeted forward commits;
  no release reset/revert, old-file/ZIP restoration or rewritten/force-pushed
  history. The old v125 freeze was superseded by owner-requested releases
  through v169; rejected v126 and Truecaller must remain retired.
- Consult the completed v168/v169 ledger IDs and tests before changing a path.
  Missing scratch logs do not mean a fix is absent. Do not replay non-idempotent
  `work/audit169/backend.py` / `frontend.py` patch scripts.
- The complete product/test/package inventory and remaining work are recorded
  in `docs/SESSION-STATE-2026-09-21-v170.md`. Do not redo or recount those repairs.
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

- Regression evidence and the intermittent legacy RTGS assertion are recorded
  above. The runner explicitly distinguishes SKIP from PASS.
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
