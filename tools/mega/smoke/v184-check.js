/* v184 — Cashfree settlement reconciliation regression gate.
   Behavioral checks stay active on later releases; the release/cache assertion
   follows the current matched build stamps. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const ROOT = path.resolve(__dirname, '../../..');
const rd = name => fs.readFileSync(path.join(CMS, name), 'utf8');
const index = rd('index.html'), app = rd('js/app.js'), sw = rd('sw.js');
const api = rd('api.php'), admin = rd('js/admin.js');
const rel = +(index.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0;
assert.ok(rel >= 184, `expected release 184 or later, found ${rel}`);
let pass = 0, fail = 0;
function test(id, name, fn) {
  try { fn(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

const homeStart = app.indexOf('  <!-- HOME CAMPAIGN ENTRY CARD -->');
const homeEnd = app.indexOf('  <div class="catbar-outer">', homeStart);
const campaignBlock = homeStart >= 0 && homeEnd > homeStart ? app.slice(homeStart, homeEnd) : '';

test('R01', 'page, app, worker, API and cache stamps move together for the current release', () => {
  assert.ok(index.includes(`window.__SHIVAA_REL=${rel};`));
  assert.ok(app.includes(`const APP_REL = ${rel};`));
  assert.ok(sw.includes(`const SHELL = 'shivaa-shell-v${rel}';`) && sw.includes(`const REL = ${rel};`));
  assert.ok(api.includes(`'rel'   => ${rel},`));
  assert.ok(!new RegExp(`\\?v=${rel - 1}(?:['"\\s)]|$)`).test(index), 'index has no previous-release asset URL');
  assert.ok(!new RegExp(`\\?v=${rel - 1}(?:['"\\s)]|$)`).test(sw), 'worker has no previous-release asset URL');
  assert.ok(index.includes(`/js/app.js?v=${rel}`));
  assert.ok(sw.includes(`'/js/app.js?v=${rel}'`));
  assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'unchanged media generation stays put');
  assert.ok(admin.includes('runCashfreeRecon'), 'new admin JS is reached through APP_REL loader');
  assert.ok(app.includes("injectScript('/js/admin.js?v=' + APP_REL)"));
});

test('R02', 'settlement call pins only its own current API version and keeps checkout on 2023-08-01', () => {
  assert.ok(api.includes("$cfg['apiVersion'] = '2026-01-01';"));
  assert.ok(api.includes("'apiVersion' => '2023-08-01'"), 'the standard Cashfree version is unchanged');
  assert.ok(api.includes("cashfree_call($cfg, 'POST', '/pg/settlement/recon'"));
});

test('R03', 'admin settlement request validates range/cursor and is read-only', () => {
  const start = api.indexOf("if ($route === 'admin/payments/settlements'");
  const end = api.indexOf("if ($route === 'admin/audit'", start);
  assert.ok(start >= 0 && end > start, 'route boundaries');
  const route = api.slice(start, end);
  assert.ok(route.includes('need_admin($db)'));
  assert.ok(route.includes('cashfree_reconciliation_date_valid($from)'));
  assert.ok(route.includes('cashfree_reconciliation_date_valid($to)'));
  assert.ok(route.includes('format(\'%a\') + 1 > 31'));
  assert.ok(route.includes("$cfg['apiVersion'] = '2026-01-01'"));
  assert.ok(route.includes('cashfree_settlement_recon_payload($from, $to, $cursor)'));
  assert.ok(route.includes("'hasMore' => $next !== ''"));
  assert.ok(route.includes("'rows' => $comparison['rows']"));
  assert.ok(!route.includes("'data' => $page['data']"), 'raw provider rows never go to the browser');
  assert.ok(!/db_save\(|audit_log\(/.test(route), 'no local write or side-effect audit log');
});

test('R04', 'settlement comparison matches provider payment ID and gross amount, never net settlement', () => {
  const start = api.indexOf('function cashfree_settlement_recon_compare');
  const end = api.indexOf('/* v139 ·', start);
  assert.ok(start >= 0 && end > start, 'comparison helper boundaries');
  const compare = api.slice(start, end);
  assert.ok(compare.includes("$payment['cf_payment_id']"));
  assert.ok(compare.includes("$order['order_id']"));
  assert.ok(compare.includes("$payment['payment_amount']"));
  assert.ok(compare.includes("$event['event_settlement_amount']"));
  assert.ok(compare.includes("'amount' => (int)($payment['amount'] ?? 0)"));
  assert.ok(compare.includes('abs($providerAmount - (float)$candidate[\'amount\']) > 0.01'));
  assert.ok(!compare.includes('customer_details') && !compare.includes('customer_email'));
  assert.ok(!compare.includes("$candidate['amount'] - $event['event_settlement_amount']"), 'event settlement amount is not compared to gross charge');
});

test('R05', 'Cashfree cursor payload and 10-row response are explicit', () => {
  const payloadStart = api.indexOf('function cashfree_settlement_recon_payload');
  const dateStart = api.indexOf('function cashfree_reconciliation_date_valid', payloadStart);
  const payload = api.slice(payloadStart, dateStart);
  assert.ok(payload.includes("'limit' => 10"));
  assert.ok(payload.includes("'cursor' => $cursor !== '' ? $cursor : null"));
  assert.ok(payload.includes("'start_date_processed_on' => $from . 'T00:00:00+05:30'"));
  assert.ok(payload.includes("'end_date_processed_on' => $to . 'T23:59:59+05:30'"));
  assert.ok(api.includes('function cashfree_settlement_recon_response(array $json): ?array'));
  assert.ok(api.includes('count($data) > 10'), 'oversized pages are rejected rather than truncated');
  assert.ok(api.includes("$page = cashfree_settlement_recon_response($json);"));
  assert.ok(api.includes("'cursor' => $cursor !== '' ? $cursor : null"));
  assert.ok(api.includes("$next = $page['cursor'];"));
});

test('R06', 'admin UI explains read-only scope and requires explicit cursor paging', () => {
  assert.ok(admin.includes('Cashfree settlement reconciliation'));
  assert.ok(admin.includes('Nothing in Cashfree or Shivaa is changed.'));
  assert.ok(admin.includes('Continue through every page'));
  assert.ok(admin.includes("new URLSearchParams({ from, to })"));
  assert.ok(admin.includes("q.set('cursor', cursor)"));
  assert.ok(admin.includes("const sameRange = document.getElementById('rpFrom')?.value === from && document.getElementById('rpTo')?.value === to;"));
  assert.ok(admin.includes("window.ShivaaAdmin.runCashfreeRecon(sameRange ? (r.cursor || '') : '')"));
  assert.ok(admin.includes('Missing from local ledger'));
  assert.ok(admin.includes('Gross payment'));
  assert.ok(admin.includes('Event settlement'));
  assert.ok(admin.includes('Settlement date / initiated'));
  assert.ok(admin.includes('Refund, dispute, and other non-payment events'));
});

test('R07', 'Gold Biscuit campaign card markup is unchanged', () => {
  assert.ok(campaignBlock.length > 0, 'campaign card block found');
  assert.equal(sha256(Buffer.from(campaignBlock)), '062bee45f2429f86ba34ea4678b8d71156003195e2bb1b852cb7dba64d12843b');
  const image = fs.readFileSync(path.join(CMS, 'images/banners/gold-biscuit-campaign.jpg'));
  assert.equal(sha256(image), 'b979aa9adfd0f2524af465b95f1f1c89534ef5d2275cf8d223067fa86b95286e');
});

test('R08', 'payment audit gate now verifies safe on-demand reconciliation and leaves owner-policy #27 alone', () => {
  const audit = fs.readFileSync(path.join(ROOT, 'tools/mega/smoke/pay-audit-check.js'), 'utf8');
  assert.ok(audit.includes('no read-only, admin-gated Cashfree settlement comparison is available'));
  assert.ok(audit.includes('owner still has to run every cursor page'));
  assert.ok(audit.includes("ok(27, 'redeemed points on an abandoned order are released only by a manual admin cancel'"));
});

console.log(`\nv184 regression: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
