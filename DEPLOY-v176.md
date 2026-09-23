# v176 — failed payments are no longer counted as sales

**23 September 2026 · published and verified on `arena/01a0cd08-shivaa-ecom` · NOT DEPLOYED · NOT OWNER-INSTALLED**

One reported defect, repaired at all three places it leaked, plus one admin
action the owner asked for. This is **not** a new ledger batch — v170–v176 are
owner-requested feature and data releases recorded in
[`docs/AGENT-HANDOFF.md`](docs/AGENT-HANDOFF.md), not security audit findings.
Do **not** recount them as bugs.

## Latest update download

**`shivaa-update-v176.zip`**, built from source commit
`64c46a9d2a97f20bccf377be6494dc0d8f5362d0`.

- **7 files · 426,252 bytes**; cumulative v171–v176 code-file union, and a
  superset of the v169/v170 17-file package's code files.
- Requires an existing full **v165-or-newer CMS**, not an empty hosting folder.
- **SHA-256:** `ca53b8b9df9662435f4880b7d3bead8e2132ac1017f3cecc956c550cd6f72674`
- [Download v176 ZIP on GitHub](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/64c46a9d2a97f20bccf377be6494dc0d8f5362d0/shivaa-update-v176.zip)
- Publication commit: `64c46a9d2a97f20bccf377be6494dc0d8f5362d0`. GitHub contents
  API matched size (426252) and Git blob
  `1b91023bebfa033f83886c2ccd77e1f3ee73c3a1` after push; local
  `git hash-object` agrees. The build is deterministic — two runs produced the
  identical hash.
- Private repository: sign in with a GitHub account that has access.

