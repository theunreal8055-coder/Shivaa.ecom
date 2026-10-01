# Shivaa — Master Plan (24 Sep 2026): SQL at scale · update ZIPs · auto-catalogue · billing software

> Owner request, verbatim intent: *continue the Hostinger SQL migration (3 lakh
> designs would make the site slower on the old method), explain how website
> updates will keep working, explain the future auto-catalogue deployment
> (raw images in → title/description/metadata set automatically), and explain
> how his own billing software (a public_html zip) gets deployed and linked
> from admin settings.* This document is the agreed roadmap. Nothing here is
> deployed until the owner explicitly says yes, release by release.

---

## Status update — 1 October 2026 (beyond the original four phases)

Phases 1–4 of this plan are **built and gated**: v180 (SQL runtime), v181
(Phase 3 SQL & billing doorway), v182 (auto-catalogue intake + billing sync
bridge). Live is still **181**; v182 and v183 await the owner's explicit yes.
**v183 adds an owner-requested fifth workstream: the supplier (manufacturer)
programme** — manufacturers set up their own IDs, each gets a unique code, and
an order for any supplier's design routes straight to that supplier's portal
while **customers and jeweller partners never learn whose design it is**. That
confidentiality is enforced mechanically in `cms/hallmark.php` (public product
payloads) and `shv_public_order()` (public order payloads). See
`DEPLOY-v183.md` and `docs/SUPPLIER-CONFIDENTIALITY.md`.

---

## 0. Where we actually stand today (read this first — one important correction)

Your three screenshots (24 Sep 2026, 10:16 am) show:

| Screenshot | What it proves |
|---|---|
| hPanel dashboard `shivaa.in` | Business Web Hosting, SSL ✓, CDN ✓, malware ✓ — disk **0.71 GB / 200 GB**, inodes 5.26K / 600K. Plenty of room for *code*; the maths for 3 lakh *photos* is a separate problem (§4). |
| MySQL management | Database **`u486999505_Shivaa`** + user exist (created 21 Sep), tied to shivaa.in. |
| phpMyAdmin | Tables **`products` = 77 rows**, **`orders` = 0**, **`settings` = 0**. |

**Honest reading of those three tables (verified in the code today, not assumed):**

1. The 77 rows in `products` are the **one-way copy** `setup-mysql.php` made
   from `db.json` when you ran it. Structure + indexes exist. ✅ That is the
   step you completed, and it is exactly right.
2. `orders` and `settings` are **empty because the running site does not write
   to SQL yet**. `api.php` still loads and saves everything from
   `data/db.json` (0.42 MB today). The `get_db_pdo()` helper that would talk
   to MySQL exists in the code but has **zero call sites** — the config key
   `db_driver` is never read. **MySQL is currently a passive mirror of the
   product list, not the live brain of the shop.**
3. Therefore the real work of "shifting everything to SQL" is **Phases 1–3
   below** — wiring the application itself onto MySQL, with JSON kept as a
   safety net. That is the next application release (**v180+**, forward-only
   from live 179).

Why this matters: with 3 lakh designs, `db.json` would become a multi-hundred-MB
file that every single page load must read and parse in full, and every write
must lock and rewrite in full — that is the slowness you were warned about.
MySQL stores each design as its own indexed row, so a page asking for "20 rings
under ₹50k" fetches 20 rows instead of the whole catalogue.

---

## 1. How we complete the SQL migration (the 3-lakh plan)

### Phase 1 — Schema made ready for 300,000+ designs (code + one installer URL)
- Extend `setup-mysql.php` (becomes `upgrade-sql.php` in the release) to add:
  - `FULLTEXT` index on `name`/`desc` for instant search at 300k rows.
  - Composite indexes for the real query patterns: `(category, active, weightG)`,
    `(active, sku)`, price/making-charge columns so filtering happens **inside**
    the database, not in PHP over the whole list.
  - Remaining tables the shop actually needs: `settings` (k/v), `orders` (rich
    row + `items_json`), `users`, `reviews`, `coupons`, `settlements`, plus a
    lightweight `catalog_batches` ledger for the auto-catalogue (§3).
  - A `status`/`active` + `batch_id` column on `products` for the review queue.
- Product images stay on disk/CDN; the DB stores paths only (never blobs).

