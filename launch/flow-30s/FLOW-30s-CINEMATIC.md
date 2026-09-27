# SHIVAA INC. — THE MANGALSUTRA RANGE · 30-second cinematic film
### Google Flow (Veo 3.1) prompt pack — 3 shots × 10 s + 3 s logo outro

One continuous story · one locked character · all four designs marketed ·
logo watermark bottom-right on every frame · cinematic logo outro.

Ready-to-paste prompts: `prompts/shot1-range-reveal.txt`, `shot2-everyday.txt`,
`shot3-tradition.txt`, `outro-logo-plate.txt`.
Reference images for Flow: `refs/` (each design cropped clean out of your poster).

---

## 0 · How Flow actually behaves (read once — saves credits)

| Thing | Reality in Flow / Veo 3.1 | What we do |
|---|---|---|
| Clip length | base generation is **8 s** (4/6/8) | generate 8 s → press **Extend** once (+~7 s) → trim to 10 s in the edit |
| Character consistency | **Ingredients to Video**, up to **3 reference images** | same 3 refs on every shot + the CHARACTER LOCK text block |
| Shot-to-shot flow | **Frames to Video** (first/last frame) + Scene Extension | download shot N → use its **last frame** as the **first frame** of shot N+1 |
| Logos / text | Veo garbles real logos and letterforms | never prompt the logo — composite the real PNG in post (`assemble.sh`) |
| Aspect | native 16:9 **and** native 9:16 | render the Reel separately at 9:16, never crop |
| Audio | native 48 kHz music + SFX | keep dialogue out; lay the Hindi VO in the edit |

**Order of work:** Shot 1 → pick the best take → export its last frame → Shot 2 → … → outro.
Fixing continuity later costs more credits than getting the first frame right.

---

## 1 · Flow set-up (before you prompt)

1. New project → **Ingredients to Video** → model **Veo 3.1 Quality**, 1080p, 16:9.
2. Upload 3 ingredients and keep them attached to all three shots:
   - **REF-1 · Face** — your model's front-facing photo in good light (or `launch/omni-90s/assets/reference-presenter.jpg`).
   - **REF-2 · Product** — `refs/mangalsutra-range-poster.jpg` for shot 1; for a shot that features one design, swap in that design's own crop (`refs/design1-floral.jpg` … `design4-star-tassel.jpg`) — they are cropped free of all poster text, which stops Veo from hallucinating letters.
   - **REF-3 · Mood** — a warm ivory-and-gold jewellery ad still (diya, silk, cream backdrop).
3. Paste **PREFIX + CHARACTER LOCK + PRODUCT LOCK + shot body + negative prompt** — the prompt files already have them stacked in the right order.

---

## 2 · The four designs — locked details (same in every shot)

| # | Name used in prompts | Description locked into the prompt | Sells on |
|---|---|---|---|
| D1 | **PHOOL** | two small four-petal gold flowers on a double black-bead strand | lightest, everyday |
| D2 | **SOLITAIRE** | emerald-cut white zircon in a square gold bezel with a fine pave halo, single black-bead chain | modern, office |
| D3 | **TEEN BOONDH** | three pear-shaped white zircon drops in polished gold bezels, black beads flanking | trendy, evening |
| D4 | **TAARA** | round star-filigree medallion with a graduated gold tassel ending in two black beads | traditional, festive |

Common to all four, and repeated in the PRODUCT LOCK: **light weight · BIS-hallmarked gold with laser HUID ·
tiny glossy black beads on a fine gold cable chain · gold and black only — no silver, no rose gold, no coloured stones.**

> If this range is 18K rather than 22K, change the one word "22K" in the PREFIX of the four prompt files
> (and re-run `python3 launch/flow-30s/prompts/_build.py`). Nothing else references karat.

---

## 3 · The 30 seconds, and why it is built this way

| Time | Shot | Job | Designs marketed |
|---|---|---|---|
| 0–10 s | **THE RANGE** — diya flame runs along the beads, one continuous glide past all four pieces on ivory silk, ending on all four together | **Hook + range.** Macro gold in the first second is the highest-retention opener in this category; showing four pieces in one take says "collection", not "one product" | **D1, D2, D3, D4** |
| 10–20 s | **EVERY DAY** — mirror, doorway, workspace, chai; she wears a different design in each beat, one unbroken forward move | **Utility.** Mangalsutra buyers ask one silent question: *will I wear it daily?* Light weight, flat-lying, no snag — shown, never claimed | **D1, D2, D3** |
| 20–30 s | **THE BOND** — maroon saree, diyas, husband fastens the Taara, slow orbit, bloom to gold | **Emotion + close.** The category's real purchase trigger is the bond, not the gram weight. Ends on a clean white-gold bloom straight into the logo | **D4** |
| +3 s | **LOGO** | brand recall, URL | — |

