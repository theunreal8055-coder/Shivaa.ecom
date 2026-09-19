/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v159 · THE CATEGORY TAP GUARANTEE — a tap can no longer go nowhere.

   Owner report (20 Sep 2026, the message right after v158):
     *"Category page doesn't takes us anywhere when we click on any category
       but this time it disappeared"*

   Read as: the panel now closes (the v158 repair worked) but the tap still
   does not land on the category page — i.e. something is consuming or
   out-racing the navigation itself, leaving the shopper standing exactly where
   they were with the panel gone.

   This suite reproduces that "something" with the two mechanisms that exist in
   this app — a capture-phase owner that swallows the tap (preventDefault +
   stopPropagation, no navigation) and an owner that REVERTS the hash right
   after it is set (the js/v120.js traversal race, generalised) — and proves the
   guarantee lands the shopper anyway, on every surface that links to a
   category.

   Run: node tools/mega/smoke/v159-cats.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v159-cats.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fsx = require('fs'), pathx = require('path');
const _CMS = process.env.SMOKE_CMS || pathx.resolve(__dirname, '..', '..', '..', 'cms');
const _app = (() => { try { return fsx.readFileSync(pathx.join(_CMS, 'js/app.js'), 'utf8'); } catch (e) { return ''; } })();
if (!/function initCategoryTapGuarantee\(\)/.test(_app)) { console.log('SKIP — pre-v159 tree: the category-tap guarantee is not in this era'); process.exit(0); }

const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = _CMS;
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const HTML_SRC = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
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

async function boot(width) {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(CMS, u === '/' ? 'index.html' : u);
    if (!path.resolve(f).startsWith(path.resolve(CMS))) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': u.endsWith('.js') ? 'text/javascript' : 'text/plain' }); res.end(b); });
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
        let hit = true; if (max) hit = width <= +max[1]; else if (min) hit = width >= +min[1];
        return { matches: hit, media: m, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
      };
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.fetch = async (input) => {
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
      /* ── THE HOSTILE OWNER, planted before the app boots ──────────────────
         `swallow`  — a capture-phase listener that eats category taps the way
                      an over-eager dismiss-first owner does.
         `revert`   — one that lets the navigation start and then yanks the URL
                      back to where it was (the traversal-race family).
         Both are injected from the test (never shipped). */
      const hostile = () => {
        w.document.addEventListener('click', ev => {
          const a = ev.target && ev.target.closest && ev.target.closest('a[href^="#/shop?category="]');
          if (!a) return;
          if (w.__swallowTaps) { ev.preventDefault(); ev.stopPropagation(); return; }
          if (w.__revertTaps) {
            const back = w.location.hash;
            setTimeout(() => { try { w.location.hash = back; } catch (e) {} }, 0);
          }
        }, true);
      };
      w.__swallowTaps = false; w.__revertTaps = false;
      hostile();
    },
  });
  return { w: dom.window, d: dom.window.document, errors, server };
}
const tap = (el, w) => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
const panelState = d => ({
  open: !d.getElementById('catMenu').hidden,
  catOpen: d.body.classList.contains('cats-open'),
  hash: d.defaultView.location.hash,
  title: (d.getElementById('view') || {}).textContent || '',
});

