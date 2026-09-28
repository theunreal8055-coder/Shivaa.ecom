#!/usr/bin/env python3
"""SHIVAA — B2B partner-invite reel (30 s, 3 x 10 s + 3 s logo outro).
Builds the ready-to-paste Google Flow (Veo 3.1) prompt files.
Run: python3 launch/flow-b2b-30s/prompts/_build.py
"""
import pathlib
HERE = pathlib.Path(__file__).parent

PREFIX = """HIGH-ENERGY CINEMATIC B2B BRAND REEL — SHIVAA, wholesale gold jewellery platform for jewellers, Rajasthan, India. Vertical 9:16.
Look: shot on a full-frame cinema camera with a 35mm prime, T2, shallow depth of field, 24 fps, crisp modern commercial finish, subtle film grain, deep contrast with clean highlights.
Set: a dark premium studio — brushed charcoal and black-marble surfaces, gold rim light, thin gold LED strips, floating holographic gold interface panels and cards made of light, drifting gold particles and soft volumetric haze.
Motion graphics: elegant gold wireframe panels, glowing grid walls of jewellery thumbnails, animated gold bar-charts, rotating 3D gold coins and bullion bars, a scanning light sweep, ripple and particle-burst transitions. All graphics are ABSTRACT SHAPES AND ICONS ONLY — completely blank, no letters, no numbers, no words anywhere.
Camera: confident and energetic but controlled — fast dolly push-ins, snap-settle whip transitions on motion-graphic beats, low orbits, macro inserts. Always smooth, never shaky.
Grade: rich black, warm 22K gold, ivory highlights. Premium fintech-meets-jewellery advertising.
Photoreal human skin and real metal specularity. No on-screen text, no captions, no logos, no watermarks in frame."""

CHAR = """CHARACTER LOCK — "AARYA", the Shivaa host (the SAME woman in all three shots, match reference image 1 exactly):
Indian woman, 30 years old, warm wheatish skin, oval face, strong groomed brows, dark confident eyes, glossy black hair pulled into a sleek low bun, minimal polished makeup with a soft berry lip, small gold studs.
Wardrobe locked: a tailored ivory raw-silk kurta with a fine gold zari placket and a single thin gold chain; no other jewellery.
Manner locked: poised, energetic, business-like warmth — she speaks to camera like a partner, not a model. Direct eye contact with the lens, controlled hand gestures that interact with the floating gold panels.
Same face, same hair, same outfit in every shot. Do not restyle her."""

WORLD = """PLATFORM LOCK (the same visual world in all three shots):
The Shivaa platform is shown as floating holographic gold interface panels around AARYA — a tall grid wall of tiny jewellery thumbnails, a live line-chart panel, a stack of gold bullion bars, a rotating ring/necklace hologram, and a shield-with-tick verification badge.
Every panel is rendered as clean gold-on-black glass with glowing edges and abstract bar/line/icon content only. Never any letters, digits, currency symbols or words on any panel — those are added later in the edit."""

NEG = """NEGATIVE PROMPT:
text, letters, words, numbers, digits, currency symbols, UI labels, subtitles, captions, logos, watermarks, deformed hands, extra fingers, warped jewellery, plastic skin, waxy face, over-smoothed filter, cheap stock-video look, cluttered background, flickering strobe, dark muddy grade, cartoon, anime, low-resolution holograms, crowds"""

VERT = """FRAMING: native 9:16 vertical. Keep AARYA and the key graphic in the central safe area, head room in the top eighth, and keep the bottom fifth of the frame clean and uncluttered for captions."""

