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
    # v221 — the making-charges board. cms/api.php serves this key and
    # qa/preview_shim.py mirrors that route, so the fixture must carry it:
    # without it the shim raised KeyError -> 500 on GET /api/making-charges on
    # every page boot (app.js falls back to {table: []}, so nothing broke
    # visibly, but the 500s slowed every jsdom boot and made the timing-based
    # suites flaky). Row shape mirrors admin.js addMCRow().
    'makingCharges': [
        {'id': 'mc1', 'category': 'Ring', 'purity': '22K', 'mode': 'perGram',
         'value': 620, 'min': 400, 'note': ''},
        {'id': 'mc2', 'category': 'Chain', 'purity': '22K', 'mode': 'perGram',
         'value': 540, 'min': 350, 'note': ''},
        {'id': 'mc3', 'category': 'Bangle', 'purity': '22K', 'mode': 'perGram',
         'value': 500, 'min': 300, 'note': ''},
    ],
    'rates': {'override': None, 'last': {'gold24': 7200, 'gold22': 6600, 'gold18': 5400, 'silver': 90}},
    'orders': [], 'users': [], 'settlements': [], 'partners': [],
}


def staff(today):
    """v229 — the accounts the Shivaa Black and in-store bill suites need.

    The plain fixture has ZERO users, which means no admin token exists at all,
    so nothing owner-side can be exercised. --with-staff adds:
      · the owner (admin) — the only writer on the bill desk and the card queue;
      · one Shivaa Black member whose card expires in 18 days, i.e. inside the
        30-day renewal window, holding a free card still 'to-ship'. Its stored
        discountPct is deliberately 20: the programme moved to 25 in v229, and a
        card created under the old number must still show the new one, because
        the server overrides it from the setting rather than from the row;
      · one unrelated customer, who must get 403 on somebody else's bill.

    Dates are relative to today, so the fixture never goes stale: a hard-coded
    expiry would silently turn 'renewal open' into 'expired' six months later
    and the suite would keep passing for the wrong reason.
    """
    import datetime as dt
    exp = today + dt.timedelta(days=18)
    issued = today - dt.timedelta(days=165)
    iso = lambda d: d.strftime('%Y-%m-%dT%H:%M:%S')
    return [
        {'id': 'u_owner', 'name': 'Shivaa Owner', 'email': 'owner@shivaa.in',
         'phone': '9000000001', 'role': 'admin', 'loyaltyPoints': 0,
         'createdAt': iso(today - dt.timedelta(days=900)), 'addresses': [], 'profile': {}},
        {'id': 'u_aarti', 'name': 'Aarti Sharma', 'email': 'aarti@example.com',
         'phone': '9308956260', 'role': 'customer', 'loyaltyPoints': 340,
         'createdAt': iso(today - dt.timedelta(days=400)),
         'addresses': [{'name': 'Aarti Sharma', 'phone': '9308956260', 'line1': '14 Gangaur Marg',
                        'city': 'Jaipur', 'state': 'Rajasthan', 'pin': '302001'}],
         'profile': {},
         'blackCard': {
             'version': 2, 'program': 'Shivaa Black',
             'memberId': 'SBM000123', 'cardNumber': '2020 1234 5678 9012',
             'holderName': 'Aarti Sharma', 'mobile': '9308956260',
             'issuedAt': iso(issued), 'expiresAt': iso(exp),
             # v230 — stored at 25 on purpose. The programme ships at 20, and the
             # point of this row is to prove the server OVERRIDES whatever a card
             # carries with the setting: a card that stored the same number as the
             # default would let that assertion pass while testing nothing.
             'discountPct': 25, 'discountBasis': 'making-charges',
             'couponId': 'c_black_aarti', 'certificateNo': 'SFP000123',
             'certificateTitle': 'Shivaa Family Prestigious Member',
             'certificateIssuedAt': iso(issued), 'renewals': 0,
             'delivery': {'status': 'to-ship', 'name': 'Aarti Sharma',
                          'address': '14 Gangaur Marg', 'city': 'Jaipur', 'pincode': '302001',
                          'phone': '9308956260', 'requestedAt': iso(issued)}}},
        {'id': 'u_rohit', 'name': 'Rohit Mehta', 'email': 'rohit@example.com',
         'phone': '9812345678', 'role': 'customer', 'loyaltyPoints': 10,
         'createdAt': iso(today - dt.timedelta(days=60)), 'addresses': [], 'profile': {}},
    ]


if __name__ == '__main__':
    import argparse
    import datetime
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--with-staff', action='store_true',
                    help='add the owner, one Shivaa Black member inside the renewal window, '
                         'and one unrelated customer (the v229 suites need them)')
    a = ap.parse_args()
    if a.with_staff:
        db['users'] = staff(datetime.date.today())
        # The percentage is deliberately ABSENT: settings.blackDiscountPct has no
        # row yet on the live site either, so the code's own default (25) is what
        # must be proven, not a number the fixture handed it.
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(db, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print('wrote', OUT, 'with', len(pick), 'products',
          'and %d user(s)' % len(db['users']),
          '(--with-staff)' if a.with_staff else '(plain)')
