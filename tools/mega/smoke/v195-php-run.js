/* v195 — Shivaa Black executed against real PHP: the claim (with the delivery
   address), the one coupon lookup used by checkout, the member-only binding,
   expiry, and the order arithmetic (20% off the MAKING charges only). */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v195 PHP harness deadline exceeded'); process.exit(1); }, 600000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }
const addr = { name: 'QA Buyer', phone: '9876500002', line: 'QA fixture street', city: 'QA City', state: 'Rajasthan', pincode: '302001' };
const OTHER = 'qa195other';
const claimAddr = { name: 'QA Member', phone: '9876500002', line1: '12 Station Road', line2: 'Near Clock Tower',
  city: 'Jaipur', state: 'Rajasthan', pincode: '302001' };

(async () => {
  const F = await fixture();
  const withOther = db => {
    db.users.push({ id: 'qaOther', role: 'customer', name: 'QA Other', phone: '9876500003', email: 'o@qa.invalid', addresses: [], wishlist: [] });
    db.tokens[OTHER] = { userId: 'qaOther', exp: Math.floor(Date.now() / 1000) + 86400 };
    return db;
  };
  const cart = db => [{ id: db.products[0].id, qty: 2 }];

  let cardNo = '';
  await test('D01', 'a signed-in member with no card sees none yet', async () => {
    await F.setDb(withOther(seed()));
    const r = await F.req('GET', 'black-card', {}, MEMBER);
    assert.equal(r.status, 200, r.body);
    assert.equal(r.json.membership, null);
  });
  await test('D02', 'claiming with NO delivery address is refused (the last step needs it)', async () => {
    const r = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(r.status, 400, r.body);
    assert.match(r.json.error, /delivery address/i);
  });
  await test('D03', 'a bad PIN code or mobile is refused on the server', async () => {
    const bad1 = await F.req('POST', 'black-card/claim', { address: { ...claimAddr, pincode: '12' } }, MEMBER);
    assert.equal(bad1.status, 400, bad1.body);
    const bad2 = await F.req('POST', 'black-card/claim', { address: { ...claimAddr, phone: '12345' } }, MEMBER);
    assert.equal(bad2.status, 400, bad2.body);
  });
  await test('D04', 'a valid claim issues the card, ships it FREE, and the coupon is live', async () => {
    const r = await F.req('POST', 'black-card/claim', { address: claimAddr }, MEMBER);
    assert.equal(r.status, 200, r.body);
    assert.equal(r.json.created, true);
    const m = r.json.membership;
    assert.match(m.cardNumber, /^2020 \d{4} \d{4} \d{4}$/, 'a 2020-prefixed 16-digit code, grouped');
    assert.match(m.memberId, /^SBM-\d{4}-[0-9A-F]{8}$/);
    assert.equal(m.status, 'active');
    assert.equal(m.benefitActive, true);
    assert.equal(m.delivery.type, 'physical-card');
    assert.equal(m.delivery.fee, 0, 'the physical card is delivered free');
    assert.equal(m.delivery.address.pincode, '302001');
    const issued = new Date(m.issuedAt).getTime(), until = new Date(m.expiresAt).getTime();
    const days = (until - issued) / 86400000;
    assert.ok(days > 175 && days < 186, 'six months (about 180-184 days), got ' + days.toFixed(1));
    cardNo = m.cardNumber;
  });
  await test('D05', 'a second claim is idempotent: same card, nothing duplicated', async () => {
    const r = await F.req('POST', 'black-card/claim', { address: claimAddr }, MEMBER);
    assert.equal(r.status, 200, r.body);
    assert.equal(r.json.created, false);
    assert.equal(r.json.membership.cardNumber, cardNo);
    const db = await F.db();
    const holders = db.users.filter(u => u.blackCard);
    assert.equal(holders.length, 1, 'exactly one card in the database');
  });
  await test('D06', 'the member sees the card coupon in their coupon list; a guest does not', async () => {
    const mine = await F.req('GET', 'coupons', {}, MEMBER);
    assert.ok(mine.json.coupons.some(c => c.kind === 'shivaa-black' && c.code === cardNo), 'card coupon listed');
    const guest = await F.req('GET', 'coupons', {}, '');
    assert.ok(!guest.json.coupons.some(c => c.kind === 'shivaa-black'), 'guest never sees it');
  });
  await test('D07', 'checkout preview: the card number (typed with or without spaces) gives 20% of the MAKING charges', async () => {
    const db = await F.db();
    const base = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online' }, MEMBER);
    assert.equal(base.status, 200, base.body);
    const mk = base.json.items.reduce((a, i) => a + i.makingCharge * i.qty, 0);
    for (const typed of [cardNo, cardNo.replace(/\s/g, '')]) {
      const prev = await F.req('POST', 'coupons/validate', { code: typed, amount: base.json.subtotal, makingTotal: mk }, MEMBER);
      assert.equal(prev.status, 200, prev.body);
      assert.equal(prev.json.scope, 'making');
      assert.equal(prev.json.discount, Math.round(mk * 0.2), 'exactly 20% of the making charges');
    }
  });
  await test('D08', 'the order route charges the same 20% of the making charges', async () => {
    const db = await F.db();
    const base = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online' }, MEMBER);
    const mk = base.json.items.reduce((a, i) => a + i.makingCharge * i.qty, 0);
    const o = await F.req('POST', 'orders', { items: cart(db), address: addr, paymentMethod: 'Online', coupon: cardNo }, MEMBER);
    assert.equal(o.status, 200, o.body);
    assert.equal(o.json.couponScope, 'making');
    assert.equal(o.json.discount, Math.round(mk * 0.2));
    assert.equal(o.json.total, base.json.total - Math.round(mk * 0.2), 'the charged total reflects the discount');
  });
  await test('D09', 'a guest typing the card number gets nothing (the code is not public)', async () => {
    const db = await F.db();
    const r = await F.req('POST', 'coupons/validate', { code: cardNo, amount: 50000, makingTotal: 5000 }, '');
    assert.equal(r.status, 404, r.body);
  });
  await test('D10', 'another member cannot use someone else\'s card number', async () => {
    const r = await F.req('POST', 'coupons/validate', { code: cardNo, amount: 50000, makingTotal: 5000 }, OTHER);
    assert.equal(r.status, 404, 'a card number owned by another account must never resolve: ' + r.body);
  });
  await test('D11', 'a changed registered mobile makes the card unreadable (bound to the mobile)', async () => {
    const db = await F.db();
    db.users.forEach(u => { if (u.id === 'qaMember') u.phone = '9876500009'; });
    await F.setDb(db);
    const r = await F.req('GET', 'black-card', {}, MEMBER);
    assert.equal(r.status, 403, r.body);
    const v = await F.req('POST', 'coupons/validate', { code: cardNo, amount: 50000, makingTotal: 5000 }, MEMBER);
    assert.equal(v.status, 404, 'the coupon dies with the binding');
    const db2 = await F.db();
    db2.users.forEach(u => { if (u.id === 'qaMember') u.phone = '9876500002'; });
    await F.setDb(db2);
  });
  await test('D12', 'an expired card shows as expired and its coupon stops working', async () => {
    const db = await F.db();
    db.users.forEach(u => { if (u.id === 'qaMember' && u.blackCard) u.blackCard.expiresAt = '2020-01-01T00:00:00+05:30'; });
    await F.setDb(db);
    const g = await F.req('GET', 'black-card', {}, MEMBER);
    assert.equal(g.json.membership.status, 'expired');
    assert.equal(g.json.membership.benefitActive, false);
    const v = await F.req('POST', 'coupons/validate', { code: cardNo, amount: 50000, makingTotal: 5000 }, MEMBER);
    assert.equal(v.status, 404, v.body);
  });
  await test('D13', 'the public MAKING20 offer and ordinary coupons still work exactly as before', async () => {
    const db = seed(); db.coupons = [{ id: 'cM', code: 'MAKE20', type: 'percent', value: 20, minOrder: 0, active: true, scope: 'making' }];
    await F.setDb(db);
    const r = await F.req('POST', 'coupons/validate', { code: 'make20', amount: 50000, makingTotal: 5000 }, MEMBER);
    assert.equal(r.status, 200, r.body);
    assert.equal(r.json.discount, 1000);
  });
  await test('D14', 'a second claim cannot replace the card or its first address', async () => {
    await F.setDb(withOther(seed()));
    const first = await F.req('POST', 'black-card/claim', { address: claimAddr }, MEMBER);
    assert.equal(first.json.created, true, first.body);
    const r = await F.req('POST', 'black-card/claim', { address: { ...claimAddr, line1: 'Another street 99' } }, MEMBER);
    assert.equal(r.status, 200, r.body);
    assert.equal(r.json.created, false, 'an existing card is never replaced');
    assert.equal(r.json.membership.delivery.address.line1, '12 Station Road', 'the first address stays');
  });

  console.log(`\nv195-php-run: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('v195 harness crashed:', e); process.exit(1); });
