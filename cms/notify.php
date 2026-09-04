<?php
/* ═══════════════════════════════════════════════════════════════
   SHIVAA · Transactional notifications plug-in (v49)
   ─────────────────────────────────────────────────────────────
   Sends order / payment / status LETTERS by EMAIL and WHATSAPP
   automatically when data/notify-config.json exists.

   NO config file → the site stays in DEMO mode: every notification
   is still COMPOSED and stored in the admin "Notifications" queue
   (data/db.json → $db['notifications']), plus a health trail in
   $db['notifyLog'], exactly so the feature is visible and testable
   before you wire real gateways. Deleting the config file is the
   instant rollback. The config is blocked from the web by .htaccess
   (*.json → Require all denied), so keys are never exposed.

   data/notify-config.json — create it in Hostinger File Manager.

   EMAIL — pick ONE provider (see NOTIFY-SETUP-GUIDE.md):

     Mailgun:
       { "email": { "provider": "mailgun", "key": "…", "domain": "mg.yourdomain.com",
                    "from": "no-reply@shivaa.in" } }

     SendGrid:
       { "email": { "provider": "sendgrid", "key": "SG.…", "from": "no-reply@shivaa.in" } }

     Resend:
       { "email": { "provider": "resend", "key": "re_…", "from": "no-reply@shivaa.in" } }

     Server mail() (no API key — your host's own mailer):
       { "email": { "provider": "mail", "from": "no-reply@shivaa.in" } }

     Any other gateway ("custom" — URL may contain {email} {subject} {text} {html}):
       { "email": { "provider": "custom", "method": "POST",
                    "url": "https://api.example.com/send",
                    "headers": { "Authorization": "Bearer xyz" },
                    "body": { "to": "{email}", "subject": "{subject}", "text": "{text}" } } }

   WHATSAPP — pick ONE provider (or "none" to queue only):

     Twilio WhatsApp:
       { "whatsapp": { "provider": "twilio", "sid": "AC…", "token": "…",
                       "from": "whatsapp:+14155238886" } }

     Any other gateway ("custom" — URL may contain {phone} {message}):
       { "whatsapp": { "provider": "custom", "method": "POST",
                       "url": "https://api.example.com/wa",
                       "headers": { "Authorization": "Bearer xyz" },
                       "body": { "to": "{phone}", "text": "{message}" } } }

   Optional top-level keys:
     "fromName" (default "Shivaa Jewellers"),
     "replyTo"  (default the sender email),
     "domain"   (default shivaa.in — used for track/invoice links),
     "channels" (["whatsapp","email"] — which to send; default both).
   ═══════════════════════════════════════════════════════════════ */
declare(strict_types=1);

/* Cached config, or null when not configured / unreadable. */
function shivaa_notify_config(): ?array {
  static $c = false;                                  // false = not loaded yet
  if ($c === false) {
    $c = null;
    $f = __DIR__ . '/data/notify-config.json';
    if (is_readable($f)) {
      $j = json_decode((string)file_get_contents($f), true);
      if (is_array($j)) {
        $j['domain']   = $j['domain']   ?? 'shivaa.in';
        $j['fromName'] = $j['fromName'] ?? 'Shivaa Jewellers';
        $j['channels'] = $j['channels'] ?? ['whatsapp', 'email'];
        $c = $j;
      }
    }
  }
  return $c;
}

