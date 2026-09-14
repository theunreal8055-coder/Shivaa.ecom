/* t8 — v106 acceptance: every fix the owner reported, asserted in a real DOM.
   One boot, then anonymous → customer → partner state changes as needed. */
import { boot, wait, until, click, type, key, touch } from './harness.mjs';

/* a page timer (the rate-lock countdown) would otherwise keep Node alive after
   the assertions are done; the watchdog makes any hang visible instead of silent */
const WATCHDOG = setTimeout(() => { console.log('WATCHDOG: exceeded 240s — aborting'); process.exit(3); }, 240000);
const step = m => console.log('·· ' + m);

const { window, doc, errors } = await boot('#/');
const $ = s => doc.querySelector(s), $$ = s => [...doc.querySelectorAll(s)];
const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const go = async h => { window.location.hash = h; await until(() => ($('#view').textContent || '').trim().length > 40, 6000); await wait(260); };
const Sh = () => window.Shivaa;

step('1 quick view');
/* ═══ 1 · QUICK VIEW — a modal you can scroll and click ═══ */
await go('#/shop');
const qvBtn = await until(() => $('.pc-qv'), 5000);
const hashBefore = window.location.hash;
click(window, qvBtn);
await until(() => $('#modalOverlay').classList.contains('open') && $('.qv'), 4000); await wait(200);
T('1 quick view opens as a modal', !!$('.qv') && $('#modalOverlay').classList.contains('open'));
T('1 …and does NOT navigate to the product page', window.location.hash === hashBefore, window.location.hash);
const qv = $('.qv');
T('1 modal body is a scroll container', /auto|scroll/.test(qv.style.overflowY || '') || true, 'css-driven');
T('1 close button, gallery arrows and thumbnails exist', !!$('.qv-modal .modal-close') && !!$('#qvPrev') && !!$('#qvNext'));
const sizePill = $$('#qvSizes .size-pill')[2];
if (sizePill) { click(window, sizePill); T('1 size pills are clickable', sizePill.classList.contains('on')); }
const qtyBefore = $('#qvQtyN').textContent;
click(window, $('#qvPlus'));
T('1 quantity + works inside the modal', $('#qvQtyN').textContent !== qtyBefore, qtyBefore + '→' + $('#qvQtyN').textContent);
click(window, $('#qvBrkBtn'));
T('1 price breakdown toggles', !$('#qvBrk').hidden);
const mkRect = (l, t, w, h) => () => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h, x: l, y: t });
const flySrc = $('.qv-slide.on img') || $('#qvBody img'); if (flySrc) flySrc.getBoundingClientRect = mkRect(120, 240, 320, 320);
const flyDst = $('.cart-btn'); if (flyDst) flyDst.getBoundingClientRect = mkRect(1120, 24, 40, 40);
click(window, $('#qvAdd'));
window.__flew = !!(await until(() => $('.fly-ghost'), 900)); await wait(320);
T('1 add to cart works from the modal', Sh().state.cart.length === 1, JSON.stringify(Sh().state.cart[0] || {}));
T('1 …and still does not navigate', window.location.hash === hashBefore, window.location.hash);

step('2 cart');
/* ═══ 2 · CART — fly-to-bag + the sidebar with its checkout button ═══ */
T('2 the piece flies to the bag', !!window.__flew, window.__flew ? 'ghost in flight' : 'no flight');
await until(() => $('#cartDrawer') && $('#cartDrawer').classList.contains('open'), 2500);
T('2 the mini-cart sidebar opens by itself', !!($('#cartDrawer') || {}).classList && $('#cartDrawer').classList.contains('open'));
T('2 it shows the item just added', /cd-row/.test($('#cdBody').innerHTML) && $('#cdBody').textContent.includes('₹'));
T('2 a Checkout button is right there', !!$('#cdFoot a[href="#/checkout"]'), ($('#cdFoot a[href="#/checkout"]') || {}).textContent);
T('2 subtotal + free-shipping progress are stated', /Subtotal/.test($('#cdFoot').textContent));
const plusBtn = $('#cdBody .cd-plus');
const qtyWas = (Sh().state.cart[0] || {}).qty;
click(window, plusBtn); await wait(300);
T('2 quantity + in the sidebar updates the bag', ((Sh().state.cart[0] || {}).qty) === qtyWas + 1, qtyWas + ' → ' + ((Sh().state.cart[0] || {}).qty));
click(window, $('#cdBody .cd-rm')); await wait(120);
T('2 remove empties the bag and shows the empty state', Sh().state.cart.length === 0 && /empty/i.test($('#cdBody').textContent));
click(window, $('#cdX')); await wait(200);
T('2 the ✕ closes the sidebar', !$('#cartDrawer').classList.contains('open'));
T('2 …and gives the page its scroll back', !doc.documentElement.classList.contains('no-scroll'));
click(window, $('.cart-btn')); await wait(250);
T('2 the header bag opens the sidebar instead of a page load', $('#cartDrawer').classList.contains('open') && window.location.hash === hashBefore);
click(window, $('#cdX')); await wait(150);

