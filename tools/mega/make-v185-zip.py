#!/usr/bin/env python3
"""Build the deterministic cumulative v185 Shivaa owner update from a commit.

The live site was still v183 when this forward release was prepared. Therefore
this ZIP deliberately carries the complete v184 payload plus v185.css: code
only, extracting directly into public_html/ and never including config/data,
uploads, credentials, customer records or billing files.

Usage: python3 tools/mega/make-v185-zip.py [commit-ish]
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STAMP = '185'
FILES = [
    'api.php',
    'index.html',
    'js/app.js',
    'js/admin.js',
    'css/v184.css',
    'css/v185.css',
    'sw.js',
    'upgrade-sql.php',
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def build(revision='HEAD'):
    commit = git('rev-parse', '--verify', revision + '^{commit}').decode().strip()
    contents = {f: git('show', f'{commit}:cms/{f}') for f in FILES}

    assert f'__SHIVAA_REL={STAMP};'.encode() in contents['index.html']
    assert f'APP_REL = {STAMP};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{STAMP}'".encode() in contents['sw.js']
    assert f'const REL = {STAMP};'.encode() in contents['sw.js']
    assert f"'rel'   => {STAMP},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']
    assert contents['index.html'].count(b'?v=185') == 58
    assert contents['sw.js'].count(b'?v=185') == 53
    for name in ['index.html', 'sw.js', 'js/app.js', 'js/admin.js']:
        assert b'?v=184' not in contents[name], f'{name} still pins v184 bytes'
        assert b'?v=183' not in contents[name], f'{name} still pins v183 bytes'

    links = re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"', contents['index.html'].decode())
    assert links and links[-1] == '/css/v185.css?v=185', links[-3:]
    assert b"'/css/v184.css?v=185'" in contents['sw.js']
    assert b"'/css/v185.css?v=185'" in contents['sw.js']

    api = contents['api.php']
    for needle in [
        b'function black_card_bound_to_user', b"return $bound !== '' && $current !== '' && hash_equals",
        b'function black_coupon_canonical', b'function black_coupon_for_user',
        b'function black_code_reserved', b'function black_coupon_row_reserved',
        b'function coupon_resolve', b'canonical fields always win',
        b"'type' => 'making_percent'", b"'value' => 20",
        b"$makingSubtotal += $line['makingCharge'] * $line['qty']",
        b"$coupon = coupon_resolve($db, $submittedCoupon, $u)",
        b"$out['discountPct'] = 20", b"$out['discountBasis'] = 'making-charges'",
    ]:
        assert needle in api, f'api.php missing {needle.decode()}'

    app = contents['js/app.js']
    for needle in [
        b'couponGeneration', b'couponAbort', b'couponAppliedKey',
        b'Shivaa.couponInputChanged', b'Tap Apply to verify the coupon code',
        b'window._co.recalculate = coTotals', b'blackAccessErrorHTML',
        b'data-bc-face="front"', b"front.setAttribute('aria-hidden'",
        b'saveBlackCertificate', b'blackShareOrSave', b'navigator.canShare',
        b'Math.floor(Math.max(0, co.subtotal - couponDisc))',
    ]:
        assert needle in app, f'app.js missing {needle.decode()}'

    layer = contents['css/v185.css']
    for needle in [
        b'.bc-access-state', b'.bc-member-code-row', b'.coupon-message.success',
        b'@media (max-width:700px)', b'@media (max-width:480px)', b'@media (max-width:350px)',
        b'aspect-ratio:1.50/1', b'body.bc-printing .bc-face', b'backface-visibility:visible',
        b'prefers-reduced-motion',
    ]:
        assert needle in layer, f'v185.css missing {needle.decode()}'
    assert len(layer) > 9000
    assert len(contents['css/v184.css']) > 25000, 'cumulative v184 design layer missing'

    adm = contents['js/admin.js']
    assert b"c.type === 'making_percent'" in adm
    assert b'Shivaa Black \xc2\xb7 20% off making charges' in adm
    installer = contents['upgrade-sql.php']
    for needle in [b'shv_backup_json_db', b'shv_upsert_users', b'shv_upsert_coupons',
                   b'shv_upsert_catalog_batches', b'unlink($MIRROR_FLAG)']:
        assert needle in installer, f'upgrade-sql.php missing {needle.decode()}'

    out = ROOT / f'shivaa-update-v{STAMP}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info = zipfile.ZipInfo(f, date_time=(2026, 10, 6, 18, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, contents[f])

    data = out.read_bytes()
    print(f'built {out.name}: {len(FILES)} files, {len(data)} bytes')
    print(f'SHA-256 {hashlib.sha256(data).hexdigest()}')
    print(f'source commit {commit}')
    for f in FILES:
        print(f'  {f:22s} {len(contents[f]):8d}  {hashlib.sha256(contents[f]).hexdigest()}')
    return out

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'HEAD')
