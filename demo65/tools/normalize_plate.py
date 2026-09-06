#!/usr/bin/env python3
"""Normalise the catalogue front plate so every listing tile matches.

The image model keeps the *style* consistent but not the *scale* — one ring fills
the frame, the next sits small. On a listing grid that reads as sloppy. This does
deterministically what a prompt cannot:

  1. find the ring (it is the non-white subject on a white sweep)
  2. scale it so its width is exactly TARGET_W of the canvas
  3. paste it dead-centre on a clean square white canvas
  4. add a soft contact shadow beneath

Result: every product tile has the ring at identical size and position, so the
grid looks like one catalogue and only the DESIGN differs.

Run:  python3 tools/normalize_plate.py --in work/gridtest --out work/gridnorm
      python3 tools/normalize_plate.py --media          # normalise media/*/shot_front.jpg
"""
from __future__ import annotations
import argparse
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
CANVAS = 1200          # output is square
TARGET_W = 0.72        # ring width as a share of the canvas
CENTRE_Y = 0.50        # vertical centre of the ring
BG = (255, 255, 255)


def _subject_box(im: Image.Image):
    """Bounding box of the ring, measured against the actual backdrop colour.

    The generated sweeps are not pure white — they are soft off-white/grey and
    often sit inside a slightly different border. So sample the corners to learn
    the true backdrop, then treat anything meaningfully different as subject.
    """
    small = im.convert("RGB")
    w, h = small.size
    k = max(4, min(w, h) // 50)
    corners = []
    for cx, cy in ((0, 0), (w - k, 0), (0, h - k), (w - k, h - k)):
        px = small.crop((cx, cy, cx + k, cy + k)).resize((1, 1), Image.BOX).getpixel((0, 0))
        corners.append(px)
    bg = tuple(sorted(c[i] for c in corners)[len(corners) // 2] for i in range(3))

    bgim = Image.new("RGB", small.size, bg)
    diff = ImageChops.difference(small, bgim).convert("L")
    # adaptive threshold: the ring is far more different than sweep gradients
    hi = diff.getextrema()[1]
    thr = max(18, int(hi * 0.22))
    mask = diff.point(lambda p: 255 if p > thr else 0)
    mask = mask.filter(ImageFilter.MedianFilter(5))

    box = mask.getbbox()
    if not box:
        return (0, 0, w, h)
    # ignore a thin frame/border artefact hugging the very edge
    bx0, by0, bx1, by1 = box
    if (bx1 - bx0) > w * 0.97 and (by1 - by0) > h * 0.97:
        inset = int(min(w, h) * 0.04)
        sub = mask.crop((inset, inset, w - inset, h - inset)).getbbox()
        if sub:
            box = (sub[0] + inset, sub[1] + inset, sub[2] + inset, sub[3] + inset)
    return box


def normalise(src: Path, dst: Path) -> tuple[float, float]:
    im = Image.open(src).convert("RGB")
    x0, y0, x1, y1 = _subject_box(im)
    sub = im.crop((x0, y0, x1, y1))
    sw, sh = sub.size
    target_px = CANVAS * TARGET_W
    scale = target_px / sw
    # never let a tall ring overflow the canvas
    if sh * scale > CANVAS * 0.80:
        scale = CANVAS * 0.80 / sh
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    sub = sub.resize((nw, nh), Image.LANCZOS)

    canvas = Image.new("RGB", (CANVAS, CANVAS), BG)
    x = (CANVAS - nw) // 2
    y = int(CANVAS * CENTRE_Y - nh / 2)

    # soft contact shadow under the ring
    shadow = Image.new("L", (CANVAS, CANVAS), 0)
    sd = Image.new("L", (int(nw * 0.86), max(8, int(nh * 0.10))), 90)
    shadow.paste(sd, (x + int(nw * 0.07), y + nh - int(nh * 0.03)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(nh * 0.05) + 6))
    canvas.paste(Image.new("RGB", (CANVAS, CANVAS), (208, 206, 203)), (0, 0), shadow)

    canvas.paste(sub, (x, y))
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, "JPEG", quality=93, subsampling=1)
    return nw / CANVAS, nh / CANVAS


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", default="")
    ap.add_argument("--out", dest="out", default="")
    ap.add_argument("--media", action="store_true",
                    help="normalise media/PGS*/shot_front.jpg in place")
    a = ap.parse_args()
    jobs = []
    if a.media:
        for f in sorted((ROOT / "media").glob("PGS*/shot_front.jpg")):
            jobs.append((f, f))
    else:
        s = Path(a.src); o = Path(a.out or a.src)
        for f in sorted(s.glob("*.jpg")):
            jobs.append((f, o / f.name))
    for src, dst in jobs:
        w, h = normalise(src, dst)
        print(f"{src.name:26s} ring width {w:.2f} height {h:.2f}")
    print(f"\nnormalised {len(jobs)} plate(s)")


if __name__ == "__main__":
    main()
