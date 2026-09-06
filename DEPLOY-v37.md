# DEPLOY — how to go live (v37)

## A. UPDATE an existing site (the normal case — you are here)
Zip: **`shivaa-update-v37.zip`** (4 files, 645 KB, md5 `c9fce3ef6b097427f894679d39b3adb1`)
1. hPanel → Files → File Manager → `public_html`
2. Upload the zip → right-click → **Extract** (overwrites the 4 files)
3. Hard-refresh; verify: source has `?v=37` ×7 · `POST /api/media` → 401/403
4. Optional: LiteSpeed Cache → Purge All
**Never contains** `data/db.json`, `uploads/`, `sms.php` — zero data risk.

## B. FRESH INSTALL (new host / test domain)
Zip: **`shivaa-FULL-fresh-install-v37.zip`**
1. Upload to `public_html` → Extract → contents land as `cms/` folder →
   move the contents of `cms/` **one level up** into `public_html/`
   (index.html, api.php, .htaccess, css/, js/, images/, data/, uploads/…)
2. Ensure `public_html/data/` + `uploads/` are writable (usually already are).
3. Open the site → admin login: `admin@shivaa.in` (password: see the
   handoff doc — then **rotate it**).
4. Verify: homepage renders (posters + carousel + bestsellers) ·
   `?v=37` ×7 · login works · catalogue PDFs download (20 files) ·
   the two exemplar products (PGS5001/PGS5004) show exactly 4 photos.
   (v42: product films are retired — no `<video>` slide, no FILM badge.)
5. This zip ships a **demo database** (342 products). Go live with your real DB
   only after restoring it, or keep using demo data while testing.

## Notes
- Hostinger PHP limits (64 MB) are sufficient — the upload cap is 25 MB/file.
- PHP 8.1+ required (tested 8.4); `finfo`, `json`, `curl`, `mbstring` extensions
  are needed by api.php — all default on Hostinger.
- If you ever change `js/app.js` or `css/styles.css`, bump `?v=37 → ?v=38` in
  `index.html` too (7 places) — otherwise browsers keep the cached old files.
