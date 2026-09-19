# DEPLOY — v153 (the Express PAGE is gone too: tap anywhere → Cashfree)

**Zip:** `shivaa-update-v153.zip` · md5 `e6948a2b38628359683601cccb139d63` ·
sha256 `f0a215df3f2cb7724a3563b28fda5f95a9cecb2ca91742000a3c94a6a21ac0c5`
· **5 files:** `api.php`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`
→ unzip into `public_html/cms/`, **overwrite all five**.

> v152 (the deletion of the verification vendor) is already assumed deployed;
> if it never went on your server, v153 contains everything v152 did — the
> vendor removal AND this page removal ship together. v151's zip stays obsolete.

## What you asked for, literally

*"completely remove the one tap page of Shiva that you are made and redirect
customers directly to the cashfree payment portal once they click on buy now
check out or make it yours."*

- The **Express page is deleted** — there is no route, no URL, nothing to
  land on. `#/express` from old links or an Android back-gesture just bounces
  (guest → cart, member → checkout); it can never dead-end.
- **Buy Now / Make It Yours on a product:** the order is placed RIGHT THERE
  and the browser goes to **Cashfree's payment portal**. On a device that has
  bought here before (the number lives in that phone's own browser memory,
  180 days) the shopper sees NOTHING but a quiet "Opening your Cashfree
  payment…" moment — zero fields, zero clicks past the tap.
- **A brand-new device** is asked for the 10-digit number — but NOT on any
  page: a small **one-field card floats over the very page they're standing
  on** (product or cart). This field cannot be removed by any code: Cashfree's
  own Create-Order API rejects an order without a real `customer_phone`
  (that's what v143 proved), and your v84 rule demands contact before any
  order. It's one line, once per device, then forgotten.
- **Checkout from the cart or the sidebar:** same in-page flow — both
  buttons now run the buy without navigating. (No-JS and Cancel still fall
  back to the classic `#/checkout` link, so nothing ever breaks.)
- **Members** are unchanged: classic checkout, saved address, loyalty.

## The sturdiness upgrades that came with it

- **Cancel means cancel:** closing that one-field card clears the pending
  intent entirely — a later visit can never "resume" a purchase someone
  walked away from.
- **Reclaimed-tab resume now RESUMES THE PAYMENT instead of re-placing the
  order.** The order remembers itself (id + pin + time, device-local); if
  Android kills the tab after the order exists, the reload goes straight
  back to the pending-order view and asks Cashfree for a fresh session —
  `/api/orders` is provably never re-fired (v152 could double-place).
- **The cf-pending anchor is set BEFORE the handoff**, so even a stalled
  Cashfree SDK leaves the shopper on their order with the retry button,
  never stranded mid-tap.

## Deploy + verify (2 minutes)

1. Extract into `public_html/cms/` (overwrite 5).
2. `curl -s https://www.shivaa.in/api/version` → `"rel":153`,
   `"shell":"shivaa-shell-v153"`, stamps `{"index":153,"app":153}`.
3. Phone, logged out: open any piece → **Make It Yours** → if it's a fresh
   device: ONE card, type number, pay button → **Cashfree**. Buy anything
   again: tap → **Cashfree, directly** — and check the URL bar never shows
   `/express` or `/checkout` on the way.
4. Admin → Settings → Payments: the switch is now labelled
   **“⚡ Automatic Guest Checkout (tap → Cashfree, no pages)”** — same
   switch, same rollback semantics (off = classic checkout).

## QA behind this

v153-check **27/27** (static: no `pages.express`, no `#/express` literal
anywhere, all 3 CTAs wired to the one engine, stamps+loaders 153),
v153-direct **23/23** in a real DOM across 9 scenarios (in-place buy,
one-field card, cancel cleanliness, member control, switch-off fallback,
payment-resume that never re-places, stale-stash ignore, dead-URL bounce,
zero vendor traffic) — all green on the source tree AND on a production-shaped
overlay (main cms → v150 zip → v153 zip). v139–v142 legacy pins re-run green
(v142's Express-page pins converted to forward-tolerant form); the whole
v146–v152 era now skips by probe on this tree. The release hunt also caught
one real near-miss: the v152 index/sw **script-loader stamps** hadn't moved
with `__SHIVAA_REL` — pinned forever by a new check, and v153 ships correct
`?v=153` loaders.

Rollback: v152 zip `542fa9e199db9f6be15889032a985538` (page with one field)
or v150 `94c592867c2373519d9ea640f7f6713f`. No DB change in any of them.
