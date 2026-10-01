#!/usr/bin/env python3
"""Motion-graphics plates for the SHIVAA launch video (1920x1080 by default).
Renders transparent PNGs that build.sh animates with ffmpeg overlays.
usage: make_gfx.py <W> <H> <outdir>
"""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W = int(sys.argv[1]) if len(sys.argv) > 1 else 1920
H = int(sys.argv[2]) if len(sys.argv) > 2 else 1080
OUT = pathlib.Path(sys.argv[3] if len(sys.argv) > 3 else "gfx")
OUT.mkdir(parents=True, exist_ok=True)
ROOT = pathlib.Path(__file__).resolve().parents[2]
LOGO_SRC = ROOT / "cms/images/logo.png"

GOLD = (214, 176, 92)
GOLD_D = (150, 118, 48)
INK = (18, 16, 13)
IVORY = (244, 237, 224)
PLATE = (250, 245, 236, 247)

TITLE = ("SHIVAA", "WHOLESALE GOLD JEWELLERY PLATFORM  ·  FOR JEWELLERS")
SUPERS = [
    ("2,00,000+ DESIGNS", "ONE SCREEN  ·  ONE PLATFORM"),
    ("BULLION  ·  CUSTOM ORDERS", "WASTAGE BUY  ·  MADE TO ORDER"),
    ("DEAD STOCK OR NEW", "RTGS OR CASH  —  WE ARE READY"),
    ("VERIFY YOUR GST", "DASHBOARD OPENS INSTANTLY  ·  shivaa.in"),
]
ENDCARD = ("YOU NAME IT, WE HAVE IT.", "shivaa.in")


def font(sz, bold=True):
    cands = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
             else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    for p in cands:
        if pathlib.Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def tw(d, t, f, tr=0):
    return sum(d.textlength(c, font=f) for c in t) + tr * max(0, len(t) - 1)


def tracked(d, t, x, y, f, fill, tr=0):
    for c in t:
        d.text((x, y), c, font=f, fill=fill)
        x += d.textlength(c, font=f) + tr


def fit(d, t, f_maker, maxw, start, tr):
    sz = start
    f = f_maker(sz)
    while sz > 10 and tw(d, t, f, tr) > maxw:
        sz = int(sz * 0.94)
        f = f_maker(sz)
    return f


def logo_light(height):
    """Recolour the navy wordmark into a transparent gold/ivory lockup."""
    im = Image.open(LOGO_SRC).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            lum = (r + g + b) / 3
            a = max(0, min(255, int(255 - lum * 1.25)))      # dark ink -> opaque
            px[x, y] = (IVORY[0], IVORY[1], IVORY[2], a)
    scale = height / h
    return im.resize((int(w * scale), height), Image.LANCZOS)


def shadowed(img, blur=18, alpha=150, dy=6):
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sh.paste((0, 0, 0, alpha), (0, 0), img.split()[3])
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.alpha_composite(sh, (0, dy))
    out.alpha_composite(img)
    return out


# ── 1. intro title lower-third ───────────────────────────────────────────────
def make_title():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = int(W * 0.07)
    y = int(H * 0.68)
    bar_h = int(H * 0.21)
    scrim = Image.new("RGBA", (W, int(bar_h * 1.5)), (0, 0, 0, 0))
    ds = ImageDraw.Draw(scrim)
    for i in range(scrim.height):
        ds.line([(0, i), (W, i)], fill=(10, 9, 7, int(165 * (i / scrim.height) ** 0.8)))
    img.alpha_composite(scrim, (0, H - scrim.height))
    d.rectangle([x, y, x + int(W * 0.004), y + bar_h], fill=GOLD + (255,))
    tx = x + int(W * 0.028)
    f1 = font(int(H * 0.095))
    tracked(d, TITLE[0], tx, y - int(H * 0.012), f1, IVORY + (255,), int(H * 0.012))
    f2 = fit(d, TITLE[1], lambda s: font(s, False), int(W * 0.60), int(H * 0.026), int(H * 0.004))
    tracked(d, TITLE[1], tx + 4, y + int(bar_h * 0.72), f2, GOLD + (235,), int(H * 0.004))
    img.save(OUT / "title.png")


