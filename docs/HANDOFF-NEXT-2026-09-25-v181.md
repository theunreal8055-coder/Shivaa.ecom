# HANDOFF NEXT — v181 LIVE ON HOSTINGER (25 Sep 2026)

## 1. What Happened This Session

1. **SQL Phase 3 Built and Deployed (Release 181):**
   - Transformed the store from storing active collections solely in `data/db.json` to running directly on **Hostinger MySQL** with a zero-downtime dual-write JSON safety net.
   - Built `shv_sql_phase3_overlay` and `shv_sql_phase3_mirror` in `cms/api.php` covering:
     - `orders` (with full `data_json` row mirroring)
     - `settings` (with `_all_settings` cache)
     - `users`
     - `reviews`
     - `coupons`
     - `settlements`
   - Added Admin → **Settings** doorway link: **"Billing Software ↗"** pointing to `/billing/` in a new tab.
   - Stamped release **181** across all 4 locations in lockstep:
     - `cms/index.html` (56× `?v=181`, `__SHIVAA_REL=181`)
     - `cms/sw.js` (51× `?v=181`, `shivaa-shell-v181`, `REL=181`)
     - `cms/js/app.js` (`APP_REL = 181`)
     - `cms/api.php` (`'rel' => 181`)
     - Asset order preserved: `v178.css` remains the last stylesheet; `shivaa-media-v168` untouched.

2. **Settlements Reconcile Edge Case Resolved:**
   - On the first run of `upgrade-sql.php`, the count verification failed on settlements (`json=10 sql=0`).
   - Root cause: Settlements rows in `db.json` lacked an `id` field (they use `partnerId` and `weekEnding`), causing the upsert loop to skip them.
   - Solution: Added `shv_settlement_id(array $s, int $idx)` to both `cms/upgrade-sql.php` and `cms/api.php` generating composite keys (`partnerId_weekEnding`).
   - Re-run succeeded cleanly with 10 settlements inserted and verified.

3. **Production Verification on Hostinger (Probed & Active):**
   - Live URL: `https://shivaa.in/api/version`
   - Response:
     ```json
     {
       "ok": true,
       "rel": 181,
       "shell": "shivaa-shell-v181",
       "builtAt": "2026-09-25T09:25:44+05:30",
       "forceLatest": true,
       "stamp": {
         "index": 181,
         "app": 181,
         "sw": 181,
         "matched": true
       },
       "db": {
         "driver": "mysql",
         "mode": "mysql",
         "reason": "",
         "sqlCount": 78,
         "jsonCount": 78,
         "mirrorBehind": false
       }
     }
     ```
   - Reconciled tables in Hostinger MySQL:
     - **Products:** 78
     - **Orders:** 5
     - **Users:** 17
     - **Settings:** 58 keys
     - **Reviews:** 767
     - **Coupons:** 12
     - **Settlements:** 10
   - Live Rates feed: MCX futures streaming (`live-mcx`, Gold22 premium ₹398, RTGS ticker tracking).

---

## 2. The Forward-Only Rule

- **The live site is Release 181.**
- **Never deploy code stamped < 181 to production.**
- Any new features, fixes, or changes must be stamped **182 or higher** across all four stamp sites.
- Automated tests enforce the forward-only rule (`anti-downgrade` checks in `tools/mega/smoke/deploy-approval-check.js`).
- Never overwrite production `data/`, `uploads/`, `config.php`, or `.htaccess`.

---

## 3. Current Repository & Testing Belt State

- All 152 automated tests in `tools/mega/smoke` passing:
  - `deploy-approval-check.js`: 20/20 PASS
  - `v181-check.js`: 7/7 PASS (including composite settlement ID check S07)
  - `v181-php-run.js`: 6/6 PASS
  - `v180-php-run.js`: 8/8 PASS
  - `v179-php-run.js`: 25/25 PASS
  - `v179-relay.js`: 7/7 PASS
  - `v169-check.js` & `v169-php-run.js`: 53/53 PASS
  - `v168-check.js` & `v168-php-run.js`: 51/51 PASS

---

## 4. Next Priorities (for the next chat)

Refer to `docs/PLAN-SQL-BILLING-CATALOGUE-2026-09-24.md`:

1. **Auto-Catalogue Intake & Staging Pipeline (Phase 4):**
   - Ingest new jewellery designs into the `catalog_batches` staging table.
   - Admin review & approve queue before designs become live products.
   - Batch publish with image handling.

2. **Billing Software Integration:**
   - Link showroom billing and stock movements directly with the newly established MySQL database tables.

---
*Record of the v181 live-deploy session (25 Sep 2026). Continued by the
v182 session — see `DEPLOY-v182.md` and `docs/AGENT-HANDOFF.md`.*
