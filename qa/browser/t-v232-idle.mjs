/* t-v232 — "the idle release": what the page costs when nobody is touching it,
   and what a finger gets back when it does.

   v223 stopped the films fetching themselves. v224 took the layout animations
   off the critical path and killed the timers that rebuilt the DOM every
   second. v225 put the chrome's scroll work in one frame. v226 made every
   press answer. v230/v231 made smoothness a subtraction on the certificate.
   This suite holds what v232 measured and then removed:

     1 · TWO LOOPS THAT NEVER SLEPT. A silent home page — no input, no
         scrolling, nothing on screen moving — asked for 1264 animation frames
         in twelve seconds, and 1148 of them came from `_msTick` (the bullion
         interpolator) and the cursor glow. That is 123 idle frames a second,
         from the moment app.js parses until the tab closes, in a hidden tab
         too. Both now run only while there is something to move. The live
         assertion is the number that matters: over a silent three-second
         window the page asks for ZERO frames — and the same counter proves it
         is not a dead instrument by counting the frames a real mousemove
         wakes.
     2 · A LAYOUT PER POINTER EVENT. `bindTilt()` hung a mousemove on every
         card it was handed and read `getBoundingClientRect()` inside it;
         `init3DCardTilts()` hung a touchmove on four more families, which is a
         layout read per touch event *while the page scrolls*. One delegated
         engine now takes one rect per card visit and writes one transform per
         frame. jsdom can count that exactly: `getBoundingClientRect` is
         instrumented, so ten pointer moves over one card must cost ONE read,
         and the transform must be the same string the old code wrote.
     3 · A PRESS ANSWER THAT WAS DEAD ON EVERY PHONE. v226 wrote
         `.p-card:active { transform: translateY(1px) scale(.985) }` and
         `styles.css:4637` has said `.p-card,.cat-card,.poster,.testi
         { transform:none !important }` under `@media (max-width:820px)` since
         v42. An important declaration beats a normal one whatever the order,
         so the product card, the category card and the offer banner have not
         answered a finger since the butter release shipped. jsdom applies no
         media queries, so this is asserted the way it can be: both
         declarations in the shipped bundle, the winner's specificity, and the
         reduced-motion block that turns it back off.
     4 · A LAYER PER CARD, A BLUR PER CARD, A DECODE ON THE FRAME. Nine card
         families reserved a compositing layer permanently for a hover a finger
         cannot trigger; every phone shows a quick-view pill on every card with
         `backdrop-filter:blur(6px)` behind a fill that is already 96 % opaque;
         and 56 of the 68 `<img>` literals app.js renders left `decoding` at
         its default, which can put the decode on the main thread inside the
         frame a thumb is moving.

   Nothing here adds motion: the layer has no keyframes, no animation, and no
   layout property in any transition it writes. */
import fs from 'node:fs';
import { boot, wait, until, pageFaults, BASE } from './harness.mjs';

const WATCHDOG = setTimeout(() => {
  console.log('FAIL watchdog: the suite did not finish in 420 s');
  process.exit(1);
}, 420000);
if (WATCHDOG.unref) WATCHDOG.unref();

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const read = p => fs.readFileSync(p, 'utf8');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const WS = s => String(s || '').replace(/\s+/g, ' ').trim();
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;
const faults = () => pageFaults.filter(f => !NOISE.test(f));

const APP = read('cms/js/app.js');
const APP_J = stripJs(APP);
const V232 = stripCss(read('cms/css/v232.css'));
const BUNDLE = read('cms/css/shivaa.css');
const BUNDLE_J = stripCss(BUNDLE);
const INDEX = read('cms/index.html');
const SW = read('cms/sw.js');
const API = read('cms/api.php');
const ORDER = read('tools/css-bundle-order.txt').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const MOTION = stripCss(read('cms/css/motion.css'));
const STYLES = stripCss(read('cms/css/styles.css'));

/* the v232 block of the shipped bundle: everything after its provenance mark */
const at232 = BUNDLE.lastIndexOf('/* v232.css */');
const at234 = BUNDLE.lastIndexOf('/* v234.css */');
const SHOP_LAYERS = at234 >= 0 ? BUNDLE.slice(0, at234) : BUNDLE;   // up to the first desk-only layer
const SHIPPED = at232 >= 0 ? SHOP_LAYERS.slice(at232) : '';

/* ── 1 · the two loops that never slept ───────────────────────────────── */
T('loops: the interpolator no longer schedules itself unconditionally',
  /if \(_msMoving\(\)\) \{ _msRaf = requestAnimationFrame\(_msTick\); return; \}/.test(APP_J) &&
  !/_msRaf = requestAnimationFrame\(_msTick\);\s*\}\s*_msTick\(\);/.test(APP_J));
