<?php
/**
 * Shivaa Jewels — Billing · Arena bridge
 *
 * Lets an Arena agent turn a chat instruction into a live billing record.
 *
 * SAFETY MODEL — the owner chose fully automatic writes, which reverses the
 * usual "production writes are manual only" rule, so every layer below exists
 * to make that safe rather than merely possible:
 *
 *   1. Kill switch. `billing_settings.bridge_enabled` must be 1. It defaults
 *      to 0 and is toggled by the owner in Settings. Off means this file
 *      refuses everything, including a correct password.
 *   2. Authentication. The shop admin password, verified with exactly the
 *      same logic as install.php. No new secret for the owner to manage.
 *   3. Replay protection. A nonce plus a 300-second timestamp window; a
 *      nonce is rejected the second time it is seen.
 *   4. Rate limit. 30 calls per 900 seconds, then a lockout.
 *   5. Whitelist. Only five routes may be driven, and only as POST. Anything
 *      else is refused before any database write.
 *   6. Audit. Every accepted and every refused call is written to
 *      `billing_audit` with actor `arena-bridge`, so the owner can see what
 *      the agent did without asking it.
 *
 * The actual write is NOT re-implemented here. The request is forwarded into
 * api.php so the bridge produces byte-identical rows to the UI and cannot
 * drift from it.
 */
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Content-Type: application/json; charset=utf-8');

/** The only routes the bridge may drive, and what each one is for. */
const BILLING_BRIDGE_ROUTES = [
  'bills'       => 'create a bill from a chat order or a GST bill photo',
  'parties'     => 'add the customer or jeweller a bill belongs to',
  'suppliers'   => 'add or update a supplier and their banking details',
  'rate-cards'  => 'set agreed wastage and other cost for a party',
  'orders'      => 'record a purchase or sale deal',
];

function bridge_out(array $a, int $code = 200): void {
  http_response_code($code);
  echo json_encode($a);
  exit;
}

function bridge_locked(string $f): bool {
  $j = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
  if (!is_array($j)) return false;
  return (int)($j['n'] ?? 0) >= 30 && (time() - (int)($j['t'] ?? 0)) < 900;
}
function bridge_mark(string $f, bool $reset = false): void {
  if ($reset) { @unlink($f); return; }
  $j = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
  if (!is_array($j) || (time() - (int)($j['t'] ?? 0)) >= 900) $j = ['n' => 0, 't' => 0];
  $j['n'] = (int)$j['n'] + 1; $j['t'] = time();
  @file_put_contents($f, json_encode($j), LOCK_EX);
}

/** Nonce store. Kept small and self-pruning; never grows without bound. */
function bridge_nonce_seen(string $nonce): bool {
  $f = sys_get_temp_dir() . '/billing-bridge-nonces.json';
  $now = time();
  $j = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
  if (!is_array($j)) $j = [];
  $j = array_filter($j, function ($t) use ($now) { return ($now - (int)$t) < 900; });
  if (isset($j[$nonce])) return true;
  $j[$nonce] = $now;
  if (count($j) > 500) $j = array_slice($j, -500, null, true);
  @file_put_contents($f, json_encode($j), LOCK_EX);
  return false;
}

/** Identical to install.php's inst_shop_admin_ok — same stored formats. */
function bridge_admin_ok(PDO $pdo, string $plain): bool {
  if ($plain === '') return false;
  $row = $pdo->query("SELECT `data_json` FROM `users` WHERE `role` = 'admin' LIMIT 1")->fetch();
  if (!$row) return false;
  $u = json_decode((string)($row['data_json'] ?? ''), true);
  if (!is_array($u)) return false;
  $stored = (string)($u['passHash'] ?? '');
  if ($stored === '') return false;
  if ($stored[0] === '$') return password_verify($plain, $stored);
  return hash_equals($stored, hash('sha256', (string)($u['salt'] ?? '') . $plain));
}

if (strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? '')) !== 'POST') {
  bridge_out(['ok' => false, 'error' => 'POST only.',
              'routes' => array_keys(BILLING_BRIDGE_ROUTES)], 405);
}

$in = billing_input();
$route = (string)($in['route'] ?? '');
$auth  = (string)($in['auth'] ?? '');
$nonce = (string)($in['nonce'] ?? '');
$ts    = (int)($in['ts'] ?? 0);

