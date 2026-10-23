# DEPLOY-v236.md — Shivaa Ecom · v236 "The Counter Book"

**Deploy this one.** It contains v234 (the desk app you already applied) plus the
six things you asked for: money on a deal, alerts that arrive once, a real tax
invoice, an honest rate-lock request, a credit limit, and a book you can search.
v235 is skipped — it is inside this package and was never applied.

**What you said:**
*"Make a new update file for those 6 points, make it really good, and make no
mistakes."*

**Status: packaged 23 Oct 2026 — NOT deployed.** Nothing goes live without your
explicit yes. The build you applied is **v234** (23 Oct 2026). Gate:
**27 checks, 0 red**. Package: `shivaa-update-v236.zip` —
**368 files · 37,445,481 bytes** — sha256
`b6483f250bc1600b4cde420d80d78abf68ca65a4f3137c781417d09d129d6655`.

**Next release: v237.** Rollback is v235, then v234 (the build you have).

---

## 1 · The six, in one table

| # | You asked for | What it does now | Proof in the suite |
|---|---|---|---|
| 1 | payment on a deal | cash / UPI / RTGS / cheque, each with a reference; the deal shows `paid`, `due`, `total` | 10 g @ ₹7,172 = ₹71,720 + ₹72 TCS = **₹71,792**; pay ₹1,000 by RTGS → due **₹70,792** |
| 2 | push alert, announced once | the server hands each reached alert out **once** (`notifiedAt` written server-side); the desk draws it through the service worker | second claim of the same alert returns **0 alerts** |
| 3 | tax invoice | slip → GST invoice: HSN **7108** (gold) / **7106** (silver), place of supply, TCS **206C(1H) @ 0.1 %** on a buy, amount in words | slip `DS261023-0001`: 4 g = ₹28,688 + ₹29 = **₹28,717**, "Twenty-eight thousand seven hundred seventeen rupees only" |
| 4 | unfix, honestly | it is a **request queue with a status**; the office answers or declines, the jeweller sees the answer; no string promises a lock any more | a jeweller who tries to answer another jeweller's request gets **403** |
| 5 | credit limit | the office sets a rupee limit per jeweller; a deal that would cross it is refused **before it is written**, with all three figures | a 900 g deal against a ₹1,00,000 limit → **400** "…against a limit of ₹1,00,000 — ₹X is already outstanding"; a 1 g deal passes; a jeweller setting their own limit gets **403** |
| 6 | a searchable book | filter by text, date range and status, server-side; the filter is remembered on the device | a text filter that matches nothing returns **0 rows**; a date range that is empty returns **0**; every row carries paid and due |

---

## 2 · The arithmetic, by hand

**A deal.** Buy 10 g at ₹7,172/g → value ₹71,720. TCS at 0.1 % on a *buy* =
₹71.72 → rounded **₹72**. Total **₹71,792**.

**A payment.** ₹1,000 by RTGS against it → paid ₹1,000, due **₹70,792**.
`paid + due = total` is asserted, to the rupee, over real HTTP.

**Overpaying.** ₹80,000 against a ₹70,792 due is refused with the figure still
open: *"Only ₹70,792 is outstanding…"*. A bank receipt with no UTR is refused.
A cancelled deal takes no money at all.

**The ledger.** Opening is what was owed *before* the window. With one deal of
₹71,792 inside it and ₹1,000 paid: `{deals: 1, value: 71,720, paid: 1,000,
tcs: 72, due: 70,792, closing: 70,792}` — closing = opening (0) + window due
(70,792).

**A slip and its invoice.** Settle 4 g of the 10 g at ₹7,172 → ₹28,688 + ₹29 TCS
= **₹28,717**. The invoice number carries the slip (`INV/DS261023-0001`), the
total is the slip's stamped total — the invoice derives nothing from today's
rate, so a re-priced market cannot change a document you already issued.

**The day book.** Same one deal: `buyGrams 10`, `buyFineGrams 9.95`,
`buyValue 71,720`, `tcs 72`, `settledGrams 4`, `openGrams 6`, `openValue 43,032`,
`paid 1,000`, `due 70,792`.

---

## 3 · Rules this release follows

- **No re-pricing, ever.** Every rupee in a payment, ledger, invoice or limit
  comes from a deal the desk already wrote and a slip that already stamped its
  rate. Nothing re-reads the market.
- **One source for a balance.** `bullion_order_due()` feeds the deal card, the
  ledger, the day book, the limit check and the invoice — they cannot disagree.
- **A refusal speaks.** Over-limit, over-payment, a UPI receipt without a
  reference: each is refused in words, with the figures that caused it.
- **Nothing is locked until a human says so.** The rate-lock queue records a
  request and the office's answer. The service worker's `push` handler is wired,
  but **nothing sends a push yet** — the 20 s claim loop is what announces an
  alert today, and it is claimed server-side so it cannot repeat.

---

## 4 · What is in the package

368 files — v235's 367 plus **`css/v236.css`**. The stylesheet is inside the one
bundle (**70 layers / 70 blocks**, 942,329 B raw / 185,156 B gzipped — still
**one** request). No new scripts: the book lives in `js/admin.js`, which the shop
and the desk already load; `desk.html` is regenerated only for the release stamp.

Not in the package, ever: `data/db.json`, the root `.htaccess`, `config.php`,
uploads.

---

## 5 · Install

1. Back up `data/db.json`.
2. Upload `shivaa-update-v236.zip` over the site root, overwriting.
3. Hard-refresh once; the service worker moves the tab to `shivaa-shell-v236`.
4. Verify: `https://shivaa.in/api/version` must read `rel: 236` and
   `stamp.matched: true`.
5. In the desk: **Deals** → the strip shows outstanding, each row shows paid and
   due; open a deal → **Record payment** → ₹1,000 cash → the due drops by exactly
   ₹1,000. Then **Rate-lock requests** (the queue), **Credit limit** and
   **Tax invoices** in the menu.
6. As the office (admin), set one jeweller's limit and watch a big deal get
   refused with the figures — then raise the limit and watch it pass.

**Rollback:** re-upload `shivaa-update-v235.zip` (or `v234`). v236 adds **no
database migration**: payments, the limit and the rate-lock queue are new keys
that read as empty, so an older build simply ignores them.

---

## 6 · What could not be checked here

- **A real phone and a real PC.** Everything measured in jsdom
  (`qa/browser/t-v236-book.mjs`, 109 assertions) plus the gate (27 checks, 0 red).
  The real service-worker notification banner, a real Android battery saver
  killing the 20 s loop, and print output on a real printer were not exercised.
- **A real push.** The `push` handler exists and is tested with a mocked event;
  **no sender exists**, so "alert while the page is closed" is proven only for
  the claim-once mechanism, not for a delivered background push.
- **The live exchange feed.** No credentials, no network: the fixture prices the
  board. All money maths is against fixture deals stamped from that fixture.
- **PHP.** No PHP binary: `api.php` is checked with `qa/phpbal.py` (balanced) and
  mirrored in `qa/preview_shim.py`. The PHP itself has not been executed — the
  office-only 403s and the limit route were proven against the shim mirror, which
  was written to the same contract.
- **Your live database and real jeweller accounts** — no migration has been run
  against real data, because nothing has been deployed.
- **Your CA's invoice wording.** HSN 7108/7106, TCS 206C(1H) 0.1 % on a buy and
  the words in words are implemented as specified; the exact print layout of a
  tax invoice your CA wants should be confirmed before the first one is filed.
- **Play Store**: `playstore/verify.mjs` still exits 2 by design (placeholders,
  unrelated to this release).
