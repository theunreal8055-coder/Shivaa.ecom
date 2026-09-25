/* v181 — Phase 3 SQL migration (Orders, Settings, Users, Reviews, Settlements)
   checked statically. Runtime behavior executed by v181-php-run under PHP 8.3. */

/* SUPERSEDED-PROBE v181 — stamp-exact suite for release 181: on a NEWER
   tree it SKIPs (regression content re-executes inside current chain php-run);
   on its own release or an overlay of its zip it runs in full. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 181) {
    console.log('SKIP v181-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in v182 check/php-run)');
    process.exit(0);
  }
}

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const ROOT = path.resolve(__dirname, '../../..');
const rd = n => fs.readFileSync(path.join(CMS, n), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'), admin = rd('js/admin.js'), api = rd('api.php');
const installer = rd('upgrade-sql.php'), cfgExample = rd('config.example.php');
const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/hostinger-deploy.yml'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
let pass = 0, fail = 0;
setTimeout(() => { console.error('v181 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  await test('S01', 'release 181 in lockstep across all four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=181;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 181;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v181';") && sw.includes('const REL = 181;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 181,"), 'api version endpoint');
  });

  await test('S02', 'every asset URL re-stamped to 181, zero 180 leftovers, media untouched', async () => {
    assert.ok((index.match(/\?v=181/g) || []).length >= 56, 'index carries the full asset sheet, got ' + (index.match(/\?v=181/g) || []).length);
    assert.equal((sw.match(/\?v=181/g) || []).length, 51, 'worker precache list');
    for (const [name, src] of [['index.html', index], ['sw.js', sw], ['js/app.js', app], ['js/admin.js', admin]])
      assert.ok(!src.includes('?v=180'), name + ' still pins a v180 asset URL');
    assert.ok(!app.includes('APP_REL = 180') && !index.includes('__SHIVAA_REL=180'), 'no old release stamps');
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'media generation deliberately unchanged at v168');
  });

  await test('S03', 'the shipped JavaScript parses cleanly', async () => {
    for (const f of ['js/app.js', 'js/admin.js', 'js/v178.js', 'sw.js'])
      execFileSync(process.execPath, ['--check', path.join(CMS, f)], { stdio: 'pipe' });
  });

  await test('S04', 'api.php carries Phase 3 SQL overlay & mirror machinery with safety laws intact', async () => {
    for (const needle of [
      'function shv_db_driver(): string',
      'function shv_sql_products_overlay(array $jsonProducts): array',
      'function shv_sql_products_mirror(array $products): void',
      'function shv_sql_phase3_overlay(array &$db): void',
      'function shv_sql_phase3_mirror(array $db): void',
      'function_exists(\'shv_sql_phase3_overlay\')',
      'function_exists(\'shv_sql_phase3_mirror\')',
      "data/.sql-mirror-behind",
      "'db' => shv_version_db()",
    ]) assert.ok(api.includes(needle), 'missing in api.php: ' + needle);

    // GET guard in mirror: read routes never mirror
    assert.ok(/REQUEST_METHOD[^;]{0,80}GET/.test(api.slice(api.indexOf('function shv_sql_phase3_mirror'))), 'GET guard in phase 3 mirror');

    // db_save: phase3 mirror runs inside db_save after json snapshot
    const sStart = api.indexOf('function db_save(string $DB_FILE');
    const sBody = api.slice(sStart, api.indexOf('\nfunction clampn', sStart));
    const iJson = sBody.indexOf("$GLOBALS['__shv_snapshots'][$DB_FILE] = hash('sha256', $json);");
    const iMirrorP3 = sBody.indexOf('shv_sql_phase3_mirror(');
    assert.ok(iJson > 0 && iMirrorP3 > iJson, 'phase 3 mirror runs after JSON save');

    // db_load: overlay before return
    const lStart = api.indexOf('function db_load(string $DB_FILE');
    const lBody = api.slice(lStart, api.indexOf('function db_save', lStart));
    assert.ok(lBody.indexOf('shv_sql_phase3_overlay(') < lBody.indexOf('return $db;'), 'phase 3 overlay before return');
  });

  await test('S05', 'upgrade-sql.php reconciles all Phase 3 collections with backup-first and verify', async () => {
    for (const needle of [
      'shv_backup_json_db', 'shv_ensure_schema', 'shv_upsert_products',
      'shv_upsert_settings', 'shv_upsert_orders', 'shv_upsert_users',
      'shv_upsert_reviews', 'shv_upsert_coupons', 'shv_upsert_settlements',
      'data_json', 'orders.data_json', 'unlink($MIRROR_FLAG)',
    ]) assert.ok(installer.includes(needle), 'missing in installer: ' + needle);

    const post = installer.indexOf("if ($_SERVER['REQUEST_METHOD'] === 'POST')");
    assert.ok(post > 0, 'POST handler present');
    const iBak = installer.indexOf('$backup = shv_backup_json_db();', post);
    const iSch = installer.indexOf('shv_ensure_schema($pdo);', post);
    const iUpsP = installer.indexOf('shv_upsert_products($pdo,', post);
    const iUpsO = installer.indexOf('shv_upsert_orders($pdo,', post);
    assert.ok(iBak > 0 && iSch > iBak && iUpsP > iSch && iUpsO > iUpsP, 'backup -> schema -> upsert ordering');
  });

  await test('S06', 'admin settings features the Billing Software doorway tile', async () => {
    assert.ok(admin.includes('/billing/'), 'billing path link');
    assert.ok(admin.includes('Billing Software'), 'billing software title');
    assert.ok(admin.includes('target="_blank"'), 'opens in new tab');
    assert.ok(admin.includes('v180DbStrip'), 'data source strip function intact');
    assert.ok(admin.includes('id="v180DbStrip"'), 'data source strip container intact');
  });

  await test('S07', 'settlement composite id resolution (partnerId_weekEnding) in api + installer', async () => {
    for (const [name, src] of [['api.php', api], ['upgrade-sql.php', installer]])
      assert.ok(src.includes('function shv_settlement_id'), name + ' defines shv_settlement_id');
    // the 25 Sep live fix: id-less settlement rows must NOT be skipped —
    // both the installer upsert and the api mirror resolve a composite key.
    assert.ok(installer.includes('shv_settlement_id($s, (int)$si)'), 'installer upsert resolves composite ids');
    assert.ok(api.includes('shv_settlement_id($s, (int)$siS)'), 'api mirror resolves composite ids');
    assert.ok(api.includes('shv_settlement_id(is_array($js)'), 'overlay matcher resolves composite ids');
    // resolver order: explicit id → partnerId_weekEnding → position fallback
    const m = /function shv_settlement_id\(array \$s, int \$idx\): string \{([\s\S]{0,600}?)\n\}/.exec(api);
    assert.ok(m, 'resolver body extractable');
    const body = m[1];
    assert.ok(body.includes("'partnerId'") && body.includes("'weekEnding'"), 'composite parts present');
    assert.ok(body.indexOf("($s['id']") < body.indexOf("'partnerId'"), 'explicit id wins');
  });

  console.log(`\nv181 check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
