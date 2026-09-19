/* ══════════════════════════════════════════════════════════════════════
   SHIVAA v139 check — the owner's four reports of 18 Sep 2026.

   1 · "the check out button … doesn't work and doesn't take us to the
        payment page"                        → bag drawer tap ownership
   2 · "when you click on any category and go to that category page then
        still that 17 photos are on the page the images are only there"
                                             → category page is product-first
   3 · "place order button is always there on the screen in the phone …
        should be down … it disturbs and does not let the customer fill the
        information"                         → the bar joins the page flow
   4 · "I have selected the one tab quick check out … I cannot see that the
        information is pre filled or the addresses are prefilled or the
        numbers are automatically verified"  → Cashfree One Click Checkout
                                              (server) + our own address
                                              prefill (shop)

   A · static  (14) release stamps, load order, what each new file is allowed
                    to touch, and the Cashfree payload shape.
   B · live    (26) jsdom on the real shell: the bag's Checkout tap reaches the
                    payment page, history.back() is never queued against it, a
                    category page carries no category photographs, the payment
                    page's bar is in flow, saved addresses prefill.
   C · control (4)  the SAME taps with /js/v139.js stripped out DO queue
                    history.back() — while the URL is still the page the shopper
                    came from, i.e. against the navigation in flight. The named
                    regression check that the bug was real and that this gate can
                    still see it. jsdom performs no real cross-document
                    navigation, so the VISIBLE bounce is inferred from the
                    identical v127 mechanism (owner live-verified on a phone),
                    not measured here — the measured quantity is the traversal.

   Run:  node tools/mega/smoke/v139-check.js
   Overlay: SMOKE_CMS=<dir> node tools/mega/smoke/v139-check.js
   ══════════════════════════════════════════════════════════════════════ */
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
async function until(fn, ms = 12000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); }
  return false;
}

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const V139_TAG = /<script src="\/js\/v139\.js\?v=139" defer><\/script>/;

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(CMS, u === '/' ? 'index.html' : u);
  if (!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end();
  fs.readFile(f, (e, b) => e ? res.writeHead(404).end()
    : (res.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }), res.end(b)));
});

const jaipur = { gold24: 15655, gold22: 14405, gold18: 11696, silver: 242.4 };
const RATES_STUB = {
  t: new Date().toISOString(), source: 'live-mcx', live: false,
  spot: jaipur, jaipur, ...jaipur,
  rtgs: { rows: {}, anchor: 'mcx-future', updatedAt: new Date().toISOString() },
  premium: { gold: 55, silver: 3, gold22: 398 },
  anchorLevel: { mode: 'mcx-future', goldPerG: 15056, silverPerG: 99500 },
  history: [Object.assign({ t: new Date(Date.now() - 6e4).toISOString() }, jaipur)], nextUpdateIn: 60,
};
const USER = { id: 'u1', name: 'Aarti Choudhary', email: 'aarti@example.com', phone: '9876543210',
  loyaltyPoints: 0, addresses: [
    { id: 'ad1', label: 'Home', name: 'Aarti Choudhary', phone: '9876543210', line: '12 Kisan Nagar', city: 'Jayal', state: 'Rajasthan', pincode: '341023', isDefault: true },
    { id: 'ad2', label: 'Work', name: 'Aarti C.', phone: '9812345678', line: 'Shop 4, MG Road', city: 'Nagaur', state: 'Rajasthan', pincode: '341001' } ] };

