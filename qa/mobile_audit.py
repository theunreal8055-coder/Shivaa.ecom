#!/usr/bin/env python3
"""Mobile-friendliness auditor for the Shivaa cms — cascade simulator.

Instead of guessing from breakpoints, this evaluates the real CSS cascade at a
set of phone widths and reports, per element class, the *winning* declaration
that is still risky on a small screen.

Model
  · every stylesheet block is parsed with its full @media stack
  · a media stack "applies at width W" when all its features match W
    (max-width / min-width / max-height / orientation / pointer / hover)
  · specificity + source order + !important decide the winner per property
  · the "subject" of a selector is its last compound (`.hero h1` → h1), so
    coverage is credited to the element actually being styled
  · inline style="…" from the JS templates is audited separately

Run: python3 qa/mobile_audit.py [--widths 320,360,390,430] [--json out.json]
"""
import argparse, json, re, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CMS = ROOT / "cms"
# MUST match the <link> order in cms/index.html — source order decides ties.
CSS_FILES = ["styles.css", "hallmark.css", "trust.css", "finale.css",
             "bot.css", "motion.css", "mobile.css"]
JS_FILES = ["app.js", "admin.js", "bot.js", "auth.js", "motion.js",
            "hallmark.js", "trust.js", "qr.js"]

# ------------------------------------------------------------------ CSS parse
def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def parse_blocks(css, media_stack=(), order=None):
    if order is None:
        order = [0]

    out, i, n = [], 0, len(css)
    while i < n:
        if css[i].isspace():
            i += 1
            continue
        ch = css[i]
        if ch == "@":
            m = re.match(r"@([a-zA-Z-]+)\s*([^{;]*)", css[i:])
            if not m:
                i += 1
                continue
            at, prelude = m.group(1), m.group(2).strip()
            j = i + m.end()
            if j < n and css[j] == "{":
                depth, k = 1, j + 1
                while k < n and depth:
                    if css[k] == "{":
                        depth += 1
                    elif css[k] == "}":
                        depth -= 1
                    k += 1
                inner = css[j + 1:k - 1]
                stack = media_stack + ((at, prelude),) if at in (
                    "media", "supports", "container") else media_stack
                out += parse_blocks(inner, stack, order)
                i = k
                continue
            i = j
            continue
        if ch == "}":
            i += 1
            continue
        brace = css.find("{", i)
        if brace < 0:
            break
        at_before = css.find("@", i, brace)
        if 0 <= at_before < brace and not css[i:at_before].strip():
            i = at_before
            continue
        depth, k = 1, brace + 1
        while k < n and depth:
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
            k += 1
        sel, body = css[i:brace].strip(), css[brace + 1:k - 1].strip()
        if sel and not sel.startswith("@"):
            order[0] += 1
            out.append((sel, body, media_stack, order[0]))
        i = k
    return out


def decls(body):
    d = {}
    for part in body.split(";"):
        if ":" not in part:
            continue
        p, v = part.split(":", 1)
        p, v = p.strip().lower(), v.strip()
        imp = v.lower().endswith("!important")
        if imp:
            v = re.sub(r"!important\s*$", "", v, flags=re.I).strip()
        d[p] = (v, imp)
    return d


def split_selectors(sel):
    parts, depth, cur = [], 0, ""
    for ch in sel:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    return [p.strip() for p in parts if p.strip()]


def subject(sel):
    """Last compound of a selector: '.hero h1' -> 'h1', '.a.b > .c' -> '.c'."""
    s = re.sub(r"::?[a-zA-Z-]+(\([^)]*\))?", " ", sel)   # drop pseudo
    s = re.sub(r"\[[^\]]*\]", " ", s)                     # drop attrs
    toks = re.split(r"[\s>+~]+", s.strip())
    return toks[-1] if toks else ""


def specificity(compound):
    a = len(re.findall(r"#", compound))
    b = len(re.findall(r"\.[\w-]+", compound)) + len(re.findall(r"\[[^\]]*\]", compound))
    c = len(re.findall(r"(?:^|[\s>+~])([a-zA-Z][\w-]*)", " " + compound))
    return (a, b, c)


