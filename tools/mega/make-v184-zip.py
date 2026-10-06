#!/usr/bin/env python3
"""Build the deterministic v184 Shivaa Black owner update from a commit.

The ZIP deliberately contains code only — never config.php, data, uploads,
credentials or customer records. Its seven entries extract directly into the
existing cms/ directory.

Usage: python3 tools/mega/make-v184-zip.py [commit-ish]
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STAMP = '184'
FILES = [
    'api.php',
    'index.html',
    'js/app.js',
    'js/admin.js',
    'css/v184.css',
    'sw.js',
    'upgrade-sql.php',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}

    # Four independently served release sites must agree.
    assert f'__SHIVAA_REL={STAMP};'.encode() in contents['index.html']
    assert f'APP_REL = {STAMP};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{STAMP}'".encode() in contents['sw.js']
    assert f'const REL = {STAMP};'.encode() in contents['sw.js']
    assert f"'rel'   => {STAMP},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']
    assert contents['index.html'].count(f'?v={STAMP}'.encode()) == 57
    assert contents['sw.js'].count(f'?v={STAMP}'.encode()) == 52
    for name in ['index.html', 'sw.js', 'js/app.js', 'js/admin.js']:
        assert b'?v=183' not in contents[name], f'{name} still pins a v183 URL'
        assert b'?v=182' not in contents[name], f'{name} still pins a v182 URL'

    html = contents['index.html'].decode()
    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', html)
    assert links and links[-1] == f'/css/v184.css?v={STAMP}', links[-3:]
    assert b"'/css/v184.css?v=184'" in contents['sw.js']

    api = contents['api.php']
    for needle in [
        b'function black_phone_hash', b'function black_six_month_expiry',
        b'function black_unique_code', b'function black_coupon_ensure',
        b"$route === 'black-card'", b"$route === 'black-card/claim'",
        b"'type' => 'making_percent'", b"'forPhoneHash' => black_phone_hash($mobile)",
        b"$makingSubtotal += $line['makingCharge'] * $line['qty']",
        b"'makingChargeDiscount' => $makingChargeDiscount",
        b'That coupon is not valid for this signed-in mobile/account.',
    ]:
        assert needle in api, f'api.php missing {needle.decode()}'

    app = contents['js/app.js']
    for needle in [
        b"pages['black-card']", b'Shivaa.flipBlackCard',
        b'Shivaa Family Prestigious Member', b'My Shivaa Black',
        b'Shivaa Black \xc2\xb7 20% off making charges', b'makingSubtotal',
    ]:
        assert needle in app, f'app.js missing {needle.decode()}'
    home_start = app.index(b'pages.home =')
    home = app[home_start:app.index(b'pages.shop = async', home_start)]
    assert home.count(b'black-slide') == 4
    for old in [b'#/scheme', b'Win 10g', b'Swarna Nidhi', b'Become a Partner']:
        assert old not in home, f'homepage still carries conflicting campaign: {old!r}'

    adm = contents['js/admin.js']
    assert b"c.type === 'making_percent'" in adm
    assert b'Shivaa Black \xc2\xb7 20% off making charges' in adm

    layer = contents['css/v184.css']
    for needle in [b'.black-hero', b'.bc-card.is-flipped', b'.bc-certificate',
                   b'.bc-checkout-pass', b'@media (max-width:700px)',
                   b'prefers-reduced-motion', b'body.bc-printing .bc-print-zone']:
        assert needle in layer, f'v184.css missing {needle.decode()}'
    assert len(layer) > 25000

    installer = contents['upgrade-sql.php']
    for needle in [b'shv_backup_json_db', b'shv_upsert_users', b'shv_upsert_coupons',
                   b'shv_upsert_catalog_batches', b'unlink($MIRROR_FLAG)']:
        assert needle in installer, f'upgrade-sql.php missing {needle.decode()}'

    out = ROOT / f'shivaa-update-v{STAMP}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info = zipfile.ZipInfo(f, date_time=(2026, 10, 6, 12, 0, 0))
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
