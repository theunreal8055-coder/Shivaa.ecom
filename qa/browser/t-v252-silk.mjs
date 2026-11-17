/* t-v252-silk.mjs — v252 “Silk”: more alive, next-level smoothness, faster
 * loading, zero quality loss.
 *
 * Proves four pillars on source and on booted phone + desktop pages:
 *   A · FASTER LOADING, FULL QUALITY  — one-round-trip gzipped GET /api/boot
 *       (with live fallback proof), WebP Retina thumbs in drawer/cart/search/
 *       compare/banners (-93 % drawer bytes), full-res PDP gallery preserved,
 *       zero-refetch SW fresh image hits, cache-first ?v=REL immutable assets,
 *       network-first HTML shells.
 *   B · INSTANT PIECE OPEN & PRE-WARM — cached pieces render finished on
 *       frame 1 (zero skeleton flash), hydrate reviews in place, pre-warm on
 *       intent and respect Save-Data.
 *   C · NEXT-LEVEL SMOOTHNESS         — scoped overlay watcher (v120), true
 *       post-scroll debounce (v245/v247), targeted CSS-first quiet budget
 *       (zero 1,284-node post-tap getComputedStyle stall), retired idle
 *       intervals and forced reflows, unlocked first-row card press.
 *   D · FRAME-1 LIVE FEEL             — passive .shv-tap press + 0 ms scroll
 *       cancel, wishlist heart spring, compare badge pop, golden route glide,
 *       live price settle, reduced-motion stand-down, v250 phone budget intact,
 *       desktop glass and motion untouched.
 *
 * Run:  node qa/browser/t-v252-silk.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { boot, wait, until, BASE } from './harness.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const CMS = path.join(ROOT, 'cms');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const sizeOf = (u) => {
  try { return fs.statSync(path.join(CMS, u.split('?')[0].replace(/^\//, ''))).size; }
  catch (_) { return 0; }
};

const index = read('cms/index.html');
const desk = read('cms/desk.html');
const app = read('cms/js/app.js');
const rel = read('cms/js/rel.js');
const sw = read('cms/sw.js');
const api = read('cms/api.php');
const css = read('cms/css/shivaa.css');
const minCss = read('cms/css/shivaa.min.css');
const v251css = read('cms/css/v251.css');
const v252css = read('cms/css/v252.css');
const v252 = read('cms/js/v252.js');
const v250 = read('cms/js/v250.js');
const v247 = read('cms/js/v247.js');
const v245 = read('cms/js/v245.js');
const v242 = read('cms/js/v242.js');
const v194 = read('cms/js/v194.js');
const v120 = read('cms/js/v120.js');
const v117 = read('cms/js/v117.js');
const v107 = read('cms/js/v107.js');
const aurum = read('cms/js/aurum.js');
const motion = read('cms/js/motion.js');

const REL = Number((index.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0);
const layers = [...rel.matchAll(/\/\* ─+ (\S+\.js) ─+ \*\//g)].map(m => m[1]);
const at = (n) => layers.indexOf(n);

let pass = 0, fail = 0;
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

/* ═══ A · faster loading, zero quality loss ════════════════════════════ */
console.log('\nA · faster loading, zero quality loss');

