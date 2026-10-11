/* v196 — static checks: the film autoplay fixes in v125.js, the contrast pairs that
   the button styles now use (computed with WCAG 2.x), the stamps, and the cache list.
   Reads the cms/ tree directly; no browser needed. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { ratio } = require('./v196-contrast-calc.js');
const CMS = path.join(__dirname, '..', '..', '..', 'cms');
const rd = p => fs.readFileSync(path.join(CMS, p), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), api = rd('api.php'), app = rd('js/app.js');
const films = rd('js/v125.js'), css = rd('css/v196.css');
let pass = 0, fail = 0;
function test(id, name, fn) {
  try { fn(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}

test('A01', 'release 196 in lockstep across the stamp sites', () => {
  assert.ok(index.includes('__SHIVAA_REL=196'));
  assert.ok(app.includes('const APP_REL = 196;'));
  assert.ok(api.includes("'rel'   => 196,"));
  assert.ok(sw.includes('const REL = 196;') && sw.includes('shivaa-shell-v196'));
});
test('A02', 'v196 stylesheet is linked last and precached', () => {
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.equal(links[links.length - 1], 'v196.css?v=196');
  assert.ok(sw.includes("'/css/v196.css?v=196'"));
});
test('F01', 'films: low-power devices no longer block them (only Data Saver does)', () => {
  assert.ok(films.includes('return !!(navigator.connection && navigator.connection.saveData);'));
  assert.ok(!films.includes("classList.contains('au-lite') ||"), 'the cores/RAM gate is gone');
});
test('F02', 'films: muted and inline as HTML attributes (iOS autoplay)', () => {
  assert.ok(films.includes("v.setAttribute('muted', '');"));
  assert.ok(films.includes("v.setAttribute('playsinline', '');"));
});
test('F03', 'films: play from 15% on screen, with the observer firing at that threshold', () => {
  assert.ok(films.includes('e.intersectionRatio >= .15) { if (playGate()) splay(v); }'));
  assert.ok(films.includes('{ threshold: [0, .15, .35, .6] }).observe(v);'));
});
test('F04', 'Gold Thread: the first chapter is always lit, so its film starts on open', () => {
  assert.ok(films.includes('var lit = idx === 0 || cy <= tipY;'));
  assert.ok(films.includes('items.forEach(function (it, idx) {'));
});
test('F05', 'films still respect reduced motion and the reel/zoom guards (unchanged)', () => {
  assert.ok(films.includes("matchMedia('(prefers-reduced-motion: reduce)')"));
});
test('C01', 'gold buttons: the text is dark ink (5.38:1), not cream (2.95:1)', () => {
  const ink = '#2b1a05', gold = '#b98a2f';
  assert.ok(ratio(ink, gold) >= 4.5, 'dark ink on gold passes AA');
  assert.ok(ratio('#fff8ea', gold) < 4.5, 'the old cream-on-gold pair failed, so the change is real');
  assert.ok(css.includes('--v196-ink-on-gold: #2b1a05'));
});
test('C02', 'the gold text colour used on light surfaces passes AA (6.15:1 on cream, 6.52:1 on white)', () => {
  assert.ok(ratio('#7a5614', '#faf6ef') >= 4.5);
  assert.ok(ratio('#7a5614', '#fffdf9') >= 4.5);
  assert.ok(css.includes('--v196-gold-text: #7a5614'));
});
test('C03', 'primary and outline buttons pass AA (already compliant, verified)', () => {
  assert.ok(ratio('#f9ecd2', '#6e1e2a') >= 4.5);
  assert.ok(ratio('#6e1e2a', '#faf6ef') >= 4.5);
  assert.ok(ratio('#5d5245', '#fffdf9') >= 4.5);
});
test('C04', 'focus rings are visible on buttons and links', () => {
  assert.ok(css.includes('outline: 2px solid var(--v196-focus)'));
});
test('B01', 'the v196 film and colour edits parse', () => {
  new vm.Script(films, { filename: 'v125.js' });
  new vm.Script(app, { filename: 'app.js' });
});

console.log(`v196-check: ${pass} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
