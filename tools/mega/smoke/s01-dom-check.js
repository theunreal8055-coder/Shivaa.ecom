'use strict';
/* S01 DOM probes run the current working-tree app.js in jsdom with a
   loopback-only static shell, synthetic QA fixtures, and fake API responses.
   No repository database, customer data, internet, production API, or provider
   credentials are read or contacted by the browser-facing code. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = {
  settings: { guestCheckout: true, payProvider: 'demo', allowDemoPayments: false,
    shippingFee: 250, freeShipAbove: 50000, rateLockMinutes: 20 },
  rates: { last: { t: '2026-10-01T12:00:00+05:30', source: 'QA synthetic fixture',
    gold24: 15000, gold22: 14000, gold18: 11000, silver: 200 }, history: [],
    override: { gold24: 15000, gold22: 14000, gold18: 11000, silver: 200 } },
  products: [{ id: 'qa-synthetic-product', sku: 'QA-SYNTH-001',
    name: 'Synthetic QA Gold Ring', category: 'rings', metal: 'Gold', purity: '22K',
    desc: 'Synthetic QA-only product.', weightG: 1, lessWeightG: 0, wastagePct: 0,
    mcScheme: 'fixed', mcValue: 0, stoneValue: 0, stoneDesc: '',
    images: ['/images/logo.png'], video: '', tags: ['qa'], stock: 3,
    active: true, rating: 5, reviews: 0 }],
};
const HTML = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8')
  .replace(/<script[^>]+src=["']https:\/\/sdk\.cashfree\.com\/[^"']+["'][^>]*><\/script>/gi, '');
const rateBase = DB.rates && DB.rates.last || {};
const RATES = { ...rateBase, jaipur: rateBase, premium: { gold22: 398, gold24: 398, silver: 3 }, history: [], rtgs: { rows: {} }, nextUpdateIn: 60 };
const PAYLOAD = '"><svg/onload=x=1>';
const MEDIA_PAYLOAD = '/"><svg/onload=x=1>';
const PRODUCT = {
  ...(DB.products || [])[0],
  id: 'qa-s01-xss', name: PAYLOAD, desc: PAYLOAD,
  category: 'rings' + PAYLOAD, metal: PAYLOAD, purity: PAYLOAD, sku: PAYLOAD,
  tags: [PAYLOAD], images: [MEDIA_PAYLOAD], video: '',
  weightG: 1, lessWeightG: 0, wastagePct: 0, mcScheme: 'fixed', mcValue: 0,
  stoneValue: 0, stoneDesc: '', tags: [], active: true, rating: 5, reviews: 0,
};
const products = [PRODUCT];
const SERVICE_REQUEST = {
  id: 'qa-s01-service', type: 'care-repair', name: PAYLOAD, phone: '9876543210',
  details: PAYLOAD, budget: PAYLOAD, status: 'new', history: [{ s: 'Booked' }],
  createdAt: '2026-10-01T12:00:00+05:30',
};
const CUSTOM_PAGE = { title: PAYLOAD, slug: 'qa-s01-xss', body: PAYLOAD, published: true, updatedAt: '2026-10-01T12:00:00+05:30' };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const results = [];
function check(id, name, pass, detail = '') {
  results.push(!!pass);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${name}${pass ? '' : `: ${detail}`}`);
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: () => 'application/json' },
  json: async () => body, text: async () => JSON.stringify(body),
});

(async () => {
  const server = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch (_) { res.writeHead(400); return res.end(); }
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(CMS, '.' + pathname);
    if (!file.startsWith(path.resolve(CMS) + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, body) => {
      if (error) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const runtimeErrors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => {
    const message = String(error && error.message || error);
    if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|navigation|window\.scroll)/.test(message) && !/Could not load (link|script|resource)/.test(message)) runtimeErrors.push(message);
  });
  const dom = new JSDOM(HTML, {
    url: origin + '/#/', runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.matchMedia = query => ({ matches: /reduce/.test(query), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.ResizeObserver = class { observe() {} disconnect() {} };
      window.scrollTo = () => {};
      window.__s01Contact = null;
      window.fetch = async (input, options = {}) => {
        const url = new URL(String(input), origin);
        const route = url.pathname;
        if (route === '/api/settings') return jsonResponse({ ...DB.settings, guestCheckout: true });
        if (route === '/api/products') return jsonResponse({ products });
        if (route.startsWith('/api/products/')) return jsonResponse({ product: PRODUCT, rates: RATES, similar: [], reviews: [{ userName: PAYLOAD, text: PAYLOAD, reply: PAYLOAD, rating: 5, createdAt: '2026-10-01T12:00:00+05:30', photos: [MEDIA_PAYLOAD] }] });
        if (route === '/api/rates' || route === '/api/rates/live') return jsonResponse(RATES);
        if (route === '/api/making-charges') return jsonResponse({ table: [] });
        if (route === '/api/catalogs') return jsonResponse({ catalogs: [] });
        if (route === '/api/pages') return url.searchParams.has('slug') ? jsonResponse(CUSTOM_PAGE) : jsonResponse({ pages: [] });
        if (route === '/api/wishlist') return jsonResponse({ wishlist: [], items: [] });
        if (route === '/api/services/mine') return jsonResponse({ requests: [SERVICE_REQUEST] });
        if (route === '/api/contact') { window.__s01Contact = JSON.parse(options.body || '{}'); return jsonResponse({ ok: true }); }
        return jsonResponse({});
      };
    },
  });
  const { window } = dom;
  const started = Date.now();
  while (Date.now() - started < 15000 && !(window.Shivaa && window.Shivaa.state && window.Shivaa.state.productsCache.length)) await sleep(50);
  check('S01-D00', 'working-tree app shell booted with controlled API fixtures', !!(window.Shivaa && window.Shivaa.state && window.Shivaa.state.productsCache.length));
  if (!window.Shivaa || !window.Shivaa.state || !window.Shivaa.routes) {
    dom.window.close(); server.close(); process.exit(1);
  }
  const view = window.document.getElementById('view');
  window.Shivaa.state.productsCache = products;
  window.Shivaa.state.rates = RATES;
  window.x = 0;

  // URL/search reflection: the query is supplied both as a shop URL parameter
  // and to the live suggestion renderer; a markup payload must remain text.
  const reflected = '<img src=x onerror=x=1>';
  await window.Shivaa.routes.shop(view, new window.URLSearchParams('q=' + encodeURIComponent(reflected)));
  const shopMarkup = view.innerHTML;
  check('S01-D01', 'reflected markup in shop URL query remains text', !view.querySelector('[onerror="x=1"],[onload="x=1"]'), shopMarkup.slice(0, 180));
  for (const [id, query] of [
    ['S01-D01A', 'category=' + encodeURIComponent('rings' + PAYLOAD)],
    ['S01-D01B', 'tag=' + encodeURIComponent(PAYLOAD)],
    ['S01-D01C', 'max=' + encodeURIComponent(PAYLOAD)],
    ['S01-D01D', 'metal=' + encodeURIComponent(PAYLOAD)],
    ['S01-D01E', 'purity=' + encodeURIComponent(PAYLOAD)],
    ['S01-D01F', 'min=' + encodeURIComponent(PAYLOAD)],
    ['S01-D01G', 'sort=' + encodeURIComponent(PAYLOAD)],
  ]) {
    await window.Shivaa.routes.shop(view, new window.URLSearchParams(query));
    check(id, 'reflected markup in a shop filter parameter remains inert', !view.querySelector('[onerror="x=1"],[onload="x=1"]'));
  }
  window.localStorage.setItem('shv_recentq', JSON.stringify([PAYLOAD]));
  window.document.getElementById('searchBtn')?.click();
  const recentSugg = window.document.getElementById('searchSugg');
  check('S01-D02A', 'markup in browser-stored recent search is rendered as text',
    !recentSugg || !recentSugg.querySelector('[onerror="x=1"],[onload="x=1"]'));
  const searchInput = window.document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = reflected;
    searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    await sleep(160);
  }
  const sugg = window.document.getElementById('searchSugg');
  check('S01-D02', 'reflected markup in live search suggestions remains text', !sugg || !sugg.querySelector('[onerror="x=1"],[onload="x=1"]'), sugg && sugg.innerHTML.slice(0, 160));

  // Treat the deliberately poisoned legacy product object as stored/untrusted
  // data. Every render surface must encode it before inserting HTML.
  await window.Shivaa.routes.shop(view, new window.URLSearchParams());
  const shopPayloadSvg = view.querySelector('#filterDrawer svg[onload]');
  check('S01-D03', 'stored product metal/purity facet values do not create executable SVG', !shopPayloadSvg, shopPayloadSvg && shopPayloadSvg.outerHTML);
  const productCard = view.querySelector('.p-card');
  check('S01-D03A', 'stored product name/tag values remain text in the shop card',
    !!productCard && productCard.textContent.includes(PAYLOAD) && !productCard.querySelector('svg[onload]') && window.x === 0);
  check('S01-D04', 'stored product event-handler sentinel remained unchanged in jsdom shop render', window.x === 0, String(window.x));

  await window.Shivaa.routes.product(view, new window.URLSearchParams(), PRODUCT.id);
  await sleep(25);
  const pdpPayloadSvg = view.querySelector('svg[onload]');
  check('S01-D05', 'stored product name/category/SKU/purity/description values do not create executable SVG on PDP', !pdpPayloadSvg, pdpPayloadSvg && pdpPayloadSvg.outerHTML);
  check('S01-D06', 'stored product event-handler sentinel remained unchanged in jsdom PDP render', window.x === 0, String(window.x));
  const reviewNode = view.querySelector('.rv-item');
  check('S01-D06A', 'stored review name/text/reply remains inert in public PDP review markup',
    !!reviewNode && reviewNode.textContent.includes(PAYLOAD) && !reviewNode.querySelector('[onerror="x=1"],[onload="x=1"]'));
  const pdpText = view.querySelector('.pd-info')?.textContent || '';
  check('S01-D09', 'PDP product name/category/SKU/purity/description payload is inert displayed text', pdpText.includes(PAYLOAD) && !view.querySelector('[onerror="x=1"],[onload="x=1"]'));
  window.Shivaa.state.cart = [{ id: PRODUCT.id, qty: 1, size: null, engraving: '' }];
  window.localStorage.setItem('shv_later', JSON.stringify([{ id: PRODUCT.id, qty: 1, size: null, engraving: '' }]));
  await window.Shivaa.routes.cart(view);
  const cartPayloadSvg = view.querySelector('svg[onload]');
  check('S01-D07', 'stored purity text is inert in the full cart', !cartPayloadSvg, cartPayloadSvg && cartPayloadSvg.outerHTML);
  window.Shivaa.renderMiniCart();
  const miniCart = window.document.getElementById('mcBody');
  const miniPayloadSvg = miniCart && miniCart.querySelector('svg[onload]');
  check('S01-D08', 'stored purity text is inert in the mini-cart', !miniPayloadSvg, miniPayloadSvg && miniPayloadSvg.outerHTML);
  const adminSource = fs.readFileSync(path.join(CMS, 'js/admin.js'), 'utf8');
  check('S01-D10', 'admin product table escapes SKU, category, and purity fields',
    /\$\{esc\(p\.sku \|\| ''\)\} · ★\$\{p\.rating\}/.test(adminSource) &&
    /\$\{esc\(CATS\[p\.category\] \|\| p\.category \|\| ''\)\}/.test(adminSource) &&
    /esc\(p\.purity \|\| ''\)/.test(adminSource));
  check('S01-D11', 'admin ring-weight list and print-tag title escape product SKU',
    /<div class="wt-tx"><b>\$\{esc\(p\.sku \|\| ''\)\}<\/b>/.test(adminSource) &&
    /<title>Tag \$\{esc\(p\.sku \|\| p\.id\)\}<\/title>/.test(adminSource));
  window.Shivaa.state.user = { id: 'qa-s01-member', name: 'QA Member', phone: '9876543210' };
  await window.Shivaa.routes.care(view, new window.URLSearchParams());
  await sleep(60);
  const careToken = view.querySelector('.care-token');
  check('S01-D12', 'stored care-request details render as text in the customer tracker',
    !!careToken && careToken.textContent.includes(PAYLOAD) && !careToken.querySelector('[onerror],[onload]'));
  const leadFields = ["${esc(r.type)}", "${esc(r.name)}", "${esc(r.phone)}", "${esc(r.email || '—')}", "${esc(r.details || '')}", "${esc(r.budget || '—')}"];
  check('S01-D13', 'admin service-request lead fields escape stored user text', leadFields.every(field => adminSource.includes(field)));
  await window.Shivaa.routes.p(view, new window.URLSearchParams(), CUSTOM_PAGE.slug);
  const customPage = view.querySelector('.custom-page');
  check('S01-D14', 'stored custom-page title/body remain text in the public page renderer',
    !!customPage && customPage.textContent.includes(PAYLOAD) && !customPage.querySelector('svg[onload]') && !view.querySelector('svg[onload]'));
  window.Shivaa.state.user = {
    id: 'qa-s01-member', role: 'customer', name: PAYLOAD, email: PAYLOAD, phone: '9876543210',
    createdAt: '2020-01-01T12:00:00+05:30', loyaltyPoints: 120,
    profile: { city: PAYLOAD },
    addresses: [{ id: 'qa-s01-address', label: PAYLOAD, name: PAYLOAD, phone: '9876543210', line: PAYLOAD, city: PAYLOAD, state: PAYLOAD, pincode: '341023', isDefault: true }],
  };
  await window.Shivaa.routes.account(view, new window.URLSearchParams('tab=overview'));
  const accountIdentity = view.querySelector('.ah-id');
  check('S01-D15', 'profile-derived name/email remain inert in the account view and form',
    !!accountIdentity && accountIdentity.textContent.includes(PAYLOAD) && view.querySelector('#pfName')?.value === PAYLOAD && !view.querySelector('svg[onload]'));
  await window.Shivaa.routes.account(view, new window.URLSearchParams('tab=addresses'));
  const addressCard = view.querySelector('.addr-card');
  check('S01-D16', 'stored address fields remain text in the account address book',
    !!addressCard && addressCard.textContent.includes(PAYLOAD) && !addressCard.querySelector('svg[onload]'));
  await window.Shivaa.routes.contact(view);
  const contactForm = view.querySelector('form');
  contactForm.querySelector('[name="name"]').value = PAYLOAD;
  contactForm.querySelector('[name="phone"]').value = '9876543210';
  contactForm.querySelector('[name="email"]').value = 'qa-s01@example.test';
  contactForm.querySelector('[name="message"]').value = PAYLOAD;
  await window.Shivaa.contactForm({ preventDefault() {}, target: contactForm });
  check('S01-D17', 'contact form submits markup-shaped input as JSON and does not reflect it into the page',
    window.__s01Contact?.name === PAYLOAD && window.__s01Contact?.message === PAYLOAD &&
    !view.querySelector('svg[onload]') && contactForm.querySelector('[name="name"]').value === '');
  check('S01-D18', 'controlled DOM run has no uncaught page errors', runtimeErrors.length === 0, runtimeErrors.slice(0, 3).join(' | '));

  dom.window.close(); server.close();
  const pass = results.filter(Boolean).length, fail = results.length - pass;
  console.log(`\nS01 isolated DOM probes: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
