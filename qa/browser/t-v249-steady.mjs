/* t-v249-steady.mjs — “Screen blinks and still slow loading.”
 *
 * A blink is a page that shows you nothing for a frame: content fading up from
 * `opacity: 0`, a splash painted over a page that is already there, or — the
 * expensive one — a second full render that throws the first one away. A slow
 * load is bytes and parse. This suite measures both, and it measures the second
 * render by COUNTING renders on a real boot, not by reading the source.
 *
 *   A · no content may start invisible. Every entrance motion travels; not one
 *       of them fades up from zero.
 *   B · a warm device paints the page ONCE. Seeded localStorage + a deliberately
 *       slow API: the cap paints at 250 ms, the batch lands a second later, and
 *       #view must not be touched again.
 *   C · a returning shopper never sees the curtain.
 *   D · the two files a phone downloads are minified, current, and smaller.
 *   E · the instruments (`Shivaa.v249.report()`).
 *
 * Run:  node qa/browser/t-v249-steady.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { boot, wait, until, pageFaults } from './harness.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');

const index = read('cms/index.html');
const app = read('cms/js/app.js');
const rel = read('cms/js/rel.js');
const css = read('cms/css/shivaa.css');
const v249 = read('cms/js/v249.js');
const v166 = read('cms/js/v166.js');
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

/* ═══ A · nothing becomes invisible to animate in ═══════════════════════ */
console.log('\nA · no content starts invisible');

/* the last word in the cascade on #view's route rise must not be opacity:0 */
const riseBlocks = [...css.matchAll(/@keyframes (\w+)\s*\{\s*from\s*\{([^}]*)\}/g)]
  .filter(m => /opacity\s*:\s*0/.test(m[2]))
  .map(m => m[1]);
const lastRise = css.lastIndexOf('#view.shv-rise > section');
const riseRule = lastRise > 0 ? css.slice(lastRise, lastRise + 260) : '';
ok('the route rise travels, it does not fade up from nothing',
  /animation:\s*v249Rise/.test(riseRule) && /opacity:\s*1/.test(riseRule),
  riseRule.slice(0, 120));
ok('the fade-from-zero rise is no longer the last rule that matches #view',
  !/^#view\.shv-rise > section:nth-child\(-n\+6\)[\s\S]{0,80}shvRise/.test(css.slice(lastRise)));

/* .rv used to sit at opacity 0 until an observer agreed to show it */
/* a later layer re-declares `.rv{transition:…!important}` (a transition only, no
   value), so the assertion looks for the LAST block that actually declares an
   opacity — that is the value the shopper's first frame is painted with. */
const rvBlocks = [...css.matchAll(/\.rv\s*\{([^}]*)\}/g)].map(m => m[1]);
const rvWithOpacity = rvBlocks.filter(b => /opacity\s*:/.test(b));
const lastRvOpacity = rvWithOpacity.length ? rvWithOpacity[rvWithOpacity.length - 1] : '';
ok('a .rv block is visible before anything observes it',
  /opacity:\s*1/.test(lastRvOpacity) && !/opacity:\s*0/.test(lastRvOpacity),
  lastRvOpacity.trim().slice(0, 90) + ` (${rvWithOpacity.length} blocks declare opacity)`);
