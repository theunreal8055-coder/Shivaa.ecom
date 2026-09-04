#!/usr/bin/env python3
"""STAGE 1 · INGEST — catalogue PDF(s) / photo folders -> design crops + inventory.csv
One design photo per row. Design images are detected as real image XObjects positioned on
the page; every crop is saved, and page-level art is kept as fallback.

Usage: python 01_ingest_pdf.py --pdf raw/Rings-Catalogue.pdf --category rings
                               --pdf raw/other.pdf --category necklaces
       python 01_ingest_pdf.py --dir raw/photos --category rings
"""
import argparse, csv, json, sys
from pathlib import Path
from lib_common import setup_logging, save_json, sku_from_pdf, LOG

def ingest_pdf(pdf: Path, category: str, cfg: dict, out: Path, rows: list):
    import pymupdf as fitz
    d = fitz.open(pdf)
    LOG.info("PDF %s · %d pages", pdf.name, len(d))
    kept = 0
    for pno in range(len(d)):
        if pno == 0 and cfg.get("skip_cover", True):
            LOG.info("  page 1 = cover, skipped (set ingest.skip_cover=false for design covers)")
            continue
        page = d[pno]
        rects = []
        for im in page.get_images(full=True):
            try:
                for r in page.get_image_rects(im[0]):
                    rects.append(r)
            except Exception:
                continue
        # drop tiny icons (logos) and full-bleed backgrounds.
        # rects are in PDF points — convert the pixel threshold to points for this dpi
        pt = cfg["min_crop_px"] * 72.0 / cfg["dpi_crop"]
        rects = [r for r in rects if r.width > pt and r.height > pt]
        # de-duplicate overlapping detections (same PNG used as pattern)
        clean = []
        for r in sorted(rects, key=lambda r: (r.y0, r.x0)):
            if not any((r & c).get_area() > 0.6 * min(r.get_area(), c.get_area()) for c in clean):
                clean.append(r)
        for i, r in enumerate(clean):
            pm = page.get_pixmap(dpi=cfg["dpi_crop"], clip=r)
            sku = sku_from_pdf(kept + 1, category)   # stable sequential SKU
            fp = out / category / f"{sku}.jpg"
            fp.parent.mkdir(parents=True, exist_ok=True)
            pm.save(fp)
            rows.append({"sku": sku, "category": category, "source": pdf.name,
                         "page": pno + 1, "img": str(fp.relative_to(out.parent)),
                         "w": pm.width, "h": pm.height})
            kept += 1
    LOG.info("  -> %d design crops", kept)
    return kept

def ingest_dir(d, category, cfg, out, rows):
    exts = {".jpg", ".jpeg", ".png", ".webp"}
    for f in sorted(Path(d).iterdir()):
        if f.suffix.lower() in exts:
            sku = sku_from_pdf(len(rows) + 1, category)
            fp = out / category / f"{sku}.jpg"
            fp.parent.mkdir(parents=True, exist_ok=True)
            from PIL import Image
            im = Image.open(f).convert("RGB"); im.save(fp, quality=92)
            rows.append({"sku": sku, "category": category, "source": f.name, "page": "",
                         "img": str(fp.relative_to(out.parent)), "w": im.width, "h": im.height})

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", action="append", default=[], help="PDF path (repeatable)")
    ap.add_argument("--dir", action="append", default=[])
    ap.add_argument("--category", default="rings", help="category for --dir mode")
    ap.add_argument("--config", default="config.json")
    a = ap.parse_args()
    cfg = json.load(open(a.config)) if Path(a.config).exists() else {}
    icfg = cfg.get("ingest", {"dpi_crop": 200, "min_crop_px": 300})
    work = Path(cfg.get("paths", {}).get("work_dir", "work"))
    out = Path(cfg.get("paths", {}).get("out_dir", "out"))
    setup_logging(work)
    rows = []
    for p in a.pdf:
        # --pdf accepts "path:category" so the category is explicit and exact
        if ":" in p and not p.startswith(("http",)) and "://" not in p:
            path, cat = p.rsplit(":", 1)
        else:
            path, cat = p, a.category
        ingest_pdf(Path(path), cat, icfg, out, rows)
    for d in a.dir:
        ingest_dir(d, a.category, icfg, out, rows)
    # de-dup by sku, write inventory
    seen, uniq = set(), []
    for r in rows:
        if r["sku"] in seen: continue
        seen.add(r["sku"]); uniq.append(r)
    with open(work / "inventory.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["sku", "category", "source", "page", "img", "w", "h"])
        w.writeheader(); w.writerows(uniq)
    save_json(work / "inventory.json", uniq)
    print(f"\nINVENTORY: {len(uniq)} designs -> {work/'inventory.csv'}")

if __name__ == "__main__":
    main()
