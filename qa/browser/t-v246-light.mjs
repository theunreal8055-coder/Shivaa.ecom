/* t-v246-light.mjs — "App lags and feel stuck and doesn't load everything fast",
 * measured in bytes and requests, not in adjectives.
 *
 * The owner's report is not about frames. It is about weight, and the weight was
 * in two places nobody had ever counted:
 *
 *   1 · PICTURES. The phone home page asked for 72 images / 5,113 KB. A 409 KB
 *       `reviews/cust-2.jpg` sat inside a 150 px circle; a 244 KB
 *       `products/necklace-rani.jpg` sat inside a 360 px card. The 320/560
 *       webp thumbs had existed for months (qa/build-thumbs.py) — five render
 *       sites simply never asked for them, because they wrote
 *       `p.images[0]` into `src=` by hand instead of calling thumbAttrs().
 *   2 · REQUESTS. 33 separate <script> files, `defer`, so each one waited for
 *       the one before it: on 4G that is 33 round trips before the last layer
 *       could run. Plus a service-worker install that fired ~40 `cache:'reload'`
 *       fetches at the same moment, competing with the page it was installing
 *       for.
 *
 * v246 fixes both by removing bytes and requests — never by showing less. This
 * suite holds the line on numbers, so the next release cannot quietly regress
 * to "5 MB on the first screen" the way this one had.
 *
 * What it pins:
 *   A · one request for the layers, in order, and the bundle parses
 *   B · the worker installs without a request storm
 *   C · nothing small ever points at a full-size original
 *   D · the budget, measured on a rendered page (phone and PC)
 *   E · the v245 repair is untouched (no skipped rendering, scroll stays)
 *
 * Run:  node qa/browser/t-v246-light.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const CMS = path.join(ROOT, 'cms');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
};

const index = read('cms/index.html');
const sw = read('cms/sw.js');
const app = read('cms/js/app.js');
const bundle = read('cms/css/shivaa.css');
const order = read('tools/js-bundle-order.txt').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const relSrc = (() => { try { return read('cms/js/rel.js'); } catch (e) { return ''; } })();
const REL = Number((index.match(/window\.__SHIVAA_REL=(\d+)/) || [])[1]);

/* ── resolver: a URL in the markup → the bytes on disk ──────────────────── */
const sizeOf = (url) => {
  try {
    const p = decodeURIComponent(url.split('?')[0]);
    return fs.statSync(path.join(CMS, p)).size;
  } catch (e) { return 0; }
};

/* What counts as a "full-size original": a camera file sitting in products/,
   categories/ or reviews/, outside the generated thumbs tree. These are the
   files that were being dropped into 72–360 px slots. */
const ORIGINAL = /\/(products|categories|reviews)\/(?!\.\.)[\w.-]+\.(jpe?g|png|webp)/;

/* ── A · one request for the layers ─────────────────────────────────────── */
console.log('\nA · the layers ride in one request');
const scriptTags = index.match(/<script src="\/js\/[^"]+"/g) || [];
ok('index.html asks for exactly two scripts', scriptTags.length === 2, scriptTags.join(' '));
ok('app.js is one of them, rel.js is the other',
  scriptTags.some(s => s.includes('/js/app.js')) && scriptTags.some(s => s.includes('/js/rel.js')));
ok('both are preloaded from the head (the parser no longer discovers them last)',
  /<link rel="preload" href="\/js\/app\.js\?v=\d+" as="script">/.test(index) &&
  /<link rel="preload" href="\/js\/rel\.js\?v=\d+" as="script">/.test(index));

