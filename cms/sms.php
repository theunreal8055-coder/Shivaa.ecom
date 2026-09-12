<?php
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SHIVAA Â· SMS gateway plug-in (v33)
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   Sends OTP codes by real SMS when data/sms-config.json exists.
   NO config file â the site stays in DEMO mode exactly as before
   (the code is shown on screen). Deleting the config file is the
   instant rollback. The config is blocked from the web by .htaccess
   (*.json â Require all denied), so keys are never exposed.

   data/sms-config.json â create it in Hostinger File Manager.
   Pick ONE provider (see OTP-SETUP-GUIDE.md for full steps):

   MSG91 (recommended, needs DLT template):
     { "provider": "msg91", "authkey": "KEY", "template_id": "ID" }

   Fast2SMS generic OTP route (fastest to set up, no own template):
     { "provider": "fast2sms", "key": "KEY" }

   Fast2SMS with own DLT template (needed for the auto-fill line):
     { "provider": "fast2sms", "key": "KEY", "sender_id": "SHIVAA",
       "template_id": "ID", "entity_id": "ENTITY_ID" }

   Textlocal:
     { "provider": "textlocal", "key": "KEY", "sender": "SHIVAA" }

   Twilio:
     { "provider": "twilio", "sid": "ACâ¦", "token": "â¦", "from": "+1â¦" }

   Any other gateway ("custom" â URL may contain {phone} {code} {msg}):
     { "provider": "custom", "method": "POST",
       "url": "https://your-gateway/send?to={phone}&text={msg}",
       "headers": { "Authorization": "Bearer xyz" }, "body": { "pin": "{code}" } }

   Optional keys: "message" ("â¦{code}â¦" custom text), "domain"
   (default shivaa.in), "autofill" (default true â appends the
   â@shivaa.in #CODEâ line Android Chrome reads to auto-fill).
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
declare(strict_types=1);

// v81 direct-access guard — this file is an include library, never a URL entry point.
if (!defined('SHV_RUN')) { http_response_code(403); header('Content-Type: text/plain; charset=utf-8'); echo '403 Forbidden'; exit; }

/* Cached config, or null when not configured / unreadable. */
function shivaa_sms_config(): ?array {
  static $c = false;                                  // false = not loaded yet
  if ($c === false) {
    $c = null;
    $f = __DIR__ . '/data/sms-config.json';
    if (is_readable($f)) {
      $j = json_decode((string)file_get_contents($f), true);
      if (is_array($j) && !empty($j['provider'])) {
        $j['domain']   = $j['domain']   ?? 'shivaa.in';
        $j['autofill'] = $j['autofill'] ?? true;
        $c = $j;
      }
    }
  }
  return $c;
}

/* Human-readable SMS text, ending with the WebOTP auto-fill line. */
function shivaa_sms_text(array $cfg, string $code): string {
  $msg = (string)($cfg['message'] ?? '{code} is your Shivaa Jewellers verification code. It expires in 5 minutes. Never share it with anyone.');
  $msg = str_replace('{code}', $code, $msg);
  if (!empty($cfg['autofill'])) $msg .= "\n@" . $cfg['domain'] . ' #' . $code;
  return $msg;
}

/* Minimal cURL wrapper: [httpStatus, body, curlError]. */
function shivaa_sms_http(string $method, string $url, array $headers, $body): array {
  if (!function_exists('curl_init')) return [0, '', 'php-curl missing on server'];
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 12,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_SSL_VERIFYPEER => true,
  ]);
  $out  = curl_exec($ch);
  $err  = curl_error($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);
  return [$code, $out === false ? '' : (string)$out, $err];
}

/* Did the provider say yes? (each gateway words success differently) */
function shivaa_sms_ok(string $provider, int $status, string $body): bool {
  if ($status < 200 || $status >= 300) return false;
  $j = json_decode($body, true);
  $b = is_array($j) ? $j : [];
  switch ($provider) {
    case 'msg91':     return ($b['type'] ?? '') === 'success';
    case 'fast2sms':  return ($b['return'] ?? null) === true;
    case 'textlocal': return ($b['status'] ?? '') === 'success';
    case 'twilio':    return isset($b['sid']);                    // 201 + sid
    default:          return true;                                // custom: 2xx is fine
  }
}

/* Extract a useful error line for the admin log. */
function shivaa_sms_err(string $provider, int $status, string $body, string $curlErr): string {
  if ($curlErr) return $curlErr;
  $j = json_decode($body, true);
  $m = is_array($j) ? ($j['message'] ?? ($j['error'] ?? '')) : '';
  if (!$m && is_array($j) && $j['errors']) $m = json_encode($j['errors']);
  if (!$m) $m = $body;
  return strtoupper($provider) . ' HTTP ' . $status . ' â ' . cut500((string)$m);
}

/* ââ THE one function api.php calls âââââââââââââââââââââââââââââ
   Returns ['ok'=>bool, 'mode'=>'live'|'demo', 'provider'=>string,
            'error'=>?string, 'response'=>raw provider reply].   */
