# RING PHOTOSHOOT — SESSION STATE
# (This file lives INSIDE the repo so it survives sandbox resets.)

## Mission B (v45, from 13 Sep 2026) — PGS BATCH 2, 48 rings PGS5066–PGS5113
Owner order: every product of PGS.pdf (main) uploaded with title/description/weight/12% MC and
FOUR e-commerce photos each = model (worn) + macro (studio) + detail (editorial) + detail (gift).
- Ledger (page, supplier tag, weight, name): `demo48/work/batch2_ledger.json` (tag numbers repeat —
  they are style codes; weight is the truth, read from the attached tag).
- Refs DONE for all 48 (salmon tag inpainted): `cms/images/designs/rings/{SKU}.jpg`.
- db entries DONE for all 48 (453 products); `photoStatus` flips pending-4shot → complete on wire.
- SHOT + WIRED + STAGED: **PGS5066, PGS5067, PGS5068, PGS5069, PGS5070, PGS5071** ✅ (6/48)
- NEXT: **PGS5072 + PGS5073**, then page order. 2 rings/turn (8 gens, 10-gen cap).
- Per ring: make_refs → VIEW tight ref → write {DESC} → 8 gens → QA sheet → finalize →
  `batch2_db.py wire` → `batch2_stage.py` → update HANDOFF ledger + here → commit + push.
- NO videos for batch 2 (owner order + v44 rule). Deploy = `deploy/batch2_upload_bridge.php`
  (ADD-ONLY) after the branch is merged to main.
### {DESC} notes for batch 2 (verify vs ref_tight before firing)
PGS5066 Veerendra: broad flat band, three horizontal engraved groove lines per shoulder, square white CZ pavé plate (3x3) flush at centre in polished frame ✅
PGS5067 Ranveer: wide angular band, faceted chevron-cut polished shoulders, rotated-square (diamond-oriented) white CZ pavé plate at centre, mill-grain band edges ✅
PGS5068 Sher Singh: wide band, stepped horizontal groove rows (ladder pattern) on shoulders, square white CZ pavé plate (3x3) in plain polished gold frame ✅
PGS5069 Maharana: smooth polished wide tapering shoulders with engraved outline panel, square white CZ pavé plate framed by milgrain beaded-dot gold border ✅ (studio re-rolled once for the beaded border)
PGS5070 Ajmer: wide flat band, long diagonal V-shaped engraved grooves on shoulders, rectangular white CZ pavé plate across the top face in polished rails ✅
PGS5071 Bundi: sunburst fluted fan ridges radiating around small square white CZ pavé plate, three rounded bead bumps per shoulder, angular faceted band edges ✅ (gift re-rolled: first pass printed brand text on box lid)
# NOTE: gift prompts MUST carry the no-text clause ("Plain unbranded jewellery box: no logos,
# no brand names, no letters or monograms anywhere in the image") — 5071 gift proved it.
# NOTE 13 Sep 2026: refs re-ingested with harmonic Jacobi inpaint (ingest_refs48_v4) — the v3
# fill wicked gold up the strap; v4 + fix_wings2 left all 48 refs flap-free.

## Mission
Complete AI photoshoots for the remaining PGS rings. Per ring: 4 AI shots
(studio/editorial/worn/gift) + ken-burns video + db.json wiring (images[], video, mediaNote).
Owner's "31 rings / 93 images" = superset; ground truth on disk = 26 PGS rings.
No PGS5066+ exists.

