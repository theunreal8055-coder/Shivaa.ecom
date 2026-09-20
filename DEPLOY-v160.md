# DEPLOY — v160 (6 Real Tops · 24 Photoshoot Photos · Mobile Mastery · Pay-Fail Auto-Return)

**Zip:** `shivaa-update-v160.zip`
- **MD5:** `5506bd0854bcb176dbdda6f67d13dde6`
- **Size:** 3,497,780 bytes (3.5 MB)
- **31 files (Direct Root Layout):** `api.php`, `index.html`, `sw.js`,
  `css/finale.css`, `js/app.js`, `images/banners/gender-gents-gold.jpg`,
  `images/banners/gender-ladies-gold.jpg`,
  `images/products/studs/{mst01,mst02,mst03,lst01,lst02,lst03}-{studio,macro,worn,gift}.jpg` (24)

→ Unzip directly into your server webroot (`public_html/` or `cms/`), **overwrite all files**.
(Merging the PR to `main` also auto-deploys via the Hostinger Deploy Action — same bytes.)

---

## What is in v160

1. **6 real products replace the 6 AI concept studs** (same page, same funnel):
   - **Gents — 3.00 g each pair, 22K, 15% making:** Veer square stud (SHV-MST-01),
     Rudra cushion stud (SHV-MST-02), Bali huggy hoop (SHV-MST-03).
   - **Ladies — 22K, 15% making:** Heer paisley-heart 3.255 g (SHV-LST-01, tag BT-16101),
     Morni swirl 2.928 g (SHV-LST-02, tag BT-17675), Sitara star 3.086 g (SHV-LST-03, tag BT-18159).
   - Ladies weights taken from the tag in your photos (2.928 / 3.086 / 3.255).
     NOTE: your message said 3.225 for the paisley pair but its tag reads 3.255 —
     the site uses **3.255**; one-line change if you want 3.225.
   - Prices = live 22K × weight + 15% making + 3% GST, everywhere (card, PDP, bag,
     checkout, orders). IDs/SKUs unchanged, so quiz entries and past orders keep working.
2. **24 photoshoot photos (4 per design):** studio packshot, macro detail, worn on
   model, luxury gift-box — all finished square 1000×1000 for razor-sharp cards.
   Each card now has a 4-thumbnail gallery (tap to switch); the product page shows all 4.
3. **Mobile mastery:** sticky stepper docks exactly under the header (was sliding 2px
   underneath it); badges/ribbons can no longer overflow their cards; price and
   meta rows wrap/stack on small phones; countdown label centers; quiz paddings tuned.
4. **Payment fail → back to the 3 designs, guaranteed.** All three fail surfaces now
   return to `#/scheme?step=products&gender=…` (correct gender auto-detected):
   Cashfree popup cancelled/declined, checkout payment abandoned, and Cashfree
   redirect-back `?cf=fail` (banner + “← Back to 3 designs” + 4-second auto-return).
   Success path unchanged → straight to the 1-attempt quiz.
5. **Stamps 160 lockstep** (`__SHIVAA_REL` / `APP_REL` / `shivaa-shell-v160` / api `rel`).

## Owner checks (2 min, on your phone)

1. Open `#/scheme` → stepper never touches the header; no overlapping text anywhere.
2. Gender step shows the 6 real designs (3+3 montages); product cards are sharp.
3. Tap thumbnails — all 4 photos switch; Buy Now → Cashfree; cancel → back to designs.
4. Optional cleanup (non-blocking): delete these 6 orphaned v159 files from the server —
   `images/products/stud-mens-{rudra,veer,surya}.jpg`,
   `images/products/stud-ladies-{mayura,chandrika,tara}.jpg`. Nothing references them.

## Proof

- `tools/mega/smoke/v160-check.js` → **63/63** (specs, 24 photos on disk square ≥800px,
  gallery, fail-redirect strings, mobile CSS pins, stamps) · `node --check` clean.
- Every photo eyeballed against your 6 originals — design-faithful, no text/watermarks.
