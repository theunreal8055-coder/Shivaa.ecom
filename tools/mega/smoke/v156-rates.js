/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v156 — RATES BEHAVIOUR check.

   v156-check.js proves what the release SAYS (source, stamps, the API's own
   bytes). This file proves what a shopper SEES — and it exists because of one
   uncomfortable fact from the v156 audit: every rates bug this release fixes
   was invisible to the whole smoke set, because every fixture in it built
   `history` out of the premium-INCLUSIVE block, a payload production has never
   sent. A fixture that repeats the bug's own shape cannot catch the bug.

   So the browser here is not fed a hand-written stub. It is fed the REAL
   /api/rates bytes: api.php is executed against php-wasm with a market this
   file controls (MCX future OFF, four raw anchor stamps, FALLING), and that
   response is what jsdom's fetch answers with. If the server's payload shape
   ever changes, this suite follows it instead of quietly passing on a lie.

     A · the payload        (6)  the server's own bytes, production-shaped,
                                 plus the same server with a rate PINNED
     B · home page          (7)  BUG 1 the phantom premium, BUG 2 the footer's
                                 arithmetic, the render-time brand filter
     C · rates page         (6)  BUG 1 the chart ends ON the card, the 24K
                                 premium rows, the in-place poll patch
     D · pass-throughs      (4)  a legacy cached payload with no premium block,
                                 and a PINNED absolute counter rate
     E · BUG 4 chart guard  (2)  one stamp, one poisoned stamp
     F · BUG 3 back button  (4)  the EMPTY-hash home page: one history entry
                                 per overlay open, one Back press per entry

   Run: node tools/mega/smoke/v156-rates.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v156-rates.js   (zip overlay)
   ══════════════════════════════════════════════════════════════════════════ */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));

const results = [];
function ok(name, pass, detail = '') {
  results.push(!!pass);
  console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + String(detail).split('\n').join('\n          ') : ''}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }
const rupees = s => Number(String(s == null ? '' : s).replace(/[^\d.]/g, ''));
const deep = o => JSON.parse(JSON.stringify(o));

/* ── static server for the real shell (jsdom loads index.html's own assets) ── */
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end();
  fs.readFile(f, (e, b) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
});

/* ══════════════ the market this suite controls ══════════════
   FALLING — the direction the phantom premium hid — and stamped the way the
   server stamps: gold22 is the 91.67% derivation of the same fine-gold anchor,
   so the raw series is internally consistent and every retail number below can
   be checked against it to the rupee. */
const NOW = Math.floor(Date.now() / 1000);
/* Stamps go in EXACTLY the shape now_iso() writes — ISO-8601 with its offset.
   A naive 'YYYY-MM-DD HH:MM:SS' UTC string is read by PHP as IST, the stamp
   then looks 5½ hours old, rates_stale() fires, and the server replaces the
   seeded market with a simulated one clamped to BASE_GOLD × 1.04 — the suite
   would be testing a market it never chose. (This suite caught itself doing
   exactly that: section A printed an anchor of 12,324 instead of the 15,600 it
   had written. Every seeded fixture in this repo must use an offset.) */
const iso = off => new Date((NOW - off + 19800) * 1000).toISOString().slice(0, 19) + '+05:30';
const stamp = (off, gold24, silver) => ({ t: iso(off), gold24, gold22: Math.round(gold24 * 0.9167), gold18: Math.round(gold24 * 0.75), silver, source: 'live' });
const MARKET = [stamp(43200, 15680, 238), stamp(21600, 15650, 237.5), stamp(7200, 15620, 237), stamp(300, 15600, 236)];
const seedMarket = d => {
  d.rates = d.rates || {};
  d.rates.mcx = null;                 // exchange feed OFF: the anchor is the persisted stamp
  d.rates.override = null;            // nothing pinned
  d.rates.last = MARKET[MARKET.length - 1];
  d.rates.history = MARKET.map(s => Object.assign({}, s));
  d.settings = Object.assign({}, d.settings, { guestCheckout: false, gold24Premium: null });
};

/* ══════════════ the interpreter ══════════════ */
let PHP, loadNodeRuntime;
try { ({ PHP } = require('@php-wasm/universal')); ({ loadNodeRuntime } = require('@php-wasm/node')); }
catch (e) { console.log('\nSKIP  @php-wasm/node is not installed — this suite is fed by the real api.php and refuses to fake it.'); process.exit(2); }

