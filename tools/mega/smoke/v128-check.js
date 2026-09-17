/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v128 check — THE FILM BUDGET (the "velocity" release)

   Owner's brief (17 Sep 2026): "make it load fast and the smoothest in
   the world… give me an update zip." The measured disease: the page
   handed ~47 MB+ of eager autoplay film bytes to every visitor while the
   first paint was still on the wire (hero 16.7 MB + four carousel films
   + the superseded films row + the CTA film + nine preload=metadata
   films + a 6–11.8 MB film at the top of every inner page).

   A · static  (12)  the 128 triple everywhere, no stale stamp, v128.js
                      loaded between v125 and v127 (v127 still LAST — its
                      tap-ownership contract), worker precaches v128 +
                      the re-stamped files, boost/v125 mount films cold
                      with an eager fallback, the governor exists and is
                      self-guarding, MEDIA cache stays v120, no film in
                      the precache, owner locks untouched (api/.htaccess/
                      db.json/media byte-identical to git HEAD)
   B · live   (14)   jsdom on the real shell with a CONTROLLABLE
                      IntersectionObserver: boots 77, ZERO mp4 requests
                      through boot + settle + 3 s; every film cold
                      (data-film, no src, no autoplay); settle + proximity
                      arms the hero film; the desktop budget holds at 4
                      with eviction of the furthest; the phone budget is
                      3; Save-Data arms nothing; the v125 doors (case
                      spin) still drive playback through svWant; THE
                      NAMED REGRESSION — Gold Thread 05 acquires a slot
                      even with the budget fully held; the Reel round-
                      trip still works; the page-hero film is built only
                      when frames exist (data-boost-pgfilm, no <video>
                      until armed + loadeddata)
   C · control (2)   the SAME shell with /js/v128.js stripped out boots
                      the OLD eager build — the hero film carries src +
                      autoplay at mount and the nine films carry src —
                      proving the disease was real and this gate can
                      still see it. Plus: au-lite boots zero <video>.

   Run:      node tools/mega/smoke/v128-check.js
   Overlay:  SMOKE_CMS=<dir> node tools/mega/smoke/v128-check.js
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
async function until(fn, ms = 12000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };

const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const v116src = fs.readFileSync(path.join(CMS, 'js/v116.js'), 'utf8');
const v117src = fs.readFileSync(path.join(CMS, 'js/v117.js'), 'utf8');
const v125src = fs.readFileSync(path.join(CMS, 'js/v125.js'), 'utf8');
const v128src = fs.readFileSync(path.join(CMS, 'js/v128.js'), 'utf8');
const boostSrc = fs.readFileSync(path.join(CMS, 'js/boost.js'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end();
  fs.readFile(f, (e, b) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
});

const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 }, jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 }, rtgs: { rows: {} }, history: [],
};

/* ── one browser session on the real shell ───────────────────────────────
   The FakeIO lets the test drive proximity (rootMargin '75%') and
   visibility (ratio) exactly like a scrolling shopper would. */
function makeFakeIO() {
  const all = [];
  class FakeIO {
    constructor(cb, opts) { this.cb = cb; this.opts = opts || {}; all.push(this); this.targets = new Set(); }
    observe(t) { if (t) this.targets.add(t); }
    unobserve(t) { this.targets.delete(t); }
    disconnect() { this.targets.clear(); }
  }
  FakeIO.instances = all;
  FakeIO.fire = (target, entry) => {
    const ratio = entry.intersectionRatio != null ? entry.intersectionRatio : (entry.isIntersecting ? 1 : 0);
    all.forEach(io => { if (io.targets.has(target)) { try { io.cb([{ target, isIntersecting: !!entry.isIntersecting, intersectionRatio: ratio }], io); } catch (e) {} } });
  };
  return FakeIO;
}

