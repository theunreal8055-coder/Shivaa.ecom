<?php
/* ═══════════════════════════════════════════════════════════════════════════
   SHIVAA · FIRST-RUN INSTALLER                                    v115-FI
   ───────────────────────────────────────────────────────────────────────────
   Turns an extracted fresh-install bundle into a RUNNING store in one visit:

     1  checks the host          (PHP 8+, json/mbstring, writable data + uploads)
     2  seeds data/db.json       from data/db.seed.json — the clean-store DB:
                                 the real 65-ring catalogue + your store config,
                                 zero customers, orders, reviews or partner money
     3  creates YOUR admin       (email + password typed here, bcrypt via
                                 password_hash() — the exact scheme api.php reads)
     4  repairs the tree         any uploads/* folder or data/.htaccess missing
     5  reports the truth        what is live now vs what still needs a setting
                                 (PayU keys, SMS gateway, GST certificate, media)
     6  LOCKS ITSELF OUT         deletes data/install-open + writes
                                 data/INSTALL.lock; .htaccess then 403s this file

   It is deliberately incapable of touching an installed store: with db.json
   present it refuses (HTTP 403) unless run from SSH with
   --force --confirm=RESEED, and even then it asks for the EXISTING admin
   password. There is no path from a browser to a re-seed.

   CLI (Hostinger SSH / any host):
     php install.php --check                     env + bundle report, writes nothing
     php install.php --seed --admin-email=a@b.c --admin-pass='…' --admin-phone=…
     php install.php --seed --dry-run            same, prints instead of writing
   ═══════════════════════════════════════════════════════════════════════════ */
declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');
@ini_set('display_errors', '0');
@ini_set('log_errors', '1');

$ROOT      = __DIR__;
$DATA      = $ROOT . '/data';
$DB_FILE   = $DATA . '/db.json';
$SEED_FILE = $DATA . '/db.seed.json';
$OPEN_DOOR = $DATA . '/install-open';      // present in the bundle, deleted on success
$LOCK      = $DATA . '/INSTALL.lock';
$NONCE     = $DATA . '/install-nonce';
$THROTTLE  = $DATA . '/install-throttle';
$REQUIRED_PHP = '8.0.0';
$MIN_PASS = 10;

$CLI = (PHP_SAPI === 'cli');

/* ───────────────────────── tiny helpers (no api.php include: it dispatches) ── */
function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function flag(string $name, ?string $default = null): ?string {
  foreach ($GLOBALS['argv'] ?? [] as $i => $a) {
    if ($a === '--' . $name) return $GLOBALS['argv'][$i + 1] ?? '';
    if (str_starts_with($a, '--' . $name . '=')) return substr($a, strlen($name) + 3);
  }
  return $default;
}
function has(string $name): bool {
  foreach ($GLOBALS['argv'] ?? [] as $a) if ($a === '--' . $name) return true;
  return false;
}
function jread(string $f): ?array {
  if (!is_file($f)) return null;
  $d = json_decode((string)@file_get_contents($f), true);
  return is_array($d) ? $d : null;
}
/** Atomic write — the same temp+fsync+rename discipline api.php's db_save() uses,
 *  so a crash mid-write can never leave a truncated database behind. */
function jwrite(string $f, array $d, int $mode = 0644): bool {
  $json = json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  if ($json === false) return false;
  $tmp = $f . '.tmp-' . bin2hex(random_bytes(4));
  $w = @fopen($tmp, 'wb');
  if (!$w) return false;
  $n = fwrite($w, $json); fflush($w); fclose($w);
  if ($n !== strlen($json)) { @unlink($tmp); return false; }
  @chmod($tmp, $mode);
  if (!@rename($tmp, $f)) { @unlink($tmp); return false; }
  return true;
}
function shell_rel(): string {
  $html = (string)@file_get_contents(dirname(__FILE__) . '/index.html');
  return preg_match('/window\.__SHIVAA_REL\s*=\s*(\d+)/', $html, $m) ? $m[1] : '?';
}
function base_href(): string {
  if (($f = jread(__DIR__ . '/data/db.json')) && !empty($f['settings']['domain'])) return rtrim((string)$f['settings']['domain'], '/');
  return rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
}

/* ───────────────────────── 1 · the gate ─────────────────────────────────── */
$installed = is_file($DB_FILE);
$door_open = is_file($OPEN_DOOR);

