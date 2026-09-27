#!/usr/bin/env python3
"""Caption plates that replace the stray prompt labels Veo burned into shot 1
("PHOOL", 'D1 "PHOOL"', "SOLITAIRE", "D3. TEEN BOONDH").

Renders one full-frame RGBA overlay per design: an ivory caption plate with
rounded ends across the rows Veo wrote on, carrying our own clean caption.

usage: make_captions.py <W> <H> <outdir>
"""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont

W, H, OUTDIR = int(sys.argv[1]), int(sys.argv[2]), pathlib.Path(sys.argv[3])
OUTDIR.mkdir(parents=True, exist_ok=True)

CAPS = [
    ("PHOOL",       "EVERYDAY LIGHT"),
    ("SOLITAIRE",   "MODERN MINIMAL"),
    ("TEEN BOONDH", "THREE DROPS"),
    ("TAARA",       "FESTIVE TASSEL"),
]

IVORY = (250, 245, 236, 255)
INK = (46, 33, 22, 255)
GOLD = (176, 138, 58, 255)
Y0, Y1 = 0.695, 0.845           # the rows Veo wrote on (~0.74 H)


def font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        if pathlib.Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def tracked_width(d, text, f, track):
    return sum(d.textlength(ch, font=f) for ch in text) + track * (len(text) - 1)


def draw_tracked(d, text, cy, f, fill, track):
    """draw text centred horizontally with pixel letter-spacing, cy = top y"""
    x = (W - tracked_width(d, text, f, track)) / 2
    for ch in text:
        d.text((x, cy), ch, font=f, fill=fill)
        x += d.textlength(ch, font=f) + track


for i, (name, sub) in enumerate(CAPS, start=1):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y0, y1 = int(H * Y0), int(H * Y1)
    bh = y1 - y0
    pad = int(W * 0.018)
    d.rounded_rectangle([pad, y0, W - pad, y1], radius=bh // 2, fill=IVORY,
                        outline=(GOLD[0], GOLD[1], GOLD[2], 170), width=max(1, H // 1100))

    # auto-fit: shrink until the tracked line fits inside the plate
    max_w = (W - 2 * pad) * 0.86
    size = int(bh * 0.27)
    track = int(bh * 0.045)
    f_name = font(size)
    while size > 10 and tracked_width(d, name, f_name, track) > max_w:
        size = int(size * 0.94)
        track = max(1, int(track * 0.94))
        f_name = font(size)
    f_sub = font(int(bh * 0.125))
    draw_tracked(d, name, y0 + int(bh * 0.20) + int((int(bh * 0.27) - size) * 0.5), f_name, INK, track)

    rw = int(W * 0.10)
    ry = y0 + int(bh * 0.665)
    d.line([((W - rw) // 2, ry), ((W + rw) // 2, ry)],
           fill=(GOLD[0], GOLD[1], GOLD[2], 150), width=max(1, H // 1300))

    draw_tracked(d, sub, y0 + int(bh * 0.705), f_sub, GOLD, int(bh * 0.042))

    out = OUTDIR / f"cap{i}.png"
    img.save(out)
    print("wrote", out)
