# -*- coding: utf-8 -*-
"""v55 api.php batch — all additive routes:
   referral codes on register · public finale entry counter · funnel events ·
   abandoned carts · order meta (HUID/dispatch/e-way) · B2B khata ledger ·
   stats enrichment (funnel/referrals/carts) · referralCode in pub_user."""
p = 'cms/api.php'
s = open(p, encoding='utf-8').read()
o = s

def rep(old, new, label):
    global s
    c = s.count(old)
    assert c == 1, f'{label}: count={c}'
    s = s.replace(old, new, 1)
    print('ok:', label)

# collections init
rep("'resetRate','pubRate'] as $__k)",
    "'resetRate','pubRate','events','carts','khata'] as $__k)", 'init collections')

# pub_user passes the referral code through
rep("'createdAt' => $u['createdAt'] ?? '', 'profile' => $u['profile'] ?? [], 'addresses' => $u['addresses'] ?? []];",
    "'createdAt' => $u['createdAt'] ?? '', 'profile' => $u['profile'] ?? [], 'addresses' => $u['addresses'] ?? [],\n          'referralCode' => $u['referralCode'] ?? null];", 'pub_user referralCode')

# register: assign code + capture ref
rep("""    $u = ['id' => uid('u'), 'name' => $b['name'], 'email' => strtolower($b['email']), 'phone' => $phone,
          'passHash' => pw_hash((string)$b['password']), 'role' => 'customer',
          'loyaltyPoints' => 120, 'wishlist' => [], 'createdAt' => now_iso()];""",
"""    $ref = strtoupper((string)($b['ref'] ?? ''));
    $u = ['id' => uid('u'), 'name' => $b['name'], 'email' => strtolower($b['email']), 'phone' => $phone,
          'passHash' => pw_hash((string)$b['password']), 'role' => 'customer',
          'loyaltyPoints' => 120, 'wishlist' => [], 'createdAt' => now_iso(),
          'referralCode' => 'SH' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5)),
          'referredBy' => preg_match('/^SH[A-Z0-9]{5}$/', $ref) ? $ref : null];""", 'register referral')

# public finale entry counter (before the admin entries route)
rep("""  if ($route === 'finale/entries'""",
"""  if ($route === 'finale/count' && $method === 'GET') {
    jout(200, ['count' => count(array_filter($db['finaleEntries'], fn($e) => ($e['status'] ?? '') === 'Entered'))]);
  }
  if ($route === 'finale/entries'""", 'finale/count public')

# funnel events (rate-limited, capped)
rep("""  if ($route === 'newsletter' && $method === 'POST') {""",
"""  if ($route === 'ev' && $method === 'POST') {
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
                      'phone' => substr(preg_replace('/\\D/', '', (string)($b['phone'] ?? '')), -10), 'at' => now_iso()];
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
  if ($route === 'newsletter' && $method === 'POST') {""", 'events + carts + order-meta + khata routes')

# stats enrichment
rep("'signIns' => array_reverse(array_slice($db['securityLog'] ?? [], -6))]);",
"""'signIns' => array_reverse(array_slice($db['securityLog'] ?? [], -6)),
               'referrals' => count(array_filter($db['users'], fn($u) => !empty($u['referredBy']))),
               'abandonedCarts' => count($db['carts'] ?? []),
               'funnel' => (function () use ($db) {
                 $cut = date('c', time() - 7 * 86400);
                 $f = ['view' => 0, 'cart' => 0, 'checkout' => 0];
                 foreach (($db['events'] ?? []) as $e)
                   if (($e['t'] ?? '') >= $cut && isset($f[$e['ev'] ?? ''])) $f[$e['ev']]++;
                 return $f;
               })()]);""", 'stats funnel/referrals/carts')

open(p, 'w', encoding='utf-8').write(s)
print('api.php v55 batch applied:', s != o)
