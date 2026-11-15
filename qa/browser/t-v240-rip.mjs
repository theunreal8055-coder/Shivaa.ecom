/* t-v240-rip.mjs — the drawer ripple bug, locked.
 *
 * Static, no jsdom needed (jsdom has no layout, and this bug IS layout).
 *
 * The bug: v226's ripple appends `<span class="rip" style="width:412px;…">`
 * into the pressed host. motion.css gives `position:absolute` to `.btn .rip`
 * ONLY, so on any other host the span sits in normal flow — inside a drawer row
 * it becomes a 412 px flex item and squeezes the label to one character per
 * line, growing the row to ~550 px and pushing the rest of the menu off screen.
 *
 * What this suite proves:
 *   1 · the scoping bug is still what the codebase says it is (`.btn .rip` only);
 *   2 · v240 carries the generic rule, as a positioned rule, with !important —
 *      and does NOT touch transform/animation (the button ripple must stay);
 *   3 · v240 is loaded after v226.js, on every page, and precached by the worker;
 *   4 · v240 also undoes v239's inline grid and sweeps stranded ripples.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* v246 — the behaviour layers are no longer 31 separate <script> tags. They are
   concatenated, in document order, into /js/rel.js by tools/build-js-bundle.py
   (one request instead of 32, and no layer can be late because the one before
   it was slow). "Is vXXX still shipped, and still after vYYY?" therefore means
   "is it inside the bundle, at that index?" — the same guarantee, expressed
   against the file that now delivers it. A missing layer is a red test, not a
   silent absence. */
const relSrc = (() => { try { return read('cms/js/rel.js'); } catch (e) { return ''; } })();
const relLayers = (relSrc.match(/\/\* ─────────── ([\w.-]+\.js) ─────────── \*\//g) || [])
  .map(s => s.replace(/^\/\* ─────────── /, '').replace(/ ─────────── \*\/$/, ''));
const layerAt = (n) => relLayers.indexOf(n);
const relShips = (n) => layerAt(n) >= 0;

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
};

const bundle = read('cms/css/shivaa.css');
const motion = read('cms/css/motion.css');
const v226css = read('cms/css/v226.css');
const v240 = read('cms/js/v240.js');
const v239 = read('cms/js/v239.js');
const index = read('cms/index.html');
const sw = read('cms/sw.js');

/* ── 1 · the scoping bug as it exists in the stylesheets ─────────────────── */
ok('motion.css positions the ripple for buttons only',
   /\.btn\s+\.rip\s*\{[^}]*position\s*:\s*absolute/.test(motion));
ok('no bare `.rip{position:absolute}` rule exists (that was the bug)',
   !/(^|[,}])\s*\.rip\s*\{[^}]*position\s*:\s*absolute/m.test(bundle));
ok('v226 only styles transport + background, never position',
   !/\.rip-live\s*>\s*\.rip[^{]*\{[^}]*position\s*:/.test(v226css.replace(/\s+/g, ' ')));

/* ── 2 · v240 carries the fix ────────────────────────────────────────────── */
ok('v240 has the generic rule with position:absolute !important',
   /\.rip-live\s*>\s*\.rip\s*\{[^}]*position\s*:\s*absolute\s*!important/.test(v240.replace(/\s+/g, ' ')));
ok('v240 also guards ripples inside the drawer',
   /\.nav\s+\.nav-scroll\s+\.rip\s*\{[^}]*position\s*:\s*absolute\s*!important/.test(v240.replace(/\s+/g, ' ')));
ok('v240 never overrides the ripple transform (button anim untouched)',
   !/\.rip-live\s*>\s*\.rip[^{]*\{[^}]*transform\s*:/.test(v240.replace(/\s+/g, ' ')));
ok('v240 never overrides the ripple animation',
   !/\.rip-live\s*>\s*\.rip[^{]*\{[^}]*animation\s*:/.test(v240.replace(/\s+/g, ' ')));
ok('v240 sweeps stranded ripples out of the drawer',
   /querySelectorAll\(['"]\.rip['"]\)/.test(v240) && /removeChild/.test(v240));
ok('v240 reverts v239 inline grid (display:flex !important)',
   /display['"]?\s*,\s*['"]flex['"]/.test(v240) || /setProperty\('display',\s*'flex'/.test(v240));

/* ── 3 · it is actually loaded, in the right order, and precached ────────── */
ok('v240 ships inside js/rel.js', relShips('v240.js'), relLayers.join(' '));
ok('v240 runs after v226.js (so it wins the cascade)',
   layerAt('v240.js') > layerAt('v226.js') && relShips('v226.js'),
   `v226@${layerAt('v226.js')} v240@${layerAt('v240.js')}`);
/* v241 — these three used to pin the release NUMBER (240), so every later
   release turned this suite red for no reason and the drawer guard stopped
   being a signal. They now check that v240 is still shipped and still
   precached at the CURRENT release stamp — which is what actually matters:
   the ripple rule must reach the phone. */
const stamp = (index.match(/window\.__SHIVAA_REL=(\d+)/) || [])[1];
ok('index.html stamps a release >= 240', Number(stamp) >= 240, String(stamp));
ok('sw.js precaches the bundle that carries v240, at the current stamp',
   new RegExp("'/js/rel\\.js\\?v=" + stamp + "'").test(sw), 'stamp ' + stamp);
ok('sw.js shell + REL agree with that stamp',
   /shivaa-shell-v\d+/.test(sw) && new RegExp('const REL = ' + stamp + ';').test(sw));

/* ── 4 · the experiment that did not work is documented, not hidden ──────── */
ok('v239 exists and is still shipped (harmless, superseded)', v239.length > 500);
ok('v240 names the wrong diagnosis it replaces', /v239/.test(v240));

console.log(`\n${pass}/${pass + fail} passing`);
if (fail) { console.log('RESULT: FAIL'); process.exit(1); }
console.log('RESULT: ALL PASS');
process.exit(0);
