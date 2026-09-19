/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v155 check — SILENT LANE. Owner's instruction, third time, literal:
     "completely remove the one tap page … redirect customers DIRECTLY to the
      cashfree payment portal once they click on buy now check out or make it
      yours"
   v153 removed the PAGE, v154 removed the FIELD, v155 removes OUR RENDER and
   OUR IDLE WORK: no busy overlay (exBusy/exShell are dead), no toast, no
   handoff sheet on the express lane — and the lane no longer rides payForOrder
   (built for the order-view retry, where a session is stale). It mints ONE
   Cashfree session and opens it the instant it lands: two fetches, then the
   browser belongs to Cashfree. Everything the v154 release proved about the
   SERVER side (exact boundary signature, switch+provider arm, pay/order
   boundary-line rule, paid sweep promotion) stays byte-for-byte, because the
   api.php order lane was deliberately NOT touched beyond stamps.
   Run: node tools/mega/smoke/v155-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v155-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const app = read('js/app.js'), api = read('api.php'), adm = read('js/admin.js'), idx = read('index.html'), sw = read('sw.js');

/* the express lane as one slice, from the boundary banner to the exCartCta def */
const L0 = app.indexOf('/* v154 · THE BOUNDARY ORDER');
const L1 = app.indexOf('window.Shivaa.exCartCta');
const lane = L0 >= 0 && L1 > L0 ? app.slice(L0, L1) : '';
const R0 = app.indexOf('window.Shivaa.exResume');
const R1 = app.indexOf('/* v103', R0) > R0 ? app.indexOf('/* v103', R0) : app.length;
const resume = R0 >= 0 ? app.slice(R0, R1) : '';

