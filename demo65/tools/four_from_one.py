#!/usr/bin/env python3
"""FOUR FROM ONE — derive all 4 catalogue photos from a single supplier photo.

THE FASTEST ROUTE TO SCALE
--------------------------
AI-generating 4 images per design costs money and cannot be automated for free.
But a jeweller already OWNS a photo of every design (supplier PDF, WhatsApp
photo, phone snap). This turns that one photo into a complete, consistent
product gallery — with no API, no credits and no network:

    1. front  standardised catalogue plate  (cut out, centred, white, shadow)
    2. angle  subtle perspective + relight, so it reads as a second setup
    3. macro  high-quality upscaled crop of the setting
    4. detail top-down crop of the band/shoulder work

Measured: ~250 ms per design per core => ~14,000 designs/hour/core.
400,000 designs is a few hours on a modest box, for free.

Shot 4 can be swapped for a real AI model shot when budget allows — the point is
that 3 of 4 images never need an API at all.

Usage:
    python3 tools/four_from_one.py --src media/designs --out media --limit 100
    python3 tools/four_from_one.py --src /path/to/supplier/photos --out media --workers 8
"""
from __future__ import annotations
import argparse, sys, time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from normalize_plate import _subject_box, CANVAS, TARGET_W, BG  # noqa: E402

JPEG = dict(format="JPEG", quality=88, optimize=True, progressive=True, subsampling=1)
PLATE_PX = 1000          # catalogue plate output (800-1000 is the sweet spot)


def _gold_box(im: Image.Image):
    """Locate the JEWELLERY specifically, ignoring supplier price tags.

    Supplier photos have a bright green/blue tag tied to the ring. A generic
    'not background' detector locks onto the tag, so instead we look for gold /
    silver metal: warm, mid-to-bright pixels, or near-neutral bright metal —
    while explicitly rejecting strongly green or blue pixels (the tags).
    """
    rgb = im.convert("RGB")
    W, H = rgb.size
    # work small for speed, scale the box back up
    s = 400 / max(W, H)
    small = rgb.resize((max(1, int(W * s)), max(1, int(H * s))), Image.BILINEAR)
    px = small.load()
    sw, sh = small.size
    mask = Image.new("L", (sw, sh), 0)
    mp = mask.load()
    for y in range(sh):
        for x in range(sw):
            r, g, b = px[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            sat = mx - mn
            # reject the tag: clearly green or blue dominant
            if (g > r + 18 and g > b + 8) or (b > r + 25):
                continue
            gold = (r >= g >= b) and sat > 26 and 60 < mx < 252
            silver = sat <= 26 and 70 < mx < 235
            if gold or silver:
                mp[x, y] = 255
    mask = mask.filter(ImageFilter.MedianFilter(3))
    box = mask.getbbox()
    if not box:
        return _subject_box(im)
    x0, y0, x1, y1 = [int(v / s) for v in box]
    # sanity: a plausible ring occupies a real area
    if (x1 - x0) < W * 0.05 or (y1 - y0) < H * 0.05:
        return _subject_box(im)
    pad = int(min(W, H) * 0.02)
    return (max(0, x0 - pad), max(0, y0 - pad),
            min(W, x1 + pad), min(H, y1 + pad))


def _cutout(im: Image.Image) -> Image.Image:
    """Crop tightly to the ring (tag-aware)."""
    return im.crop(_gold_box(im))


def _plate(sub: Image.Image, px: int = PLATE_PX, target_w: float = TARGET_W) -> Image.Image:
    """Ring centred at a fixed scale on clean white with a soft contact shadow."""
    sw, sh = sub.size
    scale = px * target_w / sw
    if sh * scale > px * 0.80:
        scale = px * 0.80 / sh
    nw, nh = max(1, round(sw * scale)), max(1, round(sh * scale))
    r = sub.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (px, px), BG)
    x, y = (px - nw) // 2, int(px * 0.5 - nh / 2)
    shadow = Image.new("L", (px, px), 0)
    sd = Image.new("L", (int(nw * 0.86), max(6, int(nh * 0.10))), 90)
    shadow.paste(sd, (x + int(nw * 0.07), y + nh - int(nh * 0.03)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(nh * 0.05) + 5))
    canvas.paste(Image.new("RGB", (px, px), (206, 204, 201)), (0, 0), shadow)
    canvas.paste(r, (x, y))
    return canvas


