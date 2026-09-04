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
function now_iso(?string $mod = null, bool $unixts = false): string {
  $t = $mod === null ? time() : strtotime($mod);
  return $unixts ? (string)$t : date('c', $t);
}
function uid(string $p = 'id'): string { return $p . '_' . bin2hex(random_bytes(6)); }
/* v44 — deterministic BIS HUID (6-char alphanumeric) for a product, stable per id. */
function huid_for(string $seed): string {
  $alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  $h = md5($seed . 'shv-bis');
  $out = '';
  for ($i = 0; $i < 6; $i++) $out .= $alpha[hexdec(substr($h, $i * 2, 2)) % 32];
  return $out;
}
/* gold/silver fineness for the hallmark card (916 = 22K, 750 = 18K, 925 = silver). */
function fineness_for(array $p): string {
  if (($p['metal'] ?? '') === 'Silver') return '925';
  return ['24K' => '999', '22K' => '916', '18K' => '750', '14K' => '585'][$p['purity'] ?? '22K'] ?? '916';
}
function body_json(): array {
  $raw = file_get_contents('php://input');
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
function db_save(string $DB_FILE, array $db): void {
  $lock = fopen($DB_FILE . '.lock', 'c');
  if ($lock) flock($lock, LOCK_EX);
  file_put_contents($DB_FILE, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
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
          'partnerStatus' => $u['partnerStatus'] ?? null,
          'referralCode' => $u['referralCode'] ?? null, 'referrals' => $u['referrals'] ?? 0,
          'createdAt' => $u['createdAt'] ?? '', 'profile' => $u['profile'] ?? [], 'addresses' => $u['addresses'] ?? [],
          'alerts' => $u['alerts'] ?? []];
}
function need_admin(array $db): array {
  $u = req_user($db);
  if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
  return $u;
}
/* Authoritative client IP for rate-limits. We deliberately take REMOTE_ADDR
   (set by the host's proxy to the real visitor) and only trust the LAST hop of
   X-Forwarded-For when REMOTE_ADDR is a private/loopback range (i.e. a real
   proxy is in front). We never trust the first XFF value, because a client can
   set it themselves to rotate identities and walk past a throttle. */
function client_ip(): string {
  $r = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  if (preg_match('#^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|::1$)#', $r)) {
    $xff = trim((string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
    if ($xff !== '') {
      $parts = array_values(array_filter(array_map('trim', explode(',', $xff))));
      if ($parts) return (string)end($parts);   // last hop = closest to us = real client
    }
  }
  return $r;
}
/* A partner only gets partner-only endpoints once admin has APPROVED them. */
function is_approved_partner(array $db, array $u): bool {
  if (($u['role'] ?? '') === 'admin') return true;
  if (($u['role'] ?? '') !== 'partner') return false;
  foreach ($db['partners'] as $p) if (($p['id'] ?? '') === ($u['partnerId'] ?? '')) return (($p['status'] ?? '') === 'approved');
  return false;
}
function need_approved_partner(array $db): array {
  $u = req_user($db);
  if (!$u) jout(401, ['error' => 'Login required']);
  if (!is_approved_partner($db, $u)) jout(403, ['error' => 'Approved jeweller partners only — approval pending?']);
  return $u;
}
/* Per-IP OTP send throttle: max $cap sends within $window seconds. Guards the
   SMS gateway against an attacker blasting thousands of OTPs (bill + spam). */
function otp_throttle(array &$db, string $ip, int $window = 30, int $cap = 3): bool {
  $db['otpThrottle'] = $db['otpThrottle'] ?? [];
  $now = time();
  foreach ($db['otpThrottle'] as $k => $t) if ($now - ($t['at'] ?? 0) > 3600) unset($db['otpThrottle'][$k]);
  $r = $db['otpThrottle'][$ip] ?? ['n' => 0, 'at' => 0];
  if (($r['n'] ?? 0) >= $cap && ($now - ($r['at'] ?? 0)) < 900) return false;
  $db['otpThrottle'][$ip] = ['n' => ($r['n'] ?? 0) + 1, 'at' => $now];
  return true;
}

/* ── Razorpay payment gateway (v40) ──
   key_secret NEVER leaves the server. The frontend only ever receives key_id
   (public) + a Razorpay order id; payment is verified server-side with an
   HMAC-SHA256 signature, so a client can't fake or tamper with the amount. */
function razorpay_cfg(array $db): array {
  $r = $db['settings']['razorpay'] ?? [];
  $key_id = trim((string)($r['key_id'] ?? ''));
  $key_secret = trim((string)($r['key_secret'] ?? ''));
  return ['key_id' => $key_id, 'key_secret' => $key_secret, 'enabled' => ($key_id !== '' && $key_secret !== '')];
}
function razorpay_http(string $key_id, string $key_secret, string $method, string $path, ?array $body = null): ?array {
  if (!function_exists('curl_init')) return null;
  $url = 'https://api.razorpay.com/v1/' . ltrim($path, '/');
  $auth = 'Basic ' . base64_encode($key_id . ':' . $key_secret);
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Authorization: ' . $auth],
    CURLOPT_SSL_VERIFYPEER => true,
  ]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
  $out = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  $j = json_decode((string)$out, true);
  return ['status' => $code, 'data' => is_array($j) ? $j : []];
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
$db = db_load($DB_FILE);
$changed = false;
/* auto-heal schema (old databases) so nothing ever fatals */
$db['otps'] = $db['otps'] ?? [];
foreach (['products','users','orders','partners','coupons','catalogs','reviews','settlements','serviceRequests','newsletter','contactMsgs','rateAlerts','pages','tokens','loginfails','bullionOrders','metalOrders','customOrders','otpThrottle','referrals','abandonedCarts'] as $__k) $db[$__k] = $db[$__k] ?? [];
/* legacy partners predate the approved-status flag → treat existing 'partner' users as approved */
foreach (($db['users'] ?? []) as &$__u) if (($__u['role'] ?? '') === 'partner' && !isset($__u['partnerStatus'])) $__u['partnerStatus'] = 'approved';
unset($__u);
/* v41 — moderation + verified-buyer fields on legacy reviews (already-live ones stay live) */
foreach (($db['reviews'] ?? []) as &$__r) {
  if (!isset($__r['status'])) { $__r['status'] = 'approved'; $changed = true; }
  if (!isset($__r['verified'])) { $__r['verified'] = false; $changed = true; }
  if (!isset($__r['photos'])) { $__r['photos'] = []; $changed = true; }
}
unset($__r);
/* v41 — assign a referral code to any user that predates the referral feature */
foreach (($db['users'] ?? []) as &$__u) if (empty($__u['referralCode'])) { $__u['referralCode'] = 'SHV' . strtoupper(substr((string)md5(($__u['id'] ?? '') . 'shv'), 0, 6)); $changed = true; }
unset($__u);
/* v45 — give every user a price-alert list (created lazily; always present in memory) */
foreach (($db['users'] ?? []) as &$__u) if (!isset($__u['alerts'])) { $__u['alerts'] = []; $changed = true; }
unset($__u);
/* v44 — live BIS hallmark: give every product a HUID + fineness/standard if it lacks one */
foreach (($db['products'] ?? []) as &$__p) {
  if (empty($__p['hallmark'])) { $__p['hallmark'] = huid_for((string)($__p['id'] ?? $__p['sku'] ?? '')); $changed = true; }
  if (!isset($__p['fineness'])) { $__p['fineness'] = fineness_for($__p); $changed = true; }
  if (!isset($__p['hallmarkStandard'])) { $__p['hallmarkStandard'] = ($__p['metal'] ?? '') === 'Silver' ? 'IS 2112:2025' : 'IS 1417:2016'; $changed = true; }
}
unset($__p);
if (!is_array($db['bullion'] ?? null) || !isset($db['bullion']['cash'])) {
  $db['bullion'] = ['cash' => [
    'goldImport995' => ['label' => 'Imported Gold 995 — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldIndian' => ['label' => 'Indian Gold (IND) — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldRef9930' => ['label' => 'Ref. Gold Local 99.30 — CASH', 'purity' => '99.30%', 'buy' => 0, 'sell' => 0],
  ], 'updatedAt' => now_iso()];
}
if (!isset($db['rates']['last'])) { $db['rates']['last'] = ['t' => now_iso(), 'gold24' => 11800, 'gold22' => 10800, 'gold18' => 8850, 'silver' => 95, 'source' => 'bootstrap']; $db['rates']['history'] = $db['rates']['history'] ?? []; }
foreach (['freeShipAbove' => 50000, 'shippingFee' => 250, 'jaipurPremium' => 55, 'jaipurSilverPremium' => 3, 'whatsapp' => '918905005921', 'metalFactor' => 0.92, 'finePurity' => '99.50%'] as $__k => $__v) if (!isset($db['settings'][$__k])) $db['settings'][$__k] = $__v;

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
    $b = body_json();
    $db['rateAlerts'][] = ['id' => uid('ra'), 'email' => $b['email'] ?? '', 'metal' => $b['metal'] ?? '', 'target' => (float)($b['target'] ?? 0), 'createdAt' => now_iso()];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
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
    foreach ($list as $x) { $y = $x; $y['lessWeightG'] = $y['lessWeightG'] ?? 0; $y['wastagePct'] = $y['wastagePct'] ?? 8; $y['price'] = compute_price($x, $R); $out[] = $y; }
    jout(200, ['products' => $out, 'rates' => current_rates($db)]);
  }
  if (preg_match('#^products/([\w-]+)$#', $route, $m)) {
    $idx = null; foreach ($db['products'] as $i => $x) if ($x['id'] === $m[1]) $idx = $i;
    if ($method === 'GET') {
      if ($idx === null) jout(404, ['error' => 'Not found']);
      $R = current_rates($db);
      $similar = [];
      foreach ($db['products'] as $x) if ($x['category'] === $db['products'][$idx]['category'] && $x['id'] !== $m[1] && !empty($x['active'])) { $y = $x; $y['price'] = compute_price($x, $R); $similar[] = $y; if (count($similar) >= 4) break; }
      $reviews = array_values(array_filter($db['reviews'] ?? [], fn($r) => ($r['productId'] ?? '') === $m[1] && ($r['status'] ?? 'approved') === 'approved'));
      $p = $db['products'][$idx]; $p['price'] = compute_price($p, $R);
      jout(200, ['product' => $p, 'rates' => current_rates($db), 'similar' => $similar, 'reviews' => $reviews]);
    }
    if ($method === 'PUT') {
      need_admin($db);
      $b = body_json();
      foreach ($b as $k => $v) $db['products'][$idx][$k] = $v;
      db_save($DB_FILE, $db); jout(200, $db['products'][$idx]);
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
    $prod = array_merge(['createdAt' => now_iso(), 'active' => true, 'rating' => 4.6, 'reviews' => 0, 'stock' => 10, 'sizes' => [], 'tags' => [], 'images' => [], 'stoneValue' => 0], $b);
    $prod['id'] = uid('p');
    $db['products'][] = $prod; db_save($DB_FILE, $db); jout(200, $prod);
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
    $phone = substr(preg_replace('/\D/', '', (string)(body_json()['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Enter a valid 10-digit Indian mobile']);
    if (!otp_throttle($db, client_ip())) jout(429, ['error' => 'Too many OTP requests — please wait a few minutes']);
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
    $b = body_json();
    if (empty($b['name']) || empty($b['email']) || empty($b['password'])) jout(400, ['error' => 'Name, email & password required']);
    if (strlen((string)$b['password']) < 8) jout(400, ['error' => 'Password must be at least 8 characters']);
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Valid 10-digit phone required']);
    $otpOk = false;
    foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === $phone && !empty($o['verified']) && $o['exp'] > time() - 3600) $otpOk = true;
    if (!$otpOk) jout(400, ['error' => 'Verify your phone with OTP first']);
    foreach ($db['users'] as $u) if (strtolower($u['email']) === strtolower($b['email'])) jout(409, ['error' => 'Email already registered']);
    $refCode = strtoupper(trim((string)($b['referral'] ?? '')));
    $u = ['id' => uid('u'), 'name' => $b['name'], 'email' => strtolower($b['email']), 'phone' => $phone,
          'passHash' => pw_hash((string)$b['password']), 'role' => 'customer',
          'loyaltyPoints' => 120, 'wishlist' => [], 'createdAt' => now_iso(),
          'referralCode' => 'SHV' . strtoupper(substr(str_replace('-', '', $u0 = uid()), 3, 6))];
    $db['users'][] = $u;
    // ── referral (v41): award the referrer points when a new account uses their code ──
    if ($refCode !== '') {
      foreach ($db['users'] as &$ru) if (strtoupper((string)($ru['referralCode'] ?? '')) === $refCode && $ru['id'] !== $u['id']) {
        $ru['loyaltyPoints'] = (int)($ru['loyaltyPoints'] ?? 0) + 200;
        $ru['referrals'] = ($ru['referrals'] ?? 0) + 1;
        $u['referredBy'] = $ru['id'];
        $db['referrals'][] = ['id' => uid('rf'), 'by' => $ru['id'], 'to' => $u['id'], 'at' => now_iso(), 'points' => 200];
      }
    }
    $tk = issue_token($db, $u);
    db_save($DB_FILE, $db); jout(200, ['token' => $tk, 'user' => pub_user($u)]);
  }
  if ($route === 'auth/login' && $method === 'POST') {
    $b = body_json();
    $ip = client_ip();
    $key = $ip . '|' . strtolower((string)($b['email'] ?? ''));
    $db['loginfails'] = $db['loginfails'] ?? [];
    $rec = $db['loginfails'][$key] ?? ['n' => 0, 'until' => 0];
    if (($rec['until'] ?? 0) > time()) jout(429, ['error' => 'Too many attempts — try again in 15 minutes']);
    foreach ($db['users'] as $u) if (strtolower($u['email']) === strtolower((string)($b['email'] ?? ''))) {
      $__rehash = false;
      if (pw_verify($u, (string)($b['password'] ?? ''), $__rehash)) {
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
      foreach (['dob', 'anniversary', 'gender'] as $k) if (isset($b[$k])) $uu['profile'][$k] = mb_substr((string)$b[$k], 0, 20);
      if (!empty($b['name'])) $uu['name'] = cut500(trim((string)$b['name']));
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
      $addr = ['id' => uid('ad'), 'label' => $b['label'] ?? 'Home', 'name' => trim((string)$b['name']), 'phone' => substr(preg_replace('/\D/', '', (string)$b['phone']), -10),
               'line' => trim((string)$b['line']), 'city' => trim((string)$b['city']), 'state' => (string)($b['state'] ?? 'Rajasthan'), 'pincode' => (string)$b['pincode']];
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
            foreach (['label', 'name', 'phone', 'line', 'city', 'state', 'pincode'] as $k) if (isset($b[$k])) $uu['addresses'][$i][$k] = trim((string)$b[$k]);
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
    foreach ($db['products'] as $x) if (in_array($x['id'], $w)) { $y = $x; $y['price'] = compute_price($x, $R); $items[] = $y; }
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

  /* ── price-drop / back-in-stock alerts (v45) ──
     A logged-in user asks to be told when a specific piece either (a) drops to
     a target price, or (b) is back in stock. The server owns the price math
     (current_rates + compute_price) so the check is identical to the bill. */ 
  function alerts_for_user(array $db, array $u): array {
    $R = current_rates($db);
    $out = [];
    foreach (($u['alerts'] ?? []) as $a) {
      $p = null; foreach ($db['products'] as $x) if ($x['id'] === ($a['productId'] ?? '')) { $p = $x; break; }
      if (!$p) continue;   // product removed → drop the alert
      $pr = compute_price($p, $R);
      $cur = $a['type'] === 'stock' ? (int)($p['stock'] ?? 0) : $pr['total'];
      // fire-on-condition: price alert fired when current total <= target; stock when stock > 0
      $fired = ($a['type'] === 'price' && (float)$cur <= (float)$a['target']) ||
               ($a['type'] === 'stock' && $cur > 0);
      $a['current'] = $cur;
      $a['currentPrice'] = $pr['total'];
      $a['price'] = $pr;
      $a['fired'] = $fired;
      $a['product'] = $p;   // includes hallmark, fineness, image, weight for the card
      $out[] = $a;
    }
    return $out;
  }
  if ($route === 'alerts' && $method === 'GET') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    jout(200, ['alerts' => alerts_for_user($db, $u)]);
  }
  if ($route === 'alerts' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    $pid = (string)($b['productId'] ?? '');
    $type = ($b['type'] ?? 'price') === 'stock' ? 'stock' : 'price';
    $exists = false; foreach ($db['products'] as $x) if ($x['id'] === $pid) { $exists = true; break; }
    if (!$exists) jout(404, ['error' => 'Piece not found']);
    if ($type === 'price') {
      $target = (float)($b['target'] ?? 0);
      if ($target <= 0) jout(400, ['error' => 'Enter a target price']);
    } else {
      $target = 0;
    }
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['alerts'] = $uu['alerts'] ?? [];
      // update existing (same product+type) instead of duplicating
      $found = false;
      foreach ($uu['alerts'] as &$a) if (($a['productId'] ?? '') === $pid && ($a['type'] ?? '') === $type) {
        $a['target'] = $type === 'price' ? $target : 0; $a['createdAt'] = now_iso(); $found = true; break;
      }
      unset($a);
      if (!$found) $uu['alerts'][] = ['id' => uid('al'), 'productId' => $pid, 'type' => $type,
                                      'target' => $type === 'price' ? $target : 0, 'createdAt' => now_iso()];
      $alerts = alerts_for_user($db, $uu);   // re-evaluate so the toast can show 'already at target'
      db_save($DB_FILE, $db); jout(200, ['ok' => true, 'alerts' => $alerts]);
    }
    jout(404, ['error' => 'User not found']);
  }
  if (preg_match('#^alerts/([\\w-]+)$#', $route, $mA) && $method === 'DELETE') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['alerts'] = array_values(array_filter($uu['alerts'] ?? [], fn($a) => ($a['id'] ?? '') !== $mA[1]));
      db_save($DB_FILE, $db); jout(200, ['ok' => true]);
    }
    jout(404, ['error' => 'Alert not found']);
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
                 'qty' => max(1, (int)($it['qty'] ?? 1)), 'weightG' => $prod['weightG'], 'purity' => $prod['purity'], 'metal' => $prod['metal'],
                 'unitPrice' => $pr['total'], 'ratePerGram' => $pr['ratePerGram'], 'makingCharge' => $pr['makingCharge'], 'gst' => $pr['gst'],
                 'size' => $it['size'] ?? null, 'engraving' => $it['engraving'] ?? null,
                 'hallmark' => $prod['hallmark'] ?? null, 'fineness' => $prod['fineness'] ?? null];
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
    $pm = $b['paymentMethod'] ?? 'Online';
    $online = in_array($pm, ['UPI', 'Card', 'Netbanking'], true);
    $order = [
      'id' => 'SHV' . substr((string)time(), -8), 'userId' => $u['id'], 'userName' => $u['name'], 'items' => $items,
      'address' => $b['address'] ?? (object)[], 'paymentMethod' => $pm,
      'paymentStatus' => $pm === 'COD' ? 'Pending (COD)' : ($pm === 'WhatsApp' ? 'Confirm on WhatsApp' : ($online && razorpay_cfg($db)['enabled'] ? 'Pending payment' : 'Paid')),
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

  /* ── Razorpay payments (v40) ── */
  if ($route === 'payment/config' && $method === 'GET') {
    // Public & safe: only key_id (public) + whether it's enabled. key_secret is never returned.
    $c = razorpay_cfg($db);
    $r = $db['settings']['razorpay'] ?? [];
    jout(200, [
      'enabled' => $c['enabled'],
      'keyId' => $c['enabled'] ? $c['key_id'] : null,
      'mode' => (string)($r['mode'] ?? 'test'),
      'currency' => 'INR',
      'name' => (string)($db['settings']['storeName'] ?? 'Shivaa Jewellers'),
    ]);
  }
  if ($route === 'payment/create-order' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $c = razorpay_cfg($db);
    if (!$c['enabled']) jout(400, ['error' => 'Online payments are not turned on yet — add your Razorpay keys in Admin → Settings']);
    $b = body_json();
    $oid = trim((string)($b['orderId'] ?? ''));
    $o = null;
    foreach ($db['orders'] as $x) if ($x['id'] === $oid) $o = $x;
    if (!$o) jout(404, ['error' => 'Order not found']);
    if ($o['userId'] !== $u['id'] && ($u['role'] ?? '') !== 'admin') jout(403, ['error' => 'Not your order']);
    if (($o['paymentStatus'] ?? '') === 'Paid') jout(200, ['alreadyPaid' => true, 'orderId' => $oid]);
    // Server-side amount, in paise, so the client can never tamper with it.
    $amount = (int)round(((float)($o['total'] ?? 0)) * 100);
    if ($amount <= 0) jout(400, ['error' => 'Order total is zero']);
    // Re-use an earlier RZP order id if the amount is unchanged (avoids orphan orders on retry).
    if (!empty($o['razorpayOrderId']) && (int)($o['razorpayAmount'] ?? 0) === $amount) {
      jout(200, ['orderId' => $oid, 'razorpayOrderId' => $o['razorpayOrderId'], 'amount' => $amount, 'currency' => 'INR', 'keyId' => $c['key_id']]);
    }
    $rp = razorpay_http($c['key_id'], $c['key_secret'], 'POST', 'orders', [
      'amount' => $amount, 'currency' => 'INR', 'receipt' => substr($oid, 0, 40),
      'payment_capture' => 1,
    ]);
    if (!$rp || $rp['status'] < 200 || $rp['status'] >= 300 || empty($rp['data']['id'])) {
      $msg = $rp['data']['error']['description'] ?? 'Could not reach Razorpay — check your API keys';
      jout(502, ['error' => $msg]);
    }
    foreach ($db['orders'] as &$x) if ($x['id'] === $oid) { $x['razorpayOrderId'] = $rp['data']['id']; $x['razorpayAmount'] = $amount; $x['razorpayCurrency'] = 'INR'; $o = $x; }
    db_save($DB_FILE, $db);
    jout(200, ['orderId' => $oid, 'razorpayOrderId' => $rp['data']['id'], 'amount' => $amount, 'currency' => 'INR', 'keyId' => $c['key_id']]);
  }
  if ($route === 'payment/verify' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $c = razorpay_cfg($db);
    if (!$c['enabled']) jout(400, ['error' => 'Online payments are not enabled']);
    $b = body_json();
    $oid = trim((string)($b['orderId'] ?? ''));
    $rzpOrderId = trim((string)($b['razorpayOrderId'] ?? ''));
    $rzpPayId = trim((string)($b['razorpayPaymentId'] ?? ''));
    $signature = trim((string)($b['razorpaySignature'] ?? ''));
    if (!$oid || !$rzpOrderId || !$rzpPayId || !$signature) jout(400, ['error' => 'Missing payment details']);
    $o = null;
    foreach ($db['orders'] as $x) if ($x['id'] === $oid) $o = $x;
    if (!$o) jout(404, ['error' => 'Order not found']);
    if ($o['userId'] !== $u['id'] && ($u['role'] ?? '') !== 'admin') jout(403, ['error' => 'Not your order']);
    if (($o['paymentStatus'] ?? '') === 'Paid') jout(200, ['ok' => true, 'order' => $o]);
    // Official Razorpay signature check: HMAC-SHA256(order_id + '|' + payment_id, key_secret)
    $expected = hash_hmac('sha256', $rzpOrderId . '|' . $rzpPayId, $c['key_secret']);
    if (!hash_equals($expected, $signature)) jout(400, ['error' => 'Payment signature verification failed']);
    // Double-check with Razorpay that this payment is valid & captured for our order.
    $chk = razorpay_http($c['key_id'], $c['key_secret'], 'GET', 'payments/' . rawurlencode($rzpPayId));
    if ($chk && $chk['status'] >= 200 && $chk['status'] < 300) {
      $st = $chk['data']['status'] ?? '';
      if ($st === 'failed' || $st === 'refunded') jout(400, ['error' => 'Payment status is ' . $st]);
      if (($chk['data']['order_id'] ?? '') !== $rzpOrderId) jout(400, ['error' => 'Payment does not match this order']);
    }
    foreach ($db['orders'] as &$x) if ($x['id'] === $oid) {
      $x['paymentStatus'] = 'Paid';
      $x['paymentId'] = $rzpPayId;
      $x['paidAt'] = now_iso();
      foreach ($x['timeline'] as &$t) if ($t['s'] === 'Placed') $t['paid'] = true;
      unset($t);
      $x['timeline'][] = ['s' => 'Paid', 't' => now_iso()];
      $o = $x;
    }
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'order' => $o]);
  }

  /* ── catalogs (uploads) ── */
  if ($route === 'catalogs' && $method === 'GET') {
    $u0 = req_user($db);
    if (!$u0 || !is_approved_partner($db, $u0)) jout(200, ['catalogs' => [], 'gated' => true]);
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
    $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => 'Authorization: Bearer ' . $cfg['key'] . "\r\n"]]);
    $raw = @file_get_contents($url, false, $ctx);
    $j = $raw ? json_decode($raw, true) : null;
    $name = $j['legalName'] ?? $j['taxpayerName'] ?? $j['tradeNam'] ?? ($j['data']['legalName'] ?? ($j['data']['tradeNam'] ?? null));
    if ($name) jout(200, ['configured' => true, 'verified' => true, 'legalName' => trim((string)$name), 'gstin' => $g]);
    jout(200, ['configured' => true, 'verified' => false, 'note' => 'GST service unreachable — admin will verify manually']);
  }
  if ($route === 'kyc/send-otp' && $method === 'POST') {
    $phone = substr(preg_replace('/\D/', '', (string)(body_json()['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Enter a valid 10-digit Indian mobile']);
    if (!otp_throttle($db, client_ip())) jout(429, ['error' => 'Too many OTP requests — please wait a few minutes']);
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
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if (!is_approved_partner($db, $u)) jout(403, ['error' => 'Approved jeweller partners only — apply on the For Jewellers page']);
    $b = body_json();
    $factor = (float)($db['settings']['metalFactor'] ?? 0.92);
    $purity = $db['settings']['finePurity'] ?? '99.50%';
    $totalWeight = 0; $items = [];
    foreach (($b['items'] ?? []) as $it) {
      foreach ($db['products'] as $prod) if ($prod['id'] === $it['id'] && !empty($prod['active'])) {
        $qty = max(1, (int)($it['qty'] ?? 1));
        $totalWeight += $prod['weightG'] * $qty;
        $items[] = ['productId' => $prod['id'], 'name' => $prod['name'], 'img' => $prod['images'][0] ?? null, 'qty' => $qty, 'weightG' => $prod['weightG'], 'lineWeight' => round($prod['weightG'] * $qty, 3)];
      }
    }
    if (!count($items)) jout(400, ['error' => 'No designs selected']);
    $ord = ['id' => 'MX' . substr((string)time(), -8), 'partnerId' => $u['partnerId'] ?? '', 'partnerName' => $u['name'],
            'items' => $items, 'totalWeightG' => round($totalWeight, 3), 'factor' => $factor,
            'fineGrams' => round($totalWeight * $factor, 2), 'purity' => $purity,
            'makingCharges' => 0, 'note' => $b['note'] ?? '', 'status' => 'New', 'createdAt' => now_iso()];
    $db['metalOrders'][] = $ord; db_save($DB_FILE, $db); jout(200, $ord);
  }
  if ($route === 'metalexchange/orders' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if (!is_approved_partner($db, $u)) jout(403, ['error' => 'Approved jeweller partners only — apply on the For Jewellers page']);
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
    $ord = ['id' => 'CO' . substr((string)time(), -8), 'partnerId' => $u['partnerId'] ?? '', 'partnerName' => $u['name'],
            'name' => cut500($fields['name']), 'weightG' => (float)$fields['weight'], 'melting' => (float)($fields['melting'] ?? 0),
            'advance' => (float)($fields['advance'] ?? 0), 'size' => cut500($fields['size'] ?? ''), 'note' => cut500($fields['note'] ?? ''),
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
    $u = req_user($db); if (!$u || !is_approved_partner($db, $u)) jout(403, ['error' => 'Approved jeweller access only']);
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
    $u = req_user($db); if (!$u || !is_approved_partner($db, $u)) jout(403, ['error' => 'Approved jeweller access only']);
    $b = body_json();
    if (empty($b['side']) || empty($b['metal']) || empty($b['qty'])) jout(400, ['error' => 'side, metal & qty required']);
    $rows = bullion_rows($db)['rows'];
    $br = null; foreach ($rows as $r0) if ($r0['key'] === ($b['metKey'] ?? '')) $br = $r0;
    $rate = $br ? ($b['side'] === 'buy' ? $br['buy'] : $br['sell']) : 0;
    $mult = ($b['unit'] ?? 'kg') === 'kg' ? 1000 : 1;
    $ord = ['id' => 'BL' . substr((string)time(), -8), 'side' => $b['side'], 'metKey' => $b['metKey'] ?? '', 'metal' => $b['metal'], 'mode' => $br['mode'] ?? '',
            'qty' => (float)$b['qty'], 'unit' => $b['unit'] ?? 'kg', 'rate' => $rate,
            'amount' => (int)round($rate * (float)$b['qty'] * $mult), 'note' => $b['note'] ?? '',
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
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if (!is_approved_partner($db, $u)) jout(403, ['error' => 'Approved jeweller partners only — apply on the For Jewellers page']);
    $list = $db['bullionOrders'] ?? [];
    if ($u['role'] !== 'admin') $list = array_values(array_filter($list, fn($o) => ($o['partnerId'] ?? '') === ($u['partnerId'] ?? '')));
    jout(200, ['orders' => array_reverse($list)]);
  }

  /* ── partners (full KYC) ── */
  if ($route === 'partners/apply' && $method === 'POST') {
    $b = body_json();
    if (empty($b['firm']) || empty($b['email']) || empty($b['phone']) || empty($b['password'])) jout(400, ['error' => 'Firm, email, phone & password required']);
    if (strlen((string)$b['password']) < 8) jout(400, ['error' => 'Password must be at least 8 characters']);
    $gst = gstin_check((string)($b['gstin'] ?? ''));
    if (!$gst['valid']) jout(400, ['error' => 'GSTIN invalid: ' . $gst['reason']]);
    $b['phone'] = substr(preg_replace('/\D/', '', (string)$b['phone']), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $b['phone'])) jout(400, ['error' => 'Valid 10-digit phone required']);
    $otpOk = false;
    foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === substr((string)$b['phone'], -10) && !empty($o['verified']) && $o['exp'] > time() - 3600) $otpOk = true;
    if (!$otpOk) jout(400, ['error' => 'Verify your phone with OTP first']);
    foreach ($db['users'] as $u) if (strtolower($u['email']) === strtolower((string)$b['email'])) jout(409, ['error' => 'Email already registered — login instead']);
    $pr = ['id' => uid('pt'), 'firm' => $b['firm'], 'contactPerson' => $b['contactPerson'] ?? '', 'city' => $b['city'] ?? $gst['state'],
           'phone' => $b['phone'], 'email' => strtolower($b['email']),
           'kyc' => ['gstin' => strtoupper((string)$b['gstin']), 'gstinValid' => true, 'gstinState' => $gst['state'], 'pan' => $gst['pan'], 'ownerPan' => strtoupper((string)($b['ownerPan'] ?? '')), 'otpVerified' => true, 'at' => now_iso()],
           'message' => $b['message'] ?? '', 'status' => 'pending', 'appliedAt' => now_iso()];
    $db['partners'][] = $pr;
    $u = ['id' => uid('u'), 'name' => $b['firm'], 'email' => strtolower($b['email']), 'phone' => $b['phone'],
          'passHash' => pw_hash((string)$b['password']), 'role' => 'partner', 'partnerId' => $pr['id'],
          'partnerStatus' => 'pending', 'loyaltyPoints' => 0, 'wishlist' => [], 'createdAt' => now_iso()];
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
    if (strlen((string)($b['password'] ?? '')) < 8) jout(400, ['error' => 'Password must be at least 8 characters']);
    $target = null; $ti = -1;
    foreach ($db['users'] as $i => $u) if ($u['id'] === $m[1]) { $target = $u; $ti = $i; break; }
    if (!$target) jout(404, ['error' => 'User not found']);
    $db['users'][$ti]['passHash'] = pw_hash((string)$b['password']);
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
        foreach ($db['users'] as &$u) if (strtolower($u['email']) === strtolower($pr['email'])) { $u['role'] = 'partner'; $u['partnerId'] = $pr['id']; $u['partnerStatus'] = 'approved'; }
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
    $pid = $u['partnerId'] ?? ($db['partners'][0]['id'] ?? '');
    $pr = null; foreach ($db['partners'] as $x) if ($x['id'] === $pid) $pr = $x;
    $set = array_values(array_filter($db['settlements'], fn($s) => $s['partnerId'] === $pid));
    jout(200, ['partner' => $pr, 'settlements' => $set]);
  }

  /* ── leads / services / misc ── */
  if ($route === 'services' && $method === 'POST') {
    $b = body_json();
    if (empty($b['name']) || empty($b['phone'])) jout(400, ['error' => 'Name & phone required']);
    $db['serviceRequests'][] = ['id' => uid('sr'), 'type' => $b['type'] ?? '', 'name' => $b['name'], 'phone' => $b['phone'],
                                'email' => $b['email'] ?? '', 'details' => $b['details'] ?? '', 'budget' => $b['budget'] ?? '', 'status' => 'new', 'createdAt' => now_iso()];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'services' && $method === 'GET') { need_admin($db); jout(200, ['requests' => array_reverse($db['serviceRequests'])]); }
  if ($route === 'newsletter' && $method === 'POST') {
    $b = body_json();
    if (!filter_var($b['email'] ?? '', FILTER_VALIDATE_EMAIL)) jout(400, ['error' => 'Valid email required']);
    if (!in_array($b['email'], array_column($db['newsletter'], 'email'))) $db['newsletter'][] = ['email' => $b['email'], 'at' => now_iso()];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'contact' && $method === 'POST') {
    $b = body_json();
    if (empty($b['name']) || empty($b['message'])) jout(400, ['error' => 'Name & message required']);
    $db['contactMsgs'][] = ['id' => uid('cm'), 'name' => $b['name'], 'phone' => $b['phone'] ?? '', 'email' => $b['email'] ?? '', 'message' => $b['message'], 'at' => now_iso(), 'read' => false];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'reviews' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    if (empty($b['productId']) || empty($b['text'])) jout(400, ['error' => 'productId & text required']);
    // New reviews enter moderation (>1 "pending"); legacy/approved ones already live.
    $hasOrder = false;
    foreach ($db['orders'] as $o) if (($o['userId'] ?? '') === $u['id'] && ($o['status'] ?? '') !== 'cancelled') $hasOrder = true;
    $photos = [];
    foreach (($b['photos'] ?? []) as $i => $photo64) {
      if (count($photos) >= 4) break;
      if (is_string($photo64) && preg_match('#^data:image/(jpe?g|png|webp);base64,#i', $photo64, $pm)) {
        $bin = base64_decode(substr($photo64, strpos($photo64, ',') + 1));
        if ($bin !== false && strlen($bin) <= 4000000) {
          $ext = strtolower($pm[1]) === 'jpeg' ? 'jpg' : strtolower($pm[1]);
          $name = 'rv_' . $u['id'] . '_' . uniqid() . '_' . $i . '.' . $ext;
          $file = $ROOT . '/uploads/reviews/' . $name;
          @mkdir($ROOT . '/uploads/reviews', 0775, true);
          if (file_put_contents($file, $bin) !== false) $photos[] = '/uploads/reviews/' . $name;
        }
      }
    }
    $rv = ['id' => uid('rv'), 'productId' => $b['productId'], 'userName' => $u['name'],
           'rating' => clampn((int)($b['rating'] ?? 5), 1, 5), 'text' => cut500((string)$b['text']),
           'createdAt' => now_iso(), 'status' => 'pending', 'verified' => $hasOrder, 'photos' => $photos];
    $db['reviews'][] = $rv;
    // Product aggregates only count reviews once moderated.
    foreach ($db['products'] as &$pr) if ($pr['id'] === $b['productId']) {
      $rs = array_values(array_filter($db['reviews'], fn($r) => $r['productId'] === $pr['id'] && ($r['status'] ?? '') === 'approved'));
      $pr['rating'] = $rs ? round(array_sum(array_column($rs, 'rating')) / count($rs), 1) : 4.6;
      $pr['reviews'] = count($rs);
    }
    db_save($DB_FILE, $db); jout(200, $rv);
  }

  /* ── review moderation (v41) — admin: list / approve / reject / delete ── */
  if ($route === 'reviews' && $method === 'GET') {
    need_admin($db);
    $status = trim((string)($_GET['status'] ?? ''));
    $list = array_reverse($db['reviews']);
    if ($status !== '' && $status !== 'all') $list = array_values(array_filter($list, fn($r) => ($r['status'] ?? '') === $status));
    jout(200, ['reviews' => $list]);
  }
  if (preg_match('#^reviews/([\\w-]+)$#', $route, $mRV) && $method === 'PUT') {
    need_admin($db);
    $b = body_json();
    $idx = null; foreach ($db['reviews'] as $i => $r) if ($r['id'] === $mRV[1]) $idx = $i;
    if ($idx === null) jout(404, ['error' => 'Review not found']);
    if (isset($b['status'])) $db['reviews'][$idx]['status'] = in_array($b['status'], ['pending', 'approved', 'rejected']) ? $b['status'] : 'approved';
    if (isset($b['verified'])) $db['reviews'][$idx]['verified'] = (bool)$b['verified'];
    $pid = $db['reviews'][$idx]['productId'];
    foreach ($db['products'] as &$pr) if ($pr['id'] === $pid) {
      $rs = array_values(array_filter($db['reviews'], fn($r) => $r['productId'] === $pid && ($r['status'] ?? '') === 'approved'));
      $pr['rating'] = $rs ? round(array_sum(array_column($rs, 'rating')) / count($rs), 1) : 4.6;
      $pr['reviews'] = count($rs);
    }
    db_save($DB_FILE, $db); jout(200, $db['reviews'][$idx]);
  }
  if (preg_match('#^reviews/([\\w-]+)$#', $route, $mRV) && $method === 'DELETE') {
    need_admin($db);
    $idx = null; foreach ($db['reviews'] as $i => $r) if ($r['id'] === $mRV[1]) $idx = $i;
    if ($idx === null) jout(404, ['error' => 'Review not found']);
    $pid = $db['reviews'][$idx]['productId'];
    unset($db['reviews'][$idx]); $db['reviews'] = array_values($db['reviews']);
    foreach ($db['products'] as &$pr) if ($pr['id'] === $pid) {
      $rs = array_values(array_filter($db['reviews'], fn($r) => $r['productId'] === $pid && ($r['status'] ?? '') === 'approved'));
      $pr['rating'] = $rs ? round(array_sum(array_column($rs, 'rating')) / count($rs), 1) : 4.6;
      $pr['reviews'] = count($rs);
    }
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ── abandoned-cart recovery (v41) ──
     The storefront registers a cart the moment it has items and a contact. An
     external cron — or the admin panel button — calls <nudge> to advance the
     1-hour then 24-hour nudge levels. */
  if ($route === 'cart-abandon' && $method === 'POST') {
    $b = body_json();
    $items = is_array($b['items'] ?? null) ? $b['items'] : [];
    if (!$items) jout(400, ['error' => 'items required']);
    $R = current_rates($db);
    $lines = []; $subtotal = 0;
    foreach ($items as $it) {
      $pid = $it['id'] ?? '';
      foreach ($db['products'] as $p) if ($p['id'] === $pid) {
        $pr = compute_price($p, $R); $qty = max(1, (int)($it['qty'] ?? 1));
        $lines[] = ['id' => $pid, 'name' => $p['name'], 'qty' => $qty, 'total' => $pr['total'] * $qty];
        $subtotal += $pr['total'] * $qty;
      }
    }
    if (!$lines) jout(400, ['error' => 'No valid products in cart']);
    $u = req_user($db);
    $phone = trim((string)($b['phone'] ?? ($u['phone'] ?? '')));
    $email = trim((string)($b['email'] ?? ($u['email'] ?? '')));
    // Reuse an active (non-converted, <24h) record for the same phone to avoid duplicates.
    $found = null;
    foreach ($db['abandonedCarts'] as $i => $c) {
      if (($c['converted'] ?? false)) continue;
      if ($phone && ($c['phone'] ?? '') === $phone) $found = $i;
      elseif (!$phone && ($u['id'] ?? '') && ($c['userId'] ?? '') === $u['id']) $found = $i;
    }
    if ($found !== null) {
      $db['abandonedCarts'][$found]['items'] = $lines;
      $db['abandonedCarts'][$found]['subtotal'] = $subtotal;
      $db['abandonedCarts'][$found]['updatedAt'] = now_iso();
      db_save($DB_FILE, $db);
      jout(200, ['id' => $db['abandonedCarts'][$found]['id'], 'subtotal' => $subtotal]);
    }
    $rec = ['id' => uid('ab'), 'userId' => $u['id'] ?? null, 'phone' => $phone, 'email' => $email,
            'items' => $lines, 'subtotal' => $subtotal, 'createdAt' => now_iso(), 'updatedAt' => now_iso(),
            'nudgeLevel' => 0, 'converted' => false];
    $db['abandonedCarts'][] = $rec;
    db_save($DB_FILE, $db);
    jout(200, ['id' => $rec['id'], 'subtotal' => $subtotal]);
  }
  if ($route === 'cart-abandon' && $method === 'GET') {
    need_admin($db);
    jout(200, ['carts' => array_reverse($db['abandonedCarts'] ?? [])]);
  }
  if (preg_match('#^cart-abandon/([\\w-]+)$#', $route, $mAB) && $method === 'POST') {
    need_admin($db);
    $idx = null; foreach ($db['abandonedCarts'] as $i => $c) if ($c['id'] === $mAB[1]) $idx = $i;
    if ($idx === null) jout(404, ['error' => 'Cart not found']);
    $b = body_json();
    $lv = (int)($db['abandonedCarts'][$idx]['nudgeLevel'] ?? 0);
    if (($b['action'] ?? '') === 'converted') { $db['abandonedCarts'][$idx]['converted'] = true; }
    else { $db['abandonedCarts'][$idx]['nudgeLevel'] = min(2, $lv + 1); $db['abandonedCarts'][$idx]['lastNudgeAt'] = now_iso(); }
    db_save($DB_FILE, $db);
    $nl = (int)($db['abandonedCarts'][$idx]['nudgeLevel'] ?? 0);
    jout(200, ['ok' => true, 'level' => $nl, 'nextDueAt' => $nl >= 2 ? null : now_iso('+' . ($nl === 1 ? '1 hour' : '24 hours'))]);
  }

  /* ── v44 · live BIS hallmark lookup — resolves the HUID against Shivaa's hallmark record ── */
  if (preg_match('#^hallmark/([A-Z0-9]{6})$#', $route, $mH) && $method === 'GET') {
    $huid = $mH[1];
    foreach ($db['products'] as $p) if (($p['hallmark'] ?? '') === $huid) {
      $fin = $p['fineness'] ?? fineness_for($p);
      jout(200, [
        'huid' => $huid, 'status' => 'valid', 'metal' => $p['metal'] ?? '', 'purity' => $p['purity'] ?? '',
        'fineness' => $fin, 'standard' => $p['hallmarkStandard'] ?? ($p['metal'] === 'Silver' ? 'IS 2112:2025' : 'IS 1417:2016'),
        'trademark' => 'BIS', 'hallmarkCentre' => 'BIS-recognised Assaying & Hallmarking Centre, Jaipur',
        'jeweller' => 'Shivaa Jewellers, Jayal, Nagaur (BIS licence on request)',
        'note' => 'Cross-check this HUID on the official BIS portal (bis.gov.in) or the free BIS Care app → Verify HUID.',
      ]);
    }
    jout(404, ['error' => 'Hallmark not found', 'huid' => $huid]);
  }

  /* ── settings / stats / users ── */
  if ($route === 'settings' && $method === 'GET') {
    // Never ship secrets (e.g. saved GST-verification or Razorpay API keys) to the storefront.
    $pub = $db['settings'];
    foreach (['gstApi', 'sms', 'paymentKeys', 'payment', 'secrets', 'razorpay'] as $k) unset($pub[$k]);
    // Expose only the public Razorpay key_id + mode so the storefront/client knows the state.
    $rc = $db['settings']['razorpay'] ?? [];
    $pub['razorpay'] = ['enabled' => !empty(trim((string)($rc['key_id'] ?? ''))) && !empty(trim((string)($rc['key_secret'] ?? ''))), 'keyId' => trim((string)($rc['key_id'] ?? '')), 'mode' => (string)($rc['mode'] ?? 'test')];
    jout(200, $pub);
  }
  if ($route === 'settings' && $method === 'PUT') {
    need_admin($db);
    $b = body_json();
    foreach ($b as $k => $v) {
      if ($k === 'razorpay') {
        // Preserve the existing secret if a new blank is sent (admin UIs send '' when untouched).
        $cur = $db['settings']['razorpay'] ?? [];
        $nk = trim((string)($v['key_id'] ?? ''));
        $ns = trim((string)($v['key_secret'] ?? ''));
        $db['settings']['razorpay']['key_id'] = $nk;
        $db['settings']['razorpay']['key_secret'] = $ns !== '' ? $ns : ($cur['key_secret'] ?? '');
        $db['settings']['razorpay']['mode'] = (string)($v['mode'] ?? ($cur['mode'] ?? 'test'));
      } else {
        $db['settings'][$k] = $v;
      }
    }
    db_save($DB_FILE, $db); jout(200, $db['settings']);
  }
  /* ── referral (v41) ── */
  if ($route === 'referral' && $method === 'GET') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $refs = array_values(array_filter($db['referrals'] ?? [], fn($r) => ($r['by'] ?? '') === $u['id']));
    jout(200, ['code' => $u['referralCode'] ?? null, 'earned' => (int)($u['referrals'] ?? 0), 'pointsAwarded' => array_sum(array_column($refs, 'points')), 'count' => count($refs)]);
  }
  /* ── custom pages (owner-managed) ── */
  if ($route === 'pages' && $method === 'GET') {
    $list = array_values(array_filter($db['pages'] ?? [], fn($x) => !empty($x['published'])));
    if (!empty($_GET['slug'])) { foreach ($list as $pg) if ($pg['slug'] === $_GET['slug']) jout(200, $pg); jout(200, ['error' => 'Not found']); }
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