# --------------------------------------------------------------- media engine
LEN = re.compile(r"(-?\d+(?:\.\d+)?)(px|em|rem|cm|mm|in|pt|pc)")


def to_px(s):
    m = LEN.search(s)
    if not m:
        return None
    v, u = float(m.group(1)), m.group(2)
    return v * {"px": 1, "em": 16, "rem": 16, "pt": 96 / 72,
                "pc": 16, "mm": 96 / 25.4, "cm": 96 / 2.54, "in": 96}[u]


def media_matches(prelude, W, H, pointer):
    """Evaluate the common media features we actually use."""
    pre = prelude.lower().replace("and", " and ")
    feats = re.findall(r"\(\s*([a-z-]+)\s*(?::\s*([^)]*))?\)", pre)
    if not feats:
        return True
    negated = "not" in pre.split("(")[0]
    ok = True
    for name, val in feats:
        name, val = name.strip(), (val or "").strip()
        if name == "max-width":
            p = to_px(val)
            ok &= p is None or W <= p
        elif name == "min-width":
            p = to_px(val)
            ok &= p is None or W >= p
        elif name == "width":
            p = to_px(val)
            ok &= p is None or W == p
        elif name == "max-height":
            p = to_px(val)
            ok &= p is None or H <= p
        elif name == "min-height":
            p = to_px(val)
            ok &= p is None or H >= p
        elif name == "orientation":
            ok &= (val == "landscape") == (W >= H)
        elif name == "pointer":
            if val:
                ok &= (pointer == "coarse") == (val == "coarse")
        elif name == "hover":
            if val:
                ok &= (pointer == "fine") == (val == "hover")
        elif name in ("prefers-reduced-motion", "prefers-color-scheme",
                      "scripting", "print", "screen"):
            pass            # assume the default / non-print branch applies
        else:
            ok &= True      # unknown feature: assume satisfied (conservative)
    return (not ok) if negated else ok


# ------------------------------------------------------------------- risk set
def px_only(v):
    m = re.match(r"^(-?\d+(?:\.\d+)?)px$", v.strip())
    return float(m.group(1)) if m else None


def risky(prop, val, W):
    v = val.strip().lower()
    if prop in ("width", "min-width"):
        x = px_only(val)
        if x is not None and x > W - 24:
            return f"{prop}:{val} — wider than a {W}px phone's content box"
    if prop == "grid-template-columns":
        if "none" in v or v in ("1fr", "auto"):
            return None
        fixed = re.findall(r"(\d+(?:\.\d+)?)px", val)
        if fixed and sum(float(f) for f in fixed) + 20 > W - 24:
            return f"grid-template-columns:{val} — fixed px tracks overflow {W}px"
        r = re.match(r"repeat\(\s*(\d+)\s*,\s*([^)]*)\)", v)
        if r:
            cnt, inner = int(r.group(1)), r.group(2)
            mm = re.search(r"minmax\(\s*(\d+)px", inner)
            need = int(mm.group(1)) if mm else None
            if cnt >= 3 and (W <= 430):
                if need is None or cnt * need > W - 24:
                    return f"grid-template-columns:{val} — {cnt} tracks on a {W}px phone"
            if cnt == 2 and need and 2 * need > W - 24:
                return f"grid-template-columns:{val} — 2×{need}px overflows {W}px"
        else:
            mm = re.search(r"minmax\(\s*(\d+)px", v)
            if mm and int(mm.group(1)) > W - 24:
                return f"grid-template-columns:{val} — min track {mm.group(1)}px > {W}px"
            tracks = [t for t in re.split(r"\s+", v) if t and "repeat" not in t]
            if len(tracks) >= 3 and W <= 430:
                return f"grid-template-columns:{val} — {len(tracks)} tracks on a {W}px phone"
    if prop == "white-space" and "nowrap" in v:
        return "white-space:nowrap — can force horizontal page overflow"
    # NOTE: nowrap is only dangerous when the box cannot shrink. The caller
    # suppresses this finding when the winning cascade for the same element
    # also provides overflow/text-overflow/min-width:0 — see nowrap_is_safe().
    if prop == "font-size":
        x = px_only(val)
        if x is not None and x >= 40:
            return f"font-size:{val} — oversized for a phone"
        if "clamp(" in v or "vw" in v:
            top = re.findall(r"(\d+(?:\.\d+)?)px", val)
            if top:
                eff = max(float(v.replace("px", "")) * (W / 100)
                          for v in re.findall(r"(\d+(?:\.\d+)?)vw", val)) if "vw" in v else 0
                lo = float(top[0])
                hi = float(top[-1])
                if min(max(lo, eff), hi) >= 38:
                    return f"font-size:{val} — resolves ≥38px at {W}px"
    if prop in ("padding", "padding-inline", "gap", "column-gap", "row-gap"):
        nums = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)px", val)]
        if nums and max(nums) >= 60:
            return f"{prop}:{val} — {max(nums):.0f}px gutter eats a {W}px screen"
    if prop == "flex" and re.search(r"0\s+0\s+(\d{3,})px", v):
        x = int(re.search(r"0\s+0\s+(\d{3,})px", v).group(1))
        if x > W * 0.6:
            return f"flex:{val} — rigid {x}px basis"
    if prop == "height" and "px" in v:
        x = px_only(val)
        if x is not None and x > 560:
            return f"height:{val} — taller than most phone viewports"
    return None


