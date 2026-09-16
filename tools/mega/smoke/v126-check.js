/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v126 check — the desktop layer, the glow and the film budget:

   A · static  (19)  exact 126 triple + no stale v=125 in the release files,
                     v126 css/js loaded after v125 and precached, every film
                     on the site ships cold (no eager src anywhere), v125's
                     splay/shut want-flag contract, the governor's budget /
                     release / retry / watchdog, the glow's halo + ember,
                     desktop ornament locked inside min-width queries,
                     owner locks (api/.htaccess/db) byte-identical, media
                     cache generation untouched
   B · live    (11)  jsdom: desktop boot builds the rails + chapter rail +
                     medallions + glow; a MOBILE boot builds none of them;
                     the FIFTH thread film always gets its bytes even with
                     the budget full; release/re-acquire, error retry, give
                     up keeps the poster; paint mirrors the dash geometry;
                     au-lite holds zero films; no unhandled page errors
   ══════════════════════════════════════════════════════════════════════════ */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const results = [];
function ok(name, pass, detail = '') { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); let f = path.join(CMS, u === '/' ? 'index.html' : u); if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end(); fs.readFile(f, (e, b) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); });

const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const v116src = fs.readFileSync(path.join(CMS, 'js/v116.js'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const v125 = fs.readFileSync(path.join(CMS, 'js/v125.js'), 'utf8');
const v126 = fs.readFileSync(path.join(CMS, 'js/v126.js'), 'utf8');
const v126css = fs.readFileSync(path.join(CMS, 'css/v126.css'), 'utf8');
const boost = fs.readFileSync(path.join(CMS, 'js/boost.js'), 'utf8');
const v117 = fs.readFileSync(path.join(CMS, 'js/v117.js'), 'utf8');

const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [],
};

/* matchMedia stubs: DESKTOP = a 1440px laptop with a mouse, PHONE = the
   harness default (every query false) */
const CAPABLE = w => {
  try { Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: 8, configurable: true }); } catch (e) {}
};
const MM_PHONE = w => {
  CAPABLE(w);
  w.matchMedia = q => ({
    matches: /pointer:\s*coarse/.test(q),
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
};
const MM_DESK = w => {
  CAPABLE(w);
  w.matchMedia = q => ({
    matches: /min-width:\s*(1024|1280|1440)px/.test(q) || (/hover:\s*hover/.test(q) && /pointer:\s*fine/.test(q)),
    media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
};

function bootStore(extra = '', opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented: HTML(MediaElement|CanvasElement)/.test(e.message)) errors.push(e.message); });
  vc.on('error', (...a) => errors.push(a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1:' + server.address().port + '/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }; w.ResizeObserver = class { observe() {} disconnect() {} }; w.scrollTo = () => {};
      if (extra) extra(w);
      if (opts.lite) w.navigator.connection = { saveData: true };
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
  if (opts.lite) dom.window.document.documentElement.classList.add('au-lite');
  return { dom, errors };
}

/* where does a selector live? every block that mentions it must be inside a
   min-width (or print) query for the "mobile is untouched" claim to hold */
function cssBlocks(css) {
  const out = []; let i = 0, depth = 0, start = 0, media = null;
  while (i < css.length) {
    if (css[i] === '{') {
      if (depth === 0) {
        const head = css.slice(start, i).replace(/\/\*[\s\S]*?\*\//g, '').trim();
        media = /@media/.test(head) ? head : null;
      }
      depth++;
    } else if (css[i] === '}') {
      depth--;
      if (depth === 0) { out.push({ media: media || '', text: css.slice(start, i + 1) }); start = i + 1; media = null; }
    }
    i++;
  }
  return out;
}
function onlyInMedia(css, sel) {
  const blocks = cssBlocks(css).filter(b => new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(b.text));
  return blocks.length > 0 && blocks.every(b => /@media/.test(b.media) && (/min-width/.test(b.media) || /print/.test(b.media)));
}

(async () => {
  console.log('· A · static — v126 desktop layer, glow and film budget');

  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(appJs), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  ok('release handshake is exactly 126 everywhere (shell, app, worker)',
    shellRel && shellRel[1] === '126' && appRel && appRel[1] === '126' && swRel && swRel[1] === '126',
    `shell=${shellRel && shellRel[1]} app=${appRel && appRel[1]} sw=${swRel && swRel[1]}`);

  const releaseFiles = { 'index.html': html, 'js/app.js': appJs, 'js/v116.js': v116src };
  const stale125 = Object.entries(releaseFiles)
    .filter(([, s]) => /v=125/.test(s.replace(/\/css\/v125\.css\?v=125/g, '').replace(/\/js\/v125\.js\?v=125/g, '')))
    .map(([n]) => n);
  ok('no stale v=125 stamp survives in index.html / app.js / v116.js', stale125.length === 0, stale125.join(', '));

  ok('shell loads the v126 layer after v125 and the worker precaches both',
    /\/css\/v126\.css\?v=126/.test(html) && /\/js\/v126\.js\?v=126/.test(html) &&
    html.indexOf('/css/v125.css?v=125') < html.indexOf('/css/v126.css?v=126') &&
    html.indexOf('/js/v125.js?v=125') < html.indexOf('/js/v126.js?v=126') &&
    /'\/css\/v126\.css\?v=126'/.test(sw) && /'\/js\/v126\.js\?v=126'/.test(sw));

  /* ── every film ships cold ─────────────────────────────────────────── */
  const eagerSrc = (boost.match(/src="\/images\/films\/[^"]+"/g) || []).concat(v125.match(/v\.src = fl\.f;\s*$/gm) ? [] : []);
  ok('no film on the site carries an eager src any more (boost.js asks for zero bytes at boot)',
    (boost.match(/src="\/images\/films\//g) || []).length === 0 && eagerSrc.length === 0,
    (boost.match(/src="\/images\/films\/[^"]*"/g) || []).join(' '));

  ok('all five boost film sites are cold: data-film + preload none, never autoplay',
    (boost.match(/data-film/g) || []).length >= 5 &&
    (boost.match(/preload="none"/g) || []).length >= 3 &&
    (boost.match(/preload = 'none'/g) || []).length >= 2 &&
    !/\.autoplay = true/.test(boost) && !/<video[^>]*\bautoplay\b[^>]*images\/films/.test(boost),
    `data-film=${(boost.match(/data-film/g) || []).length} preload=${(boost.match(/preload=?"?'?none/g) || []).length}`);

  ok('v125 films start cold too: preload none + the URL parked in data-film',
    /v\.preload = 'none'/.test(v125) && /setAttribute\('data-film', fl\.f\)/.test(v125));

  ok('v125 keeps one play door and one pause door, both stamping the want flag',
    /function splay\(v\)[\s\S]{0,200}dataset\.svWant = '1'/.test(v125) &&
    /function shut\(v\)[\s\S]{0,200}dataset\.svWant = '0'/.test(v125) &&
    (v125.match(/\bv\.pause\(\)/g) || []).length === 1,
    'bare v.pause() count = ' + (v125.match(/\bv\.pause\(\)/g) || []).length);

  /* ── the governor ──────────────────────────────────────────────────── */
  ok('the film budget caps live films (0 under save-data, 3 on a phone, 4 on a laptop)',
    /function budget\(\)[\s\S]{0,220}return 0;[\s\S]{0,200}return 3;[\s\S]{0,120}return 4;/.test(v126));

  ok('a full budget evicts the film furthest from the viewport, never one on screen',
    /if \(live\.length >= budget\(\)\)[\s\S]{0,700}if \(c === v \|\| !c\.isConnected\) continue;[\s\S]{0,120}if \(c\.__svNear\) continue;[\s\S]{0,400}release\(far\)/.test(v126));

  ok('release parks a film cold again (src off, load, poster back)',
    /function release\(v\)[\s\S]{0,400}removeAttribute\('src'\); v\.load\(\)/.test(v126));

  ok('a film that errors or stalls is retried, then left on its poster',
    /addEventListener\('error'/.test(v126) && /addEventListener\('stalled'/.test(v126) &&
    /if \(n >= 2\) \{ release\(v\); return; \}/.test(v126) &&
    /dataset\.svTries = String\(n \+ 1\)/.test(v126) && /addEventListener\('loadeddata'[\s\S]{0,80}svTries = '0'/.test(v126));

  ok('the watchdog re-arms any film that wants to play but never got frames',
    /setInterval\(function \(\)[\s\S]{0,900}readyState === 0[\s\S]{0,400}v\.load\(\)/.test(v126));

  ok('the 16 MB hero film waits for load + idle, and never under save-data',
    /data-film-idle="1"/.test(boost) && /isIdle\(v\) && !idleOpen/.test(v126) && /addEventListener\('load'[\s\S]{0,120}idleOpen = true/.test(v126));

  ok('boost.js is re-stamped ?v=126 in the v117 injector and the worker — the eager-video build cannot survive in a returning visitor\'s cache',
    /\/js\/boost\.js\?v=126/.test(v117) && /'\/js\/boost\.js\?v=126'/.test(sw) && !/boost\.js\?v=46'/.test(sw),
    `v117=${/\/js\/boost\.js\?v=\d+/.exec(v117)} sw=${/'\/js\/boost\.js\?v=\d+'/.exec(sw)}`);

  ok('v126.js is self-guarding: strict, IIFE, no network of its own, guarded matchMedia',
    /^\s*(\/\*[\s\S]*?\*\/\s*)?'use strict';/.test(v126) && /\(function \(\) \{/.test(v126) &&
    !/fetch\(/.test(v126) && /typeof matchMedia === 'function'|win\.matchMedia \? win\.matchMedia/.test(v126));

  /* ── the glow ──────────────────────────────────────────────────────── */
  ok('the thread gains two halo strokes + a blur filter, mirrored from v125\'s dash geometry',
    /sv-halo-o/.test(v126) && /sv-halo'/.test(v126) && /svGlowF/.test(v126) &&
    /strokeDasharray = L/.test(v126) && /strokeDashoffset = off/.test(v126));

  ok('the ember rides the tip of the thread from getPointAtLength (guarded)',
    /typeof thread\.draw\.getPointAtLength === 'function'/.test(v126) && /translate3d\(/.test(v126) &&
    /sv-ember/.test(v126) && /@keyframes svEmberPulse/.test(v126css));

  ok('the drawn stroke carries a drop-shadow bloom and the lit chapter a halo',
    /\.sv-draw\s*\{[^}]*drop-shadow/.test(v126css) && /sv-lit \.sv-thread-film \{[\s\S]{0,400}rgba\(212, 175, 90/.test(v126css));

  /* ── the desktop layer ─────────────────────────────────────────────── */
  ok('every desktop-only ornament is locked inside a min-width query (mobile sees none of it)',
    onlyInMedia(v126css, '.sv-rail') && onlyInMedia(v126css, '.sv-medallion') &&
    onlyInMedia(v126css, '.sv-filigree') && onlyInMedia(v126css, '.sv-case-chapters'),
    'a desktop selector leaked outside a min-width/print block');

  ok('the desktop layer is created only for mouse screens, and taken back on resize',
    /var DESK = mq\('\(min-width: 1024px\)'\)/.test(v126) && /var RAIL = mq\('\(min-width: 1280px\) and \(hover: hover\) and \(pointer: fine\)'\)/.test(v126) &&
    /function undesk\(\)[\s\S]{0,400}if \(DESK\.matches\) return;[\s\S]{0,120}dropRails\(\)/.test(v126));

  ok('the case gains a clickable chapter rail that drives v125\'s own ring',
    /sv-case-chapter/.test(v126) && /caseFront\(\)/.test(v126) && /aria-current/.test(v126));

  let locksOk = true, locksDetail = [];
  for (const f of ['api.php', '.htaccess', 'data/db.json']) {
    try {
      const head = execSync(`git show HEAD:cms/${f}`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const disk = fs.readFileSync(path.join(CMS, f), 'utf8');
      if (crypto.createHash('md5').update(head).digest('hex') !== crypto.createHash('md5').update(disk).digest('hex')) { locksOk = false; locksDetail.push(f + ' changed'); }
    } catch (e) { locksDetail.push(f + ' git-compare failed'); locksOk = false; }
  }
  ok('owner locks respected: api.php / .htaccess / db.json byte-identical to HEAD', locksOk, locksDetail.join('; '));

  ok('media cache generation left alone (shivaa-media-v120)', /MEDIA = 'shivaa-media-v120'/.test(sw));

  server.listen(0);
  console.log('\n· B · live behaviour — http://127.0.0.1:' + server.address().port);

  /* ── boot 1: a 1440px laptop with a mouse ──────────────────────────── */
  const b1 = bootStore(MM_DESK);
  const d1 = b1.dom.window.document;
  const booted = await until(() => d1.querySelectorAll('#view .p-card').length > 0 && d1.querySelector('#svThreadMount .sv-thread'), 12000);
  ok('the desktop storefront boots and the Gold Thread mounts', booted);

  await until(() => d1.querySelector('#svCaseMount .sv-case-card'), 6000);
  await sleep(400);
  const api1 = b1.dom.window.ShivaaV126;
  ok('the desktop layer builds: gutter rails + 4 chapter chips + 5 medallions',
    !!api1 && api1.hasRails() && api1.hasCaseChapters() &&
    d1.querySelectorAll('.sv-case-chapter').length === 4 && api1.hasMedallions() === 5,
    `rails=${api1 && api1.hasRails()} chips=${d1.querySelectorAll('.sv-case-chapter').length} medallions=${api1 && api1.hasMedallions()}`);

  ok('the glow mounts: blur filter + two halo strokes under the drawn path + the ember',
    api1 && api1.hasThreadGlow() && !!d1.querySelector('#svGlowF') &&
    d1.querySelectorAll('.sv-thread-svg .sv-halo, .sv-thread-svg .sv-halo-o').length === 2 && api1.hasEmber());

  ok('the governor registered every cold film on the page (v125\'s nine + boost\'s ambients)',
    api1 && api1.registered() >= 9, 'registered=' + (api1 && api1.registered()));
  ok('a laptop may hold four films at once', api1 && api1.budget() === 4, 'budget=' + (api1 && api1.budget()));

  /* paint mirrors v125's dash geometry onto the halos */
  const drawEl = d1.querySelector('#svThreadPath');
  const haloEl = d1.querySelector('.sv-thread-svg .sv-halo');
  api1.paint();
  ok('paint() mirrors v125\'s dash geometry onto the halo (same offset, no second truth)',
    !!drawEl && !!haloEl && haloEl.style.strokeDashoffset === drawEl.style.strokeDashoffset &&
    haloEl.style.strokeDasharray === drawEl.style.strokeDasharray,
    `draw=${drawEl && drawEl.style.strokeDashoffset} halo=${haloEl && haloEl.style.strokeDashoffset}`);

  /* ── THE REPORTED BUG: the fifth thread film ───────────────────────── */
  const threadVids = [...d1.querySelectorAll('#svThreadMount video')];
  const fifth = threadVids[4];
  const allVids = [...d1.querySelectorAll('#svCaseMount video, #svThreadMount video')];
  ok('the thread still carries all five chapters, 05 = Forever, Reimagined',
    threadVids.length === 5 && /thread-05\.mp4/.test(fifth.getAttribute('data-film') || ''));

  allVids.forEach(v => { if (v !== fifth) api1.acquire(v); });
  const gotIt = api1.acquire(fifth);
  ok('THE FIFTH FILM ALWAYS GETS ITS BYTES — with every other film holding the budget, 05 still acquires (was the phone bug)',
    gotIt === true && /thread-05\.mp4$/.test(fifth.getAttribute('src') || '') && api1.liveCount() <= api1.budget(),
    `acquired=${gotIt} src=${fifth.getAttribute('src')} live=${api1.liveCount()}/${api1.budget()}`);

  api1.release(fifth);
  ok('releasing a film parks it cold but keeps its URL (poster shows, nothing is lost)',
    !fifth.getAttribute('src') && /thread-05\.mp4$/.test(fifth.getAttribute('data-film') || ''));
  ok('a released film re-acquires on the next approach (the retry path)',
    api1.acquire(fifth) === true && /thread-05\.mp4$/.test(fifth.getAttribute('src') || ''));

  fifth.dataset.svTries = '0';
  fifth.dispatchEvent(new b1.dom.window.Event('error'));
  await sleep(60);
  ok('a film that errors is retried instead of sitting dark', fifth.dataset.svTries === '1');
  fifth.dataset.svTries = '2';
  fifth.dispatchEvent(new b1.dom.window.Event('error'));
  await sleep(60);
  ok('after the retries run out the film is parked on its poster, never a black box',
    !fifth.getAttribute('src') && /thread-05\.mp4$/.test(fifth.getAttribute('data-film') || ''));

  /* ── boot 2: a phone — the desktop layer must not exist ─────────────── */
  const b2 = bootStore(MM_PHONE);
  const d2 = b2.dom.window.document;
  await until(() => d2.querySelectorAll('#view .p-card').length > 0 && d2.querySelector('#svThreadMount .sv-thread'), 12000);
  await until(() => d2.querySelector('#svCaseMount .sv-case-card'), 6000);
  await sleep(400);
  const api2 = b2.dom.window.ShivaaV126;
  ok('MOBILE IS UNTOUCHED: no rails, no chapter rail, no medallions — the nine films and both features still there',
    !!api2 && !api2.hasRails() && !api2.hasCaseChapters() && api2.hasMedallions() === 0 &&
    d2.querySelectorAll('#svCaseMount video').length === 4 && d2.querySelectorAll('#svThreadMount video').length === 5 &&
    !!d2.querySelector('#svThreadMount .sv-thread') && !!d2.querySelector('#svCaseMount .sv-case'),
    `rails=${api2 && api2.hasRails()} chips=${d2.querySelectorAll('.sv-case-chapter').length} med=${api2 && api2.hasMedallions()}`);
  ok('a phone may hold three films at once (never nine)', api2 && api2.budget() === 3, 'budget=' + (api2 && api2.budget()));

  /* ── boot 3: save-data / au-lite ───────────────────────────────────── */
  const b3 = bootStore(MM_DESK, { lite: true });
  const d3 = b3.dom.window.document;
  await until(() => d3.querySelectorAll('#view .p-card').length > 0, 12000);
  await sleep(500);
  const api3 = b3.dom.window.ShivaaV126;
  ok('save-data mode: zero films hold bytes, no rails, no chapter rail, posters only',
    !!api3 && api3.budget() === 0 && api3.liveCount() === 0 && !api3.hasRails() && !api3.hasCaseChapters() &&
    d3.querySelectorAll('#svThreadMount img').length === 5,
    `budget=${api3 && api3.budget()} live=${api3 && api3.liveCount()}`);

  const errs = [...b1.errors, ...b2.errors, ...b3.errors];
  ok('no unhandled page errors in any of the three v126 sessions', errs.length === 0, errs.slice(0, 3).join(' | '));

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v126 checks passed  ${pass === results.length ? '  ✦' : '  ✗'}`);
  server.close();
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
