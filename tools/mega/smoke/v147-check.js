/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v147 check — TRUECALLER ONE TAP → STRAIGHT TO CASHFREE.

   Owner brief (19 Sep 2026): "true caller should automatically take me to
   the next page of cash free and monthly check out … skip every process and
   take directly to the pre filled addresses … just buy a one click of
   truecaller". v146 made the customer TYPE the number they saw; v147 removes
   that step honestly — the number arrives from Truecaller's servers to OUR
   servers, the page polls it up, fills itself and fires the buy by itself.

   What this gate pins (all static, run against the tree OR a zip overlay
   with SMOKE_CMS=<dir>):
     A · release triple 147 everywhere, staff bundle included
     B · server: handshake/rejected honoured, answer-before-work ordering,
         one-file-per-nonce store, SSRF-allowlisted endpoint, result shapes,
         config doctor fields, guest order override via tcNonce
     C · storefront: shared buy path, poll-then-auto-buy, resume across a
         tab reload, typed entry ONLY as fallback
     D · admin: callback URL shown + connection doctor
     E · v142 guest-safety invariants still standing (prepaid-only, gate)

   Run: node tools/mega/smoke/v147-check.js
   ═══════════════════════════════════════════════════════════════════════ */

/* v152 · retired-feature guard — the phone-verify vendor was REMOVED by owner
   decision 19 Sep (Express to Cashfree direct is the flow). This suite documents
   the v143–v151 era: it SKIPs (exit 0) on trees without the feature and still
   fully RUNS on any older tree/overlay (SHIVAA_ROOT / SMOKE_CMS). */
{
  const _fs = require('fs'), _pt = require('path');
  const _root = process.env.SHIVAA_ROOT || _pt.resolve(__dirname, '../../..');
  const _cms = process.env.SMOKE_CMS || _pt.join(_root, 'cms');
  let _api = '';
  try { _api = _fs.readFileSync(_pt.join(_cms, 'api.php'), 'utf8'); } catch (e) {}
  if (!/auth\/truecaller\/callback/.test(_api)) { console.log('SKIP — v152: verification vendor not in this tree'); process.exit(0); }
}
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const shell = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const admin = fs.readFileSync(path.join(CMS, 'js/admin.js'), 'utf8');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');

console.log('\n· A · stamps');
ok('release triple is >=147 in lockstep (index.html · app.js · sw.js)  [v148 fix-forward: numeric]',
  (() => {
    const g = (re, t) => Number((re.exec(t) || [0, 0])[1]);
    const r1 = g(/window\.__SHIVAA_REL=(\d+);/, shell), r2 = g(/APP_REL\s*=\s*(\d+)/, app), r3 = g(/SHELL = 'shivaa-shell-v(\d+)'/, sw);
    return r1 >= 147 && r1 === r2 && r2 === r3;
  })());
ok('index.html and the worker both request /js/app.js?v=<the release> (lockstep)',
  (() => {
    const r = (Number((/window\.__SHIVAA_REL=(\d+);/.exec(shell) || [0, 0])[1]));
    return new RegExp('/js/app\\.js\\?v=' + r).test(shell) && new RegExp("'/js/app\\.js\\?v=" + r + "'").test(sw);
  })());
ok('staff bundle rides >=147 (unchanged files may keep their older bump)',
  /injectScript\('\/js\/admin\.js\?v=1(4[7-9]|[5-9]\d)'\)/.test(app));

console.log('\n· B · server — the callback can actually land, fast, and is observable');
const cbStart = api.indexOf("auth/truecaller/callback' && $method === 'POST'");
const cbSlice = cbStart === -1 ? '' : api.slice(cbStart, api.indexOf("auth/truecaller/result", cbStart));
ok('callback honours the flow_invoked handshake', /status === 'flow_invoked'/.test(cbSlice));
ok('callback honours user_rejected / flow_cancelled', /user_rejected/.test(cbSlice) && /flow_cancelled/.test(cbSlice));
ok('callback ANSWERS before the profile fetch (Truecaller\u2019s 3 s rule)',
  cbSlice.indexOf('fastcgi_finish_request') !== -1 && cbSlice.indexOf('fastcgi_finish_request') < cbSlice.indexOf('truecaller_fetch_profile($token'));
