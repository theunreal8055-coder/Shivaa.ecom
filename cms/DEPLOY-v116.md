# DEPLOY v116 — Comprehensive Bug Fixes

## What this fixes

### 1. Categories Button (FIXED)
- **Problem:** Categories button in the navigation drawer did nothing on mobile phones
- **Root cause:** The button wiring was inside `boot()` which waits for API calls. On slow networks, the button appeared dead
- **Fix:** Added early wiring in `v116.js` that works before boot completes. Mega panel positioning also fixed (`--headerH` set immediately)

### 2. Hero Slider / Carousel (FIXED)
- **Problem:** Banner slides did not auto-advance; swiping was unreliable on Android Chrome
- **Root cause:** Multiple `visibilitychange` event listeners were stacked on every home page visit, causing timer conflicts. CSS `will-change` was missing for smooth GPU transitions
- **Fix:** Deduplicated visibilitychange listener in `app.js`. Added `will-change: transform` and `backface-visibility: hidden` in CSS. Improved touch targets (44px minimum) on mobile

### 3. Quick View Button (FIXED)
- **Problem:** Quick view button on product cards did not work on mobile
- **Root cause:** The button's `onclick` attribute was being swallowed by the parent `<a>` link's navigation on some Android browsers. The `stopPropagation()` in the inline handler didn't always fire before the link navigation
- **Fix:** Added a capture-phase delegated event listener in `v116.js` that beats the parent link handler. Also added debounce to prevent double-taps

### 4. Payment Gateway (FIXED)
- **Problem:** Online payment appeared broken
- **Root cause:** PayU keys were not configured in admin settings, so the mode fell back to UPI QR. The checkout showed a confusing "demo" message
- **Fix:** Better error messages and payment option descriptions. Touch-friendly payment radio buttons (44px targets). Form inputs set to `font-size: 16px` to prevent iOS zoom on focus

### 5. Other fixes
- **Service Worker cache mismatch:** SW now precaches v116 files correctly
- **Release handshake bumped to v116:** Ensures phones get fresh code
- **Drawer category links:** Now properly close the drawer on tap
- **Double-tap zoom prevention:** All buttons carry `touch-action: manipulation`
- **Header height variable:** Set immediately on load (not just on resize)
- **Compare/Wishlist buttons:** Same capture-phase fix as Quick View
- **Image fallbacks:** Delegated to existing app.js broken-image net

## Files changed

| File | Change |
|------|--------|
| `cms/index.html` | Added v116.css + v116.js references; bumped `__SHIVAA_REL` to 116 |
| `cms/js/app.js` | Fixed carousel visibility listener leak; bumped `APP_REL` to 116 |
| `cms/js/v116.js` | **NEW** — comprehensive JS patch layer |
| `cms/css/v116.css` | **NEW** — comprehensive CSS fix layer |
| `cms/sw.js` | Updated shell to v116; added v116 files to precache |

## Deploy steps

1. Upload these 5 files to Hostinger `public_html/`:
   - `index.html` (root)
   - `js/app.js`
   - `js/v116.js`
   - `css/v116.css`
   - `sw.js` (root)

2. **OR** extract `shivaa-update-v116.zip` to `public_html/`

3. After upload, on your phone:
   - Close ALL Chrome tabs of shivaa.in
   - Reopen fresh (or pull-to-refresh twice)
   - If still seeing old version: Site Settings → Clear & reset

## Payment gateway setup

To enable live PayU payments:
1. Log into Admin panel (#/admin)
2. Go to Settings → Payment
3. Enter your PayU Merchant Key and Salt
4. Select "Test" or "Production" environment
5. Save

Without PayU keys, the site uses UPI QR code payment (which works correctly).
