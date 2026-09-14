# Full-Catalogue Sync Bridge — tablet runbook (v110)

**Why:** the master catalogue (`cms/data/db.json` on GitHub `main`, **405 products**)
is code, and the auto-sync cron is deliberately forbidden from touching the live
server's own `data/db.json` (that lock protects live orders). This one-file bridge
performs the ONE-TIME delivery of all 405 products (and any missing photos) into
the live shop, from a tablet, with no terminal.

- File: **`deploy/catalogue_sync_bridge.php`**
- It never deletes products. Products already live that are not in the master are
  left untouched. Adds/updates are matched by SKU, so re-tapping never duplicates.
- It talks only to `shivaa.in` (the shop's own API) and GitHub (`raw.githubusercontent.com`,
  `api.github.com`) — the same proven pattern as the v44 ring-reset bridge.

## Steps (~10 minutes, hPanel in the tablet browser)

1. hPanel → **File Manager** → open **`public_html`**.
2. Create a folder with a **secret random name**, e.g. `cat-9q4zx` (pick your own).
3. Open that folder and **upload `catalogue_sync_bridge.php`** (download it from the
   repo's `deploy/` folder, or from the merged PR on GitHub `main`).
4. Open `https://shivaa.in/<your-folder>/catalogue_sync_bridge.php`.
5. Log in with admin@shivaa.in + the admin password.
6. Tap the buttons top to bottom:
   - **Step 1 — Download & show plan:** reports how many products will be added vs
     refreshed, how many live extras are kept, and the photo situation.
   - **Step 2 — Send next 30 products:** tap repeatedly (~14 taps). The bar fills
     `0/405 → 405/405`. A failed tap just retries; it resumes from the ledger.
   - **Step 3 — Fetch next 25 photos:** only if Verify/Step 1 reported missing photos
     (the normal code auto-sync usually already delivered all 334 image files).
   - **Step 4 — Verify:** category-by-category table; you want
     **"PERFECT — all 405 products with photos are live"**.
   - **Step 5 — SELF-DESTRUCT.**
7. Back in File Manager: **delete the secret folder**, then **rotate the admin
   password** (hPanel → CMS admin).
8. Hard-refresh the shop (pull-to-refresh / clear site data once) and browse
   categories — the shop should now show the full catalogue.

## Safety notes

- If anything looks wrong mid-way, just stop — nothing is deleted at any point;
  re-uploading/refreshing is always safe (upsert by SKU).
- The bridge writes products via the same admin API the CMS admin panel uses, so
  prices/weights/hallmark rules are validated exactly as normal.
- After the one-time sync, future product *edits made in the CMS admin* stay live;
  future GitHub catalogue changes would need this bridge re-run (it refreshes by SKU).
