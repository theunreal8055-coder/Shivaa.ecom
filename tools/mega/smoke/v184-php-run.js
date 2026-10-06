/* v184 — executed PHP 8.3 acceptance suite for Shivaa Black.
   Runs the real cms/api.php in the isolated php-wasm fixture. Repository and
   live customer data are never mounted or written. */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER, fn } = require('./php-api-fixture');
let pass = 0, fail = 0;
const OTHER = 'qa184other';
setTimeout(() => { console.error('v184 PHP harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, f) {
  try { await f(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.stack || e.message}`); }
}
function expectedSixMonthDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso); assert.ok(m, 'ISO issue date');
  let y = +m[1], mon = +m[2] - 1 + 6, day = +m[3];
  y += Math.floor(mon / 12); mon %= 12;
  day = Math.min(day, new Date(Date.UTC(y, mon + 1, 0)).getUTCDate());
  return `${y}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
const address = { name:'QA Member', phone:'9876500002', line:'1 Fixture Street', city:'Jaipur', state:'Rajasthan', pincode:'302001', country:'India' };

(async () => {
  const F = await fixture();
  const initial = seed();
  initial.users.push({ id:'qaOther', role:'customer', name:'QA Other', phone:'9876500003', email:'other@qa.invalid', addresses:[], wishlist:[], loyaltyPoints:0 });
  initial.tokens[OTHER] = { userId:'qaOther', exp:Math.floor(Date.now()/1000)+86400 };
  F.setDb(initial);
  let memberCard, otherCard;

  await test('P01', 'release 184+ reports a matched four-site handshake', async () => {
    const r = await F.req('GET', 'version');
    assert.equal(r.status, 200); assert.ok(r.json.rel >= 184);
    assert.deepEqual([r.json.stamp.index, r.json.stamp.app, r.json.stamp.sw], [r.json.rel,r.json.rel,r.json.rel]);
    assert.equal(r.json.stamp.matched, true);
  });

  await test('P02', 'claim/read doors are authenticated and retail-only', async () => {
    assert.equal((await F.req('GET', 'black-card')).status, 401);
    assert.equal((await F.req('POST', 'black-card/claim', {})).status, 401);
    const a = await F.req('POST', 'black-card/claim', {}, ADMIN);
    assert.equal(a.status, 403); assert.match(a.json.error, /retail/i);
    const db = await F.db();
    assert.equal(db.users.find(u=>u.id==='qaAdmin').blackCard, undefined);
    assert.equal(db.coupons.length, 0);
  });

  await test('P03', 'one atomic claim issues the personalised card, six-month identity coupon and permanent certificate', async () => {
    const r = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(r.status, 200); assert.equal(r.json.created, true);
    memberCard = r.json.membership;
    assert.equal(memberCard.program, 'Shivaa Black');
    assert.equal(memberCard.holderName, 'QA Member');
    assert.equal(memberCard.mobile, '9876500002');
    assert.equal(memberCard.discountPct, 20); assert.equal(memberCard.discountBasis, 'making-charges');
    assert.match(memberCard.cardNumber, /^\d{4}( \d{4}){3}$/);
    assert.equal(memberCard.couponCode, memberCard.cardNumber);
    assert.match(memberCard.memberId, /^SBM-\d{4}-[A-F0-9]{8}$/);
    assert.match(memberCard.certificateNo, /^SFP-\d{4}-[A-F0-9]{8}$/);
    assert.equal(memberCard.certificateTitle, 'Shivaa Family Prestigious Member');
    assert.equal(memberCard.permanentRecord, true); assert.equal(memberCard.status, 'active');
    assert.equal(memberCard.expiresAt.slice(0,10), expectedSixMonthDate(memberCard.issuedAt));
    assert.equal(memberCard.expiresAt.slice(11,19), memberCard.issuedAt.slice(11,19), 'same issue time');
    const edge = await F.run(`${fn('black_six_month_expiry')} echo json_encode([
      black_six_month_expiry('2026-08-31T17:42:11+05:30'),
      black_six_month_expiry('2027-08-31T17:42:11+05:30')
    ]);`);
    assert.deepEqual(edge.json.map(x=>x.slice(0,19)), ['2027-02-28T17:42:11','2028-02-29T17:42:11'], 'month-end clamp, including leap year');

    const db = await F.db();
    const u = db.users.find(x=>x.id==='qaMember');
    assert.deepEqual(u.blackCard, Object.fromEntries(Object.entries(memberCard).filter(([k]) => !['status','benefitActive','permanentRecord'].includes(k))));
    const c = db.coupons.find(x=>x.id===memberCard.couponId);
    assert.ok(c); assert.equal(c.type, 'making_percent'); assert.equal(c.value, 20); assert.equal(c.minOrder, 0);
    assert.equal(c.forUser, 'qaMember'); assert.match(c.forPhoneHash, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(c).includes('9876500002'), 'coupon binding does not duplicate raw mobile');
    assert.equal(c.expiresAt, memberCard.expiresAt); assert.equal(c.serverOwned, true);
    assert.equal(db.auditLog.filter(x=>x.what==='black-card.claim').length, 1);
  });

  await test('P04', 'claim is idempotent while a second retail account receives a unique number', async () => {
    const again = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(again.status, 200); assert.equal(again.json.created, false);
    assert.equal(again.json.membership.cardNumber, memberCard.cardNumber);
    assert.equal(again.json.membership.issuedAt, memberCard.issuedAt);
    assert.equal(again.json.membership.expiresAt, memberCard.expiresAt);
    const other = await F.req('POST', 'black-card/claim', {}, OTHER);
    assert.equal(other.status, 200); assert.equal(other.json.created, true); otherCard = other.json.membership;
    assert.notEqual(otherCard.cardNumber, memberCard.cardNumber);
    assert.notEqual(otherCard.memberId, memberCard.memberId);
    assert.notEqual(otherCard.certificateNo, memberCard.certificateNo);
    const db = await F.db();
    assert.equal(db.coupons.filter(c=>c.kind==='shivaa-black').length, 2);
    assert.equal(db.auditLog.filter(x=>x.what==='black-card.claim').length, 2);
  });

  await test('P05', 'card and code stay private to the account + bound registered mobile', async () => {
    const mine = await F.req('GET', 'black-card', {}, MEMBER);
    assert.equal(mine.status, 200); assert.equal(mine.json.membership.memberId, memberCard.memberId);
    const theirs = await F.req('GET', 'black-card', {}, OTHER);
    assert.equal(theirs.status, 200); assert.equal(theirs.json.membership.memberId, otherCard.memberId);
    assert.notEqual(theirs.json.membership.couponCode, memberCard.couponCode);
    const denied = await F.req('POST', 'coupons/validate', { code:memberCard.couponCode, amount:100000, makingAmount:15000 }, OTHER);
    assert.equal(denied.status, 404); assert.match(denied.json.error, /mobile\/account/i);
    const ok = await F.req('POST', 'coupons/validate', { code:memberCard.couponCode.replace(/\s/g,''), amount:100000, makingAmount:15000 }, MEMBER);
    assert.equal(ok.status, 200); assert.equal(ok.json.discount, 3000); assert.equal(ok.json.eligibleBasis, 15000);
    assert.equal(ok.json.discountBasis, 'making-charges'); assert.equal(ok.json.forPhoneHash, undefined);
    const anonList = await F.req('GET', 'coupons');
    assert.ok(!(anonList.json.coupons||[]).some(c=>c.kind==='shivaa-black'));
    const me = await F.req('GET', 'auth/me', {}, MEMBER);
    assert.equal(me.json.user.blackCard.memberId, memberCard.memberId);

    // Even the same account id must not reveal or rebind the record after its
    // registered mobile changes: both halves of the binding are mandatory.
    const changed = await F.db();
    changed.users.find(u=>u.id==='qaMember').phone = '9876500099';
    F.setDb(changed);
    assert.equal((await F.req('GET', 'black-card', {}, MEMBER)).status, 403);
    const changedMe = await F.req('GET', 'auth/me', {}, MEMBER);
    assert.equal(changedMe.json.user.blackCard, null);
    const rebind = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(rebind.status, 409); assert.equal(rebind.json.membership, undefined);
    assert.equal((await F.req('POST', 'coupons/validate', { code:memberCard.couponCode, amount:100000, makingAmount:15000 }, MEMBER)).status, 404);
    const restore = await F.db();
    restore.users.find(u=>u.id==='qaMember').phone = '9876500002';
    F.setDb(restore);
  });

  await test('P06', 'order authority discounts exactly 20% of makingCharge × quantity and nothing else', async () => {
    const db0 = await F.db();
    const p = db0.products.find(x=>x.active && Number(x.mcValue)>0) || db0.products.find(x=>x.active);
    assert.ok(p, 'active fixture product');
    const r = await F.req('POST', 'orders', {
      items:[{id:p.id,qty:2}], address, paymentMethod:'WhatsApp',
      coupon:memberCard.couponCode.replace(/\s/g,''), usePoints:false,
    }, MEMBER);
    assert.equal(r.status, 200, r.body);
    const o = r.json;
    const makingBasis = o.items.reduce((n,it)=>n + Number(it.makingCharge)*Number(it.qty),0);
    const expected = Math.round(makingBasis * .20);
    assert.equal(o.makingChargeSubtotal, makingBasis);
    assert.equal(o.makingChargeDiscount, expected);
    assert.equal(o.couponDiscount, expected); assert.equal(o.discount, expected);
    assert.equal(o.discountBasis, 'making-charges');
    assert.equal(o.total, o.subtotal - expected + o.shipping, 'WhatsApp has no prepaid discount');
    assert.ok(expected <= makingBasis && makingBasis < o.subtotal, 'metal/stones/GST subtotal is outside card basis');

    const bad = await F.req('POST', 'orders', { items:[{id:p.id,qty:1}], address:{...address,name:'QA Other',phone:'9876500003'}, paymentMethod:'WhatsApp', coupon:memberCard.couponCode }, OTHER);
    assert.equal(bad.status, 400); assert.match(bad.json.error, /mobile\/account/i);
  });

  await test('P07', 'legacy percent coupons still preview against whole subtotal', async () => {
    const db = await F.db();
    db.coupons.push({ id:'qaLegacy', code:'QA10', type:'percent', value:10, minOrder:0, active:true });
    F.setDb(db);
    const r = await F.req('POST', 'coupons/validate', { code:'qa10', amount:50000, makingAmount:1000 }, MEMBER);
    assert.equal(r.status, 200); assert.equal(r.json.discount, 5000);
    assert.equal(r.json.discountBasis, 'order-subtotal');
  });

  await test('P08', 'expiry disables the coupon but never deletes card or certificate', async () => {
    const db = await F.db();
    const u = db.users.find(x=>x.id==='qaMember');
    u.blackCard.expiresAt = '2026-01-01T00:00:00+05:30';
    const c = db.coupons.find(x=>x.id===u.blackCard.couponId); c.expiresAt = u.blackCard.expiresAt;
    F.setDb(db);
    const get = await F.req('GET', 'black-card', {}, MEMBER);
    assert.equal(get.status, 200); assert.equal(get.json.membership.status, 'expired');
    assert.equal(get.json.membership.certificateNo, memberCard.certificateNo);
    assert.equal(get.json.membership.permanentRecord, true);
    const me = await F.req('GET', 'auth/me', {}, MEMBER);
    assert.equal(me.json.user.blackCard.status, 'expired');
    const list = await F.req('GET', 'coupons', {}, MEMBER);
    assert.ok(!list.json.coupons.some(x=>x.id===c.id));
    const invalid = await F.req('POST', 'coupons/validate', { code:memberCard.couponCode, amount:100000, makingAmount:10000 }, MEMBER);
    assert.equal(invalid.status, 404);
    const reclaim = await F.req('POST', 'black-card/claim', {}, MEMBER);
    assert.equal(reclaim.status, 200); assert.equal(reclaim.json.created, false);
    assert.equal(reclaim.json.membership.expiresAt, '2026-01-01T00:00:00+05:30', 'claim cannot extend expiry');
  });

  console.log(`\nv184 PHP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(1); });
