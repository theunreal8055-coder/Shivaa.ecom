# v186 — Design Selection phone overflow, evidenced by owner's screenshots

**Status: PACKAGE READY, NOT DEPLOYED.** The live site was read-only checked on 28 September and reported release **185**, with matching shell/index/app/worker stamps, MySQL mirror healthy (78/78). The owner supplied Instagram in-app-browser screenshots showing Design Selection with a huge cream strip on the right and the product cards going off-screen.

## Actual cause (reproduced in local headless Chromium)

On the `#/catalogues` page at **393 CSS px**, the page's root `scrollWidth` was **675px**: the two `1fr` grid columns each inherited a **324px min-content width** from the four-photo product slider. Separately, the shared phone header measured **504px**, because its scheme link, logo and duplicate account/wishlist actions did not fit. The maroon hero itself was always viewport-width; it looked too narrow only because the rest of the document was wider. Additionally, deferred `motion.css` painted dark-red heading text on that dark hero.

v186 sets zero-minimum tracks/slider items for this route, compact phone-header actions (account and wishlist remain in the visible bottom navigation; menu/search/B2B/cart are retained), and restores a light Design Selection heading. On ≤350px phones cards become one column and the scheme link stays in the menu, so neither the logo nor finger-sized controls are squashed. No root overflow clipping; no desktop styles changed.

## Installation — delta over v185 ONLY

**File:** `shivaa-update-v186.zip` · 357,172 bytes · SHA-256 `9711205a35ae8edf34cf12a53f3beb29f4bb1b8a28083fa59964e440a5969bb7` · source commit `29a5fb7d167fc5ad1146b7cf8568be2fff4c115e`. **Five root-layout files:** `api.php`, `css/v186.css`, `index.html`, `js/app.js`, `sw.js`. This is intentionally small: it does not include v185.css, other old styles, database, SQL installer, data, uploads, credentials or the separate billing app. Do **not** use this ZIP on any live release other than **185**.

1. In a browser read `https://shivaa.in/api/version`. Stop if `rel` is not **185**, or the stamps do not match; do not overwrite a newer site. Back up `public_html` first.
2. Upload `shivaa-update-v186.zip` into the actual site's document root (`public_html/`) and extract there, overwriting **only those five files**. Do not run `upgrade-sql.php` for this visual-only patch. This agent has not deployed it.
3. Verify `/api/version` reports `rel:186` and `stamp.matched:true`, and open `/css/v186.css?v=186` directly to confirm the new sheet exists. Reopen the Instagram browser tab for the changed shell. Do not clear all app data or reinstall the PWA unnecessarily.
4. Open `https://shivaa.in/#/catalogues` on the same phone after signing in as a verified partner. Ensure no cream strip on the right or sideways panning, title is legible, filter fields and product cards fit, and image arrows, quantity, and quick-weight filters still work.

## Verification performed before packaging

- Actual Chromium 153 mobile-emulated rendering of the **real app and CSS** against an isolated synthetic partner/catalogue (no production login or data): page `scrollWidth` after patch equals viewport at **320, 360, 393, 430, 560 and 768px**. Before patch at 393px root was **675px**, header **504px**; after root and header **393px**. Browser checks also clicked product-photo arrows, quantity and filters at all six widths; **6/6 PASS**. At 320px a single card per row; 360–560px two. Title text contrast verified in computed styles and screenshot.
- The standard npm regression belt passes (v186 4/4, v185 4/4, v184 gallery 8/8, PHP/business gates); legacy v117 27/27 and v118 19/19 pass. A v185 source tree overlaid with the **five extracted ZIP files** passed v186 4/4, v185 4/4, v184 gallery 8/8, and the **six-width real-Chromium checks**. All five ZIP entries match committed source bytes.
- An emulated Chromium viewport is **not** a physical Instagram WebView. Owner's same-handset confirmation after installation remains the acceptance test; this time the overflowing page was measured before releasing the ZIP.
