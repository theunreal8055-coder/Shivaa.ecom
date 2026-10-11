# v188 — public banner offer, Amrita ji's dish photos, motion pass

Release stamp: **188** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).

## What changed
- **Banner offer for every customer (20% off making charges).** A card on the main
  home banner, visible to all customers including Amrita ji. It shows only when:
  1. Admin → Settings → "Banner offer" is ticked, and
  2. the coupon code typed in that field is a live coupon in **Coupons**
     (percent type, value 20, scope *making charges*, no customer restriction,
     with the expiry date and usage limit the owner wants).
  The route is `GET /api/offers/banner`; it returns only the code and percent.
- **Amrita ji's page is link-only.** Its home card is removed. It opens only from
  `shivaa.in/#/amrita`. Its Settings switch (amritaPage) is unchanged.
- **Amrita dish cards** show the three real photos (idli sambhar, dosa, paneer
  butter masala with laccha paratha), in WebP and JPEG, with mobile sizes.
- **Motion:** a sweep and entrance on the offer card, a hover zoom on dish photos.
  Everything is switched off under `prefers-reduced-motion`.

## Image sizes (honest note)
The photos received are 452–678 px on their longest side, so the largest files are
the original size and are not truly Full HD. For real Full HD, send the original
high-resolution photos and they will be swapped in with the same file names.

## Update file
`shivaa-update-v188.zip` (124 files, 3.66 MB), built by `tools/mega/make-v188-zip.py`.
Same exclusions as the deploy workflow. It includes `uploads/kyc/.htaccess` and
`.well-known/.htaccess` (the workflow would skip them), and the Amrita photos.

## Checks
- `tools/mega/smoke/v188-check.js` — 8/8 (stamps, route gating, home card removed,
  admin fields, photos present, reduced-motion guard).
- The full `npm test` chain passes.
- Live PHP route behaviour was not run here (no PHP in the sandbox). Test
  `GET /api/offers/banner` once after installing.

## Not done by this release
- No deploy. Production goes live only with the owner's explicit yes.
- The 20% offer stays OFF until the owner creates the coupon and ticks the switch.
