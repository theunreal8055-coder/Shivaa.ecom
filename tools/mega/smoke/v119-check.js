/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v119 check — 27 gates.

   A · static   (7)  release wiring, skeleton, preload, .htaccess, honesty guards
   B · rates    (6)  the Task-2 owner decision: 22K premium ₹398 + anchorLevel
   C · live     (14) jsdom: rate card, shop slices, HUID chip, install chip, pinch
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

/* the live /api/rates shape v119 must publish */
const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [],
};
const HUID_PRODUCT = Object.assign({}, DB.products[0], {
  id: 'PGS-HUID-TEST', sku: 'PGS-HUID-TEST', name: 'HUID test ring',
  hallmark: { status: 'verified', verified: true, source: 'test', checkedAt: null, entries: [{ huid: 'AB12CD' }] },
});

function bootStore(extra = '') {
  return new JSDOM(fs.readFileSync(path.join(CMS, 'index.html'), 'utf8'), {
    url: 'http://127.0.0.1:' + server.address().port + '/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; w.ResizeObserver = class { observe() {} disconnect() {} }; w.scrollTo = () => {};
      if (extra) extra(w);
      w.fetch = input => {
        const u = new URL(String(input), 'http://127.0.0.1/'); let out = {};
        if (u.pathname === '/api/rates') out = RATES_STUB;
        else if (u.pathname === '/api/settings') out = { settings: DB.settings };
        else if (u.pathname === '/api/making-charges') out = { table: [] };
        else if (u.pathname === '/api/catalogs') out = { catalogs: [] };
        else if (u.pathname === '/api/products') out = { products: DB.products };
        else if (u.pathname.startsWith('/api/products/')) {
          const id = decodeURIComponent(u.pathname.split('/').pop());
          out = { product: id === 'PGS-HUID-TEST' ? HUID_PRODUCT : DB.products.find(p => p.id === id), similar: DB.products.slice(1, 5), reviews: [], rates: {} };
        } else if (u.pathname === '/api/pages') out = { pages: [] };
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
      };
    },
  });
}
const touchEv = (w, type, points) => { const e = new w.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'touches', { value: points.map(p => ({ clientX: p[0], clientY: p[1] })) }); return e; };

