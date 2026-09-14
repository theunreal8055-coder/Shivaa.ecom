<?php
/* SHIVAA FULL-CATALOGUE SYNC BRIDGE (v110) — tablet/phone, no terminal.
 *
 * WHY THIS EXISTS:
 *   The master catalogue (cms/data/db.json on GitHub main — 405 products)
 *   ships as CODE, but the live server keeps its own data/db.json and the
 *   auto-sync cron is deliberately forbidden from touching it (it protects
 *   live orders). This bridge performs the ONE-TIME delivery of the full
 *   master catalogue into the live shop.
 *
 * WHAT IT DOES (owner-approved):
 *   1. Downloads the master catalogue straight from GitHub main (the server
 *      fetches it itself — public repo, no token).
 *   2. Adds every missing product and updates existing ones by SKU.
 *      Products already on the live site that are NOT in the master are
 *      KEPT UNTOUCHED (nothing is deleted here, ever).
 *   3. Copies any missing product photos from GitHub into /images (the code
 *      sync usually delivers these; this just fills gaps).
 *   4. Verifies the live shop has all 405 products with photos.
 *
 * HOW TO USE (Hostinger hPanel, in a browser on your tablet):
 *   1. File Manager → public_html → create a folder with a secret name,
 *      e.g. cat-9q4zx (pick your OWN random name).
 *   2. Upload THIS ONE FILE into that folder.
 *   3. Open https://shivaa.in/<your-folder>/catalogue_sync_bridge.php
 *   4. Enter the admin password → tap the buttons top to bottom.
 *      The product button is tapped repeatedly (~14 taps) — it resumes,
 *      never duplicates. Same for the photos button if it reports gaps.
 *   5. When Verify shows ALL 405 PRESENT: tap SELF-DESTRUCT, delete the
 *      folder in File Manager, and rotate the admin password.
 *
 * Safe: idempotent + ledger-resumable. Never deletes products. Talks only
 * to shivaa.in (its own API) and raw.githubusercontent.com / api.github.com.
 */
declare(strict_types=1);
session_start();
set_time_limit(280);
error_reporting(E_ALL); ini_set('display_errors', '1');

const BASE    = 'https://shivaa.in';
const RAWGH   = 'https://raw.githubusercontent.com/theunreal8055-coder/Shivaa.ecom/main';
const APIGH   = 'https://api.github.com/repos/theunreal8055-coder/Shivaa.ecom/commits/main';
const PROD_TAP = 30;   // products written per tap
const IMG_TAP  = 25;   // photos fetched per tap
const MIN_MASTER = 400; // refuse to sync an obviously truncated download

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES); }

/* ── network: call the shop's OWN api (loopback) ── */
function api(string $route, string $method = 'GET', ?string $tok = null, $json = null): array {
    $ch = curl_init(BASE . $route);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 90, CURLOPT_CUSTOMREQUEST => $method]);
    $hdr = [];
    if ($tok) $hdr[] = "Authorization: Bearer $tok";
    if ($json !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)); $hdr[] = 'Content-Type: application/json'; }
    if ($hdr) curl_setopt($ch, CURLOPT_HTTPHEADER, $hdr);
    $r = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($r === false) return [0, ['error' => $err]];
    return [$code, json_decode((string)$r, true) ?? []];
}

/* ── network: fetch a GitHub raw file to disk (atomically) ── */
function fetch_raw(string $url, string $saveto, int $timeout = 120): bool {
    for ($try = 1; $try <= 3; $try++) {
        $ch = curl_init($url);
        $fh = fopen($saveto . '.part', 'w');
        curl_setopt_array($ch, [CURLOPT_TIMEOUT => $timeout, CURLOPT_FOLLOWLOCATION => 1,
            CURLOPT_FILE => $fh, CURLOPT_USERAGENT => 'shivaa-catalogue-bridge/1.0']);
        curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        fclose($fh); curl_close($ch);
        if ($code === 200 && filesize($saveto . '.part') > 0) { rename($saveto . '.part', $saveto); return true; }
        @unlink($saveto . '.part');
        sleep(1);
    }
    return false;
}

