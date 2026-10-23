/* t-v227 — the reading layer: elements, physics, words.
   ───────────────────────────────────────────────────────────────────────
   The owner's fourth ask was the vaguest and the most visible: "make design
   elements and design physics and design texts more better". v227 answers it
   with measurable things, and this suite measures them:

     1 · the hero cue is a control — on this home page it was 44% white
         inside 60% opacity (measured in jsdom, not guessed); the legacy
         variant was a bare <div> that ate taps and answered nothing;
     2 · text that fits (the live-rate strip truncated the rate itself on a
         phone; a long .btn-lg label could not wrap);
     3 · one rupee sign in the rate line (it read "₹₹6,998/g");
     4 · gold you can read — no body copy in this layer under .62 alpha;
     5 · the footer bleeds by the nav's MEASURED height, not a guess;
     6 · rail physics honour prefers-reduced-motion, and nothing here re-covers
         the press surfaces v226, motion.js and mobile.css already own.

   jsdom resolves no layout, so the CSS claims are asserted against the layer
   and the shipped bundle — what actually reaches a phone — while everything
   jsdom CAN do (the real button, the real click, the real guard, the real
   inline style) is asserted live. A watchdog fails the suite instead of
   letting it hang. Whitespace-tolerant; no text that exists only in a
   comment. */
import fs from 'node:fs';
import { boot, click, wait } from './harness.mjs';

const WATCHDOG = setTimeout(() => {
  console.log('FAIL watchdog: the suite did not finish in 300 s');
  process.exit(1);
}, 300000);
if (WATCHDOG.unref) WATCHDOG.unref();

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const read = p => fs.readFileSync(p, 'utf8');
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;

const APP = read('cms/js/app.js');
const APP_J = stripJs(APP);
const LAYER = read('cms/css/v227.css');
const LAYER_C = stripCss(LAYER);
const JS = read('cms/js/v227.js');
const JS_J = stripJs(JS);
const BUNDLE = read('cms/css/shivaa.css');
const INDEX = read('cms/index.html');
const ORDER = read('tools/css-bundle-order.txt').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

