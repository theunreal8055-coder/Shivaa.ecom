#!/usr/bin/env python3
"""Build the v241 responsive thumbnails the shop serves instead of big originals.

    /tmp/venv-img/bin/python qa/build-thumbs.py          # write every thumb
    /tmp/venv-img/bin/python qa/build-thumbs.py --check   # report only

WHY THIS EXISTS
---------------
The home page draws 12 bestseller cards, 17 category tiles and the review strip.
Every one of those pictures was a 200–420 KB JPEG sized for a full-width hero,
so a phone was pulling 2–5 MB and decoding it *while the shopper was already
scrolling* — the owner's "home page par lag karta hai".

Each source image now gets two WebP siblings:

    images/products/ring-floral.jpg
    images/thumbs/products/ring-floral-320.webp     (~8–14 KB)
    images/thumbs/products/ring-floral-560.webp     (~20–35 KB)

and the app requests the small one in a card / tile / strip via `srcset`
(see `thumbAttrs()` in cms/js/app.js and js/v241.js). The ORIGINAL file stays
exactly where it was — product pages, zoom, catalogues and print still use the
full-size photograph. Nothing on the server is replaced, so a missing thumb can
only ever fall back to the picture that was already there.

Only these directories are converted, because they are the ones drawn small:
products/**, categories/**, reviews/**, offers/**. Banners are page-width art
and keep their originals (a 560 px banner would look soft behind a headline).
"""
import io
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CMS = os.path.join(ROOT, 'cms')
SRC_DIRS = ['images/products', 'images/categories', 'images/reviews', 'images/offers']
WIDTHS = (320, 560)
QUALITY = 70
# Both widths are ALWAYS written, even from a source narrower than the target.
# A missing sibling would mean a `srcset` candidate that 404s on the live site;
# an upscaled 560 of a 60 px ornament looks exactly like the 60 px original
# drawn in a 170 px tile, which is what the browser did before this release.


def sources():
    out = []
    for d in SRC_DIRS:
        base = os.path.join(CMS, d)
        for root, _dirs, files in os.walk(base):
            for f in sorted(files):
                if not f.lower().endswith(('.jpg', '.jpeg', '.png')):
                    continue
                p = os.path.join(root, f)
                out.append(p)
    return sorted(out)


def thumb_path(src, width):
    rel = os.path.relpath(src, CMS).replace(os.sep, '/')
    rel = rel[len('images/'):]
    stem, _ext = os.path.splitext(rel)
    return os.path.join(CMS, 'images', 'thumbs', stem + '-%d.webp' % width)


def main():
    try:
        from PIL import Image
    except ImportError:
        raise SystemExit('Pillow is not installed in this interpreter.\n'
                         '  python3 -m venv /tmp/venv-img && /tmp/venv-img/bin/pip install pillow\n'
                         '  /tmp/venv-img/bin/python qa/build-thumbs.py')
    check = '--check' in sys.argv
    srcs = sources()
    wrote = out_bytes = 0
    for src in srcs:
        for w in WIDTHS:
            dst = thumb_path(src, w)
            if check:
                if not os.path.isfile(dst):
                    print('MISSING  %s' % os.path.relpath(dst, CMS))
                else:
                    out_bytes += os.path.getsize(dst)
                continue
            im = Image.open(src)
            im = im.convert('RGB')
            h = max(1, round(im.height * w / im.width))
            small = im.resize((w, h), Image.LANCZOS)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            buf = io.BytesIO()
            small.save(buf, 'WEBP', quality=QUALITY, method=4)
            with open(dst, 'wb') as fh:
                fh.write(buf.getvalue())
            wrote += 1
            out_bytes += buf.tell()
    print('%d source images · %d thumbs · %s MB of thumbnails'
          % (len(srcs), wrote, round(out_bytes / 1048576, 2)))


if __name__ == '__main__':
    main()
