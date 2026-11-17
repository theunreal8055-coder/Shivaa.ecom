<?php
/**
 * SHIVAA JEWELS BILLING SOFTWARE (v46/v47) <-> SHIVAA.IN NATIVE BRIDGE
 *
 * Upload next to shivaa-connector.php on your billing website:
 *   public_html/shivaa-hooks.php
 *
 * Zero editing needed — never touches shivaa-connector.php or sj-config.php:
 *   1. INSTANT STAFF LOGIN CHECK (0.1 ms): verifies your billing software's
 *      encrypted sj_auth cookie directly against sj_tokens + sj_users (SQLite or
 *      MySQL), enforcing Owner / Manager / Staff / Viewer roles and blocked-device
 *      rules from Suraksha (sj-sec.php).
 *   2. REAL-TIME 24/7 AUTO-IMPORT INTO YOUR BILLING DATABASE: the exact second a
 *      customer signs up, submits a lead/appointment/B2B KYC, or places an online
 *      order on www.shivaa.in — even at 2 AM with zero phones open — this file
 *      encrypts the record with AES-256-GCM (sj-data/sj-key.php), advances
 *      sj_counter so every phone/PC receives it within 5 seconds, and appends a
 *      valid cryptographic link to sj_chain so Suraksha record-verification stays
 *      100% green:
 *        - on_shivaa_customer() -> Parties -> Customers (Retail / B2B, no duplicates)
 *        - on_shivaa_lead()     -> CRM -> Leads & Pipeline (stage: new, Website)
 *        - on_shivaa_order()    -> ecomOrders + buyer auto-added to Customers
 */
declare(strict_types=1);

/* Block direct browser access to this helper file. */
if (realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
  http_response_code(403);
  header('Content-Type: application/json; charset=utf-8');
  echo '{"ok":false,"error":"Forbidden"}';
  exit;
}

if (!defined('SJ')) define('SJ', 1);

/**
 * Load sj-config.php safely.
 *
 * @return array<string,mixed>|null
 */
function shivaa_sj_cfg(): ?array {
  static $cfg = false;
  if ($cfg !== false) return $cfg;
  $file = __DIR__ . '/sj-config.php';
  if (!is_file($file)) return $cfg = null;
  $loaded = @include $file;
  return $cfg = (is_array($loaded) ? $loaded : null);
}

/**
 * Open the billing software's SQLite or MySQL database (read/write, WAL/busy-safe).
 */
function shivaa_sj_pdo(): ?\PDO {
  static $pdo = false;
  if ($pdo !== false) return $pdo;
  if (!class_exists('PDO')) return $pdo = null;
  $cfg = shivaa_sj_cfg();
  if (!$cfg) return $pdo = null;

  $opt = [
    \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
    \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
  ];
  try {
    if (($cfg['driver'] ?? 'sqlite') === 'mysql') {
      $dbName = (string)($cfg['mysql_db'] ?? '');
      $dbUser = (string)($cfg['mysql_user'] ?? '');
      if ($dbName === '' || $dbUser === '') return $pdo = null;
      $host = (string)($cfg['mysql_host'] ?? 'localhost');
      $pass = (string)($cfg['mysql_pass'] ?? '');
      $p = new \PDO("mysql:host={$host};dbname={$dbName};charset=utf8mb4", $dbUser, $pass, $opt);
      $p->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES'");
      return $pdo = $p;
    }
    $sqFile = (string)($cfg['sqlite_file'] ?? '');
    if ($sqFile === '' || !is_file($sqFile)) return $pdo = null;
    $opt[\PDO::ATTR_TIMEOUT] = 20;
    $p = new \PDO('sqlite:' . $sqFile, null, null, $opt);
    $p->exec('PRAGMA busy_timeout = 20000');
    return $pdo = $p;
  } catch (\Throwable $e) {
    error_log('[shivaa-hooks] db: ' . $e->getMessage());
    return $pdo = null;
  }
}

/**
 * Load the existing 32-byte AES-256-GCM key from sj-data/sj-key.php.
 * Never creates or modifies sj-key.php.
 */
