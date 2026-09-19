#!/usr/bin/env python3
"""v156 · move the era PINS in four older suites to FLOORS.

House law (MEMORY.md, v151 + v155 lessons): "bounded pins are dead — floors
only", and "a suite pinning an EXACT version stamp must be made
forward-tolerant the day the era's semantics become the baseline (else every
release 'breaks' the old suite for nothing)". Nothing here weakens an intent:
each check keeps asserting what it always asserted, only the release number
becomes a floor and the renamed rate brand becomes the new truth.
"""
import io, sys

def rep(P, pairs):
    s = io.open(P, encoding='utf-8').read()
    for old, new, n in pairs:
        c = s.count(old)
        if c != n:
            print("MISMATCH in %s: expected %d of %r, found %d" % (P, n, old[:80], c)); sys.exit(1)
        s = s.replace(old, new)
    io.open(P, 'w', encoding='utf-8').write(s)
    print('ok', P)

# ══════════════════════════════ v155-check ══════════════════════════════════
rep('tools/mega/smoke/v155-check.js', [(
"""console.log('\\n· 6 — stamp lockstep (155) incl. the loader stamps v152 once missed:');
ok('APP_REL 155', /const APP_REL = 155;/.test(app));
ok('index __SHIVAA_REL=155 + loader app.js?v=155', idx.includes('window.__SHIVAA_REL=155;') && idx.includes('/js/app.js?v=155"'));
ok('sw SHELL v155 + PRECACHE /js/app.js?v=155', sw.includes("'shivaa-shell-v155'") && sw.includes("'/js/app.js?v=155'"));
ok('no stale 154 left in the boot files', !idx.includes('154') && !sw.includes('154'));
ok("api rel 155", /'rel'\\s+=> 155,/.test(api));""",
"""console.log('\\n· 6 — stamp lockstep (155 is the FLOOR) incl. the loader stamps v152 once missed:');
/* v156 fix-forward — these four were EXACT 155 pins, so the next release
   "broke" this suite for nothing at all. v155's own banked lesson (c) is the
   rule: once an era's semantics ARE the baseline, its version pin becomes a
   floor and the suite keeps what it actually owns — the four stamps must still
   move in LOCKSTEP (the v152 loader-stamp miss is what this block exists for).
   Exactness for the CURRENT release is the newest suite's job (v156-check). */
const num = (re, t) => Number((re.exec(t) || [0, 0])[1]);
const relIdx = num(/window\\.__SHIVAA_REL=(\\d+);/, idx);
const relApp = num(/APP_REL\\s*=\\s*(\\d+)/, app);
const relSw  = num(/SHELL = 'shivaa-shell-v(\\d+)'/, sw);
const relLdr = num(/\\/js\\/app\\.js\\?v=(\\d+)"/, idx);
const relPre = num(/'\\/js\\/app\\.js\\?v=(\\d+)'/, sw);
const relApi = num(/'rel'\\s+=> (\\d+),/, api);
ok('APP_REL >= 155', relApp >= 155, String(relApp));
ok('index __SHIVAA_REL >= 155 + the loader stamp MATCHES it', relIdx >= 155 && relLdr === relIdx, `${relIdx} / loader ${relLdr}`);
ok('sw SHELL >= 155 + its PRECACHE app.js stamp MATCHES the shell', relSw >= 155 && relPre === relSw, `${relSw} / precache ${relPre}`);
ok('the whole release moves in lockstep (index = app = sw = api)', relIdx === relApp && relApp === relSw && relSw === relApi,
  `${relIdx}/${relApp}/${relSw}/${relApi}`);
ok('no stale 154 left in the boot files', !idx.includes('154') && !sw.includes('154'));""", 1)])

# ══════════════════════════════ v140-check ══════════════════════════════════
rep('tools/mega/smoke/v140-check.js', [(
"""    st(shell, /\\/js\\/app\\.js\\?v=(\\d+)/) >= 140 && /\\/js\\/v107\\.js\\?v=140/.test(shell) && st(shell, /\\/js\\/v116\\.js\\?v=(\\d+)/) >= 140 &&
    st(shell, /\\/js\\/v117\\.js\\?v=(\\d+)/) >= 140 && /\\/js\\/v119\\.js\\?v=140/.test(shell) && /\\/js\\/v120\\.js\\?v=140/.test(shell),""",
"""    st(shell, /\\/js\\/app\\.js\\?v=(\\d+)/) >= 140 && st(shell, /\\/js\\/v107\\.js\\?v=(\\d+)/) >= 140 && st(shell, /\\/js\\/v116\\.js\\?v=(\\d+)/) >= 140 &&
    st(shell, /\\/js\\/v117\\.js\\?v=(\\d+)/) >= 140 && /\\/js\\/v119\\.js\\?v=140/.test(shell) && st(shell, /\\/js\\/v120\\.js\\?v=(\\d+)/) >= 140,
    /* v156 fix-forward — v107.js and v120.js were EXACT ?v=140 pins; v156 edits
       both (the footer basis line + the empty-hash Back-button bug), so their
       stamps moved, which is precisely what this check demands ("a changed
       stamped file must move its ?v="). Floors, not pins — same as app.js and
       v116/v117.js already were. v119.js is untouched by v156 and stays exact. */""", 1), (
"""    sw.includes("'/js/v119.js?v=140'") && sw.includes("'/js/v120.js?v=140'") &&""",
"""    sw.includes("'/js/v119.js?v=140'") && (() => { const x = /'\\/js\\/v120\\.js\\?v=(\\d+)'/.exec(sw); return !!x && Number(x[1]) >= 140; })() &&""", 1)])

