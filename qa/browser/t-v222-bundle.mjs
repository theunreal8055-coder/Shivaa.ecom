/* t-v222 — "the load release": index.html links ONE stylesheet, built from
   every layer, in the historical order that the cascade depends on.

   Why this suite exists: the whole release rests on one claim — that
   /css/shivaa.css is every layer, in the same order, byte for byte. If that
   claim is ever false the site does not merely look different, it renders
   wrong. So the order is checked here permanently, and the build script's own
   byte-equality proof is executed as part of the gate.

   The suite also proves the fix is real: one render-blocking stylesheet
   instead of 58, and nothing arriving late through the preload-swap pattern. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { boot, wait } from './harness.mjs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));

const index = fs.readFileSync('cms/index.html', 'utf8');
const sw = fs.readFileSync('cms/sw.js', 'utf8');
const app = fs.readFileSync('cms/js/app.js', 'utf8');
const api = fs.readFileSync('cms/api.php', 'utf8');
const bundle = fs.readFileSync('cms/css/shivaa.css', 'utf8');

/* ── 1 · the cascade order, locked forever ──────────────────────────
   This is the document order the 58 <link> tags had, kept exactly —
   including v186.css appearing twice, which is deliberate: two <link>s to
   one sheet occupy two positions in the cascade, so the bundle reproduces
   both. Dropping either one changes which layer wins a specificity tie. */
const CANON = [
  'fonts.css', 'styles.css', 'finale.css', 'mobile.css', 'v113.css', 'v115.css',
  'v116.css', 'v117.css', 'v118.css', 'v119.css', 'v120.css', 'v121.css',
  'v122.css', 'v125.css', 'v139.css', 'v140.css',
  'hallmark.css', 'trust.css', 'motion.css', 'aurum.css', 'v107.css', 'boost.css',
  'v167.css', 'v174.css', 'v175.css', 'v178.css', 'v183.css', 'v186.css',
  'v184.css', 'v185.css', 'v186.css', 'v184-amrita.css', 'v187.css', 'v188.css',
  'v192.css', 'v193.css', 'v194.css', 'v196.css',
  'v200.css', 'v201.css', 'v202.css', 'v203.css', 'v204.css', 'v205.css',
  'v206.css', 'v207.css', 'v208.css', 'v209.css', 'v210.css', 'v211.css',
  'v212.css', 'v213.css', 'v214.css', 'v215.css', 'v216.css', 'v217.css',
  'v218.css', 'v219.css',
  'v224.css', 'v225.css',
  'v226.css',
  'v227.css',
  'v229.css',
  'v230.css',
  'v231.css',
];

const headers = [...bundle.matchAll(/^\/\* ([a-z0-9-]+\.css) \*\/$/gm)].map(m => m[1]);
T('bundle: has a provenance header for every link', headers.length === CANON.length,
  headers.length + '/' + CANON.length);
T('bundle: the layer order is exactly the historical cascade order',
  headers.join(',') === CANON.join(','),
  headers.join(',') === CANON.join(',') ? '' : 'ORDER DRIFTED');
T('bundle: v186.css keeps its deliberate second position',
  headers.filter(h => h === 'v186.css').length === 2);
T('bundle: every layer it names exists on disk',
  CANON.every(f => fs.existsSync('cms/css/' + f)));
T('bundle: no per-layer stylesheet was left out',
  CANON.every(f => headers.includes(f)));

/* ── 2 · the build script's own byte-proof runs in the gate ────────── */
let proof = '';
try {
  proof = execFileSync('python3', ['tools/build-css-bundle.py'],
                       { cwd: process.cwd(), encoding: 'utf8', timeout: 120000 });
} catch (e) {
  proof = 'ERROR: ' + (e && e.message);
}
T('build: tools/build-css-bundle.py runs clean', proof.includes('VERIFY: bundle == ordered concatenation'),
  proof.startsWith('ERROR') ? proof.slice(0, 90) : '');
T('build: it confirms all blocks are present, contiguous and in order',
  proof.includes('VERIFY: all 65 blocks present, contiguous and in order'));
T('build: it writes nothing on a dry run',
  !proof.includes('wrote cms/css/shivaa.css'));

