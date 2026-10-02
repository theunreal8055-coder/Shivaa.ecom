'use strict';
/* Focused v187 DOM behavior probes. All API responses and catalog records are
   synthetic; this harness never reads cms/data/db.json or contacts the live
   site, payment gateway, CRM/ERP, or SMS provider. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { JSDOM, VirtualConsole } = require('jsdom');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const RATES = { t: '2026-10-01T12:00:00+05:30', source: 'Synthetic QA rates', gold24: 15000, gold22: 14000, gold18: 11000, silver: 200,
  jaipur: { gold24: 15000, gold22: 14000, gold18: 11000, silver: 200 }, history: [], premium: { gold22: 398, gold24: 398, silver: 3 }, nextUpdateIn: 60 };
const PRODUCT = { id: 'qa-v187-ring', sku: 'QA-V187-001', name: 'Synthetic v187 QA Ring', category: 'rings', metal: 'Gold', purity: '22K',
  desc: 'Synthetic fixture only.', weightG: 1, lessWeightG: 0, wastagePct: 0, mcScheme: 'fixed', mcValue: 0, stoneValue: 0, stoneDesc: '',
  images: ['/images/logo.png'], video: '', tags: ['qa'], stock: 3, sizes: ['12'], active: true, rating: 5, reviews: 0, createdAt: '2026-10-01T12:00:00+05:30' };
const HTML = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8')
  .replace(/<link\b[^>]*>/gi, '')
  .replace(/<script\b[^>]*src=["'][^"']*["'][^>]*>\s*<\/script>/gi, tag => /\/js\/app\.js\?v=187/.test(tag) ? tag : '');
const mime = { '.html': 'text/html', '.js': 'text/javascript' };
const checks = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const pass = (id, name, condition, detail = '') => {
  checks.push(!!condition);
  console.log(`${condition ? 'PASS' : 'FAIL'} ${id} ${name}${condition ? '' : `: ${detail}`}`);
};
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status,
  headers: { get: () => 'application/json' }, json: async () => body, text: async () => JSON.stringify(body) });

(async () => {
  let serverWishlist = [];
  let failWishlistWrite = false;
  let wishlistWriteDelay = 0;
  let nextProductList = null;
  const calls = [];
  const server = http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
    catch (_) { res.writeHead(400); return res.end(); }
    if (pathname === '/') pathname = '/index.html';
    const file = path.resolve(CMS, '.' + pathname);
    if (!file.startsWith(path.resolve(CMS) + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
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
      window.fetch = async (input, options = {}) => {
        const url = new URL(String(input), origin);
        const method = String(options.method || 'GET').toUpperCase();
        calls.push({ path: url.pathname, method, body: options.body });
        if (url.pathname === '/api/settings') return response({ guestCheckout: true, shippingFee: 250, freeShipAbove: 50000 });
        if (url.pathname === '/api/making-charges') return response({ table: [] });
        if (url.pathname === '/api/catalogs') return response({ catalogs: [] });
        if (url.pathname === '/api/pages') return response({ pages: [] });
        if (url.pathname === '/api/products') {
          const items = nextProductList === null ? [PRODUCT] : nextProductList;
          nextProductList = null;
          return response({ products: items, rates: RATES });
        }
        if (url.pathname === '/api/rates') return response(RATES);
        if (url.pathname === '/api/products/' + PRODUCT.id) return response({ product: PRODUCT, rates: RATES, similar: [], reviews: [] });
        if (url.pathname === '/api/wishlist' && method === 'GET') return response({ wishlist: [...serverWishlist], items: [] });
        if (url.pathname === '/api/wishlist' && method === 'POST') {
          if (wishlistWriteDelay) await sleep(wishlistWriteDelay);
          if (failWishlistWrite) return response({ error: 'Synthetic wishlist write failure' }, 500);
          const body = JSON.parse(options.body || '{}');
          serverWishlist = body.add ? [...new Set([...serverWishlist, body.id])] : serverWishlist.filter(id => id !== body.id);
          return response({ wishlist: [...serverWishlist] });
        }
        if (url.pathname === '/api/auth/me') return response({ user: null });
        return response({});
      };
    },
  });
  const { window } = dom;
  try {
    const started = Date.now();
    while (Date.now() - started < 15000 && !(window.Shivaa && window.Shivaa.state && window.Shivaa.state.productsCache.length)) await sleep(25);
    pass('V187-D00', 'app boots with synthetic products and no repository data', !!(window.Shivaa && window.Shivaa.state && window.Shivaa.state.productsCache.length));
    if (!window.Shivaa || !window.Shivaa.state) throw new Error('App boot did not complete');
    const view = window.document.getElementById('view');

    await window.Shivaa.routes.shop(view, new window.URLSearchParams());
    const productLink = view.querySelector('.p-card a[href^="#/product/"]');
    productLink.dispatchEvent(new window.Event('pointerdown', { bubbles: true }));
    await sleep(25);
    const firstDetailCalls = calls.filter(call => call.path === '/api/products/' + PRODUCT.id && call.method === 'GET').length;
    pass('V187-D01', 'pointer contact on a product card starts one detail prefetch', firstDetailCalls === 1, `calls=${firstDetailCalls}`);
    await window.Shivaa.routes.product(view, new window.URLSearchParams(), PRODUCT.id);
    const secondDetailCalls = calls.filter(call => call.path === '/api/products/' + PRODUCT.id && call.method === 'GET').length;
    pass('V187-D02', 'product route reuses the prefetched detail response', secondDetailCalls === 1, `calls=${secondDetailCalls}`);

    let wishButton = view.querySelector(`.pc-wish[data-pid="${PRODUCT.id}"]`);
    await window.Shivaa.toggleWish(PRODUCT.id);
    pass('V187-D03', 'guest wishlist updates immediately, persists locally, and announces the change',
      window.Shivaa.state.localWish.includes(PRODUCT.id) && wishButton.classList.contains('on') && wishButton.getAttribute('aria-pressed') === 'true' &&
      window.document.querySelector('#toastWrap .toast')?.textContent.includes('Saved to wishlist'));
    await window.Shivaa.toggleWish(PRODUCT.id);

    window.Shivaa.state.user = { id: 'qa-v187-member', role: 'customer' };
    window.Shivaa.state.serverWish = [];
    window.Shivaa.state.serverWishLoaded = true;
    window.Shivaa.state.localWish = [];
    wishButton.classList.remove('on'); wishButton.setAttribute('aria-pressed', 'false');
    failWishlistWrite = true;
    const optimistic = window.Shivaa.toggleWish(PRODUCT.id);
    pass('V187-D04', 'signed-in wishlist paints optimistically before the server response',
      wishButton.classList.contains('on') && wishButton.getAttribute('aria-pressed') === 'true' && wishButton.getAttribute('aria-busy') === 'true');
    await optimistic;
    pass('V187-D05', 'a confirmed server rejection rolls the optimistic wishlist state back accessibly',
      !wishButton.classList.contains('on') && wishButton.getAttribute('aria-pressed') === 'false' && !wishButton.hasAttribute('aria-busy') &&
      !window.Shivaa.state.serverWish.includes(PRODUCT.id));

    failWishlistWrite = false;
    const successfulWish = window.Shivaa.toggleWish(PRODUCT.id);
    pass('V187-D06', 'successful wishlist mutation remains visible while syncing', wishButton.classList.contains('on'));
    await successfulWish;
    pass('V187-D07', 'successful wishlist mutation is committed in the synthetic server and client state',
      serverWishlist.includes(PRODUCT.id) && window.Shivaa.state.serverWish.includes(PRODUCT.id) && wishButton.getAttribute('aria-pressed') === 'true');

    // Two taps during an in-flight write serialize add then remove rather than
    // racing two toggles against a stale DOM class/server response.
    serverWishlist = [];
    window.Shivaa.state.serverWish = [];
    wishButton.classList.remove('on'); wishButton.setAttribute('aria-pressed', 'false');
    wishlistWriteDelay = 12;
    const rapidA = window.Shivaa.toggleWish(PRODUCT.id);
    await sleep(1);
    const rapidB = window.Shivaa.toggleWish(PRODUCT.id);
    await Promise.all([rapidA, rapidB]);
    wishlistWriteDelay = 0;
    pass('V187-D08', 'rapid wishlist taps settle to the final intent without request races',
      !serverWishlist.includes(PRODUCT.id) && !window.Shivaa.state.serverWish.includes(PRODUCT.id) && wishButton.getAttribute('aria-pressed') === 'false');

    window.Shivaa.state.user = null;
    window.Shivaa.state.localWish = [];
    window.Shivaa.state.serverWish = [];
    await window.Shivaa.routes.shop(view, new window.URLSearchParams());
    const cartBefore = window.Shivaa.state.cart.length;
    window.Shivaa.addToCart(PRODUCT.id, 1, null, null, { silent: true });
    window.Shivaa.addToCart(PRODUCT.id, 1);
    const addedToast = window.document.querySelector('#toastWrap')?.lastElementChild?.textContent || '';
    const addedLine = window.Shivaa.state.cart.find(line => line.id === PRODUCT.id);
    pass('V187-D09', 'cart count updates immediately and a normal add shows a toast',
      !!addedLine && addedLine.qty === 2 && addedToast.includes('Added Synthetic v187 QA Ring to your bag'),
      `line=${JSON.stringify(addedLine)}; toast=${addedToast}`);
    window.Shivaa.cartRemove(PRODUCT.id, '');
    pass('V187-D10', 'cart removal shows a non-blocking confirmation',
      !window.Shivaa.state.cart.some(line => line.id === PRODUCT.id) &&
      window.document.querySelector('#toastWrap')?.lastElementChild?.textContent.includes('Removed from your bag'));
    if (cartBefore) window.Shivaa.state.cart = [];

    const changed = { ...PRODUCT, name: 'Synthetic refreshed QA Ring' };
    nextProductList = [changed];
    view.querySelector('#shopRefresh').click();
    const refreshStart = Date.now();
    while (Date.now() - refreshStart < 5000 && view.querySelector('#shopRefresh')?.disabled) await sleep(20);
    await sleep(30);
    pass('V187-D11', 'keyboard/button catalog refresh adopts a valid fresh response',
      window.Shivaa.state.productsCache.some(p => p.id === changed.id && p.name === changed.name));

    const previousNames = window.Shivaa.state.productsCache.filter(p => !p.isCampaignStud).map(p => p.name).join('|');
    nextProductList = [];
    view.querySelector('#shopRefresh').click();
    await sleep(40);
    pass('V187-D12', 'an empty refresh response does not erase the working catalog',
      window.Shivaa.state.productsCache.filter(p => !p.isCampaignStud).map(p => p.name).join('|') === previousNames);

    const beforeGestureRefresh = calls.filter(call => call.path === '/api/products' && call.method === 'GET').length;
    nextProductList = [changed];
    const grid = view.querySelector('#shopGrid');
    const touch = (type, x, y) => {
      const event = new window.Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] });
      return event;
    };
    grid.dispatchEvent(touch('touchstart', 20, 10));
    const move = touch('touchmove', 21, 100);
    grid.dispatchEvent(move);
    const status = view.querySelector('#shopPullStatus');
    const gestureShown = status.classList.contains('is-visible') && move.defaultPrevented;
    grid.dispatchEvent(touch('touchend', 21, 100));
    const gestureStart = Date.now();
    while (Date.now() - gestureStart < 5000 && view.querySelector('#shopRefresh')?.disabled) await sleep(20);
    await sleep(30);
    const afterGestureRefresh = calls.filter(call => call.path === '/api/products' && call.method === 'GET').length;
    pass('V187-D13', 'downward pull at catalog top exposes branded feedback and refreshes',
      gestureShown && afterGestureRefresh === beforeGestureRefresh + 1, `shown=${gestureShown}; requests=${afterGestureRefresh - beforeGestureRefresh}`);

    pass('V187-D14', 'the controlled run has no uncaught runtime errors', runtimeErrors.length === 0, runtimeErrors.slice(0, 4).join(' | '));
  } finally {
    dom.window.close();
    server.close();
  }
  const passed = checks.filter(Boolean).length, failed = checks.length - passed;
  console.log(`\nv187 focused DOM probes: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
