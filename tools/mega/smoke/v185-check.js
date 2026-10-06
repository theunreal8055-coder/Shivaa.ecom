/* v185 — static + jsdom acceptance for resilient locker, race-safe checkout,
   accessible card faces, native export hooks and narrow-phone finish. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const Engine=require('php-parser');
const ROOT=path.resolve(__dirname,'../../..'),CMS=process.env.SMOKE_CMS||path.join(ROOT,'cms');
const rd=f=>fs.readFileSync(path.join(CMS,f),'utf8');
const index=rd('index.html'),app=rd('js/app.js'),api=rd('api.php'),sw=rd('sw.js'),css=rd('css/v185.css'),admin=rd('js/admin.js');
const dbSeed=JSON.parse(rd('data/db.json'));
let pass=0,fail=0;
const deadline=setTimeout(()=>{console.error('v185 browser harness deadline exceeded');process.exit(1)},120000);
async function test(id,name,fn){try{await fn();pass++;console.log(`PASS ${id} ${name}`)}catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.stack||e.message}`)}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=20000){const t=Date.now();while(Date.now()-t<ms){try{if(fn())return true}catch(_){}await sleep(35)}return false}
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
const membership={version:1,program:'Shivaa Black',memberId:'SBM-2026-QA185000',cardNumber:'2020 1111 2222 3333',couponCode:'2020 1111 2222 3333',holderName:'QA Member',mobile:'9876500002',issuedAt:'2026-10-06T10:00:00+05:30',expiresAt:'2027-04-06T10:00:00+05:30',discountPct:20,discountBasis:'making-charges',certificateNo:'SFP-2026-QA185000',certificateTitle:'Shivaa Family Prestigious Member',certificateIssuedAt:'2026-10-06T10:00:00+05:30',status:'active',benefitActive:true,permanentRecord:true};
const member={id:'qaMember',role:'customer',name:'QA Member',email:'member@qa.invalid',phone:'9876500002',createdAt:'2026-01-01T00:00:00+05:30',profile:{},addresses:[{id:'a1',label:'Home',name:'QA Member',phone:'9876500002',line:'1 Fixture Street',city:'Jaipur',state:'Rajasthan',pincode:'302001'}],loyaltyPoints:100,blackCard:membership};
const rates={t:new Date().toISOString(),source:'QA-fixture',gold24:15000,gold22:14000,gold18:11000,silver:200,spot:{gold24:15000,gold22:14000,gold18:11000,silver:200},jaipur:{gold24:15000,gold22:14000,gold18:11000,silver:200},anchorLevel:{mode:'mcx-future',source:'QA',goldPerG:15000,silverPerG:200,at:new Date().toISOString(),ageMs:10},premium:{gold22:398,gold24:398,gold:55,silver:3},rtgs:{rows:{}},history:[]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.join(CMS,u==='/'?'index.html':u);if(!path.resolve(f).startsWith(path.resolve(CMS)))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(b)})});
function boot(){
 return new JSDOM(index,{url:`http://127.0.0.1:${server.address().port}/`,runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.print=()=>{};
  if(w.HTMLCanvasElement)w.HTMLCanvasElement.prototype.getContext=function(){return null};
  w.fetch=async(input,opt={})=>{const u=new URL(String(input),'http://qa.invalid');let out={};
    if(u.pathname==='/api/rates')out=rates;
    else if(u.pathname==='/api/settings')out={settings:{...dbSeed.settings,freeShipAbove:50000,shippingFee:250,prepaidPct:0,codFeePct:0,codMaxAmount:50000}};
    else if(u.pathname==='/api/making-charges')out={table:[],gst:3};
    else if(u.pathname==='/api/catalogs')out={catalogs:[]};
    else if(u.pathname==='/api/products')out={products:dbSeed.products};
    else if(u.pathname==='/api/pages')out={pages:[]};
    else if(u.pathname==='/api/reviews')out={reviews:[]};
    else if(u.pathname==='/api/trust')out={};
    else if(u.pathname==='/api/black-card')out={membership};
    else if(u.pathname==='/api/orders')out={orders:[]};
    else if(u.pathname==='/api/wishlist')out={wishlist:[],items:[]};
    else if(u.pathname==='/api/pay/config')out={mode:'demo',prepaidPct:0,lockMinutes:20};
    else if(u.pathname==='/api/coupons/validate'){const b=JSON.parse(opt.body||'{}');out={code:b.code,type:'making_percent',kind:'shivaa-black',value:20,discount:Math.round((+b.makingAmount||0)*.2),eligibleBasis:+b.makingAmount||0,discountBasis:'making-charges'};}
    return response(out,200);
  };
 }});
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
(async()=>{
 await test('S01','release 185 stamps, final stylesheet and worker cache are in lockstep',async()=>{
  assert.ok(index.includes('window.__SHIVAA_REL=185;'));assert.ok(app.includes('const APP_REL = 185;'));
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v185';")&&sw.includes('const REL = 185;'));assert.ok(api.includes("'rel'   => 185,"));
  assert.ok(index.includes('/css/v185.css?v=185'));assert.ok(sw.includes("'/css/v185.css?v=185'"));
  const links=[...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(x=>x[1]);assert.equal(links.at(-1),'/css/v185.css?v=185');
  assert.ok(!index.includes('?v=184')&&!sw.includes('?v=184'));
 });
 await test('S02','server makes card identity, mobile, 20% basis and expiry authoritative',async()=>{
  for(const n of ['function black_card_bound_to_user','return $bound !== \'\' && $current !== \'\' && hash_equals','function black_coupon_canonical','function black_coupon_for_user','function black_code_reserved','function black_coupon_row_reserved','function coupon_resolve','canonical fields always win',"'type' => 'making_percent'","'value' => 20","$coupon = coupon_resolve($db, $submittedCoupon, $u)"])assert.ok(api.includes(n),n);
  assert.ok(api.includes("$out['discountPct'] = 20")&&api.includes("$out['discountBasis'] = 'making-charges'"));
  assert.ok(!/foreach \(\$db\['coupons'\].*coupon_code_matches\(\$c, \$submittedCoupon\)/.test(api));
 });
 await test('S03','checkout rejects code drift, cancels stale requests and mirrors the points cap',async()=>{
  for(const n of ['couponGeneration','couponAbort','couponAppliedKey','checkoutCouponKey','Shivaa.couponInputChanged','e.name === \'AbortError\'','Tap Apply to verify the coupon code','Math.floor(Math.max(0, co.subtotal - couponDisc))','window._co.recalculate = coTotals'])assert.ok(app.includes(n),n);
  assert.ok(app.includes('co.couponAppliedKey !== typedCouponKey || co.couponAbort'));
  assert.ok(app.includes('signal: ctl && ctl.signal'));
 });
 await test('S04','locker has explicit recovery, synchronized faces and mobile-native document export',async()=>{
  for(const n of ['blackAccessErrorHTML','bc-access-state','safeCached','Retry secure connection','data-bc-face="front"','data-bc-face="back"','aria-hidden="${backFirst','saveBlackCertificate','blackShareOrSave','navigator.canShare','Print / save PDF','bc-member-code-row'])assert.ok(app.includes(n),n);
  assert.ok(app.includes("front.setAttribute('aria-hidden'")&&app.includes("back.setAttribute('aria-hidden'"));
 });
 await test('S05','v185 design layer protects narrow phones, touch targets and complete printing',async()=>{
  for(const n of ['.bc-access-state','.bc-member-code-row','.coupon-message.success','@media (max-width:700px)','@media (max-width:480px)','@media (max-width:350px)','min-height:48px','aspect-ratio:1.50/1','body.bc-printing .bc-face','backface-visibility:visible','prefers-reduced-motion'])assert.ok(css.includes(n),n);
  assert.ok(css.length>9000,'substantial final mobile layer');
 });
 await test('S06','all shipped program files parse cleanly',async()=>{
  for(const f of ['js/app.js','js/admin.js','sw.js'])execFileSync(process.execPath,['--check',path.join(CMS,f)],{stdio:'pipe'});
  new Engine({parser:{suppressErrors:false}}).parseCode(api);
 });

 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const dom=boot(),w=dom.window,d=w.document;
 await test('B01','card faces stay accessible and locker failures are explicit without discarding safe cache',async()=>{
  assert.ok(await until(()=>d.querySelector('#blackHero')&&w.Shivaa?.state?.productsCache?.length>0),'app boot');
  w.Shivaa.state.user=JSON.parse(JSON.stringify(member));w.location.hash='#/black-card';
  assert.ok(await until(()=>d.querySelector('.bc-certificate')&&d.querySelector('.bc-card')),'member route');
  let card=d.querySelector('.bc-card'),front=card.querySelector('[data-bc-face="front"]'),back=card.querySelector('[data-bc-face="back"]');
  assert.equal(front.getAttribute('aria-hidden'),'false');assert.equal(back.getAttribute('aria-hidden'),'true');
  card.click();assert.equal(card.getAttribute('aria-pressed'),'true');assert.equal(front.getAttribute('aria-hidden'),'true');assert.equal(back.getAttribute('aria-hidden'),'false');
  const normalFetch=w.fetch;
  w.fetch=async(input,opt)=>{const u=new URL(String(input),'http://qa.invalid');if(u.pathname==='/api/black-card')throw new TypeError('offline');return normalFetch(input,opt)};
  w.Shivaa.retryBlackCard();
  assert.ok(await until(()=>d.querySelector('.bc-access-state.cached')&&d.querySelector('.bc-certificate')),'safe cached state');
  assert.match(d.querySelector('.bc-access-state').textContent,/temporarily offline|could not refresh/i);
  w.fetch=async(input,opt)=>{const u=new URL(String(input),'http://qa.invalid');if(u.pathname==='/api/black-card')return response({error:'mobile binding mismatch'},403);return normalFetch(input,opt)};
  w.Shivaa.retryBlackCard();
  assert.ok(await until(()=>d.querySelector('.bc-access-state.blocked')&&!d.querySelector('.bc-certificate')),'binding failure must fail closed');
  assert.match(d.querySelector('.bc-access-state').textContent,/mobile binding/i);
  w.fetch=normalFetch;w.Shivaa.retryBlackCard();assert.ok(await until(()=>d.querySelector('.bc-certificate')&&!d.querySelector('.bc-access-state')),'retry recovery');
 });
 await test('B02','out-of-order coupon replies cannot win and editing clears the applied code',async()=>{
  w.Shivaa.state.user=JSON.parse(JSON.stringify(member));
  const product=w.Shivaa.state.productsCache.find(p=>p.active&&+p.mcValue>0)||w.Shivaa.state.productsCache[0];
  w.Shivaa.state.cart=[{id:product.id,qty:1,size:null,engraving:''}];w.location.hash='#/checkout';
  assert.ok(await until(()=>d.querySelector('#couponIn')&&/applied/i.test(d.querySelector('#couponMsg').textContent),25000),'auto apply');
  const baseFetch=w.fetch,oldReq=deferred(),newReq=deferred();let oldSeen=false,newSeen=false;
  w.fetch=(input,opt={})=>{const u=new URL(String(input),'http://qa.invalid');if(u.pathname!=='/api/coupons/validate')return baseFetch(input,opt);const b=JSON.parse(opt.body||'{}');
    if(b.code==='OLD'){oldSeen=true;return oldReq.promise}if(b.code==='NEW'){newSeen=true;return newReq.promise}return baseFetch(input,opt)};
  const input=d.querySelector('#couponIn');input.value='OLD';input.dispatchEvent(new w.Event('input',{bubbles:true}));const pOld=w.Shivaa.applyCoupon();assert.ok(await until(()=>oldSeen));
  input.value='NEW';input.dispatchEvent(new w.Event('input',{bubbles:true}));const pNew=w.Shivaa.applyCoupon();assert.ok(await until(()=>newSeen));
  newReq.resolve(response({code:'NEW',type:'flat',value:25,discount:25},200));await pNew;
  oldReq.resolve(response({code:'OLD',type:'flat',value:90,discount:90},200));await pOld;await sleep(20);
  assert.equal(w._co.coupon,'NEW');assert.equal(w._co.disc,25);assert.match(d.querySelector('#couponMsg').textContent,/NEW applied/);
  input.value='EDITED';input.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w._co.coupon,null);assert.equal(w._co.disc,0);assert.equal(d.querySelector('#coDiscRow').hidden,true);assert.match(d.querySelector('#couponMsg').textContent,/Code changed/);
  w.fetch=baseFetch;
 });
 await test('B03','rate lock stays honest, points are capped, and unapplied input blocks submit',async()=>{
  const input=d.querySelector('#couponIn'),pts=d.querySelector('#usePts');assert.ok(input&&pts);
  const lockedSubtotal=w._co.subtotal, savedRates={...w.Shivaa.state.rates};
  Object.assign(w.Shivaa.state.rates,{gold22:savedRates.gold22*1.8,gold24:savedRates.gold24*1.8,gold18:savedRates.gold18*1.8,silver:savedRates.silver*1.8});
  d.dispatchEvent(new w.Event('rates'));assert.equal(w._co.subtotal,lockedSubtotal,'live tick must not reprice an active lock');
  Object.assign(w.Shivaa.state.rates,savedRates);
  input.value='POINTS';input.dispatchEvent(new w.Event('input',{bubbles:true}));
  w.Shivaa.state.user.loyaltyPoints=100;
  Object.assign(w._co,{subtotal:100,freeShip:true,coupon:'POINTS',couponAppliedKey:'POINTS',couponType:'flat',couponValue:95,disc:95,couponAbort:null});
  pts.checked=true;w.Shivaa.updateCheckout();assert.match(d.querySelector('#coPoints').textContent,/5/);assert.match(d.querySelector('#coTotal').textContent,/₹0/);
  input.value='UNAPPLIED';input.dispatchEvent(new w.Event('input',{bubbles:true}));
  const form=d.querySelector('#addrForm');form.reportValidity=()=>true;let ordered=false;const baseFetch=w.fetch;
  w.fetch=(input,opt)=>{const u=new URL(String(input),'http://qa.invalid');if(u.pathname==='/api/orders'){ordered=true;return response({id:'bad'},200)}return baseFetch(input,opt)};
  await w.Shivaa.placeOrder();assert.equal(ordered,false);assert.match(d.querySelector('#couponMsg').textContent,/Tap Apply/);assert.equal(d.activeElement,d.querySelector('#couponIn'));
  w.fetch=baseFetch;
 });
 await test('B04','card and certificate use the native file share sheet when available',async()=>{
  const gradient={addColorStop(){}};
  const ctx={createLinearGradient(){return gradient},fillRect(){},strokeRect(){},save(){},restore(){},beginPath(){},arc(){},fill(){},stroke(){},fillText(){},moveTo(){},lineTo(){},measureText(t){return{width:String(t).length*18}}};
  w.HTMLCanvasElement.prototype.getContext=function(){return ctx};
  w.HTMLCanvasElement.prototype.toDataURL=function(){return 'data:image/png;base64,iVBORw0KGgo='};
  const shared=[];Object.defineProperty(w.navigator,'canShare',{configurable:true,value:o=>!!(o&&o.files&&o.files.length)});Object.defineProperty(w.navigator,'share',{configurable:true,value:async o=>{shared.push(o)}});
  const btn=d.createElement('button');btn.textContent='Export';d.body.appendChild(btn);
  await w.Shivaa.saveBlackCertificate(btn);await w.Shivaa.saveBlackCard(btn);
  assert.equal(shared.length,2);assert.match(shared[0].files[0].name,/shivaa-family-certificate-.*\.png/);assert.match(shared[1].files[0].name,/shivaa-black-.*\.png/);
  assert.equal(shared[0].files[0].type,'image/png');btn.remove();
 });
 dom.window.close();server.close();clearTimeout(deadline);
 console.log(`\nv185 browser/static: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);try{server.close()}catch(_){}process.exit(1)});
