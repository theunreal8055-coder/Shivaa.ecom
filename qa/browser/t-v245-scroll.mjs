/* t-v245-scroll.mjs — "cant even scroll anything on mobile, everything has stopped", locked.
 *
 * v244 shipped two things a phone cannot survive:
 *
 *   1 · `content-visibility:auto` on grid cards (and, from earlier layers, on
 *       `.p-grid` itself, `.pillars`, `.ugc-wall`, `.catbar-outer`, `.p-card`,
 *       the footer...). A skipped subtree is NOT laid out: it reports the
 *       placeholder height from `contain-intrinsic-size` instead of its real
 *       one, and the lazy images inside it never start. So the document can be
 *       shorter than its content — the page stops scrolling — and the cards
 *       are blank rectangles until (if ever) they wake.
 *   2 · `html, body { overflow-x: hidden }`, a well-known iOS scroll stopper.
 *
 * v245 deletes every content-visibility from the bundle, forbids it with a
 * universal guard, drops the overflow rule, stops the decoration parking from
 * ever sticking, wakes a blank picture that is in front of the shopper, and
 * ships `?nofx=1` as a kill switch. This suite pins all of it.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
};

const index = read('cms/index.html');
const bundle = read('cms/css/shivaa.css');
const layer = read('cms/css/v245.css');
const v244 = read('cms/js/v244.js');
const v245 = read('cms/js/v245.js');
const sw = read('cms/sw.js');
const api = read('cms/api.php');
const app = read('cms/js/app.js');
const REL = +(index.match(/window\.__SHIVAA_REL=(\d+);/) || [])[1];

/* ── 1 · the cause is gone from the shipped css, not just overridden ────── */
ok('not one content-visibility:auto survives in the bundle',
  !/content-visibility\s*:\s*(auto|hidden)/.test(bundle), 'still present');
ok('no placeholder height is used anywhere (only the guard\'s `none`)',
  !/contain-intrinsic-size\s*:\s*(auto|[0-9])/.test(bundle));
ok('nor in the v245 layer as a declaration of the bad kind',
  !/content-visibility\s*:\s*(auto|hidden)/.test(strip(layer)) &&
  !/contain-intrinsic-size\s*:\s*auto/.test(strip(layer)));
