/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v149 PHP RUN — the deep profile reader and the refetch route are
   EXECUTED on a real interpreter (WebAssembly PHP 8.3), not just parsed.
   It exists because the LIVE server proved the exact failure: lastOk:0 with
   "profile had no Indian mobile number" — a 200 profile whose number hid
   under a shape v148's two-key reader never looked at.
   Groups:
     1  tc_norm_phone / tc_profile_extract run on eight real-world shapes
        (surgically evaluated FROM the shipped api.php source — same bytes).
     2  consent → failed now stores the retry material (tk/ep) on the entry.
     3  a number riding in the callback BODY rescues the whole flow.
     4  refetch: guards (unknown/invoked/throttle), the already-ok fast path,
        and the SAME order-override invariant v147 pinned.
   Run: node tools/mega/smoke/v149-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v149-php-run.js   (zip overlay)
   Exit 0 all green · 2 (loud SKIP) if @php-wasm/node is missing.
   ═══════════════════════════════════════════════════════════════════════ */

/* v152 · retired-feature guard — the phone-verify vendor was REMOVED by owner
   decision 19 Sep (Express to Cashfree direct is the flow). This suite documents
   the v143–v151 era: it SKIPs (exit 0) on trees without the feature and still
   fully RUNS on any older tree/overlay (SHIVAA_ROOT / SMOKE_CMS). */
{
  const _fs = require('fs'), _pt = require('path');
  const _root = process.env.SHIVAA_ROOT || _pt.resolve(__dirname, '../../..');
  const _cms = process.env.SMOKE_CMS || _pt.join(_root, 'cms');
  let _api = '';
  try { _api = _fs.readFileSync(_pt.join(_cms, 'api.php'), 'utf8'); } catch (e) {}
  if (!/auth\/truecaller\/callback/.test(_api)) { console.log('SKIP — v152: verification vendor not in this tree'); process.exit(0); }
}
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

