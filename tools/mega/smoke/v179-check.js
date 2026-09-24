/* v179 — the permanent bullion-rates fix, checked statically (and the
   relay's TOTP executed against the RFC 6238 test vectors). The engine's
   end-to-end behaviour is executed by v179-php-run (production api.php
   under PHP 8.3, seeded spot + tick file) and the relay's self-heal by
   v179-relay (the real relay.js against a mock Angel SmartAPI). No
   network, no production files touched. */
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const crypto=require('node:crypto');   // the relay's totp() resolves this through the eval scope chain
const CMS=process.env.SMOKE_CMS||path.resolve(__dirname,'../../../cms');
const rd=n=>fs.readFileSync(path.join(CMS,n),'utf8');
const index=rd('index.html'),sw=rd('sw.js'),app=rd('js/app.js'),admin=rd('js/admin.js'),api=rd('api.php');
const relay=rd('relay/relay.js');
let pass=0,fail=0;
setTimeout(()=>{console.error('v179 harness deadline exceeded');process.exit(1);},60000);
async function test(id,name,f){try{await f();pass++;console.log(`PASS ${id} ${name}`);}catch(e){fail++;console.log(`FAIL ${id} ${name}: ${e.message}`);}}

(async()=>{
 await test('S01','release 179 in lockstep across all four stamp sites',async()=>{
  assert.ok(index.includes('window.__SHIVAA_REL=179;'),'index stamp');
  assert.ok(app.includes('const APP_REL = 179;'),'app stamp');
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v179';")&&sw.includes('const REL = 179;'),'worker stamps');
  assert.ok(api.includes("'rel'   => 179,"),'api version endpoint');
 });
 await test('S02','every asset URL re-stamped to 179, zero 178 leftovers, media untouched',async()=>{
  assert.ok(index.match(/\?v=179/g).length>=56,'index carries the full asset sheet');
  assert.equal(sw.match(/\?v=179/g).length,51,'worker precache list');
  for (const [name,src] of [['index.html',index],['sw.js',sw],['js/app.js',app],['js/admin.js',admin]])
   assert.ok(!src.includes('?v=178'),name+' still pins a v178 asset URL');
  assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"),'media generation deliberately unchanged');
  assert.ok(!index.includes('relay.js')&&!sw.includes('relay.js'),'the relay is a Render service, not a site asset');
 });
 await test('S03','the shipped JavaScript and the relay parse cleanly',async()=>{
  for (const f of ['js/app.js','js/admin.js','js/v178.js','sw.js','relay/relay.js'])
   execFileSync(process.execPath,['--check',path.join(CMS,f)],{stdio:'pipe'});
 });
 await test('S04','the relay v2 carries an explicit self-heal for every failure mode',async()=>{
  assert.ok(relay.includes('signal is aborted without reason'),'the abort class is named where it is healed');
  assert.ok(relay.includes("const BASE = process.env.ANGEL_API_BASE || 'https://apiconnect.angelbroking.com'"),'REST-only, SmartAPI host');
  assert.ok(relay.includes('if (Date.now() - lastLoginAt < 30000) return !!SESSION;'),'re-login gated to 30 s');
  assert.ok(relay.includes('searchScrip')&&relay.includes('contract rollover suspected'),'rollover re-resolution');
  assert.ok(relay.includes('if (r.code === 429)'),'429 polite backoff');
  assert.ok(relay.includes('Date.now() - state.lastFrameAt > 90000'),'90 s no-frame watchdog');
  assert.ok(relay.includes('relay-last-tick.json'),'last tick persisted');
  assert.ok(relay.includes("process.on('unhandledRejection'")&&relay.includes("process.on('uncaughtException'"),'never fatal');
  assert.ok(relay.includes("req.headers['x-relay-key'] !== CFG.tickKey")&&relay.includes("u.searchParams.get('key') !== CFG.streamKey"),'both public surfaces key-gated');
  assert.ok(relay.includes("u.pathname === '/healthz'"),'health endpoint for the admin strip');
  assert.ok(relay.includes('it.symbolToken ?? it.symboltoken'),'quote token mapping lenient to API casing');
  const pkg=JSON.parse(fs.readFileSync(path.join(CMS,'relay/package.json'),'utf8'));
  assert.equal(pkg.scripts.start,'node relay.js'); assert.ok(pkg.engines.node.startsWith('>='));
  const readme=fs.readFileSync(path.join(CMS,'relay/README-RENDER.md'),'utf8');
  for (const k of ['ANGEL_API_KEY','ANGEL_TOTP_SECRET','RELAY_TICK_KEY','RELAY_STREAM_KEY','/healthz','Free-tier','never the prices'])
   assert.ok(readme.includes(k),'README-RENDER covers '+k);
 });
 await test('S05','the relay TOTP executes to the RFC 6238 SHA-1 test vectors',async()=>{
  // extract b32decode + totp from the SHIPPED file and run them at fixed times
  const a=relay.indexOf('function b32decode'); assert(a>=0);
  const b=relay.indexOf('/* ── Angel SmartAPI REST',a); assert(b>a);
  const src=relay.slice(a,b).replace(/Date\.now\(\)/g,'T_NOW');
  const run=(tSec)=>eval('(function(){'+src+'; var T_NOW='+tSec*1000+'; return totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");})()');
  // the 40-char base32 decodes to ASCII 12345678901234567890 — the RFC 4226/6238 secret
  assert.equal(run(59),'287082','vector T=59');
  assert.equal(run(1111111109),'081804','vector T=1111111109');
  assert.equal(run(1111111111),'050471','vector T=1111111111');
  assert.equal(run(1234567890),'005924','vector T=1234567890');
  assert.equal(run(2000000000),'279037','vector T=2000000000');
 });
 await test('S06','the api premium engine is complete: calibrate, fallback, last-good, health, persistence',async()=>{
  assert.ok(api.includes('function premium_calibrate(array &$db, array $mcx, float $gUsd, float $sUsd, float $inr): void'));
  assert.ok(api.includes('function premium_factor_for(array $db, string $metal): array'));
  assert.ok(api.includes('function rates_health(array $db): array'));
  assert.ok(api.includes("array_slice($cal, -200)"),'rolling window capped at 200');
  assert.ok(api.includes('if ($v >= 0.9 && $v <= 1.5) $vals[] = $v;'),'sane band on the factor');
  assert.ok(api.includes('time() - 7 * 86400'),'samples older than 7 days are ignored');
  assert.ok(api.includes("if ($gUsd > 0 && $sUsd > 0 && $inr > 0) premium_calibrate($db, $mcx, $gUsd, $sUsd, $inr);"),'calibrates while both feeds are live');
  assert.ok(api.includes("$db['rates']['mcxLastGood'] = ['at' => now_iso(), 'goldPerG'"),'last-good persisted');
  assert.ok(api.includes("$source = ($liveLegs >= 2) ? 'mcx-est' : 'mcx-est(partial)';"),'honest mcx-est source');
  assert.ok(api.includes("'premiumEst' => $premiumEst"),'stamp carries the applied premium');
  // the GET route persists before jout() exits — without this the
  // calibration window and last-good state are lost on every poll
  assert.ok(api.includes('if ($changed) db_save($DB_FILE, $db);\n    $last = $db[\'rates\'][\'last\'];'),'GET /api/rates saves the refresh');
  assert.ok(api.includes("'health' => rates_health($db),"),'health rides the public payload');
  assert.ok(api.includes("'overall' => $overall,"),'overall verdict');
  assert.ok(api.includes("/data/.relay-health.json")&&api.includes("$rhThrottle = $relayOkNow ? 300 : 60;"),'relay pull health, throttled (300 s ok / 60 s down / state change always)');
  assert.ok(api.includes("spotKind' => $spotImplied ? 'mcx-implied' : ($premiumEst ? 'mcx-est'"),'spotKind ladder premium-aware');
 });
 await test('S07','the UI renders the honest state: admin strip + storefront tag',async()=>{
  assert.ok(admin.includes('function v179HealthStrip(R)'),'strip defined');
  assert.ok(admin.includes('${v179HealthStrip(R)}'),'strip rendered in the rates tab');
  for (const k of ['h.mcx','h.relay','h.angel','h.spot','h.premium','h.overall'])
   assert.ok(admin.includes(k),'strip reads '+k);
  assert.ok(admin.includes('nothing to touch'),'the owner rule is stated where the owner looks');
  assert.ok(app.includes("String(R.source || '').startsWith('mcx-est')"),'storefront names the estimate');
  assert.ok(app.includes('(auto-learned)'),'calibration origin shown');
  assert.ok(app.includes('MCX feed down'),'the outage is disclosed next to the price');
 });
 await test('S08','the old raw-spot fallback is gone: no 10-14% under-market quote',async()=>{
  // the v178-era anchor that priced MCX-down gold at raw spot is replaced
  assert.ok(!api.includes("$gA = $mcx['gold'] ? round(($mcx['gold']['ltp'] / 10) * 1.0, 2) : round(($sg / OZ) * $inr, 2);"),'raw spot anchor still present');
  // and the estimate actually multiplies the calibrated factor
  assert.ok(api.includes('$gold24 = ($gUsd * $inr) / OZ * $pgF[0];'),'gold estimate applies the factor');
  assert.ok(api.includes('$silver = ($sUsd * $inr) / OZ * $psF[0];'),'silver estimate applies the factor');
  // RTGS strip derives from the same anchor (the owner\'s "rtgs rates" are fixed too)
  assert.ok(api.includes("function rtgs_strip(array $db)"),'rtgs strip present');
  assert.ok(api.includes("$mcxOn = (($r['source'] ?? '') === 'live-mcx') && $mcx;")||api.includes("$mcxOn = ($r['source'] ?? '') === 'live-mcx' && $mcx;"),'anchors know the MCX state');
 });
 console.log(`\nv179 check: ${pass} passed, ${fail} failed`);
 process.exit(fail?1:0);
})();
