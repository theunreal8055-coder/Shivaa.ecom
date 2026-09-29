#!/usr/bin/env python3
"""SHIVAA — "दो दुकानें" split-screen comparison reel (30 s).
Builds: split/   3 shots + outro  — true split-screen, one clip per shot
        halves/  left+right halves of shots 1-3 — safer fallback, composited in the edit
Run: python3 launch/flow-reel-do-dukane/prompts/_build.py
"""
import pathlib
HERE = pathlib.Path(__file__).parent

PREFIX = """CINEMATIC INDIAN RETAIL COMMERCIAL — SHIVAA, India's wholesale gold jewellery platform for jewellers. Vertical 9:16, photoreal, documentary-grade realism. Cut to a 110 BPM tension bed; every beat lands with a graphic or a glance.
CAMERA / OPTICS: full-frame cinema camera, 40mm at T2.2, 24 fps, 180-degree shutter, shallow depth of field, gentle handheld-on-rails float with micro-parallax, slow push-ins that decelerate into a settle. No whip pans, no zoom punches.
LIGHTING: warm practical showroom light — tube lights and display spots bouncing off glass counters and gold. LEFT SIDE is slightly cooler, flatter, dustier, with a faint green fluorescent cast and tired shadows. RIGHT SIDE is warmer, cleaner, with crisp gold specular highlights and a soft rim on faces. Same room type, opposite mood.
PALETTE: warm ivory walls, teak counters, red velvet trays, 22K gold #C9A227, deep charcoal accents. Skin tones natural Indian, never orange.
GRADE: filmic contrast, soft highlight roll-off, subtle grain, premium Indian advertising look.
Photoreal skin with visible texture, real metal specularity, believable fabric. No on-screen text, no captions, no logos, no watermarks, no brand names anywhere in frame — all copy is added later in the edit."""

CHARS = """CHARACTER LOCKS — the same three people in every shot; match the reference images exactly.
"SURESH" (LEFT SHOP, the struggling jeweller): Indian man, 45, medium build, salt-and-pepper hair, thick moustache, rimless glasses slipping down his nose, crumpled beige half-sleeve shirt, a pen in the pocket, a thin gold ring. Body language: hurried, apologetic, flipping pages, avoiding eye contact with the customer, sweat at the temples.
"MOHIT" (RIGHT SHOP, the Shivaa partner): Indian man, 38, trim, clean-shaven with a sharp fade, crisp white shirt with sleeves rolled twice, slim charcoal waistcoat, a steel watch. Body language: calm, upright, one hand on a tablet, warm unhurried eye contact, a small confident smile.
"THE CUSTOMER" (identical in both halves, same performance, same wardrobe): Indian woman, 32, in a magenta cotton-silk saree with a gold border, hair in a low bun with a small jasmine strand, a slim gold bangle. She asks for a fine meenakari mangalsutra. Her expressions differ ONLY in outcome: impatient and disappointed on the left, delighted on the right.
Do not restyle, re-age or re-cast anyone between shots. Identical faces, wardrobe and shop layouts throughout."""

WORLD = """SPLIT-SCREEN LOCK — the frame is divided down the exact vertical centre by a thin 3-pixel line of warm gold light with a faint glow. Both halves are the SAME small Indian jewellery showroom, shot on the same lens and from the same angle, mirrored in mood:
LEFT HALF — a stack of dog-eared printed catalogues, loose photo prints, a cluttered glass counter, a slowly emptying customer chair, a wall clock whose hands move visibly.
RIGHT HALF — a clean counter, one tablet on a brass stand showing an abstract glowing grid of jewellery thumbnails (no readable text or digits ever), a velvet tray ready, the same wall clock barely moving.
Both halves run at the same time with synchronised action; the gold seam pulses softly on the beat. ALL SCREEN CONTENT IS ABSTRACT — glowing tiles, shapes and light only, never letters, digits, prices or logos."""

