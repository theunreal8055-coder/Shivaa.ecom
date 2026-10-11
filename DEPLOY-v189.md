# v189 — the 20% making-charges offer in three places

Release stamp: **189** (index.html, js/app.js APP_REL, sw.js SHELL/REL, api.php version).

## What changed
- The public offer now appears in **three places** for every customer, including Amrita ji:
  1. the main home banner (full card),
  2. the footer (compact),
  3. the side menu (compact).
  All three are filled by one loader from `GET /api/offers/banner`.
- It shows only when the owner has (a) ticked **Admin → Settings → Banner offer** and
  (b) entered a code for a **live** coupon: percent 20, scope *making charges*,
  no customer restriction, with the expiry and usage limit the owner sets.
  If either is missing, no offer shows anywhere (no card with a dead code).
- Amrita ji's page stays link-only (`#/amrita`), gated by its own switch.
- Dish photos and motion are unchanged from v188.

## Update file
`shivaa-update-v189.zip` (123 files, 3.66 MB), built by `tools/mega/make-v189-zip.py`.

## Checks
- `tools/mega/smoke/v189-check.js`: 9/9 (stamps, route, three placements, loader, admin, photos, reduced motion).
- Full `npm test` chain passes.
- Not run live: the PHP route and the rendered footer/sidebar (no PHP or browser here).

## Owner steps after installing
1. Coupons: create the 20% making-charges coupon (expiry + usage limit).
2. Admin → Settings: type its code under "Coupon code for the banner", tick "Banner offer", save.
