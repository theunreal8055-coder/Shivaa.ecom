<?php
/* ═══════════════════════════════════════════════════════════════════════
   QA — rate provider guards.  Run:  php qa/test_rates.php
   Pure logic only: no network, no db.json, nothing written.
   ═══════════════════════════════════════════════════════════════════════ */
declare(strict_types=1);
require_once __DIR__ . '/../cms/rates_provider.php';

$pass = 0; $fail = 0;
function ok(bool $cond, string $what): void {
  global $pass, $fail;
  if ($cond) { $pass++; echo "  ok   $what\n"; }
  else       { $fail++; echo "  FAIL $what\n"; }
}
function baseDb(): array {
  return ['rates' => ['last' => ['t' => date('c', time() - 3600), 'gold24' => 15800, 'gold22' => 14480,
                                 'gold18' => 11850, 'silver' => 214.0, 'source' => 'ibja'],
                      'history' => []]];
}
function cfg(array $over = []): array {
  return array_merge(shivaa_rates_cfg('/nonexistent-on-purpose.json'),
                     ['enabled' => true, 'api_key' => 'test', 'spot_fallback' => false], $over);
}
function feed(array $r): callable { return function (array $c, array &$d) use ($r) { return $r; }; }
function nofeed(): callable { return function (array $c, array &$d) { $d[] = 'stubbed failure'; return null; }; }

echo "\n1. IBJA-shaped response mapping\n";
$m = shivaa_rates_map([
  'ibja_gold_999' => 15480.0, 'ibja_gold_995' => 15418.0, 'ibja_gold_916' => 14180.0,
  'ibja_gold_750' => 11610.0, 'ibja_gold_585' => 9056.0, 'ibja_silver_999' => 212.5,
]);
ok($m['gold999'] === 15480.0, '999 gold mapped');
ok($m['gold916'] === 14180.0, '916 gold mapped');
ok($m['gold750'] === 11610.0, '750 gold mapped');
ok($m['silver']  === 212.5,   'silver mapped');

echo "\n2. Alternative key spellings / nested values\n";
$m2 = shivaa_rates_map(['gold' => ['price' => 15500], 'silver' => ['price' => 210]]);
ok($m2['gold999'] === 15500.0, 'plain "gold" key falls back to 999');
ok($m2['silver'] === 210.0, 'nested price object read');
$m3 = shivaa_rates_map(['lbma_gold_am' => 4000, 'lbma_gold_pm' => 4010, 'lbma_silver' => 50]);
ok($m3['gold999'] === null || $m3['gold999'] === 4000.0, 'am/pm keys do not crash the mapper');

echo "\n3. Plausibility guard (INR per gram)\n";
ok(shivaa_rates_plausible(15480.0, 212.5)['ok'] === true,  'sane per-gram values accepted');
ok(shivaa_rates_plausible(154800.0, 2125.0)['ok'] === false, 'per-10g values REFUSED (not silently divided)');
ok(shivaa_rates_plausible(178.0, 2.4)['ok'] === false,     'USD/oz-looking values refused');
ok(shivaa_rates_plausible(null, 212.5)['ok'] === false,    'missing gold refused');

echo "\n4. Happy path\n";
$db = baseDb();
$r = shivaa_rates_apply($db, cfg(), ['fetcher' => feed(['gold999' => 15480.0, 'gold916' => 14180.0, 'gold750' => 11610.0, 'silver' => 212.5, 'source' => 'ibja', 'providerTs' => '2026-09-06T12:05:00Z'])]);
ok($r['action'] === 'updated', 'action = updated');
ok($db['rates']['last']['gold24'] === 15480, '24K stored');
ok($db['rates']['last']['gold22'] === 14180, '22K uses the PUBLISHED 916 rate, not 24K x 0.9167');
ok($db['rates']['last']['source'] === 'ibja', 'source recorded');
ok(count($db['rates']['history']) === 1, 'history appended');

echo "\n5. Purity fallback when the feed omits 916/750\n";
$db = baseDb();
shivaa_rates_apply($db, cfg(), ['fetcher' => feed(['gold999' => 16000.0, 'gold916' => null, 'gold750' => null, 'silver' => 220.0, 'source' => 'ibja', 'providerTs' => ''])]);
ok($db['rates']['last']['gold22'] === (int)round(16000 * 0.9167), '22K derived by purity multiplier');

