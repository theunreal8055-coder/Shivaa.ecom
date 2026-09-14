/* Smoke-test: load index.html + all scripts in jsdom, then exercise boost hooks. */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const html = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');

const jsdom = new JSDOM(html, {
  url: 'http://localhost:8090/',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
    window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} };
    window.SpeechRecognition = undefined;
    window.scrollTo = () => {};
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.HTMLMediaElement.prototype.pause = () => {};
    window.fetch = (url) => {
      // emulate backend: /api/* from db.json, /js/boost-data.json from file, static from disk
      const u = String(url).replace(/^https?:\/\/localhost:8090/, '');
      let body = null, status = 200;
      try {
        if (u.startsWith('/api/')) {
          const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
          if (u.includes('/api/settings')) body = JSON.stringify({ settings: db.settings });
          else if (u.includes('/api/rates')) body = JSON.stringify({ rates: { ...db.rates.last, history: db.rates.history } });
          else if (u.includes('/api/products/')) {
            const id = u.split('/').pop();
            const p = db.products.find(x => x.id === id) || db.products[0];
            const similar = db.products.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
            const reviews = (db.reviews || []).filter(r => r.productId === p.id);
            body = JSON.stringify({ product: p, similar, reviews, rates: db.rates.last });
          } else if (u.includes('/api/products')) body = JSON.stringify({ products: db.products });
          else status = 404;
        } else if (u.startsWith('/js/boost-data.json')) {
          body = fs.readFileSync(path.join(CMS, 'js/boost-data.json'), 'utf8');
        } else {
          const f = path.join(CMS, u.split('?')[0]);
          if (fs.existsSync(f) && fs.statSync(f).isFile()) {
            body = fs.readFileSync(f);
          } else status = 404;
        }
      } catch (e) { status = 500; body = String(e); }
      const buf = Buffer.from(body || '');
      return Promise.resolve({
        ok: status >= 200 && status < 300, status,
        json: () => Promise.resolve(JSON.parse(buf.toString())),
        text: () => Promise.resolve(buf.toString()),
      });
    };
  },
});

const errors = [];
const window = jsdom.window;
window.addEventListener('error', e => errors.push('window error: ' + e.message));
const t0 = Date.now();
const iv = setInterval(() => {
  const ready = window.Shivaa && window.Shivaa.state && window.document.getElementById('view');
  if (ready || Date.now() - t0 > 15000) {
    clearInterval(iv);
    runChecks(window, errors).then(() => {
      console.log(errors.length ? 'FAILED:\n' + errors.join('\n') : 'SMOKE OK — no runtime errors');
      process.exit(errors.length ? 1 : 0);
    });
  }
}, 200);

async function runChecks(w, errors) {
  const d = w.document;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // home page render
  await wait(2500);
  const view = d.getElementById('view');
  if (!view) { errors.push('no #view'); return; }
  const hero = view.querySelector('.hero');
  if (!hero) { errors.push('home hero did not render'); return; }
  console.log('home rendered, sections:', view.querySelectorAll('section').length);

  await wait(2500);
  const checks = [
    ['hero film layer', !!view.querySelector('.boost-hero-film')],
    ['flash strip', !!view.querySelector('[data-boost="flash"]')],
    ['gold band', !!view.querySelector('[data-boost="band"]')],
    ['market pulse', !!view.querySelector('[data-boost="pulse"]')],
    ['3D showcase', !!view.querySelector('[data-boost="show3d"]')],
    ['films', !!view.querySelector('[data-boost="films"]')],
    ['lookbook', !!view.querySelector('[data-boost="look"]')],
    ['features grid', !!view.querySelector('[data-boost="features"]')],
    ['cta banner', !!view.querySelector('[data-boost="cta"]')],
    ['insta strip', !!view.querySelector('[data-boost="insta"]')],
    ['chat fab', !!d.getElementById('boostChatFab')],
    ['theme button', !!d.getElementById('boostTheme')],
    ['back to top', !!d.getElementById('boostTop')],
    ['tryon route registered', !!(w.Shivaa.routes && w.Shivaa.routes.tryon)],
  ];
  for (const [name, ok] of checks) {
    console.log((ok ? '  ✓ ' : '  ✗ ') + name);
    if (!ok) errors.push('missing: ' + name);
  }

  // theme switch
  const thBtn = d.getElementById('boostTheme');
  if (!thBtn) { errors.push('missing: theme button'); return; }
  thBtn.onclick();
  if (d.documentElement.dataset.theme !== 'noir') errors.push('theme switch failed');
  console.log('  ✓ theme switched to', d.documentElement.dataset.theme || 'light');

  // chat open + chip answer
  d.getElementById('boostChatFab').onclick();
  const open = d.getElementById('boostChat').classList.contains('open');
  if (!open) errors.push('chat did not open');
  console.log('  ✓ chat opened');

  // tryon route render
  await w.Shivaa.routes.tryon(view, new w.URLSearchParams(''));
  if (!view.querySelector('.boost-tryon')) errors.push('tryon page did not render');
  console.log('  ✓ tryon page rendered');

  // product route render + recs + try-on button
  w.location.hash = '#/product/p_smp_rings_01';
  await wait(2500);
  if (!view.querySelector('.pd-layout')) errors.push('product page did not render');
  await wait(2000);
  console.log('  product page:', view.querySelector('.pd-layout') ? 'rendered' : 'MISSING',
    '| recs:', !!view.querySelector('[data-boost="recs"]'),
    '| tryon btn:', !!view.querySelector('#boostTryonBtn'));

  // back home
  w.location.hash = '#/';
  await wait(2500);
  const pgheroAbsent = !view.querySelector('[data-boost="pghero"]');
  console.log('  home has no page-hero (correct):', pgheroAbsent);

  // page-hero banner on a non-home page (rates)
  w.location.hash = '#/rates';
  await wait(2500);
  const ph = view.querySelector('[data-boost="pghero"]');
  if (!ph) errors.push('missing: page-hero on #/rates');
  console.log('  #/rates page-hero:', ph ? 'present' : 'MISSING');
  w.location.hash = '#/';
}
