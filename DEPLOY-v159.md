# DEPLOY — v159 (Top Ribbon Removed · Mobile Optimized Scheme & Landing · Warm Hindi Aura AI · Cashfree Direct Lane)

**Zip:** `shivaa-update-v159.zip`
- **MD5:** `8cb48328b0246b80b0a0c21c84661555`
- **SHA-256:** `de36d559a91c6d136f63f7ad17a6ea23a9665f6d4a7a7e5b67e15ea0a8226a57`
- **Size:** 1,664,575 bytes (1.6 MB)
- **14 files (Direct Root Layout):**
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

## What is in this v159 update:

1. **Top Website Banner/Ribbon Completely Removed:**
   - The festive ribbon entry on top of the website (`shvTopSchemeRibbon`) has been completely removed as requested.
   - The website header and navigation load cleanly at the very top of the page.

2. **Mobile Compatibility & Deep Responsive Optimization:**
   - **Sticky Horizontal Step Navigation:** 5-step stepper workflow is sleek, horizontally scrollable with smooth touch momentum and zero awkward line-wrapping on phones.
   - **Compact Viewport Fitting:** Headings, subheadings, countdown cells, and value cards on `#/scheme` and `#/finale` use responsive `clamp()` typography to fit comfortably without vertical bloat or horizontal overflow.
   - **Touch-First Buttons:** Stud cards feature full-width, 48px high touch targets for **"⚡ Buy Now"** (1-click Cashfree) and **"🛍️ Add to Bag"** for effortless thumb reach on mobile screens.
   - **Responsive Grids:** 4-pillars grid, gender selection cards, and stud cards adapt dynamically to 1-column mobile layouts on screens `< 768px` and `< 480px`.

3. **Aura AI Concierge — Warm Hindi Voice & Audio Waves:**
   - Conversational, warm, polite Indian hospitality dialogues (*"नमस्ते जी! आपका शिवा में हार्दिक स्वागत है। मैं आपकी शिवा साथी ऑरा..."*).
   - Voice synthesis configured for pure `hi-IN` female tones with gentle cadence (`rate: 0.90`, `pitch: 1.12`).
   - Integrated with an interactive sound equalizer wave visualizer and tap-to-listen button.

4. **Cashfree Failure / Cancel Fallback:**
   - If Cashfree payment is closed, cancelled, or declined, the customer is immediately directed back to the 6 Ear Studs Showcase page (`#/scheme?step=products&gender=...`) with a friendly notification.
   - Never drops customers to the homepage.

5. **Release Stamp Lockstep (v159):**
   - `APP_REL = 159`
   - `window.__SHIVAA_REL = 159`
   - `const SHELL = 'shivaa-shell-v159'`
   - Query strings updated to `?v=159` for instant cache invalidation on customer devices.
