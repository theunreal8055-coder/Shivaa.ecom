<?php
/**
 * Shivaa v43e — ONE-CLICK AUTO PATCH
 * ----------------------------------
 * 1) Upload THIS file to the SAME FOLDER where your Shivaa index.html lives
 *    (usually public_html/ or public_html/cms/ — wherever your site opens from)
 * 2) Visit the file in your browser: https://YOURSITE.com/v43e-patch.php
 *    (or https://YOURSITE.com/cms/v43e-patch.php if you put it in cms/)
 * 3) Wait for all files to show "OK", then DELETE THIS FILE from the server.
 *    Your old files are backed up automatically into backup-v43-<timestamp>/.
 */
header('Content-Type: text/plain; charset=utf-8');
set_time_limit(180);
error_reporting(E_ALL); ini_set('display_errors', 1);

$REPO   = 'theunreal8055-coder/Shivaa.ecom';
$BRANCH = 'arena/01a079be-shivaa-ecom';
$FILES  = [
    'index.html',
    'api.php',
    'js/app.js',
    'js/hallmark.js',
    'css/home-v43.css',
    'css/hallmark-v43.css',
    'css/perf-fix.css',
    'data/db.json',
];

echo "╔══════════════════════════════════════════╗\n";
echo "║   SHIVAA v43e — AUTO PATCH               ║\n";
echo "╚══════════════════════════════════════════╝\n\n";
echo "Folder: ".__DIR__."\n\n";

// Auto-detect: if we're not in the right folder (no index.html here but
// there is a cms/ subfolder with index.html), chdir into cms/ automatically.
if (!file_exists(__DIR__.'/index.html') && is_dir(__DIR__.'/cms') && file_exists(__DIR__.'/cms/index.html')) {
    chdir(__DIR__.'/cms');
    echo "→ Found Shivaa in ./cms/, switching there.\n\n";
}
$ROOT = getcwd();
echo "Patching folder: $ROOT\n";

if (!file_exists($ROOT.'/index.html')) {
    echo "\n❌ ERROR: index.html not found here.\n";
    echo "Upload v43e-patch.php to the SAME FOLDER as your Shivaa index.html\n";
    echo "(public_html/ OR public_html/cms/ — whichever one opens the site).\n";
    exit(1);
}
if (!file_exists($ROOT.'/api.php') || !is_dir($ROOT.'/js') || !is_dir($ROOT.'/css')) {
    echo "\n❌ ERROR: The Shivaa CMS files (api.php, js/, css/) aren't in this folder.\n";
    echo "Make sure v43e-patch.php sits next to index.html, api.php, js/, css/, data/.\n";
    exit(1);
}

$bd = $ROOT.'/backup-v43-'.date('Ymd-His');
@mkdir($bd, 0755, true);
echo "Backup folder: $bd\n\n";

$ok = 0; $fail = 0; $errs = [];

foreach ($FILES as $rel) {
    $remote = 'cms/' . $rel;
    $target = $ROOT . '/' . $rel;
    $url    = "https://raw.githubusercontent.com/$REPO/$BRANCH/$remote";

    echo str_pad('· ' . $rel . ' ', 40, '.') . ' ';

    // Backup existing file
    if (file_exists($target)) {
        $bdir = $bd . '/' . dirname($rel);
        if (!is_dir($bdir)) @mkdir($bdir, 0755, true);
        @copy($target, $bd . '/' . $rel);
    } else {
        $tdir = dirname($target);
        if (!is_dir($tdir)) @mkdir($tdir, 0755, true);
    }

    // Download
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 40,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT      => 'Shivaa-Patch/1.0',
    ]);
    $data = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = curl_error($ch);
    curl_close($ch);

    if (!$data || $code !== 200) {
        echo "❌ FAIL  (HTTP $code $cerr)\n";
        $fail++; $errs[] = "$rel: HTTP $code";
        if (file_exists($bd . '/' . $rel)) @copy($bd . '/' . $rel, $target);
        continue;
    }

    // Sanity: JS/CSS/HTML/JSON files should be text, not an HTML 404 page
    if (strpos($data, '<!DOCTYPE html') !== false || strpos($data, '<html') === 0) {
        echo "❌ FAIL  (GitHub returned HTML, not file content)\n";
        $fail++; $errs[] = "$rel: got HTML page instead of file";
        continue;
    }

    if (file_put_contents($target, $data) === false) {
        echo "❌ FAIL  (cannot write file — check permissions)\n";
        $fail++; $errs[] = "$rel: write failed";
        continue;
    }

    echo "✓ OK  (" . number_format(strlen($data)) . " bytes)\n";
    $ok++;
}

echo "\n─────────────────────────────────────────\n";
echo "Applied : $ok files\n";
echo "Failed  : $fail files\n";
if ($errs) { echo "Errors  :\n"; foreach ($errs as $e) echo "  ! $e\n"; }

echo "\n";
if ($fail === 0) {
    echo "✅✅✅  v43e PATCH APPLIED SUCCESSFULLY  ✅✅✅\n\n";
    echo "IMPORTANT — DO THIS NOW:\n";
    echo "  1. DELETE v43e-patch.php from File Manager (security)\n";
    echo "  2. Open your website and hard-refresh:\n";
    echo "     • Laptop : Ctrl+Shift+R\n";
    echo "     • Mobile : Chrome menu (⋮) → Settings → Privacy → Clear browsing data → tick 'Cached images', press Clear, then reload\n";
    echo "\nFixes applied:\n";
    echo "  • Scroll lag / flicker / vibrating hero on mobile\n";
    echo "  • White blank board on first banner\n";
    echo "  • Page becoming unresponsive\n";
    echo "  • Hallmark page crash\n";
    echo "  • Gift Concierge auto-advance\n";
    echo "  • Gold rates pinned (24K ₹15,600 · 22K ₹14,300 · 18K ₹11,603 · Silver ₹239)\n";
    echo "\nRollback (if needed):\n";
    echo "  Your previous files are saved in:\n  $bd\n";
} else {
    echo "⚠ Patch partially applied. Check errors above.\n";
    echo "Your old files are still in $bd — copy them back if needed.\n";
}
