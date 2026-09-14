/* t7 — the "buttons are not working / it is not smooth" audit.
   Walks every internal route, then clicks every button on the important pages
   and reports: dead routes, handlers that throw, and console errors. */
import { boot, wait, until, click, type } from './harness.mjs';

const { window, doc, errors } = await boot('#/');
const $ = s => doc.querySelector(s), $$ = s => [...doc.querySelectorAll(s)];
const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));

/* ── 1. every internal route must render something real ── */
const hrefs = [...new Set($$('a[href^="#/"]').map(a => a.getAttribute('href').split('?')[0]))];
const ROUTES = [...new Set([...hrefs, '#/', '#/shop', '#/rates', '#/trust', '#/b2b', '#/cart', '#/compare',
  '#/hallmark', '#/size-guide', '#/account', '#/partner', '#/catalogues', '#/deadstock', '#/metal',
  '#/services', '#/about', '#/contact', '#/privacy', '#/order/o_nope'])];
let dead = [];
for (const r of ROUTES) {
  window.location.hash = r;
  const rendered = await until(() => ($('#view').textContent || '').trim().length > 40, 4000);
  if (!rendered) dead.push(r);
  await wait(90);
}
T(`all ${ROUTES.length} internal routes render`, dead.length === 0, dead.join(', '));

/* ── 2. click every button on the pages that matter ── */
const SKIP = /logout|placeOrder|print|submit/i;
const clicked = { n: 0, threw: [] };
for (const r of ['#/', '#/shop', '#/rates', '#/trust', '#/b2b', '#/size-guide', '#/hallmark', '#/cart']) {
  window.location.hash = r;
  await until(() => ($('#view').textContent || '').trim().length > 40, 4000);
  await wait(220);
  const btns = $$('#view button, .footer button, #header button').filter(b => {
    const oc = b.getAttribute('onclick') || '';
    return !SKIP.test(oc) && b.offsetParent !== null || !SKIP.test(oc);
  }).slice(0, 60);
  for (const b of btns) {
    if (!b.isConnected) continue;      // the page re-rendered — never click a detached node
    try { click(window, b); clicked.n++; await wait(12); }
    catch (e) { clicked.threw.push(r + ' · ' + (b.id || b.className || b.textContent.slice(0, 24)) + ': ' + e.message); }
  }
}
T(`${clicked.n} buttons clicked without throwing`, clicked.threw.length === 0, clicked.threw.slice(0, 6).join(' | '));

/* ── 3. the product page + its controls ── */
const pid = (window.Shivaa.state.productsCache.find(p => p.sizes && p.sizes.length) || {}).id;
window.location.hash = '#/product/' + pid;
await until(() => $('#pdTotal'), 5000); await wait(200);
const pdBtns = $$('#view button').length;
$$('#view .size-pill').slice(0, 3).forEach(b => click(window, b));
click(window, $('#view button[onclick*="qty"], #pdPlus') || $$('#view button')[0]);
T('product page renders with ' + pdBtns + ' controls', pdBtns > 4, String(pdBtns));

/* ── 4. no console errors / uncaught exceptions anywhere above ── */
const real = errors.filter(e => !/getContext|Not implemented: (navigation|Window's open)|Could not parse CSS|Not implemented: HTMLFormElement/i.test(e));
T('zero uncaught errors across the whole walk', real.length === 0, real.length + ' errors');
if (process.env.SHIVAA_DEBUG) real.slice(0, 6).forEach(e => console.log('\n─── ' + e.split('\n').slice(0, 6).join('\n')));

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
bad.forEach(b => console.log('  ✗ ' + b));
ok.forEach(o => console.log('  ✓ ' + o));
window.close();
