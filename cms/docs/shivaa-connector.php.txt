<?php
/**
 * SHIVAA <-> BILLING SOFTWARE TWO-WAY CONNECTOR (v253 "Bridge")
 *
 * Upload this single file to your live Hostinger billing website root:
 *   public_html/shivaa-connector.php
 *
 * What it does automatically:
 *   1. RECEIVES live customers, leads & online orders from shivaa.in (HMAC-SHA256 verified)
 *      and saves them into your MySQL database OR private JSON store (+ calls shivaa-hooks.php
 *      if present, so rows land directly inside your billing software's own tables).
 *   2. PUSHES any customer bill PDF straight to their shivaa.in profile (#/my-bills), matched
 *      automatically by their 10-digit mobile number (works from PHP OR from browser JS!).
 *   3. SYNCS showroom stock deltas, pulls live 24K/22K/18K gold & silver rates, and catches up
 *      any missed events automatically.
 *
 * SECURITY: Keep SHIVAA_SYNC_SECRET in PHP only — never expose it in HTML or JavaScript.
 */
declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');
@ini_set('display_errors', '0');
@ini_set('log_errors', '1');
header_remove('X-Powered-By');

/* ═══════════════════════ 1. CONFIGURATION (EDIT THESE) ═══════════════════════ */
if (!defined('SHIVAA_SHOP_URL'))    define('SHIVAA_SHOP_URL',    'https://www.shivaa.in');
if (!defined('SHIVAA_SYNC_SECRET')) define('SHIVAA_SYNC_SECRET', 'PASTE_YOUR_SYNC_KEY_HERE');

/* Optional: fill these 4 lines to store synced customers/leads/orders in your
   billing website's MySQL database (leave DB_NAME blank to use safe JSON files). */
if (!defined('SHIVAA_BILLING_DB_HOST')) define('SHIVAA_BILLING_DB_HOST', 'localhost');
if (!defined('SHIVAA_BILLING_DB_NAME')) define('SHIVAA_BILLING_DB_NAME', '');
if (!defined('SHIVAA_BILLING_DB_USER')) define('SHIVAA_BILLING_DB_USER', '');
if (!defined('SHIVAA_BILLING_DB_PASS')) define('SHIVAA_BILLING_DB_PASS', '');

/* Optional: if your billing frontend JS calls ?action=push_bill and does NOT use
   PHP $_SESSION login, set a staff token here and pass header X-Billing-Token.
   Session keys checked automatically: user_id, user, admin, admin_id, staff_id, logged_in. */
if (!defined('SHIVAA_BILLING_STAFF_TOKEN')) define('SHIVAA_BILLING_STAFF_TOKEN', '');

/* Optional: create shivaa-hooks.php next to this file to map incoming customers,
   leads & orders directly into your existing billing tables. Functions called if defined:
     on_shivaa_customer(array $customer, string $event): void
     on_shivaa_lead(array $lead, string $event): void
     on_shivaa_order(array $order, string $event): void
*/
if (is_file(__DIR__ . '/shivaa-hooks.php')) {
  require_once __DIR__ . '/shivaa-hooks.php';
}

/* ═══════════════════════ 2. OUTBOUND CLIENT (BILLING -> SHIVAA) ═══════════════ */

function shivaa_connector_configured(): bool {
  $s = trim((string)SHIVAA_SYNC_SECRET);
  return strlen($s) >= 16 && $s !== 'PASTE_YOUR_SYNC_KEY_HERE';
}

/**
 * Low-level signed request to shivaa.in/api/<route>.
 */
