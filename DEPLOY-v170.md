# Shivaa update v170 — final desktop category navigation repair

## What this fixes

On laptop/desktop, the Categories panel could open and show all 17 categories, but another legacy event listener could prevent the selected tile's normal anchor navigation from committing. The v170 handler now owns the complete action: it closes every category overlay, directly commits the selected `#/shop?category=...` route, and explicitly redraws when the shopper selects the already-current category. Mouse, keyboard and touch activation use the same path.

## Update archive

`shivaa-update-v170.zip` contains these root-layout files:

- `api.php`
- `index.html`
- `sw.js`
- `js/app.js`
- `js/v117.js`
- `js/v166.js`

## Installation

1. Back up the current `public_html` application files.
2. Upload `shivaa-update-v170.zip` to the directory containing the live `index.html` and `api.php`.
3. Extract there and overwrite the six listed files. Do **not** extract into an extra `cms/` folder.
4. Do not replace `data/`, `uploads/`, credentials or `.htaccess`; they are not in this archive.
5. Open the site in a laptop/desktop browser, choose **Categories**, then test Rings, Necklaces and a second category. The URL must change to the selected category and the panel/backdrop must close.

The release handshake is coherent at 170 across the shell, application, API and service worker. The site's force-latest mechanism will move returning devices to the newly stamped assets.

## Verification recorded before publication

- Desktop category regression: **32/32 passed**, including slow boot, first selection, same-category repeat selection, panel/backdrop closure and the old-defect control.
- Main v169/v168 application belt: **25/25 page**, **28/28 PHP**, **39/39 boundary** and **12/12 upload-signature** checks passed.
- JavaScript syntax and whitespace checks passed.

This package changes no products, customer records, prices, rates, orders, uploads or credentials.