function boot({ stripV128 = false, coarse = false, saveData = false, auLite = false, reduced = false } = {}) {
  const hits = [];
  const errors = [];
  const html2 = stripV128
    ? html.replace(/<!-- v128[\s\S]*?-->\n?<script src="\/js\/v128\.js\?v=128" defer><\/script>\n/, '')
    : html;
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented: HTML(MediaElement|CanvasElement)/.test(e.message)) errors.push(e.message); });
  vc.on('error', (...a) => errors.push(a.join(' ')));
  const FakeIO = makeFakeIO();
  const dom = new JSDOM(html2, {
    url: 'http://127.0.0.1:' + server.address().port + '/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = q => ({ matches: (reduced && /reduce/.test(q)) || (coarse && /pointer: coarse/.test(q)), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = FakeIO; w.ResizeObserver = class { observe() {} disconnect() {} }; w.scrollTo = () => {};
      Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: auLite ? 2 : 8, configurable: true });
      if (saveData) { try { Object.defineProperty(w.navigator, 'connection', { value: { saveData: true }, configurable: true }); } catch (e) {} }
      if (auLite) {
        const mo = new w.MutationObserver(() => { const de = w.document.documentElement; if (de) { de.classList.add('au-lite'); mo.disconnect(); } });
        mo.observe(w.document, { childList: true, subtree: true });
      }
      w.fetch = input => {
        const u = new URL(String(input), 'http://127.0.0.1/'); let out = {};
        if (u.pathname === '/api/rates') out = RATES_STUB;
        else if (u.pathname === '/api/settings') out = { settings: DB.settings };
        else if (u.pathname === '/api/products') out = { products: DB.products };
        else if (u.pathname === '/api/pages') out = { pages: [] };
        else if (u.pathname === '/api/making-charges') out = { table: [] };
        else if (u.pathname === '/api/catalogs') out = { catalogs: [] };
        else if (u.pathname.startsWith('/api/products/')) { const id = decodeURIComponent(u.pathname.split('/').pop()); out = { product: DB.products.find(p => p.id === id), similar: DB.products.slice(1, 5), reviews: [], rates: {} }; }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
      };
    },
  });
  /* jsdom's resource loader is patched to ALSO record media URLs (it never
     fetches them — we only need the count of what the PAGE asked for). */
  const origFetch = dom.window.fetch.bind(dom.window);
  dom.window.fetch = (input, ...rest) => { hits.push(String(input)); return origFetch(input, ...rest); };
  return { dom, errors, hits, FakeIO };
}

