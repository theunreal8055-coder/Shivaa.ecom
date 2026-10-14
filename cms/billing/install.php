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

require_once __DIR__ . '/lib.php';

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

/** Verifies the shop admin password against MySQL `users` and `../data/db.json`. */
function inst_shop_admin_ok(PDO $pdo, string $plain): bool {
  return billing_shop_admin_ok($pdo, $plain);
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
$error = null; $log = []; $migrated = []; $createdUser = false; $updatedUser = false;
$savedEmail = ''; $existingHint = ''; $existingFull = '';
$dbName = (string)($ms['dbname'] ?? '');
$unlock = billing_unlock_file_info();

if ($ok) {
  try {
    $exRow = billing_db()->query('SELECT `email` FROM `billing_users` ORDER BY `id` ASC LIMIT 1')->fetch();
    if ($exRow && !empty($exRow['email'])) {
      $existingHint = billing_mask_email((string)$exRow['email']);
      if (!empty($unlock['found'])) $existingFull = (string)$exRow['email'];
    }
  } catch (Throwable $e) { /* table may not exist yet */ }
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $shopPass = (string)($_POST['shop_password'] ?? '');
  $email = strtolower(billing_str($_POST['email'] ?? '', 191));
  $pass  = (string)($_POST['password'] ?? '');
  $pass2 = (string)($_POST['password2'] ?? '');

  if (inst_locked($LOCK))              $error = 'Too many attempts — wait 15 minutes and try again.';
  elseif (!$ok)                        $error = 'The shop config.php is missing or still holds placeholder database details.';
  elseif ($shopPass === '' && empty($unlock['found'])) $error = 'Enter the shop admin password (or create the File Manager unlock file shown below).';
  elseif ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $error = 'Enter a valid email for the billing login.';
  elseif (strlen($pass) < 10)          $error = 'Choose a billing password of at least 10 characters.';
  elseif ($pass !== $pass2)            $error = 'The two billing passwords do not match.';
  else {
    try {
      $pdo = billing_db();
      $authed = !empty($unlock['found']) || inst_shop_admin_ok($pdo, $shopPass);
      if (!$authed) { inst_mark($LOCK); $error = 'Wrong shop admin password.'; }
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

        $saved = billing_save_owner_login($pdo, $email, $pass, 'Owner');
        $createdUser = !$saved['updated'];
        $updatedUser = (bool)$saved['updated'];
        $savedEmail  = (string)$saved['email'];
        if (!empty($unlock['found'])) {
          billing_unlock_file_consume();
        }
        billing_session_start();
        session_regenerate_id(true);
        $_SESSION['billing_user'] = [
          'id'    => (int)$saved['id'],
          'email' => (string)$saved['email'],
          'name'  => (string)$saved['name'],
        ];
        billing_audit(
          $updatedUser ? 'Login ID/password reset via install.php' : 'Initial login created',
          'user',
          (int)$saved['id'],
          $savedEmail
        );
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
<title>Install or Reset Shivaa Billing</title>
<style>
 body{font:15px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:20px;background:#f4f3ef;color:#17150f}
 .card{max-width:600px;margin:0 auto;background:#fff;border:1px solid #e3e0d6;border-radius:14px;padding:24px}
 h1{font-size:20px;margin:0 0 4px} .sub{color:#6b6558;margin:0 0 18px;font-size:14px}
 label{display:block;font-size:13px;font-weight:600;margin:14px 0 4px}
 input{width:100%;padding:10px;border:1px solid #cfcabb;border-radius:8px;box-sizing:border-box;font-size:16px}
 button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:9px;background:#17150f;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
 .err{background:#fdeceb;border:1px solid #f0b4b1;color:#8b1d18;padding:10px 12px;border-radius:9px;margin-bottom:14px}
 .ok{background:#eaf6ec;border:1px solid #b5d9bd;color:#1b5b2b;padding:10px 12px;border-radius:9px;margin-bottom:14px}
 .info{background:#fef9ec;border:1px solid #f2dc9b;color:#6b4e09;padding:10px 12px;border-radius:9px;margin-bottom:14px;font-size:13.5px}
 table{width:100%;border-collapse:collapse;font-size:14px;margin-top:8px}
 td,th{text-align:left;padding:6px 8px;border-bottom:1px solid #eee}
 code{background:#f1efe8;padding:1px 5px;border-radius:4px;font-size:13px}
 a{color:#17150f;font-weight:600}
 .hint{font-size:12px;color:#8a8474;margin-top:4px}
</style></head><body><div class="card">
<h1>Install or Reset Shivaa Billing</h1>
<p class="sub">Verifies the billing tables in <code><?= $e($dbName ?: 'not configured') ?></code> and creates or resets your billing login ID &amp; password. Existing billing data and shop tables are never touched.</p>
<?php if ($error): ?><div class="err"><?= $e($error) ?></div><?php endif; ?>
<?php if ($log): ?>
  <div class="ok">
    Done. <?= $created ?> table<?= $created === 1 ? '' : 's' ?> created, <?= count($log) - $created ?> already present.
    <?php if ($createdUser): ?>
      Your billing login (<code><?= $e($savedEmail) ?></code>) is ready and signed in.
    <?php elseif ($updatedUser): ?>
      Your billing login ID &amp; password have been reset to <code><?= $e($savedEmail) ?></code> and you are signed in.
    <?php endif; ?>
  </div>
  <table><tr><th>Table</th><th>Result</th></tr>
  <?php foreach ($log as $l): ?><tr><td><code><?= $e($l['table']) ?></code></td><td><?= $l['created'] ? 'created' : 'already existed' ?></td></tr><?php endforeach; ?>
  <?php foreach ($migrated as $mg): ?><tr><td><code><?= $e($mg) ?></code></td><td>column</td></tr><?php endforeach; ?>
  </table>
  <p style="margin-top:18px"><a href="./">Open the billing app &rarr;</a></p>
<?php else: ?>
  <?php if ($existingHint !== ''): ?>
    <div class="info">
      Current billing login ID on file:
      <code><?= $e($existingFull !== '' ? $existingFull : $existingHint) ?></code>.
      Submitting this form will update your billing login ID and password without touching any bills or stock.
    </div>
  <?php endif; ?>
  <form method="post">
    <label for="shop_password">Shop admin password <?= !empty($unlock['found']) ? '(optional — unlock file detected ✓)' : '' ?></label>
    <input id="shop_password" type="password" name="shop_password" autocomplete="current-password" <?= empty($unlock['found']) ? 'required' : '' ?>>
    <div class="hint">
      Enter your <code>shivaa.in</code> admin password. Forgot that too? In Hostinger File Manager, create an empty file named
      <code><?= $e($unlock['file']) ?></code> inside <code>public_html/billing/</code> and reload this page.
    </div>

    <label for="email">New billing login email (ID)</label>
    <input id="email" type="email" name="email" autocomplete="username" value="<?= $e($existingFull) ?>" required>

    <label for="password">New billing password</label>
    <input id="password" type="password" name="password" autocomplete="new-password" required>
    <div class="hint">At least 10 characters.</div>

    <label for="password2">Repeat new billing password</label>
    <input id="password2" type="password" name="password2" autocomplete="new-password" required>

    <button type="submit">Save Billing Login &amp; Open App</button>
  </form>
<?php endif; ?>
</div></body></html>
