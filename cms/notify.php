<?php
/* ═══════════════════════════════════════════════════════════════
   SHIVAA · automated confirmation plug-in (v49 · Feature #5)
   ─────────────────────────────────────────────────────────────
   After an order is placed the API calls shivaa_order_notify(),
   which sends a WhatsApp confirmation and an email receipt when
   a gateway is configured in data/notify-config.json. When no
   config exists — exactly like the SMS plug-in — the site runs
   in DEMO mode: each attempt is validated, logged to db.json and
   shown in Admin → Notifications, but no external message goes out.

   data/notify-config.json — create in Hostinger File Manager.
   Blocked from the web by the existing *.json deny rule.

   WhatsApp providers:
     { "whatsapp": { "provider": "demo" } }
     { "whatsapp": { "provider": "generic", "method": "POST",
        "url": "https://api.your-wa.com/send?to={to}&text={msg}",
        "headers": { "Authorization": "Bearer KEY" },
        "body": { "to": "{to}", "message": "{msg}", "order": "{orderId}" } } }
     { "whatsapp": { "provider": "twilio", "sid": "AC…", "token": "…",
        "from": "whatsapp:+1415…" } }

   Email providers:
     { "email": { "provider": "demo" } }
     { "email": { "provider": "php", "from": "orders@shivaa.in" } }
     { "email": { "provider": "generic", "method": "POST",
        "url": "https://api.email-service.com/send",
        "headers": { "Content-Type": "application/json" },
        "body": { "to": "{email}", "subject": "{subject}", "text": "{body}" } } }

   Common optional keys:
     { "siteUrl": "https://shivaa.in",
       "shop": { "whatsapp": "918905005921", "email": "Support@shivaa.in" } }

   Placeholders available in generic gateways:
     {to} {email} {name} {phone} {orderId} {subject} {msg} {body}
   ═══════════════════════════════════════════════════════════════ */
declare(strict_types=1);

/* Cached config, or null when no file / unreadable. */
function shivaa_notify_config(): ?array {
  static $c = false;
  if ($c === false) {
    $c = null;
    $f = __DIR__ . '/data/notify-config.json';
    if (is_readable($f)) {
      $j = json_decode((string)file_get_contents($f), true);
      if (is_array($j)) {
        $c = $j;
        $c['siteUrl'] = $c['siteUrl'] ?? 'https://shivaa.in';
        $c['shop']    = $c['shop'] ?? [];
        $c['shop']['whatsapp'] = $c['shop']['whatsapp'] ?? '918905005921';
        $c['shop']['email']    = $c['shop']['email']    ?? 'Support@shivaa.in';
      }
    }
  }
  return $c;
}

function shivaa_notify_channel(array $cfg, string $ch): array {
  $c = is_array($cfg) ? ($cfg[$ch] ?? []) : [];
  $c['provider'] = strtolower((string)($c['provider'] ?? 'demo')) ?: 'demo';
  return $c;
}

