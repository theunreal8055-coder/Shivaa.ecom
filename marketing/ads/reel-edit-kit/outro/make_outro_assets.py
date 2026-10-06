#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shivaa Jewels — 10s cinematic outro asset builder (handoff §10).
Generates full-frame 1080x1920 cards used by render_outro.sh:
  logo-card.png    original logo, unchanged, once, inside a clean rectangle
  checks-card.png  hallmark / weight / making-charge care message
  cta-card.png     phone 89050 05921 + Main Road, Jayal
  sweep.png        restrained gold light-sweep band
  placeholder-exterior.png  stand-in until the real shop photo is supplied
The logo is pasted pixel-for-pixel (scaled once, LANCZOS) — never redrawn.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(KIT, "outro"); os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
IVORY, GOLD = (245, 239, 224), (212, 175, 105)
MAR_DEEP, MAR_MID = (58, 10, 22), (84, 16, 31)
F = lambda s: ImageFont.truetype(os.path.join(KIT, "fonts", "NotoSansDevanagari-SemiBold.ttf"), s)

def bg():
    im = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(im)
    for y in range(H):
        f = y / (H - 1)
        c = tuple(int(MAR_MID[i] + (MAR_DEEP[i] - MAR_MID[i]) * f) for i in range(3))
        d.line([(0, y), (W, y)], fill=c + (255,))
    return im

def vignette(im, strength=90):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([-W * 0.35, -H * 0.2, W * 1.35, H * 1.2], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(220))
    dark = Image.new("RGBA", (W, H), (10, 2, 6, 255))
    return Image.composite(im, Image.alpha_composite(im, Image.composite(dark, Image.new("RGBA", (W, H), (0, 0, 0, 0)), m)), m)

def corners(d, inset=64, L=110, w=3, a=110):
    for (cx, cy, sx, sy) in [(inset, inset, 1, 1), (W - inset, inset, -1, 1),
                             (inset, H - inset, 1, -1), (W - inset, H - inset, -1, -1)]:
        d.line([(cx, cy), (cx + sx * L, cy)], fill=GOLD + (a,), width=w)
        d.line([(cx, cy), (cx, cy + sy * L)], fill=GOLD + (a,), width=w)

def centre(im, y, txt, size, fill, anchor="ma"):
    ImageDraw.Draw(im).text((W / 2, y), txt, font=F(size), fill=fill, anchor=anchor)

# ---------------- logo card
im = vignette(bg())
d = ImageDraw.Draw(im)
corners(d)
logo = Image.open(os.path.join(KIT, "logo", "shivaa-logo.png")).convert("RGBA")
lw = 660
lh = round(logo.height * lw / logo.width)
logo = logo.resize((lw, lh), Image.LANCZOS)
pad = 46
rx, ry = (W - lw) // 2 - pad, (H - lh) // 2 - pad
rect = [rx, ry, rx + lw + 2 * pad, ry + lh + 2 * pad]
base = logo.getpixel((2, 2))[:3]                      # logo's own paper colour
d.rounded_rectangle(rect, 22, fill=base + (255,))
d.rounded_rectangle([rect[0] - 10, rect[1] - 10, rect[2] + 10, rect[3] + 10], 26,
                    outline=GOLD + (160,), width=2)   # thin gold rule, logo untouched
im.paste(logo, ((W - lw) // 2, (H - lh) // 2), logo)
centre(im, rect[3] + 90, "मेन रोड, जायल", 40, IVORY + (200,))
im.save(os.path.join(OUT, "logo-card.png"))

# ---------------- checks card
im = vignette(bg()); d = ImageDraw.Draw(im); corners(d)
centre(im, 470, "गहना खरीदने से पहले", 66, IVORY + (255,))
centre(im, 566, "ये 3 बातें जरूर जांचें", 66, GOLD + (255,))
d.line([(W / 2 - 170, 690), (W / 2 + 170, 690)], fill=GOLD + (170,), width=2)
y = 800
for item in ["हॉलमार्क", "सही वजन", "मेकिंग चार्ज"]:
    d.ellipse([W / 2 - 250, y + 26, W / 2 - 250 + 16, y + 42], fill=GOLD + (230,))
    d.text((W / 2 - 210, y), item, font=F(74), fill=IVORY + (255,), anchor="la")
    y += 150
centre(im, 1420, "जल्दी में खरीदारी न करें", 44, IVORY + (190,))
im.save(os.path.join(OUT, "checks-card.png"))

# ---------------- cta card
im = vignette(bg()); d = ImageDraw.Draw(im); corners(d)
centre(im, 560, "सही जानकारी के लिए", 58, IVORY + (235,))
centre(im, 646, "अभी कॉल करें", 58, IVORY + (235,))
centre(im, 800, "89050 05921", 108, GOLD + (255,))
d.line([(W / 2 - 260, 950), (W / 2 + 260, 950)], fill=GOLD + (170,), width=2)
centre(im, 1030, "मेन रोड, जायल", 56, IVORY + (235,))
centre(im, 1240, "Free bridal design trial खातर WhatsApp पर", 44, IVORY + (200,))
centre(im, 1306, "‘Bridal’ लिखो या अभी call करो।", 44, IVORY + (200,))
im.save(os.path.join(OUT, "cta-card.png"))

# ---------------- gold sweep band
sw = Image.new("RGBA", (420, 2400), (0, 0, 0, 0))
d = ImageDraw.Draw(sw)
for x in range(420):
    a = int(95 * (1 - abs(x - 210) / 210) ** 1.6)
    d.line([(x, 0), (x, 2400)], fill=(240, 214, 160, a))
sw = sw.rotate(18, expand=True, resample=Image.BICUBIC)
sw.save(os.path.join(OUT, "sweep.png"))

# ---------------- placeholder exterior
im = vignette(bg()); d = ImageDraw.Draw(im); corners(d, a=150)
centre(im, 820, "SHOP EXTERIOR PHOTO", 54, GOLD + (230,))
centre(im, 910, "यहाँ दुकान की फोटो लगेगी", 46, IVORY + (210,))
centre(im, 1010, "render_outro.sh  EXTERIOR=<photo>", 34, IVORY + (150,))
im.save(os.path.join(OUT, "placeholder-exterior.png"))
print("outro assets written to", OUT)
