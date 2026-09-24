/* v178 — executed PHP regression re-run on the 178 tree. v178 ships no
   API change (the in-footer app band + QR + release stamps only), so the
   full v177 suite carries over unchanged: it proves the 178 re-stamp
   disturbed none of the v176/v177 repairs, and the version endpoint now
   answers 178 with a matched handshake.
   Every test runs production api.php under PHP 8.3 against an isolated
   fixture database in /qa. No production traffic, no repository DB writes.

   The ten-order book (unchanged since v176): 2 failed Cashfree gateway
   tests (Awaiting payment), 2 paid, 1 COD (Pending (COD)), 1 WhatsApp
   enquiry, 1 UPI proof, 1 partial, 1 refunded, 1 cancelled.
   Money actually received: 62000 + 35000 + 50000 = 147000. */
const assert = require('node:assert/strict');
const {fixture,seed,ADMIN} = require('./php-api-fixture');
let pass=0, fail=0;
setTimeout(()=>{console.error('v178 harness deadline exceeded');process.exit(1);},180000);
async function test(id,name,f) {try {await f(); pass++; console.log(`PASS ${id} ${name}`);} catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.message}`);} }

function book(day) {
  const mk = (id, ps, method, total, extra = {}) => ({
    id, userId:'qaMember', userName:'QA Buyer', createdAt:day+'T10:00:00',
    status: extra.status || 'Placed', paymentStatus: ps, paymentMethod: method,
    total, amountPaid: extra.amountPaid ?? 0, payments: extra.payments ?? [],
    items: [{name:'QA piece', qty:1, unitPrice:total, makingCharge:0, gst:0, productId:'qaP'}],
    shipping:0, prepaidDiscount:0, ...extra,
  });
  return [
    mk('QA-gw-1','Awaiting payment','Online',120000,{cfLastFailure:{cfOrderId:'QA-CF-1',at:day+'T10:01:00'},address:{name:'GW Tester'}}),
    mk('QA-gw-2','Awaiting payment','Online',98000,{cfLastFailure:{cfOrderId:'QA-CF-2',at:day+'T10:02:00'},address:{name:'GW Tester'}}),
    mk('QA-paid-1','Paid','Online',62000,{amountPaid:62000,paidAt:day+'T11:00:00',
      payments:[{amount:62000,at:day+'T11:00:00',status:'approved',mode:'online'}],address:{name:'Happy Bride'}}),
    mk('QA-paid-2','Paid','WhatsApp',35000,{amountPaid:35000,paidAt:day+'T12:00:00',
      payments:[{amount:35000,at:day+'T12:00:00',status:'approved',mode:'upi'}],address:{name:'WhatsApp Bride'}}),
    mk('QA-cod-1','Pending (COD)','COD',45000,{}),
    mk('QA-wa-1','Confirm on WhatsApp','WhatsApp',21000,{}),
    mk('QA-proof-1','Proof submitted','Online',30000,{payProof:{at:day+'T13:00:00',status:'submitted'}}),
    mk('QA-partial-1','Partially paid','Online',100000,{amountPaid:50000,
      payments:[{amount:50000,at:day+'T14:00:00',status:'approved',mode:'bank'}],address:{name:'Advance Bride'}}),
    mk('QA-ref-1','Refunded','Online',80000,{amountPaid:80000,
      payments:[{amount:80000,at:day+'T15:00:00',status:'approved',mode:'online'}],
      refunds:[{amount:80000,state:'SUCCESS'}],address:{name:'Refund Bride'}}),
    mk('QA-cxl-1','Awaiting payment','Online',15000,{status:'Cancelled'}),
  ];
}
(async()=>{
 const F=await fixture();
 const today=(await F.run("echo date('Y-m-d');")).body.trim();
 const tmrw=(await F.run("echo date('Y-m-d', time()+86400);")).body.trim();
 const seedBook = (orders, extra={}) => { const db=seed(); db.orders=orders; Object.assign(db,extra); F.setDb(db); };
 const clearBackups = async () => { await F.run(`foreach (glob('/qa/data/backups/db-before-purge-*.json') as $f) unlink($f); echo 'ok';`); };
 const backupNames = async () => (await F.run("echo json_encode(glob('/qa/data/backups/db-before-purge-*.json'));")).json;
 const backupJson = async (f) => JSON.parse((await F.run(`echo file_get_contents('${f}');`)).body);

 /* ── the v176 core must still hold: one definition of money received ── */
 await test('V01','failed gateway tests are not sales in stats/reports/cashbook',async()=>{
  seedBook(book(today));
  const st=await F.req('GET','admin/stats',{},ADMIN); assert.equal(st.status,200,st.body);
  assert.equal(st.json.revenue,147000,'62000+35000+partial 50000; gateway tests, COD, proof, refund excluded');
  assert.equal(st.json.paidOrders,3); assert.equal(st.json.unpaidOrders,6,'9 live non-cancelled minus 3 with money');
  assert.equal(st.json.aov,49000);
  const days=Object.entries(st.json.byDay); assert.equal(days.length,1);
  assert.equal(days[0][1],147000,'daily chart counts only money received');
  const rp=await F.req('GET','admin/reports',{},ADMIN,{from:today,to:tmrw}); assert.equal(rp.status,200,rp.body);
  assert.equal(rp.json.revenue,147000); assert.equal(rp.json.paidOrders,3); assert.equal(rp.json.unpaidOrders,6);
  assert.equal(rp.json.pendingAmount,394000,'120000+98000+45000+21000+30000+80000 with no money in hand (refunded row included)');
  const cb=await F.req('GET','admin/cashbook',{},ADMIN,{date:today}); assert.equal(cb.status,200,cb.body);
  assert.equal(cb.json.orderSales,227000,'every approved ledger row received today, incl. the 80000 later refunded');
  assert.equal(cb.json.onlineSales,192000,'62000+50000+80000'); assert.equal(cb.json.waSales,35000);
  assert.equal(cb.json.codSales,0,'COD cash not yet in hand');
 });

 /* ── V02/V03 — the preview must honour the scope the UI selected ── */
 await test('V02','GET preview with scope=all previews the full reset, not the safe slice',async()=>{
  seedBook(book(today));
  const all=await F.req('GET','admin/purge-unpaid',{},ADMIN,{scope:'all'});
  assert.equal(all.status,200,all.body);
  assert.equal(all.json.scope,'all','v176 bug: the GET always answered unpaid');
  assert.equal(all.json.wouldDelete,10); assert.equal(all.json.wouldKeep,0);
  assert.equal(all.json.valueRemoved,606000);
  assert.equal(all.json.needsPhrase,'DELETE ALL SALES');
  assert.equal(all.json.byPaymentStatus['Pending (COD)'],1,'COD rows visible in the all-scope preview');
  assert.equal(all.json.byPaymentStatus['Paid'],2);
 });
 await test('V03','GET preview without a scope stays on the safe unpaid slice',async()=>{
  seedBook(book(today));
  const p=await F.req('GET','admin/purge-unpaid',{},ADMIN);
  assert.equal(p.status,200,p.body);
  assert.equal(p.json.scope,'unpaid'); assert.equal(p.json.wouldDelete,5);
  assert.equal(p.json.wouldKeep,5); assert.equal(p.json.needsPhrase,'DELETE UNPAID');
  const bad=await F.req('GET','admin/purge-unpaid',{},ADMIN,{scope:'banana'});
  assert.equal(bad.json.scope,'unpaid','unknown scopes collapse to the safe default');
 });
 await test('V15','the preview writes nothing: no rows, no backup, no audit line',async()=>{
  seedBook(book(today));
  const before=(await F.run("echo file_get_contents('/qa/data/db.json');")).body;
  await F.req('GET','admin/purge-unpaid',{},ADMIN,{scope:'all'});
  await F.req('GET','admin/purge-unpaid',{},ADMIN,{scope:'unpaid'});
  const after=(await F.run("echo file_get_contents('/qa/data/db.json');")).body;
  assert.equal(after,before,'db.json byte-identical after previews');
  assert.equal((await backupNames()).length,0,'no backup from a read-only preview');
  assert.equal((await F.db()).auditLog.filter(a=>a.what==='sales.purge-unpaid').length,0);
 });

 /* ── V04/V05 — the safe delete: exact phrase, backup first, orders only ── */
 await test('V04','POST unpaid with the exact phrase deletes only unpaid attempts, backup first',async()=>{
  await clearBackups();
  seedBook(book(today),{partners:[{id:'qaPartner',status:'approved',email:'p@qa.invalid'}]});
  const before=await F.db();
  const usersBefore=JSON.stringify(before.users);
  const productsBefore=JSON.stringify(before.products);
  const r=await F.req('POST','admin/purge-unpaid',{scope:'unpaid',confirm:'DELETE UNPAID'},ADMIN);
  assert.equal(r.status,200,r.body);
  assert.equal(r.json.deleted,5); assert.equal(r.json.kept,5);
  assert.equal(r.json.valueRemoved,284000,'120000+98000+21000+30000+15000');
  const db=await F.db();
  assert.deepEqual(db.orders.map(o=>o.id).sort(),['QA-cod-1','QA-paid-1','QA-paid-2','QA-partial-1','QA-ref-1'],
   'paid, partially-paid, COD and refunded orders survive');
  assert.equal(JSON.stringify(db.users),usersBefore,'B2B and B2C customers byte-identical');
  assert.deepEqual(db.partners,before.partners,'partners untouched');
  assert.equal(JSON.stringify(db.products),productsBefore,'products untouched');
  const bks=await backupNames();
  assert.equal(bks.length,1,'exactly one backup written');
  const pre=await backupJson(bks[0]);
  assert.equal(pre.orders.length,10,'backup holds the pre-purge book');
  const audit=db.auditLog.filter(a=>a.what==='sales.purge-unpaid');
  assert.equal(audit.length,1); assert.equal(audit[0].meta.by,'QA Admin','audit carries the admin identity');
  assert.equal(audit[0].meta.scope,'unpaid'); assert.equal(audit[0].meta.deleted,5);
  assert.ok(r.json.note.includes('every paid, partially-paid, COD and refunded order were untouched'));
 });
 await test('V05','wrong or missing phrase deletes nothing and writes no backup',async()=>{
  seedBook(book(today));
  assert.equal((await backupNames()).length,1,'V04\'s backup still on disk');
  const r1=await F.req('POST','admin/purge-unpaid',{scope:'unpaid',confirm:'DELETE UNPAID.'},ADMIN);
  assert.equal(r1.status,400,r1.body);
  const r2=await F.req('POST','admin/purge-unpaid',{scope:'unpaid'},ADMIN);
  assert.equal(r2.status,400,r2.body);
  assert.equal((await backupNames()).length,1,'refused runs wrote nothing');
  assert.equal((await F.db()).orders.length,10,'book unchanged by the refused runs');
  const r3=await F.req('POST','admin/purge-unpaid',{scope:'unpaid',confirm:'delete unpaid'},ADMIN);
  assert.equal(r3.status,200,'case-insensitive phrase still works');
  assert.equal(r3.json.deleted,5);
  assert.equal((await backupNames()).length,2,'the confirmed run wrote its own backup, same second as V04\'s');
 });
 await test('V06','scope=all refuses the short phrase — a stray click cannot reset sales',async()=>{
  const r=await F.req('POST','admin/purge-unpaid',{scope:'all',confirm:'DELETE UNPAID'},ADMIN);
  assert.equal(r.status,400,r.body);
  assert.equal(r.json.needsPhrase,'DELETE ALL SALES');
  assert.equal((await F.db()).orders.length,5,'nothing removed (V05\'s five survivors intact)');
  assert.equal((await backupNames()).length,2,'the refused reset wrote no backup');
 });

 /* ── V07/V08 — the full reset: longer phrase, scope-honest note, unique backups ── */
 await test('V07','POST all with DELETE ALL SALES resets the order book, note tells the truth',async()=>{
  seedBook(book(today));
  const r=await F.req('POST','admin/purge-unpaid',{scope:'all',confirm:'DELETE ALL SALES'},ADMIN);
  assert.equal(r.status,200,r.body);
  assert.equal(r.json.deleted,10); assert.equal(r.json.kept,0);
  assert.equal((await F.db()).orders.length,0);
  assert.ok(!r.json.note.includes('every paid order were untouched'),
   'v176 bug: the all-scope note must not claim paid orders survived');
  assert.ok(r.json.note.includes('reset'),'note says the book was reset');
  assert.equal((await F.db()).users.length,2,'customers survive the full reset');
 });
 await test('V08','same-second backups are distinct, complete files — no collision overwrite',async()=>{
  const bks=await backupNames();
  assert.equal(bks.length,3,'V05 + V07 backups plus V04 — all within one second, no overwrite');
  assert.equal(new Set(bks).size,3,'names unique');
  for (const f of bks) {
    const snap=await backupJson(f);
    assert.equal(snap.orders.length,10,'each snapshot holds the full pre-purge book');
    assert.equal(snap.users.length,2);
    for (const k of ['partners','products','coupons','reviews']) assert.ok(Array.isArray(snap[k]),k+' intact');
  }
 });
 await test('V14','retention keeps at most 10 purge backups',async()=>{
  // 3 real backups exist; add 8 older fake ones → 11, the next purge trims to 10
  await F.run(`for ($i=1;$i<=8;$i++) file_put_contents('/qa/data/backups/db-before-purge-20260901-00000'.$i.'.json', json_encode(['orders'=>[$i]])); echo 'ok';`);
  seedBook(book(today));
  await F.req('POST','admin/purge-unpaid',{scope:'unpaid',confirm:'DELETE UNPAID'},ADMIN);
  const n=(await F.run("echo count(glob('/qa/data/backups/db-before-purge-*.json'));")).body.trim();
  assert.equal(n,'10','the 10 newest backups are kept, the oldest dropped');
 });

 /* ── V09/V10 — crash-proofing: malformed legacy rows cannot 500 the admin ── */
 await test('V09','a paid order missing createdAt does not 500 the dashboard chart',async()=>{
  const o=book(today);
  o.push({id:'QA-legacy',userId:'qaMember',userName:'Legacy',status:'Delivered',
   paymentStatus:'Paid',paymentMethod:'Online',total:9000,amountPaid:9000,paidAt:today+'T09:00:00',
   payments:[{amount:9000,at:today+'T09:00:00',status:'approved',mode:'online'}],items:[]});
  delete o[o.length-1].createdAt;   // no createdAt key at all
  seedBook(o);
  const st=await F.req('GET','admin/stats',{},ADMIN);
  assert.equal(st.status,200,st.body);
  assert.equal(st.json.revenue,156000,'147000 + 9000 legacy');
  assert.equal(Object.keys(st.json.byDay).length,1,'the undated row is skipped, not fatal');
 });
 await test('V10','a legacy string address in the preview sample does not TypeError',async()=>{
  const o=book(today);
  o[0].address='QA street, Jaipur';   // pre-array legacy shape
  seedBook(o);
  const p=await F.req('GET','admin/purge-unpaid',{},ADMIN,{scope:'unpaid'});
  assert.equal(p.status,200,p.body);
  assert.equal(p.json.sample[0].name,'QA Buyer','falls back to userName');
 });

 /* ── V11–V13 — the day book counts money on the day it arrives ── */
 await test('V11','COD cash is counted the day it is collected, not before or after',async()=>{
  const o=book(today);
  // the owner marks the COD order Paid today — the ledger row lands today
  o[4].paymentStatus='Paid'; o[4].amountPaid=45000; o[4].paidAt=today+'T18:00:00';
  o[4].payments=[{amount:45000,at:today+'T18:00:00',status:'approved',mode:'cash'}];
  seedBook(o);
  const cb=await F.req('GET','admin/cashbook',{},ADMIN,{date:today});
  assert.equal(cb.json.codSales,45000,'v176 bug: the COD tile read 0 on collection day');
  assert.equal(cb.json.orderSales,272000,'227000 + 45000 COD cash');
  const tmrwCb=await F.req('GET','admin/cashbook',{},ADMIN,{date:tmrw});
  assert.equal(tmrwCb.json.codSales,0,'the cash is not counted on a later day');
  seedBook(book(today));
  const cb2=await F.req('GET','admin/cashbook',{},ADMIN,{date:today});
  assert.equal(cb2.json.codSales,0,'an uncollected COD order contributes nothing');
 });
 await test('V12','a UPI proof is counted on the day the owner approves it',async()=>{
  const o=book(today);
  // submitted on a fixed earlier day, approved today: approvedAt must win over at
  o[6].payments=[{amount:30000,at:'2026-09-01T13:00:00',status:'approved',approvedAt:today+'T09:30:00',mode:'upi-qr'}];
  o[6].amountPaid=30000; o[6].paidAt=today+'T09:30:00'; o[6].paymentStatus='Paid';
  seedBook(o);
  const cb=await F.req('GET','admin/cashbook',{},ADMIN,{date:today});
  assert.equal(cb.json.onlineSales,222000,'192000 + 30000 approved today');
  const old=await F.req('GET','admin/cashbook',{},ADMIN,{date:'2026-09-01'});
  assert.equal(old.json.onlineSales,0,'not double-counted on the submission day');
 });
 await test('V13','legacy orders without a ledger count once, on paidAt then createdAt',async()=>{
  const o=book(today);
  o.push({id:'QA-legacy2',userId:'qaMember',userName:'Old Row',createdAt:'2026-09-02T10:00:00',
   status:'Delivered',paymentStatus:'Partially paid',paymentMethod:'Online',total:12000,
   amountPaid:7000,paidAt:today+'T10:00:00',items:[]});   // no payments[] key at all
  seedBook(o);
  const cb=await F.req('GET','admin/cashbook',{},ADMIN,{date:today});
  assert.equal(cb.json.orderSales,234000,'227000 + 7000 legacy once, on the paidAt day');
  const cb2=await F.req('GET','admin/cashbook',{},ADMIN,{date:'2026-09-02'});
  assert.equal(cb2.json.orderSales,0,'...and not again on the createdAt day');
 });
 await test('V16','cancelled orders with money in the ledger are excluded from the day book',async()=>{
  const o=book(today);
  o.push({id:'QA-cxl-paid',userId:'qaMember',userName:'Cancelled',createdAt:today+'T10:00:00',
   status:'Cancelled',paymentStatus:'Paid',paymentMethod:'Online',total:5000,amountPaid:5000,
   paidAt:today+'T10:05:00',payments:[{amount:5000,at:today+'T10:05:00',status:'approved',mode:'online'}],items:[]});
  seedBook(o);
  const cb=await F.req('GET','admin/cashbook',{},ADMIN,{date:today});
  assert.equal(cb.json.orderSales,227000,'the cancelled row contributes nothing');
 });
 await test('V17','the version endpoint reports 178 with a matched handshake',async()=>{
  const v=await F.req('GET','version',{});
  assert.equal(v.status,200,v.body);
  assert.equal(v.json.rel,178);
  assert.equal(v.json.stamp.matched,true,'index/app/sw stamps in lockstep');
  assert.equal(v.json.stamp.index,178); assert.equal(v.json.stamp.app,178); assert.equal(v.json.stamp.sw,178);
 });

 console.log(`\nv178 PHP: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
