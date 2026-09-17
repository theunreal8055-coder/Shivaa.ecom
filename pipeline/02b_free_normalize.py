#!/usr/bin/env python3
"""STAGE 2-FREE · ₹0 NORMALISE — PDF inventory + free OCR tags + manual weights CSV -> designs.json.

The paid flow (02_normalize_data.py) builds designs from rich supplier sheets. The free
flow builds them straight from stage-1 crops and fills weights from two ₹0 sources:

  1. freeops/suppliers/tags-<pdf>.csv  — stage 1b Tesseract OCR of the green tags (₹0)
  2. freeops/suppliers/manual-weights.csv — a simple owner-editable CSV (₹0), columns:
       sku,weightG,metal,purity,name
     e.g. copied from Hitesh bhai's WhatsApp price list; manual rows win over OCR.

Designs still missing weight/metal get needsData:true — stage 5f quarantines them
(never guessed, never invented) and the nightly report tells you to fill them.

Run: python 02b_free_normalize.py --config config.free.json
"""
import argparse, csv, json, re
from pathlib import Path

from lib_common import setup_logging, load_json, save_json, LOG


def read_csv(p: Path):
    with open(p, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def fnum(v):
    m = re.search(r"\d+(?:\.\d+)?", str(v).replace(",", ""))
    return float(m.group()) if m else 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.free.json")
    a = ap.parse_args()
    cfg = load_json(a.config)
    work = Path(cfg["paths"]["work_dir"])
    sup = Path(cfg["paths"]["supplier_sheets"])
    setup_logging(work)

    inv = load_json(work / "inventory.json")
    by_page = {(r.get("source", ""), int(r.get("page", 0))): r["sku"] for r in inv}
    data = {}   # sku -> partial info

    # 1 · free OCR tag sheets (stage 1b): match (pdf stem, page) -> sku
    if sup.exists():
        for f in sorted(sup.glob("tags-*.csv")):
            stem = f.stem[5:]          # strip "tags-"
            hits = 0
            for row in read_csv(f):
                try:
                    page = int(float(row.get("page", 0)))
                except Exception:
                    continue
                w = fnum(row.get("weightG", 0))
                if w <= 0:
                    continue
                for (src, pg), sku in by_page.items():
                    if pg == page and stem in src and (not data.get(sku, {}).get("weightG")):
                        data[sku] = {"weightG": w, "metal": "Gold", "purity": "22K",
                                     "supplierCode": (row.get("code") or "").strip()}
                        hits += 1
            LOG.info("ocr %s: %d weights matched", f.name, hits)

    # 1b · LED weights read off supplier scale photos — EXPERIMENTAL.
    # Only applied when free_tier.trust_led_ocr is true. Default OFF: a confident
    # wrong weight misprices gold. LED readings are written to the report as hints;
    # the owner confirms them via manual-weights.csv.
    ledf = sup / "led-weights.csv" if sup.exists() else None
    trust_led = bool(cfg.get("free_tier", {}).get("trust_led_ocr", False))
    if ledf and ledf.exists() and trust_led:
        n = 0
        for row in read_csv(ledf):
            sku = (row.get("sku") or "").strip().upper()
            w = fnum(row.get("weightG", 0))
            if sku and w > 0 and str(row.get("ledConf")) == "ok":
                cur = data.get(sku, {})
                if not cur.get("weightG"):
                    data[sku] = {"weightG": w, "metal": "Gold", "purity": "22K",
                                 "supplierCode": "LED-OCR"}
                    n += 1
        LOG.info("led-weights.csv: %d clean readings applied (trust mode ON)", n)
    elif ledf and ledf.exists():
        LOG.info("led-weights.csv present but trust_led_ocr=false — treated as hints only")

    # 2 · manual CSV (owner-edited, wins over OCR)
    manual = sup / "manual-weights.csv" if sup.exists() else None
    if manual and manual.exists():
        for row in read_csv(manual):
            sku = (row.get("sku") or "").strip().upper()
            if not sku:
                continue
            data.setdefault(sku, {})
            if fnum(row.get("weightG", 0)): data[sku]["weightG"] = fnum(row["weightG"])
            if row.get("metal"):  data[sku]["metal"] = row["metal"].strip()
            if row.get("purity"): data[sku]["purity"] = row["purity"].strip()
            if row.get("name"):   data[sku]["name"] = row["name"].strip()
        LOG.info("manual-weights.csv: %d rows", len(read_csv(manual)))

    out = []
    for r in inv:
        info = data.get(r["sku"], {})
        w = float(info.get("weightG") or 0)
        metal = info.get("metal") or ""
        purity = info.get("purity") or ""
        out.append({
            "sku": r["sku"], "category": r["category"], "img": r["img"],
            "name": info.get("name", ""), "metal": metal, "purity": purity,
            "weightG": w, "mcScheme": "percent", "mcValue": 12 if metal != "Silver" else 15,
            "stoneType": "", "stoneColour": "", "stoneDesc": "", "sizes": [],
            "supplier": "", "supplierId": info.get("supplierCode", ""),
            "costPerGram": 0, "stock": 1, "tags": [],
            "pdfPage": r.get("page"), "needsData": not (w and metal),
        })
    save_json(work / "designs.json", out)
    ready = sum(1 for d in out if not d["needsData"])
    LOG.info("free normalise: %d designs · %d with weights (upload-ready) · %d need data",
             len(out), ready, len(out) - ready)
    print(f"\nMASTER-FREE: {len(out)} designs ({ready} priced-ready) -> {work/'designs.json'}")


if __name__ == "__main__":
    main()
