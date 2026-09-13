# DEPLOY v105 — the 12-item UI/UX release (+ GSTIN on the trust page)

**Short version:** merge the pull request → your server's 5-minute sync cron deploys the code →
open `#/admin` → Settings → paste the GSTIN → Save. Then run the 2-minute checklist at the bottom.

**Read this first:** the Arena sandbox that produced v105 cannot open any connection to
`shivaa.in` or Hostinger (documented egress block — see `STUCK-FIX-README.md` and
`docs/DIAGNOSIS-STUCK-2026-09-13.md`). So nothing below can be done *from this chat*: it all
happens from **GitHub → your Hostinger account**. You do not need a terminal — Paths A, B and C
are all browser/File-Manager only.

---

## 0. What is being deployed

Branch `arena/01a09a8c-shivaa-ecom` (commit `7278e8c` + the admin-settings commit).
Everything lives under `cms/`, which is the folder that maps to `public_html/`.

| Server path (`public_html/…`) | Repo path | Why |
|---|---|---|
| `css/v105.css` | `cms/css/v105.css` | **NEW FILE** — all v105 styling (search, quick view, slider, filters, footer, trust, b2b, calculator, size guide, rates glow) |
| `js/v105.js` | `cms/js/v105.js` | **NEW FILE** — search panel, rates-tab glow, footer ticker, trust/b2b enhancers, calculator guard |
| `index.html` | `cms/index.html` | loads `?v=105` assets, search drawer, footer motion markup |
| `js/app.js` | `cms/js/app.js` | quick-view modal, hero slider controls, advanced filters, size guide, b2b KYC auto-OTP, wishlist badge guard |
| `js/auth.js` | `cms/js/auth.js` | Passport OTP boxes: paste / auto-advance / auto-verify |
| `js/otp-autofill.js` | `cms/js/otp-autofill.js` | OTP helper used by login + jeweller form |
| `js/trust.js` | `cms/js/trust.js` | Why Trust Shivaa redesign, live counters, GSTIN block |
| `js/admin.js` | `cms/js/admin.js` | **NEW:** Settings now has editable CIN / UDYAM / GSTIN with live validation |
| `trust.php` | `cms/trust.php` | serves `gstin` in `/api/trust` (validated server-side; never a fake) |

Not deployed on purpose: `cms/data/db.json` and `cms/uploads/` — the sync worker excludes them so
your **live orders, users, gold rates and uploaded media are never overwritten** by a code deploy.
That is exactly why the GSTIN needs step 3 below.

The remaining changed files (`qa/`, `docs/`, `README.md`) are development artefacts; they ship to
GitHub but have no effect on the website.

---

## Path A — automatic (recommended): merge the PR, the cron deploys it

`deploy/auto_sync.php` runs every 5 minutes on the server. It downloads the branch from GitHub,
copies `cms/` into `public_html/` (minus `data/` + `uploads/`), keeps a one-generation backup,
verifies `api.php` + `index.html` byte-for-byte, smoke-tests `GET /api/products`, and **rolls
itself back automatically if anything fails**.