/* Minimal cURL wrapper, same contract as the SMS plug-in. */
function shivaa_notify_http(string $method, string $url, array $headers, $body): array {
  if (!function_exists('curl_init')) return [0, '', 'php-curl missing on server'];
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 14,
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

function shivaa_notify_repl(array $state, string $s): string {
  foreach ($state as $k => $v) $s = str_replace('{' . $k . '}', is_scalar($v) ? (string)$v : json_encode($v), $s);
  return $s;
}

/* Build the customer + order context used by every channel. */
function shivaa_order_notify_state(array $order, array $u, array $cfg): array {
  $addr  = is_array($order['address'] ?? null) ? $order['address'] : (array)($order['address'] ?? []);
  $phone = substr(preg_replace('/\D/', '', (string)($addr['phone'] ?? ($u['phone'] ?? ''))), -10);
  $email = (string)($addr['email'] ?? ($u['email'] ?? ''));
  $gift  = !empty($order['gift']);
  $site  = rtrim((string)($cfg['siteUrl'] ?? 'https://shivaa.in'), '/');
  $pay   = (string)($order['paymentMethod'] ?? 'Online');
  $siteStatus = $pay === 'COD' ? 'Pay on delivery (please keep ' . (string)($order['address']['name'] ?? '') . '’s OTP handy)' : ($pay === 'WhatsApp' ? 'Confirm payment on WhatsApp to lock this order' : 'Payment received / on payment confirmation');

  $wa = ['✦ SHIVAA — ' . ($gift ? 'GIFT CONFIRMED' : 'ORDER CONFIRMED') . ' ✦', ''];
  $wa[] = 'Order ' . $order['id'];
  $wa[] = $order['userName'] ?? $u['name'] ?? 'Customer';
  $wa[] = '';
  $i = 0;
  foreach ($order['items'] ?? [] as $it) {
    $i++;
    $name = ($it['name'] ?? 'Piece') . (($it['size'] ?? '') ? ' (' . $it['size'] . ')' : '') . ' × ' . ($it['qty'] ?? 1);
    $wa[] = $i . '. ' . $name . (($gift || !isset($it['unitPrice'])) ? '' : ' — ₹' . number_format((float)$it['unitPrice'] * (int)($it['qty'] ?? 1), 2));
  }
  $wa[] = '';
  if ($gift) {
    $wa[] = '🎁 GIFT MODE — prices remain hidden for the recipient.';
  } else {
    $wa[] = 'Subtotal: ₹' . number_format((float)($order['subtotal'] ?? 0), 2);
    if (!empty($order['discount'])) $wa[] = 'Discount' . (($order['coupon'] ?? '') ? ' (' . $order['coupon'] . ')' : '') . ': −₹' . number_format((float)$order['discount'], 2);
    $wa[] = 'Shipping: ' . ((float)($order['shipping'] ?? 0) > 0 ? '₹' . number_format((float)$order['shipping'], 2) : 'FREE insured');
    $wa[] = 'Total: ₹' . number_format((float)($order['total'] ?? 0), 2);
  }
  $wa[] = '';
  $wa[] = 'Payment: ' . $pay . ' · ' . $siteStatus;
  $wa[] = 'Track order: ' . $site . '/#/order/' . $order['id'];
  $wa[] = '';
  $wa[] = 'Namaste ' . ($order['userName'] ?? '') . ' ✦ your ' . ($gift ? 'gift order' : 'order') . ' is confirmed.';

  $subject = ($gift ? 'Your Shivaa gift order ' : 'Your Shivaa order ') . $order['id'] . ' is confirmed ✦';
  $body    = implode("\n", $wa);

  return [
    'to'        => $gift ? '' : '', // replaced per-channel below
    'phone'     => preg_match('/^[6-9]\d{9}$/', $phone) ? $phone : '',
    'email'     => $email,
    'name'      => $order['userName'] ?? $u['name'] ?? '',
    'orderId'   => $order['id'],
    'subject'   => $subject,
    'waText'    => $wa,
    'msg'       => $body,
    'body'      => $body,
    'siteUrl'   => $site,
    'gift'      => $gift,
    'payment'   => $pay,
  ];
}

function shivaa_notify_send_whatsapp(array $cfg, array $state): array {
  $st = $state['waText'];
  $msg = is_array($st) ? implode("\n", $st) : (string)$st;
  $phone = (string)($state['phone'] ?? '');
  $to = $phone ? '91' . $phone : '';
  $demo = ['ok' => true, 'mode' => 'demo', 'provider' => 'demo', 'to' => $to,
           'error' => $phone ? null : 'No WhatsApp number on order — confirmation logged only', 'response' => ''];
  if (!$phone || !$to) return $demo;

  $c = shivaa_notify_channel($cfg, 'whatsapp');
  $p = (string)$c['provider'];
  if ($p === 'demo' || $p === '') return $demo;

  if ($p === 'generic') {
    if (empty($c['url'])) return ['ok' => false, 'mode' => 'live', 'provider' => $p, 'to' => $to, 'error' => 'generic WhatsApp config needs url', 'response' => ''];
    $st2 = array_merge($state, ['to' => $to, 'phone' => $phone]);
    $url = shivaa_notify_repl($st2, (string)$c['url']);
    $hdrs = [];
    foreach ((array)($c['headers'] ?? []) as $k => $v) $hdrs[] = $k . ': ' . shivaa_notify_repl($st2, (string)$v);
    if (!$hdrs) $hdrs[] = 'Content-Type: application/json';
    $b = (array)($c['body'] ?? []);
    $pb = $b ? json_encode(array_map(fn($v) => shivaa_notify_repl($st2, (string)$v), $b), JSON_UNESCAPED_UNICODE) : '{}';
    [$status, $body, $err] = shivaa_notify_http(strtoupper((string)($c['method'] ?? 'POST')), $url, $hdrs, $pb);
    $ok = $err === '' && $status >= 200 && $status < 300;
    return ['ok' => $ok, 'mode' => 'live', 'provider' => $p, 'to' => $to,
            'error' => $ok ? null : ($err !== '' ? $err : 'HTTP ' . $status . ' — ' . cut500($body)),
            'response' => $body];
  }

  if ($p === 'twilio') {
    if (empty($c['sid']) || empty($c['token']) || empty($c['from'])) return ['ok' => false, 'mode' => 'live', 'provider' => $p, 'to' => $to, 'error' => 'twilio WhatsApp needs sid + token + from', 'response' => ''];
    $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode((string)$c['sid']) . '/Messages.json';
    [$status, $body, $err] = shivaa_notify_http('POST', $url, ['Authorization: Basic ' . base64_encode($c['sid'] . ':' . $c['token']), 'Content-Type: application/x-www-form-urlencoded'],
      http_build_query(['To' => 'whatsapp:+' . $to, 'From' => $c['from'], 'Body' => $msg]));
    $ok = $err === '' && $status >= 200 && $status < 300;
    return ['ok' => $ok, 'mode' => 'live', 'provider' => $p, 'to' => $to,
            'error' => $ok ? null : ($err !== '' ? $err : 'HTTP ' . $status . ' — ' . cut500($body)),
            'response' => $body];
  }

  return ['ok' => false, 'mode' => 'live', 'provider' => $p, 'to' => $to, 'error' => 'Unknown WhatsApp provider "' . $p . '" in data/notify-config.json', 'response' => ''];
}

function shivaa_notify_send_email(array $cfg, array $state): array {
  $email = (string)($state['email'] ?? '');
  $to = $email;
  $demo = ['ok' => true, 'mode' => 'demo', 'provider' => 'demo', 'to' => $to,
           'error' => $to ? null : 'No email on order — confirmation logged only', 'response' => ''];
  if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) return $demo;

  $c = shivaa_notify_channel($cfg, 'email');
  $p = (string)$c['provider'];
  if ($p === 'demo' || $p === '') return $demo;

  $subject = (string)($state['subject'] ?? 'Order confirmation');
  $body    = (string)($state['body'] ?? '');

  if ($p === 'php') {
    $from = (string)($c['from'] ?? ($cfg['shop']['email'] ?? 'Support@shivaa.in'));
    $hdrs = "From: Shivaa Jewellers <{$from}>\r\nReply-To: " . ($cfg['shop']['email'] ?? $from) . "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8";
    $ok = @mail($to, $subject, $body, $hdrs);
    return ['ok' => $ok, 'mode' => 'live', 'provider' => $p, 'to' => $to,
            'error' => $ok ? null : 'PHP mail() returned false — check Hostinger mail quota/domain', 'response' => ''];
  }

  if ($p === 'generic') {
    if (empty($c['url'])) return ['ok' => false, 'mode' => 'live', 'provider' => $p, 'to' => $to, 'error' => 'generic email config needs url', 'response' => ''];
    $url = shivaa_notify_repl($state, (string)$c['url']);
    $hdrs = [];
    foreach ((array)($c['headers'] ?? []) as $k => $v) $hdrs[] = $k . ': ' . shivaa_notify_repl($state, (string)$v);
    if (!$hdrs) $hdrs[] = 'Content-Type: application/json';
    $st2 = array_merge($state, ['to' => $to, 'email' => $to]);
    $b = (array)($c['body'] ?? []);
    $pb = $b ? json_encode(array_map(fn($v) => shivaa_notify_repl($st2, (string)$v), $b), JSON_UNESCAPED_UNICODE) : '{}';
    [$status, $body, $err] = shivaa_notify_http(strtoupper((string)($c['method'] ?? 'POST')), $url, $hdrs, $pb);
    $ok = $err === '' && $status >= 200 && $status < 300;
    return ['ok' => $ok, 'mode' => 'live', 'provider' => $p, 'to' => $to,
            'error' => $ok ? null : ($err !== '' ? $err : 'HTTP ' . $status . ' — ' . cut500($body)),
            'response' => $body];
  }

  return ['ok' => false, 'mode' => 'live', 'provider' => $p, 'to' => $to, 'error' => 'Unknown email provider "' . $p . '" in data/notify-config.json', 'response' => ''];
}

