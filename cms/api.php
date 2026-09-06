<?php
/* ═══════════════════════════════════════════════════════════════
   SHIVAA API — PHP edition (Hostinger / cPanel shared hosting)
   Same REST API as server.js, same data/db.json, zero dependencies.
   Rewrite rule (see .htaccess): /api/*  →  api.php?__route=…
   ═══════════════════════════════════════════════════════════════ */
declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');

$ROOT = __DIR__;
$DB_FILE = $ROOT . '/data/db.json';
$CAT_DIR = $ROOT . '/uploads/catalogs';
require_once __DIR__ . '/hallmark.php';
require_once __DIR__ . '/trust.php';
require_once __DIR__ . '/sms.php';   // v33 — OTP SMS delivery plug-in (no-op in demo mode)

/* ───────── helpers ───────── */
function jout(int $code, $payload): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  header('X-Frame-Options: DENY');
  header('Referrer-Policy: strict-origin-when-cross-origin');
  header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function now_iso(): string { return date('c'); }
function uid(string $p = 'id'): string { return $p . '_' . bin2hex(random_bytes(6)); }
const MAX_BODY_BYTES = 524288;            // v42 — hard 512 KB cap on every JSON request body
function body_json(): array {
  $raw = file_get_contents('php://input');
  if (strlen((string)$raw) > MAX_BODY_BYTES) jout(413, ['error' => 'Request body too large.']);
  $d = json_decode($raw ?: '{}', true);
  return is_array($d) ? $d : [];
}
function db_load(string $DB_FILE): array {
  for ($i = 0; $i < 5; $i++) {
    $lock = fopen($DB_FILE . '.lock', 'c');
    if (!$lock) break;
    flock($lock, LOCK_SH);
    $raw = file_get_contents($DB_FILE);
    flock($lock, LOCK_UN); fclose($lock);
    $db = json_decode((string)$raw, true);
    if (is_array($db)) return $db;
    usleep(120000);
  }
  jout(500, ['error' => 'Database file unreadable — check data/db.json exists & permissions (755/644)']);
}

/* v42 — bounded-growth housekeeping. Called on every persisted write so the
   single-file DB can never balloon: stale sessions/OTPs/lockouts are dropped,
   and every visitor-written collection is capped at a sane size. */
function db_housekeep(array &$db): void {
  $now = time();
  $db['tokens'] = array_values(array_filter($db['tokens'] ?? [], fn($t) => (int)($t['exp'] ?? 0) > $now));
  if (count($db['tokens']) > 2000) $db['tokens'] = array_slice($db['tokens'], -1500);
  $db['otps'] = array_values(array_filter($db['otps'] ?? [], fn($o) => (int)($o['exp'] ?? 0) > $now - 3600));
  if (count($db['otps']) > 300) $db['otps'] = array_slice($db['otps'], -200);
  $lf = $db['loginfails'] ?? [];
  $lf = array_filter($lf, fn($f) => (int)($f['until'] ?? 0) > $now || (int)($f['at'] ?? $now) >= $now - 86400);
  if (count($lf) > 600) $lf = array_slice($lf, -400, null, true);
  $db['loginfails'] = $lf;
  $th = $db['throttle'] ?? [];
  $th = array_filter($th, fn($v) => $now - (int)($v['at'] ?? 0) <= 3600);
  if (count($th) > 600) $th = array_slice($th, -400, null, true);
  $db['throttle'] = $th;
  $caps = ['rateAlerts' => 800, 'contactMsgs' => 1200, 'newsletter' => 2500, 'serviceRequests' => 1000, 'reviews' => 3000];
  foreach ($caps as $col => $cap) {
    if (!is_array($db[$col] ?? null)) continue;
    if (count($db[$col]) > $cap) $db[$col] = array_slice($db[$col], -$cap);
  }
  // NOTE: do NOT recompute product ratings here — that is O(products × reviews)
  // per save; only the reviews POST route is allowed to mutate ratings.
}

function db_save(string $DB_FILE, array &$db): void {
  db_housekeep($db);
  $lock = fopen($DB_FILE . '.lock', 'c');
  if ($lock) flock($lock, LOCK_EX);
  file_put_contents($DB_FILE, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
}

/* v42 — real client identity for lockouts/rate limits. Never trust
   X-Forwarded-For: any direct client can spoof it to dodge a ban. Hostinger's
   proxy (mod_remoteip) already writes the true client into REMOTE_ADDR. */
function client_ip(): string {
  $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
  $ip = preg_replace('/[^0-9a-fA-F:.%]/', '', $ip);
  return substr($ip ?: '0.0.0.0', 0, 45);
}

/* v42 — per-IP sliding-window throttle for visitor-write endpoints. */
function throttle_hit(array &$db, string $bucket, int $max, int $winSec): void {
  if ($max <= 0) return;
  $now = time();
  $t = is_array($db['throttle'] ?? null) ? $db['throttle'] : [];
  $key = client_ip() . '|' . $bucket;
  $rec = $t[$key] ?? ['n' => 0, 'at' => $now];
  if ($now - (int)$rec['at'] > $winSec) $rec = ['n' => 0, 'at' => $now];
  if ((int)$rec['n'] >= $max) {
    $db['throttle'] = $t;
    jout(429, ['error' => 'Too many requests — please wait a few minutes and try again.']);
  }
  $rec['n']++; $rec['at'] = $now;
  $t[$key] = $rec;
  $db['throttle'] = $t;
}

/* v42 — truncate + strip control characters from any free-text field. */
function tcap($v, int $max = 500): string {
  $s = (string)$v;
  $s = (string)preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', ' ', $s);
  $s = trim($s);
  return function_exists('mb_substr') ? mb_substr($s, 0, $max) : substr($s, 0, $max);
}

/* v42 — human-friendly reference number: prefix + yymmdd + 4 random hex. */
function ref_id(string $prefix): string {
  return $prefix . date('ymd') . strtoupper(bin2hex(random_bytes(2)));
}
function clampn($v, $a, $b) { return max($a, min($b, $v)); }
function cut500(string $s): string { return function_exists('mb_substr') ? mb_substr($s, 0, 500) : substr($s, 0, 500); }
function fetch_url(string $url, int $timeout = 4): ?array {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => $timeout,
    CURLOPT_CONNECTTIMEOUT => $timeout,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Shivaa/1.0)',
  ]);
  $raw = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  if (!$raw || $code >= 400) return null;
  $d = json_decode($raw, true);
  return is_array($d) ? $d : null;
}

/* ───────── rate engine (identical math to Node) ───────── */
const PURITY_22 = 0.9167, PURITY_18 = 0.75, OZ = 31.1034768;
const BASE_GOLD = 11850.0, BASE_SILVER = 168.0;

function rates_refresh(array &$db): array {
  $last = $db['rates']['last'] ?? null;
  $gold24 = $last['gold24'] ?? BASE_GOLD;
  $silver = $last['silver'] ?? BASE_SILVER;
  $source = 'simulated';
  $gold = fetch_url('https://api.gold-api.com/price/XAU');
  $silv = fetch_url('https://api.gold-api.com/price/XAG');
  $fx = fetch_url('https://open.er-api.com/v6/latest/USD');
  if ($gold && isset($gold['price']) && $silv && isset($silv['price']) && $fx && isset($fx['rates']['INR'])) {
    $inr = (float)$fx['rates']['INR'];
    $gold24 = ((float)$gold['price'] * $inr) / OZ;
    $silver = ((float)$silv['price'] * $inr) / OZ;
    $source = 'live';
  } else {
    $gold24 = clampn($gold24 * (1 + (mt_rand(-35, 35) / 10000)), BASE_GOLD * 0.96, BASE_GOLD * 1.04);
    $silver = clampn($silver * (1 + (mt_rand(-50, 50) / 10000)), BASE_SILVER * 0.96, BASE_SILVER * 1.04);
    $source = ($last['source'] ?? '') === 'live' ? 'cached+sim' : 'simulated';
  }
  $stamp = [
    't' => now_iso(),
    'gold24' => (int)round($gold24),
    'gold22' => (int)round($gold24 * PURITY_22),
    'gold18' => (int)round($gold24 * PURITY_18),
    'silver' => round($silver, 1),
    'source' => $source,
  ];
  $db['rates']['last'] = $stamp;
  $db['rates']['history'][] = $stamp;
  if (count($db['rates']['history']) > 720) $db['rates']['history'] = array_slice($db['rates']['history'], -720);
  return $stamp;
}
function rates_stale(array $db): bool {
  $t = $db['rates']['last']['t'] ?? null;
  if (!$t) return true;
  return (time() - strtotime($t)) > 11 * 60;
}
function current_rates(array $db): array {
  $ov = $db['rates']['override'] ?? null;
  if ($ov) return ['gold24' => (int)$ov['gold24'], 'gold22' => (int)$ov['gold22'], 'gold18' => (int)$ov['gold18'], 'silver' => (double)$ov['silver']];
  $l = $db['rates']['last'];
  $gp = (int)($db['settings']['jaipurPremium'] ?? 55); $sp = (double)($db['settings']['jaipurSilverPremium'] ?? 3);
  return ['gold24' => (int)$l['gold24'] + $gp, 'gold22' => (int)$l['gold22'] + $gp,
          'gold18' => (int)$l['gold18'] + (int)round($gp * 0.75), 'silver' => round((double)$l['silver'] + $sp, 1)];
}
function gstin_check(string $g): array {
  $g = strtoupper(trim($g));
  if (!preg_match('#^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$#', $g)) return ['valid' => false, 'reason' => 'Format must be 15 chars, e.g. 08AABCU9603R1ZM'];
  $states = ['08'=>'Rajasthan','27'=>'Maharashtra','29'=>'Karnataka','24'=>'Gujarat','07'=>'Delhi','09'=>'UP','33'=>'Tamil Nadu','36'=>'Telangana','19'=>'West Bengal','23'=>'Madhya Pradesh','32'=>'Kerala','06'=>'Haryana','03'=>'Punjab','05'=>'Uttarakhand','30'=>'Goa','37'=>'Andhra Pradesh'];
  $state = $states[substr($g, 0, 2)] ?? null;
  if (!$state) return ['valid' => false, 'reason' => 'Unknown state code'];
  $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  $sum = 0;
  for ($i = 0; $i < 14; $i++) {
    $n = strpos($chars, $g[$i]); if ($n === false) return ['valid' => false, 'reason' => 'Illegal character'];
    $n *= ($i % 2 === 0) ? 1 : 2;
    $sum += intdiv($n, 36) + ($n % 36);
  }
  if ($g[14] !== $chars[(36 - ($sum % 36)) % 36]) return ['valid' => false, 'reason' => 'Checksum failed — please retype the GSTIN'];
  return ['valid' => true, 'state' => $state, 'pan' => substr($g, 2, 10)];
}
function compute_price(array $p, array $R): array {
  $key = $p['metal'] === 'Silver' ? 'silver' : ('gold' . str_replace('K', '', $p['purity']));
  $rate = (float)$R[$key];
  $metalValue = (int)round($rate * (float)$p['weightG']);
  $makingCharge = (int)round($p['mcScheme'] === 'percent' ? $metalValue * (float)$p['mcValue'] / 100 : ($p['mcScheme'] === 'perGram' ? (float)$p['mcValue'] * (float)$p['weightG'] : (float)$p['mcValue']));
  $stoneValue = (int)round((float)($p['stoneValue'] ?? 0));
  $subtotal = $metalValue + $makingCharge + $stoneValue;
  $gst = (int)round($subtotal * 0.03);
  return ['ratePerGram' => round($rate, 2), 'metalValue' => $metalValue, 'makingCharge' => $makingCharge,
          'stoneValue' => $stoneValue, 'subtotal' => $subtotal, 'gst' => $gst, 'total' => $subtotal + $gst];
}

