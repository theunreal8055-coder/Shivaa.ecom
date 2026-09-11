<?php
/* ═══════════════════════════════════════════════════════════════
   SHIVAA API — PHP edition (Hostinger / cPanel shared hosting)
   Same REST API as server.js, same data/db.json, zero dependencies.
   Rewrite rule (see .htaccess): /api/*  →  api.php?__route=…
   ═══════════════════════════════════════════════════════════════ */
declare(strict_types=1);
date_default_timezone_set('Asia/Kolkata');

$ROOT = __DIR__;
$DB_FILE = $ROOT . '/data/db.json';
$CAT_DIR = $ROOT . '/uploads/catalogs';
require_once __DIR__ . '/hallmark.php';
require_once __DIR__ . '/trust.php';
require_once __DIR__ . '/sms.php';   // v33 — OTP SMS delivery plug-in (no-op in demo mode)
require_once __DIR__ . '/mail.php';  // v48 — OTP by email when no SMS gateway exists

/* ───────── helpers ───────── */
function jout(int $code, $payload): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  header('X-Frame-Options: DENY');
  header('Referrer-Policy: strict-origin-when-cross-origin');
  header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function now_iso(): string { return date('c'); }
function uid(string $p = 'id'): string { return $p . '_' . bin2hex(random_bytes(6)); }
function body_json(): array {
  $raw = file_get_contents('php://input');
  $d = json_decode($raw ?: '{}', true);
  return is_array($d) ? $d : [];
}
function db_load(string $DB_FILE): array {
  for ($i = 0; $i < 5; $i++) {
    $lock = fopen($DB_FILE . '.lock', 'c');
    if (!$lock) break;
    flock($lock, LOCK_SH);
    $raw = file_get_contents($DB_FILE);
    flock($lock, LOCK_UN); fclose($lock);
    $db = json_decode((string)$raw, true);
    if (is_array($db)) return $db;
    usleep(120000);
  }
  jout(500, ['error' => 'Database file unreadable — check data/db.json exists & permissions (755/644)']);
}
function db_save(string $DB_FILE, array $db): void {
  $lock = fopen($DB_FILE . '.lock', 'c');
  if ($lock) flock($lock, LOCK_EX);
  file_put_contents($DB_FILE, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  if ($lock) { flock($lock, LOCK_UN); fclose($lock); }
}
function clampn($v, $a, $b) { return max($a, min($b, $v)); }
/* v50 hardening: per-IP hourly cap on anonymous write routes (contact /
   newsletter) so the database cannot be flooded by a script. Same shape as
   the mailed-code cap. */
function pub_rate(array &$db, string $DB_FILE, string $key, int $cap): void {
  $ip = (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?');
  $now = time();
  $hits = array_values(array_filter($db['pubRate'][$key . '|' . $ip] ?? [], fn($t) => (int)$t > $now - 3600));
  if (count($hits) >= $cap) {
    $db['pubRate'][$key . '|' . $ip] = $hits; db_save($DB_FILE, $db);
    jout(429, ['error' => 'Too many submissions from this connection — please try again in an hour.']);
  }
  $hits[] = $now; $db['pubRate'][$key . '|' . $ip] = $hits;
}

function cut500(string $s): string { return function_exists('mb_substr') ? mb_substr($s, 0, 500) : substr($s, 0, 500); }
function fetch_url(string $url, int $timeout = 4): ?array {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => $timeout,
    CURLOPT_CONNECTTIMEOUT => $timeout,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Shivaa/1.0)',
  ]);
  $raw = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  if (!$raw || $code >= 400) return null;
  $d = json_decode($raw, true);
  return is_array($d) ? $d : null;
}
/* v61 — raw (non-JSON) HTTP fetch for RSS/XML feeds */
function fetch_raw(string $url, int $timeout = 6): ?string {
  if (!function_exists('curl_init')) return null;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => $timeout,
    CURLOPT_SSL_VERIFYPEER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 2,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Shivaa/1.0)',
  ]);
  $raw = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE); curl_close($ch);
  return (!$raw || $code >= 400) ? null : (string)$raw;
}

/* v61 — bullion market news for the jeweller desk: cached RSS headlines,
   filtered to bullion/MCX stories, with curated evergreen fallback. */
function bullion_news(array &$db): array {
  $cache = $db['bullion']['newsCache'] ?? null;
  $fresh = is_array($cache) && (time() - (int)($cache['fetchedAt'] ?? 0)) < 2700;
  if ($fresh && !empty($cache['items'])) return $cache['items'];
  $items = [];
  $feeds = [
    ['u' => 'https://www.moneycontrol.com/rss/commodities.xml', 's' => 'Moneycontrol'],
    ['u' => 'https://www.livemint.com/rss/markets', 's' => 'Mint'],
    ['u' => 'https://economictimes.indiatimes.com/markets/commodities/rssfeeds/1688041442.cms', 's' => 'ET Markets'],
  ];
  $kw = ['gold', 'silver', 'bullion', 'mcx', 'comex', 'precious metal', 'rbi rate', 'duty', 'sovereign'];
  foreach ($feeds as $f) {
    $xml = @simplexml_load_string((string)fetch_raw($f['u'], 6));
    if (!$xml || empty($xml->channel->item)) continue;
    foreach ($xml->channel->item as $it) {
      $title = trim(html_entity_decode(strip_tags((string)$it->title), ENT_QUOTES));
      $link = trim((string)$it->link);
      $desc = trim(html_entity_decode(strip_tags((string)$it->description), ENT_QUOTES));
      $hay = strtolower($title . ' ' . $desc);
      $hit = false; foreach ($kw as $k) if (strpos($hay, $k) !== false) { $hit = true; break; }
      if (!$hit || $title === '' || $link === '') continue;
      $ago = '';
      if (!empty($it->pubDate)) {
        $ts = strtotime((string)$it->pubDate);
        if ($ts) { $mins = max(0, (int)floor((time() - $ts) / 60)); $ago = $mins < 60 ? $mins . 'm ago' : (int)floor($mins / 60) . 'h ago'; }
      }
      $title = function_exists('mb_substr') ? mb_substr($title, 0, 140) : substr($title, 0, 140);
      $items[] = ['title' => $title, 'source' => $f['s'], 'url' => $link, 'ago' => $ago,
        'cat' => stripos($title, 'silver') !== false ? 'Silver' : 'Gold'];
      if (count($items) >= 10) break;
    }
    if (count($items) >= 8) break;
  }
  if (!$items) {
    if (is_array($cache) && !empty($cache['items'])) return $cache['items'];
    $items = [
      ['title' => 'MCX Gold & Silver futures — today’s session', 'source' => 'MCX India', 'url' => 'https://www.mcxindia.com/market-data/spot-market-price', 'ago' => '', 'cat' => 'Gold'],
      ['title' => 'IBJA daily gold & silver indicative prices', 'source' => 'IBJA', 'url' => 'https://ibja.in/', 'ago' => '', 'cat' => 'Gold'],
      ['title' => 'RBI reference rate USD/INR', 'source' => 'RBI', 'url' => 'https://www.rbi.org.in/scripts/ReferenceRateArchive.aspx', 'ago' => '', 'cat' => 'FX'],
    ];
  }
  $db['bullion']['newsCache'] = ['fetchedAt' => time(), 'items' => array_slice($items, 0, 10)];
  return $db['bullion']['newsCache']['items'];
}

/* v58 — JSON POST with optional HTTP Basic auth (payment gateways) */
function http_post_json(string $url, array $payload, string $userPwd = '', int $timeout = 12): ?array {
  if (!function_exists('curl_init')) return null;
  $ch = curl_init($url);
  $opts = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => $timeout,
    CURLOPT_CONNECTTIMEOUT => $timeout,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Shivaa/1.0)',
  ];
  if ($userPwd !== '') $opts[CURLOPT_USERPWD] = $userPwd;
  curl_setopt_array($ch, $opts);
  $raw = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  $d = json_decode((string)$raw, true);
  return ($code >= 200 && $code < 300 && is_array($d)) ? $d : null;
}

/* v61 — generic JSON POST/GET with custom headers (Angel One SmartAPI) */
function angel_http(string $url, string $method, ?array $payload, array $headers, int $timeout = 8): array {
  $ret = ['code' => 0, 'json' => null, 'raw' => ''];
  if (!function_exists('curl_init')) return $ret;
  $ch = curl_init($url);
  $h = ['Accept: application/json', 'Content-Type: application/json'];
  foreach ($headers as $k => $v) $h[] = $k . ': ' . $v;
  $opts = [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => $timeout,
    CURLOPT_SSL_VERIFYPEER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $h,
    CURLOPT_ENCODING => '', CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 2,
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Shivaa/1.0)',
  ];
  if ($payload !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($payload);
  curl_setopt_array($ch, $opts);
  $raw = curl_exec($ch);
  $ret['code'] = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  $ret['raw'] = (string)$raw;
  $ret['json'] = json_decode((string)$raw, true);
  return $ret;
}

/* RFC 6238 TOTP (6 digits, 30 s window) from a Base32 secret — Angel One login */
function totp_now(string $base32Secret): string {
  $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  $secret = strtoupper(preg_replace('/[^A-Z2-7]/i', '', $base32Secret));
  if ($secret === '') return '';
  $bits = '';
  foreach (str_split($secret) as $c) {
    $v = strpos($alphabet, $c);
    if ($v === false) continue;
    $bits .= str_pad(decbin($v), 5, '0', STR_PAD_LEFT);
  }
  $key = '';
  foreach (str_split($bits, 8) as $byte) {
    if (strlen($byte) === 8) $key .= chr(bindec($byte));
  }
  $counter = floor(time() / 30);
  $bin = pack('N*', 0) . pack('N*', $counter);
  $hash = hash_hmac('sha1', $bin, $key, true);
  $off = ord($hash[strlen($hash) - 1]) & 0x0F;
  $num = ((ord($hash[$off]) & 0x7F) << 24) | (ord($hash[$off + 1]) << 16) | (ord($hash[$off + 2]) << 8) | ord($hash[$off + 3]);
  return str_pad((string)($num % 1000000), 6, '0', STR_PAD_LEFT);
}

/* v63 — parse an Angel instrument-master expiry ("27NOV2026" / "27NOV26"
   / "2026-11-27" / "27-Nov-2026" / "27/11/2026"). Always returns a unix
   timestamp or 0. Tries the raw field first, then an embedded ddMMMyy group
   (usually extracted from the trading symbol). */
function angel_scrip_expiry(string $e, string $sym = ''): int {
  $candidates = [trim($e)];
  if (preg_match('/(\d{1,2})[-\s]?([A-Z]{3})[-\s]?(\d{2,4})/i', $sym, $m)) {
    $candidates[] = sprintf('%02d%s%s', (int)$m[1], strtoupper($m[2]), $m[3]);
  }
  foreach ($candidates as $c) {
    if ($c === '') continue;
    foreach (['dMY', 'dMy', '!dMY', 'Y-m-d', '!Y-m-d', 'd-M-Y', 'd/m/Y', 'd-m-Y'] as $f) {
      $d = DateTime::createFromFormat($f, $c);
      $errs = DateTime::getLastErrors();
      if ($d && (!$errs || empty($errs['warning_count'])) && $d->getTimestamp() > 946684800) return $d->getTimestamp();
    }
    if (preg_match('/^(\d{1,2})([A-Z]{3})(\d{2,4})$/i', $c, $m)) {
      $yy = strlen($m[3]) === 2 ? 2000 + (int)$m[3] : (int)$m[3];
      $mo = ['JAN'=>1,'FEB'=>2,'MAR'=>3,'APR'=>4,'MAY'=>5,'JUN'=>6,'JUL'=>7,'AUG'=>8,'SEP'=>9,'OCT'=>10,'NOV'=>11,'DEC'=>12][strtoupper($m[2])] ?? 0;
      if ($mo) { $ts = strtotime(sprintf('%04d-%02d-%02d', $yy, $mo, (int)$m[1])); if ($ts) return $ts; }
    }
    $ts = strtotime($c);
    if ($ts && $ts > 946684800) return $ts;
  }
  return 0;
}

/* v63/v65 — resolve near-month MCX GOLD (1 kg, 995) & SILVER (30 kg) tokens.
   Manual token settings win; otherwise the public Angel instrument master
   is downloaded (~once per 2 days). v65 matching is symbol-driven
   (GOLDddMMMyyyy future = exact 1 kg contract; GOLDM/GUINEA/PETAL/TEN and
   SILVERM/MICRO are excluded by the symbol pattern itself), tolerates
   whitespace/format quirks in the file, and records diagnostics. */
function angel_master_fetch(string &$diag): ?string {
  $urls = [
    'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json',
    'https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json',
  ];
  foreach ($urls as $u) {
    $r = angel_http($u, 'GET', null, ['Accept' => 'application/json'], 90);
    $raw = (string)($r['raw'] ?? '');
    $diag = 'HTTP ' . $r['code'] . ' · ' . strlen($raw) . ' bytes from ' . parse_url($u, PHP_URL_HOST);
    if ($r['code'] === 200 && strlen($raw) >= 100000 && (strpos($raw, 'MCX') !== false)) return $raw;
  }
  return null;
}

function angel_tokens(array &$db): ?array {
  $s = $db['settings'] ?? [];
  $gManual = trim((string)($s['angelGoldToken'] ?? ''));
  $sManual = trim((string)($s['angelSilverToken'] ?? ''));
  if ($gManual !== '' && $sManual !== '') {
    return ['gold' => $gManual, 'silver' => $sManual, 'goldSymbol' => 'manual GOLD', 'silverSymbol' => 'manual SILVER', 'auto' => false];
  }
  $cache = is_array($db['angelTokens'] ?? null) ? $db['angelTokens'] : null;
  // each cached contract is [expiry-unix, token, trading symbol]
  $fromCache = static function (?array $c): array {
    return ['gold' => (string)($c['gold'][1] ?? ''), 'silver' => (string)($c['silver'][1] ?? ''),
      'goldExp' => (int)($c['gold'][0] ?? 0), 'silverExp' => (int)($c['silver'][0] ?? 0),
      'goldSymbol' => $c['gold'][2] ?? 'GOLD', 'silverSymbol' => $c['silver'][2] ?? 'SILVER', 'auto' => true];
  };
  $cacheFresh = static function () use ($cache): bool {
    if (!$cache || empty($cache['gold'][1]) || empty($cache['silver'][1]) || empty($cache['at'])) return false;
    $at = strtotime((string)$cache['at']);
    if (!$at || time() - $at > 2 * 86400) return false;
    foreach (['gold', 'silver'] as $m) {
      $exp = (int)($cache[$m][0] ?? 0);
      if (!$exp) $exp = angel_scrip_expiry('', (string)($cache[$m][2] ?? ''));
      if ($exp && $exp < time() + 2 * 86400) return false;   // rolls ~2 days before expiry
    }
    return true;
  };
  if ($cacheFresh()) return $fromCache($cache);

  $fail = static function (string $msg) use (&$db, $cache, $fromCache): ?array {
    // a previous resolution stays usable until the contract actually expires
    if ($cache && !empty($cache['gold'][1]) && !empty($cache['silver'][1])) return $fromCache($cache);
    $db['angelSession'] = array_merge($db['angelSession'] ?? [], ['lastError' => $msg, 'errorAt' => now_iso()]);
    return null;
  };

  $diagLine = '';
  $raw = angel_master_fetch($diagLine);
  if ($raw === null) return $fail('Could not download the Angel instrument master (' . $diagLine . ') — tokens can be entered manually for now.');

  /* raise PCRE limits — the master is tens of MB and the flat-record regex
     walks the whole string */
  @ini_set('pcre.backtrack_limit', '200000000');
  @ini_set('pcre.jit', '0');
  if (!preg_match_all('/\{[^{}]*?"exch_seg"\s*:\s*"MCX"[^{}]*?\}/', $raw, $mm) || empty($mm[0])) {
    $pe = preg_last_error();
    return $fail('Angel instrument master unparseable (regex error ' . $pe . '; ' . $diagLine . ') — tokens can be entered manually.');
  }

  /* future-symbol patterns — these alone identify the 1 kg GOLD / 30 kg
     SILVER commodity futures; options (…CE/…PE) and mini/micro contracts
     cannot match */
  $pat = [
    'GOLD'   => '/^GOLD(\d{1,2})([A-Z]{3})(\d{2,4})$/',
    'SILVER' => '/^SILVER(\d{1,2})([A-Z]{3})(\d{2,4})$/',
  ];
  $pick = ['GOLD' => null, 'SILVER' => null];
  $mcx = 0; $goldish = [];
  foreach ($mm[0] as $rec) {
    $o = json_decode($rec, true);
    if (!is_array($o)) continue;
    $mcx++;
    $name = strtoupper(trim((string)($o['name'] ?? '')));
    $sym = strtoupper(trim((string)($o['symbol'] ?? '')));
    $inst = strtoupper(trim((string)($o['instrumenttype'] ?? '')));
    if (count($goldish) < 8 && preg_match('/^(GOLD|SILVER)[A-Z0-9]*$/', $sym)) $goldish[] = $sym;
    $metal = null;
    if ($inst === '' || $inst === 'FUTCOM') {
      if ($name === 'GOLD' || $name === 'SILVER') $metal = $name;
    }
    if (!$metal) {
      foreach ($pat as $mName => $re) {
        if (preg_match($re, $sym)) {
          // reject anything with trailing symbol letters (strike/CE/PE…) and
          // anything not flagged a commodity future
          $tail = preg_replace($re, '', $sym);
          if ($tail === '' && ($inst === '' || $inst === 'FUTCOM')) { $metal = $mName; break; }
        }
      }
    }
    if (!$metal) continue;
    $exp = angel_scrip_expiry((string)($o['expiry'] ?? ''), $sym);
    if (!$exp || $exp < time() - 3 * 86400) continue;
    $tok = trim((string)($o['token'] ?? ''));
    if ($tok === '') continue;
    $cand = [$exp, $tok, $sym];
    if (!$pick[$metal] || $cand[0] < $pick[$metal][0]) $pick[$metal] = $cand;
  }
  if (!$pick['GOLD'] || !$pick['SILVER']) {
    return $fail('Near-month MCX GOLD/SILVER not found (' . $diagLine . '; ' . $mcx . ' MCX rows; e.g. '
      . implode(', ', array_slice(array_unique($goldish), 0, 6)) . ') — paste tokens manually for now.');
  }
  $db['angelTokens'] = [
    'gold' => $pick['GOLD'], 'silver' => $pick['SILVER'], 'at' => now_iso(),
    'diag' => $diagLine . '; ' . $mcx . ' MCX rows',
  ];
  try { db_save($GLOBALS['DB_FILE'], $db); } catch (Throwable $e) {}
  return $fromCache($db['angelTokens']);
}

/* v61 — official MCX futures feed via Angel One SmartAPI (free demat account).
   Fully automatic: TOTP is generated from the secret, so the daily 3:30 AM
   token expiry self-heals on the next poll. Returns null when unconfigured. */
/* v67 — official token discovery through the authenticated Search Scrip
   endpoint (same JWT session as quotes). Returns future candidates, nearest
   expiry first, separately for the 1 kg GOLD and 30 kg SILVER contracts;
   mini/micro/options cannot match the exact future-symbol pattern. */
function angel_search_candidates(array $sess, array $baseHeaders): ?array {
  $h = $baseHeaders + ['Authorization' => 'Bearer ' . $sess['jwt'], 'X-FeedToken' => $sess['feed'] ?? ''];
  $pat = ['GOLD' => '/^GOLD(\d{1,2})([A-Z]{3})(\d{2,4})$/',
          'SILVER' => '/^SILVER(\d{1,2})([A-Z]{3})(\d{2,4})$/'];
  $out = ['GOLD' => [], 'SILVER' => []];
  foreach (['GOLD', 'SILVER'] as $metal) {
    $r = angel_http('https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/searchScrip',
      'POST', ['exchange' => 'MCX', 'searchscrip' => $metal], $h, 12);
    $j = $r['json'];
    $rows = (is_array($j) && !empty($j['status']) && is_array($j['data'] ?? null)) ? $j['data'] : [];
    foreach ($rows as $row) {
      if (!is_array($row)) continue;
      $sym = strtoupper(trim((string)($row['tradingsymbol'] ?? $row['tradingSymbol'] ?? $row['symbol'] ?? '')));
      $tok = trim((string)($row['symboltoken'] ?? $row['symbolToken'] ?? $row['token'] ?? ''));
      if ($tok === '' || !preg_match($pat[$metal], $sym)) continue;
      $exp = angel_scrip_expiry('', $sym);
      if (!$exp || $exp < time() - 3 * 86400) continue;
      $out[$metal][] = ['exp' => $exp, 'token' => $tok, 'symbol' => $sym];
    }
    usort($out[$metal], fn($a, $b) => $a['exp'] <=> $b['exp']);
    $out[$metal] = array_slice($out[$metal], 0, 6);
  }
  return ($out['GOLD'] && $out['SILVER']) ? $out : null;
}

function angel_ltp(array &$db): ?array {
  $s = $db['settings'];
  if (empty($s['angelEnabled'])) return null;
  $apiKey = trim((string)($s['angelApiKey'] ?? ''));
  $client = trim((string)($s['angelClient'] ?? ''));
  $mpin = (string)($s['angelMpin'] ?? '');
  $totpSecret = trim((string)($s['angelTotpSecret'] ?? ''));
  if ($apiKey === '' || $client === '' || $mpin === '' || $totpSecret === '') return null;

  $baseHeaders = ['X-UserType' => 'USER', 'X-SourceID' => 'WEB', 'X-ClientLocalIP' => '127.0.0.1',
    'X-ClientPublicIP' => '127.0.0.1', 'X-MACAddress' => '00:00:00:00:00:00', 'X-PrivateKey' => $apiKey];

  $login = function () use (&$db, $baseHeaders, $apiKey, $client, $mpin, $totpSecret) {
    $code = totp_now($totpSecret);
    if ($code === '') return null;
    $r = angel_http('https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword',
      'POST', ['clientcode' => $client, 'password' => $mpin, 'totp' => $code], $baseHeaders, 10);
    $j = $r['json'];
    if (is_array($j) && !empty($j['status']) && !empty($j['data']['jwtToken'])) {
      $db['angelSession'] = ['jwt' => $j['data']['jwtToken'], 'feed' => $j['data']['feedToken'] ?? '',
        'at' => now_iso(), 'refresh' => $j['data']['refreshToken'] ?? ''];
      // persist immediately — the daily session must survive even if this
      // request's rate stamp is unchanged and skips the normal save path
      try { db_save($GLOBALS['DB_FILE'], $db); } catch (Throwable $e) {}
      return $db['angelSession'];
    }
    $db['angelSession'] = array_merge($db['angelSession'] ?? [], ['lastError' => $j['message'] ?? ('HTTP ' . $r['code']), 'errorAt' => now_iso()]);
    try { db_save($GLOBALS['DB_FILE'], $db); } catch (Throwable $e) {}
    return null;
  };

  $quoteTokens = function (array $sess, array $tokens) use ($baseHeaders) {
    $h = $baseHeaders + ['Authorization' => 'Bearer ' . $sess['jwt'], 'X-FeedToken' => $sess['feed'] ?? ''];
    return angel_http('https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
      'POST', ['mode' => 'LTP', 'exchangeTokens' => ['MCX' => array_values($tokens)]], $h, 10);
  };

  $sess = $db['angelSession'] ?? null;
  if (!$sess || empty($sess['jwt'])) $sess = $login();
  if (!$sess) return null;

  /* v67 — candidate contracts: Search Scrip first, instrument-master file as
     fallback. Each metal is an expiry-ordered list we probe until a token
     actually returns a live LTP, so one wrong pick can never stall the feed. */
  $cands = angel_search_candidates($sess, $baseHeaders);
  if (!$cands) {
    $tok = angel_tokens($db);
    if ($tok) {
      $cands = ['GOLD' => [['exp' => 0, 'token' => $tok['gold'], 'symbol' => $tok['goldSymbol'] ?? 'GOLD']],
                'SILVER' => [['exp' => 0, 'token' => $tok['silver'], 'symbol' => $tok['silverSymbol'] ?? 'SILVER']]];
    }
  }
  if (!$cands) {
    $db['angelSession'] = array_merge($db['angelSession'] ?? [],
      ['lastError' => 'Could not resolve MCX GOLD/SILVER contracts (Search Scrip and instrument master both unavailable) — tokens can be entered manually.', 'errorAt' => now_iso()]);
    try { db_save($GLOBALS['DB_FILE'], $db); } catch (Throwable $e) {}
    return null;
  }

  $recordFailure = function (string $msg, array $debug = []) use (&$db) {
    $db['angelSession'] = array_merge($db['angelSession'] ?? [],
      ['lastError' => $msg, 'errorAt' => now_iso(), 'debug' => $debug]);
    try { db_save($GLOBALS['DB_FILE'], $db); } catch (Throwable $e) {}
  };

  $found = [];          // metal => candidate with live ltp
  $gi = 0; $si = 0;
  $diag = ['attempts' => [], 'goldCandidates' => array_map(fn($c) => $c['symbol'] . '=' . $c['token'], $cands['GOLD']),
           'silverCandidates' => array_map(fn($c) => $c['symbol'] . '=' . $c['token'], $cands['SILVER'])];
  for ($attempt = 0; $attempt < 8; $attempt++) {
    $want = [];
    if (!isset($found['GOLD']) && isset($cands['GOLD'][$gi])) $want['GOLD'] = $cands['GOLD'][$gi];
    if (!isset($found['SILVER']) && isset($cands['SILVER'][$si])) $want['SILVER'] = $cands['SILVER'][$si];
    if (!$want) break;
    $byToken = [];
    foreach ($want as $metal => $c) $byToken[(string)$c['token']] = $metal;
    $r = $quoteTokens($sess, array_keys($byToken));
    // session rejected (daily 3:30 AM expiry) — re-login once and retry
    if ($r['code'] === 401 || $r['code'] === 400 || (is_array($r['json']) && empty($r['json']['status']) && empty($r['json']['data']))) {
      $sess = $login();
      if (!$sess) return null;
      $r = $quoteTokens($sess, array_keys($byToken));
    }
    $j = $r['json'];
    $fetched = (is_array($j) && is_array($j['data']['fetched'] ?? null)) ? $j['data']['fetched'] : [];
    $unfetched = (is_array($j) && is_array($j['data']['unfetched'] ?? null)) ? $j['data']['unfetched'] : [];
    $stepDiag = ['tokens' => array_keys($byToken), 'http' => $r['code'], 'fetched' => count($fetched),
      'rejected' => array_map(fn($u) => ($u['symbolToken'] ?? '?') . ':' . ($u['message'] ?? ($u['errorCode'] ?? 'err')), $unfetched)];
    $hitTokens = [];
    foreach ($fetched as $it) {
      $tTok = (string)($it['symbolToken'] ?? '');
      $ltp = (float)($it['ltp'] ?? 0);
      $metal = $byToken[$tTok] ?? null;
      if ($metal && $ltp > 0 && !isset($found[$metal])) { $found[$metal] = $want[$metal] + ['ltp' => $ltp]; $hitTokens[$tTok] = true; }
    }
    foreach ($want as $metal => $c) {
      if (isset($found[$metal])) continue;
      $idxKey = $metal === 'GOLD' ? 'gi' : 'si';
      $$idxKey++;   // advance this metal to its next-nearest contract
    }
    $stepDiag['note'] = $j && isset($j['message']) ? (string)$j['message'] : ('HTTP ' . $r['code']);
    $diag['attempts'][] = $stepDiag;
  }

  $goldC = $found['GOLD'] ?? null;
  $silC = $found['SILVER'] ?? null;
  if (!$goldC || !$silC) {
    $reasons = [];
    foreach ($diag['attempts'] as $a) foreach ($a['rejected'] as $rr) if ($rr) $reasons[] = $rr;
    $msg = 'Angel quote returned no live MCX price' . ($reasons ? ' — ' . implode('; ', array_slice(array_unique($reasons), 0, 4)) : ' (market may be closed)');
    $recordFailure($msg, $diag);
    return null;
  }
  $gold10g = (float)$goldC['ltp'];
  $silverKg = (float)$silC['ltp'];

  /* v68 — one FULL quote on the locked pair: the exchange's own open/high/low,
     previous-session close (real day change) and best bid/ask market depth. */
  $fullQuote = function (array $sess, array $tokens) use ($baseHeaders) {
    $h = $baseHeaders + ['Authorization' => 'Bearer ' . $sess['jwt'], 'X-FeedToken' => $sess['feed'] ?? ''];
    return angel_http('https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
      'POST', ['mode' => 'FULL', 'exchangeTokens' => ['MCX' => array_values($tokens)]], $h, 10);
  };
  $pack = static function (array $it): array {
    $depth = is_array($it['depth'] ?? null) ? $it['depth'] : [];
    $buy1 = is_array($depth['buy'][0] ?? null) ? $depth['buy'][0] : [];
    $sell1 = is_array($depth['sell'][0] ?? null) ? $depth['sell'][0] : [];
    $f = static fn($x) => (float)($x ?? 0);
    return [
      'open' => $f($it['open'] ?? 0), 'high' => $f($it['high'] ?? 0),
      'low' => $f($it['low'] ?? 0), 'close' => $f($it['close'] ?? 0),
      'atp' => $f($it['atp'] ?? ($it['averageTradePrice'] ?? 0)),
      'bid' => $f($buy1['price'] ?? 0), 'ask' => $f($sell1['price'] ?? 0),
      'bidQty' => (int)($buy1['quantity'] ?? 0), 'askQty' => (int)($sell1['quantity'] ?? 0),
      'oi' => $f($it['oi'] ?? 0),
      'vol' => $f($it['tradeVolume'] ?? ($it['volumeTradedToday'] ?? ($it['volume'] ?? 0))),
      'feedTime' => (string)($it['exchangeFeedTime'] ?? ($it['feedTime'] ?? ($it['quoteTime'] ?? ($it['lastTradeTime'] ?? '')))),
    ];
  };
  $rf = $fullQuote($sess, ['GOLD' => $goldC['token'], 'SILVER' => $silC['token']]);
  if ($rf['code'] === 401 || $rf['code'] === 400) {
    $sess2 = $login();
    if ($sess2) $rf = $fullQuote($sess2, ['GOLD' => $goldC['token'], 'SILVER' => $silC['token']]);
  }
  $fq = ['GOLD' => [], 'SILVER' => []];
  foreach ((is_array($rf['json']) ? ($rf['json']['data']['fetched'] ?? []) : []) as $it) {
    $tTok = (string)($it['symbolToken'] ?? '');
    if ($tTok === (string)$goldC['token']) $fq['GOLD'] = $pack($it);
    if ($tTok === (string)$silC['token']) $fq['SILVER'] = $pack($it);
  }
  $gq = $fq['GOLD'] + ['open' => 0, 'high' => 0, 'low' => 0, 'close' => 0, 'bid' => 0, 'ask' => 0, 'bidQty' => 0, 'askQty' => 0, 'oi' => 0, 'atp' => 0, 'vol' => 0, 'feedTime' => ''];
  $sq = $fq['SILVER'] + ['open' => 0, 'high' => 0, 'low' => 0, 'close' => 0, 'bid' => 0, 'ask' => 0, 'bidQty' => 0, 'askQty' => 0, 'oi' => 0, 'atp' => 0, 'vol' => 0, 'feedTime' => ''];
  $chg = static fn(float $ltp, float $close) => $close > 0 ? round($ltp - $close, 2) : 0;
  $pct = static fn(float $ltp, float $close) => $close > 0 ? round(($ltp - $close) / $close * 100, 2) : 0;

  if (!empty($db['angelSession']['lastError'])) {
    unset($db['angelSession']['lastError'], $db['angelSession']['errorAt'], $db['angelSession']['debug']);
  }
  // remember the working pair so the file-based fallback always has a token
  $db['angelTokens'] = [
    'gold' => [$goldC['exp'], $goldC['token'], $goldC['symbol']],
    'silver' => [$silC['exp'], $silC['token'], $silC['symbol']], 'at' => now_iso(),
  ];
  return [
    'goldPerG' => round($gold10g / 10, 2), 'silverPerG' => round($silverKg / 1000, 3),
    'goldLtp' => $gold10g, 'silverLtp' => $silverKg, 'at' => now_iso(),
    'goldToken' => $goldC['token'], 'silverToken' => $silC['token'],
    'goldSymbol' => $goldC['symbol'], 'silverSymbol' => $silC['symbol'],
    'goldOpen' => $gq['open'], 'goldHigh' => $gq['high'], 'goldLow' => $gq['low'], 'goldClose' => $gq['close'],
    'goldBid' => $gq['bid'], 'goldAsk' => $gq['ask'], 'goldBidQty' => $gq['bidQty'], 'goldAskQty' => $gq['askQty'],
    'goldOi' => $gq['oi'], 'goldAtp' => $gq['atp'], 'goldVol' => $gq['vol'], 'goldFeedTime' => $gq['feedTime'],
    'goldChg' => $chg($gold10g, $gq['close']), 'goldChgPct' => $pct($gold10g, $gq['close']),
    'silverOpen' => $sq['open'], 'silverHigh' => $sq['high'], 'silverLow' => $sq['low'], 'silverClose' => $sq['close'],
    'silverBid' => $sq['bid'], 'silverAsk' => $sq['ask'], 'silverBidQty' => $sq['bidQty'], 'silverAskQty' => $sq['askQty'],
    'silverOi' => $sq['oi'], 'silverAtp' => $sq['atp'], 'silverVol' => $sq['vol'], 'silverFeedTime' => $sq['feedTime'],
    'silverChg' => $chg($silverKg, $sq['close']), 'silverChgPct' => $pct($silverKg, $sq['close']),
    'fullQuote' => $rf['code'] === 200, 'autoTokens' => true];
}

