/* Scratch probe (sandbox only, never deployed) — reproduce the owner's
   18-Sep-2026 reports against the real shell:
     1 · bag drawer "Checkout ✦" does not reach the payment page
     2 · a category page still shows the 17 category photos
   Run: node tools/mega/smoke/probe-owner-issues.js
*/
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
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

let USER = false;
function boot({ startHash = '', innerWidth = 420, strip = /a^/ } = {}) {
  const backs = { n: 0 }; const errors = [];
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8').replace(strip, '');
  const dom = new JSDOM(html, {
    url: `http://127.0.0.1:${server.address().port}/${startHash}`,
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
    beforeParse(w) {
      w.innerWidth = innerWidth; w.innerHeight = 900;
      w.matchMedia = q => ({ matches: /max-width:\s*[6-8]\d\dpx/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {};
      if (USER) try { w.localStorage.setItem('shv_token', JSON.stringify('tok_probe')); } catch (e) {}
      Object.defineProperty(w.navigator, 'vibrate', { value: () => true, configurable: true });
      Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
      w.HTMLMediaElement.prototype.play = () => Promise.resolve();
      w.HTMLMediaElement.prototype.pause = () => {};
      w.addEventListener('error', ev => { if (ev.target && ev.target.tagName === 'IMG') return; errors.push(String(ev.message || ev.error || 'error')); });
      const rb = w.history.back.bind(w.history);
      Object.defineProperty(w.history, 'back', { configurable: true, writable: true, value: function () { backs.n++; return rb(); } });
      w.fetch = (input) => {
        const p = String(input).split('?')[0];
        let status = 200, out = {};
        if (p.endsWith('/api/rates')) out = RATES_STUB;
        else if (p.endsWith('/api/settings')) out = { settings: DB.settings };
        else if (p.endsWith('/api/making-charges')) out = { table: [] };
        else if (p.endsWith('/api/catalogs')) out = { catalogs: [] };
        else if (p.endsWith('/api/auth/me')) out = { user: USER ? { id: 'u1', name: 'Aarti Choudhary', email: 'aarti@example.com', phone: '9876543210',
            loyaltyPoints: 0, addresses: [
              { id: 'ad1', label: 'Home', name: 'Aarti Choudhary', phone: '9876543210', line: '12 Kisan Nagar', city: 'Jayal', state: 'Rajasthan', pincode: '341023', isDefault: true },
              { id: 'ad2', label: 'Work', name: 'Aarti C.', phone: '9812345678', line: 'Shop 4, MG Road', city: 'Nagaur', state: 'Rajasthan', pincode: '341001' } ] } : null };
        else if (p.endsWith('/api/addresses')) out = { ok: true, addresses: [] };
        else if (p.endsWith('/api/products')) out = { products: DB.products };
        else if (p.includes('/api/products/')) out = { product: DB.products[0], similar: [], reviews: [], rates: DB.rates.last };
        else if (p.endsWith('/api/pay/config')) out = { mode: 'demo', prepaidPct: 2, lockMinutes: 20 };
        else if (p.endsWith('/api/pages')) out = { pages: [] };
        else { status = 404; out = { error: 'not stubbed: ' + p }; }
        const J = () => ({ ok: status < 300, status, json: () => Promise.resolve(out), text: () => Promise.resolve(JSON.stringify(out)) });
        return Promise.resolve(J());
      };
    },
  });
  const w = dom.window, doc = w.document;
  return { dom, w, doc, backs, errors, $: s => doc.querySelector(s), $$: s => [...doc.querySelectorAll(s)],
    click: (el, o) => el.dispatchEvent(new w.MouseEvent('click', Object.assign({ bubbles: true, cancelable: true }, o))),
    booted: () => until(() => doc.querySelector('#heroCarousel') && doc.querySelectorAll('.c-slide').length >= 2, 25000) };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  /* ── 1 · the bag drawer's Checkout link ─────────────────────────────── */
  console.log('\n════ 1 · bag drawer → Checkout ════');
  const A = boot({ startHash: '#/' });
  if (!(await A.booted())) console.log('  ! boot failed');
  await sleep(400);
  const pid = DB.products[0].id;
  A.w.eval(`window.Shivaa.addToCart(${JSON.stringify(pid)}, 1, { silent: false })`);
  await until(() => A.$('#cartDrawer') && A.$('#cartDrawer').classList.contains('open'), 8000);
  console.log('  drawer open:', A.$('#cartDrawer').classList.contains('open'),
    '| lines:', A.$$('.mc-line').length,
    '| hash before tap:', JSON.stringify(A.w.location.hash));
  const co = A.$('.mc-foot a[href="#/checkout"]');
  console.log('  checkout link found:', !!co, '| defaultPrevented target:', co && co.getAttribute('href'));
  A.backs.n = 0;
  A.click(co);
  await sleep(1200);
  console.log('  hash after tap  :', JSON.stringify(A.w.location.hash));
  console.log('  history.back()  :', A.backs.n);
  console.log('  drawer still open:', A.$('#cartDrawer').classList.contains('open'));
  console.log('  body[data-page] :', A.doc.body.dataset.page, '| view starts:', (A.$('#view').innerHTML.slice(0, 90) || '').replace(/\s+/g, ' '));
  console.log('  login sheet open:', !!(A.$('#shvAuthWrap') && !A.$('#shvAuthWrap').hidden) ||
    !!(A.$('#modalOverlay') && A.$('#modalOverlay').classList.contains('open')),
    '| sheet says:', (A.$('#shvHeadSub') && A.$('#shvHeadSub').textContent) || '-',
    '| loginNext:', A.w._loginNext);
  console.log('  page errors     :', A.errors.length ? A.errors.slice(0, 3) : 'none');
  try { A.w.close(); } catch (_) {}

  /* ── 1b · same tap as a LOGGED-IN shopper (must reach the payment form) ── */
  console.log('\n════ 1b · bag drawer → Checkout, logged in ════');
  USER = true;
  const L = boot({ startHash: '#/' });
  if (!(await L.booted())) console.log('  ! boot failed');
  await sleep(400);
  L.w.eval(`window.Shivaa.addToCart(${JSON.stringify(pid)}, 1, { silent: false })`);
  await until(() => L.$('#cartDrawer') && L.$('#cartDrawer').classList.contains('open'), 8000);
  L.backs.n = 0;
  L.click(L.$('.mc-foot a[href="#/checkout"]'));
  const gotForm = await until(() => L.$('#addrForm'), 12000);
  await sleep(500);
  console.log('  #addrForm painted:', gotForm);
  console.log('  history.back()   :', L.backs.n);
  console.log('  prefilled line   :', JSON.stringify(L.$('#adLine') && L.$('#adLine').value));
  console.log('  prefilled city   :', JSON.stringify(L.$('#adCity') && L.$('#adCity').value));
  console.log('  prefilled pincode:', JSON.stringify(L.$('#adPin') && L.$('#adPin').value));
  console.log('  saved-addr chips :', L.$$('#adrSw .adr-chip[data-adr]').length);
  const bar = L.$('#coBar');
  console.log('  place-order bar  :', bar ? bar.className : 'MISSING');
  console.log('  bar has mcta-inline:', !!(bar && bar.classList.contains('mcta-inline')));
  console.log('  page errors      :', L.errors.length ? L.errors.slice(0, 3) : 'none');
  try { L.w.close(); } catch (_) {}
  USER = false;

  /* ── 2 · what a category page actually renders ─────────────────────── */
  for (const hash of ['#/shop?category=rings', '#/shop?category=earrings', '#/shop']) {
    const B = boot({ startHash: hash });
    await until(() => B.doc.body.dataset.page === 'shop' && B.$('#shopGrid'), 20000);
    await sleep(900);
    const tiles = B.$$('.shop-catbar .cb-item');
    const imgs = B.$$('.shop-catbar .cb-item img');
    console.log(`\n════ 2 · ${hash} ════`);
    console.log('  shop-catbar tiles:', tiles.length, '| tile <img> tags:', imgs.length,
      '| first src:', imgs[0] ? imgs[0].getAttribute('src') : '-');
    console.log('  product cards    :', B.$$('#shopGrid .p-card').length);
    console.log('  resCount         :', (B.$('#resCount') && B.$('#resCount').textContent.trim()) || '-');
    console.log('  empty state      :', B.$('#shopGrid .empty') ? B.$('#shopGrid .empty').textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : 'none');
    console.log('  grid html len    :', B.$('#shopGrid').innerHTML.length);
    try { B.w.close(); } catch (_) {}
  }

  try { A.w.close(); } catch (_) {}
  server.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
