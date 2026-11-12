/* t-v242-taps.mjs — "the site is smooth but clicks don't work", locked.
 *
 * The owner's report after v241. Nothing in the tap path was rewritten in v241
 * and a DOM test still fires every control, so the taps were being EATEN, not
 * lost. Three mechanisms can do that on a real phone, and this suite pins the
 * fix for each — plus the two bugs v241 shipped that the owner never mentioned:
 * a wrong-price fast paint, and the product page's big photo replaced by a
 * 560 px thumbnail.
 *
 *   1 · the service worker scanned its whole image cache after EVERY picture;
 *   2 · the view was repainted 1–3 s after paint, closing whatever had just been
 *       opened under the finger (app.js now waits for a calm moment);
 *   3 · a leftover full-screen layer could swallow every tap (rule + rescue +
 *       ?tapdiag=1).
 *   and the two silent ones: the 800 ms paint had no gold rate (₹0/₹NaN), and
 *   the gallery upgrade softened the product photograph.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
};

const app = read('cms/js/app.js');
const v241 = read('cms/js/v241.js');
const v242 = read('cms/js/v242.js');
const sw = read('cms/sw.js');
const index = read('cms/index.html');
const api = read('cms/api.php');
const flat = (s) => s.replace(/\s+/g, ' ');

/* v243 rolled the release forward. These checks are about the SHAPE of the
   stamp — one release everywhere, v242 still loaded, no stale v=241 URL — not
   about the number, so the number is read from index.html instead of typed. */
const REL = +(index.match(/window\.__SHIVAA_REL=(\d+);/) || [])[1];
const rel = (n) => n === REL;
ok('the release stamp is a single coherent number', REL >= 242, 'REL=' + REL);

/* ── 1 · the service worker stops grinding the cache ────────────────────── */
ok('sw.js still keeps 160 small pictures warm', /const MEDIA_MAX = 160;/.test(sw));
ok('the age sweep is rate-limited (no scan after every image)',
   /TRIM_AGE_EVERY/.test(sw) && /Date\.now\(\) - _lastAgeSweep < TRIM_AGE_EVERY\) return;/.test(sw));
ok('trimMedia no longer reads every entry on every write',
   !flat(sw).includes('for (const k of await c.keys()) { try { const res = await c.match(k);'));
ok('the expensive sweep runs once on activation instead',
   /e\.waitUntil\(trimMedia\(\)\.catch\(\(\) => \{\}\)\);/.test(sw));
ok('sw shell + REL carry the live release',
   new RegExp('shivaa-shell-v' + REL).test(sw) && new RegExp('const REL = ' + REL + ';').test(sw));
ok('sw precaches js/v242.js', /'\/js\/v242\.js\?v=\d+'/.test(sw));
ok('the duplicated v237 precache entry is gone',
   (sw.match(/'\/js\/v237\.js\?v=\d+'/g) || []).length === 1);

/* ── 2 · no repaint under a finger ──────────────────────────────────────── */
ok('the device-catalogue fast paint is reverted (rates are never cached)',
   /const _capMs = isRedraw \? 15000 : 6000;/.test(app));
ok('a late batch queues a CALM repaint, not an immediate one',
   /_firstBatch\.then\(\(\) => \{ calmBoot\(0\); \}\)/.test(app));
ok('calmBoot waits for no-touch / no-sheet / visible',
   /function userTouching\(\)/.test(app) && /__shvLastInput/.test(app) &&
   /\.modal-overlay\.open, \.fsheet-overlay\.open, \.nav\.open/.test(app));
ok('calmBoot retries instead of dropping the data', /return calmBoot\(_calmTries \+ 1\);/.test(app));
ok('calmBoot has a ceiling', /if \(_calmTries > 12\) return;/.test(app));
ok('the boot tickers cannot stack (one of each, always)',
   /if \(window\._shvAgeTick\) clearInterval\(window\._shvAgeTick\)/.test(app) &&
   /window\._shvAgeTick = setInterval/.test(app) &&
   /if \(window\._shvFinaleTick\) clearInterval\(window\._shvFinaleTick\)/.test(app) &&
   /window\._shvFinaleTick = setInterval\(syncFinaleChrome, 30000\)/.test(app));

