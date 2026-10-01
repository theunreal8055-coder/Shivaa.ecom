#!/usr/bin/env python3
"""Shivaa Inc. — 90s animated explainer.

Builds TWO copy-paste prompt packs from script.json:
  launch/omni-90s/reel-9x16/     clip-01..09.txt  (Instagram Reel / Shorts)
  launch/omni-90s/youtube-16x9/  clip-01..09.txt  (YouTube)
Each pack also gets VO-HINDI.txt, HOW-TO.md and the logo + face assets.

    python3 launch/omni-90s/build_packs.py
"""
import json
import pathlib
import shutil

HERE = pathlib.Path(__file__).resolve().parent
DATA = json.loads((HERE / "script.json").read_text(encoding="utf-8"))
ASSETS = HERE / "assets"

SPEECH_WINDOW = 8.5      # of the 10.00s clip
WORDS_PER_SEC = 2.7

TEMPLATE = """OMNI 1.1 FLASH — SHIVAA INC. — 90s ANIMATED EXPLAINER ({fmt_name}) — CHAPTER {n} OF 9 ({t})
DURATION: EXACTLY 10.00 SECONDS · {fmt_spec} · 24fps · AUDIO ON
ATTACH TO THIS PROMPT: (1) the host reference image, (2) the Shivaa Inc. logo PNG.

===== 1. CHARACTER LOCK =====
{character_lock}

===== 2. EXPLAINER FILM LOCK =====
{prefix}

===== 3. FORMAT & LAYOUT =====
{layout}

===== 4. THIS CHAPTER — {beat} =====
{graphics}

===== 5. ON-SCREEN TEXT (English only, exact spelling) =====
Chapter headline: {headline_en}
Plus only the short graphic labels named in section 4. Nothing else is written on screen.
No Devanagari, no subtitles, no invented words, no duplicated lines.

===== 6. PERMANENT WATERMARK =====
The attached Shivaa Inc. logo, bottom-right corner, about 9% of frame width, soft gold,
~70% opacity, completely static, visible in EVERY frame of these 10 seconds, never covered
by the host or by any animation, clean margin from both edges.{wm_extra}

===== 7. SHE SPEAKS — exactly this Hindi, lip-synced, nothing else =====
"{line_hi}"
(Pronunciation reference only, never shown: {line_roman})
{speech_note}

===== 8. SOUND =====
SCORE: {score}
SFX: soft, tasteful UI whooshes and clicks timed to the graphics. No comedy sounds, no cartoon boings.

===== 9. CONTINUITY =====
{continuity}
"""


def main() -> None:
    scenes = DATA["scenes"]
    packs = {
        "youtube-16x9": ("YOUTUBE 16:9", "1920x1080 horizontal", DATA["layouts"]["youtube"],
                         ""),
        "reel-9x16": ("REEL 9:16", "1080x1920 vertical", DATA["layouts"]["reel"],
                      " Keep it just above the bottom 12% app-UI safe strip."),
    }

    rows = []
    for folder, (fmt_name, fmt_spec, layout, wm_extra) in packs.items():
        out = HERE / folder
        out.mkdir(parents=True, exist_ok=True)
        vo = []
        for i, s in enumerate(scenes):
            if s["n"] == 9:
                note = ("Speak it inside the FIRST 7.0 seconds. The last 3.0 seconds are the "
                        "finished logo lock-up and music only — no speech, no movement.")
                cont = ("FINAL CHAPTER. Same studio and same music as chapter 8 — the graphics from "
                        "all previous chapters converge here. End on the finished, static logo "
                        "lock-up. Do not cut to black before 10.00s.")
            elif i == 0:
                note = (f"Speak it inside the first {SPEECH_WINDOW}s at a clear teaching pace, "
                        "ending with a small breath.")
                cont = ("FIRST CHAPTER — establish the host, the studio, the graphic style, the "
                        "music and the watermark that all 8 following chapters must match exactly.")
            else:
                note = (f"Speak it inside the first {SPEECH_WINDOW}s at a clear teaching pace, "
                        "ending with a small breath.")
                cont = (f"Continue directly from chapter {s['n'] - 1}: same studio, same host "
                        "position and size, same lighting, same graphic style, same music bed, "
                        "same watermark. No fade to black, no new intro, no restart.")

            text = TEMPLATE.format(
                fmt_name=fmt_name, fmt_spec=fmt_spec, n=s["n"], t=s["t"],
                character_lock=DATA["character_lock"],
                prefix=DATA["prefix"].replace("CHAPTER N", "CHAPTER %d" % s["n"]),
                layout=layout, beat=s["beat"], graphics=s["graphics"],
                headline_en=s["headline_en"], wm_extra=wm_extra,
                line_hi=s["line_hi"], line_roman=s["line_roman"],
                speech_note=note, score=s["score"], continuity=cont,
            )
            (out / f"clip-{s['n']:02d}.txt").write_text(text, encoding="utf-8")
            vo.append(f"{s['n']}. [{s['t']}] {s['line_hi']}")

            if folder.startswith("youtube"):
                words = len([w for w in s["line_hi"].replace("—", " ").split() if w.strip("।,?-")])
                rows.append((s["n"], s["t"], words, words / WORDS_PER_SEC, s["beat"]))

        (out / "VO-HINDI.txt").write_text("\n".join(vo) + "\n", encoding="utf-8")
        for asset in ("logo-shivaa-gold.png", "logo-shivaa-navy.png", "logo-shivaa-white.png",
                      "reference-presenter.jpg"):
            src = ASSETS / asset
            if src.exists():
                shutil.copy(src, out / asset)

    print(f"{'ch':<4}{'window':<16}{'words':<7}{'~speech':<10}beat")
    for n, t, w, secs, beat in rows:
        budget = 7.0 if n == 9 else SPEECH_WINDOW
        print(f"{n:<4}{t:<16}{w:<7}{secs:>5.1f}s {'OK ' if secs <= budget else 'LONG'}  {beat}")
    print(f"\n9 chapters x 10.00s = {len(rows) * 10:.2f}s")


if __name__ == "__main__":
    main()
