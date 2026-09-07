# DEPLOY v42 — Complete Setup Guide

v42 includes **everything**: Gift Concierge, v41 header improvements, BIS hallmark checker,
Trust pillars, B2B portal, live gold/silver pricing, WhatsApp ordering — all features up to
today's Gift Concierge release.

## 📦 Packages in `dist/`

| File | Size | Use when |
|---|---|---|
| **`shivaa-update-v42.zip`** | **15 MB** | ⭐ **Use this on your LIVE shivaa.in** (safe over any v37+ install) |
| `shivaa-update-v42-gift-concierge.zip` | 94 KB | Minimal concierge-only patch (if you're already on a custom v41) |
| `shivaa-FULL-fresh-install-v42.zip` | 28 MB | Brand-new install on a fresh host/test domain (contains demo db + all images) |

### What's in the v42 UPDATE zip (146 files, 15 MB)
✅ **Code (all v42):** `index.html` (cache-bust `?v=42`), `js/app.js` with Gift Concierge,
`js/admin.js`, `js/auth.js`, `js/hallmark.js`, `js/trust.js`, `js/qr.js`, `js/three-d.js`,
`js/otp-autofill.js`
✅ **Styles:** `css/styles.css`, `css/fonts.css`, `css/hallmark.css`, `css/trust.css`,
**`css/gift-concierge.css`** (new)
✅ **Backend:** `api.php`, `hallmark.php`, `trust.php`, `.htaccess`
✅ **Images:** all product photos, banners, review photos, sample shots, logos, favicon
✅ **Docs:** catalogue PDFs in `uploads/catalogs/`
❌ **EXCLUDED for safety:** `data/db.json` (your live orders/users), `uploads/` (your media),
`sms.php` (your SMS API key), `migrate-repair.php`, `samples-payload.json` (dev-only test data)

**Zero data risk** — extracting this over your live site will not touch customer data,
orders, users, wishlists, or your SMS gateway config.

---

## 🚀 Deploy to shivaa.in (Hostinger hPanel — 5 minutes)

1. **Backup** (recommended): hPanel → Files → Backups → one-click Files + Database backup.
2. hPanel → **Files → File Manager** → open `public_html/`.
3. **Upload** `shivaa-update-v42.zip` → right-click the zip → **Extract** →
   choose **Overwrite existing files** when prompted.
4. Delete the leftover zip (cleanup).
5. **Purge cache:**
   - hPanel → **LiteSpeed Cache → Purge All**
   - If Cloudflare is in front: Cloudflare → Caching → Purge Everything
6. **Hard-refresh** in your browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac).
7. **Verify** the update worked:
   - Right-click → View Page Source → confirm all asset links say `?v=42` (e.g. `app.js?v=42`, `styles.css?v=42`)
   - Scroll the home page: you should see the **"Find the perfect piece"** Gift Concierge
     sitting between the 4 trust pillars and the newsletter signup
   - Click through the 4 quiz questions → **"See my gifts →"** → the WhatsApp button opens
     `wa.me/918905005921` with a pre-filled brief
   - Test the BIS hallmark page (`#/hallmark`), live rates page (`#/rates`), and B2B portal
     (`#/b2b`) — all still working

## 🆕 Fresh install (new host / test domain)

1. Upload `shivaa-FULL-fresh-install-v42.zip` to the web root.
2. Extract → you'll get a `cms/` folder. Move the **contents** of `cms/` **one level up**
   into `public_html/` (so `index.html` sits directly in `public_html/`).
3. Make `public_html/data/` and `public_html/uploads/` writable (chmod 755 or 775; usually
   already fine on Hostinger).
4. Visit the domain. Default admin login: `admin@shivaa.in` — **rotate the password immediately**
   after first login.
5. This ships a demo database with 342 sample products. Replace `data/db.json` with your
   real DB when ready.

## 🔙 Rollback

If anything looks wrong, restore the hPanel backup from step 1, or re-upload your previous
version's files. No database schema changes were made in v42, so there is nothing to roll
back in MySQL — it's a pure code+assets update.

## 🔗 GitHub

- **Branch:** https://github.com/theunreal8055-coder/Shivaa.ecom/tree/arena/01a079be-shivaa-ecom
- **Pull Request #11:** https://github.com/theunreal8055-coder/Shivaa.ecom/pull/11
- **Commit (v42):** see PR for diff

## ✨ What's new since v37

- **v42 Gift Concierge** (NEW): 4-step gift finder on home page with WhatsApp hand-off
- v41 header improvements (logo, nav spacing)
- BIS Hallmark HUID verification page + trust badges
- Live Jaipur gold/silver rate pricing with transparent making charges
- WhatsApp ordering across cart, product pages and compare
- B2B wholesale portal for jewellers
- Photo review UGC wall and animated reviews marquee
- Product compare with shareable shortlinks
- 7-day returns pillar + insured shipping pillar
- OTP login, saved wishlists, order tracking

MD5 checksums:
- `shivaa-update-v42.zip` → `be565d9b489b74d31b9e4489667e2657` (15 MB)
- `shivaa-FULL-fresh-install-v42.zip` → `ee01df07155584b2af6fd13641ef807c` (28 MB)
- `shivaa-update-v42-gift-concierge.zip` → `89b4cc0797855c279a6a967133696223` (94 KB)
