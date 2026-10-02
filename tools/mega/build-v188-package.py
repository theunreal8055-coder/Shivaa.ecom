#!/usr/bin/env python3
"""Build the v188 root-layout overlay package (shivaa-update-v188.zip).

Built on top of the full v187 baseline (which includes v183 responsive banners,
v184 Cashfree settlement reconciliation, v185/v186 prefetch + optimistic
wishlist + 16px controls, and v187 private KYC storage & authenticated stream),
adding v188 B2B & B2C Daily WhatsApp Broadcast Studio, Unbranded Showroom
Counter Mode, Dual-PDF Catalogue Generator, Family Gold Locker, Digital Shagun
Privilege Card, and Town-to-Town Partner Referral Engine.
"""
from __future__ import annotations

import hashlib
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "shivaa-update-v188.zip"
MEMBERS = [
    ("cms/api.php", "api.php"),
    ("cms/index.html", "index.html"),
    ("cms/js/app.js", "js/app.js"),
    ("cms/js/admin.js", "js/admin.js"),
    ("cms/sw.js", "sw.js"),
    ("cms/uploads/kyc/.htaccess", "uploads/kyc/.htaccess"),
    ("cms/upgrade-sql.php", "upgrade-sql.php"),
]
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
    expected = [name for _, name in MEMBERS]
    if len({name for _, name in MEMBERS}) != len(MEMBERS):
        raise SystemExit("Duplicate archive member name")

    index = (ROOT / "cms/index.html").read_text(encoding="utf-8")
    app = (ROOT / "cms/js/app.js").read_text(encoding="utf-8")
    admin = (ROOT / "cms/js/admin.js").read_text(encoding="utf-8")
    worker = (ROOT / "cms/sw.js").read_text(encoding="utf-8")
    api = (ROOT / "cms/api.php").read_text(encoding="utf-8")
    kyc_rules = (ROOT / "cms/uploads/kyc/.htaccess").read_text(encoding="utf-8")
    release_checks = {
        "index": "window.__SHIVAA_REL=188;" in index and "/js/app.js?v=188" in index,
        "app": "const APP_REL = 188;" in app and "injectScript('/js/admin.js?v=' + APP_REL)" in app,
        "worker": "const SHELL = 'shivaa-shell-v188';" in worker and "const REL = 188;" in worker,
        "api": "'rel'   => 188," in api,
        "cache": not any(token in index or token in worker for token in ("?v=185", "?v=186", "?v=187")),
        "kyc-deny": "Require all denied" in kyc_rules and "Deny from all" in kyc_rules,
        "kyc-api": "function shv_kyc_private_dir(): ?string" in api and "admin/kyc/migrate-business-cards" in api,
        "kyc-ui": "ShivaaAdmin.viewBusinessCard(this)" in admin and "safeUrl(k.businessCard)" not in admin,
        "v188-api": "admin/broadcast-pack" in api and "whatsapp/subscribe" in api and "b2b/refer-partner" in api,
        "v188-admin": "printUnbrandedCatalogue" in admin and "printPartnerCatalogue" in admin,
        "v188-app": "toggleCounterMode()" in app and "DIGITAL SHAGUN PRIVILEGE CARD" in app,
    }
    if not all(release_checks.values()):
        raise SystemExit(f"Release/security validation failed: {release_checks}")
    if any(name.startswith("uploads/") and name != "uploads/kyc/.htaccess" for name in expected):
        raise SystemExit("Only the KYC directory access-control file may be packaged under uploads/")
    if any(token in name.lower() for _, name in MEMBERS for token in ("db.json", "config.php", "customer", "credential")):
        raise SystemExit("Private data/configuration path found in allowlist")

    card_start = app.find("  <!-- HOME CAMPAIGN ENTRY CARD -->")
    card_end = app.find('  <div class="catbar-outer">', card_start)
    campaign_image_path = ROOT / "cms/images/banners/gold-biscuit-campaign.jpg"
    if card_start < 0 or card_end <= card_start or not campaign_image_path.is_file():
        raise SystemExit("Cannot locate protected Gold Biscuit campaign surface")
    if sha256(app[card_start:card_end].encode()) != EXPECTED_CAMPAIGN_BLOCK:
        raise SystemExit("Protected Gold Biscuit campaign card source changed")
    if sha256(campaign_image_path.read_bytes()) != EXPECTED_CAMPAIGN_IMAGE:
        raise SystemExit("Protected Gold Biscuit campaign image changed")

    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for source, archive_name, data in sources:
            info = zipfile.ZipInfo(archive_name, date_time=(2026, 10, 2, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100644 & 0xFFFF) << 16
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)

    with zipfile.ZipFile(OUT, "r") as archive:
        bad = archive.testzip()
        if bad:
            raise SystemExit(f"ZIP CRC check failed: {bad}")
        names = archive.namelist()
        if names != expected:
            raise SystemExit(f"ZIP member list differs from explicit allowlist: {names}")
        if any(name == "uploads/kyc/.htaccess" for name in names) is False:
            raise SystemExit("KYC access-control file missing from package")
        if any(name.startswith(("data/", "node_modules/", "tests/", "smoke/")) for name in names):
            raise SystemExit("Forbidden/private path found in package")
        for _, name, data in sources:
            if archive.read(name) != data:
                raise SystemExit(f"Package/source mismatch: {name}")

    content = OUT.read_bytes()
    print(f"Built v188 overlay: {OUT.relative_to(ROOT)}")
    print(f"Entries: {len(sources)}; size: {len(content):,} bytes")
    print(f"SHA-256: {sha256(content)}")
    print("Included: API, HTML release shell, app/admin JS, service worker, KYC deny rule, upgrade-sql.php")
    print("Excluded: database, credentials/config, uploaded KYC/customer files, campaign assets, CSS/media, test tooling")
    return 0


if __name__ == "__main__":
    sys.exit(main())
