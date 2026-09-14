#!/usr/bin/env python3
"""Shivaa MEGA build — package cms/ as shivaa-mega-v45.zip

Layout: site files at the ZIP ROOT (no cms/ prefix), so extracting inside
public_html places index.html, api.php, css/, js/, images/ … directly where
they belong.

* .mp4 / .pdf → stored (already compressed)
* everything else → deflate
"""
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / "cms"
OUT = ROOT / "shivaa-mega-v45.zip"

STORE_EXT = {".mp4", ".pdf", ".rar", ".zip"}
SKIP_DIRS = {"__pycache__"}

README = """╔══════════════════════════════════════════════════════════════════╗
║   SHIVAA — HONEST JEWELLERY · v45-MEGA (2030 EDITION)             ║
╚══════════════════════════════════════════════════════════════════╝

WHAT'S INSIDE
  The complete shivaa.in store — PHP 8 API, JSON data store, SPA UI,
  all real product media, plus the v45-MEGA enhancement layer:

  · Page-hero banners on every page (rates, buyback, savings, services,
    catalogues, b2b, about, contact, hallmark, trust, metal, track…)
  · Cinematic hero film + craft films (real pieces, hover-to-play)
  · ShivAI concierge  — ask prices, find pieces, get answers
  · Voice search     — speak a design, land on it
  · Try-On Mirror    — camera overlay fitting room (#/tryon)
  · 3D ring showcase · live market-pulse chart · recently viewed
  · Light / Noir / Gold themes · add-to-cart confetti · 3D card tilt
  · Scroll reveals, gold marquees, flash-sale countdown, lookbook
  · PWA (installable, offline core) · sitemap.xml · robots.txt
  · Graphics pack: media/ultra (4K banners) + media/walls (2.5K) +
    media/walls2 (2K wallpaper bank of every real shot — 373 images)

INSTALL
  1. Upload shivaa-mega-v45.zip into public_html/ and extract it there,
     or extract locally and upload the contents to public_html/.
     The site files sit at the ZIP ROOT — no extra folder to move.
  2. Done. The store is fully static-ready and self-contained:
     no build step, no composer, no database server needed.

REQUIREMENTS
  · PHP 8+ for api.php (order/auth/upload endpoints). For browsing,
    products, rates, wishlist & compare the SPA also works on static
    hosting via data/db.json fallback logic already inside app.js.
  · Browsers: any modern Chrome / Safari / Firefox / Edge.
    (Camera try-on & voice search need camera/mic permission and
    a secure origin — https:// — as with any site using them.)

LOGIN (demo data)
  Admin demo login: admin@shivaa.in   (see data/db.json users)

BUILT FROM
  Shivaa.ecom branch arena/01a09dc4-shivaa-ecom — v45-mega release.
  Rebuild the media/zip anytime:  python3 tools/mega/make_films.py
  && python3 tools/mega/make_ultra.py --walls2  && make_zip.py
"""


def main():
    skip_parts = {"uploads/videos/", "uploads/designs/"}
    files = [p for p in sorted(CMS.rglob("*"))
             if p.is_file() and not any(sp in str(p.relative_to(CMS).as_posix()) for sp in skip_parts)]
    total_src = sum(p.stat().st_size for p in files)
    print(f"packing {len(files)} files ({total_src/1048576:.1f} MB)…")

    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        z.writestr("README-MEGA.txt", README)
        z.writestr("INSTALL.txt",
                   "SHIVAA v45-MEGA — 60-second install\n"
                   "1) Upload this zip into public_html/\n"
                   "2) Extract it there (files are at the zip root)\n"
                   "3) Open your domain — done.\n\n"
                   "PHP 8+ enables api.php (login/orders/otp). Static hosting "
                   "serves browsing, pricing & media out of the box.\n")
        for p in files:
            arc = str(p.relative_to(CMS))
            if p.suffix.lower() in STORE_EXT:
                z.write(p, arc, compress_type=zipfile.ZIP_STORED)
            else:
                z.write(p, arc, compress_type=zipfile.ZIP_DEFLATED)
    print(f"DONE: {OUT.name} = {OUT.stat().st_size/1048576:.1f} MB")


if __name__ == "__main__":
    main()
