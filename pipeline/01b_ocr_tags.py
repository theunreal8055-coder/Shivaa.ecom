#!/usr/bin/env python3
"""STAGE 1b · OCR SUPPLIER TAGS — reads product code + weight off the green sample tags
that appear in supplier photos (like your 65-ring PDF). Outputs a supplier CSV that stage 2
consumes — real SKU + real weight, no guessing.

Usage: python 01b_ocr_tags.py --pdf raw/65rings.pdf --category rings
                              [--out suppliers/tags.csv] [--demo-page 5]
"""
import argparse, csv, re, sys
from pathlib import Path
from PIL import Image
import numpy as np
import pytesseract
try:
    import cv2
except ImportError:
    cv2 = None
from lib_common import setup_logging, LOG

CODE_RE = re.compile(r"([A-Z]{2,6}\s?-?\s?\d{3,6})")
Wt_RE = re.compile(r"(?:wt|wght|weight|ग्राम)?\s*[:\s.]*\s*(\d{1,3}\.\d{1,4})", re.I)
SKU_HINT = re.compile(r"PGS|SHV|SS-|SH-|GOLD|RIN", re.I)

def load_page(path: Path, scale=2.0):
    im = Image.open(path).convert("RGB")
    if scale != 1.0:
        im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    return im

def green_mask(arr: np.ndarray):
    """bright green tag: G clearly dominant over R and B."""
    r, g, b = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
    return (g > r + 25) & (g > b + 15) & (g > 90)

def tag_crop(im: Image.Image, pad=18):
    a = np.asarray(im)
    m = green_mask(a)
    if m.sum() < 500:
        return None
    ys, xs = np.where(m)
    x0, x1 = max(0, xs.min() - pad), min(im.width, xs.max() + pad)
    y0, y1 = max(0, ys.min() - pad), min(im.height, ys.max() + pad)
    return im.crop((x0, y0, x1, y1)), int(m.sum())

