/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA payment audit — source inventory for docs/PAYMENT-EXPERIENCE-NEXT.md

   The labels distinguish conditions that remain PRESENT from findings now
   FIXED in source. This is an inventory/regression aid, not proof of a live
   merchant integration or deployment; the new Cashfree endpoint also has an
   executed isolated PHP suite in v184-php-run.js.

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

// #10 — the hazard is a gateway call made while holding a stale snapshot that
// is later written back whole. Being on the $slow no-lock list is fine AS LONG
// AS the reconcile re-reads the database under the lock after the call, so the
// assertion tests that order of operations rather than the route list.
const recBlock = api.slice(api.indexOf('$cashfree_reconcile = function'), api.indexOf("if ($route === 'pay/cashfree/return')"));
const iFetch = recBlock.indexOf('cashfree_fetch_order(');
const iLock = recBlock.indexOf('shv_acquire_lock(');
const iLoad = recBlock.indexOf('db_load(');
const iApply = recBlock.indexOf('cashfree_apply(');
ok(10, 'reconcile applies a stale snapshot: gateway call not followed by lock + re-read',
  !(iFetch > -1 && iLock > iFetch && iLoad > iLock && iApply > iLoad && /use \(&\$db\)/.test(recBlock)),
  `expected fetch(${iFetch}) < lock(${iLock}) < db_load(${iLoad}) < apply(${iApply}) and use (&$db)`);

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

// #14 — a read-only settlement report must compare Cashfree's nested recon
// events with the local payment ledger. It is not a scheduled/nightly job, and
// the owner still has to run every cursor page.
const settlementFnStart = api.indexOf('function cashfree_settlement_recon_payload');
const settlementFnEnd = api.indexOf('/* v139 ·', settlementFnStart);
const settlementFns = settlementFnStart >= 0 && settlementFnEnd > settlementFnStart
  ? api.slice(settlementFnStart, settlementFnEnd) : '';
const settlementRouteStart = api.indexOf("if ($route === 'admin/payments/settlements'");
const settlementRouteEnd = api.indexOf("if ($route === 'admin/audit'", settlementRouteStart);
const settlementRoute = settlementRouteStart >= 0 && settlementRouteEnd > settlementRouteStart
  ? api.slice(settlementRouteStart, settlementRouteEnd) : '';