# ------------------------------------------------------------------ used list
def used_classes():
    used = defaultdict(list)
    files = ["index.html"] + [f"js/{j}" for j in JS_FILES]
    for f in files:
        p = CMS / f
        if not p.exists():
            continue
        t = p.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"class(?:Name)?\s*=\s*[\"'`]([^\"'`]*)[\"'`]", t):
            for c in m.group(1).split():
                if "${" in c or "{" in c:
                    continue
                if re.match(r"^[A-Za-z_][\w-]*$", c):
                    used[c].append(f)
        for m in re.finditer(r"classList\.(?:add|remove|toggle)\(([^)]*)\)", t):
            for c in re.findall(r"[\"']([\w-]+)[\"']", m.group(1)):
                used[c].append(f)
    return used


def inline_styles():
    """style="…" attributes in templates that hard-code phone-hostile layout."""
    bad = []
    files = ["index.html"] + [f"js/{j}" for j in JS_FILES]
    for f in files:
        p = CMS / f
        if not p.exists():
            continue
        for m in re.finditer(r"style\s*=\s*[\"']([^\"']{4,400})[\"']",
                             p.read_text(encoding="utf-8", errors="replace")):
            s = m.group(1)
            if "${" in s:
                s = re.sub(r"\$\{[^}]*\}", "1", s)
            for d in s.split(";"):
                if ":" not in d:
                    continue
                pr, vl = d.split(":", 1)
                pr = pr.strip().lower()
                if pr == "grid-template-columns":
                    r = re.match(r"repeat\(\s*(\d+)", vl.strip())
                    n = int(r.group(1)) if r else len(vl.split())
                    if n >= 3:
                        bad.append((f, pr, vl.strip(), m.group(1)[:110]))
                elif pr in ("width", "min-width"):
                    x = px_only(vl)
                    if x and x >= 320:
                        bad.append((f, pr, vl.strip(), m.group(1)[:110]))
    return bad


