/* v195 — the Shivaa Black front end, executed in jsdom: the home hero for guests and
   members, the signed-out page, and the three claim steps (details → address → review).
   The server call is stubbed; the rules themselves are proved in v195-php-run.js. */
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const CMS = path.join(__dirname, '..', '..', '..', 'cms');
const code = fs.readFileSync(path.join(CMS, 'js/v195-black.js'), 'utf8');
let pass = 0, fail = 0;
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

function boot(user, apiImpl) {
  const dom = new JSDOM('<!doctype html><main id="view"></main>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.state = { user };
  w.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  w.toast = () => {};
  w.api = apiImpl;
  w.eval(code);
  return w;
}
const MEMBER = { id: 'qaMember', name: 'QA Member', phone: '9876500002' };
const card = { cardNumber: '2020 1482 1794 8837', holderName: 'QA MEMBER', memberId: 'SBM-2026-A9900592',
  certificateNo: 'SFP-2026-AAAA1111', issuedAt: '2026-10-11T22:10:21+05:30', expiresAt: '2027-04-11T22:10:21+05:30',
  benefitActive: true, status: 'active', delivery: { address: { line1: '12 Station Road', city: 'Jaipur', pincode: '302001' } } };
const flush = () => new Promise(r => setTimeout(r, 30));

(async () => {
  await test('E01', 'guest: the home hero shows the black card and a claim button, no member data', async () => {
    const w = boot(null, async () => { throw new Error('no api for guests'); });
    const slot = w.document.createElement('section'); slot.setAttribute('data-black-hero', ''); slot.hidden = true;
    w.document.getElementById('view').appendChild(slot);
    await w.ShivaaBlack.fill(w.document); await flush();
    assert.equal(slot.hidden, false, 'slot shown');
    assert.match(slot.innerHTML, /Shivaa Black/);
    assert.match(slot.innerHTML, /Claim your free card/);
    assert.match(slot.innerHTML, /20%/);
    assert.match(slot.innerHTML, /six months/i);
    assert.match(slot.innerHTML, /delivered free/i);
    assert.match(slot.innerHTML, /2020 •••• •••• ••••/, 'a placeholder, never a real number');
  });
  await test('E02', 'member with an active card: the hero shows the masked number and "View my card"', async () => {
    const w = boot(MEMBER, async (p) => (p === '/api/black-card' ? { membership: card } : {}));
    const slot = w.document.createElement('section'); slot.setAttribute('data-black-hero', ''); w.document.body.appendChild(slot);
    await w.ShivaaBlack.fill(w.document); await flush();
    assert.match(slot.innerHTML, /View my Shivaa Black card/);
    assert.match(slot.innerHTML, /•••• •••• •••• 8837/);
    assert.ok(!slot.innerHTML.includes('1482 1794'), 'the full number never appears on the home hero');
  });
  await test('E03', 'signed-out page: asks to sign in, no claim form', async () => {
    const w = boot(null, async () => ({}));
    const view = w.document.getElementById('view');
    await w.ShivaaBlack.page(view);
    assert.match(view.innerHTML, /Sign in/);
    assert.ok(!view.querySelector('form'));
  });
  await test('E04', 'signed-in, no card: the three-step claim, and Continue cannot skip the address', async () => {
    const w = boot(MEMBER, async (p) => (p === '/api/black-card' ? { membership: null } : {}));
    const view = w.document.getElementById('view');
    await w.ShivaaBlack.page(view); await flush();
    assert.ok(view.querySelector('form'), 'form shown');
    assert.match(view.innerHTML, /Your details/);
    assert.equal(view.querySelectorAll('.v195-steps li').length, 3);
    // step 1 → 2
    view.querySelector('#bkName').value = 'Q';
    view.querySelector('form').requestSubmit();
    await flush();
    assert.match(view.querySelector('.v195-msg').textContent, /name/i, 'a one-letter name is refused');
    view.querySelector('#bkName').value = 'QA Member';
    view.querySelector('form').requestSubmit(); await flush();
    assert.ok(view.querySelector('#bkLine1'), 'now on the address step');
    // step 2 with a bad PIN is refused
    view.querySelector('#bkLine1').value = '12 Station Road';
    view.querySelector('#bkCity').value = 'Jaipur';
    view.querySelector('#bkState').value = 'Rajasthan';
    view.querySelector('#bkPin').value = '12';
    view.querySelector('form').requestSubmit(); await flush();
    assert.match(view.querySelector('.v195-msg').textContent, /PIN/i);
    view.querySelector('#bkPin').value = '302001';
    view.querySelector('form').requestSubmit(); await flush();
    assert.ok(view.querySelector('#bkAgree'), 'a valid address moves on to the review step');
  });
  await test('E05', 'review step: the card is shown as delivered free, and the claim is sent with the address', async () => {
    let sent = null;
    const w = boot(MEMBER, async (p, o) => {
      if (p === '/api/black-card') return { membership: null };
      if (p === '/api/black-card/claim') { sent = JSON.parse(o.body); return { ok: true, created: true, membership: card, user: MEMBER }; }
      return {};
    });
    const view = w.document.getElementById('view');
    await w.ShivaaBlack.page(view); await flush();
    const go = async () => { view.querySelector('form').requestSubmit(); await flush(); };
    view.querySelector('#bkName').value = 'QA Member'; await go();
    view.querySelector('#bkLine1').value = '12 Station Road'; view.querySelector('#bkCity').value = 'Jaipur';
    view.querySelector('#bkState').value = 'Rajasthan'; view.querySelector('#bkPin').value = '302001';
    view.querySelector('#bkPhone').value = '9876500002'; await go();
    assert.match(view.innerHTML, /Delivered free/);
    assert.match(view.innerHTML, /six months/i);
    // the agree box must be ticked before the claim
    view.querySelector('form').requestSubmit(); await flush();
    assert.match(view.querySelector('.v195-msg').textContent, /tick the box/i);
    view.querySelector('#bkAgree').checked = true;
    view.querySelector('form').requestSubmit(); await flush();
    assert.ok(sent, 'claim sent');
    assert.equal(sent.address.pincode, '302001');
    assert.equal(sent.address.line1, '12 Station Road');
    assert.match(view.innerHTML, /Your membership card/, 'the member card page replaces the form');
    assert.match(view.innerHTML, /1482 1794 8837/);
  });
  await test('E06', 'a failed claim keeps the form and shows the server message', async () => {
    const w = boot(MEMBER, async (p) => {
      if (p === '/api/black-card') return { membership: null };
      throw new Error('Please enter a valid 6-digit PIN code.');
    });
    const view = w.document.getElementById('view');
    await w.ShivaaBlack.page(view); await flush();
    view.querySelector('#bkName').value = 'QA Member'; view.querySelector('form').requestSubmit(); await flush();
    view.querySelector('#bkLine1').value = '12 Station Road'; view.querySelector('#bkCity').value = 'Jaipur';
    view.querySelector('#bkState').value = 'Rajasthan'; view.querySelector('#bkPin').value = '302001';
    view.querySelector('#bkPhone').value = '9876500002'; view.querySelector('form').requestSubmit(); await flush();
    view.querySelector('#bkAgree').checked = true; view.querySelector('form').requestSubmit(); await flush();
    assert.match(view.querySelector('.v195-msg').textContent, /PIN/);
    assert.ok(view.querySelector('[data-bk-claim]') && !view.querySelector('[data-bk-claim]').disabled, 'button usable again');
  });
  console.log(`\nv195-dom-run: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
