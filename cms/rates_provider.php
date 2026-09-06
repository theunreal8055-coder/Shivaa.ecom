<?php
/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA — live rate provider (India benchmark)

   WHY THIS FILE EXISTS
   The old rates_refresh() derived prices from international XAU spot ×
   USD/INR, which is ~13% below the Indian market (spot excludes import
   duty, customs IGST and the local premium), and when the feed failed it
   INVENTED a price with mt_rand() and sold at it.

   This provider:
     · reads an India-published benchmark (IBJA by default, via metals.dev),
     · NEVER fabricates a rate — on failure it holds the last known good one
       and marks it stale,
     · guards the monthly API quota (so the free plan is enough),
     · refuses an implausible value or a silent >N% jump.

   CONFIG (server only, never in git):  ~/.shivaa-rates.json  chmod 600
   {
     "enabled": true,
     "provider": "metals.dev",
     "api_key": "…",
     "authority": "ibja",
     "monthly_cap": 95,
     "max_jump_pct": 7,
     "spot_fallback": true
   }
   ═══════════════════════════════════════════════════════════════════════ */
declare(strict_types=1);

/* ───────── config ───────── */

function shivaa_rates_cfg_path(): string {
  $env = getenv('SHIVAA_RATES_CFG');
  if (is_string($env) && $env !== '') return $env;
  $home = getenv('HOME');
  if (is_string($home) && $home !== '') return rtrim($home, '/') . '/.shivaa-rates.json';
  return '/home/.shivaa-rates.json';
}

function shivaa_rates_cfg(?string $path = null): array {
  $path = $path ?: shivaa_rates_cfg_path();
  $defaults = [
    'enabled'       => false,
    'provider'      => 'metals.dev',
    'api_key'       => '',
    'authority'     => 'ibja',
    'currency'      => 'INR',
    'unit'          => 'g',
    'scale'         => 1.0,     // set to 0.1 only if the feed quotes per 10 g
    'monthly_cap'   => 95,      // free plan is 100/month — leave headroom
    'max_jump_pct'  => 7.0,
    'spot_fallback' => true,    // use old spot maths if the benchmark is down
    'timeout'       => 8,
    'configPath'    => $path,
    'configFound'   => false,
  ];
  if (!is_readable($path)) return $defaults;
  $raw = @file_get_contents($path);
  $j = json_decode((string)$raw, true);
  if (!is_array($j)) return $defaults;
  $j['configFound'] = true;
  $j['configPath'] = $path;
  return array_merge($defaults, $j);
}

/* ───────── http ───────── */

function shivaa_rates_http(string $url, int $timeout = 8): array {
  if (!function_exists('curl_init')) return ['ok' => false, 'error' => 'curl extension missing', 'json' => null];
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => $timeout,
    CURLOPT_CONNECTTIMEOUT => $timeout,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_USERAGENT      => 'Shivaa-rates/1.0 (+https://shivaa.in)',
  ]);
  $raw  = curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $err  = curl_error($ch);
  curl_close($ch);
  if ($raw === false || $raw === '') return ['ok' => false, 'error' => $err !== '' ? $err : 'empty response', 'http' => $code, 'json' => null];
  $j = json_decode((string)$raw, true);
  if (!is_array($j)) return ['ok' => false, 'error' => 'non-JSON response', 'http' => $code, 'json' => null, 'raw' => substr((string)$raw, 0, 300)];
  return ['ok' => $code < 400, 'http' => $code, 'json' => $j, 'error' => $code >= 400 ? ('HTTP ' . $code) : ''];
}

/* ───────── response mapping ─────────
   Field names differ between authorities, so match on content rather than
   assuming exact keys. IBJA publishes fineness-wise rates: 999 / 995 / 916 /
   750 / 585 gold and 999 silver.                                            */

