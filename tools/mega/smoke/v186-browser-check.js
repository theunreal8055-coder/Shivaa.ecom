/* v186 optional REAL-layout QA: Chromium + synthetic partner account against
   local v186 source. No production login, payment, DB write or remote traffic.
   Setup: npm install --no-save --package-lock=false playwright-core @sparticuz/chromium
   Run:   node v186-browser-check.js
   This is deliberately separate from npm test: the standard dependency belt
   runs on hosts without a Chromium binary. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
let pw, lambda, inflate;
try { pw=require('playwright-core'); ({default:lambda,inflate}=require('@sparticuz/chromium')); }
catch(e) { console.error('Install optional browser packages as in this file header. '+e.message); process.exit(2); }
const CMS=process.env.SMOKE_CMS||path.resolve(__dirname,'../../../cms');
const db=JSON.parse(fs.readFileSync(path.join(CMS,'data/db.json'),'utf8'));
const mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(req.url.split('?')[0]),p=path.resolve(CMS,'.'+(name==='/'?'/index.html':name));
  if(!p.startsWith(CMS+path.sep))return res.writeHead(403).end();
  fs.readFile(p,(err,b)=>{if(err)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(b)});
});
const reply=(route)=>{
 const u=new URL(route.request().url()).pathname;let out={};
 if(u==='/api/auth/me')out={user:{id:'qaP',name:'QA partner',role:'partner',partnerId:'qa',email:'qa@invalid.test',phone:'9876500000'},events:[]};
 else if(u==='/api/products')out={products:db.products};
 else if(u==='/api/settings')out={settings:db.settings};
 else if(u==='/api/making-charges')out={table:[]};
 else if(u==='/api/catalogs')out={catalogs:[]};
 else if(u==='/api/rates')out={t:new Date().toISOString(),gold24:15000,gold22:14000,gold18:11000,silver:200,jaipur:{gold24:15000,gold22:14000,gold18:11000,silver:200},rtgs:{rows:{}},history:[]};
 else if(u==='/api/wishlist')out={wishlist:[]};
 else if(u==='/api/pages')out={pages:[]};
 else if(u==='/api/version')out={rel:186,forceLatest:false};
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(out)});
};
(async()=>{
  // Chromium's Lambda build bundles its own NSS libraries. On minimal Linux
  // shells use these privately instead of changing the host's package set.
  const bin=path.resolve(path.dirname(require.resolve('@sparticuz/chromium')),'../bin/al2023.tar.br');
  if(process.platform==='linux'&&fs.existsSync(bin)){
    await inflate(bin);
    process.env.LD_LIBRARY_PATH=[path.join(require('node:os').tmpdir(),'al2023/lib'),process.env.LD_LIBRARY_PATH||''].filter(Boolean).join(':');
  }
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try {
    for(const width of [320,360,393,430,560,768]) {
      const browser=await pw.chromium.launch({executablePath:await lambda.executablePath(),headless:true,args:lambda.args});
      const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,isMobile:true,hasTouch:true});
      try {
        await context.addInitScript(()=>{try{localStorage.setItem('shv_token',JSON.stringify('qa-partner'));sessionStorage.setItem('shv_landed','1')}catch(_){}});
        await context.route('**/api/**',reply);
        await context.route('https://**/*',route=>route.abort());
        const page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(String(e)));
        await page.goto(`http://127.0.0.1:${server.address().port}/#/catalogues`,{waitUntil:'domcontentloaded'});
        await page.locator('#dsGrid .ds-card').first().waitFor({timeout:20000});
        const data=await page.evaluate(()=>{
          const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width}};
          const a=box('#dsGrid .ds-card'),b=box('#dsGrid .ds-card:nth-child(2)');
          return {vw:document.documentElement.clientWidth,root:document.documentElement.scrollWidth,view:document.getElementById('view').scrollWidth,header:document.querySelector('.header').scrollWidth,grid:document.getElementById('dsGrid').scrollWidth,gridWidth:document.getElementById('dsGrid').clientWidth,first:a,second:b,heading:getComputedStyle(document.querySelector('.page-hero h1')).webkitTextFillColor,brand:box('.header-top .brand'),cart:box('.header-top .cart-btn'),count:document.querySelectorAll('.ds-card').length};
        });
        assert.ok(data.count>=77,`${width}: synthetic products must render`);
        assert.equal(data.vw,width);
        assert.ok(data.root<=width,`${width}: root widened to ${data.root}`);
        assert.ok(data.header<=width,`${width}: header widened to ${data.header}`);
        assert.ok(data.grid<=data.gridWidth+1,`${width}: grid widened to ${data.grid}`);
        assert.ok(data.brand.right<=width&&data.cart.right<=width,`${width}: header actions outside viewport`);
        assert.match(data.heading,/rgb\(253, 243, 221\)/,`${width}: banner heading not legible`);
        if(width<=350)assert.ok(data.second.top>data.first.top&&Math.abs(data.first.left-data.second.left)<1,`${width}: cards should stack`);
        else if(width<=680)assert.ok(data.second.left>data.first.left&&Math.abs(data.first.top-data.second.top)<1,`${width}: two cards should fit`);
        const first=page.locator('#dsGrid .ds-card').first();
        await first.locator('.ds-next').click();
        assert.equal(await first.locator('.ds-slider').getAttribute('data-i'),'1',`${width}: photo arrow still works`);
        await first.locator('.ds-qty button').last().click();
        assert.match(await page.locator('#dsCount').innerText(),/1 design/,`${width}: bill quantity still updates`);
        await page.locator('#dsfQuick .pf-chip').first().click();
        assert.match(await page.locator('#dsShown2').innerText(),/designs? shown/,`${width}: quick-weight filter still works`);
        console.log(`PASS ${width}px: width ${data.root}/${data.vw}, ${width<=350?'1':'2+'}-column design grid, header, contrast, arrows, quantity, filters`);
        assert.deepEqual(errors,[],`${width}: browser page errors`);
      } finally { await context.close().catch(()=>{}); await browser.close().catch(()=>{}); }
    }
    console.log('\nv186 browser: 6 widths passed, 0 failed');
  } finally { server.close(); }
})().catch(e=>{console.error('FAIL '+e.stack);server.close();process.exit(1)});
