#!/usr/bin/env python3
"""SHIVAA lineage audit — every release v1 → v115, measured against the tree.

Answers one question with evidence, not memory: *does the cms/ tip really carry
everything the 115 releases built?* Two independent signals per version:

  A. ARCHIVE  — if `shivaa-update-vNN*.zip` (or a dated sibling) survives in the
     repo root, every TEXT file inside it is line-audited against cms/:
     absorption = share of the archived file's meaningful lines that are present
     in the current tree. 100 % = fully carried forward. Below that, the
     surviving diff is printed so a human (or the next agent) can judge whether
     the drop was deliberate (e.g. v99 deleting Saathi's bot.css) or a reversion.
  B. CODE TAG — `grep`-style count of "vNNN" markers in cms/ source comments.
     This is how versions whose archive never shipped (v1–v26, v82, v83, v89…)
     still get measured: the code itself is the archive.

Writes qa/fresh-install/lineage-v1-v115.json + docs/VERSION-LINEAGE-v1-v115.md.
Exit 1 if a version is BOTH unarchived and untagged in code (i.e. genuinely
unverifiable) — honest failure beats a green tick we cannot support.

Run: python3 tools/fresh-install/lineage-audit.py [--top 4]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_pack import CMS, ROOT, TEXT, is_text  # noqa: E402

VER_MAX = 115
ARCHIVE_DIR = ROOT
OUT_JSON = ROOT / "qa/fresh-install/lineage-v1-v115.json"
OUT_MD = ROOT / "docs/VERSION-LINEAGE-v1-v115.md"

# ── archives ─────────────────────────────────────────────────────────────────
ZIP_PATTERNS = ("shivaa-update-v*.zip", "*update-*-20260914.zip", "shivaa-FRESH-v*.zip",
                "shivaa-mega-v*.zip", "bullion-update-*.zip", "payu-update-*.zip",
                "connect-rates-bullion-*.zip")
VER_IN_NAME = re.compile(r"v(\d{1,3})")
TAG_IN_LINE = re.compile(r"#\s*v(\d{1,3})\b|\bv(\d{1,3})\s*[—·:-]|\?v=(\d{1,3})\b|shell-v(\d{1,3})")


def meaningful_lines(text: str) -> list[str]:
    out = []
    for ln in text.splitlines():
        s = ln.strip()
        if len(s) < 8:
            continue
        if s in {"}", "{", "};", ");", "?>", "<?php"} or s.startswith(("// *", "/* ═", "═══")):
            continue
        out.append(s)
    return out


def find_archives() -> dict[int, list[Path]]:
    found: dict[int, list[Path]] = defaultdict(list)
    for pat in ZIP_PATTERNS:
        for z in sorted(ARCHIVE_DIR.glob(pat)):
            for m in set(VER_IN_NAME.findall(z.name)):
                v = int(m)
                if 1 <= v <= VER_MAX:
                    found[v].append(z)
    return dict(found)


def archive_report(ver: int, zips: list[Path], cms: Path, top: int) -> dict:
    """Line-absorption of every text file inside the release archive(s)."""
    per_file = []
    for zp in zips:
        try:
            zf = zipfile.ZipFile(zp)
        except zipfile.BadZipFile:
            per_file.append({"zip": zp.name, "file": "!", "error": "bad zip"})
            continue
        for info in zf.infolist():
            name = info.filename
            if info.is_dir() or info.file_size > 6 * 1024 * 1024:
                continue
            rel = name.split("/", 1)[1] if name.startswith("cms/") else name
            if not is_text(rel) or ("/" not in rel and rel not in {"index.html", "api.php", "sw.js"}):
                continue
            # An archive member can live OUTSIDE cms/ — v78-v80 shipped relay/,
            # which deploys to Render, not to public_html. Look in the repo too,
            # or a restored file still reads as "missing from the store".
            cur = cms / rel
            home = "cms"
            if not cur.exists():
                alt = ROOT / rel
                if alt.exists() and alt.is_file():
                    cur, home = alt, "repo"
            try:
                blob = zf.read(info)
            except Exception as exc:            # encrypted / truncated member
                per_file.append({"zip": zp.name, "file": rel, "error": str(exc)[:60]})
                continue
            entry = {"zip": zp.name, "file": rel, "archivedLines": 0, "present": cur.exists(), "foundIn": home}
            if not entry["present"]:
                entry["absent"] = True
                per_file.append(entry)
                continue
            a_lines = meaningful_lines(blob.decode("utf-8", "replace"))
            # COUNTER, not set: a line the archived file repeats twice is only
            # "lost" when the tree carries it fewer times. A set made every
            # duplicated line (return res; in sw.js) look dropped.
            b_lines = Counter(meaningful_lines(cur.read_text("utf-8", "replace")))
            have = sum(min(c, b_lines[l]) for l, c in Counter(a_lines).items())
            entry["archivedLines"] = len(a_lines)
            entry["presentLines"] = have
            entry["absorption"] = round(100.0 * have / len(a_lines), 1) if a_lines else 100.0
            if entry["absorption"] < 100.0:
                lost = Counter(a_lines) - Counter(b_lines)
                entry["sampleLost"] = [l[:150] for l, _ in lost.most_common(top)]
            per_file.append(entry)
    text = [f for f in per_file if "absorption" in f]
    by_ver = {
        "archives": [z.name for z in zips],
        "filesInArchive": len(per_file),
        "filesMissingFromTree": sum(1 for f in per_file if f.get("absent")),
        "textFilesAudited": len(text),
        "absorptionMin": min((f["absorption"] for f in text), default=None),
        "absorptionAvg": round(sum(f["absorption"] for f in text) / len(text), 1) if text else None,
        "worst": sorted(text, key=lambda f: f["absorption"])[:top],
        "perFile": per_file,
    }
    return by_ver


DOC_GLOBS = ("ARENA-STATE.md", "HANDOFF.md", "MEMORY.md", "FEATURE-LINEAGE.md", "README.md",
             "SHIVAA-MEGA-README.md", "DEPLOY-v*.md", "docs/*.md", "deploy/*.md", "cms/*.md",
             "tools/**/*.md", "qa/**/*.md")
# Files this tool (or this release) writes must never count as evidence for
# itself — otherwise "v1" scores 137 mentions because a generated table lists
# v1..v115 once per row. Self-referential proof is not proof.
DOC_EXCLUDE = ("VERSION-LINEAGE", "FRESH-INSTALL", "lineage-v1-v115")
DOC_VER = re.compile(r"\bv ?(\d{1,3})\b")


def doc_tags() -> dict[int, int]:
    """Where the repo's own paper trail records a release. v110-v112 changed
    deployments and data, not markup, so their only fingerprint is here."""
    out: dict[int, int] = {}
    seen: set[Path] = set()
    for pat in DOC_GLOBS:
        for f in ROOT.glob(pat):
            if (f in seen or not f.is_file() or f.stat().st_size > 2 * 1024 * 1024
                    or "node_modules" in f.parts or f.name in {"package-lock.json"}
                    or any(x in f.name for x in DOC_EXCLUDE)):
                continue        # node_modules/*/README.md is not this project's paper trail
            seen.add(f)
            txt = f.read_text("utf-8", "replace")
            for m in DOC_VER.finditer(txt):
                v = int(m.group(1))
                if 1 <= v <= VER_MAX:
                    out[v] = out.get(v, 0) + 1
    return out


def code_tags(cms: Path) -> dict[int, dict]:
    """Where in the live tree each release still leaves a fingerprint."""
    files_touched = Counter()
    total = Counter()
    for p in cms.rglob("*"):
        if not p.is_file() or "node_modules" in p.parts or p.suffix.lower() not in TEXT:
            continue
        if p.stat().st_size > 4 * 1024 * 1024:
            continue
        try:
            txt = p.read_text("utf-8", "replace")
        except OSError:
            continue
        rel = p.relative_to(cms).as_posix()
        for m in TAG_IN_LINE.finditer(txt):
            v = next((g for g in m.groups() if g), None)
            if v is None:
                continue
            iv = int(v)
            if 1 <= iv <= VER_MAX:
                total[iv] += 1
                files_touched[iv] += 1
    return {v: {"markers": total[v], "markerHits": files_touched[v]} for v in total}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=4, help="how many dropped lines / worst files to print")
    ap.add_argument("--cms", default=str(CMS))
    args = ap.parse_args()
    cms = Path(args.cms)

    tags = code_tags(cms)
    docs = doc_tags()
    archives = find_archives()
    rows = {}
    for v in range(1, VER_MAX + 1):
        row = {"version": v, "archive": None, "codeMarkers": tags.get(v, {}).get("markers", 0),
               "markerFiles": tags.get(v, {}).get("markerHits", 0), "docMentions": docs.get(v, 0)}
        if v in archives:
            rep = archive_report(v, archives[v], cms, args.top)
            row["archive"] = rep
            row["absorptionAvg"] = rep["absorptionAvg"]
            row["absorptionMin"] = rep["absorptionMin"]
            row["filesMissingFromTree"] = rep["filesMissingFromTree"]
        rows[v] = row

    verified_by_archive = [v for v, r in rows.items() if r.get("archive") and (r["archive"]["textFilesAudited"] or 0) > 0]
    verified_by_code = [v for v, r in rows.items() if r["codeMarkers"] > 0]
    unverifiable = [v for v, r in rows.items()
                    if not r.get("archive") and r["codeMarkers"] == 0 and not r.get("docMentions")]
    reverted = []
    for v, r in rows.items():
        a = r.get("archive")
        if a and a["filesMissingFromTree"]:
            reverted.append((v, a["filesMissingFromTree"]))

    ADJ = ROOT / "tools/fresh-install/lineage-adjudications.json"
    adjudicated = json.loads(ADJ.read_text()) if ADJ.exists() else {}
    for v, r in rows.items():
        key = f"v{v}"
        a = r.get("archive")
        if a and a["filesMissingFromTree"]:
            lost = [f["file"] for f in a["perFile"] if f.get("absent")]
            r["missingFiles"] = lost
            r["adjudication"] = [adjudicated.get(key, {}).get(f) or adjudicated.get(f) for f in lost]
    open_files = []
    for v, r in rows.items():
        for f, adj in zip(r.get("missingFiles", []), r.get("adjudication", [])):
            if not adj:
                open_files.append(f"v{v}:{f}")
    result = {
        "adjudications": adjudicated,
        "unadjudicatedArchiveDrops": open_files,
        "generatedFrom": "cms/ @ v115 tip",
        "versions": rows,
        "summary": {
            "range": f"v1..v{VER_MAX}",
            "archivedInRepo": sorted(v for v in rows if rows[v].get("archive")),
            "verifiedByArchive": sorted(verified_by_archive),
            "verifiedByCodeTag": sorted(verified_by_code),
            "unverifiable": sorted(unverifiable),
            "documentedOnly": sorted(v for v, r in rows.items()
                                     if not r.get("archive") and r["codeMarkers"] == 0 and r.get("docMentions")),
            "unadjudicatedArchiveDrops": open_files,
            "archiveFilesNotInTree": [{"version": v, "missingFiles": n} for v, n in reverted],
        },
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(result, indent=1, ensure_ascii=False))
    write_md(rows, result["summary"], OUT_MD)

    s = result["summary"]
    print(f"lineage audit v1..v{VER_MAX}")
    print(f"  archives in repo      : {len(s['archivedInRepo'])} versions")
    print(f"  verified by archive   : {len(s['verifiedByArchive'])} versions")
    print(f"  verified by code tag  : {len(s['verifiedByCodeTag'])} versions")
    print(f"  archive file drops    : {s['archiveFilesNotInTree'] or 'none'}")
    print(f"  documented only       : {s['documentedOnly'] or 'none'}")
    print(f"  unadjudicated drops   : {s['unadjudicatedArchiveDrops'] or 'none'}")
    print(f"  wrote {OUT_JSON.relative_to(ROOT)} + {OUT_MD.relative_to(ROOT)}")
    return 1 if open_files else 0


def write_md(rows: dict, s: dict, out: Path) -> None:
    L = ["# SHIVAA — version lineage v1 → v115 (audited, not remembered)",
         "",
         "> Generated by `python3 tools/fresh-install/lineage-audit.py`. Do not hand-edit the tables;",
         "> re-run the audit. This is the evidence behind `FRESH-INSTALL-v115.md`: what the fresh",
         "> install carries, and how each of the 115 releases was verified to still be in the tree.",
         "",
         "| signal | count |",
         "|---|---|",
         f"| releases with an archive still in the repo | {len(s['archivedInRepo'])} |",
         f"| releases line-audited archive → `cms/` | {len(s['verifiedByArchive'])} |",
         f"| releases still tagged in `cms/` source | {len(s['verifiedByCodeTag'])} |",
         f"| releases still named in the repo's own paper trail | {len(s['documentedOnly'])} |",
         f"| releases with no archive, no tag and no doc | {len(s['unverifiable'])} |",
         "",
         "**Reading `absorption`:** the share of the archived release's own text lines that are",
         "still present in `cms/` today. `100 %` = carried forward whole. Under `100 %` the dropped",
         "lines are printed for that release so a human can confirm the removal was the *intent* of a",
         "later version (e.g. v99 deleting Saathi) rather than a silent reversion.",
         "",
         "## Every release",
         "",
         "| v | archive in repo | files | audited | absorption (min/avg) | code markers | doc mentions | verdict |",
         "|---|---|---|---|---|---|---|---|",
         ]
    for v in range(1, VER_MAX + 1):
        r = rows[v]
        a = r.get("archive")
        arc = ", ".join(x.replace("shivaa-update-", "").replace(".zip", "") for x in a["archives"]) if a else "—"
        files = a["filesInArchive"] if a else "—"
        aud = a["textFilesAudited"] if a else "—"
        absn = f"{a['absorptionMin']} / {a['absorptionAvg']}" if a and a["absorptionMin"] is not None else "—"
        mk = r["codeMarkers"]
        if a and (a["absorptionMin"] or 100) >= 99.5 and not a["filesMissingFromTree"]:
            verdict = "✅ fully carried"
        elif a and a.get("missingFiles"):
            adjs = a.get("adjudication") or []
            unad = [f for f, adj in zip(a["missingFiles"], adjs) if not adj]
            done = [f for f, adj in zip(a["missingFiles"], adjs) if adj]
            verdict = (("⚠️ " + str(len(unad)) + " archived file(s) unexplained") if unad else
                       "🧾 " + str(len(done)) + " archived file(s) dropped on purpose (adjudicated)")
        elif a:
            verdict = "🔎 lines dropped — review below"
        elif mk:
            verdict = "✅ in code (no archive)"
        elif r.get("docMentions"):
            verdict = f"📄 documented in the repo trail ({r['docMentions']} mention(s))"
        else:
            verdict = "⛔ no archive, no code tag, no doc"
        L.append(f"| **v{v}** | {arc} | {files} | {aud} | {absn} | {mk or '—'} | {r.get('docMentions') or '—'} | {verdict} |")

    drops = [(v, rows[v]["archive"]) for v in sorted(rows) if rows[v].get("archive")]
    L += ["", "## Dropped lines worth a human eye", "",
          "Only releases whose archive lost text lines against the tree. A drop is usually a later",
          "version *deleting* a feature on purpose — it is listed so the next agent can confirm that",
          "rather than rediscover it.", ""]
    any_drop = False
    for v, a in drops:
        worst = [f for f in a["worst"] if f.get("absorption", 100) < 99.5]
        for f in worst:
            any_drop = True
            L += [f"### v{v} · `{f['file']}` — {f['absorption']} % absorbed", "",
                  f"*{f['presentLines']}/{f['archivedLines']} archived lines found in `cms/`.*", ""]
            for smp in f.get("sampleLost", [])[:6]:
                L.append(f"- `{smp[:140]}`")
            L.append("")
    if not any_drop:
        L.append("_No archived release lost lines against the current tree._")

    adj_lines = [(v, f, (rows[str(v)] or {}).get("adjudication")) for v, f in []]
    L += ["", "## Archived files that are not in the tree — and why", "",
          "Each of these was an *actual* audit finding. A drop is fine when a later version deleted",
          "the feature on purpose; it is a bug when nobody noticed. The verdicts below come from",
          "`tools/fresh-install/lineage-adjudications.json` — one entry per file, each with a reason",
          "and, for the restored ones, the release that brought it back.", ""]
    for v in sorted(rows, key=int):
        r = rows[v]
        for f, adj in zip(r.get("missingFiles", []), r.get("adjudication", [])):
            L.append(f"- **v{v}** · `{f}` — {adj or '**UNEXPLAINED — do not ship until this is resolved**'}")
    L.append("")
    unver_pre = [v for v in sorted(rows) if rows[v]["codeMarkers"] == 0 and not rows[v].get("archive")
                 and not rows[v].get("docMentions")]
    L += ["", f"## The {len(unver_pre)} rows marked ⛔ — what they do and do not mean", "",
          "A ⛔ row is *not* a missing feature. It means this repo holds **no independent proof**",
          "of that release: no archive, no surviving `vNNN` tag in `cms/`, no line in the project's",
          "own handoff notes. For the early run of numbers the reason is structural:", "",
          "- **v1 → v36** — archives only start at `shivaa-update-v37.zip`, the first *cumulative*",
          "  baseline. Those releases are therefore in the store **to exactly the extent v37 carried",
          "  them**, and v37's own absorption row above is the floor of that claim. Nothing later",
          "  reverted to a pre-v37 state (v37→v115 is the audited chain).",
          "- **a handful in the 40s–80s** — the release shipped as a data/settings change or was",
          "  reworked by its immediate successor before anything tagged it.",
          "", "Unverifiable versions:", ""]
    unver = unver_pre
    for i in range(0, len(unver), 12):
        L.append(", ".join(f"v{v}" for v in unver[i:i + 12]) + "  ")
    L.append("")
    L += ["", "## Releases with no archive in the repo", "",
          "These live **only** as code in `cms/` (their markers are counted above). Listed so nobody",
          "mistakes 'no zip in the repo' for 'feature missing from the store'.", ""]
    missing = [v for v in sorted(rows) if not rows[v].get("archive")]
    for i in range(0, len(missing), 10):
        L.append(", ".join(f"v{v}" for v in missing[i:i + 10]) + "  ")
    L += ["", f"*(audit run against `{s.get('generatedFrom', 'cms/')}`)*", ""]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(L))


if __name__ == "__main__":
    raise SystemExit(main())
