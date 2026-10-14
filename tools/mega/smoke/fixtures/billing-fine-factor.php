<?php
require '/b/lib.php';
require '/b/reports.php';
// Exercises billing_fine_factor(), the only pure function the new report
// engines share. Reports r1_1 multiplies shop grams by this value.
$cases = [
  // current plain labels, resolved through BILLING_FINENESS
  ['24K', 0.999], ['22K', 0.916], ['20K', 0.833], ['19K', 0.791],
  ['18K', 0.750], ['14K', 0.585], ['9K', 0.375], ['92.5 Silver', 0.925],
  // legacy labels saved before v3 must still value correctly
  ['22K (916)', 0.916], ['24K (999)', 0.999], ['18K (750)', 0.750],
  ['14K (585)', 0.585],
  // unknown input must not silently pretend to be pure metal
  ['nonsense', 1.0], ['', 1.0],
];
$pass = 0; $fail = 0;
foreach ($cases as $c) {
  $got = round(billing_fine_factor($c[0]), 4);
  $want = round($c[1], 4);
  if ($got === $want) { $pass++; }
  else { $fail++; echo "FAIL  {$c[0]}: got $got want $want\n"; }
}
echo "fine_factor assertions: $pass passed, $fail failed\n";
echo $fail === 0 ? "PASS\n" : "FAIL\n";
