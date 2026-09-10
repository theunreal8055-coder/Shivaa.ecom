<?php
/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · ADMIN PASSWORD RECOVERY  (break-glass file)          v45
   ─────────────────────────────────────────────────────────────────────
   A ONE-TIME recovery door for the day the owner cannot sign in to the
   admin dashboard AND the SMS/OTP route is unusable (phone lost, SIM
   changed, gateway down, wrong number on the account).

   HOW TO USE  (cPanel → File Manager is enough — no terminal needed)
     1. Set your key below: change CHANGE-THIS-KEY-123 to any long
        random text you choose (e.g. shivaa-9f4b-2c71-Jayal).
     2. Upload this file to the same folder as api.php (usually
        public_html/).
     3. Open it in a browser:  https://shivaa.in/admin-reset.php
        → pick the account, set a new password (8+ characters).
     4. DELETE THIS FILE from the server immediately afterwards.
        It refuses to work after its first successful use — but deleting
        it removes the door completely.

   SAFETY
     · ⚠ anyone who can read this file can reset the admin password —
       so set your own key, upload it only while locked out, and delete
       it the moment you are back in.
     · Starts DISABLED: flip ENABLED below to true (that is the point of
       a break-glass file — you do it deliberately, in the emergency).
     · One use only, ever. A second visit says "already used".
     · The event is written to data/reset-log.txt and to the database's
       securityLog, with time and IP, so there is a record.
     · Revokes all existing sessions for the account it changes.
     · Never prints or reveals any existing password — only sets a new one.
   ═══════════════════════════════════════════════════════════════════════ */

/* ─────────────── settings you control ─────────────── */
const ENABLED = false;                            // ← set to true to arm it
const RECOVERY_KEY = 'CHANGE-THIS-KEY-123';       // ← your own key, keep it private
/* ──────────────────────────────────────────────────── */

declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');

$DIR = __DIR__;
$DB_FILE = $DIR . '/data/db.json';
$USED_FILE = $DIR . '/data/.admin-reset-used';
$LOG_FILE = $DIR . '/data/reset-log.txt';

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function page_top(string $title): void {
  echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
     . '<meta name="viewport" content="width=device-width,initial-scale=1">'
     . '<meta name="robots" content="noindex,nofollow">'
     . '<title>' . h($title) . ' · Shivaa</title><style>'
     . ':root{--ink:#1c1a17;--ink3:#7a7268;--gold:#b98a2f;--line:#e8e0d2;--maroon:#6e1e2a;--bg:#faf7f1}'
     . '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);'
     . 'font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:28px 16px}'
     . '.wrap{max-width:560px;margin:0 auto}'
     . '.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px 24px;'
     . 'box-shadow:0 18px 50px rgba(28,26,23,.08)}'
     . 'h1{font:600 24px/1.2 Georgia,serif;margin:0 0 6px}p.sub{color:var(--ink3);margin:0 0 18px;font-size:13.5px}'
     . 'label{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);margin:14px 0 6px}'
     . 'input,select{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:12px;font-size:15px;background:#fff}'
     . 'button{margin-top:20px;width:100%;padding:14px;border:0;border-radius:12px;background:var(--maroon);color:#fff;'
     . 'font-size:15px;font-weight:600;cursor:pointer}button:hover{opacity:.94}'
     . '.note{margin-top:16px;padding:12px 14px;border-radius:12px;font-size:13px}'
     . '.ok{background:#eef7f1;color:#1e6b45;border:1px solid #cfe7d9}'
     . '.err{background:#fdeeee;color:#8e2222;border:1px solid #f2cccc}'
     . '.warn{background:#fdf6e6;color:#7a5a12;border:1px solid #f0e0b6}'
     . '.foot{margin-top:22px;font-size:12px;color:var(--ink3);text-align:center}'
     . 'code{background:#f4efe4;padding:2px 6px;border-radius:6px;font-size:12.5px}'
     . '</style></head><body><div class="wrap"><div class="card">';
}
function page_bottom(): void {
  echo '</div><p class="foot">Shivaa · Ernate Shine Jewellery Pvt. Ltd. · Jayal, Nagaur<br>'
     . 'One-time recovery file · delete it after use.</p></div></body></html>';
}
function bail(string $title, string $msg, string $cls = 'err'): void {
  page_top($title);
  echo '<h1>' . h($title) . '</h1><div class="note ' . h($cls) . '">' . $msg . '</div>';
  page_bottom(); exit;
}

/* ── guard rails ── */
if (!is_file($DB_FILE)) bail('Database not found', 'Could not find <code>data/db.json</code> next to this file. Upload this script into the same folder as <code>api.php</code>.');
if (is_file($USED_FILE)) bail('This recovery file has already been used', 'For safety it works exactly once. To use it again, delete <code>data/.admin-reset-used</code> on the server, or reset the password from the admin dashboard.', 'warn');
if (!ENABLED) bail('Recovery file is switched off', 'Open this file in the hosting File Manager and set <code>ENABLED</code> to <code>true</code>, then reload this page. That deliberate step is what keeps the door shut when it is not needed.', 'warn');

$raw = (string)file_get_contents($DB_FILE);
$db = json_decode($raw, true);
if (!is_array($db)) bail('Database unreadable', 'The file <code>data/db.json</code> is not valid JSON. Take a backup before making changes.');

$users = $db['users'] ?? [];
$admins = [];
foreach ($users as $i => $u) if (($u['role'] ?? '') === 'admin') $admins[$i] = $u;

