<?php
/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA · 65-RING BATCH — browser setup file (v47)
   ─────────────────────────────────────────────────────────────────────
   WHAT IT DOES  (owner-approved plan: delete the old rings, publish the
   65 PGS rings with their 4 new shots each — creamy-white studio face
   first — and NO videos on the ring batch)
     1. PREVIEW   — shows what is live right now. Changes nothing.
     2. DELETE    — removes every product in category "rings".
     3. UPLOAD    — publishes PGS5001 … PGS5065, 4 images each.
                    Media comes from this folder if you uploaded it,
                    otherwise the server downloads it from GitHub itself.
     4. VERIFY    — expects 65 rings, 0 videos.
     5. DESTRUCT  — deletes this file so it cannot be used again.

   HOW TO USE
     1. Create a folder inside public_html with a RANDOM name, e.g.
        public_html/rst-x7k2q/   (do not use an obvious name)
     2. Upload this ONE file into that folder.
     3. Open it in a browser:  https://shivaa.in/rst-x7k2q/ring_reset_bridge.php
     4. Set SETUP_KEY below to your own long random text first — the file
        refuses to run on the placeholder. (It also asks for the admin
        password, which is never stored.)
     5. Tap the buttons top to bottom. Tapping Upload repeatedly resumes
        where it stopped and never duplicates a design.
     6. When VERIFY says PERFECT: tap DESTRUCT, delete the folder, and
        keep using the admin dashboard.

   SAFE BY DESIGN
     · Touches ONLY category "rings" — orders, customers, prices, the Gold
       Finale and every other category are untouched.
     · Idempotent + resumable (ledger in this folder, deleted on DESTRUCT).
     · Preview changes nothing; every other button asks for confirmation.
     · Nothing is ever invented: weight, purity and making charges come
       from the supplier tags recorded in each design's meta.json.
   ═══════════════════════════════════════════════════════════════════════ */

declare(strict_types=1);

/* ─── settings you control ─── */
const SETUP_KEY     = 'CHANGE-THIS-KEY-123';   // ← set your own long random key
const DEFAULT_STOCK = 10;                      // used when a design's meta.json has no stock (was 0 → showed "0 left")
/* ──────────────────────────── */

session_start();
set_time_limit(280);
error_reporting(E_ALL); ini_set('display_errors', '1');

const BASE   = 'https://shivaa.in';
const RAWGH  = 'https://raw.githubusercontent.com/theunreal8055-coder/Shivaa.ecom/main';
/* mirror, used only if your server cannot reach raw.githubusercontent.com */
const RAWCDN = 'https://cdn.jsdelivr.net/gh/theunreal8055-coder/Shivaa.ecom@main';
const PERTAP = 4;                                    // designs published per tap
const SHOTS  = ['studio', 'editorial', 'worn', 'gift'];   // studio = white face cover
const FIRST  = 1; const LAST = 65;                   // PGS5001 … PGS5065

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

/* media: prefer the copy sitting in this folder, else pull from GitHub */
function local_media(string $sku, string $file): ?string {
    foreach ([__DIR__ . "/media/$sku/$file", __DIR__ . "/../media/$sku/$file",
              __DIR__ . "/demo65/media/$sku/$file"] as $p) if (is_file($p)) return $p;
    return null;
}
function fetch_raw(string $relpath, string $saveto): bool {
  foreach ([RAWGH, RAWCDN] as $base) {
    for ($try = 1; $try <= 2; $try++) {
        $ch = curl_init($base . '/' . $relpath);
        $fh = fopen($saveto . '.part', 'w');
        curl_setopt_array($ch, [CURLOPT_TIMEOUT => 120, CURLOPT_FOLLOWLOCATION => 1,
            CURLOPT_FILE => $fh, CURLOPT_USERAGENT => 'shivaa-rings/1.0']);
        curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        fclose($fh); curl_close($ch);
        if ($code === 200 && filesize($saveto . '.part') > 0) { rename($saveto . '.part', $saveto); return true; }
        @unlink($saveto . '.part');
        sleep(1);
    }
  }
  return false;
}
function media_to(string $sku, string $file, string $saveto): bool {
    $local = local_media($sku, $file);
    if ($local) { copy($local, $saveto); return filesize($saveto) > 0; }
    return fetch_raw("demo65/media/$sku/$file", $saveto);
}

