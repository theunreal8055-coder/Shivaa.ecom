#!/usr/bin/env python3
"""Build shivaa-update-v163.zip — root layout for public_html.

api.php, index.html, sw.js, css/finale.css, js/app.js, and campaign images.
data/db.json and .htaccess are NEVER shipped in update zips.
Files inside the zip are stored directly at ROOT (e.g. index.html, NOT cms/index.html).
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v163.zip'

FILES = [
    'api.php',
    'index.html',
    'sw.js',
    'css/finale.css',
    'js/app.js',
    'images/banners/gender-gents-gold.jpg',
    'images/banners/gender-ladies-gold.jpg',
    'images/products/studs/mst01-studio.jpg',
    'images/products/studs/mst01-macro.jpg',
    'images/products/studs/mst01-worn.jpg',
    'images/products/studs/mst01-gift.jpg',
    'images/products/studs/mst02-studio.jpg',
    'images/products/studs/mst02-macro.jpg',
    'images/products/studs/mst02-worn.jpg',
    'images/products/studs/mst02-gift.jpg',
    'images/products/studs/mst03-studio.jpg',
    'images/products/studs/mst03-macro.jpg',
    'images/products/studs/mst03-worn.jpg',
    'images/products/studs/mst03-gift.jpg',
    'images/products/studs/lst01-studio.jpg',
    'images/products/studs/lst01-macro.jpg',
    'images/products/studs/lst01-worn.jpg',
    'images/products/studs/lst01-gift.jpg',
    'images/products/studs/lst02-studio.jpg',
    'images/products/studs/lst02-macro.jpg',
    'images/products/studs/lst02-worn.jpg',
    'images/products/studs/lst02-gift.jpg',
    'images/products/studs/lst03-studio.jpg',
    'images/products/studs/lst03-macro.jpg',
    'images/products/studs/lst03-worn.jpg',
    'images/products/studs/lst03-gift.jpg',
]

def build_zip(target_path):
    with zipfile.ZipFile(target_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for rel in FILES:
            f = CMS / rel
            if not f.exists():
                raise SystemExit(f'missing: {f}')
            z.write(f, rel)

    names = zipfile.ZipFile(target_path).namelist()
    assert sorted(names) == sorted(FILES), f'Mismatch in zip files: {names}'
    assert not any(n.startswith('cms/') for n in names), 'No cms/ prefix allowed'
    assert not any('db.json' in n or n == '.htaccess' for n in names), 'No db.json or .htaccess'

    MARKERS = [
        ('index.html', 'window.__SHIVAA_REL=163;'),
        ('index.html', '/js/app.js?v=163'),
        ('index.html', '/css/finale.css?v=163'),
        ('index.html', 'https://sdk.cashfree.com/js/v3/cashfree.js'),
        ('sw.js', 'shivaa-shell-v163'),
        ('sw.js', "'/js/app.js?v=163'"),
        ('sw.js', "'/css/finale.css?v=163'"),
        ('js/app.js', 'const APP_REL = 163;'),
        ('js/app.js', 'AURA_SCRIPTS'),
        ('js/app.js', 'buyCampaignStud'),
        ('js/app.js', 'ensureCampaignStuds'),
        ('js/app.js', "address: { ...EX_BOUNDARY }"),
        ('js/app.js', "redirectTarget: '_modal'"),
        ('js/app.js', "redirectTarget: '_self'"),
        ('js/app.js', 'submitHostedForm'),
        ('js/app.js', 'window.scrollTo({ top: 0, behavior: \'smooth\' });'),
        ('css/finale.css', '.shv-scheme-stepper {\n  position: relative !important;\n  top: auto !important;'),
        ('css/finale.css', '.shv-ai-concierge-bar {\n  position: relative !important;\n  z-index: 15 !important;'),
        ('api.php', "'rel'   => 163,"),
        ('api.php', 'function finale_qualifies(array $items): bool'),
        ('api.php', 'campaign_studs_catalog'),
        ('api.php', 'checkoutAuthenticate'),
        ('api.php', 'shv_guest_pin($order)'),
    ]

    ABSENT = [
        ('index.html', '__SHIVAA_REL=162;'),
        ('js/app.js', 'APP_REL = 162;'),
        ('sw.js', 'shivaa-shell-v162'),
        ('api.php', "'rel'   => 162,"),
    ]

    with zipfile.ZipFile(target_path) as z:
        bad = []
        for name, marker in MARKERS:
            if marker.encode() not in z.read(name):
                bad.append('%s <- missing %r' % (name, marker))
        for name, marker in ABSENT:
            if marker.encode() in z.read(name):
                bad.append('%s <- still contains obsolete %r' % (name, marker))
        if bad:
            raise SystemExit('ZIP VERIFICATION FAILED:\n  ' + '\n  '.join(bad))

    body = target_path.read_bytes()
    print('%s — %d files, %.0f KB' % (target_path.name, len(names), target_path.stat().st_size / 1024))
    print('md5:    %s' % hashlib.md5(body).hexdigest())
    print('sha256: %s' % hashlib.sha256(body).hexdigest())
    print('all %d v163 markers verified inside %s ✦\n' % (len(MARKERS), target_path.name))

if __name__ == '__main__':
    build_zip(OUT)
    # Also copy to CMS/shivaa-update-v163.zip for web downloading if served via HTTP
    cms_out = CMS / 'shivaa-update-v163.zip'
    build_zip(cms_out)
