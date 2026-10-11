/* v191 — static checks for the two public offers (20% off making charges, free home
   delivery) for every customer: the server route, the free-delivery rule in the order
   route, the checkout hooks, the three placements, the admin default, the photos and
   the stamps. Reads the cms/ tree directly; no browser or PHP runtime needed. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..', 'cms');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const index = rd('index.html'), app = rd('js/app.js'), admin = rd('js/admin.js');
const sw = rd('sw.js'), api = rd('api.php'), css = rd('css/v188.css');

let pass = 0;
function test(id, name, fn) {
  try { fn(); pass++; console.log('PASS ' + id + ' ' + name); }
  catch (e) { console.error('FAIL ' + id + ' ' + name + ': ' + e.message); process.exitCode = 1; }
}

test('D01', 'release 191 in lockstep across the stamp sites', () => {
  assert.ok(index.includes('window.__SHIVAA_REL=191;'), 'index stamp');
  assert.ok(app.includes('const APP_REL = 191;'), 'app stamp');
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v191';") && sw.includes('const REL = 191;'), 'worker stamps');
  assert.ok(api.includes("'rel'   => 191,"), 'api version endpoint');
});

test('D02', 'offers route: GET, public, creates MAKING20 + FREEDEL once, respects the owner switch', () => {
  const at = api.indexOf("$route === 'offers/banner' && $method === 'GET'");
  assert.ok(at > 0, 'route');
  const block = api.slice(at, api.indexOf("  /* v191", at));
  assert.ok(block.includes("'FREEDEL'"), 'free delivery coupon');
  assert.ok(block.includes("'scope' => 'making'"), 'making-charges scope');
  assert.ok(block.includes("'freeShipping' => true"), 'delivery flag');
  assert.ok(block.includes('$changed') && block.includes('db_save('), 'saves only when it creates');
  assert.ok(block.includes("empty($c['forUser'])"), 'excludes personal coupons');
  assert.ok(block.includes('coupon_live($c)'), 'expiry and active respected');
  assert.ok(block.includes("array_key_exists('bannerOfferOn'"), 'owner switch read');
  assert.ok(!block.includes('amritaPage'), 'independent of the Amrita switch');
});

test('D03', 'order route: a freeShipping coupon waives the delivery fee', () => {
  assert.ok(api.includes("if ($coupon && !empty($coupon['freeShipping']) && $subtotal >= (float)($coupon['minOrder'] ?? 0)) $shipping = 0;"), 'rule');
  const rule = api.indexOf("'freeShipping']) && $subtotal");
  const ship = api.indexOf("$shipping = $subtotal >= $freeShip");
  assert.ok(ship > 0 && rule > ship, 'rule sits after the normal shipping line');
});

test('D04', 'checkout: the free-delivery coupon drives the shipping line in every place it is set', () => {
  assert.ok(app.includes('window._co.couponFreeShip = !!c.freeShipping;'), 'coupon sets flag');
  assert.ok(app.includes('window._co.freeShip = sub >= state.settings.freeShipAbove || !!window._co.couponFreeShip || !!(state.user && state.user.premium);'), 'recalc');
  assert.ok(app.includes('window._co.freeShip = subtotal >= state.settings.freeShipAbove || !!window._co.couponFreeShip || !!(state.user && state.user.premium);'), 'summary recalc');
  assert.ok(app.includes('window._co.couponFreeShip = false;'), 'cleared on error');
});

test('D05', 'three placements: home banner cards, footer and side menu stacks', () => {
  assert.ok(app.includes('data-banner-offer="hero"'), 'hero slot');
  assert.ok(index.includes('<div class="shv-offer-foot" data-banner-offer="compact" hidden></div>'), 'footer slot');
  assert.ok(index.includes('<div class="shv-offer-side" data-banner-offer="compact" hidden></div>'), 'side menu slot');
  assert.ok(app.includes('shv-offer-grid') && app.includes('shv-offer-stack'), 'card grid and compact stack');
  assert.ok(app.includes("api('/api/offers/banner')"), 'public route');
  assert.ok(app.includes('fillBannerOffer(document));'), 'footer and side menu filled on load');
});

test('D06', 'the free-delivery card and the making card both render with escaped codes', () => {
  assert.ok(app.includes("shv-offer-${isDel ? 'delivery' : 'making'}") && app.includes("'FREE'"), 'delivery card');
  assert.ok(app.includes('esc(o.code)'), 'code escaped');
  assert.ok(css.includes('.shv-offer-card.shv-offer-delivery'), 'delivery styles');
  assert.ok(css.includes('@media (max-width: 640px) { .shv-offer-grid'), 'stacks on phones');
});

test('D07', 'admin: the offers switch is ON by default, and the description matches the new behaviour', () => {
  assert.ok(admin.includes("(S.bannerOfferOn === undefined ? true : !!S.bannerOfferOn) ? 'checked' : ''"), 'default on');
  assert.ok(admin.includes('MAKING20') && admin.includes('FREEDEL'), 'codes described');
  assert.ok(!admin.includes('Create that coupon in <b>Coupons</b> first'), 'old setup step removed');
});

test('D08', 'Amrita dish photos still present (WebP + JPEG, mobile sizes)', () => {
  for (const d of ['idli', 'dosa', 'paneer']) {
    for (const f of [d + '.jpg', d + '.webp', d + '-640.jpg', d + '-640.webp']) {
      assert.ok(fs.existsSync(path.join(ROOT, 'images/amrita', f)), 'missing ' + f);
    }
  }
});

test('D09', 'motion is still guarded for reduced motion', () => {
  assert.ok(css.includes('prefers-reduced-motion: reduce'), 'reduced-motion block');
});


test('E01', 'Premium card: claim route is signed-in only, idempotent, and writes the flag', () => {
  const at = api.indexOf("$route === 'premium/claim' && $method === 'POST'");
  assert.ok(at > 0, 'route');
  const block = api.slice(at, at + 1200);
  assert.ok(block.includes("jout(401"), 'signed-in only');
  assert.ok(block.includes("if (empty($uu['premium']))"), 'idempotent');
  assert.ok(block.includes("$db['users'][$i]['premium'] = true"), 'flag written');
  assert.ok(block.includes('rate_block('), 'rate limited');
});

test('E02', 'Premium member pays no delivery fee on the server, and the profile carries the flag', () => {
  assert.ok(api.includes("if (!empty($u) && !empty($u['premium'])) $shipping = 0;"), 'order rule');
  assert.ok(api.includes("'premium' => !empty($u['premium'])"), 'profile flag');
});

test('E03', 'Premium card is on the home hero for everyone; its claim button is wired', () => {
  assert.ok(app.includes('function premiumCardHTML'), 'card');
  assert.ok(app.includes('data-premium-claim'), 'button');
  assert.ok(app.includes("api('/api/premium/claim'"), 'calls the claim route');
  assert.ok(app.includes("href=\"#/login\""), 'guests are sent to sign in');
});

test('E04', 'live data file is out of git and ignored', () => {
  const gi = fs.readFileSync(path.join(__dirname, '..', '..', '..', '.gitignore'), 'utf8');
  assert.ok(gi.includes('cms/data/db.json'), 'gitignore');
});

console.log('v191-check: ' + pass + ' passed' + (process.exitCode ? ' (with failures)' : ''));
