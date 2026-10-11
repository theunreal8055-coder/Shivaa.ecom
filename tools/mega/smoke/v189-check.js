/* v189 — static checks for the 20% making-charges offer in three places
   (main home banner, footer, side menu), the Amrita dish photos and the stamps.
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

test('C01', 'release 189 in lockstep across the stamp sites', () => {
  assert.ok(index.includes('window.__SHIVAA_REL=189;'), 'index stamp');
  assert.ok(app.includes('const APP_REL = 189;'), 'app stamp');
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v189';") && sw.includes('const REL = 189;'), 'worker stamps');
  assert.ok(api.includes("'rel'   => 189,"), 'api version endpoint');
});

test('C02', 'v188.css still loads last and is precached', () => {
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.equal(links[links.length - 1], 'v188.css?v=189', 'stylesheet must load last');
  assert.ok(sw.includes("'/css/v188.css?v=189'"), 'worker precaches it');
});

test('C03', 'public offer route: GET only, public coupons only, making scope, owner switch', () => {
  const at = api.indexOf("$route === 'offers/banner'");
  assert.ok(at > 0, 'route');
  const block = api.slice(at, at + 900);
  assert.ok(block.includes("empty($c['forUser'])"), 'excludes personal coupons');
  assert.ok(block.includes("coupon_scope($c) === 'making'"), 'making-charges scope only');
  assert.ok(block.includes('coupon_live($c)'), 'expiry and active checked');
  assert.ok(block.includes("!empty($db['settings']['bannerOfferOn'])"), 'owner switch checked');
  assert.ok(!block.includes('amritaPage'), 'does not depend on the Amrita switch');
});

test('C04', 'three placements: hero, footer, side menu', () => {
  assert.ok(index.includes('<div class="shv-offer-foot" data-banner-offer="compact" hidden></div>'), 'footer slot');
  assert.ok(index.includes('<div class="shv-offer-side" data-banner-offer="compact" hidden></div>'), 'side menu slot');
  assert.ok(app.includes('data-banner-offer="hero"'), 'hero slot');
  const footerAt = index.indexOf('shv-offer-foot');
  assert.ok(footerAt > index.indexOf('<footer class="footer'), 'footer slot is inside the footer');
  const sideAt = index.indexOf('shv-offer-side');
  assert.ok(sideAt > index.indexOf('id="mainNav"') && sideAt < index.indexOf('</nav>', index.indexOf('id="mainNav"')), 'side slot is inside the side menu');
});

test('C05', 'one loader fills every slot and runs on load', () => {
  assert.ok(app.includes("api('/api/offers/banner')"), 'calls the public route');
  assert.ok(app.includes("querySelectorAll('[data-banner-offer]')"), 'fills every slot');
  assert.ok(app.includes('fillBannerOffer(view);'), 'home render fills the hero');
  assert.ok(app.includes('fillBannerOffer(document));'), 'footer and side menu are filled on load');
  assert.ok(!app.includes('shv-amrita-entry'), 'no Amrita card on home');
});

test('C06', 'the offer card and the compact pill are both drawn with escaped values', () => {
  assert.ok(app.includes('bannerOfferHTML'), 'renderer');
  assert.ok(app.includes('class="shv-offer-mini"'), 'compact variant');
  assert.ok(app.includes('esc(o.code)'), 'code escaped');
  assert.ok(css.includes('.shv-offer-mini'), 'compact styles');
});

test('C07', 'admin: banner switch and code field saved', () => {
  assert.ok(admin.includes('name="bannerOfferOn"'), 'switch');
  assert.ok(admin.includes('name="bannerOfferCode"'), 'code field');
  assert.ok(admin.includes('bannerOfferOn: !!document.querySelector'), 'switch saved');
});

test('C08', 'Amrita dish cards use the real photos (WebP + JPEG, mobile sizes)', () => {
  for (const d of ['idli', 'dosa', 'paneer']) {
    assert.ok(app.includes("img: '" + d + "'"), 'dish ' + d);
    for (const f of [d + '.jpg', d + '.webp', d + '-640.jpg', d + '-640.webp']) {
      assert.ok(fs.existsSync(path.join(ROOT, 'images/amrita', f)), 'missing ' + f);
    }
  }
});

test('C09', 'motion is guarded for reduced motion', () => {
  assert.ok(css.includes('prefers-reduced-motion: reduce'), 'reduced-motion block');
  assert.ok(css.includes('[data-banner-offer][hidden]'), 'hidden slots stay hidden');
});

console.log('v189-check: ' + pass + ' passed' + (process.exitCode ? ' (with failures)' : ''));
