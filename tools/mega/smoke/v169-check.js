/* Executed v169 page/print regression fixtures. No vendor requests.
   Real page bodies, controllable responses/timers, isolated DOM and session. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const CMS=process.env.SMOKE_CMS||path.resolve(__dirname,'../../../cms');
const app=fs.readFileSync(path.join(CMS,'js/app.js'),'utf8'),admin=fs.readFileSync(path.join(CMS,'js/admin.js'),'utf8');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tick=()=>new Promise(r=>setImmediate(r));
const page=n=>{const a=app.indexOf('pages.'+n+' = async');assert(a>=0);return app.slice(a,app.indexOf('\n};',a)+3);};
let pass=0,fail=0;
setTimeout(()=>{console.error('Page test harness deadline exceeded');process.exit(1);},120000);
async function test(id,name,f){try{await f();pass++;console.log(`PASS ${id} ${name}`);}catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.message}`);}}
const order=(extra={})=>({id:'QA-169',userId:'qa',userName:'QA Buyer',createdAt:'2026-09-21T00:00:00Z',status:'Placed',paymentStatus:'Awaiting payment',paymentMethod:'Online',total:1030,subtotal:1030,shipping:0,items:[],rateSnapshot:{gold22:14000},...extra});
function fixture(hash='#/order/QA-169'){
 const dom=new JSDOM('<body><main id="view"></main></body>',{url:'https://qa.invalid/'+hash});const w=dom.window,view=w.document.querySelector('#view'),timers=[],messages=[],quizzes=[];
 w.Shivaa={};
 const c=vm.createContext({window:w,document:w.document,location:w.location,history:w.history,sessionStorage:w.sessionStorage,URLSearchParams,console,
  routeGeneration:1,pages:{},state:{user:{id:'qa',name:'QA Buyer',email:'qa@qa.invalid',addresses:[],loyaltyPoints:0},settings:{phone:'QA',freeShipAbove:50000},cart:[{id:'qaPiece',qty:1}],productsCache:[{id:'qaPiece'}],localWish:[]},
  $:s=>w.document.querySelector(s),$$:s=>[...w.document.querySelectorAll(s)],esc,jsArg:s=>JSON.stringify(s),fmt:n=>'₹'+Number(n).toLocaleString('en-IN'),timeFmt:()=> 'QA date',dateFmt:()=> 'QA date',
  setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},
  guestPinFor:()=>'',emptyShell:(a,b,x)=>'<h1>'+b+'</h1>'+x,signInGate(){},openLogin(){},
  ensureCampaignStuds(){},expressCheckoutOn:()=>false,store:{get:()=>null},price:()=>({total:1030}),prepaidPct:()=>2,isPartner:()=>false,safeUrl:s=>String(s||''),slugify:s=>s,waLink:()=>'',ORDER_STAGES:[],loyaltyTier:()=>'',
  finaleLive:()=>false,finaleQualifiesItems:()=>({ok:false}),finaleAfterOrder(){},campaignGenderOfItems:()=> 'gents',confetti:()=>{c.celebrations++;},celebrations:0,
  toast:m=>messages.push(m),orderStageHTML:()=>'',trackingCardHTML:()=>'',paymentLedgerHTML:()=>'',codConfirmHTML:()=>'',refundCardHTML:()=>'',npsHTML:()=>'',careCTAHTML:()=>'',
  injectProductLD:()=>{c.metadata++;},metadata:0,getProductDetail:id=>c.api('/api/products/'+id),wishIds:async()=>[],isCompared:()=>false,
  certificateSheet:()=>'<section>QA certificate</section>',
  finaleLanding:()=>'<div>QA campaign</div>',bindFinaleCd(){},initGoldParticleCanvas(){},fillPrizeWorth(){},renderSchemeStage(){},fqOpen:o=>quizzes.push(o),Shivaa:{setSchemeStep(){}},
  api:async url=>url.includes('refunds/mine')?{requests:[]}:{order:order()},
 });
 if(app.includes('function viewLifetime('))vm.runInContext(app.slice(app.indexOf('function viewLifetime('),app.indexOf('const pages =',app.indexOf('function viewLifetime('))),c);
 return {c,dom,w,view,timers,messages,quizzes,load:n=>vm.runInContext(page(n),c),
  leave(){c.routeGeneration++;w.location.hash='#/contact';view.textContent='SAFE NEXT PAGE';},
  async timersDone(max=35){for(let i=0;i<max;i++){await tick();if(!timers.length)break;timers.shift()();}await tick();},
  close(){dom.window.close();}};
}
function printer(name,o,blocked=false){let html='',message='',opened=0;const c=vm.createContext({window:{_adminOrders:[o],ShivaaAdmin:{},open:()=>{opened++;return blocked?null:{document:{write:s=>html+=s,close(){}}};}},state:{settings:{gstin:'<img src=x onerror=bad()>'}},esc,escP:esc,toast:s=>message=s});
 const a=admin.indexOf('window.ShivaaAdmin.'+name+' =');vm.runInContext(admin.slice(a,admin.indexOf('\n};',a)+3),c);
 return {run(){c.window.ShivaaAdmin[name](o.id);return html;},get message(){return message;},get opened(){return opened;}};
}
(async()=>{
 for(const name of ['product','order','checkout','account','wishlist','invoice','certificate','certificates','p'])await test('C01/'+name,'late response cannot repaint a later page',async()=>{
  const f=fixture('#/'+name+'/QA-169');let respond, first=true;f.c.api=()=>{ if(first){first=false;return new Promise(r=>{respond=r;});} return Promise.resolve({requests:[],orders:[],wishlist:[],items:[]});};f.load(name);
  try{const pending=f.c.pages[name](f.view,new URLSearchParams(),'QA-169');assert(respond,'fixture must reach a request');f.leave();respond({order:order({invoiceNo:'INV-QA'}),orders:[],wishlist:[],items:[],title:'OLD TITLE',body:'old',product:{id:'qaPiece',name:'QA',category:'rings',images:[]}});
   let error;try{await pending;}catch(e){error=e;}assert.equal(f.view.textContent,'SAFE NEXT PAGE');assert.equal(f.c.metadata,0);assert(!error,error?.message);}
  finally{f.close();}
 });
 await test('C02','URL success and partially paid strings cannot claim full payment',async()=>{
  for(const status of ['Awaiting payment','Partially paid','Unpaid']){const f=fixture('#/order/QA-169?cf=success');f.load('order');f.c.api=async url=>url.includes('refunds')?{requests:[]}:{order:order({paymentStatus:status})};
   try{await f.c.pages.order(f.view,new URLSearchParams('cf=success'),'QA-169');assert(!f.view.textContent.includes('Payment received'));assert(!f.view.textContent.includes('Paid via'));assert.equal(f.c.celebrations,0);}
   finally{f.close();}}
 });
 await test('C02-control','server-confirmed Paid still renders receipt and celebration',async()=>{const f=fixture('#/order/QA-169?cf=success');f.load('order');f.c.api=async url=>url.includes('refunds')?{requests:[]}:{order:order({paymentStatus:'Paid'})};try{await f.c.pages.order(f.view,new URLSearchParams('cf=success'),'QA-169');assert.match(f.view.textContent,/Payment received/);assert.equal(f.c.celebrations,1);assert.equal(f.timers.length,0);}finally{f.close();}});
 await test('C03','scheme consumes real order.paymentStatus response and opens quiz once',async()=>{const f=fixture('#/scheme?step=quiz&cf=pending&orderId=QA-169');f.load('scheme');f.c.finaleLive=()=>true;f.c.api=async()=>({ok:true,order:order({paymentStatus:'Paid'})});try{await f.c.pages.scheme(f.view);await tick();assert.equal(f.quizzes.length,1);assert.equal(f.timers.length,0);}finally{f.close();}});
 await test('C04','scheme timeout/error never invents payment success or opens the quiz',async()=>{
  for(const rejects of [false,true]){const f=fixture('#/scheme?step=quiz&cf=pending&orderId=QA-169');f.load('scheme');f.c.finaleLive=()=>true;f.c.api=async()=>{if(rejects)throw Error('QA offline');return {ok:true,order:order()};};
   try{await f.c.pages.scheme(f.view);await f.timersDone();assert.equal(f.quizzes.length,0);assert(f.view.querySelector('#schemePayRetry a'));assert(f.messages.some(m=>m.includes('not confirmed')));}finally{f.close();}}
 });
 await test('C01/scheme','late campaign confirmation cannot launch a quiz after leaving',async()=>{const f=fixture('#/scheme?step=quiz&cf=pending&orderId=QA-169');let resolve;f.load('scheme');f.c.finaleLive=()=>true;f.c.api=()=>new Promise(r=>resolve=r);try{await f.c.pages.scheme(f.view);f.leave();resolve({paid:true,order:order({paymentStatus:'Paid'})});await f.timersDone();assert.equal(f.quizzes.length,0);}finally{f.close();}});
 await test('C05','exhausted order poller tells the customer checks have paused',async()=>{const f=fixture('#/order/QA-169?cf=pending');f.load('order');try{await f.c.pages.order(f.view,new URLSearchParams('cf=pending'),'QA-169');await f.timersDone();assert.match(f.view.textContent,/checks have paused/);assert(!f.view.textContent.includes('it will keep checking'));}finally{f.close();}});
 await test('C06','unissued retail invoice is gated in both member and admin print views',async()=>{const f=fixture('#/invoice/QA-169');f.load('invoice');try{await f.c.pages.invoice(f.view,new URLSearchParams(),'QA-169');assert.match(f.view.textContent,/Invoice not issued yet/);assert(!f.view.querySelector('.inv-sheet'));const p=printer('printInvoice',order());p.run();assert.equal(p.opened,0);assert.match(p.message,/not issued/);}finally{f.close();}});
 await test('C07','member invoice uses actual invoice number and every total adjustment',async()=>{const f=fixture('#/invoice/QA-169');f.load('invoice');const o=order({invoiceNo:'INV-QA-002',discount:100,prepaidDiscount:20,shipping:30,codFee:10,total:950});f.c.api=async()=>({order:o});try{await f.c.pages.invoice(f.view,new URLSearchParams(),'QA-169');assert.match(f.view.textContent,/INV-QA-002/);for(const text of ['Prepaid discount','Shipping','COD fee','Invoice total'])assert(f.view.textContent.includes(text),text);}finally{f.close();}});
 await test('C08','thermal line totals multiply the unit price by quantity',()=>{const p=printer('printReceipt',order({items:[{name:'QA ring',qty:3,unitPrice:100}],total:300}));assert.match(p.run(),/class="r">300<\/td>/);});
 await test('C09','thermal receipt identifiers and GST metadata cannot inject HTML',()=>{const p=printer('printReceipt',order({id:'<svg onload=bad()>',invoiceNo:'<img src=x>'}));const html=p.run();assert(!html.includes('<svg'));assert(!html.includes('<img'));});
 await test('C10','thermal popup blocker shows actionable guidance',()=>{const p=printer('printReceipt',order(),true);p.run();assert.match(p.message,/Allow pop-ups/);});
 await test('C11','thermal receipt includes coupon/points discount and COD fee',()=>{const html=printer('printReceipt',order({discount:100,codFee:20})).run();assert.match(html,/>Discount</);assert.match(html,/>COD fee</);});
 await test('C12','unpaid guest page does not claim Cashfree already verified delivery',async()=>{const f=fixture();f.load('order');f.c.api=async url=>url.includes('refunds')?{requests:[]}:{order:order({guest:true})};try{await f.c.pages.order(f.view,new URLSearchParams(),'QA-169');assert(!f.view.textContent.includes('your delivery details were verified'));}finally{f.close();}});
 await test('C13','legacy order without a rate snapshot does not crash the page',async()=>{const f=fixture();f.load('order');const o=order();delete o.rateSnapshot;f.c.api=async url=>url.includes('refunds')?{requests:[]}:{order:o};try{await f.c.pages.order(f.view,new URLSearchParams(),'QA-169');assert.match(f.view.textContent,/QA-169/);}finally{f.close();}});
 await test('C13/rate-metal','silver order summary shows saved silver rate, not the gold snapshot',async()=>{const f=fixture();f.load('order');const o=order({items:[{name:'QA Silver',metal:'Silver',purity:'925',qty:1,unitPrice:1030,ratePerGram:203}],rateSnapshot:{gold22:14000,silver:203}});f.c.api=async url=>url.includes('refunds')?{requests:[]}:{order:o};try{await f.c.pages.order(f.view,new URLSearchParams(),'QA-169');assert.match(f.view.textContent,/925 Silver: ₹203\/g/);assert(!f.view.textContent.includes('₹14,000/g'));}finally{f.close();}});
 await test('C01/poll','late paid poll cannot redirect a newer order page',async()=>{const f=fixture('#/order/QA-169?cf=pending');let resolve;f.load('order');f.c.finaleLive=()=>true;f.c.finaleQualifiesItems=()=>({ok:true});f.c.api=async url=>url.includes('refunds')?{requests:[]}:url.includes('/status')?new Promise(r=>resolve=r):{order:order()};try{await f.c.pages.order(f.view,new URLSearchParams('cf=pending'),'QA-169');f.timers.shift()();await tick();assert(resolve);f.leave();f.w.location.hash='#/order/NEW';f.view.innerHTML='<div id="ppBanner"><small>NEW ORDER</small></div>';resolve({order:order({paymentStatus:'Paid'})});await tick();assert.equal(f.w.location.hash,'#/order/NEW');assert.equal(f.view.textContent,'NEW ORDER');}finally{f.close();}});
 console.log(`\nv169 pages: ${pass} passed, ${fail} failed (C01 is one race class exercised across pages)`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
