-- Shivaa Jewels — Billing schema v1
--
-- Lives in the SAME database as the shop. Every table is prefixed billing_
-- so it can never collide with a shop table (the shop already owns `users`,
-- `settings`, `products`, `orders`, `reviews`, `coupons`, `settlements`,
-- `catalog_batches`).
--
-- Two design decisions drive the whole schema:
--
-- 1. Stock is counted in PIECES on the website and weighed in GRAMS in the
--    shop. They are different kinds of number, so both are stored rather
--    than one being faked from the other.
-- 2. Every bill and every stock movement carries a `channel`, because the
--    owner needs B2B and B2C reported separately and cumulatively.

CREATE TABLE IF NOT EXISTS `billing_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(128) NOT NULL DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_billing_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `billing_settings` (
  `id` INT PRIMARY KEY,
  `shop_name` VARCHAR(191) NOT NULL DEFAULT 'Shivaa Jewellers',
  `tagline` VARCHAR(191) NOT NULL DEFAULT 'Fine Gold & Silver',
  `address` VARCHAR(500) NOT NULL DEFAULT '',
  `phone` VARCHAR(64) NOT NULL DEFAULT '',
  `gstin` VARCHAR(64) NOT NULL DEFAULT '',
  `invoice_prefix` VARCHAR(16) NOT NULL DEFAULT 'SHV',
  `gst_percent` DECIMAL(5,2) NOT NULL DEFAULT 3.00,
  `gold_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `silver_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `state_code` VARCHAR(8) NOT NULL DEFAULT '08',
  `rates_updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One table for every person the shop deals with. `kind` separates the
-- retail customer from the wholesale jeweller, which is what makes the
-- B2B / B2C split possible without two parallel contact books.
-- partner_id links a jeweller to the shop's existing approved B2B partner.
CREATE TABLE IF NOT EXISTS `billing_parties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kind` VARCHAR(16) NOT NULL DEFAULT 'customer',
  `name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(32) NOT NULL DEFAULT '',
  `email` VARCHAR(191) NOT NULL DEFAULT '',
  `address` VARCHAR(500) NOT NULL DEFAULT '',
  `city` VARCHAR(128) NOT NULL DEFAULT '',
  `state_code` VARCHAR(8) NOT NULL DEFAULT '',
  `pan` VARCHAR(32) NOT NULL DEFAULT '',
  `gstin` VARCHAR(64) NOT NULL DEFAULT '',
  `aadhar` VARCHAR(32) NOT NULL DEFAULT '',
  `partner_id` VARCHAR(64) NOT NULL DEFAULT '',
  `bank_name` VARCHAR(128) NOT NULL DEFAULT '',
  `acc_number` VARCHAR(64) NOT NULL DEFAULT '',
  `ifsc` VARCHAR(32) NOT NULL DEFAULT '',
  `credit_limit` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `credit_days` INT NOT NULL DEFAULT 0,
  `specialization` VARCHAR(128) NOT NULL DEFAULT '',
  `notes` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_billing_parties_kind` (`kind`),
  KEY `idx_billing_parties_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Weights are PER PIECE. physical_pcs / physical_grams describe the tray in
-- the shop; online_stock is what the website offers. fulfilment says whether
-- an online sale takes a real piece out of the tray or starts production.
CREATE TABLE IF NOT EXISTS `billing_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sku` VARCHAR(64) NOT NULL DEFAULT '',
  `huid` VARCHAR(64) NOT NULL DEFAULT '',
  `name` VARCHAR(191) NOT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'Rings',
  `metal` VARCHAR(16) NOT NULL DEFAULT 'Gold',
  `purity` VARCHAR(32) NOT NULL DEFAULT '22K (916)',
  `gross_wt` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `less_wt` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `stone_wt` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `net_wt` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `making_per_g` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stone_details` VARCHAR(500) NOT NULL DEFAULT '',
  `online_stock` INT NOT NULL DEFAULT 0,
  `physical_pcs` INT NOT NULL DEFAULT 0,
  `physical_grams` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `fulfilment` VARCHAR(16) NOT NULL DEFAULT 'ready',
  `product_id` VARCHAR(64) NOT NULL DEFAULT '',
  `status` VARCHAR(16) NOT NULL DEFAULT 'In Stock',
  `notes` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_billing_items_status` (`status`),
  KEY `idx_billing_items_category` (`category`),
  KEY `idx_billing_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Append-only. Never updated, never deleted. When online and physical stock
