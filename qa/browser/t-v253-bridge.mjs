/* ═══════════════════════════════════════════════════════════════════════════
   t-v253-bridge.mjs — Release v253 ("Bridge") Two-Way Showroom Billing Sync
   ───────────────────────────────────────────────────────────────────────────
   Verifies every requirement and security invariant of the two-way signed
   bridge between shivaa.in and the owner's live Hostinger PHP/HTML/JS billing
   software:
     A · Static PHP/JS/CSS security, SSRF, Linux flock, connector & zero-bloat
     B · Dark-by-default 403, SSRF URL rejection, secret masking & HMAC auth
     C · Website -> Billing: auto leads, customers, backfill, events/ack, rates, stock
     D · Billing -> Website: JSON & multipart PDF bills -> #/my-bills, pre-signup
         mobile auto-linking + customer.created emit, magic-byte reject, void,
         and idempotent SKU stock movements
     E · Owner Admin UI (#billingSyncCard, synced bill badge, connector download)
   Leaves the preview shim completely clean on exit.
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { boot, wait, until, BASE } from './harness.mjs';

const ROOT = process.cwd();
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, detail = '') {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
}

/* Real minimal valid %PDF-1.4 document for vault + streaming proofs */
const REAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 400]>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \n' +
  'trailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF\n',
  'utf8'
);
const REAL_PDF_V2 = Buffer.concat([REAL_PDF, Buffer.from('% updated copy\n', 'utf8')]);
const FAKE_PDF = Buffer.from('<html><script>alert(1)</script>not a pdf</html>', 'utf8');

const SECRET = 'shv_test_bridge_key_9f8e7d6c5b4a3210_v253';

