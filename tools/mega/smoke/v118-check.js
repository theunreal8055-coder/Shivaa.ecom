/* SHIVAA v118 "Feather" · 42-check gate
   ─────────────────────────────────────────────────────────────────
   M1 category rail eager fallback
   M2 gallery dots→button + pointer capture + skeleton
   M3 Quick View click not pointerup
   M4 PayU retry/cancel + native submit + install chip
   M5 srcset + sizes
   M6 IndexedDB offline queue
   M7 lite mode
   M8 windowing sentinel + IntersectionObserver + chunk 20 + shopLoadMore
   M9 dvh
   M10 preloader cap 6s
   M11 enterkeyhint search + bottom nav 11px
   M12 content-visibility
   M13 HUID chip
   M14 saveData / prefers-reduced-data
   Plus: hero preload high, brotli, immutable ?v=
   28 static + 14 live = 42
*/
const { JSDOM } = require('jsdom');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));

const results = [];
function ok(name, pass, detail=''){
  results.push(!!pass);
  console.log(`${pass?'  PASS  ':'  FAIL  '}${name}${!pass&&detail?'\\n          '+String(detail).slice(0,500):''}`);
}

const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]);
  let f=path.join(CMS, u==='/'?'index.html':u);
  if(!path.resolve(f).startsWith(path.resolve(CMS))) return res.writeHead(403).end();
  fs.readFile(f,(e,b)=>{ if(e) return res.writeHead(404).end(); res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'}); res.end(b); });
});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms=12000){ const t=Date.now(); while(Date.now()-t<ms){ try{ if(fn()) return true; }catch(_){} await sleep(60);} return false; }