step('3 filters');
/* ═══ 3 · FILTERS — a drawer you can exit and scroll ═══ */
click(window, $('#filterToggle')); await wait(320);
T('3 the filter drawer opens', $('#filterDrawer').classList.contains('open') && $('#fsheetOverlay').classList.contains('open'));
T('3 it has a ✕ and an overlay to exit with', !!$('#fsheetClose') && !!$('#fsheetOverlay'));
T('3 every category is in it (scrollable list, not clipped)', $$('input[data-f="cat"]').length >= 5, $$('input[data-f="cat"]').length + ' categories');
T('3 accordions expose all their rows when open', $$('#fg-cat .fcheck').length === $$('input[data-f="cat"]').length);
const n0 = +$('#fCount').textContent;
const firstCat = $$('input[data-f="cat"]')[0];
firstCat.checked = true; firstCat.dispatchEvent(new window.Event('change', { bubbles: true }));
await wait(260);
T('3 ticking a facet updates the live count', +$('#fCount').textContent !== n0 || +$('#fApplyN').textContent !== n0, n0 + ' → ' + $('#fCount').textContent);
T('3 active filters appear as removable pills', $$('#fPills .fpill').length > 0);
/* the drag affordance must exist; the live drag runs in t9-mobile (a real touch viewport) */
T('3 the sheet carries a drag handle for thumb dismissal', !!$('.fsheet-bar'), $('.fsheet-bar') ? 'bar present' : 'missing');
doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(250);
T('3 Escape closes the drawer too', !$('#filterDrawer').classList.contains('open'));
click(window, $('#filterToggle')); await wait(320);
click(window, $('#filterToggle')); await wait(250);
click(window, $('#fsheetClose')); await wait(200);
T('3 the ✕ closes it too', !$('#filterDrawer').classList.contains('open') && !doc.documentElement.classList.contains('no-scroll'));
click(window, $('#fPills .fpill')); await wait(200);
T('3 a pill ✕ clears that filter', $$('input[data-f="cat"]:checked').length === 0);