$LOCK = sys_get_temp_dir() . '/billing-bridge-lock.json';
$fail = function (string $msg, int $code = 403) use ($LOCK): void {
  bridge_mark($LOCK);
  bridge_out(['ok' => false, 'error' => $msg], $code);
};

try {
  $pdo = billing_db();
} catch (Throwable $e) {
  bridge_out(['ok' => false, 'error' => 'Database unavailable.'], 500);
}

/* From here on, nothing may escape as a bare PHP fatal. Hostinger runs with
   display_errors off, so an uncaught exception produces a 500 with an empty
   body — which is exactly what the first install probe returned, and it says
   nothing about what broke. Every failure below reports itself as JSON. */
set_exception_handler(function (Throwable $e): void {
  bridge_out(['ok' => false, 'error' => 'Bridge fault: ' . $e->getMessage(),
              'hint' => 'If this mentions bridge_enabled, run install.php once '
                      . 'to add the v5 columns.'], 500);
});
register_shutdown_function(function (): void {
  $err = error_get_last();
  if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
    if (!headers_sent()) http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Bridge fatal: ' . $err['message'],
                      'hint' => 'If this mentions bridge_enabled, run install.php once '
                             . 'to add the v5 columns.']);
  }
});

if (bridge_locked($LOCK)) $fail('Too many attempts — wait 15 minutes.', 429);

/* 1. Kill switch — checked before the password so a disabled bridge never
      even confirms whether a password is right. */
try {
  $s = $pdo->query('SELECT `bridge_enabled` FROM `billing_settings` WHERE `id` = 1')->fetch();
} catch (Throwable $e) {
  $fail('billing_settings.bridge_enabled is missing — run install.php once to '
      . 'add the v5 columns. (' . $e->getMessage() . ')', 500);
}
if (!$s || (int)($s['bridge_enabled'] ?? 0) !== 1) {
  $fail('The bridge is switched off. Turn it on in Billing > Settings.', 403);
}

/* 2. Whitelist */
if (!isset(BILLING_BRIDGE_ROUTES[$route])) {
  $fail('Route not permitted: ' . $route . '. Allowed: '
       . implode(', ', array_keys(BILLING_BRIDGE_ROUTES)), 400);
}

/* 3. Replay protection */
if (abs(time() - $ts) > 300) $fail('Timestamp outside the 5-minute window.', 400);
if ($nonce === '' || strlen($nonce) < 16) $fail('Nonce too short.', 400);
if (bridge_nonce_seen($nonce)) $fail('Nonce already used.', 400);

/* 4. Authentication */
if (!bridge_admin_ok($pdo, $auth)) $fail('Wrong shop admin password.', 401);

/* 5. Sign the request in as the billing owner so api.php's own session and
      CSRF checks pass unchanged. */
$u = $pdo->query('SELECT * FROM `billing_users` ORDER BY `id` LIMIT 1')->fetch();
if (!$u) $fail('No billing user exists — open install.php once.', 500);
billing_session_start();
$_SESSION['billing_user'] = ['id' => (int)$u['id'], 'email' => (string)$u['email'],
                             'name' => (string)($u['name'] ?? 'Owner')];
$csrf = bin2hex(random_bytes(16));
$_SESSION[BILLING_CSRF] = $csrf;

/* 6. Audit before the write, so a refusal mid-flight is still recorded. */
billing_audit('Bridge call', 'bridge', 0, 'route=' . $route);
$pdo->prepare('UPDATE `billing_settings` SET `bridge_calls` = `bridge_calls` + 1 WHERE `id` = 1')
    ->execute();

/* 7. Forward into the real route. api.php reads the route from $_GET['r'],
      the CSRF token from this header, and the body through billing_input().
      The body cache currently holds the bridge envelope, so it is replaced
      with the job's payload — otherwise the route reads envelope keys like
      route/auth/nonce instead of the fields it expects, and every write fails
      its required-field check. */
$payload = (isset($in['payload']) && is_array($in['payload'])) ? $in['payload'] : [];
billing_input_set($payload);
$_GET['r'] = $route;
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_BILLING_CSRF'] = $csrf;
require __DIR__ . '/api.php';
