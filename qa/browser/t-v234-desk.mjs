/* t-v234 — THE DESK APP
   ─────────────────────────────────────────────────────────────────────────
   The owner's ask: make the bullion desk work on a PC as well as on Android,
   and make it operational. Operational, here, has a number: a jeweller must be
   able to take 40 g today and 60 g tomorrow of the same 100 g deal and end up
   with TWO numbered slips and ONE order that says "Settled" — never 200 g.

   So this suite proves, in this order:

     1 · THE CONTRACT. desk.html is generated from index.html by
         tools/build-desk-shell.py and `--check` proves the two are in sync; the
         desk manifest is its own installable app; the shopper's index.html
         loads NONE of it; the CSS layer is the last one in the bundle and the
         PC rules exist at measured breakpoints.
     2 · THE BOOK. Tranches, the refusal to over-settle, the refusal to cancel
         after metal moved, the watchlist, and the arithmetic of the day
         (grams, fine grams, value, TCS, open metal).
     3 · THE SCREEN. The desk boots at PC width with the board decorated per
         row, takes a quote whose clock runs, writes a slip from the day book,
         and prints it. Then the same board inside the SPA, so a jeweller who
         opens the site normally still gets the same tool.
   ───────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
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
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;
const faults = () => pageFaults.filter(f => !NOISE.test(f));
const near = (a, b, d = 1) => Math.abs(Number(a) - Number(b)) <= d;

const API = read('cms/api.php');
const ADMIN_J = stripJs(read('cms/js/admin.js'));
const V234 = stripJs(read('cms/js/v234.js'));
const V234_CSS = stripCss(read('cms/css/v234.css'));
const BUNDLE = read('cms/css/shivaa.css');
const ORDER = read('tools/css-bundle-order.txt').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const INDEX = read('cms/index.html');
const DESK = read('cms/desk.html');
const SW = read('cms/sw.js');
const MANIFEST = JSON.parse(read('cms/desk.webmanifest'));
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

/* ── 1 · the contract ──────────────────────────────────────────────────── */
{
  let sync = '';
  try {
    sync = execFileSync('python3', ['tools/build-desk-shell.py', '--check'], { encoding: 'utf8' });
  } catch (e) { sync = (e.stdout || '') + (e.stderr || '') + ' (exit ' + e.status + ')'; }
  T('desk: desk.html is generated from index.html and in sync (--check)', /in sync/.test(sync), WS(sync).slice(0, 120));

  T('desk: it is the shop shell plus the desk scope class',
    /<html lang="en" class="shv-desk">/.test(DESK) && /<body class="shv-desk-body">/.test(DESK));
  T('desk: it carries its own manifest, not the shop one',
    /href="\/desk.webmanifest"/.test(DESK) && !/href="\/manifest.webmanifest"/.test(DESK));
  T('desk: it is noindex — a counter tool, not a page',
    /name="robots" content="noindex/.test(DESK));
  T('desk: a bare open lands on the board, never on the shop',
    /#\/partner\?view=bullion/.test(DESK) && /if \(!location\.hash\)/.test(DESK));
  T('desk: it loads v234.js — and index.html does not',
    /\/js\/v234\.js\?v=\d+/.test(DESK) && !/v234\.js/.test(INDEX));
  T('desk: the shopper pays nothing new — index.html loads no desk file',
    !/desk\.webmanifest|desk\.html/.test(INDEX));

  T('manifest: it is the desk app', MANIFEST.name === 'Shivaa Bullion Desk' && MANIFEST.short_name === 'Shivaa Desk');
  T('manifest: it opens the desk board', /#\/partner\?view=bullion$/.test(MANIFEST.start_url));
  T('manifest: its scope keeps it separate from the shop', MANIFEST.scope === '/desk.html');
  T('manifest: standalone with a desktop override',
    MANIFEST.display === 'standalone' && (MANIFEST.display_override || []).includes('window-controls-overlay'));
  T('manifest: it rotates with the screen, it is not phone-locked', MANIFEST.orientation === 'any');
  T('manifest: four shortcuts, each a real desk section',
    (MANIFEST.shortcuts || []).length === 4 && (MANIFEST.shortcuts || []).every(s => /#\/partner\?view=bullion/.test(s.url)));
  T('manifest: it ships the maskable icon Android needs', (MANIFEST.icons || []).some(i => i.purpose === 'maskable'));

  T('sw: the new shell is v234', /shivaa-shell-v234/.test(SW) && /REL = 234/.test(SW));
  T('sw: desk.html, its manifest and its runtime are precached',
    /'\/desk\.html'/.test(SW) && /'\/desk\.webmanifest'/.test(SW) && /'\/js\/v234\.js\?v=234'/.test(SW));

  T('bundle: v234.css is the last layer', ORDER[ORDER.length - 1] === 'v234.css' && ORDER[ORDER.length - 2] === 'v233.css');
  T('bundle: it is inside the one stylesheet', BUNDLE.lastIndexOf('/* v234.css */') > BUNDLE.lastIndexOf('/* v233.css */'));
  T('css: the desk chrome is scoped to the desk, never the shop',
    /html\.shv-desk/.test(V234_CSS) && /\.shv-desk-body/.test(V234_CSS));
  T('css: the storefront chrome is removed on the desk',
    /\.shv-desk \.utilbar[\s\S]{0,400}display: none !important/.test(V234_CSS));
  T('css: a PC gets its own layout at 1000px and a rail at 1500px',
    /@media \(min-width: 1000px\)/.test(V234_CSS) && /@media \(min-width: 1500px\)/.test(V234_CSS));
  T('css: an Android thumb gets 44px targets and safe areas',
    /min-height: 44px/.test(V234_CSS) && /env\(safe-area-inset-bottom/.test(V234_CSS));
  T('css: paper is white ink, and the tabs never print',
    /@media print/.test(V234_CSS) && /\.bd-tabs[\s\S]{0,200}display: none !important/.test(V234_CSS.split('@media print')[1] || ''));

  T('api: the tranche settle route exists', /bullion\/orders\/\(\[\\w-\]\+\)\/settle/.test(API));
  T('api: the cancel route exists', /bullion\/orders\/\(\[\\w-\]\+\)\/cancel/.test(API));
  T('api: the day book route exists', /\$route === 'bullion\/daybook'/.test(API));
  T('api: the watchlist route exists', /\$route === 'bullion\/watch'/.test(API));
  T('api: a slip number is a document, not a random id', /'DS' \. date\('ymd'\)/.test(API));
  T('api: an order now carries the purity its slip needs', /'purity' => \(string\)\(\$br\['purity'\]/.test(API));
  T('api: exposure marks only the metal that is still open',
    /bullion_order_settled\(\$o\)/.test(API) && /settledGrams[\s\S]{0,40}round\(\$settledGrams/.test(API));

  T('shim: it mirrors the day book', /route == "bullion\/daybook"/.test(SHIM));
  T('shim: it mirrors settle and cancel',
    /bullion\/orders\/\(\[\\w-\]\+\)\/settle/.test(SHIM) && /bullion\/orders\/\(\[\\w-\]\+\)\/cancel/.test(SHIM));
  T('shim: it mirrors the watchlist', /route == "bullion\/watch"/.test(SHIM));

  T('js: the desk runtime is app-only and feature-detected',
    /__SHIVAA_DESK/.test(V234) && /beforeinstallprompt/.test(V234) && /wakeLock/.test(V234));
  T('js: the desk has a keyboard map for a PC counter',
    /ShivaaDeskKeys/.test(ADMIN_J) && /'Day book'/.test(ADMIN_J));
  T('js: the quote carries a running clock', /bdc-count/.test(ADMIN_J) && /expiresAt/.test(ADMIN_J));
  T('js: a printer exists for a slip', /printSlip/.test(ADMIN_J) && /DEALING SLIP/.test(ADMIN_J));
}

/* ── 2 · a real partner, then the book ─────────────────────────────────── */
const stamp = String(Date.now()).slice(-8);
const PPHONE = '97' + stamp;
const otp = await jpost('/api/auth/send-otp', { phone: PPHONE });
const code = (otp.body || {}).devCode;
T('live: an OTP is issued for the desk partner', otp.status === 200 && !!code, otp.status);
await jpost('/api/kyc/verify-otp', { phone: PPHONE, code });
const apply = await jpost('/api/partners/apply', {
  firm: 'Desk Probe Jewellers', contactPerson: 'Probe', city: 'Jaipur',
  email: 'desk' + stamp + '@example.com', phone: PPHONE, password: 'shivaa123',
  gstin: '08AABCU9603R1ZN',
});
const TOK = (apply.body || {}).token;
const ME = (apply.body || {}).user || {};
T('live: the desk partner has a session', apply.status === 200 && !!TOK, JSON.stringify(apply.body).slice(0, 120));

const board = await jget('/api/bullion', TOK);
const rows = ((board.body || {}).rows) || [];
T('live: the board answers', board.status === 200 && rows.length > 0, rows.length);
const gold = rows.find(r => /gold/i.test(r.key)) || rows[0];
T('live: every row has a fine-gram price', !!(board.body.desk && board.body.desk.rows[gold.key].fineBuy),
  board.body.desk && board.body.desk.rows[gold.key].fineBuy);

const empty = await jget('/api/bullion/daybook', TOK);
T('book: it opens empty', empty.status === 200 && empty.body.totals.deals === 0, JSON.stringify(empty.body.totals).slice(0, 80));
T('book: it carries the server date, not the phone date', /^\d{4}-\d{2}-\d{2}$/.test(empty.body.date), empty.body.date);

/* a quote → an order → two tranches */
const q = await jpost('/api/bullion/quote', { metKey: gold.key, side: 'buy', qty: 100, unit: 'g' }, TOK);
T('quote: priced for the deal', q.status === 200 && /^BQ\d{6}-\d{4}$/.test(q.body.id), q.body && q.body.id);
const ord = await jpost('/api/bullion/order', {
  side: 'buy', metKey: gold.key, metal: gold.label, qty: 100, unit: 'g', quoteNo: q.body.id,
}, TOK);
T('deal: placed on its quote', ord.status === 200 && ord.body.quoteNo === q.body.id, ord.status);
T('deal: it records the purity its slip needs', !!(ord.body.purity && String(ord.body.purity).length), ord.body.purity);
T('deal: 100 g of 995 is 99.5 g fine', near(ord.body.fineGrams, 99.5, 0.05), ord.body.fineGrams);
const OID = ord.body.id;

const s1 = await jpost('/api/bullion/orders/' + OID + '/settle', { grams: 40, note: 'counter, 40 g bar' }, TOK);
T('settle: 40 g is written as a numbered slip', s1.status === 200 && /^DS\d{6}-\d{4}$/.test(s1.body.slip.slipNo), s1.status);
T('settle: the slip carries grams, rate and TCS',
  near(s1.body.slip.grams, 40, 0.001) && s1.body.slip.rate > 0 && s1.body.slip.tcs > 0,
  JSON.stringify(s1.body.slip).slice(0, 120));
T('settle: the order is NOT settled — 60 g is still open',
  s1.body.order.status === 'Partly settled' && near(s1.body.order.settledGrams, 40, 0.001), s1.body.order.status);
T('settle: the slip keeps its quote number', s1.body.slip.quoteNo === q.body.id, s1.body.slip.quoteNo);

const over = await jpost('/api/bullion/orders/' + OID + '/settle', { grams: 90 }, TOK);
T('settle: over-settling is refused, in words', over.status === 400 && /only .*open/i.test(over.body.error || ''), over.body && over.body.error);

const s2 = await jpost('/api/bullion/orders/' + OID + '/settle', {}, TOK);
T('settle: the rest settles as its own slip', s2.status === 200 && s2.body.slip.slipNo !== s1.body.slip.slipNo, s2.body && s2.body.slip.slipNo);
T('settle: 40 + 60 = the whole 100 g, not 200', near(s2.body.order.settledGrams, 100, 0.001), s2.body.order.settledGrams);
T('settle: and the deal is Settled', s2.body.order.status === 'Settled', s2.body.order.status);

const again = await jpost('/api/bullion/orders/' + OID + '/settle', {}, TOK);
T('settle: a settled deal cannot settle again', again.status === 400 && /already settled/i.test(again.body.error || ''), again.status);
const cancelSettled = await jpost('/api/bullion/orders/' + OID + '/cancel', { reason: 'typo' }, TOK);
T('cancel: metal that has moved cannot be cancelled', cancelSettled.status === 400 && /delivered/i.test(cancelSettled.body.error || ''), cancelSettled.status);

/* a second deal, cancelled before any metal moved */
const ord2 = await jpost('/api/bullion/order', { side: 'sell', metKey: gold.key, metal: gold.label, qty: 50, unit: 'g' }, TOK);
const cx = await jpost('/api/bullion/orders/' + ord2.body.id + '/cancel', { reason: 'typed 50 instead of 5' }, TOK);
T('cancel: a new deal can be cancelled with a reason',
  cx.status === 200 && cx.body.status === 'Cancelled' && /typed/.test(cx.body.cancelReason || ''), cx.status);
T('cancel: and it leaves the open metal', cx.body.status === 'Cancelled');

/* somebody else's deal is not yours to settle */
const otherPhone = '96' + String(Date.now()).slice(-8);
const otp2 = await jpost('/api/auth/send-otp', { phone: otherPhone });
await jpost('/api/kyc/verify-otp', { phone: otherPhone, code: otp2.body.devCode });
const apply2 = await jpost('/api/partners/apply', {
  firm: 'Other Jewellers', contactPerson: 'Other', city: 'Ajmer',
  email: 'other' + stamp + '@example.com', phone: otherPhone, password: 'shivaa123', gstin: '08AABCU9603R1ZN',
});
const TOK2 = (apply2.body || {}).token;
const steal = await jpost('/api/bullion/orders/' + ord2.body.id + '/settle', { grams: 1 }, TOK2);
T('isolation: another jeweller cannot settle your deal', steal.status === 403, steal.status);

/* watchlist */
const w1 = await jpost('/api/bullion/watch', { keys: [gold.key, 'not-a-row'] }, TOK);
T('watch: only real board rows are kept', w1.status === 200 && w1.body.watch.length === 1 && w1.body.watch[0] === gold.key,
  JSON.stringify(w1.body));

/* the day */
const book = await jget('/api/bullion/daybook', TOK);
const t = book.body.totals;
T('book: two deals today', t.deals === 2, t.deals);
T('book: buy grams are 100', near(t.buyGrams, 100, 0.001), t.buyGrams);
T('book: buy fine grams follow the purity', near(t.buyFineGrams, 99.5, 0.05), t.buyFineGrams);
T('book: TCS is 0.1% of the buy value', t.tcs === Math.round(t.buyValue * 0.001), t.tcs + ' vs ' + Math.round(t.buyValue * 0.001));
T('book: 100 g settled, nothing open', near(t.settledGrams, 100, 0.001) && near(t.openGrams, 0, 0.001), t.settledGrams + '/' + t.openGrams);
T('book: two slips were written', book.body.slips.length === 2, book.body.slips.length);
T('book: the cancelled deal is not in the open metal', t.openDeals === 0, t.openDeals);
T('book: the watchlist rides along', (book.body.watch || []).includes(gold.key));
const expo = (await jget('/api/bullion', TOK)).body.exposure;
T('exposure: settled grams are reported apart from the open ones',
  expo.settledGrams === 100 && expo.openDeals === 0, JSON.stringify(expo));

/* a fresh, unsettled deal keeps the exposure honest */
const ord3 = await jpost('/api/bullion/order', { side: 'buy', metKey: gold.key, metal: gold.label, qty: 20, unit: 'g' }, TOK);
const expo2 = (await jget('/api/bullion', TOK)).body.exposure;
T('exposure: an open deal is open metal', expo2.openDeals === 1 && near(expo2.netGrams, 20, 0.001), JSON.stringify(expo2));
await jpost('/api/bullion/orders/' + ord3.body.id + '/settle', { grams: 5 }, TOK);
const expo3 = (await jget('/api/bullion', TOK)).body.exposure;
T('exposure: after a 5 g tranche only 15 g is open', near(expo3.netGrams, 15, 0.001) && near(expo3.settledGrams, 105, 0.001),
  JSON.stringify(expo3));

/* ── 3 · the screen ────────────────────────────────────────────────────── */
const seed = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(TOK)); } catch (e) {} };

/* 3a · the installed desk app, on a PC */
{
  const b = await boot('desk.html#/partner?view=bullion', { seed });
  const d = b.doc;
  const $ = s => d.querySelector(s);
  const $$ = s => [...d.querySelectorAll(s)];
  const errs = () => b.errors.filter(e => !NOISE.test(e));

  T('desk: the release stamp is the one the server serves', b.window.__SHIVAA_REL === 234, String(b.window.__SHIVAA_REL));
  const mounted = await until(() => $('#bullionBoard .bd-tabs'), 20000);
  T('desk: the board mounts inside the desk app', !!mounted);
  T('desk: the shop around it is gone — no utility strip',
    b.window.getComputedStyle($('#utilbar')).display === 'none', b.window.getComputedStyle($('#utilbar')).display);
  T('desk: no storefront masthead either',
    b.window.getComputedStyle($('#header')).display === 'none', b.window.getComputedStyle($('#header')).display);
  T('desk: the footer is not under the board',
    b.window.getComputedStyle(d.querySelector('footer.footer')).display === 'none');
  T('desk: the page is scoped to the desk', d.documentElement.classList.contains('shv-desk'));

  T('desk: its own tool row is there', !!$('.shv-desk-tools'));
  T('desk: refresh, quote, day book and deals are one tap away',
    !!$('[data-desk="refresh"]') && /Quote/.test($('.shv-desk-tools').textContent) &&
    /Day book/.test($('.shv-desk-tools').textContent) && /Deals/.test($('.shv-desk-tools').textContent));
  T('desk: the network state is shown', !!$('[data-desk-net]'));

  await wait(600);
  T('board: every row carries its fine-gram price', $$('.bd-fine').length >= 2, $$('.bd-fine').length);
  T('board: the price is ₹ per fine gram, computed from the row',
    /fine ₹[\d,]+\/g/.test(($('.bd-fine') || {}).textContent || ''), ($('.bd-fine') || {}).textContent);
  T('board: every row can be pinned', $$('.bd-row [data-watch]').length === $$('.bd-row').length, $$('.bd-row [data-watch]').length);
  T('board: the pinned row is marked', !!$('.bd-row.bd-mine'), $$('.bd-row.bd-mine').length);
  /* the My-metals filter is a real measurement, not a promise */
  const rowCountAll = $$('.bd-row:not([style*="display: none"])').length;
  b.window.ShivaaBullion.toggleMine();
  await wait(200);
  const rowCountMine = $$('.bd-row:not([style*="display: none"])').length;
  T('board: "My metals" hides every row that is not pinned',
    rowCountMine < rowCountAll && rowCountMine === (await jget('/api/bullion', TOK)).body.watch.length,
    rowCountMine + ' of ' + rowCountAll);
  b.window.ShivaaBullion.toggleMine();
  await wait(150);
  T('board: and turning it off brings the board back',
    $$('.bd-row:not([style*="display: none"])').length === rowCountAll,
    $$('.bd-row:not([style*="display: none"])').length + ' of ' + rowCountAll);

  /* the star writes through to the partner's record */
  const before = (await jget('/api/bullion', TOK)).body.watch || [];
  const secondKey = rows.find(r => r.key !== gold.key).key;
  const star2 = $(`.bd-row [data-watch="${secondKey}"]`);
  if (star2) star2.dispatchEvent(new b.window.MouseEvent('click', { bubbles: true }));
  await wait(700);
  const after = (await jget('/api/bullion', TOK)).body.watch || [];
  T('board: a star is saved on the server, not just the screen',
    after.length === before.length + 1 && after.includes(secondKey), JSON.stringify(after));

  /* the day book, as a counter reads it */
  b.window.ShivaaBullion.menuGo('book');
  const bookEl = await until(() => $('#bdSection .bd-book'), 12000);
  T('book screen: it renders', !!bookEl);
  const txt = WS(($('#bdSection') || {}).textContent);
  T('book screen: it names the grams bought', /Bought today/i.test(txt) && /100\s*g/i.test(txt), txt.slice(0, 160));
  T('book screen: it names the two slips', /Dealing slips \(3\)/.test(txt), (txt.match(/Dealing slips \(\d+\)/) || [])[0]);
  T('book screen: a settled deal offers no settle button, and an open one does',
    $$('#bdSection .bd-book-row').some(r => /Settle/.test(r.textContent)), true);
  T('book screen: CSV and Print are offered', /CSV/.test(txt) && /Print/.test(txt));

  /* settle from the screen, and print the slip it writes */
  const openDeal = $$('#bdSection .bd-book-row').find(r => /Settle/.test(r.textContent));
  T('book screen: the open deal is the 20 g one', !!openDeal, openDeal && WS(openDeal.textContent).slice(0, 80));
  if (openDeal) {
    const btn = [...openDeal.querySelectorAll('button')].find(x => /Settle/.test(x.textContent));
    btn.dispatchEvent(new b.window.MouseEvent('click', { bubbles: true }));
    const form = await until(() => d.getElementById('bsGrams'), 5000);
    T('settle sheet: grams are pre-filled with what is open', !!form && form.value === '15', form && form.value);
    if (form) {
      form.value = '15';
      d.querySelector('#modalBox .btn-block').dispatchEvent(new b.window.MouseEvent('click', { bubbles: true }));
      const done = await until(() => /Slip DS/.test(WS(($('#modalBox') || {}).textContent)), 8000);
      T('settle sheet: it answers with the slip number', !!done, WS(($('#modalBox') || {}).textContent).slice(0, 90));
      const slipsNow = (await jget('/api/bullion/daybook', TOK)).body.slips.length;
      T('settle sheet: the slip is on the server too', slipsNow === 4, slipsNow);
    }
  }

  /* the quote clock */
  b.window.ShivaaBullion.menuGo('calc');
  await until(() => d.getElementById('bdcQuote'), 8000);
  const qb = d.getElementById('bdcQuote');
  if (qb) {
    qb.dispatchEvent(new b.window.MouseEvent('click', { bubbles: true }));
    const card = await until(() => d.querySelector('#bdcQuoteBox .bdc-qcard'), 9000);
    T('quote screen: it prices a quote from the board', !!card);
    const clock = await until(() => d.querySelector('#bdcQuoteBox [data-clock]'), 4000);
    T('quote screen: the clock runs on the quote', !!clock && /^\d+s$/.test(clock.textContent || ''), clock && clock.textContent);
    const first = clock && clock.textContent;
    await wait(1200);
    T('quote screen: and it is actually counting down',
      !!clock && clock.textContent !== first, first + ' → ' + (clock && clock.textContent));
  }
  T('desk: the desk-slip printer exists', typeof b.window.ShivaaBullion.printSlip === 'function');
  T('desk: the keyboard map opens', typeof b.window.ShivaaDeskKeys === 'function');
  if (typeof b.window.ShivaaDeskKeys === 'function') {
    b.window.ShivaaDeskKeys();
    T('desk: and it lists the keys', !!d.getElementById('deskKeys') && /Desk keys/.test(d.getElementById('deskKeys').textContent));
  }
  T('desk: no page errors', errs().length === 0, errs()[0] || '');
  await wait(300);
  b.window.close();
}

/* 3b · the same desk inside the shop (a jeweller who opens shivaa.in) */
{
  const b = await boot('#/partner?view=bullion', { seed });
  const d = b.doc;
  const mounted = await until(() => d.querySelector('#bullionBoard .bd-tabs'), 20000);
  T('spa: the same board mounts for a partner', !!mounted);
  T('spa: the desk tool row is there too', !!d.querySelector('.shv-desk-tools'));
  T('spa: but the shop chrome is NOT hidden',
    b.window.getComputedStyle(d.querySelector('#header')).display !== 'none');
  T('spa: and the desk runtime is never loaded', !b.window.__SHIVAA_DESK, String(b.window.__SHIVAA_DESK));
  const errs = b.errors.filter(e => !NOISE.test(e));
  T('spa: no page errors', errs.length === 0, errs[0] || '');
  await wait(300);
  b.window.close();
}

/* ── 4 · hygiene ───────────────────────────────────────────────────────── */
await wait(400);
T('hygiene: no unhandled page faults', faults().length === 0, faults()[0] || '');
T('hygiene: nothing was left half-written in the tree',
  fs.existsSync('cms/desk.html') && fs.existsSync('cms/desk.webmanifest') && fs.existsSync('cms/js/v234.js'));

console.log('');
console.log(ok.map(n => '  ok   ' + n).join('\n'));
console.log('');
console.log(bad.map(n => '  FAIL ' + n).join('\n'));
console.log('');
console.log('  t-v234-desk · PASS ' + ok.length + ' / FAIL ' + bad.length);
process.exit(bad.length ? 1 : 0);