function shivaa_sj_key(): ?string {
  static $key = false;
  if ($key !== false) return $key;
  if (!function_exists('openssl_encrypt')) return $key = null;
  if (!in_array('aes-256-gcm', array_map('strtolower', openssl_get_cipher_methods()), true)) {
    return $key = null;
  }
  $f = __DIR__ . '/sj-data/sj-key.php';
  if (!is_file($f)) return $key = null;
  $v = @include $f;
  $raw = is_string($v) ? base64_decode($v, true) : false;
  if (!is_string($raw) || strlen($raw) !== 32) return $key = null;
  return $key = $raw;
}

/**
 * Encrypt/decrypt document payloads using the exact e1: AES-256-GCM format of sj-api.php.
 */
function shivaa_sj_enc(string $plain, string $col, string $id): ?string {
  $key = shivaa_sj_key();
  if ($key === null) return null;
  $iv = random_bytes(12);
  $tag = '';
  $ct = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, $col . "\0" . $id, 16);
  if ($ct === false || strlen($tag) !== 16) return null;
  return 'e1:' . base64_encode($iv . $tag . $ct);
}

function shivaa_sj_dec(?string $stored, string $col, string $id): ?string {
  if ($stored === null || $stored === '') return null;
  if (strncmp($stored, 'e1:', 3) !== 0) return $stored;
  $key = shivaa_sj_key();
  if ($key === null) return null;
  $b = base64_decode(substr($stored, 3), true);
  if (!is_string($b) || strlen($b) < 28) return null;
  $p = openssl_decrypt(substr($b, 28), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, substr($b, 0, 12), substr($b, 12, 16), $col . "\0" . $id);
  return is_string($p) ? $p : null;
}

/**
 * Atomically write one or more encrypted docs into sj_docs, increment sj_counter
 * (triggering 5-second live sync on all devices), and append a valid sj_chain link.
 *
 * @param array<int,array{0:string,1:string,2:array<string,mixed>}> $rows
 */
function shivaa_sj_put_docs(array $rows, string $uid = 'shivaa.in'): bool {
  if (!$rows) return true;
  $db = shivaa_sj_pdo();
  $key = shivaa_sj_key();
  if (!$db || $key === null) return false;

  $cfg = shivaa_sj_cfg() ?: [];
  $isMysql = ($cfg['driver'] ?? 'sqlite') === 'mysql';
  $nowMs = (int)round(microtime(true) * 1000);

  $inTx = false;
  try {
    if ($isMysql) {
      $db->beginTransaction();
    } else {
      $db->exec('BEGIN IMMEDIATE');
    }
    $inTx = true;

    $db->prepare('UPDATE sj_counter SET v = v + ? WHERE id = 1')->execute([count($rows)]);
    $seq = (int)$db->query('SELECT v FROM sj_counter WHERE id = 1')->fetchColumn() - count($rows);
    $rep = $db->prepare('REPLACE INTO sj_docs (col, id, data, seq, deleted, updated, uby) VALUES (?, ?, ?, ?, 0, ?, ?)');

    $chainOps = [];
    foreach ($rows as $r) {
      [$col, $id, $doc] = $r;
      $plain = json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      if (!is_string($plain)) continue;
      $enc = shivaa_sj_enc($plain, $col, $id);
      if ($enc === null) throw new \RuntimeException('AES-256-GCM encryption failed');
      $seq++;
      $rep->execute([$col, $id, $enc, $seq, $nowMs, $uid]);
      $rootCol = explode('/', $col)[0];
      if ($rootCol !== 'summary' && $rootCol !== 'tagState') {
        $chainOps[] = [$col, $id, substr(hash('sha256', $plain), 0, 32)];
      }
    }

    /* Maintain Suraksha tamper-proof hash chain (exact formula of sj_chain_hash). */
    if ($chainOps) {
      $prevSql = $isMysql
        ? 'SELECT h FROM sj_chain ORDER BY n DESC LIMIT 1 FOR UPDATE'
        : 'SELECT h FROM sj_chain ORDER BY n DESC LIMIT 1';
      $prevRow = $db->query($prevSql)->fetchColumn();
      if ($prevRow !== false) {
        $prev = (string)$prevRow;
        $opsJson = (string)json_encode(['k' => 'ecom', 'o' => $chainOps], JSON_UNESCAPED_SLASHES);
        $chainHash = hash_hmac('sha256', $prev . '|' . $nowMs . '|' . $opsJson, $key . '|chain');
        $db->prepare('INSERT INTO sj_chain (at, uid, ops, h) VALUES (?, ?, ?, ?)')
           ->execute([$nowMs, $uid, $opsJson, $chainHash]);
      }
    }

    if ($isMysql) {
      $db->commit();
    } else {
      $db->exec('COMMIT');
    }
    return true;
  } catch (\Throwable $e) {
    if ($inTx) {
      try { $isMysql ? $db->rollBack() : $db->exec('ROLLBACK'); } catch (\Throwable $e2) {}
    }
    error_log('[shivaa-hooks] put_docs: ' . $e->getMessage());
    return false;
  }
}

