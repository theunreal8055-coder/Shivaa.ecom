/* t11 · the restored v42 Gift Concierge (v115-FI)
   ─────────────────────────────────────────────────────────────────────────
   v42 shipped a four-question gift finder on the home page; a later home
   rewrite deleted its markup, its handlers AND its stylesheet, and the v115-FI
   lineage audit is what noticed. The feature is back as a layer
   (js/gift-concierge.js + css/gift-concierge.css), so this suite asserts the
   two things that matter about a recommender on a jewellery store:

     · it never invents anything — every piece it shows is a live catalogue
       product, every rupee it prints is Shivaa.price()'s own number; and
     · it behaves like the rest of the shell — mounts on home only, survives a
       route change, degrades to nothing when the catalogue is empty, and throws
       no errors anywhere.

   Needs the preview shim running:  python3 qa/preview_shim.py &
   Run:  node qa/browser/t11-gift-concierge.mjs
*/
import { boot, wait, until, click, type, BASE } from './harness.mjs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
/* the harness swallows unhandledRejection so a page fault cannot kill the runner;
   that also means a thrown assertion detail here would hang forever instead of
   reporting. A watchdog turns any hang into a FAIL line with the step reached. */
let step = 'boot';
const at = s => { step = s; };
const WATCH = setTimeout(() => {
  console.log('PASS ' + ok.length + ' / FAIL ' + (bad.length + 1));
  console.log('  ✗ timed out inside step "' + step + '" (' + (LIMIT / 1000) + 's budget)');
  bad.forEach(b => console.log('  ✗ ' + b));
  process.exit(1);
}, 0);
const LIMIT = 180000;
clearTimeout(WATCH);
const watchdog = setTimeout(() => {
  console.log('PASS ' + ok.length + ' / FAIL ' + (bad.length + 1));
  console.log('  ✗ timed out inside step "' + step + '" (' + (LIMIT / 1000) + 's budget)');
  bad.forEach(b => console.log('  ✗ ' + b));
  process.exit(1);
}, LIMIT);

const { window, doc, errors } = await boot('#/');
const $ = s => doc.querySelector(s), $$ = s => [...doc.querySelectorAll(s)];
const SH = window.Shivaa;

at('1 mount');
/* ── 1 · it mounts, and only on the home page ─────────────────────────────── */
const mounted = await until(() => $('#giftConcierge'), 6000);
T('Gift Concierge mounts on the home view', !!mounted);
T('four steps in the progress rail', $$('#gcProgress .gc-step').length === 4,
  String($$('#gcProgress .gc-step').length));
T('four quiz panels with the v42 questions', $$('.gc-panel').length === 4,
  $$('.gc-panel').map(p => p.dataset.q || p.dataset.step).join(','));
T('option groups carry real answers (6 + 6 + 4)', $$('.gc-opt').length === 16, String($$('.gc-opt').length));

window.location.hash = '#/shop';
await until(() => ($('#view').textContent || '').trim().length > 40, 4000);
await wait(250);
T('leaves when the shopper navigates away (no section on /shop)', !$('#giftConcierge'));
window.location.hash = '#/';
await until(() => $('#giftConcierge'), 6000);
T('comes back on the next home visit', !!$('#giftConcierge'));

at('2 step machine');
/* ── 2 · the step machine ─────────────────────────────────────────────────── */
const step1 = $('.gc-panel[data-step="1"]');
const next1 = step1.querySelector('.gc-next');
T('Next starts disabled (nothing chosen yet)', next1.disabled === true);
click(window, step1.querySelector('.gc-opt[data-val="daughter"]'));
T('picking an answer enables Next', next1.disabled === false);
T('the chosen answer is aria-pressed (screen readers hear it)',
  step1.querySelector('.gc-opt[data-val="daughter"]').getAttribute('aria-pressed') === 'true');
click(window, next1);
T('advances to step 2 and marks step 1 done',
  $('.gc-panel[data-step="2"]').classList.contains('active') && $$('#gcProgress .gc-step')[0].classList.contains('done'));
click(window, $('.gc-panel[data-step="2"] .gc-prev'));
T('Back returns to step 1 with the answer still on',
  $('.gc-panel[data-step="1"]').classList.contains('active') &&
  !!$('.gc-panel[data-step="1"] .gc-opt.on'));

at('3 budget slider');
/* ── 3 · the budget slider is derived from REAL prices ────────────────────── */
click(window, $('.gc-panel[data-step="1"] .gc-next'));
click(window, $('.gc-panel[data-step="2"] .gc-opt[data-val="festive"]'));
click(window, $('.gc-panel[data-step="2"] .gc-next'));
const rng = $('#gcBudRange');
const priced = SH.state.productsCache.filter(p => p.active !== false)
  .map(p => Math.round(SH.price(p).total)).filter(Boolean).sort((a, b) => a - b);
const lo = Number(rng.min), hi = Number(rng.max);
T('budget range brackets the actual catalogue',
  priced.length > 0 && lo <= priced[0] + 1000 && hi >= priced[priced.length - 1] - 1000,
  `slider ${lo}…${hi} vs pieces ${priced[0]}…${priced[priced.length - 1]}`);
