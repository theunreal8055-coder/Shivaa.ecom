#!/usr/bin/env python3
"""Builds the 4 ready-to-paste Google Flow (Veo 3.1) prompt files for the
SHIVAA MANGALSUTRA RANGE 30s cinematic film. One source of truth — edit here, re-run:
    python3 launch/flow-30s/prompts/_build.py
"""
import pathlib

HERE = pathlib.Path(__file__).parent

PREFIX = """CINEMATIC LUXURY JEWELLERY COMMERCIAL — SHIVAA INC., fine gold house, Jayal, Nagaur, Rajasthan. Campaign: THE MANGALSUTRA RANGE.
Look: shot on ARRI Alexa 35 with Cooke anamorphic primes, 24 fps, 180-degree shutter, shallow depth of field, natural motion blur, fine film grain, rich true blacks, filmic highlight roll-off, tack-sharp macro on the jewellery.
Palette: warm 22K gold, ivory and champagne cream, soft blush beige, deep black beads as the only dark accent; brass diya practicals and one large soft window key with gentle falloff.
Camera: slow and deliberate only — macro push-in, gentle lateral glide, low orbit, rack focus. No shake, no whip pans, no snap zooms.
Grade: high-end bridal-jewellery advertising, Tanishq / Malabar polish, warm but never orange; gold reads metallic, whites stay ivory.
Photoreal. Real skin texture, real fabric weave, real metal specularity. No on-screen text, no captions, no logos, no watermarks inside the frame."""

CHAR = """CHARACTER LOCK — "MEERA" (the SAME married woman in every shot, match reference image 1 exactly):
Indian woman, 28 years old, warm wheatish skin, oval face, softly defined brows, deep-set dark brown eyes, a small mole on the left jawline, glossy black centre-parted hair, a fine line of sindoor at the parting, minimal dewy makeup, soft kohl, natural rose lips, small gold studs only.
Wardrobe rule: soft ivory or blush silk with a thin gold zari border in shots 1-2; a deep maroon silk saree with gold zari in the festive shot 3. No other necklace is ever visible — the mangalsutra is always the only neckpiece.
Same face, same hair, same sindoor, same makeup in every shot. Do not restyle her."""

PROD = """PRODUCT LOCK — "THE SHIVAA MANGALSUTRA RANGE", four designs, match the reference images exactly, identical in every shot.
All four are light-weight BIS-hallmarked gold with a laser HUID mark, strung with tiny glossy BLACK beads on a fine gold cable chain. Black beads and gold only — never silver, never rose gold, never coloured stones.
D1 "PHOOL" — two small four-petal gold flowers joined side by side on a double black-bead strand; the smallest, lightest, everyday piece.
D2 "SOLITAIRE" — one emerald-cut white zircon in a square gold bezel ringed by a fine pave halo, on a single black-bead chain; modern and minimal.
D3 "TEEN BOONDH" — three pear-shaped white zircon drops in polished gold bezels sitting side by side, black beads flanking them on a fine chain.
D4 "TAARA" — a round star-filigree gold medallion with a graduated gold tassel drop ending in two black beads; the traditional, festive piece.
Never invent a new pendant, never change bead colour, never add extra stones or strands."""

NEG = """NEGATIVE PROMPT:
text, letters, numbers, subtitles, captions, logos, watermarks, price tags, deformed hands, extra fingers, warped or floating jewellery, duplicated pendants, melted metal shapes, silver or rose gold tone, coloured gemstones, plastic skin, waxy face, oversaturated orange grade, HDR halo, cartoon, anime, CGI look, fast cuts, strobing, lens flare spam, crowds, clutter, modern glass mall, western bridal gown, cleavage, tight close crop on chest"""

VERT = """VERTICAL FRAMING (use this line only for the 9:16 Reel render): compose for 9:16 — pendant and neckline in the central safe area, head room in the top third, clean empty space in the bottom fifth of the frame for captions."""