$msg = ''; $cls = 'err';
$posted = ($_SERVER['REQUEST_METHOD'] === 'POST');

if ($posted) {
  $key = (string)($_POST['key'] ?? '');
  $idx = (string)($_POST['user'] ?? '');
  $pw  = (string)($_POST['password'] ?? '');
  $pw2 = (string)($_POST['password2'] ?? '');

  if (!hash_equals(RECOVERY_KEY, $key) || RECOVERY_KEY === 'CHANGE-THIS-KEY-123') {
    $msg = 'That recovery key is not correct. ' . (RECOVERY_KEY === 'CHANGE-THIS-KEY-123'
        ? 'You are still using the placeholder key — set your own long random key in this file first.' : '');
  } elseif (!isset($admins[$idx]) && !isset($users[$idx])) {
    $msg = 'Choose an account from the list.';
  } elseif (strlen($pw) < 8) {
    $msg = 'The new password must be at least 8 characters.';
  } elseif ($pw !== $pw2) {
    $msg = 'The two passwords do not match.';
  } else {
    /* ── perform the reset ── */
    $target = $admins[$idx] ?? $users[$idx];
    $db['users'][$idx]['passHash'] = password_hash($pw, PASSWORD_DEFAULT);
    unset($db['users'][$idx]['salt']);
    $db['users'][$idx]['passwordChangedAt'] = date('c');
    $revoked = 0; $keep = [];
    foreach (($db['tokens'] ?? []) as $tk => $t) {
      if (($t['userId'] ?? '') === ($target['id'] ?? '')) { $revoked++; continue; }
      $keep[$tk] = $t;
    }
    $db['tokens'] = $keep;
    $db['securityLog'] = $db['securityLog'] ?? [];
    $db['securityLog'][] = ['at' => date('c'), 'event' => 'password-reset-breakglass',
                            'email' => $target['email'] ?? '', 'role' => $target['role'] ?? '',
                            'via' => 'admin-reset.php', 'sessionsRevoked' => $revoked,
                            'ip' => ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?')];

    /* write db.json the same way the API does: lock, then replace */
    $lock = @fopen($DB_FILE . '.lock', 'c');
    if ($lock) flock($lock, LOCK_EX);
    $wrote = @file_put_contents($DB_FILE, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) !== false;
    if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
    if (!$wrote) bail('Could not save', 'The database file could not be written — check the permissions on <code>data/</code> (755) and <code>data/db.json</code> (644), then try again.');

    @file_put_contents($USED_FILE, date('c') . ' ' . ($target['email'] ?? '') . ' used' . PHP_EOL);
    @file_put_contents($LOG_FILE, date('c') . "  RESET  " . ($target['email'] ?? '') . "  role=" . ($target['role'] ?? '')
        . "  sessions revoked=" . $revoked . "  ip=" . ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?') . PHP_EOL, FILE_APPEND);

    page_top('Password reset complete');
    echo '<h1>Password reset complete</h1>'
       . '<div class="note ok"><b>' . h($target['email'] ?? '') . '</b> — the password is now the one you just typed, '
       . 'and ' . (int)$revoked . ' existing session(s) were signed out.</div>'
       . '<div class="note warn"><b>Now do these two things:</b><br>'
       . '1. Sign in at <a href="/#/admin">/#/admin</a> with the new password and confirm you are in.<br>'
       . '2. <b>Delete this file</b> (<code>admin-reset.php</code>) from the server. It will refuse to run again, '
       . 'but deleting it removes the door entirely.</div>'
       . '<div class="note">Next time, the <b>“Forgot password?”</b> link on the sign-in screen sends a code to the '
       . 'account\'s registered mobile — no file needed.</div>';
    page_bottom(); exit;
  }
  $cls = 'err';
}

/* ── form ── */
page_top('Admin password recovery');
echo '<h1>Shivaa — password recovery</h1>'
   . '<p class="sub">Sets a new password for a Shivaa account. Nothing is revealed about the old one.</p>';
if ($msg) echo '<div class="note ' . h($cls) . '">' . h($msg) . '</div>';
if (!$admins) echo '<div class="note warn">No account with the <b>admin</b> role was found in the database. The list below shows every account so you can still recover a partner or customer login.</div>';
echo '<form method="post" autocomplete="off">'
   . '<label for="key">Recovery key (set by you inside this file)</label>'
   . '<input id="key" name="key" type="password" required placeholder="your private recovery key">'
   . '<label for="user">Account</label><select id="user" name="user" required>';
foreach ($users as $i => $u) {
  $role = (string)($u['role'] ?? 'customer');
  echo '<option value="' . h((string)$i) . '"' . (($role === 'admin') ? ' selected' : '') . '>'
     . h(($u['email'] ?? '(no email)')) . ' — ' . h($role) . (($role === 'admin') ? ' ★' : '')
     . ' · +91 ' . h(substr(preg_replace('/\D/', '', (string)($u['phone'] ?? '')), -10)) . '</option>';
}
echo '</select>'
   . '<label for="password">New password (8+ characters)</label>'
   . '<input id="password" name="password" type="password" required minlength="8" placeholder="new password">'
   . '<label for="password2">Type it again</label>'
   . '<input id="password2" name="password2" type="password" required minlength="8" placeholder="repeat the new password">'
   . '<button type="submit">Set the new password</button></form>'
   . '<div class="note warn">This file works <b>once</b>. Afterwards, delete <code>admin-reset.php</code> from the server. '
   . 'Prefer the normal route when you can: <b>#/admin → Forgot password?</b> sends a code to the registered mobile.</div>';
page_bottom();
