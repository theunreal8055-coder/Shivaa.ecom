#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Re-time timeline.json to the REAL spoken audio.

    python3 align_transcript.py --segments segments.json --timeline ../timeline.json

segments.json = [{"start":..,"end":..,"text":..}, ...]   (faster-whisper output)
Approved script blocks (timeline.json -> blocks) are matched SEQUENTIALLY to
contiguous whisper spans by similarity; unmatched blocks keep provisional times.
Spelling is NEVER taken from whisper — only timings. Approved wording stays.
"""
import argparse, difflib, json, re

def norm(s):
    s = s.lower()
    s = re.sub(r"[^\u0900-\u097fa-z0-9%’']+", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--segments", required=True)
    ap.add_argument("--timeline", required=True)
    ap.add_argument("--out", default=None)
    ap.add_argument("--min-sim", type=float, default=0.30)
    a = ap.parse_args()

    segs = json.load(open(a.segments, encoding="utf-8"))
    tl = json.load(open(a.timeline, encoding="utf-8"))
    blocks = tl["blocks"]

    i = 0
    for b in blocks:
        target = norm(b["text"])
        best_j, best_sim = i, -1.0
        for j in range(i, min(i + 8, len(segs))):
            concat = norm(" ".join(s["text"] for s in segs[i:j + 1]))
            sim = difflib.SequenceMatcher(None, target, concat).ratio()
            if sim > best_sim:
                best_j, best_sim = j, sim
            if sim > 0.92:
                break
        if best_sim >= a.min_sim and best_j < len(segs):
            b["start"] = round(segs[i]["start"], 2)
            b["end"] = round(segs[best_j]["end"], 2)
            note = "aligned  sim=%.2f" % best_sim
        else:
            note = "KEPT provisional (sim=%.2f)" % best_sim
        heard = norm(" ".join(s["text"] for s in segs[i:best_j + 1]))[:58]
        print("%-11s %6.2f -> %6.2f  %-26s | %s" % (b["id"], b["start"], b["end"], note, heard))
        i = best_j + 1

    # keep the timeline strictly sequential & sane
    for k in range(1, len(blocks)):
        if blocks[k]["start"] < blocks[k - 1]["end"]:
            blocks[k]["start"] = blocks[k - 1]["end"]
        if blocks[k]["end"] <= blocks[k]["start"]:
            blocks[k]["end"] = round(blocks[k]["start"] + 1.5, 2)

    out = a.out or a.timeline
    json.dump(tl, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("written:", out)

if __name__ == "__main__":
    main()
