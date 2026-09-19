/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v154 DIRECT-FIELDLESS — jsdom proof of the final rule: after a tap
   on Buy Now / Make It Yours / cart-or-sidebar Checkout a shopper sees NO
   input, NO page, NO card of ours — only a one-line "Opening your Cashfree
   payment…" status and then Cashfree itself. A BRAND-NEW device gets the
   same zero-typing treatment (the boundary order rides the canonical
   signature; Cashfree collects the real contact on its own page).
     A  fresh device, product tap: zero <input>s ever mount inside the flow
        overlay, sentinel boundary order, pay/order handoff, and NO
        device-memory key is written anymore.
     B  cart CTA with two pieces: one order, both lines, still zero typing.
     C  a refused order (server says no): honest toast, no navigation dump,
        overlay cleared — the shopper is left exactly where they were.
     D  members: classic #/checkout (named control, unchanged).
     E  switch off / Cashfree not live: v141 behaviour (cart + checkout).
     F  reclaim resume AFTER the order: pays the SAME id, orders never re-fires.
     G  reclaim resume BEFORE the order: completes silently (no memory needed).
     H  stale stash ignored; the dead #/express link bounces; zero vendor.
   Run: node tools/mega/smoke/v154-direct.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v154-direct.js   (zip overlay)
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
const until = async (f, ms = 9000, step = 40) => { const t0 = Date.now(); for (;;) { let v = null; try { v = await f(); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(step); } };

async function boot({ cfg = { mode: 'cashfree', guestCheckout: true }, member = false, cart2 = false, failOrders = false, seed = {} } = {}) {
  const calls = { orders: [], payOrder: 0, api: [] };
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
  vc.on('jsdomError', e => { const m = String(e.stack || e.message); if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|navigation|window\.scroll)/.test(m) && !/Could not load script.*(aurum|motion|boost)/.test(m)) errors.push(m); });
  vc.on('error', (...a) => errors.push(a.map(x => (x && x.stack) ? x.stack : String(x)).join(' ').slice(0, 300)));
  const cart = [{ id: DB.products[0].id, qty: 1, size: '14' }];
  if (cart2) cart.push({ id: DB.products[1].id, qty: 2 });
  const dom = new JSDOM(HTML_SRC, {
    url: origin + '/#/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) QA' });
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.__cfOpened = 0;
      /* the card-era regression tripwire: inputs count ONLY when they live
         inside the flow overlay — the login modal or classic checkout may
         legitimately have fields; the flow must never get one back. */
      w.__exInputs = 0;
      const countEx = nd => {
        try {
          if (!nd || nd.nodeType !== 1) return 0;
          let root = null;
          if (nd.id === 'shvExCard') root = nd;
          else if (nd.closest) root = nd.closest('#shvExCard');
          if (!root && nd.querySelectorAll && (nd.querySelector('#shvExCard'))) root = nd.querySelector('#shvExCard');
          return root ? root.querySelectorAll('input,select,textarea').length : 0;
        } catch (e) { return 0; }
      };
      w.fetch = async (input, init = {}) => {
        const uu = new URL(String(input), origin);
        const p = uu.pathname, m = (init.method || 'GET').toUpperCase();
        calls.api.push(p);
        const json = (o, status = 200, isOk = true) => ({ ok: isOk, status, headers: { get: () => 'application/json' }, json: async () => o, text: async () => JSON.stringify(o) });
        if (p === '/api/settings') return json({ ...DB.settings, guestCheckout: true });
        if (p === '/api/products') return json({ products: DB.products });
        if (p.startsWith('/api/products/')) return json({ product: DB.products.find(x => x.id === decodeURIComponent(p.split('/').pop())), reviews: [], similar: [] });
        if (p === '/api/making-charges') return json({ table: [] });
        if (p === '/api/catalogs') return json({ catalogs: [] });
        if (p === '/api/pages') return json({ pages: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json({ t: new Date().toISOString(), source: 'qa', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2, spot: {}, jaipur: {}, anchorLevel: { mode: 'qa', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 }, premium: {}, rtgs: { rows: {} }, history: [], nextUpdateIn: null });
        if (p === '/api/pay/config') return json({ ...cfg, env: 'sandbox', lockMinutes: 20, codFeePct: 0, upiId: '', upiName: 'Shivaa', currency: 'INR' });
        if (p === '/api/orders' && m === 'POST') {
          calls.orders.push(JSON.parse(init.body));
          if (failOrders) return json({ error: 'QA forced refusal' }, 400, false);
          return json({ id: 'SHV-QA-154', pin: 'qa-pin-154', guest: true, total: 100000 });
        }
        if (p.startsWith('/api/orders/') && m === 'GET') return json({ order: {
          id: 'SHV-QA-154', items: [], timeline: [{ s: 'Placed', t: new Date().toISOString() }],
          address: { name: 'Valued Customer', phone: '9999999999', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000' },
          paymentMethod: 'Online', paymentStatus: 'Awaiting payment', status: 'Placed', guest: true,
          rateSnapshot: { gold22: 14226, stampedAt: new Date().toISOString() },
          subtotal: 102000, total: 100000, balance: 100000, amountPaid: 0, earnedPoints: 1000,
        } });
        if (p.startsWith('/api/pay/cashfree/')) return json({ ok: true });
        if (p === '/api/pay/order' && m === 'POST') { calls.payOrder++; return json({ mode: 'cashfree', paymentSessionId: 'ps_qa_154', env: 'sandbox' }); }
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
      w.localStorage.setItem('shv_cart', JSON.stringify(cart));
      for (const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, JSON.stringify(v));
      w.addEventListener('DOMContentLoaded', () => {
        try {
          new w.MutationObserver(ms => {
            for (const t of ms) for (const nd of t.addedNodes) w.__exInputs += countEx(nd);
          }).observe(w.document.body, { childList: true, subtree: true });
        } catch (e) {}
      });
    },
  });
  const w = dom.window;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !(w.Shivaa && w.Shivaa.state && w.Shivaa.state.productsCache && w.Shivaa.state.productsCache.length)) await sleep(80);
  w.Shivaa.cashfreeCheckout = async () => { w.__cfOpened++; return true; };
  if (member) w.Shivaa.state.user = { id: 'u1', name: 'Member', phone: '9000000009', role: 'member' };
  return { w, dom, calls, server, errors };
}

