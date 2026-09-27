/* v183 release + intake/billing safety regression checks (executed PHP in v183-php-run). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const rd = name => fs.readFileSync(path.join(CMS, name), 'utf8');
let pass = 0;
function test(label, f) { f(); pass++; console.log('PASS ' + label); }
const html = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'), admin = rd('js/admin.js'), api = rd('api.php');
test('S01 release stamps 183, shell/media cache safe', () => {
  assert.ok(html.includes('__SHIVAA_REL=183;'));
  assert.ok(sw.includes("SHELL = 'shivaa-shell-v183'") && sw.includes('const REL = 183;'));
  assert.ok(sw.includes("MEDIA = 'shivaa-media-v168'"));
  assert.ok(app.includes('APP_REL = 183;') && api.includes("'rel'   => 183,"));
  assert.equal((html.match(/\?v=183/g) || []).length, 56);
  assert.equal((sw.match(/\?v=183/g) || []).length, 51);
  assert.ok(!html.includes('?v=182') && !sw.includes('?v=182'));
  assert.ok(html.includes('/css/v178.css?v=183'));
});
test('S02 write-only billing key response + safe empty catalogue template', () => {
  assert.ok(api.includes('function shv_settings_admin_view(array $settings): array'));
  assert.ok(api.includes("unset($settings['billingSyncSecret'])"));
  assert.ok(api.includes("unset($setBody['billingSyncConfigured'])"));
  assert.ok(admin.includes('S.billingSyncConfigured'));
  const template = admin.match(/const tmpl = \[\{[^\n]+\}\];/);
  assert.ok(template && template[0].includes('weightG: null') && template[0].includes("purity: ''") && template[0].includes("weightSource: ''"));
  assert.ok(template[0].includes('stock: 0') && !template[0].includes('mcValue'));
  assert.ok(api.includes("$prod['stock'] = 0"));
});
test('S03 review actions gated to pending batch members', () => {
  const approve = api.slice(api.indexOf("$route === 'admin/catalogue/approve'"), api.indexOf("$route === 'admin/catalogue/skip'"));
  const skip = api.slice(api.indexOf("$route === 'admin/catalogue/skip'"), api.indexOf("$route === 'billing/stock'"));
  for (const block of [approve, skip]) {
    assert.ok(block.includes("'pending_review'"));
    assert.ok(block.includes('isset($knownBatches['));
  }
});
test('S04 JavaScript syntax + test belt includes executed checks', () => {
  for (const name of ['js/app.js', 'js/admin.js', 'sw.js'])
    execFileSync(process.execPath, ['--check', path.join(CMS, name)]);
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));
  assert.ok(pkg.scripts.test.includes('v183-check.js') && pkg.scripts.test.includes('v183-php-run.js'));
});
console.log(`\nv183 check: ${pass} passed, 0 failed`);
