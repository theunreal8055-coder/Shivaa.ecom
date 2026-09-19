/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v127 check — the sidebar rows + the search palette's category chips
   actually take you where they say they do.

   Owner report (17 Sep 2026): "in the search bar whenever you click on any
   category it directly shifts us to the homepage rather than that category"
   and "in the sidebar — Live Rates, Swarna Nidhi, Gold Buyback — the buttons
   are there, they look perfect, but they are not functional; every button
   takes us to the home page".

   A · static  (5) the layer exists and is loaded last; the frozen v125
                   triple is untouched (no release, no sw.js swap — the
                   owner's standing rule for a repair); v127 owns no route,
                   no price and no rate.
   B · live   (17) jsdom on the real shell: every sidebar row lands on its own
                   page from a bare URL and from '#/'; a category chip lands
                   on its own category; the palette's product / popular rows
                   still behave; tel: and ctrl-click keep their native
                   action; and — the point of the release — history.back() is
                   NEVER queued against a navigation in flight.
   C · control (1) the SAME chip tap on the shell with /js/v127.js stripped
                   out DOES fire history.back(). This is the named regression
                   check: it proves the bug was real and that this gate can
                   still see it if the layer is ever removed.

   Run:  node tools/mega/smoke/v127-check.js
   Overlay: SMOKE_CMS=<dir> node tools/mega/smoke/v127-check.js
   ══════════════════════════════════════════════════════════════════════════ */
const { JSDOM } = require('jsdom');
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
async function until(fn, ms = 12000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); }
  return false;
}

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const V127_TAG = /<script src="\/js\/v127\.js\?v=127" defer><\/script>/;

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end();
  fs.readFile(f, (e, b) => {
    if (e) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' });
    res.end(b);
  });
});

const jaipur = { gold24: 15655, gold22: 14405, gold18: 11696, silver: 242.4 };
const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', live: false,
  spot: { gold24: 15600, gold22: 14350, gold18: 11650, silver: 239 },
  jaipur, ...jaipur,
  rtgs: { rows: {}, anchor: 'mcx-future', updatedAt: new Date().toISOString() },
  premium: { gold: 55, silver: 3, gold22: 398 },
  anchorLevel: { mode: 'mcx-future', goldPerG: 15056, silverPerG: 99500 },
  history: [Object.assign({ t: new Date(Date.now() - 6e4).toISOString() }, jaipur)],
  nextUpdateIn: 60,
};

