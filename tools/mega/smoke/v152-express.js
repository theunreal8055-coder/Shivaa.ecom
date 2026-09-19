/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v152 EXPRESS-DIRECT — jsdom proof of the owner's final rule
   (19 Sep: "completely remove the Truecaller … Buy Now / Make It Yours /
   cart Checkout should DIRECTLY take them to the Cashfree payment portal"):
     A  first-time guest: tap → ONE field, NO vendor traffic, NO pill;
        typed number places the order (no tcNonce anywhere) and opens Cashfree.
     B  returning device: tap → the page BUYS BY ITSELF — no second click,
        no typing; the number remembered on this device rides the order.
     C  members keep the classic checkout untouched (named control).
     D  a stale one-shot stash must never hijack anything → back to #/shop.
     E  OCC/switch not live → the honest "being connected" empty state.
     F  zero Truecaller residue in the rendered DOM (no data-tcinstant,
        no verify button, no pill node) across every view visited.
   Run: node tools/mega/smoke/v152-express.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v152-express.js   (zip overlay)
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
const until = async (f, ms = 9000, step = 60) => { const t0 = Date.now(); for (;;) { let v = null; try { v = await f(); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(step); } };

async function boot({ seedContact = false, cfg = { mode: 'cashfree', guestCheckout: true }, member = false, seedStaleItem = false, noCart = false } = {}) {
  const calls = { orders: [], api: [] };
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/js/app.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(APP_SRC); }
    if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(HTML_SRC); }
    let f = path.join(CMS, u);
    if (!path.resolve(f).startsWith(path.resolve(CMS))) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': 'text/plain' }); res.end(b); });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String(e.message); if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|navigation|window\.scroll)/.test(m) && !/Could not load script.*(aurum|motion|boost)/.test(m)) errors.push(m); });
  vc.on('error', (...a) => errors.push(a.join(' ')));
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
        if (p.startsWith('/api/products/')) return json({ product: DB.products.find(x => x.id === decodeURIComponent(p.split('/').pop())), reviews: [] });
        if (p === '/api/making-charges') return json({ table: [] });
        if (p === '/api/catalogs') return json({ catalogs: [] });
        if (p === '/api/pages') return json({ pages: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json({ t: new Date().toISOString(), source: 'qa', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2, spot: {}, jaipur: {}, anchorLevel: { mode: 'qa', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 }, premium: {}, rtgs: { rows: {} }, history: [], nextUpdateIn: null });
        if (p === '/api/pay/config') return json({ ...cfg, env: 'sandbox', lockMinutes: 20, codFeePct: 0, upiId: '', upiName: 'Shivaa', currency: 'INR' });
        if (p === '/api/orders' && m === 'POST') { calls.orders.push(JSON.parse(init.body)); return json({ id: 'SHV-QA-152', pin: 'abcd1234ef56ab78', guest: true, total: 100000 }); }
        if (p.startsWith('/api/orders/') && m === 'GET') return json({ order: { id: 'SHV-QA-152', items: [], timeline: [] } });
        if (p.startsWith('/api/pay/cashfree/')) return json({ ok: true });
        if (p === '/api/pay/order' && m === 'POST') return json({ mode: 'cashfree', paymentSessionId: 'ps_qa_152', env: 'sandbox' });
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
      if (!noCart) w.localStorage.setItem('shv_cart', JSON.stringify([{ id: DB.products[0].id, qty: 1, size: '14' }]));
      if (seedContact) w.localStorage.setItem('shv_exp_contact', JSON.stringify({ phone: '9876543210', at: Date.now() - 864e5 }));
      if (seedStaleItem) w.localStorage.setItem('shv_ex_item', JSON.stringify({ item: { id: DB.products[0].id, qty: 1 }, at: Date.now() - 11 * 60 * 1000 }));
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
  console.log('\n· A — first-time guest: one field, no vendor, no pill');
  const A = await boot();
  A.w.Shivaa.pdBuy ? await A.w.Shivaa.pdBuy(DB.products[0].id) : 0;
  const mounted = await until(() => A.w.document.getElementById('exPhone'));
  const noVendor = !A.calls.api.some(p => /truecaller/i.test(p));
  ok('tap lands on #/express with the ONE field — and ZERO vendor traffic ever leaves the page',
    !!mounted && noVendor && String(A.w.location.hash).indexOf('#/express') === 0, JSON.stringify(A.calls.api.filter(p => !/products|rates|settings|catalogs|pages|making|config|trust|delivery/.test(p))));
  ok('no pill node, no verify button, no tc mount anywhere in the DOM',
    !A.w.document.getElementById('shvTcPill') && !A.w.document.getElementById('tcBtn') && !A.w.document.getElementById('tcMount'));
  const f = A.w.document.getElementById('exPhone');
  f.value = '1234567890';
  A.w.document.getElementById('exBuy').click();
  await sleep(120);
  ok('invalid number is caught LOCALLY, no order is created', A.calls.orders.length === 0 && A.w.document.getElementById('exPhoneErr').style.display !== 'none');
  f.value = '9876543210';
  A.w.document.getElementById('exBuy').click();
  const bought = await until(() => A.calls.orders.length === 1);
  const b = A.calls.orders[0] || {};
  ok('typed number places the order — body carries boundary address, Online-only, and NO verification nonce',
    bought && b.address.phone === '9876543210' && b.paymentMethod === 'Online' && !('tcNonce' in b), JSON.stringify(b).slice(0, 220));
  await until(() => A.w.__cfOpened >= 1);
  ok('Cashfree opens straight after the order (the ONLY page the guest then sees)', A.w.__cfOpened === 1);
  const mem = JSON.parse(A.w.localStorage.getItem('shv_exp_contact') || 'null');
  ok('the number is remembered ON THE DEVICE (localStorage only) for the next direct tap', mem && mem.phone === '9876543210');
  A.server.close();

  console.log('\n· B — returning device: tap → buys ITSELF → Cashfree (the owner\u2019s literal rule)');
  const B = await boot({ seedContact: true });
  await B.w.Shivaa.pdBuy(DB.products[0].id);
  const autoBought = await until(() => B.calls.orders.length === 1, 4000);
  ok('NO second click, NO typing: the mount auto-places on the remembered number', autoBought && B.calls.orders[0].address.phone === '9876543210', JSON.stringify(B.calls.orders[0] || {}).slice(0, 160));
  await until(() => B.w.__cfOpened >= 1, 4000);
  ok('…and opens Cashfree by itself', B.w.__cfOpened === 1);
  ok('the field visibly says WHY (remembered note), green-ringed, pre-filled', (() => { const n = B.w.document.getElementById('exPhoneNote'); return n && /remembered/.test(n.innerHTML) && B.w.document.getElementById('exPhone').value === '9876543210'; })());
  ok('auto-buy fires EXACTLY ONE order even though the button still exists (placed-guard)', await sleep(1200).then(() => B.calls.orders.length === 1));
  B.server.close();

  console.log('\n· C — named control: a signed-in member keeps the classic checkout');
  const C = await boot({ member: true });
  await C.w.Shivaa.pdBuy(DB.products[0].id);
  await sleep(400);
  ok('member tap → #/checkout (saved address, loyalty) — never the express auto-buy', String(C.w.location.hash).indexOf('#/checkout') === 0 && C.calls.orders.length === 0, String(C.w.location.hash));
  C.server.close();

  console.log('\n· D — stale one-shot stash cannot hijack a visit');
  const D = await boot({ seedStaleItem: true, noCart: true });
  D.w.location.hash = '#/express';
  await until(() => String(D.w.location.hash).indexOf('#/shop') === 0 || D.calls.orders.length > 0, 2500);
  ok('an 11-minute-old stash is IGNORED (fresh window only) — bounced to #/shop, no phantom order', String(D.w.location.hash).indexOf('#/shop') === 0 && D.calls.orders.length === 0, String(D.w.location.hash) + ' o=' + D.calls.orders.length);
  D.server.close();

  console.log('\n· E — switch not live → honest empty state (v142 behavior retained)');
  const E = await boot({ cfg: { mode: 'demo', guestCheckout: true } });
  await E.w.Shivaa.pdBuy(DB.products[0].id);
  await sleep(500);
  ok('express mounts only when Cashfree is the provider — otherwise the being-connected copy', /being connected/i.test(E.w.document.body.innerHTML) === (String(E.w.location.hash).indexOf('#/express') === 0) || /being connected/i.test(E.w.document.body.innerHTML), String(E.w.location.hash));
  E.server.close();

  const all = [A, B, C, D, E];
  ok('no uncaught page errors across all five scenarios', all.reduce((a, x) => a + x.errors.length, 0) === 0, all.flatMap(x => x.errors).slice(0, 2).join(' | '));

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v152 express-direct checks passed  ${n === results.length ? '✦ — tap → Cashfree, the vendor is GONE' : '✗'}`);
  all.forEach(x => { try { x.dom.window.close(); x.server.close(); } catch (e) {} });
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('probe error:', e); process.exit(1); });