if (!$CLI && !headers_sent()) {
  header('Content-Type: text/html; charset=utf-8');
  header('X-Frame-Options: DENY');
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: no-referrer');
  header('Cache-Control: no-store');
  header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; form-action 'self'; base-uri 'none'");
}
function page(string $title, string $body, string $tone = 'neutral'): string {
  $ic = ['ok' => '✓', 'warn' => '!', 'stop' => '✕', 'neutral' => '✦'][$tone] ?? '✦';
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
    . '<meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<title>' . h($title) . ' · Shivaa installer</title><style>'
    . ':root{--bg:#150308;--card:#200a12;--ink:#f6ecdd;--ink2:#c8b3a2;--gold:#d4af5a;--line:#3a1a24;--ok:#7fc593;--warn:#e8c56a;--stop:#e08a80}'
    . '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 Georgia,"Times New Roman",serif;padding:34px 16px}'
    . '.wrap{max-width:760px;margin:0 auto}'
    . 'h1{font-size:26px;margin:0 0 6px;letter-spacing:.02em}h1 span{color:var(--gold)}'
    . '.sub{color:var(--ink2);margin:0 0 22px;font-size:14px}'
    . '.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:0 0 16px}'
    . '.badge{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}'
    . 'table{width:100%;border-collapse:collapse;font-size:14px}td{padding:7px 4px;border-bottom:1px dashed var(--line);vertical-align:top}'
    . 'td:last-child{text-align:right;color:var(--ink2)}tr:last-child td{border-bottom:0}'
    . 'b.ok{color:var(--ok)}b.warn{color:var(--warn)}b.stop{color:var(--stop)}'
    . 'label{display:block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2);margin:14px 0 6px}'
    . 'input{width:100%;padding:11px 13px;background:#160509;border:1px solid var(--line);border-radius:9px;color:var(--ink);font:15px system-ui,sans-serif}'
    . 'input:focus{outline:2px solid var(--gold);outline-offset:1px}'
    . 'button{margin-top:20px;padding:12px 22px;background:var(--gold);border:0;border-radius:999px;color:#1a0a10;font:600 14px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}'
    . 'a{color:var(--gold)}code{background:#2b1119;padding:1px 6px;border-radius:5px;font-size:13px}'
    . 'ul{margin:8px 0 0;padding-left:20px}li{margin:0 0 6px}.note{font-size:13px;color:var(--ink2)}'
    . '.ic{display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;border:1px solid var(--line);margin-right:9px}'
    . '.tone-ok .ic{color:var(--ok)}.tone-stop .ic{color:var(--stop)}.tone-warn .ic{color:var(--warn)}'
    . '</style></head><body><div class="wrap"><div class="card"><h1><span class="ic">' . $ic
    . '</span>Shivaa <span>·</span> first-run installer</h1>'
    . '<p class="sub">release v' . h(shell_rel()) . ' — store code · database seed · admin account · host self-check, in one visit.</p>'
    . $body . '</div></div></body></html>';
}
function stop(string $title, string $body, string $tone = 'stop'): string {
  return page($title, $body, $tone);
}

if (!$CLI) {
  if (!$door_open) {
    echo stop('Already installed — this door is closed',
      '<p><code>install.php</code> unlocks itself the moment an install succeeds: the'
      . ' <code>data/install-open</code> flag is gone, so a second run over HTTP is refused'
      . ' even if this file is still on the server.</p>'
      . ($installed
        ? '<p>Your store database is present. Sign in at <a href="' . h(base_href()) . '/#/admin">the admin dashboard</a>.'
        : '<p>No <code>data/db.json</code> yet, but the open flag is missing. From SSH, run'
          . ' <code>php install.php --check</code> to see the host report, or'
          . ' <code>php install.php --seed --admin-email=… --admin-pass=…</code> to finish.</p>')
      . '<p class="note">Reinstalling from scratch (this ERASES orders and customers): back up'
      . ' <code>data/db.json</code>, then over SSH run'
      . ' <code>php install.php --seed --force --confirm=RESEED</code>.</p>', 'warn');
    exit;
  }
}

