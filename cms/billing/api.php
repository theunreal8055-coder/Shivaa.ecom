<?php
/**
 * Shivaa Jewels — Billing · API
 *
 * Every route is session-gated and every query is a prepared statement.
 * This file only ever reads or writes tables prefixed `billing_`, with two
 * read-only exceptions used to build cumulative revenue: SELECT on the
 * shop's `orders` table.
 */
declare(strict_types=1);

require __DIR__ . '/lib.php';
require __DIR__ . '/reports.php';

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

billing_session_start();

$route  = (string)($_GET['r'] ?? '');
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$WRITE  = ['POST', 'PUT', 'PATCH', 'DELETE'];

/* ── rate limiting on sign-in only ─────────────────────────────────────── */
function billing_login_locked(string $ip): bool {
  $f = sys_get_temp_dir() . '/billing-login-' . md5($ip) . '.json';
  $j = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
  if (!is_array($j)) return false;
  return (int)($j['n'] ?? 0) >= 6 && (time() - (int)($j['t'] ?? 0)) < 900;
}
function billing_login_mark(string $ip, bool $reset = false): void {
  $f = sys_get_temp_dir() . '/billing-login-' . md5($ip) . '.json';
  if ($reset) { @unlink($f); return; }
  $j = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
  if (!is_array($j) || (time() - (int)($j['t'] ?? 0)) >= 900) $j = ['n' => 0, 't' => 0];
  $j['n'] = (int)$j['n'] + 1; $j['t'] = time();
  @file_put_contents($f, json_encode($j), LOCK_EX);
}

$ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'cli');

/* ── public routes ─────────────────────────────────────────────────────── */

if ($route === 'me' && $method === 'GET') {
  $u = billing_user();
  billing_json(['ok' => true, 'user' => $u ? ['email' => $u['email'], 'name' => $u['name']] : null,
                'csrf' => billing_csrf(), 'version' => BILLING_VERSION]);
}

if ($route === 'login' && $method === 'POST') {
  $in = billing_input();
  if (billing_login_locked($ip)) billing_fail('Too many attempts — wait 15 minutes.', 429);
  $email = strtolower(billing_str($in['email'] ?? '', 191));
  $pass  = (string)($in['password'] ?? '');
  if ($email === '' || $pass === '') { billing_login_mark($ip); billing_fail('Enter email and password.', 401); }
  try {
    $st = billing_db()->prepare('SELECT * FROM `billing_users` WHERE `email` = ? LIMIT 1');
    $st->execute([$email]);
    $row = $st->fetch();
  } catch (Throwable $e) { billing_fail('Database error: ' . $e->getMessage(), 500); }
  if (!$row || !password_verify($pass, (string)$row['password_hash'])) {
    billing_login_mark($ip);
    billing_fail('Wrong email or password.', 401);
  }
  billing_login_mark($ip, true);
  session_regenerate_id(true);
  $_SESSION['billing_user'] = ['id' => (int)$row['id'], 'email' => (string)$row['email'],
                               'name' => (string)($row['name'] ?: $row['email'])];
  billing_audit('Signed in', 'user', (int)$row['id'], (string)$row['email']);
  billing_json(['ok' => true, 'csrf' => billing_csrf()]);
}

if ($route === 'logout' && $method === 'POST') {
  $_SESSION = [];
  session_destroy();
  billing_json(['ok' => true]);
}

/* Everything below needs a session. */
billing_require_user();
if (in_array($method, $WRITE, true)) billing_check_csrf();

$pdo = billing_db();

/* ── vocabulary ─────────────────────────────────────────────────────────── */
if ($route === 'meta') {
  billing_json(['ok' => true,
    'categories' => BILLING_CATEGORIES, 'purities' => BILLING_PURITIES,
    'modes' => BILLING_PAYMENT_MODES, 'expenseCategories' => BILLING_EXPENSE_CATEGORIES,
    'channels' => BILLING_CHANNELS,
  ]);
}

