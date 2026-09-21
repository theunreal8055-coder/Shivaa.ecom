#!/usr/bin/env python3
"""Build shivaa-update-v166.zip — root layout for public_html.

v166 "ALWAYS THE LATEST" — the owner's three reports of 21 Sep 2026:

  1 · the laptop category tap that did nothing (mega panel + its full-viewport
      backdrop stayed open over the page the shopper had just asked for)
  2 · "sometimes the products are all empty … sometimes we have to refresh
      it", plus "some animations or graphics are not loaded"
  3 · "people who logged in 15 days ago still see the 15-day-old version"

What ships:
  js/v166.js     NEW · overlay-close ownership, catalogue retry chain, device
                       last-good catalogue, the owner's forced-latest switch,
                       reveal/graphics failsafe. Loaded LAST (self-guarding:
                       if it never loads the site behaves exactly as before).
  index.html     every asset re-stamped ?v=166 (that IS the cure for report 3:
                 a ?v= URL is immutable for a year, and untouched files had been
                 left on their old numbers for weeks) + loader for js/v166.js
                 + service-worker register with updateViaCache:'none'.
  sw.js          shell v166, the re-stamped precache list (now complete: v127.js
                 and v166.js included), SHV_PURGE handler, SHV_RELEASE broadcast.
  js/app.js      api() timeout, device catalogue read/write + catalogOk, boot
                 paints from the device copy, route() closes any open overlay,
                 every media URL rides the release (ASSET_V).
  js/v116.js     the drawer's category photos ride the release too.
  js/v117.js     the post-paint aurum/motion/boost trio now rides the release —
                 it used to inject ?v=107/?v=134 copies, which the immutable
                 cache had pinned on every returning device.
  css/fonts.css  the three woff2 URLs carry the release stamp (a font is served
                 with a 365-day freshness window).
  js/admin.js    the owner's switch: Settings → "Always show customers the
                 latest version" (default ON) → api/settings.forceLatestVersion.
  api.php        GET /api/version {rel, shell, builtAt, forceLatest, stamp} —
                 the freshness controller's dial; settings accept/validate the
                 new boolean.

data/db.json and .htaccess are NEVER shipped in update zips (owner data + a
host-managed file). Files inside the zip are stored directly at ROOT
(e.g. index.html, NOT cms/index.html).
"""
import hashlib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / 'cms'
OUT = ROOT / 'shivaa-update-v166.zip'

FILES = [
    'api.php',
    'index.html',
    'sw.js',
    'css/fonts.css',
    'js/app.js',
    'js/admin.js',
    'js/v116.js',
    'js/v117.js',
    'js/v166.js',
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
    assert not any(n.endswith('.htaccess') or n.endswith('db.json') for n in names), \
        'data + .htaccess must never ship'


if __name__ == '__main__':
    build_zip(OUT)
    h = hashlib.md5(OUT.read_bytes()).hexdigest()
    print(f'{OUT.name} · {OUT.stat().st_size} bytes · {len(FILES)} files')
    print(f'md5  {h}')
    for rel in FILES:
        print(f'  {rel}  {(CMS / rel).stat().st_size:>7} B')
