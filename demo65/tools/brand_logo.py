#!/usr/bin/env python3
"""Shivaa logo branding helpers.

* make_logo(color) -> RGBA logo art (white or navy) with transparent background,
  derived from cms/images/logo.png (dark art on white).
* stamp(image) -> same image with the logo composited bottom-right; the light or
  dark variant is chosen automatically from the brightness of that corner.
* CLI: stamp every shot in demo65/media/PGS*/shot_*.jpg, idempotently
  (a ledger in work/branded.json records what has already been stamped).

Run:  python3 tools/brand_logo.py            # stamp all unstamped shots
      python3 tools/brand_logo.py --only PGS5001,PGS5002
"""
from __future__ import annotations
import argparse, json, hashlib
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]          # demo65/
LOGO_SRC = ROOT.parent / "cms" / "images" / "logo.png"
LEDGER = ROOT / "work" / "branded.json"

MARGIN_PCT = 0.035        # margin from the edges, share of image width
WIDTH_PCT = 0.26          # logo width, share of image width
OPACITY = 0.82


def _logo_rgba() -> Image.Image:
    """Dark logo art on white -> alpha mask; returns black art with alpha."""
    src = Image.open(LOGO_SRC).convert("RGBA")
    # Where the source already has transparency, respect it; otherwise derive
    # alpha from darkness (the art is near-black on a white sheet).
    lum = src.convert("L")
    alpha_from_dark = lum.point(lambda p: 255 - p)
    src_alpha = src.getchannel("A")
    alpha = Image.new("L", src.size)
    alpha.paste(alpha_from_dark, (0, 0), None)
    if src_alpha.getextrema()[0] < 255:            # real transparency present
        alpha = Image.composite(alpha, Image.new("L", src.size, 0), src_alpha)
    art = Image.new("RGBA", src.size, (0, 0, 0, 0))
    art.putalpha(alpha)
    return art.crop(alpha.getbbox() or art.getbbox())


_CACHE: dict[str, Image.Image] = {}


def make_logo(color: str = "white") -> Image.Image:
    """Logo artwork in `white` or `navy`, transparent background."""
    if color not in _CACHE:
        art = _logo_rgba()
        rgb = (255, 255, 255) if color == "white" else (26, 32, 51)
        solid = Image.new("RGBA", art.size, rgb + (0,))
        solid.putalpha(art.getchannel("A"))
        _CACHE[color] = solid
    return _CACHE[color].copy()


def _corner_is_dark(img: Image.Image, box) -> bool:
    x0, y0, x1, y1 = box
    crop = img.convert("L").crop((max(0, x0), max(0, y0), x1, y1))
    return sum(crop.getdata()) / max(1, len(crop.getdata())) < 130


def stamp(img: Image.Image, width_pct: float = WIDTH_PCT) -> Image.Image:
    """Composite the logo into the bottom-right corner of `img` (RGB in/out)."""
    base = img.convert("RGBA")
    W, H = base.size
    lw = max(60, int(W * width_pct))
    proto = make_logo("white")
    lh = max(1, round(proto.height * lw / proto.width))
    m = int(W * MARGIN_PCT)
    x, y = W - lw - m, H - lh - m
    color = "white" if _corner_is_dark(base, (x, y, x + lw, y + lh)) else "navy"
    logo = make_logo(color).resize((lw, lh), Image.LANCZOS)
    a = logo.getchannel("A").point(lambda p: int(p * OPACITY))
    logo.putalpha(a)
    if color == "white":                            # soft shadow so it reads on light-ish darks
        shadow = Image.new("RGBA", logo.size, (0, 0, 0, 0))
        shadow.putalpha(a.point(lambda p: int(p * 0.45)))
        base.alpha_composite(shadow, (x + 2, y + 2))
    base.alpha_composite(logo, (x, y))
    return base.convert("RGB")


def original_of(path: Path) -> Path:
    """Where the unbranded master of a shot is kept (media/{SKU}/.orig/…)."""
    return path.parent / ".orig" / path.name


def stamp_file(path: Path) -> None:
    """Stamp a shot in place, preserving an unbranded master in .orig/."""
    orig = original_of(path)
    if not orig.exists():
        orig.parent.mkdir(parents=True, exist_ok=True)
        orig.write_bytes(path.read_bytes())
    im = Image.open(orig).convert("RGB")
    stamp(im).save(path, "JPEG", quality=92, subsampling=1)


def video_logo_png(width: int, height: int, out: Path,
                   width_pct: float = 0.24) -> Path:
    """RGBA overlay the size of the video: logo bottom-right on a soft dark plate."""
    from PIL import ImageDraw, ImageFilter
    proto = make_logo("white")
    lw = max(60, int(width * width_pct))
    lh = max(1, round(proto.height * lw / proto.width))
    m = int(width * MARGIN_PCT)
    x, y = width - lw - m, height - lh - m
    layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pad = int(lh * 0.55)
    plate = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ImageDraw.Draw(plate).rounded_rectangle(
        (x - pad, y - pad, x + lw + pad, y + lh + pad),
        radius=int(lh * 0.5), fill=(12, 16, 26, 105))
    layer.alpha_composite(plate.filter(ImageFilter.GaussianBlur(6)))
    logo = make_logo("white").resize((lw, lh), Image.LANCZOS)
    logo.putalpha(logo.getchannel("A").point(lambda p: int(p * 0.92)))
    layer.alpha_composite(logo, (x, y))
    out.parent.mkdir(parents=True, exist_ok=True)
    layer.save(out)
    return out


def _load_ledger() -> dict:
    if LEDGER.exists():
        try:
            return json.loads(LEDGER.read_text())
        except Exception:
            pass
    return {}


def _key(p: Path) -> str:
    return str(p.relative_to(ROOT))


def _sig(p: Path) -> str:
    h = hashlib.md5()
    h.update(p.read_bytes())
    return h.hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma-separated SKUs")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    skus = [s.strip() for s in a.only.split(",") if s.strip()]
    led = {} if a.force else _load_ledger()
    media = ROOT / "media"
    todo = []
    for d in sorted(media.glob("PGS*")):
        if skus and d.name not in skus:
            continue
        for shot in sorted(d.glob("shot_*.jpg")):
            if not a.force and led.get(_key(shot)) == _sig(shot):
                continue
            todo.append(shot)
    for shot in todo:
        stamp_file(shot)
        led[_key(shot)] = _sig(shot)
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    LEDGER.write_text(json.dumps(led, indent=1, sort_keys=True))
    print(f"branded {len(todo)} shot(s); ledger has {len(led)} entries")


if __name__ == "__main__":
    main()
