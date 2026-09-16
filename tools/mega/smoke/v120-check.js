/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v120 check — bug-fix + best-app mobile gates.

   A · static   (10) release wiring, rates patch-in-place, tile fallback,
                     v120.js/v120.css mobile pack, input keyboards
   B · live     (12) jsdom: rates survive polls, alert form survives, back
                     button closes overlays, haptics wired, tiles versioned
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
  const v120css = fs.readFileSync(path.join(CMS, 'css/v120.css'), 'utf8');
  const v120js = fs.readFileSync(path.join(CMS, 'js/v120.js'), 'utf8');
  const v116src = fs.readFileSync(path.join(CMS, 'js/v116.js'), 'utf8');

  console.log('\nSHIVAA v120 check\n\n· A · static gates');
  ok('the shell loads the v120 layer (css + js, after the v119 layer)',
    /\/css\/v120\.css\?v=120/.test(html) && /\/js\/v120\.js\?v=120/.test(html) &&
    html.indexOf('/js/v119.js?v=119') < html.indexOf('/js/v120.js?v=120'));
  ok('service worker precaches v120 and the media cache is the v120 generation',
    /'\/css\/v120\.css\?v=120'/.test(sw) && /'\/js\/v120\.js\?v=120'/.test(sw) && /MEDIA = 'shivaa-media-v120'/.test(sw));
  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(app), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  ok('release stamps stay a consistent triple (shell = script = worker)',
    !!shellRel && !!appRel && !!swRel && shellRel[1] === appRel[1] && appRel[1] === swRel[1],
    `${shellRel && shellRel[1]} / ${appRel && appRel[1]} / ${swRel && swRel[1]}`);
  ok('Bug A: polls patch the rates page in place (refreshRatesPage + fallback)',
    /function refreshRatesPage\(R\)/.test(app) && /if \(!refreshRatesPage\(state\.rates\)\)/.test(app) &&
    /data-rr="g22"/.test(app) && /data-rr="srcbadge"/.test(app));
  ok('Bug A: rates template is never reveal-gated and survives a cold open',
    !/jaipur-hero rv/.test(app) && !/chart-wrap mt-3 rv/.test(app) && /Weighing the market/.test(app));
  ok('Bug A bonus: the anchor line prints one ₹ (shared ratesAnchorTxt helper)',
    /function ratesAnchorTxt\(R\)/.test(app) && !/· ₹\$\{fmt\(AL\.goldPerG\)\}/.test(app));
  ok('Bug B: tile photos are versioned with a logo-then-hide fallback chain',
    /\?v=12(0|3|4|5|6)/.test(app) && /dataset\.lfb/.test(app) && /this\.style\.display='none'/.test(app) &&
    /loading="eager" decoding="async" fetchpriority="low"/.test(app));
  ok('Bug B: the tile monogram underlay can never be bare text',
    /\.cb-img::after/.test(v120css) && /content: '✦'/.test(v120css) && /\.cb-img img \{ position: relative; z-index: 1/.test(v120css));
  ok('Bug B: every category render site carries a versioned photo URL (v116 key re-stamped)',
    /cat-mini-card"><img src="\$\{c\.img\}\?v=12(0|3|4|5|6)"/.test(app) &&
    /mt-img"><img src="\$\{c\.img\}\?v=12(0|3|4|5|6)"/.test(app) &&
    /dwCatList/.test(app) && /#\/shop\?category=\$\{k\}"><img src="\$\{c\.img\}\?v=12(0|3|4|5|6)"/.test(app) &&
    /c\.img \+ '\?v=12(0|3|4|5|6)"/.test(v116src) &&
    /\/js\/v116\.js\?v=12(0|3|4|5|6)/.test(html) && /'\/js\/v116\.js\?v=12(0|3|4|5|6)'/.test(sw));
  ok('mobile pack JS: haptics + back-button overlays, self-guarded',
    /Shivaa\.haptic/.test(v120js) && /_shvHaptic/.test(v120js) && /wrapTap\('addToCart', 20\)/.test(v120js) &&
    /wrapTap\('toggleWish', 12\)/.test(v120js) && /shvOverlay/.test(v120js) && /popstate/.test(v120js) &&
    /MutationObserver/.test(v120js) && /#modalOverlay/.test(v120js) && /#cartDrawer/.test(v120js) &&
    /#searchDrawer/.test(v120js) && /#mainNav/.test(v120js) && /use strict/.test(v120js));
  ok('mobile pack CSS: safe-area, dvh, 16px fields, tap polish, overscroll',
    /safe-area-inset-bottom/.test(v120css) && /100dvh/.test(v120css) && /@supports \(height: 100dvh\)/.test(v120css) &&
    /input, select, textarea \{ font-size: 16px/.test(v120css) && /tap-highlight-color: transparent/.test(v120css) &&
    /touch-action: manipulation/.test(v120css) && /overscroll-behavior: contain/.test(v120css) &&
    /\.mnav a\.on/.test(v120css));

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log('\n· B · live behaviour — ' + origin);
  const errors = [];
  const dom = bootStore(w => w.addEventListener('error', e => { if (!(e.target && e.target.tagName === 'IMG')) errors.push(e.message || String(e.error)); }));
  const w = dom.window, d = w.document;
  ok('storefront boots', await until(() => w.Shivaa && w.Shivaa.state.productsCache.length === 77, 20000));
  ok('v120.js executed (haptics live, actions wrapped)',
    await until(() => typeof w.Shivaa.haptic === 'function' && !!w.Shivaa.addToCart._shvHaptic && !!w.Shivaa.toggleWish._shvHaptic));

  w.location.hash = '#/rates';
  ok('rates page renders with live-data hooks and zero reveal-gated nodes',
    await until(() => d.querySelector('[data-rr="g22"]') && d.querySelectorAll('#view .rv').length === 0));
  // mark nodes, then fire two poll ticks: nothing may be wiped or re-hidden
  await until(() => d.querySelector('[data-rr="g22"]'));
  const g22a = d.querySelector('[data-rr="g22"]'); g22a._probe = 7;
  const chartA = d.querySelector('#rateChart');
  const alertInput = d.querySelector('#view input[type="number"]'); if (alertInput) alertInput.value = '14500';
  d.dispatchEvent(new w.CustomEvent('rates'));
  d.dispatchEvent(new w.CustomEvent('rates'));
  await sleep(300);
  ok('two poll ticks never wipe the page (same nodes, chart + hooks intact)',
    d.querySelector('[data-rr="g22"]') === g22a && g22a._probe === 7 &&
    (!chartA || d.querySelector('#rateChart') === chartA) &&
    d.querySelectorAll('#view .rv').length === 0);
  ok('the rate-alert form survives poll ticks mid-typing',
    !alertInput || d.querySelector('#view input[type="number"]').value === '14500');

  w.location.hash = '#/';
  ok('home category tiles carry versioned photo URLs',
    await until(() => [...d.querySelectorAll('.cb-img img')].length > 0 && [...d.querySelectorAll('.cb-img img')].every(i => /\?v=12(0|3|4|5|6)/.test(i.src))));
  const tileImg = d.querySelector('.cb-img img');
  tileImg.dispatchEvent(new w.Event('error'));
  ok('tile fallback stage 1: a failed photo swaps to the house logo',
    /\/images\/logo\.png\?v=12(0|3|4|5|6)/.test(tileImg.src));
  tileImg.dispatchEvent(new w.Event('error'));
  ok('tile fallback stage 2: a failed logo hides to the monogram underlay, never bare text',
    tileImg.style.display === 'none');

  const h0 = w.history.length;
  d.querySelector('#searchBtn').click();
  ok('opening search pushes a history entry (back-button owns it)',
    await until(() => d.querySelector('#searchDrawer').classList.contains('open') && w.history.length === h0 + 1));
  w.history.back();
  ok('Back closes search instead of leaving the page',
    await until(() => !d.querySelector('#searchDrawer').classList.contains('open')) && w.location.hash === '#/');
  w.Shivaa.openModal('<p>back-test</p>');
  await until(() => d.querySelector('#modalOverlay').classList.contains('open'));
  w.history.back();
  ok('Back closes a modal (Quick View rides the same path)',
    await until(() => !d.querySelector('#modalOverlay').classList.contains('open')));
  w.Shivaa.openModal('<p>x-test</p>');
  await until(() => d.querySelector('#modalOverlay').classList.contains('open'));
  w.Shivaa.closeModal();
  await sleep(400);   // let the X-close consume its own entry
  w.history.back();
  ok('X-closing consumes its own entry (the next Back is a real navigation)',
    await until(() => w.location.hash === '#/rates', 3000), w.location.hash);
  ok('no unhandled page errors in the v120 session', errors.length === 0, errors.slice(0, 3).join(' | '));

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v120 checks passed  ${pass === results.length ? '✦' : '✗'}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR', e); server.close(); process.exit(1); });
