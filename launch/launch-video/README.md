# SHIVAA — Launch video builder (screen recording + webcam + motion graphics)

**Output:** `launch/out/Shivaa-Launch-Video.mp4` — 1920×1080, 30 fps, −14 LUFS.

## Structure
| section | what you see |
|---|---|
| 0 – INTRO | webcam full screen + animated **SHIVAA** title lower-third + corner watermark |
| INTRO – (end−OUTRO) | screen recording full frame + **circular webcam bubble** with a gold ring + 4 timed supers |
| last OUTRO sec | webcam full screen + closing CTA super |
| +3 s | brand end card: gold logo, "YOU NAME IT, WE HAVE IT.", shivaa.in |

Your webcam audio runs the whole film (high-pass, noise reduction, compression, loudness-normalised).
Optional music bed is side-chain ducked under your voice.

## Run
```bash
bash launch/launch-video/build.sh                      # defaults
INTRO=10 OUTRO=12 MAXLEN=90 bash launch/launch-video/build.sh
S1=3 S2=18 S3=34 S4=50 bash launch/launch-video/build.sh      # super cue times (sec into the demo)
MUSIC=media/bed.mp3 MUSVOL=0.12 bash launch/launch-video/build.sh
VERT=1 bash launch/launch-video/build.sh               # also writes a 9:16 cutdown
```
| env | default | meaning |
|---|---|---|
| `INTRO` / `OUTRO` | 8 / 8 | seconds of full-screen webcam at the start / end |
| `MAXLEN` | 90 | hard cap on the film length |
| `SCREEN_START` | 0 | skip this many seconds of the screen recording |
| `BUBBLE` | 0.30 | webcam bubble size as a fraction of frame height |
| `S1..S4`, `SUPLEN` | 2/14/26/38, 5 | super cue times and how long each stays |
| `END` | 3 | end-card length |
| `PRE` / `CRF` | medium / 18 | encode speed / quality |

The screen recording is auto-speed-matched to fill the demo section, so it never runs out or overruns.

## Supers (edit the copy in `make_gfx.py`)
`2,00,000+ DESIGNS` · `BULLION · CUSTOM ORDERS` · `DEAD STOCK OR NEW` · `VERIFY YOUR GST`
Text is English-only: this toolchain has no Devanagari font, so Hindi lives in your voice-over.
