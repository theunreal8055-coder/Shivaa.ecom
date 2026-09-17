<?php
/* ═══════════════════════════════════════════════════════════════════════════
   Shivaa.ecom — SBIePay gateway self-test (v128)

   Run on any machine that has PHP (your Hostinger shell, a laptop, or a CI
   runner):

       php tools/sbi-selftest.php

   It proves the three things that must be exactly right before a rupee can
   move through SBIePay, without needing SBI credentials:

     1. the AES-128-CBC / base64 encryption matches the published integration
        vector (a fixed key + payload with a known ciphertext produced by an
        independent implementation), so a uat/live payment page will accept
        EncryptTrans;
     2. the request pipe carries the 14 fields in SBI's exact order;
     3. the response/status/refund pipe parsers map the right field names, and
        an encrypted return payload is read back to the same order.

   Exit code 0 = all green. Any failure prints FAIL and exits 1.
   ═══════════════════════════════════════════════════════════════════════════ */

if (PHP_SAPI !== 'cli') { http_response_code(403); exit("CLI only\n"); }
require_once __DIR__ . '/../cms/sbiepay.gateway.php';

$pass = 0; $fail = 0;
function chk(string $name, bool $ok, string $extra = ''): void {
  global $pass, $fail;
  if ($ok) { $pass++; echo "  PASS  $name\n"; }
  else { $fail++; echo "  FAIL  $name" . ($extra !== '' ? "  ($extra)" : '') . "\n"; }
}

echo "Shivaa · SBIePay gateway self-test (v128)\n";
echo "php " . PHP_VERSION . " · openssl " . (function_exists('openssl_encrypt') ? 'yes' : 'NO') . " · curl " . (function_exists('curl_init') ? 'yes' : 'NO') . "\n\n";

/* ── fixed reference vector (seller key + request pipe → ciphertext) ── */
$KEY   = 'ABC123DEF456GH78';
$PLAIN = 'M1234567|DOM|IN|INR|1000.00|Shivaa order SHV-1001|https://shivaa.in/api/pay/sbiepay/return|https://shivaa.in/api/pay/sbiepay/return|SBIEPAY|SHV-1001-A1|NA|NB|ONLINE|ONLINE';
$B64   = 'lFKXwGXdbF16TMLoPm3tpnu3L1qudF6F8xErQfrJFDONkhkPmKmaCLZOltsvpgceZl4fOhneVN/NuiFF1Z3Y/Xln/bC5cV3Np5qTN2sH33jQ+9GS6yilkRwSHgl8z37MMq/Dyu9nhpXeiI7zqX/dehkZoA9BitcoqdrIJS2Q/tpkdS65m7KRvJSQv/ivSXyoOZSfIIuAChUi79pAGZUYCZ6wrY8bqgsVx6K0Tzf7izk=';

$cfg = [
  'merchant_id' => 'M1234567', 'seller_key' => $KEY, 'aggregator_id' => 'SBIEPAY',
  'account_id' => 'NEFT', 'env' => 'uat', 'action' => '', 'status_api' => '', 'refund_api' => '',
];
$args = [
  'amount' => '1000.00', 'other_info' => 'Shivaa order SHV-1001',
  'success_url' => 'https://shivaa.in/api/pay/sbiepay/return',
  'fail_url' => 'https://shivaa.in/api/pay/sbiepay/return',
  'merchant_order_no' => 'SHV-1001-A1', 'customer_id' => 'NA',
];

echo "1 · request encryption (AES-128-CBC, IV = seller key[0:16], PKCS#7, base64)\n";
$pipe = sbiepay_request_pipe($cfg, $args);
chk('request pipe = 14 fields in SBI order', $pipe === $PLAIN, substr($pipe, 0, 60) . '…');
chk('ciphertext matches the reference vector', sbiepay_encrypt($cfg, $pipe) === $B64);
chk('decrypt(encrypt(x)) = x', sbiepay_decrypt($cfg, $B64) === $PLAIN);
chk('no seller key ⇒ no ciphertext (fails closed)', sbiepay_encrypt(['seller_key' => ''], 'x') === null);
chk('wrong key ⇒ decrypt returns null (return POST cannot be forged)', sbiepay_decrypt(['seller_key' => 'WRONGKEY12345678'], $B64) === null);
$fields = sbiepay_form_fields($cfg, $args);
chk('hosted form fields = EncryptTrans + merchIdVal',
  ($fields['EncryptTrans'] ?? '') === $B64 && ($fields['merchIdVal'] ?? '') === 'M1234567');

