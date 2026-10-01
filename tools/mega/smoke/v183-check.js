/* v183 — SUPPLIER (MANUFACTURER) PROGRAMME, checked statically.
   Runtime behaviour is executed by v183-php-run under PHP 8.3.

   SUPERSEDED-PROBE v183 — stamp-exact suite for release 183: on a NEWER tree
   it SKIPs (its regression content re-executes inside the current chain
   php-run); on its own release or an overlay of its zip it runs in full. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 183) {
    console.log('SKIP v183-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in the current chain php-run)');
    process.exit(0);
  }
}

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const rd = n => fs.readFileSync(path.join(CMS, n), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'), admin = rd('js/admin.js'), api = rd('api.php');
const installer = rd('upgrade-sql.php'), hallmark = rd('hallmark.php');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
let pass = 0, fail = 0;
setTimeout(() => { console.error('v183 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  await test('S01', 'release 183 in lockstep across all four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=183;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 183;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v183';") && sw.includes('const REL = 183;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 183,"), 'api version endpoint');
  });

  await test('S02', 'every asset URL re-stamped to 183, zero 182 leftovers, media untouched, v178.css last sheet', async () => {
    assert.ok((index.match(/\?v=183/g) || []).length >= 56, 'index asset sheet, got ' + (index.match(/\?v=183/g) || []).length);
    assert.equal((sw.match(/\?v=183/g) || []).length, 51, 'worker precache list');
    for (const [name, src] of [['index.html', index], ['js/app.js', app], ['js/admin.js', admin], ['sw.js', sw]])
      assert.ok(!src.includes('?v=182'), name + ' still pins a v182 asset URL');
    assert.ok(!sw.includes('shivaa-shell-v182') && !sw.includes('const REL = 182;'), 'no old worker stamps');
    assert.ok(!app.includes('APP_REL = 182') && !index.includes('__SHIVAA_REL=182'), 'no old release stamps');
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'media generation deliberately unchanged at v168');
    const links = [...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/css\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(links.length && links[links.length - 1] === '/css/v178.css?v=183', 'v178.css stays last, got ' + links[links.length - 1]);
  });

  await test('S03', 'the shipped JavaScript parses cleanly', async () => {
    for (const f of ['js/app.js', 'js/admin.js', 'js/v178.js', 'sw.js'])
      execFileSync(process.execPath, ['--check', path.join(CMS, f)], { stdio: 'pipe' });
  });

  await test('S04', 'api.php carries the supplier machinery: codes, scoping, routing, workflow', async () => {
    for (const needle of [
      'function shv_supplier_code_alphabet(): string',
      'function shv_supplier_code_norm(string $code): string',
      'function shv_supplier_code_taken(array $db, string $code, string $exceptId = \'\'): bool',
      'function shv_supplier_code_mint(array $db): string',
      'function shv_supplier_is_approved(array $db, ?array $u): bool',
      'function shv_supplier_for_product(array $db, array $product): ?array',
      'function shv_supplier_order_lines(array $db, array $order, string $supplierId): array',
      'function shv_supplier_route_order(array &$db, array &$order): void',
      'function shv_supplier_ctx(array $db): array',
      'function shv_supply_status_apply(array &$db, string $orderId, string $supplierId, string $status, string $note, bool $isAdmin): array',
      'function shv_supply_orders_for(array $db, string $supplierId, int $limit = 200): array',
      'function shv_supply_orders_all(array $db, int $limit = 400): array',
      'function shv_sql_supplier_overlay(array &$db): void',
      'function shv_sql_supplier_mirror(array $db): void',
    ]) assert.ok(api.includes(needle), 'missing: ' + needle);
    for (const route of ["'suppliers/apply'", "'suppliers/me'", "'supplier/designs'", "'supplier/media'", "'supplier/orders'",
      "'admin/suppliers'", "'admin/suppliers/designs'", "'admin/suppliers/assign'", "'admin/suppliers/orders'"])
      assert.ok(api.includes(route), 'missing route ' + route);
    assert.ok(api.includes('#^supplier/orders/([\\w-]+)$#'), 'supplier order PUT route');
    assert.ok(api.includes('#^admin/suppliers/([\\w-]+)/code$#'), 'code rotation route');
    assert.ok(api.includes('#^admin/suppliers/orders/([\\w-]+)$#'), 'admin ticket route');
    /* collections seeded + the order hook + mirror wiring (function_exists law) */
    assert.ok(api.includes("'suppliers','supplyOrders'"), 'collections seeded in the defaults sweep');
    assert.ok(api.includes("if (function_exists('shv_supplier_route_order')) shv_supplier_route_order($db, $order);"), 'order routing hook');
    assert.ok(api.includes("if (function_exists('shv_sql_supplier_overlay'))"), 'overlay call guarded');
    assert.ok(api.includes("if (function_exists('shv_sql_supplier_mirror')) shv_sql_supplier_mirror($db);"), 'mirror call guarded');
  });

  await test('S05', 'confidentiality law: public product + order passes strip the origin keys', async () => {
    assert.ok(hallmark.includes("if (function_exists('shv_supplier_strip')) $product = shv_supplier_strip($product);"),
      'hallmark_product strips supplier keys (the one public product pass)');
    assert.ok(api.includes("function shv_supplier_strip(array $row): array {"), 'central strip helper');
    for (const key of ["'supplier'", "'supplierId'", "'supplierCode'", "'supplierSku'", "'supplierName'", "'costPerGram'"])
      assert.ok(api.includes(key), 'secret key list covers ' + key);
    assert.ok(api.includes('$o = shv_supplier_strip($o);') && api.includes('$o[\'items\'][$i] = shv_supplier_strip($it);'),
      'shv_public_order scrubs the row AND every item snapshot');
    /* supplier-facing listings are projected, never raw rows */
    assert.ok(api.includes('FULFILMENT PROJECTION'), 'the fulfilment-only projection comment survives');
    assert.ok(!/supplier\/orders[\s\S]{0,80}jout\(200, \['orders' => \$db\['orders'\]/.test(api), 'supplier orders never echo raw shop orders');
  });

  await test('S06', 'supplier-facing endpoints are role-gated and admin scoping is explicit', async () => {
    const ctx = api.slice(api.indexOf('function shv_supplier_ctx(array $db): array'), api.indexOf('/* Stamp every order item'));
    assert.ok(ctx.includes("jout(401, ['error' => 'Login required']);"), 'anonymous refused');
    assert.ok(ctx.includes("if (($u['role'] ?? '') === 'admin')"), 'admin scoping branch');
    assert.ok(ctx.includes("jout(400, ['error' => 'supplierId required for an admin request']);"), 'admin must name the supplier');
    assert.ok(ctx.includes("Supplier accounts only"), 'other roles refused');
    assert.ok(ctx.includes("if (($s['status'] ?? '') !== 'approved')"), 'pending supplier gated');
    assert.ok(api.includes("This order carries none of your designs"), 'ticket ownership check');
  });

  await test('S07', 'settings: confidentiality switches default OFF and are strict booleans', async () => {
    assert.ok(api.includes("'supplierDropShip' => false, 'supplierSeesCustomer' => false]"),
      'both switches default false in the settings seed');
    assert.ok(api.includes("'supplierDropShip', 'supplierSeesCustomer'] as $occKey)"), 'strict-boolean validation includes the switches');
    assert.ok(api.includes("$cfg['revealCustomer']") || api.includes("'revealCustomer' => \$drop && !empty(\$db['settings']['supplierSeesCustomer'])"),
      'revealCustomer only when drop-ship is on');
  });

  await test('S08', 'storefront + admin surfaces exist (pages, portal, tab, footer doors, login routing)', async () => {
    assert.ok(app.includes("pages.suppliers = async (view) => {"), 'public suppliers page');
    assert.ok(app.includes("pages.supplier = async (view, q) => {"), 'supplier portal page');
    assert.ok(app.includes("role === 'supplier' ? '#/supplier'"), 'login routes a manufacturer to the portal');
    assert.ok(app.includes("if (u && u.role === 'supplier') location.hash = '#/supplier';"), 'returning manufacturer lands in the portal');
    assert.ok(app.includes('ShivaaSupplierCopy') && app.includes('ShivaaSupplierMove'), 'portal actions exported');
    assert.ok(admin.includes("['suppliers','🏭','Suppliers']"), 'admin tab');
    for (const fnName of ['supAdd', 'supStatus', 'supRotate', 'supAssign', 'supMove', 'supPortal', 'supCopy', 'supPrint'])
      assert.ok(admin.includes('ShivaaAdmin.' + fnName), 'admin action ' + fnName);
    /* the internal job slip carries the code; the customer packing slip stays clean */
    assert.ok(admin.includes('SUPPLIER JOB SLIP') && admin.includes('CONFIDENTIALITY:'), 'job slip is marked internal');
    const slip = admin.slice(admin.indexOf('function admPrintDoc'), admin.indexOf('function admPrintDoc') + 6000);
    for (const key of ['supplierCode', 'supplierName', 'supplierId', 'costPerGram'])
      assert.ok(!slip.includes(key), 'the customer-facing packing slip/label must not carry ' + key);
    assert.ok((index.match(/href="#\/suppliers"/g) || []).length >= 3, 'footer + drawer + column doors');
    assert.ok(index.includes('#/supplier') === false || index.includes('suppliers'), 'door naming');
  });

  await test('S09', 'installer reconciles suppliers + supply tickets with a UNIQUE code index', async () => {
    assert.ok(installer.includes('CREATE TABLE IF NOT EXISTS `suppliers`'), 'suppliers table');
    assert.ok(installer.includes('UNIQUE KEY `uq_supplier_code` (`code`)'), 'database-level unique code');
    assert.ok(installer.includes('CREATE TABLE IF NOT EXISTS `supply_orders`'), 'supply_orders table');
    assert.ok(installer.includes('function shv_upsert_suppliers(PDO $pdo, array $suppliers): int'), 'supplier upsert');
    assert.ok(installer.includes('function shv_upsert_supply_orders(PDO $pdo, array $tickets): int'), 'ticket upsert');
    assert.ok(installer.includes('$upSuppliers = shv_upsert_suppliers($pdo, $db[\'suppliers\'] ?? []);'), 'installer sync call');
    assert.ok(installer.includes('$upSupplyOrders = shv_upsert_supply_orders($pdo, $db[\'supplyOrders\'] ?? []);'), 'installer sync call (tickets)');
    assert.ok(installer.includes('suppliers count: json='), 'count verification');
    assert.ok(installer.includes('supplyOrders count: json='), 'ticket count verification');
  });

  await test('S10', 'belt registration: the v183 suites lead the chain and stay forward-only', async () => {
    assert.ok(pkg.scripts.test.includes('node v183-check.js'), 'static suite in the chain');
    assert.ok(pkg.scripts.test.includes('node v183-php-run.js'), 'executed suite in the chain');
    assert.ok(pkg.scripts.test.indexOf('v183-php-run.js') < pkg.scripts.test.indexOf('v182-php-run.js'),
      'newest php-run runs first (fresh fixture seeds)');
  });

  console.log(`\nv183 static: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
  process.exit(0);
})();
