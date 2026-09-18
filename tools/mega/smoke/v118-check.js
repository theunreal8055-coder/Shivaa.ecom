/* SHIVAA v118 regression check — gallery, Quick View, categories, checkout handoff.
   v128 — gateway checks updated for the Cashfree hosted checkout. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const results=[];
function ok(name, pass, detail=''){results.push(!!pass);console.log(`${pass?'  PASS  ':'  FAIL  '}${name}${!pass&&detail?'\n          '+detail:''}`)}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=8000){const t=Date.now();while(Date.now()-t<ms){try{if(fn())return true}catch(_){}await sleep(50)}return false}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);let f=path.join(CMS,u==='/'?'index.html':u);if(!path.resolve(f).startsWith(path.resolve(CMS)))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});res.end(b)})});
(async()=>{
 const html=fs.readFileSync(path.join(CMS,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(CMS,'js/app.js'),'utf8');
 const v116=fs.readFileSync(path.join(CMS,'js/v116.js'),'utf8');
 const css=fs.readFileSync(path.join(CMS,'css/v118.css'),'utf8');
 const sw=fs.readFileSync(path.join(CMS,'sw.js'),'utf8');
 console.log('\nSHIVAA v118 checkout + catalogue check\n\n· static gates');
 ok('release handshake is v118 or newer',/__SHIVAA_REL\s*=\s*(118|119|120|121|122|123|124|125|126|127|128|129|130|131|132|133|134|135)/.test(html)&&/APP_REL\s*=\s*(118|119|120|121|122|123|124|125|126|127|128|129|130|131|132|133|134|135)/.test(app));
 ok('v118 CSS and JS are loaded',/v118\.css\?v=118/.test(html)&&/v118\.js\?v=118/.test(html));
 ok('service-worker shell is v118 or newer',/SHELL = 'shivaa-shell-v(118|119|120|121|122|123|124|125|126|127|128|129|130|131|132|133|134|135)'/.test(sw));
 ok('category rail images are eager with a safe fallback',/loading="eager" decoding="async" fetchpriority="low"/.test(app)&&/\.cb-img img \{ display:block/.test(css));
 ok('gallery dots are buttons and gestures use pointer capture',/id="galDots"[\s\S]{0,400}<button type="button"/.test(app)&&/setPointerCapture/.test(app)&&/lostpointercapture/.test(app));
 ok('Quick View opens on click, not pointerup',/document\.addEventListener\('click', function\(e\)/.test(v116)&&!/document\.addEventListener\('pointerup', function\(e\)/.test(v116));
 ok('Cashfree handoff has retry/cancel and opens the SDK checkout',/id="cfContinue"/.test(app)&&/id="cfCancel"/.test(app)&&/cf\.checkout\(\{ paymentSessionId/.test(app));
 ok('Cashfree checkout uses the official v3 SDK with a session id',/sdk\.cashfree\.com\/js\/v3\/cashfree\.js/.test(app)&&/paymentSessionId: String\(paymentSessionId\)/.test(app));

 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`; const errors=[];
 console.log('\n· live behaviour — '+origin);
 const dom=new JSDOM(html,{url:origin+'/',runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
  w.addEventListener('error',e=>{if(!(e.target&&e.target.tagName==='IMG'))errors.push(e.message||String(e.error))});
  w.fetch=input=>{const u=new URL(String(input),origin);let out={};
   if(u.pathname==='/api/rates')out={t:new Date().toISOString(),source:'live',live:false,gold24:15600,gold22:14405,gold18:11696,silver:242.4,jaipur:{gold24:15600,gold22:14405,gold18:11696,silver:242.4},rtgs:{rows:{}},history:[]};
   else if(u.pathname==='/api/settings')out={settings:DB.settings}; else if(u.pathname==='/api/making-charges')out={table:[]}; else if(u.pathname==='/api/catalogs')out={catalogs:[]}; else if(u.pathname==='/api/products')out={products:DB.products}; else if(u.pathname.startsWith('/api/products/')){const id=decodeURIComponent(u.pathname.split('/').pop());out={product:DB.products.find(p=>p.id===id),similar:DB.products.slice(1,5),reviews:[],rates:{}}} else if(u.pathname==='/api/pages')out={pages:[]}; else out={};
   return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(out),text:()=>Promise.resolve(JSON.stringify(out))});
  };
 }});
 const w=dom.window,d=w.document;
 ok('storefront boots',await until(()=>w.Shivaa&&w.Shivaa.state.productsCache.length===77,20000));
 w.location.hash='#/shop?category=rings';
 ok('a populated category opens its product grid',await until(()=>d.querySelectorAll('#shopGrid .p-card').length>0),d.body.textContent.slice(0,200));
 const catImgs=[...d.querySelectorAll('.shop-catbar .cb-img img')];
 ok('mobile category rail carries all image thumbnails',catImgs.length>=18&&catImgs.every(i=>i.getAttribute('loading')==='eager'),String(catImgs.length));
 w.location.hash='#/shop?category=necklaces';
 ok('an empty category stays on a useful category page',await until(()=>/being catalogued/i.test(d.querySelector('#shopGrid')?.textContent||'')));
 const p=DB.products[0]; w.location.hash='#/product/'+p.id;
 ok('product page renders all four gallery slides',await until(()=>d.querySelectorAll('#galTrack .gal-slide').length===4),String(d.querySelectorAll('#galTrack .gal-slide').length));
 const before=d.querySelector('#galTrack').style.transform;d.querySelector('.gal-next').click();
 ok('product gallery next arrow changes the visible photo',await until(()=>d.querySelector('#galTrack').style.transform!==before),d.querySelector('#galTrack').style.transform);
 w.location.hash='#/shop?category=rings';await until(()=>d.querySelector('.pc-quick'));
 const oldHash=w.location.hash;d.querySelector('.pc-quick').click();
 ok('Quick View opens without navigating to product page',await until(()=>d.querySelector('.qv-modal .qv'))&&w.location.hash===oldHash,w.location.hash);
 ok('Cashfree checkout launcher is registered',typeof w.Shivaa.cashfreeCheckout==='function');
 ok('legacy PayU form submitter is removed',typeof w.Shivaa.payuSubmit!=='function');
 ok('no unhandled page errors',errors.length===0,errors.join(' | '));
 dom.window.close();server.close();
 const n=results.filter(Boolean).length;console.log(`\n${n}/${results.length} v118 checks passed  ✦`);process.exit(n===results.length?0:1);
})().catch(e=>{console.error(e);server.close();process.exit(2)});
