'use strict';
/* v187 security regression slice. PHP-WASM runs only against synthetic QA
   identities/files; no production DB, credentials, uploads, or provider calls. */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER, fn, source } = require('./php-api-fixture');
let passed = 0, failed = 0;
setTimeout(() => { console.error('v187 PHP fixture deadline exceeded'); process.exit(1); }, 120000);
async function test(id, name, work) {
  try { await work(); passed++; console.log(`PASS ${id} ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${id} ${name}: ${error.message}`); }
}
const GST = '08QATST1234A1Z5';
const PDF = Buffer.from('%PDF-1.4\nSynthetic QA-only KYC document.\n%%EOF\n', 'ascii');
const applicant = {
  firm: 'Synthetic QA Jewellers', email: 'kyc187@qa.invalid', phone: '9876500099',
  password: 'Synthetic-QA-Password-187', gstin: GST, city: 'QA Jaipur',
};
function applicantDb(withOtp) {
  const db = seed();
  db.gstCache[GST] = { at: Math.floor(Date.now() / 1000), result: { active: true, info: {
    active: true, status: 'Active', legalName: 'Synthetic QA Jewellers', tradeName: 'QA Jewellers',
    businessType: 'Synthetic fixture', registrationDate: '2022-01-01', address: 'QA-only address',
    district: 'QA Jaipur', state: 'Rajasthan', pincode: '302001',
  } } };
  if (withOtp) db.otps.push({ phone: applicant.phone, purpose: 'login', verified: true,
    consumedByLogin: false, exp: Math.floor(Date.now() / 1000) + 3600 });
  return db;
}
const fileEntry = (name, tmp, size, error = 0) => ({
  name, type: 'application/pdf', tmp_name: tmp, size, error,
});
(async () => {
  const F = await fixture();
  F.php.mkdirTree('/qa/tmp');
  F.php.mkdirTree('/qa/uploads/kyc');

  await test('V187-P01', 'secure storage rejects a directory inside the app document root', async () => {
    const db = seed();
    db.partners = [{ id: 'qaLegacy', kyc: { businessCard: '/uploads/kyc/card_0123456789.pdf' } }];
    F.setDb(db);
    F.php.writeFile('/qa/uploads/kyc/card_0123456789.pdf', PDF);
    const r = await F.req('POST', 'admin/kyc/migrate-business-cards', {}, ADMIN, {}, '203.0.113.14', '/qa/uploads/kyc');
    assert.equal(r.status, 503, r.body);
    assert.equal((await F.db()).partners[0].kyc.businessCard, '/uploads/kyc/card_0123456789.pdf');
    const stillThere = await F.run("echo file_exists('/qa/uploads/kyc/card_0123456789.pdf') ? 'yes' : 'no';");
    assert.equal(stillThere.body, 'yes');
  });

  await test('V187-P02', 'unverified multipart upload is rejected without persisting or moving its document', async () => {
    const tmp = '/qa/tmp/unverified.pdf'; F.php.writeFile(tmp, PDF); F.setDb(applicantDb(false));
    const r = await F.uploadReq('POST', 'partners/apply', applicant,
      { businessCard: fileEntry('looks-like.png', tmp, PDF.length) });
    assert.equal(r.status, 400, r.body);
    assert.match(r.json.error, /Verify your phone with OTP/);
    const remains = await F.run("echo file_exists('/qa/tmp/unverified.pdf') ? 'yes' : 'no';");
    assert.equal(remains.body, 'yes');
    assert.equal((await F.db()).partners.length, 0);
    const privateCreated = await F.run("echo is_dir('/qa-private/kyc') ? 'yes' : 'no';");
    assert.equal(privateCreated.body, 'no');
  });

  await test('V187-P03', 'upload size cap and magic-byte validation reject without storage', async () => {
    const large = Buffer.alloc(8 * 1024 * 1024 + 1, 0x41);
    F.php.writeFile('/qa/tmp/oversize.bin', large);
    F.setDb(applicantDb(false));
    const tooLarge = await F.uploadReq('POST', 'partners/apply', applicant,
      { businessCard: fileEntry('card.pdf', '/qa/tmp/oversize.bin', large.length) });
    assert.equal(tooLarge.status, 400, tooLarge.body);
    assert.match(tooLarge.json.error, /under 8 MB/);
    const invalid = Buffer.from('<script>not a PDF</script>', 'ascii');
    F.php.writeFile('/qa/tmp/not-a-pdf.pdf', invalid);
    const badMagic = await F.uploadReq('POST', 'partners/apply', applicant,
      { businessCard: fileEntry('card.pdf', '/qa/tmp/not-a-pdf.pdf', invalid.length) });
    assert.equal(badMagic.status, 400, badMagic.body);
    assert.match(badMagic.json.error, /real JPG/);
    assert.equal((await F.db()).partners.length, 0);
  });

  await test('V187-P04-fail-closed', 'verified application is not created when private storage resolves inside the document root', async () => {
    const tmp = '/qa/tmp/unsafe-private-dir.pdf'; F.php.writeFile(tmp, PDF); F.setDb(applicantDb(true));
    const r = await F.uploadReq('POST', 'partners/apply', applicant,
      { businessCard: fileEntry('card.pdf', tmp, PDF.length) }, '', {}, '203.0.113.15', 0, '/qa/uploads/kyc');
    assert.equal(r.status, 503, r.body);
    assert.match(r.json.error, /Secure business-card storage is unavailable/);
    assert.equal((await F.db()).partners.length, 0);
    const remains = await F.run("echo file_exists('/qa/tmp/unsafe-private-dir.pdf') ? 'yes' : 'no';");
    assert.equal(remains.body, 'yes');
  });

  let createdPartnerId = '', createdRef = '';
  await test('V187-P04', 'verified application stores signature-derived reference in private storage', async () => {
    const tmp = '/qa/tmp/verified-card.pdf'; F.php.writeFile(tmp, PDF); F.setDb(applicantDb(true));
    const r = await F.uploadReq('POST', 'partners/apply', applicant,
      { businessCard: fileEntry('owner-named-this.png', tmp, PDF.length) });
    assert.equal(r.status, 200, r.body);
    assert.equal(r.json.ok, true);
    assert.equal(Object.hasOwn(r.json, 'businessCard'), false);
    assert.equal(String(r.json.id).startsWith('pt_'), true);
    createdPartnerId = r.json.id;
    const db = await F.db();
    createdRef = db.partners[0].kyc.businessCard;
    assert.match(createdRef, /^private-kyc:card_[a-f0-9]{32}\.pdf$/);
    assert.equal(db.partners[0].kyc.gstin, GST);
    assert.equal(db.partners[0].kyc.otpVerified, true);
    const privatePath = '/qa-private/kyc/' + createdRef.slice('private-kyc:'.length);
    const stored = await F.run(`echo file_get_contents('${privatePath}');`);
    assert.equal(stored.body, PDF.toString('ascii'));
    const mode = await F.run(`echo decoct(fileperms('${privatePath}') & 0777);`);
    assert.equal(mode.body, '600');
    const temp = await F.run("echo file_exists('/qa/tmp/verified-card.pdf') ? 'yes' : 'no';");
    assert.equal(temp.body, 'no');
    const publicDir = await F.run("echo is_file('/qa/uploads/kyc/card_' . str_repeat('0', 10) . '.pdf') ? 'yes' : 'no';");
    assert.equal(publicDir.body, 'no');
  });

  await test('V187-P05', 'business-card stream requires admin authorization and serves only the selected partner record', async () => {
    assert(createdPartnerId, 'positive upload test must create a synthetic partner');
    const route = `admin/partners/${createdPartnerId}/business-card`;
    const anon = await F.req('GET', route);
    assert.equal(anon.status, 403, anon.body);
    const member = await F.req('GET', route, {}, MEMBER);
    assert.equal(member.status, 403, member.body);
    const missing = await F.req('GET', 'admin/partners/qaMissing/business-card', {}, ADMIN);
    assert.equal(missing.status, 404, missing.body);
    const admin = await F.req('GET', route, {}, ADMIN);
    assert.equal(admin.status, 200, admin.body);
    assert.ok(admin.body.startsWith('%PDF-1.4'), admin.body.slice(0, 40));
    assert.ok(admin.body.includes('Synthetic QA-only KYC document.'));
  });

  await test('V187-P06', 'legacy cards migrate by verified copy, then the old public-tree file is removed', async () => {
    const db = seed();
    db.partners = [
      { id: 'qaLegacy', firm: 'QA Legacy Firm', kyc: { businessCard: '/uploads/kyc/card_0123456789.pdf' } },
      { id: 'qaMissing', firm: 'QA Missing Firm', kyc: { businessCard: '/uploads/kyc/card_aaaaaaaaaa.jpg' } },
      { id: 'qaPoison', firm: 'QA Poison Firm', kyc: { businessCard: '/uploads/kyc/../../data/db.json' } },
    ];
    F.setDb(db);
    F.php.writeFile('/qa/uploads/kyc/card_0123456789.pdf', PDF);
    const r = await F.req('POST', 'admin/kyc/migrate-business-cards', {}, ADMIN);
    assert.equal(r.status, 200, r.body);
    assert.equal(r.json.migrated, 1, r.body);
    assert.equal(r.json.missing, 1, r.body);
    assert.equal(r.json.invalid, 1, r.body);
    const saved = await F.db();
    const ref = saved.partners.find(p => p.id === 'qaLegacy').kyc.businessCard;
    assert.match(ref, /^private-kyc:card_[a-f0-9]{32}\.pdf$/);
    assert.equal(saved.partners.find(p => p.id === 'qaMissing').kyc.businessCard, '/uploads/kyc/card_aaaaaaaaaa.jpg');
    assert.equal(saved.partners.find(p => p.id === 'qaPoison').kyc.businessCard, '/uploads/kyc/../../data/db.json');
    const legacy = await F.run("echo file_exists('/qa/uploads/kyc/card_0123456789.pdf') ? 'yes' : 'no';");
    assert.equal(legacy.body, 'no');
    const privatePath = '/qa-private/kyc/' + ref.slice('private-kyc:'.length);
    const copied = await F.run(`echo file_get_contents('${privatePath}');`);
    assert.equal(copied.body, PDF.toString('ascii'));
    const again = await F.req('POST', 'admin/kyc/migrate-business-cards', {}, ADMIN);
    assert.equal(again.status, 200, again.body);
    assert.equal(again.json.migrated, 0);
  });

  await test('V187-P07', 'legacy private-document endpoint remains admin-only during migration', async () => {
    const route = 'admin/partners/qaLegacy/business-card';
    assert.equal((await F.req('GET', route)).status, 403);
    assert.equal((await F.req('GET', route, {}, MEMBER)).status, 403);
    const admin = await F.req('GET', route, {}, ADMIN);
    assert.equal(admin.status, 200, admin.body);
    assert.ok(admin.body.startsWith('%PDF-1.4'));
  });

  await test('V187-P08', 'expired bearer tokens and logged-out token replay do not authenticate', async () => {
    const expired = seed();
    expired.tokens.qaExpiredToken = { userId: 'qaMember', exp: Math.floor(Date.now() / 1000) - 60 };
    F.setDb(expired);
    assert.equal((await F.req('GET', 'orders', {}, 'qaExpiredToken')).status, 401);

    const live = seed();
    live.tokens.qaLogoutToken = { userId: 'qaMember', exp: Math.floor(Date.now() / 1000) + 3600 };
    F.setDb(live);
    const logout = await F.req('POST', 'auth/logout', {}, 'qaLogoutToken');
    assert.equal(logout.status, 200, logout.body);
    assert.equal(Object.hasOwn((await F.db()).tokens, 'qaLogoutToken'), false);
    assert.equal((await F.req('GET', 'orders', {}, 'qaLogoutToken')).status, 401);
  });

  await test('V187-P09', 'fresh tokens are server-generated random bearer values; cookie authentication is not used', async () => {
    const out = await F.run(`${fn('issue_token')} $db=['tokens'=>[]]; $u=['id'=>'qaMember']; $a=issue_token($db,$u); $b=issue_token($db,$u); echo json_encode([$a,$b]);`);
    assert(out.json, out.body);
    assert.match(out.json[0], /^[a-f0-9]{48}$/);
    assert.match(out.json[1], /^[a-f0-9]{48}$/);
    assert.notEqual(out.json[0], out.json[1]);
    assert.match(source, /HTTP_AUTHORIZATION/);
    assert.doesNotMatch(source, /\$_COOKIE|setcookie\s*\(/i);
  });

  await test('V187-P10', 'member order-list/detail and nested-address routes enforce record ownership', async () => {
    const db = seed();
    db.users.push({ id: 'qaOther', role: 'customer', name: 'Other QA', email: 'other@qa.invalid', phone: '9876500011', addresses: [
      { id: 'adOther', name: 'Synthetic Other Address', line: 'QA-only other street', city: 'QA', pincode: '302001' },
    ] });
    db.tokens.qaOtherToken = { userId: 'qaOther', exp: Math.floor(Date.now() / 1000) + 3600 };
    db.users[1].addresses = [{ id: 'adMember', name: 'Synthetic Member', line: 'QA member street', city: 'QA', pincode: '302001' }];
    db.orders = [
      { id: 'qaMemberOrder', userId: 'qaMember', status: 'Placed', paymentStatus: 'Awaiting payment', total: 100, items: [], timeline: [] },
      { id: 'qaOtherOrder', userId: 'qaOther', status: 'Placed', paymentStatus: 'Awaiting payment', total: 200, items: [], timeline: [] },
    ];
    F.setDb(db);
    const list = await F.req('GET', 'orders', {}, MEMBER);
    assert.equal(list.status, 200, list.body);
    assert.deepEqual(list.json.orders.map(o => o.id), ['qaMemberOrder']);
    assert.equal((await F.req('GET', 'orders/qaOtherOrder', {}, MEMBER)).status, 403);
    assert.equal((await F.req('GET', 'orders/qaMemberOrder', {}, MEMBER)).status, 200);
    const addresses = await F.req('GET', 'addresses', {}, MEMBER);
    assert.deepEqual(addresses.json.addresses.map(a => a.id), ['adMember']);
    assert.equal((await F.req('DELETE', 'addresses/adOther', {}, MEMBER)).status, 404);
    const after = await F.db();
    assert.equal(after.users.find(u => u.id === 'qaOther').addresses[0].line, 'QA-only other street');
  });

  console.log(`\nv187 PHP security slice: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