echo "\n2 · identifiers and amounts\n";
chk('order id sanitiser strips non-alphanumerics', sbiepay_clean_id('SHV-1001', 18) === 'SHV1001');
chk('order id sanitiser caps the length', strlen(sbiepay_clean_id(str_repeat('A', 90), 18)) === 18);
chk('amount formatted to 2 decimals', sbiepay_amount_str(1000) === '1000.00');
chk('amount keeps paise', sbiepay_amount_str(199.5) === '199.50');

echo "\n3 · response / status / refund pipe parsing\n";
$resp = 'SHV1001A1|SBI987654|SUCCESS|1000.00|INR|NB|extra|NA|SBIN|9988776655|2026-09-17 12:00:00|IN|NA|M1234567|12.00'
      . '|r1|r2|r3|r4|r5|r6|r7|r8|r9';
$m = sbiepay_parse_pipe($resp, sbiepay_response_fields());
chk('response: merchant_order_no', ($m['merchant_order_no'] ?? '') === 'SHV1001A1');
chk('response: sbi_transaction_id', ($m['sbi_transaction_id'] ?? '') === 'SBI987654');
chk('response: transaction_status', ($m['transaction_status'] ?? '') === 'SUCCESS');
chk('response: amount', ($m['amount'] ?? '') === '1000.00');
chk('response: bank_reference_number', ($m['bank_reference_number'] ?? '') === '9988776655');
chk('response: ref9 present', ($m['ref9'] ?? '') === 'r9');

$status = 'M1234567|SBI987654|SUCCESS|IN|INR|extra|SHV1001A1|1000.00|NA|SBIN|9988776655|2026-09-17 12:00:00|NB|NA|M1234567|12.00'
        . '|r1|r2|r3|r4|r5|r6|r7|r8|r9|na';
$sm = sbiepay_parse_pipe($status, sbiepay_status_fields());
chk('status: merchant_order_no', ($sm['merchant_order_no'] ?? '') === 'SHV1001A1');
chk('status: transaction_status', ($sm['transaction_status'] ?? '') === 'SUCCESS');
chk('status: amount', ($sm['amount'] ?? '') === '1000.00');
chk('status: trailing "na" ignored', !array_key_exists('na', $sm));

$refund = 'M1234567|SBI987654|SBIREF001|SUCCESS|NA|SHV1001A1-RF1|SHV1001A1|';
$rm = sbiepay_parse_pipe($refund, sbiepay_refund_fields());
chk('refund: sbi_refund_transaction_id', ($rm['sbi_refund_transaction_id'] ?? '') === 'SBIREF001');
chk('refund: refund_order_no', ($rm['refund_order_no'] ?? '') === 'SHV1001A1-RF1');
chk('refund: transaction_status', ($rm['transaction_status'] ?? '') === 'SUCCESS');

echo "\n4 · return payload extraction (the browser coming back from SBI)\n";
$enc = sbiepay_encrypt($cfg, $resp);
$ex = sbiepay_extract_return($cfg, ['EncryptTrans' => $enc]);
chk('decrypts EncryptTrans into a response map', ($ex['map']['transaction_status'] ?? '') === 'SUCCESS');
chk('records the field it came from', ($ex['source'] ?? '') === 'EncryptTrans');
$ex2 = sbiepay_extract_return($cfg, ['encData' => $enc]);
chk('also accepts the encData field name', ($ex2['map']['sbi_transaction_id'] ?? '') === 'SBI987654');
$ex3 = sbiepay_extract_return($cfg, ['merchant_order_no' => 'SHV1001A1', 'transaction_status' => 'FAIL', 'status' => 'FAIL']);
chk('plain-field fallback still maps the order', ($ex3['map']['merchant_order_no'] ?? '') === 'SHV1001A1');
$ex4 = sbiepay_extract_return($cfg, ['EncryptTrans' => base64_encode('garbage-not-aes')]);
chk('undecryptable payload ⇒ empty map (nothing is credited)', ($ex4['map'] ?? []) === []);

echo "\n" . str_repeat('-', 62) . "\n";
echo ($fail === 0 ? "ALL GREEN" : "FAILURES") . " — $pass passed, $fail failed\n";
exit($fail === 0 ? 0 : 1);
