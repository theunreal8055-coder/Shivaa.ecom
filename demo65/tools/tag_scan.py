#!/usr/bin/env python3
"""QA gate — scan finished shots for the supplier's bright spring-green price tag.

The reference crops always show a green tag stuck through the ring; the image model
occasionally reproduces it. This scan flags shots with a high share of BRIGHT
spring-green pixels (the tag colour in well-lit scenes).

LIMITATION: in dark editorial scenes the tag renders as dark emerald, which is
colour-identical to green velvet/silk — the scanner CANNOT catch those (verified
failure on PGS5036::editorial, 6 Sep 2026). The real gate is VISUAL QA: read back
every generated shot before rendering its video / merging a PR. Check: tag, any
text or engraving (purity marks must read 22K — "AU 750" = 18K is a FAIL), brand
names or monograms on boxes, and stone colour vs the reference crop.

Run after every batch of shots as a cheap first pass:

    cd demo65 && python3 tools/tag_scan.py [--min 0.003]
"""
import argparse, colorsys
from pathlib import Path
from PIL import Image

MEDIA = Path(__file__).resolve().parent.parent / "media"

def is_tag_green(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    # spring green ~155deg hue, bright, saturated — the plastic tag colour
    return 0.36 <= h <= 0.47 and l >= 0.55 and s >= 0.45

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min", type=float, default=0.003, help="fraction of pixels to flag")
    a = ap.parse_args()
    flags, n = [], 0
    for d in sorted(MEDIA.iterdir()):
        if not d.is_dir() or d.name == "designs":
            continue
        for f in sorted(d.glob("shot_*.jpg")):
            n += 1
            with Image.open(f) as im:
                im = im.convert("RGB").resize((200, 200))
                px = list(im.getdata())
            cnt = sum(1 for r, g, b in px if is_tag_green(r, g, b))
            frac = cnt / len(px)
            if frac >= a.min:
                flags.append((f"{d.name}::{f.stem[5:]}", frac))
    print(f"scanned {n} shots, flag threshold {a.min:.3%}")
    if flags:
        print("TAG-GREEN FLAGS (verify visually, regenerate if contaminated):")
        for sku_shot, frac in flags:
            print(f"  {sku_shot}: {frac:.2%}")
    else:
        print("no tag-green flags")

if __name__ == "__main__":
    main()
