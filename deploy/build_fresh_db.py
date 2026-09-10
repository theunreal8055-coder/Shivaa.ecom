#!/usr/bin/env python3
"""Build the FRESH-INSTALL database (v50).

Owner's instruction: NO sample products. Only the 65 signature rings with
full data; every other category empty; one admin account with a freshly
minted bcrypt password (printed to stdout ONCE for the install doc).

Run:  python3 deploy/build_fresh_db.py  --hash '$2b$12$...'
      (hash made with: python3 -c "import crypt;print(crypt.crypt(PW, crypt.mksalt(crypt.METHOD_BLOWFISH)))")
Output: deploy/fresh/db.json
"""
import argparse, json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / 'cms' / 'data' / 'db.json'
OUT = HERE / 'fresh' / 'db.json'

ap = argparse.ArgumentParser()
ap.add_argument('--hash', required=True)
a = ap.parse_args()

db = json.loads(SRC.read_text(encoding='utf-8'))
fresh = {}

# products: ONLY the 65 PGS signature rings, full data, orderable stock
prods = []
for p in db.get('products', []):
    if not str(p.get('sku', '')).startswith('PGS'):
        continue
    p = dict(p)
    p['active'] = True
    p['stock'] = max(10, int(p.get('stock') or 0))          # bridge default
    p.setdefault('mediaNote', 'AI-stylised visualisation of the original design photo.')
    p['reviews'] = 0
    p['rating'] = p.get('rating') or 4.6
    prods.append(p)
prods.sort(key=lambda x: x['sku'])
fresh['products'] = prods

# exactly one admin, fresh bcrypt hash; every sample account gone
admins = [u for u in db.get('users', []) if (u.get('role') or '') == 'admin']
admin = dict(admins[0]) if admins else {'id': 'u_admin', 'name': 'Owner', 'email': 'admin@shivaa.in', 'role': 'admin', 'phone': '+91 8905005921'}
admin['passHash'] = a.hash
admin.pop('salt', None)
fresh['users'] = [admin]

# everything user-generated starts empty
for k in ['orders', 'partners', 'coupons', 'catalogs', 'reviews', 'settlements',
          'serviceRequests', 'newsletter', 'contactMsgs', 'rateAlerts', 'pages',
          'tokens', 'loginfails', 'bullionOrders', 'metalOrders', 'customOrders',
          'finaleEntries', 'finaleAttempts', 'securityLog', 'resetRate',
          'mail', 'mailRate', 'pubRate']:
    fresh[k] = [] if k not in ('mail', 'mailRate', 'pubRate') else {}

# keep the store's configuration, not its history
for k in ['settings', 'rates', 'makingCharges']:
    if k in db:
        fresh[k] = db[k]
fresh.setdefault('settings', {})
fresh.setdefault('rates', db.get('rates', {}))
fresh.setdefault('makingCharges', db.get('makingCharges', {}))

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(fresh, ensure_ascii=False, indent=1), encoding='utf-8')
print(f"wrote {OUT}: {len(prods)} rings, {len(fresh['users'])} user, admin={admin['email']}")
