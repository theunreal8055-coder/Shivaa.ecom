# DEPLOY v180 — SQL runtime (Hostinger MySQL engages, JSON safety net stays)

**Release:** 180 · **Built:** 24 Sep 2026 · **Live before this runs:** 179 (owner-deployed)
**Status:** built + gated; **deploy only after the owner's explicit yes**
**Source commit:** `9a1d60a` · **Prerequisite:** live **v179 or newer**

**What this release is, in one line:** the site finally *uses* the Hostinger
MySQL database when `db_driver => 'mysql'` — product catalogue reads come
from SQL, every save mirrors back to SQL — while the proven JSON file stays
the write source of truth and safety net the entire time. This is roadmap
Phase 1+2 of the 3-lakh catalogue plan; orders/settings/money routes do
**not** move yet (Phase 3, separate release).

---

## Package

**File:** `shivaa-update-v180.zip`
**Size:** 440,882 bytes · **SHA-256:**
`c09a4f41b125ebba16c23df3d2ef720fb5fbcb406a5de73a1cace0a61bff640b`
**Layout:** root of the ZIP = overwrite into `public_html/` (same as v165+).
**6 files** (css untouched this release — v178.css stays last stylesheet):

| File | Bytes | What changed |
|---|---:|---|
| `api.php` | 464,445 | dual-mode SQL overlay + mirror-on-save + `/api/version db` telemetry + compute_price hardening |
| `index.html` | 31,412 | stamps → 180 (56× `?v=180`) |
| `sw.js` | 13,069 | SHELL/REL 180, 51× `?v=180`, MEDIA deliberately stays `shivaa-media-v168` |
| `js/app.js` | 652,435 | `APP_REL = 180` |
| `js/admin.js` | 310,386 | v180 **Data Source strip** on Admin → Live Rates |
| `upgrade-sql.php` | 20,459 | **NEW** — one-time SQL reconciler (ZIP-only; never auto-deployed) |

Not packaged (never are): `.htaccess`, `data/`, `uploads/`, `config.php`,
`setup-mysql.php`, billing files.

---

## Before you start

1. **Full `public_html` backup** from hPanel (Files → Backups), same as
   every release. This is the rollback for the code side.
2. Confirm live is 179+: open `https://shivaa.in/api/version` — you should
   see `"rel": 179`. If it says anything older, STOP and tell me first.
3. Have your **CMS admin password** ready (the installer asks for it —
   same password you use for the shop admin).

---

## Install (extract — 2 minutes)

1. Download `shivaa-update-v180.zip`.
2. hPanel → File Manager → `public_html/` → **Upload** the ZIP →
   **Extract** it there, allowing overwrite. (Same ritual as v179.)
3. That's it for the code. **Do not delete or edit anything by hand.**

**Right after extract the shop behaves exactly as before (JSON)** — your
hosting `config.php` already says `db_driver => 'mysql'`, but until the
next step runs, the safety net sees the old 77-row copy vs your live
products, reports `db.reason = count-mismatch` on `/api/version`, and keeps
serving the JSON file. Nothing breaks while you take your time with step B.

---

## B. Turn SQL on (one URL, ~1 minute)

1. Open **`https://shivaa.in/upgrade-sql.php`**
   (new file that just arrived with the ZIP — if it 404s, the extract in
   step A didn't land; re-check the extraction).
2. Enter your CMS admin password, press **Run**.
3. It walks, in order and reports each step:
   - **Backup first** — a timestamped copy of `db.json` written into
     `data/` before anything else touches SQL;
   - **Schema** — products table + full-text search index (built for
     300k rows) + Phase-3 tables prepared;
   - **Upload** — every live product copied into MySQL;
   - **Verify** — row count and a byte-identical spot-check; if either
     fails it STOPS and leaves the JSON net in place;
   - **Done** — the `data/.sql-mirror-behind` safety flag is cleared,
     and SQL starts serving on the next page load.
4. Wrong password? It refuses and throttles (5 tries / 15 min) — no harm
   done, just wait or re-enter carefully.

**Expected report (numbers = YOUR live catalogue):**
backup created · products table ready · N products uploaded · verified
N/N · done. Screenshot it and send it back to me for the record.

---

## Verify (2 minutes)

1. `https://shivaa.in/api/version` — expect:
   - `"rel": 180`
   - `"db": { "driver": "mysql", "mode": "sql", "reason": "", … }`
   - `mirrorBehind: false`
2. Admin → **Live Rates** → the new **Data Source** strip should be
   **green: MySQL** (amber + a plain-English reason = the safety net is
   holding; the strip tells you the fix — usually “run upgrade-sql.php”).
3. Walk the shop: home → a category → open 2–3 products (prices,
   purity, images all normal) → search a design name (full-text search
   should feel instant).
4. Admin → edit any product (change a description slightly) → **Save** →
   refresh the public page → your change appears. This proves the
   mirror-on-save path end to end.
5. Check `/api/version` once more — still `mode: "sql"`, `reason: ""`.

Then reply here with what you saw (or the screenshots). I record
v180 as live-verified only from your confirmation + these checks.

---

## Rollback (any time, 30 seconds)

- **Stay on 180, just put JSON back in charge:** in `config.php` set
  `db_driver => 'json'` and save. Reads/writes are JSON again instantly;
  SQL is ignored. (Leave `upgrade-sql.php` in place — it changes nothing
  by existing.)
- **Full code rollback:** restore the `public_html` backup from step 0
  (that returns you to v179 files exactly).
- You never need to delete the MySQL data; it simply sits unused until
  you point the driver back at it.

If anything ever looks wrong while `mode: "sql"`, the site self-protects:
any mirror failure writes `data/.sql-mirror-behind`, reads fall back to
JSON immediately, and `/upgrade-sql.php` re-run reconciles and heals.

---

## Truthful limits (please read)

- This sandbox has **no MySQL server**, so the SQL path was verified by
  executed fallback/verdict/installer tests (15 new checks), your
  `upgrade-sql.php` report, and the live `db.mode` above — not by a
  sandbox round-trip. That is exactly what steps B/Verify close.
- **Orders, customers, settings, money routes stay on the JSON file**
  (Phase 3). Empty SQL `orders/settings` tables are unchanged and correct.
- The 77-row staging copy from September is **replaced** by the installer’s
  fresh upload of your full live catalogue — you don’t need phpMyAdmin.
- Media (photos/videos) is untouched (~unchanged at v168 cache); the
  300k-designs object-storage decision is still yours to make later.

## Do NOT

- Do not run this ZIP on a site older than v179 (tell me first instead).
- Do not hand-edit `cms/data/db.json`, `config.php` beyond the one
  `db_driver` line, or any SQL table in phpMyAdmin.
- Do not delete `upgrade-sql.php` after running it — keep it; it is how
  the mirror flag heals if a future SQL hiccup ever sets it, and how
  schema updates will re-run in later releases.
- Do not extract only `sw.js` or only some files — all 6 or nothing.
- No deployment at all until the owner says yes; a GitHub push never
  updates this host.
