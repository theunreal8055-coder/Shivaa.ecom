#!/usr/bin/env python3
"""SHIVAA fresh-install — shared packing plan (v115-FI).

One source of truth for WHAT goes in a bundle, used by both build.py and
verify.py so a file can never be packed by one and un-counted by the other.

TIERS
  core    the storefront: code, chrome, catalogue data, category/banner art and
          the 65 ring COVERS. Extract it, run install.php, the shop is live.
          Missing gallery shots/films degrade to the house monogram — that path
          is asserted by tools/mega/smoke/v113b-check.js check #7, so a core-only
          install is a working store, not a broken one.
  media   everything heavy: 260 gallery shots (_shot_studio/worn/editorial/gift),
          76 .mp4 (hero + craft films + 65 ring films), 21 catalogue PDFs,
          exemplar uploads.
  all     core + media.

DEAD — deliberately shipped by NO tier (documented in the build report):
  images/products/samples/**  photos of the 340 sample products deleted in v111
  samples-payload.json        the v21 sample-import payload ("delete this file")
  migrate-repair.php          sample import + repair door, meaningless without it
  PAYU_BUGFIX_REPORT.md       dev report, already summarised in HANDOFF.md
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
CMS = ROOT / "cms"

TIER_NAMES = ("core", "media")

VIDEO = {".mp4", ".webm", ".mov"}
DOC = {".pdf"}
TEXT = {".html", ".htm", ".css", ".js", ".mjs", ".php", ".py", ".json", ".md",
        ".txt", ".xml", ".webmanifest", ".htaccess", ".svg"}

GALLERY_RE = re.compile(r"_shot_(studio|worn|editorial|gift)\.jpe?g$", re.I)

# files no tier ships (relative to cms/)
DEAD_PREFIX = ("images/products/samples/",)
DEAD_NAMES = ("samples-payload.json", "migrate-repair.php", "PAYU_BUGFIX_REPORT.md")

# Never in ANY bundle: the dev host's live database. A fresh install starts from
# data/db.seed.json (clean store) and install.php writes the host's own db.json.
# Shipping the master copy here would hand a new host yesterday's customers.
# .htaccess / .gitkeep inside an uploads folder are the folder's LOCK, not its
# content: they must ship with the core bundle even when the media pack is not
# extracted (v82/v84 edge guards — no execution, no active documents).
GUARD_NAMES = {".htaccess", ".gitkeep"}

EXCLUDE_FROM_BUNDLE = {
    "data/db.json",
    "make_icons.py",   # dev icon generator; .htaccess blocks *.py at the edge,
                       # but a fresh web root has no business carrying it
}

# the installer needs its seed next to the db it writes
SEED_REL = "data/db.seed.json"
INSTALLER_REL = "install.php"
DATA_HTACCESS_REL = "data/.htaccess"


def all_files(cms: Path = CMS) -> list[Path]:
    return sorted(p for p in cms.rglob("*") if p.is_file() and "__pycache__" not in p.parts)


def rel_of(p: Path, cms: Path = CMS) -> str:
    return p.relative_to(cms).as_posix()


def is_dead(rel: str) -> bool:
    return rel.startswith(DEAD_PREFIX) or rel in DEAD_NAMES


def is_text(rel: str) -> bool:
    return Path(rel).suffix.lower() in TEXT or Path(rel).name == ".htaccess"


def tier_of(rel: str) -> str:
    """core | media | dead — for one cms-relative path."""
    if is_dead(rel):
        return "dead"
    ext = Path(rel).suffix.lower()
    if ext in VIDEO or ext in DOC:
        return "media"
    if GALLERY_RE.search(rel):
        return "media"
    if rel.startswith("uploads/") and Path(rel).name not in GUARD_NAMES:
        return "media"          # exemplar uploads ride with the heavy pack
    if Path(rel).name in GUARD_NAMES and rel.count("/") > 0 and not rel.startswith("data/"):
        return "core"           # the folder locks ship with the CODE, always
    if rel.startswith("images/reviews/"):
        return "media"          # review photos ride with review DATA, and the seed ships
                                # none — so they must not sit in a clean-store bundle
    if rel.startswith("images/designs/"):
        return "core"           # covers + faces only (shots already matched media)
    if rel.startswith(("images/categories/", "images/banners/", "images/icons/", "images/")):
        return "core"
    if rel.startswith("docs/"):
        return "core"           # OTP setup guide + privacy policy travel WITH the installer
    return "core"


def tier_files(tier: str, cms: Path = CMS) -> list[str]:
    rows = []
    for p in all_files(cms):
        r = rel_of(p, cms)
        if is_dead(r) or r in EXCLUDE_FROM_BUNDLE:
            continue
        if tier == "all" or tier_of(r) == tier:
            rows.append(r)
    return rows


def size_of(rels: list[str], cms: Path = CMS) -> int:
    return sum((cms / r).stat().st_size for r in rels if (cms / r).exists())


def plan(cms: Path = CMS) -> dict:
    out: dict[str, list[str]] = {"core": [], "media": [], "dead": []}
    for p in all_files(cms):
        out[tier_of(rel_of(p, cms))].append(rel_of(p, cms))
    return out


if __name__ == "__main__":
    pl = plan()
    for k in ("core", "media", "dead"):
        print(f"{k:6s} {len(pl[k]):4d} files {size_of(pl[k]) / 1048576:7.2f} MB")
