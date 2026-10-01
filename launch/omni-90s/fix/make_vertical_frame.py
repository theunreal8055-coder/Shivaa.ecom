"""Builds the 1080x1920 brand frame (top logo + bottom bar) that dresses the
16:9 explainer for Reels / Shorts / WhatsApp Status."""
from PIL import Image, ImageDraw, ImageFont
W, H = 1080, 1920
VID_H = 608                      # 1080x608 = the 16:9 master, centred
TOP = (H - VID_H) // 2           # 656
f = lambda s, b=True: ImageFont.truetype(
    "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if b else ""), s)

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# top + bottom brand plates (opaque, so the blurred backdrop never shows text ghosts)
d.rectangle([0, 0, W, TOP - 4], fill=(10, 10, 13, 255))
d.rectangle([0, TOP + VID_H + 4, W, H], fill=(10, 10, 13, 255))
# gold hairlines framing the video window
d.rectangle([0, TOP - 4, W, TOP - 1], fill=(198, 163, 92, 255))
d.rectangle([0, TOP + VID_H + 1, W, TOP + VID_H + 4], fill=(198, 163, 92, 255))

logo = Image.open("launch/omni-90s/assets/logo-shivaa-gold.png").convert("RGBA")
lw = 620; logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
img.alpha_composite(logo, ((W - lw) // 2, TOP - 60 - logo.height))

def centre(txt, y, font, fill):
    w = d.textbbox((0, 0), txt, font=font)[2]
    d.text(((W - w) // 2, y), txt, font=font, fill=fill)

centre("GOLD, MADE SIMPLE", 172, f(46), (245, 238, 225, 255))
centre("FOR JEWELLERS  ·  FOR CUSTOMERS", 242, f(30, False), (198, 163, 92, 255))

by = TOP + VID_H + 90
centre("2,00,000+ DESIGNS  ·  22K HALLMARK  ·  100% BUYBACK", by, f(28), (232, 225, 212, 255))
centre("CUSTOM ORDERS  ·  DEAD STOCK BUY-BACK  ·  BULLION DESK", by + 52, f(26, False), (170, 160, 145, 255))
centre("shivaa.in", by + 160, f(64), (212, 175, 96, 255))
centre("SHIVAA INC.  ·  JAIPUR", by + 250, f(24, False), (150, 142, 130, 255))

img.save("launch/omni-90s/fix/vertical-frame.png")
print("wrote", img.size, "video window y =", TOP)
