#!/usr/bin/env python3
"""On-screen supers for the B2B reel (Veo cannot spell, so text is burned here).
usage: make_supers.py <W> <H> <outdir>"""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont

W, H, OUT = int(sys.argv[1]), int(sys.argv[2]), pathlib.Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)

SUPERS = [
    ("2,00,000+ DESIGNS", "ONE SCREEN  ·  ONE PLATFORM"),
    ("BULLION  ·  CUSTOM  ·  WASTAGE", "DEAD STOCK OR NEW  ·  RTGS OR CASH"),
    ("VERIFY YOUR GST", "DASHBOARD OPENS  ·  shivaa.in"),
    ("YOU NAME IT, WE HAVE IT.", "SHIVAA  ·  shivaa.in"),
]
INK = (18, 14, 10, 255); GOLD = (214, 176, 92, 255); PLATE = (250, 245, 236, 250)


def font(sz):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if pathlib.Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def tw(d, t, f, tr):
    return sum(d.textlength(c, font=f) for c in t) + tr * (len(t) - 1)


def draw(d, t, y, f, fill, tr):
    x = (W - tw(d, t, f, tr)) / 2
    for c in t:
        d.text((x, y), c, font=f, fill=fill); x += d.textlength(c, font=f) + tr


for i, (line, sub) in enumerate(SUPERS, 1):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    y0, y1 = int(H * 0.735), int(H * 0.845)
    bh = y1 - y0; pad = int(W * 0.04)
    d.rounded_rectangle([pad, y0, W - pad, y1], radius=bh // 2, fill=PLATE,
                        outline=(GOLD[0], GOLD[1], GOLD[2], 190), width=max(1, H // 1100))
    size = int(bh * 0.30); tr = int(bh * 0.035); f = font(size)
    while size > 10 and tw(d, line, f, tr) > (W - 2 * pad) * 0.88:
        size = int(size * 0.94); tr = max(1, int(tr * 0.94)); f = font(size)
    draw(d, line, y0 + int(bh * 0.20), f, INK, tr)
    fs = font(int(bh * 0.135))
    draw(d, sub, y0 + int(bh * 0.66), fs, (150, 118, 48, 255), int(bh * 0.035))
    img.save(OUT / f"super{i}.png"); print("wrote", OUT / f"super{i}.png")
