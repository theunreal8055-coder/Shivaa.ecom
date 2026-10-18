/* t-v229-black — the certificate, the renewal, and the ONE number.
   ─────────────────────────────────────────────────────────────────────────
   Three things the owner asked for, held down together because they share one
   failure mode:

     A · the member benefit was a literal 20 in nine places, which is exactly
         what the public MAKING20 coupon gives a guest who never signed in. It
         is now ONE setting, and this suite proves that moving it moves the
         card, the certificate and the checkout line together — and that a
         HISTORICAL order row does not follow it, because a receipt that
         reprints itself at today's rate is a receipt that lies.
     B · renewal did not exist: a six-month card simply stopped. It is one tap
         now, and the number printed on the plastic must never change.
     C · the certificate had three record boxes (so the certificate number and
         the member ID shared one), no signatory, no title and no way to verify
         it. A credential without those is decoration.

   STATE: this suite consumes the fixture member's renewable window (it really
   renews). To run it again, rebuild the staffed fixture and restart the shim:
       python3 qa/build-test-db.py --with-staff && python3 qa/preview_shim.py --port 8090
   It restores settings.blackDiscountPct to 25 before it finishes.

   Whitespace-tolerant; never asserts text that only lives in a comment. */
import fs from 'node:fs';
import { boot, click, wait, until, BASE, pageFaults } from './harness.mjs';

const WATCHDOG = setTimeout(() => {
  console.log('FAIL watchdog: the suite did not finish in 300 s');
  process.exit(1);
}, 300000);
if (WATCHDOG.unref) WATCHDOG.unref();

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const read = p => fs.readFileSync(p, 'utf8');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const WS = s => String(s || '').replace(/\s+/g, ' ').trim();
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;
const faults = () => pageFaults.filter(f => !NOISE.test(f));

const API = read('cms/api.php');
const APP = read('cms/js/app.js');
const APP_J = stripJs(APP);
const LAYER = read('cms/css/v229.css');
const SHIM = read('qa/preview_shim.py');

const jget = async (p, tok) => {
  const r = await fetch(BASE + p, tok ? { headers: { Authorization: 'Bearer ' + tok } } : {});
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, headers: r.headers, body: j };
};
const jpost = async (p, body, tok) => {
  const r = await fetch(BASE + p, {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
    body: JSON.stringify(body || {}),
  });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};
const jput = async (p, body, tok) => {
  const r = await fetch(BASE + p, {
    method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
    body: JSON.stringify(body || {}),
  });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};

