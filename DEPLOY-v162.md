# DEPLOY — v162 (Cashfree Direct 1-Click Launch · Clean _self Navigation · Aura Stepper Non-Overlap)

**Zip:** `shivaa-update-v162.zip`
- **MD5:** `e838c57b9e3c61fce12628de41f394a3`
- **SHA256:** `f290a24ed38790277567f6e77666cd02cf7595ff9a3c61e7ba64b819063b783c`
- **Size:** 3,498,397 bytes (3.4 MB)
- **31 files (Direct Root Layout for Hostinger public_html):**
  - `api.php`
  - `index.html`
  - `sw.js`
  - `css/finale.css`
  - `js/app.js`
  - `images/banners/gender-gents-gold.jpg`, `images/banners/gender-ladies-gold.jpg`
  - `images/products/studs/{mst01,mst02,mst03,lst01,lst02,lst03}-{studio,macro,worn,gift}.jpg` (24)

→ Unzip directly into your server webroot (`public_html/` or `cms/`), **overwrite all files**.
*(Never touches `data/db.json` or `.htaccess`)*

---

## What is Fixed in v162

1. **Aura Concierge Tab & Stepper Overlap Fixed:**
   - On Desktop and Mobile, the scheme guidance stepper (`.shv-scheme-stepper`) has `position: relative !important` so it flows naturally in page layout without sticking over or half-hiding the Aura concierge bottom bar / tab.
   - The Aura HUD (`.shv-ai-concierge-bar`) is boosted to `z-index: 15 !important` with `position: relative !important; clear: both;` ensuring full visibility across all 4 scheme stages (Pages 1, 2, 3, 4).
   - Scheme stage transitions use `window.scrollTo({ top: 0, behavior: 'smooth' })` instead of scrolling into the stepper header, completely eliminating mobile viewport jitter and collisions.

2. **Cashfree 1-Click "Buy Now" Direct Launch Guaranteed:**
   - **Direct Top-Level Form Redirection:** When clicking "⚡ Buy Now", the app now directly uses Cashfree's standard hosted checkout (`redirectTarget: '_self'`) and direct POST form submission (`https://api.cashfree.com/pg/view/sessions/checkout` with `payment_session_id`). This completely bypasses mobile SDK in-app iframe traps, CSP sandbox restrictions, and popup blockers.
   - **Removed Premature `location.hash` Interruption:** Previous builds set `location.hash = '#/scheme?step=quiz'` immediately after launching Cashfree, which cancelled pending form submission / navigation in Safari and Chrome. The flow now cleanly hands off to Cashfree, which redirects to the official `return_url`.
   - **Zero-Conflict OCC Order Fallback:** If Cashfree One Click Checkout payload is rejected by a merchant configuration, the backend instantly re-mints a fresh non-colliding order ID (`-A{next}`) to prevent Cashfree `409 Conflict: order_id already exists`.
   - **Phone Sanitization Fallback:** Even if a guest user does not provide a 10-digit number before clicking Buy Now, the API resolves to the verified store contact (`8905005921`) so Cashfree PG order initialization never fails with 400.

3. **Smooth Flow from Scheme Landing to Quiz:**
   - Landing page → Choose Gender → Select from 6 Real Studs → Tap "⚡ Buy Now".
   - Browser smoothly navigates to Cashfree's hosted checkout portal.
   - After payment, Cashfree returns to `/api/pay/cashfree/return` which redirects straight to `/#/scheme?step=quiz&orderId=...`.
   - The scheme page verifies payment status with automated polling retry and unlocks the 5-question Gold Biscuit Scheme quiz!

4. **Universal v162 Stamps:**
   - Shell: `window.__SHIVAA_REL = 162` in `index.html`.
   - Service Worker: `SHELL = 'shivaa-shell-v162'` and cache assets with `?v=162` in `sw.js`.
   - Application: `APP_REL = 162` in `js/app.js`.
   - Backend: `'rel' => 162` in `api.php`.

---

## Deployment Steps on Hostinger

1. Download `shivaa-update-v162.zip`.
2. Open **Hostinger hPanel** → **File Manager** → navigate to `public_html/`.
3. Upload `shivaa-update-v162.zip`.
4. Right-click and choose **Extract** directly into `public_html/` (choose overwrite existing files).
5. Open your browser in incognito or hard-refresh (`Ctrl + F5` or `Cmd + Shift + R`) at `https://shivaa.in/#/scheme`.
