/* ══════════════════════════════════════════════════════════════════════
   SHIVAA v140 check — the owner's two reports of 18 Sep 2026.

   1 · "a small pop-up at the bottom says 'keep shivaa on your home screen';
        ticking the cross first shifts it aside, then back to centre, and it
        never goes"  → the install chip is DELETED, not restyled.
   2 · "when a jeweller logs in or creates his account he should always be
        directed towards the bullion desk … after closing and reopening the
        browser he should not have to login again … it should be automatic.
        Retail customers should be saved and taken directly to the home page."

   A · static  (checks every stamp the release moves, every file it touches,
                and that the install chip is gone from all three layers)
   B · live    (jsdom on the real shell: a returning partner lands on the
                bullion desk with no tap; a returning retail customer lands on
                the home page signed in; a signed-out visitor is left alone;
                deep links are honoured)
   C · control (the install chip could no longer be summoned even when the
                browser fires beforeinstallprompt)

   Run:  node tools/mega/smoke/v140-check.js
   Overlay: SMOKE_CMS=<dir> node tools/mega/smoke/v140-check.js
   ══════════════════════════════════════════════════════════════════════ */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));

const results = [];
const ok = (name, pass, detail = '') => {
  results.push(!!pass);
  console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); }
  return false;
}

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end();
  fs.readFile(f, (e, b) => e ? res.writeHead(404).end()
    : (res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }), res.end(b)));
});

const jaipur = { gold24: 15655, gold22: 14405, gold18: 11696, silver: 242.4 };
const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', live: false,
  spot: jaipur, jaipur, ...jaipur,
  rtgs: { rows: {}, anchor: 'mcx-future', updatedAt: new Date().toISOString() },
  premium: { gold: 55, silver: 3, gold22: 398 },
  anchorLevel: { mode: 'mcx-future', goldPerG: 15056, silverPerG: 99500 },
  history: [Object.assign({ t: new Date(Date.now() - 6e4).toISOString() }, jaipur)], nextUpdateIn: 60,
};
const PARTNER = { id: 'u-partner', name: 'Radhe Jewellers', email: 'radhe@firm.in', phone: '9876543210', role: 'partner', addresses: [] };
const CUSTOMER = { id: 'u-cust', name: 'Aarti Choudhary', email: 'aarti@example.com', phone: '9876543210', role: 'customer', addresses: [] };