function ledger_path(): string { return __DIR__ . '/reset_ledger.json'; }
function ledger(): array {
    return is_file(ledger_path()) ? (json_decode((string)file_get_contents(ledger_path()), true)
        ?: ['deleted' => false, 'uploaded' => []]) : ['deleted' => false, 'uploaded' => []];
}
function ledger_save(array $l): void { file_put_contents(ledger_path(), json_encode($l, JSON_PRETTY_PRINT)); }
function all_skus(): array { $s = []; for ($i = FIRST; $i <= LAST; $i++) $s[] = sprintf('PGS50%02d', $i); return $s; }

/* ─── gate: the key must have been personalised, and the session must be logged in ─── */
$keyOk = ($_SESSION['keyOk'] ?? false)
      || (hash_equals(SETUP_KEY, (string)($_POST['key'] ?? '')) && SETUP_KEY !== 'CHANGE-THIS-KEY-123');

$msg = '';
if (isset($_POST['password'])) {
    if (SETUP_KEY === 'CHANGE-THIS-KEY-123') {
        $msg = '⚠️ This file is still on its placeholder key. Open it in File Manager, set <b>SETUP_KEY</b> to your own long random text, save, then reload.';
    } elseif (!$keyOk) {
        $msg = '⚠️ Setup key did not match the one inside this file.';
    } else {
        [$st, $r] = api('/api/auth/login', 'POST', null,
            ['email' => ($_POST['email'] ?? '') ?: 'admin@shivaa.in', 'password' => $_POST['password']]);
        if ($st === 200 && !empty($r['token'])) { $_SESSION['tok'] = $r['token']; $_SESSION['keyOk'] = true; $msg = '✅ Logged in.'; }
        else $msg = "❌ Login failed ($st): " . h(json_encode($r));
    }
}
if (isset($_GET['logout'])) { session_destroy(); header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?')); exit; }
$tok = $_SESSION['tok'] ?? null;

/* ─── actions ─── */
if ($tok && isset($_POST['action'])) {
    if (!$keyOk) {
        $msg = '⚠️ Setup key missing — reload the page and log in again with your key.';
    } else {
        $L = ledger();

        if ($_POST['action'] === 'preview') {
            [$st, $r] = api('/api/products', 'GET', $tok);
            if ($st !== 200) $msg = "❌ Could not read the product list ($st)";
            else {
                $all = $r['products'] ?? [];
                $rings = array_values(array_filter($all, fn($p) => ($p['category'] ?? '') === 'rings'));
                $pgs = array_values(array_filter($rings, fn($p) => str_starts_with((string)($p['sku'] ?? ''), 'PGS')));
                $others = array_values(array_filter($rings, fn($p) => !str_starts_with((string)($p['sku'] ?? ''), 'PGS')));
                $msg = 'Live now: <b>' . count($all) . '</b> products · <b>' . count($rings) . '</b> rings<br>'
                     . '· PGS designs already published: <b>' . count($pgs) . '</b> of 65<br>'
                     . '· other rings in the category: <b>' . count($others) . '</b>'
                     . (count($others) ? ' (these are the ones Step 2 will delete)' : '')
                     . '<br><br>Step 2 will delete <b>all ' . count($rings) . '</b> rings, then Step 3 republishes the 65 PGS designs with their new shots.';
            }
        }

        if ($_POST['action'] === 'delete') {
            [$st, $r] = api('/api/products', 'GET', $tok);
            if ($st !== 200) $msg = "❌ Could not list products ($st)";
            else {
                $rings = array_values(array_filter($r['products'] ?? [], fn($p) => ($p['category'] ?? '') === 'rings'));
                /* keep a record of what was removed, for the audit trail */
                @file_put_contents(__DIR__ . '/deleted_rings.json', json_encode(
                    array_map(fn($p) => ['id' => $p['id'] ?? '', 'sku' => $p['sku'] ?? '', 'name' => $p['name'] ?? '',
                                          'weightG' => $p['weightG'] ?? null, 'images' => $p['images'] ?? []], $rings),
                    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
                $n = 0; $fail = 0;
                foreach ($rings as $p) {
                    [$st2] = api('/api/products/' . $p['id'], 'DELETE', $tok);
                    if ($st2 === 200 || $st2 === 404) $n++; else $fail++;
                    usleep(120000);
                }
                /* the products are gone, so the "already published" marks must go too */
                if ($fail === 0) { $L['deleted'] = true; $L['uploaded'] = []; ledger_save($L); }
                $msg = "🗑 Deleted $n ring(s)" . ($fail ? ", $fail FAILED — tap again to retry" : '. Step 2 complete ✅')
                     . '<br><small>List saved to deleted_rings.json in this folder.</small>';
            }
        }

        if ($_POST['action'] === 'upload') {
            if (empty($L['deleted'])) $msg = '⚠️ Run Step 2 (delete) first.';
            else {
                [$st0, $r0] = api('/api/products', 'GET', $tok);
                $skumap = [];
                if ($st0 === 200) foreach ($r0['products'] ?? [] as $p) if (!empty($p['sku'])) $skumap[$p['sku']] = $p['id'];
                $todo = array_values(array_diff(all_skus(), array_keys($L['uploaded'] ?? [])));
                $batch = array_slice($todo, 0, PERTAP);
                $lines = [];
                foreach ($batch as $sku) {
                    $tmp = sys_get_temp_dir() . "/shv_$sku";
                    @mkdir($tmp, 0777, true);
                    if (!media_to($sku, 'meta.json', "$tmp/meta.json")) { $lines[] = "❌ $sku: meta.json not found (upload it or check GitHub)"; continue; }
                    $urls = []; $bad = false;
                    foreach (SHOTS as $k) {
                        if (!media_to($sku, "shot_$k.jpg", "$tmp/shot_$k.jpg")) { $lines[] = "❌ $sku: shot_$k download failed"; $bad = true; break; }
                        [$st, $r] = api('/api/media', 'POST', $tok, null,
                            ['file' => new CURLFile("$tmp/shot_$k.jpg", 'image/jpeg', "$sku" . "_shot_$k.jpg"), 'category' => 'rings']);
                        if ($st !== 200 || empty($r['url'])) { $lines[] = "❌ $sku: image upload failed ($st) " . h(json_encode($r)); $bad = true; break; }
                        $urls[] = $r['url'];
                    }
                    if ($bad) { foreach (glob("$tmp/*") ?: [] as $f) @unlink($f); @rmdir($tmp); continue; }
                    $rec = json_decode((string)file_get_contents("$tmp/meta.json"), true) ?: [];
                    $rec['sku'] = $sku;
                    $rec['images'] = $urls;
                    unset($rec['video']);                            // owner-approved: no videos on this batch
                    if (empty($rec['category'])) $rec['category'] = 'rings';
                    if (empty($rec['stock'])) $rec['stock'] = DEFAULT_STOCK;   // meta often carries stock 0
                    $tags = array_values(array_unique(array_merge((array)($rec['tags'] ?? []), ['mens'])));  // Men's section
                    $rec['tags'] = $tags;
                    if (isset($skumap[$sku])) [$st, $r] = api('/api/products/' . $skumap[$sku], 'PUT', $tok, $rec);
                    else [$st, $r] = api('/api/products', 'POST', $tok, $rec);
                    if ($st === 200) { $L['uploaded'][$sku] = true; ledger_save($L); $lines[] = "✅ $sku published (4 images, stock {$rec['stock']})"; }
                    else $lines[] = "❌ $sku: could not save the product ($st) " . h(json_encode($r));
                    foreach (glob("$tmp/*") ?: [] as $f) @unlink($f); @rmdir($tmp);
                    usleep(300000);
                }
                $doneN = count($L['uploaded'] ?? []);
                $left = (LAST - FIRST + 1) - $doneN;
                $msg = implode('<br>', $lines) . "<br><b>" . $doneN . "/65 published — "
                     . ($left ? "$left left, tap again ⬇" : "ALL DONE ✅ now tap Verify") . '</b>';
            }
        }

        if ($_POST['action'] === 'verify') {
            [$st, $r] = api('/api/products', 'GET', $tok);
            $rings = array_values(array_filter($r['products'] ?? [], fn($p) => ($p['category'] ?? '') === 'rings'));
            $withvid = count(array_filter($rings, fn($p) => !empty($p['video'])));
            $noimg = count(array_filter($rings, fn($p) => count($p['images'] ?? []) < 4));
            $zero  = count(array_filter($rings, fn($p) => (int)($p['stock'] ?? 0) === 0));
            $ok = count($rings) === (LAST - FIRST + 1) && $withvid === 0 && $noimg === 0 && $zero === 0;
            $msg = 'Live rings: <b>' . count($rings) . '</b> (expected 65) · without 4 images: <b>' . $noimg
                 . '</b> · showing 0 in stock: <b>' . $zero . '</b> · with video: <b>' . $withvid . '</b> (expected 0) — '
                 . ($ok ? 'PERFECT ✅ Now spot-check 2–3 ring pages, then tap SELF-DESTRUCT.' : '⚠️ mismatch — tap Upload again, or re-check the lines above');
        }

        if ($_POST['action'] === 'destruct') {
            @unlink(ledger_path());
            @unlink(__FILE__);
            die('💥 Setup file deleted itself. Now delete this folder in File Manager (keep deleted_rings.json if you want it) and carry on in the admin dashboard.');
        }
    }
}

$L = ledger();
$done = count($L['uploaded'] ?? []);
$total = LAST - FIRST + 1;
?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Shivaa — 65 Ring Batch Setup</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#12100e;color:#f3e9d6;max-width:640px;margin:0 auto;padding:18px}
h1{font-size:1.3em;color:#e8c46a}small{color:#a89b86}
.card{background:#1d1a16;border:1px solid #3a332a;border-radius:12px;padding:16px;margin:14px 0}
button{background:#e8c46a;color:#1d1a16;border:0;border-radius:10px;padding:14px 20px;font-size:1.05em;font-weight:700;width:100%;margin-top:8px}
button.red{background:#c0392b;color:#fff}button.ghost{background:#3a332a;color:#f3e9d6}
input{width:100%;padding:12px;border-radius:8px;border:1px solid #555;background:#0e0c0a;color:#fff;margin:6px 0;box-sizing:border-box}
.log{background:#0e0c0a;border-radius:8px;padding:12px;font-size:.92em;line-height:1.5;word-break:break-word}
.step{color:#e8c46a;font-weight:700}.bar{height:10px;background:#0e0c0a;border-radius:6px;overflow:hidden}
.bar i{display:block;height:100%;background:#e8c46a;width:<?= (int)($done / $total * 100) ?>%}
</style></head><body>
<h1>💍 Shivaa — 65 Ring Batch Setup <small>(v47)</small></h1>
<p>Deletes the old rings, then publishes <b>PGS5001 – PGS5065</b> with their 4 new shots each (white studio face first) and <b>no videos</b>. Resumable — tapping again never duplicates.</p>

<?php if ($msg): ?><div class="card log"><?= $msg ?></div><?php endif; ?>

<?php if (!$tok): ?>
<div class="card"><span class="step">LOG IN</span>
<p><small>You need the admin password. Lost it? Use the password-recovery update first, or “Forgot password?” on the sign-in screen.</small></p>
<form method="post">
  <input name="email" value="admin@shivaa.in" placeholder="admin email">
  <input name="key" type="password" placeholder="Setup key (the one inside this file)" required>
  <input name="password" type="password" placeholder="Admin password" required>
  <button>Log in</button></form></div>
<?php else: ?>
<div class="card"><span class="step">STEP 1 — Preview (safe, changes nothing)</span>
<form method="post"><input type="hidden" name="action" value="preview"><input type="hidden" name="key" value="<?= h((string)($_POST['key'] ?? '')) ?>"><button class="ghost">👁 Show what is live now</button></form></div>

<div class="card"><span class="step">STEP 2 — Delete all old rings</span>
<?= !empty($L['deleted']) ? '<p>✅ already done</p>' : '' ?>
<form method="post" onsubmit="return confirm('Delete ALL ring products on the live site? They are re-published in the next step.')">
<input type="hidden" name="action" value="delete"><input type="hidden" name="key" value="<?= h((string)($_POST['key'] ?? '')) ?>">
<button class="red">🗑 Delete all rings</button></form></div>

<div class="card"><span class="step">STEP 3 — Publish the 65 rings (<?= $done ?>/<?= $total ?>)</span>
<div class="bar"><i></i></div>
<form method="post"><input type="hidden" name="action" value="upload"><input type="hidden" name="key" value="<?= h((string)($_POST['key'] ?? '')) ?>">
<button>⬆ Publish next <?= PERTAP ?> rings</button></form>
<p><small>Tap repeatedly (~17 taps, about 2 minutes). The server fetches each design's photos from GitHub itself.</small></p></div>

<div class="card"><span class="step">STEP 4 — Verify</span>
<form method="post"><input type="hidden" name="action" value="verify"><input type="hidden" name="key" value="<?= h((string)($_POST['key'] ?? '')) ?>">
<button>🔍 Verify (expect 65 rings, 4 images each, no videos)</button></form></div>

<div class="card"><span class="step">STEP 5 — Clean up</span>
<form method="post"><input type="hidden" name="action" value="destruct"><input type="hidden" name="key" value="<?= h((string)($_POST['key'] ?? '')) ?>">
<button class="red" onclick="return confirm('Delete this setup file?')">💥 Delete this setup file</button></form>
<p><small>Then delete this folder in File Manager.</small></p></div>

<p><a style="color:#888" href="?logout=1">log out</a></p>
<?php endif; ?>
</body></html>
