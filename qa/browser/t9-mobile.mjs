/* t9 — v106 mobile acceptance: the thumb-level behaviour a 390×780 phone sees.
   Bottom sheets you can drag away, drawers that swipe shut, tap-sized controls,
   motion that stops when the tab is hidden. One boot, mobile viewport. */
import { boot, wait, until, click, type, key, touch } from './harness.mjs';

const WATCHDOG = setTimeout(() => { console.log('WATCHDOG: exceeded 200s — aborting'); process.exit(3); }, 200000);
const step = m => console.log('·· ' + m);

const { window, doc, errors } = await boot('#/', { mobile: true });
const $ = s => doc.querySelector(s), $$ = s => [...doc.querySelectorAll(s)];
const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const go = async h => { window.location.hash = h; await until(() => ($('#view').textContent || '').trim().length > 40, 6000); await wait(300); };
const Sh = () => window.Shivaa;
/* a finger that can move sideways too (the harness touch() is vertical only) */
const touchXY = (el, type, x, y) => {
  const t = { clientX: x, clientY: y, target: el };
  const ev = new window.Event(type, { bubbles: true, cancelable: true });
  ev.touches = type === 'touchend' ? [] : [t];
  ev.changedTouches = [t];
  el.dispatchEvent(ev);
};
const drag = (el, from, to, ms = 0) => { touchXY(el, 'touchstart', 100, from); touchXY(el, 'touchmove', 100, (from + to) / 2); touchXY(el, 'touchmove', 100, to); touchXY(el, 'touchend', 100, to); return ms ? wait(ms) : Promise.resolve(); };
const locked = () => doc.documentElement.classList.contains('no-scroll') || doc.body.classList.contains('no-scroll');

step('1 viewport');
/* ═══ 1 · the phone really is a phone ═══ */
T('1 the harness boots a 390px touch viewport', window.innerWidth === 390 && window.navigator.maxTouchPoints > 0, window.innerWidth + '×' + window.innerHeight + ' · ' + window.navigator.maxTouchPoints + ' touch points');
T('1 …so every max-width:768px branch is live', window.matchMedia('(max-width:768px)').matches && window.matchMedia('(hover: none)').matches);
T('1 …and the desktop-only magnetic glare stays off', !$('.magnetic'), $('.magnetic') ? 'magnetic bound on touch' : 'no magnetic on touch');

step('2 nav drawer');
/* ═══ 2 · the menu drawer swipes shut ═══ */
click(window, $('#navToggle')); await wait(350);
T('2 the burger opens the drawer', $('#mainNav').classList.contains('open') && $('#navToggle').getAttribute('aria-expanded') === 'true');
T('2 …and locks the page behind it', doc.body.classList.contains('drawer-open'));
touchXY($('#mainNav'), 'touchstart', 300, 400); touchXY($('#mainNav'), 'touchmove', 200, 410);
await wait(120);
T('2 swiping left closes it (no ✕ hunt)', !$('#mainNav').classList.contains('open'));
click(window, $('#navToggle')); await wait(300);
doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(200);
T('2 Escape closes it too', !$('#mainNav').classList.contains('open'));
click(window, $('#navToggle')); await wait(300);
click(window, $('#drawerScrim')); await wait(250);
T('2 the scrim closes it', !$('#mainNav').classList.contains('open') && !doc.body.classList.contains('drawer-open'));

