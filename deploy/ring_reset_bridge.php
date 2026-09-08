<?php
/* SHIVAA RING RESET BRIDGE (v44) — tablet/phone only, no terminal needed.
 *
 * WHAT IT DOES (owner-approved plan, HANDOFF.md v44):
 *   1. Deletes ALL ring products on the live site (the old 85).
 *   2. Re-uploads the 65 PGS rings with 4 images each — creamy-white face
 *      cover first — and NO video. Media is fetched straight from GitHub
 *      (public repo, no token) by the server itself.
 *   3. Verifies the final ring count is 65.
 *
 * HOW TO USE (Hostinger hPanel, in a browser):
 *   1. File Manager → public_html → create a folder with a secret name,
 *      e.g. rst-x7k2q  (pick your own random name!)
 *   2. Upload THIS ONE FILE into that folder.
 *   3. Open  https://shivaa.in/rst-x7k2q/ring_reset_bridge.php
 *   4. Enter the admin password → tap the buttons top to bottom.
 *   5. When it says DONE: tap SELF-DESTRUCT, delete the folder in File
 *      Manager, and rotate the admin password.
 *
 * Safe: idempotent + ledger-resumable (re-tap resumes, never duplicates).
 * Touches ONLY category "rings". Talks only to shivaa.in + GitHub raw.
 */
declare(strict_types=1);
session_start();
set_time_limit(280);
error_reporting(E_ALL); ini_set('display_errors', '1');

const BASE   = 'https://shivaa.in';
const RAWGH  = 'https://raw.githubusercontent.com/theunreal8055-coder/Shivaa.ecom/main';
const PERTAP = 4;                       // designs uploaded per tap
const SHOTS  = ['studio', 'editorial', 'worn', 'gift'];   // studio = white face cover

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES); }

function api(string $route, string $method = 'GET', ?string $tok = null, $json = null, ?array $files = null): array {
    $ch = curl_init(BASE . $route);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 240, CURLOPT_CUSTOMREQUEST => $method]);
    $hdr = [];
    if ($tok) $hdr[] = "Authorization: Bearer $tok";
    if ($files) curl_setopt($ch, CURLOPT_POSTFIELDS, $files);
    elseif ($json !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json)); $hdr[] = 'Content-Type: application/json'; }
    if ($hdr) curl_setopt($ch, CURLOPT_HTTPHEADER, $hdr);
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($r === false) return [0, ['error' => $err]];
    return [$code, json_decode((string)$r, true) ?? []];
}

function fetch_raw(string $relpath, string $saveto): bool {
    for ($try = 1; $try <= 3; $try++) {
        $ch = curl_init(RAWGH . '/' . $relpath);
        $fh = fopen($saveto . '.part', 'w');
        curl_setopt_array($ch, [CURLOPT_TIMEOUT => 120, CURLOPT_FOLLOWLOCATION => 1,
            CURLOPT_FILE => $fh, CURLOPT_USERAGENT => 'shivaa-reset/1.0']);
        curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        fclose($fh); curl_close($ch);
        if ($code === 200 && filesize($saveto . '.part') > 0) { rename($saveto . '.part', $saveto); return true; }
        @unlink($saveto . '.part');
        sleep(1);
    }
    return false;
}

function ledger_path(): string { return __DIR__ . '/reset_ledger.json'; }
function ledger(): array { return is_file(ledger_path()) ? (json_decode((string)file_get_contents(ledger_path()), true) ?: ['deleted' => false, 'uploaded' => []]) : ['deleted' => false, 'uploaded' => []]; }
function ledger_save(array $l): void { file_put_contents(ledger_path(), json_encode($l, JSON_PRETTY_PRINT)); }

function all_skus(): array { $s = []; for ($i = 1; $i <= 65; $i++) $s[] = sprintf('PGS50%02d', $i); return $s; }

$msg = '';

