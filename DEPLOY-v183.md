# DEPLOY v183 — FY 2026–27 Growth Mission Deck (Admin → FY Mission)

**Release:** 183 · **Built:** 3 Oct 2026 · **Live before this runs:** 181 (owner-deployed, verified 25 Sep 2026)
**Status:** built + gated; **deploy only after the owner's explicit yes**
**Source commit:** `557662e` · **Prerequisite:** live **v181 or newer**

**What this release is, in one line:** an admin-only, interactive **FY 2026–27
Growth Mission** dashboard — **700 B2B jeweller partners** and **1,100 retail
customers**, both to be in the book **before 30 March 2027**, with a **live
countdown** ticking against the server clock, gold-foil dark-luxury UI,
per-lane progress rings, required-vs-actual run-rate, a projection date and a
growth curve — where **every number is derived from your real records or a row
you logged yourself**, never invented.

---

## Package

**File:** `shivaa-update-v183.zip`
**Size:** 471,325 bytes · **SHA-256:**
`20509869515bfae9931b504b79edf59f5479d1081203a21f942802d2ab4b40e3`
**Layout:** root of the ZIP = overwrite into `public_html/` (same as v165+).
**7 files**:

| File | Bytes | What changed |
|---|---:|---|
| `api.php` | 522,790 | **FY deck**: `shv_fy_*` helpers + four admin-only routes (`GET`/`POST admin/fy-targets`, `POST admin/fy-targets/entry`, `POST admin/fy-targets/entry-undo`), `fyEntries` ledger, audited writes, rel 183 |
| `js/admin.js` | 345,316 | **👑 FY Mission** tab: ticking countdown, two lane rings + rails with 25/50/75/100 ticks, run-rate panel, binding projection + verdict chip, cumulative growth curve, ledger with **Undo**, mission settings |
| `css/v183.css` | 16,381 | **New** — the deck's design system (obsidian + 24k gold foil, Cormorant numerals), scoped entirely to `.fy-deck`, with reduced-motion, phone and print variants |
| `index.html` | 31,994 | stamps → 183 (58× `?v=183`, `__SHIVAA_REL=183`); `css/v183.css` loaded **non-blocking** (v117 preload-swap + noscript) so shoppers pay no blocking CSS |
| `js/app.js` | 652,435 | `APP_REL = 183` |
| `sw.js` | 13,094 | SHELL/REL 183, 52× `?v=183`, precaches the new sheet; MEDIA deliberately stays `shivaa-media-v168` |
| `upgrade-sql.php` | 32,849 | **Unchanged from v182** — carried so one install is complete if your live site is still 181 (see below) |

Not packaged (never are): `.htaccess`, `data/`, `uploads/`, `config.php`,
`setup-mysql.php`, billing files.

---

## Before you start

1. **Full `public_html` backup** from hPanel (Files → Backups).
2. Confirm live is 181+: open `https://shivaa.in/api/version` — you should see
   `"rel": 181` (or higher).
3. Have your **CMS admin password** ready — step B asks for it **only if** your
   live site never ran the v182 reconciler.

---

## A. Install (extract — 2 minutes)

1. Download `shivaa-update-v183.zip`.
2. hPanel → File Manager → `public_html/` → **Upload** the ZIP → **Extract**
   it there, allowing overwrite.
3. Open the site once and hard-refresh (the release check moves every open tab
   onto 183 by itself).

## B. Reconcile — only if live is still 181 (1 minute, idempotent)

The FY deck itself adds **no database schema**. But this tree still carries the
v182 catalogue machinery, and a site that never installed v182 is missing its
columns. So:

- **If you already installed v182** (you ran `/upgrade-sql.php` after it) →
  **skip this step**, nothing to do.
- **If live is still 181** → open **`https://shivaa.in/upgrade-sql.php`**,
  enter your CMS admin password, press **Run**. It backs up `db.json` first,
  adds `products.status` / `products.batch_id` / `catalog_batches.data_json`,
  syncs every collection and verifies the counts. Running it twice is safe.

---

## Using the deck (Admin → 👑 FY Mission)

1. **Sign in as admin**, then tap **👑 FY Mission** in the left rail
   (`#/admin?tab=fy`). Nobody else can open it: the four API routes answer
   **403** to any non-admin session, and the tab renders nothing but the
   sign-in card to anyone else.
