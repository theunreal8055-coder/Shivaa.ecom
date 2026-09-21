/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v155 · SILENT-LANE direct test (jsdom, real app boot, stub network).
   What must be TRUE in the browser now:
     · tap → exactly TWO fetches: one /api/orders (canonical boundary row)
       and ONE /api/pay/order mint — then the returned session is OPENED
       directly. No overlay, no sheet, no toast on the happy path.
     · NOTHING of ours ever renders in the lane: #shvExCard (or any sibling of
       the dead busy machinery) appearing AT ALL fails the build — permanent
       tripwire, id-based so it can't false-positive on the order view.
     · a declined handoff lands silently on the order view (retry + QR live
       there); a refused ORDER toasts and stays put; the classic CTAs and the
       reclaim-resume never double-place.
   Run: node tools/mega/smoke/v155-direct.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v155-direct.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
if (!/async function exHandoff/.test((function () {
  try { const _f = require('fs'), _p = require('path');
    const _c = process.env.SMOKE_CMS || _p.resolve(__dirname, '..', '..', '..', 'cms');
    return _f.readFileSync(_p.join(_c, 'js', 'app.js'), 'utf8'); } catch (e) { return ''; }
})())) { console.log('SKIP — pre-v155 tree: the silent handoff (exHandoff) is not in this era'); process.exit(0); }
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
const apiPaths = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 4000, step = 25) => { const t0 = Date.now(); for (;;) { let v = null; try { v = await f(); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(step); } };

async function boot({ cfg = { mode: 'cashfree', guestCheckout: true }, settingsOff = false, member = false, cart2 = false, failOrders = false, noSession = false, seed = {}, hash = '#/' } = {}) {
  const calls = { orders: [], payBodies: [], payOrder: 0, api: [] };
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
  const cart = [{ id: DB.products[0].id, qty: 1, size: '14' }];
  if (cart2) cart.push({ id: DB.products[1].id, qty: 2 });
  const dom = new JSDOM(HTML_SRC, {
    url: origin + '/' + hash, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) QA' });
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.__cfArgs = [];
      /* THE v155 tripwire: the flow's own shell must NEVER materialise again.
         id-scoped so the order view / login modal rendering is never mistaken
         for a regression; catches any FUTURE overlay that reuses the name. */
      w.__exShellSeen = false;
      const flagShell = nd => {
        try {
          if (!nd || nd.nodeType !== 1) return;
          if (nd.id === 'shvExCard') w.__exShellSeen = true;
          if (nd.querySelector && nd.querySelector('#shvExCard')) w.__exShellSeen = true;
          if (nd.closest && nd.closest('#shvExCard')) w.__exShellSeen = true;
        } catch (e) {}
      };
      w.fetch = async (input, init = {}) => {
        const uu = new URL(String(input), origin);
        const p = uu.pathname, m = (init.method || 'GET').toUpperCase();
        calls.api.push(p); apiPaths.push(p);
        const json = (o, status = 200, isOk = true) => ({ ok: isOk, status, headers: { get: () => 'application/json' }, json: async () => o, text: async () => JSON.stringify(o) });
        if (p === '/api/settings') return json({ ...DB.settings, guestCheckout: !settingsOff });
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
          return json({ id: 'SHV-QA-155', pin: 'qa-pin-155', guest: true, total: 100000 });
        }
        if (p.startsWith('/api/orders/') && m === 'GET') return json({ order: {
          id: 'SHV-QA-155', items: [], timeline: [{ s: 'Placed', t: new Date().toISOString() }],
          address: { name: 'Valued Customer', phone: '9999999999', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000' },
          paymentMethod: 'Online', paymentStatus: 'Awaiting payment', status: 'Placed', guest: true,
          rateSnapshot: { gold22: 14226, stampedAt: new Date().toISOString() },
          subtotal: 102000, total: 100000, balance: 100000, amountPaid: 0, earnedPoints: 1000,
        } });
        if (p.startsWith('/api/pay/cashfree/')) return json({ ok: true });
        if (p === '/api/pay/order' && m === 'POST') {
          calls.payOrder++; calls.payBodies.push(JSON.parse(init.body));
          if (noSession) return json({ mode: 'upi-proof', upiId: '' });
          return json({ mode: 'cashfree', paymentSessionId: 'ps_qa_155', env: 'sandbox' });
        }
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
      w.localStorage.setItem('shv_cart', JSON.stringify(cart));
      for (const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, JSON.stringify(v));
      w.addEventListener('DOMContentLoaded', () => {
        try {
          new w.MutationObserver(ms => { for (const t of ms) for (const nd of t.addedNodes) flagShell(nd); })
            .observe(w.document.body, { childList: true, subtree: true });
        } catch (e) {}
      });
    },
  });
  const w = dom.window;
  const t0 = Date.now();
  // v168: campaign studs populate productsCache BEFORE boot has settings.
  // Waiting for length alone races exGate() (guestCheckout is still unknown).
  while (Date.now() - t0 < 15000 && !(w.Shivaa && w.Shivaa.state && w.Shivaa.state.settings &&
    w.Shivaa.state.productsCache.some(p => p.id === DB.products[0].id))) await sleep(80);
  if (!w.Shivaa?.state.settings) throw new Error('Test boot did not finish loading settings');
  w.Shivaa.payCount = 0;
  const _payRaw = w.Shivaa.payForOrder;
  w.Shivaa.payForOrder = async (...args) => { w.Shivaa.payCount++; return _payRaw(...args); };
  w.Shivaa.cashfreeCheckout = async (session, env) => { w.__cfArgs.push([session, env]); return true; };
  try { w.loadExternalScript = async () => false; } catch (e) {}
  if (member) w.Shivaa.state.user = { id: 'u1', name: 'Member', phone: '9000000009', role: 'member' };
  return { w, dom, calls, server, errors };
}
const bootRun = async (opts, fn) => {
  const B = await boot(opts);
  try { await fn(B); } finally { try { B.dom.window.close(); B.server.close(); } catch (e) {} }
  return B.errors;
};
const BDN = { name: 'Valued Customer', phone: '9999999999', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India' };

(async () => {
let allErrors = [];
console.log('· A — first-ever device: tap → TWO fetches → Cashfree. Nothing renders:');
allErrors = allErrors.concat(await bootRun({}, async B => {
  B.w.Shivaa._expressItem = { id: DB.products[0].id, qty: 1 };
  const used = await B.w.Shivaa.exDirect(false);
  await until(() => B.w.__cfArgs.length > 0);
  ok('flow consumed the tap', used === true);
  ok('exactly ONE orders POST carrying the boundary row', B.calls.orders.length === 1
    && Object.entries(BDN).every(([k, v]) => B.calls.orders[0].address[k] === v) && B.calls.orders[0].paymentMethod === 'Online',
    JSON.stringify(B.calls.orders[0] && B.calls.orders[0].address));
  ok('exactly ONE pay/order mint (v133 double-mint is lane-gone)', B.calls.payOrder === 1, 'pay=' + B.calls.payOrder);
  ok('the minted session is opened DIRECTLY with it', B.w.__cfArgs.length === 1 && B.w.__cfArgs[0][0] === 'ps_qa_155' && B.w.__cfArgs[0][1] === 'sandbox');
  ok('NO overlay of ours ever appeared (tripwire)', B.w.__exShellSeen === false);
  ok('no status text leaked into the body', !/Opening your Cashfree payment|Taking you to secure|Do not close this tab/.test(B.w.document.body.textContent || ''));
  ok('page never navigated on the happy path', String(B.w.location.hash).indexOf('#/order') !== 0 && B.w.location.hash !== '#/checkout');
  const sv = JSON.parse(B.w.localStorage.getItem('shv_express') || 'null');
  ok('reclaim stash written (orderId + pin + time), item stash cleared', !!sv && sv.orderId === 'SHV-QA-155' && sv.pin === 'qa-pin-155' && B.w.localStorage.getItem('shv_ex_item') === 'null', JSON.stringify(sv));
}));

console.log('\n· B — handoff declines → the order view receives them SILENTLY:');
allErrors = allErrors.concat(await bootRun({ noSession: true }, async B => {
  B.w.Shivaa._expressItem = { id: DB.products[0].id, qty: 1 };
  await B.w.Shivaa.exDirect(false);
  await until(() => String(B.w.location.hash).includes('cf=pending'));
  ok('lands on #/order/<id>?cf=pending&pin (retry + QR live there)', B.w.location.hash === '#/order/SHV-QA-155?cf=pending&pin=qa-pin-155', B.w.location.hash);
  ok('no SDK open attempted, no overlay, no error toast', B.w.__cfArgs.length === 0 && B.w.__exShellSeen === false
    && !/QA forced refusal|could not start/.test(B.w.document.body.textContent || ''));
}));

console.log('\n· C — the ORDER itself is refused → honest toast, nothing else:');
allErrors = allErrors.concat(await bootRun({ failOrders: true }, async B => {
  B.w.Shivaa._expressItem = { id: DB.products[0].id, qty: 1 };
  await B.w.Shivaa.exDirect(false);
  await until(() => /QA forced refusal/.test(B.w.document.body.textContent || ''));
  ok('toast shown, page untouched, no pay call, no stash', /QA forced refusal/.test(B.w.document.body.textContent || '')
    && B.calls.payOrder === 0 && B.w.location.hash === '#/' && B.w.localStorage.getItem('shv_express') === null);
}));

console.log('\n· D — cart CTA: 2 lines → ONE boundary order, ONE mint:');
allErrors = allErrors.concat(await bootRun({ cart2: true }, async B => {
  await B.w.Shivaa.exDirect(true);
  await until(() => B.w.__cfArgs.length > 0);
  ok('one order, two items, sentinel address, single mint', B.calls.orders.length === 1 && B.calls.orders[0].items.length === 2
    && B.calls.orders[0].address.phone === '9999999999' && B.calls.payOrder === 1);
}));

console.log('\n· E — the owner disarms: lane never opens:');
allErrors = allErrors.concat(await bootRun({ settingsOff: true }, async B => {
  const used = await B.w.Shivaa.exDirect(true);
  ok('switch off → exDirect declines, no order, no pay', used === false && B.calls.orders.length === 0 && B.calls.payOrder === 0);
}));
allErrors = allErrors.concat(await bootRun({ cfg: { mode: 'demo', guestCheckout: true } }, async B => {
  const used2 = await B.w.Shivaa.exDirect(false);
  ok('provider not cashfree → declines too (gate pairs switch+provider)', used2 === false && B.calls.orders.length === 0);
}));

console.log('\n· F — reclaimed tab RESUMES the payment, silently, exactly once:');
{ const at = Date.now() - 60 * 1000;
allErrors = allErrors.concat(await bootRun({ seed: { shv_express: { orderId: 'SHV-QA-155', pin: 'qa-pin-155', at }, shv_ex_item: { item: { id: DB.products[0].id, qty: 1 }, at } } }, async B => {
  await until(() => String(B.w.location.hash).includes('cf=pending'), 12000);
  ok('boot resume: order view lands FIRST', B.w.location.hash === '#/order/SHV-QA-155?cf=pending&pin=qa-pin-155', B.w.location.hash);
  ok('NO re-place (orders POST = 0) and exactly ONE silent mint', B.calls.orders.length === 0 && B.calls.payOrder === 1, `orders=${B.calls.orders.length} pay=${B.calls.payOrder}`);
  ok('and the classic payForOrder never fired for it', B.w.Shivaa.payCount === 0);
  ok('no overlay during resume', B.w.__exShellSeen === false);
})); }

console.log('\n· G — stale stash: boot walks away and cleans up:');
{ const at = Date.now() - 60 * 60 * 1000;
allErrors = allErrors.concat(await bootRun({ seed: { shv_ex_item: { item: { id: DB.products[0].id, qty: 1 }, at } } }, async B => {
  await sleep(600);
  ok('nothing fires, stash cleared', B.calls.orders.length === 0 && JSON.parse(B.w.localStorage.getItem('shv_ex_item') || 'null') === null);
})); }

console.log('\n· H — double-tap storm: one order, one mint, no overlay:');
allErrors = allErrors.concat(await bootRun({}, async B => {
  B.w.Shivaa._expressItem = { id: DB.products[0].id, qty: 1 };
  const rs = await Promise.all([B.w.Shivaa.exDirect(false), B.w.Shivaa.exDirect(false), B.w.Shivaa.exDirect(false)]);
  await until(() => B.w.__cfArgs.length > 0);
  ok('EX.busy eats the extras', rs.filter(Boolean).length === 1 && B.calls.orders.length === 1 && B.calls.payOrder === 1);
}));

console.log('\n· I — member + #/express bounce + total quiet:');
allErrors = allErrors.concat(await bootRun({ member: true }, async B => {
  const used = await B.w.Shivaa.exDirect(true);
  ok('signed-in members keep the classic lane', used === false && B.calls.orders.length === 0);
}));
allErrors = allErrors.concat(await bootRun({ hash: '#/express' }, async B => {
  await sleep(700);
  ok('old #/express URL bounces a guest to #/cart harmlessly', B.w.location.hash === '#/cart' && B.calls.orders.length === 0);
}));
ok('ZERO uncaught page errors across every scenario', allErrors.length === 0, allErrors.slice(0, 2).join(' | ').slice(0, 400));
ok('ZERO vendor traffic EVER crossed the wire (no truecaller, no tc endpoints)', !apiPaths.some(x => /truecaller|\/api\/tc|tc[-\/]verif/i.test(x)));

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} v155 silent-lane checks passed  ${pass === results.length ? '✦ — TAP → two fetches → CASHFREE. We render nothing.' : '✗ FAILED'}`);
process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('harness error:', e); process.exit(1); });
