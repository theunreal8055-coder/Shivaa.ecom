/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v157 RENDER SWEEP — the sweep that finds what grep cannot.
   Boots the real shell, renders every B2C route, and reports EVERY "Jaipur"
   occurrence in the rendered text or markup (case-insensitive: the survivor
   v156 missed was an uppercase `LIVE JAIPUR RATE` whose word order escaped
   an exact-string list).

   A hit FAILS the gate unless the surrounding context is real geography —
   a pickup city pair, the city chips, the Jayal/Nagaur counter, or a
   reviewer's hometown. (That allow-list is why this is a gate and not a
   grep: the brand must die, the places must live.)

   Run: node tools/mega/smoke/v157-render.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v157-render.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
if (!/refreshComparePage/.test((function () {
  try { const _f = require('fs'), _p = require('path');
    const _c = process.env.SMOKE_CMS || _p.resolve(__dirname, '..', '..', '..', 'cms');
    return _f.readFileSync(_p.join(_c, 'js/app.js'), 'utf8'); } catch (e) { return ''; }
})())) { console.log('SKIP — pre-v157 tree: nothing to sweep for yet'); process.exit(0); }

const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const APP_SRC = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const HTML_SRC = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 8000) => { const t0 = Date.now(); for (;;) { let v = null; try { v = await f(); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(25); } };

const GEO = /Sneha Kulkarni|Nagaur|Jayal|Jodhpur|Ajmer|Sujangarh|Didwana|Merta|Ladnun|pickup/i;
const RATES = () => ({ t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 }, jaipur: { gold24: 15482, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold24: 398, gold: 55, silver: 3 }, rtgs: { rows: {} },
  history: [{ t: new Date(Date.now() - 3600e3).toISOString(), gold24: 15100, gold22: 14200, gold18: 11340, silver: 236 },
            { t: new Date().toISOString(), gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 }], marketHours: true });

(async () => {
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
  const vc = new VirtualConsole();
  const dom = new JSDOM(HTML_SRC, {
    url: origin + '/#/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.fetch = async (input) => {
        const p = new URL(String(input), origin).pathname;
        const json = o => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => o, text: async () => JSON.stringify(o) });
        if (p === '/api/settings') return json({ ...DB.settings, guestCheckout: false });
        if (p === '/api/products') return json({ products: DB.products });
        if (p.startsWith('/api/products/')) return json({ product: DB.products.find(x => x.id === decodeURIComponent(p.split('/').pop())), reviews: [], similar: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json(RATES());
        if (p === '/api/pay/config') return json({ mode: 'demo', env: 'sandbox', lockMinutes: 20, codFeePct: 0, currency: 'INR' });
        if (p.includes('pincode')) return json({ ok: true, city: 'Shivaa', eta: '2-3 days', cod: true });
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
      w.localStorage.setItem('shv_cart', JSON.stringify([{ id: DB.products[0].id, qty: 1, size: '14' }]));
      w.localStorage.setItem('shv_compare', JSON.stringify([DB.products[0].id, DB.products[1].id]));
      w.localStorage.setItem('shv_wish', JSON.stringify([DB.products[2].id]));
    },
  });
  const w = dom.window, d = w.document;
  await until(() => d.querySelector('#view') && d.querySelector('#view').innerHTML.length > 500);

  const routes = ['#/', '#/shop', '#/rates', '#/cart', '#/compare', '#/buyback', '#/savings', '#/services', '#/about',
    '#/faq', '#/contact', '#/privacy', '#/terms', '#/shipping', '#/refund', '#/care', '#/sizer', '#/giftcard', '#/refer',
    '#/pickup', '#/videoconsult', '#/bundle', '#/finale', '#/wishlist', '#/quote', '#/trust', '#/hallmark',
    '#/certificates', '#/size-guide', '#/account', '#/track', '#/login',
    '#/product/' + DB.products[0].id, '#/shop?cat=rings'];
  const hits = [], geo = [];
  for (const r of routes) {
    w.location.hash = r; await sleep(1400);
    const hay = (d.body.textContent || '') + ' || ' + (d.querySelector('#view') ? d.querySelector('#view').innerHTML : '');
    let i = 0;
    while ((i = hay.toLowerCase().indexOf('jaipur', i)) !== -1) {
      const ctx = hay.slice(Math.max(0, i - 130), i + 130).replace(/\s+/g, ' ');
      (GEO.test(ctx) ? geo : hits).push(r + ' :: …' + ctx + '…');
      i += 6;
    }
  }
  console.log('rendered ' + routes.length + ' B2C routes');
  const uniq = arr => [...new Set(arr.map(s => s.slice(s.indexOf('::'), s.indexOf('::') + 240)))];
  const realHits = uniq(hits), geoHits = uniq(geo);
  for (const g of geoHits) console.log('  ALLOWED (geography)  ' + g.slice(0, 200));
  for (const h of realHits) console.log('  FAIL (rate brand)    ' + h.slice(0, 200));
  const pass = realHits.length === 0 && routes.length === 34;
  console.log(`\n${pass ? 'PASS' : 'FAIL'} — ${geoHits.length} geography mention(s) allowed, ${realHits.length} rate-brand mention(s) left`);
  server.close();
  process.exit(pass ? 0 : 1);
})();
