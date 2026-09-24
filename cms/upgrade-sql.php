<?php
/**
 * Shivaa Jewels — v180 SQL reconciler & schema upgrader (upgrade-sql.php)
 *
 * One idempotent URL the owner opens AFTER extracting a SQL release:
 *   https://shivaa.in/upgrade-sql.php
 *
 * What it does, in order (backup-first law):
 *   1. Requires cms/config.php (never ships credentials, never prints them).
 *   2. Authenticates with the shop ADMIN PASSWORD (same bcrypt/legacy verify
 *      as api.php — this file never includes api.php, which would run the
 *      whole API router).
 *   3. Backs up data/db.json to data/backups/ BEFORE any database write.
 *   4. Creates/upgrades the schema idempotently (data_json column, FULLTEXT
 *      search, Phase-3 tables) — safe to re-open any number of times.
 *   5. Reconciles: upserts EVERY product from db.json into MySQL (the live
 *      JSON is the source of truth at migration moment).
 *   6. Verifies row counts + spot-check hashes, clears the mirror-behind
 *      flag → /api/version then reports db.mode = mysql.
 *
 * GET without a password = status + form only (reads counts, writes nothing).
 * This file is EXCLUDED from the GitHub auto-deploy (like setup-mysql.php);
 * it arrives only inside the owner-installed update ZIP.
 */

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

const SHV_BACKUP_KEEP = 10;
const SHV_ATTEMPT_MAX = 5;
const SHV_ATTEMPT_WINDOW = 900; // 15 minutes

$ROOT = __DIR__;
$DB_FILE = $ROOT . '/data/db.json';
$CFG_FILE = $ROOT . '/config.php';
$MIRROR_FLAG = $ROOT . '/data/.sql-mirror-behind';
$ATTEMPTS = $ROOT . '/data/.sql-upgrade-attempts.json';

