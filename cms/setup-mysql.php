<?php
/**
 * Shivaa Jewels — MySQL Database Installer & Migrator for 300,000+ Designs
 * 
 * Instructions:
 * 1. Ensure `cms/config.php` exists on your Hostinger server with your MySQL details.
 * 2. Open `https://shivaa.in/setup-mysql.php` in your browser once.
 */

header('Content-Type: text/html; charset=utf-8');

$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    echo '<h2 style="color:#a81f34;font-family:sans-serif">Error: cms/config.php not found.</h2>';
    echo '<p style="font-family:sans-serif">Please copy <code>cms/config.example.php</code> to <code>cms/config.php</code> on Hostinger File Manager and enter your Hostinger MySQL database details.</p>';
    exit;
}

$config = require $configFile;
$ms = $config['mysql'] ?? [];

if (empty($ms['dbname']) || $ms['dbname'] === 'YOUR_HOSTINGER_DB_NAME') {
    echo '<h2 style="color:#a81f34;font-family:sans-serif">Error: Hostinger MySQL details not configured in cms/config.php</h2>';
    echo '<p style="font-family:sans-serif">Please edit <code>cms/config.php</code> on Hostinger File Manager with your actual Hostinger DB Name, Username, and Password.</p>';
    exit;
}

try {
    $dsn = "mysql:host={$ms['host']};port=" . ($ms['port'] ?? 3306) . ";dbname={$ms['dbname']};charset=" . ($ms['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $ms['username'], $ms['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    echo '<h2 style="color:#a81f34;font-family:sans-serif">Database Connection Error:</h2>';
    echo '<p style="font-family:sans-serif">' . htmlspecialchars($e->getMessage()) . '</p>';
    exit;
}

echo '<div style="max-width:650px;margin:40px auto;padding:24px;border:1px solid #d4af37;border-radius:12px;font-family:sans-serif;background:#fffdf6">';
echo '<h2 style="color:#6b1222;margin-top:0">✦ Shivaa Jewels — MySQL Setup & Database Indexer</h2>';

// 1. Create Tables
$sql = "
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) PRIMARY KEY,
  `sku` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(64) NOT NULL,
  `metal` VARCHAR(32) DEFAULT 'Gold',
  `purity` VARCHAR(16) DEFAULT '22K',
  `weightG` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `lessWeightG` DECIMAL(10,3) DEFAULT 0.000,
  `mcScheme` VARCHAR(32) DEFAULT 'perGram',
  `mcValue` DECIMAL(10,2) DEFAULT 0.00,
  `stoneValue` DECIMAL(10,2) DEFAULT 0.00,
  `stoneDesc` TEXT,
  `images_json` TEXT,
  `desc` TEXT,
  `rating` DECIMAL(3,1) DEFAULT 5.0,
  `reviews` INT DEFAULT 0,
  `stock` INT DEFAULT 10,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cat` (`category`),
  INDEX `idx_sku` (`sku`),
  INDEX `idx_active` (`active`),
  INDEX `idx_weight` (`weightG`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` VARCHAR(64) DEFAULT 'guest',
  `user_name` VARCHAR(128),
  `phone` VARCHAR(32),
  `total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) DEFAULT 0.00,
  `payment_method` VARCHAR(64) DEFAULT 'Online',
  `payment_status` VARCHAR(32) DEFAULT 'Awaiting payment',
  `status` VARCHAR(32) DEFAULT 'Placed',
  `actual_weight_g` DECIMAL(10,3) NULL,
  `weight_note` TEXT NULL,
  `invoice_no` VARCHAR(64) NULL,
  `items_json` LONGTEXT,
  `address_json` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_status` (`status`),
  INDEX `idx_invoice` (`invoice_no`),
  INDEX `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `settings` (
  `key_name` VARCHAR(64) PRIMARY KEY,
  `val_json` LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";

$pdo->exec($sql);
echo '<p style="color:#1d7a46;font-weight:bold">✓ MySQL database tables created with high-performance indexes for 300,000+ designs!</p>';

// 2. Migrate existing db.json products
$jsonFile = __DIR__ . '/data/db.json';
if (file_exists($jsonFile)) {
    $raw = file_get_contents($jsonFile);
    $data = json_decode($raw, true);
    
    if (!empty($data['products']) && is_array($data['products'])) {
        $stmt = $pdo->prepare("INSERT INTO `products` (`id`, `sku`, `name`, `category`, `metal`, `purity`, `weightG`, `mcScheme`, `mcValue`, `stoneValue`, `images_json`, `stock`, `active`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `weightG`=VALUES(`weightG`)");
        $count = 0;
        foreach ($data['products'] as $p) {
            $stmt->execute([
                $p['id'] ?? ('prod_' . $count),
                $p['sku'] ?? $p['id'] ?? ('SKU' . $count),
                $p['name'] ?? 'Gold Jewellery',
                $p['category'] ?? 'rings',
                $p['metal'] ?? 'Gold',
                $p['purity'] ?? '22K',
                (float)($p['weightG'] ?? 0),
                $p['mcScheme'] ?? 'perGram',
                (float)($p['mcValue'] ?? 0),
                (float)($p['stoneValue'] ?? 0),
                json_encode($p['images'] ?? []),
                (int)($p['stock'] ?? 10)
            ]);
            $count++;
        }
        echo "<p style=\"color:#1d7a46\">✓ Migrated {$count} catalog items from db.json into Hostinger MySQL!</p>";
    }
}

echo '<hr style="border:none;border-top:1px solid #e0d0b0;margin:16px 0">';
echo '<p style="color:#111"><b>Database Ready!</b> Shivaa.ecom is now powered by Hostinger MySQL and capable of indexing 300,000+ designs at high speed.</p>';
echo '</div>';
