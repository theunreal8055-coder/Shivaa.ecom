/* v183 — execute the real PHP API against an isolated fixture. No live DB or uploads. */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v183 harness deadline exceeded'); process.exit(1); }, 120000);
async function test(name, f) {
  try { await f(); console.log('PASS ' + name); pass++; }
  catch (e) { console.error('FAIL ' + name + ': ' + e.stack); fail++; }
}
(async () => {
  const F = await fixture();
  F.setDb(seed());
  const secret = 'qa-billing-secret-v183-2026';

  await test('P01 release 183 and matched shell/app/API stamps', async () => {
    const r = await F.req('GET', 'version');
    assert.equal(r.status, 200);
    assert.equal(r.json.rel, 183);
    assert.equal(r.json.stamp.matched, true);
    assert.deepEqual([r.json.stamp.index, r.json.stamp.app, r.json.stamp.sw], [183, 183, 183]);
  });

  await test('P02 sync key is never returned on GET or PUT; configured state is read-only', async () => {
    let r = await F.req('GET', 'settings', {}, ADMIN);
    assert.equal(r.json.billingSyncConfigured, false);
    assert.ok(!('billingSyncSecret' in r.json));
    r = await F.req('PUT', 'settings', { billingSyncSecret: secret, billingSyncConfigured: false }, ADMIN);
    assert.equal(r.status, 200);
    assert.equal(r.json.billingSyncConfigured, true);
    assert.ok(!r.body.includes(secret), 'PUT must not echo secret in JSON');
    assert.ok(!('billingSyncSecret' in r.json));
    r = await F.req('GET', 'settings', {}, ADMIN);
    assert.equal(r.json.billingSyncConfigured, true);
    assert.ok(!r.body.includes(secret), 'admin GET must not echo secret');
    for (const token of ['', MEMBER]) {
      r = await F.req('GET', 'settings', {}, token);
      assert.ok(!r.body.includes(secret), 'public/member GET must not echo secret');
    }
    r = await F.req('PUT', 'settings', { billingSyncSecret: '', billingSyncConfigured: false }, ADMIN);
    assert.equal(r.json.billingSyncConfigured, true, 'blank keeps secret; forged flag ignored');
    const db = await F.db();
    assert.equal(db.settings.billingSyncSecret, secret, 'stored for signing internally');
    assert.ok(!('billingSyncConfigured' in db.settings), 'display flag must not be persisted');
  });

  await test('P03 import starts with zero stock when owner omits quantity', async () => {
    const batch = await F.req('POST', 'admin/catalogue/batch', { label: 'QA review only' }, ADMIN);
    assert.equal(batch.status, 200);
    const batchId = batch.json.batch.id;
    const r = await F.req('POST', 'admin/catalogue/import', { batchId, items: [
      { name: 'QA design', sku: 'QA-183', category: 'rings', metal: 'Gold', purity: '22K',
        weightG: 3.5, weightSource: 'QA owner-tag fixture', images: ['/images/qa-fixture.jpg'] },
      { name: 'No owner weight', purity: '22K', weightG: 0, weightSource: 'none', images: ['/images/qa-fixture.jpg'] },
    ] }, ADMIN);
    assert.equal(r.status, 200);
    assert.equal(r.json.imported, 1);
    assert.equal(r.json.rejected.length, 1);
    const id = r.json.items[0].id;
    const db = await F.db();
    assert.equal(db.products.find(x => x.id === id).stock, 0, 'not an invented in-stock piece');
    assert.equal(db.products.find(x => x.id === id).active, false);
    F.qaItem = id; F.qaBatch = batchId;
  });

  await test('P04 Approve/Skip cannot act on ordinary, published, skipped, or orphaned pieces', async () => {
    const db = await F.db();
    const liveId = db.products.find(x => x.active && !x.batchId).id;
    let r = await F.req('POST', 'admin/catalogue/skip', { ids: [liveId] }, ADMIN);
    assert.deepEqual(r.json.skipped, [], 'ordinary product cannot be skipped by intake');
    r = await F.req('POST', 'admin/catalogue/approve', { ids: [liveId] }, ADMIN);
    assert.deepEqual(r.json.published, [], 'ordinary product cannot be approved by intake');
    r = await F.req('POST', 'admin/catalogue/approve', { ids: [F.qaItem] }, ADMIN);
    assert.deepEqual(r.json.published, [F.qaItem], 'pending batch item approved once');
    r = await F.req('POST', 'admin/catalogue/skip', { ids: [F.qaItem] }, ADMIN);
    assert.deepEqual(r.json.skipped, [], 'approved item cannot be unpublished via Skip');
    r = await F.req('POST', 'admin/catalogue/approve', { ids: [F.qaItem] }, ADMIN);
    assert.deepEqual(r.json.published, [], 'no double approval');
    const imp = await F.req('POST', 'admin/catalogue/import', { batchId: F.qaBatch, items: [
      { name: 'QA second', purity: '22K', weightG: 2.5, weightSource: 'QA owner-tag fixture', images: ['/images/qa-fixture.jpg'] },
    ] }, ADMIN);
    const secondId = imp.json.items[0].id;
    r = await F.req('POST', 'admin/catalogue/skip', { ids: [secondId] }, ADMIN);
    assert.deepEqual(r.json.skipped, [secondId]);
    r = await F.req('POST', 'admin/catalogue/approve', { ids: [secondId] }, ADMIN);
    assert.deepEqual(r.json.published, [], 'skipped piece cannot be published by IDs');
    const finalDb = await F.db();
    assert.equal(finalDb.products.find(x => x.id === liveId).active, true);
    assert.equal(finalDb.products.find(x => x.id === F.qaItem).active, true);
    assert.equal(finalDb.products.find(x => x.id === secondId).active, false);
  });

  console.log(`\nv183 PHP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
