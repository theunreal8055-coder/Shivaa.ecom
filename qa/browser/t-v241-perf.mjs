/* t-v241-perf.mjs — the "smooth" release, locked by checks that can actually fail.
 *
 * Static, no browser needed (this sandbox has none, and jsdom has no layout).
 * Everything below is a property of the shipped bytes, so a later edit that
 * quietly undoes the win turns this suite red:
 *
 *   A · every card/tile picture a phone draws is a small WebP sibling, the
 *       original stays reachable as the fallback, and nothing outside the four
 *       converted folders is touched;
 *   B · the thumbnails those URLs point at really exist on disk, at the widths
 *       the markup offers, so the browser cannot be sent to a 404 by default;
 *   C · the always-visible chrome declares no backdrop-filter on touch widths
 *       (the per-frame blur that made scrolling stutter);
 *   D · the third-party payment SDK is no longer on every page load, while the
 *       on-demand loader inside app.js still is;
 *   E · a device that already holds the catalogue paints at 800 ms, not 6000;
 *   F · release plumbing: stamps, worker precache, bundle containing v241.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, 'cms', p));

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
};

const app = read('cms/js/app.js');
const v241 = read('cms/js/v241.js');
const css = read('cms/css/v241.css');
const bundle = read('cms/css/shivaa.css');
const index = read('cms/index.html');
const sw = read('cms/sw.js');
const api = read('cms/api.php');

/* ── A · the markup asks for the small picture ───────────────────────────── */
const flatApp = app.replace(/\s+/g, ' ');
ok('app.js defines the thumb directory whitelist (4 folders only)',
   /const THUMB_RE = \/\^\\\/images\\\/\(\?:products\|categories\|reviews\|offers\)/.test(app));
ok('app.js builds /images/thumbs/…-320.webp and -560.webp',
   /'\/images\/thumbs\/'/.test(app) && /'-' \+ w \+ '\.webp\?v=' \+ APP_REL/.test(app));
