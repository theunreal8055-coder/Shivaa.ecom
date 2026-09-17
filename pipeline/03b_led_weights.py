#!/usr/bin/env python3
"""STAGE 2c · LED WEIGHT OCR — reads the true weight off supplier scale photos (₹0, offline).

Many supplier PDFs photograph every design on a digital jewellery scale; the amber LED
shows the exact gram weight. This stage finds the LED region per crop, segments the
digits (7-segment template match, pure numpy — no tesseract needed) and writes
freeops/suppliers/led-weights.csv: sku,weightG,ledConf.

Sanity band: 0.05–500 g. Out-of-band or unreadable -> row marked low-confidence and
the design simply stays in the normal quarantine path (never guessed).

Run: python 03b_led_weights.py --config config.free.json
"""
import argparse, csv
from pathlib import Path

import numpy as np
from PIL import Image

from lib_common import setup_logging, load_json, LOG

# 7-segment map: bits (a,b,c,d,e,f,g) -> digit
SEG2DIG = {
    (1, 1, 1, 1, 1, 1, 0): "0", (0, 1, 1, 0, 0, 0, 0): "1",
    (1, 1, 0, 1, 1, 0, 1): "2", (1, 1, 1, 1, 0, 0, 1): "3",
    (0, 1, 1, 0, 0, 1, 1): "4", (1, 0, 1, 1, 0, 1, 1): "5",
    (1, 0, 1, 1, 1, 1, 1): "6", (1, 1, 1, 0, 0, 0, 0): "7",
    (1, 1, 1, 1, 1, 1, 1): "8", (1, 1, 1, 1, 0, 1, 1): "9",
}
GH, GW = 60, 36   # normalized digit box


def led_mask(arr):
    r = arr[..., 0].astype(int); g = arr[..., 1].astype(int); b = arr[..., 2].astype(int)
    return (r > 130) & (r - b > 55) & (g - b > 15) & (g < 210)


def led_box(im):
    """display glass = largest connected amber region (scipy CC label). Digits sit inside it."""
    from scipy import ndimage
    arr = np.asarray(im.convert("RGB"))
    r = arr[..., 0].astype(int); g = arr[..., 1].astype(int); b = arr[..., 2].astype(int)
    m = (r > 130) & (r - b > 55) & (g - b > 15) & (g < 210)
    if m.sum() < 400:
        return None
    lab, n = ndimage.label(m)
    if n == 0:
        return None
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    comp = sizes.argmax() == lab
    ys, xs = np.where(comp)
    if len(xs) < 400:
        return None
    x0, x1 = int(np.percentile(xs, 1)), int(np.percentile(xs, 99))
    y0, y1 = int(np.percentile(ys, 1)), int(np.percentile(ys, 99))
    if (x1 - x0) < 0.12 * im.width or (y1 - y0) < 0.03 * im.height:
        return None
    pad = 3
    return (max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad))


def classify_digit(cell):
    """cell: bool array ~digit shaped. Returns digit or None."""
    im = Image.fromarray((cell * 255).astype(np.uint8)).resize((GW, GH), Image.BILINEAR)
    a = np.asarray(im) > 100
    if a.mean() < 0.04 or a.mean() > 0.72:
        return None
    boxes = {  # (r0,r1,c0,c1) on the normalized grid
        "a": (3, 12, 9, 27), "b": (5, 26, 28, 36), "c": (34, 55, 28, 36),
        "d": (48, 57, 9, 27), "e": (34, 55, 0, 8), "f": (5, 26, 0, 8),
        "g": (25, 35, 10, 26),
    }
    bits = tuple(int(a[r0:r1, c0:c1].mean() > 0.30)
                 for _, (r0, r1, c0, c1) in sorted(boxes.items()))
    return SEG2DIG.get(bits)