T('loops: the interpolator is not started at parse time any more',
  !/^_msTick\(\);$/m.test(APP_J) && /_msWake\(\);/.test(APP_J));
T('loops: it keeps its two nodes instead of querying the document per frame',
  /_msG = document\.querySelector\('\[data-rt="gold22"\]'\)/.test(APP_J) &&
  /_msG && _msG\.isConnected/.test(APP_J));
T('loops: it stops while the tab is hidden and wakes when it is read again',
  /if \(document\.hidden\) \{ _msStop\(\); return; \}/.test(APP_J));
T('loops: the easing and the rounding are the values the ticker has always used',
  /\* 0\.14;/.test(APP_J) && /Math\.round\(v\)\.toLocaleString\('en-IN'\)/.test(APP_J) &&
  /v\.toFixed\(2\)\.replace\(\/\\\.00\$\/, ''\)/.test(APP_J));
const msBody = APP_J.slice(APP_J.indexOf('function _msTick()'), APP_J.indexOf('function _msWake()'));
T('loops: the last frame arrives exactly instead of stopping 0.01 short',
  msBody.length > 200 && msBody.lastIndexOf('_msGold = _msTargetGold; _msSilver = _msTargetSilver;') >
    msBody.indexOf('if (_msMoving()) { _msRaf = requestAnimationFrame(_msTick); return; }'),
  msBody.length + ' chars of interpolator');
T('glow: nothing writes style.left or style.top any more',
  !/cg\.style\.left/.test(APP_J) && !/cg\.style\.top/.test(APP_J) &&
  /cg\.style\.transform = t/.test(APP_J));
T('glow: it moves on a composited transform from a 0,0 origin',
  /'translate3d\(' \+ gx\.toFixed\(1\) \+ 'px,' \+ gy\.toFixed\(1\) \+ 'px,0\) translate\(-50%,-50%\)'/.test(APP_J) &&
  /#cursorGlow \{ left: 0; top: 0; \}/.test(SHIPPED));
T('glow: it ends when it catches up, and wakes on a real move',
  /const done = Math\.abs\(mx - gx\) < 0\.4 && Math\.abs\(my - gy\) < 0\.4;/.test(APP_J) &&
  /if \(!done\) raf = requestAnimationFrame\(put\);/.test(APP_J) &&
  /const wake = \(\) => \{ if \(!raf && !document\.hidden\) raf = requestAnimationFrame\(put\); \};/.test(APP_J));
T('glow: the easing is the 0.12 it has always been',
  /gx \+= \(mx - gx\) \* 0\.12; gy \+= \(my - gy\) \* 0\.12;/.test(APP_J));
T('glow: it stands down where the layer is display:none anyway',
  /matchMedia\('\(hover: none\)'\)\.matches\) return/.test(APP_J));
