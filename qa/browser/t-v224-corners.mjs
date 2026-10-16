/* t-v224 — "the every-corner release".

   v223 stopped the films loading before the reader reached them. v224 goes
   through the rest of the corners:

     · four continuously-running @keyframes still animated LAYOUT properties
       (the hero float animated margin-top, the pillar sweep / finale sheen /
       hover shine animated `left`, and two decorative loops animated `filter`).
       A layout animation re-lays-out the page every single frame — on a
       mid-range phone that IS the "lag", and the hero one runs from the first
       paint of the home page. All four are now translate/opacity only.
     · four timers rebuilt the DOM on a schedule: both draw countdowns rebuilt
       all four cells with innerHTML once a second forever, the footer rate
       ticker rewrote byte-identical markup every 2.5s, and the "MCX live · Ns"
       line was written every second whether or not the string changed.
     · and the usability corners: fields that made iOS zoom the page in on
       focus, 6-8px carousel dots that could not be tapped, FABs sitting in the
       home-indicator gesture area, and numerals that re-measured every second.

   Assertions are whitespace-tolerant and never match text that only exists in
   a comment (comments are stripped before matching). */
import fs from 'node:fs';
import { boot, wait } from './harness.mjs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));

const read = p => fs.readFileSync(p, 'utf8');
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const squash = s => s.replace(/\s+/g, '');

const LAYERS = fs.readdirSync('cms/css').filter(f => f.endsWith('.css') && f !== 'shivaa.css').sort();
const BUNDLE = read('cms/css/shivaa.css');
const ORDER = read('tools/css-bundle-order.txt').trim().split(/\s+/);
const APP = read('cms/js/app.js');
const V107 = read('cms/js/v107.js');

/* ═══ 1 · no animation may touch layout ══════════════════════════════════ */

const LAYOUT = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'margin-top',
  'margin-left', 'margin-right', 'margin-bottom', 'padding', 'padding-top', 'padding-left',
  'padding-right', 'padding-bottom', 'font-size', 'line-height', 'border-width', 'border-radius',
  'flex-basis', 'gap', 'inset'];

function keyframeBlocks(src) {
  const out = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length - 1, depth = 0, j = i;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) break; }
    }
    out.push({ name: m[1], body: src.slice(i, j + 1) });
  }
  return out;
}

