<?php
// Shivaa.ecom — PayU Hosted Checkout gateway (fixed 2026-09-14)
// Drop-in replacement for the PayU block in cms/api.php (lines ~621-820).
// FIXES vs v94-108:
//  1) Address array access: $o['address']['phone'/'name'] (was ->phone on array, always fell back to placeholder)
//  2) Key/Salt validation relaxed: key 4-40 [_-]  salt any non-space non-pipe 8-128 (was rejecting many real salts)
//  3) Reconcile strict txnid match only (removed array_key_first fallback that could apply wrong txn)
//  4) Admin /pay-test probe now detects "Invalid key/hash" correctly (was checking only "not exist", missing "No Transaction Found")
//  5) Kept hash sequences exactly per PayU spec: request key|txnid|amount|productinfo|firstname|email|udf1-10|salt
//     response salt|status + 5 empties + udf5..udf1|email|firstname|productinfo|amount|txnid|key  (+ additionalCharges prefix)
//
// USAGE (minimal disturbance): require_once __DIR__.'/payu.gateway.fixed.php' near top of api.php
// and delete the old PayU function block there. No other routes are touched.

if (!function_exists('payu_cfg')) {
function payu_cfg(array $db): array {
  $s = $db['settings'] ?? [];
  $env = (($s['payuEnv'] ?? 'test') === 'prod') ? 'prod' : 'test';
  return [
    'key'    => trim((string)($s['payuKey'] ?? '')),
    'salt'   => trim((string)($s['payuSalt'] ?? '')),
    'env'    => $env,
    'action' => $env === 'prod' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment',
    'api'    => $env === 'prod' ? 'https://info.payu.in/merchant/postservice.php?form=2'
                                : 'https://test.payu.in/merchant/postservice.php?form=2',
  ];
}
}

if (!function_exists('payu_active_provider')) {
function payu_active_provider(array $db): string {
  $p = (string)($db['settings']['payProvider'] ?? 'demo');
  return in_array($p, ['demo', 'payu'], true) ? $p : 'demo';
}
}

if (!function_exists('payu_ready')) {
function payu_ready(array $db): bool {
  $c = payu_cfg($db);
  return payu_active_provider($db) === 'payu' && $c['key'] !== '' && $c['salt'] !== '';
}
}

if (!function_exists('payu_sanitize_txn')) {
function payu_sanitize_txn(string $v, int $max = 22): string {
  $v = preg_replace('#[^A-Za-z0-9_-]#', '', $v);
  return substr((string)$v, 0, $max);
}
}

if (!function_exists('payu_request_hash')) {
function payu_request_hash(array $cfg, array $f): string {
  $seq = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email',
          'udf1', 'udf2', 'udf3', 'udf4', 'udf5', 'udf6', 'udf7', 'udf8', 'udf9', 'udf10'];
  $str = implode('|', array_map(fn($k) => (string)($f[$k] ?? ''), $seq)) . '|' . $cfg['salt'];
  return strtolower(hash('sha512', $str));
}
}

if (!function_exists('payu_response_hash')) {
function payu_response_hash(array $cfg, array $p): string {
  $vals = [$cfg['salt'], (string)($p['status'] ?? ''), '', '', '', '', '',
           (string)($p['udf5'] ?? ''), (string)($p['udf4'] ?? ''), (string)($p['udf3'] ?? ''),
           (string)($p['udf2'] ?? ''), (string)($p['udf1'] ?? ''), (string)($p['email'] ?? ''),
           (string)($p['firstname'] ?? ''), (string)($p['productinfo'] ?? ''),
           (string)($p['amount'] ?? ''), (string)($p['txnid'] ?? ''), (string)($p['key'] ?? '')];
  $str = implode('|', $vals);
  if (!empty($p['additionalCharges'])) $str = (string)$p['additionalCharges'] . '|' . $str;
  return strtolower(hash('sha512', $str));
}
}

if (!function_exists('payu_postservice')) {
function payu_postservice(array $cfg, string $command, array $vars): array {
  if (!function_exists('curl_init')) return ['code' => 0, 'json' => null, 'raw' => 'curl missing'];
  $hashStr = $cfg['key'] . '|' . $command;
  foreach ($vars as $v) $hashStr .= '|' . (string)$v;
  $hashStr .= '|' . $cfg['salt'];
  $post = ['key' => $cfg['key'], 'command' => $command, 'hash' => strtolower(hash('sha512', $hashStr))];
  foreach (array_values($vars) as $n => $v) $post['var' . ($n + 1)] = (string)$v;
  $ch = curl_init($cfg['api']);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true, CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'],
    CURLOPT_POSTFIELDS => http_build_query($post),
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Shivaa/1.0)',
  ]);
  $raw = (string)curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $err = (string)curl_error($ch);
  curl_close($ch);
  return ['code' => $code, 'json' => json_decode($raw, true), 'raw' => $raw, 'err' => $err];
}
}

