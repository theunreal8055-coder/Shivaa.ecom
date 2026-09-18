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

---

# PART 2 — second pass: concurrency, gateway protocol, money math

Same rules as Part 1: every claim carries a `file:line` verified in this
checkout on 18 Sep 2026. Numbering continues from Part 1.

## 10 · The three Cashfree reconcile paths write the whole database with no lock (data loss)

`shv_wants_write_lock()` (`api.php:183-194`) returns **false** for every route
in its `$slow` list — and that list contains `pay/cashfree/webhook` and
`pay/cashfree/status`. `pay/cashfree/return` is a GET, so it never locks
either. All three therefore run:

```
db_load()  →  outbound Cashfree call (CURLOPT_TIMEOUT 25 s, api.php:444)  →  db_save()
```

`db_save()` rewrites the **entire** `db.json` from that request's snapshot
(`api.php:218-231`). So every other write that lands during the gateway call —
another customer's order, a profile edit, a rate alert, an admin change — is
silently overwritten by a snapshot that is up to 25 seconds stale. The routes
holding the stalest snapshots for the longest are exactly the payment routes.

This window is not theoretical: at the end of a Cashfree payment the browser
return (`pay/cashfree/return`) and the signed webhook arrive within
milliseconds of each other, so **every payment races itself**. The dedupe by
`ref` inside one snapshot means the customer is credited once, but the audit
entry doubles and any unrelated concurrent write is lost.

Fix, in order of preference: (a) make the external call *first*, then
`db_load` inside the exclusive lock and apply; (b) simply take the write lock
for these three routes; (c) give `cashfree_apply` a targeted merge write
instead of a whole-file replace.

## 11 · The webhook always answers 200 — even when the reconcile failed (lost payments)

`api.php:3746-3764`: the return value of `$cashfree_reconcile()` is discarded
and `jout(200, ['success' => true])` runs unconditionally. When
`GET /pg/orders/{id}` times out or Cashfree returns 5xx, the code takes the
`STATUS_UNAVAILABLE` branch (`api.php:3716-3723`), logs it — and still tells
Cashfree "delivered". Cashfree then stops retrying.

That is precisely the lane that exists for *"customer paid and closed the
tab"* (setup guide test #7). Answer **5xx on `STATUS_UNAVAILABLE`** so Cashfree
retries; keep 200 for terminal states and for genuinely unknown order ids.

## 12 · Refund webhooks never advance refund rows

`cashfree_apply()` (`api.php:478-525`) only ever touches order status.
`cashfree_apply_refund()` is called from exactly one place — the customer
poller (`api.php:3775-3785`). So a refund that Cashfree completes while the
customer never reopens the order page stays `PENDING` in the ledger
indefinitely, even though `CASHFREE-INTEGRATION.md` promises *"the customer
order-page poller **and webhook** advance the status"*. Route refund events to
`cashfree_apply_refund()` in the webhook handler.

## 13 · The ledger never records how the customer paid, or the gateway payment id

`'instrument' => substr((string)($st['payment_method'] ?? ''), 0, 40)`
(`api.php:514`) reads `payment_method` off the **order** entity. The
documented `GET /pg/orders/{order_id}` response carries no such field — it
returns `order_status`, `order_amount`, `customer_details`, `order_meta` and a
`payments.url`. So `instrument` is **always an empty string**.

Nothing in `api.php` ever calls `/pg/orders/{id}/payments` (the only
sub-resource calls are `/refunds`, at `api.php:3779` and `api.php:3894`). The
consequence is that the shop never stores `cf_payment_id`, `bank_reference` or
the payment method — the three fields needed to answer *"was I charged?"*, to
defend a chargeback, and to match Cashfree's settlement report line by line.
The signed webhook already contains `data.payment.cf_payment_id`,
`bank_reference` and `payment_method`; today it reads only
`data.order.order_id` (`api.php:3758`) and throws the rest away.

## 14 · No settlement reconciliation

Nothing calls `/pg/settlements`; `admin/reports` is computed purely from the
local ledger. There is therefore no way to notice a payment Cashfree settled
that the ledger missed — the exact failure #10 and #11 can produce. A nightly
admin job that diffs the last N Cashfree orders against `cfAttempts` would
close the loop and turn a silent loss into a to-do.

## 15 · A double payment is swallowed twice over

