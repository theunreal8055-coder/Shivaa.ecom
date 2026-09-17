<?php
/* ═══════════════════════════════════════════════════════════════════════════
   Shivaa.ecom — SBIePay (State Bank of India payment gateway) — v128
   Hosted-checkout integration, written to the SBIePay merchant spec used by
   the published integration kits:

     • POST  https://sbiepay.sbi/secure/AggregatorHostedListener        (live)
       POST  https://test.sbiepay.sbi/secure/AggregatorHostedListener   (UAT)
       form fields:  EncryptTrans, merchIdVal[, MultiAccountInstructionDtls]
     • EncryptTrans = base64( AES-128-CBC( pipe-string, key = seller key,
                      IV = first 16 chars of the seller key, PKCS#7 ) )
     • pipe-string  = merchantId|operatingMode|country|currency|amount|
                      otherInfo|successUrl|failUrl|aggregatorId|
                      merchantOrderNo|merchantCustomerId|payMode|
                      accessMedium|transactionSource
     • SBI returns the customer to successUrl/failUrl and (server-to-server)
       posts the result; the result pipe is decrypted with the same key and,
       critically, is NEVER trusted on its own — this module always re-asks
       SBI's status API before a single rupee is credited to the ledger.
     • status  POST  {queryRequest, aggregatorId, merchantId}
       queryRequest = sbiTransactionId|merchantId|merchantOrderNo|amount
     • refund  POST  {refundRequest, aggregatorId, merchantId}   (endpoint
       kept here for a future pass — v128 raises SBI refunds in the SBIePay
       merchant dashboard; see docs/SBI-EPAY-INTEGRATION.md §8)

   DORMANT BY DESIGN: nothing here runs unless Admin → Payments sets
   Payment provider = SBIePay and the Merchant ID + Seller Key are saved.
   All functions are guarded with function_exists() so the drop-in can be
   required from api.php without touching any other provider.

   Requires PHP 7.2+ with openssl + curl (both standard on Hostinger).
   ═══════════════════════════════════════════════════════════════════════════ */

if (!function_exists('sbiepay_cfg')) {
function sbiepay_cfg(array $db): array {
  $s = $db['settings'] ?? [];
  $env = (($s['sbiEnv'] ?? 'uat') === 'prod') ? 'prod' : 'uat';
  return [
    'merchant_id'   => trim((string)($s['sbiMerchantId'] ?? '')),
    'seller_key'    => trim((string)($s['sbiSellerSecret'] ?? '')),   // AES key + IV source
    'aggregator_id' => trim((string)($s['sbiAggregatorId'] ?? '')) ?: 'SBIEPAY',
    'account_id'    => trim((string)($s['sbiAccountId'] ?? '')) ?: 'NEFT',
    'env'           => $env,
    'action'        => $env === 'prod'
                        ? 'https://sbiepay.sbi/secure/AggregatorHostedListener'
                        : 'https://test.sbiepay.sbi/secure/AggregatorHostedListener',
    'status_api'    => $env === 'prod'
                        ? 'https://sbiepay.sbi/payagg/statusQuery/getStatusQuery'
                        : 'https://test.sbiepay.sbi/payagg/statusQuery/getStatusQuery',
    'refund_api'    => $env === 'prod'
                        ? 'https://sbiepay.sbi/payagg/orderRefundCancellation/bookRefundCancellation'
                        : 'https://test.sbiepay.sbi/payagg/orderRefundCancellation/bookRefundCancellation',
  ];
}
}

if (!function_exists('sbiepay_ready')) {
function sbiepay_ready(array $db): bool {
  $p = (string)($db['settings']['payProvider'] ?? 'demo');
  if ($p !== 'sbiepay') return false;
  $c = sbiepay_cfg($db);
  return $c['merchant_id'] !== '' && strlen($c['seller_key']) >= 8;
}
}

