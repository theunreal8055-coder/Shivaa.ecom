/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v147 ONE-TAP PROBE — jsdom end-to-end of the owner's ask:
   "Truecaller should AUTOMATICALLY take me to the next page of cashfree".

   It boots the REAL cms/ shell, enters One-Tap Buy from the mini-cart, mounts
   the Truecaller widget, CLICKS it, "returns from the app" with the verified
   number available on the result route — and asserts the page PLACED THE
   ORDER AND OPENED CASHFREE BY ITSELF: no key ever pressed in the phone
   field, the order carried the verified number and the tcNonce, and the
   browser landed on the order page with ?cf=pending.

   Named regression control: the same scenario against a served copy of
   app.js with the single `await doBuy(phone, nonce)` line removed must place
   NO order — proof this gate measures the mechanism, not the fixture.

   Run: node tools/mega/smoke/v147-tc-autobuy.js
   ═══════════════════════════════════════════════════════════════════════ */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const APP_SRC = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const RATES = {
  t: new Date().toISOString(), source: 'qa',
  gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'qa', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [], nextUpdateIn: null,
};
const HTML_SRC = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');

const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };

async function runScenario({ stripAutoBuy }) {
  const calls = { orders: [], pay: [], result: 0 };
  const state = { tcVerified: false };
  const appServed = stripAutoBuy
    ? APP_SRC.replace('await doBuy(phone, nonce);', '/* control: auto-buy line removed */;')
    : APP_SRC;
  if (stripAutoBuy && appServed === APP_SRC) throw new Error('control replace did not apply');

  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/js/app.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      return res.end(appServed);
    }
    let f = path.join(CMS, u === '/' ? 'index.html' : u);
    if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(HTML_SRC); }
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
  /* eslint-disable no-unused-vars */
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
          if (state.tcVerified) return json({ verified: true, phone: '9912345678', name: 'QA Buyer' });
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
        if (p === '/api/pay/order' && m === 'POST') { calls.pay.push(JSON.parse(init.body)); return json({ mode: 'cashfree', paymentSessionId: 'ps_qa_1', env: 'sandbox' }); }
        return json({});
      };
      /* the Truecaller app has the screen: the tab HAS no focus (the real
         state during the round-trip) while the page is still VISIBLE —
         exactly the conditions the 900 ms presence-check must survive */
      Object.defineProperty(w.document, 'hasFocus', { value: () => false });
      w.localStorage.setItem('shv_cart', JSON.stringify([{ id: DB.products[0].id, qty: 1, size: '14' }]));
    },
  });
  const w = dom.window, d = w.document;
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !(w.Shivaa && w.Shivaa.state && w.Shivaa.state.productsCache && w.Shivaa.state.productsCache.length)) await sleep(80);
  if (w.Shivaa) w.Shivaa.cashfreeCheckout = async () => { w.__cfOpened++; return true; };
  return { w, d, calls, state, server, dom, errors };
}

