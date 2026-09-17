#!/usr/bin/env python3
"""STAGE 3-FREE · ₹0 STUDIO — deterministic jewellery photo enhancement (NO generative AI).

Replaces the paid AI photoshoot when budget is zero. Pure OpenCV-free PIL/numpy math:
  1. white-balance (per-channel percentile stretch)
  2. background flatten: light photos -> clean studio white; dark photos -> deep velvet black
  3. auto-crop to the jewellery, square studio canvas, gentle sharpen + saturation
Output: out/{sku}/shot_hero.jpg (+ keeps original crop as shot_raw.jpg)
Ledger: work/ledger_free_studio.csv  -> idempotent, resumable.

Run: python 03_free_studio.py --config config.free.json [--limit 50] [--only SKU,SKU]
"""
import argparse, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

from lib_common import setup_logging, load_json, Ledger, LOG

TARGET = 1400          # hero edge in px (site zooms fine at 1400)
BG_MARGIN = 0.08       # padding around jewellery, fraction of edge
WHITE_POINT = 243      # input level mapped to pure white (soft knee, no blow-out)


def _stretch(arr, lo_p=1.0, hi_p=99.0):
    """per-channel percentile stretch -> neutral white balance."""
    out = np.empty_like(arr, dtype=np.float32)
    for c in range(3):
        ch = arr[..., c].astype(np.float32)
        lo, hi = np.percentile(ch, lo_p), np.percentile(ch, hi_p)
        if hi - lo < 10:
            out[..., c] = ch
        else:
            out[..., c] = np.clip((ch - lo) * 255.0 / (hi - lo), 0, 255)
    return out


def _flatten_bg(arr, dark_bg: bool):
    """push the backdrop to a clean studio white (or keep deep black), sparing the jewel."""
    lum = arr.mean(axis=2)
    if dark_bg:
        keep = lum > 30                      # anything brighter than near-black is jewel
        gain = np.where(keep[..., None], 1.12, 0.55)   # deepen blacks a touch (per-pixel, 3ch)
    else:
        # estimate backdrop from the brightest 15% of pixels
        thr = np.percentile(lum, 85)
        bg = arr[lum >= thr]
        wp = np.clip(np.median(bg, axis=0), 120, 255)
        gain = np.where(wp > 1, WHITE_POINT / np.maximum(wp, 1), 1.0)[None, None, :]
        gain = np.broadcast_to(gain, arr.shape)
    out = np.clip(arr.astype(np.float32) * gain, 0, 255)
    if not dark_bg:
        # soft knee: everything above WHITE_POINT-10 rolls into clean white
        knee = (WHITE_POINT - 10) / 255.0
        f = out / 255.0
        hi = f > knee
        f[hi] = knee + (f[hi] - knee) * (10.0 / 255.0) / max(1e-6, 1 - knee)
        out = np.clip(f * 255.0, 0, 255)
    return out.astype(np.uint8)


def _drop_scale_led(im: Image.Image):
    """supplier scale photos: if an amber LED block sits in the bottom half, crop it
    (and everything below) out — the product is the jewellery ABOVE the display."""
    import numpy as _np
    arr = _np.asarray(im.convert("RGB"))
    r = arr[..., 0].astype(int); g = arr[..., 1].astype(int); b = arr[..., 2].astype(int)
    m = (r > 130) & (r - b > 55) & (g - b > 15) & (g < 210)
    if m.sum() < 150:
        return im
    ys, xs = _np.where(m)
    if ys.mean() < im.height * 0.45:      # LED not in the lower part -> not a scale shot
        return im
    cut = int(max(0, ys.min() - im.height * 0.02))
    if cut < im.height * 0.35:
        return im
    return im.crop((0, 0, im.width, cut))


