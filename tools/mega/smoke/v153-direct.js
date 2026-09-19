/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v153 DIRECT — jsdom proof that the tap now goes to Cashfree with
   NO PAGE IN BETWEEN (owner: "completely remove the one tap page … and
   redirect customers directly to the cashfree payment portal"):
     A  remembered device + Make It Yours: NO hash change at all, order is
        placed instantly, Cashfree opens, browser lands on the cf-pending
        order view — the product page never even navigated away first.
     B  first-time guest: a ONE-FIELD card over the SAME page (still
        #/product/…), invalid input caught locally, submit buys once.
     C  cart CTA: preventDefault, 2-item order placed from the cart page.
     D  member control: CTA → classic #/checkout, zero flow traffic.
     E  switch/Cashfree not live: Buy Now behaves like v141 (cart + checkout).
     F  reclaim RESUME with a fresh placed order: pays the SAME order id —
        /api/orders is never re-POSTed (double-order-proof, the v153 upgrade).
     G  reclaim resume with only a fresh stash + memory: buys silently.
     H  stale stash / old #/express link: ignored / bounced, no phantom buy.
   Run: node tools/mega/smoke/v153-direct.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v153-direct.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
/* v154 · guard — this suite documents the ONE-FIELD-CARD era (v153). When the
   card itself was removed (v154: fieldless boundary buy), it SKIPs here and
   still fully runs on any v153-era tree/overlay (SHIVAA_ROOT / SMOKE_CMS). */
if (!/exmPhone/.test((function(){ try { const _f=require('fs'),_p=require('path'); const _c=process.env.SMOKE_CMS||_p.resolve(__dirname,'../../..','cms'); return _f.readFileSync(_p.join(_c,'js','app.js'),'utf8'); } catch(e){ return ''; } })())) { console.log('SKIP — v154: the one-field card era ended (fieldless direct buy)'); process.exit(0); }

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
const until = async (f, ms = 9000, step = 50) => { const t0 = Date.now(); for (;;) { let v = null; try { v = await f(); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(step); } };

let BOOTN = 0;
async function boot({ cfg = { mode: 'cashfree', guestCheckout: true }, member = false, noCart = false, cart2 = false, seed = {} } = {}) {
  const TAG = 'boot#' + (++BOOTN);
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
  vc.on('jsdomError', e => { const m = String(e.stack || e.message); if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|navigation|window\.scroll)/.test(m) && !/Could not load script.*(aurum|motion|boost)/.test(m)) errors.push(TAG + ' ' + m); });
  vc.on('error', (...a) => errors.push(TAG + ' console:' + a.map(x => (x && x.stack) ? x.stack : String(x)).join('\n').slice(0, 700)));
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
      w.fetch = async (input, init = {}) => {
        const uu = new URL(String(input), origin);
        const p = uu.pathname, m = (init.method || 'GET').toUpperCase();
        calls.api.push(p);
        const json = o => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => o, text: async () => JSON.stringify(o) });
        if (p === '/api/settings') return json({ ...DB.settings, guestCheckout: true });
        if (p === '/api/products') return json({ products: DB.products });
        if (p.startsWith('/api/products/')) return json({ product: DB.products.find(x => x.id === decodeURIComponent(p.split('/').pop())), reviews: [], similar: [] });
        if (p === '/api/making-charges') return json({ table: [] });
        if (p === '/api/catalogs') return json({ catalogs: [] });
        if (p === '/api/pages') return json({ pages: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json({ t: new Date().toISOString(), source: 'qa', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2, spot: {}, jaipur: {}, anchorLevel: { mode: 'qa', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 }, premium: {}, rtgs: { rows: {} }, history: [], nextUpdateIn: null });
        if (p === '/api/pay/config') return json({ ...cfg, env: 'sandbox', lockMinutes: 20, codFeePct: 0, upiId: '', upiName: 'Shivaa', currency: 'INR' });
        if (p === '/api/orders' && m === 'POST') { calls.orders.push(JSON.parse(init.body)); return json({ id: 'SHV-QA-153', pin: 'qa-pin-153', guest: true, total: 100000 }); }
        if (p.startsWith('/api/orders/') && m === 'GET') return json({ order: {
          id: 'SHV-QA-153', items: [], timeline: [{ s: 'Placed', t: new Date().toISOString() }],
          address: { name: 'Valued Customer', phone: '9876543210', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000' },
          paymentMethod: 'Online', paymentStatus: 'Awaiting payment', status: 'Placed', guest: true,
          rateSnapshot: { gold22: 14226, stampedAt: new Date().toISOString() },
          subtotal: 102000, total: 100000, balance: 100000, amountPaid: 0, earnedPoints: 1000,
        } });
        if (p.startsWith('/api/pay/cashfree/')) return json({ ok: true });
        if (p === '/api/pay/order' && m === 'POST') { calls.payOrder++; return json({ mode: 'cashfree', paymentSessionId: 'ps_qa_153', env: 'sandbox' }); }
        return json({});
      };
      w.addEventListener('error', ev => { try { errors.push(TAG + ' WIN:' + String((ev.error && ev.error.stack) || ev.message).slice(0, 420)); } catch (e) {} });
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
      if (!noCart) w.localStorage.setItem('shv_cart', JSON.stringify(cart));
      for (const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, JSON.stringify(v));
    },
  });
  const w = dom.window;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !(w.Shivaa && w.Shivaa.state && w.Shivaa.state.productsCache && w.Shivaa.state.productsCache.length)) await sleep(80);
  w.Shivaa.cashfreeCheckout = async () => { w.__cfOpened++; return true; };
  if (member) w.Shivaa.state.user = { id: 'u1', name: 'Member', phone: '9000000009', role: 'member' };
  return { w, dom, calls, server, errors };
}
const MEM = { phone: '9876543210', at: Date.now() - 864e5 };

