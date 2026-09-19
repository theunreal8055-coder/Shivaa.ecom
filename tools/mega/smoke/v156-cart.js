/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v156 · behavior run (jsdom, real app boot, stub network).
   What must be TRUE in the browser now:
     A · a rates poll on #/cart patches numbers IN PLACE — the pincode the
         customer is typing, its focus, and the live DOM all survive every
         tick (the old wholesale re-render wiped them every 1 s when the
         MCX feed is live).
     B · the ONE structural case (crossing the free-shipping threshold)
         still re-renders, but the half-typed pincode is carried across.
     C · v120 back-button engine: on a BARE shivaa.in/ visit (empty hash),
         opening a drawer pushes EXACTLY ONE history entry no matter how
         many class mutations fly while it stands open; closing consumes
         exactly one Back. (The documented openHash '' leak — now dead.)
     D · the rate card shows BOTH Shivaa desk premiums (+₹398 24K beside
         +₹398 22K), Shivaa-branded everywhere, zero Jaipur rate-brand copy.
     E · zero uncaught page errors across every scenario.
   Run: node tools/mega/smoke/v156-cart.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v156-cart.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
if (!/gold24_premium/.test((function () {
  try { const _f = require('fs'), _p = require('path');
    const _c = process.env.SMOKE_CMS || _p.resolve(__dirname, '..', '..', '..', 'cms');
    return _f.readFileSync(_p.join(_c, 'api.php'), 'utf8'); } catch (e) { return ''; }
})())) { console.log('SKIP — pre-v156 tree: gold24_premium is not in this era'); process.exit(0); }
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
const until = async (f, ms = 6000, step = 25) => { const t0 = Date.now(); for (;;) { let v = null; try { v = await f(); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(step); } };

const RATES_STUB = (m = 1) => {
  const g = v => Math.round(v * m);
  return {
    t: new Date().toISOString(), source: 'live-mcx', gold24: g(15139), gold22: g(14226), gold18: g(11354), silver: +(236.2 * m).toFixed(1),
    spot: { gold24: g(15084), gold22: g(13828), gold18: g(11313), silver: +(233.2 * m).toFixed(1) },
    jaipur: { gold24: g(15482), gold22: g(14226), gold18: g(11354), silver: +(236.2 * m).toFixed(1) },   // v156: 24K = anchor + 398
    anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: g(15084), silverPerG: +(233.2 * m).toFixed(1), at: new Date().toISOString(), ageMs: 200 },
    premium: { gold22: 398, gold24: 398, gold: 55, silver: 3 },
    rtgs: { rows: {} },
    history: [ { t: new Date(Date.now() - 3600e3).toISOString(), gold24: g(15100), gold22: g(14200), gold18: g(11340), silver: +(236.0 * m).toFixed(1) },
               { t: new Date().toISOString(), gold24: g(15139), gold22: g(14226), gold18: g(11354), silver: +(236.2 * m).toFixed(1) } ],
    nextUpdateIn: null, marketHours: true,
  };
};

async function boot({ hash = '#/', rates = RATES_STUB } = {}) {
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
        if (p === '/api/products') return json({ products: DB.products });
        if (p.startsWith('/api/products/')) return json({ product: DB.products.find(x => x.id === decodeURIComponent(p.split('/').pop())), reviews: [], similar: [] });
        if (p === '/api/making-charges') return json({ table: [] });
        if (p === '/api/catalogs') return json({ catalogs: [] });
        if (p === '/api/pages') return json({ pages: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json(rates());
        if (p === '/api/pay/config') return json({ mode: 'demo', env: 'sandbox', lockMinutes: 20, codFeePct: 0, upiId: '', upiName: 'Shivaa', currency: 'INR' });
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
      w.localStorage.setItem('shv_cart', JSON.stringify(cart));
    },
  });
  return { w: dom.window, dom, errors, server, origin };
}

