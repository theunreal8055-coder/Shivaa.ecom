/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v149 INSTANT ONE-TAP — jsdom proof of the owner's two demands:
     "when person clicks checkout or buy now, then they should directly go to
      cashfree"  → the Express page must NEVER open when Truecaller can do its
      job; the tap fires in place, the buy happens in place.
     "it says … reading the number hiccuped, tap try again" → a failed read
      must first be retried by the SERVER (refetch), and only if that fails
      too does the customer see anything — and never a dead end: Express
      takes over with the SAME pending nonce.
   Scenarios (clock compressed 700/3500 → 60/140 ms, /g — BOTH engines):
     A  Make It Yours on Android → no #/express; pill only; late consent
        PLACES the order and opens Cashfree by itself; marker cleared.
     B  “Not now” in the app → quiet handoff to #/express, same nonce
        re-attached, typed fallback shown, NOTHING bought.
     C  server says failed → refetch rescues → the order still buys with the
        SAME nonce — the customer never re-taps (the live hiccup, undone).
     D  refetch ALSO fails → handoff to #/express, which says the v148 loud
        retry message and offers the fresh tap — no silent spinner anywhere.
     E  named control — DESKTOP: tap behaves exactly like v148 (plain
        #/express, no pill, no instant marker): the old path is unregressed.
     F  reclaimed-tab RESUME: a fresh pending instant marker in localStorage
        at boot re-arms the watch and completes the buy on the same nonce.
   Run: node tools/mega/smoke/v149-tc-instant.js
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
const RATES = {
  t: new Date().toISOString(), source: 'qa',
  gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'qa', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [], nextUpdateIn: null,
};
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const ANDROID = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ShivaaQA';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ShivaaQA';

async function runScenario({ ua = ANDROID, resumeSeed = null } = {}) {
  const served = APP_SRC.replace(/slow \? 3500 : 700/g, 'slow ? 140 : 60');
  if (served === APP_SRC) throw new Error('clock replace did not apply');
  const calls = { orders: [], result: 0 };
  const state = { mode: 'wait', refetch: 'none' };   // mode: wait|verified|rejected|failed · refetch: none|verified|failed

  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/js/app.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(served); }
    if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(HTML_SRC); }
    let f = path.join(CMS, u);
    if (!path.resolve(f).startsWith(path.resolve(CMS))) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, b) => {
      if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' });
      res.end(b);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;

  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|navigation|window\.scroll)/.test(String(e.message))) errors.push(String(e.message)); });
  vc.on('error', (...a) => errors.push(a.join(' ')));

  const dom = new JSDOM(HTML_SRC, {
    url: origin + '/#/',
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w.navigator, 'userAgent', { value: ua });
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.__cfOpened = 0;
      w.fetch = async (input, init = {}) => {
        const uu = new URL(String(input), origin);
        const p = uu.pathname, m = (init.method || 'GET').toUpperCase();
        const json = o => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => o, text: async () => JSON.stringify(o) });
        if (p === '/api/settings') return json({ ...DB.settings, guestCheckout: true });
        if (p === '/api/products') return json({ products: DB.products });
        if (p.startsWith('/api/products/')) return json({ product: DB.products.find(x => x.id === decodeURIComponent(p.split('/').pop())), reviews: [] });
        if (p === '/api/making-charges') return json({ table: [] });
        if (p === '/api/catalogs') return json({ catalogs: [] });
        if (p === '/api/pages') return json({ pages: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json(RATES);
        if (p === '/api/pay/config') return json({ mode: 'cashfree', guestCheckout: true, env: 'sandbox', lockMinutes: 20, codFeePct: 0, upiId: '', upiName: 'Shivaa', currency: 'INR' });
        if (p === '/api/auth/truecaller/config') return json({ enabled: true, partnerKey: 'qa-key', callbackUrl: origin + '/api/auth/truecaller/callback', dataWritable: true, lastCallbackAt: 0 });
        if (p === '/api/auth/truecaller/result') {
          calls.result++;
          if (state.mode === 'verified') return json({ verified: true, phone: '9912345678', name: 'QA Buyer' });
          if (state.mode === 'rejected') return json({ verified: false, rejected: true });
          if (state.mode === 'failed') return json({ verified: false, failed: true });
          return json({ verified: false, invoked: true });
        }
        if (p === '/api/auth/truecaller/refetch') {
          if (state.refetch === 'verified') return json({ verified: true, phone: '9912345678', name: 'QA Buyer', retry: true });
          if (state.refetch === 'failed') return json({ verified: false, failed: true, retry: false });
          return json({});
        }
        if (p === '/api/orders' && m === 'POST') { calls.orders.push(JSON.parse(init.body)); return json({ id: 'SHV-QA-1', pin: 'abcd1234ef56ab78', guest: true, total: 100000 }); }
        if (p.startsWith('/api/orders/') && m === 'GET') return json({ order: {
          id: 'SHV-QA-1', items: [], timeline: [{ s: 'Placed', t: new Date().toISOString() }],
          address: { name: 'QA Buyer', phone: '9912345678', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000' },
          paymentMethod: 'Online', paymentStatus: 'Awaiting payment', status: 'Placed', guest: true, rateSnapshot: { gold22: 14226, stampedAt: new Date().toISOString() },
          subtotal: 102000, total: 100000, balance: 100000, amountPaid: 0, earnedPoints: 1000,
        } });
        if (p === '/api/pay/cashfree/status' || p.startsWith('/api/pay/cashfree/')) return json({ ok: true });
        if (p === '/api/pay/order' && m === 'POST') return json({ mode: 'cashfree', paymentSessionId: 'ps_qa_1', env: 'sandbox' });
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => false });
      w.localStorage.setItem('shv_cart', JSON.stringify([{ id: DB.products[0].id, qty: 1, size: '14' }]));
      if (resumeSeed) {
        w.localStorage.setItem('shv_tc_pending', JSON.stringify(resumeSeed.pending));
        if (resumeSeed.item) w.localStorage.setItem('shv_ex_item', JSON.stringify(resumeSeed.item));
      }
    },
  });
  const w = dom.window;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !(w.Shivaa && w.Shivaa.state && w.Shivaa.state.productsCache && w.Shivaa.state.productsCache.length)) await sleep(80);
  if (w.Shivaa) w.Shivaa.cashfreeCheckout = async () => { w.__cfOpened++; return true; };
  const pend = () => { try { return JSON.parse(w.localStorage.getItem('shv_tc_pending') || 'null'); } catch (e) { return null; } };
  const sayText = (id = 'tcStatus') => { const el = w.document.getElementById(id); return el ? String(el.textContent || '') : ''; };
  return { w, dom, server, calls, state, pend, sayText, errors };
}

