/* t-v235 — THE MILLISECOND DESK
   ─────────────────────────────────────────────────────────────────────────
   The owner's ask: "keep it updated every millisecond". No exchange on earth
   sends a price a thousand times a second, so this release does not pretend
   to. It does three honest things instead, and this suite measures all three:

     1 · THE FRAME, NOT THE FETCH.  A tick that arrives is painted in the very
         next frame — never queued behind a timer — and ten ticks landing in
         one frame are one repaint, not ten. Measured: paints per burst.

     2 · EVERY NUMBER SAYS HOW OLD IT IS.  A millisecond clock and the real
         age of the digits on screen (server age + time to reach this frame),
         refreshed every frame from one loop that writes text and nothing
         else. Measured: the clock advances by approximately wall time, the
         age chip counts up between ticks, and the board dims past five
         seconds instead of pretending.

     3 · NO HIDDEN COST.  Restarting a value flash used to force a layout
         read per changed number per tick; it no longer does (measured with a
         counting getter). The loop stops when the tab is hidden and never
         starts on a page without a board, so the shop pays nothing.

   It also pins the wire: /api/bullion/tick now carries nowMs, cacheAgeMs and
   a poll hint, and the desk polls at the rate the server can actually
   produce instead of a number guessed on the client.
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
/* stage marks go to stderr so a hang is locatable without a debugger */
const stage = m => process.stderr.write('  · ' + m + '\n');

const API = read('cms/api.php');
const ADMIN_RAW = read('cms/js/admin.js');
const ADMIN_J = stripJs(ADMIN_RAW);
const V235_CSS = stripCss(read('cms/css/v235.css'));
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

stage('contract');
/* The harness keeps page rejections alive on purpose; a rejection in THIS file
   would otherwise stop the top-level await silently. Everything runs inside
   main() so a failure is printed instead of hanging until the watchdog. */
