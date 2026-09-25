<?php
/**
 * Shivaa Jewels - Billing app table installer
 *
 * Creates the 12 tables the showroom billing app needs, inside the SAME
 * database the shop already uses. Run it once by opening this file in a
 * browser and entering the shop admin password.
 *
 * Safety:
 *  - Every statement is CREATE TABLE IF NOT EXISTS on a `billing_*` table.
 *    A hard guard below refuses to run anything else, so this file can never
 *    alter or drop a shop table.
 *  - Idempotent: re-running it changes nothing.
 *  - Admin password required, with a 15-minute lockout after failed attempts.
 *  - Never overwrites data. Tables that already exist are left untouched.
 */
declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

const SHV_LOCK_FILE = __DIR__ . '/data/install-billing-attempts.json';
const SHV_MAX_ATTEMPTS = 5;
const SHV_LOCK_SECONDS = 900;

/* ── the only SQL this script is allowed to run ─────────────────────────── */
$SHV_BILLING_DDL = [
  'CREATE TABLE IF NOT EXISTS `billing_artisans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(255) DEFAULT \'\',
	`specialization` varchar(255) DEFAULT \'\',
	`address` varchar(500) DEFAULT \'\',
	`notes` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_artisans_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(255) NOT NULL,
	`entity` varchar(255) DEFAULT \'\',
	`entity_id` int,
	`detail` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_audit_logs_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(255) DEFAULT \'\',
	`email` varchar(255) DEFAULT \'\',
	`address` varchar(500) DEFAULT \'\',
	`city` varchar(255) DEFAULT \'\',
	`pan` varchar(255) DEFAULT \'\',
	`aadhar` varchar(255) DEFAULT \'\',
	`credit_limit` double DEFAULT 0,
	`credit_days` int DEFAULT 0,
	`notes` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_customers_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(255) NOT NULL,
	`category` varchar(255) DEFAULT \'General\',
	`description` varchar(500) DEFAULT \'\',
	`amount` double DEFAULT 0,
	`payment_mode` varchar(255) DEFAULT \'Cash\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_expenses_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(255) DEFAULT \'\',
	`huid` varchar(255) DEFAULT \'\',
	`name` varchar(255) NOT NULL,
	`category` varchar(255) DEFAULT \'Rings\',
	`metal` varchar(255) DEFAULT \'Gold\',
	`purity` varchar(255) DEFAULT \'22K (916)\',
	`gross_wt` double DEFAULT 0,
	`less_wt` double DEFAULT 0,
	`stone_wt` double DEFAULT 0,
	`net_wt` double DEFAULT 0,
	`pieces` int DEFAULT 1,
	`stone_details` varchar(500) DEFAULT \'\',
	`status` varchar(255) DEFAULT \'In Stock\',
	`notes` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_inventory_items_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inv_no` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`customer_id` int,
	`customer_name` varchar(255) DEFAULT \'\',
	`customer_phone` varchar(255) DEFAULT \'\',
	`date` varchar(255) NOT NULL,
	`place_of_supply` varchar(255) DEFAULT \'\',
	`items` json,
	`old_metals` json,
	`payments` json,
	`subtotal` double DEFAULT 0,
	`discount_type` varchar(255) DEFAULT \'%\',
	`discount_value` double DEFAULT 0,
	`discount_amount` double DEFAULT 0,
	`taxable` double DEFAULT 0,
	`gst_amount` double DEFAULT 0,
	`old_metal_deduction` double DEFAULT 0,
	`round_off` double DEFAULT 0,
	`grand_total` double DEFAULT 0,
	`amount_paid` double DEFAULT 0,
	`balance_due` double DEFAULT 0,
	`credit_days` int DEFAULT 0,
	`status` varchar(255) DEFAULT \'Unpaid\',
	`notes` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_invoices_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_karigar_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artisan_id` int,
	`artisan_name` varchar(255) DEFAULT \'\',
	`metal` varchar(255) DEFAULT \'Gold\',
	`category` varchar(255) DEFAULT \'Rings\',
	`purity` varchar(255) DEFAULT \'22K (916)\',
	`issue_date` varchar(255) NOT NULL,
	`duration_days` int DEFAULT 15,
	`labour_charges` double DEFAULT 0,
	`issued_wt` double DEFAULT 0,
	`less_wt` double DEFAULT 0,
	`wastage_pct` double DEFAULT 0,
	`received_wt` double DEFAULT 0,
	`status` varchar(255) DEFAULT \'Pending\',
	`notes` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_karigar_jobs_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`date` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`amount` double NOT NULL,
	`mode` varchar(255) DEFAULT \'\',
	`ref_type` varchar(255) DEFAULT \'manual\',
	`ref_id` int,
	`note` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_ledger_entries_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_metal_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bill_no` varchar(255) NOT NULL,
	`party_type` varchar(255) DEFAULT \'customer\',
	`party_id` int,
	`party_name` varchar(255) DEFAULT \'\',
	`date` varchar(255) NOT NULL,
	`out_products` json,
	`in_metals` json,
	`fine_out_gold` double DEFAULT 0,
	`fine_in_gold` double DEFAULT 0,
	`balance_gold` double DEFAULT 0,
	`fine_out_silver` double DEFAULT 0,
	`fine_in_silver` double DEFAULT 0,
	`balance_silver` double DEFAULT 0,
	`notes` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_metal_invoices_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_settings` (
	`id` int NOT NULL DEFAULT 1,
	`shop_name` varchar(255) DEFAULT \'Shivaa Jewellers\',
	`tagline` varchar(255) DEFAULT \'Fine Gold & Silver\',
	`address` varchar(500) DEFAULT \'\',
	`phone` varchar(255) DEFAULT \'\',
	`gstin` varchar(255) DEFAULT \'\',
	`invoice_prefix` varchar(255) DEFAULT \'SHV\',
	`gst_percent` double DEFAULT 3,
	`gold_rate` double DEFAULT 7500,
	`silver_rate` double DEFAULT 90,
	`rates_updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_settings_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`company` varchar(255) DEFAULT \'\',
	`phone` varchar(255) DEFAULT \'\',
	`address` varchar(500) DEFAULT \'\',
	`city` varchar(255) DEFAULT \'\',
	`pan` varchar(255) DEFAULT \'\',
	`gstin` varchar(255) DEFAULT \'\',
	`acc_name` varchar(255) DEFAULT \'\',
	`acc_number` varchar(255) DEFAULT \'\',
	`ifsc` varchar(255) DEFAULT \'\',
	`notes` varchar(500) DEFAULT \'\',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_suppliers_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
  'CREATE TABLE IF NOT EXISTS `billing_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `billing_users_email_unique` UNIQUE(`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
];

function shv_h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function shv_lock_read(): array {
  if (!is_file(SHV_LOCK_FILE)) return [];
  $j = json_decode((string)@file_get_contents(SHV_LOCK_FILE), true);
  return is_array($j) ? $j : [];
}
function shv_lock_write(array $a): void {
  $d = dirname(SHV_LOCK_FILE);
  if (!is_dir($d)) @mkdir($d, 0755, true);
  @file_put_contents(SHV_LOCK_FILE, json_encode($a), LOCK_EX);
}
function shv_ip(): string { return (string)($_SERVER['REMOTE_ADDR'] ?? 'cli'); }
function shv_locked(string $ip): bool {
  $a = shv_lock_read();
  $e = $a[$ip] ?? null;
  if (!is_array($e)) return false;
  return (int)($e['n'] ?? 0) >= SHV_MAX_ATTEMPTS
      && (time() - (int)($e['t'] ?? 0)) < SHV_LOCK_SECONDS;
}
function shv_fail(string $ip): void {
  $a = shv_lock_read();
  $e = $a[$ip] ?? ['n' => 0, 't' => 0];
  if ((time() - (int)($e['t'] ?? 0)) >= SHV_LOCK_SECONDS) $e = ['n' => 0, 't' => 0];
  $e['n'] = (int)$e['n'] + 1; $e['t'] = time();
  $a[$ip] = $e; shv_lock_write($a);
}
function shv_clear(string $ip): void {
  $a = shv_lock_read(); unset($a[$ip]); shv_lock_write($a);
}

/* Mirrors shv_upgrade_pw_verify() in upgrade-sql.php exactly. */
function shv_pw_verify(array $u, string $plain): bool {
  $stored = (string)($u['passHash'] ?? '');
  if ($stored === '') return false;
  if ($stored[0] === '$') return password_verify($plain, $stored);
  return hash_equals($stored, hash('sha256', (string)($u['salt'] ?? '') . $plain));
}

/* ── config + connection ────────────────────────────────────────────────── */
$CONFIG_FILE = __DIR__ . '/config.php';
$config = is_file($CONFIG_FILE) ? require $CONFIG_FILE : null;
$ms = (is_array($config) && isset($config['mysql']) && is_array($config['mysql'])) ? $config['mysql'] : [];
$configOk = !empty($ms['dbname']) && $ms['dbname'] !== 'YOUR_HOSTINGER_DB_NAME';

function shv_connect(array $ms): PDO {
  $dsn = 'mysql:host=' . $ms['host'] . ';port=' . ($ms['port'] ?? 3306)
       . ';dbname=' . $ms['dbname'] . ';charset=' . ($ms['charset'] ?? 'utf8mb4');
  return new PDO($dsn, $ms['username'], $ms['password'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
}

/* ── run ────────────────────────────────────────────────────────────────── */
$error = null; $log = []; $dbName = '';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $pass = (string)($_POST['password'] ?? '');
  $ip = shv_ip();

  if (shv_locked($ip)) {
    $error = 'Too many attempts from this connection - wait 15 minutes and try again.';
  } elseif ($pass === '') {
    $error = 'Enter the shop admin password.';
  } elseif (!$configOk) {
    $error = 'config.php is missing or still holds placeholder database details.';
  } else {
    try {
      $pdo = shv_connect($ms);
      $dbName = (string)$ms['dbname'];

      /* Verify against the shop admin stored in MySQL. */
      $row = $pdo->query("SELECT `id`, `data_json` FROM `users` WHERE `role` = 'admin' LIMIT 1")->fetch();
      $admin = null;
      if ($row) {
        $j = json_decode((string)($row['data_json'] ?? ''), true);
        if (is_array($j)) $admin = $j;
      }
      if (!$admin || !shv_pw_verify($admin, $pass)) { shv_fail($ip); $error = 'Wrong admin password.'; }
      else {
        shv_clear($ip);

        /* Hard guard: nothing but CREATE TABLE IF NOT EXISTS `billing_*` may run. */
        foreach ($SHV_BILLING_DDL as $i => $stmt) {
          if (!preg_match('/^CREATE TABLE IF NOT EXISTS `billing_[a-z_]+` \(/', $stmt)) {
            throw new RuntimeException('Refusing to run statement ' . ($i + 1) . ': it is not a billing_* CREATE TABLE.');
          }
          if (preg_match('/\b(DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|RENAME)\b/i', $stmt)) {
            throw new RuntimeException('Refusing to run statement ' . ($i + 1) . ': it contains a mutating keyword.');
          }
        }

        $existing = [];
        foreach ($pdo->query('SHOW TABLES') as $r) $existing[] = (string)reset($r);
        $before = array_flip($existing);

        foreach ($SHV_BILLING_DDL as $stmt) {
          preg_match('/^CREATE TABLE IF NOT EXISTS `(billing_[a-z_]+)`/', $stmt, $m);
          $name = $m[1];
          $pdo->exec($stmt);
          $log[] = ['table' => $name, 'created' => !isset($before[$name])];
        }

        /* Confirm nothing outside billing_ was touched. */
        $after = [];
        foreach ($pdo->query('SHOW TABLES') as $r) $after[] = (string)reset($r);
        $newTables = array_values(array_diff($after, $existing));
        foreach ($newTables as $t) {
          if (strpos($t, 'billing_') !== 0) throw new RuntimeException('Unexpected table created: ' . $t);
        }
      }
    } catch (Throwable $e) {
      $error = $e->getMessage();
    }
  }
}

$created = 0; foreach ($log as $l) if ($l['created']) $created++;
?><!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install Billing Tables</title>
<style>
 body{font:15px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:24px;background:#f6f6f4;color:#1a1a1a}
 .card{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e2de;border-radius:12px;padding:24px}
 h1{font-size:20px;margin:0 0 6px} p{margin:0 0 14px;color:#555}
 input[type=password]{width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box;font-size:16px}
 button{margin-top:12px;padding:10px 18px;border:0;border-radius:8px;background:#1a1a1a;color:#fff;font-size:15px;cursor:pointer}
 .err{background:#fdecec;border:1px solid #f3b6b6;color:#8c1d1d;padding:10px 12px;border-radius:8px;margin-bottom:14px}
 .ok{background:#eaf6ec;border:1px solid #b7dcbe;color:#1c5c2a;padding:10px 12px;border-radius:8px;margin-bottom:14px}
 table{width:100%;border-collapse:collapse;font-size:14px}
 td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #eee}
 code{background:#f2f2ef;padding:1px 5px;border-radius:4px}
</style></head><body><div class="card">
<h1>Install Billing Tables</h1>
<p>Creates the 12 tables the billing app needs in <code><?= shv_h($dbName ?: ($ms['dbname'] ?? 'not configured')) ?></code>. Existing tables are left untouched, and no shop table is ever altered.</p>
<?php if ($error): ?><div class="err"><?= shv_h($error) ?></div><?php endif; ?>
<?php if ($log): ?>
  <div class="ok">Done. <?= $created ?> table<?= $created === 1 ? '' : 's' ?> created, <?= count($log) - $created ?> already present.</div>
  <table><tr><th>Table</th><th>Result</th></tr>
  <?php foreach ($log as $l): ?><tr><td><code><?= shv_h($l['table']) ?></code></td><td><?= $l['created'] ? 'created' : 'already existed' ?></td></tr><?php endforeach; ?>
  </table>
<?php else: ?>
  <form method="post">
    <label for="password">Shop admin password</label>
    <input id="password" type="password" name="password" autocomplete="current-password" required>
    <button type="submit">Install tables</button>
  </form>
<?php endif; ?>
</div></body></html>
