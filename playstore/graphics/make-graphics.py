#!/usr/bin/env python3
"""Shivaa Play Store graphics - icon, feature graphic, adaptive icon, phone screenshots.

Pure Pillow + the brand's OWN webfonts (cms/fonts/*.woff2, converted to TTF on
the fly with fontTools+brotli). Nothing is traced from the internet and no logo
is redrawn: the wordmark and the emblem are the repository's existing art
(launch/cards/01-wordmark.png and cms/images/icons/icon-512.png), so what ships
to Play is the brand the site already uses.

Outputs (playstore/graphics/out/):
  icon-512.png                    512x512   - Play Console app icon
  feature-graphic-1024x500.png    1024x500  - Play Console feature graphic (required)
  adaptive-foreground.png         432x432   - optional launcher foreground (safe zone)
  adaptive-background.png         432x432   - optional launcher background
  screenshots/01..NN.png          1080x1920 - phone screenshots framed for the listing

Screenshots are built from REAL captures the owner drops into
playstore/screenshots/raw/ (see ../screenshots/CAPTURE.md). This script never
invents app UI: with an empty raw/ folder it writes no screenshots and says so.

Usage:
  python3 playstore/graphics/make-graphics.py            # build everything
  python3 playstore/graphics/make-graphics.py --check    # report what is missing
"""
import json
import os
import shutil
import sys
import tempfile

# Imported lazily inside the builders: `--check` only reads file sizes, and a
# machine that has not installed Pillow yet must still be able to ask what is
# missing.
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))          # repo root
CMS = os.path.join(ROOT, 'cms')
FONTS = os.path.join(CMS, 'fonts')
WORDMARK = os.path.join(ROOT, 'launch', 'cards', '01-wordmark.png')
ICON = os.path.join(CMS, 'images', 'icons', 'icon-512.png')
OUT = os.path.join(HERE, 'out')
RAW = os.path.abspath(os.path.join(HERE, '..', 'screenshots', 'raw'))
CAPTIONS = os.path.abspath(os.path.join(HERE, '..', 'screenshots', 'captions.json'))

# the brand palette, taken from the site's own cms/make_icons.py
MAROON_DEEP = (22, 4, 8)
MAROON = (42, 10, 16)
GOLD = (217, 175, 99)
GOLD_LO = (169, 124, 51)
CREAM = (253, 248, 239)

# the framed wordmark inside launch/cards/01-wordmark.png, measured once
WM_BOX = (185, 272, 1190, 494)      # x0, y0, x1, y1 (padded around the gold frame)


def log(msg):
    print(msg)


def ttf(name, cache):
    """Convert a brand webfont to TTF once per run and return its path."""
    dst = os.path.join(cache, name + '.ttf')
    if not os.path.exists(dst):
        from fontTools.ttLib import TTFont
        f = TTFont(os.path.join(FONTS, name + '.woff2'))
        f.flavor = None
        f.save(dst)
    return dst


def font(cache, name, size):
    from PIL import ImageFont
    return ImageFont.truetype(ttf(name, cache), size)


def tracked(draw, xy, text, f, fill, tracking=0.0, anchor_center_x=None):
    """Draw text with manual letter-spacing (PIL has no tracking knob)."""
    x, y = xy
    widths = [draw.textlength(ch, font=f) for ch in text]
    if anchor_center_x is not None:
        x = anchor_center_x - (sum(widths) + tracking * (len(text) - 1)) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=f, fill=fill)
        x += w + tracking


def tracked_width(draw, text, f, tracking=0.0):
    return sum(draw.textlength(ch, font=f) for ch in text) + tracking * (len(text) - 1)


def radial_glow(size, centre, radius, colour, strength=1.0):
    """A soft elliptical light source, built once and composited over the field."""
    from PIL import Image, ImageDraw, ImageFilter
    w, h = size
    layer = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(layer)
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        r = radius * t
        alpha = int(255 * strength * (1 - t) ** 2.2)
        d.ellipse([centre[0] - r * 1.35, centre[1] - r,
                   centre[0] + r * 1.35, centre[1] + r], fill=alpha)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.18))
    return Image.new('RGB', (w, h), colour), layer