(async () => {
  /* ── static pins ───────────────────────────────────────────────────── */
  ok('the guarantee exists, is app-wide and consumes nothing',
    /function initCategoryTapGuarantee\(\)/.test(_app) &&
    /document\.addEventListener\('click', e => \{[\s\S]{0,900}?SEL = 'a\[href\^="#\/shop\?category="\]'/.test(_app) === false &&
    /const SEL = 'a\[href\^="#\/shop\?category="\]'/.test(_app) &&
    /try \{ initCategoryTapGuarantee\(\); \} catch \(e\) \{\}/.test(_app));
  ok('the panel tile handler no longer preventDefaults (the native action is belt two)',
    !/e\.preventDefault\(\); e\.stopPropagation\(\);\n      try \{ if \(window\.Shivaa && window\.Shivaa\.haptic\) window\.Shivaa\.haptic\(10\); \} catch \(_\) \{\}\n      shvNavTo/.test(_app) &&
    /shvNavTo\(a\.getAttribute\('href'\), \{ watchdog: true, ev: e \}\);/.test(_app));
  ok('the scroll-close is gone (the one dismissal that could hide a tile mid-tap)',
    !/addEventListener\('scroll', \(\) => \{ if \(!panel\.hidden\) setPanelOpen\(false\); \}/.test(_app));
  ok('the watchdog never fights a real navigation (it only fires when the hash has not moved)',
    /if \(location\.hash !== from\) return;\s+\/\/ something else navigated on purpose/.test(_app));

  /* ── 1 · desktop panel: the reported symptom, reproduced and killed ─── */
  {
    const { w, d, errors, server } = await boot(1280);
    await until(() => w.Shivaa && (w.Shivaa.state.productsCache || []).length === 77, 15000);
    const btn = d.getElementById('navCats');
    const tile = () => d.querySelector('#catMenu a.mega-tile[href*="category=necklaces"]');

    /* (a) a swallow-owner eats the tap: our own handler must still navigate */
    w.__swallowTaps = true;
    tap(btn, w); await sleep(120);
    ok('control · the hostile owner really is swallowing category taps (panel opened, tiles present)',
      panelState(d).open && d.querySelectorAll('#catMenu a.mega-tile').length === 17);
    let prevented = null;
    d.getElementById('catMenu').addEventListener('click', ev => { prevented = ev.defaultPrevented; }, true);
    tap(tile(), w);
    await sleep(700);
    let s = panelState(d);
    ok('THE REPORTED BUG · with a swallow-owner eating the tap, the shopper still lands on the category',
      s.hash === '#/shop?category=necklaces' && /Necklaces/.test(s.title), JSON.stringify({ hash: s.hash, title: s.title.slice(0, 60) }));
    ok('…and the panel still closed behind them (both halves of the report are now true)',
      !s.open && !s.catOpen);
    w.__swallowTaps = false;

    /* (b) a revert-owner yanks the URL back: the watchdog must walk them there */
    w.location.hash = '#/'; await sleep(300);
    w.__revertTaps = true;
    tap(btn, w); await sleep(120);
    tap(tile(), w);
    await sleep(1200);
    s = panelState(d);
    ok('THE REPORTED BUG (race) · with a revert-owner pulling the URL back, the watchdog lands the shopper anyway',
      s.hash === '#/shop?category=necklaces' && /Necklaces/.test(s.title), JSON.stringify({ hash: s.hash, title: s.title.slice(0, 60) }));
    w.__revertTaps = false;

    /* (c) belt two: the browser's own navigation is still allowed */
    w.location.hash = '#/'; await sleep(400);
    tap(btn, w); await sleep(120);
    prevented = null;
    const t2 = tile();
    t2.addEventListener('click', ev => { prevented = ev.defaultPrevented; }, false);
    tap(t2, w);
    await sleep(500);
    ok('belt two · the tap is NOT preventDefaulted (the anchor\'s native action is still available)',
      prevented === false, 'defaultPrevented=' + prevented);

    /* (d) a scroll while the panel is open no longer kills the tap */
    w.location.hash = '#/'; await sleep(400);
    tap(btn, w); await sleep(120);
    w.dispatchEvent(new w.Event('scroll')); await sleep(80);
    ok('a page shift under an open panel no longer closes it (the mid-tap kill is gone)', panelState(d).open);
    tap(tile(), w); await sleep(600);
    ok('…and the tap still lands after that shift', panelState(d).hash === '#/shop?category=necklaces');

    /* (e) a repeat tap on the category you are standing on: exactly one redraw */
    await sleep(500);
    let redraws = 0; const realRedraw = w.Shivaa.redraw;
    w.Shivaa.redraw = (...a) => { redraws++; return realRedraw.apply(w.Shivaa, a); };
    tap(btn, w); await sleep(120);
    tap(tile(), w); await sleep(600);
    ok('a repeat tap on the current category still responds — with exactly one redraw (no double render)',
      redraws === 1 && panelState(d).hash === '#/shop?category=necklaces', 'redraws=' + redraws);
    w.Shivaa.redraw = realRedraw;
    ok('no page errors while driving all of it', errors.length === 0, errors.slice(0, 2).join(' | '));
    w.close(); server.close();
  }

  /* ── 2 · the same guarantee on the home page's category photos ─────── */
  {
    const { w, d, errors, server } = await boot(1280);
    await until(() => w.Shivaa && (w.Shivaa.state.productsCache || []).length === 77, 15000);
    await w.Shivaa.redraw(); await sleep(600);
    const card = d.querySelector('#view a.cat-mini-card[href*="category=earrings"]');
    ok('the home page shows its 17 category photos', !!card, 'no card found');
    w.__swallowTaps = true;
    tap(card, w); await sleep(900);
    const s = panelState(d);
    ok('home page · with the tap swallowed, the shopper still lands on that category',
      s.hash === '#/shop?category=earrings' && /Earrings/.test(s.title), JSON.stringify({ hash: s.hash, title: s.title.slice(0, 60) }));
    ok('home page · no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    w.close(); server.close();
  }

  /* ── 3 · the drawer's 17-category list keeps its v158 behaviour ─────── */
  {
    const { w, d, errors, server } = await boot(390);
    await until(() => w.Shivaa && (w.Shivaa.state.productsCache || []).length === 77, 15000);
    tap(d.getElementById('navToggle'), w); await sleep(200);
    tap(d.getElementById('navCats'), w); await sleep(200);
    const list = d.getElementById('dwCatList');
    ok('phone · the list opens with 17 rows', list && list.classList.contains('open') && list.querySelectorAll('a').length === 17);
    w.__swallowTaps = true;
    tap(list.querySelector('a[href*="category=bangles"]'), w); await sleep(900);
    const s = panelState(d);
    ok('phone · even a swallowed tap lands on the category, with the drawer and the list folded',
      s.hash === '#/shop?category=bangles' && !list.classList.contains('open') &&
      !d.getElementById('mainNav').classList.contains('open'), JSON.stringify({ hash: s.hash, listOpen: list.classList.contains('open') }));
    ok('phone · no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    w.close(); server.close();
  }

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v159 category-tap checks passed  ${pass === results.length ? '✦ — a category tap can no longer go nowhere' : ''}`);
  process.exit(pass === results.length ? 0 : 1);
})();
