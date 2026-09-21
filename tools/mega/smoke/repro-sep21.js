/* Scratch probe (sandbox only, never deployed) — reproduce the owner's
   21-Sep-2026 reports against the real shell:
     1 · desktop: Categories button shows the 17 tiles, tapping one does nothing
     2 · products sometimes paint, sometimes the page is empty
     3 · a returning device can keep an old version
   Run: node tools/mega/smoke/repro-sep21.js
*/
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end();
  fs.readFile(f, (e, b) => e ? res.writeHead(404).end()
    : (res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }), res.end(b)));
});
const jaipur = { gold24: 15655, gold22: 14405, gold18: 11696, silver: 242.4 };
const RATES_STUB = { t: new Date().toISOString(), source: 'live-mcx', live: false, spot: jaipur, jaipur, ...jaipur,
  rtgs: { rows: {}, anchor: 'mcx-future', updatedAt: new Date().toISOString() }, premium: { gold: 55, silver: 3, gold22: 398 },
  anchorLevel: { mode: 'mcx-future', goldPerG: 15056, silverPerG: 99500 },
  history: [Object.assign({ t: new Date(Date.now() - 6e4).toISOString() }, jaipur)], nextUpdateIn: 60 };

/* a matchMedia that actually evaluates the query against innerWidth — the
   inventory-wide stubs answer "true" for every max-width query, which hides
   the desktop/mobile branch differences this probe exists to see. */
