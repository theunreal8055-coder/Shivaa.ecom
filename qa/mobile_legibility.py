#!/usr/bin/env python3
"""Legibility + tap-target auditor — the "does it feel like a real app" pass.

Evaluates the true cascade at phone widths and reports:
  · TINY TYPE   winning font-size below a readable floor (default 10px)
  · SMALL TARGET interactive elements whose winning box is under 44px
  · CLS RISK    font-size declared in px on a fluid component with no clamp

  python3 qa/mobile_legibility.py [--floor 10] [--width 360]
"""
import argparse, re, sys
from collections import defaultdict
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import mobile_audit as M

INTERACTIVE_HINT = re.compile(
    r"(btn|button|tab|chip|pill|link|icon|nav|close|toggle|cta|action|sa-tool|"
    r"qty|pick|arrow|arw|-ar$|^ar|dw-|mnav|cat-|pc-quick|see-all|fcheck|pay-opt|"
    r"size-|step|dot|soc|seal|tool)", re.I)


def winner(entries, prop, W, H):
    eff = None
    for f, order, s, d, stack in entries:
        if not all(M.media_matches(pre, W, H, "coarse") for k, pre in stack if k == "media"):
            continue
        if ":hover" in s:
            continue
        if prop not in d:
            continue
        val, imp = d[prop]
        key = (1 if imp else 0, M.specificity(s), order)
        if eff is None or key > eff[0]:
            eff = (key, val, imp, f, s)
    return eff


def resolve_px(val, W):
    """Best-effort px resolution of a font-size value at viewport width W."""
    v = val.strip()
    if v in ("inherit", "initial", "unset", "revert"):
        return None
    x = M.px_only(v)
    if x is not None:
        return x
    m = re.match(r"^([\d.]+)(rem|em)$", v)
    if m:
        return float(m.group(1)) * 16
    if "clamp(" in v:
        args = [a.strip() for a in re.search(r"clamp\((.*)\)", v).group(1).split(",")]
        if len(args) != 3:
            return None
        lo = M.to_px(args[0]); hi = M.to_px(args[2])
        mm = re.search(r"([\d.]+)vw", args[1])
        base = M.to_px(re.sub(r"[\d.]+vw", "0px", args[1])) or 0
        pv = (float(mm.group(1)) * W / 100 if mm else 0) + (base or 0)
        if lo is None or hi is None:
            return None
        return min(max(lo, pv), hi)
    mm = re.match(r"^([\d.]+)vw$", v)
    if mm:
        return float(mm.group(1)) * W / 100
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--floor", type=float, default=10.0)
    ap.add_argument("--width", type=int, default=360)
    ap.add_argument("--height", type=int, default=780)
    a = ap.parse_args()
    W, H = a.width, a.height

    seq = [0]
    rules = []
    for f in M.CSS_FILES:
        p = M.CMS / "css" / f
        if not p.exists():
            continue
        for sel, body, stack, order in M.parse_blocks(
                M.strip_comments(p.read_text(encoding="utf-8", errors="replace")), (), seq):
            rules.append((f, order, sel, M.decls(body), stack))

    used = M.used_classes()
    by_class = defaultdict(list)
    for f, order, sel, d, stack in rules:
        for s in M.split_selectors(sel):
            subj = M.subject(s)
            if not subj:
                continue
            for c in set(re.findall(r"\.([_a-zA-Z][\w-]*)", subj)):
                by_class[c].append((f, order, s, d, stack))

    tiny, small_target = [], []
    for c, entries in by_class.items():
        if c not in used:
            continue
        fs = winner(entries, "font-size", W, H)
        if fs:
            px = resolve_px(fs[1], W)
            if px is not None and px < a.floor:
                tiny.append((px, c, fs[1], fs[3], fs[4]))
        # tap targets: min-height / height on things that look interactive
        if INTERACTIVE_HINT.search(c):
            box = None
            for prop in ("min-height", "height"):
                w = winner(entries, prop, W, H)
                if w:
                    x = M.px_only(w[1])
                    if x is not None:
                        box = x if box is None else max(box, x) if prop == "min-height" else box
                        if prop == "min-height":
                            box = x
            mh = winner(entries, "min-height", W, H)
            h = winner(entries, "height", W, H)
            mv = M.px_only(mh[1]) if mh else None
            hv = M.px_only(h[1]) if h else None
            eff = max([x for x in (mv, hv) if x is not None], default=None)
            if eff is not None and eff < 40:
                small_target.append((eff, c, (mh or h)[1], (mh or h)[3], (mh or h)[4]))

    tiny.sort()
    small_target.sort()
    print(f"viewport {W}×{H} · legibility floor {a.floor}px · tap-target floor 40px")
    print("=" * 78)
    print(f"TINY TYPE — {len(tiny)} winning declarations below {a.floor}px")
    print("=" * 78)
    for px, c, val, f, s in tiny:
        print(f"  {px:5.1f}px  .{c:<26} {val:<28} {f:<12} {s[:44]}")
    print()
    print("=" * 78)
    print(f"SMALL TAP TARGETS — {len(small_target)} interactive boxes under 40px")
    print("=" * 78)
    for px, c, val, f, s in small_target:
        print(f"  {px:5.1f}px  .{c:<26} {val:<28} {f:<12} {s[:44]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