def maroon_field(size, glow=None):
    """The site's own background: deep maroon, warmer toward the top."""
    from PIL import Image, ImageDraw
    w, h = size
    img = Image.new('RGB', (w, h), MAROON_DEEP)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(int(MAROON_DEEP[i] + (MAROON[i] - MAROON_DEEP[i]) * (1 - t) * 0.9) for i in range(3))
        d.line([(0, y), (w, y)], fill=c)
    if glow:
        tint, mask = radial_glow(size, glow[0], glow[1], glow[2],
                                 glow[3] if len(glow) > 3 else 1.0)
        img = Image.composite(tint, img, mask)
    return img


# ------------------------------ the assets ------------------------------

def build_icon(cache):
    """512x512 Play icon: the manifest emblem, full-bleed, no rounded corners."""
    from PIL import Image
    src = Image.open(ICON).convert('RGBA')
    if src.size != (512, 512):
        src = src.resize((512, 512), Image.LANCZOS)
    flat = Image.new('RGBA', (512, 512), MAROON_DEEP + (255,))
    flat.alpha_composite(src)
    dst = os.path.join(OUT, 'icon-512.png')
    flat.convert('RGB').save(dst, 'PNG', optimize=True)
    log('  icon-512.png                  512x512  (manifest emblem, full-bleed)')
    return dst


