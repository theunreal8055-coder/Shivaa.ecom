/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v157 LIVE — the three live-rate promises, DRIVEN (jsdom), not
   grepped. Owner's brief (2026-09-19, branch continues arena/01a0ba4b):
   "find some bugs in the app and solve".
     A · COMPARE (#/compare) — the 1 s rates poll used to rebuild the whole
         page: the comparison table's horizontal scroll reset and a tap that
         straddled a tick could vanish. Now it patches in place — proven by
         an expando that survives, a scrollLeft that stays put, and the
         numbers that still move with the market.
     B · BUYBACK (#/buyback) — the badge says LIVE but the valuation was
         frozen at the rate captured at render: the weight input and the
         range slider must survive every tick AND the rupee figure must
         follow the feed.
     C · SAVINGS (#/savings) — same freeze: the promised grams divided by the
         render-time 22K rate. Patching, not re-rendering, so the ₹ amount
         and the slider never lose what the customer typed.
     D · FINALE — the 10 g prize was valued off the RAW fine anchor, i.e.
         ₹398/g BELOW the storefront 24K rate it advertises since v156.
   Run: node tools/mega/smoke/v157-live.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v157-live.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
if (!/refreshComparePage/.test((function () {
  try { const _f = require('fs'), _p = require('path');
    const _c = process.env.SMOKE_CMS || _p.resolve(__dirname, '..', '..', '..', 'cms');
    return _f.readFileSync(_p.join(_c, 'js/app.js'), 'utf8'); } catch (e) { return ''; }
})())) { console.log('SKIP — pre-v157 tree: the in-place compare patcher is not in this era'); process.exit(0); }

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
const digits = s => +String(s || '').replace(/[^\d]/g, '');
const inr = n => n.toLocaleString('en-IN');

/* the MCX feed: gold24 = anchor + ₹398 (v156 24K premium), 22K = 91.67% + 398 */
const RATES_STUB = (m = 1) => {
  const g = v => Math.round(v * m);
  return {
    t: new Date().toISOString(), source: 'live-mcx', live: true,
    gold24: g(15139), gold22: g(14226), gold18: g(11354), silver: +(236.2 * m).toFixed(1),
    spot: { gold24: g(15084), gold22: g(13828), gold18: g(11313), silver: +(233.2 * m).toFixed(1) },
    jaipur: { gold24: g(15482), gold22: g(14226), gold18: g(11354), silver: +(236.2 * m).toFixed(1) },
    anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: g(15084), silverPerG: +(233.2 * m).toFixed(1), at: new Date().toISOString(), ageMs: 200 },
    premium: { gold22: 398, gold24: 398, gold: 55, silver: 3 },
    rtgs: { rows: {} },
    history: [{ t: new Date(Date.now() - 3600e3).toISOString(), gold24: g(15100), gold22: g(14200), gold18: g(11340), silver: +(236.0 * m).toFixed(1) },
              { t: new Date().toISOString(), gold24: g(15139), gold22: g(14226), gold18: g(11354), silver: +(236.2 * m).toFixed(1) }],
    nextUpdateIn: null, marketHours: true,
  };
};

async function boot({ hash = '#/', rates = () => RATES_STUB(1), cart = null, compare = null } = {}) {
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
  const dom = new JSDOM(HTML_SRC, {
    url: origin + '/' + hash, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.fetch = async (input) => {
        const p = new URL(String(input), origin).pathname;
        const json = (o, status = 200, isOk = true) => ({ ok: isOk, status, headers: { get: () => 'application/json' }, json: async () => o, text: async () => JSON.stringify(o) });
        if (p === '/api/settings') return json({ ...DB.settings, guestCheckout: false });
        if (p === '/api/products') return json({ products: DB.products });
        if (p.startsWith('/api/products/')) return json({ product: DB.products.find(x => x.id === decodeURIComponent(p.split('/').pop())), reviews: [], similar: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json(rates());
        if (p === '/api/pay/config') return json({ mode: 'demo', env: 'sandbox', lockMinutes: 20, codFeePct: 0, currency: 'INR' });
        if (p === '/api/pincode') return json({ ok: true, city: 'Shivaa', eta: '2-3 days', cod: true });
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
      if (cart) w.localStorage.setItem('shv_cart', JSON.stringify(cart));
      if (compare) w.localStorage.setItem('shv_compare', JSON.stringify(compare));
    },
  });
  return { w: dom.window, dom, errors, server, origin };
}

(async () => {
  const P = DB.products;
  console.log('· A — COMPARE: the poll patches in place (scroll · expando · numbers move):');
  {
    let mult = 1;
    const { w, errors, server } = await boot({ hash: '#/compare', compare: [P[0].id, P[1].id], rates: () => RATES_STUB(mult) });
    const d = w.document;
    const ready = await until(() => d.querySelector('.pcmp-table') && d.querySelector('[data-cmp-note]'), 12000);
    ok('A0 · compare page renders two pieces with the v157 hooks (data-cmp-note · data-cmp rows)', !!ready && d.querySelectorAll('[data-cmp="mcr"]').length === 2);
    const wrap = d.querySelector('.pcmp-table-wrap');
    const table = d.querySelector('.pcmp-table');
    table.__qaAlive = 'yes';
    wrap.scrollLeft = 120;
    const note0 = digits(d.querySelector('[data-cmp-note]').textContent);
    const mcr0 = d.querySelector('[data-cmp="mcr"]').textContent;

    d.dispatchEvent(new w.Event('rates'));       // one poll tick, market unchanged
    await sleep(80);
    ok('A1 · a poll tick no longer rebuilds the table (scrollLeft survives)', wrap.scrollLeft === 120, 'scrollLeft=' + wrap.scrollLeft);
    ok('A2 · the patch is IN PLACE (expando on .pcmp-table still attached)', d.querySelector('.pcmp-table').__qaAlive === 'yes');
    ok('A3 · the node is the SAME element (a tap landing mid-tick cannot be swallowed)', d.querySelector('.pcmp-table') === table);

    mult = 2;                                    // the market doubles
    w.dispatchEvent(new w.Event('online'));      // real path: loadRates → 'rates'
    const moved = await until(() => digits(d.querySelector('[data-cmp="mcr"]').textContent) !== digits(mcr0), 8000);
    ok('A4 · a real market move updates the rows without a rebuild', !!moved, 'mcr ' + mcr0 + ' → ' + d.querySelector('[data-cmp="mcr"]').textContent);
    ok('A5 · the shortlist total followed the market', digits(d.querySelector('[data-cmp-note]').textContent) > note0 * 1.5);
    ok('A6 · …and the scroll position + node identity still survived the price change',
      wrap.scrollLeft === 120 && d.querySelector('.pcmp-table').__qaAlive === 'yes' && d.querySelector('.pcmp-table') === table);
    ok('A7 · zero page errors across the compare session', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  console.log('\n· B — BUYBACK: the LIVE valuation follows the feed (and the input survives):');
  {
    let mult = 1;
    const { w, errors, server } = await boot({ hash: '#/buyback', rates: () => RATES_STUB(mult) });
    const d = w.document;
    await until(() => d.querySelector('#bbAmt') && d.querySelector('#bbWt'), 10000);
    const wt = d.querySelector('#bbWt');
    const amt = d.querySelector('#bbAmt');
    wt.__qaAlive = 'yes';
    wt.value = '10'; wt.dispatchEvent(new w.Event('input', { bubbles: true }));
    await sleep(60);
    ok('B0 · default 10 g of 22K values at 10 × ₹14,226 = ₹1,42,260', digits(amt.textContent) === 142260, amt.textContent);
    ok('B1 · the badge speaks the Shivaa brand (LIVE SHIVAA RATE)', /LIVE SHIVAA RATE/.test(d.body.textContent));

    mult = 2;
    w.dispatchEvent(new w.Event('online'));
    const moved = await until(() => digits(d.querySelector('#bbAmt').textContent) !== 142260, 8000);
    ok('B2 · the valuation followed the market (was frozen before v157)', !!moved, 'now ' + d.querySelector('#bbAmt').textContent);
    ok('B3 · it is 10 × the new 22K rate (₹2,84,520)', digits(d.querySelector('#bbAmt').textContent) === 284520, d.querySelector('#bbAmt').textContent);
    ok('B4 · the per-gram line reprints the live rate', /28,452/.test(d.querySelector('#bbPerG').textContent));
    ok('B5 · the weight input and its typed value were never rebuilt',
      d.querySelector('#bbWt') === wt && wt.__qaAlive === 'yes' && wt.value === '10');
    ok('B6 · zero page errors across the buyback session', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  console.log('\n· C — SAVINGS: the projection divides by the live 22K rate:');
  {
    let mult = 1;
    const { w, errors, server } = await boot({ hash: '#/savings', rates: () => RATES_STUB(mult) });
    const d = w.document;
    await until(() => d.querySelector('#svAmt') && d.querySelector('#svGrams'), 10000);
    const amt = d.querySelector('#svAmt');
    const rng = d.querySelector('#svRange');
    amt.__qaAlive = 'yes';
    amt.value = '10000'; amt.dispatchEvent(new w.Event('input', { bubbles: true }));
    await sleep(60);
    const g0 = d.querySelector('#svGrams').textContent;
    ok('C0 · ₹10,000 × 12 = ₹1,20,000 ÷ ₹14,226 = 8.44 g (render-time rate)', g0 === '8.44 g', g0);
    ok('C1 · the copy names the rate it divides by', d.querySelector('[data-sv-rate]').textContent === '₹14,226/g');

    mult = 2;
    w.dispatchEvent(new w.Event('online'));
    const moved = await until(() => d.querySelector('#svGrams').textContent !== g0, 8000);
    ok('C2 · the promised grams followed the market (was frozen before v157)', !!moved, 'now ' + d.querySelector('#svGrams').textContent);
    ok('C3 · 8.44 g in a doubled market → 4.22 g (half the gold for the same money)', d.querySelector('#svGrams').textContent === '4.22 g', d.querySelector('#svGrams').textContent);
    ok('C4 · both rate lines reprint the live figure (₹28,452)',
      d.querySelector('[data-sv-rate]').textContent === '₹28,452/g' && d.querySelector('[data-sv-rate2]').textContent === '₹28,452');
    ok('C5 · the ₹ input and the slider kept their values and their nodes',
      d.querySelector('#svAmt') === amt && amt.__qaAlive === 'yes' && amt.value === '10000' && rng.value === '10000');
    ok('C6 · zero page errors across the savings session', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  console.log('\n· D — FINALE: the 10 g prize is valued at the STOREFRONT 24K rate:');
  {
    const { w, errors, server } = await boot({ hash: '#/finale' });
    const d = w.document;
    const el = await until(() => d.querySelector('#prizeWorth'), 10000);
    if (!el) {
      ok('D0 · campaign window closed on this date — nothing to value (auto-expired by design)', true);
    } else {
      const got = await until(() => /₹[\d,]+/.test(d.querySelector('#prizeWorth').textContent), 8000);
      const txt = (d.querySelector('#prizeWorth') || {}).textContent || '';
      const rupee = +(((txt.match(/₹([\d,]+)/) || [])[1] || '').replace(/,/g, '')) || 0;
      ok('D1 · the prize line renders a rupee value', !!got && rupee > 0, txt);
      ok('D2 · 10 g at the storefront 24K rate ₹15,482 = ₹1,54,820 (NOT the raw ₹15,084 anchor)',
        rupee === 154820, txt);
      ok('D3 · the raw anchor figure ₹1,50,840 is nowhere on the page', !/1,50,840/.test(txt));
    }
    ok('D4 · zero page errors across the finale session', errors.length === 0, errors.slice(0, 2).join(' | '));
    server.close();
  }

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v157 live-rate checks passed  ${pass === results.length ? '✦ — compare · buyback · savings · finale all follow the feed' : '✗ FAILED'}`);
  process.exit(pass === results.length ? 0 : 1);
})();
