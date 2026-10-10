#!/usr/bin/env python3
"""Build the v183 code update from a committed revision.

v183 — the Play Store release. Shivaa goes to Google Play as a Trusted Web
Activity of shivaa.in, which needs three things from the website and one thing
from the app itself:

  1 · cms/.well-known/assetlinks.json — the Digital Asset Links file Google
     fetches to prove the app owns the domain (ships with the two signing-key
     fingerprints as placeholders; the owner pastes them after `bubblewrap
     fingerprint` and re-deploys).
  2 · cms/.well-known/.htaccess — a deeper .htaccess is merged after its parent,
     so `Require all granted` there beats the parent's *.json deny rule that
     would otherwise answer Google with a 403.
  3 · a stable `id` in BOTH web manifests, so the installed PWA and the Play app
     are one identity rather than two.
  4 · POST /api/auth/delete-account + the in-app "Privacy & my data" page —
     Google Play's User Data policy requires in-app account deletion for any app
     that lets people create an account, and Play Console needs a URL that does
     the same from the web.

Plus the six v182 files re-stamped 182 -> 183 in lockstep (live is still 181, so
this package is a superset of v182's), sitemap.php listing the new erasure page,
and MEDIA deliberately staying at shivaa-media-v168 (no media changed).

Usage: python3 tools/mega/make-v183-zip.py [commit-ish]
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
    'manifest.json',
    'manifest.webmanifest',
    'sitemap.php',
    '.well-known/assetlinks.json',
    '.well-known/.htaccess',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}
    stamp = '183'

    # ── stamp lockstep (the four sites that must agree) ──
    assert f'__SHIVAA_REL={stamp};'.encode() in contents['index.html']
    assert f'APP_REL = {stamp};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{stamp}'".encode() in contents['sw.js']
    assert f'const REL = {stamp};'.encode() in contents['sw.js']
    assert f"'rel'   => {stamp},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']
    assert contents['index.html'].count(f'?v={stamp}'.encode()) >= 56
    assert contents['sw.js'].count(f'?v={stamp}'.encode()) == 51
    for name in ['index.html', 'sw.js', 'js/app.js', 'js/admin.js']:
        assert b'?v=182' not in contents[name], f'{name} still pins a v182 URL'
        assert b'?v=181' not in contents[name], f'{name} still pins a v181 URL'
    assert b'__SHIVAA_REL=182' not in contents['index.html']

    # v178.css remains the last stylesheet
    html = contents['index.html'].decode()
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v178.css?v={stamp}', links[-3:]

    # ── every v182 invariant is carried forward: v183 must not regress it ──
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
        b'data/.sql-mirror-behind',
        b"'db' => shv_version_db()",
    ]:
        assert needle in api, f'api.php missing {needle.decode()}'

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

    adm = contents['js/admin.js']
    assert b'/billing/' in adm and b'Billing Software' in adm
    assert b'Catalogue Intake' in adm and b'admin/catalogue/queue' in adm
    assert b'intakeApproveAll' in adm and b'weightSource' in adm
    assert b'saveBillingSync' in adm and b'billingSyncSecret' in adm
    assert b'v180DbStrip' in adm and b'id="v180DbStrip"' in adm

    # ── v183 · the Play Store substrate ──
    # 1 · account erasure: the route, and the page that calls it
    assert b"$route === 'auth/delete-account'" in api, 'api.php missing the erasure route'
    for needle in [b'rate_block(', b'req_user($db)', b'hash_equals(',
                   b"'Deleted customer'", b'@privacy.local', b'anonymizedAt',
                   b"$db['tokens']", b'user.self_erased']:
        assert needle in api, f'the erasure route is missing {needle.decode()}'
    # the owner and B2B partner accounts must be protected from self-erasure
    assert b"Cannot anonymize an admin account" in api or b'owner account cannot be erased' in api
    assert b'B2B partner account' in api
    # no hard delete of a user row (order history must survive for tax/PMLA)
    assert not re.search(rb'unset\(\$db\[.users.\]\[\$[A-Za-z_]+\]\)', api), \
        'the erasure route hard-deletes a user row'
    app = contents['js/app.js']
    assert b"pages['delete-account']" in app, 'no in-app erasure page'
    assert b"'#/delete-account'" in app, 'the account screen does not link to the page'
    assert b"'/api/auth/delete-account'" in app, 'the page never calls the route'
    assert b'Erase my account' in app

    # 2 · the manifests carry a stable identity, in BOTH copies
    for f in ['manifest.json', 'manifest.webmanifest']:
        m = contents[f].decode()
        assert '"id"' in m, f'{f} has no stable id'
        assert '"maskable"' in m, f'{f} has no maskable icon'
        assert '"512x512"' in m, f'{f} has no 512 icon'
    assert contents['manifest.json'].strip() == contents['manifest.webmanifest'].strip(), \
        'the two web manifests have drifted apart'

    # 3 · the erasure page must be crawlable — Play Console needs a working URL
    sm = contents['sitemap.php']
    assert b'/#/delete-account' in sm, 'sitemap.php does not list the erasure page'

    # 4 · Digital Asset Links ships, well-formed, and still honest about the keys
    links = contents['.well-known/assetlinks.json'].decode()
    assert 'delegate_permission/common.handle_all_urls' in links
    assert 'android_app' in links
    assert 'in.shivaa.jewels' in links
    assert links.count('REPLACE_WITH_') == 2, 'expected exactly two placeholder fingerprints'
    for fp in re.findall(r'"(REPLACE_WITH_[A-Z_0-9]+|[0-9A-F:]{95}|[0-9A-F]{64})"', links):
        assert not fp.startswith('REPLACE_WITH') or fp in (
            'REPLACE_WITH_UPLOAD_KEY_SHA256_FINGERPRINT',
            'REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT'), 'unexpected fingerprint placeholder'

    # 5 · the .htaccess that lets Google read it
    ht = contents['.well-known/.htaccess'].decode()
    assert re.search(r'Require\s+all\s+granted', ht), 'the .well-known guard does not grant access'
    # the guard must not be a no-op: the parent must still deny *.json
    parent = contents.get('.htaccess')
    if parent is not None:
        assert b'json' in parent

    # 6 · no keystore, password or service-account key may ride along
    for f, blob in contents.items():
        for bad in [b'BEGIN PRIVATE KEY', b'keystorePassword', b'storePassword',
                    b'service_account', b'"keyPassword"']:
            assert bad not in blob, f'{f} carries credential material ({bad.decode()})'

    out = ROOT / f'shivaa-update-v{stamp}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info = zipfile.ZipInfo(f, date_time=(2026, 10, 9, 12, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, contents[f])

    data = out.read_bytes()
    print(f'built {out.name}: {len(FILES)} files, {len(data)} bytes')
    print(f'SHA-256 {hashlib.sha256(data).hexdigest()}')
    print(f'source commit {commit}')
    for f in FILES:
        print(f'  {f:26s} {len(contents[f]):8d}')
    return out

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'HEAD')
