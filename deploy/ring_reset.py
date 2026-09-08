#!/usr/bin/env python3
"""RING RESET (v44) — delete ALL ring products on the live site, re-upload the 65 PGS
rings with 4 images (creamy-white face as cover) and NO video.

OWNER-APPROVED PLAN (HANDOFF.md v44). Run from a machine that can reach shivaa.in
(owner laptop / Hostinger SSH) — the Arena sandbox CANNOT (TLS blocked).

Usage:
    python3 deploy/ring_reset.py --email admin@shivaa.in --password '***'            # dry-run
    python3 deploy/ring_reset.py --email admin@shivaa.in --password '***' --live     # do it

Steps (idempotent, ledger-resumable):
  1. login -> token
  2. GET /api/products -> every product with category == rings (expected 85)
  3. [--live] DELETE /api/products/{id} for each ring
  4. for each of the 65 SKUs in demo65/media/PGS*/:
       POST /api/media x4 (shot_studio = white face cover, editorial, worn, gift)
       POST /api/products with meta.json (images -> uploaded paths, video -> ABSENT)
  5. verify: GET /api/products -> ring count must be 65

A ledger (deploy/ring_reset_ledger.json) records deletes/uploads so a re-run resumes
instead of duplicating. Nothing outside category 'rings' is ever touched.
"""
import argparse, json, mimetypes, sys, time, uuid
from pathlib import Path
import urllib.request, urllib.error

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'demo65' / 'media'
LEDGER = Path(__file__).resolve().parent / 'ring_reset_ledger.json'
BASE = 'https://shivaa.in'
SHOTS = ('studio', 'editorial', 'worn', 'gift')


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
                 f'Content-Type: {ct}\r\n\r\n').encode() + Path(file).read_bytes() + b'\r\n'
        body += f'--{boundary}--\r\n'.encode()
        req = urllib.request.Request(url, data=body, method='POST')
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    else:
        data = json.dumps(json_body).encode() if json_body is not None else None
        req = urllib.request.Request(url, data=data, method=method,
                                     headers={'Content-Type': 'application/json'} if data else {})
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {'error': str(e)}
    except Exception as e:
        return 0, {'error': f'connection: {str(e)[:150]}'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--email', required=True)
    ap.add_argument('--password', required=True)
    ap.add_argument('--live', action='store_true', help='actually delete + upload (default: dry-run)')
    a = ap.parse_args()

    ledger = json.loads(LEDGER.read_text()) if LEDGER.exists() else {'deleted': [], 'uploaded': {}}

    def save():
        LEDGER.write_text(json.dumps(ledger, indent=2))

    skus = sorted(d.name for d in MEDIA.iterdir() if d.is_dir() and d.name.startswith('PGS'))
    assert len(skus) == 65, f'expected 65 staged SKUs, found {len(skus)}'
    for sku in skus:  # preflight: all media + meta present, no video will be sent
        d = MEDIA / sku
        for k in SHOTS:
            assert (d / f'shot_{k}.jpg').exists(), f'{sku}: missing shot_{k}.jpg'
        assert (d / 'meta.json').exists(), f'{sku}: missing meta.json'
    print(f'preflight OK: 65 SKUs staged, 4 shots each, no videos sent')

    st, r = api('/api/auth/login', 'POST', json_body={'email': a.email, 'password': a.password})
    if st != 200 or not r.get('token'):
        sys.exit(f'login failed ({st}): {r}')
    tok = r['token']
    print('logged in as', r.get('user', {}).get('name', a.email))

    st, r = api('/api/products', token=tok)
    if st != 200:
        sys.exit(f'GET products failed ({st}): {r}')
    prods = r.get('products', [])
    rings = [p for p in prods if p.get('category') == 'rings']
    print(f'live: {len(prods)} products, {len(rings)} rings (expected 85 before reset)')

    if not a.live:
        print('\nDRY-RUN — would delete these ring ids:')
        for p in rings:
            print('  DELETE', p.get('id'), p.get('sku'), p.get('name', '')[:40])
        print(f'\nDRY-RUN — would then upload 65 PGS rings (4 images, no video). Re-run with --live.')
        return

    # 1) delete all rings
    for p in rings:
        pid = str(p.get('id'))
        if pid in ledger['deleted']:
            continue
        st, r = api(f'/api/products/{pid}', 'DELETE', token=tok)
        if st in (200, 204, 404):
            ledger['deleted'].append(pid); save()
            print('deleted', pid, p.get('sku'))
        else:
            sys.exit(f'DELETE {pid} failed ({st}): {r} — re-run to resume')
        time.sleep(0.2)

    # 2) re-upload 65
    for sku in skus:
        if ledger['uploaded'].get(sku) == 'done':
            continue
        d = MEDIA / sku
        meta = json.loads((d / 'meta.json').read_text())
        paths = []
        for k in SHOTS:
            st, r = api('/api/media', token=tok, file=str(d / f'shot_{k}.jpg'),
                        fields={'category': 'rings', 'sku': sku})
            if st not in (200, 201) or not (r.get('path') or r.get('location') or r.get('url')):
                sys.exit(f'{sku} media shot_{k} failed ({st}): {r} — re-run to resume')
            paths.append(r.get('path') or r.get('location') or r.get('url'))
        rec = dict(meta)
        rec['images'] = paths       # face cover first (staged as shot_studio)
        rec.pop('video', None)      # owner-approved: NO videos
        st, r = api('/api/products', 'POST', token=tok, json_body=rec)
        if st not in (200, 201):
            sys.exit(f'{sku} product POST failed ({st}): {r} — re-run to resume')
        ledger['uploaded'][sku] = 'done'; save()
        print('uploaded', sku)
        time.sleep(0.2)

    # 3) verify
    st, r = api('/api/products', token=tok)
    if st != 200:
        sys.exit(f'final GET products failed ({st}): {r}')
    rings = [p for p in r.get('products', []) if p.get('category') == 'rings']
    with_video = [p for p in rings if p.get('video')]
    ok = len(rings) == 65 and not with_video
    print(f'\nVERIFY: {len(rings)} rings live (expected 65); {len(with_video)} ring videos (expected 0).',
          'OK ✅' if ok else 'MISMATCH ⚠️ — investigate before re-running')
    if not ok:
        sys.exit(2)


if __name__ == '__main__':
    main()
