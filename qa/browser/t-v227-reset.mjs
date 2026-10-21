/* t-v227 — forgot-password asks for the MOBILE, then sets a new password.
   ───────────────────────────────────────────────────────────────────────
   The owner: "login form has a problem when someone clicks on forget password
   then it shows a email otp button but it should show a number otp button and
   then make a new password."

   Before v227 the reset step was email-first, and only the jeweller door
   offered it: a retail shopper — who signs in with a mobile number and often
   has no password at all — could not reach the recovery screen, and if they
   did, the first field on it was the one they could not be sure of. v227:
   mobile first (email is one tap away), 4-digit code to the registered mobile,
   then new password + repeat on the same screen, with a real resend countdown.

   Live proof: an account is created, its password is changed through the sheet
   alone, and the shim's own login route is then asked to accept the new
   password and refuse the old one — so "the new password works" is tested, not
   assumed. Whitespace-tolerant; no text that only lives in a comment. */
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

const AUTH = read('cms/js/auth.js');
const AUTH_J = stripJs(AUTH);
const API = read('cms/api.php');
const SHIM = read('qa/preview_shim.py');

/* ── 1 · the shape of the fix ──────────────────────────────────────────── */
T('source: the reset step is mobile-first, with the email as the alternative',
  AUTH_J.includes("let resetMode = 'phone'") &&
  /function reset\(body\) \{\s*const phoneMode = resetMode === 'phone';/.test(AUTH_J) &&
  AUTH_J.includes('id="shvRstPhone"') && AUTH_J.includes('id="shvRstEmail"') &&
  AUTH_J.includes("$('#shvRstMode').onclick = () => { resetMode = phoneMode ? 'email' : 'phone'; go('reset'); }"));
T('source: the code goes to the registered mobile, and the copy says so',
  /Send the code on my mobile/.test(AUTH) &&
  /We text a <b>4-digit<\/b> code to <b>that number<\/b>/.test(AUTH) &&
  /We text a <b>4-digit<\/b> code to the mobile registered with it/.test(AUTH));
T('source: the new password is asked for twice, and both must match',
  AUTH_J.includes('id="shvRstPw"') && AUTH_J.includes('id="shvRstPw2"') &&
  AUTH_J.includes("if (pw !== pw2) { showErr('The two passwords are not the same')"));
T('source: the code auto-submits at four digits, like the sign-in code',
  AUTH_J.includes("ShivaaOtp.watch(document.getElementById('shvRstOtp'), () => { if (boxes.every(x => x.value)) submitNew(); })"));
T('source: resend is a real resend with the server\'s 30-second cooldown',
  AUTH_J.includes('resetResendLeft = 30;') && AUTH_J.includes('Resend in ${resetResendLeft}s'));
T('source: the demo code survives the step change (it used to be painted into a replaced node)',
  AUTH_J.includes('let resetMode') && AUTH_J.includes('resetDemo') &&
  /resetDemo = d\.devCode \? String\(d\.devCode\) : ''/.test(AUTH_J) &&
  /\$\{resetDemo \? `Demo mode is on: your code is <b>\$\{esc\(resetDemo\)\}<\/b>` : ''\}/.test(AUTH));
T('source: the success screen routes customers and partners to their own door',
  AUTH_J.includes("$('#shvRstDone').onclick = () => go(role === 'customer' ? 'start' : 'jwl');"));
T('source: the retail door offers the reset in one tap',
  AUTH_J.includes('id="shvStartForgot"') &&
  AUTH_J.includes("$('#shvStartForgot').onclick = () => { resetMode = 'phone'; go('reset'); }"));
T('api: reset/start takes {phone} or {email} and always texts the registered mobile',
  /auth\/reset\/start/.test(API) && /\$rb\['phone'\]/.test(API) && /\$rb\['email'\]/.test(API) &&
  /\$byPhone = \(\$email === '' && preg_match/.test(API) &&
  /registered mobile/i.test(API));
T('api: the rate limit is counted per identifier the shopper typed',
  /\$rateKey = \$byPhone \? \('ph:' \. \$wantPhone\) : \$email;/.test(API));
T('api: confirm resolves the account by phone or email and revokes other sessions',
  /auth\/reset\/confirm/.test(API) && /\$wantPhone/.test(API) && /sessionsRevoked/.test(API) &&
  /\$email = strtolower\(\(string\)\(\$user\['email'\] \?\? ''\)\);/.test(API));
T('shim: mirrors both reset routes and remembers the new password',
  SHIM.includes('if route == "auth/reset/start":') && SHIM.includes('if route == "auth/reset/confirm":') &&
  SHIM.includes('DEV["passwords"]') && SHIM.includes('def dev_check_reset_otp('));

/* ── 2 · live: create an account, then recover it through the sheet ────── */
const { window, doc, errors } = await boot('#/');
await wait(800);
const phone = '9' + String(Date.now()).slice(-9);
const OLD = 'OldPass1234', NEW = 'BrandNew7788';
let email = '';
{
  const call = async (path, body, tok) => {
    const r = await window.fetch('/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    let j = null; try { j = JSON.parse(await r.text()); } catch (e) {}
    return { status: r.status, j: j || {} };
  };
  const s1 = await call('auth/send-otp', { phone });
  T('setup: the sandbox hands the account an OTP', !!s1.j.devCode, 'status ' + s1.status);
  await call('kyc/verify-otp', { phone, code: s1.j.devCode });
  email = 'recover' + phone.slice(-6) + '@example.com';
  const reg = await call('auth/register', { name: 'Reset Tester', phone, email, password: OLD });
  T('setup: an account exists with a known old password', reg.status === 200 && !!reg.j.token, 'status ' + reg.status);

  /* open the sheet the way a shopper does: from the sign-in door */
  window.Shivaa.openLogin();
  await until(() => doc.getElementById('shvStartForgot'), 9000);
  click(window, doc.getElementById('shvStartForgot'));
  await until(() => doc.getElementById('shvResetForm'), 9000);
  const mobile = doc.getElementById('shvRstPhone');
  T('sheet: the recovery screen opens with the MOBILE field', !!mobile && mobile.tagName === 'INPUT');
  T('sheet: the email field is not the default any more', !doc.getElementById('shvRstEmail'));
  T('sheet: the button promises to text the code to that number',
    /Send the code on my mobile/i.test((doc.getElementById('shvRstBtn') || {}).textContent || ''));
  T('sheet: the copy names the mobile and the 4 digits',
    /4-digit/.test(doc.querySelector('.shv-body').textContent) && /mobile|number/i.test(doc.querySelector('.shv-body').textContent));

  /* the email alternative is one tap away, and comes back */
  click(window, doc.getElementById('shvRstMode'));
  await until(() => doc.getElementById('shvRstEmail'), 5000);
  T('sheet: one tap switches the recovery identifier to email',
    !!doc.getElementById('shvRstEmail') && !doc.getElementById('shvRstPhone'));
  click(window, doc.getElementById('shvRstMode'));
  await until(() => doc.getElementById('shvRstPhone'), 5000);
  T('sheet: and one tap switches it back to the mobile', !!doc.getElementById('shvRstPhone'));

  /* ask for the code by mobile */
  type(window, doc.getElementById('shvRstPhone'), phone);
  click(window, doc.getElementById('shvRstBtn'));
  await until(() => doc.getElementById('shvRstNewForm'), 9000);
  T('sheet: the next screen asks for the 4-digit code and the new password',
    doc.querySelectorAll('#shvRstOtp input').length === 4 &&
    !!doc.getElementById('shvRstPw') && !!doc.getElementById('shvRstPw2'));
  const demo = doc.getElementById('shvDemo');
  const code = demo && !demo.hidden ? (demo.textContent.match(/(\d{4})/) || [])[1] : '';
  T('sheet: the sandbox shows the 4-digit code it texted', !!code && code.length === 4, String(code));
  const resend = doc.getElementById('shvRstResend');
  T('sheet: resend is a countdown, not a dead link', !!resend &&
    /Resend in \d+s/.test(resend.textContent) && resend.disabled === true,
    resend ? resend.textContent.trim() + ' disabled=' + resend.disabled : 'missing');

  /* mismatched passwords must be refused before the server is touched */
  type(window, doc.getElementById('shvRstPw'), NEW);
  type(window, doc.getElementById('shvRstPw2'), NEW + 'X');
  const boxes = [...doc.querySelectorAll('#shvRstOtp input')];
  if (code) code.split('').forEach((d, i) => type(window, boxes[i], d));
  /* the code auto-submits once four digits are in (ShivaaOtp.watch); jsdom
     does not run that watcher's own timing, so the tap is made explicitly —
     the same button a shopper presses */
  click(window, doc.getElementById('shvRstNewBtn'));
  await until(() => /not the same/i.test(doc.querySelector('.shv-body').textContent), 6000);
  T('sheet: two different passwords are refused with plain words',
    /The two passwords are not the same/.test(doc.querySelector('.shv-body').textContent));

  /* match them and this time it is real */
  type(window, doc.getElementById('shvRstPw2'), NEW);
  click(window, doc.getElementById('shvRstNewBtn'));
  await until(() => doc.getElementById('shvRstDone'), 9000);
  const done = doc.getElementById('shvRstDone');
  T('sheet: the reset completes and says so', !!done && /Password updated/.test(doc.querySelector('.shv-body').textContent));
  T('sheet: the shopper is sent to the door that matches their role',
    !!done && /Sign in/.test(done.textContent) && !/Partner/.test(done.textContent),
    done ? done.textContent.trim() : 'missing');
  T('sheet: the shopper is told the other devices were signed out',
    /signed out/i.test(doc.querySelector('.shv-body').textContent));

  /* the claim the whole flow exists to make */
  const withNew = await call('auth/login', { email, password: NEW });
  T('proof: the NEW password signs in', withNew.status === 200 && !!withNew.j.token, 'status ' + withNew.status);
  const withOld = await call('auth/login', { email, password: OLD });
  T('proof: the OLD password is refused', withOld.status === 401, 'status ' + withOld.status);

  /* and the email path still resolves the same account */
  const byEmail = await call('auth/reset/start', { email });
  T('api: the email path still finds the account and texts the registered mobile',
    byEmail.status === 200 && !!byEmail.j.devCode && /registered mobile/i.test(String(byEmail.j.message || '')),
    byEmail.j.message || 'status ' + byEmail.status);

  T('live: no page errors from the recovery flow', errors.filter(e => !NOISE.test(e)).length === 0,
    errors.filter(e => !NOISE.test(e)).join(' | ').slice(0, 180));
}

clearTimeout(WATCHDOG);
console.log(ok.map(n => '  ✓ ' + n).join('\n'));
if (bad.length) { console.log('\n' + bad.map(n => '  ✗ ' + n).join('\n')); console.log('\nFAIL ' + bad.length + ' of ' + (ok.length + bad.length)); process.exit(1); }
console.log('\nPASS ' + ok.length + ' of ' + ok.length);
process.exit(0);
