# SHIVAA v143 — Cashfree Phone Number Fix (Critical Payment Bug)

**Built on branch `arena/01a0b7a2-shivaa-ecom`, 2026-09-19.**

---

## What this fixes

**Bug:** When a guest tapped **"Make It Yours"** on the One-Tap Buy page and left the
phone field blank (it was marked "optional"), Cashfree **denied the payment**.

**Root cause:** Cashfree's Create Order API **requires** `customer_phone` as a mandatory
10-digit number. The old code sent an **empty string** when the phone was blank, which
made Cashfree reject both the One Click Checkout attempt AND the standard-checkout
fallback — leaving the customer unable to pay.

**Fix:**
- The phone field on the One-Tap Buy page is now **required** (not optional)
- The customer must enter a valid 10-digit mobile number before the order is placed
- The server also rejects any attempt to create a Cashfree order without a real phone
- Clear error messages guide the customer to enter their number

**Why Cashfree needs the phone:** One Click Checkout works by looking up the customer's
phone number in Cashfree's 100M+ saved profiles — it pre-fills their name, address and
payment method from that lookup. Without a phone number, there is nothing to look up.

---

## Files in this update (4 files, site-root layout)

| File | What changed |
|------|--------------|
| `api.php` | Server rejects empty `customer_phone` before calling Cashfree (clear error message) |
| `js/app.js` | Phone field is required on One-Tap Buy page; 10-digit validation before order placement |
| `index.html` | Version stamp 142 → 143 |
| `sw.js` | Service worker shell 142 → 143 |

`data/db.json`, `.htaccess`, `js/admin.js`, `css/*` — **not in the zip**, untouched.

---

## Install (2 minutes)

1. Download `shivaa-update-v143.zip` from GitHub.
2. **Back up** the 4 files above from your live site (or take your full `public_html` backup).
3. Extract the zip into your **site root** (`public_html`), overwriting the same 4 files.
4. Hard-refresh the site (Ctrl/Cmd+Shift+R) or close all tabs and reopen.
5. Test: tap **Make It Yours** on any product → you should see the phone field is required →
   enter a 10-digit number → tap the button → Cashfree opens with your number pre-filled.

## Verify

- **Before the fix:** leaving the phone blank → "Cashfree denied the payment"
- **After the fix:** leaving the phone blank → "Please enter a valid 10-digit mobile number"
  (red error text below the field); entering a real number → Cashfree opens correctly.

---

*md5: `f515b8a03a4716b537b066070c6177ac`*