/**
 * Normalize an Indian 10-digit mobile number.
 */
function shivaa_sj_phone(string $raw): string {
  $d = (string)preg_replace('/\D+/', '', $raw);
  $p = strlen($d) >= 10 ? substr($d, -10) : '';
  return preg_match('/^[6-9]\d{9}$/', $p) ? $p : '';
}

function shivaa_sj_clean_id(string $raw): string {
  $s = (string)preg_replace('/[^A-Za-z0-9_\-]/', '_', $raw);
  return substr(trim($s, '_'), 0, 60) ?: substr(md5($raw), 0, 16);
}

/**
 * Load a single document from sj_docs if present and not deleted.
 *
 * @return array<string,mixed>|null
 */
function shivaa_sj_get_doc(string $col, string $id): ?array {
  $db = shivaa_sj_pdo();
  if (!$db) return null;
  try {
    $st = $db->prepare('SELECT data, deleted FROM sj_docs WHERE col = ? AND id = ?');
    $st->execute([$col, $id]);
    $r = $st->fetch();
    if (!$r || (int)$r['deleted'] === 1 || $r['data'] === null) return null;
    $plain = shivaa_sj_dec((string)$r['data'], $col, $id);
    $arr = is_string($plain) ? json_decode($plain, true) : null;
    return is_array($arr) ? $arr : null;
  } catch (\Throwable $e) {
    return null;
  }
}

/**
 * Find an existing customer in sj_docs by deterministic id, ecomId, or 10-digit phone.
 *
 * @return array<string,mixed>|null
 */
function shivaa_sj_find_customer(string $detId, string $ecomId, string $phone): ?array {
  $byId = shivaa_sj_get_doc('customers', $detId);
  if ($byId) return $byId;
  $db = shivaa_sj_pdo();
  if (!$db || ($ecomId === '' && $phone === '')) return null;
  try {
    $st = $db->prepare('SELECT id, data FROM sj_docs WHERE col = ? AND deleted = 0 AND data IS NOT NULL');
    $st->execute(['customers']);
    while ($r = $st->fetch()) {
      $plain = shivaa_sj_dec((string)$r['data'], 'customers', (string)$r['id']);
      if ($plain === null) continue;
      if ($phone !== '' && strpos($plain, substr($phone, -6)) === false && ($ecomId === '' || strpos($plain, $ecomId) === false)) {
        continue;
      }
      $c = json_decode($plain, true);
      if (!is_array($c)) continue;
      $c['id'] = (string)$r['id'];
      if ($ecomId !== '' && (string)($c['ecomId'] ?? '') === $ecomId) return $c;
      if ($phone !== '') {
        if (shivaa_sj_phone((string)($c['phone'] ?? '')) === $phone) return $c;
        foreach ((array)($c['phones'] ?? []) as $q) {
          if (shivaa_sj_phone((string)$q) === $phone) return $c;
        }
      }
    }
  } catch (\Throwable $e) {
    error_log('[shivaa-hooks] find_customer: ' . $e->getMessage());
  }
  return null;
}

/* ═══════════ 1. REAL-TIME WEBHOOK HOOKS (SHIVAA.IN -> BILLING DB) ═══════════ */

/**
 * Automatically save every new/updated shivaa.in customer straight into Parties -> Customers.
 */
