# DEPLOY v138 — A cancelled order now gives back the stock it reserved

**What this is:** the last piece of the same problem you spotted twice already.
An invoice was issued before payment; points were granted before payment; and
stock was reserved at checkout and **never returned** when an order was
cancelled.

**Deliverable:** `shivaa-update-v138.zip` — **5 files**, md5
`e3e48f6ad116b7bbaaaffc381f32c948`

```
.htaccess      5,310 bytes
api.php      386,936 bytes
index.html    26,649 bytes
js/app.js    560,283 bytes
sw.js          7,212 bytes
```

Root layout — extract into the **`public_html` ROOT**.

> **v138 contains everything in v135, v136 and v137.** Deploy only this one.
> If you already downloaded a v137 zip, you can discard it — v138 supersedes it
> and the file contents differ.

---

## What was wrong

When a customer places an order, the shop immediately takes two things from
them: the loyalty points they chose to redeem, and the stock the ordered items
were holding.

The v137 release fixed the points half — cancelling an order now returns the
redeemed points. But the stock half had no matching credit anywhere in the code.
Every cancelled order permanently shrank the stock number by units that were
never actually sold.

## What v138 does

One new helper, `order_restore_stock()`, deliberately mirroring
`order_restore_points()` so the two behave identically:

- fires only when an order reaches **Cancelled**;
- carries a **one-shot flag** (`stockRestored`), so editing an order's status
  repeatedly cannot inflate stock more than once;
- logs a `stock.restored` audit event per product line, with the order id,
  product id and quantity, so you can see exactly what was returned.

It is wired into the same admin status-change path as the points restore.

## How much this actually matters

I want to be straight with you rather than oversell it: **this is a low-impact
fix in your shop today.** Stock here does not block a sale — no part of the
checkout refuses an order because stock is low, and no buy button greys out on
it. Every one of your 77 products currently carries a nominal 8 or 10.

What it does fix is your **low-stock report**, which warns on anything at 3 or
below. Left alone, cancelled orders would keep nibbling those numbers down until
the report started naming products that were never actually sold out. That
report is one of the few numbers you read, so it should be true.

---

## Still open, and why it needs you

**Abandoned orders still hold redeemed points.** When a customer spends points
at checkout and then closes the tab, those points stay spent unless you
manually set the order to Cancelled in the admin — which now correctly returns
both the points *and* the stock.

There is no "customer cancels their own order" button and nothing that expires
an unpaid order automatically, so today this is a manual step for you.

I did not build an automatic expiry, because the right window is a commercial
decision, not a technical one. Too short and it cancels orders you are still
chasing payment on. Tell me the number you want — 24 hours, 3 days, 7 days — and
I will build it. Note it also needs something to run it on a schedule, which
this hosting does not currently have.

**Also still waiting on you, unchanged from v137:** the receipt email (needs a
new non-OTP mail sender plus your wording), real EMI (needs EMI enabled in your
Cashfree dashboard), unpaid-order recovery (needs SMS/WhatsApp credentials),
Payment Links (needs a Cashfree sandbox key), and settlement reconciliation
(needs live settlement data).

---

## Verification performed

- PHP parse check on the edited `api.php` — clean, 125 top-level nodes. The
  parser was proven against a deliberately broken file first, so this is a real
  check and not a no-op. **This sandbox has no PHP binary, so nothing here was
  executed** — it is a parse check, not a run.
- Structural check via the parser's syntax tree: `order_restore_stock` exists,
  takes both arguments by reference, guards on `Cancelled`, uses the
  `stockRestored` one-shot flag, writes `stock`, emits `stock.restored`, and
  `unset()`s its by-reference loop variable.
- Gate re-run **against the zip's own extracted bytes**, not the working tree:
  **249/252** smoke assertions, **2/18** audit findings present, **10/10**
  payment invariants intact.
- All 5 files in the zip are byte-identical to the committed tree.
- Release stamps are a clean **138/138/138** triple.

The 3 remaining smoke failures are unchanged from v137 and are past-release
scope rules, not defects: v125's "no stale `?v=125` stamp" (written for a
release that never shipped), v125's "owner locks byte-identical to HEAD" (a
UI-only rule from that release), and v127's "the frozen v125 triple is
untouched" (v127 was a repair; v138 is a release).

## Deploy

1. Back up the live `public_html` first.
2. Extract `shivaa-update-v138.zip` into the `public_html` **ROOT**, overwriting.
3. Hard-refresh the storefront. The release stamp should read **138**.
4. Test: place an order, cancel it in the admin, and confirm both the customer's
   points and the product's stock came back.
