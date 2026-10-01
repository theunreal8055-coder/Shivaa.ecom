"""Reel frame v2 for the 90s explainer.

Improvements over v1:
  * no city line (brand only)
  * the bottom bar now carries a PER-CHAPTER caption that changes every 10s,
    so the vertical cut keeps moving even where the video window is letterboxed
  * tighter spacing, so the video window sits higher (thumb-friendly) and the
    lowest 12% stays clear of the app UI

Outputs:
  fix/vertical-frame-v2.png   static brand frame (logo, proof points, shivaa.in)
  fix/vcap-1..9.png           per-chapter caption strips
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]

W, H = 1080, 1920
VID_H = 608
TOP = 590                       # video window a little above centre

GOLD = (212, 175, 96, 255)
GOLD_SOFT = (198, 163, 92, 255)
CREAM = (245, 238, 225, 255)
DIM = (168, 158, 143, 255)

CAPTIONS = [
    "TRUST AND PRICE — BOTH SOLVED",
    "2,00,000+ DESIGNS  ·  ONE SCREEN",
    "NO SUPPLIER HUNT  ·  ZERO WASTAGE",
    "WE BUY YOUR DEAD STOCK",
    "BULLION  ·  INVESTMENT  ·  LEDGER",
    "LIVE RATE  ·  RATE LOCK  ·  OPEN BILL",
    "22K HALLMARK  ·  HUID  ·  100% BUYBACK",
    "SAVE  ·  BESPOKE  ·  SAME-DAY DELIVERY",
    "EVERYTHING GOLD, ONE PLACE",
]


def f(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def centre(d: ImageDraw.ImageDraw, txt: str, y: int, font, fill) -> None:
    w = d.textbbox((0, 0), txt, font=font)[2]
    d.text(((W - w) // 2, y), txt, font=font, fill=fill)


def build_frame() -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    d.rectangle([0, 0, W, TOP - 4], fill=(10, 10, 13, 255))
    d.rectangle([0, TOP + VID_H + 4, W, H], fill=(10, 10, 13, 255))
    d.rectangle([0, TOP - 4, W, TOP - 1], fill=GOLD_SOFT)
    d.rectangle([0, TOP + VID_H + 1, W, TOP + VID_H + 4], fill=GOLD_SOFT)

    logo = Image.open(ROOT / "Shivaa.ecom/launch/omni-90s/assets/logo-shivaa-gold.png") \
        if (ROOT / "Shivaa.ecom").exists() else \
        Image.open(HERE.parent / "assets/logo-shivaa-gold.png")
    logo = logo.convert("RGBA")
    lw = 660
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    img.alpha_composite(logo, ((W - lw) // 2, TOP - 70 - logo.height))

    centre(d, "GOLD, MADE SIMPLE", 150, f(48), CREAM)
    centre(d, "FOR JEWELLERS  ·  FOR CUSTOMERS", 220, f(30, False), GOLD_SOFT)

    by = TOP + VID_H + 210          # below the per-chapter caption slot
    centre(d, "CUSTOM ORDERS  ·  DEAD STOCK BUY-BACK  ·  BULLION DESK", by, f(26, False), DIM)
    centre(d, "shivaa.in", by + 90, f(68), GOLD)

    img.save(HERE / "vertical-frame-v2.png")
    print("frame:", img.size, "| video window y =", TOP)


def build_captions() -> None:
    for i, text in enumerate(CAPTIONS, start=1):
        strip = Image.new("RGBA", (W, 120), (0, 0, 0, 0))
        d = ImageDraw.Draw(strip)
        size = 34
        font = f(size)
        while d.textlength(text, font=font) > W - 120 and size > 22:
            size -= 2
            font = f(size)
        tw = d.textlength(text, font=font)
        x, y = (W - tw) / 2, (120 - size) / 2 - 4
        d.rounded_rectangle([x - 30, y - 16, x + tw + 30, y + size + 16],
                            radius=(size + 32) // 2, fill=(255, 255, 255, 16),
                            outline=GOLD_SOFT, width=2)
        d.text((x, y), text, font=font, fill=CREAM)
        strip.save(HERE / f"vcap-{i}.png")
    print("captions:", len(CAPTIONS))


if __name__ == "__main__":
    build_frame()
    build_captions()
