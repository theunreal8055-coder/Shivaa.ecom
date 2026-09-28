#!/usr/bin/env python3
"""SHIVAA B2B invite reel — builds TWO complete Flow (Veo 3.1) prompt sets:
   version-a/  "मंडी का दरवाज़ा"  — cinematic, doorway/vault motif
   version-b/  "तराज़ू"           — swagger, scale/forge motif
Each: shot1 (0-10) · shot2 (10-20) · shot3 (20-30) · outro (3 s logo plate).
Run: python3 launch/flow-b2b-30s/prompts/_build.py
"""
import pathlib
HERE = pathlib.Path(__file__).parent

PREFIX = """HIGH-ENERGY CINEMATIC B2B COMMERCIAL — SHIVAA, India's wholesale gold jewellery platform for jewellers. Vertical 9:16. Cut to a 120 BPM track: every graphic lands on a beat.
CAMERA / OPTICS: full-frame cinema camera, 35mm prime at T2, 24 fps, 180-degree shutter, shallow depth of field with creamy round bokeh, subtle anamorphic horizontal flare on specular gold, micro-parallax on every move. Moves are fast but mechanically smooth: dolly push-ins that decelerate into a hard settle, 15-25 degree arcs, macro snap-ins. No handheld wobble, no whip pans, no digital zoom.
LIGHTING: dark premium studio. Key = large soft source 45 degrees camera-left, 4:1 ratio on her face; warm gold rim camera-right separating her from black; low gold kicker off a brushed-charcoal floor; thin gold LED strips receding into haze. Volumetric shafts, fine drifting gold dust, deep true blacks.
PALETTE: charcoal #14110D, black glass, 22K gold #C9A227, warm ivory #F4EDE0. Gold reads metallic and specular, never flat orange.
MOTION GRAPHICS: holographic gold-on-black glass panels with glowing 1px edges, floating cards with soft shadows, gold-dust particle bursts, light-sweep scan lines, wireframe-to-solid morphs, charts drawn in pure light, a shield-with-tick badge. Panels obey physics: they fly in with slight overshoot and settle with a micro-bounce. ALL GRAPHICS ARE ABSTRACT SHAPES AND ICONS ONLY — perfectly blank, zero letters, zero digits, zero words, zero currency symbols anywhere in frame.
GRADE: rich contrast, warm gold highlights, ivory whites, filmic roll-off, fine grain. Premium fintech meets luxury jewellery. Photoreal skin texture and real metal specularity. No on-screen text, no captions, no logos, no watermarks in frame."""

CHAR = """CHARACTER LOCK — "AARYA", the Shivaa host. The SAME woman in all three shots; match reference image 1 exactly.
Indian woman, 30 years old, warm wheatish skin with natural texture and a light sheen, oval face, high cheekbones, strong groomed brows, direct dark-brown eyes, glossy black hair in a sleek centre-parted low bun with no flyaways, minimal polished makeup, soft berry lip, small gold studs.
WARDROBE LOCK: tailored ivory raw-silk kurta with a fine gold zari placket and one thin gold chain, sleeves to mid-forearm. No other jewellery, no dupatta.
PERFORMANCE LOCK: a confident business partner, not a model. Crisp posture, purposeful hand gestures that physically trigger the holograms — a flick opens a panel, an open palm summons a card, a fingertip tap verifies. Direct unbroken eye contact with the lens in every close framing. Warm but decisive micro-expressions: a quick brow lift on the hook, a proud half-smile on the payoff. She never sways or drifts.
Identical face, hair, wardrobe and energy in every shot. Do not restyle, do not age, do not change body type."""

WORLD_A = """PLATFORM LOCK — VERSION A, "THE DOORWAY". The same holographic world in all three shots: AARYA stands in a black-glass studio surrounded by floating gold interface elements — a tall scrolling GRID WALL of hundreds of tiny jewellery thumbnails, a rising LINE-CHART of light, a stack of BULLION bars, a wireframe-to-solid RING, a SHIELD-WITH-TICK badge, and a multi-panel DASHBOARD that unfolds in depth. Recurring motif: a tall vertical seam of gold light behind her that reads like a closed doorway and finally opens in shot 3. Everything is gold-on-black glass with glowing edges and a soft floor reflection. Purely abstract — bars, lines, icons and thumbnails only, never letters, digits, labels or prices; all copy is added later in the edit."""