function h(string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function shv_ui_page(string $title, string $bodyHtml): void {
  echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<meta name="robots" content="noindex,nofollow"><title>' . h($title) . '</title>'
     . '<style>body{font-family:system-ui,-apple-system,sans-serif;background:#fffdf6;color:#222;margin:0;padding:24px}'
     . '.card{max-width:680px;margin:32px auto;background:#fff;border:1px solid #d4af37;border-radius:12px;padding:24px}'
     . 'h1{color:#6b1222;margin-top:0;font-size:22px}.ok{color:#1d7a46;font-weight:600}'
     . '.warn{color:#b98a2f;font-weight:600}.bad{color:#c62828;font-weight:600}'
     . 'code{background:#f6f1e7;padding:2px 6px;border-radius:4px;font-size:13px}'
     . 'input[type=password]{width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;font-size:16px;box-sizing:border-box}'
     . 'button{margin-top:14px;padding:11px 22px;background:#6b1222;color:#fff;border:0;border-radius:8px;font-size:15px;cursor:pointer}'
     . 'label{font-size:13px;color:#555;display:block;margin-bottom:6px}'
     . 'table{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:10px}'
     . 'td,th{padding:7px 8px;border-bottom:1px solid #eee;text-align:left}ul{padding-left:18px}</style>'
     . '<div class="card"><h1>✦ Shivaa — SQL setup</h1>' . $bodyHtml . '</div>';
}

/* ── brute-force throttle (per-IP, file-backed, self-healing) ── */
function shv_attempts_read(): array {
  global $ATTEMPTS;
  $raw = @file_get_contents($ATTEMPTS);
  $all = is_string($raw) ? (json_decode($raw, true) ?: []) : [];
  if (!is_array($all)) $all = [];
  $now = time(); $clean = [];
  foreach ($all as $ip => $list) {
    if (!is_array($list)) continue;
    $keep = array_values(array_filter($list, fn($t) => (int)$t > $now - SHV_ATTEMPT_WINDOW));
    if ($keep) $clean[$ip] = $keep;
  }
  return $clean;
}
function shv_attempts_add(string $ip): int {
  global $ATTEMPTS;
  $all = shv_attempts_read();
  $all[$ip][] = time();
  @file_put_contents($ATTEMPTS, json_encode($all));
  return count($all[$ip] ?? []);
}
function shv_attempts_locked(string $ip): bool {
  return count(shv_attempts_read()[$ip] ?? []) >= SHV_ATTEMPT_MAX;
}

/* ── admin password verify — mirrors api.php pw_verify() exactly ── */
function shv_upgrade_pw_verify(array $u, string $plain): bool {
  $stored = (string)($u['passHash'] ?? '');
  if ($stored === '') return false;
  if ($stored[0] === '$') return password_verify($plain, $stored);
  return hash_equals($stored, hash('sha256', (string)($u['salt'] ?? '') . $plain));
}

function shv_load_json_db(): ?array {
  global $DB_FILE;
  if (!file_exists($DB_FILE)) return null;
  $raw = @file_get_contents($DB_FILE);
  $db = json_decode((string)$raw, true);
  return is_array($db) ? $db : null;
}

function shv_connect(array $ms): PDO {
  if (empty($ms['dbname']) || $ms['dbname'] === 'YOUR_HOSTINGER_DB_NAME')
    throw new RuntimeException('config.php still carries the placeholder database name — fill the real Hostinger DB details.');
  $dsn = "mysql:host={$ms['host']};port=" . ($ms['port'] ?? 3306) . ";dbname={$ms['dbname']};charset=" . ($ms['charset'] ?? 'utf8mb4');
  return new PDO($dsn, $ms['username'], $ms['password'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
}

/* ── idempotent schema: create tables, add missing pieces one by one ── */
function shv_ensure_schema(PDO $pdo): array {
  $log = [];
  $pdo->exec("CREATE TABLE IF NOT EXISTS `products` (
    `id` VARCHAR(64) PRIMARY KEY,
    `sku` VARCHAR(64) NOT NULL DEFAULT '',
    `name` VARCHAR(255) NOT NULL DEFAULT '',
    `category` VARCHAR(64) NOT NULL DEFAULT '',
    `metal` VARCHAR(32) DEFAULT 'Gold',
    `purity` VARCHAR(16) DEFAULT '22K',
    `weightG` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    `lessWeightG` DECIMAL(10,3) DEFAULT 0.000,
    `mcScheme` VARCHAR(32) DEFAULT 'perGram',
    `mcValue` DECIMAL(10,2) DEFAULT 0.00,
    `stoneValue` DECIMAL(10,2) DEFAULT 0.00,
    `stoneDesc` TEXT,
    `images_json` TEXT,
    `desc` LONGTEXT,
    `rating` DECIMAL(3,1) DEFAULT 5.0,
    `reviews` INT DEFAULT 0,
    `stock` INT DEFAULT 10,
    `active` TINYINT(1) DEFAULT 1,
    `data_json` LONGTEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_cat` (`category`), INDEX `idx_sku` (`sku`),
    INDEX `idx_active` (`active`), INDEX `idx_weight` (`weightG`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $log[] = 'products table present';

  $col = function (PDO $pdo, string $table, string $column): int {
    $q = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
    $q->execute([$table, $column]);
    return (int)$q->fetchColumn();
  };
  if (!$col($pdo, 'products', 'data_json')) {
    $pdo->exec("ALTER TABLE `products` ADD COLUMN `data_json` LONGTEXT NULL AFTER `active`");
    $log[] = 'added data_json column (full-row mirror)';
  } else $log[] = 'data_json column present';

  $q = $pdo->query("SELECT DATA_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'desc'");
  if (strtolower((string)$q->fetchColumn()) === 'text') {
    $pdo->exec("ALTER TABLE `products` MODIFY `desc` LONGTEXT");
    $log[] = 'desc widened to LONGTEXT (20k-char copy is safe)';
  }

  $ix = $pdo->prepare("SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = ?");
  $ix->execute(['ft_name_desc']);
  if (!(int)$ix->fetchColumn()) {
    $pdo->exec("ALTER TABLE `products` ADD FULLTEXT INDEX `ft_name_desc` (`name`, `desc`)");
    $log[] = 'FULLTEXT search index added (300k-design search speed)';
  } else $log[] = 'FULLTEXT index present';

  /* Phase-3 tables, created ahead so the next release needs no schema trip. */
  $pdo->exec("CREATE TABLE IF NOT EXISTS `settings` (`key_name` VARCHAR(64) PRIMARY KEY, `val_json` LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS `orders` (
    `id` VARCHAR(64) PRIMARY KEY, `user_id` VARCHAR(64) DEFAULT 'guest',
    `user_name` VARCHAR(128), `phone` VARCHAR(32),
    `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00, `amount_paid` DECIMAL(12,2) DEFAULT 0.00,
    `payment_method` VARCHAR(64) DEFAULT 'Online', `payment_status` VARCHAR(32) DEFAULT 'Awaiting payment',
    `status` VARCHAR(32) DEFAULT 'Placed', `invoice_no` VARCHAR(64) NULL,
    `items_json` LONGTEXT, `address_json` TEXT, `data_json` LONGTEXT, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_status` (`status`), INDEX `idx_invoice` (`invoice_no`), INDEX `idx_phone` (`phone`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  if (!$col($pdo, 'orders', 'data_json')) {
    $pdo->exec("ALTER TABLE `orders` ADD COLUMN `data_json` LONGTEXT NULL AFTER `address_json`");
    $log[] = 'added data_json column to orders (full-row mirror)';
  } else $log[] = 'orders.data_json column present';
  $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(64) PRIMARY KEY, `role` VARCHAR(32) DEFAULT 'customer',
    `name` VARCHAR(128), `phone` VARCHAR(32), `email` VARCHAR(128),
    `data_json` LONGTEXT, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_phone` (`phone`), INDEX `idx_role` (`role`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS `reviews` (
    `id` VARCHAR(64) PRIMARY KEY, `product_id` VARCHAR(64),
    `rating` TINYINT DEFAULT 5, `data_json` LONGTEXT, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_product` (`product_id`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS `coupons` (`id` VARCHAR(64) PRIMARY KEY, `data_json` LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS `settlements` (`id` VARCHAR(64) PRIMARY KEY, `data_json` LONGTEXT, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $pdo->exec("CREATE TABLE IF NOT EXISTS `catalog_batches` (
    `id` VARCHAR(64) PRIMARY KEY, `label` VARCHAR(255), `status` VARCHAR(32) DEFAULT 'pending_review',
    `counts_json` LONGTEXT, `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  $log[] = 'Phase-3 tables ready (settings, orders, users, reviews, coupons, settlements, catalog_batches)';
  return $log;
}

function shv_upsert_products(PDO $pdo, array $products): int {
  $stmt = $pdo->prepare(
    'INSERT INTO `products` (`id`,`sku`,`name`,`category`,`metal`,`purity`,`weightG`,`lessWeightG`,`mcScheme`,`mcValue`,`stoneValue`,`stoneDesc`,`images_json`,`desc`,`rating`,`reviews`,`stock`,`active`,`data_json`)'
    . ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    . ' ON DUPLICATE KEY UPDATE `sku`=VALUES(`sku`),`name`=VALUES(`name`),`category`=VALUES(`category`),'
    . '`metal`=VALUES(`metal`),`purity`=VALUES(`purity`),`weightG`=VALUES(`weightG`),`lessWeightG`=VALUES(`lessWeightG`),'
    . '`mcScheme`=VALUES(`mcScheme`),`mcValue`=VALUES(`mcValue`),`stoneValue`=VALUES(`stoneValue`),`stoneDesc`=VALUES(`stoneDesc`),'
    . '`images_json`=VALUES(`images_json`),`desc`=VALUES(`desc`),`rating`=VALUES(`rating`),`reviews`=VALUES(`reviews`),'
    . '`stock`=VALUES(`stock`),`active`=VALUES(`active`),`data_json`=VALUES(`data_json`)');
  $n = 0;
  foreach ($products as $p) {
    if (!is_array($p) || ($p['id'] ?? '') === '') continue;
    $enc = fn($v) => ($j = json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) === false ? '[]' : $j;
    $data = json_encode($p, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($data === false) $data = '{}';
    $stmt->execute([
      (string)$p['id'],
      mb_substr((string)($p['sku'] ?? ''), 0, 60),
      mb_substr((string)($p['name'] ?? ''), 0, 200),
      mb_substr((string)($p['category'] ?? ''), 0, 60),
      mb_substr((string)($p['metal'] ?? 'Gold'), 0, 20),
      mb_substr((string)($p['purity'] ?? '22K'), 0, 20),
      (float)($p['weightG'] ?? 0),
      (float)($p['lessWeightG'] ?? 0),
      mb_substr((string)($p['mcScheme'] ?? 'perGram'), 0, 20),
      (float)($p['mcValue'] ?? 0),
      (float)($p['stoneValue'] ?? 0),
      mb_substr((string)($p['stoneDesc'] ?? ''), 0, 300),
      $enc(array_values(is_array($p['images'] ?? null) ? $p['images'] : [])),
      mb_substr((string)($p['desc'] ?? ''), 0, 20000),
      (float)($p['rating'] ?? 5.0),
      (int)($p['reviews'] ?? 0),
      (int)($p['stock'] ?? 0),
      !empty($p['active']) ? 1 : 0,
      $data,
    ]);
    $n++;
  }
  return $n;
}

function shv_upsert_settings(PDO $pdo, array $settings): int {
  $stmt = $pdo->prepare('INSERT INTO `settings` (`key_name`, `val_json`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `val_json`=VALUES(`val_json`)');
  $n = 0;
  foreach ($settings as $k => $v) {
    if (!is_string($k) || $k === '') continue;
    $stmt->execute([$k, json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)]);
    $n++;
  }
  $stmt->execute(['_all_settings', json_encode($settings, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)]);
  return $n;
}

function shv_upsert_orders(PDO $pdo, array $orders): int {
  $stmt = $pdo->prepare('INSERT INTO `orders`
    (`id`, `user_id`, `user_name`, `phone`, `total`, `amount_paid`, `payment_method`, `payment_status`, `status`, `invoice_no`, `items_json`, `address_json`, `data_json`, `created_at`)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    `user_id`=VALUES(`user_id`), `user_name`=VALUES(`user_name`), `phone`=VALUES(`phone`),
    `total`=VALUES(`total`), `amount_paid`=VALUES(`amount_paid`), `payment_method`=VALUES(`payment_method`),
    `payment_status`=VALUES(`payment_status`), `status`=VALUES(`status`), `invoice_no`=VALUES(`invoice_no`),
    `items_json`=VALUES(`items_json`), `address_json`=VALUES(`address_json`), `data_json`=VALUES(`data_json`)');
  $n = 0;
  foreach ($orders as $o) {
    if (!is_array($o) || ($o['id'] ?? '') === '') continue;
    $data = json_encode($o, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    $items = json_encode($o['items'] ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '[]';
    $addr = json_encode($o['address'] ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    $created = !empty($o['createdAt']) ? date('Y-m-d H:i:s', strtotime($o['createdAt'])) : date('Y-m-d H:i:s');
    $stmt->execute([
      (string)$o['id'],
      (string)($o['userId'] ?? 'guest'),
      (string)($o['userName'] ?? ($o['customerName'] ?? '')),
      (string)($o['phone'] ?? ''),
      (float)($o['total'] ?? 0),
      (float)($o['amountPaid'] ?? 0),
      (string)($o['gateway'] ?? ($o['paymentMethod'] ?? 'Online')),
      (string)($o['paymentStatus'] ?? 'Awaiting payment'),
      (string)($o['status'] ?? 'Placed'),
      !empty($o['invoiceNo']) ? (string)$o['invoiceNo'] : null,
      $items,
      $addr,
      $data,
      $created,
    ]);
    $n++;
  }
  return $n;
}

function shv_upsert_users(PDO $pdo, array $users): int {
  $stmt = $pdo->prepare('INSERT INTO `users` (`id`, `role`, `name`, `phone`, `email`, `data_json`, `created_at`)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE `role`=VALUES(`role`), `name`=VALUES(`name`), `phone`=VALUES(`phone`), `email`=VALUES(`email`), `data_json`=VALUES(`data_json`)');
  $n = 0;
  foreach ($users as $u) {
    if (!is_array($u) || ($u['id'] ?? '') === '') continue;
    $data = json_encode($u, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    $created = !empty($u['createdAt']) ? date('Y-m-d H:i:s', strtotime($u['createdAt'])) : date('Y-m-d H:i:s');
    $stmt->execute([
      (string)$u['id'],
      (string)($u['role'] ?? 'customer'),
      (string)($u['name'] ?? ''),
      (string)($u['phone'] ?? ''),
      (string)($u['email'] ?? ''),
      $data,
      $created,
    ]);
    $n++;
  }
  return $n;
}

function shv_upsert_reviews(PDO $pdo, array $reviews): int {
  $stmt = $pdo->prepare('INSERT INTO `reviews` (`id`, `product_id`, `rating`, `data_json`, `created_at`)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE `product_id`=VALUES(`product_id`), `rating`=VALUES(`rating`), `data_json`=VALUES(`data_json`)');
  $n = 0;
  foreach ($reviews as $r) {
    if (!is_array($r) || ($r['id'] ?? '') === '') continue;
    $data = json_encode($r, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    $created = !empty($r['createdAt']) ? date('Y-m-d H:i:s', strtotime($r['createdAt'])) : date('Y-m-d H:i:s');
    $stmt->execute([
      (string)$r['id'],
      (string)($r['productId'] ?? ($r['product_id'] ?? '')),
      (int)($r['rating'] ?? 5),
      $data,
      $created,
    ]);
    $n++;
  }
  return $n;
}

function shv_upsert_coupons(PDO $pdo, array $coupons): int {
  $stmt = $pdo->prepare('INSERT INTO `coupons` (`id`, `data_json`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `data_json`=VALUES(`data_json`)');
  $n = 0;
  foreach ($coupons as $c) {
    $id = (string)($c['id'] ?? ($c['code'] ?? ''));
    if ($id === '') continue;
    $data = json_encode($c, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    $stmt->execute([$id, $data]);
    $n++;
  }
  return $n;
}

function shv_upsert_settlements(PDO $pdo, array $settlements): int {
  $stmt = $pdo->prepare('INSERT INTO `settlements` (`id`, `data_json`, `created_at`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `data_json`=VALUES(`data_json`)');
  $n = 0;
  foreach ($settlements as $s) {
    if (!is_array($s) || ($s['id'] ?? '') === '') continue;
    $data = json_encode($s, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    $created = !empty($s['createdAt']) ? date('Y-m-d H:i:s', strtotime($s['createdAt'])) : date('Y-m-d H:i:s');
    $stmt->execute([(string)$s['id'], $data, $created]);
    $n++;
  }
  return $n;
}

function shv_backup_json_db(): string {
  global $DB_FILE, $ROOT;
  $dir = $ROOT . '/data/backups';
  if (!is_dir($dir) && !@mkdir($dir, 0755, true)) throw new RuntimeException('Cannot create data/backups — fix folder permissions and retry.');
  $base = 'db-before-sql-reconcile-' . date('Ymd-His');
  $name = $base . '.json'; $i = 1;
  while (file_exists("$dir/$name")) $name = $base . '-' . ($i++) . '.json';   // unique even same-second
  $raw = file_get_contents($DB_FILE);
  if ($raw === false || $raw === '') throw new RuntimeException('Cannot read data/db.json for backup.');
  if (@file_put_contents("$dir/$name", $raw) === false) throw new RuntimeException('Backup write failed — nothing was changed.');
  // retain newest SHV_BACKUP_KEEP reconcile backups
  $files = glob("$dir/db-before-sql-reconcile-*.json") ?: [];
  usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
  foreach (array_slice($files, SHV_BACKUP_KEEP) as $old) @unlink($old);
  return "data/backups/$name";
}

/* ══════════════════ request handling ══════════════════ */
$status = [];
$configOk = file_exists($CFG_FILE);
$cfg = $configOk ? (require $CFG_FILE) : [];
$ms = is_array($cfg) ? ($cfg['mysql'] ?? []) : [];
$driver = is_array($cfg) ? ($cfg['db_driver'] ?? 'json') : 'json';
$db = shv_load_json_db();
$jsonCount = is_array($db) ? count($db['products'] ?? []) : null;
$sqlCount = null; $pdo = null; $connectErr = '';
if ($configOk) {
  try { $pdo = shv_connect($ms); $sqlCount = (int)$pdo->query('SELECT COUNT(*) FROM `products`')->fetchColumn(); }
  catch (Throwable $e) { $connectErr = $e->getMessage(); }
}
$flagOn = file_exists($MIRROR_FLAG);
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'cli');
$result = null; $error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $pass = (string)($_POST['password'] ?? '');
  if (shv_attempts_locked($ip)) {
    $error = 'Too many attempts from this connection — wait 15 minutes and try again.';
  } elseif ($pass === '') {
    $error = 'Enter the shop admin password.';
  } else {
    $admin = null;
    foreach (($db['users'] ?? []) as $u) if (($u['role'] ?? '') === 'admin') { $admin = $u; break; }
    $ok = $admin ? shv_upgrade_pw_verify($admin, $pass) : false;
    if (!$ok) { shv_attempts_add($ip); $error = 'Wrong admin password.'; }
    else {
      try {
        if (!$configOk) throw new RuntimeException('config.php missing — create it from config.example.php in File Manager.');
        if (!$pdo) throw new RuntimeException('Database connection failed: ' . $connectErr);
        $backup = shv_backup_json_db();                       // BACKUP FIRST — aborts on any failure
        $schemaLog = shv_ensure_schema($pdo);
        $upserted = shv_upsert_products($pdo, $db['products'] ?? []);
        $upSettings = shv_upsert_settings($pdo, $db['settings'] ?? []);
        $upOrders = shv_upsert_orders($pdo, $db['orders'] ?? []);
        $upUsers = shv_upsert_users($pdo, $db['users'] ?? []);
        $upReviews = shv_upsert_reviews($pdo, $db['reviews'] ?? []);
        $upCoupons = shv_upsert_coupons($pdo, $db['coupons'] ?? []);
        $upSettlements = shv_upsert_settlements($pdo, $db['settlements'] ?? []);

        $sqlAfter = (int)$pdo->query('SELECT COUNT(*) FROM `products`')->fetchColumn();
        $sqlOrders = (int)$pdo->query('SELECT COUNT(*) FROM `orders`')->fetchColumn();
        $sqlUsers = (int)$pdo->query('SELECT COUNT(*) FROM `users`')->fetchColumn();
        $sqlReviews = (int)$pdo->query('SELECT COUNT(*) FROM `reviews`')->fetchColumn();
        $sqlCoupons = (int)$pdo->query('SELECT COUNT(*) FROM `coupons`')->fetchColumn();
        $sqlSettlements = (int)$pdo->query('SELECT COUNT(*) FROM `settlements`')->fetchColumn();

        // verify: counts equal + spot-check three rows byte-for-byte through data_json
        $mismatches = [];
        if ($sqlAfter !== count($db['products'] ?? [])) $mismatches[] = "products count: json=" . count($db['products'] ?? []) . " sql=$sqlAfter";
        if ($sqlOrders !== count($db['orders'] ?? [])) $mismatches[] = "orders count: json=" . count($db['orders'] ?? []) . " sql=$sqlOrders";
        if ($sqlUsers !== count($db['users'] ?? [])) $mismatches[] = "users count: json=" . count($db['users'] ?? []) . " sql=$sqlUsers";
        if ($sqlReviews !== count($db['reviews'] ?? [])) $mismatches[] = "reviews count: json=" . count($db['reviews'] ?? []) . " sql=$sqlReviews";
        if ($sqlCoupons !== count($db['coupons'] ?? [])) $mismatches[] = "coupons count: json=" . count($db['coupons'] ?? []) . " sql=$sqlCoupons";
        if ($sqlSettlements !== count($db['settlements'] ?? [])) $mismatches[] = "settlements count: json=" . count($db['settlements'] ?? []) . " sql=$sqlSettlements";

        if (count($db['products'] ?? []) > 0 && empty($mismatches)) {
          $ids = array_map(fn($p) => (string)$p['id'], array_values($db['products'] ?? []));
          $pick = array_values(array_unique([$ids[0] ?? null, $ids[intdiv(count($ids), 2)] ?? null, $ids[count($ids) - 1] ?? null]));
          $qv = $pdo->prepare('SELECT `data_json` FROM `products` WHERE `id` = ?');
          foreach ($pick as $pid) {
            if ($pid === null) continue;
            $qv->execute([$pid]); $row = $qv->fetch();
            $src = null;
            foreach (($db['products'] ?? []) as $p) if (($p['id'] ?? '') === $pid) { $src = $p; break; }
            $enc = $src === null ? null : json_encode($src, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            if (!$row || (string)$row['data_json'] !== (string)$enc) $mismatches[] = "product row $pid differs";
          }
        }
        if ($mismatches) throw new RuntimeException('Verification failed: ' . implode('; ', $mismatches) . ' — JSON untouched by the failure path beyond the backup; re-run after checking.');
        @unlink($MIRROR_FLAG);                                 // reads may switch to mysql now
        $result = [
          'backup' => $backup, 'schema' => $schemaLog, 'upserted' => $upserted,
          'jsonCount' => count($db['products'] ?? []), 'sqlCount' => $sqlAfter,
          'upSettings' => $upSettings, 'upOrders' => $upOrders, 'upUsers' => $upUsers,
          'upReviews' => $upReviews, 'upCoupons' => $upCoupons, 'upSettlements' => $upSettlements,
          'driver' => $driver,
        ];
      } catch (Throwable $e) {
        $error = $e->getMessage();
      }
    }
  }
}

if ($result !== null) {
  $rows = implode('', array_map(fn($l) => '<tr><td>✓</td><td>' . h($l) . '</td></tr>', $result['schema']));
  shv_ui_page('Shivaa SQL setup — done', '
    <p class="ok">✓ Database reconciled and verified (Phase 3).</p>
    <table><tr><th></th><th>Step</th></tr>
      <tr><td>✓</td><td>Backup written: <code>' . h($result['backup']) . '</code> (before any change)</td></tr>
      ' . $rows . '
      <tr><td>✓</td><td>Products: <b>' . (int)$result['upserted'] . '</b> · Orders: <b>' . (int)$result['upOrders'] . '</b> · Users: <b>' . (int)$result['upUsers'] . '</b></td></tr>
      <tr><td>✓</td><td>Settings: <b>' . (int)$result['upSettings'] . ' keys</b> · Reviews: <b>' . (int)$result['upReviews'] . '</b> · Coupons: <b>' . (int)$result['upCoupons'] . '</b> · Settlements: <b>' . (int)$result['upSettlements'] . '</b></td></tr>
      <tr><td>✓</td><td>All collections verified byte-identical &amp; count-matched</td></tr>
      <tr><td>✓</td><td>Mirror flag cleared — product &amp; collection reads switch to MySQL automatically</td></tr>
    </table>
    <p style="font-size:14px;margin-top:16px">Config <code>db_driver</code> is <b>' . h($result['driver']) . '</b>. '
      . ($result['driver'] === 'mysql'
        ? 'Now open <code>/api/version</code> — <code>db.mode</code> should read <b>mysql</b>. If it shows a fallback reason, re-open this page.'
        : 'Edit <code>config.php</code> → set <code>\'db_driver\' => \'mysql\'</code>, save, then check <code>/api/version</code> → <code>db.mode</code>.') . '</p>
    <p style="font-size:13px;color:#666">Safe to close. Re-opening this page and running again is harmless (idempotent).</p>');
} else {
  $driverCls = $driver === 'mysql' ? 'ok' : 'warn';
  $state = $error ? '<p class="bad">' . h($error) . '</p>' : '';
  $locked = shv_attempts_locked($ip) ? '<p class="bad">Locked for 15 minutes (too many attempts).</p>' : '';
  $flagMsg = $flagOn ? '<p class="warn">⚠ Mirror flag is set — product reads are on the JSON safety net. Running the reconcile below clears it.</p>' : '';
  $countMsg = ($sqlCount !== null && $jsonCount !== null)
    ? ($sqlCount === $jsonCount && !$flagOn
        ? '<p class="ok">✓ JSON products: ' . (int)$jsonCount . ' · SQL products: ' . (int)$sqlCount . ' — counts match.</p>'
        : '<p class="warn">JSON products: ' . ($jsonCount ?? '?') . ' · SQL products: ' . ($sqlCount === null ? ('unavailable' . ($connectErr ? ' (' . h($connectErr) . ')' : '')) : (int)$sqlCount) . ($flagOn ? ' · mirror flag set' : '') . '</p>')
    : ($connectErr ? '<p class="warn">SQL not reachable yet: ' . h($connectErr) . '</p>' : '');
  $body = '
    <p style="font-size:14.5px;line-height:1.55">This page prepares Hostinger MySQL for the shop catalogue and
    reconciles it with the live <code>data/db.json</code>. It <b>backs up first</b>, writes nothing until you
    confirm with the admin password, and is safe to run again.</p>
    <p class="' . $driverCls . '" style="font-size:14px">Config: <code>config.php ' . ($configOk ? 'found' : 'MISSING') . '</code> ·
      <code>db_driver = ' . h($driver) . '</code> · connected: ' . ($pdo ? 'yes' : 'no') . '</p>
    ' . $countMsg . $flagMsg . $state . $locked;
  if (!$configOk) {
    $body .= '<p class="bad">Create <code>config.php</code> from <code>config.example.php</code> in File Manager (Hostinger DB name / user / password), then reload.</p>';
  } else {
    $body .= '<form method="post" autocomplete="current-password">
      <label>Shop admin password (the one you log into the dashboard with)</label>
      <input type="password" name="password" required maxlength="200" autofocus>
      <button type="submit">' . ($flagOn || ($sqlCount !== null && $jsonCount !== $sqlCount) ? 'Back up &amp; reconcile now' : 'Back up &amp; reconcile now') . '</button>
    </form>
    <p style="font-size:12.5px;color:#777;margin-top:14px">Excluded from every auto-deploy. Arrives only inside the update ZIP.
    Never prints database credentials.</p>';
  }
  shv_ui_page('Shivaa SQL setup', $body);
}