(async () => {
  /* ── A + B · the cart survives the rate poll ─────────────────────────── */
  {
    let mult = 1;
    const { w, errors, server } = await boot({ hash: '#/cart', rates: () => RATES_STUB(mult) });
    const d = w.document;
    const pinReady = await until(() => d.querySelector('[data-pin]') && d.querySelector('[data-cart-sub]'));
    ok('A0 · cart page renders with the v156 data hooks (pincode form + summary hooks)', !!pinReady);
    const pin = () => d.querySelector('[data-pin]');
    pin().value = '341001';
    pin().focus();
    const markEl = d.querySelector('[data-cart-sub]');
    markEl.__qaAlive = 'yes';
    const hero0 = d.querySelector('[data-cart-hero]') && d.querySelector('[data-cart-hero]').textContent;

    d.dispatchEvent(new w.Event('rates'));      // simulate a poll tick
    await sleep(60);
    ok('A1 · pincode VALUE survives a rates tick (old code wiped it every second)', pin() && pin().value === '341001');
    ok('A2 · pincode FOCUS survives the tick (typing is never interrupted)', d.activeElement === pin());
    ok('A3 · the patch is IN PLACE (expando on [data-cart-sub] still attached — no innerHTML rebuild)', d.querySelector('[data-cart-sub]').__qaAlive === 'yes');
    ok('A4 · summary still carries numbers (subtotal hero intact)', !!(d.querySelector('[data-cart-hero]') && d.querySelector('[data-cart-hero]').textContent.length >= (hero0 || '').length - 4));

    /* B — the structural crossing: a market move pushes the total across the
       free-shipping threshold MID-POLL. Driven through the real network path:
       the stub's rates are scaled, then the 'online' event makes the app run
       loadRates() → state.rates updates → 'rates' → refreshCartPage. */
    const pincodeStill = () => d.querySelector('[data-pin]') && d.querySelector('[data-pin]').value === '341001';
    const hadGap = !!d.querySelector('[data-cart-gap]');
    const subTxt = (d.querySelector('[data-cart-sub]') || {}).textContent || '';
    ok('B0 · baseline summary rendered (subtotal present)', /₹|Rs/.test(subTxt) || subTxt.length > 0);
    /* subtotal ≈ weight × rate + making: scaling the stub ×10 (or ÷10)
       always flips the 50,000 free-shipping line from whichever side it was. */
    d.querySelector('[data-cart-sub]').__qaAlive = 'yes';
    pin().value = '341001';
    mult = hadGap ? 10 : 0.1;                        // move the market over the line
    w.dispatchEvent(new w.Event('online'));         // → loadRates() -> stub(mult) -> 'rates' -> refreshCartPage
    const flipped1 = await until(() => !!d.querySelector('[data-cart-gap]') !== hadGap, 5000);
    ok('B1 · a market move crossing free-shipping restructures the summary MID-POLL (gap row flipped)', flipped1);
    ok('B2 · …and the pincode was CARRIED across that structural re-render', pincodeStill());
    ok('B3 · the structural re-render is real (old expando died with the old DOM)', !d.querySelector('[data-cart-sub]').__qaAlive);
    const gap2 = !!d.querySelector('[data-cart-gap]');
    w.dispatchEvent(new w.Event('online'));         // same stub — idempotent: nothing structural should move now
    await sleep(250);
    ok('B4 · a second poll with the SAME market is a calm in-place patch (structure steady)',
      !!d.querySelector('[data-cart-gap]') === gap2 && pincodeStill());
    ok('A+ · zero page errors across cart scenarios', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  /* ── C · v120 openHash '' leak — one open = one entry, period ─────────── */
  {
    const { w, errors, server } = await boot({ hash: '' });   // BARE visit: location.hash === ''
    const d = w.document;
    await until(() => d.querySelector('#mainNav') && w.Shivaa && d.querySelector('#mainNav .dw-row, #mainNav a, #mainNav .nav-list, #mainNav *'));
    await sleep(900);   // let boot settle (its own pushes all land first)
    let pushes = 0, backs = 0;
    const ps = w.history.pushState.bind(w.history), bk = w.history.back.bind(w.history);
    w.history.pushState = (...a) => { pushes++; return ps(...a); };
    w.history.back = (...a) => { backs++; return bk(...a); };
    const nav = d.querySelector('#mainNav');
    const bareHash = w.location.hash === '';
    nav.classList.add('open');
    const onePush = await until(() => pushes === 1, 3000);
    /* now the flood that used to bury Back: class mutations while open */
    for (let i = 0; i < 4; i++) { d.body.classList.toggle('qa-storm', i % 2 === 0); nav.classList.toggle('qa-x', i % 2 === 0); await sleep(30); }
    await sleep(250);
    ok('C1 · bare visit, drawer opens → EXACTLY ONE history entry (the empty-hash leak is dead)',
      bareHash && onePush && pushes === 1, `hash=${JSON.stringify(w.location.hash)} pushes=${pushes}`);
    nav.classList.remove('open'); nav.classList.remove('qa-x');
    const oneBack = await until(() => backs === 1, 3000);
    ok('C2 · X-close consumes exactly ONE Back (same-hash cleanup intact)', oneBack && backs === 1, `backs=${backs}`);
    /* reopen: a second full cycle still accounts cleanly */
    nav.classList.add('open');
    await until(() => pushes === 2, 3000);
    d.body.classList.toggle('qa-storm-2', true); await sleep(120);
    ok('C3 · second open pushes exactly one MORE entry even after more mutations', pushes === 2, `pushes=${pushes}`);
    nav.classList.remove('open');
    await until(() => backs === 2, 3000);
    ok('C4 · second close consumes exactly one more Back', backs === 2, `backs=${backs}`);
    ok('C+ · zero page errors across history scenarios', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  /* ── D · the rate card speaks Shivaa and shows BOTH desk premiums ────── */
  {
    const { w, errors, server } = await boot({ hash: '#/rates' });
    const d = w.document;
    const hero = await until(() => d.querySelector('[data-rr="g22"]'));
    ok('D0 · rates page renders', !!hero);
    await until(() => /24K Shivaa premium/.test(d.body.textContent), 4000);
    const txt = d.body.textContent;
    const i24 = txt.indexOf('24K Shivaa premium'), i22 = txt.indexOf('22K Shivaa premium');
    ok('D1 · 24K Shivaa premium row sits ABOVE the 22K one', i24 >= 0 && i22 > i24);
    ok('D2 · both desk premiums quote +₹398/g (data-rr bound + live text)',
      d.querySelector('[data-rr="prem24"]') && d.querySelector('[data-rr="prem24"]').textContent === '+₹398/g'
      && d.querySelector('[data-rr="prem22"]') && d.querySelector('[data-rr="prem22"]').textContent === '+₹398/g');
    ok('D3 · the 24K rate card carries the premium: ₹15,482/g (= 15,084 anchor + 398)',
      d.querySelector('[data-rr="rc-gold24"]') && d.querySelector('[data-rr="rc-gold24"]').textContent.replace(/[,\s]/g, '').includes('15482'));
    ok('D4 · Shivaa brands rendered (badge · ticker · rate-card tiles)',
      txt.includes('✦ SHIVAA LIVE RATE') && txt.includes('GOLD 24K · SHIVAA') && txt.includes('SHIVAA LIVE'));
    ok('D5 · zero Jaipur rate-brand copy anywhere on the rendered page (geography never renders here)',
      !/Jaipur/i.test(txt));
    /* a live poll patches both premium cells in place */
    const p24 = d.querySelector('[data-rr="prem24"]'); p24.__qaAlive = 1;
    d.dispatchEvent(new w.Event('rates'));
    await sleep(60);
    ok('D6 · a poll patches prem24 in place (v120 Bug-A pattern holds on #/rates too)',
      d.querySelector('[data-rr="prem24"]') && d.querySelector('[data-rr="prem24"]').__qaAlive === 1
      && d.querySelector('[data-rr="prem24"]').textContent === '+₹398/g');
    ok('D+ · zero page errors on the rates page', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v156 behavior checks passed  ${pass === results.length ? '✦ — pincode survives · one-tap history · both premiums live' : '✗ FAILED'}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS FAIL', e); process.exit(1); });
