/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v167 check — "every field has a name, every page has a heading, and
   the fixes that were frozen at 166 now ride the release".

   A · static (14)  the release triple is in lockstep at 167 or newer, every
                    shell asset carries that stamp, the worker precaches the two
                    new files, and each repair in this release is present in the
                    source it was made in — including the two that were still
                    frozen (the v166 enhancement-retry URLs and the worker's
                    MEDIA_TTL, declared in v120 and read nowhere).
   B · live  (16)   jsdom on the REAL shell: the label-repair layer pairs every
                    generated field on the pages a shopper actually uses; the
                    empty bag and the signed-out member routes have a heading of
                    their own; heading levels never jump; a sheet gets an
                    accessible name; toast() survives a missing wrapper; the
                    filter badge counts the price slider; and the price slider
                    still means "Any" at its top stop.
   C · control (2)  the SAME label sweep with /js/v167.js stripped still finds
                    unpaired fields — so this gate can see the repair if the
                    layer is ever lost, and cannot pass on an empty page.

   Run:  node tools/mega/smoke/v167-check.js
   Overlay: SMOKE_CMS=<dir> node tools/mega/smoke/v167-check.js
   ══════════════════════════════════════════════════════════════════════════ */
const { JSDOM, VirtualConsole } = require('jsdom');
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
async function until(fn, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); }
  return false;
}
const read = (p) => fs.readFileSync(path.join(CMS, p), 'utf8');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const ASKED = [];
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

/* one shopper session on the real shell. stripV167 removes the repair layer so
   the control run can prove the gate is measuring something real. */
function boot({ startHash = '', innerWidth = 1280, stripV167 = false } = {}) {
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8')
    .replace(/<script src="\/js\/v167\.js\?v=\d+" defer><\/script>/, stripV167 ? '' : m => m)
    .replace(/<link rel="stylesheet" href="\/css\/v167\.css\?v=\d+">/, stripV167 ? '' : m => m);
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String(e && e.message);
    if (/Not implemented: navigation/.test(m)) return;
    if (/Could not load script/.test(m) && /cashfree/.test(m)) return;
    errors.push(m);
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
      const nativeFetch = w.fetch;
      const J = (obj, status = 200) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => obj, text: async () => JSON.stringify(obj), clone() { return this; } });
      w.fetch = (input, opts) => {
        const p = String(input).split('?')[0];
        let out = null;
        if (p.endsWith('/api/rates')) out = RATES_STUB;
        else if (p.endsWith('/api/settings')) out = { settings: DB.settings };
        else if (p.endsWith('/api/making-charges')) out = { table: [] };
        else if (p.endsWith('/api/catalogs')) out = { catalogs: [] };
        else if (p.endsWith('/api/auth/me')) out = { user: null };
        else if (p.endsWith('/api/pages')) out = { pages: [] };
        else if (p.endsWith('/api/version')) out = { ok: true, rel: Number((/window\.__SHIVAA_REL=(\d+);/.exec(html) || [0, 0])[1]), shell: 'shivaa-shell-v1', forceLatest: true, stamp: {} };
        else if (p.endsWith('/api/products')) out = { products: DB.products };
        if (out) return J(out);
        return nativeFetch(input, opts);
      };
    },
  });
  const w = dom.window, doc = w.document;
  return {
    w, doc, errors,
    $: s => doc.querySelector(s),
    $$: s => [...doc.querySelectorAll(s)],
    click(el) { if (!el) return false; el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w })); return true; },
    booted: () => until(() => doc.body.dataset.page, 25000),
    go(hash) { w.location.hash = hash; },
  };
}

/* the same rule js/v167.js uses: inside a .fld block, a visible <label> whose
   control is neither wrapped by it nor pointed at by for= is an unnamed field. */
