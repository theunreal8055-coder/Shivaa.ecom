<?php
/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SHIVAA Â· EMAIL DELIVERY FOR ONE-TIME CODES                    v48
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   The shop's channel for OTP codes when no SMS gateway is configured.

   Why this exists: without an SMS provider the site used to hand the code
   back to whoever asked for it, so anyone who knew a customer's mobile
   number could sign in as that customer. Now the code is emailed to the
   address ON THE ACCOUNT (or, for a brand-new registration, the address
   the person just typed) and is never returned to the browser.

   Configuration is optional. Without data/mail-config.json the module
   sends from no-reply@<your-domain> using PHP's mail() â which works on
   Hostinger shared hosting. To customise, create data/mail-config.json:

     {
       "from": "no-reply@shivaa.in",
       "fromName": "Shivaa Jewellers",
       "replyTo": "care@shivaa.in",
       "subject": "Your Shivaa verification code"
     }

   Everything is defensive: a missing config, a refused send or a bad
   address returns ok=false with a reason â never an exception, and never
   the code itself.
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

declare(strict_types=1);

// v81 direct-access guard — this file is an include library, never a URL entry point.
if (!defined('SHV_RUN')) { http_response_code(403); header('Content-Type: text/plain; charset=utf-8'); echo '403 Forbidden'; exit; }

/** From/subject settings, with safe defaults derived from the site's own host. */
function shivaa_mail_config(): array {
  static $c = null;
  if ($c !== null) return $c;
  $c = ['from' => '', 'fromName' => 'Shivaa Jewellers', 'replyTo' => '',
        'subject' => 'Your Shivaa verification code'];
  $f = __DIR__ . '/data/mail-config.json';
  if (is_readable($f)) {
    $j = json_decode((string)file_get_contents($f), true);
    if (is_array($j)) foreach (['from', 'fromName', 'replyTo', 'subject'] as $k) {
      if (isset($j[$k]) && is_string($j[$k]) && trim($j[$k]) !== '') $c[$k] = trim($j[$k]);
    }
  }
  if ($c['from'] === '') {
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'shivaa.in');
    $host = preg_replace('/:\d+$/', '', $host);
    $host = preg_replace('/^www\./i', '', (string)$host);
    if (!preg_match('#^[a-z0-9.-]+\.[a-z]{2,}$#i', (string)$host)) $host = 'shivaa.in';
    $c['from'] = 'no-reply@' . strtolower((string)$host);
  }
  if ($c['replyTo'] === '') $c['replyTo'] = $c['from'];
  return $c;
}

/** aâ¢â¢â¢@gmail.com â safe to show on screen, useless to an attacker. */
function shivaa_mail_mask(string $email): string {
  $at = strrpos($email, '@');
  if ($at === false || $at < 1) return 'â¢â¢â¢';
  $user = substr($email, 0, $at);
  $dom  = substr($email, $at);
  $keep = substr($user, 0, 1);
  return $keep . str_repeat('â¢', max(3, min(6, strlen($user) - 1))) . $dom;
}

/** The plain-text body. Deliberately short, with the code alone on its line. */
function shivaa_mail_body(string $code, string $purpose, string $name = ''): string {
  $hi = $name !== '' ? ('Namaste ' . $name . ',') : 'Namaste,';
  $why = $purpose === 'reset'
    ? "You asked to set a new password on your Shivaa account."
    : "Here is the code to confirm your mobile number on the Shivaa website.";
  return $hi . "\n\n"
       . $why . "\n\n"
       . "    Your code:  " . $code . "\n\n"
       . "It is valid for 5 minutes and can be used once. "
       . "If you did not ask for this, you can ignore this email â nothing has changed "
       . "and your password stays as it was.\n\n"
       . "Never share this code with anyone. Nobody at Shivaa will ever ask you for it.\n\n"
       . "â Shivaa Jewellers\n"
       . "Ernate Shine Jewellery Pvt. Ltd., Jayal â Nagaur, Rajasthan\n"
       . "WhatsApp +91 89050 05921\n";
}

/**
 * Send a one-time code by email.
 * Returns ['ok'=>bool, 'to'=>masked, 'error'=>?string, 'from'=>string].
 */
function shivaa_mail_send(string $to, string $code, string $purpose = 'verify', string $toName = ''): array {
  $to = strtolower(trim($to));
  $cfg = shivaa_mail_config();
  if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    return ['ok' => false, 'to' => '', 'from' => $cfg['from'], 'error' => 'No valid email address to send to'];
  }
  if (!preg_match('/^\d{4,6}$/', $code)) {
    return ['ok' => false, 'to' => shivaa_mail_mask($to), 'from' => $cfg['from'], 'error' => 'Refused: the code must be 4-6 digits'];
  }
  // header-injection guard
  $clean = fn(string $s): string => trim(str_replace(["\r", "\n", "%0a", "%0d"], ' ', $s));
  $from = $clean($cfg['from']);
  $name = $clean($cfg['fromName']);
  $subject = $clean($purpose === 'reset' ? 'Reset your Shivaa password' : (string)$cfg['subject']);

  $headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . $name . ' <' . $from . '>',
    'Reply-To: ' . $clean((string)$cfg['replyTo']),
    'Return-Path: ' . $from,
    'X-Mailer: Shivaa/' . PHP_VERSION,
  ];
  $body = shivaa_mail_body($code, $purpose, $clean($toName));
  $ok = false; $err = null;
  try {
    // -f sets the envelope sender; some hosts refuse it, so fall back to plain mail().
    $ok = @mail($to, $subject, $body, implode("\r\n", $headers), '-f' . $from);
    if (!$ok) $ok = @mail($to, $subject, $body, implode("\r\n", $headers));
    if (!$ok) {
      $last = function_exists('error_get_last') ? error_get_last() : null;
      $err = ($last && !empty($last['message'])) ? 'mail() refused: ' . $last['message'] : 'mail() returned false (the host refused to hand the message over)';
    }
  } catch (Throwable $e) {
    $err = 'mail() threw: ' . $e->getMessage();
  }
  return ['ok' => (bool)$ok, 'to' => shivaa_mail_mask($to), 'from' => $from, 'error' => $err];
}
