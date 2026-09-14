<?php
/* ═══════════════════════════════════════════════════════════════
   SHIVAA UNIVERSAL REPAIR + SAMPLE IMPORT — v21
   Visit ONCE, then DELETE this file + samples-payload.json.
   ═══════════════════════════════════════════════════════════════ */
error_reporting(E_ALL);
ini_set('display_errors', '0');
header('Content-Type: text/html; charset=utf-8');
$log = [];
$fail = false;

/* ── access gate ───────────────────────────────────────────────
   This script rewrites the live database, so it must never be
   runnable by an anonymous visitor. Require the admin password.
   Usage:  https://your-site/migrate-repair.php?key=ADMIN_PASSWORD
   ------------------------------------------------------------- */
(function () {
  $dbf = null;
  foreach ([__DIR__ . '/data/db.json', __DIR__ . '/public_html/data/db.json'] as $c) if (file_exists($c)) { $dbf = $c; break; }
  $supplied = (string)($_GET['key'] ?? $_POST['key'] ?? '');
  $ok = false;
  /* v83 — this gate used to allow unlimited password guesses. Throttle by
     connection: max 8 attempts / 15 min, persisted in data/ (private dir). */
  $rip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
  $rip = preg_replace('/[^0-9a-fA-F:.]+/', '', $rip);
  $tf = __DIR__ . '/data/.repair-throttle.json';
  $now = time();
  $tfh = @fopen($tf, 'c+');
  if ($tfh && flock($tfh, LOCK_EX)) {
    $tj = json_decode((string)stream_get_contents($tfh), true);
    if (!is_array($tj)) $tj = [];
    $rec = $tj[$rip] ?? ['n' => 0, 'reset' => 0];
    if (($rec['reset'] ?? 0) <= $now) { $rec = ['n' => 0, 'reset' => $now + 900]; }
    if ($supplied !== '') {
      $rec['n'] = (int)($rec['n'] ?? 0) + 1;
      $tj[$rip] = $rec;
      // garbage-collect other expired buckets, cap file growth
      foreach (array_keys($tj) as $k) if (($tj[$k]['reset'] ?? 0) <= $now) unset($tj[$k]);
      if (count($tj) > 200) $tj = array_slice($tj, -200, null, true);
      ftruncate($tfh, 0); rewind($tfh);
      fwrite($tfh, json_encode($tj)); fflush($tfh);
    }
    $lockedOut = $rec['n'] > 8;
    flock($tfh, LOCK_UN); fclose($tfh);
  } else {
    $lockedOut = false;
    if ($tfh) fclose($tfh);
  }
  if (!empty($lockedOut)) {
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(429);
    echo '<h1 style="font-family:Georgia;color:#6e1e2a;text-align:center;margin-top:80px">Too many attempts</h1>'
       . '<p style="text-align:center;font-family:Georgia">Wait 15 minutes and try again.</p>';
    exit;
  }
  if ($dbf && $supplied !== '') {
    $d = json_decode((string)file_get_contents($dbf), true);
    foreach (($d['users'] ?? []) as $u) {
      if (($u['role'] ?? '') !== 'admin') continue;
      $stored = (string)($u['passHash'] ?? '');
      if ($stored === '') continue;
      if ($stored[0] === '$') { if (password_verify($supplied, $stored)) { $ok = true; break; } }
      elseif (hash_equals($stored, hash('sha256', (string)($u['salt'] ?? '') . $supplied))) { $ok = true; break; }
    }
  }
  if (!$ok) {
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(403);
    echo '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shivaa Repair</title></head>'
       . '<body style="font-family:Georgia,serif;background:#faf6ef;color:#2b2118;padding:40px 16px;text-align:center">'
       . '<h1 style="color:#6e1e2a">&#10022; Admin key required</h1>'
       . '<p style="max-width:520px;margin:14px auto;line-height:1.6">This tool updates the live database, so it is password protected.</p>'
       . '<form method="post" style="margin-top:18px"><input type="password" name="key" placeholder="Admin password" '
       . 'style="padding:12px 16px;border:1px solid #e6d9c0;border-radius:10px;font-size:15px;min-width:260px">'
       . '<button style="padding:12px 22px;margin-left:8px;border:0;border-radius:10px;background:#6e1e2a;color:#faf6ef;font-size:15px;cursor:pointer">Run repair</button></form>'
       . '</body></html>';
    exit;
  }
})();
function say($ok, $msg) { global $log, $fail; $log[] = [$ok, $msg]; if (!$ok) $fail = true; return $ok; }
echo '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shivaa Repair</title></head>
<body style="font-family:Georgia,serif;background:#faf6ef;color:#2b2118;padding:32px 16px">
<h1 style="color:#6e1e2a;text-align:center">✦ Shivaa — Repair &amp; Import</h1>
<div style="max-width:640px;margin:16px auto;background:#fff;border:1px solid #e6d9c0;border-radius:16px;padding:22px">';
$candidates = [__DIR__ . '/data/db.json', __DIR__ . '/public_html/data/db.json', __DIR__ . '/shivaa/data/db.json', __DIR__ . '/shivaa-hostinger/data/db.json', __DIR__ . '/shivaa-live-update/data/db.json'];
$dbFile = null; $rootDir = __DIR__;
foreach ($candidates as $c) if (file_exists($c)) { $dbFile = $c; $rootDir = dirname(dirname($c)); break; }
if (!say((bool)$dbFile, $dbFile ? 'Database found' : 'data/db.json not found — extract the zip directly into public_html so this file sits next to the <b>data</b> folder')) goto done;
$raw = file_get_contents($dbFile);
$db = json_decode($raw, true);
if (!say(is_array($db), 'Database loaded (' . round(strlen($raw)/1024) . ' KB)')) goto done;
$bak = $dbFile . '.backup-' . date('Ymd-His');
say(copy($dbFile, $bak), 'Backup created');
$fixed = 0;
foreach (['products','users','orders','partners','coupons','catalogs','reviews','settlements','serviceRequests','newsletter','contactMsgs','rateAlerts','otps','pages','tokens','loginfails','bullionOrders','metalOrders','customOrders'] as $__k) if (!isset($db[$__k]) || $db[$__k] === null) { $db[$__k] = []; $fixed++; }
if (!is_array($db['bullion'] ?? null) || !isset($db['bullion']['cash'])) {
  $db['bullion'] = ['cash' => [
    'goldImport995' => ['label' => 'Imported Gold 995 — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldIndian' => ['label' => 'Indian Gold (IND) — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldRef9930' => ['label' => 'Ref. Gold Local 99.30 — CASH', 'purity' => '99.30%', 'buy' => 0, 'sell' => 0],
  ], 'updatedAt' => date('c')]; $fixed++;
}
if (!isset($db['rates']['last'])) { $db['rates']['last'] = ['t' => date('c'), 'gold24' => 11800, 'gold22' => 10800, 'gold18' => 8850, 'silver' => 95, 'source' => 'repaired']; $db['rates']['history'] = $db['rates']['history'] ?? []; $fixed++; }
if (!is_array($db['settings'] ?? null)) $db['settings'] = [];
foreach (['storeName'=>'Shivaa','phone'=>'+91 8905005921','whatsapp'=>'918905005921','email'=>'Support@shivaa.in','address'=>'Shop No. 01, Main Road, Sadar Bazaar, Jayal, Nagaur, Rajasthan — 341023','freeShipAbove'=>50000,'shippingFee'=>250,'jaipurPremium'=>55,'jaipurSilverPremium'=>3,'metalFactor'=>0.92,'finePurity'=>'99.50%'] as $__k=>$__v) if (!isset($db['settings'][$__k])) { $db['settings'][$__k] = $__v; $fixed++; }
foreach ($db['users'] as &$u) { foreach (['profile'=>[],'addresses'=>[],'wishlist'=>[],'loyaltyPoints'=>0,'role'=>'customer','createdAt'=>date('c')] as $__k=>$__v) if (!isset($u[$__k])) { $u[$__k] = $__v; $fixed++; } }
unset($u);
foreach ($db['products'] as &$pr) { foreach (['active'=>true,'stock'=>5,'images'=>['/images/products/ring-floral.jpg'],'tags'=>[],'sizes'=>[],'stoneValue'=>0,'stoneType'=>'Plain','lessWeightG'=>0,'wastagePct'=>8,'rating'=>4.7,'reviews'=>0,'createdAt'=>date('c')] as $__k=>$__v) if (!isset($pr[$__k])) { $pr[$__k] = $__v; $fixed++; } if (!isset($pr['mcScheme'])) { $pr['mcScheme']='percent'; $pr['mcValue']=13; $fixed++; } }
unset($pr);

/* ── B2B stone filters: derive stoneType / stoneColour for legacy products ── */
$stoneFilled = 0;
foreach ($db['products'] as &$pr) {
  if (!empty($pr['stoneType']) && !empty($pr['stoneColour']) && $pr['stoneType'] !== 'Plain') continue;
  if (isset($pr['_stoneBackfilled'])) continue;
  $blob = strtolower(($pr['name'] ?? '') . ' ' . implode(' ', $pr['tags'] ?? []) . ' ' . ($pr['desc'] ?? '') . ' ' . ($pr['stoneDesc'] ?? ''));
  $sv = (float)($pr['stoneValue'] ?? 0);
  $hit = function (array $ks) use ($blob) { foreach ($ks as $k) if (preg_match('/\b' . preg_quote($k, '/') . '/', $blob)) return true; return false; };
  if      ($hit(['kundan','polki','jadau']))                          { $t='Kundan/Polki';       $c='Colour'; }
  elseif  ($hit(['navratna','ruby','emerald','sapphire','manik','panna'])) { $t='Colour Stone';  $c='Colour'; }
  elseif  ($hit(['lab-grown','lab grown','labgrown']))                { $t='Lab-Grown Diamond';  $c='White';  }
  elseif  ($hit(['diamond','solitaire','hira']))                      { $t='Natural Diamond';    $c='White';  }
  elseif  ($hit(['pearl','moti']))                                    { $t='Colour Stone';       $c='White';  }
  elseif  ($hit(['cz','zircon','american diamond']))                  { $t='CZ';                 $c='White';  }
  elseif  ($hit(['meena','meenakari','enamel']))                      { $t='Plain';              $c='Colour'; }
  elseif  ($sv > 0)                                                   { $t='CZ';                 $c='White';  }
  else                                                                { $t='Plain';              $c='White';  }
  $pr['stoneType'] = $t; $pr['stoneColour'] = $c; $pr['_stoneBackfilled'] = true; $stoneFilled++;
}
unset($pr);
say(true, 'B2B stone filters backfilled — ' . $stoneFilled . ' product(s) classified');
say(true, 'Schema repaired — ' . $fixed . ' missing field(s) restored');
$payloadFile = $rootDir . '/samples-payload.json';
if (!file_exists($payloadFile)) $payloadFile = __DIR__ . '/samples-payload.json';
if (file_exists($payloadFile)) {
  $pl = json_decode(file_get_contents($payloadFile), true);
  if (say(is_array($pl), 'Sample payload loaded')) {
    $ex = []; foreach ($db['products'] as $p) $ex[$p['id']] = 1;
    $a = $s = 0;
    foreach ($pl['products'] as $p) { if (isset($ex[$p['id']])) { $s++; continue; } $db['products'][] = $p; $a++; }
    $catIds = []; foreach ($pl['catalogs'] as $c) $catIds[] = $c['id'];
    $db['catalogs'] = array_values(array_filter($db['catalogs'], fn($c) => !in_array($c['id'] ?? '', $catIds)));
    foreach ($pl['catalogs'] as $c) $db['catalogs'][] = $c;
    $exR = []; foreach ($db['reviews'] as $r) $exR[$r['id']] = 1;
    $rN = 0; foreach ($pl['reviews'] as $r) if (!isset($exR[$r['id']])) { $db['reviews'][] = $r; $rN++; }
    say(true, "<b>$a sample products imported</b>" . ($s ? " · $s already present" : '') . " · " . count($pl['catalogs']) . " catalogues · $rN reviews");
  }
} else {
  say(false, 'samples-payload.json not found next to this file — re-extract the zip so BOTH files sit in public_html.');
}
if (!$fail) {
  $json = json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  say($json !== false && file_put_contents($dbFile, $json) !== false, 'Database saved — products: ' . count($db['products']) . ' · catalogues: ' . count($db['catalogs']));
}
done:
echo '<ul style="margin:10px 0;padding-left:4px;list-style:none;font-size:14.5px;line-height:2">';
foreach ($log as $l) echo '<li>' . ($l[0] ? '✓' : '⚠️') . ' ' . $l[1] . '</li>';
echo '</ul>';
if (!$fail) echo '<p style="font-size:14px;color:#2e7d4f"><b>All fixed!</b> Now: delete <b>this file</b> and <b>samples-payload.json</b>, then hard-refresh the site (Ctrl+Shift+R).</p>';
else echo '<p style="font-size:13.5px;color:#a32638">Fix the ⚠️ item above and reload this page.</p>';
echo '<p style="font-size:12px;color:#8a7d6c">Never touches your orders or customers; timestamped backup kept in the data folder.</p></div></body></html>';