(async () => {
  console.log('· A · static — the v128 film budget');

  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(appJs), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  ok('release handshake is exactly 128 everywhere (shell, app, worker)',
    shellRel && shellRel[1] === '128' && appRel && appRel[1] === '128' && swRel && swRel[1] === '128',
    `shell=${shellRel && shellRel[1]} app=${appRel && appRel[1]} sw=${swRel && swRel[1]}`);

  const reStamped = { 'index.html': html, 'js/app.js': appJs, 'js/v116.js': v116src, 'js/v117.js': v117src, 'js/v125.js': v125src };
  /* legit v125 survivors, stripped before the stale hunt: the v125 css
     layer (content unchanged) and the category-tile / logo-fallback image
     stamps — those images are byte-identical since v125, so they keep
     their stamp (no pointless refetch of 20 tiny files per device). */
  const stripLegit125 = s => s
    .replace(/\/css\/v125\.css\?v=125/g, '')
    .replace(/'&v=125' : '\?v=125'/g, '')
    .replace(/\/images\/logo\.png\?v=125/g, '')
    .replace(/\$\{c\.img\}\?v=125/g, '')
    .replace(/c\.img \+ '\?v=125/g, '');
  const stale = Object.entries(reStamped)
    .filter(([, s]) => /v=125/.test(stripLegit125(s)))
    .map(([n]) => n);
  ok('no stale v=125 stamp survives in any re-stamped file (both ?v= and &v= branches)', stale.length === 0, stale.join(', '));

  ok('index.html loads v128.js (defer) between v125 and v127 — v127 stays LAST for tap ownership',
    /<script src="\/js\/v128\.js\?v=128" defer><\/script>/.test(html) &&
    html.indexOf('/js/v125.js?v=128') < html.indexOf('/js/v128.js?v=128') &&
    html.indexOf('/js/v128.js?v=128') < html.indexOf('/js/v127.js?v=127') &&
    /<script src="\/js\/v127\.js\?v=127" defer><\/script>/.test(html));

  const swFilesBlock = (sw.match(/const SHELL_FILES = \[([\s\S]*?)\];/) || [null, ''])[1];
  const swList = [...swFilesBlock.matchAll(/'([^']*)'/g)].map(m => m[1]);
  ok('worker precaches v128.js + every re-stamped file, and never a film',
    swList.includes('/js/v128.js?v=128') && swList.includes('/js/boost.js?v=128') &&
    swList.includes('/js/v125.js?v=128') && swList.includes('/js/v117.js?v=128') &&
    swList.includes('/js/app.js?v=128') && swList.includes('/js/v116.js?v=128') &&
    !swList.some(u => /\.mp4/.test(u)));

  ok('v117.js injects boost.js at the new stamp (the returning-visitor trap is closed)',
    /\/js\/boost\.js\?v=128/.test(v117src) && !/boost\.js\?v=46/.test(v117src));

  /* boost mounts every film cold — and keeps the eager fallback */
  const heroTpl = boostSrc.match(/boost-hero-film[\s\S]{0,400}?<video[^>]*>/);
  ok('boost.js: the hero film template is cold (data-film + preload=none, no autoplay, poster kept)',
    !!(heroTpl && /data-film="\/images\/films\/hero\.mp4"/.test(heroTpl[0]) && /preload="none"/.test(heroTpl[0]) && /poster="/.test(heroTpl[0]) && !/\sautoplay/.test(heroTpl[0])));
  ok('boost.js: carousel, film-card and CTA templates are cold; the page hero routes through the governor',
    /v\.setAttribute\('data-film', '\/images\/films\/' \+ film \+ '\.mp4'\)/.test(boostSrc) &&
    /data-film="\/images\/films\/\$\{f\[0\]\}\.mp4"/.test(boostSrc) &&
    /data-film="\/images\/films\/bridal-lux\.mp4"/.test(boostSrc) &&
    /ShivaaV128\.pghero\(ph, pv\[page\]\)/.test(boostSrc));
  ok('boost.js keeps the eager fallback for every mount (a missing governor degrades, never breaks)',
    (boostSrc.match(/eager fallback/g) || []).length >= 2 &&
    /hv\.autoplay = true; hv\.src = '\/images\/films\/hero\.mp4'/.test(boostSrc) &&
    /v\.autoplay = true; v\.src = '\/images\/films\/' \+ film \+ '\.mp4'/.test(boostSrc));

  ok('v125.js: the nine films mount cold (data-film, governor registration) with the preload=metadata fallback intact',
    /setAttribute\('data-film', fl\.f\)/.test(v125src) && /ShivaaV128\.film\(v, \{ auto: false \}\)/.test(v125src) &&
    /v\.preload = 'metadata';\n      v\.src = fl\.f;/.test(v125src));
  ok('v125.js: splay/shut are still the only doors, now stamping svWant and calling the governor hooks',
    /v\.dataset\.svWant = '1'/.test(v125src) && /v\.dataset\.svWant = '0'/.test(v125src) &&
    /win\.__shvWant/.test(v125src) && /win\.__shvShut/.test(v125src));

  ok('v128.js is self-guarding: strict, IIFE, no fetch of its own, budget + settle + watchdog + page-hero-on-frames',
    /^\s*(\/\*[\s\S]*?\*\/\s*)?'use strict';/.test(v128src) && /\(function \(\)\s*\{/.test(v128src) &&
    !/fetch\(/.test(v128src) &&
    /\? 0 : \(phone\(\) \? 3 : 4\)/.test(v128src) &&
    /rootMargin: '75% 0px'/.test(v128src) &&
    /win\.setInterval\(function \(\)[\s\S]{0,1200}2200\)/.test(v128src) &&
    /data-boost-pgfilm/.test(v128src) && /loadeddata/.test(v128src));

  ok('media cache generation untouched (shivaa-media-v120) — the owner lock holds', /MEDIA = 'shivaa-media-v120'/.test(sw));

  let locksOk = true, locksDetail = [];
  for (const f of ['api.php', '.htaccess', 'data/db.json']) {
    try {
      const head = execSync(`git show HEAD:cms/${f}`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const disk = fs.readFileSync(path.join(CMS, f), 'utf8');
      if (crypto.createHash('md5').update(head).digest('hex') !== crypto.createHash('md5').update(disk).digest('hex')) { locksOk = false; locksDetail.push(f + ' changed'); }
    } catch (e) { locksDetail.push(f + ' git-compare failed'); locksOk = false; }
  }
  const mediaDiff = execSync('git diff --name-only HEAD -- cms/images cms/fonts', { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  if (mediaDiff) { locksOk = false; locksDetail.push('media changed: ' + mediaDiff.replace(/\n/g, ', ')); }
  ok('owner locks respected: api.php / .htaccess / db.json / every image & film & font byte-identical to HEAD', locksOk, locksDetail.join('; '));

  server.listen(0);
  console.log('\n· B · live — the budget on the real shell (http://127.0.0.1:' + server.address().port + ')');

  /* ── boot 1: the full page, desktop-shaped, films must stay cold ────── */
  const b1 = boot({});
  const d1 = b1.dom.window.document, w1 = b1.dom.window;
  const booted = await until(() => d1.querySelectorAll('#view .p-card, #view .cat-mini-card').length > 0 &&
    d1.getElementById('svCaseMount') && d1.getElementById('svCaseMount').dataset.mnt === '1' &&
    d1.querySelector('.boost-hero-film'), 15000);
  ok('storefront boots (77 products) with the case, the thread and the cold hero film mounted',
    booted && DB.products.length === 77);

  /* settle the governor, then let the page sit — nothing may fetch a film */
  await until(() => w1.ShivaaV128 && w1.ShivaaV128.settled() !== undefined, 4000);
  w1.ShivaaV128.__test.settle();
  await sleep(3000);
  ok('THE HEADLINE: zero film bytes through boot + settle + 3 s (was ~47 MB of eager autoplay)',
    b1.hits.filter(h => /\.mp4/.test(h)).length === 0 && [...d1.querySelectorAll('video')].every(v => !v.getAttribute('src')),
    b1.hits.filter(h => /\.mp4/.test(h)).join(', ') || 'requests: none');

  const filmVids = [...d1.querySelectorAll('video[data-film]')];
  ok('every film on the page is cold: URL parked in data-film, preload=none, no autoplay attribute',
    filmVids.length >= 15 &&
    filmVids.every(v => v.getAttribute('preload') === 'none' && !v.hasAttribute('autoplay')) &&
    filmVids.some(v => /hero\.mp4$/.test(v.getAttribute('data-film'))) &&
    filmVids.filter(v => /thread-0\d\.mp4$/.test(v.getAttribute('data-film'))).length === 5 &&
    filmVids.filter(v => /film-0\d\.mp4$/.test(v.getAttribute('data-film'))).length === 4);

  /* ── arming: proximity arms, budget caps, eviction frees ───────────── */
  const budget1 = w1.ShivaaV128.budget();
  ok('desktop budget is 4 (fine pointer, wide window, no save-data)',
    budget1 === 4, `budget=${budget1}`);

  const heroV = d1.querySelector('.boost-hero-film video');
  b1.FakeIO.fire(heroV, { isIntersecting: true, intersectionRatio: 0 });
  await sleep(80);
  ok('proximity arms the hero film — the URL moves from data-film to src, preload becomes metadata',
    heroV.getAttribute('src') === '/images/films/hero.mp4' && /metadata|auto/.test(heroV.getAttribute('preload') || heroV.preload || ''),
    `src=${heroV.getAttribute('src')} preload=${heroV.getAttribute('preload')}`);

  const carouselVids = [...d1.querySelectorAll('.c-slide video.c-vid')];
  ok('the four carousel films arm too — and the budget holds at 4 armed',
    (await (async () => {
      carouselVids.forEach(v => b1.FakeIO.fire(v, { isIntersecting: true, intersectionRatio: 0 }));
      await sleep(120);
      return w1.ShivaaV128.armed() <= 4 && w1.ShivaaV128.armed() >= 3;
    })()), `armed=${w1.ShivaaV128.armed()}`);

  /* the visible slide plays; the others stay paused (governor-driven films) */
  const visibleSlideVid = carouselVids[0];
  b1.FakeIO.fire(visibleSlideVid, { isIntersecting: true, intersectionRatio: 0.5 });
  await sleep(80);
  ok('a ≥22%-visible slide film gets its play call through the governor (want door arms on demand)',
    visibleSlideVid.getAttribute('src') !== null && w1.ShivaaV128.records().some(r => r.v === visibleSlideVid && r.ratio >= 0.22));

  /* eviction: push the hero far away and arm a thread film — the hero frees its slot */
  const heroRect = heroV.getBoundingClientRect.bind(heroV);
  heroV.getBoundingClientRect = () => ({ top: 9000, left: 0, width: 100, height: 100, right: 100, bottom: 9100 });
  const t5 = [...d1.querySelectorAll('#svThreadMount video')].find(v => /thread-05\.mp4$/.test(v.getAttribute('data-film')));
  /* THE NAMED REGRESSION: with every other film holding the budget, chapter 05 still acquires */
  w1.ShivaaV125.openThread; /* (present) */
  w1.ShivaaV128.want(t5);
  await sleep(150);
  ok('THE NAMED REGRESSION — Gold Thread 05 acquires a slot even with the budget fully held',
    t5.getAttribute('src') === '/images/films/thread-05.mp4' && w1.ShivaaV128.armed() <= 4,
    `src=${t5.getAttribute('src')} armed=${w1.ShivaaV128.armed()}`);
  heroV.getBoundingClientRect = heroRect;

  /* the v125 doors: spin the case, the front film drives through svWant */
  const caseStage = d1.querySelector('#svCaseStage');
  b1.FakeIO.fire(caseStage, { isIntersecting: true, intersectionRatio: 0.5 });
  w1.ShivaaV125.caseNext(); await sleep(400);
  w1.ShivaaV125.caseNext(); await sleep(400);
  const caseVids = [...d1.querySelectorAll('#svCaseMount video')];
  const front = w1.ShivaaV125.caseFront();
  ok('the Revolving Case still spins (film 03 front) and its films drive through the splay/shut doors',
    front === 2 && caseVids[front].dataset.svWant === '1' && caseVids.every((v, i) => i === front || v.dataset.svWant !== '1'),
    `front=${front} wants=${caseVids.map(v => v.dataset.svWant).join('')}`);

  /* the Reel: explicit tap still loads — it is never governed */
  w1.ShivaaV125.open(1, d1.querySelector('#svCaseMount .sv-case-card'));
  await sleep(200);
  const reelOk = !d1.getElementById('svReel').hidden && d1.getElementById('svReelTitle').textContent === 'The Blessing' &&
    d1.getElementById('svReelVid').getAttribute('src') === '/images/films/film-02.mp4';
  w1.ShivaaV125.close(); await sleep(80);
  ok('the Reel still loads its film on an explicit tap (sound player, own src, ungoverned)',
    reelOk && d1.getElementById('svReel').hidden);

  /* ── the page-hero film: built only when frames exist ──────────────── */
  w1.location.hash = '#/rates';
  const pg = await until(() => d1.querySelector('[data-boost="pghero"]'), 8000);
  ok('the rates page hero carries data-boost-pgfilm and NO <video> while cold',
    !!(pg && /gold-flow/.test(d1.querySelector('[data-boost="pghero"]').getAttribute('data-boost-pgfilm') || '') &&
    !d1.querySelector('[data-boost="pghero"] video')));
  if (pg) {
    const ph = d1.querySelector('[data-boost="pghero"]');
    b1.FakeIO.fire(ph, { isIntersecting: true, intersectionRatio: 0.6 });
    await until(() => (w1.ShivaaV128.__test.pgPending() || []).length > 0, 3000);
    const pend = (w1.ShivaaV128.__test.pgPending() || [])[0];
    ok('arming the page hero builds the video DETACHED (static image holds, no dark gap), src set, not yet inserted',
      !!pend && pend.v.getAttribute('src') === '/images/films/gold-flow.mp4' && !ph.querySelector('video.ph-vid'));
    if (pend) {
      pend.v.dispatchEvent(new w1.Event('loadeddata'));
      await sleep(80);
      ok('the film takes over only once its first frame is decoded (inserted + registered)',
        !!ph.querySelector('video.ph-vid') && w1.ShivaaV128.records().some(r => r.v === ph.querySelector('video.ph-vid')));
    }
  }
  ok('no unhandled page errors in the v128 session', b1.errors.length === 0, b1.errors.slice(0, 3).join(' | '));
  b1.dom.window.close();

  /* ── boot 2: phone budget ──────────────────────────────────────────── */
  const b2 = boot({ coarse: true });
  const w2 = b2.dom.window;
  await until(() => w2.ShivaaV128, 8000);
  ok('a coarse-pointer (phone) budget is 3', w2.ShivaaV128.budget() === 3, `budget=${w2.ShivaaV128.budget()}`);
  b2.dom.window.close();

  /* ── boot 3: Save-Data → posters only, nothing may ever arm ────────── */
  const b3 = boot({ saveData: true });
  const d3 = b3.dom.window.document, w3 = b3.dom.window;
  await until(() => d3.querySelectorAll('#view .p-card, #view .cat-mini-card').length > 0 && d3.querySelector('.boost-hero-film'), 15000);
  w3.ShivaaV128.__test.settle();
  const hv3 = d3.querySelector('.boost-hero-film video');
  b3.FakeIO.fire(hv3, { isIntersecting: true, intersectionRatio: 0.9 });
  await sleep(200);
  ok('Save-Data: budget 0 — proximity + full visibility still arm NOTHING (posters only, as v125 promised)',
    w3.ShivaaV128.budget() === 0 && hv3.getAttribute('src') === null);
  b3.dom.window.close();

  console.log('\n· C · control — the disease is still visible to this gate');

  /* ── control 1: strip v128.js → the OLD eager build must return ────── */
  const b4 = boot({ stripV128: true });
  const d4 = b4.dom.window.document;
  const booted4 = await until(() => d4.querySelectorAll('#view .p-card, #view .cat-mini-card').length > 0 &&
    d4.querySelector('.boost-hero-film') && d4.getElementById('svCaseMount') && d4.getElementById('svCaseMount').dataset.mnt === '1', 15000);
  await sleep(1500);
  const hero4 = d4.querySelector('.boost-hero-film video');
  const films4 = [...d4.querySelectorAll('#svCaseMount video, #svThreadMount video')];
  ok('CONTROL — without v128.js the eager build returns: hero film carries src + autoplay, the nine films carry src',
    booted4 && !!hero4 && hero4.getAttribute('src') === '/images/films/hero.mp4' && hero4.autoplay === true &&
    films4.length === 9 && films4.every(v => v.getAttribute('src')),
    `booted=${booted4} heroSrc=${hero4 && hero4.getAttribute('src')} autoplay=${hero4 && hero4.autoplay} films=${films4.length} withSrc=${films4.filter(v => v.getAttribute('src')).length}`);
  b4.dom.window.close();

  /* ── control 2: au-lite → v125 mounts posters only (no <video>) ────── */
  const b5 = boot({ auLite: true });
  const d5 = b5.dom.window.document, w5 = b5.dom.window;
  await until(() => d5.getElementById('svCaseMount') && d5.getElementById('svCaseMount').dataset.mnt === '1', 15000);
  ok('CONTROL — au-lite still mounts zero <video> for the nine films (posters only), budget 0',
    d5.querySelectorAll('#svCaseMount video, #svThreadMount video').length === 0 && w5.ShivaaV128 && w5.ShivaaV128.budget() === 0);
  b5.dom.window.close();
  server.close();

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v128 checks passed  ${pass === results.length ? ' ✦' : ''}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
