#!/usr/bin/env python3
"""
mobile_smooth.py — scroll/animation cost auditor for the Shivaa storefront.

Companion to mobile_audit.py (structure) and mobile_legibility.py (type/tap).
This one measures the things that make a phone feel *slow* rather than look
wrong. Everything here is a compositor-vs-main-thread question:

  A. layout-triggering transitions/animations — animating width/height/top/
     left/margin/padding forces layout + paint on EVERY frame. On a mid-range
     handset that is the difference between 60fps and 20fps. transform/opacity
     are the only two properties that stay on the compositor.
  B. `transition: all` — animates every property, including the layout ones
     above, whether you meant to or not. Also defeats the browser's ability to
     skip work.
  C. backdrop-filter — re-blurs the backdrop on every frame of a scroll. Very
     expensive on mobile GPUs; a near-opaque panel does not need it at all.
  D. press-feedback coverage — on touch there is no :hover, so :active is the
     only confirmation a tap registered. Missing it makes an app feel dead.
  E. prefers-reduced-motion coverage — a vestibular-safety requirement, and the
     marker of a motion system that was designed rather than sprinkled.
  F. will-change discipline — a permanent will-change on many elements pins
     layers in GPU memory and can make scrolling *worse*. It should be rare.

Usage:
  python3 qa/mobile_smooth.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CMS = ROOT / "cms"
# order must match index.html's <link> order so "last wins" is truthful
CSS_FILES = ["fonts.css", "styles.css", "hallmark.css", "trust.css", "finale.css",
             "motion.css", "mobile.css"]

# properties that invalidate layout when animated
LAYOUT_PROPS = {"width", "height", "min-width", "min-height", "max-width", "max-height",
                "top", "right", "bottom", "left", "margin", "margin-top", "margin-right",
                "margin-bottom", "margin-left", "padding", "padding-top", "padding-right",
                "padding-bottom", "padding-left", "font-size", "line-height", "border-width",
                "flex", "flex-basis", "grid-template-columns", "grid-template-rows"}
# cheap: compositor-only
COMPOSITOR_PROPS = {"transform", "opacity", "filter"}


def strip_comments(t):
    return re.sub(r"/\*.*?\*/", "", t, flags=re.S)


def rules(text):
    """Yield (selector, declarations, media_stack) for every rule, comments gone."""
    out, stack, buf, i, n = [], [], "", 0, len(text)
    while i < n:
        c = text[i]
        if c == "{":
            head = buf.strip()
            buf = ""
            if head.startswith("@"):
                stack.append(head)
                i += 1
                continue
            j, depth = i + 1, 1
            while j < n and depth:
                if text[j] == "{":
                    depth += 1
                elif text[j] == "}":
                    depth -= 1
                j += 1
            out.append((head, text[i + 1:j - 1], tuple(stack)))
            i = j
            continue
        if c == "}":
            if stack:
                stack.pop()
            buf = ""
            i += 1
            continue
        buf += c
        i += 1
    return out


def is_implicit_all(value):
    """True when a transition shorthand names no property at all.

    `transition: .25s` and `transition: .3s var(--ease)` are both legal CSS and
    both mean `all` — the property is simply omitted. This is easy to miss when
    grepping for the literal word `all`, and styles.css contains 80+ of them.
    """
    for chunk in value.split(","):
        toks = chunk.strip().split()
        if not toks:
            continue
        if re.match(r"^[\d.]+m?s$", toks[0]) or \
           toks[0].startswith(("cubic-bezier", "var(", "ease", "linear", "steps")):
            return True
    return False


def animated_props(decl):
    """Every property named in transition/animation shorthand within a rule."""
    props = set()
    for m in re.finditer(r"transition\s*:\s*([^;}]+)", decl):
        for chunk in m.group(1).split(","):
            toks = chunk.strip().split()
            if not toks:
                continue
            first = toks[0]
            # a bare duration means "all"
            if re.match(r"^[\d.]+m?s$", first) or first in ("none", "inherit", "initial"):
                continue
            props.add(first)
    for m in re.finditer(r"transition-property\s*:\s*([^;}]+)", decl):
        for p in m.group(1).split(","):
            props.add(p.strip())
    return props


def main():
    findings = {"layout_anim": [], "trans_all": [], "backdrop": [],
                "will_change": [], "no_active": []}
    reduced_blocks = 0
    interactive_with_active = set()
    interactive_seen = set()

    for fname in CSS_FILES:
        fp = CMS / "css" / fname
        if not fp.exists():
            continue
        raw = fp.read_text(encoding="utf-8", errors="replace")
        reduced_blocks += len(re.findall(r"prefers-reduced-motion", raw))
        text = strip_comments(raw)
        for sel, decl, stack in rules(text):
            if not decl.strip():
                continue
            # B · transition: all — explicit, or implicit (property omitted)
            tm = re.search(r"transition\s*:\s*([^;}]+)", decl)
            if re.search(r"transition\s*:\s*all\b", decl) or \
               re.search(r"transition-property\s*:\s*all\b", decl):
                findings["trans_all"].append((fname, sel.strip()[:58], "explicit"))
            elif tm and is_implicit_all(tm.group(1)):
                findings["trans_all"].append((fname, sel.strip()[:58], "implicit"))
            # A · layout-triggering animated properties
            for p in animated_props(decl):
                if p in LAYOUT_PROPS:
                    findings["layout_anim"].append((fname, sel.strip()[:60], p))
                    break
            # C · backdrop-filter — record the blur radius, because COUNTING
            # these is misleading: v99 added four declarations that are far
            # cheaper than the ones they override. Cost tracks radius x area x
            # whether the surface moves during a scroll, not how many rules exist.
            bm = re.search(r"(?<!-)backdrop-filter\s*:\s*([^;}]+)", decl)
            if bm and "none" not in bm.group(1):
                r = re.search(r"blur\((\d+(?:\.\d+)?)px\)", bm.group(1))
                findings["backdrop"].append(
                    (fname, sel.strip()[:56], float(r.group(1)) if r else 0.0))
            # F · will-change
            if re.search(r"will-change\s*:\s*(?!auto)", decl):
                findings["will_change"].append((fname, sel.strip()[:70]))
            # D · press feedback: note interactive-looking selectors
            for s in re.split(r",(?![^(]*\))", sel):
                s = s.strip()
                base = re.sub(r":.*$", "", s).strip()
                if not base or base.startswith("@"):
                    continue
                if re.search(r"\b(button|\.btn|a\b|\.tab|\.chip|-btn|\.pill|\.tile|\binput\b)", base):
                    interactive_seen.add(base)
                    if ":active" in s:
                        interactive_with_active.add(base)

    W = 78
    print("mobile smoothness audit — compositor cost & touch feedback")
    print("=" * W)

    def head(n, title):
        print(f"\n{'=' * W}\n{n}. {title}\n{'=' * W}")

    head("A", f"LAYOUT-TRIGGERING ANIMATIONS — {len(findings['layout_anim'])}")
    print("   animating these forces layout+paint every frame; use transform/opacity")
    for f, s, p in findings["layout_anim"][:40]:
        print(f"   {f:<12} {s:<58} → {p}")

    ex = sum(1 for x in findings["trans_all"] if x[2] == "explicit")
    im = len(findings["trans_all"]) - ex
    head("B", f"transition: all — {len(findings['trans_all'])} ({ex} explicit, {im} implicit)")
    print("   `transition:.25s` with no property named is also `all`; grep misses these")
    for f, s, kind in findings["trans_all"][:24]:
        print(f"   {f:<12} {s:<58} {kind}")
    if len(findings["trans_all"]) > 24:
        print(f"   … and {len(findings['trans_all']) - 24} more")

    tot_blur = sum(x[2] for x in findings["backdrop"])
    head("C", f"backdrop-filter — {len(findings['backdrop'])} rules, "
              f"{tot_blur:.0f}px of total blur radius")
    for f, s, r in sorted(findings["backdrop"], key=lambda x: -x[2])[:22]:
        print(f"   {f:<12} {s:<56} blur({r:.0f}px)")

    head("D", f"will-change — {len(findings['will_change'])}")
    for f, s in findings["will_change"][:20]:
        print(f"   {f:<12} {s}")

    head("E", f"prefers-reduced-motion blocks — {reduced_blocks}")
    missing = sorted(interactive_seen - interactive_with_active)
    head("F", f"interactive selectors WITHOUT an :active rule — {len(missing)}")
    for s in missing[:40]:
        print(f"   {s[:70]}")

    print(f"\n{'=' * W}")
    print(f"layout-anim {len(findings['layout_anim'])} · transition:all "
          f"{len(findings['trans_all'])} · backdrop {len(findings['backdrop'])} · "
          f"will-change {len(findings['will_change'])} · reduced-motion {reduced_blocks} · "
          f"no-:active {len(missing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
