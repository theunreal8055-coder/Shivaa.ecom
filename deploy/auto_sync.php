<?php
/* SHIVAA AUTO-SYNC — cron worker: keeps shivaa.in in sync with the GitHub branch.
 *
 * Loop (fully automatic once set up):
 *   agent generates shots/films/meta -> commits -> pushes branch
 *   cron runs this every 5-10 min  -> pulls latest branch (git checkout dir,
 *   or GitHub tarball via PAT) -> uploads every design with a complete media
 *   set that isn't in the ledger yet (media + product upsert by SKU)
 *
 * Config (0600, written once by upload_bridge.php setup form):
 *   { "email":..., "password":..., "pat":...(optional),
 *     "repo":"owner/name", "branch":..., "repo_dir":...(optional git checkout) }
 * Cron line (hPanel -> Cron Jobs, every 5 minutes):
 *   php /home/<USER>/auto_sync.php >/dev/null 2>&1
 */
declare(strict_types=1);
set_time_limit(600);
$HOME = dirname(__FILE__);
$CFG  = "$HOME/.shivaa-sync.json";
$LOG  = "$HOME/shivaa-sync.log";
$LOCK = "$HOME/shivaa-sync.lock";
$LEDG = "$HOME/shivaa-sync-ledger.json";
$SRC  = "$HOME/shivaa-sync-src";

function logline(string $m): void {
    global $LOG;
    $line = date('Y-m-d H:i:s') . "  $m\n";
    file_put_contents($LOG, $line, FILE_APPEND);
    if (php_sapi_name() !== 'cli') echo "<pre>" . htmlspecialchars($line) . "</pre>";
}
function finish(int $code, string $msg): void {
    global $HOME;
    file_put_contents("$HOME/shivaa-sync-last.json", json_encode(['ts' => time(), 'code' => $code, 'msg' => $msg]));
    logline($msg);
    exit($code);
}

$fp = fopen($LOCK, 'c');
if (!flock($fp, LOCK_EX | LOCK_NB)) finish(0, 'another sync is running — skipping');
if (!is_file($CFG)) finish(1, 'no config — open upload_bridge.php once and save auto-sync settings');
$cfg = json_decode((string)file_get_contents($CFG), true) ?: [];
if (empty($cfg['email']) || empty($cfg['password'])) finish(1, 'config missing admin credentials');

function api(string $route, string $method = 'GET', ?string $tok = null, $json = null, ?array $files = null): array {
    $ch = curl_init('https://shivaa.in' . $route);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 300, CURLOPT_CUSTOMREQUEST => $method]);
    $hdr = [];
    if ($tok) $hdr[] = "Authorization: Bearer $tok";
    if ($files) curl_setopt($ch, CURLOPT_POSTFIELDS, $files);
    elseif ($json !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json)); $hdr[] = 'Content-Type: application/json'; }
    if ($hdr) curl_setopt($ch, CURLOPT_HTTPHEADER, $hdr);
    $r = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); $err = curl_error($ch);
    curl_close($ch);
    if ($r === false) return [0, ['error' => $err]];
    return [$code, json_decode((string)$r, true) ?? []];
}

/* 1 · get latest source */
$root = null;
if (!empty($cfg['repo_dir']) && is_file($cfg['repo_dir'] . '/demo65/config.json')) {
    $root = $cfg['repo_dir'];
    logline("using existing checkout $root");
} elseif (!empty($cfg['pat']) && !empty($cfg['repo']) && !empty($cfg['branch'])) {
    $tmp = "$SRC.tar.gz";
    $ch = curl_init("https://api.github.com/repos/{$cfg['repo']}/tarball/{$cfg['branch']}");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 300, CURLOPT_FOLLOWLOCATION => 1,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $cfg['pat'], 'Accept: application/vnd.github+json'],
        CURLOPT_FILE => ($fh = fopen($tmp, 'w'))]);
    curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    fclose($fh); curl_close($ch);
    if ($code !== 200) finish(1, "github tarball fetch failed ($code)");
    @mkdir($SRC, 0755, true);
    foreach (glob("$SRC/*") ?: [] as $old) is_dir($old) ? exec('rm -rf ' . escapeshellarg($old)) : @unlink($old);
    try {
        $ph = new PharData($tmp);          // .tar.gz is handled transparently
        $ph->extractTo($SRC, null, true);
    } catch (Throwable $e) { finish(1, 'extract failed: ' . $e->getMessage()); }
    @unlink($tmp);
    foreach (glob("$SRC/*") ?: [] as $d) if (is_file("$d/demo65/config.json")) { $root = $d; break; }
    if (!$root) finish(1, 'tarball had no demo65/config.json');
    logline("fetched latest $root");
} else {
    finish(1, 'config has neither repo_dir nor pat — cannot fetch source');
}