function shivaa_api_call(string $method, string $route, ?array $body = null, int $timeout = 20): array {
  if (!shivaa_connector_configured()) {
    return ['ok' => false, 'httpCode' => 0, 'error' => 'Set SHIVAA_SYNC_SECRET in shivaa-connector.php first.'];
  }
  if (!function_exists('curl_init')) {
    return ['ok' => false, 'httpCode' => 0, 'error' => 'PHP cURL extension is required on Hostinger.'];
  }
  $method = strtoupper(trim($method));
  $cleanRoute = ltrim($route, '/');
  $qPos = strpos($cleanRoute, '?');
  $signRoute = $qPos === false ? $cleanRoute : substr($cleanRoute, 0, $qPos);
  $raw = ($body !== null && $method !== 'GET')
    ? (string)json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    : '';
  $ts = (string)time();
  $sig = hash_hmac('sha256', $ts . "\n" . $method . "\n" . $signRoute . "\n" . $raw, (string)SHIVAA_SYNC_SECRET);
  $url = rtrim((string)SHIVAA_SHOP_URL, '/') . '/api/' . $cleanRoute;

  $headers = [
    'Accept: application/json',
    'X-Shivaa-Ts: ' . $ts,
    'X-Shivaa-Signature: ' . $sig,
    'User-Agent: ShivaaBillingConnector/253',
  ];
  if ($raw !== '') $headers[] = 'Content-Type: application/json; charset=utf-8';

  $ch = curl_init($url);
  $opts = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => max(5, $timeout),
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_FOLLOWLOCATION => false,
  ];
  if (defined('CURLPROTO_HTTPS')) $opts[CURLOPT_PROTOCOLS] = CURLPROTO_HTTPS;
  if ($raw !== '') $opts[CURLOPT_POSTFIELDS] = $raw;
  curl_setopt_array($ch, $opts);
  $resp = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $rurl = (string)curl_getinfo($ch, CURLINFO_REDIRECT_URL);
  $err  = curl_error($ch);
  curl_close($ch);

  if ($code >= 300 && $code < 400) {
    return ['ok' => false, 'httpCode' => $code,
      'error' => 'SHIVAA_SHOP_URL redirected (HTTP ' . $code . ')' . ($rurl !== '' ? ' to ' . $rurl : '') . ' — set SHIVAA_SHOP_URL to your final canonical https:// domain.'];
  }

  if (!is_string($resp)) {
    return ['ok' => false, 'httpCode' => $code, 'error' => $err !== '' ? $err : 'Connection failed'];
  }
  $json = json_decode($resp, true);
  if (!is_array($json)) {
    return ['ok' => false, 'httpCode' => $code, 'error' => 'Non-JSON response (HTTP ' . $code . ')'];
  }
  $json['httpCode'] = $code;
  if (!isset($json['ok'])) $json['ok'] = ($code >= 200 && $code < 300 && empty($json['error']));
  return $json;
}

/**
 * Push a customer's bill PDF automatically to their profile on shivaa.in (#/my-bills).
 *
 * Example:
 *   shivaa_push_bill_pdf([
 *     'billNo'       => 'INV-2026-0108',
 *     'externalId'   => 'bill_108',              // optional stable ID (updates cleanly on re-save)
 *     'customerName' => 'Priya Sharma',
 *     'phone'        => '9876543210',            // links automatically to customer's Shivaa profile
 *     'email'        => 'priya@example.com',     // optional
 *     'billDate'     => '2026-11-16',            // YYYY-MM-DD (defaults to today)
 *     'store'        => 'Shivaa Jewels · Jaipur',
 *     'amount'       => 148500.00,
 *     'items'        => '22K Gold Necklace · 18.42g, Studs · 3.10g', // string OR array of {sku,name,qty,weightG,purity,amount}
 *     'pdfPath'      => '/path/to/INV-108.pdf',  // OR 'pdfBytes' => $rawPdf, OR 'pdfBase64' => $b64
 *     'filename'     => 'INV-2026-0108.pdf',
 *     'adjustStock'  => true,                    // optional: deduct SKU stock if items carries sku+qty
 *     'notes'        => 'Paid via UPI',          // optional private owner note (hidden from customer)
 *   ]);
 */
function shivaa_push_bill_pdf(array $bill): array {
  $files = [];
  if (!empty($bill['files']) && is_array($bill['files'])) {
    foreach ($bill['files'] as $f) {
      if (!is_array($f)) continue;
      if (!empty($f['path']) && is_file((string)$f['path'])) {
        $bytes = @file_get_contents((string)$f['path']);
        if (is_string($bytes) && $bytes !== '') {
          $files[] = ['base64' => base64_encode($bytes), 'filename' => (string)($f['filename'] ?? basename((string)$f['path']))];
        }
      } elseif (!empty($f['bytes']) && is_string($f['bytes'])) {
        $files[] = ['base64' => base64_encode($f['bytes']), 'filename' => (string)($f['filename'] ?? 'bill.pdf')];
      } elseif (!empty($f['base64']) && is_string($f['base64'])) {
        $files[] = ['base64' => $f['base64'], 'filename' => (string)($f['filename'] ?? 'bill.pdf')];
      }
    }
  } elseif (!empty($bill['pdfPath']) && is_file((string)$bill['pdfPath'])) {
    $bytes = @file_get_contents((string)$bill['pdfPath']);
    if (!is_string($bytes) || $bytes === '') return ['ok' => false, 'error' => 'Could not read pdfPath'];
    $files[] = ['base64' => base64_encode($bytes), 'filename' => (string)($bill['filename'] ?? basename((string)$bill['pdfPath']))];
  } elseif (!empty($bill['pdfBytes']) && is_string($bill['pdfBytes'])) {
    $files[] = ['base64' => base64_encode($bill['pdfBytes']), 'filename' => (string)($bill['filename'] ?? (($bill['billNo'] ?? 'bill') . '.pdf'))];
  } elseif (!empty($bill['pdfBase64']) && is_string($bill['pdfBase64'])) {
    $files[] = ['base64' => $bill['pdfBase64'], 'filename' => (string)($bill['filename'] ?? (($bill['billNo'] ?? 'bill') . '.pdf'))];
  }
  if (!$files) {
    return ['ok' => false, 'error' => 'Provide pdfPath, pdfBytes, pdfBase64, or files[].'];
  }
  $payload = [
    'externalId'   => (string)($bill['externalId'] ?? $bill['billNo'] ?? ''),
    'billNo'       => (string)($bill['billNo'] ?? ''),
    'billDate'     => (string)($bill['billDate'] ?? date('Y-m-d')),
    'store'        => (string)($bill['store'] ?? 'Shivaa Jewels · Jaipur'),
    'customerName' => (string)($bill['customerName'] ?? ''),
    'phone'        => (string)($bill['phone'] ?? ''),
    'email'        => (string)($bill['email'] ?? ''),
    'amount'       => (float)($bill['amount'] ?? 0),
    'items'        => $bill['items'] ?? '',
    'notes'        => (string)($bill['notes'] ?? ''),
    'replace'      => array_key_exists('replace', $bill) ? (bool)$bill['replace'] : true,
    'adjustStock'  => !empty($bill['adjustStock']),
    'files'        => $files,
  ];
  return shivaa_api_call('POST', 'billing/bills', $payload, 30);
}

