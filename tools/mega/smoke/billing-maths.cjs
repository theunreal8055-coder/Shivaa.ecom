const fs = require('fs');
const { PHP } = require('@php-wasm/universal');
const { loadNodeRuntime } = require('@php-wasm/node');
const LIB = fs.readFileSync('/home/user/Shivaa.ecom/cms/billing/lib.php', 'utf8');

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 201 } }));
  php.mkdirTree('/t');
  php.writeFile('/t/lib.php', LIB);
  const code = `<?php
require '/t/lib.php';
function t($label, $got, $want) {
  $ok = abs(((float)$got) - ((float)$want)) < 0.005;
  echo ($ok ? "PASS " : "FAIL ") . $label . " got=" . $got . " want=" . $want . "\\n";
}
// Case 1: percentage discount, GST on, old metal deducted
$a = billing_totals(['itemTotals'=>[10000,5000],'discountType'=>'%','discountValue'=>10,
  'gstPercent'=>3,'applyGst'=>true,'oldMetalTotals'=>[2000],'roundOff'=>0,'payments'=>[5000]]);
t('subtotal',    $a['subtotal'],    15000);
t('discountAmt', $a['discountAmount'], 1500);
t('taxable',     $a['taxable'],     13500);
t('gst',         $a['gstAmount'],   405);
t('cgst',        $a['cgst'],        202.5);
t('grandTotal',  $a['grandTotal'],  11905);
t('balanceDue',  $a['balanceDue'],  6905);
// Case 2: flat rupee discount, Estimate so no GST
$b = billing_totals(['itemTotals'=>[8000],'discountType'=>'Rs','discountValue'=>500,
  'gstPercent'=>3,'applyGst'=>false,'oldMetalTotals'=>[],'roundOff'=>0,'payments'=>[7500]]);
t('est taxable', $b['taxable'], 7500);
t('est gst',     $b['gstAmount'], 0);
t('est grand',   $b['grandTotal'], 7500);
t('est balance', $b['balanceDue'], 0);
// Case 3: overpayment must not go negative
$c = billing_totals(['itemTotals'=>[1000],'discountType'=>'%','discountValue'=>0,
  'gstPercent'=>3,'applyGst'=>true,'oldMetalTotals'=>[],'roundOff'=>0,'payments'=>[5000]]);
t('overpay clamps', $c['balanceDue'], 0);
// Case 4: round off
$d = billing_totals(['itemTotals'=>[1000.6],'discountType'=>'%','discountValue'=>0,
  'gstPercent'=>0,'applyGst'=>true,'oldMetalTotals'=>[],'roundOff'=>-0.6,'payments'=>[]]);
t('roundoff', $d['grandTotal'], 1000);
// Amount in words, Indian system
echo (($w = billing_amount_words(1234567)) === 'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only'
  ? "PASS " : "FAIL ") . "words got=" . $w . "\\n";
echo ((billing_amount_words(0) === 'Zero Rupees Only') ? "PASS " : "FAIL ") . "words zero\\n";
echo ((billing_amount_words(10000000) === 'One Crore Rupees Only') ? "PASS " : "FAIL ") . "words crore\\n";
// Indian digit grouping
echo ((billing_inr(1234567.5) === '1234567.50' || billing_inr(1234567.5) === '1,234,567.50')
  ? "PASS " : "FAIL ") . "inr got=" . billing_inr(1234567.5) . "\\n";
echo "GRAMS " . billing_grams(24.300) . " / " . billing_grams(7.000) . "\\n";
echo "DDLGUARD good=" . var_export(billing_safe_ddl('CREATE TABLE IF NOT EXISTS \`billing_items\` ('), true)
   . " bad1=" . var_export(billing_safe_ddl('CREATE TABLE IF NOT EXISTS \`users\` ('), true)
   . " bad2=" . var_export(billing_safe_ddl('DROP TABLE \`billing_items\`'), true) . "\\n";
`;
  const out = await php.run({ code });
  process.stdout.write(Buffer.from(out.bytes).toString());
  if (out.errors) console.log('ERRORS:', out.errors);
})().catch(e => { console.error('ERR', e); process.exit(1); });
