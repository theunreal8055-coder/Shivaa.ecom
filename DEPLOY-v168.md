# v168 — storage, request, navigation and offline-cache repairs

**21 Sep 2026 · packaged on `arena/01a0c31d-shivaa-ecom` · NOT DEPLOYED**

This continues the 100-defect audit: **40 new fixes**, plus the previous ledger's
64, for **104 cumulatively recorded**. Detailed reproductions, tests and limits:
[`tools/mega/audit/DEFECT-LEDGER-v168.md`](tools/mega/audit/DEFECT-LEDGER-v168.md).

## Important safety boundary

The owner subsequently requested a direct GitHub update-file link. The package
is **`shivaa-update-v168.zip`**, built from source commit
`e5b2905de68e99b45508f1d58496610cb223b453` and verified byte-for-byte.

- **17 files · 539,228 bytes** (includes the cumulative v166–v168 code-file union).
- Requires an existing full **v165-or-newer CMS**, not an empty server folder.
- **SHA-256:** `efaa0f46035296cc4296cb06954d6fcf72248880c4334cf1f81e8d00cc62478f`
- [Download ZIP on GitHub](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/refs/heads/arena/01a0c31d-shivaa-ecom/shivaa-update-v168.zip)
  (private repository: sign in with an account that has access).

**Back up your website first.** Upload/extract into the existing website folder
that contains `index.html` and `api.php` (usually `public_html`, or
`public_html/cms` if that is your installation). The ZIP has root-relative
members, **no extra `cms/` folder**. Replace code files only. Do not extract just
the worker or mix this with an older update.

**No merge to main, Hostinger change, or real payment was performed.**

### Package verification

Isolated original-v167 CMS + ZIP overlay, with the **separate** host-comment
repair applied in the sandbox: new boundaries **39/39**, executed signatures
**12/12**, v167 **36/36**, executed v164 catalogue/payment PHP **17/17**,
direct checkout **24/24**. `.htaccess` is NOT in the ZIP; the Apache-comment
check in that overlay specifically verifies the separate repair, not a packaged
member. No fixture DB writes were made to the repository/live site.

Rebuild exactly: `python3 tools/mega/make-v168-zip.py e5b2905`.

The code release handshake is **168** throughout index/app/worker/API and all
shell CSS/JS/font query stamps. Admin dynamically follows APP_REL. The media
cache generation deliberately moves to **168** so previously cached private
uploads and HTML-as-images are removed. Never deploy this worker alone.

## Current changed deployable files (relative to cms/)

- `api.php` — upload signatures + release endpoint
- `index.html`, `sw.js` — coherent release + safer scoped caches
- `js/app.js` — storage, API, route and modal boundaries
- `js/admin.js` — invoice escaping, blocked-popup recovery, honest adjustments/copy
- `js/v117.js` — fallback asset stamp
- `js/v166.js` — scoped page-side cache purge
- `js/v167.js` — label corrections
- `css/styles.css` — missing font token aliases only
- `manifest.webmanifest`, `manifest.json` — current Shivaa metadata

The ZIP also includes the unchanged-at-v168 v166/v167 repair files
`css/fonts.css`, `css/v167.css`, `js/auth.js`, `js/hallmark.js`,
`js/v116.js`, and `js/v125.js` so their earlier audit repairs are not omitted.

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