def read_led(im):
    """digits are DARK 7-segment marks ON the amber backlight. Component-based:
    each dark blob is classified independently; the bezel frame is rejected by
    geometry (touches crop edge / spans the panel). Returns (weight_str, conf)."""
    from scipy import ndimage
    bx = led_box(im)
    if not bx:
        return None, "no-led"
    panel = im.crop(bx)
    a = np.asarray(panel.convert("RGB")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    amber = (r > 130) & (r - b > 55) & (g - b > 15)
    if amber.mean() < 0.15:
        return None, "panel-not-amber"
    amber_lum = np.median(a[amber].mean(axis=1)) if amber.any() else 200
    dark = a.mean(axis=2) < amber_lum * 0.62
    if dark.sum() < 60:
        return None, "no-dark-marks"
    lab, n = ndimage.label(dark, structure=np.ones((3, 3)))
    if n == 0:
        return None, "no-components"
    H, W = dark.shape
    slices = ndimage.find_objects(lab)
    comps = []
    for i, sl in enumerate(slices, 1):
        if sl is None:
            continue
        y0, y1 = sl[0].start, sl[0].stop
        x0, x1 = sl[1].start, sl[1].stop
        h, w = y1 - y0, x1 - x0
        npix = int((lab[sl] == i).sum())
        touches = y0 <= 1 or x0 <= 1 or y1 >= H - 1 or x1 >= W - 1
        comps.append({"i": i, "x0": x0, "x1": x1, "y0": y0, "y1": y1,
                      "w": w, "h": h, "fill": npix / max(1, h * w), "touches": touches})
    # digit candidates: tall-ish, not touching the crop border, sane aspect/fill
    raw_cands = [c for c in comps
                 if not c["touches"] and c["h"] >= 0.22 * H
                 and 0.15 <= c["w"] / max(1, c["h"]) <= 2.6
                 and 0.08 <= c["fill"] <= 0.70]
    if len(raw_cands) < 2:
        return None, f"digit-cands({len(raw_cands)})"
    hmed = float(np.median([c["h"] for c in raw_cands]))
    # decimal dots come from ALL blobs: small, squat, near baseline height
    dots = [c for c in comps
            if not c["touches"] and 0.03 * H <= c["h"] <= 0.22 * hmed
            and 0.5 <= c["w"] / max(1, c["h"]) <= 2.5]
    # split merged digit pairs at the darkest column valley
    cells = []
    for c in sorted(raw_cands, key=lambda c: c["x0"]):
        if c["w"] > 1.30 * c["h"]:
            m = (lab[c["y0"]:c["y1"], c["x0"]:c["x1"]] == c["i"])
            prof = m.sum(axis=0).astype(float)
            k0, k1 = int(0.30 * c["w"]), int(0.70 * c["w"])
            cut = k0 + int(np.argmin(prof[k0:k1]))
            left = dict(c, x1=c["x0"] + cut)
            right = dict(c, x0=c["x0"] + cut)
            for part in (left, right):
                part["w"] = part["x1"] - part["x0"]
                if part["w"] >= 0.30 * hmed:
                    cells.append(part)
            continue
        cells.append(c)
    digits = []
    for c in cells:
        if c["h"] < 0.55 * hmed or c["w"] < 0.30 * hmed:
            continue
        cell = (lab[c["y0"]:c["y1"], c["x0"]:c["x1"]] == c["i"])
        d = classify_digit(cell)
        if d is None:
            continue
        digits.append((c, d))
    if len(digits) < 3:
        return None, "glyphs-unreadable"
    out = ""
    for k, (c, d) in enumerate(digits):
        if k > 0:
            px = (digits[k - 1][0]["x1"] + c["x0"]) / 2
            if any(dd["x0"] - 0.1 * hmed <= px <= dd["x1"] + 0.1 * hmed
                   for dd in dots):
                out += "."
        out += d
    if "." not in out:
        return None, "no-decimal"
    try:
        wgt = float(out)
    except ValueError:
        return None, "parse"
    if not (0.05 <= wgt <= 500):
        return None, f"implausible({out})"
    return out, "ok"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.free.json")
    a = ap.parse_args()
    cfg = load_json(a.config)
    work = Path(cfg["paths"]["work_dir"])
    sup = Path(cfg["paths"]["supplier_sheets"]); sup.mkdir(parents=True, exist_ok=True)
    outp = Path(cfg["paths"]["out_dir"])
    setup_logging(work)
    designs = load_json(work / "inventory.json")   # sku+img available right after ingest
    rows, ok = [], 0
    for d in designs:
        raw = Path(cfg["paths"]["out_dir"]).parent / d["img"]
        if not raw.exists():
            raw = Path(d["img"])
        if not raw.exists():
            continue
        w, why = read_led(Image.open(raw))
        if w is not None:
            ok += 1
        rows.append({"sku": d["sku"], "weightG": w or "", "ledConf": why})
        LOG.info("LED %s -> %s (%s)", d["sku"], w or "-", why)
    with open(sup / "led-weights.csv", "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=["sku", "weightG", "ledConf"])
        wr.writeheader(); wr.writerows(rows)
    LOG.info("LED weights: %d/%d read cleanly -> %s", ok, len(rows), sup / "led-weights.csv")


if __name__ == "__main__":
    main()
