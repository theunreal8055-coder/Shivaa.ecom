/* t-v236 — THE COUNTER BOOK
   ─────────────────────────────────────────────────────────────────────────
   Six things the desk was still missing, each with a number attached:

     1 · MONEY.    A deal carries its payments (cash / UPI / RTGS / cheque with
                   a reference). Overpaying is refused with the figure still
                   due; a UPI receipt without a UTR is refused; a cancelled
                   deal takes no money. Paid + due = value + TCS, to the rupee.
     2 · LEDGER.   A window of deals with an opening balance carried from before
                   it, so the closing figure is the real balance and not a
                   fresh count from zero.
     3 · INVOICE.  Any slip renders as a GST tax invoice — HSN, TCS 0.1 %, total
                   and the amount in words — from the slip's own numbers.
     4 · TELLING.  A reached alert is CLAIMED once: the second claim returns
                   nothing, so no phone and no reload can announce it twice.
     5 · THE LIMIT. A deal that would cross a partner's rupee limit is refused
                   with all three figures in words; one that fits is accepted.
     6 · THE BOOK.  Search, date range and status filter deals server-side, and
                   the filter survives a tab switch.
   ───────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import { boot, wait, until, BASE, pageFaults } from './harness.mjs';

const WATCHDOG = setTimeout(() => {
  console.log('FAIL watchdog: the suite did not finish in 300 s');
  process.exit(1);
}, 300000);
if (WATCHDOG.unref) WATCHDOG.unref();

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const read = p => fs.readFileSync(p, 'utf8');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const WS = s => String(s || '').replace(/\s+/g, ' ').trim();
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected|mxOrders|metalexchange/i;
const faults = () => pageFaults.filter(f => !NOISE.test(f));
const near = (a, b, d = 1) => Math.abs(Number(a) - Number(b)) <= d;
const stage = m => process.stderr.write('  · ' + m + '\n');

const API = read('cms/api.php');
const ADMIN_RAW = read('cms/js/admin.js');
const ADMIN_J = stripJs(ADMIN_RAW);
const V236_CSS = stripCss(read('cms/css/v236.css'));
const SW = read('cms/sw.js');
const BUNDLE = read('cms/css/shivaa.css');
const ORDER = read('tools/css-bundle-order.txt').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const SHIM = read('qa/preview_shim.py');

const jget = async (p, tok) => {
  const r = await fetch(BASE + p, tok ? { headers: { Authorization: 'Bearer ' + tok } } : {});
  let b = null; try { b = await r.json(); } catch (e) {}
  return { s: r.status, b };
};
const jpost = async (p, body, tok) => {
  const r = await fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
    body: JSON.stringify(body || {}),
  });
  let b = null; try { b = await r.json(); } catch (e) {}
  return { s: r.status, b };
};
const jput = async (p, body, tok) => {
  const r = await fetch(BASE + p, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
    body: JSON.stringify(body || {}),
  });
  let b = null; try { b = await r.json(); } catch (e) {}
  return { s: r.status, b };
};

async function main() {

/* ── 1 · the contract ──────────────────────────────────────────────────── */
stage('contract');
{
  T('layer: v236.css is the last one in the cascade', ORDER[ORDER.length - 1] === 'v236.css', ORDER[ORDER.length - 1]);
  T('layer: it comes directly after v235.css', ORDER[ORDER.length - 2] === 'v235.css', ORDER[ORDER.length - 2]);
  T('layer: it is inside the one stylesheet, exactly once',
    (BUNDLE.match(/\/\* v236\.css \*\//g) || []).length === 1 &&
    BUNDLE.lastIndexOf('/* v236.css */') > BUNDLE.lastIndexOf('/* v235.css */'));
  T('css: money reads in tabular figures', /\.bd-money-strip b[\s\S]{0,200}tabular-nums/.test(V236_CSS));
  T('css: a due figure is amber and a clear one is green',
    /\.bd-money-strip \.due b/.test(V236_CSS) && /\.bd-money-strip \.clear b/.test(V236_CSS));
  T('css: the filter row is thumb-height on touch',
    /@media \(hover: none\)[\s\S]{0,400}min-height: 44px/.test(V236_CSS));
  T('css: paper drops the controls and keeps the rules',
    /@media print[\s\S]{0,300}\.bd-filter[\s\S]{0,80}display: none !important/.test(V236_CSS));
  T('css: no `color: transparent` for the v230/v231 guard to trip over', !/color:\s*transparent/.test(V236_CSS));

  /* server */
  T('api: a payment route exists on a deal', /bullion\/orders\/\(\[\\w-\]\+\)\/pay/.test(API));
  T('api: the ledger route is there', /\$route === 'bullion\/ledger' && \$method === 'GET'/.test(API));
  T('api: an invoice route exists per slip', /bullion\/slips\/\(\[\\w-\]\+\)\/invoice/.test(API));
  T('api: alerts can be claimed once', /\$route === 'bullion\/alerts\/claim' && \$method === 'POST'/.test(API));
  T('api: the rate-lock queue and its answer are routes',
    /\$route === 'bullion\/unfix' && \$method === 'GET'/.test(API) && /bullion\/unfix\/\(\[\\w-\]\+\)\/resolve/.test(API));
  T('api: the limit is read by the partner and written by the office',
    /\$route === 'bullion\/limit'/.test(API) && /Only the office can set a credit limit/.test(API));
  T('api: due = value + TCS − paid, in one function',
    /function bullion_order_total/.test(API) && /function bullion_order_paid/.test(API) && /function bullion_order_due/.test(API));
  T('api: the limit is checked before the deal is written',
    /bullion_outstanding\(\$db, \$pid\)/.test(API) && /against a limit of/.test(API));
  T('api: rupees in words, Indian numbering', /function bullion_words/.test(API) && /'crore'/.test(API) && /'lakh'/.test(API));

  /* service worker */
  T('sw: a notify message from the page draws a notification', /addEventListener\('message'/.test(SW) && /shv-notify/.test(SW));
  T('sw: a real push frame is drawn by the same worker', /addEventListener\('push'/.test(SW) && /showNotification/.test(SW));
  T('sw: tapping an alert lands on the desk, never on the shop',
    /notificationclick[\s\S]{0,400}desk\.html/.test(SW));

  /* the app */
  T('ui: payments, invoices, ledger, queue, limit and alerts are all wired',
    /payForm\(id\)/.test(ADMIN_J) && /async invoice\(slipNo\)/.test(ADMIN_J) && /async secLedger\(host\)/.test(ADMIN_J) &&
    /async secUnfix\(host\)/.test(ADMIN_J) && /async limitForm\(\)/.test(ADMIN_J) && /async notifyOn\(\)/.test(ADMIN_J));
  T('ui: the deals section owns a filter and a money strip',
    /data-bd-filter/.test(ADMIN_J) && /bd-money-strip/.test(ADMIN_J));
  T('ui: the filter is remembered across a tab switch',
    /shv_deal_filter/.test(ADMIN_J) && /dealFilter\(\)/.test(ADMIN_J));
  T('ui: the notification claim is one-shot on the server, not the client',
    /alerts\/claim/.test(ADMIN_J) && /notifiedAt/.test(API));

  /* the honesty fix — the board may not advertise a facility it does not run */
  T('copy: the app no longer promises an unfix it cannot deliver',
    !/Request UNFIX/.test(ADMIN_RAW) && !/unfix \(rate-lock\) for a planned purchase/.test(ADMIN_RAW));
  T('copy: it says the office confirms a rate lock on call',
    /confirms on call/i.test(ADMIN_RAW) || /confirmed by the office on call/i.test(ADMIN_RAW));

  /* mirror */
  T('shim: it answers the same six routes',
    /route == "bullion\/ledger"/.test(SHIM) && /bullion\/slips\/\(\[\\w-\]\+\)\/invoice/.test(SHIM) &&
    /route == "bullion\/alerts\/claim"/.test(SHIM) && /bullion\/unfix\/\(\[\\w-\]\+\)\/resolve/.test(SHIM) &&
    /route == "bullion\/limit"/.test(SHIM) && /bullion\/orders\/\(\[\\w-\]\+\)\/pay/.test(SHIM));
}

/* ── 2 · money, ledger, invoice, claim (over real HTTP) ────────────────── */
stage('http');
const stamp = Date.now();
const phone = '97' + String(stamp).slice(-8);
const otp = await jpost('/api/auth/send-otp', { phone });
await jpost('/api/kyc/verify-otp', { phone, code: (otp.b || {}).devCode });
const apply = await jpost('/api/partners/apply', {
  firm: 'Counter Book Jewellers', contactPerson: 'Book', city: 'Jaipur',
  email: 'book' + stamp + '@example.com', phone, password: 'shivaa123', gstin: '08AABCU9603R1ZN',
});
const TOK = (apply.b || {}).token;
const ME = (apply.b || {}).user || {};
T('http: the partner has a session', apply.s === 200 && !!TOK, JSON.stringify(apply.b).slice(0, 120));
const PID = String(ME.partnerId || '');

const board = await jget('/api/bullion', TOK);
const rows = ((board.b || {}).rows) || [];
const row = rows.find(r => /gold/i.test(r.key)) || rows[0];
T('http: the board answers', board.s === 200 && !!row, rows.length);

const ord = await jpost('/api/bullion/order', { side: 'buy', metKey: row.key, metal: row.label, qty: 10, unit: 'g' }, TOK);
const OID = (ord.b || {}).id;
const VALUE = Number((ord.b || {}).amount) || 0;
const TCS = Math.round(VALUE * 0.001);
const TOTAL = VALUE + TCS;
T('money: the deal is worth value + TCS', OID && VALUE > 0, VALUE + ' + ' + TCS);

const bad1 = await jpost('/api/bullion/orders/' + OID + '/pay', { amount: 0 }, TOK);
T('money: a zero receipt is refused', bad1.s === 400, bad1.b && bad1.b.error);
const bad2 = await jpost('/api/bullion/orders/' + OID + '/pay', { amount: 500, mode: 'upi' }, TOK);
T('money: UPI without a reference is refused, in words', bad2.s === 400 && /reference/i.test((bad2.b || {}).error || ''), bad2.b && bad2.b.error);
const bad3 = await jpost('/api/bullion/orders/' + OID + '/pay', { amount: TOTAL + 1000, mode: 'cash' }, TOK);
T('money: overpaying is refused with the figure still due',
  bad3.s === 400 && /outstanding/i.test((bad3.b || {}).error || '') && /only/i.test((bad3.b || {}).error || ''),
  bad3.b && bad3.b.error);

const pay1 = await jpost('/api/bullion/orders/' + OID + '/pay', { amount: 20000, mode: 'rtgs', ref: 'UTR' + stamp }, TOK);
T('money: an RTGS receipt with its UTR is recorded', pay1.s === 200 && (pay1.b.payment || {}).amount === 20000, pay1.s);
T('money: the deal now owes exactly value + TCS − paid',
  near((pay1.b.order || {}).due, TOTAL - 20000, 1), (pay1.b.order || {}).due);
T('money: paid + due = total, to the rupee',
  near(((pay1.b.order || {}).paid || 0) + ((pay1.b.order || {}).due || 0), TOTAL, 1),
  ((pay1.b.order || {}).paid) + ' + ' + ((pay1.b.order || {}).due) + ' vs ' + TOTAL);

const pay2 = await jpost('/api/bullion/orders/' + OID + '/pay', { amount: TOTAL - 20000, mode: 'cash' }, TOK);
T('money: the balance can be paid in full', pay2.s === 200 && (pay2.b.order || {}).due === 0, (pay2.b.order || {}).due);
const pay3 = await jpost('/api/bullion/orders/' + OID + '/pay', { amount: 100 }, TOK);
T('money: a fully paid deal takes no more money', pay3.s === 400 && /fully paid/i.test((pay3.b || {}).error || ''), pay3.b && pay3.b.error);

const ordCancel = await jpost('/api/bullion/order', { side: 'sell', metKey: row.key, metal: row.label, qty: 2, unit: 'g' }, TOK);
await jpost('/api/bullion/orders/' + (ordCancel.b || {}).id + '/cancel', { reason: 'typo' }, TOK);
const payCancel = await jpost('/api/bullion/orders/' + (ordCancel.b || {}).id + '/pay', { amount: 100 }, TOK);
T('money: a cancelled deal takes no money', payCancel.s === 400 && /cancelled/i.test((payCancel.b || {}).error || ''), payCancel.b && payCancel.b.error);

const other = await jpost('/api/partners/apply', {
  firm: 'Someone Else', contactPerson: 'X', city: 'Ajmer', phone: '96' + String(stamp).slice(-8),
  email: 'x' + stamp + '@example.com', password: 'shivaa123', gstin: '08AABCU9603R1ZN',
});
await jpost('/api/auth/send-otp', { phone: '96' + String(stamp).slice(-8) });
const steal = await jpost('/api/bullion/orders/' + OID + '/pay', { amount: 10, mode: 'cash' }, (other.b || {}).token);
T('money: another jeweller cannot pay against your deal', steal.s === 403 || steal.s === 401, steal.s);

/* ledger */
const led = await jget('/api/bullion/ledger', TOK);
T('ledger: it answers for the month', led.s === 200 && /\d{4}-\d{2}-01/.test((led.b || {}).from || ''), (led.b || {}).from);
T('ledger: the paid deal is a row with a zero due',
  (led.b.rows || []).some(r => r.id === OID && r.due === 0), JSON.stringify((led.b.rows || [])[0] || {}).slice(0, 90));
T('ledger: the cancelled deal is not in the ledger',
  !(led.b.rows || []).some(r => r.id === (ordCancel.b || {}).id));
T('ledger: closing = opening + the window’s due',
  (led.b.totals || {}).closing === (led.b.opening || 0) + ((led.b.totals || {}).due || 0),
  (led.b.opening || 0) + ' + ' + ((led.b.totals || {}).due || 0) + ' vs ' + (led.b.totals || {}).closing);
T('ledger: what was paid in the window is summed',
  near((led.b.totals || {}).paid, TOTAL, 1), (led.b.totals || {}).paid);

/* invoice */
const st1 = await jpost('/api/bullion/orders/' + OID + '/settle', { grams: 4 }, TOK);
const SLIP = (st1.b || {}).slip || {};
T('invoice: a slip exists to invoice', /^DS\d{6}-\d{4}$/.test(SLIP.slipNo || ''), SLIP.slipNo);
const inv = await jget('/api/bullion/slips/' + SLIP.slipNo + '/invoice', TOK);
T('invoice: it renders for the slip', inv.s === 200 && (inv.b || {}).invoiceNo === 'INV/' + SLIP.slipNo, (inv.b || {}).invoiceNo);
T('invoice: gold is HSN 7108', (inv.b || {}).hsn === '7108', (inv.b || {}).hsn);
T('invoice: total = taxable value + TCS',
  (inv.b || {}).total === (inv.b || {}).amount + (inv.b || {}).tcs, (inv.b || {}).total);
T('invoice: TCS is labelled with its section', /206C\(1H\)/.test((inv.b || {}).tcsLabel || ''), (inv.b || {}).tcsLabel);
T('invoice: grams and fine grams come from the slip',
  near((inv.b || {}).grams, 4, 0.001) && (inv.b || {}).fineGrams > 0, (inv.b || {}).grams);
T('invoice: the amount is printed in words', /rupees only$/.test((inv.b || {}).amountWords || ''), (inv.b || {}).amountWords);
const foreign = await jpost('/api/bullion/orders/' + OID + '/settle', { grams: 1 }, (other.b || {}).token);
T('invoice: another jeweller cannot read your slip', foreign.s === 403 || foreign.s === 404, foreign.s);

/* alerts claimed once */
await jpost('/api/bullion/alert', { kind: 'rate', key: row.key, label: row.label, side: 'buy', dir: 'above', target: 1 }, TOK);
const claim1 = await jpost('/api/bullion/alerts/claim', {}, TOK);
T('alerts: a reached target is handed out', claim1.s === 200 && (claim1.b.alerts || []).length >= 1, (claim1.b.alerts || []).length);
const claim2 = await jpost('/api/bullion/alerts/claim', {}, TOK);
T('alerts: the second claim gets nothing — announced once, never twice',
  claim2.s === 200 && (claim2.b.alerts || []).length === 0, (claim2.b.alerts || []).length);

/* rate-lock queue */
const uq = await jpost('/api/bullion/alert', { kind: 'unfix', key: row.key, label: row.label, note: 'need 250 g next week' }, TOK);
T('unfix: a rate-lock request is filed', uq.s === 200, uq.s);
const ulist = await jget('/api/bullion/unfix', TOK);
T('unfix: the jeweller sees it as open', ulist.s === 200 && (ulist.b.requests || []).some(r => r.status === 'open'), (ulist.b.requests || []).length);
const uPid = (ulist.b.requests || []).find(r => r.status === 'open') || {};
const uResolvePartner = await jpost('/api/bullion/unfix/' + uPid.id + '/resolve', { status: 'answered' }, TOK);
T('unfix: a jeweller cannot answer their own request', uResolvePartner.s === 403, uResolvePartner.s);

const owner = await jpost('/api/auth/login', { email: 'owner@shivaa.in', password: 'shivaa123' });
const OWN = (owner.b || {}).token;
T('office: the owner can sign in', owner.s === 200 && !!OWN, owner.s);
const uResolve = await jpost('/api/bullion/unfix/' + uPid.id + '/resolve', { status: 'answered', note: 'locked 250 g at ₹7,200' }, OWN);
T('unfix: the office answers it', uResolve.s === 200 && uResolve.b.status === 'answered', uResolve.s);
const ulist2 = await jget('/api/bullion/unfix', TOK);
T('unfix: the jeweller sees the answer',
  (ulist2.b.requests || []).some(r => r.status === 'answered'), JSON.stringify(ulist2.b.requests || []).slice(0, 80));

/* credit limit */
const lim0 = await jget('/api/bullion/limit', TOK);
T('limit: unset by default, and nothing is refused', lim0.s === 200 && lim0.b.limit === 0, JSON.stringify(lim0.b));
const limSetPartner = await jput('/api/bullion/limit', { partnerId: PID, amount: 100000 }, TOK);
T('limit: a jeweller cannot set their own limit', limSetPartner.s === 403, limSetPartner.s);
const limSet = await jput('/api/bullion/limit', { partnerId: PID, amount: 100000 }, OWN);
T('limit: the office sets it', limSet.s === 200 && limSet.b.limit === 100000, JSON.stringify(limSet.b));
const lim1 = await jget('/api/bullion/limit', TOK);
T('limit: the jeweller reads the limit and the outstanding',
  lim1.b.limit === 100000 && lim1.b.outstanding >= 0, JSON.stringify(lim1.b));
const big = await jpost('/api/bullion/order', { side: 'buy', metKey: row.key, metal: row.label, qty: 900, unit: 'g' }, TOK);
T('limit: a deal that would cross it is refused, with all three figures',
  big.s === 400 && /limit of/.test((big.b || {}).error || '') && /already outstanding/.test((big.b || {}).error || ''),
  big.b && big.b.error);
const small = await jpost('/api/bullion/order', { side: 'buy', metKey: row.key, metal: row.label, qty: 1, unit: 'g' }, TOK);
T('limit: a deal that fits is accepted', small.s === 200, small.s);
await jput('/api/bullion/limit', { partnerId: PID, amount: 0 }, OWN);
const limOff = await jget('/api/bullion/limit', TOK);
T('limit: zero means no limit again', limOff.b.limit === 0, JSON.stringify(limOff.b));

/* the book's filters */
const fAll = await jget('/api/bullion/orders', TOK);
const fTxt = await jget('/api/bullion/orders?q=' + encodeURIComponent(row.label.slice(0, 5)), TOK);
T('filter: a text search returns only matching deals',
  (fTxt.b.orders || []).length >= 1 && (fTxt.b.orders || []).length <= (fAll.b.orders || []).length,
  (fTxt.b.orders || []).length + ' of ' + (fAll.b.orders || []).length);
const fNone = await jget('/api/bullion/orders?q=zzzz-nothing-matches', TOK);
T('filter: a miss returns nothing, not everything', (fNone.b.orders || []).length === 0, (fNone.b.orders || []).length);
const fStatus = await jget('/api/bullion/orders?status=Cancelled', TOK);
T('filter: status is honoured',
  (fStatus.b.orders || []).every(o => o.status === 'Cancelled') && (fStatus.b.orders || []).length >= 1,
  (fStatus.b.orders || []).length);
const fDate = await jget('/api/bullion/orders?from=2000-01-01&to=2000-01-02', TOK);
T('filter: a date window with no deals returns none', (fDate.b.orders || []).length === 0, (fDate.b.orders || []).length);
T('filter: every deal carries paid and due',
  (fAll.b.orders || []).every(o => o.paid != null && o.due != null), (fAll.b.orders || [])[0] && Object.keys(fAll.b.orders[0]).join(','));

const book = await jget('/api/bullion/daybook', TOK);
T('day book: the day carries money, not only metal',
  (book.b.totals || {}).paid != null && (book.b.totals || {}).due != null,
  JSON.stringify(book.b.totals || {}).slice(0, 90));

/* ── 3 · the screen ────────────────────────────────────────────────────── */
stage('screen');
const seed = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(TOK)); } catch (e) {} };
{
  const b = await boot('desk.html#/partner?view=bullion', { seed });
  const d = b.doc;
  const $ = s => d.querySelector(s);
  const $$ = s => [...d.querySelectorAll(s)];
  const SB = () => b.window.ShivaaBullion;
  const sent = [];

  /* a pop-up the test can read instead of a printer */
  b.window.open = () => ({ document: { write: h => sent.push(h), close: () => {} } });

  const mounted = await until(() => $('#bullionBoard .bd-tabs'), 20000);
  stage('mounted ' + !!mounted);
  T('desk: the board mounts', !!mounted);

  SB().menuGo('deals');
  const filt = await until(() => $('[data-bd-filter]'), 8000);
  T('deals: the filter bar renders', !!filt);
  T('deals: the money strip renders', !!$('.bd-money-strip'));
  T('deals: outstanding is a number, not a dash', /₹[\d,]+/.test(($('[data-outstanding]') || {}).textContent || ''),
    ($('[data-outstanding]') || {}).textContent);
  const cards = $$('[data-deal]').length;
  T('deals: the book lists the deals', cards >= 2, cards);
  T('deals: every deal shows what is paid and what is due',
    $$('.bd-deal').every(c => c.querySelector('[data-paid]') && c.querySelector('[data-due]')));
  T('deals: the settled slip is a button on its deal', $$('[data-invoice]').length >= 1, $$('[data-invoice]').length);

  /* the filter really filters, and clearing it restores the book */
  $('#bdDealQ').value = 'zzzz-nothing-matches';
  $('[data-bd-fapply]').click();
  await until(() => $('[data-bd-filter]') && $$('[data-deal]').length === 0, 8000);
  T('deals: a filter that matches nothing shows nothing', $$('[data-deal]').length === 0, $$('[data-deal]').length);
  T('deals: and says so in words', /no deal matches/i.test(d.body.textContent || ''));
  const clr = await until(() => $('[data-bd-fclear]'), 6000);
  if (clr) clr.click();
  await until(() => $('[data-bd-filter]') && $$('[data-deal]').length === cards, 8000);
  T('deals: clearing the filter brings the book back', $$('[data-deal]').length === cards, $$('[data-deal]').length);

  /* pay through the screen: open, type, save */
  const payBtn = $('[data-pay]');
  const payCard = payBtn && payBtn.closest('[data-deal]');
  const payDeal = payCard ? payCard.dataset.deal : '';
  const dueOf = id => Number(String((($(`[data-deal="${id}"] [data-due]`) || {}).textContent || '')).replace(/[^\d]/g, '')) || 0;
  const dueBefore = dueOf(payDeal);
  T('deals: an unpaid deal offers a payment button', !!payBtn);
  if (payBtn) {
    payBtn.click();
    const go = await until(() => d.getElementById('bpSave'), 5000);
    T('pay: the form opens with the amount due in it', !!go && !!d.getElementById('bpAmt'), !!go);
    if (go) {
      d.getElementById('bpAmt').value = '2500';
      d.getElementById('bpMode').value = 'cash';
      go.click();
      /* the modal shell keeps its content and loses its `open` class */
      const done = await until(() => {
        const ov = d.getElementById('modalOverlay');
        return ov && !ov.classList.contains('open');
      }, 8000);
      T('pay: recording money closes the form', !!done);
      await wait(700);
      const dueAfter = dueOf(payDeal);
      T('pay: the due figure on screen drops by what was paid, on that deal',
        dueBefore > 0 && dueAfter === dueBefore - 2500, payDeal + ': ' + dueBefore + ' → ' + dueAfter);
    }
  }

  /* the invoice button */
  const invBtn = $('[data-invoice]');
  if (invBtn) {
    invBtn.click();
    const html = await until(() => sent.find(h => /TAX INVOICE/.test(h)), 8000);
    T('invoice: clicking a slip opens a tax invoice', !!html);
    T('invoice: it carries the invoice number and the words',
      !!html && /INV\/DS/.test(html) && /rupees only/.test(html));
    T('invoice: it prints itself', !!html && /window\.print\(\)/.test(html));
  }

  /* the ledger */
  SB().menuGo('ledger');
  const ledTable = await until(() => $('[data-led-row]'), 10000);
  T('ledger: the screen lists the window’s deals', !!ledTable);
  T('ledger: the closing figure is shown', /₹/.test(($('.bd-money-strip .due b') || {}).textContent || ''));
  T('ledger: the receipts the desk took are listed', !!$('.bd-receipt'));
  T('ledger: it can be exported and printed', !!$('[data-led-csv]') && !!$('[data-led-print]'));
  const rowsShown = $$('[data-led-row]').length;
  $('[data-led-print]').click();
  const printed = await until(() => sent.find(h => /Party ledger/.test(h)), 6000);
  T('ledger: the printed copy has the same number of rows',
    !!printed && (printed.match(/<tr>/g) || []).length >= rowsShown, rowsShown);

  /* the rate-lock queue */
  SB().menuGo('unfix');
  const uPanel = await until(() => $('.bd-unfix'), 8000);
  T('unfix: the queue renders a request', !!uPanel);
  T('unfix: a partner sees no office buttons', $$('[data-unfix-ok]').length === 0, $$('[data-unfix-ok]').length);

  /* notifications */
  const posted = [];
  let permissionAsked = 0;
  b.window.Notification = function (t, o) { posted.push({ title: t, body: o && o.body }); };
  b.window.Notification.permission = 'default';
  b.window.Notification.requestPermission = async () => { permissionAsked++; b.window.Notification.permission = 'granted'; return 'granted'; };
  Object.defineProperty(b.window.navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ showNotification: () => {} }), controller: { postMessage: m => posted.push(m) } },
  });
  await SB().notifyOn();
  T('notify: the phone is asked once for permission', permissionAsked === 1, permissionAsked);
  T('notify: permission is remembered on the device',
    b.window.localStorage.getItem('shv_notify_on') === '1');
  T('notify: the claim loop starts', !!SB()._notifyTimer);
  SB().raiseAlert({ id: 'al_1', label: row.label, kind: 'rate', now: 7240, target: 7200 });
  await wait(150);
  const msg = posted.find(m => m && m.type === 'shv-notify');
  T('notify: a reached target is drawn by the service worker', !!msg, JSON.stringify(posted).slice(0, 120));
  T('notify: the body carries the price and the target',
    !!msg && /7,240|7240/.test(msg.body) && /7,200|7200/.test(msg.body), msg && msg.body);

  /* denied permission must not break the desk and must not claim */
  const b2 = await boot('desk.html#/partner?view=bullion', { seed });
  const SB2 = () => b2.window.ShivaaBullion;
  await until(() => b2.doc.querySelector('#bullionBoard .bd-tabs'), 20000);
  b2.window.Notification = function () {};
  b2.window.Notification.permission = 'denied';
  b2.window.Notification.requestPermission = async () => 'denied';
  await SB2().notifyOn();
  T('notify: without permission nothing is claimed', !SB2()._notifyTimer, String(SB2()._notifyTimer));
  T('notify: and the desk still works', !!b2.doc.querySelector('#bullionBoard .bd-tabs'));

  T('desk: no page fault came from the book', b.errors.filter(e => !NOISE.test(e)).length === 0,
    b.errors.filter(e => !NOISE.test(e))[0]);
}

/* the office-only controls are gated in the template, not hidden by CSS */
{
  T('office: the answer buttons are rendered only for the office',
    /v\.isAdmin && r\.status === 'open'/.test(ADMIN_J));
  T('office: a partner is told the queue is the record, not a promise',
    /confirmed by the office on call/i.test(ADMIN_RAW));
}

stage('done');
T('runner: no stray page faults', faults().length === 0, faults().slice(0, 2).join(' | '));
}

function summary() {
  console.log('');
  for (const f of bad) console.log('  FAIL ' + f);
  console.log('  t-v236-book · PASS ' + ok.length + ' / FAIL ' + bad.length);
  clearTimeout(WATCHDOG);
  process.exit(bad.length ? 1 : 0);
}
main().then(summary).catch(e => {
  console.log('  FAIL exception: ' + String((e && (e.stack || e.message)) || e).split('\n').slice(0, 4).join(' | '));
  clearTimeout(WATCHDOG);
  process.exit(1);
});
