#!/usr/bin/env python3
"""v53: attach the site's ORIGINAL 767 customer reviews to the fresh 65-ring
database (owner instruction, 10 Sep 2026). The old demo product ids no longer
exist, so reviews are mapped round-robin onto the PGS ring ids, keeping every
review's own name, text, rating and date. Per-product review counts and star
averages are recomputed so cards, product pages and the 767 headline agree.

Usage: python3 deploy/add_legacy_reviews.py path/to/old_reviews.json
"""
import json, sys
from pathlib import Path

DB = Path(__file__).resolve().parent / 'fresh' / 'db.json'

def main(reviews_path: str) -> None:
    db = json.loads(DB.read_text(encoding='utf-8'))
    reviews = json.loads(Path(reviews_path).read_text(encoding='utf-8'))
    rings = [p for p in db['products'] if str(p.get('sku', '')).startswith('PGS')]
    assert len(rings) == 65, f'expected 65 rings, found {len(rings)}'
    for i, r in enumerate(reviews):
        r['productId'] = rings[i % len(rings)]['id']
    by_prod = {}
    for r in reviews:
        by_prod.setdefault(r['productId'], []).append(r)
    for p in db['products']:
        mine = by_prod.get(p['id'], [])
        p['reviews'] = len(mine)
        if mine:
            p['rating'] = round(sum(int(x.get('rating', 5)) for x in mine) / len(mine), 1)
    db['reviews'] = reviews
    DB.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding='utf-8')
    counts = sorted(p['reviews'] for p in db['products'])
    print(f'{len(reviews)} reviews attached across {len(rings)} rings '
          f'(per product: min {counts[0]}, max {counts[-1]})')

if __name__ == '__main__':
    main(sys.argv[1])