NEG = """NEGATIVE PROMPT:
text, letters, words, numbers, digits, currency symbols, UI labels, subtitles, captions, logos, brand names, watermarks, price tags, readable screens, deformed hands, extra fingers, mangled jewellery, twins or duplicate faces where not intended, plastic skin, waxy over-smoothed faces, beauty-filter look, cheap stock-video feel, harsh flat lighting, blown highlights, oversaturated orange, cartoon, anime, CGI plastic look, shaky footage, crowds"""

VERT = """FRAMING: native 9:16 vertical, split down the middle. Faces sit in the upper-middle third of each half; the bottom fifth of the frame stays clean and uncluttered for burned-in captions. Nothing important below 80 percent of frame height."""

SPLIT = {
"shot1-same-city.txt": ("""SHOT 1 of 3 — "SAME CITY, TWO SHOPS" (0-10 s). One unbroken split-screen take, no cuts. Both halves play simultaneously and identically until the last beat.
VO SPOKEN OVER THIS SHOT (never rendered in frame): "एक ही शहर। दो जौहरी। और एक ही ग्राहक की फ़रमाइश।"
0.0-1.5 s: the frame opens as a single unbroken showroom wide shot; on the downbeat a thin gold line of light draws itself down the exact centre and splits the picture into two shops.
1.5-4.0 s: in BOTH halves, THE CUSTOMER walks in through the doorway in perfect sync, sits at the counter and speaks, her hands sketching the shape of a mangalsutra in the air. SURESH greets her on the left, MOHIT on the right. Slow 15 percent push-in on both halves at the same speed.
4.0-7.0 s: both jewellers nod and turn to their own tools — SURESH reaches under the counter and hauls out a thick stack of dog-eared catalogues that thud onto the glass and raise a puff of dust; MOHIT simply turns a tablet on a brass stand toward her, its abstract glowing grid of jewellery tiles lighting her face in warm gold.
7.0-10.0 s: the wall clock on the left ticks audibly; on the right the tile grid reflows once with a soft shimmer. Both jewellers look up at her at the same instant. Freeze on that symmetry.
AUDIO: no dialogue in frame. A 110 BPM tension bed with a ticking clock and a low sustained note; a soft chime as the gold seam draws; a heavy paper thud on the left; a clean digital shimmer on the right.""",
 "FLOW SETUP — Ingredients to Video. Refs: 1) Suresh's face 2) Mohit's face 3) the customer / showroom still. Veo 3.1 Quality, 9:16, 1080p. Generate 8 s, press Extend once, trim to 10 s."),

"shot2-the-gap.txt": ("""SHOT 2 of 3 — "THE GAP OPENS" (10-20 s). Continue seamlessly from the previous last frame. One unbroken split-screen take; the two halves now diverge hard.
VO SPOKEN OVER THIS SHOT (never rendered in frame): "बाईं ओर कैटलॉग पलटते रहिए… ग्राहक कुर्सी छोड़ चुका। दाईं ओर स्क्रीन खुली, डिज़ाइन सामने, सौदा तय।"
0.0-3.0 s: LEFT — SURESH flips pages faster and faster, licking a fingertip, pulling a second stack over, phone wedged to his ear, a loose photo print sliding to the floor in slow motion. RIGHT — MOHIT taps twice; the abstract tile grid filters and re-sorts with a liquid ripple, three glowing tiles rising toward the customer.
3.0-6.0 s: LEFT — the customer checks her phone, shifts in her seat, the clock hands sweep visibly; her smile fades. RIGHT — she leans in, eyes widening, pointing at one tile; MOHIT lifts an actual meenakari mangalsutra from a velvet tray and lays it on her palm; gold catches the spot light in a macro flash.
6.0-8.5 s: LEFT — the chair is empty; the door swings shut behind her; SURESH looks up, one page still half-turned, catalogues collapsing sideways. RIGHT — she smiles and nods; MOHIT taps once and a soft golden confirmation pulse ripples out from the tablet across the counter.
8.5-10.0 s: the gold centre seam brightens sharply, pushing the two outcomes apart for one beat. Hold on both faces: defeat on the left, quiet triumph on the right.
AUDIO: the bed tightens — frantic page-flips, a ticking clock accelerating and a door click on the left; crisp taps, a silky filter whoosh and a warm chime on the right; one low impact as the seam flares.""",
 "FLOW SETUP — Frames to Video: last frame of shot 1 becomes the first frame. Same 3 ingredients. 8 s + Extend once, trim to 10 s."),

"shot3-merge-cta.txt": ("""SHOT 3 of 3 — "IT IS NOT SKILL, IT IS SPEED" (20-30 s). Continue from the previous last frame. One unbroken take; the split-screen resolves into a single frame.
VO SPOKEN OVER THIS SHOT (never rendered in frame): "फ़र्क़ हुनर का नहीं… रफ़्तार का है। जी.एस.टी. डालिए, आप भी दाईं तरफ़ आ जाइए। शिवा।"
0.0-2.5 s: the gold seam swells into a full vertical curtain of warm light that washes across the entire frame; both showrooms dissolve behind it.
2.5-5.0 s: the light peels away to reveal ONE shop only — the clean, warm, right-hand showroom — with SURESH now standing behind that same counter, glasses off, catalogues gone, a tablet in his hands. He looks down at it, then up, and exhales a relieved half-smile.
5.0-7.5 s: over his shoulder a floating abstract verification panel of gold light rises; he taps it once, a scan line sweeps top to bottom and a large clean tick strikes in with a particle burst that lights his face.
7.5-10.0 s: the panel unfolds into a wide arc of glowing dashboard cards around him; he steps forward into a chest-up hero framing, meets the lens with calm confidence and gives one decisive nod. The whole arc collapses into a vortex of gold particles that rushes past camera and blooms into a full-frame sheet of warm golden light.
AUDIO: a rising riser through the curtain wipe, the room tone opening up, a bright impact and shimmer on the tick, then a warm triumphant brass-and-strings resolve ending on one sustained golden note.""",
 "FLOW SETUP — Frames to Video: last frame of shot 2 becomes the first frame. Same 3 ingredients. 8 s + Extend once, trim to 10 s. The English pay-off line lands here in the edit."),

"outro-logo-plate.txt": ("""3-second luxury logo plate. No people, no jewellery, no text of any kind.
0.0-1.2 s: from a full-frame wash of warm golden light, liquid molten gold flows inward from every edge and settles into a calm, deep charcoal-black velvet background.
1.2-2.2 s: fine gold particles drift and settle; a soft specular shimmer sweeps once from left to right; a faint circular gold vignette forms in the exact centre, leaving that centre CLEAN, EMPTY and uncluttered.
2.2-3.0 s: everything settles and holds perfectly still — an empty elegant dark-gold frame with a soft central glow and gentle grain.
AUDIO: one deep cinematic gold-shimmer swell resolving into silence, with a single soft chime on the last beat.""",
 "FLOW SETUP — Frames to Video: last frame of shot 3 (the golden bloom). Generate 4 s, trim to 3 s.\nDO NOT prompt the Shivaa logo — Veo garbles letterforms. The centre stays empty; the real logo PNG is composited in the edit."),
}