/* ── 1 · the server: one number, and a renewal that keeps the number ───── */
T('api: the member percentage is one setting, and it ships at 20',
  /function black_pct_setting\([\s\S]{0,600}?return 20;/.test(API));
T('api: that setting is clamped 0-40 on the server',
  /max\(0, min\(40,/.test(API));
/* "before the router runs" is the wrong test: the router comment sits above
   `$db = db_load()`, so every per-request setup lives inside that section. What
   has to be true is narrower — the number exists before the first route that
   reads it, and before anything can serve a card. */
{
  const at = API.indexOf("$GLOBALS['shv_black_pct'] = black_pct_setting($db);");
  T('api: the number is resolved once per request, before any route reads it',
    at > 0 &&
    at < API.indexOf("if ($route === 'black-card' && $method === 'GET')") &&
    at < API.indexOf("if ($route === 'settings' && $method === 'GET')"),
    'set at ' + at);
}
T('api: the card is served with the setting, not a stored literal',
  /function black_card_public[\s\S]{0,600}?\$out\['discountPct'\] = black_discount_pct\(\);/.test(API));
T('api: the card carries its renewal facts',
  /\$out\['daysLeft'\]/.test(API) && /\$out\['renewals'\]/.test(API) && /\$out\['renewable'\]/.test(API));
T('api: renewable means expired or inside the last 30 days',
  /\$left <= 30 \* 86400/.test(API));
T('api: the virtual member coupon reads the same setting',
  /function black_coupon_for_user[\s\S]{0,900}?\$pct = black_discount_pct\(\);[\s\S]{0,300}?'value' => \$pct,/.test(API));
T('api: a new card starts on the setting and counts renewals',
  /'discountPct' => black_discount_pct\(\), 'discountBasis' => 'making-charges',\s*'renewals' => 0,/.test(API));
T('api: settings validates the percentage as an int inside 0-40',
  /'blackDiscountPct' => \[0, 40, 'int'\]/.test(API));
T('api: the member renew route exists and is rate-blocked',
  /\$route === 'black-card\/renew' && \$method === 'POST'/.test(API) &&
  /rate_block\(\$db, 'black-card-renew'[\s\S]{0,140}?6, 3600, 900/.test(API));
T('api: renewal outside the window is refused with the days left',
  /Renewal opens in the last 30 days of your validity/.test(API));
T('api: renewal keeps member number, card number and certificate number',
  /'black-card\/renew'[\s\S]{0,2600}?\$card\['expiresAt'\] = black_add_months\(/.test(API) &&
  !/'black-card\/renew'[\s\S]{0,2600}?black_unique_code\(/.test(API),
  'renew must never reallocate a code');
T('api: renewal records where it came from',
  /'renewedAt'|\$card\['renewedAt'\]/.test(API) && /\$card\['previousExpiresAt'\]/.test(API) &&
  /audit_log\(\$db, 'black-card\.renew'/.test(API));
T('api: months are added by calendar, never by rolling over a month end',
  /function black_add_months[\s\S]{0,600}?min\(\$day, \(int\)\$first->format\('t'\)\)/.test(API));
T('api: the owner route extends a live card from its own expiry',
  /'admin\/black-card\/renew'[\s\S]{0,1400}?\$until > time\(\) \? \$previous : now_iso\(\)/.test(API));
T('api: the owner route refuses a silly number of months',
  /'admin\/black-card\/renew'[\s\S]{0,500}?\$months < 1 \|\| \$months > 36/.test(API));
T('api: the free card has a delivery status route with three states',
  /'admin\/black-card\/delivery'[\s\S]{0,700}?\['to-ship', 'printed', 'shipped'\]/.test(API));
T('api: the queue counts are one cheap pass over users[]',
  /'admin\/black-card\/queue' && \$method === 'GET'/.test(API));
T('shim: the dev mirror reads one setting too, defaults to the shipped 20, clamps the same way',
  /def dev_black_pct\(\):[\s\S]{0,700}?return 20/.test(SHIM) && /max\(0, min\(40, n\)\)/.test(SHIM));

/* ── 2 · the client: every live surface reads the one number ───────────── */
T('app: blackPct() prefers the card, then the setting, then the shipped 20',
  /function blackPct\(\) \{[\s\S]{0,900}?return 20;\s*\}/.test(APP_J));
T('app: blackPct() clamps to the same band as the server',
  /function blackPct\(\)[\s\S]{0,700}?Math\.max\(0, Math\.min\(40,/.test(APP_J));
T('app: the saving follows the setting, not a literal .20',
  /function blackSaving\(makingCharge, qty = 1\) \{\s*return Math\.max\(0, Math\.round\(\(\+makingCharge \|\| 0\) \* Math\.max\(1, \+qty \|\| 1\) \* blackPct\(\) \/ 100\)\);/.test(APP_J));
T('app: a historical row derives its own rate from its own two numbers',
  /function blackOrderPct\(o\) \{[\s\S]{0,400}?disc \/ basis \* 100/.test(APP_J));
T('app: order rows use it, so a receipt never follows a setting',
  /blackOrderPct\(o\)/.test(APP_J) && /blackOrderPct\(order\)/.test(APP_J));

/* Every remaining literal 20% must name its own programme. A ±4-line window,
   because markup splits a card across lines and a single-line marker match
   produces false failures. */
{
  const lines = APP.split('\n');
  const OWN = /premium|amrita|MAKING20|banner offer|ndGlow|A receipt never follows|the member percentage|for life/i;
  const stray = [];
  lines.forEach((ln, i) => {
    if (!/20%|20<span/.test(ln)) return;
    const near = lines.slice(Math.max(0, i - 4), i + 5).join('\n');
    if (!OWN.test(near) && !/blackPct|blackOrderPct/.test(near)) stray.push((i + 1) + ': ' + WS(ln).slice(0, 90));
  });
  T('app: no live Black surface still hard-codes 20%', stray.length === 0, stray.join(' | '));
}

/* ── 3 · the certificate is a document ─────────────────────────────────── */
T('cert: the markup carries every release class that styles it',
  /class="bc-certificate v229 v230 v231"/.test(APP));
{
  const cert = APP.slice(APP.indexOf('function blackCertificateHTML(card)'));
  const body = cert.slice(0, cert.indexOf('\nfunction ') > 0 ? cert.indexOf('\nfunction ') : 4000);
  T('cert: four record boxes, and VALID THROUGH is one of them',
    (body.match(/<span><small>/g) || []).length === 4 && /VALID THROUGH/.test(body),
    (body.match(/<span><small>/g) || []).length + ' boxes');
  T('cert: the certificate number and the member ID are separate records',
    /CERTIFICATE<\/small><b>\$\{esc\(card\.certificateNo/.test(body) &&
    /MEMBER ID<\/small><b>\$\{esc\(card\.memberId/.test(body));
  T('cert: the name is the largest element after the title, and it is set in caps',
    /bc-cert-name">\$\{esc\(String\(card\.holderName \|\| 'Shivaa Member'\)\.toUpperCase\(\)\)\}/.test(body));
  T('cert: the promise line states the percentage, both dates and the scope',
    /bc-cert-promise">\$\{pct\}% off[\s\S]{0,220}?blackDate\(card\.issuedAt\)[\s\S]{0,120}?blackDate\(card\.expiresAt\)[\s\S]{0,120}?never on metal value, stones, GST or shipping/.test(body));
  T('cert: a signatory, with a title under the signature',
    /bc-cert-sign"><b>For Shivaa Jewels<\/b><small>Proprietor · the Shivaa Family<\/small>/.test(body));
  T('cert: a stranger can verify it',
    /bc-cert-verify">[\s\S]{0,120}?shivaa\.in[\s\S]{0,160}?card\.certificateNo/.test(body));
  T('cert: renewals are visible on the document',
    /RENEWED ' \+ renewals \+ '×/.test(body) || /RENEWED/.test(body));
  T('cert: an archived certificate says so, and stays in the account',
    /CERTIFICATE PERMANENTLY ARCHIVED/.test(body) && /remains permanently in the member/.test(body));
  T('cert: exactly four corner ornaments (the old markup shipped c4 twice)',
    (body.match(/bc-cert-corner c\d/g) || []).length === 4 &&
    ['c1', 'c2', 'c3', 'c4'].every(c => body.includes('bc-cert-corner ' + c)),
    (body.match(/bc-cert-corner c\d/g) || []).length + ' corners');
  T('cert: one guilloche band, aria-hidden, behind the text',
    /bc-cert-guilloche" aria-hidden="true"/.test(body));
}
T('css: the guilloche band sits behind the text and takes no pointer events',
  /\.bc-certificate\.v229 \.bc-cert-guilloche \{[\s\S]{0,300}?pointer-events:none/.test(LAYER) &&
  /\.bc-certificate\.v229 > \.bc-cert-guilloche \{ z-index:0; \}/.test(LAYER));
T('css: four boxes across, two rows of two on a phone',
  /grid-template-columns:repeat\(4, minmax\(0,1fr\)\)/.test(LAYER) &&
  /max-width:700px[\s\S]{0,200}?repeat\(2, minmax\(0,1fr\)\)/.test(LAYER));
T('css: the name carries the hierarchy by size, in the display face',
  /\.bc-cert-name \{[\s\S]{0,220}?font-family:var\(--ff-disp\)[\s\S]{0,220}?clamp\(30px/.test(LAYER));
T('css: the signatory sits on a rule and has a title',
  /\.bc-cert-sign b \{[\s\S]{0,260}?border-bottom/.test(LAYER));
T('css: archived turns gold, not grey',
  /\.bc-cert-state \{[\s\S]{0,240}?color:#7a5a13/.test(LAYER));

/* ── 4 · the download is real print artwork ────────────────────────────── */
T('app: the certificate downloads as A4 landscape at 300 dpi',
  /cv\.width = 3508; cv\.height = 2480;/.test(APP_J));
T('app: the drawing is scaled uniformly, not re-laid-out by hand',
  /const BK = cv\.width \/ 1800;[\s\S]{0,200}?x\.scale\(BK, BK\);/.test(APP_J));
T('app: the downloaded certificate carries four record boxes too',
  /\[blackDate\(card\.expiresAt\), 'VALID THROUGH'\]/.test(APP_J));
T('app: the boxes cannot overlap — 350 wide on a 390 pitch',
  /const left = 140 \+ i \* 390;[\s\S]{0,120}?fillRect\(left, 720, 350, 105\)/.test(APP_J));
T('app: a missing canvas is a toast, never a fault',
  /saveBlackCertificate[\s\S]{0,3000}?if \(!x\) throw new Error\('Canvas unavailable'\)[\s\S]{0,6000}?Could not create the certificate image/.test(APP_J));

/* ── 5 · renewal, as the member sees it ────────────────────────────────── */
T('app: the strip is drawn from the server answer, never from a local date',
  /function blackRenewHTML\(card\) \{\s*if \(!card \|\| !card\.renewable\) return '';/.test(APP_J));
T('app: the button is disabled and marked busy for the whole round trip',
  /renewBlackCard[\s\S]{0,900}?btn\.disabled = true; btn\.setAttribute\('aria-busy', 'true'\)/.test(APP_J) &&
  /finally \{[\s\S]{0,300}?btn\.removeAttribute\('aria-busy'\)/.test(APP_J));
T('app: the status line is announced politely',
  /class="bc-renew-status" role="status" aria-live="polite"/.test(APP));
T('app: the server words are shown verbatim, so a 409 explains itself',
  /const msg = \(e && e\.message\) \? e\.message :/.test(APP_J));
T('css: the renewal button clears the 44px tap floor',
  /\.bc-renew-act \.btn \{ min-height:44px/.test(LAYER));

/* ── 6 · live: the member really sees all of it ────────────────────────── */
const otp = await jpost('/api/auth/send-otp', { phone: '9308956260' });
const code = otp.body && (otp.body.code || otp.body.previewCode || otp.body.devCode);
T('live: the fixture member can request a code', otp.status === 200 && !!code, otp.status);
const login = await jpost('/api/auth/otp-login', { phone: '9308956260', code: String(code) });
const MEM = login.body && login.body.token;
T('live: and sign in with it', login.status === 200 && !!MEM, login.status);

const seed = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(MEM)); } catch (e) {} };
const { window, doc, errors } = await boot('#/black-card', { seed });
const $ = s => doc.querySelector(s);
const $$ = s => [...doc.querySelectorAll(s)];

await until(() => $('.bc-certificate'), 15000);
await wait(320);

const certEl = $('.bc-certificate');
T('live: the certificate rendered with every layer on it',
  !!certEl && ['v229', 'v230', 'v231'].every(c => certEl.classList.contains(c)), certEl && certEl.className);
T('live: no page fault got here', faults().length === 0, faults().slice(0, 2).join(' | '));
T('live: no console error either', errors.filter(e => !NOISE.test(e)).length === 0,
  errors.filter(e => !NOISE.test(e)).slice(0, 2).join(' | '));

const boxes = $$('.bc-cert-meta span').map(b => WS(b.querySelector('b') && b.querySelector('b').textContent));
T('live: four record boxes, in order', boxes.length === 4, boxes.join(' | '));
T('live: certificate number and member ID are different records',
  boxes[0] && boxes[1] && boxes[0] !== boxes[1] && /^SFP/.test(boxes[0]) && /^SBM/.test(boxes[1]), boxes.slice(0, 2).join(' | '));
T('live: issued and valid-through are real dates',
  /\d{2} \w{3} \d{4}/.test(boxes[2]) && /\d{2} \w{3} \d{4}/.test(boxes[3]), boxes.slice(2).join(' | '));
T('live: the member name is the uppercase name on the account',
  WS(($('.bc-cert-name') || {}).textContent) === 'AARTI SHARMA', WS(($('.bc-cert-name') || {}).textContent));
const promise = WS(($('.bc-cert-promise') || {}).textContent);
T('live: the promise line names the percentage and both dates',
  /20%/.test(promise) && /\d{1,2} \w{3} \d{4}/.test(promise) && /never on metal value, stones, GST or shipping/.test(promise),
  promise.slice(0, 110));
T('live: the signatory has a title',
  /For Shivaa Jewels/.test(WS(($('.bc-cert-sign') || {}).textContent)) &&
  /Proprietor/.test(WS(($('.bc-cert-sign') || {}).textContent)));
T('live: the verify line names the site and the certificate number',
  /shivaa\.in/.test(WS(($('.bc-cert-verify') || {}).textContent)) &&
  WS(($('.bc-cert-verify') || {}).textContent).includes(boxes[0]), WS(($('.bc-cert-verify') || {}).textContent).slice(0, 90));
T('live: the card face shows the setting, not the value stored on the card',
  /20/.test(WS(($('.bc-benefit') || {}).textContent)), WS(($('.bc-benefit') || {}).textContent));
T('live: the scope note repeats the same one number',
  /Exactly what 20% means/.test(WS(($('.bc-scope') || {}).textContent)), WS(($('.bc-scope') || {}).textContent).slice(0, 60));

const strip = $('.bc-renew');
T('live: the renewal strip is there, because the server says the window is open', !!strip);
const numBefore = WS(($('.bc-detail-code') || {}).textContent);
T('live: the member number is on the page before renewing', /\d{4}/.test(numBefore), numBefore);

const renewBtn = $('[data-bc-renew-btn]');
T('live: the renewal button exists and is enabled', !!renewBtn && renewBtn.disabled === false);
if (renewBtn) {
  click(window, renewBtn);
  await until(() => /Renewed|renewed|✦/.test(WS(($('[data-bc-renew-status]') || {}).textContent)) ||
                  !$('[data-bc-renew-btn]') || ($('[data-bc-renew-btn]') || {}).disabled === false, 12000);
  await wait(500);
}
const mem2 = await jget('/api/black-card', MEM);
const card2 = (mem2.body && mem2.body.membership) || {};
T('live: the renewal really happened', card2.renewals === 1, JSON.stringify({ r: card2.renewals, exp: card2.expiresAt }));
T('live: the card number did not change', WS(card2.cardNumber || '') === '2020 1234 5678 9012', card2.cardNumber);
T('live: the member ID and certificate number did not change either',
  card2.memberId === 'SBM000123' && card2.certificateNo === 'SFP000123',
  [card2.memberId, card2.certificateNo].join(' | '));
T('live: six calendar months were added, not six times thirty days',
  String(card2.expiresAt || '').slice(0, 7) > String(card2.previousExpiresAt || '').slice(0, 7) &&
  Number(String(card2.expiresAt).slice(0, 4)) >= Number(String(card2.previousExpiresAt).slice(0, 4)),
  [card2.previousExpiresAt, card2.expiresAt].join(' → '));
T('live: the strip is gone now that the window is closed', !$('.bc-renew') || !$('.bc-renew'));

const again = await jpost('/api/black-card/renew', {}, MEM);
T('live: a second renewal is refused, with the days left in the message',
  again.status === 409 && /days to go/.test(String((again.body || {}).error || '')),
  [again.status, (again.body || {}).error].join(' '));

/* ── 7 · one setting moves everything the customer can see ─────────────── */
const ownerLogin = await jpost('/api/auth/login', { email: 'owner@shivaa.in', password: 'shivaa123' });
const ADMIN = (ownerLogin.body || {}).token;
T('live: the owner can sign in', !!ADMIN, ownerLogin.status);
const put31 = await jput('/api/settings', { blackDiscountPct: 31 }, ADMIN);
T('live: the owner moves the one number', put31.status === 200, put31.status);
const s31 = await jget('/api/settings');
T('live: the storefront settings carry it', (s31.body || {}).blackDiscountPct === 31, (s31.body || {}).blackDiscountPct);

const b2 = await boot('#/black-card', { seed });
await until(() => b2.doc.querySelector('.bc-certificate'), 15000);
await wait(260);
const promise31 = WS((b2.doc.querySelector('.bc-cert-promise') || {}).textContent);
const benefit31 = WS((b2.doc.querySelector('.bc-benefit') || {}).textContent);
const scope31 = WS((b2.doc.querySelector('.bc-scope') || {}).textContent);
T('live: the certificate promise follows the setting', /31%/.test(promise31), promise31.slice(0, 70));
T('live: the card face follows it', /31/.test(benefit31), benefit31);
T('live: the scope note follows it', /Exactly what 31% means/.test(scope31), scope31.slice(0, 60));
T('live: the CTA follows it', /Shop with my 31%/.test(WS((b2.doc.querySelector('.bc-member-actions') || {}).textContent)),
  WS((b2.doc.querySelector('.bc-member-actions') || {}).textContent).slice(0, 60));
const apiCard = await jget('/api/black-card', MEM);
T('live: and the server agrees with all three',
  ((apiCard.body || {}).membership || {}).discountPct === 31, ((apiCard.body || {}).membership || {}).discountPct);

const put90 = await jput('/api/settings', { blackDiscountPct: 90 }, ADMIN);
T('live: 90 is refused, not stored', put90.status === 400, put90.status);
const putBack = await jput('/api/settings', { blackDiscountPct: 20 }, ADMIN);
T('live: restored to the shipped default for whoever runs this next', putBack.status === 200, putBack.status);

/* ── 8 · nothing regressed on the way ──────────────────────────────────── */
T('live: the canvas savers take their guard path in jsdom, without a fault',
  faults().length === 0, faults().slice(0, 2).join(' | '));
T('css: this layer adds no keyframes at all', !/@keyframes/.test(LAYER.replace(/\/\*[\s\S]*?\*\//g, ' ')));
T('css: nothing here animates a layout property',
  !/transition:[^;]*(width|height|top|left|right|bottom|margin|padding)/.test(LAYER));
T('css: one stylesheet still ships', (read('cms/index.html').match(/<link[^>]+rel="stylesheet"/g) || []).length === 1);

clearTimeout(WATCHDOG);
console.log('\n%d PASS · %d FAIL', ok.length, bad.length);
bad.forEach(b => console.log('  FAIL ' + b));
process.exit(bad.length ? 1 : 0);
