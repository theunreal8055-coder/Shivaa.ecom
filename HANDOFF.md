# SHIVAA JEWELLERY — HANDOFF DOCUMENT

**Last updated: 2026-09-07**
**Current version: v42**
**Repository: theunreal8055-coder/Shivaa.ecom**
**This file is on GitHub and persists across all sessions and branches**

---

## 🚨 READ THIS FIRST (For Any New Agent / New Chat)

This is a **live jewellery e-commerce website** for Shivaa Jewellery (Jaipur, India). The owner has worked across multiple Arena AI sessions and previously lost progress when agents made mistakes. **Follow these rules strictly.**

### STRICT RULES — NEVER BREAK THESE:
1. **DO NOT delete any existing products, data, features, or files** unless the owner explicitly asks you to
2. **Read `cms/data/db.json` BEFORE making any changes** — understand what exists
3. **Back up before major changes** — `git add -A && git commit -m "backup before [change]"`
4. **After changes, verify nothing was lost** — check product counts, check images exist
5. **When adding new data, verify it actually gets added** — don't assume, count and confirm
6. **Ask the owner before removing anything** — even if it seems unused
7. **Update this HANDOFF.md after every significant change** — this is how future sessions know what happened
8. **Only move FORWARD** — never undo working features to "clean up"

### WHAT "FORWARD ONLY" MEANS:
- Before making changes: note the current state (product counts, features working)
- After making changes: verify the same or better state (same counts + new additions)
- If something breaks during your work: FIX IT before telling the owner you're done
- Never say "I fixed X but broke Y" — that is not acceptable

---

## ✅ CURRENT WORKING STATE (v42 — MERGED TO MAIN)

### Products (405 total in db.json)
| Category | Count |
|----------|-------|
| Rings | 85 (65 PGS + 20 original) |
| Necklaces | 20 |
| Earrings | 20 |
| Bangles | 20 |
| Bracelets | 20 |
| Pendants | 20 |
| Mangalsutra | 20 |
| Nosepins | 20 |
| Silver | 20 |
| Bajubandh | 20 |
| Rakhdi | 20 |
| Aad | 20 |
| Sheeshphool | 20 |
| Hathphool | 20 |
| Punach | 20 |
| Bridal Anklets | 20 |
| Chains | 20 |

### PGS Ring Designs (PGS5001–PGS5065) — ALL LIVE
- **65 designs total** — all imported and visible on website
- **39 with full AI photoshoot** (studio + editorial + worn + gift images + video)
- **26 with reference design images** (studio shot only — photoshoot not yet generated)
- All media in `cms/images/designs/rings/`

### Gold Rates (per gram)
- 24K: ₹15,600
- 22K: ₹14,300
- 18K: ₹11,603
- Silver: ₹239

### Key Files
| File | Lines | Purpose |
|------|-------|---------|
| `cms/index.html` | ~850 | Main SPA shell (cache buster ?v=42) |
| `cms/js/app.js` | ~4294 | All JS logic |
| `cms/css/styles.css` | ~4859 | All styles |
| `cms/data/db.json` | ~24847 | Product database (405 products) |
| `cms/images/designs/rings/` | 286 files | Ring images + videos |
| `HANDOFF.md` | this file | Session handoff document |

### Working Features (All Verified ✅)
- ✅ No flicker on page load (hero pre-rendered in HTML)
- ✅ No unresponsive page after load (lazy init, no forced scroll)
- ✅ Hero banner no longer white (pre-rendered in static HTML)
- ✅ No hero image vibration/jitter
- ✅ No scroll lag on mobile (GPU-only animations, reduced motion)
- ✅ Hallmark popup no longer crashes on mobile (debounced + mobile-safe)
- ✅ Gift Concierge carousel auto-advances on mobile (12s interval)
- ✅ Product gallery auto-advances on mobile (10s interval)
- ✅ Gold rates updated correctly
- ✅ All 65 PGS ring designs visible on website
- ✅ Mobile B2B banner clean (no overlap)

---

## ⛔ DO NOT TOUCH
- `cms/deadstock.html` — owner explicitly said leave it alone
- Existing product data — unless explicitly asked to change
- Carousel/gallery auto-advance — already set to slower mobile pace, don't disable

---

## 🔄 DEPLOYMENT
Owner downloads `shivaa-update-v42.zip` from the repo, uploads to hosting panel, extracts to replace `cms/` folder.

To rebuild the zip:
```bash
cd /home/user/Shivaa.ecom
zip -r shivaa-update-v42.zip cms/
```

---

## 📌 GIT HISTORY & MILESTONES
| Tag/Commit | Description |
|------------|-------------|
| `v42-stable` (tag) | All 65 PGS rings live + all v42 bug fixes |
| `dc2814d` | Added HANDOFF.md |
| `8bd241c` | Restored all 65 PGS ring designs |
| `7e55d19` | Fixed carousel/gallery auto-advance |
| `a5146f1` | Mobile performance lockdown + bug fixes |

---

## 📋 OPEN TODO / NEXT STEPS
- [ ] Generate photoshoots for remaining 26 PGS rings (reference images only)
- [ ] Owner may request new features — ask before assuming

---

## 💡 FOR THE OWNER: HOW TO USE THIS FILE
1. When starting a new chat, just say: **"Read HANDOFF.md first before doing anything"**
2. The new agent will read it and know exactly what's working
3. After significant work, the agent should update this file
4. This file is on GitHub — it's always there, no matter which chat or branch
