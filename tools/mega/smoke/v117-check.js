/* SHIVAA · v117 "butter" check
   ─────────────────────────────────────────────────────────────────────────
   Proves the v117 release:
     A  carousel   tapping dots/arrows can no longer scroll the page
                   (pointerdown preventDefault) while the tap still works
     B  transform  the deck translates via GPU-composited translate3d
     C  fonts      the 354 KB base64 stylesheet is now file-based woff2
     D  shell      index.html splits render-blocking vs deferred CSS;
                   aurum/motion/boost leave the critical path; sw.js
                   precache matches what the shell requests
     E  boot       the API batch has a hard cap (no eternal splash) and
                   rates ride the same parallel batch (no serial round)

   Run from the repo root:  node tools/mega/smoke/v117-check.js
   The master regression suite is still tools/mega/smoke/v113b-check.js.
*/
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));

const results = [];
/* v150 · numeric stamp floors — never ranges: 150 must pass a v117 pin the same way 149 did. */
const st = (src, re) => { const m = String(src).match(re); return m ? +m[1] : 0; };

const ok = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail && !cond ? '\n          ' + detail : ''));
};

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(CMS, url);
  if (url === '/' || url.endsWith('/')) file = path.join(CMS, 'index.html');
  if (!path.resolve(file).startsWith(path.resolve(CMS))) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 8000, step = 60) => {
  const t0 = Date.now();
  for (;;) { try { if (fn()) return true; } catch (e) {} if (Date.now() - t0 > ms) return false; await sleep(step); }
};

