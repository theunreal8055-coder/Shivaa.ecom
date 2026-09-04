# DEPLOY — how to go live (v49)

**v49 = WhatsApp/email order & payment confirmations** (built on top of the
v38–v48 audit + growth features: trust, watchlist/alerts, bulk/template,
SMS OTP + auto-fill, review moderation, cart recovery, Razorpay, HUID, etc.).

Two options — pick ONE.

---

## A. UPDATE an existing site (normal case)

Zip: **`shivaa-update-v49.zip`** (144 files, ~20 MB incl. product/banner/review
imagery; md5 `d913a6a7d7acf5df73a2c2e4d94ada86`)

1. hPanel → Files → File Manager → `public_html`
2. Upload the zip → right-click → **Extract** (overwrites matching code files;
   adds the new ones like `notify.php`, `sms.php`, `js/otp-autofill.js`,
   `js/three-d.js`, `js/qr.js`, `js/admin.js`, `js/auth.js`, images under
   `images/products/samples/`, `images/reviews/`, banner art, …).
3. Hard-refresh (**Ctrl+Shift+R**) — verify: asset refs now read `?v=49` ×7.
4. Optional: LiteSpeed Cache → **Purge All**.
5. **Never contains** `data/` and `uploads/` — so `data/db.json` (your orders,
   users, products, rates) and your uploaded catalogue PDFs / videos are
   **physically untouched**. **Zero data risk.**

> If you are coming from v27-only (never deployed the OTP/features zips),
> run `migrate-repair.php` once after extraction (it asks for the admin
> password) so the DB schema upgrades to the current shape.

---

## B. FRESH INSTALL (new host / test domain)

Zip: **`shivaa-FULL-fresh-install-v49.zip`** (183 files, ~38 MB, cms/ root;
md5 `07d727e813fcfb6ebebffe953584d5cd`)

1. Upload to `public_html` → Extract → contents land as a `cms/` folder →
   move the **contents of `cms/` one level up** into `public_html/`
   (index.html, api.php, .htaccess, css/, js/, images/, data/, uploads/…).
2. Ensure `public_html/data/` + `uploads/` are writable (usually already).
3. Open the site → admin login: `admin@shivaa.in` (see handoff doc — then
   **rotate the password**).
4. Verify: homepage renders (posters + carousel + bestsellers) · `?v=49` ×7 ·
   login works · catalogue PDFs download · Admin → 🔔 **Notifications** shows
   the DEMO gateway card. (Feature #5 ships in demo mode: confirmations are
   composed & queued so you can review the exact copy before wiring gateways.)
5. This zip ships a **demo database** (342 products). Go live with your real
   DB only after restoring it, or keep using demo data while testing.

---

## Notes

- PHP 8.1+ (tested 8.4); `finfo`, `json`, `curl`, `mbstring` extensions are
  needed by `api.php` — all default on Hostinger.
- **Feature #5 (`notify.php`) is DEMO by default**: notifications are logged
  to the admin queue but nothing is emailed/WhatsApp'd until you create
  `data/notify-config.json`. See **`cms/docs/NOTIFY-SETUP-GUIDE.md`** for the
  email + WhatsApp provider templates and the one-file rollback. `sms.php`
  works the same way via `data/sms-config.json` (see `OTP-SETUP-GUIDE.md`).
- If you ever change `js/app.js`, `js/admin.js`, or `css/styles.css`, bump the
  `?v=49 → ?v=50` refs in `index.html` too (7 places) — otherwise browsers
  keep the cached old files.
- The config files (`data/notify-config.json`, `data/sms-config.json`) are
  web-blocked by `.htaccess` (`*.json` → `Require all denied`), so gateway
  keys can never be read from the internet.
