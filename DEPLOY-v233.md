# DEPLOY-v233.md — Shivaa Ecom · v233 "The Passbook Release"

**Deploy this one.** It is the release you asked for: the Swarna Nidhi teacher works
for every customer and every rupee can be traced, and the jeweller's bullion desk
prices metal instead of only watching it.

**What you said:**
*"Make the Swarna Nidhi teacher fully functional and traceable for every customer and
make the bullion feature for jewellers more practical and updated in technically more
advanced."*

**Status: packaged 23 Oct 2026 — NOT deployed.** Nothing goes live without your
explicit yes. The last build you applied is **v232** (21 Oct 2026). Gate:
**24 checks, 0 red**. The package is exactly `shivaa-update-v233.zip` —
**362 files · 37,381,263 bytes** — sha256
`e5a9b9ffa410b5ea8a1735380fd10bfb60a85473648499144ddd8cb0b117984c`.
`python3 qa/check-handoff.py` proves tree ⟷ zip ⟷ docs agree.

**Next release: v234.** Rollback is v232 — the previous row in
`docs/release-ledger.json`, i.e. re-apply `shivaa-update-v232.zip`.

---

## 1 · Swarna Nidhi — every customer, every rupee, one chain of numbers

Before v233 a plan was a row with an amount. It had **no number**, an instalment had
**no receipt number**, and the only place the truth lived was the counter. That is why
the page felt like a dead end: a customer could look, but could not prove.

| | v232 | v233 |
|---|---|---|
| plan number | none | `SN<yy>-<seq>` — `SN26-0001` |
| instalment receipt | none | `<planNo>-<nn>` — `SN26-0001-01` |
| what builds the numbers | three separate code paths | **one** builder, `savings_view()`, feeding the passbook, the public lookup and the owner's ledger |
| grams on a passbook | a projection at today's rate | grams **at the rate that instalment actually paid** |
| public lookup | none | plan number + last 4 of the registered mobile |
| what the lookup leaks | — | nothing: masked name only, no phone, no email, no staff note |
| lookup abuse | — | 30 an hour per IP, then a 15-minute block |
| customer request | WhatsApp to the shop | in-app redeem/close request, stamped `done` with a time when the desk acts |
| owner's Nidhi tab | one button per plan | ledger: receipts, open a plan for a counter payment, printable receipt, redeem, close, CSV |

**How a customer uses it.** Enrol on `#/savings`; the welcome sheet shows the plan
number with copy, WhatsApp and print. Every instalment the desk records appears in the
passbook within a refresh, with its own receipt number and its own rate. Print the
passbook, or print one receipt.

**How a guest uses it.** `#/savings` → *Trace a plan* → plan number + last four digits
of the mobile the plan is registered to. The answer is the masked holder
(`A•••• Sharma`), the months paid, the grams, the receipts and the status. No login, no
OTP, and nothing that identifies anybody else.

**How the desk uses it.** Admin → **Swarna Nidhi**: the book, the receipts, `⇢ Open
plan` (a customer who paid at the counter, admin only, refuses an unknown mobile and a
customer who already has a live plan), instalments, printable receipt, redeem, close,
CSV.

**Bonus month.** Unchanged rule, now visible: one month's amount, unlocked at 11
instalments — the passbook and the ledger read the same field.

---

## 2 · The jeweller's desk — a rate you can buy, not just watch

| | v232 | v233 |
|---|---|---|
| the board | rate per row | rate **and ₹ per fine gram** per row (the only way 995 compares with 999), best row per metal, spread, day change |
| purity | a label | a factor: 999 / 995 / 916 / 750 |
| a firm price | none — the rate moved under the order | `POST /api/bullion/quote` → `BQ<yymd>-<nnnn>`, **90 seconds** of life, TCS **0.1 %** on a buy (none on a sell), fine grams computed |
| ordering | at whatever the board says | `POST /api/bullion/order` takes `quoteNo`; an expired quote, a quote whose metal moved **more than 0.2 %**, a quote for the other side, or somebody else's is **refused with a sentence** — never silently re-priced |
| exposure | none | open deals, net grams, open value, **mark-to-market** against the live board |
| the screen | board + order form | board + fine strip + calculator (grams or kg, purity, side) that prices live and returns the quote number, plus the partner's own quote history |

An order placed without a quote still works exactly as it did — the old flow is
untouched, so no jeweller is forced onto the new one.

---

## 3 · What is in the package

362 files — v232's 361 plus `css/v233.css`. **No new request on any page**: the
stylesheet is inside the one `css/shivaa.css` bundle (now **67 layers / 67 blocks**,
924,855 B raw / 181,961 B gzipped), and the client code lives in the existing
`app.js` and `admin.js`.

Changed: `api.php` (12 new helpers, 4 new endpoints, `bullion` extended),
`js/app.js` (passbook, trace, requests, welcome sheet), `js/admin.js` (Nidhi ledger,
desk), `css/v233.css` + the bundle, `index.html` / `sw.js` stamps, and the two shipped
countdown docs.

Not in the package, ever: `data/db.json`, the root `.htaccess`, `config.php`,
uploads.

---

## 4 · Install

1. Take a backup of `data/db.json` (the plans and quotes live in it).
2. Upload `shivaa-update-v233.zip` over the site root, overwriting.
3. Hard-refresh once (`Ctrl/Cmd+Shift+R`) or let the service worker move the tab to
   the new shell — the `shivaa-shell-v233` cache replaces the old one.
4. Verify: `https://shivaa.in/api/version` must read `rel: 233`.

**Rollback:** re-upload `shivaa-update-v232.zip`. Nothing in v233 changes a database
shape — plans gain `planNo`/`receiptNo` fields lazily and quotes live in their own
array — so a rollback loses no records.

---

## 5 · What could not be checked here

- **A real browser and a real phone.** Every UI claim was measured in jsdom
  (`qa/browser/t-v233-nidhi.mjs`, 146 assertions) plus the full gate (**24 checks, 0
  red**), not on a handset.
- **PHP.** There is no PHP binary in this sandbox; `api.php` is validated with
  `qa/phpbal.py` (balanced) and mirrored in `qa/preview_shim.py`, which the suite
  drives over real HTTP. The mirror and the PHP were written to the same contract, but
  the PHP itself has not been executed.
- **Your live database.** The suite runs on a fixture with two customers and one
  owner; it cannot prove how the Nidhi ledger behaves on your real book.
- **The Play Store.** `playstore/verify.mjs` still exits 2 by design: the
  fingerprints are placeholders and that is unrelated to this release.