T('budget slider steps in whole rupees, not 1-rupee noise', Number(rng.step) >= 500, String(rng.step));
type(window, rng, String(priced[priced.length - 1]));
T('the readout follows the slider', /₹/.test($('#gcBudDisp').textContent), $('#gcBudDisp').textContent);

at('4 results');
/* ── 4 · results: real pieces, store prices, no invention ─────────────────── */
click(window, $('.gc-panel[data-step="3"] .gc-next'));
click(window, $('.gc-panel[data-step="4"] .gc-opt[data-val="traditional"]'));
click(window, $('.gc-panel[data-step="4"] .gc-next'));
const grid = await until(() => $('#gcResults.active'), 4000);
T('results panel opens after the last answer', !!grid);
const cards = $$('#gcGrid .p-card');
const empties = $$('#gcGrid .gc-empty');
T('it answers with at most three pieces', cards.length <= 3 && (cards.length > 0 || empties.length === 1),
  `${cards.length} cards, ${empties.length} empty-panels`);

const ids = cards.map(c => c.dataset.pid);
const inCache = ids.every(id => SH.state.productsCache.some(p => p.id === id));
T('every recommended piece is a live catalogue product (nothing invented)', inCache, ids.join(','));
T('recommendations are active products only',
  ids.every(id => { const p = SH.state.productsCache.find(x => x.id === id); return p && p.active !== false; }));
const cats = new Set(ids.map(id => (SH.state.productsCache.find(p => p.id === id) || {}).category));
const shelfCats = new Set(SH.state.productsCache.map(p => p.category));
T(shelfCats.size > 1 ? 'the three are category-varied, not the same shelf three times'
                     : 'a single-shelf catalogue is not faked into variety (rings only → rings shown)',
  shelfCats.size > 1 ? cats.size >= Math.min(2, ids.length) : cats.size === 1,
  [...cats].join(',') + ' from ' + shelfCats.size + ' shelf(ves)');
T('no piece is recommended twice', new Set(ids).size === ids.length, ids.join(','));
const budget = JSON.parse(window.sessionStorage.getItem('shv_gift_concierge') || '{}').answers?.budget;
const over = ids.map(id => {
  const p = SH.state.productsCache.find(x => x.id === id);
  return Math.round(SH.price(p).total);
}).filter(t => t > budget * 1.25);
T('nothing shown is wildly over the stated budget', over.length === 0, over.join(','));
for (const c of cards.slice(0, 3)) {
  const p = SH.state.productsCache.find(x => x.id === c.dataset.pid);
  const want = '₹' + SH.price(p).total.toLocaleString('en-IN');
  const txt = c.textContent.replace(/\s+/g, ' ');
  T('card prints the store\'s own price for ' + p.sku + ' (' + want + ')', txt.includes(want),
    'card text: ' + txt.slice(0, 90));
}
T('the cards are the shop’s own cards (Quick View + compare wired)',
  cards.length === 0 || (cards[0].querySelector('[data-pid]') !== null),
  cards.length ? cards[0].className : 'no cards');

at('5 recap + persistence');
/* ── 5 · recap, persistence, restart ──────────────────────────────────────── */
const recap = $('#gcRecap').textContent.replace(/\s+/g, ' ').trim();
T('recap names the brief in words, not codes', /Daughter/.test(recap) && /Festive/.test(recap), recap);
window.location.hash = '#/rates';
await until(() => ($('#view').textContent || '').trim().length > 40, 4000);
window.location.hash = '#/';
const backAgain = await until(() => $('#gcResults.active'), 6000);
T('the brief + its results survive leaving and coming back (sessionStorage)', !!backAgain);
click(window, $('#gcRestart'));
await wait(180);
T('Start over returns to step 1 and forgets the answers',
  $('.gc-panel[data-step="1"]').classList.contains('active') && !$('#gcResults').classList.contains('active') &&
  $$('.gc-opt.on').length === 0);

at('6 empty catalogue');
/* ── 6 · an unstocked store must not show a quiz at all ───────────────────── */
const keep = SH.state.productsCache;
SH.state.productsCache = [];
const mountedNow = $('#giftConcierge');
if (mountedNow) (mountedNow.closest('.gc-mount') || mountedNow).remove();
await wait(120);
window.location.hash = '#/shop';
await wait(80);
window.location.hash = '#/';
await wait(700);
T('an empty catalogue renders no concierge (no empty quiz, ever)', !$('#giftConcierge'));
SH.state.productsCache = keep;

at('7 cleanliness');
/* ── 7 · cleanliness ───────────────────────────────────────────────────────── */
const real = errors.filter(e => !/getContext|Not implemented: (navigation|Window's open)|Could not parse CSS|HTMLFormElement|not found: \/images/i.test(e));
T('zero uncaught errors across the concierge walk', real.length === 0, real.slice(0, 3).join(' | '));
const css = await until(async () => {
  try {
    const r = await fetch(BASE + '/css/gift-concierge.css?v=115FI');
    return r.ok && (await r.text()).includes('.gift-concierge');
  } catch (e) { return null; }
});
T('the restored v42 stylesheet ships with the layer', !!css);

at('done');
clearTimeout(watchdog);
await wait(150);
console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
bad.forEach(b => console.log('  ✗ ' + b));
ok.forEach(o => console.log('  ✓ ' + o));
process.exit(bad.length ? 1 : 0);