# ══════════════════════════════ v120-check ══════════════════════════════════
rep('tools/mega/smoke/v120-check.js', [(
"""  ok('the shell loads the v120 layer (css + js, after the v119 layer)',
    /\\/css\\/v120\\.css\\?v=(120|140)/.test(html) && /\\/js\\/v120\\.js\\?v=(120|140)/.test(html) &&
    (html.indexOf('/js/v119.js?v=140') !== -1 || html.indexOf('/js/v119.js?v=119') !== -1) &&
    html.indexOf('/js/v119.js?v=140') < html.indexOf('/js/v120.js?v=140'));
  ok('service worker precaches v120 and the media cache is the v120 generation',
    /'\\/css\\/v120\\.css\\?v=(120|140)'/.test(sw) && /'\\/js\\/v120\\.js\\?v=(120|140)'/.test(sw) && /MEDIA = 'shivaa-media-v120'/.test(sw));""",
"""  /* v156 fix-forward — the v120 layer's stamp was pinned to (120|140); v156
     edits js/v120.js (the empty-hash Back-button bug), so its ?v= moved, as the
     immutable-cache rule REQUIRES. The intent is unchanged: the layer must be
     loaded, after v119, at a stamp of its era or newer — and the worker must
     precache the very same URL. The order test is now stamp-agnostic, because a
     hard-coded '?v=140' indexOf() silently returns -1 the day the stamp moves
     and -1 < anything reads as a pass/fail lie. */
  const stampOf = (t, re) => Number((re.exec(t) || [0, 0])[1]);
  ok('the shell loads the v120 layer (css + js, after the v119 layer)',
    stampOf(html, /\\/css\\/v120\\.css\\?v=(\\d+)/) >= 120 && stampOf(html, /\\/js\\/v120\\.js\\?v=(\\d+)/) >= 140 &&
    html.indexOf('/js/v119.js?v=') !== -1 && html.indexOf('/js/v120.js?v=') !== -1 &&
    html.indexOf('/js/v119.js?v=') < html.indexOf('/js/v120.js?v='));
  ok('service worker precaches v120 and the media cache is the v120 generation',
    stampOf(sw, /'\\/css\\/v120\\.css\\?v=(\\d+)'/) >= 120 && stampOf(sw, /'\\/js\\/v120\\.js\\?v=(\\d+)'/) >= 140 && /MEDIA = 'shivaa-media-v120'/.test(sw));""", 1)])

# ══════════════════════════════ v119-check ══════════════════════════════════
rep('tools/mega/smoke/v119-check.js', [
("""    /function gold22_premium\\(array \\$db\\): int \\{[\\s\\S]{0,160}\\?\\? 398/.test(api) && /'premium' => \\['gold22' => gold22_premium\\(\\$db\\)/.test(api));""",
 """    /* v156 — the payload grew a pinned-override branch in front of the block, so
       the literal "'premium' => ['gold22'" is now two lines deeper. The intent
       is untouched: the 22K premium still comes from gold22_premium(). */
    /function gold22_premium\\(array \\$db\\): int \\{[\\s\\S]{0,160}\\?\\? 398/.test(api) && /'premium' =>[\\s\\S]{0,260}'gold22' => gold22_premium\\(\\$db\\)/.test(api));""", 1),
("""    /set\\.gold22Premium !== undefined \\? set\\.gold22Premium : set\\.jaipurPremium/.test(v107js) && /22K Jaipur premium/.test(v107js));""",
 """    /* v156 — the rate brand is the shop's own now ("22K Shivaa premium"), and the
       line reads the premium from the rates payload FIRST (it is the authority
       and it knows about a pinned override), keeping the settings chain as the
       fallback it always was. v156-check pins the arithmetic itself. */
    /set\\.gold22Premium !== undefined \\? set\\.gold22Premium : set\\.jaipurPremium/.test(v107js) && /22K Shivaa premium/.test(v107js));""", 1),
("""  ok('rate card shows the 22K premium (₹398), not the 24K one',
    await until(() => /22K Jaipur premium/.test(d.body.textContent) && /\\+₹398/.test(d.body.textContent)),""",
 """  ok('rate card shows the 22K premium (₹398), not the legacy 24K one (₹55)',
    /* v156 — renamed with the rate brand; the intent is the same and stronger:
       the card must print the 22K premium of ₹398 and must NOT fall back to the
       legacy ₹55 line. (The 24K row v156 added carries the SAME ₹398 by the
       owner's order — v156-check owns that assertion.) */
    await until(() => /22K Shivaa premium/.test(d.body.textContent) && /\\+₹398/.test(d.body.textContent) && !/\\+₹55\\//.test(d.body.textContent)),""", 1),
])
print('done')