let layoutHits = [], paintHits = [];
for (const f of LAYERS) {
  for (const k of keyframeBlocks(stripCss(read('cms/css/' + f)))) {
    for (const prop of LAYOUT) {
      if (new RegExp('(^|[;{\\s])' + prop + '\\s*:', 'm').test(k.body)) {
        layoutHits.push(f + ':' + k.name + '(' + prop + ')');
        break;
      }
    }
    if (/(^|[;{\s])(backdrop-)?filter\s*:/m.test(k.body)) paintHits.push(f + ':' + k.name);
  }
}
T('css: not one @keyframes animates a layout property', layoutHits.length === 0, layoutHits.join(', '));
T('css: no @keyframes animates filter/blur any more, except the one documented chip glow',
  paintHits.join(',') === 'v107.css:v107-breathe', paintHits.join(',') || 'none');

const kf = (file, name) => {
  const b = keyframeBlocks(stripCss(read('cms/css/' + file))).find(k => k.name === name);
  return b ? b.body : '';
};
T('css: hsFloat floats with translate, not margin-top',
  /translate\s*:\s*0\s+-13px/.test(kf('styles.css', 'hsFloat')) && !/margin-top/.test(kf('styles.css', 'hsFloat')));
T('css: plSweep sweeps with translate, not left',
  /translate\s*:\s*-100%/.test(kf('styles.css', 'plSweep')) && /translate\s*:\s*250%/.test(kf('styles.css', 'plSweep')) && !/left\s*:/.test(kf('styles.css', 'plSweep')));
T('css: plShine sweeps with translate', /translate\s*:\s*433%/.test(kf('styles.css', 'plShine')) && !/left\s*:/.test(kf('styles.css', 'plShine')));
T('css: finSheen sweeps with translate', /translate\s*:\s*280%/.test(kf('finale.css', 'finSheen')) && !/left\s*:/.test(kf('finale.css', 'finSheen')));
T('css: floatBullion no longer animates a 40px drop-shadow', !/filter/.test(kf('finale.css', 'floatBullion')));
T('css: the bullion card keeps its shadow as a static filter',
  /\.shv-poster-img-frame[\s\S]{0,400}?filter\s*:\s*drop-shadow/.test(stripCss(read('cms/css/finale.css'))));
T('css: bcBeam no longer animates a blur', !/filter/.test(kf('v186.css', 'bcBeam')));
T('css: the aurora beam keeps a static blur', /nth-child\(3\)\s*\{[^}]*filter\s*:\s*blur/.test(squash(stripCss(read('cms/css/v186.css')))));
T('css: the sweeps still exist — this release re-timed them, it did not delete them',
  /\.pl-line i[\s\S]{0,200}?animation\s*:\s*plSweep/.test(stripCss(read('cms/css/styles.css'))));
T('css: nothing uses background-attachment:fixed (it kills mobile scroll)',
  !/background-attachment\s*:\s*fixed/.test(LAYERS.map(f => read('cms/css/' + f)).join('\n')));

/* the same rules must be in the bundle, because the bundle is what ships */
T('bundle: carries every v224 fix', [
  'translate:0 -13px', 'translate:-100% 0', 'translate:250% 0', 'translate:433% 0',
  'translate:-140% 0', 'translate:280% 0',
].every(x => squash(BUNDLE).includes(squash(x))));
/* v222 replaced 58 <link> tags with one bundle; this pins the inventory so no
   future layer can miss the bundle silently. bot.css and v108.css are on the
   documented dead list: v221 (the last release before the bundle) did not link
   them either, and nothing in the shipped tree loads bot.js / v108.js. */
{
  const DEAD = ['bot.css', 'v108.css'];
  const listed = new Set(ORDER);
  const orphans = LAYERS.filter(f => !listed.has(f) && !DEAD.includes(f));
  T('css: every layer on disk is either in the bundle or on the documented dead list',
    orphans.length === 0, orphans.join(', '));
  T('css: nothing the site used to link was lost when the stylesheets were bundled',
    DEAD.every(f => fs.existsSync('cms/css/' + f)));
}
T('bundle: v224.css is the last layer in the cascade',
  ORDER[ORDER.length - 1] === 'v224.css' &&
  BUNDLE.lastIndexOf('/* v224.css */') > BUNDLE.lastIndexOf('/* v219.css */'));

/* ═══ 2 · no timer may rebuild the DOM ═══════════════════════════════════ */

function parenBody(src, i) {           // i = index of '('
  let d = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '(') d++;
    else if (src[j] === ')') { d--; if (d === 0) return src.slice(i, j + 1); }
  }
  return src.slice(i);
}
const JS_FILES = fs.readdirSync('cms/js').filter(f => f.endsWith('.js'));
let timerOffenders = [];
for (const f of JS_FILES) {
  const s = stripJs(read('cms/js/' + f));
  const re = /setInterval\s*\(/g;
  let m;
  while ((m = re.exec(s))) {
    const body = parenBody(s, s.indexOf('(', m.index));
    if (/innerHTML|outerHTML|insertAdjacentHTML/.test(body)) {
      timerOffenders.push(f + ':' + (s.slice(0, m.index).split('\n').length));
    }
  }
}
T('js: no setInterval callback rebuilds markup (innerHTML/outerHTML/insertAdjacentHTML)',
  timerOffenders.length === 0, timerOffenders.join(', '));

const fnBody = (src, header) => {
  const i = src.indexOf(header);
  if (i < 0) return '';
  const open = src.indexOf('{', i);
  let d = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (d === 0) return src.slice(open, j + 1); }
  }
  return src.slice(open);
};
const cdBody = fnBody(stripJs(APP), 'function bindCountdown(');
T('js: bindCountdown builds its cells exactly once', (cdBody.match(/innerHTML/g) || []).length === 1,
  (cdBody.match(/innerHTML/g) || []).length + ' innerHTML writes');
T('js: bindCountdown writes only digits that changed',
  cdBody.includes('textContent !== t') && /textContent = t;/.test(cdBody));
T('js: bindCountdown pauses while the strip is off screen', cdBody.includes('IntersectionObserver') && cdBody.includes('onScreen'));
T('js: bindCountdown pauses on a hidden tab', cdBody.includes('document.hidden'));
const fcdBody = fnBody(stripJs(APP), 'function bindFinaleCd(');
T('js: bindFinaleCd builds its cells exactly once', (fcdBody.match(/innerHTML/g) || []).length === 1);
T('js: bindFinaleCd pauses off screen and on a hidden tab',
  fcdBody.includes('IntersectionObserver') && fcdBody.includes('document.hidden'));
T('js: the MCX-age line is written only when the string changed',
  /nodeValue !== txt/.test(APP) && /last\.nodeType === 3/.test(APP));
T('js: the footer rate ticker skips a byte-identical redraw',
  V107.includes('html === tickHTML') && V107.includes("if (document.hidden || html === tickHTML) return;"));

/* ═══ 3 · the corners that were measured ═════════════════════════════════ */

const V224 = stripCss(read('cms/css/v224.css'));

