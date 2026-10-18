/* t-v227 — "Verify & create" works from EVERY product page.
   ───────────────────────────────────────────────────────────────────────
   The owner's report, reproduced first: on a PDP the black-card button did
   nothing at all. Root cause, proven in jsdom before the fix:

     blackReadIntake() read `[data-black-claim] [data-bc-intake]` — a form that
     only exists on #/black-card. On a product page it returned an error
     ("Enter your name…"), `beginBlackClaim` returned at that error, and
     `blackClaimStatus()` wrote into `.bc-claim-status` elements that were not
     on the page either. Net effect: a tap, no sheet, no message, nothing.

   This suite holds the fix down end to end: signed-out the button opens the
   verification sheet and says what it is doing; signed-in the card is
   actually created and the product page switches to the money it saves.

   Whitespace-tolerant; never asserts text that only lives in a comment. */
import fs from 'node:fs';
import { boot, click, type, wait, until } from './harness.mjs';

const WATCHDOG = setTimeout(() => {
  console.log('FAIL watchdog: the suite did not finish in 300 s');
  process.exit(1);
}, 300000);
if (WATCHDOG.unref) WATCHDOG.unref();

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const read = p => fs.readFileSync(p, 'utf8');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;

const APP = read('cms/js/app.js');
const APP_J = stripJs(APP);
const SHIM = read('qa/preview_shim.py');
const LAYER = read('cms/css/v227.css');
const INDEX = read('cms/index.html');
const SW = read('cms/sw.js');

/* ── 1 · the source of the bug, and the fix ────────────────────────────── */
T('source: the intake reader no longer demands a form that only one page has',
  APP_J.includes('function blackIntakeFromPage()') &&
  APP_J.includes('const scoped = document.querySelector(\'[data-black-claim] [data-bc-intake]\')') &&
  /function blackReadIntake\(\)[\s\S]{0,600}const form = /.test(APP_J));
