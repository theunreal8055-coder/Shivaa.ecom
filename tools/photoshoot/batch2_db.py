#!/usr/bin/env python3
"""PGS batch-2 (48 rings, PGS5066..PGS5113) db.json tool — byte-faithful.

create          add every ledger design that is missing (idempotent), 12% making
                charges, interim cover = cleaned catalogue ref, photoStatus pending.
wire SKU...     point a finished photoshoot at its 4-shot set (macro studio cover,
                editorial detail, model/worn, second detail), photoStatus complete,
                no video (v44 house rule for rings).
"""
import json
import secrets
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DB = HERE.parent.parent / "cms" / "data" / "db.json"
LEDGER = HERE.parent.parent / "demo48" / "work" / "batch2_ledger.json"
SHOTS = ("studio", "editorial", "worn", "gift")
CREATED = "2026-09-13T12:00:00+05:30"
DESC = ("{name} Ring {sku} — Gold 22K, {w} g men's ring with a white polki / CZ pavé plate "
        "and hand-cut shoulders, hand-finished by our karigars with 12% making charges. "
        "Gold price follows the live Jaipur bullion rate of the day. BIS hallmark & purity "
        "assured by Shivaa Jewellers, Jayal — Nagaur, Rajasthan.")


def load():
    return json.loads(DB.read_text())


def save(db):
    DB.write_text(json.dumps(db, indent=2, ensure_ascii=True))


def entry(row):
    sku, name, w = row["sku"], row["name"], row["weightG"]
    ws = f"{w:.3f}".rstrip("0").rstrip(".") if w % 1 else f"{w:.1f}"
    title = f"{name} Ring {sku} | Gold 22K"
    return {
        "createdAt": CREATED,
        "active": True,
        "rating": 4.6,
        "reviews": 0,
        "stock": 10,
        "sizes": ["12", "14", "16", "18"],
        "tags": ["Ring", "gold", "22k", f"{ws}g", "polki", "handcrafted", "bishallmarked", "mens"],
        "images": [f"/images/designs/rings/{sku}.jpg"],
        "stoneValue": 0,
        "name": title,
        "category": "rings",
        "metal": "Gold",
        "purity": "22K",
        "weightG": w,
        "mcScheme": "percent",
        "mcValue": 12,
        "stoneDesc": "polki / CZ pavé setting",
        "stoneType": "White",
        "stoneColour": "",
        "desc": DESC.format(name=name, sku=sku, w=ws),
        "lessWeightG": 0,
        "wastagePct": 8,
        "barcode": "",
        "supplier": "",
        "supplierId": "",
        "costPerGram": 0,
        "seo": {
            "keywords": [f"polki / cz pavé setting ring", f"gold 22K ring price", f"shivaa jewellers ring"],
            "alt": f"Gold 22K ring with polki / CZ pavé plate — {title}",
        },
        "category_note": "Ring by Shivaa Jewellers",
        "mediaNote": "Catalogue reference photo shown; full 4-shot e-commerce set (macro, model, 2 detail) in progress — batch-2 ledger in HANDOFF.md.",
        "photoStatus": "pending-4shot",
        "supplierTag": row["tag"],
        "sku": sku,
        "id": "p_" + secrets.token_hex(6),
    }


def create():
    db = load()
    have = {p.get("sku") for p in db["products"]}
    rows = json.loads(LEDGER.read_text())["pages"]
    added = [r["sku"] for r in rows if r["sku"] not in have]
    db["products"].extend(entry(r) for r in rows if r["sku"] not in have)
    save(db)
    print(f"products: {len(db['products'])} (added {len(added)})")
    print("added:", " ".join(added))


def wire(skus):
    db = load()
    for sku in skus:
        hit = 0
        for p in db["products"]:
            if p.get("sku") == sku:
                p["images"] = [f"/images/designs/rings/{sku}_shot_{k}.jpg" for k in SHOTS]
                p.pop("video", None)
                p["mediaNote"] = "AI-stylised visualisation of the original design photo."
                p["photoStatus"] = "complete"
                hit += 1
        if hit != 1:
            sys.exit(f"expected exactly 1 product for {sku}, found {hit}")
    save(db)
    print("wired:", " ".join(skus))


if __name__ == "__main__":
    if sys.argv[1] == "create":
        create()
    elif sys.argv[1] == "wire":
        wire(sys.argv[2:])
    else:
        sys.exit("usage: batch2_db.py create | wire SKU...")