WORLD_B = """PLATFORM LOCK — VERSION B, "THE SCALE". The same holographic world in all three shots: AARYA stands in a black-glass trading floor with floating gold elements — a giant slow-turning BALANCE SCALE of light hanging in the haze behind her, a scrolling GRID WALL of jewellery thumbnails, BULLION bars on a weighing pan, a spark-throwing FORGE hologram where designs are struck into gold, a SHIELD-WITH-TICK badge, and a wide DASHBOARD that unfolds into an arena of panels. The scale tips, balances and locks level on key beats. Everything is gold-on-black glass with glowing edges and floor reflections. Purely abstract — shapes, icons and sparks only, never letters, digits, labels or prices; all copy is added later in the edit."""

NEG = """NEGATIVE PROMPT:
text, letters, words, numbers, digits, currency symbols, UI labels, subtitles, captions, logos, watermarks, price tags, deformed hands, extra fingers, six fingers, mangled jewellery, floating limbs, plastic skin, waxy over-smoothed face, beauty-filter look, cheap stock-video feel, flat grey blacks, muddy shadows, oversaturated orange, HDR halo, strobing, flicker, low-resolution holograms, cluttered background, crowds, cartoon, anime, CGI plastic look"""

VERT = """FRAMING: native 9:16 vertical. AARYA and the hero graphic sit in the central safe area; head room in the top eighth; the bottom fifth stays clean for burned-in captions. Nothing important below 80 percent of frame height."""

OUTRO_BODY = """3-second luxury logo plate. No people, no jewellery, no text of any kind.
0.0-1.2 s: from a full-frame wash of warm golden light, liquid molten gold flows inward from every edge and settles into a calm, deep charcoal-black velvet background.
1.2-2.2 s: fine gold particles drift and settle; a soft specular shimmer sweeps once from left to right across the centre; a faint circular gold vignette forms in the exact middle, leaving that centre CLEAN, EMPTY and uncluttered.
2.2-3.0 s: everything settles and holds perfectly still — an empty elegant dark-gold frame with a soft central glow and gentle grain. Absolutely nothing in the centre of frame.
AUDIO: one deep cinematic gold-shimmer swell resolving into silence, with a single soft chime on the last beat."""

OUTRO_SETUP = ("FLOW SETUP — Frames to Video: last frame of shot 3 (the golden bloom) as the first frame. "
               "Generate 4 s, trim to 3 s.\nDO NOT prompt the Shivaa logo — Veo garbles letterforms. "
               "The centre stays empty and the real logo PNG is composited there in the edit.")