# ── 2. supers (bottom-left pill plates) ──────────────────────────────────────
def make_supers():
    for i, (line, sub) in enumerate(SUPERS, 1):
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        pad = int(W * 0.055)
        bh = int(H * 0.135)
        y0 = int(H * 0.73)
        f1 = fit(d, line, lambda s: font(s), int(W * 0.46), int(bh * 0.40), int(bh * 0.03))
        f2 = fit(d, sub, lambda s: font(s, False), int(W * 0.46), int(bh * 0.19), int(bh * 0.025))
        bw = int(max(tw(d, line, f1, int(bh * 0.03)), tw(d, sub, f2, int(bh * 0.025))) + bh * 1.1)
        plate = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
        dp = ImageDraw.Draw(plate)
        dp.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=int(bh * 0.18), fill=PLATE,
                             outline=GOLD + (210,), width=max(2, H // 540))
        dp.rectangle([0, int(bh * 0.22), int(bh * 0.055), int(bh * 0.78)], fill=GOLD + (255,))
        tx = int(bh * 0.42)
        tracked(dp, line, tx, int(bh * 0.17), f1, INK + (255,), int(bh * 0.03))
        tracked(dp, sub, tx + 2, int(bh * 0.63), f2, GOLD_D + (255,), int(bh * 0.025))
        img.alpha_composite(shadowed(plate), (pad, y0))
        img.save(OUT / f"super{i}.png")


# ── 3. webcam bubble: circular mask + gold ring ──────────────────────────────
def make_bubble(size=None):
    s = size or int(H * 0.30)
    mask = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(mask).ellipse([0, 0, s - 1, s - 1], fill=(255, 255, 255, 255))
    mask.save(OUT / "bubble_mask.png")
    ring_pad = int(s * 0.06)
    R = s + ring_pad * 2
    ring = Image.new("RGBA", (R, R), (0, 0, 0, 0))
    dr = ImageDraw.Draw(ring)
    glow = Image.new("RGBA", (R, R), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([2, 2, R - 3, R - 3], fill=(0, 0, 0, 190))
    glow = glow.filter(ImageFilter.GaussianBlur(int(s * 0.05)))
    ring.alpha_composite(glow)
    dr.ellipse([ring_pad * 0.45, ring_pad * 0.45, R - ring_pad * 0.45, R - ring_pad * 0.45],
               outline=GOLD + (255,), width=max(3, int(s * 0.018)))
    dr.arc([ring_pad * 0.45, ring_pad * 0.45, R - ring_pad * 0.45, R - ring_pad * 0.45],
           start=-70, end=35, fill=IVORY + (220,), width=max(3, int(s * 0.018)))
    ring.save(OUT / "bubble_ring.png")
    with open(OUT / "bubble.txt", "w") as f:
        f.write(f"{s} {R} {ring_pad}\n")


# ── 4. corner watermark ──────────────────────────────────────────────────────
def make_watermark():
    lg = logo_light(int(H * 0.055))
    img = Image.new("RGBA", lg.size, (0, 0, 0, 0))
    img.alpha_composite(lg)
    img.putalpha(img.split()[3].point(lambda a: int(a * 0.82)))
    shadowed(img, blur=10, alpha=120, dy=3).save(OUT / "watermark.png")


# ── 5. end card ──────────────────────────────────────────────────────────────
def make_endcard():
    img = Image.new("RGBA", (W, H), (14, 12, 10, 255))
    d = ImageDraw.Draw(img)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([W * 0.22, H * 0.10, W * 0.78, H * 0.92], fill=(120, 92, 36, 120))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(int(H * 0.12))))
    lg = logo_light(int(H * 0.17))
    img.alpha_composite(lg, ((W - lg.width) // 2, int(H * 0.30)))
    f1 = fit(d, ENDCARD[0], lambda s: font(s), int(W * 0.72), int(H * 0.058), int(H * 0.006))
    tracked(d, ENDCARD[0], int((W - tw(d, ENDCARD[0], f1, int(H * 0.006))) / 2),
            int(H * 0.585), f1, GOLD + (255,), int(H * 0.006))
    d.line([(W * 0.42, H * 0.675), (W * 0.58, H * 0.675)], fill=GOLD + (190,), width=max(2, H // 540))
    f2 = font(int(H * 0.030), False)
    tracked(d, ENDCARD[1], int((W - tw(d, ENDCARD[1], f2, int(H * 0.008))) / 2),
            int(H * 0.715), f2, IVORY + (225,), int(H * 0.008))
    img.convert("RGB").save(OUT / "endcard.png")


if __name__ == "__main__":
    make_title(); make_supers(); make_bubble(); make_watermark(); make_endcard()
    print(f"gfx written to {OUT} ({W}x{H})")
