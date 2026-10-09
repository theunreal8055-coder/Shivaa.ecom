/* v183 — executed PHP 8.3 suite for the Play Store release: the in-app account
   erasure route (POST /api/auth/delete-account), which Google Play's User Data
   policy makes mandatory for any app that lets people create an account.

   What is verified here: the route's real behaviour inside the isolated fixture
   — session path, OTP path, wrong confirmation, protected roles, single-use
   codes, throttling, and the DPDPA-correct outcome (the account is anonymised
   and its tokens revoked; order rows survive for tax/PMLA retention).
   What is NOT verified here, stated plainly: the live SMS gateway actually
   delivering the code, a real Trusted Web Activity rendering shivaa.in, and
   Google's own app-link verification of /.well-known/assetlinks.json. Those
   need a phone in the owner's hand and Play Console. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { fixture, seed, ADMIN, MEMBER, b64 } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v183 harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

const MEMBER_PHONE = '9876500002';
const otpHash = code => crypto.createHash('sha256').update('shv' + MEMBER_PHONE + code).digest('hex');

(async () => {
  const F = await fixture();
  const base = seed();
  base.users.push({ id:'qaPartner', role:'partner', name:'QA Partner', phone:'9876500003',
                    email:'partner@qa.invalid', addresses:[], wishlist:[], partnerId:'p1' });
  base.tokens.qaPartnerTok = { userId:'qaPartner', exp: Math.floor(Date.now()/1000) + 86400 };
  // one real order + one certificate the law says we must keep
  base.orders = [{ id:'QA-1', userId:'qaMember', status:'Delivered', paymentStatus:'Paid',
                   paymentMethod:'UPI', items:[{id:'p1',qty:1}], total:50000, createdAt:new Date().toISOString() }];
  F.setDb(base);

  await test('X01', 'release 183 with a matched index/app/worker handshake', async () => {
    const v = await F.req('GET', 'version');
    assert.equal(v.status, 200);
    assert.equal(v.json.rel, 183);
    assert.equal(v.json.stamp.matched, true);
    assert.equal(v.json.stamp.index, 183);
    assert.equal(v.json.stamp.app, 183);
    assert.equal(v.json.stamp.sw, 183);
    assert.equal(v.json.db.driver, 'json');
  });

  await test('X02', 'the route is reachable but refuses an anonymous, unproven request', async () => {
    const noPhone = await F.req('POST', 'auth/delete-account', {}, '');
    assert.equal(noPhone.status, 400, 'must ask for the mobile first');
    const badCode = await F.req('POST', 'auth/delete-account',
      { phone: MEMBER_PHONE, code: '0000', confirm: 'DELETE' }, '');
    assert.equal(badCode.status, 400, 'an unverified code must not erase anything');
    const db = await F.db();
    assert.equal(db.users.find(u => u.id === 'qaMember').name, 'QA Member', 'nothing may change on a failed attempt');
  });

  await test('X03', 'session path: a signed-in shopper erases the account in one call', async () => {
    const r = await F.req('POST', 'auth/delete-account', { confirm: 'DELETE' }, MEMBER);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.ok, true);
    const db = await F.db();
    const u = db.users.find(x => x.id === 'qaMember');
    assert.equal(u.name, 'Deleted customer');
    assert.equal(u.email, 'deleted+qaMember@privacy.local');
    assert.equal(u.phone, '');
    assert.deepEqual(u.addresses, []);
    assert.deepEqual(u.wishlist, []);
    assert.equal(u.profile.erased, true);
    assert.ok(u.anonymizedAt, 'erasure must be stamped');
    assert.ok(!db.tokens[MEMBER], 'the token used for this very request must be revoked');
    assert.equal(db.orders.length, 1, 'order rows must survive — tax and PMLA retention');
    assert.equal(db.orders[0].userId, 'qaMember', 'the order must still belong to the (now anonymous) account');
    assert.ok((db.auditLog || []).some(a => a.what === 'user.self_erased'), 'erasure must be audited');
  });

  await test('X04', 'OTP path: a logged-out shopper proves the number and erases', async () => {
    const F2 = await fixture();
    const b = seed();
    // exactly what /auth/send-otp writes: verified=false, nobody else has touched it
    b.otps = [{ phone: MEMBER_PHONE, hash: otpHash('4242'), exp: Math.floor(Date.now()/1000) + 300,
                tries: 0, at: Math.floor(Date.now()/1000), verified: false, email: 'member@qa.invalid' }];
    b.orders = [{ id:'QA-2', userId:'qaMember', status:'Placed', paymentStatus:'Awaiting payment',
                  paymentMethod:'COD', items:[], total:100, createdAt:new Date().toISOString() }];
    F2.setDb(b);
    const r = await F2.req('POST', 'auth/delete-account',
      { phone: MEMBER_PHONE, code: '4242', confirm: 'DELETE' }, '');
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const db = await F2.db();
    assert.equal(db.users.find(u => u.id === 'qaMember').name, 'Deleted customer');
    assert.ok(db.otps.every(o => o.consumedByLogin), 'the code must be single-use');
    assert.equal(db.orders.length, 1, 'the order must survive the erasure');
  });

  await test('X05', 'the confirmation word is load-bearing: a wrong one erases nothing', async () => {
    const F3 = await fixture();
    F3.setDb(seed());
    for (const confirm of ['', 'delete', 'ERASE', 'DELETE ME', 'delet']) {
      const r = await F3.req('POST', 'auth/delete-account', { confirm }, MEMBER);
      assert.equal(r.status, 400, 'confirm=' + JSON.stringify(confirm) + ' must be refused');
    }
    const db = await F3.db();
    assert.equal(db.users.find(u => u.id === 'qaMember').name, 'QA Member', 'a mistyped word must not erase');
  });

  await test('X06', 'protected roles: the owner and a B2B partner cannot self-erase', async () => {
    const F4 = await fixture();
    const withPartner = seed();
    withPartner.users.push({ id:'qaPartner', role:'partner', name:'QA Partner', phone:'9876500003',
                             email:'partner@qa.invalid', addresses:[], wishlist:[], partnerId:'p1' });
    withPartner.tokens.qaPartnerTok = { userId:'qaPartner', exp: Math.floor(Date.now()/1000) + 86400 };
    F4.setDb(withPartner);
    const owner = await F4.req('POST', 'auth/delete-account', { confirm: 'DELETE' }, ADMIN);
    assert.equal(owner.status, 400, 'the showroom owner account must be protected');
    assert.ok(/owner/i.test(owner.json.error || ''), 'the reason must say so');
    const partner = await F4.req('POST', 'auth/delete-account', { confirm: 'DELETE' }, 'qaPartnerTok');
    assert.equal(partner.status, 400, 'a partner account must be closed by the desk, not self-erased');
    assert.ok(/partner/i.test(partner.json.error || ''));
    const db = await F4.db();
    assert.equal(db.users.find(u => u.id === 'qaAdmin').name, 'QA Admin');
    assert.equal(db.users.find(u => u.id === 'qaPartner').name, 'QA Partner');
  });

  await test('X07', 'throttling: a script cannot walk the whole user table', async () => {
    const F5 = await fixture();
    F5.setDb(seed());
    const ip = '198.51.100.77';
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push(await F5.req('POST', 'auth/delete-account',
      { phone: MEMBER_PHONE, code: '0000', confirm: 'DELETE' }, '', {}, ip));
    assert.ok(codes.every(c => c.status === 400), 'the first six attempts are answered normally');
    const blocked = await F5.req('POST', 'auth/delete-account',
      { phone: MEMBER_PHONE, code: '0000', confirm: 'DELETE' }, '', {}, ip);
    assert.equal(blocked.status, 429, 'the seventh must be throttled');
    assert.ok(/too many/i.test(blocked.json.error || ''), 'the throttle message must be honest');
    const db = await F5.db();
    assert.equal(db.users.find(u => u.id === 'qaMember').name, 'QA Member', 'a throttled attempt erases nothing');
  });

  await test('X08', 'a stale or already-used OTP cannot be replayed', async () => {
    const F6 = await fixture();
    const b = seed();
    b.otps = [{ phone: MEMBER_PHONE, hash: otpHash('1111'), exp: Math.floor(Date.now()/1000) - 10,
                tries: 0, at: Math.floor(Date.now()/1000) - 400, verified: false, email: 'member@qa.invalid' }];
    F6.setDb(b);
    const r = await F6.req('POST', 'auth/delete-account',
      { phone: MEMBER_PHONE, code: '1111', confirm: 'DELETE' }, '');
    assert.equal(r.status, 400, 'an expired code must not erase');
    const db = await F6.db();
    assert.equal(db.users.find(u => u.id === 'qaMember').name, 'QA Member');
  });

  await test('X09', 'the request needs no admin privilege and never leaks another shopper', async () => {
    const unknown = await F.req('POST', 'auth/delete-account', { phone: '9876500009', code: '1234', confirm: 'DELETE' }, '');
    const wrongCode = await F.req('POST', 'auth/delete-account', { phone: MEMBER_PHONE, code: '9999', confirm: 'DELETE' }, '');
    assert.equal(unknown.status, 400, 'an unknown number must not be told apart from a wrong code');
    assert.equal(unknown.status, wrongCode.status, 'the two answers must be indistinguishable');
    assert.equal(unknown.json.error, wrongCode.json.error,
      'the two answers must be byte-identical, or the endpoint is an account-enumeration oracle');
  });

  console.log(`\nv183-php-run: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