/* v71 — build the rates_refresh mcx pack from a recent tick cache, so the
   10-minute refresh never repeats the Search-Scrip probe pipeline (which
   would collide with the 1 rps tick stream). Returns null when no fresh
   tick exists (caller then falls back to the full angel_ltp() pipeline). */
function angel_mcx_from_tick(array $db, int $maxAgeSec = 120): ?array {
  $cacheFile = $GLOBALS['ROOT'] . '/data/.angel-tick.json';
  if (!is_file($cacheFile)) return null;
  $t = json_decode((string)@file_get_contents($cacheFile), true);
  if (!is_array($t) || !empty($t['stale']) || (time() - filemtime($cacheFile)) > $maxAgeSec) return null;
  $g = $t['gold'] ?? null; $s = $t['silver'] ?? null;
  if (!is_array($g) || !is_array($s) || ($g['ltp'] ?? 0) <= 0 || ($s['ltp'] ?? 0) <= 0) return null;
  $pair = angel_locked_pair($db);
  $map = static function (array $q, string $m, string $tok) {
    $out = [];
    foreach (['ltp' => 'Ltp', 'bid' => 'Bid', 'ask' => 'Ask', 'open' => 'Open', 'high' => 'High',
              'low' => 'Low', 'close' => 'Close', 'chg' => 'Chg', 'chgPct' => 'ChgPct',
              'oi' => 'Oi', 'atp' => 'Atp', 'vol' => 'Vol'] as $k => $cap) {
      $out[$m . $cap] = (float)($q[$k] ?? 0);
    }
    $out[$m . 'BidQty'] = (int)($q['bidQty'] ?? 0);
    $out[$m . 'AskQty'] = (int)($q['askQty'] ?? 0);
    $out[$m . 'FeedTime'] = (string)($q['feedTime'] ?? '');
    $out[$m . 'Symbol'] = (string)($q['symbol'] ?? '');
    $out[$m . 'Token'] = $tok;
    return $out;
  };
  $out = array_merge(
    $map($g, 'gold', $pair['g'] ?? ''),
    $map($s, 'silver', $pair['s'] ?? '')
  );
  $out['goldPerG'] = round($out['goldLtp'] / 10, 2);
  $out['silverPerG'] = round($out['silverLtp'] / 1000, 3);
  $out['at'] = (string)($t['at'] ?? now_iso());
  $out['autoTokens'] = true;
  $out['fullQuote'] = true;
  return $out;
}

/* v69 — per-second bullion tick. All viewers share ONE micro-cached exchange
   quote (flock-coalesced) so the board feels real-time while the account
   stays well inside Angel's quote rate limit (1 rps post-2024 change).
   Never writes db.json during normal ticking; on contract rollover or an
   expired session it bootstraps once through the full angel_ltp() pipeline. */
function angel_locked_pair(array $db): ?array {
  $m = $db['rates']['mcx'] ?? null;
  if (is_array($m) && !empty($m['goldToken']) && !empty($m['silverToken'])) {
    return ['g' => (string)$m['goldToken'], 's' => (string)$m['silverToken'],
      'gs' => (string)($m['goldSymbol'] ?? 'GOLD'), 'ss' => (string)($m['silverSymbol'] ?? 'SILVER')];
  }
  $t = $db['angelTokens'] ?? null;
  if (is_array($t) && !empty($t['gold'][1]) && !empty($t['silver'][1])) {
    return ['g' => (string)$t['gold'][1], 's' => (string)$t['silver'][1],
      'gs' => (string)($t['gold'][2] ?? 'GOLD'), 'ss' => (string)($t['silver'][2] ?? 'SILVER')];
  }
  return null;
}
function angel_tick_from_mcx(array $m): array {
  $norm = static function (string $metal, array $m) {
    $ltp = (float)($m[$metal . 'Ltp'] ?? 0);
    $close = (float)($m[$metal . 'Close'] ?? 0);
    return [
      'symbol' => (string)($m[$metal . 'Symbol'] ?? ''),
      'ltp' => $ltp, 'bid' => (float)($m[$metal . 'Bid'] ?? 0), 'ask' => (float)($m[$metal . 'Ask'] ?? 0),
      'bidQty' => (int)($m[$metal . 'BidQty'] ?? 0), 'askQty' => (int)($m[$metal . 'AskQty'] ?? 0),
      'open' => (float)($m[$metal . 'Open'] ?? 0), 'high' => (float)($m[$metal . 'High'] ?? 0),
      'low' => (float)($m[$metal . 'Low'] ?? 0), 'close' => $close,
      'oi' => (float)($m[$metal . 'Oi'] ?? 0), 'atp' => (float)($m[$metal . 'Atp'] ?? 0),
      'vol' => (float)($m[$metal . 'Vol'] ?? 0), 'feedTime' => (string)($m[$metal . 'FeedTime'] ?? ''),
      'chg' => (float)($m[$metal . 'Chg'] ?? ($close > 0 ? round($ltp - $close, 2) : 0)),
      'chgPct' => (float)($m[$metal . 'ChgPct'] ?? ($close > 0 ? round(($ltp - $close) / $close * 100, 2) : 0)),
    ];
  };
  $g = $norm('gold', $m); $s = $norm('silver', $m);
  return ['at' => (string)($m['at'] ?? now_iso()), 'source' => 'live-mcx',
    'open' => ($g['bid'] > 0 && $g['ask'] > 0 && $s['bid'] > 0 && $s['ask'] > 0),
    'gold' => $g, 'silver' => $s, 'stale' => false];
}
function angel_tick(array &$db): array {
  $cacheFile = $GLOBALS['ROOT'] . '/data/.angel-tick.json';
  $lockFile = $GLOBALS['ROOT'] . '/data/.angel-tick.lock';
  $bootFile = $GLOBALS['ROOT'] . '/data/.angel-tick.boot';
  $readCache = static function () use ($cacheFile): ?array {
    if (!is_file($cacheFile)) return null;
    $c = json_decode((string)@file_get_contents($cacheFile), true);
    return (is_array($c) && !empty($c['at'])) ? $c : null;
  };
  $staleOut = static function (?array $c, string $why, int $delayMs) use ($cacheFile) {
    if ($c) {
      $c['open'] = $c['open'] ?? false; $c['stale'] = true; $c['error'] = $why;
      $c['delayMs'] = $delayMs; $c['servedFrom'] = 'stale';
      // keep serving the last good numbers, but don't rewrite the good cache's age
      return $c;
    }
    return ['at' => now_iso(), 'source' => 'live-mcx', 'open' => false, 'stale' => true,
      'error' => $why, 'delayMs' => $delayMs, 'gold' => null, 'silver' => null];
  };
  // v77 — 1.0 s micro-cache; sub-second age from an in-payload timestamp
  // (filemtime has 1 s resolution, so the old 1.1 s gate actually served
  // stale for 2-3 s between real exchange fetches).
  // v78 — a push relay (cms/relay) rewrites this file ~10×/second straight
  // from the official SmartStream WebSocket; serve its snapshots for 2 s.
  $ageOf = static function (?array $c): float { return $c ? microtime(true) - (float)($c['ts'] ?? 0) : 9e9; };
  if (($c = $readCache())) {
    $age = $ageOf($c);
    if ((!empty($c['relay']) && $age < 2.0) || (empty($c['relay']) && $age < 1.0)) {
      $c['servedFrom'] = !empty($c['relay']) ? 'relay-cache' : 'cache';
      $c['ageMs'] = (int)($age * 1000);
      return $c;
    }
  }
  $fp = @fopen($lockFile, 'c');
  if ($fp) flock($fp, LOCK_EX);
  try {
    if (($c = $readCache())) {
      $age = $ageOf($c);
      if ((!empty($c['relay']) && $age < 2.0) || (empty($c['relay']) && $age < 1.0)) {
        $c['servedFrom'] = !empty($c['relay']) ? 'relay-cache' : 'cache';
        return $c;   // another viewer refreshed within this window
      }
    }
    // v78 — off-box push relay (relay runs on a free/cheap Node host, not
    // this shared box): pull its latest snapshot, then behave as if written
    // locally. The shared flock already coalesces this to one pull/refresh.
    $relayUrl = trim((string)($db['settings']['angelRelayUrl'] ?? ''));
    if ($relayUrl !== '' && !preg_match('#^https?://#i', $relayUrl)) $relayUrl = '';
    if ($relayUrl !== '') {
      $rKey = trim((string)($db['settings']['angelRelayKey'] ?? ''));
      $rch = curl_init(rtrim($relayUrl, '/') . '/tick');
      curl_setopt_array($rch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 1, CURLOPT_CONNECTTIMEOUT => 1,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_HTTPHEADER => $rKey !== '' ? ['X-Relay-Key: ' . $rKey] : [],
      ]);
      $rj = json_decode((string)curl_exec($rch), true);
      $rCode = (int)curl_getinfo($rch, CURLINFO_RESPONSE_CODE);
      curl_close($rch);
      if ($rCode === 200 && is_array($rj) && !empty($rj['gold']['ltp']) && !empty($rj['silver']['ltp'])) {
        $rj['ts'] = microtime(true); $rj['relay'] = true; $rj['servedFrom'] = 'relay-http';
        @file_put_contents($cacheFile, json_encode($rj), LOCK_EX);
        return $rj;
      }
    }
    $s = $db['settings'];
    $apiKey = trim((string)($s['angelApiKey'] ?? ''));
    $pair = angel_locked_pair($db);
    $sess = is_array($db['angelSession'] ?? null) ? $db['angelSession'] : null;
    $baseHeaders = ['X-UserType' => 'USER', 'X-SourceID' => 'WEB', 'X-ClientLocalIP' => '127.0.0.1',
      'X-ClientPublicIP' => '127.0.0.1', 'X-MACAddress' => '00:00:00:00:00:00', 'X-PrivateKey' => $apiKey];
    $fullQuote = static function (array $sess, array $pair) use ($baseHeaders) {
      $h = $baseHeaders + ['Authorization' => 'Bearer ' . $sess['jwt'], 'X-FeedToken' => $sess['feed'] ?? ''];
      return angel_http('https://apiconnect.angelbroking.com/rest/secure/angelbroking/market/v1/quote/',
        'POST', ['mode' => 'FULL', 'exchangeTokens' => ['MCX' => [$pair['g'], $pair['s']]]], $h, 8);
    };
    /* v71 — the heavy bootstrap (login + Search Scrip probing + LTP probes)
       may run AT MOST once per 30 s; otherwise a rejected tick would storm
       Angel (searchScrip is itself 1 rps) and trip the account throttle. */
    $bootstrapAllowed = !is_file($bootFile) || (time() - (int)@filemtime($bootFile)) >= 30;
    $bootstrap = static function () use (&$db, $bootFile, $bootstrapAllowed): ?array {
      if (!$bootstrapAllowed) return null;
      @touch($bootFile);
      $m = angel_ltp($db);
      if (!$m) return null;
      // persist the full pack (bid/ask/H/L/chg + locked tokens) for later ticks
      $db['rates']['mcx'] = $m;
      try { db_save($GLOBALS['DB_FILE'], $db); } catch (Throwable $e) {}
      return angel_tick_from_mcx($m);
    };
    if (!$apiKey) return $staleOut($readCache(), 'Angel API key missing', 30000);
    if (!$pair || !$sess || empty($sess['jwt'])) {
      if (!$bootstrapAllowed) return $staleOut($readCache(), 'session warm-up in progress', 5000);
      $boot = $bootstrap();
      if ($boot) { $pair = angel_locked_pair($db); $sess = $db['angelSession'] ?? null; $boot['ts'] = microtime(true); @file_put_contents($cacheFile, json_encode($boot + ['servedFrom' => 'bootstrap']), LOCK_EX); return $boot; }
      return $staleOut($readCache(), 'feed offline — login/contract resolution failed', 10000);
    }
    $rf = $fullQuote($sess, $pair);
    $j = $rf['json'];
    $code = (int)$rf['code'];
    // session rejected → one re-login+reprobe (rate-limited by the 30 s gate)
    if ($code === 401 || $code === 400 || $code === 403 || $code === 429
        || (is_array($j) && empty($j['status']) && empty($j['data']))) {
      if ($code === 429 || $code === 403) return $staleOut($readCache(), 'Angel rate limit (HTTP ' . $code . ') — backing off', 5000);
      if (!$bootstrapAllowed) return $staleOut($readCache(), 'session expired — re-login queued', 5000);
      $boot = $bootstrap();
      if ($boot) { $pair = angel_locked_pair($db); $sess = $db['angelSession'] ?? null; $rf = $fullQuote($sess, $pair); $j = $rf['json']; $code = (int)$rf['code']; }
    }
    $fetched = (is_array($j) && is_array($j['data']['fetched'] ?? null)) ? $j['data']['fetched'] : [];
    $unfetched = (is_array($j) && is_array($j['data']['unfetched'] ?? null)) ? $j['data']['unfetched'] : [];
    $byTok = [];
    foreach ($fetched as $it) $byTok[(string)($it['symbolToken'] ?? '')] = $it;
    $pack = static function (?array $it, string $symbol) {
      if (!$it) return null;
      $depth = is_array($it['depth'] ?? null) ? $it['depth'] : [];
      $b1 = is_array($depth['buy'][0] ?? null) ? $depth['buy'][0] : [];
      $a1 = is_array($depth['sell'][0] ?? null) ? $depth['sell'][0] : [];
      $f = static fn($x) => (float)($x ?? 0);
      $ltp = $f($it['ltp'] ?? 0); $close = $f($it['close'] ?? 0);
      return ['symbol' => $symbol, 'ltp' => $ltp,
        'bid' => $f($b1['price'] ?? 0), 'ask' => $f($a1['price'] ?? 0),
        'bidQty' => (int)($b1['quantity'] ?? 0), 'askQty' => (int)($a1['quantity'] ?? 0),
        'open' => $f($it['open'] ?? 0), 'high' => $f($it['high'] ?? 0),
        'low' => $f($it['low'] ?? 0), 'close' => $close,
        'oi' => $f($it['oi'] ?? 0), 'atp' => $f($it['atp'] ?? ($it['averageTradePrice'] ?? 0)),
        'vol' => $f($it['tradeVolume'] ?? ($it['volumeTradedToday'] ?? ($it['volume'] ?? 0))),
        'feedTime' => (string)($it['exchangeFeedTime'] ?? ($it['feedTime'] ?? ($it['lastTradeTime'] ?? ''))),
        'chg' => $close > 0 ? round($ltp - $close, 2) : 0,
        'chgPct' => $close > 0 ? round(($ltp - $close) / $close * 100, 2) : 0];
    };
    $g = $pack($byTok[$pair['g']] ?? null, $pair['gs']);
    $sv = $pack($byTok[$pair['s']] ?? null, $pair['ss']);
    // contract rolled away (no LTP) → one rate-limited bootstrap through Search-Scrip probing
    if ((!$g || (float)$g['ltp'] <= 0) || (!$sv || (float)$sv['ltp'] <= 0)) {
      $why = 'no live quote (HTTP ' . $code . ')';
      if ($unfetched) {
        $msgs = array_map(static fn($u) => (string)($u['message'] ?? ($u['errorCode'] ?? 'token rejected')), array_slice($unfetched, 0, 2));
        if ($msgs) $why .= ' — ' . implode('; ', array_unique($msgs));
      }
      if ($bootstrapAllowed) {
        $boot = $bootstrap();
        if ($boot) { $boot['ts'] = microtime(true); $boot['servedFrom'] = 'bootstrap'; @file_put_contents($cacheFile, json_encode($boot), LOCK_EX); return $boot; }
      }
      return $staleOut($readCache(), $why, 8000);
    }
    $tick = ['at' => now_iso(), 'source' => 'live-mcx', 'http' => $code,
      'open' => ($g['bid'] > 0 && $g['ask'] > 0 && $sv['bid'] > 0 && $sv['ask'] > 0),
      'gold' => $g, 'silver' => $sv, 'stale' => false, 'error' => '', 'servedFrom' => 'fetch',
      'delayMs' => 800, 'ts' => microtime(true)];
    @file_put_contents($cacheFile, json_encode($tick), LOCK_EX);
    return $tick;
  } finally {
    if ($fp) { flock($fp, LOCK_UN); fclose($fp); }
  }
}

/* v68/v72 — international spot OHLC with several independent providers so a
   single host blocking the datacenter IP can never blank the dollar cards:
   Yahoo (two mirrors), Stooq CSV; FX additionally falls back to Frankfurter
   (ECB data). Cached 10 min. Any failure leaves the previous cache intact. */
function intl_ohlc(array &$db): array {
  $c = $db['rates']['intlOhlc'] ?? null;
  if (is_array($c) && (time() - (int)($c['fetchedAt'] ?? 0)) < 600 && (time() - (int)($c['fetchedAt'] ?? 0)) >= 0) return $c;
  $ySyms = ['gold' => 'XAUUSD=X', 'silver' => 'XAGUSD=X', 'inr' => 'INR=X'];
  $sSyms = ['gold' => 'xauusd', 'silver' => 'xagusd', 'inr' => 'usdinr'];
  $stooq = static function (string $sym): array {
    $raw = fetch_raw('https://stooq.com/q/l/?s=' . urlencode($sym) . '&f=sd2t2ohlcv&h&e=csv', 6);
    if (!$raw) return [];
    foreach (preg_split('/\r?\n/', $raw) as $ln) {
      $f = str_getcsv($ln);
      if (is_array($f) && count($f) >= 7 && is_numeric($f[3]) && is_numeric($f[4])
          && is_numeric($f[5]) && is_numeric($f[6])) {
        return ['price' => (float)$f[6], 'high' => (float)$f[4], 'low' => (float)$f[5], 'prev' => 0, 'src' => 'stooq'];
      }
    }
    return [];
  };
  $out = [];
  foreach ($ySyms as $k => $sym) {
    $meta = null;
    foreach (['query1.finance.yahoo.com', 'query2.finance.yahoo.com'] as $yh) {
      $j = fetch_url('https://' . $yh . '/v8/finance/chart/' . rawurlencode($sym) . '?range=1d&interval=5m', 5);
      $meta = is_array($j) ? ($j['chart']['result'][0]['meta'] ?? null) : null;
      if (is_array($meta) && (float)($meta['regularMarketPrice'] ?? 0) > 0) break;
    }
    if (is_array($meta) && (float)($meta['regularMarketPrice'] ?? 0) > 0) {
      $out[$k] = [
        'price' => (float)($meta['regularMarketPrice'] ?? 0),
        'high' => (float)($meta['regularMarketDayHigh'] ?? 0),
        'low' => (float)($meta['regularMarketDayLow'] ?? 0),
        'prev' => (float)($meta['chartPreviousClose'] ?? ($meta['previousClose'] ?? 0)),
        'src' => 'yahoo'];
    } else {
      $sq = $stooq($sSyms[$k]);   // CSV fallback (open/high/low/close)
      if ($sq) $out[$k] = $sq;
    }
  }
  // FX extra mirror: ECB via Frankfurter (very datacenter-friendly)
  if (empty($out['inr']['price'])) {
    $ff = fetch_url('https://api.frankfurter.app/latest?from=USD&to=INR', 6);
    if (is_array($ff) && (float)($ff['rates']['INR'] ?? 0) > 0) {
      $out['inr'] = ['price' => (float)$ff['rates']['INR'], 'high' => 0, 'low' => 0, 'prev' => 0, 'src' => 'ecb'];
    }
  }
  if ($out) { $out['fetchedAt'] = time(); $db['rates']['intlOhlc'] = $out; return $out; }
  return is_array($c) ? $c : [];
}

/* v73 — parallel external probe. Returns [key => ['code','ms','body','err']]
   in roughly the slowest-response time, not the sum. Hosts that block the
   datacenter IP fail together instead of stacking six timeouts. */
function spot_probe_multi(array $urls, int $timeout = 5): array {
  if (!function_exists('curl_multi_init')) return [];
  $mh = curl_multi_init();
  $hs = [];
  foreach ($urls as $k => $u) {
    $ch = curl_init($u);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => $timeout,
      CURLOPT_SSL_VERIFYPEER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 2,
      CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Shivaa/1.0)',
      CURLOPT_HTTPHEADER => ['Accept: application/json,text/csv,*/*'],
      CURLOPT_ENCODING => '']);
    curl_multi_add_handle($mh, $ch);
    $hs[$k] = ['ch' => $ch, 't0' => microtime(true)];
  }
  $running = null;
  do { $st = curl_multi_exec($mh, $running);
    if ($running) curl_multi_select($mh, 0.5);
  } while ($running > 0 && $st === CURLM_OK);
  $out = [];
  foreach ($hs as $k => $h) {
    $body = (string)curl_multi_getcontent($h['ch']);
    $out[$k] = ['code' => (int)curl_getinfo($h['ch'], CURLINFO_RESPONSE_CODE),
      'ms' => round((microtime(true) - $h['t0']) * 1000),
      'body' => $body, 'err' => (string)curl_error($h['ch'])];
    curl_multi_remove_handle($mh, $h['ch']); curl_close($h['ch']);
  }
  curl_multi_close($mh);
  return $out;
}

/* v73 — single source of truth for international spot. Probes every provider
   in parallel and fills gold/silver/FX legs independently, so one blocked
   host can never blank the dollar cards. jsDelivr (a static CDN carrying the
   open currency dataset incl. XAU/XAG/INR) is the guaranteed-fill floor.
   Manual owner overrides win outright. Cached 10 min. */
function spot_resolve(array &$db, bool $force = false): array {
  $cached = $db['rates']['spot'] ?? null;
  if (!$force && is_array($cached) && (time() - (int)($cached['fetchedAt'] ?? 0)) < 600) return $cached;
  $empty = static fn() => ['price' => 0.0, 'high' => 0.0, 'low' => 0.0, 'prev' => 0.0, 'pct' => 0.0, 'src' => ''];
  $legs = ['gold' => $empty(), 'silver' => $empty(), 'inr' => $empty()];
  $urls = [
    'jsd'      => 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    'jsdFast'  => 'https://fastly.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    'gxau'     => 'https://api.gold-api.com/price/XAU',
    'gxag'     => 'https://api.gold-api.com/price/XAG',
    'er'       => 'https://open.er-api.com/v6/latest/USD',
    'yGold'    => 'https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD%3DX?range=1d&interval=5m',
    'ySilver'  => 'https://query1.finance.yahoo.com/v8/finance/chart/XAGUSD%3DX?range=1d&interval=5m',
    'yInr'     => 'https://query1.finance.yahoo.com/v8/finance/chart/INR%3DX?range=1d&interval=5m',
    'stGold'   => 'https://stooq.com/q/l/?s=xauusd&f=sd2t2ohlcv&h&e=csv',
    'stSilver' => 'https://stooq.com/q/l/?s=xagusd&f=sd2t2ohlcv&h&e=csv',
    'stInr'    => 'https://stooq.com/q/l/?s=usdinr&f=sd2t2ohlcv&h&e=csv',
    'ffDev'    => 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR',
    'ffApp'    => 'https://api.frankfurter.app/latest?from=USD&to=INR',
  ];
  $p = spot_probe_multi($urls, 5);
  $diag = [];
  foreach ($p as $k => $r) {
    $diag[$k] = ['code' => $r['code'], 'ms' => $r['ms'],
      'ok' => $r['code'] >= 200 && $r['code'] < 300 && $r['body'] !== '',
      'err' => $r['err'] ?: null,
      'sample' => substr(preg_replace('/\s+/', ' ', $r['body'] ?? ''), 0, 80)];
  }
  // rank tiers: jsDelivr daily 1 · Stooq 2 · ECB 2 · exchange-rate 3 · gold-api 3 · Yahoo 4
  $offer = static function (string $leg, float $price, string $src, int $rank, float $hi = 0, float $lo = 0, float $prev = 0) use (&$legs) {
    if ($price <= 0) return;
    if ($legs[$leg]['price'] > 0 && ($legs[$leg]['rank'] ?? 0) >= $rank) return;
    $legs[$leg] = ['price' => $price, 'high' => $hi ?: $price, 'low' => $lo ?: $price, 'prev' => $prev,
      'pct' => $prev > 0 ? round(($price - $prev) / $prev * 100, 2) : 0.0, 'src' => $src, 'rank' => $rank];
  };
  // jsDelivr currency dataset (static CDN, highest firewall compatibility):
  // values are units per USD, so XAU price/oz = 1/xau. Daily snapshot = floor.
  foreach (['jsd', 'jsdFast'] as $jk) {
    $j = isset($p[$jk]) ? json_decode($p[$jk]['body'], true) : null;
    $usd = is_array($j) ? ($j['usd'] ?? null) : null;
    if (is_array($usd)) {
      if (($v = (float)($usd['xau'] ?? 0)) > 0) $offer('gold', round(1 / $v, 2), 'jsDelivr', 1);
      if (($v = (float)($usd['xag'] ?? 0)) > 0) $offer('silver', round(1 / $v, 3), 'jsDelivr', 1);
      if (($v = (float)($usd['inr'] ?? 0)) > 0) $offer('inr', round($v, 2), 'jsDelivr', 1);
    }
  }
  foreach (['stGold' => 'gold', 'stSilver' => 'silver', 'stInr' => 'inr'] as $jk => $leg) {
    foreach (preg_split('/\r?\n/', (string)($p[$jk]['body'] ?? '')) as $ln) {
      $f = str_getcsv($ln);
      if (is_array($f) && count($f) >= 7 && is_numeric($f[3]) && is_numeric($f[6])) {
        $offer($leg, (float)$f[6], 'stooq', 2, (float)$f[4], (float)$f[5], 0);
        break;
      }
    }
  }
  foreach (['ffDev', 'ffApp'] as $jk) {
    $j = isset($p[$jk]) ? json_decode($p[$jk]['body'], true) : null;
    if (is_array($j) && (float)($j['rates']['INR'] ?? 0) > 0) $offer('inr', (float)$j['rates']['INR'], 'ECB', 2);
  }
  if (isset($p['er'])) { $j = json_decode($p['er']['body'], true); if (is_array($j) && (float)($j['rates']['INR'] ?? 0) > 0) $offer('inr', (float)$j['rates']['INR'], 'exchangerate', 3); }
  foreach (['gxau' => 'gold', 'gxag' => 'silver'] as $jk => $leg) {
    $j = isset($p[$jk]) ? json_decode($p[$jk]['body'], true) : null;
    if (is_array($j) && (float)($j['price'] ?? 0) > 0) $offer($leg, (float)$j['price'], 'gold-api', 3);
  }
  foreach (['yGold' => 'gold', 'ySilver' => 'silver', 'yInr' => 'inr'] as $jk => $leg) {
    $j = isset($p[$jk]) ? json_decode($p[$jk]['body'], true) : null;
    $m = is_array($j) ? ($j['chart']['result'][0]['meta'] ?? null) : null;
    if (is_array($m) && (float)($m['regularMarketPrice'] ?? 0) > 0) {
      // Yahoo is intraday-live with day bands — top tier (rank 4)
      $pv = (float)($m['chartPreviousClose'] ?? ($m['previousClose'] ?? 0));
      $price = (float)$m['regularMarketPrice'];
      $legs[$leg] = ['price' => $price,
        'high' => (float)($m['regularMarketDayHigh'] ?? 0) ?: $price,
        'low' => (float)($m['regularMarketDayLow'] ?? 0) ?: $price,
        'prev' => $pv,
        'pct' => $pv > 0 ? round(($price - $pv) / $pv * 100, 2) : 0.0, 'src' => 'yahoo', 'rank' => 4];
    }
  }
  // manual owner overrides (absolute priority)
  $st = $db['settings'] ?? [];
  foreach (['gold' => 'manualXauUsd', 'silver' => 'manualXagUsd', 'inr' => 'manualUsdInr'] as $leg => $sk) {
    if ((float)($st[$sk] ?? 0) > 0) $legs[$leg] = ['price' => (float)$st[$sk], 'high' => 0, 'low' => 0, 'prev' => 0, 'pct' => 0, 'src' => 'manual', 'rank' => 9];
  }
  $out = array_merge($legs, ['fetchedAt' => time(), 'diag' => $diag]);
  $db['rates']['spot'] = $out;
  // keep the legacy intlOhlc cache in the same shape
  $db['rates']['intlOhlc'] = [
    'gold' => ['price' => $legs['gold']['price'], 'high' => $legs['gold']['high'], 'low' => $legs['gold']['low'], 'prev' => $legs['gold']['prev'], 'src' => $legs['gold']['src']],
    'silver' => ['price' => $legs['silver']['price'], 'high' => $legs['silver']['high'], 'low' => $legs['silver']['low'], 'prev' => $legs['silver']['prev'], 'src' => $legs['silver']['src']],
    'inr' => ['price' => $legs['inr']['price'], 'high' => $legs['inr']['high'], 'low' => $legs['inr']['low'], 'prev' => $legs['inr']['prev'], 'src' => $legs['inr']['src']],
    'fetchedAt' => time()];
  return $out;
}

/* v74–v77 — LIVE international spot, micro-cached 1.0 s (v75: 6 s → 2.5 s;
   v76: 2.5 s → 1.5 s + non-blocking lock; v77: 1.5 s → 1.0 s with sub-second
   in-payload timestamps and a two-tier probe — the fast lane hits only the
   query2 Yahoo mirror, the full fallback fan-out runs only for legs it
   missed, so provider load stays ~3 requests/refresh at a 1 s cadence).
   Yahoo near-live XAU/XAG/INR is the primary feed (intraday price + day
   H/L + previous close), gold-api and Stooq are parallel fallbacks; below
   that it walks the 10-minute resolver cache, manual owner overrides, and
   finally the MCX-implied value. Owner fine-tune offsets (spotXauAdj /
   spotXagAdj / spotInrAdj, in the quoted unit) are added last so the board
   can match the reference feed exactly. */