def ocr_rotate(crop: Image.Image, rotations=None):
    """deskew + threshold + OCR a tag crop. Returns (code, weight, angle, raw).
    Best config found on the 65-ring PDF: native 3000px image, 90° CCW first,
    then a fine sweep; percentile threshold isolates the dark printed text."""
    import numpy as np, cv2
    a = np.asarray(crop.convert("L"))
    best = (None, None, None, "")
    # downscale slightly for speed — tesseract is happy at ~1800px max side
    scale = min(1.0, 1800.0 / max(a.shape))
    if scale < 1.0:
        a = cv2.resize(a, (int(a.shape[1] * scale), int(a.shape[0] * scale)), interpolation=cv2.INTER_AREA)
    r90 = cv2.rotate(a, cv2.ROTATE_90_COUNTERCLOCKWISE)
    for fine in np.arange(-30, 31, 5):
        M = cv2.getRotationMatrix2D((r90.shape[1] // 2, r90.shape[0] // 2), float(fine), 1.0)
        rot = cv2.warpAffine(r90, M, (r90.shape[1], r90.shape[0]), borderValue=255)
        thr = np.percentile(rot, 25)
        binimg = np.where(rot < thr, 0, 255).astype("uint8")
        binimg = cv2.morphologyEx(binimg, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
        txt = pytesseract.image_to_string(binimg, config="--psm 6")
        code_m = CODE_RE.search(txt.replace(" ", ""))
        wt_m = Wt_RE.search(txt)
        code, wt = None, None
        if code_m and (SKU_HINT.search(code_m.group(1)) or len(code_m.group(1)) >= 6):
            code = code_m.group(1).replace(" ", "").upper()
        if wt_m:
            wt = wt_m.group(1)
        # line-level refine: split bands of dark rows, OCR each line alone
        if not (code and wt):
            try:
                lines = split_lines(binimg)
                for ln in lines:
                    lw, lh = ln.size
                    if lh < 22 or lw < 40: continue
                    padded = Image.new("L", (lw + 24, lh + 16), 255)
                    padded.paste(ln, (12, 8))
                    t7 = _safe_ocr(padded, "7", "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
                    t7d = _safe_ocr(padded, "7", "0123456789.:")
                    c2 = CODE_RE.search((t7 or "").replace(" ", ""))
                    w2 = Wt_RE.search(t7d or "")
                    if c2 and not code and (SKU_HINT.search(c2.group(1)) or len(c2.group(1)) >= 6):
                        code = c2.group(1).replace(" ", "").upper()
                    if w2 and not wt:
                        wt = w2.group(1)
            except Exception:
                pass
        if code and wt:
            return code, wt, float(fine), " ".join(txt.split())
        if wt and best[1] is None:
            best = (code, wt, float(fine), " ".join(txt.split()))
        if code and best[0] is None:
            best = (code, None, float(fine), " ".join(txt.split()))
    return best


def _safe_ocr(img, psm, whitelist=""):
    try:
        cfg = f"--psm {psm}"
        if whitelist:
            cfg += f" -c tessedit_char_whitelist={whitelist}"
        return pytesseract.image_to_string(img, config=cfg)
    except Exception:
        return ""


def split_lines(binimg, min_h=12, gap=8):
    """split a binary image into horizontal text bands (returns list of PIL-safe arrays)."""
    import numpy as np
    a = np.asarray(binimg)
    dark = (a < 128).sum(axis=1)
    rows = dark > 2
    bands, start = [], None
    for i, on in enumerate(rows):
        if on and start is None: start = i
        elif not on and start is not None:
            if i - start >= min_h: bands.append((start, i))
            start = None
    if start is not None: bands.append((start, len(rows)))
    # merge bands separated by tiny gaps (< gap px)
    merged = []
    for b in bands:
        if merged and b[0] - merged[-1][1] < gap:
            merged[-1] = (merged[-1][0], b[1])
        else:
            merged.append(list(b))
    out = []
    for y0, y1 in merged:
        seg = a[y0:y1, :]
        colsum = (seg < 128).sum(axis=0)
        xs = np.where(colsum > 0)[0]
        if len(xs) == 0: continue
        x0, x1 = max(0, xs.min() - 10), min(a.shape[1], xs.max() + 10)
        out.append(seg[:, x0:x1])
    # keep only the two largest bands (code & weight lines)
    out = sorted(out, key=lambda s: s.shape[0], reverse=True)
    for s in out:
        s = cv2.resize(s, (s.shape[1] * 2, s.shape[0] * 2), interpolation=cv2.INTER_CUBIC)
        yield (_pil(s))


def _pil(arr):
    from PIL import Image
    return Image.fromarray(arr)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--category", default="general")
    ap.add_argument("--out", default="suppliers/tags.csv")
    ap.add_argument("--work", default="work")
    ap.add_argument("--demo-page", type=int, default=0, help="only OCR one page (debug)")
    ap.add_argument("--native", action="store_true", default=True,
                    help="use native embedded JPEGs (3000px+) instead of page renders")
    a = ap.parse_args()
    work = Path(a.work); setup_logging(work)
    import pymupdf as fitz
    doc = fitz.open(a.pdf)
    pages = [a.demo_page - 1] if a.demo_page else list(range(len(doc)))
    rows, fails = [], []
    for pno in pages:
        page = doc[pno]
        if a.native:
            im = None
            for x in page.get_images(full=True):
                info = doc.extract_image(x[0])
                if info["width"] >= 1200 and info["height"] >= 1200:
                    import io
                    im = Image.open(io.BytesIO(info["image"]))
                    break
            if im is None:
                pm = page.get_pixmap(dpi=a.dpi)
                im = Image.frombytes("RGB", (pm.width, pm.height), pm.samples)
        else:
            pm = page.get_pixmap(dpi=a.dpi)
            im = Image.frombytes("RGB", (pm.width, pm.height), pm.samples)
        tc = tag_crop(im)
        if not tc:
            fails.append((pno + 1, "no green tag found")); continue
        crop, px = tc
        code, wt, ang, txt = ocr_rotate(crop)
        if not code or not wt:
            fails.append((pno + 1, f"ocr miss ({px} green px)")); continue
        rows.append({"page": pno + 1, "code": code, "weightG": wt, "angle": ang,
                     "raw": " ".join(txt.split())[:60]})
        LOG.info("p%-3d %-8s Wt %s g  (angle %s)", pno + 1, code, wt, ang)
    out = Path(a.out); out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["page", "code", "weightG", "angle", "raw"])
        w.writeheader(); w.writerows(rows)
    print(f"\nOCR: {len(rows)}/{len(pages)} tags read -> {out}")
    if fails:
        print("FAILED pages:", fails)

if __name__ == "__main__":
    main()