### Phase 2 — The application actually runs on SQL (the real cutover work)
- `api.php` honours `db_driver` from `config.php`:
  - **`mysql` mode:** product list/read/search/category routes read from SQL
    (`LIMIT/OFFSET`, `WHERE` filters, `FULLTEXT` search); product create/update
    and admin upserts **dual-write** (SQL primary, `db.json` mirror updated in
    the same request) during the transition.
  - Every other collection (orders, users, rates…) keeps its current proven
    JSON path until it is migrated collection-by-collection in Phase 3 —
    money code changes one collection at a time, never all at once.
  - **Automatic fallback:** if the PDO connection fails, the affected read
    falls back to `db.json` (read-only) and the health endpoint turns amber.
    The shop never goes down because MySQL hiccupped.
- Admin gets a plain **Data Source strip** (green = SQL live, amber = fallback)
  so you can see the mode at a glance — same style as the v179 rates health strip.
- `/api/version` reports `driver` so we can verify live from one URL.

### Phase 3 — Full cutover + verification (still your one-click install)
- Migrate remaining collections into SQL (settings → orders → users → reviews
  → settlements…), each with a count-and-compare verifier (row counts and
  spot-check hashes on both sides must match before we declare it done).
- The release ZIP carries the upgrade script; your install step stays familiar:
  **backup → extract ZIP → open one URL (`/upgrade-sql.php`) → check the green
  ticks.** JSON file remains on disk as the nightly-export safety copy.
- Belt tests (the existing 164-check suite) extended with a MySQL-mode lane:
  the same PHP tests must pass in both `json` and `mysql` modes before the ZIP
  is published.

### Phase 4 — Scale reality-checks for 3 lakh designs (decisions we must take)
- **Images are the real limit, not the database.** 300k designs × 4 shots ×
  ~150 KB ≈ **180 GB** against your 200 GB disk — too tight once films and
  backups count. Plan: keep the DB on Hostinger, put catalogue images on
  object storage/CDN (Cloudflare R2 or Bunny — cheap, and `config.example.php`
  already has the `cdn` block). Site loads images from the CDN, DB only stores URLs.
- **Films stay for featured designs only** (homepage/campaigns) — a 1–2 MB
  film per design × 300k is not physically sensible on this plan.
- Browse UX already pages 20 at a time; with SQL the *filtering* moves into
  the database so category/search pages stay fast no matter how big the
  catalogue gets.
- Batch import tool: ingest CSV/JSON in chunks of 1,000 rows per run —
  no giant single upload that can time out.

**Order of work:** Phase 1+2 is the next application release (**v180**). Phase 3
follows as v181+ (or folds into v180 if you prefer one bigger release — your
call, §5). Phase 4 decisions (CDN account) can wait until the image count
actually grows.

---

## 2. How website updates keep working (the ZIP ritual — unchanged, with one addition)

Nothing about your update habit changes. Every future change follows the same
dance you already know from v179:

1. I finish the work on the Arena branch + run the full test belt.
2. I publish `shivaa-update-vNNN.zip` + a `DEPLOY-vNNN.md` runbook, with the
   file list, SHA-256 and rollback note — exactly like v177/v178/v179.
3. **You** take a backup (hPanel → Backups), then extract the ZIP into
   `public_html` with File Manager, overwriting the listed files.
4. You (or I, from the published bytes) verify `/api/version` reports the new
   release. Live stays owner-installed; nothing deploys without your yes.
5. Rules that never change: never deploy an older tree over a newer one
   (anti-downgrade), never swap `sw.js` alone, protected paths (`data/`,
   `uploads/`, `config.php`, `.htaccess`, credentials) are never in a ZIP.

**The one addition for SQL releases:** after extracting a release that touches
the database schema, you open **one extra URL once** (e.g.
`https://shivaa.in/upgrade-sql.php`) — it creates/updates tables and prints
green ticks. It is idempotent (safe to re-open), backup-first, and refuses to
run without `config.php` present. That is the same pattern you already used
for `setup-mysql.php`.

**Optional later upgrade (your choice, not required):** the approval-gated
GitHub Actions FTPS workflow already exists (`DEPLOY SHIVAA LIVE` phrase,
manual dispatch from `main`, excludes data/uploads/.htaccess/config). If you
ever want me to run the transfer instead of you extracting, we enable that
path — but the ZIP method remains the default because it is proven and you
control it from your tablet.

---

## 3. Auto-catalogue deployment (you give raw images → the shop gets listings)

Future loop you described, made concrete:

