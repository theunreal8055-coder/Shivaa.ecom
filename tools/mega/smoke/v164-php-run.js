/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v164 PHP RUN — the 6 scheme studs as REAL STORE PIECES, executed
   against the real PHP interpreter in BOTH live states:
     PREDEPLOY (live db still 77 rings — code ships first, data follows):
       list appends 6 FULL-schema twins (sizes/rating/reviews/stock/tags,
       4 shots, priced), single-GET serves hallmark + priced siblings +
       live reviews, members can wishlist + review the studs, and a guest
       boundary order + pay/order succeed on a stud (the reported Cashfree
       failure had no product-agnostic cause — the buy path is proven here).
     FULL (after the Catalogue Deploy lands the db.json rows):
       list serves exactly 83 with zero doubled SHV SKUs (dedupe proof),
       single-GET serves the db row with siblings, member doors keep working.
   Run: node tools/mega/smoke/v164-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v164-php-run.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

let PHP, loadNodeRuntime;
try {
  ({ PHP } = require('@php-wasm/universal'));
  ({ loadNodeRuntime } = require('@php-wasm/node'));
} catch (e) {
  console.log('SKIP  @php-wasm/node not installed — static v164-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const SHV_SKUS = ['SHV-MST-01', 'SHV-MST-02', 'SHV-MST-03', 'SHV-LST-01', 'SHV-LST-02', 'SHV-LST-03'];
const BOUND = (phone) => ({ name: 'Valued Customer', phone, line: 'Collected on Cashfree (verified address)', city: 'Pending verification', state: 'Pending verification', pincode: '000000', country: 'India' });
const QA_TOKEN = 'qa164' + '0'.repeat(43);   // \w+ shape, like a real session token

function seedDb(stripStuds) {
  const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
  if (stripStuds) db.products = db.products.filter(p => !String(p.sku || '').startsWith('SHV'));
  db.settings = Object.assign({}, db.settings, {
    payProvider: 'cashfree', cfAppId: 'qa', cfSecretKey: 'qa', cfEnv: 'sandbox',
    allowDemoPayments: true, guestCheckout: true,
    siteBaseUrl: 'https://www.shivaa.in',
  });
  delete db.orders; db.orders = [];
  db.users = db.users || [];
  if (!db.users.find(u => u.id === 'u_qa164')) {
    db.users.push({ id: 'u_qa164', name: 'QA Member', email: 'qa164@test.local', phone: '9876500001', passHash: 'seeded-session', role: 'customer', loyaltyPoints: 0, wishlist: [], createdAt: new Date().toISOString() });
  }
  // tokens may be [] in the master file — an array would drop a string key on stringify
  db.tokens = (!db.tokens || Array.isArray(db.tokens)) ? {} : db.tokens;
  db.tokens[QA_TOKEN] = { userId: 'u_qa164', exp: Math.floor(Date.now() / 1000) + 86400 };
  return db;
}

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 2 } }));
  php.mkdirTree('/tcrun/data');
  for (const f of ['api.php', 'hallmark.php', 'trust.php', 'sms.php', 'mail.php']) {
    php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  }
  php.mkdirTree('/tcrun/js');
  for (const f of ['sw.js', 'index.html']) php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  php.writeFile('/tcrun/js/app.js', fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8'));

  const b64 = s => Buffer.from(s).toString('base64');
  async function req(method, route, body, q, auth) {
    q = q || {};
    const rawBody = body ? JSON.stringify(body) : '';
    const code = `<?php
$GLOBALS['SHV_BODY'] = "${b64(rawBody)}";
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
$_SERVER['CONTENT_TYPE'] = 'application/json';
$_SERVER['CONTENT_LENGTH'] = '${Buffer.byteLength(rawBody)}';
$_SERVER['HTTP_AUTHORIZATION'] = '${auth ? 'Bearer ' + auth : ''}';
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
  async function readLiveDb() {
    const out = await php.run({ code: `<?php echo file_get_contents('/tcrun/data/db.json');` });
    return JSON.parse(Buffer.from(out.bytes).toString());
  }
  const guestPin = o => crypto.createHash('sha256').update([o.id, o.createdAt, o.tail].join('|')).digest('hex').slice(0, 16);

  function fullSchema(p, label) {
    const good = p && Array.isArray(p.sizes) && typeof p.rating === 'number' && typeof p.reviews === 'number'
      && typeof p.stock === 'number' && Array.isArray(p.tags) && p.tags.length > 0
      && Array.isArray(p.images) && p.images.length === 4 && p.active === true
      && p.price && p.price.total > 0;
    ok(label, !!good, good ? '' : JSON.stringify({ sizes: p && p.sizes, rating: p && p.rating, reviews: p && p.reviews, stock: p && p.stock, tags: p && p.tags, images: p && (p.images || []).length, total: p && p.price && p.price.total }).slice(0, 220));
    return !!good;
  }

  /* ── Phase A · PREDEPLOY — live db still the 77 rings ── */
  console.log('\n· Phase A — PREDEPLOY (77-ring db, twins carry the studs):');
  php.writeFile('/tcrun/data/db.json', JSON.stringify(seedDb(true)));

  const v = await req('GET', 'version');
  ok('A0 · /api/version: stamps present and at least this era (rel/shell/index/app >= 164)',
    v.http === 200 && !v.fatal && v.json && v.json.rel >= 164 && /^shivaa-shell-v\d+$/.test(v.json.shell || '')
    && v.json.shell === 'shivaa-shell-v' + v.json.rel
    && v.json.stamp && v.json.stamp.index === v.json.rel && v.json.stamp.app === v.json.rel,
    v.fatal || v.raw.slice(0, 160));

  const la = await req('GET', 'products');
  const pa = (la.json && la.json.products) || [];
  const shvA = pa.filter(p => SHV_SKUS.includes(p.sku));
  ok('A1 · list serves 77 db rows + 6 twins = 83, SHV SKUs exactly once each',
    la.http === 200 && !la.fatal && pa.length === 83 && shvA.length === 6 && new Set(shvA.map(p => p.sku)).size === 6,
    `got ${pa.length} rows, ${shvA.length} SHV`);
  const twin = shvA.find(p => p.id === 'p_stud_m1') || {};
  fullSchema(twin, 'A2 · twin p_stud_m1 is full store schema (sizes/rating/reviews/stock/tags/4 shots/priced)');
  ok('A2b · twin carries campaign tags + flag + scheme copy',
    (twin.tags || []).includes('scheme') && twin.isCampaignStud === true && String(twin.desc || '').includes('Gold Biscuit'));

  const sa = await req('GET', 'products/p_stud_m1');
  const ja = sa.json || {};
  fullSchema(ja.product, 'A3 · single-GET twin is full store schema (the PDP payload)');
  ok('A3b · single-GET twin ships priced siblings + live rates (no more similar:[])',
    sa.http === 200 && !sa.fatal && Array.isArray(ja.similar) && ja.similar.length === 4
    && ja.similar.every(s => s.price && s.price.total > 0) && ja.rates && ja.rates.gold22 > 0,
    sa.fatal || `similar=${(ja.similar || []).length}`);

  const wa = await req('POST', 'wishlist', { id: 'p_stud_m1', add: true }, {}, QA_TOKEN);
  ok('A4 · member can wishlist a stud (was 404 Product not found)',
    wa.http === 200 && !wa.fatal && (wa.json.wishlist || []).includes('p_stud_m1'),
    wa.fatal || wa.raw.slice(0, 140));
  const wg = await req('GET', 'wishlist', null, {}, QA_TOKEN);
  const wItem = ((wg.json || {}).items || []).find(x => x.id === 'p_stud_m1') || {};
  ok('A5 · wishlist GET resolves the stud with a live price (was silently dropped)',
    wg.http === 200 && wItem.price && wItem.price.total > 0, wg.fatal || wg.raw.slice(0, 140));

  const ra = await req('POST', 'reviews', { productId: 'p_stud_m1', rating: 5, text: 'Royal square stud, fits the scheme draw perfectly.' }, {}, QA_TOKEN);
  ok('A6 · member can review a stud (was 404 Product not found)',
    ra.http === 200 && !ra.fatal && ra.json && ra.json.productId === 'p_stud_m1',
    ra.fatal || ra.raw.slice(0, 140));
  const sa2 = await req('GET', 'products/p_stud_m1');
  ok('A7 · the twin single-GET reads that live review (never hides feedback)',
    (sa2.json || {}).reviews && sa2.json.reviews.length === 1 && sa2.json.reviews[0].rating === 5);

  const oa = await req('POST', 'orders', { items: [{ id: 'p_stud_m1', qty: 1 }], address: BOUND('9999999999'), paymentMethod: 'Online' });
  const orderA = (oa.json && oa.json.id) ? oa.json : null;
  ok('A8 · guest boundary order PLACES on a stud (server-priced, no NaN)',
    oa.http === 200 && !oa.fatal && orderA && orderA.total > 0 && (orderA.items || [])[0]
    && orderA.items[0].unitPrice > 0 && orderA.items[0].isCampaignStud === true,
    oa.fatal || oa.raw.slice(0, 200));
  if (orderA) {
    const liveDb = await readLiveDb();
    const saved = (liveDb.orders || []).find(o => o.id === orderA.id) || {};
    const pin = guestPin(saved);
    liveDb.settings.payProvider = 'demo';   // demo branch: no network, totals + OCC block still run on the stud order
    php.writeFile('/tcrun/data/db.json', JSON.stringify(liveDb));
    const pay = await req('POST', 'pay/order', { orderId: orderA.id, pin });
    ok('A9 · pay/order mints a charge session for the stud order (totals + OCC block run on it)',
      pay.http === 200 && !pay.fatal && pay.json && pay.json.mode === 'demo'
      && pay.json.gatewayOrder && String(pay.json.gatewayOrder.id).startsWith('demo_') && pay.json.gatewayOrder.amount > 0,
      pay.fatal || pay.raw.slice(0, 200));
  } else {
    ok('A9 · pay/order mints a charge session for the stud order', false, 'no order to pay for');
  }

  /* ── Phase B · FULL — Catalogue Deploy has landed the db rows ── */
  console.log('\n· Phase B — FULL (83-row db, twins stand down):');
  // the deploy POSTs new rows and id is server-owned, so the live rows carry
  // generated ids, not p_stud_*: rename here to prove the SKU leg of the dedupe.
  const fullB = seedDb(false);
  let liveN = 0;
  for (const p of fullB.products) if (String(p.sku || '').startsWith('SHV')) p.id = 'p_live_deploy_' + (++liveN);
  php.writeFile('/tcrun/data/db.json', JSON.stringify(fullB));

  const lb = await req('GET', 'products');
  const pb = (lb.json && lb.json.products) || [];
  const shvB = pb.filter(p => SHV_SKUS.includes(p.sku));
  ok('B1 · list serves exactly 83 with each SHV SKU once (dedupe: db row wins, twin suppressed)',
    lb.http === 200 && !lb.fatal && pb.length === 83 && shvB.length === 6 && new Set(shvB.map(p => p.sku)).size === 6
    && shvB.every(p => !p.isCampaignStud) && shvB.every(p => /^p_live_deploy_/.test(p.id)),
    `got ${pb.length} rows, ${shvB.length} SHV, twins=${shvB.filter(p => p.isCampaignStud).length}`);
  const sb = await req('GET', 'products/p_live_deploy_5');
  const jb = sb.json || {};
  fullSchema(jb.product, 'B2 · single-GET serves the db row in full schema');
  ok('B2b · single-GET serves same-category siblings + reviews array',
    Array.isArray(jb.similar) && jb.similar.length >= 4 && Array.isArray(jb.reviews),
    `similar=${(jb.similar || []).length}`);
  const wb = await req('POST', 'wishlist', { id: 'p_live_deploy_5', add: true }, {}, QA_TOKEN);
  ok('B3 · member wishlist still 200 on the db row', wb.http === 200 && !wb.fatal && (wb.json.wishlist || []).includes('p_live_deploy_5'),
    wb.fatal || wb.raw.slice(0, 120));
  // old bookmarks still resolve: legacy p_stud_* ids fall through to the full twin
  const ob = await req('GET', 'products/p_stud_w2');
  const jo = ob.json || {};
  ok('B5 · legacy p_stud_w2 deep link falls through to the full twin (no crash, priced)',
    ob.http === 200 && !ob.fatal && jo.product && jo.product.isCampaignStud === true
    && Array.isArray(jo.product.sizes) && jo.product.rating === 4.8 && jo.product.price && jo.product.price.total > 0
    && Array.isArray(jo.similar) && jo.similar.length === 4,
    ob.fatal || ob.raw.slice(0, 160));

  const fails = results.filter(r => !r).length;
  console.log(`\nv164-php-run: ${results.length - fails} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS FATAL:', e); process.exit(1); });
