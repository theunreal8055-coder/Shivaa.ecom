/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v121 check — mobile smoothness gates.

   A · static   (9) v121 wiring, 121 handshake, responsive banner image
                    sources + matching hero preload, compact mobile crop,
                    v121.css (layers, skip-offscreen, sweep gating), hidden
                    guards on the second-tickers
   B · live     (5) jsdom: boots, one active slide with a phone art source,
                     the carousel advances its .on hook, shop slices still
                     grow under content-visibility, zero page errors
   ══════════════════════════════════════════════════════════════════════════ */
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

function ok(name, pass, detail = '') { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); let f = path.join(CMS, u === '/' ? 'index.html' : u); if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end(); fs.readFile(f, (e, b) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });

const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [],
};

function bootStore(extra = '') {
  return new JSDOM(fs.readFileSync(path.join(CMS, 'index.html'), 'utf8'), {
    url: 'http://127.0.0.1:' + server.address().port + '/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; w.ResizeObserver = class { observe() {} disconnect() {} }; w.scrollTo = () => {};
      if (extra) extra(w);
      w.fetch = input => {
        const u = new URL(String(input), 'http://127.0.0.1/'); let out = {};
        if (u.pathname === '/api/rates') out = RATES_STUB;
        else if (u.pathname === '/api/settings') out = { settings: DB.settings };
        else if (u.pathname === '/api/making-charges') out = { table: [] };
        else if (u.pathname === '/api/catalogs') out = { catalogs: [] };
        else if (u.pathname === '/api/products') out = { products: DB.products };
        else if (u.pathname.startsWith('/api/products/')) {
          const id = decodeURIComponent(u.pathname.split('/').pop());
          out = { product: DB.products.find(p => p.id === id), similar: DB.products.slice(1, 5), reviews: [], rates: {} };
        } else if (u.pathname === '/api/pages') out = { pages: [] };
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
      };
    },
  });
}