/* SBI order numbers are alphanumeric; order ids look like SHV-XXXX so the
   dash is stripped before the value travels to the bank. */
if (!function_exists('sbiepay_clean_id')) {
function sbiepay_clean_id(string $v, int $max = 24): string {
  $v = preg_replace('#[^A-Za-z0-9]#', '', $v);
  return substr((string)$v, 0, $max);
}
}

if (!function_exists('sbiepay_amount_str')) {
function sbiepay_amount_str($rupees): string {
  return number_format((float)$rupees, 2, '.', '');
}
}

if (!function_exists('sbiepay_encrypt')) {
function sbiepay_encrypt(array $cfg, string $plain): ?string {
  $key = (string)$cfg['seller_key'];
  if ($key === '' || !function_exists('openssl_encrypt')) return null;
  $iv = substr($key, 0, 16);
  $raw = openssl_encrypt($plain, 'AES-128-CBC', $key, OPENSSL_RAW_DATA, $iv);
  return $raw === false ? null : base64_encode($raw);
}
}

if (!function_exists('sbiepay_decrypt')) {
function sbiepay_decrypt(array $cfg, string $b64): ?string {
  $key = (string)$cfg['seller_key'];
  if ($key === '' || $b64 === '' || !function_exists('openssl_decrypt')) return null;
  $bin = base64_decode(str_replace(' ', '+', $b64), true);
  if ($bin === false) return null;
  $iv = substr($key, 0, 16);
  $plain = openssl_decrypt($bin, 'AES-128-CBC', $key, OPENSSL_RAW_DATA, $iv);
  return is_string($plain) ? $plain : null;
}
}

if (!function_exists('sbiepay_pipe')) {
function sbiepay_pipe(array $parts): string {
  return implode('|', array_map(static function ($v) { return (string)$v; }, $parts));
}
}

/* The exact field order the hosted listener expects (published integration
   kits agree: vidyabhawan sample + Jagdish-J-P/sbi-pay PaymentRequestMessage). */
if (!function_exists('sbiepay_request_pipe')) {
function sbiepay_request_pipe(array $cfg, array $a): string {
  return sbiepay_pipe([
    $cfg['merchant_id'],
    (string)($a['operating_mode'] ?? 'DOM'),
    (string)($a['country'] ?? 'IN'),
    (string)($a['currency'] ?? 'INR'),
    (string)($a['amount'] ?? '0.00'),
    (string)($a['other_info'] ?? 'Shivaa order'),
    (string)($a['success_url'] ?? ''),
    (string)($a['fail_url'] ?? ''),
    (string)($cfg['aggregator_id']),
    (string)($a['merchant_order_no'] ?? ''),
    (string)($a['customer_id'] ?? 'NA'),
    (string)($a['pay_mode'] ?? 'NB'),          // NB = net banking/card page (default all-channels)
    (string)($a['access_medium'] ?? 'ONLINE'),
    (string)($a['transaction_source'] ?? 'ONLINE'),
  ]);
}
}

/* Form fields the browser POSTs to the SBI hosted page. */
if (!function_exists('sbiepay_form_fields')) {
function sbiepay_form_fields(array $cfg, array $a): array {
  $enc = sbiepay_encrypt($cfg, sbiepay_request_pipe($cfg, $a));
  if ($enc === null) return [];
  $fields = ['EncryptTrans' => $enc, 'merchIdVal' => (string)$cfg['merchant_id']];
  /* Only when a merchant is configured with several collection accounts:
     one row per account as amount|currency|identifier, rows joined with ||. */
  if (!empty($a['multi_accounts']) && is_array($a['multi_accounts'])) {
    $rows = [];
    foreach ($a['multi_accounts'] as $row) $rows[] = sbiepay_pipe($row);
    $mEnc = sbiepay_encrypt($cfg, implode('||', $rows));
    if ($mEnc !== null) $fields['MultiAccountInstructionDtls'] = $mEnc;
  }
  return $fields;
}
}

