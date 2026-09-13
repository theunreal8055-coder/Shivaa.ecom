#!/usr/bin/env python3
"""Why does THIS declaration win on a phone?  Prints the full cascade.

  python3 qa/css_why.py .bd-row grid-template-columns 320
  python3 qa/css_why.py .page-hero padding 360
"""
import re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import mobile_audit as M


def main():
    cls = sys.argv[1].lstrip(".")
    prop = sys.argv[2]
    W = int(sys.argv[3]) if len(sys.argv) > 3 else 360
    H = int(sys.argv[4]) if len(sys.argv) > 4 else 780

    seq = [0]
    rows = []
    for f in M.CSS_FILES:
        p = M.CMS / "css" / f
        if not p.exists():
            continue
        for sel, body, stack, order in M.parse_blocks(
                M.strip_comments(p.read_text(encoding="utf-8", errors="replace")), (), seq):
            for s in M.split_selectors(sel):
                if M.subject(s) and cls in set(re.findall(r"\.([_a-zA-Z][\w-]*)", M.subject(s))):
                    d = M.decls(body)
                    if prop in d:
                        val, imp = d[prop]
                        applies = all(M.media_matches(pre, W, H, "coarse")
                                      for k, pre in stack if k == "media")
                        rows.append((applies, (1 if imp else 0, M.specificity(s), order),
                                     f, order, s, val, imp,
                                     [pre for k, pre in stack]))
    rows.sort(key=lambda r: r[1])
    print(f"cascade for .{cls} {{ {prop} }} at {W}×{H}px  (weakest → strongest)")
    print("─" * 78)
    for applies, key, f, order, s, val, imp, media in rows:
        mark = "WINS " if applies and key == rows[-1][1] else ("applies" if applies else "—skip—")
        print(f"{mark} spec={key[1]} imp={int(key[0])} ord={order:<5} {f:<13} {s[:46]:<46}")
        print(f"          {prop}: {val}{' !important' if imp else ''}")
        if media:
            print(f"          @media {' and '.join(media)}")


if __name__ == "__main__":
    main()