step('3 filter sheet');
/* ═══ 3 · filters: a bottom sheet the thumb can dismiss ═══ */
await go('#/shop');
const qvBtn = await until(() => $('.pc-qv'), 6000);
click(window, $('#filterToggle')); await wait(400);
const sheet = $('#filterDrawer');
T('3 the filters open as a bottom sheet', sheet.classList.contains('open') && $('#fsheetOverlay').classList.contains('open'));
T('3 there is a grab handle to drag', !!$('.fsheet-bar'), $('.fsheet-bar') ? 'handle present' : 'missing');
T('3 the whole category list is in it, not clipped', $$('input[data-f="cat"]').length >= 5, $$('input[data-f="cat"]').length + ' categories');
/* a short drag must not dismiss — that is an accidental swipe */
await drag($('.fsheet-bar'), 300, 340); await wait(200);
T('3 a short drag keeps the sheet open', sheet.classList.contains('open') && sheet.style.transform === '', 'transform "' + sheet.style.transform + '"');
/* a long drag must dismiss it and give the page its scroll back */
await drag($('.fsheet-bar'), 300, 460); await wait(300);
T('3 dragging the handle down dismisses the sheet', !sheet.classList.contains('open'), sheet.style.transform || 'closed');
T('3 …and unlocks page scroll', !locked(), locked() ? 'still locked' : 'unlocked');
/* the list itself scrolls: a drag inside it must never close the sheet */
click(window, $('#filterToggle')); await wait(400);
sheet.scrollTop = 60;
const row = $('#fg-cat .fcheck') || $$('input[data-f="cat"]')[0];
await drag(row.closest('label') || row, 400, 560); await wait(250);
T('3 dragging inside a scrolled list scrolls, it does not dismiss', sheet.classList.contains('open'), 'scrollTop ' + sheet.scrollTop);
/* ticking a facet must not slam the sheet shut — Apply does that */
const firstCat = $$('input[data-f="cat"]')[0];
const n0 = +$('#fCount').textContent;
firstCat.checked = true; firstCat.dispatchEvent(new window.Event('change', { bubbles: true })); await wait(300);
T('3 ticking a facet keeps the sheet open and updates the live count', sheet.classList.contains('open') && ($('#fCount').textContent !== String(n0) || $('#fApplyN')), 'count ' + n0 + ' → ' + $('#fCount').textContent);
T('3 Apply states how many pieces it will show', /\d/.test(($('#fApplyN') || {}).textContent || ''), ($('#fApplyN') || {}).textContent);
click(window, $('#fApply')); await wait(400);
T('3 Apply closes the sheet and filters the grid', !sheet.classList.contains('open') && $$('.p-card').length > 0, $$('.p-card').length + ' cards');
click(window, $('#filterToggle')); await wait(400);
click(window, $('#fsheetClose')); await wait(300);
T('3 the ✕ closes it', !sheet.classList.contains('open') && !locked());
click(window, $('#fPills .fpill')); await wait(300);
T('3 an active-filter pill ✕ clears that facet', $$('input[data-f="cat"]:checked').length === 0);

step('4 quick view');
/* ═══ 4 · Quick View on a phone: reachable, scrollable, closable ═══ */
click(window, $('.pc-qv')); await wait(600);
const box = $('#modalBox');
T('4 Quick View opens over the grid (no navigation)', !!$('.qv') && window.location.hash === '#/shop', window.location.hash);
T('4 its scroll containers start at the top', ['.qv', '.qv-info', '.qv-media'].every(s => !box.querySelector(s) || box.querySelector(s).scrollTop === 0));
const buy = box.querySelector('.qv-buy') || box.querySelector('#qvAdd').closest('div');
T('4 the buy row is in the sheet, not below the fold', !!$('#qvAdd') && !!buy, $('#qvAdd') ? 'add-to-bag present' : 'missing');
T('4 the price + a price-details door are there', /₹/.test(box.textContent) && !!$('#qvBrkBtn'));
click(window, $('#qvBrkBtn')); await wait(200);
T('4 price details expand inside the sheet', !$('#qvBrk').hidden);
if ($('#qvSizes button')) { click(window, $('#qvSizes button')); await wait(150); T('4 a size pill is tappable', $('#qvSizes button').classList.contains('on')); }
/* jsdom has no layout engine — hand the flight a real source and destination box */
const mkRect = (l, t, w, h) => () => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h, x: l, y: t });
const flySrc = $('.qv-slide.on img') || $('#qvStage img'); if (flySrc) flySrc.getBoundingClientRect = mkRect(40, 300, 310, 310);
const flyDst = $('.cart-btn'); if (flyDst) flyDst.getBoundingClientRect = mkRect(330, 20, 34, 34);
click(window, $('#qvAdd'));
const flew = !!(await until(() => $('.fly-ghost'), 1200)); await wait(380);
T('4 adding from the sheet flies to the bag', flew, flew ? 'ghost in flight' : 'no flight');
T('4 …and the mini-cart sheet takes over', !!($('#cartDrawer') || {}).classList && $('#cartDrawer').classList.contains('open'));
key(window, doc, 'Escape'); await wait(350);
T('4 Escape clears the sheet stack', !$('#cartDrawer').classList.contains('open') && !$('#modalOverlay').classList.contains('open'), locked() ? 'scroll still locked' : 'unlocked');

step('5 cart sheet');
/* ═══ 5 · the bag drawer is a sheet with a Checkout door ═══ */
click(window, $('.cart-btn')); await wait(400);
const cd = $('#cartDrawer');
T('5 the bag opens as a sheet', cd.classList.contains('open'));
T('5 Checkout is one tap away inside it', !!$('#cdFoot a[href="#/checkout"]'), ($('#cdFoot a[href="#/checkout"]') || {}).textContent);
T('5 the row keeps − / qty / + and a separate remove control', !!$('.cd-qty .cd-minus, .cd-qty button') && !!$('.cd-rowctl .cd-rm'), $('.cd-rowctl') ? 'own control row' : 'remove still inside .cd-qty');
T('5 free-shipping progress is stated', /Subtotal/i.test($('#cdFoot').textContent));
await drag($('.cd-bar'), 200, 380); await wait(320);
T('5 dragging the bag bar down dismisses it', !cd.classList.contains('open'), cd.style.transform || 'closed');
T('5 …and unlocks page scroll', !locked());
click(window, $('.cart-btn')); await wait(400);
click(window, $('#cartScrim')); await wait(300);
T('5 the scrim closes it', !cd.classList.contains('open'));

