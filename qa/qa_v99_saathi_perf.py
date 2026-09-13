#!/usr/bin/env python3
"""
qa_v99_saathi_perf.py — gate for the v99 release.

v99 did two things:
  1. removed Saathi completely (the owner is bringing in a Gemini chatbot later)
  2. cut 370KB off the shopper's critical path and fixed the compositor costs
     that a static cascade audit can actually see

Removing a feature is the dangerous kind of change: the markup goes away easily,
but the references to it do not. Section 1 below exists because v99 nearly
shipped a button in the empty-category state that called
`Shivaa.saathiOpen(...)` — a function defined in bot.js:600, which v99 no longer
loads. It would have thrown a TypeError the first time a shopper opened an
uncatalogued category, which is precisely the moment you least want an error.

Every check here is a static fact about the shipped files. Run from the repo
root:  python3 qa/qa_v99_saathi_perf.py
"""
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CMS = ROOT / "cms"
ZIP = ROOT / "shivaa-update-v99.zip"

ok, bad = [], []


def check(label, cond, detail=""):
    (ok if cond else bad).append(label)
    print(f"{'PASS' if cond else 'FAIL'}  {label}" + (f" — {detail}" if detail and not cond else ""))


idx = (CMS / "index.html").read_text(encoding="utf-8", errors="replace")
sw = (CMS / "sw.js").read_text(encoding="utf-8", errors="replace")
app = (CMS / "js" / "app.js").read_text(encoding="utf-8", errors="replace")
mob = (CMS / "css" / "mobile.css").read_text(encoding="utf-8", errors="replace")
sty = (CMS / "css" / "styles.css").read_text(encoding="utf-8", errors="replace")
mot = (CMS / "css" / "motion.css").read_text(encoding="utf-8", errors="replace")

# ══════════════════════════════════════════════════════════════════════════
print("\n── 1 · SAATHI IS GONE, AND NOTHING STILL CALLS IT ──────────────────────────")
# ══════════════════════════════════════════════════════════════════════════
check("index.html no longer loads bot.css", "bot.css" not in re.sub(r"<!--.*?-->", "", idx, flags=re.S))
check("index.html no longer loads bot.js", "bot.js" not in re.sub(r"<!--.*?-->", "", idx, flags=re.S))
check("the drawer launcher #navSaathi is removed", "navSaathi" not in idx)
check("the footer [data-saathi] link is removed", "data-saathi" not in idx)
check("sw.js does not precache bot.css or bot.js",
      "bot.css" not in re.sub(r"/\*.*?\*/", "", sw, flags=re.S)
      and "bot.js" not in re.sub(r"/\*.*?\*/", "", sw, flags=re.S))

# The dangerous part: references from files that ARE still loaded.
loaded_js = ["app.js", "motion.js", "auth.js", "hallmark.js", "trust.js", "otp-autofill.js", "admin.js"]
dangling = []
for f in loaded_js:
    fp = CMS / "js" / f
    if not fp.exists():
        continue
    txt = fp.read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r"(window\.Saathi\b|Saathi\.(open|close|toggle)|Shivaa\.saathiOpen|saathiOpen\s*\()", txt):
        dangling.append(f"{f}: {m.group(0)}")
check("no still-loaded script calls into Saathi", not dangling, str(dangling[:4]))

# bot.js defines Shivaa.saathiOpen; with bot.js unloaded, any CALLER is a crash
check("app.js contains no saathiOpen caller", "saathiOpen" not in app)
check("app.js has zero 'saathi' mentions (copy included)", app.lower().count("saathi") == 0,
      f"{app.lower().count('saathi')} left")
check("styles.css has zero saathi rules", sty.lower().count("saathi") == 0)
check("motion.css has zero saathi rules (comments aside)",
      re.sub(r"/\*.*?\*/", "", mot, flags=re.S).lower().count("saathi") == 0)
check("mobile.css has zero saathi rules or .sa- selectors",
      mob.lower().count("saathi") == 0 and ".sa-" not in re.sub(r"/\*.*?\*/", "", mob, flags=re.S))

# reversibility: the owner wants a Gemini bot later, so the shell stays on disk
check("bot.js kept on disk for the future Gemini integration", (CMS / "js" / "bot.js").exists())
check("bot.css kept on disk for the future Gemini integration", (CMS / "css" / "bot.css").exists())

