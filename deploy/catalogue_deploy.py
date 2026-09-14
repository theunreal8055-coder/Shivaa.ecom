#!/usr/bin/env python3
"""CATALOGUE DEPLOY (v111) — make the LIVE catalogue exactly the 65 PGS rings
from cms/data/db.json (the master), with photos uploaded from cms/images/.

Owner order (2026-09-14): no sample products — the shop shows ONLY the 65 PGS
rings. This script is idempotent and resumable:
  1. login -> token
  2. GET /api/products -> live catalogue
  3. [--live] DELETE every live product whose sku is NOT one of the 65 PGS SKUs
     (currently none — future-proof; nothing ring-PGS is ever deleted)
  4. for each of the 65 master records, in SKU order:
       - POST /api/media x4 (cover first, then editorial, worn, gift)
       - PUT  /api/products/{id}  if the SKU already exists live (update in
         place — no catalogue gap), else POST /api/products
       - body = master record minus id/createdAt/hallmark*  (v110 lesson: the
         API rejects hallmark payloads; identity keys are server-owned)
  5. verify: exactly 65 live products, 65 PGS rings, 0 videos, all 4 images

Usage:
    python3 deploy/catalogue_deploy.py --email admin@shivaa.in --password '***'        # dry-run
    python3 deploy/catalogue_deploy.py --email admin@shivaa.in --password '***' --live # execute

Ledger deploy/catalogue_deploy_ledger.json makes a failed run resumable:
re-running skips products already refreshed this pass (cleared automatically
at the start of a fully-verified run).
"""
import argparse, json, mimetypes, sys, time, uuid
from pathlib import Path
import urllib.request, urllib.error

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / 'cms' / 'data' / 'db.json'
IMG_ROOT = ROOT / 'cms'
LEDGER = Path(__file__).resolve().parent / 'catalogue_deploy_ledger.json'
BASE = 'https://shivaa.in'
STRIP_KEYS = ('id', 'createdAt')          # server-owned
STRIP_PREFIXES = ('hallmark',)            # v110 lesson: API rejects hallmark payloads
RETRIES, BACKOFF = 5, 15


def api(route, method='GET', token=None, json_body=None, file=None, fields=None, timeout=180):
    url = BASE.rstrip('/') + route
    if file:
        boundary = uuid.uuid4().hex
        body = b''
        for k, v in (fields or {}).items():
            body += (f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n').encode()
        fn = Path(file).name
        ct = mimetypes.guess_type(fn)[0] or 'application/octet-stream'
        body += (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{fn}"\r\n'
                 f'Content-Type: {ct}\r\n\r\n').encode() + Path(file).read_bytes() + '\r\n'
        body += f'--{boundary}--\r\n'.encode()
        req = urllib.request.Request(url, data=body, method='POST')
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    else:
        data = json.dumps(json_body).encode() if json_body is not None else None
        req = urllib.request.Request(url, data=data, method=method,
                                     headers={'Content-Type': 'application/json'} if data else {})
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    last = None
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, json.loads(r.read().decode() or '{}')
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read().decode())
            except Exception:
                return e.code, {'error': str(e)}
        except Exception as e:
            last = (0, {'error': f'connection: {str(e)[:150]}'})
            if attempt < RETRIES:
                time.sleep(BACKOFF * attempt)
    return last