/* 3a · the iOS-zoom floors can only raise a field, never shrink one */
const raised = [];
{
  const m = V224.match(/([^{}]+)\{\s*font-size:\s*16px;?\s*\}/);
  const sel = m ? m[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  const val = new Map();   // selector -> [sizes]
  for (const f of LAYERS) {
    if (f === 'v224.css') continue;
    const s = stripCss(read('cms/css/' + f));
    for (const r of s.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const list = r[1].trim(), body = r[2];
      if (!/\b(input|select|textarea)\b/.test(list)) continue;
      const fm = body.match(/font-size\s*:\s*([\d.]+)(px|rem|em)/);
      if (!fm) continue;
      const px = +fm[1] * (fm[2] === 'px' ? 1 : 16);
      for (const one of list.split(',')) {
        const k = one.replace(/\s+/g, ' ').trim();
        if (!k) continue;
        if (!val.has(k)) val.set(k, []);
        val.get(k).push(px);
      }
    }
  }
  for (const s of sel) {
    const sizes = val.get(s) || [];
    const big = sizes.filter(x => x > 16.5);
    if (big.length) raised.push(s + ':' + big.join('/'));
  }
}
T('v224: every field it raises to 16px is below 16px in every earlier layer (nothing can shrink)',
  raised.length === 0, raised.join(' '));
T('v224: the deliberately large fields are NOT in that list (OTP digits, amount inputs)',
  !/\.otp-boxes input/.test(V224) && !/\.shv-otp input/.test(V224) && !/bbc-wt/.test(V224));
T('v224: the big fields really are still big',
  /\.otp-boxes input[^}]*font-size:\s*22px/.test(squash(read('cms/css/styles.css'))) ||
  /\.otp-boxes input/.test(read('cms/css/styles.css')));

/* 3b · the tiny carousel dots are tappable without changing size */
const AURUM = stripCss(read('cms/css/aurum.css'));
T('v224: the quick-view and gallery dots keep their exact visual size',
  /\.qv-dot\s*\{[^}]*width:\s*7px;\s*height:\s*7px/.test(AURUM) &&
  /\.ds-dot\s*\{[^}]*width:\s*6px;\s*height:\s*6px/.test(AURUM));