echo "\n6. NO FABRICATION when the feed fails\n";
$db = baseDb();
$before = $db['rates']['last'];
$r = shivaa_rates_apply($db, cfg(), ['fetcher' => nofeed()]);
ok($r['action'] === 'held', 'action = held');
ok($db['rates']['last']['gold24'] === $before['gold24'], 'last known rate kept unchanged');
ok(strpos((string)$db['rates']['last']['source'], 'stale') !== false, 'marked stale');
ok(count($db['rates']['history']) === 0, 'no invented stamp appended to history');
ok(!isset($db['rates']['last']['simulated']), 'nothing simulated');

echo "\n7. Big-jump guard\n";
$db = baseDb();
$r = shivaa_rates_apply($db, cfg(), ['fetcher' => feed(['gold999' => 25000.0, 'gold916' => null, 'gold750' => null, 'silver' => 212.5, 'source' => 'ibja', 'providerTs' => ''])]);
ok($r['action'] === 'held-jump', '58% jump held for review');
ok($db['rates']['last']['gold24'] === 15800, 'old rate still in force');
ok(($db['rates']['pendingReview']['gold24'] ?? 0) === 25000, 'proposed rate parked for admin');
$db2 = baseDb();
$r2 = shivaa_rates_apply($db2, cfg(), ['force' => true, 'fetcher' => feed(['gold999' => 25000.0, 'gold916' => null, 'gold750' => null, 'silver' => 212.5, 'source' => 'ibja', 'providerTs' => ''])]);
ok($r2['action'] === 'updated' && $db2['rates']['last']['gold24'] === 25000, '--force accepts it');
$db3 = baseDb();
shivaa_rates_apply($db3, cfg(), ['fetcher' => feed(['gold999' => 16200.0, 'gold916' => null, 'gold750' => null, 'silver' => 215.0, 'source' => 'ibja', 'providerTs' => ''])]);
ok($db3['rates']['last']['gold24'] === 16200, 'a normal 2.5% move passes through');

echo "\n8. Monthly quota guard (protects the free plan)\n";
$db = baseDb();
$c = cfg(['monthly_cap' => 3]);
for ($i = 0; $i < 5; $i++) {
  shivaa_rates_apply($db, $c, ['fetcher' => feed(['gold999' => 15480.0 + $i, 'gold916' => null, 'gold750' => null, 'silver' => 212.5, 'source' => 'ibja', 'providerTs' => ''])]);
}
ok($db['rates']['quota']['used'] === 3, 'stops consuming at the cap (used=' . $db['rates']['quota']['used'] . ')');
ok($db['rates']['last']['gold24'] === 15482, 'later calls held the 3rd value, no extra API hits');

echo "\n9. Dry run writes nothing\n";
$db = baseDb();
$snapshot = json_encode($db);
$r = shivaa_rates_apply($db, cfg(), ['dryRun' => true, 'fetcher' => feed(['gold999' => 15480.0, 'gold916' => null, 'gold750' => null, 'silver' => 212.5, 'source' => 'ibja', 'providerTs' => ''])]);
ok($r['action'] === 'updated' && $r['stamp']['gold24'] === 15480, 'reports what it would do');
ok(json_encode($db) === $snapshot, 'db untouched');

echo "\n10. Disabled config = no API calls, rate held\n";
$db = baseDb();
$r = shivaa_rates_apply($db, array_merge(cfg(), ['enabled' => false]), []);
ok($r['action'] === 'held', 'held when disabled');
ok(($db['rates']['quota']['used'] ?? 0) === 0, 'no quota consumed');

echo "\n11. Age helper\n";
$db = baseDb();
ok(shivaa_rates_age_minutes($db) >= 59 && shivaa_rates_age_minutes($db) <= 61, 'age ~60 min');
ok(shivaa_rates_age_minutes(['rates' => ['last' => []]]) === PHP_INT_MAX, 'no stamp = infinitely old');

echo "\n─────────────────────────────\n";
echo ($fail === 0 ? "ALL PASS" : "FAILURES") . ": $pass passed, $fail failed\n";
exit($fail === 0 ? 0 : 1);
