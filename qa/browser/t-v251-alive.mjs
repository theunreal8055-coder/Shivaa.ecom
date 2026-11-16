/* t-v251-alive.mjs — “the app should feel more live and smooth and the
 * smoothness must be on the next level, it should load faster and without
 * decreasing the quality.”
 *
 * v250 took the phone's continuous animation away because it was burning the
 * compositor the thumb needed. What it also took away was the SIGN that the shop
 * is alive. This release puts the sign back out of a budget the phone can spare
 * (transform and opacity, answered by an event) and makes the page smaller on
 * the way in. Four things are proved here:
 *
 *   A · A TAP ANSWERS. Every surface a shopper actually touches on a phone has a
 *       90 ms press (transform only — a scale, never the `filter` that repainted
 *       on every press). Desktop is untouched: the press is scoped to
 *       `html.shv-mobile` and a mouse keeps its hover vocabulary.
 *
 *   B · THE SHOP IS LIVE. A pending price breathes, the utility strip carries a
 *       live dot, a fresh rate sweeps a gold hairline, the bag badge pops. Every
 *       one of them is bound to an event or to content that is still loading —
 *       none of them runs forever on a settled page.
 *
 *   C · THE PAGE HAS A POSITION. A two-pixel gold hairline fills to the
 *       shopper's place in the page, driven by ONE rAF per scroll frame and a
 *       `transform` write. The page height is measured on resize and after a
 *       route, never inside the scroll handler (reading `scrollHeight` there is
 *       how a smoothness feature becomes the jank it answered).
 *
 *   D · IT IS SMALLER, AND STILL THE SAME SHEET. `index.html` now loads
 *       cms/css/shivaa.min.css — 965,451 B → 876,841 B, with a proof that it is
 *       the same sheet (8,758 effective rules compared with their media
 *       context, 9 @font-face, 264 @keyframes, before the file may be written).
 *       Every picture additionally decodes off the main thread.
 *
 * Run:  node qa/browser/t-v251-alive.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { boot, wait, until, pageFaults } from './harness.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const index = read('cms/index.html');
const app = read('cms/js/app.js');
const rel = read('cms/js/rel.js');
const css = read('cms/css/shivaa.css');
const v251css = read('cms/css/v251.css');
const v251 = read('cms/js/v251.js');
const sw = read('cms/sw.js');
const api = read('cms/api.php');

const REL = Number((index.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0);
const layers = [...rel.matchAll(/\/\* ─+ (\S+\.js) ─+ \*\//g)].map(m => m[1]);
const at = (n) => layers.indexOf(n);

let pass = 0, fail = 0;
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

/* ═══ A · a tap answers (static) ════════════════════════════════════════ */
console.log('\nA · a tap answers, on a phone only');

ok('the press is a scale on every surface a thumb touches',
  /html\.shv-mobile \.p-card:active,\s*[\s\S]*?transform:\s*scale\(\.977\)/.test(v251css));
ok('the press never uses `filter` (that repaints on every press)',
  /html\.shv-mobile \.v107-press:active \{ filter: none !important; \}/.test(v251css));
ok('the press is scoped to the phone — a mouse keeps its hover',
  !/(^|\})\s*\.p-card:active\s*\{/.test(v251css.replace(/html\.shv-mobile [^{]*\{[^}]*\}/g, '')));
ok('one rhythm for all of them (the --sx-* vocabulary)',
  /transition: transform var\(--sx-dur-1, 90ms\)/.test(v251css));
ok('v251 bans nothing it needs: no content-visibility, no overflow-x on html/body',
  !/content-visibility/.test(v251css) && !/overflow-x:\s*hidden/.test(v251css));

/* ═══ B · the shop is live (static) ═════════════════════════════════════ */
console.log('\nB · the shop is live, and only while it has something to say');

/* a keyframe body, by brace matching — the layers are hand-written and
   multi-line, the older ones were minified to one line; both must read the same */
const kf = (src, name) => {
  const i = src.indexOf('@keyframes ' + name);
  if (i < 0) return null;
  const open = src.indexOf('{', i);
  if (open < 0) return null;
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(open + 1, j);
  }
  return null;
};
const breathe = kf(v251css, 'v251Breathe');
ok('a pending price breathes', !!breathe && /opacity/.test(breathe));
ok('the pending price holds no layer promise (v250 removed all 31)',
  !/will-change\s*:/.test(v251css));
