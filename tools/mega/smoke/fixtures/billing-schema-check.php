<?php
/* Test harness: prove the installer's splitter + guard accept schema.sql.
   Run under php-wasm by billing-install-check2.cjs. */
require '/b/lib.php';

function inst_split(string $sql): array {
  $sql = (string)preg_replace('/^[ \t]*--.*$/m', '', $sql);
  $out = [];
  foreach (explode(';', $sql) as $chunk) {
    $c = trim($chunk);
    if ($c !== '') $out[] = $c;
  }
  return $out;
}

$stmts = inst_split((string)file_get_contents('/b/schema.sql'));
echo "statements parsed : " . count($stmts) . "\n";

$bad = 0; $names = [];
foreach ($stmts as $i => $s) {
  if (!billing_safe_ddl($s)) { $bad++; echo "  REJECTED #" . ($i + 1) . ": " . substr($s, 0, 60) . "\n"; }
  $q = chr(96);
  if (preg_match('/^CREATE TABLE IF NOT EXISTS ' . $q . '(billing_[a-z_]+)' . $q . '/', $s, $m)) $names[] = $m[1];
}
echo "passed guard      : " . (count($stmts) - $bad) . "/" . count($stmts) . "\n";
echo "tables            : " . implode(', ', $names) . "\n";
echo "all billing_       : " . (count($names) === count($stmts) ? "yes" : "NO") . "\n";

/* The guard must reject a shop table and a destructive statement. */
echo "rejects users     : " . (billing_safe_ddl('CREATE TABLE IF NOT EXISTS ' . chr(96) . 'users' . chr(96) . ' (') ? "NO" : "yes") . "\n";
echo "rejects DROP      : " . (billing_safe_ddl('DROP TABLE ' . chr(96) . 'billing_items' . chr(96)) ? "NO" : "yes") . "\n";
echo "rejects ALTER     : " . (billing_safe_ddl('ALTER TABLE ' . chr(96) . 'billing_items' . chr(96) . ' ADD x INT') ? "NO" : "yes") . "\n";
