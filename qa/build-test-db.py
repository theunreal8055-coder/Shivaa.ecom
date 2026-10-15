#!/usr/bin/env python3
"""Rebuild the LOCAL test fixture cms/data/db.json for the browser QA suites.

cms/data/db.json is gitignored (real data never enters git). Workspace resets
delete it, so run this before qa/preview_shim.py and the qa/browser suites:

    python3 qa/build-test-db.py

It writes a small synthetic catalogue built from cms/samples-payload.json.
Never commit the output and never ship it in a release zip.
"""
import collections
import copy
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, 'cms', 'samples-payload.json')
OUT = os.path.join(ROOT, 'cms', 'data', 'db.json')

src = json.load(open(SAMPLES, encoding='utf-8'))
prods = src['products']
bycat = collections.defaultdict(list)
for p in prods:
    bycat[p.get('category')].append(p)
pick = []
for _cat, lst in bycat.items():
    pick += lst[:3]
pick = pick[:14]

# the campaign studs the QA routes visit
base = prods[0]
for sid in ['p_stud_m1', 'p_stud_m2', 'p_stud_m3', 'p_stud_w1', 'p_stud_w2', 'p_stud_w3']:
    p = copy.deepcopy(base)
    p['id'] = sid
    p['sku'] = 'SHV-' + sid[-3:].upper()
    p['name'] = sid.replace('p_', '').replace('_', ' ').title() + ' 22K Gold Stud (Pair)'
    p['category'] = 'studs'
    pick.append(p)

db = {
    'products': pick,
    'catalogs': src['catalogs'][:4],
    'reviews': src['reviews'][:12],
    'settings': {
        'bannerOfferOn': True, 'bannerOfferCode': 'MAKING20',
        'jaipurPremium': 55, 'gold22Premium': 398, 'jaipurSilverPremium': 3,
        'bullionGoldPremium': 10, 'bullionSilverPremium': 2,
        'amritaPage': True,
    },
    'rates': {'override': None, 'last': {'gold24': 7200, 'gold22': 6600, 'gold18': 5400, 'silver': 90}},
    'orders': [], 'users': [], 'settlements': [], 'partners': [],
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(db, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
print('wrote', OUT, 'with', len(pick), 'products')
