<?php
/* SHIVAA UPLOAD BRIDGE — browser-only uploader for tablets/phones (no terminal).
 *
 * Place this ONE file in a secret folder inside public_html, e.g.
 *   public_html/pub-k9x2m/upload_bridge.php
 * then open https://shivaa.in/pub-k9x2m/upload_bridge.php in your browser.
 * It finds the extracted batch folder in your home dir automatically, logs in
 * as admin (password entered here over HTTPS, kept only in your PHP session),
 * and uploads 4 designs per tap (media + product upsert by SKU,
 * category rings + tag mens = Men's section). When finished press
 * SELF-DESTRUCT, then delete the folder in File Manager and rotate the
 * admin password. Talks only to https://shivaa.in (its own server).
 */
declare(strict_types=1);
session_start();
set_time_limit(300);
error_reporting(E_ALL); ini_set('display_errors', '1');
const BATCH = 4;
const BASE  = 'https://shivaa.in';

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES); }

function find_root(): ?string {
    $cands = [];
    foreach ([dirname(__DIR__, 2), dirname(__DIR__, 3), dirname(__DIR__, 4)] as $base) {
        $cands[] = $base;
        foreach (glob("$base/*") ?: [] as $c) $cands[] = $c;
        foreach (glob("$base/*/*") ?: [] as $c) $cands[] = $c;
    }
    foreach (glob('/home/*') ?: [] as $h1) {
        $cands[] = $h1;
        foreach (glob("$h1/*") ?: [] as $c) $cands[] = $c;
        foreach (glob("$h1/*/*") ?: [] as $c) $cands[] = $c;
    }
    foreach ($cands as $d) {
        if (is_dir("$d/demo65") && file_exists("$d/demo65/config.json")) return $d;
    }
    return null;
}

function api(string $route, string $method = 'GET', ?string $tok = null, $json = null, ?array $files = null): array {
    $ch = curl_init(BASE . $route);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 300, CURLOPT_CUSTOMREQUEST => $method]);
    $hdr = [];
    if ($tok) $hdr[] = "Authorization: Bearer $tok";
    if ($files) {
        $post = $files;
        curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
    } elseif ($json !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json));
        $hdr[] = 'Content-Type: application/json';
    }
    if ($hdr) curl_setopt($ch, CURLOPT_HTTPHEADER, $hdr);
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($r === false) return [0, ['error' => $err]];
    return [$code, json_decode((string)$r, true) ?? []];
}

function ledger_path(): string { return __DIR__ . '/ledger.json'; }
function ledger(): array { return is_file(ledger_path()) ? (json_decode((string)file_get_contents(ledger_path()), true) ?: []) : []; }
function ledger_save(array $l): void { file_put_contents(ledger_path(), json_encode($l, JSON_PRETTY_PRINT)); }

function ready_designs(string $root): array {
    $designs = json_decode((string)file_get_contents("$root/demo65/work/designs.json"), true) ?: [];
    $out = [];
    foreach ($designs as $d) {
        $sku = $d['sku']; $dir = "$root/demo65/media/$sku";
        $ok = is_file("$dir/video.mp4");
        foreach (['studio', 'worn', 'gift', 'editorial'] as $k) $ok = $ok && is_file("$dir/shot_$k.jpg");
        if ($ok) $out[] = $sku;
    }
    return $out;
}

$log  = $_SESSION['lastlog'] ?? '';
$root = find_root();
$todo = $root ? array_values(array_diff(ready_designs($root), array_keys(ledger()))) : [];
$act  = $_POST['action'] ?? '';

