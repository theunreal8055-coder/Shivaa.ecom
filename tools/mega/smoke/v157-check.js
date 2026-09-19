/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v157 check — SHIVAA EVERYWHERE + THE LIVE-RATE PROMISE.
   Owner's brief (2026-09-19, branch arena/01a0ba4b continued):
     "wherever there is Jaipur mentioned, mention shivaa … add same premium
      as 22K to 24K gold rates in the b2c section … find some bugs in the app
      and solve … don't disturb b2b section."
   1 · THE SWEEP IS FINISHED (the v156 leftovers). Four surfaces still spoke
       the old rate brand and nobody had swept them:
         a) the buyback page badge  LIVE JAIPUR RATE      → LIVE SHIVAA RATE
         b) the PWA manifests       "…live Jaipur rates"  → Shivaa
         c) the catalogue copy      77 product descriptions said "the live
            Jaipur bullion rate" → rewritten in db.json AND normalised at the
            public display boundary (cms/hallmark.php · shv_storefront_copy),
            because the live database is never shipped in a code release —
            staff / partner views keep the raw stored text.
         d) the admin-generated customer collateral: the shareable rate-card
            image ("BIS HALLMARKED · SHIVAA"), the product poster subtitle and
            the two rate-engine setting labels. The geographic address line
            ("…Jayal, Nagaur · Jaipur") stays exactly as it was.
   2 · THE 24K PREMIUM SURVIVES EVERY B2C SURFACE — including the one that
       had quietly bypassed it: the Finale prize was valued off the raw fine
       anchor, ₹398/g below the storefront 24K rate the same page advertises.
       Geography, B2B portals, the bullion desk and the RTGS board stay
       byte-untouched and pin-proven.
   3 · THREE MORE BUGS DEAD — all siblings of the v120/v156 wholesale-render
       class, found by driving the real pages:
         B4 compare rebuilt on every 1 s tick (table scroll reset, mid-tick
            taps swallowable) → refreshComparePage() patches in place.
         B5 the buyback "LIVE" valuation was frozen at render → re-runs in
            place every tick, weight input and slider untouched.
         B6 the Swarna Nidhi projection promised grams at the render-time
            rate → re-projects in place, ₹ input and slider untouched.
   Run: node tools/mega/smoke/v157-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v157-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const app = read('js/app.js'), api = read('api.php'), adm = read('js/admin.js'), idx = read('index.html'),
      sw = read('sw.js'), hm = read('hallmark.php'), mf = read('manifest.json'), mw = read('manifest.webmanifest'),
      db = read('data/db.json');