/* ───────── auth ───────── */
/* ── password hashing (bcrypt, with transparent upgrade from legacy sha256+salt) ── */
function pw_hash(string $plain): string { return password_hash($plain, PASSWORD_DEFAULT); }

/**
 * Verifies $plain against a user record. Supports both the modern
 * password_hash() format and the legacy sha256(salt.plain) scheme.
 * Sets $needsRehash when the stored credential should be upgraded.
 */
function pw_verify(array $u, string $plain, bool &$needsRehash = false): bool {
  $needsRehash = false;
  $stored = (string)($u['passHash'] ?? '');
  if ($stored === '') return false;
  // modern bcrypt/argon hashes always start with $
  if ($stored[0] === '$') {
    if (!password_verify($plain, $stored)) return false;
    $needsRehash = password_needs_rehash($stored, PASSWORD_DEFAULT);
    return true;
  }
  // legacy: sha256(salt . plain) — constant-time compare, then flag for upgrade
  $ok = hash_equals($stored, hash('sha256', (string)($u['salt'] ?? '') . $plain));
  if ($ok) $needsRehash = true;
  return $ok;
}

function issue_token(array &$db, array $user): string {
  $tk = bin2hex(random_bytes(24));
  $db['tokens'] = $db['tokens'] ?? [];
  $db['tokens'][$tk] = ['userId' => $user['id'], 'exp' => time() + 30 * 86400];
  return $tk;
}
function req_user(array $db): ?array {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('#^Bearer (\w+)$#', $h, $m)) return null;
  $tk = $db['tokens'][$m[1]] ?? null;
  if (!$tk || $tk['exp'] < time()) return null;
  foreach ($db['users'] as $u) if ($u['id'] === $tk['userId']) return $u;
  return null;
}
function pub_user(array $u): array {
  return ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'phone' => $u['phone'] ?? '',
          'role' => $u['role'], 'loyaltyPoints' => $u['loyaltyPoints'] ?? 0, 'partnerId' => $u['partnerId'] ?? null,
          'createdAt' => $u['createdAt'] ?? '', 'profile' => $u['profile'] ?? [], 'addresses' => $u['addresses'] ?? []];
}
function need_admin(array $db): array {
  $u = req_user($db);
  if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
  return $u;
}