const SPOT_TICK_TTL = 1.0;
function spot_tick(array &$db, ?array $mcxTick = null): array {
  $cacheFile = $GLOBALS['ROOT'] . '/data/.spot-tick.json';
  $lockFile = $GLOBALS['ROOT'] . '/data/.spot-tick.lock';
  $read = static function () use ($cacheFile): ?array {
    if (!is_file($cacheFile)) return null;
    $c = json_decode((string)@file_get_contents($cacheFile), true);
    return (is_array($c) && !empty($c['at'])) ? $c : null;
  };
  // v77 — sub-second age from an in-payload timestamp (filemtime() only has
  // 1-second resolution, which made sub-2-second TTLs meaningless).
  $fresh = static function () use ($read, $cacheFile): ?array {
    $c = $read();
    if (!$c) return null;
    $age = microtime(true) - (float)($c['_ts'] ?? @filemtime($cacheFile));
    return $age < SPOT_TICK_TTL ? $c : null;
  };
  if (($c = $fresh())) { $c['servedFrom'] = 'cache'; unset($c['_ts']); return $c; }
  $fp = @fopen($lockFile, 'c');
  // v76 — non-blocking: another viewer refreshing? serve the last value now.
  if ($fp && !flock($fp, LOCK_EX | LOCK_NB)) {
    if (($c = $fresh())) { $c['servedFrom'] = 'cache-busy'; unset($c['_ts']); fclose($fp); return $c; }
    flock($fp, LOCK_EX);   // cold cache only: wait for the first refresh
  }
  try {
    if (($c = $fresh())) { $c['servedFrom'] = 'cache'; unset($c['_ts']); return $c; }
    $urls = [
      'yg' => 'https://query1.finance.yahoo.com/v8/finance/chart/XAUUSD%3DX?range=1d&interval=1m',
      'yg2' => 'https://query2.finance.yahoo.com/v8/finance/chart/XAUUSD%3DX?range=1d&interval=1m',
      'ys' => 'https://query1.finance.yahoo.com/v8/finance/chart/XAGUSD%3DX?range=1d&interval=1m',
      'ys2' => 'https://query2.finance.yahoo.com/v8/finance/chart/XAGUSD%3DX?range=1d&interval=1m',
      'yi' => 'https://query1.finance.yahoo.com/v8/finance/chart/INR%3DX?range=1d&interval=1m',
      'yi2' => 'https://query2.finance.yahoo.com/v8/finance/chart/INR%3DX?range=1d&interval=1m',
      'gg' => 'https://api.gold-api.com/price/XAU',
      'gs' => 'https://api.gold-api.com/price/XAG',
      'sg' => 'https://stooq.com/q/l/?s=xauusd&f=sd2t2ohlcv&h&e=csv',
      'ss' => 'https://stooq.com/q/l/?s=xagusd&f=sd2t2ohlcv&h&e=csv',
      'si' => 'https://stooq.com/q/l/?s=usdinr&f=sd2t2ohlcv&h&e=csv',
    ];
    $blank = static fn() => ['price' => 0, 'high' => 0, 'low' => 0, 'prev' => 0, 'pct' => 0, 'src' => ''];
    $legs = ['gold' => $blank(), 'silver' => $blank(), 'inr' => $blank()];
    $fill = static function (string $leg, float $price, string $src, int $rank, float $hi = 0, float $lo = 0, float $prev = 0) use (&$legs) {
      if ($price <= 0) return;
      if ($legs[$leg]['price'] > 0 && ($legs[$leg]['rank'] ?? 0) >= $rank) return;
      $legs[$leg] = ['price' => $price, 'high' => $hi ?: $price, 'low' => $lo ?: $price, 'prev' => $prev,
        'pct' => $prev > 0 ? round(($price - $prev) / $prev * 100, 2) : 0, 'src' => $src, 'rank' => $rank];
    };
    // v77 fast lane — query2 mirror only, ONE parallel 3-request call,
    // refilled to a true ~1 s cadence. Anything it misses triggers the
    // wider fallback fan (query1 mirrors + gold-api + Stooq).
    $p = spot_probe_multi(['yg2' => $urls['yg2'], 'ys2' => $urls['ys2'], 'yi2' => $urls['yi2']], 2);
    foreach (['yg2' => ['gold', 1], 'ys2' => ['silver', 1], 'yi2' => ['inr', 1]] as $jk => [$leg, $rank]) {
      $j = isset($p[$jk]) ? json_decode($p[$jk]['body'], true) : null;
      $m = is_array($j) ? ($j['chart']['result'][0]['meta'] ?? null) : null;
      if (is_array($m) && (float)($m['regularMarketPrice'] ?? 0) > 0) {
        $price = (float)$m['regularMarketPrice']; $pv = (float)($m['chartPreviousClose'] ?? ($m['previousClose'] ?? 0));
        $fill($leg, $price, 'Yahoo live', $rank,
          (float)($m['regularMarketDayHigh'] ?? 0), (float)($m['regularMarketDayLow'] ?? 0), $pv);
      }
    }
    if ($legs['gold']['price'] <= 0 || $legs['silver']['price'] <= 0 || $legs['inr']['price'] <= 0) {
      $fb = ['yg' => $urls['yg'], 'ys' => $urls['ys'], 'yi' => $urls['yi'],
        'gg' => $urls['gg'], 'gs' => $urls['gs'], 'sg' => $urls['sg'],
        'ss' => $urls['ss'], 'si' => $urls['si']];
      $p = array_merge(spot_probe_multi($fb, 2), $p);
      foreach (['yg' => ['gold', 2], 'ys' => ['silver', 2], 'yi' => ['inr', 2]] as $jk => [$leg, $rank]) {
        $j = isset($p[$jk]) ? json_decode($p[$jk]['body'], true) : null;
        $m = is_array($j) ? ($j['chart']['result'][0]['meta'] ?? null) : null;
        if (is_array($m) && (float)($m['regularMarketPrice'] ?? 0) > 0) {
          $price = (float)$m['regularMarketPrice']; $pv = (float)($m['chartPreviousClose'] ?? ($m['previousClose'] ?? 0));
          $fill($leg, $price, 'Yahoo live', $rank,
            (float)($m['regularMarketDayHigh'] ?? 0), (float)($m['regularMarketDayLow'] ?? 0), $pv);
        }
      }
    }
    foreach (['gg' => ['gold', 'gold-api live'], 'gs' => ['silver', 'gold-api live']] as $jk => [$leg, $name]) {
      $j = isset($p[$jk]) ? json_decode($p[$jk]['body'], true) : null;
      if (is_array($j) && (float)($j['price'] ?? 0) > 0) $fill($leg, (float)$j['price'], $name, 3);
    }
    foreach (['sg' => 'gold', 'ss' => 'silver', 'si' => 'inr'] as $jk => $leg) {
      foreach (preg_split('/\r?\n/', (string)($p[$jk]['body'] ?? '')) as $ln) {
        $f = str_getcsv($ln);
        if (is_array($f) && count($f) >= 7 && is_numeric($f[3]) && is_numeric($f[6])) {
          $fill($leg, (float)$f[6], 'Stooq live', 4, (float)$f[4], (float)$f[5], 0);
          break;
        }
      }
    }
    // walk fallbacks: 10-min resolver cache → manual override → MCX implied
    $deep = is_array($db['rates']['spot'] ?? null) ? $db['rates']['spot'] : [];
    $manual = ['gold' => (float)($db['settings']['manualXauUsd'] ?? 0),
      'silver' => (float)($db['settings']['manualXagUsd'] ?? 0),
      'inr' => (float)($db['settings']['manualUsdInr'] ?? 0)];
    foreach (['gold', 'silver', 'inr'] as $leg) {
      if ($legs[$leg]['price'] <= 0 && (float)($deep[$leg]['price'] ?? 0) > 0) {
        $d = $deep[$leg];
        $legs[$leg] = ['price' => (float)$d['price'], 'high' => (float)($d['high'] ?? 0) ?: (float)$d['price'],
          'low' => (float)($d['low'] ?? 0) ?: (float)$d['price'], 'prev' => (float)($d['prev'] ?? 0),
          'pct' => (float)($d['pct'] ?? 0), 'src' => $d['src'] ?? 'cache', 'rank' => 5];
      }
    }
    $fx = $legs['inr']['price'] ?: $manual['inr'] ?: (float)($db['rates']['last']['usdInr'] ?? 95.5);
    $gImp = (float)($db['settings']['spotImpliedGoldFactor'] ?? 1.1371);
    $sImp = (float)($db['settings']['spotImpliedSilverFactor'] ?? 1.1838);
    if ($legs['gold']['price'] <= 0 && $mcxTick && ($mcxTick['gold']['ltp'] ?? 0) > 0 && $fx > 0) {
      $legs['gold'] = ['price' => round((float)$mcxTick['gold']['ltp'] / 10 * OZ / $fx / $gImp, 2),
        'high' => 0, 'low' => 0, 'prev' => 0, 'pct' => 0, 'src' => 'MCX ~impl', 'rank' => 6];
    }
    if ($legs['silver']['price'] <= 0 && $mcxTick && ($mcxTick['silver']['ltp'] ?? 0) > 0 && $fx > 0) {
      $legs['silver'] = ['price' => round((float)$mcxTick['silver']['ltp'] / 1000 * OZ / $fx / $sImp, 3),
        'high' => 0, 'low' => 0, 'prev' => 0, 'pct' => 0, 'src' => 'MCX ~impl', 'rank' => 6];
    }
    foreach (['gold', 'silver', 'inr'] as $leg) {
      if ($legs[$leg]['price'] <= 0 && $manual[$leg] > 0) {
        $legs[$leg] = array_merge($legs[$leg], ['price' => $manual[$leg], 'src' => 'manual', 'rank' => 9]);
      }
    }
    // owner fine-tune offsets (quoted units: $/oz gold, $/oz silver, ₹ per USD)
    $adj = ['gold' => (float)($db['settings']['spotXauAdj'] ?? 0),
      'silver' => (float)($db['settings']['spotXagAdj'] ?? 0),
      'inr' => (float)($db['settings']['spotInrAdj'] ?? 0)];
    foreach ($adj as $leg => $a) {
      if ($legs[$leg]['price'] > 0 && $a != 0.0) {
        $legs[$leg]['price'] = round($legs[$leg]['price'] + $a, $leg === 'silver' ? 3 : 2);
        $legs[$leg]['src'] .= ' adj';
      }
    }
    unset($legs['gold']['rank'], $legs['silver']['rank'], $legs['inr']['rank']);
    $out = ['at' => now_iso(), 'gold' => $legs['gold'], 'silver' => $legs['silver'], 'inr' => $legs['inr'],
      'ratio' => $legs['silver']['price'] > 0 ? round($legs['gold']['price'] / $legs['silver']['price'], 1) : 0];
    $out['_ts'] = microtime(true);
    @file_put_contents($cacheFile, json_encode($out), LOCK_EX);
    unset($out['_ts']);
    return $out;
  } finally {
    if ($fp) { flock($fp, LOCK_UN); fclose($fp); }
  }
}

/* ───────── rate engine (identical math to Node) ───────── */
const PURITY_22 = 0.9167, PURITY_18 = 0.75, OZ = 31.1034768;
const BASE_GOLD = 11850.0, BASE_SILVER = 168.0;

function rates_refresh(array &$db): array {
  $last = $db['rates']['last'] ?? null;
  $gold24 = $last['gold24'] ?? BASE_GOLD;
  $silver = $last['silver'] ?? BASE_SILVER;
  $source = 'simulated';
  // v73 — one parallel resolver across all providers (gold/silver/FX)
  $spot = spot_resolve($db);
  $gLeg = $spot['gold']; $sLeg = $spot['silver']; $fxLeg = $spot['inr'];
  $gUsd = (float)$gLeg['price']; $sUsd = (float)$sLeg['price']; $inr = (float)$fxLeg['price'];
  $usdGold = $gUsd; $usdSilver = $sUsd;
  $spotSrc = ['gold' => $gLeg['src'], 'silver' => $sLeg['src'], 'fx' => $fxLeg['src']];
  $liveLegs = 0;
  if ($gUsd > 0 && $inr > 0) { $gold24 = ($gUsd * $inr) / OZ; $liveLegs++; }
  if ($sUsd > 0 && $inr > 0) { $silver = ($sUsd * $inr) / OZ; $liveLegs++; }
  if ($liveLegs < 2) {
    $gold24 = clampn($gold24 * (1 + (mt_rand(-35, 35) / 10000)), BASE_GOLD * 0.96, BASE_GOLD * 1.04);
    $silver = clampn($silver * (1 + (mt_rand(-50, 50) / 10000)), BASE_SILVER * 0.96, BASE_SILVER * 1.04);
    $source = (($last['source'] ?? '') === 'live' || ($last['source'] ?? '') === 'live-mcx') ? 'cached+sim' : 'simulated';
  } else {
    $source = 'live';
  }
  if ($inr <= 0) $inr = (float)($last['usdInr'] ?? ($db['settings']['manualUsdInr'] ?? ($db['settings']['usdInr'] ?? 95.5)));
  $gUsdHi = (float)$gLeg['high'] ?: $gUsd; $gUsdLo = (float)$gLeg['low'] ?: $gUsd;
  $sUsdHi = (float)$sLeg['high'] ?: $sUsd; $sUsdLo = (float)$sLeg['low'] ?: $sUsd;
  $fxHi = (float)$fxLeg['high'] ?: $inr; $fxLo = (float)$fxLeg['low'] ?: $inr;
  $gUsdPct = (float)$gLeg['pct']; $sUsdPct = (float)$sLeg['pct']; $fxPct = (float)$fxLeg['pct'];
  $spotImplied = false;
  /* v61 — official MCX futures (Angel One SmartAPI) override when configured.
     MCX GOLD LTP is quoted per 10 g of 995-fine; SILVER per kg. Fully
     automatic TOTP login; failures fall back to the international feed above. */
  $sess0 = $db['angelSession'] ?? null;
  $errTick = is_array($sess0) ? strtotime((string)($sess0['errorAt'] ?? '')) : false;
  $cooling = $errTick ? (time() - $errTick < 600) : false;
  if (!$cooling) {
    // v71 — reuse the live 1-second tick stream; only run the full probe
    // pipeline when no fresh tick is available (first boot / after outage)
    $mcx = angel_mcx_from_tick($db) ?: angel_ltp($db);
    if ($mcx) {
      $gold24 = $mcx['goldPerG'];
      $silver = $mcx['silverPerG'];
      $source = 'live-mcx';
      $db['rates']['mcx'] = $mcx;
      // v73 — if international providers were unreachable, the dollar cards
      // still render: derive LBMA-equivalent spot from the live future.
      if ($usdGold <= 0 || $usdSilver <= 0) {
        $gImp = (float)($db['settings']['spotImpliedGoldFactor'] ?? 1.1371);
        $sImp = (float)($db['settings']['spotImpliedSilverFactor'] ?? 1.1838);
        if ($usdGold <= 0) $usdGold = round($mcx['goldPerG'] * OZ / max(1, $inr) / $gImp, 2);
        if ($usdSilver <= 0) $usdSilver = round($mcx['silverPerG'] * OZ / max(1, $inr) / $sImp, 3);
        if (!$gUsd) { $gUsd = $usdGold; $gUsdHi = $gUsdLo = $gUsd; $spotSrc['gold'] = 'mcx-implied'; }
        if (!$sUsd) { $sUsd = $usdSilver; $sUsdHi = $sUsdLo = $sUsd; $spotSrc['silver'] = 'mcx-implied'; }
        $spotImplied = true;
      }
    }
  }
  $stamp = [
    't' => now_iso(),
    'gold24' => (int)round($gold24),
    'gold22' => (int)round($gold24 * PURITY_22),
    'gold18' => (int)round($gold24 * PURITY_18),
    'silver' => round($silver, 1),
    'usdGold' => round($usdGold, 2),
    'usdSilver' => round($usdSilver, 3),
    'usdInr' => round((float)($inr ?? $db['settings']['manualUsdInr'] ?? ($db['settings']['usdInr'] ?? 95.5)), 2),
    'usdGoldHigh' => round($gUsdHi, 2), 'usdGoldLow' => round($gUsdLo, 2), 'usdGoldPct' => $gUsdPct,
    'usdSilverHigh' => round($sUsdHi, 3), 'usdSilverLow' => round($sUsdLo, 3), 'usdSilverPct' => $sUsdPct,
    'usdInrHigh' => round($fxHi, 3), 'usdInrLow' => round($fxLo, 3), 'usdInrPct' => $fxPct,
    'spotSrc' => $spotSrc,
    'spotKind' => $spotImplied ? 'mcx-implied' : ($liveLegs >= 2 ? 'live' : 'partial'),
    'source' => $source,
  ];
  $db['rates']['last'] = $stamp;
  $db['rates']['history'][] = $stamp;
  if (count($db['rates']['history']) > 720) $db['rates']['history'] = array_slice($db['rates']['history'], -720);
  return $stamp;
}
function rates_stale(array $db): bool {
  $t = $db['rates']['last']['t'] ?? null;
  if (!$t) return true;
  return (time() - strtotime($t)) > 11 * 60;
}
function current_rates(array $db): array {
  $ov = $db['rates']['override'] ?? null;
  if ($ov) return ['gold24' => (int)$ov['gold24'], 'gold22' => (int)$ov['gold22'], 'gold18' => (int)$ov['gold18'], 'silver' => (double)$ov['silver']];
  $l = $db['rates']['last'];
  $gp = (int)($db['settings']['jaipurPremium'] ?? 55); $sp = (double)($db['settings']['jaipurSilverPremium'] ?? 3);
  return ['gold24' => (int)$l['gold24'] + $gp, 'gold22' => (int)$l['gold22'] + $gp,
          'gold18' => (int)$l['gold18'] + (int)round($gp * 0.75), 'silver' => round((double)$l['silver'] + $sp, 1)];
}
function gstin_check(string $g): array {
  $g = strtoupper(trim($g));
  if (!preg_match('#^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$#', $g)) return ['valid' => false, 'reason' => 'Format must be 15 chars, e.g. 08AABCU9603R1ZM'];
  $states = ['08'=>'Rajasthan','27'=>'Maharashtra','29'=>'Karnataka','24'=>'Gujarat','07'=>'Delhi','09'=>'UP','33'=>'Tamil Nadu','36'=>'Telangana','19'=>'West Bengal','23'=>'Madhya Pradesh','32'=>'Kerala','06'=>'Haryana','03'=>'Punjab','05'=>'Uttarakhand','30'=>'Goa','37'=>'Andhra Pradesh'];
  $state = $states[substr($g, 0, 2)] ?? null;
  if (!$state) return ['valid' => false, 'reason' => 'Unknown state code'];
  $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  $sum = 0;
  for ($i = 0; $i < 14; $i++) {
    $n = strpos($chars, $g[$i]); if ($n === false) return ['valid' => false, 'reason' => 'Illegal character'];
    $n *= ($i % 2 === 0) ? 1 : 2;
    $sum += intdiv($n, 36) + ($n % 36);
  }
  if ($g[14] !== $chars[(36 - ($sum % 36)) % 36]) return ['valid' => false, 'reason' => 'Checksum failed — please retype the GSTIN'];
  return ['valid' => true, 'state' => $state, 'pan' => substr($g, 2, 10)];
}
function compute_price(array $p, array $R): array {
  $key = $p['metal'] === 'Silver' ? 'silver' : ('gold' . str_replace('K', '', $p['purity']));
  $rate = (float)$R[$key];
  $metalValue = (int)round($rate * (float)$p['weightG']);
  $makingCharge = (int)round($p['mcScheme'] === 'percent' ? $metalValue * (float)$p['mcValue'] / 100 : ($p['mcScheme'] === 'perGram' ? (float)$p['mcValue'] * (float)$p['weightG'] : (float)$p['mcValue']));
  $stoneValue = (int)round((float)($p['stoneValue'] ?? 0));
  $subtotal = $metalValue + $makingCharge + $stoneValue;
  $gst = (int)round($subtotal * 0.03);
  return ['ratePerGram' => round($rate, 2), 'metalValue' => $metalValue, 'makingCharge' => $makingCharge,
          'stoneValue' => $stoneValue, 'subtotal' => $subtotal, 'gst' => $gst, 'total' => $subtotal + $gst];
}

/* v60 — payment ledger on an order: supports multiple part payments/advances.
   Mutates the order array and recomputes amountPaid + paymentStatus. */
function order_add_payment(array &$ord, array $pay): void {
  $pay['amount'] = (int)round((float)($pay['amount'] ?? $ord['total'] ?? 0));
  $pay['at'] = $pay['at'] ?? now_iso();
  $pay['status'] = $pay['status'] ?? 'approved';
  $ord['payments'] = $ord['payments'] ?? [];
  $ord['payments'][] = $pay;
  if ($pay['status'] === 'approved') {
    $ord['amountPaid'] = array_sum(array_map(fn($p) => $p['status'] === 'approved' ? (int)$p['amount'] : 0, $ord['payments']));
    $total = (int)($ord['total'] ?? 0);
    if ($ord['amountPaid'] >= $total && $total > 0) { $ord['paymentStatus'] = 'Paid'; $ord['paidAt'] = $ord['paidAt'] ?? now_iso(); $ord['balance'] = 0; }
    elseif ($ord['amountPaid'] > 0) { $ord['paymentStatus'] = 'Partially paid'; $ord['balance'] = max(0, $total - $ord['amountPaid']); }
  }
}

/* ───────── auth ───────── */
/* ── password hashing (bcrypt, with transparent upgrade from legacy sha256+salt) ── */
function pw_hash(string $plain): string { return password_hash($plain, PASSWORD_DEFAULT); }

/**
 * Verifies $plain against a user record. Supports both the modern
 * password_hash() format and the legacy sha256(salt.plain) scheme.
 * Sets $needsRehash when the stored credential should be upgraded.
 */
function pw_verify(array $u, string $plain, bool &$needsRehash = false): bool {
  $needsRehash = false;
  $stored = (string)($u['passHash'] ?? '');
  if ($stored === '') return false;
  // modern bcrypt/argon hashes always start with $
  if ($stored[0] === '$') {
    if (!password_verify($plain, $stored)) return false;
    $needsRehash = password_needs_rehash($stored, PASSWORD_DEFAULT);
    return true;
  }
  // legacy: sha256(salt . plain) — constant-time compare, then flag for upgrade
  $ok = hash_equals($stored, hash('sha256', (string)($u['salt'] ?? '') . $plain));
  if ($ok) $needsRehash = true;
  return $ok;
}

function issue_token(array &$db, array $user): string {
  $tk = bin2hex(random_bytes(24));
  $db['tokens'] = $db['tokens'] ?? [];
  $db['tokens'][$tk] = ['userId' => $user['id'], 'exp' => time() + 30 * 86400];
  return $tk;
}
function req_user(array $db): ?array {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('#^Bearer (\w+)$#', $h, $m)) return null;
  $tk = $db['tokens'][$m[1]] ?? null;
  if (!$tk || $tk['exp'] < time()) return null;
  foreach ($db['users'] as $u) if ($u['id'] === $tk['userId']) return $u;
  return null;
}
function pub_user(array $u): array {
  return ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'phone' => $u['phone'] ?? '',
          'role' => $u['role'], 'loyaltyPoints' => $u['loyaltyPoints'] ?? 0, 'partnerId' => $u['partnerId'] ?? null,
          'createdAt' => $u['createdAt'] ?? '', 'profile' => $u['profile'] ?? [], 'addresses' => $u['addresses'] ?? [],
          'referralCode' => $u['referralCode'] ?? null];
}
function need_admin(array $db): array {
  $u = req_user($db);
  if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
  return $u;
}

