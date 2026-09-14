#!/usr/bin/env python3
"""Shivaa MEGA build v2 — cinematic films from REAL site media only.

hero.mp4           1920×1080 — real banners (2030 hero, bridal, main, wedding)
rings-studio.mp4   1080×1080 — real PGS studio shots (crossfade series)
rings-worn.mp4     1080×1080 — real PGS worn-on-hand shots
rings-editorial.mp4 1080×1080 — real PGS editorial shots
bridal.mp4         1080×1080 — bridal banners (square crop)

Idempotent: skips films whose source set hasn't changed.
"""
import json
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / "cms"
BAN = CMS / "images" / "banners"
RINGS = CMS / "images" / "designs" / "rings"
OUT = CMS / "images" / "films"
OUT.mkdir(parents=True, exist_ok=True)


def run(args: list[str]) -> None:
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print("  ffmpeg error:", r.stderr[-700:], file=sys.stderr)


def zoompan(idx: int, d: int, size: str, zin: float, zout: float) -> str:
    big = 1920 if size.startswith("1920") else 1620
    return (f"[{idx}:v]scale={big}:{big}:force_original_aspect_ratio=increase,"
            f"crop={big}:{big},"
            f"zoompan=z='min({zin}+({zout}-{zin})*on/{d},{max(zin, zout)})':"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={d}:s={size}:fps=25")


def series(name: str, shots: list[Path], size: str, dur: float = 3.4,
           crf: int = 26, fade: float = 0.9) -> None:
    shots = [s for s in shots if s.exists()]
    if len(shots) < 2:
        print(f"  skip {name}: needs ≥2 sources, found {len(shots)}")
        return
    dest = OUT / f"{name}.mp4"
    newest = max(s.stat().st_mtime for s in shots)
    if dest.exists() and dest.stat().st_mtime >= newest:
        return
    d = int(dur * 25)
    inputs: list[str] = []
    for s in shots:
        inputs += ["-loop", "1", "-t", str(dur + fade), "-i", str(s)]
    zs, fcs = [], []
    for i in range(len(shots)):
        zin = 1.0 + 0.035 * i
        zs.append(zoompan(i, d + int(fade * 25), size, zin, zin + 0.16))
    chain = zs[0] + "[v0]"
    for i in range(1, len(shots)):
        off = round((dur - fade) * i + 0.05, 2)
        chain += (f";{zs[i]}[v{i}];"
                  f"[v{i-1}][v{i}]xfade=transition=fade:duration={fade}:offset={off}[v{i}]")
    chain += f";[v{len(shots)-1}]format=yuv420p[v]"
    run([*inputs, "-filter_complex", chain, "-map", "[v]",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf),
         "-movflags", "+faststart", str(dest)])
    print(f"  {name}: {dest.stat().st_size // 1024} KB ({len(shots)} shots)")


def main():
    hero_shots = [BAN / f for f in ("gen-hero-2030.jpg", "poster-bridal.jpg",
                                    "hero-main.jpg", "wedding.jpg")]
    series("hero", hero_shots, "1920x1080", dur=4.2, crf=24, fade=1.1)

    pgs = sorted(RINGS.glob("PGS*.jpg"))
    studio = [p for p in pgs if "shot_studio" in p.name][:6]
    worn = [p for p in pgs if "shot_worn" in p.name][:6]
    edit = [p for p in pgs if "shot_editorial" in p.name][:6]
    series("rings-studio", studio, "1080x1080")
    series("rings-worn", worn, "1080x1080")
    series("rings-editorial", edit, "1080x1080")

    bridal = [BAN / f for f in ("poster-bridal.jpg", "poster-heritage.jpg",
                                "wedding.jpg")]
    series("bridal", bridal, "1080x1080")

    # ── v108 cinematic background films (page heroes, carousel, CTA) ──
    bg_films = {
        "gold-flow": ["gen-hero-2030.jpg", "gen-page-rates.jpg", "hero-main.jpg"],
        "heritage": ["poster-heritage.jpg", "gen-page-about.jpg", "gen-page-hallmark.jpg"],
        "bridal-lux": ["poster-bridal.jpg", "gen-page-savings.jpg", "wedding.jpg"],
        "b2b-dark": ["gen-page-b2b.jpg", "gen-page-buyback.jpg", "gen-page-contact.jpg"],
    }
    for name, files in bg_films.items():
        shots = [BAN / f for f in files]
        series(name, shots, "1920x1080", dur=4.8, crf=30, fade=1.0)

    data = {
        "films": [
            ["rings-studio", "The Ring Atelier — Studio", "real pieces · studio light"],
            ["rings-worn", "Worn on You", "real hands · real shine"],
            ["rings-editorial", "The Editorial Film", "the catalogue look"],
            ["bridal", "The Bridal Film", "trousseau in motion"],
            ["gold-flow", "The Gold Room — Motion", "live gold · flowing light"],
            ["heritage", "Heritage Reel", "the house · the craft"],
            ["bridal-lux", "Bridal Cinema", "the trousseau in light"],
            ["b2b-dark", "The Bullion Desk", "partners · stock · settlement"],
        ],
        "pageVideos": {
            "rates": "gold-flow", "metal": "gold-flow",
            "about": "heritage", "services": "heritage", "hallmark": "heritage", "trust": "heritage",
            "savings": "bridal-lux", "catalogues": "bridal-lux",
            "b2b": "b2b-dark", "partner": "b2b-dark", "buyback": "b2b-dark",
            "contact": "b2b-dark", "deadstock": "b2b-dark", "track": "b2b-dark",
        },
        "carousel": {
            "s-left": "heritage", "s-center": "bridal-lux",
            "s-right": "rings-worn", "s-band": "gold-flow",
        },
        "lookbook": [
            ["/images/designs/rings/PGS5001_shot_editorial.jpg", "Rings", "The PGS Edit"],
            ["/images/designs/rings/PGS5002_shot_worn.jpg", "Rings", "Worn Today"],
            ["/images/banners/poster-bridal.jpg", "Bridal", "The Complete Trousseau"],
            ["/images/designs/rings/PGS5003_shot_studio.jpg", "Rings", "Studio Light"],
            ["/images/banners/poster-heritage.jpg", "Karigari", "Hands of the House"],
            ["/images/designs/rings/PGS5004_shot_gift.jpg", "Rings", "Gift Ready"],
            ["/images/banners/gen-hero-2030.jpg", "2026 Edit", "Modern Classic"],
            ["/images/designs/rings/PGS5005_shot_editorial.jpg", "Rings", "Editorial"],
            ["/images/banners/poster-heritage.jpg", "Heritage", "Since the Family"],
            ["/images/banners/wedding.jpg", "Wedding 2026", "Book the Bridal Desk"],
        ],
        "insta": [
            "/images/designs/rings/PGS5001_shot_studio.jpg",
            "/images/designs/rings/PGS5002_shot_worn.jpg",
            "/images/banners/gen-hero-2030.jpg",
            "/images/designs/rings/PGS5003_shot_editorial.jpg",
            "/images/banners/poster-bridal.jpg",
            "/images/designs/rings/PGS5004_shot_gift.jpg",
        ],
    }
    (CMS / "js" / "boost-data.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print("boost-data.json written")


if __name__ == "__main__":
    main()
