/* v184 — Shivaa Black static + browser regression.
   Server-side money/access behaviour is executed separately by v184-php-run. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { JSDOM } = require('jsdom');
const Engine = require('php-parser');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const rd = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const index = rd('index.html'), app = rd('js/app.js'), api = rd('api.php'), sw = rd('sw.js'), css = rd('css/v184.css'), admin = rd('js/admin.js');
const dbSeed = JSON.parse(rd('data/db.json'));
let pass=0, fail=0;
const deadline=setTimeout(()=>{console.error('v184 browser harness deadline exceeded');process.exit(1)},120000);
async function test(id,name,fn){try{await fn();pass++;console.log(`PASS ${id} ${name}`)}catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.stack||e.message}`)}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=20000){const t=Date.now();while(Date.now()-t<ms){try{if(fn())return true}catch(_){}await sleep(40)}return false}

const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.join(CMS,u==='/'?'index.html':u);if(!path.resolve(f).startsWith(path.resolve(CMS)))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(b)})});
const membership={version:1,program:'Shivaa Black',memberId:'SBM-2026-QA184000',cardNumber:'2020 1111 2222 3333',couponCode:'2020 1111 2222 3333',holderName:'QA Member',mobile:'9876500002',issuedAt:'2026-10-06T10:00:00+05:30',expiresAt:'2027-04-06T10:00:00+05:30',discountPct:20,discountBasis:'making-charges',certificateNo:'SFP-2026-QA184000',certificateTitle:'Shivaa Family Prestigious Member',certificateIssuedAt:'2026-10-06T10:00:00+05:30',status:'active',benefitActive:true,permanentRecord:true};
const member={id:'qaMember',role:'customer',name:'QA Member',email:'member@qa.invalid',phone:'9876500002',createdAt:'2026-01-01T00:00:00+05:30',profile:{},addresses:[],loyaltyPoints:0,blackCard:membership};
const rates={t:new Date().toISOString(),source:'QA-fixture',gold24:15000,gold22:14000,gold18:11000,silver:200,spot:{gold24:15000,gold22:14000,gold18:11000,silver:200},jaipur:{gold24:15000,gold22:14000,gold18:11000,silver:200},anchorLevel:{mode:'mcx-future',source:'QA',goldPerG:15000,silverPerG:200,at:new Date().toISOString(),ageMs:10},premium:{gold22:398,gold24:398,gold:55,silver:3},rtgs:{rows:{}},history:[]};
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
    else if(u.pathname==='/api/coupons/validate'){const b=JSON.parse(opt.body||'{}');out={code:membership.couponCode,type:'making_percent',value:20,discount:Math.round((+b.makingAmount||0)*.2),eligibleBasis:+b.makingAmount||0,discountBasis:'making-charges'};}
    return {ok:true,status:200,json:async()=>out,text:async()=>JSON.stringify(out)};
  };
 }});
}

(async()=>{
 await test('S01','release 184 stamps, cache list and final CSS stay in lockstep',async()=>{
  assert.ok(index.includes('window.__SHIVAA_REL=184;'));assert.ok(app.includes('const APP_REL = 184;'));
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v184';")&&sw.includes('const REL = 184;'));assert.ok(api.includes("'rel'   => 184,"));
  assert.equal((index.match(/\?v=184/g)||[]).length,57);assert.equal((sw.match(/\?v=184/g)||[]).length,52);
  assert.ok(!index.includes('?v=183')&&!sw.includes('?v=183'));
  assert.ok(!index.includes('?v=182')&&!sw.includes('?v=182'));
  const links=[...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(links.at(-1),'/css/v184.css?v=184');assert.ok(sw.includes("'/css/v184.css?v=184'"));
  assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"));
 });
 await test('S02','server model is retail-only, idempotent, dual-bound and making-charge based',async()=>{
  for(const n of ['function black_six_month_expiry','function black_unique_code','function black_coupon_ensure','function black_card_public',"$route === 'black-card/claim'","'type' => 'making_percent'","'forPhoneHash' => black_phone_hash($mobile)","$makingSubtotal += $line['makingCharge'] * $line['qty']","$raw = $makingSubtotal * (float)($coupon['value'] ?? 0) / 100","'makingChargeDiscount' => $makingChargeDiscount"])assert.ok(api.includes(n),n);
  assert.ok(/black-card\/claim[\s\S]{0,700}\['role'\][\s\S]{0,100}customer/.test(api),'retail role gate near claim');
  assert.ok(api.includes("if ($created || $repaired) db_save"),'repeat claim does not rewrite/extend');
  assert.ok(api.includes('That coupon is not valid for this signed-in mobile/account.'),'submitted personal coupon fails closed');
 });
 await test('S03','homepage banners market Shivaa Black only',async()=>{
  const a=app.indexOf('pages.home ='),b=app.indexOf('/* ─────────── SHOP',a),home=app.slice(a,b);
  assert.ok(home.includes('id="blackHero"')&&home.includes('Flat 20% off making charges'));
  assert.equal((home.match(/black-slide/g)||[]).length,4);
  for(const old of ['#/scheme','Win 10g','Swarna Nidhi','For jewellers','Become a Partner'])assert.ok(!home.includes(old),'conflicting home campaign: '+old);
  const cs=home.slice(home.indexOf('<section class="carousel-sec'),home.indexOf('<section class="rate-strip'));
  const hrefs=[...cs.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);assert.ok(hrefs.length>=4&&hrefs.every(h=>h==='#/black-card'),hrefs.join(','));
 });
 await test('S04','customer UI carries flip, reverse mobile, permanent certificate, account locker and exact checkout label',async()=>{
  for(const n of ["pages['black-card']",'Shivaa.flipBlackCard','BOUND MOBILE','Shivaa Family Prestigious Member','permanently in the member','My Shivaa Black',"tab === 'membership'",'makingSubtotal','Shivaa Black · 20% off making charges','makingAmount: window._co.makingSubtotal'])assert.ok(app.includes(n),n);
  assert.ok(app.includes("openLogin('black-card')"),'OTP login intent');
  assert.ok(index.includes('href="#/black-card" class="hdr-scheme-pill hdr-black-pill"'));
  assert.ok(admin.includes("c.type === 'making_percent'"),'admin names making-only basis');
 });
 await test('S05','premium layer includes laptop/phone, reduced-motion and private print treatments',async()=>{
  for(const n of ['.black-hero','.bc-card.is-flipped','.bc-back','.bc-certificate','.bc-checkout-pass','@media (max-width:900px)','@media (max-width:700px)','@media (max-width:480px)','prefers-reduced-motion','body.bc-printing .bc-print-zone','print-color-adjust:exact'])assert.ok(css.includes(n),n);
  assert.ok(css.length>25000,'substantial final design layer');
 });
 await test('S06','shipped JavaScript and PHP parse cleanly',async()=>{
  for(const f of ['js/app.js','js/admin.js','sw.js'])execFileSync(process.execPath,['--check',path.join(CMS,f)],{stdio:'pipe'});
  new Engine({parser:{suppressErrors:false}}).parseCode(api);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const dom=boot(),w=dom.window,d=w.document;
 await test('B01','browser boots the exclusive Black homepage and front/back interaction',async()=>{
  assert.ok(await until(()=>d.querySelector('#blackHero')&&d.querySelectorAll('.black-slide').length===4&&w.Shivaa?.state?.productsCache?.length>0), 'home did not boot');
  assert.match(d.querySelector('#blackHero').textContent,/20% off making charges/i);
  assert.ok(!/Win 10g|Swarna Nidhi|Your counter, our supply chain/.test(d.querySelector('#view').textContent));
  const card=d.querySelector('#blackHero .bc-card');assert.ok(card);card.click();assert.ok(card.classList.contains('is-flipped'));assert.match(card.querySelector('.bc-back').textContent,/BOUND MOBILE/i);
 });
 await test('B02','authenticated browser renders card/certificate in route + account and auto-applies checkout basis',async()=>{
  w.Shivaa.state.user=JSON.parse(JSON.stringify(member));
  w.location.hash='#/black-card';
  assert.ok(await until(()=>d.querySelector('.bc-certificate')&&d.querySelector('.bc-detail-code')),'member route');
  assert.match(d.querySelector('.bc-certificate').textContent,/QA Member/);assert.match(d.querySelector('.bc-back').textContent,/98765 00002/);
  w.location.hash='#/account?tab=membership';
  assert.ok(await until(()=>d.querySelector('.bc-account-sec .bc-certificate')),'account locker');
  const product=w.Shivaa.state.productsCache.find(p=>p.active&&+p.mcValue>0)||w.Shivaa.state.productsCache[0];
  w.Shivaa.state.cart=[{id:product.id,qty:2,size:null,engraving:''}];
  w.location.hash='#/checkout';
  assert.ok(await until(()=>d.querySelector('.bc-checkout-pass')&&/applied/i.test((d.querySelector('#couponMsg')||{}).textContent||''),25000),'Black coupon did not auto-apply');
  assert.match(d.querySelector('#coDiscLabel').textContent,/20% off making charges/i);assert.ok(+w._co.makingSubtotal>0);assert.equal(w._co.disc,Math.round(w._co.makingSubtotal*.2));
 });
 w.close();server.close();clearTimeout(deadline);
 console.log(`\nv184 browser/static: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);try{server.close()}catch(_){}process.exit(1)});