/* Called by api.php after an order is saved. Logs every attempt to
   $db['notifications'] and returns a compact per-channel summary. */
function shivaa_order_notify(array &$db, array $order, array $u, array $opts = []): array {
  $cfg     = shivaa_notify_config() ?? [];
  $state   = shivaa_order_notify_state($order, $u, $cfg);
  $channels = $opts['channels'] ?? ['whatsapp', 'email'];
  $out     = [];
  $db['notifications'] = $db['notifications'] ?? [];
  $db['notify']        = $db['notify'] ?? ['sent' => 0, 'ok' => 0, 'demo' => 0, 'lastAt' => null, 'lastErr' => null];

  foreach ($channels as $ch) {
    $r = $ch === 'whatsapp' ? shivaa_notify_send_whatsapp($cfg, $state) : shivaa_notify_send_email($cfg, $state);
    $log = [
      'id' => uid('nt'), 'orderId' => $order['id'], 'channel' => $ch,
      'kind' => 'order_confirmation', 'to' => $r['to'] ?? '', 'mode' => $r['mode'] ?? 'demo',
      'provider' => $r['provider'] ?? 'demo', 'ok' => (bool)($r['ok'] ?? false),
      'error' => cut500((string)($r['error'] ?? '')), 'response' => cut500((string)($r['response'] ?? '')),
      'message' => cut500($ch === 'whatsapp' ? (is_array($state['waText']) ? implode("\n", $state['waText']) : (string)$state['waText']) : (string)($state['body'] ?? '')),
      'createdAt' => now_iso(),
    ];
    $db['notifications'][] = $log;
    $db['notify']['sent']++;
    if ($log['ok']) $db['notify']['ok']++;
    else $db['notify']['lastErr'] = $log['error'];
    if ($log['mode'] === 'demo') $db['notify']['demo']++;
    $db['notify']['lastAt'] = now_iso();
    $out[$ch] = ['ok' => $log['ok'], 'mode' => $log['mode'], 'provider' => $log['provider'], 'to' => $log['to'], 'error' => $log['error'] ?: null, 'logId' => $log['id']];
  }
  return $out;
}