/* Response / status field order published by SBI (and in the kits). */
if (!function_exists('sbiepay_response_fields')) {
function sbiepay_response_fields(): array {
  return ['merchant_order_no', 'sbi_transaction_id', 'transaction_status', 'amount',
    'currency', 'pay_mode', 'extra_details', 'reason', 'bank_code', 'bank_reference_number',
    'transaction_date', 'country', 'CIN', 'merchant_id', 'total_fees',
    'ref1', 'ref2', 'ref3', 'ref4', 'ref5', 'ref6', 'ref7', 'ref8', 'ref9'];
}
function sbiepay_status_fields(): array {
  return ['merchant_id', 'sbi_transaction_id', 'transaction_status', 'country', 'currency',
    'extra_details', 'merchant_order_no', 'amount', 'reason', 'bank_code', 'bank_reference_number',
    'transaction_date', 'pay_mode', 'CIN', 'merchant_id', 'total_fees',
    'ref1', 'ref2', 'ref3', 'ref4', 'ref5', 'ref6', 'ref7', 'ref8', 'ref9', 'na'];
}
function sbiepay_refund_fields(): array {
  return ['merchant_id', 'sbi_transaction_id', 'sbi_refund_transaction_id', 'transaction_status',
    'reason', 'refund_order_no', 'merchant_order_no', 'extra'];
}
}

if (!function_exists('sbiepay_parse_pipe')) {
function sbiepay_parse_pipe(string $pipe, array $names): array {
  $out = [];
  $parts = explode('|', $pipe);
  foreach ($names as $i => $name) {
    if ($name === '' || $name === 'na' || $name === 'extra') continue;
    if (!array_key_exists($i, $parts)) break;
    if (!array_key_exists($name, $out)) $out[$name] = trim((string)$parts[$i]);
  }
  $out['_raw'] = $pipe;
  return $out;
}
}