Beyond the `already` early-return (`api.php:508-510`), `order_add_payment()`
(`api.php:1932-1944`) **clamps** every approved payment to the remaining room:
`$pay['amount'] = max(0, min($pay['amount'], $room))`. So if a second full
payment ever did reach the ledger it would be written as a **₹0 row** and the
real amount discarded without a trace. Both paths leave the customer out of
pocket with nothing recorded — see Part 1 #3.

## 16 · Royalty points are granted before payment and never clawed back

`api.php:3453` applies `-pointsUsed + earned` at **order creation**, before any
payment happens, and `loyaltyPoints` is written nowhere else in the file
(the only other occurrences are reads at 2002, 2931, 3414, 4460). Therefore:

- an order that is never paid still earns points;
- a fully refunded order keeps them;
- a cancelled order keeps them.

At 1 point = ₹1 with a 10%-of-subtotal redemption cap (`api.php:3414`), a
₹62,877 order earns 628 points — ₹628 of spendable credit that survives a full
refund. Fix: earn on `Paid`, claw back on refund and cancellation.

## 17 · An admin can mark an order Paid or Refunded with no money movement

`PUT /api/orders/{id}` (`api.php:3473-3487`) writes `paymentStatus` straight
from the request body after only a character-class check — no ledger row, no
`amountPaid`, no `balance`, no `paidAt`. The admin dropdown offers exactly
`Awaiting payment / Paid / Refunded` (`admin.js:1029-1030`). It is
audit-logged as `order.updated`, which is good, but the customer-facing order
page then prints *"Paid via Online ₹62,877"* while `paymentLedgerHTML()`
(`app.js:4425-4440`) shows nothing received.

`paymentStatus` should be **derived** from the ledger. A manual override should
create an explicit ledger row carrying a reason and the admin's id, so status
and money can never disagree.

## 18 · A payment screenshot regresses an already-paid order

`pay/proof` (`api.php:3661-3702`) rejects only `Cancelled` orders, then sets
`paymentStatus = 'Proof submitted'` unconditionally — including on an order
Cashfree already marked `Paid`. The order page's pending/verification cards key
off that string (`app.js:4535-4548`), so a fully-paid order can start
presenting itself as awaiting verification. Guard on `amountPaid >= total`.
(The upload handling itself is solid: magic-byte check, 6 MB cap, random
filename, IP + per-user rate limits, amount clamped to the order total.)

## 19 · The return redirect blocks on a 25-second gateway call

`pay/cashfree/return` (`api.php:3724-3745`) runs `$cashfree_reconcile()` — an
outbound `GET /pg/orders/{id}` with a 25 s timeout (`api.php:444`) — **before**
sending the 302. On a slow Cashfree response the customer stares at a blank
white page for up to 25 seconds at the single worst moment of the purchase.
Send the 302 immediately with `?cf=pending` and let the existing poller or the
webhook resolve it; or cut this path's timeout to ~5 s.

## 20 · The rate lock the customer is promised is not the lock the server honours

Three different numbers govern one promise:

| place | value | source |
|---|---|---|
| checkout countdown | `lockMinutes`, clamped 5–60 min | `app.js:3829`, from `pay/config` (`api.php:3508`) |
| whether the lock is *sent* | hardcoded `20 * 60` | `app.js:4285` |
| whether the lock is *honoured* | hardcoded `1200` s | `api.php:3365` |

Set `rateLockMinutes` to 30 in admin and the UI counts down 30 minutes while
every lock older than 20 minutes is silently dropped at submit — the order is
priced at **live** rates while the customer was told their rate was held. In a
gold shop where ₹/g moves intraday that is a price-integrity bug, not a
cosmetic one. All three must read the same setting.

## 21 · `shv_dev_mode()` can switch on free payments from a file in a deploy-excluded directory

`api.php:2740-2745`:

```php
if (PHP_SAPI === 'cli') return true;
if (is_file(__DIR__ . '/data/.otp-dev-mode')) return true;
$ra = (string)($_SERVER['REMOTE_ADDR'] ?? '');
return $ra === '127.0.0.1' || $ra === '::1' || $ra === '0.0.0.0';
```

`data/` is excluded from the auto-deploy (`deploy/auto_sync.php:263`), so
`.otp-dev-mode` is invisible to the repo and survives every deploy. With that
one file present, `pay/order` hands out `demo_` gateway references and
`pay/verify` (`api.php:3620-3640`) credits the caller's own order — free
jewellery, one stray file away. Gate the simulated gateway on an explicit
environment variable **and** the admin role, and show a red banner in the admin
panel whenever dev mode is active on a public host.

