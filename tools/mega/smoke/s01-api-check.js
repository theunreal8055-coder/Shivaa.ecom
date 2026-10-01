'use strict';
/* S01 isolated API probes. Executes the current working-tree cms/api.php source
   in PHP-WASM against php-api-fixture's private in-memory QA database; no live
   service, customer data, SQL server, or provider credentials are used. */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER } = require('./php-api-fixture');

let passed = 0, failed = 0;
async function test(id, name, fn) {
  try { await fn(); passed++; console.log(`PASS ${id} ${name}`); }
  catch (error) { failed++; console.log(`FAIL ${id} ${name}: ${error.message}`); }
}
function isolatedSeed() {
  const db = seed();
  for (const key of ['orders', 'partners', 'settlements', 'reviews', 'otps', 'coupons', 'auditLog', 'metalOrders', 'bullionOrders', 'refundRequests', 'serviceRequests', 'newsletter', 'contactMsgs', 'pages', 'carts', 'events', 'rateAlerts', 'customOrders', 'goldPurchases', 'karigars', 'jobWork', 'cashbook', 'savingsPlans', 'bullionAlerts', 'finaleEntries', 'finaleAttempts', 'securityLog', 'khata']) db[key] = [];
  for (const key of ['loginfails', 'rateLimit', 'pubRate', 'resetRate']) db[key] = {};
  return db;
}

