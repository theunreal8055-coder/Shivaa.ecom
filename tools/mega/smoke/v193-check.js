/* v193 — static checks for the two public offers (20% off making charges, free home
   delivery) for every customer: the server route, the free-delivery rule in the order
   route, the checkout hooks, the three placements, the admin default, the photos and
   the stamps. Reads the cms/ tree directly; no browser or PHP runtime needed. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..', '..', '..', 'cms');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const index = rd('index.html'), app = rd('js/app.js'), admin = rd('js/admin.js');
const sw = rd('sw.js'), api = rd('api.php'), css = rd('css/v188.css'), css193 = rd('css/v193.css'), css192 = rd('css/v192.css');

let pass = 0;
function test(id, name, fn) {
  try { fn(); pass++; console.log('PASS ' + id + ' ' + name); }
  catch (e) { console.error('FAIL ' + id + ' ' + name + ': ' + e.message); process.exitCode = 1; }
}

test('D01', 'release 193 in lockstep across the stamp sites', () => {
  assert.ok(index.includes('window.__SHIVAA_REL=193;'), 'index stamp');
  assert.ok(app.includes('const APP_REL = 193;'), 'app stamp');
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v193';") && sw.includes('const REL = 193;'), 'worker stamps');
  assert.ok(api.includes("'rel'   => 193,"), 'api version endpoint');
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

test('F01', 'v193 mobile layer is linked last and precached', () => {
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.equal(links[links.length - 1], 'v193.css?v=193', 'v193.css must load last');
  assert.ok(sw.includes("'/css/v193.css?v=193'"), 'precached');
});

test('F02', 'v193 phone rules stay inside the phone media query; desktop is not touched', () => {
  const phone = css192.slice(css192.indexOf('@media (max-width: 767px) {'), css192.indexOf('/* ── Phones: polished motion'));
  assert.ok(phone.length > 200, 'phone block present');
  assert.ok(!/\.shv-offer-card\s*\{[^}]*display\s*:\s*none/.test(phone), 'no hiding of offer cards');
  const global = css192.slice(0, css192.indexOf('/* ── Phones (≤'));
  assert.ok(!/\bdisplay\s*:\s*none/.test(global), 'no display:none outside the phone block');
  assert.ok(!/!important/.test(global.replace(/scroll-behavior[^;]*;/g,'').replace(/transition-duration[^;]*;/g,'').replace(/max-width[^;]*;/g,'')), 'global rules avoid !important');
});

test('F03', 'v193 never stops loading spinners or animations for reduced-motion users', () => {
  assert.ok(!/animation-iteration-count/.test(css192), 'no iteration override');
  assert.ok(!/\*\s*,\s*\*::before/.test(css192), 'no blanket selector');
  assert.ok(css192.includes('prefers-reduced-motion: reduce'), 'reduced-motion block');
});

test('F04', 'phone inputs are 16px (no iOS zoom) and buttons are at least 44px tall', () => {
  assert.ok(css192.includes('font-size: 16px'), 'inputs');
  assert.ok(css192.includes('min-height: 44px'), 'touch targets');
});

test('G01', 'v193 luxury layer is linked last after v192 and precached', () => {
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.equal(links[links.length - 1], 'v193.css?v=193', 'v193.css must load last');
  assert.ok(links.includes('v192.css?v=193'), 'v192 still loaded');
  assert.ok(sw.includes("'/css/v193.css?v=193'"), 'precached');
});

test('G02', 'v193 is visual only: no display rules and no layout-moving rules on flows', () => {
  assert.ok(!/display\s*:\s*none/.test(css193), 'nothing hidden');
  assert.ok(!/position\s*:\s*fixed/.test(css193), 'no fixed overlays');
});

test('G03', 'luxury effects are guarded: hover lifts only on fine pointers, reduced motion off', () => {
  assert.ok(css193.includes('@media (hover: hover) and (pointer: fine)'), 'hover guard');
  assert.ok(css193.includes('prefers-reduced-motion: reduce'), 'reduced-motion block');
});

console.log('v193-check: ' + pass + ' passed' + (process.exitCode ? ' (with failures)' : ''));
