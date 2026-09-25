#!/usr/bin/env python3
"""Shivaa Jewels — 56s Omni Flash trailer.

Reads script.json (single source of truth) and writes:
  clip-01.txt ... clip-07.txt   copy-paste-ready standalone Omni prompts
  VO-HINDI.txt                  the 7 spoken lines only (for any human/TTS pass)
Also prints a timing sanity table (Hindi words per clip vs the 8.00s budget).

    python3 launch/omni-56s/build_prompts.py
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
DATA = json.loads((HERE / "script.json").read_text(encoding="utf-8"))

# Hindi trailer VO lands at roughly 2.4-2.8 words/sec. A clip must leave the
# headline beat in and the tail breath out, so the speech window is ~6.5s.
SPEECH_WINDOW = 6.5
WORDS_PER_SEC = 2.7

TEMPLATE = """OMNI 1.1 FLASH — SHIVAA JEWELS 56s FEATURE TRAILER — CLIP {n} OF 7 ({t})
DURATION: EXACTLY 8.00 SECONDS. 16:9. 1920x1080. 24fps.

===== 1. CHARACTER LOCK =====
{character_lock}

===== 2. FILM LOCK =====
{prefix}

===== 3. THIS SHOT — {beat} =====
{visual}

===== 4. HEADLINE CARD (the only text on screen) =====
{headline_hi}
{headline_en}
Gold type on black negative space. In at 0.3s, out by 2.2s. Nothing else is written anywhere in frame.

===== 5. SHE SPEAKS — exactly this Hindi, lip-synced, nothing else =====
"{line_hi}"
(Roman reference for pronunciation only, do not show it: {line_roman})
Speak it inside the first {window}s of the clip, trailer pace, one breath of silence at the end.

===== 6. SOUND =====
SCORE: {score}
SCENE SOUND: {scene_sound}

===== 7. CONTINUITY =====
{start_note}
END ON: {last_frame}
"""


def start_note(i: int, scenes: list) -> str:
    if i == 0:
        return (
            "FIRST CLIP of the film — establish the woman, the maison, the grade and the "
            "music that all 6 following clips must match."
        )
    prev = scenes[i - 1]
    return (
        f"START EXACTLY on the last frame of clip {prev['n']}: {prev['last_frame']} "
        "Same woman, same saree, same maison, same light, same score — do not restart the film."
    )


def main() -> None:
    scenes = DATA["scenes"]
    rows = []
    vo = []
    for i, s in enumerate(scenes):
        text = TEMPLATE.format(
            n=s["n"],
            t=s["t"],
            character_lock=DATA["character_lock"],
            prefix=DATA["prefix"].replace("clip N of 7", f"clip {s['n']} of 7"),
            beat=s["beat"],
            visual=s["visual"],
            headline_hi=s["headline_hi"],
            headline_en=s["headline_en"],
            line_hi=s["line_hi"],
            line_roman=s["line_roman"],
            window=SPEECH_WINDOW,
            score=s["score"],
            scene_sound=s["scene_sound"],
            start_note=start_note(i, scenes),
            last_frame=s["last_frame"],
        )
        out = HERE / f"clip-{s['n']:02d}.txt"
        out.write_text(text, encoding="utf-8")
        words = len([w for w in s["line_hi"].replace("—", " ").split() if w.strip("।,?-")])
        secs = words / WORDS_PER_SEC
        rows.append((s["n"], s["t"], words, secs, s["beat"]))
        vo.append(f"{s['n']}. [{s['t']}] {s['line_hi']}")

    (HERE / "VO-HINDI.txt").write_text("\n".join(vo) + "\n", encoding="utf-8")

    print(f"{'clip':<5}{'window':<16}{'words':<7}{'~speech':<10}beat")
    total = 0.0
    for n, t, w, secs, beat in rows:
        flag = "OK " if secs <= SPEECH_WINDOW else "LONG"
        total += 8.0
        print(f"{n:<5}{t:<16}{w:<7}{secs:>5.1f}s {flag}  {beat}")
    print(f"\n7 clips x 8.00s = {total:.2f}s total")


if __name__ == "__main__":
    main()
