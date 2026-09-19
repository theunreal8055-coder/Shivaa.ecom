/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v154 check — FIELDLESS. The owner repeated his rule, so the last
   piece of ours between tap and Cashfree is gone too:
     "completely remove the one tap page … and redirect customers directly to
      the cashfree payment portal once they click on buy now check out or
      make it yours"
   No Express page (v153), no one-field card, no device memory key, NO input
   element that stands between a tap and the payment — while the physics stay
   honoured: Cashfree refuses an EMPTY phone at create-order, so the order
   rides the CANONICAL BOUNDARY signature, which the server accepts ONLY
   exactly-matched and ONLY while the owner's switch + Cashfree are both on;
   Cashfree collects + OTP-verifies the real contact on its own page; and the
   paid sweep promotes it back into the address row so dispatch never ships
   to a placeholder. A typed guest flow is bit-for-bit unchanged.
   Run: node tools/mega/smoke/v154-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v154-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const app = read('js/app.js'), api = read('api.php'), adm = read('js/admin.js'), idx = read('index.html'), sw = read('sw.js');

console.log('· 1 — the card and the memory are gone:');
ok('no input ever stands in the flow (exmPhone/exmGo/exmCancel/exmErr deleted)', !/exmPhone|exmGo|exmCancel|exmErr/.test(app));
ok('device-memory key fully retired (shv_exp_contact nowhere)', !/shv_exp_contact/.test(app));
ok('no totals-card helpers left behind (exTotals / exMemPhone deleted)', !/exTotals|exMemPhone/.test(app));
ok('the ONLY Shivaa UI in the lane is the exBusy status moment', /exBusy\('Opening your Cashfree payment…'\)/.test(app) && !/One line, then Cashfree/.test(app));

console.log('\n· 2 — the boundary order rides exactly one signature:');
ok('EX_BOUNDARY row is the canonical sextuple + country', app.includes("name: 'Valued Customer', phone: '9999999999', line: 'Collected on Cashfree (verified address)',") && app.includes("city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India',"));
ok('client posts it verbatim and stays Online-only', app.includes('address: { ...EX_BOUNDARY },') && app.includes("paymentMethod: 'Online',"));
ok('server EXACT-matches every field before accepting', /exSig = \(\$db\['settings'\]\['guestCheckout'\] \?\? null\) === true/.test(api)
  && api.includes("(string)($af['name'] ?? '') === 'Valued Customer'")
  && api.includes("(string)($af['line'] ?? '') === 'Collected on Cashfree (verified address)'")
  && api.includes("(string)($af['pincode'] ?? '') === '000000'"));
ok('…and only while BOTH the switch and the provider are live', api.includes("($db['settings']['payProvider'] ?? 'demo') === 'cashfree'"));
ok('anything else a guest posts still hits the v143 real-phone 400', api.includes("Please enter your real 10-digit mobile number — Cashfree needs it to start the payment."));
ok('v84 complete-address loop UNTOUCHED (name/phone/line/city/pincode)', api.includes("foreach (['name', 'phone', 'line', 'city', 'pincode'] as $ak) {"));

console.log('\n· 3 — pay/order + the sweep:');
ok('sentinel session allowed ONLY on a genuine boundary-line order', /if \(!\$u && \$phone === '9999999999'\s+&& \(string\)\(\$o\['address'\]\['line'\] \?\? ''\) !== 'Collected on Cashfree \(verified address\)'\)/.test(api));
ok('paid sweep promotes phone/name/shipping into the boundary row', api.includes('v154 — when the address row is still ONLY the canonical boundary')
  && api.includes("$o['address']['phone'] = substr($cp, -10);")
  && api.includes("if ($cdn !== '' && $cdn !== 'Valued Customer')")
  && api.includes("$o['address']['line'] = mb_substr($l1, 0, 160);"));

ok('…guarded to the sentinel row ONLY (a typed number is never overwritten)', api.includes("&& ($o['address']['name'] ?? '') === 'Valued Customer'") && api.includes("&& ($o['address']['pincode'] ?? '') === '000000'"));
ok('guest pin stays hashable (only id/createdAt/tail — phone excluded by design)', api.includes('cfCheckout.phone (the number Cashfree') && api.includes("(string)($o['tail'] ?? ''),   // set at creation"));

console.log('\n· 4 — the machine that survives from v153:');
ok('all three CTAs still ride exDirect/exCartCta', /if \(await window\.Shivaa\.exDirect\(false\)\) return;/.test(app) && (app.match(/return Shivaa\.exCartCta\(event\)/g) || []).length === 3);
ok('exDirect: gate → items → runBuy, no wait on the shopper', /window\.Shivaa\.exDirect = async fromCart => \{[\s\S]{0,400}if \(!\(await exGate\(\)\)\) return false;[\s\S]{0,200}await exRunBuy\(items\);/.test(app));
ok('cf-pending anchor set AFTER the handoff (live: never runs; declined: lands on retry)', app.includes('try { await Shivaa.payForOrder(res.id, res.pin || \'\'); } catch (e) {}') && /location\.hash = '#\/order\/' \+ encodeURIComponent\(res\.id\)/.test(app));
ok('reclaim resume still pays the SAME order (never re-places)', /exBusy\('Resuming your payment/.test(app) && /Shivaa\.payForOrder\(ord\.orderId, ord\.pin/.test(app));
ok('guest #/checkout landing still runs the flow before offering login', /exDirect\(true\)\.then\(used => \{ if \(!used\) openLogin\('checkout'\); \}\)/.test(app));
ok('#/express stays a dead word (zero literals)', !/#\/express/.test(app));

console.log('\n· 5 — stamps, switches, guards:');
const st = (f, re) => { const m = f.match(re); return m ? parseInt(m[1], 10) : 0; };
ok('index 154 · sw 154 · app 154 · api rel 154', st(idx, /__SHIVAA_REL\s*=\s*(\d+)/) === 154 && st(sw, /SHELL = '[^']*v(\d+)'/) === 154 && st(app, /APP_REL = (\d+)/) === 154 && api.includes("'rel'   => 154,"));
ok('loader stamps moved too (index <script> + sw precache)', idx.includes('/js/app.js?v=154') && sw.includes("'/js/app.js?v=154'") && !/app\.js\?v=15[0-3]/.test(idx + sw));
ok('admin: guest switch survives with v154 truth in its copy', /name="guestCheckout"/.test(adm) && adm.includes('v154: Buy Now / Make It Yours / cart Checkout place the order <b>on the spot</b>'));
ok('v152 + v153 suites carry their era-guards', (() => {
  if (!fs.existsSync(path.join(__dirname, 'v153-check.js'))) return true;   // overlay dirs lack tools/
  const g152 = fs.readFileSync(path.join(__dirname, 'v152-check.js'), 'utf8');
  const g153 = fs.readFileSync(path.join(__dirname, 'v153-check.js'), 'utf8');
  return g152.includes('pages\\.express') && g153.includes('v154 · guard');
})());

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v154 checks passed  ${n === results.length ? '✦ — NOTHING of ours between the tap and Cashfree' : '✗ FAILED'}`);
process.exit(n === results.length ? 0 : 1);
