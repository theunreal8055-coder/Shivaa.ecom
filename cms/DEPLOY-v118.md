# DEPLOY v118 — Feather · Product Photos, Quick View, Categories, PayU, Performance

## Release
v118 "Feather" — mobile-first performance + gallery + checkout hardening
- __SHIVAA_REL 118 / APP_REL 118 handshake
- Build date: 2026-09-15

## Fixed / Improved (M1-M14)

1. **Category rail visible on phones (M1)**
   - .cb-img img forced visible, eager loading, SVG fallback on error
   - Shop catbar thumbnails always render

2. **Product gallery — real buttons + pointer capture (M2)**
   - Dots are `<button type="button">` not spans, accessible
   - Swipe uses `setPointerCapture` + `lostpointercapture`, translate3d GPU
   - Prev/next min 44px touch target

3. **Quick View click not pointerup (M3)**
   - Android pointerup was opening product page underneath; now captured click only
   - `pc-quick` click opens `Shivaa.quickView(pid)` without navigation

4. **PayU handoff hardened (M4)**
   - Native submit `HTMLFormElement.prototype.submit.call(f)`
   - HTTPS guard `^https://.*payu\.in/` — non-PayU blocked via throw
   - Retry/cancel controls `#payuContinue #payuCancel #payuHandoff`

5. **Responsive images srcset (M5)**
   - productCard now `srcset="...-400 400w, ...-800 800w, ... 1200w" sizes="(max-width:600px) 50vw, 25vw"`

6. **IndexedDB offline queue (M6)**
   - `shv_offline_q` store `mut` for cart/wishlist mutations when offline

7. **Lite mode + reduced-data (M7, M14)**
   - `html[data-lite="1"]` hides orbs/dust/grain
   - `navigator.connection.saveData` + `prefers-reduced-data: reduce` → `data-saveData` + `shv_lite`

8. **Catalogue windowing (M8)**
   - `#shopSentinel` + `IntersectionObserver rootMargin 400px` + chunk 20
   - `window._shop { list, wishSet, rendered, chunk:20, observer }`
   - `shopLoadMore()` exposed for tests and sentinel

9. **dvh units (M9)**
   - hero, page-hero, carousel, mnav, search-drawer use `100dvh` + `100vh` fallback + `100svh`

10. **Preloader cap 6s (M10)**
    - `#preloader` hide after 6000ms + DOMContentLoaded 6500ms guard

11. **Enterkeyhint + bottom nav legibility (M11)**
    - `#hdrSearchInput` and `#searchInput` `enterkeyhint="search"`
    - `.mnav a { font-size:11px !important }`

12. **Content-visibility (M12)**
    - Mobile `#view > section:nth-of-type(n+5) { content-visibility:auto; contain-intrinsic-size:auto 680px }`

13. **HUID chip (M13)**
    - `.pd-huid-chip` injected after PDP h1, also in v118.js MutationObserver

14. **Install chip (M4)**
    - `beforeinstallprompt` + `localStorage shv_visits` → `#shvInstallChip` with Install/Close

## Performance headers
- `.htaccess` now:
  - `mod_brotli` `BROTLI_COMPRESS` for html/css/js/json/svg/woff2
  - Immutable for `?v=` assets: `Cache-Control public, max-age=31536000, immutable` via `expr=%{QUERY_STRING} =~ /v=/`

## Shell
- `sw.js` bumped to `shivaa-shell-v118`
- `SHELL_FILES` includes `/css/v118.css?v=118` and `/js/v118.js?v=118`
- `index.html`:
  - `<link rel="preload" as="image" href="/images/products/ring-floral.jpg" fetchpriority="high">`
  - `<link rel="stylesheet" href="/css/v118.css?v=118">` blocking
  - `<script src="/js/app.js?v=118" defer>` + `<script src="/js/v118.js?v=118" defer>`
  - `<main id="view"><div class="shv-skeleton"><div class="sk-hero"></div><div class="sk-grid">4x sk-card</div></div></main>`
  - Search inputs `enterkeyhint="search"`

## Update files
Extract `shivaa-update-v118.zip` directly into Hostinger `public_html/` and overwrite when asked. It contains:

- `index.html`
- `sw.js`
- `.htaccess`
- `css/v118.css`
- `js/app.js`
- `js/v118.js`
- `DEPLOY-v118.md`

No database, product, customer, order, payment-key, or upload file is included.

After upload, close all old shivaa.in tabs on the phone and reopen. If cached, pull-to-refresh twice.

## Verification
- Master regression: `node tools/mega/smoke/v113b-check.js` — **32/32 pass**
- Performance regression: `node tools/mega/smoke/v117-check.js` — **27/27 pass** (patched to accept 118 handshake/shell for Feather continuity)
- New v118 behaviour gate: `node tools/mega/smoke/v118-check.js` — **42/42 pass** (28 static + 14 live)
- Catalogue preserved: **65 products, four images each**
- PHP routes: unchanged from v117

## Notes
- Owner rule: never fabricate supplier, payment, courier, notification, legal, BIS, HUID, GSTIN, certificate or analytics data (docs/AGENT-HANDOFF.md)
- v118.css 5.4KB, v118.js 11.8KB, app.js windowing chunk 20
- Quick View, gallery, PayU, HUID, install chip all covered by live JSDOM checks
