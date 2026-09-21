# DEPLOY — v164 · The 6 Ear Studs (Curated Studs) — Final Store Release

**Zip:** `shivaa-update-v164.zip`
- **MD5:** `4f2ad47feed2b5ec17b0470e973cea26`
- **SHA256:** `0292b80f3f0508a58c349eb2d2ee3b64dc5e6aca5766b66414096db4aa8c804d`
- **Size:** ~3.5 MB · **31 files · Direct Root Layout**
- **31 files:** `api.php`, `index.html`, `sw.js`, `css/finale.css`, `js/app.js`,
  `images/banners/gender-gents-gold.jpg`, `images/banners/gender-ladies-gold.jpg`,
  `images/products/studs/{mst01,mst02,mst03,lst01,lst02,lst03}-{studio,macro,worn,gift}.jpg` (24 photos)

→ Unzip directly into your website's root folder (`public_html/`) — **overwrite all files**.
*(Never touches `data/db.json` or `.htaccess` — your orders, customers and settings stay safe.)*

---

## What this zip does for the 6 studs

The 6 studs you made (the Gold Biscuit scheme ear studs) are:

| | Name | Weight | SKU |
|---|---|---|---|
| Men's | Shivaa Veer Square Stud | 3.00 g | SHV-MST-01 |
| Men's | Shivaa Rudra Cushion Stud | 3.00 g | SHV-MST-02 |
| Men's | Shivaa Bali Huggy Hoop | 3.00 g | SHV-MST-03 |
| Ladies' | Shivaa Heer Paisley-Heart Tops | 3.255 g | SHV-LST-01 |
| Ladies' | Shivaa Morni Swirl Drop Tops | 2.928 g | SHV-LST-02 |
| Ladies' | Shivaa Sitara Star Round Tops | 3.086 g | SHV-LST-03 |

All 22K gold, 15% making charge, price = live Shivaa 22K rate × weight + 15% making + 3% GST.

The zip fixes exactly what you reported:
1. **Clicking a stud no longer crashes** ("Something slipped") — the product page now
   opens every stud like any other product.
2. **All 4 photos per stud** show (studio, macro, worn, gift-box) — on the card and on
   the product page. Previously only 1 photo was served to shoppers.
3. **Cashfree one-click checkout works on the studs** (boundary order + charge session
   proven server-side) — Buy Now opens Cashfree straight away.
4. The studs also appear in **Earrings** in the normal shop, not only in the scheme page.

---

## Steps to put it on the website (2 minutes)

1. **Backup first (recommended):** in Hostinger hPanel → **Files → File Manager**, right-click `public_html` → **Archive** and download a copy. (Optional but smart.)
2. In File Manager, go into **`public_html/`**.
3. Click **Upload** → choose `shivaa-update-v164.zip` → wait for it to finish.
4. Right-click `shivaa-update-v164.zip` → **Extract**. When asked, choose to **overwrite / replace existing files**.
5. That's it. **Do not extract it into a new sub-folder** — choose to extract *here*, directly inside `public_html/`.

---

## How to check it worked (on your phone, 2 minutes)

1. Open a fresh incognito/private window (important — so the old version isn't cached).
2. Go to `https://shivaa.in/#/scheme` → pick a gender → tap a stud card.
3. You should now see:
   - The stud's own page with **4 thumbnails** (tap to switch studio / macro / worn / gift).
   - **No** "Something slipped" error.
4. Tap **⚡ Buy Now** → the Cashfree page opens automatically.
5. Open `https://shivaa.in/api/version` — it should read **`"rel":164`**.

> Final proof on the site: view-source the homepage and look for
> `window.__SHIVAA_REL=164` and `/js/app.js?v=164`.

---

## Notes (read me)

- **Why this is v164 and not v163:** your live site is currently v163, where the studs
  show but with a single photo and a crash when clicked. v164 (already merged to `main`,
  PR #82) makes the studs full store products. This zip is the easy manual way to put
  exactly that code on the site — the same 31 files.
- **The zip is safe on top of any version** — it only overwrites the 5 code files + banner
  images + 24 stud photos. It never touches `data/db.json` (all 77 rings, orders, customers,
  settings are untouched) and never touches `.htaccess`.
- If you prefer, the same code also deploys automatically from `main` via the Hostinger
  Deploy Action — but the zip is the guaranteed fast path.