function master_path(): string { return __DIR__ . '/catalogue_master.json'; }
function ledger_path(): string { return __DIR__ . '/catalogue_ledger.json'; }
function ledger(): array {
    return is_file(ledger_path())
        ? (json_decode((string)file_get_contents(ledger_path()), true) ?: ['products' => [], 'images' => []])
        : ['products' => [], 'images' => []];
}
function ledger_save(array $l): void { file_put_contents(ledger_path(), json_encode($l, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)); }

function load_master(): array {
    $m = json_decode((string)@file_get_contents(master_path()), true);
    return (is_array($m) && !empty($m['products'])) ? $m : [];
}

/* Locate public_html (the folder containing api.php). The bridge lives in a
   secret sub-folder of it, but tolerate being dropped at the web root too. */
function pubroot(): ?string {
    foreach ([__DIR__, dirname(__DIR__), dirname(dirname(__DIR__))] as $d) {
        if (is_file($d . '/api.php')) return $d;
    }
    return null;
}

/* The live API rejects writes carrying hallmark/huid/bis keys (they belong to
   the dedicated staff HUID editor), and mints id/createdAt itself. */
function clean_rec(array $b): array {
    foreach (array_keys($b) as $k) if (preg_match('/\A(?:hallmark|huid|bis)/i', (string)$k)) unset($b[$k]);
    unset($b['id'], $b['createdAt']);
    return $b;
}