def build_feature_graphic(cache):
    """1024x500 feature graphic - the brand wordmark over its own maroon field."""
    from PIL import Image, ImageDraw
    W, H = 1024, 500
    img = maroon_field((W, H), glow=((W // 2, 168), 430, (90, 26, 30), 1.0))
    d = ImageDraw.Draw(img)

    wm = Image.open(WORDMARK).convert('RGB').crop(WM_BOX)
    tw = 880
    th = int(round(wm.height * tw / wm.width))
    wm = wm.resize((tw, th), Image.LANCZOS)
    img.paste(wm, ((W - tw) // 2, 108))

    rule_w = 300
    d.line([((W - rule_w) // 2, 336), ((W + rule_w) // 2, 336)], fill=GOLD_LO, width=2)

    f_tag = font(cache, 'jost', 27)
    tracked(d, (0, 372), 'LIVE GOLD RATES  -  HONEST MAKING CHARGES', f_tag, GOLD,
            tracking=3.4, anchor_center_x=W // 2)

    f_sub = font(cache, 'cormorant-garamond', 34)
    tracked(d, (0, 424), 'Jayal, Rajasthan  -  shivaa.in', f_sub, (196, 168, 138),
            tracking=1.2, anchor_center_x=W // 2)

    dst = os.path.join(OUT, 'feature-graphic-1024x500.png')
    img.save(dst, 'PNG', optimize=True)
    log('  feature-graphic-1024x500.png  1024x500 (wordmark + tagline)')
    return dst


def build_adaptive(cache):
    """432x432 launcher layers - emblem inside the 66% adaptive safe zone."""
    from PIL import Image, ImageDraw
    S = 432
    fg = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    emblem = Image.open(ICON).convert('RGBA')
    inner = int(S * 0.66)
    emblem = emblem.resize((inner, inner), Image.LANCZOS)
    fg.alpha_composite(emblem, ((S - inner) // 2, (S - inner) // 2))
    bg = Image.new('RGB', (S, S), MAROON)
    ImageDraw.Draw(bg).ellipse([S * 0.08, S * 0.08, S * 0.92, S * 0.92], fill=(58, 16, 24))
    fgd = os.path.join(OUT, 'adaptive-foreground.png')
    bgd = os.path.join(OUT, 'adaptive-background.png')
    fg.save(fgd, 'PNG', optimize=True)
    bg.save(bgd, 'PNG', optimize=True)
    log('  adaptive-foreground.png       432x432  (66% safe zone)')
    log('  adaptive-background.png       432x432')
    return fgd, bgd


def build_screenshots(cache):
    """Frame real captures into Play's 1080x1920 phone screenshot size."""
    if not os.path.isdir(RAW):
        log('  (no screenshots/raw/ folder yet - nothing to frame)')
        return []
    raws = sorted(f for f in os.listdir(RAW)
                  if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')) and not f.startswith('.'))
    if not raws:
        log('  (screenshots/raw/ is empty - capture on a phone first, see CAPTURE.md)')
        return []
    captions = {}
    if os.path.exists(CAPTIONS):
        try:
            captions = json.load(open(CAPTIONS))
        except Exception as e:
            log('  ! captions.json unreadable (%s) - using file names' % e)
    dst_dir = os.path.join(OUT, 'screenshots')
    os.makedirs(dst_dir, exist_ok=True)
    for old in os.listdir(dst_dir):
        if old.endswith('.png'):
            os.remove(os.path.join(dst_dir, old))

    from PIL import Image, ImageDraw
    W, H = 1080, 1920
    made = []
    for i, name in enumerate(raws, 1):
        shot = Image.open(os.path.join(RAW, name)).convert('RGB')
        sw, sh = shot.size
        scale = max(W / sw, H / sh)
        shot = shot.resize((int(sw * scale + 0.5), int(sh * scale + 0.5)), Image.LANCZOS)
        sw, sh = shot.size
        shot = shot.crop(((sw - W) // 2, (sh - H) // 2, (sw - W) // 2 + W, (sh - H) // 2 + H))

        frame = maroon_field((W, H))
        frame.paste(shot, (0, 0))

        # bottom scrim so the caption is always readable
        scrim = Image.new('L', (W, H), 0)
        sd = ImageDraw.Draw(scrim)
        for y in range(H - 460, H):
            t = (y - (H - 460)) / 460.0
            sd.line([(0, y), (W, y)], fill=int(235 * (t ** 1.4)))
        frame = Image.composite(Image.new('RGB', (W, H), (10, 2, 4)), frame, scrim)

        d = ImageDraw.Draw(frame)
        cap = captions.get(name) or os.path.splitext(name)[0].replace('-', ' ').replace('_', ' ')
        f_cap = font(cache, 'jost', 44)
        if tracked_width(d, cap, f_cap, 1.6) > W - 120:
            f_cap = font(cache, 'jost', 34)
        lines = [cap]
        while tracked_width(d, lines[-1], f_cap, 1.6) > W - 120 and len(lines[-1]) > 12:
            cut = lines[-1].rsplit(' ', 1)[0]
            lines[-1] = cut
            lines.append(cap[len(cut):].strip())
        y = H - 150 - 56 * (len(lines) - 1)
        for ln in lines:
            tracked(d, (0, y), ln, f_cap, CREAM, tracking=1.6, anchor_center_x=W // 2)
            y += 56

        f_brand = font(cache, 'marcellus-400', 30)
        tracked(d, (0, 54), 'SHIVAA JEWELS', f_brand, GOLD, tracking=6.0, anchor_center_x=W // 2)
        d.line([(W // 2 - 130, 104), (W // 2 + 130, 104)], fill=GOLD_LO, width=2)

        out = os.path.join(dst_dir, '%02d-%s.png' % (i, os.path.splitext(name)[0][:40]))
        frame.save(out, 'PNG', optimize=True)
        made.append(out)
        log('  screenshots/%s  1080x1920  "%s"' % (os.path.basename(out), cap))
    return made


def check():
    """Report what the kit still needs before the Play listing can be filled."""
    need = []
    for rel, label in [('out/icon-512.png', 'app icon'),
                       ('out/feature-graphic-1024x500.png', 'feature graphic')]:
        if not os.path.exists(os.path.join(HERE, rel)):
            need.append('%s (%s)' % (rel, label))
    raws = []
    if os.path.isdir(RAW):
        raws = [f for f in os.listdir(RAW) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    if len(raws) < 2:
        need.append('screenshots/raw/ needs at least 2 real phone captures (found %d)' % len(raws))
    return need


def main():
    os.makedirs(OUT, exist_ok=True)
    if '--check' in sys.argv:
        missing = check()
        if missing:
            print('MISSING:')
            for m in missing:
                print('  - ' + m)
            return 1
        print('OK: every required Play graphic exists')
        return 0
    cache = tempfile.mkdtemp(prefix='shv-fonts-')
    try:
        print('Building Shivaa Play Store graphics...')
        build_icon(cache)
        build_feature_graphic(cache)
        build_adaptive(cache)
        n = len(build_screenshots(cache))
        print('Done. %d screenshot(s) framed.' % n if n
              else 'Done. No screenshots yet (capture on a phone).')
        missing = check()
        if missing:
            print('')
            print('Still needed before the listing is complete:')
            for m in missing:
                print('  - ' + m)
        else:
            print('')
            print('All required Play graphics present.')
        return 0
    finally:
        shutil.rmtree(cache, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
