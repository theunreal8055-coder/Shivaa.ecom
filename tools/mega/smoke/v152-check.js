/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v152 check — THE DELETION. Not "disabled": REMOVED.
     1  ZERO residue: the vendor's name, its keys, its nonce, its storage
        keys, its DOM hooks — none of them appear ANYWHERE in index.html,
        sw.js, js/app.js, js/admin.js or api.php, code AND comments alike
        (owner: "everywhere from the file").
     2  The Express contract that makes tap→Cashfree legal is INTACT:
        server gate (email-or-mobile) untouched, Cashfree phone requirement
        untouched, guest self-gates untouched; the device memory key
        shv_exp_contact + the zero-click auto-buy block are present.
     3  All three CTAs are plain ternaries (no data-attribute side doors).
     4  Every retired v147–v151 suite carries the SKIP guard.
     5  Stamps: 152 everywhere; api/version route answers rel 152 and its
        response object no longer has a 'tc' key at all.
   Run: node tools/mega/smoke/v152-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v152-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = f => fs.readFileSync(path.join(CMS, f), 'utf8');

const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const RE = /truecaller|tcAppKey|tcCbUrl|tcNonce|tcInstant|tcDeep|data-tcinstant|shv_tc_|tcVerify|tc_entry|TC_VERIFY|TC_STATUS|tc_norm|tc_status_note|tcLive|tcCheck|tcMount|tcBtn|tcRemember|tc-prefill|flow_invoked/i;
const files = ['index.html', 'sw.js', 'js/app.js', 'js/admin.js', 'api.php'];
const srcs = {};
for (const f of files) srcs[f] = read(f);

console.log('· 1 — zero residue (code AND comments):');
for (const f of files) {
  if (f === 'api.php') {
    // EXACTLY one legal survivor: the legacy-wipe list that DELETES the stale
    // partner key from the DB on the next admin save. Nothing else may match.
    const m = (srcs[f].match(new RegExp(RE.source, 'gi')) || []).map(x => x.toLowerCase());
    ok('api.php: no trace — except the wipe-list entry that buries the stale key',
      [...new Set(m)].join(',') === 'tcappkey' && /foreach \(\['tcAppKey', 'payuKey'/.test(srcs[f]) && !/truecaller/i.test(srcs[f]), m.join(','));
    continue;
  }
  const m = srcs[f].match(new RegExp(RE.source, 'gi'));
  ok(`${f}: no trace of the vendor`, !m, m ? [...new Set(m.map(x => x.toLowerCase()))].slice(0, 6).join(',') : '');
}

console.log('\n· 2 — the DIRECT-to-Cashfree contract stays legal:');
const app = srcs['js/app.js'];
ok('guest express boundary address unchanged (Cashfree Create Order needs the phone)', app.includes("line: 'Collected on Cashfree (verified address)'") && app.includes("pincode: '000000'"));
ok('device memory key shv_exp_contact written on success AND read on mount', app.includes("store.set('shv_exp_contact'") && app.includes("store.get('shv_exp_contact'"));
ok('zero-click auto-buy block present (remembered → doBuy by itself)', /expRemember[\s\S]{0,700}setTimeout\(\(\) => \{[\s\S]{0,120}doBuy\(\)/.test(app));
ok('guest gate unchanged: express refuses itself unless cashfree + guestCheckout are live', app.includes("if (cfg.mode !== 'cashfree' || cfg.guestCheckout !== true) {"));
ok('api.php email-or-mobile gate UNTOUCHED (v84 invariant — no contactless orders)', srcs['api.php'].includes('valid email or 10-digit mobile') && srcs['api.php'].includes('real 10-digit mobile number'));
ok('server accepts the legacy browser surplus silently (no tcNonce handling left to trip on)', !/tcNonce/.test(srcs['api.php']));

console.log('\n· 3 — the CTAs:');
ok('pdBuy() is paramless and plain: guest → #/express straight, member → classic', app.includes('window.Shivaa.pdBuy = async id => {') && app.includes("location.hash = '#/express';") && app.includes("location.hash = '#/checkout';") && !/data-tcinstant|tcInstant/.test(app));
ok('cart CTAs keep the classic guest/member ternary (#/express || #/checkout)', (app.match(/expressCheckoutOn\(\) && !state\.user \? '#\/express' : '#\/checkout'/g) || []).length >= 2);
ok('no data-tcinstant attribute anywhere (HTML or JS-rendered)', !/data-tcinstant/.test(app) && !/data-tcinstant/.test(srcs['index.html']));
ok('express copy sells the ONE field honestly (Cashfree OTP story, remembered-on-device note)', /Your 10-digit mobile number — Cashfree uses it to verify you/.test(app) && /Remembered on this phone/.test(app));

console.log('\n· 4 — admin + retired suites:');
const adm = srcs['js/admin.js'];
ok('admin: partner-key fieldset, doctor action and save-prop all deleted', !/tcAppKey/.test(adm) && !/phone verify/i.test(adm));
ok('admin: the guest switch SURVIVES (it still gates Express → Cashfree!)', /name="guestCheckout"/.test(adm) && adm.includes("guestCheckout: !!document.querySelector('[name=\"guestCheckout\"]')?.checked };"));
ok('guard present in all 11 retired suites', (() => {
  const list = ['v147-check', 'v147-php-run', 'v147-tc-autobuy', 'v148-check', 'v148-tc-patience', 'v149-check', 'v149-tc-instant', 'v150-check', 'v150-php-run', 'v151-check', 'v151-php-run'];
  if (!fs.existsSync(path.join(__dirname, 'v151-check.js'))) return true; // overlay dir has no tools/
  return list.every(x => fs.readFileSync(path.join(__dirname, x + '.js'), 'utf8').includes('retired-feature guard'));
})());

console.log('\n· 5 — stamps & version:');
const st = (f, re) => { const m = srcs[f].match(re); return m ? parseInt(m[1], 10) : 0; };
ok('index.html + sw.js + app.js stamped 152', st('index.html', /__SHIVAA_REL\s*=\s*(\d+)/) === 152 && st('sw.js', /SHELL = '[^']*v(\d+)'/) === 152 && st('js/app.js', /APP_REL = (\d+)/) === 152);
ok('app.js admin loader now FOLLOWS APP_REL (v141 bug-class closed at the root)', app.includes("injectScript('/js/admin.js?v=' + APP_REL)"));
ok('api.php version route answers rel 152 with NO tc key', srcs['api.php'].includes("'rel'   => 152,") && !/'tc'/.test(srcs['api.php']));

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v152 checks passed  ${n === results.length ? '✦ — GONE is GONE: code, comments, routes, fields, keys' : '✗ FAILED'}`);
process.exit(n === results.length ? 0 : 1);
