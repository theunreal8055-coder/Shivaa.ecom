/* SHIVAA · v129 check — "the spinner must name the reason"
   ─────────────────────────────────────────────────────────────────────────
   Proves the v129 repair:
     A  the bug was REAL      — the shipped app.js discards the Promise that
                                cf.checkout() returns (named control check)
     B  the fix reads it      — result.error.message reaches the screen
     C  it is visible & stays — a persistent red box, not a 3.2 s toast
     D  it still throws       — app.js's existing .catch() path is preserved
     E  it stays in its lane  — no sw.js swap, no stamp bump, no route/price/
                                rate/API edit, no design change
     F  the happy path        — result.redirect must NOT paint an error

   Run from the repo root:  node tools/mega/smoke/v129-check.js
*/
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

const results = [];
const ok = (name, cond, detail = '') => {
  results.push({ name, pass: !!cond, detail });
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail && !cond ? '\n          ' + detail : ''));
};

const appJs = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const v129Js = fs.readFileSync(path.join(CMS, 'js/v129.js'), 'utf8');
const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const swJs = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');

/* ── a minimal DOM carrying the real hand-off sheet app.js paints ───────── */
function session({ checkout }) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>',
    { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;

  /* the sheet markup app.js's cashfreeRedirectSheet() injects, verbatim ids */
  w.document.body.innerHTML = `<div id="cfHandoff">
      <div class="pp-spinner"></div>
      <h3>Opening secure Cashfree checkout…</h3>
      <p>Keep this tab open.</p>
      <button type="button" id="cfContinue">Continue to Cashfree</button>
      <button type="button" id="cfCancel">Return to my order</button>
    </div>`;

  w.Shivaa = {};
  /* the SDK global, pre-loaded so the layer never injects a real script tag */
  w.Cashfree = function (opts) { w.__cfMode = opts && opts.mode; return { checkout }; };

  w.eval(v129Js);
  return w;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  /* ─── A · THE NAMED CONTROL: the bug was real in the shipped code ─────── */
  const launcher = (appJs.match(/window\.Shivaa\.cashfreeCheckout\s*=\s*async[\s\S]*?\n\};/) || [''])[0];
  ok('control · the shipped app.js launcher really does discard the checkout() Promise',
    /cf\.checkout\(\{[\s\S]*?\}\);/.test(launcher) &&
    !/(await|\.then\()\s*cf\.checkout|result\.error/.test(launcher) &&
    /return true;/.test(launcher),
    'app.js:cashfreeCheckout — expected a bare cf.checkout(...) call whose result is never read');
  ok('control · and therefore reports success unconditionally (the endless spinner)',
    /cf\.checkout\([\s\S]*?\);\s*\n\s*return true;/.test(launcher));

  /* ─── B/C/D · the fix reads the error, shows it, and still throws ─────── */
  const MSG = 'order_id is not associated with this merchant account';
  let threw = null;
  const w1 = session({ checkout: () => Promise.resolve({ error: { message: MSG, type: 'request_failed', code: 'order_not_found' } }) });
  try {
    await w1.Shivaa.cashfreeCheckout('session_ABCDEF123456_xyz', 'production');
  } catch (e) { threw = e; }

  const boxEl = w1.document.getElementById('cfWhy');
  ok('the layer installs over app.js\'s launcher', typeof w1.Shivaa.cashfreeCheckout === 'function');
  ok('B · Cashfree\'s real message is read out of result.error.message',
    !!boxEl && boxEl.textContent.includes(MSG),
    boxEl ? 'box text: ' + boxEl.textContent.slice(0, 120) : 'no #cfWhy box was painted');
  ok('C · it is painted as a persistent element inside the hand-off sheet',
    !!boxEl && boxEl.closest('#cfHandoff') !== null);
  ok('C · it is announced to screen readers as an alert',
    !!boxEl && boxEl.getAttribute('role') === 'alert');
  ok('C · it sits above the buttons, so it cannot be missed',
    !!boxEl && !!w1.document.getElementById('cfContinue') &&
    (boxEl.compareDocumentPosition(w1.document.getElementById('cfContinue')) & 4) !== 0);
  ok('C · the diagnostic facts travel with it (mode + session prefix + origin)',
    !!boxEl && /mode:\s*production/.test(boxEl.textContent) &&
    /session:\s*session_ABCD/.test(boxEl.textContent) && /origin:/.test(boxEl.textContent));
  ok('C · the full payment session id is NEVER printed (it is a credential)',
    !!boxEl && !boxEl.textContent.includes('session_ABCDEF123456_xyz'));
  ok('C · the SDK error code/type is surfaced for one-shot diagnosis',
    !!boxEl && /order_not_found/.test(boxEl.textContent) && /request_failed/.test(boxEl.textContent));
  ok('D · it still throws, so app.js\'s existing .catch(toast) keeps working',
    threw instanceof w1.Error || (threw && threw.message === MSG),
    'threw: ' + (threw && threw.message));
  ok('D · the thrown message is Cashfree\'s own words, not ours',
    threw && threw.message === MSG);
  ok('the SDK was initialised in the mode it was handed', w1.__cfMode === 'production');

  /* a rejected promise (the other shape) must behave identically */
  const w2 = session({ checkout: () => Promise.reject({ message: 'payment session has expired', code: 'session_expired' }) });
  let threw2 = null;
  try { await w2.Shivaa.cashfreeCheckout('session_ZZZ999_abc', 'sandbox'); } catch (e) { threw2 = e; }
  const box2 = w2.document.getElementById('cfWhy');
  ok('B · a REJECTED checkout() promise is surfaced the same way',
    !!box2 && box2.textContent.includes('payment session has expired') &&
    threw2 && threw2.message === 'payment session has expired');
  ok('the sandbox mode is passed through untouched', w2.__cfMode === 'sandbox');

  /* ─── F · the happy path must stay silent ─────────────────────────────── */
  const w3 = session({ checkout: () => Promise.resolve({ redirect: true }) });
  const okRes = await w3.Shivaa.cashfreeCheckout('session_HAPPY_1', 'production');
  ok('F · a successful redirect paints NO error box and resolves true',
    okRes === true && !w3.document.getElementById('cfWhy'));

  /* a missing session id is called out as a server failure, not a spinner */
  const w4 = session({ checkout: () => Promise.resolve({ redirect: true }) });
  let threw4 = null;
  try { await w4.Shivaa.cashfreeCheckout('', 'production'); } catch (e) { threw4 = e; }
  const box4 = w4.document.getElementById('cfWhy');
  ok('a missing payment session is named as a server-side failure',
    !!threw4 && !!box4 && /server-side/i.test(box4.textContent) && /MISSING/.test(box4.textContent));

  /* the watchdog: a checkout() that never settles must not spin in silence */
  const w5 = session({ checkout: () => new Promise(() => {}) });
  w5.Shivaa.cashfreeCheckout('session_HANG_1', 'production').catch(() => {});
  ok('a checkout() that never answers is still silent before the watchdog',
    !w5.document.getElementById('cfWhy'));
  ok('the watchdog exists and is a bounded wait (not a promise of failure)',
    /WATCHDOG_MS\s*=\s*\d+/.test(v129Js) && /Still waiting for Cashfree/.test(v129Js));

  /* ─── E · scope: this repair must not become a release ────────────────── */
  ok('E · the shell loads the v129 layer, last',
    /<script src="\/js\/v129\.js\?v=129" defer><\/script>/.test(html) &&
    html.indexOf('/js/v129.js') > html.indexOf('/js/v127.js'));
  ok('E · sw.js is NOT swapped — the shell stamp is untouched (owner rule #3)',
    /shivaa-shell-v128/.test(swJs) && !/v129/.test(swJs));
  ok('E · no release stamp bump (__SHIVAA_REL and APP_REL stay as found)',
    /window\.__SHIVAA_REL=128;/.test(html) && /const APP_REL = 128;/.test(appJs));
  ok('E · app.js itself is not edited by this repair (the launcher is overridden at runtime)',
    /window\.Shivaa\.cashfreeCheckout\s*=\s*async \(paymentSessionId, env\)/.test(appJs));
  /* strip comments and string literals before scanning for forbidden calls —
     an explanatory sentence naming /api/pay/order is prose, not a call site */
  const code129 = v129Js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""');
  ok('E · the layer registers no route and touches no price, rate or API',
    !/Shivaa\.routes/.test(code129) && !/\bfetch\s*\(/.test(code129) &&
    !/XMLHttpRequest/.test(code129) && !/\bprice\s*\(/.test(code129) &&
    !/loadRates/.test(code129),
    'forbidden call site found in executable code');
  ok('E · the layer ships no CSS file and injects no stylesheet',
    !/\.css\b/.test(code129) && !/createElement\s*\(\s*''\s*\)[\s\S]{0,40}stylesheet/.test(code129) &&
    !/<link/.test(v129Js) && !/rel\s*=\s*["']stylesheet/.test(v129Js));
  ok('E · it only ever overrides the one launcher function',
    (code129.match(/window\.Shivaa\.\w+\s*=/g) || []).sort().join(',') ===
      'window.Shivaa.__v129 =,window.Shivaa.cashfreeCheckout =',
    'assignments: ' + (code129.match(/window\.Shivaa\.\w+\s*=/g) || []).join(','));
  /* exactly one script element is ever created, and its src is the SDK
     constant, which is Cashfree's own official CDN URL and nothing else */
  const srcAssigns = code129.match(/\.src\s*=\s*[^;]+;/g) || [];
  const sdkUrls = v129Js.match(/https?:\/\/[^'"\s]+/g) || [];
  ok('E · the only script it ever injects is Cashfree\'s own official SDK',
    srcAssigns.length === 1 && /\.src\s*=\s*SDK;/.test(code129) &&
    /var SDK = 'https:\/\/sdk\.cashfree\.com\/js\/v3\/cashfree\.js';/.test(v129Js) &&
    sdkUrls.every(u => u === 'https://sdk.cashfree.com/js/v3/cashfree.js'),
    'src assignments: ' + srcAssigns.join(' | ') + ' · urls: ' + sdkUrls.join(','));
  ok('E · installing twice is a no-op (idempotent guard)', (() => {
    const w = session({ checkout: () => Promise.resolve({ redirect: true }) });
    const first = w.Shivaa.cashfreeCheckout;
    w.eval(v129Js);
    return w.Shivaa.cashfreeCheckout === first;
  })());
  ok('E · it never invents an error message it was not given', await (async () => {
    const w = session({ checkout: () => Promise.resolve({ error: {} }) });
    try { await w.Shivaa.cashfreeCheckout('session_X_1', 'production'); return false; }
    catch (e) { return /gave no message/.test(e.message); }
  })());

  await sleep(10);

  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} v129 checks passed  ${passed === results.length ? '✦' : '✗'}`);
  process.exit(passed === results.length ? 0 : 1);
})();
