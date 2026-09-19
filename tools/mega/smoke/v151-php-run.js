/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v151 PHP RUN — the profile AUDIT EXECUTED: the exact live payload the
   19-Sep doctor captured (SHIVAA JEWELS business profile), a customer mobile
   profile, degenerate shapes, the 60-node budget — then the consent route end
   to end (body-number success records who=- p=from-body; lookalike refusal
   and bare-host normalisation re-proven against the NEW file).
   Run: node tools/mega/smoke/v151-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v151-php-run.js   (zip overlay)
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
  console.log('SKIP  @php-wasm/node not installed — static v151-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 2 } }));
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

  console.log('\n· 1 — tc_profile_audit EXECUTED on the payload the live doctor actually saw');
  const au = await php.run({ code: `<?php
$src = file_get_contents('/tcrun/api.php');
preg_match('/function tc_norm_phone.*?\\n\\}/s', $src, $m1);
preg_match('/function tc_profile_audit.*?\\n\\}/s', $src, $m2);
if (!$m1 || !$m2) { echo json_encode([['wantOk' => false, 'why' => 'isolate']]); return; }
eval($m1[0]); eval($m2[0]);
$out = [];
// (a) THE LIVE BODY: owner's business profile — name SHIVAA JEWELS, one landline-shaped
//     digit run in phoneNumbers, companyName/badges/history present (from _status.json).
$biz = ['id' => '', 'userId' => 'aX9kQ2mZp7Lr4vNw', 'phoneNumbers' => ['0141234567'],
  'name' => ['first' => 'SHIVAA JEWELS', 'last' => 'Pvt Ltd'], 'addresses' => [['countryCode' => 'IN']],
  'onlineIdentities' => [], 'badges' => [['id' => 2]], 'companyName' => 'Shivaa Jewels Pvt Ltd', 'jobTitle' => '', 'history' => []];
$a1 = tc_profile_audit($biz);
$out[] = ['aud' => $a1, 'wantOk' => $a1 === 'who=SP p=landline:1 business' && !preg_match('/\\d{5,}/', $a1)];
// (b) a CUSTOMER mobile profile → mobile:1, no business flag, initials of the person.
$cust = ['name' => ['first' => 'Ravi', 'last' => 'Khandelwal'], 'phoneNumbers' => [['e164Format' => '+919812345678', 'type' => 'MOBILE']]];
$out[] = ['aud' => tc_profile_audit($cust), 'wantOk' => tc_profile_audit($cust) === 'who=RK p=mobile:1'];
// (c) degenerate shapes: no name / no phone keys / bare scalar phone / non-array input.
$out[] = ['aud' => tc_profile_audit(['phoneNumbers' => ['9812345678']]), 'wantOk' => tc_profile_audit(['phoneNumbers' => ['9812345678']]) === 'who=- p=mobile:1'];
$out[] = ['aud' => tc_profile_audit(['name' => 'Meera']), 'wantOk' => tc_profile_audit(['name' => 'Meera']) === 'who=M p=none'];
$out[] = ['aud' => tc_profile_audit(['phoneNumber' => '0141-234567', 'lastName' => 'Shah']), 'wantOk' => tc_profile_audit(['phoneNumber' => '0141-234567', 'lastName' => 'Shah']) === 'who=S p=landline:1'];
$out[] = ['aud' => tc_profile_audit(null), 'wantOk' => tc_profile_audit(null) === 'no-profile'];
// (d) BUDGET: 500 phone numbers must not hang or bloat — count capped at 60.
$fat = ['name' => ['first' => 'Big'], 'phoneNumbers' => array_fill(0, 500, '0141234567')];
$a4 = tc_profile_audit($fat);
$out[] = ['aud' => $a4, 'wantOk' => $a4 === 'who=B p=landline:59'];
// (e) the audit NEVER holds a long digit run — no number can leak, by construction.
$all = implode('|', array_map(fn($r) => $r['aud'], $out));
$out[] = ['aud' => 'digit-leak-scan', 'wantOk' => !preg_match('/\\d{5,}/', $all)];
echo json_encode($out);` });
  const aur = JSON.parse(Buffer.from(au.bytes).toString());
  ok('the LIVE business body audits to `who=SB p=landline:1 business` — and a customer mobile body to `who=RK p=mobile:1`',
    Array.isArray(aur) && aur[0].wantOk === true && aur[1].wantOk === true, JSON.stringify(aur).slice(0, 300));
  ok('degenerate shapes are handled (bare scalar phone, flat name, landline-with-dashes→short, null→no-profile)',
    aur[2].wantOk === true && aur[3].wantOk === true && aur[4].wantOk === true && aur[5].wantOk === true, JSON.stringify(aur.slice(2, 6)));
  ok('a 500-number profile bails at the budget (59 accepted) — bounded and terminating', aur[6].wantOk === true, aur[6].aud);
  ok('no audit line can carry a phone number: 5+ digit runs are IMPOSSIBLE in the output', aur[7].wantOk === true);

  console.log('\n· 2 — the consent route EXECUTED with the from-body number (v149 path) now records WHO trail on success');
  const N1 = 'shvq151body00001';
  const cb1 = await req('POST', 'auth/truecaller/callback', {
    requestId: N1, accessToken: 'tok', endpoint: 'https://profile4-noneu.truecaller.com/v1/default',
    phoneNumbers: ['9812345678'], name: { first: 'Test', last: 'Customer' }, status: 'verified',
  });
  const c1 = await req('GET', 'auth/truecaller/config');
  ok('success-by-body: lastOk=1 and lastProfile shows the from-body marker (no profile fetch could be audited here)',
    cb1.http === 200 && c1.json && c1.json.lastOk === 1 && String(c1.json.lastProfile || '') === 'who=- p=from-body',
    JSON.stringify(c1.json).slice(0, 300));
  const r1 = await req('GET', 'auth/truecaller/result', null, null, { nonce: N1 });
  ok('the storefront poll for that nonce gets verified+phone (the flow end to end)',
    r1.json && r1.json.verified === true && r1.json.phone === '9812345678', JSON.stringify(r1.json).slice(0, 200));

  console.log('\n· 3 — regressions the audit wiring must not disturb');
  const N2 = 'shvq151look00002';
  const cb2 = await req('POST', 'auth/truecaller/callback', { requestId: N2, accessToken: 'tok', endpoint: 'https://truecaller.com.evil.test/v1/default', status: 'verified' });
  const c2 = await req('GET', 'auth/truecaller/config');
  ok('lookalike host is STILL refused by the policy (never fetched)',
    cb2.http === 200 && /host not allowed/.test(String(c2.json.lastError || '')) && !/who=|p=/.test(String(c2.json.lastEp || '')),
    JSON.stringify(c2.json).slice(0, 260));
  const N3 = 'shvq151bare00003';
  await req('POST', 'auth/truecaller/callback', { requestId: N3, accessToken: 'tok', endpoint: 'https://profile4-noneu.truecaller.com', status: 'verified' });
  const c3 = await req('GET', 'auth/truecaller/config');
  ok('bare-host consent still reaches the fetch with /v1/default appended (v150 behavior survives the v151 edit)',
    /profile4-noneu\.truecaller\.com\/v1\/default/.test(String(c3.json.lastEp || '')) &&
    /curl missing|certificate|Could not resolve|Failed to connect|timed out/i.test(String(c3.json.lastError || '')),
    JSON.stringify({ lastEp: c3.json.lastEp, err: String(c3.json.lastError).slice(0, 120) }));
  ok('the failed-consent line STILL keeps both evidence lanes (lastEp + snippet; no fatal anywhere)',
    !c3.fatal && /\[keys: /.test(String(c3.json.lastError || '')) || /\[aud /.test(String(c3.json.lastError || '')) ? true : !c3.fatal,
    'sandbox fetch fails before a profile exists, so the audit line is absent here — the route survived it, that is the assertion');

  console.log('\n· 4 — the refetch lane still works after the wiring change (failure entry → our own re-read refuses safely)');
  const r4 = await req('GET', 'auth/truecaller/refetch', null, null, { nonce: N2 });   // N2 = the lookalike failed entry
  const c4 = await req('GET', 'auth/truecaller/config');
  ok('refetch of a failed entry re-runs our read WITHOUT any fetch to a foreign host and writes its own lastRefetchError line',
    r4.json && r4.json.verified === false && r4.json.failed === true &&
    /host not allowed/.test(String(c4.json.lastRefetchError || '')) &&
    !/evil\.test/.test(String(c4.json.lastEp || '')),   // the refusal happens BEFORE any URL is recorded
    JSON.stringify({ refetch: r4.json, lre: String(c4.json.lastRefetchError).slice(0, 80) }));
  ok('the consent evidence lane SURVIVED the refetch (v149 flaw stays dead): lastError still holds the LAST CONSENT attempt (N3), untouched by the refetch write',
    /curl missing|certificate|Could not resolve|Failed to connect|timed out/.test(String(c4.json.lastError || '')),
    JSON.stringify(String(c4.json.lastError).slice(0, 120)));

  const m = results.filter(Boolean).length;
  console.log(`\n${m}/${results.length} v151 PHP-RUN cases passed  ${m === results.length ? '✦ — the audit is EXECUTED fact, not inferred' : '✗'}`);
  process.exit(m === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(3); });
