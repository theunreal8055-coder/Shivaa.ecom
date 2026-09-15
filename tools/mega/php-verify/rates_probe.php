<?php
/* Shivaa php-verify probe — executes the REAL cms/api.php and prints one route
   as JSON, so the rate contract can be checked without a live server.

   Usage:  php rates_probe.php rates|products
   It expects to live in a scratch dir that contains api.php + its includes
   (hallmark.php, trust.php, sms.php, mail.php) and data/db.json — gate.sh
   builds that dir for you. */
error_reporting(E_ALL & ~E_DEPRECATED & ~E_WARNING);   // PHP 8.5 deprecations must not pollute the JSON
ini_set('display_errors', '0');
$_GET['__route'] = $argv[1] ?? 'rates';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/api/' . ($_GET['__route']);
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
require __DIR__ . '/api.php';
