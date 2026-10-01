#!/usr/bin/env python3
"""SHIVAA — showroom unboxing reel (reference: Video-86318.mp4, 52.5 s, 9:16).
Builds the ready-to-paste Google Flow (Veo 3.1) prompt files.
Run:  python3 launch/flow-reel-showroom/prompts/_build.py
"""
import pathlib

HERE = pathlib.Path(__file__).parent

PREFIX = """CINEMATIC JEWELLERY SHOWROOM REEL — SHIVAA, fine 22K gold jewellery house, Rajasthan. Vertical 9:16 social film.
Look: shot on a full-frame cinema camera with a fast 35mm/50mm prime, T1.8, very shallow depth of field, creamy bokeh, 24 fps, natural motion blur, crisp modern retail commercial finish, light film grain.
Lighting: a bright warm showroom — rows of backlit gold jewellery in glass wall cabinets, soft golden practicals, one soft key on the subject's face, gentle highlight bloom on polished gold. Clean, premium, NOT dark or moody.
Palette: warm gold, honey beige, polished marble white, deep brown packaging, jewel-tone silk.
Camera: handheld-smooth. Slow push-ins, gentle slides, over-the-shoulder framings, macro inserts, small parallax. No shake, no whip pans, no drone moves.
Grade: bright, warm, high-clarity Indian jewellery-brand reel. Gold reads metallic yellow, skin natural.
Photoreal. Real skin texture, real fabric weave, real metal specularity. No on-screen text, no captions, no logos, no watermarks, no brand names anywhere in frame."""

CHAR = """CHARACTER LOCK — "PRIYA" (the SAME woman in every shot, match reference image 1 exactly):
Indian woman, 26 years old, warm medium-brown skin, round-oval face, full cheeks, dark almond eyes, natural thick brows, long straight glossy black hair worn open over one shoulder, a small red bindi, soft everyday makeup with a warm nude-pink lip.
Wardrobe locked: a multicoloured Kanjeevaram silk saree (green, orange, magenta and gold checks) with a rich gold zari border and a contrasting green silk blouse; a stack of green glass bangles on the left wrist.
Same face, same hair, same saree, same bangles, same bindi in every shot. Do not restyle her, do not change her age or body type."""

PROD = """PRODUCT LOCK — "THE SHIVAA TEMPLE BRIDAL SET" (match reference image 2, identical in every shot):
a 22K yellow-gold South-Indian temple jewellery set — a long haram necklace with graduated deity-motif pendants and tiny gold bead drops, a matching short choker with the same motifs, large gold jhumka earrings, and two broad textured gold bangles.
Antique-gold finish with fine granulation, small ruby-red and emerald-green kundan accents only.
PACKAGING LOCK: a deep chocolate-brown matte paper shopping bag with a thin gold-foil border and flat gold handles, and a rigid cream-white presentation box with a gold-foil edge, lined with cream velvet.
The bag and box are BLANK — a plain gold emblem shape at most, absolutely no letters, no words, no brand name printed anywhere."""

NEG = """NEGATIVE PROMPT:
text, letters, words, numbers, brand names, subtitles, captions, logos, watermarks, price tags, deformed hands, extra fingers, six fingers, warped or floating jewellery, duplicated pendants, melted metal shapes, silver or rose-gold tone, plastic skin, waxy face, over-smoothed beauty filter, oversaturated orange grade, HDR halo, dark moody lighting, cartoon, CGI look, fast cuts, strobing, crowds, cluttered background, western gown, cleavage, tight crop on chest"""

VERT = """FRAMING: native 9:16 vertical. Keep the face and the jewellery inside the central safe area, head room in the top eighth, and keep the bottom fifth of the frame clean for captions."""

