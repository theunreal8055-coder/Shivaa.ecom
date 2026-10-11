/* v188 — static checks for the banner offer, the Amrita dish photos and the stamps.
   Reads the cms/ tree directly; no browser, no PHP needed. */
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

test('C01', 'release 188 in lockstep across the stamp sites', () => {
  assert.ok(index.includes('window.__SHIVAA_REL=188;'), 'index stamp');
  assert.ok(app.includes('const APP_REL = 188;'), 'app stamp');
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v188';") && sw.includes('const REL = 188;'), 'worker stamps');
  assert.ok(api.includes("'rel'   => 188,"), 'api version endpoint');
});

test('C02', 'v188.css loads last and is precached', () => {
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.equal(links[links.length - 1], 'v188.css?v=188', 'v188.css must load last');
  assert.ok(sw.includes("'/css/v188.css?v=188'"), 'worker precaches v188.css');
});

test('C03', 'public offer route exists, is GET-only and never returns a personal coupon', () => {
  assert.ok(api.includes("if ($route === 'offers/banner' && $method === 'GET')"), 'route');
  const block = api.slice(api.indexOf("$route === 'offers/banner'"), api.indexOf("$route === 'offers/banner'") + 900);
  assert.ok(block.includes("empty($c['forUser'])"), 'excludes personal coupons');
  assert.ok(block.includes("coupon_scope($c) === 'making'"), 'making-charges scope only');
  assert.ok(block.includes('coupon_live($c)'), 'expiry and active checked');
  assert.ok(block.includes("!empty($db['settings']['bannerOfferOn'])"), 'owner switch checked');
  assert.ok(!block.includes('amritaPage'), 'does not depend on the Amrita switch');
});

test('C04', 'banner offer switch is a strict boolean and the code is validated', () => {
  assert.ok(api.includes("'amritaPage', 'bannerOfferOn'] as $occKey"), 'strict boolean list');
  assert.ok(api.includes("preg_match('/^[A-Z0-9]{3,24}$/', $bc)"), 'code format');
});

test('C05', 'home page: no Amrita card, banner slot filled from the public route', () => {
  const home = app.slice(app.indexOf('pages.home = async'), app.indexOf('pages.home = async') + 30000);
  assert.ok(!home.includes('shv-amrita-entry'), 'Amrita card removed from home');
  assert.ok(!home.includes('#/amrita'), 'no link to Amrita page on home');
  assert.ok(home.includes('id="bannerOfferSlot"'), 'banner slot');
  assert.ok(app.includes("api('/api/offers/banner')"), 'loader calls public route');
  assert.ok(app.includes('loadBannerOffer(view);'), 'loader called after render');
});

test('C06', 'admin: banner switch and code field saved, Amrita page is described as link-only', () => {
  assert.ok(admin.includes('name="bannerOfferOn"'), 'switch');
  assert.ok(admin.includes('name="bannerOfferCode"'), 'code field');
  assert.ok(admin.includes('bannerOfferOn: !!document.querySelector'), 'switch saved');
  assert.ok(admin.includes('bannerOfferCode: ('), 'code saved');
  assert.ok(admin.includes('NOT linked from the home page'), 'Amrita copy updated');
});

test('C07', 'Amrita dish cards use the real photos with WebP and JPEG sources', () => {
  for (const d of ['idli', 'dosa', 'paneer']) {
    assert.ok(app.includes("img: '" + d + "'"), 'dish ' + d);
    for (const f of [d + '.jpg', d + '.webp', d + '-640.jpg', d + '-640.webp']) {
      assert.ok(fs.existsSync(path.join(ROOT, 'images/amrita', f)), 'missing ' + f);
    }
  }
});

test('C08', 'motion is guarded for reduced-motion and the offer card is mobile-sized', () => {
  assert.ok(css.includes('prefers-reduced-motion: reduce'), 'reduced-motion block');
  assert.ok(css.includes('@media (max-width: 640px)'), 'phone block');
  assert.ok(css.includes('.shv-offer-card'), 'offer styles');
});

console.log('v188-check: ' + pass + ' passed' + (process.exitCode ? ' (with failures)' : ''));