ok('every thumb URL is release-stamped (immutable caching, no pinning)',
   (app.match(/\.webp\?v=' \+ APP_REL/g) || []).length >= 1 && /\.webp\?v=' \+ REL/.test(v241));
ok('product cards use the helper instead of the raw original',
   /class="pc-img-a" \$\{thumbAttrs\(/.test(app) && /class="pc-img-b" \$\{thumbAttrs\(/.test(app));
ok('product-card images declare sizes (so the browser picks 320 or 560)',
   /sizes="/.test(app) && /\(max-width:600px\) 46vw/.test(app));
ok('home category tiles use the helper', /class="cat-mini-card"><img \$\{thumbAttrs\(/.test(app));
ok('mega-panel and drawer tiles use the helper',
   /class="mt-img"><img \$\{thumbAttrs\(/.test(app) && /\$\{thumbAttrs\(c\.img, '84px'\)\}/.test(app));
ok('pc-img-b no longer carries two onerror attributes',
   !/thumbAttrs\(p\.images\[1\][^`]*onerror="this\.remove\(\)"/.test(app));
ok('the original file is kept as data-full and the first retry',
   /data-full="\$\{full\}"/.test(app) && /this\.src=this\.dataset\.full/.test(app));
ok('banners / uploads / page heroes are returned untouched',
   /if \(!w1\) return `src="\$\{full\}" \$\{rest\}`;/.test(app));

/* the fallback order must be original → logo, never straight to a logo hole */
ok('thumb 404 falls back to the original before the logo',
   /dataset\.fb=1;this\.removeAttribute\('srcset'\);this\.src=this\.dataset\.full/.test(app));

/* ── B · the files those URLs promise actually exist ─────────────────────── */
const missing320 = [], missing560 = [];
for (const dir of ['products', 'categories', 'reviews', 'offers']) {
  for (const f of fs.readdirSync(path.join(ROOT, 'cms/images', dir))) {
    if (!/\.(jpe?g|png)$/i.test(f)) continue;
    const stem = f.replace(/\.(jpe?g|png)$/i, '');
    if (!exists(`images/thumbs/${dir}/${stem}-320.webp`)) missing320.push(`${dir}/${f}`);
    if (!exists(`images/thumbs/${dir}/${stem}-560.webp`)) missing560.push(`${dir}/${f}`);
  }
}
ok('every converted picture has a 320 px sibling (no srcset candidate 404s)',
   missing320.length === 0, missing320.slice(0, 3).join(', '));
ok('every converted picture has a 560 px sibling (no srcset candidate 404s)',
   missing560.length === 0, missing560.slice(0, 3).join(', '));
ok('all 4 converted folders ship thumbnails',
   ['products', 'categories', 'reviews', 'offers'].every((d) =>
     fs.existsSync(path.join(ROOT, 'cms/images/thumbs', d))));
const THUMB_ROOT = path.join(ROOT, 'cms/images/thumbs');
const thumbFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.webp')) thumbFiles.push(p);
  }
})(THUMB_ROOT);
ok('thumbnail set is substantial (>= 200 files)', thumbFiles.length >= 200, String(thumbFiles.length));
const thumbBytes = thumbFiles.reduce((n, f) => n + fs.statSync(f).size, 0);
ok('the whole thumbnail set is smaller than 7 MB', thumbBytes < 7 * 1024 * 1024,
   (thumbBytes / 1048576).toFixed(2) + ' MB');
/* the win, in numbers: a card used to cost the original */
const oneCard = fs.statSync(path.join(ROOT, 'cms/images/products/ring-floral.jpg')).size;
const oneThumb = fs.statSync(path.join(ROOT, 'cms/images/thumbs/products/ring-floral-560.webp')).size;
ok('a card picture is at least 4× lighter than its original',
   oneCard / oneThumb >= 4, `${Math.round(oneCard / 1024)} KB → ${Math.round(oneThumb / 1024)} KB`);

/* ── C · the chrome stops re-blurring the page on touch widths ───────────── */
const flatCss = css.replace(/\s+/g, ' ');
ok('v241.css targets touch widths', /@media \(max-width: 820px\), \(hover: none\) and \(pointer: coarse\)/.test(flatCss));
for (const sel of ['.header', '.utilbar', '.mnav', '.pd-stickybar']) {
  const re = new RegExp('\\' + sel + ' \\{[^}]*backdrop-filter: none !important');
  ok(`${sel} drops backdrop-filter on touch`, re.test(flatCss));
}
ok('the fills stay effectively opaque (no see-through regression)',
   /background: rgba\(250, 246, 239, \.985\) !important/.test(flatCss) &&
   /background: rgba\(26, 4, 7, \.985\) !important/.test(flatCss));
ok('full-screen scrims lose the blur too',
   /\.mega-backdrop, \.shv-backdrop \{ backdrop-filter: none !important/.test(flatCss));
/* every blur removal must sit AFTER the media query opens — otherwise desktop
   would silently lose its frost as well */
const mediaAt = css.indexOf('@media (max-width: 820px)');
const firstHeader = css.indexOf('.header {');
ok('the blur removals are inside the touch-width media query',
   mediaAt > -1 && firstHeader > mediaAt);
ok('desktop keeps its frosted look (bundle still blurs the header)',
   /\.header\{position:sticky;top:0;z-index:50;background:rgba\(250,246,239,\.92\);backdrop-filter:blur\(14px\)/.test(bundle));
ok('tap targets use touch-action: manipulation', /touch-action: manipulation;/.test(flatCss));
ok('v241.css is inside the shipped bundle',
   /\/\* v241\.css \*\//.test(bundle) && /touch-action: manipulation/.test(bundle));

/* ── D · no third-party payment SDK on every page load ───────────────────── */
ok('index.html no longer loads the Cashfree SDK', !/sdk\.cashfree\.com\/js/.test(index));
ok('the on-demand loader is still in app.js',
   /loadExternalScript\('https:\/\/sdk\.cashfree\.com\/js\/v3\/cashfree\.js'/.test(app));
ok('the preconnects stay (free until used)', /preconnect" href="https:\/\/sdk\.cashfree\.com"/.test(index));

/* ── E · the fast paint, and the honest ceiling it must not break ─────────
   v242 reverted v241's 800 ms device-catalogue paint: the catalogue was on the
   phone but the GOLD RATE never is, so the first screen could print ₹0 until the
   batch landed. What survives is the 6 s ceiling and the calm repaint. This
   release's own suite (t-v242-taps) owns that contract; here we only assert the
   ceiling still exists so a future "make it faster" pass cannot remove both. */
ok('a paint ceiling still exists for a cold first visit', /const _capMs = isRedraw \? 15000 : 6000;/.test(app));
ok('the late batch is repainted calmly, never under a finger', /calmBoot\(0\)/.test(app));

/* ── F · release plumbing (v242 — release-agnostic: this suite's job is that
   v241's ASSETS are still shipped at whatever the current stamp is, never that
   the site froze at 241) ─────────────────────────────────────────────────── */
const stamp = (index.match(/window\.__SHIVAA_REL=(\d+)/) || [])[1];
ok('index.html stamps a release >= 241', Number(stamp) >= 241, String(stamp));
ok('index.html still loads js/v241.js after js/v240.js',
   index.indexOf(`/js/v240.js?v=${stamp}`) > -1 &&
   index.indexOf(`/js/v241.js?v=${stamp}`) > index.indexOf(`/js/v240.js?v=${stamp}`));
ok('no older asset stamp is left in index.html', !/\?v=240/.test(index));
ok('app.js APP_REL is at least 241', Number((app.match(/const APP_REL = (\d+);/) || [])[1]) >= 241);
ok('sw.js shell + REL agree with the page stamp',
   new RegExp(`shivaa-shell-v${stamp}`).test(sw) && new RegExp(`const REL = ${stamp};`).test(sw));
ok('sw.js precaches js/v241.js at that stamp', new RegExp(`'/js/v241\\.js\\?v=${stamp}'`).test(sw));
ok('sw.js keeps more small pictures warm (MEDIA_MAX 160)', /const MEDIA_MAX = 160;/.test(sw));
ok('api.php reports the same release', new RegExp(`'rel' => ${stamp}`).test(api));
ok('v241.js is syntactically loadable and self-guarding', /'use strict'/.test(v241) && /document\.readyState === 'loading'/.test(v241));
ok('?perf=1 gives the owner real numbers', /perf=1/.test(v241) && /first byte/.test(v241));

console.log(`\n${pass}/${pass + fail} passing`);
if (fail) { console.log('RESULT: FAILURES'); process.exit(1); }
console.log('RESULT: ALL PASS');
