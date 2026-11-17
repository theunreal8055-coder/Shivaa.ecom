<?php
/* ═══════════════════════════════════════════════════════════════════════════
   SHIVAA BILLING BRIDGE — v253 ("Bridge")
   Two-way signed sync between shivaa.in and the owner's live Hostinger
   PHP/HTML/JS billing software.

   1. Website -> Billing (real-time signed webhook + durable catch-up feed):
      · customer.created / customer.updated (OTP signups, addresses, Shivaa Black, B2B)
      · lead.created (contact, service/appointment, custom order, metal exchange,
        partner KYC application, Swarna Nidhi savings, rate alert, abandoned cart, newsletter)
      · order.created / order.paid (with GST invoiceNo) / order.updated
      · GET billing/rates, GET billing/stock, GET billing/customers,
        GET billing/leads, GET billing/orders, GET billing/events

   2. Billing -> Website (HMAC-SHA256 authenticated, dark until configured):
      · POST billing/bills — stores customer bill PDF in the private vault
        outside public_html (.shivaa-private-bills, magic-byte verified) and
        links it automatically to the customer's shivaa.in profile (#/my-bills)
        by 10-digit mobile; idempotent by externalId; optional SKU stock deduction.
      · POST billing/bill-void / DELETE billing/bills/{externalId}
      · POST billing/stock-movement (single or batch, idempotent by movementId)

   Include-only: refuses direct HTTP requests even if .htaccess is bypassed.
   ═══════════════════════════════════════════════════════════════════════════ */
declare(strict_types=1);
if (!defined('SHV_RUN')) { http_response_code(403); exit; }

const SHV_BILLING_REL = 253;

/* ── 1. URL & SSRF guards ── */

function shv_billing_is_public_ip(string $ip): bool {
  return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
}

function shv_billing_validate_url(string $url, string $label = 'Billing URL'): array {
  $u = trim($url);
  if ($u === '') return ['ok' => true, 'url' => ''];
  if (strlen($u) > 500) return ['ok' => false, 'error' => $label . ' is too long (max 500 chars).'];
  $parts = @parse_url($u);
  if (!is_array($parts) || strtolower((string)($parts['scheme'] ?? '')) !== 'https') {
    return ['ok' => false, 'error' => $label . ' must start with https://'];
  }
  if (!empty($parts['user']) || !empty($parts['pass'])) {
    return ['ok' => false, 'error' => $label . ' must not contain a username or password.'];
  }
  $host = strtolower(trim((string)($parts['host'] ?? ''), '[]'));
  if ($host === '' || $host === 'localhost' || str_ends_with($host, '.localhost')
      || str_ends_with($host, '.local') || str_ends_with($host, '.internal')) {
    return ['ok' => false, 'error' => $label . ' must point to a public live domain (not localhost).'];
  }
  if (filter_var($host, FILTER_VALIDATE_IP) !== false && !shv_billing_is_public_ip($host)) {
    return ['ok' => false, 'error' => $label . ' must use a public IP or domain.'];
  }
  if (!preg_match('/^[a-z0-9.\-:]+$/', $host)) {
    return ['ok' => false, 'error' => $label . ' hostname contains invalid characters.'];
  }
  $port = isset($parts['port']) ? (int)$parts['port'] : 443;
  if (!in_array($port, [443, 8443], true)) {
    return ['ok' => false, 'error' => $label . ' must use standard HTTPS port 443 (or 8443).'];
  }
  return ['ok' => true, 'url' => $u];
}

function shv_billing_resolve_public_ip(string $host): ?string {
  $clean = trim($host, '[]');
  if (filter_var($clean, FILTER_VALIDATE_IP) !== false) {
    return shv_billing_is_public_ip($clean) ? $clean : null;
  }
  $ips = @gethostbynamel($clean);
  if (!is_array($ips) || !$ips) return null;
  foreach ($ips as $ip) {
    if (!shv_billing_is_public_ip((string)$ip)) return null;
  }
  return (string)$ips[0];
}

/* ── 2. Config & state helpers ── */

function shv_billing_init_db(array &$db): void {
  if (!isset($db['billingMovements']) || !is_array($db['billingMovements'])) $db['billingMovements'] = [];
  if (!isset($db['billingOutbox']) || !is_array($db['billingOutbox'])) $db['billingOutbox'] = [];
  if (!isset($db['billingSyncLog']) || !is_array($db['billingSyncLog'])) $db['billingSyncLog'] = [];
  if (!isset($db['billingOutboxSeq']) || !is_int($db['billingOutboxSeq'])) {
    $db['billingOutboxSeq'] = (int)($db['billingOutboxSeq'] ?? 0);
  }
  $defaults = [
    'billingAppUrl'        => '',
    'billingWebhookUrl'    => '',
    'billingPushCustomers' => true,
    'billingPushLeads'     => true,
    'billingPushOrders'    => true,
    'billingAcceptBills'   => true,
    'billingAcceptStock'   => true,
  ];
  foreach ($defaults as $k => $v) {
    if (!array_key_exists($k, $db['settings'])) $db['settings'][$k] = $v;
  }
}

function shv_billing_secret(array $db): string {
  return trim((string)($db['settings']['billingSyncSecret'] ?? ''));
}

function shv_billing_flag(array $db, string $key): bool {
  if (!array_key_exists($key, $db['settings'] ?? [])) return true;
  return !empty($db['settings'][$key]);
}

function shv_billing_log(array &$db, string $dir, string $event, string $status, string $summary, array $meta = []): void {
  if (!isset($db['billingSyncLog']) || !is_array($db['billingSyncLog'])) $db['billingSyncLog'] = [];
  $db['billingSyncLog'][] = [
    'id'      => uid('bl'),
    'at'      => now_iso(),
    'dir'     => $dir,       // 'in' | 'out'
    'event'   => $event,
    'status'  => $status,    // 'ok' | 'queued' | 'failed'
    'summary' => mb_substr($summary, 0, 220),
    'meta'    => $meta,
  ];
  if (count($db['billingSyncLog']) > 200) {
    $db['billingSyncLog'] = array_slice($db['billingSyncLog'], -200);
  }
}

/* ── 3. Inbound HMAC-SHA256 authentication ── */

function shv_billing_sync_raw(int $maxBytes = 12582912): string {
  static $raw = null;
  if ($raw === null) {
    $raw = (string)file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if (strlen($raw) > $maxBytes) jout(413, ['ok' => false, 'error' => 'Request payload exceeds 12 MB limit.']);
  }
  return $raw;
}

function shv_billing_sync_auth(array $db, bool $allowMultipart = false): array {
  $secret = shv_billing_secret($db);
  if ($secret === '') {
    jout(403, ['ok' => false, 'error' => 'Billing sync is not configured — set a sync key in Shivaa Admin → Settings first.']);
  }
  $ts  = trim((string)($_SERVER['HTTP_X_SHIVAA_TS'] ?? ''));
  $sig = strtolower(trim((string)($_SERVER['HTTP_X_SHIVAA_SIGNATURE'] ?? '')));
  if ($ts === '' || $sig === '' || !ctype_digit($ts)) {
    jout(401, ['ok' => false, 'error' => 'Missing X-Shivaa-Ts or X-Shivaa-Signature header.']);
  }
  if (abs(time() - (int)$ts) > 300) {
    jout(401, ['ok' => false, 'error' => 'Stale signature timestamp (±5 minute window). Check server clock.']);
  }
  $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
  $route  = trim((string)($_GET['__route'] ?? ''), '/');

  $ct = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
  if ($allowMultipart && str_starts_with($ct, 'multipart/form-data')) {
    $billNo = trim((string)($_POST['billNo'] ?? ''));
    $phone  = substr((string)preg_replace('/\D/', '', (string)($_POST['phone'] ?? '')), -10);
    $fileSha = '';
    $src = !empty($_FILES['files']) ? $_FILES['files'] : (!empty($_FILES['file']) ? $_FILES['file'] : null);
    if (is_array($src)) {
      $tmp = is_array($src['tmp_name'] ?? null) ? (string)($src['tmp_name'][0] ?? '') : (string)($src['tmp_name'] ?? '');
      if ($tmp !== '' && is_file($tmp)) $fileSha = (string)hash_file('sha256', $tmp);
    }
    $canon = $ts . "\n" . $method . "\n" . $route . "\nmultipart:" . $billNo . ':' . $phone . ':' . $fileSha;
    $expect = hash_hmac('sha256', $canon, $secret);
    if (!hash_equals($expect, $sig)) jout(401, ['ok' => false, 'error' => 'Bad HMAC signature (multipart).']);
    return is_array($_POST) ? $_POST : [];
  }

  $raw = ($method === 'GET' || $method === 'HEAD') ? '' : shv_billing_sync_raw();
  $expect = hash_hmac('sha256', $ts . "\n" . $method . "\n" . $route . "\n" . $raw, $secret);
  if (!hash_equals($expect, $sig)) {
    jout(401, ['ok' => false, 'error' => 'Bad HMAC signature. Verify SHIVAA_SYNC_SECRET matches Shivaa Admin → Settings.']);
  }
  if ($raw === '') return [];
  $body = json_decode($raw, true);
  if (!is_array($body)) jout(400, ['ok' => false, 'error' => 'Request body must be a JSON object.']);
  return $body;
}

/* ── 4. Private PDF vault writer (shares v229's .shivaa-private-bills) ── */

function shv_billing_store_bytes(string $bytes): ?array {
  $dir = shv_bill_private_dir();
  if ($dir === null) return null;
  $size = strlen($bytes);
  if ($size < 8 || $size > 8388608) return null;
  $kind = shv_bill_detect_ext(substr($bytes, 0, 12));   // content bytes decide — never filename
  if ($kind === null) return null;
  $name = 'bill_' . bin2hex(random_bytes(16)) . '.' . $kind;
  $tmp  = $dir . DIRECTORY_SEPARATOR . '.' . $name . '.tmp';
  $dest = $dir . DIRECTORY_SEPARATOR . $name;
  $written = @file_put_contents($tmp, $bytes, LOCK_EX);
  if ($written !== $size || !is_file($tmp) || is_link($tmp)) {
    @unlink($tmp);
    return null;
  }
  @chmod($tmp, 0600);
  if (!@rename($tmp, $dest) || !is_file($dest) || is_link($dest)) {
    @unlink($tmp);
    @unlink($dest);
    return null;
  }
  @chmod($dest, 0600);
  $mode = @fileperms($dest);
  $storedHead = (string)@file_get_contents($dest, false, null, 0, 12);
  if ($mode === false || (($mode & 0077) !== 0) || shv_bill_detect_ext($storedHead) !== $kind) {
    @unlink($dest);
    return null;
  }
  return ['ref' => 'private-bills:' . $name, 'ext' => $kind, 'size' => $size];
}

