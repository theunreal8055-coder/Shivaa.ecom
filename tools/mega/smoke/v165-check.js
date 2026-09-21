/* v165 gate — "payment failures tell the truth".
   The 6 ear studs are the only pieces priced above ≈₹50k and Create-Order's
   per-product field is the amount — so a Cashfree MID amount-cap rejection is
   indistinguishable from a transient failure unless the gateway's own words
   survive to the surface. This release: classify the amount-limit case in
   api.php, attach gatewayCode/gatewayMessage to frontend errors, and show the
   full gateway meta in the admin audit viewer. Stamps 165.
   Usage: node tools/mega/smoke/v165-check.js [CMSROOT]  (SMOKE_CMS supported) */
const fs = require('fs');
const path = require('path');
const root = process.argv[2] || process.env.SMOKE_CMS || '/home/user/Shivaa.ecom/cms';
const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const api = fs.readFileSync(path.join(root, 'api.php'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const adm = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('FAIL:', m); } };

// §1 stamps 165 lockstep (per-file rule: finale.css stays at its own era stamp)
ok(idx.includes('window.__SHIVAA_REL=165;'), 'index triple 165');
ok(app.includes('const APP_REL = 165;'), 'APP_REL 165');
ok(sw.includes("SHELL = 'shivaa-shell-v165'"), 'sw shell 165');
ok(api.includes("'rel'   => 165,"), 'api rel 165');
ok(idx.includes('/js/app.js?v=165'), 'index app loader 165');
ok(sw.includes('/js/app.js?v=165'), 'sw app precache 165');
ok(idx.includes('/css/finale.css?v=163'), 'finale.css keeps its own-era stamp 163');

// §2 api.php — the 502 now carries the WHY
ok(api.includes("'amount' => (int)$due, 'resp' => $j"), 'init-fail audit records the order amount');
ok(api.includes("strtolower(trim((string)($j['code'] ?? ($j['type'] ?? ''))))"), 'gateway code captured');
ok(api.includes("'order_amount_invalid'"), 'Cashfree amount-invalid code recognised');
ok(/\(maximum\|exceed\\w\*\|limit\)/.test(api), 'amount-limit message matcher present');
ok(api.includes("'kind' => 'amount-limit'"), 'amount-limit case machine-readable (kind)');
ok(api.includes('above our current online-payment limit'), 'amount-limit message names the limit and the way out');
ok(api.includes('the UPI QR tab (works for any amount) or on WhatsApp/COD'), 'amount-limit message points to UPI QR / WhatsApp / COD');
ok(api.includes("'Cashfree could not start this payment — choose WhatsApp/COD, the UPI QR tab, or retry in a moment.'"), 'generic 502 line preserved for unknown failures');
ok(api.includes("'gatewayMessage' => $j['message'] ?? ($res['err'] ?: null)"), 'raw gateway message still returned');

// §3 app.js — api() surfaces the gateway pair, never swallows it
ok(app.includes('__e.gatewayCode = data.gatewayCode; __e.gatewayMessage = data.gatewayMessage;'), 'thrown errors carry gatewayCode/gatewayMessage');
ok(app.includes("console.warn('[shivaa-gateway]'"), 'gateway pair logged to devtools');
ok(app.includes('const APP_REL = 165;'), 'app stamp 165');
ok(app.includes("throw new Error((po && (po.gatewayMessage || po.error)) || 'Cashfree could not start');"), 'stud Buy Now error chain untouched');

// §4 admin.js — the audit viewer can now show the full gateway meta
ok(adm.includes('gateway details'), 'audit rows expose a details toggle');
ok(adm.includes('JSON.stringify(m, null, 1)'), 'audit details render the full meta JSON');
ok(adm.includes('flex-wrap:wrap'), 'audit row wraps around the details block');

// §5 the classification logic itself — real Cashfree rejection payloads
const pat = /(maximum|exceed\w*|limit).{0,60}(amount|order_amount)|(amount|order_amount).{0,60}(maximum|exceed\w*|limit)/i;
const cls = (code, msg) => code === 'order_amount_invalid' || pat.test((msg + ' ').toLowerCase());
ok(cls('order_amount_invalid', 'Order amount is invalid'), 'amount-invalid code classifies as amount-limit');
ok(cls('bad_request', 'Order amount exceeds the maximum amount limit set for the merchant'), 'MID-cap wording classifies');
ok(cls('bad_request', 'amount limit exceeded for this MID'), 'short MID-cap wording classifies');
ok(cls('gateway_error', 'limit reached for merchant on order amount 50815'), 'amount echoed inside limit wording classifies');
ok(!cls('bad_request', 'order_id already exists'), 'duplicate order id does NOT classify as amount-limit');
ok(!cls('bad_request', 'payment_session_id is not present or is invalid'), 'stale session does NOT classify as amount-limit');
ok(!cls('', 'currency not supported'), 'unrelated failure does NOT classify');

// §6 parse gate — a clean parse makes the above meaningful (skip if parser absent)
try {
  const Engine = require('php-parser');
  const eng = new Engine({ parser: { extractDoc: false }, ast: { withPositions: false } });
  try { eng.parseCode(api, 'api.php'); ok(true, 'api.php parses (php-parser)'); }
  catch (e) { ok(false, 'api.php parses (php-parser): ' + e.message.split('\n')[0]); }
} catch (e) { console.log('  (php-parser not installed — parse gate skipped)'); }

console.log(`\nv165: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