2. **The countdown** at the top ticks every second to **30 March 2027, 23:59
   IST**. It is pinned to the **server clock**, so a phone with a wrong date
   cannot lie to you about the finish line.
3. **Two lanes** — *B2B Jeweller Partners* (target **700**) and *Retail
   Customers* (target **1,100**). Each shows achieved / target, a progress ring
   and rail with 25 / 50 / 75 / 100% milestones, what is still to sign, the
   split between **database records** and **rows you logged**, needed-per-day
   vs actual-per-day, the **projected finish at your own pace** and the buffer
   in days against 30 March 2027.
4. **Log progress** — for partners and customers you signed **offline**
   (counter register, billing-software export, a WhatsApp list). The form
   **refuses a count unless you name its source** — the same standing law that
   refuses an invented weight. Online sign-ups need no logging: partner
   applications and customer accounts arrive by themselves.
5. **Undo** any ledger row — the figures drop straight back.
6. **Mission settings** — the targets, the finish line, the FY start and the
   **opening counts** (what already stood on 1 April 2026) are yours to edit.
   Set the opening counts once and the curve, the run-rate and the projection
   all measure the year honestly.
7. **Print** — the deck has a paper variant for a board meeting.

### Where every number comes from (printed on the deck itself)

| Figure | Source |
|---|---|
| B2B achieved | `partners` collection — rows with `status = approved` (pending KYC applications are shown separately, never counted) |
| Retail achieved | `users` collection — rows with `role = customer` (how many of them placed an order is shown separately) |
| Opening counts | the baseline **you** enter for 1 April 2026 |
| Logged rows | your own ledger entries, each carrying the register/export it came from |
| Growth curve | the real `joined` / `appliedAt` / `createdAt` timestamps of those records, month by month |

If nothing is growing yet, the deck says **"No growth logged yet"** and shows
**no projection** — it never invents a pace to look better.

---

## Verify (2 minutes)

1. `https://shivaa.in/api/version` — expect:
   - `"rel": 183`
   - `"stamp": { "matched": true, "index": 183, "app": 183, "sw": 183 }`
   - `"db": { "driver": "mysql", "mode": "mysql", ... }` (unchanged from 181/182)
2. Admin → **👑 FY Mission** opens with the countdown running and both lanes at
   their real figures.
3. `https://shivaa.in/api/admin/fy-targets` in a **logged-out** browser tab →
   `403 Admin access required` (that is the deck's admin-only door).
4. Log one row with a source → the lane moves; **Undo** it → the lane returns.

---

## Rollback (any time, 30 seconds)

- Code rollback: restore your `public_html` backup taken before extracting.
- Nothing in this release touches money, orders, stock, prices, weights or
  customer data, and it adds no schema — rolling back leaves your data exactly
  as it was. The `fyTargets` / `fyEntries` keys it writes into `db.json` are
  simply ignored by 182 and older.
- Never deploy an older tree over this one (forward-only from 183).

---

## Belt at close (all executed, not just parsed)

| Suite | Result |
|---|---|
| `deploy-approval-check.js` | **20/20** |
| `v183-check.js` (new — includes an **executed jsdom render of the shipped `admin.js`**) | **11/11** |
| `v183-php-run.js` (new — real `api.php` under PHP 8.3) | **12/12** |
| `v182-php-run.js` · `v181-php-run.js` · `v180-php-run.js` · `v179-php-run.js` | 9 · 6 · 8 · 25 |
| `v169-check.js` · `v169-php-run.js` · `v168-check.js` · `v168-php-run.js` | 25 · 28 · 39 · 12 |
| `v182-check` / `v181-check` / `v180-check` | SKIP-forward (stamp-exact suites superseded by 183) |
| `php-sweep` | **226 routes · 0 exceptions** |
| `npm run test:regression` | **44 suites passed, 24 retired skipped, 0 failed** |
| Both new suites re-run on the **unzipped ZIP overlay** | 11/11 · 12/12 |

**Known environmental failure, unrelated to this release:** `v179-relay.js`
fails 0/7 **in this sandbox only** — it needs the live MCX socket. Verified
identically on the untouched base commit `2e063ee` (release 182) in a separate
worktree, so v183 did not cause it.

`fyTargets` / `fyEntries` are **JSON collections** in v183 (like `khata`,
`cashbook`, `savingsPlans`) — write-truth is `data/db.json`, included in every
admin backup. Moving them to MySQL is a later, separate step.
