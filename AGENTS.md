# Shivaa — agent working guide

## Read first

1. Newest section of `docs/AGENT-HANDOFF.md`, `MEMORY.md`, `HANDOFF.md` and
   `ARENA-STATE.md`. Older “current” banners below are historical, not a rollback
   instruction.
2. `tools/mega/audit/DEFECT-LEDGER-v168.md` and `DEPLOY-v168.md`.
3. Actual branch, diff and code. Documents have contained stale counts/labels;
   verify before repeating them.

## Current source state (21 September 2026)

- Storefront release **168**, media cache **168**.
- v167 recorded 64 fixes; v168 adds 40, **104 cumulatively recorded**.
- **Not live-verified or deployed by this session.** No update ZIP was generated.
- Current session branch: `arena/01a0c31d-shivaa-ecom`. Obey the active Arena
  session's branch restrictions; do not switch branches or merge main on the
  strength of an old handoff instruction.
- App: `cms/` (PHP 8 API, vanilla JS hash-routed SPA, JSON-backed production data).
- Do not mistake the static preview's fixture responses for a live backend.

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

- Last verified belt: **36 active suites pass, 16 retired-feature suites skip,
  0 fail**. The runner explicitly distinguishes SKIP from PASS.
- PHP can execute via the installed PHP-WASM dependency. A parser pass is not
  runtime proof; test the relevant real PHP block/endpoints too.
- New v168 regressions fail on original v167; `SMOKE_CMS` selects an isolated
  source/overlay tree. Never point mutating test fixtures at production.
- `work/` and `node_modules/` are transient/ignored. Keep reusable tests and
  findings in tracked `tools/mega/`, not only in scratch directories.
- After edits update the memory, handoff and agent guide with measured results,
  honest deployment status and remaining checks. Keep generated bulk media out
  of this audit unless the owner explicitly requests it.