/* ── settings ───────────────────────────────────────────────────────────── */
if ($route === 'settings' && $method === 'GET') {
  $s = $pdo->query('SELECT * FROM `billing_settings` WHERE `id` = 1')->fetch();
  billing_json(['ok' => true, 'settings' => $s ?: null]);
}
if ($route === 'settings' && $method === 'POST') {
  $in = billing_input();
  $pdo->prepare('INSERT INTO `billing_settings`
      (`id`,`shop_name`,`tagline`,`address`,`phone`,`gstin`,`invoice_prefix`,
       `gst_percent`,`gold_rate`,`silver_rate`,`state_code`,`rates_updated_at`)
    VALUES (1,?,?,?,?,?,?,?,?,?,?,NOW())
    ON DUPLICATE KEY UPDATE `shop_name`=VALUES(`shop_name`),`tagline`=VALUES(`tagline`),
      `address`=VALUES(`address`),`phone`=VALUES(`phone`),`gstin`=VALUES(`gstin`),
      `invoice_prefix`=VALUES(`invoice_prefix`),`gst_percent`=VALUES(`gst_percent`),
      `gold_rate`=VALUES(`gold_rate`),`silver_rate`=VALUES(`silver_rate`),
      `state_code`=VALUES(`state_code`),`rates_updated_at`=NOW()')
    ->execute([
      billing_str($in['shopName'] ?? '', 191) ?: 'Shivaa Jewellers',
      billing_str($in['tagline'] ?? '', 191), billing_str($in['address'] ?? '', 500),
      billing_str($in['phone'] ?? '', 64), billing_str($in['gstin'] ?? '', 64),
      billing_str($in['invoicePrefix'] ?? 'SHV', 16) ?: 'SHV',
      billing_num($in['gstPercent'] ?? 3), billing_num($in['goldRate'] ?? 0),
      billing_num($in['silverRate'] ?? 0), billing_str($in['stateCode'] ?? '08', 8) ?: '08',
    ]);
  billing_audit('Settings updated', 'settings', 1);
  billing_json(['ok' => true]);
}

/* ── dashboard: cumulative revenue, split by channel ────────────────────── */
if ($route === 'dashboard') {
  $byChannel = [];
  foreach (array_keys(BILLING_CHANNELS) as $c) $byChannel[$c] = ['bills' => 0, 'total' => 0.0, 'due' => 0.0];

  $st = $pdo->query("SELECT `channel`, COUNT(*) n, COALESCE(SUM(`grand_total`),0) t,
                     COALESCE(SUM(`balance_due`),0) d
                     FROM `billing_bills` WHERE `doc_type` = 'GST' GROUP BY `channel`");
  foreach ($st->fetchAll() as $r) {
    $c = (string)$r['channel'];
    if (!isset($byChannel[$c])) continue;
    $byChannel[$c] = ['bills' => (int)$r['n'], 'total' => round(billing_num($r['t']), 2),
                      'due' => round(billing_num($r['d']), 2)];
  }

  $billingTotal = 0.0; $billingBills = 0; $billingDue = 0.0;
  foreach ($byChannel as $v) { $billingTotal += $v['total']; $billingBills += $v['bills']; $billingDue += $v['due']; }

  /* The website's own paid orders count towards cumulative revenue too. */
  $shop = billing_shop_revenue($pdo);

  $stock = $pdo->query('SELECT COALESCE(SUM(`physical_pcs`),0) pcs,
                        COALESCE(SUM(`physical_grams`),0) g,
                        COALESCE(SUM(`online_stock`),0) online, COUNT(*) items
                        FROM `billing_items`')->fetch() ?: [];
  $dues = $pdo->query("SELECT COUNT(*) n FROM `billing_bills`
                       WHERE `balance_due` > 0 AND `doc_type` = 'GST'")->fetchColumn();

  billing_json(['ok' => true,
    'channels'     => $byChannel,
    'billingTotal' => round($billingTotal, 2), 'billingBills' => $billingBills,
    'billingDue'   => round($billingDue, 2),
    'shopOnline'   => $shop,
    'cumulative'   => round($billingTotal + billing_num($shop['total'] ?? 0), 2),
    'stock'        => ['pcs' => (int)($stock['pcs'] ?? 0), 'grams' => round(billing_num($stock['g'] ?? 0), 3),
                       'online' => (int)($stock['online'] ?? 0), 'items' => (int)($stock['items'] ?? 0)],
    'openDues'     => (int)$dues,
  ]);
}

/* ── parties ────────────────────────────────────────────────────────────── */
if ($route === 'parties' && $method === 'GET') {
  $kind = billing_str($_GET['kind'] ?? '', 16);
  $sql = 'SELECT * FROM `billing_parties`';
  $args = [];
  if ($kind !== '') { $sql .= ' WHERE `kind` = ?'; $args[] = $kind; }
  $sql .= ' ORDER BY `name` ASC LIMIT 1000';
  $st = $pdo->prepare($sql); $st->execute($args);
  billing_json(['ok' => true, 'parties' => $st->fetchAll()]);
}
if ($route === 'parties' && $method === 'POST') {
  $in = billing_input();
  $kind = billing_str($in['kind'] ?? 'customer', 16) ?: 'customer';
  $name = billing_str($in['name'] ?? '', 191);
  if ($name === '') billing_fail('Name is required.');
  $pdo->prepare('INSERT INTO `billing_parties`
    (`kind`,`name`,`phone`,`email`,`address`,`city`,`state_code`,`pan`,`gstin`,`aadhar`,
     `partner_id`,`bank_name`,`acc_number`,`ifsc`,`credit_limit`,`credit_days`,
     `specialization`,`notes`)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$kind, $name, billing_str($in['phone'] ?? '', 32), billing_str($in['email'] ?? '', 191),
      billing_str($in['address'] ?? '', 500), billing_str($in['city'] ?? '', 128),
      billing_str($in['stateCode'] ?? '', 8), billing_str($in['pan'] ?? '', 32),
      billing_str($in['gstin'] ?? '', 64), billing_str($in['aadhar'] ?? '', 32),
      billing_str($in['partnerId'] ?? '', 64), billing_str($in['bankName'] ?? '', 128),
      billing_str($in['accNumber'] ?? '', 64), billing_str($in['ifsc'] ?? '', 32),
      billing_num($in['creditLimit'] ?? 0), billing_int($in['creditDays'] ?? 0),
      billing_str($in['specialization'] ?? '', 128), billing_str($in['notes'] ?? '', 500)]);
  $id = (int)$pdo->lastInsertId();
  billing_audit('Party added', 'party', $id, "$kind • $name");
  billing_json(['ok' => true, 'id' => $id]);
}

/* ── stock ──────────────────────────────────────────────────────────────── */
if ($route === 'items' && $method === 'GET') {
  $q = billing_str($_GET['q'] ?? '', 64);
  $sql = 'SELECT * FROM `billing_items`';
  $args = [];
  if ($q !== '') { $sql .= ' WHERE `name` LIKE ? OR `sku` LIKE ? OR `huid` LIKE ?';
                   $args = ["%$q%", "%$q%", "%$q%"]; }
  $sql .= ' ORDER BY `id` DESC LIMIT 2000';
  $st = $pdo->prepare($sql); $st->execute($args);
  billing_json(['ok' => true, 'items' => $st->fetchAll()]);
}

if ($route === 'items' && $method === 'POST') {
  $in = billing_input();
  $name = billing_str($in['name'] ?? '', 191);
  if ($name === '') billing_fail('Item name is required.');
  $gross = billing_num($in['grossWt'] ?? 0);
  $less  = billing_num($in['lessWt'] ?? 0);
  $stone = billing_num($in['stoneWt'] ?? 0);
  $net   = billing_num($in['netWt'] ?? 0);
  if ($net <= 0) $net = max(0.0, $gross - $less - $stone);   // derive when not given
  $pcs   = billing_int($in['physicalPcs'] ?? 0);
  $grams = round($net * $pcs, 3);
  $ful   = ($in['fulfilment'] ?? 'ready') === 'made_to_order' ? 'made_to_order' : 'ready';

  $pdo->prepare('INSERT INTO `billing_items`
    (`sku`,`huid`,`name`,`category`,`metal`,`purity`,`gross_wt`,`less_wt`,`stone_wt`,
     `net_wt`,`making_per_g`,`stone_details`,`online_stock`,`physical_pcs`,
     `physical_grams`,`fulfilment`,`product_id`,`status`,`notes`)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([billing_str($in['sku'] ?? '', 64), billing_str($in['huid'] ?? '', 64), $name,
      billing_str($in['category'] ?? 'Rings', 64), billing_str($in['metal'] ?? 'Gold', 16),
      billing_str($in['purity'] ?? '22K (916)', 32), $gross, $less, $stone, $net,
      billing_num($in['makingPerG'] ?? 0), billing_str($in['stoneDetails'] ?? '', 500),
      billing_int($in['onlineStock'] ?? 0), $pcs, $grams, $ful,
      billing_str($in['productId'] ?? '', 64), 'In Stock', billing_str($in['notes'] ?? '', 500)]);
  $id = (int)$pdo->lastInsertId();
  if ($pcs !== 0 || $grams > 0) {
    $pdo->prepare('INSERT INTO `billing_stock_ledger`
      (`item_id`,`sku`,`channel`,`delta_pcs`,`delta_grams`,`ref_type`,`ref_id`,`note`)
      VALUES (?,?,?,?,?,?,?,?)')
      ->execute([$id, billing_str($in['sku'] ?? '', 64), 'purchase', $pcs, $grams,
                 'opening', $id, 'Opening stock']);
  }
  billing_audit('Item added', 'item', $id, $name);
  billing_json(['ok' => true, 'id' => $id]);
}

/* A stock movement. Always writes a ledger row, so nothing is ever silent. */
if ($route === 'stock' && $method === 'POST') {
  $in = billing_input();
  $itemId = billing_int($in['itemId'] ?? 0);
  $channel = billing_str($in['channel'] ?? 'correction', 16);
  if (!in_array($channel, BILLING_STOCK_CHANNELS, true)) billing_fail('Unknown stock channel.');
  $dPcs = billing_int($in['deltaPcs'] ?? 0);
  $dGrams = round(billing_num($in['deltaGrams'] ?? 0), 3);
  if ($dPcs === 0 && abs($dGrams) < 0.0005) billing_fail('Nothing to record — enter a change.');

  $st = $pdo->prepare('SELECT * FROM `billing_items` WHERE `id` = ?'); $st->execute([$itemId]);
  $item = $st->fetch();
  if (!$item) billing_fail('Item not found.', 404);

  $newPcs = max(0, (int)$item['physical_pcs'] + $dPcs);
  $newG   = max(0.0, round(billing_num($item['physical_grams']) + $dGrams, 3));
  $pdo->prepare('UPDATE `billing_items` SET `physical_pcs` = ?, `physical_grams` = ? WHERE `id` = ?')
      ->execute([$newPcs, $newG, $itemId]);
  $pdo->prepare('INSERT INTO `billing_stock_ledger`
    (`item_id`,`sku`,`channel`,`delta_pcs`,`delta_grams`,`ref_type`,`ref_id`,`note`)
    VALUES (?,?,?,?,?,?,?,?)')
    ->execute([$itemId, (string)$item['sku'], $channel, $dPcs, $dGrams,
               billing_str($in['refType'] ?? 'manual', 16), billing_int($in['refId'] ?? 0),
               billing_str($in['note'] ?? '', 500)]);
  billing_audit('Stock moved', 'item', $itemId, "$channel • $dPcs pcs • $dGrams g");
  billing_json(['ok' => true, 'physicalPcs' => $newPcs, 'physicalGrams' => $newG]);
}

if ($route === 'stock/ledger') {
  $st = $pdo->query('SELECT * FROM `billing_stock_ledger` ORDER BY `id` DESC LIMIT 500');
  billing_json(['ok' => true, 'ledger' => $st->fetchAll()]);
}

/* ── bills ──────────────────────────────────────────────────────────────── */
if ($route === 'bills' && $method === 'GET') {
  $sql = "SELECT `id`,`bill_no`,`doc_type`,`channel`,`party_name`,`bill_date`,`grand_total`,
                 `amount_paid`,`balance_due`,`status` FROM `billing_bills`";
  $args = []; $where = [];
  if (($ch = billing_str($_GET['channel'] ?? '', 16)) !== '' && isset(BILLING_CHANNELS[$ch])) {
    $where[] = '`channel` = ?'; $args[] = $ch;
  }
  if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
  $sql .= ' ORDER BY `id` DESC LIMIT 1000';
  $st = $pdo->prepare($sql); $st->execute($args);
  billing_json(['ok' => true, 'bills' => $st->fetchAll()]);
}

if ($route === 'bills' && $method === 'POST') {
  $in = billing_input();
  $items = is_array($in['items'] ?? null) ? $in['items'] : [];
  if (!$items) billing_fail('Add at least one item to the bill.');

  $channel = billing_str($in['channel'] ?? 'b2c_offline', 16);
  if (!isset(BILLING_CHANNELS[$channel])) billing_fail('Unknown channel.');
  $docType = ($in['docType'] ?? 'GST') === 'Estimate' ? 'Estimate' : 'GST';

  $partyId = billing_int($in['partyId'] ?? 0);
  $st = $pdo->prepare('SELECT * FROM `billing_parties` WHERE `id` = ?'); $st->execute([$partyId]);
  $party = $st->fetch();
  if (!$party) billing_fail('Select a customer or jeweller first.');

  $s = $pdo->query('SELECT * FROM `billing_settings` WHERE `id` = 1')->fetch() ?: [];
  $gstPercent = billing_num($s['gst_percent'] ?? 3);

  $clean = []; $itemTotals = [];
  foreach ($items as $it) {
    $netWt = billing_num($it['netWt'] ?? 0);
    $pcs   = max(1, billing_int($it['pieces'] ?? 1));
    $rate  = billing_num($it['rate'] ?? 0);
    $making = billing_num($it['making'] ?? 0);
    $total = billing_num($it['totalCost'] ?? 0);
    if ($total <= 0) $total = round(($netWt * $rate + $making) * $pcs, 2);
    $itemTotals[] = $total;
    $clean[] = ['itemId' => billing_int($it['itemId'] ?? 0) ?: null,
                'name' => billing_str($it['name'] ?? '', 191), 'huid' => billing_str($it['huid'] ?? '', 64),
                'metal' => billing_str($it['metal'] ?? 'Gold', 16),
                'purity' => billing_str($it['purity'] ?? '', 32),
                'netWt' => $netWt, 'pieces' => $pcs, 'rate' => $rate,
                'making' => $making, 'totalCost' => $total];
  }
  $oldMetals = []; $oldTotals = [];
  foreach ((is_array($in['oldMetals'] ?? null) ? $in['oldMetals'] : []) as $m) {
    $tc = billing_num($m['totalCost'] ?? 0); $oldTotals[] = $tc;
    $oldMetals[] = ['metal' => billing_str($m['metal'] ?? 'Gold', 16),
                    'name' => billing_str($m['name'] ?? '', 191), 'netWt' => billing_num($m['netWt'] ?? 0),
                    'rate' => billing_num($m['rate'] ?? 0), 'totalCost' => $tc];
  }
  $payments = []; $payTotals = [];
  foreach ((is_array($in['payments'] ?? null) ? $in['payments'] : []) as $p) {
    $amt = billing_num($p['amount'] ?? 0);
    if ($amt <= 0) continue;
    $payTotals[] = $amt;
    $payments[] = ['amount' => $amt, 'mode' => billing_str($p['mode'] ?? 'Cash', 32)];
  }

  $t = billing_totals(['itemTotals' => $itemTotals, 'discountType' => ($in['discountType'] ?? '%') === 'Rs' ? 'Rs' : '%',
    'discountValue' => billing_num($in['discountValue'] ?? 0), 'gstPercent' => $gstPercent,
    'applyGst' => $docType === 'GST', 'oldMetalTotals' => $oldTotals,
    'roundOff' => billing_num($in['roundOff'] ?? 0), 'payments' => $payTotals]);

  /* Bill numbers come from MAX, not COUNT, so deleting a bill cannot
     cause a number to be issued twice. */
  $prefix = $docType === 'GST' ? (billing_str($s['invoice_prefix'] ?? 'SHV', 16) ?: 'SHV') : 'EST';
  $like = $prefix . '-%';
  $st = $pdo->prepare("SELECT MAX(CAST(SUBSTRING(`bill_no`, ?) AS UNSIGNED)) FROM `billing_bills`
                       WHERE `bill_no` LIKE ?");
  $st->execute([strlen($prefix) + 2, $like]);
  $seq = (int)$st->fetchColumn() + 1;
  $billNo = $prefix . '-' . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);

  $status = $t['balanceDue'] <= 0 ? 'Paid' : ($t['amountPaid'] > 0 ? 'Partial' : 'Unpaid');
  $date = billing_str($in['date'] ?? billing_today(), 10) ?: billing_today();

  $pdo->prepare('INSERT INTO `billing_bills`
    (`bill_no`,`doc_type`,`channel`,`party_id`,`party_name`,`party_phone`,`bill_date`,
     `place_of_supply`,`items`,`old_metals`,`payments`,`subtotal`,`discount_type`,
     `discount_value`,`discount_amount`,`taxable`,`gst_percent`,`gst_amount`,
     `old_metal_deduction`,`round_off`,`grand_total`,`amount_paid`,`balance_due`,
     `credit_days`,`status`,`shop_order_id`,`notes`)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$billNo, $docType, $channel, (int)$party['id'], (string)$party['name'],
      (string)$party['phone'], $date, billing_str($in['placeOfSupply'] ?? '', 64),
      json_encode($clean), json_encode($oldMetals), json_encode($payments),
      $t['subtotal'], ($in['discountType'] ?? '%') === 'Rs' ? 'Rs' : '%',
      billing_num($in['discountValue'] ?? 0), $t['discountAmount'], $t['taxable'],
      $docType === 'GST' ? $gstPercent : 0, $t['gstAmount'], $t['oldMetalDeduction'],
      billing_num($in['roundOff'] ?? 0), $t['grandTotal'], $t['amountPaid'], $t['balanceDue'],
      billing_int($in['creditDays'] ?? 0), $status, billing_str($in['shopOrderId'] ?? '', 64),
      billing_str($in['notes'] ?? '', 500)]);
  $billId = (int)$pdo->lastInsertId();

  /* Only a ready-stock item physically leaves the tray. A made-to-order sale
     starts production instead, so physical stock is untouched. */
  $stockChannel = $channel === 'b2b' ? 'offline_b2b' : ($channel === 'b2c_online' ? 'online_b2c' : 'offline_b2c');
  foreach ($clean as $it) {
    if (!$it['itemId']) continue;
    $st = $pdo->prepare('SELECT * FROM `billing_items` WHERE `id` = ?'); $st->execute([$it['itemId']]);
    $row = $st->fetch();
    if (!$row || $row['fulfilment'] !== 'ready') continue;
    $takePcs = (int)$it['pieces'];
    $takeG = round(billing_num($row['net_wt']) * $takePcs, 3);
    $pdo->prepare('UPDATE `billing_items` SET `physical_pcs` = GREATEST(0, `physical_pcs` - ?),
                   `physical_grams` = GREATEST(0, `physical_grams` - ?),
                   `online_stock` = GREATEST(0, `online_stock` - ?) WHERE `id` = ?')
        ->execute([$takePcs, $takeG, $takePcs, $it['itemId']]);
    $pdo->prepare('INSERT INTO `billing_stock_ledger`
      (`item_id`,`sku`,`channel`,`delta_pcs`,`delta_grams`,`ref_type`,`ref_id`,`note`)
      VALUES (?,?,?,?,?,?,?,?)')
      ->execute([$it['itemId'], (string)$row['sku'], $stockChannel, -$takePcs, -$takeG,
                 'bill', $billId, "Sold on $billNo"]);
  }

  /* Khata: the bill is a debit, each payment a credit. */
  $pdo->prepare('INSERT INTO `billing_ledger`
    (`party_id`,`entry_date`,`entry_type`,`amount`,`ref_type`,`ref_id`,`note`)
    VALUES (?,?,?,?,?,?,?)')
    ->execute([(int)$party['id'], $date, 'debit', $t['grandTotal'], 'bill', $billId, $billNo]);
  foreach ($payments as $p) {
    $pdo->prepare('INSERT INTO `billing_ledger`
      (`party_id`,`entry_date`,`entry_type`,`amount`,`mode`,`ref_type`,`ref_id`,`note`)
      VALUES (?,?,?,?,?,?,?,?)')
      ->execute([(int)$party['id'], $date, 'credit', $p['amount'], $p['mode'], 'payment', $billId,
                 'Payment against ' . $billNo]);
  }

  billing_audit("$docType created", 'bill', $billId, "$billNo • {$party['name']} • " . $t['grandTotal']);
  billing_json(['ok' => true, 'id' => $billId, 'billNo' => $billNo, 'totals' => $t, 'status' => $status]);
}

if (preg_match('#^bills/(\d+)$#', $route, $m) && $method === 'GET') {
  $st = $pdo->prepare('SELECT * FROM `billing_bills` WHERE `id` = ?'); $st->execute([(int)$m[1]]);
  $b = $st->fetch();
  if (!$b) billing_fail('Bill not found.', 404);
  foreach (['items', 'old_metals', 'payments'] as $k) {
    $b[$k] = json_decode((string)($b[$k] ?? '[]'), true) ?: [];
  }
  $s = $pdo->query('SELECT `shop_name`,`address`,`phone`,`gstin`,`state_code` FROM `billing_settings` WHERE `id`=1')->fetch() ?: [];
  billing_json(['ok' => true, 'bill' => $b, 'shop' => $s,
                'inWords' => billing_amount_words(billing_num($b['grand_total']))]);
}

if (preg_match('#^bills/(\d+)/payment$#', $route, $m) && $method === 'POST') {
  $in = billing_input();
  $amount = billing_num($in['amount'] ?? 0);
  $mode = billing_str($in['mode'] ?? 'Cash', 32) ?: 'Cash';
  if ($amount <= 0) billing_fail('Enter an amount greater than zero.');
  $st = $pdo->prepare('SELECT * FROM `billing_bills` WHERE `id` = ?'); $st->execute([(int)$m[1]]);
  $b = $st->fetch();
  if (!$b) billing_fail('Bill not found.', 404);

  $payments = json_decode((string)($b['payments'] ?? '[]'), true) ?: [];
  $payments[] = ['amount' => $amount, 'mode' => $mode];
  $paid = round(billing_num($b['amount_paid']) + $amount, 2);
  $due = max(0.0, round(billing_num($b['grand_total']) - $paid, 2));
  $status = $due <= 0 ? 'Paid' : 'Partial';
  $date = billing_str($in['date'] ?? billing_today(), 10) ?: billing_today();

  $pdo->prepare('UPDATE `billing_bills` SET `payments`=?,`amount_paid`=?,`balance_due`=?,`status`=? WHERE `id`=?')
      ->execute([json_encode($payments), $paid, $due, $status, (int)$b['id']]);
  $pdo->prepare('INSERT INTO `billing_ledger`
    (`party_id`,`entry_date`,`entry_type`,`amount`,`mode`,`ref_type`,`ref_id`,`note`)
    VALUES (?,?,?,?,?,?,?,?)')
    ->execute([(int)$b['party_id'], $date, 'credit', $amount, $mode, 'payment', (int)$b['id'],
               'Payment against ' . $b['bill_no']]);
  billing_audit('Payment received', 'bill', (int)$b['id'], "{$b['bill_no']} • $amount $mode");
  billing_json(['ok' => true, 'amountPaid' => $paid, 'balanceDue' => $due, 'status' => $status]);
}

/* ── khata ──────────────────────────────────────────────────────────────── */
if ($route === 'khata') {
  $st = $pdo->query("SELECT p.`id`, p.`name`, p.`phone`,
      COALESCE(SUM(CASE WHEN l.`entry_type`='debit' THEN l.`amount` ELSE -l.`amount` END),0) balance
      FROM `billing_parties` p
      LEFT JOIN `billing_ledger` l ON l.`party_id` = p.`id`
      WHERE p.`kind` IN ('customer','jeweller')
      GROUP BY p.`id`, p.`name`, p.`phone`
      HAVING balance <> 0 ORDER BY balance DESC LIMIT 1000");
  $rows = $st->fetchAll();
  foreach ($rows as &$r) $r['balance'] = round(billing_num($r['balance']), 2);
  unset($r);
  billing_json(['ok' => true, 'accounts' => $rows,
                'totalDue' => round(array_sum(array_map(fn($r) => max(0, $r['balance']), $rows)), 2)]);
}

/* ── expenses ───────────────────────────────────────────────────────────── */
if ($route === 'expenses' && $method === 'GET') {
  $st = $pdo->query('SELECT * FROM `billing_expenses` ORDER BY `id` DESC LIMIT 1000');
  $rows = $st->fetchAll();
  $sum = 0.0; foreach ($rows as $r) $sum += billing_num($r['amount']);
  billing_json(['ok' => true, 'expenses' => $rows, 'total' => round($sum, 2)]);
}
if ($route === 'expenses' && $method === 'POST') {
  $in = billing_input();
  $amount = billing_num($in['amount'] ?? 0);
  if ($amount <= 0) billing_fail('Enter an amount greater than zero.');
  $pdo->prepare('INSERT INTO `billing_expenses` (`exp_date`,`category`,`description`,`amount`,`payment_mode`)
                 VALUES (?,?,?,?,?)')
    ->execute([billing_str($in['date'] ?? billing_today(), 10) ?: billing_today(),
      billing_str($in['category'] ?? 'General', 64), billing_str($in['description'] ?? '', 500),
      $amount, billing_str($in['paymentMode'] ?? 'Cash', 32)]);
  $id = (int)$pdo->lastInsertId();
  billing_audit('Expense added', 'expense', $id, (string)$amount);
  billing_json(['ok' => true, 'id' => $id]);
}

/* ── reports ────────────────────────────────────────────────────────────── */
if ($route === 'reports') {
  $st = $pdo->query("SELECT `channel`, COALESCE(SUM(`grand_total`),0) total,
                     COALESCE(SUM(`gst_amount`),0) gst, COUNT(*) n
                     FROM `billing_bills` WHERE `doc_type`='GST' GROUP BY `channel`");
  $rows = $st->fetchAll();
  $exp = (float)$pdo->query('SELECT COALESCE(SUM(`amount`),0) FROM `billing_expenses`')->fetchColumn();
  $gross = 0.0; $gst = 0.0;
  foreach ($rows as $r) { $gross += billing_num($r['total']); $gst += billing_num($r['gst']); }
  $shop = billing_shop_revenue($pdo);
  billing_json(['ok' => true, 'byChannel' => $rows, 'gross' => round($gross, 2),
    'gstCollected' => round($gst, 2), 'expenses' => round($exp, 2),
    'net' => round($gross - $exp, 2), 'shopOnline' => $shop,
    'cumulative' => round($gross + billing_num($shop['total'] ?? 0), 2)]);
}

/* ── metal exchange ─────────────────────────────────────────────────────── */
if ($route === 'metal' && $method === 'GET') {
  $st = $pdo->query("SELECT `id`,`bill_no`,`party_name`,`bill_date`,`balance_gold`,
                     `balance_silver`,`labour_total` FROM `billing_metal_bills`
                     ORDER BY `id` DESC LIMIT 500");
  $rows = $st->fetchAll();
  $gold = 0.0; $silver = 0.0;
  foreach ($rows as $r) { $gold += billing_num($r['balance_gold']); $silver += billing_num($r['balance_silver']); }
  billing_json(['ok' => true, 'bills' => $rows,
                'netGold' => round($gold, 3), 'netSilver' => round($silver, 3)]);
}

if ($route === 'metal' && $method === 'POST') {
  $in = billing_input();
  $partyId = billing_int($in['partyId'] ?? 0);
  $st = $pdo->prepare('SELECT * FROM `billing_parties` WHERE `id` = ?'); $st->execute([$partyId]);
  $party = $st->fetch();
  if (!$party) billing_fail('Select a party first.');

  $outItems = []; $outGold = 0.0; $outSilver = 0.0; $labour = 0.0;
  foreach ((is_array($in['outItems'] ?? null) ? $in['outItems'] : []) as $o) {
    $net = billing_num($o['netWt'] ?? 0);
    $wastage = billing_num($o['wastage'] ?? 0);
    $fine = round($net * (1 - $wastage / 100), 3);
    $metal = billing_str($o['metal'] ?? 'Gold', 16);
    if ($metal === 'Silver') $outSilver += $fine; else $outGold += $fine;
    $lab = billing_num($o['labour'] ?? 0); $labour += $lab;
    $outItems[] = ['name' => billing_str($o['name'] ?? '', 191), 'metal' => $metal,
                   'purity' => billing_str($o['purity'] ?? '', 32), 'netWt' => $net,
                   'wastage' => $wastage, 'fineWt' => $fine, 'labour' => $lab];
  }
  $inMetals = []; $inGold = 0.0; $inSilver = 0.0;
  foreach ((is_array($in['inMetals'] ?? null) ? $in['inMetals'] : []) as $m) {
    $gross = billing_num($m['gross'] ?? 0);
    $tunch = billing_num($m['tunch'] ?? 0);           // impurity %
    $fine = round($gross * (1 - $tunch / 100), 3);
    $metal = billing_str($m['metal'] ?? 'Gold', 16);
    if ($metal === 'Silver') $inSilver += $fine; else $inGold += $fine;
    $inMetals[] = ['metal' => $metal, 'name' => billing_str($m['name'] ?? '', 191),
                   'gross' => $gross, 'tunch' => $tunch, 'fineWt' => $fine];
  }

  $st = $pdo->prepare("SELECT MAX(CAST(SUBSTRING(`bill_no`, 4) AS UNSIGNED))
                       FROM `billing_metal_bills` WHERE `bill_no` LIKE 'MET-%'");
  $st->execute();
  $billNo = 'MET-' . str_pad((string)(((int)$st->fetchColumn()) + 1), 4, '0', STR_PAD_LEFT);
  $date = billing_str($in['date'] ?? billing_today(), 10) ?: billing_today();

  $pdo->prepare('INSERT INTO `billing_metal_bills`
    (`bill_no`,`party_id`,`party_name`,`bill_date`,`out_items`,`in_metals`,
     `fine_out_gold`,`fine_in_gold`,`balance_gold`,`fine_out_silver`,
     `fine_in_silver`,`balance_silver`,`labour_total`,`notes`)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([$billNo, (int)$party['id'], (string)$party['name'], $date,
      json_encode($outItems), json_encode($inMetals),
      round($outGold, 3), round($inGold, 3), round($outGold - $inGold, 3),
      round($outSilver, 3), round($inSilver, 3), round($outSilver - $inSilver, 3),
      round($labour, 2), billing_str($in['notes'] ?? '', 500)]);
  $id = (int)$pdo->lastInsertId();

  /* Labour on a metal exchange is real money, so it goes in the khata. */
  if ($labour > 0) {
    $pdo->prepare('INSERT INTO `billing_ledger`
      (`party_id`,`entry_date`,`entry_type`,`amount`,`ref_type`,`ref_id`,`note`)
      VALUES (?,?,?,?,?,?,?)')
      ->execute([(int)$party['id'], $date, 'debit', round($labour, 2), 'metal', $id,
                 'Labour on ' . $billNo]);
  }
  billing_audit('Metal bill created', 'metal', $id, $billNo);
  billing_json(['ok' => true, 'id' => $id, 'billNo' => $billNo]);
}

if (preg_match('#^metal/(\d+)$#', $route, $m) && $method === 'GET') {
  $st = $pdo->prepare('SELECT * FROM `billing_metal_bills` WHERE `id` = ?'); $st->execute([(int)$m[1]]);
  $b = $st->fetch();
  if (!$b) billing_fail('Metal bill not found.', 404);
  $b['out_items'] = json_decode((string)($b['out_items'] ?? '[]'), true) ?: [];
  $b['in_metals'] = json_decode((string)($b['in_metals'] ?? '[]'), true) ?: [];
  billing_json(['ok' => true, 'bill' => $b]);
}

/* ── karigar jobs ───────────────────────────────────────────────────────── */
if ($route === 'karigar' && $method === 'GET') {
  $st = $pdo->query('SELECT * FROM `billing_karigar_jobs` ORDER BY `id` DESC LIMIT 500');
  $rows = $st->fetchAll();
  $issued = 0.0; $received = 0.0; $labour = 0.0;
  foreach ($rows as $r) {
    if ($r['status'] !== 'Completed') $issued += billing_num($r['issued_wt']);
    $received += billing_num($r['received_wt']);
    if ($r['status'] !== 'Completed') $labour += billing_num($r['labour_charges']);
  }
  billing_json(['ok' => true, 'jobs' => $rows,
    'metalOut' => round($issued, 3), 'metalBack' => round($received, 3),
    'labourDue' => round($labour, 2)]);
}

if ($route === 'karigar' && $method === 'POST') {
  $in = billing_input();
  $partyId = billing_int($in['partyId'] ?? 0);
  $st = $pdo->prepare("SELECT * FROM `billing_parties` WHERE `id` = ?"); $st->execute([$partyId]);
  $p = $st->fetch();
  if (!$p) billing_fail('Select a karigar first.');
  $issue = billing_str($in['issueDate'] ?? billing_today(), 10) ?: billing_today();
  $days = billing_int($in['durationDays'] ?? 15);
  $due = date('Y-m-d', strtotime($issue . ' +' . max(0, $days) . ' days'));
  $pdo->prepare('INSERT INTO `billing_karigar_jobs`
    (`party_id`,`artisan_name`,`metal`,`category`,`purity`,`issue_date`,`due_date`,
     `labour_charges`,`issued_wt`,`less_wt`,`wastage_pct`,`status`,`notes`)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([(int)$p['id'], (string)$p['name'], billing_str($in['metal'] ?? 'Gold', 16),
      billing_str($in['category'] ?? 'Rings', 64), billing_str($in['purity'] ?? '22K (916)', 32),
      $issue, $due, billing_num($in['labourCharges'] ?? 0), billing_num($in['issuedWt'] ?? 0),
      billing_num($in['lessWt'] ?? 0), billing_num($in['wastagePct'] ?? 0),
      'Pending', billing_str($in['notes'] ?? '', 500)]);
  $id = (int)$pdo->lastInsertId();
  billing_audit('Karigar job issued', 'karigar', $id, (string)$p['name']);
  billing_json(['ok' => true, 'id' => $id]);
}

if (preg_match('#^karigar/(\d+)/complete$#', $route, $m) && $method === 'POST') {
  $in = billing_input();
  $st = $pdo->prepare('SELECT * FROM `billing_karigar_jobs` WHERE `id` = ?'); $st->execute([(int)$m[1]]);
  $j = $st->fetch();
  if (!$j) billing_fail('Job not found.', 404);
  $recv = billing_num($in['receivedWt'] ?? 0);
  $labour = billing_num($in['labourCharges'] ?? $j['labour_charges']);
  $pdo->prepare("UPDATE `billing_karigar_jobs` SET `status`='Completed', `received_wt`=?,
                 `labour_charges`=? WHERE `id`=?")->execute([$recv, $labour, (int)$j['id']]);

  /* Gold that comes back is real stock again. */
  $back = round($recv * (1 - billing_num($j['wastage_pct']) / 100), 3);
  $itemId = billing_int($in['itemId'] ?? 0);
  if ($itemId > 0 && $back > 0) {
    $pdo->prepare('UPDATE `billing_items` SET `physical_pcs` = `physical_pcs` + 1,
                   `physical_grams` = `physical_grams` + ? WHERE `id` = ?')->execute([$back, $itemId]);
    $pdo->prepare('INSERT INTO `billing_stock_ledger`
      (`item_id`,`sku`,`channel`,`delta_pcs`,`delta_grams`,`ref_type`,`ref_id`,`note`)
      VALUES (?,?,?,?,?,?,?,?)')
      ->execute([$itemId, '', 'karigar', 1, $back, 'karigar', (int)$j['id'],
                 'Received from ' . $j['artisan_name']]);
  }
  /* Labour becomes payable, so it enters the khata as a credit owed out. */
  if ($labour > 0) {
    $pdo->prepare('INSERT INTO `billing_ledger`
      (`party_id`,`entry_date`,`entry_type`,`amount`,`ref_type`,`ref_id`,`note`)
      VALUES (?,?,?,?,?,?,?)')
      ->execute([(int)$j['party_id'], billing_today(), 'credit', $labour, 'karigar', (int)$j['id'],
                 'Labour paid on job #' . $j['id']]);
  }
  billing_audit('Karigar job completed', 'karigar', (int)$j['id'], $back . ' g back');
  billing_json(['ok' => true, 'received' => $recv, 'fineBack' => $back]);
}

/* ── audit trail ────────────────────────────────────────────────────────── */
if ($route === 'audit') {
  $st = $pdo->query('SELECT * FROM `billing_audit` ORDER BY `id` DESC LIMIT 500');
  billing_json(['ok' => true, 'log' => $st->fetchAll()]);
}

/* ── stock ledger ───────────────────────────────────────────────────────── */
if ($route === 'stock/ledger' && $method === 'GET') {
  $sql = 'SELECT l.*, i.`name` AS item_name FROM `billing_stock_ledger` l
          LEFT JOIN `billing_items` i ON i.`id` = l.`item_id`';
  $args = [];
  if (($it = billing_int($_GET['itemId'] ?? 0)) > 0) { $sql .= ' WHERE l.`item_id` = ?'; $args[] = $it; }
  $sql .= ' ORDER BY l.`id` DESC LIMIT 500';
  $st = $pdo->prepare($sql); $st->execute($args);
  billing_json(['ok' => true, 'ledger' => $st->fetchAll()]);
}

/* ── delete a bill: restore stock and unwind the khata ──────────────────── */
if (preg_match('#^bills/(\d+)$#', $route, $m) && $method === 'DELETE') {
  $st = $pdo->prepare('SELECT * FROM `billing_bills` WHERE `id` = ?'); $st->execute([(int)$m[1]]);
  $b = $st->fetch();
  if (!$b) billing_fail('Bill not found.', 404);
  $items = json_decode((string)($b['items'] ?? '[]'), true) ?: [];
  foreach ($items as $it) {
    $iid = billing_int($it['itemId'] ?? 0);
    if ($iid <= 0) continue;
    $st = $pdo->prepare('SELECT * FROM `billing_items` WHERE `id` = ?'); $st->execute([$iid]);
    $row = $st->fetch();
    if (!$row || $row['fulfilment'] !== 'ready') continue;
    $pcs = max(1, billing_int($it['pieces'] ?? 1));
    $g = round(billing_num($row['net_wt']) * $pcs, 3);
    $pdo->prepare('UPDATE `billing_items` SET `physical_pcs` = `physical_pcs` + ?,
                   `physical_grams` = `physical_grams` + ?, `online_stock` = `online_stock` + ?
                   WHERE `id` = ?')->execute([$pcs, $g, $pcs, $iid]);
    $pdo->prepare('INSERT INTO `billing_stock_ledger`
      (`item_id`,`sku`,`channel`,`delta_pcs`,`delta_grams`,`ref_type`,`ref_id`,`note`)
      VALUES (?,?,?,?,?,?,?,?)')
      ->execute([$iid, (string)$row['sku'], 'correction', $pcs, $g, 'bill_delete', (int)$b['id'],
                 'Restored after deleting ' . $b['bill_no']]);
  }
  $pdo->prepare("DELETE FROM `billing_ledger` WHERE `ref_id` = ?
                 AND `ref_type` IN ('bill','payment')")->execute([(int)$b['id']]);
  $pdo->prepare('DELETE FROM `billing_bills` WHERE `id` = ?')->execute([(int)$b['id']]);
  billing_audit('Bill deleted', 'bill', (int)$b['id'], (string)$b['bill_no']);
  billing_json(['ok' => true]);
}

/* ── item update / delete ───────────────────────────────────────────────── */
if (preg_match('#^items/(\d+)$#', $route, $m) && $method === 'POST') {
  $in = billing_input();
  $id = (int)$m[1];
  $st = $pdo->prepare('SELECT * FROM `billing_items` WHERE `id` = ?'); $st->execute([$id]);
  if (!$st->fetch()) billing_fail('Item not found.', 404);
  $gross = billing_num($in['grossWt'] ?? 0); $less = billing_num($in['lessWt'] ?? 0);
  $stone = billing_num($in['stoneWt'] ?? 0); $net = billing_num($in['netWt'] ?? 0);
  if ($net <= 0) $net = max(0.0, $gross - $less - $stone);
  $ful = ($in['fulfilment'] ?? 'ready') === 'made_to_order' ? 'made_to_order' : 'ready';
  $pdo->prepare('UPDATE `billing_items` SET `sku`=?,`huid`=?,`name`=?,`category`=?,`metal`=?,
    `purity`=?,`gross_wt`=?,`less_wt`=?,`stone_wt`=?,`net_wt`=?,`making_per_g`=?,
    `stone_details`=?,`online_stock`=?,`fulfilment`=?,`status`=?,`notes`=? WHERE `id`=?')
    ->execute([billing_str($in['sku'] ?? '', 64), billing_str($in['huid'] ?? '', 64),
      billing_str($in['name'] ?? '', 191) ?: 'Unnamed', billing_str($in['category'] ?? 'Rings', 64),
      billing_str($in['metal'] ?? 'Gold', 16), billing_str($in['purity'] ?? '', 32),
      $gross, $less, $stone, $net, billing_num($in['makingPerG'] ?? 0),
      billing_str($in['stoneDetails'] ?? '', 500), billing_int($in['onlineStock'] ?? 0), $ful,
      billing_str($in['status'] ?? 'In Stock', 16), billing_str($in['notes'] ?? '', 500), $id]);
  billing_audit('Item updated', 'item', $id, billing_str($in['name'] ?? '', 191));
  billing_json(['ok' => true]);
}
if (preg_match('#^items/(\d+)$#', $route, $m) && $method === 'DELETE') {
  $id = (int)$m[1];
  $pdo->prepare('DELETE FROM `billing_stock_ledger` WHERE `item_id` = ?')->execute([$id]);
  $pdo->prepare('DELETE FROM `billing_items` WHERE `id` = ?')->execute([$id]);
  billing_audit('Item deleted', 'item', $id);
  billing_json(['ok' => true]);
}

/* ── party update / delete ──────────────────────────────────────────────── */
if (preg_match('#^parties/(\d+)$#', $route, $m) && $method === 'POST') {
  $in = billing_input(); $id = (int)$m[1];
  $st = $pdo->prepare('SELECT * FROM `billing_parties` WHERE `id` = ?'); $st->execute([$id]);
  if (!$st->fetch()) billing_fail('Party not found.', 404);
  $pdo->prepare('UPDATE `billing_parties` SET `kind`=?,`name`=?,`phone`=?,`email`=?,`address`=?,
    `city`=?,`state_code`=?,`pan`=?,`gstin`=?,`aadhar`=?,`partner_id`=?,`bank_name`=?,
    `acc_number`=?,`ifsc`=?,`credit_limit`=?,`credit_days`=?,`specialization`=?,`notes`=?
    WHERE `id`=?')
    ->execute([billing_str($in['kind'] ?? 'customer', 16), billing_str($in['name'] ?? '', 191) ?: 'Unnamed',
      billing_str($in['phone'] ?? '', 32), billing_str($in['email'] ?? '', 191),
      billing_str($in['address'] ?? '', 500), billing_str($in['city'] ?? '', 128),
      billing_str($in['stateCode'] ?? '', 8), billing_str($in['pan'] ?? '', 32),
      billing_str($in['gstin'] ?? '', 64), billing_str($in['aadhar'] ?? '', 32),
      billing_str($in['partnerId'] ?? '', 64), billing_str($in['bankName'] ?? '', 128),
      billing_str($in['accNumber'] ?? '', 64), billing_str($in['ifsc'] ?? '', 32),
      billing_num($in['creditLimit'] ?? 0), billing_int($in['creditDays'] ?? 0),
      billing_str($in['specialization'] ?? '', 128), billing_str($in['notes'] ?? '', 500), $id]);
  billing_audit('Party updated', 'party', $id);
  billing_json(['ok' => true]);
}
if (preg_match('#^parties/(\d+)$#', $route, $m) && $method === 'DELETE') {
  $id = (int)$m[1];
  $n = (int)$pdo->query('SELECT COUNT(*) FROM `billing_bills` WHERE `party_id` = ' . $id)->fetchColumn();
  if ($n > 0) billing_fail("This party has $n bills. Delete those first so the record stays honest.", 409);
  $pdo->prepare('DELETE FROM `billing_ledger` WHERE `party_id` = ?')->execute([$id]);
  $pdo->prepare('DELETE FROM `billing_parties` WHERE `id` = ?')->execute([$id]);
  billing_audit('Party deleted', 'party', $id);
  billing_json(['ok' => true]);
}
if (preg_match('#^expenses/(\d+)$#', $route, $m) && $method === 'DELETE') {
  $pdo->prepare('DELETE FROM `billing_expenses` WHERE `id` = ?')->execute([(int)$m[1]]);
  billing_audit('Expense deleted', 'expense', (int)$m[1]);
  billing_json(['ok' => true]);
}

/* ── change password ────────────────────────────────────────────────────── */
if ($route === 'password' && $method === 'POST') {
  $in = billing_input();
  $u = billing_user();
  $cur = (string)($in['current'] ?? ''); $new = (string)($in['next'] ?? '');
  if (strlen($new) < 10) billing_fail('The new password must be at least 10 characters.');
  $st = $pdo->prepare('SELECT * FROM `billing_users` WHERE `id` = ?'); $st->execute([(int)$u['id']]);
  $row = $st->fetch();
  if (!$row || !password_verify($cur, (string)$row['password_hash'])) billing_fail('Current password is wrong.', 401);
  $pdo->prepare('UPDATE `billing_users` SET `password_hash` = ? WHERE `id` = ?')
      ->execute([password_hash($new, PASSWORD_DEFAULT), (int)$u['id']]);
  billing_audit('Password changed', 'user', (int)$u['id']);
  billing_json(['ok' => true]);
}

/* ── CSV export ─────────────────────────────────────────────────────────── */
if (preg_match('#^export/([a-z]+)$#', $route, $m) && $method === 'GET') {
  $what = $m[1];
  $map = [
    'bills'    => "SELECT `bill_no`,`doc_type`,`channel`,`party_name`,`bill_date`,`subtotal`,
                   `gst_amount`,`grand_total`,`amount_paid`,`balance_due`,`status`
                   FROM `billing_bills` ORDER BY `id`",
    'items'    => "SELECT `sku`,`huid`,`name`,`category`,`metal`,`purity`,`net_wt`,`online_stock`,
                   `physical_pcs`,`physical_grams`,`fulfilment`,`status`
                   FROM `billing_items` ORDER BY `id`",
    'parties'  => "SELECT `kind`,`name`,`phone`,`email`,`city`,`gstin`,`pan`,`credit_days`
                   FROM `billing_parties` ORDER BY `name`",
    'expenses' => "SELECT `exp_date`,`category`,`description`,`payment_mode`,`amount`
                   FROM `billing_expenses` ORDER BY `id`",
    'khata'    => "SELECT p.`name`, p.`phone`,
                   COALESCE(SUM(CASE WHEN l.`entry_type`='debit' THEN l.`amount` ELSE -l.`amount` END),0) balance
                   FROM `billing_parties` p LEFT JOIN `billing_ledger` l ON l.`party_id`=p.`id`
                   GROUP BY p.`id`, p.`name`, p.`phone`",
  ];
  if (!isset($map[$what])) billing_fail('Nothing to export for: ' . $what, 404);
  $rows = $pdo->query($map[$what])->fetchAll();
  $out = '';
  if ($rows) {
    $cols = array_keys($rows[0]);
    $esc = function ($v) {
      $s = $v === null ? '' : (string)$v;
      return preg_match('/[",\n]/', $s) ? '"' . str_replace('"', '""', $s) . '"' : $s;
    };
    $out .= implode(',', $cols) . "\n";
    foreach ($rows as $r) {
      $line = [];
      foreach ($cols as $c) $line[] = $esc($r[$c]);
      $out .= implode(',', $line) . "\n";
    }
  }
  billing_audit('Exported ' . $what, 'export', 0, count($rows) . ' rows');
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="shivaa-' . $what . '-' . date('Ymd') . '.csv"');
  echo $out;
  exit;
}

/* ── WhatsApp links ─────────────────────────────────────────────────────── */
if (preg_match('#^wa/bill/(\d+)$#', $route, $m)) {
  $st = $pdo->prepare('SELECT * FROM `billing_bills` WHERE `id` = ?'); $st->execute([(int)$m[1]]);
  $b = $st->fetch();
  if (!$b) billing_fail('Bill not found.', 404);
  $shop = $pdo->query('SELECT `shop_name` FROM `billing_settings` WHERE `id`=1')->fetch() ?: [];
  billing_json(['ok' => true, 'url' => billing_wa_link((string)$b['party_phone'], billing_bill_wa_text($shop, $b))]);
}
if (preg_match('#^wa/khata/(\d+)$#', $route, $m)) {
  $st = $pdo->prepare("SELECT p.`name`, p.`phone`,
      COALESCE(SUM(CASE WHEN l.`entry_type`='debit' THEN l.`amount` ELSE -l.`amount` END),0) balance
      FROM `billing_parties` p LEFT JOIN `billing_ledger` l ON l.`party_id` = p.`id`
      WHERE p.`id` = ? GROUP BY p.`id`, p.`name`, p.`phone`");
  $st->execute([(int)$m[1]]);
  $p = $st->fetch();
  if (!$p) billing_fail('Party not found.', 404);
  $shop = $pdo->query('SELECT `shop_name` FROM `billing_settings` WHERE `id`=1')->fetch() ?: [];
  billing_json(['ok' => true, 'url' => billing_wa_link((string)$p['phone'],
    billing_khata_wa_text($shop, (string)$p['name'], billing_num($p['balance'])))]);
}

/* ── bulk import ────────────────────────────────────────────────────────── */
if ($route === 'import' && $method === 'POST') {
  $in = billing_input();
  $rows = is_array($in['rows'] ?? null) ? $in['rows'] : [];
  if (!$rows) billing_fail('Nothing to import.');
  if (count($rows) > 2000) billing_fail('Import at most 2000 rows at a time.');
  $made = 0; $skipped = 0; $errors = [];
  $pdo->beginTransaction();
  try {
    $st = $pdo->prepare('SELECT `id` FROM `billing_items` WHERE `sku` = ? AND `sku` <> \'\' LIMIT 1');
    $ins = $pdo->prepare('INSERT INTO `billing_items`
      (`sku`,`huid`,`name`,`category`,`metal`,`purity`,`gross_wt`,`less_wt`,`stone_wt`,
       `net_wt`,`online_stock`,`physical_pcs`,`physical_grams`,`fulfilment`,`product_id`)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    foreach ($rows as $i => $r) {
      $name = billing_str($r['name'] ?? '', 191);
      if ($name === '') { $skipped++; $errors[] = 'row ' . ($i + 1) . ': no name'; continue; }
      $sku = billing_str($r['sku'] ?? '', 64);
      if ($sku !== '') { $st->execute([$sku]); if ($st->fetch()) { $skipped++; continue; } }
      $gross = billing_num($r['grossWt'] ?? $r['weightG'] ?? 0);
      $less = billing_num($r['lessWt'] ?? 0); $stone = billing_num($r['stoneWt'] ?? 0);
      $net = billing_num($r['netWt'] ?? 0);
      if ($net <= 0) $net = max(0.0, $gross - $less - $stone);
      $pcs = billing_int($r['physicalPcs'] ?? $r['stock'] ?? 0);
      $ins->execute([$sku, billing_str($r['huid'] ?? '', 64), $name,
        billing_str($r['category'] ?? 'Rings', 64), billing_str($r['metal'] ?? 'Gold', 16),
        billing_str($r['purity'] ?? '22K (916)', 32), $gross, $less, $stone, $net,
        billing_int($r['onlineStock'] ?? $r['stock'] ?? 0), $pcs, round($net * $pcs, 3),
        ($r['fulfilment'] ?? 'ready') === 'made_to_order' ? 'made_to_order' : 'ready',
        billing_str($r['productId'] ?? $r['id'] ?? '', 64)]);
      $made++;
    }
    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    billing_fail('Import failed: ' . $e->getMessage(), 500);
  }
  billing_audit('Bulk import', 'import', 0, "$made made, $skipped skipped");
  billing_json(['ok' => true, 'made' => $made, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 20)]);
}

/* ─── Suppliers (from shivaa_erp.tsx) ───────────────────────────────────── */

if ($route === 'suppliers' && $method === 'GET') {
  $q = trim((string)($_GET['q'] ?? ''));
  $where = '';
  $args = [];
  if ($q !== '') {
    $where = " WHERE s.`company` LIKE ? OR s.`city` LIKE ? OR s.`phone` LIKE ?";
    $like = '%' . $q . '%';
    $args = [$like, $like, $like];
  }
  $st = $pdo->prepare("SELECT s.*, (SELECT COUNT(*) FROM `billing_orders` o
      WHERE o.`entity_id`=s.`id` AND o.`order_type`='Purchase') orders,
      (SELECT COALESCE(SUM(o.`net_wt`),0) FROM `billing_orders` o
      WHERE o.`entity_id`=s.`id` AND o.`order_type`='Purchase') net_wt,
      (SELECT COUNT(*) FROM `billing_rate_cards` rc
      WHERE rc.`entity_type`='supplier' AND rc.`entity_id`=s.`id`) rate_rows
    FROM `billing_suppliers` s$where ORDER BY s.`company`");
  $st->execute($args);
  $rows = $st->fetchAll();
  foreach ($rows as &$r) {
    $r['orders'] = (int)$r['orders'];
    $r['net_wt'] = round((float)$r['net_wt'], 3);
    $r['rate_rows'] = (int)$r['rate_rows'];
  }
  unset($r);
  billing_json(['ok' => true, 'suppliers' => $rows]);
}

if ($route === 'suppliers' && $method === 'POST') {
  billing_csrf();
  $company = trim((string)($_POST['company'] ?? ''));
  if ($company === '') billing_fail('Company name is required.');
  $st = $pdo->prepare('INSERT INTO `billing_suppliers` (`company`,`contact`,`phone`,`city`,`pin`,
    `gst`,`acc_name`,`acc_number`,`ifsc`,`branch`,`supplier_type`,`quality`,`status`,`notes`)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  $st->execute([
    billing_str($company, 191), billing_str($_POST['contact'] ?? '', 128),
    billing_str($_POST['phone'] ?? '', 32), billing_str($_POST['city'] ?? '', 128),
    billing_str($_POST['pin'] ?? '', 16), billing_str($_POST['gst'] ?? '', 64),
    billing_str($_POST['accName'] ?? '', 191), billing_str($_POST['accNumber'] ?? '', 64),
    billing_str($_POST['ifsc'] ?? '', 32), billing_str($_POST['branch'] ?? '', 191),
    billing_str($_POST['supplierType'] ?? 'Wholesaler', 32),
    billing_str($_POST['quality'] ?? 'Premium', 32),
    billing_str($_POST['status'] ?? 'New', 32), billing_str($_POST['notes'] ?? '', 500)]);
  $id = (int)$pdo->lastInsertId();
  billing_audit('Added supplier', 'supplier', $id, $company);
  billing_json(['ok' => true, 'id' => $id]);
}

if (preg_match('#^suppliers/(\d+)$#', $route, $m) && $method === 'GET') {
  $st = $pdo->prepare('SELECT * FROM `billing_suppliers` WHERE `id`=?');
  $st->execute([billing_int($m[1])]);
  $s = $st->fetch();
  if (!$s) billing_fail('No such supplier.', 404);
  $st = $pdo->prepare("SELECT * FROM `billing_rate_cards`
    WHERE `entity_type`='supplier' AND `entity_id`=? ORDER BY `category`");
  $st->execute([billing_int($m[1])]);
  billing_json(['ok' => true, 'supplier' => $s, 'rateCards' => $st->fetchAll()]);
}

if (preg_match('#^suppliers/(\d+)$#', $route, $m) && $method === 'POST') {
  billing_csrf();
  $sid = billing_int($m[1]);
  $st = $pdo->prepare('UPDATE `billing_suppliers` SET `company`=?,`contact`=?,`phone`=?,`city`=?,
    `pin`=?,`gst`=?,`acc_name`=?,`acc_number`=?,`ifsc`=?,`branch`=?,`supplier_type`=?,
    `quality`=?,`status`=?,`notes`=? WHERE `id`=?');
  $st->execute([
    billing_str($_POST['company'] ?? '', 191), billing_str($_POST['contact'] ?? '', 128),
    billing_str($_POST['phone'] ?? '', 32), billing_str($_POST['city'] ?? '', 128),
    billing_str($_POST['pin'] ?? '', 16), billing_str($_POST['gst'] ?? '', 64),
    billing_str($_POST['accName'] ?? '', 191), billing_str($_POST['accNumber'] ?? '', 64),
    billing_str($_POST['ifsc'] ?? '', 32), billing_str($_POST['branch'] ?? '', 191),
    billing_str($_POST['supplierType'] ?? 'Wholesaler', 32),
    billing_str($_POST['quality'] ?? 'Premium', 32),
    billing_str($_POST['status'] ?? 'New', 32), billing_str($_POST['notes'] ?? '', 500), $sid]);
  billing_audit('Updated supplier', 'supplier', $sid);
  billing_json(['ok' => true]);
}

if (preg_match('#^suppliers/(\d+)$#', $route, $m) && $method === 'DELETE') {
  billing_csrf();
  $sid = billing_int($m[1]);
  $st = $pdo->prepare("SELECT COUNT(*) FROM `billing_orders` WHERE `entity_id`=?");
  $st->execute([$sid]);
  if ((int)$st->fetchColumn() > 0) {
    billing_fail('This supplier has orders against it. Change the orders first.', 400);
  }
  $pdo->prepare("DELETE FROM `billing_rate_cards` WHERE `entity_type`='supplier' AND `entity_id`=?")
      ->execute([$sid]);
  $pdo->prepare('DELETE FROM `billing_suppliers` WHERE `id`=?')->execute([$sid]);
  billing_audit('Deleted supplier', 'supplier', $sid);
  billing_json(['ok' => true]);
}

/* ─── Rate cards ────────────────────────────────────────────────────────── */

if ($route === 'rate-cards' && $method === 'GET') {
  $type = ($_GET['entity'] ?? 'supplier') === 'customer' ? 'customer' : 'supplier';
  $eid = billing_int($_GET['id'] ?? 0);
  if ($eid <= 0) billing_fail('Pass the party id.');
  $st = $pdo->prepare("SELECT * FROM `billing_rate_cards`
    WHERE `entity_type`=? AND `entity_id`=? ORDER BY `category`,`purity`");
  $st->execute([$type, $eid]);
  billing_json(['ok' => true, 'rateCards' => $st->fetchAll()]);
}

if ($route === 'rate-cards' && $method === 'POST') {
  billing_csrf();
  $type = ($_POST['entityType'] ?? 'supplier') === 'customer' ? 'customer' : 'supplier';
  $eid = billing_int($_POST['entityId'] ?? 0);
  if ($eid <= 0) billing_fail('Pick the party first.');
  $cat = trim((string)($_POST['category'] ?? ''));
  if ($cat === '') billing_fail('Category is required.');
  // Replace any existing row for the same party/category/purity so a rate card
  // stays one row per combination.
  $pdo->prepare('DELETE FROM `billing_rate_cards`
    WHERE `entity_type`=? AND `entity_id`=? AND `category`=? AND `purity`=?')
    ->execute([$type, $eid, $cat, billing_str($_POST['purity'] ?? '22K', 32)]);
  $st = $pdo->prepare('INSERT INTO `billing_rate_cards`
    (`entity_type`,`entity_id`,`category`,`purity`,`making_type`,`wastage_pct`,`other_cost`)
    VALUES (?,?,?,?,?,?,?)');
  $st->execute([$type, $eid, billing_str($cat, 64), billing_str($_POST['purity'] ?? '22K', 32),
    billing_str($_POST['makingType'] ?? 'Plain', 64),
    round(billing_num($_POST['wastage'] ?? 0), 2), round(billing_num($_POST['otherCost'] ?? 0), 2)]);
  billing_audit('Saved rate card row', 'rate_card', (int)$pdo->lastInsertId(), $type . ' ' . $cat);
  billing_json(['ok' => true]);
}

if (preg_match('#^rate-cards/(\d+)$#', $route, $m) && $method === 'DELETE') {
  billing_csrf();
  $pdo->prepare('DELETE FROM `billing_rate_cards` WHERE `id`=?')->execute([billing_int($m[1])]);
  billing_audit('Deleted rate card row', 'rate_card', billing_int($m[1]));
  billing_json(['ok' => true]);
}

/* ─── Orders (the deal ledger) ──────────────────────────────────────────── */

if ($route === 'orders' && $method === 'GET') {
  $type = trim((string)($_GET['type'] ?? ''));
  $status = trim((string)($_GET['status'] ?? ''));
  $where = [];
  $args = [];
  if ($type === 'Purchase' || $type === 'Sale') { $where[] = '`order_type`=?'; $args[] = $type; }
  if ($status !== '' && $status !== 'All') { $where[] = '`status`=?'; $args[] = $status; }
  $sql = 'SELECT * FROM `billing_orders`'
       . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
       . ' ORDER BY `order_date` DESC, `id` DESC LIMIT 1000';
  $st = $pdo->prepare($sql);
  $st->execute($args);
  $rows = $st->fetchAll();
  foreach ($rows as &$r) {
    $r['pieces'] = (int)$r['pieces'];
    $r['net_wt'] = round((float)$r['net_wt'], 3);
    $r['gross_wt'] = round((float)$r['gross_wt'], 3);
    $r['stone_wt'] = round((float)$r['stone_wt'], 3);
    $r['advance_metal'] = round((float)$r['advance_metal'], 3);
    $r['value'] = round((float)$r['net_wt'] * (float)$r['rate'], 2);
  }
  unset($r);
  billing_json(['ok' => true, 'orders' => $rows]);
}

$billing_order_fields = function (int $oid = 0) use ($pdo, $method): void {
  $type = ($_POST['orderType'] ?? 'Purchase') === 'Sale' ? 'Sale' : 'Purchase';
  $gross = round(billing_num($_POST['grossWt'] ?? 0), 3);
  $stone = round(billing_num($_POST['stoneWt'] ?? 0), 3);
  $net = round(max(0, $gross - $stone), 3);
  $fine = round(billing_num($_POST['fineWt'] ?? 0), 3) ?: $net;
  $name = billing_str($_POST['orderName'] ?? '', 191);
  $entity = billing_int($_POST['entityId'] ?? 0);
  $party = billing_str($_POST['entityName'] ?? '', 191);
  if ($entity > 0 && $party === '') {
    $t = $_POST['orderType'] === 'Sale' ? 'billing_parties' : 'billing_suppliers';
    $col = $t === 'billing_parties' ? 'name' : 'company';
    $st = $pdo->prepare("SELECT `$col` FROM `$t` WHERE `id`=?");
    $st->execute([$entity]);
    $party = billing_str($st->fetchColumn() ?: '', 191);
  }
  $vals = [$name, $type, $entity, $party,
    billing_str($_POST['metal'] ?? 'Gold', 16), billing_str($_POST['category'] ?? 'Rings', 64),
    billing_int($_POST['pieces'] ?? 0), billing_str($_POST['purity'] ?? '22K', 32),
    billing_str($_POST['priority'] ?? 'Normal', 32), billing_str($_POST['status'] ?? 'New', 32),
    billing_str($_POST['placeOfSupply'] ?? '', 64),
    ($_POST['orderDate'] ?? '') ? billing_str($_POST['orderDate'], 10) : null,
    ($_POST['deliveryDate'] ?? '') ? billing_str($_POST['deliveryDate'], 10) : null,
    $gross, $stone, $net, $fine,
    round(billing_num($_POST['wastageDecided'] ?? 0), 2),
    round(billing_num($_POST['rate'] ?? 0), 2), round(billing_num($_POST['makingCharges'] ?? 0), 2),
    round(billing_num($_POST['advanceMetal'] ?? 0), 3),
    round(billing_num($_POST['advanceCash'] ?? 0), 2),
    billing_str($_POST['notes'] ?? '', 500)];
  if ($oid > 0) {
    $cols = '`order_name`,`order_type`,`entity_id`,`entity_name`,`metal`,`category`,`pieces`,
      `purity`,`priority`,`status`,`place_of_supply`,`order_date`,`delivery_date`,`gross_wt`,
      `stone_wt`,`net_wt`,`fine_wt`,`wastage_decided`,`rate`,`making_charges`,`advance_metal`,
      `advance_cash`,`notes`';
    $vals[] = $oid;
    $pdo->prepare("UPDATE `billing_orders` SET $cols=? WHERE `id`=?")
        ->execute($vals);
    billing_audit('Updated order', 'order', $oid, $name);
    billing_json(['ok' => true]);
  }
  $pdo->prepare('INSERT INTO `billing_orders` (`order_name`,`order_type`,`entity_id`,`entity_name`,
    `metal`,`category`,`pieces`,`purity`,`priority`,`status`,`place_of_supply`,`order_date`,
    `delivery_date`,`gross_wt`,`stone_wt`,`net_wt`,`fine_wt`,`wastage_decided`,`rate`,
    `making_charges`,`advance_metal`,`advance_cash`,`notes`)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute($vals);
  billing_audit('Added order', 'order', (int)$pdo->lastInsertId(), $type . ' · ' . $name);
  billing_json(['ok' => true]);
};

if ($route === 'orders' && $method === 'POST') {
  billing_csrf();
  $billing_order_fields(0);
}

if (preg_match('#^orders/(\d+)$#', $route, $m) && $method === 'POST') {
  billing_csrf();
  $billing_order_fields(billing_int($m[1]));
}

if (preg_match('#^orders/(\d+)$#', $route, $m) && $method === 'DELETE') {
  billing_csrf();
  $pdo->prepare('DELETE FROM `billing_orders` WHERE `id`=?')->execute([billing_int($m[1])]);
  billing_audit('Deleted order', 'order', billing_int($m[1]));
  billing_json(['ok' => true]);
}

/* ─── The 51-report catalogue ───────────────────────────────────────────── */

if ($route === 'reports/catalogue' && $method === 'GET') {
  $live = 0;
  $out = [];
  foreach (BILLING_REPORT_CATALOGUE as $cid => $cat) {
    $reps = [];
    foreach ($cat['reports'] as $rid => $r) {
      if (!empty($r['live'])) $live++;
      $reps[] = ['id' => $rid, 'title' => $r['t'], 'desc' => $r['d'],
        'live' => !empty($r['live']), 'why' => $r['why'] ?? ''];
    }
    $out[] = ['id' => $cid, 'title' => $cat['title'], 'reports' => $reps];
  }
  billing_json(['ok' => true, 'categories' => $out, 'live' => $live, 'total' => 51]);
}

if (preg_match('#^report/([a-z0-9_]+)$#', $route, $m) && $method === 'GET') {
  $rid = $m[1];
  $meta = null;
  foreach (BILLING_REPORT_CATALOGUE as $cat) {
    if (isset($cat['reports'][$rid])) { $meta = $cat['reports'][$rid]; break; }
  }
  if (!$meta) billing_fail('No such report.', 404);
  if (empty($meta['live'])) {
    billing_json(['ok' => true, 'title' => $meta['t'], 'desc' => $meta['d'],
      'live' => false, 'why' => $meta['why'] ?? '', 'columns' => [], 'rows' => []]);
  }
  require_once __DIR__ . '/reports.php';
  try {
    $data = billing_rep($pdo, $rid);
  } catch (Throwable $e) {
    billing_fail('Report failed: ' . $e->getMessage(), 500);
  }
  billing_json(['ok' => true, 'title' => $meta['t'], 'desc' => $meta['d'], 'live' => true,
    'why' => '', 'columns' => $data['columns'], 'rows' => $data['rows'],
    'note' => $data['note'] ?? '']);
}

if ($route === 'export/orders' && $method === 'GET') {
  $rows = $pdo->query('SELECT `order_date`,`order_type`,`order_name`,`entity_name`,`metal`,
    `category`,`purity`,`pieces`,`gross_wt`,`stone_wt`,`net_wt`,`wastage_decided`,`rate`,
    `making_charges`,`advance_metal`,`advance_cash`,`status`,`place_of_supply`
    FROM `billing_orders` ORDER BY `order_date` DESC, `id` DESC')->fetchAll();
  billing_csv('orders', ['Date', 'Type', 'Order', 'Party', 'Metal', 'Category', 'Purity',
    'Pieces', 'Gross g', 'Stone g', 'Net g', 'Wastage %', 'Rate', 'Making', 'Advance metal g',
    'Advance cash', 'Status', 'Place of supply'], $rows);
}

if ($route === 'export/suppliers' && $method === 'GET') {
  $rows = $pdo->query('SELECT `company`,`contact`,`phone`,`city`,`pin`,`gst`,`supplier_type`,
    `quality`,`status`,`acc_name`,`acc_number`,`ifsc`,`branch`,`notes`
    FROM `billing_suppliers` ORDER BY `company`')->fetchAll();
  billing_csv('suppliers', ['Company', 'Contact', 'Phone', 'City', 'Pin', 'GSTIN', 'Type',
    'Quality', 'Status', 'A/c name', 'A/c number', 'IFSC', 'Branch', 'Notes'], $rows);
}

billing_fail('Unknown route: ' . $route, 404);