(async () => {
  console.log('\n· A — BRAND-NEW device: tap → zero typing → Cashfree');
  const A = await boot();
  A.w.location.hash = '#/product/' + DB.products[0].id;
  await sleep(250);
  const hashBefore = String(A.w.location.hash);
  A.w.Shivaa.pdBuy(DB.products[0].id);
  const bought = await until(() => A.calls.orders.length === 1);
  const b = A.calls.orders[0] || {};
  ok('the boundary order left the page IMMEDIATELY — no card, no prompt, no pause',
    bought && String(A.w.location.hash) === hashBefore && b.address && b.address.phone === '9999999999' && b.address.name === 'Valued Customer' && b.paymentMethod === 'Online',
    JSON.stringify(b).slice(0, 200));
  ok('ZERO form fields ever mounted inside the flow overlay', A.w.__exInputs === 0, 'saw ' + A.w.__exInputs);
  const cfA = await until(() => A.w.__cfOpened >= 1, 3000);
  ok('Cashfree handoff fired (pay/order → checkout open), shopper never left the product screen', !!cfA && String(A.w.location.hash) === hashBefore, `cf=${A.w.__cfOpened} hash=${A.w.location.hash}`);
  ok('NO device-memory key is written anymore (nothing to remember)', !A.w.localStorage.getItem('shv_exp_contact'));
  A.server.close();

  console.log('\n· B — cart CTA: two pieces, one silent order');
  const B = await boot({ cart2: true });
  B.w.location.hash = '#/cart';
  await sleep(300);
  const hb = String(B.w.location.hash);
  B.w.document.querySelector('a[onclick*="exCartCta"]').click();
  const okB = await until(() => B.calls.orders.length === 1);
  ok('both lines rode ONE boundary order from the cart page (no navigation first)',
    okB && B.calls.orders[0].items.length === 2 && String(B.w.location.hash) === hb, `hash=${B.w.location.hash}`);
  ok('still zero fields in the overlay', B.w.__exInputs === 0);
  B.server.close();

  console.log('\n· C — server refuses: honest toast, no dump, no residue');
  const C = await boot({ failOrders: true });
  C.w.location.hash = '#/product/' + DB.products[0].id;
  await sleep(250);
  const hc = String(C.w.location.hash);
  C.w.Shivaa.pdBuy(DB.products[0].id);
  await until(() => C.calls.orders.length === 1, 3000);
  await sleep(400);
  ok('refusal → overlay cleared, still on the product page, no classic fallback, no pay attempt',
    !C.w.document.getElementById('shvExCard') && String(C.w.location.hash) === hc && C.calls.payOrder === 0, String(C.w.location.hash));
  C.server.close();

  console.log('\n· D — named control: members unchanged');
  const D = await boot({ member: true, cart2: true });
  D.w.location.hash = '#/cart';
  await sleep(300);
  const dcta = D.w.document.querySelector('a[onclick*="exCartCta"]');
  dcta && dcta.click();
  await until(() => String(D.w.location.hash) === '#/checkout', 2500);
  ok('member CTA → #/checkout, zero flow traffic', String(D.w.location.hash) === '#/checkout' && D.calls.orders.length === 0);
  D.server.close();

  console.log('\n· E — switch/provider off: the v141 path');
  const E = await boot({ cfg: { mode: 'demo', guestCheckout: true } });
  E.w.location.hash = '#/product/' + DB.products[0].id;
  await sleep(250);
  await E.w.Shivaa.pdBuy(DB.products[0].id);
  await sleep(250);
  ok('no boundary order when Cashfree is not the provider: addToCart + #/checkout',
    E.calls.orders.length === 0 && String(E.w.location.hash) === '#/checkout' && !E.w.document.getElementById('shvExCard'), String(E.w.location.hash));
  E.server.close();

  console.log('\n· F — reclaimed tab AFTER the order: resume pays, never re-places');
  const F = await boot({ seed: {
    shv_ex_item: { item: { id: DB.products[0].id, qty: 1 }, at: Date.now() - 60000 },
    shv_express: { orderId: 'SHV-QA-154', pin: 'qa-pin-154', at: Date.now() - 60000 },
  } });
  const okF = await until(() => F.calls.payOrder >= 1, 6000);
  ok('boot resumed the payment on the SAME id — /api/orders never re-fired', !!okF && F.calls.orders.length === 0, `pay=${F.calls.payOrder} orders=${F.calls.orders.length}`);
  ok('stash spent', !JSON.parse(F.w.localStorage.getItem('shv_ex_item') || 'null'));
  F.server.close();

  console.log('\n· G — reclaimed tab BEFORE the order: completes silently, no memory needed');
  const G = await boot({ seed: { shv_ex_item: { item: { id: DB.products[0].id, qty: 1 }, at: Date.now() - 30000 } } });
  const okG = await until(() => G.calls.orders.length === 1, 6000);
  ok('resume re-ran the buy with the boundary row (brand-new device, still zero UI)',
    okG && G.calls.orders[0].address.phone === '9999999999' && G.w.__exInputs === 0);
  await sleep(250);
  ok('exactly one order despite the boot race', G.calls.orders.length === 1);
  G.server.close();

  console.log('\n· H — stale stash ignored; dead express link bounces; zero vendor traffic');
  const H = await boot({ seed: { shv_ex_item: { item: { id: DB.products[0].id, qty: 1 }, at: Date.now() - 11 * 60 * 1000 } } });
  await sleep(600);
  ok('an 11-minute-old stash cannot buy anything', H.calls.orders.length === 0 && !H.w.document.getElementById('shvExCard'));
  H.w.location.hash = '#/express';
  await until(() => String(H.w.location.hash) === '#/cart', 2500);
  ok('#/express bounces to #/cart harmlessly', String(H.w.location.hash) === '#/cart' && H.calls.orders.length === 0);
  const all = [A, B, C, D, E, F, G, H];
  ok('no uncaught page errors across all eight scenarios', all.reduce((a, x) => a + x.errors.length, 0) === 0, '\n' + all.flatMap(x => x.errors).slice(0, 3).join('\n'));
  ok('ZERO vendor traffic anywhere, ever', !all.some(x => x.calls.api.some(p => /truecaller/i.test(p))));

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v154 fieldless checks passed  ${n === results.length ? '✦ — TAP → CASHFREE, nothing of ours in between' : '✗ FAILED'}`);
  all.forEach(x => { try { x.dom.window.close(); x.server.close(); } catch (e) {} });
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('probe error:', e); process.exit(1); });