function signHeaders(secret, method, routeNoQuery, rawBody, tsOverride = null) {
  const ts = String(tsOverride !== null ? tsOverride : Math.floor(Date.now() / 1000));
  const payload = `${ts}\n${method.toUpperCase()}\n${routeNoQuery}\n${rawBody}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { 'X-Shivaa-Ts': ts, 'X-Shivaa-Signature': sig };
}

async function apiJson(method, urlPath, body = null, headers = {}) {
  const opts = { method, headers: { ...headers } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const r = await fetch(BASE + urlPath, opts);
  let j = null;
  const txt = await r.text();
  try { j = JSON.parse(txt); } catch (_) {}
  return { status: r.status, headers: r.headers, body: j, raw: txt };
}

async function signedCall(secret, method, routeWithQuery, bodyObj = null, tsOverride = null) {
  const routeNoQuery = routeWithQuery.split('?')[0].replace(/^\/+/, '');
  const raw = bodyObj === null ? '' : JSON.stringify(bodyObj);
  const h = signHeaders(secret, method, routeNoQuery, raw, tsOverride);
  return apiJson(method, '/api/' + routeWithQuery, bodyObj === null ? null : raw, h);
}

/* ═══ A · Static Architecture, Security & Performance Proofs ══════════════ */
console.log('\nA · static architecture, security & zero shopper-bloat proofs');

const apiPhp = read('cms/api.php');
const bsPhp = read('cms/billing-sync.php');
const connPhp = read('billing-connector/shivaa-connector.php');
const connTxt = read('cms/docs/shivaa-connector.php.txt');
const adminJs = read('cms/js/admin.js');
const v253Css = read('cms/css/v253.css');
const shivaaCss = read('cms/css/shivaa.css');
const minCss = read('cms/css/shivaa.min.css');
const indexHtml = read('cms/index.html');
const deskHtml = read('cms/desk.html');
const swJs = read('cms/sw.js');
const appJs = read('cms/js/app.js');
const contractDoc = read('docs/BILLING-SYNC-CONTRACT.md');
const claudeDoc = read('billing-connector/CLAUDE-PROMPT-FOR-BILLING-SITE.md');

ok('cms/billing-sync.php refuses direct HTTP execution without SHV_RUN',
  /if \(!defined\('SHV_RUN'\)\) \{ http_response_code\(403\); exit; \}/.test(bsPhp));
ok('outbound webhooks enforce HTTPS, ports 443/8443, public-IP SSRF pinning & zero redirects',
  /FILTER_FLAG_NO_PRIV_RANGE \| FILTER_FLAG_NO_RES_RANGE/.test(bsPhp) &&
  /in_array\(\$port, \[443, 8443\], true\)/.test(bsPhp) &&
  /CURLOPT_FOLLOWLOCATION\s*=>\s*false/.test(bsPhp) &&
  /CURLOPT_RESOLVE\s*=>/.test(bsPhp) &&
  /CURLPROTO_HTTPS/.test(bsPhp));
ok('outbound flush runs AFTER lock release + fastcgi/litespeed_finish_request (0 ms shopper impact)',
  /shv_billing_schedule_flush[\s\S]{0,600}?@flock\(\$GLOBALS\['__shv_lock'\], LOCK_UN\)[\s\S]{0,350}?fastcgi_finish_request[\s\S]{0,200}?litespeed_finish_request/.test(bsPhp));
ok('flush_outbox & admin/billing/test bind $GLOBALS[__shv_lock] (zero Linux flock self-deadlock)',
  (bsPhp.match(/\$GLOBALS\['__shv_lock'\] = \$lh;/g) || []).length === 2);
ok('HMAC verifier uses constant-time hash_equals and ±300 s replay window',
  /abs\(time\(\) - \(int\)\$ts\) > 300/.test(bsPhp) && /hash_equals\(\$expect, \$sig\)/.test(bsPhp));
ok('inbound bills verify real file magic bytes and store 0600 inside private vault',
  /shv_bill_private_dir\(\)/.test(bsPhp) && /@chmod\(\$dest, 0600\)/.test(bsPhp) && /private-bills:/.test(bsPhp));
ok('customer serializer never exports passwordHash, OTPs or session tokens',
  !/passwordHash|otpCode|sessionToken/.test(
    (bsPhp.match(/function shv_billing_customer_payload[\s\S]*?\n\}/) || [''])[0]
  ));
ok('api.php emits customers, all 9 lead channels, orders & auto-links bills on login/register',
  /shv_billing_emit_customer\(\$db, \$u, 'customer\.created'\)/.test(apiPhp) &&
  /shv_billing_emit_customer\(\$db, \$u, 'customer\.updated'\)/.test(apiPhp) &&
  /shv_billing_link_user_bills\(\$db, \$u\)/.test(apiPhp) &&
  /shv_billing_link_user_bills\(\$db, \$loginUser\)/.test(apiPhp) &&
  /shv_billing_emit_order\(\$db, \$ord, 'order\.paid'\)/.test(apiPhp) &&
  /shv_billing_emit_order\(\$db, \$order, 'order\.created'\)/.test(apiPhp) &&
  ['contact', 'service_request', 'custom_order', 'metal_exchange', 'partner_application',
   'savings_plan', 'rate_alert', 'abandoned_cart', 'newsletter']
    .every(ch => apiPhp.includes(`shv_billing_emit_lead($db, '${ch}'`)));
ok('api.php bill_clean & PATCH store-bills reject future dates without rejecting past dates',
  (apiPhp.match(/strcmp\(\$(?:row|clean)\['billDate'\], date\('Y-m-d', time\(\) \+ 86400\)\) > 0/g) || []).length === 2);
ok('connector template mirrors billing-connector/shivaa-connector.php byte-for-byte',
  connPhp === connTxt && connPhp.length > 25000);
ok('connector supports MySQL + private JSON, locked replay dedup, hooks, PHP SDK & JS bridge',
  /CREATE TABLE IF NOT EXISTS shivaa_synced_customers/.test(connPhp) &&
  /\.shivaa-billing-sync/.test(connPhp) &&
  /seen_deliveries\.json[\s\S]{0,200}?LOCK_EX/.test(connPhp) &&
  /on_shivaa_customer/.test(connPhp) && /on_shivaa_lead/.test(connPhp) && /on_shivaa_order/.test(connPhp) &&
  /function shivaa_push_bill_pdf/.test(connPhp) &&
  /function shivaa_push_stock/.test(connPhp) &&
  /CURLOPT_FOLLOWLOCATION\s*=>\s*false/.test(connPhp));
ok('docs & ready-to-paste Claude setup guide exist and match v253 contract',
  /billing\/bills/.test(contractDoc) && /X-Shivaa-Signature/.test(contractDoc) &&
  /on_shivaa_customer/.test(claudeDoc) && /shivaa_push_bill_pdf/.test(claudeDoc));
ok('zero shopper JS bloat: admin.js is lazy-loaded (no <script> in index.html, not in sw.js precache)',
  !/<script[^>]+admin(?:\.min)?\.js/.test(indexHtml) &&
  !/['"]\/js\/admin(?:\.min)?\.js/.test(swJs));
const v253NoComments = v253Css.replace(/\/\*[\s\S]*?\*\//g, '');
ok('v253.css is bundled in shivaa.css/shivaa.min.css and keeps compositor discipline',
  /\/\* v253\.css \*\//.test(shivaaCss) &&
  minCss.includes('.bsync-card') &&
  !/will-change/.test(v253NoComments) &&
  !/overflow-x\s*:\s*hidden/.test(v253NoComments) &&
  !/content-visibility/.test(v253NoComments));
ok('release stamps at v253 in lockstep across index.html, desk.html, sw.js, app.js & api.php',
  /window\.__SHIVAA_REL=253;/.test(indexHtml) &&
  deskHtml.includes('/css/shivaa.min.css?v=253') &&
  /const REL = 253;/.test(swJs) && /shivaa-shell-v253/.test(swJs) &&
  /const APP_REL = 253;/.test(appJs) &&
  (apiPhp.match(/'rel' => 253/g) || []).length >= 2);

/* ═══ B · Security, SSRF Guards, Secret Non-Leakage & HMAC Auth ═══════════ */
console.log('\nB · security, SSRF rejection, secret non-leakage & HMAC auth');

const ownerLogin = await apiJson('POST', '/api/auth/login', { email: 'owner@shivaa.in', password: 'shivaa123' });
const ADMIN = (ownerLogin.body || {}).token;
const adminH = { Authorization: 'Bearer ' + ADMIN };
ok('owner signs in cleanly', ownerLogin.status === 200 && !!ADMIN);

/* Ensure bridge starts dark */
await apiJson('PUT', '/api/settings', { billingSyncClear: true, billingAppUrl: '', billingWebhookUrl: '' }, adminH);

const darkPing = await signedCall(SECRET, 'GET', 'billing/ping');
ok('bridge stays dark (403) before owner configures a sync key', darkPing.status === 403, String(darkPing.status));

for (const badUrl of [
  'http://billing.shivaa.in/shivaa-connector.php',
  'https://localhost/shivaa-connector.php',
  'https://127.0.0.1/shivaa-connector.php',
  'https://10.0.0.8/shivaa-connector.php',
  'https://192.168.1.50/shivaa-connector.php',
  'https://169.254.169.254/latest/meta-data',
  'https://billing.shivaa.in:9000/shivaa-connector.php',
  'https://user:pass@billing.shivaa.in/shivaa-connector.php',
]) {
  const r = await apiJson('PUT', '/api/settings', { billingWebhookUrl: badUrl }, adminH);
  ok('SSRF/URL guard rejects ' + badUrl, r.status === 400, `${r.status} ${JSON.stringify(r.body)}`);
}

const weakKey = await apiJson('PUT', '/api/settings', { billingSyncSecret: 'short123' }, adminH);
ok('weak sync key (< 16 chars) rejected with 400', weakKey.status === 400);

const saveCfg = await apiJson('PUT', '/api/settings', {
  billingSyncSecret: SECRET,
  billingAppUrl: 'https://billing.shivaa.in/',
  billingWebhookUrl: 'https://billing.shivaa.in/shivaa-connector.php',
  billingPushCustomers: true,
  billingPushLeads: true,
  billingPushOrders: true,
  billingAcceptBills: true,
  billingAcceptStock: true,
}, adminH);
ok('valid HTTPS billing URLs + 32-char sync key accepted',
  saveCfg.status === 200 && saveCfg.body.billingSyncConfigured === true &&
  saveCfg.body.billingAppUrl === 'https://billing.shivaa.in',
  JSON.stringify(saveCfg.body).slice(0, 160));
ok('PUT /api/settings masks secret as •••• and never echoes raw key',
  saveCfg.body.billingSyncSecret === '••••' && !saveCfg.raw.includes(SECRET));

const adminSet = await apiJson('GET', '/api/settings', null, adminH);
ok('admin GET /api/settings keeps secret write-only (masked)',
  adminSet.body.billingSyncSecret === '••••' && adminSet.body.billingSyncConfigured === true && !adminSet.raw.includes(SECRET));

const blankKeep = await apiJson('PUT', '/api/settings', { billingSyncSecret: '' }, adminH);
ok('saving settings with blank sync key preserves existing secret',
  blankKeep.status === 200 && blankKeep.body.billingSyncConfigured === true);

const pubSet = await apiJson('GET', '/api/settings');
const pubBoot = await apiJson('GET', '/api/boot');
ok('public /api/settings and /api/boot strip every billing* key completely',
  !pubSet.raw.includes(SECRET) && !pubBoot.raw.includes(SECRET) &&
  !Object.keys(pubSet.body || {}).some(k => k.startsWith('billing')) &&
  !Object.keys((pubBoot.body && pubBoot.body.settings) || {}).some(k => k.startsWith('billing')) &&
  pubBoot.body.rel === 253);

/* Non-admin cannot touch /api/admin/billing/* */
const aartiLogin = await apiJson('POST', '/api/auth/login', { email: 'aarti@example.com', password: 'shivaa123' });
const AARTI = (aartiLogin.body || {}).token;
const rohitLogin = await apiJson('POST', '/api/auth/login', { email: 'rohit@example.com', password: 'shivaa123' });
const ROHIT = (rohitLogin.body || {}).token;
const nonAdminStatus = await apiJson('GET', '/api/admin/billing/status', null, { Authorization: 'Bearer ' + AARTI });
ok('customer gets 403 on /api/admin/billing/status', nonAdminStatus.status === 403);

/* HMAC checks */
const noSig = await apiJson('GET', '/api/billing/ping');
ok('unsigned request rejected with 401', noSig.status === 401);
const badSig = await signedCall('wrong_secret_0000000000000000', 'GET', 'billing/ping');
ok('wrong HMAC secret rejected with 401', badSig.status === 401);
const staleTs = await signedCall(SECRET, 'GET', 'billing/ping', null, Math.floor(Date.now() / 1000) - 601);
ok('stale timestamp (> 300 s old) rejected with 401', staleTs.status === 401);
const futureTs = await signedCall(SECRET, 'GET', 'billing/ping', null, Math.floor(Date.now() / 1000) + 601);
ok('future timestamp (> 300 s ahead) rejected with 401', futureTs.status === 401);
const wrongRouteH = signHeaders(SECRET, 'GET', 'billing/rates', '');
const wrongRoute = await apiJson('GET', '/api/billing/ping', null, wrongRouteH);
ok('signature bound to another route rejected with 401', wrongRoute.status === 401);
const tamperH = signHeaders(SECRET, 'POST', 'billing/stock-movement', '{"sku":"A","delta":1}');
const tampered = await apiJson('POST', '/api/billing/stock-movement', '{"sku":"A","delta":-99}', tamperH);
ok('tampered JSON body rejected with 401', tampered.status === 401);

const goodPing = await signedCall(SECRET, 'GET', 'billing/ping');
ok('valid HMAC GET /api/billing/ping succeeds with rel 253, capabilities & vault ready',
  goodPing.status === 200 && goodPing.body.ok === true && goodPing.body.rel === 253 &&
  goodPing.body.billStorageReady === true && goodPing.body.webhookConfigured === true &&
  goodPing.body.capabilities.acceptBills === true,
  JSON.stringify(goodPing.body));

/* ═══ C · Website -> Billing (Leads, Customers, Backfill, Rates, Stock) ═══ */
console.log('\nC · website -> billing automatic leads, customers, rates, stock & outbox');

const leadContact = await apiJson('POST', '/api/contact', {
  name: 'Meera Agarwal', phone: '9829011223', email: 'meera.lead@example.com',
  message: 'Looking for a bridal 22K kundan necklace set around 65 g.',
});
ok('website contact enquiry succeeds', leadContact.status === 200 && leadContact.body.ok === true);

const leadSvc = await apiJson('POST', '/api/services', {
  service: 'Private bridal consultation', name: 'Kavita Jain', phone: '9829044556',
  date: '2026-11-22', note: 'Visiting Johari Bazaar showroom at 4 PM',
});
ok('website service/appointment booking succeeds', leadSvc.status === 200 && leadSvc.body.ok === true);

const leadNl = await apiJson('POST', '/api/newsletter', { email: 'vip.collector@example.com' });
ok('website newsletter signup succeeds', leadNl.status === 200 && leadNl.body.ok === true);

const pullLeads = await signedCall(SECRET, 'GET', 'billing/leads?limit=50');
ok('signed GET /api/billing/leads returns all 3 website leads with channel & mobile',
  pullLeads.status === 200 && pullLeads.body.ok === true &&
  pullLeads.body.leads.some(l => l.channel === 'contact' && l.phone === '9829011223' && /kundan/.test(l.message)) &&
  pullLeads.body.leads.some(l => l.channel === 'service_request' && l.phone === '9829044556') &&
  pullLeads.body.leads.some(l => l.channel === 'newsletter' && l.email === 'vip.collector@example.com'),
  JSON.stringify(pullLeads.body).slice(0, 200));

const pullCust = await signedCall(SECRET, 'GET', 'billing/customers');
ok('signed GET /api/billing/customers returns retail customers with zero secrets',
  pullCust.status === 200 && pullCust.body.ok === true &&
  pullCust.body.customers.some(c => c.phone === '9308956260' && /Aarti/i.test(c.name)) &&
  !pullCust.body.customers.some(c => c.role === 'admin') &&
  !/password|hash|otp|token/i.test(pullCust.raw),
  JSON.stringify(pullCust.body).slice(0, 200));

const bf1 = await apiJson('POST', '/api/admin/billing/backfill', { customers: true, leads: true, orders: true }, adminH);
const bf2 = await apiJson('POST', '/api/admin/billing/backfill', { customers: true, leads: true, orders: true }, adminH);
ok('admin backfill queues existing customers idempotently (second run queues 0 duplicates)',
  bf1.status === 200 && bf1.body.queued.customers >= 2 &&
  bf2.status === 200 && bf2.body.totalQueued === 0,
  JSON.stringify({ first: bf1.body.queued, second: bf2.body.queued }));

const evFeed = await signedCall(SECRET, 'GET', 'billing/events?since_seq=0&limit=50');
ok('signed GET /api/billing/events returns ordered lead.created + customer.created envelope feed',
  evFeed.status === 200 && evFeed.body.ok === true &&
  Array.isArray(evFeed.body.events) && evFeed.body.events.length >= 5 &&
  evFeed.body.lastSeq >= 5 &&
  evFeed.body.events.some(e => e.event === 'lead.created' && e.data.phone === '9829011223') &&
  evFeed.body.events.some(e => e.event === 'customer.created' && e.data.phone === '9308956260'),
  `len=${evFeed.body && evFeed.body.events && evFeed.body.events.length}`);

const ackIds = evFeed.body.events.map(e => e.id);
const ackRes = await signedCall(SECRET, 'POST', 'billing/events/ack', { ids: ackIds });
ok('signed POST /api/billing/events/ack marks pulled events as delivered',
  ackRes.status === 200 && ackRes.body.acked === ackIds.length, JSON.stringify(ackRes.body));

const pullRates = await signedCall(SECRET, 'GET', 'billing/rates');
ok('signed GET /api/billing/rates serves live 24K, 22K, 18K gold & silver rates',
  pullRates.status === 200 && pullRates.body.ok === true &&
  pullRates.body.retail && Number(pullRates.body.retail.gold24) > 0 &&
  Number(pullRates.body.retail.gold22) > 0 && Number(pullRates.body.retail.gold18) > 0 &&
  Number(pullRates.body.retail.silver) > 0,
  JSON.stringify(pullRates.body).slice(0, 180));

const pullStock = await signedCall(SECRET, 'GET', 'billing/stock');
const sampleItem = ((pullStock.body || {}).products || []).find(p => p.sku && Number(p.stock) >= 2);
ok('signed GET /api/billing/stock returns catalogue SKUs, weights & current stock',
  pullStock.status === 200 && pullStock.body.ok === true && !!sampleItem,
  sampleItem ? `${sampleItem.sku} stock=${sampleItem.stock}` : 'no stocked item');
const initialStock = Number(sampleItem.stock);

/* ═══ D · Billing -> Website (PDF Bill -> #/my-bills, Pre-Signup Link, Stock) */
console.log('\nD · billing -> website automatic PDF bills, customer #/my-bills & stock sync');

/* 1. Reject fake PDF wearing .pdf extension */
const badPdf = await signedCall(SECRET, 'POST', 'billing/bills', {
  externalId: 'INV-FAKE-1', billNo: 'SJ/26/FAKE', billDate: '2026-11-15',
  customerName: 'Aarti Sharma', phone: '9308956260', amount: 1000,
  pdfBase64: FAKE_PDF.toString('base64'), pdfName: 'invoice.pdf',
});
ok('fake HTML disguised as invoice.pdf rejected on magic bytes (400)', badPdf.status === 400);

/* 2. Push real PDF bill for Aarti (Indian DD/MM/YYYY date + private note + SKU stock deduction) */
const pushBill1 = await signedCall(SECRET, 'POST', 'billing/bills', {
  externalId: 'INV-2026-0901',
  billNo: 'SJ/26/0901',
  billDate: '15/11/2026',
  store: 'Shivaa Jewels · Jaipur',
  customerName: 'Aarti Sharma',
  phone: '+91 93089 56260',
  amount: 148500,
  items: [{ sku: sampleItem.sku, name: '22K Kundan Choker Set', weight: 18.6, qty: 1, amount: 148500 }],
  deductStock: true,
  notes: 'INTERNAL COUNTER NOTE — gold exchange adjusted',
  pdfBase64: 'data:application/pdf;base64,' + REAL_PDF.toString('base64'),
  pdfName: 'SJ-26-0901.pdf',
});
ok('signed POST /api/billing/bills stores PDF, normalizes DD/MM/YYYY & auto-links Aarti',
  pushBill1.status === 200 && pushBill1.body.ok === true &&
  pushBill1.body.created === true && pushBill1.body.linked === true &&
  pushBill1.body.profileRoute === '#/my-bills' &&
  pushBill1.body.bill.billDate === '2026-11-15' &&
  pushBill1.body.bill.source === 'billing-sync' &&
  pushBill1.body.bill.files.length === 1 && pushBill1.body.bill.files[0].ext === 'pdf' &&
  !JSON.stringify(pushBill1.body.bill.files).includes('private-bills:'),
  JSON.stringify(pushBill1.body).slice(0, 220));
const BILL1_ID = pushBill1.body.bill.id;

const stockAfterSale = await signedCall(SECRET, 'GET', 'billing/stock?sku=' + encodeURIComponent(sampleItem.sku));
ok('counter bill automatically deducted website SKU stock by 1',
  stockAfterSale.status === 200 && Number(stockAfterSale.body.products[0].stock) === initialStock - 1,
  `before=${initialStock} after=${stockAfterSale.body.products[0] && stockAfterSale.body.products[0].stock}`);

/* 3. Idempotent re-push of same externalId updates PDF/amount WITHOUT creating duplicate or double-deducting stock */
const pushBill1Upd = await signedCall(SECRET, 'POST', 'billing/bills', {
  externalId: 'INV-2026-0901',
  billNo: 'SJ/26/0901',
  billDate: '15-11-2026',
  store: 'Shivaa Jewels · Jaipur',
  customerName: 'Aarti Sharma',
  phone: '9308956260',
  amount: 149200,
  items: [{ sku: sampleItem.sku, name: '22K Kundan Choker Set (hallmarked)', weight: 18.6, qty: 1, amount: 149200 }],
  deductStock: true,
  notes: 'INTERNAL COUNTER NOTE — revised GST rounding',
  pdfBase64: REAL_PDF_V2.toString('base64'),
  pdfName: 'SJ-26-0901-revised.pdf',
});
const stockAfterRetry = await signedCall(SECRET, 'GET', 'billing/stock?sku=' + encodeURIComponent(sampleItem.sku));
ok('re-sending same externalId upserts in place and NEVER double-deducts SKU stock',
  pushBill1Upd.status === 200 && pushBill1Upd.body.updated === true &&
  pushBill1Upd.body.bill.id === BILL1_ID &&
  Number(pushBill1Upd.body.bill.amount) === 149200 &&
  Number(stockAfterRetry.body.products[0].stock) === initialStock - 1,
  JSON.stringify(pushBill1Upd.body).slice(0, 200));

/* 4. Customer API + real browser #/my-bills proof */
const aartiBills = await apiJson('GET', '/api/store-bills', null, { Authorization: 'Bearer ' + AARTI });
const cBill = ((aartiBills.body || {}).bills || [])[0] || {};
ok('Aarti sees her synced PDF bill on GET /api/store-bills with zero private fields leaked',
  aartiBills.status === 200 && aartiBills.body.count === 1 &&
  cBill.billNo === 'SJ/26/0901' && Number(cBill.amount) === 149200 &&
  !('notes' in cBill) && !('phone' in cBill) && !('source' in cBill) && !('externalId' in cBill) &&
  cBill.files[0].ext === 'pdf' && !('ref' in cBill.files[0]));

const pdfInline = await fetch(`${BASE}/api/store-bills/${BILL1_ID}/file/0`, {
  headers: { Authorization: 'Bearer ' + AARTI },
});
const pdfBytes = Buffer.from(await pdfInline.arrayBuffer());
ok('customer View streams exact byte-identical PDF (application/pdf, inline, nosniff, no-store)',
  pdfInline.status === 200 && pdfBytes.equals(REAL_PDF_V2) &&
  pdfInline.headers.get('content-type') === 'application/pdf' &&
  String(pdfInline.headers.get('content-disposition') || '').startsWith('inline') &&
  pdfInline.headers.get('x-content-type-options') === 'nosniff' &&
  /no-store/.test(String(pdfInline.headers.get('cache-control') || '')));

const pdfDl = await fetch(`${BASE}/api/store-bills/${BILL1_ID}/file/0?download=1`, {
  headers: { Authorization: 'Bearer ' + AARTI },
});
const dlBytes = Buffer.from(await pdfDl.arrayBuffer());
ok('customer Download delivers attachment PDF with identical bytes',
  pdfDl.status === 200 && dlBytes.equals(REAL_PDF_V2) &&
  String(pdfDl.headers.get('content-disposition') || '').startsWith('attachment'));

const rohitSteal = await fetch(`${BASE}/api/store-bills/${BILL1_ID}/file/0`, {
  headers: { Authorization: 'Bearer ' + ROHIT },
});
ok('another signed-in customer gets 403 trying to read Aarti’s PDF bill', rohitSteal.status === 403);

const custPage = await boot('#/my-bills', {
  seed: w => { try { w.localStorage.setItem('shv_token', JSON.stringify(AARTI)); } catch (_) {} },
});
await until(() => custPage.doc.querySelector('.bill-card'), 12000);
await wait(200);
const cardTxt = String(custPage.doc.querySelector('#view').textContent || '').replace(/\s+/g, ' ');
ok('live #/my-bills renders Aarti’s synced PDF bill with View + Download and zero private notes',
  /Bill SJ\/26\/0901/.test(cardTxt) && /1,?49,200/.test(cardTxt) &&
  /Kundan Choker Set/.test(cardTxt) && /PDF/i.test(cardTxt) &&
  /View/.test(cardTxt) && /Download/.test(cardTxt) &&
  !/INTERNAL COUNTER NOTE/.test(cardTxt),
  cardTxt.slice(0, 260));
custPage.window.close();

/* 5. Multipart PDF upload for a PRE-SIGNUP walk-in customer, then customer signs up! */
const walkinPhone = '9765432109';
const mpBillNo = 'SJ/26/0902';
const fileSha = crypto.createHash('sha256').update(REAL_PDF).digest('hex');
const mpTs = String(Math.floor(Date.now() / 1000));
const mpSig = crypto.createHmac('sha256', SECRET)
  .update(`${mpTs}\nPOST\nbilling/bills\nmultipart:${mpBillNo}:${walkinPhone}:${fileSha}`)
  .digest('hex');
const fd = new FormData();
fd.append('externalId', 'INV-2026-0902');
fd.append('billNo', mpBillNo);
fd.append('billDate', '2026-11-16');
fd.append('store', 'Shivaa Jewels · Jaipur');
fd.append('customerName', 'Priya Rathore');
fd.append('phone', walkinPhone);
fd.append('amount', '64500');
fd.append('items', '22K Gold Jhumka Pair · 7.80 g');
fd.append('file', new Blob([REAL_PDF], { type: 'application/pdf' }), 'SJ-26-0902.pdf');
const mpRes = await fetch(`${BASE}/api/billing/bills`, {
  method: 'POST',
  headers: { 'X-Shivaa-Ts': mpTs, 'X-Shivaa-Signature': mpSig },
  body: fd,
});
const mpBody = await mpRes.json();
ok('multipart FormData PDF push stores bill for unregistered walk-in mobile (linked: false)',
  mpRes.status === 200 && mpBody.ok === true && mpBody.linked === false &&
  mpBody.bill.files[0].ext === 'pdf',
  JSON.stringify(mpBody).slice(0, 180));
const BILL2_ID = mpBody.bill.id;

/* Walk-in customer registers later on shivaa.in with the same mobile */
const otpSend = await apiJson('POST', '/api/kyc/send-otp', { phone: walkinPhone });
const otpCode = (otpSend.body || {}).devCode || (otpSend.body || {}).code || '123456';
await apiJson('POST', '/api/kyc/verify-otp', { phone: walkinPhone, code: otpCode });
const regRes = await apiJson('POST', '/api/auth/register', {
  name: 'Priya Rathore', phone: walkinPhone, email: 'priya.rathore@example.com',
});
const PRIYA = (regRes.body || {}).token;
ok('walk-in customer signs up via mobile OTP', regRes.status === 200 && !!PRIYA, JSON.stringify(regRes.body));

const priyaBills = await apiJson('GET', '/api/store-bills', null, { Authorization: 'Bearer ' + PRIYA });
const priyaPdf = await fetch(`${BASE}/api/store-bills/${BILL2_ID}/file/0`, {
  headers: { Authorization: 'Bearer ' + PRIYA },
});
const priyaBytes = Buffer.from(await priyaPdf.arrayBuffer());
ok('walk-in customer IMMEDIATELY finds her earlier showroom PDF bill waiting on her profile',
  priyaBills.status === 200 && priyaBills.body.count === 1 &&
  priyaBills.body.bills[0].billNo === mpBillNo &&
  priyaPdf.status === 200 && priyaBytes.equals(REAL_PDF));

const newEvs = await signedCall(SECRET, 'GET', 'billing/events?limit=20');
ok('and her signup simultaneously emitted customer.created to the billing software outbox',
  newEvs.status === 200 &&
  newEvs.body.events.some(e => e.event === 'customer.created' && e.data.phone === walkinPhone));

/* 6. Counter SKU stock movement (single, duplicate idempotency, absolute setStock & batch) */
const mv1 = await signedCall(SECRET, 'POST', 'billing/stock-movement', {
  movementId: 'POS-RET-101', sku: sampleItem.sku, delta: +3, reason: 'restock',
});
const mvDup = await signedCall(SECRET, 'POST', 'billing/stock-movement', {
  movementId: 'POS-RET-101', sku: sampleItem.sku, delta: +3, reason: 'restock',
});
ok('stock-movement adjusts SKU stock and replays of same movementId are idempotent',
  mv1.status === 200 && mv1.body.ok === true && !mv1.body.duplicate &&
  mv1.body.result && mv1.body.result.stockAfter === initialStock + 2 &&
  mvDup.status === 200 && mvDup.body.ok === true && mvDup.body.duplicate === true &&
  mvDup.body.result && mvDup.body.result.stockAfter === initialStock + 2,
  JSON.stringify({ mv1: mv1.body, mvDup: mvDup.body }).slice(0, 220));

const mvRestore = await signedCall(SECRET, 'POST', 'billing/stock-movement', {
  movements: [
    { movementId: 'POS-SET-102', sku: sampleItem.sku, setStock: initialStock, reason: 'reconcile' },
    { movementId: 'POS-MISS-103', sku: 'NON-EXISTENT-SKU-999', delta: -1, reason: 'sale' },
  ],
});
ok('batch stock-movement applies valid setStock and reports missing SKUs without failing batch',
  mvRestore.status === 200 && mvRestore.body.applied === 1 &&
  mvRestore.body.results.length === 2 &&
  mvRestore.body.results[0].result && mvRestore.body.results[0].result.stockAfter === initialStock &&
  mvRestore.body.results[1].ok === false && mvRestore.body.results[1].notFound === true,
  JSON.stringify(mvRestore.body).slice(0, 220));

/* ═══ E · Admin Control Center UI, Synced Badge, Connector Download & Void ═ */
console.log('\nE · owner Admin control center, connector download, bill void & clean exit');

const statusRes = await apiJson('GET', '/api/admin/billing/status', null, adminH);
ok('GET /api/admin/billing/status reports counts, queue, endpoints & recent activity (no raw key)',
  statusRes.status === 200 && statusRes.body.configured === true &&
  statusRes.body.counts.syncedBills === 2 &&
  statusRes.body.recentLog.length >= 3 &&
  !statusRes.raw.includes(SECRET));

const connDl = await fetch(`${BASE}/api/admin/billing/connector`, { headers: adminH });
const connDlTxt = await connDl.text();
ok('GET /api/admin/billing/connector downloads valid pre-filled shivaa-connector.php without secret',
  connDl.status === 200 &&
  /filename="shivaa-connector\.php"/.test(String(connDl.headers.get('content-disposition') || '')) &&
  connDlTxt.startsWith('<?php') &&
  connDlTxt.includes('PASTE_YOUR_SYNC_KEY_HERE') &&
  !connDlTxt.includes(SECRET),
  connDlTxt.slice(0, 140));

/* Boot Admin panel on Settings & In-store Bills tabs */
const seedAdm = w => { try { w.localStorage.setItem('shv_token', JSON.stringify(ADMIN)); } catch (_) {} };
const adm = await boot('#/admin?tab=settings', { seed: seedAdm });
await until(() => adm.doc.querySelector('#billingSyncCard'), 12000);
const bCard = adm.doc.querySelector('#billingSyncCard');
ok('Admin -> Settings renders #billingSyncCard with URLs, Generate Key, 5 toggles, Test, Backfill & Connector buttons',
  !!bCard &&
  bCard.querySelector('input[name="billingAppUrl"]').value === 'https://billing.shivaa.in' &&
  bCard.querySelector('input[name="billingWebhookUrl"]').value === 'https://billing.shivaa.in/shivaa-connector.php' &&
  !!bCard.querySelector('#billingSyncSecretInput') &&
  ['billingPushCustomers', 'billingPushLeads', 'billingPushOrders', 'billingAcceptBills', 'billingAcceptStock']
    .every(n => bCard.querySelector(`input[name="${n}"]`) && bCard.querySelector(`input[name="${n}"]`).checked) &&
  ['saveBillingSync', 'generateBillingKey', 'copyBillingKey', 'downloadBillingConnector',
   'copyBillingClaudePrompt', 'testBillingSync', 'backfillBillingSync', 'retryBillingSync', 'disconnectBillingSync']
    .every(fn => typeof adm.window.ShivaaAdmin[fn] === 'function'));
/* Verify client-side Generate Key creates a high-entropy 48+ char key in the field */
adm.window.ShivaaAdmin.generateBillingKey();
const genVal = bCard.querySelector('#billingSyncSecretInput').value;
ok('Admin Generate key produces a cryptographically strong shv_live_* sync key',
  /^shv_live_[A-Za-z0-9_\-]{32,}$/.test(genVal), genVal.slice(0, 24));
adm.window.close();

const admBills = await boot('#/admin?tab=bills', { seed: seedAdm });
await until(() => admBills.doc.querySelector('.bsync-tag'), 12000);
ok('Admin -> In-store Bills tags auto-synced counter bills with .bsync-tag badge',
  /auto\s*·\s*billing/i.test(admBills.doc.querySelector('.bsync-tag').textContent),
  admBills.doc.querySelector('.bsync-tag').textContent);
admBills.window.close();

/* Void both bills (one via POST billing/bill-void, one via DELETE billing/bills/{externalId}) */
const void1 = await signedCall(SECRET, 'POST', 'billing/bill-void', { externalId: 'INV-2026-0901' });
const void2 = await signedCall(SECRET, 'DELETE', 'billing/bills/INV-2026-0902');
const goneCheck = await fetch(`${BASE}/api/store-bills/${BILL1_ID}/file/0`, {
  headers: { Authorization: 'Bearer ' + AARTI },
});
const emptyDesk = await apiJson('GET', '/api/admin/store-bills', null, adminH);
ok('POST billing/bill-void & DELETE billing/bills/{externalId} purge cancelled bills + PDFs cleanly',
  void1.status === 200 && void1.body.voided === 'INV-2026-0901' &&
  void2.status === 200 && void2.body.voided === 'INV-2026-0902' &&
  goneCheck.status === 404 && emptyDesk.body.count === 0,
  JSON.stringify({ void1: void1.body, void2: void2.body }));

/* Reset bridge secret so subsequent suites see a pristine unconfigured state */
const clearRes = await apiJson('PUT', '/api/settings', {
  billingSyncClear: true, billingAppUrl: '', billingWebhookUrl: '',
}, adminH);
ok('clearing billing sync key returns bridge cleanly to dark state',
  clearRes.status === 200 && clearRes.body.billingSyncConfigured === false);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
