# PAYMENT EXPERIENCE — what to improve next (audit, 18 Sep 2026)

Read before changing anything: `docs/AGENT-HANDOFF.md`, `MEMORY.md`,
`HANDOFF.md`, `CASHFREE-INTEGRATION.md`, `cms/docs/CASHFREE-SETUP-GUIDE.md`.
Every claim below was verified against the code in this checkout on
18 Sep 2026 — file:line is given so it can be re-checked, not trusted.

---

## 0 · Two repo-integrity problems found first (both block payment work)

### 0a · `cms/` could not boot — FIXED on this branch

`cms/index.html:357` and `cms/sw.js:43` both requested
`/js/app.v133.js?v=133`. **That file does not exist in `cms/js/`** — the
directory holds only `app.js`, which is byte-identical to the
`js/app.v133.js` inside `shivaa-patch-v133.zip`
(md5 `c3d09118d6130e9815b8477601e8ebd7` for both). The bundle was renamed in
the v129–v133 patch zips; the rename was never applied to `cms/`.

Consequence: the repo's own storefront 404s its main script. Measured before
the fix, running the project's own suites against the real `cms/`:

| suite | before | after |
|---|---|---|
| v113b | FAIL — "no #heroCarousel after 25s" | 32/32 |
| v117 | harness crash | 25/27 |
| v118 | harness crash | 16/18 |
| v119 | harness crash | 25/27 |
| v120 | harness crash | 23/24 |
| v121 | harness crash | 12/14 |
| v122 | harness crash | 20/22 |
| v123 | harness crash | 12/14 |
| v124 | harness crash | 18/20 |
| v125 | 17/27 | 24/27 |
| v127 | FAIL — "no hero carousel after 25 s" | 26/27 |
| **total** | **storefront does not boot** | **233/252** |

The fix is two one-line URL changes (`app.v133.js` → `app.js`), no content
change, no version bump, no new file. Commit `c61498b` on
`arena/01a0b25e-shivaa-ecom`. **Not merged — nothing went live.**

Why the live site still works: the owner extracted the patch zips into
`public_html` by hand, so `public_html/js/app.v133.js` exists there, and the
auto-sync deploy (`deploy/auto_sync.php:262-290`) only *copies* files from
`cms/` — it never prunes. The repo, however, is not a working install: a fresh
deploy from `main` on a new server produces a blank shell.

Why the deploy did not catch it: the deploy self-check verifies
`api.php` + `index.html` are byte-identical and probes `GET /api/products`
(`deploy/auto_sync.php:286-292`). It never checks that the scripts
`index.html` references actually exist. **Recommendation: add "every
`<script src>` / `<link href>` in the deployed index.html returns 200" to the
deploy verify step** — that one check would have caught this class of bug at
the gate instead of in production.

### 0b · v128–v134 are absent from the agent ledger

`grep -c "v128\|v129\|v130\|v131\|v132\|v133\|v134"` returns **0** in
`MEMORY.md`, `HANDOFF.md`, `docs/AGENT-HANDOFF.md`, `ARENA-STATE.md` and
`FEATURE-LINEAGE.md`. The whole Cashfree migration (v128), the four payment
hardening passes (v130 timeout/failed-tag, v131 timeout-vs-navigation, v132
blocked-iframe detection, v133 fresh-session-per-retry) and v134 are recorded
nowhere in agent memory. A new chat branching from `main` reads "v127 is the
newest live state" and has no idea PayU is gone.

Also inconsistent: the release triple is **128 / 128 / 134**
(`index.html:71 __SHIVAA_REL=128`, `app.js:14 APP_REL=128`,
`sw.js:19 SHELL='shivaa-shell-v134'`). House law says all three move together.

**All 19 remaining gate failures are exactly this** — stamp assertions whose
regexes only allow 118–126, e.g.
`v118-check.js:23 /(118|119|120|121|122|123|124|125|126)/`. The house pattern
("widen the older suites") was skipped for v128–v134. Fix: widen the
alternations, settle the triple on one number, then re-run all eleven suites
and record the number in `MEMORY.md`.