HALVES = {
"H1-left-suresh.txt": """SINGLE FULL-FRAME SHOT — LEFT HALF SOURCE, "THE OLD WAY" (10 s, framed for the left panel of a split screen).
Small Indian jewellery showroom, slightly cooler and flatter light with a faint fluorescent cast, dust in the air, a cluttered glass counter and a visible wall clock.
0-3 s: THE CUSTOMER enters, sits and describes a mangalsutra with her hands. SURESH nods and hauls a thick stack of dog-eared catalogues onto the counter with a thud and a puff of dust.
3-6.5 s: he flips pages faster and faster, licks a fingertip, wedges a phone to his ear, a loose photo print slides to the floor. She checks her phone and shifts in her seat; the clock hands sweep.
6.5-10 s: the chair is empty, the door swings shut, he looks up with one page half-turned as the catalogues collapse sideways.
COMPOSITION NOTE: keep all action in the LEFT 45 percent of frame with clean negative space on the right for the split. Locked-off camera with a slow 10 percent push-in only.""",

"H2-right-mohit.txt": """SINGLE FULL-FRAME SHOT — RIGHT HALF SOURCE, "THE SHIVAA WAY" (10 s, framed for the right panel of a split screen).
The same showroom layout but warmer and cleaner — crisp gold specular highlights, a clear counter, a tablet on a brass stand showing an ABSTRACT glowing grid of jewellery tiles with no readable text or digits, a velvet tray ready.
0-3 s: THE CUSTOMER enters, sits and describes the same mangalsutra. MOHIT turns the tablet toward her; its glow warms her face.
3-6.5 s: two taps; the tile grid filters and re-sorts with a liquid ripple; three tiles rise toward her; she points at one and MOHIT lays a real meenakari mangalsutra on her palm — macro flash of gold in the spot light.
6.5-10 s: she smiles and nods; he taps once and a soft golden confirmation pulse ripples across the counter; he looks to the lens with quiet confidence.
COMPOSITION NOTE: keep all action in the RIGHT 45 percent of frame with clean negative space on the left for the split. Locked-off camera with a slow 10 percent push-in only, matched exactly to the left-half clip.""",

"H3-merge-cta.txt": """SINGLE FULL-FRAME SHOT — RESOLUTION AND CTA (10 s, no split screen).
The clean warm showroom. SURESH now stands behind that counter — glasses off, catalogues gone, a tablet in his hands — and exhales a relieved half-smile.
0-2.5 s: a vertical curtain of warm gold light wipes across frame and settles, revealing the single clean shop.
2.5-6 s: a floating abstract verification panel of gold light rises over his shoulder; he taps it; a scan line sweeps and a large clean tick strikes in with a particle burst.
6-10 s: the panel unfolds into a wide arc of glowing dashboard cards; he steps into a chest-up hero framing, meets the lens and nods once; the arc collapses into a vortex of gold particles that blooms into full-frame golden light.
COMPOSITION NOTE: centred hero framing, the bottom fifth kept clean for captions.""",
}