SHOTS = {
"shot1-hook-catalogue.txt": ("""SHOT 1 of 3 — THE HOOK: ONE CATALOGUE (0-10 s). One unbroken take, no cuts, constant forward energy.
0.0-2.0 s: hard cinematic open — a single gold particle burst in blackness resolves into AARYA standing in the dark studio, rim-lit in gold, looking straight down the lens with a confident half-smile as she lifts one hand.
2.0-4.5 s: on her gesture a towering holographic GRID WALL of hundreds of tiny gold jewellery thumbnails (rings, chains, mangalsutras, bangles, bridal sets) sweeps up behind her and keeps scrolling; the camera pushes in fast and settles.
4.5-7.0 s: she turns her palm and the wall reorganises itself into neat category clusters with a satisfying ripple; a scanning light sweep passes across it; three blank gold filter-chips float up beside her hand.
7.0-10.0 s: she steps toward camera; the grid wall compresses behind her into a single glowing gold card that lands in her open palm; she looks at the lens and gives a small decisive nod. Frame holds on her, chest-up, the card glowing in her hand.
AUDIO: no dialogue — the voice-over is added in the edit. Driving cinematic percussion with a rising synth-and-santoor hook, a deep sub hit on the grid reveal, precise digital whooshes and a crystalline chime as the card lands.""",
 "FLOW SETUP — Ingredients to Video. Refs: 1) host face 2) a jewellery grid/catalogue screenshot 3) dark gold studio mood still. Generate 8 s, press Extend once, trim to 10 s. VO line 1 goes over this shot."),

"shot2-desk-services.txt": ("""SHOT 2 of 3 — THE DESK: BULLION, CUSTOM, WASTAGE, DEAD STOCK (10-20 s). Continue seamlessly from the first frame. One unbroken take, no cuts, four beats with snap transitions.
0.0-2.5 s: the gold card in her palm explodes into a slow-rotating stack of 22K BULLION BARS and gold coins beside her; a live gold-rate line-chart panel of pure light rises behind, its line climbing; she gestures and the bars settle.
2.5-5.0 s: a whip-settle to a CUSTOM ORDER hologram — a hand-drawn ring sketch of gold light morphs into a wireframe 3D model, then into a photoreal finished gold ring that rotates slowly in front of her while she watches it with a small proud smile.
5.0-7.5 s: she sweeps her hand left: a tray of dull, old, dead-stock gold jewellery slides in, a bright scanning bar passes over it and it transforms into clean fresh gold pieces and a rising stack of bright bullion — a clear old-to-new transformation.
7.5-10.0 s: two payment icons of gold light — a bank-transfer arrow and a cash bundle — rise on either side of her; both pulse and lock with a tick; she turns to camera, hands open, as if to say "either way, we are ready".
AUDIO: no dialogue. The same driving bed, heavier now: metallic bullion clinks, a digital morph whoosh on the ring, a deep scan sweep, two confident lock-in clicks on the payment icons.""",
 "FLOW SETUP — Frames to Video: last frame of shot 1 as the first frame. Same 3 ingredients. 8 s + Extend, trim to 10 s. VO line 2 goes over this shot."),

"shot3-gst-cta.txt": ("""SHOT 3 of 3 — GST VERIFY AND THE DASHBOARD OPENS (20-30 s). Continue from the first frame. One unbroken take, no cuts, building to the payoff.
0.0-2.5 s: a tall vertical gold VERIFICATION PANEL of light rises in front of AARYA — a blank document card with a shield outline; she raises one finger and taps it; a bright scan line runs top to bottom across the card.
2.5-5.0 s: the shield fills with gold and a large clean TICK strikes into it with a burst of particles; a ring of light expands outward past the camera; her face is lit by the flash and she smiles.
5.0-7.5 s: the panel unfolds outward into a full floating DASHBOARD of gold glass — rate chart, order cards, a ledger column and a catalogue grid arranging themselves around her in depth; the camera orbits her once as she looks around it, then back to the lens.
7.5-10.0 s: she steps forward into a clean chest-up hero framing, holds direct eye contact with the lens and gives a decisive, welcoming nod; the dashboard behind her collapses into a swirl of gold particles that blooms into a full-frame sheet of warm golden light.
AUDIO: no dialogue. The bed peaks: a rising riser into the tick, a bright impact and shimmer on the verification, a warm triumphant resolve on the dashboard unfold, ending on one sustained golden note as the frame blooms.""",
 "FLOW SETUP — Frames to Video: last frame of shot 2 as the first frame. Same 3 ingredients. 8 s + Extend, trim to 10 s. VO line 3 (ending with the English line) goes over this shot."),

"outro-logo-plate.txt": ("""3-second luxury logo plate. No people, no jewellery, no text of any kind.
0.0-1.2 s: from a full-frame wash of warm golden light, liquid molten gold flows inward from every edge and settles into a calm, deep charcoal-black velvet background.
1.2-2.2 s: fine gold particles drift and settle; a soft specular shimmer sweeps once from left to right across the centre; a faint circular gold vignette forms in the exact middle of the frame, leaving that centre area CLEAN, EMPTY and completely uncluttered.
2.2-3.0 s: everything settles and holds perfectly still — an empty, elegant dark-gold frame with a soft glow in the centre and gentle grain. Absolutely nothing in the centre of the frame.
AUDIO: one deep cinematic gold-shimmer swell resolving into silence, with a single soft chime on the last beat.""",
 "FLOW SETUP — Frames to Video: last frame of shot 3 (the golden bloom). Generate 4 s, trim to 3 s.\nDO NOT prompt the Shivaa logo — the centre stays empty and the real logo PNG is composited there in the edit."),
}

for name, (body, setup) in SHOTS.items():
    parts = [f"### {name.replace('.txt','').upper()}", setup, "", "--- PASTE EVERYTHING BELOW THIS LINE INTO FLOW ---", "", PREFIX, ""]
    if "outro" not in name:
        parts += [CHAR, "", WORLD, ""]
    parts += [body, "", NEG, "", VERT, ""]
    (HERE / name).write_text("\n".join(parts), encoding="utf-8")
    print("wrote", name)