-- disagree, this is what says which bill caused it.
CREATE TABLE IF NOT EXISTS `billing_stock_ledger` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_id` INT NOT NULL,
  `sku` VARCHAR(64) NOT NULL DEFAULT '',
  `channel` VARCHAR(16) NOT NULL,
  `delta_pcs` INT NOT NULL DEFAULT 0,
  `delta_grams` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `ref_type` VARCHAR(16) NOT NULL DEFAULT 'manual',
  `ref_id` INT NOT NULL DEFAULT 0,
  `note` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_billing_stock_item` (`item_id`),
  KEY `idx_billing_stock_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- channel: b2c_online | b2c_offline | b2b
-- doc_type: GST | Estimate   (a document type, not a channel)
CREATE TABLE IF NOT EXISTS `billing_bills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bill_no` VARCHAR(32) NOT NULL,
  `doc_type` VARCHAR(16) NOT NULL DEFAULT 'GST',
  `channel` VARCHAR(16) NOT NULL DEFAULT 'b2c_offline',
  `party_id` INT NOT NULL DEFAULT 0,
  `party_name` VARCHAR(191) NOT NULL DEFAULT '',
  `party_phone` VARCHAR(32) NOT NULL DEFAULT '',
  `bill_date` DATE NOT NULL,
  `place_of_supply` VARCHAR(64) NOT NULL DEFAULT '',
  `items` JSON,
  `old_metals` JSON,
  `payments` JSON,
  `subtotal` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `discount_type` VARCHAR(4) NOT NULL DEFAULT '%',
  `discount_value` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `taxable` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `gst_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `gst_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `old_metal_deduction` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `round_off` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `balance_due` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `credit_days` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(16) NOT NULL DEFAULT 'Unpaid',
  `shop_order_id` VARCHAR(64) NOT NULL DEFAULT '',
  `notes` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_billing_bills_no` (`bill_no`),
  KEY `idx_billing_bills_channel` (`channel`),
  KEY `idx_billing_bills_date` (`bill_date`),
  KEY `idx_billing_bills_party` (`party_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `billing_expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exp_date` DATE NOT NULL,
  `category` VARCHAR(64) NOT NULL DEFAULT 'General',
  `description` VARCHAR(500) NOT NULL DEFAULT '',
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `payment_mode` VARCHAR(32) NOT NULL DEFAULT 'Cash',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_billing_expenses_date` (`exp_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `billing_karigar_jobs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `party_id` INT NOT NULL DEFAULT 0,
  `artisan_name` VARCHAR(191) NOT NULL DEFAULT '',
  `metal` VARCHAR(16) NOT NULL DEFAULT 'Gold',
  `category` VARCHAR(64) NOT NULL DEFAULT 'Rings',
  `purity` VARCHAR(32) NOT NULL DEFAULT '22K (916)',
  `issue_date` DATE NOT NULL,
  `due_date` DATE,
  `labour_charges` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `issued_wt` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `less_wt` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `wastage_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `received_wt` DECIMAL(10,3) NOT NULL DEFAULT 0.000,
  `status` VARCHAR(16) NOT NULL DEFAULT 'Pending',
  `notes` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_billing_karigar_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Khata. debit = the shop is owed; credit = money received.
CREATE TABLE IF NOT EXISTS `billing_ledger` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `party_id` INT NOT NULL,
  `entry_date` DATE NOT NULL,
  `entry_type` VARCHAR(8) NOT NULL,
  `amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `mode` VARCHAR(32) NOT NULL DEFAULT '',
  `ref_type` VARCHAR(16) NOT NULL DEFAULT 'manual',
  `ref_id` INT NOT NULL DEFAULT 0,
  `note` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_billing_ledger_party` (`party_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `billing_audit` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(128) NOT NULL,
  `entity` VARCHAR(32) NOT NULL DEFAULT '',
  `entity_id` INT NOT NULL DEFAULT 0,
  `detail` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_billing_audit_entity` (`entity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
