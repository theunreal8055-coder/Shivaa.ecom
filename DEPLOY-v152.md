# DEPLOY — v152 (the deletion: Truecaller GONE, tap goes straight to Cashfree)

**Zip:** `shivaa-update-v152.zip` · md5 `542fa9e199db9f6be15889032a985538` ·
sha256 `8177d8b9705fc02dcdb6160d27122b4f76eeb67c647efc98775e8fde8ffe2395`
· **5 files:** `api.php`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`
→ unzip into `public_html/cms/`, **overwrite all five**.

> **The v151 zip (`8f827df5…`) is OBSOLETE — skip it, deploy v152 directly.**
> It was the "fix the verification" release; this is your "delete it" decision
> (19 Sep: *"completely remove the Truecaller button and Truecaller feature and
> Truecaller from the back end front end everywhere from the file and when the
> customer presses buy now or make it yours or check out from the side bar then
> you should directly take them to the cashfree payment portal"*).

## What changed — in one paragraph

Every trace of the verification vendor is amputated, not disabled: the express
page's button and instant one-tap engine, its prefill/resume machinery, the
hero copy, the admin fieldset + doctor action + save-prop, and on the server
the consent routes, the profile helpers, the nonce store, the order tag, the
settings whitelist handler and the `tc` block of the version endpoint — all
gone from **code AND comments** (the release is grepped to zero). What replaces
them is the shortest legal path to Cashfree: Buy Now / Make It Yours / cart
Checkout → the Express page → **Cashfree opens**. Cashfree's own Create-Order
API demands a real 10-digit `customer_phone` and the v84 gate demands contact
details before any order, so a **first-time guest types exactly ONE field**
(their number, on our card, seconds before Cashfree takes over — and it's
Cashfree itself that OTP-verifies it on its own page). Every **later purchase
on that phone auto-buys**: the number is remembered on the device
(`localStorage`, 180 days), so the next tap lands directly on Cashfree with
nothing typed — the "one tap" you asked for, minus the vendor. Signed-in
members keep the classic checkout (saved address, loyalty) untouched.

## Old-phone safety (why nobody gets stranded)

- A cached PWA that still carries the old UI may send a `tcNonce` field with
  its order — the server now **ignores the surplus silently**; the order places
  normally on whatever number was filled. No 500s, no lost purchases.
- The old endpoints (`/api/auth/truecaller/callback|result|refetch|config`) now
  answer the standard `Unknown API` 404 — dead, not broken.
- If your database still holds a stale partner key (`tcAppKey`), two layers
  bury it: the public settings projection now blocks any `*AppKey`, and the
  key joins the legacy-credential list that is **wiped on the next admin Save**.
- You can also delete the `data/tc-verify/` folder on prod whenever you like —
  nothing reads it any more (it self-expires regardless).

## Deploy + verify (2 minutes)

1. Extract the zip into `public_html/cms/` (overwrite).
2. `curl -s https://www.shivaa.in/api/version` → expect
   `{"ok":true,"rel":152,"shell":"shivaa-shell-v152","stamp":{"index":152,"app":152}}`
   — specifically `"rel":152` and **no `"tc"` key at all**.
3. Phone, Chrome, no login: open the site → Buy Now on any piece →
   the ONE number field → tap Pay → **Cashfree's payment page**.
   Buy something again → the tap goes straight to Cashfree with the number
   already remembered ("✓ … remembered from your last purchase here").
4. Admin → Settings → Payments: the phone-verification fieldset is gone; the
   **Express "one field" guest switch stays** — that switch is what arms this
   flow. (The admin bundle's cache-buster now follows the release number, so
   it can never serve a stale admin.js again.)

## QA behind this release

v152 static zero-residue + contract gate **21/21**, jsdom behaviour
(one-field first buy, zero-click auto-buy, member control, stale-stash
safety, switch-off empty state) **14/14**, real-PHP run (stale nonce ignored,
v84/v143 gates intact, vendor routes 404, version truth, no key leak)
**11/11** — all green on source AND on a production-shaped overlay
(main cms tree → v150 zip → v152 zip). All 13 v146–v151 Truecaller suites now
carry a feature-probe: they SKIP on trees without the vendor and still run
fully against any older overlay. The deletion hunt itself caught and fixed one
latent survivor (`tcPhone` ReferenceError on the Pay button) that only a
runtime pass could find.

Rollback: v150 zip `94c592867c2373519d9ea640f7f6713f` (5 files) restores the
v150 experience; nothing else to undo (no DB change, no new tables).
