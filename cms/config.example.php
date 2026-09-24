<?php
/**
 * Shivaa Jewels — Configuration & Hostinger MySQL Database Settings
 * 
 * Instructions:
 * 1. Copy this file to `cms/config.php` on your Hostinger server (or in File Manager).
 * 2. Fill in your Hostinger MySQL database details below.
 * 3. Never commit `cms/config.php` to Git (it is listed in .gitignore to protect your credentials).
 */

return [
  // Database Mode: 'mysql' or 'json' (v180)
  // 'mysql'  = product reads are served by Hostinger MySQL whenever the mirror
  //            is healthy; ANY doubt (no connection, counts differ, mirror flag)
  //            falls back to db.json automatically and reports the reason on
  //            /api/version → db.reason. Set 'json' to force the old path.
  // After installing a SQL release, open /upgrade-sql.php once (admin password)
  // to back up, upgrade the schema and reconcile the counts.
  'db_driver' => 'mysql',

  // Hostinger MySQL Credentials
  'mysql' => [
    'host'     => 'localhost',              // Hostinger MySQL Host (usually 'localhost')
    'dbname'   => 'YOUR_HOSTINGER_DB_NAME', // e.g. u123456789_shivaa
    'username' => 'YOUR_HOSTINGER_DB_USER', // e.g. u123456789_admin
    'password' => 'YOUR_HOSTINGER_DB_PASS', // Your Hostinger DB Password
    'port'     => 3306,
    'charset'  => 'utf8mb4'
  ],

  // Storage / CDN Configuration for 300,000 Designs
  'cdn' => [
    'enabled'  => false,
    'base_url' => 'https://shivaa.in/uploads/' // Or Cloudflare R2 / S3 CDN URL
  ]
];
