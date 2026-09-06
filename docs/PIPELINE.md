# PIPELINE — AI design-to-product automation (reference)

```
raw/65rings.pdf ─► 01_ingest_pdf ─► 01b_ocr_tags (green tags → code + weight)
                        │
                        ▼
              work/designs.json  (65 designs: SKU, purity 22K, REAL grams,
                                  making %, sizes, tags, img path)
                        │
      ┌─────────────────┼──────────────────────┐
      ▼                 ▼                      ▼
02_normalize_data  03_photoshoot (4 shots)   04_render_video (10 s Ken Burns)
      │                 │                      │
      └─────────────────┴──────────┬───────────┘
                                   ▼
                    05_metadata (title/desc/tags/SEO per design)
                                   ▼
                    06_upload ──► POST /api/media (photos+video)
                                  POST /api/products (upsert by SKU)
```

## Stage usage
```bash
python3 01_ingest_pdf.py            # 1st run only (or after new PDFs)
python3 01b_ocr_tags.py --all       # OCR tag codes+weights → suppliers/*.csv
python3 tight_crop.py               # tag-free design crops → media/designs/
python3 02_normalize_data.py        # merge OCR × supplier sheets → designs.json
python3 03_photoshoot.py --limit N  # AI shots (needs REPLICATE_API_TOKEN / OPENAI_API_KEY)
python3 04_render_video.py --limit N # Ken-Burns films (ffmpeg)
python3 05_metadata.py --limit N    # per-design meta.json
python3 06_upload.py --all --dry-run  # review, then --all for live
```
`--only PGS5010` reruns one SKU; every stage is idempotent and keeps a
`work/ledger_*.csv` so nothing is repeated.

## Config (`demo65/config.json`)
- `paths.out_dir` = **`media`** — never name a media folder `out/`.
- `upload.base_url` → set to `https://shivaa.in` before `--live`.
- `upload.dry_run: true` by default (set `false` only after you see the payloads).
- `photoshoot.api_key_env` → `REPLICATE_API_TOKEN` or OpenAl-compatible key in a
  **env var**. Never in the repo.

## Scale-out
The same stages run for any supplier PDF (200+ suppliers, 3 lakh designs):
chunk by PDF, `--limit` per run, restart-safe ledgers, upsert-by-SKU uploads.
Watch: PyMuPDF is not thread-safe (per-thread `fitz.open()`, ≤3 workers);
OCR only ~44/65 designs complete → always run the visual-verification pass
and the contiguous-SKU check before uploading.

## Brand mark (logo on every shot and film)

Every generated still and every film carries the Shivaa logo in the **bottom-right
corner** (user directive, 6 Sep 2026). Source art: `cms/images/logo.png`.

**Stills** — `demo65/tools/brand_logo.py`:
```bash
cd demo65 && python3 tools/brand_logo.py            # stamp all unstamped shots
python3 tools/brand_logo.py --only PGS5001          # or a subset
```
* The unbranded master of each shot is preserved at `media/{SKU}/.orig/shot_*.jpg`;
  stamping is therefore repeatable and never compounds.
* Logo width = 26 % of image width, margin = 3.5 %, opacity 0.82. The white or
  navy variant is chosen automatically from the brightness of that corner, so it
  reads on both the ivory-silk studio shots and the dark editorial ones.
* A ledger at `work/branded.json` (path → md5) makes the run idempotent; newly
  generated shots are picked up on the next run.

**Films** — `pipeline/04_render_video.py` now overlays the same logo (on a soft
dark plate for legibility over moving footage) instead of the old `SHIVAA.IN`
drawtext watermark. Controlled by `config.json → video.kenburns.logo` and
`logo_width_pct`; remove `logo` to fall back to the text watermark. The renderer
always sources frames from `.orig/` when present, so the logo is composited once,
never twice.

**After generating new shots** the order is: `tools/brand_logo.py` → then
`04_render_video.py`.

## Story films — "a man tries the ring on" (v42, 6 Sep 2026)

User directive: the films must show a man **trying the ring on and how he feels
wearing it**, not a pan over catalogue stills. The old kenburns slideshow is
superseded (kept per design as `media/{SKU}/video_kenburns.mp4`).

**6-beat narrative** (prompts + timings in `config.json → video.story.beats`):

