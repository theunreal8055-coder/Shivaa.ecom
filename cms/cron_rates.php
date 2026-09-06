<?php
/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA — rate refresh cron (CLI only)

   Usage on the Hostinger server:
     php cron_rates.php --discover      # print the raw provider response once
     php cron_rates.php --dry-run       # show what WOULD change; writes nothing
     php cron_rates.php                 # normal run (cron uses this)
     php cron_rates.php --force         # accept a >max_jump_pct move

   Cron (twice a day, just after IBJA publishes ~12:05 and ~17:05 IST):
     7 12 * * 1-6 /usr/bin/php ~/public_html/cron_rates.php >> ~/shivaa-rates.log 2>&1
     7 17 * * 1-6 /usr/bin/php ~/public_html/cron_rates.php >> ~/shivaa-rates.log 2>&1
   ═══════════════════════════════════════════════════════════════════════ */
declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');

if (PHP_SAPI !== 'cli') {
  http_response_code(403);
  header('Content-Type: text/plain');
  echo "cron_rates.php is a command-line tool and cannot be run over the web.\n";
  exit(1);
}

require_once __DIR__ . '/rates_provider.php';

$argvv    = $argv ?? [];
$dryRun   = in_array('--dry-run', $argvv, true);
$force    = in_array('--force', $argvv, true);
$discover = in_array('--discover', $argvv, true);
$quiet    = in_array('--quiet', $argvv, true);

function out(string $s): void { echo '[' . date('Y-m-d H:i:s') . '] ' . $s . "\n"; }

$cfg = shivaa_rates_cfg();

/* ── discovery: show the provider's raw field names, no DB writes ── */
if ($discover) {
  if (($cfg['api_key'] ?? '') === '') {
    out('ERROR: no api_key found. Create ' . $cfg['configPath'] . ' (chmod 600) first.');
    exit(1);
  }
  $url = 'https://api.metals.dev/v1/metal/authority'
       . '?api_key='   . urlencode((string)$cfg['api_key'])
       . '&authority=' . urlencode((string)$cfg['authority'])
       . '&currency='  . urlencode((string)$cfg['currency'])
       . '&unit='      . urlencode((string)$cfg['unit']);
  out('GET ' . preg_replace('/api_key=[^&]+/', 'api_key=***', $url));
  $r = shivaa_rates_http($url, (int)$cfg['timeout']);
  if (!$r['ok'] || !is_array($r['json'])) {
    out('FAILED: ' . (string)($r['error'] ?? 'unknown'));
    if (isset($r['raw'])) out('body: ' . (string)$r['raw']);
    exit(1);
  }
  echo json_encode($r['json'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), "\n";
  $m = shivaa_rates_map(is_array($r['json']['rates'] ?? null) ? $r['json']['rates'] : []);
  out('mapped → 24K(999): ' . var_export($m['gold999'], true)
      . ' · 22K(916): ' . var_export($m['gold916'], true)
      . ' · 18K(750): ' . var_export($m['gold750'], true)
      . ' · silver: '   . var_export($m['silver'], true));
  out('If those look like INR per gram, you are ready. Per 10 g? add "scale": 0.1 to the config.');
  exit(0);
}

/* ── load db ── */
$DB_FILE = __DIR__ . '/data/db.json';
if (!is_readable($DB_FILE)) { out('ERROR: cannot read ' . $DB_FILE); exit(1); }
$raw = file_get_contents($DB_FILE);
$db  = json_decode((string)$raw, true);
if (!is_array($db)) { out('ERROR: db.json is not valid JSON — aborting without writing'); exit(1); }

$before = $db['rates']['last'] ?? null;

$report = shivaa_rates_apply($db, $cfg, ['dryRun' => $dryRun, 'force' => $force]);

/* ── save (atomic, same lock file api.php uses) ── */
if (!$dryRun) {
  $lock = fopen($DB_FILE . '.lock', 'c');
  if ($lock) flock($lock, LOCK_EX);
  $json = json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  $ok = false;
  if ($json !== false) {
    $tmp = $DB_FILE . '.tmp';
    if (file_put_contents($tmp, $json) !== false) $ok = rename($tmp, $DB_FILE);
  }
  if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
  if (!$ok) { out('ERROR: failed to write db.json — nothing changed'); exit(1); }
}

/* ── report ── */
$s = $report['stamp'] ?? [];
$b = is_array($before) ? $before : [];
if (!$quiet || $report['action'] !== 'updated') {
  out(strtoupper($report['action']) . ($dryRun ? ' (dry run)' : '') . ' · source: ' . (string)$report['source']);
  out('  24K ' . var_export($b['gold24'] ?? null, true) . ' → ' . var_export($s['gold24'] ?? null, true)
    . ' · 22K ' . var_export($b['gold22'] ?? null, true) . ' → ' . var_export($s['gold22'] ?? null, true)
    . ' · silver ' . var_export($b['silver'] ?? null, true) . ' → ' . var_export($s['silver'] ?? null, true)
    . '   (INR per gram, before the Jaipur premium)');
  if (!empty($report['quota'])) {
    out('  quota ' . $report['quota']['used'] . '/' . $report['quota']['cap'] . ' calls used this month (' . $report['quota']['month'] . ')');
  }
  foreach ((array)($report['diag'] ?? []) as $d) out('  note: ' . $d);
}

exit(in_array($report['action'], ['updated', 'held'], true) ? 0 : ($report['action'] === 'held-jump' ? 2 : 1));