function on_shivaa_customer(array $c, string $event): void {
  $phone = shivaa_sj_phone((string)($c['phone'] ?? ''));
  $ecomId = trim((string)($c['id'] ?? ''));
  if ($phone === '' && $ecomId === '') return;

  $firm = trim((string)($c['firm'] ?? ''));
  $person = trim((string)($c['contactPerson'] ?? $c['name'] ?? ''));
  $displayName = $firm !== '' ? $firm : ($person !== '' ? $person : ('Shivaa.in ' . $phone));
  $detId = 'ec_' . shivaa_sj_clean_id($ecomId !== '' ? $ecomId : $phone);

  $def = is_array($c['defaultAddress'] ?? null) ? $c['defaultAddress'] : [];
  $city = trim((string)($c['city'] ?? $def['city'] ?? ''));
  $state = trim((string)($c['state'] ?? $def['state'] ?? ''));
  $pin = substr((string)preg_replace('/\D+/', '', (string)($c['pincode'] ?? $def['pincode'] ?? '')), 0, 6);
  $line = trim((string)($c['address'] ?? $def['line'] ?? $def['address'] ?? ''));
  $addrParts = array_values(array_unique(array_filter([$line, $city, $state, $pin], fn($v) => $v !== '')));
  $addr = implode(', ', $addrParts);
  $email = trim((string)($c['email'] ?? ''));
  $gstin = strtoupper(trim((string)($c['gstin'] ?? '')));
  $pan = strtoupper(trim((string)($c['pan'] ?? '')));
  $dob = substr(trim((string)($c['dob'] ?? '')), 0, 10);
  $anniv = substr(trim((string)($c['anniversary'] ?? '')), 0, 10);
  $isB2B = (($c['role'] ?? '') === 'partner') || $firm !== '' || $gstin !== '';
  $nowMs = (int)round(microtime(true) * 1000);
  $createdTs = strtotime((string)($c['createdAt'] ?? ''));
  $createdMs = $createdTs ? ($createdTs * 1000) : $nowMs;

  $existing = shivaa_sj_find_customer($detId, $ecomId, $phone);
  if (!$existing) {
    $noteBits = array_filter([
      'Synced from www.shivaa.in',
      !empty($c['blackMember']) ? trim('Shivaa Black ' . (string)($c['blackCardNo'] ?? '')) : '',
    ]);
    $doc = [
      'id'          => $detId,
      'name'        => substr($displayName, 0, 120),
      'phone'       => $phone,
      'phones'      => $phone !== '' ? [$phone] : [],
      'contact'     => ($firm !== '' && $person !== '') ? substr($person, 0, 80) : '',
      'email'       => substr($email, 0, 120),
      'city'        => substr($city, 0, 60),
      'state'       => substr($state, 0, 60),
      'address'     => substr($addr, 0, 240),
      'pin'         => $pin,
      'gstin'       => substr($gstin, 0, 20),
      'pan'         => substr($pan, 0, 16),
      'dob'         => $dob,
      'anniv'       => $anniv,
      'notes'       => implode(' · ', $noteBits),
      'source'      => 'shivaa.in',
      'ptype'       => $isB2B ? 'B2B' : 'Retail',
      'creditLimit' => $isB2B ? 500000 : 0,
      'creditDays'  => 0,
      'margins'     => [],
      'wastage'     => [],
      'ecomId'      => $ecomId !== '' ? $ecomId : $detId,
      'createdAt'   => $createdMs,
      'updatedAt'   => $nowMs,
    ];
    shivaa_sj_put_docs([['customers', $detId, $doc]], 'shivaa.in');
    return;
  }

  /* Enrich blank fields only — never overwrite details entered by showroom staff. */
  $changed = false;
  $fill = [
    'ecomId'  => $ecomId,
    'email'   => substr($email, 0, 120),
    'city'    => substr($city, 0, 60),
    'state'   => substr($state, 0, 60),
    'address' => substr($addr, 0, 240),
    'pin'     => $pin,
    'gstin'   => substr($gstin, 0, 20),
    'pan'     => substr($pan, 0, 16),
    'dob'     => $dob,
    'anniv'   => $anniv,
  ];
  foreach ($fill as $k => $val) {
    if ($val !== '' && trim((string)($existing[$k] ?? '')) === '') {
      $existing[$k] = $val;
      $changed = true;
    }
  }
  if ($changed) {
    $existing['updatedAt'] = $nowMs;
    shivaa_sj_put_docs([['customers', (string)$existing['id'], $existing]], 'shivaa.in');
  }
}

/**
 * Automatically save every new shivaa.in lead/enquiry straight into CRM -> Leads.
 */
