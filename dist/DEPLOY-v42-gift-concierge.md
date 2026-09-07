# DEPLOY v42 — Gift Concierge (home page)

**Package:** `shivaa-update-v42-gift-concierge.zip` (3 files, ~94 KB)
**Contains ONLY:**
- `index.html` — cache-bust `?v=41 → ?v=42`, new `<link>` for `gift-concierge.css`
- `js/app.js` — v42 with `initGiftConcierge()` + the new Gift Concierge section in `pages.home` (between pillars and newsletter)
- `css/gift-concierge.css` — **new file**, standalone concierge stylesheet

**Does NOT contain:** `data/db.json`, `uploads/`, `sms.php`, `api.php`, `.htaccess`, images, admin — zero data risk. Safe to deploy over any v37+ install.

---

## Hostinger hPanel (3 minutes — recommended)

1. *(Optional)* hPanel → Files → Backup → one-click files+DB backup.
2. hPanel → **Files → File Manager** → open `public_html/`.
3. **Upload** `shivaa-update-v42-gift-concierge.zip` → right-click → **Extract** → **Overwrite existing files**.
4. Delete the zip from `public_html/`.
5. **Purge cache:** LiteSpeed Cache → Purge All (+ Cloudflare purge if used).
6. **Hard-refresh** the home page (Ctrl+Shift+R / Cmd+Shift+R).
7. **Verify:** view-source shows `?v=42` on CSS/JS links; scroll past the four trust pillars to see **"Find the perfect piece"** just above the newsletter; click through the 4 questions → "Show my picks" → the WhatsApp button opens `wa.me/918905005921` with your pre-filled brief.

## FileZilla / SFTP
Unzip locally → upload `index.html` to `public_html/`, `app.js` to `public_html/js/`, `gift-concierge.css` to `public_html/css/`. Overwrite when prompted → purge cache → hard-refresh.

## SSH
```bash
cd ~/public_html
unzip -o shivaa-update-v42-gift-concierge.zip && rm shivaa-update-v42-gift-concierge.zip
```

## Rollback
Re-upload v41 `index.html` and `js/app.js`, delete `css/gift-concierge.css`. No DB changes made, so nothing to roll back in MySQL.

## GitHub
PR: https://github.com/theunreal8055-coder/Shivaa.ecom/pull/11
Branch: `arena/01a079be-shivaa-ecom`
