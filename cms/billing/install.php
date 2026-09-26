<?php
/**
 * Shivaa Jewels — Billing · installer
 *
 * Open this page in a browser, enter the shop admin password, and it creates
 * the billing tables inside the shop's existing database plus your first
 * billing login. Safe to run more than once.
 *
 * It cannot touch a shop table: every statement must be
 * CREATE TABLE IF NOT EXISTS on a `billing_*` table, and after running, any
 * new table that is not prefixed billing_ aborts with an error.
 */
declare(strict_types=1);

require __DIR__ . '/lib.php';

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

$LOCK = sys_get_temp_dir() . '/billing-install-' . md5((string)($_SERVER['REMOTE_ADDR'] ?? 'cli')) . '.json';

function inst_locked(string $f): bool {
  $j = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
  return is_array($j) && (int)($j['n'] ?? 0) >= 5 && (time() - (int)($j['t'] ?? 0)) < 900;
}
function inst_mark(string $f): void {
  $j = is_file($f) ? json_decode((string)@file_get_contents($f), true) : null;
  if (!is_array($j) || (time() - (int)($j['t'] ?? 0)) >= 900) $j = ['n' => 0, 't' => 0];
  $j['n'] = (int)$j['n'] + 1; $j['t'] = time();
  @file_put_contents($f, json_encode($j), LOCK_EX);
}

/** Same verification logic as upgrade-sql.php in the shop. */
function inst_shop_admin_ok(PDO $pdo, string $plain): bool {
  $row = $pdo->query("SELECT `data_json` FROM `users` WHERE `role` = 'admin' LIMIT 1")->fetch();
  if (!$row) return false;
  $u = json_decode((string)($row['data_json'] ?? ''), true);
  if (!is_array($u)) return false;
  $stored = (string)($u['passHash'] ?? '');
  if ($stored === '') return false;
  if ($stored[0] === '$') return password_verify($plain, $stored);
  return hash_equals($stored, hash('sha256', (string)($u['salt'] ?? '') . $plain));
}

/**
 * Split schema.sql into statements.
 *
 * Comment lines are stripped BEFORE splitting on ';' — not after. Stripping
 * them per-chunk fails whenever a comment block sits between two statements,
 * because the ';' that ends the previous statement leaves the comment text
 * glued to the front of the next chunk.
 */
function inst_split(string $sql): array {
  $sql = (string)preg_replace('/^[ \t]*--.*$/m', '', $sql);
  $out = [];
  foreach (explode(';', $sql) as $chunk) {
    $c = trim($chunk);
    if ($c !== '') $out[] = $c;
  }
  return $out;
}

