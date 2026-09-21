/* Real Chromium hit-testing regression. Not jsdom, forced clicks or a live API.
   npm ci; npx playwright install --with-deps chromium; npm run test:categories
   Optional: CHROMIUM_EXECUTABLE_PATH, SMOKE_CMS (negative/ZIP overlay control).
   All APIs are isolated fixtures; no repository database is read or written. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const assert = require('node:assert/strict');
const CMS = path.resolve(process.env.SMOKE_CMS || path.join(__dirname, '../../../cms'));
const REL = +(fs.readFileSync(path.join(CMS, 'index.html'), 'utf8').match(/__SHIVAA_REL=(\d+)/) || [])[1];
const keys = 'rings necklaces earrings bangles bracelets chains pendants mangalsutra bajubandh rakhdi aad sheeshphool hathphool punach bridalanklets nosepins silver'.split(' ');
const products = keys.map(category => ({ id: 'qa-'+category, sku: 'QA-'+category,
  name: 'QA fixture '+category, category, active:true, metal:category==='silver'?'Silver':'Gold', purity:category==='silver'?'925':'22K', weightG:2,
  mcScheme:'perGram', mcValue:100, stoneValue:0, stock:1, rating:5, reviews:0,
  tags:['heritage'], sizes:[], images:['/images/logo.png'], createdAt:'2026-09-21T00:00:00Z' }));
const metal = { gold24:15000, gold22:14000, gold18:11000, silver:240 };
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://fixture');
  const file = path.resolve(CMS, '.'+(url.pathname==='/'?'/index.html':url.pathname));
  if (!file.startsWith(CMS+path.sep) || url.pathname.startsWith('/data/')) return res.writeHead(403).end();
  fs.readFile(file,(err,body)=>{res.writeHead(err?404:200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'':body);});
});
let browser, passed=0, failed=0;
async function check(name, fn) {
  try { await fn(); passed++; console.log('PASS '+name); }
  catch(e) { failed++; console.error('FAIL '+name+'\n'+e.message); }
}
async function boot(width,height,slow=false,mobile=false) {
  const context = await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
    const u = new URL(route.request().url());
    if (u.hostname !== '127.0.0.1') return route.abort();
    if (/\.(mp4|webm)$/.test(u.pathname)) return route.fulfill({status:204,body:''});
    if (!u.pathname.startsWith('/api/')) return route.continue();
    let out={};
    if (u.pathname==='/api/products') { if(slow) await new Promise(r=>setTimeout(r,1200)); out={products}; }
    if (u.pathname==='/api/settings') out={settings:{forceLatestVersion:false}};
    if (u.pathname==='/api/version') out={ok:true,rel:REL,forceLatest:false};
    if (u.pathname==='/api/rates') out={...metal,jaipur:metal,spot:metal,live:false,history:[],t:new Date().toISOString()};
    if (u.pathname==='/api/auth/me') out={user:null};
    if (u.pathname==='/api/pages') out={pages:[]};
    if (u.pathname==='/api/catalogs') out={catalogs:[]};
    if (u.pathname==='/api/making-charges') out={table:[]};
    await route.fulfill({json:out});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#catMenu .mega-tile',{state:'attached'});
  await page.waitForFunction(()=>!!document.body.dataset.page && !document.getElementById('preloader'));
  await page.evaluate(()=>document.fonts.ready);
  return {context,page,errors};
}
async function open(page) {
  // Browsing long result pages is normal; return to the desktop nav first.
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForTimeout(150);
  if (await page.locator('#catMenu').evaluate(el=>el.hidden)) await page.locator('#navCats').click();
  await page.locator('#catMenu').waitFor({state:'visible'});
  await page.waitForTimeout(380); // wait for actual menu entrance (not a forced click)
}
async function result(page,key,mobile=false) {
  await page.waitForFunction(k=>location.hash==='#/shop?category='+k &&
    document.querySelector('input[data-f="cat"]:checked')?.value===k &&
    document.querySelector('#shopGrid a[href="#/product/qa-'+k+'"]'),key);
  assert.equal(await page.locator('#catMenu').evaluate(e=>e.hidden),true);
  assert.equal(await page.locator('#megaBackdrop').evaluate(e=>e.hidden),true);
  assert.equal(await page.locator('#navCats').getAttribute('aria-expanded'),'false');
  assert.deepEqual(await page.evaluate(()=>Shivaa.state.shop.list.filter(p=>p.id.startsWith('qa-')).map(p=>p.category)),[key]);
  if(mobile) assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('drawer-open')),false);
}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,
    args:['--no-sandbox','--disable-dev-shm-usage']});
  for (const [width,height,slow] of [[1366,768,false],[1024,600,true],[1920,1080,false]]) {
    const {context,page,errors}=await boot(width,height,slow); const label=`${width}x${height}${slow?' slow API':''}`;
    if(slow) await check(label+' exercises early v116 wiring',async()=>assert.equal(await page.locator('#navCats').evaluate(e=>!!e._v116wired),true));
    await check(label+' panel fits viewport, escapes header containment, trigger remains clickable',async()=>{
      await open(page);
      const info=await page.evaluate(()=>{const panel=document.querySelector('#catMenu'),r=panel.getBoundingClientRect(),b=document.querySelector('#navCats').getBoundingClientRect();return {bottom:r.bottom,top:r.top,h:innerHeight,inHeader:!!panel.closest('#header'),hit:!!document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.closest('#navCats')};});
      assert.equal(info.inHeader,false);assert(info.top>=0&&info.bottom<=info.h,JSON.stringify(info));assert(info.hit);
      await page.locator('#navCats').click();assert.equal(await page.locator('#catMenu').evaluate(e=>e.hidden),true);
    });
    for (let i=0;i<keys.length;i++) await check(label+' mouse '+keys[i],async()=>{
      await open(page); const tile=page.locator(`#catMenu a[href="#/shop?category=${keys[i]}"]`);
      // Real pointer clicks on both image wrapper and nested text, including scrolled rows.
      await tile.locator(i%2?'.mt-img':'.mt-tx').click(); await result(page,keys[i]);
    });
    await check(label+' same-category redraw once; Enter and Escape',async()=>{
      await open(page);
      await page.evaluate(()=>{window.__redraws=0;const r=Shivaa.redraw;Shivaa.redraw=function(){__redraws++;return r.apply(this,arguments)};});
      await page.locator('#catMenu a[href="#/shop?category=silver"]').focus(); await page.keyboard.press('Enter');
      await result(page,'silver');assert.equal(await page.evaluate(()=>__redraws),1);
      await open(page);await page.locator('#catMenu a').first().focus();await page.keyboard.press('Escape');
      assert.equal(await page.locator('#catMenu').evaluate(e=>e.hidden),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'navCats');
    });
    await check(label+' backdrop closes; browser back restores category',async()=>{
      await open(page); await page.locator('#megaBackdrop').click({position:{x:2,y:2}});
      assert.equal(await page.locator('#catMenu').evaluate(e=>e.hidden),true);
      await page.goBack(); await result(page,'nosepins');
    });
    await check(label+' page scroll does not discard an in-progress category selection',async()=>{
      await open(page);await page.evaluate(()=>scrollBy({top:40,behavior:'instant'}));
      await page.waitForTimeout(400);assert.equal(await page.locator('#catMenu').evaluate(e=>e.hidden),false);
      await page.locator('#catMenu a[href="#/shop?category=silver"]').click();await result(page,'silver');
    });
    await check(label+' old metal filter cannot empty the next category',async()=>{
      await open(page);await page.locator('#catMenu a[href="#/shop?category=silver"]').click();await result(page,'silver');
      await page.locator('body > #view #filterToggle').click();await page.locator('body > #view input[data-f="metal"][value="Silver"]').check();
      await page.locator('body > #view #applyFilters').click();
      await open(page);await page.locator('#catMenu a[href="#/shop?category=rings"]').click();await result(page,'rings');
      assert.equal(await page.locator('body > #view input[data-f="metal"]:checked').count(),0);
    });
    await check(label+' Ctrl-click and middle-click retain native new tabs',async()=>{
      await open(page);
      const before=await page.evaluate(()=>({hash:location.hash,redraws:__redraws}));
      for(const options of [{modifiers:['Control']},{button:'middle'}]) {
        const [tab]=await Promise.all([context.waitForEvent('page'),
          page.locator('#catMenu a[href="#/shop?category=rings"]').click(options)]);await tab.waitForURL('**/#/shop?category=rings',{waitUntil:'domcontentloaded'});await tab.close();
        assert.equal(await page.locator('#catMenu').evaluate(e=>e.hidden),false);
        assert.deepEqual(await page.evaluate(()=>({hash:location.hash,redraws:__redraws})),before);
      }
      await page.keyboard.press('Escape');
    });
    await check(label+' all three featured menu links navigate',async()=>{
      const hrefs=await page.locator('#catMenu .mega-rail a').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
      assert.equal(hrefs.length,3);
      for(const href of hrefs) {
        await open(page);await page.locator('#catMenu .mega-rail a[href="'+href+'"]').click();
        await page.waitForFunction(h=>location.hash===h&&document.querySelector('#catMenu').hidden,href);
      }
    });
    await check(label+' resize closes desktop menu and scrim at tablet breakpoint',async()=>{
      await open(page);await page.setViewportSize({width:768,height:900});
      await page.waitForFunction(()=>document.querySelector('#catMenu').hidden && document.querySelector('#megaBackdrop').hidden);
      await page.setViewportSize({width,height});
    });
    await check(label+' no uncaught JS errors',async()=>assert.deepEqual(errors,[]));
    await context.close();
  }
  for(const width of [390,768,820]) {
    const {context,page,errors}=await boot(width,900,true,true);
    for(const key of ['rings','necklaces','silver']) await check(`${width}px touch ${key}`,async()=>{
      await page.locator('#navToggle').tap();await page.locator('#navCats').tap();
      await page.locator(`#dwCatList a[href="#/shop?category=${key}"]`).tap();await result(page,key,true);
    });
    await check(`${width}px repeat category redraws once`,async()=>{
      await page.evaluate(()=>{window.__redraws=0;const r=Shivaa.redraw;Shivaa.redraw=function(){__redraws++;return r.apply(this,arguments)};});
      await page.locator('#navToggle').tap();await page.locator('#navCats').tap();
      await page.locator('#dwCatList a[href="#/shop?category=silver"]').tap();await result(page,'silver',true);
      assert.equal(await page.evaluate(()=>__redraws),1);
    });
    await check(`${width}px drawer body-lock cleared when resized to desktop`,async()=>{
      await page.locator('#navToggle').tap();await page.locator('#navCats').tap();await page.setViewportSize({width:1280,height:900});
      await page.waitForFunction(()=>!document.body.classList.contains('drawer-open')&&!document.querySelector('#dwCatList').classList.contains('open'));
    });
    await check(`${width}px no uncaught JS errors`,async()=>assert.deepEqual(errors,[]));
    await context.close();
  }
})().catch(e=>{failed++;console.error(e);}).finally(async()=>{
  if(browser) await browser.close();server.close();console.log(`\n${passed} browser checks passed, ${failed} failed (release ${REL}).`);process.exitCode=failed?1:0;
});
