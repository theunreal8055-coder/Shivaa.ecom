# v183 — Mobile responsive recovery + Design Selection phone pass

**Release:** 183 · **Built:** 4 Oct 2026 · **Status:** prepared, **not deployed**
**Earlier update:** v122 is the release most directly tied to the Design Selection desk. Its desk markup, filters, billing and mobile sticky-bar work are still present in the current source; the issue was not traced to a deleted stylesheet or proven file mismatch. v113–v121 contain broader mobile foundations.
**Prerequisite:** live **v182 or newer** for the standard v183-only layout update. Check the live release before installing.

## What changed

This is a forward-only, additive responsive pass. It keeps the existing responsive layers and appends `css/v183.css` last; no existing stylesheet was removed. The app gains semantic hooks on the Design Selection filters and a fluid desk heading size.

- Site-wide small-screen guards: zero-minimum grid tracks, shrinkable media/forms, scrollable wide table wrappers, and safe-area/reduced-motion handling.
- Design Selection: two-column filter layout with full-width search/weight/quick-filter rows, a properly shrinkable min/max weight pair, a reflowed bill summary, 44px quantity/slider targets, and a compact horizontal product card at 390px and below.
- The desk's billing arithmetic, partner gates, API routes, prices and media are unchanged. `MEDIA` cache generation deliberately stays at v168.

The desk layout is covered by a jsdom regression, but **a real-browser visual pass has not been run**. An isolated Arena preview is available with 12 synthetic designs and no customer/order records. To inspect the partner desk in that preview only, sign in as `preview-partner@example.test` with password `shivaa123`, then open Design Selection. Do not use that demo login on the live site. Please check the layout on a phone before production; this release does not claim every route has been visually certified on every device.

## Earlier work and file-mismatch check

The desk-specific origin is v122; adjacent mobile improvements were added across v113–v121. Those styles are still linked from the present `index.html`, and v122’s search/sort, sticky-bar and billing behavior still passes its regression suite. That evidence does not establish that an earlier deployed copy has the same files, so verify the live release and asset availability before concluding what happened on the live site.

## Package

**File:** `shivaa-update-v183.zip` · **7 files** · **458,680 bytes**
**SHA-256:** `3a5b5ae1f42c7d60c40b7cf80dd97f50c52bc7d7a242fc8fee1e961dfb86302a`
**Layout:** ZIP root is relative to the existing CMS web root (`public_html/`).

| File | Purpose |
|---|---|
| `css/v183.css` | New final responsive layer |
| `index.html` | Release and asset stamps to 183; appends the new CSS |
| `js/app.js` | `APP_REL=183`, Design Selection layout hooks and fluid heading |
| `sw.js` | Shell/REL and precache stamps to 183; precaches v183 CSS |
| `api.php` | Version endpoint reports rel 183 (no route/business-logic change) |
| `js/admin.js` | Carries forward the v182 admin code unchanged |
| `upgrade-sql.php` | Carries forward the v182 idempotent reconciler unchanged |

The latter two files are included so the package keeps the known v182 application set together. **Do not run `upgrade-sql.php` for a live v182+ site just because it is in the ZIP.** The v183 layout change adds no database schema.

Build with `python3 tools/mega/make-v183-zip.py` (defaults to the working tree) or pass a commit-ish after the release changes are committed.

## Install only after explicit owner approval

No deployment has been started. A merge, package build or successful test is not deployment approval.

1. Open `https://shivaa.in/api/version` and confirm the live release.
2. Take a complete `public_html` backup.
3. If live is **v182 or newer**, extract the ZIP into `public_html/`, allowing overwrite. Do **not** run the SQL reconciler for this CSS-only increment.
4. If live is **v181**, the ZIP also brings forward v182’s app/API/admin code. Back up first, then complete the v182 `upgrade-sql.php` procedure after extraction, as documented in [`DEPLOY-v182.md`](DEPLOY-v182.md). Stop and investigate if the live release is older than v181; do not skip prerequisites.
5. Verify `/api/version` reports rel 183 with matched index/app/worker stamps. Hard-refresh once; an installed PWA may need its old tab closed and reopened after the new service worker activates.

## QA recorded

- `v183-check.js`: **6 passed**.
- v122 partner desk behavior on the v183 package overlay: **22/22 passed** (jsdom; includes full catalogue render, filters, bill bar, billing modal and slider interaction).
- v182–v168 API/static suites on the package overlay: passed; package included v182's unchanged schema files.
- `npm run test:regression`: **43 suites passed, 24 retired-feature suites skipped, 0 failed**.
- The full `npm test` chain passed its release/API checks through v179 PHP, then the separate v179 relay integration suite failed all 7 live-frame tests (it logged in and resolved contracts but timed out waiting for live ticks/SSE). The relay files were not changed by v183. This is an unresolved pre-existing integration check; the suite is not reported as wholly green.
- PHP CLI is unavailable in this sandbox; the v182–v168 PHP checks ran through the repository's php-wasm harness.
- No real-browser screenshot/visual comparison has been performed, and **nothing has been deployed**.

## Rollback

Restore the full `public_html` backup. Do not roll a newer live installation back to an older branch or package without checking the release and database state first.