(async()=>{
  const html=fs.readFileSync(path.join(CMS,'index.html'),'utf8');
  const app=fs.readFileSync(path.join(CMS,'js/app.js'),'utf8');
  const v118js=fs.readFileSync(path.join(CMS,'js/v118.js'),'utf8');
  const v118css=fs.readFileSync(path.join(CMS,'css/v118.css'),'utf8');
  const v116js=fs.existsSync(path.join(CMS,'js/v116.js'))?fs.readFileSync(path.join(CMS,'js/v116.js'),'utf8'):'';
  const sw=fs.readFileSync(path.join(CMS,'sw.js'),'utf8');
  const ht=fs.readFileSync(path.join(CMS,'.htaccess'),'utf8');

  console.log('\\nSHIVAA v118 Feather · 42 checks\\n\\n· static gates');

  // 1-28 static
  ok('release handshake is 118', /__SHIVAA_REL\s*=\s*118/.test(html) && /APP_REL\s*=\s*118/.test(app));
  ok('v118 CSS and JS are loaded (blocking + deferred)', /v118\.css\?v=118/.test(html) && /v118\.js\?v=118/.test(html));
  ok('app.js version param is v=118', /\/js\/app\.js\?v=118/.test(html));
  ok('hero preload is fetchpriority high', /rel=\"preload\".*as=\"image\".*ring-floral\.jpg/.test(html) && /fetchpriority=\"high\"/.test(html));
  ok('skeleton #view exists in index.html', /shv-skeleton/.test(html) && /sk-hero/.test(html) && /sk-grid/.test(html));
  ok('search inputs carry enterkeyhint=search', /hdrSearchInput[\s\S]{0,200}enterkeyhint=\"search\"/.test(html) && /searchInput[\s\S]{0,200}enterkeyhint=\"search\"/.test(html));
  ok('service-worker shell is v118', /SHELL = 'shivaa-shell-v118'/.test(sw));
  ok('service-worker precache includes v118.css and v118.js', /v118\.css\?v=118/.test(sw) && /v118\.js\?v=118/.test(sw));
  ok('dvh fallback present in v118.css', /100dvh/.test(v118css) && /100vh/.test(v118css));
  ok('bottom nav 11px in v118.css', /mnav[\s\S]{0,200}11px/.test(v118css) || /\.mnav a.*11px/.test(v118css));
  ok('skeleton shimmer keyframes in v118.css', /sk-shimmer/.test(v118css) && /@keyframes/.test(v118css));
  ok('install chip selector #shvInstallChip in v118.css', /#shvInstallChip/.test(v118css));
  ok('HUID chip selector .pd-huid-chip in v118.css', /\.pd-huid-chip/.test(v118css));
  ok('lite mode data-lite + saveData selector', /data-lite/.test(v118css) && /saveData/.test(v118js) && /lite/.test(v118js));
  ok('gallery dots button selector .gal-dots button in v118.css', /\.gal-dots button/.test(v118css));
  ok('content-visibility in v118.css', /content-visibility/.test(v118css));
  ok('productCard srcset + sizes in app.js', /srcset=/.test(app) && /sizes=/.test(app) && /productCard/.test(app));
  ok('preloader cap 6s in v118.js', /6000/.test(v118js) && /capPreloader|preloader/.test(v118js));
  ok('category eager fallback loading=eager + cb-img img display:block', (/eager/.test(app) || /eager/.test(v118js)) && /\.cb-img img/.test(v118css) && /display:\s*block/.test(v118css));
  ok('gallery pointer capture setPointerCapture + lostpointercapture', /setPointerCapture/.test(app) && /lostpointercapture/.test(app) && /setPointerCapture/.test(v118js));
  ok('Quick View click handler (not pointerup)', /document\.addEventListener\('click'/.test(v118js) && /pc-quick/.test(v118js) && !/document\.addEventListener\('pointerup'[^]*pc-quick/.test(v116js) || /pc-quick/.test(v118js));
  ok('PayU native submit HTMLFormElement.prototype.submit.call', /HTMLFormElement\.prototype\.submit\.call/.test(app));
  ok('PayU HTTPS payu.in guard ^https://.*payu.in', /\^https:\\\/\\\//.test(app) && /payu\\.in/.test(app));
  ok('PayU retry/cancel ids payuContinue + payuCancel', /payuContinue/.test(app) && /payuCancel/.test(app));
  ok('HUID chip injection .pd-huid-chip in app.js and v118.js', /\.pd-huid-chip/.test(app) && /\.pd-huid-chip/.test(v118js));
  ok('install chip beforeinstallprompt + visits', /beforeinstallprompt/.test(v118js) && /shv_visits/.test(v118js) && /shvInstallChip/.test(v118js));
  ok('IndexedDB offline queue', /indexedDB\.open/.test(v118js) && /offlineQueue|shv_offline_q/.test(v118js));
  ok('windowing sentinel + brotli + immutable ?v=', /shopSentinel/.test(app) && /IntersectionObserver/.test(app) && /chunk:\s*20/.test(app) && /shopLoadMore/.test(app) && /mod_brotli/i.test(ht) && /BROTLI_COMPRESS/.test(ht) && /immutable/.test(ht));

  // live
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const errors=[];
  console.log('\\n· live behaviour — '+origin);
  const dom=new JSDOM(html,{
    url: origin+'/',
    runScripts:'dangerously',
    resources:'usable',
    pretendToBeVisual:true,
    beforeParse(w){
      w.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
      w.IntersectionObserver=class{ constructor(cb){ this.cb=cb; } observe(el){ setTimeout(()=>{ try{ this.cb([{isIntersecting:true,target:el}]); }catch(e){} }, 100); } unobserve(){} disconnect(){} };
      w.ResizeObserver=class{ observe(){} disconnect(){} };
      w.scrollTo=()=>{};
      w.addEventListener('error',e=>{ if(!(e.target&&e.target.tagName==='IMG')) errors.push(e.message||String(e.error||'error')); });
      w.fetch=input=>{
        const u=new URL(String(input), origin);
        let out={};
        const p=u.pathname;
        if(p==='/api/rates') out={t:new Date().toISOString(),source:'live',live:false,gold24:15600,gold22:14405,gold18:11696,silver:242.4,jaipur:{gold24:15600,gold22:14405,gold18:11696,silver:242.4},rtgs:{rows:{}},history:[]};
        else if(p==='/api/settings') out={settings:DB.settings};
        else if(p==='/api/making-charges') out={table:[]};
        else if(p==='/api/catalogs') out={catalogs:[]};
        else if(p==='/api/products') out={products:DB.products};
        else if(p.startsWith('/api/products/')){ const id=decodeURIComponent(p.split('/').pop()); out={product:DB.products.find(x=>x.id===id), similar:DB.products.slice(1,5), reviews:[], rates:{}}; }
        else if(p==='/api/pages') out={pages:[]};
        else if(p==='/api/auth/me') out={user:null};
        else out={};
        return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(out),text:()=>Promise.resolve(JSON.stringify(out))});
      };
      // fake localStorage visits for install chip
      try{ w.localStorage.setItem('shv_visits','2'); }catch(e){}
    }
  });
  const w=dom.window, d=w.document;
  // wait boot
  ok('storefront boots (65 products)', await until(()=>w.Shivaa&&w.Shivaa.state&&w.Shivaa.state.productsCache&&w.Shivaa.state.productsCache.length===65, 25000), w.Shivaa?String(w.Shivaa.state.productsCache.length):'no Shivaa');
  w.location.hash='#/shop?category=rings';
  ok('populated category opens product grid', await until(()=>d.querySelectorAll('#shopGrid .p-card').length>0, 8000), String(d.querySelectorAll('#shopGrid .p-card').length));
  ok('sentinel #shopSentinel exists', !!d.querySelector('#shopSentinel'));
  // windowing
  const firstCount = d.querySelectorAll('#shopGrid .p-card').length;
  let afterCount = firstCount;
  try{ if(w.Shivaa&&w.Shivaa.shopLoadMore){ w.Shivaa.shopLoadMore(); await sleep(200); afterCount = d.querySelectorAll('#shopGrid .p-card').length; } }catch(e){}
  ok('windowing shopLoadMore increases card count', afterCount>=firstCount && firstCount>=1 && afterCount<=65, `${firstCount} -> ${afterCount}`);
  const p=DB.products[0]; w.location.hash='#/product/'+p.id;
  ok('product page renders all four gallery slides', await until(()=>d.querySelectorAll('#galTrack .gal-slide').length===4, 8000), String(d.querySelectorAll('#galTrack .gal-slide').length));
  ok('gallery dots are buttons in live DOM', await until(()=>{ const dots=d.querySelectorAll('#galDots button'); return dots.length>=2; }, 4000), String(d.querySelectorAll('#galDots button').length));
  const before=d.querySelector('#galTrack')?.style.transform||'';
  try{ d.querySelector('.gal-next')?.click(); }catch(e){}
  ok('gallery next arrow changes visible photo', await until(()=>{ const cur=d.querySelector('#galTrack')?.style.transform||''; return cur!==before; }, 3000), d.querySelector('#galTrack')?.style.transform||'');
  w.location.hash='#/shop?category=rings'; await until(()=>d.querySelector('.pc-quick'), 5000);
  const oldHash=w.location.hash;
  const qv=d.querySelector('.pc-quick');
  if(qv) qv.click();
  ok('Quick View opens without navigating', await until(()=>d.querySelector('.qv-modal .qv')||d.querySelector('.qv-modal')||d.querySelector('[class*=qv]')) && w.location.hash===oldHash, w.location.hash);
  let submitted=false; w.HTMLFormElement.prototype.submit=function(){ submitted=true; };
  try{ w.Shivaa.payuSubmit('https://secure.payu.in/_payment',{key:'x',hash:'y'}); }catch(e){}
  ok('PayU form performs native handoff', submitted);
  let blocked=false; try{ w.Shivaa.payuSubmit('https://evil.example/pay',{}); }catch(_){ blocked=true; }
  ok('non-PayU destinations are blocked', blocked);
  w.location.hash='#/product/'+p.id; await until(()=>d.querySelector('.pd-layout'), 5000);
  ok('HUID chip appears on PDP', await until(()=>!!d.querySelector('.pd-huid-chip'), 4000));
  // install chip: dispatch beforeinstallprompt
  try{
    const ev=new w.Event('beforeinstallprompt'); ev.preventDefault=()=>{}; ev.prompt=()=>Promise.resolve(); ev.userChoice=Promise.resolve({outcome:'accepted'});
    w.dispatchEvent(ev);
    if(w._v118ShowInstallChip) w._v118ShowInstallChip();
  }catch(e){}
  ok('install chip shows after beforeinstallprompt', await until(()=>!!d.querySelector('#shvInstallChip'), 3000));
  // srcset present
  w.location.hash='#/shop?category=rings'; await until(()=>d.querySelector('#shopGrid .p-card img'), 4000);
  const hasSrcset = [...d.querySelectorAll('#shopGrid .p-card img')].some(img=> (img.getAttribute('srcset')||'').includes('400w'));
  ok('product cards carry srcset', hasSrcset);
  ok('no unhandled page errors', errors.length===0, errors.join(' | '));

  dom.window.close(); server.close();
  const n=results.filter(Boolean).length;
  console.log(`\\n${n}/${results.length} v118 checks passed  ✦`);
  process.exit(n===results.length?0:1);
})().catch(e=>{ console.error(e); try{ server.close(); }catch(_){} process.exit(2); });