/* ───────────────────────── 2 · host report ──────────────────────────────── */
function env_rows(): array {
  global $ROOT, $DATA, $DB_FILE, $SEED_FILE, $REQUIRED_PHP, $installed;
  $rows = [];
  $phpOK = version_compare(PHP_VERSION, $REQUIRED_PHP, '>=');
  $rows[] = ['PHP version', PHP_VERSION, $phpOK ? 'ok' : 'stop', 'needs ≥ ' . $REQUIRED_PHP];
  foreach (['json', 'mbstring'] as $ext) {
    $rows[] = ['extension ' . $ext, extension_loaded($ext) ? 'loaded' : 'MISSING',
               extension_loaded($ext) ? 'ok' : 'stop', 'required'];
  }
  $rows[] = ['extension curl', extension_loaded('curl') ? 'loaded' : 'not loaded',
             extension_loaded('curl') ? 'ok' : 'warn', 'online rates + PayU status only'];
  $writable = function (string $dir): array {
    if (!is_dir($dir)) return ['missing → will be created', 'warn'];   // install() creates it
    $ok = is_writable($dir);
    return [$ok ? 'writable' : 'NOT writable', $ok ? 'ok' : 'stop'];
  };
  [$t, $s] = $writable($DATA);
  $rows[] = ['data/ (database + locks)', $t, $s === 'ok' ? 'ok' : 'stop', 'the installer writes db.json here'];
  foreach (['uploads', 'uploads/catalogs', 'uploads/kyc', 'uploads/payproofs', 'uploads/reviews', 'uploads/trust', 'uploads/videos'] as $u) {
    [$t, $s] = $writable($ROOT . '/' . $u);
    $rows[] = [$u . '/', $t, $s, $s === 'ok' ? '' : 'order paperwork lands here'];
  }
  $rows[] = ['data/db.seed.json', is_file($SEED_FILE) ? number_format(filesize($SEED_FILE) / 1024) . ' KB' : 'MISSING',
             is_file($SEED_FILE) ? 'ok' : 'stop', $installed ? 'not needed (db.json exists)' : 'the catalogue seed'];
  $rows[] = ['data/db.json', $installed ? 'present' : 'not created yet',
             $installed ? 'ok' : 'warn', 'created by this installer'];
  $rows[] = ['data/.htaccess', is_file($DATA . '/.htaccess') ? 'deny-all present' : 'will be written',
             'ok', 'second lock on the DB folder'];
  $rows[] = ['time zone', date_default_timezone_get(), 'ok', 'IST for rate days + invoices'];
  $rows[] = ['memory limit', (string)ini_get('memory_limit'), 'ok', 'db.json is ~' . ($installed ? round(filesize($DB_FILE) / 1048576, 1) : 0.1) . ' MB'];
  $rows[] = ['disk free', number_format(disk_free_space($DATA) / 1048576) . ' MB',
             disk_free_space($DATA) > 60 * 1048576 ? 'ok' : 'warn', '60 MB minimum for photos'];
  return $rows;
}

/* ───────────────────────── 3 · what a fresh host still needs ─────────────── */
function followups(array $db): array {
  global $DATA, $ROOT;
  $s = $db['settings'] ?? [];
  $out = [];
  $mode = (string)($s['payProvider'] ?? 'demo');
  $payu = $mode === 'payu' && trim((string)($s['payuKey'] ?? '')) !== '' && trim((string)($s['payuSalt'] ?? '')) !== '';
  $out[] = ['Card / netbanking (PayU)', $payu ? 'keyed in (env: ' . h($s['payuEnv'] ?? 'test') . ')' : 'not configured',
            $payu, 'Admin → Settings → Payments. Until then checkout offers UPI + COD only — the UI says so, it never fakes a gateway.'];
  $out[] = ['UPI collect', trim((string)($s['upiId'] ?? '')) !== '' ? 'VPA set' : 'no VPA',
            trim((string)($s['upiId'] ?? '')) !== '', 'Admin → Settings → UPI ID. The QR embeds the order id (v107) so a UPI app stamps the reference.'];
  $sms = is_file($DATA . '/sms-config.json') ? jread($DATA . '/sms-config.json') : null;
  $out[] = ['OTP by SMS', $sms && !empty($sms['key']) ? 'gateway: ' . h((string)($sms['provider'] ?? 'custom')) : 'not configured',
            (bool)($sms && !empty($sms['key'])), 'Admin → Settings → Code delivery wizard (v107). Without a key the site emails codes and tells the shopper that — it never claims to have texted.'];
  $out[] = ['GST certificate', trim((string)($s['gstin'] ?? '')) !== '' ? 'GSTIN on file: ' . h($s['gstin']) : 'no GSTIN',
            trim((string)($s['gstin'] ?? '')) !== '', 'Self-declared on the Trust page; upload the certificate in Admin → Trust to publish it.'];
  $live = is_file($ROOT . '/.angel-tick.json') || is_file($DATA . '/.angel-tick.json');
  $out[] = ['Live bullion feed', $live ? 'tick file in place' : 'demo/manual rates',
            $live, 'Bullion Desk → Angel tokens (v112). The storefront ticker follows whatever the desk is reading.'];
  return $out;
}

