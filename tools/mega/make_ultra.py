#!/usr/bin/env python3
"""Shivaa MEGA build — hi-res graphics pack (media/ultra + media/walls).

* media/ultra/{name}-4k.jpg   — every banner upscaled to 3840px, Q88
* media/walls/PGSxxxx-2560.jpg— the 65 real PGS ring mains at 2560px, Q86

These are bonus gallery-quality assets for marketing, posters and the
wallpaper bank. Idempotent; sizes tuned so the final ZIP lands ≈300 MB.
"""
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / "cms"
BAN = CMS / "images" / "banners"
RINGS = CMS / "images" / "designs" / "rings"
ULTRA = CMS / "media" / "ultra"
WALLS = CMS / "media" / "walls"
ULTRA.mkdir(parents=True, exist_ok=True)
WALLS.mkdir(parents=True, exist_ok=True)


def upscale(src: Path, dest: Path, width: int, quality: int) -> int:
    if dest.exists() and dest.stat().st_size > 100_000:
        return 0
    im = Image.open(src).convert("RGB")
    if im.width < width:
        h = round(im.height * width / im.width)
        im = im.resize((width, h), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(1.4, 90, 3))
    im.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    return dest.stat().st_size


def job_banner(args):
    src, = args
    upscale(src, ULTRA / f"{src.stem}-4k.jpg", 3840, 88)


def job_wall(args):
    src, = args
    upscale(src, WALLS / f"{src.stem}-2560.jpg", 2560, 86)


def main():
    banners = sorted(BAN.glob("*.jpg"))
    pgs = sorted(RINGS.glob("PGS[0-9][0-9][0-9][0-9].jpg"))
    pgs = [p for p in pgs if "_" not in p.stem]           # main shots only
    print(f"{len(banners)} banners → 4K, {len(pgs)} PGS mains → 2560px")
    with ThreadPoolExecutor(max_workers=2) as ex:
        list(ex.map(job_banner, [[b] for b in banners]))
        list(ex.map(job_wall, [[p] for p in pgs]))
    du = lambda d: sum(f.stat().st_size for f in d.glob("*"))
    print(f"ultra: {du(ULTRA)/1048576:.1f} MB ({len(list(ULTRA.glob('*')))} files)")
    print(f"walls: {du(WALLS)/1048576:.1f} MB ({len(list(WALLS.glob('*')))} files)")


if __name__ == "__main__":
    main()

# ── extended run: full 2K wallpaper bank of every real PGS shot ──
def make_walls2():
    walls2 = CMS / "media" / "walls2"
    walls2.mkdir(parents=True, exist_ok=True)
    shots = sorted(p for p in RINGS.glob("PGS*.jpg") if "_" in p.stem)
    print(f"walls2: {len(shots)} variant shots → 2048px")
    with ThreadPoolExecutor(max_workers=2) as ex:
        list(ex.map(lambda s: upscale(s, walls2 / f"{s.stem}-2048.jpg", 2048, 84), shots))
    du = sum(f.stat().st_size for f in walls2.glob("*"))
    print(f"walls2: {du/1048576:.1f} MB ({len(list(walls2.glob('*')))} files)")


if __name__ == "__main__" and "--walls2" in sys.argv:
    main()
    make_walls2()