let PHP, loadNodeRuntime;
try {
  ({ PHP } = require('@php-wasm/universal'));
  ({ loadNodeRuntime } = require('@php-wasm/node'));
} catch (e) {
  console.log('SKIP  @php-wasm/node not installed — static v149-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 1 } }));
  const dbPath = path.join(CMS, 'data/db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  db.settings = Object.assign({}, db.settings, {
    tcAppKey: 'qa-partner-key-123', guestCheckout: true, payProvider: 'demo',
    siteBaseUrl: 'https://www.shivaa.in',
  });
  delete db.orders; db.orders = [];
  php.mkdirTree('/tcrun/data');
  for (const f of ['api.php', 'hallmark.php', 'trust.php', 'sms.php', 'mail.php']) {
    php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  }
  php.writeFile('/tcrun/data/db.json', JSON.stringify(db));

  const b64 = s => Buffer.from(s).toString('base64');
  async function req(method, route, body, extraPost, q) {
    q = q || {};
    const code = `<?php
$GLOBALS['SHV_BODY'] = "${b64(body ? JSON.stringify(body) : '')}";
class ShvIn { public $context; private $d; private $p = 0;
  public function stream_open($u, $m, $o, &$x) { $this->d = base64_decode($GLOBALS['SHV_BODY']); return true; }
  public function stream_read($n) { $r = substr($this->d, $this->p, $n); $this->p += strlen($r); return $r; }
  public function stream_eof() { return $this->p >= strlen($this->d); }
  public function stream_stat() { return ['size' => strlen($this->d)]; }
  public function stream_seek($o2, $w) { if ($w === SEEK_SET) { $this->p = $o2; return true; } return false; }
}
stream_wrapper_unregister('php');
stream_wrapper_register('php', 'ShvIn');
$_SERVER['REQUEST_METHOD'] = '${method}';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_HOST'] = 'www.shivaa.in';
$_SERVER['REQUEST_URI'] = '/api/${route}';
$_GET = array_merge(['__route' => '${route}'], (array) json_decode(base64_decode("${b64(JSON.stringify(q || {}))}"), true));
$_POST = (array) json_decode(base64_decode("${b64(JSON.stringify(extraPost || {}))}"), true);
register_shutdown_function(function () {
  $c = http_response_code(); if (!$c) { $c = (int)($_SERVER['http_response_code'] ?? 200); }
  echo "\\n@@HTTP " . $c;
});
try { include '/tcrun/api.php'; } catch (Throwable $e) { echo "\\n@@FATAL " . get_class($e) . ': ' . $e->getMessage(); }
`;
    const out = await php.run({ code });
    const text = Buffer.from(out.bytes).toString();
    let http = 200, fatal = '', payload = text;
    const hm = text.match(/@@HTTP (\d+)/);
    if (hm) { http = parseInt(hm[1], 10); payload = text.replace(/\n?@@HTTP \d+[\s\S]*$/, ''); }
    const fm = text.match(/@@FATAL ([\s\S]*)/);
    if (fm) { fatal = fm[1].trim(); payload = text.replace(/\n?@@FATAL[\s\S]*$/, ''); }
    let json = null;
    try { json = JSON.parse(payload); } catch (e) {}
    return { http, json, raw: payload, fatal };
  }

  console.log('\n· boot');
  const cfg0 = await req('GET', 'pay/config');
  ok('isolated api.php BOOTS and answers pay/config', cfg0.http === 200 && !cfg0.fatal && cfg0.json && cfg0.json.mode === 'demo', `http=${cfg0.http} fatal=${cfg0.fatal}`);

  console.log('\n· 1 — the DEEP READER executed on real shapes (functions evaluated from the shipped file)');
  const ext = await php.run({ code: `<?php
$src = file_get_contents('/tcrun/api.php');
preg_match('/function tc_norm_phone.*?\\n\\}/s', $src, $m1);
preg_match('/function tc_profile_extract.*?\\n\\}/s', $src, $m2);
if (!$m1 || !$m2) { echo json_encode(['fatal' => 'could not isolate the two functions']); return; }
eval($m1[0]); eval($m2[0]);
$cases = [
  // [label, profile, expectPhone, expectNameSub]
  ['caratlane-flat', ['firstName' => 'Asha', 'lastName' => 'Menon', 'phones' => [['type' => 'MOBILE', 'number' => '098765 43210', 'e164Format' => '+919876543210']]], '9876543210', 'Asha Menon'],
  ['wrapped-data', ['data' => ['phones' => [['e164Format' => '+918905005921']]], 'name' => 'R K'], '8905005921', 'R K'],
  ['phoneNumbers-key', ['phoneNumbers' => [['number' => '+91-89050-05921']]], '8905005921', ''],
  ['top-level-phoneNumber', ['phoneNumber' => '98765 43210', 'alt' => ''], '9876543210', ''],
  ['0091-prefix', ['msisdn' => '0091 98765 43210'], '9876543210', ''],
  ['bare-value-weird-key', ['contact' => '9876543210'], '9876543210', ''],
  ['id-key-NEVER-counts', ['name' => 'X Y', 'dob' => '1990-01-01', 'requestId' => '9876500000'], '', 'X Y'],
  ['empty-phones', ['name' => 'Z', 'phones' => []], '', 'Z'],
];
$out = [];
foreach ($cases as [$label, $p, $want, $nameSub]) {
  [$ph, $nm] = tc_profile_extract($p);
  $out[] = ['label' => $label, 'phone' => $ph, 'name' => $nm, 'wantOk' => $ph === $want, 'nameOk' => $nameSub === '' || strpos($nm, $nameSub) !== false];
}
echo json_encode($out);
` });
  let extRows = [];
  try { extRows = JSON.parse(ext.bytes.toString('utf8').replace(/^"|"$/g, '').replace(/\\\//g, '/')); } catch (e) { extRows = null; }
  if (!Array.isArray(extRows) && ext && ext.bytes) { try { extRows = JSON.parse(Buffer.from(ext.bytes).toString()); } catch (e) { extRows = null; } }
  ok('all 8 real-world profile shapes extract the RIGHT number (or righteously nothing)',
    Array.isArray(extRows) && extRows.length === 8 && extRows.every(r => r.wantOk && r.nameOk),
    Buffer.from(ext.bytes).toString().slice(0, 400));

  console.log('\n· 2 — consent whose fetch FAILS keeps the retry material on the failed entry');
  const N2 = 'shvq149fail00001';
  await req('POST', 'auth/truecaller/callback', { requestId: N2, accessToken: 'tok-abc', endpoint: 'https://profile4-noneu.truecaller.com/v1/default' });
  const entryRaw = await php.run({ code: `<?php echo json_encode(json_decode((string)@file_get_contents('/tcrun/data/tc-verify/' . sha1('${N2}') . '.json'), true) ? array_keys(json_decode((string)@file_get_contents('/tcrun/data/tc-verify/' . sha1('${N2}') . '.json'), true)) : null);` });
  const keys = JSON.parse(Buffer.from(entryRaw.bytes).toString());
  ok('failed entry keys now include st, tk, ep (the token+endpoint the refetch route needs)',
    Array.isArray(keys) && keys.includes('st') && keys.includes('tk') && keys.includes('ep'), JSON.stringify(keys));
  const r2 = await req('GET', 'auth/truecaller/result', null, null, { nonce: N2 });
  ok('result for that nonce still reports failed:true (v148 UX intact)',
    r2.json && r2.json.verified === false && r2.json.failed === true, JSON.stringify(r2.json));

  console.log('\n· 3 — a number riding in the callback BODY rescues the flow end to end');
  const N3 = 'shvq149body0002';
  const cb3 = await req('POST', 'auth/truecaller/callback', { requestId: N3, accessToken: 'tok-xyz', endpoint: 'https://profile4-noneu.truecaller.com/v1/default', phoneNumber: '+91 98765 43210' });
  const r3 = await req('GET', 'auth/truecaller/result', null, null, { nonce: N3 });
  ok('fetch was dead (no curl in the sandbox) but the BODY number stored a VERIFIED entry',
    cb3.http === 200 && r3.json && r3.json.verified === true && r3.json.phone === '9876543210', JSON.stringify(r3.json));

  console.log('\n· 4 — the refetch route: guards, throttle, already-ok fast path');
  const rfUnknown = await req('GET', 'auth/truecaller/refetch', null, null, { nonce: 'shvq149nosuch01' });
  ok('unknown nonce → {verified:false, retry:false} (the page must ask for a fresh tap, nothing fetched)',
    rfUnknown.http === 200 && rfUnknown.json && rfUnknown.json.verified === false && rfUnknown.json.retry === false, JSON.stringify(rfUnknown.json));
  const rf1 = await req('GET', 'auth/truecaller/refetch', null, null, { nonce: N2 });
  ok('failed-with-material → attempt runs, still fails here (no curl), stays failed for the page',
    rf1.http === 200 && rf1.json && rf1.json.verified === false && rf1.json.failed === true, JSON.stringify(rf1.json));
  const rf2 = await req('GET', 'auth/truecaller/refetch', null, null, { nonce: N2 });
  ok('12-second throttle: the second attempt is REFUSED with throttled:true',
    rf2.json && rf2.json.throttled === true, JSON.stringify(rf2.json));
  const cfg4 = await req('GET', 'auth/truecaller/config');
  ok('doctor trail records the refetch attempt (lastKind=refetch) — still no tokens, no phones in config',
    cfg4.json && cfg4.json.lastKind === 'refetch' && !/tok-abc/.test(JSON.stringify(cfg4.json)), JSON.stringify(cfg4.json).slice(0, 200));
  const VNONCE = 'shvq149seed0003';
  await php.run({ code: `<?php $dir='/tcrun/data/tc-verify'; if(!is_dir($dir)) mkdir($dir,0755,true);
     file_put_contents($dir.'/'.sha1('${VNONCE}').'.json', json_encode(['st'=>'ok','phone'=>'9912345678','name'=>'QA Buyer','at'=>time()])); echo "seeded";` });
  const rf3 = await req('GET', 'auth/truecaller/refetch', null, null, { nonce: VNONCE });
  ok('an already-ok nonce answered by refetch IMMEDIATELY (a second page/race needs no upstream)',
    rf3.json && rf3.json.verified === true && rf3.json.phone === '9912345678' && rf3.json.retry === true, JSON.stringify(rf3.json));

  console.log('\n· the ONE TAP invariant regression — a verified number (however it got stored) is THE order phone');
  const prod = (db.products || [])[0];
  const ord1 = await req('POST', 'orders', {
    items: [{ id: prod.id, qty: 1 }],
    address: { name: 'Valued Customer', phone: '9876500000', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India' },
    paymentMethod: 'Online',
    tcNonce: VNONCE,
  });
  ok('guest order places AND the server overrides the typed phone with the verified one',
    ord1.http === 200 && ord1.json && ord1.json.address && ord1.json.address.phone === '9912345678' && ord1.json.truecaller === 'verified' && ord1.json.guest === true,
    `http=${ord1.http} fatal=${ord1.fatal}`);

  const cfgEnd = await req('GET', 'pay/config');
  ok('site still serves pay/config after the whole run (API alive, DB valid)',
    cfgEnd.http === 200 && cfgEnd.json && cfgEnd.json.mode === 'demo', cfgEnd.fatal);

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v149 PHP-RUN cases passed  ${n === results.length ? '✦ — the deep reader and the second-look route were EXECUTED' : ''}`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('harness error:', e); process.exit(1); });
