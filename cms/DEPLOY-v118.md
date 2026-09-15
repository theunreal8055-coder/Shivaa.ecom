# DEPLOY v118 — Product Photos, Quick View, Categories and PayU

## Fixed

1. **Product page: all four photos now slide reliably**
   - Previous/next arrows and photo dots are real, touch-friendly controls.
   - Swipe/drag uses pointer capture, so the gesture does not get lost when a finger leaves the photo area.
   - Vertical scrolling is preserved; horizontal swipes move one photo.

2. **Quick View no longer opens the full product page**
   - Android was opening Quick View during `pointerup`, before the browser's final click. That click could then land on the product link underneath.
   - Quick View now opens on the final captured `click`, stops navigation, and opens only once.

3. **Category links no longer leave a blank/vanished page**
   - Category names are guarded against invalid/stale links.
   - Selecting the same category again explicitly redraws it.
   - Categories without products show the honest “being catalogued” page and a link to the 65 available rings; no products were invented or deleted.

4. **Category thumbnails now show on phones**
   - Category rail pictures are loaded eagerly, have a logo fallback, and are explicitly kept visible by the mobile release CSS.

5. **PayU can no longer trap the shopper behind an endless spinner**
   - The handoff submits through the browser's native form method to the HTTPS PayU host.
   - The handoff screen includes **Continue to PayU**, **Try PayU again**, and **Return to my order** controls.
   - Invalid/non-PayU payment destinations are blocked.

## Update files

Extract `shivaa-update-v118.zip` directly into Hostinger `public_html/` and overwrite when asked. It contains:

- `index.html`
- `sw.js`
- `js/app.js`
- `js/v116.js`
- `js/v118.js`
- `css/v118.css`
- `DEPLOY-v118.md`

No database, product, customer, order, payment-key, or upload file is included.

After upload, close all old shivaa.in tabs on the phone and reopen the site. If an old tab remains cached, pull-to-refresh twice.

## Verification

- Master regression: `v113b-check.js` — **32/32 pass**
- Performance regression: `v117-check.js` — **27/27 pass**
- New v118 behaviour gate: `v118-check.js` — **18/18 pass**
- PHP route sweep: **211 routes, 0 exceptions**
- Catalogue preserved: **65 products, four images each**