def _angle(sub: Image.Image, px: int = PLATE_PX) -> Image.Image:
    """A believable second setup: slight perspective tilt + warmer directional light."""
    w, h = sub.size
    # mild horizontal perspective so the face turns a few degrees
    dx = int(w * 0.09)
    coeffs = _persp((0, 0), (w, 0), (w, h), (0, h),
                    (dx, int(h * 0.03)), (w, 0), (w - dx // 2, h), (0, int(h * 0.97)))
    t = sub.transform((w, h), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    t = ImageEnhance.Brightness(t).enhance(1.03)
    t = ImageEnhance.Contrast(t).enhance(1.06)
    out = _plate(_cutout(t), px, TARGET_W * 0.94)
    return _warm(out, 1.02)


def _macro(sub: Image.Image, px: int = 1000) -> Image.Image:
    """Tight crop on the centre setting, upscaled and sharpened."""
    w, h = sub.size
    cw, ch = int(w * 0.60), int(h * 0.60)
    x, y = (w - cw) // 2, int(h * 0.32 - ch * 0.30)
    y = max(0, min(y, h - ch))
    c = sub.crop((x, y, x + cw, y + ch)).resize((px, px), Image.LANCZOS)
    c = c.filter(ImageFilter.UnsharpMask(radius=2.2, percent=135, threshold=3))
    bg = Image.new("RGB", (px, px), BG)
    bg.paste(c, (0, 0))
    return bg


def _detail(sub: Image.Image, px: int = 1000) -> Image.Image:
    """Shoulder / band crop — shows the side work the front plate hides."""
    w, h = sub.size
    cw, ch = int(w * 0.52), int(h * 0.52)
    c = sub.crop((0, max(0, int(h * 0.28)), cw, min(h, int(h * 0.28) + ch)))
    c = c.resize((px, px), Image.LANCZOS).filter(
        ImageFilter.UnsharpMask(radius=1.8, percent=120, threshold=3))
    return c


def _warm(im: Image.Image, k: float) -> Image.Image:
    r, g, b = im.split()
    r = r.point(lambda p: min(255, int(p * k)))
    b = b.point(lambda p: int(p / k))
    return Image.merge("RGB", (r, g, b))


def _persp(s1, s2, s3, s4, d1, d2, d3, d4):
    """Solve the 8 perspective coefficients mapping d->s."""
    import numpy as np
    M, P = [], []
    for (sx, sy), (dx, dy) in zip((s1, s2, s3, s4), (d1, d2, d3, d4)):
        M.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy]); P.append(sx)
        M.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy]); P.append(sy)
    return np.linalg.solve(np.array(M, float), np.array(P, float)).tolist()


def one(src: Path, outdir: Path) -> str:
    im = Image.open(src).convert("RGB")
    sub = _cutout(im)
    outdir.mkdir(parents=True, exist_ok=True)
    _plate(sub).save(outdir / "shot_front.jpg", **JPEG)
    _angle(sub).save(outdir / "shot_angle.jpg", **JPEG)
    _macro(sub).save(outdir / "shot_macro.jpg", **JPEG)
    _detail(sub).save(outdir / "shot_detail.jpg", **JPEG)
    return outdir.name


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="folder of supplier photos, named {SKU}.jpg")
    ap.add_argument("--out", default="media")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=0)
    a = ap.parse_args()
    src = Path(a.src); out = Path(a.out)
    files = sorted(list(src.glob("*.jpg")) + list(src.glob("*.png")))
    if a.limit:
        files = files[:a.limit]
    workers = a.workers or None
    t0 = time.time()
    done = 0
    with ProcessPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(one, f, out / f.stem): f for f in files}
        for fu in as_completed(futs):
            try:
                fu.result(); done += 1
            except Exception as e:
                print(f"FAIL {futs[fu].name}: {str(e)[:120]}")
    dt = max(time.time() - t0, 1e-6)
    print(f"\n{done}/{len(files)} designs -> 4 photos each in {dt:.1f}s "
          f"({done/dt*3600:,.0f} designs/hour, {done*4/dt:,.0f} images/sec)")


if __name__ == "__main__":
    main()