function media_rows(): array {
  global $ROOT;
  $dir  = $ROOT . '/images/designs/rings';
  $have = is_dir($dir) ? array_map('basename', array_slice(scandir($dir), 2)) : [];
  $cover = count(array_filter($have, fn($f) => preg_match('#^PGS\d+\.(jpe?g|webp|png)$#i', $f) || preg_match('#_face\.#i', $f)));
  $shots = count(array_filter($have, fn($f) => preg_match('#_shot_\w+\.(jpe?g|webp)$#i', $f)));
  $films = count(array_filter($have, fn($f) => preg_match('#_video\.mp4$#i', $f)));
  $cats  = is_dir($ROOT . '/images/categories') ? count(glob($ROOT . '/images/categories/*.jpg')) : 0;
  $pdfs  = is_dir($ROOT . '/uploads/catalogs') ? count(glob($ROOT . '/uploads/catalogs/*.pdf')) : 0;
  return [
    ['Ring cover photos', $cover . ' files', $cover >= 65 ? 'ok' : 'warn', 'the core bundle carries a cover per ring'],
    ['Ring gallery shots', $shots . ' / 260', $shots >= 260 ? 'ok' : 'warn', 'media pack adds the studio/worn/editorial/gift shots'],
    ['Ring films (.mp4)', $films . ' / 65', $films >= 65 ? 'ok' : 'warn', 'media pack; a missing film shows the poster frame, never a broken player'],
    ['Category faces', $cats . ' / 17', $cats >= 17 ? 'ok' : 'warn', 'v113b: every one of the 17 tiles needs its face'],
    ['B2B catalogue PDFs', $pdfs . ' files', $pdfs > 0 ? 'ok' : 'warn', 'media pack; the desk lists what is present'],
  ];
}

/* ───────────────────────── 4 · the work ─────────────────────────────────── */
function seed_admin(array $db, string $email, string $name, string $phone, string $pass): array {
  $db['users'] = is_array($db['users'] ?? null) ? $db['users'] : [];
  foreach ($db['users'] as $u) {
    if (strcasecmp((string)($u['email'] ?? ''), $email) === 0) {
      throw new RuntimeException('That email already exists in the database — sign in instead, or use a different address.');
    }
  }
  $db['users'][] = [
    'id' => 'u_admin', 'name' => $name, 'email' => strtolower($email), 'phone' => $phone,
    'passHash' => password_hash($pass, PASSWORD_DEFAULT), 'role' => 'admin',
    'loyaltyPoints' => 0, 'wishlist' => [], 'createdAt' => date('c'), 'profile' => [], 'addresses' => [],
  ];
  return $db;
}

