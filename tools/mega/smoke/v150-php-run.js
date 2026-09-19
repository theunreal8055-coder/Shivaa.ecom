/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v150 PHP RUN — the endpoint normaliser, the privacy snippet and the
   two consent failure shapes EXECUTED on a real interpreter.
   Why this exists: the live doctor proved the fetch answers 200+JSON with no
   digits in it — the signature of a bare HOST where /v1/default belongs. v148
   ACCEPTED such endpoints but fetched them as-is; v150 fixes the shape first.
   Because the curl guard moved BELOW the policy, the sandbox can now execute
   the WHOLE norm→allowlist path end to end (lookalikes still refused), plus
   the pure functions via surgical eval from the shipped bytes.
   Run: node tools/mega/smoke/v150-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v150-php-run.js   (zip overlay)
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
  console.log('SKIP  @php-wasm/node not installed — static v150-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 1 } }));
  const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
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

  console.log('\n· 1 — tc_norm_endpoint EXECUTED on the strings the wild ships');
  const ne = await php.run({ code: `<?php
$src = file_get_contents('/tcrun/api.php');
preg_match('/function tc_norm_endpoint.*?\\n\\}/s', $src, $m);
if (!$m) { echo json_encode([['label' => 'isolate', 'wantOk' => false]]); return; }
eval($m[0]);
$cases = [
  ['https://profile4-noneu.truecaller.com', 'https://profile4-noneu.truecaller.com/v1/default'],
  ['https://profile4-noneu.truecaller.com/', 'https://profile4-noneu.truecaller.com/v1/default'],
  ['https://profile4-noneu.truecaller.com/v1/default', 'https://profile4-noneu.truecaller.com/v1/default'],
  ['https://profile4-noneu.truecaller.com/v1/default?fields=name,phones', 'https://profile4-noneu.truecaller.com/v1/default?fields=name,phones'],
  ['https://truecaller.com/', 'https://truecaller.com/v1/default'],
  ['https://profile4-noneu.truecaller.com/v1/default#frag', 'https://profile4-noneu.truecaller.com/v1/default'],
  ['not a url', 'not a url'],
];
$out = [];
foreach ($cases as [$in, $want]) $out[] = ['got' => tc_norm_endpoint($in), 'want' => $want, 'wantOk' => tc_norm_endpoint($in) === $want];
echo json_encode($out);` });
  const neRows = JSON.parse(Buffer.from(ne.bytes).toString());
  ok('bare host AND root path gain /v1/default; real paths and queries are UNTOUCHED; junk passes through for the allowlist to refuse',
    Array.isArray(neRows) && neRows.length === 7 && neRows.every(r => r.wantOk),
    JSON.stringify(neRows).slice(0, 300));

  console.log('\n· 2 — tc_snip: structure survives, digits and tokens never do');
  const sn = await php.run({ code: `<?php
$src = file_get_contents('/tcrun/api.php');
preg_match('/function tc_snip.*?\\n\\}/s', $src, $m);
if (!$m) { echo json_encode(['wantOk' => false]); return; }
eval($m[0]);
$body = '<html><body>{"firstName":"Ravi","lastName":"K","phones":[{"e164Format":"+919876543210","type":"MOBILE"}],"image":"https://c.truecaller.com/x/1a2b3c4d5e6f7g8h9i.png"}</body></html>';
$s = tc_snip($body);
echo json_encode(['snip' => $s, 'noDigits' => !preg_match('/\\d/', $s), 'keepsShape' => strpos($s, 'Format') !== false && strpos($s, 'MOBILE') !== false && strpos($s, 'firstName') !== false, 'tokenGone' => strpos($s, '1a2b3c4d5e6f7g8h9i') === false]);` });
  const snr = JSON.parse(Buffer.from(sn.bytes).toString());
  ok('the snippet keeps keys/structure but holds NO digits and no long opaque blob (privacy by construction)',
    snr && snr.noDigits === true && snr.keepsShape === true && snr.tokenGone === true,
    JSON.stringify(snr).slice(0, 300));

  console.log('\n· 3 — JSON riding inside a STRING is walked too (the last known shape hole)');
  const ji = await php.run({ code: `<?php
$src = file_get_contents('/tcrun/api.php');
preg_match('/function tc_norm_phone.*?\\n\\}/s', $src, $m1);
preg_match('/function tc_profile_extract.*?\\n\\}/s', $src, $m2);
if (!$m1 || !$m2) { echo json_encode(['wantOk' => false, 'why' => 'isolate']); return; }
eval($m1[0]); eval($m2[0]);
$p = ['status' => 'OK', 'payload' => '{"name":"Ravi K","phones":[{"e164Format":"+919876543210","type":"MOBILE"}]}'];
[$ph, $nm] = tc_profile_extract($p);
echo json_encode(['phone' => $ph, 'name' => $nm, 'wantOk' => $ph === '9876543210']);` });
  const jir = JSON.parse(Buffer.from(ji.bytes).toString());
  ok('{"payload":"{…escaped profile…}"} yields the number', jir && jir.wantOk === true, JSON.stringify(jir));

  console.log('\n· 4 — ROUTE level: the bare-host consent now REACHES the fetch (proves norm→allowlist executes)');
  const N1 = 'shvq150bare00001';
  const cb1 = await req('POST', 'auth/truecaller/callback', { requestId: N1, accessToken: 'tok', endpoint: 'https://profile4-noneu.truecaller.com' });
  const c1 = await req('GET', 'auth/truecaller/config');
  ok('bare host endpoint: NOT refused as "host not allowed" anymore — the run reached the (sandbox-absent) curl',
    cb1.http === 200 && /curl missing|certificate|Could not resolve|Failed to connect|timed out/i.test(String(c1.json.lastError || '')) && !/host not allowed/.test(String(c1.json.lastError || '')),
    JSON.stringify(c1.json).slice(0, 300));
  ok('the doctor NOW SHOWS the exact URL the server fetched (lastEp, normalised) + the body snippet slot',
    /profile4-noneu\.truecaller\.com\/v1\/default/.test(String(c1.json.lastEp || '')),
    JSON.stringify({ lastEp: c1.json.lastEp }));

  console.log('\n· 5 — refetch keeps the consent evidence ALIVE beside its own line');
  const rf = await req('GET', 'auth/truecaller/refetch', null, null, { nonce: N1 });
  const c3 = await req('GET', 'auth/truecaller/config');
  ok('refetch ran (fails here without curl — correct) and reported on ITS line',
    rf.json && rf.json.verified === false && /curl missing|certificate|Could not resolve|Failed to connect|timed out/i.test(String(c3.json.lastRefetchError || '')),
    JSON.stringify({ rf: rf.json, re: c3.json.lastRefetchError }).slice(0, 240));
  ok('…while the CONSENT diagnosis (lastError, with its snippet tail) is NOT overwritten by the refetch (the v149 flaw)',
    String(c3.json.lastError || '').indexOf('refetch') === -1 && String(c3.json.lastError || '') !== '' && /curl missing|certificate|Could not resolve|Failed to connect|timed out|keys:/i.test(String(c3.json.lastError || '')),
    String(c3.json.lastError || ''));
  ok('no phone, no token, no raw body anywhere in the public config — even in the new fields',
    JSON.stringify(c3.json).indexOf('tok') === -1 && /[6-9]\d{9}/.test(JSON.stringify(c3.json)) === false);

  const N2 = 'shvq150evil000002';
  await req('POST', 'auth/truecaller/callback', { requestId: N2, accessToken: 'tok', endpoint: 'https://truecaller.com.evil.test/v1/default' });
  const c2 = await req('GET', 'auth/truecaller/config');
  ok('look-alike host STILL refused by policy (the fix does not loosen SSRF rules)',
    /host not allowed/.test(String(c2.json.lastError || '')), String(c2.json.lastError || ''));

  console.log('\n· 6 — the whole old contract still holds');
  const VNONCE = 'shvq150seed0003';
  await php.run({ code: `<?php $dir='/tcrun/data/tc-verify'; if(!is_dir($dir)) mkdir($dir,0755,true);
     file_put_contents($dir.'/'.sha1('${VNONCE}').'.json', json_encode(['st'=>'ok','phone'=>'9912345678','name'=>'QA Buyer','at'=>time()])); echo "seeded";` });
  const ord1 = await req('POST', 'orders', {
    items: [{ id: (db.products || [])[0] && (db.products[0]).id, qty: 1 }],
    address: { name: 'Valued Customer', phone: '9876500000', line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India' },
    paymentMethod: 'Online', tcNonce: VNONCE,
  });
  ok('a verified number still overrides the typed one on the order (the invariant)',
    ord1.http === 200 && ord1.json && ord1.json.address && ord1.json.address.phone === '9912345678', `http=${ord1.http} fatal=${ord1.fatal}`);
  const cfgEnd = await req('GET', 'pay/config');
  ok('API alive, DB valid after the run', cfgEnd.http === 200 && cfgEnd.json && cfgEnd.json.mode === 'demo', cfgEnd.fatal);

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v150 PHP-RUN cases passed  ${n === results.length ? '✦ — shape, policy and privacy EXECUTED, not inferred' : ''}`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('harness error:', e); process.exit(1); });
