#!/usr/bin/env python3
"""Turn the owner's logo screenshot into clean transparent PNGs.

Input : the phone screenshot of the Shivaa Inc. wordmark (white background, navy art)
Output: logo-shivaa-navy.png  (original colour, transparent background, trimmed)
        logo-shivaa-gold.png  (gold recolour for dark end plates / watermark)
        logo-shivaa-white.png (white recolour for busy footage)

    python3 launch/omni-90s/tools/clean_logo.py <screenshot.jpg>
"""
import sys
import pathlib
from PIL import Image

OUT = pathlib.Path(__file__).resolve().parents[1] / "assets"
OUT.mkdir(parents=True, exist_ok=True)

GOLD = (212, 175, 90)
WHITE = (255, 255, 255)


def main(src: str) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size

    # 1) drop the phone status/nav bars AND the document's own border rules,
    #    keeping only the wordmark block in the middle of the page
    im = im.crop((int(w * 0.17), int(h * 0.22), int(w * 0.84), int(h * 0.80)))
    px = im.load()
    w, h = im.size

    # 2) alpha from darkness: white paper -> transparent, navy ink -> opaque
    rgba = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            lum = (r * 299 + g * 587 + b * 114) / 1000
            a = 0 if lum > 235 else int(min(255, (235 - lum) * 1.9))
            if a:
                out[x, y] = (r, g, b, a)

    # 3) trim to the ink bounding box with a small margin
    bbox = rgba.getbbox()
    if bbox:
        pad = 24
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        rgba = rgba.crop(bbox)

    # 4) normalise width to 1600px
    tw = 1600
    rgba = rgba.resize((tw, round(rgba.height * tw / rgba.width)), Image.LANCZOS)
    rgba.save(OUT / "logo-shivaa-navy.png")

    for name, colour in (("gold", GOLD), ("white", WHITE)):
        tint = Image.new("RGBA", rgba.size, colour + (0,))
        tint.putalpha(rgba.getchannel("A"))
        tint.save(OUT / f"logo-shivaa-{name}.png")

    print("wrote:", *(p.name for p in sorted(OUT.glob("logo-shivaa-*.png"))),
          "| size:", rgba.size)


if __name__ == "__main__":
    main(sys.argv[1])
