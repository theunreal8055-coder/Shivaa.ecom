#!/usr/bin/env python3
"""Build the v181 code update from a committed revision.

v181 — SQL Phase 3 (Orders, Settings, Users, Reviews, Settlements) + Billing Doorway.
The owner's work order: migrate the remaining collections to Hostinger MySQL with
dual-write JSON safety net, and add the Billing Software link in Admin Settings.

What ships (6 files, root layout):
1 · api.php (Phase 3 overlay & mirror-on-save for orders, settings, users, reviews, coupons, settlements)
2 · index.html (stamps → 181, 56× ?v=181)
3 · sw.js (SHELL/REL 181, 51× ?v=181, MEDIA stays shivaa-media-v168)
4 · js/app.js (APP_REL = 181)
5 · js/admin.js (Billing Software tile in Admin Settings + Phase 3 SQL dial)
6 · upgrade-sql.php (Phase 3 reconciler: backups, orders.data_json column, all collections synced)

Usage: python3 tools/mega/make-v181-zip.py [commit-ish]
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
    'sw.js',
    'js/app.js',
    'js/admin.js',
    'upgrade-sql.php',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '181'

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
        assert b'?v=180' not in contents[name], f'{name} still pins a v180 URL'

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
        b"function_exists('shv_sql_phase3_overlay')",
        b"function_exists('shv_sql_phase3_mirror')",
        b'data/.sql-mirror-behind',
        b"'db' => shv_version_db()",
    ]:
        assert needle in api, f'api.php missing {needle.decode()}'

    # ── upgrade-sql.php checks ──
    inst = contents['upgrade-sql.php']
    for needle in [
        b'shv_backup_json_db', b'shv_ensure_schema',
        b'shv_upsert_products', b'shv_upsert_settings', b'shv_upsert_orders',
        b'shv_upsert_users', b'shv_upsert_reviews', b'shv_upsert_coupons', b'shv_upsert_settlements',
        b'orders.data_json', b'unlink($MIRROR_FLAG)',
    ]:
        assert needle in inst, f'upgrade-sql.php missing {needle.decode()}'

    # ── admin.js checks ──
    adm = contents['js/admin.js']
    assert b'/billing/' in adm and b'Billing Software' in adm
    assert b'v180DbStrip' in adm and b'id="v180DbStrip"' in adm

    out = ROOT / f'shivaa-update-v{stamp}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info = zipfile.ZipInfo(f, date_time=(2026, 9, 24, 18, 0, 0))
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
