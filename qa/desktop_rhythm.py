#!/usr/bin/env python3
"""Vertical-rhythm auditor — finds empty bands ("gaps") on a page.

For a list of top-level blocks, resolves the WINNING box model at a desktop
width and flags combinations that leave visible empty space:
  · min-height far larger than the block can plausibly need
  · padding-block + margin-block that stacks into a big blank band between
    two adjacent sections
  · a `calc(100vh - Xpx)` min-height whose X disagrees with the real chrome
  · negative margins that fight an adjacent section's padding

  python3 qa/desktop_rhythm.py --width 1440 --blocks hero,catbar-outer,...
"""
import argparse, re, sys
from collections import defaultdict
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import mobile_audit as M

VPROPS = ("min-height", "height", "padding", "padding-top", "padding-bottom",
          "margin", "margin-top", "margin-bottom", "gap", "row-gap")


def winner(entries, prop, W, H):
    eff = None
    for f, order, s, d, stack in entries:
        if not all(M.media_matches(pre, W, H, "fine") for k, pre in stack if k == "media"):
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


def vpx(val, H, W=1440):
    """Resolve the vertical component(s) of a box value to px, expanding vh."""
    if not val:
        return None
    v = val.strip()
    v = re.sub(r"calc\(([^)]*)\)", lambda m: m.group(1), v)
    v = v.replace("env(safe-area-inset-bottom,0px)", "0px")
    v = re.sub(r"env\([^)]*\)", "0px", v)
    v = re.sub(r"clamp\(([^,]*),([^,]*),([^)]*)\)", lambda m: m.group(3), v)
    v = re.sub(r"min\(([^)]*)\)", lambda m: m.group(1).split(",")[-1], v)
    out = []
    for tok in v.split():
        tok = tok.strip().rstrip(";")
        # The unit is OPTIONAL: a bare `0` is a valid CSS length. v98 fix — the
        # old pattern required a unit, so `margin: 0 -4vw` parsed to [-57.6]
        # instead of [0.0, -57.6]. Losing a token corrupts shorthand POSITION,
        # which made side() read the horizontal value as the vertical one.
        m = re.match(r"^(-?[\d.]+)(px|vh|svh|dvh|lvh|vw|rem|em|%)?$", tok)
        if not m:
            continue
        n, u = float(m.group(1)), m.group(2)
        if u is None:
            if n == 0:
                out.append(0.0)      # unitless zero: keep the slot
            continue                 # any other unitless number is not a length
        if u == "px":
            out.append(n)
        elif u in ("vh", "svh", "dvh", "lvh"):
            out.append(n * H / 100)
        elif u in ("rem", "em"):
            out.append(n * 16)
        elif u == "vw":
            out.append(n * W / 100)  # was hardcoded to 1440
        elif u == "%":
            continue                 # % of an unknown containing block
    return out


def side(vals, idx_want, count):
    """CSS box shorthand: pick a vertical side (top / bottom).

    1 value  -> all four sides
    2 values -> [top+bottom, left+right]     <- bottom is vals[0], NOT vals[1]
    3 values -> [top, left+right, bottom]
    4 values -> [top, right, bottom, left]

    v98 fix: the 2-value case used to return vals[1] for bottom, which is the
    HORIZONTAL value. That made `.rev-marquee { margin: 0 -4vw }` — a full-bleed
    trick with zero vertical margin — report as a -58px negative bottom margin
    and raise a bogus "pulls the next block up over it" warning.
    """
    if not vals:
        return 0.0
    n = len(vals)
    if n == 1:
        return vals[0]
    if n == 2:
        return vals[0]
    return vals[0] if idx_want == "top" else vals[2]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--blocks", default="")
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

    by_class = defaultdict(list)
    for f, order, sel, d, stack in rules:
        for s in M.split_selectors(sel):
            subj = M.subject(s)
            for c in set(re.findall(r"\.([_a-zA-Z][\w-]*)", subj or s)):
                by_class[c].append((f, order, s, d, stack))

    blocks = [b.strip().lstrip(".") for b in a.blocks.split(",") if b.strip()]
    print(f"vertical rhythm at {W}×{H}px\n" + "=" * 92)
    prev_bottom = 0.0
    total_gap = 0.0
    for b in blocks:
        e = by_class.get(b)
        if not e:
            print(f"\n.{b:<20} (no CSS found)")
            continue
        got = {p: winner(e, p, W, H) for p in VPROPS}
        pt = got["padding-top"] or got["padding"]
        pb = got["padding-bottom"] or got["padding"]
        mt = got["margin-top"] or got["margin"]
        mb = got["margin-bottom"] or got["margin"]
        pad_v = (side(vpx(pt[1], H, W), "top", None) if pt else 0) + \
                (side(vpx(pb[1], H, W), "bottom", None) if pb else 0)
        mar_top = side(vpx(mt[1], H, W), "top", None) if mt else 0
        mar_bot = side(vpx(mb[1], H, W), "bottom", None) if mb else 0
        mh = got["min-height"] or got["height"]
        mh_px = None
        if mh:
            vals = vpx(mh[1], H, W)
            if vals:
                mh_px = max(vals)
        # the blank band between this block's top edge and the previous
        # block's bottom edge = previous margin-bottom + this margin-top
        band = max(prev_bottom, 0) + max(mar_top, 0)
        flags = []
        if mh_px and mh_px >= H * 0.85:
            flags.append(f"min-height {mh[1]} ≈ {mh_px:.0f}px — ≥85% of the viewport; "
                         f"if its content is shorter this is a blank band")
        if "100vh" in (mh[1] if mh else "") or "vh" in (mh[1] if mh else ""):
            flags.append(f"viewport-relative min-height: {mh[1]}")
        if pad_v >= 160:
            flags.append(f"padding-block resolves to {pad_v:.0f}px")
        if band >= 90:
            flags.append(f"{band:.0f}px of stacked margin above this block")
        if mar_bot <= -20:
            flags.append(f"margin-bottom {mb[1]} pulls the NEXT block up over it")
        print(f"\n.{b:<20} pad-block≈{pad_v:>5.0f}px  mar-top≈{mar_top:>5.0f}px  "
              f"mar-bot≈{mar_bot:>5.0f}px  min-h={mh[1] if mh else '—'}")
        for f_ in flags:
            print(f"   ⚠ {f_}")
            total_gap += 1
        prev_bottom = mar_bot
    print("\n" + "=" * 92)
    print(f"{total_gap} rhythm warnings across {len(blocks)} blocks")


if __name__ == "__main__":
    main()