function master_image_rels(array $master): array {
    $rels = [];
    foreach ($master['products'] as $p)
        foreach (($p['images'] ?? []) as $im)
            if (is_string($im) && preg_match('#\A/images/#', $im)) $rels[$im] = ltrim($im, '/');
    return $rels;
}

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

    if ($_POST['action'] === 'fetch') {
        $ok = fetch_raw(RAWGH . '/cms/data/db.json', master_path(), 180);
        $m = load_master();
        if (!$ok || !$m) { $msg = '❌ Could not download the master catalogue from GitHub. Tap again (the server retries).'; }
        elseif (count($m['products']) < MIN_MASTER) { $msg = '❌ Download looked truncated (' . count($m['products']) . ' products). Tap again.'; @unlink(master_path()); }
        else {
            $sha = 'unknown';
            $ch = curl_init(APIGH); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => 1, CURLOPT_TIMEOUT => 30, CURLOPT_USERAGENT => 'shivaa-catalogue-bridge/1.0']);
            $cj = json_decode((string)curl_exec($ch) ?: '', true); curl_close($ch);
            if (!empty($cj['sha'])) $sha = substr($cj['sha'], 0, 10) . ' (' . substr((string)($cj['commit']['committer']['date'] ?? ''), 0, 10) . ')';
            [$st, $r] = api('/api/products', 'GET', $tok);
            $live = $r['products'] ?? [];
            $skumap = []; foreach ($live as $p) if (!empty($p['sku'])) $skumap[$p['sku']] = $p['id'];
            $adds = $upds = 0;
            foreach ($m['products'] as $p) {
                if (empty($p['sku'])) continue;
                isset($skumap[$p['sku']]) ? $upds++ : $adds++;
            }
            $extras = count($live) - count(array_intersect(array_keys($skumap), array_column($m['products'], 'sku')));
            $rels = master_image_rels($m);
            $root = pubroot(); $imgHere = 0;
            if ($root) foreach ($rels as $rel) if (is_file("$root/$rel")) $imgHere++;
            $L['master_sha'] = $sha;
            $L['plan'] = ['master' => count($m['products']), 'live' => count($live), 'adds' => $adds, 'updates' => $upds,
                          'extrasKept' => max(0, $extras), 'imagesTotal' => count($rels), 'imagesHere' => $imgHere];
            ledger_save($L);
            $msg = "<b>Master catalogue downloaded.</b> GitHub version: " . h($sha) . ".<br>"
                 . "Master products: <b>" . count($m['products']) . "</b> · live now: <b>" . count($live) . "</b><br>"
                 . "➡ <b>$adds</b> new to add · <b>$upds</b> existing to refresh · <b>" . max(0, $extras) . "</b> live extras kept untouched<br>"
                 . "Photos: <b>$imgHere/" . count($rels) . "</b> already on the server" . ($imgHere < count($rels) ? ' (Step 3 will fetch the rest)' : ' ✅')
                 . ($root ? '' : '<br>⚠️ Could not locate public_html (api.php) — photo step may be unavailable.')
                 . '<br><b>Next: tap Step 2 repeatedly.</b>';
        }
    }

    if ($_POST['action'] === 'sync') {
        $m = load_master();
        if (!$m) $msg = '⚠️ Run Step 1 (download master) first.';
        else {
            [$st0, $r0] = api('/api/products', 'GET', $tok);
            if ($st0 !== 200) { $msg = "❌ Could not read live products ($st0). Tap again."; }
            else {
                $skumap = []; foreach ($r0['products'] ?? [] as $p) if (!empty($p['sku'])) $skumap[$p['sku']] = $p['id'];
                $lines = []; $done = 0; $fail = 0; $n = 0;
                foreach ($m['products'] as $p) {
                    $sku = (string)($p['sku'] ?? '');
                    if ($sku === '') continue;
                    if (isset($L['products'][$sku]) && $L['products'][$sku] === 'ok') { $done++; continue; }
                    if ($n >= PROD_TAP) continue;
                    $n++;
                    $rec = clean_rec($p);
                    if (isset($skumap[$sku])) [$st, $r] = api('/api/products/' . $skumap[$sku], 'PUT', $tok, $rec);
                    else                    [$st, $r] = api('/api/products', 'POST', $tok, $rec);
                    if ($st === 200) { $L['products'][$sku] = 'ok'; $done++; $lines[] = '✅ ' . h($sku); }
                    else { $fail++; $L['products'][$sku] = 'fail'; $lines[] = '❌ ' . h($sku) . " ($st) " . h(mb_substr((string)($r['error'] ?? json_encode($r)), 0, 160)); }
                    ledger_save($L);
                    usleep(120000);
                }
                $total = count($m['products']);
                $left = $total - $done;
                $msg = implode('<br>', array_slice($lines, -12))
                     . "<br><b>$done/$total delivered" . ($fail ? " · $fail failed this tap (re-tap retries them)" : '')
                     . ($left > 0 ? " — $left left, tap again ⬇" : ' — ALL PRODUCTS DONE ✅ now Step 3 (photos)') . '</b>';
            }
        }
    }

    if ($_POST['action'] === 'imgs') {
        $m = load_master();
        $root = pubroot();
        if (!$m) $msg = '⚠️ Run Step 1 first.';
        elseif (!$root) $msg = '❌ Could not find the public_html folder (api.php). Place this bridge inside a folder under public_html.';
        else {
            $rels = master_image_rels($m);
            $lines = []; $n = 0; $okN = 0;
            foreach ($rels as $rel) {
                $dest = "$root/$rel";
                if (is_file($dest)) continue;                 // disk presence is its own ledger
                if ($n >= IMG_TAP) continue;
                $n++;
                @mkdir(dirname($dest), 0755, true);
                if (fetch_raw(RAWGH . '/cms/' . $rel, $dest, 90)) { $okN++; if (count($lines) < 10) $lines[] = '🖼 ' . h(basename($rel)); }
                else $lines[] = '❌ photo failed: ' . h($rel);
                usleep(80000);
            }
            $here = 0; foreach ($rels as $rel) if (is_file("$root/$rel")) $here++;
            $total = count($rels);
            $msg = ($okN ? "Fetched $okN photo(s) this tap.<br>" : '') . implode('<br>', array_slice($lines, -10))
                 . "<br><b>Photos on server: $here/$total</b>"
                 . ($here < $total ? ' — tap again ⬇' : ' — ALL PHOTOS PRESENT ✅ now Step 4 (Verify)');
        }
    }

    if ($_POST['action'] === 'verify') {
        $m = load_master();
        if (!$m) { $msg = '⚠️ Run Step 1 first.'; }
        else {
            [$st, $r] = api('/api/products', 'GET', $tok);
            $live = $r['products'] ?? [];
            $liveSku = []; $byCat = [];
            foreach ($live as $p) { if (!empty($p['sku'])) $liveSku[$p['sku']] = true; $byCat[$p['category'] ?? '?'] = ($byCat[$p['category'] ?? '?'] ?? 0) + 1; }
            $expCat = []; foreach ($m['products'] as $p) $expCat[$p['category'] ?? '?'] = ($expCat[$p['category'] ?? '?'] ?? 0) + 1;
            $miss = []; foreach ($m['products'] as $p) if (empty($liveSku[$p['sku'] ?? ''])) $miss[] = $p['sku'];
            $extra = count($live) - (count($m['products']) - count($miss));
            $root = pubroot(); $rels = master_image_rels($m); $imgHere = 0;
            if ($root) foreach ($rels as $rel) if (is_file("$root/$rel")) $imgHere++;
            $rows = '';
            foreach (array_keys($expCat) as $c) {
                $exp = $expCat[$c]; $got = $byCat[$c] ?? 0;
                $rows .= "<tr><td>" . h($c) . "</td><td style='text-align:right'>$exp</td><td style='text-align:right'>"
                      . ($got >= $exp ? "✅ $got" : "❌ $got") . "</td></tr>";
            }
            $perfect = !$miss;
            $msg = '<b>Live active products: ' . count($live) . ' · master: ' . count($m['products']) . '</b><br>'
                 . 'Master SKUs present: <b>' . (count($m['products']) - count($miss)) . '/' . count($m['products']) . '</b>'
                 . ' · extra live products kept: <b>' . max(0, $extra) . '</b><br>'
                 . 'Photos present on server: <b>' . ($root ? "$imgHere/" . count($rels) : '?') . '</b><br>'
                 . '<table style="border-collapse:collapse;margin-top:8px;font-size:.9em">'
                 . '<tr><th align="left">category</th><th>master</th><th>live</th></tr>' . $rows . '</table>'
                 . ($miss ? '<br>❌ Missing SKUs (' . count($miss) . '): ' . h(implode(', ', array_slice($miss, 0, 40))) . ' — tap Step 2 again.'
                          : '<br>' . ($root && $imgHere === count($rels) ? '🎉 <b>PERFECT — all 405 products with photos are live. Tap SELF-DESTRUCT.</b>'
                                                               : '⚠️ All products live, but some photos are missing — tap Step 3.'));
        }
    }

    if ($_POST['action'] === 'destruct') {
        @unlink(master_path()); @unlink(ledger_path()); @unlink(__FILE__);
        die('💥 Bridge deleted itself. Now delete this folder in File Manager and rotate the admin password. Goodbye!');
    }
}

