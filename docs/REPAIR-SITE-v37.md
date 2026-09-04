# REPAIR — Site diagnosis, fix + security audit (v37) · 4 Sep 2026

## What happened (evidence first)
| Check on shivaa.in | Result @ 08:00 IST | Verdict |
|---|---|---|
| index.html asset refs | `?v=35` ×7 (earlier @07:33 was `?v=36` ×7) | **live was reverted to v35** |
| js/app.js md5 | `852d24bf18` — differs from v36 package (`b0da639ba9`) | old app.js on disk |
| css/styles.css md5 | `b7df18be4a` — differs from v36 package | old styles.css on disk |
| POST /api/media (v36 route) | **404** `Unknown API GET /media` | old api.php on disk |
| /api/catalogs | `{"catalogs":[],"gated":true}` | old (empty) DB view |

So on the server today, the v36 update is **not applied** — the site is the
pre-update v35 build. The 4-file update was either extracted incompletely or
rolled back (or re-uploaded from an old copy).

## Was v36 buggy? — No (proof)
Tested the **actual v36 files** in Chrome (headless, desktop + 430px mobile,
full-page, console capture on live **and** local v36 server):
- Homepage: hero ✓, 4 poster slides ✓, category bar ✓, bestsellers ✓,
  New arrivals ✓, testimonials ✓ — both builds rendered **identically**
  (12,588 px tall, same DOM, **0 console errors, 0 page errors, 0 failed requests**).
- Sample PDP on live: gallery 2 slides, price ₹44,539 ✓.
- Local v36 PDP with a film: **5 gallery slides (video first) + 5 dots**, price
  breakdown correct (PGS5001: metal 23,568 + MC 2,828 + GST 792 = ₹27,188 ✓).
- All assets 200: banner images (7/7), JS (5/5), CSS (2/2).

**Conclusion:** the "no posters/banners" symptom you saw was almost certainly a
**partial extraction or a stale-cache mix** during the deploy (e.g. new index.html
with old cached app.js), not code. Nothing is "broken" in the current files.

## The fix (deterministic redeploy, ~5 min)
1. hPanel → File Manager → `public_html`.
2. Upload **`shivaa-update-v37.zip`** → **Extract** (overwrites only 4 files:
   index.html, api.php, css/styles.css, js/app.js — never touches `data/`,
   `uploads/`, or prices).
3. Hard refresh (Ctrl+Shift+R) — ideally in a private window.
4. Verify (must ALL pass):
   - View source → `?v=37` appears **7 times** (cached copy still shows ?v=35/36).
   - `curl -X POST https://shivaa.in/api/media` → **401/403** (NOT 404).
   - Homepage shows: hero, 4 rotating posters, category bar, bestsellers.
5. If it still looks wrong, purge the site cache: hPanel → **LiteSpeed Cache →
   Purge All** (Hostinger often caches static assets), then re-check step 4.

Rollback = re-upload the 4 old files (or wait — this zip is the only change).

## Security audit (19 checks — summary)
**Strong (verified live):** `data/db.json`, `data/sms-config.json`,
`samples-payload.json`, `migrate-repair.php`, `router-dev.php` all **403**;
`api.php` direct = 404; no directory listings; `sms.php` = no-op without config
file; all 6 security headers present (CSP `default-src 'self'`, X-Frame-Options
DENY, nosniff, HSTS, Referrer-Policy, Permissions-Policy); no secrets found in
any packaged file (env-var only); DB ships sanitized (0 tokens/OTPs).

**Warnings (action items):**
1. **Rotate the live admin password** (top item — it's shared with this project).
2. CSP keeps `script-src 'unsafe-inline'` (legacy inline handlers) — acceptable,
   but any future XSS must be escaped with `esc()` in app.js, never raw string
   concat of user input.
3. SMS gateway: keep `data/sms-config.json` absent until go-live; then add a
   shared-secret check to `sms.php` (currently trusts the caller).
4. Login brute-force: `loginFails` tracking exists; consider a fixed IP throttle
   in front (e.g. Hostinger firewall) before public launch.
5. Dev-only quirk (not production): `php -S` doesn't serve HTTP Range requests,
   so `<video>` may log `ERR_ABORTED` on the local test server — this works
   normally on Apache/LiteSpeed hosting.