SHOTS = {
"shot1-range-reveal.txt": ("""SHOT 1 of 3 — THE RANGE. One unbroken take, no cuts, continuous slow lateral glide.
0.0-1.5 s: extreme macro in warm darkness. A brass diya flame flares; the light travels along a fine gold chain and a line of tiny black beads catches the glow, bead by bead, like a fuse of light.
1.5-3.5 s: the camera pulls back a little and glides right to reveal D1 "PHOOL" lying on ivory silk — the two four-petal gold flowers rotate a few degrees into the key light and sparkle.
3.5-5.5 s: continuing the same glide, D2 "SOLITAIRE" enters frame on champagne silk; a soft specular sweep crosses the emerald-cut zircon and its pave halo ignites with a clean white star flare.
5.5-7.5 s: the glide continues to D3 "TEEN BOONDH"; the three pear drops catch the light one after another, left to right, in slow motion.
7.5-10.0 s: the camera rises into a gentle top-down move over D4 "TAARA"; the star filigree medallion turns, its gold tassel sways once and settles, and all four mangalsutras are finally seen together, laid in a neat fan on ivory silk beside the lit diya.
End on that clean, still top-down frame of all four pieces together.
AUDIO: no dialogue. A single held tanpura note under a soft cinematic swell, tiny bead-on-bead clicks, a delicate chime on each sparkle, a low sub-bass bloom at the final reveal.""",
 "FLOW SETUP — Ingredients to Video, no first frame. Refs: 1) Meera face 2) the four-design poster crop 3) warm ivory-and-gold mood still. Generate 8 s, press Extend once, trim to 10 s."),

"shot2-everyday.txt": ("""SHOT 2 of 3 — LIGHT ENOUGH FOR EVERY DAY. Continue seamlessly from the first frame; one unbroken take, no cuts, the camera never stops moving forward.
0.0-2.5 s: the top-down frame of the four pieces dissolves into MEERA's reflection in a tall morning mirror. She fastens D1 "PHOOL" at the back of her neck; macro on the clasp and on the black beads settling against her collarbone. Her fingers lift it once — it is feather light.
2.5-5.0 s: she turns and walks toward the camera through a sunlit doorway; as she crosses the light she is now wearing D2 "SOLITAIRE" over a crisp blush kurta, stepping into a bright modern workspace. The zircon catches a shaft of daylight as she laughs at something off-camera.
5.0-7.5 s: continuous glide — she leans over a cup of chai at a warm cafe table, now wearing D3 "TEEN BOONDH"; macro rack focus from the steam of the chai to the three zircon drops resting perfectly flat on her skin.
7.5-10.0 s: the camera settles on a three-quarter close-up of her face and neckline. She touches the pendant with two fingertips, a small private smile of pride, then looks off-camera as warm evening light begins to fill the frame.
AUDIO: no dialogue. Light, warm, modern strings with a soft plucked rhythm, gentle morning ambience, a spoon on porcelain, a distant city hum that fades into evening.""",
 "FLOW SETUP — Frames to Video: upload the LAST FRAME of shot 1 as the first frame. Same 3 ingredients (swap ref 2 for the individual design crops if a piece drifts). 8 s + Extend, trim to 10 s."),

"shot3-tradition.txt": ("""SHOT 3 of 3 — THE BOND. Continue from the first frame — same Meera, same face. One unbroken take, no cuts. Festive golden light.
0.0-3.0 s: evening, a sandstone haveli room lit by a row of diyas and marigold garlands. Meera is now in a deep maroon silk saree. Her husband's hands come in from behind and fasten D4 "TAARA" at her nape; macro texture of skin, zari and the gold tassel settling into place.
3.0-6.0 s: a slow 180-degree low orbit as she turns to face him; the star filigree medallion and its tassel catch the diya flames and throw warm glints; marigold petals drift softly through the foreground bokeh.
6.0-8.5 s: she looks down at the mangalsutra, closes her hand gently around it, and shares an unforced laugh with him; the camera drifts into a macro of the black beads and gold against the maroon silk.
8.5-10.0 s: Meera lifts her eyes to the lens with a calm, proud, closed-lip smile and takes one step forward; the frame blooms into a clean sheet of warm golden light that fills the screen completely.
AUDIO: no dialogue. Swelling strings with a bansuri melody over a soft heartbeat sub, diya crackle, distant temple bell, bangles shifting, resolving on one sustained note as the frame blooms.""",
 "FLOW SETUP — Frames to Video: upload the LAST FRAME of shot 2 as the first frame. Same 3 ingredients. 8 s + Extend, trim to 10 s."),

"outro-logo-plate.txt": ("""3-second luxury logo plate. No people, no jewellery, no text of any kind.
0.0-1.2 s: from a full-frame wash of warm golden light, liquid molten gold flows inward from every edge and settles into a calm, deep charcoal-black velvet background.
1.2-2.2 s: fine gold particles drift and settle; a soft specular shimmer sweeps once from left to right across the centre; a faint circular gold vignette forms in the exact middle of the frame, leaving that centre area CLEAN, EMPTY and completely uncluttered.
2.2-3.0 s: everything settles and holds perfectly still — an empty, elegant dark-gold frame with a soft glow in the centre and gentle grain. Absolutely nothing in the centre of the frame.
AUDIO: one deep cinematic gold-shimmer swell resolving into silence, with a single soft chime on the last beat.""",
 "FLOW SETUP — Frames to Video: use the LAST FRAME of shot 3 (the golden bloom) as the first frame. Generate 4 s, trim to 3 s.\nDO NOT ask Veo to draw the Shivaa logo — it garbles letterforms. The centre stays empty and assemble.sh composites the real logo PNG there."),
}

for name, (body, setup) in SHOTS.items():
    parts = [f"### {name.replace('.txt','').upper()}", setup, "", "--- PASTE FROM HERE ---", "", PREFIX, ""]
    if "outro" not in name:
        parts += [CHAR, "", PROD, ""]
    parts += [body, "", NEG, "", VERT, ""]
    (HERE / name).write_text("\n".join(parts), encoding="utf-8")
    print("wrote", name)
