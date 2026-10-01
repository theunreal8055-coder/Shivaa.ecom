#!/usr/bin/env python3
"""Build the cumulative root-layout v186 overlay for authorized staging only.

This is an allowlist package, not a full site backup. It intentionally
excludes customer data, credentials/configuration, uploads, campaign artwork,
and test tooling. Source stamps and the campaign guard are verified before
an archive is written.
"""
from __future__ import annotations

import hashlib
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "shivaa-update-v186.zip"
RUNTIME = [
    "api.php",
    "index.html",
    "js/app.js",
    "js/admin.js",
    "sw.js",
    "css/v183.css",
    "css/v186.css",
]
BANNERS = [
    "hero-main.webp",
    "hero-main-mobile.jpg",
    "hero-main-mobile.webp",
    "poster-heritage.webp",
    "poster-heritage-mobile.jpg",
    "poster-heritage-mobile.webp",
    "poster-bridal.webp",
    "poster-bridal-mobile.jpg",
    "poster-bridal-mobile.webp",
    "poster-everyday.webp",
    "poster-everyday-mobile.jpg",
    "poster-everyday-mobile.webp",
    "wedding.webp",
    "wedding-mobile.jpg",
    "wedding-mobile.webp",
]
MEMBERS = [(f"cms/{name}", name) for name in RUNTIME]
MEMBERS.extend((f"cms/images/banners/{name}", f"images/banners/{name}") for name in BANNERS)
EXPECTED_CAMPAIGN_BLOCK = "062bee45f2429f86ba34ea4678b8d71156003195e2bb1b852cb7dba64d12843b"
EXPECTED_CAMPAIGN_IMAGE = "b979aa9adfd0f2524af465b95f1f1c89534ef5d2275cf8d223067fa86b95286e"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    sources: list[tuple[Path, str, bytes]] = []
    for source_name, archive_name in MEMBERS:
        source = ROOT / source_name
        if not source.is_file():
            raise SystemExit(f"Missing package source: {source_name}")
        sources.append((source, archive_name, source.read_bytes()))
    if len({name for _, name, _ in sources}) != len(MEMBERS):
        raise SystemExit("Duplicate archive member name")

    index = (ROOT / "cms/index.html").read_text(encoding="utf-8")
    app = (ROOT / "cms/js/app.js").read_text(encoding="utf-8")
    worker = (ROOT / "cms/sw.js").read_text(encoding="utf-8")
    api = (ROOT / "cms/api.php").read_text(encoding="utf-8")
    release_checks = {
        "index": "window.__SHIVAA_REL=186;" in index and "/js/app.js?v=186" in index,
        "app": "const APP_REL = 186;" in app,
        "worker": "const SHELL = 'shivaa-shell-v186';" in worker and "const REL = 186;" in worker,
        "api": "'rel'   => 186," in api,
        "cache": not any(token in index or token in worker for token in ("?v=184", "?v=185")),
        "new-css": "/css/v186.css?v=186" in index and "'/css/v186.css?v=186'" in worker,
    }
    if not all(release_checks.values()):
        raise SystemExit(f"Release/cache validation failed: {release_checks}")

    card_start = app.find("  <!-- HOME CAMPAIGN ENTRY CARD -->")
    card_end = app.find('  <div class="catbar-outer">', card_start)
    campaign_image_path = ROOT / "cms/images/banners/gold-biscuit-campaign.jpg"
    if card_start < 0 or card_end <= card_start or not campaign_image_path.is_file():
        raise SystemExit("Cannot locate protected Gold Biscuit campaign surface")
    if sha256(app[card_start:card_end].encode()) != EXPECTED_CAMPAIGN_BLOCK:
        raise SystemExit("Protected Gold Biscuit campaign card source changed")
    if sha256(campaign_image_path.read_bytes()) != EXPECTED_CAMPAIGN_IMAGE:
        raise SystemExit("Protected Gold Biscuit campaign image changed")

    # Fixed ZIP timestamps make the archive reproducible for identical inputs.
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for source, archive_name, data in sources:
            info = zipfile.ZipInfo(archive_name, date_time=(2026, 10, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100644 & 0xFFFF) << 16
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

    with zipfile.ZipFile(OUT, "r") as archive:
        bad = archive.testzip()
        if bad:
            raise SystemExit(f"ZIP CRC check failed: {bad}")
        names = archive.namelist()
        expected_names = [name for _, name, _ in sources]
        if names != expected_names:
            raise SystemExit("ZIP member list differs from the explicit allowlist")
        blocked = ("data/", "config.php", "uploads/", ".htaccess", "node_modules/", "smoke/")
        if any(any(name.startswith(item) or item in name for item in blocked) for name in names):
            raise SystemExit("Forbidden/private path found in package")
        for _, name, data in sources:
            if archive.read(name) != data:
                raise SystemExit(f"Package/source mismatch: {name}")

    content = OUT.read_bytes()
    print(f"Built staging-only root-layout overlay: {OUT.relative_to(ROOT)}")
    print(f"Entries: {len(sources)}; size: {len(content):,} bytes")
    print(f"SHA-256: {sha256(content)}")
    print("Included: API, HTML shell, app/admin JS, service worker, v183/v186 CSS, 15 responsive banner derivatives")
    print("Excluded: data/db.json, configuration/credentials, uploads, campaign image, tests/docs")
    print("No staging or production upload performed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
