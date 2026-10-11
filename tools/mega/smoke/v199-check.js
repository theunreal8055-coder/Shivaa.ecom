/* v199 — Shivaa Black: name + mobile, then the card, then the Premium offer, then the physical-card address page.
   Static checks on the cms/ tree: the black hero, the side-menu entry, the footer link and
   the header pill are all present; the card page is registered once; the claim sends the
   delivery address; the server returns the card on the account and the making-charge shape
   the checkout reads. Browser-only behaviour is not run here. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const CMS = path.join(__dirname, '..', '..', '..', 'cms');
const rd = p => fs.readFileSync(path.join(CMS, p), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), api = rd('api.php'), app = rd('js/app.js');
let pass = 0, fail = 0;
function test(id, name, fn) {
  try { fn(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}
const count = (s, re) => (s.match(re) || []).length;

test('A01', 'release stamp 199 everywhere', () => {
  assert(/const APP_REL = 199;/.test(app), 'APP_REL');
  assert(/__SHIVAA_REL=199/.test(index), 'index stamp');
  assert(/const REL = 199;/.test(sw) && /shivaa-shell-v199/.test(sw), 'sw stamp');
  assert(/'rel'\s*=>\s*199/.test(api), 'api rel');
});

test('A02', 'no v195 / v197 Black layers left wired in', () => {
  assert(!/v195-black/.test(index + app + sw), 'v195-black still referenced');
  assert(!/v197-(side|foot)-slot|data-black-hero/.test(index + app), 'v197 slots still present');
  assert(!/v195\.css|v197\.css/.test(index + sw), 'v195/v197 css still linked');
  assert(!fs.existsSync(path.join(CMS, 'js/v195-black.js')), 'v195-black.js still in tree');
});

test('A03', 'the restored Black stylesheets are linked and precached', () => {
  for (const c of ['v184', 'v185', 'v186']) {
    assert(index.includes(`/css/${c}.css?v=199`), `${c}.css not linked`);
    assert(sw.includes(`/css/${c}.css?v=199`), `${c}.css not precached`);
    assert(fs.existsSync(path.join(CMS, 'css', c + '.css')), `${c}.css missing`);
  }
  assert(fs.existsSync(path.join(CMS, 'images/black/hero-v186.jpg')), 'hero artwork missing');
});

test('B01', 'main home hero is the Black hero', () => {
  assert(app.includes('<section class="hero black-hero" id="blackHero"'), 'black hero section');
  assert(app.includes('${blackCardVisual(homeCard, { home: true })}'), 'card on the hero');
  assert(count(app, /id="blackPrivileges"/g) === 1, 'home privileges section count');
});

test('B02', 'side menu, header pill and footer all link to the card', () => {
  assert(index.includes('class="hdr-scheme-pill hdr-black-pill" title="Open Shivaa Black"'), 'header pill');
  assert(index.includes('data-nav="black-card" class="dw-row dw-lite dw-black"'), 'side menu row');
  assert(index.includes('<a href="#/black-card">Shivaa Black Card ✦</a>'), 'footer link');
});

test('B03', 'the card page is registered exactly once', () => {
  assert(count(app, /pages\['black-card'\]\s*=/g) === 1, 'pages black-card count');
});

test('C01', 'the claim asks only for name and registered mobile; the address comes later', () => {
  assert(app.includes('function blackIntakeHTML()'), 'intake fields');
  assert(app.includes("payload = { name: intake.name };"), 'claim sends the name');
  assert(!app.includes("api('/api/black-card/claim', { method: 'POST', body: '{}' })"), 'old empty claim body');
  assert(app.includes("blackClaimHTML(inAccount = false)") || app.includes('function blackClaimHTML(inAccount = false)'), 'claim card');
  assert(/Enter a valid 10-digit Indian mobile number/.test(app), 'mobile message');
});

test('C04', 'the card shows the Premium offer and a button to the physical-card address page', () => {
  assert(app.includes('function blackPremiumHTML(card)'), 'premium section');
  assert(app.includes('data-bc-delivery-start'), 'delivery button');
  assert(app.includes("location.hash = '#/black-card/delivery'"), 'goes to the address page');
  assert(/\/black-card\\\/delivery/.test(app) || app.includes('#\\/black-card\\/delivery'), 'address page route');
  assert(app.includes("api('/api/black-card/delivery'"), 'address saved through the delivery route');
});

test('C05', 'Premium is 20% off making charges for life, with no free delivery', () => {
  assert(app.includes('20% off making charges</b> on every Shivaa jewellery purchase, for life'), 'premium copy on the card');
  assert(api.includes("'premiumCode' =>"), 'premium code on the account');
  assert(!/if \(!empty\(\$u\) && !empty\(\$u\['premium'\]\)\) \$shipping = 0;/.test(api), 'premium still waives delivery');
  assert(api.includes("'black-card/delivery'"), 'delivery route');
});

test('C02', 'the checkout reads the making-charge shape the server returns', () => {
  assert(app.includes("c.type === 'making_percent'"), 'client reads making_percent');
  assert(api.includes("$c['type'] = 'making_percent'"), 'server returns making_percent');
  assert(api.includes("$b['makingAmount']"), 'server accepts makingAmount');
  assert(api.includes("'makingChargeDiscount' =>"), 'order records the making-charge discount');
});

test('C03', 'the account payload carries the card only for its bound mobile', () => {
  assert(/'blackCard' => \$card \? black_card_public\(\$card\) : null/.test(api), 'blackCard in pub_user');
  assert(/black_card_bound_to_user\(\$card, \$u\)\) \$card = null/.test(api), 'bound check');
});

console.log(`v199-check: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