console.log('· 1 — the lane renders NOTHING of ours:');
ok('busy machinery fully deleted (exBusy/exShell/exClose/shvExCard/EX.el gone)', !/exBusy|exShell|exClose|shvExCard|EX\.el/.test(app));
ok('no status line of the old era remains (as CODE — comments may cite the past)', !app.includes("'Opening your Cashfree payment…'") && !app.includes("'Resuming your payment — one moment…'"));
ok('lane+resume never ride payForOrder (silent exHandoff instead)', !/Shivaa\.payForOrder\(/.test(lane + resume));
ok('exHandoff exists once, used by run-buy AND resume', (app.match(/async function exHandoff/g) || []).length === 1
  && (app.match(/exHandoff\(/g) || []).length === 3);
ok('exHandoff itself toasts/sheets nothing', (() => { const i = app.indexOf('async function exHandoff'), j = app.indexOf('\n}', i); const body = app.slice(i, j);
  return !/toast\(|cashfreeRedirectSheet|exShell|document\./.test(body); })());

console.log('\n· 2 — two fetches, one mint, then Cashfree owns the screen:');
ok('exRunBuy = exactly ONE orders POST, its handoff is the ONLY mint in the lane', (lane.match(/api\('\/api\/orders'/g) || []).length === 1
  && lane.includes('try { await exHandoff(res.id, res.pin || \'\'); } catch (e) {')
  && (lane.match(/api\('\/api\/pay\/order'/g) || []).length === 1);
ok('exHandoff mints exactly one pay/order and opens it directly', lane.includes("const po = await api('/api/pay/order'")
  && lane.includes('await Shivaa.cashfreeCheckout(po.paymentSessionId, po.env);'));
ok('declined handoff lands on the order view (retry + QR + pin), silently', /catch \(e\) \{\s*\n\s*location\.hash = '#\/order\/' \+ encodeURIComponent\(res\.id\) \+ '\?cf=pending'/.test(lane));
ok('resume: order view FIRST, silent exHandoff on top of it', resume.includes("location.hash = '#/order/' + encodeURIComponent(ord.orderId) + '?cf=pending'")
  && resume.includes("exHandoff(ord.orderId, ord.pin || '').catch(() => {});")
  && resume.indexOf('location.hash') < resume.indexOf('exHandoff(ord'));

console.log('\n· 3 — the v154 server physics stay untouched (order lane carries them):');
ok('EX_BOUNDARY row is the canonical sextuple + country', app.includes("name: 'Valued Customer', phone: '9999999999', line: 'Collected on Cashfree (verified address)',")
  && app.includes("city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India',"));
ok('client posts it verbatim and stays Online-only', app.includes('address: { ...EX_BOUNDARY },') && app.includes("paymentMethod: 'Online',"));
ok('server EXACT-matches every field before accepting', api.includes("$exSig = ($db['settings']['guestCheckout'] ?? null) === true")
  && api.includes("(string)($af['name'] ?? '') === 'Valued Customer'")
  && api.includes("(string)($af['line'] ?? '') === 'Collected on Cashfree (verified address)'")
  && api.includes("(string)($af['pincode'] ?? '') === '000000'"));
ok('…and only while BOTH the switch and the provider are live', api.includes("($db['settings']['payProvider'] ?? 'demo') === 'cashfree'"));
ok('anything else a guest posts still hits the v143 real-phone 400', api.includes("Please enter your real 10-digit mobile number — Cashfree needs it to start the payment."));
ok('v84 complete-address loop UNTOUCHED (name/phone/line/city/pincode)', api.includes("foreach (['name', 'phone', 'line', 'city', 'pincode'] as $ak) {"));
ok('sentinel session allowed ONLY on a genuine boundary-line order', /if \(!\$u && \$phone === '9999999999'\s+&& \(string\)\(\$o\['address'\]\['line'\] \?\? ''\) !== 'Collected on Cashfree \(verified address\)'\)/.test(api));
ok('sweep promotion is guarded to the sentinel row ONLY (typed numbers never overwritten)', api.includes("&& ($o['address']['name'] ?? '') === 'Valued Customer'") && api.includes("&& ($o['address']['pincode'] ?? '') === '000000'"));
ok('guest pin stays hashable (phone excluded from the hash by design)', api.includes('cfCheckout.phone (the number Cashfree') && api.includes("(string)($o['tail'] ?? ''),   // set at creation"));
ok('paid sweep still promotes Cashfree-verified contact onto the boundary row', api.includes('v154 — when the address row is still ONLY the canonical boundary')
  && api.includes("$o['address']['phone'] = substr($cp, -10);")
  && api.includes("if ($cdn !== '' && $cdn !== 'Valued Customer')")
  && api.includes("$o['address']['line'] = mb_substr($l1, 0, 160);"));
ok('empty phone still dies in the v84 loop (signature lane sends the sentinel, not blanks)', /Enter a valid 10-digit delivery mobile/.test(api));
ok('all three CTAs still ride exDirect/exCartCta', /if \(await window\.Shivaa\.exDirect\(false\)\) return;/.test(app) && (app.match(/return Shivaa\.exCartCta\(event\)/g) || []).length === 3);
ok('#/express stays a dead word (zero literals)', !/#\/express/.test(app));

console.log('\n· 4 — the classic lanes keep the hardening this one dropped:');
{ const p0 = app.indexOf('window.Shivaa.payForOrder'), p1 = app.indexOf('window.Shivaa.placeOrder');
  const pf = p0 >= 0 && p1 > p0 ? app.slice(p0, p1) : 'x';
  ok('order-view payForOrder still double-mints (v133) and shows its sheet', (pf.match(/api\('\/api\/pay\/order'/g) || []).length === 2
    && pf.includes('cashfreeRedirectSheet(handoff)')); }
ok('order view still carries its Pay-now button', app.includes("Pay ${fmt(order.balance"));
ok('cf return/verify endpoints untouched', api.includes('/api/pay/cashfree/return') && api.includes('/api/pay/cashfree/webhook'));

console.log('\n· 5 — gates, fallbacks, and the reclaim contract:');
ok('gate = owner switch AND cashfree+OCC config', lane === '' ? false : (app.includes('state.settings.guestCheckout === true') && app.includes("c.cfg.mode === 'cashfree' && c.cfg.guestCheckout === true")));
ok('exDirect consumes the tap on error (no silent dump to classic checkout)', app.includes('toast(e.message, \'err\');   // the order itself failed'));
ok('cart CTA declines → #/checkout, landing declines → openLogin', app.includes("exDirect(true).then(used => { if (!used) location.hash = '#/checkout'; });")
  && app.includes("exDirect(true).then(used => { if (!used) openLogin('checkout'); });"));
ok('member + in-flight guards intact', app.includes('if (EX.busy || state.user) return false;'));
ok('the busy claim is SYNCHRONOUS (v155 double-tap race fix): claim before any await', (() => {
  const i = app.indexOf('window.Shivaa.exDirect = async'); const j = app.indexOf('};', i);
  const body = app.slice(i, j); const claim = body.indexOf('EX.busy = true;');
  return claim > 0 && claim < body.indexOf('exGate()'); })());
ok('express stash still stamped (reclaim proof, not a memory of the shopper)', app.includes("store.set('shv_express', { orderId, pin, at: Date.now() })")
  && app.includes("store.set('shv_ex_item', { item: window.Shivaa._expressItem, at: Date.now() })"));

console.log('\n· 6 — stamp lockstep (155) incl. the loader stamps v152 once missed:');
/* v156 era-guard — the stamps MOVED at v156 (Shivaa rates + 24K premium).
   Exact-155 pins still own the v155 tree; on a v156+ tree they become the
   house's self-consistency check (one N, everywhere, lockstep) while §1–§5
   keep guarding the silent-lane physics forever. SMOKE_CMS overlays of the
   v155 zip still get the full exact run. */
{
  const rel = (() => { const m = app.match(/const APP_REL = (\d+);/); return m ? +m[1] : 0; })();
  if (rel > 155) {
    ok(`era-superseded (APP_REL ${rel}): stamps self-consistent across index/sw/api instead of exact-155`,
      idx.includes(`window.__SHIVAA_REL=${rel};`) && idx.includes(`/js/app.js?v=${rel}"`)
      && sw.includes(`'shivaa-shell-v${rel}'`) && sw.includes(`'/js/app.js?v=${rel}'`)
      && new RegExp(`'rel'\\s+=> ${rel},`).test(api));
  } else {
    ok('APP_REL 155', /const APP_REL = 155;/.test(app));
    ok('index __SHIVAA_REL=155 + loader app.js?v=155', idx.includes('window.__SHIVAA_REL=155;') && idx.includes('/js/app.js?v=155"'));
    ok('sw SHELL v155 + PRECACHE /js/app.js?v=155', sw.includes("'shivaa-shell-v155'") && sw.includes("'/js/app.js?v=155'"));
    ok("api rel 155", /'rel'\s+=> 155,/.test(api));
  }
  ok('no stale 154 left in the boot files', !idx.includes('154') && !sw.includes('154'));
  ok('admin copy speaks v155', adm.includes('v155: Buy Now') && adm.includes('NOTHING of ours renders between the tap'));
}

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} v154-v155 checks passed  ${pass === results.length ? '✦ — SILENT: tap, two fetches, Cashfree' : '✗ FAILED'}`);
process.exit(pass === results.length ? 0 : 1);
