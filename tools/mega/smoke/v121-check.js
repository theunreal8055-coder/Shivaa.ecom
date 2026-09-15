/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v121 check — mobile smoothness gates.

   A · static   (9) v121 wiring, 121 handshake, LCP srcset + matching preload,
                    the -m file, v121.css (layers, skip-offscreen, sweep
                    gating), hidden guards on the second-tickers
   B · live     (5) jsdom: boots, one visible slide with the -m srcset, the
                     carousel advances its .on hook, shop slices still grow
                     under content-visibility, zero page errors
   ══════════════════════════════════════════════════════════════════════════ */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const results = [];
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
  ok('the shell loads the v121 layer after the v120 layer',
    /\/css\/v121\.css\?v=121/.test(html) &&
    html.indexOf('/css/v120.css?v=120') < html.indexOf('/css/v121.css?v=121'));
  ok('service worker precaches v121 and the media cache stays v120 (no gratuitous purge)',
    /'\/css\/v121\.css\?v=121'/.test(sw) && /MEDIA = 'shivaa-media-v120'/.test(sw));
  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(app), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  ok('release stamps stay a consistent triple (shell = script = worker)',
    !!shellRel && !!appRel && !!swRel && shellRel[1] === appRel[1] && appRel[1] === swRel[1],
    `${shellRel && shellRel[1]} / ${appRel && appRel[1]} / ${swRel && swRel[1]}`);
  ok('release handshake is 121 on both sides (shell v121, script key v121)',
    /__SHIVAA_REL\s*=\s*121/.test(html) && /APP_REL\s*=\s*121/.test(app) &&
    /SHELL = 'shivaa-shell-v121'/.test(sw) && /\/js\/app\.js\?v=121/.test(html) &&
    /'\/js\/app\.js\?v=121'/.test(sw));
  const slide1 = /<img src="\/images\/banners\/poster-heritage\.jpg" srcset="([^"]+)" sizes="100vw"[^>]*decoding="async"[^>]*fetchpriority="high">/.exec(app);
  const slideLazy = (app.match(/draggable="false" decoding="async" loading="lazy">/g) || []).length;
  const preload = /<link rel="preload" as="image" imagesrcset="([^"]+)" imagesizes="100vw" fetchpriority="high">/.exec(html);
  const preUrls = preload ? [...preload[1].matchAll(/(\/images\/[^\s,]+)/g)].map(m => m[1]) : [];
  ok('LCP: first slide carries a phone-sized srcset and every slide decodes async',
    !!slide1 && slide1[1].includes('poster-heritage-m.jpg 800w') && slideLazy === 3, `lazy slides: ${slideLazy}`);
  ok('LCP: the head preload matches the slide srcset and every file exists on disk',
    !!preload && preUrls.length === 2 && preUrls.every(u => fs.existsSync(path.join(CMS, u))) &&
    !/preload" as="image" href="\/images\/products\/ring-floral\.jpg"/.test(html), preUrls.join(', '));
  const mBytes = fs.statSync(path.join(CMS, 'images/banners/poster-heritage-m.jpg')).size;
  const fullBytes = fs.statSync(path.join(CMS, 'images/banners/poster-heritage.jpg')).size;
  ok('the phone hero is genuinely lighter (under half the full file)',
    mBytes < fullBytes / 2, `${mBytes}B vs ${fullBytes}B`);
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
  ok('storefront boots', await until(() => w.Shivaa && w.Shivaa.state.productsCache.length === 65, 20000));

  w.location.hash = '#/';
  ok('home shows exactly one visible slide carrying the phone srcset',
    await until(() => d.querySelectorAll('.c-slide.on').length === 1 &&
      (d.querySelector('.c-slide img') || {}).srcset.includes('poster-heritage-m.jpg')));
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
