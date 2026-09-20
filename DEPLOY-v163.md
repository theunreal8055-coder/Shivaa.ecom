# DEPLOY — v163 (Root Cause Fixed: Gold Scheme Cashfree One Click Checkout Portal Launch)

**Zip:** `shivaa-update-v163.zip`
- **MD5:** `90ce5816f54d3c65187968dc029d3ba8`
- **SHA256:** `c034eb52a3d58dfe8d3ec3bfeb3afea50a1356c2293a1f6be72aae68e5ef590b`
- **Size:** 3,498,154 bytes (3.4 MB)
- **31 files (Root layout for Hostinger public_html):**
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

## Root Cause Analysis: Why Scheme Page Was Stopping Cashfree One Click Checkout

You observed:
> *"Cash free one click check out is opening on all of the products accept the scheme page why is scheme page stopping the cash fre portal to being opened automatically..."*

Here is the exact root cause discovered upon comparing the regular products engine vs the scheme page:

1. **Premature `location.hash` Page Teardown (Primary Culprit):**
   - On normal products, when a customer clicks *"✦ Make It Yours"*, `exRunBuy` runs `exHandoff` and calls `cashfreeCheckout`. It does **not** change `location.hash`. The page stays completely still, allowing Cashfree SDK to mount its in-app One Click Checkout modal / redirect.
   - On the scheme page, previous versions executed `location.hash = '#/scheme?step=quiz&orderId=...'` immediately after invoking `cashfreeCheckout`.
   - In modern browsers, changing `location.hash` triggers the router immediately, which re-rendered the scheme page (`view.innerHTML = finaleLanding()`). This **wiped the DOM** and immediately aborted / killed the Cashfree One Click Checkout modal right as it was mounting, bouncing the customer back to the products step!

2. **Tampered Boundary Address Failing `$exSig`:**
   - Normal products send `{ ...EX_BOUNDARY }` (`Valued Customer`, `9999999999`, `Collected on Cashfree (verified address)`). This matches `$exSig` on `api.php`, instructing the server that Cashfree One Click Checkout will collect & verify the customer's real number and address on Cashfree's side.
   - The scheme page had custom phone/name logic that replaced `addr.phone` with saved values, causing `$exSig` to fail on the server, which blocked guest express order placement.

3. **PHP Worker Lifecycle Fatal on Return (`finale_qualifies` Scope):**
   - In `api.php`, `function finale_qualifies` was declared inside the `if ($route === 'finale/quiz')` block, but was called at line 4505 in `/api/pay/cashfree/return`. In PHP, if `finale/quiz` had not been called in that worker, calling `finale_qualifies` threw an unhandled fatal error, breaking the return redirect.

---

## Exact Fixes Applied in v163

1. **Identical Silent 1-Click Launch on Scheme Page:**
   - `window.Shivaa.buyCampaignStud` now uses the exact same canonical boundary signature (`{ ...EX_BOUNDARY }`) and silent handoff flow as all other products.
   - Removed any premature `location.hash` navigation on the Cashfree launch path.
   - Cashfree One Click Checkout now takes over the screen seamlessly in modal or redirect without interference from the scheme router.

2. **Global Definition of `finale_qualifies`:**
   - Moved `finale_qualifies` to the top-level helper functions in `api.php`.
   - Inspects `id`, `productId`, and `sku` so it reliably detects 10g Gold Biscuit Scheme orders on return from Cashfree.

3. **Multi-Target Cashfree Hosted Launcher:**
   - `window.Shivaa.cashfreeCheckout` launches `redirectTarget: '_modal'` on desktop for in-app One Click Checkout, `redirectTarget: '_self'` on mobile, with automatic direct POST form submission fallback to `https://api.cashfree.com/pg/view/sessions/checkout`.

4. **Universal v163 Stamps (Lockstep):**
   - `cms/index.html`: `window.__SHIVAA_REL = 163`, `/css/finale.css?v=163`, `/js/app.js?v=163`.
   - `cms/sw.js`: `SHELL = 'shivaa-shell-v163'`, cache assets `?v=163`.
   - `cms/js/app.js`: `APP_REL = 163`.
   - `cms/api.php`: `'rel' => 163`.

---

## Deployment Steps on Hostinger

1. Download **`shivaa-update-v163.zip`**.
2. Open **Hostinger hPanel** → **File Manager** → go to `public_html/`.
3. Upload `shivaa-update-v163.zip`.
4. Right-click and choose **Extract** directly into `public_html/` (choose overwrite existing files).
5. Open an incognito browser window at `https://shivaa.in/#/scheme`.
6. Select any of the 6 gold studs and click **⚡ Buy Now** — the Cashfree One Click Checkout portal will open automatically!