/* 2 · login */
[$st, $r] = api('/api/auth/login', 'POST', null, ['email' => $cfg['email'], 'password' => $cfg['password']]);
if ($st !== 200 || empty($r['token'])) finish(1, "login failed ($st)");
$tok = $r['token'];

/* 3 · ready designs not yet synced */
$ledger = is_file($LEDG) ? (json_decode((string)file_get_contents($LEDG), true) ?: []) : [];
$designs = json_decode((string)file_get_contents("$root/demo65/work/designs.json"), true) ?: [];
$todo = [];
foreach ($designs as $d) {
    $sku = $d['sku'];
    if (isset($ledger[$sku])) continue;
    $dir = "$root/demo65/media/$sku";
    $ok = is_file("$dir/video.mp4") && is_file("$dir/meta.json");
    foreach (['studio', 'worn', 'gift', 'editorial'] as $k) $ok = $ok && is_file("$dir/shot_$k.jpg");
    if ($ok) $todo[] = $sku;
}
if (!$todo) finish(0, 'nothing new to sync (' . count($ledger) . ' already live)');

[$st0, $r0] = api('/api/products', 'GET', $tok);
$skumap = [];
if ($st0 === 200) foreach ($r0['products'] ?? [] as $p) if (!empty($p['sku'])) $skumap[$p['sku']] = $p['id'];

$done = 0;
foreach (array_slice($todo, 0, 12) as $sku) {          // cap per run: cron-friendly
    $dir = "$root/demo65/media/$sku";
    $imgs = []; $fail = false;
    foreach (['studio', 'worn', 'gift', 'editorial'] as $k) {
        [$st, $r] = api('/api/media', 'POST', $tok, null, ['file' => new CURLFile("$dir/shot_$k.jpg"), 'category' => 'rings']);
        if ($st === 200 && !empty($r['url'])) $imgs[] = $r['url'];
        else { logline("MEDIA FAIL $sku/$k ($st)"); $fail = true; break; }
    }
    if ($fail) continue;
    [$st, $r] = api('/api/media', 'POST', $tok, null, ['file' => new CURLFile("$dir/video.mp4"), 'category' => 'rings']);
    if ($st !== 200 || empty($r['url'])) { logline("VIDEO FAIL $sku ($st)"); continue; }
    $vid = $r['url'];
    $rec = json_decode((string)file_get_contents("$dir/meta.json"), true);
    $rec['sku'] = $sku; $rec['images'] = $imgs; $rec['video'] = $vid;
    if (isset($skumap[$sku])) [$st, $r] = api('/api/products/' . $skumap[$sku], 'PUT', $tok, $rec);
    else [$st, $r] = api('/api/products', 'POST', $tok, $rec);
    if ($st === 200) {
        $ledger[$sku] = ['ts' => time(), 'pid' => $r['id'] ?? $skumap[$sku] ?? ''];
        file_put_contents($LEDG, json_encode($ledger, JSON_PRETTY_PRINT));
        logline("LIVE $sku (" . (isset($skumap[$sku]) ? 'updated' : 'created') . ')');
        $done++;
    } else logline("PRODUCT FAIL $sku ($st) " . json_encode($r));
    usleep(600000);
}
flock($fp, LOCK_UN);
finish(0, "synced $done design(s); " . count($todo) . " were pending");