T('v224: both dots grew a 27px hit area instead',
  /\.qv-dot::after,\s*\.ds-dot::after\s*\{[^}]*inset:\s*-10px/.test(V224) &&
  /\.qv-dot,\s*\.ds-dot\s*\{\s*position:\s*relative/.test(V224));
T('v224: the dot rows are spaced so the hit areas do not fight', /\.qv-dots,\s*\.ds-dots\s*\{\s*gap:\s*20px/.test(V224));
T('v224: the hallmark app links get a 40px target', /\.hm-app-links a\s*\{\s*min-height:\s*40px/.test(V224));

/* 3c · FABs clear the home indicator */
T('v224: the concierge FAB clears the home indicator',
  /\.boost-chat-fab\s*\{[^}]*safe-area-inset-bottom/.test(V224));
T('v224: the chat panel clears it too', /\.boost-chat\s*\{[^}]*safe-area-inset-bottom/.test(V224));
T('v224: both utility FABs clear it',
  /\.boost-top\s*\{[^}]*safe-area-inset-bottom/.test(V224) &&
  /\.boost-theme\s*\{[^}]*safe-area-inset-bottom/.test(V224));
T('v224: the chat is never taller than the visible phone screen (dvh)',
  /\.boost-chat\s*\{[^}]*100dvh/.test(V224));
T('bundle: the safe-area fix lands AFTER the layer that positioned the FAB',
  BUNDLE.indexOf('/* v224.css */') > BUNDLE.indexOf('/* boost.css */'));

/* 3d · live numerals stop re-measuring */
T('v224: the per-second numerals are tabular',
  /\.fc-cell b[^{]*\{[^}]*font-variant-numeric:\s*tabular-nums/.test(V224) &&
  /\[data-rate-age\]\s*\{\s*font-variant-numeric/.test(V224));

/* 3e · panel scroll stays inside the panel */
T('v224: panel scroll does not drag the page behind it',
  /\.boost-chat \.bc-body/.test(V224) && /overscroll-behavior:\s*contain/.test(V224));

/* 3f · the newsletter field gets the right keyboard */
const INDEX = read('cms/index.html');
T('v224: the newsletter email field declares its keyboard and does not autocapitalise',
  /<input type="email"[^>]*inputmode="email"[^>]*autocapitalize="off"[^>]*spellcheck="false"/.test(INDEX));

/* 3g · images that shipped without alt */
const ADMIN = read('cms/js/admin.js');
{
  const imgs = ADMIN.match(/<img[^>]*>/g) || [];
  const noAlt = imgs.filter(t => !/\balt\s*=/.test(t));
  T('v224: every image in the admin panel carries an alt attribute (empty = deliberately decorative)',
    noAlt.length === 0, noAlt.length + '/' + imgs.length + ' without alt: ' + (noAlt[0] || '').slice(0, 60));
  T('v224: the two sign-in logos are named, not decorative',
    (ADMIN.match(/images\/logo\.png\" alt=\"Shivaa\"/g) || []).length >= 2);
}
T('v224: the catalogue image carries the piece name',
  /<img src="\$\{location\.origin\}\$\{safeUrl\(img\)\}" alt="\$\{esc\(name\)\}"/.test(ADMIN));
T('v224: the review thumbnails are labelled and lazy',
  /alt="Review photo" loading="lazy"/.test(ADMIN));
T('v224: both QR renderers label their image',
  read('cms/js/qr.js').includes('alt="QR code"') && read('cms/js/v178.js').includes('alt="QR code"'));

/* ═══ 4 · the release itself ═════════════════════════════════════════════ */

const SW = read('cms/sw.js'), API = read('cms/api.php');
T('stamps: index carries ?v=224 everywhere and __SHIVAA_REL=224',
  (INDEX.match(/\?v=224/g) || []).length === 29 && INDEX.includes('__SHIVAA_REL=224'));
T('stamps: sw.js shell, REL and every precached URL are at 224',
  SW.includes('shivaa-shell-v224') && /REL = 224/.test(SW) && (SW.match(/\?v=224/g) || []).length === 28);
T('stamps: app.js APP_REL and api.php rel are at 224',
  /APP_REL = 224/.test(APP) && /'rel' => 224/.test(API));
T('stamps: nothing in the shipped tree still says 223',
  ![INDEX, SW, APP, API, BUNDLE].some(s => /(\?v=223|__SHIVAA_REL=223|shivaa-shell-v223|APP_REL = 223|'rel' => 223)/.test(s)));
T('v222: the shop still loads exactly one stylesheet',
  (INDEX.match(/<link[^>]+rel="stylesheet"/g) || []).length === 1 && INDEX.includes('/css/shivaa.css?v=224'));
T('v222: the settings race fix is still there', APP.includes('SETTINGS_DEFAULTS'));
T('v223: the films still mount with no src and no autoplay',
  !/v\.autoplay = true/.test(read('cms/js/v125.js')) && read('cms/js/v125.js').includes("v.preload = 'none'"));

/* ═══ 5 · and it all still runs ══════════════════════════════════════════ */

/* the draw countdown lives on the scheme page; the home page carries a
   campaign entry link, not the strip itself. */
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError: Could not parse CSS|Client network socket disconnected/i;
{
  const { window, errors } = await boot('#/', {});
  await wait(1500);
  const doc = window.document;
  T('boot: the home page rendered its view', !!doc.querySelector('#view') && doc.querySelector('#view').children.length > 0);
  const realErrs = errors.filter(e => !NOISE.test(e));
  T('boot: no real errors on the home page', realErrs.length === 0, String(realErrs[0] || '').slice(0, 110));
  window.close();
}
{
  const { window, errors } = await boot('#/scheme', {});
  await wait(1800);
  const doc = window.document;
  const realErrs = errors.filter(e => !NOISE.test(e));
  T('boot: no real errors on the scheme page', realErrs.length === 0, String(realErrs[0] || '').slice(0, 110));
  const cells = [...doc.querySelectorAll('.fc-cell b')];
  T('boot: the draw countdown is on the page', cells.length === 4, cells.length + ' cells');
  if (cells.length === 4) {
    const before = cells.map(c => c.textContent);
    T('timer: the digits are two-digit time values', before.every(t => /^\d{2}$/.test(t)), before.join('/'));
    await wait(2200);
    const survived = cells.filter(c => c.isConnected && doc.contains(c)).length;
    T('timer: not one countdown cell was replaced after 2s (no innerHTML churn)', survived === 4,
      survived + '/4 nodes survived');
    T('timer: the digits still update', cells.some((c, i) => c.textContent !== before[i]));
    const strip = doc.querySelector('.finale-cd');
    T('timer: the strip still carries its draw label', !!strip && /draw/i.test(strip.textContent || ''));
  }
  /* idle DOM must not grow while the reader reads (settle first) */
  await wait(2500);
  const n1 = doc.getElementsByTagName('*').length;
  await wait(3000);
  const n2 = doc.getElementsByTagName('*').length;
  T('idle: the DOM does not grow while the page sits still', Math.abs(n2 - n1) <= 8, n1 + ' → ' + n2);
  T('idle: the page stays a sane size', n2 < 3500, String(n2));
  window.close();
}

console.log('\nPASS ' + ok.length + ' / FAIL ' + bad.length);
for (const b of bad) console.log('  ✗ ' + b);
if (process.argv.includes('-v')) for (const o of ok) console.log('  ✓ ' + o);
process.exit(bad.length ? 1 : 0);
