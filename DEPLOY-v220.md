# DEPLOY-v220.md — release 220 · "THE BILLING REMOVAL RELEASE" · billing software taken off the website

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 220 is live, stop.

**Read `DEPLOY-v205.md` first.** Drop-in replace root with `cms/` (same shape),
then `purge` before `activate`. This package carries v206 → v220 and includes
the film files (`images/films/`) and the offer artwork (`images/offers/`).

---

## 1 · What the owner asked

> "Billing software ko pura hi hatado meri website se."

Scope taken: everything the **website** had that linked to or talked to the
showroom billing software. Nothing else.

## 2 · What was removed

| Where | Removed |
|---|---|
| Admin → Settings | the **"Billing Software"** card (its "Open Billing Software ↗" link to `/billing/`) |
| Admin → Settings | the **stock-sync key** form and its save handler |
| `cms/api.php` | the signed stock bridge: `GET billing/stock` and `POST billing/stock-movement` |
| `cms/api.php` | the HMAC signing helpers (`shv_billing_sync_raw`, `shv_billing_sync_auth`) |
| `cms/api.php` | the billing-sync rate limit, the movement store, and the write-only `billingSyncSecret` setting |
| `docs/BILLING-SYNC-CONTRACT.md` | deleted |

## 3 · What was **not** removed (on purpose)

- Customer-facing "billing address" fields at checkout — these are shoppers' addresses, not the software.
- The jeweller-desk "Design Selection & Billing" wording — a service description, not the software.
- `docs/PLAN-SQL-BILLING-CATALOGUE-2026-09-24.md` — the dated plan kept as history.
- Existing data already saved in `data/db.json` (old `billingMovements`, the saved sync key). Nothing reads them any more. No data was deleted.

## 4 · Owner steps this release does NOT do for you

1. **Delete the billing app folder on the server.** It was installed at
   `public_html/billing/` (`https://shivaa.in/billing/`). It is **outside this repo**,
   so no shop release can remove it. Delete it in Hostinger → File Manager, or in
   hPanel → Files. Take a backup first if you want one.
2. **Turn off or uninstall the billing app's stock sync.** Its signed calls to
   `billing/stock` and `billing/stock-movement` now get "not found" from the shop.
   Nothing on the shop side will break; the billing app will just stop syncing.
3. Optional: the old sync key still sits in `data/db.json` under
   `billingSyncSecret`. It does nothing now. Clear it through hPanel File Manager
   if you want no trace of it.

## 5 · QA run before packaging (headless jsdom + static, no real browser)

| Check | Result |
|---|---|
| `node qa/browser/t-v220-billing-gone.mjs` (routes, helpers, card, form, docs gone; Store settings kept; stamps 220) | **13 / 0** |
| `node qa/browser/t-v209-alive.mjs` (alive suite) | **96 / 0** |
| `node qa/browser/t-v206-flip.mjs` (flip guard) | **ALL PASS** |
| `node qa/browser/t7-audit.mjs` | **4 / 0** |
| `node qa/browser/t-v218-sidebar.mjs` | **13 / 0** |
| `node qa/browser/t-v219-depth.mjs` | **22 / 0** |
| `node --check` on admin.js, app.js, sw.js, the test files | clean |

**Not run:** `php -l` on `api.php` (PHP is not installed in this sandbox). The
PHP edits were checked by brace/parenthesis count on the removed lines (balanced)
and by reading each boundary. Please run one `api.php` request (e.g. `GET /api/settings`)
on the server after upload to confirm it answers.

**Not verified in a browser:** the Admin → Settings screen itself. Its code was
checked for syntax and for the removed parts, not rendered.

**QA fixture (not shipped):** `cms/data/db.json` is gitignored and is rebuilt
locally for testing; it is not in the zip.

## 6 · Package

- `shivaa-update-v220.zip` — **349 files · 37,057,280 bytes · sha256
  `1b461b82e7faa98ba810332a4fec65bd15430b1e950928cfd7ed43aab2c1899a`**
- Same file list as v219 (`images/films/` 18 files, `images/offers/` 4 files).
- Link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v220.zip`
- Rollback rung: `shivaa-update-v219.zip` (not live) — the last live release is still **v205**.

## 7 · Deploy steps (after owner's explicit yes only)

1. Download `shivaa-update-v220.zip`; check the sha256 above.
2. Replace the site root with the zip's contents (same shape as `cms/`).
3. Purge the CDN cache **before** activating.
4. Check: `GET /api/settings` answers; Admin → Settings no longer shows the Billing Software card.
5. Then do the owner steps in section 4 (delete `public_html/billing/`).