**Could not be run here:** the php-sweep (211 routes · 0 exceptions) and
`php -l`. There is no PHP binary anywhere in this sandbox (searched the whole
filesystem). The 0a fix touched HTML/JS only, so it cannot affect a PHP lint.

---

## 1 · Reconcile the attempt the customer actually paid (correctness, ₹)

`pay/cashfree/return` (`cms/api.php:3724-3745`) reads `$_GET['co']` (the shop
order) and then reconciles **the last attempt**:
`$attempts[count($attempts) - 1]`. It never reads `$_GET['order_id']`, even
though the server itself put `{order_id}` in the return URL
(`api.php:3579`). The customer poller `pay/cashfree/status`
(`api.php:3766-3789`) does the same.

Since v133 every retry mints a fresh Cashfree order (`-A1`, `-A2`, …), so the
"last attempt" is not necessarily the one that was paid. A customer who taps
*Try Cashfree again*, or pays in a second tab, and completes the **older**
attempt lands on `?cf=pending` and watches "Confirming your Cashfree
payment…" forever — the order is only rescued later by the webhook, which does
look the attempt up properly (`cashfree_find_order_index`).

Fix: reconcile `$_GET['order_id']` when it maps to a known attempt, fall back
to the last one; in the poller, sweep every attempt whose `lastState` is not
terminal instead of only the newest.

## 2 · Nobody tells the customer they paid (trust, ₹60k+ orders)

`cashfree_apply()` (`api.php:478-525`) ends in `audit_log()` + `db_save()`.
The only two `shivaa_mail_send()` call sites in `api.php` are OTP delivery
(lines 2778 and 4101). There is no email, SMS or WhatsApp on payment success —
and no owner ping either.

So in the setup guide's own test-matrix scenario #7 (*"customer closes browser
after paying"*), the webhook credits the order and the customer hears nothing
about a five-figure jewellery payment. The invoice number already exists at
that point (`SHV/<FY>/<seq>`, `api.php:3432-3439`), and `mail.php` is already
wired and working on Hostinger.

Add: a payment-received email + WhatsApp carrying the invoice number, the
amount, and the order link; and an owner notification on
`payment.cashfree-paid` so a large payment is never discovered by accident.

## 3 · A double payment is silently swallowed (money)

`cashfree_apply()` returns `['ok' => true, 'already' => true]` when
`amountPaid >= total` (`api.php:508-510`). If two *distinct* Cashfree orders
for the same shop order both reach PAID — two tabs, or a retry that succeeded
after the first one also succeeded — the second is credited to nobody: no
ledger row, no audit line, no alert, no refund. The customer is out the money
and the shop does not know.

Add: when a distinct `cfOrderId` reports PAID on an already-settled order,
record it as an overpayment row, `audit_log('payment.overpayment', …)`, alert
the owner, and offer the one-tap Cashfree refund that already exists in admin
(`admin.js:3342-3364`).

## 4 · EMI exists as copy, not as a payment option (biggest conversion lever)

EMI appears only as product-page decoration: the strip at `app.js:2627`
("No-cost EMI from ₹X/mo") and the calculator `<details>` at
`app.js:2788-2796`. `cms/api.php` contains **zero** EMI code. Nothing at
checkout mentions EMI, and the Cashfree order payload (`api.php:3567-3584`)
carries no EMI hint.

The catalogue in this repo is 77 pieces, all 22K, 1.65–3.83 g in the sample
read from `cms/data/db.json` — at the v119 published rate that is roughly
₹25k–₹63k a piece. That is exactly the band where EMI decides the sale.

Cashfree's hosted page can present EMI / no-cost EMI once it is enabled on the
merchant dashboard. Do two things: enable it there, and surface "EMI from
₹X/mo · 3/6/9 months" on the checkout payment row so the customer decides
*before* the redirect rather than discovering it on a third-party page. The
ledger already stores the instrument used (`'instrument' =>
$st['payment_method']`, `api.php:514`), so EMI uptake is measurable from day
one.

## 5 · Abandoned payments are invisible (recovery)