A = {
"shot1-hook-catalogue.txt": ("""SHOT 1 of 3 — VERSION A · "WHAT THE WHOLE MARKET COULD NOT GIVE YOU" (0-10 s). One unbroken take, no cuts, energy rising throughout.
VO BEING SPOKEN OVER THIS SHOT (do not render as text, it is added in the edit): "कल तक जो पूरे बाज़ार में नहीं मिलता था, आज एक स्क्रीन पर हाज़िर है — दो लाख डिज़ाइन, उँगलियों के इशारे पर।"
0.0-1.2 s: pitch black. One gold spark ignites dead centre and detonates into a ring of gold dust that rushes past the lens. Through the dust AARYA snaps into focus, chest-up, rim-lit, eyes locked to camera, one brow lifting.
1.2-3.0 s: she flicks two fingers upward. On that beat a colossal holographic GRID WALL of hundreds of tiny gold jewellery thumbnails erupts upward behind her — rings, chains, mangalsutras, bangles, bridal sets — scrolling fast, each tile catching light. Camera pushes in 20 percent and decelerates hard.
3.0-5.0 s: camera arcs 20 degrees left; the wall keeps scrolling; gold dust streaks through the shafts; her head follows the lens, holding eye contact. Behind the wall a faint tall vertical seam of gold light glows — a closed doorway.
5.0-7.0 s: she rotates her palm; the grid reorganises with a liquid ripple into neat clusters that lock with a micro-bounce; a bright scan line sweeps the wall top to bottom.
7.0-8.6 s: three blank gold filter chips fly up beside her hand and snap into a row; she taps the middle one and the wall dives one level deeper — a wave of fresh thumbnails rushing toward camera, stopping just short of the lens.
8.6-10.0 s: everything collapses inward with a suction whoosh into a single glowing gold card that lands in her open palm. She raises it to chest height, looks straight down the lens and gives one decisive nod. Hold, absolutely still.
AUDIO: no dialogue in frame. 120 BPM cinematic percussion with a rising synth-and-santoor hook; deep sub-drop on the grid eruption; tight digital whooshes on each move; a crystalline chime as the card lands.""",
 "FLOW SETUP — Ingredients to Video. Refs: 1) host face 2) a jewellery catalogue grid 3) a dark gold studio still. Veo 3.1 Quality, 9:16, 1080p. Generate 8 s, press Extend once, trim to 10 s."),

"shot2-desk-services.txt": ("""SHOT 2 of 3 — VERSION A · "EVERY DEAL, ONE DESK" (10-20 s). Continue seamlessly from the previous last frame. One unbroken take, four hard beats.
VO BEING SPOKEN OVER THIS SHOT (never rendered as text): "बुलियन का सौदा, कारीगरी की फ़रमाइश, वेस्टेज पर ख़रीद, डेड स्टॉक की विदाई — नक़दी हो या आर.टी.जी.एस., रास्ता कभी बंद नहीं।"
0.0-2.2 s: the gold card in her palm shatters into particles that reassemble beside her as a slow-rotating stack of 22K BULLION bars and coins, stacking themselves on the beat. Behind her a LINE CHART of pure light draws itself upward and to the right; she glances at it, unimpressed and in control, then back to the lens.
2.2-4.6 s: she sweeps her hand right — hard settle — and a CUSTOM ORDER hologram takes its place: a gold line-art ring sketch extrudes into a rotating wireframe, then skins into a photoreal finished ring that spins once and faces camera. Macro snap-in on the ring for 0.4 s, then back out to her proud half-smile.
4.6-7.2 s: she pivots left; a tray of dull, scratched, slow-moving DEAD STOCK slides in from the frame edge. A bright horizontal scan bar passes over it and in its wake the tired pieces dissolve into gold particles that re-form as a clean stack of bright bullion rising upward. She watches it rise, then turns to the lens.
7.2-10.0 s: two icons of gold light rise either side of her — a bank-transfer arrow and a cash bundle. Both pulse once, then a tick stamps into each with a particle burst. She opens both hands, squares her shoulders to the lens and holds a closing expression that says "either way, we are ready". Freeze on that pose.
AUDIO: same 120 BPM bed, heavier, with a low brass swell: metallic clinks as bullion stacks, a digital morph whoosh on the ring, a deep sweeping scan on the transformation, two crisp lock-in clicks on the ticks.""",
 "FLOW SETUP — Frames to Video: last frame of shot 1 becomes the first frame. Same 3 ingredients. 8 s + Extend once, trim to 10 s."),

"shot3-gst-cta.txt": ("""SHOT 3 of 3 — VERSION A · "THE DOORWAY OPENS" (20-30 s). Continue from the previous last frame. One unbroken take, biggest payoff of the film.
VO BEING SPOKEN OVER THIS SHOT (never rendered as text): "जी.एस.टी. नंबर डालिए, दरवाज़ा खुल गया — पूरी मंडी अब आपकी मुट्ठी में। शिवा।"
0.0-2.0 s: a tall vertical VERIFICATION PANEL of gold light rises in front of AARYA — a blank document card with a shield outline, edges glowing. She raises one finger with intent.
2.0-3.5 s: she taps it. A hard bright scan line runs top to bottom leaving a trail of gold particles; the room dims for a beat so the panel is the only light on her face.
3.5-5.5 s: the shield floods with gold and a large clean TICK strikes into it with a particle burst; a shock-ring of light expands and blows past the camera. Her face catches the flash; she breaks into a real, warm smile.
5.5-8.0 s: behind her the tall seam of gold light SPLITS OPEN like a doorway, and through it the full floating DASHBOARD unfolds in depth — rate chart, order cards, a ledger column, a catalogue grid — arranging around her with staggered micro-bounces. Camera orbits 25 degrees while she scans the panels and locks back onto the lens.
8.0-10.0 s: she steps forward into a clean chest-up hero framing, holds unbroken eye contact and gives a decisive, welcoming nod; behind her the whole dashboard collapses into a vortex of gold particles that rushes at the camera and blooms into a full-frame sheet of warm golden light.
AUDIO: the bed peaks — a rising riser into the tap, a bright impact and shimmer on the tick, a warm triumphant brass-and-strings resolve as the doorway opens, ending on one sustained golden note as the frame blooms.""",
 "FLOW SETUP — Frames to Video: last frame of shot 2 becomes the first frame. Same 3 ingredients. 8 s + Extend once, trim to 10 s. The English pay-off line lands here in the edit."),

"outro-logo-plate.txt": (OUTRO_BODY, OUTRO_SETUP),
}

