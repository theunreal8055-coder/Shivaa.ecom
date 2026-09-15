#!/usr/bin/env python3
"""LADIES-67 · STAGE 0 — crop the ring off the supplier scale photos.

Source: repo-root PDF "67 rings ladies plain hitesh bhai_compressed.pdf"
(67 pages, one photo each: a ladies' 22K ring standing on a digital weighing
scale, gram weight on the orange LCD, no text layer, no green price tags).

The raw page PNGs live OUTSIDE the repo (house rule: generated media never
enters git):  /home/user/work_shots/ladies67/raw/pNN.png   (extract once with
pymupdf — see tools/photoshoot/LADIES67-STATE.md §1).

This script finds the saturated-gold blob in the pan area (ignoring the blurred
tray of rings at the top of the frame and the LCD at the bottom) and writes a
padded tight crop per page:

    /home/user/work_shots/ladies67/refs/L67_pNN_ref.jpg

Usage (repo root):
    python3 tools/photoshoot/ladies67_crop.py [--raw DIR] [--out DIR]
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

RAW = Path("/home/user/work_shots/ladies67/raw")
OUT = Path("/home/user/work_shots/ladies67/refs")

# Hand-measured overrides (page -> x0,y0,x1,y1 on the 987x1754 page) for the few
# pages where the auto-detector grabs the blurred tray / LCD edge instead of the
# ring. Verified visually against the labelled ref sheet.
MANUAL_BB = {
    "p09": (300, 380, 660, 780),
    "p22": (320, 400, 670, 780),
    "p28": (310, 380, 630, 720),
    "p30": (310, 410, 640, 770),
    "p37": (300, 360, 630, 700),
    "p42": (290, 330, 620, 680),
    "p67": (290, 420, 630, 800),
}


def gold_mask(a: np.ndarray) -> np.ndarray:
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (r > 110) & ((r - b) > 55) & ((g - b) > 25)


def _band(profile, thresh, lo, hi):
    """contiguous [t,b] around the densest index where profile > thresh."""
    idx = lo + int(np.argmax(profile[lo:hi]))
    t = idx
    while t > lo and profile[t - 1] > thresh:
        t -= 1
    b = idx
    while b < hi - 1 and profile[b + 1] > thresh:
        b += 1
    return t, b


def ring_bbox(a: np.ndarray):
    """Bounding box of the ring = the gold band between tray and LCD.

    The frame has three gold-ish zones: the blurred tray of loose rings hanging
    from the top edge, the ring itself on the pan, and the orange LCD at the
    bottom. The tray band (contiguous from row 0) and the LCD band (bright orange
    rows) are measured first; the densest remaining gold band is the ring.
    """
    H, W = a.shape[:2]
    g = gold_mask(a)
    d = g.sum(axis=1)
    # tray: contiguous gold from the top edge
    tb = 0
    while tb < int(H * 0.30) and d[tb] > W * 0.18:
        tb += 1
    while tb < int(H * 0.35) and d[tb] > W * 0.06:   # blurred fringe
        tb += 1
    # LCD: bright saturated orange rows
    r, gr, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    lcd = ((r > 190) & (gr > 110) & (b < 90)).sum(axis=1)
    li = int(H * 0.40)
    while li < H and lcd[li] < W * 0.25:
        li += 1
    lt = li
    while lt > int(H * 0.35) and lcd[lt - 1] > W * 0.10:   # glow fringe above LCD
        lt -= 1
    lo, hi = min(tb + 4, int(H * 0.6)), max(lt - 6, int(H * 0.3))
    if hi <= lo:
        lo, hi = int(H * 0.15), int(H * 0.55)
    rows = d.copy()
    rows[:lo] = 0
    rows[hi:] = 0
    if rows.max() < 4:
        return None
    t, b2 = _band(rows, 3, lo, hi)
    csum = g[t:b2 + 1].sum(axis=0)
    if csum.max() < 3:
        return None
    l, r2 = _band(csum, 1, 0, W)
    bw, bh = r2 - l, b2 - t
    px, py = int(bw * 0.16) + 8, int(bh * 0.16) + 8
    return (max(0, l - px), max(0, t - py), min(W, r2 + px), min(H, b2 + py))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=str(RAW))
    ap.add_argument("--out", default=str(OUT))
    a = ap.parse_args()
    raw, out = Path(a.raw), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    meta = {}
    for f in sorted(raw.glob("p*.png")):
        im = Image.open(f).convert("RGB")
        aarr = np.asarray(im, dtype=np.uint8)
        bb = MANUAL_BB.get(f.stem) or ring_bbox(aarr)
        if not bb:
            print(f"  !! {f.name}: no gold blob found")
            continue
        crop = im.crop(bb)
        # house-ish portrait reference: pad to 4:5 with the crop's own edge tone
        w, h = crop.size
        tw, th = max(w, int(h * 0.8)), max(h, int(w * 1.25))
        canvas = Image.new("RGB", (tw, th), tuple(int(c) for c in np.median(
            np.asarray(crop).reshape(-1, 3), axis=0)))
        canvas.paste(crop, ((tw - w) // 2, (th - h) // 2))
        fn = out / f"{f.stem.replace('p', 'L67_p')}_ref.jpg"
        canvas.save(fn, quality=92)
        meta[f.stem] = {"ref": str(fn), "bbox": list(bb),
                        "crop_wh": [w, h], "ref_wh": [tw, th],
                        "manual": f.stem in MANUAL_BB}
        print(f"  {f.name} -> {fn.name} bbox={bb} {w}x{h}")
    (out.parent / "refs_meta.json").write_text(json.dumps(meta, indent=1))
    print(f"done: {len(meta)} refs in {out}")


if __name__ == "__main__":
    main()
