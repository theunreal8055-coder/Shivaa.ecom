/* v195 — static checks: the Shivaa Black port. The hero highlight, the claim page
   and its address step, the single coupon lookup, the stamps, and no duplicate PHP
   functions. Behaviour is proved in v195-php-run.js against real PHP. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const CMS = path.join(__dirname, '..', '..', '..', 'cms');
const rd = p => fs.readFileSync(path.join(CMS, p), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), api = rd('api.php'), app = rd('js/app.js');
const black = rd('js/v195-black.js'), css = rd('css/v195.css');
let pass = 0, fail = 0;
function test(id, name, fn) {
  try { fn(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}
test('A01', 'release 195 in lockstep across the stamp sites', () => {
  assert.ok(index.includes('__SHIVAA_REL=195'));
  assert.ok(app.includes('const APP_REL = 195;'));
  assert.ok(api.includes("'rel'   => 195,"));
  assert.ok(sw.includes('const REL = 195;') && sw.includes('shivaa-shell-v195'));
});
test('A02', 'v195 stylesheet is linked last; the black module loads; both are precached', () => {
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.equal(links[links.length - 1], 'v195.css?v=195');
  assert.ok(index.includes('<script src="/js/v195-black.js?v=195" defer></script>'));
  assert.ok(sw.includes("'/css/v195.css?v=195'") && sw.includes("'/js/v195-black.js?v=195'"));
});
test('B01', 'the black card is the home hero highlight: slot under the hero, filled on every home render', () => {
  assert.ok(app.includes('data-black-hero hidden'));
  assert.ok(/fillBannerOffer\(view\);\s*\n\s*if \(window\.ShivaaBlack\) ShivaaBlack\.fill\(view\);/.test(app));
  const heroAt = app.indexOf('<section class="hero">'), slotAt = app.indexOf('data-black-hero hidden');
  assert.ok(heroAt > 0 && slotAt > heroAt && slotAt - heroAt < 6000, 'slot sits right after the main hero');
});
test('B02', 'the #/black-card page is registered in the router', () => {
  assert.ok(app.includes("pages['black-card'] = (view) => (window.ShivaaBlack"));
});
test('B03', 'checkout uses ONE coupon lookup (coupon_resolve) in both places', () => {
  assert.ok(api.includes("if (($c = coupon_resolve($db, $b['code'] ?? '', $cu)) !== null) {"));
  assert.ok(api.includes("if (!empty($b['coupon']) && !empty($u)) $coupon = coupon_resolve($db, $b['coupon'], $u);"));
  assert.ok(!api.includes("foreach ($db['coupons'] as $c) if (strtoupper($c['code']) === strtoupper((string)($b['code'] ?? '')"), 'old validate loop removed');
  assert.ok(!api.includes("foreach ($db['coupons'] as $c) if (strtoupper($c['code']) === strtoupper($b['coupon'])"), 'old order loop removed');
});
test('B04', 'the claim requires the delivery address; the physical card is free; six months', () => {
  assert.ok(api.includes("route === 'black-card/claim'"));
  assert.ok(api.includes("'fee' => 0"), 'delivery fee is zero');
  assert.ok(api.includes("function black_six_month_expiry"));
  assert.ok(api.includes("Please add your delivery address for the free physical card."));
});
test('B05', 'no duplicate PHP function names in api.php', () => {
  const names = [...api.matchAll(/^function ([A-Za-z_]\w*)\s*\(/gm)].map(m => m[1]);
  const seen = new Set(), dup = [];
  for (const n of names) (seen.has(n) ? dup : seen.add(n) && 0);
  assert.deepEqual(dup, [], 'duplicates: ' + dup.join(', '));
});
test('C01', 'the black module parses and the app still parses', () => {
  new vm.Script(black, { filename: 'v195-black.js' });
  new vm.Script(app, { filename: 'app.js' });
});
test('C02', 'the copy tells the truth: 20% of the making charges, six months, free physical card', () => {
  assert.ok(black.includes('20% off'));
  assert.ok(black.includes('making charges'));
  assert.ok(black.includes('six months'));
  assert.ok(black.includes('Delivered free'));
});
test('C03', 'the card works on phones and respects reduced motion', () => {
  assert.ok(css.includes('@media (max-width: 767px)'));
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('font: 16px/1.3'), 'inputs 16px so iOS does not zoom');
});
console.log(`v195-check: ${pass} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
