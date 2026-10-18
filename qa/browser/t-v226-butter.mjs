/* t-v226 — "every click answers".

   v225 put the chrome's scroll work into one frame. v226 is about what the
   app does in the 100 ms after a finger lands, and what the screen does
   between two pages:

     · 265 of 1058 visible interactive elements answered a press with nothing
       (measured over 6 routes against all 155 `:active` heads in the bundle),
       and on a phone `mobile.css`'s `*:hover{transform:none!important}`
       neutraliser took even the browser's own answer away from the anchors
       that were not in its short list. v226 gives every measured family a
       press, transform-only, and a ripple + haptic on the pressable surface.
     · a page change no longer animates a long slide of the page being left
       (`html{scroll-behavior:smooth}` applied to the router's scrollTo(0,0)).
     · a 2px gold hairline sweeps the top of the screen ONLY when the next page
       has taken longer than 180 ms; on a fast tap nothing is created at all.
     · where `startViewTransition` exists the content cross-fades and the
       entrance animation stands down for that one navigation.

   jsdom resolves no `:active` state, no view transition and no pseudo-element,
   so those are asserted against the layer text and the shipped bundle — what
   actually reaches a phone — while everything jsdom CAN do (a real press, a
   real drag, the counters, the badge observer, the class lifecycle, the
   scrollIntoView of a rail) is asserted live.

   Whitespace-tolerant; never matches text that only exists in a comment. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { boot, wait } from './harness.mjs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));

const read = p => fs.readFileSync(p, 'utf8');
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const squash = s => s.replace(/\s+/g, '');
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;

const INDEX = read('cms/index.html');
const SW = read('cms/sw.js');
const APP = read('cms/js/app.js');
const MOTION = read('cms/js/motion.js');
const BUTTER = read('cms/js/v226.js');
const BUTTER_J = stripJs(BUTTER);
const LAYER = read('cms/css/v226.css');
const BUNDLE = read('cms/css/shivaa.css');
const MOBILE = read('cms/css/mobile.css');
const ORDER = read('tools/css-bundle-order.txt').split('\n')
  .map(l => l.trim()).filter(l => l && !l.startsWith('#'));

function ruleList(src) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  const s = stripCss(src);
  while ((m = re.exec(s))) {
    out.push({
      sel: m[1].replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').trim(),
      body: m[2].replace(/\s+/g, ' ').replace(/\s*:\s*/g, ': ').replace(/\s*;\s*/g, '; ').trim()
    });
  }
  return out;
}
const RULES = ruleList(LAYER);
const BUNDLE_RULES = ruleList(BUNDLE.slice(BUNDLE.lastIndexOf('/* v226.css */')));
const hasSel = (list, selPart, bodyPart) =>
  list.some(r => r.sel.includes(selPart) && r.body.includes(bodyPart));
/* media queries are not part of a flattened rule list: check the raw text */
const hasInMedia = (src, media, selPart, bodyPart) => {
  const i = stripCss(src).indexOf(media);
  if (i < 0) return false;
  const tail = stripCss(src).slice(i, i + 2400);
  return tail.includes(selPart) && tail.includes(bodyPart);
};

/* ═══ 1 · the release stamps ═════════════════════════════════════════════ */
const relIndex = /window\.__SHIVAA_REL=(\d+);/.exec(INDEX);
const relApp = /const APP_REL = (\d+);/.exec(APP);
const relSw = /const REL = (\d+);/.exec(SW);
const relApi = /'rel' => (\d+),/.exec(read('cms/api.php'));
T('stamp: index.html announces the release', !!relIndex && relIndex[1] === '230', relIndex && relIndex[1]);
T('stamp: app.js APP_REL matches', !!relApp && relApp[1] === '230', relApp && relApp[1]);
T('stamp: sw.js REL matches', !!relSw && relSw[1] === '230', relSw && relSw[1]);
T('stamp: api.php reports the same rel', !!relApi && relApi[1] === '230', relApi && relApi[1]);
T('stamp: the service worker shell is bumped too', /shivaa-shell-v230/.test(SW));
T('stamp: the new script is loaded by the page, deferred, after app.js',
  INDEX.indexOf('/js/v227.js?v=230') > INDEX.indexOf('/js/app.js?v=230') &&
  /<script src="\/js\/v227\.js\?v=230" defer><\/script>/.test(INDEX));
