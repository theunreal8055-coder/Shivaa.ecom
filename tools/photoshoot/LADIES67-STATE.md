# LADIES-67 PHOTOSHOOT — session ledger (owner brief 2026-09-15)

> **Source:** repo-root `67 rings ladies plain hitesh bhai_compressed.pdf`
> (67 pages · 1 photo/page · 987×1754 · no text layer). Each page = one ladies'
> 22K **plain** (no-stone) ring standing on a digital weighing scale, gram weight
> on the orange 7-seg LCD. Supplier lot: "hitesh bhai".
> **Mission (owner, verbatim intent):** run the 4-image prompt set below once per
> raw photo → title/description set → making charges **12%** + **3% GST** → upload.

---

## 0. Ground truth established 2026-09-15 (this session, branch arena/01a0a5c8)

- All 67 page images extracted with PyMuPDF to
  `/home/user/work_shots/ladies67/raw/pNN.png` (**outside git** — house rule).
- Ring cropped off the scale photo per page:
  `python3 tools/photoshoot/ladies67_crop.py` →
  `/home/user/work_shots/ladies67/refs/L67_pNN_ref.jpg` (67/67 verified on the
  labelled contact sheet; pages 09,22,28,30,37,42,67 use `MANUAL_BB` overrides in
  the script — auto-detector grabbed the blurred tray / LCD edge there).
- Weights read visually off each LCD into
  `tools/photoshoot/ladies67-manifest.json` (`weightRead: visual-7seg-lcd`).
  **Re-verify against the raw page before any price-sensitive use.**
  Total lot weight 141.818 g · lightest p54 1.036 g · heaviest p38 4.362 g.
- Manifest also carries: SKU (`PGS5066…PGS5132`, page order — assumption,
  rename-cheap until upload), name + motif per design (verified against the ref
  sheet), the 4 shot paths, `mcScheme percent / mcValue 12`, `gstPct 3`,
  sizes 10/12/14/16, category `rings`, tags `[Ring, gold, ladies, plain]`.
- **GST needs no code change:** `price()` in `cms/js/app.js` (and the server
  mirror in `cms/api.php`) already adds a flat 3% GST to every product
  (`gst = round(subtotal*0.03)`) and the PDP/price-table copy already says
  "incl. 3% GST". MC 12% lands via the product fields `mcScheme:'percent'`,
  `mcValue:12`.
- Nothing else had been started on this lot before today: no products in
  `cms/data/db.json` (still exactly 65 PGS rings), no media, no docs mention it.
  The previous photoshoot line (v43 house style) is complete for all 65 PGS
  rings; the separate **zoom-fix campaign batches 3–7** (25 covers + 17
  editorials on the OLD 65) remain open in `ZOOMFIX-STATE.md` — parked while
  this lot runs, unless the owner says otherwise.

## 1. OWNER'S PROMPT SET (2026-09-15) — use verbatim, one run per raw photo

**Global Lock — prepend to every one of the 4 prompts:**
> Using the attached photo as the exact reference, preserve the ring's design 100%: same band shape and width, same stone cut/count/placement, same engraving or texture pattern, same metal color and finish. Do not redesign, resize, reshape, or add/remove any element of the ring. Only the surrounding scene — background, lighting, camera angle, and styling — may change.

1. **hero** — Photorealistic studio product photography of the ring standing upright on a glossy black or ivory acrylic surface. Soft diffused three-point studio lighting, subtle shadow and reflection beneath the ring, clean white or soft gradient background, centered composition, ultra-sharp focus, 4K commercial jewellery catalog quality.
2. **macro** — Extreme close-up macro photography of the same ring at a 3/4 angle, showing fine detail of the metal finish and any engraving or texture. Shallow depth of field, soft warm gold/maroon bokeh background, dramatic raking light to bring out texture and sparkle. Luxury jewellery macro shot.
3. **model** — Photorealistic close-up of an elegant model's hand wearing the exact ring from the reference photo on the ring finger. Hand gently posed against a soft neutral or blush backdrop, natural skin tone, manicured nails, soft studio lighting, sharp focus on the ring. Standard e-commerce model-shot style.
4. **lifestyle** — Editorial lifestyle photo of the same hand wearing the ring, styled against festive Indian ethnic/bridal fabric visible at the frame's edge (silk saree or lehenga, optional mehndi). Warm golden-hour or festive maroon-and-gold ambient lighting, hand resting near floral décor or a jewellery box. Aspirational bridal-jewellery lifestyle photography — ring proportions and design unchanged from the reference.

**Batching notes (owner):** feed raw photo + Global Lock + scene as ONE call,
4 files per design; naming `<design_id>_{1_hero,2_macro,3_model,4_lifestyle}.jpg`;
keep the SAME model hand / skin tone / backdrop palette across the batch →
shots 3–4 append: *"Batch consistency: light-medium Indian skin tone, soft blush
backdrop, identical hand styling as the rest of this batch."*
**House additions:** input image = the tight ref crop (not the scale photo —
the scale/LCD must never leak into a shot); QA contact sheet before installing;
re-roll off-design shots next turn; **no Shivaa badge on this batch** (owner's
set replaces the v43 finisher); media stays out of git until installed to
`cms/images/designs/rings/`.