| beat | seconds | camera | what happens |
|---|---|---|---|
| `f1_reach`  | 1.9 | push-in      | he picks the ring out of the box |
| `f2_slide`  | 2.6 | slow push-in | **he slides it onto his finger** |
| `f3_fit`    | 2.0 | drift-left   | he flexes his hand, feeling the fit |
| `f4_admire` | 2.2 | push-out     | he turns his hand, admiring it |
| `f5_smile`  | 2.6 | slow push-in | **his reaction — quiet satisfaction** |
| `f6_hero`   | 2.0 | push-in      | hero macro on the fist |

The try-on and the reaction beats hold longest — that is where the feeling lands.
Total ≈ 11 s, 720x900 (4:5 portrait for the PDP gallery), 0.45 s dissolves,
Shivaa logo bottom-right throughout.

```bash
cd demo65
# 1. shoot the 6 story frames per design with generate_image, reference =
#    media/designs/{SKU}.jpg, prompts from config.json -> video.story.beats
# 2. cut the film
python3 tools/render_story.py --only PGS5041     # or no --only for every SKU
#    that has a story/ folder
```

**Every beat prompt carries a no-text guard** ("absolutely no text no words no
lettering…") — the image model otherwise hallucinates campaign words such as
"LEGACY" into the frame. Always eyeball the frames before cutting.

**Limitation, stated plainly:** this sandbox has no outbound network and no
text-to-video model, so these are real *cinematic cuts with camera motion over
generated frames*, not generative motion video. True AI motion (Kling/Runway/Veo)
would need `04_render_video.py --mode kling` with an API key and network access.

## v42 — VIDEO REMOVED · four-angle photo coverage (6 Sep 2026)

User directive: **no videos on the website.** Each design is sold on **4 photos
that between them show every angle and every detail.**

**Site changes (`cms/`)** — all video code deleted, assets bumped to `?v=42`:
* `js/app.js` — the PDP gallery is photo-only (the `<video>` slide, the "360° film"
  tag, the FILM badge on product cards and the video-aware autoplay pause are gone).
* `css/styles.css` — `.gal-vid`, `.gal-vid-tag`, `.pc-vid-badge` rules removed.
* `api.php` — `POST /api/media` now accepts **images only** (jpg/png/webp);
  the `uploads/videos/` branch is gone.
* `data/db.json` — the `video` field was stripped from all products.

**The four shots** (`config.json → photoshoot.shots`) are chosen for coverage,
not mood — together they show the face, both shoulders, the side height, the
band and the stone setting:

| # | key | what it must show |
|---|---|---|
| 1 | `front` | full face square to camera — complete stone setting |
| 2 | `angle` | 45° three-quarter — face + shoulder + depth of the setting |
| 3 | `side`  | side profile — setting height, shoulder engraving, inner band |
| 4 | `macro` | extreme close-up — individual stones, prongs, pavé, metal texture |

Every prompt names the reference image and demands *identical design, stone
layout, shank pattern and metal tones*, plus a no-text guard.

**Known weakness:** the `side` prompt does not reliably produce a true profile —
the model often returns another front-ish view. Check shot 3 per design and
re-roll it when it is not a genuine side view.

Old films remain on disk as `media/{SKU}/video*.mp4` and `story/` frames; they
are simply no longer referenced by the site. `tools/render_story.py` and the
`04_render_video.py` logo overlay are retained but unused.

### v42.1 — standardised first image + model shot

Final 4-shot spec (`config.json → photoshoot.shots`), in gallery order:

| # | key | role |
|---|---|---|
| 1 | `front` | **CATALOGUE PLATE — standardised.** Identical framing, scale, pure-white background and flat lighting for *every* ring. This is the listing-grid thumbnail. |
| 2 | `angle` | 45° three-quarter — face + shoulder + depth/thickness of the setting |
| 3 | `macro` | extreme close-up — stones, prongs, pavé, metal texture |
| 4 | `model` | **model photoshoot** — Indian male model wearing the ring, editorial |

**Why shot 1 is special:** on the listing page every tile must look like it came
from the same shoot, so the customer compares *designs*, not photography. The
prompt alone gets the style right but NOT the scale — one ring fills the frame,
the next sits small.

`tools/normalize_plate.py` fixes that deterministically after generation:

```bash
python3 tools/normalize_plate.py --media     # normalise every media/*/shot_front.jpg
```

It samples the backdrop from the image corners, finds the ring, rescales it so its
width is exactly **72 % of the canvas**, centres it on a clean 1200×1200 white
square and adds a soft contact shadow. Verified across 6 different rings: all
land at width 0.72, so the grid is uniform.

**Order of operations per design:** generate 4 shots → `normalize_plate.py`
→ `brand_logo.py` → upload.