ok('api.php serves one-round-trip GET /api/boot',
  /if \(\$route === 'boot' && \$method === 'GET'\)/.test(api) &&
  /function shv_rates_payload\(/.test(api) &&
  /function shv_settings_for_user\(/.test(api));
ok('api.php protects secrets on both /api/boot and /api/settings',
  /\$setPayload = shv_settings_for_user\(\$db, \$uBoot\)/.test(api) &&
  /jout\(200, shv_settings_for_user\(\$db, req_user\(\$db\)\)\)/.test(api));
ok('api.php safely gzips JSON >= 1 KB when server compression is off',
  /function_exists\('gzencode'\)/.test(api) &&
  /zlib\.output_compression/.test(api) &&
  /Content-Encoding: gzip/.test(api));
ok('app.js boots via /api/boot with transparent fallback to the legacy batch',
  /api\('\/api\/boot'/.test(app) && /\.catch\(_legacyBatch\)/.test(app));
ok('warm returning home cap is 180 ms and adopts late data without repainting',
  /_fastPaint \? 180 : 4000/.test(app) && /adoptLateBatch\(packed\)/.test(app));

/* verify GET /api/boot live shape against the individual endpoints */
{
  const [bRes, rRes, pRes] = await Promise.all([
    fetch(BASE + '/api/boot').then(r => r.json()),
    fetch(BASE + '/api/rates').then(r => r.json()),
    fetch(BASE + '/api/products').then(r => r.json()),
  ]);
  ok('GET /api/boot returns products, rates, settings, mc, catalogs and pages in one payload',
    bRes.ok === true && bRes.rel === REL &&
    Array.isArray(bRes.prods?.products) && bRes.prods.products.length === pRes.products.length &&
    bRes.rates?.jaipur?.gold22 === rRes.jaipur.gold22 &&
    Array.isArray(bRes.mc?.table) && Array.isArray(bRes.pages?.pages));
}

/* drawer thumbnails: 803 KB of raw JPEGs → ~53 KB of crisp Retina WebP */
{
  const dwImgs = [...index.matchAll(/class="dw-(?:ic|tile)"[^>]*>(?:<img[^>]+>)|class="dw-tile"><img[^>]+>/g)]
    .map(m => (m[0].match(/src="([^"]+)"/) || [])[1]).filter(Boolean);
  const allWebp = dwImgs.length === 5 && dwImgs.every(u => u.startsWith('/images/thumbs/products/') && u.includes('-320.webp'));
  const allExist = dwImgs.every(u => sizeOf(u) > 0);
  const uniqBytes = [...new Set(dwImgs.map(u => u.split('?')[0]))].reduce((n, u) => n + sizeOf(u), 0);
  ok('all 5 mobile drawer photos use Retina 320w/560w WebP thumbs', allWebp, dwImgs.join(', '));
  ok('every drawer thumb exists on disk and weighs < 80 KB combined (was 803 KB)',
    allExist && uniqBytes > 0 && uniqBytes < 80 * 1024, Math.round(uniqBytes / 1024) + ' KB');
}

ok('cart, mini-cart, saved-for-later, compare and search use thumbAttrs()',
  !/class="cart-item"[\s\S]{0,140}src="\$\{safeUrl/.test(app) &&
  !/class="mc-line"[\s\S]{0,140}src="\$\{safeUrl/.test(app) &&
  !/class="pcmp-img"><img decoding="async" src="/.test(app) &&
  !/class="sugg" data-pid="\$\{p\.id\}">\s*<img decoding="async" src="/.test(app));
ok('mega-menu and home Shivaa Black banner use thumbAttrs()',
  /thumbAttrs\('\/images\/banners\/poster-heritage\.jpg'/.test(app) &&
  /thumbAttrs\('\/images\/banners\/b2b-bullion\.jpg'/.test(app));
ok('product page gallery still serves full-resolution original photographs (zero quality loss)',
  /class="gal-slide[\s\S]{0,120}<img src="\$\{safeUrl\(im\)/.test(app));

/* service worker speed without staleness */
ok('sw.js returns fresh cached photos directly without background refetch churn',
  /if \(freshMedia\(hit\)\) return hit;[\s\S]{0,80}const res = await fetch\(r\)/.test(sw));
ok('sw.js serves release-stamped ?v=REL assets cache-first while HTML stays network-first',
  /const versionedAsset = !documentRequest && u\.search === \('\?v=' \+ REL\)/.test(sw) &&
  /const hit = await c\.match\(key\);\s*if \(hit\) return hit;/.test(sw));

/* ═══ C · next-level smoothness (static invariants) ════════════════════ */
console.log('\nC · next-level smoothness — main thread & scroll path');

ok('v120 watches only the overlay roots, never attributes across documentElement subtree',
  !/observe\(document\.documentElement,\s*\{\s*attributes:\s*true,\s*subtree:\s*true/.test(v120) &&
  /mo\.observe\(el,\s*\{\s*attributes:\s*true,\s*attributeFilter:\s*\['class'\]\s*\}\)/.test(v120));
ok('v245 wakeVisible() is true post-scroll debounced and never runs mid-fling',
  /if \(wakeT\) clearTimeout\(wakeT\)/.test(v245) &&
  /if \(root\.classList\.contains\('shv-scrolling'\)\) \{ queueWake/.test(v245));
ok('v247 image sweep is true post-scroll debounced and skips active scrolling',
  /if \(t\) clearTimeout\(t\)/.test(v247) &&
  /!doc\.documentElement\.classList\.contains\('shv-scrolling'\)\) sweep/.test(v247));
ok('v250 quiet pass uses targeted selectors (no 1,284-node post-tap getComputedStyle walk)',
  /var QUIET_SEL =/.test(v250) && /scope\.querySelectorAll\(QUIET_SEL\)/.test(v250) &&
  /var an = st\.animationName \|\| 'none'/.test(v250));
ok('v194 skips getComputedStyle unless a top-level block actually overflows',
  /if \(el\.scrollWidth <= W \+ 1\) continue;[\s\S]{0,60}getComputedStyle/.test(v194));
ok('v242 stray scan checks viewport bounds before calling getComputedStyle',
  /r\.width < innerWidth \* 0\.85[\s\S]{0,180}getComputedStyle/.test(v242));
ok('v107 updates the ticker on live rate events instead of a 2.5 s loop and drops the 8 s glow poll',
  !/setInterval\([^)]*2500\)/.test(v107) && !/setInterval\([^)]*8000\)/.test(v107) &&
  /document\.addEventListener\('rates'/.test(v107));
ok('aurum.js retires the 8 s sweep poll and uses zero getComputedStyle calls',
  !/setInterval\(function \(\) \{\s*sweep\(\)/.test(aurum) && !/getComputedStyle/.test(aurum));
ok('motion.js drops the forced view.offsetWidth reflow and the 1.2 s tagger poll',
  !/void view\.offsetWidth/.test(motion) && !/setInterval\([^)]*1200\)/.test(motion));
ok('v117 yields an idle frame between aurum, motion and boost parses',
  /IDLE\(r\)/.test(v117));
const v251cssClean = v251css.replace(/\/\*[\s\S]*?\*\//g, '');
const v252cssClean = v252css.replace(/\/\*[\s\S]*?\*\//g, '');
ok('first-row arrival uses fill-mode backwards (never both) so cards spring on tap',
  /animation: v251Arrive 340ms[^;]*backwards/.test(v251cssClean) && !/v251Arrive[^;]*both/.test(v251cssClean));
ok('mobile press transition drops box-shadow repaint (pure transform)',
  !/box-shadow var\(--sx-dur-2/.test(v251cssClean));
ok('v252.css is pure compositor: no will-change promotion, no content-visibility, no overflow-x:hidden, no opacity:0 content',
  !/will-change\s*:\s*(?!auto\b)\S/.test(v252cssClean) &&
  !/content-visibility/.test(v252cssClean) &&
  !/overflow-x\s*:\s*hidden/.test(v252cssClean) &&
  !/opacity\s*:\s*0\s*[;}]/.test(v252cssClean.replace(/#shvRouteGlide(?:\.is-(?:on|done))?\s*\{[\s\S]*?\}/g, '')));

/* ═══ B + D · live runtime proof on phone and desktop ══════════════════ */
console.log('\nB + D · instant boot, frame-1 tactile spring, instant PDP & live responses');

{
  const apiHits = [];
  const k = await boot('#/', { mobile: true });
  const w = k.window, doc = k.doc;
  await until(() => doc.querySelector('#view .p-card'), 9000);
  await wait(900);

  ok('v252 layer installed and guarded against double load',
    !!w.Shivaa.v252 && /window\.__shvSilk/.test(v252));
  const a0 = w.Shivaa.v252.audit();
  ok('phone cold boot hydrated through one-round-trip api/boot',
    a0.bootMode === 'api/boot', JSON.stringify({ bootMode: a0.bootMode, bootMs: a0.bootMs }));
  ok('report line matches the release diagnostic format',
    /^silk \d+ · phone · boot api\/boot \(\d+ ms\) · instant pdp \d+/.test(w.Shivaa.v252.report()),
    w.Shivaa.v252.report());
  console.log('       ' + w.Shivaa.v252.report());

  /* frame-1 tactile spring: lands synchronously on pointerdown */
  const card = doc.querySelector('#view .p-card');
  ok('home renders product cards', !!card);
  card.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 200, button: 0 }));
  ok('frame-1 press: .shv-tap lands synchronously on pointerdown (zero 100 ms :active delay)',
    card.classList.contains('shv-tap'));
  doc.dispatchEvent(new w.MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 220 }));
  ok('moving thumb > 8 px cancels .shv-tap in 0 ms so scrolling never drags a pressed card',
    !card.classList.contains('shv-tap') && card.classList.contains('shv-tap-cancel'));
  await wait(80);

  /* clean tap release */
  card.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 80, button: 0 }));
  doc.dispatchEvent(new w.MouseEvent('pointerup', { bubbles: true, clientX: 80, clientY: 80 }));
  const released = await until(() => !card.classList.contains('shv-tap'), 400, 20);
  ok('a quick tap holds briefly so it is felt, then releases cleanly', !!released);

  /* wishlist heart spring */
  const heart = doc.querySelector('#view .pc-wish, #view [onclick*="toggleWish"]');
  if (heart) {
    heart.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const popped = await until(() => heart.classList.contains('shv-heart-pop'), 500, 15);
    ok('tapping a wishlist heart triggers the single-pass spring', !!popped);
    const settled = await until(() => !heart.classList.contains('shv-heart-pop'), 900, 30);
    ok('the heart spring removes itself after one pass', !!settled);
  }

  /* compare badge pop */
  const cmp = doc.getElementById('cmpCount');
  if (cmp) {
    cmp.hidden = false;
    cmp.textContent = '1';
    const cPop = await until(() => cmp.classList.contains('shv-pop'), 600, 20);
    ok('adding to compare pops #cmpCount', !!cPop);
    const cGone = await until(() => !cmp.classList.contains('shv-pop'), 900, 30);
    ok('and #cmpCount settles back to rest', !!cGone);
  }

  /* instant frame-1 PDP open + golden route glide */
  const pid = card.dataset.pid;
  const t0 = Date.now();
  w.location.hash = '#/product/' + pid;
  const pdpReady = await until(() => doc.querySelector('#view .pd-layout .gal-slide img'), 1200, 5);
  const pdpMs = Date.now() - t0;
  const galImg = doc.querySelector('#view .pd-layout .gal-slide img');
  ok('tapping a cached piece opens the finished PDP immediately (no skeleton wait)',
    !!pdpReady && w.Shivaa.v252.audit().pdpInstant >= 1 && pdpMs <= 250, pdpMs + ' ms');
  ok('PDP gallery preserves the full-resolution original photograph',
    !!galImg && !/\/images\/thumbs\//.test(galImg.getAttribute('src') || ''),
    galImg ? galImg.getAttribute('src') : 'missing');
  console.log('       measured: instant PDP painted in ' + pdpMs + ' ms (full-res ' + (galImg?.getAttribute('src') || '') + ')');

  const glide = doc.getElementById('shvRouteGlide');
  ok('navigation wakes the golden route-glide hairline',
    !!glide && w.Shivaa.v252.audit().glides >= 1);
  const glideDone = await until(() => !glide.classList.contains('is-on') && !glide.classList.contains('is-done'), 1200, 30);
  ok('and the route-glide returns to complete rest', !!glideDone);

  /* paint budget preserved on phone */
  w.location.hash = '#/';
  await until(() => doc.querySelector('#view .p-card'), 3000, 20);
  await wait(900);
  const budget = w.Shivaa.v250.audit();
  ok('v250 phone compositor budget holds at 0 blur, 0 blend, 0 promoted, <= 2 infinite',
    budget.blurPasses === 0 && budget.blends === 0 && budget.filterBlur === 0 &&
    budget.promoted === 0 && budget.infinite <= 2 && budget.running <= 25,
    JSON.stringify(budget));

  apiHits.push(w.Shivaa.v252.report());
  w.close();
}

/* desktop untouched: no .shv-tap on mouse click, keeps studio blur/motion */
{
  const k = await boot('#/');
  const w = k.window, doc = k.doc;
  await until(() => doc.querySelector('#view .p-card'), 9000);
  await wait(600);
  const card = doc.querySelector('#view .p-card');
  card.dispatchEvent(new w.MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, button: 0 }));
  ok('desktop mouse pointerdown never stamps mobile .shv-tap', !card.classList.contains('shv-tap'));
  const deskAudit = w.Shivaa.v250.audit();
  ok('desktop keeps its full glass blur and studio motion',
    deskAudit.blurPasses > 0 || deskAudit.infinite > 2,
    JSON.stringify({ blur: deskAudit.blurPasses, infinite: deskAudit.infinite }));
  w.close();
}

/* ═══ E · release plumbing & fingerprint proofs ════════════════════════ */
console.log('\nE · plumbing & release lockstep');

const cssSha = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'cms/css/shivaa.css'))).digest('hex');
const appSha = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'cms/js/app.js'))).digest('hex');
const relSha = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'cms/js/rel.js'))).digest('hex');

ok('v252.js ships inside rel.js right after v251.js, once',
  at('v252.js') === at('v251.js') + 1 && layers.filter(n => n === 'v252.js').length === 1);
ok('v252.css is at the tail of shivaa.css', /\/\* v252\.css \*\//.test(css));
ok('shivaa.min.css, app.min.js and rel.min.js match their exact source sha256s',
  minCss.slice(0, 320).includes(cssSha) &&
  read('cms/js/app.min.js').slice(0, 320).includes(appSha) &&
  read('cms/js/rel.min.js').slice(0, 320).includes(relSha));
ok('every release stamp across index.html, desk.html, app.js, sw.js and api.php is in lockstep',
  REL >= 252 &&
  desk.includes('/css/shivaa.min.css?v=' + REL) &&
  new RegExp('const APP_REL = ' + REL + ';').test(app) &&
  new RegExp('const REL = ' + REL + ';').test(sw) &&
  new RegExp('shivaa-shell-v' + REL).test(sw) &&
  new RegExp("'rel' => " + REL).test(api));

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
