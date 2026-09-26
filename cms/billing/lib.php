<?php
/**
 * Shivaa Jewels — Billing · core library
 *
 * Reads MySQL credentials from the shop's own config.php one directory up,
 * so the billing app and the shop share one database and one set of
 * credentials. Nothing here writes to a shop table.
 */
declare(strict_types=1);

const BILLING_VERSION = 6;
const BILLING_SESSION = 'shivaa_billing';
const BILLING_CSRF = 'shivaa_billing_csrf';

/* ── domain vocabulary (mirrors the original app so nothing is lost) ───── */
const BILLING_CATEGORIES = [
  'Rings', 'Bangles', 'Necklaces', 'Earrings', 'Chains', 'Mangalsutra', 'Pendants',
  'Bracelets', 'Coins', 'Bars', 'Stone', 'CZ', 'Paper Casting', 'Regular Casting',
  'Loose Diamonds', 'Raw Metal',
];
/* Plain karat labels, exactly as shivaa_erp.tsx uses them. The fineness
   number lives in BILLING_FINENESS so the label stays short but the maths
   stays exact. */
const BILLING_PURITIES = ['24K', '22K', '20K', '18K', '14K', '9K', '92.5 Silver'];
const BILLING_METALS = ['Gold', 'Silver', 'Platinum', 'Both'];
const BILLING_FINENESS = [
  '24K' => 0.999, '22K' => 0.916, '20K' => 0.833, '19K' => 0.791,
  '18K' => 0.750, '14K' => 0.585, '9K' => 0.375, '92.5 Silver' => 0.925,
];
const BILLING_PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'RTGS'];
const BILLING_EXPENSE_CATEGORIES = [
  'General', 'Rent', 'Salary', 'Electricity', 'Karigar Labour', 'Packaging',
  'Transport', 'Hallmarking', 'Tea & Misc', 'Other',
];
/* A bill is either retail or trade, and either online or over the counter. */
const BILLING_CHANNELS = [
  'b2c_online'  => 'Online retail',
  'b2c_offline' => 'Counter retail',
  'b2b'         => 'Wholesale (jeweller)',
];
const BILLING_STOCK_CHANNELS = [
  'online_b2c', 'offline_b2c', 'offline_b2b', 'karigar', 'purchase', 'correction',
];

/* ── database ───────────────────────────────────────────────────────────── */

function billing_config(): array {
  $file = dirname(__DIR__) . '/config.php';
  $cfg = is_file($file) ? require $file : null;
  $ms = (is_array($cfg) && isset($cfg['mysql']) && is_array($cfg['mysql'])) ? $cfg['mysql'] : [];
  return $ms;
}

function billing_config_ok(array $ms): bool {
  return !empty($ms['dbname']) && $ms['dbname'] !== 'YOUR_HOSTINGER_DB_NAME';
}

function billing_db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;
  $ms = billing_config();
  if (!billing_config_ok($ms)) {
    throw new RuntimeException('The shop config.php is missing or still holds placeholder database details.');
  }
  $dsn = 'mysql:host=' . $ms['host'] . ';port=' . (int)($ms['port'] ?? 3306)
       . ';dbname=' . $ms['dbname'] . ';charset=' . ($ms['charset'] ?? 'utf8mb4');
  $pdo = new PDO($dsn, (string)$ms['username'], (string)$ms['password'], [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
  ]);
  return $pdo;
}

/** Refuse to run anything that is not a billing_* CREATE TABLE. */
function billing_safe_ddl(string $stmt): bool {
  if (!preg_match('/^CREATE TABLE IF NOT EXISTS `billing_[a-z_]+` \(/', $stmt)) return false;
  return !preg_match('/\b(DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|RENAME)\b/i', $stmt);
}

/* ── output ─────────────────────────────────────────────────────────────── */

function billing_json($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function billing_fail(string $message, int $status = 400): void {
  billing_json(['ok' => false, 'error' => $message], $status);
}

function billing_input(): array {
  /* php://input can only be read once per request, so the decoded body is
     cached. inbox.php has to read it to check the bridge token before the
     route it forwards to reads it again. */
  static $cache = null;
  if ($cache === null) {
    $j = json_decode((string)file_get_contents('php://input'), true);
    $cache = is_array($j) ? $j : [];
  }
  return $cache;
}

function billing_str($v, int $max = 500): string {
  $s = trim((string)($v ?? ''));
  return mb_strlen($s) > $max ? mb_substr($s, 0, $max) : $s;
}

function billing_num($v): float {
  $n = filter_var($v, FILTER_VALIDATE_FLOAT);
  return $n === false ? 0.0 : $n;
}

function billing_int($v): int {
  $n = filter_var($v, FILTER_VALIDATE_INT);
  return $n === false ? (int)floor(billing_num($v)) : $n;
}

function billing_today(): string { return date('Y-m-d'); }

/* ── session + auth ─────────────────────────────────────────────────────── */

function billing_session_start(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  session_name(BILLING_SESSION);
  session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Lax',
  ]);
  session_start();
  if (empty($_SESSION[BILLING_CSRF])) {
    $_SESSION[BILLING_CSRF] = bin2hex(random_bytes(24));
  }
}

