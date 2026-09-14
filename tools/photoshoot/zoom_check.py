#!/usr/bin/env python3
"""v111 — zoom / crop QA for ring product shots.

Detects "ring too zoomed in / cut off by the frame" by isolating saturated
gold pixels (the ring) against the shot's neutral background and measuring
the ring blob's margins. Works for:
  - creamy/white studio + face covers (v44 white-face pass)
  - dark charcoal editorial shots (gold-on-slate is high contrast)
NOT valid for worn shots (skin is warm and would fake gold) or gift shots
with warm props.

PASS = every side margin >= 3% of that dimension AND ring spans <= 88% of
the frame width (house style: the good covers measure 40-62% width).

usage: zoom_check.py IMG [IMG...]        -> per-image report + exit 1 on any FAIL
       zoom_check.py --sku SKU1 SKU2...  -> checks that SKU's db.json images
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent.parent
DB = ROOT / 'cms/data/db.json'
GOLD = lambda r, g, b: (r - b > 45) & (g - b > 12) & (r > 90) & (g > 60)
MIN_MARGIN_FRAC = 0.03
MAX_SPAN_FRAC = 0.88


def ring_metrics(path):
    a = np.array(Image.open(path).convert('RGB'))
    h, w, _ = a.shape
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    m = GOLD(r, g, b)
    if not m.any():
        return None
    lab, n = ndimage.label(m)
    if not n:
        return None
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    ys, xs = np.where(lab == int(np.argmax(sizes)) + 1)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    prof = {}
    deep = {}
    for side, mm in (('L', m[:, :6]), ('R', m[:, -6:]), ('T', m[:6, :]), ('B', m[-6:, :])):
        prof[side] = round(float(mm.mean() * 100), 1)
        if side == 'L': rr, bb = r[:, :6], b[:, :6]
        elif side == 'R': rr, bb = r[:, -6:], b[:, -6:]
        elif side == 'T': rr, bb = r[:6, :], b[:6, :]
        else: rr, bb = r[-6:, :], b[-6:, :]
        deep[side] = round(float(((rr - bb) > 85)[mm].mean() * 100), 1) if mm.any() else 0.0
    return dict(w=w, h=h, span_w=round((x1 - x0 + 1) / w, 3), span_h=round((y1 - y0 + 1) / h, 3),
                mL=round(int(x0) / w, 3), mR=round((w - 1 - int(x1)) / w, 3),
                mT=round(int(y0) / h, 3), mB=round((h - 1 - int(y1)) / h, 3),
                edge=prof, deep=deep)


def verdict(mt, lenient=False):
    """strict (covers): full ring framed with real margins.
    lenient (editorials): fail only on an actual CUT (deep saturated gold at the
    frame edge = ring pixels sliced off) or the ring spanning >=95% of width."""
    if mt is None:
        return 'FAIL', 'no gold ring found'
    bad = []
    if not lenient:
        for k in ('mL', 'mR', 'mT', 'mB'):
            if mt[k] < MIN_MARGIN_FRAC:
                bad.append(f'{k}={mt[k]}')
        if mt['span_w'] > MAX_SPAN_FRAC:
            bad.append(f'span_w={mt["span_w"]}')
    else:
        if mt['span_w'] > 0.95:
            bad.append(f'span_w={mt["span_w"]}')
        for side in ('L', 'R', 'T', 'B'):
            if mt['edge'][side] > 15 and mt['deep'][side] > 45:
                bad.append(f'cut@{side}(edge {mt["edge"][side]}% deep {mt["deep"][side]}%)')
    return ('FAIL', ' '.join(bad)) if bad else ('PASS', '')


def main(argv):
    paths = []
    if argv and argv[0] == '--sku':
        db = json.loads(DB.read_text())
        by_sku = {p['sku']: p for p in db['products']}
        for sku in argv[1:]:
            p = by_sku[sku]
            paths.append((sku + ' cover', ROOT / ('cms' + p['images'][0]), False))
            paths.append((sku + ' editorial', ROOT / ('cms' + p['images'][1]), True))
    else:
        paths = [(Path(a).name, Path(a), False) for a in argv]
    if not paths:
        sys.exit(__doc__)
    fails = 0
    for label, p, lenient in paths:
        mt = ring_metrics(str(p))
        v, why = verdict(mt, lenient=lenient)
        if v == 'FAIL':
            fails += 1
        if mt:
            print(f'{label:28} {v}  span {mt["span_w"]:.0%}w/{mt["span_h"]:.0%}h  margins L{mt["mL"]:.0%} R{mt["mR"]:.0%} T{mt["mT"]:.0%} B{mt["mB"]:.0%}  edgeGold {mt["edge"]} {why}')
        else:
            print(f'{label:28} {v}  {why}')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main(sys.argv[1:])