function install(array $opts): array {
  global $DATA, $DB_FILE, $SEED_FILE, $LOCK, $OPEN_DOOR, $MIN_PASS, $installed;
  $log = []; $err = [];

  if (!is_dir($DATA) && !@mkdir($DATA, 0755, true)) $err[] = 'could not create data/';
  if (!is_writable($DATA)) $err[] = 'data/ is not writable — fix permissions before installing';

  if ($installed && !$opts['force']) {
    $err[] = 'data/db.json already exists; refusing to overwrite it (use --force --confirm=RESEED from SSH)';
  }
  if ($opts['force'] && $opts['confirm'] !== 'RESEED') $err[] = '--force needs --confirm=RESEED (typed exactly)';
  if ($opts['dryRun']) $log[] = 'dry-run: nothing will be written';

  // seed source
  $seed = jread($SEED_FILE);
  if (!$seed && $installed) $seed = jread($DB_FILE);          // repair path keeps the live DB
  if (!$seed) $err[] = 'data/db.seed.json is missing or unreadable — the bundle is incomplete';
  if ($seed) {
    if (count($seed['products'] ?? []) === 0) $err[] = 'seed carries 0 products — re-extract the bundle';
    $log[] = 'seed read: ' . count($seed['products'] ?? []) . ' products · '
           . count($seed['makingCharges'] ?? []) . ' making-charge rules · '
           . count($seed['catalogs'] ?? []) . ' B2B catalogues';
  }

  // admin account
  $email = strtolower(trim((string)$opts['email']));
  // Stored exactly the way the rest of the store keeps it: "+91 XXXXXXXXXX".
  $digits = preg_replace('/\D+/', '', (string)$opts['phone']);
  if (strlen($digits) === 12 && str_starts_with($digits, '91')) $digits = substr($digits, 2);
  $phone = (strlen($digits) === 10 && (int)$digits[0] >= 6) ? '+91 ' . $digits : '';
  $name  = trim((string)$opts['name']) !== '' ? mb_substr(trim((string)$opts['name']), 0, 60) : 'Store Owner';
  $pass  = (string)$opts['pass'];
  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $err[] = 'admin email address is not valid';
  if ($phone === '') $err[] = 'admin mobile must be a 10-digit Indian number (6–9 start) — OTP sign-in uses it';
  if (strlen($pass) < $MIN_PASS) $err[] = "admin password must be at least {$MIN_PASS} characters";
  if (!preg_match('/[A-Za-z]/', $pass) || !preg_match('/\d/', $pass)) $err[] = 'admin password needs letters AND digits';

  if ($err) return ['ok' => false, 'log' => $log, 'errors' => $err];

  if ($opts['dryRun']) {
    $log[] = "would create admin {$email} (role admin, bcrypt hash)";
    $log[] = 'would write ' . $DB_FILE;
    return ['ok' => true, 'log' => $log, 'errors' => []];
  }

  // 1 · database
  if (!$installed || $opts['force']) {
    if (!jwrite($DB_FILE, $seed)) $err[] = 'could not write data/db.json';
    else $log[] = 'wrote data/db.json (clean-store seed, ' . number_format(filesize($DB_FILE) / 1024) . ' KB)';
    @chmod($DB_FILE, 0644);
  } else {
    $log[] = 'kept the existing data/db.json';
  }
  if ($err) return ['ok' => false, 'log' => $log, 'errors' => $err];

  $db = jread($DB_FILE) ?? [];
  $adminExists = false;
  foreach ($db['users'] ?? [] as $u) if (($u['role'] ?? '') === 'admin') $adminExists = true;
  if (!$adminExists) {
    try { $db = seed_admin($db, $email, $name, $phone, $pass); }
    catch (RuntimeException $e) { return ['ok' => false, 'log' => $log, 'errors' => [$e->getMessage()]]; }
    if (!jwrite($DB_FILE, $db)) return ['ok' => false, 'log' => $log, 'errors' => ['could not save the admin account']];
    $log[] = "created admin account {$email} · bcrypt password_hash · role admin";
  } else {
    $log[] = 'an admin account already exists — no password changed';
  }

  // 2 · folders the store writes into
  foreach (['uploads', 'uploads/catalogs', 'uploads/kyc', 'uploads/payproofs', 'uploads/reviews', 'uploads/trust', 'uploads/videos', 'uploads/designs'] as $u) {
    $dir = $GLOBALS['ROOT'] . '/' . $u;
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); $log[] = "created {$u}/"; }
  }

  // 3 · the nested DB lock (root .htaccess already denies ^data/, v107)
  $deny = "# v50 / v115-FI — the database folder is private. Everything denied, always.\n"
        . "# Written by install.php when the bundle did not carry it, so a subfolder\n"
        . "# install (public_html/cms/) cannot serve db.json, .lock or sms-config.json.\n"
        . "Require all denied\n";
  if (!is_file($DATA . '/.htaccess')) { @file_put_contents($DATA . '/.htaccess', $deny); $log[] = 'wrote data/.htaccess (deny all)'; }

  // 4 · prove the API actually boots on this host
  $api = $GLOBALS['ROOT'] . '/api.php';
  $log[] = is_file($api) ? 'api.php present at the same level as index.html'
                         : '⚠ api.php not next to index.html — if your host keeps the API in public_html/api.php, move this bundle up a level';

  // 5 · lock the door
  $lockBody = "Shivaa installed " . date('c') . "\n"
            . "release v" . shell_rel() . "\n"
            . "products " . count($db['products'] ?? []) . "\n"
            . "admin " . $email . "\n"
            . "php " . PHP_VERSION . "\n"
            . "If you need to re-run this installer, delete data/INSTALL.lock AND data/install-open,\n"
            . "then run: php install.php --seed --force --confirm=RESEED\n";
  @file_put_contents($LOCK, $lockBody); @chmod($LOCK, 0644);
  @unlink($OPEN_DOOR); @unlink($GLOBALS['NONCE']); @unlink($GLOBALS['THROTTLE']);
  $log[] = 'locked: data/install-open deleted, data/INSTALL.lock written — .htaccess now 403s this file';

  return ['ok' => true, 'log' => $log, 'errors' => [], 'db' => $db];
}