function bullion_defaults(): array {
  return ['cash' => [
    'goldImport995' => ['label' => 'Imported Gold 995 — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldIndian' => ['label' => 'Indian Gold (IND) — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldRef9930' => ['label' => 'Ref. Gold Local 99.30 — CASH', 'purity' => '99.30%', 'buy' => 0, 'sell' => 0],
  ], 'updatedAt' => now_iso()];
}
function bullion_rows(array &$db): array {
  if (!isset($db['bullion']['cash'])) $db['bullion'] = bullion_defaults();
  foreach (bullion_defaults()['cash'] as $k => $v) if (!isset($db['bullion']['cash'][$k])) $db['bullion']['cash'][$k] = $v;
  $db['bullion']['prev'] = $db['bullion']['prev'] ?? [];
  $r = $db['rates']['last'];
  $gp = (int)($db['settings']['bullionGoldPremium'] ?? 10);
  $sp = (int)($db['settings']['bullionSilverPremium'] ?? 2);
  $fine = (float)$r['gold24']; $sil = (float)$r['silver'];
  $rows = [
    ['key' => 'tdsGold995', 'label' => 'TDS GOLD', 'purity' => '995 (99.50%)', 'mode' => 'RTGS', 'buy' => (int)round($fine * 0.995 + $gp - 2), 'sell' => (int)round($fine * 0.995 + $gp + 2)],
    ['key' => 'silverChorsa', 'label' => 'SILVER CHORSA', 'purity' => '98.00%', 'mode' => 'RTGS', 'buy' => (int)round($sil * 0.98 + 1 - 1), 'sell' => (int)round($sil * 0.98 + 1 + 1)],
    ['key' => 'silverPeti', 'label' => 'SILVER BANK PETI', 'purity' => '999 fine (99.9%)', 'mode' => 'RTGS', 'buy' => (int)round($sil * 0.999 + $sp - 1), 'sell' => (int)round($sil * 0.999 + $sp + 1)],
    ['key' => 'silverPetiBulk', 'label' => 'SILVER PETI — BULK', 'purity' => '999 fine (99.9%)', 'mode' => 'RTGS', 'buy' => (int)round($sil * 0.999 + $sp * 0.6 - 1), 'sell' => (int)round($sil * 0.999 + $sp * 0.6 + 1)],
  ];
  $cashDefs = ['goldImport995' => $fine * 0.995, 'goldIndian' => $fine * 0.995 + 15, 'goldRef9930' => $fine * 0.993];
  foreach ($db['bullion']['cash'] as $k => $c) {
    $buy = $c['buy'] ?: (int)round($cashDefs[$k] ?? 0);
    $sell = $c['sell'] ?: (int)round(($cashDefs[$k] ?? 0) + 40);
    $prev = $db['bullion']['prev'][$k]['buy'] ?? $buy;
    $rows[] = ['key' => $k, 'label' => $c['label'], 'purity' => $c['purity'], 'mode' => 'CASH', 'buy' => $buy, 'sell' => $sell, 'change' => $buy - $prev, 'editable' => true];
  }
  $h = $db['rates']['history'] ?? [];
  if (count($h) > 1) {
    $y = $h[count($h) - 2];
    $chg = ['tdsGold995' => (int)round(($r['gold24'] - $y['gold24']) * 0.995), 'silverChorsa' => (int)round(($r['silver'] - $y['silver']) * 0.98), 'silverPeti' => (int)round(($r['silver'] - $y['silver']) * 0.999), 'silverPetiBulk' => (int)round(($r['silver'] - $y['silver']) * 0.999)];
    foreach ($rows as &$row) if (isset($chg[$row['key']])) $row['change'] = $chg[$row['key']];
  }
  foreach ($rows as &$row) $row['change'] = $row['change'] ?? 0;
  return ['rows' => $rows, 'updatedAt' => $db['bullion']['updatedAt'], 'date' => date('d M Y')];
}
/* ═════════ router ═════════ */
$route = $_GET['__route'] ?? '';
$route = trim((string)$route, '/');
$method = $_SERVER['REQUEST_METHOD'];
hallmark_public_route($route, $method);
// Feature 2: current allowlisted settings only, before any legacy schema/rate
// defaults are added. This route is read-only and never queries a registry.
if ($route === 'trust') {
  if ($method !== 'GET') {
    header('Allow: GET');
    jout(405, ['error' => 'Business details are read-only.']);
  }
  jout(200, trust_profile(db_load($DB_FILE)));
}
$db = db_load($DB_FILE);
/* auto-heal schema (old databases) so nothing ever fatals */
$db['otps'] = $db['otps'] ?? [];
foreach (['products','users','orders','partners','coupons','catalogs','reviews','settlements','serviceRequests','newsletter','contactMsgs','rateAlerts','pages','tokens','loginfails','bullionOrders','metalOrders','customOrders'] as $__k) $db[$__k] = $db[$__k] ?? [];
if (!is_array($db['bullion'] ?? null) || !isset($db['bullion']['cash'])) {
  $db['bullion'] = ['cash' => [
    'goldImport995' => ['label' => 'Imported Gold 995 — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldIndian' => ['label' => 'Indian Gold (IND) — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldRef9930' => ['label' => 'Ref. Gold Local 99.30 — CASH', 'purity' => '99.30%', 'buy' => 0, 'sell' => 0],
  ], 'updatedAt' => now_iso()];
}
if (!isset($db['rates']['last'])) { $db['rates']['last'] = ['t' => now_iso(), 'gold24' => 11800, 'gold22' => 10800, 'gold18' => 8850, 'silver' => 95, 'source' => 'bootstrap']; $db['rates']['history'] = $db['rates']['history'] ?? []; }
foreach (['freeShipAbove' => 50000, 'shippingFee' => 250, 'jaipurPremium' => 55, 'jaipurSilverPremium' => 3, 'whatsapp' => '918905005921', 'metalFactor' => 0.92, 'finePurity' => '99.50%'] as $__k => $__v) if (!isset($db['settings'][$__k])) $db['settings'][$__k] = $__v;
$changed = false;

try {
  /* ── rates ── */
  if ($route === 'rates' && $method === 'GET') {
    if (rates_stale($db)) { rates_refresh($db); $changed = true; }
    $last = $db['rates']['last'];
    $base = $last;
    if (!empty($db['rates']['override'])) { $base = array_merge($base, $db['rates']['override'], ['source' => 'override (admin)', 't' => now_iso()]); }
    jout(200, array_merge($base, [
      'spot' => ['gold24' => $last['gold24'], 'gold22' => $last['gold22'], 'gold18' => $last['gold18'], 'silver' => $last['silver']],
      'jaipur' => current_rates($db),
      'premium' => ['gold' => (int)($db['settings']['jaipurPremium'] ?? 55), 'silver' => (double)($db['settings']['jaipurSilverPremium'] ?? 3)],
      'override' => $db['rates']['override'] ?? null,
      'history' => array_slice($db['rates']['history'] ?? [], -120),
      'nextUpdateIn' => 60,
    ]));
  }
  if ($route === 'rates/refresh' && $method === 'POST') {
    need_admin($db);
    rates_refresh($db);
    $db['rates']['last']['source'] .= ' (manual)';
    $changed = true; db_save($DB_FILE, $db);
    jout(200, $db['rates']['last']);
  }
  if ($route === 'rates/override' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    if (!empty($b['clear'])) $db['rates']['override'] = null;
    else {
      $g24 = (float)$b['gold24'];
      $db['rates']['override'] = ['gold24' => (int)round($g24), 'gold22' => (int)round($g24 * PURITY_22),
                                  'gold18' => (int)round($g24 * PURITY_18), 'silver' => (float)$b['silver']];
    }
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'override' => $db['rates']['override']]);
  }
  if ($route === 'rates/alert' && $method === 'POST') {
    throttle_hit($db, 'rate-alert', 6, 600);
    $b = body_json();
    $email = strtolower(tcap($b['email'] ?? '', 120));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jout(400, ['error' => 'A valid email address is required']);
    $metal = in_array(($b['metal'] ?? ''), ['gold24', 'gold22', 'gold18', 'silver'], true) ? $b['metal'] : 'gold22';
    $target = (float)($b['target'] ?? 0);
    if ($target < 1 || $target > 500000) jout(400, ['error' => 'Target rate is out of range']);
    foreach ($db['rateAlerts'] as $a) {
      if (($a['email'] ?? '') === $email && ($a['metal'] ?? '') === $metal && abs((float)($a['target'] ?? 0) - $target) < 1) {
        jout(200, ['ok' => true, 'duplicate' => true, 'note' => 'You already have this alert saved — we will not add a duplicate.']);
      }
    }
    $db['rateAlerts'][] = ['id' => uid('ra'), 'email' => $email, 'metal' => $metal, 'target' => $target, 'createdAt' => now_iso()];
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'note' => 'Saved — the desk emails you from Support@shivaa.in when rates cross your target.']);
  }
  if ($route === 'rates/alerts' && $method === 'GET') {   // v42 — admin view of alert subscriptions
    need_admin($db);
    jout(200, ['alerts' => array_reverse($db['rateAlerts'])]);
  }

  /* ── Feature 1: staff-entered piece HUIDs (never BIS verification) ── */
  if (preg_match('#^admin/products/([\w-]+)/hallmark$#', $route, $hm)) {
    need_admin($db);
    try {
      if ($method === 'GET') {
        foreach ($db['products'] as $p) if ($p['id'] === $hm[1]) {
          jout(200, ['productId' => $p['id'], 'name' => $p['name'], 'hallmark' => hallmark_staff_record($p)]);
        }
        jout(404, ['error' => 'Product not found.']);
      }
      if ($method === 'PUT') {
        $p = hallmark_save($DB_FILE, $hm[1], hallmark_request_body(100000));
        jout(200, ['hallmark' => hallmark_staff_record($p), 'product' => hallmark_product($p)]);
      }
      header('Allow: GET, PUT');
      jout(405, ['error' => 'Method not allowed.']);
    } catch (HallmarkProblem $e) { jout($e->httpStatus, ['error' => $e->getMessage()]); }
    catch (Throwable $e) { jout(500, ['error' => 'HUID records could not be saved. Reopen the editor and check before retrying.']); }
  }

  /* ── products ── */
  if ($route === 'products' && $method === 'GET') {
    $list = array_values(array_filter($db['products'], fn($x) => !empty($x['active'])));
    if (!empty($_GET['category'])) $list = array_values(array_filter($list, fn($x) => $x['category'] === $_GET['category']));
    if (!empty($_GET['q'])) { $s = strtolower($_GET['q']); $list = array_values(array_filter($list, fn($x) => str_contains(strtolower($x['name'] . ' ' . $x['category'] . ' ' . ($x['desc'] ?? '') . ' ' . implode(' ', $x['tags'] ?? [])), $s))); }
    if (!empty($_GET['metal'])) $list = array_values(array_filter($list, fn($x) => $x['metal'] === $_GET['metal']));
    if (!empty($_GET['tag'])) $list = array_values(array_filter($list, fn($x) => in_array($_GET['tag'], $x['tags'] ?? [])));
    $R = current_rates($db);
    $out = [];
    foreach ($list as $x) { $y = hallmark_product($x); $y['lessWeightG'] = $y['lessWeightG'] ?? 0; $y['wastagePct'] = $y['wastagePct'] ?? 8; $y['price'] = compute_price($x, $R); $out[] = $y; }
    jout(200, ['products' => $out, 'rates' => current_rates($db)]);
  }
  if (preg_match('#^products/([\w-]+)$#', $route, $m)) {
    $idx = null; foreach ($db['products'] as $i => $x) if ($x['id'] === $m[1]) $idx = $i;
    if ($method === 'GET') {
      if ($idx === null) jout(404, ['error' => 'Not found']);
      $R = current_rates($db);
      $similar = [];
      foreach ($db['products'] as $x) if ($x['category'] === $db['products'][$idx]['category'] && $x['id'] !== $m[1] && !empty($x['active'])) { $y = hallmark_product($x); $y['price'] = compute_price($x, $R); $similar[] = $y; if (count($similar) >= 4) break; }
      $reviews = array_values(array_filter($db['reviews'] ?? [], fn($r) => ($r['productId'] ?? '') === $m[1]));
      $p = hallmark_product($db['products'][$idx]); $p['price'] = compute_price($p, $R);
      jout(200, ['product' => $p, 'rates' => current_rates($db), 'similar' => $similar, 'reviews' => $reviews]);
    }
    if ($method === 'PUT') {
      need_admin($db);
      if ($idx === null) jout(404, ['error' => 'Not found']);
      $b = body_json();
      try { hallmark_guard_product_write($b); }
      catch (HallmarkProblem $e) { jout($e->httpStatus, ['error' => $e->getMessage()]); }
      foreach ($b as $k => $v) $db['products'][$idx][$k] = $v;
      db_save($DB_FILE, $db); jout(200, hallmark_product($db['products'][$idx]));
    }
    if ($method === 'DELETE') {
      need_admin($db);
      $db['products'] = array_values(array_filter($db['products'], fn($x) => $x['id'] !== $m[1]));
      db_save($DB_FILE, $db); jout(200, ['ok' => true]);
    }
  }
  if ($route === 'products' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    try { hallmark_guard_product_write($b); }
    catch (HallmarkProblem $e) { jout($e->httpStatus, ['error' => $e->getMessage()]); }
    $prod = array_merge(['createdAt' => now_iso(), 'active' => true, 'rating' => 4.6, 'reviews' => 0, 'stock' => 10, 'sizes' => [], 'tags' => [], 'images' => [], 'stoneValue' => 0], $b);
    $prod['id'] = uid('p');
    $db['products'][] = $prod; db_save($DB_FILE, $db); jout(200, hallmark_product($prod));
  }

  /* ── media upload (v36 — AI photoshoot shots + product videos) ── */
  if ($route === 'media' && $method === 'POST') {
    need_admin($db);
    if (empty($_FILES['file'])) jout(400, ['error' => 'No file field named "file"']);
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) jout(400, ['error' => 'Upload failed (code ' . $f['error'] . ')']);
    if (($f['size'] ?? 0) > 26214400) jout(400, ['error' => 'File too large (max 25 MB)']);
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    $isImg = in_array($ext, ['jpg', 'jpeg', 'png', 'webp']);
    $isVid = in_array($ext, ['mp4', 'webm', 'mov']);
    if (!$isImg && !$isVid) jout(400, ['error' => 'Only jpg/png/webp images or mp4/webm videos']);
    $head = (string)@file_get_contents($f['tmp_name'], false, null, 0, 12);
    $headOk = $isImg ? (substr($head, 0, 3) === "\xFF\xD8\xFF" || substr($head, 0, 8) === "\x89PNG\r\n\x1a\n" || substr($head, 0, 4) === 'RIFF')
                     : (substr($head, 4, 4) === 'ftyp');
    if (!$headOk) jout(400, ['error' => 'File content does not match its extension']);
    $cat = preg_replace('/[^a-z0-9_-]/', '', strtolower((string)($_POST['category'] ?? 'general'))) ?: 'general';
    $sub = $isVid ? 'videos' : 'designs';
    $dir = __DIR__ . '/uploads/' . $sub . '/' . $cat;
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $name = $cat . '_' . bin2hex(random_bytes(5)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) jout(500, ['error' => 'Could not save — check uploads/ permissions (755)']);
    jout(200, ['url' => '/uploads/' . $sub . '/' . $cat . '/' . $name, 'size' => (int)$f['size'], 'ext' => $ext]);
  }

  /* ── making charges ── */
  if ($route === 'making-charges' && $method === 'GET') jout(200, ['table' => $db['makingCharges'], 'gst' => 3]);
  if ($route === 'making-charges' && $method === 'PUT') {
    need_admin($db);
    $db['makingCharges'] = body_json()['table'] ?? [];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ── auth (with OTP) ── */
  function shivaa_sms_log(array &$db, array $r): void {   // v33 — gateway health trail for the admin panel
    $s = $db['sms'] ?? ['sent' => 0, 'ok' => 0, 'lastErr' => null, 'lastAt' => null];
    $s['sent']++;
    if (!empty($r['ok'])) $s['ok']++;
    else { $s['lastErr'] = cut500((string)($r['error'] ?? 'unknown')); $s['lastResp'] = cut500((string)($r['response'] ?? '')); }
    $s['lastAt'] = now_iso(); $s['provider'] = $r['provider'] ?? null; $s['mode'] = $r['mode'] ?? null;
    $db['sms'] = $s;
  }
  if ($route === 'auth/send-otp' && $method === 'POST') {
    throttle_hit($db, 'send-otp', 12, 600);   // v42 — anti SMS-bombing per real IP
    $phone = substr(preg_replace('/\D/', '', (string)(body_json()['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Enter a valid 10-digit Indian mobile']);
    foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === $phone && time() - $o['at'] < 30) jout(429, ['error' => 'Wait 30 seconds between OTP requests']);
    $code = (string)random_int(100000, 999999);
    $db['otps'] = array_values(array_filter($db['otps'] ?? [], fn($o) => $o['exp'] > time() - 3600));
    $db['otps'][] = ['phone' => $phone, 'hash' => hash('sha256', 'shv' . $phone . $code), 'exp' => time() + 300, 'tries' => 0, 'at' => time(), 'verified' => false];
    $sms = shivaa_sms_send($phone, $code);                // v33 — real SMS when data/sms-config.json exists
    shivaa_sms_log($db, $sms);
    db_save($DB_FILE, $db);
    if ($sms['mode'] === 'demo') jout(200, ['ok' => true, 'demoMode' => true, 'devCode' => $code]);
    if (!$sms['ok']) jout(502, ['error' => 'Could not send the SMS just now — please try again in a minute']);
    jout(200, ['ok' => true, 'sent' => true]);
  }
  if ($route === 'auth/otp-login' && $method === 'POST') {
    $b = body_json();
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    $found = null;
    for ($i = count($db['otps'] ?? []) - 1; $i >= 0; $i--) if ($db['otps'][$i]['phone'] === $phone) { $found = $i; break; }
    if ($found === null) jout(400, ['error' => 'Request an OTP first']);
    $o = &$db['otps'][$found];
    if ($o['exp'] < time()) jout(400, ['error' => 'OTP expired — request a new one']);
    if ($o['tries'] >= 5) jout(429, ['error' => 'Too many attempts — request a new OTP']);
    $o['tries']++;
    if ($o['hash'] !== hash('sha256', 'shv' . $phone . (string)($b['code'] ?? ''))) { db_save($DB_FILE, $db); jout(400, ['error' => 'Incorrect OTP']); }
    $o['verified'] = true; db_save($DB_FILE, $db);
    foreach ($db['users'] as $u) if (substr(preg_replace('/\D/', '', (string)($u['phone'] ?? '')), -10) === $phone) {
      $tk = issue_token($db, $u); db_save($DB_FILE, $db);
      jout(200, ['token' => $tk, 'user' => pub_user($u)]);
    }
    jout(404, ['error' => 'No account with this number — please register first']);
  }
  if ($route === 'auth/register' && $method === 'POST') {
    throttle_hit($db, 'auth-register', 8, 3600);
    $b = body_json();
    $name = tcap($b['name'] ?? '', 80);
    $email = strtolower(tcap($b['email'] ?? '', 120));
    $plain = (string)($b['password'] ?? '');
    if ($name === '' || $email === '' || $plain === '') jout(400, ['error' => 'Name, email & password required']);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jout(400, ['error' => 'Enter a valid email address']);
    if (strlen($plain) < 8) jout(400, ['error' => 'Password must be at least 8 characters']);
    if (strlen($plain) > 128) jout(400, ['error' => 'Password must be at most 128 characters']);
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Valid 10-digit phone required']);
    $otpOk = false;
    foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === $phone && !empty($o['verified']) && $o['exp'] > time() - 3600) $otpOk = true;
    if (!$otpOk) jout(400, ['error' => 'Verify your phone with OTP first']);
    foreach ($db['users'] as $u) {
      if (strtolower($u['email'] ?? '') === $email) jout(409, ['error' => 'Email already registered']);
      if (substr(preg_replace('/\D/', '', (string)($u['phone'] ?? '')), -10) === $phone && $phone !== '') jout(409, ['error' => 'This mobile number is already registered — log in instead']);
    }
    $u = ['id' => uid('u'), 'name' => $name, 'email' => $email, 'phone' => $phone,
          'passHash' => pw_hash($plain), 'role' => 'customer',
          'loyaltyPoints' => 120, 'wishlist' => [], 'createdAt' => now_iso()];
    $db['users'][] = $u; $tk = issue_token($db, $u);
    db_save($DB_FILE, $db); jout(200, ['token' => $tk, 'user' => pub_user($u)]);
  }
  if ($route === 'auth/login' && $method === 'POST') {
    $b = body_json();
    throttle_hit($db, 'auth-login', 40, 900);                       // v42 — coarse per-IP cap
    $email = strtolower(tcap($b['email'] ?? '', 120));
    $plain = (string)($b['password'] ?? '');
    if (strlen($plain) > 128) jout(401, ['error' => 'Invalid email or password']);   // stop bcrypt CPU abuse
    $key = client_ip() . '|' . $email;                              // v42 — real peer IP only (no spoofable XFF)
    $db['loginfails'] = $db['loginfails'] ?? [];
    $rec = $db['loginfails'][$key] ?? ['n' => 0, 'until' => 0, 'at' => time()];
    if (($rec['until'] ?? 0) > time()) jout(429, ['error' => 'Too many attempts — try again in 15 minutes']);
    foreach ($db['users'] as $u) if (strtolower($u['email']) === $email) {
      $__rehash = false;
      if (pw_verify($u, $plain, $__rehash)) {
        if ($__rehash) {
          foreach ($db['users'] as $__i => $__uu) if ($__uu['id'] === $u['id']) {
            $db['users'][$__i]['passHash'] = pw_hash((string)($b['password'] ?? ''));
            unset($db['users'][$__i]['salt']);
          }
        }
        unset($db['loginfails'][$key]);
        $tk = issue_token($db, $u); db_save($DB_FILE, $db);
        jout(200, ['token' => $tk, 'user' => pub_user($u)]);
      }
      $rec['n'] = ($rec['n'] ?? 0) + 1;
      $rec['at'] = time();
      if ($rec['n'] >= 5) { $rec['until'] = time() + 900; $rec['n'] = 0; }
      $db['loginfails'][$key] = $rec;
      db_save($DB_FILE, $db);
      jout(401, ['error' => 'Invalid email or password']);
    }
    jout(401, ['error' => 'Invalid email or password']);
  }
  if ($route === 'auth/me' && $method === 'GET') {
    $u = req_user($db);
    jout(200, ['user' => $u ? pub_user($u) : null]);
  }
  if ($route === 'auth/profile' && $method === 'PUT') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['profile'] = $uu['profile'] ?? [];
      foreach (['dob', 'anniversary', 'gender'] as $k) if (isset($b[$k])) $uu['profile'][$k] = tcap($b[$k], 20);
      if (!empty($b['name'])) $uu['name'] = tcap($b['name'], 80);
      $u = $uu;
    }
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'user' => pub_user($u)]);
  }
  if ($route === 'addresses' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    jout(200, ['addresses' => $u['addresses'] ?? []]);
  }
  if ($route === 'addresses' && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    if (empty($b['name']) || empty($b['phone']) || empty($b['line']) || empty($b['city']) || empty($b['pincode'])) jout(400, ['error' => 'Name, phone, address, city & pincode required']);
    if (!preg_match('#^\d{6}$#', (string)$b['pincode'])) jout(400, ['error' => 'Pincode must be 6 digits']);
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['addresses'] = $uu['addresses'] ?? [];
      if (count($uu['addresses']) >= 20) jout(400, ['error' => 'You can save up to 20 addresses — remove one first']);
      $addr = ['id' => uid('ad'), 'label' => tcap($b['label'] ?? 'Home', 30), 'name' => tcap($b['name'], 80), 'phone' => substr(preg_replace('/\D/', '', (string)$b['phone']), -10),
               'line' => tcap($b['line'], 220), 'city' => tcap($b['city'], 60), 'state' => tcap($b['state'] ?? 'Rajasthan', 60), 'pincode' => (string)$b['pincode']];
      if (!empty($b['isDefault']) || !count($uu['addresses'])) { foreach ($uu['addresses'] as &$a) $a['isDefault'] = false; $addr['isDefault'] = true; }
      $uu['addresses'][] = $addr;
      $out = $uu;
    }
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'addresses' => $out['addresses']]);
  }
  if (preg_match('#^addresses/([\w-]+)$#', $route, $mAD)) {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $found = false;
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['addresses'] = $uu['addresses'] ?? [];
      foreach ($uu['addresses'] as $i => $a) if ($a['id'] === $mAD[1]) {
        $found = true;
        if ($method === 'PUT') {
          $b = body_json();
          if (!empty($b['setDefault'])) { foreach ($uu['addresses'] as &$a2) $a2['isDefault'] = false; $uu['addresses'][$i]['isDefault'] = true; }
          else {
            $caps = ['label' => 30, 'name' => 80, 'phone' => 10, 'line' => 220, 'city' => 60, 'state' => 60, 'pincode' => 6];
            foreach ($caps as $k => $mx) if (isset($b[$k])) $uu['addresses'][$i][$k] = tcap($b[$k], $mx);
            if (!empty($b['isDefault'])) { foreach ($uu['addresses'] as &$a2) $a2['isDefault'] = false; $uu['addresses'][$i]['isDefault'] = true; }
          }
        } elseif ($method === 'DELETE') { array_splice($uu['addresses'], $i, 1); }
      }
      $out = $uu;
    }
    if (!$found) jout(404, ['error' => 'Address not found']);
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'addresses' => $out['addresses'] ?? []]);
  }

  /* ── wishlist ── */
  if ($route === 'wishlist' && $method === 'GET') {
    $u = req_user($db);
    $w = $u ? ($u['wishlist'] ?? []) : [];
    $R = current_rates($db); $items = [];
    foreach ($db['products'] as $x) if (in_array($x['id'], $w)) { $y = hallmark_product($x); $y['price'] = compute_price($x, $R); $items[] = $y; }
    jout(200, ['wishlist' => $w, 'items' => $items]);
  }
  if ($route === 'wishlist' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['wishlist'] = $uu['wishlist'] ?? [];
      if (!empty($b['add']) && !in_array($b['id'], $uu['wishlist'])) $uu['wishlist'][] = $b['id'];
      if (empty($b['add'])) $uu['wishlist'] = array_values(array_filter($uu['wishlist'], fn($x) => $x !== $b['id']));
      $w = $uu['wishlist'];
    }
    db_save($DB_FILE, $db); jout(200, ['wishlist' => $w ?? []]);
  }

  /* ── coupons ── */
  if ($route === 'coupons/validate' && $method === 'POST') {
    $b = body_json();
    foreach ($db['coupons'] as $c) if (strtoupper($c['code']) === strtoupper((string)($b['code'] ?? '')) && $c['active']) {
      if ((float)($b['amount'] ?? 0) < (float)($c['minOrder'] ?? 0)) jout(400, ['error' => 'Minimum order ₹' . number_format((float)$c['minOrder']) . ' for ' . $c['code']]);
      jout(200, $c);
    }
    jout(404, ['error' => 'Invalid coupon code']);
  }
  if ($route === 'coupons' && $method === 'GET') {
    $u = req_user($db);
    $list = ($u && $u['role'] === 'admin') ? $db['coupons'] : array_values(array_filter($db['coupons'], fn($c) => $c['active']));
    jout(200, ['coupons' => $list]);
  }
  if ($route === 'coupons' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    $db['coupons'][] = array_merge(['id' => uid('c'), 'active' => true], $b);
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ── orders ── */
  if ($route === 'orders' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required to place order']);
    $b = body_json();
    $R = current_rates($db);
    $subtotal = 0; $items = [];
    foreach (($b['items'] ?? []) as $it) {
      foreach ($db['products'] as $prod) if ($prod['id'] === $it['id']) {
        $pr = compute_price($prod, $R);
        $line = ['productId' => $prod['id'], 'name' => $prod['name'], 'img' => $prod['images'][0] ?? null,
                 'qty' => min(99, max(1, (int)($it['qty'] ?? 1))), 'weightG' => $prod['weightG'], 'purity' => $prod['purity'], 'metal' => $prod['metal'],
                 'unitPrice' => $pr['total'], 'ratePerGram' => $pr['ratePerGram'], 'makingCharge' => $pr['makingCharge'], 'gst' => $pr['gst'],
                 'size' => tcap($it['size'] ?? '', 20) ?: null, 'engraving' => tcap($it['engraving'] ?? '', 60) ?: null];
        $subtotal += $line['unitPrice'] * $line['qty'];
        $items[] = $line; break;
      }
    }
    if (!$items) jout(400, ['error' => 'Cart is empty']);
    $coupon = null;
    if (!empty($b['coupon'])) foreach ($db['coupons'] as $c) if (strtoupper($c['code']) === strtoupper($b['coupon']) && $c['active']) $coupon = $c;
    $discount = 0;
    if ($coupon && $subtotal >= (float)($coupon['minOrder'] ?? 0)) $discount = $coupon['type'] === 'percent' ? (int)round($subtotal * $coupon['value'] / 100) : (int)$coupon['value'];
    $pointsUsed = 0;
    if (!empty($b['usePoints'])) {
      $maxPts = (int)min((float)($u['loyaltyPoints'] ?? 0), floor($subtotal * 0.1));
      $pointsUsed = max(0, (int)min($maxPts, (int)floor($subtotal - $discount)));
      $discount += $pointsUsed;
    }
    $freeShip = (float)($db['settings']['freeShipAbove'] ?? 50000);
    $shipping = $subtotal >= $freeShip ? 0 : (int)($db['settings']['shippingFee'] ?? 250);
    $total = max(0, $subtotal - $discount + $shipping);
    $earned = (int)floor($total / 100);
    $pm = in_array(($b['paymentMethod'] ?? ''), ['Online', 'COD', 'WhatsApp', 'UPI', 'Bank'], true) ? $b['paymentMethod'] : 'Online';
    $ad = is_array($b['address'] ?? null) ? $b['address'] : [];
    $addrStore = ['name' => tcap($ad['name'] ?? $u['name'], 80), 'phone' => substr(preg_replace('/\D/', '', (string)($ad['phone'] ?? $u['phone'] ?? '')), -10),
                  'line' => tcap($ad['line'] ?? '', 220), 'city' => tcap($ad['city'] ?? '', 60), 'state' => tcap($ad['state'] ?? '', 60),
                  'pincode' => tcap($ad['pincode'] ?? '', 6), 'label' => tcap($ad['label'] ?? 'Home', 30)];
    $order = [
      'id' => ref_id('SHV'), 'userId' => $u['id'], 'userName' => $u['name'], 'items' => $items,
      'address' => $addrStore, 'paymentMethod' => $pm,
      'paymentStatus' => $pm === 'COD' ? 'Pending (COD)' : ($pm === 'WhatsApp' ? 'Confirm on WhatsApp' : 'Paid'),
      'subtotal' => $subtotal, 'discount' => $discount, 'pointsUsed' => $pointsUsed, 'coupon' => $coupon['code'] ?? null,
      'shipping' => $shipping, 'total' => $total, 'earnedPoints' => $earned,
      'rateSnapshot' => array_merge($R, ['stampedAt' => now_iso()]),
      'status' => 'Placed', 'createdAt' => now_iso(), 'timeline' => [['s' => 'Placed', 't' => now_iso()]],
    ];
    $db['orders'][] = $order;
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['loyaltyPoints'] = max(0, (int)($uu['loyaltyPoints'] ?? 0) - $pointsUsed) + $earned;
    }
    foreach ($items as $it) foreach ($db['products'] as &$pr2) if ($pr2['id'] === $it['productId']) $pr2['stock'] = max(0, (int)($pr2['stock'] ?? 0) - $it['qty']);
    db_save($DB_FILE, $db);
    jout(200, $order);
  }
  if ($route === 'orders' && $method === 'GET') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $list = $u['role'] === 'admin' ? $db['orders'] : array_values(array_filter($db['orders'], fn($o) => $o['userId'] === $u['id']));
    jout(200, ['orders' => array_reverse(array_values($list))]);
  }
  if (preg_match('#^orders/([\w-]+)$#', $route, $m)) {
    $o = null; foreach ($db['orders'] as $x) if ($x['id'] === $m[1]) $o = $x;
    if ($method === 'GET') {
      $u = req_user($db);
      if (!$o) jout(404, ['error' => 'Not found']);
      if ($o['userId'] !== ($u['id'] ?? '') && ($u['role'] ?? '') !== 'admin') jout(403, ['error' => 'Not yours']);
      jout(200, ['order' => $o]);
    }
    if ($method === 'PUT') {
      need_admin($db);
      $st = body_json()['status'] ?? null;
      foreach ($db['orders'] as &$x) if ($x['id'] === $m[1]) {
        if ($st && $st !== $x['status']) { $x['status'] = $st; $x['timeline'][] = ['s' => $st, 't' => now_iso()]; }
        $o = $x;
      }
      db_save($DB_FILE, $db); jout(200, $o);
    }
  }

  /* ── catalogs (uploads) ── */
  if ($route === 'catalogs' && $method === 'GET') {
    $u0 = req_user($db);
    if (!$u0 || ($u0['role'] !== 'partner' && $u0['role'] !== 'admin')) jout(200, ['catalogs' => [], 'gated' => true]);
    $list = $db['catalogs'];
    usort($list, fn($a, $b) => ($b['featured'] ? 1 : 0) - ($a['featured'] ? 1 : 0) ?: strcmp($b['addedAt'], $a['addedAt']));
    jout(200, ['catalogs' => $list]);
  }
  if ($route === 'catalogs' && $method === 'POST') {
    need_admin($db);
    if (empty($_FILES['file'])) jout(400, ['error' => 'No file']);
    if (substr((string)@file_get_contents($_FILES['file']['tmp_name'], false, null, 0, 5), 0, 4) !== '%PDF') jout(400, ['error' => 'Catalogue must be a real PDF file']);
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) jout(400, ['error' => 'Upload failed (code ' . $f['error'] . ')']);
    if (($f['size'] ?? 0) > 26214400) jout(400, ['error' => 'File too large (max 25 MB)']);
    $safe = substr(preg_replace('/[^\w.\-]+/', '_', (string)($f['name'] ?? 'catalog.pdf')), -80) ?: 'catalog.pdf';
    if (strtolower(pathinfo($safe, PATHINFO_EXTENSION)) !== 'pdf') $safe .= '.pdf';
    $name = 'cat_' . bin2hex(random_bytes(4)) . '_' . $safe;
    if (!is_dir($CAT_DIR)) mkdir($CAT_DIR, 0755, true);
    if (!move_uploaded_file($f['tmp_name'], $CAT_DIR . '/' . $name)) jout(500, ['error' => 'Could not save file — check uploads/catalogs permissions (755)']);
    $cat = ['id' => uid('cat'), 'title' => $_POST['title'] ?? $safe, 'desc' => $_POST['desc'] ?? '',
            'category' => $_POST['category'] ?? 'General', 'featured' => in_array(($_POST['featured'] ?? ''), ['true', 'on', '1']),
            'file' => '/uploads/catalogs/' . $name, 'size' => (int)$f['size'], 'addedAt' => now_iso(), 'downloads' => 0];
    $db['catalogs'][] = $cat; db_save($DB_FILE, $db);
    jout(200, $cat);
  }
  if (preg_match('#^catalogs/([\w-]+)$#', $route, $m)) {
    if ($method === 'PUT') {
      need_admin($db);
      $b = body_json();
      foreach ($db['catalogs'] as &$c) if ($c['id'] === $m[1]) {
        foreach (['title', 'desc', 'category', 'featured'] as $k) if (array_key_exists($k, $b)) $c[$k] = $b[$k];
        $cat = $c;
      }
      db_save($DB_FILE, $db); jout(200, $cat ?? ['error' => 'Not found']);
    }
    if ($method === 'DELETE') {
      need_admin($db);
      foreach ($db['catalogs'] as $i => $c) if ($c['id'] === $m[1]) {
        @unlink($ROOT . $c['file']);
        array_splice($db['catalogs'], $i, 1);
      }
      db_save($DB_FILE, $db); jout(200, ['ok' => true]);
    }
  }

  /* ── KYC ── */
  if ($route === 'kyc/check-gstin' && $method === 'POST') jout(200, gstin_check((string)(body_json()['gstin'] ?? '')));
  if ($route === 'kyc/gst-lookup' && $method === 'POST') {
    $g = strtoupper(trim((string)(body_json()['gstin'] ?? '')));
    $chk = gstin_check($g);
    if (!$chk['valid']) jout(400, ['error' => $chk['reason']]);
    $cfg = $db['settings']['gstApi'] ?? [];
    if (empty($cfg['key'])) jout(200, ['configured' => false, 'note' => 'Add a GST API key in Admin → Settings to auto-verify legal names online']);
    $url = ($cfg['url'] ?? 'https://api.mastersindia.co/v2/gstin/') . '?gstin=' . urlencode($g);
    if (stripos($url, 'https://') !== 0) jout(400, ['error' => 'GST provider URL must start with https://']);   // v42 — SSRF guard
    $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => 'Authorization: Bearer ' . $cfg['key'] . "\r\n"]]);
    $raw = @file_get_contents($url, false, $ctx);
    $j = $raw ? json_decode($raw, true) : null;
    $name = $j['legalName'] ?? $j['taxpayerName'] ?? $j['tradeNam'] ?? ($j['data']['legalName'] ?? ($j['data']['tradeNam'] ?? null));
    if ($name) jout(200, ['configured' => true, 'verified' => true, 'legalName' => trim((string)$name), 'gstin' => $g]);
    jout(200, ['configured' => true, 'verified' => false, 'note' => 'GST service unreachable — admin will verify manually']);
  }
  if ($route === 'kyc/send-otp' && $method === 'POST') {
    throttle_hit($db, 'kyc-otp', 12, 600);    // v42 — anti SMS-bombing per real IP
    $phone = substr(preg_replace('/\D/', '', (string)(body_json()['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Enter a valid 10-digit Indian mobile']);
    foreach (($db['otps'] ?? []) as $o) if (($o['phone'] ?? '') === $phone && time() - $o['at'] < 30) jout(429, ['error' => 'Wait 30 seconds between OTP requests']);
    $code = (string)random_int(100000, 999999);
    $db['otps'] = array_values(array_filter($db['otps'] ?? [], fn($o) => $o['exp'] > time() - 3600));
    $db['otps'][] = ['phone' => $phone, 'hash' => hash('sha256', 'shv' . $phone . $code), 'exp' => time() + 300, 'tries' => 0, 'at' => time(), 'verified' => false];
    $sms = shivaa_sms_send($phone, $code);                // v33 — real SMS when data/sms-config.json exists
    shivaa_sms_log($db, $sms);
    db_save($DB_FILE, $db);
    if ($sms['mode'] === 'demo') jout(200, ['ok' => true, 'demoMode' => true, 'devCode' => $code]);
    if (!$sms['ok']) jout(502, ['error' => 'Could not send the SMS just now — please try again in a minute']);
    jout(200, ['ok' => true, 'sent' => true]);
  }
  if ($route === 'kyc/verify-otp' && $method === 'POST') {
    $b = body_json();
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    $found = null;
    for ($i = count($db['otps'] ?? []) - 1; $i >= 0; $i--) if ($db['otps'][$i]['phone'] === $phone) { $found = $i; break; }
    if ($found === null) jout(400, ['error' => 'Request an OTP first']);
    $o = &$db['otps'][$found];
    if ($o['exp'] < time()) jout(400, ['error' => 'OTP expired — request a new one']);
    if ($o['tries'] >= 5) jout(429, ['error' => 'Too many attempts — request a new OTP']);
    $o['tries']++;
    if ($o['hash'] !== hash('sha256', 'shv' . $phone . (string)($b['code'] ?? ''))) { db_save($DB_FILE, $db); jout(400, ['error' => 'Incorrect OTP']); }
    $o['verified'] = true; db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ── SMS gateway admin tools (v33) ── */
  if ($route === 'sms/status' && $method === 'GET') {
    need_admin($db);
    $c = shivaa_sms_config();
    jout(200, ['configured' => (bool)$c, 'provider' => $c['provider'] ?? null, 'autofill' => (bool)($c['autofill'] ?? true), 'stats' => $db['sms'] ?? null]);
  }
  if ($route === 'sms/test' && $method === 'POST') {
    need_admin($db);
    $phone = substr(preg_replace('/\D/', '', (string)(body_json()['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Enter a valid 10-digit Indian mobile']);
    $code = (string)random_int(100000, 999999);
    $r = shivaa_sms_send($phone, $code);
    shivaa_sms_log($db, $r); db_save($DB_FILE, $db);
    if ($r['mode'] === 'demo') jout(200, ['ok' => true, 'demoMode' => true, 'devCode' => $code, 'note' => 'No data/sms-config.json yet — gateway not configured, demo mode']);
    jout($r['ok'] ? 200 : 502, ['ok' => $r['ok'], 'provider' => $r['provider'], 'error' => $r['error'], 'response' => cut500((string)$r['response']), 'hint' => $r['ok'] ? 'Check the phone for the SMS — if it arrived, you are live.' : 'Fix the error, then test again. See OTP-SETUP-GUIDE.md.']);
  }

  /* ── design selection → metal exchange (zero MC) ── */
  if ($route === 'metalexchange/order' && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if ($u['role'] !== 'partner' && $u['role'] !== 'admin') jout(403, ['error' => 'Jeweller partners only — apply on the For Jewellers page']);
    $b = body_json();
    $factor = (float)($db['settings']['metalFactor'] ?? 0.92);
    $purity = $db['settings']['finePurity'] ?? '99.50%';
    $totalWeight = 0; $items = [];
    foreach (($b['items'] ?? []) as $it) {
      foreach ($db['products'] as $prod) if ($prod['id'] === $it['id'] && !empty($prod['active'])) {
        $qty = min(99, max(1, (int)($it['qty'] ?? 1)));
        $totalWeight += $prod['weightG'] * $qty;
        $items[] = ['productId' => $prod['id'], 'name' => $prod['name'], 'img' => $prod['images'][0] ?? null, 'qty' => $qty, 'weightG' => $prod['weightG'], 'lineWeight' => round($prod['weightG'] * $qty, 3)];
      }
    }
    if (!count($items)) jout(400, ['error' => 'No designs selected']);
    $ord = ['id' => ref_id('MX'), 'partnerId' => $u['partnerId'] ?? '', 'partnerName' => $u['name'],
            'items' => $items, 'totalWeightG' => round($totalWeight, 3), 'factor' => $factor,
            'fineGrams' => round($totalWeight * $factor, 2), 'purity' => $purity,
            'makingCharges' => 0, 'note' => tcap($b['note'] ?? '', 500), 'status' => 'New', 'createdAt' => now_iso()];
    $db['metalOrders'][] = $ord; db_save($DB_FILE, $db); jout(200, $ord);
  }
  if ($route === 'metalexchange/orders' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if ($u['role'] !== 'partner' && $u['role'] !== 'admin') jout(403, ['error' => 'Jeweller partners only — apply on the For Jewellers page']);
    $list = $db['metalOrders'] ?? [];
    if ($u['role'] !== 'admin') $list = array_values(array_filter($list, fn($o) => ($o['partnerId'] ?? '') === ($u['partnerId'] ?? '')));
    jout(200, ['orders' => array_reverse($list)]);
  }
  if (preg_match('#^metalexchange/orders/([\w-]+)$#', $route, $mMX) && $method === 'PUT') {
    $u = req_user($db); if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    foreach (($db['metalOrders'] ?? []) as &$o) if ($o['id'] === $mMX[1]) { $o['status'] = body_json()['status'] ?? $o['status']; $out = $o; }
    if (empty($out)) jout(404, ['error' => 'Order not found']);
    db_save($DB_FILE, $db); jout(200, $out);
  }
  /* ── custom design orders (image upload) ── */
  if ($route === 'customorder' && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $fields = $_POST; $file = null;
    if (!empty($_FILES['design']) && $_FILES['design']['error'] === UPLOAD_ERR_OK && $_FILES['design']['size'] < 8388608) {
      $ext = strtolower(pathinfo($_FILES['design']['name'], PATHINFO_EXTENSION));
      $magic = function(string $path): bool {
        $h = @fopen($path, 'rb'); if (!$h) return false;
        $head = fread($h, 12); fclose($h);
        $sigs = ["\xFF\xD8\xFF", "\x89PNG", "GIF8", "RIFF"];
        foreach ($sigs as $s) if (substr($head, 0, strlen($s)) === $s) return true;
        return false;
      };
      if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif']) && $magic($_FILES['design']['tmp_name'])) {
        if (!is_dir(__DIR__ . '/uploads/designs')) mkdir(__DIR__ . '/uploads/designs', 0755, true);
        $name = 'design_' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (move_uploaded_file($_FILES['design']['tmp_name'], __DIR__ . '/uploads/designs/' . $name)) $file = '/uploads/designs/' . $name;
      }
    }
    if (empty($fields['name']) || empty($fields['weight'])) jout(400, ['error' => 'Product name & weight required']);
    $cWeight = (float)$fields['weight'];
    if ($cWeight < 0.1 || $cWeight > 20000) jout(400, ['error' => 'Weight must be between 0.1 g and 20 kg']);
    $ord = ['id' => ref_id('CO'), 'partnerId' => $u['partnerId'] ?? '', 'partnerName' => $u['name'],
            'name' => tcap($fields['name'], 120), 'weightG' => $cWeight, 'melting' => max(0.0, min(100000.0, (float)($fields['melting'] ?? 0))),
            'advance' => max(0.0, min(5000000.0, (float)($fields['advance'] ?? 0))), 'size' => tcap($fields['size'] ?? '', 40), 'note' => tcap($fields['note'] ?? '', 1000),
            'designImg' => $file, 'status' => 'New', 'createdAt' => now_iso()];
    $db['customOrders'][] = $ord; db_save($DB_FILE, $db); jout(200, $ord);
  }
  if ($route === 'customorder' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $list = $db['customOrders'] ?? [];
    if ($u['role'] !== 'admin') $list = array_values(array_filter($list, fn($o) => ($o['partnerId'] ?? '') === ($u['partnerId'] ?? '')));
    jout(200, ['orders' => array_reverse($list)]);
  }

  /* ── bullion (jeweller-only) ── */
  if ($route === 'bullion' && $method === 'GET') {
    $u = req_user($db); if (!$u || ($u['role'] !== 'partner' && $u['role'] !== 'admin')) jout(403, ['error' => 'Jeweller access only']);
    jout(200, bullion_rows($db));
  }
  if ($route === 'bullion/cash' && $method === 'PUT') {
    $u = req_user($db); if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    $b = body_json();
    if (!isset($db['bullion']['cash'])) $db['bullion'] = bullion_defaults();
    foreach ($db['bullion']['cash'] as $k => $c) $db['bullion']['prev'][$k] = ['buy' => $c['buy'], 'sell' => $c['sell']];
    foreach (($b['cash'] ?? []) as $k => $v) if (isset($db['bullion']['cash'][$k])) { $db['bullion']['cash'][$k]['buy'] = (int)$v['buy']; $db['bullion']['cash'][$k]['sell'] = (int)$v['sell']; }
    $db['bullion']['updatedAt'] = now_iso(); $db['bullion']['updatedBy'] = $u['name'];
    db_save($DB_FILE, $db); jout(200, ['ok' => true] + bullion_rows($db));
  }
  if ($route === 'bullion/order' && $method === 'POST') {
    $u = req_user($db); if (!$u || ($u['role'] !== 'partner' && $u['role'] !== 'admin')) jout(403, ['error' => 'Jeweller access only']);
    $b = body_json();
    if (empty($b['side']) || empty($b['metal']) || empty($b['qty'])) jout(400, ['error' => 'side, metal & qty required']);
    $rows = bullion_rows($db)['rows'];
    $br = null; foreach ($rows as $r0) if ($r0['key'] === ($b['metKey'] ?? '')) $br = $r0;
    $rate = $br ? ($b['side'] === 'buy' ? $br['buy'] : $br['sell']) : 0;
    $mult = ($b['unit'] ?? 'kg') === 'kg' ? 1000 : 1;
    $qtyV = max(0.001, min(5000.0, (float)($b['qty'] ?? 0)));
    $ord = ['id' => ref_id('BL'), 'side' => $b['side'], 'metKey' => $b['metKey'] ?? '', 'metal' => $b['metal'], 'mode' => $br['mode'] ?? '',
            'qty' => $qtyV, 'unit' => $b['unit'] ?? 'kg', 'rate' => $rate,
            'amount' => (int)round($rate * $qtyV * $mult), 'note' => tcap($b['note'] ?? '', 300),
            'partnerId' => $u['partnerId'] ?? '', 'partnerName' => $u['name'], 'status' => 'New', 'createdAt' => now_iso()];
    $db['bullionOrders'][] = $ord; db_save($DB_FILE, $db); jout(200, $ord);
  }
  if (preg_match('#^bullion/orders/([\w-]+)$#', $route, $mBLO) && $method === 'PUT') {
    $u = req_user($db); if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    foreach (($db['bullionOrders'] ?? []) as &$o) if ($o['id'] === $mBLO[1]) { $o['status'] = body_json()['status'] ?? $o['status']; $out = $o; }
    if (empty($out)) jout(404, ['error' => 'Order not found']);
    db_save($DB_FILE, $db); jout(200, $out);
  }
  if ($route === 'bullion/orders' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if ($u['role'] !== 'partner' && $u['role'] !== 'admin') jout(403, ['error' => 'Jeweller partners only — apply on the For Jewellers page']);
    $list = $db['bullionOrders'] ?? [];
    if ($u['role'] !== 'admin') $list = array_values(array_filter($list, fn($o) => ($o['partnerId'] ?? '') === ($u['partnerId'] ?? '')));
    jout(200, ['orders' => array_reverse($list)]);
  }

  /* ── partners (full KYC) ── */
  if ($route === 'partners/apply' && $method === 'POST') {
    throttle_hit($db, 'partner-apply', 5, 3600);
    $b = body_json();
    $firm = tcap($b['firm'] ?? '', 120);
    $email = strtolower(tcap($b['email'] ?? '', 120));
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    $plain = (string)($b['password'] ?? '');
    if ($firm === '' || $email === '' || $phone === '' || $plain === '') jout(400, ['error' => 'Firm, email, phone & password required']);
    if (strlen($plain) < 8 || strlen($plain) > 128) jout(400, ['error' => 'Password must be 8–128 characters']);
    $gst = gstin_check((string)($b['gstin'] ?? ''));
    if (!$gst['valid']) jout(400, ['error' => 'GSTIN invalid: ' . $gst['reason']]);
    $otpOk = false;
    foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === $phone && !empty($o['verified']) && $o['exp'] > time() - 3600) $otpOk = true;
    if (!$otpOk) jout(400, ['error' => 'Verify your phone with OTP first']);
    foreach ($db['users'] as $u) {
      if (strtolower($u['email'] ?? '') === $email) jout(409, ['error' => 'Email already registered — login instead']);
      if (substr(preg_replace('/\D/', '', (string)($u['phone'] ?? '')), -10) === $phone && $phone !== '') jout(409, ['error' => 'This mobile number is already registered — login instead']);
    }
    $pr = ['id' => uid('pt'), 'firm' => $firm, 'contactPerson' => tcap($b['contactPerson'] ?? '', 80), 'city' => tcap($b['city'] ?? $gst['state'], 60),
           'phone' => $phone, 'email' => $email,
           'kyc' => ['gstin' => strtoupper((string)$b['gstin']), 'gstinValid' => true, 'gstinState' => $gst['state'], 'pan' => $gst['pan'], 'ownerPan' => strtoupper(tcap($b['ownerPan'] ?? '', 10)), 'otpVerified' => true, 'at' => now_iso()],
           'message' => tcap($b['message'] ?? '', 1000), 'status' => 'pending', 'appliedAt' => now_iso()];
    $db['partners'][] = $pr;
    $u = ['id' => uid('u'), 'name' => $firm, 'email' => $email, 'phone' => $phone,
          'passHash' => pw_hash($plain), 'role' => 'partner', 'partnerId' => $pr['id'],
          'loyaltyPoints' => 0, 'wishlist' => [], 'createdAt' => now_iso()];
    $db['users'][] = $u;
    $tk = issue_token($db, $u);
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'id' => $pr['id'], 'token' => $tk, 'user' => pub_user($u)]);
  }
  if ($route === 'partners' && $method === 'GET') { need_admin($db); jout(200, ['partners' => $db['partners']]); }
  /* ── v30: admin sets/ resets any user's portal password ── */
  if (preg_match('#^users/([\w-]+)/password$#', $route, $m) && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    $plain = (string)($b['password'] ?? '');
    if (strlen($plain) < 8 || strlen($plain) > 128) jout(400, ['error' => 'Password must be 8–128 characters']);
    $target = null; $ti = -1;
    foreach ($db['users'] as $i => $u) if ($u['id'] === $m[1]) { $target = $u; $ti = $i; break; }
    if (!$target) jout(404, ['error' => 'User not found']);
    $db['users'][$ti]['passHash'] = pw_hash($plain);
    unset($db['users'][$ti]['salt']);
    /* kill every live session for that user so the new password takes effect */
    $db['tokens'] = array_values(array_filter($db['tokens'] ?? [], fn($t) => ($t['userId'] ?? '') !== $m[1]));
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'email' => $target['email']]);
  }
  if (preg_match('#^partners/([\w-]+)$#', $route, $m) && $method === 'PUT') {
    need_admin($db);
    $st = body_json()['status'] ?? null;
    foreach ($db['partners'] as &$pr) if ($pr['id'] === $m[1]) {
      $pr['status'] = $st ?: $pr['status'];
      if ($pr['status'] === 'approved' && empty($pr['joined'])) {
        $pr['joined'] = now_iso();
        foreach ($db['users'] as &$u) if (strtolower($u['email']) === strtolower($pr['email'])) { $u['role'] = 'partner'; $u['partnerId'] = $pr['id']; }
        for ($w = 5; $w >= 1; $w--) {
          $sales = (int)round(((mt_rand(250, 950)) / 100) * 100000);
          $db['settlements'][] = ['partnerId' => $pr['id'], 'weekEnding' => date('Y-m-d', time() - $w * 7 * 86400),
                                  'sales' => $sales, 'orders' => mt_rand(4, 22), 'payout' => (int)round($sales * 0.985), 'status' => 'Paid'];
        }
      }
      $out = $pr;
    }
    db_save($DB_FILE, $db); jout(200, $out ?? ['error' => 'Not found']);
  }
  if ($route === 'partners/me' && $method === 'GET') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    // v42 — no silent fallback: a non-partner account must never see the first
    // partner's KYC/settlement data by accident.
    $pid = $u['partnerId'] ?? '';
    if ($pid === '') jout(404, ['error' => 'No partner profile on this account']);
    $pr = null; foreach ($db['partners'] as $x) if ($x['id'] === $pid) $pr = $x;
    if (!$pr) jout(404, ['error' => 'Partner profile not found']);
    $set = array_values(array_filter($db['settlements'], fn($s) => $s['partnerId'] === $pid));
    jout(200, ['partner' => $pr, 'settlements' => $set]);
  }

  /* ── leads / services / misc ── */
  if ($route === 'services' && $method === 'POST') {
    throttle_hit($db, 'services', 10, 3600);
    $b = body_json();
    $name = tcap($b['name'] ?? '', 80);
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    if ($name === '' || !preg_match('#^\d{10}$#', $phone)) jout(400, ['error' => 'Name & a valid 10-digit mobile are required']);
    $db['serviceRequests'][] = ['id' => uid('sr'), 'type' => tcap($b['type'] ?? '', 40), 'name' => $name, 'phone' => $phone,
                                'email' => strtolower(tcap($b['email'] ?? '', 120)), 'details' => tcap($b['details'] ?? '', 1000),
                                'budget' => tcap($b['budget'] ?? '', 40), 'status' => 'new', 'createdAt' => now_iso()];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'services' && $method === 'GET') { need_admin($db); jout(200, ['requests' => array_reverse($db['serviceRequests'])]); }
  if ($route === 'newsletter' && $method === 'POST') {
    throttle_hit($db, 'newsletter', 10, 3600);
    $b = body_json();
    $email = strtolower(tcap($b['email'] ?? '', 120));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jout(400, ['error' => 'Valid email required']);
    $dup = false;
    foreach ($db['newsletter'] as $n) if (strtolower((string)($n['email'] ?? '')) === $email) { $dup = true; break; }
    if (!$dup) $db['newsletter'][] = ['email' => $email, 'at' => now_iso()];
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'subscribed' => !$dup]);
  }
  if ($route === 'contact' && $method === 'POST') {
    throttle_hit($db, 'contact', 10, 3600);
    $b = body_json();
    $name = tcap($b['name'] ?? '', 80);
    $message = tcap($b['message'] ?? '', 2000);
    if ($name === '' || $message === '') jout(400, ['error' => 'Name & message required']);
    $db['contactMsgs'][] = ['id' => uid('cm'), 'name' => $name, 'phone' => substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10),
                            'email' => strtolower(tcap($b['email'] ?? '', 120)), 'message' => $message, 'at' => now_iso(), 'read' => false];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'reviews' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    throttle_hit($db, 'reviews', 12, 600);
    $b = body_json();
    $pid = (string)($b['productId'] ?? '');
    $text = tcap($b['text'] ?? '', 500);
    if ($pid === '' || $text === '') jout(400, ['error' => 'productId & a written review are required']);
    $pidx = -1;
    foreach ($db['products'] as $i => $pr0) if (($pr0['id'] ?? '') === $pid) { $pidx = $i; break; }
    if ($pidx < 0) jout(404, ['error' => 'Product not found — refresh the page and try again']);
    $ratingRaw = $b['rating'] ?? 5;
    $rating = filter_var($ratingRaw, FILTER_VALIDATE_INT);
    if ($rating === false) $rating = 5;
    $rating = clampn((int)$rating, 1, 5);
    $rv = ['id' => uid('rv'), 'productId' => $pid, 'userName' => $u['name'], 'userId' => $u['id'],
           'rating' => $rating, 'text' => $text, 'createdAt' => now_iso()];
    $db['reviews'][] = $rv;
    $rs = array_values(array_filter($db['reviews'], fn($r) => ($r['productId'] ?? '') === $pid));
    $db['products'][$pidx]['rating'] = round(array_sum(array_column($rs, 'rating')) / max(1, count($rs)), 1);
    $db['products'][$pidx]['reviews'] = count($rs);
    db_save($DB_FILE, $db); jout(200, $rv);
  }

  /* ── settings / stats / users ── */
  if ($route === 'settings' && $method === 'GET') {
    $u0 = req_user($db);
    if (!$u0 || $u0['role'] !== 'admin') {
      // v42 — PUBLIC view is redacted: the GST lookup key (and any future
      // credential-style key) is never sent to anonymous visitors / customers.
      $pub = $db['settings'];
      $pub['gstApi'] = ['configured' => !empty($db['settings']['gstApi']['key'] ?? '')];
      foreach ($pub as $k => $v) {
        if (is_string($k) && preg_match('/(key|secret|token|auth|password|credential|apikey|api_key|access)/i', (string)$k)) unset($pub[$k]);
      }
      jout(200, $pub);
    }
    jout(200, $db['settings']);
  }
  if ($route === 'settings' && $method === 'PUT') {
    need_admin($db);
    // v42 — allowlist, so a stray/malicious key can never be smuggled into settings
    $allow = ['storeName', 'tagline', 'phone', 'whatsapp', 'email', 'address', 'freeShipAbove', 'shippingFee',
              'jaipurPremium', 'jaipurSilverPremium', 'bullionGoldPremium', 'bullionSilverPremium', 'metalFactor',
              'finePurity', 'announcements', 'gstApi', 'cin', 'udyam', 'dipp', 'incorporated', 'gstin', 'about', 'mapQuery'];
    $b = body_json();
    foreach ($allow as $k) if (array_key_exists($k, $b)) {
      $v = $b[$k];
      if ($k === 'gstApi') {
        $key = is_array($v) ? trim((string)($v['key'] ?? '')) : '';
        if ($key !== '') $db['settings']['gstApi'] = ['key' => substr($key, 0, 200)];
        else unset($db['settings']['gstApi']);
      } elseif (is_string($v)) {
        $db['settings'][$k] = tcap($v, 2000);
      } elseif (is_int($v) || is_float($v)) {
        $db['settings'][$k] = $v;
      } elseif (is_array($v) && $k === 'announcements') {
        $db['settings'][$k] = array_slice(array_map(fn($l) => tcap($l, 300), array_values(array_filter($v, 'is_scalar'))), 0, 20);
      }
    }
    db_save($DB_FILE, $db); jout(200, $db['settings']);
  }
  /* ── custom pages (owner-managed) ── */
  if ($route === 'pages' && $method === 'GET') {
    $list = array_values(array_filter($db['pages'] ?? [], fn($x) => !empty($x['published'])));
    if (!empty($_GET['slug'])) {
      foreach ($list as $pg) if ($pg['slug'] === $_GET['slug']) jout(200, $pg);
      jout(404, ['error' => 'Page not found']);
    }
    jout(200, ['pages' => array_map(fn($x) => ['title' => $x['title'], 'slug' => $x['slug'], 'updatedAt' => $x['updatedAt'] ?? ''], $list)]);
  }
  if ($route === 'pages' && $method === 'POST') {
    $b = body_json();
    $u2 = req_user($db); if (!$u2 || $u2['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    if (empty($b['title']) || empty($b['slug'])) jout(400, ['error' => 'Title & web address required']);
    $slug = trim(preg_replace('/[^a-z0-9-]+/', '-', strtolower(trim((string)$b['slug']))), '-');
    if (strlen($slug) > 60 || $slug === '') jout(400, ['error' => 'Invalid web address']);
    foreach (($db['pages'] ?? []) as $x) if ($x['slug'] === $slug) jout(409, ['error' => 'A page with this address already exists']);
    $pg = ['id' => uid('pg'), 'title' => cut500($b['title']), 'slug' => $slug,
           'body' => function_exists('mb_substr') ? mb_substr((string)($b['body'] ?? ''), 0, 20000) : substr((string)($b['body'] ?? ''), 0, 20000),
           'published' => ($b['published'] ?? true) !== false, 'updatedAt' => now_iso()];
    $db['pages'][] = $pg; db_save($DB_FILE, $db); jout(200, $pg);
  }
  if (preg_match('#^pages/([\w-]+)$#', $route, $mPG) && $method !== 'GET') {
    $u2 = req_user($db); if (!$u2 || $u2['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    $found = false; $out = ['error' => 'Method'];
    foreach (($db['pages'] ?? []) as $i => $x) if ($x['slug'] === $mPG[1]) {
      $found = true;
      if ($method === 'PUT') {
        $b = body_json();
        if (!empty($b['title'])) $db['pages'][$i]['title'] = cut500($b['title']);
        if (isset($b['body'])) $db['pages'][$i]['body'] = function_exists('mb_substr') ? mb_substr((string)$b['body'], 0, 20000) : substr((string)$b['body'], 0, 20000);
        if (isset($b['published'])) $db['pages'][$i]['published'] = !empty($b['published']);
        $db['pages'][$i]['updatedAt'] = now_iso();
        $out = $db['pages'][$i];
      } elseif ($method === 'DELETE') { array_splice($db['pages'], $i, 1); $out = ['ok' => true]; }
    }
    if (!$found) jout(404, ['error' => 'Page not found']);
    db_save($DB_FILE, $db); jout(200, $out);
  }

  if ($route === 'admin/stats' && $method === 'GET') {
    need_admin($db);
    $rev = array_sum(array_column($db['orders'], 'total'));
    $byDay = [];
    foreach ($db['orders'] as $o) { $d = substr($o['createdAt'], 0, 10); $byDay[$d] = ($byDay[$d] ?? 0) + $o['total']; }
    $low = [];
    foreach ($db['products'] as $p) if (($p['stock'] ?? 0) <= 3) $low[] = ['name' => $p['name'], 'stock' => $p['stock']];
    $customers = count(array_filter($db['users'], fn($u) => $u['role'] === 'customer'));
    jout(200, ['revenue' => $rev, 'orders' => count($db['orders']), 'customers' => $customers,
               'products' => count($db['products']),
               'partners' => count(array_filter($db['partners'], fn($x) => $x['status'] === 'approved')),
               'pendingPartners' => count(array_filter($db['partners'], fn($x) => $x['status'] === 'pending')),
               'serviceRequests' => count(array_filter($db['serviceRequests'], fn($s) => $s['status'] === 'new')),
               'aov' => count($db['orders']) ? (int)round($rev / count($db['orders'])) : 0,
               'byDay' => $byDay, 'newsletter' => count($db['newsletter']), 'lowStock' => $low]);
  }
  if ($route === 'admin/users' && $method === 'GET') {
    need_admin($db);
    jout(200, ['users' => array_map('pub_user', $db['users'])]);
  }

  if ($changed) db_save($DB_FILE, $db);
  jout(404, ['error' => 'Unknown API ' . $method . ' /' . $route]);
} catch (Throwable $e) {
  jout(500, ['error' => 'Server error: ' . $e->getMessage()]);
}
