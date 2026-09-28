/* v184 · real app boot on a 4-photo ring PDP. Repeated gestures, cancel,
   arrows/dots and legacy touch fallback, plus stable-control CSS checks.
   API is stubbed with local catalogue data; no live site or DB writes. */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
const ring = db.products.find(p => p.category === 'rings' && p.images?.length === 4 && !p.video);
assert.ok(ring, 'QA needs an existing four-photo ring');
const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8').replace(/<script src="https:\/\/sdk\.cashfree\.com\/js\/v3\/cashfree\.js" defer><\/script>/, '');
const css = fs.readFileSync(path.join(CMS, 'css/v184.css'), 'utf8');
let pass = 0;
const test = (name, fn) => { fn(); console.log('PASS ' + name); pass++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function boot(pointer) {
  const server = http.createServer((req, res) => {
    const f = path.resolve(CMS, (req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0].slice(1)));
    if (!f.startsWith(CMS + path.sep)) return res.writeHead(403).end();
    fs.readFile(f, (err, content) => { if (err) return res.writeHead(404).end();
      const type = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/plain';
      res.writeHead(200, { 'Content-Type': type }); res.end(content);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const errs = [], vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/Not implemented: (HTMLMediaElement|HTMLCanvasElement|navigation|window\.scroll)/.test(String(e.message))) errs.push(String(e.stack)); });
  const dom = new JSDOM(html, {
    url: origin + '/#/product/' + ring.id, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.PointerEvent = pointer ? w.MouseEvent : undefined;
      w.matchMedia = q => ({ matches: /reduce/.test(q), media:q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.ResizeObserver = class { observe() {} disconnect() {} };
      w.scrollTo = () => {};
      w.fetch = async input => {
        const u = new URL(String(input), origin), route = u.pathname;
        const body = route === '/api/settings' ? { ...db.settings, guestCheckout:false }
          : route === '/api/products' ? { products: [ring] }
          : route.startsWith('/api/products/') ? { product:ring, reviews:[], similar:[] }
          : route.startsWith('/api/rates') ? { t:new Date().toISOString(), gold24:15139, gold22:14226, gold18:11354, silver:230, source:'QA-rate' }
          : route === '/api/making-charges' ? { table:[] } : route === '/api/pages' ? { pages:[] }
          : route === '/api/catalogs' ? { catalogs:[] } : route === '/api/pay/config' ? { mode:'demo' } : {};
        return { ok:true, status:200, headers:{get:()=> 'application/json'}, json:async()=>body, text:async()=>JSON.stringify(body) };
      };
      Object.defineProperty(w.document, 'hasFocus', {value:()=>true});
    },
  });
  const w = dom.window, d = w.document;
  for (let i = 0; i < 200 && d.querySelectorAll('#galTrack .gal-slide').length !== 4; i++) await sleep(25);
  assert.equal(d.querySelectorAll('#galTrack .gal-slide').length, 4, 'ring PDP must load');
  const wrap = d.querySelector('#galWrap');
  let captured = null;
  wrap.setPointerCapture = id => { captured = id; };
  wrap.hasPointerCapture = id => captured === id;
  wrap.releasePointerCapture = id => { if (captured !== id) return; captured = null;
    const ev = new w.Event('lostpointercapture', { bubbles:true }); ev.pointerId = id; wrap.dispatchEvent(ev); };
  return { w, d, dom, server, errs, wrap, captured:()=>captured,
    close:()=>{dom.window.close(); server.close();} };
}
const active = d => Number(d.querySelector('#galCount').textContent.split(' / ')[0]) - 1;
const sendPointer = (w, el, name, x, y, id = 1) => {
  const e = new w.Event(name, { bubbles:true, cancelable:true });
  Object.assign(e, { pointerId:id, clientX:x, clientY:y, pointerType:'touch', isPrimary:true, button:0 });
  el.dispatchEvent(e);
};
const sendTouch = (w, el, name, x, y) => {
  const e = new w.Event(name, { bubbles:true, cancelable:true });
  Object.defineProperty(e, 'touches', {value:name === 'touchend' || name === 'touchcancel' ? [] : [{clientX:x,clientY:y}]});
  el.dispatchEvent(e);
};
(async () => {
  test('S01 release 184 shell/app/API in lockstep and v184.css cached', () => {
    const idx = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
    const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
    const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
    assert.ok(idx.includes('__SHIVAA_REL=184;') && sw.includes("SHELL = 'shivaa-shell-v184'") && sw.includes('const REL = 184;'));
    assert.ok(app.includes('APP_REL = 184;') && api.includes("'rel'   => 184,"));
    assert.ok(idx.includes('/css/v184.css?v=184') && sw.includes('/css/v184.css?v=184'));
    assert.equal((idx.match(/\?v=184/g)||[]).length, 57);
    assert.equal((sw.match(/\?v=184/g)||[]).length, 52);
    assert.ok(sw.includes("MEDIA = 'shivaa-media-v168'"));
  });
  test('S02 stable dot hitboxes and arrows retain vertical centring when pressed', () => {
    assert.match(css, /\.gal-dots button\.on\s*\{[^}]*width:\s*34px/);
    assert.match(css, /\.gal-dots button\.on::before\s*\{[^}]*width:\s*26px/);
    assert.match(css, /\.gal-nav:active\s*\{[^}]*translateY\(-50%\) scale\(\.9\)/);
  });
  const A = await boot(true);
  try {
    const {w,d,wrap} = A, slide = d.querySelector('.gal-slide');
    test('P01 ring gallery arrows/dots navigate and wrap', () => {
      assert.equal(active(d),0);
      d.querySelector('.gal-prev').click(); assert.equal(active(d),3);
      d.querySelector('.gal-next').click(); assert.equal(active(d),0);
      d.querySelectorAll('#galDots button')[2].click(); assert.equal(active(d),2);
      assert.equal(d.querySelector('#galTrack').style.transform, 'translate3d(-200%,0,0)');
      assert.equal(d.querySelectorAll('#galDots button.on').length,1);
    });
    test('P02 twenty rapid swipes never strand the fourth photo', () => {
      for (let i = 0; i < 20; i++) {
        sendPointer(w, slide, 'pointerdown',250,120);
        sendPointer(w, wrap, 'pointermove',160,121);
        sendPointer(w, wrap, 'pointerup',160,121);
        assert.equal(active(d),(2+i+1)%4,`swipe ${i+1}`);
        assert.equal(A.captured(),null,'pointer capture released');
        assert.equal(d.querySelector('#galTrack').style.transform,`translate3d(-${active(d)*100}%,0,0)`);
      }
      d.querySelector('.gal-next').click(); assert.equal(active(d),3);
    });
    test('P03 cancelled drag resets the track, never counts as a slide', () => {
      sendPointer(w, slide,'pointerdown',250,120,7);
      sendPointer(w, wrap,'pointermove',130,121,7);
      sendPointer(w, wrap,'pointercancel',130,121,7);
      assert.equal(active(d),3);
      assert.equal(d.querySelector('#galTrack').style.transform,'translate3d(-300%,0,0)');
      sendPointer(w, wrap,'pointerup',130,121,7);
      assert.equal(active(d),3);
    });
    test('P04 vertical scroll releases capture and next swipe still advances', () => {
      sendPointer(w, slide,'pointerdown',250,100,8);
      sendPointer(w, wrap,'pointermove',248,195,8);
      assert.equal(A.captured(),null);
      sendPointer(w, wrap,'pointerup',248,195,8);
      assert.equal(active(d),3);
      sendPointer(w, slide,'pointerdown',250,120,9);
      sendPointer(w, wrap,'pointermove',150,120,9);
      sendPointer(w, wrap,'pointerup',150,120,9);
      assert.equal(active(d),0);
    });
    test('P05 clicking controls does not start a drag or change its target', () => {
      const next = d.querySelector('.gal-next');
      sendPointer(w,next,'pointerdown',200,100,10);
      sendPointer(w,wrap,'pointermove',120,100,10);
      sendPointer(w,wrap,'pointerup',120,100,10);
      assert.equal(active(d),0);
      next.click(); assert.equal(active(d),1);
      assert.equal(A.errs.length,0,A.errs.slice(0,2).join('\n'));
    });
  } finally { A.close(); }
  const B = await boot(false);
  try {
    const {w,d,wrap} = B, slide = d.querySelector('.gal-slide');
    test('P06 touch-only WebView swipes, cancels, and wraps without double-advance', () => {
      assert.equal(active(d),0);
      for (let i=0;i<9;i++) {
        sendTouch(w,slide,'touchstart',250,120);
        sendTouch(w,wrap,'touchmove',150,120);
        sendTouch(w,wrap,'touchend',150,120);
        assert.equal(active(d),(i+1)%4);
      }
      sendTouch(w,slide,'touchstart',250,120);
      sendTouch(w,wrap,'touchmove',150,120);
      sendTouch(w,wrap,'touchcancel',150,120);
      assert.equal(active(d),1);
      assert.equal(B.errs.length,0,B.errs.slice(0,2).join('\n'));
    });
  } finally { B.close(); }
  console.log(`\nv184 gallery: ${pass} passed, 0 failed`);
  process.exit(0);
})().catch(e=>{console.error('FAIL v184 gallery:',e.stack);process.exit(1)});