function billing_csrf(): string {
  billing_session_start();
  return (string)$_SESSION[BILLING_CSRF];
}

function billing_user(): ?array {
  billing_session_start();
  $u = $_SESSION['billing_user'] ?? null;
  return is_array($u) ? $u : null;
}

function billing_require_user(): array {
  $u = billing_user();
  if (!$u) billing_fail('Not signed in.', 401);
  return $u;
}

function billing_check_csrf(): void {
  billing_session_start();
  $sent = (string)($_SERVER['HTTP_X_BILLING_CSRF'] ?? '');
  if ($sent === '' || !hash_equals((string)$_SESSION[BILLING_CSRF], $sent)) {
    billing_fail('Session expired — reload the page and sign in again.', 403);
  }
}

/* ── invoice maths ────────────────────────────────────────────────────────
   Ported line for line from the original app's computeInvoiceTotals so that
   bills produced here match what the shop has always produced.             */

function billing_totals(array $o): array {
  $itemTotals     = array_map('billing_num', $o['itemTotals'] ?? []);
  $oldMetalTotals = array_map('billing_num', $o['oldMetalTotals'] ?? []);
  $payments       = array_map('billing_num', $o['payments'] ?? []);

  $subtotal    = array_sum($itemTotals);
  $discType    = (string)($o['discountType'] ?? '%');
  $discValue   = billing_num($o['discountValue'] ?? 0);
  $gstPercent  = billing_num($o['gstPercent'] ?? 3);
  $applyGst    = (bool)($o['applyGst'] ?? true);
  $roundOff    = billing_num($o['roundOff'] ?? 0);

  $discountAmount = $discType === 'Rs' ? $discValue : $subtotal * ($discValue / 100);
  $taxable        = $subtotal - $discountAmount;
  $gstAmount      = $applyGst ? $taxable * ($gstPercent / 100) : 0.0;
  $oldDeduction   = array_sum($oldMetalTotals);
  $grandTotal     = (float)round($taxable + $gstAmount - $oldDeduction + $roundOff);
  $amountPaid     = array_sum($payments);

  return [
    'subtotal'            => round($subtotal, 2),
    'discountAmount'      => round($discountAmount, 2),
    'taxable'             => round($taxable, 2),
    'gstAmount'           => round($gstAmount, 2),
    'cgst'                => round($gstAmount / 2, 2),
    'sgst'                => round($gstAmount / 2, 2),
    'oldMetalDeduction'   => round($oldDeduction, 2),
    'grandTotal'          => $grandTotal,
    'amountPaid'          => round($amountPaid, 2),
    'balanceDue'          => max(0.0, round($grandTotal - $amountPaid, 2)),
  ];
}

/* ── formatting ─────────────────────────────────────────────────────────── */

const BILLING_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'];
const BILLING_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function billing_words_two(int $n): string {
  if ($n < 20) return BILLING_ONES[$n];
  return trim(BILLING_TENS[intdiv($n, 10)] . ' ' . BILLING_ONES[$n % 10]);
}

/** Indian numbering system: crore / lakh / thousand. */
function billing_amount_words(float $amount): string {
  $n = (int)round(abs($amount));
  if ($n === 0) return 'Zero Rupees Only';
  $parts = [];
  $crore = intdiv($n, 10000000); $n %= 10000000;
  $lakh  = intdiv($n, 100000);    $n %= 100000;
  $thou  = intdiv($n, 1000);      $n %= 1000;
  $hund  = intdiv($n, 100);       $n %= 100;
  if ($crore) $parts[] = billing_words_two($crore) . ' Crore';
  if ($lakh)  $parts[] = billing_words_two($lakh) . ' Lakh';
  if ($thou)  $parts[] = billing_words_two($thou) . ' Thousand';
  if ($hund)  $parts[] = BILLING_ONES[$hund] . ' Hundred';
  if ($n)     $parts[] = billing_words_two($n);
  return implode(' ', $parts) . ' Rupees Only';
}

