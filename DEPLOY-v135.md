# DEPLOY v135 — payment correctness release

**What this is:** the first repair batch from `docs/PAYMENT-EXPERIENCE-NEXT.md`.
13 of the 15 Part-2 findings, plus 4 items from Part 1. Payment plumbing only —
no design change, no product/price/rate change, no database migration.

**Deliverable:** `shivaa-update-v135.zip` — **5 files**, 974 KB,
md5 `a798f2f92ff1f3cf3b5a0b7efe00843c`

```
.htaccess      5,310 bytes
api.php      376,115 bytes
index.html    26,649 bytes
js/app.js    559,502 bytes
sw.js          7,212 bytes
```

Root layout — extract into the **`public_html` ROOT**, exactly like v127.

---

## ⚠ Before you touch anything

1. **Take a full `public_html` backup zip first** (hPanel → Files → Backup).
   This release replaces `api.php`, which handles every payment. Owner rule #1.
2. **Note your current Cashfree keys are untouched.** They live in
   `data/db.json`, which is *not* in this zip and is excluded from the
   auto-deploy. Nothing here reads, moves or re-validates them.
3. This is a **release**, not a repair: the version triple moves to **135**
   (`__SHIVAA_REL=135`, `APP_REL=135`, `SHELL='shivaa-shell-v135'`) and `sw.js`
   **is** in the zip. Returning visitors' service workers update on their next
   visit; nobody has to clear a cache.

## Install

1. Backup (above).
2. Extract `shivaa-update-v135.zip` into `public_html` **ROOT** — it overwrites
   `.htaccess`, `api.php`, `index.html`, `sw.js` and `js/app.js`.
3. If your `.htaccess` has custom panel rules, **merge, don't blind-overwrite**
   — the only change here is one line: the Content-Security-Policy no longer
   lists `secure.payu.in`, `test.payu.in` or `*.onrender.com`.

## Check list (do these in order)

1. **Site loads** — `https://www.shivaa.in/` shows the home page, not a blank
   shell. View-source should contain `window.__SHIVAA_REL=135` and
   `<script src="/js/app.js?v=135" defer>`.
2. **Checkout opens** — add a piece to the cart, go to checkout. The payment
   row still reads "Pay online · UPI / card / net-banking" with the 2% badge.
3. **Sandbox order end-to-end** (Admin → Payments must be on Sandbox with the
   `TEST_` keys). Pay with `testsuccess@gocash`. Expected: you come straight
   back to the order page on a **"Confirming your Cashfree payment…"** banner
   that flips to **"Payment received"** within a couple of seconds. It no
   longer sits on a white page while the server talks to Cashfree.
4. **Failed payment** — `testfailure@gocash`. Expected: the order stays
   payable and the retry button works.
5. **Close the tab after paying** — pay, then close the browser. The webhook
   still marks it Paid (check Admin → Orders). If Cashfree's own retry had to
   kick in, that is now possible because a failed status check answers 503
   instead of a false "delivered".
6. **Ledger detail** — on a paid order, open Payment history. The line should
   now name the instrument (e.g. `upi collect`, `card VISA ••••1111`,
   `netbanking State Bank Of India`). Before v135 this column was always
   blank.
7. **Rate lock** — lock the rate at checkout and place the order. The charged
   total must match the locked total.
8. **COD ceiling** — try a COD order above ₹50,000. It must now be refused by
   the server with a clear message, not just hidden in the UI.

## Rollback

Restore the backup zip, or copy the previous five files back from
`~/shivaa-deploy-backup/` if the auto-sync cron deployed it. Nothing in this
release changes stored data, so a rollback is clean.

---

## What changed, finding by finding

