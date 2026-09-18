/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA payment audit — assertion gate for docs/PAYMENT-EXPERIENCE-NEXT.md

   Every check here asserts that a finding from the 18 Sep 2026 payment audit
   is STILL PRESENT in the source. It is a regression net for the audit
   itself: run it before fixing anything (expect 24/24), then re-run after
   each repair and watch the corresponding line flip to FIXED.

   Nothing is executed — the payment backend is PHP and this sandbox has no
   PHP binary — so every assertion is a source-level pattern with the
   file:line it came from. A PASS means "the bug is confirmed present".

   Run:  node tools/mega/smoke/pay-audit-check.js
   ══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const rd = (p) => fs.readFileSync(path.join(CMS, p), 'utf8');

const api = rd('api.php');
const app = rd('js/app.js');
const admin = rd('js/admin.js');
const htaccess = rd('.htaccess');
const sw = rd('sw.js');
const html = rd('index.html');

const results = [];
const ok = (id, name, pass, detail = '') => {
  results.push(!!pass);
  console.log(`${pass ? '  PRESENT ' : '  FIXED   '}#${id}  ${name}${!pass && detail ? '\n            ' + detail : ''}`);
};
const lines = (src) => src.split('\n');

/* ── Part 2 findings ──────────────────────────────────────────────────── */

// #10 — the reconcile routes are excluded from the request-level write lock
const lockFn = api.slice(api.indexOf('function shv_wants_write_lock'), api.indexOf('function shv_acquire_lock'));
ok(10, 'cashfree webhook + status are on the $slow no-lock list (lost-update window)',
  /'pay\/cashfree\/status' => 1, 'pay\/cashfree\/webhook' => 1/.test(lockFn)
  && /if \(isset\(\$slow\[\$route\]\)\) return false;/.test(lockFn),
  'expected both routes in $slow and the early return');