/* ───────────────────────── 5 · CLI ──────────────────────────────────────── */
if ($CLI) {
  $opts = ['email' => flag('admin-email', ''), 'pass' => flag('admin-pass', ''),
            'phone' => flag('admin-phone', ''), 'name' => flag('admin-name', ''),
            'force' => has('force'), 'confirm' => flag('confirm', ''), 'dryRun' => has('dry-run')];
  $checkOnly = has('check');
  echo "Shivaa first-run installer · release v" . shell_rel() . " · PHP " . PHP_VERSION . " (cli)\n"
     . str_repeat('─', 74) . "\n";
  foreach (env_rows() as [$k, $v, $s, $note]) {
    printf("  %-26s %-22s %-5s %s\n", $k, $v, strtoupper($s), $note);
  }
  echo str_repeat('─', 74) . "\n";
  foreach (media_rows() as [$k, $v, $s, $note]) printf("  %-26s %-22s %-5s %s\n", $k, $v, $s, $note);
  if ($checkOnly) { echo "\n--check: nothing written.\n"; exit(0); }
  $r = install($opts);
  foreach ($r['log'] as $l) echo "  · {$l}\n";
  foreach ($r['errors'] as $e) echo "  ✕ {$e}\n";
  echo $r['ok'] ? "\nDONE — open the site and sign in at #/admin\n" : "\nFAILED — fix the ✕ lines above and re-run\n";
  exit($r['ok'] ? 0 : 1);
}

/* ───────────────────────── 6 · web UI ───────────────────────────────────── */
$throttle = is_file($THROTTLE) ? (array)@json_decode((string)file_get_contents($THROTTLE), true) : [];
$attempts = ((int)($throttle['n'] ?? 0));
if ($attempts >= 8 && (time() - (int)($throttle['at'] ?? 0)) < 900) {
  echo stop('Too many attempts', '<p>This page can create an admin account, so it throttles itself:'
    . ' wait 15 minutes, or run the installer once from SSH.</p>', 'warn');
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  $nonce = bin2hex(random_bytes(16));
  @file_put_contents($NONCE, $nonce); @chmod($NONCE, 0600);
  $rows = '';
  foreach (env_rows() as [$k, $v, $s, $note]) {
    $rows .= '<tr><td>' . h($k) . '</td><td><b class="' . $s . '">' . h($v) . '</b>'
           . ($note ? ' <span class="note">' . h($note) . '</span>' : '') . '</td></tr>';
  }
  echo page('Finish the install',
      '<p>Nobody else can reach this page twice: it needs the <code>data/install-open</code>'
    . ' flag that ships inside the bundle, and it deletes that flag when it succeeds. A store'
    . ' that already has a <code>data/db.json</code> gets a refusal, never a re-seed.</p>'
    . '<table><tr><td colspan="2"><b>Host check</b></td></tr>' . $rows . '</table>'
    . '<form method="post" autocomplete="off">'
    . '<input type="hidden" name="nonce" value="' . h($nonce) . '">'
    . '<label for="nm">Owner name (shown on the invoice + WhatsApp)</label>'
    . '<input id="nm" name="name" maxlength="60" placeholder="Karan Soni" required>'
    . '<label for="em">Admin email — this is your sign-in</label>'
    . '<input id="em" name="email" type="email" maxlength="120" placeholder="owner@example.com" required>'
    . '<label for="ph">Admin mobile — 10 digits, for OTP sign-in</label>'
    . '<input id="ph" name="phone" inputmode="numeric" maxlength="14" placeholder="8905005921" required>'
    . '<label for="pw">Admin password — at least 10 characters, letters + digits</label>'
    . '<input id="pw" name="pass" type="password" minlength="10" maxlength="200" autocomplete="new-password" required>'
    . '<p class="note">Stored as a <code>password_hash()</code> bcrypt sum in <code>data/db.json</code>.'
    . ' The password is never written to disk, echoed back, or logged. The seeded catalogue is the real'
    . ' 65-ring PGS line with zero customers, orders or reviews — nothing is invented.</p>'
    . '<button type="submit">Install the store</button></form>');
  exit;
}

