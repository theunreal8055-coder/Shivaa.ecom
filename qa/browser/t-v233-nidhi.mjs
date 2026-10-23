/* t-v233 — THE PASSBOOK RELEASE
   ─────────────────────────────────────────────────────────────────────────
   Two owner requests, one release, and every claim here is a number:

     A · SWARNA NIDHI, FULLY TRACEABLE. A plan now has a human number
         (SN26-0001), every instalment a numbered receipt, and ONE server view
         feeds the customer passbook, the public lookup and the admin ledger.
         This suite proves the four surfaces agree: the grams in the passbook
         are the sum of the receipts, the receipt number in the admin answer is
         the number on the customer's receipt, and a lookup cannot be answered
         with the wrong mobile number. It also proves the public answer leaks
         nothing: no phone, no email, no staff note.

     B · THE JEWELLER'S DESK. The board now carries ₹ per FINE gram for every
         row (the only way 995 is comparable with 999), the cheapest row per
         metal is named, open metal is marked to the board, and a firm quote is
         server-priced and numbered. This suite proves the fine maths, that an
         order attaches its quote, and that a quote for the wrong metal is
         REFUSED rather than silently re-priced.

   It runs on the staffed fixture (a customer, the owner) and creates its own
   partner through the real apply flow. Nothing it makes is left behind that a
   later suite depends on: the plan it opens is redeemed at the end.
   ───────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import { boot, wait, until, click, type, BASE, pageFaults } from './harness.mjs';

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
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;
const faults = () => pageFaults.filter(f => !NOISE.test(f));

const API = read('cms/api.php');
const APP_J = stripJs(read('cms/js/app.js'));
const ADMIN_J = stripJs(read('cms/js/admin.js'));
const V233 = stripCss(read('cms/css/v233.css'));
const BUNDLE = read('cms/css/shivaa.css');
const ORDER = read('tools/css-bundle-order.txt').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const SHIM = read('qa/preview_shim.py');

const jget = async (p, tok) => {
  const r = await fetch(BASE + p, tok ? { headers: { Authorization: 'Bearer ' + tok } } : {});
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};
const jpost = async (p, body, tok) => {
  const r = await fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
    body: JSON.stringify(body || {}),
  });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};

/* ═══ 0 · the source contract ═══════════════════════════════════════════ */
T('api.php: one view builds the passbook (savings_view)', /function\s+savings_view\s*\(/.test(API));
T('api.php: plans get a human number (savings_plan_no)', /function\s+savings_plan_no\s*\(/.test(API));
T('api.php: receipts are numbered from the plan number', /function\s+savings_receipt_no\s*\(/.test(API));
T('api.php: the public lookup is minimised (savings_track_view)', /function\s+savings_track_view\s*\(/.test(API));
T('api.php: the lookup is rate-limited per connection',
  WS(API).includes("rate_block($db, 'savings-track-ip'"));
T('api.php: the desk can open a plan for a walk-in member', /route\s*===\s*'admin\/savings\/open'/.test(API));
T('api.php: a customer request is a real route', /route\s*===\s*'savings\/request'/.test(API));
T('api.php: a firm quote is server-priced', /route\s*===\s*'bullion\/quote'/.test(API));
T('api.php: a stale/wrong quote is refused, not re-priced',
  WS(API).includes('take a fresh quote to trade at the new rate'));
T('api.php: fine-gram maths lives on the server', /function\s+bullion_desk_view\s*\(/.test(API));
T('api.php: open metal is marked to the board', /function\s+bullion_exposure\s*\(/.test(API));

T('app.js: the passbook renders receipt numbers', APP_J.includes('data-receipt-no'));
T('app.js: anyone can trace a plan (public form)', APP_J.includes('data-nb-track-form'));
T('app.js: the passbook reads the one server view', APP_J.includes("api('/api/savings/mine')"));
T('app.js: a receipt can be printed on its own', APP_J.includes('nbReceiptSheet'));
T('app.js: the receipts download as CSV', APP_J.includes('nbCSV'));
T('app.js: requests go to /api/savings/request', APP_J.includes("api('/api/savings/request'"));
T('app.js: the plan number is shown once, on opening', APP_J.includes('nbWelcome'));

T('admin.js: the ledger shows the same plan number', ADMIN_J.includes('data-nidhi-plan'));
T('admin.js: the ledger can print one plan', ADMIN_J.includes('nidhiSheet'));
T('admin.js: the book exports as CSV', ADMIN_J.includes('nidhiCSV'));
T('admin.js: the desk can open a plan by mobile', ADMIN_J.includes("api('/api/admin/savings/open'"));
T('admin.js: the jeweller calculator exists', ADMIN_J.includes('secCalc'));
T('admin.js: the fine-gram strip rides the board', ADMIN_J.includes('deskStrip'));
T('admin.js: quotes are taken from the server', ADMIN_J.includes("api('/api/bullion/quote'"));

T('v233.css: sits in the cascade, directly before the release that followed it',
  ORDER.includes('v233.css') && ORDER.indexOf('v233.css') === ORDER.indexOf('v234.css') - 1);
T('v233.css: the bundle carries its block', BUNDLE.includes('/* v233.css */'));
T('v233.css: styles the passbook', /\.nb-head\b/.test(V233));
T('v233.css: styles the desk calculator', /\.bd-calc\b/.test(V233));
T('v233.css: no keyframes (v224 rule)', !/@keyframes/i.test(V233));
T('v233.css: no filter/blur animation', !/transition[^;]*(filter|blur)/i.test(V233));
T('v233.css: no layout property in a transition',
  !/transition[^;]*\b(width|height|margin|padding|top|left|right|bottom|font-size|gap)\b/i.test(V233));
T('v233.css: phone inputs stay at 16px (no zoom trap)', /font-size:\s*16px/.test(V233));
T('shim: mirrors the plan view', /def dev_savings_view\(/.test(SHIM));
T('shim: mirrors the firm quote', /def dev_quote_no\(/.test(SHIM));

/* ═══ 1 · the customer's plan, through the real API ════════════════════ */
const memLogin = await jpost('/api/auth/login', { email: 'aarti@example.com', password: 'shivaa123' });
const MEM = (memLogin.body || {}).token;
T('member: signs in', memLogin.status === 200 && !!MEM, memLogin.status);
const ownLogin = await jpost('/api/auth/login', { email: 'owner@shivaa.in', password: 'shivaa123' });
const OWN = (ownLogin.body || {}).token;
T('owner: signs in', ownLogin.status === 200 && !!OWN, ownLogin.status);
const rohitLogin = await jpost('/api/auth/login', { email: 'rohit@example.com', password: 'shivaa123' });
const ROHIT = (rohitLogin.body || {}).token;
T('second customer: signs in', rohitLogin.status === 200 && !!ROHIT, rohitLogin.status);

const made = await jpost('/api/savings', { monthlyAmount: 5000 }, MEM);
const plan = (made.body || {}).plan || {};
const view = (made.body || {}).view || {};
PLAN: {
  T('plan: opens', made.status === 200 && !!plan.id, made.status + ' ' + JSON.stringify(made.body || {}).slice(0, 120));
  T('plan: carries a human number (SNyy-0001)', /^SN\d{2}-\d{4}$/.test(plan.planNo || ''), plan.planNo || 'none');
  T('plan: the number is in the view too', view.planNo === plan.planNo);
  T('plan: the first instalment is due on day one', !!view.nextDueAt && view.nextDueAt === view.startedAt,
    (view.nextDueAt || '') + ' vs ' + (view.startedAt || ''));
  T('plan: no receipt yet', Array.isArray(view.receipts) && view.receipts.length === 0);
  T('plan: the schedule is twelve months', Array.isArray(view.schedule) && view.schedule.length === 12);
  T('plan: month one is the due month', (view.schedule || [])[0] && view.schedule[0].state === 'due');
  T('plan: the twelfth month is the gift', (view.schedule || [])[11] && view.schedule[11].state === 'gift-locked');
}
const dup = await jpost('/api/savings', { monthlyAmount: 5000 }, MEM);
T('plan: a second active plan is refused', dup.status === 400, dup.status);

/* ═══ 2 · the desk's ledger and the numbered receipts ══════════════════ */
const adminList = await jget('/api/admin/savings', OWN);
const aPlan = ((adminList.body || {}).plans || []).find(p => p.id === plan.id) || {};
T('admin: lists the plan', adminList.status === 200 && !!aPlan.id);
T('admin: with the same plan number', aPlan.planNo === plan.planNo);
T('admin: zero months paid', aPlan.monthsPaid === 0 && aPlan.paidMonths === 0);
T('admin: legacy keys still present', aPlan.contributed === 0 && aPlan.buyingPower === 0 && aPlan.indicativeGrams22 === 0);

const r1 = await jpost('/api/admin/savings/' + plan.id + '/installment', { amount: 5000, mode: 'cash' }, OWN);
const rec1 = (r1.body || {}).receipt || {};
const v1 = (r1.body || {}).plan || {};
T('receipt 1: recorded', r1.status === 200 && !!rec1.receiptNo, r1.status);
T('receipt 1: numbered from the plan', rec1.receiptNo === plan.planNo + '-01', rec1.receiptNo);
T('receipt 1: grams = amount ÷ that day\'s 22K rate',
  Math.abs(Number(rec1.grams) - 5000 / Number(rec1.rate22)) < 0.001,
  rec1.grams + ' g at ' + rec1.rate22);
T('receipt 1: month one is paid', (v1.schedule || [])[0] && v1.schedule[0].state === 'paid');
T('receipt 1: next due moves one calendar month',
  !!v1.nextDueAt && v1.nextDueAt.slice(0, 7) !== (view.startedAt || '').slice(0, 7), v1.nextDueAt);
T('receipt 1: the gift is still locked', v1.bonusUnlocked === false && v1.bonus === 0);

const r2 = await jpost('/api/admin/savings/' + plan.id + '/installment', { amount: 5000, mode: 'upi' }, OWN);
const rec2 = (r2.body || {}).receipt || {};
T('receipt 2: numbered -02', rec2.receiptNo === plan.planNo + '-02', rec2.receiptNo);

const mine = await jget('/api/savings/mine', MEM);
const myPlan = ((mine.body || {}).plans || [])[0] || {};
T('passbook: two receipts', (myPlan.receipts || []).length === 2);
T('passbook: receipt numbers survive the read', (myPlan.receipts || []).map(r => r.receiptNo).join(',') === plan.planNo + '-01,' + plan.planNo + '-02');
T('passbook: contributed is the sum of receipts', myPlan.contributed === 10000, myPlan.contributed);
T('passbook: accrued grams are the sum of the receipts',
  Math.abs(Number(myPlan.gramsAccrued) - (myPlan.receipts || []).reduce((n, r) => n + Number(r.grams), 0)) < 0.002,
  myPlan.gramsAccrued);
T('passbook: the Monday rate is not re-applied to Friday\'s receipt',
  (myPlan.receipts || []).every(r => Math.abs(Number(r.grams) - Number(r.amount) / Number(r.rate22)) < 0.001));
T('passbook: buying power is just what was paid before month 11', myPlan.buyingPower === 10000);
T('passbook: no bonus before 11 receipts', myPlan.bonus === 0 && myPlan.bonusUnlocked === false);

/* ═══ 3 · the public lookup — and what it must NOT say ════════════════ */
const trackOk = await jpost('/api/savings/track', { plan: plan.planNo, contact: '6260' });
const tv = (trackOk.body || {}).plan || {};
T('track: answers without a login', trackOk.status === 200 && tv.planNo === plan.planNo, trackOk.status);
T('track: shows the receipts', (tv.receipts || []).length === 2);
T('track: masks the name', !!tv.holder && !tv.holder.includes('Aarti') && /•/.test(tv.holder), tv.holder);
const trackRaw = JSON.stringify(trackOk.body || {});
T('track: never returns the phone number', !/9308956260|930895/.test(trackRaw));
T('track: never returns the email', !/aarti@example/i.test(trackRaw));
T('track: never returns a staff note or the internal id', !/"note"|"userName"|"userId"|sp_/.test(trackRaw));

const trackBad = await jpost('/api/savings/track', { plan: plan.planNo, contact: '1111' });
T('track: wrong mobile is refused', trackBad.status === 403, trackBad.status);
const trackNone = await jpost('/api/savings/track', { plan: 'SN99-9999', contact: '6260' });
T('track: unknown plan is a 404', trackNone.status === 404, trackNone.status);
const trackShort = await jpost('/api/savings/track', { plan: 'SN1', contact: '6260' });
T('track: a half-typed number is a 400', trackShort.status === 400, trackShort.status);

/* ═══ 4 · the customer's request; the desk still performs it ══════════ */
const req1 = await jpost('/api/savings/request', { kind: 'redeem', note: 'a 22K chain, about 8 g' }, MEM);
T('request: accepted', req1.status === 200 && ((req1.body || {}).request || {}).status === 'pending', req1.status);
T('request: attached to the plan', ((req1.body || {}).plan || {}).pendingRequest && req1.body.plan.pendingRequest.kind === 'redeem');
const req2 = await jpost('/api/savings/request', { kind: 'close' }, MEM);
T('request: one open request at a time', req2.status === 400, req2.status);
const reqBad = await jpost('/api/savings/request', { kind: 'sell-everything' }, MEM);
T('request: an unknown kind is refused', reqBad.status === 400, reqBad.status);
const reqAnon = await jpost('/api/savings/request', { kind: 'query' });
T('request: needs the account (no anonymous asks)', reqAnon.status === 401, reqAnon.status);
const adminReq = await jget('/api/admin/savings', OWN);
const withReq = ((adminReq.body || {}).plans || []).find(p => p.id === plan.id) || {};
T('request: the desk sees it waiting', !!withReq.pendingRequest && withReq.pendingRequest.kind === 'redeem');

/* ═══ 5 · the desk opens a plan for a walk-in member ══════════════════ */
const openRohit = await jpost('/api/admin/savings/open', { phone: '9812345678', monthlyAmount: 3000 }, OWN);
const rohitPlan = (openRohit.body || {}).plan || {};
T('open: the desk opens a plan by mobile', openRohit.status === 200 && !!rohitPlan.planNo, openRohit.status);
T('open: it gets its own number', /^SN\d{2}-\d{4}$/.test(rohitPlan.planNo) && rohitPlan.planNo !== plan.planNo);
const openDup = await jpost('/api/admin/savings/open', { phone: '9812345678', monthlyAmount: 3000 }, OWN);
T('open: an active plan is not duplicated', openDup.status === 400, openDup.status);
const openNone = await jpost('/api/admin/savings/open', { phone: '9000000009', monthlyAmount: 3000 }, OWN);
T('open: an unknown mobile is a 404', openNone.status === 404, openNone.status);
const openNoAuth = await jpost('/api/admin/savings/open', { phone: '9812345678', monthlyAmount: 3000 }, MEM);
T('open: a customer cannot do it', openNoAuth.status === 403, openNoAuth.status);
const rohitMine = await jget('/api/savings/mine', ROHIT);
T('open: it is in that customer\'s passbook', ((rohitMine.body || {}).plans || []).some(p => p.planNo === rohitPlan.planNo));

/* ═══ 6 · the jeweller's desk — fine grams, quotes, exposure ══════════ */
const board = await jget('/api/bullion', OWN);
const B = board.body || {};
T('desk: the board answers', board.status === 200 && Array.isArray(B.rows), board.status);
const deskRows = (B.desk || {}).rows || {};
const row995 = deskRows.tdsGold995 || {};
const row995raw = (B.rows || []).find(r => r.key === 'tdsGold995') || {};
T('desk: every row carries its fine factor', Object.keys(deskRows).length === (B.rows || []).length);
T('desk: 995 reads as 0.995 fine', Math.abs(Number(row995.fine) - 0.995) < 0.0001, row995.fine);
T('desk: ₹ per fine gram = buy ÷ fine',
  Math.abs(Number(row995.fineBuy) - Number(row995raw.buy) / 0.995) < 0.02,
  row995.fineBuy + ' vs ' + (Number(row995raw.buy) / 0.995).toFixed(2));
T('desk: the best gold row is the cheapest fine gram',
  Math.abs(Number((B.desk.best || {}).gold) - Number((deskRows[(B.desk.best || {}).goldKey] || {}).fineBuy)) < 0.011,
  (B.desk.best || {}).gold + ' on ' + (B.desk.best || {}).goldKey);
T('desk: the spread is sell − buy', Math.abs(Number(row995.spread) - (Number(row995raw.sell) - Number(row995raw.buy))) < 0.02);
T('desk: exposure exists before any deal', B.exposure && B.exposure.openDeals === 0, JSON.stringify(B.exposure || {}));

const quote = await jpost('/api/bullion/quote', { metKey: 'tdsGold995', side: 'buy', qty: 100, unit: 'g' }, OWN);
const Q = quote.body || {};
T('quote: priced', quote.status === 200 && /^BQ\d{6}-\d{4}$/.test(Q.id || ''), Q.id || quote.status);
T('quote: value = rate × grams', Math.abs(Number(Q.amount) - Number(Q.rate) * 100) < 2);
T('quote: fine grams follow the purity', Math.abs(Number(Q.fineGrams) - 99.5) < 0.01, Q.fineGrams);
T('quote: TCS 0.1% on a buy', Q.tcs === Math.round(Number(Q.amount) * 0.001), Q.tcs);
T('quote: total includes TCS', Number(Q.total) === Number(Q.amount) + Number(Q.tcs));
T('quote: it expires in about 90 seconds', (() => {
  const ms = new Date(Q.expiresAt) - new Date(Q.createdAt);
  return ms > 80000 && ms < 100000;
})(), Q.expiresAt);
const quoteSell = await jpost('/api/bullion/quote', { metKey: 'tdsGold995', side: 'sell', qty: 100, unit: 'g' }, OWN);
T('quote: no TCS on a sell', (quoteSell.body || {}).tcs === 0);
const quoteBad = await jpost('/api/bullion/quote', { metKey: 'noSuchRow', side: 'buy', qty: 100, unit: 'g' }, OWN);
T('quote: an unknown row is refused', quoteBad.status === 400, quoteBad.status);

const orderQ = await jpost('/api/bullion/order', { side: 'buy', metKey: 'tdsGold995', metal: 'TDS GOLD', qty: 100, unit: 'g', quoteNo: Q.id }, OWN);
const O = orderQ.body || {};
T('order: placed on its quote', orderQ.status === 200 && O.quoteNo === Q.id, orderQ.status);
T('order: records the fine grams', Math.abs(Number(O.fineGrams) - 99.5) < 0.01, O.fineGrams);
const orderWrong = await jpost('/api/bullion/order', { side: 'sell', metKey: 'tdsGold995', metal: 'TDS GOLD', qty: 100, unit: 'g', quoteNo: Q.id }, OWN);
T('order: a quote for the other side is refused', orderWrong.status === 400, orderWrong.status);
const orderGhost = await jpost('/api/bullion/order', { side: 'buy', metKey: 'tdsGold995', metal: 'TDS GOLD', qty: 100, unit: 'g', quoteNo: 'BQ000000-9999' }, OWN);
T('order: a quote that is not yours is refused', orderGhost.status === 400, orderGhost.status);
const orderPlain = await jpost('/api/bullion/order', { side: 'buy', metKey: 'tdsGold995', metal: 'TDS GOLD', qty: 10, unit: 'g', note: 'counter' }, OWN);
T('order: still works without a quote (old flow intact)', orderPlain.status === 200 && orderPlain.body.quoteNo === '', orderPlain.status);

const board2 = await jget('/api/bullion', OWN);
const ex = (board2.body || {}).exposure || {};
T('exposure: counts the open deals', ex.openDeals === 2, JSON.stringify(ex));
T('exposure: net grams', Math.abs(Number(ex.netGrams) - 110) < 0.01, ex.netGrams);
T('exposure: marks the metal to the board', typeof ex.mtm === 'number');
T('quotes: the desk keeps its own quote history', ((board2.body || {}).quotes || []).some(q => q.id === Q.id));

/* ═══ 7 · the customer's screen, signed out ═══════════════════════════ */
{
  const { window, doc, errors } = await boot('#/savings');
  await until(() => doc.querySelector('[data-nb-track-form]'), 12000);
  const form = doc.querySelector('[data-nb-track-form]');
  T('guest page: the trace card is on the savings page', !!form);
  T('guest page: no passbook is shown before sign-in', !doc.querySelector('#nidhiBook'));
  T('guest page: it invites a sign-in as well as a lookup', !!doc.querySelector('.nb-signin'));
  if (form) {
    type(window, doc.querySelector('[data-nb-track-plan]'), plan.planNo);
    type(window, doc.querySelector('[data-nb-track-contact]'), '6260');
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    const out = await until(() => {
      const el = doc.querySelector('[data-nb-track-out]');
      return el && el.querySelector('.nb-track-card') ? el : null;
    }, 12000);
    T('guest page: a plan is found from its number + last 4', !!out);
    T('guest page: the answer carries the receipt numbers',
      !!out && out.textContent.includes(plan.planNo + '-01'));
    T('guest page: and never the full name', !!out && !out.textContent.includes('Aarti Sharma'));
  }
  T('guest page: no page errors', errors.filter(e => !NOISE.test(e)).length === 0,
    errors.filter(e => !NOISE.test(e))[0] || '');
  await wait(300);
  window.close();
}

/* ═══ 8 · the customer's screen, signed in ════════════════════════════ */
{
  const seed = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(MEM)); } catch (e) {} };
  const { window, doc, errors } = await boot('#/savings', { seed });
  const book = await until(() => doc.querySelector('#nidhiBook'), 15000);
  T('passbook: renders for the signed-in customer', !!book);
  if (book) {
    T('passbook: shows the plan number', book.textContent.includes(plan.planNo));
    T('passbook: shows both receipt rows', book.querySelectorAll('[data-receipt-no]').length >= 2);
    T('passbook: numbers the first receipt', !!book.querySelector('[data-receipt-no="' + plan.planNo + '-01"]'));
    T('passbook: twelve schedule cells', book.querySelectorAll('.nb-cell').length === 12);
    T('passbook: month one reads paid, month two due',
      book.querySelectorAll('.nb-cell.nb-paid').length === 2 && !!book.querySelector('.nb-cell.nb-due'));
    T('passbook: the next instalment is named', /Next instalment/i.test(book.textContent));
    T('passbook: print, CSV and WhatsApp are offered',
      !!book.querySelector('[data-nb-print]') && !!book.querySelector('[data-nb-csv]') && /WhatsApp/i.test(book.textContent));
    T('passbook: requests are offered', !!book.querySelector('[data-nb-ask="redeem"]') && !!book.querySelector('[data-nb-ask="close"]'));
    /* a receipt opens with its own number */
    click(window, book.querySelector('[data-nb-receipt]'));
    const sheet = await until(() => doc.querySelector('.nb-receipt-modal'), 4000);
    T('receipt: opens as a printable sheet', !!sheet && sheet.textContent.includes(plan.planNo + '-01'));
    window.Shivaa.closeModal();
    /* open a request from the page */
    click(window, book.querySelector('[data-nb-ask="query"]'));
    const askForm = await until(() => doc.querySelector('[data-nb-ask-form]'), 4000);
    T('request: the page offers a form', !!askForm);
    if (askForm) {
      askForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      const waitLine = await until(() => doc.querySelector('.nb-pending'), 12000);
      T('request: the pending request appears in the passbook', !!waitLine, waitLine ? waitLine.textContent.slice(0, 40) : 'none');
    }
  }
  T('passbook: no page errors', errors.filter(e => !NOISE.test(e)).length === 0,
    errors.filter(e => !NOISE.test(e))[0] || '');
  await wait(500);   // the request POST + toast must land before the window goes
  window.close();
}

/* ═══ 9 · the jeweller's desk on screen ═══════════════════════════════ */
{
  /* create a real partner through the real apply flow, so the portal is opened
     exactly as a jeweller opens it */
  const stamp = String(Date.now()).slice(-8);
  const PPHONE = '98' + stamp;                       // a fresh jeweller every run (10 digits)
  const otp = await jpost('/api/auth/send-otp', { phone: PPHONE });
  const code = (otp.body || {}).devCode;
  T('partner: an OTP is issued for the apply flow', otp.status === 200 && !!code, otp.status + ' ' + PPHONE);
  await jpost('/api/kyc/verify-otp', { phone: PPHONE, code });
  const apply = await jpost('/api/partners/apply', {
    firm: 'Kanak Jewellers', contactPerson: 'Kanak', city: 'Jaipur',
    email: 'kanak' + stamp + '@example.com', phone: PPHONE, password: 'shivaa123',
    gstin: '08AABCU9603R1ZN',   // checksum-valid (the placeholder in the forms is not)
  });
  const PTOK = (apply.body || {}).token;
  T('partner: the apply flow returns a session', apply.status === 200 && !!PTOK, apply.status);
  if (PTOK) {
    const seed = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(PTOK)); } catch (e) {} };
    const { window, doc, errors } = await boot('#/partner?view=bullion', { seed });
    const boardEl = await until(() => doc.querySelector('#bullionBoard .bd-tabs'), 20000);
    T('desk: the board mounts for a partner', !!boardEl);
    const strip = await until(() => doc.querySelector('[data-desk-strip]'), 20000);
    T('desk: the fine-gram strip is under the board', !!strip);
    T('desk: it names the best fine gram', !!strip && /Best fine gram/i.test(strip.textContent));
    T('desk: it shows open metal', !!strip && /Open metal/i.test(strip.textContent));
    const calcBtn = strip && strip.querySelector('[data-desk-calc]');
    T('desk: the calculator is one tap away', !!calcBtn);
    if (calcBtn) {
      click(window, calcBtn);
      const calc = await until(() => doc.querySelector('[data-bd-calc]'), 8000);
      T('desk: the calculator renders', !!calc);
      if (calc) {
        type(window, doc.querySelector('#bdcQty'), '100');
        const val = await until(() => {
          const out = doc.querySelector('[data-bdc-out]');
          return out && /Metal value/i.test(out.textContent) ? out : null;
        }, 6000);
        T('desk: it prices the weight live', !!val && /Total payable/i.test(val.textContent));
        T('desk: it shows cost per fine gram', !!val && /cost per fine gram/i.test(val.textContent));
        click(window, doc.querySelector('[data-bdc-quote]'));
        const qbox = await until(() => doc.querySelector('[data-bdc-quote-no]'), 12000);
        T('desk: a firm quote number appears', !!qbox && /^BQ\d{6}-\d{4}$/.test(qbox.textContent.trim()), qbox && qbox.textContent.trim());
      }
    }
    T('desk: no page errors', errors.filter(e => !NOISE.test(e)).length === 0,
      errors.filter(e => !NOISE.test(e))[0] || '');
    await wait(300);
    window.close();
  }
}

/* ═══ 10 · the desk answers the request (last, so the book above is rich) ═ */
const resolved = await jpost('/api/admin/savings/' + plan.id + '/redeem', { note: 'chain handed over' }, OWN);
const rv = ((resolved.body || {}).plan) || {};
T('close: the desk redeems the plan', resolved.status === 200 && rv.status === 'redeemed', resolved.status);
T('close: the customer\'s request is stamped done',
  (rv.requests || []).some(r => r.status === 'done'), JSON.stringify(rv.requests || []));
const after = await jget('/api/admin/savings', OWN);
const afterPlan = ((after.body || {}).plans || []).find(p => p.id === plan.id) || {};
T('close: no request is left pending', !afterPlan.pendingRequest);

/* ═══ 11 · the suite's own hygiene ═════════════════════════════════════ */
T('hygiene: no unhandled page faults', faults().length === 0, faults()[0] || '');

console.log(ok.map(n => '  ok   ' + n).join('\n'));
console.log(bad.length ? bad.map(n => '  FAIL ' + n).join('\n') : '  —');
console.log(`\n  t-v233-nidhi · PASS ${ok.length} / FAIL ${bad.length}`);
clearTimeout(WATCHDOG);
process.exit(bad.length ? 1 : 0);