function makeMatchMedia(w) {
  const evalQ = (q) => {
    const m = /\(\s*(max|min)-width:\s*(\d+)px\s*\)/.exec(q);
    if (!m) return false;
    return m[1] === 'max' ? w.innerWidth <= +m[2] : w.innerWidth >= +m[2];
  };
  return q => ({ matches: evalQ(q), media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}

function boot({ startHash = '', innerWidth = 1280, fetchMode = 'ok', failFirst = 0, seedCatalog = false } = {}) {
  const errors = [];
  let productHits = 0;
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: `http://127.0.0.1:${server.address().port}/${startHash}`,
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.innerWidth = innerWidth; w.innerHeight = 900;
      w.matchMedia = makeMatchMedia(w);
      /* a firing IO so the shop grid windowing + .rv reveal actually run */
      w.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; }
        observe(el) { setTimeout(() => { try { this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el }], this); } catch (e) {} }, 0); }
        unobserve() {} disconnect() {}
      };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {};
      Object.defineProperty(w.navigator, 'vibrate', { value: () => true, configurable: true });
      Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
      if (seedCatalog) {
        try { w.localStorage.setItem('shv_catalog_v166', JSON.stringify({ at: Date.now(), products: DB.products })); } catch (e) {}
      }
      w.HTMLMediaElement.prototype.play = () => Promise.resolve();
      w.HTMLMediaElement.prototype.pause = () => {};
      w.addEventListener('error', ev => { if (ev.target && ev.target.tagName === 'IMG') return; errors.push(String(ev.message || ev.error || 'error')); });
      const nativeFetch = w.fetch;
      const J = (obj, status = 200) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => obj, text: async () => JSON.stringify(obj), clone() { return this; } });
      w.fetch = (input, opts) => {
        const p = String(input).split('?')[0];
        let out = null;
        if (p.endsWith('/api/rates')) out = RATES_STUB;
        else if (p.endsWith('/api/settings')) out = { settings: DB.settings };
        else if (p.endsWith('/api/making-charges')) out = { table: [] };
        else if (p.endsWith('/api/catalogs')) out = { catalogs: [] };
        else if (p.endsWith('/api/auth/me')) out = { user: null };
        else if (p.endsWith('/api/pages')) out = { pages: [] };
        else if (p.endsWith('/api/version')) out = { ok: true, rel: 165, shell: 'shivaa-shell-v165', stamp: { index: 165, app: 165 } };
        else if (p.endsWith('/api/products')) {
          productHits++;
          if (fetchMode === 'fail') return Promise.reject(new TypeError('Failed to fetch'));
          if (fetchMode === 'hang') return new Promise(() => {});
          if (failFirst && productHits <= failFirst) return Promise.reject(new TypeError('Failed to fetch'));
          if (fetchMode === 'slow') return new Promise(res => setTimeout(() => res({ ok: true, status: 200, json: async () => ({ products: DB.products }), clone() { return this; } }), 9000));
          out = { products: DB.products };
        }
        if (out) return J(out);
        return nativeFetch(input, opts);
      };
    },
  });
  const w = dom.window;
  const doc = w.document;
  return {
    w, doc,
    $: (s) => doc.querySelector(s),
    $$: (s) => [...doc.querySelectorAll(s)],
    click(el) {
      if (!el) return false;
      el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w }));
      return true;
    },
    booted: () => until(() => doc.body.dataset.page, 20000),
    errors,
  };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  console.log('── ISSUE 1 · desktop: Categories button → tile tap ──');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280 });
    if (!(await F.booted())) console.log('  boot FAILED');
    await sleep(1200);
    F.click(F.$('#navCats'));
    await sleep(400);
    const panel = F.$('#catMenu');
    console.log('  panel hidden after tap  :', panel && panel.hidden, '| tiles:', F.$$('#catMenu .mega-tile').length);
    const tile = F.$$('#catMenu .mega-tile').find(a => /category=rings/.test(a.getAttribute('href') || ''));
    console.log('  clicking tile           :', tile && tile.getAttribute('href'));
    F.click(tile);
    await sleep(1500);
    console.log('  hash now                :', F.w.location.hash);
    console.log('  body page / page data   :', F.doc.body.dataset.page, '| view h1:', (F.$('#view h1') || {}).textContent);
    console.log('  shop grid cards         :', F.$$('#shopGrid .p-card').length);
    console.log('  panel hidden after nav  :', panel && panel.hidden, '| backdrop hidden:', F.$('#megaBackdrop').hidden);
    /* the backdrop is a full-viewport overlay: if it is still up with no
       handler, EVERY later tap is swallowed — the owner's "nothing happens". */
    const before = F.w.location.hash;
    F.click(F.$('#megaBackdrop'));
    await sleep(500);
    console.log('  backdrop tap → closed?  :', F.$('#megaBackdrop').hidden, '| hash changed:', before !== F.w.location.hash);
    F.click(F.$('#view .crumbs a[href="#/"]') || F.$('#logoLink') || F.$('header a'));
    await sleep(600);
    console.log('  outside tap → hash      :', F.w.location.hash);
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n── ISSUE 1d · slow network (the owner’s laptop) ──');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280, fetchMode: 'slow' });
    if (!(await F.booted())) console.log('  boot FAILED');
    await sleep(7000);   // past the 6 s cap: the degraded paint is what the owner sees
    console.log('  who wired #navCats      :', F.$('#navCats')._v116wired ? 'v116 early wiring' : 'app.js boot wiring');
    F.click(F.$('#navCats'));
    await sleep(300);
    const panel = F.$('#catMenu');
    console.log('  panel open              :', !panel.hidden, '| tiles:', F.$$('#catMenu .mega-tile').length);
    const tile = F.$$('#catMenu .mega-tile').find(a => /category=rings/.test(a.getAttribute('href') || ''));
    F.click(tile);
    await sleep(1200);
    console.log('  hash after tile tap     :', F.w.location.hash);
    console.log('  panel hidden after nav  :', panel.hidden, '| backdrop hidden:', F.$('#megaBackdrop').hidden);
    const before = F.w.location.hash;
    F.click(F.$('#megaBackdrop'));
    await sleep(400);
    console.log('  backdrop tap → closed?  :', F.$('#megaBackdrop').hidden, '| hash changed:', before !== F.w.location.hash);
    /* a shopper taps the same tile again — the classic second attempt */
    F.click(F.$$('#catMenu .mega-tile').find(a => /category=rings/.test(a.getAttribute('href') || '')));
    await sleep(600);
    console.log('  second tile tap → hash  :', F.w.location.hash, '| page:', F.doc.body.dataset.page);
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n── ISSUE 1b · home “Shop by category” tile ──');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280 });
    if (!(await F.booted())) console.log('  boot FAILED');
    await sleep(1200);
    const tile = F.$$('.cat-mini-card').find(a => /rings/.test(a.getAttribute('href') || ''));
    F.click(tile);
    await sleep(1500);
    console.log('  hash now / cards        :', F.w.location.hash, '|', F.$$('#shopGrid .p-card').length);
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n── ISSUE 1c · desktop catbar slider tile ──');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280 });
    if (!(await F.booted())) console.log('  boot FAILED');
    await sleep(1200);
    const tile = F.$$('.cb-item').find(a => /category=necklaces/.test(a.getAttribute('href') || ''));
    F.click(tile);
    await sleep(1500);
    console.log('  hash now                :', F.w.location.hash, '| page:', F.doc.body.dataset.page);
    console.log('  grid html head          :', (F.$('#shopGrid') || {}).textContent.slice(0, 90));
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n── ISSUE 2 · products fetch fails once (the flaky-network case) ──');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280, failFirst: 1 });
    if (!(await F.booted())) console.log('  boot FAILED');
    await sleep(6000);
    console.log('  at 6s  cache / cards    :', F.w.Shivaa.state.productsCache.length, '/', F.$$('#view .p-card').length);
    await sleep(20000);
    console.log('  at 26s cache / cards    :', F.w.Shivaa.state.productsCache.length, '/', F.$$('#view .p-card').length);
    console.log('  catalogOk               :', F.w.Shivaa.state.catalogOk);
    console.log('  device catalogue saved  :', !!F.w.localStorage.getItem('shv_catalog_v166'));
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n── ISSUE 2b · products fetch hangs forever, last-good cache on device ──');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280, fetchMode: 'hang', seedCatalog: true });
    if (!(await F.booted())) console.log('  boot FAILED');
    await sleep(4000);
    console.log('  cache length            :', F.w.Shivaa && F.w.Shivaa.state && F.w.Shivaa.state.productsCache.length);
    console.log('  home best-card count    :', F.$$('#view .p-card').length);
    console.log('  preloader still up      :', !!F.$('#preloader'));
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n── ISSUE 2d · products never arrive, no cache (the honest retry strip) ──');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280, fetchMode: 'fail' });
    if (!(await F.booted())) console.log('  boot FAILED');
    await sleep(46000);
    console.log('  retry strip shown       :', !!F.$('#shvCatalogNote'), '| button:', !!F.$('#shvCatalogRetry'));
    console.log('  strip text              :', (F.$('#shvCatalogNote') || {}).textContent);
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n── ISSUE 2c · products land after the 6 s cap ──');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280, fetchMode: 'slow' });
    if (!(await F.booted())) console.log('  boot FAILED');
    await sleep(7000);
    console.log('  at 7s cache length      :', F.w.Shivaa.state.productsCache.length, '| cards:', F.$$('#view .p-card').length);
    await sleep(8000);
    console.log('  at 15s cache length     :', F.w.Shivaa.state.productsCache.length, '| cards:', F.$$('#view .p-card').length);
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n── ISSUE 3 · version stamps the browser may have cached for a year ──');
  {
    const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
    const urls = [...html.matchAll(/(?:href|src)="([^"]+\.(?:js|css|png|jpg|jpeg|woff2))(?:\?([^"]*))?"/g)]
      .map(m => ({ url: m[1], q: m[2] || '' }));
    const stale = urls.filter(u => !/\bv=\d+/.test(u.q) && !/^https?:/.test(u.url));
    console.log('  assets with NO v= stamp :', stale.length, stale.slice(0, 6).map(s => s.url).join(', '));
    const byStamp = {};
    urls.forEach(u => { const m = /\bv=([^&"]+)/.exec(u.q); const k = m ? m[1] : 'none'; byStamp[k] = (byStamp[k] || 0) + 1; });
    console.log('  stamp histogram         :', JSON.stringify(byStamp));
    console.log('  sw SHELL name           :', /SHELL = '([^']+)'/.exec(fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8'))[1]);
  }

  server.close();
  console.log('\ndone.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