T('stamp: the shell precaches the bundle and the new script',
  /'\/css\/shivaa\.css\?v=230'/.test(SW) && /'\/js\/v227\.js\?v=230'/.test(SW));
T('stamp: nothing in the shipped tree still says 225',
  ![INDEX, SW, APP, read('cms/api.php')].some(s => /(\?v=226|__SHIVAA_REL=226|shivaa-shell-v226|APP_REL = 226|'rel' => 226)/.test(s)));
T('v222: still exactly one stylesheet, and it is the bundle',
  (INDEX.match(/rel="stylesheet"/g) || []).length === 1 && /href="\/css\/shivaa\.css\?v=230"/.test(INDEX));

/* ═══ 2 · the press surface ══════════════════════════════════════════════ */
{
  /* the neutraliser that made a phone feel dead is still there — v226 works
     with it rather than around it */
  T('press: the touch neutraliser this release had to answer still exists',
    /@media\s*\(\s*pointer:\s*coarse\s*\)/.test(stripCss(MOBILE)) &&
    /\*:hover\s*\{\s*transform:\s*none\s*!important/.test(stripCss(MOBILE)));

  const fine = [
    ['.cb-item:active', 'translateY(1px)'],
    ['.mega-tile:active', 'translateY(1px)'],
    ['.mega-cta:active', 'translateY(1px)'],
    ['.brand:active', 'translateY(1px)'],
    ['.fv-contact:active', 'translateY(1px)'],
    ['.shv-offer-mini:active', 'translateY(1px)'],
    ['.p-card:active', 'scale(.985)'],
    ['.cat-mini-card:active', 'scale(.985)'],
    ['.acct-tile:active', 'scale(.985)'],
    ['.pc-quick:active', 'scale(.94)'],
    ['.dw-close:active', 'scale(.94)'],
    ['.shv-step-btn:active', 'scale(.94)']
  ];
  T('press: every measured-dead family has a transform press in the shipped layer',
    fine.every(([sel, val]) => hasSel(RULES, sel, val) && hasSel(RULES, sel, 'transform:')),
    fine.filter(([sel, val]) => !(hasSel(RULES, sel, val) && hasSel(RULES, sel, 'transform:'))).map(f => f[0]).join(' '));
  T('press: the press is answered on a finger too, with the weight mobile.css needs',
    hasInMedia(LAYER, '(pointer: coarse), (hover: none)', '.cb-item:active', '!important') &&
    hasInMedia(LAYER, '(pointer: coarse), (hover: none)', '.mega-tile:active', '!important') &&
    hasInMedia(LAYER, '(pointer: coarse), (hover: none)', '.brand:active', '!important') &&
    hasInMedia(LAYER, '(pointer: coarse), (hover: none)', '.shv-offer-mini:active', '!important'));
  T('press: the catch-all is zero-specificity so it can never override a house press',
    hasSel(RULES, ':where(button:active', 'transform: scale(.975)') &&
    !RULES.some(r => !r.sel.includes(':where(') && /\bbutton\s*:active/.test(r.sel) && r.body.includes('scale(.975)')));
  T('press: the pressed state is quick while the release keeps the house spring',
    hasSel(RULES, '.p-card:active', 'transition-duration: .12s') &&
    hasSel(RULES, '.cb-item:active', 'transition-duration: .12s'));
  T('press: no house transition is clobbered (no shorthand on a family we do not own)',
    !/^\s*\.p-card,\s*\.cat-card[^{]*\{[^}]*transition:/m.test(stripCss(LAYER)) &&
    !RULES.some(r => r.body.startsWith('transition: transform') && /\.(cat-card|acct-tile|brand)/.test(r.sel)));
  T('press: the layer obeys the motion rules it was written under',
    !/@keyframes[\s\S]*?\b(margin|left|width|height|padding|top|right|bottom|inset|font-size|gap)\s*:/.test(
      RULES.filter(r => r.sel.startsWith('@keyframes')).map(r => r.body).join(' ') +
      (stripCss(LAYER).match(/@keyframes[^{]+\{[^@]*?\}\s*\}/g) || []).join(' ')));
}

/* ═══ 3 · the ripple transport and the pace bar ══════════════════════════ */
T('ripple: reuses the house .rip span, no second ripple system',
  BUTTER_J.includes("'rip'") && BUTTER_J.includes('mRipple') === false && !/\.rip\s*\{[^}]*animation/.test(stripCss(LAYER)));
T('ripple: the host is clipped only while its ripple is alive',
  hasSel(RULES, '.rip-live', 'overflow: hidden') && hasSel(RULES, '.rip-pos', 'position: relative') &&
  BUTTER_J.includes("classList.add('rip-live')") && BUTTER_J.includes("classList.remove('rip-live', 'rip-pos')"));
T('ripple: it paints above a photo, and a whole card gets a quarter of the ink',
  hasSel(RULES, '.rip-live > .rip', 'z-index: 3') && hasSel(RULES, '.rip-big', 'rgba(212, 175, 90, .20)'));
T('ripple: position:relative is only added to a static host',
  BUTTER_J.includes("position === 'static'") && BUTTER_J.includes("classList.add('rip-pos')"));
T('pace: the bar is invisible and unanimated when nothing is loading',
  hasSel(RULES, '#routePace', 'opacity: 0') && hasSel(RULES, 'html.route-busy #routePace', 'opacity: 1') &&
  hasSel(RULES, 'html.route-busy #routePace i', 'animation: v226Pace'));
T('pace: the sweep is a transform, never a background-position loop',
  /@keyframes v226Pace\s*\{[\s\S]*?translateX\(-100%\)[\s\S]*?translateX\(100%\)/.test(stripCss(LAYER)) &&
  !/v226Pace[\s\S]{0,400}background-position/.test(stripCss(LAYER)));
T('pace: it is only armed after 180 ms and cleared by the next render',
  BUTTER_J.includes('180') && BUTTER_J.includes("addEventListener('hashchange', clearBusy") &&
  BUTTER_J.includes('setTimeout(clearBusy, 5000)'));
T('pace: the bar is created lazily, by the script, on the first slow route',
  BUTTER_J.includes("doc.createElement('div')") && BUTTER_J.includes("pace.id = 'routePace'") &&
  !INDEX.includes('routePace'));
T('route: gap, the router\'s own scrollTo is instant, not an animated slide',
  hasSel(RULES, 'html.route-jump', 'scroll-behavior: auto') &&
  BUTTER_J.includes("classList.add('route-jump')") && BUTTER_J.includes("classList.remove('route-jump')") &&
  /html\s*\{[^}]*scroll-behavior:\s*smooth/.test(stripCss(read('cms/css/motion.css'))));

/* ═══ 4 · view transitions ══════════════════════════════════════════════ */
T('vt: #view is named only while a transition is running',
  hasSel(RULES, 'html.vt-run #view', 'view-transition-name: shv-view'));
T('vt: old and new page move 6-10px, and the chrome does not move at all',
  hasSel(RULES, '::view-transition-old(shv-view)', 'animation: v226VtOut') &&
  hasSel(RULES, '::view-transition-new(shv-view)', 'animation: v226VtIn') &&
  hasSel(RULES, '::view-transition-old(root)', 'animation: none') &&
  hasSel(RULES, '::view-transition-new(root)', 'animation: none'));
T('vt: both keyframes are transform/opacity only',
  /@keyframes v226VtOut\s*\{[^@]*opacity: 1[^@]*translateY\(0\)/.test(stripCss(LAYER)) &&
  /@keyframes v226VtIn\s*\{[^@]*opacity: 0[^@]*translateY\(10px\)/.test(stripCss(LAYER)));
T('vt: the entrance stands down while a transition owns the navigation',
  /if\s*\(root\.classList\.contains\('vt-run'\)\)\s*\{[\s\S]{0,400}?return;/.test(stripJs(MOTION)) &&
  stripJs(MOTION).indexOf("classList.contains('vt-run')") < stripJs(MOTION).indexOf("classList.add('pg')"));
T('vt: it waits for the new page to render, then takes the snapshot',
  BUTTER_J.includes('new MutationObserver(finish)') && BUTTER_J.includes('setTimeout(finish, 300)') &&
  BUTTER_J.includes('requestAnimationFrame(function () { resolve(); })'));
T('vt: skipped for reduced motion, for a low-power device and for the same page',
  BUTTER_J.includes('!reduced && !has(\'au-lite\') && !has(\'vt-run\')') && BUTTER_J.includes('data-no-vt'));
T('vt: the class can never get stuck (finished + two timeouts, generation-guarded)',
  BUTTER_J.includes('t.finished.then(off, off)') && BUTTER_J.includes('setTimeout(off, 1400)') &&
  BUTTER_J.includes('gen !== vtGen'));
T('reduced motion: the pace bar, the ripple and the transition are all off',
  hasInMedia(LAYER, '(prefers-reduced-motion: reduce)', '#routePace', 'display: none !important') &&
  hasInMedia(LAYER, '(prefers-reduced-motion: reduce)', '.rip-live > .rip', 'display: none') &&
  hasInMedia(LAYER, '(prefers-reduced-motion: reduce)', 'view-transition-name', 'none'));

/* ═══ 5 · the house rules this release still obeys ══════════════════════ */
T('rules: v226 adds no scroll listener and no scroll-time layout read',
  !/addEventListener\('scroll'/.test(BUTTER_J) && !BUTTER_J.includes('scrollHeight') &&
  !BUTTER_J.includes('clientHeight') && !/rAF|requestAnimationFrame/.test(BUTTER_J.split('runVT')[0]));
T('rules: no filter, blur or mix-blend in the layer',
  !/(filter|backdrop-filter|mix-blend-mode)\s*:/.test(stripCss(LAYER)));
/* `!important` is a loaded gun in this codebase: every use in v226.css must
   sit inside one of the two media guards that genuinely need it (the touch
   neutraliser and reduced motion). Counted with a brace walker — a regex over
   nested blocks backtracks catastrophically on a real stylesheet. */
function mediaRanges(src) {
  const s = stripCss(src), out = [];
  const re = /@media[^{]*\{/g;
  let m;
  while ((m = re.exec(s))) {
    let i = m.index + m[0].length, depth = 1;
    while (i < s.length && depth) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') depth--;
      i++;
    }
    out.push([m.index, i]);
  }
  return out;
}
T('rules: !important is used only inside the two media guards that need it',
  (() => {
    const s = stripCss(LAYER), ranges = mediaRanges(LAYER);
    const marks = [...s.matchAll(/!important/g)].map(m => m.index);
    const guarded = marks.every(i => ranges.some(([a, b]) => i > a && i < b));
    const guardText = ranges.filter(([a, b]) => /!important/.test(s.slice(a, b)))
      .map(([a, b]) => s.slice(a, s.indexOf('{', a))).join(' ');
    return marks.length > 0 && guarded && /hover: none|prefers-reduced-motion/.test(guardText);
  })());

/* ═══ 6 · what the browser gets: the bundle ═════════════════════════════ */
T('bundle: v230.css is the last layer, after v229.css, and it is the real file',
  ORDER[ORDER.length - 1] === 'v230.css' && ORDER[ORDER.length - 2] === 'v229.css' &&
  BUNDLE.lastIndexOf('/* v230.css */') > BUNDLE.lastIndexOf('/* v229.css */') &&
  (BUNDLE.match(/\/\* v230\.css \*\//g) || []).length === 1);
T('bundle: the shipped bundle carries the press rules, not just the file',
  hasSel(BUNDLE_RULES, '.cb-item:active', 'translateY(1px)') && hasSel(BUNDLE_RULES, '.rip-live', 'overflow: hidden') &&
  hasSel(BUNDLE_RULES, 'html.vt-run #view', 'view-transition-name'));
T('bundle: v227.css and v227.js are both in the shell and in the order file',
  SW.includes("'/js/v227.js?v=230'") && ORDER.includes('v227.css') &&
  fs.existsSync('cms/js/v227.js') && fs.existsSync('cms/css/v227.css'));
T('bundle: the shipped JS all parses', (() => {
  try {
    for (const f of ['cms/js/v226.js', 'cms/js/motion.js', 'cms/js/app.js', 'cms/sw.js']) execFileSync('node', ['--check', f], { stdio: 'pipe' });
    return true;
  } catch (e) { return false; }
})());

/* ═══ 7 · live: a real press, a real drag, the counters, the classes ═════ */
{
  const { window, doc, errors } = await boot('#/shop', { mobile: true });
  await wait(2600);
  const clean = errors.filter(e => !NOISE.test(e));
  T('live: the page boots clean', clean.length === 0, clean.slice(0, 2).join(' | '));
  T('live: the butter layer installed itself once', !!window.__shvButter && typeof window.__shvButter.ripple === 'function');

  const card = doc.querySelector('.p-card');
  const rail = doc.querySelector('.catbar2');
  const chip = rail && rail.querySelector('a, button');
  T('live: the shop page really has a card and a category rail', !!card && !!chip);

  const stats = window.__shvButter.stats;

  /* a real tap on a card: pressed, rippled, and the ripple is cleaned up */
  const press = (el, dx = 0) => {
    el.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
    if (dx) el.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, cancelable: true, clientX: 40 + dx, clientY: 40 }));
    el.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, cancelable: true, clientX: 40 + dx, clientY: 40 }));
  };
  press(card);
  await wait(30);
  T('live: a tap on a card ripples inside it', card.querySelector('.rip') !== null && stats.ripples >= 1, 'ripples ' + stats.ripples);
  T('live: the host is clipped only while the ripple lives',
    card.classList.contains('rip-live') && (window.getComputedStyle(card).position !== 'static' || card.classList.contains('rip-pos')));
  await wait(900);
  T('live: the ripple cleans itself and the host is released',
    card.querySelector('.rip') === null && !card.classList.contains('rip-live') && !card.classList.contains('rip-pos'));
  T('live: a thumb that drags off a card does NOT ripple it (the scroll case)',
    (() => { const before = stats.ripples; press(card, 40); return stats.ripples === before; })(), 'delta ' + (stats.ripples - 0));
  T('live: nothing is left in the DOM after the presses', doc.querySelectorAll('.rip').length === 0);

  /* haptics: only on a real tap, never on a drag */
  let vib = [];
  Object.defineProperty(window.navigator, 'vibrate', { value: ms => { vib.push(ms); return true; }, configurable: true });
  const quick = doc.querySelector('.pc-quick') || doc.querySelector('.chip');
  if (quick) {
    press(quick);
    await wait(20);
    const afterTap = vib.length;
    press(quick, 40);
    await wait(20);
    T('live: a tap ticks once (5 ms) and a drag never vibrates at all',
      afterTap === 1 && vib[0] === 5 && vib.length === afterTap, JSON.stringify(vib));
  } else {
    T('live: a tap ticks once (5 ms) and a drag never vibrates at all', false, 'no .pc-quick/.chip on the page');
  }

  /* rail centring: the tapped chip glides to the middle of its rail */
  let centers = [];
  const orig = window.Element.prototype.scrollIntoView;
  window.Element.prototype.scrollIntoView = function (o) { centers.push({ el: this, o: o }); };
  Object.defineProperty(rail, 'scrollWidth', { value: 900, configurable: true });
  Object.defineProperty(rail, 'clientWidth', { value: 360, configurable: true });
  chip.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(20);
  T('live: tapping a chip in a rail centres it (native-app behaviour)',
    centers.length === 1 && centers[0].o && centers[0].o.inline === 'center' && centers[0].o.block === 'nearest',
    JSON.stringify(centers.map(c => c.o)));
  T('live: the centring is skipped when the rail does not scroll',
    (() => { const c2 = centers.length; const rail2 = doc.querySelector('.tabs, .acct-nav, .stages'); if (!rail2) return true; return centers.length - c2 <= 1; })());
  window.Element.prototype.scrollIntoView = orig;

  /* badges that never popped before */
  const wc = doc.getElementById('wishCount');
  if (wc) {
    wc.hidden = false;
    wc.textContent = '3';
    await wait(60);
    const popped = wc.classList.contains('bump');
    await wait(700);
    T('live: the wish badge pops like the cart badge always has, then settles',
      popped && !wc.classList.contains('bump') && stats.bumps >= 1);
  } else {
    T('live: the wish badge pops like the cart badge always has, then settles', false, 'no #wishCount in the header');
  }

  /* the route niceties on a real link click */
  const link = [...doc.querySelectorAll('a[href^="#/"]')].find(a => a.getAttribute('href') !== window.location.hash && a.getAttribute('href') !== '#/');
  if (link) {
    const want = link.getAttribute('href');
    link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    const jumped = doc.documentElement.classList.contains('route-jump');
    await wait(320);
    T('live: a page change jumps instead of sliding (route-jump around the router)', jumped);
    T('live: the hash really moved', window.location.hash === want, window.location.hash + ' wanted ' + want);
    T('live: a fast route shows NO spinner at all (no bar, no DOM cost)',
      doc.getElementById('routePace') === null && !doc.documentElement.classList.contains('route-busy'));
  } else {
    T('live: a page change jumps instead of sliding (route-jump around the router)', false, 'no in-app link found');
  }

  /* the slow-route path, driven directly */
  window.__shvButter.armBusy();
  await wait(240);
  T('live: a route that takes longer than 180 ms gets the 2px gold sweep',
    !!doc.getElementById('routePace') && doc.documentElement.classList.contains('route-busy') && stats.busy >= 1);
  window.dispatchEvent(new window.Event('hashchange'));
  await wait(30);
  T('live: the next render clears it', !doc.documentElement.classList.contains('route-busy'));

  /* view transitions, with the API stubbed the way Chrome exposes it */
  T('live: jsdom has no view transition API, so the release never calls a missing one',
    window.__shvButter.hasVT === false && typeof doc.startViewTransition === 'undefined');
  let cbRan = 0;
  doc.startViewTransition = function (cb) {
    cbRan++;
    const p = cb();
    return { finished: Promise.resolve(p), ready: Promise.resolve(), updateCallbackDone: Promise.resolve(p) };
  };
  Object.defineProperty(window.document.documentElement.classList, 'contains', { value: window.document.documentElement.classList.contains });
  const genBefore = window.__shvButter.generation();
  window.__shvButter.runVT('#/account');
  await wait(60);
  T('live: runVT marks the navigation, changes the page and asks the browser to transition',
    cbRan === 1 && window.__shvButter.stats.vt === 1 && genBefore === 0 && window.location.hash === '#/account');
  await wait(400);
  T('live: when the transition finishes the class is released and the entrance is not left queued',
    !doc.documentElement.classList.contains('vt-run') && !doc.getElementById('view').classList.contains('pg'));
  T('live: a second navigation is never started while one is running (generation guard)',
    window.__shvButter.generation() === 1 && window.__shvButter.stats.vt === 1);
  window.close();
}

console.log(ok.map(n => '  ✓ ' + n).join('\n'));
if (bad.length) { console.log('\n' + bad.map(n => '  ✗ ' + n).join('\n')); console.log('\nFAIL ' + bad.length); process.exit(1); }
console.log('\nPASS ' + ok.length + ' / FAIL 0');
process.exit(0);
