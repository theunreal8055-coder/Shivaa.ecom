<?php
/*
 * Regression test for the bug that killed the first real bridge write on
 * 26 Sep 2026:
 *
 *   Fatal error: Cannot redeclare billing_config()
 *   (previously declared in .../billing/lib.php:59)
 *
 * inbox.php loads lib.php to read the kill switch, then requires api.php,
 * which loaded lib.php a second time. A lint and an undefined-function check
 * are both blind to this: the file is syntactically fine and every function
 * exists. Only loading it twice the way inbox.php does exposes it.
 *
 * What this fixture proves, and what it deliberately does not claim:
 *
 *  - require_once on lib.php is safe to repeat. This is the fix that shipped
 *    (inbox.php:31 and api.php:12).
 *  - A plain require on lib.php STILL redeclares. Tested below and expected to
 *    fatal, so it runs last in a child-safe way. lib.php carries a
 *    BILLING_LIB_LOADED guard, but a top-level `return` in an included file
 *    does not halt execution under php-wasm, so the guard alone is NOT
 *    sufficient. require_once in the callers is the primary fix; the guard is
 *    defence in depth for real PHP only. The source contract that both
 *    callers use require_once is asserted statically by
 *    billing-call-check.cjs, which can read api.php (this fixture cannot load
 *    it: api.php needs a session and a PDO handle).
 */
declare(strict_types=1);

$fails = 0;
function check(string $what, bool $ok): void {
  global $fails;
  printf("%s  %s\n", $ok ? 'PASS' : 'FAIL', $what);
  if (!$ok) { $fails++; }
}

// The shipped call pattern: inbox.php then api.php, both require_once.
require_once '/b/lib.php';
check('first load defines billing_config', function_exists('billing_config'));
$v = BILLING_VERSION;

require_once '/b/lib.php';   // inbox.php:31 then api.php:12
require_once '/b/lib.php';   // api.php:1156 also require_once's reports.php
check('repeat require_once does not redeclare', function_exists('billing_config'));
check('BILLING_VERSION stable across loads', BILLING_VERSION === $v);

check('guard constant defined',        defined('BILLING_LIB_LOADED'));
check('BILLING_SESSION set',           BILLING_SESSION !== '');
check('BILLING_CSRF set',              BILLING_CSRF !== '');
check('BILLING_VERSION is a positive int', BILLING_VERSION >= 1);

// Every function the bridge path calls must be live after the repeat loads.
foreach (['billing_config', 'billing_config_ok', 'billing_db', 'billing_json',
          'billing_fail', 'billing_input', 'billing_str', 'billing_num',
          'billing_int', 'billing_session_start', 'billing_csrf', 'billing_user',
          'billing_require_user', 'billing_check_csrf', 'billing_totals',
          'billing_amount_words', 'billing_inr', 'billing_grams',
          'billing_wa_link', 'billing_audit', 'billing_shop_revenue'] as $fn) {
  check('callable after repeat loads: ' . $fn, function_exists($fn));
}

// The guard must actually be reachable, not silently unreachable dead code.
check('guard is the first executable statement',
      (bool)preg_match('/define\(\s*[\'"]BILLING_LIB_LOADED[\'"]/',
                       (string)file_get_contents('/b/lib.php')));

printf("%s  (%d failures)\n", $fails === 0 ? 'DOUBLE-INCLUDE PASS' : 'DOUBLE-INCLUDE FAIL', $fails);
exit($fails === 0 ? 0 : 1);