function bullion_defaults(): array {
  return ['cash' => [
    'goldImport995' => ['label' => 'Imported Gold 995 — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldIndian' => ['label' => 'Indian Gold (IND) — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldRef9930' => ['label' => 'Ref. Gold Local 99.30 — CASH', 'purity' => '99.30%', 'buy' => 0, 'sell' => 0],
  ], 'updatedAt' => now_iso()];
}
function bullion_rows(array &$db): array {
  if (!isset($db['bullion']['cash'])) $db['bullion'] = bullion_defaults();
  foreach (bullion_defaults()['cash'] as $k => $v) if (!isset($db['bullion']['cash'][$k])) $db['bullion']['cash'][$k] = $v;
  $db['bullion']['prev'] = $db['bullion']['prev'] ?? [];
  $r = $db['rates']['last'];
  $gp = (int)($db['settings']['bullionGoldPremium'] ?? 10);
  $sp = (int)($db['settings']['bullionSilverPremium'] ?? 2);
  $fine = (float)$r['gold24']; $sil = (float)$r['silver'];

  /* v57 — day's low/high band from the polling history (last 72 ticks).
     v59 fix: capture $hist via `use` — `global $hist` read an unset global (null)
     and crashed the jeweller Bullion Desk with "array_slice(): Argument #1 must be array". */
  $hist = is_array($db['rates']['history'] ?? null) ? $db['rates']['history'] : [];
  $band = static function (string $metal, float $cur) use ($hist): array {
    $vals = array_map(static fn($h) => (float)($h[$metal] ?? $cur), array_slice($hist, -72));
    if (!$vals) $vals = [$cur];
    return [(float)min($vals), (float)max($vals)];
  };
  [$gLo, $gHi] = $band('gold24', $fine);
  [$sLo, $sHi] = $band('silver', $sil);

  $goldRow = static function (string $key, string $label, string $purity, string $mode,
                              float $buyF, float $sellF, array $loHi, bool $edit = false) use ($gLo, $gHi, $fine): array {
    return ['key' => $key, 'label' => $label, 'purity' => $purity, 'mode' => $mode,
      'buy' => (int)round($buyF), 'sell' => (int)round($sellF),
      'low' => (int)round($loHi[0]), 'high' => (int)round($loHi[1]),
      'editable' => $edit, 'change' => 0];
  };
  /* v68 — uniform board model. Every row is: exchange anchor × purity factor
     + premium ± spread, with per-row calibration stored in
     bullion.rtgs (values in DISPLAY units: gold ₹/10 g, silver ₹/kg).
     Factors/anchors track the official MCX future; L/H and day-change come
     from the exchange's own FULL quote (real, not tick-to-tick synthetic). */
  $mcx = is_array($db['rates']['mcx'] ?? null) ? $db['rates']['mcx'] : null;
  $mcxOn = ($r['source'] ?? '') === 'live-mcx' && $mcx;
  // per-gram anchors + official day band (₹/g)
  if ($mcxOn) {
    $gA = (float)$mcx['goldLtp'] / 10; $sA = (float)$mcx['silverLtp'] / 1000;
    $gBandLo = (float)$mcx['goldLow'] / 10; $gBandHi = (float)$mcx['goldHigh'] / 10;
    $sBandLo = (float)$mcx['silverLow'] / 1000; $sBandHi = (float)$mcx['silverHigh'] / 1000;
    $gChgPG = (float)($mcx['goldChg'] ?? 0) / 10;
    $sChgPG = (float)($mcx['silverChg'] ?? 0) / 1000;
  } else {
    $gA = $fine; $sA = $sil;
    $gBandLo = $gLo; $gBandHi = $gHi; $sBandLo = $sLo; $sBandHi = $sHi;
    $gChgPG = null; $sChgPG = null;
  }
  /* v70 — defaults calibrated to the live physical bullion screen (all
     physical rows track the future 1:1 with a level offset; the reference
     board's identical T-change per metal confirms factor ≈ 1 for every
     physical form). Owner calibration in bullion.rtgs overrides per row.
     [key, metal, factor(MCX), factor(spot), premDisp, spreadDisp, side, label, purity, mode, editable] */
  $gp10 = $gp * 10; $spKg = $sp * 1000;
  $defs = [
    ['tdsGold9999',  'g', 1.000, 0.9999, 3680, 810, 'both', 'TDS GOLD 9999 RTGS', '9999 · ' . date('d-m'), 'RTGS', false],
    ['tdsGold995',   'g', 1.000, 0.9950, 3572, 810, 'both', 'TDS GOLD 995 IND', '995 · ' . date('d-m'), 'RTGS', false],
    ['silverChorsa', 's', 1.000, 0.9800, -1021, 0, 'sell', 'TDS SIL CHORSA', '98.00 · ' . date('d-m'), 'RTGS', false],
    ['silverPeti',   's', 1.000, 0.9990, 1510, 1790, 'both', 'TDS SIL PETI 999.9', '999.9 · ' . date('d-m'), 'RTGS', false],
    ['goldIndian',   'g', 0.995, 0.9950, 350, 200, 'both', 'REF – GOLD 99.50 INDIAN', '99.50 · ' . date('d/m'), 'CASH', true],
    ['goldRef9930',  'g', 0.993, 0.9930, 200, 200, 'both', 'REF – GOLD 99.30 LOCAL', '99.30 · ' . date('d/m'), 'CASH', true],
    ['silverKachcha','s', 1.000, 0.9400, -8220, 0, 'buy', 'REF – SIL KACHCHA DHEPA', 'Kachcha · ' . date('d-m'), 'RTGS', false],
    ['silverPetiBulk','s', 1.000, 0.9800, -8899, 4722, 'both', 'REF – SIL CHORSA 98.00', '98.00 · ' . date('d-m'), 'RTGS', false],
    ['silverGrn999', 's', 1.000, 0.9720, -2473, 2559, 'both', 'REF – SIL GRN 999', '999 · ' . date('d-m'), 'RTGS', false],
  ];
  $rtgsOv = is_array($db['bullion']['rtgs'] ?? null) ? $db['bullion']['rtgs'] : [];
  $rtgsCfg = [];   // effective calibration, echoed for the admin editor (display units)
  $facMap = [];    // key => factor, for spot-mode tick changes
  $rows = [];
  foreach ($defs as $d) {
    [$key, $metal, $fM, $fS, $dPrem, $dSpread, $dSide, $label, $pur, $mode, $editable] = $d;
    $o = is_array($rtgsOv[$key] ?? null) ? $rtgsOv[$key] : [];
    $factor = (float)($o['factor'] ?? ($mcxOn ? $fM : $fS));
    $premD = (float)($o['prem'] ?? $dPrem);
    $spreadD = (float)($o['spread'] ?? $dSpread);
    $side = (string)($o['side'] ?? $dSide);
    $rtgsCfg[$key] = ['factor' => round($factor, 4), 'prem' => round($premD, 1),
      'spread' => round($spreadD, 1), 'side' => $side, 'metal' => $metal];
    if ($side === 'off') continue;
    $facMap[$key] = $factor;
    $u = $metal === 'g' ? 10 : 1000;          // display units per gram
    $premG = $premD / $u; $spreadG = $spreadD / $u;
    if ($metal === 'g') {
      $base = $gA * $factor; $lo = $gBandLo * $factor; $hi = $gBandHi * $factor;
      $chg = $gChgPG !== null ? $gChgPG * $factor : null;
      $q = static fn($x) => (int)round($x);
    } else {
      $base = $sA * $factor; $lo = $sBandLo * $factor; $hi = $sBandHi * $factor;
      $chg = $sChgPG !== null ? $sChgPG * $factor : null;
      $q = static fn($x) => round($x, 3);     // keep ₹/kg precision at the gram
    }
    $mid = $base + $premG;
    $rows[] = ['key' => $key, 'label' => $label, 'purity' => $pur, 'mode' => $mode,
      'buy' => $side === 'sell' ? 0 : $q($mid - $spreadG),
      'sell' => $side === 'buy' ? 0 : $q($mid + $spreadG),
      'low' => $side === 'sell' ? 0 : $q($lo + $premG),
      'high' => $side === 'buy' ? 0 : $q($hi + $premG),
      'editable' => $editable,
      'change' => $chg !== null ? $q($chg) : 0];
  }

  /* CASH rows the counter sets itself (values are per gram; imported 995 only when configured) */
  foreach ($db['bullion']['cash'] as $k => $c) {
    if ($k === 'goldImport995') {
      $buy = (int)($c['buy'] ?? 0); $sell = (int)($c['sell'] ?? 0);
      $prev = $db['bullion']['prev'][$k]['buy'] ?? $buy;
      if ($buy > 0 || $sell > 0) {
        $at = 0;
        foreach ($rows as $idx => $rw) { if ($rw['key'] === 'silverPeti') { $at = $idx; break; } }
        array_splice($rows, $at, 0, [['key' => $k, 'label' => $c['label'], 'purity' => $c['purity'], 'mode' => 'CASH',
          'buy' => $buy, 'sell' => $sell, 'low' => $buy, 'high' => $sell,
          'change' => $buy - $prev, 'editable' => true]]);
      }
      continue;
    }
    foreach ($rows as &$rw) {
      if ($rw['key'] === $k) {
        $buy = (int)($c['buy'] ?? 0); $sell = (int)($c['sell'] ?? 0);
        $prev = $db['bullion']['prev'][$k]['buy'] ?? $rw['buy'];
        if ($buy > 0) $rw['buy'] = $buy;
        if ($sell > 0) $rw['sell'] = $sell;
        if ($buy > 0) $rw['low'] = min($rw['low'], $buy);
        if ($sell > 0) $rw['high'] = max($rw['high'], $sell);
        $rw['change'] = ($buy ?: $rw['buy']) - $prev;
      }
    }
    unset($rw);
  }
  /* on the spot fallback feed, day change = move since the previous feed tick */
  if (!$mcxOn && count($hist) > 1) {
    $y = $hist[count($hist) - 2];
    $dg = (float)$r['gold24'] - (float)$y['gold24'];
    $ds = (float)$r['silver'] - (float)$y['silver'];
    foreach ($rows as &$row) {
      if ($row['mode'] !== 'RTGS') continue;
      $isG = !preg_match('#sil|silver#i', $row['label']);
      $row['change'] = $isG ? (int)round($dg * $facMap[$row['key']])
                            : round($ds * $facMap[$row['key']], 3);
    }
    unset($row);
  }
  foreach ($rows as &$row) $row['change'] = $row['change'] ?? 0;
  unset($row);

  /* v57/v68 — spot / MCX future / customs cards for the Pride-Gold style
     board. The spot strip now shows the real international DOLLAR spot with
     the day's exchange H/L; future bid/ask & band come from the exchange FULL
     quote; customs = dollar parity × USD/INR × the (editable) duty multiplier.
     Gold shown per 10 g, silver per kg — the way the bullion market quotes. */
  $goldSpot10 = (int)round($fine * 10);
  $silSpotKg = (int)round($sil * 1000);
  $gPrem = (float)($db['settings']['bullionFuturePrem'] ?? 0.0025);
  $sPrem = (float)($db['settings']['silverFuturePrem'] ?? 0.0018);
  $xau = (float)($r['usdGold'] ?? 0); $xag = (float)($r['usdSilver'] ?? 0);
  $fxNow = (float)($r['usdInr'] ?? ($db['settings']['manualUsdInr'] ?? ($db['settings']['usdInr'] ?? 95.5)));
  $oh = is_array($db['rates']['intlOhlc'] ?? null) ? $db['rates']['intlOhlc'] : [];
  $r2 = static fn($x, $d = 2) => $x > 0 ? round((float)$x, $d) : 0;
  // v72 — if every dollar provider failed but the MCX future is live, derive
  // the international spot from the future price (editable import factors),
  // so the dollar strip can never be blank while the exchange is open.
  $spotKind = (string)($r['spotKind'] ?? 'live');
  if ($xau <= 0 && $mcxOn) {
    $gImp = (float)($db['settings']['spotImpliedGoldFactor'] ?? 1.1371);
    $xau = (float)$mcx['goldLtp'] / 10 * OZ / max(1, $fxNow) / $gImp;
    $spotKind = 'mcx-implied';
  }
  if ($xag <= 0 && $mcxOn) {
    $sImp = (float)($db['settings']['spotImpliedSilverFactor'] ?? 1.1838);
    $xag = (float)$mcx['silverLtp'] / 1000 * OZ / max(1, $fxNow) / $sImp;
    $spotKind = 'mcx-implied';
  }
  if ($mcxOn) {
    $gLtp = (int)$mcx['goldLtp']; $sLtp = (int)$mcx['silverLtp'];
    $future = [
      'real' => true,
      'gold' => ['ltp' => $gLtp,
        'bid' => (int)round($mcx['goldBid'] ?: $gLtp), 'ask' => (int)round($mcx['goldAsk'] ?: $gLtp)],
      'silver' => ['ltp' => $sLtp,
        'bid' => (int)round($mcx['silverBid'] ?: $sLtp), 'ask' => (int)round($mcx['silverAsk'] ?: $sLtp)],
      'goldLow' => (int)round($mcx['goldLow'] ?: $gLtp), 'goldHigh' => (int)round($mcx['goldHigh'] ?: $gLtp),
      'silverLow' => (int)round($mcx['silverLow'] ?: $sLtp), 'silverHigh' => (int)round($mcx['silverHigh'] ?: $sLtp),
      'goldOpen' => (int)round($mcx['goldOpen'] ?? 0), 'goldClose' => (int)round($mcx['goldClose'] ?? 0),
      'silverOpen' => (int)round($mcx['silverOpen'] ?? 0), 'silverClose' => (int)round($mcx['silverClose'] ?? 0),
      'goldChg' => (float)($mcx['goldChg'] ?? 0), 'goldChgPct' => (float)($mcx['goldChgPct'] ?? 0),
      'silverChg' => (float)($mcx['silverChg'] ?? 0), 'silverChgPct' => (float)($mcx['silverChgPct'] ?? 0),
      'goldOi' => (float)($mcx['goldOi'] ?? 0), 'silverOi' => (float)($mcx['silverOi'] ?? 0),
      'goldAtp' => (float)($mcx['goldAtp'] ?? 0), 'silverAtp' => (float)($mcx['silverAtp'] ?? 0),
      'goldVol' => (float)($mcx['goldVol'] ?? 0), 'silverVol' => (float)($mcx['silverVol'] ?? 0),
      'goldFeedTime' => (string)($mcx['goldFeedTime'] ?? ''), 'silverFeedTime' => (string)($mcx['silverFeedTime'] ?? ''),
    ];
  } else {
    $future = [
      'real' => false,
      'gold' => ['ltp' => $goldSpot10,
        'bid' => (int)round($goldSpot10 * (1 + $gPrem) - 30), 'ask' => (int)round($goldSpot10 * (1 + $gPrem) + 31)],
      'silver' => ['ltp' => $silSpotKg,
        'bid' => (int)round($silSpotKg * (1 + $sPrem) - 40), 'ask' => (int)round($silSpotKg * (1 + $sPrem) + 114)],
      'goldLow' => (int)round($gLo * 10), 'goldHigh' => (int)round($gHi * 10 * (1 + $gPrem)),
      'silverLow' => (int)round($sLo * 1000), 'silverHigh' => (int)round($sHi * 1000 * (1 + $sPrem)),
      'goldOpen' => 0, 'goldClose' => 0, 'silverOpen' => 0, 'silverClose' => 0,
      'goldChg' => 0, 'goldChgPct' => 0, 'silverChg' => 0, 'silverChgPct' => 0,
      'goldOi' => 0, 'silverOi' => 0, 'goldAtp' => 0, 'silverAtp' => 0,
      'goldVol' => 0, 'silverVol' => 0, 'goldFeedTime' => '', 'silverFeedTime' => '',
    ];
  }
  // landed customs values: import parity (dollar spot × FX × troy-oz conversion)
  // times the all-in duty multiplier the counter calibrates (settings).
  $gDutyMult = (float)($db['settings']['bullionGoldDutyMult'] ?? 1.553);
  $sDutyMult = (float)($db['settings']['bullionSilverDutyMult'] ?? 1.62);
  $gParity100 = $xau * $fxNow / OZ * 100;       // ₹ per 100 g gold
  $sParityKg = $xag * $fxNow / OZ * 1000;      // ₹ per kg silver
  $gUsdHi2 = (float)($r['usdGoldHigh'] ?? 0) ?: (float)($oh['gold']['high'] ?? 0);
  $gUsdLo2 = (float)($r['usdGoldLow'] ?? 0) ?: (float)($oh['gold']['low'] ?? 0);
  $sUsdHi2 = (float)($r['usdSilverHigh'] ?? 0) ?: (float)($oh['silver']['high'] ?? 0);
  $sUsdLo2 = (float)($r['usdSilverLow'] ?? 0) ?: (float)($oh['silver']['low'] ?? 0);
  $fxHi2 = (float)($r['usdInrHigh'] ?? 0) ?: (float)($oh['inr']['high'] ?? 0);
  $fxLo2 = (float)($r['usdInrLow'] ?? 0) ?: (float)($oh['inr']['low'] ?? 0);
  $ratio = $xag > 0 ? round($xau / $xag, 1) : 0;
  $board = [
    'spot' => [
      'goldUsd' => $r2($xau), 'goldUsdLow' => $r2($gUsdLo2), 'goldUsdHigh' => $r2($gUsdHi2), 'goldUsdPct' => (float)($r['usdGoldPct'] ?? 0),
      'silverUsd' => $r2($xag, 3), 'silverUsdLow' => $r2($sUsdLo2, 3), 'silverUsdHigh' => $r2($sUsdHi2, 3), 'silverUsdPct' => (float)($r['usdSilverPct'] ?? 0),
      'inr' => $r2($fxNow), 'inrLow' => $r2($fxLo2), 'inrHigh' => $r2($fxHi2), 'inrPct' => (float)($r['usdInrPct'] ?? 0),
      'ratio' => $ratio, 'kind' => $spotKind,
      'goldSrc' => (string)($r['spotSrc']['gold'] ?? ''), 'silverSrc' => (string)($r['spotSrc']['silver'] ?? ''),
      'inrSrc' => (string)($r['spotSrc']['fx'] ?? ''),
      // legacy rupee keys (per 10 g / per kg), used by older tiles
      'gold' => $goldSpot10, 'silver' => $silSpotKg,
      'goldLow' => (int)round($gHi * 10 * 0.9985), 'goldHigh' => (int)round($gHi * 10 * 1.001),
      'silverLow' => (int)round($sLo * 1000 * 0.999), 'silverHigh' => (int)round($sHi * 1000 * 1.001)],
    'future' => $future,
    'duty' => ['gold' => (int)round($gParity100 * $gDutyMult), 'silver' => (int)round($sParityKg * $sDutyMult),
      'goldParity' => (int)round($gParity100), 'silverParity' => (int)round($sParityKg),
      'goldMult' => $gDutyMult, 'silverMult' => $sDutyMult],
    /* v61 — international spot (USD/troy oz) + derived karat rates per 10 g */
    'intl' => [
      'xauUsd' => round((float)($r['usdGold'] ?? 0), 2),
      'xagUsd' => round((float)($r['usdSilver'] ?? 0), 3),
      'xauUsdPerG' => round(((float)($r['usdGold'] ?? 0)) / OZ, 2),
      'xagUsdPerG' => round(((float)($r['usdSilver'] ?? 0)) / OZ, 3),
      'inr' => round((float)($r['usdInr'] ?? ($db['settings']['manualUsdInr'] ?? ($db['settings']['usdInr'] ?? 95.5))), 2),
    ],
    'karat' => [
      'k24' => (int)round($fine * 10),
      'k22' => (int)round($fine * PURITY_22 * 10),
      'k20' => (int)round($fine * (20 / 24) * 10),
      'k18' => (int)round($fine * PURITY_18 * 10),
      'silverKg' => (int)round($sil * 1000),
    ],
    'ticker' => (string)($db['settings']['bullionTicker'] ?? '★ सोना व चांदी में UNFIX सुविधा उपलब्ध है ★'),
    'time' => date('H:i:s A'),
    'feedSource' => (string)($r['source'] ?? ''),
    // v78 — browser push endpoint for the Angel SmartStream relay (SSE), when configured
    'relayStream' => (string)($db['settings']['angelRelayStreamUrl'] ?? ''),
    'mcx' => $db['rates']['mcx'] ?? null,
  ];
  if (is_array($db['bullion']['boardOverride'] ?? null)) $board = array_replace_recursive($board, $db['bullion']['boardOverride']);

  /* v60 — intraday chart series (display units: gold per 10 g, silver per kg) */
  $chart = ['t' => [], 'gold995' => [], 'silverChorsa' => [], 'goldSpot' => [], 'silverSpot' => []];
  foreach (array_slice($hist, -180) as $h) {
    $hf = (($h['source'] ?? '') === 'live-mcx') ? 1.0 : 0.995;
    $g995Chart = ($hf === 1.0) ? (float)$h['gold24'] : ((float)$h['gold24'] * 0.995 + $gp - 2);
    $chart['t'][] = $h['t'] ?? now_iso();
    $chart['gold995'][] = (int)round($g995Chart * 10);
    $chart['silverChorsa'][] = (int)round((float)$h['silver'] * 0.98 * 1000);
    $chart['goldSpot'][] = (int)round((float)$h['gold24'] * 10);
    $chart['silverSpot'][] = (int)round((float)$h['silver'] * 1000);
  }

  return ['rows' => $rows, 'board' => $board, 'chart' => $chart, 'rtgsConfig' => $rtgsCfg,
    'updatedAt' => $db['bullion']['updatedAt'], 'date' => date('d M Y')];
}
/* v57 ── personal occasion coupons (birthday / anniversary) ──
   Auto-issued up to 7 days before the date in the shopper's profile; one
   per person per occasion per year. They surface in the account + checkout
   immediately — WhatsApp delivery turns on with the SMS gateway in v58. */
function coupon_for_user(array $c, ?array $u): bool {
  if (empty($c['forUser'])) return true;
  return $u !== null && $c['forUser'] === $u['id'];
}
function coupon_live(array $c): bool {
  if (empty($c['active'])) return false;
  if (!empty($c['expiresAt']) && strtotime((string)$c['expiresAt']) !== false
      && strtotime((string)$c['expiresAt']) < time()) return false;
  return true;
}
function event_coupons_ensure(array &$db, array $u): array {
  global $DB_FILE;
  $out = [];
  $prof = is_array($u['profile'] ?? null) ? $u['profile'] : [];
  $year = (int)date('Y');
  $today = strtotime('today');
  $kinds = [
    'dob' => ['birthday', 'BDAY', 'Happy Birthday from Shivaa', 5],
    'anniversary' => ['anniversary', 'ANNI', 'Happy Anniversary from Shivaa', 5],
  ];
  foreach ($kinds as $pk => $cfg) {
    [$kind, $pre, $title, $pct] = $cfg;
    $d = (string)($prof[$pk] ?? '');
    if (!preg_match('/^\d{4}-(\d{2})-(\d{2})/', $d, $m)) continue;
    $target = strtotime(sprintf('%04d-%s-%s 00:00:00', $year, $m[1], $m[2]));
    if ($target === false) continue;
    $diffDays = (int)round(($target - $today) / 86400);
    if ($diffDays < -1 || $diffDays > 7) continue;
    $seed = preg_replace('/[^A-Za-z0-9]/', '', $u['id']) ?: 'CUST';
    $code = $pre . '-' . strtoupper(substr($seed, -4)) . '-' . $year;
    $found = null;
    foreach ($db['coupons'] as $c) if (($c['code'] ?? '') === $code) { $found = $c; break; }
    if (!$found) {
      $found = ['id' => uid('c'), 'code' => $code, 'type' => 'percent', 'value' => $pct,
        'minOrder' => 10000, 'active' => true, 'kind' => $kind, 'forUser' => $u['id'],
        'year' => $year, 'title' => $title,
        'note' => ($kind === 'birthday'
          ? 'Birthday gift — 5% off your order, with love from Shivaa'
          : 'Anniversary gift — 5% off your order, with love from Shivaa'),
        'expiresAt' => date('c', $target + 10 * 86400), 'createdAt' => now_iso()];
      $db['coupons'][] = $found;
    }
    if (coupon_live($found)) $out[] = $found;
  }
  if ($out) db_save($DB_FILE, $db);
  return $out;
}
/* ═════════ router ═════════ */
$route = $_GET['__route'] ?? '';
$route = trim((string)$route, '/');
$method = $_SERVER['REQUEST_METHOD'];
hallmark_public_route($route, $method);
// Feature 2: current allowlisted settings only, before any legacy schema/rate
// defaults are added. This route is read-only and never queries a registry.
if ($route === 'trust') {
  if ($method !== 'GET') {
    header('Allow: GET');
    jout(405, ['error' => 'Business details are read-only.']);
  }
  jout(200, trust_profile(db_load($DB_FILE)));
}
$db = db_load($DB_FILE);
/* auto-heal schema (old databases) so nothing ever fatals */
$db['otps'] = $db['otps'] ?? [];
foreach (['products','users','orders','partners','coupons','catalogs','reviews','settlements','serviceRequests','newsletter','contactMsgs','rateAlerts','pages','tokens','loginfails','bullionOrders','metalOrders','customOrders','finaleEntries','finaleAttempts','securityLog','resetRate','pubRate','events','carts','khata','goldPurchases','karigars','jobWork','cashbook','refundRequests','savingsPlans','auditLog','bullionAlerts'] as $__k) $db[$__k] = $db[$__k] ?? [];

/* v60 — lightweight audit trail for money/status actions */
function audit_log(array &$db, string $what, array $meta = []): void {
  $u = req_user($db);
  $db['auditLog'][] = ['id' => uid('al'), 'what' => substr($what, 0, 120), 'meta' => $meta,
    'by' => $u ? ($u['name'] ?? $u['id']) : 'system', 'at' => now_iso()];
  if (count($db['auditLog']) > 4000) $db['auditLog'] = array_slice($db['auditLog'], -4000);
}
if (!is_array($db['bullion'] ?? null) || !isset($db['bullion']['cash'])) {
  $db['bullion'] = ['cash' => [
    'goldImport995' => ['label' => 'Imported Gold 995 — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldIndian' => ['label' => 'Indian Gold (IND) — CASH', 'purity' => '99.50%', 'buy' => 0, 'sell' => 0],
    'goldRef9930' => ['label' => 'Ref. Gold Local 99.30 — CASH', 'purity' => '99.30%', 'buy' => 0, 'sell' => 0],
  ], 'updatedAt' => now_iso()];
}
if (!isset($db['rates']['last'])) { $db['rates']['last'] = ['t' => now_iso(), 'gold24' => 11800, 'gold22' => 10800, 'gold18' => 8850, 'silver' => 95, 'source' => 'bootstrap']; $db['rates']['history'] = $db['rates']['history'] ?? []; }
foreach (['freeShipAbove' => 50000, 'shippingFee' => 250, 'jaipurPremium' => 55, 'jaipurSilverPremium' => 3, 'whatsapp' => '918905005921', 'metalFactor' => 0.92, 'finePurity' => '99.50%'] as $__k => $__v) if (!isset($db['settings'][$__k])) $db['settings'][$__k] = $__v;
$changed = false;

try {
  /* ── rates ── */
  if ($route === 'rates' && $method === 'GET') {
    if (rates_stale($db)) { rates_refresh($db); $changed = true; }
    $last = $db['rates']['last'];
    $base = $last;
    if (!empty($db['rates']['override'])) { $base = array_merge($base, $db['rates']['override'], ['source' => 'override (admin)', 't' => now_iso()]); }
    jout(200, array_merge($base, [
      'spot' => ['gold24' => $last['gold24'], 'gold22' => $last['gold22'], 'gold18' => $last['gold18'], 'silver' => $last['silver']],
      'jaipur' => current_rates($db),
      'premium' => ['gold' => (int)($db['settings']['jaipurPremium'] ?? 55), 'silver' => (double)($db['settings']['jaipurSilverPremium'] ?? 3)],
      'override' => $db['rates']['override'] ?? null,
      'history' => array_slice($db['rates']['history'] ?? [], -120),
      'nextUpdateIn' => 60,
    ]));
  }
  if ($route === 'rates/refresh' && $method === 'POST') {
    need_admin($db);
    rates_refresh($db);
    $db['rates']['last']['source'] .= ' (manual)';
    $changed = true; db_save($DB_FILE, $db);
    jout(200, $db['rates']['last']);
  }
  if ($route === 'rates/override' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    if (!empty($b['clear'])) $db['rates']['override'] = null;
    else {
      $g24 = (float)$b['gold24'];
      $db['rates']['override'] = ['gold24' => (int)round($g24), 'gold22' => (int)round($g24 * PURITY_22),
                                  'gold18' => (int)round($g24 * PURITY_18), 'silver' => (float)$b['silver']];
    }
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'override' => $db['rates']['override']]);
  }
  if ($route === 'rates/alert' && $method === 'POST') {
    $b = body_json();
    $db['rateAlerts'][] = ['id' => uid('ra'), 'email' => substr((string)($b['email'] ?? ''), 0, 160),
      'phone' => substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10),
      'metal' => $b['metal'] ?? '', 'target' => (float)($b['target'] ?? 0),
      'productId' => substr((string)($b['productId'] ?? ''), 0, 40),
      'userId' => ($u = req_user($db)) ? $u['id'] : '', 'createdAt' => now_iso()];
    if (count($db['rateAlerts']) > 2000) $db['rateAlerts'] = array_slice($db['rateAlerts'], -2000);
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ── Feature 1: staff-entered piece HUIDs (never BIS verification) ── */
  if (preg_match('#^admin/products/([\w-]+)/hallmark$#', $route, $hm)) {
    need_admin($db);
    try {
      if ($method === 'GET') {
        foreach ($db['products'] as $p) if ($p['id'] === $hm[1]) {
          jout(200, ['productId' => $p['id'], 'name' => $p['name'], 'hallmark' => hallmark_staff_record($p)]);
        }
        jout(404, ['error' => 'Product not found.']);
      }
      if ($method === 'PUT') {
        $p = hallmark_save($DB_FILE, $hm[1], hallmark_request_body(100000));
        jout(200, ['hallmark' => hallmark_staff_record($p), 'product' => hallmark_product($p)]);
      }
      header('Allow: GET, PUT');
      jout(405, ['error' => 'Method not allowed.']);
    } catch (HallmarkProblem $e) { jout($e->httpStatus, ['error' => $e->getMessage()]); }
    catch (Throwable $e) { jout(500, ['error' => 'HUID records could not be saved. Reopen the editor and check before retrying.']); }
  }

  /* ── products ── */
  if ($route === 'products' && $method === 'GET') {
    $list = array_values(array_filter($db['products'], fn($x) => !empty($x['active'])));
    if (!empty($_GET['category'])) $list = array_values(array_filter($list, fn($x) => $x['category'] === $_GET['category']));
    if (!empty($_GET['q'])) { $s = strtolower($_GET['q']); $list = array_values(array_filter($list, fn($x) => str_contains(strtolower($x['name'] . ' ' . $x['category'] . ' ' . ($x['desc'] ?? '') . ' ' . implode(' ', $x['tags'] ?? [])), $s))); }
    if (!empty($_GET['metal'])) $list = array_values(array_filter($list, fn($x) => $x['metal'] === $_GET['metal']));
    if (!empty($_GET['tag'])) $list = array_values(array_filter($list, fn($x) => in_array($_GET['tag'], $x['tags'] ?? [])));
    $R = current_rates($db);
    $out = [];
    foreach ($list as $x) { $y = hallmark_product($x); $y['lessWeightG'] = $y['lessWeightG'] ?? 0; $y['wastagePct'] = $y['wastagePct'] ?? 8; $y['price'] = compute_price($x, $R); $out[] = $y; }
    jout(200, ['products' => $out, 'rates' => current_rates($db)]);
  }
  if (preg_match('#^products/([\w-]+)$#', $route, $m)) {
    $idx = null; foreach ($db['products'] as $i => $x) if ($x['id'] === $m[1]) $idx = $i;
    if ($method === 'GET') {
      if ($idx === null) jout(404, ['error' => 'Not found']);
      $R = current_rates($db);
      $similar = [];
      foreach ($db['products'] as $x) if ($x['category'] === $db['products'][$idx]['category'] && $x['id'] !== $m[1] && !empty($x['active'])) { $y = hallmark_product($x); $y['price'] = compute_price($x, $R); $similar[] = $y; if (count($similar) >= 4) break; }
      $reviews = array_values(array_filter($db['reviews'] ?? [], fn($r) => ($r['productId'] ?? '') === $m[1]));
      $p = hallmark_product($db['products'][$idx]); $p['price'] = compute_price($p, $R);
      jout(200, ['product' => $p, 'rates' => current_rates($db), 'similar' => $similar, 'reviews' => $reviews]);
    }
    if ($method === 'PUT') {
      need_admin($db);
      if ($idx === null) jout(404, ['error' => 'Not found']);
      $b = body_json();
      try { hallmark_guard_product_write($b); }
      catch (HallmarkProblem $e) { jout($e->httpStatus, ['error' => $e->getMessage()]); }
      foreach ($b as $k => $v) $db['products'][$idx][$k] = $v;
      db_save($DB_FILE, $db); jout(200, hallmark_product($db['products'][$idx]));
    }
    if ($method === 'DELETE') {
      need_admin($db);
      $db['products'] = array_values(array_filter($db['products'], fn($x) => $x['id'] !== $m[1]));
      db_save($DB_FILE, $db); jout(200, ['ok' => true]);
    }
  }
  if ($route === 'products' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    try { hallmark_guard_product_write($b); }
    catch (HallmarkProblem $e) { jout($e->httpStatus, ['error' => $e->getMessage()]); }
    $prod = array_merge(['createdAt' => now_iso(), 'active' => true, 'rating' => 4.6, 'reviews' => 0, 'stock' => 10, 'sizes' => [], 'tags' => [], 'images' => [], 'stoneValue' => 0], $b);
    $prod['id'] = uid('p');
    $db['products'][] = $prod; db_save($DB_FILE, $db); jout(200, hallmark_product($prod));
  }

  /* ── media upload (v36 — AI photoshoot shots + product videos) ── */
  if ($route === 'media' && $method === 'POST') {
    need_admin($db);
    if (empty($_FILES['file'])) jout(400, ['error' => 'No file field named "file"']);
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) jout(400, ['error' => 'Upload failed (code ' . $f['error'] . ')']);
    if (($f['size'] ?? 0) > 26214400) jout(400, ['error' => 'File too large (max 25 MB)']);
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    $isImg = in_array($ext, ['jpg', 'jpeg', 'png', 'webp']);
    $isVid = in_array($ext, ['mp4', 'webm', 'mov']);
    if (!$isImg && !$isVid) jout(400, ['error' => 'Only jpg/png/webp images or mp4/webm videos']);
    $head = (string)@file_get_contents($f['tmp_name'], false, null, 0, 12);
    $headOk = $isImg ? (substr($head, 0, 3) === "\xFF\xD8\xFF" || substr($head, 0, 8) === "\x89PNG\r\n\x1a\n" || substr($head, 0, 4) === 'RIFF')
                     : (substr($head, 4, 4) === 'ftyp');
    if (!$headOk) jout(400, ['error' => 'File content does not match its extension']);
    $cat = preg_replace('/[^a-z0-9_-]/', '', strtolower((string)($_POST['category'] ?? 'general'))) ?: 'general';
    $sub = $isVid ? 'videos' : 'designs';
    $dir = __DIR__ . '/uploads/' . $sub . '/' . $cat;
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $name = $cat . '_' . bin2hex(random_bytes(5)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) jout(500, ['error' => 'Could not save — check uploads/ permissions (755)']);
    jout(200, ['url' => '/uploads/' . $sub . '/' . $cat . '/' . $name, 'size' => (int)$f['size'], 'ext' => $ext]);
  }

  /* ── making charges ── */
  if ($route === 'making-charges' && $method === 'GET') jout(200, ['table' => $db['makingCharges'], 'gst' => 3]);
  if ($route === 'making-charges' && $method === 'PUT') {
    need_admin($db);
    $db['makingCharges'] = body_json()['table'] ?? [];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ── auth (with OTP) ── */
  function shivaa_sms_log(array &$db, array $r): void {   // v33 — gateway health trail for the admin panel
    $s = $db['sms'] ?? ['sent' => 0, 'ok' => 0, 'lastErr' => null, 'lastAt' => null];
    $s['sent']++;
    if (!empty($r['ok'])) $s['ok']++;
    else { $s['lastErr'] = cut500((string)($r['error'] ?? 'unknown')); $s['lastResp'] = cut500((string)($r['response'] ?? '')); }
    $s['lastAt'] = now_iso(); $s['provider'] = $r['provider'] ?? null; $s['mode'] = $r['mode'] ?? null;
    $db['sms'] = $s;
  }
  /* ── v48 — one-time code delivery ───────────────────────────────────
     SMS when a gateway is configured and accepts the message, otherwise
     EMAIL to the account's own address (or, for a new registration, the
     address the person just typed). The code is NEVER returned to the
     caller — that was the account-takeover hole of v33…v47.
     ─────────────────────────────────────────────────────────────────── */
  /* v57: customer login/KYC/reset codes are short 4-digit PINs — easy to read
     aloud and type on a jewellery-counter phone (gateway arrives in v58). */
  function otp_new_code(): string { return str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT); }
  function otp_deliver(array &$db, string $phone, string $code, string $email, string $purpose, string $name = ''): array {
    global $DB_FILE;                       // this runs in function scope
    $sms = shivaa_sms_send($phone, $code);
    shivaa_sms_log($db, $sms);
    /* demo build (no SMS gateway configured): show the code in the API
       response so on-screen previews work — works for brand-new numbers
       that have no email on file, exactly like a live SMS would. */
    if (($sms['mode'] ?? '') === 'demo') {
      return ['ok' => true, 'channel' => 'sms', 'mode' => 'demo',
              'devCode' => $code, 'masked' => '+91 ••••••' . substr($phone, -4)];
    }
    if (($sms['mode'] ?? '') === 'live' && !empty($sms['ok'])) {
      return ['ok' => true, 'channel' => 'sms', 'mode' => 'live', 'masked' => '+91 ••••••' . substr($phone, -4)];
    }
    if ($email === '') {
      return ['ok' => false, 'channel' => 'none',
              'error' => 'SMS failed: ' . cut500((string)($sms['error'] ?? 'unknown')) . ' and no fallback email is on file'];
    }
    /* email fallback — capped per IP so the site cannot be used as a relay */
    $ip = (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?');
    $ip = trim(explode(',', $ip)[0]);
    $now = time();
    $hits = array_values(array_filter($db['mailRate'][$ip] ?? [], fn($t) => (int)$t > $now - 3600));
    if (count($hits) >= 12) {
      $db['mailRate'][$ip] = $hits; db_save($DB_FILE, $db);
      return ['ok' => false, 'channel' => 'none', 'error' => 'too many codes requested from this connection in the last hour'];
    }
    $hits[] = $now; $db['mailRate'][$ip] = $hits;

    $m = shivaa_mail_send($email, $code, $purpose === 'reset' ? 'reset' : 'verify', $name);
    $db['mail'] = $db['mail'] ?? ['sent' => 0, 'ok' => 0, 'lastErr' => null, 'lastAt' => null];
    $db['mail']['sent'] = (int)$db['mail']['sent'] + 1;
    if (!empty($m['ok'])) $db['mail']['ok'] = (int)$db['mail']['ok'] + 1;
    else $db['mail']['lastErr'] = cut500((string)($m['error'] ?? 'unknown'));
    $db['mail']['lastAt'] = now_iso();
    $db['mail']['lastTo'] = $m['to'] ?? '';

    if (!empty($m['ok'])) return ['ok' => true, 'channel' => 'email', 'masked' => (string)$m['to'], 'name' => $name];
    $why = (($sms['mode'] ?? '') === 'live' && empty($sms['ok']))
      ? 'SMS failed: ' . cut500((string)($sms['error'] ?? 'unknown'))
      : 'email failed: ' . cut500((string)($m['error'] ?? 'unknown'));
    return ['ok' => false, 'channel' => 'none', 'error' => $why];
  }
  /* the account owner's address for a mobile number ('' when unknown) */
  function otp_email_for_phone(array $db, string $phone): string {
    foreach (($db['users'] ?? []) as $u) {
      if (substr(preg_replace('/\D/', '', (string)($u['phone'] ?? '')), -10) === $phone) {
        return strtolower(trim((string)($u['email'] ?? '')));
      }
    }
    return '';
  }
  function otp_name_for_phone(array $db, string $phone): string {
    foreach (($db['users'] ?? []) as $u) {
      if (substr(preg_replace('/\D/', '', (string)($u['phone'] ?? '')), -10) === $phone) return trim((string)($u['name'] ?? ''));
    }
    return '';
  }
  function otp_dest_hint(array $d): string {
    return $d['channel'] === 'email' ? ('the email address ' . $d['masked']) : ('the mobile ' . $d['masked']);
  }

  if ($route === 'auth/send-otp' && $method === 'POST') {
    $b = body_json();
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Enter a valid 10-digit Indian mobile']);
    foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === $phone && time() - $o['at'] < 30) jout(429, ['error' => 'Wait 30 seconds between OTP requests']);
    /* v56 — OTP goes to EVERY valid mobile number, registered or not.
       Existing accounts: SMS first, email fallback to the account address.
       Brand-new numbers: SMS (or the on-screen code in demo builds); after
       the code verifies, the client collects name / DOB / place once. */
    $dest = otp_email_for_phone($db, $phone);
    $hasAccount = $dest !== '';
    $typed = strtolower(trim((string)($b['email'] ?? '')));
    $toNew = false;
    if ($dest === '' && filter_var($typed, FILTER_VALIDATE_EMAIL)) { $dest = $typed; $toNew = true; }

    $code = (string)otp_new_code();
    $db['otps'] = array_values(array_filter($db['otps'] ?? [], fn($o) => $o['exp'] > time() - 3600));
    $db['otps'][] = ['phone' => $phone, 'hash' => hash('sha256', 'shv' . $phone . $code), 'exp' => time() + 300, 'tries' => 0, 'at' => time(), 'verified' => false, 'email' => $dest];
    $d = otp_deliver($db, $phone, $code, $dest, 'verify', $hasAccount ? otp_name_for_phone($db, $phone) : '');
    db_save($DB_FILE, $db);
    if (empty($d['ok'])) jout(502, ['error' => 'The code could not be sent just now — please retry in a minute, or WhatsApp +91 89050 05921.']);
    jout(200, ['ok' => true, 'sent' => true, 'via' => $d['channel'], 'masked' => $d['masked'],
               'hasAccount' => $hasAccount && !$toNew,
               'devCode' => $d['devCode'] ?? null,
               'message' => 'A 4-digit code is on its way to ' . otp_dest_hint($d) . '.']);
  }
  if ($route === 'auth/otp-login' && $method === 'POST') {
    $b = body_json();
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    $found = null;
    for ($i = count($db['otps'] ?? []) - 1; $i >= 0; $i--) if ($db['otps'][$i]['phone'] === $phone) { $found = $i; break; }
    if ($found === null) jout(400, ['error' => 'Request an OTP first']);
    $o = &$db['otps'][$found];
    if ($o['exp'] < time()) jout(400, ['error' => 'OTP expired — request a new one']);
    if ($o['tries'] >= 5) jout(429, ['error' => 'Too many attempts — request a new OTP']);
    $o['tries']++;
    if ($o['hash'] !== hash('sha256', 'shv' . $phone . (string)($b['code'] ?? ''))) { db_save($DB_FILE, $db); jout(400, ['error' => 'Incorrect OTP']); }
    $o['verified'] = true; db_save($DB_FILE, $db);
    foreach ($db['users'] as $u) if (substr(preg_replace('/\D/', '', (string)($u['phone'] ?? '')), -10) === $phone) {
      $tk = issue_token($db, $u); db_save($DB_FILE, $db);
      jout(200, ['token' => $tk, 'user' => pub_user($u)]);
    }
    jout(404, ['error' => 'No account with this number — please register first']);
  }
  if ($route === 'auth/register' && $method === 'POST') {
    $b = body_json();
    if (empty($b['name'])) jout(400, ['error' => 'Name is required']);
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Valid 10-digit phone required']);
    if (!empty($b['password']) && strlen((string)$b['password']) < 8) jout(400, ['error' => 'Password must be at least 8 characters']);
    $otpOk = false;
    foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === $phone && !empty($o['verified']) && $o['exp'] > time() - 3600) $otpOk = true;
    if (!$otpOk) jout(400, ['error' => 'Verify your phone with OTP first']);
    /* one account per mobile — the OTP already proves possession */
    foreach ($db['users'] as $uE) if (substr(preg_replace('/\D/', '', (string)($uE['phone'] ?? '')), -10) === $phone) {
      $tk = issue_token($db, $uE); db_save($DB_FILE, $db); jout(200, ['token' => $tk, 'user' => pub_user($uE)]);
    }
    /* v56 mobile-first sign-up: email & password are optional. Missing email
       gets a non-routable synthetic address keyed to the verified number; a
       missing password becomes a random secret (OTP remains the login door). */
    $email = strtolower(trim((string)($b['email'] ?? '')));
    if ($email !== '') {
      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jout(400, ['error' => 'That email does not look valid']);
      foreach ($db['users'] as $u) if (strtolower($u['email']) === $email) jout(409, ['error' => 'Email already registered']);
    } else {
      $email = $phone . '@phone.shivaa.in';
    }
    $pass = !empty($b['password']) ? (string)$b['password'] : bin2hex(random_bytes(16));
    /* one-time personal details (name/DOB/place form) */
    $profile = is_array($b['profile'] ?? null) ? $b['profile'] : [];
    foreach (['dob', 'anniversary', 'gender', 'city'] as $pk) {
      if (isset($b[$pk])) $profile[$pk] = $b[$pk];
    }
    foreach ($profile as $pk => $pv) {
      if (!in_array($pk, ['dob', 'anniversary', 'gender', 'city'], true)) { unset($profile[$pk]); continue; }
      $profile[$pk] = mb_substr(trim((string)$pv), 0, 40);
    }
    $profile = array_filter($profile, fn($v) => $v !== '');
    $ref = strtoupper((string)($b['ref'] ?? ''));
    $u = ['id' => uid('u'), 'name' => cut500(trim((string)$b['name'])), 'email' => strtolower($email), 'phone' => $phone,
          'passHash' => pw_hash($pass), 'role' => 'customer',
          'loyaltyPoints' => 120, 'wishlist' => [], 'createdAt' => now_iso(),
          'referralCode' => 'SH' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5)),
          'referredBy' => preg_match('/^SH[A-Z0-9]{5}$/', $ref) ? $ref : null];
    if ($profile) $u['profile'] = $profile;
    $db['users'][] = $u; $tk = issue_token($db, $u);
    db_save($DB_FILE, $db); jout(200, ['token' => $tk, 'user' => pub_user($u)]);
  }
  if ($route === 'auth/login' && $method === 'POST') {
    $b = body_json();
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?';
    $key = $ip . '|' . strtolower((string)($b['email'] ?? ''));
    $db['loginfails'] = $db['loginfails'] ?? [];
    $rec = $db['loginfails'][$key] ?? ['n' => 0, 'until' => 0];
    if (($rec['until'] ?? 0) > time()) jout(429, ['error' => 'Too many attempts — try again in 15 minutes']);
    foreach ($db['users'] as $u) if (strtolower($u['email']) === strtolower((string)($b['email'] ?? ''))) {
      $__rehash = false;
      if (pw_verify($u, (string)($b['password'] ?? ''), $__rehash)) {
        if ($__rehash) {
          foreach ($db['users'] as $__i => $__uu) if ($__uu['id'] === $u['id']) {
            $db['users'][$__i]['passHash'] = pw_hash((string)($b['password'] ?? ''));
            unset($db['users'][$__i]['salt']);
          }
        }
        unset($db['loginfails'][$key]);
        /* v51 hardening: admin sign-ins are audited so the owner can see
           every successful admin login (who + when + from where). */
        if (($u['role'] ?? '') === 'admin') {
          $db['securityLog'] = $db['securityLog'] ?? [];
          $db['securityLog'][] = ['at' => now_iso(), 'event' => 'admin-login',
                                  'email' => $u['email'] ?? '', 'ip' => $ip];
          if (count($db['securityLog']) > 400) $db['securityLog'] = array_slice($db['securityLog'], -400);
        }
        $tk = issue_token($db, $u); db_save($DB_FILE, $db);
        jout(200, ['token' => $tk, 'user' => pub_user($u)]);
      }
      $rec['n'] = ($rec['n'] ?? 0) + 1;
      if ($rec['n'] >= 5) {
        $rec['until'] = time() + 900; $rec['n'] = 0;
        $db['securityLog'] = $db['securityLog'] ?? [];
        $db['securityLog'][] = ['at' => now_iso(), 'event' => 'login-lockout',
                                'email' => strtolower((string)($b['email'] ?? '')), 'ip' => $ip];
        if (count($db['securityLog']) > 400) $db['securityLog'] = array_slice($db['securityLog'], -400);
      }
      $db['loginfails'][$key] = $rec;
      db_save($DB_FILE, $db);
      jout(401, ['error' => 'Invalid email or password']);
    }
    jout(401, ['error' => 'Invalid email or password']);
  }
  /* ── password reset & change (v45) ───────────────────────────────────
     The site had no way to recover a password: only a signed-in admin
     could set someone else's, so the owner themselves could get locked
     out with no way back in. Three doors now exist, in order of what a
     real person has available:

       1. auth/reset/start + auth/reset/confirm — email → 4-digit OTP to
          the account's REGISTERED MOBILE (possession factor) → new
          password. Works for admin accounts too. Never reveals whether
          an email exists. Every existing session token for that account
          is revoked on success, so a stolen session cannot survive.
       2. auth/change-password — signed in already? change it with the
          current password; other sessions are dropped, this one stays.
       3. admin-reset.php (shipped as a separate break-glass file) — for
          when the SIM/SMS is unavailable. One-time, key-gated, deletes
          itself. Nothing about it lives in this API.

     Every event is written to db['securityLog'] with time, role and IP.
     ──────────────────────────────────────────────────────────────────── */
  if ($route === 'auth/reset/start' && $method === 'POST') {
    if (($db['settings']['otpReset'] ?? true) === false) {
      jout(403, ['error' => 'Password reset by SMS is switched off on this site — please contact the owner, or use the admin-reset.php recovery file on the server.']);
    }
    $email = strtolower(trim((string)(body_json()['email'] ?? '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) jout(400, ['error' => 'Enter a valid email address']);
    // The reply is deliberately identical whether or not the account exists.
    $generic = ['ok' => true, 'sent' => true,
                'message' => 'If that email has a Shivaa account, a 4-digit code is on its way to the registered mobile number.'];
    $helpNote = 'No mobile on file, or no SMS arriving? Use the admin-reset.php recovery file in your hosting panel, or WhatsApp +91 89050 05921.';

    $now = time();
    $hits = array_values(array_filter($db['resetRate'][$email] ?? [], fn($t) => (int)$t > $now - 3600));
    if (!empty($hits) && $now - (int)end($hits) < 30) jout(429, ['error' => 'Please wait 30 seconds before requesting another code']);
    if (count($hits) >= 5) jout(429, ['error' => 'Too many reset codes requested for this email — please try again after an hour, or use admin-reset.php.']);
    $hits[] = $now; $db['resetRate'][$email] = $hits;

    $user = null;
    foreach ($db['users'] as $u) if (strtolower((string)($u['email'] ?? '')) === $email) { $user = $u; break; }
    if (!$user) { db_save($DB_FILE, $db); jout(200, $generic); }

    $phone = substr(preg_replace('/\D/', '', (string)($user['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) {
      $db['securityLog'][] = ['at' => now_iso(), 'event' => 'password-reset-blocked-no-phone', 'email' => $email,
                              'role' => $user['role'] ?? 'customer', 'ip' => ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?')];
      db_save($DB_FILE, $db);
      jout(200, array_merge($generic, ['noPhone' => true, 'message' => 'That account has no mobile number on file, so an SMS code cannot be sent. ' . $helpNote]));
    }

    $code = (string)otp_new_code();
    $db['otps'] = array_values(array_filter($db['otps'] ?? [], fn($o) => (int)($o['exp'] ?? 0) > $now - 3600));
    $db['otps'][] = ['phone' => $phone, 'hash' => hash('sha256', 'shv' . $phone . $code), 'exp' => $now + 300,
                     'tries' => 0, 'at' => $now, 'verified' => false, 'purpose' => 'reset', 'email' => $email];
    $d = otp_deliver($db, $phone, $code, (string)($user['email'] ?? ''), 'reset', (string)($user['name'] ?? ''));
    $db['securityLog'][] = ['at' => now_iso(), 'event' => 'password-reset-requested', 'email' => $email,
                            'role' => $user['role'] ?? 'customer', 'channel' => $d['channel'] ?? 'none',
                            'sent' => !empty($d['ok']),
                            'ip' => ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?')];
    db_save($DB_FILE, $db);
    if (empty($d['ok'])) jout(502, ['error' => 'The code could not be sent just now — please retry in a minute, or use admin-reset.php. ' . $helpNote]);
    jout(200, array_merge($generic, ['masked' => $d['masked'], 'via' => $d['channel'],
        'devCode' => $d['devCode'] ?? null,
        'message' => 'If that email has a Shivaa account, a 4-digit code is on its way to ' . otp_dest_hint($d) . '.']));
  }

  if ($route === 'auth/reset/confirm' && $method === 'POST') {
    $b = body_json();
    $email = strtolower(trim((string)($b['email'] ?? '')));
    $code = preg_replace('/\D/', '', (string)($b['code'] ?? ''));
    $pw = (string)($b['password'] ?? '');
    if (strlen($pw) < 8) jout(400, ['error' => 'New password must be at least 8 characters']);
    if (!in_array(strlen($code), [4, 6], true)) jout(400, ['error' => 'Enter the code from the SMS']);
    $idx = null; $user = null;
    foreach ($db['users'] as $i => $u) if (strtolower((string)($u['email'] ?? '')) === $email) { $idx = $i; $user = $u; break; }
    if ($idx === null) jout(400, ['error' => 'That code is not valid — request a new one']);
    $phone = substr(preg_replace('/\D/', '', (string)($user['phone'] ?? '')), -10);
    $found = null;
    for ($i = count($db['otps'] ?? []) - 1; $i >= 0; $i--) if (($db['otps'][$i]['phone'] ?? '') === $phone) { $found = $i; break; }
    if ($found === null) jout(400, ['error' => 'Request a reset code first']);
    $o = &$db['otps'][$found];
    if ((int)$o['exp'] < time()) jout(400, ['error' => 'That code has expired — request a new one']);
    if ((int)$o['tries'] >= 5) jout(429, ['error' => 'Too many attempts on this code — request a new one']);
    $o['tries'] = (int)$o['tries'] + 1;
    if (!hash_equals((string)$o['hash'], hash('sha256', 'shv' . $phone . $code))) {
      db_save($DB_FILE, $db);
      jout(400, ['error' => 'Incorrect code']);
    }

    /* ── accepted: rotate the credential, kill every old session ── */
    $db['users'][$idx]['passHash'] = pw_hash($pw);
    unset($db['users'][$idx]['salt']);                       // drop any legacy sha256 salt
    $db['users'][$idx]['passwordChangedAt'] = now_iso();
    // db['tokens'] is KEYED BY the token string — rebuild it key-for-key so
    // only this account's sessions are revoked and everyone else stays signed in.
    $revoked = 0; $keepTokens = [];
    foreach (($db['tokens'] ?? []) as $tk => $t) {
      if (($t['userId'] ?? '') === ($user['id'] ?? '')) { $revoked++; continue; }
      $keepTokens[$tk] = $t;
    }
    $db['tokens'] = $keepTokens;
    foreach (array_keys($db['loginfails'] ?? []) as $k) if (str_contains((string)$k, '|' . $email)) unset($db['loginfails'][$k]);
    $db['otps'] = array_values(array_filter($db['otps'], fn($o2) => ($o2['phone'] ?? '') !== $phone));
    $db['securityLog'][] = ['at' => now_iso(), 'event' => 'password-reset-done', 'email' => $email,
                            'role' => $user['role'] ?? 'customer', 'via' => 'otp-sms', 'sessionsRevoked' => $revoked,
                            'ip' => ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?')];
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'email' => $email, 'role' => $user['role'] ?? 'customer', 'sessionsRevoked' => $revoked,
               'message' => 'Password updated. Sign in with your email and the new password.']);
  }

  if ($route === 'auth/change-password' && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    $cur = (string)($b['current'] ?? '');
    $pw = (string)($b['password'] ?? '');
    if (strlen($pw) < 8) jout(400, ['error' => 'New password must be at least 8 characters']);
    if (!pw_verify($u, $cur)) jout(403, ['error' => 'Current password is incorrect']);
    $mine = '';
    if (preg_match('#^Bearer (\w+)$#', (string)($_SERVER['HTTP_AUTHORIZATION'] ?? ''), $m)) $mine = $m[1];
    foreach ($db['users'] as $i => $uu) if ($uu['id'] === $u['id']) {
      $db['users'][$i]['passHash'] = pw_hash($pw);
      unset($db['users'][$i]['salt']);
      $db['users'][$i]['passwordChangedAt'] = now_iso();
    }
    // keep the session doing the change; drop this account's other sessions only
    $keep = []; $revoked = 0;
    foreach (($db['tokens'] ?? []) as $tk => $t) {
      if (($t['userId'] ?? '') === $u['id'] && $tk !== $mine) { $revoked++; continue; }
      $keep[$tk] = $t;
    }
    $db['tokens'] = $keep;
    $db['securityLog'][] = ['at' => now_iso(), 'event' => 'password-changed', 'email' => $u['email'] ?? '',
                            'role' => $u['role'] ?? 'customer', 'via' => 'signed-in', 'sessionsRevoked' => $revoked,
                            'ip' => ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '?')];
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'sessionsRevoked' => $revoked, 'message' => 'Password changed. Other devices were signed out.']);
  }

  if ($route === 'admin/security-log' && $method === 'GET') {
    need_admin($db);
    jout(200, ['log' => array_slice(array_reverse($db['securityLog'] ?? []), 0, 100),
               'otpResetEnabled' => (($db['settings']['otpReset'] ?? true) !== false)]);
  }

  if ($route === 'auth/me' && $method === 'GET') {
    $u = req_user($db);
    $events = $u ? event_coupons_ensure($db, $u) : [];
    jout(200, ['user' => $u ? pub_user($u) : null, 'events' => $events]);
  }
  if ($route === 'auth/profile' && $method === 'PUT') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['profile'] = $uu['profile'] ?? [];
      foreach (['dob', 'anniversary', 'gender', 'city'] as $k) if (isset($b[$k])) $uu['profile'][$k] = mb_substr((string)$b[$k], 0, 40);
      if (!empty($b['name'])) $uu['name'] = cut500(trim((string)$b['name']));
      $u = $uu;
    }
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'user' => pub_user($u)]);
  }
  if ($route === 'addresses' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    jout(200, ['addresses' => $u['addresses'] ?? []]);
  }
  if ($route === 'addresses' && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    if (empty($b['name']) || empty($b['phone']) || empty($b['line']) || empty($b['city']) || empty($b['pincode'])) jout(400, ['error' => 'Name, phone, address, city & pincode required']);
    if (!preg_match('#^\d{6}$#', (string)$b['pincode'])) jout(400, ['error' => 'Pincode must be 6 digits']);
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['addresses'] = $uu['addresses'] ?? [];
      $addr = ['id' => uid('ad'), 'label' => $b['label'] ?? 'Home', 'name' => trim((string)$b['name']), 'phone' => substr(preg_replace('/\D/', '', (string)$b['phone']), -10),
               'line' => trim((string)$b['line']), 'city' => trim((string)$b['city']), 'state' => (string)($b['state'] ?? 'Rajasthan'), 'pincode' => (string)$b['pincode']];
      if (!empty($b['isDefault']) || !count($uu['addresses'])) { foreach ($uu['addresses'] as &$a) $a['isDefault'] = false; $addr['isDefault'] = true; }
      $uu['addresses'][] = $addr;
      $out = $uu;
    }
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'addresses' => $out['addresses']]);
  }
  if (preg_match('#^addresses/([\w-]+)$#', $route, $mAD)) {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $found = false;
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['addresses'] = $uu['addresses'] ?? [];
      foreach ($uu['addresses'] as $i => $a) if ($a['id'] === $mAD[1]) {
        $found = true;
        if ($method === 'PUT') {
          $b = body_json();
          if (!empty($b['setDefault'])) { foreach ($uu['addresses'] as &$a2) $a2['isDefault'] = false; $uu['addresses'][$i]['isDefault'] = true; }
          else {
            foreach (['label', 'name', 'phone', 'line', 'city', 'state', 'pincode'] as $k) if (isset($b[$k])) $uu['addresses'][$i][$k] = trim((string)$b[$k]);
            if (!empty($b['isDefault'])) { foreach ($uu['addresses'] as &$a2) $a2['isDefault'] = false; $uu['addresses'][$i]['isDefault'] = true; }
          }
        } elseif ($method === 'DELETE') { array_splice($uu['addresses'], $i, 1); }
      }
      $out = $uu;
    }
    if (!$found) jout(404, ['error' => 'Address not found']);
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'addresses' => $out['addresses'] ?? []]);
  }

  /* ── wishlist ── */
  if ($route === 'wishlist' && $method === 'GET') {
    $u = req_user($db);
    $w = $u ? ($u['wishlist'] ?? []) : [];
    $R = current_rates($db); $items = [];
    foreach ($db['products'] as $x) if (in_array($x['id'], $w)) { $y = hallmark_product($x); $y['price'] = compute_price($x, $R); $items[] = $y; }
    jout(200, ['wishlist' => $w, 'items' => $items]);
  }
  if ($route === 'wishlist' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['wishlist'] = $uu['wishlist'] ?? [];
      if (!empty($b['add']) && !in_array($b['id'], $uu['wishlist'])) $uu['wishlist'][] = $b['id'];
      if (empty($b['add'])) $uu['wishlist'] = array_values(array_filter($uu['wishlist'], fn($x) => $x !== $b['id']));
      $w = $uu['wishlist'];
    }
    db_save($DB_FILE, $db); jout(200, ['wishlist' => $w ?? []]);
  }

  /* ── coupons ── */
  if ($route === 'coupons/validate' && $method === 'POST') {
    $b = body_json();
    $cu = req_user($db);
    foreach ($db['coupons'] as $c) if (strtoupper($c['code']) === strtoupper((string)($b['code'] ?? '')) && coupon_live($c) && coupon_for_user($c, $cu)) {
      if ((float)($b['amount'] ?? 0) < (float)($c['minOrder'] ?? 0)) jout(400, ['error' => 'Minimum order ₹' . number_format((float)$c['minOrder']) . ' for ' . $c['code']]);
      jout(200, $c);
    }
    jout(404, ['error' => 'Invalid coupon code']);
  }
  if ($route === 'coupons' && $method === 'GET') {
    $u = req_user($db);
    $list = ($u && $u['role'] === 'admin') ? $db['coupons'] : array_values(array_filter($db['coupons'], fn($c) => coupon_live($c) && coupon_for_user($c, $u)));
    jout(200, ['coupons' => $list]);
  }
  if ($route === 'coupons' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    $db['coupons'][] = array_merge(['id' => uid('c'), 'active' => true], $b);
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ── orders ── */
  if ($route === 'orders' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required to place order']);
    $b = body_json();
    $R = current_rates($db);
    /* v57: honour a 20-minute checkout rate lock — accepted only inside a
       2% safety band so a locked quote can never be abused. */
    $lockedR = null;
    if (!empty($b['rateLock']['stampedAt']) && !empty($b['rateLock']['rates'])) {
      $stamp = strtotime((string)$b['rateLock']['stampedAt']);
      if ($stamp !== false && (time() - $stamp) <= 1200) {
        $L = (array)$b['rateLock']['rates']; $ok = true;
        foreach (['gold22','gold24','gold18','silver'] as $rk) {
          if (isset($L[$rk]) && is_numeric($L[$rk]) && !empty($R[$rk])
              && abs(((float)$L[$rk] - (float)$R[$rk]) / (float)$R[$rk]) > 0.02) $ok = false;
        }
        if ($ok) { foreach (['gold22','gold24','gold18','silver'] as $rk) if (isset($L[$rk]) && is_numeric($L[$rk])) $R[$rk] = (float)$L[$rk]; $lockedR = $L; }
      }
    }
    $subtotal = 0; $items = [];
    foreach (($b['items'] ?? []) as $it) {
      foreach ($db['products'] as $prod) if ($prod['id'] === $it['id']) {
        $pr = compute_price($prod, $R);
        $line = ['productId' => $prod['id'], 'name' => $prod['name'], 'img' => $prod['images'][0] ?? null,
                 'qty' => max(1, (int)($it['qty'] ?? 1)), 'weightG' => $prod['weightG'], 'purity' => $prod['purity'], 'metal' => $prod['metal'],
                 'hsn' => ($prod['metal'] ?? '') === 'Silver' ? '71131110' : '71131910',
                 'unitPrice' => $pr['total'], 'ratePerGram' => $pr['ratePerGram'], 'makingCharge' => $pr['makingCharge'], 'gst' => $pr['gst'],
                 'size' => $it['size'] ?? null, 'engraving' => $it['engraving'] ?? null];
        $subtotal += $line['unitPrice'] * $line['qty'];
        $items[] = $line; break;
      }
    }
    if (!$items) jout(400, ['error' => 'Cart is empty']);
    $coupon = null;
    if (!empty($b['coupon'])) foreach ($db['coupons'] as $c) if (strtoupper($c['code']) === strtoupper($b['coupon']) && coupon_live($c) && coupon_for_user($c, $u)) $coupon = $c;
    $discount = 0;
    if ($coupon && $subtotal >= (float)($coupon['minOrder'] ?? 0)) $discount = $coupon['type'] === 'percent' ? (int)round($subtotal * $coupon['value'] / 100) : (int)$coupon['value'];
    $pointsUsed = 0;
    if (!empty($b['usePoints'])) {
      $maxPts = (int)min((float)($u['loyaltyPoints'] ?? 0), floor($subtotal * 0.1));
      $pointsUsed = max(0, (int)min($maxPts, (int)floor($subtotal - $discount)));
      $discount += $pointsUsed;
    }
    $freeShip = (float)($db['settings']['freeShipAbove'] ?? 50000);
    $shipping = $subtotal >= $freeShip ? 0 : (int)($db['settings']['shippingFee'] ?? 250);
    /* v58 — prepaid incentive: online prepayment earns an instant discount
       (default 2%); COD/WhatsApp orders pay the full total. */
    $pm = $b['paymentMethod'] ?? 'Online';
    $prepaidPct = (float)($db['settings']['prepaidPct'] ?? 2);
    $prepaid = 0;
    if ($pm === 'Online' && $prepaidPct > 0) $prepaid = (int)round($subtotal * $prepaidPct / 100);
    /* v58 — optional COD handling fee (percentage of subtotal); default 0 */
    $codFeePct = (float)($db['settings']['codFeePct'] ?? 0);
    $codFee = ($pm === 'COD' && $codFeePct > 0) ? (int)round($subtotal * $codFeePct / 100) : 0;
    $total = max(0, $subtotal - $discount - $prepaid + $codFee + $shipping);
    $earned = (int)floor($total / 100);
    /* v60 — sequential financial-year invoice number (GST) */
    $fy = ((int)date('n') >= 4) ? date('y') . '-' . str_pad(((int)date('y')) + 1, 2, '0', STR_PAD_LEFT)
                                : str_pad(((int)date('y')) - 1, 2, '0', STR_PAD_LEFT) . '-' . date('y');
    $seq = (int)($db['settings']['invoiceSeq'] ?? 100) + 1;
    $db['settings']['invoiceSeq'] = $seq;
    $invoiceNo = 'SHV/' . $fy . '/' . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
    $order = [
      'id' => 'SHV' . substr((string)time(), -8), 'invoiceNo' => $invoiceNo, 'hsn' => '71131910',
      'userId' => $u['id'], 'userName' => $u['name'], 'items' => $items,
      'address' => $b['address'] ?? (object)[], 'paymentMethod' => $pm,
      'paymentStatus' => $pm === 'COD' ? 'Pending (COD)' : ($pm === 'WhatsApp' ? 'Confirm on WhatsApp' : 'Awaiting payment'),
      'subtotal' => $subtotal, 'discount' => $discount, 'prepaidDiscount' => $prepaid, 'codFee' => $codFee,
      'pointsUsed' => $pointsUsed, 'coupon' => $coupon['code'] ?? null,
      'shipping' => $shipping, 'total' => $total, 'earnedPoints' => $earned,
      'rateSnapshot' => array_merge($R, ['stampedAt' => now_iso(), 'locked' => $lockedR !== null]),
      'status' => 'Placed', 'createdAt' => now_iso(), 'timeline' => [['s' => 'Placed', 't' => now_iso()]],
    ];
    $db['orders'][] = $order;
    foreach ($db['users'] as &$uu) if ($uu['id'] === $u['id']) {
      $uu['loyaltyPoints'] = max(0, (int)($uu['loyaltyPoints'] ?? 0) - $pointsUsed) + $earned;
    }
    foreach ($items as $it) foreach ($db['products'] as &$pr2) if ($pr2['id'] === $it['productId']) $pr2['stock'] = max(0, (int)($pr2['stock'] ?? 0) - $it['qty']);
    db_save($DB_FILE, $db);
    jout(200, $order);
  }
  if ($route === 'orders' && $method === 'GET') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $list = $u['role'] === 'admin' ? $db['orders'] : array_values(array_filter($db['orders'], fn($o) => $o['userId'] === $u['id']));
    jout(200, ['orders' => array_reverse(array_values($list))]);
  }
  if (preg_match('#^orders/([\w-]+)$#', $route, $m)) {
    $o = null; foreach ($db['orders'] as $x) if ($x['id'] === $m[1]) $o = $x;
    if ($method === 'GET') {
      $u = req_user($db);
      if (!$o) jout(404, ['error' => 'Not found']);
      if ($o['userId'] !== ($u['id'] ?? '') && ($u['role'] ?? '') !== 'admin') jout(403, ['error' => 'Not yours']);
      jout(200, ['order' => $o]);
    }
    if ($method === 'PUT') {
      need_admin($db);
      $patch = body_json();
      foreach ($db['orders'] as &$x) if ($x['id'] === $m[1]) {
        $st = $patch['status'] ?? null;
        if ($st && $st !== $x['status']) { $x['status'] = $st; $x['timeline'][] = ['s' => $st, 't' => now_iso()]; }
        if (!empty($patch['paymentStatus'])) $x['paymentStatus'] = substr((string)$patch['paymentStatus'], 0, 40);
        $o = $x;
      }
      if (!empty($patch['status']) || !empty($patch['paymentStatus'])) audit_log($db, 'order.updated', ['order' => $m[1], 'status' => $patch['status'] ?? null, 'payment' => $patch['paymentStatus'] ?? null]);
      db_save($DB_FILE, $db); jout(200, $o);
    }
  }

  /* ════════ v58 · payments scaffold (Razorpay-ready; demo without keys) ════════
     No keys needed to operate: in demo mode checkout shows a simulated gateway
     screen. Paste Razorpay key id + secret in admin Settings → Payments and the
     same routes create real gateway orders and verify real signatures. */
  if ($route === 'pay/config' && $method === 'GET') {
    $s = $db['settings'];
    $provider = (string)($s['payProvider'] ?? 'demo');
    $rzpLive = $provider === 'razorpay' && !empty($s['rzpKeyId']) && !empty($s['rzpKeySecret']);
    jout(200, [
      'mode' => $rzpLive ? 'razorpay' : 'demo',
      'provider' => $provider,
      'keyId' => (string)($s['rzpKeyId'] ?? ''),
      'prepaidPct' => (float)($s['prepaidPct'] ?? 2),
      'codFeePct' => (float)($s['codFeePct'] ?? 0),
      /* v59 — UPI QR fallback works with zero gateway keys: customer scans
         the counter UPI ID, uploads the payment screenshot; admin approves. */
      'upiId' => (string)($s['upiId'] ?? ''),
      'upiName' => (string)($s['upiName'] ?? 'Shivaa Jewellers'),
      'currency' => 'INR',
    ]);
  }
  $find_order_owner = function (string $id) use ($db) {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    foreach ($db['orders'] as $i => $o) if ($o['id'] === $id) {
      if ($o['userId'] !== $u['id'] && ($u['role'] ?? '') !== 'admin') jout(403, ['error' => 'Not your order']);
      return [$i, $o, $u];
    }
    jout(404, ['error' => 'Order not found']);
  };
  if ($route === 'pay/order' && $method === 'POST') {
    $b = body_json();
    [$i, $o, $u] = $find_order_owner((string)($b['orderId'] ?? ''));
    $s = $db['settings'];
    // v60: charge only the outstanding balance (advances / part payments already made)
    $already = (int)($o['amountPaid'] ?? 0);
    if (empty($o['payments']) && ($o['paymentStatus'] ?? '') === 'Paid') $already = max($already, (int)($o['total'] ?? 0));
    $due = max(0, (int)($o['total'] ?? 0) - $already);
    if ($due <= 0) jout(400, ['error' => 'This order is already fully paid']);
    $amountPaise = (int)round($due * 100);
    if (!empty($s['rzpKeyId']) && !empty($s['rzpKeySecret']) && (($s['payProvider'] ?? '') === 'razorpay')) {
      $rzp = http_post_json('https://api.razorpay.com/v1/orders', [
        'amount' => $amountPaise, 'currency' => 'INR', 'receipt' => $o['id'],
        'payment_capture' => 1, 'notes' => ['order' => $o['id'], 'customer' => $o['userName']],
      ], $s['rzpKeyId'] . ':' . $s['rzpKeySecret']);
      if (!$rzp || empty($rzp['id'])) jout(502, ['error' => 'Payment gateway could not be reached — choose WhatsApp/COD or retry.']);
      $db['orders'][$i]['gatewayOrderId'] = $rzp['id'];
      db_save($DB_FILE, $db);
      jout(200, ['mode' => 'razorpay', 'keyId' => $s['rzpKeyId'], 'gatewayOrder' => $rzp, 'amount' => $amountPaise, 'orderId' => $o['id']]);
    }
    /* demo mode — a fake gateway order id; verify below always succeeds */
    $ref = 'demo_' . bin2hex(random_bytes(8));
    $db['orders'][$i]['gatewayOrderId'] = $ref;
    db_save($DB_FILE, $db);
    jout(200, ['mode' => 'demo', 'gatewayOrder' => ['id' => $ref, 'amount' => $amountPaise, 'currency' => 'INR'],
               'upiId' => (string)($s['upiId'] ?? ''), 'upiName' => (string)($s['upiName'] ?? 'Shivaa Jewellers'),
               'amount' => $amountPaise, 'orderId' => $o['id']]);
  }
  if ($route === 'pay/verify' && $method === 'POST') {
    $b = body_json();
    [$i, $o] = $find_order_owner((string)($b['orderId'] ?? ''));
    $s = $db['settings'];
    $gOrderId = (string)($b['gatewayOrderId'] ?? ($o['gatewayOrderId'] ?? ''));
    $payId = (string)($b['paymentId'] ?? '');
    $sig = (string)($b['signature'] ?? '');
    if (!empty($s['rzpKeyId']) && !empty($s['rzpKeySecret']) && (($s['payProvider'] ?? '') === 'razorpay')) {
      $expect = hash_hmac('sha256', $gOrderId . '|' . $payId, (string)$s['rzpKeySecret']);
      if (!$payId || !hash_equals($expect, $sig)) jout(400, ['error' => 'Payment verification failed — no charge was completed.']);
    } elseif (strpos($gOrderId, 'demo_') !== 0) {
      jout(400, ['error' => 'Gateway not configured for live payments.']);
    }
    $gw = (!empty($s['rzpKeyId']) && ($s['payProvider'] ?? '') === 'razorpay') ? 'razorpay' : 'demo';
    $alreadyNow = array_sum(array_map(fn($p) => ($p['status'] ?? '') === 'approved' ? (int)$p['amount'] : 0, $o['payments'] ?? []));
    $paidAmt = max(1, (int)($o['total'] ?? 0) - $alreadyNow);
    order_add_payment($db['orders'][$i], ['amount' => $paidAmt, 'mode' => $gw, 'ref' => $payId ?: $gOrderId, 'at' => now_iso(), 'status' => 'approved']);
    $db['orders'][$i]['paymentStatus'] = 'Paid';
    $db['orders'][$i]['paidAt'] = now_iso();
    $db['orders'][$i]['paymentRef'] = $payId ?: $gOrderId;
    $db['orders'][$i]['gateway'] = $gw;
    audit_log($db, 'payment.gateway-paid', ['order' => $o['id'], 'amount' => $paidAmt, 'gateway' => $gw]);
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'order' => $db['orders'][$i]]);
  }

  /* ════════ v59 · UPI QR payment proof (works with no gateway keys) ════════
     Customer scans the counter UPI QR, attaches the payment screenshot.
     Status becomes "Proof submitted" until the owner approves it in admin. */
  if ($route === 'pay/proof' && $method === 'POST') {
    // multipart/form-data: fields arrive in $_POST, screenshot in $_FILES
    $proofOrderId = (string)($_POST['orderId'] ?? (body_json()['orderId'] ?? ''));
    [$i, $o] = $find_order_owner($proofOrderId);
    if (empty($_FILES['proof'])) jout(400, ['error' => 'Attach the payment screenshot']);
    $f = $_FILES['proof'];
    if (($f['error'] ?? 1) !== UPLOAD_ERR_OK) jout(400, ['error' => 'Upload failed (code ' . ($f['error'] ?? '?') . ')']);
    if (($f['size'] ?? 0) > 6291456) jout(400, ['error' => 'Screenshot must be under 6 MB']);
    $ext = strtolower(pathinfo((string)($f['name'] ?? 'p.jpg'), PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) $ext = 'jpg';
    if (!is_dir(__DIR__ . '/uploads/payproofs')) @mkdir(__DIR__ . '/uploads/payproofs', 0755, true);
    $name = 'pp_' . $o['id'] . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], __DIR__ . '/uploads/payproofs/' . $name))
      jout(500, ['error' => 'Could not save the screenshot — check uploads/ permissions (755)']);
    $partAmt = (int)round((float)($_POST['amount'] ?? $o['total']));
    $proof = ['file' => '/uploads/payproofs/' . $name,
      'at' => now_iso(), 'amount' => $partAmt,
      'ref' => substr(trim((string)($_POST['ref'] ?? '')), 0, 60),
      'mode' => 'upi-qr', 'status' => 'submitted'];
    // v60: every proof becomes a ledger line (advances / part payments supported)
    $db['orders'][$i]['payments'] = $db['orders'][$i]['payments'] ?? [];
    $db['orders'][$i]['payments'][] = $proof;
    $alreadyApproved = array_sum(array_map(fn($p) => ($p['status'] ?? '') === 'approved' ? (int)$p['amount'] : 0, $db['orders'][$i]['payments']));
    $db['orders'][$i]['amountPaid'] = $alreadyApproved;
    $db['orders'][$i]['balance'] = max(0, (int)$o['total'] - $alreadyApproved);
    $db['orders'][$i]['paymentStatus'] = 'Proof submitted';
    $db['orders'][$i]['payProof'] = $proof;   // latest proof, for simple UI
    $db['orders'][$i]['gateway'] = 'upi-qr';
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'order' => $db['orders'][$i]]);
  }
  if ($route === 'admin/pay-proofs' && $method === 'GET') {
    need_admin($db);
    $pend = array_values(array_filter($db['orders'], fn($x) => ($x['paymentStatus'] ?? '') === 'Proof submitted' || !empty($x['payProof'])));
    jout(200, ['orders' => array_reverse($pend)]);
  }
  if ($route === 'admin/pay-proof' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    $decision = (string)($b['decision'] ?? '');
    foreach ($db['orders'] as $idx => $ord) if (($ord['id'] ?? '') === (string)($b['orderId'] ?? '')) {
      if ($decision === 'approve') {
        // approve the latest submitted proof (or an admin-entered manual amount)
        $manualAmt = isset($b['amount']) ? (int)round((float)$b['amount']) : 0;
        if ($manualAmt > 0) {
          order_add_payment($db['orders'][$idx], ['amount' => $manualAmt, 'mode' => substr((string)($b['mode'] ?? 'cash'), 0, 12), 'ref' => substr((string)($b['ref'] ?? ''), 0, 60), 'at' => now_iso(), 'status' => 'approved']);
        } else {
          $pays =& $db['orders'][$idx]['payments'];
          for ($k = count($pays) - 1; $k >= 0; $k--) { if (($pays[$k]['status'] ?? '') === 'submitted') { $pays[$k]['status'] = 'approved'; $pays[$k]['approvedAt'] = now_iso(); break; } }
          unset($pays);
          $paid = array_sum(array_map(fn($p) => ($p['status'] ?? '') === 'approved' ? (int)$p['amount'] : 0, $db['orders'][$idx]['payments'] ?? []));
          $db['orders'][$idx]['amountPaid'] = $paid;
          $db['orders'][$idx]['balance'] = max(0, (int)$ord['total'] - $paid);
          $db['orders'][$idx]['paymentStatus'] = $paid >= (int)$ord['total'] ? 'Paid' : ($paid > 0 ? 'Partially paid' : 'Awaiting payment');
          if ($db['orders'][$idx]['paymentStatus'] === 'Paid') $db['orders'][$idx]['paidAt'] = now_iso();
        }
        $db['orders'][$idx]['gateway'] = 'upi-qr';
        audit_log($db, 'payment.approved', ['order' => $ord['id'], 'manual' => $manualAmt]);
      } else {
        $pays =& $db['orders'][$idx]['payments'];
        for ($k = count($pays) - 1; $k >= 0; $k--) { if (($pays[$k]['status'] ?? '') === 'submitted') { $pays[$k]['status'] = 'rejected'; $pays[$k]['rejectNote'] = substr((string)($b['note'] ?? ''), 0, 200); break; } }
        unset($pays);
        $paid = array_sum(array_map(fn($p) => ($p['status'] ?? '') === 'approved' ? (int)$p['amount'] : 0, $db['orders'][$idx]['payments'] ?? []));
        $db['orders'][$idx]['paymentStatus'] = $paid > 0 ? 'Partially paid' : 'Awaiting payment';
        $db['orders'][$idx]['balance'] = max(0, (int)$ord['total'] - $paid);
        if (!empty($db['orders'][$idx]['payProof'])) {
          $db['orders'][$idx]['payProof']['rejectedAt'] = now_iso();
          $db['orders'][$idx]['payProof']['rejectNote'] = substr((string)($b['note'] ?? ''), 0, 200);
        }
        audit_log($db, 'payment.proof-rejected', ['order' => $ord['id']]);
      }
      db_save($DB_FILE, $db);
      jout(200, ['ok' => true, 'order' => $db['orders'][$idx]]);
    }
    jout(404, ['error' => 'Order not found']);
  }

  /* ── catalogs (uploads) ── */
  if ($route === 'catalogs' && $method === 'GET') {
    $u0 = req_user($db);
    if (!$u0 || ($u0['role'] !== 'partner' && $u0['role'] !== 'admin')) jout(200, ['catalogs' => [], 'gated' => true]);
    $list = $db['catalogs'];
    usort($list, fn($a, $b) => ($b['featured'] ? 1 : 0) - ($a['featured'] ? 1 : 0) ?: strcmp($b['addedAt'], $a['addedAt']));
    jout(200, ['catalogs' => $list]);
  }
  if ($route === 'catalogs' && $method === 'POST') {
    need_admin($db);
    if (empty($_FILES['file'])) jout(400, ['error' => 'No file']);
    if (substr((string)@file_get_contents($_FILES['file']['tmp_name'], false, null, 0, 5), 0, 4) !== '%PDF') jout(400, ['error' => 'Catalogue must be a real PDF file']);
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) jout(400, ['error' => 'Upload failed (code ' . $f['error'] . ')']);
    if (($f['size'] ?? 0) > 26214400) jout(400, ['error' => 'File too large (max 25 MB)']);
    $safe = substr(preg_replace('/[^\w.\-]+/', '_', (string)($f['name'] ?? 'catalog.pdf')), -80) ?: 'catalog.pdf';
    if (strtolower(pathinfo($safe, PATHINFO_EXTENSION)) !== 'pdf') $safe .= '.pdf';
    $name = 'cat_' . bin2hex(random_bytes(4)) . '_' . $safe;
    if (!is_dir($CAT_DIR)) mkdir($CAT_DIR, 0755, true);
    if (!move_uploaded_file($f['tmp_name'], $CAT_DIR . '/' . $name)) jout(500, ['error' => 'Could not save file — check uploads/catalogs permissions (755)']);
    $cat = ['id' => uid('cat'), 'title' => $_POST['title'] ?? $safe, 'desc' => $_POST['desc'] ?? '',
            'category' => $_POST['category'] ?? 'General', 'featured' => in_array(($_POST['featured'] ?? ''), ['true', 'on', '1']),
            'file' => '/uploads/catalogs/' . $name, 'size' => (int)$f['size'], 'addedAt' => now_iso(), 'downloads' => 0];
    $db['catalogs'][] = $cat; db_save($DB_FILE, $db);
    jout(200, $cat);
  }
  if (preg_match('#^catalogs/([\w-]+)$#', $route, $m)) {
    if ($method === 'PUT') {
      need_admin($db);
      $b = body_json();
      foreach ($db['catalogs'] as &$c) if ($c['id'] === $m[1]) {
        foreach (['title', 'desc', 'category', 'featured'] as $k) if (array_key_exists($k, $b)) $c[$k] = $b[$k];
        $cat = $c;
      }
      db_save($DB_FILE, $db); jout(200, $cat ?? ['error' => 'Not found']);
    }
    if ($method === 'DELETE') {
      need_admin($db);
      foreach ($db['catalogs'] as $i => $c) if ($c['id'] === $m[1]) {
        @unlink($ROOT . $c['file']);
        array_splice($db['catalogs'], $i, 1);
      }
      db_save($DB_FILE, $db); jout(200, ['ok' => true]);
    }
  }

  /* ── KYC ── */
  if ($route === 'kyc/check-gstin' && $method === 'POST') jout(200, gstin_check((string)(body_json()['gstin'] ?? '')));
  if ($route === 'kyc/gst-lookup' && $method === 'POST') {
    $g = strtoupper(trim((string)(body_json()['gstin'] ?? '')));
    $chk = gstin_check($g);
    if (!$chk['valid']) jout(400, ['error' => $chk['reason']]);
    $cfg = $db['settings']['gstApi'] ?? [];
    if (empty($cfg['key'])) jout(200, ['configured' => false, 'note' => 'Add a GST API key in Admin → Settings to auto-verify legal names online']);
    $url = ($cfg['url'] ?? 'https://api.mastersindia.co/v2/gstin/') . '?gstin=' . urlencode($g);
    $ctx = stream_context_create(['http' => ['timeout' => 8, 'header' => 'Authorization: Bearer ' . $cfg['key'] . "\r\n"]]);
    $raw = @file_get_contents($url, false, $ctx);
    $j = $raw ? json_decode($raw, true) : null;
    $name = $j['legalName'] ?? $j['taxpayerName'] ?? $j['tradeNam'] ?? ($j['data']['legalName'] ?? ($j['data']['tradeNam'] ?? null));
    if ($name) jout(200, ['configured' => true, 'verified' => true, 'legalName' => trim((string)$name), 'gstin' => $g]);
    jout(200, ['configured' => true, 'verified' => false, 'note' => 'GST service unreachable — admin will verify manually']);
  }
  if ($route === 'kyc/send-otp' && $method === 'POST') {
    $b = body_json();
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Enter a valid 10-digit Indian mobile']);
    foreach (($db['otps'] ?? []) as $o) if (($o['phone'] ?? '') === $phone && time() - $o['at'] < 30) jout(429, ['error' => 'Wait 30 seconds between OTP requests']);
    /* v56 — like the retail login, any valid mobile number receives a code */
    $dest = otp_email_for_phone($db, $phone);
    $hasAccount = $dest !== '';
    $typed = strtolower(trim((string)($b['email'] ?? '')));
    $toNew = false;
    if ($dest === '' && filter_var($typed, FILTER_VALIDATE_EMAIL)) { $dest = $typed; $toNew = true; }

    $code = (string)otp_new_code();
    $db['otps'] = array_values(array_filter($db['otps'] ?? [], fn($o) => $o['exp'] > time() - 3600));
    $db['otps'][] = ['phone' => $phone, 'hash' => hash('sha256', 'shv' . $phone . $code), 'exp' => time() + 300, 'tries' => 0, 'at' => time(), 'verified' => false, 'email' => $dest];
    $d = otp_deliver($db, $phone, $code, $dest, 'verify', $hasAccount ? otp_name_for_phone($db, $phone) : '');
    db_save($DB_FILE, $db);
    if (empty($d['ok'])) jout(502, ['error' => 'The code could not be sent just now — please retry in a minute, or WhatsApp +91 89050 05921.']);
    jout(200, ['ok' => true, 'sent' => true, 'via' => $d['channel'], 'masked' => $d['masked'],
               'devCode' => $d['devCode'] ?? null,
               'message' => 'A 4-digit code is on its way to ' . otp_dest_hint($d) . '.']);
  }
  if ($route === 'kyc/verify-otp' && $method === 'POST') {
    $b = body_json();
    $phone = substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10);
    $found = null;
    for ($i = count($db['otps'] ?? []) - 1; $i >= 0; $i--) if ($db['otps'][$i]['phone'] === $phone) { $found = $i; break; }
    if ($found === null) jout(400, ['error' => 'Request an OTP first']);
    $o = &$db['otps'][$found];
    if ($o['exp'] < time()) jout(400, ['error' => 'OTP expired — request a new one']);
    if ($o['tries'] >= 5) jout(429, ['error' => 'Too many attempts — request a new OTP']);
    $o['tries']++;
    if ($o['hash'] !== hash('sha256', 'shv' . $phone . (string)($b['code'] ?? ''))) { db_save($DB_FILE, $db); jout(400, ['error' => 'Incorrect OTP']); }
    $o['verified'] = true; db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ── SMS gateway admin tools (v33) ── */
  if ($route === 'sms/status' && $method === 'GET') {
    need_admin($db);
    $c = shivaa_sms_config();
    $mc = shivaa_mail_config();
    jout(200, ['configured' => (bool)$c, 'provider' => $c['provider'] ?? null, 'autofill' => (bool)($c['autofill'] ?? true), 'stats' => $db['sms'] ?? null,
               'email' => ['channel' => (bool)$c ? 'sms' : 'email', 'from' => $mc['from'], 'file' => is_file(__DIR__ . '/data/mail-config.json'),
                           'stats' => $db['mail'] ?? null]]);
  }
  if ($route === 'sms/test' && $method === 'POST') {
    need_admin($db);
    $phone = substr(preg_replace('/\D/', '', (string)(body_json()['phone'] ?? '')), -10);
    if (!preg_match('#^[6-9]\d{9}$#', $phone)) jout(400, ['error' => 'Enter a valid 10-digit Indian mobile']);
    $code = otp_new_code();  # v57: 4-digit PIN
    $r = shivaa_sms_send($phone, $code);
    shivaa_sms_log($db, $r); db_save($DB_FILE, $db);
    if ($r['mode'] === 'demo') jout(200, ['ok' => false, 'configured' => false, 'note' => 'No SMS gateway is configured, so one-time codes are being emailed instead. Use the email test to check that channel.']);
    jout($r['ok'] ? 200 : 502, ['ok' => $r['ok'], 'provider' => $r['provider'], 'error' => $r['error'], 'response' => cut500((string)$r['response']), 'hint' => $r['ok'] ? 'Check the phone for the SMS — if it arrived, you are live.' : 'Fix the error, then test again. See OTP-SETUP-GUIDE.md.']);
  }

  /* ── v48: send yourself a real code by email (admin only) ── */
  if ($route === 'mail/test' && $method === 'POST') {
    need_admin($db);
    $to = strtolower(trim((string)(body_json()['email'] ?? '')));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) jout(400, ['error' => 'Enter a valid email address']);
    $code = otp_new_code();  # v57: 4-digit PIN
    $r = shivaa_mail_send($to, $code, 'verify');
    $db['mail'] = $db['mail'] ?? ['sent' => 0, 'ok' => 0, 'lastErr' => null, 'lastAt' => null];
    $db['mail']['sent'] = (int)$db['mail']['sent'] + 1;
    if (!empty($r['ok'])) $db['mail']['ok'] = (int)$db['mail']['ok'] + 1;
    else $db['mail']['lastErr'] = cut500((string)($r['error'] ?? 'unknown'));
    $db['mail']['lastAt'] = now_iso(); $db['mail']['lastTo'] = $r['to'] ?? '';
    db_save($DB_FILE, $db);
    jout($r['ok'] ? 200 : 502, ['ok' => (bool)$r['ok'], 'sentTo' => $r['to'], 'from' => $r['from'] ?? '',
        'error' => $r['ok'] ? null : ($r['error'] ?? 'unknown'),
        'hint' => $r['ok'] ? 'Check that inbox (and the spam folder). When the mail arrives, codes work for every customer.'
                           : 'The host refused to hand the message over — see the error above, or set data/mail-config.json.']);
  }

  /* ── design selection → metal exchange (zero MC) ── */
  if ($route === 'metalexchange/order' && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if ($u['role'] !== 'partner' && $u['role'] !== 'admin') jout(403, ['error' => 'Jeweller partners only — apply on the For Jewellers page']);
    $b = body_json();
    $factor = (float)($db['settings']['metalFactor'] ?? 0.92);
    $purity = $db['settings']['finePurity'] ?? '99.50%';
    $totalWeight = 0; $items = [];
    foreach (($b['items'] ?? []) as $it) {
      foreach ($db['products'] as $prod) if ($prod['id'] === $it['id'] && !empty($prod['active'])) {
        $qty = max(1, (int)($it['qty'] ?? 1));
        $totalWeight += $prod['weightG'] * $qty;
        $items[] = ['productId' => $prod['id'], 'name' => $prod['name'], 'img' => $prod['images'][0] ?? null, 'qty' => $qty, 'weightG' => $prod['weightG'], 'lineWeight' => round($prod['weightG'] * $qty, 3)];
      }
    }
    if (!count($items)) jout(400, ['error' => 'No designs selected']);
    $ord = ['id' => 'MX' . substr((string)time(), -8), 'partnerId' => $u['partnerId'] ?? '', 'partnerName' => $u['name'],
            'items' => $items, 'totalWeightG' => round($totalWeight, 3), 'factor' => $factor,
            'fineGrams' => round($totalWeight * $factor, 2), 'purity' => $purity,
            'makingCharges' => 0, 'note' => $b['note'] ?? '', 'status' => 'New', 'createdAt' => now_iso()];
    $db['metalOrders'][] = $ord; db_save($DB_FILE, $db); jout(200, $ord);
  }
  if ($route === 'metalexchange/orders' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if ($u['role'] !== 'partner' && $u['role'] !== 'admin') jout(403, ['error' => 'Jeweller partners only — apply on the For Jewellers page']);
    $list = $db['metalOrders'] ?? [];
    if ($u['role'] !== 'admin') $list = array_values(array_filter($list, fn($o) => ($o['partnerId'] ?? '') === ($u['partnerId'] ?? '')));
    jout(200, ['orders' => array_reverse($list)]);
  }
  if (preg_match('#^metalexchange/orders/([\w-]+)$#', $route, $mMX) && $method === 'PUT') {
    $u = req_user($db); if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    foreach (($db['metalOrders'] ?? []) as &$o) if ($o['id'] === $mMX[1]) { $o['status'] = body_json()['status'] ?? $o['status']; $out = $o; }
    if (empty($out)) jout(404, ['error' => 'Order not found']);
    db_save($DB_FILE, $db); jout(200, $out);
  }
  /* ── custom design orders (image upload) ── */
  if ($route === 'customorder' && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $fields = $_POST; $file = null;
    if (!empty($_FILES['design']) && $_FILES['design']['error'] === UPLOAD_ERR_OK && $_FILES['design']['size'] < 8388608) {
      $ext = strtolower(pathinfo($_FILES['design']['name'], PATHINFO_EXTENSION));
      $magic = function(string $path): bool {
        $h = @fopen($path, 'rb'); if (!$h) return false;
        $head = fread($h, 12); fclose($h);
        $sigs = ["\xFF\xD8\xFF", "\x89PNG", "GIF8", "RIFF"];
        foreach ($sigs as $s) if (substr($head, 0, strlen($s)) === $s) return true;
        return false;
      };
      if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif']) && $magic($_FILES['design']['tmp_name'])) {
        if (!is_dir(__DIR__ . '/uploads/designs')) mkdir(__DIR__ . '/uploads/designs', 0755, true);
        $name = 'design_' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (move_uploaded_file($_FILES['design']['tmp_name'], __DIR__ . '/uploads/designs/' . $name)) $file = '/uploads/designs/' . $name;
      }
    }
    if (empty($fields['name']) || empty($fields['weight'])) jout(400, ['error' => 'Product name & weight required']);
    $ord = ['id' => 'CO' . substr((string)time(), -8), 'partnerId' => $u['partnerId'] ?? '', 'partnerName' => $u['name'],
            'name' => cut500($fields['name']), 'weightG' => (float)$fields['weight'], 'melting' => (float)($fields['melting'] ?? 0),
            'advance' => (float)($fields['advance'] ?? 0), 'size' => cut500($fields['size'] ?? ''), 'note' => cut500($fields['note'] ?? ''),
            'designImg' => $file, 'status' => 'New', 'createdAt' => now_iso()];
    $db['customOrders'][] = $ord; db_save($DB_FILE, $db); jout(200, $ord);
  }
  if ($route === 'customorder' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $list = $db['customOrders'] ?? [];
    if ($u['role'] !== 'admin') $list = array_values(array_filter($list, fn($o) => ($o['partnerId'] ?? '') === ($u['partnerId'] ?? '')));
    jout(200, ['orders' => array_reverse($list)]);
  }

  /* ── bullion (jeweller-only) ── */
  if ($route === 'bullion' && $method === 'GET') {
    $u = req_user($db); if (!$u || ($u['role'] !== 'partner' && $u['role'] !== 'admin')) jout(403, ['error' => 'Jeweller access only']);
    // v73 — opening/polling the desk also keeps the dollar/FX side fresh
    if (rates_stale($db)) { rates_refresh($db); db_save($DB_FILE, $db); }
    $out = bullion_rows($db);
    /* v60 — attach this jeweller's rate alerts / unfix requests with live reached state */
    $byKey = [];
    foreach ($out['rows'] as $rr) $byKey[$rr['key']] = $rr;
    $myAlerts = array_values(array_filter($db['bullionAlerts'] ?? [], fn($a) => ($a['userId'] ?? '') === $u['id'] && empty($a['removed'])));
    foreach ($myAlerts as &$al) {
      $rr = $byKey[$al['key']] ?? null;
      $now = $rr ? (float)($al['side'] === 'buy' ? $rr['buy'] : $rr['sell']) : 0;
      $al['rateNow'] = $now;
      $al['reached'] = $now > 0 && ($al['dir'] === 'below' ? $now <= (float)$al['target'] : $now >= (float)$al['target']);
    }
    unset($al);
    $out['alerts'] = array_reverse($myAlerts);
    $newsFresh = is_array($db['bullion']['newsCache'] ?? null) && (time() - (int)($db['bullion']['newsCache']['fetchedAt'] ?? 0)) < 2700;
    $out['news'] = bullion_news($db);
    if (!$newsFresh) db_save($DB_FILE, $db);   // news cache refreshed (~every 45 min)
    jout(200, $out);
  }
  /* v69 — per-second tick (shared server micro-cache, one exchange call/sec).
     v74 — same response also carries the ~1 s live international spot. */
  if ($route === 'bullion/tick' && $method === 'GET') {
    $u = req_user($db); if (!$u || ($u['role'] !== 'partner' && $u['role'] !== 'admin')) jout(403, ['error' => 'Jeweller access only']);
    $t = angel_tick($db);
    $t['spot'] = spot_tick($db, $t);
    jout(200, $t);
  }
  if ($route === 'bullion/cash' && $method === 'PUT') {
    $u = req_user($db); if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    $b = body_json();
    if (!isset($db['bullion']['cash'])) $db['bullion'] = bullion_defaults();
    foreach ($db['bullion']['cash'] as $k => $c) $db['bullion']['prev'][$k] = ['buy' => $c['buy'], 'sell' => $c['sell']];
    foreach (($b['cash'] ?? []) as $k => $v) if (isset($db['bullion']['cash'][$k])) { $db['bullion']['cash'][$k]['buy'] = (int)$v['buy']; $db['bullion']['cash'][$k]['sell'] = (int)$v['sell']; }
    $db['bullion']['updatedAt'] = now_iso(); $db['bullion']['updatedBy'] = $u['name'];
    audit_log($db, 'bullion.cash-rates-set', ['by' => $u['name']]);
    db_save($DB_FILE, $db); jout(200, ['ok' => true] + bullion_rows($db));
  }
  /* v68 — RTGS board calibration: per-row factor / premium / spread / side */
  if ($route === 'bullion/rtgs' && $method === 'PUT') {
    $u = req_user($db); if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    $b = body_json();
    $allowed = ['tdsGold9999', 'tdsGold995', 'silverChorsa', 'silverPeti', 'goldIndian',
      'goldRef9930', 'silverKachcha', 'silverPetiBulk', 'silverGrn999'];
    $db['bullion']['rtgs'] = is_array($db['bullion']['rtgs'] ?? null) ? $db['bullion']['rtgs'] : [];
    foreach (($b['rows'] ?? []) as $k => $v) {
      if (!in_array($k, $allowed, true) || !is_array($v)) continue;
      $factor = (float)($v['factor'] ?? 1); if ($factor < 0.5 || $factor > 1.2) continue;
      $prem = (float)($v['prem'] ?? 0); $spread = (float)($v['spread'] ?? 0);
      if ($prem < -50000 || $prem > 50000 || $spread < 0 || $spread > 50000) continue;
      $side = (string)($v['side'] ?? 'both');
      if (!in_array($side, ['both', 'buy', 'sell', 'off'], true)) $side = 'both';
      $db['bullion']['rtgs'][$k] = ['factor' => round($factor, 4),
        'prem' => round($prem, 1), 'spread' => round($spread, 1), 'side' => $side];
    }
    foreach (['bullionGoldDutyMult' => [0.8, 3.0], 'bullionSilverDutyMult' => [0.8, 3.0]] as $sk => $lim) {
      if (isset($b[$sk])) {
        $mv = (float)$b[$sk];
        if ($mv >= $lim[0] && $mv <= $lim[1]) $db['settings'][$sk] = round($mv, 4);
      }
    }
    $db['bullion']['updatedAt'] = now_iso();
    audit_log($db, 'bullion.rtgs-calibration', ['by' => $u['name']]);
    db_save($DB_FILE, $db); jout(200, ['ok' => true] + bullion_rows($db));
  }
  /* v60 — rate alerts & unfix requests from the bullion desk */
  if ($route === 'bullion/alert' && $method === 'POST') {
    $u = req_user($db); if (!$u || ($u['role'] !== 'partner' && $u['role'] !== 'admin')) jout(403, ['error' => 'Jeweller access only']);
    $b = body_json();
    $kind = ($b['kind'] ?? '') === 'unfix' ? 'unfix' : 'rate';
    if ($kind === 'rate' && (float)($b['target'] ?? 0) <= 0) jout(400, ['error' => 'Enter a target rate']);
    if (count(array_filter($db['bullionAlerts'], fn($a) => ($a['userId'] ?? '') === $u['id'] && empty($a['removed']))) >= 25)
      jout(400, ['error' => 'You already have 25 active alerts — remove one first']);
    $al = ['id' => uid('ba'), 'userId' => $u['id'], 'partnerName' => $u['name'], 'kind' => $kind,
      'key' => substr((string)($b['key'] ?? ''), 0, 40), 'label' => substr((string)($b['label'] ?? ''), 0, 80),
      'side' => ($b['side'] ?? 'buy') === 'sell' ? 'sell' : 'buy',
      'dir' => ($b['dir'] ?? 'below') === 'above' ? 'above' : 'below',
      'target' => (float)($b['target'] ?? 0), 'note' => substr((string)($b['note'] ?? ''), 0, 200),
      'at' => now_iso(), 'removed' => false];
    $db['bullionAlerts'][] = $al;
    audit_log($db, 'bullion.alert', ['kind' => $kind, 'label' => $al['label'], 'target' => $al['target'], 'by' => $u['name']]);
    db_save($DB_FILE, $db); jout(200, $al);
  }
  if (preg_match('#^bullion/alert/([\w-]+)/remove$#', $route, $mBAR) && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    foreach ($db['bullionAlerts'] as &$a) if ($a['id'] === $mBAR[1] && (($a['userId'] ?? '') === $u['id'] || $u['role'] === 'admin')) $a['removed'] = true;
    unset($a); db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'bullion/order' && $method === 'POST') {
    $u = req_user($db); if (!$u || ($u['role'] !== 'partner' && $u['role'] !== 'admin')) jout(403, ['error' => 'Jeweller access only']);
    $b = body_json();
    if (empty($b['side']) || empty($b['metal']) || empty($b['qty'])) jout(400, ['error' => 'side, metal & qty required']);
    $rows = bullion_rows($db)['rows'];
    $br = null; foreach ($rows as $r0) if ($r0['key'] === ($b['metKey'] ?? '')) $br = $r0;
    $rate = $br ? ($b['side'] === 'buy' ? $br['buy'] : $br['sell']) : 0;
    $mult = ($b['unit'] ?? 'kg') === 'kg' ? 1000 : 1;
    $ord = ['id' => 'BL' . substr((string)time(), -8), 'side' => $b['side'], 'metKey' => $b['metKey'] ?? '', 'metal' => $b['metal'], 'mode' => $br['mode'] ?? '',
            'qty' => (float)$b['qty'], 'unit' => $b['unit'] ?? 'kg', 'rate' => $rate,
            'amount' => (int)round($rate * (float)$b['qty'] * $mult), 'note' => $b['note'] ?? '',
            'partnerId' => $u['partnerId'] ?? '', 'partnerName' => $u['name'], 'status' => 'New', 'createdAt' => now_iso()];
    $db['bullionOrders'][] = $ord; db_save($DB_FILE, $db); jout(200, $ord);
  }
  if (preg_match('#^bullion/orders/([\w-]+)$#', $route, $mBLO) && $method === 'PUT') {
    $u = req_user($db); if (!$u || $u['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    foreach (($db['bullionOrders'] ?? []) as &$o) if ($o['id'] === $mBLO[1]) { $o['status'] = body_json()['status'] ?? $o['status']; $out = $o; }
    if (empty($out)) jout(404, ['error' => 'Order not found']);
    db_save($DB_FILE, $db); jout(200, $out);
  }
  if ($route === 'bullion/orders' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']); if ($u['role'] !== 'partner' && $u['role'] !== 'admin') jout(403, ['error' => 'Jeweller partners only — apply on the For Jewellers page']);
    $list = $db['bullionOrders'] ?? [];
    if ($u['role'] !== 'admin') $list = array_values(array_filter($list, fn($o) => ($o['partnerId'] ?? '') === ($u['partnerId'] ?? '')));
    jout(200, ['orders' => array_reverse($list)]);
  }

  /* ── partners (full KYC) ── */
  if ($route === 'partners/apply' && $method === 'POST') {
    $b = body_json();
    if (empty($b['firm']) || empty($b['email']) || empty($b['phone']) || empty($b['password'])) jout(400, ['error' => 'Firm, email, phone & password required']);
    $gst = gstin_check((string)($b['gstin'] ?? ''));
    if (!$gst['valid']) jout(400, ['error' => 'GSTIN invalid: ' . $gst['reason']]);
    $otpOk = false;
    foreach (($db['otps'] ?? []) as $o) if ($o['phone'] === substr((string)$b['phone'], -10) && !empty($o['verified']) && $o['exp'] > time() - 3600) $otpOk = true;
    if (!$otpOk) jout(400, ['error' => 'Verify your phone with OTP first']);
    foreach ($db['users'] as $u) if (strtolower($u['email']) === strtolower((string)$b['email'])) jout(409, ['error' => 'Email already registered — login instead']);
    $pr = ['id' => uid('pt'), 'firm' => $b['firm'], 'contactPerson' => $b['contactPerson'] ?? '', 'city' => $b['city'] ?? $gst['state'],
           'phone' => $b['phone'], 'email' => strtolower($b['email']),
           'kyc' => ['gstin' => strtoupper((string)$b['gstin']), 'gstinValid' => true, 'gstinState' => $gst['state'], 'pan' => $gst['pan'], 'ownerPan' => strtoupper((string)($b['ownerPan'] ?? '')), 'otpVerified' => true, 'at' => now_iso()],
           'message' => $b['message'] ?? '', 'status' => 'pending', 'appliedAt' => now_iso()];
    $db['partners'][] = $pr;
    $u = ['id' => uid('u'), 'name' => $b['firm'], 'email' => strtolower($b['email']), 'phone' => $b['phone'],
          'passHash' => pw_hash((string)$b['password']), 'role' => 'partner', 'partnerId' => $pr['id'],
          'loyaltyPoints' => 0, 'wishlist' => [], 'createdAt' => now_iso()];
    $db['users'][] = $u;
    $tk = issue_token($db, $u);
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'id' => $pr['id'], 'token' => $tk, 'user' => pub_user($u)]);
  }
  if ($route === 'partners' && $method === 'GET') { need_admin($db); jout(200, ['partners' => $db['partners']]); }
  /* ── v30: admin sets/ resets any user's portal password ── */
  if (preg_match('#^users/([\w-]+)/password$#', $route, $m) && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    if (strlen((string)($b['password'] ?? '')) < 8) jout(400, ['error' => 'Password must be at least 8 characters']);
    $target = null; $ti = -1;
    foreach ($db['users'] as $i => $u) if ($u['id'] === $m[1]) { $target = $u; $ti = $i; break; }
    if (!$target) jout(404, ['error' => 'User not found']);
    $db['users'][$ti]['passHash'] = pw_hash((string)$b['password']);
    unset($db['users'][$ti]['salt']);
    /* Kill every live session for THAT user so the new password takes effect.
       db['tokens'] is keyed by the token string, so rebuild it key-for-key —
       array_values() here would have signed out every other user on the site. */
    $kept = [];
    foreach (($db['tokens'] ?? []) as $tk => $t) if (($t['userId'] ?? '') !== $m[1]) $kept[$tk] = $t;
    $db['tokens'] = $kept;
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'email' => $target['email']]);
  }
  if (preg_match('#^partners/([\w-]+)$#', $route, $m) && $method === 'PUT') {
    need_admin($db);
    $st = body_json()['status'] ?? null;
    foreach ($db['partners'] as &$pr) if ($pr['id'] === $m[1]) {
      $pr['status'] = $st ?: $pr['status'];
      if ($pr['status'] === 'approved' && empty($pr['joined'])) {
        $pr['joined'] = now_iso();
        foreach ($db['users'] as &$u) if (strtolower($u['email']) === strtolower($pr['email'])) { $u['role'] = 'partner'; $u['partnerId'] = $pr['id']; }
        for ($w = 5; $w >= 1; $w--) {
          $sales = (int)round(((mt_rand(250, 950)) / 100) * 100000);
          $db['settlements'][] = ['partnerId' => $pr['id'], 'weekEnding' => date('Y-m-d', time() - $w * 7 * 86400),
                                  'sales' => $sales, 'orders' => mt_rand(4, 22), 'payout' => (int)round($sales * 0.985), 'status' => 'Paid'];
        }
      }
      $out = $pr;
    }
    db_save($DB_FILE, $db); jout(200, $out ?? ['error' => 'Not found']);
  }
  if ($route === 'partners/me' && $method === 'GET') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $pid = $u['partnerId'] ?? ($db['partners'][0]['id'] ?? '');
    $pr = null; foreach ($db['partners'] as $x) if ($x['id'] === $pid) $pr = $x;
    $set = array_values(array_filter($db['settlements'], fn($s) => $s['partnerId'] === $pid));
    jout(200, ['partner' => $pr, 'settlements' => $set]);
  }

  /* ── leads / services / misc ── */
  if ($route === 'services' && $method === 'POST') {
    $b = body_json();
    if (empty($b['name']) || empty($b['phone'])) jout(400, ['error' => 'Name & phone required']);
    $su = req_user($db);
    $rec = ['id' => uid('sr'), 'type' => $b['type'] ?? '', 'name' => $b['name'], 'phone' => preg_replace('/\D/', '', (string)$b['phone']),
            'userId' => $su['id'] ?? '', 'orderId' => substr((string)($b['orderId'] ?? ''), 0, 24),
            'email' => $b['email'] ?? '', 'details' => $b['details'] ?? '', 'budget' => $b['budget'] ?? '',
            'status' => 'new', 'history' => [['s' => 'Booked', 't' => now_iso()]], 'createdAt' => now_iso()];
    $db['serviceRequests'][] = $rec;
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'request' => $rec]);
  }
  if ($route === 'services/mine' && $method === 'GET') {
    $su = req_user($db);
    if (!$su) jout(401, ['error' => 'Login required']);
    $mine = array_values(array_filter($db['serviceRequests'],
      fn($r) => ($r['userId'] ?? '') === $su['id'] || substr((string)($r['phone'] ?? ''), -10) === substr((string)($su['phone'] ?? ''), -10)));
    jout(200, ['requests' => array_reverse($mine)]);
  }
  if (preg_match('#^services/([\w-]+)/status$#', $route, $mS)) {
    need_admin($db);
    $b = body_json();
    foreach ($db['serviceRequests'] as $si => $sr) if ($sr['id'] === $mS[1]) {
      $st = substr((string)($b['status'] ?? ''), 0, 30);
      if ($st) { $db['serviceRequests'][$si]['status'] = $st; $db['serviceRequests'][$si]['history'][] = ['s' => $st, 't' => now_iso()]; }
      db_save($DB_FILE, $db); jout(200, ['ok' => true, 'request' => $db['serviceRequests'][$si]]);
    }
    jout(404, ['error' => 'Request not found']);
  }
  if ($route === 'services' && $method === 'GET') { need_admin($db); jout(200, ['requests' => array_reverse($db['serviceRequests'])]); }
  if ($route === 'ev' && $method === 'POST') {
    pub_rate($db, $DB_FILE, 'ev', 240);
    $b = body_json();
    $ev = (string)($b['ev'] ?? '');
    if (in_array($ev, ['view', 'cart', 'checkout'], true)) {
      $db['events'][] = ['t' => now_iso(), 'ev' => $ev, 'p' => substr((string)($b['p'] ?? ''), 0, 60)];
      if (count($db['events']) > 5000) $db['events'] = array_slice($db['events'], -5000);
      db_save($DB_FILE, $db);
    }
    jout(200, ['ok' => true]);
  }
  if ($route === 'carts/abandon' && $method === 'POST') {
    pub_rate($db, $DB_FILE, 'cart', 10);
    $b = body_json();
    $items = array_slice(array_map(fn($i) => ['n' => substr((string)($i['n'] ?? ''), 0, 60), 'q' => max(1, (int)($i['q'] ?? 1))], (array)($b['items'] ?? [])), 0, 12);
    if (!$items) jout(400, ['error' => 'empty cart']);
    $db['carts'][] = ['id' => uid('ac'), 'items' => $items, 'total' => (float)($b['total'] ?? 0),
                      'phone' => substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10), 'at' => now_iso()];
    if (count($db['carts']) > 200) $db['carts'] = array_slice($db['carts'], -200);
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'admin/carts' && $method === 'GET') {
    need_admin($db);
    jout(200, ['carts' => array_reverse(array_slice($db['carts'] ?? [], -30))]);
  }
  if ($route === 'admin/order-meta' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    foreach ($db['orders'] as $i => $ord) if (($ord['id'] ?? '') === (string)($b['orderId'] ?? '')) {
      foreach (['huid', 'courier', 'awb', 'insuredValue', 'ewaybill', 'dispatchNote'] as $k)
        if (isset($b[$k])) $db['orders'][$i][$k] = substr((string)$b[$k], 0, 120);
      db_save($DB_FILE, $db); jout(200, ['ok' => true]);
    }
    jout(404, ['error' => 'Order not found']);
  }
  if ($route === 'admin/gold-purchases' && $method === 'GET') {
    need_admin($db);
    jout(200, ['purchases' => array_reverse($db['goldPurchases'] ?? [])]);
  }
  if ($route === 'admin/gold-purchases' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    $wt = (float)($b['weightG'] ?? 0);
    if ($wt <= 0) jout(400, ['error' => 'Enter the weight in grams']);
    $rate = (float)($b['ratePerG'] ?? 0);
    if ($rate <= 0) jout(400, ['error' => 'Enter the rate per gram paid']);
    $ded = (float)($b['deductions'] ?? 0);
    $rec = [
      'id' => uid('gp'), 'createdAt' => now_iso(),
      'sellerName' => substr(trim((string)($b['sellerName'] ?? '')), 0, 120),
      'sellerPhone' => substr(preg_replace('/\D/', '', (string)($b['sellerPhone'] ?? '')), -10),
      'idDoc' => substr(trim((string)($b['idDoc'] ?? '')), 0, 60),
      'weightG' => round($wt, 3), 'purity' => in_array($b['purity'] ?? '', ['24K','22K','18K','14K','925','other'], true) ? $b['purity'] : '22K',
      'ratePerG' => round($rate, 2), 'deductions' => round($ded),
      'amount' => (int)round($wt * $rate - $ded),
      'settledAs' => in_array($b['settledAs'] ?? '', ['cash','bank','exchange','credit'], true) ? $b['settledAs'] : 'cash',
      'note' => substr(trim((string)($b['note'] ?? '')), 0, 300),
    ];
    if ($rec['sellerName'] === '') jout(400, ['error' => 'Seller name required for the register']);
    $db['goldPurchases'][] = $rec;
    db_save($DB_FILE, $db);
    jout(200, ['ok' => true, 'purchase' => $rec]);
  }

  if ($route === 'admin/rate-alerts' && $method === 'GET') {
    need_admin($db);
    $alerts = array_reverse($db['rateAlerts'] ?? []);
    $live = current_rates($db);
    // tag alerts whose target has been reached so the counter can act today
    foreach ($alerts as &$a) {
      $cur = (float)($live[$a['metal'] ?? 'gold22'] ?? 0);
      $a['currentRate'] = $cur;
      $a['reached'] = $cur > 0 && (float)($a['target'] ?? 0) >= $cur ? 1 : 0;
    }
    unset($a);
    jout(200, ['alerts' => array_slice($alerts, 0, 300)]);
  }

  /* ════════ v59 · karigar (craftsman) job-work book ════════
     Metal issued by weight/purity is reconciled on return: wastage is
     agreed up front and the job charge + advances are tracked as a ledger. */
  if ($route === 'admin/karigars' && $method === 'GET') {
    need_admin($db);
    jout(200, ['karigars' => $db['karigars'], 'jobs' => array_reverse($db['jobWork'])]);
  }
  if ($route === 'admin/karigars' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    $name = trim((string)($b['name'] ?? ''));
    if ($name === '') jout(400, ['error' => 'Karigar name required']);
    $rec = ['id' => uid('kg'), 'name' => substr($name, 0, 120),
            'phone' => substr(preg_replace('/\D/', '', (string)($b['phone'] ?? '')), -10),
            'speciality' => substr(trim((string)($b['speciality'] ?? '')), 0, 120),
            'note' => substr(trim((string)($b['note'] ?? '')), 0, 300), 'createdAt' => now_iso()];
    $db['karigars'][] = $rec; db_save($DB_FILE, $db); jout(200, ['ok' => true, 'karigar' => $rec]);
  }
  if ($route === 'admin/job-work' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    if (empty($b['karigarId'])) jout(400, ['error' => 'Pick the karigar']);
    $kg = null; foreach ($db['karigars'] as $k) if ($k['id'] === $b['karigarId']) $kg = $k;
    if (!$kg) jout(400, ['error' => 'Karigar not found']);
    $wt = (float)($b['weightOut'] ?? 0);
    if ($wt <= 0) jout(400, ['error' => 'Enter metal weight issued (g)']);
    $rec = ['id' => uid('jw'), 'karigarId' => $b['karigarId'], 'karigarName' => $kg['name'],
      'itemDesc' => substr(trim((string)($b['itemDesc'] ?? 'Job work')), 0, 200),
      'orderId' => substr(trim((string)($b['orderId'] ?? '')), 0, 24),
      'weightOut' => round($wt, 3), 'purity' => in_array($b['purity'] ?? '', ['24K', '22K', '18K', '14K', '925'], true) ? $b['purity'] : '22K',
      'wastagePct' => round((float)($b['wastagePct'] ?? 8), 2),
      'jobCharge' => (int)round((float)($b['jobCharge'] ?? 0)),
      'advance' => (int)round((float)($b['advance'] ?? 0)),
      'dueDate' => substr((string)($b['dueDate'] ?? ''), 0, 10),
      'note' => substr(trim((string)($b['note'] ?? '')), 0, 300),
      'weightBack' => null, 'status' => 'with karigar',
      'createdAt' => now_iso(), 'history' => [['s' => 'Metal issued', 't' => now_iso()]]];
    $db['jobWork'][] = $rec;
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'job' => $rec]);
  }
  if (preg_match('#^admin/job-work/([\w-]+)$#', $route, $mJW) && $method === 'PUT') {
    need_admin($db);
    $b = body_json();
    foreach ($db['jobWork'] as $ji => $j) if ($j['id'] === $mJW[1]) {
      if (isset($b['weightBack']) && (float)$b['weightBack'] > 0) $db['jobWork'][$ji]['weightBack'] = round((float)$b['weightBack'], 3);
      if (!empty($b['status'])) { $db['jobWork'][$ji]['status'] = substr((string)$b['status'], 0, 30); $db['jobWork'][$ji]['history'][] = ['s' => $b['status'], 't' => now_iso()]; }
      if (isset($b['extraCharge'])) $db['jobWork'][$ji]['extraCharge'] = (int)round((float)$b['extraCharge']);
      if (isset($b['paid'])) {
        $db['jobWork'][$ji]['advance'] = (int)($db['jobWork'][$ji]['advance'] ?? 0) + (int)round((float)$b['paid']);
        $db['jobWork'][$ji]['history'][] = ['s' => 'Paid ₹' . (int)round((float)$b['paid']), 't' => now_iso()];
      }
      db_save($DB_FILE, $db); jout(200, ['ok' => true, 'job' => $db['jobWork'][$ji]]);
    }
    jout(404, ['error' => 'Job not found']);
  }

  /* ════════ v59 · daily cash book + day-close ════════ */
  if ($route === 'admin/cashbook' && $method === 'GET') {
    need_admin($db);
    $day = substr((string)($_GET['date'] ?? date('Y-m-d')), 0, 10);
    $rows = array_values(array_filter($db['cashbook'], fn($r) => substr((string)($r['at'] ?? ''), 0, 10) === $day));
    // system-derived figures: paid orders today, old-gold payouts today
    $orderSales = 0; $onlineSales = 0; $codSales = 0; $waSales = 0;
    foreach ($db['orders'] as $o) {
      if (substr((string)($o['createdAt'] ?? ''), 0, 10) !== $day || ($o['status'] ?? '') === 'Cancelled') continue;
      $orderSales += (int)($o['total'] ?? 0);
      if (($o['paymentMethod'] ?? '') === 'COD') $codSales += (int)$o['total'];
      elseif (($o['paymentMethod'] ?? '') === 'WhatsApp') $waSales += (int)$o['total'];
      else $onlineSales += (int)$o['total'];
    }
    $goldPaid = 0;
    foreach ($db['goldPurchases'] as $g) if (substr((string)($g['createdAt'] ?? ''), 0, 10) === $day) $goldPaid += (int)$g['amount'];
    jout(200, ['date' => $day, 'rows' => array_reverse($rows),
      'orderSales' => $orderSales, 'onlineSales' => $onlineSales, 'codSales' => $codSales, 'waSales' => $waSales,
      'oldGoldOut' => $goldPaid]);
  }
  if ($route === 'admin/cashbook' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    $amt = round((float)($b['amount'] ?? 0), 2);
    if ($amt <= 0) jout(400, ['error' => 'Enter an amount']);
    $head = substr(trim((string)($b['head'] ?? '')), 0, 120);
    if ($head === '') jout(400, ['error' => 'Enter a note (head)']);
    $rec = ['id' => uid('cb'), 'kind' => in_array($b['kind'] ?? '', ['in', 'out'], true) ? $b['kind'] : 'out',
      'head' => $head, 'amount' => $amt,
      'mode' => in_array($b['mode'] ?? '', ['cash', 'upi', 'bank'], true) ? $b['mode'] : 'cash',
      'at' => !empty($b['at']) ? substr((string)$b['at'], 0, 19) : now_iso(),
      'by' => req_user($db)['name'] ?? ''];
    $db['cashbook'][] = $rec;
    if (count($db['cashbook']) > 5000) $db['cashbook'] = array_slice($db['cashbook'], -5000);
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'row' => $rec]);
  }
  if ($route === 'admin/cashbook/day-close' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    $day = substr((string)($b['date'] ?? date('Y-m-d')), 0, 10);
    $close = ['day' => $day, 'openingCash' => (float)($b['openingCash'] ?? 0), 'closingCash' => (float)($b['closingCash'] ?? 0),
              'note' => substr((string)($b['note'] ?? ''), 0, 400), 'at' => now_iso(), 'by' => req_user($db)['name'] ?? ''];
    $found = false;
    foreach ($db['cashbook'] as $ci => $r) if (($r['kind'] ?? '') === 'day-close' && substr((string)($r['at'] ?? ''), 0, 10) === $day) { $db['cashbook'][$ci] = ['id' => $r['id'], 'kind' => 'day-close'] + $close; $found = true; }
    if (!$found) $db['cashbook'][] = ['id' => uid('cb'), 'kind' => 'day-close'] + $close;
    audit_log($db, 'cashbook.day-closed', ['day' => $day]);
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }

  /* ════════════════════════════════════════════════════════════════
     v60 · refunds / exchanges / COD confirmation
     ════════════════════════════════════════════════════════════════ */
  $find_order_for_routes = function (string $id) use ($db) {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    foreach ($db['orders'] as $idx => $o) if (($o['id'] ?? '') === $id) {
      if ($o['userId'] !== $u['id'] && ($u['role'] ?? '') !== 'admin') jout(403, ['error' => 'Not your order']);
      return [$idx, $o, $u];
    }
    jout(404, ['error' => 'Order not found']);
  };
  if (preg_match('#^orders/([\w-]+)/cod-confirm$#', $route, $mCC) && $method === 'POST') {
    [$idx] = $find_order_for_routes($mCC[1]);
    $db['orders'][$idx]['codConfirmed'] = true;
    $db['orders'][$idx]['codConfirmedAt'] = now_iso();
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'order' => $db['orders'][$idx]]);
  }
  if (preg_match('#^orders/([\w-]+)/refund-request$#', $route, $mRR) && $method === 'POST') {
    $b = body_json();
    [$idx, $o] = $find_order_for_routes($mRR[1]);
    $kind = in_array($b['kind'] ?? 'refund', ['refund', 'exchange'], true) ? $b['kind'] : 'refund';
    if (empty($b['reason'])) jout(400, ['error' => 'Tell us the reason in a line']);
    $rec = ['id' => uid('rf'), 'orderId' => $o['id'], 'userId' => $o['userId'], 'userName' => $o['userName'],
      'kind' => $kind, 'reason' => substr((string)$b['reason'], 0, 400),
      'items' => array_slice((array)($b['items'] ?? []), 0, 20),
      'status' => 'requested', 'createdAt' => now_iso(), 'history' => [['s' => 'Requested', 't' => now_iso()]]];
    $db['refundRequests'][] = $rec;
    audit_log($db, 'refund.requested', ['order' => $o['id'], 'kind' => $kind]);
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'request' => $rec]);
  }
  if ($route === 'refunds/mine' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    jout(200, ['requests' => array_reverse(array_values(array_filter($db['refundRequests'], fn($r) => $r['userId'] === $u['id'])))]);
  }
  if ($route === 'admin/refunds' && $method === 'GET') {
    need_admin($db);
    jout(200, ['requests' => array_reverse($db['refundRequests']), 'orders' => $db['orders']]);
  }
  if (preg_match('#^admin/refund/([\w-]+)$#', $route, $mRD) && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    foreach ($db['refundRequests'] as $ri => $r) if ($r['id'] === $mRD[1]) {
      $decision = in_array($b['decision'] ?? '', ['approve', 'reject'], true) ? $b['decision'] : 'reject';
      $db['refundRequests'][$ri]['status'] = $decision === 'approve' ? ($r['kind'] === 'exchange' ? 'exchanged' : 'refunded') : 'rejected';
      $db['refundRequests'][$ri]['note'] = substr((string)($b['note'] ?? ''), 0, 300);
      $db['refundRequests'][$ri]['decidedAt'] = now_iso();
      $db['refundRequests'][$ri]['history'][] = ['s' => ucfirst($db['refundRequests'][$ri]['status']), 't' => now_iso()];
      if ($decision === 'approve') {
        $amt = (int)round((float)($b['amount'] ?? 0));
        $mode = in_array($b['mode'] ?? '', ['cash', 'upi', 'bank', 'exchange'], true) ? $b['mode'] : 'upi';
        foreach ($db['orders'] as $oi => $oo) if ($oo['id'] === $r['orderId']) {
          if ($r['kind'] === 'refund') {
            $db['orders'][$oi]['paymentStatus'] = 'Refunded';
            $cnSeq = (int)($db['settings']['creditNoteSeq'] ?? 0) + 1;
            $db['settings']['creditNoteSeq'] = $cnSeq;
            $cnNo = 'CN/' . date('y') . '/' . str_pad((string)$cnSeq, 4, '0', STR_PAD_LEFT);
            $db['orders'][$oi]['creditNote'] = $cnNo;
            // default the refunded amount to whatever was actually paid
            if ($amt <= 0) $amt = (int)($oo['amountPaid'] ?? (int)($oo['total'] ?? 0));
            $db['refundRequests'][$ri]['amount'] = $amt; $db['refundRequests'][$ri]['mode'] = $mode; $db['refundRequests'][$ri]['creditNote'] = $cnNo;
            if ($amt > 0 && $mode !== 'exchange') {
              $db['cashbook'][] = ['id' => uid('cb'), 'kind' => 'out', 'head' => 'Refund ' . $oo['id'] . ' (' . $cnNo . ')',
                'amount' => $amt, 'mode' => $mode, 'at' => now_iso(), 'by' => req_user($db)['name'] ?? ''];
              if (count($db['cashbook']) > 5000) $db['cashbook'] = array_slice($db['cashbook'], -5000);
            }
          } else {
            $db['orders'][$oi]['exchangedAt'] = now_iso();
          }
        }
      }
      audit_log($db, 'refund.' . $decision, ['request' => $r['id'], 'order' => $r['orderId']]);
      db_save($DB_FILE, $db); jout(200, ['ok' => true, 'request' => $db['refundRequests'][$ri]]);
    }
    jout(404, ['error' => 'Request not found']);
  }

  /* ════════════════════════════════════════════════════════════════
     v60 · reviews with photos, verified-purchase badge, owner replies
     ════════════════════════════════════════════════════════════════ */
  if ($route === 'reviews/photo' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $pid = (string)($_POST['productId'] ?? '');
    $text = trim((string)($_POST['text'] ?? ''));
    if ($pid === '' || $text === '') jout(400, ['error' => 'productId & text required']);
    $photos = [];
    if (!empty($_FILES['photos'])) {
      if (!is_dir(__DIR__ . '/uploads/reviews')) @mkdir(__DIR__ . '/uploads/reviews', 0755, true);
      $files = is_array($_FILES['photos']['name']) ? $_FILES['photos'] : ['name' => [$_FILES['photos']['name']], 'tmp_name' => [$_FILES['photos']['tmp_name']], 'error' => [$_FILES['photos']['error']], 'size' => [$_FILES['photos']['size']]];
      foreach ($files['name'] as $fi => $fname) {
        if (($files['error'][$fi] ?? 1) !== UPLOAD_ERR_OK) continue;
        if (($files['size'][$fi] ?? 0) > 6291456) continue;
        $ext = strtolower(pathinfo((string)$fname, PATHINFO_EXTENSION));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) $ext = 'jpg';
        $head = (string)@file_get_contents($files['tmp_name'][$fi], false, null, 0, 12);
        $isImage = substr($head, 0, 3) === "\xFF\xD8\xFF" || substr($head, 0, 8) === "\x89PNG\r\n\x1a\n" || substr($head, 0, 4) === 'RIFF';
        if (!$isImage) continue;
        $nm = 'rv_' . bin2hex(random_bytes(5)) . '.' . $ext;
        if (@move_uploaded_file($files['tmp_name'][$fi], __DIR__ . '/uploads/reviews/' . $nm)) $photos[] = '/uploads/reviews/' . $nm;
        if (count($photos) >= 3) break;
      }
    }
    // verified purchase: any non-cancelled order containing this product
    $verified = false;
    foreach ($db['orders'] as $oo) {
      if ($oo['userId'] !== $u['id'] || ($oo['status'] ?? '') === 'Cancelled') continue;
      foreach (($oo['items'] ?? []) as $it) if (($it['productId'] ?? '') === $pid) { $verified = true; break 2; }
    }
    $rv = ['id' => uid('rv'), 'productId' => $pid, 'userId' => $u['id'], 'userName' => $u['name'],
      'verified' => $verified, 'photos' => $photos,
      'rating' => clampn((int)($_POST['rating'] ?? 5), 1, 5), 'text' => cut500($text), 'createdAt' => now_iso()];
    $db['reviews'][] = $rv;
    foreach ($db['products'] as &$pr) if ($pr['id'] === $pid) {
      $rs = array_values(array_filter($db['reviews'], fn($x) => $x['productId'] === $pr['id']));
      $pr['rating'] = round(array_sum(array_column($rs, 'rating')) / max(1, count($rs)), 1);
      $pr['reviews'] = count($rs);
    }
    unset($pr);
    db_save($DB_FILE, $db); jout(200, $rv);
  }
  if (preg_match('#^admin/reviews/([\w-]+)/reply$#', $route, $mRV) && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    foreach ($db['reviews'] as $ri => $rv) if ($rv['id'] === $mRV[1]) {
      $db['reviews'][$ri]['reply'] = substr((string)($b['reply'] ?? ''), 0, 600);
      $db['reviews'][$ri]['replyAt'] = now_iso();
      db_save($DB_FILE, $db); jout(200, ['ok' => true, 'review' => $db['reviews'][$ri]]);
    }
    jout(404, ['error' => 'Review not found']);
  }
  if ($route === 'admin/review-asks' && $method === 'GET') {
    need_admin($db);
    $cut = time() - 6 * 86400;   // delivered at least ~6 days ago
    $reviewedPids = [];
    foreach ($db['reviews'] as $rv) $reviewedPids[$rv['userId'] . '|' . $rv['productId']] = true;
    $asks = [];
    foreach ($db['orders'] as $o) {
      if (($o['status'] ?? '') !== 'Delivered') continue;
      if (strtotime((string)($o['createdAt'] ?? 'now')) > $cut) continue;   // needs ~6 days post-delivery
    
      $delivAt = $o['createdAt'];
      foreach (($o['timeline'] ?? []) as $tl) if (($tl['status'] ?? '') === 'Delivered') $delivAt = $tl['at'] ?? $delivAt;
      if (strtotime((string)$delivAt) > $cut) continue;
      foreach (($o['items'] ?? []) as $it) {
        if (empty($reviewedPids[($o['userId'] ?? '') . '|' . ($it['productId'] ?? '')])) {
          $asks[] = ['orderId' => $o['id'], 'userName' => $o['userName'], 'phone' => ($o['address']['phone'] ?? $o['phone'] ?? ''),
            'productId' => $it['productId'], 'name' => $it['name'], 'deliveredAt' => $delivAt];
          $reviewedPids[($o['userId'] ?? '') . '|' . ($it['productId'] ?? '')] = true;
        }
      }
      if (count($asks) >= 40) break;
    }
    jout(200, ['asks' => $asks]);
  }

  if ($route === 'admin/reviews' && $method === 'GET') {
    need_admin($db);
    $pmap = [];
    foreach ($db['products'] as $pr) $pmap[$pr['id']] = $pr['name'] ?? '';
    $rows = array_map(fn($r) => $r + ['productName' => $pmap[$r['productId']] ?? ''], array_reverse($db['reviews'] ?? []));
    jout(200, ['reviews' => $rows]);
  }

  if ($route === 'referrals/stats' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $code = (string)($u['referralCode'] ?? '');
    $friends = array_values(array_filter($db['users'], fn($x) => ($x['referredBy'] ?? '') === $code));
    $completed = 0; $reward = 0;
    foreach ($friends as $f) {
      $hasOrder = (bool)array_filter($db['orders'], fn($o) => $o['userId'] === $f['id'] && ($o['status'] ?? '') !== 'Cancelled');
      if ($hasOrder) { $completed++; $reward += (int)($db['settings']['referralReward'] ?? 250); }
    }
    jout(200, ['code' => $code, 'signedUp' => count($friends), 'completed' => $completed,
      'reward' => $reward, 'perFriend' => (int)($db['settings']['referralReward'] ?? 250)]);
  }

  /* ════════════════════════════════════════════════════════════════
     v60 · Swarna Nidhi digital passbook
     ════════════════════════════════════════════════════════════════ */
  if ($route === 'savings' && $method === 'POST') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    foreach ($db['savingsPlans'] as $p) if ($p['userId'] === $u['id'] && $p['status'] === 'active') jout(400, ['error' => 'You already have an active Swarna Nidhi plan. Close or redeem it before starting another.']);
    $amt = (int)round((float)($b['monthlyAmount'] ?? 0));
    if ($amt < 500) jout(400, ['error' => 'Monthly instalment must be at least ₹500']);
    $plan = ['id' => uid('sp'), 'userId' => $u['id'], 'userName' => $u['name'], 'phone' => $u['phone'] ?? '',
      'monthlyAmount' => $amt, 'status' => 'active', 'installments' => [],
      'startedAt' => now_iso(), 'createdAt' => now_iso()];
    $db['savingsPlans'][] = $plan;
    db_save($DB_FILE, $db); jout(200, ['ok' => true, 'plan' => $plan]);
  }
  if ($route === 'savings/mine' && $method === 'GET') {
    $u = req_user($db); if (!$u) jout(401, ['error' => 'Login required']);
    $plans = array_values(array_filter($db['savingsPlans'], fn($p) => $p['userId'] === $u['id']));
    jout(200, ['plans' => array_reverse($plans)]);
  }
  if ($route === 'admin/savings' && $method === 'GET') {
    need_admin($db);
    $live = current_rates($db);
    $plans = array_map(function ($p) use ($live) {
      $paid = array_sum(array_map(fn($i) => $i['status'] === 'approved' ? (int)$i['amount'] : 0, $p['installments'] ?? []));
      $months = count(array_filter($p['installments'] ?? [], fn($i) => $i['status'] === 'approved'));
      $bonus = $months >= 11 ? (int)($p['monthlyAmount'] ?? 0) : 0;
      $p['paidMonths'] = $months; $p['contributed'] = $paid; $p['bonus'] = $bonus;
      $p['buyingPower'] = $paid + $bonus;
      $p['indicativeGrams22'] = $live['gold22'] ? round(($paid + $bonus) / (float)$live['gold22'], 3) : 0;
      return $p;
    }, array_reverse($db['savingsPlans']));
    jout(200, ['plans' => $plans]);
  }
  if (preg_match('#^admin/savings/([\w-]+)/(installment|redeem|close)$#', $route, $mSP) && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    foreach ($db['savingsPlans'] as $pi => $p) if ($p['id'] === $mSP[1]) {
      if ($mSP[2] === 'installment') {
        if ($p['status'] !== 'active') jout(400, ['error' => 'Plan is not active']);
        $amt = (int)round((float)($b['amount'] ?? $p['monthlyAmount']));
        if ($amt <= 0) jout(400, ['error' => 'Enter the instalment amount']);
        $inst = ['id' => uid('si'), 'amount' => $amt, 'mode' => in_array($b['mode'] ?? '', ['cash', 'upi', 'bank'], true) ? $b['mode'] : 'upi',
          'at' => !empty($b['at']) ? substr((string)$b['at'], 0, 19) : now_iso(),
          'rate22' => (float)(current_rates($db)['gold22'] ?? 0), 'status' => 'approved', 'by' => req_user($db)['name'] ?? ''];
        $db['savingsPlans'][$pi]['installments'][] = $inst;
        $months = count($db['savingsPlans'][$pi]['installments']);
        if ($months >= 11) $db['savingsPlans'][$pi]['bonusUnlockedAt'] = now_iso();
        db_save($DB_FILE, $db); jout(200, ['ok' => true, 'installment' => $inst, 'months' => $months]);
      }
      if ($mSP[2] === 'redeem') {
        $db['savingsPlans'][$pi]['status'] = 'redeemed';
        $db['savingsPlans'][$pi]['redeemedAt'] = now_iso();
        $db['savingsPlans'][$pi]['redeemNote'] = substr((string)($b['note'] ?? ''), 0, 300);
        $db['savingsPlans'][$pi]['redeemOrderId'] = substr((string)($b['orderId'] ?? ''), 0, 24);
        audit_log($db, 'savings.redeemed', ['plan' => $p['id']]);
        db_save($DB_FILE, $db); jout(200, ['ok' => true, 'plan' => $db['savingsPlans'][$pi]]);
      }
      if ($mSP[2] === 'close') {
        $db['savingsPlans'][$pi]['status'] = 'closed-refund';
        $db['savingsPlans'][$pi]['closedAt'] = now_iso();
        $db['savingsPlans'][$pi]['closeNote'] = substr((string)($b['note'] ?? ''), 0, 300);
        audit_log($db, 'savings.closed', ['plan' => $p['id']]);
        db_save($DB_FILE, $db); jout(200, ['ok' => true, 'plan' => $db['savingsPlans'][$pi]]);
      }
    }
    jout(404, ['error' => 'Plan not found']);
  }

  /* ════════════════════════════════════════════════════════════════
     v60 · reports, audit log, DPDP customer data
     ════════════════════════════════════════════════════════════════ */
  if ($route === 'admin/reports' && $method === 'GET') {
    need_admin($db);
    $from = substr((string)($_GET['from'] ?? date('Y-m-01')), 0, 10);
    $to = substr((string)($_GET['to'] ?? date('Y-m-d')), 0, 10);
    // order timestamps are ISO (…T…); compare as ISO so "today" is never excluded
    $inRange = fn($t) => $t >= $from . 'T00:00:00' && $t <= $to . 'T23:59:59';
    $os = array_values(array_filter($db['orders'], fn($o) => $inRange((string)($o['createdAt'] ?? ''))));
    $valid = array_filter($os, fn($o) => ($o['status'] ?? '') !== 'Cancelled');
    $orders = count($valid); $revenue = 0; $tax = 0; $metal = 0; $making = 0; $stones = 0; $shipping = 0; $prepaidDisc = 0;
    $byMethod = []; $bestsellers = [];
    foreach ($valid as $o) {
      $revenue += (int)($o['total'] ?? 0);
      $taxable = round(($o['total'] ?? 0) / 1.03);
      $tax += (int)round((($o['total'] ?? 0) - $taxable));
      foreach (($o['items'] ?? []) as $it) {
        $making += (int)($it['makingCharge'] ?? 0) * (int)($it['qty'] ?? 1);
        $stones += (int)($it['stoneValue'] ?? 0) * (int)($it['qty'] ?? 1);
        $metal += ((int)($it['unitPrice'] ?? 0) * (int)($it['qty'] ?? 1)) - (int)($it['makingCharge'] ?? 0) * (int)($it['qty'] ?? 1) - (int)($it['gst'] ?? 0) * (int)($it['qty'] ?? 1);
        $key = $it['productId'] ?? $it['name'];
        $bestsellers[$key] = ($bestsellers[$key] ?? ['name' => $it['name'], 'qty' => 0, 'value' => 0]);
        $bestsellers[$key]['qty'] += (int)($it['qty'] ?? 1);
        $bestsellers[$key]['value'] += (int)($it['unitPrice'] ?? 0) * (int)($it['qty'] ?? 1);
      }
      $shipping += (int)($o['shipping'] ?? 0);
      $prepaidDisc += (int)($o['prepaidDiscount'] ?? 0);
      $m = $o['paymentMethod'] ?? 'Other';
      $byMethod[$m] = $byMethod[$m] ?? ['n' => 0, 'value' => 0];
      $byMethod[$m]['n']++; $byMethod[$m]['value'] += (int)($o['total'] ?? 0);
    }
    uasort($bestsellers, fn($a, $b) => $b['qty'] <=> $a['qty']);
    $refunds = array_values(array_filter($db['refundRequests'], fn($r) => ($r['status'] ?? '') === 'refunded' && $inRange((string)($r['decidedAt'] ?? ''))));
    $refundAmt = array_sum(array_map(fn($r) => (int)($r['amount'] ?? 0), $refunds));
    $goldBuys = array_values(array_filter($db['goldPurchases'], fn($g) => $inRange((string)($g['createdAt'] ?? ''))));
    $lowStock = array_values(array_map(fn($p) => ['id' => $p['id'], 'name' => $p['name'], 'sku' => $p['sku'] ?? '', 'stock' => $p['stock'] ?? 0, 'weight' => $p['weightG'] ?? null],
      array_filter($db['products'], fn($p) => (!array_key_exists('active', $p) || !empty($p['active'])) && (int)($p['stock'] ?? 0) <= 3)));
    // tagged pieces whose real weight was never entered (assumed weights)
    $assumedWt = count(array_filter($db['products'], fn($p) => empty($p['weightG'])));
    $metalOutMap = [];
    foreach ($db['jobWork'] as $j) if (($j['status'] ?? '') !== 'returned' && ($j['status'] ?? '') !== 'cancelled') {
      $kn = (string)($j['karigarName'] ?? $j['karigar'] ?? 'Karigar');
      $metalOutMap[$kn] = $metalOutMap[$kn] ?? ['jobs' => 0, 'grams' => 0.0];
      $metalOutMap[$kn]['jobs']++;
      $metalOutMap[$kn]['grams'] += max(0, (float)($j['weightOut'] ?? 0) - (float)($j['weightBack'] ?? 0));
    }
    $proofPending = count(array_filter($db['orders'], fn($o) => ($o['paymentStatus'] ?? '') === 'Proof submitted'));
    jout(200, [
      'range' => [$from, $to], 'orders' => $orders, 'revenue' => $revenue, 'tax' => $tax,
      'cgst' => intdiv($tax, 2), 'sgst' => $tax - intdiv($tax, 2),
      'metalValue' => max(0, $metal), 'makingRevenue' => $making, 'stoneValue' => $stones, 'shipping' => $shipping,
      'prepaidDiscount' => $prepaidDisc, 'byMethod' => $byMethod,
      'bestsellers' => array_slice(array_values($bestsellers), 0, 12),
      'refunds' => ['count' => count($refunds), 'amount' => $refundAmt],
      'oldGold' => ['count' => count($goldBuys), 'amount' => array_sum(array_map(fn($g) => (int)$g['amount'], $goldBuys))],
      'lowStock' => $lowStock, 'assumedWeights' => $assumedWt, 'metalOutWithKarigars' => $metalOutMap,
      'proofPending' => $proofPending,
    ]);
  }
  if ($route === 'admin/audit' && $method === 'GET') {
    need_admin($db);
    jout(200, ['log' => array_slice(array_reverse($db['auditLog']), 0, 300)]);
  }
  if (preg_match('#^admin/user-data/([\w@.\-]+)$#', $route, $mUD) && $method === 'GET') {
    need_admin($db);
    $q = $mUD[1];
    $u = null;
    foreach ($db['users'] as $x) if ($x['id'] === $q || $x['email'] === $q || ($x['phone'] ?? '') === $q) { $u = $x; break; }
    if (!$u) jout(404, ['error' => 'Customer not found']);
    jout(200, ['user' => pub_user($u),
      'orders' => array_values(array_filter($db['orders'], fn($o) => $o['userId'] === $u['id'])),
      'reviews' => array_values(array_filter($db['reviews'], fn($r) => ($r['userId'] ?? '') === $u['id'])),
      'plans' => array_values(array_filter($db['savingsPlans'], fn($p) => $p['userId'] === $u['id'])),
      'serviceRequests' => array_values(array_filter($db['serviceRequests'], fn($s) => ($s['phone'] ?? '') === ($u['phone'] ?? '')))]);
  }
  if (preg_match('#^admin/user-data/([\w@.\-]+)/anonymize$#', $route, $mAN) && $method === 'POST') {
    need_admin($db);
    foreach ($db['users'] as $ui => $x) if ($x['id'] === $mAN[1] || ($x['email'] ?? '') === $mAN[1] || ($x['phone'] ?? '') === $mAN[1]) {
      if (($x['role'] ?? '') === 'admin') jout(400, ['error' => 'Cannot anonymize an admin account']);
      $db['users'][$ui]['name'] = 'Deleted customer'; $db['users'][$ui]['email'] = 'deleted+' . $x['id'] . '@privacy.local';
      $db['users'][$ui]['phone'] = ''; $db['users'][$ui]['anonymizedAt'] = now_iso();
      audit_log($db, 'user.anonymized', ['user' => $x['id']]);
      db_save($DB_FILE, $db); jout(200, ['ok' => true]);
    }
    jout(404, ['error' => 'Customer not found']);
  }

  if ($route === 'admin/khata' && $method === 'GET') {
    need_admin($db);
    jout(200, ['partners' => $db['partners'], 'khata' => $db['khata'] ?? []]);
  }
  if ($route === 'admin/khata' && $method === 'POST') {
    need_admin($db);
    $b = body_json();
    if (empty($b['partnerId'])) jout(400, ['error' => 'partnerId required']);
    $db['khata'][] = ['id' => uid('kh'), 'partnerId' => (string)$b['partnerId'],
                      'type' => in_array($b['type'] ?? '', ['debit', 'credit', 'note'], true) ? $b['type'] : 'note',
                      'amt' => (float)($b['amt'] ?? 0), 'unit' => ($b['unit'] ?? 'rs') === 'g' ? 'g' : 'rs',
                      'note' => substr((string)($b['note'] ?? ''), 0, 140), 'at' => now_iso()];
    if (count($db['khata']) > 3000) $db['khata'] = array_slice($db['khata'], -3000);
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'newsletter' && $method === 'POST') {
    pub_rate($db, $DB_FILE, 'newsletter', 10);
    $b = body_json();
    if (!filter_var($b['email'] ?? '', FILTER_VALIDATE_EMAIL)) jout(400, ['error' => 'Valid email required']);
    if (!in_array($b['email'], array_column($db['newsletter'], 'email'))) $db['newsletter'][] = ['email' => $b['email'], 'at' => now_iso()];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'contact' && $method === 'POST') {
    pub_rate($db, $DB_FILE, 'contact', 10);
    $b = body_json();
    if (empty($b['name']) || empty($b['message'])) jout(400, ['error' => 'Name & message required']);
    $db['contactMsgs'][] = ['id' => uid('cm'), 'name' => $b['name'], 'phone' => $b['phone'] ?? '', 'email' => $b['email'] ?? '', 'message' => $b['message'], 'at' => now_iso(), 'read' => false];
    db_save($DB_FILE, $db); jout(200, ['ok' => true]);
  }
  if ($route === 'reviews' && $method === 'GET') {
    /* v50: latest public reviews for the homepage proof wall & Saathi bot */
    jout(200, ['reviews' => array_slice(array_reverse($db['reviews']), 0, 12)]);
  }
  if ($route === 'reviews' && $method === 'POST') {
    $u = req_user($db);
    if (!$u) jout(401, ['error' => 'Login required']);
    $b = body_json();
    if (empty($b['productId']) || empty($b['text'])) jout(400, ['error' => 'productId & text required']);
    $rv = ['id' => uid('rv'), 'productId' => $b['productId'], 'userName' => $u['name'],
           'rating' => clampn((int)($b['rating'] ?? 5), 1, 5), 'text' => cut500((string)$b['text']), 'createdAt' => now_iso()];
    $db['reviews'][] = $rv;
    foreach ($db['products'] as &$pr) if ($pr['id'] === $b['productId']) {
      $rs = array_values(array_filter($db['reviews'], fn($r) => $r['productId'] === $pr['id']));
      $pr['rating'] = round(array_sum(array_column($rs, 'rating')) / max(1, count($rs)), 1);
      $pr['reviews'] = count($rs);
    }
    db_save($DB_FILE, $db); jout(200, $rv);
  }

  /* v61 — test the official MCX (Angel One) connection from admin Settings */
  if ($route === 'admin/feed-test' && $method === 'GET') {
    need_admin($db);
    $s = $db['settings'];
    /* v63 — contract tokens auto-resolve from the instrument master; only
       the four credentials are strictly required. */
    $need = ['angelApiKey' => 'SmartAPI key', 'angelClient' => 'client code', 'angelMpin' => 'MPIN',
      'angelTotpSecret' => 'TOTP secret'];
    $missing = [];
    foreach ($need as $k => $label) if (empty($s[$k])) $missing[] = $label;
    if (empty($s['angelEnabled'])) { jout(200, ['ok' => false, 'reason' => 'MCX feed is switched off — tick "Enable official MCX feed"']); }
    if ($missing) { jout(200, ['ok' => false, 'reason' => 'missing: ' . implode(', ', $missing)]); }
    $mcx = angel_ltp($db);
    db_save($DB_FILE, $db);
    if ($mcx) jout(200, ['ok' => true, 'mcx' => $mcx]);
    $err = $db['angelSession']['lastError'] ?? 'login/quote failed (check credentials & market session)';
    jout(200, ['ok' => false, 'reason' => $err, 'debug' => $db['angelSession']['debug'] ?? null]);
  }

  /* v73 — live external-source diagnostic: probes every dollar/FX provider
     in parallel from THIS server and reports status per host, so the owner
     can see exactly what Hostinger's firewall allows. */
  if ($route === 'admin/net-test' && $method === 'GET') {
    need_admin($db);
    $spot = spot_resolve($db, true);
    // outbound IP for whitelist checks (best-effort, two mirrors)
    $ipProbe = spot_probe_multi([
      'ipify' => 'https://api.ipify.org?format=json',
      'ifconfig' => 'https://ifconfig.me/ip',
    ], 5);
    $ip = trim((string)($ipProbe['ipify']['body'] ?? ($ipProbe['ifconfig']['body'] ?? '')));
    if (strlen($ip) > 64) $ip = substr($ip, 0, 64);
    db_save($DB_FILE, $db);
    jout(200, [
      'ok' => true,
      'resolved' => [
        'goldUsd' => $spot['gold']['price'], 'goldSrc' => $spot['gold']['src'],
        'silverUsd' => $spot['silver']['price'], 'silverSrc' => $spot['silver']['src'],
        'usdInr' => $spot['inr']['price'], 'inrSrc' => $spot['inr']['src'],
      ],
      'providers' => $spot['diag'],
      'curlMulti' => function_exists('curl_multi_init'),
      'outboundIp' => $ip,
      'php' => PHP_VERSION,
      'lastStamp' => $db['rates']['last']['t'] ?? null,
      'stampSource' => $db['rates']['last']['source'] ?? null,
      'stampInr' => $db['rates']['last']['usdInr'] ?? null,
    ]);
  }

  /* ── settings / stats / users ── */
  if ($route === 'settings' && $method === 'GET') {
    $uSet = req_user($db);
    if ($uSet && ($uSet['role'] ?? '') === 'admin') jout(200, $db['settings']);
    // v58: public projection — never expose gateway secrets / API keys
    $pubSettings = array_filter($db['settings'],
      fn($k) => !preg_match('/secret|token|password|private|apiKey|gstKey|mpin/i', $k),
      ARRAY_FILTER_USE_KEY);
    jout(200, $pubSettings);
  }
  if ($route === 'settings' && $method === 'PUT') {
    need_admin($db);
    $setBody = body_json();
    foreach ($setBody as $k => $v) $db['settings'][$k] = $v;
    audit_log($db, 'settings.updated', ['keys' => implode(',', array_keys($setBody))]);
    db_save($DB_FILE, $db); jout(200, $db['settings']);
  }
  /* ── custom pages (owner-managed) ── */
  if ($route === 'pages' && $method === 'GET') {
    $list = array_values(array_filter($db['pages'] ?? [], fn($x) => !empty($x['published'])));
    if (!empty($_GET['slug'])) { foreach ($list as $pg) if ($pg['slug'] === $_GET['slug']) jout(200, $pg); jout(200, ['error' => 'Not found']); }
    jout(200, ['pages' => array_map(fn($x) => ['title' => $x['title'], 'slug' => $x['slug'], 'updatedAt' => $x['updatedAt'] ?? ''], $list)]);
  }
  if ($route === 'pages' && $method === 'POST') {
    $b = body_json();
    $u2 = req_user($db); if (!$u2 || $u2['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    if (empty($b['title']) || empty($b['slug'])) jout(400, ['error' => 'Title & web address required']);
    $slug = trim(preg_replace('/[^a-z0-9-]+/', '-', strtolower(trim((string)$b['slug']))), '-');
    if (strlen($slug) > 60 || $slug === '') jout(400, ['error' => 'Invalid web address']);
    foreach (($db['pages'] ?? []) as $x) if ($x['slug'] === $slug) jout(409, ['error' => 'A page with this address already exists']);
    $pg = ['id' => uid('pg'), 'title' => cut500($b['title']), 'slug' => $slug,
           'body' => function_exists('mb_substr') ? mb_substr((string)($b['body'] ?? ''), 0, 20000) : substr((string)($b['body'] ?? ''), 0, 20000),
           'published' => ($b['published'] ?? true) !== false, 'updatedAt' => now_iso()];
    $db['pages'][] = $pg; db_save($DB_FILE, $db); jout(200, $pg);
  }
  if (preg_match('#^pages/([\w-]+)$#', $route, $mPG) && $method !== 'GET') {
    $u2 = req_user($db); if (!$u2 || $u2['role'] !== 'admin') jout(403, ['error' => 'Admin access required']);
    $found = false; $out = ['error' => 'Method'];
    foreach (($db['pages'] ?? []) as $i => $x) if ($x['slug'] === $mPG[1]) {
      $found = true;
      if ($method === 'PUT') {
        $b = body_json();
        if (!empty($b['title'])) $db['pages'][$i]['title'] = cut500($b['title']);
        if (isset($b['body'])) $db['pages'][$i]['body'] = function_exists('mb_substr') ? mb_substr((string)$b['body'], 0, 20000) : substr((string)$b['body'], 0, 20000);
        if (isset($b['published'])) $db['pages'][$i]['published'] = !empty($b['published']);
        $db['pages'][$i]['updatedAt'] = now_iso();
        $out = $db['pages'][$i];
      } elseif ($method === 'DELETE') { array_splice($db['pages'], $i, 1); $out = ['ok' => true]; }
    }
    if (!$found) jout(404, ['error' => 'Page not found']);
    db_save($DB_FILE, $db); jout(200, $out);
  }

  if ($route === 'admin/stats' && $method === 'GET') {
    need_admin($db);
    $rev = array_sum(array_column($db['orders'], 'total'));
    $byDay = [];
    foreach ($db['orders'] as $o) { $d = substr($o['createdAt'], 0, 10); $byDay[$d] = ($byDay[$d] ?? 0) + $o['total']; }
    $low = [];
    foreach ($db['products'] as $p) if (($p['stock'] ?? 0) <= 3) $low[] = ['name' => $p['name'], 'stock' => $p['stock']];
    $customers = count(array_filter($db['users'], fn($u) => $u['role'] === 'customer'));
    jout(200, ['revenue' => $rev, 'orders' => count($db['orders']), 'customers' => $customers,
               'products' => count($db['products']),
               'partners' => count(array_filter($db['partners'], fn($x) => $x['status'] === 'approved')),
               'pendingPartners' => count(array_filter($db['partners'], fn($x) => $x['status'] === 'pending')),
               'serviceRequests' => count(array_filter($db['serviceRequests'], fn($s) => $s['status'] === 'new')),
               'aov' => count($db['orders']) ? (int)round($rev / count($db['orders'])) : 0,
               'byDay' => $byDay, 'newsletter' => count($db['newsletter']), 'lowStock' => $low,
               'signIns' => array_reverse(array_slice($db['securityLog'] ?? [], -6)),
               'referrals' => count(array_filter($db['users'], fn($u) => !empty($u['referredBy']))),
               'abandonedCarts' => count($db['carts'] ?? []),
               'funnel' => (function () use ($db) {
                 $cut = date('c', time() - 7 * 86400);
                 $f = ['view' => 0, 'cart' => 0, 'checkout' => 0];
                 foreach (($db['events'] ?? []) as $e)
                   if (($e['t'] ?? '') >= $cut && isset($f[$e['ev'] ?? ''])) $f[$e['ev']]++;
                 return $f;
               })()]);
  }
  /* v52: one-tap full-database backup for the owner (admin token required;
     session tokens are stripped so the file can't be used to hijack a login). */
  if ($route === 'admin/backup' && $method === 'GET') {
    need_admin($db);
    $bk = $db; unset($bk['tokens'], $bk['loginfails']);
    jout(200, ['at' => now_iso(), 'backup' => $bk]);
  }
  if ($route === 'admin/users' && $method === 'GET') {
    need_admin($db);
    jout(200, ['users' => array_map('pub_user', $db['users'])]);
  }

  /* ─────────────────────────────────────────────────────────────
     BHAI DOOJ GOLD FINALE · scored quiz entries (deck-compliant)
     One entry per person (the logged-in user) across the purchase
     route and the free no-purchase route. The server owns the
     question bank and re-scores submissions, so a client can never
     self-certify an entry. Entries land in db['finaleEntries'] for
     the CA-witnessed draw / admin export.
     ───────────────────────────────────────────────────────────── */
  if ($route === 'finale/quiz' && $method === 'GET' || $route === 'finale/entry' && $method === 'GET' ||
      $route === 'finale/entry' && $method === 'POST' || $route === 'finale/entries' && $method === 'GET') {
    $FE_OPEN  = strtotime('2026-09-01T00:00:00+05:30'); // ← set the official entries-open date here before public launch
    $FE_CLOSE = strtotime('2026-12-20T23:59:59+05:30'); // entries close ~18–20 Dec 2026
    $FE_END   = strtotime('2027-01-01T00:00:00+05:30'); // module auto-expiry (1 Jan 2027)
    $FE_PASS  = 4; $FE_MAX  = 5; $FE_DAILY_ATTEMPTS = 5;

    $FE_QUIZ = [
      ['id' => 'q1', 'q' => 'Which statement about BIS hallmarking on gold jewellery in India is correct?',
       'opts' => ['Hallmarking is voluntary in every state of India',
                  'Every hallmarked piece carries a unique 6-character HUID code',
                  'The HUID printed on the tag states the making charge',
                  'Hallmarking is done only for silver, not gold'], 'a' => 1],
      ['id' => 'q2', 'q' => 'A piece stamped “916” is gold of which purity?',
       'opts' => ['18 karat', '20 karat', '22 karat', '24 karat'], 'a' => 2],
      ['id' => 'q3', 'q' => 'On shivaa.in, making charges are shown:',
       'opts' => ['Only after checkout on WhatsApp',
                  'Openly on every piece, before you pay',
                  'On the invoice after delivery',
                  'Only to B2B partners'], 'a' => 1],
      ['id' => 'q4', 'q' => 'The price you pay for a piece on shivaa.in is based on:',
       'opts' => ['A fixed national rate set every January',
                  'Yesterday’s Jaipur closing rate',
                  'The live Jaipur gold / silver rate at the time you buy',
                  'The rate on the day the piece was made'], 'a' => 2],
      ['id' => 'q5', 'q' => 'Sterling silver marked “925” means the piece is:',
       'opts' => ['92.5% silver with the rest alloy for strength',
                  '99.9% pure silver',
                  '92.5% silver-plated over copper',
                  'A silver-toned imitation'], 'a' => 0],
    ];

    $now = time();
    $is_open  = $now >= $FE_OPEN && $now <= $FE_END;   // campaign marketing live
    $accepting = $now <= $FE_CLOSE;                    // entries being accepted
    $u = req_user($db);

    function finale_entry_for(array $db, string $userId): ?array {
      foreach ($db['finaleEntries'] as $e) if (($e['userId'] ?? '') === $userId && ($e['status'] ?? '') === 'Entered') return $e;
      return null;
    }
    function finale_qualifies(array $items): bool {
      $gold = 0.0; $silver = 0.0;
      foreach ($items as $it) {
        $w = (float)($it['weightG'] ?? 0) * max(1, (int)($it['qty'] ?? 1));
        if (strcasecmp((string)($it['metal'] ?? ''), 'Silver') === 0) $silver += $w;
        elseif (in_array((string)($it['purity'] ?? ''), ['18K', '22K', '24K'], true)) $gold += $w;
      }
      return $gold >= 3.0 || $silver >= 100.0;
    }
    function finale_public_entry(array $e): array {
      return ['id' => $e['id'], 'route' => $e['route'], 'orderId' => $e['orderId'] ?? null,
              'score' => $e['score'], 'total' => $e['total'], 'status' => $e['status'],
              'createdAt' => $e['createdAt']];
    }
    function finale_daily_attempts(array &$db, string $userId): int {
      $today = gmdate('Y-m-d', time() + 19800); // IST date
      $a = $db['finaleAttempts'][$userId] ?? null;
      if (!is_array($a) || ($a['day'] ?? '') !== $today) { $db['finaleAttempts'][$userId] = ['day' => $today, 'count' => 0]; return 0; }
      return (int)$a['count'];
    }

    if ($route === 'finale/quiz' && $method === 'GET') {
      if (!$u) jout(401, ['error' => 'Login required']);
      $my = finale_entry_for($db, $u['id']);
      jout(200, [
        'open' => $is_open, 'accepting' => $accepting,
        'reason' => !$is_open ? 'The New Year Gold Finale has concluded. Thank you for being part of it.'
                   : (!$accepting ? 'Entries closed in December — the CA-witnessed live draw takes place on 31 December 2026.' : ''),
        'passMark' => $FE_PASS, 'total' => $FE_MAX, 'attemptsLeft' => max(0, $FE_DAILY_ATTEMPTS - finale_daily_attempts($db, $u['id'])),
        'questions' => array_map(fn($q) => ['id' => $q['id'], 'q' => $q['q'], 'opts' => $q['opts']], $FE_QUIZ),
        'entry' => $my ? finale_public_entry($my) : null,
      ]);
    }

    if ($route === 'finale/entry' && $method === 'GET') {
      if (!$u) jout(401, ['error' => 'Login required']);
      $my = finale_entry_for($db, $u['id']);
      jout(200, ['entry' => $my ? finale_public_entry($my) : null]);
    }

    if ($route === 'finale/entry' && $method === 'POST') {
      if (!$u) jout(401, ['error' => 'Login required']);
      if (!$is_open) jout(403, ['error' => 'The New Year Gold Finale has concluded. Thank you for being part of it.']);
      if (!$accepting) jout(403, ['error' => 'Entries closed in December — the CA-witnessed live draw takes place on 31 December 2026.']);
      $b = body_json();
      $route_type = ($b['route'] ?? '') === 'free' ? 'free' : 'purchase';
      $order_id = $route_type === 'purchase' ? trim((string)($b['orderId'] ?? '')) : null;

      // one entry per person — ever (purchase and free routes combined)
      $existing = finale_entry_for($db, $u['id']);
      if ($existing) jout(200, ['already' => true, 'entry' => finale_public_entry($existing)]);

      // eligibility self-declarations (age 18+, India, not TN/WB where void, no insiders)
      $chk = $b['checks'] ?? [];
      foreach (['age18', 'notExcluded', 'notInsider'] as $k) {
        if (empty($chk[$k])) jout(400, ['error' => 'Please confirm the eligibility statements before taking the quiz.']);
      }

      // purchase route: the order must exist, belong to this user and qualify
      if ($route_type === 'purchase') {
        if (!$order_id) jout(400, ['error' => 'Order reference missing.']);
        $ord = null; foreach ($db['orders'] as $o) if ($o['id'] === $order_id) $ord = $o;
        if (!$ord) jout(404, ['error' => 'Order not found.']);
        if (($ord['userId'] ?? '') !== $u['id']) jout(403, ['error' => 'This order does not belong to your account.']);
        if (!finale_qualifies($ord['items'] ?? [])) jout(400, ['error' => 'This order does not qualify — a qualifying order is any gold piece of 3 g or more in any karat, or 100 g or more of silver per order.']);
      }

      // attempt guard: 5 quiz attempts per person per day
      $day = gmdate('Y-m-d', time() + 19800);
      $a = $db['finaleAttempts'][$u['id']] ?? null;
      $count = (is_array($a) && ($a['day'] ?? '') === $day) ? (int)$a['count'] : 0;
      if ($count >= $FE_DAILY_ATTEMPTS) jout(429, ['error' => 'You have used today’s quiz attempts. Please try again tomorrow.']);
      $count++;

      // server-side scoring against the canonical bank
      $answers = is_array($b['answers'] ?? null) ? $b['answers'] : [];
      $got = []; foreach ($answers as $ans) if (is_array($ans) && isset($ans['id'], $ans['c'])) $got[(string)$ans['id']] = (int)$ans['c'];
      $score = 0; $missing = [];
      foreach ($FE_QUIZ as $qq) {
        if (!array_key_exists($qq['id'], $got) || $got[$qq['id']] < 0 || $got[$qq['id']] >= count($qq['opts'])) { $missing[] = $qq['id']; continue; }
        if ($got[$qq['id']] === $qq['a']) $score++;
      }
      if ($missing) jout(400, ['error' => 'Please answer every question.']);

      $db['finaleAttempts'][$u['id']] = ['day' => $day, 'count' => $count];
      $passed = $score >= $FE_PASS;
      $entry = null;
      if ($passed) {
        $entry = ['id' => uid('fe'), 'userId' => $u['id'], 'route' => $route_type, 'orderId' => $order_id,
                  'name' => (string)($u['name'] ?? ''), 'phone' => (string)($u['phone'] ?? ''),
                  'email' => (string)($u['email'] ?? ''),
                  'score' => $score, 'total' => $FE_MAX, 'passed' => true, 'status' => 'Entered',
                  'checks' => ['age18' => true, 'notExcluded' => true, 'notInsider' => true],
                  'answers' => $got, 'createdAt' => now_iso(), 'source' => 'site-quiz'];
        $db['finaleEntries'][] = $entry;
      }
      db_save($DB_FILE, $db);
      jout(200, $passed
        ? ['passed' => true, 'score' => $score, 'total' => $FE_MAX, 'passMark' => $FE_PASS, 'entry' => finale_public_entry($entry)]
        : ['passed' => false, 'score' => $score, 'total' => $FE_MAX, 'passMark' => $FE_PASS,
           'attemptsLeft' => max(0, $FE_DAILY_ATTEMPTS - $count)]);
    }

    if ($route === 'finale/count' && $method === 'GET') {
    jout(200, ['count' => count(array_filter($db['finaleEntries'], fn($e) => ($e['status'] ?? '') === 'Entered'))]);
  }
  if ($route === 'finale/entries' && $method === 'GET') {
      need_admin($db);
      $list = array_reverse(array_values($db['finaleEntries']));
      jout(200, ['entries' => array_map(function ($e) {
        return ['id' => $e['id'], 'name' => $e['name'] ?? '', 'phone' => $e['phone'] ?? '',
                'email' => $e['email'] ?? '', 'route' => $e['route'], 'orderId' => $e['orderId'] ?? null,
                'score' => $e['score'], 'total' => $e['total'], 'status' => $e['status'],
                'createdAt' => $e['createdAt']];
      }, $list), 'entered' => count(array_filter($db['finaleEntries'], fn($e) => ($e['status'] ?? '') === 'Entered'))]);
    }
  }

  if ($changed) db_save($DB_FILE, $db);
  jout(404, ['error' => 'Unknown API ' . $method . ' /' . $route]);
} catch (Throwable $e) {
  jout(500, ['error' => 'Server error: ' . $e->getMessage()]);
}