# ---------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--widths", default="320,360,390,430")
    ap.add_argument("--json", default=None)
    ap.add_argument("--only", default=None, help="comma list of classes")
    a = ap.parse_args()
    widths = [int(x) for x in a.widths.split(",")]
    only = set(a.only.split(",")) if a.only else None

    rules = []                      # (file, order, sel, decls, stack)
    seq = [0]                       # ONE global counter: real load order wins ties
    for f in CSS_FILES:
        p = CMS / "css" / f
        if not p.exists():
            continue
        for sel, body, stack, order in parse_blocks(
                strip_comments(p.read_text(encoding="utf-8", errors="replace")),
                (), seq):
            rules.append((f, order, sel, decls(body), stack))

    used = used_classes()

    # subject-class index
    by_class = defaultdict(list)
    for f, order, sel, d, stack in rules:
        for s in split_selectors(sel):
            subj = subject(s)
            if not subj:
                continue
            for c in set(re.findall(r"\.([_a-zA-Z][\w-]*)", subj)):
                by_class[c].append((f, order, s, d, stack))

    report = {}
    for c, entries in by_class.items():
        if c not in used:
            continue
        if only and c not in only:
            continue
        findings = []
        for W in widths:
            H = 780 if W <= 430 else 900
            # effective declarations at this width (ignore :hover-only rules)
            eff = {}
            for f, order, s, d, stack in entries:
                if not all(media_matches(pre, W, H, "coarse")
                           for k, pre in stack if k == "media"):
                    continue
                if re.search(r":hover", s):
                    continue
                spec = specificity(s)
                for prop, (val, imp) in d.items():
                    key = (1 if imp else 0, spec, order)
                    cur = eff.get(prop)
                    if cur is None or key > cur[0]:
                        eff[prop] = (key, val, imp, f, s)
            for prop, (key, val, imp, f, s) in eff.items():
                r = risky(prop, val, W)
                if not r:
                    continue
                # `nowrap` is only a hazard when the box cannot shrink. If the
                # winning cascade also clips/ellipsises it, or gives it a zero
                # minimum so its flex/grid parent can compress it, the overflow
                # is already contained — that is a fix, not a defect.
                if prop == "white-space":
                    guard = {p: eff[p][1] for p in
                             ("overflow", "overflow-x", "text-overflow", "min-width")
                             if p in eff}
                    contained = (
                        "hidden" in guard.get("overflow", "") or
                        "clip" in guard.get("overflow", "") or
                        "hidden" in guard.get("overflow-x", "") or
                        "clip" in guard.get("overflow-x", "") or
                        guard.get("min-width") == "0"
                    )
                    if contained:
                        continue
                findings.append({"w": W, "prop": prop, "val": val,
                                 "risk": r, "file": f, "sel": s,
                                 "important": imp})
        if findings:
            # collapse: keep the narrowest width finding per property
            best = {}
            for fd in findings:
                k = fd["prop"]
                if k not in best or fd["w"] < best[k]["w"]:
                    best[k] = fd
            report[c] = {"files": sorted({e[0] for e in entries}),
                         "used_in": sorted(set(used[c]))[:3],
                         "issues": list(best.values())}

    inline = inline_styles()

    order_cls = sorted(report, key=lambda c: (-len(report[c]["issues"]), c))
    total = sum(len(report[c]["issues"]) for c in order_cls)
    print(f"widths tested      : {widths}")
    print(f"css rules parsed   : {len(rules)}")
    print(f"classes in markup  : {len(used)}")
    print(f"classes w/ issues  : {len(order_cls)}   ({total} winning risky declarations)")
    print(f"hostile inline styles: {len(inline)}")
    print("=" * 78)
    for c in order_cls:
        info = report[c]
        print(f"\n.{c}   css:{','.join(info['files'])}  used:{','.join(info['used_in'])}")
        for fd in info["issues"]:
            print(f"   @{fd['w']}px  {fd['risk']}")
            print(f"          ← {fd['file']}  {fd['sel'][:100]}")
    if inline:
        print("\n" + "=" * 78)
        print("INLINE style=\"…\" that fights the phone layout")
        seen = set()
        for f, pr, vl, ctx in inline:
            k = (pr, vl)
            if k in seen:
                continue
            seen.add(k)
            print(f"   {f}: {pr}:{vl}    …{ctx}")
    if a.json:
        Path(a.json).write_text(json.dumps({"classes": report, "inline": inline}, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
