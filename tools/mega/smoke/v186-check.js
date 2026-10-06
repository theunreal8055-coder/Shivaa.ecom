/* v186 — static + jsdom acceptance for the premium Black journey, explicit
   OTP-to-claim continuation, exact commerce savings, lifecycle cleanup,
   accessibility and reduced-motion behavior. No live data/network writes. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const Engine=require('php-parser');
const ROOT=path.resolve(__dirname,'../../..'),CMS=process.env.SMOKE_CMS||path.join(ROOT,'cms');
const rd=f=>fs.readFileSync(path.join(CMS,f),'utf8');
const index=rd('index.html'),app=rd('js/app.js'),auth=rd('js/auth.js'),api=rd('api.php'),sw=rd('sw.js'),css=rd('css/v186.css');
const dbSeed=JSON.parse(rd('data/db.json'));
let pass=0,fail=0;
const deadline=setTimeout(()=>{console.error('v186 browser harness deadline exceeded');process.exit(1)},150000);
async function test(id,name,fn){try{await fn();pass++;console.log(`PASS ${id} ${name}`)}catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.stack||e.message}`)}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=25000){const t=Date.now();while(Date.now()-t<ms){try{if(fn())return true}catch(_){}await sleep(30)}return false}
const response=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
const now=new Date(),expires=new Date(now);expires.setMonth(expires.getMonth()+6);
const membership={version:1,program:'Shivaa Black',memberId:'SBM-2026-QA186000',cardNumber:'2020 1860 2468 1357',couponCode:'2020 1860 2468 1357',couponId:'black-qa186',holderName:'Asha Verma',mobile:'9876500186',issuedAt:now.toISOString(),expiresAt:expires.toISOString(),discountPct:20,discountBasis:'making-charges',certificateNo:'SFP-2026-QA186000',certificateTitle:'Shivaa Family Prestigious Member',certificateIssuedAt:now.toISOString(),status:'active',benefitActive:true,permanentRecord:true};
const member={id:'qa186',role:'customer',name:'Asha Verma',email:'9876500186@phone.shivaa.in',phone:'9876500186',createdAt:now.toISOString(),profile:{},addresses:[],loyaltyPoints:120,blackCard:membership};
const rates={t:new Date().toISOString(),source:'QA-fixture',gold24:15000,gold22:14000,gold18:11000,silver:200,spot:{gold24:15000,gold22:14000,gold18:11000,silver:200},jaipur:{gold24:15000,gold22:14000,gold18:11000,silver:200},anchorLevel:{mode:'mcx-future',source:'QA',goldPerG:15000,silverPerG:200,at:new Date().toISOString(),ageMs:10},premium:{gold22:398,gold24:398,gold:55,silver:3},rtgs:{rows:{}},history:[]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.join(CMS,u==='/'?'index.html':u);if(!path.resolve(f).startsWith(path.resolve(CMS)))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(b)})});
function boot({reduced=false,fine=true}={}){
 const trace={claimCount:0,registered:null,claimed:false,cardOverride:null};
 const dom=new JSDOM(index,{url:`http://127.0.0.1:${server.address().port}/`,runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
  Object.defineProperty(w,'innerWidth',{configurable:true,writable:true,value:1280});
  w.matchMedia=q=>({matches:/prefers-reduced-motion:\s*reduce/.test(q)?reduced:/pointer:\s*fine/.test(q)?fine:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.IntersectionObserver=class{constructor(cb){this.cb=cb}observe(){}unobserve(){}disconnect(){}};w.ResizeObserver=class{observe(){}disconnect(){}};
  w.scrollTo=()=>{};w.print=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  if(w.HTMLCanvasElement)w.HTMLCanvasElement.prototype.getContext=function(){return null};
  w.fetch=async(input,opt={})=>{const u=new URL(String(input),'http://qa.invalid'),method=String(opt.method||'GET').toUpperCase();let out={};
    if(u.pathname==='/api/rates')out=rates;
    else if(u.pathname==='/api/settings')out={settings:{...dbSeed.settings,freeShipAbove:50000,shippingFee:250,prepaidPct:0,codFeePct:0,codMaxAmount:50000}};
    else if(u.pathname==='/api/making-charges')out={table:[],gst:3};
    else if(u.pathname==='/api/catalogs')out={catalogs:[]};
    else if(u.pathname==='/api/products')out={products:dbSeed.products};
    else if(/^\/api\/products\//.test(u.pathname)){const id=decodeURIComponent(u.pathname.split('/').pop()),p=dbSeed.products.find(x=>x.id===id);if(!p)return response({error:'not found'},404);out={product:p,reviews:[],similar:dbSeed.products.filter(x=>x.id!==id).slice(0,3),rates};}
    else if(u.pathname==='/api/pages')out={pages:[]};
    else if(u.pathname==='/api/reviews')out={reviews:[]};
    else if(u.pathname==='/api/trust')out={};
    else if(u.pathname==='/api/orders')out={orders:[]};
    else if(u.pathname==='/api/wishlist')out={wishlist:[],items:[]};
    else if(u.pathname==='/api/pay/config')out={mode:'demo',prepaidPct:0,lockMinutes:20};
    else if(u.pathname==='/api/auth/me')out={user:trace.claimed?{...member,blackCard:membership}:{...member,blackCard:null},events:[]};
    else if(u.pathname==='/api/auth/send-otp')out={ok:true,hasAccount:false,devCode:'1234',masked:'+91 ••••• 0186'};
    else if(u.pathname==='/api/auth/otp-login')return response({error:'No account with this number',newNumber:true},404);
    else if(u.pathname==='/api/auth/register'){trace.registered=JSON.parse(opt.body||'{}');out={token:'qa-token-186',user:{...member,blackCard:null}};}
    else if(u.pathname==='/api/black-card/claim'&&method==='POST'){trace.claimCount++;trace.claimed=true;out={created:trace.claimCount===1,membership:{...membership,holderName:(trace.registered&&trace.registered.name)||membership.holderName},user:{...member,name:(trace.registered&&trace.registered.name)||member.name,blackCard:{...membership,holderName:(trace.registered&&trace.registered.name)||membership.holderName}}};}
    else if(u.pathname==='/api/black-card')out={membership:trace.cardOverride||(trace.claimed?membership:null)};
    else if(u.pathname==='/api/coupons/validate'){const b=JSON.parse(opt.body||'{}'),basis=+b.makingAmount||0;out={code:b.code,type:'making_percent',kind:'shivaa-black',value:20,discount:Math.round(basis*.2),eligibleBasis:basis,discountBasis:'making-charges'};}
    return response(out,200);
  };
 }});
 dom.trace=trace;return dom;
}
(async()=>{
 await test('S01','v186 release, final layer, LCP art and offline shell are one handshake',async()=>{
  assert.ok(index.includes('window.__SHIVAA_REL=186;')&&app.includes('const APP_REL = 186;'));
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v186';")&&sw.includes('const REL = 186;')&&api.includes("'rel'   => 186,"));
  const links=[...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(x=>x[1]);assert.equal(links.at(-1),'/css/v186.css?v=186');
  assert.ok(index.includes('/images/black/hero-v186.jpg?v=186')&&index.includes('fetchpriority="high"'));
  assert.ok(sw.includes("'/css/v186.css?v=186'")&&sw.includes("'/images/black/hero-v186.jpg?v=186'"));
  assert.ok(!index.includes('?v=185')&&!sw.includes('?v=185'));
  const art=fs.readFileSync(path.join(CMS,'images/black/hero-v186.jpg'));assert.ok(art.length>150000);assert.equal(art[0],0xff);assert.equal(art[1],0xd8);
 });
 await test('S02','premium layer has cinematic, tactile, mobile, print and calm-motion treatments',async()=>{
  for(const n of ['hero-v186.jpg','bcHeroBreathe','bcHeroSweep','[data-black-card-motion]','.bc-live-light','.bc-holo-seal','.bc-journey','.bc-commerce','.bc-checkout-flow','.shv-black-context','.shv-optional','@media (max-width:350px)','prefers-reduced-motion','@media print'])assert.ok(css.includes(n),n);
  assert.ok(css.length>20000,'substantial final design layer');
 });
 await test('S03','claim intent, journey, exact savings and permanent timeline are explicit',async()=>{
  for(const n of ['blackJourneyHTML','blackBenefitProgress','blackSaving','blackCommerceHTML','_blackClaimAfterLogin','cancelBlackClaimIntent','blackClaimPromise','20% of ${fmt(basis)}','bc-life','_blackRevealUntil','bcVerifyStep','Mobile verified'])assert.ok(app.includes(n),n);
  assert.ok(app.includes("/^#\\/(?:cart|checkout|shop)(?:\\?[^#]*)?$/")&&app.includes("/^#\\/product\\/[^/?#]+"),'return route allowlist');
  assert.ok(app.includes('Math.round((+makingCharge || 0) * Math.max(1, +qty || 1) * .20)'),'20% client preview');
 });
 await test('S04','animation and PDP work are input-safe and released with their route',async()=>{
  for(const n of ["matchMedia('(prefers-reduced-motion: reduce)')","matchMedia('(pointer: fine)')",'Math.min(devicePixelRatio || 1, 2)','document.body.contains(cv)','IntersectionObserver','requestAnimationFrame(paint)','document.body.contains(wrap)) { stopGallery()','typeof window._pdCleanup === \'function\''])assert.ok(app.includes(n),n);
  const otp=app.slice(app.indexOf('function bindOtpBoxes'),app.indexOf('const otpVal'));
  assert.ok(otp.includes('boxes.length - 1')&&otp.includes('slice(0, boxes.length)'));assert.ok(!otp.includes('i < 5')&&!otp.includes('slice(0, 6)'));
 });
 await test('S05','Black OTP context requires only a name and contains/restores modal focus',async()=>{
  for(const n of ['shv-black-intent','shv-black-context','STEP 1 OF 2','FINAL STEP','shv-optional','Only your name is required','document.activeElement === last','document.activeElement === first','document.body.contains(back)','close(true)','cancelBlackClaimIntent'])assert.ok(auth.includes(n),n);
  const details=auth.slice(auth.indexOf('function details'),auth.indexOf('/* legacy email/password door'));
  assert.match(details,/id="shvDetName"[^>]*required/);assert.doesNotMatch(details,/id="shvDetDob"[^>]*required/);assert.doesNotMatch(details,/id="shvDetCity"[^>]*required/);
  assert.ok(!auth.includes('ask your name, date of birth and place once'));
 });
 await test('S06','all edited program files parse cleanly',async()=>{
  for(const f of ['js/app.js','js/auth.js','sw.js'])execFileSync(process.execPath,['--check',path.join(CMS,f)],{stdio:'pipe'});
  new Engine({parser:{suppressErrors:false}}).parseCode(api);
 });

 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const dom=boot(),w=dom.window,d=w.document;
 await test('B01','discovery → OTP → name-only registration → one automatic claim is seamless',async()=>{
  assert.ok(await until(()=>d.querySelector('#blackHero')&&w.Shivaa?.state?.productsCache?.length),'home boot');
  const wrap=d.querySelector('#blackHero [data-black-card-motion]');assert.ok(wrap);
  wrap.getBoundingClientRect=()=>({left:0,top:0,width:500,height:320});
  wrap.dispatchEvent(new w.MouseEvent('pointermove',{bubbles:true,clientX:375,clientY:80}));
  assert.ok(await until(()=>wrap.classList.contains('is-lit')),'reactive card light');assert.match(wrap.style.getPropertyValue('--bc-x'),/75/);
  w.location.hash='#/black-card';assert.ok(await until(()=>d.querySelector('.bc-claim-btn')&&d.querySelectorAll('.bc-journey li').length===4),'claim route');
  const opener=d.querySelector('.bc-claim-btn');opener.focus();opener.click();
  assert.ok(await until(()=>!d.querySelector('#shvAuthWrap').hidden&&d.querySelector('.shv-black-context')),'Black auth context');
  const phone=d.querySelector('#shvPhoneIn');phone.value='9876500186';d.querySelector('#shvStartForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.ok(await until(()=>w.ShivaaAuth.step==='otp'&&d.querySelectorAll('#shvOtp input').length===4),'OTP step');
  const boxes=[...d.querySelectorAll('#shvOtp input')];'1234'.split('').forEach((x,i)=>boxes[i].value=x);d.querySelector('#shvOtpBtn').click();
  assert.ok(await until(()=>w.ShivaaAuth.step==='details'&&d.querySelector('#shvDetName')),'minimal details step');
  assert.equal(d.querySelector('#shvDetDob').required,false);assert.equal(d.querySelector('#shvDetCity').required,false);assert.equal(d.querySelector('.shv-optional').open,false);
  assert.match(d.querySelector('.shv-black-context').textContent,/final step/i);
  d.querySelector('#shvDetName').value='Asha Verma';d.querySelector('#shvDetForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const issued=await until(()=>d.querySelector('.bc-certificate')&&w.Shivaa.state.user?.blackCard,30000);
  assert.ok(issued,'issued member locker');
  assert.equal(dom.trace.claimCount,1,'explicit intent continues exactly once');assert.equal(dom.trace.registered.name,'Asha Verma');assert.deepEqual(dom.trace.registered.profile,{});
  assert.match(d.querySelector('.bc-detail-code').textContent,/2020\s+1860\s+2468\s+1357/);assert.match(d.querySelector('.bc-certificate').textContent,/Asha Verma/);
  assert.equal(w._blackClaimAfterLogin,false);assert.ok(d.querySelector('.bc-membership.is-revealing'));
 });
 await test('B02','PDP → quantity → bag → checkout preserves exact Black basis and releases gallery work',async()=>{
  const p=w.Shivaa.state.productsCache.find(x=>x.active&&+x.mcValue>0)||w.Shivaa.state.productsCache[0];
  w.location.hash='#/product/'+encodeURIComponent(p.id);
  assert.ok(await until(()=>d.querySelector('.pd-layout .bc-commerce.active')&&typeof w._pdCleanup==='function'),'member PDP');
  const offer=d.querySelector('.pd-layout .bc-commerce.active'),basis=+offer.dataset.blackMaking,expected=Math.round(basis*.2);
  assert.ok(basis>0);assert.match(offer.textContent,new RegExp(expected.toLocaleString('en-IN')));
  w.Shivaa.pdQty(1);assert.match(offer.textContent,new RegExp(Math.round(basis*2*.2).toLocaleString('en-IN')));
  w.Shivaa.state.cart=[{id:p.id,qty:2,size:null,engraving:''}];w.location.hash='#/cart';
  assert.ok(await until(()=>d.querySelector('.summary .bc-commerce.active')),'bag saving');assert.equal(w._pdCleanup,null,'detached gallery timer released');
  const bag=d.querySelector('.summary .bc-commerce.active'),bagBasis=+bag.dataset.blackMaking;assert.match(bag.textContent,new RegExp(Math.round(bagBasis*.2).toLocaleString('en-IN')));
  w.location.hash='#/checkout';
  assert.ok(await until(()=>d.querySelector('#bcAppliedStep.done')&&/applied/i.test(d.querySelector('#couponMsg').textContent),30000),'automatic checkout validation');
  assert.equal(w._co.disc,Math.round(w._co.makingSubtotal*.2));assert.match(d.querySelector('#bcVerifyStep').textContent,/mobile verified/i);assert.match(d.querySelector('#bcAppliedStep').textContent,/applied/i);
  assert.match(d.querySelector('#coDiscLabel').textContent,/20% off making charges/i);
 });
 await test('B03','closing Black verification cancels intent, traps focus and restores its opener',async()=>{
  w.Shivaa.state.user=null;w.location.hash='#/black-card';assert.ok(await until(()=>d.querySelector('.bc-claim-btn')));
  const open=d.querySelector('.bc-claim-btn');open.focus();open.click();assert.ok(await until(()=>!d.querySelector('#shvAuthWrap').hidden));
  const focusable=[...d.querySelectorAll('#shvAuthWrap button,#shvAuthWrap a[href],#shvAuthWrap input,#shvAuthWrap select,#shvAuthWrap textarea,#shvAuthWrap [tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&!el.closest('[hidden]'));
  focusable.at(-1).focus();d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(d.activeElement,focusable[0]);
  d.querySelector('#shvX').click();assert.ok(await until(()=>d.querySelector('#shvAuthWrap').hidden&&d.activeElement===open));
  assert.equal(w._blackClaimAfterLogin,false);assert.equal(w._blackClaimReturn,'');assert.equal(dom.trace.claimCount,1);
 });
 await test('B04','expired benefit never advertises a saving but keeps card and certificate permanently',async()=>{
  const expired={...membership,issuedAt:'2019-10-06T00:00:00+05:30',certificateIssuedAt:'2019-10-06T00:00:00+05:30',expiresAt:'2020-04-06T00:00:00+05:30',status:'expired',benefitActive:false};
  dom.trace.cardOverride=expired;w.Shivaa.state.user={...member,blackCard:expired};w.location.hash='#/black-card';w.Shivaa.redraw();
  assert.ok(await until(()=>d.querySelector('.bc-validity.expired')&&d.querySelector('.bc-certificate')),'archive');
  assert.equal(d.querySelector('.bc-life [role="progressbar"]').getAttribute('aria-valuenow'),'100');assert.match(d.querySelector('.bc-certificate').textContent,/Prestigious Membership/i);
  const p=w.Shivaa.state.productsCache.find(x=>x.active&&+x.mcValue>0)||w.Shivaa.state.productsCache[0];w.location.hash='#/product/'+p.id;
  assert.ok(await until(()=>d.querySelector('.bc-commerce.archived')),'archived PDP state');assert.doesNotMatch(d.querySelector('.bc-commerce.archived').textContent,/Save ₹/i);assert.match(d.querySelector('.bc-commerce.archived').textContent,/safely kept/i);
 });
 dom.window.close();
 const calm=boot({reduced:true,fine:true}),cw=calm.window,cd=cw.document;
 await test('B05','reduced-motion keeps the complete hero/card while suppressing decorative work',async()=>{
  assert.ok(await until(()=>cd.querySelector('#blackHero [data-black-card-motion]')&&cw.Shivaa?.state?.productsCache?.length),'calm boot');
  assert.equal(cd.querySelector('#heroDust').style.display,'none');
  const card=cd.querySelector('[data-black-card-motion]');card.dispatchEvent(new cw.MouseEvent('pointermove',{bubbles:true,clientX:200,clientY:80}));await sleep(60);
  assert.equal(card.classList.contains('is-lit'),false);assert.ok(cd.querySelector('.bc-card')&&cd.querySelector('.bc-hero-copy'));
 });
 calm.window.close();server.close();clearTimeout(deadline);
 console.log(`\nv186 browser/static: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);try{server.close()}catch(_){}process.exit(1)});
