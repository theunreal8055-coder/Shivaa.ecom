# DEPLOY — v158 (Warm Hindi Aura Voice · Mobile Optimisation · Instant Retry Direct to Ear Studs on Cancel/Fail)

**Zip:** `shivaa-update-v158.zip`
- **MD5:** `14b152a49c1a7caeb466cfc73bd190be`
- **SHA-256:** `951cdfdb56257b554276b0df1ae8d23af403692524b76fc33052d06877ec8a22`
- **Size:** 1,664,570 bytes (1.6 MB)
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

## What is in this v158 update:

1. **Aura AI Voice Assistant — Warm, Polite, Conversational Hindi:**
   - Redesigned with warm Indian hospitality dialogues (*"नमस्ते जी! आपका शिवा में हार्दिक स्वागत है। मैं आपकी शिवा साथी ऑरा..."*).
   - Natural speech synthesis prioritizes Indian Hindi female voices (`hi-IN`) with soothing cadence (`rate: 0.90`, `pitch: 1.12`).
   - Integrated with an interactive sound equalizer wave visualizer and tap-to-listen button.

2. **Cashfree Failure / Cancel Graceful Retry:**
   - If Cashfree payment is closed, cancelled, or declined, the customer is immediately directed back to the curated **Ear Studs page** (`#/scheme?step=products&gender=...`) with a friendly notification.
   - Never redirects to the homepage or an empty cart/order screen.
   - Customers can instantly select any design and tap **"⚡ Buy Now"** again.

3. **Full Mobile Optimization:**
   - Horizontal smooth-scrolling 5-step stepper bar with hidden scrollbars for mobile screens.
   - Touch targets enlarged to 44px+ for buttons, gender cards, and stud cards.
   - Fully responsive layout on screens `< 768px` and `< 480px` with zero horizontal overflow.

4. **v158 Lockstep Release Stamp & Cache-Busting:**
   - `APP_REL = 158`
   - `window.__SHIVAA_REL = 158`
   - `const SHELL = 'shivaa-shell-v158'`
   - Query strings updated to `?v=158` for immediate cache refreshment on customer phones.
