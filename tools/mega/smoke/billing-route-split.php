<?php
/*
 * Regression test for the bug behind "I can see it but can't see the rates
 * of wastage" (26 Sep 2026).
 *
 * The UI's fetch helper sends api.php?r=<whole route, URL-encoded>, so a
 * rate-card read arrived as r="rate-cards?entity=supplier&id=2". api.php used
 * $_GET['r'] verbatim as the route, so:
 *   - no route matched "rate-cards?entity=supplier&id=2" (it has a ? in it),
 *   - $_GET['entity'] and $_GET['id'] never existed,
 * and the wastage sheet could never load. Orders filter and supplier search
 * embed their queries the same way and were equally broken.
 *
 * billing_route_split() fixes it server-side. These cases replay the exact
 * strings app.js produces (see app.js:1289, :1435 and the suppliers search).
 */
declare(strict_types=1);

require_once '/b/lib.php';

$fails = 0;
function check(string $what, bool $ok): void {
  global $fails;
  printf("%s  %s\n", $ok ? 'PASS' : 'FAIL', $what);
  if (!$ok) { $fails++; }
}

// 1. The rate sheet, exactly as rateCardSheet() builds it.
list($r, $g) = billing_route_split(['r' => 'rate-cards?entity=supplier&id=2']);
check('rate route matches',           $r === 'rate-cards');
check('entity extracted',             ($g['entity'] ?? '') === 'supplier');
check('id extracted',                 ($g['id'] ?? '') === '2');
check('billing_int sees the id',      billing_int($g['id'] ?? 0) === 2);

// 2. The orders filter, exactly as the orders screen builds it.
list($r, $g) = billing_route_split(['r' => 'orders?type=Purchase&status=New']);
check('orders route matches',         $r === 'orders');
check('type extracted',               ($g['type'] ?? '') === 'Purchase');
check('status extracted',             ($g['status'] ?? '') === 'New');

// 3. Supplier search with a space, URL-encoded by encodeURIComponent.
list($r, $g) = billing_route_split(['r' => 'suppliers?q=' . rawurlencode('shri radhey')]);
check('search route matches',         $r === 'suppliers');
check('q decoded with the space',     ($g['q'] ?? '') === 'shri radhey');

// 4. A plain route is untouched.
list($r, $g) = billing_route_split(['r' => 'suppliers']);
check('plain route unchanged',        $r === 'suppliers' && !isset($g['q']));

// 5. No r at all (defensive) yields an empty route, no crash.
list($r, $g) = billing_route_split([]);
check('missing r gives empty route',  $r === '');

// 6. A real query string wins over the embedded one.
list($r, $g) = billing_route_split(['r' => 'rate-cards?entity=supplier&id=2', 'id' => '9']);
check('real query param wins',        ($g['id'] ?? '') === '9');
check('embedded-only param still in', ($g['entity'] ?? '') === 'supplier');

// 7. Route regexes that api.php uses must now see a clean route.
list($r, $g) = billing_route_split(['r' => 'rate-cards/7?x=1']);
check('delete-style route keeps its id', preg_match('#^rate-cards/(\d+)$#', $r) === 1);

printf("%s  (%d failures)\n", $fails === 0 ? 'ROUTE-SPLIT PASS' : 'ROUTE-SPLIT FAIL', $fails);
exit($fails === 0 ? 0 : 1);
