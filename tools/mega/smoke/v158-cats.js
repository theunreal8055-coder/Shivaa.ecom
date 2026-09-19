/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v158 · THE CATEGORIES CONTROL — one owner, reachable, honest.

   Owner report (20 Sep 2026, verbatim): *"Fix category button, it comes it's
   very good graphic advanced very good but when we click any category of
   jewellery then it doesn't respond and even if we want to close the
   categories button it still doesn't go."*

   This suite proves the three defects and their repairs, by driving the real
   shell at BOTH viewport widths:

     D1  two owners — js/v116.js wired #navCats from a 200 ms timer with an
         INCOMPLETE handler (no scrim / outside / Escape / scroll close) and
         raced boot(). Whichever won decided whether the panel could be closed.
         → one owner (app.js · initCatsMenu), asserted by behaviour.
     D2  the scrim covered the button — `.mega-backdrop` is a fixed child of the
         same sticky <header> that holds the static #navCats, so while the panel
         was open the scrim painted OVER the control meant to close it.
         → the scrim starts below the header and every dismissal path closes.
     D3  the panel could open EMPTY — its tiles were built after boot's API
         batch, so a slow load opened a blank panel.
         → the tiles come from the house CATS constant before any API call.

   Run: node tools/mega/smoke/v158-cats.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v158-cats.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fsx = require('fs'), pathx = require('path');
const _CMS = process.env.SMOKE_CMS || pathx.resolve(__dirname, '..', '..', '..', 'cms');
const _app = (() => { try { return fsx.readFileSync(pathx.join(_CMS, 'js/app.js'), 'utf8'); } catch (e) { return ''; } })();
if (!/function initCatsMenu\(\)/.test(_app)) { console.log('SKIP — pre-v158 tree: the Categories controller is not in this era'); process.exit(0); }

const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = _CMS;
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const HTML_SRC = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const APP_SRC = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const V116_SRC = fs.readFileSync(path.join(CMS, 'js/v116.js'), 'utf8');
const CSS116 = fs.readFileSync(path.join(CMS, 'css/v116.css'), 'utf8');
const CATS = Object.keys((() => { const m = /const CATS = \{([\s\S]*?)\n\};/.exec(APP_SRC); const o = {}; if (m) for (const k of m[1].matchAll(/^\s{2}([a-z][a-z0-9_]*):\s*\{/gm)) o[k[1]] = 1; return o; })());
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 9000, step = 25) => { const t0 = Date.now(); for (;;) { let v = null; try { v = await f(); } catch (e) {} if (v) return v; if (Date.now() - t0 > ms) return false; await sleep(step); } };
const RATES = () => ({ t: new Date().toISOString(), source: 'live-mcx', live: true, liveAgeMs: 300,
  gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15482, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold24: 398, gold: 55, silver: 3 }, rtgs: { rows: {} },
  history: [{ t: new Date(Date.now() - 3600e3).toISOString(), gold24: 15100, gold22: 14200, gold18: 11340, silver: 236 },
            { t: new Date().toISOString(), gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 }], marketHours: true });

/* boot with a WIDTH-AWARE matchMedia (the old suites matched only `reduce`, so
   every ≤820px branch was invisible to them) and an optional slow API. */
async function boot(width, { apiDelay = 0 } = {}) {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(CMS, u === '/' ? 'index.html' : u);
    if (!path.resolve(f).startsWith(path.resolve(CMS))) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': u.endsWith('.js') ? 'text/javascript' : (u.endsWith('.css') ? 'text/css' : 'text/plain') }); res.end(b); });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String(e.stack || e.message); if (!/Not implemented/.test(m) && !/Could not load script/.test(m)) errors.push(m); });
  const dom = new JSDOM(HTML_SRC, {
    url: origin + '/#/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      Object.defineProperty(w, 'innerWidth', { value: width, configurable: true });
      w.matchMedia = q => {
        const m = String(q);
        if (/reduce/.test(m)) return { matches: false, media: m, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
        const max = /max-width:\s*(\d+)px/.exec(m), min = /min-width:\s*(\d+)px/.exec(m);
        let hit = true;
        if (max) hit = width <= +max[1]; else if (min) hit = width >= +min[1];
        return { matches: hit, media: m, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
      };
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.fetch = async (input) => {
        if (apiDelay) await sleep(apiDelay);
        const p = new URL(String(input), origin).pathname;
        const json = o => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => o, text: async () => JSON.stringify(o) });
        if (p === '/api/settings') return json({ ...DB.settings, guestCheckout: false });
        if (p === '/api/products') return json({ products: DB.products });
        if (p.startsWith('/api/products/')) return json({ product: DB.products.find(x => x.id === decodeURIComponent(p.split('/').pop())), reviews: [], similar: [] });
        if (p === '/api/rates' || p === '/api/rates/live') return json(RATES());
        if (p === '/api/pay/config') return json({ mode: 'demo', env: 'sandbox', lockMinutes: 20, codFeePct: 0, currency: 'INR' });
        return json({});
      };
      Object.defineProperty(w.document, 'hasFocus', { value: () => true });
    },
  });
  return { w: dom.window, d: dom.window.document, errors, server };
}
const tap = (el, w) => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
const st = (d) => {
  const panel = d.getElementById('catMenu'), btn = d.getElementById('navCats'), list = d.getElementById('dwCatList'), nav = d.getElementById('mainNav');
  return {
    panelOpen: !!panel && !panel.hidden, scrimOpen: !!d.getElementById('megaBackdrop') && !d.getElementById('megaBackdrop').hidden,
    aria: btn.getAttribute('aria-expanded'), catsOpen: d.body.classList.contains('cats-open'),
    tiles: panel ? panel.querySelectorAll('a.mega-tile').length : 0,
    listOpen: !!list && list.classList.contains('open'), listItems: list ? list.querySelectorAll('a').length : 0,
    drawerOpen: !!nav && nav.classList.contains('open'), hash: d.defaultView.location.hash,
  };
};