function shv_billing_decode_base64_file(string $raw): ?string {
  $s = trim($raw);
  if ($s === '') return null;
  if (str_starts_with($s, 'data:')) {
    $comma = strpos($s, ',');
    if ($comma === false) return null;
    $s = substr($s, $comma + 1);
  }
  $s = str_replace(["\r", "\n", ' '], '', $s);
  if (strlen($s) > 11500000) return null; // > 8 MB decoded
  $bin = base64_decode($s, true);
  return (is_string($bin) && $bin !== '') ? $bin : null;
}

/* Link any pre-existing showroom bills to a newly registered customer's ID. */
function shv_billing_link_user_bills(array &$db, array $u): int {
  $uid = (string)($u['id'] ?? '');
  $mobile = black_mobile($u['phone'] ?? '');
  if ($uid === '' || $mobile === '' || ($u['role'] ?? 'customer') !== 'customer') return 0;
  $n = 0;
  foreach (($db['storeBills'] ?? []) as $i => $b) {
    if (!is_array($b) || (string)($b['userId'] ?? '') !== '' || !empty($b['anonymizedAt'])) continue;
    $bp = black_mobile($b['phone'] ?? '');
    if ($bp !== '' && hash_equals($mobile, $bp)) {
      $db['storeBills'][$i]['userId'] = $uid;
      $n++;
    }
  }
  return $n;
}

/* ── 5. Stock movement helper (shared by stock-movement & atomic bill save) ── */

function shv_billing_apply_movement(array &$db, array $m): array {
  $mid = (string)preg_replace('/[^A-Za-z0-9_:\-.]/', '', (string)($m['movementId'] ?? ''));
  if ($mid === '' || strlen($mid) > 80) {
    return ['ok' => false, 'error' => 'movementId required (idempotency key, ≤80 chars).'];
  }
  if (isset($db['billingMovements'][$mid])) {
    return ['ok' => true, 'duplicate' => true, 'movementId' => $mid, 'result' => $db['billingMovements'][$mid]];
  }
  $hasSet = array_key_exists('setStock', $m) && $m['setStock'] !== null && $m['setStock'] !== '';
  $setVal = null;
  $delta  = 0;
  if ($hasSet) {
    if (!is_numeric($m['setStock']) || (int)$m['setStock'] != $m['setStock'] || (int)$m['setStock'] < 0 || (int)$m['setStock'] > 10000000) {
      return ['ok' => false, 'movementId' => $mid, 'error' => 'setStock must be a whole number between 0 and 10000000.'];
    }
    $setVal = (int)$m['setStock'];
  } else {
    $rawDelta = $m['delta'] ?? null;
    if (!is_numeric($rawDelta) || (int)$rawDelta != $rawDelta || (int)$rawDelta === 0) {
      return ['ok' => false, 'movementId' => $mid, 'error' => 'delta must be a non-zero whole number (negative = sold, positive = restocked), or pass setStock.'];
    }
    $delta = (int)$rawDelta;
    if (abs($delta) > 100000) {
      return ['ok' => false, 'movementId' => $mid, 'error' => 'delta out of range (±100000).'];
    }
  }
  $byId  = trim((string)($m['productId'] ?? '')) !== '';
  $bySku = trim((string)($m['sku'] ?? '')) !== '';
  if (!$byId && !$bySku) {
    return ['ok' => false, 'movementId' => $mid, 'error' => 'sku or productId required.'];
  }
  $needle = $byId ? trim((string)$m['productId']) : trim((string)$m['sku']);
  $found = null;
  foreach (($db['products'] ?? []) as $pi => $p) {
    if (!is_array($p)) continue;
    $hit = $byId ? ((string)($p['id'] ?? '') === $needle)
                 : (strcasecmp((string)($p['sku'] ?? ''), $needle) === 0);
    if ($hit) { $found = $pi; break; }
  }
  if ($found === null) {
    return ['ok' => false, 'notFound' => true, 'movementId' => $mid,
      'error' => 'Product not found for ' . ($byId ? 'productId ' : 'sku ') . mb_substr($needle, 0, 60)];
  }
  $before = (int)($db['products'][$found]['stock'] ?? 0);
  $after  = $setVal !== null ? $setVal : (int)clampn($before + $delta, 0, 10000000);
  if ($setVal !== null) $delta = $after - $before;
  $db['products'][$found]['stock'] = $after;
  $res = [
    'productId'   => (string)($db['products'][$found]['id'] ?? ''),
    'sku'         => (string)($db['products'][$found]['sku'] ?? ''),
    'name'        => (string)($db['products'][$found]['name'] ?? ''),
    'stockBefore' => $before,
    'stockAfter'  => $after,
    'delta'       => $delta,
    'ref'         => mb_substr(trim((string)($m['ref'] ?? '')), 0, 64),
    'note'        => mb_substr(trim((string)($m['note'] ?? '')), 0, 200),
    'at'          => now_iso(),
  ];
  $db['billingMovements'][$mid] = $res;
  if (count($db['billingMovements']) > 5000) {
    $db['billingMovements'] = array_slice($db['billingMovements'], -4000, null, true);
  }
  return ['ok' => true, 'duplicate' => false, 'movementId' => $mid, 'result' => $res];
}

/* ── 6. Normalized Customer, Lead & Order payloads (secret-free) ── */

function shv_billing_real_email(string $email): string {
  $e = strtolower(trim($email));
  if ($e === '' || str_ends_with($e, '@phone.shivaa.in') || str_ends_with($e, '@deleted.invalid')) return '';
  return $e;
}

function shv_billing_norm_phone(string $raw): string {
  $d = (string)preg_replace('/\D/', '', $raw);
  if (strlen($d) > 10) $d = substr($d, -10);
  return preg_match('/^[6-9]\d{9}$/', $d) ? $d : '';
}

function shv_billing_customer_payload(array $db, array $u): array {
  $prof = is_array($u['profile'] ?? null) ? $u['profile'] : [];
  $addrs = array_values(array_filter((array)($u['addresses'] ?? []), 'is_array'));
  $def = null;
  foreach ($addrs as $a) { if (!empty($a['isDefault'])) { $def = $a; break; } }
  if ($def === null && $addrs) $def = $addrs[0];

  $card = is_array($u['blackCard'] ?? null) ? black_card_public($u['blackCard']) : null;
  $blackActive = is_array($card) && (($card['status'] ?? '') === 'active');

  $firm = ''; $contact = ''; $gstin = ''; $pan = ''; $pAddr = ''; $pCity = ''; $pPin = '';
  if (($u['role'] ?? '') === 'partner' && !empty($u['partnerId'])) {
    foreach (($db['partners'] ?? []) as $pt) {
      if ((string)($pt['id'] ?? '') === (string)$u['partnerId']) {
        $firm    = (string)($pt['firm'] ?? '');
        $contact = (string)($pt['contactPerson'] ?? '');
        $gstin   = (string)($pt['kyc']['gstin'] ?? '');
        $pan     = (string)($pt['kyc']['pan'] ?? '');
        $pAddr   = (string)($pt['address'] ?? '');
        $pCity   = (string)($pt['city'] ?? '');
        $pPin    = (string)($pt['pincode'] ?? '');
        break;
      }
    }
  }

  return [
    'id'               => (string)($u['id'] ?? ''),
    'source'           => 'shivaa.in',
    'role'             => (string)($u['role'] ?? 'customer'),
    'name'             => (string)($u['name'] ?? ''),
    'phone'            => shv_billing_norm_phone((string)($u['phone'] ?? '')),
    'email'            => shv_billing_real_email((string)($u['email'] ?? '')),
    'dob'              => (string)($prof['dob'] ?? ''),
    'anniversary'      => (string)($prof['anniversary'] ?? ''),
    'gender'           => (string)($prof['gender'] ?? ''),
    'city'             => (string)($def['city'] ?? $prof['city'] ?? $pCity),
    'state'            => (string)($def['state'] ?? ''),
    'pincode'          => (string)($def['pincode'] ?? $pPin),
    'address'          => (string)($def['line'] ?? $pAddr),
    'defaultAddress'   => $def,
    'addresses'        => $addrs,
    'firm'             => $firm,
    'contactPerson'    => $contact,
    'gstin'            => $gstin,
    'pan'              => $pan,
    'blackMember'      => $blackActive,
    'blackCardNo'      => $card ? (string)($card['cardNumber'] ?? '') : '',
    'blackDiscountPct' => $card ? (int)($card['discountPct'] ?? 0) : 0,
    'blackExpiresAt'   => $card ? (string)($card['expiresAt'] ?? '') : '',
    'loyaltyPoints'    => (int)($u['loyaltyPoints'] ?? 0),
    'createdAt'        => (string)($u['createdAt'] ?? now_iso()),
  ];
}

