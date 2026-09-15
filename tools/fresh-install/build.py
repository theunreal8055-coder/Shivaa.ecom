#!/usr/bin/env python3
"""SHIVAA fresh-install — build the v115 installable bundles.

  python3 tools/fresh-install/build.py                # core + media pack
  python3 tools/fresh-install/build.py --tier core    # just the storefront
  python3 tools/fresh-install/build.py --tier all     # one fat zip (workspace only)
  python3 tools/fresh-install/build.py --no-media-dir  # strip images/ too (code-only rescue)

WHAT A FRESH INSTALL MEANS HERE
  Extract `shivaa-FRESH-INSTALL-v115.zip` into an empty document root, open
  https://your-domain/install.php, type the owner's email + password, done:
  the store is live with the real 65-design catalogue, the store config, the
  making-charge table, coupons and the B2B catalogue entries — and zero
  customers, orders, reviews or partner balances (see data/db.seed.json).

  This is not an UPDATE bundle. It carries no live `data/db.json` (a fresh host
  must not inherit another host's customers) and it never needs a previous
  version installed: everything v1 → v115 built is either in these files or is
  listed, with its reason, in the lineage doc inside the zip.

LAYOUT  site files at the ZIP ROOT (the v45-MEGA / v113b convention), so
  extracting inside public_html puts index.html, api.php, .htaccess, css/, js/,
  images/, data/, uploads/ exactly where they belong — no folder to move up.

STORED vs DEFLATED  .mp4/.pdf/.jpg/.png/.webp are already compressed: stored
  (zip -0) so packing 200 MB of media does not burn CPU for 2 %.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_pack import (CMS, EXCLUDE_FROM_BUNDLE, ROOT, SEED_REL, TIER_NAMES,  # noqa: E402
                      is_dead, rel_of, size_of, tier_files, tier_of)

DIST = ROOT / "dist"
STORE_EXT = {".mp4", ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".zip", ".rar", ".woff2", ".ico"}

CORE_ZIP = "shivaa-FRESH-INSTALL-v115.zip"
MEDIA_ZIP = "shivaa-FRESH-MEDIA-v115.zip"
ALL_ZIP = "shivaa-FRESH-v115-full.zip"

DOC_ROOT = ROOT / "FRESH-INSTALL-v115.md"
DOC_LINEAGE = ROOT / "docs/VERSION-LINEAGE-v1-v115.md"


def sha1(b: bytes) -> str:
    return hashlib.sha1(b).hexdigest()[:16]


def gen_install_open() -> bytes:
    """The installer's door flag. Present in the bundle → install.php may run;
    install.php deletes it on success. Randomised per build so a leaked copy of
    a bundle cannot be replayed against a host that kept the file around."""
    import secrets
    return ("v115-FI first-run flag · " + secrets.token_hex(12) + "\n"
            "Written by tools/fresh-install/build.py. install.php removes this file\n"
            "the moment an install succeeds, and .htaccess then 403s install.php too.\n").encode()


def readme(tier: str) -> bytes:
    if tier == "media":
        txt = """SHIVAA · v115-FI MEDIA PACK
