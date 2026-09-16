/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v122 check — B2B design-desk gates (partner-booted).

   A · static  (12) v122 wiring, 122 handshake, desk search/sort markup +
                    logic, IO-gated second shots, billing math untouched,
                    partner gate intact, sticky-bar layer (js + css),
                    qty haptic
   B · live    (10) jsdom as a partner: desk renders, sort orders, search
                    filters, reset restores, sticky bar follows the bill,
                    bill modal maths, slider alive, zero page errors
   ══════════════════════════════════════════════════════════════════════════ */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const results = [];
function ok(name, pass, detail = '') { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); let f = path.join(CMS, u === '/' ? 'index.html' : u); if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end(); fs.readFile(f, (e, b) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });

const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [],
};
const PARTNER = { id: 'U1', name: 'Test Jeweller', role: 'partner', phone: '9876543210', email: 'partner@test.in' };

function bootStore(extra = '') {
  return new JSDOM(fs.readFileSync(path.join(CMS, 'index.html'), 'utf8'), {
    url: 'http://127.0.0.1:' + server.address().port + '/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; w.ResizeObserver = class { observe() {} disconnect() {} }; w.scrollTo = () => {};
      try { w.localStorage.setItem('shv_token', JSON.stringify('test-token')); } catch (_) {}
      if (extra) extra(w);
      w.fetch = input => {
        const u = new URL(String(input), 'http://127.0.0.1/'); let out = {};
        if (u.pathname === '/api/rates') out = RATES_STUB;
        else if (u.pathname === '/api/auth/me') out = { user: PARTNER };
        else if (u.pathname === '/api/wishlist') out = { wishlist: [] };
        else if (u.pathname === '/api/settings') out = { settings: DB.settings };
        else if (u.pathname === '/api/making-charges') out = { table: [] };
        else if (u.pathname === '/api/catalogs') out = { catalogs: [] };
        else if (u.pathname === '/api/products') out = { products: DB.products };
        else if (u.pathname.startsWith('/api/products/')) {
          const id = decodeURIComponent(u.pathname.split('/').pop());
          out = { product: DB.products.find(p => p.id === id), similar: DB.products.slice(1, 5), reviews: [], rates: {} };
        } else if (u.pathname === '/api/pages') out = { pages: [] };
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
      };
    },
  });
}

