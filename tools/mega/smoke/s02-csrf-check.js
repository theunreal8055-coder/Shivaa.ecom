'use strict';
/* S02 CSRF probes. Runs only against PHP-WASM's isolated in-memory QA DB;
   attacker-origin requests are represented with browser-simple request headers
   and raw bodies. No provider credentials or external services are configured. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { fixture, seed, b64, ADMIN } = require('./php-api-fixture');
let passed = 0, failed = 0;
async function test(id, name, fn) {
  try { await fn(); passed++; console.log(`PASS ${id} ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${id} ${name}: ${error.message}`); }
}
function isolatedSeed() {
  const db = seed();
  for (const key of ['orders','partners','settlements','reviews','otps','coupons','auditLog','metalOrders','bullionOrders','refundRequests','serviceRequests','newsletter','contactMsgs','pages','carts','events','rateAlerts','customOrders','goldPurchases','karigars','jobWork','cashbook','savingsPlans','bullionAlerts','finaleEntries','finaleAttempts','securityLog','khata']) db[key] = [];
  for (const key of ['rateLimit','pubRate','loginfails','resetRate']) db[key] = {};
  // A known test-only password lets the cross-site login probe distinguish a
  // real rejection from a merely invalid credential.
  db.users[1].salt = 's02-qa-salt';
  db.users[1].passHash = crypto.createHash('sha256').update('s02-qa-saltqa-password').digest('hex');
  return db;
}

(async () => {
  const F = await fixture();
  const initialDb = isolatedSeed();
  F.setDb(initialDb);

  async function rawReq(method, route, body, opts = {}) {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const encoded = b64(raw), query = b64(opts.query || {});
    const contentType = opts.contentType || 'application/json';
    const origin = opts.origin === undefined ? 'https://attacker.invalid' : opts.origin;
    const cookie = opts.cookie || '';
    const authorization = opts.authorization || '';
    const fetchSite = opts.fetchSite || (origin === 'https://qa.invalid' ? 'same-origin' : 'cross-site');
    return F.run(`$GLOBALS['QA_BODY']=base64_decode('${encoded}');
class QaS02Input { public $context; private $p=0;
  function stream_open($u,$m,$o,&$x){return true;}
  function stream_read($n){$r=substr($GLOBALS['QA_BODY'],$this->p,$n);$this->p+=strlen($r);return $r;}
  function stream_eof(){return $this->p>=strlen($GLOBALS['QA_BODY']);}
  function stream_stat(){return ['size'=>strlen($GLOBALS['QA_BODY'])];}
}
stream_wrapper_unregister('php');stream_wrapper_register('php','QaS02Input');
$_SERVER=['REQUEST_METHOD'=>'${method}','REMOTE_ADDR'=>'203.0.113.10','HTTP_HOST'=>'qa.invalid','HTTPS'=>'on','CONTENT_TYPE'=>'${contentType}','CONTENT_LENGTH'=>(string)strlen($GLOBALS['QA_BODY']),'HTTP_ORIGIN'=>'${origin}','HTTP_REFERER'=>'${origin}/s02-probe','HTTP_SEC_FETCH_SITE'=>'${fetchSite}','HTTP_COOKIE'=>'${cookie}','HTTP_AUTHORIZATION'=>'${authorization}'];
$_COOKIE=${cookie ? "['shv_token'=>'qa169admin']" : '[]'};
$_GET=array_merge(['__route'=>'${route}'],json_decode(base64_decode('${query}'),true)); $_POST=[]; $_FILES=[];
include '/qa/api.php';`);
  }

  const start = await F.db();
  const contactPayload = { name: 'QA cross-origin', phone: '9876500099', message: 'S02 fixture only' };
  await test('S02-C01', 'cross-site text/plain JSON contact write is rejected before storing a lead', async () => {
    const r = await rawReq('POST', 'contact', contactPayload, { contentType: 'text/plain' });
    assert.equal(r.status, 403, r.body);
    assert.equal((await F.db()).contactMsgs.length, 0);
  });
  await test('S02-C02', 'cross-site application/json request is rejected even if a bearer header is supplied', async () => {
    const r = await rawReq('POST', 'contact', contactPayload, { contentType: 'application/json', authorization: 'Bearer ' + ADMIN });
    assert.equal(r.status, 403, r.body);
    assert.equal((await F.db()).contactMsgs.length, 0);
  });
  await test('S02-C03', 'cross-site simple-form service request cannot create a lead', async () => {
    const r = await rawReq('POST', 'services', 'name=QA+cross-origin&phone=9876500099&type=care&details=probe', { contentType: 'application/x-www-form-urlencoded' });
    assert.equal(r.status, 403, r.body);
    assert.equal((await F.db()).serviceRequests.length, 0);
  });
  await test('S02-C04', 'cross-site text/plain guest checkout cannot create a provisional order', async () => {
    const body = { items: [{ id: initialDb.products[0].id, qty: 1 }],
      address: { name: 'QA Buyer', phone: '9876500002', line: 'QA fixture street', city: 'QA City', state: 'Rajasthan', pincode: '302001' },
      paymentMethod: 'Online' };
    const r = await rawReq('POST', 'orders', body, { contentType: 'text/plain' });
    assert.equal(r.status, 403, r.body);
    assert.equal((await F.db()).orders.length, 0);
  });
  await test('S02-C05', 'cross-site text/plain login cannot issue a bearer token', async () => {
    const r = await rawReq('POST', 'auth/login', { email: 'member@qa.invalid', password: 'qa-password' }, { contentType: 'text/plain' });
    assert.equal(r.status, 403, r.body);
    assert.equal(Object.keys((await F.db()).tokens).length, Object.keys(start.tokens).length);
  });
  await test('S02-C06', 'cross-site text/plain OTP request is rejected before OTP/rate state changes', async () => {
    const r = await rawReq('POST', 'auth/send-otp', { phone: '9876500002' }, { contentType: 'text/plain' });
    assert.equal(r.status, 403, r.body);
    const db = await F.db();
    assert.equal(db.otps.length, 0);
    assert.deepEqual(db.rateLimit, {});
  });
  await test('S02-C07', 'opaque/null Origin is rejected for state-changing requests', async () => {
    const r = await rawReq('POST', 'contact', contactPayload, { origin: 'null', contentType: 'application/json' });
    assert.equal(r.status, 403, r.body);
    assert.equal((await F.db()).contactMsgs.length, 0);
  });
  await test('S02-C08', 'non-JSON body is rejected on a same-origin JSON API route', async () => {
    const r = await rawReq('POST', 'contact', contactPayload, { origin: 'https://qa.invalid', contentType: 'text/plain' });
    assert.equal(r.status, 415, r.body);
    assert.equal((await F.db()).contactMsgs.length, 0);
  });
  await test('S02-C09', 'ambient admin cookie alone cannot authorize a settings write', async () => {
    const before = (await F.db()).settings.shippingFee;
    const r = await rawReq('PUT', 'settings', { shippingFee: 1 }, { origin: 'https://qa.invalid', cookie: 'shv_token=qa169admin' });
    assert.equal(r.status, 403, r.body);
    assert.equal((await F.db()).settings.shippingFee, before);
  });
  await test('S02-C10', 'foreign Origin cannot mutate admin settings even with an explicit bearer', async () => {
    const before = (await F.db()).settings.shippingFee;
    const r = await rawReq('PUT', 'settings', { shippingFee: 1 }, { authorization: 'Bearer ' + ADMIN });
    assert.equal(r.status, 403, r.body);
    assert.equal((await F.db()).settings.shippingFee, before);
  });
  await test('S02-C11', 'same-origin JSON public form remains functional', async () => {
    const r = await rawReq('POST', 'contact', { ...contactPayload, name: 'QA same-origin' }, { origin: 'https://qa.invalid', contentType: 'application/json; charset=utf-8' });
    assert.equal(r.status, 200, r.body);
    const db = await F.db();
    assert.equal(db.contactMsgs.length, 1);
    assert.equal(db.contactMsgs[0].name, 'QA same-origin');
  });
  await test('S02-C12', 'same-origin authenticated admin settings write remains functional', async () => {
    const r = await rawReq('PUT', 'settings', { shippingFee: 321 }, { origin: 'https://qa.invalid', authorization: 'Bearer ' + ADMIN });
    assert.equal(r.status, 200, r.body);
    assert.equal((await F.db()).settings.shippingFee, 321);
  });
  await test('S02-C13', 'same-origin valid login still issues the expected QA session', async () => {
    const r = await rawReq('POST', 'auth/login', { email: 'member@qa.invalid', password: 'qa-password' }, { origin: 'https://qa.invalid' });
    assert.equal(r.status, 200, r.body);
    assert.match(r.json.token, /^[a-f0-9]{48}$/);
    assert.equal(r.json.user.id, 'qaMember');
  });
  await test('S02-C14', 'server-to-server JSON request without Origin remains supported', async () => {
    const r = await rawReq('POST', 'contact', { ...contactPayload, name: 'QA no-origin' }, { origin: '', contentType: 'application/json' });
    assert.equal(r.status, 200, r.body);
    assert.equal((await F.db()).contactMsgs.length, 2);
  });

  console.log(`\nS02 isolated CSRF probes: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
