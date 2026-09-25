<?php
/* Verifies the helpers that changed in v2: Indian digit grouping, grams,
   and the WhatsApp link builder. Run under php-wasm. */
require '/b/lib.php';

$pass = 0; $fail = 0;
function eq($label, $got, $want) {
  global $pass, $fail;
  if ((string)$got === (string)$want) { $pass++; echo "PASS  $label = $got\n"; }
  else { $fail++; echo "FAIL  $label got=$got want=$want\n"; }
}

/* Indian grouping, not Western. 1234567.89 -> 12,34,567.89 */
eq('inr 1234567.89', billing_inr(1234567.89), '12,34,567.89');
eq('inr 100000',     billing_inr(100000),     '1,00,000.00');
eq('inr 10000000',   billing_inr(10000000),   '1,00,00,000.00');
eq('inr 999',        billing_inr(999),        '999.00');
eq('inr 1000',       billing_inr(1000),       '1,000.00');
eq('inr 12345',      billing_inr(12345),      '12,345.00');
eq('inr negative',   billing_inr(-1234567.5), '-12,34,567.50');
eq('inr zero dp',    billing_inr(1234567, 0), '12,34,567');

/* grams trims trailing zeros */
eq('grams 24.300', billing_grams(24.3), '24.3');
eq('grams 7.000',  billing_grams(7.0),  '7');
eq('grams 0.500',  billing_grams(0.5),  '0.5');

/* WhatsApp: bare 10-digit Indian numbers get 91 */
eq('wa 10 digit', billing_wa_link('9876543210', 'hi'), 'https://wa.me/919876543210?text=hi');
eq('wa +91',      billing_wa_link('+91 98765 43210', 'hi'), 'https://wa.me/919876543210?text=hi');
eq('wa encodes',  billing_wa_link('9876543210', 'a b&c'), 'https://wa.me/919876543210?text=a%20b%26c');

/* Bill + khata message text */
$shop = ['shop_name' => 'Shivaa Jewellers'];
$bill = ['bill_no' => 'SHV-0001', 'bill_date' => '2026-09-25', 'party_name' => 'Ravi',
         'grand_total' => 11905, 'amount_paid' => 5000, 'balance_due' => 6905];
$txt = billing_bill_wa_text($shop, $bill);
echo (strpos($txt, '11,905.00') !== false ? "PASS" : "FAIL") . "  bill text has grouped total\n";
echo (strpos($txt, 'Balance due:') !== false ? "PASS" : "FAIL") . "  bill text shows balance\n";
$k = billing_khata_wa_text($shop, 'Ravi', 6905);
echo (strpos($k, 'Ravi ji') !== false && strpos($k, '6,905.00') !== false ? "PASS" : "FAIL") . "  khata text\n";
$noDue = billing_bill_wa_text($shop, ['bill_no' => 'X', 'bill_date' => '2026-09-25',
  'party_name' => 'A', 'grand_total' => 100, 'amount_paid' => 100, 'balance_due' => 0]);
echo (strpos($noDue, 'Balance due') === false ? "PASS" : "FAIL") . "  no balance line when settled\n";

echo "\n$pass passed, $fail failed\n";
exit($fail ? 1 : 0);