(async () => {
  /* ── static pins ───────────────────────────────────────────────────── */
  const V116_CODE = V116_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');   // comments excluded — the note stays, the twin does not
  ok('one owner: js/v116.js no longer wires #navCats (its incomplete twin is gone)',
    !/wireCatsButton|earlyCatsButton/.test(V116_CODE) && !/navCats/.test(V116_CODE) && !/catsBtn\.onclick/.test(V116_CODE),
    V116_CODE.slice(0, 120));
  ok('app.js owns it before boot: initCatsMenu() runs at script eval AND in boot',
    /try \{ initCatsMenu\(\); \} catch \(e\) \{\}/.test(APP_SRC) && /^  initCatsMenu\(\);$/m.test(APP_SRC) &&
    !/\$\('#catMenu'\)\.innerHTML = `/.test(APP_SRC));
  ok('the 17 tiles come from the house CATS constant (no API, no second copy)',
    /function catsPanelHTML\(\)/.test(APP_SRC) && /function catsListHTML\(\)/.test(APP_SRC) &&
    (APP_SRC.match(/Object\.entries\(LIVE_CATS\(\)\)\.map\(\(\[k, c\]\) =>/g) || []).length >= 2 &&
    !/const CATS = \{\s*rings: \{ name: 'Rings'/.test(V116_SRC));
  ok('the scrim starts below the header (it can never cover the button again)',
    /\.mega-backdrop \{[\s\S]{0,500}?top: var\(--headerH, 120px\);/.test(CSS116));
  ok('the open panel rides above the floating chrome (header 2000 + floaters hidden)',
    /body\.cats-open \.header \{ z-index: 2000 !important; \}/.test(CSS116) &&
    /body\.cats-open \.mnav,[\s\S]{0,400}?visibility: hidden !important;/.test(CSS116));
  ok('the CATS map really holds 17 categories (the number the button promises)', CATS.length === 17, 'found ' + CATS.length + ': ' + CATS.join(','));

  /* ── desktop 1280: the race, the empty panel, every dismissal ──────── */
  {
    const { w, d, errors, server } = await boot(1280, { apiDelay: 1200 });
    const btn = d.getElementById('navCats');
    /* D1/D3 — the button must answer while boot is still waiting on the API,
       and it must already hold all 17 tiles (they need no network). Wait only
       for the bundle itself, so the tap truly lands mid-load. */
    await until(() => w.Shivaa && d.getElementById('catMenu').children.length > 0, 2500);
    const bootPending = !(w.Shivaa.state.productsCache || []).length;   // the API batch is still in flight
    tap(btn, w);
    await sleep(120);
    let s = st(d);
    ok('D3 · tapped while the API batch is still in flight: the panel is OPEN and already holds all 17 tiles',
      bootPending && s.panelOpen && s.tiles === 17 && s.aria === 'true', JSON.stringify(s) + ' bootPending=' + bootPending);
    ok('D2 · the open panel raises the header and hides the floating chrome (body.cats-open)',
      s.catsOpen && s.scrimOpen);
    tap(btn, w); await sleep(80); s = st(d);
    ok('D1 · ONE owner: a second tap closes it (no double-toggle, no stuck open)',
      !s.panelOpen && !s.scrimOpen && s.aria === 'false' && !s.catsOpen, JSON.stringify(s));
    tap(btn, w); await sleep(80);
    ok('D1 · the scrim closes it (bound unconditionally, not only for boot\'s winner)',
      (tap(d.getElementById('megaBackdrop'), w), await sleep(60), !st(d).panelOpen && !st(d).catsOpen));
    tap(btn, w); await sleep(80);
    tap(d.querySelector('.container') || d.querySelector('#view'), w); await sleep(60);
    ok('D1 · a tap anywhere outside closes it', !st(d).panelOpen && !st(d).catsOpen);
    tap(btn, w); await sleep(80);
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(60);
    ok('D1 · Escape closes it', !st(d).panelOpen && !st(d).catsOpen);
    tap(btn, w); await sleep(80);
    w.dispatchEvent(new w.Event('scroll')); await sleep(60);
    ok('D1 · scrolling closes it', !st(d).panelOpen && !st(d).catsOpen);
    tap(btn, w); await sleep(80);
    w.dispatchEvent(new w.Event('resize')); await sleep(60);
    ok('never stale: a width change closes it and clears body.cats-open', !st(d).panelOpen && !st(d).catsOpen);

    /* the actual owner complaint: a category tap must RESPOND */
    tap(btn, w); await sleep(80);
    const tile = d.querySelector('#catMenu a.mega-tile[href*="category=necklaces"]');
    tap(tile, w); await sleep(400);
    s = st(d);
    ok('the reported bug · tapping a category navigates AND dismisses (navigate first, dismiss second)',
      s.hash === '#/shop?category=necklaces' && !s.panelOpen && !s.catsOpen && s.aria === 'false', JSON.stringify(s));
    await until(() => d.querySelector('#view') && /Necklaces/.test(d.querySelector('#view').textContent), 8000);
    ok('…and the shop page really answered (title + the honest cataloguing state, no blank page)',
      /Necklaces/.test(d.querySelector('#view').textContent) && /catalogued|signature rings|Browse/i.test(d.querySelector('#view').textContent));

    /* repeat tap on the SAME category must still do something */
    let redraws = 0; const realRedraw = w.Shivaa.redraw;
    w.Shivaa.redraw = (...a) => { redraws++; return realRedraw.apply(w.Shivaa, a); };
    tap(btn, w); await sleep(60);
    tap(d.querySelector('#catMenu a.mega-tile[href*="category=necklaces"]'), w); await sleep(300);
    ok('a repeat tap on the category you are standing on still responds (redraw, not silence)',
      redraws >= 1, 'redraws=' + redraws);
    w.Shivaa.redraw = realRedraw;
    ok('no page errors while driving the whole control', errors.length === 0, errors.slice(0, 2).join(' | '));
    w.close(); server.close();
  }

  /* ── phone 390: the drawer list ───────────────────────────────────── */
  {
    const { w, d, errors, server } = await boot(390);
    await until(() => d.querySelector('#view') && d.querySelector('#view').innerHTML.length > 500);
    const btn = d.getElementById('navCats');
    tap(d.getElementById('navToggle'), w); await sleep(200);
    tap(btn, w); await sleep(200);
    let s = st(d);
    ok('phone · the Categories pill opens the 17-photo list (same CATS source as the panel)',
      s.listOpen && s.listItems === 17 && s.aria === 'true' && !s.panelOpen, JSON.stringify(s));
    tap(btn, w); await sleep(150);
    ok('phone · the same pill closes it again', !st(d).listOpen && st(d).aria === 'false');
    tap(btn, w); await sleep(150);
    tap(d.querySelector('#dwCatList a[href*="category=rings"]'), w); await sleep(300);
    s = st(d);
    ok('phone · a category tap navigates, the drawer slides away and the list folds',
      s.hash === '#/shop?category=rings' && !s.drawerOpen && !s.listOpen && s.aria === 'false', JSON.stringify(s));
    /* the v139 residue: tap the category you are already on (no hashchange at
       all) — the drawer still closes and the wall of photos must fold with it */
    tap(d.getElementById('navToggle'), w); await sleep(150);
    tap(btn, w); await sleep(150);
    const reopen = st(d).listOpen;
    tap(d.querySelector('#dwCatList a[href*="category=rings"]'), w); await sleep(400);
    s = st(d);
    ok('phone · tapping the category you are already on folds the list too (no 17-photo residue)',
      reopen && !s.listOpen && !s.drawerOpen && s.aria === 'false', JSON.stringify(s));
    /* closing the drawer by ANY other path must fold it as well */
    tap(d.getElementById('navToggle'), w); await sleep(150);
    tap(btn, w); await sleep(150);
    const openAgain = st(d).listOpen;
    if (w._closeDrawer) w._closeDrawer(); await sleep(200);
    ok('phone · closing the drawer by the ✕/scrim/swipe path folds the list (observer, not hashchange-only)',
      openAgain && !st(d).listOpen && !st(d).drawerOpen);
    ok('phone · no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    w.close(); server.close();
  }

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v158 categories checks passed  ${pass === results.length ? '✦ — one owner · reachable · the tap answers' : ''}`);
  process.exit(pass === results.length ? 0 : 1);
})();
