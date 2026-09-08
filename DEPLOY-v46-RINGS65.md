# DEPLOY v46 — ALL 65 RINGS (PGS5001–PGS5065), nothing else touched

One zip puts the **entire 65-ring catalogue** live with final photos
(creamy-white face cover + editorial + worn + gift, 4 per ring, no videos).
Unlike v43, it does **NOT** ship a full `db.json` — live orders, users, rates
and every other category stay exactly as they are.

**Sandbox/agent note:** the Arena sandbox cannot reach shivaa.in, so the final
step runs on your side — ~3 minutes in hPanel, tablet OK.

---

## The file

**`shivaa-update-v46-rings65.zip`** — 263 files, ~45 MB
(`md5 cde3261f474c769e64dfb289b929b279`)

| Inside (site-root paths — extract into `public_html`) | Count |
|---|---|
| `images/designs/rings/*.jpg` (4 per ring, exactly what `db.json` references) | 260 |
| `data/rings65-products.json` (the 65 ring records — installer payload, not web-served) | 1 |
| `apply-rings65.php` (one-click merge installer, self-destructs after) | 1 |
| `READ-ME-RINGS65.txt` (the same steps, inside the zip) | 1 |

Deliberately **excluded**: full `data/db.json` (would clobber live orders/users),
supplier reference crops, videos (v44 = no videos on PGS rings), superseded dark
studios, and all other site files. Paths are site-root-relative (no `cms/` prefix —
that was the v43 path bug; v42-style is correct).

Rebuild any time (asserts 65/65 SKUs + 260/260 images on disk):
`python3 deploy/build_rings65_zip.py` (installer source: `deploy/apply-rings65.template.php`).

## Steps

1. hPanel → Files → File Manager → `public_html` → upload the zip →
   right-click → **Extract** (only ADDS files).
2. Browser: `https://shivaa.in/apply-rings65.php` → log in (admin password).
3. **STEP 1 — Merge** (automatic backup `data/db.json.bak-<date>` first).
   Optional checkbox removes the 20 old `SS-RIN` demo rings — off by default,
   so by default **nothing is ever deleted**. Live stock/ratings/HUID data kept.
4. **STEP 2 — Verify** → expect 65 PGS rings · 0 videos · 260/260 images.
5. **STEP 3 — Self-destruct** → delete the zip in File Manager →
   LiteSpeed Cache → Purge All → hard-refresh.
6. Spot-check: Rings category = 65 PGS rings; 2–3 PDPs show 4 photos starting
   with the white-face cover and no film badge.

Rollback: in File Manager rename `data/db.json` away, then rename
`data/db.json.bak-<date>` → `data/db.json`.

Outside check: `https://shivaa.in/api/products?q=PGS` → 65 entries, 4 image URLs each.
