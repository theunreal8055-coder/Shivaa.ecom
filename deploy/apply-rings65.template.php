<?php
/* SHIVAA RINGS-65 UPDATE INSTALLER (v46) — adds/updates ALL 65 PGS rings, touches nothing else.
 *
 * WHAT IT DOES:
 *   1. Backs up the live database (data/db.json.bak-<date>) — one-click rollback.
 *   2. Upserts ONLY the 65 PGS ring products (PGS5001–PGS5065) by SKU:
 *      new images (creamy-white face cover + editorial/worn/gift), no videos.
 *   3. NEVER deletes anything else. Untouched: orders, users, rates, making
 *      charges, coupons, reviews, all other categories — and even the 20 old
 *      SS-RIN demo rings (unless you tick the optional checkbox).
 *   4. Preserves live per-product data: stock, rating, reviews, active flag,
 *      barcode/supplier/cost (if staff entered them), real HUID/hallmark
 *      records, and product ids (so old orders keep pointing at them).
 *
 * HOW TO USE (Hostinger hPanel, in a browser — tablet OK):
 *   1. File Manager → public_html → upload shivaa-update-v46-rings65.zip →
 *      right-click → Extract (it only ADDS ring images + this file + 1 json).
 *   2. Open  https://shivaa.in/apply-rings65.php
 *   3. Enter the admin password → tap the buttons top to bottom.
 *   4. When it says DONE: tap SELF-DESTRUCT, delete the zip in File Manager,
 *      LiteSpeed Cache → Purge All, hard-refresh the shop.
 *
 * ROLLBACK: if anything looks wrong, in File Manager rename
 *   data/db.json.bak-<date>  →  data/db.json  (rename the current one away first).
 */
declare(strict_types=1);
session_start();
set_time_limit(280);
error_reporting(E_ALL); ini_set('display_errors', '1');

$DB_FILE = __DIR__ . '/data/db.json';
$PAYLOAD = __DIR__ . '/data/rings65-products.json';

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES); }

function base_url(): string {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
          || ((string)($_SERVER['SERVER_PORT'] ?? '') === '443');
    $host = $_POST['host'] ?? ($_SERVER['HTTP_HOST'] ?? 'shivaa.in');
    return (($https ? 'https' : 'http') . '://' . $host);
}

