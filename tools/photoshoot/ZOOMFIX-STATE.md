# ZOOM FIX v111 — session ledger (update after EVERY batch)

Owner order (2026-09-14): some ring photos are too zoomed in — the ring is cut
off by the frame so shoppers cannot see the design. Fix ALL of them, then the
live site shows exactly the 65 PGS rings (sample products removed).

## Diagnosis (programmatic, no eyes needed)
`tools/photoshoot/zoom_check.py` isolates saturated-gold pixels (the ring)
against the neutral background and measures margins. Ground truth measured on
2026-09-14: **41 of 65 covers were cropped** (ring span = 100% frame width,
gold touching the left+right edges) + **14 editorials** cropped. Good house
covers measure 40–62% ring width; the QA gate demands margins ≥3% per side and
span ≤88% width.

## Per-SKU fix lists
COVERS (41): PGS5001 5002 5003 5004 5005 5006 5007 5008 5009 5010 5011 5012 5013
5016 5017 5018 5019 5020 5021 5024 5028 5030 5031 5034 5037 5038 5039 5040 5041
5042 5046 5048 5051 5052 5053 5054 5056 5057 5059 5060 5061
EDITORIALS (14): PGS5003 5008 5011 5016 5017 5018 5019 5020 5021 5034 5041 5042
5048 5055

## Progress
- ✅ Batch 1 (2026-09-14, branch arena/01a09f6d-shivaa-ecom): covers PGS5001–5010
  regenerated, finalized (badge), installed to cms + demo65 staging.
  QA: 5001 5002 5003 5004 5006 5007 5008 5009 5010 PASS.
  ⚠️ PGS5005 still too big in frame (span 91%) — RE-ROLL with the "no more than
  60% of image width" prompt variant (see below).
- ⬜ Batch 2: covers 5011 5012 5013 5016 5017 5018 5019 5020 (8) + PGS5005 re-roll + PGS5003 editorial (10 gens)
- ⬜ Batch 3: covers 5021 5024 5028 5030 5031 5034 5037 5038 + editorials 5008 5011 (10)
- ⬜ Batch 4: covers 5039 5040 5041 5042 5046 5048 5051 5052 + editorials 5016 5017 (10)
- ⬜ Batch 5: covers 5053 5054 5056 5057 5059 5060 5061 + editorials 5018 5019 5020 (10)
- ⬜ Batch 6: editorials 5021 5034 5041 5042 5048 5055 (6) + any re-rolls (≤4)

## Per-batch workflow (10 generate_image calls MAX per turn — hard cap)
1. `python3 - <<'EOF'` with tools/photoshoot/unbadge.unbadge(cover, /home/user/work_shots/unbadged/SKU.jpg)
   — strips the baked-in Shivaa INC. badge so the regen doesn't duplicate it.
2. generate_image(images=[unbadged], prompt below) -> /home/user/work_shots/gen/SKU_cover.jpg
3. finalize -> `cms/images/designs/rings/<original cover filename>` (KEEP the same
   filename: _shot_studio.jpg for the 34 studio-first rings, _face.jpg for the 31
   face-first rings) + `cp` to `demo65/media/SKU/shot_studio.jpg` (staging contract).
   For editorials: install to `cms/images/designs/rings/SKU_shot_editorial.jpg`
   AND `demo65/media/SKU/shot_editorial.jpg`.
4. QA: `python3 tools/photoshoot/zoom_check.py --sku <batch skus>` — every cover
   and fixed editorial must PASS. Failures re-roll NEXT turn (generation cap).
5. `git add -A && git commit && git push origin arena/01a09f6d-shivaa-ecom`

## Regen prompt (covers)
"Professional jewellery product photograph made by pulling the camera further
back from this exact photograph: show the ENTIRE ring fully inside the frame —
the complete outer silhouette of the band and every edge of the ring visible,
with generous empty background margin on all four sides (at least 15% of the
frame width on left and right). The ring should occupy roughly half of the
image width, perfectly centred. Reproduce this exact same ring with identical
design, proportions, gold colour, stones and detailing — do not redesign,
restyle, add or remove anything. Keep the same seamless warm-white studio
background and the same soft lighting. Photorealistic luxury e-commerce product
photography, razor-sharp focus, vertical portrait orientation. Single ring
only — no hands, no props, no text, no watermark."
(Re-roll variant: demand "no more than 60% of image width" + 18% margins — used
when the first pull-back isn't enough, e.g. PGS5005.)
(Editorials: same text but "same dark charcoal slate background".)

## After the LAST batch
1. `python3 tools/photoshoot/zoom_check.py --sku <all 65>` → 130/130 PASS.
2. Merge session branch to main via PR (ARENA-STATE rule 3), update HANDOFF.
3. Deploy: GitHub Actions "Catalogue Deploy" workflow, `live=YES` from main
   (secret SHIVAA_ADMIN_PASSWORD already works — proven by the 2026-09-13 run).
4. Verify via https://shivaa.in/api/products (fetch_page works from sandbox):
   exactly 65 PGS products, 4 shots each, no videos, no samples.
