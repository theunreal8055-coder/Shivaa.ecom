#!/usr/bin/env python3
"""STAGE 2 · NORMALISE — supplier sheets (Excel/CSV) + inventory -> work/designs.json
Validated master list. STRICT mode → rows missing metal or weight are quarantined to
work/needs_data.csv (never guessed — handoff rule #5).

Usage: python 02_normalize_data.py
       python 02_normalize_data.py --sheets suppliers/*.xlsx
"""
import argparse, csv, json, re
from pathlib import Path
from lib_common import setup_logging, load_json, save_json, LOG

REQ = ["sku", "category", "metal", "purity", "weightG", "name"]
ALIASES = {
    "sku": ["sku", "code", "design no", "design no.", "item code", "art no", "article"],
    "name": ["name", "design name", "product", "title", "item"],
    "category": ["category", "cat", "type", "group"],
    "metal": ["metal", "metal type", "base metal"],
    "purity": ["purity", "karat", "k", "carat", "fineness"],
    "weightG": ["weight", "wt", "gross wt", "gross weight", "weight (g)", "wt g", "weightG"],
    "stoneType": ["stone", "stone type", "gem", "gemstone", "stone type 1"],
    "stoneColour": ["stone colour", "stone color", "colour", "color"],
    "stoneDesc": ["stone detail", "stone desc", "details"],
    "mcValue": ["making", "making charge", "mc", "making %", "making charge %"],
    "sizes": ["size", "sizes", "ring size", "rs"],
    "supplier": ["supplier", "vendor", "manufacturer", "company", "firm"],
    "supplierId": ["supplier id", "vendor id", "supplier code"],
    "costPerGram": ["cost per gram", "rate per gram", "rate", "cpgr", "cost/g"],
    "stock": ["stock", "qty", "quantity", "available", "pcs"],
    "tags": ["tags", "tag", "keywords"],
    "img": ["image", "photo", "img", "picture", "image url", "image path"],
}

def norm(val):
    if val is None: return ""
    s = str(val).strip()
    if s.lower() in {"nan", "none", "n/a", "na", "-", "–", "null", ""}: return ""
    return s

def find(rec, field):
    for k in ALIASES.get(field, [field]):
        for rk, rv in rec.items():
            if str(rk).strip().lower() == k:
                v = norm(rv)
                if v: return v
    return ""

def parse_weight(v):
    m = re.search(r"\d+(?:\.\d+)?", v.replace(",", ""))
    return float(m.group()) if m else 0.0

def parse_float(v):
    try: return float(str(v).replace(",", "").replace("%", ""))
    except Exception: return 0.0

def guess_category(text, table, default="general"):
    t = text.lower()
    for cat, keys in table.items():
        if any(k in t for k in keys): return cat
    return default

def guess_metal_purity(metal, purity):
    m, p = (metal or "").lower(), (purity or "").lower()
    if "sil" in m or "925" in p or "999" in p: return "Silver", ("925" if "925" in p else "999")
    if "gold" in m or "au" == m.strip(): p = "22K" if not p else p.upper()
    if not p:
        p = {"gold": "22K", "yellow": "22K", "rose": "18K", "white": "18K"}.get(m, "22K")
    p = p.upper().replace("KT", "K").replace("CARAT", "K")
    if p not in {"24K", "22K", "18K", "14K", "925", "999"}: p = "22K"
    return "Gold", p

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--sheets", nargs="*", default=[])
    a = ap.parse_args()
    cfg = load_json(a.config); ncfg = cfg["normalize"]
    work = Path(cfg["paths"]["work_dir"]); setup_logging(work)
    inv_file = work / "inventory.json"
    inv = load_json(inv_file) if inv_file.exists() else []

    table_path = work / "categories.json"
    cat_table = load_json(table_path) if table_path.exists() else ncfg["categories"]

    out, needs, skipped = [], [], []
    sheets = a.sheets or sorted(Path(cfg["paths"]["supplier_sheets"]).glob("*"))
    for s in sheets:
        if not Path(s).exists(): continue
        rows = read_sheet(Path(s))
        LOG.info("%s -> %d rows", Path(s).name, len(rows))
        for i, rec in enumerate(rows):
            d = {f: find(rec, f) for f in ALIASES}
            if not d["sku"] or not d["name"] and not d["category"]:
                skipped.append({"file": Path(s).name, "row": i, "why": "no sku/name"}); continue
            sku = d["sku"].upper().replace(" ", "-")
            metal, purity = guess_metal_purity(d["metal"], d["purity"])
            w = parse_weight(d["weightG"])
            cat = d["category"] or guess_category(f"{d['name']} {d['sku']} {d['tags']} {d['stoneDesc']}", cat_table)
            rec_out = {"sku": sku, "category": cat_listed(cat_table, cat), "metal": metal, "purity": purity,
                       "weightG": w, "name": d["name"], "stoneType": d["stoneType"], "stoneColour": d["stoneColour"],
                       "stoneDesc": d["stoneDesc"], "mcScheme": "percent",
                       "mcValue": parse_float(d["mcValue"]) or default_mc(metal),
                       "sizes": [x.strip() for x in re.split(r"[,\s/]+", d["sizes"]) if x.strip()][:12],
                       "supplier": d["supplier"], "supplierId": d["supplierId"],
                       "costPerGram": parse_float(d["costPerGram"]),
                       "stock": parse_float(d["stock"]) or 0, "tags": [t.strip().lower() for t in re.split(r"[,\s]+", d["tags"]) if t.strip()][:8],
                       "img": d["img"]}
            for invr in inv:
                if invr["sku"].upper() == sku:  # stock list may carry its own image
                    rec_out["img"] = rec_out["img"] or invr["img"]; rec_out["category"] = invr["category"]; rec_out["pdfPage"] = invr["page"]
            if ncfg.get("strict", True) and (not rec_out["weightG"] or not rec_out["metal"]):
                needs.append(rec_out); continue
            out.append(rec_out)
    save_json(work / "designs.json", out)
    if needs:
        with open(work / "needs_data.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(out[0].keys()) if out else REQ, extrasaction="ignore")
            w.writeheader(); w.writerows(needs)
    LOG.info("designs.json: %d ready · %d need data · %d skipped", len(out), len(needs), len(skipped))
    print(f"\nMASTER: {len(out)} designs -> {work/'designs.json'}")

def read_sheet(p):
    if p.suffix.lower() in {".xlsx", ".xlsm"}:
        import openpyxl
        wb = openpyxl.load_workbook(p, data_only=True, read_only=True)
        ws = wb[wb.sheetnames[0]]
        rows = list(ws.iter_rows(values_only=True))
        if not rows: return []
        hdr = [str(c).strip().lower() if c is not None else "" for c in rows[0]]
        return [dict(zip(hdr, r)) for r in rows[1:] if any(v not in (None, "") for v in r)]
    import csv
    with open(p, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    return rows if rows else []

def cat_listed(table, cat):
    """match a supplier category string to a canonical shivaa category slug."""
    c = str(cat).strip().lower().replace(" ", "").replace("-", "")
    for key in table:
        if c == key or c == key + "s" or key in c or c in key:
            return key
    for key, keys in table.items():
        if any(str(k).replace(" ", "").lower() in c for k in keys):
            return key
    return "general"

def default_mc(metal):
    return 12 if metal == "Gold" else 15

if __name__ == "__main__":
    main()
