/* v180 — dual-mode SQL storage, checked statically. The runtime behaviour
   (fallback reasons, overlay verdict, row roundtrip) is EXECUTED by
   v180-php-run under PHP 8.3; the rates/purge regression stays on the chain
   via v179-php-run (made forward-tolerant). No network, no production files. */
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
setTimeout(() => { console.error('v180 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  await test('S01', 'release 180 in lockstep across all four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=180;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 180;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v180';") && sw.includes('const REL = 180;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 180,"), 'api version endpoint');
  });
  await test('S02', 'every asset URL re-stamped to 180, zero 179 leftovers, media untouched', async () => {
    assert.ok((index.match(/\?v=180/g) || []).length >= 56, 'index carries the full asset sheet, got ' + (index.match(/\?v=180/g) || []).length);
    assert.equal((sw.match(/\?v=180/g) || []).length, 51, 'worker precache list');
    for (const [name, src] of [['index.html', index], ['sw.js', sw], ['js/app.js', app], ['js/admin.js', admin], ['api.php', api], ['upgrade-sql.php', installer]])
      assert.ok(!src.includes('?v=179'), name + ' still pins a v179 asset URL');
    assert.ok(!app.includes('APP_REL = 179') && !index.includes('__SHIVAA_REL=179'), 'no old release stamps');
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'media generation deliberately unchanged');
    assert.ok(!index.includes('relay.js') && !sw.includes('relay.js'), 'the relay is a Render service, not a site asset');
  });
  await test('S03', 'the shipped JavaScript parses cleanly', async () => {
    for (const f of ['js/app.js', 'js/admin.js', 'js/v178.js', 'sw.js'])
      execFileSync(process.execPath, ['--check', path.join(CMS, f)], { stdio: 'pipe' });
  });
  await test('S04', 'api.php carries the complete dual-mode machinery with the safety laws intact', async () => {
    for (const needle of [
      'function shv_db_driver(): string',
      'function shv_sql_products_overlay(array $jsonProducts): array',
      'function shv_sql_products_mirror(array $products): void',
      'function shv_sql_overlay_verdict(array $jsonProducts, array $sqlById): string',
      'function shv_product_row_hash(array $p): string',
      "data/.sql-mirror-behind",
      "'db' => shv_version_db()",
      "return $d === 'mysql' ? 'mysql' : 'json';",
    ]) assert.ok(api.includes(needle), 'missing: ' + needle);
    // the mirror NEVER runs on read routes (rate polls must stay free)
    assert.ok(/REQUEST_METHOD[^;]{0,80}GET/.test(api.slice(api.indexOf('function shv_sql_products_mirror'))), 'GET guard in mirror');
    // mirror failure must flag, never throw the request
    const mStart = api.indexOf('function shv_sql_products_mirror');
    const mBody = api.slice(mStart, api.indexOf('\nfunction shv_version_db', mStart));
    assert.ok(mBody.includes('file_put_contents(shv_mirror_behind_file()'), 'failure writes the flag');
    assert.ok(!/catch \(Throwable \$e\) \{\s*throw/.test(mBody), 'mirror never rethrows');
    // flag blocks both reads and writes until the installer clears it
    assert.ok(mBody.includes('file_exists(shv_mirror_behind_file())'), 'mirror refuses while flag set');
    const oStart = api.indexOf('function shv_sql_products_overlay');
    const oBody = api.slice(oStart, api.indexOf('\nfunction shv_sql_products_mirror', oStart));
    assert.ok(oBody.includes("return $fallback('mirror-behind')") || oBody.includes("$fallback('mirror-behind')"), 'reads fall back on flag');
    // version payload: booleans/counts only — no credential keys
    const vStart = api.indexOf("if ($route === 'version'");
    const vBody = api.slice(vStart, api.indexOf('jout(200, [', vStart));
    assert.ok(!/password|username|dbname/i.test(api.slice(api.indexOf("'db' => shv_version_db()"), api.indexOf("'db' => shv_version_db()") + 200)), 'no creds near db payload');
    // db_save: mirror only AFTER the JSON rename succeeds
    const sStart = api.indexOf('function db_save(string $DB_FILE');
    const sBody = api.slice(sStart, api.indexOf('\nfunction clampn', sStart));
    const iJson = sBody.indexOf("$GLOBALS['__shv_snapshots'][$DB_FILE] = hash('sha256', $json);");
    const iMirror = sBody.indexOf('shv_sql_products_mirror(');
    assert.ok(iJson > 0 && iMirror > iJson, 'mirror runs after the snapshot/hash of the saved JSON');
    // db_load: overlay between snapshot and return
    const lStart = api.indexOf('function db_load(string $DB_FILE');
    const lBody = api.slice(lStart, api.indexOf('function db_save', lStart));
    assert.ok(lBody.indexOf('shv_sql_products_overlay(') < lBody.indexOf('return $db;'), 'overlay before return');
    assert.ok(lBody.includes("shv_product_row_hash($__p)"), 'load snapshot hashes recorded for the diff');
  });
  await test('S05', 'upgrade-sql.php: backup-first, admin-password gate, idempotent schema, no secrets', async () => {
    for (const needle of [
      'shv_backup_json_db', 'shv_ensure_schema', 'shv_upsert_products',
      'password_verify', 'shv_upgrade_pw_verify', 'Cache-Control: no-store',
      'CREATE TABLE IF NOT EXISTS `products`', 'data_json', 'ft_name_desc',
      'db-before-sql-reconcile-', 'unlink($MIRROR_FLAG)', 'shv_attempts_locked',
      'catalog_batches', 'noindex,nofollow',
    ]) assert.ok(installer.includes(needle), 'missing: ' + needle);
    // BACKUP MUST APPEAR BEFORE THE FIRST SCHEMA/UPSERT CALL INSIDE THE POST HANDLER
    const post = installer.indexOf("if ($_SERVER['REQUEST_METHOD'] === 'POST')");
    assert.ok(post > 0, 'POST handler');
    const iBak = installer.indexOf('$backup = shv_backup_json_db();', post);
    const iSch = installer.indexOf('shv_ensure_schema($pdo);', post);
    const iUps = installer.indexOf('shv_upsert_products($pdo,', post);
    assert.ok(iBak > 0 && iSch > iBak && iUps > iSch, 'backup → schema → upsert ordering');
    // refuses without config, prints no credentials
    assert.ok(installer.includes('config.php missing'), 'refuses without config');
    assert.ok(!/echo[^;]{0,60}\$ms\['password'\]/.test(installer), 'never echoes the DB password');
    // verification must compare counts AND spot-check rows before clearing the flag
    assert.ok(installer.indexOf('mismatches') < installer.indexOf('unlink($MIRROR_FLAG)'), 'verify before flag clear');
  });
  await test('S06', 'installer is excluded from auto-deploy; chain rotated; config documents fallback', async () => {
    assert.ok(workflow.includes('upgrade-sql.php') && workflow.includes('setup-mysql.php'), 'both installers excluded from the GitHub transfer');
    assert.ok(pkg.scripts.test.includes('v180-check.js') && pkg.scripts.test.includes('v180-php-run.js'), 'v180 suites on the chain');
    assert.ok(pkg.scripts.test.includes('v179-php-run.js'), 'the carried rates/purge regression stays on the chain');
    assert.ok(!pkg.scripts.test.includes('v179-check.js'), 'the stamp-exact v179 static suite is superseded (on disk, off chain)');
    assert.ok(pkg.scripts.test.includes('v179-relay.js'), 'relay self-heal suite stays on the chain');
    assert.ok(cfgExample.includes("'db_driver' => 'mysql'") && cfgExample.includes('upgrade-sql.php'), 'config example documents the switch + installer URL');
    assert.ok(cfgExample.includes("'YOUR_HOSTINGER_DB_NAME'"), 'placeholder guard intact');
    assert.ok(api.includes("$ms['dbname'] === 'YOUR_HOSTINGER_DB_NAME'"), 'get_db_pdo still refuses the placeholder');
  });
  await test('S07', 'the admin Data Source strip exists and never invents a green state', async () => {
    assert.ok(admin.includes('v180DbStrip'), 'strip function');
    assert.ok(admin.includes('id="v180DbStrip"'), 'strip mount');
    assert.ok(admin.includes('${v180DbStrip()}'), 'strip rendered on the Live Rates tab');
    assert.ok(admin.includes('/upgrade-sql.php'), 'points the owner at the reconciler when behind');
    assert.ok(admin.includes("db_driver => 'json'"), 'documents the instant rollback');
    assert.ok(admin.includes("cache: 'no-store'"), 'never cached status');
  });

  console.log(`\nv180 check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
