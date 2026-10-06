/* v186 — executed PHP 8.3 acceptance for the shortest retail onboarding and
   complete Black lifecycle. Real cms/api.php in an isolated WASM filesystem;
   no repository, production, SMS, payment or customer writes. */
const assert=require('node:assert/strict');
const {fixture,seed,ADMIN,MEMBER}=require('./php-api-fixture');
let pass=0,fail=0;
const address={name:'QA Member',phone:'9876500002',line:'1 Fixture Street',city:'Jaipur',state:'Rajasthan',pincode:'302001',country:'India'};
setTimeout(()=>{console.error('v186 PHP harness deadline exceeded');process.exit(1)},210000);
async function test(id,name,fn){try{await fn();pass++;console.log(`PASS ${id} ${name}`)}catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.stack||e.message}`)}}
function fresh(){const db=seed();db.users.push({id:'qaOther',role:'customer',name:'QA Other',phone:'9876500003',email:'other@qa.invalid',addresses:[],wishlist:[],loyaltyPoints:0});db.tokens.qa186other={userId:'qaOther',exp:Math.floor(Date.now()/1000)+86400};return db}
function sixMonths(issued,expires){const a=new Date(issued),b=new Date(expires);assert.ok(Number.isFinite(+a)&&Number.isFinite(+b));let y=a.getUTCFullYear(),m=a.getUTCMonth()+6;y+=Math.floor(m/12);m%=12;assert.deepEqual([b.getUTCFullYear(),b.getUTCMonth(),b.getUTCDate()],[y,m,a.getUTCDate()]);}
(async()=>{
 const F=await fixture();
 async function claim(db=fresh(),token=MEMBER){F.setDb(db);const r=await F.req('POST','black-card/claim',{},token);assert.equal(r.status,200,r.body);return r.json.membership}
 await test('P01','release 186 reports one matched API/index/app/worker handshake',async()=>{
  F.setDb(fresh());const r=await F.req('GET','version');assert.equal(r.status,200,r.body);assert.equal(r.json.rel,186);assert.equal(r.json.shell,'shivaa-shell-v186');assert.deepEqual([r.json.stamp.index,r.json.stamp.app,r.json.stamp.sw],[186,186,186]);assert.equal(r.json.stamp.matched,true);
 });
 await test('P02','a verified new mobile can register with only a name and claim immediately',async()=>{
  const phone='9876500186',db=fresh();db.otps.push({phone,purpose:'login',verified:true,consumedByLogin:false,exp:Math.floor(Date.now()/1000)+3600,at:Math.floor(Date.now()/1000)});F.setDb(db);
  const reg=await F.req('POST','auth/register',{name:'Asha Verma',phone});assert.equal(reg.status,200,reg.body);assert.ok(reg.json.token);assert.equal(reg.json.user.name,'Asha Verma');assert.equal(reg.json.user.phone,phone);assert.equal(reg.json.user.email,phone+'@phone.shivaa.in');assert.ok(!reg.json.user.profile||Object.keys(reg.json.user.profile).length===0);
  const made=await F.req('POST','black-card/claim',{},reg.json.token);assert.equal(made.status,200,made.body);assert.equal(made.json.created,true);const c=made.json.membership;assert.equal(c.holderName,'Asha Verma');assert.equal(c.mobile,phone);assert.equal(c.discountPct,20);assert.equal(c.discountBasis,'making-charges');assert.equal(c.permanentRecord,true);sixMonths(c.issuedAt,c.expiresAt);
  const saved=await F.db(),u=saved.users.find(x=>x.phone===phone);assert.ok(u.blackCard);assert.equal(saved.coupons.filter(x=>x.id===u.blackCard.couponId).length,1);
 });
 await test('P03','Black is retail-only even when admin or partner is authenticated',async()=>{
  const db=fresh();db.users.push({id:'qaPartner186',role:'partner',name:'QA Partner',phone:'9876500188',email:'partner186@qa.invalid',addresses:[]});db.tokens.qa186partner={userId:'qaPartner186',exp:Math.floor(Date.now()/1000)+86400};F.setDb(db);
  const admin=await F.req('POST','black-card/claim',{},ADMIN),partner=await F.req('POST','black-card/claim',{},'qa186partner');assert.equal(admin.status,403);assert.equal(partner.status,403);assert.match(admin.json.error,/retail customers/i);assert.match(partner.json.error,/retail customers/i);
  const after=await F.db();assert.equal(after.users.find(x=>x.id==='qaPartner186').blackCard,undefined);assert.ok(!after.users.find(x=>x.role==='admin').blackCard);
 });
 await test('P04','repeat claim preserves identity, issue date and exact six-month expiry forever',async()=>{
  const card=await claim();const first=await F.db();const audit=first.auditLog.filter(x=>x.what==='black-card.claim').length;
  const again=await F.req('POST','black-card/claim',{},MEMBER);assert.equal(again.status,200,again.body);assert.equal(again.json.created,false);for(const k of ['memberId','cardNumber','couponCode','issuedAt','expiresAt','certificateNo','certificateIssuedAt'])assert.equal(again.json.membership[k],card[k],k);sixMonths(card.issuedAt,card.expiresAt);
  const done=await F.db();assert.equal(done.auditLog.filter(x=>x.what==='black-card.claim').length,audit);assert.equal(done.coupons.filter(x=>x.id===card.couponId).length,1);
 });
 await test('P05','preview and multi-line order discount exactly 20% of making charges only',async()=>{
  const card=await claim(),db=await F.db();const ps=db.products.filter(x=>x.active&&Number(x.mcValue)>0).slice(0,2);assert.ok(ps.length>=2,'fixture needs two making-charge products');
  const items=[{id:ps[0].id,qty:2},{id:ps[1].id,qty:3}];const previewBasis=12345,preview=await F.req('POST','coupons/validate',{code:card.cardNumber.replace(/\s/g,''),amount:999999,makingAmount:previewBasis},MEMBER);assert.equal(preview.status,200,preview.body);assert.equal(preview.json.discount,Math.round(previewBasis*.2));assert.equal(preview.json.type,'making_percent');assert.equal(preview.json.discountBasis,'making-charges');
  const order=await F.req('POST','orders',{items,address,paymentMethod:'WhatsApp',coupon:card.cardNumber,usePoints:false},MEMBER);assert.equal(order.status,200,order.body);const basis=order.json.items.reduce((n,x)=>n+Number(x.makingCharge)*Number(x.qty),0);assert.ok(basis>0);assert.equal(order.json.makingChargeSubtotal,basis);assert.equal(order.json.makingChargeDiscount,Math.round(basis*.2));assert.equal(order.json.couponDiscount,Math.round(basis*.2));assert.equal(order.json.coupon,card.couponCode);assert.ok(order.json.subtotal>basis,'metal/stone/GST-bearing subtotal is not the discount basis');
 });
 await test('P06','grouped or ungrouped member code still requires the bound account/mobile',async()=>{
  const card=await claim(),plain=card.cardNumber.replace(/\s/g,'');const mine=await F.req('POST','coupons/validate',{code:plain,amount:100000,makingAmount:10000},MEMBER);assert.equal(mine.status,200);assert.equal(mine.json.discount,2000);
  const other=await F.req('POST','coupons/validate',{code:card.cardNumber,amount:100000,makingAmount:10000},'qa186other');assert.equal(other.status,404);const anon=await F.req('POST','coupons/validate',{code:plain,amount:100000,makingAmount:10000});assert.ok([401,404].includes(anon.status));
 });
 await test('P07','expired benefit fails closed while permanent card/certificate stay retrievable',async()=>{
  const card=await claim(),db=await F.db(),u=db.users.find(x=>x.id==='qaMember'),c=db.coupons.find(x=>x.id===card.couponId);u.blackCard.expiresAt='2020-04-06T00:00:00+05:30';c.expiresAt='2099-01-01T00:00:00+05:30';c.active=true;F.setDb(db);
  const archive=await F.req('GET','black-card',{},MEMBER);assert.equal(archive.status,200);assert.equal(archive.json.membership.status,'expired');assert.equal(archive.json.membership.benefitActive,false);assert.equal(archive.json.membership.permanentRecord,true);assert.equal(archive.json.membership.cardNumber,card.cardNumber);assert.equal(archive.json.membership.certificateNo,card.certificateNo);
  const use=await F.req('POST','coupons/validate',{code:card.cardNumber,amount:100000,makingAmount:10000},MEMBER);assert.equal(use.status,404);
 });
 await test('P08','multiple retail accounts receive unique grouped identities with no collisions',async()=>{
  const db=fresh(),tokens=[];for(let i=0;i<5;i++){const id='qa186u'+i,phone='98765186'+String(i).padStart(2,'0'),tk='qa186tk'+i;db.users.push({id,role:'customer',name:'Member '+i,phone,email:id+'@qa.invalid',addresses:[],wishlist:[],loyaltyPoints:0});db.tokens[tk]={userId:id,exp:Math.floor(Date.now()/1000)+86400};tokens.push(tk)}F.setDb(db);
  const cards=[];for(const tk of tokens){const r=await F.req('POST','black-card/claim',{},tk);assert.equal(r.status,200,r.body);cards.push(r.json.membership)}
  assert.equal(new Set(cards.map(x=>x.cardNumber)).size,cards.length);assert.equal(new Set(cards.map(x=>x.memberId)).size,cards.length);assert.equal(new Set(cards.map(x=>x.certificateNo)).size,cards.length);
  cards.forEach(c=>{assert.match(c.cardNumber,/^\d{4} \d{4} \d{4} \d{4}$/);sixMonths(c.issuedAt,c.expiresAt)});
 });
 console.log(`\nv186 PHP: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(1)});