if ($act === 'login' && $root) {
    [$st, $r] = api('/api/auth/login', 'POST', null, ['email' => (($_POST['email'] ?? '') ?: 'admin@shivaa.in'), 'password' => $_POST['password'] ?? '']);
    if ($st === 200 && !empty($r['token'])) { $_SESSION['tok'] = $r['token']; $log = "Logged in as " . h($r['user']['name'] ?? 'admin') . "."; }
    else $log = "Login failed ($st): " . h(json_encode($r));
}
$HOME_DIR = dirname(__DIR__, 2);
if ($act === 'setup' && $root) {
    $cfg = [
        'email'    => (($_POST['email'] ?? '') ?: 'admin@shivaa.in'),
        'password' => $_POST['password'] ?? '',
        'pat'      => trim($_POST['pat'] ?? ''),
        'repo'     => 'theunreal8055-coder/Shivaa.ecom',
        'branch'   => trim($_POST['branch'] ?? '') ?: '',   // empty = follow default branch (main)
        'repo_dir' => trim($_POST['repo_dir'] ?? ''),
    ];
    if ($cfg['password'] === '') { $log = 'Setup needs the admin password.'; }
    else {
        $p = "$HOME_DIR/.shivaa-sync.json";
        file_put_contents($p, json_encode($cfg, JSON_PRETTY_PRINT));
        @chmod($p, 0600);
        $src = "$root/deploy/auto_sync.php";
        if (is_file($src)) { copy($src, "$HOME_DIR/auto_sync.php"); @chmod("$HOME_DIR/auto_sync.php", 0755); }
        $log = "Auto-sync configured. Config: $p (0600). Worker: $HOME_DIR/auto_sync.php\nAdd the cron line shown below in hPanel → Cron Jobs.";
    }
}
if ($act === 'syncnow') {
    $w = "$HOME_DIR/auto_sync.php";
    if (!is_file($w)) {
        $log = 'auto_sync.php not in home dir — run setup first.';
    } else {
        $out = @shell_exec('php ' . escapeshellarg($w) . ' 2>&1');
        $tail = is_file("$HOME_DIR/shivaa-sync.log") ? explode("\n", trim((string)file_get_contents("$HOME_DIR/shivaa-sync.log"))) : [];
        $tail = array_slice($tail, -25);
        $last = is_file("$HOME_DIR/shivaa-sync-last.json") ? (json_decode((string)file_get_contents("$HOME_DIR/shivaa-sync-last.json"), true) ?: []) : [];
        $log = "sync exit: " . h(json_encode($last)) . "\n" . h(implode("\n", $tail)) . ($out ? "\nshell: " . h(substr($out, 0, 400)) : '');
    }
}
if ($act === 'batch' && $root && !empty($_SESSION['tok'])) {
    $tok = $_SESSION['tok'];
    $lines = [];
    [$st0, $r0] = api('/api/products', 'GET', $tok);
    $skumap = [];
    if ($st0 === 200) foreach ($r0['products'] ?? [] as $p) if (!empty($p['sku'])) $skumap[$p['sku']] = $p['id'];
    foreach (array_slice($todo, 0, BATCH) as $sku) {
        $dir = "$root/demo65/media/$sku";
        $imgs = [];
        $fail = false;
        foreach (['studio', 'worn', 'gift', 'editorial'] as $k) {
            [$st, $r] = api('/api/media', 'POST', $tok, null, ['file' => new CURLFile("$dir/shot_$k.jpg"), 'category' => 'rings']);
            if ($st === 200 && !empty($r['url'])) { $imgs[] = $r['url']; $lines[] = "media $sku/$k -> " . $r['url']; }
            else { $lines[] = "MEDIA FAIL $sku/$k ($st) " . h(json_encode($r)); $fail = true; break; }
        }
        if ($fail) continue;
        $vid = null;
        [$st, $r] = api('/api/media', 'POST', $tok, null, ['file' => new CURLFile("$dir/video.mp4"), 'category' => 'rings']);
        if ($st === 200 && !empty($r['url'])) { $vid = $r['url']; $lines[] = "media $sku/video -> " . $r['url']; }
        else { $lines[] = "VIDEO FAIL $sku ($st) " . h(json_encode($r)); continue; }
        $meta = json_decode((string)file_get_contents("$dir/meta.json"), true);
        $rec = $meta; $rec['sku'] = $sku; $rec['images'] = $imgs; $rec['video'] = $vid;
        if (isset($skumap[$sku])) {
            [$st, $r] = api('/api/products/' . $skumap[$sku], 'PUT', $tok, $rec);
            $how = 'updated'; $pid = $skumap[$sku];
        } else {
            [$st, $r] = api('/api/products', 'POST', $tok, $rec);
            $how = 'created'; $pid = $r['id'] ?? '?';
        }
        if ($st === 200) { $lines[] = "product $sku -> $pid ($how)"; $l = ledger(); $l[$sku] = ['pid' => $pid, 'ts' => time()]; ledger_save($l); }
        else $lines[] = "PRODUCT FAIL $sku ($st) " . h(json_encode($r));
        usleep(600000);
    }
    $log = implode("\n", $lines);
    $_SESSION['lastlog'] = $log;
    $todo = $root ? array_values(array_diff(ready_designs($root), array_keys(ledger()))) : [];
    header('Location: ' . $_SERVER['REQUEST_URI']); exit;
}
if ($act === 'logout') { unset($_SESSION['tok']); $log = 'Logged out.'; }
if ($act === 'destruct') {
    @unlink(ledger_path());
    @unlink(__FILE__);
    @rmdir(__DIR__);
    echo '<h1>Bridge destroyed.</h1><p>Now delete the (now empty) folder in File Manager and rotate the admin password.</p>';
    exit;
}
$_SESSION['lastlog'] = $log;
$done = count(ledger());
?><!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shivaa upload bridge</title>
<style>body{font-family:system-ui;margin:1.2rem;max-width:44rem}button{font-size:1.1rem;padding:.7rem 1.2rem;margin:.3rem 0}
input{font-size:1rem;padding:.5rem;width:100%;box-sizing:border-box}pre{background:#f4f4f4;padding:.8rem;overflow:auto;white-space:pre-wrap}
.warn{background:#fff3cd;padding:.7rem;border-radius:6px}.ok{background:#e8f5e9;padding:.7rem;border-radius:6px}</style>
<h1>Shivaa upload bridge</h1>
<p>Batch folder: <b><?= $root ? h($root) : 'NOT FOUND — upload & extract the repo ZIP in your home directory first' ?></b></p>
<p>Uploaded designs: <b><?= $done ?></b> · remaining ready: <b><?= count($todo) ?></b></p>
<?php if (!$root): ?>
  <p class="warn">Use hPanel → File Manager: upload the repo ZIP to your home dir (/home/…) and Extract it. Then reload.</p>
<?php elseif (empty($_SESSION['tok'])): ?>
  <form method="post">
    <input type="hidden" name="action" value="login">
    <label>Admin email <input name="email" value="admin@shivaa.in"></label>
    <label>Password <input type="password" name="password" autocomplete="current-password"></label>
    <button>Log in to shivaa.in</button>
  </form>
<?php else: ?>
  <div class="ok">Logged in. Each tap uploads <?= BATCH ?> designs (4 photos + film + product, Men's section).</div>
  <?php if ($todo): ?>
    <form method="post"><input type="hidden" name="action" value="batch">
      <button> Upload next <?= min(BATCH, count($todo)) ?> designs (<?= h(implode(', ', array_slice($todo, 0, BATCH))) ?>)</button></form>
  <?php else: ?>
    <p class="ok"><b>All ready designs uploaded.</b> Check shivaa.in → Men's chip. Then destroy the bridge:</p>
  <?php endif; ?>
  <form method="post" onsubmit="return confirm('Destroy the bridge file now?')"><input type="hidden" name="action" value="destruct">
    <button style="background:#c62828;color:#fff">💣 SELF-DESTRUCT bridge</button></form>
  <form method="post"><input type="hidden" name="action" value="logout"><button>Log out</button></form>
<?php endif; ?>
<h2>🤖 Auto-sync (one-time setup — then everything is automatic)</h2>
<p>Saves your admin login + optional GitHub token into <code><?= h($HOME_DIR) ?>/.shivaa-sync.json</code> (permissions 0600, server-only),
installs the cron worker, and shows the single cron line to paste in hPanel. After this, every batch I push to GitHub
goes live on shivaa.in by itself within minutes.</p>
<form method="post">
  <input type="hidden" name="action" value="setup">
  <label>Admin email <input name="email" value="admin@shivaa.in"></label>
  <label>Admin password (stored 0600 on your server only) <input type="password" name="password"></label>
  <label>GitHub fine-grained PAT (contents: read) — optional if hPanel git-deploy checkout path given below <input name="pat" placeholder="github_pat_…"></label>
  <label>Branch to follow — leave EMPTY for default (main, recommended) <input name="branch" value="" placeholder="(empty = main)"></label>
  <label>…or path of an existing git checkout on the server (optional) <input name="repo_dir" placeholder="/home/u…/shivaa-sync"></label>
  <button>Save auto-sync settings</button>
</form>
<p>Cron line — hPanel → <b>Cron Jobs</b> → Custom, schedule every 5 minutes:<br>
<code>php <?= h($HOME_DIR) ?>/auto_sync.php &gt;/dev/null 2&gt;&amp;1</code></p>
<form method="post"><input type="hidden" name="action" value="syncnow"><button>▶ Run sync now (test)</button></form>
<?php if ($log): ?><h3>Last run</h3><pre><?= h($log) ?></pre><?php endif; ?>
<p class="warn">When done: SELF-DESTRUCT → delete this folder in File Manager → rotate the admin password.</p>
