/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v125 check — owner-selected film showcases on the homepage:
   the Revolving Case (preview Way 17) + the Gold Thread (preview Way 12)
   + the Reel player, with the four films in /images/films/.

   A · static  (12)  exact 125 triple, zero stale v=124 (both branches),
                      shell + SW precache pins, v125 includes ordered after
                      v122, both home mounts placed, 4 films + 4 posters on
                      disk (light), v125.js self-guarding + data discipline
                      (muted/playsinline/poster-first, LITE = posters only),
                      boost films row superseded (display layer only),
                      owner locks untouched (api/.htaccess/db vs git HEAD),
                      media cache generation left alone
   B · live    (8)   jsdom: boots 77, zero page errors, both sections mount,
                      case 4 cards + counter, arrows advance the front film,
                      thread 4 chapters + drawn path, film srcs correct,
                      reel opens/closes + scroll lock, au-lite = no <video>
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
const v125css = fs.readFileSync(path.join(CMS, 'css/v125.css'), 'utf8');

const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2,
  spot: { gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2 },
  jaipur: { gold24: 15139, gold22: 14226, gold18: 11354, silver: 236.2 },
  anchorLevel: { mode: 'mcx-future', source: 'mcx-live', goldPerG: 15084, silverPerG: 233.2, at: new Date().toISOString(), ageMs: 200 },
  premium: { gold22: 398, gold: 55, silver: 3 },
  rtgs: { rows: {} }, history: [],
};

function bootStore(extra = '') {
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
  return { dom, errors };
}

