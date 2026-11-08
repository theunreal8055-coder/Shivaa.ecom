# DEPLOY-v221.md — D2C Speed & Button Geometry Lock Release (Zomato / Uber Feel)

**Status:** Built and pushed to branch `arena/afef1f10-shivaa-ecom` — **NOT LIVE**.
Live site remains **v205**. Deploy only after explicit owner approval.
Next release number: **v222**.

## Package Details

- **File:** `shivaa-update-v221.zip`
- **File count:** 351 files (includes `css/v221.css`, `js/v221.js`, `images/films/` 18 files, `images/offers/` 4 files; zero `data/` files)
- **Size:** 37,058,142 bytes (~37.06 MB)
- **SHA-256:** `27b26d3fc311f72bc21fe22b340ac73d3fca8353087f487561b17d3a8eedeaba`
- **Direct download link (after push):**
  https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/afef1f10-shivaa-ecom/shivaa-update-v221.zip

---

## What v221 Fixes

### 1. Buttons No Longer Leave Their Spaces or Expand on Click
- **Removed 3 competing ripple/particle DOM injectors (`v194.js`, `aurum.js`, `motion.js`):**
  - `cms/js/v194.js` previously called `window.getComputedStyle(el)` synchronously on every `pointerdown`, mutated `el.style.position = 'relative'` and `el.style.overflow = 'hidden'` inline on flex buttons (altering CSS Flexbox automatic minimum sizing and clipping header badges), and injected 300px `<span class="v194-rip">` nodes.
  - `cms/js/aurum.js` (`ripples()`) previously added `.au-rip-host { position: relative; overflow: hidden; }` on `pointerdown` to `.cb-arrow`, `.gal-nav`, `.c-arrow`, `.pc-quick` (stripping their `position: absolute` so they jumped out of their layout slots) and injected `<span class="au-rip">` + `<span class="au-p">` particles.
  - `cms/js/motion.js` previously injected `<span class="rip" style="width:300px;height:300px">` into `.btn` on `pointerdown`.
- **Removed 3 competing magnetic-pull button handlers (`app.js` `bindMagnetic`, `motion.js`, `aurum.js`):**
  - Buttons (`.btn-primary`, `.btn-gold`, `.btn-outline`, `#cartBtn`, `#wishBtn`, `.wa-fab`, `#backTop`, `.mnav a.on`) are no longer pulled out of their layout spaces with inline `translate3d(dx, dy, 0)` transforms.
- **Fixed `:hover` and `:active` transform overrides (`mobile.css`, `aurum.css`, `v221.css`):**
  - Replaced the blanket `@media (pointer: coarse) { *:hover { transform: none !important; } }` in `cms/css/mobile.css` and `:active` rules in `cms/css/aurum.css` that wiped out `translateY(-50%)` on centered arrows (`.c-arrow`, `.gal-nav`).
  - Added `cms/css/v221.css` and `cms/js/v221.js` to lock button geometry (`box-sizing: border-box; flex-shrink: 0`), keep header icon badges unclipped (`overflow: visible !important`), and use compositor-only press feedback (`transform: scale(.97)`).

### 2. Fast Initial Load & Snappy Navigation (Zomato / Uber D2C Responsiveness)
- **Unblocked `DOMContentLoaded` (`cms/index.html`):**
  - Removed the render-blocking `<script src="https://sdk.cashfree.com/js/v3/cashfree.js" defer></script>` tag from `<head>` (`cms/js/app.js` already lazy-loads the Cashfree SDK on demand via `loadExternalScript(...)` when checkout starts).
- **Eliminated 550–1,300ms `getComputedStyle(nav)` Click Freezes (`cms/js/aurum.js`):**
  - `bottomNav()` `move()` no longer calls `getComputedStyle(nav)` across 50+ stylesheets on every body class toggle (`drawer-open`, `cart-open`, `wish-open`) or route sweep; it checks `window.innerWidth <= 820` and `nav.getBoundingClientRect().width` first and observes `data-page` only.
- **Eliminated Full-DOM `cloneNode(true)` on Route Changes (`cms/js/aurum.js`):**
  - Retired `pageTransitions()` `Object.defineProperty(view, 'innerHTML', ...)` which cloned the entire outgoing `#view` DOM tree (`.au-vt`) onto `document.body` on every route change.
- **Removed Stacked `opacity: 0` Gates & Double-Render Skeleton Flash (`cms/css/v221.css`, `cms/js/motion.js`, `cms/js/aurum.js`, `cms/js/app.js`):**
  - Sections (`.rv`), grids (`.p-grid > *`, `.cat-grid > *`), `.au-rise`, and `#view img` now paint immediately at `opacity: 1` on frame 1.
  - `pages.product` only paints `.skeleton` if `getProductDetail(id)` takes > 80ms, preventing double `#view.innerHTML` replacements when product data is prefetched or fast.
  - `boot()` adopts `prods.rates` immediately, uses a faster preloader fade (180ms), and hydrates late batch responses in-place without re-firing all 6 API calls via `boot(true)`.
- **Stopped 1s / 2.5s `innerHTML` & `MutationObserver` Churn (`cms/js/app.js`, `cms/js/v107.js`):**
  - `bindCountdown` and `bindFinaleCd` update `.fc-cell b` text nodes in place instead of rewriting `innerHTML` every second.
  - `v107.js` `renderTicker()` skips `innerHTML` rewrites when rate values are unchanged, and `designDetail()` / `otpChannelLine()` inspect `addedNodes` before scheduling work.
  - Guarded all `IntersectionObserver` and `fetch` calls (`app.js`, `v166.js`).

---

## QA Verification (Sandbox)

- `node --check` on all `cms/js/*.js`: **PASS**
- `node qa/browser/t-v221-speed-buttons.mjs`: **17 PASS / 0 FAIL** (9 core button clicks complete in ~58ms; zero ripple/particle spans; zero inline position/overflow/transform mutations)
- `node qa/browser/t-v220-billing-gone.mjs`: **13 PASS / 0 FAIL**
- `node qa/browser/t-v209-alive.mjs`: **96 PASS / 0 FAIL**
- `node qa/browser/t-v206-flip.mjs`: **ALL PASS**
- `node qa/browser/t7-audit.mjs`: **4 PASS / 0 FAIL** (51 internal routes, 145 buttons clicked, 31 product controls, 0 errors in ~15s)
- `node qa/browser/t-v218-sidebar.mjs`: **13 PASS / 0 FAIL**
- `node qa/browser/t-v219-depth.mjs`: **22 PASS / 0 FAIL**

*Note: Real phone/browser visual verification and server-side PHP (`php -l`, live Hostinger upload) cannot run inside the sandbox and require owner verification after approval.*
