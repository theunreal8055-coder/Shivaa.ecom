# DEPLOY v106 — the operability release (every v105 defect fixed + 6 new capabilities)

**Short version:** upload `shivaa-update-v106.zip` into `public_html/` → Extract → Overwrite →
open <https://shivaa.in> and refresh. Then run the 3-minute checklist at the bottom.
Nothing in this release touches your live data: `data/db.json` and `uploads/` are **not** in the zip.

**Read this first:** the Arena sandbox that built v106 still cannot open any connection to
`shivaa.in` or Hostinger (documented egress block — see `STUCK-FIX-README.md` and
`docs/DIAGNOSIS-STUCK-2026-09-13.md`). So nothing below can be done *from this chat*: it happens
from **your Hostinger File Manager** (or by merging the pull request, Path A). No terminal needed.

---

## 0. What is being deployed

Branch `arena/01a09a8c-shivaa-ecom`. Everything lives under `cms/`, the folder that maps to
`public_html/`. Unlike v105 (9 changed files), **v106 ships the complete code set** — every
`.php`, `.html`, `.css` and `.js` the site runs — so an extract-over-`public_html` can never leave
a half-updated mix behind. Media and data are still excluded on purpose.

| Server path (`public_html/…`) | Repo path | What changed in v106 |
|---|---|---|
| `index.html` | `cms/index.html` | loads every asset as `?v=106`; footer ring-guide links; footer rate ticker markup |
| `api.php` | `cms/api.php` | **OTP is 4 digits everywhere** (`OTP_DIGITS = 4`, response now carries `digits`); **checkout rate lock** (`RATE_LOCK_SECONDS = 1200`, `RATE_LOCK_TOLERANCE = 0.03`), `POST /api/orders` re-validates the locked snapshot and returns `rateLock`; `GET /api/rates` publishes `lockMinutes` |
| `js/app.js` | `cms/js/app.js` | Quick View scroll/focus reset; filter bottom sheet + drag-to-dismiss; fly-to-cart + auto-opening mini-cart with Checkout CTA; footer/header rate sync from one snapshot + basis line; tap-reactive rates glow; ring size guide as a page (`#/size-guide`) with a true proportional scale; dead-stock desk takes **every** category; design desk photo slider + full detail sheet; 20-minute rate lock; handler hardening; route-scoped redirect timer |
| `js/auth.js` | `cms/js/auth.js` | Shivaa Passport: 4 OTP boxes, auto-send at 10 digits, paste-splits, auto-verifies when the 4th box fills |
| `js/admin.js` | `cms/js/admin.js` | `#/partner` opens on the **Bullion Desk**; partner record failure shows a friendly door instead of a crash |
| `js/otp-autofill.js` | `cms/js/otp-autofill.js` | length-driven (4 or 6) — reads `digits` from the API instead of hard-coding |
| `js/v105.js` | `cms/js/v105.js` | glow follows the tap (`pointerdown` → two tabs ahead), press feedback, motion pauses when the tab is hidden |
| `css/v105.css` | `cms/css/v105.css` | §12 mobile bottom sheets, `.cd-rowctl`, `.frt-basis`, `.tab-press`, `body.is-hidden` pause rules, drag-handle sizing (40px+ targets) |
| `js/trust.js`, `js/hallmark.js`, `js/qr.js`, `js/three-d.js`, `css/fonts.css`, `css/styles.css`, `css/hallmark.css`, `css/trust.css`, `trust.php`, `hallmark.php`, `sms.php`, `migrate-repair.php`, `.htaccess` | same paths under `cms/` | unchanged since v105 — shipped so the package is complete |

**Not deployed on purpose:** `cms/data/db.json` (your live orders, users, rates, products) and
`cms/uploads/` (your live photos/videos), plus `cms/images/` (140 MB of artwork that v106 does not
change). The server's 5-minute sync worker excludes `data/` + `uploads/` for the same reason, so a
code deploy can never destroy live data.

The remaining changed files (`qa/`, `docs/`, `README.md`) are development artefacts; they ship to
GitHub and have no effect on the website.

---

## Path A — automatic (recommended): merge the PR, the cron deploys it

`deploy/auto_sync.php` runs every 5 minutes on the server. It downloads the branch from GitHub,
copies `cms/` into `public_html/` (minus `data/` + `uploads/`), keeps a one-generation backup,
verifies `api.php` + `index.html` byte-for-byte, smoke-tests `GET /api/products`, and **rolls
itself back automatically if anything fails**.