function shivaa_rates_map(array $rates): array {
  $out = ['gold999' => null, 'gold995' => null, 'gold916' => null, 'gold750' => null, 'silver' => null, 'goldPlain' => null];
  foreach ($rates as $k => $v) {
    $val = is_array($v) ? ($v['price'] ?? $v['rate'] ?? $v['value'] ?? null) : $v;
    if (!is_numeric($val)) continue;
    $val = (float)$val;
    $key = strtolower((string)$k);
    $isGold   = strpos($key, 'gold') !== false;
    $isSilver = strpos($key, 'silver') !== false;
    if ($isGold) {
      if     (strpos($key, '999') !== false && $out['gold999'] === null) $out['gold999'] = $val;
      elseif (strpos($key, '995') !== false && $out['gold995'] === null) $out['gold995'] = $val;
      elseif (strpos($key, '916') !== false && $out['gold916'] === null) $out['gold916'] = $val;
      elseif (strpos($key, '750') !== false && $out['gold750'] === null) $out['gold750'] = $val;
      elseif ($out['goldPlain'] === null
              && strpos($key, '585') === false
              && strpos($key, 'am') === false
              && strpos($key, 'pm') === false) $out['goldPlain'] = $val;
    } elseif ($isSilver && $out['silver'] === null) {
      $out['silver'] = $val;
    }
  }
  if ($out['gold999'] === null) $out['gold999'] = $out['gold995'] ?? $out['goldPlain'];
  return $out;
}

/** Per-gram INR sanity. Refuses rather than auto-correcting a 10× unit error. */
function shivaa_rates_plausible(?float $gold, ?float $silver): array {
  if ($gold === null || $silver === null) return ['ok' => false, 'why' => 'gold or silver missing from response'];
  if ($gold < 2000 || $gold > 100000) {
    return ['ok' => false, 'why' => 'gold ' . round($gold, 2) . ' is not a plausible INR/gram figure — check unit=g (per 10 g would need "scale": 0.1)'];
  }
  if ($silver < 20 || $silver > 20000) {
    return ['ok' => false, 'why' => 'silver ' . round($silver, 2) . ' is not a plausible INR/gram figure'];
  }
  return ['ok' => true, 'why' => ''];
}

/* ───────── quota (keeps the free plan viable) ───────── */

function shivaa_rates_quota(array &$db, array $cfg, bool $consume): array {
  $month = date('Y-m');
  $q = $db['rates']['quota'] ?? null;
  if (!is_array($q) || ($q['month'] ?? '') !== $month) $q = ['month' => $month, 'used' => 0];
  $cap = (int)($cfg['monthly_cap'] ?? 95);
  $q['cap'] = $cap;
  $allowed = ((int)$q['used']) < $cap;
  if ($consume) {
    if ($allowed) $q['used'] = ((int)$q['used']) + 1;
    $db['rates']['quota'] = $q;   // only a real (non-dry) run persists usage
  }
  return ['allowed' => $allowed, 'used' => (int)$q['used'], 'cap' => $cap, 'month' => $month];
}

/* ───────── providers ───────── */

/** India benchmark (IBJA/MCX via metals.dev). Returns null on any doubt. */
function shivaa_fetch_benchmark(array $cfg, array &$diag): ?array {
  $key = (string)($cfg['api_key'] ?? '');
  if ($key === '') { $diag[] = 'no api_key in ' . $cfg['configPath']; return null; }
  $authority = (string)($cfg['authority'] ?? 'ibja');
  $url = 'https://api.metals.dev/v1/metal/authority'
       . '?api_key='   . urlencode($key)
       . '&authority=' . urlencode($authority)
       . '&currency='  . urlencode((string)($cfg['currency'] ?? 'INR'))
       . '&unit='      . urlencode((string)($cfg['unit'] ?? 'g'));
  $r = shivaa_rates_http($url, (int)($cfg['timeout'] ?? 8));
  if (!$r['ok'] || !is_array($r['json'])) { $diag[] = 'benchmark request failed: ' . ($r['error'] ?? 'unknown'); return null; }
  $j = $r['json'];
  if (($j['status'] ?? '') !== 'success') {
    $diag[] = 'provider error ' . (string)($j['error_code'] ?? '?') . ': ' . (string)($j['error_message'] ?? 'unknown');
    return null;
  }
  $m = shivaa_rates_map(is_array($j['rates'] ?? null) ? $j['rates'] : []);
  $scale = (float)($cfg['scale'] ?? 1.0);
  foreach (['gold999', 'gold995', 'gold916', 'gold750', 'silver'] as $f) {
    if ($m[$f] !== null) $m[$f] = $m[$f] * $scale;
  }
  $chk = shivaa_rates_plausible($m['gold999'], $m['silver']);
  if (!$chk['ok']) { $diag[] = $chk['why'] . ' · keys seen: ' . implode(', ', array_keys((array)($j['rates'] ?? []))); return null; }
  return [
    'gold999'    => $m['gold999'],
    'gold916'    => $m['gold916'],
    'gold750'    => $m['gold750'],
    'silver'     => $m['silver'],
    'source'     => $authority,
    'providerTs' => (string)($j['timestamp'] ?? ''),
  ];
}

