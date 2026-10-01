/* v184 — executed PHP 8.3 checks for the Cashfree settlements report.
   The fixture has no Cashfree credentials and performs no provider request;
   a successful merchant sandbox/production call remains untested here. */
const assert = require('node:assert/strict');
const { fixture, seed, ADMIN, MEMBER, fn, b64 } = require('./php-api-fixture');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v184 PHP harness deadline exceeded'); process.exit(1); }, 180000);
async function test(id, name, run) {
  try { await run(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}

(async () => {
  const F = await fixture();
  const db = seed();
  F.setDb(db);
  const route = 'admin/payments/settlements';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  await test('A01', 'settlement report is admin-only', async () => {
    assert.equal((await F.req('GET', route, {}, '', { from: today, to: today })).status, 403);
    assert.equal((await F.req('GET', route, {}, MEMBER, { from: today, to: today })).status, 403);
  });

  await test('A02', 'invalid calendar dates, reversed ranges, future dates and ranges over 31 days are rejected', async () => {
    for (const query of [
      { from: '2026-02-30', to: '2026-03-01' },
      { from: '2026-10-02', to: '2026-10-01' },
      { from: '2026-10-01', to: '2099-01-01' },
      { from: '2026-08-31', to: '2026-10-01' },
    ]) {
      const r = await F.req('GET', route, {}, ADMIN, query);
      assert.equal(r.status, 400, JSON.stringify(query) + ': ' + r.body);
    }
  });

  await test('A03', 'missing credentials fail closed before any provider call or database mutation', async () => {
    const before = await F.db();
    const r = await F.req('GET', route, {}, ADMIN, { from: today, to: today });
    assert.equal(r.status, 503);
    assert.match(r.json.error, /credentials are not configured/);
    assert.doesNotMatch(r.body, /qa169admin|qa169member|secret/i);
    assert.deepEqual(await F.db(), before);
  });

  await test('A04', 'settlement-recon date filters, cursor envelope and nested response shape match the documented contract', async () => {
    const source = [fn('cashfree_settlement_recon_payload'), fn('cashfree_reconciliation_date_valid'), fn('cashfree_settlement_recon_response')]
      .map(s => `eval(base64_decode('${b64(s)}'));`).join('\n');
    const payload = await F.run(`${source}
$p0 = cashfree_settlement_recon_payload('2026-10-01', '2026-10-03');
$p1 = cashfree_settlement_recon_payload('2026-10-01', '2026-10-03', 'next+cursor/=');
$sample = ['event_details'=>['event_type'=>'PAYMENT'],'order_details'=>['order_id'=>'cf-1'],
  'payment_details'=>['cf_payment_id'=>'pay-1'],'settlement_details'=>['cf_settlement_id'=>'set-1'],
  'customer_details'=>['customer_email'=>'private@example.invalid']];
$valid = cashfree_settlement_recon_response(['cursor'=>'next==','limit'=>1,'data'=>[$sample]]);
$badObject = cashfree_settlement_recon_response(['cursor'=>'x','data'=>['row'=>$sample]]);
$badRow = cashfree_settlement_recon_response(['cursor'=>'x','data'=>[null]]);
$badCursor = cashfree_settlement_recon_response(['cursor'=>"bad\\npage",'data'=>[]]);
echo json_encode(['p0'=>$p0,'p1'=>$p1,'valid'=>$valid,'badObject'=>$badObject,'badRow'=>$badRow,'badCursor'=>$badCursor,'date'=>[
  cashfree_reconciliation_date_valid('2026-02-28'),
  cashfree_reconciliation_date_valid('2026-02-29'),
  cashfree_reconciliation_date_valid('2028-02-29'),
  cashfree_reconciliation_date_valid('2026-1-01')
]], JSON_UNESCAPED_SLASHES);`);
    assert.equal(payload.status, 200, payload.body);
    assert.equal(payload.json.p0.pagination.limit, 10);
    assert.equal(payload.json.p0.pagination.cursor, null);
    assert.equal(payload.json.p0.filters.start_date_processed_on, '2026-10-01T00:00:00+05:30');
    assert.equal(payload.json.p0.filters.end_date_processed_on, '2026-10-03T23:59:59+05:30');
    assert.equal(payload.json.p1.pagination.cursor, 'next+cursor/=');
    assert.equal(payload.json.valid.cursor, 'next==');
    assert.equal(payload.json.valid.data.length, 1);
    assert.equal(payload.json.valid.data[0].payment_details.cf_payment_id, 'pay-1');
    assert.equal(payload.json.badObject, null);
    assert.equal(payload.json.badRow, null);
    assert.equal(payload.json.badCursor, null);
    assert.deepEqual(payload.json.date, [true, false, true, false]);
  });

  await test('A05', 'provider rows reconcile by payment ID and gross amount; unmatched, duplicates, overpayments and legacy rows are surfaced', async () => {
    const local = seed();
    local.orders = [
      { id: 'SHV-1', cfAttempts: [{ cfOrderId: 'cf-order-1' }], payments: [
        { mode: 'cashfree', status: 'approved', amount: 1000, cfPaymentId: 'pay-1', ref: 'cf-order-1', gatewayPaymentId: 'cf-order-1' },
      ] },
      { id: 'SHV-2', cfAttempts: [{ cfOrderId: 'cf-order-2' }], payments: [
        { mode: 'cashfree', status: 'approved', amount: 400, cfPaymentId: 'pay-2', ref: 'cf-order-2', gatewayPaymentId: 'cf-order-2' },
      ] },
      { id: 'SHV-LEGACY', cfAttempts: [{ cfOrderId: 'cf-order-legacy' }], payments: [
        { mode: 'cashfree', status: 'approved', amount: 300, cfPaymentId: '', ref: 'cf-order-legacy', gatewayPaymentId: 'cf-order-legacy' },
      ] },
      { id: 'SHV-OVER', cfAttempts: [{ cfOrderId: 'cf-order-over' }], payments: [], overpayments: [
        { cfOrderId: 'cf-order-over', cfPaymentId: 'pay-over', amount: 500, state: 'UNREFUNDED' },
      ] },
      { id: 'SHV-DUP-A', cfAttempts: [{ cfOrderId: 'cf-order-dup-a' }], payments: [
        { mode: 'cashfree', status: 'approved', amount: 200, cfPaymentId: 'pay-dup', ref: 'cf-order-dup-a' },
      ] },
      { id: 'SHV-DUP-B', cfAttempts: [{ cfOrderId: 'cf-order-dup-b' }], payments: [
        { mode: 'cashfree', status: 'approved', amount: 200, cfPaymentId: 'pay-dup', ref: 'cf-order-dup-b' },
      ] },
      { id: 'SHV-MULTI', cfAttempts: [{ cfOrderId: 'cf-multi-a' }, { cfOrderId: 'cf-multi-b' }], payments: [
        { mode: 'cashfree', status: 'approved', amount: 700, cfPaymentId: 'pay-multi-a', ref: 'cf-multi-a' },
      ] },
    ];
    const reconRow = (eventId, eventType, cfPaymentId, cfOrderId, amount, settlementAmount = amount) => ({
      customer_details: { customer_email: 'private@example.invalid', customer_phone: '9876500000' },
      event_details: { entity: 'recon', event_id: eventId, event_type: eventType, event_status: 'SUCCESS',
        event_amount: amount, event_currency: 'INR', event_settlement_amount: settlementAmount,
        event_remarks: 'private-provider-remark' },
      order_details: { order_id: cfOrderId, order_amount: amount, order_currency: 'INR',
        order_tags: { customer_private_tag: 'do-not-return' } },
      payment_details: { cf_payment_id: cfPaymentId, payment_amount: amount, payment_currency: 'INR',
        payment_time: '2026-10-01T12:00:00+05:30', payment_group: 'UPI', status: 'SUCCESS' },
      refund_details: [{ refund_id: 'private-refund-id', refund_arn: 'private-refund-arn' }],
      settlement_details: { cf_settlement_id: 'set-' + eventId, settlement_utr: 'UTR-' + eventId,
        settlement_date: '2026-10-01T12:05:00+05:30', settlement_initiated_on: '2026-10-01T12:04:00+05:30' },
    });
    const fallbackRow = reconRow('e8', 'PAYMENT', 'pay-over', 'cf-order-over', 500, 485);
    fallbackRow.payment_details.payment_amount = null;
    const pendingRow = reconRow('e11', 'PAYMENT', 'pay-1', 'cf-order-1', 1000, 970);
    pendingRow.event_details.event_status = 'PENDING';
    const unknownOrderRow = reconRow('e12', 'PAYMENT', 'pay-1', 'cf-order-unknown', 1000, 970);
    const missingOrderRow = reconRow('e13', 'PAYMENT', 'pay-1', '', 1000, 970);
    const rows = [
      reconRow('e1', 'PAYMENT', 'pay-1', 'cf-order-1', 1000, 970),
      reconRow('e2', 'PAYMENT', 'pay-2', 'cf-order-2', 401, 388),
      reconRow('e3', 'PAYMENT', 'pay-missing', 'cf-order-2', 400, 388),
      reconRow('e4', 'PAYMENT', 'pay-unknown', 'cf-order-unknown', 100, 97),
      reconRow('e5', 'PAYMENT', 'pay-legacy', 'cf-order-legacy', 300, 290),
      reconRow('e6', 'PAYMENT', 'pay-dup', 'cf-order-dup-a', 200, 190),
      reconRow('e7', 'PAYMENT', 'pay-1', 'cf-order-2', 1000, 970),
      fallbackRow,
      reconRow('e9', 'PAYMENT', 'pay-multi-a', 'cf-multi-b', 700, 670),
      reconRow('e10', 'REFUND', 'pay-1', 'cf-order-1', 100, 100),
      pendingRow,
      unknownOrderRow,
      missingOrderRow,
    ];
    const source = fn('cashfree_settlement_recon_compare');
    const result = await F.run(`eval(base64_decode('${b64(source)}'));
$db = json_decode(base64_decode('${b64(JSON.stringify(local))}'), true);
$rows = json_decode(base64_decode('${b64(JSON.stringify(rows))}'), true);
echo json_encode(cashfree_settlement_recon_compare($db, $rows), JSON_UNESCAPED_SLASHES);`);
    assert.equal(result.status, 200, result.body);
    const d = result.json;
    assert.deepEqual(d.rows.map(row => row.status), [
      'matched', 'amount_mismatch', 'missing_local', 'missing_local',
      'legacy_match', 'ambiguous', 'order_mismatch', 'matched', 'order_mismatch', 'needs_review', 'needs_review',
      'needs_review', 'needs_review',
    ]);
    assert.equal(d.rows[0].localOrderId, 'SHV-1');
    assert.equal(d.rows[0].paymentAmount, 1000);
    assert.equal(d.rows[0].settlementAmount, 970, 'event settlement amount remains separate from gross payment');
    assert.equal(d.rows[0].settlementUtr, 'UTR-e1');
    assert.equal(d.rows[0].eventType, 'PAYMENT');
    assert.equal(d.rows[4].localOrderId, 'SHV-LEGACY');
    assert.equal(d.rows[7].localOrderId, 'SHV-OVER');
    assert.equal(d.rows[7].paymentAmount, 500, 'successful PAYMENT events may fall back to event_amount when payment_amount is null');
    assert.equal(d.rows[8].localOrderId, 'SHV-MULTI');
    assert.equal(d.rows[9].status, 'needs_review', 'refund event is not auto-matched as a payment');
    assert.equal(d.rows[10].status, 'needs_review', 'pending PAYMENT events are not treated as completed payments');
    assert.equal(d.rows[11].status, 'needs_review', 'an exact payment ID with an unlinked Cashfree order is not auto-matched');
    assert.equal(d.rows[12].status, 'needs_review', 'a missing Cashfree order ID needs manual verification');
    assert.deepEqual(d.summary, { rows: 13, matched: 2, amountMismatches: 1, missingLocal: 2, needsReview: 11 });
    assert.doesNotMatch(result.body, /private@example|9876500000|customer_details|customer_email|customer_phone|customer_private_tag|do-not-return|private-provider-remark|private-refund-id|refund_details|order_tags|event_remarks/);
  });

  await test('A06', 'provider responses larger than the requested page are rejected, not silently truncated', async () => {
    const source = fn('cashfree_settlement_recon_response');
    const rows = Array.from({ length: 12 }, (_, i) => ({ event_details: { event_id: 'e' + i } }));
    const result = await F.run(`eval(base64_decode('${b64(source)}'));
$rows = json_decode(base64_decode('${b64(JSON.stringify(rows))}'), true);
echo json_encode(cashfree_settlement_recon_response(['cursor'=>'next','limit'=>10,'data'=>$rows]), JSON_UNESCAPED_SLASHES);`);
    assert.equal(result.status, 200, result.body);
    assert.equal(result.json, null);
  });

  console.log(`\nv184 PHP regression: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