if (!function_exists('payu_verify_txn')) {
function payu_verify_txn(array $cfg, string $txnid): array {
  return payu_postservice($cfg, 'verify_payment', [$txnid]);
}
}

if (!function_exists('payu_find_order_index')) {
function payu_find_order_index(array $db, string $txnid): ?int {
  if ($txnid === '') return null;
  foreach ($db['orders'] ?? [] as $i => $o) {
    foreach (($o['payuAttempts'] ?? []) as $a) if (($a['txnid'] ?? '') === $txnid) return $i;
  }
  return null;
}
}

if (!function_exists('payu_apply')) {
function payu_apply(array &$db, int $i, array $t, string $txnid): array {
  $o = &$db['orders'][$i];
  $attempt = null;
  foreach (($o['payuAttempts'] ?? []) as $a) if (($a['txnid'] ?? '') === $txnid) { $attempt = $a; break; }
  if (!$attempt) return ['ok' => false, 'code' => 'ATTEMPT_NOT_FOUND'];
  $state = strtolower(trim((string)($t['status'] ?? '')));
  foreach (($o['payuAttempts'] ?? []) as &$aa) {
    if (($aa['txnid'] ?? '') === $txnid) {
      $aa['lastState'] = $state;
      if (!empty($t['mihpayid'])) $aa['mihpayid'] = (string)$t['mihpayid'];
      $aa['checkedAt'] = now_iso();
    }
  }
  unset($aa);
  if ($state === 'failure' || $state === 'failed') {
    $o['payuLastFailure'] = ['txnid' => $txnid, 'code' => (string)($t['error'] ?? $t['error_Message'] ?? 'FAILED'), 'at' => now_iso()];
    db_save($GLOBALS['DB_FILE'], $db);
    return ['ok' => false, 'code' => 'FAILED', 'state' => 'failed'];
  }
  if ($state !== 'success') return ['ok' => false, 'code' => 'PENDING', 'state' => $state];
  $paidRupees = (float)($t['net_amount_debit'] ?? $t['amount'] ?? 0);
  if ((int)round($paidRupees) !== (int)$attempt['amount'])
    return ['ok' => false, 'code' => 'AMOUNT_MISMATCH', 'expected' => (int)$attempt['amount'], 'got' => (int)round($paidRupees)];
  $mih = (string)($t['mihpayid'] ?? '');
  $ref = $mih !== '' ? $mih : $txnid;
  foreach (($o['payments'] ?? []) as $p) {
    if (($p['ref'] ?? '') === $ref || ($p['gatewayPaymentId'] ?? '') === $ref || ($p['ref'] ?? '') === $txnid)
      return ['ok' => true, 'already' => true, 'state' => 'success'];
  }
  if ((int)($o['amountPaid'] ?? 0) >= (int)($o['total'] ?? 0) && (int)($o['total'] ?? 0) > 0)
    return ['ok' => true, 'already' => true, 'state' => 'success'];
  order_add_payment($o, [
    'amount' => max(1, (int)round($paidRupees)), 'mode' => 'payu',
    'ref' => $ref, 'gatewayPaymentId' => $ref, 'at' => now_iso(), 'status' => 'approved',
    'instrument' => (string)($t['mode'] ?? $t['bank_name'] ?? ''),
  ]);
  $total = (int)($o['total'] ?? 0);
  $paid = (int)($o['amountPaid'] ?? 0);
  if ($paid >= $total && $total > 0) { $o['paymentStatus'] = 'Paid'; $o['paidAt'] = $o['paidAt'] ?? now_iso(); $o['balance'] = 0; }
  elseif ($paid > 0) { $o['paymentStatus'] = 'Partially paid'; $o['balance'] = max(0, $total - $paid); }
  $o['paymentRef'] = $ref; $o['gateway'] = 'payu'; $o['payuMihpayid'] = $ref;
  audit_log($db, 'payment.payu-paid', ['order' => $o['id'], 'amount' => (int)round($paidRupees), 'txnid' => $txnid, 'mih' => $mih]);
  db_save($GLOBALS['DB_FILE'], $db);
  return ['ok' => true, 'state' => 'success', 'ref' => $ref];
}
}

