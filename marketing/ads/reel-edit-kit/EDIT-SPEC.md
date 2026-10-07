# Shivaa Jewels — Reel Edit Kit (owner UGC, Jayal)

**Status:** production-ready kit, built 2026-10-06 on branch `arena/91f946d1-shivaa-ecom`.
**Source video:** `100601_1791300779339.mp4` (Google Drive id `1gSz5OVBrw0fv5B-2npGYPtGCOrZdtaa6`, 144 MB — link verified valid).
The kit was built **without** the source file (this sandbox's network cannot reach Google
or GitHub's release CDN), so caption timings are **provisional** (handoff §6 suggested
timeline). Re-time once the real audio is transcribed — §4 below, one-file change.

---

## 1. What is in the kit

```
reel-edit-kit/
├── EDIT-SPEC.md                 this document
├── timeline.json                THE single source of truth (blocks, timings, highlights)
├── make_captions.py             regenerates everything below from timeline.json
├── render.py                    one-command final render (video in → Reel out)
├── captions/
│   ├── shivaa-jewels-captions.ass   styled burn-in captions (libass)
│   └── shivaa-jewels-captions.srt   plain subtitles (same cues)
├── graphics/
│   ├── panels/cue-NN.png            per-cue deep-maroon translucent gradient backing
│   ├── offer-card.png               editorial offer card + mandatory disclaimer
│   ├── frame-accent.png             restrained gold corner framing
│   └── overlays.json                overlay schedule (start/end/x/y/rise/fades)
├── fonts/
│   ├── NotoSansDevanagari-SemiBold.ttf   the one approved font (instantiated wght=600)
│   └── Mukta-SemiBold.ttf                approved fallback only
├── logo/shivaa-logo.png           original logo, untouched (used once, in outro)
├── outro/
│   ├── make_outro_assets.py       builds the 4 full-frame outro cards + gold sweep
│   ├── render_outro.sh            assembles the 10 s cinematic outro
│   ├── OUTRO-VO-SCRIPT.txt        owner voice-over lines with timecodes
│   └── *-card.png / sweep.png     generated cards
└── preview/
    ├── shivaa-jewels-STYLE-PREVIEW.mp4      50 s caption/graphics motion proof (stand-in bg)
    └── shivaa-jewels-outro-10s-PREVIEW.mp4  10 s outro with placeholder exterior
```

Regenerate after any timing/text change:

```bash
python3 make_captions.py        # needs Pillow (+ fonttools only to re-instantiate fonts)
```

## 2. Final render (where the video lives)

```bash
python3 render.py /path/to/100601_1791300779339.mp4 shivaa-jewels-final.mp4
# optional voice-safe loudness + export baked in:
#   1080×1920 · 30 fps · H.264 crf 18 · AAC 192 k · loudnorm −14 LUFS · +faststart
bash outro/render_outro.sh /path/to/shop-exterior.jpg shivaa-jewels-outro-10s.mp4 vo.m4a
```

Requirements: any recent `ffmpeg` with libass (the static johnvansickle build, e.g. via
`pip install imageio-ffmpeg`, works — verified), Python 3 + Pillow. Bundled font is passed
via `fontsdir`, so **no font installation is needed** and Devanagari shaping (matras,
conjuncts) renders correctly — verified frame-accurately.

If the 144 MB file must travel through GitHub (100 MB per-file cap), make the approved
≤100 MB high-quality proxy first, then render from it:

```bash
ffmpeg -i 100601_1791300779339.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" \
  -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart shivaa-proxy-95mb.mp4
```

## 3. Style law implemented (handoff §7–§10)

- **One font only:** Noto Sans Devanagari SemiBold (Mukta SemiBold as fallback only). No decorative faces.
- **Colour:** ivory `#F5EFE0` captions · muted gold `#D4AF69` keywords + refined gold underline ·
  deep-maroon translucent gradient backing · no neon/red/rainbow/emoji anywhere.
- **Layout:** ≤2 lines per cue, lower-centre safe area (text bottom y=1470 of 1920 →
  clear of Reels controls), max text width 900 px, generous line spacing (full hhea line box).
- **Motion:** fade-in 210 ms + 22 px upward reveal over 340 ms + clean fade-out 260 ms;
  a very light blurred glow under-layer; keyword emphasis = gold + underline only.
  No bounce/spin/shake/elastic/zoom-pops/stickers.
- **Highlights only when spoken:** जायल · दुल्हन के आभूषण · हॉलमार्क · सही वजन · मेकिंग चार्ज ·
  20 प्रतिशत · ब्लैक मेंबरशिप कार्ड. Grapheme-safe: highlights never split a matra from its base.
- **Offer card:** clean editorial maroon card, thin gold rule, gold `20%`, plus the two
  mandatory disclaimer lines in small readable type. Never implies 20 % off total value.
- **Logo:** original file, pasted pixel-for-pixel (single LANCZOS scale), once, inside a clean
  ivory rectangle with a thin gold rule — outro only. Never redrawn, duplicated or annotated.
- **Outro (10 s):** exterior → push-in + gold light sweep → logo card → three checks
  (हॉलमार्क / सही वजन / मेकिंग चार्ज) → CTA card with **89050 05921** and मेन रोड, जायल.
  Responsible urgency only — no claims that customers will be cheated elsewhere.
- **Outro VO:** bundled AI Hindi voice (`outro/vo-ai-hindi.mp3`) per owner decision
  2026-10-07; owner's own recording remains an optional drop-in replacement.
  The main reel always keeps the owner's original on-camera UGC voice (never replaced).

## 4. Re-timing to the REAL spoken audio (do this first when the video arrives)

1. Inspect: `ffprobe -show_format -show_streams 100601_1791300779339.mp4`
   (expect ≈50 s, 9:16 phone video; confirm rotation metadata).
2. Transcribe locally (any machine with internet):
   ```bash
   pip install faster-whisper
   python - <<'PY'
   from faster_whisper import WhisperModel
   m = WhisperModel("small", device="cpu", compute_type="int8")
   for s in m.transcribe("100601_1791300779339.mp4", language="hi")[0]:
       print(round(s.start,2), round(s.end,2), s.text)
   PY
   ```
3. Compare against the approved script (handoff §5). Correct **spelling to the approved
   Hindi**, keep the owner's spoken order; never invent new lines.
4. Edit only `timeline.json` → `start`/`end` of each block (text stays approved wording).
5. `python3 make_captions.py && python3 render.py VIDEO shivaa-jewels-final.mp4`
   Wrapping, panels, SRT, ASS and the overlay schedule all regenerate deterministically.

Deliverables keep the mandated names: `shivaa-jewels-final.mp4`,
`shivaa-jewels-captions.srt`, `shivaa-jewels-captions.ass`.

## 5. Guardrails

- Never use the watermarked stock photos found at repo root (`98af24b2…jpg`,
  `94aa472b…jpg` carry a third-party "Nakoda" watermark — not Shivaa assets).
  Usable brand imagery in repo: `cms/images/banners/poster-bridal.jpg` (bridal set),
  `cms/images/logo.png` (logo).
- Shop-exterior photo is **not** in the repo — supply it to `render_outro.sh`; until then
  the placeholder card is used and clearly says so.
- Captions must never cover the owner's face, the jewellery, the shop sign or the logo:
  the safe-area constants live in `timeline.json → meta.safe_area`.
