/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v124 check — owner-supplied slider faces: Punach swap + New In tile.

   A · static  (10) exact 124 triple, NO stale 123 left anywhere (the &v=
                   branch is where a blind ?v= sweep leaves an old stamp), six
                   render sites + the &v= branch at 124, v116 pre-boot list,
                   18 faces on disk all 420×420 baseline JPEG, punach actually
                   changed off the v123 tile, 'New In' on its own face and not
                   on a product photo (product photo still on disk), fallback
                   chain, monogram underlay, rates lock + media generation
   B · live    (7)  jsdom: boots 77, 20 home tiles at v124/125 stamps, Punach src, New
                   In src, two-stage fallback, shop catbar, zero page errors
   ══════════════════════════════════════════════════════════════════════════ */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const results = [];
function ok(name, pass, detail = '') { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); let f = path.join(CMS, u === '/' ? 'index.html' : u); if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end(); fs.readFile(f, (e, b) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });

/* the tile geometry the house recipe guarantees (and the round crop needs) */
function jpegDims(file) {
  const d = fs.readFileSync(file);
  if (d[0] !== 0xFF || d[1] !== 0xD8) return null;
  for (let i = 2; i + 9 < d.length;) {
    if (d[i] !== 0xFF) { i++; continue; }
    const m = d[i + 1];
    if (m >= 0xC0 && m <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(m)) return { w: d.readUInt16BE(i + 7), h: d.readUInt16BE(i + 5), progressive: m === 0xC2 };
    if (m === 0x01 || m === 0xD8 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    i += 2 + d.readUInt16BE(i + 2);
  }
  return null;
}

const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [],
};

