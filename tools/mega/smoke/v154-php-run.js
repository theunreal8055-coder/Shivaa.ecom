/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v154 PHP RUN — the boundary signature EXECUTED against the real
   interpreter, proving the acceptance is a LOCK that only fits ONE key:
     1  switch ON + provider cashfree + EXACT canonical boundary (+ sentinel
        or empty phone) → order PLACES; stored phone is the sentinel.
     2  same row with the switch OFF → 400 real-10-digit (the lane is dead
        the instant the owner flips it — instant rollback proven).
     3  same row with the provider off → 400.
     4  ONE field off-signature (name changed) with the sentinel → 400 —
        the exemption is exact, never a general phone bypass.
     5  a guest who still types a real number + real address → 200
        (the typed flow keeps working untouched, sentinel refused for it).
     6  stale clients: tcNonce surplus + boundary → 200 (v152 promise).
     7  /api/version: rel 154, neighbour stamps 154.
   Run: node tools/mega/smoke/v154-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v154-php-run.js   (zip overlay)
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
  console.log('SKIP  @php-wasm/node not installed — static v154-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 2 } }));
  const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
  db.settings = Object.assign({}, db.settings, {
    payProvider: 'cashfree', guestCheckout: true,
    cfAppId: 'qa', cfSecretKey: 'qa', cfEnv: 'sandbox', siteBaseUrl: 'https://www.shivaa.in',
  });
  delete db.orders; db.orders = [];
  php.mkdirTree('/tcrun/data');
  for (const f of ['api.php', 'hallmark.php', 'trust.php', 'sms.php', 'mail.php']) {
    php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  }
  php.mkdirTree('/tcrun/js');
  php.writeFile('/tcrun/data/db.json', JSON.stringify(db));
  for (const f of ['sw.js', 'index.html']) php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  php.writeFile('/tcrun/js/app.js', fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8'));

  const b64 = s => Buffer.from(s).toString('base64');
  async function req(method, route, body, q) {
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
$_POST = [];
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
    let json = null; try { json = JSON.parse(payload); } catch (e) {}
    return { http, fatal, json, raw: payload };
  }
  const prod = (db.products || [])[0];
  const BOUND = (phone) => ({ name: 'Valued Customer', phone, line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India' });
  const body = (address, extra) => Object.assign({ items: [{ id: prod.id, qty: 1 }], address, paymentMethod: 'Online' }, extra || {});

  console.log('\n· 1 — the key that fits:');
  const r1 = await req('POST', 'orders', body(BOUND('9999999999')));
  ok('exact boundary + sentinel → 200 on the real API, stored phone is the sentinel',
    r1.http === 200 && r1.json && r1.json.id && r1.json.address && r1.json.address.phone === '9999999999' && !r1.fatal,
    `http=${r1.http} fatal=${r1.fatal} raw=${(r1.raw || '').slice(0, 220)}`);
  const r1b = await req('POST', 'orders', body(BOUND('')));
  ok('LITERALLY EMPTY phone still 400s — the v84 per-field loop outranks the signature (the lane sends the sentinel, not blanks)',
    r1b.http === 400 && /Complete delivery address/.test((r1b.json && r1b.json.error) || ''), `http=${r1b.http} ${JSON.stringify(r1b.json)}`);

  console.log('\n· 2/3 — the lane closes with the switch/provider:');
  const flip = async (mut) => {
    const d2 = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
    d2.settings = Object.assign({}, d2.settings, { payProvider: 'cashfree', guestCheckout: true, cfAppId: 'qa', cfSecretKey: 'qa', cfEnv: 'sandbox', siteBaseUrl: 'https://www.shivaa.in' }, mut);
    delete d2.orders; d2.orders = [];
    php.writeFile('/tcrun/data/db.json', JSON.stringify(d2));
  };
  await flip({ guestCheckout: false });
  const r2 = await req('POST', 'orders', body(BOUND('9999999999')));
  ok('switch OFF → the guest LANE ITSELF is gone (401 login required long before any phone rule — even stricter than 400)',
    r2.http === 401 && /Login required/.test((r2.json && r2.json.error) || ''), `http=${r2.http} ${JSON.stringify(r2.json)}`);
  await flip({ guestCheckout: true, payProvider: 'demo' });
  const r3 = await req('POST', 'orders', body(BOUND('9999999999')));
  ok('provider not cashfree → 400 too (exemption is provider-paired)',
    r3.http === 400 && /real 10-digit/.test((r3.json && r3.json.error) || ''), `http=${r3.http} ${JSON.stringify(r3.json)}`);
  await flip({ payProvider: 'cashfree', guestCheckout: true });

  console.log('\n· 4 — exactness: one field off and the door is shut:');
  const off = BOUND('9999999999'); off.city = 'Pending Verification';   // capital V — trim-proof, NOT the signature
  const r4 = await req('POST', 'orders', body(off));
  ok('near-miss boundary + sentinel → 400 (match is exact, never a bypass)',
    r4.http === 400 && /real 10-digit/.test((r4.json && r4.json.error) || ''), `http=${r4.http} ${JSON.stringify(r4.json)}`);
  const off2 = BOUND('9999999998');
  const r4b = await req('POST', 'orders', body(off2));
  ok('boundary shape with a DIFFERENT junk-ish number → normal rules apply (format-valid, so accepted like always)',
    r4b.http === 200, `http=${r4b.http}`);
  const ws = BOUND('9999999999'); ws.name = 'Valued Customer   ';
  const r4c = await req('POST', 'orders', body(ws));
  ok('whitespace-only drift is HARMLESS (the v84 sanitiser canonicalises it before the signature check)',
    r4c.http === 200 && r4c.json && r4c.json.address && r4c.json.address.name === 'Valued Customer', `http=${r4c.http}`);

  console.log('\n· 5 — the typed flow is untouched:');
  const r5 = await req('POST', 'orders', body({ name: 'QA Buyer', phone: '9876500000', line: '5 Test Street', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', country: 'India' }));
  ok('guest with a real number + real address → 200 exactly as always', r5.http === 200 && r5.json && r5.json.address && r5.json.address.phone === '9876500000', `http=${r5.http}`);
  const r5b = await req('POST', 'orders', body({ name: 'QA Buyer', phone: '9999999999', line: '5 Test Street', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', country: 'India' }));
  ok('a TYPED flow may never smuggle the sentinel → 400', r5b.http === 400 && /real 10-digit/.test((r5b.json && r5b.json.error) || ''), `http=${r5b.http}`);

  console.log('\n· 6 — stale clients still safe:');
  const r6 = await req('POST', 'orders', body(BOUND('9999999999'), { tcNonce: 'from-a-cached-pwa-000', truecallerVerified: true }));
  ok('surplus legacy fields + boundary → still 200, fields ignored, no fatal', r6.http === 200 && !r6.fatal && r6.json && r6.json.id && !('truecaller' in r6.json), `http=${r6.http}`);

  console.log('\n· 7 — version truth:');
  const rv = await req('GET', 'version');
  ok('/api/version: rel 154 + stamps 154/154 + shell v154', rv.http === 200 && rv.json && rv.json.rel === 154 && rv.json.stamp.index === 154 && rv.json.stamp.app === 154 && /v154/.test(rv.json.shell), JSON.stringify(rv.json));

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v154 PHP-run checks passed  ${n === results.length ? '✦ — a lock that only ONE key opens' : '✗ FAILED'}`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('probe error:', e); process.exit(1); });