| # | fix | where |
|---|---|---|
| 10 | the reconcile now calls Cashfree **first**, then takes the write lock and **re-reads** the database before applying — a webhook can no longer overwrite the whole `db.json` from a snapshot up to 25 s stale | `api.php` `$cashfree_reconcile` |
| 11 | the webhook answers **503** when the status call fails, so Cashfree retries instead of dropping the event | `api.php` `pay/cashfree/webhook` |
| 12 | refund webhooks now advance the refund rows (was poller-only, so a refund could stay PENDING forever) | `api.php` `pay/cashfree/webhook` |
| 13 | the ledger stores `cfPaymentId`, `bankReference` and the payment method via a new `GET /pg/orders/{id}/payments` call | `api.php` `cashfree_fetch_payments`, `cashfree_payment_detail`, `cashfree_apply` |
| 1 | the poller sweeps **every** non-terminal attempt (max 4), so paying an older retry is confirmed | `api.php` `pay/cashfree/status` |
| 15 / 3 | a second payment on a settled order is recorded in `overpayments[]` + `audit_log('payment.overpayment')` instead of being silently swallowed or clamped to ₹0 | `api.php` `cashfree_apply` |
| 17 | an admin marking an order **Paid** now writes an explicit `manual` ledger row with a reason, so status and money cannot disagree | `api.php` `PUT orders/{id}` |
| 18 | a payment screenshot can no longer regress an already-**Paid** order to "Proof submitted" | `api.php` `pay/proof` |
| 19 | the return URL redirects immediately — no more blank white page for up to 25 s | `api.php` `pay/cashfree/return` |
| 20 | one rate-lock window everywhere: `rateLockMinutes` (5–60 min) drives the countdown, the submit check **and** the server (was 20 min / 1200 s hardcoded) | `api.php` order create · `app.js` `placeOrder` |
| 21 | the demo gateway needs the dev-host check **and** `allowDemoPayments`, and is refused in production — a stray `data/.otp-dev-mode` can no longer enable free orders | `api.php` `shv_demo_payments_ok` |
| 22 | the return URL is rate-limited per IP (120/hour) | `api.php` `pay/cashfree/return` |
| 23 | CSP no longer whitelists the deleted PayU domains or `*.onrender.com` | `.htaccess` |
| 24 | a 10-digit **seconds** webhook timestamp no longer fails the replay check as "bad signature" | `api.php` `cashfree_webhook_verified` |
| 8 | the ₹50,000 COD ceiling is enforced server-side (new `codMaxAmount` setting) | `api.php` order create |
| 9 | `/api/pay/config` no longer broadcasts sandbox vs production | `api.php` · `app.js` |
| 7 | the confirmation poller backs off to ~2.5 minutes instead of giving up after 15 s | `app.js` `pollPP` |

## Behaviour changes to know about

- **The demo/simulated gateway is off unless you switch it on.** It now needs
  `"allowDemoPayments": true` in `data/db.json` *and* a dev host. Production is
  unaffected — production has always used Cashfree. If a local preview needs
  the fake gateway, set that flag in the preview's `db.json`.
- **The order page always returns on `?cf=pending`** and the poller resolves it,
  instead of the server deciding success before redirecting. Normal case: the
  banner flips to "Payment received" in about a second.
- **New audit-log events** you may see in Admin → Audit:
  `payment.overpayment`, `payment.manual-override`, `payment.manual-refund-flag`,
  `payment.cashfree-webhook-noorder`.

## Gates run on this build

Run on the **zip's own extracted contents**, not just the working tree:

```
v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · v121 14/14
v122 22/22 · v123 14/14 · v124 20/20 · v125 25/27 · v127 26/27   = 249/252
pay-audit-check.js: 13/15 findings FIXED · 10/10 invariants intact
PHP syntax: all 8 PHP files parse clean (php-parser, TOKEN_PARSE equivalent)
JS syntax:  app.js + admin.js pass node --check
```

**The 3 remaining gate failures are past-release scope rules, not defects:**

| gate | assertion | why it fails |
|---|---|---|
| v125 | "the **v126** release triple carries no stale `?v=125` stamp" | written for the dead v126 release. The 7 `v=125` strings left in `app.js` and the 1 in `v116.js` are the **category-tile photo stamps** (`${c.img}?v=125`, the `&v=125` branch) and the logo fallback `/images/logo.png?v=125` — those 18 images have not changed since v125, so bumping them would make every phone re-download the whole category set for no reason |
| v125 | "owner locks respected: `api.php` / `.htaccess` / `db.json` byte-identical to HEAD" | that was the v125 **UI-only** rule. v135 is a payment release and must edit both |
| v127 | "the frozen **v125** triple is untouched — no stamp bump" | v127 was a *repair*; v135 is a *release*, so bumping the triple is correct |

None of the three has been weakened to make the numbers look better.

**Could not be run here:** the php-sweep (211 routes) and `php -l` — this
sandbox has no PHP binary, so PHP was verified by parsing every file with
`php-parser` instead (a real syntax check, proven against 5 deliberately
broken samples), **not** by executing it. No payment path was executed
end-to-end; steps 3–8 of the check list above are the owner's to run.

## Not in this release

| # | item | why it waits |
|---|---|---|
| 2 | payment-received email / WhatsApp + owner ping | needs `mail.php` exercised on Hostinger and a decision on wording |
| 4 | EMI at checkout | needs EMI / no-cost EMI **enabled in your Cashfree dashboard** first (no-cost needs a bank agreement) |
| 5 | unpaid-order recovery nudges | needs the SMS/WhatsApp gateway configured |
| 6 | Cashfree Payment Links for WhatsApp orders | needs a sandbox key to test against |
| 14 | settlement reconciliation report | needs live settlement data to verify against |
| 16 | earn royalty points on *Paid*, claw back on refund | changes customer-visible rewards — your call, not mine |

Say the word and v136 picks these up.
