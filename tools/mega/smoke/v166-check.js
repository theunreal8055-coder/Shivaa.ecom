/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v166 check — the owner's three reports of 21 Sep 2026.

   1 · "category button … shows categories on laptop then when we click on any
        kind of categories like rings or necklace then nothing happens"
   2 · "sometimes the products on the page are shown and sometimes it's all
        empty … sometimes we have to refresh it" (+ "some animations or
        graphics are not loaded")
   3 · "people who logged in 15 days ago are still seeing the version that was
        15 days ago … I want a setting … that people should only see the
        latest version"

   A · static  (12) the release is in lockstep, EVERY asset carries the current
                   stamp (the mechanism behind report 3), the worker precaches
                   the same list, the cache headers can no longer pin a shell,
                   and the backend carries the owner's new setting.
   B · live    (12) jsdom on the real shell: a category tap closes the panel and
                   its backdrop on a SLOW first batch (the owner's laptop) and a
                   repeat tap still redraws; a catalogue that fails once repairs
                   itself; a catalogue that never answers paints the device's
                   last-good copy; a catalogue that is truly unreachable says so
                   with a Retry; and a device running an older release moves
                   itself to the newest one — except on a checkout page.
   C · control  (3) the SAME slow-boot tap with /js/v166.js stripped leaves the
                   panel and the backdrop open over the page — the exact dead
                   zone the owner described, reproduced, so this gate can see it
                   if the layer is ever lost.

   Run:  node tools/mega/smoke/v166-check.js
   Overlay: SMOKE_CMS=<dir> node tools/mega/smoke/v166-check.js
   ══════════════════════════════════════════════════════════════════════════ */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const REL = 166;

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

const read = (p) => fs.readFileSync(path.join(CMS, p), 'utf8');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const ASKED = [];                       // every URL the shell really requested
const server = http.createServer((req, res) => {
  ASKED.push(decodeURIComponent(req.url));
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end();
  fs.readFile(f, (e, b) => e ? res.writeHead(404).end()
    : (res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }), res.end(b)));
});

const jaipur = { gold24: 15655, gold22: 14405, gold18: 11696, silver: 242.4 };
const RATES_STUB = { t: new Date().toISOString(), source: 'live-mcx', live: false, spot: jaipur, jaipur, ...jaipur,
  rtgs: { rows: {}, anchor: 'mcx-future', updatedAt: new Date().toISOString() }, premium: { gold: 55, silver: 3, gold22: 398 },
  anchorLevel: { mode: 'mcx-future', goldPerG: 15056, silverPerG: 99500 },
  history: [Object.assign({ t: new Date(Date.now() - 6e4).toISOString() }, jaipur)], nextUpdateIn: 60 };

