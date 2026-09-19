/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v151 STATIC — the profile-audit doctor.
   The v150 exec proved the fetch lands on /v1/default and Truecaller answers
   with a REAL profile… the owner's BUSINESS profile (name "SHIVAA JEWELS",
   landline-shaped phoneNumbers). v151 adds a privacy-safe fingerprint — whose
   profile arrived (initials) and what phone CLASSES it holds — so ONE config
   fetch separates "tester has no mobile in his Truecaller account" from
   "the console serves one fixed profile to everyone". Page side untouched.
   Run: node tools/mega/smoke/v151-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v151-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = p => fs.readFileSync(path.join(CMS, p), 'utf8');

const api = read('api.php');
const app = read('js/app.js');
const sw = read('sw.js');
const idx = read('index.html');

const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
const st = (src, re) => { const m = String(src).match(re); return m ? +m[1] : 0; };

console.log('\n· A · the audit function exists and keeps its privacy promise');
ok('tc_profile_audit is a pure function (no curl, no echo, no file writes)',
  /function tc_profile_audit\(\$p\): string \{/.test(api) && (() => {
    const i0 = api.indexOf('function tc_profile_audit');
    const i1 = api.indexOf('/* v147', i0);   // the next block after the audit — exact window, order-aware
    return i0 > 0 && i1 > i0 && !/echo|file_put_contents|curl_/.test(api.slice(i0, i1));
  })());
ok('it fingerprints INITIALS only (first char of name.first/last, uppercased — never the name itself)',
  api.includes("mb_strtoupper(mb_substr($f !== '' ? $f : $l, 0, 1))") &&
  api.includes("mb_strtoupper(mb_substr($l, 0, 1))"));
ok('phone values become CLASSES (mobile/landline/short/odd) via tc_norm_phone — never digits',
  /return tc_norm_phone\(\$v\) !== '' \? 'mobile' : \(strlen\(\$d\) <= 8 \? 'short' : \(strlen\(\$d\) <= 13 \? 'landline' : 'odd'\)\);/.test(api));
ok('the known phone-key spellings are walked (phoneNumbers, phones, mobiles, maskedPhones, verifiedNumbers, primaryPhone, phoneNumber, msisdn)',
  api.includes("'phoneNumbers', 'phones', 'mobiles', 'maskedPhones', 'verifiedNumbers', 'primaryPhone', 'phoneNumber', 'msisdn'"));
ok('a business-shaped profile gets the ` business` flag (companyName|badges|jobTitle present)',
  /isset\(\$p\['companyName'\]\) \|\| isset\(\$p\['badges'\]\) \|\| isset\(\$p\['jobTitle'\]\)/.test(api) &&
  api.includes(" ? ' business' : ''"));
ok('the walk is budgeted (60 nodes) — a giant profile cannot hang a doctor write',
  /\$kinds = array\(\); \$budget = 60;/.test(api) && /if \(--\$budget <= 0\) return;/.test(api));

console.log('\n· B · wiring — both failure lines, both success lines, and the public config');
const consentFail = /'lastError' => mb_substr\('profile had no Indian mobile number \[keys: ' \. \$keys \. '\] \[aud ' \. \$aud \. '\] \| '/.test(api);
ok('consent-with-no-number stores [aud …] INSIDE lastError (so a config fetch shows it)', consentFail,
  'lastError format: message [keys: …] [aud who=… p=…] | snip');
ok('consent failure records lastProfile in the status file too', /'lastProfile' => mb_substr\(\$aud, 0, 80\)/.test(api));
ok('consent SUCCESS records who was read (from-body marker when no profile was fetched)',
  /'lastProfile' => mb_substr\(!empty\(\$res\['ok'\]\) \? tc_profile_audit\(\$res\['profile'\] \?\? null\) : 'who=- p=from-body', 0, 80\)/.test(api));
ok('the refetch failure line carries its own [aud …] (exact bytes, per the includes()-over-escaping rule)',
  api.includes("'no number in profile [aud ' . tc_profile_audit($res['profile'] ?? null) . ']'"));
ok('the refetch success line records lastProfile',
  /'lastProfile' => mb_substr\(tc_profile_audit\(\$res\['profile'\] \?\? null\), 0, 80\)\]\);\s*\/\/ v151/.test(api));
ok('config route EXPOSES lastProfile (public, ≤80 chars)',
  api.includes("'lastProfile' => is_array($st) ? substr((string)($st['lastProfile'] ?? ''), 0, 80) : '',"));

console.log('\n· C · the page side is provably UNTOUCHED + lockstep stamps');
ok('no v151 logic leaked into app.js (server-side-only release)',
  !/tc_profile_audit|\[aud |lastProfile/.test(app));
ok('ALL SEVEN storefront mobile gates are intact ([6-9]×10 stays the order phone standard)',
  (app.match(/\[6-9\]\\d\{9\}/g) || []).length === 7, 'count=' + (app.match(/\[6-9\]\\d\{9\}/g) || []).length);
ok('admin.js loader still ?v=147 (untouched since v147)', /\/js\/admin\.js\?v=147/.test(app) && !/admin\.js\?v=15\d/.test(app));
const rSw = st(sw, /SHELL = 'shivaa-shell-v(\d+)'/), rApp = st(app, /APP_REL\s*=\s*(\d+)/), rIdx = st(idx, /__SHIVAA_REL\s*=\s*(\d+)/);
const rAJS = st(idx, /\/js\/app\.js\?v=(\d+)/), rSJS = st(sw, /'\/js\/app\.js\?v=(\d+)'/);
ok('release stamps move together to 151+ (numeric floors — no ranges, per the v150 lesson)',
  rSw >= 151 && rApp >= 151 && rIdx >= 151 && rAJS >= 151 && rSJS >= 151,
  JSON.stringify({ rSw, rApp, rIdx, rAJS, rSJS }));
ok('frozen layers stay frozen (v116.js ?v=142, css 140 — untouched layers must not move)',
  st(idx, /\/js\/v116\.js\?v=(\d+)/) === 142 && st(idx, /\/css\/v116\.css\?v=(\d+)/) === 140);

ok('api/version is REAL this time: route exists, answers with rel 151 + shell + both stamps',
  api.includes("if ($route === 'version' && $method === 'GET') {") &&
  api.includes("'rel'   => 151,") && api.includes("SHELL = '([^']+)'") &&
  /__SHIVAA_REL/.test(api) && !/$route === 'health'/.test(api));   // the OLD claim died where it lives: as a ROUTE, comments notwithstanding
ok('api/version leaks NOTHING secret (no partnerKey, no tokens, no phones — only the four public doctor lines)',
  !/partnerKey|tcAppKey|accessToken|phone(?!Numbers)/.test(api.slice(api.indexOf("if ($route === 'version'"), api.indexOf("if ($route === 'auth/truecaller/config'"))));

const m = results.filter(Boolean).length;
console.log(`\n${m}/${results.length} v151 static checks passed  ${m === results.length ? '✦' : '✗'}`);
process.exit(m === results.length ? 0 : 1);
