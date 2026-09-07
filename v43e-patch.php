<?php
/**
 * Shivaa v43e ONE-CLICK PATCH
 * ---------------------------
 * Upload THIS single file to public_html/cms/v43e-patch.php
 * Then visit: https://shivaajewellers.com/cms/v43e-patch.php
 * It will download the v43e files from GitHub, back up the files it replaces,
 * and apply the patch automatically.
 *
 * After you see "✓ PATCH APPLIED", DELETE this file from the server.
 */
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(120);
error_reporting(E_ALL); ini_set('display_errors', 1);

$REPO = 'theunreal8055-coder/Shivaa.ecom';
$BRANCH = 'arena/01a079be-shivaa-ecom';
$FILES = [
  'index.html'            => 'cms/index.html',
  'api.php'               => 'cms/api.php',
  'js/app.js'             => 'cms/js/app.js',
  'js/hallmark.js'        => 'cms/js/hallmark.js',
  'css/home-v43.css'      => 'cms/css/home-v43.css',
  'css/hallmark-v43.css'  => 'cms/css/hallmark-v43.css',
  'css/perf-fix.css'      => 'cms/css/perf-fix.css',
  'data/db.json'          => 'cms/data/db.json',
];

echo "╔══════════════════════════════════════════════╗\n";
echo "║   SHIVAA v43e — ONE-CLICK STABLE PATCH        ║\n";
echo "╚══════════════════════════════════════════════╝\n\n";

// Determine CMS dir (same directory as this script)
$cmsDir = __DIR__;
echo "CMS directory: $cmsDir\n";
echo "Branch: $BRANCH\n\n";

// Backup dir
$backupDir = $cmsDir . '/v43e-backup-' . date('Ymd-His');
if (!mkdir($backupDir, 0755, true)) {
    echo "❌ ERROR: Could not create backup dir $backupDir\n";
    exit(1);
}
echo "📦 Backup directory: $backupDir\n\n";

$ok = 0; $fail = 0; $errors = [];

foreach ($FILES as $remote => $local) {
    // Path relative to CMS dir (strip leading cms/)
    $rel = preg_replace('#^cms/#', '', $local);
    $target = $cmsDir . '/' . $rel;
    $url = "https://raw.githubusercontent.com/$REPO/$BRANCH/$local";

    echo "· $rel … ";

    // 1. Backup existing file
    if (file_exists($target)) {
        $bdir = $backupDir . '/' . dirname($rel);
        if (!is_dir($bdir)) @mkdir($bdir, 0755, true);
        @copy($target, $backupDir . '/' . $rel);
    } else {
        // Make sure target directory exists
        $tdir = dirname($target);
        if (!is_dir($tdir)) @mkdir($tdir, 0755, true);
    }

    // 2. Download
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT => 'Shivaa-Patch/1.0',
    ]);
    $data = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if (!$data || $code !== 200) {
        echo "❌ FAIL (HTTP $code, $err)\n";
        $fail++; $errors[] = "$rel: HTTP $code $err";
        // Restore backup
        if (file_exists($backupDir . '/' . $rel)) copy($backupDir . '/' . $rel, $target);
        continue;
    }

    // 3. Write
    if (file_put_contents($target, $data) === false) {
        echo "❌ FAIL (could not write)\n";
        $fail++; $errors[] = "$rel: write failed";
        continue;
    }

    echo "✓ OK (" . number_format(strlen($data)) . " bytes)\n";
    $ok++;
}

echo "\n─────────────────────────────────────────────\n";
echo "Applied: $ok files\n";
if ($fail) { echo "Failed:  $fail files\n"; foreach($errors as $e) echo "  ! $e\n"; }
else      { echo "Errors:  none\n"; }

echo "\n";
if ($fail === 0) {
    echo "✅ v43e PATCH APPLIED SUCCESSFULLY!\n\n";
    echo "IMPORTANT NEXT STEPS:\n";
    echo "  1. DELETE THIS FILE from your server (v43e-patch.php)\n";
    echo "  2. Visit your site and hard-refresh (Ctrl+Shift+R / long-press refresh)\n";
    echo "  3. Check: homepage should be smooth, no flicker/lag/vibration\n\n";
    echo "Rollback if needed: the previous files are backed up in\n  $backupDir\n";
} else {
    echo "⚠️  Patch applied partially. Backup preserved at $backupDir\n";
}
echo "\nGold rates: 24K ₹15,600 · 22K ₹14,300 · 18K ₹11,603 · Silver ₹239\n";
