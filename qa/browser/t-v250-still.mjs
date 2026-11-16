/* t-v250-still.mjs — “still legs and there are flickering issues and scrolling
 * also strucks and the page doesn't move anywhere sometimes.”
 *
 * Three separate faults, and this suite measures each one on the real files:
 *
 *   A · THE PAINT BUDGET. A phone was compositing, on the home screen alone:
 *       21 `backdrop-filter` passes, 6 blending groups, 4 full-surface blurs,
 *       31 layer promotions and 25 animations that NEVER STOP (14 spinning QR
 *       badges, 4 floating blurs, orbiting beams, a breathing glow, 70 star pops
 *       inside a marquee). Measured before → after in this release:
 *         animated 141 → 15 · infinite 25 → 2 · blur 21 → 0 · blend 6 → 0
 *         filter-blur 4 → 0 · promoted 31 → 0
 *       A desktop keeps every one of them; the budget is scoped to the device.
 *
 *   B · NOTHING ANIMATES FROM INVISIBLE. `#view > *` faded in from
 *       `opacity: 0` with a `both` fill on every navigation — the blink. The
 *       keyframes are fixed at the source and a `#view,#view > *` guarantee sits
 *       on top of them.
 *
 *   C · THE THUMB OWNS THE SCROLL. The shop page held a NON-PASSIVE `touchmove`
 *       listener on `#view` for its whole life (pull-to-refresh), which makes the
 *       browser wait for JavaScript before every frame of every gesture. It is
 *       armed only while a pull is in progress now.
 *
 *   D · A FROZEN PAGE IS GIVEN BACK. `html.no-scroll` with nothing open made the
 *       shop unscrollable and every tap look dead. A watchdog notices and
 *       unlocks — but only when no overlay could own the lock.
 *
 * Run:  node qa/browser/t-v250-still.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { boot, wait, until, pageFaults } from './harness.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');

const index = read('cms/index.html');
const app = read('cms/js/app.js');
const rel = read('cms/js/rel.js');
const css = read('cms/css/shivaa.css');
const v250 = read('cms/js/v250.js');
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

/* ═══ B · nothing animates from invisible (static) ══════════════════════ */
console.log('\nB · no content animates from invisible');

