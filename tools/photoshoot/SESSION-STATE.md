# RING PHOTOSHOOT — SESSION STATE
# (This file lives INSIDE the repo so it survives sandbox resets.)

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
Remaining 17: PGS5028 5030 5031 5034 5037 5038 5039 5040 5041 5042 5048 5052 5053 5054 5055 5056 5059

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
PGS5055 Minakari: wide rectangular CZ pavé plaque on bright polished band, small CZ accent blocks on shoulders
PGS5056 Rani Padmini: hexagonal openwork ring, hexagon outline fully set with CZ pavé, polished gold Y-monogram medallion at centre
PGS5059 Kanchan: wide rectangular CZ pavé tablet at centre, fluted/laddered gold rail shoulders

## AFTER ALL 26 DONE
1. Verify: all 65 PGS have 4 shots + video on disk AND in db (write a verify script)
2. Update HANDOFF.md to v43 (65/65 full photoshoots; remove TODO; add feature note)
3. cd /home/user/Shivaa.ecom && zip -r shivaa-update-v43.zip cms/ ; commit
4. git push origin arena/01a07bb3-shivaa-ecom

## LIMITS
- generate_image: max 10/turn. QA with labelled contact sheet BEFORE finalizing.
- COMMMIT EVERY TURN — sandbox resets can wipe uncommitted work (learned the hard way;
  no work was lost in the reset only because files were re-verifiable and re-committed).
- Never touch cms/deadstock.html; never delete products; db round-trip must stay byte-faithful.