function on_shivaa_lead(array $l, string $event): void {
  $leadId = trim((string)($l['leadId'] ?? ''));
  if ($leadId === '') return;
  $detId = 'ecl_' . shivaa_sj_clean_id($leadId);
  if (shivaa_sj_get_doc('leads', $detId) !== null) return; // already imported

  $channel = trim((string)($l['channel'] ?? 'website'));
  $phone = shivaa_sj_phone((string)($l['phone'] ?? ''));
  $email = trim((string)($l['email'] ?? ''));
  $meta = is_array($l['meta'] ?? null) ? $l['meta'] : [];
  $firm = trim((string)($meta['firm'] ?? ''));
  $name = trim((string)($l['name'] ?? ''));
  if ($name === '') {
    $name = $firm !== '' ? $firm : ($phone !== '' ? 'Website Lead ' . $phone : ($email !== '' ? $email : 'shivaa.in Enquiry'));
  }
  $isB2B = in_array($channel, ['partner_application', 'metal_exchange'], true) || $firm !== '' || !empty($l['gstin']);
  $summary = trim((string)($l['summary'] ?? ''));
  $message = trim((string)($l['message'] ?? ''));
  $budget = trim((string)($l['budget'] ?? ''));
  $amount = (float)($l['amount'] ?? 0);
  $nowMs = (int)round(microtime(true) * 1000);
  $createdTs = strtotime((string)($l['createdAt'] ?? ''));
  $createdMs = $createdTs ? ($createdTs * 1000) : $nowMs;
  $createdYmd = date('Y-m-d', (int)($createdMs / 1000));
  $nextYmd = date('Y-m-d', strtotime('+1 day'));

  $noteParts = array_filter([
    $summary,
    ($message !== '' && stripos($summary, $message) === false) ? $message : '',
    $budget !== '' ? ('Budget: ' . $budget) : '',
    $email !== '' ? ('Email: ' . $email) : '',
  ]);
  $shortTag = strtoupper(substr(md5($leadId), 0, 5));

  $doc = [
    'id'         => $detId,
    'no'         => 'LD-W' . $shortTag,
    'name'       => substr($name, 0, 120),
    'firm'       => substr($firm, 0, 120),
    'phone'      => $phone,
    'whatsapp'   => $phone,
    'email'      => substr($email, 0, 120),
    'city'       => substr(trim((string)($l['city'] ?? '')), 0, 60),
    'address'    => substr(trim((string)($meta['address'] ?? '')), 0, 200),
    'gstin'      => substr(strtoupper(trim((string)($l['gstin'] ?? ''))), 0, 20),
    'ptype'      => $isB2B ? 'B2B' : 'Retail',
    'stage'      => 'new',
    'source'     => 'Website',
    'value'      => $amount > 0 ? round($amount, 2) : '',
    'nextDate'   => $nextYmd,
    'nextAction' => 'Call',
    'notes'      => substr(implode(' · ', $noteParts), 0, 700),
    'activities' => [[
      'id'   => 'la_' . strtolower($shortTag),
      'type' => 'note',
      'date' => $createdYmd,
      'note' => substr('[shivaa.in · ' . str_replace('_', ' ', $channel) . '] ' . ($summary ?: $message ?: 'New website enquiry'), 0, 300),
      'by'   => 'shivaa.in',
    ]],
    'ecomLeadId'  => $leadId,
    'ecomChannel' => $channel,
    'createdAt'   => $createdMs,
    'updatedAt'   => $nowMs,
  ];
  shivaa_sj_put_docs([['leads', $detId, $doc]], 'shivaa.in');
}

/**
 * Automatically save every shivaa.in online order + ensure the buyer is in Customers.
 */
