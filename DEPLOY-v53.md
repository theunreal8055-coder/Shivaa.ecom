# DEPLOY — how to go live (v53)

**v53 = Admin contact-message inbox.** The storefront's `POST /api/contact`
was already being collected into `data/db.json` → `contactMsgs`, but there was
no admin way to read, respond to, or clear those messages (the dashboard
"New contact messages" tile even pointed at the wrong tab). This adds:
- `GET /api/contact` · `PUT /api/contact/:id` · `DELETE /api/contact/:id`
  (all admin-gated via `need_admin`) in `api.php`
- a **Messages** tab in the admin SPA: newest-first list, unread highlighting,
  mark read/unread, Reply on WhatsApp (pre-filled), Reply by email, internal
  note per message, and delete
- the dashboard tile now links to `?tab=messages`

> After this update the `data/db.json` on your host needs **no migration** —
> `api.php` auto-creates the `contactMsgs` array if it's missing. Your live
> orders, users, rates and uploads are untouched (this zip never contains
> `data/` or `uploads/`).

---

## A. UPDATE an existing site (the normal case — you are here)

Zip: **`deploy/shivaa-update-v53.zip`** (144 files, ~20 MB incl. product /
banner / review imagery; md5 `2d66e01d5587bc104717ac1d0c5a29c4`)

1. hPanel → Files → File Manager → **`public_html`**
2. Upload **`shivaa-update-v53.zip`** → right-click → **Extract**
   (overwrites matching code files; adds the new ones — the file layout sits
   at the zip root, so it overlays straight into `public_html`).
3. Hard-refresh (**Ctrl+Shift+R**) — verify the asset refs now read
   **`?v=53` ×7** (there are exactly 7 in `index.html`).
4. Optional: LiteSpeed Cache → **Purge All**.
5. **Never contains** `data/` and `uploads/` — so `data/db.json` (your
   orders, users, products, rates) and your uploaded catalogue PDFs / videos
   are **physically untouched**. **Zero data risk.**

> If you're coming from a version older than the OTP/notifications zips and
> never ran it, run `migrate-repair.php` once after extraction (it asks for
> the admin password) so the DB schema upgrades to the current shape.

### Verify v53 on the live site
- Homepage renders (posters + carousel + bestsellers) and asset refs read `?v=53`.
- Log in as admin → the **Messages** item appears in the admin nav with an
  unread-count badge; dashboard shows **New contact messages**.
- Submit the storefront contact form once → the message appears in the inbox;
  mark read/unread, reply (WhatsApp/email), save a note, delete.

---

## B. FRESH INSTALL (new host / test domain)

Upload **`shivaa-update-v53.zip`** to `public_html` → Extract → **move the
contents of the zip one level up** so `index.html`, `api.php`, `.htaccess`,
`css/`, `js/`, `images/`, `data/`, `uploads/` sit directly in `public_html/`.

1. Ensure `public_html/data/` + `uploads/` are writable (usually already are).
2. Open the site → admin login: `admin@shivaa.in` (see the handoff doc — then
   **rotate the password**).
3. Verify: homepage renders · `?v=53` ×7 · login works · admin → **Messages**
   tab loads (seeded example messages show in the demo DB).

> For a true fresh install you'll want a **complete seed DB**. This update zip
> ships no `data/` (by design). Start from the host's existing `data/db.json`,
> or restore your real DB, or use a demo `data/` bundle from a full install.

---

## Notes

- PHP 8.1+ required (tested 8.4); `json`, `curl`, `mbstring`, `finfo` are
  needed by `api.php` — all default on Hostinger.
- Hostinger PHP limits (64 MB) are fine — the upload cap is 25 MB/file and the
  zip extracts to ~20 MB.
- If you ever change `js/app.js`, `js/admin.js`, or `css/styles.css`, bump the
  `?v=53 → ?v=54` refs in `index.html` too (7 places) — otherwise browsers keep
  the cached old files.
- `preview-server.js` and `samples-payload.json` are **dev/demo only** and are
  intentionally **not** in the update zip (the Node shim is for the sandbox
  preview, not the PHP host).