## DONE (committed on arena/01a07bb3-shivaa-ecom)
- PGS5008 e589236 (original commit lost in reset; re-committed 3f71f58 with 5009-5012)
- PGS5009, PGS5010 — 70ed177 -> re-committed 3f71f58
- PGS5011, PGS5012 — 2f3f0d8 -> re-committed 3f71f58
- PGS5013, PGS5019 — 69c9fc3
- PGS5020, PGS5021 — 3b28cd0 (5021 editorial re-rolled: prop card with garbled text; 'no cards/paper/props/text' clause added to prompt)
- PGS5028, PGS5030 — 87d673d (both first-pass clean; media staged for uploader too)
- PGS5031, PGS5034 — 074f020 (both first-pass clean; media staged)
- PGS5037, PGS5038 — 04d6509 (5037's price tag was WHITE not green — standard green-inpaint missed it; fixed with gold-y percentile crop + median-fill inpaint. Watch for white tags on remaining refs!)
- PGS5039, PGS5040 — c48a8a4 (both first-pass clean; media staged)
- PGS5041, PGS5042 — e9b5aff (both first-pass clean; media staged)
- PGS5048, PGS5052 — aae17f7 (both first-pass clean; media staged)
- PGS5053, PGS5054 — e04a557 (both first-pass clean; media staged)
- PGS5055 Minakari, PGS5056 Rani Padmini — (branch arena/01a07cae-shivaa-ecom, 25 of 26)
  both first-pass clean (no green-tag scan hits); media staged
- PGS5059 Kanchan — (branch arena/01a07cae-shivaa-ecom, 26 of 26) DONE
  worn+gift shots (2nd turn after 10-img cap), film, db, staging — all clean.
ALL 26 v43 rings complete → 65/65 PGS rings now have full photoshoots.

## WORKFLOW PER TURN (2 rings = 8 gens; 10 gen max/turn)
1. Sandbox may reset: pip install --break-system-packages pillow numpy imageio-ffmpeg;
   restore ffmpeg: python3 -c "import imageio_ffmpeg,shutil,os; os.makedirs('/home/user/.local/bin',exist_ok=True); shutil.copy(imageio_ffmpeg.get_ffmpeg_exe(),'/home/user/.local/bin/ffmpeg'); os.chmod('/home/user/.local/bin/ffmpeg',0o755)"
2. Tight refs: python3 tools/photoshoot/make_refs.py SKU1 SKU2   (from repo root)
   -> /home/user/work_shots/refs/{SKU}_ref.jpg + _ref_tight.jpg
3. VIEW the tight refs (read_file) and verify the {DESC} below matches what you SEE.
   IMAGE WINS OVER TEXT — describe what the photo shows (PGS5010 lesson).
4. generate_image x8 -> /home/user/work_shots/gen/{SKU}_shot_{studio,editorial,worn,gift}.jpg
5. QA contact sheet (labelled strip, read_file) — re-roll off-design shots (1-2 gens budget)
6. finalize x8 -> work_shots/fin/ -> cp into cms/images/designs/rings/
7. python3 tools/photoshoot/video.py SKU  (x2)  — needs ffmpeg at /home/user/.local/bin
8. python3 tools/photoshoot/db_update.py SKU1 SKU2
9. git add -A && git commit (repo root) — COMMIT EVERY TURN (sandbox may reset!)

## TOOLS (in repo: tools/photoshoot/)
- make_refs.py SKU...      clean tag-free reference crops (standard + tight)
- finalize.py IN OUT       896x1195 centre-crop + Shivaa INC. badge (house geometry)
- video.py SKU             10s 720x720 25fps ken-burns + crossfades (house spec)
- db_update.py SKU...      db.json images/video/mediaNote (byte-faithful round-trip)
- badge.png + GreatVibes.ttf (badge rebuilt via make_badge snippet in session log if lost)

## PROMPTS (fill {DESC}; all four styles per SKU)
studio: "High-end jewellery e-commerce studio macro photograph of THIS EXACT gold ring
from the reference photo — identical design, do not add or remove anything: men's 22K
yellow gold ring, {DESC}. The ring stands upright facing the camera, perfectly centred,
on a seamless near-black dark charcoal backdrop, professional softbox lighting with gentle
golden specular highlights, razor-sharp focus, photorealistic luxury product photography,
8k detail."
editorial: same head + "...lies at a three-quarter angle on dark textured charcoal slate
stone, single warm rim light sculpting the gold and making the pavé glitter, deep shadows,
moody high-contrast luxury campaign style, photorealistic macro, hyper-detailed, 8k."
worn: "Vertical portrait-orientation editorial jewellery photograph, close-up of the back
of a man's elegant hand wearing THIS EXACT gold ring from the reference photo — identical
design: ... The hand fills much of the frame, fingers relaxed, the gold ring prominent at
the centre on the ring finger, pavé stones catching warm window light. Rich maroon-and-gold
silk brocade Indian sherwani sleeve at the wrist softly blurred, 85mm lens, shallow depth
of field, luxury jewellery editorial photography, photorealistic, 8k. Tall vertical
composition."
gift: "Luxury gifting e-commerce photograph of THIS EXACT gold ring from the reference
photo — identical design, do not simplify it: ... The ring rests upright on the grey silk
cushion of an open premium dark rosewood jewellery box, on dark polished wood, deep red
rose petals scattered around, warm glowing candle bokeh lights in the background, festive
romantic luxury atmosphere, photorealistic, rich but tasteful, 8k."

## {DESC} FOR REMAINING RINGS (verify vs ref_tight before firing)
PGS5020 Panna: stepped flat polished shoulders, small rectangular CZ pavé plaque set low at centre in a gold frame
PGS5021 Manik: oval polished gold X-cross/knot design holding a small round CZ pavé cluster at centre
PGS5028 Banas: vertical rectangular CZ pavé panel in plain polished gold frame, sturdy flat band
PGS5030 Thar: two horizontal CZ pavé bars on wide stepped head with ribbed sides
PGS5031 Shekhawati: large square CZ pavé centre plate framed by polished gold border, CZ accent channels down shoulders
PGS5034 Udaipur: angular X-bowtie polished shoulders meeting a square CZ pavé centre plaque
PGS5037 Kumbhal: rectangular CZ pavé tablet at centre of broad high-polish band, square-notched shoulders
PGS5038 Ranakpur: chevron/arrow layered polished gold head above a triangular CZ pavé triangle at centre
PGS5039 Dilwara: wide ribbed/reeled band with large square CZ pavé tablet with gold border
PGS5040 Nahargarh: minimal broad polished band, small square CZ pavé square set at an angle
PGS5041 Baori: wide square CZ pavé tablet with gold frames, stepped ladder-pattern shoulders with CZ accent rows
PGS5042 Sindoor: polished diagonal band crossing an oval gold frame holding a round CZ pavé cluster (field-hockey shape)
PGS5048 Kesar: tall vertical rectangular CZ pavé panel flanked by polished gold bars, lattice basket-weave band sides
PGS5052 Kundan: long vertical CZ pavé slab framed in gold, lattice basket-weave band sides, chunky square shoulders
PGS5053 Jadau: central rectangular CZ pavé block flanked by rows of vertical CZ bars in gold rails
PGS5054 Thewa: large square gold frame head with inner CZ pavé border and polished gold rotated-square centrepiece, lattice band
PGS5055 Minakari: wide rectangular CZ pavé plaque on bright polished band, small CZ accent blocks on shoulders  ✅ done
PGS5056 Rani Padmini: hexagonal openwork ring, hexagon outline fully set with CZ pavé, polished gold Y-monogram medallion at centre  ✅ done
PGS5059 Kanchan: wide rectangular CZ pavé tablet at centre, fluted/laddered gold rail shoulders  ✅ done

## AFTER ALL 26 DONE  ✅ (completed 7 Sep 2026, branch arena/01a07cae-shivaa-ecom)
1. ✅ Verify: all 65 PGS have 4 shots + video on disk AND in db — verified 65/65 + 65/65 + 26/26 staged
2. ✅ Update HANDOFF.md to v43 (65/65 full photoshoots)
3. (open) zip shivaa-update-v43.zip cms/ if owner wants manual Path A deploy
4. ✅ push — branch arena/01a07cae-shivaa-ecom; PR → main pending

## LIMITS
- generate_image: max 10/turn. QA with labelled contact sheet BEFORE finalizing.
- COMMMIT EVERY TURN — sandbox resets can wipe uncommitted work (learned the hard way;
  no work was lost in the reset only because files were re-verifiable and re-committed).
- Never touch cms/deadstock.html; never delete products; db round-trip must stay byte-faithful.