/** Remove/void a cancelled bill from the customer's Shivaa profile. */
function shivaa_void_bill(string $externalId, string $reason = ''): array {
  return shivaa_api_call('POST', 'billing/bill-void', ['externalId' => $externalId, 'reason' => $reason]);
}

/** Adjust a single SKU's stock on shivaa.in (negative = sold, positive = returned/added). */
function shivaa_push_stock(string $movementId, string $sku, int $delta, string $ref = '', string $note = ''): array {
  return shivaa_api_call('POST', 'billing/stock-movement', [
    'movementId' => $movementId, 'sku' => $sku, 'delta' => $delta, 'ref' => $ref, 'note' => $note,
  ]);
}

/** Adjust multiple SKUs from one bill atomically (idempotent per movementId). */
function shivaa_push_stock_batch(array $movements): array {
  return shivaa_api_call('POST', 'billing/stock-movement', ['movements' => array_values($movements)]);
}

/** Fetch live 24K, 22K, 18K gold & silver rates + making charges from shivaa.in. */
function shivaa_get_rates(): array {
  return shivaa_api_call('GET', 'billing/rates');
}

/** Fetch website catalogue & SKU stock snapshot. */
function shivaa_get_stock(string $sku = '', int $limit = 500, int $offset = 0): array {
  $q = http_build_query(array_filter(['sku' => $sku, 'limit' => $limit, 'offset' => $offset], fn($v) => $v !== ''));
  return shivaa_api_call('GET', 'billing/stock' . ($q !== '' ? '?' . $q : ''));
}

/** Pull website customers directly (optional since = ISO timestamp, q = phone/name). */
function shivaa_get_customers(string $since = '', string $q = '', int $limit = 200, int $offset = 0): array {
  $qs = http_build_query(array_filter(['since' => $since, 'q' => $q, 'limit' => $limit, 'offset' => $offset], fn($v) => $v !== ''));
  return shivaa_api_call('GET', 'billing/customers' . ($qs !== '' ? '?' . $qs : ''));
}

/** Pull website leads directly (contact, custom_order, service_request, partner_application, etc.). */
function shivaa_get_leads(string $since = '', string $channel = '', int $limit = 200, int $offset = 0): array {
  $qs = http_build_query(array_filter(['since' => $since, 'channel' => $channel, 'limit' => $limit, 'offset' => $offset], fn($v) => $v !== ''));
  return shivaa_api_call('GET', 'billing/leads' . ($qs !== '' ? '?' . $qs : ''));
}

/** Pull website e-commerce orders (with GST invoice numbers when Paid). */
function shivaa_get_orders(string $since = '', string $status = '', int $limit = 200, int $offset = 0): array {
  $qs = http_build_query(array_filter(['since' => $since, 'status' => $status, 'limit' => $limit, 'offset' => $offset], fn($v) => $v !== ''));
  return shivaa_api_call('GET', 'billing/orders' . ($qs !== '' ? '?' . $qs : ''));
}

/** Verify two-way connectivity with shivaa.in. */
function shivaa_ping(): array {
  return shivaa_api_call('GET', 'billing/ping');
}

/* ═══════════════════════ 3. LOCAL STORAGE (MYSQL OR SAFE JSON) ═══════════════ */

