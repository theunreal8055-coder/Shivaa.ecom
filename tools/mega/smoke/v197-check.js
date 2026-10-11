/* v197 — Shivaa Black must be visible on the home MAIN hero, the footer and the side
   menu. Static checks on the cms/ tree, then a jsdom run of the real module: every
   slot is drawn for a guest and for a member, and a slot added later is drawn too. */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { JSDOM } = require('jsdom');
const CMS = path.join(__dirname, '..', '..', '..', 'cms');
const rd = p => fs.readFileSync(path.join(CMS, p), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), api = rd('api.php'), app = rd('js/app.js');
const black = rd('js/v195-black.js');
let pass = 0, fail = 0;
const later = []; // async tests
function test(id, name, fn) {
  try { fn(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}
function testAsync(id, name, fn) { later.push(async () => {
  try { await fn(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}); }

test('A01', 'release 197 in lockstep across the stamp sites', () => {
  assert.ok(index.includes('__SHIVAA_REL=197'));
  assert.ok(app.includes('const APP_REL = 197;'));
  assert.ok(api.includes("'rel'   => 197,"));
  assert.ok(sw.includes('const REL = 197;') && sw.includes('shivaa-shell-v197'));
});
test('A02', 'v197 stylesheet is linked last and precached; the module is linked', () => {
  const links = [...index.matchAll(/href="\/css\/([^"]+)"/g)].map(m => m[1]);
  assert.equal(links[links.length - 1], 'v197.css?v=197');
  assert.ok(sw.includes("'/css/v197.css?v=197'"));
  assert.ok(index.includes('<script src="/js/v195-black.js?v=197" defer></script>'));
});
test('B01', 'the MAIN hero slot sits inside the hero copy, after the call to action', () => {
  const hero = app.indexOf('<section class="hero">');
  const slot = app.indexOf('data-black-hero="hero"');
  const cta = app.indexOf('Win 10g Gold Biscuit', hero);
  assert.ok(hero > 0 && slot > cta && cta > hero, 'slot is in the hero, after the CTA');
  assert.ok(slot - hero < 9000, 'slot is inside the hero block');
});
test('B02', 'the footer has a black slot, above its offer strip', () => {
  const foot = index.indexOf('class="footer fv101"');
  const slot = index.indexOf('data-black-hero="foot"');
  const offer = index.indexOf('data-banner-offer="compact"', foot);
  assert.ok(foot > 0 && slot > foot && slot < offer, 'footer slot exists');
});
test('B03', 'the side menu has a black slot', () => {
  const side = index.indexOf('id="mainNav"');
  const slot = index.indexOf('data-black-hero="side"');
  assert.ok(side > 0 && slot > side, 'side slot inside the menu');
});
test('B04', 'the old full-width block under the hero is gone (no duplicate)', () => {
  assert.ok(!app.includes('v195-bh-wrap" data-black-hero'), 'old wrapper removed');
});
test('C01', 'the module parses', () => { new vm.Script(black, { filename: 'v195-black.js' }); });

testAsync('D01', 'every slot is drawn for a GUEST: hero strip, footer strip, side strip, the big panel', async () => {
  const dom = new JSDOM('<!doctype html><body><div id="view"><div data-black-hero="hero" hidden></div></div>' +
    '<footer><div data-black-hero="foot" hidden></div></footer><nav><div data-black-hero="side" hidden></div></nav>' +
    '<section data-black-hero="home" hidden></section></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.state = { user: null };
  w.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  w.toast = () => {}; w.api = async () => ({});
  w.eval(black);
  await w.ShivaaBlack.fill(w.document);
  await new Promise(r => setTimeout(r, 30));
  for (const k of ['hero', 'foot', 'side']) {
    const el = w.document.querySelector(`[data-black-hero="${k}"]`);
    assert.equal(el.hidden, false, k + ' shown');
    assert.match(el.innerHTML, /Shivaa Black/, k + ' has the card');
    assert.match(el.innerHTML, /20% off making charges/, k + ' states the offer');
    assert.match(el.innerHTML, /Claim free/, k + ' has the guest call to action');
  }
  const home = w.document.querySelector('[data-black-hero="home"]');
  assert.match(home.innerHTML, /Claim your free card/, 'the full panel too');
});
testAsync('D02', 'a MEMBER sees "View my card" and the state, in every slot', async () => {
  const dom = new JSDOM('<!doctype html><body><div data-black-hero="hero" hidden></div><footer><div data-black-hero="foot" hidden></div></footer></body>',
    { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.state = { user: { id: 'm1', name: 'Member', phone: '9876500002' } };
  w.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  w.toast = () => {};
  w.api = async (p) => (p === '/api/black-card' ? { membership: { benefitActive: true, expiresAt: '2027-04-11T00:00:00+05:30', cardNumber: '2020 1482 1794 8837', holderName: 'M', memberId: 'SBM', certificateNo: 'SFP', delivery: null } } : {});
  w.eval(black);
  await w.ShivaaBlack.fill(w.document);
  await new Promise(r => setTimeout(r, 30));
  for (const k of ['hero', 'foot']) {
    const el = w.document.querySelector(`[data-black-hero="${k}"]`);
    assert.match(el.innerHTML, /Your card is active/, k + ' says active');
    assert.match(el.innerHTML, /View my card/, k + ' links to the card');
  }
  assert.ok(!w.document.body.innerHTML.includes('1482 1794'), 'the full number never leaks to the strips');
});
testAsync('D03', 'a slot added AFTER start-up is drawn by the observer (home renders late)', async () => {
  const dom = new JSDOM('<!doctype html><body><div id="view"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.state = { user: null };
  w.esc = s => String(s ?? '');
  w.toast = () => {}; w.api = async () => ({});
  w.eval(black);
  await new Promise(r => setTimeout(r, 30));
  const late = w.document.createElement('div');
  late.setAttribute('data-black-hero', 'hero'); late.hidden = true;
  w.document.getElementById('view').appendChild(late);
  await new Promise(r => setTimeout(r, 120));
  assert.equal(late.hidden, false, 'late slot shown');
  assert.match(late.innerHTML, /Shivaa Black/);
});

(async () => {
  for (const t of later) await t();
  console.log(`v197-check: ${pass} passed${fail ? `, ${fail} FAILED` : ''}`);
  process.exit(fail ? 1 : 0);
})();
