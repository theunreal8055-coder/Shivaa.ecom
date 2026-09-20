/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v164 · PDP PROOF RUN (jsdom, real app boot, stub network).
   The reported bug: opening any of the 6 scheme studs from the Earrings
   grid crashed the product page ("Something slipped / Cannot read
   properties of undefined (reading 'length')", app.js p.sizes.length).
   What must be TRUE in the browser now:
     A · #/shop?category=earrings paints 6 stud cards with real ★ ratings
         (never "★ undefined (undefined)") and live prices.
     B · clicking a stud card opens a full PDP: name, gallery, price,
         "Make It Yours!" — zero "Something slipped", zero page errors —
         and NO size row (earrings take no size).
     C · deep-linking #/product/p_stud_m1 renders the same PDP.
     D · NEGATIVE CONTROL: the stub serves the exact THIN v163 live payload
         (no sizes/rating/reviews/stock/tags, 1 image — the shape that
         crashed production) and the PDP STILL renders: the (p.sizes||[])
         guard holds even before the server twin upgrade deploys.
   Run: node tools/mega/smoke/v164-pdp.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v164-pdp.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const APP_SRC = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const HTML_SRC = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 8000, step = 25) => { const t0 = Date.now(); for (;;) { let v = null; try { v = await f(); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(step); } };

/* the exact thin v163 live payload for p_stud_m1 (captured from
   https://shivaa.in/api/products/p_stud_m1): 1 image, similar:[], and NO
   sizes/rating/reviews/stock/tags keys — the shape that crashed the PDP. */
const THIN_M1 = { id: 'p_stud_m1', sku: 'SHV-MST-01', name: "Shivaa Veer 22K Gold Men's Square Stud (Pair)", weightG: 3.0, purity: '22K', metal: 'Gold', category: 'earrings', mcScheme: 'percent', mcValue: 15, mcPct: 15, stoneValue: 0, images: ['/images/products/studs/mst01-studio.jpg'], active: true, isCampaignStud: true, desc: "Solid 22K Gold Men's Square Stud pair." };

const RATES_STUB = () => ({
  t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15482, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold24: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [], nextUpdateIn: null, marketHours: true,
});

async function boot({ hash = '#/', thin = false } = {}) {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/js/app.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(APP_SRC); }
    if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(HTML_SRC); }
    const f = path.join(CMS, u);
    if (!path.resolve(f).startsWith(path.resolve(CMS))) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'text/plain' }); res.end(b); });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String(e.stack || e.message); if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|navigation|window\.scroll)/.test(m) && !/Could not load script.*(aurum|motion|boost|cashfree)/.test(m)) errors.push(m); });
  vc.on('error', (...a) => errors.push(a.map(x => (x && x.stack) ? x.stack : String(x)).join(' ').slice(0, 300)));
  const listProducts = thin ? DB.products.filter(p => !String(p.sku || '').startsWith('SHV')) : DB.products;
  const dom = new JSDOM(HTML_SRC, {
    url: origin + '/' + hash, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.fetch = async (input, init = {}) => {
        const uu = new URL(String(input), origin);
        const p = uu.pathname;
        const json = (o, status = 200, isOk = true) => ({ ok: isOk, status, headers: { get: () => 'application/json' }, json: async () => o, text: async () => JSON.stringify(o) });
        if (p === '/api/settings') return json({ ...DB.settings, guestCheckout: false });
        if (p === '/api/products') return json({ products: listProducts });
        if (p.startsWith('/api/products/')) {
          const id = decodeURIComponent(p.split('/').pop());
          const prod = thin && id === 'p_stud_m1' ? { ...THIN_M1 } : listProducts.find(x => x.id === id);
          return json({ product: prod, reviews: [], similar: [] });
        }
        if (p === '/api/making-charges') return json({ table: [] });
        if (p === '/api/catalogs') return json({ catalogs: [] });
        if (p === '/api/pages') return json({ pages: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json(RATES_STUB());
        if (p === '/api/pay/config') return json({ mode: 'demo', env: 'sandbox', lockMinutes: 20, codFeePct: 0, upiId: '', upiName: 'Shivaa', currency: 'INR' });
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
    },
  });
  return { w: dom.window, dom, errors, server, origin };
}
const crashed = d => (d.body.textContent || '').includes('Something slipped');

(async () => {
  /* ── A + B · the Earrings grid and the click that used to crash ── */
  {
    const { w, errors, server } = await boot({ hash: '#/shop?category=earrings' });
    const d = w.document;
    const gridReady = await until(() => d.querySelectorAll('#shopGrid .p-card').length >= 6);
    ok('A1 · Earrings grid paints all 6 stud cards', !!gridReady, 'cards: ' + d.querySelectorAll('#shopGrid .p-card').length);
    const gridHtml = (d.querySelector('#shopGrid') || {}).innerHTML || '';
    ok('A2 · grid shows real ★ ratings + prices, never "undefined"', !/undefined/.test(gridHtml) && /★ 4\.8/.test(gridHtml) && /₹/.test(gridHtml));
    const link = d.querySelector('#shopGrid a[href="#/product/p_stud_m1"]');
    ok('A3 · first card links to the stud PDP', !!link);
    if (link) link.click();
    else { w.location.hash = '#/product/p_stud_m1'; w.dispatchEvent(new w.Event('hashchange')); }
    const pdpReady = await until(() => d.querySelector('.pd-info h1') && d.querySelector('.miy-btn'));
    ok('B1 · clicking the card opens the PDP (name + Make It Yours!)', !!pdpReady);
    ok('B2 · PDP shows the stud name, a live ₹ price and the gallery', !!pdpReady
      && /Shivaa Veer/.test(d.querySelector('.pd-info h1').textContent)
      && /₹/.test(d.querySelector('.pd-pricebox').textContent)
      && d.querySelectorAll('#galTrack .gal-slide').length === 4, 'slides: ' + d.querySelectorAll('#galTrack .gal-slide').length);
    ok('B3 · PDP shows NO size row for earrings (sizes [] by design)', !d.querySelector('#sizeRow'));
    ok('B4 · no "Something slipped" crash anywhere on the journey', !crashed(d));
    ok('B5 · zero page errors across grid → PDP', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  /* ── C · deep link straight at the PDP ── */
  {
    const { w, errors, server } = await boot({ hash: '#/product/p_stud_m1' });
    const d = w.document;
    const pdpReady = await until(() => d.querySelector('.pd-info h1') && d.querySelector('.miy-btn'));
    ok('C1 · deep link renders the stud PDP', !!pdpReady);
    ok('C2 · deep-linked PDP never crashes', !!pdpReady && !crashed(d));
    ok('C3 · zero page errors on the deep link', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  /* ── D · NEGATIVE CONTROL: the thin v163 payload must not crash the new client ── */
  {
    const { w, errors, server } = await boot({ hash: '#/product/p_stud_m1', thin: true });
    const d = w.document;
    const pdpReady = await until(() => d.querySelector('.pd-info h1') && d.querySelector('.miy-btn'));
    ok('D1 · PDP renders even on the THIN v163 payload (no sizes key at all)', !!pdpReady);
    ok('D2 · thin-payload PDP never shows "Something slipped"', !!pdpReady && !crashed(d));
    ok('D3 · thin-payload PDP shows 1 gallery slide, no size row, live price', !!pdpReady
      && d.querySelectorAll('#galTrack .gal-slide').length === 1 && !d.querySelector('#sizeRow')
      && /₹/.test(d.querySelector('.pd-pricebox').textContent));
    ok('D4 · zero page errors on the thin payload', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  const fails = results.filter(r => !r).length;
  console.log(`\nv164-pdp: ${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS FATAL:', e); process.exit(1); });
