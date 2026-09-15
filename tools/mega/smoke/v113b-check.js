/* SHIVAA · v113b behaviour check
   ─────────────────────────────────────────────────────────────────────────
   Boots the real cms/index.html + every script it loads in jsdom, served from
   a local static server, with the PHP API emulated from cms/data/db.json, and
   exercises the things this release claims to fix:

     1  carousel    autoplay timer never stacks; swipe advances; scroll does not
     2  rates       six cells incl. the two RTGS bullion ones; flat reads steady
     3  quick view  opens in place on a cold cache (no navigation)
     4  designs     the metal-order selection survives leaving the page
     5  KYC         auto-verify runs once per value and retries a wrong code
     6  login       the 10th digit sends exactly one OTP
     7  images      a missing image degrades to the house monogram

   Run from the repo root:  node tools/mega/smoke/v113b-check.js
*/
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.ico': 'image/x-icon',
};

const results = [];
const ok = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail && !cond ? '\n          ' + detail : ''));
};

/* ── the API the page expects, built from the shipped db.json ─────────────── */
const jaipur = { gold24: 15655, gold22: 14405, gold18: 11696, silver: 242.4 };
const rtgsRows = {
  tdsGold9999: { key: 'tdsGold9999', label: 'RTGS Gold 9999', unit: '₹/10 g', mid: 1449830, buy: 1449020, sell: 1450640, change: 1240 },
  tdsGold995: { key: 'tdsGold995', label: 'RTGS Gold 995', unit: '₹/10 g', mid: 1442722, buy: 1441912, sell: 1443532, change: -980 },
  silverPeti: { key: 'silverPeti', label: 'RTGS Silver 999.9', unit: '₹/kg', mid: 243910, buy: 242120, sell: 245700, change: 0 },
  silverChorsa: { key: 'silverChorsa', label: 'RTGS Silver 98.0', unit: '₹/kg', mid: 238379, buy: 0, sell: 238379, change: -4100 },
};
const ratesResponse = () => ({
  t: new Date().toISOString(), source: 'live-mcx', live: false,
  spot: { gold24: 15600, gold22: 14350, gold18: 11650, silver: 239 },
  jaipur, ...jaipur,
  rtgs: { rows: rtgsRows, anchor: 'mcx-future', updatedAt: new Date().toISOString() },
  premium: { gold: 55, silver: 3 },
  history: [Object.assign({ t: new Date(Date.now() - 6e4).toISOString() }, jaipur)],
  nextUpdateIn: 60,
});
const partnerUser = { id: 'U1', name: 'Test Jeweller', role: 'partner', phone: '9876543210', email: 'partner@test.in' };

/* ── static server (mirrors public_html) ──────────────────────────────────── */
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(CMS, url);
  if (url === '/' || url.endsWith('/')) file = path.join(CMS, 'index.html');
  if (!path.resolve(file).startsWith(path.resolve(CMS))) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 8000, step = 60) => {
  const t0 = Date.now();
  for (;;) { try { if (fn()) return true; } catch (e) {} if (Date.now() - t0 > ms) return false; await sleep(step); }
};