**Forward-only.** The v169, v170 and earlier ZIPs and links are unchanged and
must stay available. Do not reset, revert to or restore an older release, do not
reuse or renumber a shipped release, and do not force-push
`arena/01a0cd08-shivaa-ecom` or rewrite its history. **The next release is 177
or higher.**
- Builder: `python3 tools/mega/make-v176-zip.py` (asserts every cumulative
  prior repair, the v176 revenue helpers, and the purge route's data scope).

**Back up your website and database first.** Upload/extract into the existing
website folder that contains `index.html` and `api.php` (usually `public_html`,
or `public_html/cms` for that installation). The ZIP has root-relative members,
**no extra `cms/` folder**. Replace the code files together; never extract only
the worker.

No database, uploads, credentials, media or host-managed `.htaccess` is
included. The v168 Apache-comment repair remains a separate host review, never
a wholesale replacement of the live configuration. No main merge, Hostinger
deployment or real payment was performed.

The v169/v170 ZIPs and links are unchanged. This is a newly built v176
archive, not a renamed old download.

### Package contents

```text
api.php
index.html
sw.js
js/app.js
js/admin.js
css/v175.css
css/v174.css
```

Release handshake and shell asset URLs are **176**; staff follows APP_REL. The
media cache deliberately remains **168** because no media changed. The two
stylesheets are carried for cumulative continuity — `v175.css` stays the last
stylesheet in `index.html`, so ordering is preserved.

### What changes operationally

- **A failed or abandoned Cashfree payment is no longer counted as a sale.**
  The gateway never marks an order `Failed`; it records the failure in
  `cfLastFailure` and leaves `paymentStatus` at `Awaiting payment`. The
  dashboard, reports and day book all computed revenue from fulfilment status
  alone and never read `paymentStatus`, so every gateway test was summed at
  full order total. All three now route through one definition of "money
  received": `Paid` counts `total`, `Partially paid` counts `amountPaid`
  clamped to `total`, and `Awaiting payment`, `Confirm on WhatsApp`,
  `Proof submitted`, `Pending (COD)`, `Refunded` and `Cancelled` count zero.
- **COD is excluded from revenue too** — that money is still the customer's
  until delivery. Order **count** still reports every order placed; only the
  revenue figure changed. `paidOrders` / `unpaidOrders` are now returned so the
  split is visible on the dashboard instead of hidden.
- **The Orders tab gains a preview-first cleanup card.**
  `GET /api/admin/purge-unpaid` is a **dry run that writes nothing**: total
  orders, would-delete, would-keep, value removed, a breakdown by
  `paymentStatus` and by `paymentMethod`, and the first 25 rows.
- `POST /api/admin/purge-unpaid` deletes only when the exact confirmation
  phrase is posted. `scope:'unpaid'` (the conservative default) needs
  `DELETE UNPAID`; `scope:'all'` — a complete sales reset — needs the longer
  `DELETE ALL SALES` so a stray click cannot reach it.
- **A full timestamped database backup is written before any row is removed**
  (`data/backups/db-before-purge-<timestamp>.json`, web-denied by the CMS
  `.htaccess`), the last 10 such backups are retained, the action is
  audit-logged as `sales.purge-unpaid`, and a failed backup write aborts the
  purge with 500 and deletes nothing.
- **Only `db['orders']` is ever spliced.** B2B and B2C customers, partners,
  products, settlements, reviews and coupons are provably out of reach — the
  release builder **asserts** those keys do not appear in the purge route's
  block, and the logic was simulated on a 10-row book before shipping. Paid,
  partially-paid, COD and refunded orders survive, because that money is real.

### Verification recorded

- **Not yet run anywhere.** The purge is an owner action on his own server:
  install v176 → Orders tab → *Clear the failed-payment test orders* → Preview
  → type the phrase. Until it is run, the live dashboard's inflated figures
  remain and should be read with that in mind.
- PHP parser clean on `api.php` (**139 statements**).
- `node --check` clean on `js/admin.js` and `js/app.js`, run on the **shipped
  ZIP bytes**, not just the working tree.
- Revenue and purge logic simulated in Python over a 10-order book (two failed
  gateway tests, two paid, one COD, one WhatsApp, one proof-submitted, one
  partial, one refunded, one cancelled): old revenue ₹4,49,000 vs v176
  ₹1,97,000 — **56% of the reported revenue was money that never arrived**;
  `paidOrders=3`, `unpaidOrders=7`; the purge removed exactly 5 orders worth
  ₹1,68,000 and left every paid, partial, COD and refunded row intact, with all
  3 customer rows and the partner record byte-identical.
- Builder asserts all cumulative prior repairs (v171–v175) plus the new v176
  invariants, including that no raw `$o['total']` revenue line survives.
- Zero `?v=175` leftovers; ZIP integrity (`testzip`), member list and
  byte-for-byte member match pass.

**Not verified — do not describe these as passing:** no PHP binary exists in
this sandbox, so **`api.php` was never executed** — a parser pass is not a run.
No browser or jsdom test of the new admin card. The smoke suite was not re-run
and no v176 suite was added. The live site is unreachable from the sandbox, so
nothing here is live-verified.

## Owner-approved live acceptance, still pending

1. Confirm `/api/version` reports **176** with matched index/app/worker stamps
   and that the browser shell and staff bundle agree.
2. On the dashboard, confirm the revenue, average order value and daily chart
   now show money actually received, and that the **Unpaid attempts** tile
   appears with the correct count.
3. In Orders → *Clear the failed-payment test orders*, run **Preview** first
   and read the value-removed figure before typing `DELETE UNPAID`. Check the
   saved `data/backups/` file exists and opens as valid JSON before trusting
   the result.
4. Confirm every paid, partially-paid, COD and refunded order survived, and
   that B2B and B2C customer counts, partner records, products, reviews and
   coupons are unchanged.
5. Re-check the direct Cashfree opening flow on a real phone, then with
   approved test credentials verify pending, paid, declined and interrupted
   returns. A scheme timeout must not invent success or open a quiz.
6. If a full sales reset is genuinely wanted, use scope `all` with
   `DELETE ALL SALES` — after a separate backup, and with the owner's explicit
   go-ahead.
