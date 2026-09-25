CREATE TABLE `billing_artisans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(255) DEFAULT '',
	`specialization` varchar(255) DEFAULT '',
	`address` varchar(500) DEFAULT '',
	`notes` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_artisans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(255) NOT NULL,
	`entity` varchar(255) DEFAULT '',
	`entity_id` int,
	`detail` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(255) DEFAULT '',
	`email` varchar(255) DEFAULT '',
	`address` varchar(500) DEFAULT '',
	`city` varchar(255) DEFAULT '',
	`pan` varchar(255) DEFAULT '',
	`aadhar` varchar(255) DEFAULT '',
	`credit_limit` double DEFAULT 0,
	`credit_days` int DEFAULT 0,
	`notes` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(255) NOT NULL,
	`category` varchar(255) DEFAULT 'General',
	`description` varchar(500) DEFAULT '',
	`amount` double DEFAULT 0,
	`payment_mode` varchar(255) DEFAULT 'Cash',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(255) DEFAULT '',
	`huid` varchar(255) DEFAULT '',
	`name` varchar(255) NOT NULL,
	`category` varchar(255) DEFAULT 'Rings',
	`metal` varchar(255) DEFAULT 'Gold',
	`purity` varchar(255) DEFAULT '22K (916)',
	`gross_wt` double DEFAULT 0,
	`less_wt` double DEFAULT 0,
	`stone_wt` double DEFAULT 0,
	`net_wt` double DEFAULT 0,
	`pieces` int DEFAULT 1,
	`stone_details` varchar(500) DEFAULT '',
	`status` varchar(255) DEFAULT 'In Stock',
	`notes` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inv_no` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`customer_id` int,
	`customer_name` varchar(255) DEFAULT '',
	`customer_phone` varchar(255) DEFAULT '',
	`date` varchar(255) NOT NULL,
	`place_of_supply` varchar(255) DEFAULT '',
	`items` json,
	`old_metals` json,
	`payments` json,
	`subtotal` double DEFAULT 0,
	`discount_type` varchar(255) DEFAULT '%',
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
	`status` varchar(255) DEFAULT 'Unpaid',
	`notes` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_karigar_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`artisan_id` int,
	`artisan_name` varchar(255) DEFAULT '',
	`metal` varchar(255) DEFAULT 'Gold',
	`category` varchar(255) DEFAULT 'Rings',
	`purity` varchar(255) DEFAULT '22K (916)',
	`issue_date` varchar(255) NOT NULL,
	`duration_days` int DEFAULT 15,
	`labour_charges` double DEFAULT 0,
	`issued_wt` double DEFAULT 0,
	`less_wt` double DEFAULT 0,
	`wastage_pct` double DEFAULT 0,
	`received_wt` double DEFAULT 0,
	`status` varchar(255) DEFAULT 'Pending',
	`notes` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_karigar_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_ledger_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`date` varchar(255) NOT NULL,
	`type` varchar(255) NOT NULL,
	`amount` double NOT NULL,
	`mode` varchar(255) DEFAULT '',
	`ref_type` varchar(255) DEFAULT 'manual',
	`ref_id` int,
	`note` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_metal_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bill_no` varchar(255) NOT NULL,
	`party_type` varchar(255) DEFAULT 'customer',
	`party_id` int,
	`party_name` varchar(255) DEFAULT '',
	`date` varchar(255) NOT NULL,
	`out_products` json,
	`in_metals` json,
	`fine_out_gold` double DEFAULT 0,
	`fine_in_gold` double DEFAULT 0,
	`balance_gold` double DEFAULT 0,
	`fine_out_silver` double DEFAULT 0,
	`fine_in_silver` double DEFAULT 0,
	`balance_silver` double DEFAULT 0,
	`notes` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_metal_invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_settings` (
	`id` int NOT NULL DEFAULT 1,
	`shop_name` varchar(255) DEFAULT 'Shivaa Jewellers',
	`tagline` varchar(255) DEFAULT 'Fine Gold & Silver',
	`address` varchar(500) DEFAULT '',
	`phone` varchar(255) DEFAULT '',
	`gstin` varchar(255) DEFAULT '',
	`invoice_prefix` varchar(255) DEFAULT 'SHV',
	`gst_percent` double DEFAULT 3,
	`gold_rate` double DEFAULT 7500,
	`silver_rate` double DEFAULT 90,
	`rates_updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`company` varchar(255) DEFAULT '',
	`phone` varchar(255) DEFAULT '',
	`address` varchar(500) DEFAULT '',
	`city` varchar(255) DEFAULT '',
	`pan` varchar(255) DEFAULT '',
	`gstin` varchar(255) DEFAULT '',
	`acc_name` varchar(255) DEFAULT '',
	`acc_number` varchar(255) DEFAULT '',
	`ifsc` varchar(255) DEFAULT '',
	`notes` varchar(500) DEFAULT '',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billing_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`name` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `billing_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `billing_users_email_unique` UNIQUE(`email`)
);
