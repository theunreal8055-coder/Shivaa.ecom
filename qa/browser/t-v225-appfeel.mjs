/* t-v225 — "app feel".

   v223 stopped the films loading themselves before the reader got there.
   v224 took the layout animations off the critical path, rebuilt the four
   churning timers and fixed five usability corners. v225 is about the frame
   the phone is painting while a thumb is moving:

     · ONE scroll frame. app.js and aurum.js each ran their own scroll
       listener, each reading documentElement.scrollHeight on every frame,
       each writing the same chrome. js/v225.js now owns it: one passive
       listener, one rAF, the geometry measured when it can actually change
       (resize, route, a document that grew, three late passes) and never
       inside a frame. #scrollProg takes a quantised transform, #backTop's
       conic ring takes a quantised 1/120 of a turn.
     · The parallax stops measuring mid-frame too: each media element's
       document offset is cached and only re-taken when the hub reports the
       document changed shape — so a scroll frame does ZERO layout reads.
     · Two infinite `background-position` loops become composited translate
       sweeps: @keyframes mSkeleton (the PDP skeleton AND every product card
       photo while it loads) and @keyframes auProg (the 3px progress bar,
       which never idled for a second of any visit).
     · A product card no longer reserves a GPU layer per card on a touch
       device for a hover state a finger cannot trigger.
     · Eight horizontal rails gain snap + gesture ownership, the 16px field
       floor is extended to tablets (iPadOS zooms at any width), five more
       live numeral strips get tabular figures, and the card gets the gold
       hairline the house already draws inside every photo.

   jsdom computes no scroll-snap, no will-change and no pseudo-elements, so
   the declarations that jsdom cannot resolve are asserted against the layer
   text and the shipped bundle — which is what actually goes to a phone —
   while everything jsdom CAN resolve (the hub, the reads, the counters, the
   cascade of a real element) is asserted live.

   Assertions are whitespace-tolerant and never match text that only exists
   in a comment. */
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
const AURUM = read('cms/js/aurum.js');
const HUB = read('cms/js/v225.js');
const LAYER = read('cms/css/v225.css');
const BUNDLE = read('cms/css/shivaa.css');
const ORDER = read('tools/css-bundle-order.txt').split('\n')
  .map(l => l.trim()).filter(l => l && !l.startsWith('#'));

/* jsdom resolves neither pseudo-elements, scroll-snap, will-change nor media
   queries, so the declarations that jsdom cannot compute are read out of the
   layer the browser actually receives. Small rule reader: selector text and
   declarations, whitespace normalised once, so an assertion reads like the
   CSS it is checking. */
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
const BUNDLE_RULES = ruleList(BUNDLE.slice(BUNDLE.lastIndexOf('/* v225.css */')));
const hasSel = (list, selPart, bodyPart) =>
  list.some(r => r.sel.includes(selPart) && r.body.includes(bodyPart));

