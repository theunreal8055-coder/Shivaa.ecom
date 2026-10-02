'use strict';
/* v187 source gate: private KYC-document storage/streaming, one-time legacy
   migration, cache lockstep, and protected campaign-surface invariants. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const read = name => fs.readFileSync(path.join(CMS, name), 'utf8');
const index = read('index.html'), app = read('js/app.js'), sw = read('sw.js'), api = read('api.php');
const admin = read('js/admin.js'), kycRules = read('uploads/kyc/.htaccess');
const rel = +(index.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
let passed = 0, failed = 0;
function test(id, name, work) {
  try { work(); passed++; console.log(`PASS ${id} ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${id} ${name}: ${error.message}`); }
}

test('V187-01', 'HTML, app, service worker and API share release 187', () => {
  assert.equal(rel, 187);
  assert.ok(index.includes('/js/app.js?v=187'));
  assert.ok(app.includes('const APP_REL = 187;'));
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v187';"));
  assert.ok(sw.includes('const REL = 187;'));
  assert.ok(api.includes("'rel'   => 187,"));
});
test('V187-02', 'release cache URLs advance together and the dynamic admin bundle follows APP_REL', () => {
  assert.ok(!/[?&]v=186(?:['"\s)]|$)/.test(index));
  assert.ok(!/[?&]v=186(?:['"\s)]|$)/.test(sw));
  assert.ok(index.includes('/css/v186.css?v=187'));
  assert.ok(sw.includes("'/css/v186.css?v=187'"));
  assert.ok(app.includes("injectScript('/js/admin.js?v=' + APP_REL)"));
  assert.ok(!/\?v=186(?:['"\s)]|$)/.test(app));
});
test('V187-03', 'new KYC uploads use magic-byte types and secure private storage after OTP and business validation', () => {
  assert.ok(api.includes('function shv_kyc_private_dir(): ?string'));
  assert.ok(api.includes('function shv_kyc_detect_ext(string $head): ?string'));
  assert.ok(api.includes('function shv_kyc_store_upload(string $tmp, string $ext): ?string'));
  assert.ok(api.includes('dirname($docRoot) . DIRECTORY_SEPARATOR . \'.shivaa-private-kyc\''));
  assert.ok(api.includes('(($mode & 0077) !== 0)'));
  assert.ok(api.includes('@chmod($dest, 0600)'));
  assert.ok(api.includes("return 'private-kyc:' . $name;"));
  assert.ok(!api.includes("__DIR__ . '/uploads/kyc/' . $cardName"));
  const apply = api.slice(api.indexOf("if ($route === 'partners/apply'"), api.indexOf("if ($route === 'partners' && $method === 'GET'"));
  assert.ok(apply.indexOf('if (!$otpOk)') < apply.indexOf('shv_kyc_store_upload('));
  assert.ok(apply.indexOf('foreach (($db[\'partners\'] ?? []) as $pExist)') < apply.indexOf('shv_kyc_store_upload('));
  assert.ok(apply.includes('$size > 8388608'));
  assert.ok(apply.includes('CONTENT_LENGTH'));
});
test('V187-04', 'existing KYC documents are blocked by directory rules, including passive image/PDF types', () => {
  assert.match(kycRules, /Require\s+all\s+denied/i);
  assert.match(kycRules, /Deny\s+from\s+all/i);
  assert.ok(kycRules.includes('private'));
});
test('V187-05', 'admin stream is authenticated, record-bound, no-store and rejects caller-supplied paths', () => {
  const start = api.indexOf("if (preg_match('#^admin/partners/([A-Za-z0-9_-]+)/business-card$");
  const end = api.indexOf("if ($route === 'admin/kyc/migrate-business-cards'", start);
  const route = api.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(route.includes('need_admin($db)'));
  assert.ok(route.includes("$partner['kyc']['businessCard']"));
  assert.ok(route.includes('shv_kyc_resolve_ref($ref)'));
  assert.ok(route.includes('Cache-Control: private, no-store'));
  assert.ok(route.includes('X-Content-Type-Options'));
  assert.ok(route.includes('Content-Security-Policy'));
  assert.ok(route.includes('readfile($doc[\'path\'])'));
});
test('V187-06', 'legacy migration verifies copies and saves the new reference before deleting old public files', () => {
  const start = api.indexOf("if ($route === 'admin/kyc/migrate-business-cards'");
  const end = api.indexOf("/* ── partners (full KYC) ── */", start);
  const route = api.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.ok(route.includes('need_admin($db)'));
  assert.ok(route.includes('shv_kyc_migrate_copy($source, $ext)'));
  assert.ok(route.indexOf('db_save($DB_FILE, $db)') < route.indexOf('@unlink($oldFile)'));
  assert.ok(route.includes('cleanupPending'));
});
test('V187-07', 'admin UI no longer links to raw KYC paths and fetches the protected endpoint with bearer auth', () => {
  assert.ok(!admin.includes('href="${safeUrl(p.kyc.businessCard)}"'));
  assert.ok(!admin.includes('safeUrl(k.businessCard)'));
  assert.ok(admin.includes("'/api/admin/partners/' + encodeURIComponent(pid) + '/business-card'"));
  assert.ok(admin.includes("Authorization: 'Bearer ' + token()"));
  assert.ok(admin.includes('ShivaaAdmin.migrateKycCards(this)'));
  assert.ok(admin.includes('ShivaaAdmin.viewBusinessCard(this)'));
  assert.ok(admin.includes('URL.createObjectURL(blob)'));
});
test('V187-08', 'logout revokes bearer sessions and order/address ownership checks remain in place', () => {
  assert.ok(api.includes("$route === 'auth/logout' && $method === 'POST'"));
  assert.ok(api.includes("if (($o['userId'] ?? '') !== ($u['id'] ?? '')"));
  assert.ok(api.includes("if ($uu['id'] === $u['id'])"));
});
test('V187-09', 'Gold Biscuit campaign card copy and approved campaign image remain byte-identical', () => {
  const start = app.indexOf('  <!-- HOME CAMPAIGN ENTRY CARD -->');
  const end = app.indexOf('  <div class="catbar-outer">', start);
  assert.ok(start >= 0 && end > start);
  assert.equal(hash(app.slice(start, end)), '062bee45f2429f86ba34ea4678b8d71156003195e2bb1b852cb7dba64d12843b');
  assert.equal(hash(fs.readFileSync(path.join(CMS, 'images/banners/gold-biscuit-campaign.jpg'))), 'b979aa9adfd0f2524af465b95f1f1c89534ef5d2275cf8d223067fa86b95286e');
});
console.log(`\nv187 source gate: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
