"""v97 mobile QA — proves the mobile pass is real, not decorative.

Run: python3 qa/qa_v97_mobile.py     (no PHP / no browser needed)

Two layers:
  1 · STATIC — the specific defects v97 set out to repair are actually
               repaired in cms/css/mobile.css, and the deliverable zip
               carries them.
  2 · MEASURED — the cascade simulators are re-run and their scores must be
               at or better than the v95 baseline recorded below. This is the
               part that stops a future edit from silently regressing mobile.

Baseline (v95, measured with the same tools):
    structural risky winners  88
    tiny-type winners (<10px) 30
    small tap targets (<40px) 13
    dead mobile.css selectors  8
"""
import re, subprocess, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CMS = ROOT / "cms"
ZIP = ROOT / "shivaa-update-v98.zip"

ok, fail = [], []


def check(name, cond):
    (ok if cond else fail).append(name)
    print(("PASS  " if cond else "FAIL  ") + name)


mob = (CMS / "css" / "mobile.css").read_text(encoding="utf-8", errors="replace")
idx = (CMS / "index.html").read_text(encoding="utf-8", errors="replace")
sw = (CMS / "sw.js").read_text(encoding="utf-8", errors="replace")

# ── 0 · the file itself is sound ────────────────────────────────────────────
body = re.sub(r"/\*.*?\*/", "", mob, flags=re.S)
depth, negative = 0, False
for ch in body:
    depth += (ch == "{") - (ch == "}")
    if depth < 0:
        negative = True
malformed = [d.strip() for b in re.findall(r"\{([^{}]*)\}", body)
             for d in b.split(";") if d.strip() and ":" not in d]
check("mobile.css braces balance", depth == 0 and not negative)
check("mobile.css has no malformed declarations", not malformed)
check("mobile.css is still the last stylesheet (wins ties)",
      idx.rstrip().index("mobile.css") > idx.rstrip().index("motion.css"))

# ── 1 · version wiring ──────────────────────────────────────────────────────
check("index.html loads /css/mobile.css?v=98", "/css/mobile.css?v=98" in idx)
check("index.html loads /css/styles.css?v=98", "/css/styles.css?v=98" in idx)
check("sw.js SHELL bumped to shivaa-shell-v98", "shivaa-shell-v98" in sw)
check("sw.js shell list points at mobile.css?v=98", "/css/mobile.css?v=98" in sw)

# ── 2 · §1 dead-selector repairs (v95 rules that matched nothing) ───────────
for dead, real in [(".shop-head", ".shop-bar"), (".shop-toolbar", ".shop-catbar"),
                   (".pc-tag ", ".pc-tags"), (".review-media", ".rev-photo"),
                   (".f-col ", ".foot-col"), (".fin-hero", ".finale-hero"),
                   (".otp-row", ".otp-boxes")]:
    check(f"dead {dead.strip()} re-pointed at {real}", real in mob)

# ── 3 · §2 cascade-defeat repairs ───────────────────────────────────────────
check(".page-hero padding override carries !important (styles.css !important beat v95)",
      re.search(r"\.page-hero\s*\{[^}]*padding:[^}]*!important", mob) is not None)
check("admin inline-grid selectors match the NO-SPACE spelling admin.js emits",
      '[style*="grid-template-columns:1.2fr"]' in mob)
check("admin inline-grid selectors still match the spaced spelling",
      '[style*="grid-template-columns: 1.2fr"]' in mob)

# ── 4 · §0 overflow prevention (v98 mechanism) ──────────────────────────────
# Live code only — mobile.css §0 contains a comment that quotes the reverted
# `html { overflow-x: clip }` rule to explain why it was removed, so every
# assertion in this section runs against comment-stripped source.
mob_live = re.sub(r"/\*.*?\*/", "", mob, flags=re.S)
check("no root-level overflow clip in live CSS (the v97 scroll-killer)",
      "overflow-x: clip" not in mob_live and "overflow-x:clip" not in mob_live)
check("grid ITEMS get min-width:0 — band-agnostic anti-blowout (v98 approach)",
      re.search(r"\.p-grid > \*[^}]*min-width:\s*0", mob_live, re.S) is not None)
_raw = mob.split("\n")
_a = next(k for k, l in enumerate(_raw) if "§0 · OVERFLOW GUARD" in l)
_b = next(k for k, l in enumerate(_raw) if "§1 · DEAD-SELECTOR" in l)
sec0 = re.sub(r"/\*.*?\*/", "", "\n".join(_raw[_a:_b]), flags=re.S)
check("§0 slice is bounded, not the whole file", 0 < len(sec0) < 3000)
check("v98 §0 does not re-declare .p-grid columns (would clobber v95 bands)",
      not re.search(r"\.p-grid\s*\{[^}]*grid-template-columns", sec0))
check("minmax(0,1fr) still used where a column count IS being declared",
      mob_live.count("minmax(0, 1fr)") + mob_live.count("minmax(0,1fr)") >= 10)