/* ── 3 · the fix is real: one blocking request, nothing late ───────── */
const sheetLinks = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
const perLayer = sheetLinks.filter(h => /\/css\/v\d+\.css|\/css\/(hallmark|trust|motion|aurum|boost)\.css/.test(h));
T('index: links exactly ONE stylesheet', sheetLinks.length === 1, sheetLinks.join(','));
T('index: that stylesheet is the bundle', sheetLinks[0] === '/css/shivaa.css?v=231');
T('index: no per-layer stylesheet <link> is left', perLayer.length === 0, perLayer.join(','));
T('index: the late preload-swap pattern is gone (nothing restyles after paint)',
  !/rel="preload" as="style"/.test(index));
T('index: no <noscript> stylesheet duplicates are needed any more',
  !/<noscript>[\s\S]*?stylesheet/.test(index));

/* the old shape for contrast: this is what was making the site feel slow */
T('index: the old 58-link shape is really gone',
  (index.match(/<link rel="stylesheet"/g) || []).length === 1);

/* ── 4 · the service worker follows the bundle ─────────────────────── */
const cssPrecache = [...sw.matchAll(/'\/css\/([^']+\.css)\?v=\d+'/g)].map(m => m[1]);
T('sw: precaches exactly one stylesheet', cssPrecache.length === 1, cssPrecache.join(','));
T('sw: that stylesheet is the bundle', cssPrecache[0] === 'shivaa.css');
T('sw: no dead per-layer stylesheet is precached for the shopper',
  !/'\/css\/v\d+\.css\?v=\d+'/.test(sw));
T('sw: the offline shell keeps every script and font it had',
  sw.includes('/js/app.js?v=231') && sw.includes('/fonts/jost.woff2?v=231')
  && sw.includes('/offline.html'));

/* ── 5 · stamps ────────────────────────────────────────────────────── */
T('stamps: index at 227', index.includes('__SHIVAA_REL=231') && !index.includes('?v=226'));
T('stamps: sw.js shell v227', sw.includes('shivaa-shell-v231') && sw.includes('const REL = 231;'));
T('stamps: app.js APP_REL 227', app.includes('const APP_REL = 231;'));
T('stamps: api rel 227', api.includes("'rel' => 231,"));

/* ── 6 · the settings race that the gate found ──────────────────────
   `state.settings` used to start as null; boot caps the /api/settings wait at
   6 seconds and paints anyway, so any route rendered inside that window hit a
   TypeError (the contact page did: "Cannot read properties of null (reading
   'address')"). The state now starts on the shop defaults and the API answer
   still overrides them field by field. */
T('app: one place defines the shop defaults', /const SETTINGS_DEFAULTS = \{/.test(app));
T('app: state.settings can never start as null',
  /settings: \{ \.\.\.SETTINGS_DEFAULTS \}/.test(app) && !/settings: null/.test(app));
T('app: the boot path reuses the same defaults object',
  /state\.settings = \{ \.\.\.SETTINGS_DEFAULTS, \.\.\.settings \}/.test(app));

/* ── 7 · the layers that must survive inside the bundle ────────────── */
T('bundle: the live thread badge selector is still there',
  bundle.includes('.sv-case-no'));
T('bundle: the black-card layer is still there', bundle.includes('.bc-card'));
T('bundle: the offer depth layer is still there', bundle.includes('--v219-gx'));
T('bundle: the v221 case clean-up held (no dead case card rule)',
  !/sv-case-card/.test(bundle));
T('bundle: the stillness guards are still there',
  /backdrop-filter:\s*none/.test(bundle) && /content-visibility:\s*auto/.test(bundle));
T('bundle: it carries the styles, not an empty shell',
  bundle.length > 800000, bundle.length + ' bytes');

/* ── 8 · a real boot still works with the bundle ───────────────────── */
const { window, doc, errors } = await boot('#/', { mobile: true });
await wait(2200);
T('dom: the page boots with the bundled stylesheet', !!doc.querySelector('#view'));
T('dom: the header renders (the shell got its styles)',
  !!doc.querySelector('header') || !!doc.getElementById('mainNav'));
T('dom: the gold thread still mounts', !!doc.querySelector('.sv-thread'));
T('dom: the thread keeps its FILM badges',
  doc.querySelectorAll('.sv-thread-film .sv-case-no').length === 5,
  String(doc.querySelectorAll('.sv-thread-film .sv-case-no').length));

const realErrs = errors.filter(e =>
  !/cashfree|Could not load script|getContext|Not implemented|jsdomError: Could not parse CSS|Client network socket disconnected/i.test(e));
T('dom: no real page errors with the bundle', realErrs.length === 0,
  String(realErrs[0] || '').slice(0, 110));

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