ok('the view and its children are guaranteed visible',
  /#view,\s*#view > \*\s*\{[^}]*animation:\s*none !important[^}]*opacity:\s*1 !important/.test(css));

const kf = (name) => {
  const m = css.match(new RegExp('@keyframes\\s+' + name + '\\s*\\{([\\s\\S]{0,240}?)\\}', 'm'));
  return m ? m[1] : null;
};
for (const name of ['viewIn', 'rvIn', 'v210Rise', 'v211Rise']) {
  const body = kf(name);
  ok(`@keyframes ${name} no longer starts at opacity 0`, !!body && !/opacity\s*:\s*0/.test(body),
    body ? body.replace(/\s+/g, ' ').slice(0, 80) : 'keyframe not found');
}
ok('the star pop has no transparency in it either',
  (() => { const b = kf('starPop'); return !!b && !/opacity/.test(b); })());
ok('v248\'s "cut every animation while scrolling" rule is gone (it was the flicker)',
  !/html\.shv-scrolling[\s\S]{0,400}animation:\s*none\s*!important/.test(css));

/* ═══ C · the thumb owns the scroll (static) ═══════════════════════════ */
console.log('\nC · the thumb owns the scroll');

const pull = app.slice(app.indexOf('function wireShopPullToRefresh'), app.indexOf('/* ─────────── SHOP ─────────── */'));
ok('the only touchmove listener is the one armed by a pull',
  (pull.match(/addEventListener\('touchmove'/g) || []).length === 1 &&
  /if \(on\) view\.addEventListener\('touchmove', onMove, \{ passive: false \}\);/.test(pull));
ok('it is armed from the start edge and released at the end',
  /let moveOn = false;/.test(pull) && /armMove\(true\)/.test(pull) && /armMove\(false\)/.test(pull));
ok('and it is still non-passive WHILE a pull is in progress (so the pull can be drawn)',
  /view\.addEventListener\('touchmove', onMove, \{ passive: false \}\)/.test(pull));
ok('the browser\'s own pull-to-refresh no longer fights it',
  /html\.shv-mobile,\s*html\.shv-mobile body\s*\{\s*overscroll-behavior-y:\s*contain/.test(css));

/* ═══ A · the paint budget, measured ═══════════════════════════════════ */
console.log('\nA · the paint budget on a phone');

{
  const k = await boot('#/', { mobile: true });
  const w = k.window, doc = w.document;
  await until(() => doc.querySelector('#view section, #view .pc-card'), 9000);
  await wait(2600);                        /* past the entrance + the quiet pass */

  ok('the page knows it is a phone', doc.documentElement.classList.contains('shv-mobile'));
  const a = w.Shivaa.v250.audit();
  console.log('       home: ' + JSON.stringify({ els: a.elements, animating: a.running, infinite: a.infinite,
    blur: a.blurPasses, blend: a.blends, filterBlur: a.filterBlur, promoted: a.promoted }));
  ok('no backdrop-filter passes on a phone', a.blurPasses === 0, String(a.blurPasses));
  ok('no blending groups on a phone', a.blends === 0, String(a.blends));
  ok('no full-surface blur filters on a phone', a.filterBlur === 0, String(a.filterBlur));
  ok('no layer promotions held for nothing', a.promoted === 0, String(a.promoted));
  ok('at most the two marquees still animate forever', a.infinite <= 2, String(a.infinite));
  ok('the page is otherwise still (<= 25 animated elements)', a.running <= 25, String(a.running));
  ok('the report line exists', /still \d+ · (phone|desktop)/.test(w.Shivaa.v250.report()), w.Shivaa.v250.report());

  /* B (live) · a route change paints visible content */
  w.location.hash = '#/shop?category=rings';
  await until(() => w.location.hash === '#/shop?category=rings', 1500, 20);
  await wait(300);
  const kids = [...doc.querySelectorAll('#view > *')].filter(el => !el.classList.contains('sr-only'));
  const hidden = kids.filter(el => w.getComputedStyle(el).opacity === '0');
  ok('after a route change no block in the view is invisible',
    kids.length > 0 && hidden.length === 0, hidden.length + '/' + kids.length + ' hidden');
  await wait(1100);                      /* the quiet pass runs 800 ms after a route */
  const a2 = w.Shivaa.v250.audit();
  ok('the shop page is still too', a2.infinite <= 2 && a2.blurPasses === 0,
    JSON.stringify({ infinite: a2.infinite, blur: a2.blurPasses }));
  k.window.close();
}

/* D · a frozen page is given back ══════════════════════════════════════ */
console.log('\nD · a frozen page is given back');

{
  const k = await boot('#/');            /* desktop boot: still has the same watchdog */
  const w = k.window, doc = w.document;
  await until(() => doc.querySelector('#view section, #view .pc-card'), 9000);

  /* nothing is open, the lock is on: the shop cannot be scrolled */
  doc.documentElement.classList.add('no-scroll');
  ok('the page starts locked with nothing open', doc.documentElement.classList.contains('no-scroll'));
  const before = w.Shivaa.v250.audit().frozen.length;
  doc.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true }));
  const freed = await until(() => !doc.documentElement.classList.contains('no-scroll'), 2000, 40);
  ok('a gesture that cannot scroll hands the page back', !!freed);
  ok('and the rescue is recorded', w.Shivaa.v250.audit().frozen.length > before);

  /* but a lock that a sheet owns must be left alone */
  const ov = doc.getElementById('modalOverlay');
  doc.documentElement.classList.add('no-scroll');
  if (ov) ov.classList.add('open');
  doc.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true }));
  await wait(1200);
  ok('a lock owned by an open sheet is never stolen',
    doc.documentElement.classList.contains('no-scroll'));
  if (ov) ov.classList.remove('open');
  k.window.close();
}

/* ═══ A2 · the desktop keeps its look ══════════════════════════════════ */
console.log('\nA2 · the desktop is untouched');
{
  const k = await boot('#/');
  const w = k.window, doc = w.document;
  await until(() => doc.querySelector('#view section, #view .pc-card'), 9000);
  await wait(1200);
  ok('a desktop is not marked as a phone', !doc.documentElement.classList.contains('shv-mobile'));
  const a = w.Shivaa.v250.audit();
  ok('the desktop keeps its blur and its motion',
    a.blurPasses > 0 || a.infinite > 2, JSON.stringify({ blur: a.blurPasses, infinite: a.infinite }));
  k.window.close();
}

/* ═══ E · plumbing ═════════════════════════════════════════════════════ */
console.log('\nE · plumbing');
ok('v250 ships inside the one bundle, after v249', at('v250.js') > at('v249.js') && at('v250.js') > -1);
ok('v250 is bundled exactly once', layers.filter(n => n === 'v250.js').length === 1);
ok('its stylesheet is in the one css bundle', /\/\* v250\.css \*\//.test(css));
ok('the device is named before the first paint, not after it',
  /shv-mobile/.test(index) && index.indexOf('shv-mobile') < index.indexOf('<link rel="stylesheet"'));
ok('the layer guards against a double load', /window\.__shvStill/.test(v250));
ok('the unlock is a real unlock, not just a class removal',
  /function forceUnlockScroll\(\)/.test(app) && /_scrollLock\.n = 0;/.test(app));
ok('one release everywhere',
  REL >= 250 && new RegExp('const APP_REL = ' + REL + ';').test(app) &&
  new RegExp("'rel' => " + REL).test(api) && new RegExp('const REL = ' + REL + ';').test(sw) &&
  new RegExp('shivaa-shell-v' + REL).test(sw));

if (pageFaults.length) {
  console.log('\n  page faults recorded (not failures by themselves):');
  pageFaults.slice(0, 4).forEach(f => console.log('   · ' + f.slice(0, 180)));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