(async () => {
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
  const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
  const v121css = fs.readFileSync(path.join(CMS, 'css/v121.css'), 'utf8');

  console.log('\nSHIVAA v121 check\n\n· A · static gates');
  /* v166 fix-forward: stamps are release numbers, never a layer's era. */
  ok('the shell loads the v121 layer after the v120 layer',
    /\/css\/v121\.css\?v=\d+/.test(html) &&
    html.search(/\/css\/v120\.css\?v=/) < html.search(/\/css\/v121\.css\?v=/));
  ok('service worker precaches v121 and the media cache is v120 or a later intentional generation',
    /'\/css\/v121\.css\?v=\d+'/.test(sw) && Number((/MEDIA = 'shivaa-media-v(\d+)'/.exec(sw) || [0, 0])[1]) >= 120);
  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(app), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  ok('release stamps stay a consistent triple (shell = script = worker)',
    !!shellRel && !!appRel && !!swRel && shellRel[1] === appRel[1] && appRel[1] === swRel[1],
    `${shellRel && shellRel[1]} / ${appRel && appRel[1]} / ${swRel && swRel[1]}`);
  ok('release handshake is 121 on both sides (shell v121, script key v121)',
    st(html, /__SHIVAA_REL\s*=\s*(\d+)/) >= 121 && st(app, /APP_REL\s*=\s*(\d+)/) >= 121 &&
    st(sw, /SHELL = 'shivaa-shell-v(\d+)/) >= 121 && st(html, /\/js\/app\.js\?v=(\d+)/) >= 121 &&
    st(sw, /'\/js\/app\.js\?v=(\d+)'/) >= 121);
  const pictureStart = app.indexOf('function responsiveBannerPicture(');
  const pictureEnd = app.indexOf('const HOME_CAROUSEL_SLIDES = Object.freeze([', pictureStart);
  const pictureHelper = pictureStart >= 0 && pictureEnd > pictureStart ? app.slice(pictureStart, pictureEnd) : '';
  const renderStart = app.indexOf('function renderHomeCarouselSlides()');
  const homeStart = app.indexOf('pages.home = async (view) => {', renderStart);
  const renderTemplate = renderStart >= 0 && homeStart > renderStart ? app.slice(renderStart, homeStart) : '';
  ok('LCP: shared banner pictures art-direct mobile crops and decode asynchronously',
    pictureHelper.includes('<source media="(max-width: 820px)" type="image/webp"') &&
    pictureHelper.includes('${mobileBase}.jpg${ASSET_V}') &&
    pictureHelper.includes('<source type="image/webp"') &&
    pictureHelper.includes('decoding="async" draggable="false"') &&
    pictureHelper.includes("eager ? 'eager' : 'lazy'") &&
    pictureHelper.includes("eager ? 'high' : 'low'") &&
    renderTemplate.includes('responsiveBannerPicture(slide.image, slide.mobile') && renderTemplate.includes('index === 0'));
  const preloadLinks = [...html.matchAll(/<link rel="preload" as="image" type="image\/webp" href="([^"]+)" media="([^"]+)" fetchpriority="high">/g)]
    .map(m => ({ url: m[1], media: m[2], file: m[1].split(/[?#]/, 1)[0] }));
  const preloadFilesExist = preloadLinks.every(p => fs.existsSync(path.join(CMS, p.file)));
  ok('LCP: head preloads match the primary responsive hero picture and files exist on disk',
    preloadLinks.length === 2 && preloadFilesExist &&
    preloadLinks.some(p => p.url.includes('/images/banners/hero-main-mobile.webp') && p.media === '(max-width: 820px)') &&
    preloadLinks.some(p => p.url.includes('/images/banners/hero-main.webp') && p.media === '(min-width: 821px)') &&
    app.includes("responsiveBannerPicture('hero-main', 'hero-main-mobile'"),
    preloadLinks.map(p => p.url).join(', ') || 'missing responsive hero preloads');
  const mobileBytes = fs.statSync(path.join(CMS, 'images/banners/hero-main-mobile.webp')).size;
  const desktopBytes = fs.statSync(path.join(CMS, 'images/banners/hero-main.webp')).size;
  ok('the art-directed phone hero stays materially lighter than the desktop WebP',
    mobileBytes < desktopBytes * 0.8, `${mobileBytes}B vs ${desktopBytes}B`);
  ok('smoothness CSS: cards drop GPU layers, skip off-screen work, sweep paints on .on only',
    /@media \(pointer: coarse\)[\s\S]*?\.p-card \{ will-change: auto/.test(v121css) &&
    /\.p-card \{\s*content-visibility: auto/.test(v121css) && /contain-intrinsic-size: auto 320px/.test(v121css) &&
    /\.c-slide::after \{ animation: none/.test(v121css) &&
    /\.c-slide\.on::after \{ animation: sheetSweep 6\.5s/.test(v121css));
  ok('the second-tickers skip DOM churn while the tab is hidden',
    /if \(document\.hidden\) return;\n    const d = Math\.max\(0, target - Date\.now\(\)\);/.test(app) &&
    /if \(document\.hidden\) return;\n    if \(!finaleLive\(\)\)/.test(app));

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log('\n· B · live behaviour — ' + origin);
  const errors = [];
  const dom = bootStore(w => w.addEventListener('error', e => { if (!(e.target && e.target.tagName === 'IMG')) errors.push(e.message || String(e.error)); }));
  const w = dom.window, d = w.document;
  /* v166 fix-forward: 77 rings + the owner's 6 campaign studs — a floor. */
  ok('storefront boots', await until(() => w.Shivaa && w.Shivaa.state.productsCache.length >= 77, 20000),
    (w.Shivaa && w.Shivaa.state ? w.Shivaa.state.productsCache.length : 0) + ' pieces');

  w.location.hash = '#/';
  ok('home shows one active slide with its art-directed phone picture source',
    await until(() => {
      const active = d.querySelector('.c-slide.on');
      const mobileSource = active && active.querySelector('picture source[media="(max-width: 820px)"][type="image/webp"]');
      return d.querySelectorAll('.c-slide.on').length === 1 && !!mobileSource &&
        mobileSource.getAttribute('srcset').includes('/images/banners/poster-heritage-mobile.webp');
    }));
  const slides = [...d.querySelectorAll('.c-slide')];
  const onBefore = slides.findIndex(s => s.classList.contains('on'));
  d.querySelector('.c-next').click();
  ok('the carousel advances its .on hook (the sweep gating follows the visible slide)',
    await until(() => [...d.querySelectorAll('.c-slide')].findIndex(s => s.classList.contains('on')) !== onBefore),
    `stayed on slide ${onBefore}`);

  w.location.hash = '#/shop';
  await until(() => d.querySelectorAll('#shopGrid .p-card').length > 0);
  const n0 = d.querySelectorAll('#shopGrid .p-card').length;
  w.Shivaa.shopLoadMore();
  ok('shop slices still grow under content-visibility (infinite scroll unbroken)',
    await until(() => d.querySelectorAll('#shopGrid .p-card').length > n0), `${n0} cards, no growth`);
  ok('no unhandled page errors in the v121 session', errors.length === 0, errors.slice(0, 3).join(' | '));

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v121 checks passed  ${pass === results.length ? '✦' : '✗'}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); server.close(); process.exit(1); });