/**
 * Indian digit grouping: 12,34,567.89 — not the Western 1,234,567.89.
 * PHP's number_format only does Western grouping, so the lakh/crore splits
 * are done by hand.
 */
function billing_inr(float $v, int $decimals = 2): string {
  $neg = $v < 0;
  $n = number_format(abs($v), $decimals, '.', '');
  $parts = explode('.', $n, 2);
  $int = (string)$parts[0];
  $frac = isset($parts[1]) ? $parts[1] : '';
  $last3 = substr($int, -3);
  $rest = strlen($int) > 3 ? substr($int, 0, -3) : '';
  if ($rest !== '') $last3 = preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $rest) . ',' . $last3;
  return ($neg ? '-' : '') . $last3 . ($frac !== '' ? '.' . $frac : '');
}

function billing_grams(float $v): string {
  return rtrim(rtrim(number_format($v, 3, '.', ''), '0'), '.');
}

/** wa.me link; bare 10-digit Indian numbers get the 91 prefix. */
function billing_wa_link(string $phone, string $text): string {
  $digits = preg_replace('/\D/', '', $phone) ?? '';
  if (strlen($digits) === 10) $digits = '91' . $digits;
  return 'https://wa.me/' . $digits . '?text=' . rawurlencode($text);
}

function billing_bill_wa_text(array $shop, array $bill): string {
  $lines = [
    '*' . ($shop['shop_name'] ?? 'Shivaa Jewellers') . '*',
    'Bill ' . $bill['bill_no'] . ' · ' . date('d/m/Y', strtotime((string)$bill['bill_date'])),
    'Dear ' . ($bill['party_name'] ?? '') . ',',
    'Bill amount: ₹' . billing_inr(billing_num($bill['grand_total'])),
    'Received: ₹' . billing_inr(billing_num($bill['amount_paid'])),
  ];
  $due = billing_num($bill['balance_due'] ?? 0);
  if ($due > 0) $lines[] = 'Balance due: ₹' . billing_inr($due);
  $lines[] = 'Thank you for shopping with us. 🙏';
  return implode("\n", $lines);
}

function billing_khata_wa_text(array $shop, string $name, float $balance): string {
  return implode("\n", [
    '*' . ($shop['shop_name'] ?? 'Shivaa Jewellers') . '*',
    'Namaste ' . $name . ' ji,',
    'A gentle reminder — your outstanding balance is *₹' . billing_inr($balance) . '*.',
    'Kindly clear it at your convenience. Thank you. 🙏',
  ]);
}

/* ── audit ──────────────────────────────────────────────────────────────── */

function billing_audit(string $action, string $entity = '', int $entityId = 0, string $detail = ''): void {
  try {
    billing_db()->prepare(
      'INSERT INTO `billing_audit` (`action`,`entity`,`entity_id`,`detail`) VALUES (?,?,?,?)'
    )->execute([$action, $entity, $entityId, mb_substr($detail, 0, 500)]);
  } catch (Throwable $e) { /* audit must never break the main flow */ }
}

/**
 * Read-only view of the shop's live orders, for cumulative revenue.
 *
 * Only 'Paid' and 'Partially paid' count. The shop's own v176 note is
 * explicit about why: a Cashfree payment that failed or was dropped leaves
 * the row sitting at 'Awaiting payment', and counting those rows inflates
 * revenue with money that never arrived. For a partially paid order only the
 * amount actually received is counted, not the order total.
 */
function billing_shop_revenue(PDO $pdo): array {
  try {
    $rows = $pdo->query(
      "SELECT `payment_status`, `total`, `amount_paid` FROM `orders`
       WHERE `payment_status` IN ('Paid','Partially paid')"
    )->fetchAll();
  } catch (Throwable $e) {
    return ['available' => false, 'reason' => $e->getMessage(), 'total' => 0.0, 'count' => 0,
            'skipped' => 0];
  }
  $sum = 0.0; $skipped = 0;
  try {
    $skipped = (int)$pdo->query(
      "SELECT COUNT(*) FROM `orders` WHERE `payment_status` NOT IN ('Paid','Partially paid')"
    )->fetchColumn();
  } catch (Throwable $e) { $skipped = 0; }

  foreach ($rows as $r) {
    $paid = billing_num($r['amount_paid'] ?? 0);
    /* A fully paid order may predate amount_paid being recorded. */
    $sum += ((string)($r['payment_status'] ?? '') === 'Paid' && $paid <= 0)
      ? billing_num($r['total'] ?? 0) : $paid;
  }
  return ['available' => true, 'total' => round($sum, 2), 'count' => count($rows),
          'skipped' => $skipped];
}