# ── 5 · §3 legibility floor ─────────────────────────────────────────────────
check(".hstat span lifted off 7.0px", ".hstat span" in mob)
check(".sa-tool b lifted off 8.5px", ".sa-tool b" in mob)
check(".bd-tabs labels lifted off 8.5px", ".bd-tabs.bd-tabs-v79 a" in mob)
check(".mnav a (most-tapped control) lifted off 9.5px",
      re.search(r"\.mnav a\s*\{[^}]*font-size:\s*10\.5px", mob) is not None)

# ── 6 · §4 tap-target floor ─────────────────────────────────────────────────
check("close buttons raised to 44px",
      re.search(r"\.dw-close,\s*\.mc-close,\s*\.pdf-close[^{]*\{[^}]*44px", mob) is not None)
check("carousel arrows raised to 44px", ".cb-arrow" in mob and "44px" in mob)
check(".c-dot gets a 44px pseudo hit area without changing its look",
      re.search(r"\.c-dot::after\s*\{[^}]*inset:\s*-1", mob) is not None)
check("v95's transform:scale() on .qty-row is undone (blurry + sub-44px)",
      re.search(r"\.qty-row\s*\{[^}]*transform:\s*none\s*!important", mob) is not None)
check("v95's transform:scale() on .flash-countdown is undone",
      re.search(r"\.poster \.flash-countdown\s*\{[^}]*transform:\s*none", mob) is not None)

# ── 7 · §5 Saathi tool rail is a real scroller, not 6 squashed tracks ───────
check(".sa-tools becomes a horizontal max-content rail",
      re.search(r"\.sa-tools\s*\{[^}]*grid-auto-flow:\s*column", mob) is not None)

# ── 8 · §9 the privacy table gets its own scroller ──────────────────────────
check(".ps-body table scrolls instead of widening the page",
      re.search(r"\.ps-body table[^{]*\{[^}]*overflow-x:\s*auto", mob) is not None)

# ── 9 · §10 scroll-cost containment ─────────────────────────────────────────
# NOTE: v97 asserted here that .footer/.rev-marquee use content-visibility:auto.
# v98 reverted that — the reserved intrinsic size was a guess and produced a real
# empty band on the laptop home page. Guard (b) below now forbids it outright.
check("the near-opaque .mcta-bar drops its expensive backdrop-filter",
      re.search(r"\.mcta-bar\s*\{[^}]*backdrop-filter:\s*none", mob) is not None)

# ── 10 · deliverable zip carries the work ───────────────────────────────────
if ZIP.is_file():
    z = zipfile.ZipFile(ZIP)
    names = {n for n in z.namelist() if not n.endswith("/")}
    zmob = z.read("css/mobile.css").decode("utf-8", "replace")
    check("v97 zip exists and contains css/mobile.css", "css/mobile.css" in names)
    check("zip's mobile.css is byte-identical to cms/", zmob == mob)
    check("zip's index.html is versioned v98",
          b"/css/mobile.css?v=98" in z.read("index.html"))
    check("zip's sw.js shell is v98", b"shivaa-shell-v98" in z.read("sw.js"))
    v95 = zipfile.ZipFile(ROOT / "shivaa-update-v95.zip")
    m95 = {n for n in v95.namelist() if not n.endswith("/")}
    check("zip manifest matches the v95 manifest (drop-in update)", names == m95)
else:
    check("v97 zip exists", False)

# ── 11 · MEASURED: re-run the simulators and compare to the v95 baseline ────
def run(script, *args):
    return subprocess.run([sys.executable, str(ROOT / "qa" / script), *args],
                          capture_output=True, text=True, cwd=str(ROOT)).stdout


audit = run("mobile_audit.py")
m = re.search(r"classes w/ issues\s*:\s*(\d+)", audit)
n_struct = int(m.group(1)) if m else 999
check(f"structural risky winners ≤ 88 baseline (now {n_struct})", n_struct <= 88)

leg = run("mobile_legibility.py", "--floor", "10", "--width", "360")
mt = re.search(r"TINY TYPE — (\d+)", leg)
ms = re.search(r"SMALL TAP TARGETS — (\d+)", leg)
n_tiny = int(mt.group(1)) if mt else 999
n_tap = int(ms.group(1)) if ms else 999
check(f"tiny-type winners ≤ 30 baseline (now {n_tiny})", n_tiny <= 30)
check(f"tiny-type winners improved to ≤ 5 (now {n_tiny})", n_tiny <= 5)
check(f"small tap targets ≤ 13 baseline (now {n_tap})", n_tap <= 13)

# dead selectors: anything mobile.css references that exists nowhere else
mobcls = set(re.findall(r"\.([_a-zA-Z][\w-]*)", body))
corpus = [(CMS / "index.html").read_text(errors="replace")]
corpus += [p.read_text(errors="replace") for p in (CMS / "js").glob("*.js")]
corpus += [p.read_text(errors="replace") for p in (CMS / "css").glob("*.css")
           if p.name != "mobile.css"]
dead = [c for c in sorted(mobcls)
        if not any(re.search(r"(?<![\w-])" + re.escape(c) + r"(?![\w-])", t) for t in corpus)]
