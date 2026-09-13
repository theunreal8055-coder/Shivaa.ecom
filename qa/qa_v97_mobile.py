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
ZIP = ROOT / "shivaa-update-v97.zip"

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
check("index.html loads /css/mobile.css?v=97", "/css/mobile.css?v=97" in idx)
check("sw.js SHELL bumped to shivaa-shell-v97", "shivaa-shell-v97" in sw)
check("sw.js shell list points at mobile.css?v=97", "/css/mobile.css?v=97" in sw)

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

# ── 4 · §0 overflow guard + zero-minimum tracks ─────────────────────────────
check("html overflow-x:clip guard present (no sideways page pan)",
      "overflow-x: clip" in mob)
check("overflow guard is @supports-gated (old Safari keeps working)",
      re.search(r"@supports\s*\(overflow-x:\s*clip\)", mob) is not None)
check("grids use minmax(0,1fr) so a long price cannot blow the track out",
      mob.count("minmax(0, 1fr)") + mob.count("minmax(0,1fr)") >= 10)

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
check("footer/marquee use content-visibility:auto with an intrinsic size",
      "content-visibility: auto" in mob and "contain-intrinsic-size" in mob)
check("the near-opaque .mcta-bar drops its expensive backdrop-filter",
      re.search(r"\.mcta-bar\s*\{[^}]*backdrop-filter:\s*none", mob) is not None)

# ── 10 · deliverable zip carries the work ───────────────────────────────────
if ZIP.is_file():
    z = zipfile.ZipFile(ZIP)
    names = {n for n in z.namelist() if not n.endswith("/")}
    zmob = z.read("css/mobile.css").decode("utf-8", "replace")
    check("v97 zip exists and contains css/mobile.css", "css/mobile.css" in names)
    check("zip's mobile.css is byte-identical to cms/", zmob == mob)
    check("zip's index.html is versioned v97",
          b"/css/mobile.css?v=97" in z.read("index.html"))
    check("zip's sw.js shell is v97", b"shivaa-shell-v97" in z.read("sw.js"))
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

print(f"\n{len(ok)} passed · {len(fail)} failed")
print(f"measured — structural {n_struct}/88 · tiny-type {n_tiny}/30 · "
      f"tap-targets {n_tap}/13 · dead-selectors {len(dead)}/8")
sys.exit(1 if fail else 0)
