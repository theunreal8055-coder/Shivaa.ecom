# SHIVAA — showroom unboxing reel · Google Flow (Veo 3.1) prompt pack
### Rebuilt from your reference `Video-86318.mp4`

Ready-to-paste prompts: `prompts/01-…` to `prompts/08-outro-logo-plate.txt`
(edit `prompts/_build.py` and re-run it to change anything globally).

---

## 1 · What the reference actually is (measured, not guessed)

| Property | Reference |
|---|---|
| Length | **52.52 s** |
| Frame | **720×1280**, 9:16, **30 fps**, H.264 |
| Audio | music bed only, no dialogue (HE-AAC 64 kbps) |
| Cuts | ~23 scene changes — but they are **soft cuts inside one continuous story**, not a montage |
| Branding | competitor logo top-right + `@handle` watermark bottom-centre, every frame |
| Grade | bright, warm, high-clarity retail look — *not* a dark moody film |

**Its story (this is what actually makes it work):**
brown branded shopping bags on the counter → the white presentation box comes out →
box opens, gold set inside → she lifts the haram and compares it on the display bust →
mirror moment, the choker is fastened for her → full reveal to camera →
macro details on the saree, bangles, jhumka → a run of happy poses → hold on a smile.

It is an **unboxing-to-wearing journey**, shot in *one* location with *one* model and *one* set.
That is the format we are copying — not the brand.

## 2 · Our version — shot map (7 shots × 8 s + 3 s logo)

| # | Prompt file | Beat | Ref time |
|---|---|---|---|
| 1 | `01-bags-on-counter.txt` | hands + brown Shivaa bags on the marble counter | 0–5 s |
| 2 | `02-box-reveal.txt` | white box out of the bag, she opens the lid, light on her face | 5–12 s |
| 3 | `03-necklace-lift.txt` | the temple set in the box; the haram lifted and held up | 12–18 s |
| 4 | `04-mirror-wear.txt` | mirror; the choker is fastened at her nape | 18–26 s |
| 5 | `05-portrait-reveal.txt` | full set reveal, push-in to camera, light bloom | 26–34 s |
| 6 | `06-detail-macros.txt` | macros: haram on silk, bangles, jhumka, rack focus to her eyes | 34–42 s |
| 7 | `07-poses-close.txt` | the poses run, ending in a golden bloom | 42–52 s |
| 8 | `08-outro-logo-plate.txt` | empty gold plate → our logo is composited on it | — |

Veo generates **8 s** per clip, so 7 × 8 = 56 s. Trim to **49.5 s + 3 s outro = 52.5 s**
(exactly the reference length) — or cut it tighter, which I recommend: **7 s per shot = 49 s + 3 s = 52 s**,
or a punchier **35 s** version by dropping shots 1 and 6.

## 3 · The locks (already inside every prompt file)

- **PREFIX** — bright warm showroom, fast prime, shallow DOF, slow handheld-smooth moves, retail-commercial grade. Identical in all 7 so nothing jumps between shots.
- **CHARACTER LOCK "PRIYA"** — one woman, Kanjeevaram silk saree, green glass bangles, hair open, small bindi; locked face, hair, wardrobe.
- **PRODUCT LOCK** — Shivaa 22K temple bridal set: long haram + choker + jhumkas + 2 bangles, antique finish, ruby/emerald kundan accents.
- **PACKAGING LOCK** — deep brown matte bag with gold-foil border + cream-white velvet-lined box, **blank** (no letters — Veo cannot spell a brand name; the logo goes on in post).
- **CONTINUITY** — every shot after the first starts from the **last frame of the previous one** (Flow → Frames to Video), so the whole reel reads as one take, exactly like the reference.

## 4 · Flow set-up

1. New project → **Ingredients to Video** → Veo 3.1 Quality → **9:16**, 1080p.
2. Three ingredients, attached to all 7 shots:
   - REF-1 your model's face photo,
   - REF-2 a clean photo of the actual temple set you are selling,
   - REF-3 a bright warm showroom interior still.
3. Shot 1: paste, generate, pick the best take.
4. Shots 2–7: download the previous shot, take its **last frame**, load it as the first frame, paste the next prompt.

## 5 · Assembly (watermark, logo outro, audio)

```bash
mkdir -p launch/flow-reel-showroom/raw     # put shot1.mp4 … shot7.mp4 + outro.mp4 here
bash launch/flow-reel-showroom/assemble.sh          # 9:16 reel
ASPECT=16x9 bash launch/flow-reel-showroom/assemble.sh
```
The script is the same proven one used for the mangalsutra film (`launch/flow-30s/assemble.sh`),
extended to 7 shots: 0.2 s dissolves, **Shivaa logo bottom-right on every frame**, dark-plate logo outro
with `shivaa.in`, −14 LUFS audio, poster frame.

## 6 · Copy for the post

- **Hindi VO (optional, 3 lines):** "जो डिब्बा खुलता है, उसमें सिर्फ़ सोना नहीं — सालों का भरोसा होता है।" ·
  "22 कैरेट, हॉलमार्क, HUID — और कीमत बिलकुल खुली।" · "शिवा। shivaa.in"
- **Caption:** मंदिर-डिज़ाइन ब्राइडल सेट ✨ 22K · हॉलमार्क · HUID · खुली कीमत · shivaa.in
  `#templejewellery #bridalgold #22kgold #haram #jhumka #hallmarked #shivaa`

## 7 · Two things I deliberately did NOT copy

1. **Their music** — copyrighted. Use a licensed track or Veo's own bed; the prompts already
   describe the right mood so the generated audio sits close to the reference.
2. **Their logo, name and `@handle` watermark** — replaced by the Shivaa mark bottom-right
   and the Shivaa logo outro. Everything else (structure, pacing, camera language, grade) is matched.