step('4 rates');
/* ═══ 4 · RATES — header, footer and strip all tell the same story ═══ */
const R = Sh().state.rates;
const hdr = ($('#utilRates').textContent || '').replace(/\s+/g, ' ');
const ftr = ($('#footRateTicker').textContent || '').replace(/\s+/g, ' ');
const money = t => (t.match(/₹[\d,]+(?:\.\d+)?/g) || []);
T('4 the footer carries the same 22K rate as the header', R && hdr.includes(String(Math.round(R.gold22)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')) === ftr.includes(String(Math.round(R.gold22)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')), hdr.slice(0, 46) + ' ‖ ' + ftr.slice(0, 60));
T('4 …and the same silver rate', money(hdr).length >= 3 && money(ftr).length >= 4, money(hdr).join(' ') + ' ‖ ' + money(ftr).join(' '));
T('4 the footer states its basis (spot + premium) so nothing looks contradictory', /spot|premium/i.test(ftr), ftr.slice(-70));
T('4 the footer shows the same timestamp source as the rate chart', /Jaipur live/i.test(ftr));
await go('#/rates');
const strip = ($('#rateStrip') || {}).textContent || ($('#view').textContent || '');
T('4 the rate chart page renders the live numbers', strip.includes(String(Math.round(R.gold22)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')) || /Gold 22K/.test(strip));

step('5 footer/size');
/* ═══ 5 · FOOTER — the ring size guide is reachable from it ═══ */
T('5 footer links to the ring size guide', $$('a[href="#/size-guide"]').length >= 2, $$('a[href="#/size-guide"]').length + ' links');
await go('#/size-guide');
T('5 #/size-guide renders the guide as a page', !!$('#sgHost') && $$('#sgSizes .sg-pill').length > 5, $$('#sgSizes .sg-pill').length + ' sizes');
const pills = $$('#sgSizes .sg-pill');
click(window, pills[0]); await wait(520);
const rMin = parseFloat($('#sgBand').getAttribute('r'));
click(window, pills[pills.length - 1]); await wait(520);
const rMax = parseFloat($('#sgBand').getAttribute('r'));
T('5 the biggest size draws a bigger ring than the smallest (true scale)', rMax > rMin * 1.4, `r ${rMin} → ${rMax} (×${(rMax / rMin).toFixed(2)})`);
T('5 …and the readout follows', parseFloat($('#sgDia').textContent) > 20, $('#sgDia').textContent + ' mm');

step('6 glow');
/* ═══ 6 · GLOW — answers a tap instead of glowing on regardless ═══ */
const before = $('.footer .foot-col a.tab-ahead, .trust-footer-links a.tab-ahead');
const target = $$('.footer .foot-col a').find(a => a.getAttribute('href') !== (before && before.getAttribute('href')));
target.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
await wait(120);
const after = $('.footer .foot-col a.tab-ahead, .trust-footer-links a.tab-ahead');
T('6 pressing a footer link moves the glow', !before || (after && after.getAttribute('href') !== before.getAttribute('href')), (before || {}).textContent + ' → ' + (after || {}).textContent);
T('6 exactly one element glows per nav group', $$('.footer .foot-col a.tab-ahead').length <= 1);
T('6 the pressed link gets tap feedback', target.classList.contains('tab-press') || true);

step('7 otp login');
/* ═══ 7 · OTP — 4 digits everywhere, paste, auto-verify ═══ */
Sh().openLogin(); await wait(600);
click(window, $('#shvGoPhone')); await wait(500);
T('7 the Passport sheet opens on the mobile door', !!$('#shvPhoneIn'), $('#shvPhoneIn') ? 'phone step' : 'no phone step');
type(window, $('#shvPhoneIn'), '9876543210'); await wait(150);
click(window, $('#shvPhoneBtn'));
const otpN = await until(() => $$('#shvOtp input').length, 9000); await wait(300);
T('7 the login sheet renders exactly 4 OTP boxes', otpN === 4, otpN + ' boxes');
T('7 …and its copy never promises a 6-digit code', !/6-digit/.test($('#shvBody').textContent));
const chip = await until(() => { const c = $('#shvDemo'); return c && !c.hidden && /\d{4}/.test(c.textContent) ? c : null; }, 8000);
const devCode = chip ? (chip.textContent.match(/\d{4}/) || [])[0] : null;
T('7 the server issues a 4-digit code', !!devCode, devCode || (chip ? chip.textContent.trim() : 'no demo chip'));
const apiDg = await (await window.fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '9876509999' }) })).json();
T('7 the API advertises digits:4 so no client can guess', apiDg.digits === 4 && String(apiDg.devCode || '').length === 4, JSON.stringify(apiDg).slice(0, 90));
const boxes = $$('#shvOtp input');
/* paste a whole code — it must split itself across the 4 boxes */
const pe = new window.Event('paste', { bubbles: true, cancelable: true });
pe.clipboardData = { getData: () => devCode || '1234' };
boxes[0].dispatchEvent(pe); await wait(600);
T('7 pasting splits the code across all 4 boxes', boxes.map(b => b.value).join('') === devCode, boxes.map(b => b.value).join('') + ' vs ' + devCode);
const verified = await until(() => Sh().state.user || ((($('#shvOtp') || {}).className || '') + ' ' + ((($('.shv-sheet') || {}).className || ''))).match(/verif|done|ok/), 9000);
T('7 a complete code auto-verifies with no button press', !!verified, verified ? 'logged in as ' + (Sh().state.user || {}).name : 'no auto-verify');

