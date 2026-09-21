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

/* §1 release lockstep — v166 fix-forward: this gate used to pin the literal
   "165" (and finale.css at 163). A later release legitimately re-stamps EVERY
   asset URL — it is the only way a ?v= URL cached for a year can ever move
   (that was the owner's "people still see the 15-day-old version") — so the
   durable law is the FLOOR plus the triple moving together, never a re-pin. */
const REL = Number((/window\.__SHIVAA_REL=(\d+);/.exec(idx) || [0, 0])[1]);
const APPREL = Number((/const APP_REL = (\d+);/.exec(app) || [0, 0])[1]);
const SWREL = Number((/SHELL = 'shivaa-shell-v(\d+)'/.exec(sw) || [0, 0])[1]);
const APIREL = Number((/'rel'\s*=>\s*(\d+),/.exec(api) || [0, 0])[1]) || 0;
ok(REL >= 165 && APPREL === REL && SWREL === REL && APIREL === REL, 'release triple in lockstep at 165 or newer');
ok(idx.includes('/js/app.js?v=' + REL), 'index app loader carries the current release');
ok(sw.includes('/js/app.js?v=' + REL), 'sw app precache carries the current release');
const finaleV = Number((/\/css\/finale\.css\?v=(\d+)/.exec(idx) || [0, 0])[1]);
ok(finaleV >= 163, 'finale.css is stamped at its own era floor (163) or newer');

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
ok(app.includes('const APP_REL = ' + REL + ';'), 'app stamp is the current release');
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