// #11 — webhook answers 200 unconditionally
const whBlock = api.slice(api.indexOf("if ($route === 'pay/cashfree/webhook'"), api.indexOf("if ($route === 'pay/cashfree/status'"));
ok(11, 'webhook returns 200 even when the reconcile failed (Cashfree stops retrying)',
  /\$cashfree_reconcile\(\$wi, \$cfOrderId\);/.test(whBlock)
  && !/= \$cashfree_reconcile\(/.test(whBlock)
  && /jout\(200, \['success' => true\]\);/.test(whBlock)
  && !/jout\(5\d\d/.test(whBlock),
  'expected the reconcile result to be discarded and only a 200 emitted');

// #12 — refund rows are advanced only from the customer poller
const applyFn = api.slice(api.indexOf('function cashfree_apply('), api.indexOf('function cashfree_apply_refund('));
const refundCalls = (api.match(/cashfree_apply_refund\(/g) || []).length;
ok(12, 'refund webhooks never advance refund rows (poller-only)',
  !/cashfree_apply_refund/.test(applyFn)
  && !/cashfree_apply_refund/.test(whBlock)
  && refundCalls === 2,            // definition + the single poller call site
  `expected 1 call site outside the definition, found ${refundCalls - 1} definition(s)+calls`);

// #13 — instrument is read off the order entity, which has no payment_method
ok(13, "ledger 'instrument' reads order-entity payment_method (always empty)",
  /'instrument' => substr\(\(string\)\(\$st\['payment_method'\] \?\? ''\), 0, 40\)/.test(api)
  && !/\/pg\/orders\/' \. rawurlencode\([^)]*\) \. '\/payments'/.test(api)
  && !/cf_payment_id/.test(api),
  'expected the order-entity read and no /payments call, no cf_payment_id anywhere');

// #14 — no settlement reconciliation
ok(14, 'no settlement reconciliation (/pg/settlements never called)',
  !/\/pg\/settlements/.test(api));

// #15 — order_add_payment clamps an overpayment to a ₹0 row
const oap = api.slice(api.indexOf('function order_add_payment'), api.indexOf('function order_add_payment') + 1400);
ok(15, 'order_add_payment clamps an overpayment to ₹0 instead of recording it',
  /\$room = max\(0, \(int\)\(\$ord\['total'\] \?\? 0\) - \$already\);/.test(oap)
  && /\$pay\['amount'\] = max\(0, min\(\$pay\['amount'\], \$room\)\);/.test(oap));

// #16 — points are granted at order creation and never clawed back
const loyaltyWrites = lines(api).filter(l => /loyaltyPoints'\]\s*=/.test(l));
ok(16, 'royalty points granted at order creation, never clawed back on refund',
  loyaltyWrites.length === 1
  && /- \$pointsUsed\) \+ \$earned/.test(loyaltyWrites[0])
  && !/loyaltyPoints/.test(api.slice(api.indexOf("route === 'admin/refund'"), api.indexOf("route === 'admin/refund'") + 3000)),
  `expected exactly 1 loyaltyPoints assignment, found ${loyaltyWrites.length}`);

// #17 — admin PUT sets paymentStatus with no ledger movement
const putBlock = api.slice(api.indexOf("if (preg_match('#^orders/([\\w-]+)$#', $route, $m))"), api.indexOf('v128 · payments'));
ok(17, 'admin PUT can set paymentStatus with no ledger row / amountPaid / balance',
  /\$x\['paymentStatus'\] = substr\(\(string\)\$patch\['paymentStatus'\], 0, 40\);/.test(putBlock)
  && !/order_add_payment/.test(putBlock)
  && !/amountPaid/.test(putBlock),
  'expected the raw assignment with no ledger write in the same block');

// #18 — pay/proof regresses a Paid order
const proofBlock = api.slice(api.indexOf("if ($route === 'pay/proof'"), api.indexOf("if ($route === 'admin/pay-proofs'"));
ok(18, "pay/proof forces 'Proof submitted' even on an already-Paid order",
  /\$db\['orders'\]\[\$i\]\['paymentStatus'\] = 'Proof submitted';/.test(proofBlock)
  && !/amountPaid.*>=.*total|paymentStatus.*=== 'Paid'/.test(proofBlock.slice(0, proofBlock.indexOf("'Proof submitted'"))),
  'expected the unconditional assignment with no paid-guard before it');

// #19 — the return redirect blocks on the gateway call before the 302
const retBlock = api.slice(api.indexOf("if ($route === 'pay/cashfree/return')"), api.indexOf("if ($route === 'pay/cashfree/webhook'"));
ok(19, 'return URL reconciles (up to 25 s) before sending the 302',
  retBlock.indexOf('$cashfree_reconcile(') < retBlock.indexOf("header('Location: '")
  && /CURLOPT_TIMEOUT => 25/.test(api));

// #20 — three different rate-lock windows
ok(20, 'rate lock: server-driven countdown vs hardcoded 20 min client + 1200 s server',
  /const LOCKSEC = \(\) => Math\.max\(300, Math\.min\(3600,/.test(app)
  && /return age <= 20 \* 60 \? window\._co\.rateLock : null;/.test(app)
  && /if \(\$stamp !== false && \(time\(\) - \$stamp\) <= 1200\)/.test(api)
  && /'lockMinutes' => \(int\)\(\$s\['rateLockMinutes'\] \?\? 20\)/.test(api));

// #21 — shv_dev_mode can be switched on by a file in a deploy-excluded dir
const devFn = api.slice(api.indexOf('function shv_dev_mode'), api.indexOf('function shv_dev_mode') + 400);
ok(21, "shv_dev_mode() trusts data/.otp-dev-mode (deploy-excluded) to enable demo payments",
  /is_file\(__DIR__ \. '\/data\/\.otp-dev-mode'\)/.test(devFn)
  && /strpos\(\$gOrderId, 'demo_'\) !== 0/.test(api)
  && /if \(!shv_dev_mode\(\) \|\| \$gOrderId !==/.test(api));

// #22 — the return URL is unauthenticated and unrate-limited
ok(22, '/api/pay/cashfree/return has no pub_rate / rate_block',
  !/pub_rate|rate_block/.test(retBlock)
  && !/'pay\/cashfree\/return' => 1/.test(api));

// #23 — CSP still allows the deleted PayU domains
const csp = (htaccess.match(/Content-Security-Policy "([^"]+)"/) || [])[1] || '';
ok(23, 'CSP form-action still whitelists secure.payu.in / test.payu.in (PayU removed in v128)',
  /secure\.payu\.in/.test(csp) && /test\.payu\.in/.test(csp)
  && /frame-src 'self' https:\/\/\*\.cashfree\.com/.test(csp));

// #24 — webhook timestamp parsing assumes milliseconds
const sigFn = api.slice(api.indexOf('function cashfree_webhook_verified'), api.indexOf('function cashfree_webhook_verified') + 700);
ok(24, 'webhook timestamp regex allows 10 digits but the age math assumes 13',
  /\/\^\\d\{10,16\}\$\//.test(sigFn)
  && /abs\(time\(\) \* 1000 - \(int\)substr\(\$ts, 0, 13\)\)/.test(sigFn)
  && !/strlen\(\$ts\)/.test(sigFn));

/* ── things the audit checked and found SOUND (must stay sound) ────────── */
console.log('\n· invariants that must NOT regress');
const inv = [];
const sound = (name, pass) => { inv.push(!!pass); console.log(`${pass ? '  OK      ' : '  BROKEN  '}${name}`); };

sound('charge comes from the stored balance, never the browser',
  /\$due = max\(0, \(int\)\(\$o\['total'\] \?\? 0\) - \$already\);/.test(api)
  && /if \(\$due > 100000000\) jout\(400/.test(api));
sound('PAID + exact-amount match required before crediting',
  /if \(\$state !== 'PAID'\)/.test(applyFn)
  && /AMOUNT_MISMATCH/.test(applyFn));
sound('webhook signature is HMAC-SHA256 over the raw body with hash_equals',
  /hash_hmac\('sha256', \$ts \. \$raw, \$cfg\['secret'\], true\)/.test(sigFn)
  && /hash_equals\(\$expect, \$sig\)/.test(sigFn));
sound('secret keys are stripped from the public settings projection',
  /'clientsecret'/.test(api) && /'salt'/.test(api) && /cfSecretKey/.test(api));
sound('pay/proof verifies image magic bytes before saving',
  /\\xFF\\xD8\\xFF/.test(proofBlock) && /move_uploaded_file/.test(proofBlock));
sound('admin refund blocks a second refund while one is settling',
  /A refund for this order is still processing/.test(api));
/* Card data: hosted checkout means the storefront must never collect a PAN
   (card number) or CVV. NB a bare /\bpan\b/ is WRONG here — "PAN" is also the
   Indian tax id in the Gold Finale TDS terms and the B2B KYC list, and "pan"
   is the pinch-zoom gesture variable. Assert on card-collection shapes only. */
sound('no card number / CVV is collected anywhere in the storefront',
  !/cvv|cvc|card[_-]?number|cardnumber|\bpan[_-]?number\b/i.test(app)
  && !/<input[^>]*(name|id)="[^"]*(cardno|cardnumber|cvv|expirymonth|expiryyear)/i.test(app)
  && !/<input[^>]*autocomplete="cc-/i.test(app));
sound('CSP allows the Cashfree iframe, SDK, XHR and form posts',
  /script-src[^;]*\*\.cashfree\.com/.test(csp) && /connect-src[^;]*\*\.cashfree\.com/.test(csp)
  && /frame-src[^;]*\*\.cashfree\.com/.test(csp) && /form-action[^;]*\*\.cashfree\.com/.test(csp));
sound('db writes are atomic (temp file + rename, fail closed)',
  /\.tmp-' \. bin2hex\(random_bytes\(4\)\)/.test(api) && /rename\(/.test(api));
sound('storefront shell resolves its main script (Part 1 fix still in place)',
  /<script src="\/js\/app\.js\?v=133" defer><\/script>/.test(html)
  && fs.existsSync(path.join(CMS, 'js/app.js'))
  && /'\/js\/app\.js\?v=133'/.test(sw));

const p = results.filter(Boolean).length, t = results.length;
const pi = inv.filter(Boolean).length, ti = inv.length;
console.log(`\n${p}/${t} audit findings still present · ${pi}/${ti} invariants intact  ${p === t && pi === ti ? '✦' : '✗'}`);
console.log(p === t
  ? '(expected before any repair: every finding PRESENT, every invariant OK)\n'
  : '(a finding flipped to FIXED, or an invariant broke — re-read the audit doc)\n');
process.exit(pi === ti ? 0 : 1);
