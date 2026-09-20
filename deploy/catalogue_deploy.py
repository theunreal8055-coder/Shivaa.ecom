#!/usr/bin/env python3
"""CATALOGUE DEPLOY (v111, generalized 2026-09-15, v164 2026-09-20) — make the
LIVE catalogue exactly the master records in cms/data/db.json (PGS rings +
SHV Gold Biscuit Scheme studs), with photos uploaded from cms/images/.

Owner order (2026-09-14): no sample products — the shop shows ONLY master records.
Generalized 2026-09-15 for the ladies-67 lot (owner: "upload 12 designs on
live website"): the master count is DYNAMIC (was hard-asserted 65); the
contract is now "live == every master record in db.json".
v164: the master set is PGS rings PLUS the 6 SHV scheme studs (category
earrings), which reached the store as real records so members can buy, review
and wishlist them like any other piece. Live twins served from the server's
campaign fallback (isCampaignStud, no db row) are replaced by real rows via
POST, never PUT — a PUT at a twin id would 404.
This script is idempotent and resumable:
  1. login -> token
  2. GET /api/products -> live catalogue
  3. [--live] DELETE every live product whose sku is NOT in the master set
     (future-proof; nothing in master is ever deleted)
  4. for each master record, in SKU order:
       - POST /api/media x4 (images[] order)
       - PUT  /api/products/{id}  if the SKU already exists live as a real db
         row (update in place — no catalogue gap), else POST /api/products.
         Live twins served from the server's campaign fallback carry
         isCampaignStud and have no db row: POST, never PUT (PUT 404s there).
       - body = master record minus id/createdAt/hallmark*  (v110 lesson: the
         API rejects hallmark payloads; identity keys are server-owned)
  5. verify: live product set == master set, 0 videos, all 4 images

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
MASTER_PREFIXES = ('PGS', 'SHV')  # v164 — master set: PGS rings + SHV scheme studs


def is_master_sku(sku):  # v164 — the live == master contract keyed on both prefixes
    return str(sku or '').startswith(MASTER_PREFIXES)


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
    last = None
    for attempt in range(1, RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, json.loads(r.read().decode() or '{}')
        except urllib.error.HTTPError as e:
            try:
                payload = json.loads(e.read().decode())
            except Exception:
                payload = {'error': str(e)}
            if e.code >= 500 and attempt < RETRIES:
                last = (e.code, payload)
                time.sleep(BACKOFF * attempt)
                continue
            return e.code, payload
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
    master = [p for p in db['products'] if is_master_sku(p.get('sku', ''))]
    assert master, 'no master records in master db.json'
    assert len(master) == len(db['products']), 'non-master-SKU product in master db.json'
    # v164 — the 6 scheme studs ride as fixed ids p_stud_*/SHV-*ST-*: the buy,
    # draw-entry and review paths key on them, so a renamed twin breaks the shop.
    studs = [p for p in master if str(p.get('sku', '')).startswith('SHV')]
    want_studs = {f'SHV-MST-0{i}' for i in (1, 2, 3)} | {f'SHV-LST-0{i}' for i in (1, 2, 3)}
    assert {p['sku'] for p in studs} == want_studs, f'scheme stud SKUs changed: {sorted(p["sku"] for p in studs)}'
    assert {p['id'] for p in studs} == {f'p_stud_m{i}' for i in (1, 2, 3)} | {f'p_stud_w{i}' for i in (1, 2, 3)}, 'scheme stud ids changed'
    for p in master:  # preflight media on disk
        assert p.get('name') and float(p.get('weightG', 0)) > 0, f"{p['sku']}: bad record"
        assert len(p.get('images', [])) >= 4, f"{p['sku']}: fewer than 4 images"
        for im in p['images'][:4]:
            assert (IMG_ROOT / im.lstrip('/')).is_file(), f"{p['sku']}: missing {im}"
    skus = [p['sku'] for p in master]
    assert len(set(skus)) == len(master), 'duplicate SKUs in master db.json'
    print(f'preflight OK: {len(master)} master records (PGS {len(master) - len(studs)} + SHV studs {len(studs)}), all 4 shots on disk, no videos')

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
    print(f'live now: {len(live)} products; {len(live_by_sku)} with SKU; {len(strangers)} non-master to delete')
    for p in strangers:
        print('  would DELETE', p.get('id'), p.get('sku'), str(p.get('name', ''))[:40])
    todo = [p for p in master if p['sku'] not in ledger.get('refreshed', [])]
    print(f'plan: refresh {len(todo)} master products ({len(master) - len(todo)} already done this pass)')

    if not a.live:
        print('\nDRY-RUN — no changes made. Re-run with --live to execute.')
        return

    # 1) delete non-master strays
    for p in strangers:
        st, r = api(f"/api/products/{p['id']}", 'DELETE', token=tok)
        if st in (200, 204, 404):
            print('deleted', p.get('id'), p.get('sku'))
        else:
            sys.exit(f"DELETE {p['id']} failed ({st}): {r} — re-run to resume")
        time.sleep(0.2)

    # 2) upsert the master set
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
        # v164 — campaign twins (isCampaignStud) are served from the server's
        # fallback, not a db row: a PUT at their id 404s, so they POST instead.
        # A PUT that 404s anyway (row deleted between GET and PUT) also falls
        # through to POST, exactly once.
        if existing and existing.get('id') and not existing.get('isCampaignStud'):
            st, r = api(f"/api/products/{existing['id']}", 'PUT', token=tok, json_body=body)
            if st == 404:
                existing = None
            elif st != 200:
                sys.exit(f'{sku} PUT failed ({st}): {r} — re-run to resume')
            else:
                print('updated', sku)
        if not (existing and existing.get('id') and not existing.get('isCampaignStud')):
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
    master_live = [p for p in live if is_master_sku(p.get('sku', ''))]
    with_video = [p for p in live if p.get('video')]
    four = all(len(p.get('images', [])) >= 4 for p in master_live)
    want = set(skus)
    got = {str(p.get('sku', '')) for p in master_live}
    n_studs_live = sum(1 for p in master_live if str(p.get('sku', '')).startswith('SHV'))
    # v164 — twins share the SKU namespace, so the SETS would match even if the
    # studs were still fallback-served: require real db rows (no isCampaignStud)
    # for all 6 studs plus the strict live == master count.
    studs_real = sum(1 for p in master_live
                     if str(p.get('sku', '')).startswith('SHV') and not p.get('isCampaignStud'))
    ok = got == want and len(live) == len(want) and not with_video and four and studs_real == 6
    print(f'\nVERIFY: {len(live)} products live (want {len(want)}); master {len(master_live)} (want {len(want)}); '
          f'missing={sorted(want - got)[:5]} extra={sorted(got - want)[:5]}; '
          f'videos {len(with_video)} (want 0); all 4-shot: {four}; '
          f'studs live {n_studs_live}/6, real rows {studs_real}/6. '
          + ('OK ✅' if ok else 'MISMATCH ⚠️ — investigate before re-running'))
    if ok:
        LEDGER.unlink(missing_ok=True)  # clean slate for the next pass
    else:
        sys.exit(2)


if __name__ == '__main__':
    main()
