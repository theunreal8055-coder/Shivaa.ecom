# v168 — storage, request, navigation and offline-cache repairs

**21 Sep 2026 · source-ready on `arena/01a0c31d-shivaa-ecom` · NOT DEPLOYED**

This continues the 100-defect audit: **40 new fixes**, plus the previous ledger's
64, for **104 cumulatively recorded**. Detailed reproductions, tests and limits:
[`tools/mega/audit/DEFECT-LEDGER-v168.md`](tools/mega/audit/DEFECT-LEDGER-v168.md).

## Important safety boundary

The owner asked for code fixes and handoff updates. This session has **not**
merged to main, changed Hostinger, tested a real payment, or generated an update
ZIP. A later approved deployment should use a verified package from the release
commit, not a hand-assembled mix of old ZIPs. Back up `public_html` first.

The code release handshake is **168** throughout index/app/worker/API and all
shell CSS/JS/font query stamps. Admin dynamically follows APP_REL. The media
cache generation deliberately moves to **168** so previously cached private
uploads and HTML-as-images are removed. Never deploy this worker alone.

## Changed deployable files (relative to cms/)

- `api.php` — upload signatures + release endpoint
- `index.html`, `sw.js` — coherent release + safer scoped caches
- `js/app.js` — storage, API, route and modal boundaries
- `js/admin.js` — invoice escaping, blocked-popup recovery, honest adjustments/copy
- `js/v117.js` — fallback asset stamp
- `js/v166.js` — scoped page-side cache purge
- `js/v167.js` — label corrections
- `css/styles.css` — missing font token aliases only
- `manifest.webmanifest`, `manifest.json` — current Shivaa metadata

**Special host-managed file:** `cms/.htaccess` changes ONLY two HTML-style
comment blocks into Apache `#` comments. Review that tiny diff against the live
host's file. Do not overwrite the host-managed file wholesale or put it in an
update ZIP (existing owner rule). Until applied/verified on Hostinger, N01 is a
repository fix, not a confirmed production repair.

**Never include** `data/`, `uploads/`, credentials, customer/order records,
`work/`, test scripts or `node_modules` in a storefront update package.

## Before approving deployment

Run `npm ci` then `npm run test:regression` in `tools/mega/smoke`, plus
`node tools/mega/php-sweep/sweep.mjs` from root. Re-run the new gates on an isolated
baseline plus package overlay. Verify every packaged member equals its source
commit. This session's gates are source/fixture checks, not live production proof.

## After an approved deployment

- `/api/version` reports rel 168 and matched index/app/sw stamps.
- Desktop/mobile: shop, search containing `?`, bag, save-for-later and history.
- First staff visit to `#/admin?tab=orders` finishes loading.
- Open/replace/close a sheet: background scrolling recovers correctly.
- Checkout: one order / one gateway session, error recovery and return journey.
- Offline: no private uploads/API responses in worker caches; honest offline
  state, labelled saved catalogue, graceful cold-navigation fallback.
- Invoice: coupon and COD adjustments reconcile to the saved total; blocked
  popup gives guidance; CA reviews tax presentation.
- Valid WebM upload succeeds; wrong extension/signature combinations fail.

Rollback: owner-approved full backup restore. Do not mix individual historical
workers/scripts into the new shell, and do not restore the database just to undo
this code-only audit.
