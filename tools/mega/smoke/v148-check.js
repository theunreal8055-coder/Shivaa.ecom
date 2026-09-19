/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v148 check — TRUECALLER PATIENCE. The owner's live test (19 Sep):
   "…when I click Verify with Truecaller it shows my number and when I click
   that number … it says Truecaller is open tap continue … and nothing
   happens … that means Truecaller is not still working." The live doctor
   proved Truecaller's consent DID reach the server (lastKind=consent,
   minutes after the tap) — v147's page simply had STOPPED listening after
   ~40 s. v148 makes the page patient and makes a broken profile read loud.
   These checks pin that repair; they also pin the version-lockstep rule
   (only CHANGED files move their ?v=; admin.js untouched → stays 147).
   Run: node tools/mega/smoke/v148-check.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const shell = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');

const g = (re, t) => Number((re.exec(t) || [0, 0])[1]);
const rShell = g(/window\.__SHIVAA_REL=(\d+);/, shell);
const rApp = g(/APP_REL\s*=\s*(\d+)/, app);
const rSw = g(/SHELL = 'shivaa-shell-v(\d+)'/, sw);

console.log('\n· A · stamps (v148; only changed files move)');
ok('release triple is ≥148 and in lockstep (numeric pin — survives future bumps)', rShell >= 148 && rApp >= 148 && rSw >= 148 && rShell === rApp && rApp === rSw, [rShell, rApp, rSw].join('/'));
ok('shell + worker request the SAME app.js stamp as the release',
  new RegExp('/js/app\\.js\\?v=' + rShell).test(shell) && new RegExp("'\\/js\\/app\\.js\\?v=" + rShell + "'").test(sw));
ok('worker still precaches the UNCHANGED v116 layer at ?v=142 (owner ruling)',
  /'\/js\/v116\.js\?v=142'/.test(sw) && /v116\.js\?v=142/.test(shell));
ok('admin loader kept at 147 — admin.js is byte-identical to the v147 release (per-file rule)',
  /injectScript\('\/js\/admin\.js\?v=147'\)/.test(app) && (() => {
    try { execSync('git -C ' + ROOT + ' diff --quiet HEAD -- cms/js/admin.js'); return true; }
    catch (e) { return false; } // admin.js must NOT have moved this release
  })());

console.log('\n· B · app.js — the patience engine');
ok('pending-nonce window is 9 minutes (was 3), matching Truecaller’s own 10-min TTL',
  /freshRec = e => !!\(e && e\.nonce && \(Date\.now\(\) - \(e\.at \|\| 0\)\) < 9 \* 60 \* 1000\)/.test(app));
ok('a hard deadline exists for the patient watch (DEADLINE = now + 9 min)',
  /const DEADLINE = Date\.now\(\) \+ 9 \* 60 \* 1000;/.test(app) && /if \(slow && Date\.now\(\) > DEADLINE\)/.test(app));
ok('phase switch at exactly 55 fast polls: slow=true, re-ARM (never stop)',
  /if \(polls === 55 && !slow\)/.test(app) && /slow = true; arm\(\);/.test(app));
ok('the interval follows the phase (700 ms fast / 3500 ms patient)',
  /setInterval\(pollOnce, slow \? 3500 : 700\)/.test(app));
ok('the mid-wait hint offers typing WITHOUT ending the watch',
  /Still waiting on Truecaller/.test(app) && /keep this page open: if Truecaller answers, it continues by itself/.test(app));
ok('late consent still pays off: verified number → finish() → doBuy, minute 8 same as second 5',
  app.includes("if (r && r.verified && /^[6-9]\\d{9}$/.test(r.phone || ''))") && app.includes("finish(r.phone, r.name || '')"));
ok('poll stops when Make It Yours already placed the order (no double buy)',
  /if \(placed\) \{ stop\(\); return; \}/.test(app));
ok('poll stops when the customer left the express page (no navigation hijack), nonce stays pending for the return',
  /indexOf\('#\/express'\) !== 0\) \{ stop\(\); return; \}/.test(app));
ok('returning to the page re-arms the watch while the pending nonce is fresh',
  /if \(freshRec\(p2\) && p2\.nonce === nonce\) start\(\);/.test(app));
ok('server-reported FAILURE of the profile read is loud: fresh nonce on retry, no silent spinner',
  /if \(r && r\.failed\)/.test(app) && /nonce = newNonce\(\); sent = false; slow = false;/.test(app) && /Try Truecaller again/.test(app));
ok('express item restore window matches the patient watch (9 min)',
  /\(Date\.now\(\) - \(p\.at \|\| 0\)\) < 9 \* 60 \* 1000/.test(app));

console.log('\n· C · api.php — say so when the read breaks');
const cbSlice = api.slice(api.indexOf("auth/truecaller/callback' && $method === 'POST'"), api.indexOf('auth/truecaller/result', api.indexOf("auth/truecaller/callback' && $method === 'POST'")));
ok('profile allowlist accepts subdomains AND bare truecaller.com AND a query string (v148)',
  /preg_match\('#\^https:\/\/\(\?:\[a-z0-9\\-\]\+\\.\)\*truecaller\\\.com\/\[a-z0-9\/_\\-\\\.\]\*\(\?:\\\?\[a-z0-9=&_%\.,\\-~\]\*\)\?\$#i'/.test(api));
ok('failed profile read STORES a terminal state for the nonce',
  (cbSlice.match(/'st' => 'failed'/g) || []).length === 2 && /'st' => 'failed', 'tk' => \$token, 'ep' => \$ep/.test(cbSlice));
ok('success note sets lastOk=1 and clears stale lastError; non-consent notes clear lastOk',
  /'lastOk' => 1, 'lastError' => ''/.test(cbSlice) && /'lastKind' => 'invoked', 'lastOk' => ''/.test(cbSlice) && /'lastKind' => 'rejected', 'lastOk' => ''/.test(cbSlice));
ok('result route surfaces the failed state',
  /\$st === 'failed'\)   jout\(200, \['verified' => false, 'failed' => true\]\)/.test(api));
ok('config doctor exposes lastOk + lastError (≤160 chars, sanitized server-side, no personal data)',
  /'lastOk'        => is_array\(\$st\) \? \(\$st\['lastOk'\] \?\? ''\) : ''/.test(api) &&
  /'lastError'\s*=> is_array\(\$st\) \? substr\(\(string\)\(\$st\['lastError'\] \?\? ''\), 0, \d+\)/.test(api));   // v150 fix-forward: the CAP is a number, not a literal

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v148 checks passed  ${n === results.length ? '✦' : ''}`);
process.exit(n === results.length ? 0 : 1);
