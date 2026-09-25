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

billing_fail('Unknown route: ' . $route, 404);
