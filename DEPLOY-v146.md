# Deploy v146 — cart checkout crash + Truecaller rebuilt

**Extract `shivaa-update-v146.zip` into the `public_html` ROOT** (same folder as the live `index.html`). Five files, nothing else.

| File | Why it is in the zip |
|---|---|
| `api.php` | Truecaller callback/result/config (bonus auto-fill) + guest phone guard + Partner Key save |
| `index.html` | `__SHIVAA_REL=146` + `app.js?v=146` |
| `sw.js` | `shivaa-shell-v146` + precache `app.js?v=146` |
| `js/app.js` | Cart → One-Tap Buy for guests, Back-button crash gone, Truecaller return-and-type |
| `js/admin.js` | Truecaller Partner Key field (Settings → Payments) |

Do **not** overwrite `data/db.json`, `uploads/`, or `.htaccess`.

## What this fixes

1. Cart → Checkout no longer shows **Something slipped** (Back no longer reads `item.id` when the bag has several pieces).
2. A signed-out shopper who taps **Proceed to Checkout** on the bag goes to **One-Tap Buy**, not the login sheet.
3. Truecaller no longer waits on a server callback Hostinger can drop. Flow: tap **Verify with Truecaller** → see the number in the app → **Continue** → back in the browser, type that number → **Make It Yours** → Cashfree with that phone (address pre-fill).
4. Phone is required on One-Tap Buy (Cashfree refuses empty numbers).

Your Truecaller Partner Key and Cashfree One Click Checkout stay as already saved in Admin. Callback URL in the Truecaller console can remain `https://www.shivaa.in/api/auth/truecaller/callback` — it is a bonus if it arrives.

## After extract

Close every shivaa.in tab, reopen, confirm `/sw.js` contains `shivaa-shell-v146`.
