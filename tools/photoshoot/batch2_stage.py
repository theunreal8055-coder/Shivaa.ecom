#!/usr/bin/env python3
"""Stage finished batch-2 photoshoots for the live uploader:
demo48/media/{SKU}/shot_{studio,editorial,worn,gift}.jpg + meta.json (no video, v44 rule).
meta.json is generated from the db entry so live upload == db truth."""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
RINGS = ROOT / "cms" / "images" / "designs" / "rings"
STAGE = ROOT / "demo48" / "media"
DB = ROOT / "cms" / "data" / "db.json"
SHOTS = ("studio", "editorial", "worn", "gift")


def stage(sku):
    d = STAGE / sku
    d.mkdir(parents=True, exist_ok=True)
    for k in SHOTS:
        src = RINGS / f"{sku}_shot_{k}.jpg"
        if not src.exists():
            sys.exit(f"missing {src}")
        shutil.copy2(src, d / f"shot_{k}.jpg")
    db = json.loads(DB.read_text())
    p = next(x for x in db["products"] if x.get("sku") == sku)
    meta = {k: p[k] for k in ("sku", "name", "category", "metal", "purity", "weightG",
                              "mcScheme", "mcValue", "stoneValue", "stoneDesc", "stoneType",
                              "stoneColour", "desc", "tags", "sizes", "stock", "barcode",
                              "lessWeightG", "wastagePct", "active", "supplier", "supplierId",
                              "costPerGram", "seo", "category_note", "mediaNote", "images")
            if k in p}
    (d / "meta.json").write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    print("staged", sku, "->", d)


if __name__ == "__main__":
    for s in sys.argv[1:]:
        stage(s)
