/* v178 — the in-footer app band (PWA install, no store, no APK).
   Static invariants (stamps in lockstep, the band really in the footer,
   the v140 law: nothing floats, nothing auto-appears, dismiss sticks),
   the vendored QR encoder EXECUTED (finder/timing/determinism), and the
   band's behaviour exercised in an isolated DOM against the REAL band
   markup extracted from index.html. No network, no production files. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const CMS=process.env.SMOKE_CMS||path.resolve(__dirname,'../../../cms');
const rd=n=>fs.readFileSync(path.join(CMS,n),'utf8');
const index=rd('index.html'),sw=rd('sw.js'),app=rd('js/app.js'),api=rd('api.php');
const v178=rd('js/v178.js'),css178=rd('css/v178.css');
/* SUPERSEDED-PROBE v178 — stamp-exact suite for release 178: on a NEWER
   tree it SKIPs (regression content re-executes inside the current chain's
   php-run); on its own release or an overlay of its zip it runs in full. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 178) {
    console.log('SKIP v178-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in the v179/v180 chain php-run)');
    process.exit(0);
  }
}
let pass=0,fail=0;
setTimeout(()=>{console.error('v178 harness deadline exceeded');process.exit(1);},120000);
async function test(id,name,f){try{await f();pass++;console.log(`PASS ${id} ${name}`);}catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.message}`);}}
const tick=()=>new Promise(r=>setImmediate(r));

/* the band markup as SHIPPED in index.html — the behaviour tests run on this */
const BAND_RE=/<section class="fv-appband"[\s\S]*?<\/section>/;
const bandMarkup=index.match(BAND_RE);

/* the vendored encoder, isolated from the app logic (its own IIFE) */
function vendorSource(){
 const a=v178.indexOf('var QRFactory = (function () {');
 const b=v178.indexOf('    return qrcode;\n  })();');
 assert(a>=0&&b>a,'QRFactory IIFE must be intact in js/v178.js');
 return v178.slice(a,b)+'    return qrcode;\n  })();';
}
async function runVendor(){ return (0,eval)('(function(){'+vendorSource()+'; return QRFactory;})()'); }