/* ── one browser session on the real shell ─────────────────────────────── */
function boot({ stripV127 = false, startHash = '', innerWidth = 420 } = {}) {
  const backs = { n: 0 };
  const errors = [];
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8')
    .replace(V127_TAG, stripV127 ? '' : m => m);
  const dom = new JSDOM(html, {
    url: `http://127.0.0.1:${server.address().port}/${startHash}`,
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.innerWidth = innerWidth; w.innerHeight = 900;
      /* a phone: max-width queries match, hover/fine-pointer ones do not */
      w.matchMedia = q => ({ matches: /max-width:\s*[6-8]\d\dpx/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {};
      Object.defineProperty(w.navigator, 'vibrate', { value: () => true, configurable: true });
      Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
      w.HTMLMediaElement.prototype.play = () => Promise.resolve();
      w.HTMLMediaElement.prototype.pause = () => {};
      w.addEventListener('error', ev => {
        if (ev.target && ev.target.tagName === 'IMG') return;
        errors.push(String(ev.message || ev.error || 'error'));
      });
      /* the thing this release is about: can anything queue a traversal
         while a tap is navigating? count every history.back(). */
      const rb = w.history.back.bind(w.history);
      Object.defineProperty(w.history, 'back', {
        configurable: true, writable: true,
        value: function () { backs.n++; return rb(); },
      });
      w.fetch = (input, init) => {
        const p = String(input).split('?')[0];
        let status = 200, out = {};
        const J = () => ({ ok: status < 300, status, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
        if (p.endsWith('/api/rates')) out = RATES_STUB;
        else if (p.endsWith('/api/settings')) out = { settings: DB.settings };
        else if (p.endsWith('/api/making-charges')) out = { table: [] };
        else if (p.endsWith('/api/catalogs')) out = { catalogs: [] };
        else if (p.endsWith('/api/auth/me')) out = { user: null };
        else if (p.endsWith('/api/products')) out = { products: DB.products };
        else if (p.includes('/api/products/')) out = { product: DB.products[0], similar: [], reviews: [], rates: DB.rates.last };
        else if (p.endsWith('/api/pages')) out = { pages: [] };
        else { status = 404; out = { error: 'not stubbed: ' + p }; }
        return Promise.resolve(J());
      };
    },
  });
  const w = dom.window, doc = w.document;
  return {
    dom, w, doc, backs, errors,
    $: s => doc.querySelector(s),
    $$: s => [...doc.querySelectorAll(s)],
    click: (el, opts) => el.dispatchEvent(new w.MouseEvent('click', Object.assign({ bubbles: true, cancelable: true }, opts))),
    booted: () => until(() => doc.querySelector('#heroCarousel') && doc.querySelectorAll('.c-slide').length >= 2, 25000),
    /* body[data-page] carries the first route segment only ('#/product/x' -> 'product') */
    at: hash => until(() => w.location.hash === hash &&
      doc.body.dataset.page === ((hash.split('?')[0].slice(2).split('/')[0]) || 'home'), 8000),
  };
}

/* the sidebar rows the owner named, in the order they sit in the drawer */
const ROWS = [
  ['#/rates', 'Live Rates'],
  ['#/buyback', 'Gold Buyback'],
  ['#/savings', 'Swarna Nidhi'],
  ['#/services', 'Bespoke & Care'],
  ['#/catalogues', 'Design Selection'],
  ['#/b2b', 'For Jewellers'],
  ['#/shop', 'All Jewellery'],
];

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const shell = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const v127 = fs.existsSync(path.join(CMS, 'js/v127.js')) ? fs.readFileSync(path.join(CMS, 'js/v127.js'), 'utf8') : '';
  const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');

  console.log('\nSHIVAA v127 — sidebar + search-bar navigation check\n');
  console.log('· A · static');

  ok('cms/js/v127.js ships and index.html loads it (defer, after app.js)',
    v127.length > 1000 && V127_TAG.test(shell) &&
    shell.indexOf('/js/v127.js') > shell.indexOf('/js/app.js'),
    'v127 layer missing or loaded before app.js');

  /* v147 fix-forward: "frozen at 125" was the v127 REPAIR's own era rule —
     later releases (v135+) legitimately moved the triple. The durable law is
     the FLOOR (never below v125) plus the triple moving TOGETHER (and sw.js
     being kept in lockstep — a repair must never swap it, a release stamps it). */
  const t125 = (re, src) => { const m = re.exec(src); return m ? parseInt(m[1], 10) : 0; };
  const relShell = t125(/window\.__SHIVAA_REL\s*=\s*(\d+)/, shell);
  const relSw = t125(/SHELL = 'shivaa-shell-v(\d+)'/, sw);
  const relApp = t125(/APP_REL\s*=\s*(\d+)/, fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8'));
  ok('the release triple is v125 or newer AND moves together (the v127 floor survives every later release)',
    relShell >= 125 && relSw === relShell && relApp === relShell,
    `shell=${relShell} app=${relApp} sw=${relSw} (v127 floor, all three equal)`);

  ok('v127 registers no route and touches no price, rate or API',
    !/pages\.[a-z]/.test(v127) && !/\/api\//.test(v127) && !/premium|ratePerGram|gold22/.test(v127));

  ok('v127 navigates through the hash only, and arms the house flag v120 honours',
    /window\.location\.hash\s*=\s*target/.test(v127) && /__shvNavigating\s*=\s*true/.test(v127));

  ok('v127 never intercepts a dialer link, an external link or a modified click',
    /indexOf\('#\/'\) !== 0\) return/.test(v127) && /metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey/.test(v127));

  /* ── B · live: the sidebar ──────────────────────────────────────────── */
  console.log('\n· B · live — sidebar rows (bare shivaa.in, no hash at all)');
  const S = boot();
  if (!(await S.booted())) { ok('the storefront boots', false, 'no hero carousel after 25 s'); server.close(); process.exit(1); }
  await until(() => S.doc.querySelectorAll('#rateStrip .rscell').length >= 1, 8000);
  await sleep(400);
  ok('the storefront boots and renders the home page', S.doc.body.dataset.page === 'home');

  for (const [href, label] of ROWS) {
    S.w.location.hash = '#/';
    await S.at('#/');
    await sleep(150);
    S.click(S.$('#navToggle'));
    await until(() => S.$('#mainNav').classList.contains('open'), 3000);
    const a = S.$(`#mainNav a[href="${href}"]`);
    if (!a) { ok(`sidebar · ${label} → ${href}`, false, 'row missing from #mainNav'); continue; }
    S.click(a);
    const landed = await S.at(href);
    await sleep(250);
    const drawerShut = !S.$('#mainNav').classList.contains('open');
    ok(`sidebar · "${label}" lands on ${href} and the drawer shuts`,
      landed && drawerShut,
      `hash=${S.w.location.hash} page=${S.doc.body.dataset.page} drawerOpen=${!drawerShut}`);
  }

  /* the same taps from an explicit #/ (the URL a returning shopper has) */
  console.log('\n· B · live — sidebar rows from #/');
  {
    S.w.location.hash = '#/';
    await S.at('#/');
    await sleep(200);
    S.click(S.$('#navToggle'));
    await until(() => S.$('#mainNav').classList.contains('open'), 3000);
    S.click(S.$('#mainNav a[href="#/rates"]'));
    const landed = await S.at('#/rates');
    ok('sidebar from "#/" · Live Rates still lands on the rates page (not home)',
      landed && /Live Rates/.test(S.$('#view').textContent),
      `hash=${S.w.location.hash} view="${S.$('#view').textContent.slice(0, 60).replace(/\s+/g, ' ')}"`);
  }

  /* tapping the row you are already standing on must still shut the drawer.
     js/v118.js preventDefaults that tap (it redraws instead of navigating),
     and a layer that bailed on defaultPrevented would leave the sheet open. */
  {
    S.click(S.$('#navToggle'));
    await until(() => S.$('#mainNav').classList.contains('open'), 3000);
    S.click(S.$('#mainNav a[href="#/rates"]'));
    await sleep(450);
    const shut = !S.$('#mainNav').classList.contains('open');
    ok('sidebar · re-tapping the page you are on still shuts the drawer and holds the page',
      shut && S.w.location.hash === '#/rates' && S.doc.body.dataset.page === 'rates',
      `drawerOpen=${!shut} hash=${S.w.location.hash} page=${S.doc.body.dataset.page}`);
  }

  /* a drawer photo tile carries a category, so it must arrive filtered */
  {
    S.w.location.hash = '#/';
    await S.at('#/');
    await sleep(200);
    S.click(S.$('#navToggle'));
    await until(() => S.$('#mainNav').classList.contains('open'), 3000);
    S.click(S.$('#mainNav .dw-tiles a[href="#/shop?category=rings"]'));
    const landed = await S.at('#/shop?category=rings');
    ok('sidebar · the Rings photo tile lands on the shop filtered to Rings',
      landed && /Rings/.test(S.$('#view').textContent),
      `hash=${S.w.location.hash} view="${S.$('#view').textContent.slice(0, 60).replace(/\s+/g, ' ')}"`);
  }

  /* ── B · live: the search palette ──────────────────────────────────── */
  console.log('\n· B · live — search-bar category chips');
  {
    S.w.location.hash = '#/';
    await S.at('#/');
    await sleep(200);
    S.click(S.$('#searchBtn'));
    await until(() => S.$('#searchDrawer').classList.contains('open') && S.$$('#searchSugg a.sugg-cat').length, 5000);
    const chips = S.$$('#searchSugg a.sugg-cat');
    const chip = chips[0];
    const href = chip.getAttribute('href');
    const key = new URLSearchParams(href.split('?')[1]).get('category');
    S.click(chip);
    const landed = await S.at(href);
    await sleep(300);
    ok(`search bar · tapping the "${key}" category chip lands on ${href}`,
      landed && new RegExp(key, 'i').test(S.$('#view').textContent),
      `hash=${S.w.location.hash} page=${S.doc.body.dataset.page}`);
    ok('search bar · the palette dismisses after the chip tap',
      !S.$('#searchDrawer').classList.contains('open'));

    /* a repeat tap on the category you are already standing on must still
       do something — a browser fires no hashchange for the same URL */
    S.click(S.$('#searchBtn'));
    await until(() => S.$('#searchDrawer').classList.contains('open') && S.$$('#searchSugg a.sugg-cat').length, 5000);
    const again = S.$$('#searchSugg a.sugg-cat').find(a => a.getAttribute('href') === href);
    S.click(again);
    await sleep(500);
    ok('search bar · re-tapping the category you are on redraws instead of dying',
      S.w.location.hash === href && S.doc.body.dataset.page === 'shop');

    /* the palette's other rows are untouched by this release */
    S.w.location.hash = '#/';
    await S.at('#/');
    S.click(S.$('#searchBtn'));
    await until(() => S.$('#searchDrawer').classList.contains('open'), 4000);
    const pop = S.$('#searchSugg .sugg-chip[data-q]');
    S.click(pop);
    const q = pop.dataset.q;
    ok('search bar · a popular-search chip still runs the search (#/shop?q=…)',
      await S.at('#/shop?q=' + encodeURIComponent(q)),
      `hash=${S.w.location.hash}`);

    S.click(S.$('#searchBtn'));
    await until(() => S.$('#searchDrawer').classList.contains('open'), 4000);
    S.w.document.getElementById('searchInput').value = 'ring';
    S.w.document.getElementById('searchInput').dispatchEvent(new S.w.Event('input', { bubbles: true }));
    await until(() => S.$$('#searchSugg .sugg[data-pid]').length, 5000);
    const pid = S.$('#searchSugg .sugg[data-pid]').dataset.pid;
    S.click(S.$('#searchSugg .sugg[data-pid]'));
    ok('search bar · a product suggestion still opens that piece (unchanged)',
      await S.at('#/product/' + pid), `hash=${S.w.location.hash}`);
  }

  /* ── B · the point of the release ──────────────────────────────────── */
  ok('history.back() was NEVER queued against any of those taps (the race is dead)',
    S.backs.n === 0, `${S.backs.n} traversal(s) fired`);

  /* ── B · native actions survive ────────────────────────────────────── */
  {
    S.w.location.hash = '#/';
    await S.at('#/');
    await sleep(150);
    S.click(S.$('#navToggle'));
    await until(() => S.$('#mainNav').classList.contains('open'), 3000);
    const tel = S.$('#mainNav a[href^="tel:"]');
    const evTel = new S.w.MouseEvent('click', { bubbles: true, cancelable: true });
    tel.dispatchEvent(evTel);
    ok('the drawer\'s call button keeps its native dialer action (not prevented)',
      !!tel && !evTel.defaultPrevented);

    const rates = S.$('#mainNav a[href="#/rates"]');
    const evMod = new S.w.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    rates.dispatchEvent(evMod);
    ok('ctrl/⌘-click on a drawer row keeps "open in a new tab" (not prevented)',
      !evMod.defaultPrevented && S.w.location.hash === '#/');
  }

  ok('no unhandled page errors in the v127 session', S.errors.length === 0, S.errors.slice(0, 3).join(' | '));
  try { S.w.close(); } catch (_) {}

  /* ── C · control: the bug, on the shell without the fix ────────────── */
  console.log('\n· C · control — same tap, /js/v127.js stripped from the shell');
  const C = boot({ stripV127: true, startHash: '#/' });
  if (!(await C.booted())) { ok('control session boots', false); }
  await sleep(500);
  ok('control · the stripped shell really is running without the layer',
    ![...C.doc.querySelectorAll('script[src]')].some(s => /v127/.test(s.getAttribute('src'))) &&
    !C.$('#mainNav').__shvV127 && !C.$('#searchSugg').__shvV127);
  {
    C.click(C.$('#searchBtn'));
    await until(() => C.$('#searchDrawer').classList.contains('open') && C.$$('#searchSugg a.sugg-cat').length, 6000);
    C.click(C.$$('#searchSugg a.sugg-cat')[0]);
    await sleep(900);
    /* v159 — the house guard moved into app.js (the category-tap guarantee
       arms window.__shvNavigating on every category link, and js/v120.js
       refuses to queue a traversal while that is set). So with this layer
       stripped the defect no longer reproduces: the control now asserts the
       STRONGER truth — no traversal is queued AND the shopper still lands on
       the category, with js/v127.js completely absent. */
    ok('control · WITHOUT the layer no traversal is queued at all (the guard now lives in app.js)',
      C.backs.n === 0, `${C.backs.n} traversal(s) — the defect came back`);
    ok('control · …and the chip tap still lands on the category without the layer',
      C.w.location.hash === '#/shop?category=rings', 'hash=' + C.w.location.hash);
  }
  try { C.w.close(); } catch (_) {}

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v127 checks passed  ${pass === results.length ? ' ✦' : ''}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