function boot({ stripV139 = false, startHash = '', innerWidth = 420, loggedIn = false, withSW = false } = {}) {
  const backs = { n: 0 };
  const errors = [];
  /* jsdom refuses to navigate, and `location.reload` cannot be redefined — but
     it DOES raise a "Not implemented: navigation" jsdomError every time reload
     is called. That is the observable used to count silent swaps. */
  const navs = { n: 0 };
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (/Not implemented: navigation/.test(String(e.message))) navs.n++; });
  vc.on('error', () => {}); vc.on('log', () => {}); vc.on('info', () => {}); vc.on('warn', () => {});
  /* a service-worker registration with a WAITING worker — the exact state that
     used to raise the popup on every single load. */
  const sw = { posts: [], handlers: {}, worker: null, reg: null };
  if (withSW) {
    sw.worker = { state: 'installed', postMessage: m => sw.posts.push(m), addEventListener() {} };
    sw.reg = { waiting: sw.worker, installing: null, active: null,
               addEventListener() {}, };
  }
  const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8')
    .replace(V139_TAG, stripV139 ? '' : m => m);
  const dom = new JSDOM(html, {
    url: `http://127.0.0.1:${server.address().port}/${startHash}`,
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      if (withSW) {
        Object.defineProperty(w.navigator, 'serviceWorker', { configurable: true, value: {
          controller: {},
          getRegistration: () => Promise.resolve(sw.reg),
          addEventListener: (t, fn) => { (sw.handlers[t] = sw.handlers[t] || []).push(fn); },
        } });
      }
      /* a tab the shopper is NOT looking at — how the silent swap is allowed */
      let _hidden = false;
      Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => _hidden });
      Object.defineProperty(w.document, 'visibilityState', { configurable: true, get: () => _hidden ? 'hidden' : 'visible' });
      w.__setHidden = v => { _hidden = v; };
      w.innerWidth = innerWidth; w.innerHeight = 900;
      w.matchMedia = q => ({ matches: /max-width:\s*[6-8]\d\dpx/.test(q), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.scrollTo = () => {};
      if (loggedIn) { try { w.localStorage.setItem('shv_token', JSON.stringify('tok_gate')); } catch (e) {} }
      Object.defineProperty(w.navigator, 'vibrate', { value: () => true, configurable: true });
      Object.defineProperty(w.navigator, 'hardwareConcurrency', { value: 8, configurable: true });
      w.HTMLMediaElement.prototype.play = () => Promise.resolve();
      w.HTMLMediaElement.prototype.pause = () => {};
      w.addEventListener('error', ev => {
        if (ev.target && ev.target.tagName === 'IMG') return;
        errors.push(String(ev.message || ev.error || 'error'));
      });
      const rb = w.history.back.bind(w.history);
      Object.defineProperty(w.history, 'back', {
        configurable: true, writable: true,
        value: function () { backs.n++; return rb(); },
      });
      w.fetch = (input) => {
        const p = String(input).split('?')[0];
        let status = 200, out = {};
        if (p.endsWith('/api/rates')) out = RATES_STUB;
        else if (p.endsWith('/api/settings')) out = { settings: DB.settings };
        else if (p.endsWith('/api/making-charges')) out = { table: [] };
        else if (p.endsWith('/api/catalogs')) out = { catalogs: [] };
        else if (p.endsWith('/api/auth/me')) out = { user: loggedIn ? USER : null };
        else if (p.endsWith('/api/addresses')) out = { ok: true, addresses: USER.addresses };
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
  return {
    dom, w, doc, backs, errors, navs, sw,
    fireControllerChange: () => (sw.handlers.controllerchange || []).forEach(fn => { try { fn({}); } catch (e) {} }),
    $: s => doc.querySelector(s),
    $$: s => [...doc.querySelectorAll(s)],
    click: (el, o) => el.dispatchEvent(new w.MouseEvent('click', Object.assign({ bubbles: true, cancelable: true }, o))),
    booted: () => until(() => doc.querySelector('#heroCarousel') && doc.querySelectorAll('.c-slide').length >= 2, 25000),
    loginOpen: () => (doc.querySelector('#shvAuthWrap') && !doc.querySelector('#shvAuthWrap').hidden) ||
                     (doc.querySelector('#modalOverlay') && doc.querySelector('#modalOverlay').classList.contains('open')),
  };
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));

  /* ══════ A · static ══════ */
  console.log('\n· A · static');
  const shell = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
  const v139 = fs.readFileSync(path.join(CMS, 'js/v139.js'), 'utf8');
  const css139 = fs.readFileSync(path.join(CMS, 'css/v139.css'), 'utf8');
  const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
  const admin = fs.readFileSync(path.join(CMS, 'js/admin.js'), 'utf8');
  const v107src = fs.readFileSync(path.join(CMS, 'js/v107.js'), 'utf8');

  ok('cms/js/v139.js ships, index.html loads it last (after v127) and the worker precaches it',
    /<script src="\/js\/v139\.js\?v=139" defer><\/script>/.test(shell) &&
    shell.indexOf('/js/v127.js?v=127') < shell.indexOf('/js/v139.js?v=139') &&
    shell.indexOf('/js/app.js?v=139') < shell.indexOf('/js/v139.js?v=139') &&
    sw.includes("'/js/v139.js?v=139'") && sw.includes("'/css/v139.css?v=139'"));

  ok('the release triple moves together to 139 or newer (index.html · app.js · sw.js)  [v148 fix-forward: numeric]',
    (() => {
      const g = (re, t) => Number((re.exec(t) || [0, 0])[1]);
      const a = g(/window\.__SHIVAA_REL=(\d+);/, shell), b = g(/APP_REL\s*=\s*(\d+)/, app), c = g(/SHELL = 'shivaa-shell-v(\d+)'/, sw);
      return a >= 139 && a === b && b === c;
    })(),
    'index.html/app.js/sw.js stamps must all read 139 or newer, in lockstep');

  ok('no stale 138 stamp survives in the shell, the app or the worker',
    !/\?v=138/.test(shell) && !/\?v=138/.test(sw) && !/APP_REL\s*=\s*138/.test(app),
    (shell.match(/\?v=138/g) || []).length + ' in index.html, ' + (sw.match(/\?v=138/g) || []).length + ' in sw.js');

  ok('css/v139.css ships and is linked after v125.css',
    /<link rel="stylesheet" href="\/css\/v139\.css\?v=139">/.test(shell) &&
    shell.indexOf('/css/v125.css?v=125') < shell.indexOf('/css/v139.css?v=139'));

  ok('v139.js owns ONLY the bag drawer — it never touches the sidebar or the search palette',
    /getElementById\('cartDrawer'\)/.test(v139) &&
    !/getElementById\('mainNav'\)/.test(v139) && !/getElementById\('searchSugg'\)/.test(v139),
    'js/v127.js owns #mainNav + #searchSugg; two owners on one tap is how the v127 bug was born');

  ok('v139.js registers no route and touches no price, rate, API call or gateway',
    !/pages\.[a-z]/.test(v139) && !/\/api\//.test(v139) &&
    !/premium|ratePerGram|gold22|cashfree/i.test(v139));

  ok('v139.js navigates through the hash only and arms the house flag js/v120.js honours',
    /window\.location\.hash\s*=\s*target/.test(v139) && /__shvNavigating\s*=\s*true/.test(v139));

  ok('v139.js never intercepts a modified click, and leaves the no-href close button alone',
    /metaKey \|\| e\.ctrlKey \|\| e\.shiftKey \|\| e\.altKey/.test(v139) &&
    /closest\('a\[href\^="#\/"\]'\)/.test(v139));

  ok('the filtered shop page renders chips, the unfiltered one keeps the photo slider',
    /const filtered = !!\(cat \|\| tag \|\| search \|\| q\.get\('max'\)\)/.test(app) &&
    /shop-chipbar">\$\{catChipsHTML\(cat\)\}/.test(app) &&
    /\$\{catBarHTML\(\)\}/.test(app));

  ok('the checkout Place Order bar is in the page flow, not pinned to the viewport',
    /class="mcta-bar mcta-inline" id="coBar"/.test(app) &&
    /\.mcta-bar\.mcta-inline\s*\{[^}]*position:\s*static/s.test(css139) &&
    /bottom:\s*auto/.test(css139));

  ok('every v139 animation is transform/opacity only and honours prefers-reduced-motion',
    !/animation:[^;]*(width|height|top|left|margin|padding)\s/.test(css139) &&
    /@media \(prefers-reduced-motion: reduce\)/.test(css139) &&
    /animation: none !important/.test(css139));

  ok('the checkout form reads the saved address book (the prefill the shop owns)',
    /state\.user\.addresses/.test(app) && /shv_lastAddr/.test(app) &&
    /_pv\('line'\)/.test(app) && /id="adrSw"/.test(app) && /id="adSave"/.test(app));

  ok('the Cashfree create-order call can carry One Click Checkout, and only when the owner switches it on',
    /function cashfree_occ_block\(/.test(api) &&
    /'one_click_checkout' => \['enabled' => true\]/.test(api) &&
    /checkoutCollectAddress/.test(api) && /checkoutAuthenticate/.test(api) &&
    /if \(empty\(\$cfg\['occ'\]\)\) return \[\];/.test(api) &&
    /array_merge\(\$payload, \$occBlock\)/.test(api));

  ok('an OCC refusal can never block a payment — one retry without it, audit-logged',
    /payment\.cashfree-occ-fallback/.test(api) &&
    /unset\(\$payload\['products'\], \$payload\['cart_details'\]\)/.test(api) &&
    /GET Order Extended|\/extended/.test(api) &&
    /cfCheckout/.test(api) &&
    /<input type="checkbox" name="cfOcc"/.test(admin));

  console.log('\n· A · static — no update popup can be built at all (owner report 5)');
  /* Both files KEEP a comment naming the old banner, because why it was removed
     matters more than the fact. So the assertion must read the CODE, not the
     prose: strip block comments first, then look for the banner machinery. */
  const codeOnly = src => src.replace(/\/\*[\s\S]*?\*\//g, '');
  const appCode = codeOnly(app), v107Code = codeOnly(v107src);
  ok('app.js no longer builds the "A newer, better Shivaa is ready" banner',
    !/A newer, better Shivaa is ready/.test(appCode) && !/swu-go/.test(appCode) &&
    !/swu-tx/.test(appCode) && !/banner\.classList\.add\('show'\)/.test(appCode),
    'banner machinery still present in executable code');
  ok('v107.js no longer builds the "A fresher Shivaa is ready" bar',
    !/A fresher Shivaa is ready/.test(v107Code) && !/v107UpdGo/.test(v107Code) &&
    !/v107UpdX/.test(v107Code) && !/Update now/.test(v107Code),
    'update bar still present in executable code');
  /* and prove the stripper is not simply blanking the files out */
  ok('(control) the comment stripper leaves real code intact',
    /serviceWorkerSilentUpdate/.test(appCode) && /function pwaUpdateBar/.test(v107Code) &&
    appCode.length > app.length * 0.5, 'stripper removed too much: ' + appCode.length + '/' + app.length);
  ok('both watchers now activate a waiting worker silently instead of asking',
    /skipWaiting = w =>/.test(appCode) && /type: 'SKIP_WAITING'/.test(appCode) &&
    /const activate = w =>/.test(v107Code) && /type: 'SKIP_WAITING'/.test(v107Code));
  ok('the only reload left is gated on a HIDDEN tab, never on a visible one',
    /if \(!document\.hidden\) return;/.test(appCode) &&
    /FORM_PAGES\.indexOf\(document\.body\.dataset\.page\) >= 0/.test(appCode) &&
    !/controllerchange', \(\) => \{\s*if \(reloading\) return; reloading = true;\s*try \{ location\.reload\(\)/.test(appCode));
  ok('any popup an older cached script already painted is removed on load',
    /\['swUpdate', 'v107Upd'\]\.forEach/.test(appCode) && /const b = document\.getElementById\('v107Upd'\); if \(b\) b\.remove\(\)/.test(v107Code));

  /* ══════ B · live ══════ */
  console.log('\n· B · live — the bag drawer\'s Checkout tap (owner report 1)');
  const pid = DB.products[0].id;
  const A = boot({ startHash: '#/' });
  if (!(await A.booted())) ok('the storefront boots and renders the home page', false);
  else ok('the storefront boots and renders the home page', true);
  await sleep(400);

  A.w.eval(`window.Shivaa.addToCart(${JSON.stringify(pid)}, 1, { silent: false })`);
  ok('adding a piece opens the bag drawer',
    await until(() => A.$('#cartDrawer') && A.$('#cartDrawer').classList.contains('open'), 8000));
  ok('the bag shows the piece that was added', A.$$('.mc-line').length === 1, A.$$('.mc-line').length + ' line(s)');
  ok('the bag carries a Checkout ✦ link to #/checkout', !!A.$('.mc-foot a[href="#/checkout"]'));

  A.backs.n = 0;
  A.click(A.$('.mc-foot a[href="#/checkout"]'));
  const reached = await until(() => A.w.location.hash === '#/checkout' && A.loginOpen(), 9000);
  await sleep(600);
  ok('tapping Checkout ✦ lands on #/checkout', A.w.location.hash === '#/checkout', 'hash=' + A.w.location.hash);
  ok('…and the shopper is taken on to the payment step (sign-in gate for a guest)', reached);
  ok('…the gate remembers to send them to checkout after signing in', A.w._loginNext === 'checkout', String(A.w._loginNext));
  ok('the bag drawer shuts behind them', !A.$('#cartDrawer').classList.contains('open'));
  ok('history.back() was NEVER queued against that tap (the race is dead)', A.backs.n === 0, A.backs.n + ' traversal(s)');

  console.log('\n· B · live — the same tap, signed in (the payment form itself)');
  const L = boot({ startHash: '#/', loggedIn: true });
  if (!(await L.booted())) ok('the signed-in session boots', false);
  await sleep(400);
  L.w.eval(`window.Shivaa.addToCart(${JSON.stringify(pid)}, 1, { silent: false })`);
  await until(() => L.$('#cartDrawer') && L.$('#cartDrawer').classList.contains('open'), 8000);
  L.backs.n = 0;
  L.click(L.$('.mc-foot a[href="#/checkout"]'));
  const gotForm = await until(() => L.$('#addrForm'), 12000);
  await sleep(400);
  ok('a signed-in shopper reaches the payment form (#addrForm)', gotForm);
  ok('…with no history traversal queued either', L.backs.n === 0, L.backs.n + ' traversal(s)');
  ok('the Place Order bar is in the page flow (mcta-inline), not floating over the form',
    !!L.$('#coBar') && L.$('#coBar').classList.contains('mcta-inline') &&
    L.$('#coBar').className.indexOf('mcta-bar') === 0, L.$('#coBar') ? L.$('#coBar').className : 'missing');
  ok('the saved address book pre-fills the form (line · city · pincode)',
    L.$('#adLine') && L.$('#adLine').value === '12 Kisan Nagar' &&
    L.$('#adCity').value === 'Jayal' && L.$('#adPin').value === '341023',
    [L.$('#adLine') && L.$('#adLine').value, L.$('#adCity') && L.$('#adCity').value, L.$('#adPin') && L.$('#adPin').value].join(' | '));
  ok('…and offers every saved address as a one-tap chip', L.$$('#adrSw .adr-chip[data-adr]').length === 2,
    L.$$('#adrSw .adr-chip[data-adr]').length + ' chip(s)');
  {
    const chip = L.$$('#adrSw .adr-chip[data-adr]')[1];
    L.click(chip);
    await sleep(200);
    ok('tapping the other saved address moves it into the form',
      L.$('#adLine').value === 'Shop 4, MG Road' && L.$('#adCity').value === 'Nagaur' && L.$('#adPin').value === '341001',
      L.$('#adLine').value + ' / ' + L.$('#adCity').value);
  }
  ok('no unhandled page errors in the signed-in checkout session',
    L.errors.length === 0, L.errors.slice(0, 2).join(' · '));
  try { L.w.close(); } catch (_) {}

  console.log('\n· B · live — a category page is about the pieces (owner report 2)');
  for (const [hash, label] of [['#/shop?category=rings', 'a category that has pieces'],
                               ['#/shop?category=earrings', 'a category still being catalogued']]) {
    const B = boot({ startHash: hash });
    await until(() => B.doc.body.dataset.page === 'shop' && B.$('#shopGrid'), 20000);
    await sleep(800);
    const tiles = B.$$('.shop-catbar .cb-item').length;
    const imgs = B.$$('.shop-catbar .cb-item img').length;
    ok(`${label} (${hash}) paints NO wall of category photographs`,
      tiles === 0 && imgs === 0, `${tiles} tile(s), ${imgs} <img>`);
    ok(`${label} (${hash}) still offers the category jump — as text chips`,
      B.$$('.cat-chips .cat-chip').length >= 17 && !!B.$('.cat-chip.on'),
      B.$$('.cat-chips .cat-chip').length + ' chip(s)');
    /* the category is the query value, never a substring of the hash —
       'earrings' CONTAINS 'rings', which is exactly the bug this test had. */
    /* the route query lives INSIDE the fragment ('#/shop?category=rings'),
       so URL.searchParams on the whole hash is empty — parse the tail. */
    const catKey = new URLSearchParams(hash.split('?')[1] || '').get('category');
    if (catKey === 'rings') {
      ok('…and the pieces are really there (the page is not empty)', B.$$('#shopGrid .p-card').length > 0 && /77 pieces/.test(B.$('#resCount').textContent));
    } else {
      ok('…and an empty category says so honestly instead of showing only pictures',
        !!B.$('#shopGrid .empty') && /being catalogued/.test(B.$('#shopGrid .empty').textContent));
    }
    try { B.w.close(); } catch (_) {}
  }
  {
    const U = boot({ startHash: '#/shop' });
    await until(() => U.doc.body.dataset.page === 'shop' && U.$('#shopGrid'), 20000);
    await sleep(700);
    ok('the unfiltered Shop page KEEPS its photo slider (browse, not results)',
      U.$$('.shop-catbar .cb-item').length === 20, U.$$('.shop-catbar .cb-item').length + ' tile(s)');
    try { U.w.close(); } catch (_) {}
  }

  console.log('\n· B · live — the drawer\'s 17-category list folds when you leave');
  {
    const F = boot({ startHash: '#/' });
    if (!(await F.booted())) ok('fold session boots', false);
    await sleep(500);
    F.click(F.$('#navToggle'));
    await until(() => F.$('#mainNav') && F.$('#mainNav').classList.contains('open'), 6000);
    F.click(F.$('#navCats'));
    const expanded = await until(() => F.$('#dwCatList') && F.$('#dwCatList').classList.contains('open'), 6000);
    const rows = F.$$('#dwCatList a[href^="#/"]').length;
    ok('the sidebar really does expand all 17 categories', expanded && rows === 17, rows + ' row(s)');
    const link = F.$$('#dwCatList a[href^="#/"]')[2];
    const href = link.getAttribute('href');
    F.click(link);
    await sleep(1300);
    ok('tapping one of them navigates to that category', F.w.location.hash === href, 'hash=' + F.w.location.hash);
    ok('…and the 17-photo list folds shut instead of staying open on the page',
      F.$('#dwCatList') && !F.$('#dwCatList').classList.contains('open') &&
      F.$('#navCats').getAttribute('aria-expanded') === 'false',
      'aria-expanded=' + (F.$('#navCats') && F.$('#navCats').getAttribute('aria-expanded')));
    try { F.w.close(); } catch (_) {}
  }

  console.log('\n· B · live — a waiting service worker raises no popup and swaps silently');
  {
    const U = boot({ startHash: '#/', withSW: true });
    if (!(await U.booted())) ok('silent-update session boots', false);
    await sleep(700);
    ok('a waiting worker is present — the exact state that used to raise the popup',
      !!U.sw.reg.waiting && U.sw.reg.waiting.state === 'installed');
    ok('NO update popup is painted (neither #swUpdate nor #v107Upd)',
      !U.$('#swUpdate') && !U.$('#v107Upd') &&
      !/A newer, better Shivaa is ready|A fresher Shivaa is ready/.test(U.doc.body.textContent),
      'found: ' + [U.$('#swUpdate') && '#swUpdate', U.$('#v107Upd') && '#v107Upd'].filter(Boolean).join(','));
    ok('the waiting worker was told to activate on its own (SKIP_WAITING), with no tap',
      U.sw.posts.some(m => m && m.type === 'SKIP_WAITING'), JSON.stringify(U.sw.posts));
    U.navs.n = 0;
    U.fireControllerChange();
    await sleep(500);
    ok('a completed swap does NOT reload while the shopper is looking at the tab',
      U.navs.n === 0, U.navs.n + ' reload(s) while visible');
    U.w.__setHidden(true);
    U.doc.dispatchEvent(new U.w.Event('visibilitychange'));
    await sleep(500);
    ok('…and applies itself the moment the tab is hidden — exactly one reload',
      U.navs.n === 1, U.navs.n + ' reload(s)');
    try { U.w.close(); } catch (_) {}
  }
  {
    /* the same swap on the payment page: a half-typed address must survive */
    const P = boot({ startHash: '#/', loggedIn: true, withSW: true });
    if (!(await P.booted())) ok('checkout silent-update session boots', false);
    await sleep(400);
    P.w.eval(`window.Shivaa.addToCart(${JSON.stringify(DB.products[0].id)}, 1, { silent: false })`);
    await until(() => P.$('#cartDrawer') && P.$('#cartDrawer').classList.contains('open'), 8000);
    P.click(P.$('.mc-foot a[href="#/checkout"]'));
    await until(() => P.$('#addrForm'), 12000);
    P.navs.n = 0;
    P.fireControllerChange();
    P.w.__setHidden(true);
    P.doc.dispatchEvent(new P.w.Event('visibilitychange'));
    await sleep(500);
    ok('on the payment page the swap waits — it never reloads over a form being filled',
      P.doc.body.dataset.page === 'checkout' && P.navs.n === 0,
      'page=' + P.doc.body.dataset.page + ' reloads=' + P.navs.n);
    try { P.w.close(); } catch (_) {}
  }

  /* ══════ C · control ══════ */
  console.log('\n· C · control — the same taps with /js/v139.js stripped out');
  const C = boot({ startHash: '#/', stripV139: true });
  if (!(await C.booted())) ok('control session boots', false);
  await sleep(400);
  ok('control · the stripped shell really is running without the layer',
    ![...C.doc.querySelectorAll('script[src]')].some(s => /v139/.test(s.getAttribute('src'))) &&
    !C.$('#cartDrawer').__shvV139);
  {
    /* Record the hash AT THE INSTANT the traversal is queued. That is the
       whole defect: a traversal queued while the URL is still the page the
       shopper came from, i.e. against the navigation the same tap is making.
       jsdom resolves popstate after the hash change and performs no real
       cross-document navigation, so the *visible* bounce cannot be observed
       here — only the queued traversal can. The visible half is the mechanism
       v127 proved and the owner live-verified on a phone for the sidebar and
       the search bar; it is inferred there, not measured here. */
    const backAt = [];
    const rb2 = C.w.history.back.bind(C.w.history);
    Object.defineProperty(C.w.history, 'back', {
      configurable: true, writable: true,
      value: function () { C.backs.n++; backAt.push(C.w.location.hash); return rb2(); },
    });
    C.w.eval(`window.Shivaa.addToCart(${JSON.stringify(pid)}, 1, { silent: false })`);
    await until(() => C.$('#cartDrawer') && C.$('#cartDrawer').classList.contains('open'), 8000);
    C.backs.n = 0;
    C.click(C.$('.mc-foot a[href="#/checkout"]'));
    await sleep(1200);
    ok('control · WITHOUT the layer that tap queues history.back() — the defect, reproduced',
      C.backs.n > 0, C.backs.n + ' traversal(s); the race this release removes was not reproduced');
    ok('control · …and it is queued while the URL is still the page the shopper came from',
      backAt.length > 0 && backAt[0] === '#/',
      'history.back() fired at hash=' + JSON.stringify(backAt[0]));
  }
  {
    /* the same category tap with the layer stripped: the list stays open —
       which is what the owner meant by "still that 17 photos are on the page". */
    const D = boot({ startHash: '#/', stripV139: true });
    if (!(await D.booted())) ok('control fold session boots', false);
    await sleep(500);
    D.click(D.$('#navToggle'));
    await until(() => D.$('#mainNav') && D.$('#mainNav').classList.contains('open'), 6000);
    D.click(D.$('#navCats'));
    await until(() => D.$('#dwCatList') && D.$('#dwCatList').classList.contains('open'), 6000);
    D.click(D.$$('#dwCatList a[href^="#/"]')[2]);
    await sleep(1300);
    ok('control · WITHOUT the layer the 17-photo list is still open after navigating',
      D.$('#dwCatList') && D.$('#dwCatList').classList.contains('open') &&
      D.$('#navCats').getAttribute('aria-expanded') === 'true');
    try { D.w.close(); } catch (_) {}
  }
  try { C.w.close(); } catch (_) {}
  try { A.w.close(); } catch (_) {}

  server.close();
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v139 checks passed  ${pass === results.length ? ' ✦' : ''}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