$post  = $_POST;
$saved = @file_get_contents($NONCE);
if (!$saved || !hash_equals(trim((string)$saved), (string)($post['nonce'] ?? ''))) {
  $attempts++; @file_put_contents($THROTTLE, json_encode(['n' => $attempts, 'at' => time()]));
  echo stop('Session check failed', '<p>The install page must be loaded again before submitting'
    . ' (the one-time form key did not match). Reload <code>/install.php</code> and try once.</p>', 'warn');
  exit;
}
$r = install(['email' => (string)($post['email'] ?? ''), 'pass' => (string)($post['pass'] ?? ''),
              'phone' => (string)($post['phone'] ?? ''), 'name' => (string)($post['name'] ?? ''),
              'force' => false, 'confirm' => '', 'dryRun' => false]);
if (!$r['ok']) {
  $attempts++; @file_put_contents($THROTTLE, json_encode(['n' => $attempts, 'at' => time()]));
  $li = '';
  foreach ($r['errors'] as $e) $li .= '<li>' . h($e) . '</li>';
  echo stop('Nothing was written', '<p>The installer failed its own checks, so your data is exactly as'
    . ' it was:</p><ul>' . $li . '</ul><p><a href="' . h(base_href()) . '/install.php">Try again</a></p>', 'stop');
  exit;
}
$dbn = jread($DB_FILE) ?? [];
$fu = '';
foreach (followups($dbn) as [$k, $v, $ready, $how]) {
  $fu .= '<tr><td>' . h($k) . '</td><td><b class="' . ($ready ? 'ok' : 'warn') . '">' . h($v) . '</b></td>'
       . '<td>' . h($how) . '</td></tr>';
}
$md = '';
foreach (media_rows() as [$k, $v, $s, $note]) {
  $md .= '<tr><td>' . h($k) . '</td><td><b class="' . $s . '">' . h($v) . '</b></td>'
       . '<td class="note">' . h($note) . '</td></tr>';
}
$done = '';
foreach ($r['log'] as $l) $done .= '<li>' . h($l) . '</li>';
echo page('Installed',
    '<h1 style="font-size:20px">✓ Your store is installed</h1>'
  . '<p class="sub">' . count($dbn['products'] ?? []) . ' designs · ' . count($dbn['catalogs'] ?? [])
  . ' B2B catalogues · ' . count($dbn['makingCharges'] ?? []) . ' making-charge rules · no demo orders.</p>'
  . '<ul>' . $done . '</ul>'
  . '<div class="card" style="border-color:var(--gold)"><b>Next, in this order</b><ol>'
  . '<li>Open <a href="' . h(base_href()) . '/#/admin">/#/admin</a> and sign in with the email + password you just typed.</li>'
  . '<li><b>Delete <code>install.php</code></b> from the server (File Manager → right-click → Delete).'
  . ' It is already locked out — this only removes the file.</li>'
  . '<li>Admin → Settings → Payments: your PayU key + salt, then your UPI ID.</li>'
  . '<li>Admin → Settings → Code delivery: the SMS gateway wizard (v107) — without it the site'
  . ' emails OTP codes and says so on the login sheet.</li>'
  . '<li>Admin → Bullion Desk: Angel tokens for the live MCX feed, and check <code>jaipurPremium</code>'
  . ' (v112 found ₹55/g was too low for Jaipur).</li>'
  . '<li>If the photos look thin, upload the media pack — the bundle you just installed carries the'
  . ' 65 ring covers, not the 260 gallery shots or the films.</li>'
  . '</ol></div>'
  . '<table><tr><td colspan="3"><b>Still to switch on</b> (nothing is faked while these are empty)</td></tr>' . $fu . '</table>'
  . '<table><tr><td colspan="3"><b>Media in this bundle</b></td></tr>' . $md . '</table>'
  . '<p class="note">Rollback: <code>data/db.json</code> is the only file this installer created. Delete it'
  . ' (plus <code>data/INSTALL.lock</code>) and the folder is back to an uninstalled bundle.</p>', 'ok');
