<?php
require '/b/reports.php';
// Exercises billing_fine_factor(), the only pure function the new report
// engines share. Reports r1_1 multiplies shop grams by this value.
$cases = [
  ['22K (916)', 0.916],
  ['24K (999)', 0.999],
  ['18K (750)', 0.750],
  ['14K (585)', 0.585],
  ['92.5 Silver', 0.925],
  ['22K', 0.9167],
  ['18K', 0.75],
  ['24K', 1.0],
  ['nonsense', 1.0],
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
