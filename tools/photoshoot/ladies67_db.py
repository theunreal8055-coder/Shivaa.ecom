#!/usr/bin/env python3
"""LADIES-67 · db wiring — upsert the 67 ladies plain rings into cms/data/db.json.

Reads tools/photoshoot/ladies67-manifest.json (SKU, name, motif, weightG, shot
paths, mc 12%, gst note, sizes, tags) and, for every SKU whose FOUR generated
shots already exist in cms/images/designs/rings/, writes a product record shaped
exactly like the existing 65 PGS records (see PGS5001). Idempotent: re-running
updates the same record in place (matched by sku), never duplicates, never
touches other products. The db round-trip keeps the file's own indent=1 style.

Usage (repo root):
    python3 tools/photoshoot/ladies67_db.py PGS5066 PGS5067   # after a batch's shots PASS QA
    python3 tools/photoshoot/ladies67_db.py --all             # every manifest SKU with 4 shots on disk
    python3 tools/photoshoot/ladies67_db.py --verify          # read-only audit
"""
import argparse
import json
import secrets
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAN = ROOT / "tools/photoshoot/ladies67-manifest.json"
DB = ROOT / "cms/data/db.json"
IMG = ROOT / "cms/images/designs/rings"
SHOT_KEYS = ["hero", "macro", "model", "lifestyle"]
IST = timezone(timedelta(hours=5, minutes=30))


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def shots_present(sku):
    return all((IMG / f"{sku}_{i}_{k}.jpg").is_file()
               for i, k in enumerate(SHOT_KEYS, 1))


def build_record(d, man):
    w = d["weightG"]
    name, motif, sku = d["name"], d["motif"], d["sku"]
    desc = (f"{name} — ladies' plain 22K yellow gold ring, {w:g} g, {motif}. "
            f"Making charges 12% + 3% GST; gold price follows the live Jaipur "
            f"bullion rate of the day. BIS hallmark & purity assured by Shivaa "
            f"Jewellers, Jayal — Nagaur, Rajasthan.")
    return {
        "createdAt": datetime.now(IST).isoformat(timespec="seconds"),
        "active": True, "rating": 4.6, "reviews": 0,
        "stock": man.get("stock", 10),
        "sizes": man.get("sizes", ["10", "12", "14", "16"]),
        "tags": man.get("tags", ["Ring", "gold", "ladies", "plain"]),
        "images": [d["shots"][k] for k in SHOT_KEYS],
        "stoneValue": 0,
        "name": f"{name} Ladies Ring {sku} | Gold 22K",
        "category": man.get("category", "rings"),
        "metal": man.get("metal", "Gold"),
        "purity": man.get("purity", "22K"),
        "weightG": w,
        "mcScheme": man["mc"]["mcScheme"], "mcValue": man["mc"]["mcValue"],
        "stoneDesc": "plain gold — no stones",
        "stoneType": "None", "stoneColour": "",
        "desc": desc,
        "lessWeightG": 0, "wastagePct": 8,
        "barcode": "", "supplier": "Hitesh bhai — ladies plain lot (67, Sep 2026)",
        "supplierId": "ladies67-2026", "costPerGram": 0,
        "seo": {"keywords": [f"{motif} ladies gold ring",
                             "ladies plain 22K gold ring price",
                             "shivaa jewellers ring"],
                "alt": f"Gold 22K ladies plain ring — {name} ({motif}) | {sku}"},
        "category_note": "Ladies plain ring by Shivaa Jewellers",
        "mediaNote": "AI-stylised visualisation of the supplier design photo.",
        "sku": sku,
        "id": "p_" + secrets.token_hex(6),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("skus", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()

    man = load(MAN)
    db = load(DB)
    products = db["products"]
    by_sku = {p["sku"]: p for p in products}

    if a.verify:
        missing_imgs, bad = [], []
        for d in man["designs"]:
            p = by_sku.get(d["sku"])
            if not p:
                continue
            for img in p["images"]:
                if not (ROOT / ("cms" + img)):
                    missing_imgs.append(img)
            if p.get("mcValue") != 12 or p.get("mcScheme") != "percent":
                bad.append(d["sku"])
        new = [p for p in products if p["sku"].startswith("PGS5") and
               int(p["sku"][3:]) >= 5066]
        print(f"products total: {len(products)} · ladies67 wired: {len(new)}")
        print(f"missing image files: {len(missing_imgs)} · bad mc: {bad}")
        print(f"duplicate skus: {len(products) - len(by_sku)}")
        return 0 if not missing_imgs and not bad else 1

    want = [s.upper() for s in a.skus]
    if a.all:
        want = [d["sku"] for d in man["designs"]]
    done = skipped = 0
    ids = {p["id"] for p in products}
    for d in man["designs"]:
        sku = d["sku"]
        if want and sku not in want:
            continue
        if not shots_present(sku):
            print(f"  skip {sku}: shots not on disk yet")
            skipped += 1
            continue
        rec = build_record(d, man)
        while rec["id"] in ids:
            rec["id"] = "p_" + secrets.token_hex(6)
        ids.add(rec["id"])
        if sku in by_sku:                      # in-place refresh, keep id/created
            old = by_sku[sku]
            rec["id"] = old["id"]
            rec["createdAt"] = old.get("createdAt", rec["createdAt"])
            products[products.index(old)] = rec
        else:
            products.append(rec)
            by_sku[sku] = rec
        done += 1
        print(f"  wired {sku} {d['name']} {d['weightG']:g} g")
    if done:
        DB.write_text(json.dumps(db, indent=1, ensure_ascii=False) + "\n",
                      encoding="utf-8")
    print(f"done: {done} wired, {skipped} skipped · products now {len(products)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