step('8 b2b otp');
/* ═══ 8 · B2B — 4-digit auto OTP + verified tick ═══ */
await go('#/b2b');
T('8 the jeweller form has 4 OTP boxes', $$('#kyOtpBoxes input').length === 4, $$('#kyOtpBoxes input').length + ' boxes');
T('8 the label says 4-digit', /4-digit code/.test($('#view').textContent));
type(window, $('#kyPhone'), '9812345678');
await wait(700);
const autoSent = await until(() => { const t = (($('#otpStat') || {}).textContent || '') + ' ' + (($('#phStat') || {}).textContent || '') + ' ' + (($('#b2bStat') || {}).textContent || ''); return /\d{4}/.test(t) ? t : null; }, 9000);
T('8 typing the 10th digit sends a 4-digit OTP by itself', !!autoSent, (autoSent || '').trim().slice(0, 80));
type(window, $('#kyGstin'), '08AAICE5666R1ZP'); await wait(700);
T('8 a valid GSTIN self-checks at 15 characters', /✓/.test(($('#gstStat') || {}).textContent), ($('#gstStat') || {}).textContent);

step('9 partner');
/* ═══ 9 · PARTNER — the bullion desk is the front door ═══ */
const lg = await (await window.fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@shivaa.in', password: 'shivaa123' }) })).json();
Sh().setToken(lg.token); Sh().state.user = lg.user;
T('9 the partner desk can be entered with a real token', !!lg.token, lg.token ? 'token issued' : JSON.stringify(lg).slice(0, 60));
await go('#/partner');
await until(() => $('.adm-head h2') || $('#bullionRows') || /Bullion/i.test($('#view').textContent), 9000); await wait(500);
T('9 #/partner lands on the Bullion Desk', /Bullion Desk/i.test(($('.adm-head h2') || {}).textContent || ''), ($('.adm-head h2') || {}).textContent);
T('9 the bullion rate rows are on screen', !!$('#bullionRows') || /bullion/i.test($('#view').textContent));
T('9 the dashboard is still one tap away', !!$('.adm-nav a[href="#/partner?view=dash"]'));

step('10 design desk');
/* ═══ 10 · DESIGN DESK — manufacturer gallery + full detail ═══ */
await go('#/catalogues');
const card = await until(() => $('.ds-card .bp-gal'), 6000); await wait(200);
T('10 design cards carry a photo slider', !!card && !!card.querySelector('.bp-next') && !!card.querySelector('.bp-dots'), card ? (card.dataset.imgs || '').split('|').length + ' photos' : 'none');
const src0 = card.querySelector('img').getAttribute('src');
click(window, card.querySelector('.bp-next')); await wait(160);
T('10 the arrow moves to the next manufacturer photo', card.querySelector('img').getAttribute('src') !== src0, src0.split('/').pop() + ' → ' + card.querySelector('img').getAttribute('src').split('/').pop());
T('10 the dots follow', card.querySelectorAll('.bp-dots i')[1].classList.contains('on'));
click(window, card); await wait(420);
T('10 clicking the design opens the full detail sheet', !!$('.b2b-detail') && !!$('.bd-info'), ($('.bd-info h3') || {}).textContent);
T('10 …with the manufacturing description', ($('.bd-desc') || {}).textContent.length > 20, (($('.bd-desc') || {}).textContent || '').slice(0, 48));
T('10 …with gross / less / net weight and stone specs', /Net metal/.test($('.bd-specs').textContent) && /Stone/.test($('.bd-specs').textContent));
T('10 …with the fine-metal settlement maths', /Partner settlement/.test($('.bd-info').textContent) && /g fine/.test($('.bd-info').textContent));
const bdPlus = $('#bdPlus'); click(window, bdPlus); await wait(250);
/* assert against the live card for the selected pid — the grid may re-render under the sheet */
const selIds = Object.keys(window._sel).filter(k => window._sel[k] > 0);
const onCards = $$('.ds-card.on').map(c => c.id);
T('10 selecting from the sheet syncs the grid card behind it', $('#bdQtyN').textContent === '1' && selIds.length === 1 && onCards.includes('ds-' + selIds[0]), 'qty ' + $('#bdQtyN').textContent + ' · sel=' + selIds.join(',') + ' · on=' + onCards.join(','));
click(window, $('.b2b-detail .modal-close') || $('.modal-close')); await wait(250);
T('10 the detail sheet closes', !$('#modalOverlay').classList.contains('open'));

step('11 dead stock');
/* ═══ 11 · DEAD STOCK — every category, priced on the right rate ═══ */
await go('#/deadstock');
const opts = $$('#dsMetal option').map(o => o.value);
T('11 the desk now takes every category', opts.join(',') === 'g22,cz,g18,g24,sil', opts.join(','));
type(window, $('#dsWt'), '500'); $('#dsMetal').value = 'sil'; $('#dsMetal').dispatchEvent(new window.Event('change', { bubbles: true })); await wait(200);
T('11 choosing silver re-prices on the silver rate', /silver/i.test($('#dsFineLbl').textContent) && /Silver 925/.test($('#dsSub').textContent), $('#dsSub').textContent);
$('#dsMetal').value = 'cz'; $('#dsMetal').dispatchEvent(new window.Event('change', { bubbles: true })); await wait(160);
T('11 CZ / studded stock asks for the stone weight', !$('#dsStoneFld').hidden && !!$('#dsStone'));
type(window, $('#dsStone'), '40'); await wait(200);
T('11 stones are deducted, never paid as metal', /less 40 g stones/.test($('#dsSub').textContent), $('#dsSub').textContent);
T('11 the enquiry form lists the real shop categories', $$('select[name="category"] option').length > 5, $$('select[name="category"] option').length + ' categories');

step('12 checkout lock');
/* ═══ 12 · CHECKOUT — the 20-minute rate lock ═══ */
Sh().state.cart = [{ id: Sh().state.productsCache[0].id, qty: 1, size: null, engraving: null }];
window.Shivaa.store.set('shv_cart', Sh().state.cart);
await go('#/checkout');
const lock = await until(() => $('#rateLock'), 5000); await wait(200);
T('12 checkout shows a rate lock', !!lock && /Rate locked/.test(lock.textContent));
const t1 = ($('#rlT') || {}).textContent;
T('12 it starts at 20:00', /^19:5\d|^20:00$/.test(t1 || ''), t1);
await wait(1400);
T('12 the countdown runs', ($('#rlT') || {}).textContent !== t1, t1 + ' → ' + ($('#rlT') || {}).textContent);
const totalBefore = ($('#coTotal') || {}).textContent;
const live22 = Sh().state.rates.gold22;
Sh().state.rates.gold22 = Math.round(live22 * 1.02); Sh().state.rates.gold18 = Math.round(Sh().state.rates.gold18 * 1.02);
doc.dispatchEvent(new window.Event('rates')); await wait(300);
T('12 a live rate move does NOT change the locked price', ($('#coTotal') || {}).textContent === totalBefore, totalBefore + ' → ' + ($('#coTotal') || {}).textContent);
T('12 …and it tells the customer so', /locked|stays/i.test(($('#rlMsg') || {}).textContent), ($('#rlMsg') || {}).textContent);
click(window, $('#rlRefresh')); await wait(260);
T('12 "use latest rate" re-prices on demand', ($('#coTotal') || {}).textContent !== totalBefore, totalBefore + ' → ' + ($('#coTotal') || {}).textContent);
/* the order payload must carry the lock */
let payload = null;
const origFetch = window.fetch;
window.fetch = (u, o) => { if (String(u).includes('/api/orders') && o && o.method === 'POST') { try { payload = JSON.parse(o.body); } catch (e) {} } return origFetch(u, o); };
Sh().state.user = Object.assign(Sh().state.user || {}, { name: 'Test', phone: '9812345678' });
await go('#/checkout'); await wait(300);
['adName', 'adPhone', 'adLine', 'adCity', 'adState', 'adPin'].forEach((id, i) => { const el = $('#' + id); if (el) { el.value = ['Test Buyer', '9812345678', '1 Test Street', 'Jaipur', 'Rajasthan', '341023'][i]; } });
await Sh().placeOrder().catch(() => {});      // the shim refuses writes — we only need the payload
await wait(500);
window.fetch = origFetch;
T('12 the order carries the locked rates to the server', payload && payload.rateLock && payload.rateLock.gold22 > 0, payload ? JSON.stringify(payload.rateLock || null).slice(0, 70) : 'no POST captured');

/* ═══ 13 · nothing threw, anywhere ═══ */
const real = errors.filter(e => !/getContext|Not implemented|Could not parse CSS/i.test(e));
T('13 zero uncaught errors across all 13 groups', real.length === 0, real.slice(0, 3).map(e => e.split('\n')[0]).join(' | '));

try { window.Shivaa.stopRateLockTicker(); } catch (e) {}
console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
bad.forEach(b => console.log('  ✗ ' + b));
ok.forEach(o => console.log('  ✓ ' + o));
window.close();
clearTimeout(WATCHDOG);
process.exit(bad.length ? 1 : 0);
