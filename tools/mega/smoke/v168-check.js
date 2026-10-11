/* v168: executed boundary regressions. No live APIs, credentials or repository
   DB writes. Run also against SMOKE_CMS=<old cms> to see the negative control.
   Tests execute byte-exact functions from the application, plus the real worker
   with a deterministic CacheStorage / FetchEvent implementation. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const read = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const app = read('js/app.js'), admin = read('js/admin.js'), sw = read('sw.js');
const checks = [];
const slice = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + a.length); assert(i >= 0 && j > i, 'source anchors: ' + a); return s.slice(i, j); };
async function test(id, name, fn) {
  try { await fn(); checks.push(true); console.log('PASS ' + id + ' ' + name); }
  catch (e) { checks.push(false); console.log('FAIL ' + id + ' ' + name + '\n  ' + e.message); }
}
const tick = () => new Promise(r => setImmediate(r));
function storage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  const localStorage = { getItem: k => values.get(k) ?? null, setItem(k, v) { values.set(k, v); }, removeItem: k => values.delete(k) };
  // The sandbox is a browser-like realm: the application's top-level code attaches
  // document listeners (v186 prefetch), so the fixture must provide a DOM.
  const dom0 = new JSDOM('<body></body>');
  const c = vm.createContext({ localStorage, document: dom0.window.document, window: {}, console });
  vm.runInContext(slice(app, 'const mem =', 'const token =') + slice(app, 'const state =', '/* v57: every category face'), c);
  vm.runInContext(slice(app, 'const getLater =', 'window.Shivaa.cartSaveLater') + slice(app, 'const recentQueries =', 'const pushRecentQuery ='), c);
  return { c, localStorage, get: expr => vm.runInContext(expr, c) };
}
function apiFixture() {
  const dom = new JSDOM('<body></body>');
  let value = 'old-token';
  const c = vm.createContext({ document: dom.window.document, FormData, AbortController, setTimeout, clearTimeout, Headers,
    console: { warn() {} }, token: () => value, setToken: t => { value = t; }, state: { user: { name: 'QA' } },
    updateBadges() {}, ensureOfflineBar: () => dom.window.document.createElement('div'), toast() {},
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }) });
  vm.runInContext(slice(app, 'async function api(', '/* ─────────── app state'), c);
  return { c, dom, get token() { return value; }, set token(v) { value = v; } };
}
function modalFixture() {
  const dom = new JSDOM('<body><div id="modalOverlay"><div id="modalBox"></div></div></body>');
  const c = vm.createContext({ document: dom.window.document, window: {}, $: s => dom.window.document.querySelector(s) });
  vm.runInContext(slice(app, 'const _scrollLock =', '/* ── offline awareness') + slice(app, 'let _modalTrap =', "$('#modalOverlay').addEventListener"), c);
  return { c, dom, run: expr => vm.runInContext(expr, c) };
}
function routerFixture() {
  const dom = new JSDOM('<body><main id="view"></main></body>');
  const w = dom.window, view = w.document.querySelector('#view');
  const c = vm.createContext({ document: w.document, window: { scrollTo() {}, Shivaa: {} }, location: { hash: '#/qa', href: 'https://qa.test/#/qa' },
    URLSearchParams, innerHeight: 900, console: { error() {} }, state: {}, STAFF_PAGES: { admin: 1, partner: 1 },
    _scrollLock: { n: 0 }, closeModal() {}, closeCart() {}, resetProductMeta() {}, syncFinaleChrome() {}, initCatbar() {},
    clearInterval() {}, setInterval() { return 1; }, setTimeout() {}, requestAnimationFrame() {},
    $: s => w.document.querySelector(s), $$: s => [...w.document.querySelectorAll(s)],
    esc: x => String(x), emptyShell: (a,b,c) => `<h1>${b}</h1>${c}`, _staffEmpty: h => h,
    loadStaffBundle: () => Promise.resolve() });
  vm.runInContext(/const routes = [^;]+;/.exec(app)[0] + '\n' + slice(app,
    app.includes('let routeGeneration =') ? 'let routeGeneration =' : 'function route()', "addEventListener('hashchange', route)"), c);
  return { c, view, dom, routes: vm.runInContext('routes', c) };
}
function workerFixture() {
  const listeners = {}, buckets = new Map();
  const origin = 'https://qa.test';
  const key = x => new URL(typeof x === 'string' ? x : x.url, origin).href;
  const caches = {
    async open(name) {
      if (caches.failOpen) throw Error('storage unavailable');
      if (!buckets.has(name)) buckets.set(name, new Map());
      const b = buckets.get(name);
      return { async match(k) { return b.get(key(k))?.clone(); }, async put(k, r) { if (caches.failPut) throw Error('quota'); b.set(key(k), r.clone()); },
        async delete(k) { return b.delete(key(k)); }, async keys() { return [...b.keys()].map(u => new Request(u)); } };
    },
    async keys() { return [...buckets.keys()]; }, async delete(n) { return buckets.delete(n); },
    async match(k) { for (const n of buckets.keys()) { const hit = await (await caches.open(n)).match(k); if (hit) return hit; } }
  };
  const c = vm.createContext({ URL, Request, Response, Headers, Date, Promise, caches, console,
    fetch: async () => new Response('new-image', { headers: { 'Content-Type': 'image/jpeg', Date: new Date().toUTCString() } }),
    self: { location: { origin }, addEventListener: (n, f) => { listeners[n] = f; }, skipWaiting() {},
      clients: { async claim() {}, async matchAll() { return []; } } } });
  vm.runInContext(sw, c);
  function event(type, props) {
    const waits = [];
    const e = { ...props, waitUntil: p => waits.push(Promise.resolve(p)), respondWith: p => { e.response = Promise.resolve(p); } };
    listeners[type](e);
    return { e, waits, async done() { await Promise.all(waits); } };
  }
  return { c, caches, buckets, event, shell: vm.runInContext('SHELL', c), media: vm.runInContext('MEDIA', c),
    request(url, headers = {}) { return event('fetch', { request: new Request(origin + url, { headers }) }); } };
}
function invoiceFixture(order, blocked = false) {
  let html = '', notice = '';
  const c = vm.createContext({ window: { _adminOrders: [order], ShivaaAdmin: {}, open: () => blocked ? null : { document: { write: s => { html += s; }, close() {} } } },
    state: { settings: { gstin: '<img src=x onerror=alert(1)>' } }, toast: s => { notice = s; },
    esc: x => String(x ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch])) });
  vm.runInContext(slice(admin, 'window.ShivaaAdmin.printInvoice =', '/* ── v60 DPDP'), c);
  return { print() { c.window.ShivaaAdmin.printInvoice(order.id); return html; }, get notice() { return notice; } };
}
(async () => {
  await test('N01', 'Apache config has only Apache comments', () => assert(!/<!--|-->/.test(read('.htaccess'))));
  await test('N02', 'quota failure reads this session’s latest write, not stale disk', () => {
    const f = storage({ key: 'stale' }); f.localStorage.setItem = () => { throw Error('quota'); };
    f.get("store.set('key', 'latest')"); assert.equal(f.get("store.get('key')"), 'latest');
  });
  await test('N03', 'invalid cart containers/rows cannot break boot', () => {
    for (const value of [null, {}, 'bad', [null, {}, { id: 'ok', qty: 2 }]]) {
      const f = storage({ shv_cart: value }); assert.equal(f.get('Array.isArray(state.cart) && state.cart.every(x => x && x.id)'), true);
    }
  });
  await test('N04', 'cart quantities are numeric, finite, integer and server-bounded', () => {
    const f = storage({ shv_cart: [{ id: 'ok', qty: '2' }, { id: 'large', qty: 200 }, { id: 'bad', qty: -1 }, { id: 'decimal', qty: 1.8 }] });
    assert.equal(f.get('JSON.stringify(state.cart.map(x => x.qty))'), '[2,99,1]');
  });
  await test('N05', 'wishlist malformed JSON shapes and duplicate IDs recover', () => {
    assert.equal(storage({ shv_wish: null }).get('JSON.stringify(state.localWish)'), '[]');
    assert.equal(storage({ shv_wish: ['a','a',{},null] }).get('JSON.stringify(state.localWish)'), '["a"]');
  });
  await test('N06', 'save-for-later rejects corrupt rows and works with blocked writes', () => {
    const f = storage({ shv_later: [null, { id: 'ok', qty: 1 }] }); assert.equal(f.get('getLater().length'), 1);
    f.localStorage.setItem = () => { throw Error('quota'); }; f.get("setLater([{id:'new',qty:2}])"); assert.equal(f.get('getLater()[0].id'), 'new');
  });
  await test('N07', 'search history never passes null/non-string entries to lowerCase', () => {
    assert.equal(storage({ shv_recentq: null }).get('JSON.stringify(recentQueries())'), '[]');
    assert.equal(storage({ shv_recentq: ['rings',{},null] }).get('JSON.stringify(recentQueries())'), '["rings"]');
  });
  await test('N08', 'HTML/malformed/null API successes fail loudly; null errors keep status', async () => {
    const f = apiFixture();
    try {
      for (const json of [async () => { throw SyntaxError('HTML'); }, async () => null, async () => []]) {
        f.c.fetch = async () => ({ ok: true, status: 200, json }); await assert.rejects(f.c.api('/api/qa'), /unreadable/);
      }
      f.c.fetch = async () => ({ ok: false, status: 502, json: async () => null });
      await assert.rejects(f.c.api('/api/qa'), e => e.status === 502);
      assert(!f.dom.window.document.body.classList.contains('is-offline'));
    } finally { f.dom.window.close(); }
  });
  await test('N09', 'timeout covers a stalled JSON body as well as response headers', async () => {
    const f = apiFixture(); f.c.fetch = async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) });
    let limit; try { await assert.rejects(Promise.race([f.c.api('/api/qa', { timeout: 1000 }), new Promise((_,r) => { limit = setTimeout(() => r(Error('TEST: body still hung')), 1400); })]), /too long/); }
    finally { clearTimeout(limit); f.dom.window.close(); }
  });
  await test('N10', 'caller cancellation propagates without falsely declaring offline', async () => {
    const f = apiFixture(), ctl = new AbortController(); ctl.abort(); let called = false;
    f.c.fetch = async () => { called = true; return { ok: true, json: async () => ({}) }; };
    try { await assert.rejects(f.c.api('/api/qa', { signal: ctl.signal }), e => e.name === 'AbortError'); assert(!called); assert(!f.dom.window.document.body.classList.contains('is-offline')); }
    finally { f.dom.window.close(); }
  });
  await test('N11', 'API retains custom headers and strips multipart content-type', async () => {
    const f = apiFixture(); let got;
    f.c.fetch = async (_, o) => { got = new Headers(o.headers); return { ok: true, status: 200, json: async () => ({}) }; };
    try { await f.c.api('/api/qa', { headers: { 'X-QA': 'yes' } }); assert.equal(got.get('x-qa'), 'yes');
      await f.c.api('/api/qa', { body: new FormData(), headers: { 'Content-Type': 'application/json', 'X-QA':'form' } });
      assert(!got.has('content-type')); assert.equal(got.get('x-qa'), 'form'); assert.equal(got.get('authorization'), 'Bearer old-token'); }
    finally { f.dom.window.close(); }
  });
  await test('N12', 'old request’s late 401 cannot log out a replacement session', async () => {
    const f = apiFixture(); let reply; f.c.fetch = () => new Promise(r => { reply = r; }); const pending = f.c.api('/api/qa'); f.token = 'new-token';
    reply({ ok: false, status: 401, json: async () => ({ error: 'expired' }) });
    try { await assert.rejects(pending); assert.equal(f.token, 'new-token'); assert(f.c.state.user); } finally { f.dom.window.close(); }
  });
  await test('N13', 'replacing an open modal does not strand scroll lock', () => {
    const f = modalFixture(); try { f.run("openModal('<h2>One</h2>'); openModal('<h2>Two</h2>'); closeModal()"); assert.equal(f.run('_scrollLock.n'), 0); } finally { f.dom.window.close(); }
  });
  await test('N14', 'closing a closed modal does not consume another overlay’s lock', () => {
    const f = modalFixture(); try { f.run('lockScroll(); closeModal()'); assert.equal(f.run('_scrollLock.n'), 1); } finally { f.dom.window.close(); }
  });
  await test('N15', 'heading-free dialogs retain a meaningful accessible name', () => {
    const f = modalFixture(); try { f.run("openModal('<p>Help</p>')"); assert(f.dom.window.document.querySelector('#modalBox').getAttribute('aria-label')); } finally { f.dom.window.close(); }
  });
  await test('N16', 'synchronous route exceptions render recovery UI', async () => {
    const f = routerFixture(); try { f.routes.qa = () => { throw Error('QA failure'); }; f.c.route(); await tick(); assert.match(f.view.textContent, /Something slipped/); } finally { f.dom.window.close(); }
  });
  await test('N17', 'late route rejection cannot replace the current page', async () => {
    const f = routerFixture(); let reject;
    try { f.routes.qa = () => new Promise((_,r) => { reject = r; }); f.c.route(); f.c.location.hash = '#/safe'; f.routes.safe = v => { v.textContent = 'safe'; }; f.c.route(); reject(Error('old')); await tick(); assert.equal(f.view.textContent, 'safe'); }
    finally { f.dom.window.close(); }
  });
  await test('N18', 'staff lazy load replays query-bearing admin URLs', async () => {
    const f = routerFixture(); let resolve;
    try { f.c.location.hash = '#/admin?tab=orders'; f.c.loadStaffBundle = () => new Promise(r => { resolve = r; }); f.c.route();
      f.routes.admin = (v,q) => { v.textContent = q.get('tab'); }; resolve(); await tick(); assert.equal(f.view.textContent, 'orders'); }
    finally { f.dom.window.close(); }
  });
  await test('N19', 'staff lazy-load failure cannot overwrite a later page', async () => {
    const f = routerFixture(); let reject;
    try { f.c.location.hash = '#/admin'; f.c.loadStaffBundle = () => new Promise((_,r) => { reject = r; }); f.c.route();
      f.routes.safe = v => { v.textContent = 'safe'; }; f.c.location.hash = '#/safe'; f.c.route(); reject(Error('load')); await tick(); assert.equal(f.view.textContent, 'safe'); }
    finally { f.dom.window.close(); }
  });
  await test('N20', 'question marks inside search values are not truncated', () => {
    const f = routerFixture(); try { f.c.location.hash = '#/qa?q=why?gold'; f.routes.qa = (v,q) => { v.textContent = q.get('q'); }; f.c.route(); assert.equal(f.view.textContent, 'why?gold'); } finally { f.dom.window.close(); }
  });
  await test('N21', 'prototype property URLs take the unknown-route path', () => {
    const f = routerFixture(); try { f.c.location.hash = '#/toString'; f.c.route(); assert.match(f.view.textContent, /slipped its clasp/); } finally { f.dom.window.close(); }
  });
  async function a11y(html, fn) {
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    try { dom.window.eval(read('js/v167.js')); dom.window.Shivaa.a11yFix(); fn(dom.window.document); } finally { dom.window.close(); }
  }
  await test('N22', 'second independently-labelled field is never renamed by its neighbour', () => a11y('<div class="fld"><label>Amount</label><input id="amount"><label for="term">Months</label><input id="term"></div>', d => assert.equal(d.querySelector('#term').getAttribute('aria-label'), null)));
  await test('N23', 'an explicit label also names its companion slider', () => a11y('<div class="fld"><label for="amount">Amount</label><input id="amount"><input id="slider" type="range"></div>', d => assert.equal(d.querySelector('#slider').getAttribute('aria-label'), 'Amount')));
  await test('N24', 'placeholder-only fields retain a name after typing', () => a11y('<input id="search" placeholder="Search designs">', d => { const el = d.querySelector('#search'); el.value = 'rings'; assert.equal(el.getAttribute('aria-label'), 'Search designs'); }));
  await test('N25', 'activate and explicit purge preserve other apps’ caches', async () => {
    const f = workerFixture(); await f.caches.open('other-app-v1'); await f.caches.open('shivaa-shell-v1');
    await f.event('activate', {}).done(); assert(f.buckets.has('other-app-v1')); assert(!f.buckets.has('shivaa-shell-v1'));
    await f.event('message', { data: { type: 'SHV_PURGE' } }).done(); assert(f.buckets.has('other-app-v1'));
    assert.match(read('js/v166.js'), /ks\.filter\(function \(k\)/);
  });
  await test('N26', 'private KYC, payment proofs and PHP pages bypass offline caches', () => {
    const f = workerFixture(); for (const url of ['/uploads/kyc/card.jpg','/uploads/payproofs/proof.png','/admin-reset.php']) assert.equal(f.request(url).e.response, undefined, url);
  });
  await test('N27', 'navigation cache keys are bounded; unknown assets are not cached', async () => {
    const f = workerFixture(); f.c.fetch = async () => new Response('<html>shop</html>', { headers: { 'Content-Type': 'text/html' } });
    for (const q of ['?utm=one','?utm=two','?cf=return']) { const req = f.request('/'+q, { accept:'text/html' }); await req.e.response; await req.done(); }
    assert.equal((await (await f.caches.open(f.shell)).keys()).length, 1);
    assert.equal(f.request('/unknown.js?cachebust=anything').e.response, undefined);
  });
  await test('N28', '200 HTML fallback cannot poison an image cache', async () => {
    const f = workerFixture(); f.c.fetch = async () => new Response('<html>not an image</html>', { headers: { 'Content-Type':'text/html' } });
    const req = f.request('/images/missing.jpg'); await req.e.response; await req.done(); await tick(); assert.equal((await (await f.caches.open(f.media)).keys()).length, 0);
  });
  await test('N29', 'expired media is rejected before serving, not only on cache trim', async () => {
    const f = workerFixture(); const c = await f.caches.open(f.media);
    await c.put('/images/old.jpg', new Response('old', { headers: { 'Content-Type':'image/jpeg', Date: new Date(Date.now()-31*86400000).toUTCString() } }));
    const req = f.request('/images/old.jpg'); assert.equal(await (await req.e.response).text(), 'new-image'); await req.done();
  });
  await test('N30', 'background image refresh extends FetchEvent lifetime', async () => {
    const f = workerFixture(); const req = f.request('/images/new.jpg'); assert(req.waits.length > 0); await req.e.response; await req.done();
  });
  await test('N31', 'CacheStorage unavailable/quota exhaustion never blocks online media', async () => {
    for (const failure of ['failOpen','failPut']) { const f = workerFixture(); f.caches[failure] = true; const req = f.request('/images/new.jpg'); assert.equal(await (await req.e.response).text(), 'new-image'); await req.done(); }
  });
  await test('N32', 'uncached offline document always gets a real Response', async () => {
    const f = workerFixture(); f.c.fetch = async () => { throw Error('offline'); }; const req = f.request('/', { accept:'text/html' }); const res = await req.e.response; assert(res instanceof Response); assert.equal(res.status, 503); await req.done();
  });
  await test('N33', 'rates and authenticated catalogue never replay as live API success', () => {
    const f = workerFixture(); assert.equal(f.request('/api/rates').e.response, undefined); assert.equal(f.request('/api/products', { authorization:'Bearer QA' }).e.response, undefined);
  });
  await test('N34', 'font tokens resolve to the existing design system', () => {
    const css = read('css/styles.css'); assert.match(css, /--font-serif\s*:\s*var\(--ff-disp\)/); assert.match(css, /--sans\s*:\s*var\(--ff-body\)/);
  });
  await test('N35', 'installed app and legacy manifest carry the current rate brand', () => {
    const a = JSON.parse(read('manifest.webmanifest')), b = JSON.parse(read('manifest.json'));
    assert(!/Jaipur/i.test(a.name + a.description + b.description)); assert.deepEqual(a,b);
    for (const i of a.icons) assert(fs.existsSync(path.join(CMS, i.src)));
  });
  const order = { id:'QA', invoiceNo:'QA-INV', createdAt:'2026-09-21', items:[{ name:'QA fixture', qty:1, unitPrice:1030, gst:30 }], discount:100, codFee:50, total:980 };
  await test('N36', 'invoice lists coupon and COD adjustments used in the saved total', () => {
    const html = invoiceFixture(order).print(); assert.match(html, /Coupon discount/); assert.match(html, /COD fee/); assert.match(html, /980/);
  });
  await test('N37', 'invoice identifiers and merchant GST text are HTML escaped', () => {
    const html = invoiceFixture({ ...order, id:'<svg onload=alert(1)>', invoiceNo:'<img src=x>' }).print(); assert(!html.includes('<img')); assert(!html.includes('<svg')); assert(html.includes('&lt;img'));
  });
  await test('N38', 'blocked invoice popup reports recovery instead of throwing', () => {
    const f = invoiceFixture(order, true); f.print(); assert.match(f.notice, /Allow pop-ups/);
  });
  await test('N39', 'invoice does not claim GST applies only to making charges', () => {
    assert(!/GST 1\.5% CGST \+ 1\.5% SGST on making charges/.test(invoiceFixture(order).print()));
  });
  console.log(`\nv168 boundary checks: ${checks.filter(Boolean).length}/${checks.length}; N40 media signatures: run v168-php-run.js`);
  process.exitCode = checks.every(Boolean) ? 0 : 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
