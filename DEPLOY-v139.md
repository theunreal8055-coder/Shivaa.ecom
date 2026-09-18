# DEPLOY v139 — bag, category page & payment page repair

**Release:** v139 · branch `arena/01a0b366-shivaa-ecom`
**Applies on top of:** v138 (`main` at merge commit `ee30b4d`)
**Deliverable:** `shivaa-update-v139.zip` — root layout, extract into the `public_html` **ROOT**

Everything below came from the owner's four reports of 18 Sep 2026. Nothing else
was touched: no rate, no price, no product, no order, no customer record.

---

## What was wrong, and what is different now

### 1 · "the check out button doesn't work and doesn't take us to the payment page"

**Cause, measured before it was fixed.** The bag drawer's tap was not dead — it
was *out-raced*. `app.js` closes the bag inside the click, and `js/v120.js`
(the back-button helper) answers a sheet closing with `history.back()`. So one
tap did two things at once: it queued a history traversal **and**, a beat later,
navigated to `#/checkout`. The traversal wins on a phone.

An instrumented run of the shipped tree recorded the exact order:

```
── v139 STRIPPED (before the fix) ──
  history.back() @hash=#/      ← queued while still on the home page
  popstate @hash=#/checkout
  hashchange -> #/checkout
  backs=1
── v139 loaded (after the fix) ──
  popstate @hash=#/checkout
  hashchange -> #/checkout
  backs=0
```

This is the same defect class **v127** removed from the sidebar and the search
palette — v127 covered `#mainNav` and `#searchSugg` only, and the bag drawer
(`#cartDrawer`) was never in scope.

**Fix:** new `js/v139.js` owns the bag's taps in the capture phase — navigate
**first**, arm the house flag `window.__shvNavigating` that `v120.js` already
honours, and only then close the bag. `"Continue shopping"` (a button with no
href) deliberately keeps the old path, because there the traversal is correct.

**Also improved (owner: "you can improve the animations also"):** the bag now
arrives with a hint of depth, its rows stagger in, the free-shipping meter
breathes once, and **Checkout ✦** gets a single slow gold sheen on open — once,
not a loop. All transform/opacity only, all silenced by
`prefers-reduced-motion`.

### 2 · "when you click on any category … still that 17 photos are on the page, the images are only there"

**Measured before the fix:** `#/shop?category=earrings` painted **20 category
tiles with 20 `<img>` tags** above a grid holding **0 pieces** — a wall of
category photographs and no jewellery.

**Fix:** a *filtered* shop page is a results page. It now renders a compact
**text chip strip** (one tap to hop category, the current one highlighted) and
**zero** photographs. The photo slider stays exactly where it belongs — the
unfiltered `#/shop` browse page and the home page. Side benefit: 20 image
requests removed from every category page.

Also: the sidebar's expanded "All 17 categories" list now **folds shut** when
you navigate, so the menu opens tidy instead of showing the same 17 pictures
again. The 17 categories themselves are untouched — that is the owner's own v115
decision and it stands.

### 3 · "place order button is always there on the screen in the phone … it disturbs and does not let the customer fill the information"

**Fix:** on the payment page the bar carries a new `mcta-inline` class, which
takes it out of the fixed layer (`position: static`) and puts it **in the page
flow, at the end of the form**. Same card, same total, same button — it scrolls
with the page instead of floating over the address fields. Nothing is hidden.
The cart page's bar is unchanged (it was not reported and has no form under it).

### 4 · "I have selected the one tab quick check out … I cannot see that the information is pre filled or the addresses are prefilled or the numbers are automatically verified"

**This one is not a website bug — it is a missing API call, now added.**

Switching the product on in the Cashfree dashboard is necessary but **not
sufficient** for a custom website. Cashfree's own integration note ("Custom
website", `cashfree.com/docs/payments/checkout/integration-one-click-checkout`)
says you must **extend the Create Order API** with two objects and then read the
result back:

| What Cashfree needs | What this release does |
|---|---|
| `products.one_click_checkout.enabled = true` | sent when the new admin switch is on |
| `conditions.values = ["checkoutCollectAddress","checkoutAuthenticate"]` | sent, each behind its own checkbox |
| `cart_details.cart_items[]` | sent — your pieces now appear as the checkout summary |
| `x-api-version: 2025-01-01` on that call | sent **only** on the create-order call that carries OCC, so no other call's response shape moves |
| `GET /pg/orders/{id}/extended` after payment | called on a confirmed payment; the address Cashfree collected is stored on the order as `cfCheckout` **alongside** the address typed here, never over it |

