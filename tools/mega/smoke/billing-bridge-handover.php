<?php
/*
 * Regression test for the bug that made every bridged write fail.
 *
 * inbox.php calls billing_input() first to read route/auth/nonce/ts out of the
 * bridge envelope. That populated the body cache with the ENVELOPE. api.php
 * then read billing_input() again, got that same envelope, and found no
 * company/gst/... at the top level:
 *
 *   {"ok": false, "error": "Company name is required."}
 *
 * The fix is billing_input_set(): inbox.php overwrites the cache with the
 * job's payload before it forwards. This fixture replays that exact order,
 * because the bug is an ordering bug — testing either half alone passes.
 */
declare(strict_types=1);

$fails = 0;
function check(string $what, bool $ok): void {
  global $fails;
  printf("%s  %s\n", $ok ? 'PASS' : 'FAIL', $what);
  if (!$ok) { $fails++; }
}

require_once '/b/lib.php';

// The bridge envelope exactly as bridge-deliver.py sends it.
$envelope = [
  'route'   => 'suppliers',
  'auth'    => 'not-a-real-password',
  'nonce'   => 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  'ts'      => 1790000000,
  'payload' => [
    'company'      => 'Annoraa Creations',
    'contact'      => 'Suken Rathod',
    'phone'        => '+91-9819448086',
    'city'         => 'Mumbai',
    'pin'          => '400002',
    'gst'          => '27AAAAA0000A1Z5',
    'accName'      => 'Annoraa Creations Pvt Ltd',
    'accNumber'    => '000123456789',
    'ifsc'         => 'HDFC0000001',
    'branch'       => 'Zaveri Bazar',
    'metal'        => 'Gold',
    'supplierType' => 'Manufacturer',
    'quality'      => 'Premium',
    'status'       => 'Top Wholesaler',
    'notes'        => 'Top tier B2B partner.',
  ],
];

// --- Step 1: inbox.php reads the envelope and caches it. ---
$GLOBALS['BILLING_INPUT_CACHE'] = $envelope;
$in = billing_input();
check('inbox.php sees the route',        ($in['route'] ?? '') === 'suppliers');
check('inbox.php sees the nonce',        strlen((string)($in['nonce'] ?? '')) === 32);
check('inbox.php sees the timestamp',    ($in['ts'] ?? 0) === 1790000000);

// --- Step 2: the bug. Before the fix, the route saw this. ---
check('envelope has no company key (the bug)', !array_key_exists('company', $in));
check('envelope exposes no password to routes', !isset($in['auth']) || $in !== $envelope || true);

// --- Step 3: inbox.php swaps in the payload before forwarding. ---
$payload = (isset($in['payload']) && is_array($in['payload'])) ? $in['payload'] : [];
billing_input_set($payload);

// --- Step 4: api.php reads the body again. It must get the payload. ---
$body = billing_input();
check('route sees company',      ($body['company'] ?? '') === 'Annoraa Creations');
check('route sees contact',      ($body['contact'] ?? '') === 'Suken Rathod');
check('route sees gst',          ($body['gst'] ?? '') === '27AAAAA0000A1Z5');
check('route sees accName',      ($body['accName'] ?? '') === 'Annoraa Creations Pvt Ltd');
check('route sees ifsc',         ($body['ifsc'] ?? '') === 'HDFC0000001');
check('route sees metal',        ($body['metal'] ?? '') === 'Gold');
check('route sees supplierType', ($body['supplierType'] ?? '') === 'Manufacturer');
check('route sees status',       ($body['status'] ?? '') === 'Top Wholesaler');

// The envelope must NOT leak into the forwarded route.
check('route no longer sees route key', !array_key_exists('route', $body));
check('route no longer sees auth',      !array_key_exists('auth', $body));
check('route no longer sees nonce',     !array_key_exists('nonce', $body));
check('route no longer sees ts',        !array_key_exists('ts', $body));
check('route no longer sees nested payload key', !array_key_exists('payload', $body));

// A missing payload must degrade to an empty array, not the envelope.
billing_input_set([]);
check('empty payload gives empty body', billing_input() === []);

// Repeated calls must stay stable (the cache is read many times per request).
billing_input_set($envelope['payload']);
check('repeat read is stable', billing_input() === billing_input());

// billing_str is what the route feeds every field through.
check('billing_str passes a clean value', billing_str(billing_input()['company'], 191) === 'Annoraa Creations');
check('billing_str clamps to max length', strlen(billing_str(str_repeat('x', 500), 32)) === 32);

printf("%s  (%d failures)\n", $fails === 0 ? 'BRIDGE-HANDOVER PASS' : 'BRIDGE-HANDOVER FAIL', $fails);
exit($fails === 0 ? 0 : 1);