async function phpInstance(dir, apiSrc) {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 7 } }));
  php.mkdirTree(dir + '/data'); php.mkdirTree(dir + '/js');
  php.writeFile(dir + '/api.php', apiSrc);
  for (const f of ['hallmark.php', 'trust.php', 'sms.php', 'mail.php', 'sw.js', 'index.html'])
    php.writeFile(dir + '/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  php.writeFile(dir + '/js/app.js', fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8'));
  return async (route, mutate) => {
    /* the db is rewritten before EVERY call: /api/rates may refresh and persist,
       and two calls must start from identical bytes to be comparable. */
    const d = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
    if (mutate) mutate(d);
    php.writeFile(dir + '/data/db.json', JSON.stringify(d));
    const code = `<?php
$_SERVER['REQUEST_METHOD'] = 'GET'; $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_HOST'] = 'www.shivaa.in'; $_SERVER['REQUEST_URI'] = '/api/${route}';
$_GET = ['__route' => '${route}']; $_POST = [];
register_shutdown_function(function () { echo "\\n@@HTTP " . (http_response_code() ?: 200); });
try { include '${dir}/api.php'; } catch (Throwable $e) { echo "\\n@@FATAL " . get_class($e) . ': ' . $e->getMessage(); }
`;
    const out = await php.run({ code });
    const text = Buffer.from(out.bytes).toString();
    const hm = text.match(/@@HTTP (\d+)/), fm = text.match(/@@FATAL ([\s\S]*)/);
    const body = text.replace(/\n?@@HTTP \d+[\s\S]*$/, '').replace(/\n?@@FATAL[\s\S]*$/, '');
    let json = null; try { json = JSON.parse(body); } catch (e) {}
    return { http: hm ? +hm[1] : 0, fatal: fm ? fm[1].trim() : '', json, raw: body };
  };
}

/* ══════════════ the browser harness ══════════════ */
/* jsdom has no canvas backend, so getContext() returns null and the chart draws
   nothing — which would make "the chart ends at the card" untestable. A
   recording 2D context stands in: it captures every coordinate and every label
   the real drawRateChart produces, so the assertions read the drawing itself. */
function makeRecorder() {
  const rec = { calls: [], text: [] };
  rec.reset = () => { rec.calls.length = 0; rec.text.length = 0; };
  const ctx = {};
  for (const m of ['setTransform', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'fill', 'fillText', 'strokeText',
    'arc', 'ellipse', 'closePath', 'save', 'restore', 'clearRect', 'rect', 'clip', 'translate', 'scale',
    'quadraticCurveTo', 'bezierCurveTo', 'setLineDash', 'fillRect', 'strokeRect', 'drawImage'])
    ctx[m] = function () { rec.calls.push([m].concat([].slice.call(arguments))); if (m === 'fillText') rec.text.push(String(arguments[0])); };
  ctx.createLinearGradient = () => ({ addColorStop() {} });
  ctx.createRadialGradient = () => ({ addColorStop() {} });
  ctx.createPattern = () => null;
  ctx.measureText = () => ({ width: 12 });
  ctx.getImageData = () => ({ data: [] });
  ctx.putImageData = () => {};
  rec.coords = () => rec.calls.filter(c => ['moveTo', 'lineTo', 'arc', 'fillRect'].indexOf(c[0]) >= 0)
    .reduce((a, c) => a.concat(c.slice(1)), []).filter(v => typeof v === 'number');
  rec.lastLabel = () => (rec.text.filter(t => /\/g$/.test(t)).pop() || '');
  return { rec, ctx };
}

/* The LIVE database still says "Jaipur bullion rate" in all 77 descriptions —
   a deploy zip never touches data/, by house rule. That is exactly the case the
   render-time brand filter exists for, so the stub feeds those live-era bytes
   back and the suite watches the shop rewrite them on the way to the screen. */
const LEGACY_DESC = 'Mughal Moti Ring PGS5004 — Gold 22K, 3.83 g with polki / CZ pavé setting, hand-finished by our karigars with 12% making charges. Gold price follows the live Jaipur bullion rate of the day. BIS hallmark & purity assured by Shivaa Jewellers, Jayal — Nagaur, Rajasthan.';
const BRAND_TEST_ID = 'v156-brand-test';
function stubProducts() {
  /* the catalogue the shop really has, with the FIRST piece's description put
     back to its live-era wording (that is the home page's Product of the Month). */
  const list = DB.products.map((p, i) => (i === 0 ? Object.assign({}, p, { desc: LEGACY_DESC }) : p));
  /* a control piece, served ONLY by id so it never joins the catalogue: the CITY
     word inside a product NAME and inside a city mention must both survive
     untouched — the filter may rewrite the rate phrase and nothing else. */
  const extra = Object.assign({}, DB.products[0], {
    id: BRAND_TEST_ID, name: 'Jaipur Heritage Polki Ring',
    desc: 'Priced off the live Jaipur bullion rate of the day. Hand-finished for a bride in Jaipur, shipped across Rajasthan from Shivaa Jewellers, Jayal — Nagaur.',
  });
  return { list, extra };
}

