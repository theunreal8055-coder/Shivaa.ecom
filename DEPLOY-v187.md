# v187 — Amrita ji's thank-you page (on the v187 line)

## Update file

- File: `shivaa-update-v187-amrita.zip` (111 files, 2.8 MB), built by
  `tools/mega/make-v187-zip.py`. Rebuild it with that script after any change.
- Packs all code and stylesheets from `cms/`, plus only the 16 media files this
  branch added or changed. Live product photos are not included.
- Uses the same exclusions as the Hostinger workflow: no data, uploads, config,
  installers or backups.
- **One exception:** `uploads/kyc/.htaccess` (the KYC lockdown) is included. The
  workflow's `uploads/**` rule would skip it, so place it by hand if you deploy by
  the workflow.
- `upgrade-sql.php` is in the ZIP. The workflow excludes it, but the SQL runtime
  needs it.
- **Name clash:** the uploaded `shivaa-update-v187.zip` (KYC lockdown and the
  v185–v186 line) is a different file from this release. Both claim 187. Pick one
  before deploying, and keep the other under a different name.
- Live is 186 (owner's report). This build is 187 and is forward from 186.
- **RAKHI20:** left as it is, as the owner asked. Scope and expiry are unchanged.


**Release 187 · built 10 Oct 2026 · NOT deployed — the owner's yes is required.**

## What this release is

v187 is the uploaded **v187** line (the v185 black member locker, the v186
black signature experience, the v187 KYC lockdown) with the **Amrita ji thank-you
page** merged in from our v184 work, plus the v187 visual polish for that page,
now carried as v187.

## How the two lines were combined

- Merge base: `7296951` (v182). Ours: main at v184 (`7d23eea`). Theirs: the uploaded
  v185–v187 ZIPs (`ef0e940`).
- Clean merges: `js/admin.js`, and the non-conflicting files, which were taken as
  they are.
- Conflicts resolved by hand:
  - `api.php`: take the uploaded side; release → 187.
  - `js/app.js`: release → 187; both the Amrita page block and the uploaded
    `wireShopPullToRefresh` (v186) are kept.
  - `index.html`, `sw.js`: the uploaded shell kept; the Amrita stylesheet and the
    v187 layer added; every stamp → 187.
  - `css/v184.css`: the two v184s differ. The uploaded file keeps the name
    `css/v184.css`; the Amrita stylesheet from main is now `css/v184-amrita.css`.
- New: `css/v187.css` (visual polish), loaded last and precached.

## Things to know before deploying

1. **Live is v186 (the owner's report).** This tree is the v187 line + Amrita, so
   it is forward from the uploaded v185–v187 line. Confirm the uploaded v186
   ZIPs are what is live before deploying.
2. **The `api.php` JSON hardening from the uploaded line is kept.** `body_json()`
   now returns 415 unless the request is `application/json`. The shop frontend
   already sends that header on every body (`api()` in `js/app.js`). The PHP test
   fixture was updated to send it too.
3. **Amrita is still dark by default.** `settings.amritaPage` is absent from the
   live database, so the page stays off until the owner ticks it in
   Admin → Settings.
4. **Main's v181–v184 work is in this tree too.** The merge brought over the
   Play Store pieces (`/api/auth/delete-account`, `.well-known/assetlinks.json`),
   the coupon-scope money fix and the Amrita routes. The uploaded line did not have
   them. Check the Play Store and money behaviour before the owner says yes, because
   the uploaded v185–v187 line never ran them.

## Tests

- `v187-check.js` — 8/8.
- `v184-php-run.js` — 18/18 (the Amrita card, the coupon scope, the kill switch).
- `v183-php-run` 9/9 · `v182-php-run` 9/9 · `v181-php-run` 6/6 · `v180-php-run` 8/8 ·
  `v179-php-run` 25/25 · `v169-php-run` 28/28 · `v168-php-run` 12/12 (N40).
- `v169-check` 24/25 and `v168-check` 33/39 — **7 failures, inherited from the
  uploaded v185–v187 line, not from this merge.** Main at v184 passes them all;
  the uploaded tree alone fails the same 7 (N02–N07 cart/wishlist/search storage
  guards, and the product-page late-response fixture). The uploaded v185–v187 code
  changed those paths. Fix them before deploying, or decide the owner accepts them.
- `v179-relay.js` — 0/7, **pre-existing** (documented in AGENTS.md).
- Test-harness change: `php-api-fixture.js` now sends `CONTENT_TYPE: application/json`,
  because the uploaded line rejects JSON writes that lack it (see item 2 above).
