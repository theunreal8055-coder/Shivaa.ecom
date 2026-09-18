/* What EXACTLY does the un-fixed bag tap do over time? (jsdom has no real
   browser navigation, so measure the observable sequence, do not assume it.) */
const { JSDOM } = require('jsdom');
const fs = require('fs'); const http = require('http'); const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = path.join(ROOT, 'cms');
const DB = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (fn()) return true; } catch (_) {} await sleep(50); } return false; }
const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.mp4':'video/mp4','.webp':'image/webp' };
const server = http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=path.join(CMS,u==='/'?'index.html':u);
 if(!path.resolve(f).startsWith(path.resolve(CMS)))return res.writeHead(403).end();
 fs.readFile(f,(e,b)=>e?res.writeHead(404).end():(res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'}),res.end(b)));});
const jaipur={gold24:15655,gold22:14405,gold18:11696,silver:242.4};
const RATES={t:new Date().toISOString(),source:'live-mcx',live:false,spot:jaipur,jaipur,...jaipur,
 rtgs:{rows:{},anchor:'mcx-future',updatedAt:new Date().toISOString()},premium:{gold:55,silver:3,gold22:398},
 anchorLevel:{mode:'mcx-future',goldPerG:15056,silverPerG:99500},
 history:[Object.assign({t:new Date(Date.now()-6e4).toISOString()},jaipur)],nextUpdateIn:60};
const V139 = /<script src="\/js\/v139\.js\?v=139" defer><\/script>/;
function boot(strip){
  const backs={n:0}; const seq=[];
  const html=fs.readFileSync(path.join(CMS,'index.html'),'utf8').replace(V139, strip?'':m=>m);
  const dom=new JSDOM(html,{url:`http://127.0.0.1:${server.address().port}/#/`,runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,
    beforeParse(w){
      w.innerWidth=420;w.innerHeight=900;
      w.matchMedia=q=>({matches:/max-width:\s*[6-8]\d\dpx/.test(q),media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
      w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}}; w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
      w.scrollTo=()=>{};
      Object.defineProperty(w.navigator,'vibrate',{value:()=>true,configurable:true});
      w.HTMLMediaElement.prototype.play=()=>Promise.resolve(); w.HTMLMediaElement.prototype.pause=()=>{};
      const rb=w.history.back.bind(w.history);
      Object.defineProperty(w.history,'back',{configurable:true,writable:true,value:function(){backs.n++;seq.push('history.back() @hash='+w.location.hash);return rb();}});
      w.addEventListener('hashchange',()=>seq.push('hashchange -> '+w.location.hash));
      w.addEventListener('popstate',()=>seq.push('popstate @hash='+w.location.hash));
      w.fetch=(input)=>{const p=String(input).split('?')[0];let status=200,out={};
        if(p.endsWith('/api/rates'))out=RATES;
        else if(p.endsWith('/api/settings'))out={settings:DB.settings};
        else if(p.endsWith('/api/making-charges'))out={table:[]};
        else if(p.endsWith('/api/catalogs'))out={catalogs:[]};
        else if(p.endsWith('/api/auth/me'))out={user:null};
        else if(p.endsWith('/api/products'))out={products:DB.products};
        else if(p.includes('/api/products/'))out={product:DB.products[0],similar:[],reviews:[],rates:DB.rates.last};
        else if(p.endsWith('/api/pay/config'))out={mode:'demo',prepaidPct:2,lockMinutes:20};
        else if(p.endsWith('/api/pages'))out={pages:[]};
        else{status=404;out={error:'not stubbed: '+p};}
        const J=()=>({ok:status<300,status,json:()=>Promise.resolve(out),text:()=>Promise.resolve(JSON.stringify(out))});
        return Promise.resolve(J());};
    }});
  return {w:dom.window,doc:dom.window.document,backs,seq,
    $:s=>dom.window.document.querySelector(s),$$:s=>[...dom.window.document.querySelectorAll(s)],
    click:(el,o)=>el.dispatchEvent(new dom.window.MouseEvent('click',Object.assign({bubbles:true,cancelable:true},o))),
    booted:()=>until(()=>dom.window.document.querySelector('#heroCarousel')&&dom.window.document.querySelectorAll('.c-slide').length>=2,25000)};
}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const pid=DB.products[0].id;
  for (const strip of [false,true]) {
    const S=boot(strip);
    await S.booted(); await sleep(400);
    S.w.eval(`window.Shivaa.addToCart(${JSON.stringify(pid)},1,{silent:false})`);
    await until(()=>S.$('#cartDrawer')&&S.$('#cartDrawer').classList.contains('open'),8000);
    S.backs.n=0; S.seq.length=0;
    S.click(S.$('.mc-foot a[href="#/checkout"]'));
    console.log(`\n── v139 ${strip?'STRIPPED (before the fix)':'loaded (after the fix)'} ──`);
    for (const t of [60,250,700,1500]) { await sleep(t===60?60:t-0); console.log(`  t≈${String(t).padStart(4)}ms  hash=${JSON.stringify(S.w.location.hash)}  backs=${S.backs.n}  data-page=${S.doc.body.dataset.page}  authSheet=${!!(S.$('#shvAuthWrap')&&!S.$('#shvAuthWrap').hidden)}`); if(t>=1500)break; }
    console.log('  event order:', JSON.stringify(S.seq));
    try{S.w.close();}catch(_){}
  }
  server.close(); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