1. **Merge the pull request**
   <https://github.com/theunreal8055-coder/Shivaa.ecom/pull/new/arena/01a09a8c-shivaa-ecom>
   (or `Compare`: <https://github.com/theunreal8055-coder/Shivaa.ecom/compare/main...arena/01a09a8c-shivaa-ecom>)
2. Wait up to 5 minutes, then open <https://shivaa.in> and refresh.
3. If the cron is pointed at an old branch, fix `.shivaa-sync.json` → `"branch": "main"`
   (hPanel → File Manager → *Show hidden files* → home directory → Edit). Full steps in
   `DEPLOY-v105.md` → Path A and `deploy/AUTOMATION.md`.

## Path B — manual, from the zip (File Manager, phone or laptop)

1. hPanel → **File Manager** → open `public_html`.
2. Upload `shivaa-update-v106.zip` there → right-click → **Extract** → **Overwrite** when asked.
3. Delete the zip from `public_html` afterwards (optional but tidy).
4. Open <https://shivaa.in> and refresh. `index.html` is never cached; CSS/JS are requested as
   `?v=106`, so a normal refresh is enough — no "hard clear" needed.

**Order matters if you copy files one by one instead of extracting:**
`api.php` → `css/v105.css` → the `js/` files → `index.html` **LAST** (index.html is what switches
`?v=106` on). Uploading `index.html` first would ask browsers for `?v=106` files that are not there
yet — a 30-second window of stale-cache 404s.

## Path C — FTP / SSH

Same thing, same paths: extract the zip locally and upload the contents into `public_html/`,
overwriting. Do not delete anything else.

---

## Step 2 — the GSTIN (one time, only if you have not done it since v105)

Code deploys never touch `data/db.json`, so the GSTIN lives in your site settings, not in this zip.
If you already saved it during the v105 deploy, **skip this step**.

<https://shivaa.in/#/admin> → **Settings** → *Legal & registrations* →
GSTIN: `08AAICE5666R1ZP` → **Save settings**.
It validates as you type (`✓ Valid GSTIN · Rajasthan · PAN AAICE5666R`); a wrong number shows
`✗ Checksum failed` and stays unpublished rather than printing a fake record.
Confirm: <https://shivaa.in/api/trust> must contain the `gstin`.

## Step 3 — nothing else to configure

* **OTP length** is a server constant (`OTP_DIGITS = 4` in `api.php`) — the login sheet and the
  jeweller KYC form both read `digits` from the API response, so they can never disagree.
  SMS stays in demo mode until a gateway key is added: the code is shown on screen in a
  `Sandbox demo code: 1234 — tap to fill` chip, exactly as before.
* **Rate lock** needs no setup: `RATE_LOCK_SECONDS = 1200` (20 minutes) with a 3% sanity tolerance.
  A shopper who checks out within 20 minutes of the snapshot pays the locked rate; after that the
  checkout re-prices itself and says so.
* **Bullion Desk as the partner front door** needs no setup either: `#/partner` always opens on the
  Bullion Desk; the desk you switch to is kept in the URL (`#/partner?view=dash`), so a refresh or a
  bookmarked link lands you back where you were.

---

## VERIFY (3 minutes, phone in one hand)

**Assets**
- <https://shivaa.in/js/app.js?v=106> → loads (not a 404 page)
- <https://shivaa.in/api/rates> → JSON contains `"lockMinutes":20`

**Quick View (the #1 complaint)**
- Shop → tap **Quick View** on any card → a modal opens and the URL does **not** change.
- Scroll inside it: the description, size pills and price details all reach the top of the screen;
  the buy row is always visible. Tap a size pill → it lights up. Tap **Add to bag**.

**Fly-to-cart + the mini-cart sheet**
- The piece visibly flies to the bag icon, and the bag drawer opens by itself with
  **− qty +** on its own row, a separate **remove** control, a subtotal, a free-shipping progress
  line and a **Checkout →** button.
- On a phone: drag the drawer's title bar down → it dismisses. Tap the scrim → it closes.
  Press Esc on a keyboard → it closes. Page scroll comes back every time.

**Filters**
- Shop → **Refine** → a bottom sheet rises with a grab handle, a live result count and an Apply bar.
- Drag the handle down → the sheet dismisses. Drag *inside* the list after scrolling → the list
  scrolls, the sheet stays. Tick a facet → the count updates and a removable pill appears; the sheet
  stays open until you press **Apply**. Esc and ✕ both close it.

**Rates: header, footer, chart**
- The footer ticker and the header strip show the **same** 22K and silver numbers at the same time,
  and the footer states its basis (`₹14,300/g spot + ₹55/g Jaipur premium · refreshed every 10 min`)
  so the two never look contradictory.
- Tap a footer link → the tab acknowledges the press and the glow moves two tabs ahead of it.
  Hide the tab (switch apps) → the decorative motion pauses; come back → it resumes.

**OTP — 4 digits everywhere**
- Header **Login** → *Continue with mobile* → type 10 digits → the code sends itself →
  exactly **4** boxes → paste a 4-digit code and it splits across all four → the moment the last
  box fills it verifies itself, no button.
- `#/b2b` → the jeweller form does the same at the 10th digit, and a valid GSTIN self-checks at 15
  characters with a ✓.

**Ring size guide**
- Two footer links go to `#/size-guide` — a real page, not a popup. The biggest size draws a
  visibly bigger ring than the smallest (true proportional scale, 8 → 26), the mm readout follows,
  and on a phone the whole scale fits the screen.

**Checkout rate lock**
- Add anything → Checkout → a **Rate locked for 19:58** banner counts down. Wait/reload within
  20 minutes and the totals do not move; after it expires the checkout re-prices and tells you.

**Partner + B2B depth**
- Sign in as a partner → `#/partner` lands on the **Bullion Desk** with live jewellery + bullion
  rates; Dashboard is one tap away.
- `#/catalogues` → every design card carries the manufacturer's own photos as a slider (arrows,
  dots, hover-cycle on desktop, swipe on a phone) and **ⓘ full details** opens a sheet with gross /
  less / net weight, stone specs and the fine-metal settlement maths. Selecting from the sheet
  highlights the card behind it and feeds the fine-metal bar.
- `#/deadstock` → the desk now prices **every** category (22K plain, CZ, 18K, 24K, silver) with
  stone deduction and an enquiry form — not just plain gold.

**Dead links**
- Type a nonsense hash (`#/nope`) → "Redirecting you home in 3…" — but if you navigate somewhere
  valid inside those 3 seconds, the countdown dies with the page and **cannot** yank you home later.
  (This was found by the audit, not reported: a stale timer used to survive the route change.)

---

## What was tested before this zip was built

Three jsdom-driven suites run against a PHP-shaped preview of the site (`qa/`):

| Suite | Scope | Result |
|---|---|---|
| `qa/browser/t7-audit.mjs` | repo-wide feature audit: every internal route rendered, every button clicked | **PASS 4/4** — 46 routes, 151 buttons, 0 uncaught errors |
| `qa/browser/t8-v106.mjs` | 13 feature groups: Quick View, cart/fly-to-bag, filters, rate parity, footer + size guide, glow, Passport OTP, B2B OTP, partner desk, design desk, dead stock, checkout rate lock, error sweep | **PASS 78/78** |
| `qa/browser/t9-mobile.mjs` | the same site in a 390×780 touch viewport: drawer swipe-to-close, filter sheet drag-to-dismiss, scroll-vs-drag, Quick View sheet, cart sheet, tap feedback, rate parity, size guide scale, stale-redirect guard | **PASS 49/49** |

Run them yourself (Node 18+, no browser needed):

```bash
cd qa && python3 preview_shim.py &      # PHP-shaped API on :8090
cd browser && npm i jsdom && node t7-audit.mjs && node t8-v106.mjs && node t9-mobile.mjs
```

## If anything looks wrong after deploying

1. Refresh once with the browser cache bypassed (Chrome: ⋮ → *More tools* → *Network* → tick
   *Disable cache* → reload). Every asset is `?v=106`, so this is rarely needed.
2. Check <https://shivaa.in/api/rates> returns JSON with `lockMinutes`. If it 500s, `api.php` did
   not upload completely — re-upload that one file.
3. The sync worker keeps a one-generation backup and rolls itself back on a failed smoke test;
   for a manual upload, restore `public_html/` from the hPanel **Backups** tab (daily).
4. Tell me exactly what you see (page, phone or laptop, and the words on screen) and I will fix it
   in this same branch.