(async () => {
  console.log('\n· one tap: click Verify → return from the app → the page buys itself');
  const s = await runScenario({ stripAutoBuy: false });
  const { w, d, calls, state, server, dom, errors } = s;
  const booted = !!(w.Shivaa && w.Shivaa.state && w.Shivaa.state.productsCache.length > 0);
  ok('the real shell boots for the scenario', booted);
  w.location.hash = '#/express';
  w.dispatchEvent(new w.Event('hashchange'));
  await sleep(900);
  const tcBtn = d.getElementById('tcBtn');
  ok('the Truecaller button mounted on #/express (Android + configured)', !!tcBtn);
  if (!tcBtn) { console.log('  — cannot continue without the button'); process.exit(1); }
  const exPhoneBefore = (d.getElementById('exPhone') || {}).value || '';
  tcBtn.click();
  await sleep(200);
  const st1 = (d.getElementById('tcStatus') || {}).textContent || '';
  ok('tapping opens Truecaller and WAITS (no "type the number" demand yet)',
    /Opening Truecaller/.test(st1) && !/Type the/.test(st1), st1.slice(0, 120));
  ok('the pending nonce is durable in localStorage (survives an Android tab kill)',
    (() => { try { const v = JSON.parse(w.localStorage.getItem('shv_tc_pending') || 'null'); return !!(v && v.nonce && v.at); } catch (e) { return false; } })());
  ok('no order is placed just by tapping (the wait is patient, not eager)', calls.orders.length === 0);

  /* the customer taps Continue in the Truecaller app → Truecaller's server
     POSTs to the callback → the store has the verified number: */
  state.tcVerified = true;
  w.dispatchEvent(new w.Event('focus'));
  const t1 = Date.now();
  while (Date.now() - t1 < 8000 && calls.orders.length === 0) await sleep(60);
  ok('ZERO EXTRA TAPS: the page placed the guest order by ITSELF when the number landed',
    calls.orders.length === 1, 'orders=' + calls.orders.length);
  ok('the order carries the Truecaller phone with NOTHING typed by hand',
    calls.orders[0] && calls.orders[0].address.phone === '9912345678' && exPhoneBefore === '' &&
    d.getElementById('exPhone').value === '9912345678',
    calls.orders[0] ? calls.orders[0].address.phone : '—');
  ok('the order carries the verification nonce (the server-side override trigger)',
    calls.orders[0] && !!calls.orders[0].tcNonce);
  /* payForOrder hands off on a short timer (v133 fresh-session sheet); give
     the chain a beat, then assert the hand-off happened on its own. */
  const t2 = Date.now();
  while (Date.now() - t2 < 6000 && (w.__cfOpened < 1 || !d.getElementById('cfHandoff'))) await sleep(100);
  ok('Cashfree was opened automatically (the one-tap hand-off, sheet visible)',
    calls.pay.length >= 1 && w.__cfOpened >= 1 && !!d.getElementById('cfHandoff'),
    `pay=${calls.pay.length} cf=${w.__cfOpened} sheet=${!!d.getElementById('cfHandoff')}`);
  /* the sheet stays up because in a real browser Cashfree NAVIGATES the tab;
     "Return to my order" is the recovery lane — tap it and the SPA must land
     on the order page with ?cf=pending + the access pin. */
  const cancel = d.getElementById('cfCancel');
  if (cancel) cancel.click();
  const t3 = Date.now();
  while (Date.now() - t3 < 4000 && !/#\/order\//.test(w.location.hash)) await sleep(100);
  ok('the order-page fallback route carries ?cf=pending + the access pin',
    /#\/order\/SHV-QA-1\?cf=pending&pin=/.test(w.location.hash), w.location.hash);
  ok('the verified number is remembered on this device for the next visit',
    (() => { try { return JSON.parse(w.localStorage.getItem('shv_tc_phone') || 'null').phone === '9912345678'; } catch (e) { return false; } })());
  ok('the pending marker is cleared after use (no re-firing on reload)',
    !JSON.parse(w.localStorage.getItem('shv_tc_pending') || 'null'),
    w.localStorage.getItem('shv_tc_pending'));
  ok('no uncaught page errors during the one-tap journey', errors.length === 0, errors.slice(0, 2).join(' | '));
  dom.window.close(); server.close();

  console.log('\n· named regression control (auto-buy line stripped → NO order)');
  const s2 = await runScenario({ stripAutoBuy: true });
  s2.w.location.hash = '#/express';
  s2.w.dispatchEvent(new s2.w.Event('hashchange'));
  await sleep(900);
  const tcBtn2 = s2.d.getElementById('tcBtn');
  let ctrlMsg = 'button missing';
  if (tcBtn2) {
    tcBtn2.click();
    await sleep(200);
    s2.state.tcVerified = true;
    s2.w.dispatchEvent(new s2.w.Event('focus'));
    await sleep(2500);
    ctrlMsg = 'orders=' + s2.calls.orders.length;
  }
  ok('with the doBuy(phone,nonce) line removed NOTHING is placed — the gate truly measures auto-continue',
    s2.calls.orders.length === 0, ctrlMsg);
  s2.dom.window.close(); s2.server.close();

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v147 one-tap checks passed  ${n === results.length ? '✦' : ''}`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('probe error:', e); process.exit(1); });
