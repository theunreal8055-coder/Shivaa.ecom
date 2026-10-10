/* v184 — Amrita ji's page + the coupon-scope money fix, executed against real PHP.
   These are the assertions a parser cannot make: they place orders, mint cards and
   switch the page off, and read back what the server actually wrote. */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v184 PHP harness deadline exceeded'); process.exit(1); }, 600000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }
const addr = { name: 'QA Buyer', phone: '9876500002', line: 'QA fixture street', city: 'QA City', state: 'Rajasthan', pincode: '302001' };

(async () => {
  const F = await fixture();
  const cart = db => [{ id: db.products[0].id, qty: 2 }];

  /* ── the money fix ─────────────────────────────────────────────────── */
  await test('C01', 'a making-scoped percent coupon discounts ONLY the making charges', async () => {
    const db = seed(); await F.setDb(db);
    const base = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online' }, MEMBER);
    assert.equal(base.status, 200, base.body);
    const sub = base.json.subtotal;
    const mk = base.json.items.reduce((a, i) => a + i.makingCharge * i.qty, 0);
    assert.ok(sub > 0 && mk > 0 && mk < sub, 'fixture must have a real metal+making split');

    const whole = seed(); whole.coupons = [{ id: 'cW', code: 'WHOLE20', type: 'percent', value: 20, minOrder: 0, active: true }];
    await F.setDb(whole);
    const w = await F.req('POST', 'orders', { items: cart(whole), address: addr, paymentMethod: 'Online', coupon: 'WHOLE20' }, MEMBER);
    assert.equal(w.status, 200, w.body);
    assert.equal(w.json.discount, Math.round(sub * 0.2), 'whole-order coupon must slice the whole order');
    assert.equal(w.json.couponScope, 'all');

    const mk20 = seed(); mk20.coupons = [{ id: 'cM', code: 'MAKE20', type: 'percent', value: 20, minOrder: 0, active: true, scope: 'making' }];
    await F.setDb(mk20);
    const m = await F.req('POST', 'orders', { items: cart(mk20), address: addr, paymentMethod: 'Online', coupon: 'MAKE20' }, MEMBER);
    assert.equal(m.status, 200, m.body);
    assert.equal(m.json.couponScope, 'making');
    assert.equal(m.json.discount, Math.round(mk * 0.2), 'making coupon must slice the making charges only');
    assert.ok(m.json.discount < w.json.discount, 'a making coupon must never cost the shop more than a whole-order one');
    // the customer really is charged the smaller amount
    assert.equal(m.json.total, base.json.total - Math.round(mk * 0.2), 'the charged total must reflect the scoped discount');
  });

  await test('C02', 'the checkout preview and the order route agree on the number', async () => {
    const db = seed(); await F.setDb(db);
    const base = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online' }, MEMBER);
    const mk = base.json.items.reduce((a, i) => a + i.makingCharge * i.qty, 0);
    db.coupons = [{ id: 'cM', code: 'MAKE20', type: 'percent', value: 20, minOrder: 0, active: true, scope: 'making' }];
    await F.setDb(db);
    const prev = await F.req('POST', 'coupons/validate', { code: 'MAKE20', amount: base.json.subtotal, makingTotal: mk }, MEMBER);
    assert.equal(prev.status, 200, prev.body);
    assert.equal(prev.json.discount, Math.round(mk * 0.2), 'preview must use the server arithmetic');
    assert.equal(prev.json.scope, 'making');
    const order = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online', coupon: 'MAKE20' }, MEMBER);
    assert.equal(order.json.discount, prev.json.discount, 'the preview promised more than the order gives');
  });

  await test('C03', 'a coupon with no scope key keeps its old whole-order behaviour', async () => {
    const db = seed(); db.coupons = [{ id: 'cL', code: 'LEGACY5', type: 'percent', value: 5, minOrder: 0, active: true }];
    await F.setDb(db);
    const base = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online' }, MEMBER);
    const sub = base.json.subtotal;
    const r = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online', coupon: 'LEGACY5' }, MEMBER);
    assert.equal(r.json.discount, Math.round(sub * 0.05), 'a pre-v184 coupon must not change behaviour');
    assert.equal(r.json.couponScope, 'all');
  });

  await test('C04', 'a making-scoped coupon on a bag with no making charges saves nothing, and says so', async () => {
    const db = seed(); db.coupons = [{ id: 'cM', code: 'MAKE20', type: 'percent', value: 20, minOrder: 0, active: true, scope: 'making' }];
    await F.setDb(db);
    const r = await F.req('POST', 'coupons/validate', { code: 'MAKE20', amount: 100000, makingTotal: 0 }, MEMBER);
    assert.equal(r.status, 400, r.body);
    assert.ok(/making charges/i.test(r.json.error), 'the refusal must explain itself: ' + r.json.error);
  });

  await test('C05', 'a making-scoped flat coupon is clamped to the making charges', async () => {
    const db = seed(); db.coupons = [{ id: 'cF', code: 'FLAT99K', type: 'flat', value: 99000, minOrder: 0, active: true, scope: 'making' }];
    await F.setDb(db);
    const base = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online' }, MEMBER);
    const mk = base.json.items.reduce((a, i) => a + i.makingCharge * i.qty, 0);
    const r = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online', coupon: 'FLAT99K' }, MEMBER);
    assert.equal(r.json.discount, mk, 'a flat coupon may never exceed the base it is scoped to');
    assert.ok(r.json.total > 0, 'the order must never go negative');
  });

  /* ── the page's server half ────────────────────────────────────────── */
  await test('C06', 'the switch is OFF by default — the page is dark until the owner says yes', async () => {
    const db = seed(); await F.setDb(db);   // seed() sets no amritaPage
    const r = await F.req('POST', 'amrita/card', { phone: '9876500002', name: 'Amrita', stars: 5, dish: 'idli' }, MEMBER);
    assert.equal(r.status, 404, r.body);
    assert.equal((await F.db()).coupons.length, 0, 'no coupon may be minted while the page is off');
    assert.equal((await F.db()).amritaGuests, undefined, 'no guest record may be written while the page is off');
  });

  await test('C07', 'a verified guest gets a system-allotted card for 20% off making charges', async () => {
    const db = seed(); db.settings.amritaPage = true; await F.setDb(db);
    const r = await F.req('POST', 'amrita/card', { phone: '9876500002', name: 'Amrita', stars: 5, dish: 'paneer' }, MEMBER);
    assert.equal(r.status, 200, r.body);
    assert.match(r.json.card, /^AMR-[A-Z2-9]{4}-[A-Z2-9]{4}$/, 'card shape: ' + r.json.card);
    assert.equal(r.json.already, false);
    assert.equal(r.json.dish.title, 'Paneer Butter Masala');
    const after = await F.db();
    const c = after.coupons[0];
    assert.equal(c.code, r.json.card);
    assert.equal(c.type, 'percent'); assert.equal(c.value, 20);
    assert.equal(c.scope, 'making', 'the card MUST be scoped to making charges — a percent coupon without it takes 20% of the metal too');
    assert.equal(c.active, true);
    assert.equal(c.oncePerUser, true); assert.equal(c.forUser, 'qaMember');
    assert.equal(c.minOrder, 0);
    const g = after.amritaGuests[0];
    assert.equal(g.userId, 'qaMember'); assert.equal(g.name, 'Amrita');
    assert.equal(g.phone, '9876500002'); assert.equal(g.stars, 5); assert.equal(g.dish, 'paneer');
    assert.equal(g.cardCode, r.json.card);
    assert.equal((after.auditLog || []).filter(a => a.what === 'amrita.card.issued').length, 1, 'issuance is not audited');
  });

  await test('C08', 'the card really works at checkout and really only takes the making charges', async () => {
    const db = seed(); db.settings.amritaPage = true; await F.setDb(db);
    const card = await F.req('POST', 'amrita/card', { phone: '9876500002', name: 'Amrita', stars: 5, dish: 'idli' }, MEMBER);
    assert.equal(card.status, 200, card.body);
    const base = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online' }, MEMBER);
    const mk = base.json.items.reduce((a, i) => a + i.makingCharge * i.qty, 0);
    const used = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online', coupon: card.json.card }, MEMBER);
    assert.equal(used.status, 200, used.body);
    assert.equal(used.json.coupon, card.json.card);
    assert.equal(used.json.couponScope, 'making');
    assert.equal(used.json.discount, Math.round(mk * 0.2), 'her card must not touch the metal');
  });

  await test('C09', 'a refresh or a re-tap never mints a second card for the same person', async () => {
    const db = seed(); db.settings.amritaPage = true; await F.setDb(db);
    const first = await F.req('POST', 'amrita/card', { phone: '9876500002', name: 'Amrita', stars: 5, dish: 'idli' }, MEMBER);
    const second = await F.req('POST', 'amrita/card', { phone: '9876500002', name: 'Amrita', stars: 4, dish: 'dosa' }, MEMBER);
    assert.equal(second.status, 200, second.body);
    assert.equal(second.json.card, first.json.card, 'a second, different card was minted');
    assert.equal(second.json.already, true);
    const after = await F.db();
    assert.equal(after.coupons.length, 1, 'more than one coupon was created');
    assert.equal(after.amritaGuests.length, 1, 'more than one guest record was created');
    assert.equal(after.amritaGuests[0].stars, 5, 'the first answer was overwritten');
  });

  await test('C10', 'the card is single-use and personal to her account', async () => {
    const db = seed(); db.settings.amritaPage = true; await F.setDb(db);
    const card = await F.req('POST', 'amrita/card', { phone: '9876500002', name: 'Amrita', stars: 5, dish: 'idli' }, MEMBER);
    const items = cart(db);
    await F.req('POST', 'orders', { items, address: addr, paymentMethod: 'Online', coupon: card.json.card }, MEMBER);
    const again = await F.req('POST', 'orders', { items, address: addr, paymentMethod: 'Online', coupon: card.json.card }, MEMBER);
    assert.equal(again.json.coupon, null, 'oncePerUser was not enforced server-side');
    assert.equal(again.json.discount, 0, 'the card paid out twice');
    // and it is hers: another account cannot use it
    const other = await F.req('POST', 'orders', { items, address: addr, paymentMethod: 'Online', coupon: card.json.card }, ADMIN);
    assert.equal(other.json.coupon, null, 'the card was not locked to her account');
  });

  await test('C11', 'the switch off closes the door immediately, and her details survive it', async () => {
    const db = seed(); db.settings.amritaPage = true; await F.setDb(db);
    const card = await F.req('POST', 'amrita/card', { phone: '9876500002', name: 'Amrita', stars: 5, dish: 'idli' }, MEMBER);
    assert.equal(card.status, 200, card.body);
    // the owner's one click
    const off = await F.req('PUT', 'settings', { amritaPage: false }, ADMIN);
    assert.equal(off.status, 200, off.body);
    const after = await F.db();
    assert.equal(after.settings.amritaPage, false, 'the switch did not save');
    // the page is gone…
    const blocked = await F.req('POST', 'amrita/card', { phone: '9876500002', name: 'Amrita', stars: 5, dish: 'dosa' }, MEMBER);
    assert.equal(blocked.status, 404, blocked.body);
    // …but everything she was given is still there
    assert.equal(after.amritaGuests.length, 1, 'her guest record was deleted with the page');
    assert.equal(after.amritaGuests[0].cardCode, card.json.card, 'her card code was lost');
    assert.equal(after.coupons.length, 1, 'her coupon was deleted with the page');
    assert.equal(after.coupons[0].active, true, 'her coupon was switched off with the page');
    // and the coupon she already has still works
    const used = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online', coupon: card.json.card }, MEMBER);
    assert.equal(used.json.coupon, card.json.card, 'her coupon stopped working when the page was removed');
  });

  await test('C12', 'a session for one number cannot mint a card addressed to another', async () => {
    const db = seed(); db.settings.amritaPage = true; await F.setDb(db);
    const r = await F.req('POST', 'amrita/card', { phone: '9876500009', name: 'Someone Else', stars: 5, dish: 'idli' }, MEMBER);
    assert.equal(r.status, 403, r.body);
    assert.equal((await F.db()).amritaGuests, undefined, 'a guest record was written for the wrong number');
  });

  await test('C13', 'the page refuses an incomplete journey instead of issuing a card anyway', async () => {
    const db = seed(); db.settings.amritaPage = true; await F.setDb(db);
    for (const [label, body] of [
      ['no rating', { phone: '9876500002', name: 'Amrita', stars: 0, dish: 'idli' }],
      ['rating out of range', { phone: '9876500002', name: 'Amrita', stars: 9, dish: 'idli' }],
      ['no dish', { phone: '9876500002', name: 'Amrita', stars: 5, dish: 'samosa' }],
      ['no name', { phone: '9876500002', name: '   ', stars: 5, dish: 'idli' }],
      ['no phone', { phone: '', name: 'Amrita', stars: 5, dish: 'idli' }],
      ['malformed phone', { phone: '12345', name: 'Amrita', stars: 5, dish: 'idli' }],
      ['landline-shaped phone', { phone: '1234567890', name: 'Amrita', stars: 5, dish: 'idli' }],
    ]) {
      const r = await F.req('POST', 'amrita/card', body, MEMBER);
      assert.equal(r.status, 400, label + ' was accepted: ' + r.body);
      assert.ok(r.json.error, label + ': no message for the guest');
    }
    assert.equal((await F.db()).amritaGuests, undefined, 'a partial journey wrote a guest record');
    assert.equal((await F.db()).coupons.length, 0, 'a partial journey minted a coupon');
  });

  await test('C14', 'the guest read-back is admin-only', async () => {
    const db = seed(); db.settings.amritaPage = true; await F.setDb(db);
    assert.equal((await F.req('GET', 'amrita/guest', {}, MEMBER)).status, 403, 'a customer can read the guest list');
    assert.equal((await F.req('GET', 'amrita/guest', {})).status, 403, 'an anonymous caller can read the guest list');
    const ok = await F.req('GET', 'amrita/guest', {}, ADMIN);
    assert.equal(ok.status, 200, ok.body);
    assert.deepEqual(ok.json.guests, []);
  });

  /* ── the owner's ability to fix the live over-discount ─────────────── */
  await test('C15', 'the owner can re-scope a coupon that promises making charges but takes the metal', async () => {
    /* This is the RAKHI20 shape: a live percent coupon whose note says
       "20% off making charges" with no scope — so it takes 20% of the metal
       as well. The edit route lets the owner correct it himself. */
    const db = seed();
    db.coupons = [{ id: 'cR', code: 'RAKHI20', type: 'percent', value: 20, minOrder: 0, active: true,
      note: 'Raksha Bandhan — 20% off making charges, till 28 Aug' }];
    await F.setDb(db);
    const before = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online', coupon: 'RAKHI20' }, MEMBER);
    const sub = before.json.subtotal;
    const mk = before.json.items.reduce((a, i) => a + i.makingCharge * i.qty, 0);
    assert.equal(before.json.discount, Math.round(sub * 0.2), 'fixture: the mis-scoped coupon discounts the whole order');

    const fixed = await F.req('PUT', 'coupons/cR', { scope: 'making' }, ADMIN);
    assert.equal(fixed.status, 200, fixed.body);
    assert.equal(fixed.json.coupon.scope, 'making');
    const after = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online', coupon: 'RAKHI20' }, MEMBER);
    assert.equal(after.json.discount, Math.round(mk * 0.2), 'the correction did not take effect');
    assert.equal((await F.db()).coupons[0].note, 'Raksha Bandhan — 20% off making charges, till 28 Aug',
      'the note (the owner\'s words) must never be rewritten by the fix');
    assert.equal((await F.db()).coupons[0].code, 'RAKHI20', 'the code must never change');
  });

  await test('C16', 'the coupon edit route refuses a bad scope, a bad value and a bad date', async () => {
    const db = seed(); db.coupons = [{ id: 'cX', code: 'X1', type: 'percent', value: 20, minOrder: 0, active: true }];
    await F.setDb(db);
    assert.equal((await F.req('PUT', 'coupons/cX', { value: 500 }, ADMIN)).status, 400, 'an impossible percent was accepted');
    assert.equal((await F.req('PUT', 'coupons/cX', { value: -5 }, ADMIN)).status, 400, 'a negative value was accepted');
    assert.equal((await F.req('PUT', 'coupons/cX', { expiresAt: 'not a date' }, ADMIN)).status, 400, 'a corrupt expiry was accepted');
    assert.equal((await F.req('PUT', 'coupons/cX', {}, ADMIN)).status, 400, 'an empty edit was accepted');
    assert.equal((await F.req('PUT', 'coupons/nope', { scope: 'making' }, ADMIN)).status, 404, 'an unknown coupon was edited');
    assert.equal((await F.req('PUT', 'coupons/cX', { scope: 'making' }, MEMBER)).status, 403, 'a customer can edit coupons');
    assert.equal((await F.req('PUT', 'coupons/cX', { scope: 'making' })).status, 403, 'an anonymous caller can edit coupons');
    const after = await F.db();
    assert.equal(after.coupons[0].scope || 'all', 'all', 'a refused edit still changed the coupon');
    assert.equal(after.coupons[0].value, 20, 'a refused edit still changed the value');
    // an unknown scope must fall back to 'all', never to something permissive
    const ok = await F.req('PUT', 'coupons/cX', { scope: 'nonsense' }, ADMIN);
    assert.equal(ok.status, 200, ok.body);
    assert.equal(ok.json.coupon.scope, 'all');
  });

  await test('C17', 'the Active checkbox in the coupons table now actually writes', async () => {
    const db = seed(); db.coupons = [{ id: 'cT', code: 'TOGGLE1', type: 'percent', value: 5, minOrder: 0, active: true }];
    await F.setDb(db);
    const off = await F.req('PUT', 'coupons/cT', { active: false }, ADMIN);
    assert.equal(off.status, 200, off.body);
    assert.equal((await F.db()).coupons[0].active, false);
    const dead = await F.req('POST', 'coupons/validate', { code: 'TOGGLE1', amount: 100000 }, MEMBER);
    assert.equal(dead.status, 404, 'a switched-off coupon still validates');
    const back = await F.req('PUT', 'coupons/cT', { active: true }, ADMIN);
    assert.equal(back.status, 200, back.body);
    assert.equal((await F.req('POST', 'coupons/validate', { code: 'TOGGLE1', amount: 100000 }, MEMBER)).status, 200);
    // the coupon can be addressed by code as well as by id
    assert.equal((await F.req('PUT', 'coupons/TOGGLE1', { active: false }, ADMIN)).status, 200, 'the code is not a valid handle');
    assert.equal((await F.db()).coupons[0].active, false);
    assert.equal(((await F.db()).auditLog || []).filter(a => a.what === 'coupon.updated').length, 3, 'edits are not audited');
  });

  await test('C18', 'amritaPage is a strict boolean — a typo cannot put the page live', async () => {
    const db = seed(); await F.setDb(db);
    assert.equal((await F.req('PUT', 'settings', { amritaPage: 'yes please' }, ADMIN)).status, 400, 'a truthy string was stored');
    assert.equal((await F.req('PUT', 'settings', { amritaPage: true }, ADMIN)).status, 200, 'a real true was refused');
    assert.equal((await F.db()).settings.amritaPage, true);
    assert.equal((await F.req('PUT', 'settings', { amritaPage: false }, ADMIN)).status, 200, 'a real false was refused');
    assert.equal((await F.db()).settings.amritaPage, false);
    // and it is visible to the storefront, which is how the page knows to render
    const pub = await F.req('GET', 'settings', {});
    assert.ok('amritaPage' in pub.json, 'the switch is not readable by the site');
  });

  console.log(`\nv184-php-run: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
