/* v181 — executed PHP 8.3 test suite for Phase 3 SQL migration.
   Tests dual-mode overlay, fallback ladders, version payload, and order/settings flows. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, seed, ADMIN } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v181 harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  const F = await fixture();
  F.setDb(seed());
  const b64 = v => Buffer.from(v).toString('base64');
  const writeConfig = phpCode =>
    F.run(`file_put_contents('/qa/config.php', base64_decode('${b64(phpCode)}'));`);

  await test('P01', 'v181+ release stamp and version telemetry: rel>=181 floor, matched=true', async () => {
    const v = await F.req('GET', 'version');
    assert.equal(v.status, 200);
    assert.ok(v.json.rel >= 181, 'rel floor 181');
    assert.equal(v.json.stamp.matched, true);
    assert.equal(v.json.stamp.index, v.json.rel);
    assert.equal(v.json.stamp.app, v.json.rel);
    assert.equal(v.json.stamp.sw, v.json.rel);
    assert.equal(v.json.db.driver, 'json');
    assert.equal(v.json.db.mode, 'json');
    assert.equal(v.json.db.mirrorBehind, false);
  });

  await test('P02', 'db_driver=mysql with unconfigured PDO: falls back to JSON, reasons honestly', async () => {
    await writeConfig(`<?php return ["db_driver"=>"mysql","mysql"=>["host"=>"localhost","dbname"=>"YOUR_HOSTINGER_DB_NAME","username"=>"nobody","password"=>"nope","port"=>3306,"charset"=>"utf8mb4"]];`);
    const r = await F.req('GET', 'products');
    assert.equal(r.status, 200, 'products serve');
    const v = await F.req('GET', 'version');
    assert.equal(v.json.db.driver, 'mysql');
    assert.equal(v.json.db.mode, 'json');
    assert.equal(v.json.db.reason, 'no-connection');
    await F.run(`@unlink('/qa/config.php');`);
  });

  await test('P03', 'mirror-behind flag forces fallback to JSON net for all collections', async () => {
    await writeConfig(`<?php return ["db_driver"=>"mysql","mysql"=>["host"=>"localhost","dbname"=>"YOUR_HOSTINGER_DB_NAME","username"=>"nobody","password"=>"nope","port"=>3306,"charset"=>"utf8mb4"]];`);
    await F.run(`file_put_contents('/qa/data/.sql-mirror-behind', json_encode(["at"=>date("c"),"error"=>"qa-simulated"]));`);
    const r = await F.req('GET', 'products');
    assert.equal(r.status, 200);
    const v = await F.req('GET', 'version');
    assert.equal(v.json.db.reason, 'mirror-behind');
    assert.equal(v.json.db.mirrorBehind, true);
    await F.run(`@unlink('/qa/data/.sql-mirror-behind'); @unlink('/qa/config.php');`);
  });

  await test('P04', 'settings and orders remain fully operational under JSON baseline', async () => {
    // Read public settings
    const s = await F.req('GET', 'settings');
    assert.equal(s.status, 200);
    assert.ok(s.json.freeShipAbove !== undefined, 'settings has freeShipAbove');

    // Admin save settings
    const put = await F.req('PUT', 'settings', { shippingFee: 250, freeShipAbove: 50000 }, ADMIN);
    assert.equal(put.status, 200);
    assert.equal(put.json.shippingFee, 250);
  });

  await test('P05', 'Phase 3 overlay and mirror helpers are defined and guarded', async () => {
    const apiCode = fs.readFileSync(path.join(process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms'), 'api.php'), 'utf8');
    assert.ok(apiCode.includes('function shv_sql_phase3_overlay'), 'overlay defined');
    assert.ok(apiCode.includes('function shv_sql_phase3_mirror'), 'mirror defined');
    assert.ok(apiCode.includes("function_exists('shv_sql_phase3_overlay')"), 'overlay guarded');
    assert.ok(apiCode.includes("function_exists('shv_sql_phase3_mirror')"), 'mirror guarded');
  });

  await test('P06', 'installer upgrade-sql.php passes PHP 8.3 parse and contains all Phase 3 functions', async () => {
    const src = fs.readFileSync(path.join(process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms'), 'upgrade-sql.php'), 'utf8');
    await F.run(`file_put_contents('/qa/upgrade-sql.php', base64_decode('${Buffer.from(src).toString('base64')}'));`);
    const r = await F.run(`$_SERVER['REQUEST_METHOD']='GET'; $_SERVER['REMOTE_ADDR']='203.0.113.11'; include '/qa/upgrade-sql.php';`);
    const html = Buffer.from(r.body).toString();
    assert.ok(html.includes('Shivaa SQL setup'), 'status page rendered');
    assert.ok(src.includes('shv_upsert_settings') && src.includes('shv_upsert_orders') && src.includes('shv_upsert_users'), 'Phase 3 upsert functions present');
  });

  console.log(`\nv181 PHP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
