# v177 — the v176 rework, fixed: the purge that never ran, the honest preview, the day book that shows COD cash

**24 September 2026 · published on `arena/01a0d168-shivaa-ecom` · NOT DEPLOYED · NOT OWNER-INSTALLED**

The owner's request, verbatim: *"make v176 again but better, without bugs
and errors."* v176 shipped the right definition of "money received" and a
backup-first purge — and it shipped real defects that a parser pass and a
Python simulation cannot see. This is a **forward release 177** (v176 stays
shipped and untouched, per the forward-only rule): the same seven files,
the same owner flow, with each v176 defect repaired at the source and
executed PHP 8.3 tests added that catch each one.

## Latest update download

**`shivaa-update-v177.zip`**, built from source commit
`29e2c0d86867acc73bb0c86da86bf5558c1329ee`.

- **7 files · 427,896 bytes**; cumulative v171–v177 code-file union, a
  superset of the v176 package's code files.
- Requires an existing full **v165-or-newer CMS**, not an empty hosting folder.
- **SHA-256:** `2c9fff1a8b39e186093e44ecac0980189e7ca783337be677e35d5bea6b35dec2`
- [Download v177 ZIP on GitHub](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/557fb51c194f4acfbe08bd0f7e69e4660c4da0cf/shivaa-update-v177.zip)
- Source commit: `29e2c0d86867acc73bb0c86da86bf5558c1329ee` (the code the
  ZIP contains). Publication commit: `557fb51c194f4acfbe08bd0f7e69e4660c4da0cf`
  (the ZIP on this session branch). The build is deterministic — two runs
  produced the identical hash, and every member byte-matches its committed
  `cms/` source (verified against `git show 29e2c0d:cms/…`).
- Builder: `python3 tools/mega/make-v177-zip.py` (asserts every cumulative
  prior repair, the v176 revenue core, the purge route's data scope, and
  each of the five v177 invariants below).

**Forward-only.** The v176 ZIP and link are unchanged and must stay
available. Do not reset, revert to or restore an older release, do not
reuse or renumber a shipped release, and do not force-push or rewrite
history. **The next release is 178 or higher.**

**Back up your website and database first.** Upload/extract into the
existing website folder that contains `index.html` and `api.php` (usually
`public_html`, or `public_html/cms` for that installation). The ZIP has
root-relative members, **no extra `cms/` folder**. Replace the code files
together; never extract only the worker.

No database, uploads, credentials, media or host-managed `.htaccess` is
included. The v168 Apache-comment repair remains a separate host review.
No main merge, Hostinger deployment or real payment was performed.

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

Release handshake and shell asset URLs are **177**; staff follows APP_REL.
The media cache deliberately remains **168** because no media changed. The
two stylesheets are carried for cumulative continuity — `v175.css` stays
the last stylesheet in `index.html`, so ordering is preserved.

### The five v176 defects, repaired

1. **The confirmed purge could never run (the killer).** The backup line
   called `json_encode()` with `JSON_UNESIGNED_SLASHES` /
   `JSON_UNESIGNED_UNICODE` — constants that do not exist in PHP. After the
   owner typed the confirmation phrase, the request threw
   *"Undefined constant"* and 500'd: **no backup was written, no rows were
   deleted, and the dashboard showed a generic error.** The delete had
   silently never been able to run. Repaired with the real
   `JSON_UNESCAPED_*` pair (the same flags `db_save` uses), and
   `v177-check.js` asserts the typo can never return.
2. **The preview lied about its own scope.** The UI previews with
   `GET /api/admin/purge-unpaid?scope=…`, but v176 read the scope only from
   the POST body — so **every preview answered `unpaid`**: with "every
   order" selected the owner saw a partial preview, the short phrase and
   no all-sales warning. GET now reads the query string and POST the body,
   both validated to the two known scopes (`banana` collapses to the safe
   `unpaid`).
3. **Same-second backups could overwrite each other.** Two purges inside
   one second collided on `db-before-purge-<Ymd-His>.json` and the second
   silently replaced the first — deleting through a backup that no longer
   exists. The name is now made unique (numeric suffix) **before** writing.
4. **The day book's COD tile read ₹0 forever.** v176 filtered the cash
   book on the order's *creation* day while `order_money_received()`
   excludes COD until delivery — so the COD bucket was structurally always
   zero, even on the day the cash was collected. The day book now counts
   money on the day it **arrives**, from the order's own payment ledger
   (v60: every accepted payment is a row with `at` + `status`): online and
   UPI rows on their receipt day, a UPI proof on the day the owner
   **approves** it (`approvedAt`), COD on the day its row is written (cash
   in hand), and pre-ledger legacy rows on `paidAt` then `createdAt`.
   Cancelled orders are excluded; no order is counted twice. The tile is
   renamed **"COD collected"** to say what it now means.