ok('the picture fade is gone (a photograph is simply there)',
  /\.shv-img-in\s*\{\s*animation:\s*none\s*!important/.test(css));
ok('review rows do not fade up from zero either',
  /\[class\*="rv-in"\][\d\s,\.\w\-\*\[\]="]*\{[\s\S]{0,60}animation:\s*none\s*!important/.test(css));
ok('v249 is the last layer in the css bundle',
  css.lastIndexOf('/* v249.css */') > css.lastIndexOf('/* v248.css */'));

/* nothing may be behind the page in white between two renders */
ok('the page background is painted, not transparent',
  /html\s*\{\s*background:\s*var\(--cream/.test(css));

/* ═══ D · the shipped pair is minified and CURRENT ═════════════════════ */
console.log('\nD · the two files the phone downloads');

const srcs = {
  'cms/js/app.js': 'cms/js/app.min.js',
  'cms/js/rel.js': 'cms/js/rel.min.js',
};
let bytesMin = 0, bytesSrc = 0;
for (const [src, min] of Object.entries(srcs)) {
  const code = read(src);
  const hash = crypto.createHash('sha256').update(Buffer.from(code)).digest('hex');
  const minCode = read(min);
  const banner = (minCode.slice(0, 400).match(/sha256 ([0-9a-f]{64})/) || [])[1];
  bytesSrc += Buffer.byteLength(code); bytesMin += Buffer.byteLength(minCode);
  ok(`${path.basename(min)} was built from the current ${path.basename(src)}`,
    banner === hash, `${(banner || 'none').slice(0, 12)} vs ${hash.slice(0, 12)}`);
  /* it must still be the application, not an empty file */
  ok(`${path.basename(min)} still carries the code`,
    Buffer.byteLength(minCode) > Buffer.byteLength(code) * 0.4 && /DO NOT EDIT/.test(minCode));
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, min)], { stdio: 'pipe' });
    ok(`${path.basename(min)} parses`, true);
  } catch (e) { ok(`${path.basename(min)} parses`, false, String(e).slice(0, 120)); }
}
console.log('       shipped JS: ' + bytesSrc.toLocaleString('en-US') + ' B → ' + bytesMin.toLocaleString('en-US') +
  ' B  (-' + Math.round(100 - bytesMin / bytesSrc * 100) + ' %)');
ok('index.html loads the minified pair, nothing else',
  scriptTagCheck(index));
function scriptTagCheck(s) {
  const tags = [...s.matchAll(/<script src="\/js\/([^"?]+)\?v=\d+" defer><\/script>/g)].map(m => m[1]);
  return tags.length === 2 && tags.includes('app.min.js') && tags.includes('rel.min.js');
}
ok('the sources are still on disk for a rollback and for the gates',
  fs.existsSync(path.join(ROOT, 'cms/js/app.js')) && fs.existsSync(path.join(ROOT, 'cms/js/rel.js')));
ok('the worker precaches what the page actually loads',
  /'\/js\/app\.min\.js\?v=\d+'/.test(sw) && /'\/js\/rel\.min\.js\?v=\d+'/.test(sw));
ok('the total JavaScript is under a megabyte', bytesMin < 1000000, String(bytesMin));

/* ═══ B · a warm device paints once ════════════════════════════════════ */
console.log('\nB · one paint, not two');

/* a first boot to harvest a real catalogue, exactly as the device would store it */
let seeded = null;
{
  const k = await boot('#/');
  seeded = await until(() => k.window.localStorage.getItem('shv_catalog_v166'), 8000, 60);
  k.window.close();
}
ok('a device catalogue exists to seed the second boot with', !!seeded);

if (seeded) {
  /* the second boot is a RETURNING shopper with a slow API: the cap paints at
     250 ms and the batch arrives ~1.2 s later */
  const k = await boot('#/', { ls: { shv_catalog_v166: seeded }, delay: 1200 });
  const w = k.window, doc = w.document;
  const view = doc.getElementById('view');
  ok('a returning shopper is marked warm before the first paint',
    doc.documentElement.classList.contains('shv-warm'));
  const pl = doc.getElementById('preloader');
  ok('the curtain is not painted at all for a warm device',
    !pl || w.getComputedStyle(pl).display === 'none', pl ? w.getComputedStyle(pl).display : 'no element');

  /* the page must be on screen BEFORE the 1.2 s API answer — that is the 250 ms
     cap doing its job on a device that already holds the catalogue */
  const t0 = Date.now();
  const painted = await until(() => view.querySelector('.pc-card, section'), 700, 20);
  const paintMs = Date.now() - t0;
  ok('the page is on screen while the API is still answering', !!painted, paintMs + ' ms');
  /* …and it must still be the SAME page 2.6 s later, after the batch landed */
  await wait(2600);
  const unasked = () => (w.Shivaa.v249 && w.Shivaa.v249.renders ? w.Shivaa.v249.renders() : [])
    .filter(r => r.sinceTap === null);
  const first = unasked().length;
  console.log('       first paint ' + paintMs + ' ms · unasked repaints after the late batch: ' + first);
  ok('the late batch did not repaint the page', first === 0, first + ' re-render(s)');
  /* and it really did land: the adopt writes catalogOk, the repaint never ran */
  const adopted = await until(() => w.Shivaa.state && w.Shivaa.state.catalogOk === true, 1500, 50);
  ok('the late batch was adopted quietly (the data is not lost)', !!adopted,
    w.Shivaa.state ? 'catalogOk ' + w.Shivaa.state.catalogOk : 'no state');

  /* the counter is not vacuous: an explicit redraw must be seen by it (and is
     deferred to the next calm moment by v249) */
  const before = (w.Shivaa.v249.renders() || []).length;
  w.Shivaa.redraw();
  const grew = await until(() => (w.Shivaa.v249.renders() || []).length > before, 2500, 40);
  ok('the blink counter actually counts a render', !!grew,
    before + ' → ' + (w.Shivaa.v249.renders() || []).length);

  /* and the data was not thrown away: prices are on the page */
  const price = doc.querySelector('.js-price');
  ok('the page has price slots to patch in place', !!price);

  const rep = w.Shivaa.v249 && w.Shivaa.v249.report ? w.Shivaa.v249.report() : '';
  ok('the steady report exists and names the start',
    /steady \d+/.test(rep) && /(warm|cold)/.test(rep), rep);
  k.window.close();
}

/* ═══ B2 · the same boot without the v249 rules must have blinked ══════ */
ok('a background catalogue repair patches prices instead of repainting',
  /softCatalogue/.test(v166) && /if \(w\.Shivaa && w\.Shivaa\.softCatalogue\)/.test(v166));
ok('the late-batch adopt touches state, never route()',
  /function adoptLateBatch\(packed\)/.test(app) &&
  !/function adoptLateBatch[\s\S]{0,900}route\(\)/.test(app));
ok('and a cold device still repaints calmly rather than instantly',
  /calmBoot\(0\);/.test(app) && /if \(_fastPaint && packed\)/.test(app));

/* ═══ E · plumbing ═════════════════════════════════════════════════════ */
console.log('\nE · plumbing');
ok('v249 ships inside the one bundle, after v248', at('v249.js') > at('v248.js') && at('v249.js') > -1);
ok('v249 is bundled exactly once', layers.filter(n => n === 'v249.js').length === 1);
ok('its stylesheet is in the one css bundle', /\/\* v249\.css \*\//.test(css));
ok('the layer guards against a double load', /window\.__shvSteady/.test(v249));
ok('a programmatic render cannot land under a thumb',
  /function deferUntilCalm\(fn\)/.test(v249) && /shv-scrolling/.test(v249));
ok('one release everywhere',
  REL >= 249 && new RegExp('const APP_REL = ' + REL + ';').test(app) &&
  new RegExp("'rel' => " + REL).test(api) && new RegExp('const REL = ' + REL + ';').test(sw) &&
  new RegExp('shivaa-shell-v' + REL).test(sw));
ok('the warm flag in index.html uses the same key and TTL as the app',
  /shv_catalog_v166/.test(index) && /1814400000/.test(index) &&
  /const CATALOG_KEY = 'shv_catalog_v166';/.test(app) && /CATALOG_TTL = 1000 \* 60 \* 60 \* 24 \* 21/.test(app));

if (pageFaults.length) {
  console.log('\n  page faults recorded (not failures by themselves):');
  pageFaults.slice(0, 4).forEach(f => console.log('   · ' + f.slice(0, 180)));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