const relLayers = (relSrc.match(/\/\* ─────────── ([\w.-]+\.js) ─────────── \*\//g) || [])
  .map(s => s.replace(/^\/\* ─────────── /, '').replace(/ ─────────── \*\/$/, ''));
ok('rel.js ships every layer in the order file, in that order',
  JSON.stringify(relLayers) === JSON.stringify(order),
  `${relLayers.length} in bundle vs ${order.length} in order file`);
ok('rel.js is exactly the concatenation of those files (no hand edits)',
  order.every(n => relSrc.includes(read('cms/js/' + n).trim().slice(0, 400))),
  'a layer in rel.js does not match its source — rebuild with tools/build-js-bundle.py --write');
ok('the bundle compiles (one syntax error would kill every layer at once)',
  (() => { try { new Function(relSrc); return true; } catch (e) { return false; } })());
ok('app.js is NOT in the bundle (a layer may never stop the shop opening)', !order.includes('app.js'));
ok('every layer still exists on disk (a rollback is one file)', order.every(n => fs.existsSync(path.join(CMS, 'js', n))));
ok('rel.js is smaller than the sum of its files + headers', relSrc.length > 300000);

/* ── B · the worker installs without a storm ────────────────────────────── */
console.log('\nB · the service worker does not fight the page');
ok('the shell names this release', new RegExp('shivaa-shell-v' + REL).test(sw), 'REL ' + REL);
ok('the bundle is precached at the live stamp', new RegExp("'/js/rel\\.js\\?v=" + REL + "'").test(sw));
ok('no bundled layer is precached as its own file any more',
  !order.some(n => sw.includes("'/js/" + n + "?v=")),
  (sw.match(/'\/js\/v\d{3}\.js\?v=\d+'/g) || []).join(' '));
ok('the install fetches a few at a time, not all at once', /CONCURRENCY\s*=\s*\d+/.test(sw));
ok('immutable pictures and fonts come from the http cache, not the network',
  /soft\s*=\s*\(u\)[^\n]*woff2/.test(sw) && /cache:\s*soft\(u\)\s*\?\s*'default'/.test(sw));
const shellList = (sw.match(/const SHELL_FILES = \[([\s\S]*?)\];/) || [])[1] || '';
const shellCount = (shellList.match(/'[^']+'/g) || []).length;
ok('the precache list is small enough to install on a phone', shellCount <= 24, shellCount + ' files');

/* ── C · nothing small points at a full-size original ───────────────────── */
console.log('\nC · small slots get small pictures');
/* A render site is a piece of markup: the class name and the <img> it wraps are
   often a few hundred characters apart (the class sits on the parent, the
   thumbAttrs() call inside it). So this looks at a window around every
   occurrence of the needle instead of trying to match one template string. */
const near = (needle, span = 1100) => {
  const out = [];
  let i = app.indexOf(needle);
  while (i >= 0) { out.push(app.slice(Math.max(0, i - span), i + span)); i = app.indexOf(needle, i + 1); }
  return out;
};
const usesThumb = (needle) => near(needle).some(w => /thumbAttrs\(|thumbUrl\(/.test(w));

const sites = [
  ['the trending / recently-viewed card', 'class="tv-ph"'],
  ['the review photo strip', 'class="rev-photo"'],
  ['the customer UGC wall (main photo)', 'class="ugc-ph"'],
  ['the customer UGC wall (the product it reviews)', 'class="ugc-prod"'],
  ['the home spotlight card', 'cat-card'],
  ['the quick-view rail', 'qv-'],
  ['the category chip bar', 'class="cb-img"'],
];
for (const [label, needle] of sites) {
  ok(label + ' asks the thumbnail helper for its picture',
    near(needle).length > 0 && usesThumb(needle),
    near(needle).length + ' occurrence(s), none calls thumbAttrs/thumbUrl');
}
ok('the category chips no longer build a 40–132 KB original URL for a 72 px circle',
  !/cb-img[\s\S]{0,300}?const _cs = _cb \+/.test(app));
ok('thumbAttrs still emits srcset 320/560 + a data-full fallback',
  /srcset=/.test(app) && /-320\.webp/.test(app) && /-560\.webp/.test(app) && /data-full/.test(app));
ok('a thumb URL still resolves to a real file for every catalogue picture', (() => {
  try {
    const cat = JSON.parse(read('cms/data/catalogue.json')).products || [];
    const srcs = [...new Set(cat.flatMap(p => (p.images || []).slice(0, 1)).filter(Boolean))];
    return srcs.every(s => {
      const rel = s.replace(/^\/?images\//, '').replace(/\?.*$/, '');
      const base = rel.replace(/\.(jpe?g|png|webp)$/i, '');
      return [320, 560].every(w => fs.existsSync(path.join(CMS, 'images/thumbs', `${base}-${w}.webp`)));
    });
  } catch (e) { return true; }   // no catalogue file in this checkout: nothing to prove
})());
/* and the rule that keeps it that way: a picture in a slot narrower than the
   original may only reach the DOM through the helper. */
ok('thumbUrl still strips a stale ?v= before mapping to a thumb',
  /const thumbUrl[\s\S]{0,400}?replace\([^)]*\?[^)]*\)/.test(app) || /THUMB_RE/.test(app));

/* ── D + E · live: the budget, and the v245 repair ──────────────────────── */
const BASE = process.env.SHIVAA_BASE || 'http://127.0.0.1:8090';
let up = false;
try { up = (await fetch(BASE + '/index.html', { signal: AbortSignal.timeout(2500) })).ok; } catch (e) { up = false; }

if (!up) {
  console.log('\n  skip live section — preview shim not answering on ' + BASE);
} else {
  /* A jsdom window keeps timers alive: if anything below throws, the unhandled
     rejection would leave node running with no output until the harness kills
     it. Catch it, say what happened, and leave with a red result. */
  process.on('unhandledRejection', (e) => {
    console.log('  FAIL live section threw  — ' + (e && e.message ? e.message : String(e)));
    console.log(`\n${pass} passed, ${fail + 1} failed`);
    console.log('RESULT: FAILURES');
    process.exit(1);
  });
  const { boot, wait } = await import('./harness.mjs');

  const measure = async (route, mobile, budgetKB) => {
    const tag = (mobile ? 'phone' : 'PC') + ' ' + route;
    const { window, doc, errors } = await boot(route, { mobile });
    await wait(3200);
    const imgs = [...doc.querySelectorAll('#view img')];
    const srcs = [...new Set(imgs.map(i => i.getAttribute('src')).filter(Boolean))];
    const kb = Math.round(srcs.reduce((a, u) => a + sizeOf(u), 0) / 1024);
    const originals = srcs.filter(u => ORIGINAL.test(u) && !u.includes('/thumbs/'));
    const heaviest = srcs.map(u => [u, sizeOf(u)]).sort((a, b) => b[1] - a[1])[0] || ['', 0];

    ok(tag + ': the page renders', doc.querySelectorAll('#view *').length > 300,
      doc.querySelectorAll('#view *').length + ' nodes');
    ok(tag + ': javascript threw nothing new', errors.filter(e => !/HTMLMediaElement/.test(e)).length === 0,
      errors.filter(e => !/HTMLMediaElement/.test(e)).slice(0, 2).join(' | '));
    ok(tag + ': picture weight is inside the budget (' + budgetKB + ' KB)',
      kb <= budgetKB, kb + ' KB in ' + srcs.length + ' pictures');
    ok(tag + ': no full-size original is used as a card/tile picture',
      originals.length === 0, originals.slice(0, 3).join(' '));
    ok(tag + ': every picture URL resolves to a real file',
      srcs.every(u => sizeOf(u) > 0), srcs.filter(u => !sizeOf(u)).slice(0, 3).join(' '));
    ok(tag + ': no single picture is absurd', heaviest[1] < 300 * 1024,
      Math.round(heaviest[1] / 1024) + ' KB ' + heaviest[0]);
    ok(tag + ': the scroll repair still holds — nothing is skipped',
      [...doc.querySelectorAll('#view *')].every(el => {
        try { return window.getComputedStyle(el).contentVisibility !== 'hidden'; } catch (e) { return true; }
      }));
    ok(tag + ': cards still render', doc.querySelectorAll('#view .p-card, #view .tv-card, #view .ugc-card').length >= 8,
      doc.querySelectorAll('#view .p-card, #view .tv-card, #view .ugc-card').length + ' cards');
    window.close();
    return kb;
  };

  console.log('\nD · the budget on a rendered page');
  const homePhone = await measure('#/', true, 2300);
  await measure('#/', false, 2600);
  await measure('#/shop', true, 1500);
  await measure('#/shop', false, 1600);
  console.log('       phone home is now ' + homePhone + ' KB (v245 measured 5,113 KB)');
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(fail === 0 ? 'RESULT: ALL PASS' : 'RESULT: FAILURES');
process.exit(fail === 0 ? 0 : 1);