if (!function_exists('payu_apply_refund')) {
function payu_apply_refund(array &$db, int $i, array $resp, string $rfKey): array {
  $o = &$db['orders'][$i];
  $blob = strtolower(json_encode($resp));
  $done = strpos($blob, 'completed') !== false || preg_match('/refund[^\"]*success|success[^\"]*refund/', $blob) === 1;
  $failed = strpos($blob, 'refund failed') !== false || strpos($blob, '\"failed\"') !== false;
  $touched = false;
  foreach (($o['refunds'] ?? []) as $k => $r) {
    if (($r['payuRefundKey'] ?? '') === $rfKey) {
      $newState = $done ? 'COMPLETED' : ($failed ? 'FAILED' : ($r['state'] ?? 'PENDING'));
      $o['refunds'][$k] = array_merge($r, ['state' => $newState, 'updatedAt' => now_iso(),
        'status' => $newState === 'COMPLETED' ? 'accepted' : ($newState === 'FAILED' ? 'failed' : 'pending')]);
      $touched = true;
      if ($newState === 'FAILED') audit_log($db, 'payment.payu-refund-failed', ['order' => $o['id'], 'refund' => $rfKey]);
    }
  }
  if (!$touched) return ['ok' => false, 'code' => 'REFUND_NOT_FOUND'];
  $refundedDone = array_sum(array_map(fn($r) => ($r['status'] ?? '') === 'accepted' ? (int)($r['amount'] ?? 0) : 0, $o['refunds'] ?? []));
  $paid = (int)($o['amountPaid'] ?? 0);
  if ($done) {
    $o['paymentStatus'] = $refundedDone >= $paid && $paid > 0 ? 'Refunded' : 'Partially refunded';
    audit_log($db, 'payment.payu-refund-done', ['order' => $o['id'], 'refund' => $rfKey]);
  }
  db_save($GLOBALS['DB_FILE'], $db);
  return ['ok' => true, 'state' => $done ? 'COMPLETED' : ($failed ? 'FAILED' : 'PENDING')];
}
}

// VALIDATION helper for admin settings (use inside the settings PUT handler)
if (!function_exists('payu_validate_settings')) {
function payu_validate_settings(array &$setBody): void {
  if (array_key_exists('payuKey', $setBody)) {
    $v = trim((string)$setBody['payuKey']);
    if ($v !== '' && !preg_match('/^[A-Za-z0-9_\-]{4,40}$/', $v))
      jout(400, ['error' => 'PayU Merchant Key looks invalid (4–40 letters/numbers/_/- — copy exactly from the PayU dashboard; whitespace trimmed).']);
    $setBody['payuKey'] = $v;
  }
  if (array_key_exists('payuSalt', $setBody)) {
    $v = trim((string)$setBody['payuSalt']);
    if ($v === '') { unset($setBody['payuSalt']); }
    elseif (!preg_match('/^[^\s\|]{8,128}$/', $v))
      jout(400, ['error' => 'PayU Salt looks invalid (paste the full salt from the PayU dashboard — 8–128 non-space characters, no |).']);
    else $setBody['payuSalt'] = $v;
  }
}
}

// PAYU_RETURN + STATUS + PAY/ORDER helpers — include if you want fully isolated routes.
// In api.php these remain inline; this file documents the corrected snippets:
//
// PAY:ORDER (fixed address access):
//   $phoneRaw = (string)(($o['address']['phone'] ?? '') ?: ($u['phone'] ?? ''));
//   $name     = trim((string)(($o['address']['name'] ?? '') ?: ($u['name'] ?? '')));
//
// RECONCILE (strict):
//   $t = $details[$txnid] ?? null;   // no array_key_first fallback
//
// ADMIN PAY-TEST (fixed probe):
//   $blob = strtolower(($v['raw']??'') . ' ' . ($v['json']['msg']??'') . ' ' . ($v['json']['error']??''))
//   $hasInvalid = strpos($blob,'invalid key')!==false || strpos($blob,'invalid hash')!==false || strpos($blob,'authentication failed')!==false
//   $okCreds = is_array($v['json']) && !$hasInvalid && ($v['code']===200 || isset($v['json']['status']))
//
// See cms/api.php diff for exact inline patches.
