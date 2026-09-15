# SHIVAA v119 — deploy sheet (shivaa-update-v119.zip · 10 files)

**Release:** v119 · 22K premium ₹398 (desk physical) + published rate anchor + first-paint/mobile pack
**Zip:** `shivaa-update-v119.zip` (root layout — extract INSIDE `public_html`)
**Gates:** v113b 32/32 · v117 27/27 · v118 18/18 · **v119 27/27** · php-sweep 211 routes · 0 exceptions
(every suite re-run on the extracted zip overlay)

---

## 1 · What is in the zip

| File | Why it changed |
|------|----------------|
| `index.html` | first-paint skeleton, hero preload, `enterkeyhint`, v119 release stamp + cache keys |
| `sw.js` | shell → `shivaa-shell-v119`, precache now carries the v119 layer |
| `.htaccess` | brotli + `immutable` caching for `?v=` assets (deflate kept) |
| `api.php` | **the rate change**: 22K premium ₹398, `premium.gold22`, `anchorLevel` block |
| `js/app.js` | rate card reads the anchor, shop renders in slices, honest HUID chip, pinch zoom |
| `js/v107.js` | footer basis line quotes the 22K premium |
| `js/admin.js` | Admin → Settings: new **22K gold premium ₹/g** box |
| `js/v119.js` | install chip (2nd visit) + slow-boot safety net (new file) |
| `css/v119.css` | skeleton, install chip, HUID chip, pinch polish (new file) |
| `DEPLOY-v119.md` | this sheet |

Nothing else is touched. Products, orders, customers, weights, prices in the database are **not** in the zip.

---

## 2 · Upload (hPanel → File Manager → `public_html`)

1. **Back up first (1 minute):** download a copy of the live `api.php` and `.htaccess` to your laptop.
2. Upload `shivaa-update-v119.zip` into `public_html` and choose **Extract** (overwrite when asked).
   The zip is in *root layout*, so `index.html`, `sw.js`, `api.php`, `js/…`, `css/…` land exactly where they belong.
3. **`.htaccess` — MERGE, do not blind-overwrite** if your panel already has rules (redirects, PHP
   version handler, caching). Two options:
   * **If your live `.htaccess` was never hand-edited:** let the zip overwrite it. Done.
   * **If it has extra panel rules:** open the *existing* live `.htaccess`, and paste these two
     blocks in (they are the only v119 additions):

     ```apache
     <IfModule mod_brotli.c>
       AddOutputFilterByType BROTLI_COMPRESS text/html text/css application/javascript application/json image/svg+xml font/woff2
     </IfModule>

     <IfModule mod_headers.c>
       <FilesMatch "\.(css|js|woff2|png|jpe?g|webp|svg|ico)$">
         Header set Cache-Control "public, max-age=31536000, immutable" "expr=%{QUERY_STRING} =~ /(^|&)v=/"
       </FilesMatch>
     </IfModule>
     ```

   Both blocks are `<IfModule>`-guarded: on a host without brotli/headers they are simply ignored.
   If the site shows a 500 after editing `.htaccess`, restore your backup copy — nothing else is affected.
4. `api.php` must be at **`public_html/api.php`** (that is the live API on Hostinger).

> The `main` branch is tracked by the server cron, so the same release also arrives through auto-sync
> within ~5 minutes of the PR merge. The zip is the fast path; main is the durable one.

---

## 3 · Verify live (2 minutes)

```
https://shivaa.in/api/rates
```
must now contain:

* `"premium":{"gold22":398,…}` — the 22K premium (was `"gold":55` only)
* `"anchorLevel":{"mode":"mcx-future","goldPerG":<today's 24K ₹/g>,"silverPerG":…}`
* `jaipur.gold22` **= round(anchorLevel.goldPerG × 0.9167) + 398**
  (e.g. anchor 15,084 → `13828 + 398 = 14226`)
* the 24K line is unchanged, and every 22K piece is **₹343/g** dearer than v118 (`398 − 55`)

On the site: **Live Rates** page must show the *22K Jaipur premium* row and a *Rate anchor* row.

---

## 4 · Owner phone pass (5 minutes)

1. **Shop** — scroll the rings grid: it paints instantly and grows in slices as you scroll (no long pause).
2. **Tap + pinch** — Quick View photo: double-tap zooms, a two-finger pinch zooms further, letting go near 1× returns.
3. **HUID chip** — open any ring: the chip under the title says *HUID check* and links to the BIS Care guide.
4. **Rates page** — 22K premium ₹398 and the MCX-future anchor row are visible and add up.
5. **Install chip** — the next time you open the site on your phone (2nd visit), an *Install* chip appears; Close dismisses it for good.

**If the phone looks unchanged:** close **all** Chrome tabs of shivaa.in and reopen (or pull-to-refresh twice).
Last resort: Site settings → Clear & reset. The v119 handshake self-heals a phone holding a stale script.

---

## 5 · Rollback

Re-upload the backed-up `api.php` (rates) and/or `index.html` + `sw.js` + `js/app.js` (UI).
The service worker keeps the previous shell cached until it activates the new one, so a rollback is instant and needs no cache surgery.
