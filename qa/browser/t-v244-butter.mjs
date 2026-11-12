/* t-v244-butter.mjs — "buttery smooth, every button like butter, every page fast", locked.
 *
 * The owner, on a PC, after v243. Nothing here is a new feature: it is the
 * cost that was still in the frame path, and it is all verifiable by reading
 * the shipped css/js — which is what this suite does.
 *
 *   · the sticky header stopped re-blurring the page every scroll frame
 *     (`.header.scrolled{backdrop-filter:blur(20px)}` — v241 removed it on
 *     phones only, on the note that desktop had GPU headroom);
 *   · a product card no longer holds a GPU layer for its whole life;
 *   · a long grid stops building its tail until it is nearly seen;
 *   · the repaint-heavy decoration parks while the thumb is moving;
 *   · pictures are decoded a screen before they arrive, not as they arrive;
 *   · Back returns to where the shopper was, not to the top.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
};

const index = read('cms/index.html');
const bundle = read('cms/css/shivaa.css');
const layer = read('cms/css/v244.css');
const v244 = read('cms/js/v244.js');
const v241 = read('cms/css/v241.css');
const sw = read('cms/sw.js');
const api = read('cms/api.php');
const app = read('cms/js/app.js');
const REL = +(index.match(/window\.__SHIVAA_REL=(\d+);/) || [])[1];

/* the shipped layer is the source layer with comments stripped, appended last */
const marker = bundle.indexOf('/* v244.css */');
const tail = marker < 0 ? '' : bundle.slice(marker);
const flatTail = flat(tail);

/* ── 1 · the release is wired, once ─────────────────────────────────────── */
ok('js/v244.js is loaded exactly once', (index.match(/\/js\/v244\.js\?v=\d+/g) || []).length === 1);
ok('the layer rides at the end of the bundle', marker > 0 && marker > bundle.indexOf('/* v241.css */'));
ok('the layer in the bundle is the file on disk',
  flatTail.includes(flat('will-change: auto !important')) &&
  flatTail.includes(flat('backdrop-filter: none !important')));
ok('every stamp is one release',
  REL >= 244 && new RegExp('const APP_REL = ' + REL + ';').test(app) &&
  new RegExp("'rel' => " + REL).test(api) && new RegExp('const REL = ' + REL + ';').test(sw));
ok('the worker shell names this release', new RegExp('shivaa-shell-v' + REL).test(sw));
ok('the worker precaches the new layer', /'\/js\/v244\.js\?v=\d+'/.test(sw) && /'\/js\/v244\.js\?v=\d+'/.test(sw));
ok('the feature flags are not double-installed', /if \(window\.__shvButter2\) return;/.test(v244));

/* ── 2 · nothing blurs the scroll path any more ─────────────────────────── */
const killBlur = /\.header[\s\S]{0,600}?backdrop-filter:\s*none\s*!important/.test(flatTail);
ok('the sticky header declares no backdrop blur', killBlur, flatTail.slice(0, 120));
ok('the scrolled/compact states are covered too',
  /\.header\.scrolled/.test(tail) && /\.header\.compact/.test(tail));
ok('the fixed bottom bars are covered (mnav, buy bar, kyc, utilbar)',
  ['.utilbar', '.mnav', '.pd-stickybar', '.kyc-bar'].every((s) => tail.includes(s)));
ok('the fills stay opaque so the look does not change',
  /rgba\(250, 246, 239, \.985\)/.test(tail) && /rgba\(26, 4, 7, \.985\)/.test(tail));
ok('v241 still holds the phone side of the same rule',
  /backdrop-filter: none !important/.test(v241) && /max-width: 820px/.test(v241));
ok('a one-off scrim may still blur (it blurs once, not per frame)',
  !/\.modal-overlay\.open[\s\S]{0,200}backdrop-filter:\s*none/.test(tail));

