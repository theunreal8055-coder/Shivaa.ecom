# DEPLOY — v157 (10g Gold Biscuit Funnel · Curated 6 Studs · Pure Hindi Aura AI · Direct Cashfree Checkout)

**Zip:** `shivaa-update-v157.zip` (and `shivaa-gold-scheme-update.zip`)
- **MD5:** `3e07fe959f687d6fc71dc23b6cba273c`
- **SHA-256:** `078da00fe4bada9ee9d6c5b2406310cccfc1dc7a72a8856643307fa1ec979c7a`
- **Size:** 1,664,362 bytes (1.6 MB)
- **14 files (Root Layout):**
  - `api.php`
  - `index.html`
  - `sw.js`
  - `css/finale.css`
  - `js/app.js`
  - `images/banners/gold-biscuit-campaign.jpg`
  - `images/banners/gender-gents-gold.jpg`
  - `images/banners/gender-ladies-gold.jpg`
  - `images/products/stud-mens-rudra.jpg`
  - `images/products/stud-mens-veer.jpg`
  - `images/products/stud-mens-surya.jpg`
  - `images/products/stud-ladies-mayura.jpg`
  - `images/products/stud-ladies-chandrika.jpg`
  - `images/products/stud-ladies-tara.jpg`

→ Unzip directly into your server webroot (`public_html/` or `cms/`), **overwrite all files**.

---

## What is in this update:

1. **Aura AI Concierge — Pure Hindi with Warm, Friendly Vibe:**
   - Spoken scripts rewritten in a warm, welcoming, polite Indian conversational tone.
   - Speech synthesis configured for pure `hi-IN` female voice.
   - Interactive voice toggle in header and floating concierge widget.

2. **Direct 1-Click Cashfree Checkout on "⚡ Buy Now":**
   - Clicking "⚡ Buy Now" on any campaign stud immediately launches Cashfree PCI-compliant checkout.
   - Automatically directs to the **1-Attempt CA-Witnessed Quiz** (`#/scheme?step=quiz&orderId=...`) once payment completes.

3. **Cart & Catalog Resolution Fixed:**
   - 6 curated 22K campaign studs (`p_stud_m1` - `p_stud_w3`) automatically resolve in `/api/products` and `state.productsCache`.
   - "Cart is empty" error when adding campaign studs is completely eliminated.
   - Live 22K pricing with 12% making charges and 3% GST.

4. **v157 Version Stamp & Cache-Busting:**
   - `APP_REL = 157` in `app.js`
   - `window.__SHIVAA_REL = 157` in `index.html`
   - `const SHELL = 'shivaa-shell-v157'` in `sw.js`
   - `/js/app.js?v=157` and `/css/finale.css?v=157` prevent any stale browser cache.
