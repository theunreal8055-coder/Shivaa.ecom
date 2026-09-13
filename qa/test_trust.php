<?php
/** Feature 2 unit checks. Read confirmed values; never modify the catalogue.
 * Any bad/malicious values here are QA-only rejection fixtures, not legal data.
 * Run: php qa/test_trust.php
 */
require __DIR__ . '/../cms/trust.php';
$count = 0;
function trust_check(bool $condition, string $name): void {
  global $count;
  if (!$condition) { fwrite(STDERR, "FAIL: $name\n"); exit(1); }
  $count++; echo "PASS: $name\n";
}
$dbFile = __DIR__ . '/../cms/data/db.json';
$before = file_get_contents($dbFile);
$db = json_decode($before, true, 512, JSON_THROW_ON_ERROR);
$original = $db;
$profile = trust_profile($db);
trust_check($profile['schemaVersion'] === 1 && $profile['source'] === 'store_settings', 'explicit source and schema');
foreach (['legalName', 'brand', 'cin', 'udyam', 'address'] as $key) {
  trust_check($profile['business'][$key] === ($db['settings'][$key] ?? null), 'confirmed ' . $key . ' is used verbatim');
}
trust_check(array_keys($profile['business']) === ['legalName', 'brand', 'cin', 'udyam', 'address'], 'business-field allowlist');
trust_check(array_keys($profile) === ['schemaVersion', 'source', 'business', 'gstin', 'certificates', 'registryVerification'], 'public payload contains no unrelated business/analytics fields');
trust_check($profile['certificates'] === [], 'certificates remain empty');
trust_check($profile['gstin'] === ($db['settings']['gstin'] ?? null), 'owner-supplied GSTIN is published when present');
trust_check(trust_profile(['settings' => ['gstin' => '08aaice5666r1zp']])['gstin'] === '08AAICE5666R1ZP', 'lowercase GSTIN normalised to uppercase');
trust_check(trust_profile(['settings' => ['gstin' => 'UNCONFIRMED_QA_ONLY']])['gstin'] === null, 'malformed GSTIN becomes missing data');
trust_check($profile['registryVerification'] === ['performed' => false, 'checkedAt' => null], 'no invented government check or timestamp');
trust_check($db === $original, 'projection does not mutate source data');
foreach ([[], ['settings' => null], ['settings' => false], ['settings' => 'invalid'], ['settings' => []]] as $badDb) {
  trust_check(trust_profile($badDb)['business'] === ['legalName' => null, 'brand' => null, 'cin' => null, 'udyam' => null, 'address' => null], 'missing settings never use hard-coded defaults');
}
foreach (['', 'unknown', '<svg/>', 123456, false, [], (object)[], "\0"] as $value) {
  $bad = ['settings' => ['cin' => $value, 'udyam' => $value, 'legalName' => $value, 'brand' => $value]];
  $bp = trust_profile($bad)['business'];
  trust_check($bp['cin'] === null && $bp['udyam'] === null && $bp['legalName'] === null && $bp['brand'] === null, 'invalid identifier types/shapes become missing: ' . json_encode($value));
}
foreach (['cin', 'udyam'] as $key) {
  $modified = $db;
  $modified['settings'][$key] = " \t" . $db['settings'][$key] . "\r\n";
  trust_check(trust_profile($modified)['business'][$key] === $db['settings'][$key], 'only outer ASCII whitespace trimmed for ' . $key);
  $modified['settings'][$key] = strtolower($db['settings'][$key]);
  trust_check(trust_profile($modified)['business'][$key] === null, 'do not rewrite malformed ' . $key);
}
foreach ([null, false, 123, [], '', "\u{00A0}", "\u{FEFF}", "\0", "QA\x01address", str_repeat('x', 501), "\xC3\x28"] as $address) {
  trust_check(trust_address($address) === null, 'invalid/missing address has no guessed fallback');
}
trust_check(trust_address(" \t" . $db['settings']['address'] . "\n") === $db['settings']['address'], 'existing address only trimmed, not geocoded');
$malicious = '<img src=x onerror=alert(1)>'; // escaping is asserted in browser tests
trust_check(trust_address($malicious) === $malicious, 'model treats address text as text, not HTML or a registry finding');
$polluted = $db;
$polluted['settings'] = array_merge($polluted['settings'], [
  'gstin' => 'UNCONFIRMED_QA_ONLY',
  'certificates' => [['url' => 'https://example.invalid/qa-only.pdf', 'verified' => true]],
  'certificateUrl' => 'javascript:alert(1)',
  'gstApi' => ['key' => 'QA_PRIVATE_MARKER'],
  'cinVerified' => true, 'udyamVerified' => true,
  'trustScore' => 100, 'checkedAt' => 'QA_NOT_A_REAL_CHECK_TIME',
]);
$pollutedProfile = trust_profile($polluted);
$expectedPolluted = $profile; $expectedPolluted['gstin'] = null;  // malformed GSTIN dropped, not echoed
trust_check($pollutedProfile === $expectedPolluted, 'unapproved identifiers/documents, credentials and verification flags cannot affect the profile');
trust_check(strpos(json_encode($pollutedProfile), 'QA_PRIVATE_MARKER') === false && strpos(json_encode($pollutedProfile), 'example.invalid') === false, 'credentials and forged document URLs never serialise');
trust_check(file_get_contents($dbFile) === $before, 'tracked catalogue is byte-for-byte unchanged');
echo "\n$count trust unit checks passed. No registrations queried or data created.\n";
