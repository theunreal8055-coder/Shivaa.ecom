# Shivaa — the 65-ring upload file (v47)

**File to upload:** `shivaa-upload-65-rings.zip` (6.5 KB) — it contains exactly **one** file, `ring_reset_bridge.php`.
You do **not** need the terminal, SSH, or git. cPanel File Manager is enough.

---

## What this file does

It is a **setup page for your website**. You open it once in a browser and tap buttons:

1. **Preview** — shows what is live right now (changes nothing).
2. **Delete** — removes the old ring products (85 in the current snapshot; it deletes *whatever* is in the rings category today). A copy of what was removed is saved as `deleted_rings.json`.
3. **Publish** — puts back the **65 PGS designs (PGS5001 – PGS5065)**, each with its **4 new photos** — studio (creamy-white face cover) first, then editorial, worn, gift — and **no video**.
4. **Verify** — counts the live rings and tells you if it is exactly 65 with 4 images each and 0 videos.
5. **Self-destruct** — deletes the setup file from your server so nobody can use it again.

Tapping **Publish** repeatedly is safe: it publishes 4 designs per tap (~17 taps, about 2 minutes), remembers what it already did, and **never creates duplicates**. If your browser or the server stops halfway, tap again and it continues where it left off.

**It only touches the rings category.** Orders, customers, Gold Finale entries, prices and every other category (chains, bangles, etc.) are untouched. Every ring keeps the same weight, purity and making charges your records already show, so **prices stay correct**.

---

## Steps (10 minutes)

### 1. Make a secret folder
In cPanel → **File Manager** → open `public_html` → **+ Folder** → create a folder with a random name, for example:

```
public_html/rst-x7k2q/
```

Do not call it something obvious like `reset` or `update`. This folder is the only thing protecting the setup page.

### 2. Upload the zip into that folder
Enter the folder → **Upload** → choose `shivaa-upload-65-rings.zip` → after upload, right-click it → **Extract** → choose the folder itself as the destination.

You should now see `public_html/rst-x7k2q/ring_reset_bridge.php`. (You can delete the zip after extracting.)

### 3. Put your own key in the file — this is required
Right-click `ring_reset_bridge.php` → **Edit**. Near the top find:

```php
const SETUP_KEY = 'CHANGE-THIS-KEY-123';
```

Change it to your own long random text, e.g. `const SETUP_KEY = 'shv-9Kx72pQm41Ldz-veh8';` — then **Save Changes**.

> The file **refuses to run** while it still says `CHANGE-THIS-KEY-123`. That is deliberate, so no one can open it by guessing the folder name.

While you are in the file you may also see `const DEFAULT_STOCK = 10;` — that is how many pieces each design shows as available. Change the number if you want.

### 4. Open it and log in
In your browser go to:

```
https://shivaa.in/rst-x7k2q/ring_reset_bridge.php
```

Log in with your admin email, the setup key you just set, and your **admin password**. (Password lost? Use the password-recovery update first, or “Forgot password?” on the site's sign-in screen.) Your password is never stored by this file.

### 5. Tap the buttons, top to bottom
- **STEP 1 Preview** — check the numbers, nothing changes.
- **STEP 2 Delete all rings** — confirm the popup. This is the only destructive step; the next step replaces them.
- **STEP 3 Publish next 4 rings** — tap again and again until it says **65/65 — ALL DONE**. Each tap shows ✅ results per design. If any line shows ❌, tap again; only the failed designs are retried.
- **STEP 4 Verify** — you want: **65 rings, 0 without 4 images, 0 showing 0 in stock, 0 with video → PERFECT ✅**
- Open 2–3 ring pages on the site yourself and check the photos look right.
- **STEP 5 Delete this setup file** → then delete the whole `rst-x7k2q` folder in File Manager.

### 6. Finish up
- Keep `deleted_rings.json` somewhere safe if you want the record of the old rings (it lives in the same folder).
- Change your admin password once more afterwards if you like.

---

## Good to know

- **Where the photos come from:** your website pulls them from the project's GitHub folder by itself (`demo65/media/PGS50xx/…`). If your host cannot reach GitHub, the file automatically tries the jsDelivr mirror. If both are blocked, the ☹ message will say `download failed` — tell me and I will build a 65 MB media zip you extract into the same folder, and it will use those local copies instead.
- **Old site badge:** the 65 rings previously showed *"0 left"* because the supplier files carried stock `0`. This setup file corrects that to a real number (`DEFAULT_STOCK`), so the rings show as available instead of sold out.
- **Rings appear under Men's:** each ring keeps the tags from the supplier record plus the `mens` tag, so the existing Men's Section shows them.
- **If something looks wrong,** tap Preview and Verify and tell me the numbers — the old products are listed in `deleted_rings.json`, so nothing is unrecoverable.
- Media on the server: `api.php` sits at `public_html/api.php`, so the uploaded photos land in `public_html/uploads/designs/rings/` — where the site already reads product photos from.

---

## Technical details (for the record)

| Item | Value |
|---|---|
| Deliverable | `shivaa-upload-65-rings.zip` → `ring_reset_bridge.php` (19 KB, single file) |
| Source of truth in repo | `deploy/ring_reset_bridge.php` |
| SKUs | `PGS5001` … `PGS5065` (65), 4 shots each, no video |
| Shots | `shot_studio.jpg`, `shot_editorial.jpg`, `shot_worn.jpg`, `shot_gift.jpg` |
| API calls | `POST /api/auth/login`, `GET /api/products`, `DELETE /api/products/<id>`, `POST /api/media`, `POST /api/products`, `PUT /api/products/<id>` |
| Batch size | `PERTAP = 4` designs per tap |
| Ledger | `reset_ledger.json` in the same folder (deleted on self-destruct) |
| Key gate | `SETUP_KEY` must be personalised **and** an admin login is required |
| Not run yet | The bridge has not been executed anywhere (no PHP/browser in my sandbox). The API endpoints, the media paths on `main`, and the upload contract were verified by reading `cms/api.php` line by line, not by running it. |