function on_shivaa_order(array $o, string $event): void {
  $ordId = trim((string)($o['id'] ?? ''));
  if ($ordId === '') return;
  $detId = 'eco_' . shivaa_sj_clean_id($ordId);
  $nowMs = (int)round(microtime(true) * 1000);
  $createdTs = strtotime((string)($o['createdAt'] ?? ''));
  $prev = shivaa_sj_get_doc('ecomOrders', $detId);

  $doc = array_merge($prev ?: [], $o, [
    'id'        => $detId,
    'orderId'   => $ordId,
    'lastEvent' => $event,
    'createdAt' => $prev['createdAt'] ?? ($createdTs ? $createdTs * 1000 : $nowMs),
    'updatedAt' => $nowMs,
  ]);
  shivaa_sj_put_docs([['ecomOrders', $detId, $doc]], 'shivaa.in');

  $phone = shivaa_sj_phone((string)($o['phone'] ?? ''));
  if ($phone !== '') {
    $ship = is_array($o['shippingAddress'] ?? null) ? $o['shippingAddress'] : [];
    on_shivaa_customer([
      'id'        => (string)($o['userId'] ?: ('ord_' . $phone)),
      'name'      => (string)($o['customerName'] ?? $ship['name'] ?? ''),
      'phone'     => $phone,
      'email'     => (string)($o['email'] ?? ''),
      'address'   => (string)($ship['line'] ?? $ship['address'] ?? ''),
      'city'      => (string)($ship['city'] ?? ''),
      'state'     => (string)($ship['state'] ?? ''),
      'pincode'   => (string)($ship['pincode'] ?? ''),
      'role'      => (($o['channel'] ?? '') === 'b2b') ? 'partner' : 'customer',
      'createdAt' => (string)($o['createdAt'] ?? ''),
    ], 'customer.from_order');
  }
}

/* ═══════════ 2. INSTANT STAFF AUTH FOR ?action=... (sj-ecom.js) ══════════════ */

/**
 * Verify the browser's sj_auth cookie directly against sj_tokens + sj_users.
 *
 * @return array<string,string>|null
 */
function shivaa_sj_current_user(): ?array {
  $tok = isset($_COOKIE['sj_auth']) && is_string($_COOKIE['sj_auth']) ? $_COOKIE['sj_auth'] : '';
  if (!preg_match('/^[a-f0-9]{64}$/', $tok)) return null;

  $db = shivaa_sj_pdo();
  if (!$db) return null;

  try {
    $st = $db->prepare(
      'SELECT t.expires, t.dev, u.id, u.uname, u.name, u.role, u.active, u.pass '
      . 'FROM sj_tokens t JOIN sj_users u ON u.id = t.uid WHERE t.h = ?'
    );
    $st->execute([hash('sha256', $tok)]);
    $r = $st->fetch();
    if (!$r) return null;
    $role = (string)($r['role'] ?? '');
    if ((int)$r['expires'] < time() || !(int)$r['active'] || $r['pass'] === null) return null;
    if (!in_array($role, ['owner', 'manager', 'staff', 'viewer'], true)) return null;

    /* Respect Suraksha blocked-device policy for non-owner users. */
    if ($role !== 'owner' && !empty($r['dev'])) {
      $ms = $db->prepare('SELECT v FROM sj_meta WHERE k = ?');
      $ms->execute(['devices']);
      $dv = json_decode((string)$ms->fetchColumn(), true);
      if (is_array($dv) && (($dv[$r['dev']]['st'] ?? '') === 'blocked')) return null;
    }

    return [
      'id'    => (string)$r['id'],
      'uname' => (string)$r['uname'],
      'name'  => (string)$r['name'],
      'role'  => $role,
    ];
  } catch (\Throwable $e) {
    error_log('[shivaa-hooks] auth: ' . $e->getMessage());
    return null;
  }
}

(static function (): void {
  $action = trim((string)($_GET['action'] ?? ''));
  if ($action === '') return;

  $user = shivaa_sj_current_user();
  if (!$user) return;

  $writeActions = ['push_bill', 'void_bill', 'push_stock', 'catchup'];
  if ($user['role'] === 'viewer' && in_array($action, $writeActions, true)) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode(['ok' => false, 'error' => 'View-only login cannot push or void bills on shivaa.in.']);
    exit;
  }

  /* Pass authenticated user into shivaa-connector.php via an isolated cookie-free
     single-request session (never sends Set-Cookie and never touches sj_auth). */
  if (session_status() === PHP_SESSION_NONE) {
    @session_name('SJ_SHIVAA_REQ');
    @session_start([
      'use_cookies'      => 0,
      'use_only_cookies' => 0,
      'use_trans_sid'    => 0,
      'use_strict_mode'  => 0,
      'cache_limiter'    => '',
    ]);
    if (session_status() === PHP_SESSION_ACTIVE) {
      $_SESSION['billing_user'] = $user;
      register_shutdown_function(static function (): void {
        if (session_status() === PHP_SESSION_ACTIVE) {
          $_SESSION = [];
          @session_destroy();
        }
      });
    }
  } else {
    $_SESSION['billing_user'] = $user;
  }
})();
