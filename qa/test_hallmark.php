<?php
/** Feature 1 unit tests. All TST… values below are SYNTHETIC FORMAT FIXTURES,
 * never actual BIS records. This test never opens the catalogue database.
 * Run: php qa/test_hallmark.php
 */
require __DIR__ . '/../cms/hallmark.php';
$count = 0;
function check($condition, string $name): void {
  global $count;
  if (!$condition) { fwrite(STDERR, "FAIL: $name\n"); exit(1); }
  $count++; echo "PASS: $name\n";
}
function rejects(callable $call, int $status, string $name): void {
  try { $call(); check(false, $name); }
  catch (HallmarkProblem $e) { check($e->httpStatus === $status, $name); }
}
$entry = ['huid' => 'TST0A1', 'pieceLabel' => 'QA piece only', 'sourceNote' => 'SYNTHETIC QA SOURCE — never publish'];
check(hallmark_huid(" \ttst0a1\r\n") === 'TST0A1', 'normalise ASCII case and surrounding whitespace');
foreach (['AAAAAA', '000000', 'TST0A1'] as $code) {
  $r = hallmark_lookup(['huid' => $code]);
  check($r['formatValid'] === true && $r['verified'] === false && $r['record'] === null && $r['source'] === null && $r['checkedAt'] === null && $r['status'] === 'unavailable', 'accepted format never proves existence: ' . $code);
}
foreach (['', ' ', 'TST01', 'TST0A12', 'TST 01', 'TST-01', '<svg/>', "TST0A1\0", "TST\n01", 'ＴST0A1', 'TSTß1', "\u{00A0}TST0A1", null, false, 123456, ['TST0A1'], (object)['huid' => 'TST0A1']] as $value) {
  check(hallmark_huid($value) === null, 'reject invalid HUID type or shape ' . json_encode($value));
}
rejects(fn() => hallmark_lookup([]), 400, 'missing field rejected');
rejects(fn() => hallmark_lookup(['huid' => 'TST0A1', 'verified' => true]), 400, 'caller cannot supply verification');
rejects(fn() => hallmark_lookup(['huid' => 'TST01']), 422, 'format error is distinct from provider failure');
foreach (['', '[]', 'null', 'true', '{', '"TST0A1"'] as $json) rejects(fn() => hallmark_json($json, 1024), 400, 'reject non-object JSON: ' . $json);
rejects(fn() => hallmark_json(str_repeat(' ', 1025), 1024), 413, 'bound body size');
check(hallmark_json('{"huid":"TST0A1"}', 1024)['huid'] === 'TST0A1', 'parse input without coercion');
check(hallmark_status()['automaticLookupAvailable'] === false, 'no environment or settings shortcut to verification');
check(hallmark_entries([]) === [], 'missing records remain empty');
check(hallmark_entries([(object)$entry])[0] === $entry, 'source-backed staff shape, not official data');
foreach ([null, 'TST0A1', ['huid' => 'TST0A1'], array_fill(0, 51, $entry)] as $bad) rejects(fn() => hallmark_entries($bad), 422, 'reject non-list or oversized record list');
rejects(fn() => hallmark_entries([$entry, $entry]), 409, 'duplicate piece HUID rejected');
foreach ([array_merge($entry, ['verified' => true]), array_merge($entry, ['sourceNote' => '']), array_merge($entry, ['pieceLabel' => []]), array_merge($entry, ['sourceNote' => "one\ntwo"]), array_merge($entry, ['pieceLabel' => str_repeat('x', 81)])] as $bad) {
  rejects(fn() => hallmark_entries([$bad]), 422, 'invalid or unsolicited record fields rejected');
}
foreach (['hallmark', 'huid', 'huids', 'HUID', 'bisVerified', 'hallmarkStatus', 'huidRecords'] as $field) rejects(fn() => hallmark_guard_product_write([$field => true]), 422, 'generic product write blocks ' . $field);
hallmark_guard_product_write(['name' => 'Existing product edit', 'weightG' => 1]);
check(true, 'ordinary product patches still allowed');
$legacy = ['id' => 'qa_a', 'huid' => 'TST0A1', 'bisVerified' => true, 'hallmark' => ['verified' => true, 'checkedAt' => '2026-01-01', 'record' => ['purity' => 'invented']]];
$clean = hallmark_product($legacy);
check($clean['hallmark']['status'] === 'not_provided' && $clean['hallmark']['entries'] === [] && !isset($clean['bisVerified']) && !isset($clean['huid']), 'legacy flags and identifiers not promoted to evidence');
check(hallmark_staff_record($legacy)['needsReview'], 'legacy data flagged for staff review');
check(hallmark_staff_record(['huid' => 'TST0A1'])['needsReview'], 'bare legacy HUID flagged for review');
$db = ['products' => [['id' => 'qa_a'], ['id' => 'qa_b']]];
check(hallmark_product($db['products'][0])['hallmark']['status'] === 'not_provided', 'no product migration or fabricated defaults');
$saved = hallmark_apply_update($db, 'qa_a', ['entries' => [$entry], 'expectedRevision' => 0], 'qa_actor');
check($saved['hallmark']['revision'] === 1 && $saved['hallmark']['updatedBy'] === 'qa_actor', 'server owns save revision and audit identity');
$public = hallmark_product($saved)['hallmark'];
check($public['verified'] === false && $public['checkedAt'] === null && $public['status'] === 'recorded_unverified', 'staff save is never official verification');
check(!str_contains(json_encode($public), 'sourceNote') && !str_contains(json_encode($public), 'qa_actor') && !str_contains(json_encode($public), 'updatedAt'), 'private provenance and save timestamp excluded from public data');
check($public['entries'] === [['huid' => 'TST0A1', 'pieceLabel' => 'QA piece only']], 'only explicitly entered HUID and piece label are public');
$before = $db;
rejects(function() use (&$db, $entry) { hallmark_apply_update($db, 'qa_b', ['entries' => [$entry], 'expectedRevision' => 0], 'qa_actor'); }, 409, 'HUID cannot be assigned across products');
check($db === $before, 'rejected duplicate causes no mutation');
rejects(function() use (&$db) { hallmark_apply_update($db, 'qa_a', ['entries' => [], 'expectedRevision' => 0], 'qa_actor'); }, 409, 'stale staff edit rejected');
rejects(function() use (&$db) { hallmark_apply_update($db, 'missing', ['entries' => [], 'expectedRevision' => 0], 'qa_actor'); }, 404, 'missing product not created implicitly');
rejects(function() use (&$db) { hallmark_apply_update($db, 'qa_b', ['entries' => [], 'expectedRevision' => 0, 'verified' => true], 'qa_actor'); }, 422, 'no forged save metadata');
$cleared = hallmark_apply_update($db, 'qa_a', ['entries' => [], 'expectedRevision' => 1], 'qa_actor');
check(hallmark_product($cleared)['hallmark']['status'] === 'not_provided' && $cleared['hallmark']['revision'] === 2, 'explicit removal clears public references but preserves concurrency revision');
echo "\n$count checks passed. No BIS records queried, generated or persisted.\n";