function shv_billing_lead_payload(string $channel, array $r): array {
  $out = [
    'leadId'    => $channel . ':' . (string)($r['id'] ?? md5((string)json_encode($r))),
    'source'    => 'shivaa.in',
    'channel'   => $channel,
    'name'      => '',
    'phone'     => '',
    'email'     => '',
    'city'      => '',
    'gstin'     => '',
    'summary'   => '',
    'message'   => '',
    'budget'    => '',
    'amount'    => 0.0,
    'meta'      => [],
    'createdAt' => (string)($r['createdAt'] ?? $r['appliedAt'] ?? $r['at'] ?? now_iso()),
  ];
  switch ($channel) {
    case 'contact':
      $out['name']    = (string)($r['name'] ?? '');
      $out['phone']   = shv_billing_norm_phone((string)($r['phone'] ?? ''));
      $out['email']   = shv_billing_real_email((string)($r['email'] ?? ''));
      $out['message'] = (string)($r['message'] ?? '');
      $out['summary'] = 'Contact enquiry: ' . mb_substr($out['message'], 0, 180);
      break;
    case 'service_request':
      $type = (string)($r['type'] ?? 'Service / Appointment');
      $out['name']    = (string)($r['name'] ?? '');
      $out['phone']   = shv_billing_norm_phone((string)($r['phone'] ?? ''));
      $out['email']   = shv_billing_real_email((string)($r['email'] ?? ''));
      $out['budget']  = (string)($r['budget'] ?? '');
      $out['message'] = (string)($r['details'] ?? '');
      $out['summary'] = $type . ($out['message'] !== '' ? ' — ' . mb_substr($out['message'], 0, 160) : '');
      $out['meta']    = ['type' => $type, 'orderId' => (string)($r['orderId'] ?? ''), 'status' => (string)($r['status'] ?? 'new')];
      break;
    case 'custom_order':
      $out['name']    = (string)($r['partnerName'] ?? $r['customerName'] ?? '');
      $out['phone']   = shv_billing_norm_phone((string)($r['phone'] ?? ''));
      $out['email']   = shv_billing_real_email((string)($r['email'] ?? ''));
      $out['amount']  = (float)($r['advance'] ?? 0);
      $out['message'] = (string)($r['note'] ?? '');
      $out['summary'] = 'Custom order: ' . (string)($r['name'] ?? '') . ' · ' . (float)($r['weightG'] ?? 0) . 'g';
      $out['meta']    = ['orderId' => (string)($r['id'] ?? ''), 'piece' => (string)($r['name'] ?? ''),
        'weightG' => (float)($r['weightG'] ?? 0), 'melting' => (int)($r['melting'] ?? 0),
        'size' => (string)($r['size'] ?? ''), 'designImg' => (string)($r['designImg'] ?? '')];
      break;
    case 'metal_exchange':
      $out['name']    = (string)($r['partnerName'] ?? '');
      $out['phone']   = shv_billing_norm_phone((string)($r['phone'] ?? ''));
      $out['email']   = shv_billing_real_email((string)($r['email'] ?? ''));
      $out['message'] = (string)($r['note'] ?? '');
      $out['summary'] = 'B2B Metal exchange ' . (string)($r['id'] ?? '') . ' · ' . (float)($r['totalWeightG'] ?? 0) . 'g (' . (float)($r['fineGrams'] ?? 0) . 'g fine)';
      $out['meta']    = ['orderId' => (string)($r['id'] ?? ''), 'totalWeightG' => (float)($r['totalWeightG'] ?? 0),
        'fineGrams' => (float)($r['fineGrams'] ?? 0), 'items' => (array)($r['items'] ?? [])];
      break;
    case 'partner_application':
      $out['name']    = trim((string)($r['firm'] ?? '') . ((string)($r['contactPerson'] ?? '') !== '' ? ' (' . $r['contactPerson'] . ')' : ''));
      $out['phone']   = shv_billing_norm_phone((string)($r['phone'] ?? ''));
      $out['email']   = shv_billing_real_email((string)($r['email'] ?? ''));
      $out['city']    = (string)($r['city'] ?? '');
      $out['gstin']   = (string)($r['kyc']['gstin'] ?? '');
      $out['message'] = (string)($r['message'] ?? '');
      $out['summary'] = 'B2B Partner KYC: ' . (string)($r['firm'] ?? '') . ' · GSTIN ' . $out['gstin'];
      $out['meta']    = ['partnerId' => (string)($r['id'] ?? ''), 'firm' => (string)($r['firm'] ?? ''),
        'contactPerson' => (string)($r['contactPerson'] ?? ''), 'address' => (string)($r['address'] ?? ''),
        'pincode' => (string)($r['pincode'] ?? ''), 'status' => (string)($r['status'] ?? 'pending')];
      break;
    case 'savings_plan':
      $out['name']    = (string)($r['userName'] ?? '');
      $out['phone']   = shv_billing_norm_phone((string)($r['phone'] ?? ''));
      $out['amount']  = (float)($r['monthlyAmount'] ?? 0);
      $out['summary'] = 'Swarna Nidhi plan ' . (string)($r['planNo'] ?? $r['id'] ?? '') . ' · ₹' . (int)$out['amount'] . '/month';
      $out['meta']    = ['planNo' => (string)($r['planNo'] ?? ''), 'monthlyAmount' => (int)$out['amount'], 'status' => (string)($r['status'] ?? 'active')];
      break;
    case 'rate_alert':
      $out['phone']   = shv_billing_norm_phone((string)($r['phone'] ?? ''));
      $out['email']   = shv_billing_real_email((string)($r['email'] ?? ''));
      $out['amount']  = (float)($r['target'] ?? 0);
      $out['summary'] = 'Rate alert: ' . (string)($r['metal'] ?? 'Gold') . ' target ₹' . $out['amount'];
      $out['meta']    = ['metal' => (string)($r['metal'] ?? ''), 'target' => $out['amount'], 'productId' => (string)($r['productId'] ?? '')];
      break;
    case 'abandoned_cart':
      $out['phone']   = shv_billing_norm_phone((string)($r['phone'] ?? ''));
      $out['amount']  = (float)($r['total'] ?? 0);
      $names = array_map(fn($i) => ((string)($i['n'] ?? 'Item')) . ' ×' . (int)($i['q'] ?? 1), (array)($r['items'] ?? []));
      $out['summary'] = 'Abandoned cart (₹' . (int)round($out['amount']) . '): ' . mb_substr(implode(', ', $names), 0, 180);
      $out['meta']    = ['items' => (array)($r['items'] ?? []), 'total' => $out['amount']];
      break;
    case 'newsletter':
      $em = shv_billing_real_email((string)($r['email'] ?? ''));
      $out['leadId']  = 'newsletter:' . md5($em);
      $out['email']   = $em;
      $out['summary'] = 'Newsletter signup: ' . $em;
      break;
  }
  return $out;
}

function shv_billing_collect_all_leads(array $db, string $channel = '', string $since = ''): array {
  $rows = [];
  $push = static function (string $ch, array $list) use (&$rows, $channel, $since): void {
    if ($channel !== '' && $channel !== 'all' && $channel !== $ch) return;
    foreach ($list as $item) {
      if (!is_array($item)) continue;
      $p = shv_billing_lead_payload($ch, $item);
      if ($since !== '' && strcmp((string)$p['createdAt'], $since) < 0) continue;
      $rows[] = $p;
    }
  };
  $push('contact',             (array)($db['contactMsgs'] ?? []));
  $push('service_request',     (array)($db['serviceRequests'] ?? []));
  $push('custom_order',        (array)($db['customOrders'] ?? []));
  $push('metal_exchange',      (array)($db['metalOrders'] ?? []));
  $push('partner_application', (array)($db['partners'] ?? []));
  $push('savings_plan',        (array)($db['savingsPlans'] ?? []));
  $push('rate_alert',          (array)($db['rateAlerts'] ?? []));
  $push('abandoned_cart',      (array)($db['carts'] ?? []));
  $push('newsletter',          (array)($db['newsletter'] ?? []));
  usort($rows, fn($a, $b) => strcmp((string)($b['createdAt'] ?? ''), (string)($a['createdAt'] ?? '')));
  return $rows;
}

function shv_billing_order_payload(array $db, array $o): array {
  $pub = shv_public_order($o);
  $skuById = [];
  foreach (($db['products'] ?? []) as $p) {
    if (is_array($p) && !empty($p['id'])) $skuById[(string)$p['id']] = $p;
  }
  $addr = is_array($pub['address'] ?? null) ? $pub['address'] : [];
  $cfShip = is_array($o['cfCheckout']['shipping'] ?? null) ? $o['cfCheckout']['shipping'] : null;
  $cfBill = is_array($o['cfCheckout']['billing'] ?? null) ? $o['cfCheckout']['billing'] : null;
  $ship = $cfShip ?: $addr;
  $items = [];
  foreach ((array)($pub['items'] ?? []) as $it) {
    if (!is_array($it)) continue;
    $pid = (string)($it['productId'] ?? $it['id'] ?? '');
    $prod = $skuById[$pid] ?? [];
    $items[] = [
      'productId' => $pid,
      'sku'       => (string)($it['sku'] ?? $prod['sku'] ?? ''),
      'name'      => (string)($it['name'] ?? $prod['name'] ?? ''),
      'category'  => (string)($it['category'] ?? $prod['category'] ?? ''),
      'metal'     => (string)($it['metal'] ?? $prod['metal'] ?? 'Gold'),
      'purity'    => (string)($it['purity'] ?? $prod['purity'] ?? '22K'),
      'weightG'   => (float)($it['weightG'] ?? $prod['weightG'] ?? 0),
      'size'      => (string)($it['size'] ?? ''),
      'qty'       => (int)($it['qty'] ?? 1),
      'unitPrice' => (float)($it['unitPrice'] ?? $it['price'] ?? 0),
      'lineTotal' => (float)($it['lineTotal'] ?? (((float)($it['unitPrice'] ?? $it['price'] ?? 0)) * max(1, (int)($it['qty'] ?? 1)))),
    ];
  }
  return [
    'id'              => (string)($pub['id'] ?? ''),
    'source'          => 'shivaa.in',
    'invoiceNo'       => (string)($pub['invoiceNo'] ?? ''),
    'invoicedAt'      => (string)($pub['invoicedAt'] ?? ''),
    'userId'          => (string)($pub['userId'] ?? ''),
    'guest'           => !empty($pub['guest']),
    'customerName'    => (string)($pub['customerName'] ?? $ship['name'] ?? ''),
    'phone'           => shv_billing_norm_phone((string)($ship['phone'] ?? $addr['phone'] ?? $o['phone'] ?? '')),
    'email'           => shv_billing_real_email((string)($pub['email'] ?? '')),
    'status'          => (string)($pub['status'] ?? ''),
    'paymentStatus'   => (string)($pub['paymentStatus'] ?? ''),
    'paymentMethod'   => (string)($pub['paymentMethod'] ?? $pub['payMethod'] ?? ''),
    'shippingAddress' => $ship,
    'billingAddress'  => $cfBill ?: $ship,
    'items'           => $items,
    'subtotal'        => (float)($pub['subtotal'] ?? 0),
    'discount'        => (float)($pub['discount'] ?? 0),
    'coupon'          => (string)($pub['coupon'] ?? ''),
    'gst'             => (float)($pub['gst'] ?? 0),
    'shipping'        => (float)($pub['shipping'] ?? 0),
    'total'           => (float)($pub['total'] ?? 0),
    'amountPaid'      => (float)($pub['amountPaid'] ?? 0),
    'courier'         => (string)($pub['courier'] ?? ''),
    'trackingNo'      => (string)($pub['awb'] ?? $pub['trackingNo'] ?? ''),
    'createdAt'       => (string)($pub['createdAt'] ?? now_iso()),
  ];
}