/* ── one browser session ──────────────────────────────────────────────────── */
async function session({ origin, partner = false }) {
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const calls = [];
  const timers = { live: new Set(), created: 0, cleared: 0 };
  let pageErrors = [];

  const dom = new JSDOM(html, {
    url: origin + '/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
      window.ResizeObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
      window.SpeechRecognition = undefined;
      window.scrollTo = () => {};
      Object.defineProperty(window.navigator, 'vibrate', { value: () => true, configurable: true });
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
      /* only the carousel beats at 5.5 s (desktop) / 12 s (touch) — counting
         every interval in the page would count the ticker and the clock too */
      const CAR_MS = [5500, 12000];
      const realSet = window.setInterval.bind(window), realClear = window.clearInterval.bind(window);
      window.setInterval = (fn, ms, ...a) => {
        timers.created++;
        const id = realSet(fn, ms, ...a);
        if (CAR_MS.indexOf(ms) >= 0) timers.live.add(id);
        return id;
      };
      window.clearInterval = id => { timers.cleared++; timers.live.delete(id); return realClear(id); };
      window.addEventListener('error', e => {
        if (e.target && e.target.tagName === 'IMG') return;             // the image net handles those
        pageErrors.push(e.message || String(e.error || 'error'));
      });
      if (partner) { try { window.localStorage.setItem('shv_token', JSON.stringify('test-token')); } catch (e) {} }

      window.fetch = (input, init) => {
        const u = String(input).replace(origin, '');
        const p = u.split('?')[0];
        let body = {};
        try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (e) {}
        calls.push({ p, body, method: (init && init.method) || 'GET' });
        let status = 200, out = {};
        const J = () => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });

        if (p === '/api/rates') out = ratesResponse();
        else if (p === '/api/settings') out = { settings: DB.settings };
        else if (p === '/api/making-charges') out = { table: [] };
        else if (p === '/api/catalogs') out = { catalogs: [] };
        else if (p === '/api/auth/me') out = { user: partner ? partnerUser : null };
        else if (p === '/api/products') out = { products: DB.products };
        else if (p.startsWith('/api/products/')) {
          out = { product: DB.products[0], similar: [], reviews: [], rates: DB.rates.last };
        } else if (p === '/api/auth/send-otp') out = { masked: '+91 98••••••21', via: 'sms' };
        else if (p === '/api/kyc/check-gstin') out = { valid: true, state: 'Rajasthan' };
        else if (p === '/api/kyc/gst-lookup') out = { ok: true, legalName: 'AABCU TRADERS PVT LTD', gstStatus: 'Active' };
        else if (p === '/api/kyc/send-otp') out = { masked: '+91 98••••••21' };
        else if (p === '/api/kyc/verify-otp') {
          window.__v = (window.__v || 0) + 1;
          if (window.__v === 1) { status = 400; out = { error: 'Incorrect or expired code' }; }   // first attempt always fails
          else out = { ok: true };
        } else if (p === '/api/metalexchange/order') out = { id: 'ME-1001', totalWeightG: 8.5, fineGrams: 7.82, factor: 0.92, purity: '99.50%', status: 'New' };
        else if (p.startsWith('/api/partner/') || p.startsWith('/api/bullion') || p.startsWith('/api/metalexchange')) out = {};
        else { status = 404; out = { error: 'not stubbed: ' + p }; }
        return Promise.resolve(J());
      };
    },
  });

  const { window } = dom;
  const doc = window.document;
  const $ = s => doc.querySelector(s);
  const $$ = s => [...doc.querySelectorAll(s)];
  const apiCalls = p => calls.filter(c => c.p === p).length;
  const pev = (type, opts) => {
    let e;
    try { e = new window.PointerEvent(type, Object.assign({ bubbles: true, cancelable: true, isPrimary: true }, opts)); }
    catch (err) { e = new window.Event(type, { bubbles: true, cancelable: true }); }
    Object.entries(opts || {}).forEach(([k, v]) => { try { e[k] = v; } catch (err) {} });
    return e;
  };
  const type = (el, value) => { el.value = value; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
  const go = async (hash, readyFn, ms = 10000) => { window.location.hash = hash; return until(readyFn, ms); };

  return { dom, window, doc, $, $$, apiCalls, calls, pev, type, go, timers, pageErrors: () => pageErrors };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`;
  console.log('\nSHIVAA v113b behaviour check — serving %s\n', ORIGIN);

  /* ═══ pass 1 · the shopper (anonymous) ═══════════════════════════════════ */
  console.log('· pass 1 — shopper session');
  const S = await session({ origin: ORIGIN });
  const { window, $, $$, apiCalls, pev, type } = S;

  const booted = await until(() => $('#heroCarousel') && $$('.c-slide').length >= 4, 25000);
  ok('the storefront boots and renders the hero carousel', booted, booted ? '' : 'no #heroCarousel after 25s');
  if (!booted) { server.close(); process.exit(1); }
  await until(() => $$('#rateStrip .rscell').length >= 4, 8000);

  /* 1 · carousel */
  ok('carousel renders 4 slides + 4 dots', $$('.c-slide').length === 4 && $$('.c-dot').length === 4,
    `${$$('.c-slide').length} slides / ${$$('.c-dot').length} dots`);
  const car = $('#heroCarousel');
  const timersStart = S.timers.created;
  for (let i = 0; i < 4; i++) {
    car.dispatchEvent(pev('pointerdown', { pointerId: 1 + i, pointerType: 'touch', clientX: 200, clientY: 300 }));
    car.dispatchEvent(pev('pointercancel', { pointerId: 1 + i, pointerType: 'touch', clientX: 200, clientY: 300 }));
  }
  await sleep(80);
  const alive = S.timers.live.size;
  ok('four scroll-cancels leave a single autoplay timer', alive <= 1,
    `${alive} timers alive (created ${S.timers.created - timersStart}, cleared ${S.timers.cleared})`);

  const dotOn = () => $$('.c-dot').findIndex(d => d.classList.contains('on'));
  const beforeSwipe = dotOn();
  car.dispatchEvent(pev('pointerdown', { pointerId: 9, pointerType: 'touch', clientX: 320, clientY: 300 }));
  car.dispatchEvent(pev('pointermove', { pointerId: 9, pointerType: 'touch', clientX: 240, clientY: 302 }));
  car.dispatchEvent(pev('pointerup', { pointerId: 9, pointerType: 'touch', clientX: 200, clientY: 302 }));
  await sleep(120);
  ok('a horizontal swipe advances the deck', dotOn() === (beforeSwipe + 1) % 4,
    `dot ${beforeSwipe} -> ${dotOn()}`);

  const beforeScroll = dotOn();
  car.dispatchEvent(pev('pointerdown', { pointerId: 11, pointerType: 'touch', clientX: 200, clientY: 300 }));
  car.dispatchEvent(pev('pointermove', { pointerId: 11, pointerType: 'touch', clientX: 206, clientY: 360 }));
  car.dispatchEvent(pev('pointerup', { pointerId: 11, pointerType: 'touch', clientX: 210, clientY: 420 }));
  await sleep(120);
  ok('a vertical scroll does not flip the slide', dotOn() === beforeScroll, `dot ${beforeScroll} -> ${dotOn()}`);

  /* 2 · the rate strip */
  const cells = $$('#rateStrip .rscell');
  ok('rate strip shows 6 cells (3 Jaipur + 2 RTGS + clock)', cells.length === 6, `${cells.length} cells`);
  const g = $('#rateStrip [data-rsh="rtgsG9999"]'), s = $('#rateStrip [data-rsh="rtgsS9999"]');
  ok('RTGS gold cell shows the desk mid in ₹/10 g', g && g.textContent.trim() === '14,49,830',
    g ? `"${g.textContent.trim()}"` : 'cell missing');
  ok('RTGS silver cell shows the desk mid in ₹/kg', s && s.textContent.trim() === '2,43,910',
    s ? `"${s.textContent.trim()}"` : 'cell missing');
  const flat = $$('#rateStrip .chg.flat').length;
  ok('a flat move reads "steady" on every cell, never "▲ 0"',
    flat >= 3 && !/▲ 0|▼ -/.test($('#rateStrip').textContent),
    `${flat} flat cells, text="${$('#rateStrip').textContent.slice(0, 120)}"`);

  /* 3 · quick view on a cold cache */
  const hashBefore = window.location.hash;
  const beforeQv = apiCalls('/api/products/PGS9999');
  await window.Shivaa.quickView('PGS9999');            // deliberately not in the catalogue
  const grabbed = await until(() => $('#qvGrab'), 4000);
  ok('quick view opens the sheet for an uncached piece', grabbed && apiCalls('/api/products/PGS9999') > beforeQv,
    grabbed ? '' : 'no sheet appeared');
  ok('quick view never navigates away', window.location.hash === hashBefore && !!$('#qvPhoto'),
    `hash ${hashBefore} -> ${window.location.hash}`);
  if (window.Shivaa.closeModal) window.Shivaa.closeModal();

  /* 5 · KYC zero-discomfort */
  await S.go('#/b2b', () => $('#kyGstin'));
  const kycUp = !!$('#kyGstin');
  ok('the GST KYC form renders', kycUp);
  if (kycUp) {
    const GSTIN = '08AABCU9603R1ZM';
    const beforeG = apiCalls('/api/kyc/check-gstin');
    type($('#kyGstin'), GSTIN); await sleep(430);
    type($('#kyGstin'), GSTIN); await sleep(430);
    ok('the GSTIN self-checks once for a value', apiCalls('/api/kyc/check-gstin') - beforeG === 1,
      `${apiCalls('/api/kyc/check-gstin') - beforeG} lookups`);

    const beforeSend = apiCalls('/api/kyc/send-otp');
    type($('#kyPhone'), '9876543210'); await sleep(430);
    type($('#kyPhone'), '9876543210'); await sleep(430);
    ok('the OTP self-sends once for a number', apiCalls('/api/kyc/send-otp') - beforeSend === 1,
      `${apiCalls('/api/kyc/send-otp') - beforeSend} sends`);

    const beforeV = apiCalls('/api/kyc/verify-otp');
    type($('#kyOtp'), '1234'); await sleep(430);
    const first = apiCalls('/api/kyc/verify-otp') - beforeV;
    ok('a rejected code is reported and the field cleared for a retry',
      first === 1 && $('#kyOtp').value === '' && ($('#otpStat') || {}).className === 'kyc-status bad',
      `attempts ${first}, field "${$('#kyOtp').value}", status "${($('#otpStat') || {}).className}"`);
    type($('#kyOtp'), '1234'); await sleep(430);
    ok('the same digits can be re-submitted after a failure', apiCalls('/api/kyc/verify-otp') - beforeV === 2,
      `${apiCalls('/api/kyc/verify-otp') - beforeV} attempts`);
    ok('the mobile ends up verified', window._kyc.otp === true);
  }

  /* 6 · login auto-send */
  window.Shivaa.openLogin();
  const loginUp = await until(() => $('#shvPhoneIn'), 6000);
  ok('the login sheet opens', loginUp);
  if (loginUp) {
    const beforeA = apiCalls('/api/auth/send-otp');
    const inp = $('#shvPhoneIn');
    type(inp, '9812345670');                       // the 10th digit schedules the auto-send
    const form = $('#shvStartForm');
    if (form) form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    type(inp, '9812345670');                       // and a paste/retype in the same tick
    await sleep(700);
    ok('the 10th digit sends exactly one OTP even if Send is tapped at once',
      apiCalls('/api/auth/send-otp') - beforeA === 1,
      `${apiCalls('/api/auth/send-otp') - beforeA} sends`);
    ok('the sheet steps forward to the code pane', !!$('#shvOtp'));
    if (window.Shivaa.closeModal) window.Shivaa.closeModal();
  }

  /* 7 · broken-image net */
  const img = S.doc.createElement('img');
  img.src = '/images/categories/definitely-missing.jpg';
  S.doc.body.appendChild(img);
  img.dispatchEvent(new window.Event('error'));
  await sleep(80);
  ok('a missing image degrades to the house monogram', /^data:image\/svg\+xml/.test(img.getAttribute('src') || ''),
    img.getAttribute('src'));

  const pass1Errors = S.pageErrors();
  ok('no unhandled page errors in the shopper session', pass1Errors.length === 0, pass1Errors.join(' | '));

  /* ═══ pass 2 · the jeweller (partner) ════════════════════════════════════ */
  console.log('\n· pass 2 — partner session');
  const P = await session({ origin: ORIGIN, partner: true });
  const pw = P.window;
  const pBoot = await until(() => pw.document.querySelector('#view') && pw.document.querySelector('#view').children.length > 0, 25000);
  ok('the partner session boots', pBoot);
  const deskUp = await P.go('#/catalogues', () => P.$('#dsGrid'), 12000);
  ok('the design desk renders for a verified partner', deskUp);
  const cardsUp = await until(() => P.$$('.ds-card').length > 0, 8000);
  ok('the desk lists the catalogue as selectable designs', cardsUp, `${P.$$('.ds-card').length} cards`);

  if (cardsUp) {
    /* the filter bar is wired in the route's requestAnimationFrame pass —
       wait for the handler instead of guessing a delay */
    await until(() => P.$('#dsfCat') && typeof P.$('#dsfCat').oninput === 'function', 5000);
    const firstCard = P.$('.ds-card');
    const id = firstCard.id.replace('ds-', '');
    pw.ShivaaDS.qty(id, 2);
    const saved = JSON.parse(pw.localStorage.getItem('shv_ds_sel') || '{}');
    ok('a selection is written to storage', saved[id] === 2, JSON.stringify(saved));

    const cat = firstCard.dataset.cat;
    const sel = P.$('#dsfCat');
    if (sel) { P.type(sel, cat); pw.ShivaaDS.updateBar(); }
    const filtersSaved = JSON.parse(pw.localStorage.getItem('shv_ds_filters') || '{}');
    ok('filters are written to storage', !sel || filtersSaved.dsfCat === cat, JSON.stringify(filtersSaved));

    await P.go('#/', () => P.$('#heroCarousel'), 12000);
    const back = await P.go('#/catalogues', () => P.$('#dsGrid'), 12000);
    await until(() => P.$('.ds-card'), 8000);
    const barRestored = await until(() => /^[1-9]\d* design/.test((P.$('#dsCount') || {}).textContent || ''), 5000);
    await sleep(150);
    const card = pw.document.getElementById('ds-' + id);
    ok('the selection survives leaving the page and coming back',
      back && card && card.classList.contains('on') && pw._sel[id] === 2,
      card ? `classes "${card.className}"` : 'card not found after returning');
    const bar = P.$('#dsCount') ? P.$('#dsCount').textContent.trim() : '';
    ok('the summary bar reconciles with the restored bill', barRestored && /^[1-9]\d* design/.test(bar), `"${bar}"`);
    if (sel) {
      const filterBack = await until(() => P.$('#dsfCat').value === cat, 5000);
      ok('the filter choice is restored too', filterBack, `"${P.$('#dsfCat').value}" vs "${cat}"`);
    }
  }

  const pass2Errors = P.pageErrors();
  ok('no unhandled page errors in the partner session', pass2Errors.length === 0, pass2Errors.join(' | '));
  pw.close(); window.close();      // both at the very end — closing early makes jsdom
                                   // keep firing the dead window's MutationObservers

  /* ═══ summary ═══════════════════════════════════════════════════════════ */
  const failed = results.filter(r => !r.pass);
  console.log('\n%d/%d checks passed%s', results.length - failed.length, results.length,
    failed.length ? '\nFAILED: ' + failed.map(f => f.name).join(' | ') : '  ✦');
  server.close();
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('harness error:', e); server.close(); process.exit(2); });