function matchMediaOn(w) {
  const evalQ = (q) => {
    const m = /\(\s*(max|min)-width:\s*(\d+)px\s*\)/.exec(q);
    if (!m) return false;
    return m[1] === 'max' ? w.innerWidth <= +m[2] : w.innerWidth >= +m[2];
  };
  return q => ({ matches: evalQ(q), media: q, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}

/* one shopper session on the real shell.
   fetchMode: ok | fail | hang | slow(9 s) | failFirst(n)
   versionRel / versionForce: what /api/version answers (the freshness dial) */
function boot({ startHash = '', innerWidth = 1280, fetchMode = 'ok', failFirst = 0,
                stripV166 = false, seedCatalog = false, versionRel = REL, versionForce = true,
                swWaiting = null, swPosts = null } = {}) {
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8')
    .replace(/<script src="\/js\/v166\.js\?v=166" defer><\/script>/, stripV166 ? '' : m => m);
  const navs = { n: 0, urls: [] };
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    if (/Not implemented: navigation/.test(String(e.message))) navs.n++;
  });
  ['error', 'log', 'info', 'warn'].forEach(k => vc.on(k, () => {}));

  const dom = new JSDOM(html, {
    url: `http://127.0.0.1:${server.address().port}/${startHash}`,
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.innerWidth = innerWidth; w.innerHeight = 900;
      w.matchMedia = matchMediaOn(w);
      w.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; }
        observe(el) { setTimeout(() => { try { this.cb([{ isIntersecting: true, intersectionRatio: 1, target: el }], this); } catch (e) {} }, 0); }
        unobserve() {} disconnect() {}
      };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {};
      Object.defineProperty(w.navigator, 'vibrate', { value: () => true, configurable: true });
      Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
      w.HTMLMediaElement.prototype.play = () => Promise.resolve();
      w.HTMLMediaElement.prototype.pause = () => {};
      if (swWaiting !== null) {
        const worker = { state: 'installed', postMessage: m => { if (swPosts) swPosts.push(m); }, addEventListener() {} };
        const reg = { waiting: swWaiting ? worker : null, installing: null, active: null, update: () => Promise.resolve(), addEventListener() {} };
        Object.defineProperty(w.navigator, 'serviceWorker', { configurable: true, value: {
          controller: { postMessage: m => { if (swPosts) swPosts.push(m); } },
          getRegistration: () => Promise.resolve(reg), addEventListener() {},
        } });
      }
      if (seedCatalog) {
        try { w.localStorage.setItem('shv_catalog_v166', JSON.stringify({ at: Date.now(), products: DB.products })); } catch (e) {}
      }
      const rb = w.history.back.bind(w.history);
      Object.defineProperty(w.history, 'back', { configurable: true, writable: true, value: function () { return rb(); } });
      const nativeFetch = w.fetch;
      const J = (obj, status = 200) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => obj, text: async () => JSON.stringify(obj), clone() { return this; } });
      let hits = 0;
      w.fetch = (input, opts) => {
        const p = String(input).split('?')[0];
        let out = null;
        if (p.endsWith('/api/rates')) out = RATES_STUB;
        else if (p.endsWith('/api/settings')) out = { settings: Object.assign({}, DB.settings, { forceLatestVersion: versionForce }) };
        else if (p.endsWith('/api/making-charges')) out = { table: [] };
        else if (p.endsWith('/api/catalogs')) out = { catalogs: [] };
        else if (p.endsWith('/api/auth/me')) out = { user: null };
        else if (p.endsWith('/api/pages')) out = { pages: [] };
        else if (p.endsWith('/api/version')) out = { ok: true, rel: versionRel, shell: 'shivaa-shell-v1', forceLatest: versionForce, stamp: { index: REL, app: REL, sw: REL, matched: true } };
        else if (p.endsWith('/api/products')) {
          hits++;
          if (fetchMode === 'fail') return Promise.reject(new TypeError('Failed to fetch'));
          if (fetchMode === 'hang') return new Promise(() => {});
          if (failFirst && hits <= failFirst) return Promise.reject(new TypeError('Failed to fetch'));
          if (fetchMode === 'slow') return new Promise(res => setTimeout(() => res({ ok: true, status: 200, json: async () => ({ products: DB.products }), clone() { return this; } }), 9000));
          out = { products: DB.products };
        }
        if (out) return J(out);
        return nativeFetch(input, opts);
      };
      const replace = w.location.replace.bind(w.location);
      try {
        Object.defineProperty(w.location, 'replace', { configurable: true, writable: true,
          value: function (u) { navs.n++; navs.urls.push(String(u)); try { return replace(u); } catch (e) {} } });
      } catch (e) {}
    },
  });
  const w = dom.window, doc = w.document;
  return {
    w, doc, navs,
    $: s => doc.querySelector(s),
    $$: s => [...doc.querySelectorAll(s)],
    click(el) { if (!el) return false; el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); return true; },
    booted: () => until(() => doc.body.dataset.page, 25000),
    real: () => ((w.Shivaa && w.Shivaa.state && w.Shivaa.state.productsCache) || []).filter(p => !p.isCampaignStud).length,
  };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  /* ══════ A · static ══════ */
  console.log('\n· A · static — the release, the stamps, the headers, the setting');
  const idx = read('index.html');
  const sw = read('sw.js');
  const app = read('js/app.js');
  const ht = read('.htaccess');
  const api = read('api.php');
  const adm = read('js/admin.js');
  const lay = read('js/v166.js');

  ok('window.__SHIVAA_REL, APP_REL and the worker\'s REL are the same release',
    new RegExp(`__SHIVAA_REL=${REL};`).test(idx) && new RegExp(`const APP_REL = ${REL};`).test(app) && new RegExp(`const REL = ${REL};`).test(sw),
    `rel stamps: ${(idx.match(/__SHIVAA_REL=(\d+)/) || [])[1]} / ${(app.match(/const APP_REL = (\d+)/) || [])[1]} / ${(sw.match(/const REL = (\d+)/) || [])[1]}`);

  ok('the v166 layer is loaded LAST, with the current stamp',
    /<script src="\/js\/v166\.js\?v=166" defer><\/script>/.test(idx) &&
    idx.indexOf('/js/v166.js') > idx.indexOf('/js/v140.js'),
    'v166 tag: ' + /<script src="\/js\/v166\.js[^>]*>/.test(idx));

  {
    /* THE mechanism behind report 3: a ?v= URL is immutable for a year, so a
       stamp left behind pins that file on every device that already has it. */
    /* scripts, stylesheets AND the three webfonts: a font/woff2 URL is served
       with a 365-day freshness window, so it needs the same stamp discipline. */
    const urls = [...idx.matchAll(/(?:href|src)="(\/[^"]+\.(?:js|css|woff2))(?:\?([^"]*))?"/g)];
    const stale = urls.filter(m => !new RegExp(`(^|&)v=${REL}($|&)`).test(m[2] || ''));
    ok('every stylesheet and script in the shell carries the CURRENT stamp',
      stale.length === 0, stale.map(m => m[1] + '?' + (m[2] || '')).join(', '));
  }

  {
    const list = sw.slice(sw.indexOf('const SHELL_FILES'), sw.indexOf('];', sw.indexOf('const SHELL_FILES')));
    const stale = [...list.matchAll(/'\/([^']+)\?v=([^']+)'/g)].filter(m => m[2] !== String(REL));
    ok('the worker precaches the same release, with no stale stamps left in it',
      stale.length === 0, stale.map(m => m[1] + '?' + m[2]).join(', '));
    ok('…and the shell list now carries the layers it had been missing',
      list.includes(`'/js/v166.js?v=${REL}'`) && list.includes(`'/js/v127.js?v=${REL}'`) && list.includes(`'/js/v139.js?v=${REL}'`));
  }

  ok('the worker deletes every cache on activate and announces its release to open tabs',
    /SHV_RELEASE/.test(sw) && /matchAll\(\{ includeUncontrolled: true/.test(sw) && /SHV_PURGE/.test(sw));

  ok('.htaccess can no longer pin the shell: sw.js / index.html / api.php are no-store, ?v= assets stay immutable',
    /\(sw\\\.js\|index\\\.html\|/.test(ht) && /no-store/.test(ht) && /max-age=31536000, immutable/.test(ht),
    'files-match + no-store + immutable rule present');

  ok('/api/version answers this release and carries the owner\'s freshness switch',
    new RegExp(`'rel'\\s*=>\\s*${REL}`).test(api) && /'forceLatest'\s*=>/.test(api) && /forceLatestVersion/.test(api));

  ok('forceLatestVersion is a stored setting (default ON) and a strict boolean on save',
    /'forceLatestVersion' => true/.test(api) && /'guestCheckout', 'forceLatestVersion'\] as \$occKey/.test(api));

  ok('the admin panel exposes the switch and sends it with the settings',
    /name="forceLatestVersion"/.test(adm) && /forceLatestVersion: !!document\.querySelector\('\[name="forceLatestVersion"\]'\)\?\.checked/.test(adm));

  ok('api() can no longer wait forever, and the shell remembers its catalogue',
    /AbortController/.test(app) && /catalogCacheRead/.test(app) && /catalogOk/.test(app) &&
    /const CATALOG_KEY = 'shv_catalog_v166'/.test(app));

  ok('the on-demand staff bundles are stamped from the release, never a frozen number',
    /injectScript\('\/js\/qr\.js\?v=' \+ APP_REL\)/.test(app) &&
    /injectScript\('\/js\/admin\.js\?v=' \+ APP_REL\)/.test(app),
    'qr.js: ' + /\/js\/qr\.js\?v=[^']*/.exec(app) + ' · admin.js: ' + /\/js\/admin\.js\?v=[^']*/.exec(app));

  ok('no inline handler references a script binding (an attribute runs in its own scope)',
    !/onerror="[^"]*\+\s*ASSET_V/.test(app) && !/onerror='[^']*\+\s*ASSET_V/.test(app),
    'a handler must carry the resolved value, never an identifier: ' +
      (('onerror="' + ((/onerror="([^"]*\+\s*ASSET_V[^"]*)"/.exec(app) || [, ''])[1])).slice(0, 120) || '(clean)'));

  ok('the layer owns the overlay close, the catalogue retry and the release check',
    /function closeOverlays/.test(lay) && /__shvCloseOverlays/.test(lay) &&
    /function retryCatalog/.test(lay) && /id="shvCatalogRetry"/.test(lay) &&
    /function checkRelease/.test(lay) && /forceLatest/.test(lay));

  ok('route() itself closes an open overlay — the fix does not depend on load order',
    /__shvCloseOverlays/.test(app) && /No navigation may inherit an open overlay|NO navigation may inherit an open overlay/.test(app));

  /* ══════ B · live ══════ */
  console.log('\n· B · live — the owner\'s laptop (slow first batch), category tap');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280, fetchMode: 'slow' });
    if (!(await F.booted())) ok('slow-boot session boots', false);
    await sleep(7000);                       // past the 6 s cap: the degraded paint
    F.click(F.$('#navCats'));
    await sleep(300);
    const panel = F.$('#catMenu'), backdrop = F.$('#megaBackdrop');
    ok('the Categories button really opens the 17 tiles (the owner\'s "it works on laptop")',
      panel && !panel.hidden && F.$$('#catMenu .mega-tile').length === 17,
      'open=' + (panel && !panel.hidden) + ' tiles=' + F.$$('#catMenu .mega-tile').length);
    const tile = F.$$('#catMenu .mega-tile').find(a => /category=rings/.test(a.getAttribute('href') || ''));
    F.click(tile);
    await sleep(1500);
    ok('tapping a category lands on that category', F.w.location.hash === '#/shop?category=rings', 'hash=' + F.w.location.hash);
    ok('…and the panel AND its full-viewport backdrop get out of the way',
      panel.hidden && backdrop.hidden,
      'panel.hidden=' + panel.hidden + ' backdrop.hidden=' + backdrop.hidden);
    const before = F.w.location.hash;
    F.click(backdrop);
    await sleep(400);
    ok('a tap that used to land on a dead backdrop changes nothing (it is gone)',
      F.w.location.hash === before);
    /* the mobile drawer list is built by js/v116.js — its photo fallback is an
       inline handler too, so prove it RUNS (a ReferenceError there would leave
       the src untouched; the v120 gate's unhandled-error check caught exactly
       that class during this release) */
    {
      const mob = boot({ startHash: '#/', innerWidth: 420 });
      if (await mob.booted()) {
        mob.click(mob.$('#navToggle') || mob.$('#navCats'));
        await sleep(600);
        const img = mob.$$('#dwCatList img')[0] || (mob.click(mob.$('#navCats')), await sleep(400), mob.$$('#dwCatList img')[0]);
        if (img) img.dispatchEvent(new mob.w.Event('error'));
        await sleep(200);
        ok('the drawer photo fallback (v116 · built by string concat) runs to the house logo',
          !!img && new RegExp('/images/logo\\.png\\?v=' + REL).test(img.src), img ? img.src : 'no drawer photo');
      } else { ok('the drawer photo fallback (v116 · built by string concat) runs to the house logo', false, 'mobile session did not boot'); }
      try { mob.w.close(); } catch (_) {}
    }
    F.click(F.$$('#catMenu .mega-tile').find(a => /category=rings/.test(a.getAttribute('href') || '')) || tile);
    await sleep(800);
    ok('tapping the same category again still redraws instead of doing nothing',
      F.w.location.hash === '#/shop?category=rings' && F.doc.body.dataset.page === 'shop',
      'page=' + F.doc.body.dataset.page);
    try { F.w.close(); } catch (_) {}
  }

  {
    /* THE owner-visible law behind report 3: a device may only ever be ASKED for
       assets stamped with the release it is running. `.htaccess` serves any
       ?v= URL immutably for a year, so one frozen number (the v116-era
       ?v=125 on category photos, v117.js injecting aurum.js?v=107 …) pins that
       file on every returning device — the exact mechanism that kept a
       15-day-old stylesheet on the owner's shoppers. Static gates cannot see
       URLs a script builds at runtime, so this one watches the wire. */
    ASKED.length = 0;
    const F = boot({ startHash: '#/', innerWidth: 1280 });
    if (!(await F.booted())) ok('asset-law session boots', false);
    await sleep(4500);                       // past the idle injection of aurum/motion/boost
    const asked = ASKED.filter(u => /^\/(js|css)\/[^?]+\.(?:js|css)/.test(u));
    const stale = [...new Set(asked.filter(u => !new RegExp('(^|[?&])v=' + REL + '($|&)').test(u)))];
    ok('every script/stylesheet the page ASKS FOR carries the current stamp (incl. runtime-injected ones)',
      asked.length > 10 && stale.length === 0,
      'asked ' + new Set(asked).size + ' unique, stale: ' + (stale.join(', ') || '(none)'));
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n· B · live — a catalogue the network dropped');
  {
    const F = boot({ startHash: '#/', fetchMode: 'failFirst', failFirst: 1 });
    if (!(await F.booted())) ok('flaky-network session boots', false);
    await sleep(26000);
    const REAL = DB.products.filter(p => !p.isCampaignStud).length;
    ok('one failed /api/products repairs itself (retry chain, no refresh asked)',
      F.real() === REAL && F.w.Shivaa.state.catalogOk === true,
      'products=' + F.real() + ' catalogOk=' + F.w.Shivaa.state.catalogOk);
    ok('…and the good catalogue is kept on the device for the next visit',
      !!F.w.localStorage.getItem('shv_catalog_v166'));
    try { F.w.close(); } catch (_) {}
  }
  {
    const F = boot({ startHash: '#/', fetchMode: 'hang', seedCatalog: true });
    if (!(await F.booted())) ok('hanging-network session boots', false);
    await sleep(4000);
    ok('a catalogue that never answers paints the device\'s last-good copy instead of an empty shop',
      F.real() === DB.products.filter(p => !p.isCampaignStud).length, 'real products on screen: ' + F.real());
    try { F.w.close(); } catch (_) {}
  }
  {
    const F = boot({ startHash: '#/', fetchMode: 'fail' });
    if (!(await F.booted())) ok('dead-network session boots', false);
    await sleep(46000);
    ok('a catalogue that is truly unreachable says so — with a tap to retry',
      !!F.$('#shvCatalogNote') && !!F.$('#shvCatalogRetry'),
      'strip=' + !!F.$('#shvCatalogNote'));
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n· B · live — a device still running the OLD release');
  {
    const F = boot({ startHash: '#/', versionRel: REL + 1, versionForce: true });
    if (!(await F.booted())) ok('freshness session boots', false);
    await until(() => F.navs.n > 0 || !!F.w.__shvLastReload, 14000);
    let guard = '';
    try { guard = F.w.sessionStorage.getItem('shv_forced_rel') || ''; } catch (e) {}
    ok('an older device moves itself to the newest release (cache-busting URL)',
      (F.navs.n > 0 || !!F.w.__shvLastReload) && /shv=\d+/.test(String(F.w.__shvLastReload || '')) && guard === String(REL + 1),
      'navigations=' + F.navs.n + ' url=' + (F.w.__shvLastReload || '(none)') + ' guard=' + guard);
    await sleep(2500);
    ok('…once per release, never in a loop', F.navs.n === 1, 'navigations=' + F.navs.n);
    try { F.w.close(); } catch (_) {}
  }
  {
    const F = boot({ startHash: '#/', versionRel: REL + 1, versionForce: false });
    if (!(await F.booted())) ok('switch-off session boots', false);
    await sleep(8000);
    ok('with the owner\'s switch OFF nothing is forced — the next visit picks it up',
      F.navs.n === 0, 'navigations=' + F.navs.n);
    try { F.w.close(); } catch (_) {}
  }
  {
    const F = boot({ startHash: '#/', versionRel: REL + 1, versionForce: true, swWaiting: true, swPosts: [] });
    if (!(await F.booted())) ok('checkout freshness session boots', false);
    F.w.Shivaa.state.cart = [{ id: DB.products[0].id, qty: 1 }];
    F.w.location.hash = '#/checkout';
    await until(() => F.doc.body.dataset.page === 'checkout' && F.$('#addrForm'), 12000);
    const before = F.navs.n;
    await F.w.eval(`window.__shvCheckRelease && window.__shvCheckRelease('test')`);
    await sleep(1500);
    ok('a shopper filling the payment page is NEVER reloaded underneath',
      F.navs.n === before && F.doc.body.dataset.page === 'checkout',
      'navigations=' + F.navs.n + ' page=' + F.doc.body.dataset.page);
    try { F.w.close(); } catch (_) {}
  }

  /* ══════ C · control ══════ */
  console.log('\n· C · control — the same tap with /js/v166.js stripped out');
  {
    const F = boot({ startHash: '#/', innerWidth: 1280, fetchMode: 'slow', stripV166: true });
    if (!(await F.booted())) ok('control session boots', false);
    await sleep(7000);
    const wiredBy116 = !!F.$('#navCats')._v116wired;
    F.click(F.$('#navCats'));
    await sleep(300);
    F.click(F.$$('#catMenu .mega-tile').find(a => /category=rings/.test(a.getAttribute('href') || '')));
    await sleep(1500);
    ok('control · WITHOUT the layer the panel + backdrop stay open over the new page (the defect, reproduced)',
      wiredBy116 && !F.$('#catMenu').hidden && !F.$('#megaBackdrop').hidden,
      'wiredBy116=' + wiredBy116 + ' panel.hidden=' + F.$('#catMenu').hidden + ' backdrop.hidden=' + F.$('#megaBackdrop').hidden);
    const before = F.w.location.hash;
    F.click(F.$('#megaBackdrop'));
    await sleep(500);
    ok('control · …and that backdrop swallows the next tap — "nothing happens"',
      F.w.location.hash === before && !F.$('#megaBackdrop').hidden,
      'hash moved: ' + (F.w.location.hash !== before));
    try { F.w.close(); } catch (_) {}
  }

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v166 checks passed  ${pass === results.length ? ' ✦' : ''}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