Every design gets a hero beat, and every design is on screen at least twice.

---

## 4 · Continuity — the "one flow" rules (prefix is already in the files)

- All three shots share the same PREFIX, so grade, lens and camera language never jump.
- Shot 1 ends **top-down and still**; shot 2 begins on that exact frame → the cut reads as a dissolve, not a cut.
- Shot 2 ends on **warm evening light arriving**; shot 3 begins in that light → time passes without a jump.
- Shot 3 ends in a **golden bloom**; the outro plate begins in that bloom → the logo appears out of the gold itself.
- In the edit, `assemble.sh` places a **0.2 s dissolve** at each join, so the 30 s plays as a single breath.

---

## 5 · Watermark + outro + assembly

```bash
mkdir -p launch/flow-30s/raw
# download from Flow into launch/flow-30s/raw/ as: shot1.mp4 shot2.mp4 shot3.mp4 outro.mp4
bash launch/flow-30s/assemble.sh                 # 16:9 master  -> launch/out/Shivaa-Cinematic-30s.mp4
ASPECT=9x16 bash launch/flow-30s/assemble.sh     # reel        -> launch/out/Shivaa-Cinematic-30s-9x16.mp4
```

The script:
- trims each shot to **9.2 s** so that 3 shots + 3 s outro − 3 dissolves = **exactly 30.00 s** (`SHOT=10` if you'd rather have 33 s),
- joins with 0.2 s dissolves,
- composites the **Shivaa logo bottom-right on every single frame** (14 % of frame width, 72 % opacity, 3.5 % safe margin),
- composites the **large gold logo + `shivaa.in`** into the empty centre of the outro plate with a soft fade-in,
- normalises audio to **−14 LUFS / −1.5 dBTP**, fades the tail, writes a poster frame.

Verified end-to-end on this machine with stand-in clips: output lands at **00:00:30.00**, 1920×1080 / 1080×1920, 24 fps.

## 6 · Hindi voice-over (optional, 30 s — lay it over in the edit)

| Time | Hindi VO | English subtitle |
|---|---|---|
| 0–10 s | "मंगलसूत्र सिर्फ़ गहना नहीं… एक वादा है।" | A mangalsutra isn't jewellery. It's a promise. |
| 10–20 s | "इतना हल्का कि रोज़ पहनिए — और इतना ख़ास कि सब पूछें।" | Light enough for every day. Special enough that they'll ask. |
| 20–27 s | "हॉलमार्क सोना, खुली कीमत — शिवा का वादा।" | Hallmarked gold, an open price — the Shivaa promise. |
| 27–30 s | "शिवा इंक. — shivaa.in" | Shivaa Inc. — shivaa.in |

Duck the music 8 dB under the VO; keep VO peaks at −6 dB.

## 7 · Captions to post with it

- **Reel / Shorts:** मंगलसूत्र — रोज़ पहनने लायक, हर बार ख़ास ✨ हल्का वज़न · हॉलमार्क सोना · 4 नए डिज़ाइन · shivaa.in
  `#mangalsutra #goldmangalsutra #lightweightjewellery #dailywear #hallmarked #shivaa #jaipur`
- **YouTube title:** Shivaa Mangalsutra Range — Light Enough for Every Day | 30s Film
- **WhatsApp status line:** नया मंगलसूत्र कलेक्शन — 4 डिज़ाइन, हल्का वज़न, हॉलमार्क सोना. shivaa.in

## 8 · Fast fixes if a take goes wrong

| Problem | Add to the prompt |
|---|---|
| Face changes between shots | re-attach REF-1 **and** use the previous shot's last frame; add "identical face to reference image 1, do not restyle" |
| Pendant design drifts | swap REF-2 for that single design crop; add "the pendant is fixed by the reference image — do not invent motifs" |
| Beads render silver/grey | add "beads are deep glossy black, gold chain is warm yellow gold" |
| Veo writes text | strengthen the negative prompt; add "any screen, label or card in frame is blank and out of focus" |
| Motion too fast | add "single continuous take, one camera move only, gentle 50 % slow-motion feel" |
| Necklace floats / clips skin | add "the chain rests naturally on the collarbone with correct contact and weight" |
