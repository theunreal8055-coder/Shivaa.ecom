<?php
/* ═══════════════════════════════════════════════════════════════
   SHIVAA · Care & warranty + service reminders (v50 · Feature #19)
   ─────────────────────────────────────────────────────────────
   Every order is auto-registered into `warranties` with a care
   schedule (30-day welcome, 180-day free clean & polish, 365-day
   inspection, 730-day re-polish/stone check, 1095-day deep care).
   `shivaa_care_scan()` generates `careReminders` when those dates
   arrive. Admin can send a WhatsApp / email reminder through the
   same plug-in used by order confirmations (notify.php) — no new
   gateway is required, and demo mode logs the reminder instead.
   ═══════════════════════════════════════════════════════════════ */
declare(strict_types=1);

function shivaa_care_schedule(): array {
  return [30 => 'Welcome check', 180 => 'Free cleaning & polish', 365 => 'Annual inspection', 730 => 'Re-polish & stone check', 1095 => 'Deep server care'];
}

/* Register one warranty record per ordered piece. */
function shivaa_care_create_warranty(array &$db, array $order, array $u): void {
  $db['warranties'] = $db['warranties'] ?? [];
  $phone = substr(preg_replace('/\D/', '', (string)(is_array($order['address'] ?? null) ? ($order['address']['phone'] ?? ($u['phone'] ?? '')) : ($u['phone'] ?? ''))), -10);
  $email = (string)(is_array($order['address'] ?? null) ? ($order['address']['email'] ?? ($u['email'] ?? '')) : ($u['email'] ?? ''));
  $months = 36;
  $until = date('c', strtotime('+' . $months . ' months', strtotime((string)($order['createdAt'] ?? 'now'))));
  foreach ($order['items'] ?? [] as $it) {
    $db['warranties'][] = [
      'id' => uid('war'), 'orderId' => $order['id'], 'userId' => $u['id'] ?? ($order['userId'] ?? ''),
      'customerName' => $order['userName'] ?? ($u['name'] ?? 'Customer'), 'phone' => $phone, 'email' => $email,
      'productId' => $it['productId'] ?? '', 'productName' => $it['name'] ?? 'Jewellery piece',
      'sku' => $it['sku'] ?? '', 'itemQty' => max(1, (int)($it['qty'] ?? 1)),
      'purchaseAt' => $order['createdAt'] ?? now_iso(), 'warrantyMonths' => $months,
      'warrantyUntil' => $until, 'coverage' => $months . '-month care + lifetime repair workmanship',
      'status' => 'active', 'reminders' => [], 'createdAt' => now_iso(),
    ];
  }
}

/* Generate service reminders that have crossed their due date. */
function shivaa_care_scan(array &$db): array {
  $db['warranties']     = $db['warranties'] ?? [];
  $db['careReminders']  = $db['careReminders'] ?? [];
  $today = time();
  $created = 0;
  foreach ($db['warranties'] as &$w) {
    if (($w['status'] ?? 'active') !== 'active') continue;
    $p = strtotime((string)($w['purchaseAt'] ?? 'now'));
    if (!$p) continue;
    $w['reminders'] = $w['reminders'] ?? [];
    foreach (array_keys(shivaa_care_schedule()) as $days) {
      if ($p + $days * 86400 > $today) continue;
      $key = 'd' . $days;
      if (in_array($key, $w['reminders'], true)) continue;
      $w['reminders'][] = $key;
      $db['careReminders'][] = [
        'id' => uid('rem'), 'warrantyId' => $w['id'], 'orderId' => $w['orderId'],
        'kind' => $key, 'service' => shivaa_care_schedule()[$days], 'dueAt' => date('c', $p + $days * 86400),
        'status' => 'pending', 'createdAt' => now_iso(), 'notifiedAt' => null,
        'customerName' => $w['customerName'] ?? '', 'phone' => $w['phone'] ?? '',
        'email' => $w['email'] ?? '', 'productName' => $w['productName'] ?? '',
      ];
      $created++;
    }
  }
  $due = count(array_filter($db['careReminders'] ?? [], fn($r) => ($r['status'] ?? '') === 'pending'));
  return ['created' => $created, 'due' => $due];
}