(async()=>{
 await test('S01','release 178 in lockstep across all four stamp sites',async()=>{
  assert.ok(index.includes('window.__SHIVAA_REL=178;'),'index stamp');
  assert.ok(app.includes('const APP_REL = 178;'),'app stamp');
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v178';")&&sw.includes('const REL = 178;'),'worker stamps');
  assert.ok(api.includes("'rel'   => 178,"),'api version endpoint');
 });
 await test('S02','every asset URL re-stamped to 178, zero 177 leftovers',async()=>{
  assert.ok(index.match(/\?v=178/g).length>=56,'index carries the full asset sheet + the two new assets');
  assert.equal(sw.match(/\?v=178/g).length,51,'worker precache list (49 + v178 css/js)');
  for (const [name,src] of [['index.html',index],['sw.js',sw],['js/app.js',app],['js/v178.js',v178],['css/v178.css',css178]])
   assert.ok(!src.includes('?v=177'),name+' still pins a v177 asset URL');
  assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"),'media generation deliberately unchanged (no media shipped)');
 });
 await test('S03','v178.css is the last stylesheet; both new assets are precached',async()=>{
  const links=[...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(links.length>0,'page must have stylesheets');
  assert.ok(links[links.length-1].startsWith('/css/v178.css?v=178'),'v178 sheet must be last');
  assert.ok(sw.includes("'/css/v178.css?v=178'")&&sw.includes("'/js/v178.js?v=178'"),'worker precaches the new pair');
  const scripts=[...index.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>m[1]);
  const i67=scripts.findIndex(s=>s.startsWith('/js/v167.js')),i78=scripts.findIndex(s=>s.startsWith('/js/v178.js'));
  assert.ok(i67>=0&&i78>i67,'v178.js must load after v167.js (last layer)');
 });
 await test('S04','the band is real footer HTML, hydrated by the last script',async()=>{
  assert.ok(bandMarkup,'the fv-appband section exists in index.html');
  const fcols=index.indexOf('<nav class="fv-cols"'),ft=index.indexOf('<div class="fv-trust">');
  const fb=index.indexOf('<section class="fv-appband"');
  assert.ok(fcols>-1&&fb>fcols&&ft>fb,'band sits between the footer nav and the trust row');
  for (const id of ['shvAppBand','shvAppQr','shvAppCta','shvAppDismiss'])
   assert.ok(bandMarkup[0].includes('id="'+id+'"'),'band carries #'+id);
  assert.ok(/<canvas id="shvAppQr" width="256" height="256">/.test(bandMarkup[0]),'QR is a real canvas');
  const firstTag=bandMarkup[0].slice(0,bandMarkup[0].indexOf('>'));
  assert.ok(!/\bhidden\b/.test(firstTag),'the band ships unhidden — the script decides');
 });
 await test('S05','the v140 law: nothing floats, nothing auto-runs, dismiss sticks',async()=>{
  assert.ok(!v178.includes('shvInstallChip'),'v178 must never touch the dead install-chip id');
  assert.ok(!/setTimeout|setInterval/.test(v178),'no timers: every action is instant, nothing re-appears on its own');
  assert.ok(!v178.includes('alert('),'no browser alerts');
  const bandCss=css178.slice(css178.indexOf('.fv-appband{'),css178.indexOf('.fv-appband[hidden]'));
  assert.ok(!/position:\s*(fixed|absolute)/.test(bandCss),'the band itself is in normal footer flow');
  assert.ok(css178.includes('.shv-sheet{position:fixed'),'only the tap-open sheet may overlay');
  assert.ok(css178.includes('[hidden]{display:none'),'hidden really hides');
  assert.ok(v178.includes("const LS_KEY = 'shv.appband.v1'")||v178.includes("var LS_KEY = 'shv.appband.v1'"),'dismiss persists under a versioned key');
  assert.ok(v178.includes('30 * 86400e3'),'30-day courtesy re-show window');
  assert.ok(/beforeinstallprompt[\s\S]{0,200}preventDefault/.test(v178),'the one-tap prompt is captured, never auto-fired');
  assert.ok(v178.includes('appinstalled'),'an installed app hides the band');
  assert.ok(v178.includes('(display-mode: standalone)')&&v178.includes('navigator.standalone === true'),'standalone detection covers Chrome and iOS');
  assert.ok(/keydown[\s\S]{0,120}Escape/.test(v178)||/Escape[\s\S]{0,120}closeSheet/.test(v178),'Esc closes the sheet instantly');
  assert.ok(/e\.target === wrap\)?\s*closeSheet/.test(v178)||v178.includes('e.target === wrap'),'backdrop click closes the sheet');
 });
 await test('S06','the QR points at the canonical site URL, offline, on-device',async()=>{
  assert.ok(v178.includes("meta[property=\"og:url\"]"),'QR content comes from the og:url meta');
  assert.ok(v178.includes('https://shivaa.in/'),'canonical fallback');
  assert.ok(v178.includes('Kazuhiko Arase')&&/MIT/i.test(v178),'vendored encoder keeps its license');
  assert.ok(v178.includes('https://github.com/kazuhikoarase/qrcode-generator'),'provenance recorded');
  const appCode=v178.slice(v178.indexOf('  })();',v178.indexOf('var QRFactory')),'end');
  assert.ok(!/fetch\(|XMLHttpRequest|new Image\(/.test(appCode),'no network, no image round-trip for the QR');
 });
 await test('S07','the vendored QR encoder executes correctly (finder, timing, determinism)',async()=>{
  const QR=await runVendor();
  const mk=u=>{const q=QR(0,'M');q.addData(u);q.make();return q;};
  const qr=mk('https://shivaa.in/');
  const n=qr.getModuleCount();
  assert.equal(n,25,'version-1 grid for the site URL');
  const D=(r,c)=>qr.isDark(r,c)===true;
  for (const [name,ok] of [
   ['top-left finder',D(0,0)&&D(0,6)&&D(6,0)&&D(6,6)&&D(3,3)&&!D(0,7)&&!D(7,0)],
   ['top-right finder',D(0,n-1)&&D(0,n-7)&&D(6,n-1)&&D(6,n-7)&&!D(0,n-8)&&!D(7,n-1)],
   ['bottom-left finder',D(n-1,0)&&D(n-7,0)&&D(n-1,6)&&D(n-7,6)&&!D(n-8,0)&&!D(n-1,7)],
   ['timing row (dark on even)',!D(6,7)&&D(6,8)&&!D(6,9)&&D(6,10)&&!D(6,11)&&D(6,12)],
   ['timing column (dark on even)',D(8,6)&&!D(9,6)&&D(10,6)&&!D(11,6)],
   ['dark module',D(n-8,8)]
  ]) assert.ok(ok,name);
  const q2=mk('https://shivaa.in/');
  let same=q2.getModuleCount()===n;
  for (let r=0;r<n&&same;r++)for (let c=0;c<n&&same;c++)if (qr.isDark(r,c)!==q2.isDark(r,c))same=false;
  assert.ok(same,'the same URL always draws the same code (phones cache one, not a lot)');
  const long=mk('https://shivaa.in/#/product/qa-piece-with-a-quite-long-slug-for-canvas-sizing-0000');
  assert.ok(long.getModuleCount()>n,'longer content grows the grid instead of failing');
 });
 await test('S08','the shipped JavaScript parses cleanly',async()=>{
  for (const f of ['js/v178.js','js/app.js','js/admin.js','sw.js'])
   execFileSync(process.execPath,['--check',path.join(CMS,f)],{timeout:30000});
  assert.ok(true);
 });
 await test('S09','the v177 defect repairs are undisturbed by the 178 bump',async()=>{
  assert.ok(api.includes('JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE'),'v176 killer fix intact');
  assert.ok(!api.includes('JSON_UNESIGNED'),'still no invented JSON flags');
  assert.ok(!index.includes('?v=176')&&!sw.includes('?v=176'),'no v176 pins resurfaced');
  assert.ok(api.includes("($b['scope'] ?? 'unpaid') : ($_GET['scope'] ?? 'unpaid')"),'v177 scope-preview fix intact');
 });

 /* ── behaviour: the REAL band markup in an isolated DOM ─────────────── */
 function fixture(opts={}){
  const html='<!doctype html><html><head><meta property="og:url" content="https://shivaa.in/"></head><body>'
   +'<footer class="footer"><div class="fv-cols"><nav class="fv-cols-nav"></nav></div>'
   +(bandMarkup?bandMarkup[0]:'')+
   '<div class="fv-trust"></div></footer></body></html>';
  const dom=new JSDOM(html,{url:'https://qa.invalid/',runScripts:'dangerously',
   userAgent:opts.ua||'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'});
  const w=dom.window;
  if (opts.ua)Object.defineProperty(w.navigator,'userAgent',{value:opts.ua,configurable:true});
  w.matchMedia=q=>({matches:!!(opts.standaloneChrome&&String(q).includes('standalone')),media:q,
   addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  if (opts.standaloneIOS)Object.defineProperty(w.navigator,'standalone',{value:true,configurable:true});
  for (const [k,v] of Object.entries(opts.ls||{}))w.localStorage.setItem(k,v);
  const draws=[];
  const cv=w.document.getElementById('shvAppQr');
  cv.getContext=()=>({fillRect:(x,y,a,b)=>draws.push([x,y,a,b])});
  const errors=[];
  w.addEventListener('error',e=>errors.push(e.message));
  w.eval(v178);
  return {w,dom,draws,errors,
   band:()=>w.document.getElementById('shvAppBand'),
   cta:()=>w.document.getElementById('shvAppCta'),
   sheet:()=>w.document.querySelector('.shv-sheet'),
   close(){dom.window.close();}};
 }

 await test('B1','first visitor: the quiet card is visible and the QR is drawn on-device',async()=>{
  const f=fixture();
  try{
   assert.ok(f.band()&&!f.band().hidden,'band visible with no prior state');
   assert.deepEqual(f.draws[0],[0,0,256,256],'cream background first');
   assert.ok(f.draws.length>100,'the full module grid was drawn (no image fetch)');
   const xs=f.draws.slice(1).map(d=>d[0]),ys=f.draws.slice(1).map(d=>d[1]);
   assert.ok(Math.min(...xs)>=15&&Math.min(...ys)>=15,'quiet zone keeps the code scannable');
   assert.deepEqual(f.errors,[]);
  }finally{f.close();}
 });
 await test('B2','one-tap install: the captured prompt fires only on the CTA tap, never alone',async()=>{
  const f=fixture();
  try{
   let prompts=0,resolveChoice;
   const ev=new f.w.Event('beforeinstallprompt',{cancelable:true});
   ev.prompt=()=>prompts++;
   ev.userChoice=new f.w.Promise(r=>resolveChoice=r);
   f.w.dispatchEvent(ev);
   await tick();
   assert.equal(prompts,0,'the browser prompt is captured but NOT fired by itself (v140: nothing auto-appears)');
   assert.ok(f.band()&&!f.band().hidden,'band still visible before the tap');
   f.cta().click();
   assert.equal(prompts,1,'the tap fired the real browser install prompt exactly once');
   resolveChoice({outcome:'accepted'});
   await tick();
   assert.ok(f.band().hidden,'accepted → the band disappears at once');
   assert.deepEqual(JSON.parse(f.w.localStorage.getItem('shv.appband.v1')),{installed:true,dismissedAt:0},'installation remembered');
   assert.ok(!f.w.document.getElementById('shvInstallChip'),'the dead install-chip id was never resurrected');
  }finally{f.close();}
 });
 await test('B2b','a declined one-tap prompt leaves the card exactly as it was',async()=>{
  const f=fixture();
  try{
   let prompts=0;
   const ev=new f.w.Event('beforeinstallprompt',{cancelable:true});
   ev.prompt=()=>prompts++;
   ev.userChoice=new f.w.Promise(r=>setTimeout(()=>r({outcome:'dismissed'}),0));
   f.w.dispatchEvent(ev);
   f.cta().click();
   await tick();await tick();
   assert.equal(prompts,1);
   assert.ok(f.band()&&!f.band().hidden,'declined → the quiet card stays, no guilt, no nag');
   assert.equal(f.w.localStorage.getItem('shv.appband.v1'),null,'a decline is not recorded as a dismiss');
  }finally{f.close();}
 });
 await test('B3','iPhone: the CTA opens the two-step sheet; it closes instantly three ways',async()=>{
  const IOS_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  for (const closeVia of ['button','esc','backdrop']){
   const f=fixture({ua:IOS_UA});
   try{
    assert.ok(f.band()&&!f.band().hidden,'band visible on iPhone too');
    f.cta().click();
    const sh=f.sheet();
    assert.ok(sh,'the sheet opened on tap (no beforeinstallprompt on iOS)');
    assert.ok(sh.textContent.includes('Add to Home Screen'),'the exact iOS menu item is named');
    assert.ok(sh.textContent.includes('Share'),'the share step is named');
    assert.equal(f.w.document.querySelectorAll('.shv-sheet').length,1,'exactly one sheet, ever');
    if (closeVia==='button')sh.querySelector('.shv-sheet-close').click();
    if (closeVia==='esc')f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape'}));
    if (closeVia==='backdrop')sh.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true}));
    await tick();
    assert.equal(f.sheet(),null,closeVia+' → gone instantly, no animation, no linger');
    assert.deepEqual(f.errors,[]);
   }finally{f.close();}
  }
 });
 await test('B4','Android without the one-tap (Samsung/Firefox): the menu sheet is the fallback',async()=>{
  const f=fixture({ua:'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Safari/537.36'});
  try{
   f.cta().click();
   const sh=f.sheet();
   assert.ok(sh,'sheet opened for a browser with no beforeinstallprompt');
   assert.ok(sh.textContent.includes('three dots')&&sh.textContent.includes('Add to Home screen'),'menu + exact item named');
   assert.ok(!sh.textContent.includes('iPhone'),'no iPhone steps on an Android sheet');
   sh.querySelector('.shv-sheet-close').click();
   assert.equal(f.sheet(),null);
  }finally{f.close();}
 });
 await test('B5','the appinstalled event hides the band and remembers it',async()=>{
  const f=fixture();
  try{
   f.w.dispatchEvent(new f.w.Event('appinstalled'));
   await tick();
   assert.ok(f.band().hidden,'installed → gone');
   assert.deepEqual(JSON.parse(f.w.localStorage.getItem('shv.appband.v1')),{installed:true});
  }finally{f.close();}
 });
 await test('B6','the dismiss is instant and persists across reloads; the 30-day re-show is honoured',async()=>{
  const f=fixture();
  try{
   f.w.document.getElementById('shvAppDismiss').click();
   await tick();
   assert.ok(f.band().hidden,'gone at once — no fade, no count-down (the v140 complaint)');
   const saved=JSON.parse(f.w.localStorage.getItem('shv.appband.v1'));
   assert.ok(saved.dismissedAt>Date.now()-5000,'the dismiss was persisted');
  }finally{f.close();}
  const reload=fixture({ls:{'shv.appband.v1':JSON.stringify({dismissedAt:Date.now()})}});
  try{
   assert.ok(reload.band().hidden,'30 days after a dismiss the card stays gone');
  }finally{reload.close();}
  const stale=fixture({ls:{'shv.appband.v1':JSON.stringify({dismissedAt:Date.now()-31*86400e3})}});
  try{
   assert.ok(!stale.band().hidden,'after the 30-day window the quiet card may introduce itself again');
  }finally{stale.close();}
 });
 await test('B7','an installed (standalone) app never shows the band',async()=>{
  const a=fixture({standaloneChrome:true});
  try{assert.ok(a.band().hidden,'Chrome display-mode standalone → hidden');}finally{a.close();}
  const b=fixture({standaloneIOS:true,ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)'});
  try{assert.ok(b.band().hidden,'iOS navigator.standalone → hidden');}finally{b.close();}
 });
 console.log(`\nv178: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
