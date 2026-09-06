<?php
/** DEV/QA ONLY. Never deploy. Use with an ISOLATED copy of cms, not the live DB.
 * php -S 0.0.0.0:8090 -t /path/to/isolated/cms qa/php_router.php
 * SHIVAA_PREVIEW_READ_ONLY=1 also blocks writes except the stateless HUID check.
 */
$root = realpath($_SERVER['DOCUMENT_ROOT']);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$readOnly = getenv('SHIVAA_PREVIEW_READ_ONLY') === '1';
if (str_starts_with($path, '/api/')) {
  $route = substr($path, 5);
  if ($readOnly && $_SERVER['REQUEST_METHOD'] !== 'GET' && !($route === 'hallmark/lookup' && $_SERVER['REQUEST_METHOD'] === 'POST')) {
    http_response_code(405); header('Content-Type: application/json');
    echo json_encode(['error' => 'Local preview is read-only.']); return;
  }
  // Do NOT let the legacy rate engine invent a refreshed price for a preview.
  // Serve the untouched snapshot with an explicit not-live source label.
  if ($route === 'rates' && ($readOnly || getenv('SHIVAA_QA_SNAPSHOT_RATES') === '1')) {
    $db = json_decode(file_get_contents($root . '/data/db.json'), true);
    $last = $db['rates']['last']; $settings = $db['settings'];
    $gp = $settings['jaipurPremium'] ?? 55; $sp = $settings['jaipurSilverPremium'] ?? 3;
    $jaipur = $db['rates']['override'] ?? [
      'gold24' => $last['gold24'] + $gp, 'gold22' => $last['gold22'] + $gp,
      'gold18' => $last['gold18'] + round($gp * .75), 'silver' => round($last['silver'] + $sp, 1),
    ];
    header('Content-Type: application/json'); header('Cache-Control: no-store');
    echo json_encode(array_merge($last, ['source' => 'repository snapshot — not live', 'jaipur' => $jaipur, 'history' => $db['rates']['history'] ?? [], 'nextUpdateIn' => null])); return;
  }
  $_GET['__route'] = $route;
  require $root . '/api.php'; return;
}
$file = realpath($root . $path);
$withinRoot = $file && str_starts_with($file, $root . '/');
// Isolated previews may symlink only these repository asset directories.
foreach (['images', 'uploads', 'docs'] as $asset) {
  $assetRoot = realpath(__DIR__ . '/../cms/' . $asset);
  if ($file && $assetRoot && str_starts_with($file, $assetRoot . '/')) $withinRoot = true;
}
if (preg_match('#(?:^|/)\.|^/(?:data|qa)/|\.(?:php|json|lock|md|log|bak|ini|sql)$#i', $path) || ($file && $file !== $root && !$withinRoot)) {
  http_response_code(404); return;
}
if ($file && is_file($file)) return false;
header('Content-Type: text/html; charset=utf-8');
$html = file_get_contents($root . '/index.html');
if ($readOnly) $html = str_replace('<body>', '<body><script>if (!location.hash) history.replaceState(null, "", "#/hallmark");</script><div role="note" style="padding:8px 16px;background:#f7eed8;text-align:center;font-size:13px">Local read-only preview · repository catalogue snapshot · not live prices or BIS verification</div>', $html);
echo $html;