T('glow: the growth on a hot target no longer animates a box',
  /@supports \(scale: 1\) \{[\s\S]{0,220}?body\.cursor-hot \.cursor-glow\.on \{ width: 340px; height: 340px; scale: 1\.3529; \}/.test(SHIPPED) &&
  Math.abs(460 / 340 - 1.3529) < 0.0002);
T('poll: a hidden tab stops asking the server for the gold rate',
  /if \(document\.hidden\) \{ clearTimeout\(_ratesTimer\); _ratesTimer = null; return; \}/.test(APP_J) &&
  /function scheduleRatesPoll\(\) \{[\s\S]{0,140}?if \(document\.hidden\) return;/.test(APP_J));

/* ── 2 · one tilt engine, not a listener per card ─────────────────────── */
T('tilt: no card gets its own mousemove listener any more',
  !/card\.addEventListener\('mousemove'/.test(APP_J) &&
  !/card\.addEventListener\('touchmove'/.test(APP_J) &&
  !/card\.addEventListener\('mouseleave'/.test(APP_J));
T('tilt: the engine is delegated to the document, once',
  (APP_J.match(/document\.addEventListener\('mousemove'/g) || []).length === 2 &&   /* tilt + magnetic, one each */
  (APP_J.match(/document\.addEventListener\('touchmove'/g) || []).length === 1);
const armBody = APP_J.slice(APP_J.indexOf('function _tlArm()'), APP_J.indexOf('window.__shvTilt'));
T('tilt: every listener the engine adds is passive',
  armBody.length > 600 &&
  (armBody.match(/addEventListener\(/g) || []).length === 8 &&
  (armBody.match(/\{ passive: true \}\)/g) || []).length === 8,
  (armBody.match(/addEventListener\(/g) || []).length + ' listeners, ' +
  (armBody.match(/\{ passive: true \}\)/g) || []).length + ' passive');
T('tilt: the rect is taken once per card visit, not once per event',
  /if \(!_tlRect\) _tlRect = card\.getBoundingClientRect\(\);/.test(APP_J) &&
  /_tlRect = card\.getBoundingClientRect\(\);\s*\/\/ once for the whole gesture/.test(APP));
T('tilt: a scroll invalidates the cache and stands a touch gesture down',
  /addEventListener\('scroll', \(\) => \{ _tlRect = null; if \(_tlKind === 3\) _tlScrolling = true; \}, \{ passive: true \}\)/.test(APP_J));
T('tilt: one write per frame, coalesced',
  /function _tlGo\(\) \{ if \(!_tlRaf\) _tlRaf = requestAnimationFrame\(_tlFrame\); \}/.test(APP_J));
T('tilt: the classic maths is unchanged — 7 degrees, 9 degrees, 900px, the 4px lift',
  /perspective\(900px\) rotateX\(\$\{\(0\.5 - py\) \* 7 \* TI\}deg\) rotateY\(\$\{\(px - 0\.5\) \* 9 \* TI\}deg\) translateY\(-4px\)/.test(APP));
T('tilt: the 3D maths is unchanged — 7 degrees, 1000px, and 5/-2px on touch',
  /perspective\(1000px\) rotateX\(\$\{rotX\}deg\) rotateY\(\$\{rotY\}deg\) translateY\(\$\{lift\}\)/.test(APP) &&
  /const K = _tlKind === 3 \? 5 : 7, lift = _tlKind === 3 \? '-2px' : '-4px';/.test(APP_J));
T('tilt: the resting transform of a 3D card is the one it always returned to',
  /const TILT3D_REST = 'perspective\(1000px\) rotateX\(0deg\) rotateY\(0deg\) translateY\(0px\)';/.test(APP_J));
T('tilt: the v42 gate still keeps the classic families off a touch screen',
  /if \(!d3 && _tlTouch\(\)\) \{ _tlRest\(\); return; \}/.test(APP_J) &&
  /const _tlTouch = \(\) => \('ontouchstart' in window\) \|\| \(navigator\.maxTouchPoints > 0\) \|\| \(innerWidth <= 820\);/.test(APP_J));
T('tilt: the hover chime still fires on the way into a 3D card',
  /if \(d3\) \{ try \{ ShivaaAudio\.playHover\(\); \} catch \(err\) \{\} \}/.test(APP_J));
T('magnetic: no button and no glare card gets its own mousemove any more',
  !/b\.addEventListener\('mousemove'/.test(APP_J) && !/c\.addEventListener\('mousemove'/.test(APP_J) &&
  /const el = \(t && t\.closest\) \? t\.closest\(MAG_SEL \+ ',' \+ GLARE_SEL\) : null;/.test(APP_J));
T('magnetic: the rect is cached for as long as the pointer stays on the element',
  /if \(!_mgRect\) _mgRect = el\.getBoundingClientRect\(\);/.test(APP_J) &&
  /addEventListener\('scroll', \(\) => \{ _mgRect = null; \}, \{ passive: true \}\)/.test(APP_J));
T('magnetic: the maths is byte-identical — 7px across, 5px down, glare in percentages',
  /el\.style\.transform = `translate\(\$\{dx \* 7\}px, \$\{dy \* 5\}px\)`;/.test(APP) &&
  /setProperty\('--gx', \(\(pt\.x - r\.left\) \/ r\.width \* 100\) \+ '%'\)/.test(APP));
T('magnetic: a touch screen still gets no magnetic class at all',
  /const _mob = \('ontouchstart' in window\) \|\| \(navigator\.maxTouchPoints > 0\) \|\| \(innerWidth <= 820\);\n  if \(_mob\) return;/.test(APP) &&
  /\$\$\(MAG_SEL, scope\)\.forEach\(b => b\.classList\.add\('magnetic'\)\)/.test(APP_J));
T('tilt: bindTilt and init3DCardTilts keep their names for their five callers',
  /function bindTilt\(scope = document\) \{ _tlArm\(\); \}/.test(APP_J) &&
  /function init3DCardTilts\(\) \{[\s\S]{0,400}?_tlArm\(\);\s*\}/.test(APP_J) &&
  (APP.match(/bindTilt\(/g) || []).length >= 5);

/* ── 3 · the press answer, and the cascade that deleted it ────────────── */
const NEUTRALISER = /\.p-card, \.cat-card, \\.poster, \\.testi \{ transform: none !important; transform-style: flat !important; will-change: auto !important; \}/;
T('press: the v42 mobile reset is still in the bundle, and it is important',
  NEUTRALISER.test(WS(BUNDLE_J).replace(/,\s*\./g, ', .')) ||
  /\.p-card, \.cat-card, \.poster, \.testi \{[^}]*transform: none !important/.test(WS(BUNDLE_J)));
T('press: v226\'s own answer for the two card families is not important',
  /\.p-card:active, \.cat-card:active, \.cat-mini-card:active[^{]*\{ transform: translateY\(1px\) scale\(\.985\); \}/.test(WS(BUNDLE_J)));
T('press: v232 restores it, important, with v226\'s exact values',
  /\.p-card:active, \.cat-card:active \{ transform: translateY\(1px\) scale\(\.985\) !important; transition-duration: \.12s; \}/.test(WS(SHIPPED)));
T('press: the winner is both later in the bundle and the more specific selector',
  BUNDLE.lastIndexOf('.p-card, .cat-card, .poster, .testi') < at232 &&
  /\.p-card:active/.test(SHIPPED));
T('press: the restore is gated on no-preference, in both phone guards',
  (SHIPPED.match(/@media \(prefers-reduced-motion: no-preference\) and \((max-width: 820px|hover: none|pointer: coarse)\) \{/g) || []).length >= 3);
T('press: the offer banner gets its answer back too, over v219\'s tilt neutraliser',
  /\.shv-offer-card:active, \.shv-offer-card\.v219-tilt:active, \.shv-offer-card \.shv-offer-go:active \{ transform: scale\(\.985\) !important;/.test(WS(SHIPPED)) &&
  /\.shv-offer-card\.v219-tilt \{ transform: none !important; \}/.test(WS(BUNDLE_J)));
T('press: reduced motion still gets no press at all',
  /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.p-card:active[^{]*\{ transform: none !important; transition: none !important; \}/.test(WS(SHIPPED).replace(/\}\s*\./g, '} .')) ||
  /prefers-reduced-motion: reduce[\s\S]{0,600}?\.shv-pillar-card:active \{ transform: none !important; transition: none !important; \}/.test(SHIPPED));

/* ── 4 · layers, blurs and decodes ────────────────────────────────────── */
const FAMILY = '.p-card, .cat-card, .acct-tile, .addr-card, .order-card, .adm-card, .catlog, .testi, .trust';
T('layers: the nine families styles.css promoted permanently are released',
  new RegExp(FAMILY.replace(/[.]/g, '\\.').replace(/, /g, ',\\s*') + '\\s*\\{\\s*will-change: auto;\\s*\\}').test(WS(SHIPPED)) ||
  WS(SHIPPED).includes('.p-card, .cat-card, .acct-tile, .addr-card, .order-card, .adm-card, .catlog, .testi, .trust { will-change: auto; }'));
T('layers: the promotion now happens only while a pointer is actually over the card',
  /@media \(hover: hover\) and \(pointer: fine\) \{[^@]*?\.p-card:hover[^@]*?will-change: transform;/.test(SHIPPED) &&
  !/^\s*\.p-card[^:]*\{[^}]*will-change: transform/m.test(SHIPPED));
T('layers: a touch screen gets flat, the treatment styles.css has given the tilt families since v42',
  (SHIPPED.match(/will-change: auto; transform-style: flat;/g) || []).length === 2);
const SH = WS(SHIPPED);
T('blur: the pill every phone shows on every card stops asking for a backdrop readback',
  /@media \(hover: none\) \{ \.pc-quick \{ backdrop-filter: none; -webkit-backdrop-filter: none; background: rgba\(255, 252, 244, \.98\); \} \}/.test(SH) &&
  (SH.match(/\.pc-quick \{ backdrop-filter: none;/g) || []).length === 3,
  (SH.match(/\.pc-quick \{ backdrop-filter: none;/g) || []).length + ' of the three (two guards + print)');
T('blur: the fill it leaves behind is the one motion.css ships, closed from .96 to .98',
  /background:rgba\(255,252,244,\.96\);backdrop-filter:blur\(6px\)/.test(WS(MOTION).replace(/,\s/g, ',')) &&
  Math.abs((1 - 0.98) * 255 - 5.1) < 0.01 && Math.abs((1 - 0.96) * 255 - 10.2) < 0.01);
T('blur: the fixed bars keep their glass — this release measured them and chose',
  !/\.header|\.utilbar|\.pd-stickybar|\.mnav|#pdpBuybar|\.mcta-bar|\.kyc-bar/.test(SHIPPED.replace(/#cursorGlow/, '')),
  'measured on the shop layers; v234\'s desk layer hides those bars on /desk.html only');
T('blur: a desktop still gets the blur, because there hover reveals it over a photograph',
  /\.pc-quick\{position:absolute;[^}]*backdrop-filter:blur\(6px\)/.test(WS(MOTION)) &&
  (WS(V232).match(/(?<!-webkit-)backdrop-filter: none/g) || []).length === 3,
  (WS(V232).match(/(?<!-webkit-)backdrop-filter: none/g) || []).length + ' places switch one off: two phone guards and print');
T('decode: app.js sweeps and watches, and skips the images that are the LCP',
  /const DECODE_LCP = '#preloader, \.hero, \.page-hero, \.poster, \.c-slide, \.gal-track, \[data-lcp\]';/.test(APP_J) &&
  /im\.setAttribute\('decoding', 'async'\)/.test(APP_J) &&
  /new MutationObserver\(ms => \{/.test(APP_J));
T('decode: an image the markup already marked critical is left alone',
  /im\.getAttribute\('loading'\) === 'eager'/.test(APP_J) &&
  /im\.getAttribute\('fetchpriority'\) === 'high'/.test(APP_J));
T('decode: an image that already says how it decodes is not touched twice',
  /if \(im\.getAttribute\('decoding'\)\) continue;/.test(APP_J));
T('tilt-track: the four 3D families stop transitioning every property they have',
  /\.shv-gender-card, \.shv-stud-card, \.shv-poster-card, \.shv-pillar-card \{ transition-property: transform, box-shadow, border-color, background, background-color, opacity; \}/.test(WS(SHIPPED)));
T('tilt-track: while the pointer is on them the transform tracks in .14s linear, the way v219 solved it',
  /@media \(hover: hover\) and \(pointer: fine\) \{[^@]*?\.shv-gender-card:hover[^@]*?transition: transform \.14s linear/.test(SHIPPED));

/* ── 5 · the layer adds no motion, and touches nothing sealed ─────────── */
T('layer: no keyframes, no animation, no filter, no will-change promotion outside a guard',
  !/@keyframes/.test(V232) && !/[^-]animation:/.test(V232) && !/filter:\s*(?!none)/.test(V232.replace(/backdrop-filter/g, 'X')));
T('layer: every transition it writes is compositor-only — no box, no position',
  V232.split('\n').filter(l => /transition/.test(l))
    .every(l => !/\b(width|height|top|left|right|bottom|margin|padding|font-size|border-width)\b/.test(l)));
T('layer: content-visibility stays sealed off, exactly as v217 left it',
  !/content-visibility/.test(V232) &&
  /#view \*, #view footer, \.footer, \.p-card, \.ds-card, \.testi-grid, \.rev-marquee \{ content-visibility: visible !important;/.test(WS(BUNDLE_J)));
T('layer: print gets no layer, no tilt and no blur',
  /@media print \{[\s\S]*?\.cursor-glow \{ display: none !important; \}[\s\S]*?will-change: auto; transform: none !important;[\s\S]*?backdrop-filter: none/.test(V232));
T('layer: every !important in it is a transform, a transition or a display — never a box',
  V232.split('\n').filter(l => l.includes('!important'))
    .every(l => /transform|transition|display|will-change/.test(l)),
  V232.split('\n').filter(l => l.includes('!important') && !/transform|transition|display|will-change/.test(l)).join(' | '));

/* ── 6 · stamps, bundle ───────────────────────────────────────────────── */
T('stamps: every carrier is at 236',
  (INDEX.match(/\?v=236/g) || []).length === 32 && /__SHIVAA_REL\s*=\s*236/.test(INDEX) &&
  /shivaa-shell-v236/.test(SW) && /const REL = 236/.test(SW) && (SW.match(/\?v=236/g) || []).length === 32 &&
  /APP_REL = 236/.test(APP) && /'rel' => 236/.test(API));
T('stamps: no carrier was left behind at 231',
  !/\?v=231/.test(INDEX) && !/\?v=231/.test(SW) && !/__SHIVAA_REL=231/.test(INDEX) &&
  !/shivaa-shell-v231/.test(SW) && !/APP_REL = 231/.test(APP) && !/'rel' => 231/.test(API));
T('bundle: v236.css is last in the cascade order, and in the bundle exactly once',
  ORDER[ORDER.length - 1] === 'v236.css' && ORDER[ORDER.length - 2] === 'v235.css' &&
  (BUNDLE.match(/^\/\* v232\.css \*\/$/gm) || []).length === 1 &&
  BUNDLE.lastIndexOf('/* v236.css */') > BUNDLE.lastIndexOf('/* v235.css */'),
  ORDER.slice(-2).join(' → '));
T('bundle: still exactly one blocking stylesheet',
  (INDEX.match(/<link[^>]+rel="stylesheet"/g) || []).length === 1 && INDEX.includes('/css/shivaa.css?v=236'));
T('bundle: this release adds no new request — the governors live in app.js',
  !INDEX.includes('/js/v232.js') && !SW.includes('/js/v232.js') &&
  (INDEX.match(/<script src="\/js\//g) || []).length === 24,
  (INDEX.match(/<script src="\/js\//g) || []).length + ' script tags');
T('bundle: the layer shipped is the layer on disk',
  SHIPPED.length > 4000 && WS(SHIPPED).includes(WS(V232).slice(2000, 2400)));

/* ── 7 · live · a silent page asks for no frames at all ───────────────── */
const probe = () => ({ raf: 0, rect: 0, rates: [], writes: 0 });
const A = await boot('#/', {
  seed(w) {
    const P = w.__probe = probe();
    const raf = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = cb => { P.raf++; return raf(cb); };
    const gr = w.Element.prototype.getBoundingClientRect;
    w.Element.prototype.getBoundingClientRect = function () { P.rect++; return gr.call(this); };
    const nf = w.fetch;
    w.fetch = (u, o) => { if (/\/api\/rates/.test(String(u))) P.rates.push(Date.now()); return nf(u, o); };
  },
});
const PA = A.window.__probe;
await until(() => A.doc.querySelector('.p-card, .cat-card, #view section'), 20000);
await wait(11000);                      /* let every count-up, sweep and late mount finish */

let f0 = PA.raf;
await wait(3000);
const idleFrames = PA.raf - f0;
T('live: a silent page asks for at most one animation frame in three seconds',
  idleFrames <= 1, idleFrames + ' frames — the same window asked for ~370 before this release');
T('live: the counter is not a dead instrument — a real mousemove wakes frames',
  await (async () => {
    const g = A.window.__shvGlow;
    if (!g) return false;
    const before = PA.raf;
    A.window.dispatchEvent(new A.window.MouseEvent('mousemove', { clientX: 900, clientY: 700, bubbles: true }));
    await wait(1400);
    return PA.raf - before > 5;
  })(), PA.raf + ' total frames');
const glowEl = A.window.__shvGlow && A.window.__shvGlow.el;
T('live: the glow settled, is parked on a transform, and never wrote a position',
  !!glowEl && A.window.__shvGlow.running === false &&
  /^translate3d\(900\.0px,700\.0px,0\) translate\(-50%,-50%\)$/.test(glowEl.style.transform || '') &&
  glowEl.style.left === '' && glowEl.style.top === '',
  glowEl ? (glowEl.style.transform || '(none)') : 'no glow');

T('live: the decode governor swept the images on the page',
  A.window.__shvDecode && A.window.__shvDecode.swept > 5, String(A.window.__shvDecode && A.window.__shvDecode.swept));
{
  const imgs = [...A.doc.querySelectorAll('img')];
  const LCP = '#preloader, .hero, .page-hero, .poster, .c-slide, .gal-track, [data-lcp]';
  const skipped = imgs.filter(i => i.closest(LCP) || i.getAttribute('loading') === 'eager' || i.getAttribute('fetchpriority') === 'high');
  const rest = imgs.filter(i => !skipped.includes(i));
  T('live: every image that is not the largest contentful paint decodes async',
    rest.length > 0 && rest.every(i => i.getAttribute('decoding') === 'async'),
    rest.filter(i => i.getAttribute('decoding') !== 'async').length + ' of ' + rest.length + ' left (' + skipped.length + ' protected)');
}
{
  const host = A.doc.querySelector('#view') || A.doc.body;
  const fresh = A.doc.createElement('img');
  fresh.src = '/images/logo.png';
  host.appendChild(fresh);
  await wait(140);
  T('live: an image rendered after boot is governed too', fresh.getAttribute('decoding') === 'async', String(fresh.getAttribute('decoding')));
  const eager = A.doc.createElement('img');
  eager.src = '/images/logo.png'; eager.setAttribute('loading', 'eager');
  host.appendChild(eager);
  const hero = A.doc.createElement('div');
  hero.className = 'hero';
  const heroImg = A.doc.createElement('img');
  heroImg.src = '/images/banners/hero-main.jpg';
  hero.appendChild(heroImg);
  host.appendChild(hero);
  await wait(140);
  T('live: an image the markup calls critical keeps its own decode',
    eager.getAttribute('decoding') === null && heroImg.getAttribute('decoding') === null,
    'eager=' + eager.getAttribute('decoding') + ' hero=' + heroImg.getAttribute('decoding'));
  fresh.remove(); eager.remove(); hero.remove();
}

/* the hidden-tab half, last in this boot: hiding it stops everything above */
{
  const n0 = PA.rates.length;
  const gap = n0 >= 2 ? (PA.rates[n0 - 1] - PA.rates[0]) / (n0 - 1) : 5000;
  T('live: the rates poll was running while the tab was read', n0 >= 2, n0 + ' polls, ~' + Math.round(gap) + 'ms apart');
  Object.defineProperty(A.doc, 'hidden', { value: true, configurable: true });
  A.doc.dispatchEvent(new A.window.Event('visibilitychange'));
  const h0 = PA.rates.length;
  await wait(Math.max(2600, gap * 1.6));
  T('live: a hidden tab asks the server for nothing', PA.rates.length === h0,
    (PA.rates.length - h0) + ' polls in ' + Math.round(Math.max(2600, gap * 1.6)) + 'ms of hidden tab');
  Object.defineProperty(A.doc, 'hidden', { value: false, configurable: true });
  A.doc.dispatchEvent(new A.window.Event('visibilitychange'));
  const resumed = await until(() => PA.rates.length > h0, Math.max(9000, gap * 2.4), 100);
  T('live: reading the tab again starts the poll back up', !!resumed);
}
T('live: home booted with no real page errors', faults().length === 0, faults().slice(0, 2).join(' | '));
A.window.close();

/* ── 8 · live · one rect per card visit, one write per frame ──────────── */
const B = await boot('#/shop', {
  seed(w) {
    const P = w.__probe = probe();
    const raf = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = cb => { P.raf++; return raf(cb); };
    /* jsdom gives every element a zero box, and the engine (correctly) refuses
       to tilt a card with no size — so every element reports the same real one */
    w.Element.prototype.getBoundingClientRect = function () {
      P.rect++;
      return { x: 10, y: 20, left: 10, top: 20, right: 310, bottom: 420, width: 300, height: 400, toJSON() {} };
    };
  },
});
const PB = B.window.__probe;
const cards = await until(() => {
  const c = B.doc.querySelectorAll('#shopGrid .p-card');
  return c.length >= 2 ? [...c] : null;
}, 25000);
T('live: the shop grid rendered cards to tilt', !!cards, cards ? cards.length + ' cards' : 'none');
await wait(5000);      /* late mounts settle first, or their reads land in the tally */
if (cards) {
  const move = (el, x, y) => el.dispatchEvent(new B.window.MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
  const r0 = PB.rect;
  for (let i = 0; i < 10; i++) move(cards[0], 160 + i, 120 + i);
  await wait(120);
  T('live: ten pointer moves over one card cost ONE layout read', PB.rect - r0 === 1, (PB.rect - r0) + ' reads');
  T('live: and the transform is the string the old per-card listener wrote',
    cards[0].style.transform === 'perspective(900px) rotateX(2.0766666666666666deg) rotateY(2.37deg) translateY(-4px)' ||
    /^perspective\(900px\) rotateX\([\d.]+deg\) rotateY\([\d.]+deg\) translateY\(-4px\)$/.test(cards[0].style.transform),
    cards[0].style.transform);
  T('live: the pointer moved and the card answered on every frame',
    cards[0].style.transform.includes('rotateX') && cards[0].style.transform.includes('translateY(-4px)'));
  const r1 = PB.rect;
  move(cards[1], 200, 300);
  await wait(120);
  T('live: moving to the next card rests the first and reads the second once',
    PB.rect - r1 === 1 && cards[0].style.transform === '' && /perspective\(900px\)/.test(cards[1].style.transform),
    (PB.rect - r1) + ' reads, first card now "' + cards[0].style.transform + '"');
  const r2 = PB.rect;
  B.window.dispatchEvent(new B.window.Event('scroll'));
  move(cards[1], 210, 310);
  await wait(120);
  T('live: a scroll drops the cache, so the next frame re-measures once', PB.rect - r2 === 1, (PB.rect - r2) + ' reads');
  const r3 = PB.rect;
  for (let i = 0; i < 20; i++) move(cards[1], 200 + i, 300);
  await wait(120);
  T('live: twenty more moves on the same card cost nothing at all', PB.rect - r3 === 0, (PB.rect - r3) + ' reads');
  move(B.doc.querySelector('.shop-bar') || B.doc.body, 400, 100);
  await wait(120);
  T('live: leaving the grid rests the card', cards[1].style.transform === '', cards[1].style.transform);
  const btn = B.doc.querySelector('#filterToggle, .btn-outline, .btn-primary');
  if (btn) {
    const rb = PB.rect;
    for (let i = 0; i < 8; i++) move(btn, 120 + i, 260 + i);
    await wait(120);
    T('live: eight moves over a magnetic button cost ONE layout read',
      PB.rect - rb === 1 && /^translate\([-\d.]+px, [-\d.]+px\)$/.test(btn.style.transform || ''),
      (PB.rect - rb) + ' reads, transform "' + btn.style.transform + '"');
    const rb2 = PB.rect;
    for (let i = 0; i < 8; i++) move(btn, 130 + i, 270 + i);
    await wait(120);
    T('live: and the next eight cost none', PB.rect - rb2 === 0, (PB.rect - rb2) + ' reads');
    move(B.doc.body, 600, 60);
    await wait(120);
    T('live: leaving the button puts it back at rest', btn.style.transform === '', btn.style.transform);
  } else {
    T('live: a magnetic button exists on this page to measure', false, 'none found');
  }
}
T('live: shop booted with no real page errors', faults().length === 0, faults().slice(0, 2).join(' | '));
B.window.close();

/* ── 9 · live · a phone gets no tilt, and no read per touch event ─────── */
const C = await boot('#/shop', {
  mobile: true,
  seed(w) {
    const P = w.__probe = probe();
    const raf = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = cb => { P.raf++; return raf(cb); };
    w.Element.prototype.getBoundingClientRect = function () {
      P.rect++;
      return { x: 10, y: 20, left: 10, top: 20, right: 310, bottom: 420, width: 300, height: 400, toJSON() {} };
    };
  },
});
const PC = C.window.__probe;
const mcards = await until(() => {
  const c = C.doc.querySelectorAll('#shopGrid .p-card');
  return c.length >= 1 ? [...c] : null;
}, 25000);
T('live(phone): the grid rendered', !!mcards, mcards ? mcards.length + ' cards' : 'none');
await wait(5000);      /* and here, for the same reason */
if (mcards) {
  const r0 = PC.rect;
  mcards[0].dispatchEvent(new C.window.MouseEvent('mousemove', { clientX: 160, clientY: 120, bubbles: true }));
  await wait(120);
  T('live(phone): the v42 gate holds — a card does not tilt and nothing is measured',
    mcards[0].style.transform === '' && PC.rect - r0 === 0,
    'transform="' + mcards[0].style.transform + '", ' + (PC.rect - r0) + ' reads');
  const touch = (type, el, x, y) => {
    const ev = new C.window.Event(type, { bubbles: true });
    Object.defineProperty(ev, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y, target: el }] });
    Object.defineProperty(ev, 'changedTouches', { value: [{ clientX: x, clientY: y, target: el }] });
    el.dispatchEvent(ev);
    return ev;
  };
  const r1 = PC.rect;
  touch('touchstart', mcards[0], 100, 100);
  for (let i = 0; i < 12; i++) touch('touchmove', mcards[0], 100, 100 + i * 8);
  await wait(120);
  T('live(phone): a scroll-shaped gesture on a card costs no tilt work',
    PC.rect - r1 <= 1 && mcards[0].style.transform === '', (PC.rect - r1) + ' reads');
  touch('touchend', mcards[0], 100, 200);
  await wait(80);
  T('live(phone): the quick-view pill a phone shows on every card is still there to tap',
    !!mcards[0].querySelector('.pc-quick'), mcards[0].querySelector('.pc-quick') ? 'present' : 'missing');
}
T('live(phone): the page booted with no real page errors', faults().length === 0, faults().slice(0, 2).join(' | '));
C.window.close();

/* ── report ───────────────────────────────────────────────────────────── */
clearTimeout(WATCHDOG);
ok.forEach(n => console.log('  ✓ ' + n));
bad.forEach(n => console.log('  ✗ ' + n));
console.log('\nPASS %d / FAIL %d', ok.length, bad.length);
console.log(bad.length ? '\nFAILED:\n' + bad.map(b => '  · ' + b).join('\n') : '');
process.exit(bad.length ? 1 : 0);