if (!function_exists('sbiepay_post')) {
function sbiepay_post(string $url, array $params, int $timeout = 25): array {
  if (!function_exists('curl_init')) return ['code' => 0, 'raw' => '', 'err' => 'curl missing'];
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true, CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded', 'Accept: text/plain, */*'],
    CURLOPT_POSTFIELDS => http_build_query($params),
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Shivaa/1.0)',
  ]);
  $raw = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $err = (string)curl_error($ch);
  curl_close($ch);
  return ['code' => $code, 'raw' => (string)$raw, 'err' => $err];
}
}

/* Server-to-server truth. This is the ONLY thing that can mark an order paid. */
if (!function_exists('sbiepay_status_query')) {
function sbiepay_status_query(array $cfg, string $sbiTxnId, string $merchantOrderNo, string $amount): array {
  $q = sbiepay_pipe([$sbiTxnId, $cfg['merchant_id'], $merchantOrderNo, $amount]);
  $res = sbiepay_post($cfg['status_api'], [
    'queryRequest' => $q, 'aggregatorId' => $cfg['aggregator_id'], 'merchantId' => $cfg['merchant_id'],
  ]);
  $raw = trim((string)$res['raw']);
  $map = [];
  if ($raw !== '' && strpos($raw, '|') !== false && stripos($raw, '<html') === false) {
    $map = sbiepay_parse_pipe($raw, sbiepay_status_fields());
  }
  return ['ok' => $res['code'] === 200 && !empty($map), 'code' => $res['code'], 'raw' => $raw,
          'err' => $res['err'], 'map' => $map,
          'plain' => ($map === [] && $raw !== '') ? $raw : ''];
}
}

/* Read whichever shape SBI posted back to us and normalise it to one map.
   Accepted: EncryptTrans / encData / EncryptedResponse (encrypted pipe), an
   already-plain pipe body, or plain fields (some S2S confirmations). */
if (!function_exists('sbiepay_extract_return')) {
function sbiepay_extract_return(array $cfg, array $post, string $rawBody = ''): array {
  $blob = '';
  $source = 'none';
  foreach (['EncryptTrans', 'encData', 'EncryptedResponse', 'encryptedResponse', 'encTrans', 'response'] as $k) {
    if (!empty($post[$k]) && is_string($post[$k])) { $blob = $post[$k]; $source = $k; break; }
  }
  if ($blob === '' && $rawBody !== '') {
    $rawBody = trim($rawBody);
    if ($rawBody !== '' && strpos($rawBody, '=') === false && strpos($rawBody, '|') !== false) {
      $blob = $rawBody; $source = 'body';
    }
  }
  if ($blob !== '') {
    $plain = sbiepay_decrypt($cfg, $blob);
    if ($plain === null && strpos($blob, '|') !== false) $plain = $blob;   // already plain
    if (is_string($plain) && strpos($plain, '|') !== false) {
      return ['map' => sbiepay_parse_pipe($plain, sbiepay_response_fields()),
              'pipe' => $plain, 'source' => $source];
    }
    return ['map' => [], 'pipe' => '', 'source' => $source . ':undecryptable'];
  }
  $plainKeys = ['merchant_order_no', 'sbi_transaction_id', 'transaction_status', 'status', 'txn_status'];
  foreach ($plainKeys as $k) {
    if (!empty($post[$k])) {
      $m = [];
      foreach (sbiepay_response_fields() as $f) if (isset($post[$f])) $m[$f] = trim((string)$post[$f]);
      if (isset($post['status']) && !isset($m['transaction_status'])) $m['transaction_status'] = trim((string)$post['status']);
      if (isset($post['txn_status']) && !isset($m['transaction_status'])) $m['transaction_status'] = trim((string)$post['txn_status']);
      if (!isset($m['_raw'])) $m['_raw'] = http_build_query($post);
      return ['map' => $m, 'pipe' => '', 'source' => 'plain'];
    }
  }
  return ['map' => [], 'pipe' => '', 'source' => 'none'];
}
}

if (!function_exists('sbiepay_find_order_index')) {
function sbiepay_find_order_index(array $db, string $merchantOrderNo): ?int {
  if ($merchantOrderNo === '') return null;
  foreach ($db['orders'] ?? [] as $i => $o) {
    foreach (($o['sbiAttempts'] ?? []) as $a) {
      if ((string)($a['merchantOrderNo'] ?? '') === $merchantOrderNo) return $i;
    }
  }
  /* Fall back to the order id without the -A<n> suffix (id itself may contain
     the dash we stripped, so compare stripped forms too). */
  $base = preg_replace('#A\d+$#', '', $merchantOrderNo);
  foreach ($db['orders'] ?? [] as $i => $o) {
    if (sbiepay_clean_id((string)($o['id'] ?? ''), 24) === $base) return $i;
  }
  return null;
}
}

if (!function_exists('sbiepay_attempt')) {
function sbiepay_attempt(array $o, string $merchantOrderNo): ?array {
  foreach (($o['sbiAttempts'] ?? []) as $a) {
    if ((string)($a['merchantOrderNo'] ?? '') === $merchantOrderNo) return $a;
  }
  return null;
}
}

/* Credit the ledger from a verified SBI result map. Mirrors payu_apply():
   idempotent, amount-checked, audit-logged. */
if (!function_exists('sbiepay_apply')) {
function sbiepay_apply(array &$db, int $i, array $m, string $merchantOrderNo): array {
  $o = &$db['orders'][$i];
  $attempt = sbiepay_attempt($o, $merchantOrderNo);
  if (!$attempt) return ['ok' => false, 'code' => 'ATTEMPT_NOT_FOUND'];
  $state = strtoupper(trim((string)($m['transaction_status'] ?? '')));
  $txn = (string)($m['sbi_transaction_id'] ?? '');
  foreach (($o['sbiAttempts'] ?? []) as &$aa) {
    if ((string)($aa['merchantOrderNo'] ?? '') === $merchantOrderNo) {
      $aa['lastState'] = $state !== '' ? strtolower($state) : 'unknown';
      if ($txn !== '') $aa['sbiTxnId'] = $txn;
      $aa['checkedAt'] = now_iso();
    }
  }
  unset($aa);
  if ($state === 'FAIL' || $state === 'FAILED' || $state === 'FAILURE') {
    $o['sbiLastFailure'] = ['order' => $merchantOrderNo, 'code' => (string)($m['reason'] ?? 'FAILED'), 'at' => now_iso()];
    db_save($GLOBALS['DB_FILE'], $db);
    return ['ok' => false, 'code' => 'FAILED', 'state' => 'failed'];
  }
  if ($state !== 'SUCCESS') return ['ok' => false, 'code' => 'PENDING', 'state' => strtolower($state)];
  $paid = (float)($m['amount'] ?? 0);
  if ((int)round($paid) !== (int)$attempt['amount']) {
    audit_log($db, 'payment.sbiepay-amount-mismatch',
      ['order' => $o['id'], 'expected' => (int)$attempt['amount'], 'got' => (int)round($paid)]);
    return ['ok' => false, 'code' => 'AMOUNT_MISMATCH', 'expected' => (int)$attempt['amount'], 'got' => (int)round($paid)];
  }
  $ref = $txn !== '' ? $txn : $merchantOrderNo;
  foreach (($o['payments'] ?? []) as $p) {
    if (($p['ref'] ?? '') === $ref || ($p['gatewayPaymentId'] ?? '') === $ref || ($p['ref'] ?? '') === $merchantOrderNo)
      return ['ok' => true, 'already' => true, 'state' => 'success'];
  }
  if ((int)($o['amountPaid'] ?? 0) >= (int)($o['total'] ?? 0) && (int)($o['total'] ?? 0) > 0)
    return ['ok' => true, 'already' => true, 'state' => 'success'];
  order_add_payment($o, [
    'amount' => max(1, (int)round($paid)), 'mode' => 'sbiepay',
    'ref' => $ref, 'gatewayPaymentId' => $ref, 'at' => now_iso(), 'status' => 'approved',
    'instrument' => (string)($m['pay_mode'] ?? '') . (($m['bank_code'] ?? '') !== '' ? ' · ' . (string)$m['bank_code'] : ''),
  ]);
  $total = (int)($o['total'] ?? 0);
  $paidNow = (int)($o['amountPaid'] ?? 0);
  if ($paidNow >= $total && $total > 0) { $o['paymentStatus'] = 'Paid'; $o['paidAt'] = $o['paidAt'] ?? now_iso(); $o['balance'] = 0; }
  elseif ($paidNow > 0) { $o['paymentStatus'] = 'Partially paid'; $o['balance'] = max(0, $total - $paidNow); }
  $o['paymentRef'] = $ref; $o['gateway'] = 'sbiepay'; $o['sbiTxnId'] = $ref;
  audit_log($db, 'payment.sbiepay-paid', [
    'order' => $o['id'], 'amount' => (int)round($paid), 'sbi_txn' => $txn,
    'order_no' => $merchantOrderNo, 'bank_ref' => (string)($m['bank_reference_number'] ?? ''),
  ]);
  db_save($GLOBALS['DB_FILE'], $db);
  return ['ok' => true, 'state' => 'success', 'ref' => $ref];
}
}

/* Human-readable reason for the return page / ticker. */
if (!function_exists('sbiepay_reason')) {
function sbiepay_reason(array $m): string {
  $r = trim((string)($m['reason'] ?? ''));
  $s = strtoupper(trim((string)($m['transaction_status'] ?? '')));
  if ($s === 'SUCCESS') return 'Payment received';
  if ($r !== '' && $r !== 'NA') return $r;
  return $s === 'FAIL' ? 'Payment failed' : 'Payment pending';
}
}
