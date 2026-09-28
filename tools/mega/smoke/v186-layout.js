/* v186: guard the exact Instagram Design Selection overflow repair.
   Real Chromium geometry is exercised separately by v186-browser-check.js. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const C=process.env.SMOKE_CMS||path.resolve(__dirname,'../../../cms');
const rd=f=>fs.readFileSync(path.join(C,f),'utf8');
const html=rd('index.html'),sw=rd('sw.js'),app=rd('js/app.js'),api=rd('api.php'),css=rd('css/v186.css');
let n=0;const test=(name,f)=>{f();console.log('PASS '+name);n++};
test('D01 release 186 shell/app/API and 60/55 stamped requests match',()=>{
 const rel=+(/__SHIVAA_REL=(\d+);/.exec(html)||[])[1];assert.ok(rel>=186);
 assert.ok(app.includes(`APP_REL = ${rel};`) && api.includes(`'rel'   => ${rel},`));
 assert.ok(sw.includes(`SHELL = 'shivaa-shell-v${rel}'`) && sw.includes(`const REL = ${rel};`));
 assert.equal((html.match(new RegExp(`\\?v=${rel}`,'g'))||[]).length,60);
 assert.equal((sw.match(new RegExp(`\\?v=${rel}`,'g'))||[]).length,55);
 assert.ok(html.includes(`/css/v186.css?v=${rel}`)&&sw.includes(`/css/v186.css?v=${rel}`));
 assert.ok(html.indexOf(`/css/v186.css?v=${rel}`)>html.indexOf(`/css/v185.css?v=${rel}`));
});
test('D02 slider grid tracks shrink; no whole-page clipping or desktop changes',()=>{
 assert.match(css, /@media \(max-width: 680px\)[\s\S]*body\[data-page="catalogues"\] #dsGrid\.ds-grid\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
 assert.match(css, /#dsGrid > \.ds-card\s*\{\s*min-width:\s*0/);
 assert.match(css, /#dsGrid \.ds-img\.ds-slider\s*\{[^}]*overflow:\s*hidden/);
 assert.match(css, /@media \(max-width: 350px\)[\s\S]*#dsGrid\.ds-grid\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
 assert.ok(!/html\s*\{[^}]*overflow/.test(css),'never hide overflow by clipping root');
 assert.ok(!/body\s*\{[^}]*overflow/.test(css),'do not mask the issue on body');
});
test('D03 header fits phone without hiding menu, search, B2B or cart',()=>{
 assert.match(css, /\.header-top \.header-actions #acctBtn,\s*\.header-top \.header-actions #wishBtn\s*\{\s*display:\s*none/);
 assert.match(css, /\.header-in\.header-top \.nav-toggle\s*\{\s*flex:\s*0 0 40px/);
 assert.match(css, /\.header-top \.hdr-scheme-pill::after\s*\{\s*content:\s*'10G'/);
 assert.match(html, /class="hdr-scheme-pill"[^>]*aria-label="10g Gold Biscuit Scheme"/);
 for(const label of ['id="navToggle"','id="searchBtn"','id="portalPill"','class="icon-btn cart-btn"','class="mnav"'])assert.ok(html.includes(label),label);
});
test('D04 Design Selection heading contrast survives deferred motion.css',()=>{
 assert.match(rd('css/motion.css'),/\.page-hero h1\s*\{[^}]*-webkit-text-fill-color:transparent/);
 assert.match(css,/body\[data-page="catalogues"\] \.page-hero h1\s*\{[^}]*-webkit-text-fill-color:\s*#fdf3dd/);
 assert.ok(html.indexOf('/css/v186.css')>html.indexOf('/css/v185.css'));
});
console.log(`\nv186 design layout: ${n} passed, 0 failed`);
