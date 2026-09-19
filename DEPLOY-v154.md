# DEPLOY — v154 (FIELDLESS: tap → Cashfree, literally nothing of ours in between)

**Zip:** `shivaa-update-v154.zip` · md5 `b8eb964953e6647a3b068b748696dc8c` ·
sha256 `e31e7ab9510eaed6e702ae357b3ab934ee0ca366d29b4df0196621819e83c81e`
· **5 files:** `api.php`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`
→ unzip into `public_html/cms/`, **overwrite all five**.

> Ships everything v152 (vendor deletion) and v153 (Express-page deletion) did.
> If neither went on the server, **this zip alone is the whole story**.

## Your words, now literally true

*"…completely remove the one tap page … and redirect customers directly to the
cashfree payment portal once they click on buy now check out or make it yours."*

**Buy Now / Make It Yours / cart & sidebar Checkout → Cashfree's payment
portal.** No page. No card. No field. No device-memory anything. The only
Shivaa UI left in the lane is a one-line “Opening your Cashfree payment…”
status while the order round-trip completes (milliseconds), then the browser
is ON Cashfree's site.

## How it stays legal (the part that forced the old field)

Cashfree's Create-Order API only ever refused an **empty** phone (that's what
v143 proved) — so the order now rides a **canonical boundary row**
(“Valued Customer / 9999999999 / Collected on Cashfree (verified address) /
Pending verification / 000000”). The server accepts that shape **only when
every field matches exactly AND your Express switch is on AND Cashfree is the
live provider** — one letter off (case included) and the old real-phone rule
applies again. The customer's **real mobile is collected and OTP-verified by
Cashfree on its own page** (that's One Click Checkout's `checkoutAuthenticate`
doing its job — exactly the design you accepted), and the moment the payment
is confirmed, **Cashfree's verified name, number and address are written back
onto the order** — so the dispatch queue never ships to a placeholder.
A guest who types their number through the classic form is treated exactly as
before: their number, untouched.

## What each shopper experiences

| Shopper | Journey |
|---|---|
| Any guest, any device, first-ever order | tap → (one line of status) → **Cashfree's portal** — number, address, payment all on Cashfree's side |
| Returning customer | tap → Cashfree recognises their number → **pre-filled address, one step to pay** (Cashfree remembers, not us — nothing to store on the phone) |
| Signed-in member | classic checkout — saved address, loyalty, untouched |
| Owner flips the switch off | every guest CTA = classic `#/checkout` immediately (and the API's guest lane closes to 401 — even a crafted request can't place a placeholder order) |

## Deploy + verify (2 minutes)

1. Extract into `public_html/cms/` (overwrite 5).
2. `curl -s https://www.shivaa.in/api/version` → `"rel":154`,
   `"shell":"shivaa-shell-v154"`, stamps `{"index":154,"app":154}`.
3. Phone, logged out, any product → **Make It Yours** → the browser should be
   on Cashfree within a blink, with **no Shivaa page or field in between**.
   Check an order end-to-end: after paying, the order in Admin should carry
   the customer's REAL number/address (the sweep), not 9999999999.
4. If any customer ever pays and the address sweep fails (Cashfree returned no
   contact), the order still shows the pending badge + `cfCheckout` raw data
   in Admin — the failure is visible, never silent.

## QA behind this

v154-check **24/24** static · v154-direct **17/17** in a real DOM — eight
scenarios including a MutationObserver **tripwire that fails the build if any
form field ever mounts inside the flow again** — and v154-php-run **11/11**
executed on real PHP: sentinel accepted on the exact signature only, case-
near-miss refused, switch-off = whole guest lane 401s, provider-pairing,
typed-flow sentinel-smuggling 400, empty phone still dead in the v84 loop,
legacy `tcNonce` surplus still ignored, version truth. All green on the
source tree AND on a production-shaped overlay (v150 tree → v154 zip).
v139–v142 legacy pins green; v146–v153 suites skip by era-probe and still
run fully on any older overlay. Reclaim-resume (tab killed mid-payment)
still pays the SAME order and can never double-place.

Rollback ladder: v153 zip `e6948a2b38628359683601cccb139d63` (page-less with
the one-field card) · v152 zip `542fa9e199db9f6be15889032a985538` (Express
page) · v150 zip `94c592867c2373519d9ea640f7f6713f`. No DB changes in any of
them.