function shivaa_sync_pdo(): ?PDO {
  static $tried = false;
  static $pdo = null;
  if ($tried) return $pdo;
  $tried = true;
  if (trim((string)SHIVAA_BILLING_DB_NAME) === '') return null;
  try {
    $dsn = 'mysql:host=' . SHIVAA_BILLING_DB_HOST . ';dbname=' . SHIVAA_BILLING_DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, (string)SHIVAA_BILLING_DB_USER, (string)SHIVAA_BILLING_DB_PASS, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec("CREATE TABLE IF NOT EXISTS shivaa_synced_customers (
      customer_id VARCHAR(64) PRIMARY KEY,
      phone VARCHAR(20) NOT NULL DEFAULT '',
      name VARCHAR(160) NOT NULL DEFAULT '',
      email VARCHAR(190) NOT NULL DEFAULT '',
      role VARCHAR(32) NOT NULL DEFAULT 'customer',
      city VARCHAR(80) NOT NULL DEFAULT '',
      state VARCHAR(80) NOT NULL DEFAULT '',
      pincode VARCHAR(16) NOT NULL DEFAULT '',
      address VARCHAR(320) NOT NULL DEFAULT '',
      gstin VARCHAR(24) NOT NULL DEFAULT '',
      black_member TINYINT(1) NOT NULL DEFAULT 0,
      payload_json LONGTEXT NOT NULL,
      synced_at DATETIME NOT NULL,
      INDEX idx_phone (phone),
      INDEX idx_synced (synced_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS shivaa_synced_leads (
      lead_id VARCHAR(80) PRIMARY KEY,
      channel VARCHAR(40) NOT NULL DEFAULT '',
      name VARCHAR(160) NOT NULL DEFAULT '',
      phone VARCHAR(20) NOT NULL DEFAULT '',
      email VARCHAR(190) NOT NULL DEFAULT '',
      city VARCHAR(80) NOT NULL DEFAULT '',
      gstin VARCHAR(24) NOT NULL DEFAULT '',
      summary VARCHAR(500) NOT NULL DEFAULT '',
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      created_at VARCHAR(40) NOT NULL DEFAULT '',
      payload_json LONGTEXT NOT NULL,
      synced_at DATETIME NOT NULL,
      INDEX idx_phone (phone),
      INDEX idx_channel (channel),
      INDEX idx_synced (synced_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS shivaa_synced_orders (
      order_id VARCHAR(64) PRIMARY KEY,
      invoice_no VARCHAR(64) NOT NULL DEFAULT '',
      customer_name VARCHAR(160) NOT NULL DEFAULT '',
      phone VARCHAR(20) NOT NULL DEFAULT '',
      status VARCHAR(40) NOT NULL DEFAULT '',
      payment_status VARCHAR(40) NOT NULL DEFAULT '',
      total DECIMAL(14,2) NOT NULL DEFAULT 0,
      created_at VARCHAR(40) NOT NULL DEFAULT '',
      payload_json LONGTEXT NOT NULL,
      synced_at DATETIME NOT NULL,
      INDEX idx_phone (phone),
      INDEX idx_synced (synced_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS shivaa_sync_state (
      k VARCHAR(64) PRIMARY KEY,
      v TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    return $pdo;
  } catch (Throwable $e) {
    error_log('shivaa-connector MySQL error: ' . $e->getMessage());
    $pdo = null;
    return null;
  }
}

function shivaa_sync_dir(): string {
  $parent = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.shivaa-billing-sync';
  if (is_dir($parent) || @mkdir($parent, 0700, true)) {
    @chmod($parent, 0700);
    if (is_writable($parent)) return $parent;
  }
  $local = __DIR__ . DIRECTORY_SEPARATOR . '.shivaa-billing-sync';
  if (!is_dir($local)) @mkdir($local, 0700, true);
  $ht = $local . DIRECTORY_SEPARATOR . '.htaccess';
  if (!is_file($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");
  $idx = $local . DIRECTORY_SEPARATOR . 'index.php';
  if (!is_file($idx)) @file_put_contents($idx, "<?php http_response_code(403); exit;\n");
  return $local;
}

function shivaa_json_upsert(string $bucket, string $id, array $row, int $cap = 10000): void {
  $file = shivaa_sync_dir() . DIRECTORY_SEPARATOR . $bucket . '.json';
  $lock = @fopen($file . '.lock', 'c');
  if ($lock) @flock($lock, LOCK_EX);
  $raw = is_file($file) ? (string)@file_get_contents($file) : '{}';
  $map = json_decode($raw, true);
  if (!is_array($map)) $map = [];
  $row['_syncedAt'] = date('c');
  $map[$id] = $row;
  if (count($map) > $cap) $map = array_slice($map, -$cap, null, true);
  $tmp = $file . '.tmp.' . bin2hex(random_bytes(4));
  @file_put_contents($tmp, json_encode($map, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
  @chmod($tmp, 0600);
  @rename($tmp, $file);
  if ($lock) { @flock($lock, LOCK_UN); @fclose($lock); }
}

function shivaa_json_list(string $bucket, int $limit = 500): array {
  $file = shivaa_sync_dir() . DIRECTORY_SEPARATOR . $bucket . '.json';
  if (!is_file($file)) return [];
  $map = json_decode((string)@file_get_contents($file), true);
  if (!is_array($map)) return [];
  return array_slice(array_reverse(array_values($map)), 0, max(1, min(5000, $limit)));
}

function shivaa_ingest_event(string $event, array $data, string $deliveryId = ''): array {
  $pdo = shivaa_sync_pdo();
  $now = date('Y-m-d H:i:s');
  $json = (string)json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

  if ($event === 'billing.ping') {
    return ['ok' => true, 'pong' => true, 'connector' => 'shivaa-connector/253',
      'storage' => $pdo ? 'mysql' : 'json', 'hooks' => [
        'customer' => function_exists('on_shivaa_customer'),
        'lead'     => function_exists('on_shivaa_lead'),
        'order'    => function_exists('on_shivaa_order'),
      ], 'receivedAt' => date('c')];
  }

  /* Replay / retry guard so custom INSERT hooks in shivaa-hooks.php never run twice. */
  if ($deliveryId !== '') {
    $seenFile = shivaa_sync_dir() . DIRECTORY_SEPARATOR . 'seen_deliveries.json';
    $slock = @fopen($seenFile . '.lock', 'c');
    if ($slock) @flock($slock, LOCK_EX);
    $seen = is_file($seenFile) ? (json_decode((string)@file_get_contents($seenFile), true) ?: []) : [];
    if (isset($seen[$deliveryId])) {
      if ($slock) { @flock($slock, LOCK_UN); @fclose($slock); }
      return ['ok' => true, 'duplicate' => true, 'deliveryId' => $deliveryId, 'storage' => $pdo ? 'mysql' : 'json'];
    }
    $seen[$deliveryId] = time();
    if (count($seen) > 2000) $seen = array_slice($seen, -1500, null, true);
    $stmp = $seenFile . '.tmp.' . bin2hex(random_bytes(4));
    @file_put_contents($stmp, json_encode($seen));
    @chmod($stmp, 0600);
    @rename($stmp, $seenFile);
    if ($slock) { @flock($slock, LOCK_UN); @fclose($slock); }
  }

  if (str_starts_with($event, 'customer.')) {
    $cid = trim((string)($data['id'] ?? $data['customerId'] ?? ''));
    if ($cid === '') $cid = 'ph_' . preg_replace('/\D/', '', (string)($data['phone'] ?? uniqid()));
    $addr = is_array($data['defaultAddress'] ?? null) ? $data['defaultAddress'] : [];
    if ($pdo) {
      $st = $pdo->prepare("INSERT INTO shivaa_synced_customers
        (customer_id, phone, name, email, role, city, state, pincode, address, gstin, black_member, payload_json, synced_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE phone=VALUES(phone), name=VALUES(name), email=VALUES(email), role=VALUES(role),
          city=VALUES(city), state=VALUES(state), pincode=VALUES(pincode), address=VALUES(address),
          gstin=VALUES(gstin), black_member=VALUES(black_member), payload_json=VALUES(payload_json), synced_at=VALUES(synced_at)");
      $st->execute([
        substr($cid, 0, 64),
        substr((string)($data['phone'] ?? ''), 0, 20),
        mb_substr((string)($data['name'] ?? ''), 0, 160),
        mb_substr((string)($data['email'] ?? ''), 0, 190),
        substr((string)($data['role'] ?? 'customer'), 0, 32),
        mb_substr((string)($data['city'] ?? $addr['city'] ?? ''), 0, 80),
        mb_substr((string)($data['state'] ?? $addr['state'] ?? ''), 0, 80),
        substr((string)($data['pincode'] ?? $addr['pincode'] ?? ''), 0, 16),
        mb_substr((string)($data['address'] ?? $addr['line'] ?? ''), 0, 320),
        substr((string)($data['gstin'] ?? ''), 0, 24),
        !empty($data['blackMember']) ? 1 : 0,
        $json, $now,
      ]);
    } else {
      shivaa_json_upsert('customers', $cid, $data);
    }
    if (function_exists('on_shivaa_customer')) {
      try { on_shivaa_customer($data, $event); } catch (Throwable $e) { error_log('on_shivaa_customer: ' . $e->getMessage()); }
    }
    return ['ok' => true, 'saved' => 'customer', 'id' => $cid, 'storage' => $pdo ? 'mysql' : 'json'];
  }

  if (str_starts_with($event, 'lead.')) {
    $lid = trim((string)($data['leadId'] ?? $data['id'] ?? ''));
    if ($lid === '') $lid = 'ld_' . bin2hex(random_bytes(6));
    if ($pdo) {
      $st = $pdo->prepare("INSERT INTO shivaa_synced_leads
        (lead_id, channel, name, phone, email, city, gstin, summary, amount, created_at, payload_json, synced_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), email=VALUES(email),
          city=VALUES(city), gstin=VALUES(gstin), summary=VALUES(summary), amount=VALUES(amount),
          payload_json=VALUES(payload_json), synced_at=VALUES(synced_at)");
      $st->execute([
        substr($lid, 0, 80),
        substr((string)($data['channel'] ?? 'website'), 0, 40),
        mb_substr((string)($data['name'] ?? ''), 0, 160),
        substr((string)($data['phone'] ?? ''), 0, 20),
        mb_substr((string)($data['email'] ?? ''), 0, 190),
        mb_substr((string)($data['city'] ?? ''), 0, 80),
        substr((string)($data['gstin'] ?? ''), 0, 24),
        mb_substr((string)($data['summary'] ?? $data['message'] ?? ''), 0, 500),
        round((float)($data['amount'] ?? 0), 2),
        substr((string)($data['createdAt'] ?? date('c')), 0, 40),
        $json, $now,
      ]);
    } else {
      shivaa_json_upsert('leads', $lid, $data);
    }
    if (function_exists('on_shivaa_lead')) {
      try { on_shivaa_lead($data, $event); } catch (Throwable $e) { error_log('on_shivaa_lead: ' . $e->getMessage()); }
    }
    return ['ok' => true, 'saved' => 'lead', 'id' => $lid, 'storage' => $pdo ? 'mysql' : 'json'];
  }

  if (str_starts_with($event, 'order.')) {
    $oid = trim((string)($data['id'] ?? $data['orderId'] ?? ''));
    if ($oid === '') $oid = 'ord_' . bin2hex(random_bytes(6));
    $ship = is_array($data['shippingAddress'] ?? null) ? $data['shippingAddress'] : [];
    if ($pdo) {
      $st = $pdo->prepare("INSERT INTO shivaa_synced_orders
        (order_id, invoice_no, customer_name, phone, status, payment_status, total, created_at, payload_json, synced_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE invoice_no=VALUES(invoice_no), customer_name=VALUES(customer_name),
          phone=VALUES(phone), status=VALUES(status), payment_status=VALUES(payment_status),
          total=VALUES(total), payload_json=VALUES(payload_json), synced_at=VALUES(synced_at)");
      $st->execute([
        substr($oid, 0, 64),
        substr((string)($data['invoiceNo'] ?? ''), 0, 64),
        mb_substr((string)($data['customerName'] ?? $ship['name'] ?? ''), 0, 160),
        substr((string)($data['phone'] ?? $ship['phone'] ?? ''), 0, 20),
        substr((string)($data['status'] ?? ''), 0, 40),
        substr((string)($data['paymentStatus'] ?? ''), 0, 40),
        round((float)($data['total'] ?? 0), 2),
        substr((string)($data['createdAt'] ?? date('c')), 0, 40),
        $json, $now,
      ]);
    } else {
      shivaa_json_upsert('orders', $oid, $data);
    }
    if (function_exists('on_shivaa_order')) {
      try { on_shivaa_order($data, $event); } catch (Throwable $e) { error_log('on_shivaa_order: ' . $e->getMessage()); }
    }
    return ['ok' => true, 'saved' => 'order', 'id' => $oid, 'storage' => $pdo ? 'mysql' : 'json'];
  }

  return ['ok' => true, 'ignored' => $event, 'deliveryId' => $deliveryId];
}

/** Pull any missed events since our last cursor and ingest them locally. */
function shivaa_catchup_events(int $limit = 100): array {
  $pdo = shivaa_sync_pdo();
  $after = 0;
  $cursorFile = shivaa_sync_dir() . DIRECTORY_SEPARATOR . 'cursor.txt';
  if ($pdo) {
    $st = $pdo->prepare("SELECT v FROM shivaa_sync_state WHERE k = 'last_seq'");
    $st->execute();
    $row = $st->fetch();
    if ($row) $after = (int)$row['v'];
  } elseif (is_file($cursorFile)) {
    $after = (int)trim((string)@file_get_contents($cursorFile));
  }
  $res = shivaa_api_call('GET', 'billing/events?after=' . $after . '&limit=' . max(1, min(200, $limit)));
  if (empty($res['ok'])) return $res;
  $processed = 0;
  $acked = [];
  $maxSeq = $after;
  foreach (($res['events'] ?? []) as $ev) {
    if (!is_array($ev)) continue;
    $seq = (int)($ev['seq'] ?? 0);
    $name = (string)($ev['event'] ?? '');
    $payload = is_array($ev['data'] ?? null) ? $ev['data'] : [];
    shivaa_ingest_event($name, $payload, (string)($ev['id'] ?? ''));
    $processed++;
    if (!empty($ev['id'])) $acked[] = (string)$ev['id'];
    if ($seq > $maxSeq) $maxSeq = $seq;
  }
  if ($maxSeq > $after) {
    if ($pdo) {
      $st = $pdo->prepare("INSERT INTO shivaa_sync_state (k, v) VALUES ('last_seq', ?) ON DUPLICATE KEY UPDATE v = VALUES(v)");
      $st->execute([(string)$maxSeq]);
    } else {
      @file_put_contents($cursorFile, (string)$maxSeq);
    }
  }
  if ($acked) {
    shivaa_api_call('POST', 'billing/events/ack', ['ids' => $acked]);
  }
  return ['ok' => true, 'processed' => $processed, 'lastSeq' => $maxSeq, 'hasMore' => !empty($res['hasMore'])];
}

/* ═══════════════════════ 4. HTTP ENTRYPOINT (WEBHOOK + STAFF JS BRIDGE) ══════ */
if (defined('SHIVAA_CONNECTOR_LIB') || (isset($_SERVER['SCRIPT_FILENAME']) && realpath((string)$_SERVER['SCRIPT_FILENAME']) !== __FILE__)) {
  return; // included as a PHP helper library — do not handle HTTP directly
}

function shivaa_connector_respond(int $code, array $payload): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function shivaa_require_billing_staff(): void {
  $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
  if ($method !== 'GET') {
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    $host   = (string)($_SERVER['HTTP_HOST'] ?? '');
    if ($origin !== '') {
      $oh = (string)(parse_url($origin, PHP_URL_HOST) ?? '');
      $hh = (string)(parse_url('https://' . $host, PHP_URL_HOST) ?? $host);
      if ($oh === '' || strcasecmp($oh, $hh) !== 0) {
        shivaa_connector_respond(403, ['ok' => false, 'error' => 'Cross-origin request denied']);
      }
    }
  }
  $staffTok = trim((string)SHIVAA_BILLING_STAFF_TOKEN);
  $sentTok  = trim((string)($_SERVER['HTTP_X_BILLING_TOKEN'] ?? ''));
  if ($staffTok !== '' && $sentTok !== '' && hash_equals($staffTok, $sentTok)) return;

  if (session_status() === PHP_SESSION_NONE) @session_start();
  foreach (['user_id', 'user', 'admin', 'admin_id', 'staff_id', 'logged_in', 'auth', 'billing_user'] as $k) {
    if (!empty($_SESSION[$k])) return;
  }
  shivaa_connector_respond(401, ['ok' => false, 'error' => 'Billing staff login required (or set SHIVAA_BILLING_STAFF_TOKEN).']);
}

$action = trim((string)($_GET['action'] ?? ''));
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

/* A. Same-origin authenticated actions for your billing website's HTML/JS UI */
if ($action !== '') {
  shivaa_require_billing_staff();

  if ($action === 'push_bill' && $method === 'POST') {
    if (!empty($_FILES['file']) && (int)($_FILES['file']['error'] ?? 1) === UPLOAD_ERR_OK) {
      $res = shivaa_push_bill_pdf([
        'externalId'   => $_POST['externalId'] ?? $_POST['billNo'] ?? '',
        'billNo'       => $_POST['billNo'] ?? '',
        'billDate'     => $_POST['billDate'] ?? date('Y-m-d'),
        'store'        => $_POST['store'] ?? 'Shivaa Jewels · Jaipur',
        'customerName' => $_POST['customerName'] ?? '',
        'phone'        => $_POST['phone'] ?? '',
        'email'        => $_POST['email'] ?? '',
        'amount'       => $_POST['amount'] ?? 0,
        'items'        => isset($_POST['items']) ? (json_decode((string)$_POST['items'], true) ?: (string)$_POST['items']) : '',
        'notes'        => $_POST['notes'] ?? '',
        'adjustStock'  => !empty($_POST['adjustStock']),
        'pdfPath'      => (string)$_FILES['file']['tmp_name'],
        'filename'     => (string)($_FILES['file']['name'] ?? 'bill.pdf'),
      ]);
      shivaa_connector_respond(!empty($res['ok']) ? 200 : 400, $res);
    }
    $in = json_decode((string)file_get_contents('php://input', false, null, 0, 12582912), true);
    if (!is_array($in)) shivaa_connector_respond(400, ['ok' => false, 'error' => 'Invalid JSON body']);
    $res = shivaa_push_bill_pdf($in);
    shivaa_connector_respond(!empty($res['ok']) ? 200 : 400, $res);
  }

  if ($action === 'void_bill' && $method === 'POST') {
    $in = json_decode((string)file_get_contents('php://input', false, null, 0, 65536), true) ?: $_POST;
    $res = shivaa_void_bill((string)($in['externalId'] ?? ''), (string)($in['reason'] ?? ''));
    shivaa_connector_respond(!empty($res['ok']) ? 200 : 400, $res);
  }

  if ($action === 'push_stock' && $method === 'POST') {
    $in = json_decode((string)file_get_contents('php://input', false, null, 0, 262144), true) ?: [];
    $res = !empty($in['movements'])
      ? shivaa_push_stock_batch((array)$in['movements'])
      : shivaa_push_stock((string)($in['movementId'] ?? ''), (string)($in['sku'] ?? ''), (int)($in['delta'] ?? 0), (string)($in['ref'] ?? ''), (string)($in['note'] ?? ''));
    shivaa_connector_respond(!empty($res['ok']) ? 200 : 400, $res);
  }

  if ($action === 'live_rates' && $method === 'GET') {
    $res = shivaa_get_rates();
    shivaa_connector_respond(!empty($res['ok']) ? 200 : 502, $res);
  }

  if ($action === 'shop_stock' && $method === 'GET') {
    $res = shivaa_get_stock((string)($_GET['sku'] ?? ''), (int)($_GET['limit'] ?? 500), (int)($_GET['offset'] ?? 0));
    shivaa_connector_respond(!empty($res['ok']) ? 200 : 502, $res);
  }

  if ($action === 'catchup' && $method === 'POST') {
    $res = shivaa_catchup_events((int)($_GET['limit'] ?? 100));
    shivaa_connector_respond(!empty($res['ok']) ? 200 : 502, $res);
  }

  if (in_array($action, ['synced_customers', 'synced_leads', 'synced_orders'], true) && $method === 'GET') {
    $limit = max(1, min(2000, (int)($_GET['limit'] ?? 500)));
    $pdo = shivaa_sync_pdo();
    if ($pdo) {
      $tbl = ['synced_customers' => 'shivaa_synced_customers', 'synced_leads' => 'shivaa_synced_leads', 'synced_orders' => 'shivaa_synced_orders'][$action];
      $st = $pdo->query("SELECT payload_json, synced_at FROM {$tbl} ORDER BY synced_at DESC LIMIT " . (int)$limit);
      $rows = [];
      foreach ($st->fetchAll() as $r) {
        $d = json_decode((string)$r['payload_json'], true);
        if (is_array($d)) { $d['_syncedAt'] = $r['synced_at']; $rows[] = $d; }
      }
      shivaa_connector_respond(200, ['ok' => true, 'storage' => 'mysql', 'count' => count($rows), 'items' => $rows]);
    }
    $bucket = str_replace('synced_', '', $action);
    $rows = shivaa_json_list($bucket, $limit);
    shivaa_connector_respond(200, ['ok' => true, 'storage' => 'json', 'count' => count($rows), 'items' => $rows]);
  }

  if ($action === 'ping' && $method === 'GET') {
    $res = shivaa_ping();
    shivaa_connector_respond(!empty($res['ok']) ? 200 : 502, $res);
  }

  shivaa_connector_respond(400, ['ok' => false, 'error' => 'Unknown action']);
}

/* B. Public health check (GET reveals zero secrets or data) */
if ($method === 'GET') {
  shivaa_connector_respond(200, [
    'ok'         => true,
    'connector'  => 'shivaa-connector/253',
    'configured' => shivaa_connector_configured(),
    'status'     => shivaa_connector_configured() ? 'ready' : 'paste SHIVAA_SYNC_SECRET in shivaa-connector.php',
  ]);
}

/* C. Signed inbound webhook receiver from shivaa.in (POST) */
if ($method !== 'POST') {
  header('Allow: GET, POST');
  shivaa_connector_respond(405, ['ok' => false, 'error' => 'Method not allowed']);
}
if (!shivaa_connector_configured()) {
  shivaa_connector_respond(503, ['ok' => false, 'error' => 'SHIVAA_SYNC_SECRET not configured on billing website yet']);
}
$ts  = trim((string)($_SERVER['HTTP_X_SHIVAA_TS'] ?? ''));
$sig = strtolower(trim((string)($_SERVER['HTTP_X_SHIVAA_SIGNATURE'] ?? '')));
$ev  = trim((string)($_SERVER['HTTP_X_SHIVAA_EVENT'] ?? ''));
$did = trim((string)($_SERVER['HTTP_X_SHIVAA_DELIVERY'] ?? ''));
if ($ts === '' || $sig === '' || !ctype_digit($ts)) {
  shivaa_connector_respond(401, ['ok' => false, 'error' => 'Missing X-Shivaa-Ts / X-Shivaa-Signature']);
}
if (abs(time() - (int)$ts) > 300) {
  shivaa_connector_respond(401, ['ok' => false, 'error' => 'Stale webhook timestamp (±5 min window)']);
}
$raw = (string)file_get_contents('php://input', false, null, 0, 2097153);
if (strlen($raw) > 2097152) {
  shivaa_connector_respond(413, ['ok' => false, 'error' => 'Webhook payload too large']);
}
$expect = hash_hmac('sha256', $ts . "\nPOST\nwebhook\n" . $raw, (string)SHIVAA_SYNC_SECRET);
if (!hash_equals($expect, $sig)) {
  shivaa_connector_respond(401, ['ok' => false, 'error' => 'Invalid HMAC signature']);
}
$envelope = json_decode($raw !== '' ? $raw : '{}', true);
if (!is_array($envelope)) {
  shivaa_connector_respond(400, ['ok' => false, 'error' => 'Invalid JSON']);
}
$eventName = $ev !== '' ? $ev : (string)($envelope['event'] ?? '');
$data = is_array($envelope['data'] ?? null) ? $envelope['data'] : $envelope;
$res = shivaa_ingest_event($eventName, $data, $did !== '' ? $did : (string)($envelope['id'] ?? ''));
shivaa_connector_respond(200, $res);