/* Minimal cURL wrapper: [httpStatus, body, curlError]. */
function shivaa_notify_http(string $method, string $url, array $headers, $body): array {
  if (!function_exists('curl_init')) return [0, '', 'php-curl missing on server'];
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
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

/* Small branded HTML wrapper for transactional email. */
function shivaa_notify_email_html(string $title, string $text, array $cfg): string {
  $name   = $cfg['fromName'] ?? 'Shivaa Jewellers';
  $domain = $cfg['domain']   ?? 'shivaa.in';
  $body   = nl2br(htmlspecialchars((string)$text, ENT_QUOTES, 'UTF-8'));
  $title  = htmlspecialchars((string)$title, ENT_QUOTES, 'UTF-8');
  return '<!doctype html><html><body style="margin:0;background:#f7f1e6;font-family:Arial,Helvetica,sans-serif;color:#3a2f26">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1e6;padding:24px 12px"><tr><td align="center">'
    . '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(110,30,42,.12)">'
    . '<tr><td style="background:#6e1e2a;padding:20px 28px;color:#fff"><span style="font-size:21px;letter-spacing:.14em;font-weight:bold">SHIVAA</span><br><small style="opacity:.85">' . htmlspecialchars($name) . '</small></td></tr>'
    . '<tr><td style="padding:28px"><h2 style="margin:0 0 14px;color:#6e1e2a;font-size:19px">' . $title . '</h2><div style="font-size:14px;line-height:1.75">' . $body . '</div></td></tr>'
    . '<tr><td style="padding:16px 28px;background:#faf6ef;font-size:12px;color:#8a7d6c">' . $name . ' &middot; www.' . htmlspecialchars($domain) . '</td></tr>'
    . '</table></td></tr></table></body></html>';
}

/* ── EMAIL — returns ['ok'=>bool,'mode'=>'live','provider'=>string,'error'=>?string,'response'=>string] */
function shivaa_notify_email(array $cfg, string $toEmail, string $subject, string $text, string $html): array {
  $ecfg  = $cfg['email'] ?? [];
  $p     = strtolower((string)($ecfg['provider'] ?? 'mail'));
  $from  = (string)($ecfg['from'] ?? ('noreply@' . ($cfg['domain'] ?? 'shivaa.in')));
  $name  = $cfg['fromName'] ?? 'Shivaa Jewellers';
  $reply = (string)($cfg['replyTo'] ?? $from);
  $status = 0; $body = ''; $err = '';

  if ($p === 'sendgrid') {
    if (empty($ecfg['key'])) $err = 'sendgrid config needs key';
    else {
      $payload = json_encode([
        'personalizations' => [['to' => [['email' => $toEmail]], 'subject' => $subject]],
        'from'    => ['email' => $from, 'name' => $name],
        'reply_to'=> ['email' => $reply],
        'content' => [['type' => 'text/plain', 'value' => $text], ['type' => 'text/html', 'value' => $html]],
      ]);
      [$status, $body, $err] = shivaa_notify_http('POST', 'https://api.sendgrid.com/v3/mail/send', ['Authorization: Bearer ' . $ecfg['key'], 'Content-Type: application/json'], $payload);
    }
  } elseif ($p === 'resend') {
    if (empty($ecfg['key'])) $err = 'resend config needs key';
    else {
      $payload = json_encode(['from' => $name . ' <' . $from . '>', 'to' => [$toEmail], 'subject' => $subject, 'text' => $text, 'html' => $html, 'reply_to' => $reply]);
      [$status, $body, $err] = shivaa_notify_http('POST', 'https://api.resend.com/emails', ['Authorization: Bearer ' . $ecfg['key'], 'Content-Type: application/json'], $payload);
    }
  } elseif ($p === 'mailgun') {
    if (empty($ecfg['key']) || empty($ecfg['domain'])) $err = 'mailgun config needs key + domain';
    else {
      $f = ['from' => $name . ' <' . $from . '>', 'to' => $toEmail, 'subject' => $subject, 'html' => $html, 'text' => $text];
      $url = 'https://api.mailgun.net/v3/' . rawurlencode((string)$ecfg['domain']) . '/messages';
      [$status, $body, $err] = shivaa_notify_http('POST', $url, ['Authorization: Basic ' . base64_encode('api:' . $ecfg['key']), 'Content-Type: application/x-www-form-urlencoded'], http_build_query($f));
    }
  } elseif ($p === 'custom') {
    if (empty($ecfg['url'])) $err = 'custom email config needs url';
    else {
      $url  = str_replace(['{email}', '{subject}', '{text}'], [rawurlencode($toEmail), rawurlencode($subject), rawurlencode($text)], (string)$ecfg['url']);
      $hdrs = ['Content-Type: application/x-www-form-urlencoded'];
      foreach ((array)($ecfg['headers'] ?? []) as $k => $v) $hdrs[] = $k . ': ' . str_replace(['{email}', '{subject}', '{text}'], [$toEmail, $subject, $text], (string)$v);
      $b = (array)($ecfg['body'] ?? []);
      $pb = $b ? http_build_query(array_map(fn($v) => str_replace(['{email}', '{subject}', '{text}'], [$toEmail, $subject, $text], (string)$v), $b)) : '';
      [$status, $body, $err] = shivaa_notify_http(strtoupper((string)($ecfg['method'] ?? 'POST')), $url, $hdrs, $pb === '' ? '{}' : $pb);
    }
  } elseif ($p === 'mail') {
    $hdrs = "From: $name <$from>\r\nReply-To: $reply\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8";
    $ok = @mail($toEmail, $subject, $html, $hdrs);
    return ['ok' => (bool)$ok, 'mode' => 'live', 'provider' => 'mail', 'error' => $ok ? null : 'PHP mail() returned false', 'response' => ''];
  } else {
    $err = 'Unknown email provider "' . $p . '" in data/notify-config.json';
  }

  $ok = $err === '' && $status >= 200 && $status < 300;
  return ['ok' => $ok, 'mode' => 'live', 'provider' => $p,
          'error' => $ok ? null : ($err !== '' ? $err : 'email HTTP ' . $status . ' — ' . cut500($body)),
          'response' => $body];
}

/* ── WHATSAPP — returns ['ok'=>bool,'mode'=>'live'|'demo','provider'=>string,'error'=>?string,'response'=>string] */
function shivaa_notify_whatsapp(array $cfg, string $phoneFull, string $text): array {
  $wcfg = $cfg['whatsapp'] ?? [];
  $p    = strtolower((string)($wcfg['provider'] ?? 'none'));
  if ($p === 'none' || $p === '') return ['ok' => false, 'mode' => 'demo', 'provider' => 'none', 'error' => null, 'response' => ''];
  $status = 0; $body = ''; $err = '';

  if ($p === 'twilio') {
    if (empty($wcfg['sid']) || empty($wcfg['token']) || empty($wcfg['from'])) $err = 'twilio whatsapp config needs sid + token + from';
    else {
      $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode((string)$wcfg['sid']) . '/Messages.json';
      [$status, $body, $err] = shivaa_notify_http('POST', $url, ['Authorization: Basic ' . base64_encode($wcfg['sid'] . ':' . $wcfg['token']), 'Content-Type: application/x-www-form-urlencoded'], http_build_query(['To' => 'whatsapp:+' . $phoneFull, 'From' => $wcfg['from'], 'Body' => $text]));
    }
  } elseif ($p === 'custom') {
    if (empty($wcfg['url'])) $err = 'custom whatsapp config needs url';
    else {
      $url  = str_replace(['{phone}', '{message}'], [rawurlencode($phoneFull), rawurlencode($text)], (string)$wcfg['url']);
      $hdrs = ['Content-Type: application/x-www-form-urlencoded'];
      foreach ((array)($wcfg['headers'] ?? []) as $k => $v) $hdrs[] = $k . ': ' . str_replace(['{phone}', '{message}'], [$phoneFull, $text], (string)$v);
      $b = (array)($wcfg['body'] ?? []);
      $pb = $b ? http_build_query(array_map(fn($v) => str_replace(['{phone}', '{message}'], [$phoneFull, $text], (string)$v), $b)) : '';
      [$status, $body, $err] = shivaa_notify_http(strtoupper((string)($wcfg['method'] ?? 'POST')), $url, $hdrs, $pb === '' ? '{}' : $pb);
    }
  } else {
    $err = 'Unknown whatsapp provider "' . $p . '" in data/notify-config.json';
  }

  $ok = $err === '' && $status >= 200 && $status < 300;
  return ['ok' => $ok, 'mode' => 'live', 'provider' => $p,
          'error' => $ok ? null : ($err !== '' ? $err : 'whatsapp HTTP ' . $status . ' — ' . cut500($body)),
          'response' => $body];
}

/* ── MESSAGE BUILDERS ─────────────────────────────────────────
   Builds the human copy for each event. Returns
   ['subject'=>email subject, 'text'=>plaintext (wa + email),
    'html'=>branded email HTML].   */
function shivaa_notify_build(string $event, array $o): array {
  $order   = $o['order'] ?? [];
  $user    = $o['user'] ?? [];
  $settings= $o['settings'] ?? [];
  $name    = (string)(($user['name'] ?? '') ?: '');
  $oid     = (string)($order['id'] ?? '');
  $domain  = (string)($settings['domain'] ?? 'shivaa.in');
  $money   = fn($n) => '₹' . number_format((float)$n);
  $lines   = [];
  foreach ((is_array($order['items'] ?? null) ? $order['items'] : []) as $it) {
    $nm = (string)($it['name'] ?? 'Piece');
    $qty = (int)($it['qty'] ?? 1);
    $lines[] = '• ' . $nm . ($qty > 1 ? ' × ' . $qty : '') . ' — ' . $money((float)($it['unitPrice'] ?? 0) * $qty);
  }
  $sub   = (float)($order['subtotal'] ?? 0);
  $disc  = (float)($order['discount'] ?? 0);
  $ship  = (float)($order['shipping'] ?? 0);
  $total = (float)($order['total'] ?? ($sub - $disc + $ship));
  $pm    = (string)($order['paymentMethod'] ?? 'Online');
  $addr  = is_array($order['address'] ?? null) ? $order['address'] : (is_object($order['address'] ?? null) ? (array)$order['address'] : []);
  $city  = (string)($addr['city'] ?? '');
  $pin   = (string)($addr['pincode'] ?? '');
  $itemCount = (int)array_sum(array_map(fn($x) => (int)($x['qty'] ?? 0), is_array($order['items'] ?? null) ? $order['items'] : []));
  $trackUrl = 'https://' . $domain . '/#/track';
  $invUrl   = 'https://' . $domain . '/#/invoice/' . $oid;

  $head = '✦ SHIVAA — ';

  if ($event === 'payment_confirmed') {
    $title  = 'Payment received — order ' . $oid;
    $text   = $head . "PAYMENT RECEIVED ✦\n\nOrder " . $oid . " — payment of " . $money($total) . " received via " . $pm . " ✓\n\n"
            . "Your order is now confirmed and will be packed & shipped within 24–48 hours.\n\n"
            . "Track your order anytime: " . $trackUrl . "\nInvoice: " . $invUrl . "\n\nThank you for your trust ✦\n" . (string)($settings['phone'] ?? '') . "\nNamaste, " . (string)($settings['storeName'] ?? 'Shivaa Jewellers');
    return ['subject' => $title, 'text' => $text, 'html' => shivaa_notify_email_html($title, $text, $o['cfg'] ?? [])];
  }

  if ($event === 'order_status') {
    $st = (string)($o['status'] ?? 'updated');
    $title = 'Order ' . $oid . ' — ' . $st;
    $text  = $head . "ORDER " . strtoupper($st) . " ✦\n\nOrder " . $oid . " is now: " . $st . ".\n"
           . ($st === 'Shipped' ? "Your piece is on its way — we'll share the courier tracking number separately.\n" : '')
           . ($st === 'Delivered' ? "We hope you love it. Thank you for buying from the House of Shivaa ✦\n" : '')
           . ($st === 'Cancelled' ? "If this is unexpected, reply to this message and we'll fix it right away.\n" : '')
           . "\nTrack: " . $trackUrl . "\nInvoice: " . $invUrl . "\n\nNamaste, " . (string)($settings['storeName'] ?? 'Shivaa Jewellers');
    return ['subject' => $title, 'text' => $text, 'html' => shivaa_notify_email_html($title, $text, $o['cfg'] ?? [])];
  }

  // default: order_confirmed
  $title = 'Your Shivaa order ' . $oid . ' is confirmed';
  $text  = $head . "ORDER CONFIRMED ✦\n\n" . ($name ? 'Namaste ' . $name . ",\n\n" : '') 
         . 'Thank you for choosing the House of Shivaa. Your order is confirmed and locked at today\'s live rate.' . "\n\n"
         . ($itemCount ? $itemCount . ' item' . ($itemCount > 1 ? 's' : '') . "\n" : '') 
         . (implode("\n", $lines) ? implode("\n", $lines) . "\n" : '')
         . "\nSubtotal: " . $money($sub)
         . ($disc > 0 ? "\nDiscount: − " . $money($disc) : '')
         . "\nShipping: " . ($ship > 0 ? $money($ship) : 'FREE insured')
         . "\nTotal: " . $money($total)
         . "\nPayment: " . $pm
         . ($city ? "\nDeliver to: " . $city . ($pin ? ' — ' . $pin : '') : '')
         . "\n\nTrack your order: " . $trackUrl . "\nInvoice: " . $invUrl . "\n\nEvery piece is BIS-hallmarked, tamper-sealed & fully insured. Thank you ✦\nNamaste, " . (string)($settings['storeName'] ?? 'Shivaa Jewellers');
  return ['subject' => $title, 'text' => $text, 'html' => shivaa_notify_email_html($title, $text, $o['cfg'] ?? [])];
}

/* ── THE ONE function api.php calls ─────────────────────────────
   Sends (or queues) the notification and logs it. $db is by-ref so
   the queued/log records persist. Returns
   ['mode'=>'live'|'demo','sent'=>int,'queued'=>int,'records'=>array]. */
function shivaa_notify(array &$db, array $opts): array {
  $cfg    = shivaa_notify_config();
  $event  = (string)($opts['event'] ?? 'order_confirmed');
  $user   = $opts['user'] ?? null;
  $order  = $opts['order'] ?? [];
  $channels = is_array($cfg['channels'] ?? null) ? $cfg['channels'] : ($opts['channels'] ?? ['whatsapp', 'email']);
  $built  = shivaa_notify_build($event, $opts + ['cfg' => $cfg ?: []]);

  // Prefer the contact's phone on the order (delivery phone), else the account phone.
  $phone = (string)($user['phone'] ?? '');
  if ($phone === '') {
    $addr = $order['address'] ?? null;
    $phone = is_array($addr) ? (string)($addr['phone'] ?? '') : (is_object($addr) ? (string)($addr->phone ?? '') : '');
  }
  $phoneFull = $phone !== '' ? '91' . preg_replace('/\D/', '', $phone) : null;
  $toEmail = (string)($user['email'] ?? $opts['email'] ?? '');
  $live = !empty($cfg);

  $records = []; $sent = 0; $queued = 0;
  $base = ['event' => $event, 'ref' => (string)($order['id'] ?? ''), 'subject' => $built['subject'], 'text' => $built['text'], 'html' => $built['html'], 'createdAt' => now_iso()];

  if (in_array('whatsapp', $channels, true) && $phoneFull) {
    $waProvider = $live ? strtolower((string)($cfg['whatsapp']['provider'] ?? 'none')) : 'none';
    if ($waProvider === 'none') {
      $records[] = $base + ['id' => uid('nfy'), 'channel' => 'whatsapp', 'to' => $phoneFull, 'status' => 'queued', 'mode' => 'demo', 'waUrl' => 'https://wa.me/' . $phoneFull . '?text=' . rawurlencode($built['text'])];
      $queued++;
    } else {
      $r = shivaa_notify_whatsapp($cfg, $phoneFull, $built['text']);
      $records[] = $base + ['id' => uid('nfy'), 'channel' => 'whatsapp', 'to' => $phoneFull, 'status' => $r['ok'] ? 'sent' : 'failed', 'mode' => 'live', 'provider' => $r['provider'], 'error' => $r['error'], 'response' => cut500($r['response'])];
      if ($r['ok']) $sent++;
    }
  }
  if (in_array('email', $channels, true) && $toEmail !== '') {
    $emProvider = $live ? strtolower((string)($cfg['email']['provider'] ?? '')) : '';
    if (!$live || $emProvider === '' || $emProvider === 'none') {
      $records[] = $base + ['id' => uid('nfy'), 'channel' => 'email', 'to' => $toEmail, 'status' => 'queued', 'mode' => 'demo'];
      $queued++;
    } else {
      $con = !in_array($emProvider, ['sendgrid', 'resend', 'mailgun', 'custom', 'mail'], true);
      $r = $con
        ? ['ok' => false, 'mode' => 'live', 'provider' => $emProvider, 'error' => 'Unknown email provider "' . $emProvider . '"', 'response' => '']
        : shivaa_notify_email($cfg, $toEmail, $built['subject'], $built['text'], $built['html']);
      $records[] = $base + ['id' => uid('nfy'), 'channel' => 'email', 'to' => $toEmail, 'status' => $r['ok'] ? 'sent' : 'failed', 'mode' => 'live', 'provider' => $r['provider'], 'error' => $r['error'], 'response' => cut500($r['response'])];
      if ($r['ok']) $sent++;
    }
  }

  foreach ($records as $rec) $db['notifications'][] = $rec;
  if (count($db['notifications'] ?? []) > 500) $db['notifications'] = array_slice($db['notifications'], -500);

  $L = $db['notifyLog'] ?? ['sent' => 0, 'failed' => 0, 'queued' => 0, 'lastAt' => null];
  $L['sent']   += $sent;
  $L['failed'] += (count($records) - $sent - $queued);
  $L['queued'] += $queued;
  $L['lastAt'] = now_iso();
  $db['notifyLog'] = $L;

  return ['mode' => $live ? 'live' : 'demo', 'sent' => $sent, 'queued' => $queued, 'records' => $records];
}
