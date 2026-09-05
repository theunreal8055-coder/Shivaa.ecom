#!/usr/bin/env python3
"""Locate the green supplier tag on each design crop (green_mask logic from
pipeline/01b_ocr_tags.py), save an upscaled tag image per design for visual
verification, and build contact sheets for fast reading."""
import numpy as np
from PIL import Image
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
CROPS = HERE / "media" / "rings"
TAGS = HERE / "work" / "tags"
TAGS.mkdir(parents=True, exist_ok=True)

def green_mask(arr):
    r, g, b = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
    return (g > r + 25) & (g > b + 15) & (g > 90)

results = []
for f in sorted(CROPS.glob("*.jpg")):
    im = Image.open(f).convert("RGB")
    a = np.asarray(im)
    m = green_mask(a)
    n = int(m.sum())
    if n < 500:
        results.append((f.stem, "NO-TAG", n))
        continue
    ys, xs = np.where(m)
    pad = 18
    x0, x1 = max(0, xs.min() - pad), min(im.width, xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(im.height, ys.max() + pad)
    tag = im.crop((x0, y0, x1, y1))
    sc = min(3.0, max(1.0, 900.0 / max(tag.size)))
    if sc > 1.0:
        tag = tag.resize((int(tag.width * sc), int(tag.height * sc)), Image.LANCZOS)
    tag.save(TAGS / f"{f.stem}.png")
    results.append((f.stem, f"{tag.width}x{tag.height}", n))

print(f"tags found: {sum(1 for r in results if r[1] != 'NO-TAG')}/{len(results)}")
for r in results:
    if r[1] == "NO-TAG":
        print("  MISSING:", r)
