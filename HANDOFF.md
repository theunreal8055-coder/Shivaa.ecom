# SHIVAA JEWELLERY — HANDOFF DOCUMENT

**Last updated: 2026-09-07**
**Current version: v42**
**Branch: arena/01a07b3b-shivaa-ecom**

---

## 🚨 READ THIS FIRST (For Any New Agent)

This is a **live jewellery e-commerce website** for Shivaa Jewellery. The owner has been working across multiple sessions and has lost progress before due to agents making mistakes. Follow these rules:

### STRICT RULES:
1. **DO NOT delete any existing products, data, or features** unless the owner explicitly asks
2. **Read db.json BEFORE making changes** — understand what exists
3. **Back up before major changes** — `git add -A && git commit -m "backup before [change]"`
4. **Test that existing features still work** after your changes
5. **When adding new data, verify it actually gets added** — don't assume
6. **Ask the owner before removing anything** — even if it seems unused
7. **Update this HANDOFF.md after every significant change**

---

## ✅ CURRENT WORKING STATE

### Products (405 total in db.json)
- Rings: 85 (65 PGS designs + 20 original)
- Necklaces: 20 | Earrings: 20 | Bangles: 20 | Bracelets: 20
- Pendants: 20 | Mangalsutra: 20 | Nosepins: 20 | Silver: 20
- Bajubandh: 20 | Rakhdi: 20 | Aad: 20 | Sheeshphool: 20
- Hathphool: 20 | Punach: 20 | Bridal Anklets: 20 | Chains: 20

### PGS Ring Designs (PGS5001–PGS5065)
- All 65 designs imported and live
- 39 have full photoshoot (studio + editorial + worn + gift images + video)
- 26 have reference design images (no photoshoot generated yet)
- All images in `cms/images/designs/rings/`

### Gold Rates
- 24K: ₹15,600/gram
- 22K: ₹14,300/gram  
- 18K: ₹11,603/gram
- Silver: ₹239/gram

### Key Files
| File | Lines | Purpose |
|------|-------|---------|
| `cms/index.html` | ~850 | Main SPA shell |
| `cms/js/app.js` | ~4294 | All JS logic |
| `cms/css/styles.css` | ~4859 | All styles |
| `cms/data/db.json` | ~24847 | Product database |
| `cms/images/designs/rings/` | 286 files | Ring images + videos |

### Working Features (v42 fixes applied)
- ✅ No flicker on page load (hero pre-rendered in HTML)
- ✅ No unresponsive page after load (lazy init, no forced scroll)
- ✅ Hero banner no longer white (pre-rendered in static HTML)
- ✅ No hero image vibration/jitter
- ✅ No scroll lag on mobile (GPU-only animations, reduced motion)
- ✅ Hallmark popup no longer crashes on mobile (debounced + mobile-safe)
- ✅ Gift Concierge carousel auto-advances on mobile (12s, slower pace)
- ✅ Product gallery auto-advances on mobile (10s, slower pace)
- ✅ Gold rates updated (24K/22K/18K/Silver)
- ✅ Deadstock page left UNTOUCHED (do not modify)
- ✅ Mobile B2B banner clean (no overlap)
- ✅ All 65 PGS ring designs visible on website

---

## 📋 TODO / NEXT STEPS
- Generate photoshoots for remaining 26 PGS rings (PGS5023-PGS5065 that only have reference images)
- Owner may want new features — ask before assuming

---

## ⛔ DO NOT TOUCH
- `cms/deadstock.html` — owner explicitly said leave it alone
- Any existing product data unless explicitly asked to change
- Carousel/gallery auto-advance is set to slower mobile pace — don't disable it

---

## 🔄 DEPLOYMENT
The deliverable is `shivaa-update-v42.zip` — owner uploads it to their hosting panel and extracts to replace the `cms/` folder.

To rebuild the zip:
```bash
cd /home/user/Shivaa.ecom
zip -r shivaa-update-v42.zip cms/
```

---

## 📌 GIT MILESTONES
- `v42-stable` — Current stable state with all 65 rings + all bug fixes
- Use `git checkout v42-stable` to restore to this known-good state if anything breaks
