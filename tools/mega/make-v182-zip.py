#!/usr/bin/env python3
"""Build the v182 code update from a committed revision.

v182 — Auto-Catalogue Intake & Review Queue (Phase 4) + billing sync bridge.
The owner's work order: batch ingestion into the catalogue ledger, an admin
review & approve queue so big drops are curated before going live, batch
publish with image handling — plus the signed stock-movement bridge the
showroom billing app uses to keep counter sales in step with shop stock.

What ships (6 files, root layout):
1 · api.php (catalogue intake/review routes, catalogBatches dual-mode overlay &
   mirror, products.status/batch_id columns, settlements composite-id fix,
   billing/stock + billing/stock-movement HMAC bridge, rel 182)
2 · index.html (stamps → 182, 56× ?v=182)
3 · js/app.js (APP_REL = 182)
4 · js/admin.js (Catalogue Intake tab + review queue + billing sync key field)
5 · sw.js (SHELL/REL 182, 51× ?v=182, MEDIA stays shivaa-media-v168)
6 · upgrade-sql.php (reconciler: products.status/batch_id + indexes + backfill,
   catalog_batches.data_json, composite settlement ids, batch-ledger sync)

Usage: python3 tools/mega/make-v182-zip.py [commit-ish]
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FILES = [
    'api.php',
    'index.html',
    'js/app.js',
    'js/admin.js',
    'sw.js',
    'upgrade-sql.php',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '182'

    # ── stamp lockstep ──
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f'const REL = {stamp};'.encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 56
    assert contents['sw.js'].count(f'?v={stamp}'.encode()) == 51
    for name in ['index.html', 'sw.js', 'js/app.js', 'js/admin.js']:
        assert b'?v=181' not in contents[name], f'{name} still pins a v181 URL'

    # v178.css remains the last stylesheet
    html = contents['index.html'].decode()
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v178.css?v={stamp}', links[-3:]

    # ── api.php checks ──
    api = contents['api.php']
    for needle in [
        b'function shv_db_driver(): string',
        b'function shv_sql_products_overlay(array $jsonProducts): array',
        b'function shv_sql_products_mirror(array $products): void',
        b'function shv_sql_phase3_overlay(array &$db): void',
        b'function shv_sql_phase3_mirror(array $db): void',
        b'function shv_sql_catalog_overlay(array &$db): void',
        b'function shv_sql_catalog_mirror(array $db): void',
        b'function shv_settlement_id(array $s, int $idx): string',
        b'function shv_billing_sync_auth(array $db): array',
        b"'admin/catalogue/import'",
        b"'admin/catalogue/approve'",
        b"'billing/stock-movement'",
        b"data/.sql-mirror-behind",
        b"'db' => shv_version_db()",
    ]:
        assert needle in api, f'api.php missing {needle.decode()}'

    # ── upgrade-sql.php checks ──
    inst = contents['upgrade-sql.php']
    for needle in [
        b'shv_backup_json_db', b'shv_ensure_schema',
        b'shv_upsert_products', b'shv_upsert_settings', b'shv_upsert_orders',
        b'shv_upsert_users', b'shv_upsert_reviews', b'shv_upsert_coupons',
        b'shv_upsert_settlements', b'shv_upsert_catalog_batches',
        b'shv_settlement_id', b'batch_id', b'catalog_batches.data_json',
        b'orders.data_json', b'unlink($MIRROR_FLAG)',
    ]:
        assert needle in inst, f'upgrade-sql.php missing {needle.decode()}'

    # ── admin.js checks ──
    adm = contents['js/admin.js']
    assert b'/billing/' in adm and b'Billing Software' in adm
    assert b'Catalogue Intake' in adm and b'admin/catalogue/queue' in adm
    assert b'intakeApproveAll' in adm and b'weightSource' in adm
    assert b'saveBillingSync' in adm and b'billingSyncSecret' in adm
    assert b'v180DbStrip' in adm and b'id="v180DbStrip"' in adm

    out = ROOT / f'shivaa-update-v{stamp}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info = zipfile.ZipInfo(f, date_time=(2026, 9, 25, 12, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, contents[f])

    data = out.read_bytes()
    print(f'built {out.name}: {len(FILES)} files, {len(data)} bytes')
    print(f'SHA-256 {hashlib.sha256(data).hexdigest()}')
    print(f'source commit {commit}')
    for f in FILES:
        print(f'  {f:22s} {len(contents[f]):8d}')
    return out

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'HEAD')