$L = ledger();
$plan = $L['plan'] ?? null;
$pDone = is_array($L['products'] ?? null) ? count(array_filter($L['products'], fn($v) => $v === 'ok')) : 0;
$pTotal = $plan['master'] ?? 405;
$iTotal = $plan['imagesTotal'] ?? 0;
$iDone  = $plan['imagesHere'] ?? 0;
$masterReady = (bool)load_master();
?><!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Shivaa Full-Catalogue Sync</title>
<style>
body{font-family:system-ui,sans-serif;background:#12100e;color:#f3e9d6;max-width:640px;margin:0 auto;padding:18px}
h1{font-size:1.3em;color:#e8c46a}.card{background:#1d1a16;border:1px solid #3a332a;border-radius:12px;padding:16px;margin:14px 0}
button{background:#e8c46a;color:#1d1a16;border:0;border-radius:10px;padding:14px 20px;font-size:1.05em;font-weight:700;width:100%;margin-top:8px}
button.red{background:#c0392b;color:#fff}button:disabled{opacity:.45}
input{width:100%;padding:12px;border-radius:8px;border:1px solid #555;background:#0e0c0a;color:#fff;margin:6px 0;box-sizing:border-box}
.log{background:#0e0c0a;border-radius:8px;padding:12px;font-size:.92em;line-height:1.5;word-break:break-word}
.step{color:#e8c46a;font-weight:700}.bar{height:10px;background:#0e0c0a;border-radius:6px;overflow:hidden;margin:6px 0}.bar i{display:block;height:100%;background:#e8c46a}
table{width:100%}th{color:#e8c46a;text-align:left;border-bottom:1px solid #3a332a}td,th{padding:2px 8px}
</style></head><body>
<h1>🛒 Shivaa Full-Catalogue Sync (v110)</h1>
<p>One-time delivery of the master catalogue from GitHub to the live shop. Adds/updates by SKU, <b>never deletes</b> anything already live. Resumable — re-tapping never duplicates.</p>

<?php if ($msg): ?><div class="card log"><?= $msg ?></div><?php endif; ?>

<?php if (!$tok): ?>
<div class="card"><span class="step">LOGIN</span>
<form method="post"><input name="email" value="admin@shivaa.in"><input name="password" type="password" placeholder="Admin password" required>
<button>Log in</button></form></div>
<?php else: ?>

<div class="card"><span class="step">STEP 1 — Download the master catalogue (405 products) from GitHub</span>
<?php if ($masterReady): ?><p>✅ Master downloaded<?= !empty($L['master_sha']) ? ' — GitHub version ' . h((string)$L['master_sha']) : '' ?>. Re-tap to refresh.</p><?php endif; ?>
<form method="post"><input type="hidden" name="action" value="fetch"><button>1️⃣ Download &amp; show plan</button></form></div>

<div class="card"><span class="step">STEP 2 — Deliver products (<?= $pDone ?>/<?= $pTotal ?>)</span>
<div class="bar"><i style="width:<?= (int)min(100, $pDone / max(1,$pTotal) * 100) ?>%"></i></div>
<form method="post"><input type="hidden" name="action" value="sync">
<button <?= $masterReady ? '' : 'disabled' ?>>2️⃣ Send next <?= PROD_TAP ?> products</button></form>
<p style="font-size:.85em">Tap repeatedly (~14 taps). Existing live products are kept; the <?=$plan['extrasKept'] ?? 0?> extra live item(s) not in the master stay untouched.</p></div>

<div class="card"><span class="step">STEP 3 — Fill any missing photos (<?= $iDone ?>/<?= $iTotal ?: '?' ?>)</span>
<form method="post"><input type="hidden" name="action" value="imgs">
<button <?= $masterReady ? '' : 'disabled' ?>>3️⃣ Fetch next <?= IMG_TAP ?> photos</button></form>
<p style="font-size:.85em">Usually the code sync already delivered every photo — then Verify will say so and you can skip this.</p></div>

<div class="card"><span class="step">STEP 4 — Verify the live shop</span>
<form method="post"><input type="hidden" name="action" value="verify">
<button <?= $masterReady ? '' : 'disabled' ?>>🔍 Verify (expect all 405 present)</button></form></div>

<div class="card"><span class="step">STEP 5 — Clean up</span>
<form method="post"><input type="hidden" name="action" value="destruct">
<button class="red" onclick="return confirm('Delete this bridge and its local files?')">💥 SELF-DESTRUCT</button></form>
<p style="font-size:.85em">Only after Verify is perfect. Then delete this folder in File Manager and rotate the admin password.</p></div>

<p><a style="color:#888" href="?logout=1">log out</a></p>
<?php endif; ?>
</body></html>
