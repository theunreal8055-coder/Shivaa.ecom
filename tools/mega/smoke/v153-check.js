/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v153 check — THE PAGE ITSELF IS GONE.
   Owner 19 Sep: "completely remove the one tap page of Shiva that you are
   made and redirect customers directly to the cashfree payment portal once
   they click on buy now check out or make it yours".
   Proves statically: no express route/render anywhere; the in-place engine
   (exDirect/exCartCta/exResume + one-field card + memory buy) is wired into
   ALL THREE CTAs; the reclaimed-tab resume RESUMES THE PAYMENT instead of
   re-placing orders; every surviving legal floor (v84 gate, Cashfree phone,
   OCC switch semantics) stays pinned; stamps 153 lockstep.
   Run: node tools/mega/smoke/v153-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v153-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const app = read('js/app.js'), api = read('api.php'), adm = read('js/admin.js'), idx = read('index.html'), sw = read('sw.js');

console.log('· 1 — the deletion of the PAGE:');
ok('no pages.express anywhere — the route was never registered again', !/pages\.express\s*=/.test(app));
ok('zero "#/express" literals in app.js (no href, no hash assignment, no redirect TARGET)', !/#\/express/.test(app));
ok('old express URLs bounce (guest \u2192 cart, member \u2192 checkout), never dead-end', app.includes("if (page === 'express') {") && app.includes("state.user ? '#/checkout' : '#/cart'"));
ok('zero vendor tokens still (v152 invariant holds)', !/truecaller|tcNonce|tcAppKey|shv_tc_|data-tcinstant/i.test(app + adm + idx + sw + api.replace(/'tcAppKey', 'payuKey'/g, '')));

console.log('\n· 2 — the in-place engine:');
for (const [n, re] of [['exDirect entry point', /window\.Shivaa\.exDirect = async fromCart/],
                       ['gate re-checks pay config async (cashfree + switch)', /c\.cfg\.mode === 'cashfree' && c\.cfg\.guestCheckout === true/],
                       ['device memory read (180d)', /shv_exp_contact[\s\S]{0,200}180 \* 864e5/],
                       ['remembered → SILENT buy, no prompt at all', /remembered from this device — opening your payment/],
                       ['first buy → ONE-field card over the SAME page', /id="exmPhone"/.test(app) && /One line, then Cashfree/.test(app)],
                       ['card validates locally before touching the server', /Please enter a valid 10-digit mobile number — Cashfree needs it/.test(app)],
                       ['boundary address unchanged (server v84 + Cashfree accept it)', app.includes("line: 'Collected on Cashfree (verified address)'") && app.includes("pincode: '000000'") && app.includes("paymentMethod: 'Online',")],
                       ['order success re-members the device + clears the stash', /store\.set\('shv_exp_contact', \{ phone, at: Date\.now\(\) \}\)/.test(app) && /store\.set\('shv_ex_item', null\)/.test(app)],
                       ['payForOrder then order-page pending view', /await Shivaa\.payForOrder\(res\.id, res\.pin \|\| ''\)/.test(app)]]) {
  ok(typeof n === 'string' ? n : n, typeof re === 'boolean' ? re : re.test(app));
}

console.log('\n· 3 — all three CTAs, wired to the SAME engine:');
ok('pdBuy (Buy Now / Make It Yours): stash → exDirect, classic fallback only when the flow declines', /if \(await window\.Shivaa\.exDirect\(false\)\) return;/.test(app) && app.includes("window.Shivaa._expressItem = null;"));
const ctaCount = (app.match(/return Shivaa\.exCartCta\(event\)/g) || []).length;
ok(`cart + sidebar CTAs ride exCartCta (found ${ctaCount}, expect 3)`, ctaCount === 3);
ok('guest landing on the classic #/checkout URL gets the flow, else the login offer (never the dead page)', /exDirect\(true\)\.then\(used => \{ if \(!used\) openLogin\('checkout'\); \}\)/.test(app));

console.log('\n· 4 — reclaim-safe resume pays INSTEAD of re-placing:');
ok('expressRemember stamps a time on the order entry', /store\.set\('shv_express', \{ orderId, pin, at: Date\.now\(\) \}\)/.test(app));
ok('fresh order (<10 min) → RESUME pays the EXISTING id, zero re-POST', /exBusy\('Resuming your payment/.test(app) && /Shivaa\.payForOrder\(ord\.orderId, ord\.pin/.test(app));
ok('resume runs exactly once per boot, after first paint', /initMiniCart\(\);   \/\/ v91 slide-in bag\n  route\(\);\n  try \{ window\.Shivaa\.exResume\(\)/.test(app));
ok('stale stash is cleared and ignored (no phantom card)', /if \(!fresh\) \{ if \(sv\) \{ try \{ store\.set\('shv_ex_item', null\)/.test(app));

console.log('\n· 5 — the surviving floors (api.php untouched by design):');
ok('v84 complete-address gate intact', api.includes('Complete delivery address required (name, mobile, address, city, pincode).'));
ok('v143 Cashfree real-phone rule intact', api.includes('real 10-digit mobile number — Cashfree needs it'));
ok('OCC return still sweeps onto #/order (no express hop)', api.includes('/#/order/') && !api.includes('#/express') && !api.includes('#\\/express'));

console.log('\n· 6 — stamps + switches:');
const st = (f, re) => { const m = f.match(re); return m ? parseInt(m[1], 10) : 0; };
ok('index 153 · sw 153 · app 153 · api rel 153', st(idx, /__SHIVAA_REL\s*=\s*(\d+)/) === 153 && st(sw, /SHELL = '[^']*v(\d+)'/) === 153 && st(app, /APP_REL = (\d+)/) === 153 && api.includes("'rel'   => 153,"));
ok('the LOADER stamps moved too (index <script> + sw precache list) — the v152 near-miss, pinned forever', idx.includes('/js/app.js?v=153') && sw.includes("'/js/app.js?v=153'") && !/app\.js\?v=15[0-2]/.test(idx + sw));
ok('admin loader still dynamic (v152 root-fix holds)', app.includes("'/js/admin.js?v=' + APP_REL"));
ok('the guest switch SURVIVES and still says guestCheckout', /name="guestCheckout"/.test(adm) && adm.includes('v153: Buy Now / Make It Yours / cart Checkout place the order <b>on the spot</b>'));

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v153 checks passed  ${n === results.length ? '✦ — no page, no wait: tap → Cashfree' : '✗ FAILED'}`);
process.exit(n === results.length ? 0 : 1);
