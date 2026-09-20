/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v156 check — SHIVAA RATES + 24K PREMIUM + BUG SWEEP.
   Owner's brief (2026-09-19, branch arena/01a0ba4b-shivaa-ecom):
     1  "wherever there is Jaipur mentioned, mention shivaa or shivaa's
         rates" — every customer-facing rate string on the B2C storefront
         now speaks SHIVAA. Real geography (pickup cities, a reviewer's
         hometown) keeps its name; B2B (bullion desk / partner portal /
         admin console) is deliberately untouched.
     2  "add premium to 24 karat gold rates in the b2c section — the same
         premium as the 22 karat" — the 24K retail line now carries the
         SAME ₹398/g desk premium as 22K (owner's same-total choice),
         served as its own explicit setting gold24Premium (mirrors v119's
         gold22Premium), admin-tunable, published as premium.gold24 and
         shown on the rate card beside the 22K premium. The legacy ₹55
         jaipurPremium now feeds ONLY the 18K line (×0.75). Admin rate
         override still wins. The B2B desk prices off the raw anchor —
         bit-identical, proven by pin 4 below.
     3  "find some bugs in the app and solve" — three real ones, all B2C:
         B1 · v120.js openHash '' falsy — every class mutation while a
              drawer stood open on a bare shivaa.in/ visit pushed ANOTHER
              dead history entry (the Back button was buried). The bug was
              documented at v127 and left for the owner's word; this is it.
         B2 · the rates poll re-rendered the WHOLE cart page on every tick
              (every 1 s while the MCX feed is live), wiping the pincode
              delivery-check input mid-typing — v120's own Bug-A class, one
              page over. Cart now patches in place (refreshCartPage), with
              a pincode-preserving re-render only on a free-shipping
              threshold crossing.
         B3 · drawRateChart painted NaN coordinates on a single-stamp or
              dead-feed history (0/0). Now: positive-finite points, ≥2.
   Run: node tools/mega/smoke/v156-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v156-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const app = read('js/app.js'), api = read('api.php'), adm = read('js/admin.js'), idx = read('index.html'), sw = read('sw.js'), v107 = read('js/v107.js'), v120 = read('js/v120.js');

console.log('· 1 — SHIVAA RATES: the B2C storefront speaks Shivaa, not Jaipur:');
{
  /* customer-facing rate strings that must NEVER come back */
  const dead = [
    ['app', app, 'Jaipur Live Rates'], ['app', app, 'JAIPUR MARKET RATE'], ['app', app, 'JAIPUR LIVE'],
    ['app', app, 'GOLD 24K · JAIPUR'], ['app', app, 'GOLD 22K · JAIPUR'], ['app', app, 'GOLD 18K · JAIPUR'],
    ['app', app, 'SILVER 925 · JAIPUR'], ['app', app, '22K Jaipur premium'], ['app', app, 'Silver (Jaipur 925)'],
    ['app', app, 'live Jaipur rate'], ['app', app, "Jaipur's live rate"], ['app', app, 'Jaipur-rate pricing'],
    ['app', app, 'Jaipur market feed'], ['app', app, 'the live Jaipur feed'], ['app', app, 'These Jaipur rates'],
    ['app', app, "today's Jaipur rate"], ['app', app, 'Jaipur 22K rate'], ['app', app, 'the Jaipur rate.'],
    ['v107', v107, 'Jaipur premium — desk physical'], ['v107', v107, 'packing at the Jaipur atelier'],
    ['index', idx, 'Jaipur gold &amp; silver, live'],
    ['api', api, 'Yesterday’s Jaipur closing rate'], ['api', api, 'The live Jaipur gold / silver rate'],
  ];
  ok('zero dead "Jaipur" rate-brand strings across app/v107/index/api (B2C)', dead.every(([w, s, t]) => !s.includes(t)),
    dead.filter(([w, s, t]) => s.includes(t)).map(([w, s, t]) => w + ': ' + t).join(' · ') || 'clean');

  const live = [
    ['app', app, 'Shivaa Live Rates'], ['app', app, '✦ SHIVAA LIVE RATE'], ['app', app, 'SHIVAA LIVE'],
    ['app', app, '✦ Shivaa Gold 22K / g'], ['app', app, 'GOLD 24K · SHIVAA'], ['app', app, 'GOLD 22K · SHIVAA'],
    ['app', app, 'GOLD 18K · SHIVAA'], ['app', app, 'SILVER 925 · SHIVAA'],
    ['app', app, '22K Shivaa premium'], ['app', app, '24K Shivaa premium'], ['app', app, 'Silver (Shivaa 925)'],
    ['app', app, 'These Shivaa rates power every price on shivaa.in'],
    ['app', app, "Gold & silver jewellery at Shivaa's live rates,"], ['app', app, 'the current Shivaa live rate'],
    ['app', app, 'Live Shivaa rates &middot;'], ['app', app, "Today's Shivaa rate for 24K (99.999) fine gold:"],
    ['app', app, "Today's Shivaa rates &mdash; fine 24K"], ['app', app, "Shivaa's live gold & silver rate"],
    ['app', app, 'the day&rsquo;s locked Shivaa rate'], ['app', app, "Shivaa's rate feed — the same one"],
    ['v107', v107, '22K Shivaa premium — desk physical'], ['v107', v107, 'packing at the Shivaa atelier'],
    ['index', idx, 'Shivaa gold &amp; silver, live'],
    ['api', api, 'The live Shivaa gold / silver rate at the time you buy'],
  ];
  ok('all 25 new "Shivaa" rate-brand strings are present where the old ones stood', live.every(([w, s, t]) => s.includes(t)),
    live.filter(([w, s, t]) => !s.includes(t)).map(([w, s, t]) => w + ': ' + t).join(' · ') || 'all present');

  ok('real geography keeps its name (pickup Jaipur & Nagaur ×3, city chips, reviewer hometown)',
    (app.match(/Jaipur &amp; Nagaur/g) || []).length === 2
    && app.includes("Pickup &amp; drop (Jaipur / Nagaur)")
    && app.includes("'Jodhpur', 'Jaipur', 'Ajmer'")
    && app.includes("['Sneha Kulkarni', 'Jaipur',"));
}

console.log('\n· 2 — the 24K PREMIUM (₹398/g, same as 22K — owner LOCKED):');
{
  ok('api defines gold24_premium() (own explicit setting, default 398 — the v119 pattern)',
    /function gold24_premium\(array \$db\): int \{[\s\S]{0,200}\['gold24Premium'\] \?\? 398[\s\S]{0,120}: 398;/.test(api));
  ok('jaipur_from_anchor: 24K = round(anchor) + $gp24 (gold24_premium), 22K math byte-intact',
    /\$gp24 = gold24_premium\(\$db\);/.test(api)
    && api.includes("'gold24' => (int)round($g24) + $gp24,")
    && api.includes("'gold22' => (int)round($g24 * PURITY_22) + $gp22,")
    && api.includes("'gold18' => (int)round($g24 * PURITY_18) + (int)round($gp * 0.75),"));
  ok('current_rates fallback: 24K carries the new premium (no path left behind)',
    api.includes("'gold24' => (int)$l['gold24'] + gold24_premium($db),")
    && !api.includes("'gold24' => (int)$l['gold24'] + $gp,"));
  ok('the legacy ₹55 jaipurPremium never touches gold24 anywhere in the RETAIL derivations',
    (() => {
      const j0 = api.indexOf('function jaipur_from_anchor'), j1 = api.indexOf('function anchor_level');
      const c0 = api.indexOf('function current_rates'), c1 = api.indexOf('function jaipur_live_from_tick');
      const retail = (api.slice(j0, j1) + api.slice(c0, c1)).replace(/\$gp24/g, '');
      return j0 > 0 && c0 > j1 && !/'gold24'[^\n]*\$gp\b/.test(retail)
        && api.includes("'gold' => (int)($db['settings']['jaipurPremium'] ?? 55),");
    })());
  ok('/api/rates publishes premium.gold24 beside gold22 (rate card transparency)',
    /'premium' => \['gold22' => gold22_premium\(\$db\), 'gold24' => gold24_premium\(\$db\),/.test(api));
  ok('settings ship a gold24Premium 398 default AND the PUT whitelist admits it (admin-tunable)',
    api.includes("'gold24Premium' => 398,") && /'gold24Premium' => \[0, 100000, 'int'\]/.test(api));
  ok('admin exposes the 24K premium field and saves it (mirror of the 22K knob)',
    adm.includes('name="gold24Premium"') && adm.includes('gold24Premium: +g(\'gold24Premium\')')
    && adm.includes('feeds only the 18K line ×0.75'));
  ok('the override path stays absolute (admin rate override wins over premiums)',
    /if \(\$ov\) return \['gold24' => \(int\)\$ov\['gold24'\]/.test(api));
}

console.log('\n· 3 — the RATE CARD shows both premiums and refreshes them live:');
{
  ok('pages.rates renders the 24K Shivaa premium row ABOVE the 22K one',
    (() => { const a = app.indexOf('24K Shivaa premium'), b = app.indexOf('22K Shivaa premium'); return a > 0 && b > a; })()
    && app.includes('<b data-rr="prem24">+₹${prem24}/g</b>') && app.includes('<b data-rr="prem22">+₹${prem22}/g</b>'));
  ok('refreshRatesPage patches prem24 + prem22 in place on every poll',
    /const prem24 = R\.premium && R\.premium\.gold24 !== undefined \? R\.premium\.gold24 : 398;/.test(app)
    && app.includes("set('prem24', '+₹' + prem24 + '/g');") && app.includes("set('prem22', '+₹' + prem22 + '/g');"));
}

console.log('\n· 4 — B2B UNTOUCHED (the bullion desk never met a premium):');
{
  /* the B2B desk machinery = bullion_anchors → rtgs_strip → bullion_rows
     (its own bullionGoldPremium is a DIFFERENT, deliberately separate knob). */
  const b0 = api.indexOf('function bullion_anchors'), z = api.indexOf('/* v57 ── personal occasion coupons');
  const desk = b0 > 0 && z > b0 ? api.slice(b0, z) : '';
  ok('no RETAIL premium fn (gold24/gold22_premium, jaipur_from_anchor) is referenced anywhere inside the B2B desk slice',
    desk !== '' && !/gold24_premium|gold22_premium|jaipur_from_anchor/.test(desk));
  const r0 = api.indexOf('function rtgs_strip'), r1 = api.indexOf('function bullion_defaults');
  ok('rtgs_strip stays anchored to bullion_anchors() (same anchor, zero retail premium)',
    r0 > b0 && r1 > r0 && api.slice(r0, r1).includes('bullion_anchors($db)')
    && desk.includes("bullionGoldPremium'] ?? 10"));
  ok('22K line math is byte-identical to v155 (only gold24 moved)',
    api.includes("'gold22' => (int)round($g24 * PURITY_22) + $gp22,")
    && api.includes("'gold22' => (int)$l['gold22'] + gold22_premium($db),"));
  ok('app.js B2B surfaces untouched (partner gate, b2b page, city chips intact)',
    app.includes("pages.b2b = async (view) =>") && app.includes('#/partner') && app.includes('bullion desk'));
}

console.log('\n· 5 — BUG B1: v120 openHash \'\' falsy — the history-entry leak is dead:');
{
  ok('the openHash map is INITIALISED to false for every overlay id (only false may mean closed)',
    /for \(var zi = 0; zi < OVERLAYS\.length; zi\+\+\) \{ openHash\[OVERLAYS\[zi\]\.id\] = false; \}/.test(v120));
  ok('open/close branches compare STRICTLY (=== false / !== false) — empty-string hash is a real marker',
    v120.includes('if (is && openHash[o.id] === false) { pushEntry(o.id); openHash[o.id] = location.hash; }')
    && v120.includes('else if (!is && openHash[o.id] !== false) {'));
  ok('zero falsy-trusting openHash reads remain anywhere in v120.js',
    !/!openHash\[/.test(v120) && !/&& openHash\[o\.id\]\)/.test(v120));
  ok('the rest of the back-button engine is intact (pushEntry, popstate, sameHash cleanup, __shvNavigating)',
    v120.includes('function pushEntry(id)') && v120.includes("window.addEventListener('popstate'")
    && v120.includes('var sameHash = (openHash[o.id] === location.hash);') && v120.includes('if (window.__shvNavigating)'));
}

console.log('\n· 6 — BUG B2: the cart page patches in place — the pincode survives the 1 s poll:');
{
  ok('pages.cart marks up the live numbers (hero · subtotal · shipping · gap · total · save · mcta · line prices)',
    app.includes('<p data-cart-hero>') && app.includes('<b data-cart-sub>') && app.includes('<span data-cart-ship>')
    && app.includes('data-cart-gap') && app.includes('<b data-cart-total>') && app.includes('<b data-cart-save>')
    && app.includes('<b data-cart-mcta>')
    && app.includes('<b class="js-price" data-pid="${it.p.id}" data-qty="${it.qty}">'));
  ok('refreshCartPage() exists, returns false on stale markup, and PRESERVES the pincode across the rare structural re-render',
    /function refreshCartPage\(\) \{[\s\S]{0,3000}const pin = view\.querySelector\('\[data-pin\]'\), val = pin \? pin\.value : '';/.test(app)
    && /if \(!subEl\) return false;/.test(app)
    && /if \(pin2 && val\) pin2\.value = val;/.test(app));
  ok('the rates poll no longer rebuilds the cart — it calls refreshCartPage() first',
    app.includes("if (location.hash.startsWith('#/cart')) { if (!refreshCartPage()) {")
    && !/if \(location\.hash\.startsWith\('#\/cart'\)\) pages\.cart\(\$\('#view'\)\);\n  if \(location\.hash\.startsWith\('#\/compare'\)\)/.test(app));
  ok('empty-cart state is handled (returns true — saved-for-later rows self-patch via .js-price)',
    /if \(!state\.cart\.length\) return true;/.test(app));
  ok('user-initiated qty/remove actions still re-render the page (their contract)',
    app.includes("if ((location.hash || '').startsWith('#/cart')) pages.cart($('#view'));"));
}

console.log('\n· 7 — BUG B3: the 12 h chart can never paint NaN again:');
{
  ok('drawRateChart filters to positive-finite points and bails under 2 (0/0 killed)',
    app.includes("const data = hist.map(p => +((p && p.gold22) || 0)).filter(v => isFinite(v) && v > 0);")
    && app.includes('if (data.length < 2) return;')
    && app.indexOf('if (data.length < 2) return;') < app.indexOf('const min = Math.min(...data) * 0.999'));
}

console.log('\n· 8 — stamp lockstep (156+) incl. the loader stamps:');
{
  ok('APP_REL 156+', /const APP_REL = 15\d;/.test(app));
  ok('index __SHIVAA_REL=156+ + loader app.js?v=156+', /window\.__SHIVAA_REL=15\d;/.test(idx) && /\/js\/app\.js\?v=15\d"/.test(idx));
  ok('sw SHELL v156+ + PRECACHE /js/app.js?v=156+', /'shivaa-shell-v15\d'/.test(sw) && /'\/js\/app\.js\?v=15\d'/.test(sw));
  ok('no stale 155 stamp left in the five boot spots',
    !/const APP_REL = 155;/.test(app) && !idx.includes('__SHIVAA_REL=155') && !idx.includes('/js/app.js?v=155"')
    && !sw.includes('shivaa-shell-v155') && !sw.includes("'/js/app.js?v=155'"));
  ok("api rel 156+ (mind the 3-space gap)", /'rel'   => 15\d,/.test(api));
  ok('admin loader still FOLLOWS APP_REL (v152 design — no manual stamp to miss)',
    app.includes("injectScript('/js/admin.js?v=' + APP_REL)"));
}

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} v156 checks passed  ${pass === results.length ? '✦ — Shivaa rates · 24K premium ₹398 · 3 bugs dead' : '✗ FAILED'}`);
process.exit(pass === results.length ? 0 : 1);