B = {
"shot1-hook-catalogue.txt": ("""SHOT 1 of 3 — VERSION B · "CHOICE WINS" (0-10 s). One unbroken take, no cuts, swagger and speed.
VO BEING SPOKEN OVER THIS SHOT (do not render as text, it is added in the edit): "तिजोरी बड़ी हो या दुकान छोटी — जीतता वही है जिसके पास चॉइस हो। दो लाख डिज़ाइन, एक ही जगह।"
0.0-1.0 s: black. A giant BALANCE SCALE of gold light swings into frame from above and tips hard left with a metallic clang; the motion blows gold dust at the lens.
1.0-2.6 s: AARYA strides one step into the light from frame right and stops dead on the beat, chest-up, chin level, eyes straight down the lens, a half-smile of complete certainty. Camera settles with her.
2.6-4.6 s: she raises one open palm; the empty pan of the scale fills instantly with hundreds of tiny gold jewellery thumbnails pouring in like coins — rings, chains, bangles, bridal sets — and the beam swings level with a bright lock-in flash.
4.6-6.8 s: the filled pan expands outward into a towering scrolling GRID WALL of designs that wraps around her in a shallow arc; camera arcs 25 degrees right through the haze, thumbnails flaring as they pass the light.
6.8-8.6 s: she draws a fingertip across the air; a scan line follows it and the wall re-sorts into clean clusters that snap with a micro-bounce, each cluster throwing a puff of gold dust.
8.6-10.0 s: the entire wall implodes into a single glowing gold card that slaps into her palm; she closes her fist around it, drops the fist to her side and holds, lens-locked and unblinking.
AUDIO: 120 BPM percussion with a deep dhol accent and a rising synth; a metallic scale-clang on the tip, a coin-cascade rush as the pan fills, a hard sub-hit on the lock-in, a crystalline snap as the fist closes.""",
 "FLOW SETUP — Ingredients to Video. Refs: 1) host face 2) a jewellery catalogue grid 3) a dark gold studio still. Veo 3.1 Quality, 9:16, 1080p. Generate 8 s, press Extend once, trim to 10 s."),

"shot2-desk-services.txt": ("""SHOT 2 of 3 — VERSION B · "WEIGH IT, FORGE IT, CLEAR IT" (10-20 s). Continue seamlessly from the previous last frame. One unbroken take, four rapid-fire beats, each landing on a downbeat.
VO BEING SPOKEN OVER THIS SHOT (never rendered as text): "सोना चाहिए? तोल लीजिए। डिज़ाइन सोचा है? गढ़वा दीजिए। पुराना माल अटका है? निकाल दीजिए — भुगतान जैसा मर्ज़ी, सौदा वैसा ही पक्का।"
0.0-2.4 s: she opens her fist; the card bursts into particles that land as 22K BULLION bars stacking onto the weighing pan beside her. The beam dips and settles; a line chart of light draws itself upward behind her shoulder. She glances at the pan, satisfied, then to the lens.
2.4-5.0 s: she snaps her fingers — a FORGE hologram ignites on the opposite side: a gold line-art sketch extrudes into a spinning wireframe ring, sparks fly as a hammer of light strikes it twice, and it skins into a photoreal finished gold ring. Macro snap-in on the ring for 0.4 s, back out to her proud look.
5.0-7.4 s: she flicks her wrist dismissively toward a tray of dull, scratched, unsold DEAD STOCK sliding in from the frame edge. A hard scan bar sweeps it; the tired pieces dissolve into particles and re-form as bright new bullion that rises and lands on the pan, tipping the beam her way.
7.4-10.0 s: two icons of gold light rise either side of her — a bank-transfer arrow and a cash bundle. They pulse, then a tick stamps into each with a particle burst and the scale locks perfectly level between them. She spreads both hands, squares to the lens and holds a confident closing pose.
AUDIO: heavier 120 BPM bed with a low brass swell: metal clinks as bullion stacks, two anvil strikes on the forge, a deep sweeping scan on the transformation, two crisp lock-in clicks and a settling chime as the beam balances.""",
 "FLOW SETUP — Frames to Video: last frame of shot 1 becomes the first frame. Same 3 ingredients. 8 s + Extend once, trim to 10 s."),

"shot3-gst-cta.txt": ("""SHOT 3 of 3 — VERSION B · "IDENTITY VERIFIED, THE MARKET IS YOURS" (20-30 s). Continue from the previous last frame. One unbroken take, the biggest payoff of the film.
VO BEING SPOKEN OVER THIS SHOT (never rendered as text): "जी.एस.टी. डालिए, पहचान पक्की। दरवाज़े के उस पार — पूरा बाज़ार। शिवा।"
0.0-1.8 s: the balance scale dissolves into particles that re-form as a tall VERIFICATION PANEL of gold light directly in front of her — a blank document card with a shield outline. She lifts one finger, absolutely certain.
1.8-3.4 s: she taps. A hard scan line runs top to bottom with a trail of gold particles; the room dims so the panel is the only light on her face; her eyes stay on the lens.
3.4-5.4 s: the shield floods with gold, a large clean TICK strikes in with a particle burst and a shock-ring of light blows past the camera. She breaks into a real, warm smile.
5.4-8.0 s: the panel explodes outward into a wide ARENA of floating dashboard panels that surround her in depth — rate charts, order cards, a ledger column, a catalogue grid — each snapping in with a micro-bounce. Camera pulls back and orbits 25 degrees, revealing how much surrounds her, then pushes back in.
8.0-10.0 s: she steps forward into a clean chest-up hero framing, holds unbroken eye contact and gives one decisive, welcoming nod; the entire arena collapses into a vortex of gold particles rushing at the camera and blooming into a full-frame sheet of warm golden light.
AUDIO: peak of the bed — riser into the tap, bright impact and shimmer on the tick, triumphant brass-and-strings as the arena opens, resolving on one sustained golden note as the frame blooms.""",
 "FLOW SETUP — Frames to Video: last frame of shot 2 becomes the first frame. Same 3 ingredients. 8 s + Extend once, trim to 10 s. The English pay-off line lands here in the edit."),

"outro-logo-plate.txt": (OUTRO_BODY, OUTRO_SETUP),
}

for folder, shots, world, title in (("version-a", A, WORLD_A, 'VERSION A — "MANDI KA DARWAAZA"'),
                                    ("version-b", B, WORLD_B, 'VERSION B — "TARAAZU"')):
    d = HERE / folder; d.mkdir(parents=True, exist_ok=True)
    for name, (body, setup) in shots.items():
        parts = [f"### SHIVAA · {title} · {name.replace('.txt','').upper()}", setup, "",
                 "--- PASTE EVERYTHING BELOW THIS LINE INTO GOOGLE FLOW ---", "", PREFIX, ""]
        if "outro" not in name:
            parts += [CHAR, "", world, ""]
        parts += [body, "", NEG, "", VERT, ""]
        (d / name).write_text("\n".join(parts), encoding="utf-8")
        print("wrote", folder + "/" + name)