function shivaa_care_reminder_state(array $w, array $r, array $cfg): array {
  $site = rtrim((string)($cfg['siteUrl'] ?? 'https://shivaa.in'), '/');
  $L = ['✦ SHIVAA — CARE & WARRANTY ✦', '',
        'Namaste ' . ($w['customerName'] ?? '') . ' ✦',
        '',
        'Your piece below is due for ' . ($r['service'] ?? 'a service') . ':',
        '• ' . ($w['productName'] ?? 'Jewellery piece'),
        '• Order: ' . ($w['orderId'] ?? ''), '• Bought: ' . ($w['purchaseAt'] ?? ''),
        '• Warranty: ' . ($w['warrantyMonths'] ?? 36) . ' months + lifetime repair workmanship',
        '',
        'Book a free counter visit or send it in — we photograph and document the piece first.',
        'Care page: ' . $site . '/#/care', '',
        'Namaste Shivaa ✦ please schedule my service.'];
  $body = implode("\n", $L);
  return [
    'phone' => $w['phone'] ?? '', 'email' => $w['email'] ?? '', 'name' => $w['customerName'] ?? '',
    'orderId' => $w['orderId'] ?? '', 'productName' => $w['productName'] ?? '',
    'subject' => $site !== '' ? 'Your Shivaa jewellery is due for ' . ($r['service'] ?? 'care') . ' ✦' : '',
    'waText' => $L, 'body' => $body, 'msg' => $body, 'siteUrl' => $site,
  ];
}

/* Send one care reminder via the order-confirmation plug-in. */
function shivaa_care_send(array &$db, string $reminderId, string $channel): array {
  $db['careReminders'] = $db['careReminders'] ?? [];
  $db['warranties']    = $db['warranties'] ?? [];
  $db['notifications'] = $db['notifications'] ?? [];
  $db['notify']        = $db['notify'] ?? ['sent' => 0, 'ok' => 0, 'demo' => 0, 'lastAt' => null, 'lastErr' => null];

  $rem = null; $war = null;
  foreach ($db['careReminders'] as $x) if ($x['id'] === $reminderId) { $rem = $x; break; }
  if ($rem) foreach ($db['warranties'] as $x) if ($x['id'] === $rem['warrantyId']) { $war = $x; break; }
  if (!$rem || !$war) return ['ok' => false, 'mode' => 'demo', 'provider' => 'demo', 'to' => '', 'error' => 'Care reminder not found'];

  $cfg   = shivaa_notify_config() ?? [];
  $state = shivaa_care_reminder_state($war, $rem, $cfg);
  $r = $channel === 'email' ? shivaa_notify_send_email($cfg, $state) : shivaa_notify_send_whatsapp($cfg, $state);
  $r['kind'] = 'care_reminder';

  $log = [
    'id' => uid('nt'), 'orderId' => $war['orderId'], 'channel' => $channel,
    'kind' => 'care_reminder', 'to' => $r['to'] ?? '', 'mode' => $r['mode'] ?? 'demo',
    'provider' => $r['provider'] ?? 'demo', 'ok' => (bool)($r['ok'] ?? false),
    'error' => cut500((string)($r['error'] ?? '')), 'response' => cut500((string)($r['response'] ?? '')),
    'message' => cut500($state['body'] ?? ''), 'createdAt' => now_iso(),
  ];
  $db['notifications'][] = $log;
  $db['notify']['sent']++;
  if ($log['ok']) $db['notify']['ok']++; else $db['notify']['lastErr'] = $log['error'];
  if ($log['mode'] === 'demo') $db['notify']['demo']++;
  $db['notify']['lastAt'] = now_iso();

  foreach ($db['careReminders'] as &$x) if ($x['id'] === $reminderId) {
    $x['status'] = $log['ok'] ? 'sent' : 'pending';
    $x['notifiedAt'] = now_iso();
    $x['logId'] = $log['id'];
    $x[$channel . 'Result'] = ['ok' => $log['ok'], 'mode' => $log['mode'], 'provider' => $log['provider'], 'error' => $log['error'] ?: null];
  }

  return ['ok' => $log['ok'], 'mode' => $log['mode'], 'provider' => $log['provider'], 'to' => $log['to'], 'error' => $log['error'] ?: null, 'logId' => $log['id']];
}
