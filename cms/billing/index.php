<?php
/**
 * Shivaa Jewels — Billing · shell
 *
 * A single page. All data comes from api.php in this folder, so this file
 * never touches the database and can be cached freely.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';
billing_session_start();
$e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#17150f">
<title>Shivaa Billing</title>
<link rel="stylesheet" href="style.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>&#128141;</text></svg>">
</head>
<body>
<div id="app"><div class="boot">Loading…</div></div>
<script src="app.js" defer></script>
</body>
</html>