(async () => {
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
  const v117Js = fs.readFileSync(path.join(CMS, 'js/v117.js'), 'utf8');
  const swJs = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
  const fontsCss = fs.readFileSync(path.join(CMS, 'css/fonts.css'), 'utf8');
  const v117Css = fs.readFileSync(path.join(CMS, 'css/v117.css'), 'utf8');

  /* ═══ A · static gates ═══════════════════════════════════════════════ */
  console.log('\nSHIVAA v117 "butter" check\n');
  console.log('· static gates');
  ok('release handshake remains at v117 or newer on both sides',
    st(html, /__SHIVAA_REL\s*=\s*(\d+)/) >= 117 && st(appJs, /APP_REL\s*=\s*(\d+)/) >= 117);

  ok('fonts.css is file-based (no base64 payload)',
    !/base64,/.test(fontsCss) && /url\('\/fonts\//.test(fontsCss));
  /* v166 fix-forward: the @font-face src URLs now carry the release stamp
     (?v=166 — a font is served with a 365-day freshness window), so the check
     strips the query before touching the file system. */
  const fontRefs = [...fontsCss.matchAll(/url\('(\/fonts\/[^']+)'\)/g)].map(m => m[1]);
  const fontFiles = [...new Set(fontRefs.map(u => u.split('?')[0]))];
  ok('every @font-face file exists on disk (' + fontFiles.length + ' files)',
    fontFiles.length >= 3 && fontFiles.every(f => fs.existsSync(path.join(CMS, f))));
  ok('font bytes on disk are the unique-font set (≤ 90 KB, was ~265 KB)',
    fontFiles.reduce((a, f) => a + fs.statSync(path.join(CMS, f)).size, 0) < 90 * 1024,
    fontFiles.reduce((a, f) => a + fs.statSync(path.join(CMS, f)).size, 0) + ' bytes');

  const fontUrls = [...html.matchAll(/rel="preload" href="(\/fonts\/[^"]+)"/g)].map(m => m[1]);
  ok('index.html preloads the webfonts (at the release stamp the CSS asks for)',
    fontUrls.length === fontFiles.length && fontUrls.every(u => /^\/fonts\/[a-z0-9-]+\.woff2\?v=\d+$/.test(u)),
    fontUrls.join(', '));

  const htmlNoNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  const blockingCss = [...htmlNoNoscript.matchAll(/<link rel="stylesheet" href="(\/css\/[^"]+)"/g)].map(m => m[1]);
  const deferredCss = [...html.matchAll(/<link rel="preload" as="style" href="(\/css\/[^"]+)"/g)].map(m => m[1]);
  ok('render-blocking CSS is the shell set only (' + blockingCss.length + ' files)',
    blockingCss.some(h => h.includes('styles.css')) && blockingCss.some(h => h.includes('fonts.css')) &&
    !blockingCss.some(h => /aurum|motion|boost|trust|hallmark|v107\.css/.test(h)));
  ok('route-scoped + ambience CSS is deferred (' + deferredCss.length + ' sheets)',
    ['hallmark', 'trust', 'motion', 'aurum', 'v107.css', 'boost'].every(n => deferredCss.some(h => h.includes(n))));
  ok('every deferred sheet has a <noscript> fallback',
    deferredCss.every(h => (html.match(new RegExp('<noscript>[\\s\\S]*?' + h.replace(/[.?]/g, '\\$&'))) || false) ||
      /<noscript>\s*(<link rel="stylesheet" href="\/css\/(hallmark|trust|motion|aurum|v107|boost)\.css[^"]*"[^>]*>\s*){6}<\/noscript>/.test(html)));

  const staticJs = [...html.matchAll(/<script src="(\/js\/[^"]+)" defer><\/script>/g)].map(m => m[1]);
  ok('aurum/motion/boost are out of the static critical path',
    !staticJs.some(h => /aurum|motion\.js|boost/.test(h)) && staticJs.some(h => h.includes('v117.js')));
  ok('v117.js injects them post-paint, in the original order',
    v117Js.indexOf('aurum.js') > 0 && v117Js.indexOf('aurum.js') < v117Js.indexOf('motion.js') &&
    v117Js.indexOf('motion.js') < v117Js.indexOf('boost.js'));

  ok('sw.js shell remains at v117 or newer', st(swJs, /SHELL = 'shivaa-shell-v(\d+)/) >= 117);
  const swFilesBlock = (swJs.match(/const SHELL_FILES = \[([\s\S]*?)\];/) || [null, ''])[1];
  const swList = [...swFilesBlock.matchAll(/'([^']*)'/g)].map(m => m[1]);
  /* the post-paint trio is stamped by v117.js, not index.html — read it from
     there so a re-bump (v126 re-stamps boost.js) cannot desync this gate */
  /* v166 fix-forward: v117.js no longer hardcodes the trio's stamps — it injects
     them at whatever release is live (`window.__SHIVAA_REL`), which is what
     keeps a returning device off the frozen ?v=107 copies. The gate reads the
     release from the shell and expects exactly that. */
  const SHELL_REL = (/__SHIVAA_REL=(\d+)/.exec(html) || [, '166'])[1];
  const boostStamp = SHELL_REL;
  /* v186: a CSS-background LCP can be an explicit shell asset. Count only
     stamped href preloads that the worker deliberately owns; responsive
     carousel srcsets continue through the bounded media cache. */
  const shellImagePreloads = [...html.matchAll(/<link[^>]*rel="preload"[^>]*as="image"[^>]*href="([^"]+)"[^>]*>/g)]
    .map(m => m[1]).filter(u => swList.includes(u));
  const requested = new Set([
    ...blockingCss, ...deferredCss, ...staticJs, ...shellImagePreloads,
    ...['aurum.js?v=' + boostStamp, 'motion.js?v=' + boostStamp, 'boost.js?v=' + boostStamp].map(u => '/js/' + u),
    /* v166: the shell asks for fonts WITH the release stamp (the CSS asks for the
       same URL), so the precache comparison must use the stamped URLs. */
    ...fontUrls,
    '/manifest.webmanifest', '/offline.html',
    '/images/icons/icon-192.png', '/images/icons/icon-512.png',
    '/images/icons/icon-maskable-512.png', '/images/icons/apple-touch-icon.png',
  ]);
  const swStatic = swList.filter(u => u !== '/' && u !== '/index.html');
  /* v127 — a repair must never swap sw.js (owner's standing rule, recorded in
     MEMORY.md after v126: an out-of-band shell swap makes every device wipe
     and re-fetch its whole cache). The worker is network-first for scripts,
     so a file the shell newly requests is fetched on first paint and stored
     in the SHELL cache by the fetch handler itself — it is simply absent from
     the install list. Anything named here is a deliberate network-only shell
     request; every other gap, and every relic, still fails this check. */
  /* v166 fix-forward: v127.js — and now v166.js — are precached by the worker
     itself, so nothing is network-only any more. The gate keeps its teeth:
     any gap or relic still fails. */
  const NETWORK_ONLY = [];
  const missing = [...requested].filter(u => !swStatic.includes(u) && !NETWORK_ONLY.includes(u));
  const staleAllow = NETWORK_ONLY.filter(u => !requested.has(u));   // an allow-list entry the shell no longer loads
  const extra = swStatic.filter(u => !requested.has(u));
  ok('sw precache == everything the shell requests (no gaps, no relics)',
    missing.length === 0 && extra.length === 0 && staleAllow.length === 0,
    (missing.length ? 'missing: ' + missing.join(',') + ' ' : '') +
    (extra.length ? 'extra: ' + extra.join(',') + ' ' : '') +
    (staleAllow.length ? 'allow-listed but not requested: ' + staleAllow.join(',') : ''));

  /* inside boot(), loadRates must ride the batch, not a serial await (the
     rates POLL legitimately keeps its own await — that one is fine) */
  const bootBody = (appJs.match(/async function boot\(isRedraw\) \{([\s\S]*?)\n\}/) || [null, ''])[1];
  ok('boot keeps rates in the ONE parallel batch (no serial loadRates await)',
    !!bootBody && !/await loadRates\(\)/.test(bootBody) && /_firstBatch/.test(bootBody) && /loadRates\(\),/.test(bootBody));
  ok('app.js has the hard splash cap (Promise.race + timeout)',
    /Promise\.race\(\[\s*_firstBatch/.test(appJs) && /res\(null\), _capMs/.test(appJs));
  ok('/api/pages hydrates the footer in the background (no await)',
    /api\('\/api\/pages'\)\.then\(/.test(appJs) && !/await api\('\/api\/pages'\)/.test(appJs));
  ok('v117.css keeps the pressed arrow centred (translateY preserved)',
    /#heroCarousel \.c-arrow:active\s*\{\s*transform:\s*translateY\(-50%\) scale\([^)]+\)\s*!important/.test(v117Css));
  ok('v117.js caps the preloader independently (belt & braces)',
    /capPreloader/.test(v117Js) && /6500/.test(v117Js));

  /* ═══ B · live behaviour in jsdom ════════════════════════════════════ */
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`;
  console.log('\n· live behaviour — served ' + ORIGIN);
  const pageErrors = [];
  const dom = new JSDOM(html, {
    url: ORIGIN + '/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
      window.ResizeObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
      window.scrollTo = () => {};
      window.addEventListener('error', e => {
        if (e.target && e.target.tagName === 'IMG') return;
        pageErrors.push(e.message || String(e.error || 'error'));
      });
      window.fetch = (input) => {
        const u = String(input).replace(ORIGIN, '');
        const p = u.split('?')[0];
        let out = {};
        if (p === '/api/rates') out = { t: new Date().toISOString(), source: 'live-mcx', live: false, gold24: 15600, gold22: 14405, gold18: 11696, silver: 242.4, jaipur: { gold24: 15600, gold22: 14405, gold18: 11696, silver: 242.4 }, rtgs: { rows: {} }, history: [] };
        else if (p === '/api/settings') out = { settings: DB.settings };
        else if (p === '/api/making-charges') out = { table: [] };
        else if (p === '/api/catalogs') out = { catalogs: [] };
        else if (p === '/api/auth/me') out = { user: null };
        else if (p === '/api/products') out = { products: DB.products };
        else if (p === '/api/pages') out = { pages: [{ slug: 'gold-guide', title: 'Gold Guide' }] };
        else out = {};
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
      };
    },
  });
  const { window } = dom;
  const doc = window.document;

  const booted = await until(() => doc.querySelector('#heroCarousel') && doc.querySelectorAll('.c-slide').length >= 4, 25000);
  ok('the storefront boots and renders the carousel', booted);
  const splashGone = await until(() => !doc.querySelector('#preloader') || doc.querySelector('#preloader').classList.contains('hide'), 9000);
  ok('the preloader lifts without waiting for serial network rounds', splashGone);

  /* the reported bug: tapping the deck must NOT hand focus → no scroll */
  const car = doc.querySelector('#heroCarousel');
  const down = new window.Event('pointerdown', { bubbles: true, cancelable: true });
  car.dispatchEvent(down);
  ok('pointerdown on the carousel is default-prevented (kills focus scroll)', down.defaultPrevented === true);

  /* …but the tap itself must still work: click a dot and the deck moves */
  const dots = () => [...doc.querySelectorAll('.c-dot')];
  const track = doc.querySelector('#cTrack');
  const onBefore = dots().findIndex(d => d.classList.contains('on'));
  dots()[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await until(() => dots().findIndex(d => d.classList.contains('on')) === 2, 3000);
  const onAfter = dots().findIndex(d => d.classList.contains('on'));
  ok('a dot tap still jumps the deck to slide 3', onBefore === 0 && onAfter === 2, `on ${onBefore} → ${onAfter}`);
  ok('the track moves via GPU-composited translate3d',
    /translate3d\(-200%(?:,0(?:\.0+)?)?,(?:0(?:\.0+)?)?\)/.test(track.style.transform || ''), track.style.transform);

  /* the arrow buttons too */
  doc.querySelector('.c-next').dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await until(() => dots().findIndex(d => d.classList.contains('on')) === 3, 3000);
  ok('the ‹ › arrows still drive the deck', dots().findIndex(d => d.classList.contains('on')) === 3);

  /* background footer hydration (was a serial boot await) */
  const footerDone = await until(() => doc.querySelectorAll('#footCustomPages a').length >= 1, 6000);
  ok('custom pages hydrate the footer in the background', footerDone);

  /* enhancement scripts arrive post-paint */
  const enhanced = await until(() => [...doc.querySelectorAll('script')].some(s => (s.src || '').includes('/js/aurum.js'))
    && [...doc.querySelectorAll('script')].some(s => (s.src || '').includes('/js/boost.js')), 12000);
  ok('aurum/motion/boost inject after first paint', enhanced);
  const aurumRan = await until(() => window.document.documentElement.classList.contains('js-aurum'), 8000);
  ok('the ambience layer still initialises (js-aurum class lands)', aurumRan);

  ok('no unhandled page errors', pageErrors.length === 0, pageErrors.join(' | '));

  window.close();
  server.close();
  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} v117 checks passed  ✦`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