# ══════════════════════════════════════════════════════════════════════════
print("\n── 2 · STAFF BUNDLE IS OFF THE SHOPPER'S CRITICAL PATH ─────────────────────")
# ══════════════════════════════════════════════════════════════════════════
live_tags = re.sub(r"<!--.*?-->", "", idx, flags=re.S)
check("admin.js is no longer a blocking <script>", "/js/admin.js" not in live_tags)
check("qr.js is no longer a blocking <script>", "/js/qr.js" not in live_tags)
check("app.js defines loadStaffBundle()", "function loadStaffBundle()" in app)
check("app.js defines the STAFF_PAGES route map", "const STAFF_PAGES = { admin: 1, partner: 1 }" in app)
check("app.js defines injectScript() with async=false (order preserved)",
      "s.async = false" in app)
check("qr.js is injected before admin.js (admin calls its global)",
      app.index("/js/qr.js?v=99") < app.index("/js/admin.js?v=99"))
check("the router gates on the staff page before dispatch",
      "STAFF_PAGES[page] && !routes[page]" in app)
check("the lazy branch replays the route after the bundle lands",
      re.search(r"loadStaffBundle\(\)[\s\S]{0,400}?route\(\)", app) is not None)
check("a failed load offers a retry rather than a blank screen",
      "The staff panel did not load" in app and "Shivaa.redraw()" in app)
check("the bundle promise resets on failure so a retry can run",
      "_staffBundle = null; throw e" in app)
# admin.js registers its own routes at load time; that must still be true
adm = (CMS / "js" / "admin.js").read_text(encoding="utf-8", errors="replace")
check("admin.js still self-registers Shivaa.routes.admin",
      "window.Shivaa.routes.admin" in adm and "window.Shivaa.routes.partner" in adm)
sw_live = re.sub(r"/\*.*?\*/", "", sw, flags=re.S)
check("sw.js does not precache the staff bundle",
      "admin.js" not in sw_live and "qr.js" not in sw_live)

# ══════════════════════════════════════════════════════════════════════════
print("\n── 3 · CRITICAL PATH AND SCRIPT LOADING ───────────────────────────────────")
# ══════════════════════════════════════════════════════════════════════════
# NOTE: href/src values start with "/", and Path("cms") / "/css/x" resolves to
# "/css/x" — pathlib discards the left operand for an absolute right operand.
# That silently made both sums 0 and the assertions below pass vacuously, so the
# leading slash is stripped and the total is required to be non-zero.
def _local(url):
    return CMS / url.lstrip("/")


css_files = [_local(m.group(1)) for m in re.finditer(r'<link[^>]+href="(/css/[^"?]+)', live_tags)]
js_files = [_local(m.group(1)) for m in re.finditer(r'<script[^>]+src="(/js/[^"?]+)', live_tags)]
missing = [str(f) for f in css_files + js_files if not f.exists()]
check(f"every linked asset exists on disk ({len(css_files)} css + {len(js_files)} js)",
      not missing, str(missing[:4]))
css_bytes = sum(f.stat().st_size for f in css_files if f.exists())
js_bytes = sum(f.stat().st_size for f in js_files if f.exists())
total_kb = (css_bytes + js_bytes) / 1024
check(f"critical path measured non-zero ({total_kb:.0f}KB)", total_kb > 500)
check(f"critical path is under 1500KB (now {total_kb:.0f}KB, v98 was 1775KB)", total_kb < 1500)
check(f"critical path actually shrank by >300KB (saved {1775.3 - total_kb:.0f}KB)",
      1775.3 - total_kb > 300)

scripts = re.findall(r'<script[^>]+src="(/js/[^"?]+)', live_tags)
deferred = re.findall(r'<script[^>]+src="/js/[^"?]+[^>]*\bdefer\b[^>]*>', live_tags)
check(f"every remaining external script is deferred ({len(deferred)}/{len(scripts)})",
      len(scripts) == len(deferred) and len(scripts) > 0)
check("app.js keeps its readyState boot guard (defer-safe)",
      "document.readyState === 'loading'" in app)
check("no still-loaded script uses document.write at top level",
      not any("document.write" in (CMS / "js" / Path(s).name).read_text(errors="replace")
              for s in scripts))

# ══════════════════════════════════════════════════════════════════════════
print("\n── 4 · COMPOSITOR COST ────────────────────────────────────────────────────")
# ══════════════════════════════════════════════════════════════════════════
sty_live = re.sub(r"/\*.*?\*/", "", sty, flags=re.S)
check("no explicit `transition: all` remains in styles.css",
      "transition:all" not in sty_live and "transition: all" not in sty_live)
check(".btn's permanent will-change is scoped to (hover:hover)",
      re.search(r"@media \(hover:hover\)\s*\{[^}]*\.btn\{will-change:transform\}", sty_live, re.S) is not None)
check("no top-level .btn{will-change} outside that media block",
      len(re.findall(r"\.btn\{will-change:transform\}", sty_live)) == 1)