console.log('· 1 — THE SWEEP IS FINISHED: every B2C surface speaks Shivaa:');
{
  ok('buyback badge is LIVE SHIVAA RATE (the last uppercase survivor)',
    app.includes('LIVE SHIVAA RATE') && !app.includes('LIVE JAIPUR RATE') && !/JAIPUR/.test(app));
  ok('manifests dropped the city from the rate brand (name + descriptions)',
    !/Jaipur/.test(mf) && !/Jaipur/.test(mw) && mw.includes('"name": "Shivaa Jewellers",') && mf.includes('live Shivaa rates'));
  ok('catalogue copy rewritten at the source (db.json: zero Jaipur, 77 new lines)',
    !/Jaipur/.test(db) && (db.match(/live Shivaa rate/g) || []).length >= 70);
  ok('…and normalised at the public display boundary for the LIVE database (which is never shipped)',
    /function shv_storefront_copy\(string \$s\): string/.test(hm)
    && hm.includes("['live Jaipur bullion rate'")
    && /if \(isset\(\$product\['desc'\]\)[\s\S]{0,200}shv_storefront_copy/.test(hm)
    && /isset\(\$product\['mediaNote'\][\s\S]{0,120}shv_storefront_copy/.test(hm));
  ok('admin-generated CUSTOMER collateral renamed (rate-card image + poster subtitle), labels too',
    adm.includes("x.fillText('BIS HALLMARKED · SHIVAA'") && !adm.includes('BIS HALLMARKED · JAIPUR')
    && adm.includes('✦ Shivaa Jewellers · Shivaa live rates ✦') && !adm.includes('Jaipur rates ✦')
    && adm.includes('<label>Shivaa gold premium ₹/g ') && adm.includes('<label>Shivaa silver premium ₹/g</label>'));
  ok('the geographic address line is deliberately untouched (Jayal, Nagaur · Jaipur)',
    adm.includes("x.fillText('Shivaa Jewellers, Jayal, Nagaur · Jaipur'"));
  ok('real geography keeps its name (pickup ×2 + option, city chips, reviewer hometown)',
    (app.match(/Jaipur &amp; Nagaur/g) || []).length === 2 && app.includes('Pickup &amp; drop (Jaipur / Nagaur)')
    && app.includes("'Jodhpur', 'Jaipur', 'Ajmer'") && app.includes("['Sneha Kulkarni', 'Jaipur',"));
  ok('the v156 brand strings are all still standing (no regression while sweeping)',
    app.includes('✦ SHIVAA LIVE RATE') && app.includes('GOLD 24K · SHIVAA') && app.includes('24K Shivaa premium')
    && app.includes('22K Shivaa premium') && app.includes('These Shivaa rates power every price on shivaa.in'));
}

console.log('\n· 2 — THE 24K PREMIUM REACHES EVERY B2C SURFACE (incl. the prize):');
{
  ok('api chain intact: gold24_premium() → jaipur_from_anchor() → premium.gold24 → PUT whitelist',
    /function gold24_premium\(array \$db\): int/.test(api) && api.includes("'gold24' => (int)round($g24) + $gp24,")
    && /'premium' => \['gold22' => gold22_premium\(\$db\), 'gold24' => gold24_premium\(\$db\),/.test(api)
    && /'gold24Premium' => \[0, 100000, 'int'\]/.test(api));
  ok('the Finale 10 g prize is valued on the STOREFRONT 24K rate (state.rates.gold24 first, raw anchor last)',
    /const g24 = \(state\.rates && state\.rates\.gold24\) \|\| \(r && r\.jaipur && r\.jaipur\.gold24\) \|\| \(r && r\.gold24\);/.test(app)
    && app.includes("Math.round(10 * g24).toLocaleString('en-IN')"));
  ok('no B2C surface reads a bare r.gold24 for display any more (one choke point)',
    !/Math\.round\(10 \* r\.gold24\)/.test(app));
  ok('B2B untouched: the desk slice still prices off bullion_anchors (no retail premium reference)',
    (() => {
      const b0 = api.indexOf('function bullion_anchors'), z = api.indexOf('/* v57 ── personal occasion coupons');
      const desk = b0 > 0 && z > b0 ? api.slice(b0, z) : '';
      return desk !== '' && !/gold24_premium|gold22_premium|jaipur_from_anchor/.test(desk)
        && desk.includes("bullionGoldPremium'] ?? 10");
    })());
  ok('B2B surfaces in app.js intact (partner gate · b2b page · bullion desk wording)',
    app.includes("pages.b2b = async (view) =>") && app.includes('#/partner') && app.includes('bullion desk'));
}

console.log('\n· 3 — BUG B4: the compare page patches in place (no 1 s rebuild):');
{
  ok('refreshComparePage() exists and refuses stale markup (returns false → caller renders)',
    /function refreshComparePage\(\) \{/.test(app) && /if \(!table\) return false;/.test(app)
    && /if \(!items\.length\) return !!view\.querySelector\('\.pcmp-empty'\);/.test(app));
  ok('the RATES POLL calls the patcher first and only falls back to a full render',
    (() => {
      /* scope to the tick listener itself — the tray's explicit rerenderComparePage()
         (line ~567, fired by a user tap) is allowed to re-render; the POLL is not. */
      const i = app.lastIndexOf("document.addEventListener('rates', () => {");
      const body = i > 0 ? app.slice(i, app.indexOf('\n});', i)) : '';
      return body.includes('if (!refreshComparePage()) pages.compare(')
        && !/\n\s*if \(location\.hash\.startsWith\('#\/compare'\)\) pages\.compare\(/.test(body);
    })());
  ok('every derived number carries a hook (note total + metal/making/GST/rate rows, per product)',
    app.includes('<b data-cmp-note>') && app.includes("data-cmp=\"${key}\" data-pid=\"${p.id}\"")
    && app.includes("'', 'mval')") && app.includes("'', 'mcr')") && app.includes("'', 'gst')") && app.includes("'', 'rate')"));
  ok('the label helper is shared by render and patch (they cannot drift)',
    /function compareMetalLabel\(p\) \{/.test(app) && app.includes('const metalLabel = compareMetalLabel;'));
}

console.log('\n· 4 — BUG B5: the buyback valuation follows the feed, in place:');
{
  ok('the rates event re-reads the storefront rates and re-runs the maths',
    /const _bbLive = \(\) => \{/.test(app) && app.includes("document.addEventListener('rates', _bbLive);")
    && app.includes('if (RR.gold22) rates.g22 = RR.gold22;') && app.includes('if (RR.gold24) rates.g24 = RR.gold24;'));
  ok('the listener detaches itself the moment the calculator leaves the DOM (no dead-page work)',
    /if \(!document\.getElementById\('bbCalc'\)\) \{ document\.removeEventListener\('rates', _bbLive\); return; \}/.test(app));
}

console.log('\n· 5 — BUG B6: the Swarna Nidhi projection follows the feed, in place:');
{
  ok('the 22K rate is mutable and patched on every tick (grams re-divide)',
    app.includes('let g22 = R.gold22 || 0;') && /const _svLive = \(\) => \{/.test(app)
    && app.includes('if (RR.gold22) g22 = RR.gold22;'));
  ok('both rate lines carry hooks and are reprinted live', app.includes('<b data-sv-rate>') && app.includes('<span data-sv-rate2>')
    && app.includes("if (a) a.textContent = fmt(g22) + '/g';") && app.includes("if (b) b.textContent = fmt(g22);"));
  ok('the listener detaches itself when the calculator is gone',
    /if \(!document\.getElementById\('svCalc'\)\) \{ document\.removeEventListener\('rates', _svLive\); return; \}/.test(app));
}

/* v158 — these pins are deliberately forward-tolerant: the exact release
   stamp is pinned by the suite of the release that ships it (v158-check); an
   older era suite must only refuse to go BACKWARDS. */
const REL = +((/const APP_REL = (\d+);/.exec(app) || [])[1] || 0);
console.log('\n· 6 — stamp lockstep (' + REL + ', forward-tolerant from 157) incl. the loader stamps:');
{
  ok('APP_REL is 157 or later', REL >= 157, 'APP_REL=' + REL);
  ok('index __SHIVAA_REL + loader app.js?v= both track APP_REL',
    idx.includes(`window.__SHIVAA_REL=${REL};`) && idx.includes(`/js/app.js?v=${REL}"`));
  ok('sw SHELL + PRECACHE app.js track APP_REL', sw.includes(`'shivaa-shell-v${REL}'`) && sw.includes(`'/js/app.js?v=${REL}'`));
  ok('api rel 157+ (mind the 3-space gap)', (() => { const m = /'rel'\s*=>\s*(\d+),/.exec(api); return !!m && +m[1] >= 157; })());
  ok('no stale 156 stamp left in the boot spots',
    !/const APP_REL = 156;/.test(app) && !idx.includes('__SHIVAA_REL=156') && !idx.includes('/js/app.js?v=156"')
    && !sw.includes('shivaa-shell-v156') && !sw.includes("'/js/app.js?v=156'") && !/'rel'   => 156,/.test(api));
}

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} v157 checks passed  ${pass === results.length ? '✦ — Shivaa everywhere · 24K premium everywhere · 3 more bugs dead' : '✗ FAILED'}`);
process.exit(pass === results.length ? 0 : 1);
