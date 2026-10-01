/* v183 — executed PHP 8.3 suite for the SUPPLIER (MANUFACTURER) PROGRAMME.
   Runs the REAL api.php inside the isolated fixture:
     apply (OTP proof + unique codes) → owner approval → design assignment →
     order routing → supplier portal scoping → workflow → drop-ship switch →
     code rotation — and, at every step, the confidentiality law: neither the
     public product payload nor any order payload may carry the maker.
   What is NOT verified here, stated plainly: a live MySQL round-trip of the
   suppliers/supply_orders tables (owner-server verification through
   /upgrade-sql.php counts, exactly as with Phases 1–4), and real multipart
   HTTP upload plumbing (the route guards are executed; the CLI store path is
   the same one v182 exercises). */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v183 harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }
const leaks = obj => /"supplier(Id|Code|Sku|Name|Notes)?"|"costPerGram"/.test(JSON.stringify(obj));

(async () => {
  const F = await fixture();
  const db = seed();
  db.otps = [
    { phone: '9811100001', verified: true, purpose: 'login', exp: Math.floor(Date.now() / 1000) + 600 },
    { phone: '9811100002', verified: true, purpose: 'login', exp: Math.floor(Date.now() / 1000) + 600 },
  ];
  db.suppliers = [];
  db.supplyOrders = [];
  const design = db.products.find(p => p.active);
  F.setDb(db);

  let codeA = '', codeB = '', supA = '', tokenA = '';
  let orderId = '';

  await test('P01', 'release 183 lockstep telemetry on a JSON fixture', async () => {
    const v = await F.req('GET', 'version');
    assert.equal(v.status, 200);
    assert.ok(v.json.rel >= 183, 'rel floor 183, got ' + v.json.rel);
    assert.equal(v.json.stamp.matched, true);
    assert.equal(v.json.db.mode, 'json');
  });

  await test('P02', 'manufacturer application: OTP proof required, code minted UNIQUE', async () => {
    const noOtp = await F.req('POST', 'suppliers/apply', { firm: 'No OTP Works', email: 'nootp@qa.invalid', phone: '9811100009', password: 'supplier123' });
    assert.equal(noOtp.status, 400);
    assert.ok(/Verify your mobile/.test(noOtp.json.error), 'honest OTP demand');
    const a1 = await F.req('POST', 'suppliers/apply', { firm: 'Alpha Castings', email: 'alpha@qa.invalid', phone: '9811100001', password: 'supplier123', city: 'Rajkot', state: 'Gujarat' });
    assert.equal(a1.status, 200);
    assert.match(a1.json.supplier.code, /^SHV-SUP-[A-Z0-9]{5}$/, 'server-minted code shape');
    assert.equal(a1.json.supplier.status, 'pending');
    assert.ok(a1.json.token, 'portal token issued so the applicant can watch the status');
    const dup = await F.req('POST', 'suppliers/apply', { firm: 'Alpha Again', email: 'alpha@qa.invalid', phone: '9811100002', password: 'supplier123' });
    assert.equal(dup.status, 409, 'one application per email');
    const a2 = await F.req('POST', 'suppliers/apply', { firm: 'Beta Castings', email: 'beta@qa.invalid', phone: '9811100002', password: 'supplier123' });
    assert.equal(a2.status, 200);
    assert.notEqual(a2.json.supplier.code, a1.json.supplier.code, 'two suppliers, two codes');
    codeA = a1.json.supplier.code; codeB = a2.json.supplier.code; supA = a1.json.supplier.id; tokenA = a1.json.token;
  });

  await test('P03', 'a pending supplier is refused the portal until Shivaa approves', async () => {
    const r = await F.req('GET', 'supplier/designs', {}, tokenA);
    assert.equal(r.status, 403);
    assert.ok(r.json.error.includes(codeA), 'the applicant is told their reserved code');
    const appr = await F.req('PUT', 'admin/suppliers/' + supA, { status: 'approved' }, ADMIN);
    assert.equal(appr.status, 200);
    assert.equal(appr.json.supplier.status, 'approved');
    const ok = await F.req('GET', 'supplier/designs', {}, tokenA);
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.json.designs, []);
  });

  await test('P04', 'admin adoption: duplicate codes are impossible; login is created with the record', async () => {
    const dupCode = await F.req('POST', 'admin/suppliers', { firm: 'Copycat Works', code: codeA }, ADMIN);
    assert.equal(dupCode.status, 409);
    assert.ok(dupCode.json.error.includes('already taken'), 'uniqueness is enforced case-insensitively server-side');
    const made = await F.req('POST', 'admin/suppliers', { firm: 'Gamma Works', email: 'gamma@qa.invalid', password: 'supplier123', code: 'SHV-SUP-GAMMA', status: 'approved' }, ADMIN);
    assert.equal(made.status, 200);
    assert.equal(made.json.loginCreated, true);
    const lower = await F.req('POST', 'admin/suppliers', { firm: 'Case Clash', code: 'shv-sup-gamma' }, ADMIN);
    assert.equal(lower.status, 409, 'code comparison is case-insensitive');
    const list = await F.req('GET', 'admin/suppliers', {}, ADMIN);
    assert.equal(list.status, 200);
    assert.ok(list.json.suppliers.length >= 3);
    assert.ok(list.json.suppliers.every(s => /^SHV-SUP-/.test(s.code)), 'every supplier carries a code');
  });

  await test('P05', 'designs are linked internally; the public product payload NEVER reveals the maker', async () => {
    const before = await F.req('GET', 'products/' + design.id);
    assert.equal(before.status, 200);
    assert.ok(!leaks(before.json), 'pre-assignment payload clean');
    const asg = await F.req('POST', 'admin/suppliers/assign', { productIds: [design.id], supplierId: supA, supplierSku: 'AL-9' }, ADMIN);
    assert.equal(asg.status, 200);
    assert.equal(asg.json.designs, 1);
    const saved = await F.db();
    const row = saved.products.find(p => p.id === design.id);
    assert.equal(row.supplierId, supA, 'internal link stored');
    assert.equal(row.supplierCode, codeA);
    assert.equal(row.supplierSku, 'AL-9');
    const list = await F.req('GET', 'products');
    const pdp = await F.req('GET', 'products/' + design.id);
    assert.ok(!leaks(list.json) && !leaks(pdp.json), 'list + PDP payloads clean');
    assert.ok(!leaks(pdp.json.similar), 'similar grid clean');
    const map = await F.req('GET', 'admin/suppliers/designs', {}, ADMIN);
    assert.equal(map.status, 200);
    assert.equal((map.json.bySupplier[supA] || []).length, 1, 'admin sees the mapping');
  });

  await test('P06', 'an order freezes the routing: item snapshot stored, buyer payload clean', async () => {
    const ord = await F.req('POST', 'orders', {
      items: [{ productId: design.id, qty: 2 }], paymentMethod: 'Online',
      address: { name: 'QA Buyer', phone: '9876500009', line: '1 Test Rd', city: 'Jaipur', pincode: '302001', state: 'RJ' },
    }, MEMBER);
    assert.equal(ord.status, 200);
    assert.ok(!leaks(ord.json), 'order response carries no supplier keys');
    const saved = await F.db();
    const o = saved.orders[saved.orders.length - 1];
    orderId = o.id;
    assert.equal(o.items[0].supplierId, supA, 'routing snapshot frozen on the item');
    assert.equal(o.items[0].supplierCode, codeA);
    assert.deepEqual(o.supplyRouted, [supA]);
    const reread = await F.req('GET', 'orders', {}, MEMBER);
    assert.ok(!leaks(reread.json), 'member order list clean');
  });

  await test('P07', 'supplier scoping: own tickets only, no retail math, workshop shipping by default', async () => {
    const t1 = await F.req('GET', 'supplier/orders', {}, tokenA);
    assert.equal(t1.status, 200);
    assert.equal(t1.json.orders.length, 1);
    const t = t1.json.orders[0];
    assert.equal(t.orderId, orderId);
    assert.equal(t.status, 'routed');
    assert.equal(t.shipTo.mode, 'shivaa', 'default: the maker ships to the Shivaa workshop');
    assert.ok(!/unitPrice|ratePerGram|makingCharge|gst|discount|total/i.test(JSON.stringify(t.lines)), 'fulfilment projection hides retail math');
    assert.equal(t.lines[0].qty, 2);
    /* a second supplier must never see it, and neither may a customer */
    const gamma = await F.req('GET', 'admin/suppliers', {}, ADMIN);
    const gammaId = gamma.json.suppliers.find(s => s.code === 'SHV-SUP-GAMMA').id;
    F.setDb(Object.assign(await F.db(), { users: (await F.db()).users.concat([{ id: 'qaSupG', role: 'supplier', name: 'Gamma Works', phone: '9876500005', email: 'gamma@qa.invalid', supplierId: gammaId, addresses: [], wishlist: [] }]), tokens: Object.assign((await F.db()).tokens, { QA_SUPG: { userId: 'qaSupG', exp: Math.floor(Date.now() / 1000) + 86400 } }) }));
    const tg = await F.req('GET', 'supplier/orders', {}, 'QA_SUPG');
    assert.equal(tg.status, 200);
    assert.equal(tg.json.orders.length, 0, 'supplier B sees nothing of supplier A');
    const mem = await F.req('GET', 'supplier/orders', {}, MEMBER);
    assert.equal(mem.status, 403, 'customers cannot open a supplier route');
  });

  await test('P08', 'workflow: strict forward transitions by the supplier, force by admin, ownership enforced', async () => {
    const bad = await F.req('PUT', 'supplier/orders/' + orderId, { status: 'delivered' }, tokenA);
    assert.equal(bad.status, 400, 'cannot jump routed → delivered');
    const ack = await F.req('PUT', 'supplier/orders/' + orderId, { status: 'acknowledged', note: 'accepted, casting now' }, tokenA);
    assert.equal(ack.status, 200);
    assert.equal(ack.json.ticket.status, 'acknowledged');
    assert.equal(ack.json.ticket.note, 'accepted, casting now');
    const prod = await F.req('PUT', 'supplier/orders/' + orderId, { status: 'in_production' }, tokenA);
    assert.equal(prod.status, 200);
    const ready = await F.req('PUT', 'supplier/orders/' + orderId, { status: 'ready' }, tokenA);
    assert.equal(ready.status, 200);
    const disp = await F.req('PUT', 'supplier/orders/' + orderId, { status: 'dispatched' }, tokenA);
    assert.equal(disp.status, 200);
    /* admin forces delivered + the ticket ledger row is persisted */
    const force = await F.req('PUT', 'admin/suppliers/orders/' + orderId, { supplierId: supA, status: 'delivered', note: 'received at workshop' }, ADMIN);
    assert.equal(force.status, 200);
    const saved = (await F.db()).supplyOrders.find(t => t.orderId === orderId && t.supplierId === supA);
    assert.equal(saved.status, 'delivered');
    assert.ok(Array.isArray(saved.history) && saved.history.length >= 5, 'history trail kept');
    const all = await F.req('GET', 'admin/suppliers/orders', {}, ADMIN);
    assert.equal(all.json.orders.length, 1);
    assert.equal(all.json.suppliers[supA].code, codeA);
  });

  await test('P09', 'the drop-ship switch is the owner’s, and OFF means the buyer is protected', async () => {
    const bare = await F.req('GET', 'admin/suppliers/orders', {}, ADMIN);
    assert.equal(bare.json.portal.dropShip, false);
    assert.equal(bare.json.portal.revealCustomer, false);
    /* turning on the customer-facing switch WITHOUT drop-ship stays harmless */
    const s1 = await F.req('PUT', 'settings', { supplierSeesCustomer: true }, ADMIN);
    assert.equal(s1.status, 200);
    const stillSafe = await F.req('GET', 'supplier/orders', {}, tokenA);
    assert.equal(stillSafe.json.orders[0].shipTo.mode, 'shivaa', 'revealCustomer cannot act alone');
    /* owner turns drop-ship on: the supplier may now see where to deliver */
    const s2 = await F.req('PUT', 'settings', { supplierDropShip: true }, ADMIN);
    assert.equal(s2.status, 200);
    const drop = await F.req('GET', 'supplier/orders', {}, tokenA);
    assert.equal(drop.json.orders[0].shipTo.mode, 'customer');
    assert.equal(drop.json.orders[0].shipTo.city, 'Jaipur');
    /* strict boolean validation refuses a typo */
    const bad = await F.req('PUT', 'settings', { supplierDropShip: 'yes please' }, ADMIN);
    assert.equal(bad.status, 400);
  });

  await test('P10', 'code rotation is audited and rewrites live design attribution', async () => {
    const rot = await F.req('POST', 'admin/suppliers/' + supA + '/code', {}, ADMIN);
    assert.equal(rot.status, 200);
    assert.notEqual(rot.json.code, codeA);
    assert.equal(rot.json.previous, codeA);
    const saved = await F.db();
    const row = saved.products.find(p => p.id === design.id);
    assert.equal(row.supplierCode, rot.json.code, 'design attribution follows the new code');
    assert.equal(row.supplierId, supA, 'routing key is the ID, so history survives rotation');
    assert.ok(saved.auditLog.some(a => a.what === 'supplier.code.rotate'), 'rotation audited');
    const list = await F.req('GET', 'admin/suppliers', {}, ADMIN);
    const codes = list.json.suppliers.map(s => s.code);
    assert.equal(new Set(codes).size, codes.length, 'no duplicate codes anywhere in the book');
  });

  await test('P11', 'supplier design intake lands STAGED with the standing weight/purity law', async () => {
    const noWeight = await F.req('POST', 'supplier/designs', { name: 'Ghost Ring', purity: '22K', weightSource: 'tag', images: ['/uploads/supplier/x/a.jpg'] }, tokenA);
    assert.equal(noWeight.status, 400);
    assert.ok(/never guessed/.test(noWeight.json.error));
    const noSource = await F.req('POST', 'supplier/designs', { name: 'Ghost Ring', purity: '22K', weightG: 4.2, images: ['/uploads/supplier/x/a.jpg'] }, tokenA);
    assert.equal(noSource.status, 400);
    const sub = await F.req('POST', 'supplier/designs', { name: 'Supplier Kundan Ring', purity: '22K', weightG: 4.2, weightSource: 'our lot sheet 44', category: 'rings', metal: 'Gold', images: ['/uploads/supplier/x/a.jpg'], supplierSku: 'AL-77' }, tokenA);
    assert.equal(sub.status, 200);
    assert.equal(sub.json.product.status, 'pending_review');
    const saved = await F.db();
    const staged = saved.products.find(p => p.id === sub.json.product.id);
    assert.equal(staged.active, false, 'staged pieces stay hidden from the shop');
    assert.equal(staged.supplierId, supA);
    assert.ok(String(staged.weightSource).includes('supplier declaration'), 'weight provenance recorded');
    assert.ok(String(staged.batchId).startsWith('sup-'), 'supplier drop rides the v182 batch ledger');
    assert.ok(saved.catalogBatches.some(b => b.id === staged.batchId && b.source === 'supplier'), 'batch row created');
    const shop = await F.req('GET', 'products');
    assert.ok(!shop.json.products.some(p => p.id === staged.id), 'staged design invisible on the storefront');
    const queue = await F.req('GET', 'admin/catalogue/queue', {}, ADMIN);
    assert.ok(queue.json.items.some(i => i.id === staged.id), 'owner review queue carries it');
    const mine = await F.req('GET', 'supplier/designs', {}, tokenA);
    /* two rows: the catalogue design assigned in P05 + the freshly submitted one */
    assert.equal(mine.json.designs.length, 2);
    const mineStaged = mine.json.designs.find(d => d.id === staged.id);
    assert.ok(mineStaged, 'the supplier sees their own staged submission');
    assert.equal(mineStaged.status, 'pending_review');
    assert.equal(mineStaged.supplierSku, 'AL-77');
  });

  await test('P12', 'installer carries the supplier reconcilers and renders', async () => {
    const fs = require('fs'), path = require('path');
    const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
    const src = fs.readFileSync(path.join(CMS, 'upgrade-sql.php'), 'utf8');
    for (const needle of ['CREATE TABLE IF NOT EXISTS `suppliers`', 'UNIQUE KEY `uq_supplier_code`',
      'CREATE TABLE IF NOT EXISTS `supply_orders`', 'function shv_upsert_suppliers',
      'function shv_upsert_supply_orders', '$upSuppliers = shv_upsert_suppliers'])
      assert.ok(src.includes(needle), 'missing installer marker: ' + needle);
  });

  console.log(`\nv183 PHP: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
  process.exit(0);
})();