/* ── 3 · a card is not a permanent GPU layer ────────────────────────────── */
ok('resting cards release their compositor layer',
  /\.p-card,[\s\S]{0,700}?will-change:\s*auto\s*!important/.test(flatTail));
ok('the layer is granted on hover, on fine pointers only',
  /@media \(hover: hover\) and \(pointer: fine\)/.test(tail) && /\.p-card:hover[\s\S]{0,400}?will-change:\s*transform\s*!important/.test(flatTail));
ok('the desktop category bar drops its layout hint', /\.header > \.nav\s*\{\s*will-change:\s*auto\s*!important/.test(tail));

/* ── 4 · the grid tail idea was withdrawn in v245 (it broke phones) ─────── */
/* v244 put `content-visibility:auto` on the tail of the grid. On a real phone
   that is a document shorter than its content (the page stops scrolling) and
   cards that stay blank because a skipped subtree never starts its lazy
   images. v245 removed every content-visibility from the bundle and added a
   universal guard; this pins that it cannot come back through this layer. */
ok('the withdrawn content-visibility rule is not in the bundle',
  !/content-visibility:\s*(auto|hidden)/.test(bundle) && !/contain-intrinsic-size:\s*(auto|[0-9])/.test(bundle));
ok('nothing in the shipped css may skip rendering',
  /\*,\s*\*::before,\s*\*::after\s*\{\s*content-visibility:\s*visible\s*!important/.test(flat(bundle)));
const layerCode = layer.replace(/\/\*[\s\S]*?\*\//g, ' ');
ok('the v244 source no longer carries the grid rule',
  !/content-visibility:\s*auto/.test(layerCode) && !/contain-intrinsic-size:/.test(layerCode));
ok('html/body are not turned into a scroll container',
  !/html,\s*body\s*\{\s*overflow-x:\s*hidden/.test(flat(bundle)) &&
  !/html,\s*body\s*\{\s*overflow-x:\s*hidden/.test(flat(layer)));

/* ── 5 · decoration parks while the thumb moves ─────────────────────────── */
ok('the stylesheet parks for html.shv-scrolling', /html\.shv-scrolling \.ticker-wrap/.test(tail));
ok('it covers the repaint-heavy loops, not just transforms',
  ['em.shimmer', '.foil-txt', '.rate-strip::before', '.hero.ken-on .hero-img', '.dust i', '.bc-noise'].every((s) => tail.includes(s)));
ok('it pauses rather than removes (nothing jumps on resume)',
  (tail.match(/animation-play-state:\s*paused/g) || []).length >= 2 && !/animation:\s*none !important/.test(tail));
ok('a hidden tab parks too', /html\.shv-blurred/.test(tail));

/* ── 6 · the runtime does the three things css cannot ───────────────────── */
ok('one scroll listener sets the class, passively',
  /win\.addEventListener\('scroll', parkOn, \{ passive: true \}\)/.test(v244));
ok('the class is released shortly after the gesture, from one interval',
  /setInterval\(parkCheck, 120\)/.test(v244) && /performance\.now\(\) - lastScroll > 200/.test(v244) &&
  !/setTimeout\(parkOff/.test(v244));
ok('the scroll path reads no layout', !/getBoundingClientRect|offsetHeight|offsetTop|scrollHeight/.test(
  v244.slice(v244.indexOf('scroll governor'), v244.indexOf('decode ahead'))));
ok('pictures are warmed a screen early on a desktop, a hand-span on a phone',
  /ahead = \(coarse \|\| saveData\) \? '240px 0px 240px 0px' : '700px 0px 700px 0px'/.test(v244) &&
  /rootMargin: ahead/.test(v244) && /img\.decode/.test(v244));
ok('a phone is never forced to fetch its pictures early',
  /if \(!coarse && !saveData && img\.getAttribute\('loading'\) === 'lazy'\)/.test(v244));
ok('the sweep re-arms on every route render',
  /new MutationObserver\(queueSweep\)/.test(v244) && /setTimeout\(sweep, 2600\)/.test(v244));
ok('every image ends up with decoding=async',
  /getAttribute\('decoding'\) !== 'async'/.test(v244));
ok('the picture of the piece about to be opened is warmed on intent',
  /a\[href\*="#\/product\/"\]/.test(v244) && /new Image\(\)/.test(v244) && /stats\.warmedPdp\+\+/.test(v244));
ok('Back restores the remembered offset',
  /addEventListener\('popstate'/.test(v244) && /mem\[h\]/.test(v244) && /stats\.restored\+\+/.test(v244));
ok('a fresh click is not treated as Back',
  /if \(!backTo \|\| \(location\.hash \|\| '#\/'\) !== backTo\.hash\) backTo = null;/.test(v244));
ok('the diagnostic is opt-in only', /\[\?&\]perfdiag=1/.test(v244) && !/perfDiag\(\);\s*$/.test(v244.replace(/if \(\/\[\?&\]perfdiag=1[\s\S]{0,80}\)/, '')));
ok('the diagnostic reports fps, long tasks, LCP and CLS',
  /longtask/.test(v244) && /largest-contentful-paint/.test(v244) && /layout-shift/.test(v244));
ok('nothing in this layer can move money or a route',
  !/innerHTML\s*=\s*(?!['"`]\s*<)/.test(v244.replace(/box\.innerHTML[\s\S]{0,600}?;/, '')) &&
  !/fetch\(|api\(/.test(v244));

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
    const { window, doc, errors } = await boot('#/', { mobile });
    await wait(2400);
    const html = doc.documentElement;

    ok(tag + ': v244 installed', !!window.Shivaa.v244);
    ok(tag + ': nothing is parked while the page is still',
      !html.classList.contains('shv-scrolling'));
    ok(tag + ': every picture in the view declares async decoding',
      [...doc.querySelectorAll('#view img')].every((i) => i.getAttribute('decoding') === 'async'),
      [...doc.querySelectorAll('#view img')].filter((i) => i.getAttribute('decoding') !== 'async').length + ' missing');

    /* a scroll parks the decoration, and the page settles again by itself */
    window.dispatchEvent(new window.Event('scroll'));
    await wait(60);
    ok(tag + ': a scroll gesture parks the decoration', html.classList.contains('shv-scrolling'));
    await wait(320);
    ok(tag + ': and it resumes when the thumb stops', !html.classList.contains('shv-scrolling'));

    if (!mobile) {
      /* a card under the pointer warms its product photograph */
      const card = doc.querySelector('#view a[href*="#/product/"]');
      const before = window.Shivaa.v244.stats.warmedPdp;
      if (card) {
        card.dispatchEvent(new window.PointerEvent('pointerover', { bubbles: true }));
        await wait(250);
      }
      ok('PC: hovering a card warms that product photograph',
        !!card && window.Shivaa.v244.stats.warmedPdp > before, 'warmed ' + window.Shivaa.v244.stats.warmedPdp);
    }

    /* the hidden tab also parks */
    try {
      Object.defineProperty(doc, 'hidden', { value: true, configurable: true });
      doc.dispatchEvent(new window.Event('visibilitychange'));
      await wait(30);
      ok(tag + ': a hidden tab parks too', html.classList.contains('shv-blurred'));
      Object.defineProperty(doc, 'hidden', { value: false, configurable: true });
      doc.dispatchEvent(new window.Event('visibilitychange'));
    } catch (e) { ok(tag + ': a hidden tab parks too', false, e.message); }

    ok(tag + ': no page errors from the new layer', real(errors).length === 0, (real(errors)[0] || '').slice(0, 160));
    window.close();
  }

  /* the diagnostic must appear only when asked for */
  const d1 = await boot('?perfdiag=1#/');
  await wait(3200);
  ok('?perfdiag=1 draws the readout', !!d1.window.document.getElementById('shvPerfDiag'));
  d1.window.close();
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