/**
 * Legacy international-spot maths, kept ONLY as a labelled fallback.
 * This is NOT the Indian retail rate — it runs ~13% low. Never present it
 * to a customer as the Jaipur rate without the owner's premium calibration.
 */
function shivaa_fetch_spot(array $cfg, array &$diag): ?array {
  $t = (int)($cfg['timeout'] ?? 8);
  $g  = shivaa_rates_http('https://api.gold-api.com/price/XAU', $t);
  $s  = shivaa_rates_http('https://api.gold-api.com/price/XAG', $t);
  $fx = shivaa_rates_http('https://open.er-api.com/v6/latest/USD', $t);
  $gp = $g['json']['price'] ?? null;
  $sp = $s['json']['price'] ?? null;
  $in = $fx['json']['rates']['INR'] ?? null;
  if (!is_numeric($gp) || !is_numeric($sp) || !is_numeric($in)) { $diag[] = 'spot fallback unavailable'; return null; }
  $oz = 31.1034768;
  $gold   = ((float)$gp * (float)$in) / $oz;
  $silver = ((float)$sp * (float)$in) / $oz;
  $chk = shivaa_rates_plausible($gold, $silver);
  if (!$chk['ok']) { $diag[] = 'spot fallback ' . $chk['why']; return null; }
  return ['gold999' => $gold, 'gold916' => null, 'gold750' => null, 'silver' => $silver,
          'source' => 'spot (international — not the India rate)', 'providerTs' => ''];
}

/* ───────── the refresh itself ───────── */

/**
 * Refreshes $db['rates']['last'] in place. Returns a report array; the caller
 * decides whether to persist. Guarantees: no fabricated numbers, ever.
 *
 * $opts: ['dryRun' => bool, 'force' => bool, 'fetcher' => callable (tests only)]
 */