sd = HERE / "split"; sd.mkdir(exist_ok=True)
for name, (body, setup) in SPLIT.items():
    parts = [f"### SHIVAA · DO DUKANE (SPLIT-SCREEN) · {name.replace('.txt','').upper()}", setup, "",
             "--- PASTE EVERYTHING BELOW THIS LINE INTO GOOGLE FLOW ---", "", PREFIX, ""]
    if "outro" not in name:
        parts += [CHARS, "", WORLD, ""]
    parts += [body, "", NEG, "", VERT, ""]
    (sd / name).write_text("\n".join(parts), encoding="utf-8"); print("wrote split/" + name)

hd = HERE / "halves"; hd.mkdir(exist_ok=True)
for name, body in HALVES.items():
    parts = [f"### SHIVAA · DO DUKANE (SAFE FALLBACK — HALVES COMPOSITED IN THE EDIT) · {name.replace('.txt','').upper()}",
             "FLOW SETUP — Ingredients to Video, same 3 reference images, 9:16, 1080p, 8 s + Extend, trim to 10 s.",
             "Use these ONLY if Veo's split-screen composition looks unstable: render the two halves separately and side-by-side them in the edit.",
             "", "--- PASTE EVERYTHING BELOW THIS LINE INTO GOOGLE FLOW ---", "", PREFIX, "", CHARS, "", body, "", NEG, "", VERT, ""]
    (hd / name).write_text("\n".join(parts), encoding="utf-8"); print("wrote halves/" + name)