const until = async (fn, ms = 8000) => { const t = Date.now(); for (;;) { let v = false; try { v = await fn(); } catch (e) {} if (v) return true; if (Date.now() - t > ms) return false; await sleep(60); } };

(async () => {
  console.log('\n· A — Buy Now on Android+Truecaller: NO Express page, the pill, and a late number BUYS by itself');
  const A = await runScenario();
  await until(() => A.w.Shivaa && A.w.Shivaa._tcCfgCache !== undefined, 6000);   // boot warmed the cache → first tap is instant-decidable
  A.w.Shivaa.pdBuy(DB.products[0].id);
  await sleep(400);
  ok('the Express page NEVER opened (owner: “why do you even open this page”)',
    String(A.w.location.hash).indexOf('#/express') !== 0, A.w.location.hash);
  ok('a floating pill is the entire UI', !!A.w.document.getElementById('shvTcPill') && !A.w.document.getElementById('tcBtn'));
  const pendA = A.pend() || {};
  ok('the pending marker carries the INSTANT intent + the exact piece', pendA.mode === 'instant' && pendA.kind === 'item' && pendA.item && pendA.item.id === DB.products[0].id, JSON.stringify(pendA).slice(0, 140));
  A.state.mode = 'verified';
  const boughtA = await until(() => A.calls.orders.length > 0, 10000);
  const cfA = await until(() => A.w.__cfOpened >= 1 && A.w.document.getElementById('cfHandoff'), 6000);
  ok('the late consent placed the order IN PLACE and opened the Cashfree handoff (SDK call + sheet)', boughtA && cfA, `orders=${A.calls.orders.length} cf=${A.w.__cfOpened}`);
  const bodyA = A.calls.orders[0] || {};
  ok('the order used the VERIFIED phone, the boundary address, and the pending nonce — zero typing',
    bodyA.address && bodyA.address.phone === '9912345678' && bodyA.tcNonce === pendA.nonce && bodyA.address.city === 'Pending verification' && bodyA.paymentMethod === 'Online',
    JSON.stringify({ phone: bodyA.address && bodyA.address.phone, city: bodyA.address && bodyA.address.city }));
  ok('the one-shot item and the pending marker are SPENT (no hijack of the next session, no Express detour)',
    await until(() => !A.pend() && A.calls.orders.length === 1) && String(A.w.location.hash).indexOf('#/express') !== 0, A.w.location.hash);
  A.dom.window.close(); A.server.close();

  console.log('\n· B — “Not now” in the app: quiet handoff to Express, same nonce, typed fallback, NOTHING bought');
  const B = await runScenario();
  await until(() => B.w.Shivaa && B.w.Shivaa._tcCfgCache !== undefined, 6000);
  B.w.Shivaa.pdBuy(DB.products[0].id);
  await sleep(300);
  const nonceB = (B.pend() || {}).nonce || '';
  B.state.mode = 'rejected';
  ok('Express takes over with a navigation (never a dead pill)', await until(() => String(B.w.location.hash).indexOf('#/express') === 0));
  ok('the card mounted and re-attached to the SAME pending nonce',
    await until(() => !!B.w.document.getElementById('tcBtn') && !!nonceB && (B.pend() || {}).nonce === nonceB), 6000);
  ok('the typed fallback explains the decline', await until(() => /Not now/.test(B.sayText()), 6000), B.sayText().slice(0, 100));
  ok('nothing was placed behind the scenes', B.calls.orders.length === 0);
  B.dom.window.close(); B.server.close();

  console.log('\n· C — the LIVE “hiccup” case: failed → the server\\u2019s second read SUCCEEDS → still one tap');
  const C = await runScenario();
  await until(() => C.w.Shivaa && C.w.Shivaa._tcCfgCache !== undefined, 6000);
  C.w.Shivaa.pdBuy(DB.products[0].id);
  await sleep(300);
  const nonceC = (C.pend() || {}).nonce || '';
  C.state.mode = 'failed'; C.state.refetch = 'verified';
  const boughtC = await until(() => C.calls.orders.length > 0, 8000);
  ok('the rescue bought through WITHOUT a re-tap and stayed on the same nonce',
    boughtC && (C.calls.orders[0] || {}).tcNonce === nonceC && String(C.w.location.hash).indexOf('#/express') !== 0,
    `orders=${C.calls.orders.length} nonce=${nonceC ? 'kept' : 'gone'} hash=${C.w.location.hash}`);
  ok('and never a double buy', await (async () => { await sleep(700); return C.calls.orders.length === 1; })());
  C.dom.window.close(); C.server.close();

  console.log('\n· D — the refetch ALSO fails: Express inherits and says it LOUD (v148 UX), no dead end');
  const D = await runScenario();
  await until(() => D.w.Shivaa && D.w.Shivaa._tcCfgCache !== undefined, 6000);
  D.w.Shivaa.pdBuy(DB.products[0].id);
  await sleep(300);
  D.state.mode = 'failed'; D.state.refetch = 'failed';
  ok('handed off to Express (the pill cleaned itself up, no stuck overlay)',
    await until(() => String(D.w.location.hash).indexOf('#/express') === 0 && !D.w.document.getElementById('shvTcPill')));
  ok('the Express card says the truth about OUR read and offers a fresh tap',
    await until(() => /hiccuped/.test(D.sayText()) && /Try Truecaller again/.test(String((D.w.document.getElementById('tcBtnText') || {}).textContent || '')), 8000), D.sayText().slice(0, 120));
  ok('nothing was ordered', D.calls.orders.length === 0);
  D.dom.window.close(); D.server.close();

  console.log('\n· E — named control (DESKTOP): v148 behaviour exactly — plain #/express, no pill, no instant marker');
  const E = await runScenario({ ua: DESKTOP });
  await until(() => E.w.Shivaa && E.w.Shivaa._tcCfgCache !== undefined, 6000);
  E.w.Shivaa.pdBuy(DB.products[0].id);
  const navE = await until(() => String(E.w.location.hash).indexOf('#/express') === 0, 3000);
  ok('control: desktop keeps the classic Express page (the gate is Android+Truecaller only)',
    navE && !E.w.document.getElementById('shvTcPill') && ((E.pend() || {}).mode !== 'instant'), `hash=${E.w.location.hash}`);
  ok('control: no pill, no order, no instant resume at boot', E.calls.orders.length === 0 && !/mode.*instant/.test(JSON.stringify(E.pend() || {})));
  E.dom.window.close(); E.server.close();

  console.log('\n· F — reclaimed tab RESUMES: a fresh instant marker at boot completes the buy on the SAME nonce');
  const seed = { nonce: 'shvqa149resumex', at: Date.now(), mode: 'instant', kind: 'cart', item: null };
  const F = await runScenario({ resumeSeed: { pending: seed } });
  F.state.mode = 'verified';   // the consent had already landed while the tab was dead
  const boughtF = await until(() => F.calls.orders.length > 0, 9000);
  ok('boot re-armed the watch and the number that lands STILL buys in zero typing',
    boughtF && (F.calls.orders[0] || {}).tcNonce === seed.nonce && String(F.w.location.hash).indexOf('#/express') !== 0,
    `orders=${F.calls.orders.length} hash=${F.w.location.hash}`);
  ok('no Express page, no pill left behind, marker spent',
    await until(() => !F.pend() && !F.w.document.getElementById('shvTcPill') && String(F.w.location.hash).indexOf('#/express') !== 0));
  F.dom.window.close(); F.server.close();

  const all = [A, B, C, D, E, F];
  ok('no uncaught page errors across all six scenarios', all.reduce((a, x) => a + x.errors.length, 0) === 0,
    all.flatMap(x => x.errors).slice(0, 2).join(' | '));

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v149 instant checks passed  ${n === results.length ? '✦ — tap → Truecaller → CASHFREE, no page in between' : ''}`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('probe error:', e); process.exit(1); });