(async () => {
  const F = await fixture();
  F.setDb(isolatedSeed());
  const sqlPayloads = [
    "' OR '1'='1",
    "%' OR 1=1#",
    "' UNION SELECT password FROM users --",
    "1); DROP TABLE products;--",
  ];

  for (let i = 0; i < sqlPayloads.length; i++) {
    const payload = sqlPayloads[i];
    await test(`S01-Q${String(i + 1).padStart(2, '0')}`, `SQL-style search input is handled as literal text (${i + 1})`, async () => {
      const response = await F.req('GET', 'products', {}, '', { q: payload });
      assert.equal(response.status, 200, response.body);
      assert.ok(Array.isArray(response.json.products));
      assert.equal(response.json.products.length, 0, 'an unmatched search string must not broaden the catalogue');
      assert.doesNotMatch(response.body, /DROP TABLE|UNION SELECT|password FROM users/i);
    });
  }

  for (const [key, payload] of [
    ['category', "' OR 1=1 --"], ['metal', "Gold' OR '1'='1"], ['tag', "' OR 1=1 --"],
  ]) {
    await test(`S01-F-${key}`, `SQL-style filter value is handled literally (${key})`, async () => {
      const response = await F.req('GET', 'products', {}, '', { [key]: payload });
      assert.equal(response.status, 200, response.body);
      assert.ok(Array.isArray(response.json.products));
      assert.equal(response.json.products.length, 0, 'an unmatched filter must not broaden the catalogue');
    });
  }

  const storedPayload = '"><svg/onload=x=1>';
  let storedProduct = null;
  await test('S01-W01', 'unauthenticated product creation is denied', async () => {
    const response = await F.req('POST', 'products', {
      name: 'QA XSS probe', category: 'rings', metal: storedPayload, purity: '22K',
      weightG: 1, mcScheme: 'fixed', mcValue: 0, images: ['/images/logo.png'],
    }, '', {});
    assert.equal(response.status, 403, response.body);
  });

  await test('S01-W02', 'admin product-write probe persists markup-shaped QA text for output-encoding tests', async () => {
    const response = await F.req('POST', 'products', {
      name: 'QA XSS probe', category: storedPayload, metal: storedPayload, purity: storedPayload, sku: storedPayload,
      weightG: 1, mcScheme: 'fixed', mcValue: 0, images: ['/images/logo.png'],
    }, ADMIN, {});
    assert.equal(response.status, 200, response.body);
    storedProduct = response.json;
    for (const field of ['category', 'metal', 'purity', 'sku']) assert.equal(storedProduct[field], storedPayload, field);
  });

  await test('S01-W03', 'admin product API rejects attribute-breaking legacy media URLs', async () => {
    const response = await F.req('POST', 'products', {
      name: 'QA unsafe media probe', category: 'rings', metal: 'Gold', purity: '22K',
      weightG: 1, mcScheme: 'fixed', mcValue: 0, images: ['/"><svg/onload=x=1>'],
    }, ADMIN, {});
    assert.equal(response.status, 400, response.body);
    assert.equal(response.json.error, 'Add at least one product picture');
  });

  await test('S01-X01', 'reflected markup in the API search parameter is not echoed', async () => {
    const payload = '<svg/onload=window.__s01xss=1>';
    const response = await F.req('GET', 'products', {}, '', { q: payload });
    assert.equal(response.status, 200, response.body);
    assert.doesNotMatch(response.body, /<svg|onload=|__s01xss/i);
  });

  let storedServiceId = '';
  await test('S01-AUTH01', 'SQL-shaped login credentials do not bypass account matching', async () => {
    const response = await F.req('POST', 'auth/login', {
      email: "' OR '1'='1", password: "' OR '1'='1",
    }, '', {});
    assert.equal(response.status, 401, response.body);
    assert.equal(response.json.error, 'Invalid email or password');
    assert.equal(response.json.token, undefined);
  });

  await test('S01-SVC01', 'public Bespoke & Care request stores markup-shaped user text as data', async () => {
    const response = await F.req('POST', 'services', {
      type: 'care-repair', name: storedPayload, phone: '9876543210', details: storedPayload, budget: storedPayload,
    }, '', {});
    assert.equal(response.status, 200, response.body);
    storedServiceId = response.json.request.id;
    assert.equal(response.json.request.type, 'care-repair');
    for (const field of ['name', 'details', 'budget']) assert.equal(response.json.request[field], storedPayload, field);
  });
  await test('S01-SVC02', 'admin service-request API returns the stored record as JSON data', async () => {
    const response = await F.req('GET', 'services', {}, ADMIN, {});
    assert.equal(response.status, 200, response.body);
    const request = response.json.requests.find(row => row.id === storedServiceId);
    assert.ok(request);
    assert.equal(request.name, storedPayload);
    assert.equal(request.details, storedPayload);
  });

  await test('S01-CON01', 'public contact API stores markup-shaped message fields only as data', async () => {
    const response = await F.req('POST', 'contact', {
      name: storedPayload, phone: '9876543210', email: 'qa-s01@example.test', message: storedPayload,
    }, '', {});
    assert.equal(response.status, 200, response.body);
    const after = await F.db();
    const contact = after.contactMsgs.at(-1);
    assert.equal(contact.name, storedPayload);
    assert.equal(contact.message, storedPayload);
    assert.equal(contact.phone, '9876543210');
    assert.equal(response.json.ok, true);
  });

  const storedPageSlug = 'qa-s01-xss';
  await test('S01-PG01', 'admin custom-page write stores markup-shaped body as JSON data', async () => {
    const response = await F.req('POST', 'pages', {
      title: storedPayload, slug: storedPageSlug, body: storedPayload, published: true,
    }, ADMIN, {});
    assert.equal(response.status, 200, response.body);
    assert.equal(response.json.body, storedPayload);
    assert.equal(response.json.title, storedPayload);
  });
  await test('S01-PG02', 'public custom-page API returns the stored page as JSON', async () => {
    const response = await F.req('GET', 'pages', {}, '', { slug: storedPageSlug });
    assert.equal(response.status, 200, response.body);
    assert.equal(response.json.body, storedPayload);
    assert.equal(response.json.title, storedPayload);
  });

  const reviewDb = isolatedSeed();
  reviewDb.reviews = [];
  const reviewProduct = reviewDb.products.find(product => product && product.active);
  F.setDb(reviewDb);
  await test('S01-PROFILE01', 'authenticated profile update stores markup-shaped name/city as JSON data', async () => {
    const response = await F.req('PUT', 'auth/profile', { name: storedPayload, city: storedPayload }, MEMBER, {});
    assert.equal(response.status, 200, response.body);
    assert.equal(response.json.user.name, storedPayload);
    assert.equal(response.json.user.profile.city, storedPayload);
  });
  await test('S01-R01', 'anonymous review submission is rejected', async () => {
    const response = await F.req('POST', 'reviews', { productId: reviewProduct.id, rating: 5, text: storedPayload }, '', {});
    assert.equal(response.status, 401, response.body);
  });
  await test('S01-R02', 'authenticated review text is stored as data and returned only as JSON', async () => {
    const response = await F.req('POST', 'reviews', { productId: reviewProduct.id, rating: 5, text: storedPayload }, MEMBER, {});
    assert.equal(response.status, 200, response.body);
    const after = await F.db();
    const review = after.reviews.find(row => row.userId === 'qaMember' && row.productId === reviewProduct.id);
    assert.ok(review);
    assert.equal(review.text, storedPayload);
    const productResponse = await F.req('GET', 'products/' + reviewProduct.id, {}, '', {});
    assert.equal(productResponse.status, 200, productResponse.body);
    assert.equal(productResponse.json.reviews[0].text, storedPayload);
    assert.equal(productResponse.json.reviews[0].userName, storedPayload, 'profile-derived reviewer name remains a JSON value');
    assert.equal(typeof productResponse.json.reviews[0].text, 'string', 'review text remains a JSON value, not executable HTML on the API path');
  });

  await test('S01-P01', 'SQL/markup in a product path ID cannot change route matching', async () => {
    const response = await F.req('GET', 'products/x_OR_1=1--', {}, '', {});
    assert.equal(response.status, 404, response.body);
    assert.doesNotMatch(response.body, /products|users|<script/i);
  });

  for (const [key, value] of [
    ['q', ['ring', 'x']], ['category', ['rings', 'x']], ['metal', ['Gold', 'x']], ['tag', ['daily', 'x']],
  ]) {
    await test(`S01-T-${key}`, `non-scalar filter input (${key}) fails safely`, async () => {
      const response = await F.req('GET', 'products', {}, '', { [key]: value });
      assert.equal(response.status, 400, response.body);
      assert.equal(response.json.error, 'Invalid product filter');
    });
  }

  console.log(`\nS01 isolated API probes: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
