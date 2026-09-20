const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

let PHP, loadNodeRuntime;
try {
  ({ PHP } = require('@php-wasm/universal'));
  ({ loadNodeRuntime } = require('@php-wasm/node'));
} catch (e) {
  console.log('SKIP  @php-wasm/node not installed — static check still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 3 } }));
  const mkDb = () => {
    const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
    db.settings = db.settings || {};
    db.settings.guestCheckout = true;
    db.settings.payProvider = 'cashfree';
    db.rates = db.rates || {};
    db.rates.last = {
      t: new Date().toISOString(),
      gold24: 15084, gold22: 13828, gold18: 11313, silver: 233.2,
      spotSrc: { gold: 'qa', silver: 'qa', fx: 'qa' }, spotKind: 'live', source: 'spot',
    };
    return db;
  };

  php.mkdirTree('/tcrun/data');
  for (const f of ['api.php', 'hallmark.php', 'trust.php', 'sms.php', 'mail.php']) {
    php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  }
  php.mkdirTree('/tcrun/js');
  php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb()));
  for (const f of ['sw.js', 'index.html']) php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  php.writeFile('/tcrun/js/app.js', fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8'));

  const b64 = s => Buffer.from(s).toString('base64');
  async function req(method, route, body, q, authHeader = null) {
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
${authHeader ? `$_SERVER['HTTP_AUTHORIZATION'] = '${authHeader}';` : ''}
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

  console.log('\n· 1 — CAMPAIGN STUDS CATALOG & PRICING:');
  const p1 = await req('GET', 'products/p_stud_m1');
  ok('p_stud_m1 returns 200 with product details', p1.http === 200 && p1.json && p1.json.product && p1.json.product.id === 'p_stud_m1');
  ok('p_stud_m1 price computed with 22K live rate', p1.json && p1.json.product && p1.json.product.price && p1.json.product.price.total > 30000);

  const p6 = await req('GET', 'products/p_stud_w3');
  ok('p_stud_w3 returns 200 with product details', p6.http === 200 && p6.json && p6.json.product && p6.json.product.id === 'p_stud_w3');

  console.log('\n· 2 — DIRECT ORDER CREATION WITH 22K CAMPAIGN STUDS:');
  const ordPayload = {
    items: [{ id: 'p_stud_m1', qty: 1 }],
    address: {
      name: 'Valued Customer',
      phone: '9999999999',
      line: 'Collected on Cashfree (verified address)',
      city: 'Pending verification',
      state: 'Pending verification',
      pincode: '000000',
      country: 'India'
    },
    paymentMethod: 'Online'
  };
  const ordRes = await req('POST', 'orders', ordPayload);
  ok('Direct buy order created successfully (200)', ordRes.http === 200 && ordRes.json && ordRes.json.id);
  const ordId = ordRes.json.id;
  const pin = ordRes.json.pin;
  ok('Order has valid id and access pin', !!(ordId && pin));
  ok('Order items contain isCampaignStud flag', !!(ordRes.json.items && ordRes.json.items[0].isCampaignStud === true));

  console.log('\n· 3 — GUEST ACCESS TO QUIZ WITH ORDER PIN:');
  // Before marking paid, order is not paid yet:
  const qzBefore = await req('POST', 'finale/entry', {
    route: 'purchase',
    orderId: ordId,
    pin: pin,
    checks: { age18: true, notExcluded: true, notInsider: true },
    answers: [{ id: 'q1', c: 2 }, { id: 'q2', c: 1 }, { id: 'q3', c: 1 }, { id: 'q4', c: 2 }, { id: 'q5', c: 0 }]
  });
  ok('Unpaid order cannot submit quiz before payment (400)', qzBefore.http === 400);

  // Mark order paid in db.json
  const currentDb = JSON.parse(php.readFileAsText('/tcrun/data/db.json'));
  for (let o of currentDb.orders) {
    if (o.id === ordId) {
      o.paymentStatus = 'Paid';
      o.paidAt = new Date().toISOString();
      break;
    }
  }
  php.writeFile('/tcrun/data/db.json', JSON.stringify(currentDb));

  // Now take quiz with guest order & pin:
  const qzAfter = await req('POST', 'finale/entry', {
    route: 'purchase',
    orderId: ordId,
    pin: pin,
    checks: { age18: true, notExcluded: true, notInsider: true },
    answers: [{ id: 'q1', c: 1 }, { id: 'q2', c: 2 }, { id: 'q3', c: 1 }, { id: 'q4', c: 2 }, { id: 'q5', c: 0 }]
  });
  ok('Paid qualifying order submits quiz successfully (200)', qzAfter.http === 200 && qzAfter.json && qzAfter.json.submitted === true);
  ok('Score verified (5 / 5)', qzAfter.json && qzAfter.json.score === 5);
  ok('Certificate entry generated', !!(qzAfter.json && qzAfter.json.entry && qzAfter.json.entry.id));

  console.log('\n· 4 — STRICT SINGLE-ATTEMPT ENFORCEMENT:');
  const qzRetry = await req('POST', 'finale/entry', {
    route: 'purchase',
    orderId: ordId,
    pin: pin,
    checks: { age18: true, notExcluded: true, notInsider: true },
    answers: [{ id: 'q1', c: 1 }, { id: 'q2', c: 2 }, { id: 'q3', c: 1 }, { id: 'q4', c: 2 }, { id: 'q5', c: 0 }]
  });
  ok('Second attempt is strictly blocked (403 or already submitted)', qzRetry.http === 403 || (qzRetry.json && (qzRetry.json.alreadySubmitted === true || qzRetry.json.already === true)));

  const totalPass = results.filter(Boolean).length;
  console.log(`\n${totalPass}/${results.length} campaign flow & Cashfree quiz checks passed ✦`);
  process.exit(totalPass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
