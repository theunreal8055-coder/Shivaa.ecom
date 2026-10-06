/* v185 — executed PHP 8.3 regressions for the card-authoritative coupon model.
   Real cms/api.php, isolated WASM filesystem; no repository/live data writes. */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER } = require('./php-api-fixture');
let pass = 0, fail = 0;
const OTHER = 'qa185other';
const address = { name:'QA Member', phone:'9876500002', line:'1 Fixture Street', city:'Jaipur', state:'Rajasthan', pincode:'302001', country:'India' };
setTimeout(() => { console.error('v185 PHP harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, fn) {
  try { await fn(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.stack || e.message}`); }
}
function fresh() {
  const db = seed();
  db.users.push({ id:'qaOther', role:'customer', name:'QA Other', phone:'9876500003', email:'other@qa.invalid', addresses:[], wishlist:[], loyaltyPoints:0 });
  db.tokens[OTHER] = { userId:'qaOther', exp:Math.floor(Date.now()/1000)+86400 };
  return db;
}
(async () => {
  const F = await fixture();
  async function claimed() {
    F.setDb(fresh());
    const r = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(r.status, 200, r.body); assert.equal(r.json.created, true);
    return r.json.membership;
  }

  await test('P01', 'release 185+ reports one matched shell/index/app/API handshake', async () => {
    F.setDb(fresh());
    const r = await F.req('GET', 'version');
    assert.equal(r.status, 200); assert.ok(r.json.rel >= 185);
    assert.equal(r.json.shell, 'shivaa-shell-v' + r.json.rel);
    assert.deepEqual([r.json.stamp.index,r.json.stamp.app,r.json.stamp.sw],[r.json.rel,r.json.rel,r.json.rel]);
    assert.equal(r.json.stamp.matched, true);
  });

  await test('P02', 'immutable card overrides every drifted Black coupon term', async () => {
    const card = await claimed();
    const db = await F.db(), c = db.coupons.find(x => x.id === card.couponId);
    Object.assign(c, { kind:'public-promo', type:'percent', basis:'subtotal', value:99, minOrder:999999,
      active:false, expiresAt:'2099-12-31T23:59:59+05:30', forUser:'qaOther', forPhoneHash:'bad',
      serverOwned:false, oncePerUser:true, forNewUsers:true, title:'drifted' });
    F.setDb(db);
    const preview = await F.req('POST', 'coupons/validate', { code:card.cardNumber.replace(/\s/g,''), amount:100000, makingAmount:15000 }, MEMBER);
    assert.equal(preview.status, 200, preview.body);
    assert.equal(preview.json.kind, 'shivaa-black'); assert.equal(preview.json.type, 'making_percent');
    assert.equal(preview.json.value, 20); assert.equal(preview.json.discount, 3000);
    assert.equal(preview.json.expiresAt, card.expiresAt); assert.equal(preview.json.forPhoneHash, undefined);
    const other = await F.req('POST', 'coupons/validate', { code:card.cardNumber, amount:100000, makingAmount:15000 }, OTHER);
    assert.equal(other.status, 404, 'a drifted kind can never turn a member number public');
    const anon = await F.req('GET', 'coupons');
    assert.ok(!(anon.json.coupons || []).some(x => x.id === card.couponId), 'reserved drift row hidden from public list');
    const mine = await F.req('GET', 'coupons', {}, MEMBER);
    const black = mine.json.coupons.filter(x => x.id === card.couponId);
    assert.equal(black.length, 1); assert.equal(black[0].type, 'making_percent'); assert.equal(black[0].value, 20);
  });

  await test('P03', 'repeat claim repairs every server-owned coupon field idempotently', async () => {
    const card = await claimed();
    const db = await F.db(), c = db.coupons.find(x => x.id === card.couponId);
    Object.assign(c, { code:'BROKEN', kind:'promo', type:'flat', basis:'subtotal', value:1, minOrder:999,
      active:false, expiresAt:'2099-01-01', forUser:'qaOther', forPhoneHash:'x', memberId:'x',
      certificateNo:'x', createdAt:'2000-01-01', serverOwned:false, oncePerUser:true, forNewUsers:true });
    db.coupons.push({ ...c, id:'owned-duplicate', code:card.couponCode, kind:'shivaa-black', forUser:'qaMember' });
    F.setDb(db);
    const repair = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(repair.status, 200, repair.body); assert.equal(repair.json.created, false);
    const repairedDb = await F.db(), fixed = repairedDb.coupons.find(x => x.id === card.couponId);
    assert.equal(fixed.code, card.couponCode); assert.equal(fixed.kind, 'shivaa-black');
    assert.equal(fixed.type, 'making_percent'); assert.equal(fixed.basis, 'makingCharge'); assert.equal(fixed.value, 20);
    assert.equal(fixed.minOrder, 0); assert.equal(fixed.active, true); assert.equal(fixed.expiresAt, card.expiresAt);
    assert.equal(fixed.forUser, 'qaMember'); assert.match(fixed.forPhoneHash, /^[a-f0-9]{64}$/);
    assert.equal(fixed.memberId, card.memberId); assert.equal(fixed.certificateNo, card.certificateNo);
    assert.equal(fixed.serverOwned, true); assert.equal(fixed.oncePerUser, false); assert.equal(fixed.forNewUsers, false);
    assert.equal(repairedDb.coupons.filter(x => String(x.code).replace(/\s/g,'') === card.couponCode.replace(/\s/g,'')).length, 1, 'owned duplicate collapsed');
    const auditCount = repairedDb.auditLog.filter(x => x.what === 'black-card.claim').length;
    const again = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(again.status, 200); assert.equal(again.json.created, false);
    const finalDb = await F.db();
    assert.deepEqual(finalDb.coupons.find(x => x.id === card.couponId), fixed);
    assert.equal(finalDb.auditLog.filter(x => x.what === 'black-card.claim').length, auditCount, 'repair never re-issues/audits a claim');
  });

  await test('P04', 'missing coupon row cannot strand checkout and repeat claim restores it', async () => {
    const card = await claimed();
    const db = await F.db(); db.coupons = db.coupons.filter(x => x.id !== card.couponId); F.setDb(db);
    const preview = await F.req('POST', 'coupons/validate', { code:card.couponCode, amount:100000, makingAmount:10000 }, MEMBER);
    assert.equal(preview.status, 200); assert.equal(preview.json.discount, 2000);
    const p = db.products.find(x => x.active && Number(x.mcValue)>0) || db.products.find(x => x.active);
    const order = await F.req('POST', 'orders', { items:[{id:p.id,qty:2}], address, paymentMethod:'WhatsApp', coupon:card.cardNumber, usePoints:false }, MEMBER);
    assert.equal(order.status, 200, order.body);
    const basis = order.json.items.reduce((n,it)=>n + Number(it.makingCharge)*Number(it.qty),0);
    assert.equal(order.json.makingChargeDiscount, Math.round(basis*.2));
    const restore = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(restore.status, 200); assert.equal(restore.json.created, false);
    const done = await F.db(); assert.equal(done.coupons.filter(x => x.id === card.couponId).length, 1);
  });

  await test('P05', 'empty-normalized mobiles fail closed instead of comparing equal', async () => {
    const card = await claimed();
    const db = await F.db(), u = db.users.find(x => x.id === 'qaMember');
    u.phone = 'invalid'; u.blackCard.mobile = ''; F.setDb(db);
    assert.equal((await F.req('GET', 'black-card', {}, MEMBER)).status, 403);
    const me = await F.req('GET', 'auth/me', {}, MEMBER); assert.equal(me.status, 200); assert.equal(me.json.user.blackCard, null);
    assert.equal((await F.req('POST', 'coupons/validate', { code:card.cardNumber, amount:100000, makingAmount:10000 }, MEMBER)).status, 404);
    const claim = await F.req('POST', 'black-card/claim', {}, MEMBER); assert.equal(claim.status, 400); assert.match(claim.json.error, /valid registered/i);
  });

  await test('P06', 'mobile mismatch defeats a perfectly formed mirror coupon', async () => {
    const card = await claimed();
    const db = await F.db(), u = db.users.find(x => x.id === 'qaMember');
    u.phone = '9876500099';
    const c = db.coupons.find(x => x.id === card.couponId);
    c.forPhoneHash = 'not-used-as-an-escape-hatch'; c.active = true; c.expiresAt = '2099-12-31T23:59:59+05:30';
    F.setDb(db);
    assert.equal((await F.req('GET', 'black-card', {}, MEMBER)).status, 403);
    assert.equal((await F.req('POST', 'coupons/validate', { code:card.cardNumber, amount:100000, makingAmount:10000 }, MEMBER)).status, 404);
    const p = db.products.find(x => x.active);
    const order = await F.req('POST', 'orders', { items:[{id:p.id,qty:1}], address:{...address,phone:'9876500099'}, paymentMethod:'WhatsApp', coupon:card.cardNumber }, MEMBER);
    assert.equal(order.status, 400); assert.match(order.json.error, /mobile\/account/i);
  });

  await test('P07', 'card expiry beats a future-dated active mirror while documents remain', async () => {
    const card = await claimed();
    const db = await F.db(), u = db.users.find(x => x.id === 'qaMember'), c = db.coupons.find(x => x.id === card.couponId);
    u.blackCard.expiresAt = '2020-01-01T00:00:00+05:30';
    c.active = true; c.expiresAt = '2099-12-31T23:59:59+05:30'; c.value = 80;
    F.setDb(db);
    const get = await F.req('GET', 'black-card', {}, MEMBER);
    assert.equal(get.status, 200); assert.equal(get.json.membership.status, 'expired'); assert.equal(get.json.membership.permanentRecord, true);
    assert.equal(get.json.membership.certificateNo, card.certificateNo);
    assert.equal((await F.req('POST', 'coupons/validate', { code:card.cardNumber, amount:100000, makingAmount:10000 }, MEMBER)).status, 404);
    const list = await F.req('GET', 'coupons', {}, MEMBER); assert.ok(!list.json.coupons.some(x => x.id === card.couponId));
    const reclaim = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(reclaim.status, 200); assert.equal(reclaim.json.membership.expiresAt, '2020-01-01T00:00:00+05:30');
    const after = await F.db(); assert.equal(after.coupons.find(x => x.id === card.couponId).expiresAt, '2020-01-01T00:00:00+05:30');
  });

  await test('P08', 'programme terms in public card output stay canonical', async () => {
    const card = await claimed();
    const db = await F.db(), u = db.users.find(x => x.id === 'qaMember');
    u.blackCard.program = 'Changed'; u.blackCard.discountPct = 95; u.blackCard.discountBasis = 'whole-order'; u.blackCard.certificateTitle = 'Changed';
    F.setDb(db);
    const get = await F.req('GET', 'black-card', {}, MEMBER);
    assert.equal(get.status, 200); assert.equal(get.json.membership.program, 'Shivaa Black');
    assert.equal(get.json.membership.discountPct, 20); assert.equal(get.json.membership.discountBasis, 'making-charges');
    assert.equal(get.json.membership.certificateTitle, 'Shivaa Family Prestigious Member');
    const preview = await F.req('POST', 'coupons/validate', { code:card.cardNumber, amount:100000, makingAmount:5000 }, MEMBER);
    assert.equal(preview.status, 200); assert.equal(preview.json.discount, 1000); assert.equal(preview.json.value, 20);
  });

  await test('P09', 'claim writes are account-throttled without locking the permanent archive', async () => {
    F.setDb(fresh());
    let card;
    for (let i=0; i<12; i++) {
      const r = await F.req('POST', 'black-card/claim', {}, MEMBER);
      assert.equal(r.status, 200, `allowed claim ${i+1}: ${r.body}`);
      assert.equal(r.json.created, i === 0);
      card = r.json.membership;
    }
    const blocked = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(blocked.status, 429, blocked.body); assert.match(blocked.json.error, /wait 15 minutes/i);
    assert.ok(Number(blocked.json.retryAfter) > 0 && Number(blocked.json.retryAfter) <= 900);
    const db = await F.db(), user = db.users.find(x => x.id === 'qaMember');
    assert.equal(user.blackCard.cardNumber, card.cardNumber, 'throttle never remints the identity');
    assert.equal(db.coupons.filter(x => x.id === card.couponId).length, 1, 'throttle never duplicates the coupon');
    assert.ok(Number(db.rateLimit['black-card-claim|qaMember'].until) > Math.floor(Date.now()/1000));
    const archive = await F.req('GET', 'black-card', {}, MEMBER);
    assert.equal(archive.status, 200); assert.equal(archive.json.membership.cardNumber, card.cardNumber);
  });

  console.log(`\nv185 PHP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(1); });
