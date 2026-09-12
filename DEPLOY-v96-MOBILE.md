# DEPLOY v96 — MOBILE MASTERPIECE (butter-smooth, hi-fi phone experience)

**Update zip:** `shivaa-update-v96.zip` (784 KB, 48 files) — full cms as v95 but with v96 mobile layer.
**Tiny patch (alternative):** `shivaa-update-v96-MOBILE-PATCH.zip` (20 KB, 2 files) — only the two files that changed.

Both are on branch `arena/01a097fa-shivaa-ecom` (commit `222984c`). Pick ONE path.

---

## What changed
* `cms/css/mobile.css` — complete rewrite v95 → v96 (575→1096 lines, 29→56 KB): every interface re-flowed for phone without deleting any feature. Header solid (no blur flicker), 58→56px, drawer as fixed sheet with scrim+swipe, hero centred 32-44px clamp, 2-up product cards 10px gap, filters as bottom-sheet, sticky buy/cart bars above 58+safe nav, 16px no-zoom inputs, 42-52px thumb targets, hover killed + crisp press, dvh/svh+safe-area, 60fps.
* `cms/index.html` — bump `mobile.css?v=95` → `v=96` (cache-bust).
* `cms/js/app.js` — version bump `v95` → `v96` query (no logic change, cache-bust).

Nothing else touched. No supplier/BIS/GST data fabricated.

---

## PATH A — Full update (recommended, same as v95 deploys) · 2 minutes

1. Download `shivaa-update-v96.zip` from this branch.
2. hPanel → File Manager → `public_html` → Upload the zip → Right-click → **Extract** → Overwrite when asked. It only overwrites the 48 files; it never deletes orders in `data/db.json` (that file is **not** in the zip).
3. Hard-refresh: `Ctrl+Shift+R` (or clear cache). Spot-check on a **real phone** (or DevTools device toolbar: iPhone 14 + Pixel 7):
   - Home hero centred, CTA 100% wide, stage 280px, no horizontal scroll
   - Shop → Filters → bottom sheet (grab handle), 2-up cards 13.8px name
   - Product → sticky buy bar above bottom nav, thumbs scroll
   - Cart/Checkout → sticky 48px bar above nav, 16px fields (no zoom)
   - Account → 2-up tiles, Admin → swipeable tables, horizontal nav
   - Bottom nav 58+safe, footer bleed, no cut-off on SE (380px)
4. Done. No DB migration needed.

## PATH B — Tiny patch (20 KB, fastest) · 1 minute

If you already deployed v95 (or any v80+), you only need the 2 changed files:

1. Download `shivaa-update-v96-MOBILE-PATCH.zip`.
2. Upload to `public_html` → Extract → Overwrite.
   - This only touches `css/mobile.css` and `index.html`.
3. Hard-refresh and spot-check as above.

## PATH C — Git pull (if you have SSH)

```bash
cd ~/public_html   # or wherever the cms is checked out
git fetch origin
git checkout arena/01a097fa-shivaa-ecom
git pull origin arena/01a097fa-shivaa-ecom
```

Then hard-refresh.

---

## Rollback

Re-upload `shivaa-update-v95.zip` and extract — it restores `mobile.css v95` + `index.html v95`.

## Verify

```bash
curl -s https://shivaa.in/css/mobile.css | head -n 1
# → should show: SHIVAA — v96 · MOBILE MASTERPIECE
curl -s https://shivaa.in/ | grep mobile.css
# → should show: mobile.css?v=96
```
