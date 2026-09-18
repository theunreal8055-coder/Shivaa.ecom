# DEPLOY v141 — the One Click Checkout switch is now visible

**Release:** v141 · branch `arena/01a0b3ff-shivaa-ecom`
**Applies on top of:** v140
**Deliverable:** `shivaa-update-v141.zip` — root layout, extract into the `public_html` **ROOT**

One thing fixed in this release, in plain words.

---

## What was wrong

You said: "I can't see any one click check out in my website — I have applied
everything but still can't see it."

The switch was built and was in the website's files. But the site was asking
your browser for the **admin panel file using an old version tag** (a leftover
`?v=128` from before the switch existed). Hostinger's settings tell browsers
to keep `?v=` files for **a whole year** without checking for a new one — so
your browser kept showing you the **old** admin page that had no switch.

In short: the switch existed in the code, but your browser was still opening an
old copy. You could not see it because the file was being read from memory.

## What changed

- `app.js` now asks for the admin panel as `?v=141` — a brand-new tag, so every
  browser fetches a **fresh** copy that contains the switch.
- The release stamps moved together to **141** (index.html · app.js · sw.js +
  the `?v=` stamps), and a new `v141-check.js` gate makes sure the old `?v=128`
  tag can never come back.

Nothing else changed: no rate, no price, no product, no order, no customer
record, no `db.json`, no Cashfree settings.

## Files in the zip (4 + this document)

```
index.html          release stamp 141 · loads app.js?v=141
sw.js               SHELL 'shivaa-shell-v141' · precache updated
js/app.js           APP_REL 141 · loads the admin panel as ?v=141 (was ?v=128)
js/admin.js         the admin panel that contains the ⚡ One Click Checkout switch
DEPLOY-v141.md      this file
```

`js/admin.js` is shipped even though it is byte-identical to v139's copy —
including it guarantees the live server's copy has the switch, whatever state
the last upload left it in. That is the whole point of this fix.

`api.php` is **not** shipped — no server change was needed. `.htaccess` and
`data/db.json` are never shipped.

## Install (the same safe steps as always)

1. **Back up `public_html` first** (hPanel → Files → Backup).
2. Upload `shivaa-update-v141.zip` to the `public_html` **ROOT** and extract,
   overwriting the 4 files.
3. On the phone/browser, **hard-refresh once**:
   - Android Chrome: Settings → Site settings → Storage → Clear site data, then reopen; or
   - simply open the admin panel in a *fresh private/incognito window* once.
4. Check `view-source:https://shivaa.in/` shows `window.__SHIVAA_REL=141;`.

## Where the switch now appears

Log in to your **Shivaa Admin** → **Settings** → **Payments & gateway** →
**🟣 Cashfree payment gateway**. Under the App ID / Secret Key boxes you will
now see:

- **⚡ Cashfree One Click Checkout**
- **Pre-fill the delivery address**
- **Verify the phone number (OTP login)**

Remember it has two prerequisites (unchanged from before):

1. In the **Cashfree Merchant Dashboard → Payment Gateway → PG Products →
   One Click Checkout**, the product must read **Active**.
2. The **App ID + Secret Key** boxes above it must be filled with your
   **Cashfree payment-gateway** keys (from *Developer Options → API Keys*, not
   the separate 1-Click onboarding keys) and the Environment set to match.

## Verification (what was run)

| Gate | Result |
|---|---|
| `v141-check.js` (new — 4 static · 1 control) | **5/5** |
| v113b · v117 · v118 · v119 · v120 · v121 · v122 · v123 · v124 · v139 · v140 | 32/32 · 27/27 · 19/19 · 27/27 · 24/24 · 14/14 · 22/22 · 14/14 · 20/20 · 56/56 · 17/17 |
| v125 · v127 | 26/27 each — the same two frozen-scope rules from v140 (unchanged) |
| php-sweep | **207 routes · 0 exceptions** |
| `pay-audit-check.js` | 2/18 findings · 10/10 invariants — unchanged from v140 |

The new gate proves three things about this exact fix: the release triple moved
to 141 together, `app.js` loads the admin panel as `?v=141` and never `?v=128`,
and the ⚡ switch really exists in the admin file that ships.

**Not verified here:** no PHP binary exists in this sandbox, so the Cashfree
payment call was not executed live. A real payment is still owed on the
Cashfree **sandbox** before go-live.
