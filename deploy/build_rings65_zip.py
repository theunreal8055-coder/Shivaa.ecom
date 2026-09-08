#!/usr/bin/env python3
"""Build shivaa-update-v46-rings65.zip — all 65 PGS rings, nothing else.

Contents (site-root-relative paths, extract straight into public_html):
  images/designs/rings/*.jpg   260 photos actually referenced by db.json (4/SKU)
  data/rings65-products.json   65 product records (installer payload, .json = not web-served)
  apply-rings65.php            one-click merge installer (from apply-rings65.template.php)
  READ-ME-RINGS65.txt          hPanel steps

Deliberately EXCLUDED: full data/db.json (would clobber live orders/users),
supplier reference crops (PGSxxxx.jpg — unused by the storefront), videos
(v44 = no videos on PGS rings), superseded dark studios of the 31 face SKUs,
and every other site file.

Usage:  python3 deploy/build_rings65_zip.py
Output: shivaa-update-v46-rings65.zip  (repo root)
"""
import hashlib
import json
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "shivaa-update-v46-rings65.zip"
STAGE = ROOT / "deploy" / "_stage_rings65"

EXPECTED_SKUS = [f"PGS{5000 + i}" for i in range(1, 66)]


def fail(msg: str) -> None:
    print(f"❌ {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    db_path = ROOT / "cms" / "data" / "db.json"
    db = json.loads(db_path.read_text())
    prods = db.get("products", [])
    pgs = sorted((p for p in prods if str(p.get("sku", "")).startswith("PGS")),
                 key=lambda p: p["sku"])

    # ── ground-truth assertions ──
    if [p["sku"] for p in pgs] != EXPECTED_SKUS:
        fail(f"PGS SKU set is not exactly PGS5001–PGS5065 "
             f"(found {len(pgs)}: {[p['sku'] for p in pgs][:5]}…)")
    if len(prods) != 405:
        fail(f"db.json must hold 405 products, found {len(prods)} — aborting.")
    for p in pgs:
        if len(p.get("images", [])) != 4:
            fail(f"{p['sku']}: expected 4 images, found {len(p.get('images', []))}")
        if p.get("video"):
            fail(f"{p['sku']}: payload must carry no video (v44 rule).")
        for im in p["images"]:
            if not im.startswith("/images/designs/rings/PGS"):
                fail(f"{p['sku']}: unexpected image path {im}")

    # ── stage ──
    if STAGE.exists():
        shutil.rmtree(STAGE)
    img_dir = STAGE / "images" / "designs" / "rings"
    data_dir = STAGE / "data"
    img_dir.mkdir(parents=True)
    data_dir.mkdir(parents=True)

    n_img = 0
    for p in pgs:
        for im in p["images"]:
            src = ROOT / "cms" / im.lstrip("/")
            if not src.is_file():
                fail(f"missing on disk: cms{im}")
            shutil.copy2(src, img_dir / src.name)
            n_img += 1
    if n_img != 260:
        fail(f"expected 260 images, staged {n_img}")

    payload = {
        "format": "shivaa-rings65-v46",
        "exportedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(pgs),
        "products": pgs,
    }
    (data_dir / "rings65-products.json").write_text(
        json.dumps(payload, indent=1, ensure_ascii=False))

    tpl = ROOT / "deploy" / "apply-rings65.template.php"
    if not tpl.is_file():
        fail("deploy/apply-rings65.template.php missing")
    shutil.copy2(tpl, STAGE / "apply-rings65.php")
    readme = ROOT / "deploy" / "READ-ME-RINGS65.txt"
    if not readme.is_file():
        fail("deploy/READ-ME-RINGS65.txt missing")
    shutil.copy2(readme, STAGE / "READ-ME-RINGS65.txt")

    # ── zip (site-root-relative names, no cms/ prefix — cf. v43 path bug) ──
    if OUT.exists():
        OUT.unlink()
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for f in sorted(STAGE.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(STAGE).as_posix())

    # ── verify ──
    with zipfile.ZipFile(OUT) as z:
        names = z.namelist()
    jpgs = [n for n in names if n.endswith(".jpg")]
    assert len(names) == 263, f"expected 263 entries, got {len(names)}"
    assert len(jpgs) == 260, f"expected 260 jpgs, got {len(jpgs)}"
    assert "images/designs/rings/PGS5001_shot_studio.jpg" in names
    assert "images/designs/rings/PGS5011_face.jpg" in names
    assert "data/rings65-products.json" in names
    assert "apply-rings65.php" in names
    assert "READ-ME-RINGS65.txt" in names
    assert not any(n.startswith("cms/") for n in names), "no cms/ prefix allowed"
    assert not any("video" in n or n.endswith(".mp4") for n in names), "no videos allowed"
    skus_in_zip = sorted({n.split("/")[-1].split("_")[0].split(".")[0] for n in jpgs})
    assert skus_in_zip == EXPECTED_SKUS, "zip must cover exactly PGS5001–PGS5065"

    md5 = hashlib.md5(OUT.read_bytes()).hexdigest()
    print(f"✅ {OUT.name}: {len(names)} files "
          f"(260 ring photos + payload + installer + readme), "
          f"{OUT.stat().st_size / 1e6:.1f} MB, md5 {md5}")
    shutil.rmtree(STAGE)


if __name__ == "__main__":
    main()