check("the .mnav bottom nav names its transitioned properties",
      re.search(r"\.mnav a\{[^}]*transition:color", sty_live) is not None)
check("§15 exists and is scoped to (pointer: coarse)",
      re.search(r"@media \(pointer: coarse\) \{\s*\n\s*/\* ── 15\.1", mob) is not None
      or "§15 · v99 TOUCH & COMPOSITOR PASS" in mob)
check("§15 rails use overscroll-behavior-X only (cannot block vertical scroll)",
      "overscroll-behavior-x: contain" in mob)
check("§15 does not re-add backdrop-filter to .header (v80 made it solid on purpose)",
      not re.search(r"\.header\s*\{[^}]*backdrop-filter:\s*blur", mob))
mob_live = re.sub(r"/\*.*?\*/", "", mob, flags=re.S)
check("§15 does not fight v80's !important on .mnav",
      not re.search(r"\.mnav[^{]*\{[^}]*backdrop-filter", mob_live))
check("§15 covers the two surfaces v80 missed",
      re.search(r"\.utilbar\s*\{[^}]*backdrop-filter:\s*blur\(4px\)", mob) is not None
      and re.search(r"\.pd-stickybar\s*\{[^}]*backdrop-filter:\s*blur\(4px\)", mob) is not None)

# the v98 scroll guarantees must still hold after all this editing
check("v98 guard intact: no root-level overflow clip",
      "overflow-x: clip" not in re.sub(r"/\*.*?\*/", "", mob, flags=re.S))
check("v98 guard intact: no content-visibility anywhere",
      "content-visibility" not in re.sub(r"/\*.*?\*/", "", mob + sty, flags=re.S))

# ══════════════════════════════════════════════════════════════════════════
print("\n── 5 · FILES PARSE, VERSIONS MOVE, ZIP IS A DROP-IN ───────────────────────")
# ══════════════════════════════════════════════════════════════════════════
for f in ("js/app.js", "sw.js"):
    r = subprocess.run(["node", "--check", str(CMS / f)], capture_output=True, text=True)
    check(f"node --check passes on {f}", r.returncode == 0, r.stderr.strip()[:160])
for f in ("css/mobile.css", "css/styles.css", "css/motion.css"):
    t = (CMS / f).read_text(encoding="utf-8", errors="replace")
    check(f"{f} braces balance", t.count("{") - t.count("}") == 0)

check("index.html loads styles.css?v=99", "/css/styles.css?v=99" in idx)
check("index.html loads mobile.css?v=99", "/css/mobile.css?v=99" in idx)
check("index.html loads motion.css?v=99", "/css/motion.css?v=99" in idx)
check("index.html loads app.js?v=99", "/js/app.js?v=99" in idx)
check("sw.js SHELL bumped to shivaa-shell-v99", "shivaa-shell-v99" in sw)

check("v99 zip exists", ZIP.exists())
if ZIP.exists():
    z = zipfile.ZipFile(ZIP)
    check("zip archive is not corrupt", z.testzip() is None)
    names = {n for n in z.namelist() if not n.endswith("/")}
    for rel in ("index.html", "sw.js", "css/styles.css", "css/mobile.css", "css/motion.css", "js/app.js"):
        check(f"zip's {rel} is byte-identical to cms/", z.read(rel) == (CMS / rel).read_bytes())
    check("zip's index.html is versioned v99", b"?v=99" in z.read("index.html"))
    check("zip's index.html does not load bot.js", b"/js/bot.js" not in z.read("index.html"))
    check("zip's index.html does not load admin.js", b"/js/admin.js" not in z.read("index.html"))
    check("zip's sw.js shell is v99", b"shivaa-shell-v99" in z.read("sw.js"))
    # bot.js/bot.css ride along so a rollback to the Saathi UI is still possible
    check("zip still ships bot.js/bot.css (rollback + Gemini reuse)",
          "js/bot.js" in names and "css/bot.css" in names)
    check("zip still ships admin.js/qr.js (lazy-loaded, must exist on the server)",
          "js/admin.js" in names and "js/qr.js" in names)
    old = ROOT / "shivaa-update-v95.zip"
    if old.exists():
        o = {n for n in zipfile.ZipFile(old).namelist() if not n.endswith("/")}
        check("zip manifest matches v95 (drop-in update)", names == o,
              f"missing={sorted(o - names)[:3]} extra={sorted(names - o)[:3]}")

print(f"\n{len(ok)} passed · {len(bad)} failed")
if bad:
    print("\nFAILED:")
    for b in bad:
        print("  ·", b)
sys.exit(1 if bad else 0)