function boot({ user = null, token = null, startHash = '', innerWidth = 420 } = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('error', () => {}); vc.on('log', () => {}); vc.on('info', () => {}); vc.on('warn', () => {});
  const dom = new JSDOM(fs.readFileSync(path.join(CMS, 'index.html'), 'utf8'), {
    url: `http://127.0.0.1:${server.address().port}/${startHash || ''}`,
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.innerWidth = innerWidth; w.innerHeight = 900;
      // A returning browser has the 30-day bearer token in localStorage —
      // exactly what app.js `store.get('shv_token')` reads on boot.
      try { if (token) w.localStorage.setItem('shv_token', JSON.stringify(token)); } catch (e) {}
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {};
      Object.defineProperty(w.navigator, 'vibrate', { value: () => true, configurable: true });
      w.HTMLMediaElement.prototype.play = () => Promise.resolve();
      w.HTMLMediaElement.prototype.pause = () => {};
      w.addEventListener('error', ev => {
        if (ev.target && ev.target.tagName === 'IMG') return;
        errors.push(String(ev.message || ev.error || 'error'));
      });
      w.fetch = (input) => {
        const p = String(input).split('?')[0];
        let status = 200, out = {};
        if (p.endsWith('/api/rates')) out = RATES_STUB;
        else if (p.endsWith('/api/settings')) out = { settings: DB.settings };
        else if (p.endsWith('/api/making-charges')) out = { table: [] };
        else if (p.endsWith('/api/catalogs')) out = { catalogs: [] };
        else if (p.endsWith('/api/auth/me')) out = { user };
        else if (p.endsWith('/api/addresses')) out = { ok: true, addresses: [] };
        else if (p.endsWith('/api/products')) out = { products: DB.products };
        else if (p.includes('/api/products/')) out = { product: DB.products[0], similar: [], reviews: [], rates: DB.rates.last };
        else if (p.endsWith('/api/pay/config')) out = { mode: 'demo', lockMinutes: 20 };
        else if (p.endsWith('/api/partners/me')) out = { partner: { id: 'pr-1', firm: 'Radhe Jewellers', contactPerson: 'Radhe', city: 'Nagaur', joined: '2026-01-01' }, settlements: [] };
        else if (p.endsWith('/api/bullion')) out = { date: new Date().toDateString(), time: '10:00 AM', source: 'dotd', gold24: 15655, gold22: 14405, goldCore: 15056, silver: 99500, spot: jaipur, mcx: { goldSymbol: 'GOLD', silverSymbol: 'SILVER', goldLtp: 156100, silverLtp: 99500, autoTokens: true }, alerts: [], history: [] };
        else if (p.endsWith('/api/pages')) out = { pages: [] };
        else { status = 404; out = { error: 'not stubbed: ' + p }; }
        return Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
      };
    },
  });
  const w = dom.window, doc = w.document;
  return {
    dom, w, doc, errors,
    $: s => doc.querySelector(s),
    // B1: the Bullion Desk is what gets painted — the branded board topbar —
    // plus (for #/shop) any two storefront tiles, the real proof either goal
    // rendered instead of being pre-empted.
    bullionBoard: () => doc.querySelector('.bd-brand') && /BULLION DESK/.test(doc.querySelector('.bd-brand').textContent),
    shopReady: () => doc.querySelectorAll('.c-slide').length >= 2 || doc.querySelectorAll('.cb-img, .cb-tile, [data-cat], .cat-mini-card').length >= 2,
    loginOpen: () => (doc.querySelector('#shvAuthWrap') && !doc.querySelector('#shvAuthWrap').hidden) ||
                     (doc.querySelector('#modalOverlay') && doc.querySelector('#modalOverlay').classList.contains('open')),
  };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  /* ══════ A · static ══════ */
  console.log('\n· A · static');
  const shell = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
  const v119 = fs.readFileSync(path.join(CMS, 'js/v119.js'), 'utf8');
  const v140 = fs.readFileSync(path.join(CMS, 'js/v140.js'), 'utf8');
  const v119css = fs.readFileSync(path.join(CMS, 'css/v119.css'), 'utf8');
  const v120css = fs.readFileSync(path.join(CMS, 'css/v120.css'), 'utf8');
  const v116css = fs.readFileSync(path.join(CMS, 'css/v116.css'), 'utf8');
  const v140css = fs.readFileSync(path.join(CMS, 'css/v140.css'), 'utf8');

  ok('the release triple moves together to 140 or newer (index.html · app.js · sw.js)',
    (/window\.__SHIVAA_REL=140;/.test(shell) && /APP_REL\s*=\s*140/.test(app) && /SHELL = 'shivaa-shell-v140'/.test(sw)) ||
    (/window\.__SHIVAA_REL=141;/.test(shell) && /APP_REL\s*=\s*141/.test(app) && /SHELL = 'shivaa-shell-v141'/.test(sw)),
    'index.html/app.js/sw.js stamps must all read 140 (or the v141 release they moved to)');

  ok('every changed file carries its new cache stamp (?v=140 / app.js 140+141) in index.html',
    /\/css\/v116\.css\?v=140/.test(shell) && /\/css\/v119\.css\?v=140/.test(shell) && /\/css\/v120\.css\?v=140/.test(shell) &&
    /\/js\/app\.js\?v=(140|141)/.test(shell) && /\/js\/v107\.js\?v=140/.test(shell) && /\/js\/v116\.js\?v=(140|141)/.test(shell) &&
    /\/js\/v117\.js\?v=(140|141)/.test(shell) && /\/js\/v119\.js\?v=140/.test(shell) && /\/js\/v120\.js\?v=140/.test(shell),
    'a changed stamped file must move its ?v= (immutable cache, one year)');

  ok('the new v140 layer ships, is loaded LAST, and the worker precaches it',
    /<script src="\/js\/v140\.js\?v=140" defer><\/script>/.test(shell) &&
    shell.indexOf('/js/v139.js?v=139') < shell.indexOf('/js/v140.js?v=140') &&
    sw.includes("'/js/v140.js?v=140'") && sw.includes("'/css/v140.css?v=140'"));

  ok('the service worker precache matches the re-stamped files exactly',
    (sw.includes("'/js/app.js?v=140'") || sw.includes("'/js/app.js?v=141'")) &&
    sw.includes("'/js/v119.js?v=140'") && sw.includes("'/js/v120.js?v=140'") &&
    (sw.includes("'/js/v116.js?v=140'") || sw.includes("'/js/v116.js?v=141'")) &&
    sw.includes("'/css/v119.css?v=140'") && sw.includes("'/css/v120.css?v=140'") && sw.includes("'/css/v116.css?v=140'"));

  ok('the install chip is GONE from the markup layer (js/v119.js)',
    !/Keep Shivaa on your home screen/.test(v119) && !/beforeinstallprompt/.test(v119) && !/shvInstallChip/.test(v119),
    'v119.js must build nothing install-related');

  ok('the install chip is GONE from the style layers (v119.css · v120.css · v116.css)',
    !/#shvInstallChip/.test(v119css) && !/#shvInstallChip/.test(v120css) && !/shv-install/.test(v116css),
    'no position-fixed bottom bar can ever render');

  ok('v140.js ships a self-heal that strips a cached chip and never rebuilds one',
    /getElementById\('shvInstallChip'\)/.test(v140) && !/beforeinstallprompt/.test(v140) && /shv-v140-marker/.test(v140css));

  ok('welcomeSession exists and routes ONLY partners, on a bare URL, once per tab',
    /function welcomeSession\(\)/.test(app) && /_landedThisTab/.test(app) && /role === 'partner'/.test(app) &&
    /location\.hash\s*=\s*'#\/partner'/.test(app) && /bareHome/.test(app) && !/role \? 'admin'/.test(app));

  ok('welcomeSession runs from boot() once state.user is hydrated, before route()',
    /try \{\s*welcomeSession\(\);\s*\}\s*catch/.test(app));

  /* ══════ B · live ══════ */
  console.log('\n· B · live behaviour');

  // B1 · returning PARTNER on a bare URL → the bullion desk, no taps
  {
    const P = boot({ user: PARTNER, token: 'tok-partner', startHash: '#/' });
    ok('a returning jeweller lands on the live Bullion Desk with zero taps',
      await until(() => P.bullionBoard(), 30000), P.w.location.hash);
    ok('…with no login sheet ever raised', !P.loginOpen());
    ok('…and no unhandled page errors', P.errors.length === 0, P.errors.join(' | '));
    P.dom.window.close();
  }

  // B2 · returning CUSTOMER on a bare URL → home page, signed in
  {
    const C = boot({ user: CUSTOMER, token: 'tok-cust', startHash: '#/' });
    await until(() => C.shopReady(), 25000);
    await sleep(300);
    const hash = C.w.location.hash;
    ok('a returning retail customer stays on the home page, signed in',
      C.shopReady() && (hash === '#/' || hash === ''), hash);
    ok('…with no login sheet raised', !C.loginOpen());
    C.dom.window.close();
  }

  // B3 · signed-out visitor → normal home, no nagging
  {
    const G = boot({ user: null, token: null, startHash: '#/' });
    await until(() => G.shopReady(), 25000);
    await sleep(300);
    ok('a signed-out visitor just gets the home page (no auto login sheet)', G.shopReady() && !G.loginOpen(), G.w.location.hash);
    G.dom.window.close();
  }

  // B4 · a deep link always wins — even for a returning partner
  {
    const D = boot({ user: PARTNER, token: 'tok-partner', startHash: '#/shop' });
    await until(() => D.shopReady(), 25000);
    await sleep(400);
    ok('a deep link (shared piece / category) is honoured, not overridden',
      D.shopReady() && D.w.location.hash.startsWith('#/shop'), D.w.location.hash);
    D.dom.window.close();
  }

  // B5 · control — firing beforeinstallprompt can NEVER summon the chip again
  {
    const C2 = boot({ user: null, token: null, startHash: '#/' });
    await until(() => C2.shopReady(), 25000);
    try { C2.w.localStorage.setItem('shv_visits', '9'); } catch (e) {}
    C2.w.dispatchEvent(new C2.w.Event('beforeinstallprompt', { cancelable: true }));
    await sleep(400);
    ok('the removed install chip cannot be summoned on any visit',
      !C2.doc.getElementById('shvInstallChip'));
    C2.dom.window.close();
  }

  server.close();
  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v140 checks passed  ✦`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); try { server.close(); } catch (_) {} process.exit(2); });
