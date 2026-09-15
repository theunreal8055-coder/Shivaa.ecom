#!/usr/bin/env python3
"""SHIVAA · v117 — extract the base64-embedded woff2 fonts from css/fonts.css
into real font files under cms/fonts/, then rewrite css/fonts.css to reference
them with url().

Why: fonts.css was a 354 KB stylesheet holding ~265 KB of base64 woff2. As a
<link rel="stylesheet"> it FULLY BLOCKED first paint on slow connections — the
biggest single render-blocking asset on the site. As standalone files the
browser downloads each face in parallel, only when it is actually used, and
font-display:swap paints text immediately with the system fallback (Jost →
Segoe UI/system-ui, Cormorant/Marcellus → Georgia) until the webfont lands.

Idempotent: re-running regenerates the same files from the same source.
Run from the repo root:  python3 tools/fonts/extract_fonts.py
"""
import base64
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "cms", "css", "fonts.css")
OUT_DIR = os.path.join(ROOT, "cms", "fonts")

FACES = re.compile(
    r"@font-face\s*\{(?P<body>.*?)\}", re.S)
PROP = {
    "family": re.compile(r"font-family:'([^']+)'"),
    "weight": re.compile(r"font-weight:(\d+)"),
    "style":  re.compile(r"font-style:(\w+)"),
    "b64":    re.compile(r"base64,([A-Za-z0-9+/=\s]+)"),
}

def slug(fam: str) -> str:
    return fam.lower().replace(" ", "-")

def main() -> int:
    css = open(SRC, "r", encoding="utf-8").read()
    src_b64 = PROP["b64"].search(css)
    if not src_b64:
        print("fonts.css is already file-based — nothing to extract.")
        return 0
    os.makedirs(OUT_DIR, exist_ok=True)

    out_css = [
        "/* ═══════════════════════════════════════════════════════════",
        "   SHIVAA — webfonts (v117 · file-based)",
        "   These faces were extracted from the old 354 KB base64 stylesheet by",
        "   tools/fonts/extract_fonts.py. They now download in parallel, only",
        "   when used, and never block first paint (font-display:swap).",
        "   NOTE: the old stylesheet embedded the SAME woff2 two-to-four times",
        "   per family (once per declared weight) — 265 KB of payloads that were",
        "   really 78 KB of unique fonts. Each family now ships ONE file; the",
        "   per-weight @font-face aliases below are byte-identical to the old",
        "   rendering, but every weight shares a single download + cache entry.",
        "   ═══════════════════════════════════════════════════════════ */",
    ]
    count, total = 0, 0
    written = {}  # family slug -> filename actually on disk
    for m in FACES.finditer(css):
        body = m.group("body")
        fam = PROP["family"].search(body).group(1)
        wt = PROP["weight"].search(body).group(1)
        style = PROP["style"].search(body).group(1)
        raw = base64.b64decode(re.sub(r"\s+", "", PROP["b64"].search(body).group(1)))
        import hashlib
        digest = hashlib.md5(raw).hexdigest()
        if slug(fam) in written and written[slug(fam)][0] == digest:
            name = written[slug(fam)][1]  # same bytes — reuse the one file
        else:
            name = f"{slug(fam)}{'-' + wt if slug(fam) == 'marcellus' or (slug(fam), wt) == ('marcellus', '400') else ''}.woff2"
            # keep a stable, weight-free name per family: <family>.woff2 (marcellus keeps -400, its only face)
            if slug(fam) != "marcellus":
                name = f"{slug(fam)}.woff2"
            path = os.path.join(OUT_DIR, name)
            if not (os.path.exists(path) and os.path.getsize(path) == len(raw)):
                with open(path, "wb") as fh:
                    fh.write(raw)
            written[slug(fam)] = (digest, name)
            total += len(raw)
            print(f"  {name:38s} {len(raw):>7,} bytes")
        count += 1
        out_css.append(
            "@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:swap;"
            "src:url('/fonts/%s') format('woff2')}" % (fam, style, wt, name)
        )
    with open(SRC, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out_css) + "\n")
    print(f"extracted {count} faces, {total/1024:.0f} KB total → cms/fonts/")
    print("css/fonts.css rewritten file-based.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
