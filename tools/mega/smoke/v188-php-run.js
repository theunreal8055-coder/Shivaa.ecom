/* v188 — executed PHP 8.3 test suite for the Daily WhatsApp Broadcast Studio,
   vCard contact magnet, B2C/B2B subscriber segmentation, and B2B town-partner
   referrals. Runs the REAL cms/api.php inside the isolated fixture. */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v188 harness deadline exceeded'); process.exit(1); }, 120000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  const F = await fixture();
  F.setDb(seed());

  await test('P01', '/api/version reports release 188+ with matched index/app/sw stamps', async () => {
    const r = await F.req('GET', 'version');
    assert.equal(r.status, 200);
    assert.ok(r.json.rel >= 188, 'rel floor 188');
    assert.equal(r.json.stamp.index, r.json.rel);
    assert.equal(r.json.stamp.app, r.json.rel);
    assert.equal(r.json.stamp.sw, r.json.rel);
    assert.equal(r.json.stamp.matched, true);
  });

  await test('P02', 'POST /api/whatsapp/subscribe validates phone, segments B2C vs B2B, and deduplicates repeat sign-ups', async () => {
    const bad = await F.req('POST', 'whatsapp/subscribe', { phone: '12345', segment: 'b2c' });
    assert.equal(bad.status, 400);

    const b2c1 = await F.req('POST', 'whatsapp/subscribe', {
      phone: '9876543210',
      name: 'Smt. Kavita Sharma',
      city: 'Nagaur',
      segment: 'b2c',
    });
    assert.equal(b2c1.status, 200);
    assert.equal(b2c1.json.ok, true);
    assert.equal(b2c1.json.updated, false);
    assert.equal(b2c1.json.subscriber.phone, '9876543210');
    assert.equal(b2c1.json.subscriber.segment, 'b2c');
    assert.equal(b2c1.json.vcardUrl, '/api/whatsapp/vcard');
    assert.ok(b2c1.json.waLink.includes('wa.me/'));

    // Repeat submission for same phone + segment updates in place without duplicating
    const b2c2 = await F.req('POST', 'whatsapp/subscribe', {
      phone: '+91 98765-43210',
      name: 'Kavita S. Sharma',
      city: 'Jaipur',
      segment: 'b2c',
    });
    assert.equal(b2c2.status, 200);
    assert.equal(b2c2.json.updated, true);
    assert.equal(b2c2.json.subscriber.city, 'Jaipur');

    // B2B subscription on a jeweller phone
    const b2b1 = await F.req('POST', 'whatsapp/subscribe', {
      phone: '9123456789',
      firmName: 'M/s Shree Karni Jewellers',
      city: 'Didwana',
      segment: 'b2b',
    });
    assert.equal(b2b1.status, 200);
    assert.equal(b2b1.json.subscriber.segment, 'b2b');
    assert.equal(b2b1.json.subscriber.firmName, 'M/s Shree Karni Jewellers');

    const db = await F.db();
    assert.equal(db.whatsappSubs.length, 2, '1 B2C + 1 B2B subscriber stored without duplicates');
  });

  await test('P03', 'POST /api/b2b/refer-partner records non-competing town referral and enrolls prospect in B2B list', async () => {
    const bad = await F.req('POST', 'b2b/refer-partner', {
      friendFirm: '',
      friendCity: 'Kuchaman',
      friendPhone: '9988776655',
    });
    assert.equal(bad.status, 400);

    const ok = await F.req('POST', 'b2b/refer-partner', {
      referrerFirm: 'Rathore Abhushan, Merta',
      referrerPhone: '9414012345',
      friendFirm: 'Shree Balaji Jewellers',
      friendCity: 'Kuchaman City',
      friendPhone: '9988776655',
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.ok, true);
    assert.equal(ok.json.referral.friendFirm, 'Shree Balaji Jewellers');
    assert.equal(ok.json.referral.friendCity, 'Kuchaman City');
    assert.ok(ok.json.waInviteLink.includes('wa.me/919988776655'));
    assert.ok(ok.json.inviteText.includes('0.92'));

    const db = await F.db();
    assert.equal(db.partnerReferrals.length, 1);
    assert.ok(db.whatsappSubs.some(s => s.phone === '9988776655' && s.segment === 'b2b' && s.source === 'partner_referral'));
  });

  await test('P04', 'GET /api/admin/broadcast-pack is admin-gated and builds all 7 B2C/B2B templates + Design of the Day', async () => {
    const unauth = await F.req('GET', 'admin/broadcast-pack', null, MEMBER);
    assert.ok(unauth.status === 401 || unauth.status === 403, 'member blocked from admin broadcast-pack');

    const pack = await F.req('GET', 'admin/broadcast-pack', null, ADMIN);
    assert.equal(pack.status, 200);
    assert.equal(pack.json.ok, true);
    assert.ok(pack.json.rates.gold22 > 0 && pack.json.rates.bullion995Per10g > 0, 'live rates populated');
    assert.ok(pack.json.designOfDay && pack.json.designOfDay.id, 'designOfDay selected');
    assert.ok(Array.isArray(pack.json.pollDesigns) && pack.json.pollDesigns.length >= 1, 'pollDesigns populated');
    for (const k of ['b2c_daily', 'b2c_ratedrop', 'b2c_poll', 'b2c_first_pitch', 'b2b_morning', 'b2b_first_pitch', 'b2b_deadstock']) {
      assert.ok(typeof pack.json.templates[k] === 'string' && pack.json.templates[k].length > 80, `template ${k} generated`);
    }
    assert.ok(pack.json.subscribers.counts.b2c >= 1, 'B2C subscriber count >= 1');
    assert.ok(pack.json.subscribers.counts.b2b >= 2, 'B2B subscriber count >= 2');
    assert.equal(pack.json.subscribers.counts.partnerReferrals, 1, 'partnerReferrals count === 1');
  });

  await test('P05', 'GET /api/whatsapp/vcard serves a valid vCard 3.0 payload for Shivaa Jewels', async () => {
    const vc = await F.req('GET', 'whatsapp/vcard');
    assert.equal(vc.status, 200);
    assert.ok(vc.body.includes('BEGIN:VCARD') && vc.body.includes('VERSION:3.0') && vc.body.includes('END:VCARD'), 'valid vCard envelope');
    assert.ok(vc.body.includes('Shivaa Jewels') && vc.body.includes('https://shivaa.in'), 'Shivaa contact metadata present');
  });

  console.log(`\nv188 PHP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
