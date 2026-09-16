# SHIVAA v124 — PUNACH + NEW IN SLIDER FACES (2026-09-16)

**Release:** v124 · two homepage/shop category-slider faces replaced with
owner-supplied photos + cache-bust to `?v=124` + shell/handshake 124.
**Zip:** `shivaa-update-v124.zip` — extracts straight into `public_html` (root layout).
Rates untouched (`premium.gold22=398` lock); `api.php`, `.htaccess`, `db.json` NOT in this zip.

## WHAT IS NEW
1. **Punach** (`images/categories/punach.jpg`) — now the owner's own kundan kada
   pair photo (`ponchi-500x500.jpg`, uploaded to `main` in `2cadc34`), AI-cleaned to a
   plain cream field and finalised 420×420 centred on the jewellery. This replaces the
   v123 tile the previous session itself flagged as *"forced leftover fit — swap on
   owner's word"*. Nothing else in the 17 faces moved.
2. **New In** chip in the same slider — now has its own face
   (`images/categories/newin.jpg`, from the owner's `e94d7c530ea31e50aeed8df7d9200fc0.jpg`).
   It used to borrow a product photograph (`images/products/mangalsutra-modern.jpg`).
   That product file is untouched and still on disk; a product image is simply no
   longer used as category art.
3. **Cache-bust:** every category photo URL on all six render sites (home catbar,
   shop catbar, home mini-cards, search suggestions ×2, mega tile, drawer list) + the
   pre-boot `v116` list now carries `?v=124` — including the `&v=` branch used when a
   URL already has a query string. Phones cannot keep showing the v123 faces.
4. **Release wiring:** `__SHIVAA_REL` / `APP_REL` / service-worker shell all **124**
   (`shivaa-shell-v124`); SW precache carries `app.js?v=124` + `v116.js?v=124`.
   The media cache deliberately stays `shivaa-media-v120` — the `?v=` change already
   forces a refetch of these two files, so no phone loses its cached product photos.

## ZIP CONTENTS (7 files, root layout)
    index.html  sw.js  DEPLOY-v124.md
    js/app.js  js/v116.js
    images/categories/punach.jpg  images/categories/newin.jpg

## DEPLOY (Hostinger, ~2 min)
1. Back up: download the current `public_html` as a zip from hPanel first.
2. Extract THIS zip into `public_html` (overwrite when asked). Nothing in
   `data/`, `uploads/` or product photos is touched — the zip contains none of them.
3. Done. Returning shoppers pick it up via the renamed shell
   (`shivaa-shell-v124`); the update banner offers one-tap activate.

## OWNER PHONE PASS (1 min)
- Close ALL shivaa.in tabs, reopen fresh (or pull-to-refresh twice).
- Home: scroll the category slider — the **Punach** tile shows the kada pair, the
  **New In** tile shows the new photo. Tap both; the shop-page slider must match.

## LIVE CHECKS (any browser)
- `https://shivaa.in/sw.js` contains `shivaa-shell-v124`.
- View-source of the home page: `/js/app.js?v=124` and `/js/v116.js?v=124`.
- `https://shivaa.in/images/categories/punach.jpg?v=124` and
  `.../newin.jpg?v=124` both return the new square photos (not 404, not the SPA page).

## PROOF (run on this tree)
v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · v121 14/14 ·
v122 22/22 · v123 14/14 · **v124 20/20** · php-sweep 211 routes · 0 exceptions.
All re-run on the extracted zip overlay. The v124 gate asserts: the exact 124 triple,
**no stale 123 in either the `?v=` or `&v=` branch**, all six render sites, 18 faces on
disk each exactly 420×420 baseline JPEG, `punach.jpg` actually changed off the v123
bytes, the New In chip on its own face with the product photo left in place, the
two-stage logo fallback, the monogram underlay, and a jsdom boot where home + shop
render both new faces.

## ROLLBACK
Restore `cms/images/categories/punach.jpg` from `git show bfc3908:cms/images/categories/punach.jpg`
(the v123 leaf-chain face), delete `newin.jpg`, and re-point the New In chip at its old
image — or simply extract `shivaa-update-v123.zip` over the top, which rolls the stamps
back to 123 with the v123 faces.
