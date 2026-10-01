'use strict';
/* Release 185 source gate: current stamp parity, cache-busting, CSRF guards,
   and the owner's protected Gold Biscuit campaign surface. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const read = name => fs.readFileSync(path.join(CMS, name), 'utf8');
const index = read('index.html'), app = read('js/app.js'), admin = read('js/admin.js'), sw = read('sw.js'), api = read('api.php');
const rel = +(index.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0;
if (rel > 185) { console.log(`SKIP v185 stamp-exact gate on forward release ${rel}`); process.exit(0); }
function test(id, name, fn) {
  try { fn(); console.log(`PASS ${id} ${name}`); }
  catch (error) { console.error(`FAIL ${id} ${name}: ${error.message}`); process.exitCode = 1; }
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

test('V185-01', 'release 185 is stamped consistently across HTML, app, service worker, and API', () => {
  assert.equal(rel, 185);
  assert.ok(app.includes('const APP_REL = 185;'));
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v185';"));
  assert.ok(sw.includes('const REL = 185;'));
  assert.ok(api.includes("'rel'   => 185,"));
});
test('V185-02', 'HTML and service-worker assets use the new cache key', () => {
  assert.ok(index.includes('/js/app.js?v=185'));
  assert.ok(sw.includes("'/js/app.js?v=185'"));
  assert.ok(!/\?v=184(?:['"\s)]|$)/.test(index));
  assert.ok(!/\?v=184(?:['"\s)]|$)/.test(sw));
  assert.ok(app.includes("injectScript('/js/admin.js?v=' + APP_REL)"));
});
test('V185-03', 'cross-origin unsafe methods and non-JSON bodies are rejected at the API boundary', () => {
  assert.ok(api.includes('function shv_request_origin_matches_host(): bool'));
  assert.ok(api.includes('function shv_guard_write_origin(string $route, string $method): void'));
  assert.ok(api.includes('shv_guard_write_origin($route, $method);'));
  assert.ok(api.includes("$route === 'pay/cashfree/webhook'"), 'signed provider webhook remains explicitly exempt');
  assert.ok(api.includes("$mime !== 'application/json'"));
  assert.ok(api.includes('Cross-origin state-changing request rejected'));
});
test('V185-04', 'campaign card source and approved campaign image remain byte-identical', () => {
  const start = app.indexOf('  <!-- HOME CAMPAIGN ENTRY CARD -->');
  const end = app.indexOf('  <div class="catbar-outer">', start);
  assert.ok(start >= 0 && end > start);
  assert.equal(hash(app.slice(start, end)), '062bee45f2429f86ba34ea4678b8d71156003195e2bb1b852cb7dba64d12843b');
  assert.equal(hash(fs.readFileSync(path.join(CMS, 'images/banners/gold-biscuit-campaign.jpg'))), 'b979aa9adfd0f2524af465b95f1f1c89534ef5d2275cf8d223067fa86b95286e');
});
if (!process.exitCode) console.log('\nv185 source gate: 4 passed, 0 failed');