ok('callback NEVER writes db.json (unlocked route) and carries no audit_log', !/audit_log\(/.test(cbSlice));
ok('store is one file per nonce (sha1-named, atomic) — no shared-JSON race',
  /function tc_verify_path/.test(api) && /sha1\(\$nonce\)/.test(api) && !/function tc_store_read/.test(api));
ok('profile endpoint is allowlisted to truecaller.com over https (no SSRF; v148 shape-tolerant)',
  api.indexOf("preg_match('#^https://(?:[a-z0-9\\-]+\\.)*truecaller\\.com/", api.indexOf('function truecaller_fetch_profile')) !== -1);
ok('result route returns invoked / rejected states, verified only on a real Indian mobile',
  /'invoked' => true/.test(api) && /'rejected' => true/.test(api) && /\^\[6-9\]\\d\{9\}\$\/\', \(string\)\(\$entry\['phone'\]/.test(api));
ok('config route is the doctor: callbackUrl + dataWritable + lastCallbackAt',
  /'callbackUrl'\s*=>\s*shv_site_base\(\$db\) \. '\/api\/auth\/truecaller\/callback'/.test(api) &&
  /'dataWritable'\s*=>/.test(api) && /'lastCallbackAt'/.test(api));

console.log('\n· C · orders — the verified number is the server\u2019s, not the browser\u2019s');
const ordStart = api.indexOf("if (\$route === 'orders' && \$method === 'POST')");
const ordSlice = ordStart === -1 ? '' : api.slice(ordStart, ordStart + 12000);
ok('guest POST /api/orders accepts tcNonce and re-reads the phone from the server store',
  /b\['tcNonce'\]/.test(ordSlice) && /tc_entry_get\(\$tcNonce\)/.test(ordSlice) &&
  /\$b\['address'\]\['phone'\] = \(string\)\$tc\['phone'\]/.test(ordSlice));
ok('verified name replaces the placeholder; order is tagged truecaller=verified',
  ordSlice.includes("$b['address']['name'] = mb_substr($tcName, 0, 60)") &&
  /if \(\$tcVerified\) \$order\['truecaller'\] = 'verified'/.test(api));
ok('unknown/absent nonce degrades to the v146 typed flow — the override can never reject an order',
  (tcSlice => tcSlice !== '' && !tcSlice.includes('jout(') && tcSlice.includes('$tcVerified = false;'))(
    (() => { const a = ordSlice.indexOf('$tcVerified = false;'); const b = ordSlice.indexOf('$R = current_rates'); return a === -1 || b === -1 ? '' : ordSlice.slice(a, b); })()
  ));

console.log('\n· D · storefront — poll, fill, BUY — no typing');
ok('one shared buy path for button and auto-continue (doBuy with tcNonce)',
  /const doBuy = async \(tcPhone, tcNonce\)/.test(app) && /exBtn\.onclick = \(\) => doBuy\(\);/.test(app) && /body\.tcNonce = tcNonce/.test(app));
ok('verified result AUTO-fires the purchase (the one tap the owner asked for)',
  /await doBuy\(phone, nonce\);/.test(app));
ok('the poll is fast (700 ms) then PATIENT (v148: 3.5 s watch to a 9-min deadline, never a hard stop at 40 s)',
  /setInterval\(pollOnce, slow \? 3500 : 700\)/.test(app) && /polls === 55/.test(app)
  && /Date\.now\(\) \+ 9 \* 60 \* 1000/.test(app) && /if \(slow && Date\.now\(\) > DEADLINE\)/.test(app));
ok('the nonce survives an Android tab reload (localStorage shv_tc_pending + resume)',
  /shv_tc_pending/.test(app) && /Re-attaching to your Truecaller verification/.test(app));
ok('typed entry survives ONLY as the fallback, with the v146 wording',
  /Type the <b>10-digit number you just saw in Truecaller<\/b> and tap Make It Yours/.test(app) && /fallbackTyping\('Truecaller did not report back to us'\)/.test(app));
ok('hidden-tab safety: number is held and fired on return, never navigated away unseen',
  /if \(document\.hidden\) \{ ready = \{ phone: r\.phone, name: r\.name \|\| '' \}; stop\(\); return; \}/.test(app));
ok('a reloaded mid-flow Buy Now item is restored only while a verification is in flight',
  /shv_ex_item/.test(app) && /store\.get\('shv_tc_pending', null\)/.test(app));
ok('the one-shot item is spent when the order lands (no stale hijack of cart checkout)',
  /window\.Shivaa\._expressItem = null;\s*\n\s*try \{ store\.set\('shv_ex_item', null\)/.test(app));
ok('last verified number is remembered per device for the next visit (localStorage only)',
  /shv_tc_phone/.test(app));

console.log('\n· E · admin — the owner can SEE why it would fail');
ok('the card shows the EXACT callback URL for the Truecaller console',
  /tcCbUrl/.test(admin) && /\/api\/auth\/truecaller\/callback/.test(admin) &&
  /document\.getElementById\('tcCbUrl'\)/.test(admin));
ok('connection doctor reads the server trail',
  /window\.ShivaaAdmin\.tcCheck = async/.test(admin) && /Check Truecaller connection/.test(admin));

console.log('\n· F · v142 guest-safety invariants must not regress');
ok('guest orders still need the switch and stay prepaid-only server-side',
  /!\$u && \!\$guestBuyOk\) jout\(401/.test(api) && /!\$u && \$pm !== 'Online'\)\s*\n?\s*jout\(400/.test(api));
ok('express still refuses to render unless the server says cashfree+guestCheckout',
  /cfg\.mode !== 'cashfree' \|\| cfg\.guestCheckout !== true/.test(app));
ok('guest phone placeholder 9999999999 still rejected at pay/order',
  /!\$u && \$phone === '9999999999'/.test(api));

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v147 checks passed  ${n === results.length ? '✦' : ''}`);
process.exit(n === results.length ? 0 : 1);