function shivaa_rates_apply(array &$db, array $cfg, array $opts = []): array {
  $dry   = !empty($opts['dryRun']);
  $diag  = [];
  $last  = $db['rates']['last'] ?? null;
  $report = ['action' => '', 'source' => '', 'diag' => &$diag, 'quota' => null, 'stamp' => null, 'dryRun' => $dry];

  /* Test seam: qa/test_rates.php injects a fetcher so the guards can be
     exercised without a network call. Production never passes this. */
  $fetcher = $opts['fetcher'] ?? null;

  $new = null;
  if (!empty($cfg['enabled'])) {
    $quota = shivaa_rates_quota($db, $cfg, !$dry);
    $report['quota'] = $quota;
    if (!$quota['allowed']) {
      $diag[] = 'monthly quota reached (' . $quota['used'] . '/' . $quota['cap'] . ') — holding last known rate';
    } else {
      $new = is_callable($fetcher) ? $fetcher($cfg, $diag) : shivaa_fetch_benchmark($cfg, $diag);
    }
  } else {
    $diag[] = 'benchmark disabled (set "enabled": true in ' . $cfg['configPath'] . ')';
  }

  if ($new === null && !empty($cfg['spot_fallback']) && !is_callable($fetcher)) $new = shivaa_fetch_spot($cfg, $diag);

  /* Nothing usable → hold the last known good rate. NEVER invent one. */
  if ($new === null) {
    if (!is_array($last) || !isset($last['gold24'])) {
      $report['action'] = 'unavailable';
      $report['source'] = 'unavailable';
      $stamp = ['t' => date('c'), 'gold24' => null, 'gold22' => null, 'gold18' => null,
                'silver' => null, 'source' => 'unavailable — no rate has ever been fetched'];
      if (!$dry) $db['rates']['last'] = $stamp;
      $report['stamp'] = $stamp;
      return $report;
    }
    $held = $last;
    $held['source'] = 'stale (feed unavailable)';
    $held['staleSince'] = $last['staleSince'] ?? date('c');
    $held['checkedAt'] = date('c');
    if (!$dry) $db['rates']['last'] = $held;
    $report['action'] = 'held';
    $report['source'] = $held['source'];
    $report['stamp'] = $held;
    return $report;
  }

  /* Guard against a silent jump (bad feed, wrong unit, currency mix-up). */
  $maxJump = (float)($cfg['max_jump_pct'] ?? 7.0);
  if (is_array($last) && !empty($last['gold24']) && empty($opts['force'])) {
    $delta = abs($new['gold999'] - (float)$last['gold24']) / max(1.0, (float)$last['gold24']) * 100.0;
    if ($delta > $maxJump) {
      $pending = ['t' => date('c'), 'gold24' => (int)round($new['gold999']),
                  'silver' => round($new['silver'], 1), 'source' => $new['source'],
                  'deltaPct' => round($delta, 2)];
      $held = $last;
      $held['source'] = 'held — feed moved ' . round($delta, 1) . '% (admin review)';
      $held['checkedAt'] = date('c');
      if (!$dry) { $db['rates']['pendingReview'] = $pending; $db['rates']['last'] = $held; }
      $report['action'] = 'held-jump';
      $report['source'] = $held['source'];
      $report['stamp'] = $held;
      $report['pending'] = $pending;
      $diag[] = 'rate moved ' . round($delta, 2) . '% vs last (' . $last['gold24'] . ' → ' . round($new['gold999']) . '); '
              . 'accept with: cron_rates.php --force';
      return $report;
    }
  }

  /* Prefer the authority's own published 916/750 over a purity multiplier. */
  $g24 = $new['gold999'];
  $g22 = $new['gold916'] !== null ? $new['gold916'] : $g24 * 0.9167;
  $g18 = $new['gold750'] !== null ? $new['gold750'] : $g24 * 0.75;

  $stamp = [
    't'      => date('c'),
    'gold24' => (int)round($g24),
    'gold22' => (int)round($g22),
    'gold18' => (int)round($g18),
    'silver' => round($new['silver'], 1),
    'source' => $new['source'],
  ];
  if ($new['providerTs'] !== '') $stamp['providerTs'] = $new['providerTs'];
  if ($new['gold916'] !== null)  $stamp['puritySource'] = 'published';

  if (!$dry) {
    $db['rates']['last'] = $stamp;
    $db['rates']['history'][] = $stamp;
    if (count($db['rates']['history']) > 720) $db['rates']['history'] = array_slice($db['rates']['history'], -720);
    unset($db['rates']['pendingReview']);
  }
  $report['action'] = 'updated';
  $report['source'] = $stamp['source'];
  $report['stamp']  = $stamp;
  return $report;
}

/** Age of the current stamp in minutes (PHP_INT_MAX when there is none). */
function shivaa_rates_age_minutes(array $db): int {
  $t = $db['rates']['last']['t'] ?? null;
  if (!is_string($t) || $t === '') return PHP_INT_MAX;
  $ts = strtotime($t);
  if ($ts === false) return PHP_INT_MAX;
  return (int)floor((time() - $ts) / 60);
}
