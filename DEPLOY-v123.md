# SHIVAA v123 — CATEGORY PHOTO REFRESH (2026-09-16)

**Release:** v123 · all 17 homepage/shop category tiles replaced with AI-cleaned
owner photos + cache-bust to `?v=123` + shell/handshake 123.
**Zip:** `shivaa-update-v123.zip` — extracts straight into `public_html` (root layout).
Rates untouched (`premium.gold22=398` lock); `api.php`, `.htaccess`, `db.json` NOT in this zip.

## WHAT IS NEW / FIXED
1. **All 17 category tiles are real photos now** (was: 16 branded placeholders +
   1 real). Every photo is the owner's own shot, AI-cleaned: third-party
   watermarks/ad text removed (NAKODA, MAHAKALI, nakodapayal, chhatralajewels,
   "Kada Payal"), squared to 420×420 and centred circle-crop-safe. Jewellery in
   each tile is byte-faithful to the owner's photo (design, stones, finish).
2. **Cache-bust:** every category photo URL on all six render sites (home catbar,
   shop catbar, home mini-cards, search suggestions ×2, mega tile, drawer list,
   pre-boot v116 list) now carries `?v=123`, so phones cannot keep showing the
   old placeholders. The logo-then-hide fallback chain and the monogram underlay
   are unchanged.
3. **Release wiring:** `__SHIVAA_REL` / `APP_REL` / service-worker shell all 123
   (`shivaa-shell-v123`); SW precache carries `app.js?v=123` + `v116.js?v=123`.

## ZIP CONTENTS (22 files, root layout)
    index.html  sw.js  DEPLOY-v123.md
    js/app.js  js/v116.js
    images/categories/*.jpg   (all 17 tiles)

## DEPLOY (Hostinger, ~2 min)
1. Back up: download the current `public_html` as a zip from hPanel first.
2. Extract THIS zip into `public_html` (overwrite when asked). Nothing in
   `data/`, `uploads/` or product photos is touched — the zip contains none of them.
3. Done. Returning shoppers pick it up via the renamed shell
   (`shivaa-shell-v123`); the update banner offers one-tap activate.

## OWNER PHONE PASS (2 min)
- Close ALL shivaa.in tabs, reopen fresh (or pull-to-refresh twice).
- Home: the round category tiles now show real photos on every tile;
  scroll the slider end to end; tap Rings + Silver + Sheesh Phool.
- Shop page: the same slider under the toolbar shows the same photos.
- Start a search: the *Shop by category* rows show photos.

## LIVE CHECKS (any browser)
- `https://shivaa.in/sw.js` contains `shivaa-shell-v123`.
- View-source of the home page: `/js/app.js?v=123` and `/js/v116.js?v=123`.
- Any category tile image URL ends `?v=123`.

## PROOF (run on this tree)
v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · v121 14/14 ·
v122 22/22 · **v123 14/14** · php-sweep 211 routes · 0 exceptions.
The v123 gate asserts: consistent 123 triple, all six render sites at `?v=123`,
v116 pre-boot list at `?v=123`, all 17 tile files on disk, fallback chain and
monogram underlay intact, rates lock (398) intact, and a jsdom boot where home
+ shop tiles render `?v=123` with the two-stage logo fallback.

## ROLLBACK
Extract `shivaa-update-v122.zip` over the top AND restore the old 17 placeholder
tiles from git history (`git show 2ad3bad:cms/images/categories/<key>.jpg` —
that is the tip of PR #47, before any v123 photo work). The release stamps roll
back with the v122 zip.