**Safety:** if Cashfree refuses the OCC payload for any reason (product not
active on the account, a rejected field, a version mismatch) the order is
**retried once as a standard Cashfree checkout** and the refusal is audit-logged
as `payment.cashfree-occ-fallback`. Nobody is ever unable to pay because an
optional convenience feature was rejected.

**The other half — the address on *our* form — is now done by the shop itself.**
The site has kept an address book since v84 (the account page even says *"add one
for faster checkout"*) but the checkout form never read it, so every shopper
retyped name, phone, street, city and pincode on every order. Now:

* the form **pre-fills** from the address book (last used → default → newest);
* every saved address is a **one-tap chip** above the form;
* a **"save this address"** tick turns the second order into a one-tap order.

Cashfree can only ever pre-fill *Cashfree's* page. This half was always ours.

---

## Files in the zip (7 + this document)

```
index.html          release stamp 139 · loads css/v139.css + js/v139.js (last)
sw.js               SHELL 'shivaa-shell-v139' · precache updated
js/app.js           APP_REL 139 · chip strip · checkout prefill · mcta-inline
js/v139.js          NEW — the bag drawer owns its taps · category list folds
css/v139.css        NEW — bag motion · chip strip · in-flow CTA · address chips
api.php             Cashfree One Click Checkout (create-order + Get Order Extended)
js/admin.js         Payments card: the three One Click Checkout switches
DEPLOY-v139.md      this file
```

`js/v116.js` and `js/v117.js` are **not** in the zip — their `?v=` stamp moved
to 139 in `index.html`, but the files themselves are byte-identical, and a query
string does not change the file that is served.

**Not shipped, deliberately:** `.htaccess` (untouched — the v138 CSP fix is
unaffected), `data/db.json`, everything under `data/` and `uploads/`.

## Install

1. **Back up `public_html` first** (hPanel → Files → Backup, or a one-click tag).
2. Upload `shivaa-update-v139.zip` to the `public_html` **ROOT** and extract
   there, overwriting the 7 files.
3. Hard-refresh the phone once (the service worker swaps to
   `shivaa-shell-v139` and re-fetches the shell).
4. Check `view-source:https://shivaa.in/` shows `window.__SHIVAA_REL=139;`.

## Owner action needed for One Click Checkout

The website is ready, but the feature stays **off** until you switch it on:

1. Cashfree **Merchant Dashboard → Payment Gateway → PG Products → One Click
   Checkout** — confirm it reads *Active* (not just requested). If it is not
   active, ask your Cashfree account manager; nothing on the site can turn it on.
2. **Admin → Settings → Payments & gateway → 🟣 Cashfree payment gateway** →
   tick **⚡ Cashfree One Click Checkout** (and the two sub-boxes you want),
   **Save payments**.
3. Place one **sandbox** order and look at the Cashfree page: you should see the
   OTP login step, a pre-filled address, and your pieces listed as a summary.
4. Then place one real order and open it under **Orders** — if the customer
   confirmed a different address on Cashfree's page, it is recorded on the order
   as `cfCheckout` next to the address they typed here.

**Test on sandbox before production.** The switch is off by default on purpose:
a change in gateway behaviour is your decision, not mine.

## Verification (what was actually run)

| Gate | Result |
|---|---|
| `v139-check.js` (new — 14 static, 23 live, 3 control) | **40/40** |
| `v113b` · `v117` · `v118` · `v119` · `v120` · `v121` · `v122` · `v123` · `v124` | 32/32 · 27/27 · 19/19 · 27/27 · 24/24 · 14/14 · 22/22 · 14/14 · 20/20 |
| `v125-check.js` | 25/27 — the 2 failures are past-release scope rules (see below) |
| `v127-check.js` | 26/27 — same (its frozen-v125-triple rule) |
| `pay-audit-check.js` | 2/18 findings still present · 10/10 invariants intact — unchanged from v138 |
| php-sweep | **207 routes · 0 exceptions** |
| `php-parser` parse check on `api.php` | clean, 128 top-level nodes, **proven against a deliberately broken negative control** |

The 3 remaining failures across v125/v127 are *scope rules written for those
releases* — "the triple must still read 125", "no stale `?v=125` stamp". They
fail for any release above 125, exactly as they did at 138, and are left failing
rather than weakened. `v118` gained one assertion (19/19): its
"category rail photos eager-load" guarantee is now measured on the unfiltered
shop page, where the rail still lives — the guarantee is preserved, not deleted.

**What was NOT verified here:** there is still **no PHP binary in this sandbox**,
so the Cashfree path was **never executed end to end**. The parse check proves
the file is syntactically valid; it is not a run. A live Cashfree **sandbox**
order is still owed before this is trusted with real money — and One Click
Checkout cannot be confirmed at all until the product is active on the account.
