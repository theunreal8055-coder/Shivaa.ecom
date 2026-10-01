#!/usr/bin/env python3
"""Render the reel caption strips as transparent PNGs (ffmpeg build here has no drawtext).

Each caption is a 1080-wide transparent strip: gold uppercase text on a soft dark pill,
ready to be overlaid on the 1080x1920 reel.
"""
import pathlib
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "captions"
OUT.mkdir(exist_ok=True)

BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
GOLD = (231, 199, 122, 255)

CAPTIONS = {
    "c1": "LIVE GOLD RATE  ·  EVERY SECOND",
    "c2": "LAKHS OF DESIGNS  ·  ONE ROOF",
    "c3": "NO WASTAGE  ·  NO KARIGAR HUNT",
    "c4": "WE BUY YOUR DEAD STOCK",
    "c5": "22K HALLMARK  ·  OPEN BILL",
    "c6": "SAVINGS  ·  100% GOLD-VALUE BUYBACK",
    "c7": "SAME-DAY INSURED DELIVERY",
}

W, H = 1080, 150


def strip(text: str, size: int = 42, font_path: str = BOLD, pill: bool = True) -> Image.Image:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, size)
    # shrink to fit
    while d.textlength(text, font=font) > W - 120 and size > 24:
        size -= 2
        font = ImageFont.truetype(font_path, size)
    tw = d.textlength(text, font=font)
    x, y = (W - tw) / 2, (H - size) / 2 - 4
    if pill:
        pad_x, pad_y = 34, 20
        d.rounded_rectangle(
            [x - pad_x, y - pad_y, x + tw + pad_x, y + size + pad_y],
            radius=(size + 2 * pad_y) // 2, fill=(0, 0, 0, 96),
        )
    d.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 190))   # shadow
    d.text((x, y), text, font=font, fill=GOLD)
    return img


def main() -> None:
    for key, text in CAPTIONS.items():
        strip(text).save(OUT / f"{key}.png")
    strip("shivaa.in", size=56, font_path=REG, pill=False).save(OUT / "url.png")
    print(f"wrote {len(CAPTIONS) + 1} caption strips to {OUT}")


if __name__ == "__main__":
    main()