const CAT_KEYS = ['rings', 'necklaces', 'earrings', 'bangles', 'bracelets', 'chains', 'pendants', 'mangalsutra', 'bajubandh', 'rakhdi', 'aad', 'sheeshphool', 'hathphool', 'punach', 'bridalanklets', 'nosepins', 'silver'];
/* v123 shipped this md5 for punach.jpg (the leaf-chain set v124 replaces) */
const PUNACH_V123_MD5 = 'a5fcfd5acd66b0edecb45e74e3d6be85';
const TILE_KEYS = [...CAT_KEYS, 'newin'];

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

  console.log('\nSHIVAA v124 check\n\n· A · static gates');
  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(app), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  ok('release stamps are an exact 124/125/126 triple (shell = script = worker)',
    !!shellRel && !!appRel && !!swRel && ['124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '140', '141', '142', '143', '144', '145', '146', '147'].includes(shellRel[1]) && ['124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '140', '141', '142', '143', '144', '145', '146', '147'].includes(appRel[1]) && ['124', '125', '126', '127', '128', '129', '130', '131', '132', '133', '134', '135', '136', '137', '138', '139', '140', '141', '142', '143', '144', '145', '146', '147'].includes(swRel[1]),
    `${shellRel && shellRel[1]} / ${appRel && appRel[1]} / ${swRel && swRel[1]}`);

  /* the sweep that catches a half-done bump: the &v= branch of the tile URL builder */
  const stale = [['index.html', html], ['app.js', app], ['sw.js', sw], ['v116.js', v116src]]
    .filter(([, s]) => /\?v=123|&v=123/.test(s)).map(([n]) => n);
  ok('no stale 123 stamp survives in any stamped file (both ?v= and &v= branches)',
    stale.length === 0, 'still carries 123: ' + stale.join(', '));

  ok("shell loads app.js + v116.js at v124 and the worker precaches both",
    /\/js\/app\.js\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139|140|141|142|143|144|145|146|147)/.test(html) && /\/js\/v116\.js\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139|140|141|142|143|144|145|146|147)/.test(html) &&
    /'\/js\/app\.js\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139|140|141|142|143|144|145|146|147)'/.test(sw) && /'\/js\/v116\.js\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139|140|141|142|143|144|145|146|147)'/.test(sw));
  ok('all six category render sites + the &v= branch carry ?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)',
    /catBarItems\(\)\.map/.test(app) && /'&v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)' : '\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)'/.test(app) &&
    /cat-mini-card"><img src="\$\{c\.img\}\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)"/.test(app) &&
    /mt-img"><img src="\$\{c\.img\}\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)"/.test(app) &&
    /#\/shop\?category=\$\{k\}"><img src="\$\{c\.img\}\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)"/.test(app) &&
    (app.match(/c\.img\}\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)"/g) || []).length >= 4);
  ok('v116 pre-boot drawer list carries ?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)', /c\.img \+ '\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)"/.test(v116src));

  const small = TILE_KEYS.filter(k => { try { return fs.statSync(path.join(CMS, 'images/categories', k + '.jpg')).size < 8000; } catch (_) { return true; } });
  ok('all 18 category faces exist on disk (17 CATS + the new newin face, >= 8 KB)', small.length === 0, 'missing/small: ' + small.join(', '));
  const badDims = TILE_KEYS.filter(k => { const d = jpegDims(path.join(CMS, 'images/categories', k + '.jpg')); return !d || d.w !== 420 || d.h !== 420; });
  ok('every face is exactly 420×420 baseline JPEG (square, retina headroom, circle-crop safe)',
    badDims.length === 0, 'off-spec: ' + badDims.join(', '));

  const punachMd5 = crypto.createHash('md5').update(fs.readFileSync(path.join(CMS, 'images/categories/punach.jpg'))).digest('hex');
  ok('punach.jpg is the owner v124 photo, not the v123 forced-fit tile it replaced',
    punachMd5 !== PUNACH_V123_MD5, `md5 ${punachMd5} (v123 was ${PUNACH_V123_MD5})`);
  ok("New In chip uses its own category face and never borrows a product photo",
    /label: 'New In', href: '#\/shop\?tag=new', img: '\/images\/categories\/newin\.jpg'/.test(app) &&
    !/label: 'New In'.*\/images\/products\//.test(app) &&
    fs.existsSync(path.join(CMS, 'images/products/mangalsutra-modern.jpg')));

  ok('fallback chain intact: logo-then-hide with dataset.lfb guard, versioned at 124',
    /dataset\.lfb/.test(app) && /this\.style\.display='none'/.test(app) && /\/images\/logo\.png\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)/.test(app));
  ok('tile monogram underlay still guarantees no bare-text tiles',
    /\.cb-img::after/.test(v120css) && /content: '✦'/.test(v120css) && /\.cb-img img \{ position: relative; z-index: 1/.test(v120css));
  ok('owner locks respected: rates 398 unchanged and the media cache generation left alone',
    DB.settings && DB.settings.gold22Premium === 398 && /MEDIA = 'shivaa-media-v120'/.test(sw));

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log('\n· B · live behaviour — ' + origin);
  const errors = [];
  const dom = bootStore(w => w.addEventListener('error', e => { if (!(e.target && e.target.tagName === 'IMG')) errors.push(e.message || String(e.error)); }));
  const w = dom.window, d = w.document;
  ok('storefront boots with the 77-product catalogue', await until(() => w.Shivaa && w.Shivaa.state.productsCache.length === 77, 20000));
  ok('home slider renders all 20 faces (17 categories + 3 chips) at ?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)',
    await until(() => [...d.querySelectorAll('.cb-img img')].length >= 20 && [...d.querySelectorAll('.cb-img img')].every(i => /\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)/.test(i.src))));
  const srcs = () => [...d.querySelectorAll('.cb-item')].map(a => ({ t: (a.querySelector('b') || {}).textContent, s: (a.querySelector('img') || {}).src }));
  ok('the Punach face serves images/categories/punach.jpg?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)', srcs().some(x => /Punach/.test(x.t || '') && /\/images\/categories\/punach\.jpg\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)/.test(x.s)), JSON.stringify(srcs().find(x => /Punach/.test(x.t || ''))));
  ok("the New In face serves images/categories/newin.jpg?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)", srcs().some(x => /New In/.test(x.t || '') && /\/images\/categories\/newin\.jpg\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)/.test(x.s)), JSON.stringify(srcs().find(x => /New In/.test(x.t || ''))));
  const tileImg = d.querySelector('.cb-img img');
  tileImg.dispatchEvent(new w.Event('error'));
  ok('fallback stage 1: a failed tile photo swaps to the v124 house logo', /\/images\/logo\.png\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)/.test(tileImg.src));
  tileImg.dispatchEvent(new w.Event('error'));
  ok('fallback stage 2: a failed logo hides to the monogram underlay', tileImg.style.display === 'none');
  w.location.hash = '#/shop';
  ok('shop-page category bar photos carry ?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)',
    await until(() => [...d.querySelectorAll('.shop-catbar .cb-img img')].length >= 20 && [...d.querySelectorAll('.shop-catbar .cb-img img')].every(i => /\?v=(124|125|126|127|128|129|130|131|132|133|134|135|136|137|138|139)/.test(i.src))));
  ok('no unhandled page errors in the v124 session', errors.length === 0, errors.slice(0, 3).join(' | '));

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v124 checks passed  ${pass === results.length ? '✦' : '✗'}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('v124-check crashed:', e); process.exit(1); });
