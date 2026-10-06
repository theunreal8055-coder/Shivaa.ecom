#!/usr/bin/env python3
"""Build the deterministic cumulative v186 Shivaa owner update from a commit.

The production site remains v183. This forward-only archive therefore carries
all required v184/v185/v186 program layers, the changed Passport flow and the
new public Black hero art. It contains no config, data, uploads, credentials,
customer records, payment material or test fixtures. Extract into public_html/.

Usage: python3 tools/mega/make-v186-zip.py [commit-ish]
"""
import hashlib
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
STAMP='186'
FILES=[
    'api.php',
    'index.html',
    'js/app.js',
    'js/auth.js',
    'js/admin.js',
    'css/v184.css',
    'css/v185.css',
    'css/v186.css',
    'images/black/hero-v186.jpg',
    'sw.js',
    'upgrade-sql.php',
]

def git(*args):
    return subprocess.check_output(['git',*args],cwd=ROOT)

def build(revision='HEAD'):
    commit=git('rev-parse','--verify',revision+'^{commit}').decode().strip()
    contents={f:git('show',f'{commit}:cms/{f}') for f in FILES}

    assert f'__SHIVAA_REL={STAMP};'.encode() in contents['index.html']
    assert f'APP_REL = {STAMP};'.encode() in contents['js/app.js']
    assert f"SHELL = 'shivaa-shell-v{STAMP}'".encode() in contents['sw.js']
    assert f'const REL = {STAMP};'.encode() in contents['sw.js']
    assert f"'rel'   => {STAMP},".encode() in contents['api.php']
    assert b"MEDIA = 'shivaa-media-v168'" in contents['sw.js']
    assert contents['index.html'].count(b'?v=186')==62
    assert contents['sw.js'].count(b'?v=186')==55
    for name in ['index.html','sw.js','js/app.js','js/admin.js']:
        assert b'?v=185' not in contents[name],f'{name} still pins v185 bytes'
        assert b'?v=184' not in contents[name],f'{name} still pins v184 bytes'
        assert b'?v=183' not in contents[name],f'{name} still pins v183 bytes'

    links=re.findall(r'<link[^>]*rel="stylesheet"[^>]*href="(/css/[^"]+)"',contents['index.html'].decode())
    assert links and links[-1]=='/css/v186.css?v=186',links[-3:]
    for layer in ['v184','v185','v186']:
        assert f"'/css/{layer}.css?v=186'".encode() in contents['sw.js']
    assert b"'/images/black/hero-v186.jpg?v=186'" in contents['sw.js']
    assert b'<link rel="preload" as="image" href="/images/black/hero-v186.jpg?v=186" fetchpriority="high">' in contents['index.html']

    api=contents['api.php']
    for needle in [
        b'function black_six_month_expiry',b'function black_card_bound_to_user',
        b"return $bound !== '' && $current !== '' && hash_equals",
        b'function black_coupon_canonical',b'function black_coupon_for_user',
        b'function black_code_reserved',b'function black_coupon_row_reserved',
        b'function coupon_resolve',b'canonical fields always win',
        b"'type' => 'making_percent'",b"'value' => 20",
        b"$makingSubtotal += $line['makingCharge'] * $line['qty']",
        b"$coupon = coupon_resolve($db, $submittedCoupon, $u)",
        b"$out['discountPct'] = 20",b"$out['discountBasis'] = 'making-charges'",
        b"rate_block($db, 'black-card-claim'",
    ]: assert needle in api,f'api.php missing {needle.decode()}'

    app=contents['js/app.js']
    for needle in [
        b'blackJourneyHTML',b'blackBenefitProgress',b'blackCommerceHTML',
        b'_blackClaimAfterLogin',b'cancelBlackClaimIntent',b'blackClaimPromise',
        b'data-black-card-motion',b'bc-live-light',b'_homeObserverCleanup',b'_pdCleanup',
        b'boxes.length - 1',b'couponGeneration',b'couponAbort',b'couponAppliedKey',
        b'Shivaa.couponInputChanged',b'Tap Apply to verify the coupon code',
        b'window._co.recalculate = coTotals',b'blackAccessErrorHTML',
        b'data-bc-face="front"',b"front.setAttribute('aria-hidden'",
        b'saveBlackCertificate',b'blackShareOrSave',b'navigator.canShare',
        b'Math.floor(Math.max(0, co.subtotal - couponDisc))',
    ]: assert needle in app,f'app.js missing {needle.decode()}'

    auth=contents['js/auth.js']
    for needle in [
        b'shv-black-intent',b'shv-black-context',b'Only your name is required',
        b'shv-optional',b'details:not([open])',b'document.activeElement === last',
        b'document.body.contains(back)',b'close(true)',b'cancelBlackClaimIntent',
    ]: assert needle in auth,f'auth.js missing {needle.decode()}'
    details=auth[auth.index(b'function details'):auth.index(b'/* legacy email/password door')]
    assert re.search(br'id="shvDetName"[^>]*required',details)
    assert not re.search(br'id="shvDetDob"[^>]*required',details)
    assert not re.search(br'id="shvDetCity"[^>]*required',details)

    layer=contents['css/v186.css']
    for needle in [
        b'hero-v186.jpg',b'bcHeroBreathe',b'[data-black-card-motion]',
        b'.bc-live-light',b'.bc-holo-seal',b'.bc-journey',b'.bc-commerce',
        b'.bc-checkout-flow',b'.shv-black-context',b'.shv-optional',
        b'@media (max-width:350px)',b'prefers-reduced-motion',b'@media print',
    ]: assert needle in layer,f'v186.css missing {needle.decode()}'
    assert len(layer)>20000
    assert len(contents['css/v185.css'])>9000
    assert len(contents['css/v184.css'])>25000

    art=contents['images/black/hero-v186.jpg']
    assert art[:2]==b'\xff\xd8' and art[-2:]==b'\xff\xd9'
    assert 150000<len(art)<500000

    adm=contents['js/admin.js']
    assert b"c.type === 'making_percent'" in adm
    assert b'Shivaa Black \xc2\xb7 20% off making charges' in adm
    installer=contents['upgrade-sql.php']
    for needle in [b'shv_backup_json_db',b'shv_upsert_users',b'shv_upsert_coupons',b'shv_upsert_catalog_batches',b'unlink($MIRROR_FLAG)']:
        assert needle in installer,f'upgrade-sql.php missing {needle.decode()}'

    out=ROOT/f'shivaa-update-v{STAMP}.zip'
    with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
        for f in FILES:
            info=zipfile.ZipInfo(f,date_time=(2026,10,6,20,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o644<<16
            z.writestr(info,contents[f])

    data=out.read_bytes()
    print(f'built {out.name}: {len(FILES)} files, {len(data)} bytes')
    print(f'SHA-256 {hashlib.sha256(data).hexdigest()}')
    print(f'source commit {commit}')
    for f in FILES:
        print(f'  {f:32s} {len(contents[f]):8d}  {hashlib.sha256(contents[f]).hexdigest()}')
    return out

if __name__=='__main__':
    build(sys.argv[1] if len(sys.argv)>1 else 'HEAD')
