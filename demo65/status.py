#!/usr/bin/env python3
"""Batch status for the 65-ring job — crops / shots / complete / videos / meta.
Rebuilt for v37 session (demo65 workspace was missing from the fresh-install RAR).
Run: cd demo65 && python3 status.py
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
MEDIA = HERE / "media"
DESIGNS_CROPS = MEDIA / "designs"
MIN_BYTES = 20 * 1024          # a real shot/crop is >20 KB (handoff rule)
SHOT_KEYS = ["studio", "worn", "gift", "editorial"]

def skus():
    p = HERE / "work" / "designs.json"
    if p.exists():
        return [d["sku"] for d in json.load(open(p, encoding="utf-8"))]
    # fall back to crop filenames until designs.json exists
    return sorted(f.stem for f in DESIGNS_CROPS.glob("*.jpg") if f.stat().st_size > MIN_BYTES)

def ok(f: Path) -> bool:
    return f.exists() and f.stat().st_size > MIN_BYTES

def main():
    all_skus = skus()
    crops = sorted(f.stem for f in DESIGNS_CROPS.glob("*.jpg") if f.stat().st_size > MIN_BYTES)
    shots = complete = videos = metas = 0
    complete_skus, partial, missing_all = [], [], []
    for s in all_skus:
        d = MEDIA / s
        have = [k for k in SHOT_KEYS if ok(d / f"shot_{k}.jpg")]
        shots += len(have)
        if len(have) == 4:
            complete += 1
            complete_skus.append(s)
        elif have:
            partial.append((s, have))
        else:
            missing_all.append(s)
        if ok(d / "video.mp4"): videos += 1
        if (d / "meta.json").exists() and (d / "meta.json").stat().st_size > 200: metas += 1

    n = max(len(all_skus), 65)
    print(f"CROPS    {len(crops)}/{n}")
    print(f"SHOTS    {shots}/{n * 4}")
    print(f"COMPLETE {complete}/{n}" + (f"  ({complete_skus[0]}–{complete_skus[-1]})" if complete_skus else ""))
    print(f"VIDEOS   {videos}/{n}")
    print(f"META     {metas}/{n}")
    if partial:
        print("\nPARTIAL (need remaining shots):")
        for s, have in partial[:12]:
            need = [k for k in SHOT_KEYS if k not in have]
            print(f"  {s}: has {have} -> needs {need}")
        if len(partial) > 12: print(f"  … +{len(partial) - 12} more")
    todo = [s for s in missing_all] + [s for s, _ in partial]
    if todo:
        nxt = todo[:3]
        remaining_shots = sum(4 - len([k for k in SHOT_KEYS if ok(MEDIA / s / f"shot_{k}.jpg")]) for s in todo)
        print(f"\nNEXT BATCH: {', '.join(nxt)} … · {len(todo)} designs left · {remaining_shots} shots remaining")
        print(f"(≈ {-(-remaining_shots // 10)} messages at 10 shots/message)")
    else:
        print("\nALL DESIGNS COMPLETE — next: 04_render_video, 05_metadata, then 06_upload.")

if __name__ == "__main__":
    main()