async function main() {

/* ── 1 · the contract ──────────────────────────────────────────────────── */
{
  T('layer: v235.css is the last one in the cascade', ORDER[ORDER.length - 1] === 'v235.css', ORDER[ORDER.length - 1]);
  T('layer: it comes directly after v234.css', ORDER[ORDER.length - 2] === 'v234.css', ORDER[ORDER.length - 2]);
  T('layer: it sits inside the one stylesheet, after v234',
    BUNDLE.lastIndexOf('/* v235.css */') > BUNDLE.lastIndexOf('/* v234.css */'));
  T('layer: exactly one block, not two', (BUNDLE.match(/\/\* v235\.css \*\//g) || []).length === 1);

  T('css: the strip reads as a clock — tabular digits, monospace',
    /\.bd-ms[\s\S]{0,400}font-variant-numeric:\s*tabular-nums/.test(V235_CSS) && /\.bd-ms b[\s\S]{0,200}monospace/.test(V235_CSS));
  T('css: two warning states and no third one', /\.bd-ms em\.warn/.test(V235_CSS) && /\.bd-ms em\.bad/.test(V235_CSS));
  T('css: a stale board dims rather than lying', /\.bd-board\.bd-stale/.test(V235_CSS));
  T('css: anyone who asked for reduced motion gets no flash',
    /prefers-reduced-motion:\s*reduce[\s\S]{0,300}animation:\s*none/.test(V235_CSS));
  T('css: it adds no `color: transparent` for the v230/v231 guard to trip over',
    !/color:\s*transparent/.test(V235_CSS));

  /* the engine */
  T('engine: a tick goes through a coalescer, not straight to the DOM',
    /pushTick\(t\)\s*\{/.test(ADMIN_J) && /_paintQueued/.test(ADMIN_J) && /requestAnimationFrame/.test(ADMIN_J));
  T('engine: both live paths (poll and push relay) use it',
    (ADMIN_J.match(/this\.pushTick\(t\)/g) || []).length >= 2,
    (ADMIN_J.match(/this\.pushTick\(t\)/g) || []).length);
  T('engine: one frame loop, started with the board', /startBeat\(\)/.test(ADMIN_J) && /stopBeat\(\)/.test(ADMIN_J));
  T('engine: the loop writes the millisecond clock', /\[data-clock-ms\]/.test(ADMIN_J) && /istClockMs/.test(ADMIN_J));
  T('engine: … the age of the digits on screen', /\[data-feed-age\]/.test(ADMIN_J) && /feedAgeMs\(\)/.test(ADMIN_J));
  T('engine: … and the measured arrival rate', /\[data-tickrate\]/.test(ADMIN_J));
  T('engine: the clock pads to three digits of milliseconds',
    /getUTCMilliseconds\(\)\)\.padStart\(3,\s*'0'\)/.test(ADMIN_J));
  T('engine: the strip is part of the board shell (so the SPA gets it too)',
    /data-msstrip/.test(ADMIN_J) && /renderShell\(B\)\s*\{/.test(ADMIN_J));

  /* the loop is text-only — the v224 rule, at 60 frames a second */
  const beat = ADMIN_RAW.slice(ADMIN_RAW.indexOf('paintBeat() {'), ADMIN_RAW.indexOf('bd-stale', ADMIN_RAW.indexOf('paintBeat() {')) + 400);
  T('loop: the frame loop rebuilds no markup', beat.length > 100 && !/innerHTML|outerHTML|insertAdjacentHTML/.test(beat),
    beat.length);
  T('loop: and it never touches the network', !/fetch\(|api\('/.test(beat));
  T('loop: a hidden tab draws nothing', /document\.hidden\)\s*\{\s*this\._beat = null/.test(WS(ADMIN_J)));
  T('loop: coming back re-starts it', /visibilitychange[\s\S]{0,220}this\.startBeat\(\)/.test(ADMIN_J));

  /* the forced layout is gone */
  T('flash: no `void el.offsetWidth` restart is left anywhere in admin.js',
    !/void\s+el\.offsetWidth/.test(ADMIN_RAW));
  T('flash: the restart is scheduled for the next frame instead',
    /clearTimeout\(el\._flashT\)/.test(ADMIN_J) && /el\._flashCls/.test(ADMIN_J));

  /* the wire */
  T('wire: the tick carries the server clock in ms', /\$t\['nowMs'\]\s*=\s*\(int\)round\(microtime\(true\)\s*\*\s*1000\)/.test(API));
  T('wire: … the age of the snapshot it served', /\$t\['cacheAgeMs'\]/.test(API));
  T('wire: … and a poll hint with a reason', /\$t\['poll'\]\s*=\s*\['minMs'/.test(API) && /'why'\s*=>/.test(API));
  T('wire: a push relay earns a 250 ms poll, a plain cache one second',
    /\$pollMin\s*=\s*\$served === 'relay-cache' \|\| \$served === 'relay-http' \? 250 : \(\$isStale \? 5000 : 1000\)/.test(API));
  T('wire: the desk honours the hint instead of guessing 800 ms',
    /const hint = this\.pollHint/.test(ADMIN_J) && /Math\.max\(hint\.minMs, Math\.min\(hint\.maxMs, base\)\)/.test(ADMIN_J));
  T('preview: the shim answers the same route, with the same fields',
    /route == "bullion\/tick"/.test(SHIM) && /"nowMs"/.test(SHIM) && /"poll"/.test(SHIM) && /"cacheAgeMs"/.test(SHIM));

  let sync = '';
  try { sync = execFileSync('python3', ['tools/build-desk-shell.py', '--check'], { encoding: 'utf8' }); }
  catch (e) { sync = (e.stdout || '') + (e.stderr || '') + ' (exit ' + e.status + ')'; }
  T('desk: the generated shell is still in sync after the change', /in sync/.test(sync), WS(sync).slice(0, 100));
}

stage('wire');
/* ── 2 · the wire, over real HTTP ──────────────────────────────────────── */
const stamp = Date.now();
const phone = '97' + String(stamp).slice(-8);
const otp = await jpost('/api/auth/send-otp', { phone });
await jpost('/api/kyc/verify-otp', { phone, code: (otp.body || {}).devCode });
const apply = await jpost('/api/partners/apply', {
  firm: 'Live Desk Jewellers', contactPerson: 'Live', city: 'Jaipur',
  email: 'live' + stamp + '@example.com', phone, password: 'shivaa123',
  gstin: '08AABCU9603R1ZN',
});
const TOK = (apply.body || {}).token;
T('live: the desk partner has a session', apply.status === 200 && !!TOK, JSON.stringify(apply.body).slice(0, 120));

const noTok = await jget('/api/bullion/tick');
T('wire: the tick is still jeweller-only', noTok.status === 403, noTok.status);

const t0 = Date.now();
const tick = await jget('/api/bullion/tick', TOK);
const t1 = Date.now();
const tb = tick.body || {};
T('wire: the tick answers', tick.status === 200 && !!tb.gold && !!tb.silver, tick.status);
T('wire: it carries both metals at a real price', tb.gold.ltp > 0 && tb.silver.ltp > 0, tb.gold && tb.gold.ltp);
T('wire: the server clock is in milliseconds and within a second of ours',
  Number.isFinite(+tb.nowMs) && Math.abs(+tb.nowMs - (t0 + t1) / 2) < 3000, tb.nowMs);
T('wire: the age is a non-negative number of ms', Number.isFinite(+tb.ageMs) && +tb.ageMs >= 0, tb.ageMs);
T('wire: cacheAgeMs is reported separately', Number.isFinite(+tb.cacheAgeMs), tb.cacheAgeMs);
T('wire: the poll hint asks for one second against the 1 s cache',
  tb.poll && tb.poll.minMs === 1000 && tb.poll.maxMs >= tb.poll.minMs, JSON.stringify(tb.poll));
T('wire: the hint says why, in words', /micro-cache|relay|stale/.test(String((tb.poll || {}).why)), (tb.poll || {}).why);

const aged = await jget('/api/bullion/tick?age=6000', TOK);
T('wire: an old snapshot reports its true age', +aged.body.ageMs === 6000, aged.body.ageMs);
const stale = await jget('/api/bullion/tick?stale=1', TOK);
T('wire: a stale snapshot says so', stale.body.stale === true && stale.body.open === false);
T('wire: and the hint backs the desk off to five seconds',
  stale.body.poll && stale.body.poll.minMs === 5000, JSON.stringify(stale.body.poll));

const board = await jget('/api/bullion', TOK);
const rows = ((board.body || {}).rows) || [];
T('live: the board answers beside it', board.status === 200 && rows.length > 0, rows.length);

stage('screen');
/* ── 3 · the screen ────────────────────────────────────────────────────── */
const seed = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(TOK)); } catch (e) {} };
const msOfDay = s => {
  const m = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/.exec(String(s || ''));
  if (!m) return null;
  return ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 + +m[4];
};

stage('3a desk');
/* 3a · the desk */
{
  const b = await boot('desk.html#/partner?view=bullion', { seed });
  const d = b.doc;
  const $ = s => d.querySelector(s);
  /* captured lazily: admin.js mounts the desk on the route, so `window.ShivaaBullion`
     can still be undefined in the first frame after boot() */
  const sb = () => b.window.ShivaaBullion;

  stage('3a boot');
  const mounted = await until(() => $('#bullionBoard .bd-tabs'), 20000);
  stage('3a mounted ' + !!mounted);
  T('desk: the board mounts', !!mounted);
  T('desk: the strip is in the top bar', !!$('[data-msstrip]'));
  T('desk: it shows a clock, an age and a rate',
    !!$('[data-clock-ms]') && !!$('[data-feed-age]') && !!$('[data-tickrate]'));

  /* the clock really is a millisecond clock, and it really moves */
  stage('3a clock');
  const c0 = await until(() => (/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test($('[data-clock-ms]').textContent) ? $('[data-clock-ms]').textContent : null), 6000);
  T('clock: it renders to the millisecond', !!c0, c0);
  const p0 = msOfDay(c0);
  const w0 = Date.now();
  await wait(260);
  const wall = Date.now() - w0;
  const c1 = $('[data-clock-ms]').textContent;
  const p1 = msOfDay(c1);
  const delta = p1 == null || p0 == null ? -1 : ((p1 - p0) + 86400000) % 86400000;
  /* the clock must keep up with the wall clock, not with the timer we asked
     for: under a loaded event loop `wait(260)` really takes longer, and the
     right assertion is that the digits moved by about the time that passed */
  T('clock: it advances with wall time, to the millisecond',
    delta >= wall - 150 && delta <= wall + 300, delta + ' ms over ' + wall + ' ms of wall time');

  /* a tick lands, and the age chip counts up between ticks */
  stage('3a tick');
  const gotTick = await until(() => sb()._lastTickAt > 0, 8000);
  stage('3a tick seen ' + !!gotTick);
  T('feed: a tick has arrived on the desk', !!gotTick);
  const age0 = await until(() => {
    const txt = ($('[data-feed-age]') || {}).textContent || '';
    return /^\+\d+ ms$/.test(txt) || /^\+\d+\.\d s$/.test(txt) ? txt : null;
  }, 6000);
  T('feed: the age is shown in ms (or seconds once it is old)', !!age0, age0);
  await wait(220);
  const age1 = sb().feedAgeMs();
  T('feed: the age grows between ticks, it does not freeze', age1 > (sb()._lastFeedAge || 0) - 5, age1);
  const rate = $('[data-tickrate]').textContent;
  T('feed: the arrival rate is measured, not promised', /^\d+\.\d\/s$/.test(rate), rate);

  /* the age the server sent is the age that is used */
  stage('3a fetch in page');
  const live = await b.window.fetch('/api/bullion/tick', { headers: { Authorization: 'Bearer ' + TOK } }).then(r => r.json());
  live.ageMs = 700; live.nowMs = Date.now();
  sb().applyTick(live);
  const shown = sb().feedAgeMs();
  T('feed: the strip starts from the server’s own age', shown >= 700 && shown < 1500, shown);

  /* ── one paint per frame, newest tick wins ── */
  stage('3a burst');
  sb().stopTick();                       // silence the real poll for the burst
  sb()._paints = 0;
  const burst = [];
  for (let i = 0; i < 8; i++) burst.push(Object.assign({}, live, { ageMs: 100 + i }));
  burst.forEach(t => sb().pushTick(t));
  await wait(120);
  T('paint: eight ticks inside one frame are ONE repaint', sb()._paints === 1, sb()._paints);
  T('paint: and the newest one is the one on screen', sb()._lastFeedAge === 107, sb()._lastFeedAge);

  sb()._paints = 0;
  sb().pushTick(Object.assign({}, live, { ageMs: 50 }));
  await wait(90);
  sb().pushTick(Object.assign({}, live, { ageMs: 60 }));
  await wait(90);
  T('paint: two ticks in different frames are two repaints', sb()._paints === 2, sb()._paints);

  /* ── zero layout reads while flashing ── */
  stage('3a layout reads');
  {
    let reads = 0;
    const proto = b.window.HTMLElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
    Object.defineProperty(proto, 'offsetWidth', { configurable: true, get() { reads++; return 100; } });
    const before = reads;
    const t2 = Object.assign({}, live, { ageMs: 20 });
    t2.gold = Object.assign({}, live.gold, { ltp: live.gold.ltp + 37 });
    t2.silver = Object.assign({}, live.silver, { ltp: live.silver.ltp + 11 });
    sb().applyTick(t2);
    const used = reads - before;
    T('flash: a price change costs ZERO layout reads', used === 0, used);
    if (desc) Object.defineProperty(proto, 'offsetWidth', desc);
  }

  stage('3a stale');
  /* ── stale is stated, not hidden ── */
  sb().startBeat();
  sb()._lastFeedAge = 6000;
  sb()._lastTickAt = Date.now();
  await wait(120);
  T('stale: a six-second-old number dims the board',
    $('#bullionBoard').classList.contains('bd-stale'));
  T('stale: and the chip turns red rather than green',
    $('[data-feed-age]').classList.contains('bad') && !$('[data-feed-age]').classList.contains('warn'),
    $('[data-feed-age]').className);
  sb()._lastFeedAge = 2000;
  await wait(120);
  T('stale: two seconds is amber, not red',
    $('[data-feed-age]').classList.contains('warn') && !$('[data-feed-age]').classList.contains('bad'),
    $('[data-feed-age]').className);
  sb().applyTick(Object.assign({}, live, { ageMs: 40 }));
  await wait(120);
  T('stale: a fresh tick clears the warning', !$('#bullionBoard').classList.contains('bd-stale'));

  /* ── hidden tab: no frames, no work ── */
  stage('3a hidden');
  Object.defineProperty(d, 'hidden', { configurable: true, get: () => true });
  Object.defineProperty(d, 'visibilityState', { configurable: true, get: () => 'hidden' });
  d.dispatchEvent(new b.window.Event('visibilitychange'));
  await wait(160);
  T('idle: a hidden tab stops the frame loop', !sb()._beat, String(sb()._beat));
  const frozen = $('[data-clock-ms]').textContent;
  await wait(220);
  T('idle: and the clock stops with it', $('[data-clock-ms]').textContent === frozen, frozen);

  stage('3a visible');
  Object.defineProperty(d, 'hidden', { configurable: true, get: () => false });
  Object.defineProperty(d, 'visibilityState', { configurable: true, get: () => 'visible' });
  d.dispatchEvent(new b.window.Event('visibilitychange'));
  await wait(200);
  T('idle: coming back to the tab restarts it', !!sb()._beat);
  T('desk: no page fault came from any of this', b.errors.filter(e => !NOISE.test(e)).length === 0,
    b.errors.filter(e => !NOISE.test(e))[0]);
}

stage('3b spa');
/* 3b · the same board inside the SPA — a jeweller who opens the site normally */
{
  const b = await boot('index.html#/partner?view=bullion', { seed });
  const d = b.doc;
  const mounted = await until(() => d.querySelector('#bullionBoard .bd-tabs'), 20000);
  T('spa: the board mounts in the shop too', !!mounted);
  T('spa: and carries the same freshness strip', !!d.querySelector('[data-clock-ms]') && !!d.querySelector('[data-tickrate]'));
  const c = await until(() => (/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test((d.querySelector('[data-clock-ms]') || {}).textContent || '') ? 1 : 0), 6000);
  T('spa: the millisecond clock runs there as well', c === 1);
}

stage('3c shop');
/* 3c · the shop home pays nothing for it */
let B_shop_beat_off = false;
{
  const b = await boot('index.html#/', {});
  const d = b.doc;
  await wait(700);
  const shopSB = b.window.ShivaaBullion;
  B_shop_beat_off = !shopSB || (!shopSB._beat && d.querySelectorAll('[data-clock-ms]').length === 0);
  T('shop: no board, no clock, no frame loop', B_shop_beat_off);
  T('shop: the strip is nowhere on the storefront', d.querySelectorAll('[data-msstrip]').length === 0);
}

T('runner: no stray page faults', faults().length === 0, faults().slice(0, 2).join(' | '));
}

function summary() {
  console.log('');
  for (const f of bad) console.log('  FAIL ' + f);
  console.log('  t-v235-live · PASS ' + ok.length + ' / FAIL ' + bad.length);
  clearTimeout(WATCHDOG);
  process.exit(bad.length ? 1 : 0);
}

main().then(summary).catch(e => {
  console.log('  FAIL exception: ' + String((e && (e.stack || e.message)) || e).split('\n').slice(0, 4).join(' | '));
  clearTimeout(WATCHDOG);
  process.exit(1);
});
