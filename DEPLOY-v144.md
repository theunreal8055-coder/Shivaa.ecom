# SHIVAA v144 — Truecaller One-Tap Verification

**Built on branch `arena/01a0b7a2-shivaa-ecom`, 2026-09-19.**

---

## What this adds

**Truecaller one-tap phone verification** on the One-Tap Buy page.

When a customer opens the One-Tap Buy page on an **Android phone with Truecaller installed**:
1. A gold **"✦ Verify with Truecaller"** button appears
2. One tap → Truecaller opens → shows **"Continue with +91 XXXXX XXXXX"**
3. Customer taps Continue → number auto-verified (no OTP, no typing)
4. Verified phone fills the input field automatically → proceed to Cashfree

When Truecaller is **not available** (iPhone, desktop, no app installed):
- The button quietly disappears and the regular phone input field works as before

---

## Files in this update (5 files, site-root layout)

| File | What changed |
|------|--------------|
| `api.php` | New Truecaller callback route (`POST /api/auth/truecaller/callback`), poll route (`GET /api/auth/truecaller/result`), config route, profile fetch function, settings validation for `tcAppKey` |
| `js/app.js` | Truecaller deep link trigger on the One-Tap Buy page (Android only), polling for verified result, auto-fill phone field, branded button |
| `js/admin.js` | New "Truecaller Partner Key" field in Settings → Payments |
| `index.html` | Version stamp 143 → 144 |
| `sw.js` | Service worker shell 143 → 144 |

`data/db.json`, `.htaccess`, `css/*` — **not in the zip**, untouched.

---

## Install (3 minutes)

1. Download `shivaa-update-v144.zip` from GitHub.
2. **Back up** the 5 files above from your live site.
3. Extract the zip into your **site root** (`public_html`), overwriting the same 5 files.
4. Hard-refresh the site (Ctrl/Cmd+Shift+R).

## Setup (one-time, 30 seconds)

1. Go to **Admin → Settings → Payments & Gateway**
2. Find the new **"📱 Truecaller One-Tap Verification"** section
3. Paste your Truecaller Partner Key: `Ulx5f1be7996a50d14a06b321cbe9ad0713e4`
4. Click **Save**

## Verify

- On your **Android phone** (with Truecaller app installed):
  - Open shivaa.in → tap **Make It Yours** on any product
  - You should see the blue **"✦ Verify with Truecaller"** button
  - Tap it → Truecaller opens → tap Continue → number auto-fills
- On **iPhone or desktop**: the button is hidden, phone input works normally

---

*md5: `3c4f01ff50dc0c13c7725f3f25729c84`*