def _jewel_bbox(arr, dark_bg: bool):
    lum = arr.mean(axis=2)
    if dark_bg:
        mask = lum > 70
        if mask.sum() < 400:
            return None
        ys, xs = np.where(mask)
        # percentile mass box — ignores small bright clutter (fingers, reflections)
        x0, x1 = np.percentile(xs, 2), np.percentile(xs, 98)
        y0, y1 = np.percentile(ys, 2), np.percentile(ys, 98)
        return int(x0), int(y0), int(x1) + 1, int(y1) + 1
    mask = (lum < 235)
    ys, xs = np.where(mask)
    if len(xs) < 50:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def enhance(src: Path, dst: Path):
    im = Image.open(src).convert("RGB")
    if max(im.size) > 1800:
        im.thumbnail((1800, 1800), Image.LANCZOS)
    arr = _stretch(np.asarray(im))
    lum = arr.mean(axis=2)
    # dark backdrop? sample the border ring
    border = np.concatenate([lum[0, :], lum[-1, :], lum[:, 0], lum[:, -1]])
    dark_bg = np.median(border) < 110
    arr = _flatten_bg(arr, dark_bg)
    bb = _jewel_bbox(arr, dark_bg)
    if bb:
        x0, y0, x1, y1 = bb
        pad = int(max(x1 - x0, y1 - y0) * BG_MARGIN)
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
        x1, y1 = min(arr.shape[1], x1 + pad), min(arr.shape[0], y1 + pad)
        arr = arr[y0:y1, x0:x1]
    im = Image.fromarray(arr)
    # square studio canvas
    edge = max(im.size)
    canvas = Image.new("RGB", (edge, edge), (8, 8, 10) if dark_bg else (255, 255, 255))
    canvas.paste(im, ((edge - im.width) // 2, (edge - im.height) // 2))
    canvas = canvas.resize((TARGET, TARGET), Image.LANCZOS)
    canvas = canvas.filter(ImageFilter.UnsharpMask(radius=2.2, percent=85, threshold=2))
    canvas = ImageEnhance.Color(canvas).enhance(1.06)
    canvas = ImageEnhance.Contrast(canvas).enhance(1.04)
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst, "JPEG", quality=88, optimize=True, progressive=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.free.json")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="", help="comma SKUs")
    ap.add_argument("--workers", type=int, default=2)
    a = ap.parse_args()
    cfg = load_json(a.config)
    work = Path(cfg["paths"]["work_dir"]); out = Path(cfg["paths"]["out_dir"])
    setup_logging(work)
    designs = load_json(work / "designs.json")
    if a.only:
        want = set(a.only.split(","))
        designs = [d for d in designs if d["sku"] in want]
    if a.limit:
        designs = designs[: a.limit]
    led = Ledger(work / "ledger_free_studio.csv",
                 ["id", "sku", "status", "src", "dst", "ts"])

    def hero_exists(d):
        return (out / d["sku"] / "shot_studio.jpg").exists()

    # ledger-done AND file present -> skip; file missing (fresh runner) -> self-heal
    todo = [d for d in designs if not (led.done(d["sku"]) and hero_exists(d))]
    LOG.info("free studio: %d todo / %d designs", len(todo), len(designs))

    def job(d):
        src = Path(d["img"])
        if not src.exists():
            # inventory img paths are relative to out_dir's parent (e.g. freeops/out/...)
            alt = Path(cfg["paths"]["out_dir"]).parent / d["img"]
            if alt.exists():
                src = alt
        if not src.exists():
            return d["sku"], "missing", str(src), ""
        d_out = out / d["sku"]
        raw_dst = d_out / "shot_raw.jpg"
        hero = d_out / "shot_studio.jpg"   # stage-4/6 convention (kenburns + upload pick this up)
        raw_dst.parent.mkdir(parents=True, exist_ok=True)
        if not raw_dst.exists():
            raw_dst.write_bytes(src.read_bytes())
        enhance(src, hero)
        return d["sku"], "done", str(src), str(hero)

    with ThreadPoolExecutor(max_workers=max(1, a.workers)) as ex:
        futs = [ex.submit(job, d) for d in todo]
        for i, f in enumerate(as_completed(futs), 1):
            sku, status, s, dst = f.result()
            import time
            led.set(sku, sku=sku, status=status, src=s, dst=dst, ts=int(time.time()))
            if i % 25 == 0:
                LOG.info("  %d/%d enhanced", i, len(todo))
    ok = sum(1 for r in led.rows.values() if r.get("status") == "done")
    LOG.info("free studio complete: %d heroes ready (₹0 spent)", ok)


if __name__ == "__main__":
    main()
