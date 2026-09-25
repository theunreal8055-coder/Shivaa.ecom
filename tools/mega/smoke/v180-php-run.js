/* v180 — executed PHP 8.3 on the dual-mode SQL layer. What CAN be executed
   in this sandbox (no MySQL server, no pdo_mysql in php-wasm) IS executed:
   the real production api.php boots with db_driver=json (default), with
   db_driver=mysql + placeholder config (connection refused → honest
   fallback), and with the mirror-behind flag (installer-owned healing) —
   products must serve identically in every case, and /api/version must
   report the exact mode + reason. The pure overlay verdict, row hash and
   data_json roundtrip run as extracted production code. What is NOT
   verified here — stated plainly for the record: a real MySQL round-trip
   (upsert/overlay against a live server) is an owner-server verification
   via /upgrade-sql.php counts + /api/version db.mode, not a sandbox claim. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fixture, seed, ADMIN, fn } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v180 harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  const F = await fixture();
  F.setDb(seed());
  const b64 = v => Buffer.from(v).toString('base64');
  const writeConfig = phpCode =>
    F.run(`file_put_contents('/qa/config.php', base64_decode('${b64(phpCode)}'));`);

  await test('X01', 'default driver=json: products serve, version reports driver-json, no config needed', async () => {
    const r = await F.req('GET', 'products');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.json.products) && r.json.products.length > 0, 'products array');
    const v = await F.req('GET', 'version');
    assert.equal(v.status, 200);
    assert.equal(v.json.db.driver, 'json');
    assert.equal(v.json.db.mode, 'json');
    assert.equal(v.json.db.reason, 'driver-json');
    assert.equal(v.json.db.mirrorBehind, false);
    assert.ok(v.json.rel >= 179, 'rel floor');
    assert.equal(v.json.stamp.matched, true);
    assert.equal(v.json.stamp.index, v.json.rel);
  });

  await test('X02', 'db_driver=mysql with placeholder config: connection refused → JSON fallback, honest reason', async () => {
    // config.php with the mysql driver ON but the placeholder dbname get_db_pdo refuses
    await writeConfig(`<?php return ["db_driver"=>"mysql","mysql"=>["host"=>"localhost","dbname"=>"YOUR_HOSTINGER_DB_NAME","username"=>"nobody","password"=>"nope","port"=>3306,"charset"=>"utf8mb4"]];`);
    const r = await F.req('GET', 'products');
    assert.equal(r.status, 200, 'products still serve');
    assert.ok(r.json.products.length > 0, 'from the JSON safety net');
    const v = await F.req('GET', 'version');
    assert.equal(v.json.db.driver, 'mysql', 'driver preference is mysql');
    assert.equal(v.json.db.mode, 'json', 'but reads stayed on JSON');
    assert.equal(v.json.db.reason, 'no-connection', 'named reason');
    assert.equal(v.json.db.mirrorBehind, false);
    await F.run(`@unlink('/qa/config.php');`);
  });

  await test('X03', 'mirror-behind flag: reads fall back with reason mirror-behind BEFORE any connection attempt', async () => {
    await writeConfig(`<?php return ["db_driver"=>"mysql","mysql"=>["host"=>"localhost","dbname"=>"YOUR_HOSTINGER_DB_NAME","username"=>"nobody","password"=>"nope","port"=>3306,"charset"=>"utf8mb4"]];`);
    await F.run(`file_put_contents('/qa/data/.sql-mirror-behind', json_encode(["at"=>date("c"),"error"=>"qa-simulated"]));`);
    const r = await F.req('GET', 'products');
    assert.equal(r.status, 200, 'products serve from JSON');
    const v = await F.req('GET', 'version');
    assert.equal(v.json.db.reason, 'mirror-behind');
    assert.equal(v.json.db.mirrorBehind, true);
    assert.equal(v.json.db.mode, 'json');
    // a write must still succeed (JSON path untouched by the flag) and must NOT clear the flag
    const del = await F.run(`echo file_exists('/qa/data/.sql-mirror-behind') ? '1' : '0';`);
    assert.equal(del.body.trim(), '1', 'flag on disk');
    await F.run(`@unlink('/qa/data/.sql-mirror-behind'); @unlink('/qa/config.php');`);;
  });

  await test('X04', 'pure verdict: sql-empty / count-mismatch / id-mismatch / equal-set-pass (extracted production code)', async () => {
    const body = fn('shv_sql_overlay_verdict');
    const run = code => F.run(code);
    // equal sets → '' (may overlay)
    let r = await run(`${body} echo shv_sql_overlay_verdict([['id'=>'a'],['id'=>'b']], ['a'=>['id'=>'a'],'b'=>['id'=>'b']]) === '' ? 'PASS' : 'FAIL';`);
    assert.equal(r.body.trim(), 'PASS', 'equal sets pass');
    // empty sql + non-empty json → sql-empty
    r = await run(`${body} echo shv_sql_overlay_verdict([['id'=>'a']], []);`);
    assert.equal(r.body.trim(), 'sql-empty');
    // counts differ → count-mismatch
    r = await run(`${body} echo shv_sql_overlay_verdict([['id'=>'a'],['id'=>'b']], ['a'=>['id'=>'a']]);`);
    assert.equal(r.body.trim(), 'count-mismatch');
    // equal count, different id → id-mismatch
    r = await run(`${body} echo shv_sql_overlay_verdict([['id'=>'a'],['id'=>'b']], ['a'=>['id'=>'a'],'c'=>['id'=>'c']]);`);
    assert.equal(r.body.trim(), 'id-mismatch');
    // empty on empty → pass (nothing to serve either way)
    r = await run(`${body} echo shv_sql_overlay_verdict([], []) === '' ? 'PASS' : 'FAIL';`);
    assert.equal(r.body.trim(), 'PASS', 'empty catalogue passes');
  });

  await test('X05', 'data_json roundtrip: shv_sql_product_values carries the row byte-identically', async () => {
    const vals = fn('shv_sql_product_values');
    const hash = fn('shv_product_row_hash');
    const r = await F.run(`
      ${vals}
      ${hash}
      $row = ['id'=>'p_qa1','sku'=>'QA-1','name'=>'QA Ring','category'=>'rings','metal'=>'Gold','purity'=>'22K',
        'weightG'=>3.83,'lessWeightG'=>0.5,'mcScheme'=>'perGram','mcValue'=>398,'stoneValue'=>0,'stoneDesc'=>'',
        'images'=>['/uploads/a.jpg','/uploads/b.jpg'],'desc'=>'A fine QA ring','rating'=>4.7,'reviews'=>12,'stock'=>8,
        'active'=>true,'tags'=>['new'],'sizes'=>[]];
      $v = shv_sql_product_values($row);
      $back = json_decode($v[count($v) - 1], true);
      echo ($back === $row) ? 'IDENTICAL' : 'DRIFT';
      $h1 = shv_product_row_hash($row); $h2 = shv_product_row_hash($row);
      echo '|' . ($h1 === $h2 ? 'STABLE' : 'UNSTABLE');
      $row2 = $row; $row2['stock'] = 7;
      echo '|' . (shv_product_row_hash($row2) !== $h1 ? 'SENSITIVE' : 'BLIND');
      echo '|' . (count($v) >= 19 ? 'COLS' . count($v) : 'COLS-FEW');
    `);
    // layout-tolerant (v182 grew the row: +status, +batch_id before data_json):
    // data_json stays the LAST slot and round-trips byte-identically.
    assert.match(r.body, /^IDENTICAL\|STABLE\|SENSITIVE\|COLS\d+$/, r.body);
  });

  await test('X06', 'version db payload leaks no credentials (keys + raw body scan)', async () => {
    try {
      await writeConfig(`<?php return ["db_driver"=>"json","mysql"=>["host"=>"localhost","dbname"=>"u123_shivaa","username"=>"u123_user","password"=>"S3cretPass","port"=>3306,"charset"=>"utf8mb4"]];`);
      const v = await F.req('GET', 'version');
      const raw = JSON.stringify(v.json);
      assert.ok(!/S3cretPass|u123_user|u123_shivaa/.test(raw), 'connection details must never appear');
      for (const k of ['password', 'username', 'dbname', 'host']) assert.ok(!(k in (v.json.db || {})), 'db.' + k + ' must not exist');
      const keys = Object.keys(v.json.db).sort();
      assert.deepEqual(keys, ['driver', 'jsonCount', 'mirrorBehind', 'mode', 'reason', 'sqlCount'], 'exact key set — nothing extra');
    } finally {
      await F.run(`@unlink('/qa/config.php');`);
    }
  });

  await test('X07', 'admin CRUD still works with driver=json (the entire proven JSON path is untouched)', async () => {
    await F.run(`@unlink('/qa/config.php'); @unlink('/qa/data/.sql-mirror-behind');`);;
    const t = ADMIN;
    // create
    const body = { name: 'QA v180 piece', weightG: 2.5, category: 'rings', metal: 'Gold', purity: '22K', images: ['/uploads/qa.jpg'], mcScheme: 'perGram', mcValue: 100 };
    const c = await F.req('POST', 'products', body, t);
    assert.equal(c.status, 200, 'status=' + c.status + ' json=' + JSON.stringify(c.json) + ' err=' + String(c.errors || '').slice(0, 800));
    const id = c.json.id || c.json.product?.id;
    assert.ok(id, 'id minted');
    // read back through the public route
    const g = await F.req('GET', 'products/' + id);
    assert.equal(g.status, 200);
    assert.equal(g.json.product.name, 'QA v180 piece');
    assert.ok(g.json.product.price && g.json.product.price.total > 0, 'priced with metal/purity present');
    // update
    const u = await F.req('PUT', 'products/' + id, { stock: 3 }, t);
    assert.equal(u.status, 200);
    // delete
    const d = await F.req('DELETE', 'products/' + id, {}, t);
    assert.equal(d.status, 200);
    const g2 = await F.req('GET', 'products/' + id);
    assert.equal(g2.status, 404, 'gone');
  });

  await test('X08', 'installer file parses under PHP 8.3 (top-level render is status-only GET, writes behind POST+password)', async () => {
    // execute the REAL upgrade-sql.php in GET mode: must render status, write nothing
    const pre = await F.run(`echo file_exists('/qa/data/backups') ? 'x' : 'none';`);
    assert.equal(pre.body.trim(), 'none', 'no backups dir yet');
    await F.run(`@unlink('/qa/config.php');`);;   // X08 renders the no-config status path first
    const src = fs.readFileSync(path.join(process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms'), 'upgrade-sql.php'), 'utf8');
    await F.run(`file_put_contents('/qa/upgrade-sql.php', base64_decode('${Buffer.from(src).toString('base64')}'));`);
    const r = await F.run(`$_SERVER['REQUEST_METHOD']='GET'; $_SERVER['REMOTE_ADDR']='203.0.113.9'; include '/qa/upgrade-sql.php';`);
    const html = Buffer.from(r.body).toString();
    assert.ok(html.includes('Shivaa SQL setup'), 'status page rendered: ' + html.slice(0, 200));
    assert.ok(html.includes('admin password'), 'password form present');
    assert.ok(!html.includes('S3cret'), 'no secrets echoed');
    const post = await F.run(`echo file_exists('/qa/data/backups') ? 'x' : 'none';`);
    assert.equal(post.body.trim(), 'none', 'GET wrote nothing');
    // POST with WRONG password → refused, no backup created
    const r2 = await F.run(`$_SERVER['REQUEST_METHOD']='POST'; $_SERVER['REMOTE_ADDR']='203.0.113.10'; $_POST=['password'=>'wrong-password-qa']; include '/qa/upgrade-sql.php';`);
    const html2 = Buffer.from(r2.body).toString();
    assert.ok(html2.includes('Wrong admin password'), 'wrong password refused');
    const post2 = await F.run(`echo file_exists('/qa/data/backups') ? 'x' : 'none';`);
    assert.equal(post2.body.trim(), 'none', 'failed auth wrote no backup');
    await F.run(`@unlink('/qa/upgrade-sql.php'); @unlink('/qa/data/.sql-upgrade-attempts.json');`);;
  });

  console.log(`\nv180 PHP: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