```
You: drop raw images (zip / folder) + weights CSV (optional)
        │
        ▼
Step 1  Agent intake — copies batch into repo under catalogue/batches/<batch-id>/
Step 2  Agent visual pass — cleans each photo to house rules:
        no fake tags/brands/text, purity must read 22K, jewellery unchanged
Step 3  Agent metadata — writes for each design:
        • title, description, category, tags, SEO fields  ← creative, agent-written
        • weight, purity, price inputs                    ← ONLY from your CSV/tags
          (standing law: never invent weights, purity, prices)
Step 4  Import into MySQL: INSERT with active = 0, status = 'pending_review'
        via a new admin-only endpoint /api/admin/catalogue/import
Step 5  YOU review: Admin → Catalogue → Review queue
        each card shows photo + title + description + weight source
        [Approve] [Skip]   — approve flips active = 1 and it appears on the site
Step 6  Batch ledger committed to git (what was imported, approved, skipped)
```

- **You stay the gate:** nothing goes live without your Approve tap (unless you
  later switch on "auto-approve trusted batches" per batch — possible, off by default).
- **Scale:** for big supplier drops this becomes a GitHub Actions batch worker
  you trigger with an approval phrase (same security model as the catalogue
  deploy workflow that already exists) — 10k+ images per run, budget-capped,
  with a human-visible plan summary before anything is written.
- **Search/list speed at 300k** is guaranteed by the Phase-1 indexes; the
  storefront already pages results, and filters move into SQL WHERE clauses.
- What you will need to provide per batch: the images, and a weights/prices
  sheet (CSV or readable tags). Everything else the agent fills in.

---

## 4. Your billing software — how it gets deployed and linked from admin

You have your own billing app as a `public_html` zip. It gets **its own
territory**, so shop updates can never break it and it can never break the shop:

1. **Send me the zip** (GitHub → *Add files via upload* on the repo, or attach
   in chat). I inspect it: PHP version, does it need a database, does it carry
   its own `.htaccess`, what folder structure it expects.
2. **Install plan (you run it, tablet-friendly):**
   - Preferred: extract into **`public_html/billing/`** → it lives at
     `https://shivaa.in/billing/`. Alternative: a subdomain
     `billing.shivaa.in` (hPanel → Domains → Subdomain) if you want a separate
     login/URL — both work; path is fewer steps.
   - If it needs SQL: create a **second MySQL database** in hPanel exactly like
     you created `u486999505_Shivaa` (Databases → Management → Create), then
     fill its `config.php`. Same Hostinger plan, isolated data.
   - I write `BILLING-INSTALL.md`: exact File Manager clicks, in the same
     plain style as DEPLOY-v179.md, with rollback (delete the folder).
3. **It is deliberately OUTSIDE every shop update ZIP.** Shop ZIPs only touch
   the files they list; the GitHub deploy workflow excludes paths not in `cms/`
   sync mapping — your billing folder is never overwritten by a Shivaa release,
   and your billing app's own updates never touch the shop.
4. **Admin-settings link:** the next small release adds one tile in
   Admin → Settings: **"Billing Software ↗"** opening `/billing/` in a new tab.
   That is the entire shop-side change — a doorway, not a merge. (If you later
   want deeper integration — shared staff login, or shop orders appearing in
   the billing app — we design that as its own release after both systems are
   stable; never as a first step.)
5. **Credentials:** the billing app's admin password stays yours; never pasted
   in chat, never stored in the repo.

---

## 5. What I need from you (in order)

1. **Say the priority order.** My recommendation: **SQL runtime (v180) first** —
   it unblocks everything else (3-lakh catalogue, auto-import, cleaner orders).
   Billing link tile can ride along in the same release (it is tiny).
2. **Upload the billing zip** when ready (GitHub upload preferred — it survives
   sandbox resets).
3. **Confirm the auto-catalogue gate:** review-queue (recommended, default) vs
   fully-automatic per trusted batch.
4. Standing rules unchanged: your explicit yes before every live install ·
   forward-only from live 179 → next release 180+ · no invented weights/prices ·
   backup first · never hand-edit the live database.

---
*Session: `arena/01a0d219-shivaa-ecom`, 24 Sep 2026. Evidence: owner's three
screenshots; code inspection — `get_db_pdo()` 0 call sites, `db_driver` unread,
`cms/data/db.json` 0.42 MB / 83 products local, `setup-mysql.php` migrates
products only. This is a plan document — no release, no deploy, no live change.*
