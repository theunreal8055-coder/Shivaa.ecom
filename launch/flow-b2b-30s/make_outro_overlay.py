#!/usr/bin/env python3
"""Transparent overlay for the 3s logo outro: big centred Shivaa logo + shivaa.in.
usage: make_outro_overlay.py <W> <H> <out.png>"""
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont

W, H, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSETS = ROOT / "launch" / "omni-90s" / "assets"

canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))

# soft dark scrim so the gold logo stays readable over Veo's busy gold plate
scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(scrim)
sd.rectangle([0, 0, W, H], fill=(12, 9, 7, 170))
sx0, sx1 = int(W * 0.05), int(W * 0.95)
sy0, sy1 = int(H * (0.24 if W >= H else 0.36)), int(H * (0.80 if W >= H else 0.66))
sd.rounded_rectangle([sx0, sy0, sx1, sy1], radius=int(min(W, H) * 0.045), fill=(10, 8, 6, 232),
                     outline=(176, 138, 58, 200), width=max(1, int(min(W, H) * 0.0022)))
canvas.alpha_composite(scrim)

logo_path = ASSETS / "logo-shivaa-gold.png"
if not logo_path.exists():
    logo_path = ASSETS / "logo-shivaa-white.png"
logo = Image.open(logo_path).convert("RGBA")
target_w = int(W * (0.40 if W >= H else 0.70))
logo = logo.resize((target_w, max(1, int(logo.height * target_w / logo.width))), Image.LANCZOS)
lx = (W - logo.width) // 2
ly = int(H * 0.5) - logo.height // 2 - int(H * 0.035)
canvas.alpha_composite(logo, (lx, ly))

d = ImageDraw.Draw(canvas)


def font(size):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        if pathlib.Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def centre(text, y, size, fill):
    f = font(size)
    w = d.textlength(text, font=f)
    d.text(((W - w) / 2, y), text, font=f, fill=fill)


gold = (212, 175, 90, 255)
soft = (235, 225, 205, 205)

y = ly + logo.height + int(H * 0.020)
rw = int(target_w * 0.55)
d.line([((W - rw) // 2, y), ((W + rw) // 2, y)], fill=(212, 175, 90, 150), width=max(1, H // 900))
y += int(H * 0.024)
centre("T H E   M A N G A L S U T R A   R A N G E", y, max(12, int(H * 0.0155)), soft)
y += int(H * 0.048)
centre("shivaa.in", y, max(16, int(H * 0.030)), gold)

canvas.save(OUT)
print("outro overlay ->", OUT)
