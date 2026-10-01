#!/usr/bin/env python3
"""Shivaa Jewels — 56s ONE-TAKE trailer v2.

Reads script.json and writes copy-paste-ready Omni prompts:
  clip-01.txt ... clip-07.txt
  VO-HINDI.txt
Prints a timing sanity table (Hindi words vs the 8.00s budget).

    python3 launch/omni-56s-v2/build_prompts.py
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
DATA = json.loads((HERE / "script.json").read_text(encoding="utf-8"))

SPEECH_WINDOW = 6.5      # last chapter is shorter, handled in its own text
WORDS_PER_SEC = 2.7

TEMPLATE = """OMNI 1.1 FLASH — SHIVAA JEWELS — ONE CONTINUOUS 56s TRAILER — CHAPTER {n} OF 7 ({t})
DURATION: EXACTLY 8.00 SECONDS · 16:9 · 1920x1080 · 24fps · AUDIO ON
ATTACH: the reference face image (reference-presenter.jpg){attach}

===== 1. CHARACTER LOCK =====
{character_lock}

===== 2. ONE-TAKE FILM LOCK =====
{prefix}

===== 3. FIRST FRAME — start here, do not re-establish =====
{first_frame}

===== 4. THIS CHAPTER — {beat} =====
{visual}

===== 5. ON-SCREEN TEXT (English only, exact spelling, 1.5s) =====
{headline_en}
Gold small-caps on dark negative space. Appears around 0.6s, gone by 2.2s. Spelled exactly as above.
No Devanagari on screen. No second line. No subtitles. If exact spelling is not possible, show no text.

===== 6. SHE SPEAKS — exactly this Hindi, lip-synced, nothing else =====
"{line_hi}"
(Pronunciation reference only, never shown: {line_roman})
{speech_note}

===== 7. SOUND =====
SCORE: {score}
SCENE SOUND: {scene_sound}

===== 8. LAST FRAME — hand off to the next chapter =====
{last_frame}
The camera must still be moving and she must still be mid-action at 8.00s. Do not slow down, do not
stop, do not fade out, do not hold a static pose at the end.
"""


def main() -> None:
    scenes = DATA["scenes"]
    rows, vo = [], []
    for i, s in enumerate(scenes):
        attach = (
            "\nATTACH ALSO: the last frame of chapter %d as the first frame / continuity reference."
            % (s["n"] - 1)
            if i else ""
        )
        if s["n"] == 7:
            note = ("Speak it inside the FIRST 5.5 seconds. The final 2.5 seconds have no speech — "
                    "only the empty logo plate and the music.")
        else:
            note = (f"Speak it inside the first {SPEECH_WINDOW}s at confident trailer pace, "
                    "finishing with a breath of room tone, never rushed, never cut off.")
        text = TEMPLATE.format(
            n=s["n"],
            t=s["t"],
            attach=attach,
            character_lock=DATA["character_lock"],
            prefix=DATA["prefix"].replace("CHAPTER N", "CHAPTER %d" % s["n"]),
            first_frame=s["first_frame"],
            beat=s["beat"],
            visual=s["visual"],
            headline_en=s["headline_en"],
            line_hi=s["line_hi"],
            line_roman=s["line_roman"],
            speech_note=note,
            score=s["score"],
            scene_sound=s["scene_sound"],
            last_frame=s["last_frame"],
        )
        (HERE / f"clip-{s['n']:02d}.txt").write_text(text, encoding="utf-8")
        words = len([w for w in s["line_hi"].replace("—", " ").split() if w.strip("।,?-")])
        rows.append((s["n"], s["t"], words, words / WORDS_PER_SEC, s["beat"]))
        vo.append(f"{s['n']}. [{s['t']}] {s['line_hi']}")

    (HERE / "VO-HINDI.txt").write_text("\n".join(vo) + "\n", encoding="utf-8")

    print(f"{'ch':<4}{'window':<16}{'words':<7}{'~speech':<10}beat")
    for n, t, w, secs, beat in rows:
        budget = 5.5 if n == 7 else SPEECH_WINDOW
        print(f"{n:<4}{t:<16}{w:<7}{secs:>5.1f}s {'OK ' if secs <= budget else 'LONG'}  {beat}")
    print(f"\n7 chapters x 8.00s = {len(rows) * 8:.2f}s")


if __name__ == "__main__":
    main()