/* ── 3 · the two silent v241 bugs ───────────────────────────────────────── */
ok('the hover photograph is skipped on touch (it can never be hovered)',
   /const FINE_POINTER = /.test(app) && /\$\{p\.images && p\.images\[1\] && FINE_POINTER \?/.test(app));
ok('the thumbnail upgrade is scoped to grids and cards',
   /var GRID_IMG = '\.pc-imgwrap img, \.cat-mini-card img, \.mt-img img, \.dw-catlist img, \.rev-photo, \.ugc-ph img/.test(v241));
ok('a gallery / hero photograph is never swapped for a 560 px sibling',
   /if \(!img\.matches\(GRID_IMG\) && !img\.closest\(GRID_IMG\)\)/.test(v241));
ok('the review form button declares its type',
   /<button type="submit" class="btn btn-outline btn-sm"/.test(app));

/* ── 4 · a leftover layer cannot eat the site ───────────────────────────── */
ok('v242 injects the scrim rule', /v242-scrim/.test(v242));
ok('a closed overlay is not clickable',
   /\.modal-overlay:not\(\.open\),\.fsheet-overlay:not\(\.open\)/.test(flat(v242)));
ok('a neutralised layer stays neutralised',
   /\[data-v242-stray\]\{pointer-events:none!important\}/.test(flat(v242)));
ok('the tap beacon is registered on capture, passive',
   /\['pointerdown', 'touchstart', 'keydown', 'wheel'\]\.forEach/.test(v242) &&
   /\{ capture: true, passive: true \}/.test(v242));
ok('the rescue only neutralises a layer with no control of its own',
   /el\.querySelector\('a\[href\],button,input,select,textarea,\[onclick\],\[role="button"\]'\)/.test(v242));
ok('real sheets are never neutralised', /REAL_SHEETS/.test(v242) && /\.nav\.open/.test(v242));
/* the claim is about CODE, not about the comment that states it */
const v242code = v242.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
ok('v242 never dispatches a click of its own and never preventDefaults',
   !/\.click\(\)/.test(v242code) && !/preventDefault/.test(v242code));
ok('the ordinary tap path costs no layout (describe only when suspicious or flagged)',
   /} else if \(DIAG\) \{/.test(v242));
ok('the boot scan is bounded to body children (no full-page getComputedStyle)',
   /for \(var a = 0; a < document\.body\.children\.length; a\+\+\)/.test(v242));

/* ── 5 · ?tapdiag=1 gives the owner the truth ───────────────────────────── */
ok('?tapdiag=1 is wired', /tapdiag=1/.test(v242));
ok('the panel names the element the browser actually hit',
   /describe\(/.test(v242) && /elementFromPoint/.test(v242));
ok('the panel reports sheet / scroll-lock state', /scroll locked:/.test(v242) && /sheet open:/.test(v242));

/* ── 6 · release plumbing ───────────────────────────────────────────────── */
ok('index.html loads v242 after v241',
   index.indexOf('/js/v241.js?v=' + REL) > -1 &&
   index.indexOf('/js/v242.js?v=' + REL) > index.indexOf('/js/v241.js?v=' + REL));
ok('index.html stamps the live rel', /window\.__SHIVAA_REL=\d+;/.test(index));
ok('every asset URL rides the live release', !/\?v=(24[01])\b/.test(index));
ok('index.html still links exactly one stylesheet', (index.match(/<link rel="stylesheet"/g) || []).length === 1);
ok('the Cashfree SDK is still off the critical path', !/sdk\.cashfree\.com\/js/.test(index));
ok('app.js APP_REL is the live release', /const APP_REL = \d+;/.test(app) && new RegExp('const APP_REL = ' + REL + ';').test(app));
ok('api.php reports the live release', new RegExp("'rel' => " + REL).test(api));

console.log(`\n${pass}/${pass + fail} passing`);
if (fail) { console.log('RESULT: FAILURES'); process.exit(1); }
console.log('RESULT: ALL PASS');
