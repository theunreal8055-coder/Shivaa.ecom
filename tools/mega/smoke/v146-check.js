/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v146 check — cart checkout crash + Truecaller rebuilt.

   1. Cart → Checkout no longer throws "Something slipped" (Back never reads
      item.id on the cart flow).
   2. Guest cart checkout / checkout page go to One-Tap Buy (#/express).
   3. Truecaller no longer waits on a Hostinger-blocked server callback:
      visibility/focus return → "type the number you just saw".
   4. Phone is required (client + guest order create + pay/order).
   5. Release triple is 146 everywhere, staff bundle included.

   Run: node tools/mega/smoke/v146-check.js
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
ok('release triple is 146 (index.html · app.js · sw.js)',
  (Number((/window\.__SHIVAA_REL=(\d+);/.exec(shell)||[0,0])[1]) >= 146 && Number((/APP_REL\s*=\s*(\d+)/.exec(app)||[0,0])[1]) >= 146 && Number((/SHELL = 'shivaa-shell-v(\d+)'/.exec(sw)||[0,0])[1]) >= 146 /* v148 fix-forward */));
ok('index.html and the worker both request /js/app.js?v=<the release> (>=146, lockstep; v148 fix-forward)',
  (() => {
    const r = Number((/window\.__SHIVAA_REL=(\d+);/.exec(shell) || [0, 0])[1]);
    return r >= 146 && new RegExp('/js/app\\.js\\?v=' + r).test(shell) && new RegExp("'/js/app\\.js\\?v=" + r + "'").test(sw);
  })());
ok('staff bundle stamp moved to 146 (never v128)',
  /injectScript\('\/js\/admin\.js\?v=14[6-9]'\)/.test(app) && !/admin\.js\?v=128/.test(app));
ok('no leftover 144 handshake in the triple',
  !/__SHIVAA_REL=144;/.test(shell) && !/APP_REL\s*=\s*144/.test(app) && !/shivaa-shell-v144/.test(sw));

console.log('\n· B · cart / express');
ok('express page supports cart AND buy-now (fromCart)',
  /const fromCart = !window\.Shivaa\._expressItem && state\.cart\.length > 0/.test(app));
ok('Back button never reads item.id (cart crash)',
  !/location\.hash = '#\/product\/\$\{esc\(item\.id\)\}'/.test(app) &&
  /location\.hash='\$\{fromCart \? '#\/cart' : '#\/shop'\}'/.test(app));
ok('guest cart checkout goes to #/express',
  /expressCheckoutOn\(\) && !state\.user \? '#\/express' : '#\/checkout'/.test(app));
ok('guest checkout page redirects to express',
  /if \(expressCheckoutOn\(\)\) \{ location\.hash = '#\/express'; return; \}/.test(app));

console.log('\n· C · Truecaller rebuilt');
ok('Truecaller button still mounts on the express page',
  /id="tcMount"/.test(app) && /truecallersdk:\/\/truesdk\/web_verify/.test(app));
ok('return is detected via visibilitychange + focus (not an infinite wait spinner)',
  /document\.addEventListener\('visibilitychange'/.test(app) &&
  /Type the <b>10-digit number you just saw in Truecaller<\/b>/.test(app) &&
  !/Waiting for Truecaller verification…/.test(app));
ok('callback poll exists (v146: bonus auto-fill · v147: primary path with auto-continue)',
  /auth\/truecaller\/result/.test(app) &&
  (/startBonusPoll/.test(app) || /doBuy\(phone, nonce\)/.test(app)));
ok('server keeps callback / result / config routes + Partner Key validation',
  /auth\/truecaller\/callback/.test(api) && /auth\/truecaller\/result/.test(api) &&
  /auth\/truecaller\/config/.test(api) && /tcAppKey/.test(api) && /tcAppKey/.test(admin));

console.log('\n· D · phone required');
ok('express page validates a 10-digit phone before placing the order',
  /Please enter a valid 10-digit mobile number/.test(app));
ok('guest order create rejects empty/placeholder phone',
  /Please enter your real 10-digit mobile number/.test(api) && /\$gPhone === '9999999999'/.test(api));
ok('pay/order still refuses guest placeholder 9999999999',
  /!\$u && \$phone === '9999999999'/.test(api));

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v146 checks passed  ${n === results.length ? '✦' : ''}`);
process.exit(n === results.length ? 0 : 1);