/* `holder.value` is read at REQUEST time, so a suite step can swap the payload
   mid-session and watch the 1-second poll pick it up — that is how the in-place
   patch and the poisoned-stamp guard are tested without a second boot. */
function boot(holder, opts = {}) {
  const stub = opts.products || stubProducts();
  const PRODUCTS = stub.list, EXTRA = stub.extra;
  const pushes = { n: 0 }, backs = { n: 0 }, errors = [];
  const { rec, ctx } = makeRecorder();
  const dom = new JSDOM(fs.readFileSync(path.join(CMS, 'index.html'), 'utf8'), {
    url: `http://127.0.0.1:${server.address().port}/${opts.startHash || ''}`,
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.innerWidth = opts.innerWidth || 420; w.innerHeight = 900;
      w.matchMedia = q => ({ matches: /max-width:\s*[6-8]\d\dpx/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {};
      w.HTMLCanvasElement.prototype.getContext = () => ctx;
      w.addEventListener('error', ev => { if (ev.target && ev.target.tagName === 'IMG') return; errors.push(String(ev.message || ev.error || 'error')); });
      /* BUG 3 is about history ENTRIES, so both ends are counted: what the
         overlay guard pushes, and what it queues with back(). */
      const ps = w.history.pushState.bind(w.history);
      Object.defineProperty(w.history, 'pushState', { configurable: true, writable: true, value: function () { pushes.n++; return ps.apply(null, arguments); } });
      const rb = w.history.back.bind(w.history);
      Object.defineProperty(w.history, 'back', { configurable: true, writable: true, value: function () { backs.n++; return rb(); } });
      w.fetch = input => {
        const p = String(input).split('?')[0];
        const payload = holder.value;
        let status = 200, out = {};
        if (p.endsWith('/api/rates')) out = deep(payload);   /* a fresh copy: state.rates keeps array references, so a mutated fixture would silently rewrite the test */
        else if (p.endsWith('/api/settings')) out = { settings: DB.settings };
        else if (p.endsWith('/api/making-charges')) out = { table: [] };
        else if (p.endsWith('/api/catalogs')) out = { catalogs: [] };
        else if (p.endsWith('/api/auth/me')) out = { user: null };
        else if (p.endsWith('/api/products')) out = { products: PRODUCTS, rates: deep(payload) };
        else if (p.indexOf('/api/products/') >= 0) {
          const id = decodeURIComponent(p.split('/').pop());
          const found = id === EXTRA.id ? EXTRA : PRODUCTS.find(x => x.id === id);
          if (!found) { status = 404; out = { error: 'no such product' }; } else out = { product: found, similar: PRODUCTS.slice(1, 4), reviews: [], rates: deep(payload) };
        } else if (p.endsWith('/api/pages')) out = { pages: [] };
        else if (p.endsWith('/api/reviews')) out = { reviews: [] };
        else { status = 404; out = { error: 'not stubbed: ' + p }; }
        return Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
      };
    },
  });
  const w = dom.window, doc = w.document;
  const seg = h => ((h.split('?')[0].slice(2).split('/')[0]) || 'home');
  return {
    dom, w, doc, pushes, backs, errors, rec, PRODUCTS,
    $: s => doc.querySelector(s),
    $$: s => [].slice.call(doc.querySelectorAll(s)),
    click: el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })),
    /* body[data-page] carries the first route segment ('#/product/x' -> 'product') */
    at: hash => until(() => doc.body.dataset.page === seg(hash), 15000),
    go: async hash => { w.location.hash = hash; return await until(() => doc.body.dataset.page === seg(hash), 15000); },
    rates: () => w.Shivaa && w.Shivaa.state && w.Shivaa.state.rates,
    booted: () => until(() => w.Shivaa && w.Shivaa.state.productsCache.length === PRODUCTS.length, 40000),
    ratesLoaded: n => until(() => { const R = w.Shivaa && w.Shivaa.state && w.Shivaa.state.rates; return !!R && Array.isArray(R.history) && (n == null || R.history.length === n); }, 30000),
    close: () => { try { dom.window.close(); } catch (e) {} },
  };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  console.log('\nSHIVAA v156 — rates behaviour check  ·  ' + CMS);

  /* ── A · what the phone actually receives ───────────────────────────── */
  console.log('\n· A · the payload is the SERVER\'S OWN BYTES (php-wasm, controlled falling market)');
  const apiSrc = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
  const req = await phpInstance('/v156rates', apiSrc);
  const rLive = await req('rates', seedMarket);
  const PAY = rLive.json || {};
  ok('/api/rates answers 200 with no fatal', rLive.http === 200 && !rLive.fatal && !!PAY.t, `http=${rLive.http} fatal=${rLive.fatal} raw=${(rLive.raw || '').slice(0, 200)}`);
  ok('it is PRODUCTION-SHAPED: the top level and `spot` carry the RAW stamp, `shivaa` carries the retail rate',
    !!PAY.spot && PAY.gold22 === PAY.spot.gold22 && !!PAY.shivaa &&
    PAY.shivaa.gold22 === PAY.spot.gold22 + 398 && PAY.shivaa.gold24 === Math.round(PAY.anchorLevel.goldPerG) + 398,
    `top=${PAY.gold22} spot=${PAY.spot && PAY.spot.gold22} shivaa=${JSON.stringify(PAY.shivaa)} anchor=${JSON.stringify(PAY.anchorLevel)}`);
  ok('the published `history` is RAW and FALLING — the shape every older fixture got wrong',
    Array.isArray(PAY.history) && PAY.history.length === MARKET.length &&
    PAY.history.every(h => Math.abs(h.gold22 - Math.round(h.gold24 * 0.9167)) <= 1) &&
    PAY.history[PAY.history.length - 1].gold22 < PAY.history[0].gold22,
    `raw=${JSON.stringify((PAY.history || []).map(h => h.gold22))} retail=${PAY.shivaa && PAY.shivaa.gold22}`);
  ok('the seeded market HELD — the anchor is the stamp this suite wrote, not a simulated refresh clamped to BASE_GOLD',
    PAY.anchorLevel && PAY.anchorLevel.goldPerG === MARKET[MARKET.length - 1].gold24 && PAY.source === 'live' &&
    Array.isArray(PAY.history) && PAY.history.length === MARKET.length,
    `anchor=${PAY.anchorLevel && PAY.anchorLevel.goldPerG} (seeded ${MARKET[MARKET.length - 1].gold24}) source=${PAY.source} history=${(PAY.history || []).length}`);
  const PREM = PAY.premium || {};
  ok('the premium block is complete: gold24 === gold22 === 398, gold18 === 299, not pinned',
    PREM.gold22 === 398 && PREM.gold24 === 398 && PREM.gold18 === 299 && PREM.pinned === false, JSON.stringify(PREM));
  const rPin = await req('rates', d => { seedMarket(d); d.rates.override = { gold24: 16000, gold22: 14700, gold18: 12000, silver: 250 }; });
  const PIN = rPin.json || {};
  ok('the same server, with the owner\'s counter rate PINNED, publishes absolute rates and zero premiums',
    (PIN.premium || {}).pinned === true && (PIN.premium || {}).gold22 === 0 && PIN.shivaa && PIN.shivaa.gold22 === 14700 &&
    PIN.anchorLevel && PIN.anchorLevel.mode === 'override',
    `premium=${JSON.stringify(PIN.premium)} shivaa=${JSON.stringify(PIN.shivaa)}`);

  /* ── B · home page, real payload ────────────────────────────────────── */
  console.log('\n· B · the home page — the shopper\'s first screen');
  const live = { value: PAY };
  const S = boot(live);
  const w = S.w;
  ok('the storefront boots on the server\'s own bytes',
    await S.booted() && await S.ratesLoaded(MARKET.length),
    `products=${w.Shivaa && w.Shivaa.state.productsCache.length} errors=${JSON.stringify(S.errors.slice(0, 3))}`);
  const R = S.rates() || {};
  ok('BUG 1 · the series is lifted ONTO the card: history[last] === state.rates.gold22, while historySpot keeps the raw stamps',
    Array.isArray(R.history) && R.history.length === MARKET.length &&
    R.history[MARKET.length - 1].gold22 === R.gold22 && R.history[0].gold22 === MARKET[0].gold22 + 398 &&
    Array.isArray(R.historySpot) && R.historySpot.length === MARKET.length &&
    R.historySpot[MARKET.length - 1].gold22 === PAY.spot.gold22,
    `history=${JSON.stringify((R.history || []).map(h => h.gold22))} card=${R.gold22}\nraw=${JSON.stringify((R.historySpot || []).map(h => h.gold22))}`);
  const stripOK = await until(() => S.$('#rateStrip [data-rsh="gold22"]'), 10000);
  const cell22 = S.$('#rateStrip [data-rsh="gold22"]');
  const chg22 = cell22 && cell22.parentElement.querySelector('.chg');
  const chgTxt = chg22 ? chg22.textContent.trim() : '';
  ok('BUG 1 · a FALLING market reads ▼ down on the Shivaa 22K strip cell — not the phantom "▲ 380 up" the mixed basis produced',
    stripOK && !!chg22 && chg22.classList.contains('down') && /▼/.test(chgTxt) &&
    rupees(chgTxt.replace(/[▲▼—]/g, '')) > 0 && rupees(chgTxt.replace(/[▲▼—]/g, '')) < 100 &&
    rupees(cell22.textContent) === R.gold22,
    `strip="${chgTxt}" class="${chg22 && chg22.className}" cell="${cell22 && cell22.textContent}" (card ${R.gold22} vs prev ${R.history && R.history[MARKET.length - 2] && R.history[MARKET.length - 2].gold22})`);

  /* BUG 2 — the footer's own sentence, parsed back into arithmetic */
  const basisOK = await until(() => S.$('#v107FootTicker .v107-basis'), 10000);
  const basis = basisOK ? S.$('#v107FootTicker .v107-basis').textContent : '';
  const mBasis = /spot ₹([\d,]+\.\d\d)\/g \(22K\) \+ ₹([\d,]+\.\d\d)\/g Shivaa premium = ₹([\d,]+\.\d\d)\/g/.exec(basis);
  const m24 = /24K carries the same ₹([\d,]+\.\d\d)\/g premium/.exec(basis);
  ok('BUG 2 · the footer\'s three numbers ADD UP, and the sum is the rate the shop actually sells at',
    !!mBasis && rupees(mBasis[1]) + rupees(mBasis[2]) === rupees(mBasis[3]) && rupees(mBasis[3]) === R.gold22,
    mBasis ? `${mBasis[1]} + ${mBasis[2]} = ${mBasis[3]} vs card ${R.gold22}` : 'basis line not found: ' + basis.slice(0, 220));
  ok('BUG 2 · the footer calls the ANCHOR derivation "spot" — never the premium-inclusive retail rate — and quotes the 24K premium as 398',
    !!mBasis && rupees(mBasis[1]) === Math.round(PAY.anchorLevel.goldPerG * 0.9167) && rupees(mBasis[1]) !== R.gold22 &&
    !!m24 && rupees(m24[1]) === 398,
    `printed spot=${mBasis && mBasis[1]} (anchor says ${Math.round(PAY.anchorLevel.goldPerG * 0.9167)}) vs retail ${R.gold22}; 24K line=${m24 && m24[1]}`);

  /* the render-time brand filter, fed live-era description bytes */
  /* The home card prints only the description's FIRST sentence (`split('.')[0]`),
     and a live description keeps its rate phrase in the second one — so on this
     page the phrase never reaches the screen at all. The assertion that is both
     true and worth having is wider: nowhere in the rendered home page may a
     customer read "Jaipur … rate". City names and review cities are geography
     and are allowed to stay (v156-check.js sweeps the source for those). */
  const spotOK = await until(() => S.$$('.rv').some(e => /Product of the month/.test(e.textContent)), 12000);
  const homeHTML = (S.$('#view') || S.doc.body).innerHTML;
  const leaked = homeHTML.match(/.{0,60}Jaipur[\s\-–—]*(?:bullion\s*)?rate.{0,40}/i);
  ok('the rendered HOME page carries no "Jaipur … rate" anywhere — though every LIVE description still says it',
    spotOK && !leaked && /Mughal Moti Ring/.test(homeHTML),
    leaked ? leaked[0] : `spotCard=${spotOK} homeHTML=${homeHTML.length} bytes`);
  await S.go('#/product/' + BRAND_TEST_ID);
  const pdOK = await until(() => S.$$('.acc-body').some(e => /bullion rate/i.test(e.textContent)), 12000);
  const pd = pdOK ? S.$$('.acc-body').map(e => e.textContent).find(t => /bullion rate/i.test(t)) : '';
  const pageHTML = S.doc.body.innerHTML;
  ok('...and the filter is NARROW: the rate phrase changes, a product NAME and a CITY mention survive exactly as written',
    pdOK && /Shivaa bullion rate/i.test(pd) && !/Jaipur bullion rate/i.test(pd) &&
    /a bride in Jaipur/.test(pd) && /Jayal — Nagaur/.test(pd) && /Jaipur Heritage Polki Ring/.test(pageHTML),
    `desc=${JSON.stringify(pd.slice(0, 240))}\nnameInPage=${/Jaipur Heritage Polki Ring/.test(pageHTML)}`);

  /* ── C · the rates page ─────────────────────────────────────────────── */
  console.log('\n· C · #/rates — the card, the tiles and the 12-hour chart');
  S.rec.reset();
  const ratesOK = await S.go('#/rates') && await until(() => S.$('[data-rr="g22"]'), 12000);
  const cardVal = rupees((S.$('[data-rr="g22"]') || {}).textContent);
  ok('the rates page renders off the same payload', ratesOK && cardVal === R.gold22, `card=${cardVal} state=${R.gold22}`);
  const plotted = S.rec.coords();
  ok('BUG 1 · the chart\'s last plotted point IS the card printed above it (it used to end exactly ₹398 below)',
    rupees(S.rec.lastLabel()) === cardVal && plotted.length > 0 && plotted.every(Number.isFinite),
    `card=${cardVal} chartLabel="${S.rec.lastLabel()}" coords=${plotted.length} finite=${plotted.every(Number.isFinite)}`);
  ok('the card publishes BOTH premium lines: 22K +₹398/g and 24K +₹398/g (the owner\'s order)',
    (S.$('[data-rr="prem22"]') || {}).textContent === '+₹398/g' && (S.$('[data-rr="prem24"]') || {}).textContent === '+₹398/g',
    `prem22="${(S.$('[data-rr="prem22"]') || {}).textContent}" prem24="${(S.$('[data-rr="prem24"]') || {}).textContent}"`);
  const tile = k => (((S.$(`[data-rr="premc-${k}"]`) || {}).textContent) || '').trim();
  ok('every karat tile states the premium sitting inside its own price (24K 398 · 22K 398 · 18K 299 · silver 3)',
    /₹398\/g Shivaa premium/.test(tile('gold24')) && /₹398\/g Shivaa premium/.test(tile('gold22')) &&
    /₹299\/g Shivaa premium/.test(tile('gold18')) && /₹3(?:\.00)?\/g Shivaa premium/.test(tile('silver')),
    ['gold24', 'gold22', 'gold18', 'silver'].map(k => `${k}: "${tile(k)}"`).join(' | '));
  const ratesHTML = (S.$('#view') || S.doc.body).innerHTML.replace(/jaipur-hero/g, '@');
  ok('the rates page says SHIVAA — no customer-facing "Jaipur" survives (the .jaipur-hero CSS class is internal and stays)',
    !/jaipur/i.test(ratesHTML) && /✦ SHIVAA MARKET RATE/.test(ratesHTML) && /22K Shivaa premium/.test(ratesHTML) && /24K Shivaa premium/.test(ratesHTML),
    (ratesHTML.match(/.{0,80}jaipur.{0,80}/i) || ['no match'])[0]);

  /* the poll must patch the card in place — and carry the new 24K line with it */
  const nextPay = JSON.parse(JSON.stringify(PAY));
  nextPay.spot.gold22 += 40; nextPay.gold22 = nextPay.spot.gold22;
  nextPay.anchorLevel.goldPerG += 40;
  nextPay.shivaa.gold22 = nextPay.spot.gold22 + 398; nextPay.shivaa.gold24 = Math.round(nextPay.anchorLevel.goldPerG) + 398;
  nextPay.jaipur = nextPay.shivaa;
  nextPay.history = PAY.history.map((h, i) => (i === PAY.history.length - 1 ? Object.assign({}, h, { gold22: h.gold22 + 40, gold24: h.gold24 + 40 }) : h));
  nextPay.t = new Date().toISOString();
  live.value = nextPay;
  const patched = await until(() => rupees((S.$('[data-rr="g22"]') || {}).textContent) === nextPay.shivaa.gold22, 25000);
  ok('the poll patches the card IN PLACE, and the 24K premium row survives the patch',
    patched && S.$('[data-rr="prem24"]') && S.$('[data-rr="prem24"]').textContent === '+₹398/g' &&
    rupees((S.$('[data-rr="rc-gold24"]') || {}).textContent) === nextPay.shivaa.gold24,
    `g22="${(S.$('[data-rr="g22"]') || {}).textContent}" want ${nextPay.shivaa.gold22}; rc-gold24="${(S.$('[data-rr="rc-gold24"]') || {}).textContent}" want ${nextPay.shivaa.gold24}; prem24="${(S.$('[data-rr="prem24"]') || {}).textContent}"`);
  S.close();

  /* ── D · the payloads that must NOT be lifted ───────────────────────── */
  console.log('\n· D · pass-throughs — an old cached response and a pinned counter rate');
  const LEGACY = JSON.parse(JSON.stringify(PAY));
  delete LEGACY.premium;                                   // a pre-v119 response still sitting in an old phone's cache
  const legacyHold = { value: LEGACY };
  const L = boot(legacyHold);
  const lBooted = await L.booted() && await L.ratesLoaded(MARKET.length);
  const LR = L.rates() || {};
  ok('a legacy payload with NO premium block passes through UNTOUCHED (history === historySpot) and the shop still boots',
    lBooted && Array.isArray(LR.history) && JSON.stringify(LR.history.map(h => h.gold22)) === JSON.stringify(LR.historySpot.map(h => h.gold22)) &&
    LR.history[MARKET.length - 1].gold22 === LEGACY.spot.gold22 && L.errors.length === 0,
    `history=${JSON.stringify((LR.history || []).map(h => h.gold22))} raw=${JSON.stringify((LR.historySpot || []).map(h => h.gold22))} errors=${JSON.stringify(L.errors.slice(0, 3))}`);
  const lStrip = await until(() => L.$('#rateStrip [data-rsh="gold22"]'), 10000);
  ok('...and the strip still renders the retail rate (a premium-less payload is a pass-through, not a crash)',
    lStrip && rupees(L.$('#rateStrip [data-rsh="gold22"]').textContent) === LR.gold22 && L.errors.length === 0,
    `cell="${(L.$('#rateStrip [data-rsh="gold22"]') || {}).textContent}" state=${LR.gold22} errors=${JSON.stringify(L.errors.slice(0, 2))}`);
  L.close();

  const pinHold = { value: PIN };
  const P = boot(pinHold);
  const pBooted = await P.booted() && await P.ratesLoaded(MARKET.length);
  const PR = P.rates() || {};
  P.rec.reset();
  await P.go('#/rates');
  const pinRows = await until(() => P.$('[data-rr="prem22"]'), 12000);
  ok('a PINNED override is ABSOLUTE: the series is not lifted, and the card says "pinned · none added" on BOTH karats',
    pBooted && PR.gold22 === 14700 && JSON.stringify(PR.history.map(h => h.gold22)) === JSON.stringify(PR.historySpot.map(h => h.gold22)) &&
    pinRows && P.$('[data-rr="prem22"]').textContent === 'pinned · none added' && P.$('[data-rr="prem24"]').textContent === 'pinned · none added' &&
    /admin-pinned counter rate/.test(((P.$('[data-rr="premc-gold24"]') || {}).textContent) || ''),
    `card=${PR.gold22} history=${JSON.stringify((PR.history || []).map(h => h.gold22))} prem22="${(P.$('[data-rr="prem22"]') || {}).textContent}" prem24="${(P.$('[data-rr="prem24"]') || {}).textContent}" tile="${((P.$('[data-rr="premc-gold24"]') || {}).textContent || '').trim()}"`);
  const pinBasisOK = await until(() => P.$('#v107FootTicker .v107-basis'), 10000);
  const pinBasis = pinBasisOK ? P.$('#v107FootTicker .v107-basis').textContent : '';
  ok('BUG 2 · the pinned footer says the counter rate is absolute instead of inventing a premium on top of it',
    /pinned its own counter rate/.test(pinBasis) && /14,700\.00\/g \(22K\)/.test(pinBasis) && !/\+ ₹/.test(pinBasis),
    pinBasis.slice(0, 240));
  P.close();

  /* ── E · BUG 4 — the chart guard ────────────────────────────────────── */
  console.log('\n· E · the chart guard (one stamp, one poisoned stamp)');
  const ONE = JSON.parse(JSON.stringify(PAY)); ONE.history = [MARKET[MARKET.length - 1]];
  const oneHold = { value: ONE };
  const O = boot(oneHold);
  const oBooted = await O.booted() && await O.ratesLoaded(1);
  O.rec.reset();
  const onePage = await O.go('#/rates') && await until(() => O.$('[data-rr="g22"]'), 12000);
  ok('ONE stamp: the card still renders, the chart draws NOTHING instead of a NaN smear, and nothing throws',
    oBooted && onePage && rupees(O.$('[data-rr="g22"]').textContent) === ONE.shivaa.gold22 &&
    O.rec.coords().length === 0 && O.rec.lastLabel() === '' && O.errors.length === 0,
    `coords=${O.rec.coords().length} labels=${JSON.stringify(O.rec.text)} errors=${JSON.stringify(O.errors.slice(0, 3))}`);
  /* a poisoned stamp arrives mid-session: the poll lifts it to NaN, and the
     curve must be drawn from the good points only — never flattened by it. */
  const POISON = JSON.parse(JSON.stringify(PAY));
  POISON.history = [MARKET[0], Object.assign({}, stamp(14400, 15660, 237.8), { gold22: 'not-a-number' }), MARKET[2], MARKET[MARKET.length - 1]];
  oneHold.value = POISON;
  const poisonLanded = await until(() => { const r = O.rates(); return !!r && Array.isArray(r.historySpot) && r.historySpot.length === 4 && r.historySpot[1].gold22 === 'not-a-number'; }, 25000);
  O.rec.reset();
  await O.go('#/'); await O.go('#/rates');
  await until(() => O.$('[data-rr="g22"]'), 12000);
  const pCoords = O.rec.coords();
  ok('a POISONED stamp is dropped, not spread: the curve still draws, every coordinate is finite, and the end label is the card',
    poisonLanded && pCoords.length > 0 && pCoords.every(Number.isFinite) && rupees(O.rec.lastLabel()) === POISON.shivaa.gold22 && O.errors.length === 0,
    `landed=${poisonLanded} coords=${pCoords.length} finite=${pCoords.every(Number.isFinite)} label="${O.rec.lastLabel()}" card=${POISON.shivaa.gold22} errors=${JSON.stringify(O.errors.slice(0, 3))}`);
  O.close();

  /* ── F · BUG 3 — the Back button on the EMPTY hash ─────────────────── */
  console.log('\n· F · the empty-hash home page — one history entry per overlay open');
  const backHold = { value: PAY };
  const B = boot(backHold, { startHash: '' });            /* a bare shivaa.in/ visit: location.hash === '' */
  const bBooted = await B.booted() && await B.ratesLoaded(MARKET.length);
  await sleep(400);
  ok('booting on a bare "/" pushes no history entry at all', bBooted && B.pushes.n === 0, `pushes=${B.pushes.n} hash="${B.w.location.hash}" errors=${JSON.stringify(B.errors.slice(0, 2))}`);
  B.click(B.$('#navToggle'));
  const opened = await until(() => B.$('#mainNav').classList.contains('open'), 8000);
  const afterOpen = B.pushes.n;
  /* the spam was mutation-driven, not tap-driven: sit through a rates poll with
     the sheet open and count again — the entry count must not creep. */
  await sleep(6500);
  ok('BUG 3 · opening the menu on the home page costs EXACTLY ONE entry, and a poll\'s worth of class churn adds none',
    opened && afterOpen === 1 && B.pushes.n === 1,
    `opened=${opened} afterOpen=${afterOpen} afterChurn=${B.pushes.n} hash="${B.w.location.hash}"`);
  B.w.history.back();                                     /* the shopper's Back press */
  const closedByBack = await until(() => !B.$('#mainNav').classList.contains('open'), 8000);
  const backsAfter = B.backs.n, pushesAfter = B.pushes.n;
  await sleep(300);
  ok('BUG 3 · ONE Back press closes the sheet, and the guard queues no traversal of its own on the way out',
    closedByBack && backsAfter === 1 && pushesAfter === 1,
    `closed=${closedByBack} backs=${backsAfter} pushes=${pushesAfter}`);
  B.click(B.$('#navToggle'));
  const reopened = await until(() => B.$('#mainNav').classList.contains('open'), 8000);
  const secondEntry = B.pushes.n;
  B.w.history.back();
  const closedAgain = await until(() => !B.$('#mainNav').classList.contains('open'), 8000);
  ok('BUG 3 · nothing leaked: a second open/close cycle costs one entry and one Back press again',
    reopened && secondEntry === 2 && closedAgain && B.backs.n === 2 && B.errors.length === 0,
    `reopened=${reopened} pushes=${B.pushes.n} backs=${B.backs.n} errors=${JSON.stringify(B.errors.slice(0, 3))}`);
  B.close();

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v156 rates-behaviour checks passed  ${pass === results.length ? '✦ — WHAT THE SHOPPER SEES MATCHES WHAT THE SERVER SENDS' : '✗ FAILED'}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('\nSUITE ERROR', e && e.stack || e); process.exit(1); });