1. **Merge the pull request**
   <https://github.com/theunreal8055-coder/Shivaa.ecom/pull/new/arena/01a09a8c-shivaa-ecom>
   (or `Compare`: <https://github.com/theunreal8055-coder/Shivaa.ecom/compare/main...arena/01a09a8c-shivaa-ecom>)
   Any merge style is fine. The branch is only 2 commits behind `main` and they touch **different
   files** (two PDF uploads), so there is no conflict.

2. **Check which branch the sync follows** — one-time, 60 seconds
   hPanel → **File Manager** → enable *Show hidden files* → home directory (`/home/u375397497`) →
   `.shivaa-sync.json` → **Edit**. Look at `"branch"`:
   - `""` (empty) or `"main"` → correct, nothing to do.
   - `"arena/01a07082-shivaa-ecom"` (an old session's branch, as documented in
     `deploy/AUTOMATION.md`) → change it to `"main"` and save. Otherwise the cron keeps deploying
     the old branch and your merge will never appear.
   - You can also point `"branch"` at `arena/01a09a8c-shivaa-ecom` to deploy **before** merging;
     after the merge, set it back to `"main"`.

3. **Wait up to 5 minutes**, or trigger it immediately:
   - hPanel → **Cron Jobs** → the `auto_sync.php` line → *Run now* (if your plan offers it), or
   - the deploy bridge (`deploy/upload_bridge.php` → **Run sync now**) if it is still installed, or
   - SSH: `php /home/u375397497/auto_sync.php`

4. **Read the log** — File Manager → `/home/u375397497/shivaa-sync.log` (last lines).
   Success looks like:
   `DEPLOYED n cms code file(s) -> /home/u375397497/public_html (verified + smoke-tested OK)`
   Anything with `ROLLBACK` means it restored the backup by itself — copy the log lines and tell me.

---

## Path B — manual, no cron (File Manager, phone or tablet)

1. Download the branch as a ZIP (you must be logged in to GitHub — the repo is private):
   <https://github.com/theunreal8055-coder/Shivaa.ecom/archive/refs/heads/arena/01a09a8c-shivaa-ecom.zip>
2. File Manager → **home directory** → *Upload* → pick the ZIP → right-click → **Extract**.
3. From `Shivaa.ecom-arena…/cms/` copy **only these 9 files** into `public_html/`, in this order:
   1. `css/v105.css` → `public_html/css/` *(new)*
   2. `js/v105.js` → `public_html/js/` *(new)*
   3. `trust.php` → `public_html/`
   4. `js/app.js`, `js/auth.js`, `js/admin.js`, `js/otp-autofill.js`, `js/trust.js` → `public_html/js/`
   5. `index.html` → `public_html/` *(last — it is the file that switches everything on)*
   Choose **Overwrite** when asked.
4. **Never** copy `cms/data/` or `cms/uploads/` over the live folders. That would wipe live
   orders, users, rates and every uploaded photo.
5. Do **not** use hPanel's *Git deployment* pointed at the repository root — it would publish
   `deploy/`, `docs/`, `demo65/` and the whole history next to the website
   (already warned about in `deploy/UPLOAD-RUNBOOK.md`).

---

## Path C — browser-only bridge (if you cannot use File Manager either)

`deploy/upload_bridge.php` is the established pattern in this repo: a single PHP file you drop into
a secret folder in `public_html/`, use from the browser, and it self-destructs. Its **Run sync now**
button executes exactly the Path A worker. Use it only if Paths A and B are both unavailable —
and delete it afterwards.

---

## Step 3 — publish the GSTIN (required, one time, ~30 seconds)

Code deploys never touch `data/db.json`, so the GSTIN has to be set through the site itself.
**This is new in v105:** the Settings form previously could not edit it at all.

1. Open <https://shivaa.in/#/admin> → sign in as admin.
2. Tab **Settings** → section **Legal & registrations**.
3. GSTIN: `08AAICE5666R1ZP` — as you type it validates live:
   `✓ Valid GSTIN · Rajasthan · PAN AAICE5666R — publishes on save`.
   A wrong number shows `✗ Checksum failed` and stays unpublished instead of printing a fake record.
   CIN and UDYAM are editable in the same block; blanking a field makes the site honestly show
   *Not provided*.
4. Click **Save settings**. The API merges keys, so phone / shipping / announcements are untouched.
5. Confirm: <https://shivaa.in/api/trust> must contain `"gstin": "08AAICE5666R1ZP"`.

Prefer the API instead of the form? Two calls:

```bash
curl -s -X POST https://shivaa.in/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}'   # → copy "token"

curl -s -X PUT https://shivaa.in/api/settings \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer PASTE_TOKEN' \
  -d '{"gstin":"08AAICE5666R1ZP"}'
```

---

## Step 4 — verify (2 minutes)

**Cache:** `.htaccess` expires HTML immediately, and `index.html` loads CSS/JS with `?v=105`, so a
normal refresh is enough. On a phone use *pull to refresh*; if in doubt, private/incognito window.

Server-side checks:

```bash
curl -sI https://shivaa.in/css/v105.css | head -1      # expect HTTP/2 200
curl -sI https://shivaa.in/js/v105.js   | head -1      # expect HTTP/2 200
curl -s  https://shivaa.in/api/trust | head -c 300     # gstin present
curl -s  https://shivaa.in/api/products | head -c 120  # products still serve
```

Click-through (each item maps to the plan):

| # | Where | Expect |
|---|---|---|
| 1 | Home, search bar | Glass capsule, glow ring on focus, typed-query suggestions + category chips + live result preview, shine sweep |
| 2 | Any listing → **Quick View** | Modal with image, variants, price, add-to-cart — the URL must **not** change |
| 3 | Home hero (4 banners) | Smooth crossfade, arrows + progress dots, no flicker, no height jump; autoplay resumes after you touch it |
| 4 | Shop page filters | Dual-thumb price slider, accordions with facet counts, sort bar, removable filter pills, live “n results” |
| 5 | Login / Passport | Paste a 6-digit OTP → it splits across the boxes, auto-advances, backspace steps back, auto-verifies |
| 6 | Footer | Animated divider, hover glow on links, animated social icons, gold-rate ticker, GSTIN line, scroll reveal |
| 7 | `#/trust` | Parallax + tilt cards, counters animate up, **GST 08AAICE5666R1ZP** shown prominently |
| 8 | `#/b2b` | Floating 3D-tilt benefit cards, animated counters, gradient borders; in the form, 10 digits typed → OTP fires itself, valid GSTIN → ✓ Verified tick |
| 9 | Any calculator page | Inputs are readable on the dark theme (visible digits + placeholder) — no blank white boxes |
| 10 | Ring size guide | Animated selector; the largest size renders a correctly proportioned ring with min/max ghost circles |
| 11 | Rates tab (header/footer) | Glows exactly 2 tabs ahead of the active tab, on every page |
| — | DevTools console | Clean. No red errors |

A full preview of the release (same code, sandbox shim instead of PHP) ran at
`https://8090-i9ltijrivb3gt3f1q0tb5.e2b.app` and passed 212 automated assertions
(`t1`–`t6`, including the Admin → Settings → GSTIN flow).

---

## Rollback

- **Automatic:** if the sync's verification or smoke test fails, it already restored
  `/home/u375397497/shivaa-deploy-backup` — check `shivaa-sync.log`.
- **Manual:** File Manager → `shivaa-deploy-backup/` → copy its contents back over `public_html/`,
  or revert the merge commit on GitHub and run the sync again.
- **GSTIN only:** blank the field in Admin → Settings. The trust page falls back to *Not provided*
  — no broken layout, no stale number.

## What did **not** change

No database schema or migration, no new API routes, no cron changes, no payment or SMS gateway
config, no product data (weights, purities and prices untouched), `cms/deadstock.html` untouched,
carousel/gallery auto-advance still enabled.