(async () => {
  console.log('· A · static — v125 film showcases');

  const shellRel = /__SHIVAA_REL\s*=\s*(\d+)/.exec(html), appRel = /APP_REL\s*=\s*(\d+)/.exec(appJs), swRel = /SHELL = 'shivaa-shell-v(\d+)'/.exec(sw);
  /* forward-compatible: 126 re-stamps the same four files, so the handshake
     is accepted at 125 (as shipped) or 126 (the current release) */
  const REL = (shellRel && shellRel[1]) || '125';
  ok('release handshake is 125 or newer everywhere (shell, app, worker)',
    shellRel && appRel && swRel && Number(shellRel[1]) >= 125 && Number(appRel[1]) >= 125 && Number(swRel[1]) >= 125 /* v148 fix-forward: numeric, never re-pin */,
    `shell=${shellRel && shellRel[1]} app=${appRel && appRel[1]} sw=${swRel && swRel[1]}`);

  const stamped = { 'index.html': html, 'js/app.js': appJs, 'js/v116.js': v116src, 'sw.js': sw };
  const stale = Object.entries(stamped).filter(([, s]) => /v=124/.test(s)).map(([n]) => n);
  ok('no stale v=124 stamp survives in any stamped file (both ?v= and &v= branches)', stale.length === 0, stale.join(', '));
  /* v126 re-stamps the release triple — the worker still legitimately pins
     the v125 assets themselves (css/v125.css?v=125, js/v125.js?v=125) */
  /* the v125 assets keep their own ?v=125 by design — strip those exact
     references before looking for a stamp that failed to move */
  const reStamped = { 'index.html': html, 'js/app.js': appJs, 'js/v116.js': v116src };
  /* v147 fix-forward: only SCRIPT/CSS ASSET TAGS are release stamps. The bare
     ?v=125 that survives in app.js/v116.js is the v120-era photo cache-bust on
     category images (?v=125 on /images/…jpg) — a media token, not a stamp,
     and it must never read as a stale one. The v125 layer keeps its own
     ?v=125 by design (never re-stamped while unchanged). */
  const stale125 = Object.entries(reStamped)
    .filter(([, s]) => (s.match(/\/(?:js|css)\/[a-z0-9.\-]+\.(?:js|css)\?v=125/gi) || [])
      .filter(t => !/[.\/]v125\.(?:js|css)\?v=125$/i.test(t)).length > 0)
    .map(([n]) => n);
  ok('the v126 release triple carries no stale v=125 stamp (index.html, app.js, v116.js)',
    REL === '125' || stale125.length === 0, stale125.join(', '));

  /* v147 fix-forward: since the v143 rule only CHANGED files move their ?v=.
     app.js rides the current release in shell AND worker (lockstep enforced);
     v116/v117 legitimately keep whatever ≥116 stamp their last change gave
     them — demanding the current release from them pinched every release from
     v146 on, so the check is: exists, stamped, and in shell/worker lockstep. */
  const v116Tag = /\/js\/v116\.js\?v=(\d{3})/.exec(html), v116Sw = /'\/js\/v116\.js\?v=(\d{3})'/.exec(sw);
  ok('shell loads app.js at the current release and v116.js in shell/worker lockstep — plus the v125 assets precached',
    new RegExp('\\/js\\/app\\.js\\?v=' + REL).test(html) &&
    new RegExp("'\\/js\\/app\\.js\\?v=" + REL + "'").test(sw) &&
    !!v116Tag && !!v116Sw && v116Tag[1] === v116Sw[1] && +v116Tag[1] >= 116 &&
    /'\/js\/v125\.js\?v=125'/.test(sw) && /'\/css\/v125\.css\?v=125'/.test(sw));

  ok('v125 includes load in order (css after v122.css, js after v122.js)',
    /\/css\/v125\.css\?v=125/.test(html) && /\/js\/v125\.js\?v=125/.test(html) &&
    html.indexOf('/css/v122.css?v=122') < html.indexOf('/css/v125.css?v=125') &&
    html.indexOf('/js/v122.js?v=122') < html.indexOf('/js/v125.js?v=125'));

  ok('home template carries both mounts: case before Bestsellers, thread after it',
    /id="svCaseMount"/.test(appJs) && /id="svThreadMount"/.test(appJs) &&
    appJs.indexOf('id="svCaseMount"') < appJs.indexOf('Loved most') &&
    appJs.indexOf('id="svThreadMount"') > appJs.indexOf('Bestsellers'));

  let filmsOk = true, filmsDetail = [];
  for (const [fam, n] of [['film', 4], ['thread', 5]]) {
    for (let i = 1; i <= n; i++) {
      const mp4 = path.join(CMS, `images/films/${fam}-0${i}.mp4`), jpg = path.join(CMS, `images/films/${fam}-0${i}.jpg`);
      if (!fs.existsSync(mp4)) { filmsOk = false; filmsDetail.push(`missing ${fam}-0${i}.mp4`); continue; }
      const sz = fs.statSync(mp4).size;
      if (sz < 50 * 1024 || sz > 2.5 * 1024 * 1024) { filmsOk = false; filmsDetail.push(`${fam}-0${i}.mp4 ${Math.round(sz / 1024)}KB out of range`); }
      if (!fs.existsSync(jpg) || fs.statSync(jpg).size < 10 * 1024) { filmsOk = false; filmsDetail.push(`poster ${fam}-0${i}.jpg missing/too small`); }
    }
  }
  ok('all nine owner films + posters on disk (4 case + 5 thread), each light (50 KB – 2.5 MB)', filmsOk, filmsDetail.join('; '));

  ok('the case story is the owner four-film bride arc (unboxing to everyday wear)',
    /The Unboxing/.test(v125) && /The Blessing/.test(v125) && /The Muse/.test(v125) && /The Wearing/.test(v125));

  ok('the thread story is the owner five-chapter arc (fire to forever)',
    /From Paper to Gold/.test(v125) && /The Modern Bride/.test(v125) && /Forever, Reimagined/.test(v125) &&
    /thread-01\.mp4/.test(v125) && /thread-05\.mp4/.test(v125) &&
    (v125.match(/\/images\/films\/thread-0\d\.mp4/g) || []).length === 5);

  ok('v125.js is self-guarding: strict, IIFE, no network of its own, guarded matchMedia',
    /^\s*(\/\*[\s\S]*?\*\/\s*)?'use strict';/.test(v125) && /\(function \(\)\s*\{/.test(v125) && !/fetch\(/.test(v125) &&
    /typeof matchMedia === 'function'/.test(v125));

  ok('film data discipline: muted + playsinline + poster-first everywhere, LITE mounts posters only',
    /v\.muted = true/.test(v125) && /v\.playsInline = true/.test(v125) && /setAttribute\('poster'/.test(v125) &&
    /navigator\.connection && navigator\.connection\.saveData/.test(v125) &&
    /au-lite/.test(v125) && /liteMode\) \{\n      wrap\.innerHTML = '<img/.test(v125));

  ok('the v46 boost films row is superseded on the homepage (display layer only — boost.js untouched)',
    /\[data-boost="films"\]/.test(v125) && /\.remove\(\)/.test(v125.split('supersedeBoostFilms')[1] || '') &&
    !/data-boost/.test(v125.split('supersedeBoostFilms')[0]));

  /* v159 — the lock pin, made precise instead of noisy. The owner's rule is
     "these files are the owner's, don't quietly rewrite them". A release may
     (a) move its own version stamp in api.php and (b) rewrite the RATE-BRAND
     copy inside product descriptions (v157's owner brief: say Shivaa, not
     Jaipur). Everything else — every other key, in the same order — must be
     byte-identical to HEAD, which is a stricter pin than the loose one it
     replaces. */
  let locksOk = true, locksDetail = [];
  try {
    const headDbRaw = execSync('git show HEAD:cms/data/db.json', { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const diskDbRaw = fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8');
    const walk = (a, b, p = '') => {
      const diffs = [];
      if (typeof a !== typeof b || (a === null) !== (b === null)) return [p + ' (type)'];
      if (a && typeof a === 'object') {
        const ka = Object.keys(a), kb = Object.keys(b);
        if (ka.join('|') !== kb.join('|')) diffs.push(p + ' (keys/order)');
        for (const k of ka) if (k in b) diffs.push(...walk(a[k], b[k], p ? p + '.' + k : k));
        return diffs;
      }
      if (a !== b) diffs.push(p);
      return diffs;
    };
    const diffs = walk(JSON.parse(headDbRaw), JSON.parse(diskDbRaw));
    const bad = diffs.filter(d => !/^products\.\d+\.desc$/.test(d));
    const rewritten = diffs.filter(d => /^products\.\d+\.desc$/.test(d));
    const legacy = (diskDbRaw.match(/Jaipur bullion rate/gi) || []).length;
    if (bad.length) { locksOk = false; locksDetail.push('db.json diverged at: ' + bad.slice(0, 4).join(', ') + (bad.length > 4 ? ' (+' + (bad.length - 4) + ')' : '')); }
    if (legacy) { locksOk = false; locksDetail.push('db.json still carries ' + legacy + ' legacy rate-brand description(s)'); }
    if (locksDetail.length === 0) locksDetail.push('db.json: ' + rewritten.length + ' desc rewrite(s), no structural change');
  } catch (e) { locksOk = false; locksDetail.push('db.json git-compare failed'); }
  for (const f of ['api.php', '.htaccess']) {
    try {
      const head = execSync(`git show HEAD:cms/${f}`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const disk = fs.readFileSync(path.join(CMS, f), 'utf8');
      /* v159 — a release MAY move its own version stamp in api.php (that is the
         house rule: index/sw/app/api move in lockstep), so the stamp line is
         normalised out before the comparison. Everything else in the owner's
         locked files must still be byte-identical to HEAD — the pin is
         stricter than "compared loosely": one line is allowed to differ, and
         only that line. */
      const norm = t => t.replace(/'rel'\s*=>\s*\d+,/g, "'rel'   => N,");
      if (crypto.createHash('md5').update(norm(head)).digest('hex') !== crypto.createHash('md5').update(norm(disk)).digest('hex')) { locksOk = false; locksDetail.push(f + ' changed beyond its version stamp'); }
    } catch (e) { locksDetail.push(f + ' git-compare failed'); locksOk = false; }
  }
  ok('owner locks respected: .htaccess byte-identical · api.php identical but for its stamp · db.json unchanged but for the 77 brand rewrites', locksOk, locksDetail.join('; '));

  ok('media cache generation left alone (shivaa-media-v120)', /MEDIA = 'shivaa-media-v120'/.test(sw));

  ok('reel player: keyboard + swipe + auto-advance + scroll lock + route-safe close',
    /Escape/.test(v125) && /touchstart/.test(v125) && /'ended'/.test(v125) && /sv-reel-open/.test(v125) && /hashchange/.test(v125) && /\.sv-reel\b/.test(v125css));

  server.listen(0);
  console.log('\n· B · live behaviour — http://127.0.0.1:' + server.address().port);

  /* ── boot 1: the full showcase ─────────────────────────────────────── */
  const b1 = bootStore();
  const d1 = b1.dom.window.document;
  const booted = await until(() => d1.querySelectorAll('#view .p-card, #view .cat-mini-card').length > 0 && d1.getElementById('svCaseMount') && d1.getElementById('svCaseMount').dataset.mnt === '1', 12000);
  ok('storefront boots and the case mounts on the home page', booted);
  ok('boots with the full 77-product catalogue', DB.products.length === 77);

  const caseMounted = await until(() => d1.querySelector('#svCaseMount .sv-case'), 4000);
  ok('the Revolving Case renders: dark stage + ring + 4 film cards',
    caseMounted && d1.querySelectorAll('#svCaseMount .sv-case-card').length === 4 && !!d1.querySelector('#svCaseMount .sv-case-stage'));

  ok('case counter names the front film',
    /01 \/ 04 · THE UNBOXING/.test((d1.querySelector('#svCaseMount .sv-case-count') || {}).textContent || ''));

  b1.dom.window.ShivaaV125.caseNext();
  await sleep(700);
  b1.dom.window.ShivaaV125.caseNext();
  await sleep(700);
  ok('two arrow clicks advance the case to film 03 (clicks queue, never eat)',
    b1.dom.window.ShivaaV125.caseFront() === 2);

  const threadMounted = await until(() => d1.querySelector('#svThreadMount .sv-thread'), 4000);
  const tpath = d1.querySelector('#svThreadPath');
  ok('the Gold Thread renders: 5 chapters + a draw path with dash geometry',
    threadMounted && d1.querySelectorAll('#svThreadMount .sv-thread-item').length === 5 &&
    tpath && tpath.style.strokeDasharray !== '' && tpath.style.strokeDashoffset !== '' &&
    (d1.querySelector('#svThreadMount .sv-thread-item:last-child small') || {}).textContent === 'CHAPTER 05');

  const allSrcs = [...d1.querySelectorAll('#svCaseMount video, #svThreadMount video')].map(v => v.getAttribute('src'));
  ok('film sources: the case plays its 4 bride-arc films, the thread its 5 story films',
    allSrcs.filter(x => /\/images\/films\/film-0[1-4]\.mp4$/.test(x)).length === 4 &&
    allSrcs.filter(x => /\/images\/films\/thread-0[1-5]\.mp4$/.test(x)).length === 5);

  /* reel player round-trip */
  b1.dom.window.ShivaaV125.open(1, d1.querySelector('#svCaseMount .sv-case-card'));
  await sleep(150);
  const reelOk = !d1.getElementById('svReel').hidden &&
    d1.getElementById('svReelTitle').textContent === 'The Blessing' &&
    d1.documentElement.classList.contains('sv-reel-open');
  b1.dom.window.ShivaaV125.close();
  await sleep(60);
  ok('the Reel opens on the chosen film (scroll locked) and closes clean',
    reelOk && d1.getElementById('svReel').hidden && !d1.documentElement.classList.contains('sv-reel-open'));

  /* the thread list (5 films) in the same reel */
  b1.dom.window.ShivaaV125.openThread(3, d1.querySelector('#svThreadMount .sv-thread-film'));
  await sleep(150);
  ok('the Reel plays the thread story list: 5 films, right chapter, own counter',
    !d1.getElementById('svReel').hidden &&
    d1.getElementById('svReelTitle').textContent === 'The Modern Bride' &&
    d1.getElementById('svReelCount').textContent === '04 / 05');
  b1.dom.window.ShivaaV125.close();
  await sleep(60);

  /* boost films row superseded once boost has had its chance to inject */
  await until(() => b1.dom.window.document.querySelector('#view [data-boost="films"]'), 5000);
  await sleep(900);
  ok('the v46 boost films row is gone from the home page (superseded by v125)',
    !d1.querySelector('#view [data-boost="films"]'));

  ok('no unhandled page errors in the v125 session', b1.errors.length === 0, b1.errors.slice(0, 3).join(' | '));

  /* ── boot 2: au-lite / save-data → posters only, no <video> mounted ── */
  /* au-lite must be on <html> before v125's mounts fire. beforeParse runs
     before parsing starts (no documentElement yet), so watch for its birth
     and stamp the class the instant it exists — long before any deferred
     script or async render can mount the films. */
  const b2 = bootStore(w => {
    const mo = new w.MutationObserver(() => {
      const de = w.document.documentElement;
      if (de) { de.classList.add('au-lite'); mo.disconnect(); }
    });
    mo.observe(w.document, { childList: true, subtree: true });
  });
  const d2 = b2.dom.window.document;
  await until(() => d2.getElementById('svCaseMount') && d2.getElementById('svCaseMount').dataset.mnt === '1', 12000);
  ok('au-lite (save-data) mode: films never mount a <video> — posters only (4 + 5)',
    d2.querySelectorAll('#svCaseMount video, #svThreadMount video').length === 0 &&
    d2.querySelectorAll('#svCaseMount .sv-case-card img').length === 4 &&
    d2.querySelectorAll('#svThreadMount .sv-thread-film img').length === 5);
  b1.dom.window.close(); b2.dom.window.close(); server.close();

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v125 checks passed  ${pass === results.length ? ' ✦' : ''}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