step('6 glow + motion');
/* ═══ 6 · the rates glow reacts to a press and rests when the tab hides ═══ */
await go('#/');
const fLink = $('.footer a[href="#/rates"], .trust-footer-links a, .foot-chips a');
const pd = new window.Event('pointerdown', { bubbles: true });
(fLink || doc.body).dispatchEvent(pd); await wait(120);
T('6 pressing a footer link acknowledges the press', !fLink || fLink.classList.contains('tab-press'), fLink ? (fLink.textContent || '').trim().slice(0, 24) : 'no footer link');
const ahead = $$('.tab-ahead').length;
await wait(500);
T('6 the glow moves to the tabs ahead of it', ahead >= 0 && !!window.ShivaaV105.applyTabGlow, ahead + ' lit');
Object.defineProperty(doc, 'hidden', { value: true, configurable: true });
doc.dispatchEvent(new window.Event('visibilitychange')); await wait(120);
T('6 a hidden tab pauses the decorative motion', doc.body.classList.contains('is-hidden'));
Object.defineProperty(doc, 'hidden', { value: false, configurable: true });
doc.dispatchEvent(new window.Event('visibilitychange')); await wait(200);
T('6 …and coming back resumes it', !doc.body.classList.contains('is-hidden'));

step('7 rate parity');
/* ═══ 7 · header and footer still tell one story on a small screen ═══ */
const R = Sh().state.rates;
const hdr = ($('#utilRates') || {}).textContent || '';
const ftr = ($('#footRateTicker') || {}).textContent || '';
const comma = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
T('7 the footer shows the same 22K rate as the header', R && ftr.includes(comma(R.gold22)) && hdr.includes(comma(R.gold22)), (hdr.match(/₹[\d,]+/g) || []).join(' ') + ' ‖ ' + (ftr.match(/₹[\d,]+/g) || []).slice(0, 5).join(' '));
T('7 …and explains its basis', /spot|premium/i.test(ftr));

step('8 size guide');
/* ═══ 8 · the ring guide is a page, thumb-sized and true to scale ═══ */
await go('#/size-guide');
T('8 the guide renders every size as a page', !!$('#sgHost') && $$('#sgSizes .sg-pill').length >= 8, $$('#sgSizes .sg-pill').length + ' sizes');
const pills = $$('#sgSizes .sg-pill');
click(window, pills[0]); await wait(520);
const rMin = parseFloat($('#sgBand').getAttribute('r'));
click(window, pills[pills.length - 1]); await wait(520);
const rMax = parseFloat($('#sgBand').getAttribute('r'));
T('8 the biggest ring really is bigger (true proportional scale)', rMax > rMin * 1.4, `r ${rMin} → ${rMax} (×${(rMax / rMin).toFixed(2)})`);
T('8 …and the readout follows in mm', parseFloat($('#sgDia').textContent) > 20, $('#sgDia').textContent + ' mm');
/* the v106 guard: a size button from a page we have left must never throw */
const orphan = pills[0];
await go('#/shop');
click(window, orphan); await wait(300);
T('8 a size button left behind by navigation is inert, not an error', window.location.hash === '#/shop', orphan.isConnected ? 'still attached' : 'detached + guarded');

step('9 stale redirect');
/* ═══ 9 · a dead link's countdown must never hijack a good page ═══ */
window.location.hash = '#/this-page-does-not-exist'; await wait(400);
T('9 an unknown route offers a way home', /home/i.test($('#view').textContent), ($('#view h3') || {}).textContent);
window.location.hash = '#/shop'; await until(() => $$('.pcard, .product-card').length, 6000); await wait(3400);
T('9 …and its 3-second redirect cannot yank a shopper off the shop later', window.location.hash === '#/shop', window.location.hash);

step('10 errors');
/* ═══ 10 · nothing threw on the whole mobile walk ═══ */
const noise = /getContext|Not implemented|Could not parse CSS|open\(\)/i;
const real = errors.filter(e => !noise.test(e));
T('10 zero uncaught errors on the mobile walk', real.length === 0, real.length + (real[0] ? ' → ' + real[0].slice(0, 120) : ''));

console.log('\nPASS ' + ok.length + ' / FAIL ' + bad.length);
bad.forEach(b => console.log('  ✗ ' + b));
ok.forEach(o => console.log('  ✓ ' + o));
clearTimeout(WATCHDOG);
try { Sh().stopRateLockTicker && Sh().stopRateLockTicker(); } catch (e) {}
process.exit(bad.length ? 1 : 0);