const settlementReportSafe = settlementFns.includes("'limit' => 10")
  && settlementFns.includes('function cashfree_settlement_recon_response(array $json): ?array')
  && settlementFns.includes("$payment['cf_payment_id']")
  && settlementFns.includes("$order['order_id']")
  && settlementFns.includes("$payment['payment_amount']")
  && settlementFns.includes("$event['event_settlement_amount']")
  && settlementRoute.includes('need_admin($db)')
  && settlementRoute.includes("$cfg['apiVersion'] = '2026-01-01'")
  && settlementRoute.includes("'/pg/settlement/recon'")
  && settlementRoute.includes('cashfree_settlement_recon_payload($from, $to, $cursor)')
  && settlementRoute.includes("cashfree_settlement_recon_compare($db, $page['data'])")
  && settlementRoute.includes("'hasMore' => $next !== ''")
  && !/db_save\(|audit_log\(/.test(settlementRoute);
ok(14, 'no read-only, admin-gated Cashfree settlement comparison is available',
  !settlementReportSafe,
  'expected v2026-01-01 POST /pg/settlement/recon, nested cursor pagination, local payment-ID/gross-amount comparison, and no local writes');

// #15 — the clamp in order_add_payment stays (it protects every other caller);
// the finding was that a SECOND Cashfree payment reached it and was silently
// zeroed. So the assertion is about the Cashfree path: a settled order must
// record the extra payment BEFORE order_add_payment can clamp it away.
const oap = api.slice(api.indexOf('function order_add_payment'), api.indexOf('function order_add_payment') + 1400);
const iOver = applyFn.indexOf("$o['overpayments'][]");
const iAdd = applyFn.indexOf('order_add_payment(');
ok(15, 'a second Cashfree payment is swallowed instead of recorded as an overpayment',
  !(iOver > -1 && iAdd > -1 && iOver < iAdd && /payment\.overpayment/.test(applyFn)),
  `expected an overpayments[] write at ${iOver} before order_add_payment at ${iAdd} + a payment.overpayment audit line`);

// #16 — points are granted at order creation and never clawed back
const loyaltyWrites = lines(api).filter(l => /loyaltyPoints'\]\s*=/.test(l));
/* #16 — points must be EARNED when the order is paid, not when the checkout
   form is submitted, and taken back on a full refund.
   Bug-present = the order-creation write credits `$earned` in the same
   statement that deducts `$pointsUsed` (so an abandoned cart permanently
   grants spendable value), or the dedicated grant/revoke helpers are absent.
   Asserts behaviour rather than a count of loyaltyPoints assignments: v137
   legitimately adds three more (grant, revoke, restore-on-cancel). */
const createWrite = lines(api).filter(l => /loyaltyPoints'\]\s*=/.test(l) && /pointsUsed/.test(l));
ok(16, 'royalty points granted at order creation, never clawed back on refund',
  createWrite.some(l => /\+\s*\$earned/.test(l))
  || !/function order_grant_points\(/.test(api)
  || !/function order_revoke_points\(/.test(api),
  `expected the creation write to deduct pointsUsed only (no "+ $earned") and both `
  + `order_grant_points() and order_revoke_points() to exist `
  + `(creation writes found: ${createWrite.length})`);

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

// #19 — the return redirect blocks on the gateway call before the 302.
// NB indexOf returns -1 when absent and -1 < N is TRUE, so both indices must be
// checked explicitly or a fixed route still reads as broken.
const retBlock = api.slice(api.indexOf("if ($route === 'pay/cashfree/return')"), api.indexOf("if ($route === 'pay/cashfree/webhook'"));
const iRec = retBlock.indexOf('$cashfree_reconcile(');
const iLoc = retBlock.indexOf("header('Location: '");
ok(19, 'return URL reconciles (up to 25 s) before sending the 302',
  iRec > -1 && iLoc > -1 && iRec < iLoc && /CURLOPT_TIMEOUT => 25/.test(api),
  `expected the route to redirect with no reconcile call (reconcile at ${iRec}, Location at ${iLoc})`);

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
const sigStart = api.indexOf('function cashfree_webhook_verified');
// slice to the closing brace, not a fixed window: the function grew past 700
// bytes in v135 and a fixed slice silently dropped the hash_equals line.
const sigFn = api.slice(sigStart, api.indexOf('\n}\n', sigStart) + 3);
ok(24, 'webhook timestamp regex allows 10 digits but the age math assumes 13',
  /\/\^\\d\{10,16\}\$\//.test(sigFn)
  && /abs\(time\(\) \* 1000 - \(int\)substr\(\$ts, 0, 13\)\)/.test(sigFn)
  && !/strlen\(\$ts\)/.test(sigFn));

/* #25 — a GST Tax Invoice must be issued when the money is received, not when
   the checkout form is submitted. Bug-present = the order-creation block mints
   `invoiceNo` itself. Fixed = creation leaves it out and a dedicated
   order_issue_invoice() mints it from the Paid transition only.
   Owner decision 18 Sep 2026: COD included (invoice after cash is collected). */
const orderCreate = api.slice(api.indexOf("$order = [\n      'id' => biz_id('SHV')"),
                              api.indexOf("if ($route === 'orders' && $method === 'GET')"));
ok(25, 'a Tax Invoice is issued at order placement, before any payment is received',
  /'invoiceNo' =>/.test(orderCreate) || !/function order_issue_invoice\(/.test(api),
  `expected order creation to omit invoiceNo (found: ${/'invoiceNo' =>/.test(orderCreate)}) `
  + `and order_issue_invoice() to exist (found: ${/function order_issue_invoice\(/.test(api)})`);

/* ── Pass 3 findings (found while verifying the #25/#16 repairs) ──────── */

/* #26 — stock is reserved at order placement and never given back. Bug-present
   = the creation decrement exists AND nothing in api.php ever adds stock back.
   Note the impact is inventory drift, not oversell: stock is advisory here
   (no route rejects an order on it), but the owner reads the stock<=3 report. */
const stockDecrement = /\$pr2\['stock'\] = max\(0, \(int\)\(\$pr2\['stock'\] \?\? 0\) - \$it\['qty'\]\)/.test(api);
const stockIncrement =
     /\$pr2\['stock'\] = max\(0, \(int\)\(\$pr2\['stock'\] \?\? 0\) \+/.test(api)
  || /\['stock'\]\s*\+=/.test(api)
  || /function order_restore_stock\(/.test(api);
ok(26, 'cancelling an order returns the points but never the stock it reserved',
  stockDecrement && !stockIncrement,
  `expected the creation decrement (found: ${stockDecrement}) `
  + `and no stock restore anywhere (found restore: ${stockIncrement})`);

/* #27 — redeemed points are released ONLY by a manual admin cancel. Bug-present
   = the redemption debit happens at creation, the sole release is gated on
   status === 'Cancelled', and nothing can reach Cancelled automatically
   (no customer cancel route, no cron/auto-expiry).
   Unmasked by v137, not created by it: the pre-v137 line ended `+ $earned`,
   hiding the debit behind the unearned credit that #16 removed. */
const pointsDebit = /\$uu\['loyaltyPoints'\] = max\(0, \(int\)\(\$uu\['loyaltyPoints'\] \?\? 0\) - \$pointsUsed\);/.test(api);
const restoreGatedOnCancel = /function order_restore_points\([\s\S]{0,160}!== 'Cancelled'\) return;/.test(api);
const anyCancelRoute = /route === 'orders\/\(\[\\w-\]\+\)\/cancel'/.test(api) || /'orders\/cancel'/.test(api);
const anyAutoExpiry = /route === 'cron'/.test(api) || /function order_expire/.test(api);
ok(27, 'redeemed points on an abandoned order are released only by a manual admin cancel',
  pointsDebit && restoreGatedOnCancel && !anyCancelRoute && !anyAutoExpiry,
  `expected the creation debit (found: ${pointsDebit}), restore gated on Cancelled `
  + `(found: ${restoreGatedOnCancel}), no customer cancel route (found: ${anyCancelRoute}) `
  + `and no auto-expiry (found: ${anyAutoExpiry})`);

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
/* Version-agnostic on purpose: this asserts the Part 1 fix (the shell's main
   script tag resolves to a file that actually exists in cms/js, and the worker
   precaches the same string), not any particular release number. */
const appTag = (html.match(/<script src="(\/js\/app[^"]*)" defer>/) || [])[1] || '';
const appFile = appTag.split('?')[0];
const swHasApp = appTag !== '' && sw.includes("'" + appTag + "'");
sound('storefront shell resolves its main script (Part 1 fix still in place)',
  appFile !== '' && fs.existsSync(path.join(CMS, appFile.replace(/^\//, ''))) && swHasApp);

const p = results.filter(Boolean).length, t = results.length;
const pi = inv.filter(Boolean).length, ti = inv.length;
console.log(`\n${p}/${t} audit findings still PRESENT · ${t - p} marked FIXED · ${pi}/${ti} invariants intact  ${pi === ti ? '✦' : '✗'}`);
console.log(pi === ti
  ? '(source inventory only; verify each PRESENT/FIXED label against the current notes and live systems)\n'
  : '(a protected payment invariant broke — stop and re-read the audit notes)\n');
process.exit(pi === ti ? 0 : 1);