/* ── 1 · the rate line: one rupee sign ─────────────────────────────────── */
{
  const line = (APP.match(/const tickTxt = `[^`]*`;/) || [''])[0];
  T('rate line: the ribbon prints one rupee sign per figure, not two',
    /\$\{fmt\(R\.gold22\)\}/.test(line) && !/₹\$\{fmt\(/.test(line) && !/₹\$\{fmt2\(/.test(line),
    line.replace(/\s+/g, ' ').slice(0, 90));
  T('rate line: fmt() prints it (it has since v120)',
    APP.includes("const fmt = n => '₹' +") && APP.includes("const fmt2 = "));
  T('one rupee sign: v227.js still guards the line (the API/CMS feeds it)',
    JS_J.includes('function tickerFix()') && JS.includes('u00a0') && JS.includes('*₹/') &&
    JS_J.includes("doc.getElementById('rateStrip')"));
  T('one rupee sign: the guard can run AGAIN — the strip is re-rendered every 30 s',
    !/__v227t/.test(JS) && JS.includes('MutationObserver') &&
    JS.includes('observe(host, { childList: true })'));
}

/* ── 2 · the hero cue is a control, and it is still ────────────────────── */
T('cue: the injected legacy hint is a real button with a name',
  APP.includes('data-hero-cue') &&
  /<button type="button" class="hero-cue" data-hero-cue aria-label="/.test(APP) &&
  APP.includes('<span>Explore Shivaa</span>') && !/<div class="hero-cue">/.test(APP));
T('cue: the home page own discover button is readable now',
  /\.black-hero \.hero-cue \{\s*opacity: 1;\s*color: rgba\(246, 232, 200, \.84\);/.test(LAYER_C) &&
  /\.black-hero \.hero-cue \{[^}]*border: 1px solid rgba\(232, 195, 105, \.28\);/.test(LAYER_C) &&
  /\.black-hero \.hero-cue \{[^}]*border-radius: 999px;/.test(LAYER_C) &&
  /@media \(pointer: coarse\) \{\s*\.black-hero \.hero-cue \{ min-height: var\(--shv-reach\); \}/.test(LAYER_C));
T('cue: it presses like the rest of the house, and never moves the page',
  /\.black-hero \.hero-cue:active \{ transform: translateX\(-50%\) scale\(var\(--shv-press\)\); \}/.test(LAYER_C) &&
  /\.black-hero \.hero-cue \{[^}]*touch-action: pan-y;/.test(LAYER_C) &&
  !/\.black-hero \.hero-cue \{[^}]*z-index/.test(LAYER_C));
T('cue: the layer styles only the injected variant, so nothing else is repainted',
  /\.hero-cue\[data-hero-cue\] \{/.test(LAYER_C) && !/^\.hero-cue \{/m.test(LAYER_C));
T('cue: the endless blink is gone from the injected hint',
  /\.hero-cue\[data-hero-cue\] \{[^}]*animation: none;/.test(LAYER_C));
T('cue: the injected hint has a real tap target and a press token',
  /\.hero-cue\[data-hero-cue\] \{[^}]*min-height: 40px;/.test(LAYER_C) &&
  /\.hero-cue\[data-hero-cue\]:active \{ transform: translateX\(-50%\) scale\(var\(--shv-press\)\); \}/.test(LAYER_C));
T('cue: it keeps its centring transform in every state',
  (LAYER_C.match(/translateX\(-50%\)/g) || []).length >= 3 &&
  !/\.hero-cue\[data-hero-cue\][^{]*\{[^}]*transform: none/.test(LAYER_C));
T('cue: it steps aside once the hero is passed, and on a short window',
  /\.hero-cue\[data-hero-cue\]\.is-gone \{ opacity: 0; pointer-events: none; \}/.test(LAYER_C) &&
  /@media \(max-height: 620px\) \{\s*\.hero-cue\[data-hero-cue\] \{ display: none; \}/.test(LAYER_C));
T('cue: reduced motion is honoured (no transition, no scale)',
  /@media \(prefers-reduced-motion: reduce\) \{[^@]*\.hero-cue\[data-hero-cue\][^}]*transition: none/.test(LAYER_C) &&
  /\.hero-cue\[data-hero-cue\]:active \{ transform: translateX\(-50%\); \}/.test(LAYER_C));
T('cue: the wiring goes somewhere real, once, and then steps out of the way',
  JS_J.includes('var next = hero && hero.nextElementSibling') &&
  JS_J.includes('win.scrollTo({ top: Math.max(0, top - 8)') &&
  JS_J.includes("cue.classList.add('is-gone')") &&
  (JS_J.match(/addEventListener\('scroll'/g) || []).length === 1 &&
  !JS_J.includes('requestAnimationFrame'));

/* ── 3 · text that fits ────────────────────────────────────────────────── */
T('type: the live-rate strip reflows on a phone instead of truncating the rate',
  /@media \(max-width: 768px\) \{[^@]*\.ub-rates \{[^}]*overflow: visible; text-overflow: clip; white-space: normal;/.test(LAYER_C) &&
  /\.utilbar-in \{ height: auto; min-height: 38px;/.test(LAYER_C));
T('type: a long .btn-lg label wraps instead of running off the button',
  /@media \(max-width: 768px\), \(pointer: coarse\) \{\s*\.btn-lg \{ white-space: normal; line-height: 1.3; text-wrap: balance; max-width: 100%; \}/.test(LAYER_C));

/* ── 4 · gold you can read ─────────────────────────────────────────────── */
{
  const low = [];
  const re = /(?<![-\w])color:\s*rgba\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(LAYER_C))) {
    const a = parseFloat(m[1].split(',')[3]);
    if (!isNaN(a) && a < 0.62) low.push(a);
  }
  T('contrast: no body copy in this layer sits under .62 alpha', low.length === 0, low.join(', '));
  T('contrast: the deepest footer lines are the ones it fixed',
    /\.fv-base \{ color: rgba\(233, 213, 168, \.68\); \}/.test(LAYER_C) &&
    /\.fvt-id \{ color: rgba\(233, 213, 168, \.7\); \}/.test(LAYER_C) &&
    /\.fv-base-links a \{ color: rgba\(233, 213, 168, \.72\); \}/.test(LAYER_C));
}

/* ── 5 · the footer bleeds by the nav's measured height ────────────────── */
T('footer: the bleed follows the measured nav, with the measured fallback',
  /:root \{[^}]*--shv-mnav-h: 64px;/.test(LAYER_C) &&
  /margin-bottom: calc\(-1 \* \(var\(--shv-mnav-h\) \+ env\(safe-area-inset-bottom, 0px\)\)\);/.test(LAYER_C) &&
  /padding-bottom: calc\(26px \+ var\(--shv-mnav-h\) \+ env\(safe-area-inset-bottom, 0px\)\);/.test(LAYER_C));
T('footer: the same selector shape as mobile.css, so the newer layer wins',
  /body:not\(\[data-page="product"\]\):not\(\[data-page="admin"\]\):not\(\[data-page="partner"\]\) \.footer\.fv101 \{/.test(LAYER_C));
T('footer: in-page anchors no longer land under the tab bar',
  /html \{ scroll-padding-bottom: calc\(var\(--shv-mnav-h\) \+ 12px\); \}/.test(LAYER_C) &&
  /#backTop \{ bottom: calc\(var\(--shv-mnav-h\) \+ 22px \+ env\(safe-area-inset-bottom, 0px\)\); \}/.test(LAYER_C));
T('footer: the height is measured at runtime, never guessed',
  JS_J.includes('function mnavMeasure()') &&
  JS_J.includes("doc.documentElement.style.setProperty('--shv-mnav-h', h + 'px')") &&
  JS_J.includes('if (h >= 40 && h <= 160)'));

/* ── 6 · rails, press surfaces, and what this layer must NOT do ────────── */
T('rails: reduced motion stops the rail animating, without touching snapping',
  /@media \(prefers-reduced-motion: reduce\) \{\s*\.catbar2, \.c-dots \+ \.catbar2, \.shv-rail \{ scroll-behavior: auto; \}/.test(LAYER_C) &&
  BUNDLE.includes('scroll-snap-type: x mandatory') &&
  BUNDLE.includes('overscroll-behavior-x: contain') &&
  !/touch-action: manipulation/.test(LAYER_C));
T('rails: the active chip is centred on arrival without moving the page',
  JS_J.includes('function railActive()') && JS_J.includes('rail.scrollTo({ left: target') &&
  !JS_J.includes('scrollIntoView') && JS_J.includes("chip.setAttribute('aria-current', 'true')"));
T('physics: only two press heads, both the cue controls v227 owns',
  (() => {
    const heads = [...LAYER_C.matchAll(/([^{}]*):active[^{]*\{/g)].map(m => m[1].trim());
    return heads.length === 3 &&
      heads.every(h => h === '.hero-cue[data-hero-cue]' || h === '.black-hero .hero-cue');
  })());
T('physics: no layout is animated — transform and opacity only',
  !/:active \{[^}]*(width|height|top|left|margin|padding)\s*:/.test(LAYER_C) &&
  (LAYER_C.match(/@keyframes/g) || []).length === 1);
T('physics: the busy dot is the only animation, and reduced motion stops it',
  /@keyframes v227Wait \{ 0%, 100% \{ opacity: \.35; \} 50% \{ opacity: 1; \} \}/.test(LAYER_C) &&
  /@media \(prefers-reduced-motion: reduce\) \{\s*\.bc-commerce-status\[data-state="checking"\]::before \{ animation: none; opacity: \.8; \}/.test(LAYER_C));
T('physics: no filter, blur or mix-blend in a reading layer',
  !/(filter|backdrop-filter|mix-blend-mode)\s*:/.test(LAYER_C));
T('physics: nothing shouts — no !important in this layer at all',
  !/!important/.test(LAYER_C));

/* ── 7 · the shell ships it ────────────────────────────────────────────── */
T('shell: v235.css is the last layer and v227.js loads after app.js',
  ORDER[ORDER.length - 1] === 'v235.css' && ORDER[ORDER.length - 2] === 'v234.css' &&
  BUNDLE.lastIndexOf('/* v235.css */') > BUNDLE.lastIndexOf('/* v234.css */') &&
  INDEX.indexOf('/js/v227.js?v=235') > INDEX.indexOf('/js/app.js?v=235'));

/* ── 8 · live: the page a shopper gets ────────────────────────────────── */
{
  const { window, doc, errors } = await boot('#/');
  await wait(1200);
  const cue = doc.querySelector('.hero-cue');
  const cs = cue ? window.getComputedStyle(cue) : null;
  T('live: the home hero carries its cue as a real button, wired to a real section',
    !!cue && cue.tagName === 'BUTTON' && /blackPrivileges/.test(cue.getAttribute('onclick') || '') &&
    !!doc.getElementById('blackPrivileges'),
    cue ? cue.textContent.trim() : 'no cue');
  T('live: and it is readable — the measured 44%-inside-60% bug is fixed',
    !!cs && cs.opacity === '1' && /rgba\(246, 232, 200, 0\.84\)/.test(cs.color),
    cs ? 'opacity ' + cs.opacity + ' · colour ' + cs.color : 'no style');
  const strip = doc.getElementById('rateStrip');
  T('live: the rate strip renders with no doubled rupee sign anywhere',
    !!strip && !/₹\s*₹/.test(strip.textContent) && /₹[\d,]+/.test(strip.textContent),
    strip ? strip.textContent.replace(/\s+/g, ' ').trim().slice(0, 84) : 'no strip');
  T('live: the QA hooks the release publishes are there',
    !!window.Shivaa227 && typeof window.Shivaa227.settle === 'function' &&
    typeof window.Shivaa227.tickerFix === 'function' && !!window.Shivaa227.stats);

  /* the guard, proven: hand the strip a doubled sign and let v227 fix it */
  const probe = doc.createElement('span');
  probe.textContent = '✦ ₹₹7,123/g';
  strip.appendChild(probe);
  window.Shivaa227.tickerFix();
  T('live: a doubled sign from the API/CMS is collapsed to one',
    probe.textContent === '✦ ₹7,123/g', probe.textContent);

  /* the cue goes somewhere: jsdom does not scroll, so the call itself is
     recorded — the same claim a browser would make, minus the pixels */
  const seen = [];
  window.Element.prototype.scrollIntoView = function () { seen.push(this.id || this.className || this.tagName); };
  click(window, cue);
  T('live: pressing the cue runs the scroll it promises',
    seen.length === 1 && seen[0] === 'blackPrivileges', seen.join(', '));
  T('live: the nav height was measured, and a hidden nav never publishes 0',
    (() => { const v = doc.documentElement.style.getPropertyValue('--shv-mnav-h'); return v === '' || parseFloat(v) >= 40; })(),
    doc.documentElement.style.getPropertyValue('--shv-mnav-h') || '(unset — CSS fallback 64px)');
  T('live: below-the-fold art that the templates carry is deferred and sized',
    /class="news-logo" alt="Shivaa" loading="lazy" decoding="async" width="150" height="46"/.test(APP) &&
    /poster-heritage\.jpg" alt="The Heritage Edit" loading="lazy" decoding="async" width="1584" height="672"/.test(APP));
  T('live: the repeating photo frames still declare their own box (no CLS)',
    /\.tv-ph \{ aspect-ratio: 1;/.test(BUNDLE) && /\.ugc-ph\{position:relative;aspect-ratio:4\/5/.test(BUNDLE) &&
    /\.cb-img\{position:relative;width:84px;height:84px/.test(BUNDLE));
  T('live: the release adds no layout-thrashing scroll handler',
    !JS.includes('scrollHeight') && !JS.includes('clientHeight') &&
    !JS.includes('requestAnimationFrame'));
  T('live: no page errors from the reading layer', errors.filter(e => !NOISE.test(e)).length === 0,
    errors.filter(e => !NOISE.test(e)).join(' | ').slice(0, 180));
}

clearTimeout(WATCHDOG);
console.log(ok.map(n => '  ✓ ' + n).join('\n'));
if (bad.length) { console.log('\n' + bad.map(n => '  ✗ ' + n).join('\n')); console.log('\nFAIL ' + bad.length + ' of ' + (ok.length + bad.length)); process.exit(1); }
console.log('\nPASS ' + ok.length + ' of ' + ok.length);
process.exit(0);