$ms = billing_config();
$ok = billing_config_ok($ms);
$error = null; $log = []; $migrated = []; $createdUser = false; $dbName = (string)($ms['dbname'] ?? '');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $shopPass = (string)($_POST['shop_password'] ?? '');
  $email = strtolower(billing_str($_POST['email'] ?? '', 191));
  $pass  = (string)($_POST['password'] ?? '');
  $pass2 = (string)($_POST['password2'] ?? '');

  if (inst_locked($LOCK))              $error = 'Too many attempts — wait 15 minutes and try again.';
  elseif (!$ok)                        $error = 'The shop config.php is missing or still holds placeholder database details.';
  elseif ($shopPass === '')            $error = 'Enter the shop admin password.';
  elseif ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $error = 'Enter a valid email for the billing login.';
  elseif (strlen($pass) < 10)          $error = 'Choose a billing password of at least 10 characters.';
  elseif ($pass !== $pass2)            $error = 'The two billing passwords do not match.';
  else {
    try {
      $pdo = billing_db();
      if (!inst_shop_admin_ok($pdo, $shopPass)) { inst_mark($LOCK); $error = 'Wrong shop admin password.'; }
      else {
        @unlink($LOCK);

        $schemaFile = __DIR__ . '/schema.sql';
        if (!is_file($schemaFile)) throw new RuntimeException('schema.sql is missing from the billing folder.');
        $stmts = inst_split((string)file_get_contents($schemaFile));
        if (!$stmts) throw new RuntimeException('schema.sql contains no statements.');

        /* Refuse the whole run before executing anything. */
        foreach ($stmts as $i => $s) {
          if (!billing_safe_ddl($s)) {
            throw new RuntimeException('Refusing statement ' . ($i + 1) . ': it is not a billing_* CREATE TABLE.');
          }
        }

        $before = [];
        foreach ($pdo->query('SHOW TABLES') as $r) $before[] = (string)reset($r);
        $seen = array_flip($before);

        foreach ($stmts as $s) {
          preg_match('/^CREATE TABLE IF NOT EXISTS `(billing_[a-z_]+)`/', $s, $mm);
          $name = $mm[1] ?? '(unknown)';
          $pdo->exec($s);
          $log[] = ['table' => $name, 'created' => !isset($seen[$name])];
        }

        $after = [];
        foreach ($pdo->query('SHOW TABLES') as $r) $after[] = (string)reset($r);
        foreach (array_diff($after, $before) as $t) {
          if (strpos($t, 'billing_') !== 0) throw new RuntimeException('Unexpected table created: ' . $t);
        }

        /* Columns added after a table already shipped. schema.sql is still
           CREATE-only; these are the sole ALTERs the installer will ever run,
           they are checked against INFORMATION_SCHEMA first, and every one is
           an ADD COLUMN on a billing_ table. Nothing else can reach here. */
        $migrations = [
          ['billing_suppliers',  'metal',       "`metal` VARCHAR(16) NOT NULL DEFAULT 'Gold' AFTER `pin`"],
          ['billing_rate_cards', 'product_name', "`product_name` VARCHAR(191) NOT NULL DEFAULT '' AFTER `category`"],
          ['billing_settings',   'bridge_enabled', "`bridge_enabled` TINYINT(1) NOT NULL DEFAULT 0"],
          ['billing_settings',   'bridge_calls', "`bridge_calls` INT NOT NULL DEFAULT 0"],
        ];
        $colSt = $pdo->prepare('SELECT COUNT(*) FROM `INFORMATION_SCHEMA`.`COLUMNS`
                                WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = ? AND `COLUMN_NAME` = ?');
        foreach ($migrations as $mg) {
          list($tbl, $col, $ddl) = $mg;
          if (strpos($tbl, 'billing_') !== 0) throw new RuntimeException('Bad migration target: ' . $tbl);
          $colSt->execute([$tbl, $col]);
          if ((int)$colSt->fetchColumn() > 0) { $migrated[] = "$tbl.$col already present"; continue; }
          $pdo->exec("ALTER TABLE `$tbl` ADD COLUMN $ddl");
          $migrated[] = "$tbl.$col added";
        }

        $pdo->exec("INSERT INTO `billing_settings` (`id`) VALUES (1)
                    ON DUPLICATE KEY UPDATE `id` = `id`");

        $st = $pdo->query('SELECT COUNT(*) FROM `billing_users`');
        if ((int)$st->fetchColumn() === 0) {
          $pdo->prepare('INSERT INTO `billing_users` (`email`,`password_hash`,`name`) VALUES (?,?,?)')
              ->execute([$email, password_hash($pass, PASSWORD_DEFAULT), 'Owner']);
          $createdUser = true;
        }
      }
    } catch (Throwable $e) {
      $error = $e->getMessage();
    }
  }
}

$created = 0; foreach ($log as $l) if ($l['created']) $created++;
$e = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install Shivaa Billing</title>
<style>
 body{font:15px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:20px;background:#f4f3ef;color:#17150f}
 .card{max-width:600px;margin:0 auto;background:#fff;border:1px solid #e3e0d6;border-radius:14px;padding:24px}
 h1{font-size:20px;margin:0 0 4px} .sub{color:#6b6558;margin:0 0 18px;font-size:14px}
 label{display:block;font-size:13px;font-weight:600;margin:14px 0 4px}
 input{width:100%;padding:10px;border:1px solid #cfcabb;border-radius:8px;box-sizing:border-box;font-size:16px}
 button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:9px;background:#17150f;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
 .err{background:#fdeceb;border:1px solid #f0b4b1;color:#8b1d18;padding:10px 12px;border-radius:9px;margin-bottom:14px}
 .ok{background:#eaf6ec;border:1px solid #b5d9bd;color:#1b5b2b;padding:10px 12px;border-radius:9px;margin-bottom:14px}
 table{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}
 td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #eee}
 code{background:#f1efe8;padding:1px 5px;border-radius:4px;font-size:13px}
 a{color:#17150f;font-weight:600}
 .hint{font-size:12px;color:#8a8474;margin-top:4px}
</style></head><body><div class="card">
<h1>Install Shivaa Billing</h1>
<p class="sub">Creates the billing tables in <code><?= $e($dbName ?: 'not configured') ?></code> — the same database your shop uses. Shop tables are never touched.</p>
<?php if ($error): ?><div class="err"><?= $e($error) ?></div><?php endif; ?>
<?php if ($log): ?>
  <div class="ok">
    Installed. <?= $created ?> table<?= $created === 1 ? '' : 's' ?> created, <?= count($log) - $created ?> already present.
    <?= $createdUser ? 'Your billing login is ready.' : 'A billing login already existed, so it was left alone.' ?>
  </div>
  <table><tr><th>Table</th><th>Result</th></tr>
  <?php foreach ($log as $l): ?><tr><td><code><?= $e($l['table']) ?></code></td><td><?= $l['created'] ? 'created' : 'already existed' ?></td></tr><?php endforeach; ?>
  <?php foreach ($migrated as $mg): ?><tr><td><code><?= $e($mg) ?></code></td><td>column</td></tr><?php endforeach; ?>
  </table>
  <p style="margin-top:18px"><a href="./">Open the billing app &rarr;</a></p>
<?php else: ?>
  <form method="post">
    <label for="shop_password">Shop admin password</label>
    <input id="shop_password" type="password" name="shop_password" autocomplete="current-password" required>
    <div class="hint">Used once to authorise the install. It is not stored by the billing app.</div>

    <label for="email">Billing login email</label>
    <input id="email" type="email" name="email" autocomplete="username" required>

    <label for="password">Billing password</label>
    <input id="password" type="password" name="password" autocomplete="new-password" required>
    <div class="hint">At least 10 characters.</div>

    <label for="password2">Repeat billing password</label>
    <input id="password2" type="password" name="password2" autocomplete="new-password" required>

    <button type="submit">Install</button>
  </form>
<?php endif; ?>
</div></body></html>