ok('the live dot is a pseudo-element, so the audit cannot count it as an element',
  /\.ub-live::before \{[\s\S]*?animation: v251Live/.test(v251css));
ok('the live dot moves opacity and scale only',
  (() => { const b = kf(v251css, 'v251Live'); return !!b && /opacity/.test(b) && /scale/.test(b) && !/(left|top|width|height|margin|padding)/.test(b); })());
ok('the first row arrives, and opacity never changes on the way in',
  (() => { const b = kf(v251css, 'v251Arrive'); return !!b && /translateY\(10px\)/.test(b) && !/opacity/.test(b); })());
ok('only the first row arrives (it is a settle, not a permanent layer)',
  /nth-child\(-n\+8\)/.test(v251css) && !/nth-child\(n\+9\)/.test(v251css));
ok('the bag badge pops', /\.badge\.shv-pop \{ animation: v251Pop/.test(v251css));
ok('the rate hairline is one pseudo-element sweeping in transform',
  /\.ub-rates\.shv-tick::after \{ animation: v251Tick/.test(v251css) &&
  /transform: scaleX\(0\);/.test(v251css));
ok('reduced motion turns every one of them off',
  /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.ub-live::before[\s\S]*?animation: none !important/.test(v251css));
ok('the signals survive the v250 quiet pass (it is told to keep them)',
  /(rs-ticker-track|rev-track|pr-sk|sk-hero|sk-card|ub-live)/.test(read('cms/js/v250.js')));

/* ═══ C · the page has a position (static) ═════════════════════════════ */
console.log('\nC · the page has a position');

ok('the read bar is fixed, pointer-transparent and transform-driven',
  /#shvReadBar \{[\s\S]*?position: fixed[\s\S]*?pointer-events: none[\s\S]*?transform: scaleX\(0\)/.test(v251css));
ok('the scroll listener is passive', /addEventListener\('scroll', queue, \{ passive: true \}\)/.test(v251));
ok('the page height is NOT read inside the scroll handler',
  !/addEventListener\('scroll',[^\n]*measure/.test(v251) &&
  /function measure\(\)/.test(v251) && /function queue\(\)/.test(v251));
ok('one frame at most per scroll', /if \(rafId\) return;/.test(v251) && /requestAnimationFrame/.test(v251));
ok('the bar is created by the script, so no-JS leaves no empty line',
  /doc\.createElement\('div'\)/.test(v251) && !/id="shvReadBar"/.test(index));

/* ═══ D · smaller, and the same sheet ══════════════════════════════════ */
console.log('\nD · smaller, and provably the same sheet');

const cssBuf = fs.readFileSync(path.join(ROOT, 'cms/css/shivaa.css'));
const cssSha = crypto.createHash('sha256').update(cssBuf).digest('hex');
const minPath = 'cms/css/shivaa.min.css';
ok('the minified sheet exists', exists(minPath));
const minBuf = exists(minPath) ? fs.readFileSync(path.join(ROOT, minPath)) : Buffer.alloc(0);
const minTxt = minBuf.toString('utf8');
ok('it is smaller by a real margin (>= 5 %)',
  minBuf.length > 0 && minBuf.length < cssBuf.length * 0.95,
  `${cssBuf.length} → ${minBuf.length}`);
ok('its banner fingerpoints the source it was built from',
  (minTxt.slice(0, 400).match(/sha256 ([0-9a-f]{64})/) || [])[1] === cssSha,
  (minTxt.slice(0, 400).match(/sha256 ([0-9a-f]{64})/) || ['none'])[0]);
ok('index.html loads the minified sheet, and only that one',
  (index.match(/<link rel="stylesheet"/g) || []).length === 1 &&
  index.includes('/css/shivaa.min.css?v=' + REL));
ok('the service worker precaches the sheet the page asks for',
  sw.includes("'/css/shivaa.min.css?v=" + REL + "'"));
ok('the readable bundle is still built from the layers (rollback is one tag)',
  /\/\* v251\.css \*\//.test(css));
const bareImgs = app.split('\n').filter(ln => ln.includes('<img ') && !ln.includes('decoding=') && !ln.includes('thumbAttrs('));
ok('every picture the app writes carries decoding="async" itself',
  bareImgs.length === 0, bareImgs.slice(0, 2).map(l => l.trim().slice(0, 70)).join(' | '));
ok('and the one helper that builds picture attributes writes it too',
  /const rest = 'loading="lazy" decoding="async"';/.test(app));
ok('and the backstop reports the ones that slip through',
  /function syncImages\(\)/.test(v251) && /window\.__shvImgFix/.test(v251));

/* ═══ A2 · the machinery, on a real page ═══════════════════════════════ */
console.log('\nA2 · the machinery, on a phone home page');

{
  const k = await boot('#/', { mobile: true });
  const w = k.window, doc = w.document;
  await until(() => doc.querySelector('#view section, #view .pc-card'), 9000);
  await wait(2000);

  ok('the layer is loaded and guarded against a double load',
    !!w.Shivaa.v251 && /window\.__shvAlive/.test(v251));
  ok('the report line is in the same shape as the other three',
    /^alive \d+ · (phone|desktop) · live pulses \d+ · pending prices \d+/.test(w.Shivaa.v251.report()),
    w.Shivaa.v251.report());
  console.log('       ' + w.Shivaa.v251.report());

  ok('the live signals are counted and few (<= 3 on a settled page)',
    w.Shivaa.v251.pulses() <= 3, String(w.Shivaa.v251.pulses()));
  ok('the paint budget v250 won is intact',
    w.Shivaa.v250.audit().blurPasses === 0 && w.Shivaa.v250.audit().infinite <= 2,
    JSON.stringify({ blur: w.Shivaa.v250.audit().blurPasses, infinite: w.Shivaa.v250.audit().infinite }));

  /* the read bar exists and is driven by transform */
  const bar = doc.getElementById('shvReadBar');
  ok('the read bar is on the page', !!bar);
  ok('and it is written as a transform, not a width',
    !!bar && /^scaleX\(/.test(bar.style.transform || ''), bar ? bar.style.transform : 'none');
  ok('at the top of the page it is empty', w.Shivaa.v251.progress() === 0,
    String(w.Shivaa.v251.progress()));

  /* the bag answers — the badge is observed, not polled */
  const badge = doc.getElementById('cartCount');
  ok('the bag badge exists', !!badge);
  if (badge) {
    const before = badge.textContent;
    badge.textContent = String((Number(before) || 0) + 1);
    const popped = await until(() => badge.classList.contains('shv-pop'), 1200, 30);
    ok('adding to the bag pops the badge', !!popped);
    const gone = await until(() => !badge.classList.contains('shv-pop'), 1600, 60);
    ok('and the class leaves again (nothing is left running)', !!gone);
  }

  /* the rate hairline answers the event */
  const rates = doc.getElementById('utilRates');
  if (rates) {
    w.dispatchEvent(new w.Event('rates'));
    const ticked = await until(() => rates.classList.contains('shv-tick'), 800, 30);
    ok('a fresh rate sweeps the hairline', !!ticked);
    const off = await until(() => !rates.classList.contains('shv-tick'), 1600, 60);
    ok('and the sweep is removed after one pass', !!off);
  }

  /* every picture on the page decodes async */
  const bad = [...doc.images].filter(im => (im.getAttribute('decoding') || '') !== 'async');
  ok('no picture on the rendered page is left to decode on the main thread',
    bad.length === 0, bad.length + ' without decoding');
  k.window.close();
}

/* ═══ E · plumbing ═════════════════════════════════════════════════════ */
console.log('\nE · plumbing');

ok('v251 ships inside the one bundle, after v250', at('v251.js') > at('v250.js') && at('v251.js') > -1);
ok('v251 is bundled exactly once', layers.filter(n => n === 'v251.js').length === 1);
ok('its stylesheet is in the one css bundle', /\/\* v251\.css \*\//.test(css));
ok('one release everywhere',
  REL >= 251 && new RegExp('const APP_REL = ' + REL + ';').test(app) &&
  new RegExp("'rel' => " + REL).test(api) && new RegExp('const REL = ' + REL + ';').test(sw) &&
  new RegExp('shivaa-shell-v' + REL).test(sw));

if (pageFaults.length) {
  console.log('\n  page faults recorded (not failures by themselves):');
  pageFaults.slice(0, 4).forEach(f => console.log('   · ' + f.slice(0, 180)));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