═══════════════════════════
Everything heavy, so the core bundle stays small enough to move.

  images/designs/rings/PGSxxxx_shot_*.jpg   4 shots × 65 rings (studio · worn · editorial · gift)
  images/designs/rings/PGSxxxx_video.mp4    the 65 ring films
  images/films/*.mp4                        hero + craft films (73 MB of the pack)
  images/reviews/*.jpg                      review photos
  uploads/**                                catalogue PDFs + exemplar uploads
  cms docs shipped inside the store folder

INSTALL — extract INSIDE public_html, next to the files the core bundle already
put there. Same zip-root layout, so nothing needs moving. Nothing in data/ is
touched: your database cannot be overwritten by a media pack.

WHY IT IS SEPARATE — GitHub refuses any file over 100 MB, and a store can be
browsed, priced and ordered without the films: the service worker already shows
a poster frame when a film is absent, and a missing photo falls back to the
house monogram (asserted by tools/mega/smoke/v113b-check.js, check #7).
"""
    else:
        txt = """SHIVAA · v115-FI FRESH INSTALL
══════════════════════════════
The complete store: every release from v1 to v115, in one extraction. No
previous version has to exist, no build step, no composer, no database server.

  1  Upload this zip into public_html (or any empty document root).
  2  Extract it there. Files sit at the zip root — index.html, api.php,
     .htaccess, css/, js/, images/, data/, uploads/.
  3  Open  https://your-domain/install.php
     It checks the host, seeds data/db.json from data/db.seed.json, creates your
     admin account (bcrypt, the scheme api.php reads), fixes the writable
     folders, writes data/.htaccess, then LOCKS ITSELF OUT.
  4  Sign in at  #/admin  ·  delete install.php from the server.
  5  Admin → Settings: PayU key + salt, UPI ID, the SMS gateway wizard (v107).
     Until those are filled the site is honest about it: UPI + COD only, OTP by
     email with a line saying so.

REQUIREMENTS   PHP 8.0+ with json + mbstring (curl only for live rates and PayU
               status checks). Apache/LiteSpeed with AllowOverride On for the
               rewrites; for nginx copy the rules from .htaccess into a location
               block. Written for Hostinger shared hosting, tested at 64 MB PHP.

WHAT IS SEEDED 65 real PGS ring designs (4 photos + live-rate pricing each),
               15 making-charge rules, 4 coupons, 17 B2B catalogue entries, the
               store identity (GSTIN/CIN/UDYAM/address) and the Jaipur premium.
               Zero customers, orders, reviews, partner balances or messages.

WHAT IS NOT    the 260 gallery shots, the 65 ring films and the catalogue PDFs —
               they are in shivaa-FRESH-MEDIA-v115.zip. The store works without
               them; it looks complete with them.

ROLLBACK       delete data/db.json + data/INSTALL.lock and the folder is an
               uninstalled bundle again. Nothing outside the root is touched.
"""
    return txt.encode()


def manifest(tier: str, rels: list[str]) -> bytes:
    lines = [f"SHIVAA v115-FI · {tier} bundle manifest",
             f"built {dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30))).isoformat(timespec='seconds')} IST",
             f"from git {git_rev()} · {len(rels)} files · {size_of(rels) / 1048576:.1f} MB unpacked",
             "", "sha1              bytes  path"]
    for r in rels:
        p = CMS / r
        lines.append(f"{sha1(p.read_bytes()):16s} {p.stat().st_size:9d}  {r}")
    return ("\n".join(lines) + "\n").encode()


def git_rev() -> str:
    try:
        import subprocess
        return subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"],
                              capture_output=True, text=True, timeout=10).stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def build(tier: str, out: Path, no_media_dir: bool = False) -> Path:
    rels = tier_files(tier)
    if no_media_dir:
        rels = [r for r in rels if not r.startswith(("images/", "uploads/"))]
    # the seed + the door flag ride in the core and in the all bundle only
    extra: dict[str, bytes] = {}
    if tier in ("core", "all"):
        extra["data/install-open"] = gen_install_open()
    name = {"core": CORE_ZIP, "media": MEDIA_ZIP, "all": ALL_ZIP}[tier]
    out.mkdir(parents=True, exist_ok=True)
    zp = out / name

    # guard: the live database must never ride into a fresh-install bundle
    for r in rels:
        if r in EXCLUDE_FROM_BUNDLE:
            raise SystemExit(f"refusing to pack {r} — a fresh install ships the seed, not a host's data")

    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        z.writestr("INSTALL.txt", readme(tier))
        z.writestr("MANIFEST.txt", manifest(tier, rels))
        for arc, blob in extra.items():
            z.writestr(arc, blob)
        if tier in ("core", "all"):
            if DOC_ROOT.exists():
                z.writestr("FRESH-INSTALL-v115.md", DOC_ROOT.read_bytes())
            if DOC_LINEAGE.exists():
                z.writestr("VERSION-LINEAGE-v1-v115.md", DOC_LINEAGE.read_bytes())
        for r in rels:
            p = CMS / r
            z.write(p, r, compress_type=zipfile.ZIP_STORED if p.suffix.lower() in STORE_EXT else zipfile.ZIP_DEFLATED)
    return zp


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tier", default="core+media", help="core | media | all | core+media")
    ap.add_argument("--out", default=str(DIST))
    ap.add_argument("--no-media-dir", action="store_true", help="code-only rescue bundle (no images/ or uploads/)")
    a = ap.parse_args()
    out = Path(a.out)
    tiers = TIER_NAMES if a.tier == "core+media" else [x for x in re.split(r"[+, ]", a.tier) if x]
    made = []
    for t in tiers:
        zp = build(t, out, a.no_media_dir)
        made.append(zp)
        n = len(zipfile.ZipFile(zp).namelist())
        print(f"{zp.name:36s} {zp.stat().st_size / 1048576:8.1f} MB · {n:4d} entries")
    sums = out / "SHA256SUMS.txt"
    lines = [f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}" for p in made]
    sums.write_text("\n".join(lines) + "\n")
    print(f"{'SHA256SUMS.txt':36s} {len(made)} checksum(s) → {sums.relative_to(ROOT)}")
    print("\nnext: python3 tools/fresh-install/verify.py   (unpacks, runs every gate)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
