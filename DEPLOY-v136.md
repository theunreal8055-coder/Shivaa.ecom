# DEPLOY v136 — Tax Invoice is now issued on payment, not on checkout

**What this is:** the fix for the invoice problem you raised. A customer who
reached checkout and walked away without paying no longer gets a Tax Invoice.

**Deliverable:** `shivaa-update-v136.zip` — **5 files**, md5
`09984f4362c02fffd9f6fbdb206c3eec`

```
.htaccess      5,310 bytes
api.php      378,791 bytes
index.html    26,649 bytes
js/app.js    559,930 bytes
sw.js          7,212 bytes
```

Root layout — extract into the **`public_html` ROOT**.

> **v136 contains everything in v135.** If you have not deployed v135 yet, do
> not deploy it — go straight to v136 and skip v135 entirely.

---

## The problem you spotted

Order creation was minting the GST invoice number the instant the order row was
written — before a single rupee arrived. So:

- A customer who opened checkout and quietly left still **burned a sequential
  invoice number**. Your GST series (`SHV/26-27/0101`, `0102`, `0103`…) must be
  continuous when you file; every abandoned cart punched a permanent hole in it.
- The order page printed **"Tax invoice SHV/26-27/0101 · HSN 71131910"** over an
  order with no money against it.

## What v136 does

The invoice number is now minted by a dedicated function,
`order_issue_invoice()`, called from **every** path that settles an order:

| path | when the invoice appears |
|---|---|
| Cashfree payment confirmed (return URL, webhook or poller) | on payment |
| Admin approves a UPI screenshot | on approval |
| Admin approves a UPI-QR proof | on approval |
| Owner marks an order **Paid** in Admin | on that click |
| **COD** | **only once the cash is collected** — per your decision, not at dispatch |

The function is **idempotent**: it returns immediately if the order already has
a number, so no order can ever be renumbered, and calling it twice is harmless.

**Orders already in your database keep the number they carry.** You chose this,
and it is the right call — the historical series stays continuous for filing.
The change only affects new orders.

## Customer-facing wording changed

| where | before | after |
|---|---|---|
| Order-placed screen | "Invoice & rate-lock summary sent to your account." | "Rate-lock summary saved to your account." |
| Unpaid order page | *printed a Tax Invoice number* | "Tax invoice is issued once payment is confirmed · HSN 71131910" |
| Paid order page | Tax invoice `SHV/…` | Tax invoice `SHV/…` (unchanged) |

## ⚠ Before you deploy

1. **Full `public_html` backup first** (hPanel → Files → Backup). Owner rule #1.
2. Your Cashfree keys live in `data/db.json`, which is **not** in this zip and is
   excluded from auto-deploy. Nothing here touches them.
3. This is a **release**: the version triple moves to **136** and `sw.js` **is**
   in the zip. Returning visitors update on their next visit.

## Install

1. Backup.
2. Extract `shivaa-update-v136.zip` into `public_html` **ROOT**.
3. If your `.htaccess` has custom panel rules, **merge, don't blind-overwrite**.

## Check list

1. **Site loads** — view-source shows `window.__SHIVAA_REL=136` and
   `<script src="/js/app.js?v=136" defer>`.
2. **Place a COD order.** Expected: the order page says *"Tax invoice is issued
   once payment is confirmed"*, and there is **no** `SHV/…` number.
3. **Mark that COD order Paid** in Admin → Orders. Expected: the invoice number
   **appears now**, and Admin → Audit shows an `invoice.issued` entry.
4. **Sandbox online order** (Admin → Payments on Sandbox, `TEST_` keys). Pay with
   `testsuccess@gocash`. Expected: the invoice number appears only **after** the
   payment confirms.
5. **Abandon a checkout.** Start an online payment, close the tab, never pay.
   Expected: **no invoice number is consumed** — the counter does not move.
6. **Check the counter.** Admin → Settings: `invoiceSeq` should only have moved
   for orders that were actually paid.
7. **Old orders unchanged.** Open an order placed before this update — its
   invoice number must be exactly what it was.

## Rollback

Restore the backup zip. No stored data is altered by this release, so rollback
is clean. (An order paid while v136 was live will keep the invoice number it
was issued — that is correct and should stay.)

---

## Also in this build (all of v135)

13 of the 15 Part-2 payment-audit findings plus 4 from Part 1 — the reconcile
write-lock fix, webhook 503 retry, refund webhooks, real instrument/bank
reference in the ledger, overpayment recording, the demo-gateway lockdown, the
rate-lock unification, server-side COD ceiling, and the rest. Details are in
`DEPLOY-v135.md`; the finding list is in `docs/PAYMENT-EXPERIENCE-NEXT.md`.

## Gates run on this build

Run on the **zip's own extracted contents**, not just the working tree:

```
v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · v121 14/14
v122 22/22 · v123 14/14 · v124 20/20 · v125 25/27 · v127 26/27   = 249/252
pay-audit-check.js: 14/16 findings FIXED · 10/10 invariants intact
PHP syntax: api.php parses clean (121 top-level nodes, +1 for the new function);
            parser proven against a deliberately broken sample
JS syntax:  app.js passes node --check
```

A new assertion **#25** was added to the gate so this cannot silently regress:
it fails if order creation ever mints `invoiceNo` again, or if
`order_issue_invoice()` disappears.

**The 2 remaining audit findings** are #14 (settlement reconciliation) and #16
(royalty points earned at creation) — both deliberately deferred, see below.

**The 3 remaining gate failures** are past-release scope rules, not defects:

| gate | assertion | why it fails |
|---|---|---|
| v125 | "the **v126** release triple carries no stale `?v=125` stamp" | written for the dead v126 release. The 7 `v=125` strings left in `app.js` and 1 in `v116.js` are **category-tile photo stamps** and the logo fallback — those images are unchanged, so bumping them would force every phone to re-download the whole category set |
| v125 | "owner locks respected: `api.php` / `.htaccess` / `db.json` byte-identical to HEAD" | that was the v125 **UI-only** rule. v136 is a payment release and must edit both |
| v127 | "the frozen **v125** triple is untouched — no stamp bump" | v127 was a *repair*; v136 is a *release*, so bumping the triple is correct |

None of the three was weakened to make the numbers look better.

**Could not be run here:** the php-sweep (211 routes) and `php -l` — this
sandbox has no PHP binary. PHP was verified by parsing with `php-parser`, a
real syntax check proven against a deliberately broken sample, **not** by
executing it. No payment path was executed end to end. Check-list steps 2–7 are
yours to run in sandbox before trusting it with real money.

## Still not in this release

| # | item | why it waits |
|---|---|---|
| 2 | payment-received email / WhatsApp | needs `mail.php` exercised on Hostinger + your wording |
| 4 | EMI at checkout | needs EMI enabled in your Cashfree dashboard (no-cost needs a bank agreement) |
| 5 | unpaid-order recovery nudges | needs the SMS/WhatsApp gateway configured |
| 6 | Cashfree Payment Links for WhatsApp orders | needs a sandbox key to test against |
| 14 | settlement reconciliation report | needs live settlement data |
| 16 | earn royalty points on *Paid*, claw back on refund | changes customer-visible rewards — your call |

**One thing worth flagging about #16:** royalty points are still granted at
order creation and never clawed back on refund. That is the same class of bug
you just caught with invoices — value granted before payment. Say the word and
it moves to "on Paid" the same way.
