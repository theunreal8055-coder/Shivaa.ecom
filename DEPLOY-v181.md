# DEPLOY v181 — SQL Phase 3 (Orders, Settings, Users, Reviews) + Billing Doorway

**Release:** 181 · **Built:** 24 Sep 2026 · **Live before this runs:** 180 (owner-deployed)
**Status:** built + gated; **deploy only after the owner's explicit yes**
**Source commit:** `40df6ca` · **Prerequisite:** live **v180 or newer**

**What this release is, in one line:** completes Phase 3 of the SQL migration
by moving `orders`, `settings`, `users`, `reviews`, `coupons`, and `settlements`
into Hostinger MySQL with dual-write mirror-on-save and the JSON safety net,
plus adds the "Billing Software ↗" doorway tile in Admin → Settings.

---

## Package

**File:** `shivaa-update-v181.zip`
**Size:** 445,347 bytes · **SHA-256:**
`17f8d30bc4884c630d771470aea05893e44b36ed7442f221d91288121b3f2361`
**Layout:** root of the ZIP = overwrite into `public_html/` (same as v165+).
**6 files**:

| File | Bytes | What changed |
|---|---:|---|
| `api.php` | 479,656 | Phase 3 dual-mode SQL overlay & mirror for orders, settings, users, reviews, coupons, settlements |
| `index.html` | 31,412 | stamps → 181 (56× `?v=181`, `__SHIVAA_REL=181`) |
| `sw.js` | 13,069 | SHELL/REL 181, 51× `?v=181`, MEDIA deliberately stays `shivaa-media-v168` |
| `js/app.js` | 652,435 | `APP_REL = 181` |
| `js/admin.js` | 311,091 | Billing Software doorway tile in Admin Settings + Phase 3 SQL dial |
| `upgrade-sql.php` | 28,172 | Phase 3 reconciler (adds `orders.data_json`, syncs all collections, verify) |

Not packaged (never are): `.htaccess`, `data/`, `uploads/`, `config.php`,
`setup-mysql.php`, billing files.

---

## Before you start

1. **Full `public_html` backup** from hPanel (Files → Backups).
2. Confirm live is 180+: open `https://shivaa.in/api/version` — you should
   see `"rel": 180`.
3. Have your **CMS admin password** ready for `upgrade-sql.php`.

---

## Install (extract — 2 minutes)

1. Download `shivaa-update-v181.zip`.
2. hPanel → File Manager → `public_html/` → **Upload** the ZIP →
   **Extract** it there, allowing overwrite.
3. The site continues running smoothly on the existing MySQL catalogue and JSON safety net.

---

## B. Reconcile Phase 3 Collections (one URL, ~1 minute)

1. Open **`https://shivaa.in/upgrade-sql.php`**
2. Enter your CMS admin password, press **Run**.
3. It walks through in order and reports each step:
   - **Backup first** — timestamped copy of `db.json` written to `data/backups/`;
   - **Schema** — verifies all tables and ensures `orders.data_json` is present;
   - **Upload** — syncs products, settings, orders, users, reviews, coupons, settlements;
   - **Verify** — count checks across all collections + byte-identical spot checks;
   - **Done** — clears the mirror flag so all collections engage with MySQL.

---

## Verify (2 minutes)

1. `https://shivaa.in/api/version` — expect:
   - `"rel": 181`
   - `"stamp": { "matched": true, "index": 181, "app": 181, "sw": 181 }`
   - `"db": { "driver": "mysql", "mode": "mysql", "reason": "", ... }`
2. Admin → **Settings** → the new **Billing Software ↗** tile is present
   and links to `/billing/` in a new tab.
3. Admin → **Live Rates** → Data Source strip shows **Hostinger MySQL is active — catalogue & collections on SQL (phase 3)**.

---

## Rollback (any time, 30 seconds)

- In `config.php` set `db_driver => 'json'` and save. Reads and writes
  revert to the JSON file instantly.
- Code rollback: restore your `public_html` backup taken before extracting.
