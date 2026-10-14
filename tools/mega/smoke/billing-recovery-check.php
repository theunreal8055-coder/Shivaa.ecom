<?php
/*
 * Executed-PHP test for Billing v13 login ID & password recovery.
 *
 * Verifies:
 *   1. Email masking (billing_mask_email) shows a safe hint without leaking
 *      the full address unauthenticated.
 *   2. Shop admin password verification (billing_shop_admin_ok) works against
 *      both SQL `users` (all admin rows, not just LIMIT 1) and `data/db.json`
 *      (for passwords freshly reset via admin-reset.php).
 *   3. File Manager break-glass unlock (billing_unlock_file_info /
 *      billing_unlock_file_consume) detects the one-time file and consumes it
 *      after use so it cannot be replayed.
 *   4. billing_save_owner_login() creates the initial login when `billing_users`
 *      is empty AND updates `email` + `password_hash` when a login already
 *      exists (fixing the v1–v12 bug where install.php left an existing login
 *      untouched).
 */
declare(strict_types=1);

require_once '/b/lib.php';

$fails = 0;
function check(string $what, bool $ok): void {
  global $fails;
  printf("%s  %s\n", $ok ? 'PASS' : 'FAIL', $what);
  if (!$ok) { $fails++; }
}

// 1. Email masking
check('mask karan@shivaa.in', billing_mask_email('karan@shivaa.in') === 'k***n@shivaa.in');
check('mask admin@shivaa.in', billing_mask_email('admin@shivaa.in') === 'a***n@shivaa.in');
check('mask 2-char local',    billing_mask_email('ab@shivaa.in') === 'a***@shivaa.in');
check('mask 1-char local',    billing_mask_email('k@shivaa.in') === 'k***@shivaa.in');
check('mask invalid blank',   billing_mask_email('not-an-email') === '');

// 2. Password verification (bcrypt + sha256+salt)
$bcryptUser = ['role' => 'admin', 'passHash' => password_hash('ShopSecret123!', PASSWORD_DEFAULT)];
$shaUser    = ['role' => 'admin', 'salt' => 'abc123salt', 'passHash' => hash('sha256', 'abc123saltLegacyPass99')];
check('verify bcrypt ok',     billing_pw_verify_user($bcryptUser, 'ShopSecret123!'));
check('verify bcrypt wrong',  !billing_pw_verify_user($bcryptUser, 'wrong'));
check('verify sha256 ok',     billing_pw_verify_user($shaUser, 'LegacyPass99'));
check('verify empty refused', !billing_pw_verify_user($bcryptUser, ''));

// 3. Shop admin check across SQL (multi-row) and JSON fallback
$pdo = new PDO('sqlite::memory:');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$pdo->exec('CREATE TABLE `users` (`id` TEXT PRIMARY KEY, `role` TEXT, `data_json` TEXT)');
$pdo->prepare('INSERT INTO `users` (`id`,`role`,`data_json`) VALUES (?,?,?)')
    ->execute(['u_old', 'admin', json_encode(['role' => 'admin', 'passHash' => password_hash('OldPass111!', PASSWORD_DEFAULT)])]);
$pdo->prepare('INSERT INTO `users` (`id`,`role`,`data_json`) VALUES (?,?,?)')
    ->execute(['u_new', 'admin', json_encode($bcryptUser)]);

$tmpJson = sys_get_temp_dir() . '/test-shop-db.json';
file_put_contents($tmpJson, json_encode([
  'users' => [
    ['id' => 'u_json_admin', 'role' => 'admin', 'passHash' => password_hash('JsonResetPass777!', PASSWORD_DEFAULT)],
  ],
]));

check('shop admin matches 2nd SQL admin row', billing_shop_admin_ok($pdo, 'ShopSecret123!', $tmpJson));
check('shop admin matches db.json fallback',  billing_shop_admin_ok($pdo, 'JsonResetPass777!', $tmpJson));
check('shop admin rejects wrong password',    !billing_shop_admin_ok($pdo, 'WrongPassword!', $tmpJson));
@unlink($tmpJson);

// 4. File Manager unlock token lifecycle
$tmpDir = sys_get_temp_dir() . '/b-unlock-test-' . uniqid();
@mkdir($tmpDir . '/billing', 0777, true);
@mkdir($tmpDir . '/data', 0777, true);
$u1 = billing_unlock_file_info($tmpDir . '/billing');
check('unlock file name generated', (bool)preg_match('/^billing-unlock-[a-f0-9]{12}\.txt$/', $u1['file']));
check('unlock initially not found', $u1['found'] === false);

// Owner creates the empty file in File Manager
file_put_contents($tmpDir . '/billing/' . $u1['file'], '');
$u2 = billing_unlock_file_info($tmpDir . '/billing');
check('unlock detected once file created', $u2['found'] === true && $u2['file'] === $u1['file']);

// Consuming deletes the file so it is one-time only
billing_unlock_file_consume($tmpDir . '/billing');
$u3 = billing_unlock_file_info($tmpDir . '/billing');
check('unlock file deleted after consume', $u3['found'] === false);

// 5. billing_save_owner_login creates AND updates existing row (the v1–v12 bug fix)
$pdo->exec('CREATE TABLE `billing_users` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `email` TEXT NOT NULL UNIQUE,
  `password_hash` TEXT NOT NULL,
  `name` TEXT NOT NULL DEFAULT ""
)');

$first = billing_save_owner_login($pdo, 'karan@shivaa.in', 'FirstPassword10!', 'Karan');
check('initial login created (updated=false)', $first['updated'] === false && $first['email'] === 'karan@shivaa.in');

// Now reset both ID (email) and password when a row ALREADY exists
$second = billing_save_owner_login($pdo, 'admin@shivaa.in', 'NewBillingPass2026!', 'Karan');
check('existing login updated (updated=true)', $second['updated'] === true);
check('previous email recorded',               $second['previousEmail'] === 'karan@shivaa.in');
check('new email saved',                       $second['email'] === 'admin@shivaa.in');

$row = $pdo->query('SELECT * FROM `billing_users` ORDER BY `id` ASC LIMIT 1')->fetch();
$count = (int)$pdo->query('SELECT COUNT(*) FROM `billing_users`')->fetchColumn();
check('still exactly 1 billing user row',      $count === 1);
check('DB row has updated email ID',           ($row['email'] ?? '') === 'admin@shivaa.in');
check('DB row accepts new password',           password_verify('NewBillingPass2026!', (string)$row['password_hash']));
check('DB row rejects old password',           !password_verify('FirstPassword10!', (string)$row['password_hash']));

printf("%s  (%d failures)\n", $fails === 0 ? 'RECOVERY-CHECK PASS' : 'RECOVERY-CHECK FAIL', $fails);
exit($fails === 0 ? 0 : 1);
