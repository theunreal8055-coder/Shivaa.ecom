# DEPLOY v137 — Royalty points are earned on payment, not on checkout

**What this is:** the second half of the problem you spotted. You caught the
invoice being issued before payment; loyalty points had exactly the same flaw.

**Deliverable:** `shivaa-update-v137.zip` — **5 files**, md5
`740feb712770a3415b300b55e3a0100d`

```
.htaccess      5,310 bytes
api.php      384,392 bytes
index.html    26,649 bytes
js/app.js    560,283 bytes
sw.js          7,212 bytes
```

Root layout — extract into the **`public_html` ROOT**.

> **v137 contains everything in v135 and v136.** If you have not deployed those,
> deploy only this one and skip the other two entirely. It is self-contained.

---

## The leak you led me to

Your invoice question made me check whether anything *else* handed out value
before payment. Royalty points did — and worse than the invoice, because points
are spendable money:

1. Points were credited the instant the order row was written.
2. They were **immediately redeemable** against the next order (10% cap).
3. **Nothing ever took them back** — not a refund, not a cancellation.

So a customer could place a ₹3,00,000 order, walk away without paying, and keep
3,000 royalty points worth ₹3,000 off their next real purchase.

## What v137 does

Three new helpers, following the same pattern as the invoice fix:

| helper | when it runs | what it does |
|---|---|---|
| `order_grant_points()` | order reaches **Paid** | credits `earnedPoints` to the customer |
| `order_revoke_points()` | order becomes fully **Refunded** | takes the points back |
| `order_restore_points()` | order is **Cancelled** | returns points the customer *redeemed* on it |

All three are **idempotent** — each is guarded by a flag on the order
(`pointsGranted` / `pointsRestored`), so repeated webhooks, retries or status
edits can never double-credit or double-refund.

Granting is wired into the same four settling paths as the invoice: Cashfree
confirmation (return URL, webhook, poller), the demo gateway, admin UPI-proof
approval, admin UPI-QR approval, and an owner marking an order Paid.

**Two deliberate limits, so nothing surprising happens:**

- **Revoke only on a FULL refund.** A partial refund leaves a partly-paid order
  that legitimately earned its points.
- **Balances are clamped at zero.** If a customer already spent the points and
  then gets a refund, we absorb the shortfall rather than pushing their balance
  negative. The shortfall is written to the audit log (`loyalty.revoked`
  carries `asked`, `points` and `short`) so you can see it.
- **Pre-v137 orders are untouched.** Their points were credited at creation and
  carry no `pointsGranted` flag, so the revoke helper skips them. No existing
  customer loses points they already have.

## Customer-facing wording changed

| where | before | after |
|---|---|---|
| Order-placed screen | "You **earned** 3000 royalty points ✦" | "You **will earn** 3000 royalty points **once payment is confirmed** ✦" |
| Checkout balance | jumped up by the earned amount immediately | drops only by what was redeemed |

Redeeming points at checkout still works exactly as before — that part was
always correct.

## ⚠ Before you deploy

1. **Full `public_html` backup first.** Owner rule #1.
2. Your Cashfree keys live in `data/db.json`, which is **not** in this zip.
3. Release triple moves to **137**; `sw.js` **is** in the zip.

## Install

1. Backup.
2. Extract `shivaa-update-v137.zip` into `public_html` **ROOT**.
3. If your `.htaccess` has custom panel rules, **merge, don't blind-overwrite**.

## Check list

1. **Site loads** — view-source shows `window.__SHIVAA_REL=137` and
   `<script src="/js/app.js?v=137" defer>`.
2. **Place a COD order.** Note the points balance in the account menu.
   Expected: it does **not** go up. The order page says *"You will earn N
   royalty points once payment is confirmed."*
3. **Mark that order Paid** in Admin. Expected: the balance goes up by exactly
   N, and Admin → Audit shows `loyalty.granted`.
4. **Redeem points, then cancel.** Place an order using points, then set its
   status to Cancelled in Admin. Expected: the redeemed points come back, and
   the audit log shows `loyalty.restored`. Toggle the status back and forth —
   the points must **not** be restored a second time.
5. **Refund a paid order** (sandbox). Expected: the earned points are removed
   and the audit log shows `loyalty.revoked`.
6. **Abandon a checkout.** Start an online payment, close the tab, never pay.
   Expected: no points granted, no invoice number consumed.
7. **Invoice still works** — the v136 behaviour must be unchanged: no Tax
   Invoice until the order is Paid.

## Rollback

Restore the backup zip. Note that a rollback returns points to being granted at
checkout; points already granted under v137 stay granted, which is correct.

---

## Cumulative contents (v135 + v136 + v137)

- **v135** — 13 of the 15 Part-2 payment-audit findings plus 4 from Part 1: the
  reconcile write-lock fix, webhook 503 retry, refund webhooks, real instrument
  and bank reference in the ledger, overpayment recording, the demo-gateway
  lockdown, rate-lock unification, server-side COD ceiling.
- **v136** — Tax Invoice issued on payment, not at checkout.
- **v137** — Royalty points earned on payment, clawed back on refund, restored
  on cancellation.

**15 of the 16 audited findings are now closed.** Only **#14** remains —
settlement reconciliation against `/pg/settlements`, which needs live settlement
data from your Cashfree account to verify against.

## Gates run on this build

Run on the **zip's own extracted contents**, not just the working tree:

```
v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · v121 14/14
v122 22/22 · v123 14/14 · v124 20/20 · v125 25/27 · v127 26/27   = 249/252
pay-audit-check.js: 15/16 findings FIXED · 10/10 invariants intact
PHP syntax: api.php parses clean (124 top-level nodes, +3 for the new helpers);
            parser proven against a deliberately broken sample
JS syntax:  app.js passes node --check
```

The #16 assertion was rewritten to test behaviour rather than count
`loyaltyPoints` assignments — v137 legitimately adds three more writes, so the
old count-based check would have failed for the wrong reason.

**The 3 remaining gate failures** are past-release scope rules, not defects:

| gate | assertion | why it fails |
|---|---|---|
| v125 | "the **v126** release triple carries no stale `?v=125` stamp" | written for the dead v126 release. The `v=125` strings left in `app.js`/`v116.js` are **category-tile photo stamps** and the logo fallback — those images are unchanged, so bumping them would force every phone to re-download the whole category set |
| v125 | "owner locks respected: `api.php` / `.htaccess` / `db.json` byte-identical to HEAD" | that was the v125 **UI-only** rule. v137 is a payment release and must edit both |
| v127 | "the frozen **v125** triple is untouched — no stamp bump" | v127 was a *repair*; v137 is a *release*, so bumping the triple is correct |

None of the three was weakened to make the numbers look better.

**Could not be run here:** the php-sweep (211 routes) and `php -l` — this
sandbox has no PHP binary. PHP was verified by parsing with `php-parser`, a
real syntax check proven against a deliberately broken sample, **not** by
executing it. No payment path was executed end to end, so the points lifecycle
in check-list steps 2–6 has not been observed running. Those steps are yours to
run in sandbox before trusting this with real money.

## Still not in this release

| # | item | why it waits |
|---|---|---|
| 2 | payment-received email / WhatsApp | needs `mail.php` exercised on Hostinger + your wording |
| 4 | EMI at checkout | needs EMI enabled in your Cashfree dashboard (no-cost needs a bank agreement) |
| 5 | unpaid-order recovery nudges | needs the SMS/WhatsApp gateway configured |
| 6 | Cashfree Payment Links for WhatsApp orders | needs a sandbox key to test against |
| 14 | settlement reconciliation report | needs live settlement data from your Cashfree account |