def clean_record(rec):
    out = {k: v for k, v in rec.items()
           if k not in STRIP_KEYS and not any(k.startswith(p) for p in STRIP_PREFIXES)}
    out.pop('video', None)  # owner-approved since v44: no ring videos
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--email', required=True)
    ap.add_argument('--password', required=True)
    ap.add_argument('--live', action='store_true', help='execute (default: dry-run)')
    a = ap.parse_args()

    db = json.loads(DB.read_text())
    master = [p for p in db['products'] if str(p.get('sku', '')).startswith('PGS')]
    assert len(master) == 65, f'expected 65 PGS rings in master db.json, found {len(master)}'
    for p in master:  # preflight media on disk
        assert p.get('name') and float(p.get('weightG', 0)) > 0, f"{p['sku']}: bad record"
        for im in p['images'][:4]:
            assert (IMG_ROOT / im.lstrip('/')).is_file(), f"{p['sku']}: missing {im}"
    skus = [p['sku'] for p in master]
    assert len(set(skus)) == 65
    print('preflight OK: 65 PGS master records, all 4 shots on disk, no videos')

    ledger = {'refreshed': []}
    if LEDGER.exists() and a.live:
        try:
            ledger = json.loads(LEDGER.read_text())
        except Exception:
            pass

    def save_ledger():
        LEDGER.write_text(json.dumps(ledger, indent=2))

    st, r = api('/api/auth/login', 'POST', json_body={'email': a.email, 'password': a.password})
    if st != 200 or not r.get('token'):
        sys.exit(f'login failed ({st}): {r}')
    tok = r['token']
    print('logged in as', r.get('user', {}).get('name', a.email))

    st, r = api('/api/products', token=tok)
    if st != 200:
        sys.exit(f'GET products failed ({st}): {r}')
    live = r.get('products', [])
    live_by_sku = {}
    for p in live:
        s = str(p.get('sku', ''))
        if s:
            live_by_sku.setdefault(s, p)
    strangers = [p for p in live if str(p.get('sku', '')) not in set(skus)]
    print(f'live now: {len(live)} products; {len(live_by_sku)} with SKU; {len(strangers)} non-PGS to delete')
    for p in strangers:
        print('  would DELETE', p.get('id'), p.get('sku'), str(p.get('name', ''))[:40])
    todo = [p for p in master if p['sku'] not in ledger.get('refreshed', [])]
    print(f'plan: refresh {len(todo)} PGS products ({len(master) - len(todo)} already done this pass)')

    if not a.live:
        print('\nDRY-RUN — no changes made. Re-run with --live to execute.')
        return

    # 1) delete non-PGS strays
    for p in strangers:
        st, r = api(f"/api/products/{p['id']}", 'DELETE', token=tok)
        if st in (200, 204, 404):
            print('deleted', p.get('id'), p.get('sku'))
        else:
            sys.exit(f"DELETE {p['id']} failed ({st}): {r} — re-run to resume")
        time.sleep(0.2)

    # 2) upsert the 65
    for rec in master:
        sku = rec['sku']
        if sku in ledger.get('refreshed', []):
            continue
        paths = []
        for im in rec['images'][:4]:
            st, r = api('/api/media', token=tok, file=str(IMG_ROOT / im.lstrip('/')),
                        fields={'category': rec.get('category', 'rings'), 'sku': sku})
            if st not in (200, 201) or not (r.get('url') or r.get('path') or r.get('location')):
                sys.exit(f'{sku} media {im} failed ({st}): {r} — re-run to resume')
            paths.append(r.get('url') or r.get('path') or r.get('location'))
        body = clean_record(rec)
        body['images'] = paths
        existing = live_by_sku.get(sku)
        if existing and existing.get('id'):
            st, r = api(f"/api/products/{existing['id']}", 'PUT', token=tok, json_body=body)
            if st != 200:
                sys.exit(f'{sku} PUT failed ({st}): {r} — re-run to resume')
            print('updated', sku)
        else:
            st, r = api('/api/products', 'POST', token=tok, json_body=body)
            if st not in (200, 201):
                sys.exit(f'{sku} POST failed ({st}): {r} — re-run to resume')
            print('created', sku)
        ledger.setdefault('refreshed', []).append(sku)
        save_ledger()
        time.sleep(0.2)

    # 3) verify
    st, r = api('/api/products', token=tok)
    if st != 200:
        sys.exit(f'final GET products failed ({st}): {r}')
    live = r.get('products', [])
    pgs = [p for p in live if str(p.get('sku', '')).startswith('PGS')]
    with_video = [p for p in live if p.get('video')]
    four = all(len(p.get('images', [])) >= 4 for p in pgs)
    ok = len(live) == 65 and len(pgs) == 65 and not with_video and four
    print(f'\nVERIFY: {len(live)} products live (want 65); PGS {len(pgs)} (want 65); '
          f'videos {len(with_video)} (want 0); all 4-shot: {four}. '
          + ('OK ✅' if ok else 'MISMATCH ⚠️ — investigate before re-running'))
    if ok:
        LEDGER.unlink(missing_ok=True)  # clean slate for the next pass
    else:
        sys.exit(2)


if __name__ == '__main__':
    main()
