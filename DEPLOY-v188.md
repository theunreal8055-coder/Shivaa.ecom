# SHIVAA — Release v188 (`shivaa-update-v188.zip`)

**Release:** `188` · **Built:** 2026-10-02 · **Branch:** `arena/01a0fd67-shivaa-ecom`  
**Base lineage:** Built directly on top of **`v187`** (`7d81ae11b6ffc12e12158fa4bb216aaf45e06da2`, which includes `v183` responsive banners, `v184` Cashfree settlement reconciliation, `v185`/`v186` prefetch + optimistic wishlist + 16px mobile inputs, and `v187` private KYC storage & authenticated admin stream).  
**Package:** `shivaa-update-v188.zip` (`488,040` bytes · SHA-256 `77f11f803eee94cdbceaa438d4758c80a29bd74378ff1084b00e5132610beb6f`)

---

## 1. Files Inside `shivaa-update-v188.zip` (7 files — flat `public_html/` layout)

| Path in ZIP | Size | What Changed in v188 (plus carried v187 KYC hardening) |
|---|---|---|
| `api.php` | 558,047 B | Release `188` + `GET /api/whatsapp/vcard`, `POST /api/whatsapp/subscribe`, `POST /api/b2b/refer-partner`, `GET /api/admin/broadcast-pack` (7 ready-to-send B2C & B2B Hindi/English WhatsApp templates + live Design of the Day + Poll Picks + subscriber & referral rosters) + v187 private KYC storage & stream |
| `js/admin.js` | 355,782 B | New **`📲 WA Broadcast`** tab in `#/admin` (Design of the Day live selector, 7 one-click Copy/Open-WhatsApp broadcast cards, **Unbranded Showroom Counter PDF** printer, **B2B Partner 0.92 PDF** printer, B2C/B2B subscriber & town-referral tables) + Partner Portal (`#/partner`) Town-to-Town Referral card & Counter Mode shortcut + v187 secure KYC blob viewer |
| `js/app.js` | 686,793 B | `APP_REL = 188` + **Showroom Counter Mode** (`👁️ Showroom Counter Mode` hides Shivaa contact & 0.92 wholesale terms) + **Unbranded Customer PDF** (`🖨️ Unbranded Customer PDF`) on `#/catalogues` + **Daily 10:30 AM WhatsApp Rate & Design Club** + vCard button on `#/rates` + **My Family Gold Locker** on `#/account` + **Digital Shagun Privilege Card** on `#/refer` + **B2B Growth Desk** on `#/b2b` |
| `index.html` | 31,529 B | `window.__SHIVAA_REL=188` + all 60 asset URLs bumped to `?v=188` |
| `sw.js` | 13,119 B | `SHELL = 'shivaa-shell-v188'`, `REL = 188`, all 53 precache URLs bumped to `?v=188` (`MEDIA = 'shivaa-media-v168'` preserved) |
| `uploads/kyc/.htaccess` | 935 B | v187 blanket web denial for direct `/uploads/kyc/` requests (authenticated admin stream serves KYC cards instead) |
| `upgrade-sql.php` | 32,849 B | Idempotent Phase 1–4 MySQL schema & data verifier |

**Excluded by law:** `config.php`, `data/*`, customer/KYC uploaded files, `relay/*`, `.htaccess` root, `billing/*`.

---

## 2. Deployment Steps (Hostinger `public_html/`)

1. Upload `shivaa-update-v188.zip` to Hostinger `public_html/` and **Extract** (overwrite the 7 code files).
2. Verify release lockstep:
   - Open `https://shivaa.in/api/version` → confirm `"rel": 188`, `"shell": "shivaa-shell-v188"`, and `"stamp": {"index": 188, "app": 188, "sw": 188, "matched": true}`.
3. Open `#/admin` → click **`📲 WA Broadcast`** in the sidebar to use the Daily B2C & B2B WhatsApp Broadcast Studio and Dual-PDF Catalogue Generator.