function unpaired(doc) {
  const out = [];
  doc.querySelectorAll('.fld').forEach(blk => {
    const c = blk.querySelector('input:not([type=hidden]),select,textarea');
    if (!c) return;
    if (c.closest('label')) return;
    const lb = blk.querySelector('label');
    if (!lb) return;
    if (lb.hasAttribute('for')) return;
    if (c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) return;
    out.push((lb.textContent || '').trim().slice(0, 40) + ' → ' + c.tagName.toLowerCase() + (c.name ? '[name=' + c.name + ']' : ''));
  });
  return out;
}
function headingLevels(doc, sel) {
  return [...(sel ? doc.querySelector(sel) : doc.body).querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter(h => !h.closest('.modal, #modalBox, [hidden], .sr-only'))
    .map(h => +h.tagName[1]);
}
function isBadLevels(levels) {
  if (!levels.length || levels[0] !== 1) return 'first heading is not an h1 (' + levels.slice(0, 4).join(',') + ')';
  let prev = levels[0];
  for (const l of levels.slice(1)) { if (l - prev > 1) return 'h' + prev + ' → h' + l; prev = l; }
  return '';
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  /* ══════ A · static ══════ */
  console.log('\n· A · static — the release, the stamps, the repairs');
  const idx0 = read('index.html');
  const REL = Number((/window\.__SHIVAA_REL=(\d+);/.exec(idx0) || [0, 0])[1]);
  const idx = idx0, sw = read('sw.js'), app = read('js/app.js'), api = read('api.php'), v166 = read('js/v166.js');
  const css167 = read('css/v167.css'), js167 = read('js/v167.js'), auth = read('js/auth.js');

  /* v167 fix-forward: the durable law is the FLOOR plus the triple moving
     together — a later release legitimately re-stamps every asset URL (it is
     the only way a ?v= URL cached for a year can ever move). Never re-pin. */
  const REL_FLOOR = 167;
  const APPREL = Number((/const APP_REL = (\d+);/.exec(app) || [0, 0])[1]);
  const SWREL = Number((/const REL = (\d+);/.exec(sw) || [0, 0])[1]);
  const SHELLREL = Number((/SHELL = 'shivaa-shell-v(\d+)'/.exec(sw) || [0, 0])[1]);
  const APIREL = Number((/'rel'\s*=>\s*(\d+),/.exec(api) || [0, 0])[1]);
  ok('the release triple is in lockstep at 167 or newer',
    REL >= REL_FLOOR && APPREL === REL && SWREL === REL && SHELLREL === REL && APIREL === REL,
    `rel stamps: idx=${REL} app=${APPREL} sw=${SWREL} shell=${SHELLREL} api=${APIREL}`);

  ok('the shell carries the CURRENT stamp on every script, stylesheet and font',
    [...idx.matchAll(/(?:href|src)="(\/[^"]+\.(?:js|css|woff2))(?:\?([^"]*))?"/g)]
      .every(m => new RegExp(`(^|&)v=${REL}($|&)`).test(m[2] || '')),
    [...idx.matchAll(/(?:href|src)="(\/[^"]+\.(?:js|css|woff2))(?:\?([^"]*))?"/g)]
      .filter(m => !new RegExp(`(^|&)v=${REL}($|&)`).test(m[2] || '')).map(m => m[1] + '?' + (m[2] || '')).join(', '));

  ok('the worker precaches the same list at the same stamp, v167 files included',
    [...sw.matchAll(/'(\/[^']+\?v=([^']+))'/g)].every(m => m[2] === String(REL)) &&
    sw.includes(`'/js/v167.js?v=${REL}'`) && sw.includes(`'/css/v167.css?v=${REL}'`),
    `stale: ${[...sw.matchAll(/'(\/[^']+\?v=([^']+))'/g)].filter(m => m[2] !== String(REL)).map(m => m[1]).join(', ')}`);

  ok('v167.js is loaded LAST in the shell, at the current stamp',
    new RegExp(`<script src="/js/v167\\.js\\?v=${REL}" defer></script>`).test(idx) &&
    idx.indexOf('/js/v167.js') > idx.indexOf('/js/v166.js'));

  ok('v167.css is linked last, at the current stamp',
    new RegExp(`<link rel="stylesheet" href="/css/v167\\.css\\?v=${REL}">`).test(idx) &&
    idx.indexOf('/css/v167.css') > idx.indexOf('/css/v140.css'));

  ok('the label-repair layer exists and is a delegated pass, not a markup rewrite',
    js167.includes('label.setAttribute(\'for\', ctl.id)') && js167.includes('MutationObserver') &&
    js167.includes('aria-label') && js167.length > 1500);

  ok('the repair layer is inert on a page that has no fields, and cannot loop',
    js167.includes('__SHIVAA_A11Y167__') && js167.includes('queued'));

  ok('keyboard focus is visible on the search field again (outline:none repair)',
    /#searchInput:focus-visible/.test(css167) && /outline:\s*2px solid/.test(css167));

  ok('heading repairs keep the size of the level they replace',
    /\.adm-card[^}]*h2\s*\{[^}]*font-size:\s*20px/.test(css167) &&
    /\.empty h2\s*\{[^}]*font-size:\s*26px/.test(css167) &&
    /\.svc h3\s*\{[^}]*font-size:\s*24px/.test(css167) &&
    /\.fsheet-bar \.fsheet-title/.test(css167));

  ok('the empty / not-found / signed-out views render a real page heading',
    app.includes('const emptyShell = (crumb, title, inner)') &&
    app.includes('const signInGate = (view, next, title, blurb)') &&
    app.includes("emptyShell('Cart', 'Your Cart'") &&
    app.includes("emptyShell('Quotation', 'Price Quotation'") &&
    /pages\.account[\s\S]{0,120}signInGate\(view, 'account'/.test(app) &&
    /pages\.track[\s\S]{0,120}signInGate\(view, 'track'/.test(app));

  ok('the generic sheet borrows its own heading as an accessible name',
    app.includes("box.setAttribute('aria-label', headTxt.slice(0, 120))") &&
    app.includes('aria-label="Close" onclick="Shivaa.closeModal()"'));

  const toastStart = app.indexOf("function toast(msg, type = 'ok')");
  const toastEnd = app.indexOf('\nlet _modalTrap', toastStart);
  const toastBody = toastStart >= 0 && toastEnd > toastStart ? app.slice(toastStart, toastEnd) : '';
  ok('toast() repairs a missing wrapper instead of throwing',
    toastBody.includes("let wrap = $('#toastWrap')") &&
    /if \(!wrap\) \{[\s\S]*?wrap = document\.createElement\('div'\); wrap\.id = 'toastWrap'/.test(toastBody) &&
    toastBody.includes('wrap.appendChild(t);'));

  ok('the duplicate #shvErr is gone — errors are addressed by pane',
    !/id="shvErr"/.test(auth) && /data-shv-err/.test(auth) &&
    auth.includes('function activeErrBox()') && auth.includes('function clearErrs()'));

  ok('the worker finally enforces MEDIA_TTL (declared in v120, never read)',
    /MEDIA_TTL/.test(sw) && /cutoff[\s\S]{0,200}MEDIA_TTL/.test(sw) && /Date\.parse\(stamp\)/.test(sw));

  ok('the v166 graphics failsafe no longer asks for its own frozen release',
    !/\?v=' \+ REL,/.test(v166) && /\?v=' \+ assetRel,/.test(v166) && /var assetRel = \+\(w\.__SHIVAA_REL \|\| REL\)/.test(v166));

  ok('the declared prepaid percentage is honoured (a 0% shop keeps 0%)',
    app.includes('const prepaidPct = () => {') &&
    app.includes("s.prepaidPct === undefined || s.prepaidPct === null") &&
    !app.includes("subtotal * (payCfg.prepaidPct"), '') ;

  ok('a missing free-shipping setting falls back to the published ₹50,000, not zero',
    app.includes("(state.settings || {}).freeShipAbove ?? 50000"));

  console.log('\n· B · live — the real shell in jsdom');

  {
    const S = boot({ startHash: '#/cart' });
    const booted = await S.booted();
    await sleep(700);
    ok('the shell boots and reaches the cart route', booted && S.doc.body.dataset.page === 'cart',
      'page=' + S.doc.body.dataset.page);

    const lvl = headingLevels(S.doc, '#view');
    ok('an EMPTY bag is a page, not a fragment: h1, then no skipped level',
      lvl.length > 0 && !isBadLevels(lvl), 'levels: ' + lvl.join(','));

    ok('the empty bag keeps its own next step (h2 + a way to shop)',
      !!S.$('#view .empty h2') && /Explore Jewellery/.test(S.$('#view') ? S.$('#view').innerHTML : ''));

    /* the signed-out member routes: the login sheet used to open over an EMPTY
       page — closing it left the shopper on a blank screen */
    S.go('#/account');
    await until(() => S.doc.body.dataset.page === 'account' && S.$('#view h1'), 8000);
    await sleep(400);
    ok('a signed-out member route explains itself behind the login sheet',
      !!S.$('#view h1') && /My Account/.test(S.$('#view').textContent || ''),
      'h1: ' + ((S.$('#view h1') || {}).textContent || 'none'));

    /* the sheet's accessible name */
    const card = S.doc.querySelector('#shvAuthWrap .shv-card[role="dialog"]');
    ok('the login sheet is a named dialog (and closes by name)',
      !!card && (card.getAttribute('aria-label') || '').length > 4 &&
      !!S.doc.querySelector('#shvAuthWrap .shv-x[aria-label]'),
      'aria-label: ' + (card ? card.getAttribute('aria-label') : 'no .shv-card'));

    S.errors.length && console.log('        (console: ' + S.errors.slice(0, 2).join(' | ').slice(0, 200) + ')');
    ok('no uncaught error from the v167 layer on these routes',
      !S.errors.some(e => /v167/.test(e)), S.errors.filter(e => /v167/.test(e)).join(' | '));
    S.w.close();
  }

  {
    const S = boot({ startHash: '#/contact' });
    await S.booted();
    await sleep(900);
    const miss = unpaired(S.doc);
    ok('every field on the contact page is named for a screen reader',
      miss.length === 0, miss.slice(0, 6).join(' · '));

    const lvl = headingLevels(S.doc, '#view');
    ok('the contact page has an h1 and no skipped level', !isBadLevels(lvl), 'levels: ' + lvl.join(','));

    S.go('#/privacy');
    await until(() => S.doc.body.dataset.page === 'privacy' && S.$('#view h1'), 8000);
    await sleep(400);
    const privLvl = headingLevels(S.doc, '#view');
    ok('the privacy page (DPDPA) has no skipped heading level either',
      !isBadLevels(privLvl), 'levels: ' + privLvl.join(','));

    ok('the layer announces itself on the window (so a later release can audit it)',
      S.w.__SHIVAA_A11Y167__ === true && typeof (S.w.Shivaa && S.w.Shivaa.a11yFix) === 'function');

    /* a sheet's name comes from its own heading */
    S.w.Shivaa.openModal('<h3>Ring size guide</h3><p>x</p>');
    await sleep(250);
    const mb = S.doc.getElementById('modalBox');
    ok('a sheet opened by name borrows that name',
      !!mb && /Ring size guide/.test(mb.getAttribute('aria-label') || ''),
      'aria-label: ' + (mb ? mb.getAttribute('aria-label') : 'none'));
    ok('the sheet close button says what it does',
      !!S.doc.querySelector('#modalBox .modal-close[aria-label="Close"]'));
    S.w.Shivaa.closeModal();

    /* toast() with the wrapper destroyed — the page must not break */
    const tw = S.doc.getElementById('toastWrap');
    if (tw) tw.remove();
    let threw = false;
    try { S.w.Shivaa.toast('audit'); } catch (e) { threw = true; }
    ok('a toast with no wrapper rebuilds it instead of throwing',
      !threw && !!S.doc.getElementById('toastWrap'));
    S.w.close();
  }

  {
    const S = boot({ startHash: '#/shop' });
    await S.booted();
    await until(() => S.$$('#shopGrid .p-card').length > 0, 12000);
    await sleep(400);
    const miss = unpaired(S.doc);
    ok('every field the shop generates is named', miss.length === 0, miss.slice(0, 6).join(' · '));

    S.click(S.$('#filterToggle'));
    await sleep(400);
    const sheet = S.doc.querySelector('.fsheet');
    ok('the filter sheet is titled, and the slider says what it means',
      !!S.doc.querySelector('.fsheet-title') && !!S.$('#priceRange') &&
      (S.$('#priceRange').getAttribute('aria-valuetext') || '') !== '' &&
      (S.$('#priceRange').getAttribute('aria-label') || '').length > 4);

    const rng = S.$('#priceRange');
    rng.value = '50000';
    rng.dispatchEvent(new S.w.Event('input', { bubbles: true }));
    rng.dispatchEvent(new S.w.Event('change', { bubbles: true }));
    await sleep(500);
    const badge = S.$('#fBadge');
    ok('the filter badge counts a price limit while the sheet is open',
      !!badge && badge.hidden === false && badge.textContent === '1',
      'badge: hidden=' + (badge ? badge.hidden : 'none') + ' text="' + (badge ? badge.textContent : '') + '"');
    ok('the slider label reads the limit, not a raw number',
      /50,000/.test((S.$('#priceMaxLbl') || {}).textContent || ''),
      'label: ' + ((S.$('#priceMaxLbl') || {}).textContent));

    /* the top stop is "Any" — it must not filter anything out */
    rng.value = '1500000';
    rng.dispatchEvent(new S.w.Event('input', { bubbles: true }));
    rng.dispatchEvent(new S.w.Event('change', { bubbles: true }));
    await sleep(600);
    ok('the top stop still means "Any" and counts as no filter at all',
      /Any/.test((S.$('#priceMaxLbl') || {}).textContent || '') && $badgeHidden(S.$('#fBadge')),
      'label: ' + ((S.$('#priceMaxLbl') || {}).textContent) + ' badge-hidden=' + $badgeHidden(S.$('#fBadge')));
    S.w.close();
  }

  /* ══════ C · control ══════ */
  console.log('\n· C · control — the same page with the repair layer stripped');
  {
    const S = boot({ startHash: '#/contact', stripV167: true });
    await S.booted();
    await sleep(900);
    const miss = unpaired(S.doc);
    ok('CONTROL · without v167.js the generated fields really are unnamed',
      miss.length > 0, 'unpaired: ' + miss.length);
    console.log('          e.g. ' + miss.slice(0, 3).join(' · '));
    S.w.close();
  }

  if (server.listening) server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n──── v167 · ${pass}/${results.length} ────\n`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('gate crashed:', e); process.exit(1); });

function $badgeHidden(b) { return !b || b.hidden === true; }
