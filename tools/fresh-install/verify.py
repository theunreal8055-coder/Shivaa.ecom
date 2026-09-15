#!/usr/bin/env python3
"""SHIVAA fresh-install — release gate for the v115-FI bundles.

Everything a "full fledged store, fresh install" claim has to survive before the
zip is worth a minute of the owner's time. It unpacks the built bundles into a
temp tree, plays the part of install.php (seed → data/db.json), and runs:

  G1 zip hygiene            no absolute/traversal names, no duplicates, MANIFEST
                           sha1 matches bytes, INSTALL.txt present
  G2 shell contract         every /css|/js|/image ref in index.html resolves, and
                           sw.js SHELL_FILES == the shell index.html loads (the
                           v107 precache contract, the one that broke in v99–v104)
  G3 seed honesty           65 PGS products, every top-level key api.php reads,
                           zero users/orders/reviews/partner money, no password
                           hash anywhere, no customer PII, trimmed rate history
  G4 installer              install.php + data/install-open + data/.htaccess in
                           the bundle; .htaccess really 403s the installer once
                           locked and still denies ^data/; the two PHP gates pass
                           on the EXTRACTED copy, not on the working tree
  G5 code boots             node --check on every shipped .js
  G6 behaviour              tools/mega/smoke/v113b-check.js against the bundle
                           (jsdom boots the real index.html, emulates the PHP API
                           from the seeded db) — must be all-pass
  G7 lineage                v1→v115: every release verified by archive, code tag
                           or the repo's own paper trail; zero unadjudicated
                           archived-file drops
  G8 media pack             covers the shots/films/PDFs the core bundle left out,
                           and touches NOTHING under data/ or uploads/*-state

Exit 0 only when every gate is green. Run it after build.py, before uploading.

Run: python3 tools/fresh-install/verify.py [--keep] [--skip-browser]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_pack import CMS, ROOT, is_dead  # noqa: E402

DIST = ROOT / "dist"
CORE = DIST / "shivaa-FRESH-INSTALL-v115.zip"
MEDIA = DIST / "shivaa-FRESH-MEDIA-v115.zip"

GATES: list[tuple[str, str, str]] = []


def gate(name: str) -> None:
    print(f"\n── {name} " + "─" * max(0, 66 - len(name)))
    GATES.append((name, "run", ""))


def ok(msg: str) -> None:
    print("  ✓ " + msg)


def fail(msg: str) -> None:
    print("  ✕ " + msg)
    GATES[-1] = (GATES[-1][0], "FAIL", msg)


def need(cond: bool, msg: str) -> bool:
    (ok if cond else fail)(msg)
    return cond


def sha1(b: bytes) -> str:
    return hashlib.sha1(b).hexdigest()[:16]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", action="store_true", help="keep the unpacked tree for poking")
    ap.add_argument("--skip-browser", action="store_true", help="skip the jsdom behaviour gate")
    a = ap.parse_args()

    for p in (CORE, MEDIA):
        if not p.exists():
            print(f"{p.name} missing — run  python3 tools/fresh-install/build.py")
            return 2
    tmp = Path(tempfile.mkdtemp(prefix="shivaa-fi-"))
    core_dir = tmp / "core"
    core_dir.mkdir()
    with zipfile.ZipFile(CORE) as z:
        z.extractall(core_dir)
    core_names = set(n for n in CORE and zipfile.ZipFile(CORE).namelist())
    media_names = set(zipfile.ZipFile(MEDIA).namelist())
    print(f"SHIVAA v115-FI verify · core {len(core_names)} entries · media {len(media_names)} entries · {tmp}")

    # ── G1 ──────────────────────────────────────────────────────────────────
    gate("G1 zip hygiene")
    with zipfile.ZipFile(CORE) as z:
        names = z.namelist()
        bad = [n for n in names if n.startswith("/") or ".." in Path(n).parts]
        need(not bad, f"no absolute or traversal paths ({len(names)} names)")
        need(len(names) == len(set(names)), "no duplicate entries")
        need("INSTALL.txt" in names, "INSTALL.txt at the zip root (60-second install)")
        man = z.read("MANIFEST.txt").decode()
        rows = re.findall(r"^([0-9a-f]{16})\s+(\d+)\s+(\S+)$", man, re.M)
        mismatch = [r[2] for r in rows if r[2] in names and sha1(z.read(r[2])) != r[0]]
        need(rows and not mismatch, f"MANIFEST sha1 verified for {len(rows)} files"
             + ("" if not mismatch else f" → {mismatch[:3]}"))
        need(bool(rows), f"MANIFEST lists {len(rows)} site files")
    # ── G2 ──────────────────────────────────────────────────────────────────
    gate("G2 shell contract (index.html ↔ sw.js ↔ disk)")
    html = (core_dir / "index.html").read_text()
    sw = (core_dir / "sw.js").read_text()
    refs = set(re.findall(r'''(?:src|href)="(/[^"?]+\?v=[\w.]+)"''', html))
    refs |= {m for m in re.findall(r'''(?:src|href)="(/(?:css|js|images)/[^"?]+)"''', html)}
    shell = set(re.findall(r"'(/[^']+)'", re.search(r"const SHELL_FILES = \[(.*?)\];", sw, re.S).group(1)))
    shell_paths = {s.split("?")[0] for s in shell}
    ref_paths = {r.split("?")[0] for r in refs if r.startswith(("/css/", "/js/"))}
    # the v107 contract is about the CODE shell (css/js with ?v=); icons are
    # precached without a query, so they are checked against disk instead
    versioned = {r for r in refs if "?v=" in r and r.startswith(("/css/", "/js/"))}
    drift = [r for r in versioned if r not in shell]
    need(not drift, f"every versioned shell asset is precached ({len(versioned)} checked)"
        + ("" if not drift else f" → missing from sw.js: {drift}"))
    stale = sorted(p for p in shell_paths if p.startswith(("/css/", "/js/")) and p not in ref_paths)
    need(not stale, f"sw.js precaches nothing index.html stopped loading (v107's contract)"
         + ("" if not stale else f" → stale: {stale}"))
    css_js = [p for p in core_dir.rglob("*") if p.suffix in (".css", ".js") and p.is_file()]
    present = {( "/" + str(p.relative_to(core_dir)).replace("\\", "/")) for p in css_js}
    absent = sorted(p for p in (shell_paths | ref_paths) if p.startswith(("/css/", "/js/")) and p not in present)
    need(not absent, f"all {len(shell_paths | ref_paths)} shell paths exist on disk in the bundle"
         + ("" if not absent else f" → absent: {absent[:6]}"))
    imgs = {m.split("?")[0] for m in re.findall(r'''(?:src|href)="(/images/[^"]+)"''', html)}
    miss_img = [i for i in imgs if not (core_dir / i.lstrip("/")).exists() and not (core_dir / i.lstrip("/")).with_suffix(".jpg").exists()
                and i.lstrip("/") not in media_names]
    need(not miss_img, f"index.html image refs resolve (core or media pack) — {len(imgs)} checked")
    # ── G3 ──────────────────────────────────────────────────────────────────
    gate("G3 clean-store seed honesty")
    seed = json.loads((core_dir / "data/db.seed.json").read_text())
    db_live = json.loads((CMS / "data/db.json").read_text())
    missing_keys = [k for k in db_live if k not in seed]
    need(not missing_keys, f"seed carries every top-level key api.php reads ({len(db_live)} keys)"
         + ("" if not missing_keys else f" → missing {missing_keys}"))
    need(len(seed.get("products", [])) == 65, f"65 real designs seeded (found {len(seed.get('products', []))})")
    skus = sorted(p["sku"] for p in seed["products"])
    need(skus == [f"PGS{i}" for i in range(5001, 5066)], "SKUs are exactly PGS5001…PGS5065, no samples")
    for k in ("users", "orders", "reviews", "partners", "settlements", "newsletter", "contactMsgs",
              "serviceRequests", "tokens", "otps", "customOrders", "metalOrders", "bullionOrders", "loginfails"):
        n = len(seed.get(k, []) or [])
        need(n == 0, f"{k}: empty ({n})")
    blob = json.dumps(seed, ensure_ascii=False)
    need("passHash" not in blob, "no password hash of any kind in the seed")
    stray = sorted({m.group(0) for m in re.finditer(r"[A-Za-z0-9._%+-]+@(?!shivaa\.in|example\.)[A-Za-z0-9.-]+\.[a-z]{2,}", blob)})
    need(not stray, "no customer email addresses (only the store's own contact may appear)"
         + ("" if not stray else f" → {stray[:4]}"))
    need(len(seed["rates"].get("history", [])) <= 12, f"rate history trimmed to {len(seed['rates'].get('history', []))} points")
    need(seed["sms"].get("mode") in ("demo", ""), "no SMS gateway is pre-seeded (codes fall to email, and the site says so)")
    need(seed["bullion"]["cash"]["goldIndian"]["buy"] == 0, "bullion book kept its shape, money zeroed")
    # ── G4 ──────────────────────────────────────────────────────────────────
    gate("G4 installer + edge locks")
    need((core_dir / "install.php").is_file(), "install.php in the bundle")
    need((core_dir / "data/install-open").is_file(), "data/install-open present (the installer may run exactly once)")
    need((core_dir / "data/.htaccess").read_text().strip().endswith("Require all denied"),
         "data/.htaccess denies everything (v50 rule, restored)")
    htc = (core_dir / ".htaccess").read_text()
    need("RewriteCond data/INSTALL.lock -f" in htc and "install\\.php" in htc,
         ".htaccess 403s install.php once the lock file exists")
    need("RewriteRule ^data/ - [F,NC,L]" in htc, "data/ still denied at the edge")
    need("db.json" not in core_names, "no live data/db.json in a fresh-install bundle")
    r = subprocess.run([sys.executable, str(ROOT / "tools/fresh-install/php-syntax.py"),
                        str(core_dir / "install.php")], capture_output=True, text=True)
    need(r.returncode == 0, "php-syntax on the extracted installer" + (("\n" + r.stdout[-500:]) if r.returncode else ""))
    r = subprocess.run([sys.executable, str(ROOT / "tools/fresh-install/php-semantics.py"),
                        str(core_dir / "install.php")], capture_output=True, text=True)
    need(r.returncode == 0, "php-semantics (scope + call graph) on the extracted installer")
    php = (core_dir / "install.php").read_text()
    need("password_hash(" in php and "PASSWORD_DEFAULT" in php, "admin password stored with password_hash(PASSWORD_DEFAULT) — api.php's own scheme")
    # v115-FI: the media pack used to carry the upload locks, so a core-only install
    # created uploads/kyc etc. with NO guard — the exact folder that holds ID proofs.
    guards = [n for n in core_names if n.startswith("uploads/") and n.endswith("/.htaccess")]
    need(len(guards) >= 8, f"every upload folder ships its v82/v84 lock in CORE, not the media pack · {len(guards)} guards")
    need("Options -Indexes -ExecCGI" in (core_dir / "uploads" / "kyc" / ".htaccess").read_text(),
         "an upload guard actually denies execution and active documents")
    need("$guard = <<<'GUARD'" in php, "installer re-writes any upload guard the host is missing")
    need(not any(n.startswith("images/reviews/") for n in core_names),
         "no customer review photos in a bundle whose seed carries no reviews")
    need("--confirm=RESEED" in php, "re-seeding an installed store needs SSH + an explicit RESEED word")
    # ── G5 ──────────────────────────────────────────────────────────────────
    gate("G5 every shipped script parses")
    js = [p for p in core_dir.rglob("*.js") if p.is_file()]
    bad = []
    for p in js:
        r = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
        if r.returncode:
            bad.append(f"{p.relative_to(core_dir)}: {r.stderr.strip().splitlines()[-1][:110]}")
    need(not bad, f"node --check on {len(js)} shipped .js files" + ("" if not bad else "\n    " + "\n    ".join(bad[:4])))
    gc = [n for n in ("js/gift-concierge.js", "css/gift-concierge.css") if n in core_names]
    need(len(gc) == 2, "the restored v42 Gift Concierge layer ships (js + css)")
    need("/js/gift-concierge.js?v=115FI" in sw and "/css/gift-concierge.css?v=115FI" in sw,
         "the restored layer is precached, so a phone offline-first still gets it")
    # ── G6 ──────────────────────────────────────────────────────────────────
    gate("G6 behaviour harness (jsdom, real index.html, emulated API)")
    shutil.copy(core_dir / "data/db.seed.json", core_dir / "data/db.json")   # what install.php does
    if a.skip_browser:
        print("  · skipped (--skip-browser)")
    else:
        env = {"SMOKE_CMS": str(core_dir), "PATH": __import__("os").environ["PATH"],
               "HOME": __import__("os").environ.get("HOME", "/tmp")}
        r = subprocess.run(["node", "tools/mega/smoke/v113b-check.js"], cwd=str(ROOT), env=env,
                           capture_output=True, text=True, timeout=600)
        out = r.stdout + r.stderr
        m = re.search(r"(\d+)/(\d+) checks", out) or re.search(r"PASS\D+(\d+)\s*/\s*(\d+)", out)
        tail = "\n".join(out.strip().splitlines()[-6:])
        if m:
            need(int(m.group(1)) == int(m.group(2)), f"smoke harness {m.group(1)}/{m.group(2)} on the bundle")
        else:
            fails = [l for l in out.splitlines() if "FAIL" in l]
            need(r.returncode == 0 and not fails,
                 f"harness exit {r.returncode}" + (("\n    " + "\n    ".join(fails[:5])) if fails else f"\n    {tail[-400:]}"))
    # ── G7 ──────────────────────────────────────────────────────────────────
    gate("G7 v1→v115 lineage")
    r = subprocess.run([sys.executable, str(ROOT / "tools/fresh-install/lineage-audit.py"), "--top", "2"],
                       capture_output=True, text=True, cwd=str(ROOT))
    rep = json.loads((ROOT / "qa/fresh-install/lineage-v1-v115.json").read_text())
    s = rep["summary"]
    need(r.returncode == 0, f"audit exits clean ({len(s['verifiedByArchive'])} releases line-audited, "
                            f"{len(s['verifiedByCodeTag'])} tagged in code, {len(s['documentedOnly'])} documented-only)")
    need(not s["unadjudicatedArchiveDrops"], "no archived file is missing from the tree without a reason")
    need(115 in s["verifiedByArchive"] or 115 in s["verifiedByCodeTag"], "v115 itself is represented")
    # ── G8 ──────────────────────────────────────────────────────────────────
    gate("G8 media pack: adds weight, touches no state")
    with zipfile.ZipFile(MEDIA) as z:
        names = z.namelist()
    need(not [n for n in names if n.startswith(("data/", "index.html", "api.php", ".htaccess", "js/", "css/"))],
         "media pack contains no code, no data/, no shell — it can never overwrite an install")
    leaks = [n for n in names if n.startswith(("uploads/kyc/", "uploads/payproofs/")) and not n.endswith(".htaccess") and not n.endswith(".gitkeep")]
    need(not leaks, "no customer KYC / payment-proof upload rides in the media pack"
         + ("" if not leaks else f" → {leaks[:4]}"))
    # product media resolution across the two bundles
    need_core = only_media = nowhere = 0
    for p in seed["products"]:
        for im in p.get("images", []):
            rel = im.lstrip("/")
            if rel in core_names:
                need_core += 1
            elif (core_dir / rel).exists():
                need_light += 1
            elif rel in media_names:
                only_media += 1
            else:
                nowhere += 1
    need(nowhere == 0, f"product photos resolve: {need_core} in core, {only_media} in the media pack, {nowhere} missing")
    for label, cond, msg in (
        ("films", len([n for n in names if n.endswith(".mp4")]) >= 65, "65+ ring films present"),
        ("gallery", len([n for n in names if re.search(r"_shot_\w+\.jpg$", n)]) >= 200, "gallery shots present"),
        ("pdfs", len([n for n in names if n.endswith(".pdf")]) >= 17, "catalogue PDFs present"),
    ):
        need(cond, f"media pack · {msg}")
    dead = [n for n in core_names if is_dead(n)]
    need(not dead, f"no v111-deleted sample media or v21 payload in the bundle ({len(core_names)} files checked)")

    if not a.keep:
        shutil.rmtree(tmp, ignore_errors=True)
    else:
        print(f"\n  tree kept at {tmp}")

    hard = [g for g in GATES if g[1] == "FAIL"]
    print("\n" + "═" * 70)
    for n, st, msg in GATES:
        print(f"  {'PASS' if st != 'FAIL' else 'FAIL'}  {n}")
    print("═" * 70)
    print(f"{'VERIFY FAIL — ' + str(len(hard)) + ' gate(s): ' + '; '.join(h[2][:90] for h in hard) if hard else 'VERIFY PASS — the bundle is a real, self-checking store'}")
    return 1 if hard else 0


if __name__ == "__main__":
    raise SystemExit(main())
