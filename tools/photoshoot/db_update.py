#!/usr/bin/env python3
"""Point PGS SKU db entries at their full 4-shot + video media set (byte-faithful)."""
import json, sys
from pathlib import Path

DB = Path('/home/user/Shivaa.ecom/cms/data/db.json')
SHOTS = ('studio', 'editorial', 'worn', 'gift')


def update(sku: str):
    db = json.loads(DB.read_text())
    hit = 0
    for p in db['products']:
        if p.get('sku') == sku:
            p['images'] = [f"/images/designs/rings/{sku}_shot_{k}.jpg" for k in SHOTS]
            p['video'] = f"/images/designs/rings/{sku}_video.mp4"
            p['mediaNote'] = "AI-stylised visualisation of the original design photo."
            hit += 1
    if hit != 1:
        sys.exit(f"expected exactly 1 product for {sku}, found {hit}")
    DB.write_text(json.dumps(db, indent=2, ensure_ascii=True))
    print(f"db updated: {sku}")


if __name__ == '__main__':
    for sku in sys.argv[1:]:
        update(sku)