(async () => {
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
  const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
  const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
  const v119css = fs.readFileSync(path.join(CMS, 'css/v119.css'), 'utf8');
  const v119js = fs.readFileSync(path.join(CMS, 'js/v119.js'), 'utf8');
  const v107js = fs.readFileSync(path.join(CMS, 'js/v107.js'), 'utf8');
  const adminJs = fs.readFileSync(path.join(CMS, 'js/admin.js'), 'utf8');
  const htaccess = fs.readFileSync(path.join(CMS, '.htaccess'), 'utf8');
  const dbJson = fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8');

  console.log('\nSHIVAA v119 check\n\n· A · static gates');
  ok('release handshake is 119 on both sides',
    /__SHIVAA_REL\s*=\s*(119|120|121|122|123|124|125|126|127|128|129|130|131|132|133|134|135|136)/.test(html) && /APP_REL\s*=\s*(119|120|121|122|123|124|125|126|127|128|129|130|131|132|133|134|135|136)/.test(app));
  ok('the shell loads the v119 layer (css + js)',
    /\/css\/v119\.css\?v=119/.test(html) && /\/js\/v119\.js\?v=119/.test(html));
  ok('service-worker shell is v119 and precaches the whole v119 layer',
    /SHELL = 'shivaa-shell-v(119|120|121|122|123|124|125|126|127|128|129|130|131|132|133|134|135|136)'/.test(sw) && /'\/css\/v119\.css\?v=119'/.test(sw) && /'\/js\/v119\.js\?v=119'/.test(sw) && /'\/js\/app\.js\?v=(119|120|121|122|123|124|125|126|127|128|129|130|131|132|133|134|135|136)'/.test(sw));
  ok('index.html ships a first-paint skeleton that v119.css retires',
    /<main id="view"><div class="shv-skeleton"/.test(html) && /body\.shv-ready \.shv-skeleton/.test(v119css));
  const heroPreload = /<link rel="preload" as="image" ([^>]*?)fetchpriority="high">/.exec(html);
  const heroUrls = heroPreload ? [...heroPreload[1].matchAll(/(\/images\/[^\s"',]+)/g)].map(m => m[1]) : [];
  ok('hero LCP image preloads with high priority and exists on disk',
    heroUrls.length > 0 && heroUrls.every(u => fs.existsSync(path.join(CMS, u))), heroUrls.join(', ') || 'missing preload');
  ok('.htaccess adds brotli + immutable ?v= caching and keeps deflate',
    /mod_brotli\.c/.test(htaccess) && /BROTLI_COMPRESS/.test(htaccess) && /immutable/.test(htaccess) && /mod_deflate\.c/.test(htaccess));
  ok('honesty guards: HUID chip can only print a real HUID, and no dead image derivatives are referenced',
    /\/\^\[A-Za-z0-9\]\{4,12\}\$\//.test(app) && /HUID check/.test(app) && /BIS Care/.test(app) &&
    !/shv_huid_fake|huid"\s*:\s*"[A-Z0-9]{6}"/.test(app) && !/-400\.jpg|-800\.jpg|\$\{b\}-400/.test(app));

  console.log('\n· B · rates — the Task-2 owner decision (22K premium 398, desk physical)');
  ok('api.php defines the 22K premium (default 398) and publishes premium.gold22',
    /function gold22_premium\(array \$db\): int \{[\s\S]{0,160}\?\? 398/.test(api) && /'premium' => \['gold22' => gold22_premium\(\$db\)/.test(api));
  ok('/api/rates derives jaipur from the ONE anchor block and publishes anchorLevel',
    /jaipur_from_anchor\(\$db, \$ancLevel\)/.test(api) && /'anchorLevel' => \$ancLevel/.test(api) &&
    /'mode' => \$anc\['mcxOn'\] \? 'mcx-future' : 'spot'/.test(api) && /'silverPerG'/.test(api));
  ok('settings PUT whitelists the 22K premium (so the owner can tune it in admin)',
    /'gold22Premium' => \[0, 100000, 'int'\]/.test(api));
  const dm = JSON.parse(dbJson);
  ok('master db.json carries gold22Premium 398 · 77 products · 4 images each',
    dm.settings.gold22Premium === 398 && dm.products.length === 77 && dm.products.every(p => (p.images || []).length === 4),
    `${dm.settings.gold22Premium} / ${dm.products.length} products`);
  ok('admin settings expose and save the 22K premium',
    /name="gold22Premium"/.test(adminJs) && /gold22Premium: \+g\('gold22Premium'\)/.test(adminJs));
  ok('the footer basis line quotes the 22K premium (24K key only as fallback)',
    /set\.gold22Premium !== undefined \? set\.gold22Premium : set\.jaipurPremium/.test(v107js) && /22K Jaipur premium/.test(v107js));

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log('\n· C · live behaviour — ' + origin);
  const errors = [];
  const dom = bootStore(w => w.addEventListener('error', e => { if (!(e.target && e.target.tagName === 'IMG')) errors.push(e.message || String(e.error)); }));
  const w = dom.window, d = w.document;
  ok('storefront boots', await until(() => w.Shivaa && w.Shivaa.state.productsCache.length === 77, 20000));

  w.location.hash = '#/rates';
  ok('rate card shows the 22K premium (₹398), not the 24K one',
    await until(() => /22K Jaipur premium/.test(d.body.textContent) && /\+₹398/.test(d.body.textContent)),
    (d.querySelector('.jaipur-hero') || {}).textContent);
  ok('rate card names the anchor it prices from (MCX future)',
    await until(() => /Rate anchor/.test(d.body.textContent) && /MCX future/.test(d.body.textContent)));

  w.location.hash = '#/shop?category=rings';
  ok('shop renders the FIRST slice only (20 cards)', await until(() => d.querySelectorAll('#shopGrid .p-card').length === 20), String(d.querySelectorAll('#shopGrid .p-card').length));
  ok('the next-slice sentinel is in the shop DOM', !!d.getElementById('shopSentinel'));
  w.Shivaa.shopLoadMore();
  ok('shopLoadMore() appends the next slice (40)', await until(() => d.querySelectorAll('#shopGrid .p-card').length === 40), String(d.querySelectorAll('#shopGrid .p-card').length));
  const idsDup = (() => { const a = [...d.querySelectorAll('#shopGrid .p-card')].map(c => c.dataset.pid); return a.length !== new Set(a).size; })();
  ok('windowing never double-renders a piece', !idsDup);
  let guard = 0; while (d.querySelectorAll('#shopGrid .p-card').length < 77 && guard++ < 8) w.Shivaa.shopLoadMore();
  ok('scrolling to the end renders the whole filtered list (77)', await until(() => d.querySelectorAll('#shopGrid .p-card').length === 77), String(d.querySelectorAll('#shopGrid .p-card').length));

  w.location.hash = '#/product/' + DB.products[0].id;
  ok('HUID chip on a normal piece is a GUIDE — no invented HUID',
    await until(() => !!d.querySelector('.pd-huid-chip')) &&
    /HUID check/.test(d.querySelector('.pd-huid-chip').textContent) && /BIS Care/.test(d.querySelector('.pd-huid-chip').textContent) &&
    !/[A-Z0-9]{6}/.test((d.querySelector('.pd-huid-chip b') || {}).textContent || ''),
    (d.querySelector('.pd-huid-chip') || {}).textContent);
  w.location.hash = '#/product/PGS-HUID-TEST';
  ok('HUID chip prints the real HUID when the catalogue carries one',
    await until(() => /AB12CD/.test((d.querySelector('.pd-huid-chip') || {}).textContent || '')),
    (d.querySelector('.pd-huid-chip') || {}).textContent);

  w.location.hash = '#/shop?category=rings';
  await until(() => d.querySelector('.pc-quick'));
  d.querySelector('.pc-quick').click();
  const qvOpen = await until(() => d.querySelector('#qvPhoto'));
  const shotBefore = (d.querySelector('#qvCount') || {}).textContent;
  const photo = d.querySelector('#qvPhoto');
  let pinchOk = false;
  if (qvOpen && photo) {
    photo.dispatchEvent(touchEv(w, 'touchstart', [[0, 0], [100, 0]]));
    photo.dispatchEvent(touchEv(w, 'touchmove', [[0, 0], [260, 0]]));
    const tr1 = photo.style.transform || '';
    photo.dispatchEvent(touchEv(w, 'touchend', []));
    pinchOk = /scale\((?!1\.9)\d/.test(tr1) && /qv-zoom/.test(photo.className);
  }
  ok('pinch zooms the Quick View photo without swiping to the next shot',
    pinchOk && (d.querySelector('#qvCount') || {}).textContent === shotBefore,
    (photo ? photo.style.transform : 'no photo') + ' | shot ' + shotBefore + ' → ' + (d.querySelector('#qvCount') || {}).textContent);
  ok('no unhandled page errors', errors.length === 0, errors.join(' | '));
  dom.window.close();

  /* install chip — first visit must stay silent, second visit may offer it.
     v119.js bumps shv_visits as its first act, so waiting for that bump is
     the race-free way to know the listener is armed on a slow boot. */
  const visitsOf = dom2 => { try { return dom2.window.localStorage.getItem('shv_visits'); } catch (e) { return null; } };
  const first = bootStore(w => { try { w.localStorage.setItem('shv_visits', '0'); } catch (e) {} });
  await until(() => visitsOf(first) === '1', 15000);
  first.window.dispatchEvent(new first.window.Event('beforeinstallprompt', { cancelable: true }));
  await sleep(400);
  ok('install chip stays hidden on a first visit', visitsOf(first) === '1' && !first.window.document.getElementById('shvInstallChip'));
  first.window.close();

  const second = bootStore(w => { try { w.localStorage.setItem('shv_visits', '9'); } catch (e) {} });
  await until(() => visitsOf(second) === '10', 15000);
  second.window.dispatchEvent(new second.window.Event('beforeinstallprompt', { cancelable: true }));
  const chipShown = await until(() => second.window.document.getElementById('shvInstallChip'), 3000);
  const chip = second.window.document.getElementById('shvInstallChip');
  let dismissOk = false;
  if (chipShown && chip) {
    const x = chip.querySelector('.shv-ic-x');
    if (x) { x.click(); dismissOk = !second.window.document.getElementById('shvInstallChip') && second.window.localStorage.getItem('shv_install_closed') === '1'; }
  }
  ok('install chip appears on the second visit, Install/Close wired, Close remembered',
    chipShown && !!chip.querySelector('.shv-ic-go') && dismissOk);
  second.window.close();

  server.close();
  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v119 checks passed  ✦`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error(e); try { server.close(); } catch (_) {} process.exit(2); });
