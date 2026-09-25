/* v182 — Auto-Catalogue Intake & Review Queue (Phase 4) + billing sync bridge,
   checked statically. Runtime behaviour executed by v182-php-run under PHP 8.3.

   SUPERSEDED-PROBE v182 — stamp-exact suite for release 182: on a NEWER
   tree it SKIPs (regression content re-executes inside current chain php-run);
   on its own release or an overlay of its zip it runs in full. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 182) {
    console.log('SKIP v182-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in the current chain php-run)');
    process.exit(0);
  }
}

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const ROOT = path.resolve(__dirname, '../../..');
const rd = n => fs.readFileSync(path.join(CMS, n), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'), admin = rd('js/admin.js'), api = rd('api.php');
const installer = rd('upgrade-sql.php');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
let pass = 0, fail = 0;
setTimeout(() => { console.error('v182 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  await test('S01', 'release 182 in lockstep across all four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=182;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 182;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v182';") && sw.includes('const REL = 182;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 182,"), 'api version endpoint');
  });

  await test('S02', 'every asset URL re-stamped to 182, zero 181 stamp leftovers, media untouched', async () => {
    assert.ok((index.match(/\?v=182/g) || []).length >= 56, 'index carries the full asset sheet, got ' + (index.match(/\?v=182/g) || []).length);
    assert.equal((sw.match(/\?v=182/g) || []).length, 51, 'worker precache list');
    for (const [name, src] of [['index.html', index], ['js/app.js', app], ['js/admin.js', admin], ['sw.js', sw]])
      assert.ok(!src.includes('?v=181'), name + ' still pins a v181 asset URL');
    assert.ok(!app.includes('APP_REL = 181') && !index.includes('__SHIVAA_REL=181'), 'no old release stamps');
    assert.ok(!sw.includes("SHELL = 'shivaa-shell-v181'") && !sw.includes('const REL = 181;'), 'no old worker stamps');
    assert.ok(!api.includes("'rel'   => 181,"), 'api rel bumped');
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'media generation deliberately unchanged at v168');
    // v178.css remains the last stylesheet
    const links = [...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/css\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(links.length && links[links.length - 1] === '/css/v178.css?v=182', 'v178.css stays last, got ' + links[links.length - 1]);
  });

  await test('S03', 'the shipped JavaScript parses cleanly', async () => {
    for (const f of ['js/app.js', 'js/admin.js', 'js/v178.js', 'sw.js'])
      execFileSync(process.execPath, ['--check', path.join(CMS, f)], { stdio: 'pipe' });
  });

  await test('S04', 'api.php carries the Phase 4 catalogue machinery with the safety laws intact', async () => {
    for (const needle of [
      'function shv_catalog_counts(array $products, string $batchId): array',
      'function shv_catalog_batch_view(array $b, array $products): array',
      'function shv_sql_catalog_overlay(array &$db): void',
      'function shv_sql_catalog_mirror(array $db): void',
      "function_exists('shv_sql_catalog_overlay')",
      "function_exists('shv_sql_catalog_mirror')",
      "'admin/catalogue/batch'",
      "'admin/catalogue/upload'",
      "'admin/catalogue/import'",
      "'admin/catalogue/queue'",
      "'admin/catalogue/approve'",
      "'admin/catalogue/skip'",
      "'admin/catalogue/batches'",
    ]) assert.ok(api.includes(needle), 'missing in api.php: ' + needle);

    // every catalogue write is admin-gated — five routes, five need_admin calls
    const catStart = api.indexOf('v182 · auto-catalogue intake');
    const catEnd = api.indexOf('v182 · billing sync bridge');
    assert.ok(catStart > 0 && catEnd > catStart, 'catalogue block located');
    const catBlock = api.slice(catStart, catEnd);
    assert.ok((catBlock.match(/need_admin\(\$db\)/g) || []).length >= 6, 'every catalogue route admin-gated');

    // standing law: weight/purity/weightSource are REJECTED when missing
    assert.ok(catBlock.includes('weights are NEVER invented'), 'weight invention rejection');
    assert.ok(catBlock.includes('purity is NEVER invented'), 'purity invention rejection');
    assert.ok(catBlock.includes('weightSource required'), 'weight provenance required');
    // staging state machine: imported rows can never ship active/live
    assert.ok(catBlock.includes("'$prod['active'] = false;'") || catBlock.includes("$prod['active'] = false;"), 'staged rows inactive');
    assert.ok(catBlock.includes("'pending_review'"), 'pending_review status');
    // approve flips the gate — and nothing else
    assert.ok(/\$p\['active'\] = true;[\s\S]{0,80}\$p\['status'\] = 'live';/.test(catBlock), 'approve flips active + status');

    // GET guard in catalog mirror: read routes never mirror
    const mirStart = api.indexOf('function shv_sql_catalog_mirror');
    assert.ok(/REQUEST_METHOD[^;]{0,80}GET/.test(api.slice(mirStart, mirStart + 600)), 'GET guard in catalog mirror');

    // db_save: catalog mirror runs after the JSON snapshot write
    const sStart = api.indexOf('function db_save(string $DB_FILE');
    const sBody = api.slice(sStart, api.indexOf('\nfunction clampn', sStart));
    const iJson = sBody.indexOf("$GLOBALS['__shv_snapshots'][$DB_FILE] = hash('sha256', $json);");
    const iMirror = sBody.indexOf('shv_sql_catalog_mirror(');
    assert.ok(iJson > 0 && iMirror > iJson, 'catalog mirror runs after JSON save');

    // db_load: catalog overlay before return
    const lStart = api.indexOf('function db_load(string $DB_FILE');
    const lBody = api.slice(lStart, api.indexOf('function db_save', lStart));
    assert.ok(lBody.indexOf('shv_sql_catalog_overlay(') < lBody.indexOf('return $db;'), 'catalog overlay before return');

    // staged pieces stay invisible: product list filters active, PDP hides inactive from non-admins
    assert.ok(api.includes("fn($x) => !empty($x['active'])"), 'products GET filters active');
    assert.ok(/empty\(\$db\['products'\]\[\$idx\]\['active'\]\)[\s\S]{0,220}jout\(404/.test(api), 'PDP hides inactive from shoppers');

    // sanitizer passes the staging fields through typed/clamped writes
    assert.ok(api.includes("'weightSource' => 120"), 'weightSource whitelisted');
    assert.ok(api.includes("in_array($st, ['pending_review', 'live', 'skipped'], true)"), 'status enum-gated');
    assert.ok(/preg_replace\('\/\[\^A-Za-z0-9_/.test(api), 'batchId charset-gated');
  });

  await test('S05', 'settlements composite-id fix (the 25 Sep live parity) lives in api + installer', async () => {
    for (const [name, src] of [['api.php', api], ['upgrade-sql.php', installer]])
      assert.ok(src.includes('function shv_settlement_id'), name + ' defines shv_settlement_id');
    assert.ok(installer.includes('shv_settlement_id($s, (int)$si)'), 'installer upsert resolves composite ids');
    assert.ok(api.includes('shv_settlement_id($s, (int)$siS)'), 'api mirror resolves composite ids');
    assert.ok(api.includes('shv_settlement_id(is_array($js)'), 'overlay matcher resolves composite ids');
  });

  await test('S06', 'upgrade-sql.php grows the Phase 4 schema idempotently (status, batch_id, batch ledger)', async () => {
    for (const needle of [
      "ADD COLUMN `status` VARCHAR(32) NOT NULL DEFAULT 'live'",
      'ADD COLUMN `batch_id` VARCHAR(64) NULL',
      'idx_status', 'idx_batch',
      'shv_upsert_catalog_batches',
      'catalog_batches.data_json',
      'JSON_EXTRACT',                       // one-time backfill from the full-row mirror
      'sqlBatches',
    ]) assert.ok(installer.includes(needle), 'missing in installer: ' + needle);
    // schema first, then sync, then verify — the v181 ordering law holds
    const post = installer.indexOf("if ($_SERVER['REQUEST_METHOD'] === 'POST')");
    const iSch = installer.indexOf('shv_ensure_schema($pdo);', post);
    const iUpB = installer.indexOf('shv_upsert_catalog_batches($pdo,', post);
    assert.ok(iSch > 0 && iUpB > iSch, 'schema ensured before batch upsert');
  });

  await test('S07', 'admin.js grows the Catalogue Intake tab with the review-queue flow', async () => {
    assert.ok(admin.includes("['intake','📦','Catalogue Intake']"), 'intake nav entry');
    assert.ok(admin.includes("intake:'Catalogue Intake & Review Queue'"), 'intake title');
    assert.ok(admin.includes('/api/admin/catalogue/queue'), 'queue fetch');
    assert.ok(admin.includes('ShivaaAdmin.intakeCreateBatch') && admin.includes('ShivaaAdmin.intakeUpload'), 'batch + upload actions');
    assert.ok(admin.includes('ShivaaAdmin.intakeImport') && admin.includes('ShivaaAdmin.intakeApprove') && admin.includes('ShivaaAdmin.intakeSkip'), 'import + approve/skip actions');
    assert.ok(admin.includes('ShivaaAdmin.intakeApproveAll'), 'batch publish action');
    assert.ok(admin.includes('weight source:'), 'weight provenance shown on the review card');
    assert.ok(admin.includes('weightSource'), 'weightSource flows through the intake UI');
    // the v181 doorway tile and data source strip survive
    assert.ok(admin.includes('/billing/') && admin.includes('Billing Software'), 'billing doorway intact');
    assert.ok(admin.includes('v180DbStrip') && admin.includes('id="v180DbStrip"'), 'data source strip intact');
  });

  await test('S08', 'billing sync bridge: HMAC-guarded, dark-by-default, secret is write-only', async () => {
    for (const needle of [
      'function shv_billing_sync_auth(array $db): array',
      "'billing/stock'",
      "'billing/stock-movement'",
      'X_SHIVAA_TS', 'X_SHIVAA_SIGNATURE',
      'hash_hmac', 'hash_equals',
      'Billing sync is not configured',
    ]) assert.ok(api.includes(needle), 'missing in api.php: ' + needle);
    // secret handling: blank never wipes; charset-gated; auto-stripped from public settings
    assert.ok(api.includes("unset($setBody['billingSyncSecret'])"), 'blank keeps the saved key');
    assert.ok(api.includes('/^[A-Za-z0-9_\\-]{16,128}$/'), 'sync key charset + length gate');
    assert.ok(admin.includes('saveBillingSync') && admin.includes('billingSyncSecret'), 'admin settings field present');
    // idempotency: movementId is the de-dup key
    assert.ok(api.includes('$db[\'billingMovements\'][$mid]'), 'movement log keyed by movementId');
  });

  await test('S09', 'the belt includes the v182 suites and the billing contract is documented', async () => {
    assert.ok(pkg.scripts.test.includes('v182-check.js') && pkg.scripts.test.includes('v182-php-run.js'), 'npm test runs the v182 suites');
    const contract = fs.readFileSync(path.join(ROOT, 'docs/BILLING-SYNC-CONTRACT.md'), 'utf8');
    assert.ok(contract.includes('billing/stock-movement') && contract.includes('billing/stock'), 'contract documents both endpoints');
    assert.ok(contract.includes('X-Shivaa-Signature') && contract.includes('movementId'), 'contract documents auth + idempotency');
  });

  console.log(`\nv182 check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