/* ── 7. Durable Outbox & Zero-Latency Post-Response Webhook Sender ── */

function shv_billing_deliver_http(string $url, string $secret, string $event, string $deliveryId, array $envelope, int $timeout = 5): array {
  $v = shv_billing_validate_url($url, 'Billing webhook URL');
  if (empty($v['ok'])) return ['ok' => false, 'httpCode' => 0, 'latencyMs' => 0, 'error' => (string)$v['error']];
  if (!function_exists('curl_init')) return ['ok' => false, 'httpCode' => 0, 'latencyMs' => 0, 'error' => 'PHP cURL is unavailable on this host.'];

  $parts = parse_url($url);
  $host = (string)($parts['host'] ?? '');
  $port = (int)($parts['port'] ?? 443);
  $ip = shv_billing_resolve_public_ip($host);
  if ($ip === null) {
    return ['ok' => false, 'httpCode' => 0, 'latencyMs' => 0, 'error' => 'Could not resolve public IP for ' . $host];
  }

  $raw = (string)json_encode($envelope, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $ts  = (string)time();
  $sig = hash_hmac('sha256', $ts . "\nPOST\nwebhook\n" . $raw, $secret);
  $t0  = microtime(true);

  $ch = curl_init($url);
  $opts = [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $raw,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_TIMEOUT        => max(3, $timeout),
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_RESOLVE        => [strtolower($host) . ':' . $port . ':' . (str_contains($ip, ':') ? '[' . $ip . ']' : $ip)],
    CURLOPT_HTTPHEADER     => [
      'Content-Type: application/json; charset=utf-8',
      'Accept: application/json',
      'User-Agent: ShivaaEcom-BillingBridge/' . SHV_BILLING_REL,
      'X-Shivaa-Ts: ' . $ts,
      'X-Shivaa-Event: ' . $event,
      'X-Shivaa-Delivery: ' . $deliveryId,
      'X-Shivaa-Signature: ' . $sig,
    ],
  ];
  if (defined('CURLPROTO_HTTPS')) $opts[CURLOPT_PROTOCOLS] = CURLPROTO_HTTPS;
  curl_setopt_array($ch, $opts);
  $resp = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err  = curl_error($ch);
  curl_close($ch);
  $ms = (int)round((microtime(true) - $t0) * 1000);

  $ok = ($code >= 200 && $code < 300);
  $decoded = is_string($resp) ? json_decode($resp, true) : null;
  if ($ok && is_array($decoded) && array_key_exists('ok', $decoded) && !$decoded['ok']) {
    $ok = false;
    $err = (string)($decoded['error'] ?? 'Remote connector reported ok:false');
  }
  return [
    'ok'        => $ok,
    'httpCode'  => $code,
    'latencyMs' => $ms,
    'reply'     => is_array($decoded) ? $decoded : null,
    'error'     => $ok ? '' : ($err !== '' ? $err : ('HTTP ' . $code . (is_string($decoded['error'] ?? null) ? ': ' . $decoded['error'] : ''))),
  ];
}

function shv_billing_flush_outbox(string $dbFile, int $maxItems = 8, bool $includeFailed = false): array {
  $db = db_load($dbFile);
  shv_billing_init_db($db);
  $secret = shv_billing_secret($db);
  $url    = trim((string)($db['settings']['billingWebhookUrl'] ?? ''));
  if ($secret === '' || $url === '') {
    return ['ok' => false, 'sent' => 0, 'failed' => 0, 'reason' => 'Webhook URL or sync key not set'];
  }
  $batch = [];
  foreach ($db['billingOutbox'] as $ev) {
    if (!is_array($ev)) continue;
    $st = (string)($ev['status'] ?? 'pending');
    if ($st === 'pending' || ($includeFailed && $st === 'failed' && (int)($ev['attempts'] ?? 0) < 12)) {
      $batch[] = $ev;
      if (count($batch) >= $maxItems) break;
    }
  }
  if (!$batch) return ['ok' => true, 'sent' => 0, 'failed' => 0];

  /* Deliver outside the file lock so external network I/O never blocks shoppers. */
  $outcomes = [];
  foreach ($batch as $ev) {
    $id = (string)$ev['id'];
    $envelope = [
      'id'     => $id,
      'seq'    => (int)($ev['seq'] ?? 0),
      'event'  => (string)$ev['event'],
      'sentAt' => now_iso(),
      'shop'   => 'shivaa.in',
      'rel'    => SHV_BILLING_REL,
      'data'   => $ev['data'] ?? [],
    ];
    $outcomes[$id] = shv_billing_deliver_http($url, $secret, (string)$ev['event'], $id, $envelope, 5);
  }

  $lh = null;
  $ownLock = false;
  if (empty($GLOBALS['__shv_lock'])) {
    $lh = @fopen($dbFile . '.lock', 'c');
    if ($lh && @flock($lh, LOCK_EX)) {
      $GLOBALS['__shv_lock'] = $lh;
      $ownLock = true;
    }
  }
  $sent = 0; $failed = 0;
  try {
    $db2 = db_load($dbFile);
    shv_billing_init_db($db2);
    foreach ($db2['billingOutbox'] as $i => $ev) {
      $id = (string)($ev['id'] ?? '');
      if (!isset($outcomes[$id])) continue;
      $r = $outcomes[$id];
      $db2['billingOutbox'][$i]['attempts']   = (int)($ev['attempts'] ?? 0) + 1;
      $db2['billingOutbox'][$i]['lastTryAt']  = now_iso();
      $db2['billingOutbox'][$i]['httpCode']   = (int)$r['httpCode'];
      $db2['billingOutbox'][$i]['latencyMs']  = (int)$r['latencyMs'];
      if (!empty($r['ok'])) {
        $db2['billingOutbox'][$i]['status']      = 'delivered';
        $db2['billingOutbox'][$i]['deliveredAt'] = now_iso();
        $db2['billingOutbox'][$i]['lastError']   = '';
        $sent++;
        shv_billing_log($db2, 'out', (string)$ev['event'], 'ok',
          (string)($ev['summary'] ?? $ev['event']) . ' (' . (int)$r['latencyMs'] . ' ms)',
          ['id' => $id, 'httpCode' => (int)$r['httpCode']]);
      } else {
        $db2['billingOutbox'][$i]['status']    = 'failed';
        $db2['billingOutbox'][$i]['lastError'] = mb_substr((string)$r['error'], 0, 200);
        $failed++;
        shv_billing_log($db2, 'out', (string)$ev['event'], 'failed',
          (string)($ev['summary'] ?? $ev['event']) . ' — ' . mb_substr((string)$r['error'], 0, 120),
          ['id' => $id, 'httpCode' => (int)$r['httpCode']]);
      }
    }
    db_save($dbFile, $db2);
  } finally {
    if ($ownLock) {
      $GLOBALS['__shv_lock'] = null;
      @flock($lh, LOCK_UN);
    }
    if ($lh) { @fclose($lh); }
  }
  return ['ok' => true, 'sent' => $sent, 'failed' => $failed];
}

function shv_billing_schedule_flush(): void {
  if (!empty($GLOBALS['__shv_billing_flush_scheduled'])) return;
  $GLOBALS['__shv_billing_flush_scheduled'] = true;
  register_shutdown_function(static function (): void {
    /* Release the DB lock & finish the customer's HTTP response FIRST so
       storefront speed is 0 ms affected by the remote billing host. */
    if (!empty($GLOBALS['__shv_lock']) && is_resource($GLOBALS['__shv_lock'])) {
      @flock($GLOBALS['__shv_lock'], LOCK_UN);
      @fclose($GLOBALS['__shv_lock']);
      $GLOBALS['__shv_lock'] = null;
    }
    if (function_exists('fastcgi_finish_request')) {
      @fastcgi_finish_request();
    } elseif (function_exists('litespeed_finish_request')) {
      @litespeed_finish_request();
    }
    $dbFile = (string)($GLOBALS['DB_FILE'] ?? '');
    if ($dbFile !== '' && is_file($dbFile)) {
      try { shv_billing_flush_outbox($dbFile, 6, false); } catch (Throwable $e) {}
    }
  });
}

function shv_billing_enqueue(array &$db, string $event, string $dedupKey, string $summary, array $data, bool $skipDuplicateKey = false): ?array {
  if (shv_billing_secret($db) === '') return null; // bridge is dark — zero storage churn
  shv_billing_init_db($db);
  if ($skipDuplicateKey && $dedupKey !== '') {
    foreach ($db['billingOutbox'] as $existing) {
      if (is_array($existing) && (string)($existing['dedupKey'] ?? '') === $dedupKey) return null;
    }
  }
  $seq = (int)($db['billingOutboxSeq'] ?? 0) + 1;
  $db['billingOutboxSeq'] = $seq;
  $row = [
    'id'        => 'bev_' . $seq . '_' . bin2hex(random_bytes(4)),
    'seq'       => $seq,
    'event'     => $event,
    'dedupKey'  => $dedupKey,
    'summary'   => mb_substr($summary, 0, 180),
    'status'    => 'pending',
    'attempts'  => 0,
    'createdAt' => now_iso(),
    'data'      => $data,
  ];
  $db['billingOutbox'][] = $row;
  if (count($db['billingOutbox']) > 1500) {
    $db['billingOutbox'] = array_slice($db['billingOutbox'], -1200);
  }
  if (trim((string)($db['settings']['billingWebhookUrl'] ?? '')) !== '') {
    shv_billing_schedule_flush();
  }
  return $row;
}

function shv_billing_emit_customer(array &$db, array $u, string $event = 'customer.created', bool $onlyOnce = false): void {
  if (($u['role'] ?? 'customer') === 'admin') return;
  if (!shv_billing_flag($db, 'billingPushCustomers')) return;
  $p = shv_billing_customer_payload($db, $u);
  $label = 'Customer ' . ($p['name'] !== '' ? $p['name'] : $p['id']) . ($p['phone'] !== '' ? ' (' . $p['phone'] . ')' : '');
  shv_billing_enqueue($db, $event, $event . ':' . $p['id'], $label, $p, $onlyOnce);
}

function shv_billing_emit_lead(array &$db, string $channel, array $raw, bool $onlyOnce = false): void {
  if (!shv_billing_flag($db, 'billingPushLeads')) return;
  $p = shv_billing_lead_payload($channel, $raw);
  $who = $p['name'] !== '' ? $p['name'] : ($p['phone'] !== '' ? $p['phone'] : $p['email']);
  $label = 'Lead [' . $channel . ']' . ($who !== '' ? ' · ' . $who : '');
  shv_billing_enqueue($db, 'lead.created', 'lead:' . $p['leadId'], $label, $p, $onlyOnce);
}

function shv_billing_emit_order(array &$db, array $ord, string $event = 'order.created', bool $onlyOnce = false): void {
  if (!shv_billing_flag($db, 'billingPushOrders')) return;
  $p = shv_billing_order_payload($db, $ord);
  $label = 'Order ' . $p['id'] . ($p['invoiceNo'] !== '' ? ' (' . $p['invoiceNo'] . ')' : '') . ' · ₹' . (int)round($p['total']);
  shv_billing_enqueue($db, $event, $event . ':' . $p['id'], $label, $p, $onlyOnce);
  /* Guest checkout orders with a verified mobile also sync the buyer as a customer record. */
  if (!empty($p['guest']) && $p['phone'] !== '' && shv_billing_flag($db, 'billingPushCustomers')) {
    $ship = is_array($p['shippingAddress'] ?? null) ? $p['shippingAddress'] : [];
    $guestCust = [
      'id'               => 'guest_' . $p['phone'],
      'source'           => 'shivaa.in',
      'role'             => 'guest_customer',
      'name'             => $p['customerName'],
      'phone'            => $p['phone'],
      'email'            => $p['email'],
      'dob' => '', 'anniversary' => '', 'gender' => '',
      'city'             => (string)($ship['city'] ?? ''),
      'state'            => (string)($ship['state'] ?? ''),
      'pincode'          => (string)($ship['pincode'] ?? ''),
      'address'          => (string)($ship['line'] ?? $ship['address'] ?? ''),
      'defaultAddress'   => $ship,
      'addresses'        => $ship ? [$ship] : [],
      'firm' => '', 'contactPerson' => '', 'gstin' => '', 'pan' => '',
      'blackMember' => false, 'blackCardNo' => '', 'blackDiscountPct' => 0, 'blackExpiresAt' => '',
      'loyaltyPoints' => 0, 'createdAt' => $p['createdAt'],
    ];
    shv_billing_enqueue($db, 'customer.created', 'guest:' . $p['phone'],
      'Guest buyer ' . ($p['customerName'] ?: $p['phone']) . ' (' . $p['phone'] . ')', $guestCust, true);
  }
}

/* ── 8. Routes: /api/billing/* and /api/admin/billing/* ── */

function shv_billing_handle_route(string $route, string $method, array &$db, string $DB_FILE): void {
  $isBilling = ($route === 'billing' || str_starts_with($route, 'billing/'));
  $isAdmin   = ($route === 'admin/billing' || str_starts_with($route, 'admin/billing/'));
  if (!$isBilling && !$isAdmin) return;

  shv_billing_init_db($db);

  /* ── A. Signed Billing Software Endpoints (/api/billing/*) ── */

  if ($route === 'billing/ping' && in_array($method, ['GET', 'POST'], true)) {
    shv_billing_sync_auth($db);
    $clientTs = (int)($_SERVER['HTTP_X_SHIVAA_TS'] ?? time());
    $pending = 0;
    foreach ($db['billingOutbox'] as $e) if (($e['status'] ?? '') === 'pending') $pending++;
    jout(200, [
      'ok'               => true,
      'rel'              => SHV_BILLING_REL,
      'shop'             => (string)($db['settings']['shopName'] ?? 'Shivaa Jewels'),
      'serverTime'       => now_iso(),
      'clockSkewSec'     => time() - $clientTs,
      'billStorageReady' => shv_bill_private_dir() !== null,
      'webhookConfigured'=> trim((string)($db['settings']['billingWebhookUrl'] ?? '')) !== '',
      'capabilities'     => [
        'pushCustomers' => shv_billing_flag($db, 'billingPushCustomers'),
        'pushLeads'     => shv_billing_flag($db, 'billingPushLeads'),
        'pushOrders'    => shv_billing_flag($db, 'billingPushOrders'),
        'acceptBills'   => shv_billing_flag($db, 'billingAcceptBills'),
        'acceptStock'   => shv_billing_flag($db, 'billingAcceptStock'),
      ],
      'counts' => [
        'products'      => count($db['products'] ?? []),
        'customers'     => count(array_filter($db['users'] ?? [], fn($u) => ($u['role'] ?? 'customer') !== 'admin')),
        'bills'         => count($db['storeBills'] ?? []),
        'pendingEvents' => $pending,
      ],
    ]);
  }

  /* Automatic PDF Bill -> Customer Profile (#/my-bills) */
  if ($route === 'billing/bills' && $method === 'POST') {
    $in = shv_billing_sync_auth($db, true);
    rate_block($db, 'billing-bills', client_ip(), 600, 3600);
    if (!shv_billing_flag($db, 'billingAcceptBills')) {
      jout(403, ['ok' => false, 'error' => 'Incoming PDF bill sync is switched off in Shivaa Admin → Settings.']);
    }
    if (shv_bill_private_dir() === null) {
      jout(503, ['ok' => false, 'error' => 'Private bill storage (.shivaa-private-bills beside public_html) is unavailable on the server.']);
    }

    $billNo = mb_substr(trim((string)($in['billNo'] ?? $in['invoiceNo'] ?? '')), 0, 40);
    $extRaw = trim((string)($in['externalId'] ?? $in['billId'] ?? $billNo));
    $extId  = mb_substr((string)preg_replace('/[^A-Za-z0-9_:\-\/.]/', '', $extRaw), 0, 80);
    $cName  = mb_substr(trim((string)($in['customerName'] ?? $in['name'] ?? '')), 0, 120);
    $phone  = shv_billing_norm_phone((string)($in['phone'] ?? $in['mobile'] ?? $in['customerPhone'] ?? ''));
    $email  = shv_billing_real_email((string)($in['email'] ?? ''));
    $store  = mb_substr(trim((string)($in['store'] ?? '')), 0, 120);
    if ($store === '') $store = 'Shivaa Jewels · Jaipur';
    $bDate  = trim((string)($in['billDate'] ?? $in['date'] ?? date('Y-m-d')));
    if (preg_match('#^(\d{2})[/\-](\d{2})[/\-](\d{4})$#', $bDate, $mDMY)) {
      $bDate = $mDMY[3] . '-' . $mDMY[2] . '-' . $mDMY[1]; // accept Indian DD-MM-YYYY / DD/MM/YYYY seamlessly
    } elseif (strlen($bDate) > 10) {
      $bDate = substr($bDate, 0, 10);
    }
    $amount = is_numeric($in['amount'] ?? $in['total'] ?? null)
      ? round(max(0.0, min(100000000.0, (float)($in['amount'] ?? $in['total']))), 2) : 0.0;
    $notes  = mb_substr(trim((string)($in['notes'] ?? '')), 0, 600);

    /* Items may be a plain description string OR structured line items. */
    $lineItems = [];
    $itemsText = '';
    if (is_array($in['items'] ?? null)) {
      $lineItems = $in['items'];
      $parts = [];
      foreach ($lineItems as $li) {
        if (!is_array($li)) { if (is_scalar($li) && trim((string)$li) !== '') $parts[] = trim((string)$li); continue; }
        $s = trim((string)($li['name'] ?? $li['title'] ?? $li['sku'] ?? 'Jewellery'));
        if (!empty($li['purity']))  $s .= ' ' . trim((string)$li['purity']);
        if (!empty($li['weightG'])) $s .= ' · ' . round((float)$li['weightG'], 3) . ' g';
        if ((int)($li['qty'] ?? 1) > 1) $s .= ' ×' . (int)$li['qty'];
        $parts[] = $s;
      }
      $itemsText = mb_substr(implode(', ', $parts), 0, 600);
    } else {
      $itemsText = mb_substr(trim((string)($in['items'] ?? '')), 0, 600);
      if (is_array($in['lineItems'] ?? null)) $lineItems = $in['lineItems'];
    }

    if ($billNo === '')  jout(400, ['ok' => false, 'error' => 'billNo is required.']);
    if ($extId === '')   $extId = 'bill_' . md5($billNo . '|' . $phone);
    if ($cName === '')   jout(400, ['ok' => false, 'error' => 'customerName is required.']);
    if ($phone === '')   jout(400, ['ok' => false, 'error' => 'A valid 10-digit Indian customer mobile (phone) is required to link the bill to their Shivaa profile.']);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $bDate)) jout(400, ['ok' => false, 'error' => 'billDate must be YYYY-MM-DD.']);
    if (strcmp($bDate, date('Y-m-d', time() + 86400)) > 0) jout(400, ['ok' => false, 'error' => 'billDate cannot be in the future.']);

    /* Store incoming PDF(s) / image(s) — verified by magic bytes, capped at 6 × 8 MB. */
    $storedFiles = [];
    if (!empty($_FILES)) {
      $up = bill_files_from_upload([], 6);
      if ($up === null) jout(400, ['ok' => false, 'error' => 'Invalid upload — attach up to 6 real PDF/JPG/PNG/WEBP files (≤8 MB each).']);
      $storedFiles = $up;
    } else {
      $rawList = [];
      if (is_array($in['files'] ?? null) && $in['files']) {
        $rawList = $in['files'];
      } elseif (!empty($in['pdfBase64']) && is_string($in['pdfBase64'])) {
        $rawList = [['base64' => $in['pdfBase64'], 'filename' => (string)($in['filename'] ?? ($billNo . '.pdf'))]];
      }
      if (count($rawList) > 6) {
        jout(400, ['ok' => false, 'error' => 'At most 6 files per bill are allowed.']);
      }
      foreach ($rawList as $fi => $fObj) {
        if (!is_array($fObj)) continue;
        $b64 = (string)($fObj['base64'] ?? $fObj['pdfBase64'] ?? $fObj['data'] ?? '');
        $bin = shv_billing_decode_base64_file($b64);
        if ($bin === null || strlen($bin) > 8388608) {
          foreach ($storedFiles as $sf) shv_bill_unlink((string)$sf['ref']);
          jout(400, ['ok' => false, 'error' => 'File #' . ($fi + 1) . ' must be valid base64 under 8 MB.']);
        }
        $saved = shv_billing_store_bytes($bin);
        if ($saved === null) {
          foreach ($storedFiles as $sf) shv_bill_unlink((string)$sf['ref']);
          jout(400, ['ok' => false, 'error' => 'File #' . ($fi + 1) . ' must be a genuine PDF, JPG, PNG or WEBP document (≤8 MB).']);
        }
        $fname = trim((string)($fObj['filename'] ?? $fObj['label'] ?? ($billNo . '.' . $saved['ext'])));
        $label = mb_substr(basename($fname), 0, 80);
        $storedFiles[] = [
          'ref'          => $saved['ref'],
          'ext'          => $saved['ext'],
          'size'         => $saved['size'],
          'label'        => $label,
          'originalName' => $label,
          'uploadedAt'   => now_iso(),
        ];
      }
    }

    /* Check for existing bill with the same externalId (idempotent upsert). */
    $existingIdx = null;
    foreach (($db['storeBills'] ?? []) as $i => $b) {
      if (is_array($b) && (string)($b['externalId'] ?? '') === $extId && empty($b['anonymizedAt'])) {
        $existingIdx = (int)$i;
        break;
      }
    }
    $replace = !array_key_exists('replace', $in) || !empty($in['replace']);
    if ($existingIdx !== null && !$replace) {
      foreach ($storedFiles as $sf) shv_bill_unlink((string)$sf['ref']);
      $cur = $db['storeBills'][$existingIdx];
      jout(200, ['ok' => true, 'duplicate' => true, 'created' => false, 'updated' => false,
        'linked' => (string)($cur['userId'] ?? '') !== '', 'userId' => (string)($cur['userId'] ?? ''),
        'billId' => (string)$cur['id'], 'externalId' => $extId, 'bill' => bill_public($cur, true)]);
    }
    if ($existingIdx === null && count($storedFiles) < 1) {
      jout(400, ['ok' => false, 'error' => 'Attach the bill PDF (pdfBase64, files[], or multipart file).']);
    }

    if ($existingIdx !== null) {
      $row = $db['storeBills'][$existingIdx];
      if ($storedFiles) {
        foreach (($row['files'] ?? []) as $oldF) {
          if (is_array($oldF) && !empty($oldF['ref'])) shv_bill_unlink((string)$oldF['ref']);
        }
        $row['files'] = $storedFiles;
      }
      $row['billNo']       = $billNo;
      $row['billDate']     = $bDate;
      $row['store']        = $store;
      $row['customerName'] = $cName;
      $row['phone']        = $phone;
      $row['amount']       = $amount;
      $row['items']        = $itemsText;
      if ($notes !== '') $row['notes'] = $notes;
      $row['source']       = 'billing-sync';
      $row['externalId']   = $extId;
      $row['userId']       = '';
      $linked = bill_link_user($db, $row);
      if (!$linked && $email !== '') {
        foreach (($db['users'] ?? []) as $u) {
          if (($u['role'] ?? 'customer') === 'customer' && strtolower((string)($u['email'] ?? '')) === $email) {
            $row['userId'] = (string)$u['id']; $linked = true; break;
          }
        }
      }
      $row['updatedAt'] = now_iso();
      $db['storeBills'][$existingIdx] = $row;
      $created = false; $updated = true;
    } else {
      $row = [
        'id'           => uid('sb'),
        'externalId'   => $extId,
        'source'       => 'billing-sync',
        'billNo'       => $billNo,
        'billDate'     => $bDate,
        'store'        => $store,
        'customerName' => $cName,
        'phone'        => $phone,
        'userId'       => '',
        'amount'       => $amount,
        'items'        => $itemsText,
        'notes'        => $notes,
        'files'        => $storedFiles,
        'createdBy'    => 'billing-sync',
        'createdAt'    => now_iso(),
        'updatedAt'    => now_iso(),
      ];
      $linked = bill_link_user($db, $row);
      if (!$linked && $email !== '') {
        foreach (($db['users'] ?? []) as $u) {
          if (($u['role'] ?? 'customer') === 'customer' && strtolower((string)($u['email'] ?? '')) === $email) {
            $row['userId'] = (string)$u['id']; $linked = true; break;
          }
        }
      }
      $db['storeBills'][] = $row;
      $created = true; $updated = false;
    }

    /* Optional atomic SKU stock deduction for line items sold on this bill. */
    $stockResults = [];
    if ((!empty($in['adjustStock']) || !empty($in['deductStock'])) && shv_billing_flag($db, 'billingAcceptStock') && $lineItems) {
      foreach ($lineItems as $idx => $li) {
        if (!is_array($li)) continue;
        $sku = trim((string)($li['sku'] ?? ''));
        $pid = trim((string)($li['productId'] ?? ''));
        if ($sku === '' && $pid === '') continue;
        $qty = max(1, (int)($li['qty'] ?? 1));
        $stockResults[] = shv_billing_apply_movement($db, [
          'movementId' => substr('bill:' . $extId . ':' . $idx . ':' . ($sku !== '' ? $sku : $pid), 0, 80),
          'sku'        => $sku,
          'productId'  => $pid,
          'delta'      => -$qty,
          'ref'        => $billNo,
          'note'       => 'Showroom bill ' . $billNo,
        ]);
      }
    }

    audit_log($db, $created ? 'billing.bill.create' : 'billing.bill.update', [
      'id' => $row['id'], 'externalId' => $extId, 'billNo' => $billNo,
      'files' => count($row['files'] ?? []), 'linked' => $linked, 'userId' => $row['userId'],
    ]);
    shv_billing_log($db, 'in', $created ? 'bill.created' : 'bill.updated', 'ok',
      'PDF Bill ' . $billNo . ' · ' . $cName . ' (' . $phone . ') · ₹' . (int)round($amount) . ($linked ? ' → linked to profile' : ' → ready for mobile login'),
      ['billId' => $row['id'], 'billNo' => $billNo, 'linked' => $linked]);
    db_save($DB_FILE, $db);

    jout(200, [
      'ok'           => true,
      'created'      => $created,
      'updated'      => $updated,
      'linked'       => $linked,
      'userId'       => (string)$row['userId'],
      'billId'       => (string)$row['id'],
      'externalId'   => $extId,
      'billNo'       => $billNo,
      'filesStored'  => count($row['files'] ?? []),
      'profileRoute' => '#/my-bills',
      'stockResults' => $stockResults,
      'bill'         => bill_public($row, true),
    ]);
  }

  if ($route === 'billing/bills' && $method === 'GET') {
    shv_billing_sync_auth($db);
    $limit  = (int)clampn((int)($_GET['limit'] ?? 100), 1, 1000);
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $qPhone = shv_billing_norm_phone((string)($_GET['phone'] ?? ''));
    $qExt   = trim((string)($_GET['externalId'] ?? ''));
    $qNo    = trim((string)($_GET['billNo'] ?? ''));
    $rows   = [];
    foreach (array_reverse($db['storeBills'] ?? []) as $b) {
      if (!is_array($b)) continue;
      if ($qPhone !== '' && shv_billing_norm_phone((string)($b['phone'] ?? '')) !== $qPhone) continue;
      if ($qExt   !== '' && (string)($b['externalId'] ?? '') !== $qExt) continue;
      if ($qNo    !== '' && strcasecmp((string)($b['billNo'] ?? ''), $qNo) !== 0) continue;
      $rows[] = bill_public($b, true);
    }
    $total = count($rows);
    jout(200, ['ok' => true, 'bills' => array_slice($rows, $offset, $limit), 'total' => $total, 'offset' => $offset, 'limit' => $limit]);
  }

  if (($route === 'billing/bill-void' && $method === 'POST')
      || (preg_match('#^billing/bills/([A-Za-z0-9_:\-.]{1,80})$#', $route, $mBV) && $method === 'DELETE')) {
    $in = shv_billing_sync_auth($db);
    if (!shv_billing_flag($db, 'billingAcceptBills')) {
      jout(403, ['ok' => false, 'error' => 'Incoming bill sync is switched off in Shivaa Admin → Settings.']);
    }
    $extId = isset($mBV[1]) ? (string)$mBV[1] : trim((string)($in['externalId'] ?? $in['billNo'] ?? ''));
    $reason = mb_substr(trim((string)($in['reason'] ?? '')), 0, 200);
    if ($extId === '') jout(400, ['ok' => false, 'error' => 'externalId is required.']);
    $hit = null;
    foreach (($db['storeBills'] ?? []) as $i => $b) {
      if (!is_array($b)) continue;
      if ((string)($b['externalId'] ?? '') === $extId || (string)($b['id'] ?? '') === $extId) {
        $hit = (int)$i; break;
      }
    }
    if ($hit === null) jout(404, ['ok' => false, 'error' => 'No synced bill found for externalId ' . $extId]);
    $row = $db['storeBills'][$hit];
    $gone = 0;
    foreach (($row['files'] ?? []) as $f) if (is_array($f) && shv_bill_unlink((string)($f['ref'] ?? ''))) $gone++;
    array_splice($db['storeBills'], $hit, 1);
    audit_log($db, 'billing.bill.void', ['id' => $row['id'], 'externalId' => $extId, 'billNo' => $row['billNo'] ?? '', 'reason' => $reason, 'filesUnlinked' => $gone]);
    shv_billing_log($db, 'in', 'bill.voided', 'ok', 'Voided bill ' . ($row['billNo'] ?? $extId) . ($reason !== '' ? ' (' . $reason . ')' : ''));
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'voided' => $extId, 'billId' => (string)$row['id'], 'filesUnlinked' => $gone]);
  }

  /* Catalogue & SKU Stock Snapshot */
  if ($route === 'billing/stock' && $method === 'GET') {
    shv_billing_sync_auth($db);
    $limit  = (int)clampn((int)($_GET['limit'] ?? 500), 1, 5000);
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $qSku   = trim((string)($_GET['sku'] ?? ''));
    $qCat   = trim((string)($_GET['category'] ?? ''));
    $R      = current_rates($db);
    $rows   = [];
    foreach (($db['products'] ?? []) as $p) {
      if (!is_array($p)) continue;
      if ($qSku !== '' && strcasecmp((string)($p['sku'] ?? ''), $qSku) !== 0) continue;
      if ($qCat !== '' && strcasecmp((string)($p['category'] ?? ''), $qCat) !== 0) continue;
      $price = compute_price($p, $R);
      $rows[] = [
        'id'       => (string)($p['id'] ?? ''),
        'sku'      => (string)($p['sku'] ?? ''),
        'name'     => (string)($p['name'] ?? ''),
        'category' => (string)($p['category'] ?? ''),
        'metal'    => (string)($p['metal'] ?? 'Gold'),
        'purity'   => (string)($p['purity'] ?? '22K'),
        'weightG'  => (float)($p['weightG'] ?? 0),
        'mcScheme' => (string)($p['mcScheme'] ?? 'percent'),
        'mcValue'  => (float)($p['mcValue'] ?? 0),
        'stoneValue'=> (float)($p['stoneValue'] ?? 0),
        'stock'    => (int)($p['stock'] ?? 0),
        'active'   => !empty($p['active']),
        'status'   => (string)($p['status'] ?? 'live'),
        'price'    => $price,
      ];
    }
    $total = count($rows);
    jout(200, ['ok' => true, 'products' => array_slice($rows, $offset, $limit),
      'total' => $total, 'offset' => $offset, 'limit' => $limit, 'rates' => $R, 'asOf' => now_iso()]);
  }

  /* Counter Stock Movement (single or batch) */
  if ($route === 'billing/stock-movement' && $method === 'POST') {
    $b = shv_billing_sync_auth($db);
    rate_block($db, 'billing-sync', client_ip(), 600, 3600);
    if (!shv_billing_flag($db, 'billingAcceptStock')) {
      jout(403, ['ok' => false, 'error' => 'Incoming stock sync is switched off in Shivaa Admin → Settings.']);
    }
    if (is_array($b['movements'] ?? null)) {
      $list = array_slice($b['movements'], 0, 100);
      if (!$list) jout(400, ['ok' => false, 'error' => 'movements array is empty.']);
      $results = []; $applied = 0;
      foreach ($list as $m) {
        if (!is_array($m)) continue;
        $r = shv_billing_apply_movement($db, $m);
        $results[] = $r;
        if (!empty($r['ok']) && empty($r['duplicate'])) {
          $applied++;
          audit_log($db, 'billing.stock-movement', ['movementId' => $r['movementId'],
            'delta' => $r['result']['delta'], 'productId' => $r['result']['productId']]);
        }
      }
      if ($applied > 0) {
        shv_billing_log($db, 'in', 'stock.batch', 'ok', 'Updated stock on ' . $applied . ' SKU(s)');
        db_save($DB_FILE, $db);
      }
      jout(200, ['ok' => true, 'applied' => $applied, 'results' => $results]);
    }
    $r = shv_billing_apply_movement($db, $b);
    if (empty($r['ok'])) {
      jout(!empty($r['notFound']) ? 404 : 400, $r);
    }
    if (empty($r['duplicate'])) {
      audit_log($db, 'billing.stock-movement', ['movementId' => $r['movementId'],
        'delta' => $r['result']['delta'], 'productId' => $r['result']['productId']]);
      shv_billing_log($db, 'in', 'stock.movement', 'ok',
        'SKU ' . ($r['result']['sku'] ?: $r['result']['productId']) . ': ' . $r['result']['stockBefore'] . ' → ' . $r['result']['stockAfter']
        . ($r['result']['ref'] !== '' ? ' (' . $r['result']['ref'] . ')' : ''));
      db_save($DB_FILE, $db);
    }
    jout(200, $r);
  }

  /* Live Gold/Silver Rates & Making Charges */
  if ($route === 'billing/rates' && $method === 'GET') {
    shv_billing_sync_auth($db);
    $chg = false;
    $rates = shv_rates_payload($db, $chg, $DB_FILE);
    jout(200, [
      'ok'            => true,
      'retail'        => current_rates($db),
      'rates'         => $rates,
      'makingCharges' => $db['makingCharges'] ?? [],
      'gstPct'        => 3,
      'asOf'          => now_iso(),
    ]);
  }

  /* Pull Snapshots: Customers, Leads, Orders & Incremental Event Stream */
  if ($route === 'billing/customers' && $method === 'GET') {
    shv_billing_sync_auth($db);
    $limit  = (int)clampn((int)($_GET['limit'] ?? 200), 1, 2000);
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $since  = trim((string)($_GET['since'] ?? ''));
    $q      = strtolower(trim((string)($_GET['q'] ?? '')));
    $rows   = [];
    foreach (($db['users'] ?? []) as $u) {
      if (!is_array($u) || ($u['role'] ?? 'customer') === 'admin' || !empty($u['anonymizedAt'])) continue;
      $c = shv_billing_customer_payload($db, $u);
      if ($since !== '' && strcmp((string)$c['createdAt'], $since) < 0) continue;
      if ($q !== '') {
        $hay = strtolower($c['name'] . ' ' . $c['phone'] . ' ' . $c['email'] . ' ' . $c['firm'] . ' ' . $c['gstin']);
        if (!str_contains($hay, $q)) continue;
      }
      $rows[] = $c;
    }
    $rows = array_reverse($rows);
    $total = count($rows);
    jout(200, ['ok' => true, 'customers' => array_slice($rows, $offset, $limit),
      'total' => $total, 'offset' => $offset, 'limit' => $limit, 'asOf' => now_iso()]);
  }

  if ($route === 'billing/leads' && $method === 'GET') {
    shv_billing_sync_auth($db);
    $limit   = (int)clampn((int)($_GET['limit'] ?? 200), 1, 2000);
    $offset  = max(0, (int)($_GET['offset'] ?? 0));
    $channel = trim((string)($_GET['channel'] ?? ''));
    $since   = trim((string)($_GET['since'] ?? ''));
    $rows    = shv_billing_collect_all_leads($db, $channel, $since);
    $total   = count($rows);
    jout(200, ['ok' => true, 'leads' => array_slice($rows, $offset, $limit),
      'total' => $total, 'offset' => $offset, 'limit' => $limit, 'asOf' => now_iso()]);
  }

  if ($route === 'billing/orders' && $method === 'GET') {
    shv_billing_sync_auth($db);
    $limit  = (int)clampn((int)($_GET['limit'] ?? 200), 1, 2000);
    $offset = max(0, (int)($_GET['offset'] ?? 0));
    $since  = trim((string)($_GET['since'] ?? ''));
    $status = trim((string)($_GET['status'] ?? ''));
    $rows   = [];
    foreach (array_reverse($db['orders'] ?? []) as $o) {
      if (!is_array($o)) continue;
      if ($status !== '' && strcasecmp((string)($o['paymentStatus'] ?? ''), $status) !== 0
          && strcasecmp((string)($o['status'] ?? ''), $status) !== 0) continue;
      if ($since !== '' && strcmp((string)($o['createdAt'] ?? ''), $since) < 0) continue;
      $rows[] = shv_billing_order_payload($db, $o);
    }
    $total = count($rows);
    jout(200, ['ok' => true, 'orders' => array_slice($rows, $offset, $limit),
      'total' => $total, 'offset' => $offset, 'limit' => $limit, 'asOf' => now_iso()]);
  }

  if ($route === 'billing/events' && $method === 'GET') {
    shv_billing_sync_auth($db);
    $after = max(0, (int)($_GET['after'] ?? $_GET['since_seq'] ?? 0));
    $limit = (int)clampn((int)($_GET['limit'] ?? 100), 1, 500);
    $out   = [];
    $more  = false;
    foreach ($db['billingOutbox'] as $ev) {
      if (!is_array($ev) || (int)($ev['seq'] ?? 0) <= $after) continue;
      if (count($out) >= $limit) { $more = true; break; }
      $out[] = [
        'id'        => (string)$ev['id'],
        'seq'       => (int)$ev['seq'],
        'event'     => (string)$ev['event'],
        'createdAt' => (string)($ev['createdAt'] ?? ''),
        'data'      => $ev['data'] ?? [],
      ];
    }
    jout(200, ['ok' => true, 'events' => $out, 'lastSeq' => (int)$db['billingOutboxSeq'], 'hasMore' => $more]);
  }

  if ($route === 'billing/events/ack' && $method === 'POST') {
    $b = shv_billing_sync_auth($db);
    $ids = array_flip(array_filter(array_map('strval', (array)($b['ids'] ?? []))));
    $acked = 0;
    foreach ($db['billingOutbox'] as $i => $ev) {
      if (isset($ids[(string)($ev['id'] ?? '')]) && ($ev['status'] ?? '') !== 'delivered') {
        $db['billingOutbox'][$i]['status']      = 'delivered';
        $db['billingOutbox'][$i]['deliveredAt'] = now_iso();
        $db['billingOutbox'][$i]['via']         = 'pull';
        $acked++;
      }
    }
    if ($acked > 0) db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'acked' => $acked]);
  }

  /* ── B. Owner Admin Endpoints (/api/admin/billing/*) ── */

  if ($route === 'admin/billing/status' && $method === 'GET') {
    need_admin($db);
    $pending = 0; $delivered = 0; $failed = 0;
    foreach ($db['billingOutbox'] as $ev) {
      $st = (string)($ev['status'] ?? 'pending');
      if ($st === 'delivered') $delivered++;
      elseif ($st === 'failed') $failed++;
      else $pending++;
    }
    $syncedBills = 0;
    foreach (($db['storeBills'] ?? []) as $b) {
      if (is_array($b) && (($b['source'] ?? '') === 'billing-sync' || ($b['createdBy'] ?? '') === 'billing-sync')) $syncedBills++;
    }
    $customersTotal = count(array_filter($db['users'] ?? [], fn($u) => is_array($u) && ($u['role'] ?? 'customer') !== 'admin' && empty($u['anonymizedAt'])));
    $leadsTotal = count(shv_billing_collect_all_leads($db));
    $keySet = shv_billing_secret($db) !== '';
    $whUrl  = trim((string)($db['settings']['billingWebhookUrl'] ?? ''));
    $appUrl = trim((string)($db['settings']['billingAppUrl'] ?? ''));
    $outboxTail = array_map(static fn($e) => [
      'id' => $e['id'] ?? '', 'seq' => $e['seq'] ?? 0, 'event' => $e['event'] ?? '',
      'summary' => $e['summary'] ?? '', 'status' => $e['status'] ?? 'pending',
      'attempts' => $e['attempts'] ?? 0, 'httpCode' => $e['httpCode'] ?? 0,
      'latencyMs' => $e['latencyMs'] ?? 0, 'lastError' => $e['lastError'] ?? '',
      'createdAt' => $e['createdAt'] ?? '', 'deliveredAt' => $e['deliveredAt'] ?? '',
    ], array_slice(array_reverse($db['billingOutbox']), 0, 15));

    jout(200, [
      'ok'               => true,
      'configured'       => $keySet,
      'twoWayReady'      => $keySet && $whUrl !== '',
      'appUrl'           => $appUrl,
      'webhookUrl'       => $whUrl,
      'billStorageReady' => shv_bill_private_dir() !== null,
      'switches'         => [
        'billingPushCustomers' => shv_billing_flag($db, 'billingPushCustomers'),
        'billingPushLeads'     => shv_billing_flag($db, 'billingPushLeads'),
        'billingPushOrders'    => shv_billing_flag($db, 'billingPushOrders'),
        'billingAcceptBills'   => shv_billing_flag($db, 'billingAcceptBills'),
        'billingAcceptStock'   => shv_billing_flag($db, 'billingAcceptStock'),
      ],
      'counts' => [
        'pending'        => $pending,
        'delivered'      => $delivered,
        'failed'         => $failed,
        'syncedBills'    => $syncedBills,
        'totalBills'     => count($db['storeBills'] ?? []),
        'stockMovements' => count($db['billingMovements'] ?? []),
        'customersTotal' => $customersTotal,
        'leadsTotal'     => $leadsTotal,
        'ordersTotal'    => count($db['orders'] ?? []),
      ],
      'recentLog'    => array_slice(array_reverse($db['billingSyncLog']), 0, 20),
      'recentOutbox' => $outboxTail,
    ]);
  }

  if ($route === 'admin/billing/test' && $method === 'POST') {
    need_admin($db);
    $secret = shv_billing_secret($db);
    $url    = trim((string)($db['settings']['billingWebhookUrl'] ?? ''));
    if ($secret === '') jout(400, ['ok' => false, 'error' => 'Save a Billing Sync Key first.']);
    if ($url === '')    jout(400, ['ok' => false, 'error' => 'Save your Billing Webhook URL (e.g. https://your-billing-site.com/shivaa-connector.php) first.']);
    $pingId = 'ping_' . bin2hex(random_bytes(4));
    $res = shv_billing_deliver_http($url, $secret, 'billing.ping', $pingId, [
      'id' => $pingId, 'event' => 'billing.ping', 'sentAt' => now_iso(),
      'shop' => 'shivaa.in', 'rel' => SHV_BILLING_REL, 'data' => ['test' => true],
    ], 8);
    $lh = null;
    $ownLock = false;
    if (empty($GLOBALS['__shv_lock'])) {
      $lh = @fopen($DB_FILE . '.lock', 'c');
      if ($lh && @flock($lh, LOCK_EX)) {
        $GLOBALS['__shv_lock'] = $lh;
        $ownLock = true;
      }
    }
    try {
      $db2 = db_load($DB_FILE);
      shv_billing_init_db($db2);
      shv_billing_log($db2, 'out', 'billing.ping', !empty($res['ok']) ? 'ok' : 'failed',
        !empty($res['ok'])
          ? 'Connection test passed (' . (int)$res['latencyMs'] . ' ms · storage: ' . (string)($res['reply']['storage'] ?? 'ok') . ')'
          : 'Connection test failed — ' . (string)$res['error']);
      db_save($DB_FILE, $db2);
    } finally {
      if ($ownLock) {
        $GLOBALS['__shv_lock'] = null;
        @flock($lh, LOCK_UN);
      }
      if ($lh) @fclose($lh);
    }
    jout(200, $res);
  }

  if ($route === 'admin/billing/retry' && $method === 'POST') {
    need_admin($db);
    $res = shv_billing_flush_outbox($DB_FILE, 25, true);
    jout(200, $res);
  }

  if ($route === 'admin/billing/backfill' && $method === 'POST') {
    need_admin($db);
    if (shv_billing_secret($db) === '') {
      jout(400, ['ok' => false, 'error' => 'Save a Billing Sync Key first.']);
    }
    $b = body_json();
    $wantCust  = !array_key_exists('customers', $b) || !empty($b['customers']);
    $wantLeads = !array_key_exists('leads', $b)     || !empty($b['leads']);
    $wantOrd   = !empty($b['orders']);
    $queued = ['customers' => 0, 'leads' => 0, 'orders' => 0];

    if ($wantCust) {
      foreach (($db['users'] ?? []) as $u) {
        if (!is_array($u) || ($u['role'] ?? 'customer') === 'admin' || !empty($u['anonymizedAt'])) continue;
        $p = shv_billing_customer_payload($db, $u);
        if (shv_billing_enqueue($db, 'customer.created', 'customer.created:' . $p['id'],
            'Customer ' . ($p['name'] ?: $p['id']) . ($p['phone'] !== '' ? ' (' . $p['phone'] . ')' : ''), $p, true)) {
          $queued['customers']++;
        }
      }
    }
    if ($wantLeads) {
      foreach (array_reverse(shv_billing_collect_all_leads($db)) as $lp) {
        $who = $lp['name'] !== '' ? $lp['name'] : ($lp['phone'] !== '' ? $lp['phone'] : $lp['email']);
        if (shv_billing_enqueue($db, 'lead.created', 'lead:' . $lp['leadId'],
            'Lead [' . $lp['channel'] . ']' . ($who !== '' ? ' · ' . $who : ''), $lp, true)) {
          $queued['leads']++;
        }
      }
    }
    if ($wantOrd) {
      foreach (($db['orders'] ?? []) as $o) {
        if (!is_array($o)) continue;
        $ev = (($o['paymentStatus'] ?? '') === 'Paid') ? 'order.paid' : 'order.created';
        $op = shv_billing_order_payload($db, $o);
        if (shv_billing_enqueue($db, $ev, $ev . ':' . $op['id'],
            'Order ' . $op['id'] . ($op['invoiceNo'] !== '' ? ' (' . $op['invoiceNo'] . ')' : ''), $op, true)) {
          $queued['orders']++;
        }
      }
    }
    $totalQ = $queued['customers'] + $queued['leads'] + $queued['orders'];
    audit_log($db, 'billing.backfill', $queued);
    shv_billing_log($db, 'out', 'billing.backfill', 'queued',
      'Queued ' . $queued['customers'] . ' customer(s), ' . $queued['leads'] . ' lead(s), ' . $queued['orders'] . ' order(s)');
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'queued' => $queued, 'totalQueued' => $totalQ,
      'willDeliverNow' => trim((string)($db['settings']['billingWebhookUrl'] ?? '')) !== '']);
  }

  if ($route === 'admin/billing/connector' && $method === 'GET') {
    need_admin($db);
    $base = trim((string)($db['settings']['siteBaseUrl'] ?? ''));
    if ($base === '') {
      $host = (string)($_SERVER['HTTP_HOST'] ?? 'www.shivaa.in');
      $host = (string)preg_replace('/[^A-Za-z0-9.\-:]/', '', $host);
      $base = 'https://' . ($host !== '' ? $host : 'www.shivaa.in');
    }
    $base = rtrim($base, '/');
    $src = shv_billing_connector_template($base);
    header('Content-Type: application/octet-stream; charset=utf-8');
    header('Content-Disposition: attachment; filename="shivaa-connector.php"');
    header('Content-Length: ' . strlen($src));
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    echo $src;
    exit;
  }

  jout(404, ['ok' => false, 'error' => 'Unknown billing route: ' . $route]);
}

function shv_billing_connector_template(string $shopUrl): string {
  $clean = rtrim(trim($shopUrl), '/');
  if (!preg_match('#\Ahttps://[A-Za-z0-9.\-]+(?::\d{2,5})?\z#', $clean)) {
    $clean = 'https://www.shivaa.in';
  }
  $tplFile = __DIR__ . '/docs/shivaa-connector.php.txt';
  if (is_file($tplFile)) {
    $raw = (string)file_get_contents($tplFile);
    return (string)str_replace("'https://www.shivaa.in'", "'{$clean}'", $raw);
  }
  return "<?php\n// Connector template file missing — download billing-connector/shivaa-connector.php from repository.\n";
}