(async () => {
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
  const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
  const v122css = fs.readFileSync(path.join(CMS, 'css/v122.css'), 'utf8');
  const v122js = fs.readFileSync(path.join(CMS, 'js/v122.js'), 'utf8');

  console.log('\nSHIVAA v122 check\n\n· A · static gates');
  ok('the shell loads the v122 layer (css + js, after the v121/v120 layers)',
    /\/css\/v122\.css\?v=122/.test(html) && /\/js\/v122\.js\?v=122/.test(html) &&
    html.indexOf('/css/v121.css?v=121') < html.indexOf('/css/v122.css?v=122') &&
    html.indexOf('/js/v120.js?v=120') < html.indexOf('/js/v122.js?v=122'));
  ok('service worker precaches the v122 layer',
    /'\/css\/v122\.css\?v=122'/.test(sw) && /'\/js\/v122\.js\?v=122'/.test(sw));
  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(app), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  ok('release stamps stay a consistent triple (shell = script = worker)',
    !!shellRel && !!appRel && !!swRel && shellRel[1] === appRel[1] && appRel[1] === swRel[1],
    `${shellRel && shellRel[1]} / ${appRel && appRel[1]} / ${swRel && swRel[1]}`);
  ok('release handshake is 122 on both sides (shell v122, script key v122)',
    /__SHIVAA_REL\s*=\s*(122|123|124|125)/.test(html) && /APP_REL\s*=\s*(122|123|124|125)/.test(app) &&
    /SHELL = 'shivaa-shell-v(122|123|124|125)'/.test(sw) && /\/js\/app\.js\?v=(122|123|124|125)/.test(html) &&
    /'\/js\/app\.js\?v=(122|123|124|125)'/.test(sw));
  ok('desk markup: search box, 5-way sort, matchable name + SKU on cards',
    /id="dsfSearch" type="search" enterkeyhint="search"/.test(app) &&
    /id="dsfSort"[\s\S]{0,400}value="sel"[\s\S]{0,200}value="wasc"[\s\S]{0,200}value="wdesc"[\s\S]{0,200}value="az"/.test(app) &&
    /data-name="\$\{esc\(p\.name\)\}" data-sku="\$\{esc\(p\.sku\)\}"/.test(app));
  ok('desk logic: search + sort persist, query matches name/SKU (debounced), sorter is stable',
    /'dsfSearch', 'dsfCat'/.test(app) && /'dsfWMax', 'dsfSort'/.test(app) &&
    /c\.dataset\.name \|\| ''\)\.toLowerCase\(\)\.includes\(q\)/.test(app) &&
    /c\.dataset\.sku \|\| ''\)\.toLowerCase\(\)\.includes\(q\)/.test(app) &&
    /_dsSearchT = setTimeout\(\(\) => \{ remember\(\); apply\(\); \}, 120\)/.test(app) &&
    /function dsSort\(\)/.test(app) && /_dsi/.test(app) && /if \(e\) grid\.appendChild\(e\)/.test(app));
  ok('desk photos: second shots load near-view only, decode async, logo fallback',
    /rootMargin: '300px'/.test(app) && !/has-multi img:nth-child\(2\)'\)\.forEach\(im =>/.test(app) &&
    /decoding="async" loading="lazy" onerror="this\.onerror=null;this\.src='\/images\/logo\.png\?v=122'"/.test(app));
  ok('billing math untouched: fine-metal factor in bar, bill and place button',
    (app.match(/state\.settings\.metalFactor \|\| 0\.92/g) || []).length >= 2 &&
    /Metal Settlement Bill/.test(app) && /Place Metal Order \(\$\{fine\} g fine\)/.test(app));
  ok('partner gate intact: the desk still needs a verified jeweller',
    /if \(!isPartner\(\)\)/.test(app) && /b2b-gate/.test(app) && /pages\.catalogues/.test(app));
  ok('sticky-bar JS: self-guarded, wraps the bill once, follows the top total',
    /__shv122/.test(v122js) && /id = 'dsBar'/.test(v122js) && /updateBar\._dsb/.test(v122js) &&
    /\.ds-total/.test(v122js) && /has-dsbar/.test(v122js) && /ShivaaDS\.proceed\(\)/.test(v122js) &&
    /#\\\/catalogues/.test(v122js) && /use strict/.test(v122js));
  ok('sticky-bar CSS: tray pattern, above the bottom nav, cards skip off-screen work',
    /\.ds-bar \{[\s\S]{0,300}position: fixed/.test(v122css) && /\.ds-bar\[hidden\] \{ display: none !important/.test(v122css) &&
    /bottom: calc\(78px \+ env\(safe-area-inset-bottom\)\)/.test(v122css) &&
    /body\.has-dsbar \.wa-fab/.test(v122css) &&
    /\.ds-card \{\s*content-visibility: auto/.test(v122css) && /contain-intrinsic-size: auto 300px/.test(v122css));
  ok('qty taps answer with a haptic tick', /navigator\.vibrate && navigator\.vibrate\(8\)/.test(app));

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log('\n· B · live behaviour (partner) — ' + origin);
  const errors = [];
  const dom = bootStore(w => w.addEventListener('error', e => { if (!(e.target && e.target.tagName === 'IMG')) errors.push(e.message || String(e.error)); }));
  const w = dom.window, d = w.document;
  ok('storefront boots as a partner', await until(() => w.Shivaa && w.Shivaa.state.user && w.Shivaa.state.user.role === 'partner' && w.Shivaa.state.productsCache.length === 77, 20000));

  w.location.hash = '#/catalogues';
  const vis = () => [...d.querySelectorAll('#dsGrid .ds-card')].filter(c => c.style.display !== 'none');
  ok('the desk renders: 77 cards, search, sort, bill total',
    await until(() => d.querySelectorAll('#dsGrid .ds-card').length === 77 && d.querySelector('#dsfSearch') && d.querySelector('#dsfSort') && d.querySelector('#dsFine')));

  d.querySelector('#dsfSort').value = 'wasc';
  d.querySelector('#dsfSort').dispatchEvent(new w.Event('change', { bubbles: true }));
  await sleep(200);
  const wts = vis().map(c => +c.dataset.w);
  ok('weight sort orders the desk light-first', wts.length === 77 && wts[0] <= wts[wts.length - 1] && wts.every((x, i) => i === 0 || wts[i - 1] <= x),
    wts.slice(0, 3).join(',') + ' … ' + wts.slice(-3).join(','));

  const sku = d.querySelector('#dsGrid .ds-card').dataset.sku;
  d.querySelector('#dsfSearch').value = sku;
  d.querySelector('#dsfSearch').dispatchEvent(new w.Event('input', { bubbles: true }));
  ok('search narrows to name/SKU matches and the count reads true',
    await until(() => { const v = vis(); return v.length > 0 && v.length < 77 && v.every(c => (c.dataset.name + ' ' + c.dataset.sku).toLowerCase().includes(sku.toLowerCase())) && /shown/.test(d.querySelector('#dsShown').textContent); }),
    `query: ${sku}`);

  d.querySelector('#dsfReset').click();
  ok('reset restores the full desk', await until(() => d.querySelector('#dsfSearch').value === '' && d.querySelector('#dsfSort').value === '' && vis().length === 77));

  const pid = d.querySelector('#dsGrid .ds-card').id.replace(/^ds-/, '');
  w.ShivaaDS.qty(pid, 1);
  ok('the sticky bar follows the bill (shows with the same fine grams)',
    await until(() => !d.querySelector('#dsBar').hidden && d.body.classList.contains('has-dsbar') &&
      d.querySelector('#dsBarFine').textContent === d.querySelector('#dsFine').textContent));
  w.ShivaaDS.qty(pid, -1);
  await sleep(200);
  ok('emptying the bill hides the bar', d.querySelector('#dsBar').hidden && !d.body.classList.contains('has-dsbar'));

  w.ShivaaDS.qty(pid, 2);
  w.ShivaaDS.proceed();
  ok('proceed opens the metal settlement bill', await until(() => (d.querySelector('#modalOverlay') || { textContent: '' }).textContent.includes('Metal Settlement Bill')));
  w.Shivaa.closeModal();

  const multi = d.querySelector('.ds-slider.has-multi');
  const cnt = multi && multi.querySelector('[data-count]');
  const before = cnt && cnt.textContent;
  if (multi) multi.querySelector('.ds-next').click();
  ok('photo sliders still swipe (existing behaviour kept)', !!multi && await until(() => cnt.textContent !== before), before);
  ok('no unhandled page errors in the v122 session', errors.length === 0, errors.slice(0, 3).join(' | '));

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v122 checks passed  ${pass === results.length ? '✦' : '✗'}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); server.close(); process.exit(1); });