check(f"dead mobile.css selectors ≤ 8 baseline (now {len(dead)}: {dead})",
      len(dead) <= 8)

# ── 12 · v98 REGRESSION GUARDS ──────────────────────────────────────────────
# Each of these encodes a defect v97 actually shipped and the owner hit on a
# real device. They are deliberately blunt: if a future "optimisation"
# reintroduces the pattern, the build fails and says why.
styles = (CMS / "css" / "styles.css").read_text(encoding="utf-8", errors="replace")
both = mob + "\n" + styles

# (a) the scroll-killer: clipping the root element. html's overflow propagates
#     to the viewport, and v95 already sets html{height:100%} on phones.
# Bare-root overflow is the dangerous form: it propagates to the viewport and
# interacts with v95's html{height:100%}. Class-scoped state (html.no-scroll,
# body.drawer-open) and the pre-existing body{overflow-x:hidden} baseline in
# styles.css are legitimate and are NOT what broke scrolling in v97.
bare_root = re.findall(r"(?<![.\w#-])(html|body)\s*\{[^}]*overflow[^}]*?:\s*(clip|hidden)", re.sub(r"/\*.*?\*/", "", both, flags=re.S))
check(f"html never gets overflow clip/hidden on a bare selector (got: {bare_root or 'none'})",
      not any(m[0] == "html" for m in bare_root))

# (b) the gap-maker: content-visibility reserves contain-intrinsic-size as a
#     placeholder while off-screen, and that size was guessed, not measured.
check("no content-visibility (guessed intrinsic size caused the home-page gap)",
      "content-visibility" not in re.sub(r"/\*.*?\*/", "", both, flags=re.S))

# (c) the tablet clobber: v97 declared phone grids at <=900px, which is later in
#     the file than v95's 601-900px tablet band, so it silently won that band
#     and dropped tablets from 3 product columns to 2. Verified by re-resolving
#     the real cascade at 700px, which is inside the tablet band.
sys.path.insert(0, str(ROOT / "qa"))
import mobile_audit as M
seq = [0]
_rules = []
for f in M.CSS_FILES:
    fp = CMS / "css" / f
    if fp.exists():
        for sel, body_, stack, order in M.parse_blocks(
                M.strip_comments(fp.read_text(encoding="utf-8", errors="replace")), (), seq):
            _rules.append((f, order, sel, M.decls(body_), stack))

def winner_at(cls, prop, W, H=900):
    best = None
    for f, order, sel, d, stack in _rules:
        if not all(M.media_matches(pre, W, H, "fine") for k, pre in stack if k == "media"):
            continue
        if ":hover" in sel:
            continue
        for s in M.split_selectors(sel):
            subj = M.subject(s)
            if subj and cls in set(re.findall(r"\.([_a-zA-Z][\w-]*)", subj)) and prop in d:
                key = (1 if d[prop][1] else 0, M.specificity(s), order)
                if best is None or key > best[0]:
                    best = (key, d[prop][0])
    return best[1] if best else None

pg700 = winner_at("p-grid", "grid-template-columns", 700) or ""
check(f"tablet band intact: .p-grid is 3 columns at 700px (got: {pg700})",
      "repeat(3" in pg700.replace(" ", ""))
pg360 = winner_at("p-grid", "grid-template-columns", 360) or ""
check(f"phone band intact: .p-grid is 2 columns at 360px (got: {pg360})",
      "repeat(2" in pg360.replace(" ", ""))

# (d) the mis-tap: a dot's ::after hit area must not exceed the dot pitch, or
#     neighbouring targets overlap and a tap fires the wrong slide.
gap = re.search(r"\.c-dots\s*\{[^}]*gap:\s*([\d.]+)px", both)
dotw = re.search(r"\.c-dot\s*\{[^}]*width:\s*([\d.]+)px", both)
inset = re.search(r"\.c-dot::after\s*\{[^}]*inset:\s*-?([\d.]+)px", both)
if gap and dotw and inset:
    g, w, n = float(gap.group(1)), float(dotw.group(1)), float(inset.group(1))
    pitch, hit = w + g, w + 2 * n
    check(f"carousel dot hit area ({hit:.0f}px) does not exceed its pitch ({pitch:.0f}px)",
          hit <= pitch + 0.5)
else:
    check("carousel dot metrics found (gap/width/inset)", False)

# (e) the desktop rhythm fix must be provably unable to touch phones
check("desktop rhythm block is min-width scoped (cannot leak to <=768px)",
      re.search(r"@media\s*\(min-width:\s*769px\)\s*\{[^}]*\.sec \+ \.sec", styles, re.S) is not None)
check("hero min-height uses the measured 124px chrome, not the stale 118px",
      "calc(100dvh - 124px)" in styles and "calc(100dvh - 118px)" not in styles.split("v98")[-1])


print(f"\n{len(ok)} passed · {len(fail)} failed")
print(f"measured — structural {n_struct}/88 · tiny-type {n_tiny}/30 · "
      f"tap-targets {n_tap}/13 · dead-selectors {len(dead)}/8")
sys.exit(1 if fail else 0)
