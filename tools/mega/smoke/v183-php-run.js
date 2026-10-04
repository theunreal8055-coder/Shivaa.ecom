/* v183 — executed PHP 8.3 suite: preserves the v182 catalog/billing checks and
   exercises Bridal + Mayra service-request validation and follow-up. Runs the REAL api.php inside
   the isolated fixture: intake → standing-law rejections → staged (hidden) →
   owner approve/skip → batch publish; HMAC-signed billing stock movements.
   What is NOT verified here — stated plainly for the record: a live MySQL
   round-trip of catalog_batches (owner-server verification via
   /upgrade-sql.php counts, as with Phase 3), and real multipart HTTP upload
   plumbing (the route body + shv_store_upload CLI path are executed instead). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fixture, seed, ADMIN, MEMBER, fn, b64 } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v183 harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  const F = await fixture();
  F.setDb(seed());

  /* signed request runner — mirrors php-api-fixture's req() but injects the
     X-Shivaa-Ts / X-Shivaa-Signature headers and signs the exact raw body. */
  const reqSigned = (method, route, bodyObj, secret, ts, query) => {
    const raw = bodyObj === null ? '' : JSON.stringify(bodyObj);
    ts = ts === undefined ? Math.floor(Date.now() / 1000) : ts;
    const sig = crypto.createHmac('sha256', secret)
      .update(`${ts}\n${method}\n${route}\n${raw}`).digest('hex');
    return F.run(`
$GLOBALS['QA_BODY'] = base64_decode('${b64(raw)}');
class QaInput { public $context; private $p=0;
  function stream_open($u,$m,$o,&$x){ return true; }
  function stream_read($n){$r=substr($GLOBALS['QA_BODY'],$this->p,$n); $this->p+=strlen($r); return $r;}
  function stream_eof(){return $this->p>=strlen($GLOBALS['QA_BODY']);}
  function stream_stat(){return ['size'=>strlen($GLOBALS['QA_BODY'])];}
}
stream_wrapper_unregister('php'); stream_wrapper_register('php','QaInput');
$_SERVER=['REQUEST_METHOD'=>'${method}','REMOTE_ADDR'=>'203.0.113.10','HTTP_HOST'=>'qa.invalid','HTTP_AUTHORIZATION'=>'',
  'HTTP_X_SHIVAA_TS'=>'${ts}','HTTP_X_SHIVAA_SIGNATURE'=>'${sig}'];
$_GET=array_merge(['__route'=>'${route}'], json_decode(base64_decode('${b64(query || {})}'), true)); $_POST=[];
include '/qa/api.php';`);
  };

  await test('P01', 'v183 release stamp and version telemetry: rel=183, matched=true', async () => {
    const v = await F.req('GET', 'version');
    assert.equal(v.status, 200);
    assert.equal(v.json.rel, 183);
    assert.equal(v.json.stamp.matched, true);
    assert.equal(v.json.stamp.index, 183);
    assert.equal(v.json.stamp.app, 183);
    assert.equal(v.json.stamp.sw, 183);
    assert.equal(v.json.db.driver, 'json');
    assert.equal(v.json.db.mode, 'json');
    assert.equal(v.json.db.mirrorBehind, false);
  });

  await test('P02', 'every catalogue route is admin-gated; billing bridge is dark until configured', async () => {
    const routes = [
      ['POST', 'admin/catalogue/batch'], ['POST', 'admin/catalogue/upload'],
      ['POST', 'admin/catalogue/import'], ['GET', 'admin/catalogue/queue'],
      ['GET', 'admin/catalogue/batches'], ['POST', 'admin/catalogue/approve'], ['POST', 'admin/catalogue/skip'],
    ];
    for (const [m, r] of routes) {
      const anon = await F.req(m, r, {});
      assert.equal(anon.status, 403, `${m} ${r} anon must 403`);
      const mem = await F.req(m, r, {}, MEMBER);
      assert.equal(mem.status, 403, `${m} ${r} member must 403`);
    }
    // billing bridge answers 403 (not configured) BEFORE any auth dance
    const b1 = await reqSigned('GET', 'billing/stock', null, 'any-secret');
    assert.equal(b1.status, 403);
    assert.ok(b1.json.error.includes('Billing sync is not configured'), 'honest not-configured message');
    const b2 = await reqSigned('POST', 'billing/stock-movement', { movementId: 'm0', delta: 1, sku: 'X' }, 'any-secret');
    assert.equal(b2.status, 403);
  });

  let batchId = '';
  await test('P03', 'batch create + photo upload: batch ledger row born, magic-byte-checked images stored', async () => {
    const r = await F.req('POST', 'admin/catalogue/batch', { label: 'Hitesh bhai rings — 67 pcs' }, ADMIN);
    assert.equal(r.status, 200);
    assert.ok(r.json.batch.id.startsWith('cb_'), 'batch id minted');
    assert.equal(r.json.batch.status, 'intake');
    batchId = r.json.batch.id;

    // two real-magic-byte jpgs + one impostor — only the jpgs may land
    await F.run(`file_put_contents('/qa/up1.jpg', "\\xFF\\xD8\\xFF" . str_repeat('x', 64));
file_put_contents('/qa/up2.jpg', "\\xFF\\xD8\\xFF" . str_repeat('y', 64));
file_put_contents('/qa/upbad.jpg', 'this is definitely not an image');`);
    const up = await F.run(`
$_SERVER=['REQUEST_METHOD'=>'POST','REMOTE_ADDR'=>'203.0.113.10','HTTP_HOST'=>'qa.invalid','HTTP_AUTHORIZATION'=>'Bearer ${ADMIN}'];
$_GET=['__route'=>'admin/catalogue/upload'];
$_POST=['batchId'=>'${batchId}'];
$_FILES=['files'=>['name'=>['a.jpg','b.jpg','bad.jpg'],'tmp_name'=>['/qa/up1.jpg','/qa/up2.jpg','/qa/upbad.jpg'],'error'=>[0,0,0],'size'=>[67,67,30]]];
include '/qa/api.php';`);
    assert.equal(up.status, 200);
    assert.equal(up.json.urls.length, 2, 'impostor rejected, both jpgs accepted');
    for (const u of up.json.urls) assert.ok(u.startsWith(`/uploads/catalogue/${batchId}/cat_`), 'image lands in the batch folder');
    const exists = await F.run(`echo file_exists('/qa' . '${up.json.urls[0]}') ? '1' : '0';`);
    assert.equal(exists.body.trim(), '1', 'stored on disk');

    // unknown batch is refused before any file is touched
    const bad = await F.run(`
$_SERVER=['REQUEST_METHOD'=>'POST','REMOTE_ADDR'=>'203.0.113.10','HTTP_HOST'=>'qa.invalid','HTTP_AUTHORIZATION'=>'Bearer ${ADMIN}'];
$_GET=['__route'=>'admin/catalogue/upload'];
$_POST=['batchId'=>'cb_nope'];
$_FILES=['files'=>['name'=>['a.jpg'],'tmp_name'=>['/qa/up1.jpg'],'error'=>[0],'size'=>[67]]];
include '/qa/api.php';`);
    assert.equal(bad.status, 404, 'unknown batch refused');
    await F.run(`@unlink('/qa/up1.jpg'); @unlink('/qa/up2.jpg'); @unlink('/qa/upbad.jpg');`);
  });

  let stagedIds = [];
  await test('P04', 'import: standing law enforced (no invented weight/purity/source), staged rows stay hidden', async () => {
    const items = [
      // 1 — valid
      { name: '22K Rani Haar — kundan', sku: 'QA-RH-001', category: 'necklaces', metal: 'Gold', purity: '22K',
        weightG: 41.25, lessWeightG: 0, mcScheme: 'perGram', mcValue: 350, stoneValue: 12000,
        images: ['/uploads/catalogue/x/shot1.jpg'], desc: 'Hand-set kundan rani haar in certified 22K gold.',
        tags: ['bridal'], weightSource: 'owner sheet row 12' },
      // 2 — valid
      { name: '22K Chandbali — ruby', sku: 'QA-CB-001', category: 'earrings', metal: 'Gold', purity: '22K',
        weightG: 8.4, images: ['/uploads/catalogue/x/shot2.jpg'], desc: 'Ruby-dotted chandbali.',
        weightSource: 'WA tag 20 Sep' },
      // 3 — missing weightSource (standing law)
      { name: 'No source ring', category: 'rings', purity: '22K', weightG: 4.2, images: ['/uploads/catalogue/x/s.jpg'] },
      // 4 — missing purity (standing law)
      { name: 'No purity ring', category: 'rings', weightG: 4.2, images: ['/uploads/catalogue/x/s.jpg'], weightSource: 'sheet' },
      // 5 — invented weight (standing law)
      { name: 'Zero weight ring', category: 'rings', purity: '22K', weightG: 0, images: ['/uploads/catalogue/x/s.jpg'], weightSource: 'sheet' },
      // 6 — no image
      { name: 'No image ring', category: 'rings', purity: '22K', weightG: 4.2, weightSource: 'sheet' },
    ];
    const r = await F.req('POST', 'admin/catalogue/import', { batchId, items }, ADMIN);
    assert.equal(r.status, 200);
    assert.equal(r.json.imported, 2, 'only the two law-abiding rows imported');
    assert.equal(r.json.rejected.length, 4);
    const errs = r.json.rejected.map(x => x.error).join(' | ');
    assert.ok(errs.includes('weightSource required'), 'provenance rejection');
    assert.ok(errs.includes('purity must come from'), 'purity rejection');
    assert.ok(errs.includes('weights are NEVER invented'), 'weight rejection');
    assert.ok(errs.includes('at least one image'), 'image rejection');
    stagedIds = r.json.items.map(x => x.id);
    assert.ok(stagedIds.every(id => /^p_[0-9a-f]+$/.test(id)), 'server-minted ids');

    // staged rows are NOT for shoppers
    const list = await F.req('GET', 'products');
    for (const id of stagedIds)
      assert.ok(!list.json.products.some(p => p.id === id), 'staged row hidden from storefront list');
    const pdp = await F.req('GET', 'products/' + stagedIds[0], {}, MEMBER);
    assert.equal(pdp.status, 404, 'staged PDP hidden from shoppers');
    const pdpAdm = await F.req('GET', 'products/' + stagedIds[0], {}, ADMIN);
    assert.equal(pdpAdm.status, 200, 'admin may preview the staged page');
    // a normal live PDP is untouched (regression)
    const liveId = list.json.products[0].id;
    const pdpLive = await F.req('GET', 'products/' + liveId, {}, MEMBER);
    assert.equal(pdpLive.status, 200, 'live PDP still serves shoppers');

    // queue carries the review card payload incl. weight provenance
    const q = await F.req('GET', 'admin/catalogue/queue', {}, ADMIN);
    assert.equal(q.status, 200);
    assert.equal(q.json.items.length, 2, 'two pending cards');
    for (const it of q.json.items) {
      assert.equal(it.status, 'pending_review');
      assert.equal(it.batchId, batchId);
      assert.ok(it.weightSource, 'weight provenance on the card');
    }
  });

  await test('P05', 'owner gate: approve flips one live, skip shelves the other', async () => {
    const ap = await F.req('POST', 'admin/catalogue/approve', { ids: [stagedIds[0]] }, ADMIN);
    assert.equal(ap.status, 200);
    assert.deepEqual(ap.json.published, [stagedIds[0]]);
    const sk = await F.req('POST', 'admin/catalogue/skip', { ids: [stagedIds[1]] }, ADMIN);
    assert.equal(sk.status, 200);
    assert.deepEqual(sk.json.skipped, [stagedIds[1]]);

    const list = await F.req('GET', 'products');
    assert.ok(list.json.products.some(p => p.id === stagedIds[0]), 'approved piece is now live');
    assert.ok(!list.json.products.some(p => p.id === stagedIds[1]), 'skipped piece never ships');
    const pdpSkip = await F.req('GET', 'products/' + stagedIds[1], {}, MEMBER);
    assert.equal(pdpSkip.status, 404, 'skipped PDP stays hidden');

    const q = await F.req('GET', 'admin/catalogue/queue', {}, ADMIN);
    assert.equal(q.json.items.length, 0, 'pending queue drained');
    const qb = q.json.batches.find(b => b.id === batchId);
    assert.equal(qb.counts.live, 1);
    assert.equal(qb.counts.skipped, 1);
    assert.equal(qb.status, 'published', 'batch resolves once nothing is pending');
  });

  await test('P06', 'batch publish: approve-all ships every pending piece in one tap', async () => {
    const r = await F.req('POST', 'admin/catalogue/batch', { label: 'Silver drop — anklets' }, ADMIN);
    const bid2 = r.json.batch.id;
    const items = [1, 2, 3].map(i => ({
      name: 'Silver anklet ' + i, sku: 'QA-SA-00' + i, category: 'silver', metal: 'Silver', purity: '925',
      weightG: 40 + i, images: ['/uploads/catalogue/x/a' + i + '.jpg'], weightSource: 'owner sheet row ' + i,
    }));
    const imp = await F.req('POST', 'admin/catalogue/import', { batchId: bid2, items }, ADMIN);
    assert.equal(imp.json.imported, 3);
    const pub = await F.req('POST', 'admin/catalogue/approve', { batchId: bid2, all: true }, ADMIN);
    assert.equal(pub.json.published.length, 3, 'batch published');
    const list = await F.req('GET', 'products');
    for (const id of imp.json.items.map(x => x.id))
      assert.ok(list.json.products.some(p => p.id === id), 'published piece live');
    // ledger view carries both batches with fresh counts
    const b = await F.req('GET', 'admin/catalogue/batches', {}, ADMIN);
    assert.equal(b.json.batches.length, 2);
    const view = b.json.batches.find(x => x.id === bid2);
    assert.equal(view.counts.total, 3);
    assert.equal(view.counts.pending, 0);
    assert.equal(view.counts.live, 3);
  });

  await test('P07', 'extracted production code: settlement composite ids + catalogue counts', async () => {
    const sid = fn('shv_settlement_id');
    let r = await F.run(`${sid} echo shv_settlement_id(['partnerId'=>'p1','weekEnding'=>'2026-09-21'], 3);`);
    assert.equal(r.body.trim(), 'p1_2026-09-21', 'composite key');
    r = await F.run(`${sid} echo shv_settlement_id(['id'=>'set_x','partnerId'=>'p1','weekEnding'=>'2026-09-21'], 3);`);
    assert.equal(r.body.trim(), 'set_x', 'explicit id wins');
    r = await F.run(`${sid} echo shv_settlement_id([], 3);`);
    assert.equal(r.body.trim(), 'set_3', 'position fallback — never skipped');

    const counts = fn('shv_catalog_counts');
    r = await F.run(`${counts}
      echo json_encode(shv_catalog_counts([
        ['batchId'=>'b1','status'=>'pending_review'], ['batchId'=>'b1','status'=>'live'],
        ['batchId'=>'b1','status'=>'skipped'], ['batchId'=>'b2','status'=>'live'],
      ], 'b1'));`);
    const c = JSON.parse(r.body.trim());
    assert.deepEqual(c, { total: 3, pending: 1, live: 1, skipped: 1 });
  });

  await test('P08', 'billing bridge: signed movements drive stock, idempotent, clamped; snapshots serve', async () => {
    const SECRET = 'qa-billing-secret-123456';
    // configure the key (16+ chars) and prove blank-never-wipes
    let s = await F.req('PUT', 'settings', { billingSyncSecret: SECRET }, ADMIN);
    assert.equal(s.status, 200);
    assert.equal(s.json.billingSyncSecret, SECRET);
    s = await F.req('PUT', 'settings', { billingSyncSecret: '' }, ADMIN);
    assert.equal(s.json.billingSyncSecret, SECRET, 'blank keeps the saved key');

    // pick a live product + its sku
    const list = await F.req('GET', 'products');
    const prod = list.json.products[0];

    // wrong secret → 401
    let r = await reqSigned('POST', 'billing/stock-movement', { movementId: 'mv1', delta: -1, sku: prod.sku }, 'wrong-secret');
    assert.equal(r.status, 401);
    // stale timestamp → 401
    r = await reqSigned('POST', 'billing/stock-movement', { movementId: 'mv1', delta: -1, sku: prod.sku }, SECRET, Math.floor(Date.now() / 1000) - 4000);
    assert.equal(r.status, 401);
    // good signature → movement lands
    r = await reqSigned('POST', 'billing/stock-movement', { movementId: 'mv1', delta: -1, sku: prod.sku, ref: 'BILL-1001', note: 'counter sale' }, SECRET);
    assert.equal(r.status, 200);
    assert.equal(r.json.result.stockBefore, prod.stock);
    assert.equal(r.json.result.stockAfter, prod.stock - 1);
    // idempotent replay → duplicate, stock unchanged
    r = await reqSigned('POST', 'billing/stock-movement', { movementId: 'mv1', delta: -1, sku: prod.sku }, SECRET);
    assert.equal(r.status, 200);
    assert.equal(r.json.duplicate, true);
    assert.equal(r.json.result.stockAfter, prod.stock - 1);
    // oversell clamps at zero — stock never goes negative
    r = await reqSigned('POST', 'billing/stock-movement', { movementId: 'mv2', delta: -100000, productId: prod.id }, SECRET);
    assert.equal(r.status, 200);
    assert.equal(r.json.result.stockAfter, 0);
    // signed stock snapshot + sku filter
    r = await reqSigned('GET', 'billing/stock', null, SECRET, undefined, { sku: prod.sku });
    assert.equal(r.status, 200);
    assert.equal(r.json.total, 1);
    assert.equal(r.json.products[0].sku, prod.sku);
    assert.equal(r.json.products[0].stock, 0);
    // the movement is visible in the admin audit trail
    const db = await F.db();
    assert.ok((db.auditLog || []).some(a => a.what === 'billing.stock-movement'), 'audited');
  });

  await test('P09', 'installer upgrade-sql.php renders and carries the v182 reconcilers', async () => {
    const src = fs.readFileSync(path.join(process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms'), 'upgrade-sql.php'), 'utf8');
    await F.run(`file_put_contents('/qa/upgrade-sql.php', base64_decode('${Buffer.from(src).toString('base64')}'));`);
    const r = await F.run(`$_SERVER['REQUEST_METHOD']='GET'; $_SERVER['REMOTE_ADDR']='203.0.113.11'; include '/qa/upgrade-sql.php';`);
    const html = Buffer.from(r.body).toString();
    assert.ok(html.includes('Shivaa SQL setup'), 'status page rendered');
    assert.ok(src.includes('shv_upsert_catalog_batches') && src.includes('shv_settlement_id') && src.includes('shv_upsert_settlements'), 'v182 reconcilers present');
  });

  await test('P10', 'Bridal request requires contact + privacy consent; no record is created on rejection', async () => {
    const db = seed(); db.serviceRequests = []; F.setDb(db);
    const body = { type: 'bridal', name: 'Asha Sharma', phone: '9876500021', interests: ['aad'], source: 'instagram' };
    const missing = await F.req('POST', 'services', body);
    assert.equal(missing.status, 400);
    assert.match(missing.json.error, /consent/i);
    assert.equal((await F.db()).serviceRequests.length, 0, 'rejected request is not stored');
    const privacyMissing = await F.req('POST', 'services', { ...body, contactConsent: true });
    assert.equal(privacyMissing.status, 400);
    assert.equal((await F.db()).serviceRequests.length, 0, 'privacy rejection is not stored');
  });

  let bridalId = '';
  await test('P11', 'Bridal intake validates, attributes the lead, separates opt-in and does not confirm a visit', async () => {
    const payload = {
      type: 'bridal', name: 'Asha Sharma', phone: '+91 98765 00021', email: '', village: 'Jayal',
      preferredDate: '2099-12-31', timePreference: 'afternoon', eventTimeline: '3-6-months', partySize: 4,
      travelHelp: true, interests: ['aad', 'rani-haar', 'invalid-code'], source: 'instagram',
      campaign: 'Wedding_Q4-2026', referralCode: 'JAYAL-42',
      contactConsent: true, privacyConsent: true, marketingConsent: false,
    };
    const r = await F.req('POST', 'services', payload);
    assert.equal(r.status, 200);
    assert.equal(r.json.ok, true);
    assert.ok(r.json.request.id, 'client receives a request reference');
    assert.equal(r.json.request.type, 'bridal');
    assert.equal(r.json.request.status, 'new', 'booking remains a request, never auto-confirmed');
    assert.equal(Object.hasOwn(r.json.request, 'phone'), false, 'public response does not echo personal contact details');
    bridalId = r.json.request.id;
    const db = await F.db();
    const saved = db.serviceRequests.find(x => x.id === bridalId);
    assert.ok(saved, 'saved in the existing serviceRequests store');
    assert.equal(saved.phone, '9876500021', 'normalizes the Indian phone');
    assert.deepEqual(saved.interests, ['aad', 'rani-haar'], 'unknown interest values are dropped');
    assert.equal(saved.preferredDate, '2099-12-31');
    assert.equal(saved.timePreference, 'afternoon');
    assert.equal(saved.eventTimeline, '3-6-months');
    assert.equal(saved.partySize, 4);
    assert.equal(saved.travelHelp, true);
    assert.equal(saved.source, 'instagram');
    assert.equal(saved.campaign, 'Wedding_Q4-2026');
    assert.equal(saved.referralCode, 'JAYAL-42');
    assert.equal(saved.contactConsent, true);
    assert.ok(saved.contactConsentAt && saved.privacyConsentAt, 'required consent timestamps stored');
    assert.equal(saved.marketingConsent, false, 'marketing is not bundled into appointment consent');
    assert.equal(saved.marketingConsentAt, '');
    assert.equal(saved.status, 'new');
    assert.equal(saved.history[0].s, 'new');
  });

  let mayraId = '';
  await test('P12', 'Mayra interest allowlist, attribution sanitation and date validation', async () => {
    const base = { type: 'mayra', name: 'Meera Devi', phone: '9876500022', contactConsent: true, privacyConsent: true,
      marketingConsent: true, interests: ['silver-articles', 'aad'], source: 'unsupported-source',
      campaign: 'Navratri <promo> 2026', referralCode: 'REF ! 8', preferredDate: '2099-12-31' };
    const r = await F.req('POST', 'services', base);
    assert.equal(r.status, 200);
    mayraId = r.json.request.id;
    const saved = (await F.db()).serviceRequests.find(x => x.id === mayraId);
    assert.equal(saved.type, 'mayra');
    assert.deepEqual(saved.interests, ['silver-articles']);
    assert.equal(saved.source, 'website', 'unknown attribution source falls back safely');
    assert.equal(saved.campaign, 'Navratri promo 2026', 'campaign is sanitized');
    assert.equal(saved.referralCode, 'REF8', 'referral code is sanitized');
    assert.equal(saved.marketingConsent, true);
    assert.ok(saved.marketingConsentAt);
    const withDuplicate = await F.db();
    withDuplicate.serviceRequests.push({ id: 'sr_same_phone', type: 'bridal', phone: '+91 98765 00022', status: 'new', marketingConsent: true });
    F.setDb(withDuplicate);
    for (const date of ['not-a-date', '2020-02-30', '2000-01-01']) {
      const invalid = await F.req('POST', 'services', { ...base, phone: date === 'not-a-date' ? '9876500023' : '9876500024', preferredDate: date });
      assert.equal(invalid.status, 400, `invalid preferred date ${date} rejected`);
    }
  });

  await test('P13', 'staff can see and advance leads only to confirmed-by-staff stages', async () => {
    const anon = await F.req('GET', 'services');
    assert.equal(anon.status, 403, 'lead list is admin-only');
    const member = await F.req('GET', 'services', {}, MEMBER);
    assert.equal(member.status, 403, 'customer cannot see lead list');
    const list = await F.req('GET', 'services', {}, ADMIN);
    assert.equal(list.status, 200);
    const bridal = list.json.requests.find(x => x.id === bridalId);
    assert.ok(bridal, 'bridal request visible to staff');
    assert.equal(bridal.campaign, 'Wedding_Q4-2026');
    assert.equal(bridal.referralCode, 'JAYAL-42');
    assert.equal(bridal.contactConsent, true);
    const denied = await F.req('PUT', 'services/' + bridalId + '/status', { status: 'appointment-confirmed' }, MEMBER);
    assert.equal(denied.status, 403, 'only staff may confirm');
    const changed = await F.req('PUT', 'services/' + bridalId + '/status', { status: 'appointment-confirmed' }, ADMIN);
    assert.equal(changed.status, 200);
    assert.equal(changed.json.request.status, 'appointment-confirmed');
    assert.equal(changed.json.request.history.at(-1).s, 'appointment-confirmed');
    const badStatus = await F.req('PUT', 'services/' + mayraId + '/status', { status: '<script>' }, ADMIN);
    assert.equal(badStatus.status, 400, 'unknown workflow stage rejected');
    const nonStaffOptOut = await F.req('PUT', 'services/' + mayraId + '/marketing', { consent: false }, MEMBER);
    assert.equal(nonStaffOptOut.status, 403, 'only staff can record consent changes');
    const cannotGrant = await F.req('PUT', 'services/' + mayraId + '/marketing', { consent: true }, ADMIN);
    assert.equal(cannotGrant.status, 400, 'staff cannot grant marketing permission');
    const optedOut = await F.req('PUT', 'services/' + mayraId + '/marketing', { consent: false }, ADMIN);
    assert.equal(optedOut.status, 200);
    assert.equal(optedOut.json.request.marketingConsent, false);
    assert.equal(optedOut.json.affected, 2, 'withdrawal suppresses optional updates for this mobile across related leads');
    assert.ok(optedOut.json.request.marketingOptOutAt, 'withdrawal timestamp returned');
    const afterOptOut = await F.db();
    const saved = afterOptOut.serviceRequests.find(x => x.id === bridalId);
    assert.equal(saved.status, 'appointment-confirmed');
    const mayraSaved = afterOptOut.serviceRequests.find(x => x.id === mayraId);
    assert.equal(mayraSaved.status, 'new');
    assert.equal(mayraSaved.marketingConsent, false, 'staff withdrawal is stored');
    assert.ok(mayraSaved.marketingOptOutAt);
    const duplicateSaved = afterOptOut.serviceRequests.find(x => x.id === 'sr_same_phone');
    assert.equal(duplicateSaved.marketingConsent, false, 'same mobile is opted out across related requests');
    assert.ok(duplicateSaved.marketingOptOutAt);
  });

  await test('P14', 'legacy service requests retain the existing service-request behavior', async () => {
    const db = seed(); db.serviceRequests = []; F.setDb(db);
    const r = await F.req('POST', 'services', { type: 'contact', name: 'Ravi Kumar', phone: '9876500025', details: 'Please call me' });
    assert.equal(r.status, 200);
    assert.equal(r.json.request.type, 'contact');
    assert.equal(r.json.request.name, 'Ravi Kumar');
    assert.equal(r.json.request.status, 'new');
    assert.equal(r.json.request.history[0].s, 'Booked', 'legacy history label is preserved');
    assert.equal((await F.db()).serviceRequests.length, 1);
  });

  console.log(`\nv183 PHP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
