'use strict';
/* v186 local source gate. It verifies release/cache lockstep, the visible
   behavior hooks added in this batch, and the immutable Gold Biscuit surface.
   Runtime/API/device/staging behavior is tested or explicitly left open by
   the separate fixture and audit tracker. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const read = name => fs.readFileSync(path.join(CMS, name), 'utf8');
const index = read('index.html'), app = read('js/app.js'), sw = read('sw.js'), api = read('api.php'), css = read('css/v186.css');
const rel = +(index.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const tests = [];
function test(id, name, fn) {
  try { fn(); tests.push(true); console.log(`PASS ${id} ${name}`); }
  catch (error) { tests.push(false); console.error(`FAIL ${id} ${name}: ${error.message}`); }
}

test('V186-01', 'HTML, app, service worker, and API share the current release at 186 or later', () => {
  assert.ok(rel >= 186);
  assert.ok(app.includes(`const APP_REL = ${rel};`));
  assert.ok(sw.includes(`const SHELL = 'shivaa-shell-v${rel}';`));
  assert.ok(sw.includes(`const REL = ${rel};`));
  assert.ok(api.includes(`'rel'   => ${rel},`));
});
test('V186-02', 'the catalog refresh stylesheet remains linked and every release URL uses the current cache key', () => {
  assert.ok(index.includes(`/css/v186.css?v=${rel}`));
  assert.ok(sw.includes(`'/css/v186.css?v=${rel}'`));
  assert.ok(!index.includes(`?v=${rel - 1}`));
  assert.ok(!sw.includes(`?v=${rel - 1}`));
  assert.ok(index.includes(`/js/app.js?v=${rel}`));
});
test('V186-03', 'product details are prefetched only on card intent and reused for the route', () => {
  assert.ok(app.includes('function getProductDetail(id)'));
  assert.ok(app.includes('PRODUCT_DETAIL_PREFETCH_TTL = 15000'));
  assert.ok(app.includes("document.addEventListener('pointerdown', prefetchProductIntent"));
  assert.ok(app.includes("document.addEventListener('touchstart', prefetchProductIntent"));
  assert.ok(app.includes('data = await getProductDetail(id)'));
});
test('V186-04', 'catalog has branded pull refresh plus a keyboard-operable refresh button and preserves valid cached data on empty response', () => {
  assert.ok(app.includes('function wireShopPullToRefresh(view, apply)'));
  assert.ok(app.includes('id="shopPullStatus" role="status" aria-live="polite"'));
  assert.ok(app.includes('id="shopRefresh" type="button"'));
  assert.ok(app.includes("e.preventDefault();\n    const ready = dy >= 78"));
  assert.ok(app.includes('Your current results are still here'));
  assert.ok(css.includes('.shv-pull-status.is-loading'));
});
test('V186-05', 'wishlist changes are optimistic, serialized, reconciled before rollback, and accessible', () => {
  assert.ok(app.includes('function syncWishOperation(id, op)'));
  assert.ok(app.includes('let wishSyncTail = Promise.resolve()'));
  assert.ok(app.includes("const snapshot = await api('/api/wishlist')"));
  assert.ok(app.includes("b.setAttribute('aria-pressed', String(!!on))"));
  assert.ok(app.includes("b.setAttribute('aria-busy', 'true')"));
  assert.ok((app.match(/aria-pressed="\$\{wished \? 'true' : 'false'\}"/g) || []).length >= 3);
});
test('V186-06', 'cart add/remove/save confirmations are non-blocking and the toast region is announced', () => {
  assert.ok(app.includes("toast(p ? `Added ${qty > 1 ? qty + ' × ' : ''}${p.name} to your bag ✦` : 'Added to your bag ✦')"));
  assert.ok(app.includes("toast('Removed from your bag')"));
  assert.ok(app.includes("toast('Removed from saved for later')"));
  assert.ok(index.includes('id="toastWrap" role="status" aria-live="polite"'));
});
test('V186-07', 'editable mobile form controls use at least 16 px text to avoid iOS focus zoom', () => {
  assert.ok(css.includes('@media (max-width: 767px)'));
  assert.ok(css.includes('font-size: 16px !important;'));
  assert.ok(css.includes(':not([type="checkbox"])') && css.includes(':not([type="range"])'));
});
test('V186-08', 'Gold Biscuit campaign card and approved image remain byte-identical', () => {
  const start = app.indexOf('  <!-- HOME CAMPAIGN ENTRY CARD -->');
  const end = app.indexOf('  <div class="catbar-outer">', start);
  assert.ok(start >= 0 && end > start);
  assert.equal(hash(app.slice(start, end)), '062bee45f2429f86ba34ea4678b8d71156003195e2bb1b852cb7dba64d12843b');
  assert.equal(hash(fs.readFileSync(path.join(CMS, 'images/banners/gold-biscuit-campaign.jpg'))), 'b979aa9adfd0f2524af465b95f1f1c89534ef5d2275cf8d223067fa86b95286e');
});
const passed = tests.filter(Boolean).length, failed = tests.length - passed;
console.log(`\nv186 source gate: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
