/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v148 PATIENCE PROBE — jsdom proof of the owner-reported fix.
   v147 gave up listening ~40 s after the tap; Truecaller's consent landed
   LATER (the live doctor recorded exactly that) → "nothing happens".
   Scenarios (clock compressed 700→60 / 3500→140 ms — mechanism only):
     A  hint appears after the fast window, the watch SURVIVES it, and a late
        verified number still places the order and buys with zero typing.
     B  server-side profile read failed → loud retry state, fresh nonce on
        the next tap, nothing placed behind the scenes.
     C  customer navigates away mid-wait → no hijack; coming BACK
        re-attaches and the verified number finishes the job.
     D  named regression control: with `arm()` swapped for `stop()` at the
        slow transition (the v147 behaviour) the late consent places NOTHING.
   Run: node tools/mega/smoke/v148-tc-patience.js
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

async function runScenario({ control = false } = {}) {
  /* compress the polling clock; the control reproduces v147's give-up */
  let served = APP_SRC.replace('slow ? 3500 : 700', 'slow ? 140 : 60');
  if (served === APP_SRC) throw new Error('clock replace did not apply');
  if (control) {
    const g147 = served.replace('slow = true; arm();', "slow = true; stop(); /* control: v147 gave up here */;");
    if (g147 === served) throw new Error('control replace did not apply');
    served = g147;
  }
  const calls = { orders: [], result: 0 };
  const state = { mode: 'wait' };

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
      Object.defineProperty(w.navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ShivaaQA' });
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
          if (state.mode === 'failed') return json(uu.searchParams.get('nonce') === state.failNonce
            ? { verified: false, failed: true }                /* the DEAD nonce stays failed ... */
            : { verified: false, invoked: true });             /* ... the FRESH retry is a new request */
          if (calls.result > 1) return json({ verified: false, invoked: true });
          return json({ verified: false });
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
    },
  });
  const w = dom.window;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !(w.Shivaa && w.Shivaa.state && w.Shivaa.state.productsCache && w.Shivaa.state.productsCache.length)) await sleep(80);
  if (w.Shivaa) w.Shivaa.cashfreeCheckout = async () => { w.__cfOpened++; return true; };
  w.location.hash = '#/express';
  w.dispatchEvent(new w.Event('hashchange'));
  const t1 = Date.now();
  let tcBtn = null;
  while (Date.now() - t1 < 6000 && !(tcBtn = w.document.getElementById('tcBtn'))) await sleep(80);
  const pend = () => { try { return JSON.parse(w.localStorage.getItem('shv_tc_pending') || 'null'); } catch (e) { return null; } };
  const sayText = () => { const el = w.document.getElementById('tcStatus'); return el ? String(el.textContent || '') : ''; };
  const btnText = () => { const el = w.document.getElementById('tcBtnText'); return el ? String(el.textContent || '') : ''; };
  return { w, dom, server, calls, state, tcBtn, pend, sayText, btnText, errors };
}

(async () => {
  console.log('\n· A — the hint appears, the watch SURVIVES, a late number still buys in zero typing');
  const A = await runScenario();
  ok('widget mounted', !!A.tcBtn);
  A.tcBtn.click();
  const nonceA = (A.pend() || {}).nonce || '';
  ok('tap armed the pending nonce', nonceA.length > 7);
  let sawHint = false;
  for (let i = 0; i < 120 && !sawHint; i++) { await sleep(80); sawHint = /Still waiting on Truecaller/.test(A.sayText()); }
  ok('after the fast window the page offers typing BUT says it keeps listening', sawHint, A.sayText().slice(0, 120));
  ok('the pending marker survives the hint (v147 cleared the will to act; v148 keeps it)', !!(A.pend() || {}).nonce);
  const ordersBeforeLate = A.calls.orders.length;
  A.state.mode = 'verified';
  let bought = false;
  for (let i = 0; i < 100 && !bought; i++) { await sleep(80); bought = A.calls.orders.length > 0; }
  ok('the LATE consent (minutes later) still placed the order by itself', bought && ordersBeforeLate === 0);
  const body = A.calls.orders[0] || {};
  ok('with the verified phone and the nonce — nothing was ever typed',
    !!(body.address && body.address.phone === '9912345678') && body.tcNonce === nonceA,
    JSON.stringify({ phone: body.address && body.address.phone, tcNonce: body.tcNonce ? 'set' : body.tcNonce }));

  console.log('\n· B — server could not read the number: loud retry, fresh nonce, nothing silent');
  const B = await runScenario();
  B.tcBtn.click();
  const nonceB = (B.pend() || {}).nonce || '';
  B.state.failNonce = nonceB;
  B.state.mode = 'failed';
  let sawFail = false;
  for (let i = 0; i < 60 && !sawFail; i++) { await sleep(80); sawFail = /hiccuped/.test(B.sayText()); }
  ok('the failure is TOLD, not waited on forever', sawFail, B.sayText().slice(0, 120));
  ok('the button becomes Try-again and the stale marker is cleared', /Try Truecaller again/.test(B.btnText()) && !B.pend());
  ok('nothing was placed behind the scenes', B.calls.orders.length === 0);
  B.tcBtn.click();
  await sleep(250);
  const nonceB2 = (B.pend() || {}).nonce || '';
  ok('retrying taps through a FRESH verification request (old dead nonce is never reused)', !!nonceB2 && nonceB2 !== nonceB);

  console.log('\n· C — walked away mid-wait: no hijack; coming back finishes the job');
  const C = await runScenario();
  C.tcBtn.click();
  await sleep(150);
  C.w.location.hash = '#/shop';
  C.w.dispatchEvent(new C.w.Event('hashchange'));
  await sleep(500);
  C.state.mode = 'verified';
  await sleep(600);
  ok('a verified number does NOT hijack a customer who navigated away', C.calls.orders.length === 0);
  C.w.location.hash = '#/express';
  C.w.dispatchEvent(new C.w.Event('hashchange'));
  let back = false;
  for (let i = 0; i < 100 && !back; i++) { await sleep(80); back = C.calls.orders.length > 0; }
  ok('returning to One-Tap Buy re-attaches and the verified number BUYS by itself', back);
  ok('the re-attached order carries the remembered nonce', !!((C.calls.orders[0] || {}).tcNonce));

  console.log('\n· D — named control (v147 behaviour: stop() at the hint → the late number buys NOTHING)');
  const D = await runScenario({ control: true });
  D.tcBtn.click();
  let sawHintD = false;
  for (let i = 0; i < 140 && !sawHintD; i++) { await sleep(80); sawHintD = /Still waiting on Truecaller/.test(D.sayText()); }
  ok('control: the give-up point arrives at the same moment as v148 (only the WATCH differs — it dies)', sawHintD, D.sayText().slice(0, 120));
  D.state.mode = 'verified';
  await sleep(1600);
  ok('control: with stop() instead of the patient watch, the late consent places NO order — the gate measures v148 itself',
    D.calls.orders.length === 0, 'orders=' + D.calls.orders.length);

  ok('no uncaught page errors across all four scenarios',
    A.errors.length + B.errors.length + C.errors.length + D.errors.length === 0,
    [A, B, C, D].flatMap(x => x.errors).slice(0, 2).join(' | '));

  for (const x of [A, B, C, D]) { try { x.dom.window.close(); x.server.close(); } catch (e) {} }
  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v148 patience checks passed  ${n === results.length ? '✦' : ''}`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('probe error:', e); process.exit(1); });