function api_login(string $base, string $email, string $pass): array {
    $ch = curl_init($base . '/api/auth/login');
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 60,
        CURLOPT_POST => 1, CURLOPT_POSTFIELDS => json_encode(['email' => $email, 'password' => $pass]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']]);
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($r === false) return [0, ['error' => $err]];
    return [$code, json_decode((string)$r, true) ?? []];
}

/* Same locking scheme as api.php (db.json.lock). */
function r65_load(string $DB_FILE): array {
    for ($i = 0; $i < 5; $i++) {
        $lock = @fopen($DB_FILE . '.lock', 'c');
        if ($lock) flock($lock, LOCK_SH);
        $raw = @file_get_contents($DB_FILE);
        if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
        $db = json_decode((string)$raw, true);
        if (is_array($db)) return $db;
        usleep(150000);
    }
    return [];
}
function r65_save(string $DB_FILE, array $db): bool {
    $lock = @fopen($DB_FILE . '.lock', 'c');
    if ($lock) flock($lock, LOCK_EX);
    $ok = @file_put_contents($DB_FILE,
        json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
    return $ok !== false;
}

function is_pgs(array $p): bool { return strncmp((string)($p['sku'] ?? ''), 'PGS', 3) === 0; }

function r65_stats(array $db): array {
    $prods = $db['products'] ?? [];
    $pgs = array_values(array_filter($prods, 'is_pgs'));
    $rings = array_values(array_filter($prods, fn($p) => ($p['category'] ?? '') === 'rings'));
    $withvid = count(array_filter($pgs, fn($p) => !empty($p['video'])));
    $demo = array_values(array_filter($rings, fn($p) => strncmp((string)($p['sku'] ?? ''), 'SS-RIN-', 7) === 0));
    return ['total' => count($prods), 'pgs' => count($pgs), 'rings' => count($rings),
            'withvid' => $withvid, 'demo' => count($demo)];
}

function r65_imgcheck(array $payload): array {
    $missing = []; $n = 0;
    foreach ($payload as $p) foreach (($p['images'] ?? []) as $im) {
        $n++;
        if (!is_file(__DIR__ . $im)) $missing[] = $im;
    }
    return [$n, $missing];
}

$msg = '';

/* ── login ── */
if (isset($_POST['password']) && !isset($_POST['action'])) {
    [$st, $r] = api_login(base_url(), (string)($_POST['email'] ?? 'admin@shivaa.in'), (string)$_POST['password']);
    if ($st === 200 && !empty($r['token'])) { $_SESSION['tok'] = $r['token']; $msg = '✅ Logged in.'; }
    else $msg = "❌ Login failed ($st): " . h(json_encode($r));
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: ' . strtok((string)$_SERVER['REQUEST_URI'], '?')); exit; }
$tok = $_SESSION['tok'] ?? null;

/* ── payload + live db (read-only until merge) ── */
$payload = [];
if (is_file($PAYLOAD)) {
    $pj = json_decode((string)file_get_contents($PAYLOAD), true);
    $payload = $pj['products'] ?? [];
}
$live = $tok ? r65_load($DB_FILE) : [];
$st = $live ? r65_stats($live) : ['total' => 0, 'pgs' => 0, 'rings' => 0, 'withvid' => 0, 'demo' => 0];
[$imgN, $imgMissing] = $payload ? r65_imgcheck($payload) : [0, []];

/* ── actions ── */
if ($tok && isset($_POST['action'])) {

    if ($_POST['action'] === 'merge') {
        if (count($payload) !== 65) {
            $msg = '❌ Payload must contain exactly 65 products, found ' . count($payload) . '. Re-upload the zip.';
        } elseif (!$live || empty($live['products'])) {
            $msg = '❌ Could not read live data/db.json — check it exists and is valid JSON.';
        } else {
            $bak = __DIR__ . '/data/db.json.bak-' . date('Ymd-His');
            if (!@copy($DB_FILE, $bak)) { $msg = '❌ Backup failed — merge ABORTED, nothing was changed.'; }
            else {
                $bySku = []; $idsUsed = [];
                foreach ($live['products'] as $i => $p) {
                    if (!empty($p['sku'])) $bySku[(string)$p['sku']] = $i;
                    if (!empty($p['id'])) $idsUsed[(string)$p['id']] = true;
                }
                $updated = 0; $added = 0; $hallKept = 0; $addedSkus = [];
                foreach ($payload as $rec) {
                    $sku = (string)($rec['sku'] ?? '');
                    if ($sku === '') continue;
                    unset($rec['video']);                       // v44: PGS rings carry NO video
                    if (isset($bySku[$sku])) {                  // UPDATE in place
                        $i = $bySku[$sku];
                        $old = $live['products'][$i];
                        foreach (['id','createdAt','stock','rating','reviews','active'] as $k)
                            if (array_key_exists($k, $old)) $rec[$k] = $old[$k];
                        foreach (['barcode','supplier','supplierId'] as $k)   // staff-entered data wins
                            if (!empty($old[$k])) $rec[$k] = $old[$k];
                        if (!empty($old['costPerGram'])) $rec['costPerGram'] = $old['costPerGram'];
                        $lh = $old['hallmark'] ?? null;         // real HUID records win
                        if (is_array($lh) && (!empty($lh['entries']) || !empty($lh['verified'])
                                || (($lh['status'] ?? 'not_provided') !== 'not_provided'))) {
                            $rec['hallmark'] = $lh; $hallKept++;
                        }
                        $rec['tags'] = array_values(array_unique(array_merge($rec['tags'] ?? [], $old['tags'] ?? [])));
                        $live['products'][$i] = $rec;
                        $updated++;
                    } else {                                    // ADD new
                        if (empty($rec['id']) || isset($idsUsed[(string)$rec['id']]))
                            $rec['id'] = 'p_' . strtolower($sku) . '_' . substr(md5($sku . microtime(true)), 0, 6);
                        $idsUsed[(string)$rec['id']] = true;
                        $live['products'][] = $rec;
                        $added++; $addedSkus[] = $sku;
                    }
                }
                $removedDemo = [];
                if (!empty($_POST['remove_demo'])) {
                    $keep = [];
                    foreach ($live['products'] as $p) {
                        if (($p['category'] ?? '') === 'rings' && strncmp((string)($p['sku'] ?? ''), 'SS-RIN-', 7) === 0)
                            $removedDemo[] = (string)$p['sku'];
                        else $keep[] = $p;
                    }
                    $live['products'] = array_values($keep);
                }
                if (!r65_save($DB_FILE, $live)) {
                    $msg = '❌ SAVE FAILED — restore from backup <b>' . h(basename($bak)) . '</b> in File Manager.';
                } else {
                    $live = r65_load($DB_FILE);
                    $st = r65_stats($live);
                    [$imgN, $imgMissing] = r65_imgcheck($payload);
                    $msg = '✅ <b>MERGE DONE.</b> Backup: <b>' . h(basename($bak)) . '</b><br>'
                         . "Updated: <b>$updated</b> · Added: <b>$added</b>"
                         . ($addedSkus ? ' (' . h(implode(', ', $addedSkus)) . ')' : '') . '<br>'
                         . "Live stock/ratings/HUID data preserved · real hallmark records kept: <b>$hallKept</b><br>"
                         . ($removedDemo ? 'Demo rings removed: <b>' . count($removedDemo) . '</b> (' . h(implode(', ', $removedDemo)) . ')<br>' : 'Demo rings: left untouched<br>')
                         . 'Now: PGS rings <b>' . $st['pgs'] . '</b>/65 · PGS with video <b>' . $st['withvid'] . '</b> (expect 0)'
                         . ($imgMissing ? '<br>⚠️ Missing image files: <b>' . count($imgMissing) . '</b> — re-extract the zip!' : '<br>Images on disk: <b>' . $imgN . '/' . $imgN . '</b> ✅');
                }
            }
        }
    }

    if ($_POST['action'] === 'verify') {
        $live = r65_load($DB_FILE);
        $st = $live ? r65_stats($live) : $st;
        [$imgN, $imgMissing] = $payload ? r65_imgcheck($payload) : [0, []];
        $ok = ($st['pgs'] === 65 && $st['withvid'] === 0 && !$imgMissing);
        $msg = 'Products total: <b>' . $st['total'] . '</b> · Rings: <b>' . $st['rings'] . '</b>'
             . ' · PGS rings: <b>' . $st['pgs'] . '</b>/65 · PGS with video: <b>' . $st['withvid'] . '</b>/0'
             . ' · Images: <b>' . ($imgN - count($imgMissing)) . '/' . $imgN . '</b>'
             . ($imgMissing ? '<br>⚠️ Missing: ' . h(implode(', ', array_slice($imgMissing, 0, 10))) . (count($imgMissing) > 10 ? ' …' : '') : '')
             . '<br>' . ($ok ? 'PERFECT ✅ — tap SELF-DESTRUCT below.' : '⚠️ Not perfect yet — tap Merge (Step 1) first.');
    }

    if ($_POST['action'] === 'destruct') {
        @unlink($PAYLOAD);
        @unlink(__FILE__);
        die('💥 Installer deleted itself (script + payload). Now: delete the zip in File Manager, '
          . 'LiteSpeed Cache → Purge All, hard-refresh the shop. '
          . 'The db backup (data/db.json.bak-*) stays as your rollback — delete it later when happy.');
    }
}
?><!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shivaa Rings-65 Update</title>
<style>
body{font-family:system-ui,sans-serif;background:#12100e;color:#f3e9d6;max-width:640px;margin:0 auto;padding:18px}
h1{font-size:1.3em;color:#e8c46a}.card{background:#1d1a16;border:1px solid #3a332a;border-radius:12px;padding:16px;margin:14px 0}
button{background:#e8c46a;color:#1d1a16;border:0;border-radius:10px;padding:14px 20px;font-size:1.05em;font-weight:700;width:100%;margin-top:8px}
button.red{background:#c0392b;color:#fff}input[type=text],input[type=password],input:not([type]){width:100%;padding:12px;border-radius:8px;border:1px solid #555;background:#0e0c0a;color:#fff;margin:6px 0;box-sizing:border-box}
.log{background:#0e0c0a;border-radius:8px;padding:12px;font-size:.92em;line-height:1.6;word-break:break-word}
.step{color:#e8c46a;font-weight:700}table{width:100%;font-size:.92em;border-collapse:collapse}td{padding:4px 2px;border-bottom:1px solid #2c2822}
td:last-child{text-align:right;font-weight:700}.chk{font-size:.9em;line-height:1.5;background:#0e0c0a;border-radius:8px;padding:10px;margin-top:8px}
</style></head><body>
<h1>💍 Shivaa Rings-65 Update (v46)</h1>
<p>Adds/updates <b>all 65 PGS rings</b> (white-face covers, 4 photos, no videos).
<b>Touches nothing else</b> — orders, users, rates, other categories stay exactly as they are.</p>

<?php if ($msg): ?><div class="card log"><?= $msg ?></div><?php endif; ?>

<?php if (!$tok): ?>
<div class="card"><span class="step">LOGIN</span>
<form method="post"><input name="email" value="admin@shivaa.in"><input name="password" type="password" placeholder="Admin password" required autocomplete="current-password">
<button>Log in</button></form></div>
<?php else: ?>
<div class="card"><span class="step">PREFLIGHT</span>
<table>
<tr><td>Payload in zip</td><td><?= count($payload) ?>/65 rings</td></tr>
<tr><td>Ring images on disk</td><td><?= $imgN ? (($imgN - count($imgMissing)) . '/' . $imgN) : '—' ?><?= $imgMissing ? ' ⚠️' : '' ?></td></tr>
<tr><td>Live products (total)</td><td><?= $st['total'] ?></td></tr>
<tr><td>Live PGS rings</td><td><?= $st['pgs'] ?>/65</td></tr>
<tr><td>Live PGS with video</td><td><?= $st['withvid'] ?> (will become 0)</td></tr>
<tr><td>Old SS-RIN demo rings</td><td><?= $st['demo'] ?> (kept, unless ticked)</td></tr>
<tr><td>Live db readable</td><td><?= $live ? 'yes ✅' : 'NO ❌' ?></td></tr>
</table></div>

<div class="card"><span class="step">STEP 1 — Merge (backup first, automatic)</span>
<form method="post"><input type="hidden" name="action" value="merge">
<div class="chk"><label><input type="checkbox" name="remove_demo" value="1"> Also remove the 20 old <b>SS-RIN</b> demo rings <span style="color:#c0392b">(optional — off = nothing is ever deleted)</span></label></div>
<button>⬆ Merge 65 rings now</button></form></div>

<div class="card"><span class="step">STEP 2 — Verify</span>
<form method="post"><input type="hidden" name="action" value="verify"><button>🔍 Verify (expect 65 PGS, 0 videos, all images)</button></form></div>

<div class="card"><span class="step">STEP 3 — Clean up</span>
<form method="post"><input type="hidden" name="action" value="destruct"><button class="red" onclick="return confirm('Delete this installer (script + payload)? Do this only after Verify is green.')">💥 SELF-DESTRUCT</button></form>
<p style="font-size:.85em">Then: delete the zip in File Manager → LiteSpeed Cache → Purge All → hard-refresh the shop.</p></div>

<p><a style="color:#888" href="?logout=1">log out</a></p>
<?php endif; ?>
</body></html>