ok('a universal guard forbids it for good',
  /\*,\s*\*::before,\s*\*::after\s*\{\s*content-visibility:\s*visible\s*!important/.test(flat(bundle)));
ok('the grids are not layout-contained either',
  /\.p-grid,\s*\.fine-grid[\s\S]{0,200}?contain:\s*none\s*!important/.test(flat(bundle)));

/* ── 2 · html/body are not a scroll container ───────────────────────────── */
ok('nothing sets overflow-x:hidden on html or body',
  !/html\s*,\s*body\s*\{[^}]*overflow-x\s*:\s*hidden/.test(flat(bundle)) &&
  !/html\s*,\s*body\s*\{[^}]*overflow-x\s*:\s*hidden/.test(flat(strip(layer))));
ok('the document keeps horizontal clipping without a scroll box',
  /body\s*\{\s*overflow-x:\s*clip/.test(flat(bundle)) && /html\s*\{[^}]*overflow-x:\s*clip/.test(flat(bundle)));

/* ── 3 · the parking can never stick ───────────────────────────────────── */
ok('a watchdog unpark exists and runs on a timer',
  /setInterval\(function \(\) \{[\s\S]{0,200}?shv-scrolling[\s\S]{0,200}?400\)/.test(v245));
ok('v244 exposes parkOff so the guard can release it',
  /parkOff: parkOff,/.test(v244) && /typeof v244\.parkOff === 'function'/.test(v245));
ok('a route change, a restored tab and a hidden tab all release it',
  /'hashchange', 'pageshow', 'focus'/.test(v245) && /doc\.hidden\) unpark\('hidden'\)/.test(v245));
ok('v244 no longer re-arms a timer on every scroll event',
  !/setTimeout\(parkOff/.test(v244) && /setInterval\(parkCheck, 120\)/.test(v244));

/* ── 4 · a blank picture in front of the shopper is woken ───────────────── */
ok('a visible image that has not started is asked for',
  /function wakeVisible\(\)/.test(v245) && /img\.loading = 'eager'/.test(v245));
ok('it is bounded (40 images, one pass per settle)',
  /n < 40/.test(v245) && /setTimeout\(wakeVisible, 4500\)/.test(v245));
ok('it never re-points a picture to another file',
  (v245.match(/img\.src\s*=/g) || []).length ===
  (v245.match(/img\.src\s*=\s*img\.getAttribute\('data-src'\)/g) || []).length);

/* ── 5 · the kill switch ────────────────────────────────────────────────── */
ok('?nofx=1 exists in the css guard', /html\.shv-plain \*/.test(flat(bundle)));
ok('?nofx=1 is honoured by the script', /\[\?&\]nofx=1\/\.test\(location\.search/.test(v245));
ok('a kill-switched page never parks', /if \(NOFX\) return;/.test(v244));

/* ── 6 · the release is wired ───────────────────────────────────────────── */
ok('js/v245.js is loaded exactly once', (index.match(/\/js\/v245\.js\?v=\d+/g) || []).length === 1);
ok('every stamp is one release',
  REL >= 245 && new RegExp('const APP_REL = ' + REL + ';').test(app) &&
  new RegExp("'rel' => " + REL).test(api) && new RegExp('const REL = ' + REL + ';').test(sw));
ok('the worker shell names this release and precaches the layer',
  new RegExp('shivaa-shell-v' + REL).test(sw) && /'\/js\/v245\.js\?v=\d+'/.test(sw));
ok('the v244 blur work was NOT rolled back with it',
  /backdrop-filter:\s*none\s*!important/.test(bundle) && /\.header\.scrolled/.test(bundle));

/* ── 7 · live DOM ───────────────────────────────────────────────────────── */
const BASE = process.env.SHIVAA_BASE || 'http://127.0.0.1:8090';
let up = false;
try { up = (await fetch(BASE + '/index.html', { signal: AbortSignal.timeout(2500) })).ok; } catch (e) { up = false; }

if (!up) {
  console.log('  skip live DOM section — preview shim not answering on ' + BASE);
} else {
  const { boot, wait } = await import('./harness.mjs');
  const real = (list) => list.filter((e) => !/Not implemented: HTMLMediaElement/.test(e));

  for (const mobile of [false, true]) {
    const tag = mobile ? 'phone' : 'PC';
    const { window, doc, errors } = await boot('#/shop', { mobile });
    await wait(2600);
    const html = doc.documentElement;

    ok(tag + ': v245 installed', !!window.Shivaa.v245);
    ok(tag + ': the shop grid still renders every card',
      doc.querySelectorAll('#view .p-card').length >= 8,
      doc.querySelectorAll('#view .p-card').length + ' cards');

    /* nothing on the page may report a skipped rendering */
    const skipped = [...doc.querySelectorAll('#view *')].filter((el) => {
      try { return window.getComputedStyle(el).contentVisibility === 'hidden'; } catch (e) { return false; }
    }).length;
    ok(tag + ': nothing in the view is skipped', skipped === 0, skipped + ' skipped');

    /* a stuck parking is released inside a second, with no scroll at all */
    html.classList.add('shv-scrolling');
    await wait(620);
    ok(tag + ': a parked page un-parks itself', !html.classList.contains('shv-scrolling'));

    /* and a real gesture still parks, then releases */
    window.dispatchEvent(new window.Event('scroll'));
    await wait(50);
    ok(tag + ': a real gesture still parks', html.classList.contains('shv-scrolling'));
    await wait(500);
    ok(tag + ': and releases when it stops', !html.classList.contains('shv-scrolling'));

    /* the audit a report is built from */
    const a = window.Shivaa.v245.audit();
    ok(tag + ': the audit reports cards and a scrollable document',
      a.scroll.cards >= 8 && a.skipped === 0 && typeof a.scroll.max === 'number', JSON.stringify(a.scroll));
    ok(tag + ': no page errors', real(errors).length === 0, (real(errors)[0] || '').slice(0, 160));
    window.close();
  }

  /* the kill switch turns everything off */
  const k = await boot('?nofx=1#/');
  await wait(2200);
  ok('?nofx=1 marks the page and never parks',
    k.window.document.documentElement.classList.contains('shv-plain') &&
    !k.window.document.documentElement.classList.contains('shv-scrolling'));
  k.window.dispatchEvent(new k.window.Event('scroll'));
  await wait(120);
  ok('?nofx=1 ignores a scroll gesture',
    !k.window.document.documentElement.classList.contains('shv-scrolling'));
  k.window.close();
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