function shivaa_sms_send(string $phone10, string $code): array {
  $cfg = shivaa_sms_config();
  if (!$cfg) return ['ok' => true, 'mode' => 'demo', 'provider' => 'demo', 'error' => null, 'response' => ''];
  $p  = strtolower((string)$cfg['provider']);
  $ph = '91' . $phone10;                                   // 9198xxxxxxx
  $msg = shivaa_sms_text($cfg, $code);
  $status = 0; $body = ''; $err = '';

  if ($p === 'msg91') {
    if (empty($cfg['authkey']) || empty($cfg['template_id'])) { $err = 'msg91 config needs authkey + template_id'; }
    else {
      $q = http_build_query(['template_id' => $cfg['template_id'], 'mobile' => $ph, 'otp' => $code, 'otp_length' => strlen($code), 'otp_expiry' => 5]);
      [$status, $body, $err] = shivaa_sms_http('POST', 'https://control.msg91.com/api/v5/otp?' . $q, ['authkey: ' . $cfg['authkey'], 'Content-Type: application/json'], '{}');
    }
  } elseif ($p === 'fast2sms') {
    if (empty($cfg['key'])) { $err = 'fast2sms config needs key'; }
    elseif (!empty($cfg['template_id'])) {                 // own DLT template â full text incl. auto-fill line
      $f = array_merge(['route' => 'dlt', 'sender_id' => $cfg['sender_id'] ?? '', 'template_id' => $cfg['template_id'], 'entity_id' => $cfg['entity_id'] ?? '', 'message' => $msg, 'numbers' => $phone10], (array)($cfg['extra'] ?? []));
      [$status, $body, $err] = shivaa_sms_http('POST', 'https://www.fast2sms.com/dev/bulkV2', ['authorization: ' . $cfg['key'], 'Content-Type: application/x-www-form-urlencoded'], http_build_query($f));
    } else {                                               // generic OTP route (their pre-approved template)
      $f = array_merge(['route' => 'otp', 'variables_values' => $code, 'numbers' => $phone10], (array)($cfg['extra'] ?? []));
      [$status, $body, $err] = shivaa_sms_http('POST', 'https://www.fast2sms.com/dev/bulkV2', ['authorization: ' . $cfg['key'], 'Content-Type: application/x-www-form-urlencoded'], http_build_query($f));
    }
  } elseif ($p === 'textlocal') {
    if (empty($cfg['key'])) { $err = 'textlocal config needs key'; }
    else {
      $f = array_merge(['apikey' => $cfg['key'], 'numbers' => $ph, 'sender' => $cfg['sender'] ?? 'SHIVAA', 'message' => rawurlencode($msg)], (array)($cfg['extra'] ?? []));
      [$status, $body, $err] = shivaa_sms_http('POST', 'https://api.textlocal.in/send/', ['Content-Type: application/x-www-form-urlencoded'], http_build_query($f));
    }
  } elseif ($p === 'twilio') {
    if (empty($cfg['sid']) || empty($cfg['token']) || empty($cfg['from'])) { $err = 'twilio config needs sid + token + from'; }
    else {
      $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode((string)$cfg['sid']) . '/Messages.json';
      [$status, $body, $err] = shivaa_sms_http('POST', $url, ['Authorization: Basic ' . base64_encode($cfg['sid'] . ':' . $cfg['token']), 'Content-Type: application/x-www-form-urlencoded'], http_build_query(['To' => '+' . $ph, 'From' => $cfg['from'], 'Body' => $msg]));
    }
  } elseif ($p === 'custom') {
    if (empty($cfg['url'])) { $err = 'custom config needs url'; }
    else {
      $url  = str_replace(['{phone}', '{code}', '{msg}'], [rawurlencode($ph), $code, rawurlencode($msg)], (string)$cfg['url']);
      $hdrs = ['Content-Type: application/x-www-form-urlencoded'];
      foreach ((array)($cfg['headers'] ?? []) as $k => $v) $hdrs[] = $k . ': ' . str_replace(['{phone}', '{code}', '{msg}'], [$ph, $code, $msg], (string)$v);
      $b = (array)($cfg['body'] ?? []);
      $pb = $b ? http_build_query(array_map(fn($v) => str_replace(['{phone}', '{code}', '{msg}'], [$ph, $code, $msg], (string)$v), $b)) : '';
      [$status, $body, $err] = shivaa_sms_http(strtoupper((string)($cfg['method'] ?? 'POST')), $url, $hdrs, $pb === '' ? '{}' : $pb);
    }
  } else {
    $err = 'Unknown provider "' . $p . '" in data/sms-config.json';
  }

  $ok = $err === '' && shivaa_sms_ok($p, $status, $body);
  return ['ok' => $ok, 'mode' => 'live', 'provider' => $p, 'error' => $ok ? null : ($err !== '' ? $err : shivaa_sms_err($p, $status, $body, '')), 'response' => $body];
}
