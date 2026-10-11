/* v198 — Shivaa Black restored from the uploaded v186 line and checked on the current tree.
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

test('A01', 'release stamp 198 everywhere', () => {
  assert(/const APP_REL = 198;/.test(app), 'APP_REL');
  assert(/__SHIVAA_REL=198/.test(index), 'index stamp');
  assert(/const REL = 198;/.test(sw) && /shivaa-shell-v198/.test(sw), 'sw stamp');
  assert(/'rel'\s*=>\s*198/.test(api), 'api rel');
});

test('A02', 'no v195 / v197 Black layers left wired in', () => {
  assert(!/v195-black/.test(index + app + sw), 'v195-black still referenced');
  assert(!/v197-(side|foot)-slot|data-black-hero/.test(index + app), 'v197 slots still present');
  assert(!/v195\.css|v197\.css/.test(index + sw), 'v195/v197 css still linked');
  assert(!fs.existsSync(path.join(CMS, 'js/v195-black.js')), 'v195-black.js still in tree');
});

test('A03', 'the restored Black stylesheets are linked and precached', () => {
  for (const c of ['v184', 'v185', 'v186']) {
    assert(index.includes(`/css/${c}.css?v=198`), `${c}.css not linked`);
    assert(sw.includes(`/css/${c}.css?v=198`), `${c}.css not precached`);
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

test('C01', 'the claim asks for the delivery address and sends it', () => {
  assert(app.includes('function blackAddressFormHTML()'), 'address form');
  assert(app.includes("api('/api/black-card/claim', { method: 'POST', body: JSON.stringify(payload) })"), 'payload body');
  assert(/Add your delivery address so we can post your physical card free/.test(app), 'missing-address message');
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

console.log(`v198-check: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