/* ── login ── */
if (isset($_POST['password'])) {
    [$st, $r] = api('/api/auth/login', 'POST', null, ['email' => $_POST['email'] ?: 'admin@shivaa.in', 'password' => $_POST['password']]);
    if ($st === 200 && !empty($r['token'])) { $_SESSION['tok'] = $r['token']; $msg = '✅ Logged in.'; }
    else $msg = "❌ Login failed ($st): " . h(json_encode($r));
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?')); exit; }
$tok = $_SESSION['tok'] ?? null;

/* ── actions ── */
if ($tok && isset($_POST['action'])) {
    $L = ledger();

    if ($_POST['action'] === 'delete') {
        [$st, $r] = api('/api/products', 'GET', $tok);
        if ($st !== 200) $msg = "❌ Could not list products ($st)";
        else {
            $rings = array_values(array_filter($r['products'] ?? [], fn($p) => ($p['category'] ?? '') === 'rings'));
            $n = 0; $fail = 0;
            foreach ($rings as $p) {
                [$st2] = api('/api/products/' . $p['id'], 'DELETE', $tok);
                if ($st2 === 200 || $st2 === 404) $n++; else $fail++;
                usleep(120000);
            }
            if ($fail === 0) { $L['deleted'] = true; ledger_save($L); }
            $msg = "🗑 Deleted $n ring(s)" . ($fail ? ", $fail FAILED — tap again to retry" : '. Step 1 complete ✅');
        }
    }

    if ($_POST['action'] === 'upload') {
        if (empty($L['deleted'])) $msg = '⚠️ Run Step 1 (delete) first.';
        else {
            [$st0, $r0] = api('/api/products', 'GET', $tok);
            $skumap = [];
            if ($st0 === 200) foreach ($r0['products'] ?? [] as $p) if (!empty($p['sku'])) $skumap[$p['sku']] = $p['id'];
            $todo = array_values(array_diff(all_skus(), array_keys($L['uploaded'])));
            $batch = array_slice($todo, 0, PERTAP);
            $lines = [];
            foreach ($batch as $sku) {
                $tmp = sys_get_temp_dir() . "/shv_$sku";
                @mkdir($tmp, 0777, true);
                if (!fetch_raw("demo65/media/$sku/meta.json", "$tmp/meta.json")) { $lines[] = "❌ $sku: meta.json download failed"; continue; }
                $urls = []; $bad = false;
                foreach (SHOTS as $k) {
                    if (!fetch_raw("demo65/media/$sku/shot_$k.jpg", "$tmp/shot_$k.jpg")) { $lines[] = "❌ $sku: shot_$k download failed"; $bad = true; break; }
                    [$st, $r] = api('/api/media', 'POST', $tok, null, ['file' => new CURLFile("$tmp/shot_$k.jpg"), 'category' => 'rings']);
                    if ($st !== 200 || empty($r['url'])) { $lines[] = "❌ $sku: media shot_$k upload failed ($st)"; $bad = true; break; }
                    $urls[] = $r['url'];
                }
                if ($bad) continue;
                $rec = json_decode((string)file_get_contents("$tmp/meta.json"), true) ?: [];
                $rec['sku'] = $sku; $rec['images'] = $urls;
                unset($rec['video']);                                  // owner-approved: NO videos
                if (isset($skumap[$sku])) [$st, $r] = api('/api/products/' . $skumap[$sku], 'PUT', $tok, $rec);
                else [$st, $r] = api('/api/products', 'POST', $tok, $rec);
                if ($st === 200) { $L['uploaded'][$sku] = true; ledger_save($L); $lines[] = "✅ $sku live (4 images, no video)"; }
                else $lines[] = "❌ $sku: product save failed ($st) " . h(json_encode($r));
                foreach (glob("$tmp/*") ?: [] as $f) @unlink($f); @rmdir($tmp);
                usleep(300000);
            }
            $left = 65 - count($L['uploaded']);
            $msg = implode('<br>', $lines) . "<br><b>" . count($L['uploaded']) . "/65 uploaded — " . ($left ? "$left left, tap again ⬇" : "ALL DONE ✅ now tap Verify") . '</b>';
        }
    }

    if ($_POST['action'] === 'verify') {
        [$st, $r] = api('/api/products', 'GET', $tok);
        $rings = array_values(array_filter($r['products'] ?? [], fn($p) => ($p['category'] ?? '') === 'rings'));
        $withvid = count(array_filter($rings, fn($p) => !empty($p['video'])));
        $msg = 'Live rings: <b>' . count($rings) . '</b> (expected 65) · with video: <b>' . $withvid . '</b> (expected 0) — '
             . ((count($rings) === 65 && $withvid === 0) ? 'PERFECT ✅ Tap SELF-DESTRUCT below.' : '⚠️ mismatch — tap Upload again or re-check');
    }

    if ($_POST['action'] === 'destruct') {
        @unlink(ledger_path());
        @unlink(__FILE__);
        die('💥 Bridge deleted itself. Now delete this folder in File Manager and rotate the admin password. Goodbye!');
    }
}

$L = ledger();
$done = count($L['uploaded'] ?? []);
?><!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shivaa Ring Reset</title>
<style>
body{font-family:system-ui,sans-serif;background:#12100e;color:#f3e9d6;max-width:620px;margin:0 auto;padding:18px}
h1{font-size:1.3em;color:#e8c46a}.card{background:#1d1a16;border:1px solid #3a332a;border-radius:12px;padding:16px;margin:14px 0}
button{background:#e8c46a;color:#1d1a16;border:0;border-radius:10px;padding:14px 20px;font-size:1.05em;font-weight:700;width:100%;margin-top:8px}
button.red{background:#c0392b;color:#fff}input{width:100%;padding:12px;border-radius:8px;border:1px solid #555;background:#0e0c0a;color:#fff;margin:6px 0;box-sizing:border-box}
.log{background:#0e0c0a;border-radius:8px;padding:12px;font-size:.92em;line-height:1.5;word-break:break-word}
.step{color:#e8c46a;font-weight:700}.bar{height:10px;background:#0e0c0a;border-radius:6px;overflow:hidden}.bar i{display:block;height:100%;background:#e8c46a;width:<?= (int)($done/65*100) ?>%}
</style></head><body>
<h1>💍 Shivaa Ring Reset (v44)</h1>
<p>Deletes all old rings → re-uploads 65 PGS rings with the new creamy-white covers, 4 images, <b>no videos</b>. Resumable — tapping again never duplicates.</p>

<?php if ($msg): ?><div class="card log"><?= $msg ?></div><?php endif; ?>

<?php if (!$tok): ?>
<div class="card"><span class="step">LOGIN</span>
<form method="post"><input name="email" value="admin@shivaa.in"><input name="password" type="password" placeholder="Admin password" required>
<button>Log in</button></form></div>
<?php else: ?>
<div class="card"><span class="step">STEP 1 — Delete all old rings (85)</span>
<?= !empty($L['deleted']) ? '<p>✅ already done</p>' : '' ?>
<form method="post"><input type="hidden" name="action" value="delete"><button class="red" onclick="return confirm('Delete ALL rings on the live site? (They will be re-uploaded next)')">🗑 Delete all rings</button></form></div>

<div class="card"><span class="step">STEP 2 — Upload 65 new rings (<?= $done ?>/65)</span>
<div class="bar"><i></i></div>
<form method="post"><input type="hidden" name="action" value="upload"><button>⬆ Upload next <?= PERTAP ?> rings</button></form>
<p style="font-size:.85em">Tap repeatedly (~17 taps). Server fetches media from GitHub itself.</p></div>

<div class="card"><span class="step">STEP 3 — Verify</span>
<form method="post"><input type="hidden" name="action" value="verify"><button>🔍 Verify (expect 65 rings, 0 videos)</button></form></div>

<div class="card"><span class="step">STEP 4 — Clean up</span>
<form method="post"><input type="hidden" name="action" value="destruct"><button class="red" onclick="return confirm('Delete this bridge file?')">💥 SELF-DESTRUCT</button></form>
<p style="font-size:.85em">Then delete this folder in File Manager and rotate the admin password.</p></div>

<p><a style="color:#888" href="?logout=1">log out</a></p>
<?php endif; ?>
</body></html>
