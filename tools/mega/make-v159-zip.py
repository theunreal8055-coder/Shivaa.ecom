#!/usr/bin/env python3
"""Build shivaa-update-v159.zip — root layout into public_html ROOT.

api.php, index.html, sw.js, css/finale.css, js/app.js, and campaign images.
data/db.json and .htaccess are NEVER shipped in update zips.
Files inside the zip are stored directly at ROOT (e.g. index.html, NOT cms/index.html).
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v159.zip'

FILES = [
    'api.php',
    'index.html',
    'sw.js',
    'css/finale.css',
    'js/app.js',
    'images/banners/gold-biscuit-campaign.jpg',
    'images/banners/gender-gents-gold.jpg',
    'images/banners/gender-ladies-gold.jpg',
    'images/products/stud-mens-rudra.jpg',
    'images/products/stud-mens-veer.jpg',
    'images/products/stud-mens-surya.jpg',
    'images/products/stud-ladies-mayura.jpg',
    'images/products/stud-ladies-chandrika.jpg',
    'images/products/stud-ladies-tara.jpg',
]

def build_zip(target_path):
    with zipfile.ZipFile(target_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for rel in FILES:
            f = CMS / rel
            if not f.exists():
                raise SystemExit(f'missing: {f}')
            z.write(f, rel)

    names = zipfile.ZipFile(target_path).namelist()
    assert names == FILES or sorted(names) == sorted(FILES), names
    assert not any(n.startswith('cms/') for n in names), 'No cms/ prefix allowed'
    assert not any('db.json' in n or n == '.htaccess' for n in names), 'No db.json or .htaccess'

    MARKERS = [
        ('index.html', 'window.__SHIVAA_REL=159;'),
        ('index.html', '/js/app.js?v=159'),
        ('sw.js', 'shivaa-shell-v159'),
        ('sw.js', "'/js/app.js?v=159'"),
        ('js/app.js', 'const APP_REL = 159;'),
        ('js/app.js', 'AURA_SCRIPTS'),
        ('js/app.js', 'buyCampaignStud'),
        ('js/app.js', 'ensureCampaignStuds'),
        ('css/finale.css', 'shv-scheme-page'),
        ('api.php', "'rel'   => 159,"),
        ('api.php', 'campaign_studs_catalog'),
        ('api.php', 'step=quiz&orderId='),
    ]

    ABSENT = [
        ('index.html', 'shvTopSchemeRibbon'),
    ]

    with zipfile.ZipFile(target_path) as z:
        bad = []
        for name, marker in MARKERS:
            if marker.encode() not in z.read(name):
                bad.append('%s <- %r' % (name, marker))
        for name, marker in ABSENT:
            if marker.encode() in z.read(name):
                bad.append('%s still contains removed: %r' % (name, marker))
        if bad:
            raise SystemExit('ZIP VERIFICATION FAILED:\n  ' + '\n  '.join(bad))

    body = target_path.read_bytes()
    print('%s — %d files, %.0f KB' % (target_path.name, len(names), target_path.stat().st_size / 1024))
    print('md5 %s' % hashlib.md5(body).hexdigest())
    print('sha256 %s' % hashlib.sha256(body).hexdigest())
    for n in names:
        print('   ', n)
    print('all %d v159 markers verified inside %s ✦\n' % (len(MARKERS), target_path.name))

if __name__ == '__main__':
    build_zip(OUT)
