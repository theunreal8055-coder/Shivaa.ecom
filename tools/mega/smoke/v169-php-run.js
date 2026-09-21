/* Money, OTP and persistence regressions. Each test executes production PHP;
   full API routes where possible, byte-exact AST-extracted functions otherwise.
   No production traffic, real OTPs, or repository database writes. */
const assert = require('node:assert/strict');
const {fixture,seed,ADMIN,MEMBER,source,fn,b64} = require('./php-api-fixture');
let pass=0, fail=0;
setTimeout(()=>{console.error('PHP test harness deadline exceeded');process.exit(1);},120000);
async function test(id,name,f) {try {await f(); pass++; console.log(`PASS ${id} ${name}`);} catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.message}`);} }
const addr = {name:'QA Buyer',phone:'9876500002',line:'QA fixture street',city:'QA City',state:'Rajasthan',pincode:'302001'};
(async()=>{
 const F=await fixture();
 const orderBody = (db,extra={})=>({items:[{id:db.products[0].id,qty:1}],address:addr,paymentMethod:'Online',...extra});
 const helpers = names=>names.map(fn).join('\n');
 await test('B01','stale unlocked save cannot erase a concurrent order',async()=>{
  const out=await F.run(`${helpers(['jout','db_load','db_save'])}
  $file='/qa/data/conflict.json'; file_put_contents($file,'{"orders":[]}');
  $old=db_load($file); file_put_contents($file,'{"orders":[{"id":"concurrent"}]}');
  $old['rates']=['QA'=>1]; db_save($file,$old); echo '{"unsafe":true}';`);
  assert.equal(out.status,409,out.body);const disk=await F.run("echo file_get_contents('/qa/data/conflict.json');");assert.equal(disk.json.orders[0].id,'concurrent');
 });
 await test('B01-control','sequential saves and intentional reloads remain writable',async()=>{
  const out=await F.run(`${helpers(['jout','db_load','db_save'])}
  $f='/qa/data/sequential.json';file_put_contents($f,'{"n":0}');$d=db_load($f);$d['n']=1;db_save($f,$d);$d['n']=2;db_save($f,$d);echo file_get_contents($f);`);
  assert.equal(out.json.n,2,out.body);
 });
 await test('B02','failed staging never invokes destructive live-file fallback',async()=>{
  const out=await F.run(`${helpers(['jout','db_save'])}
  class FailStage {public $context; function stream_open($u,$m,$o,&$p){if(str_contains($u,'.tmp-'))return false;if(str_contains($m,'w'))$GLOBALS['clobbered']=true;return true;} function stream_lock($op){return true;} function stream_write($d){return strlen($d);} function stream_close(){} }
  stream_wrapper_register('fault','FailStage');
  register_shutdown_function(function(){file_put_contents('/qa/data/staging-result.json',json_encode(['clobbered'=>!empty($GLOBALS['clobbered'])]));});
  db_save('fault://db', ['orders'=>[]]); echo '{}';`);
  assert.equal(out.status,500,out.body);const r=await F.run("echo file_get_contents('/qa/data/staging-result.json');");assert.equal(r.json.clobbered,false);
 });
 await test('B03','unavailable write lock fails closed',async()=>{
  const out=await F.run(`${helpers(['jout','shv_wants_write_lock','shv_acquire_lock'])}
  shv_acquire_lock('/missing/parent/db.json','orders','POST');echo '{}';`);assert.equal(out.status,503);
 });
 await test('B04','verified OTP is consumed in the original collection',async()=>{
  const out=await F.run(`${fn('otp_consume_verified')} $db=['otps'=>[['phone'=>'QA','verified'=>true],['phone'=>'QA','verified'=>true,'purpose'=>'reset']]]; otp_consume_verified($db,'QA');echo json_encode($db);`);
  assert.equal(out.json.otps[0].consumedByLogin,true);assert.equal(out.json.otps[1].consumedByLogin,undefined);
 });
 await test('B05','Cashfree attempt metadata is mutated and persisted even while ACTIVE',async()=>{
  const out=await F.run(`${helpers(['cashfree_apply','now_iso'])}
  function db_save($f,$d){$GLOBALS['saved']=$d;}
  $GLOBALS['DB_FILE']='fixture';$db=['orders'=>[['cfAttempts'=>[['cfOrderId'=>'QA-1','amount'=>100]]]]];
  $r=cashfree_apply($db,0,['order_status'=>'ACTIVE','payment_session_id'=>'qa-session'],'QA-1');echo json_encode(['db'=>$db,'saved'=>$GLOBALS['saved']??null]);`);
  assert.equal(out.json.db.orders[0].cfAttempts[0].lastState,'ACTIVE');assert.equal(out.json.saved.orders[0].cfAttempts[0].sessionId,'qa-session');
 });
 for (const [id,kind,route] of [['B06','metalOrders','metalexchange/orders/MX-QA'],['B07','bullionOrders','bullion/orders/BL-QA']]) await test(id,'admin '+kind+' status survives a subsequent read',async()=>{
  const db=seed();db[kind]=[{id:route.split('/').pop(),status:'New'}];F.setDb(db);
  const r=await F.req('PUT',route,{status:'Completed'},ADMIN);assert.equal(r.status,200,r.body);assert.equal((await F.db())[kind][0].status,'Completed');
 });
 await test('B08','GST re-verification updates the original partner rows',async()=>{
  const start=source.indexOf('    $updated = 0;',source.indexOf("$route === 'admin/gst-reverify'")); const end=source.indexOf('    audit_log(',start);assert(start>0&&end>start);
  const out=await F.run(`$db=['partners'=>[['kyc'=>['gstin'=>'QA-GST']]]];$g='QA-GST';$snap=['gstinLiveVerified'=>true];$info=['address'=>'QA lane','district'=>'QA district','state'=>'QA state','pincode'=>'302001'];${source.slice(start,end)} echo json_encode($db);`);
  assert.equal(out.json.partners[0].kyc.gstinLiveVerified,true);assert.equal(out.json.partners[0].pincode,'302001');
 });
 await test('B09','partner approval never invents sales or Paid settlements',async()=>{
  const db=seed();db.partners=[{id:'qaPartner',email:'member@qa.invalid',status:'pending'}];db.settlements=[{partnerId:'historic',sales:123,status:'Paid'}];F.setDb(db);
  const r=await F.req('PUT','partners/qaPartner',{status:'approved'},ADMIN);assert.equal(r.status,200,r.body);const saved=await F.db();assert.deepEqual(saved.settlements,db.settlements);assert.equal(saved.users[1].role,'partner');
 });
 await test('B10','unknown partner update returns 404, not false success',async()=>{ F.setDb(seed());assert.equal((await F.req('PUT','partners/absent',{status:'approved'},ADMIN)).status,404); });
 await test('B11','one guest cannot exhaust every guest’s account rate bucket',async()=>{
  const db=seed();db.rateLimit={'order-u|guest':{hits:Array(40).fill(Math.floor(Date.now()/1000)),until:Math.floor(Date.now()/1000)+900}};F.setDb(db);
  const r=await F.req('POST','orders',orderBody(db));assert.equal(r.status,200,r.body);
 });
 await test('B11/pay','guest payment-session throttle is not shared with every other guest',async()=>{
  const db=seed();db.rateLimit={'payorder-u|?':{hits:Array(60).fill(Math.floor(Date.now()/1000)),until:Math.floor(Date.now()/1000)+900}};F.setDb(db);
  const order=await F.req('POST','orders',orderBody(db));assert.equal(order.status,200,order.body);
  const r=await F.req('POST','pay/order',{orderId:order.json.id,pin:order.json.pin});assert.equal(r.status,200,r.body);assert.equal(r.json.mode,'upi-proof');
 });
 await test('B12','checkout rejects unavailable or unknown lines instead of a partial order',async()=>{
  for (const inactive of [true,false]) {const db=seed();const chosen=inactive?db.products[0].id:'does-not-exist';if(inactive) db.products[0].active=false;F.setDb(db);
   const body=orderBody(db,{items:[{id:db.products[1].id,qty:1},{id:chosen,qty:1}]});const r=await F.req('POST','orders',body,MEMBER);assert.equal(r.status,400,r.body);assert.equal((await F.db()).orders.length,0);}
 });
 await test('B13','normalized delivery phone is actually persisted',async()=>{const db=seed();F.setDb(db);const r=await F.req('POST','orders',orderBody(db,{address:{...addr,phone:'+91 98765 00002'}}),MEMBER);assert.equal(r.status,200,r.body);assert.equal(r.json.address.phone,'9876500002');});
 await test('B14','future-dated client rate locks cannot remain valid forever',async()=>{
  const db=seed();F.setDb(db);const r=await F.req('POST','orders',orderBody(db,{rateLock:{stampedAt:new Date(Date.now()+86400000).toISOString(),rates:{gold22:13900,gold24:14900,gold18:10900,silver:199}}}),MEMBER);assert.equal(r.status,200,r.body);assert.equal(r.json.rateSnapshot.locked,false);
 });
 await test('B15','payment-only admin PUT does not crash on absent status',async()=>{
  const db=seed();db.orders=[{id:'QA-order',userId:'qaMember',total:100,status:'Placed',paymentStatus:'Awaiting payment',timeline:[],items:[]}];F.setDb(db);
  const r=await F.req('PUT','orders/QA-order',{paymentStatus:'Paid'},ADMIN);assert.equal(r.status,200,r.body);assert.equal((await F.db()).orders[0].amountPaid,100);
 });
 await test('B16','review reminders wait six days after DELIVERY, not order creation',async()=>{
  const db=seed();db.orders=[{id:'QA-order',userId:'qaMember',userName:'QA Member',status:'Delivered',createdAt:new Date(Date.now()-20*86400000).toISOString(),timeline:[{s:'Delivered',t:new Date().toISOString()}],items:[{productId:'qaPiece',name:'QA'}]}];F.setDb(db);
  const r=await F.req('GET','admin/review-asks',{},ADMIN);assert.equal(r.status,200,r.body);assert.equal(r.json.asks.length,0);
 });
 await test('B17','missing referral code does not count every ordinary customer',async()=>{const db=seed();F.setDb(db);const r=await F.req('GET','referrals/stats',{},MEMBER);assert.equal(r.json.signedUp,0);});
 await test('B18','unpaid referred orders do not report earned referral rewards',async()=>{const db=seed();db.users[1].referralCode='SHQA123';db.users.push({id:'friend',referredBy:'SHQA123'});db.orders=[{id:'QA-order',userId:'friend',status:'Placed',paymentStatus:'Awaiting payment'}];F.setDb(db);const r=await F.req('GET','referrals/stats',{},MEMBER);assert.equal(r.json.completed,0);assert.equal(r.json.reward,0);});
 await test('B19','cancelling advisory-stock order cannot invent inventory',async()=>{
  const db=seed();db.products[0].stock=2;F.setDb(db);const r=await F.req('POST','orders',orderBody(db,{items:[{id:db.products[0].id,qty:5}]}),MEMBER);assert.equal(r.status,200,r.body);
  assert.equal((await F.req('PUT','orders/'+r.json.id,{status:'Cancelled'},ADMIN)).status,200);assert.equal((await F.db()).products[0].stock,2);assert.equal((await F.req('PUT','orders/'+r.json.id,{status:'Cancelled'},ADMIN)).status,200);assert.equal((await F.db()).products[0].stock,2);
 });
 await test('B20','private pin entropy is not returned in customer order responses',async()=>{
  const db=seed();F.setDb(db);const r=await F.req('POST','orders',orderBody(db));assert.equal(r.status,200,r.body);assert(r.json.pin);assert(!Object.hasOwn(r.json,'tail'));const saved=await F.db();assert(saved.orders[0].tail);
  const read=await F.req('GET','orders/'+r.json.id,{},'',{pin:r.json.pin});assert.equal(read.status,200);assert(!Object.hasOwn(read.json.order,'tail'));
  assert.equal((await F.req('GET','orders/'+r.json.id,{},'',{pin:'wrong'})).status,403);
 });
 await test('B21','feed outages hold known prices without random jitter or base-price clamping',async()=>{
  const out=await F.run(`${helpers(['rates_refresh','now_iso','clampn'])}
  const BASE_GOLD=11850.0,BASE_SILVER=168.0,PURITY_22=0.9167,PURITY_18=0.75,OZ=31.1034768;
  function spot_resolve($db){$empty=['price'=>0,'high'=>0,'low'=>0,'pct'=>0,'src'=>'QA-unavailable'];return ['gold'=>$empty,'silver'=>$empty,'inr'=>$empty];}
  function angel_mcx_from_tick($db){return null;} function angel_ltp(&$db){return null;}
  $db=['settings'=>[],'rates'=>['last'=>['gold24'=>15000,'silver'=>200,'source'=>'live','t'=>'2026-09-01T00:00:00+05:30'],'history'=>[]]];echo json_encode(rates_refresh($db));`);
  assert.equal(out.json.gold24,15000);assert.equal(out.json.silver,200);assert.equal(out.json.source,'cached');assert.equal(out.json.quotedAt,'2026-09-01T00:00:00+05:30');
 });
 await test('B22','Cashfree collected address keys reach the dispatch row, without overwriting typed addresses',async()=>{
  const db={settings:{invoiceSeq:100},users:[],orders:[{id:'QA-cf',userId:'guest',total:100,cfOcc:true,cfAttempts:[{cfOrderId:'CF-QA',amount:100}],address:{name:'Valued Customer',phone:'9876500002',line:'Collected on Cashfree (verified address)',city:'Pending verification',pincode:'000000'}}]};
  const out=await F.run(`${helpers(['cashfree_apply','cashfree_occ_capture','order_add_payment','order_issue_invoice','order_grant_points','now_iso','db_load','db_save','jout'])}
  function cashfree_cfg($db){return ['occ'=>true];} function cashfree_payment_detail($cfg,$id){return [];}
  function audit_log(&$db,$what,$meta=[]){$db['auditLog'][]=['what'=>$what];}
  function cashfree_fetch_order_extended($cfg,$id){return ['code'=>200,'json'=>['shipping_address'=>['name'=>'QA Buyer','address_line_one'=>'QA house','address_line_two'=>'QA lane','city'=>'QA City','state'=>'Rajasthan','pin_code'=>'302001'],'customer_details'=>['customer_phone'=>'+919876500002']]];}
  $DB_FILE='/qa/data/cf-confirm.json'; file_put_contents($DB_FILE,base64_decode('${b64(db)}')); $db=db_load($DB_FILE);
  cashfree_apply($db,0,['order_status'=>'PAID','order_amount'=>100],'CF-QA');
  cashfree_apply($db,0,['order_status'=>'PAID','order_amount'=>100],'CF-QA');
  $db=db_load($DB_FILE);$db['orders'][]=['id'=>'QA-typed','userId'=>'guest','total'=>100,'cfOcc'=>true,'cfAttempts'=>[['cfOrderId'=>'CF-TYPED','amount'=>100]],'address'=>['name'=>'Typed Buyer','line'=>'Original typed street','pincode'=>'341001']];
  cashfree_apply($db,1,['order_status'=>'PAID','order_amount'=>100],'CF-TYPED');echo file_get_contents($DB_FILE);`);
  assert(out.json,out.body);const o=out.json.orders[0];assert.equal(o.address.line,'QA house, QA lane');assert.equal(o.address.pincode,'302001');assert.equal(o.address.name,'QA Buyer');assert.equal(o.payments.length,1);assert.equal(o.amountPaid,100);assert(o.invoiceNo);assert.equal(out.json.orders[1].address.line,'Original typed street');
 });
 await test('B23','manual PAID spelling stays canonical and issues one invoice/loyalty grant',async()=>{
  const db=seed();db.orders=[{id:'QA-manual',userId:'qaMember',total:100,paymentStatus:'Awaiting payment',status:'Placed',timeline:[],items:[],pointsDeferred:true,earnedPoints:5}];F.setDb(db);
  for(let i=0;i<2;i++) assert.equal((await F.req('PUT','orders/QA-manual',{paymentStatus:'PAID'},ADMIN)).status,200);
  const saved=await F.db();assert.equal(saved.orders[0].paymentStatus,'Paid');assert(saved.orders[0].invoiceNo);assert.equal(saved.orders[0].payments.length,1);assert.equal(saved.users[1].loyaltyPoints,5);
 });
 await test('B24','zero metal rate rejects checkout even when making charges keep subtotal positive',async()=>{
  const db=seed();db.rates.override={gold24:0,gold22:0,gold18:0,silver:0};db.products[0].mcScheme='flat';db.products[0].mcValue=500;F.setDb(db);
  const r=await F.req('POST','orders',orderBody(db),MEMBER);assert.equal(r.status,503,r.body);assert.equal((await F.db()).orders.length,0);
 });
 await test('B24-control','missing anchors stay zero; healthy premiums and manual rate overrides remain intact',async()=>{
  const out=await F.run(`${helpers(['jaipur_from_anchor','gold24_premium','gold22_premium','current_rates'])}
  const PURITY_22=0.9167,PURITY_18=0.75;
  function live_tick_quote($db,$age){return null;} function bullion_anchors($db){return ['mcxOn'=>false];}
  $db=['settings'=>[],'rates'=>['last'=>['gold24'=>0,'gold22'=>0,'gold18'=>0,'silver'=>0]]];
  echo json_encode(['empty'=>jaipur_from_anchor($db,[]),'emptyStored'=>current_rates($db),'healthy'=>jaipur_from_anchor($db,['goldPerG'=>15000,'silverPerG'=>200]),'override'=>current_rates(['rates'=>['override'=>['gold24'=>15398,'gold22'=>14149,'gold18'=>11291,'silver'=>203]]])]);`);
  assert.deepEqual(out.json.empty,{gold24:0,gold22:0,gold18:0,silver:0});assert.deepEqual(out.json.emptyStored,out.json.empty);assert.equal(out.json.healthy.gold24,15398);assert.equal(out.json.healthy.gold22,14149);assert.equal(out.json.override.gold24,15398);
 });
 await test('B21-control','healthy feed leg is retained when the other provider is unavailable',async()=>{
  const out=await F.run(`${helpers(['rates_refresh','now_iso','clampn'])}
  const BASE_GOLD=11850.0,BASE_SILVER=168.0,PURITY_22=0.9167,PURITY_18=0.75,OZ=31.1034768;
  function spot_resolve($db){$e=['price'=>0,'high'=>0,'low'=>0,'pct'=>0,'src'=>'QA'];return ['gold'=>array_replace($e,['price'=>5000]),'silver'=>$e,'inr'=>array_replace($e,['price'=>100])];}
  function angel_mcx_from_tick($db){return null;} function angel_ltp(&$db){return null;}
  $db=['settings'=>[],'rates'=>['last'=>['gold24'=>15000,'silver'=>200],'history'=>[]]];echo json_encode(rates_refresh($db));`);
  assert.equal(out.json.gold24,Math.round(500000/31.1034768));assert.equal(out.json.silver,200);assert.equal(out.json.source,'partial');
 });
 console.log(`\nv169 PHP: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
