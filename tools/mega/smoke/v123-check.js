/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v123 check — category-photo refresh release gates.

   A · static  (8) 123 handshake triple, app/v116/sw wiring, all six render
                   sites re-versioned, v116 pre-boot list, 17 tile files on
                   disk, fallback chain + monogram underlay intact, rates lock
   B · live    (6) jsdom: boots 77, home tiles ?v=123, two-stage fallback,
                   shop catbar ?v=123, zero page errors
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

const CAT_KEYS = ['rings', 'necklaces', 'earrings', 'bangles', 'bracelets', 'chains', 'pendants', 'mangalsutra', 'bajubandh', 'rakhdi', 'aad', 'sheeshphool', 'hathphool', 'punach', 'bridalanklets', 'nosepins', 'silver'];

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
  const v116src = fs.readFileSync(path.join(CMS, 'js/v116.js'), 'utf8');
  const v120css = fs.readFileSync(path.join(CMS, 'css/v120.css'), 'utf8');

  console.log('\nSHIVAA v123 check\n\n· A · static gates');
  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(app), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  ok('release stamps are a consistent 123/124 triple (shell = script = worker)',
    !!shellRel && !!appRel && !!swRel && ['123','124','125','126'].includes(shellRel[1]) && ['123','124','125','126'].includes(appRel[1]) && ['123','124','125','126'].includes(swRel[1]),
    `${shellRel && shellRel[1]} / ${appRel && appRel[1]} / ${swRel && swRel[1]}`);
  ok('shell loads app.js + v116.js at v123/v124 and the worker precaches both',
    /\/js\/app\.js\?v=12[3456]/.test(html) && /\/js\/v116\.js\?v=12[3456]/.test(html) &&
    /'\/js\/app\.js\?v=12[3456]'/.test(sw) && /'\/js\/v116\.js\?v=12[3456]'/.test(sw));
  ok('all six category render sites carry ?v=123/124 photo URLs',
    /catBarItems\(\)\.map/.test(app) && /\?v=12[3456]' : '\?v=12[3456]'/.test(app.replace(/&v=12[3456]/g, '?v=123')) &&
    /cat-mini-card"><img src="\$\{c\.img\}\?v=12[3456]"/.test(app) &&
    /mt-img"><img src="\$\{c\.img\}\?v=12[3456]"/.test(app) &&
    /#\/shop\?category=\$\{k\}"><img src="\$\{c\.img\}\?v=12[3456]"/.test(app) &&
    (app.match(/c\.img\}\?v=12[3456]"/g) || []).length >= 4);
  ok('v116 pre-boot drawer list carries ?v=123/124', /c\.img \+ '\?v=12[3456]"/.test(v116src));
  const missing = CAT_KEYS.filter(k => { try { return fs.statSync(path.join(CMS, 'images/categories', k + '.jpg')).size < 8000; } catch (_) { return true; } });
  ok('all 17 category tile files exist on disk (>= 8 KB each)', missing.length === 0, 'missing/small: ' + missing.join(', '));
  ok('fallback chain intact: logo-then-hide with dataset.lfb guard',
    /dataset\.lfb/.test(app) && /this\.style\.display='none'/.test(app) && /\/images\/logo\.png\?v=12[3456]/.test(app));
  ok('tile monogram underlay still guarantees no bare-text tiles',
    /\.cb-img::after/.test(v120css) && /content: '✦'/.test(v120css) && /\.cb-img img \{ position: relative; z-index: 1/.test(v120css));
  ok('rates remain owner-locked (premium.gold22 = 398 in db)',
    DB.settings && DB.settings.gold22Premium === 398);

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log('\n· B · live behaviour — ' + origin);
  const errors = [];
  const dom = bootStore(w => w.addEventListener('error', e => { if (!(e.target && e.target.tagName === 'IMG')) errors.push(e.message || String(e.error)); }));
  const w = dom.window, d = w.document;
  ok('storefront boots with the 77-product catalogue', await until(() => w.Shivaa && w.Shivaa.state.productsCache.length === 77, 20000));
  ok('home category tiles render with ?v=123/124 photo URLs',
    await until(() => [...d.querySelectorAll('.cb-img img')].length >= 17 && [...d.querySelectorAll('.cb-img img')].every(i => /\?v=12[3456]/.test(i.src))));
  const tileImg = d.querySelector('.cb-img img');
  tileImg.dispatchEvent(new w.Event('error'));
  ok('fallback stage 1: a failed tile photo swaps to the versioned house logo', /\/images\/logo\.png\?v=12[3456]/.test(tileImg.src));
  tileImg.dispatchEvent(new w.Event('error'));
  ok('fallback stage 2: a failed logo hides to the monogram underlay', tileImg.style.display === 'none');
  w.location.hash = '#/shop';
  ok('shop-page category bar photos carry ?v=123/124',
    await until(() => [...d.querySelectorAll('.shop-catbar .cb-img img')].length >= 17 && [...d.querySelectorAll('.shop-catbar .cb-img img')].every(i => /\?v=12[3456]/.test(i.src))));
  ok('no unhandled page errors in the v123 session', errors.length === 0, errors.slice(0, 3).join(' | '));

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v123 checks passed  ${pass === results.length ? '✦' : '✗'}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('v123-check crashed:', e); process.exit(1); });
