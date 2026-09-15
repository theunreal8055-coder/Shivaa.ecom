#!/usr/bin/env python3
"""v113b — build the category faces in cms/images/categories/.

Every category in CATS (cms/js/app.js) points at /images/categories/<key>.jpg,
but only 17 files were ever referenced and none existed: while the catalogue is
still loading (or if /api/products fails) LIVE_CATS() falls back to the full map
and the collection grid filled up with the browser's broken-image icons.

This script writes a face for every category that has no photo yet:
  · key given on the command line (--real key=source.jpg)  -> cropped to the
    square tile size and saved as that key's face (a real photograph);
  · every other missing key                               -> an on-brand
    placeholder tile (deep maroon, gold ornament, the category's own name).

Usage:  python3 tools/mega/make-category-tiles.py --real rings=qa/v113b/rings-raw.png
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
APP = os.path.join(ROOT, 'cms', 'js', 'app.js')
OUT = os.path.join(ROOT, 'cms', 'images', 'categories')
SIZE = 420          # square; the tiles render at 84px (retina headroom)
CONVERT = shutil.which('convert') or shutil.which('magick')
if not CONVERT:
    sys.exit('ImageMagick (convert) is required')


def cats_from_app():
    """Read the CATS map: {key: (display name, image path)}."""
    src = open(APP, encoding='utf-8').read()
    block = src[src.index('const CATS = {'):]
    block = block[:block.index('\n};')]
    out = {}
    for key, name, img in re.findall(
            r"(\w+):\s*\{\s*name:\s*'([^']+)'.*?img:\s*'([^']+)'", block):
        out[key] = (name, img)
    return out


def face_path(img):
    return os.path.join(ROOT, 'cms', img.lstrip('/'))


def real_photo(key, source, name, dest):
    """Crop the supplied photo to the square tile and save it as JPEG."""
    subprocess.run([
        CONVERT, source,
        '-resize', f'{SIZE}x{SIZE}^', '-gravity', 'center', '-extent', f'{SIZE}x{SIZE}',
        '-strip', '-interlace', 'Plane', '-quality', '86',
        '-sampling-factor', '4:2:0', dest,
    ], check=True)
    print('  PHOTO %-16s <- %s' % (key, source))


def placeholder(key, name, dest):
    """Branded stand-in: maroon field, gold ornament, the category name."""
    # shrink the type until the name fits the 340px safe width
    pts, width = 46, 10 ** 6
    while pts > 20:
        out = subprocess.run([CONVERT, '-font', 'DejaVu-Serif-Bold', '-pointsize', str(pts),
                              'label:' + name, '-format', '%w', 'info:'],
                             check=True, capture_output=True, text=True)
        width = int(out.stdout.strip())
        if width <= 340:
            break
        pts -= 2
    cmd = [
        CONVERT, '-size', f'{SIZE}x{SIZE}', 'radial-gradient:#5c1826-#20060a',
        '-font', 'DejaVu-Serif-Bold',
        # gold marquise ornament above the name
        '-fill', '#d4af5a', '-stroke', 'none',
        '-draw', 'polygon 210,96 230,120 210,144 190,120',
        '-fill', '#b98a2f',
        '-draw', 'polygon 210,106 221,120 210,134 199,120',
        # hairline rules either side of the type block
        '-stroke', '#d4af5a', '-strokewidth', '2', '-fill', 'none',
        '-draw', f'line 70,{SIZE // 2 + 56} {SIZE - 70},{SIZE // 2 + 56}',
        # the name itself
        '-stroke', 'none', '-fill', '#eed9a8', '-pointsize', str(pts),
        '-gravity', 'center', '-annotate', '+0+34', name,
        # small print so the tile reads as intentional, never as a failed load
        '-fill', '#c9a86a', '-font', 'DejaVu-Sans', '-pointsize', '17',
        '-annotate', '+0+78', 'photoshoot in progress',
        '-strip', '-quality', '86', '-sampling-factor', '4:2:0', dest,
    ]
    subprocess.run(cmd, check=True)
    print('  TILE  %-16s %-18s (%dpt, %dpx wide)' % (key, name, pts, width))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--real', action='append', default=[],
                    help='key=path/to/source.jpg — use a real photo for this category')
    ap.add_argument('--force', action='store_true', help='rebuild tiles that already exist')
    ap.add_argument('--list', action='store_true', help='show what is missing and exit')
    args = ap.parse_args()

    real = dict(r.split('=', 1) for r in args.real)
    cats = cats_from_app()
    os.makedirs(OUT, exist_ok=True)

    missing = [k for k, (_, img) in cats.items() if not os.path.exists(face_path(img))]
    if args.list:
        print(json.dumps({'categories': len(cats), 'missing': missing}, indent=1))
        return
    if not missing:
        print('every category face exists (%d categories)' % len(cats))
        return

    print('%d/%d category faces missing — building:' % (len(missing), len(cats)))
    for key in missing:
        name, img = cats[key]
        dest = face_path(img)
        if key in real and os.path.exists(real[key]):
            real_photo(key, real[key], name, dest)
        elif args.force or not os.path.exists(dest):
            placeholder(key, name, dest)
    print('done — %s' % OUT)


if __name__ == '__main__':
    main()
