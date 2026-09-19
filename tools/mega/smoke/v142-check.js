/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v142 check — Automatic Guest Checkout (One-Tap Buy).

   Owner brief (verbatim intent): fully automatic checkout WITHOUT a site
   login/OTP. Clicking "Make It Yours" places and pays the order; name,
   number, address and the payment method are verified automatically on
   Cashfree's own page; the only thing the customer types is their bank-side
   UPI PIN / net-banking password (or their card OTP where the bank sends one).

   What v142 actually ships, and what this gate pins:
   · the flag, the combined pay/config gate and the express buyer are present
   · the classic checkout is UNCHANGED for members (guestOrder is opt-in)
   · a member-account order can NOT be read or paid by forging the pin
   · a live-Cashfree+OCC connection is REQUIRED before express reports on
   · the Cashfree return can NOT resurrect a guest link without the pin
   · every ?v= stamp that changed moves 141 → 142 together, and the
     staff bundle (admin.js) moves with it, exactly as v141 fixed.

   Run: node tools/mega/smoke/v142-check.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

const results = [];
/* v150 · numeric stamp floors — never ranges: 150 must pass a v117 pin the same way 149 did. */
const st = (src, re) => { const m = String(src).match(re); return m ? +m[1] : 0; };

const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const shell = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const admin = fs.readFileSync(path.join(CMS, 'js/admin.js'), 'utf8');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');

console.log('\n· A · the automatic guest checkout exists');

ok('release triple moves together to 142 or newer (index.html · app.js · sw.js)',
  st(shell, /window\.__SHIVAA_REL=(\d+);/) >= 142 && st(app, /APP_REL\s*=\s*(\d+)/) >= 142 && st(sw, /SHELL = 'shivaa-shell-v(\d+)'/) >= 142,
  'index.html/app.js/sw.js stamps must all read 142+');

ok('the moved set is consistent — v116.js and v117.js ride 142 in shell + worker (house rule: bump every ?v= together)',
  /\/js\/v116\.js\?v=142/.test(shell) && /\/js\/v117\.js\?v=142/.test(shell) &&
  /'\/js\/v116\.js\?v=142'/.test(sw) && /'\/js\/v117\.js\?v=142'/.test(sw),
  'a changed stamped file must update index.html AND sw.js; v116/v117 move in lockstep');

ok('the staff bundle stamp (admin.js) moves with it to v142+ (the v141 fix must not regress)',
  (/injectScript\('\/js\/admin\.js\?v=(14[2-9]|1[5-9]\d|2\d\d)'\)/.test(app) || /injectScript\('\/js\/admin\.js\?v=' \+ APP_REL\)/.test(app)) && !/admin\.js\?v=128/.test(app),
  'app.js must load /js/admin.js?v=142+, never v128');

ok('the owner-facing switch exists in the admin payments panel',
  /name="guestCheckout"/.test(admin) && /Automatic Guest Checkout \((One-Tap Buy|tap (&rarr;|→) Cashfree, no pages)\)/.test(admin),   // v153 relabelled the same switch
  'admin.js must render the guestCheckout toggle');

ok('admin saves the switch as a strict boolean',
  /guestCheckout: !!document\.querySelector\('\[name="guestCheckout"\]'\)\?\.checked/.test(admin),
  'savePay must read the checkbox');

ok('the express buyer, express page and guest pin helpers are wired in app.js',
  (/pages\.express\s*=/.test(app) || /window\.Shivaa\.exDirect\s*=/.test(app)) && /expressCheckoutOn/.test(app) && /guestPinFor/.test(app),   // v153: route-less in-page engine counts as wired
  'app.js must define the express route and its gates');

ok('the storefront place-order API accepts a guest only when the flag is on',
  /guestCheckout['\]]/.test(api) && /Login required to place order/.test(api) && /guestBuyOk/.test(api),
  'api.php must gate guest ordering behind the settings flag');

console.log('\n· B · the safety rails');

ok('no guest order ships as COD/WhatsApp — the server rejects it even if the UI is bypassed',
  /!\$u && \$pm !== 'Online'/.test(api) && /paymentMethod: 'Online'/.test(app),
  'orders POST must force guest orders prepaid-online');

ok('the Cashfree return code only re-checks the pin against guest-flagged orders',
  /\(\$o\['guest'\] \?\? false\)\s*===\s*true/.test(api) || /\$x\['guest'\] \?\? false/.test(api) || /\$o\['guest'\] \?\? false/.test(api),
  'return route must require guest:true before accepting a pin');

ok('guest order creation can never mint endless gateway sessions (per-order cap)',
  /too many payment sessions/i.test(api),
  'pay/order must refuse once the per-order session cap is hit');

ok('the order page fetches, pays and polls with the guest pin',
  /\?pin=' \+ encodeURIComponent\(pin\)/.test(app) && /(payForOrder|exHandoff)\(res\.id, res\.pin/.test(app) && /pin: pin \|\| ''/.test(app),
  'the full guest lifecycle must carry the pin end-to-end (v155: exHandoff replaced payForOrder in the lane)');

console.log('\n· C · the classic path is untouched');

ok('member checkout still routes through the login-gated checkout (express is opt-in)',
  /openLogin\('checkout'\)/.test(app) && /pages\.checkout/.test(app),
  'pages.checkout must keep its member gate (v145+ may send guests to express first)');

ok('the Cashfree secret key appears nowhere in the storefront (server-side only)',
  !/cfSecretKey/.test(app) && /cfSecretKey/.test(admin) && /cfSecretKey/.test(api),
  'secret handling stays in admin.js + api.php, never app.js');

const pass = results.filter(Boolean).length;
const total = results.length;
console.log(`\n  ${pass}/${total} passed`);
process.exit(pass === total ? 0 : 1);