/* ═══ 1 · the release stamps ═════════════════════════════════════════════ */
const relIndex = /window\.__SHIVAA_REL=(\d+);/.exec(INDEX);
const relApp = /const APP_REL = (\d+);/.exec(APP);
const relSw = /const REL = (\d+);/.exec(SW);
const relApi = /'rel' => (\d+),/.exec(read('cms/api.php'));
T('stamp: index.html announces the release', !!relIndex && relIndex[1] === '227', relIndex && relIndex[1]);
T('stamp: app.js APP_REL matches', !!relApp && relApp[1] === '227', relApp && relApp[1]);
T('stamp: sw.js REL matches', !!relSw && relSw[1] === '227', relSw && relSw[1]);
T('stamp: api.php reports the same rel', !!relApi && relApi[1] === '227', relApi && relApi[1]);
T('stamp: all four agree', [relIndex, relApp, relSw, relApi].every(m => m && m[1] === '227'));
T('stamp: the service worker shell is bumped too', /shivaa-shell-v227/.test(SW));
T('stamp: no asset URL is left on an older release',
  !/\?v=(22[0-5])\b/.test(INDEX) && !/\?v=(22[0-5])\b/.test(SW));
{
  const urls = [...INDEX.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(m => m[1])
    .filter(u => /^\/(js|css|fonts)\//.test(u));
  const unstamped = urls.filter(u => !/\?v=227$/.test(u));
  T('stamp: every script, stylesheet and font URL carries ?v=227',
    unstamped.length === 0 && urls.length > 12, unstamped.slice(0, 3).join(' ') || urls.length + ' urls');
}
T('stamp: index.html loads exactly one stylesheet, and it is the bundle',
  (INDEX.match(/rel="stylesheet"/g) || []).length === 1 && /href="\/css\/shivaa\.css\?v=227"/.test(INDEX));
T('stamp: the shell precaches the bundle and the new script',
  /'\/css\/shivaa\.css\?v=227'/.test(SW) && /'\/js\/v227\.js\?v=227'/.test(SW));
T('stamp: the new script is loaded by the page, deferred, after app.js',
  INDEX.indexOf('/js/v227.js?v=227') > INDEX.indexOf('/js/app.js?v=227') &&
  /<script src="\/js\/v227\.js\?v=227" defer><\/script>/.test(INDEX));

/* ═══ 2 · one scroll frame, and nothing reads layout inside it ═══════════ */
T('hub: v225.js installs window.__shvHub once and refuses a second one',
  /if \(window\.__shvHub\) return;/.test(HUB) && /window\.__shvHub = \{/.test(HUB));
{
  const listeners = [...stripJs(HUB).matchAll(/addEventListener\('scroll'[^)]*\)/g)].map(m => m[0]);
  T('hub: exactly one scroll listener, and it is passive',
    listeners.length === 1 && /passive:\s*true/.test(listeners[0]), listeners.join(' | '));
}
{
  /* the frame body must not contain a single layout read */
  const src = stripJs(HUB);
  const i = src.indexOf('function frame()');
  const open = src.indexOf('{', i);
  let d = 0, end = open;
  for (let j = open; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (!d) { end = j; break; } }
  }
  const body = src.slice(open, end);
  const reads = /scrollHeight|clientHeight|offsetHeight|getBoundingClientRect|offsetWidth|clientWidth|getComputedStyle/.exec(body);
  T('hub: the frame performs no layout read', !reads, reads ? reads[0] : '');
  T('hub: the frame is where the maximum is used, not measured', /y \/ max/.test(body));
  T('hub: the bar write is quantised', /Math\.round\(p \* 1000\)/.test(body));
  T('hub: the ring write is quantised to 1/120',
    /Math\.round\(p \* 120\)/.test(body) && /--au-p/.test(body));
  T('hub: the back-to-top class flips on a band, not per frame', /wantShow !== lastShow/.test(body));
}
T('hub: the geometry is only taken in measure()',
  (stripJs(HUB).match(/scrollHeight/g) || []).length === 1 &&
  (stripJs(HUB).match(/clientHeight/g) || []).length === 1);
T('hub: it re-measures on resize, route, and when the document changes shape',
  /addEventListener\('resize'/.test(HUB) && /addEventListener\('hashchange'/.test(HUB) && /new ResizeObserver/.test(HUB));
T('hub: app.js stands its own progress handler down when the hub is present',
  /if \(window\.__shvHub\) return;/.test(APP) && APP.indexOf('if (window.__shvHub) return;') < APP.indexOf("bar.style.transform = 'scaleX('"));
T('hub: aurum.js does not write the ring a second time',
  /var hub = window\.__shvHub;/.test(AURUM) && /if \(bt && !hub\)/.test(AURUM) &&
  AURUM.indexOf('/* v225') > 0 && AURUM.indexOf('/* v225') < AURUM.indexOf('if (bt && !hub)'));
T('hub: aurum.js reads the cached maximum instead of the document',
  /var hm = hub\.max;/.test(AURUM) && /pxDocH = hm; measurePx\(\);/.test(AURUM));
T('handler: the header .scrolled/.compact owner is left alone (it reads no layout)',
  /wantScrolled !== _scrolled/.test(APP) && /wantCompact !== _compact/.test(APP));

/* ═══ 3 · parallax on a phone, and never measuring mid-frame ════════════ */
T('parallax: a coarse pointer now gets it (fine pointers keep the old gate)',
  /pxOn = !\(reduced \|\| lite \|\| \(!fine && !coarse\)\)/.test(AURUM));
T('parallax: the travel is a third on a phone',
  /var pxAmp = coarse \? 11 : 26;/.test(AURUM) && /-prog \* pxAmp/.test(AURUM) &&
  !/-prog \* 26/.test(stripJs(AURUM)));
T('parallax: each element is measured once and cached',
  /function measurePx\(\)/.test(AURUM) && /im\._auTop = r\.top \+ y/.test(AURUM) && /im\._auH = r\.height/.test(AURUM));
T('parallax: the cache is refreshed from the hub, not from a rect read',
  /hm !== pxDocH/.test(AURUM) && /pxDocH = hm; measurePx\(\)/.test(AURUM));
T('parallax: a detached element is dropped instead of written to for ever',
  /!im\._auV \|\| !im\.isConnected/.test(AURUM) && !/if \(added\) pxImgs/.test(AURUM));

/* ═══ 4 · the two shimmer loops stop repainting ═════════════════════════ */
{
  const kf = /@keyframes v225Sweep\s*\{([\s\S]*?)\n\}/.exec(stripCss(LAYER));
  T('shimmer: the promise is a translate sweep, not a background slide',
    !!kf && /translate:/.test(kf[1]) && !/background-position/.test(kf[1]), kf ? kf[1].replace(/\s+/g, ' ').slice(0, 60) : 'missing');
  T('bar: the sweep is a transform, not a background slide',
    /@keyframes v225BarSweep\s*\{[\s\S]*?transform: translateX/.test(stripCss(LAYER)));
}
T('shimmer: the skeleton retires mSkeleton and re-sweeps on a pseudo-element',
  hasSel(RULES, '.skeleton', 'animation: none') && hasSel(RULES, '.skeleton::after', 'animation: v225Sweep'));
T('shimmer: every loading photo placeholder is converted too',
  hasSel(RULES, '.pc-imgwrap:not(.img-ok)', 'animation: none') &&
  hasSel(RULES, '.tv-ph:not(.img-ok)', 'animation: none') &&
  hasSel(RULES, '.pc-imgwrap:not(.img-ok)::before', 'animation: v225Sweep') &&
  hasSel(RULES, '.tv-ph:not(.img-ok)::before', 'animation: v225Sweep'));
T('shimmer: the photo is lifted over the sweep so it can never be covered',
  hasSel(RULES, '.pc-imgwrap:not(.img-ok)::before', 'z-index: 0') &&
  hasSel(RULES, '.tv-ph:not(.img-ok) img', 'z-index: 1'));
T('shimmer: the gold inner hairline on .pc-imgwrap::after is untouched',
  /\.pc-imgwrap::after\{content:'';position:absolute;inset:9px/.test(squash(stripCss(read('cms/css/styles.css')))));
T('bar: the infinite auProg slide is retired for a composited sweep',
  hasSel(RULES, 'html.js-aurum #scrollProg', 'animation: none') &&
  hasSel(RULES, '#scrollProg::after', 'animation: v225BarSweep'));
T('bar: the bar keeps its exact gold gradient as a static background',
  hasSel(RULES, '#scrollProg', 'background: linear-gradient(90deg, #8a6a24, #d4af5a, #ffe9bd, #d4af5a)'));
T('bar: the sweep cannot show outside the 3px strip', hasSel(RULES, '#scrollProg', 'overflow: hidden'));

/* ═══ 5 · layers, rails, fields, digits, depth ══════════════════════════ */
T('cards: the GPU layer is not reserved on a touch device',
  hasSel(RULES, 'html.au-touch .p-card', 'will-change: auto'));
T('cards: the desktop hover lift keeps its promotion',
  !RULES.some(r => r.sel === '.p-card' && r.body.includes('will-change')) &&
  /\.p-card\{[^}]*will-change:transform/.test(squash(stripCss(read('cms/css/styles.css')))));
T('rails: the eight rails snap and own their gesture',
  hasSel(RULES, '.cat-chips, .adr-sw, .stages, .sz-strip-wrap, .tabs, .acct-nav, .adm-nav', 'scroll-snap-type: x proximity') &&
  hasSel(RULES, '.cat-chips, .adr-sw, .stages, .sz-strip-wrap, .tabs, .acct-nav, .adm-nav', 'overscroll-behavior-x: contain'));
T('rails: the children are the snap points',
  ['.cat-chips', '.adr-sw', '.stages', '.sz-strip-wrap', '.tabs', '.acct-nav', '.adm-nav']
    .every(sel => hasSel(RULES, sel + ' > *', 'scroll-snap-align: start')));
T('rails: the scheme stepper — the one rail with no snap at all — gets it',
  hasSel(RULES, '.shv-stepper-wrap', 'scroll-snap-type: x proximity') &&
  hasSel(RULES, '.shv-step-btn', 'flex: 0 0 auto') &&
  hasSel(RULES, '.shv-step-btn', 'scroll-snap-align: start'));
T('rails: proximity, never mandatory (these are reading rails, not carousels)',
  !/scroll-snap-type: x mandatory/.test(stripCss(LAYER)));
T('rails: the rails that already snapped in v208 are not touched here',
  !/\.hscroll/.test(stripCss(LAYER)) && !/\.catbar[\s,{]/.test(stripCss(LAYER)));
T('fields: the 16px floor now covers the tablet band v224 left out',
  /@media \(min-width: 681px\) and \(max-width: 900px\)/.test(LAYER) &&
  hasSel(RULES, 'input, select, textarea', 'font-size: 16px'));
T('fields: no !important, so the deliberately small admin fields keep their size',
  !/!important/.test(stripCss(LAYER)));
T('digits: the remaining live strips get tabular figures',
  hasSel(RULES, '.rs-ticker', 'font-variant-numeric: tabular-nums') &&
  hasSel(RULES, '.rl-timer', 'tabular-nums') && hasSel(RULES, '.rs-cell b', 'tabular-nums') &&
  hasSel(RULES, '.am-dish-tick', 'tabular-nums'));
T('depth: the card carries the house hairline and firms it on hover',
  hasSel(RULES, '.p-card', 'border: 1px solid rgba(212, 175, 90, .14)') &&
  hasSel(RULES, '.p-card:hover', 'border-color: rgba(212, 175, 90, .42)'));
T('depth: the grey tap flash is suppressed only where a press state exists',
  /@media \(hover: none\)/.test(LAYER) &&
  hasSel(RULES, '.gal-slide', '-webkit-tap-highlight-color: transparent') &&
  hasSel(RULES, '.p-card, .cat-pill, .cat-mini-card, .acct-tile, .chip, .tv-card', '-webkit-tap-highlight-color: transparent'));
T('a11y: this layer adds no touch-action and no `manipulation`',
  !/touch-action/.test(stripCss(LAYER)) && !/manipulation/.test(stripCss(LAYER)));
T('motion: the two new sweeps are named in the reduced-motion block',
  (() => {
    const i = LAYER.indexOf('@media (prefers-reduced-motion: reduce)');
    const block = i < 0 ? '' : LAYER.slice(i, i + 520);
    return /\.skeleton::after/.test(block) && /scrollProg::after/.test(block);
  })());

/* ═══ 6 · the bundle ships all of it ════════════════════════════════════ */
T('bundle: v225.css sits where this release put it, under the newest layer',
  ORDER[ORDER.length - 2] === 'v226.css' && ORDER[ORDER.length - 1] === 'v227.css' &&
  BUNDLE.lastIndexOf('/* v225.css */') > BUNDLE.lastIndexOf('/* v224.css */') &&
  BUNDLE.lastIndexOf('/* v227.css */') > BUNDLE.lastIndexOf('/* v226.css */'));
{
  const i = BUNDLE.lastIndexOf('/* v225.css */');
  T('bundle: the shipped stylesheet carries the v225 rules',
    hasSel(BUNDLE_RULES, 'html.au-touch .p-card', 'will-change: auto') &&
    hasSel(BUNDLE_RULES, '.p-card', 'border: 1px solid rgba(212, 175, 90, .14)') &&
    hasSel(BUNDLE_RULES, '.cat-chips, .adr-sw', 'scroll-snap-type: x proximity') &&
    /@keyframes v225Sweep/.test(BUNDLE.slice(i)) && /@keyframes v225BarSweep/.test(BUNDLE.slice(i)));
  T('bundle: the retired shimmer rule sits before the v225 block, so v225 wins',
    BUNDLE.lastIndexOf('animation:mSkeleton') < i && BUNDLE.lastIndexOf('animation:auProg') < i);
  T('bundle: the card hairline is the last word on the card border',
    BUNDLE.lastIndexOf('border: 1px solid rgba(212, 175, 90, .14)') > BUNDLE.lastIndexOf('border:1px solid transparent'));
}
{
  const DEAD = ['bot.css', 'v108.css'];
  const layers = fs.readdirSync('cms/css').filter(f => f.endsWith('.css') && f !== 'shivaa.css');
  const orphans = layers.filter(f => !ORDER.includes(f) && !DEAD.includes(f));
  T('bundle: every layer on disk is in the cascade or on the documented dead list',
    orphans.length === 0, orphans.join(', '));
  T('bundle: nothing the site used to link was lost', DEAD.every(f => fs.existsSync('cms/css/' + f)));
  T('bundle: the inventory grew by exactly one layer, as this release did',
    ORDER.length === 62 && layers.length === 63, ORDER.length + '/' + layers.length);
}
{
  let checked = 0, broken = [];
  for (const f of ['cms/js/v225.js', 'cms/js/app.js', 'cms/js/aurum.js', 'cms/sw.js']) {
    try { execFileSync('node', ['--check', f], { stdio: 'pipe' }); checked++; }
    catch (e) { broken.push(f); }
  }
  T('syntax: every javascript file this release touched parses', broken.length === 0 && checked === 4, broken.join(', '));
}

/* ═══ 7 · live: one frame per scroll, and it reads nothing ══════════════ */
{
  const { window, doc, errors } = await boot('#/scheme');
  /* the hub is allowed three late passes (900ms / 2600ms / 6000ms) for fonts
     and first images; the burst is timed after the first two so a timer can
     never be mistaken for a frame that measured */
  await wait(4300);
  const H = window.__shvHub;
  T('live: the hub is installed and has measured the document', !!H && H.max > 0, H ? 'max ' + H.max : 'missing');
  T('live: it declares a release and a reduced-motion state', !!H && typeof H.reduced === 'boolean');
  T('live: the chrome it owns is on the page',
    !!doc.getElementById('scrollProg') && !!doc.getElementById('backTop'));
  T('live: only one stylesheet is requested', doc.querySelectorAll('link[rel=stylesheet]').length === 1);
  T('live: the page runs on the stamped release', window.__SHIVAA_REL === 227, String(window.__SHIVAA_REL));

  /* the scroller's own metrics must not be asked for while a thumb moves */
  let reads = 0;
  Object.defineProperty(doc.documentElement, 'scrollHeight', { configurable: true, get() { reads++; return 5200; } });
  Object.defineProperty(doc.documentElement, 'clientHeight', { configurable: true, get() { reads++; return 780; } });
  let y = 0;
  Object.defineProperty(window, 'scrollY', { configurable: true, get() { return y; } });

  const f0 = H.frames, m0 = H.measures;
  for (let i = 1; i <= 6; i++) { y = i * 640; window.dispatchEvent(new window.Event('scroll')); await wait(24); }
  await wait(140);
  T('live: a six-event scroll burst reads the document zero times', reads === 0, reads + ' reads');
  T('live: it does not re-measure mid-scroll either', H.measures - m0 === 0, (H.measures - m0) + ' measures');
  T('live: one frame per burst, not one per listener',
    H.frames - f0 >= 1 && H.frames - f0 <= 7, (H.frames - f0) + ' frames for 6 events');

  const bar = doc.getElementById('scrollProg');
  const top = doc.getElementById('backTop');
  const written = /^scaleX\(([\d.]+)\)$/.exec(bar.style.transform || '');
  T('live: the progress bar is written from that frame', !!written, bar.style.transform);
  const expectP = Math.min(1, Math.max(0, y / H.max));
  T('live: the bar shows the true scroll fraction',
    !!written && Math.abs(parseFloat(written[1]) - expectP) < 0.02,
    written ? written[1] + ' vs ' + expectP.toFixed(3) : '');
  const ring = parseFloat(top.style.getPropertyValue('--au-p'));
  T('live: the ring is quantised to 1/120 of a turn',
    Number.isFinite(ring) && Math.abs(ring - Math.round(ring * 120) / 120) <= 0.0006, String(ring));
  T('live: the back-to-top button is shown once past the band', top.classList.contains('show'));
  y = 120; window.dispatchEvent(new window.Event('scroll')); await wait(60);
  T('live: and hidden again at the top', !top.classList.contains('show'));

  /* a resize is one of the few moments the geometry may be re-taken */
  const m1 = H.measures;
  window.dispatchEvent(new window.Event('resize'));
  await wait(90);
  T('live: a resize re-measures instead of letting the cache go stale', H.measures - m1 >= 1,
    (H.measures - m1) + ' measures');

  /* the shipped cascade, checked on real elements */
  const sk = doc.createElement('div');
  sk.className = 'skeleton';
  doc.body.appendChild(sk);
  const skCs = window.getComputedStyle(sk);
  T('live: a .skeleton no longer paints its shimmer as a background',
    skCs.backgroundImage === 'none', skCs.backgroundImage);
  T('live: it keeps the cream it always had', /#efe6d4|rgb\(239, 230, 212\)/.test(skCs.backgroundColor + skCs.background), skCs.backgroundColor);
  const card = doc.createElement('article');
  card.className = 'p-card';
  doc.body.appendChild(card);
  const cCs = window.getComputedStyle(card);
  T('live: a .p-card carries the 1px gold hairline',
    cCs.borderTopWidth === '1px' && /212, 175, 90/.test(cCard(cCs)), cCs.borderTopWidth + ' ' + cCard(cCs));
  function cCard(cs) {
    return [cs.borderTopColor, cs.borderLeftColor, cs.borderRightColor, cs.borderBottomColor].join(' ');
  }

  const realErrs = errors.filter(e => !NOISE.test(e));
  T('live: no real console error on the page', realErrs.length === 0, String(realErrs[0] || '').slice(0, 110));

  /* idle: nothing may keep writing once the page sits still */
  await wait(2400);
  const n1 = doc.getElementsByTagName('*').length;
  const f1 = H.frames;
  await wait(3000);
  const n2 = doc.getElementsByTagName('*').length;
  T('idle: the DOM does not grow while the page sits still', Math.abs(n2 - n1) <= 8, n1 + ' → ' + n2);
  T('idle: no scroll frame runs when nobody is scrolling', H.frames - f1 === 0, (H.frames - f1) + ' frames');
  window.close();
}

console.log('\nPASS ' + ok.length + ' / FAIL ' + bad.length);
for (const b of bad) console.log('  ✗ ' + b);
if (process.argv.includes('-v')) for (const o of ok) console.log('  ✓ ' + o);
process.exit(bad.length ? 1 : 0);