`carts/abandon` (`api.php:4655-4666`) stores abandoned **carts** for admin
viewing only — no follow-up of any kind. There is no equivalent for an order
sitting in `Awaiting payment`, and the admin panel only surfaces
`Proof submitted` orders (`admin.js:59,170`). Meanwhile the gold rate is
locked and the piece is reserved.

Add: an ageing list of unpaid orders in admin, and a WhatsApp/SMS nudge with a
direct `#/order/<id>` pay link at ~15 minutes and ~24 hours. This is the
cheapest revenue in the list — the customer already decided to buy.

## 6 · WhatsApp orders are still a manual screenshot loop

"Pay on WhatsApp" opens a chat (`waOrderMsg`, `app.js:317`) and the money is
confirmed by a human approving an uploaded screenshot (`admin/pay-proof`,
`api.php:3790-3825`). Cashfree's **Payment Links** API is not integrated —
`payment_link` matches nothing in `api.php`.

Add an admin button "Send payment link": create a Cashfree link for the stored
balance and print the `wa.me` URL with it prefilled. Same reconciliation
machinery, same ledger, but the highest-touch sales channel becomes automatic
and the owner stops verifying screenshots by hand.

## 7 · The confirmation poller gives up after ~15 seconds

`pollPP` (`app.js:4570-4600`) runs 6 attempts — 1.2 s then 5 × 2.6 s — then
rewrites the banner to *"Confirmation is taking longer than usual — reload
this page in a minute"*. UPI/bank confirmation routinely takes 30–90 s, so the
most anxious moment of the purchase is the one the code abandons earliest.

Extend to exponential backoff over 2–3 minutes, keep the spinner honest, and
— once #2 exists — say "we will message you the moment it is confirmed" so the
customer can safely put the phone down.

## 8 · COD ceiling is copy, not enforcement (risk)

The checkout says *"Available on orders below ₹50,000"* (`app.js:3796`), but
the COD radio is only disabled on **pincode** grounds
(`app.js:3908-3918`), and the server accepts `COD` for any amount
(`api.php:3330` validates only the method name; the sole amount gate is the
₹1 cr *online* ceiling at `api.php:3541`). A crafted request places a
₹3,00,000 COD order with nothing paid up front.

This is the exact class of bug the codebase already fixed once for coupons
("v84 — the checkout UI only hid the code; the API used it",
`api.php:3397-3399`). Enforce the ceiling server-side and make it a setting.

## 9 · Small trust and hygiene items

- `GET /api/pay/config` is public and reports `cashfree.env`
  (`api.php:3496-3512`), telling any visitor whether the shop is in sandbox.
  Drop the env from the public payload; the checkout note can be driven by a
  boolean instead.
- `cms/cf-doctor.html` ships to the public site (the deploy copies every
  `cms/` file except `data/` and `uploads/`). It is harmless — it charges
  nothing and deliberately uses an invalid session id — but it is an internal
  tool at a guessable URL. Move it behind admin or a token.
- The "2% off" badge is hardcoded in the checkout markup (`app.js:3795`)
  while the server owns `prepaidPct` (`api.php:3424`). It is corrected on
  paint (`app.js:3898`), but the first paint can show the wrong number.
- The repo's `cms/data/db.json` has **no** payment settings at all
  (`payProvider`, `cfEnv`, `cfAppId`, `upiId` all absent), so on this checkout
  `cashfree_active_provider()` returns `demo`. That is expected — the live
  `data/db.json` is excluded from deploy — but it means no payment behaviour
  can be exercised from the repo without seeding a QA fixture. A labelled
  sandbox fixture (never the repo DB) would let the gates cover the checkout.

---

## Suggested order

1. **0a/0b** — repo integrity + ledger + gate regexes (already started: `c61498b`).
2. **#1 reconcile the right attempt** and **#3 overpayment alert** — correctness with money attached.
3. **#2 payment-received notification** — cheapest large trust win.
4. **#4 EMI at checkout** — largest conversion lever for this price band.
5. **#5 unpaid-order recovery**, then **#6 Cashfree payment links**.
6. **#7 poller**, **#8 COD enforcement**, **#9 hygiene** as a single small pack.

Nothing in this document is implemented except 0a.