## 2. CADENCE + PROGRESS (2 designs = 8 gens per turn; cap 10)

| batch | designs (page → SKU) | shots | QA | db | pushed |
|---|---|---|---|---|---|
| B1 | p01→PGS5066, p02→PGS5067 | ⬜ |  | ⬜ | ⬜ |
| B2 | p03→5068, p04→5069 | ⬜ | ⬜ | ⬜ | ⬜ |
| B3 | p05→5070, p06→5071 | ⬜ | ⬜ | ⬜ |  |
| B4 | p07→5072, p08→5073 | ⬜ | ⬜ |  |  |
| B5 | p09→5074, p10→5075 | ⬜ | ⬜ |  |  |
| B6 | p11→5076, p12→5077 | ⬜ | ⬜ |  |  |
| B7 | p13→5078, p14→5079 | ⬜ | ⬜ |  |  |
| B8 | p15→5080, p16→5081 | ⬜ | ⬜ |  |  |
| B9 | p17→5082, p18→5083 | ⬜ | ⬜ |  |  |
| B10 | p19→5084, p20→5085 | ⬜ | ⬜ |  |  |
| B11 | p21→5086, p22→5087 | ⬜ | ⬜ |  |  |
| B12 | p23→5088, p24→5089 | ⬜ |  |  | ⬜ |
| B13 | p25→5090, p26→5091 | ⬜ | ⬜ |  |  |
| B14 | p27→5092, p28→5093 | ⬜ | ⬜ |  |  |
| B15 | p29→5094, p30→5095 | ⬜ | ⬜ |  |  |
| B16 | p31→5096, p32→5097 | ⬜ | ⬜ |  |  |
| B17 | p33→5098, p34→5099 | ⬜ | ⬜ |  |  |
| B18 | p35→5100, p36→5101 | ⬜ | ⬜ |  |  |
| B19 | p37→5102, p38→5103 | ⬜ | ⬜ |  |  |
| B20 | p39→5104, p40→5105 | ⬜ |  |  | ⬜ |
| B21 | p41→5106, p42→5107 | ⬜ |  |  | ⬜ |
| B22 | p43→5108, p44→5109 | ⬜ |  |  | ⬜ |
| B23 | p45→5110, p46→5111 | ⬜ | ⬜ |  |  |
| B24 | p47→5112, p48→5113 | ⬜ | ⬜ |  |  |
| B25 | p49→5114, p50→5115 | ⬜ | ⬜ |  |  |
| B26 | p51→5116, p52→5117 | ⬜ | ⬜ |  |  |
| B27 | p53→5118, p54→5119 | ⬜ |  |  | ⬜ |
| B28 | p55→5120, p56→5121 | ⬜ | ⬜ |  |  |
| B29 | p57→5122, p58→5123 | ⬜ | ⬜ | ⬜ |  |
| B30 | p59→5124, p60→5125 | ⬜ | ⬜ |  |  |
| B31 | p61→5126, p62→5127 | ⬜ | ⬜ |  | ⬜ |
| B32 | p63→5128, p64→5129 | ⬜ | ⬜ |  | ⬜ |
| B33 | p65→5130, p66→5131 | ⬜ |  |  | ⬜ |
| B34 | p67→5132 (+ re-rolls) | ⬜ | ⬜ |  |  |

Per turn: generate 8 → QA labelled contact sheet (read_file) → install the PASS
shots to `cms/images/designs/rings/<SKU>_{1..4}_*.jpg` →
`python3 tools/photoshoot/ladies67_db.py PGSxxxx PGSyyyy` (upserts the two
product records, byte-faithful db round-trip) → update this table → commit+push.

## 3. UPLOAD / GO-LIVE PLAN (after B34, or earlier in tranches if owner prefers)

1. `ladies67_db.py --verify` → 132 products (65 old + 67 new), every new record
   has 4 existing image paths, weight > 0, mc 12%, sizes, seo, desc mentioning
   "making charges 12% + 3% GST".
2. Smoke gates: `node tools/mega/smoke/v113b-check.js` + `v117/v118/v119-check.js`
   (db grew → shop slicing must still pass) + php-sweep.
3. PR `arena/01a0a5c8-shivaa-ecom` → `main`; the merge fires **Catalogue Deploy**
   (marker `deploy/GO-LIVE-v111.txt` already `GO`) which pushes db + photos live;
   verify `https://shivaa.in/api/products` shows 132 PGS products, 4 shots each.
4. Update ARENA-STATE.md §1 + HANDOFF.md in the same PR (house rule 3).
5. Optional owner path: zip the new images + db as `shivaa-update-v120.zip`
   (root layout) for a manual Hostinger upload.

## 4. OPEN ASSUMPTIONS (flagged to owner 2026-09-15, proceed-unless-told rules)

- **SKU range PGS5066–5132** under the existing `rings` category (keeps the
  contiguous-SKU check green). A separate "Ladies Rings" tile can be added later
  without touching photos (display-only filter).
- Sizes 10/12/14/16 (ladies stock sizes); stock 10 per design; wastage 8% and
  `lessWeightG 0` mirror the existing 65 records (price() ignores both).
- Weights are visual reads of the LCD — owner to sanity-check the manifest
  against the scale sheet before go-live (one-line edit each if wrong).
