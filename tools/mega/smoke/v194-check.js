/* v194 — static checks: full-app mobile fit (no side-slide, no red edge),
   fluid controls, the side-slide guard script, every onclick handler resolves,
   every shipped JS file parses, and the release stamps are 194 in lockstep.
   Reads the cms/ tree directly; no browser or PHP runtime needed. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const CMS = path.join(__dirname, '..', '..', '..', 'cms');
const rd = (p) => fs.readFileSync(path.join(CMS, p), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), api = rd('api.php'), app = rd('js/app.js');
const css194 = rd('css/v194.css'), guard = rd('js/v194.js');
let pass = 0, fail = 0;
function test(id, name, fn) {
  try { fn(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}

test('A01', 'release 194 in lockstep across the stamp sites', () => {
  assert.ok(index.includes('__SHIVAA_REL=194'), 'index stamp');
  assert.ok(app.includes('const APP_REL = 194;'), 'app.js stamp');
  assert.ok(api.includes("'rel'   => 194,"), 'api.php stamp');
  assert.ok(sw.includes('const REL = 194;') && sw.includes('shivaa-shell-v194'), 'sw stamp');
});

test('A02', 'v194 stylesheet is linked last and precached; v194 guard script loads and is precached', () => {
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.equal(links[links.length - 1], 'v194.css?v=194', 'v194.css must load last');
  assert.ok(sw.includes("'/css/v194.css?v=194'"), 'css precached');
  assert.ok(index.includes('<script src="/js/v194.js?v=194" defer></script>'), 'guard script linked');
  assert.ok(sw.includes("'/js/v194.js?v=194'"), 'guard precached');
});

test('B01', 'the page cannot slide sideways: html and body clip horizontal overflow', () => {
  assert.ok(/html, body \{[^}]*overflow-x: clip/.test(css194), 'overflow-x clip on html and body');
  assert.ok(/overscroll-behavior-x: none/.test(css194), 'no sideways bounce');
});

test('B02', 'no red edge: the root background is cream in v194, and it overrides the maroon phone rule', () => {
  assert.ok(/--v194-bg: #fdf8ef/.test(css194), 'cream token');
  assert.ok(/html \{\s*background: var\(--v194-bg\)/.test(css194), 'html background is cream');
  const mobile = rd('css/mobile.css');
  assert.ok(mobile.includes('html { background: #1d0509;'), 'the old maroon rule still exists (we override it)');
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.ok(links.indexOf('v194.css?v=194') > links.indexOf('mobile.css?v=194'), 'v194 loads after mobile.css');
});

test('B03', 'media and wide blocks are capped to the screen width', () => {
  assert.ok(/img, video, iframe, svg, canvas, embed, object \{\s*max-width: 100%/.test(css194), 'media capped');
  assert.ok(/table \{ max-width: 100%/.test(css194), 'tables capped');
  assert.ok(/@media \(max-width: 767px\)/.test(css194), 'phone block present');
});

test('C01', 'side-slide guard: passive listeners, skips fixed/sticky bars, runs once', () => {
  assert.ok(guard.includes('window.__v194'), 'runs once');
  assert.ok(guard.includes("passive: true"), 'passive scroll listener');
  assert.ok(guard.includes("'fixed'") && guard.includes("'sticky'"), 'skips fixed and sticky');
  assert.ok(guard.includes("'clip'"), 'clips wide blocks');
});

test('C02', 'buttons: press feedback only on touch, reduced motion switches it off', () => {
  assert.ok(/@media \(hover: none\) and \(pointer: coarse\)/.test(css194), 'touch press');
  assert.ok(/prefers-reduced-motion: reduce/.test(css194), 'reduced motion block');
  assert.ok(/touch-action: manipulation/.test(css194), 'no tap delay');
});

test('D01', 'every shipped JS file parses', () => {
  const files = ['js/app.js', 'js/admin.js', 'js/v194.js', 'js/v193.js', 'js/v192.js', 'js/v122.js'];
  for (const f of files) {
    if (!fs.existsSync(path.join(CMS, f))) continue;
    new vm.Script(rd(f), { filename: f });
  }
});

test('E01', 'every inline onclick / onsubmit / onchange handler points at a defined function', () => {
  const sources = [index, app, rd('js/admin.js'), ...fs.readdirSync(path.join(CMS, 'js'))
    .filter(f => f.endsWith('.js') && f !== 'app.js' && f !== 'admin.js').map(f => rd('js/' + f))].join('\n');
  const calls = new Set();
  for (const m of sources.matchAll(/on(?:click|submit|change|input)="([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\(/g)) calls.add(m[1]);
  const missing = [];
  const BUILTIN = /^(event|window|location|document|console|history|navigator|this)\./;
  for (const c of calls) {
    if (BUILTIN.test(c + '.')) continue;
    const name = c.split('.').pop();
    const def = new RegExp(`(function\\s+${name}\\b|\\b${name}\\s*[:=]\\s*(async\\s*)?(function|\\(|[A-Za-z_$]+\\s*=>)|\\b${name}\\s*\\([^)]*\\)\\s*\\{|window\\.${name}\\s*=)`);
    if (!def.test(sources)) missing.push(c);
  }
  assert.equal(missing.length, 0, 'undefined: ' + missing.join(', '));
});

console.log(`v194-check: ${pass} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