SHOTS = {
"01-bags-on-counter.txt": ("""SHOT 1 of 7 — THE ARRIVAL (0.0-8.0 s). One unbroken take, no cuts.
0.0-2.5 s: low three-quarter angle across a polished marble showroom counter. Two deep chocolate-brown matte shopping bags with gold-foil borders stand on the counter, catching warm light; behind them, rows of backlit gold jewellery in glass cabinets fall into soft bokeh.
2.5-5.0 s: PRIYA's hands enter frame — green glass bangles, a gold ring, neat nails — and slide the first bag gently toward the camera; the paper crinkles softly.
5.0-8.0 s: slow macro push-in as her fingers lift the flat gold handles and turn the bag a few degrees; the gold border catches a specular sweep. Her face stays out of frame.
End the shot with both hands resting on the bag, everything still.
AUDIO: no dialogue. Bright warm showroom ambience, a soft paper rustle, faint glass-cabinet hum, one light shimmer accent.""",
 "FLOW SETUP — Ingredients to Video. Refs: 1) model face 2) the jewellery set 3) a warm showroom mood still. Generate 8 s. No first frame."),

"02-box-reveal.txt": ("""SHOT 2 of 7 — THE BOX (8.0-16.0 s). Continue from the first frame. One unbroken take, no cuts.
0.0-2.5 s: her hands lift a rigid cream-white presentation box with a gold-foil edge out of the brown bag and set it on the marble counter; the camera rises with it in one smooth move.
2.5-5.5 s: over-the-shoulder framing now reveals PRIYA seated at the counter in her Kanjeevaram saree; she settles the box in front of her, glances down at it and smiles a small anticipatory smile.
5.5-8.0 s: her thumbs lift the lid a few centimetres; a band of warm light spills across her face from the box; she pauses, enjoying the moment, before opening it fully.
End with the lid tilted open and her face lit by the reflected gold.
AUDIO: no dialogue. Showroom ambience, a soft cardboard slide, a single rising shimmer as the light hits her face.""",
 "FLOW SETUP — Frames to Video: last frame of shot 1 as the first frame. Same 3 ingredients. 8 s."),

"03-necklace-lift.txt": ("""SHOT 3 of 7 — THE SET (16.0-24.0 s). Continue from the first frame. One unbroken take, no cuts.
0.0-3.0 s: top-down over-the-shoulder macro into the open cream-velvet box: the long 22K temple haram is coiled inside with the matching choker, jhumkas and two broad bangles, all glowing under the showroom light.
3.0-5.5 s: both hands lift the haram out by its ends; it unfurls and sways slightly, the deity-motif pendants swinging into a slow gleam.
5.5-8.0 s: she raises it toward a cream velvet display bust beside her and holds it up to compare; the camera arcs a few degrees for parallax, the gold wall of cabinets shimmering behind.
End with the haram held up, still, filling the centre of frame.
AUDIO: no dialogue. Fine metal-on-velvet sound, delicate chain chime, warm ambience, a soft musical swell beginning.""",
 "FLOW SETUP — Frames to Video: last frame of shot 2. Same 3 ingredients. 8 s."),

"04-mirror-wear.txt": ("""SHOT 4 of 7 — WEARING IT (24.0-32.0 s). Continue from the first frame. One unbroken take, no cuts.
0.0-3.0 s: PRIYA turns to a tall showroom mirror; we shoot past her shoulder into the reflection, foreground softly out of focus. She lifts the choker to her throat.
3.0-5.5 s: a sales associate's hands (only the hands, plain sleeves) come in from behind and fasten the choker's clasp at her nape; she lifts her hair aside with one hand.
5.5-8.0 s: she lowers her hair, settles the long haram over the choker with both hands and looks at her own reflection; a slow, genuinely delighted smile arrives as the camera pushes gently toward the mirror.
End on her reflected face and the full set, framed and still.
AUDIO: no dialogue. Soft clasp click, silk rustle, warm ambience, the music bed opening up.""",
 "FLOW SETUP — Frames to Video: last frame of shot 3. Same 3 ingredients. 8 s."),

"05-portrait-reveal.txt": ("""SHOT 5 of 7 — THE REVEAL (32.0-40.0 s). Continue from the first frame. One unbroken take, no cuts.
0.0-2.5 s: she turns away from the mirror to face the camera, now wearing the complete set — choker, long haram, jhumkas and both bangles — the backlit gold cabinets glowing behind her.
2.5-5.0 s: slow push-in from mid-shot to chest-up; she tilts her chin slightly, touches one jhumka with her fingertips and gives a warm, confident closed-lip smile.
5.0-8.0 s: a gentle 20-degree arc around her; the haram catches the light pendant by pendant; a soft golden bloom passes across the frame like a light leak and clears.
End on a clean chest-up portrait, her eyes to the lens.
AUDIO: no dialogue. Full warm music bed, gentle bangle chime, a soft airy whoosh on the light bloom.""",
 "FLOW SETUP — Frames to Video: last frame of shot 4. Same 3 ingredients. 8 s."),

"06-detail-macros.txt": ("""SHOT 6 of 7 — THE DETAIL (40.0-48.0 s). Continue from the first frame. One unbroken take, no cuts, a slow continuous macro drift.
0.0-2.5 s: macro on the haram lying against the silk saree — granulated gold, deity motifs, tiny ruby and emerald kundan accents, the zari border out of focus behind.
2.5-5.0 s: the camera drifts down to her hands resting one over the other in her lap; the two broad bangles and the green glass bangles sit together; she turns her wrist slowly so the gold flares.
5.0-8.0 s: rack focus up to the jhumka swinging beside her cheek, then to her eyes as she glances down and smiles.
End close on her face, three-quarter, softly lit.
AUDIO: no dialogue. Intimate ambience, bangle chime, fabric rustle, the music bed sustaining.""",
 "FLOW SETUP — Frames to Video: last frame of shot 5. Same 3 ingredients. 8 s."),

"07-poses-close.txt": ("""SHOT 7 of 7 — THE POSES (48.0-56.0 s). Continue from the first frame. One unbroken take, no cuts.
0.0-2.5 s: she stands and takes a relaxed pose in front of the gold cabinet wall, one hand resting near her collarbone, head turned three-quarter, a happy natural smile.
2.5-5.0 s: she turns her profile to the lens, touches her chin lightly, then looks back to camera and laughs softly; strands of hair move.
5.0-7.0 s: she brings her bangled wrist up beside her face in a proud, playful pose; the gold set fills the frame with warm glints.
7.0-8.0 s: she settles, looks straight down the lens, holds a calm confident smile, and the frame blooms softly into warm golden light.
AUDIO: no dialogue. Music bed resolving, a light happy ambience, the bloom carried by a soft rising shimmer.""",
 "FLOW SETUP — Frames to Video: last frame of shot 6. Same 3 ingredients. 8 s."),

"08-outro-logo-plate.txt": ("""3-second luxury logo plate. No people, no jewellery, no text of any kind.
0.0-1.2 s: from a full-frame wash of warm golden light, liquid molten gold flows inward from every edge and settles into a calm, deep charcoal-black velvet background.
1.2-2.2 s: fine gold particles drift and settle; a soft specular shimmer sweeps once from left to right across the centre; a faint circular gold vignette forms in the exact middle of the frame, leaving that centre area CLEAN, EMPTY and completely uncluttered.
2.2-3.0 s: everything settles and holds perfectly still — an empty, elegant dark-gold frame with a soft glow in the centre and gentle grain. Absolutely nothing in the centre of the frame.
AUDIO: one deep cinematic gold-shimmer swell resolving into silence, with a single soft chime on the last beat.""",
 "FLOW SETUP — Frames to Video: last frame of shot 7 (the golden bloom). Generate 4 s, trim to 3 s.\nDO NOT ask Veo to draw the Shivaa logo — the centre stays empty and assemble.sh composites the real PNG there."),
}

for name, (body, setup) in SHOTS.items():
    parts = [f"### {name.replace('.txt','').upper()}", setup, "", "--- PASTE FROM HERE ---", "", PREFIX, ""]
    if "outro" not in name:
        parts += [CHAR, "", PROD, ""]
    parts += [body, "", NEG, "", VERT, ""]
    (HERE / name).write_text("\n".join(parts), encoding="utf-8")
    print("wrote", name)