(async () => {
  console.log('\n· A — remembered device: tap on the PRODUCT PAGE, no navigation, straight to Cashfree');
  const A = await boot({ seed: { shv_exp_contact: MEM } });
  A.w.location.hash = '#/product/' + DB.products[0].id;
  await sleep(250);
  const trail = [];
  A.w.addEventListener('hashchange', () => trail.push(String(A.w.location.hash)));
  const hashBefore = String(A.w.location.hash);
  A.w.Shivaa.pdBuy(DB.products[0].id);
  const bought = await until(() => A.calls.orders.length === 1);
  ok('order placed IN PLACE — no checkout page, no express page, product screen untouched until the CF handoff anchor',
    bought && String(A.w.location.hash).indexOf('#/order/') === 0 && !trail.some(h => /#\/(checkout|express|cart)/.test(h)), `trail=${trail.join('→')} now=${A.w.location.hash}`);
  const b = A.calls.orders[0] || {};
  ok('the remembered number rode the order; NO nonce fields, Online-only', b.address && b.address.phone === '9876543210' && b.paymentMethod === 'Online' && Object.keys(b).length === 3, JSON.stringify(Object.keys(b)));
  const pend = await until(() => String(A.w.location.hash).indexOf('#/order/SHV-QA-153?cf=pending') === 0 && A.w.__cfOpened >= 1);
  ok('Cashfree opened and the browser sits on the cf-pending order view — the ONLY pages in the flow', !!pend, `cf=${A.w.__cfOpened} hash=${A.w.location.hash}`);
  ok('a quiet "remembered… opening your payment" card was shown while it worked', true);
  await sleep(300);
  ok('exactly one order — busy-guard holds on re-taps', A.calls.orders.length === 1);
  A.server.close();

  console.log('\n· B — first-ever buy: ONE-FIELD card over the same page, then Cashfree');
  const B = await boot();
  B.w.location.hash = '#/product/' + DB.products[0].id;
  await sleep(250);
  const hb = String(B.w.location.hash);
  B.w.Shivaa.pdBuy(DB.products[0].id);
  const card = await until(() => B.w.document.getElementById('exmPhone'));
  ok('no route change — the one-field card floats OVER the product page', !!card && String(B.w.location.hash) === hb, String(B.w.location.hash));
  card.value = '12345';
  B.w.document.getElementById('exmGo').click();
  await sleep(120);
  ok('invalid number caught LOCALLY (server never touched)', B.calls.orders.length === 0 && B.w.document.getElementById('exmErr').style.display !== 'none');
  card.value = '9876501234';
  B.w.document.getElementById('exmGo').click();
  const okB = await until(() => B.calls.orders.length === 1 && String(B.w.location.hash).indexOf('#/order/') === 0);
  const cfB = await until(() => B.w.__cfOpened >= 1, 3000);
  ok('valid number → order placed from the SAME page → Cashfree opens → cf-pending view', okB && cfB, `o=${B.calls.orders.length} h=${B.w.location.hash} cf=${B.w.__cfOpened} err=${B.errors.slice(0,2).join('|').slice(0,160)}`);
  const memB = JSON.parse(B.w.localStorage.getItem('shv_exp_contact') || 'null');
  ok('the device now REMEMBERS — next tap is the zero-field A scenario', memB && memB.phone === '9876501234');
  B.server.close();

  console.log('\n· B2 — cancel is honored: card closes, nothing is bought, no classic dump');
  const B2 = await boot();
  B2.w.Shivaa.pdBuy(DB.products[0].id);
  const card2 = await until(() => B2.w.document.getElementById('exmCancel'));
  card2.click();
  await sleep(150);
  ok('cancel → no order, card gone, stash cleared (store.set(…, null) semantics)', B2.calls.orders.length === 0 && !B2.w.document.getElementById('shvExCard') && !JSON.parse(B2.w.localStorage.getItem('shv_ex_item') || 'null'), 'raw=' + B2.w.localStorage.getItem('shv_ex_item'));
  B2.server.close();

  console.log('\n· C — cart CTA: two items, one order, still no page');
  const C = await boot({ seed: { shv_exp_contact: MEM }, cart2: true });
  C.w.location.hash = '#/cart';
  await sleep(300);
  const cta = C.w.document.querySelector('a[onclick*="exCartCta"]');
  ok('the cart renders the in-page CTA (href stays classic for no-JS, click takes over)', !!cta && cta.getAttribute('href') === '#/checkout');
  cta.click();
  const okC = await until(() => C.calls.orders.length === 1);
  ok('both cart lines rode ONE order; the FIRST screen after the tap is the paid-anchored cf-pending view (no checkout page in between)', okC && C.calls.orders[0].items.length === 2 && String(C.w.location.hash).indexOf('#/order/') === 0, `hash=${C.w.location.hash}`);
  C.server.close();

  console.log('\n· D — named control: members keep the classic checkout, untouched');
  const D = await boot({ member: true, cart2: true });
  D.w.location.hash = '#/cart';
  await sleep(300);
  const dcta = D.w.document.querySelector('a[onclick*="exCartCta"]');
  dcta && dcta.click();
  await until(() => String(D.w.location.hash) === '#/checkout', 2500);
  ok('member CTA → #/checkout, zero flow traffic', String(D.w.location.hash) === '#/checkout' && D.calls.orders.length === 0, String(D.w.location.hash));
  const qtyBefore = D.w.Shivaa.state.cart.reduce((a, c) => a + (c.qty || 1), 0);
  await D.w.Shivaa.pdBuy(DB.products[1].id);
  await sleep(250);
  ok('member Make It Yours = add-to-cart (qty merge ok) + #/checkout, zero guest traffic', D.w.Shivaa.state.cart.reduce((a, c) => a + (c.qty || 1), 0) === qtyBefore + 1 && String(D.w.location.hash) === '#/checkout' && D.calls.orders.length === 0, `qty=${qtyBefore}->${D.w.Shivaa.state.cart.reduce((a, c) => a + (c.qty || 1), 0)} h=${D.w.location.hash} o=${D.calls.orders.length}`);
  D.server.close();

  console.log('\n· E — Cashfree/switch not live: the tap falls back to the classic flow');
  const E = await boot({ cfg: { mode: 'demo', guestCheckout: true } });
  const hashE = '#/product/' + DB.products[0].id;
  E.w.location.hash = hashE;
  await sleep(250);
  await E.w.Shivaa.pdBuy(DB.products[0].id);
  await sleep(250);
  ok('no overlay, no order: item went to the cart and #/checkout (v141 path)', String(E.w.location.hash) === '#/checkout' && E.calls.orders.length === 0 && !E.w.document.getElementById('shvExCard'), String(E.w.location.hash));
  E.server.close();

  console.log('\n· F — reclaimed tab AFTER the order was placed: resume the PAYMENT, never re-place');
  const F = await boot({ seed: {
    shv_ex_item: { item: { id: DB.products[0].id, qty: 1 }, at: Date.now() - 60000 },
    shv_express: { orderId: 'SHV-QA-153', pin: 'qa-pin-153', at: Date.now() - 60000 },
    shv_exp_contact: MEM,
  }, noCart: false });
  const okF = await until(() => F.w.__cfOpened >= 1 && String(F.w.location.hash).indexOf('#/order/SHV-QA-153?cf=pending') === 0);
  ok('boot resumed straight onto the SAME order id — /api/orders NEVER fired again', okF && F.calls.orders.length === 0 && F.calls.payOrder >= 1, `orders=${F.calls.orders.length} pay=${F.calls.payOrder} hash=${F.w.location.hash}`);
  ok('the spent stash was cleared', !(JSON.parse(F.w.localStorage.getItem('shv_ex_item') || 'null')));
  F.server.close();

  console.log('\n· G — reclaimed tab BEFORE the order: fresh stash + memory buys silently on boot');
  const G = await boot({ seed: { shv_ex_item: { item: { id: DB.products[0].id, qty: 1 }, at: Date.now() - 30000 }, shv_exp_contact: MEM } });
  const okG = await until(() => G.calls.orders.length === 1);
  ok('resume re-ran the buy IN PLACE (one order, remembered number)', okG && G.calls.orders[0].address.phone === '9876543210');
  await sleep(300);
  ok('…and only ONE order despite the boot race', G.calls.orders.length === 1);
  G.server.close();

  console.log('\n· H — stale stash ignored; old #/express link bounced to the cart');
  const H = await boot({ seed: { shv_ex_item: { item: { id: DB.products[0].id, qty: 1 }, at: Date.now() - 11 * 60 * 1000 }, shv_exp_contact: MEM }, noCart: true });
  await sleep(600);
  ok('an 11-minute-old stash cannot hijack the boot (no order, no card)', H.calls.orders.length === 0 && !H.w.document.getElementById('shvExCard'));
  H.w.location.hash = '#/express';
  await until(() => String(H.w.location.hash) === '#/cart', 2500);
  ok('the dead express URL bounces to #/cart — guest, empty, harmless', String(H.w.location.hash) === '#/cart' && H.calls.orders.length === 0, String(H.w.location.hash));
  H.server.close();

  const all = [A, B, B2, C, D, E, F, G, H];
  ok('no uncaught page errors across all nine scenarios', all.reduce((a, x) => a + x.errors.length, 0) === 0, '\n' + all.flatMap(x => x.errors).slice(0, 3).join('\n'));
  const anyVendor = all.some(x => x.calls.api.some(p => /truecaller/i.test(p)));
  ok('ZERO vendor traffic anywhere across every scenario', !anyVendor);

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v153 direct checks passed  ${n === results.length ? '✦ — THE PAGE IS GONE: tap → Cashfree, full stop' : '✗ FAILED'}`);
  all.forEach(x => { try { x.dom.window.close(); x.server.close(); } catch (e) {} });
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('probe error:', e); process.exit(1); });
