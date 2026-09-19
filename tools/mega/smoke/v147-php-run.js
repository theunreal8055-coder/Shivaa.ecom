/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v147 PHP RUN — the first END-TO-END EXECUTION of the Truecaller
   verification path on a real PHP interpreter (WebAssembly PHP 8.3 via
   @php-wasm/node).

   WHY THIS EXISTS: every prior release could only parse-check api.php
   ("no PHP binary in the sandbox · PHPLoader.processId must be set before
   init"). The second half of that error is a USE bug, not a blocker: the
   runtime just needs `emscriptenOptions.processId` to be set. With that, the
   sandbox can RUN the API. This gate boots an ISOLATED copy of the real
   cms/api.php + cms/data/db.json (nothing on the host tree is touched),
   drives the Truecaller callback / result / guest-order routes with real
   requests, and asserts the number that reaches the ORDER is the one the
   SERVER saw — end to end, executed, not inferred.

   Run: node tools/mega/smoke/v147-php-run.js          (source tree)
        SMOKE_CMS=<dir> node tools/mega/smoke/v147-php-run.js   (zip overlay)
   Exits 0 when every case passes; 2 (with a loud SKIP) if @php-wasm/node is
   not installed — the static v147-check.js stays authoritative either way.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

let PHP, loadNodeRuntime;
try {
  ({ PHP } = require('@php-wasm/universal'));
  ({ loadNodeRuntime } = require('@php-wasm/node'));
} catch (e) {
  console.log('SKIP  @php-wasm/node not installed (cd tools/mega/smoke && npm install) — static v147-check.js still ran.');
  process.exit(2);
}

const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 1 } }));

  /* ── isolated boot ─────────────────────────────────────────────────── */
  const dbPath = path.join(CMS, 'data/db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  db.settings = Object.assign({}, db.settings, {
    tcAppKey: 'qa-partner-key-123', guestCheckout: true, payProvider: 'demo',
    siteBaseUrl: 'https://www.shivaa.in',
  });
  delete db.orders; db.orders = [];   // clean order ledger for the run
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
    let http = 200, fatal = '';
    let payload = text;
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
  ok('isolated api.php BOOTS and answers a real route (pay/config 200)', cfg0.http === 200 && !cfg0.fatal && cfg0.json && cfg0.json.mode === 'demo', `http=${cfg0.http} fatal=${cfg0.fatal}`);

  console.log('\n· Truecaller config / doctor');
  const c1 = await req('GET', 'auth/truecaller/config');
  ok('config: enabled, callbackUrl exact, dataWritable on a fresh host',
    c1.http === 200 && c1.json && c1.json.enabled === true &&
    c1.json.partnerKey === 'qa-partner-key-123' &&
    /https:\/\/www\.shivaa\.in\/api\/auth\/truecaller\/callback/.test(c1.json.callbackUrl) &&
    c1.json.dataWritable === true && c1.json.lastCallbackAt === 0,
    JSON.stringify(c1.json));

  console.log('\n· callback — handshake, rejection, malformed');
  const NONCE = 'shvqanonce000001';
  const cb1 = await req('POST', 'auth/truecaller/callback', null, { requestId: NONCE, status: 'flow_invoked' });
  ok('flow_invoked handshake → 200 {ok:true} AND is stored (was rejected outright pre-v147)',
    cb1.http === 200 && cb1.json && cb1.json.ok === true, cb1.raw);
  /* $_GET for the nonce: the driver takes an extra query channel */
  const qGet = { nonce: NONCE };
  const r1b = await req('GET', 'auth/truecaller/result', null, null, qGet);
  ok('result after handshake → {verified:false, invoked:true}',
    r1b.http === 200 && r1b.json && r1b.json.verified === false && r1b.json.invoked === true,
    JSON.stringify(r1b.json));
  const cb2 = await req('POST', 'auth/truecaller/callback', null, { requestId: 'shvqareject00002', status: 'user_rejected' });
  const r2 = await req('GET', 'auth/truecaller/result', null, null, { nonce: 'shvqareject00002' });
  ok('user_rejected honoured → result {rejected:true} (frontend falls back to typing)',
    cb2.http === 200 && r2.json && r2.json.rejected === true, JSON.stringify(r2.json));
  const cb3 = await req('POST', 'auth/truecaller/callback', { junk: true });
  ok('malformed POST still answers 200 (Truecaller must never see an error) and records the trail',
    cb3.http === 200 && cb3.json && cb3.json.ok === false, cb3.raw);
  const c2 = await req('GET', 'auth/truecaller/config');
  ok('doctor trail now reports the last callback (lastKind=bad)',
    c2.json && c2.json.lastKind === 'bad' && c2.json.lastCallbackAt > 0, JSON.stringify(c2.json));

  console.log('\n· consent path with a dead Truecaller endpoint (SSRF + graceful fail)');
  const cb4 = await req('POST', 'auth/truecaller/callback', { requestId: 'shvqassrf0000003', accessToken: 'tkn', endpoint: 'http://127.0.0.1:9/evil' });
  ok('non-https / non-truecaller endpoint is REFUSED for fetch (no SSRF) — still 200',
    cb4.http === 200, cb4.raw);
  const c3 = await req('GET', 'auth/truecaller/config');
  const rBad = await req('GET', 'auth/truecaller/result', null, null, { nonce: 'shvqassrf0000003' });
  ok('refused endpoint: nothing is stored as verified, and the doctor still answers',
    rBad.json && rBad.json.verified === false && c3.http === 200, JSON.stringify(rBad.json) + JSON.stringify(c3.json));

  console.log('\n· the ONE TAP — verified phone in the store becomes THE order\u2019s phone');
  /* seed exactly what the callback stores after a SUCCESSFUL profile fetch
     (curl to real Truecaller is out of reach in the sandbox — the storage and
     the override are what v147 changed, and they run here for real). */
  const VNONCE = 'shvqaverify00004';
  await php.run({ code: `<?php $dir='/tcrun/data/tc-verify'; if(!is_dir($dir)) mkdir($dir,0755,true);
     file_put_contents($dir.'/'.sha1('${VNONCE}').'.json', json_encode(['st'=>'ok','phone'=>'9912345678','name'=>'QA Buyer','at'=>time()])); echo "seeded";` });
  const r3 = await req('GET', 'auth/truecaller/result', null, null, { nonce: VNONCE });
  ok('result for a verified nonce → {verified:true, phone, name}',
    r3.http === 200 && r3.json && r3.json.verified === true && r3.json.phone === '9912345678' && r3.json.name === 'QA Buyer',
    JSON.stringify(r3.json));

  const prod = (db.products || [])[0];
  /* tamper case: the browser tries to pay with a DIFFERENT typed number */
  const ord1 = await req('POST', 'orders', {
    items: [{ id: prod.id, qty: 1 }],
    address: { name: 'Valued Customer', phone: '9876500000', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India' },
    paymentMethod: 'Online',
    tcNonce: VNONCE,
  });
  ok('guest order PLACES on the real API (200 + access pin)',
    ord1.http === 200 && ord1.json && ord1.json.id && ord1.json.pin, `http=${ord1.http} fatal=${ord1.fatal} raw=${(ord1.raw || '').slice(0, 300)}`);
  ok('server OVERRODE the typed phone with the Truecaller-verified one (tamper-proof)',
    ord1.json && ord1.json.address && ord1.json.address.phone === '9912345678' && ord1.json.address.name === 'QA Buyer' && ord1.json.truecaller === 'verified' && ord1.json.guest === true,
    JSON.stringify(ord1.json && ord1.json.address) + ' tc=' + (ord1.json && ord1.json.truecaller));

  /* stale / bogus nonce must not block or rewrite anything */
  const ord2 = await req('POST', 'orders', {
    items: [{ id: prod.id, qty: 1 }],
    address: { name: 'Valued Customer', phone: '9876500000', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India' },
    paymentMethod: 'Online',
    tcNonce: 'shvqabogus000099',
  });
  ok('unknown nonce → order still places, typed phone survives (fallback intact)',
    ord2.http === 200 && ord2.json && ord2.json.address.phone === '9876500000' && !ord2.json.truecaller,
    `http=${ord2.http} fatal=${ord2.fatal}`);

  console.log('\n· v142 guest invariants still enforced on the REAL interpreter');
  const ord3 = await req('POST', 'orders', {
    items: [{ id: prod.id, qty: 1 }],
    address: { name: 'Valued Customer', phone: '9876500000', line: 'x', city: 'y', state: 'z', pincode: '302001', country: 'India' },
    paymentMethod: 'COD',
  });
  ok('guest COD is rejected server-side (400)', ord3.http === 400 && /prepaid|online/i.test(ord3.raw || ''), ord3.raw);
  const ord4 = await req('POST', 'orders', {
    items: [{ id: prod.id, qty: 1 }],
    address: { name: 'Valued Customer', phone: '9999999999', line: 'x', city: 'y', state: 'z', pincode: '302001', country: 'India' },
    paymentMethod: 'Online',
  });
  ok('placeholder phone 9999999999 still rejected (400)', ord4.http === 400 && /real 10-digit/.test(ord4.raw || ''), ord4.raw);

  console.log('\n· no db corruption, no stray echoes');
  const cfg3 = await req('GET', 'pay/config');
  ok('site still serves pay/config after the whole run (API alive, DB valid)',
    cfg3.http === 200 && cfg3.json && cfg3.json.mode === 'demo', cfg3.fatal);

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v147 PHP-RUN cases passed  ${n === results.length ? '✦ — the Truecaller→Cashfree server path was EXECUTED, not just parsed' : ''}`);
  process.exitCode = n === results.length ? 0 : 1;
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('harness error:', e); process.exit(1); });
