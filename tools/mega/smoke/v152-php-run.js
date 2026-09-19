/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v152 PHP RUN — the removal EXECUTED against the real interpreter:
     1  a stale cached PWA that still sends tcNonce → order PLACES anyway,
        on the phone THE BROWSER SENT (no server override exists any more),
        and no 'truecaller' tag rides the order. Ignored, never 500.
     2  the v84 physical-goods gate is UNTOUCHED: no address → 400.
     3  the v143 Cashfree phone rule is UNTOUCHED: guest junk number → 400.
     4  every old vendor route answers 'Unknown API' 404 — callback, result,
        refetch, config. The endpoints are dead, not dormant.
     5  /api/version: rel 152, shell + neighbour stamps all 152, and the
        response has NO 'tc' key any more.
   Run: node tools/mega/smoke/v152-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v152-php-run.js   (zip overlay)
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
  console.log('SKIP  @php-wasm/node not installed — static v152-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 2 } }));
  const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
  db.settings = Object.assign({}, db.settings, {
    tcAppKey: 'qa-stale-key-left-in-db', guestCheckout: true, payProvider: 'demo',
    siteBaseUrl: 'https://www.shivaa.in',
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
  ok('fixture has a product', !!prod, String((db.products || []).length));
  const addr = (phone) => ({ name: 'Valued Customer', phone, line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India' });

  console.log('\n· 1 — stale client with a dead nonce:');
  const r1 = await req('POST', 'orders', {
    items: [{ id: prod.id, qty: 1 }],
    address: addr('9876500000'),
    paymentMethod: 'Online',
    tcNonce: 'DEAD-nonce-from-a-cached-pwa-000000',
    truecallerVerified: true,
  });
  ok('order PLACES 200 — surplus fields ignored, no fatal, no override',
    r1.http === 200 && r1.json && r1.json.id && !r1.fatal, `http=${r1.http} fatal=${r1.fatal} raw=${(r1.raw || '').slice(0, 240)}`);
  ok('the stored phone is EXACTLY what the browser sent (server override machinery is gone)',
    r1.json && r1.json.address && r1.json.address.phone === '9876500000' && !('truecaller' in r1.json),
    JSON.stringify(r1.json && r1.json.address));

  console.log('\n· 2/3 — the surviving gates:');
  const r2 = await req('POST', 'orders', { items: [{ id: prod.id, qty: 1 }], paymentMethod: 'Online' });
  ok('v84: no address at all → 400 Complete delivery address required', r2.http === 400 && /Complete delivery address/.test(r2.json?.error || ''), JSON.stringify(r2.json));
  const r3 = await req('POST', 'orders', { items: [{ id: prod.id, qty: 1 }], address: addr('9999999999'), paymentMethod: 'Online' });
  ok('v143: guest junk number → 400 real 10-digit (Cashfree needs it)', r3.http === 400 && /real 10-digit/.test(r3.json?.error || ''), JSON.stringify(r3.json));

  console.log('\n· 4 — vendor routes are DEAD:');
  for (const [m, rt] of [['POST', 'auth/truecaller/callback'], ['GET', 'auth/truecaller/result'], ['POST', 'auth/truecaller/refetch'], ['GET', 'auth/truecaller/config']]) {
    const r = await req(m, rt, m === 'POST' ? { nonce: 'x', state: 'y' } : undefined);
    ok(`${m} /api/${rt} → 404 Unknown API`, r.http === 404 && /Unknown API/.test(r.json?.error || ''), `http=${r.http} ${JSON.stringify(r.json)}`);
  }

  console.log('\n· 5 — version truth after deletion:');
  const rv = await req('GET', 'version');
  ok('/api/version: rel 152 + neighbour stamps 152 + shell v152 + NO tc key',
    rv.http === 200 && rv.json && rv.json.rel === 152 && /v152/.test(rv.json.shell || '')
    && rv.json.stamp && rv.json.stamp.index === 152 && rv.json.stamp.app === 152
    && !('tc' in rv.json), JSON.stringify(rv.json));

  const okPub = await req('GET', 'settings');
  ok('public /api/settings projection leaks nothing: no tcAppKey even though the DB still holds one',
    okPub.http === 200 && okPub.json && !('tcAppKey' in okPub.json) && !Object.keys(okPub.json).some(k => /appkey/i.test(k)), JSON.stringify(Object.keys(okPub.json || {}).filter(k => /tc|key/i.test(k))));

  const n = results.filter(Boolean).length;
  console.log(`\n${n}/${results.length} v152 PHP-run checks passed  ${n === results.length ? '✦ — the server is genuinely vendor-free' : '✗ FAILED'}`);
  process.exit(n === results.length ? 0 : 1);
})().catch(e => { console.error('probe error:', e); process.exit(1); });