## 22 · `/api/pay/cashfree/return` is unauthenticated, unrate-limited and triggers an outbound gateway call

It appears in no `pub_rate()` call (those are only at 2563, 4645, 4656, 5266,
5274) and GET routes take no lock. Anyone able to guess or enumerate an order
id can drive repeated `GET /pg/orders/{id}` calls at Cashfree — quota burn and
a small amplification vector. It cannot credit an unpaid order (the PAID +
exact-amount check in `cashfree_apply` holds), so this is hardening rather than
a vulnerability. Add `pub_rate()` on the client IP.

## 23 · CSP still whitelists the gateway that v128 deleted

`.htaccess:109` keeps `form-action … https://secure.payu.in
https://test.payu.in` after v128 removed PayU entirely, and `connect-src`
still allows `https://*.onrender.com`. Dead allowances on the one page where
CSP matters most. The Cashfree side is correct (`frame-src`, `script-src`,
`connect-src`, `img-src` and `form-action` all allow `*.cashfree.com`) — that
is why the v132 blocked-iframe detector has never had to fire.

Separately, `script-src 'unsafe-inline'` is required by the inline release
stamp and bootstrap in `index.html` (lines 71 and 374). Moving those two to a
hash or nonce would materially tighten the checkout page.

## 24 · Webhook timestamp parsing is brittle

`cashfree_webhook_verified()` (`api.php:557-566`) accepts `^\d{10,16}$` but
computes age as `abs(time() * 1000 - (int)substr($ts, 0, 13))`. A **10-digit
seconds** timestamp passes the regex, is read as ≈1.7e9, and the age check then
fails by ~1.7e12 ms — every webhook would be rejected as `bad signature` with
no diagnostic distinguishing it from a real forgery. Cashfree documents
milliseconds, so this is latent, not live; a length branch costs one line.

---

## What this pass did *not* find (checked and sound)

- **PCI scope** — hosted checkout only; no card field, PAN or CVV appears
  anywhere in `cms/`. The secret key is stored server-side and stripped from
  the public settings projection by the recursive blocklist at
  `api.php:5370-5390`.
- **Amount tampering** — the charge is always the stored order balance
  (`api.php:3536-3541`), never a browser-supplied figure, with a ₹1 cr ceiling.
- **Signature verification** — HMAC-SHA256 over the *raw* body with
  `hash_equals`, matching Cashfree's documented scheme.
- **Webhook payload shape** — `data.order.order_id` is correct for
  `PAYMENT_SUCCESS_WEBHOOK` / `PAYMENT_FAILED_WEBHOOK` /
  `PAYMENT_USER_DROPPED_WEBHOOK` on API version 2023-08-01 (verified against
  Cashfree's own webhook reference).
- **Refund authorisation and math** — `admin/refund` (`api.php:3861-3900`) is
  admin-only, gateway-checked, blocks a second refund while one is settling,
  computes `refundable` from committed amounts, and derives a stable
  `refund_id` that Cashfree treats as an idempotency key.
- **Upload handling** — `pay/proof` verifies magic bytes, caps size, randomises
  the filename and rate-limits per IP and per user.
- **Database writes** — atomic temp-file + rename with a fail-closed guard
  (`api.php:218-240`); a crash can never truncate `db.json`.
- **CSP for Cashfree** — correct and complete for the iframe, SDK script, XHR
  and form posts.

## Revised order of work

| # | item | why first |
|---|---|---|
| 10, 11 | lock the reconcile paths; 5xx on a failed reconcile | silent money loss on *every* payment |
| 20 | one rate-lock number in three places | price integrity on a gold shop |
| 21 | kill-switch `shv_dev_mode()` for payments | free-order risk from one stray file |
| 13, 14 | store `cf_payment_id` / `bank_reference` / method; settle-reconcile | you cannot defend or match what you never stored |
| 12, 16, 17 | refund webhooks; earn-on-paid + clawback; derive `paymentStatus` | ledger must equal money |
| 15, 18, 19 | overpayment trace, proof-on-paid guard, non-blocking redirect | customer-visible correctness |
| 22, 23, 24 | rate-limit the return URL, prune CSP, timestamp branch | hardening |

Still nothing implemented beyond the Part 1 `c61498b` shell-path fix.
