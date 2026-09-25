# DEPLOY v182 — Auto-Catalogue Intake & Review Queue (Phase 4) + Billing Sync Bridge

**Release:** 182 · **Built:** 25 Sep 2026 · **Live before this runs:** 181 (owner-deployed, verified)
**Status:** built + gated; **deploy only after the owner's explicit yes**
**Source commit:** `7296951` · **Prerequisite:** live **v181 or newer**

**What this release is, in one line:** the auto-catalogue Phase 4 — batch
photo upload + JSON metadata import that lands every design *staged and
hidden*, an Admin → Catalogue Intake review queue with **Approve / Skip** and
**batch publish**, the batch ledger in MySQL (`catalog_batches`), the
settlements composite-id fix folded into the shipped tree (live parity), and
the HMAC-signed **billing sync bridge** (`/api/billing/stock` +
`/api/billing/stock-movement`) the showroom billing app uses to keep counter
sales in step with shop stock.

---

## Package

**File:** `shivaa-update-v182.zip`
**Size:** 455,758 bytes · **SHA-256:**
`ecf612cf24116cda93002fceeec9be0ddcd94eda8f9c211d6b5f8e4ed474d9d3`
**Layout:** root of the ZIP = overwrite into `public_html/` (same as v165+).
**6 files**:

| File | Bytes | What changed |
|---|---:|---|
| `api.php` | 505,412 | Catalogue intake/review/publish routes · `catalogBatches` dual-mode overlay & mirror · `products.status`/`batch_id` values · settlements composite-id resolver (`partnerId_weekEnding`) · billing sync bridge · PDP hides unapproved pieces · rel 182 |
| `js/admin.js` | 323,235 | **Catalogue Intake** tab (batch ledger, photo upload, JSON import, review cards with weight-source, Approve / Skip / Batch publish) · Billing sync-key field on the Billing Software card |
| `index.html` | 31,412 | stamps → 182 (56× `?v=182`, `__SHIVAA_REL=182`) |
| `js/app.js` | 652,435 | `APP_REL = 182` |
| `sw.js` | 13,069 | SHELL/REL 182, 51× `?v=182`, MEDIA deliberately stays `shivaa-media-v168` |
| `upgrade-sql.php` | 32,849 | Reconciler: adds `products.status` + `products.batch_id` (+ indexes, one-time backfill), `catalog_batches.data_json`, composite settlement IDs, batch-ledger sync + verify |

Not packaged (never are): `.htaccess`, `data/`, `uploads/`, `config.php`,
`setup-mysql.php`, billing files.

---

## Before you start

1. **Full `public_html` backup** from hPanel (Files → Backups).
2. Confirm live is 181+: open `https://shivaa.in/api/version` — you should
   see `"rel": 181`.
3. Have your **CMS admin password** ready for `upgrade-sql.php`.

---

## Install (extract — 2 minutes)

1. Download `shivaa-update-v182.zip`.
2. hPanel → File Manager → `public_html/` → **Upload** the ZIP →
   **Extract** it there, allowing overwrite.
3. Until step B runs, the site keeps serving from the JSON safety net if you
   browse in between (the new product columns arrive in the next step) —
   nothing goes down.

## B. Reconcile the new schema (one URL, ~1 minute)

1. Open **`https://shivaa.in/upgrade-sql.php`**
2. Enter your CMS admin password, press **Run**.
3. It walks through and reports each step:
   - **Backup first** — timestamped copy of `db.json` in `data/backups/`;
   - **Schema** — adds `products.status` + `products.batch_id` (+ indexes),
     `catalog_batches.data_json`, backfills staged state from the full-row
     mirror;
   - **Upload** — syncs products, settings, orders, users, reviews, coupons,
     settlements (composite IDs — all 10 partner-week rows verify), and the
     catalogue batch ledger;
   - **Verify** — count checks across all collections + byte-identical spot
     checks;
   - **Done** — clears the mirror flag so every collection engages MySQL.

---

## Using the new Catalogue Intake (Admin → Catalogue Intake)

1. **Create a batch** — e.g. "Hitesh bhai rings — 67 pcs".
2. **Step 1 — upload the photos** (jpg/png/webp, ≤8 MB each) into the batch.
3. **Step 2 — import the metadata (JSON)** — titles/descriptions/tags are
   written by the intake pass; **`weightG`, `purity` and `weightSource` are
   REQUIRED on every row** (the importer rejects rows that invent them —
   standing law). Nothing is live after import: everything lands staged.
4. **Step 3 — review** — each card shows photo, title, description and the
   **weight source**; tap **Approve → live** (appears on the site instantly)
   or **Skip** (kept staged, never ships). **Batch publish** approves every
   pending piece in the batch in one tap.

## Billing sync (optional — dark until you switch it on)

- Admin → Settings → Billing Software card → paste a long random
  **Stock-sync key** (16+ chars). Until then the bridge answers 403 and
  nothing happens.
- The billing app then posts signed stock movements and reads stock
  snapshots — exact contract in `docs/BILLING-SYNC-CONTRACT.md` (hand it to
  whoever configures the billing app).

---

## Verify (2 minutes)

1. `https://shivaa.in/api/version` — expect:
   - `"rel": 182`
   - `"stamp": { "matched": true, "index": 182, "app": 182, "sw": 182 }`
   - `"db": { "driver": "mysql", "mode": "mysql", "reason": "", ... }`
2. Admin → **Catalogue Intake** opens with the empty-queue helper text.
3. A staged (unapproved) design is invisible on the storefront until you tap
   Approve.

---

## Rollback (any time, 30 seconds)

- In `config.php` set `db_driver => 'json'` and save. Reads and writes
  revert to the JSON file instantly.
- Code rollback: restore your `public_html` backup taken before extracting.
- Never deploy an older tree over this one (forward-only from 182).