T('source: a missing form is not an error — only a bad field is',
  (APP_J.match(/intake\.error && intake\.form/g) || []).length === 2 &&
  !/if \(intake\.error\) \{ blackClaimStatus/.test(APP_J));
T('source: the name falls back to the account name, never to blank',
  APP_J.includes('const name = intake.name || ((state.user && state.user.name)'));
T('source: with no name anywhere the shopper is sent to the page that asks',
  APP_J.includes("'Add the name for your card on the Shivaa Black page") &&
  APP_J.includes("location.hash = '#/black-card'"));
T('source: the invite card carries a status line the PDP can actually see',
  APP.includes('bc-commerce-status bc-claim-status') && APP.includes('data-state=""'));
T('source: the post-login auto-claim fills the form before it fires',
  /const nameIn = view\.querySelector\('\[data-bc-name\]'\), mobIn = view\.querySelector\('\[data-bc-mobile\]'\)/.test(APP) &&
  /if \(nameIn && !nameIn\.value\) nameIn\.value =/.test(APP) &&
  /if \(mobIn && !mobIn\.value\) mobIn\.value =/.test(APP));
T('css: that status line is styled by this release, with its own states',
  /\.bc-commerce-status \{/.test(LAYER) &&
  /\.bc-commerce-status\[data-state="success"\]/.test(LAYER) &&
  /\.bc-commerce-status\[data-state="error"\]/.test(LAYER) &&
  /\.bc-commerce-status\[data-state="checking"\]::before \{ animation: v227Wait/.test(LAYER));
T('shim: mirrors api.php\'s two black-card routes for this sandbox',
  SHIM.includes('if route == "black-card/claim":') && SHIM.includes('if route == "black-card":') &&
  SHIM.includes('def dev_black_claim(u, body):') && SHIM.includes('"blackCard": dev_black_public'));
T('stamp: v227.js is loaded by the page and precached by the shell',
  INDEX.includes('/js/v227.js?v=232') && SW.includes("'/js/v227.js?v=232'"));

/* ── 2 · live: signed out, from a product page ─────────────────────────── */
const PDP = '#/product/p_smp_rings_01';
{
  const { window, doc, errors } = await boot(PDP);
  await wait(900);
  const card = doc.querySelector('[data-black-commerce]');
  const btn = card && card.querySelector('button');
  T('pdp: the invite card and its button are on a product page', !!card && !!btn,
    btn ? btn.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : 'no button');
  const status = card && card.querySelector('.bc-commerce-status');
  T('pdp: the status line exists on the page (the old fix wrote into nothing)', !!status);

  click(window, btn);
  await wait(350);
  const sheet = doc.querySelector('.shv-body, [data-shv-auth], .auth-panel');
  const phoneIn = doc.getElementById('shvPhoneIn');
  const st = card.querySelector('.bc-commerce-status');
  T('pdp: a signed-out tap opens the mobile verification sheet', !!sheet && !!phoneIn);
  T('pdp: the button says what it is doing, on the page it was pressed on',
    !!st && /verify your registered mobile/i.test(st.textContent) && st.dataset.state === 'checking',
    st ? st.textContent.trim().slice(0, 60) + ' | ' + st.dataset.state : 'no status');
  T('pdp: the claim intent survives the sign-in (it returns to this piece)',
    window._blackClaimAfterLogin === true && window._blackClaimReturn === PDP,
    String(window._blackClaimReturn));
  T('pdp: no page errors from the fix', errors.filter(e => !NOISE.test(e)).length === 0,
    errors.filter(e => !NOISE.test(e)).join(' | ').slice(0, 160));
}

/* ── 3 · live: the whole journey, signed in, from the same product page ── */
{
  const { window, doc, errors } = await boot(PDP);
  await wait(900);
  /* every run gets its own number: the OTP guard is a real 30 s cooldown */
  const phone = '9' + String(Date.now()).slice(-9);
  const codes = [];
  const nf = window.fetch;
  window.fetch = async (u, o) => {
    const r = await nf(u, o);
    try {
      const j = JSON.parse(await r.text());
      if (j && j.devCode) codes.push(String(j.devCode));
      return { ok: r.ok, status: r.status, headers: r.headers, text: async () => JSON.stringify(j), json: async () => j };
    } catch (e) { return r; }
  };

  const card = doc.querySelector('[data-black-commerce]');
  click(window, card.querySelector('button'));
  await wait(220);
  const phoneIn = doc.getElementById('shvPhoneIn');
  T('journey: the sheet asks for the mobile first', !!phoneIn);
  type(window, phoneIn, phone);
  await until(() => codes.length > 0, 8000);
  const otpBoxes = [...doc.querySelectorAll('#shvOtp input')];
  T('journey: a 4-digit code is texted to that number', codes.length > 0 && codes[0].length === 4 && otpBoxes.length === 4,
    'code=' + (codes[0] || '') + ' boxes=' + otpBoxes.length);
  if (otpBoxes.length === 4 && codes[0]) {
    codes[0].split('').forEach((d, i) => type(window, otpBoxes[i], d));
    await until(() => doc.getElementById('shvDetName'), 9000);
    const nameIn = doc.getElementById('shvDetName');
    T('journey: a new number is asked for its name, as the sheet promises', !!nameIn);
    if (nameIn) {
      type(window, nameIn, 'Meera Kanwar');
      const detBtn = doc.getElementById('shvDetBtn');
      if (detBtn) click(window, detBtn);
    }
    await until(() => window.Shivaa.state.user && window.Shivaa.state.user.blackCard, 14000);
    const card2 = window.Shivaa.state.user && window.Shivaa.state.user.blackCard;
    T('journey: the card is created without a second tap (the auto-claim ran)',
      !!card2, card2 ? card2.memberId + ' · expires ' + String(card2.expiresAt).slice(0, 10) : 'no membership');
    T('journey: it is a real Shivaa Black membership, not a placeholder',
      !!card2 && card2.discountPct === ((window.Shivaa.state.settings || {}).blackDiscountPct ?? 20) &&
      card2.discountBasis === 'making-charges' &&
      card2.holderName === 'Meera Kanwar' && String(card2.mobile).slice(-10) === phone.slice(-10),
      card2 ? [card2.discountPct, card2.discountBasis, card2.holderName, card2.mobile].join(' | ') : '');
    await until(() => window.location.hash === PDP, 8000);
    T('journey: the shopper is returned to the piece they were reading',
      window.location.hash === PDP, window.location.hash);
    await wait(1400);
    const live = doc.querySelector('[data-black-commerce]');
    T('journey: the product page now shows the money the card saves',
      !!live && /active/.test(live.className) && /Save ₹/.test(live.textContent) && /making charges/.test(live.textContent),
      live ? live.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : 'no card');
    T('journey: the intent was consumed, not left set for the next page',
      window._blackClaimAfterLogin === false);
  }
  T('journey: no page errors', errors.filter(e => !NOISE.test(e)).length === 0,
    errors.filter(e => !NOISE.test(e)).join(' | ').slice(0, 160));
}

/* ── 4 · the black-card route itself must still work (no regression) ───── */
{
  const { window, doc, errors } = await boot('#/black-card');
  await wait(1200);
  const claim = doc.querySelector('[data-black-claim]');
  const intake = claim && claim.querySelector('[data-bc-intake]');
  T('black-card: the page still asks for the name and the registered mobile', !!intake &&
    !!intake.querySelector('[data-bc-name]') && !!intake.querySelector('[data-bc-mobile]'));
  click(window, claim && claim.querySelector('.bc-claim-btn'));
  await wait(500);
  const st = doc.querySelector('.bc-claim-status');
  T('black-card: an empty form is refused, in words, where the shopper is looking',
    !!st && /name/i.test(st.textContent), st ? st.textContent.trim().slice(0, 70) : 'empty');
  T('black-card: it did NOT open the sign-in sheet (that was the old dead end)',
    !window._blackClaimAfterLogin && !doc.querySelector('.shv-body'));
  T('black-card: no page errors', errors.filter(e => !NOISE.test(e)).length === 0,
    errors.filter(e => !NOISE.test(e)).join(' | ').slice(0, 160));
}

clearTimeout(WATCHDOG);
console.log(ok.map(n => '  ✓ ' + n).join('\n'));
if (bad.length) { console.log('\n' + bad.map(n => '  ✗ ' + n).join('\n')); console.log('\nFAIL ' + bad.length + ' of ' + (ok.length + bad.length)); process.exit(1); }
console.log('\nPASS ' + ok.length + ' of ' + ok.length);
process.exit(0);