5. **Crash-proofing and an honest note.** `admin/stats`' daily chart hit
   PHP 8 "undefined array key" + `substr(null)` on a legacy row without
   `createdAt` and could 500 the whole dashboard; the purge preview's
   sample name raised a `TypeError` on a legacy scalar `address`; the audit
   line re-read the bearer token mid-route (now uses the admin
   `need_admin` already validated). And the scope-`all` success note no
   longer claims *"every paid order was untouched"* — it says the book was
   reset.

**What did not change:** the one-definition-of-money-received core
(`order_money_received` / `order_is_paid_sale` / `order_is_unpaid_attempt`
and the three revenue endpoints — dashboard, reports, cash book still
report only money actually received), the confirmation phrases, the
backup-first ordering, the retention of the last 10 backups, and the
customers-untouchable scope: **only `db['orders']` is ever spliced** —
B2B and B2C customers, partners, products, settlements, reviews and
coupons are provably out of reach (the builder asserts it).

### Verification recorded — executed, on the shipped bytes

- **`v177-php-run.js` 17/17 — real PHP 8.3 under the isolated fixture**,
  re-run against the **extracted ZIP bytes** (not just the working tree):
  revenue trio (stats/reports/cash book) on the 10-order book; preview
  scope honesty (`?scope=all` previews all 10 rows, `DELETE ALL SALES`,
  by-status breakdown); refused phrases delete nothing and write no
  backup; the safe delete removes exactly the 5 unpaid attempts with a
  full pre-purge backup, byte-identical customers/partners/products and an
  audit line naming the admin; scope `all` refuses the short phrase;
  three same-second purges produce **three distinct valid backups**;
  retention trims to 10; legacy rows (missing `createdAt`, scalar
  `address`) cannot 500; COD cash counted only on collection day; proof
  counted on approval day; legacy rows counted once; cancelled excluded;
  `/api/version` reports **177** with a matched index/app/worker handshake.
- **`v177-check.js` 11/11** static invariants, including the
  JSON-constant regression guard and zero `?v=176` leftovers.
- **Full belt: 40 suites pass, 16 retired-feature suites skip, 0 fail**
  (the two v177 suites are auto-discovered by the regression runner;
  the pre-v177 baseline was 38/16/0, run before any edit this session).
- **Prior gates on the shipped ZIP bytes:** v169 PHP 28/28, v169 pages
  25/25, v168 upload signatures 12/12.
- **Static sweep:** 212 routes, 0 exceptions; `node --check` clean on the
  shipped `js/admin.js` and `js/app.js`.
- ZIP integrity (`testzip`), member list (exactly the 7 files,
  root-relative), byte-for-byte member match against commit `29e2c0d`,
  deterministic hash across two builds.

**Not verified — state this plainly:** no owner install; the live site is
unreachable from the sandbox; the test-order purge itself has **not** been
run anywhere — that is an owner action on his own server (and, unlike
v176, it can now actually complete). No main merge, no Hostinger
deployment, no real payment.

## Owner-approved live acceptance, still pending

1. Confirm `/api/version` reports **177** with matched index/app/worker
   stamps and that the browser shell and staff bundle agree.
2. Install v177 over the v165+ site, open **Orders → Clear the failed-payment
   test orders**, select *Only orders with no money received*, run
   **Preview**, and confirm the preview's *Value removed* matches the
   gateway tests you ran.
3. Select *Every order — reset sales completely* and run **Preview** again:
   it must now show **every** order (paid ones included), the
   `DELETE ALL SALES` phrase and the all-sales warning. In v176 it showed
   the safe slice instead — that is the fix to confirm.
4. Type the phrase for the scope you chose. This time the delete
   **completes**: read the toast, check the saved `data/backups/` file
   exists, is valid JSON and holds the pre-purge book.
5. On the dashboard, confirm revenue/AOV/chart show money received and the
   **Unpaid attempts** tile reflects the survivors; in the **Cash book**,
   confirm a COD order you marked Paid on a given day appears in that
   day's *COD collected* (it could not before).
6. If a second cleanup is ever needed within the same second, confirm two
   distinct backup files exist.
7. Re-check the direct Cashfree opening flow on a real phone, then with
   approved test credentials verify pending, paid, declined and
   interrupted returns. A scheme timeout must not invent success or open a
   quiz.
8. If a full sales reset is genuinely wanted, use scope `all` with
   `DELETE ALL SALES` — after a separate backup, and with the owner's
   explicit go-ahead.
