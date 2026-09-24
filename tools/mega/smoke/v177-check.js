/* v177 — static invariants: release stamps in lockstep, the v176 rework
   actually present in every shipped file, and the JS the owner will load.
   No network, no production files. The executed behaviour lives in
   v177-php-run.js (real PHP under an isolated fixture). */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const CMS=process.env.SMOKE_CMS||path.resolve(__dirname,'../../../cms');
const rd=n=>fs.readFileSync(path.join(CMS,n),'utf8');
const api=rd('api.php'),index=rd('index.html'),sw=rd('sw.js'),app=rd('js/app.js'),admin=rd('js/admin.js');
/* SUPERSEDED-PROBE v177 — stamp-exact suite for release 177: on a NEWER
   tree it SKIPs (regression content re-executes inside the current chain's
   php-run); on its own release or an overlay of its zip it runs in full. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 177) {
    console.log('SKIP v177-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in the v179/v180 chain php-run)');
    process.exit(0);
  }
}
let pass=0,fail=0;
setTimeout(()=>{console.error('v177 static harness deadline exceeded');process.exit(1);},60000);
async function test(id,name,f){try{await f();pass++;console.log(`PASS ${id} ${name}`);}catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.message}`);}}
(async()=>{
 await test('S01','release 177 in lockstep across all four stamp sites',async()=>{
  assert.ok(index.includes('window.__SHIVAA_REL=177;'),'index stamp');
  assert.ok(app.includes('const APP_REL = 177;'),'app stamp');
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v177';")&&sw.includes('const REL = 177;'),'worker stamps');
  assert.ok(api.includes("'rel'   => 177,"),'api version endpoint');
 });
 await test('S02','every asset URL re-stamped to 177, zero 176 leftovers',async()=>{
  assert.ok(index.match(/\?v=177/g).length>=50,'index carries the full asset sheet');
  assert.equal(sw.match(/\?v=177/g).length,49,'worker precache list');
  for (const [name,src] of [['index.html',index],['sw.js',sw],['js/app.js',app]])
   assert.ok(!src.includes('?v=176'),name+' still pins a v176 asset URL');
  assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"),'media generation deliberately unchanged');
 });
 await test('S03','the last stylesheet is still the cumulative repair sheet',async()=>{
  const links=[...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(links.length>0);
  assert.ok(links[links.length-1].startsWith('/css/v175.css?v=177'),'repair sheet must stay last');
  assert.ok(sw.includes("'/css/v174.css?v=177'")&&sw.includes("'/css/v175.css?v=177'"),'both sheets precached');
 });
 await test('S04','GET preview reads scope from the query, POST from the body',async()=>{
  assert.ok(api.includes("($b['scope'] ?? 'unpaid') : ($_GET['scope'] ?? 'unpaid')"),
   'v176 bug: scope came only from the POST body, so every GET preview answered unpaid');
  const uiCall=admin.match(/purge-unpaid\?scope=' \+ pgScope\.value/);
  assert.ok(uiCall,'UI still sends the scope it shows the owner');
  assert.ok(admin.includes("body: JSON.stringify({ scope: p.scope, confirm: typed })"),
   'the delete posts the scope the PREVIEW showed');
 });
 await test('S05','backup names cannot collide inside one second',async()=>{
  assert.ok(api.includes('for ($bkN = 2; file_exists($bkPath); $bkN++)'),
   'v176 bug: same-second purges overwrote each other\'s backup');
  assert.ok(api.includes("date('Ymd-His') . '-' . $bkN"),'collision suffix form');
 });
 await test('S11','the purge backup encodes with real JSON flags',async()=>{
  assert.ok(!api.includes('JSON_UNESIGNED'),
   'v176 bug: JSON_UNESIGNED_SLASHES/UNICODE do not exist — every confirmed purge 500\'d on "Undefined constant"');
  assert.ok(api.includes('JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE'),
   'backup uses the same real flags as db_save');
 });
 await test('S06','the success note is scope-honest',async()=>{
  assert.ok(api.includes("$survivors = $scope === 'all'"),'scope-aware survivor wording');
  const oldNote = `' worth ₹' . number_format($value) . '. B2B and B2C customers, partners, products and every paid order were untouched.`;
  assert.ok(!api.includes(oldNote),'v176 note that lied about paid orders in an all-reset is gone');
 });
 await test('S07','legacy rows cannot 500 the dashboard or the preview',async()=>{
  assert.ok(api.includes("$d = substr((string)($o['createdAt'] ?? ''), 0, 10);\n      if ($d === '') continue;"),
   'stats byDay guards a missing createdAt');
  assert.ok(api.includes('is_array($o[\'address\'] ?? null)'),'purge sample guards a scalar address');
  assert.ok(api.includes("$adminUser = need_admin($db);"),'purge keeps the validated admin');
  assert.ok(!/req_user\(\$db\)\['name'\] \?\? 'admin'\)/.test(api),'re-reading the bearer mid-route is gone');
 });
 await test('S08','the day book counts ledger money on the day it arrives',async()=>{
  assert.ok(api.includes("$d = substr((string)($p['approvedAt'] ?? $p['at'] ?? ''), 0, 10);"),
   'approved proofs count on the approval day');
  assert.ok(api.includes("if ($method === 'COD') $codSales += $amt;"),'COD bucket comes from ledger rows');
  assert.ok(!api.includes("if (substr((string)($o['createdAt'] ?? ''), 0, 10) !== $day || ($o['status'] ?? '') === 'Cancelled') continue;"),
   'v176 creation-day filter (which zeroed COD forever) is gone');
  assert.ok(admin.includes('COD collected'),'tile renamed to what it now means');
 });
 await test('S09','v176 core still present: one definition of money received',async()=>{
  assert.ok(api.includes('function order_money_received(array $o): int'));
  assert.ok(api.includes("$rev = array_sum(array_map('order_money_received', $liveOrders));"));
  assert.ok(!api.includes("$rev = array_sum(array_column($liveOrders, 'total'));"),'raw-total stats line is back');
  assert.ok(!api.includes("$revenue += (int)($o['total'] ?? 0);"),'raw-total reports line is back');
  assert.ok(api.includes("'DELETE ALL SALES'")&&api.includes("'DELETE UNPAID'"));
  assert.ok(api.includes("db-before-purge-"),'backup-first purge intact');
  assert.ok(admin.includes('pgPreview')&&admin.includes('unpaidOrders'),'admin surface intact');
 });
 await test('S10','the shipped JavaScript parses cleanly',async()=>{
  for (const f of ['js/app.js','js/admin.js']) {
   execFileSync(process.execPath,['--check',path.join(CMS,f)],{timeout:30000});
  }
  assert.ok(true);
 });
 console.log(`\nv177 static: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
