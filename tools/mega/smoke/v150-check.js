/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v150 STATIC CHECK — endpoint normalisation + a doctor that explains
   itself. The v149 deep reader moved the failure from "keys we never checked"
   to a PROVEN fact (live doctor): the fetch ANSWERS 200+JSON yet holds no
   digits — the classic signature of GETting the bare profile HOST because
   Truecaller's reply carries "https://profile4-….truecaller.com" and expects
   /v1/default to be appended. v150 fixes the shape, keeps the policy tight,
   and makes any remaining mystery self-reporting: a digit-masked snippet of
   the actual body + the exact URL fetched, both in the public doctor.
   Run: node tools/mega/smoke/v150-check.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const idx = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

console.log('\n· A · stamps move as one, admin stays');
const rShell = +((sw.match(/shivaa-shell-v(\d+)/) || [])[1] || 0);
const rApp = +(app.match(/APP_REL\s*=\s*(\d+)/) || [])[1] || 0;
const rSwApp = +((sw.match(/\/js\/app\.js\?v=(\d+)/) || [])[1] || 0);
const rIdx = +(idx.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0;
ok('release numbers are ≥150 and in lockstep (numeric — never re-pin)',
  rShell >= 150 && rApp >= 150 && rSwApp >= 150 && rIdx >= 150 && rShell === rApp && rApp === rSwApp && rSwApp === rIdx,
  [rShell, rApp, rSwApp, rIdx].join('/'));
ok('admin loader keeps ?v=147 (api-only release; admin.js untouched)',
  /admin\.js\?v=147/.test(app) && !/admin\.js\?v=15\d/.test(app));

console.log('\n· B · endpoint shape FIRST, policy right behind, curl last');
ok('tc_norm_endpoint is a pure function and appends /v1/default to bare hosts and root paths',
  /function tc_norm_endpoint\(string \$ep\)/.test(api) && api.includes("if ($path === '' || $path === '/') $path = '/v1/default';"));
ok('the fetcher NORMALISES before it allowlists (a bare host is a shape to fix, not a threat to refuse)',
  api.indexOf('$endpoint = tc_norm_endpoint($endpoint)') < api.indexOf("'endpoint host not allowed']") &&
  api.indexOf('$endpoint = tc_norm_endpoint($endpoint)') < api.indexOf('curl_init($endpoint)'));
ok('the allowlist regex itself is UNCHANGED from v148 (host class identical — only the shape moved)',
  api.includes('[a-z0-9\\-]+\\.)*truecaller\\.com/[a-z0-9/_\\-\\.]*'));
ok('curl guard now sits BELOW the policy (sandbox can EXECUTE the policy path)',
  api.indexOf('curl_init($endpoint)') > api.indexOf("if (!function_exists('curl_init')) return ['ok' => false, 'err' => 'curl missing'];\n  $ch"));
ok('profile GET follows a ≤2-hop redirect and sends a compatible User-Agent (CDNs that 200-error bare curl)',
  /CURLOPT_FOLLOWLOCATION => true/.test(api) && /CURLOPT_MAXREDIRS => 2/.test(api) && /User-Agent: Mozilla\/5\.0 \(compatible; ShivaaJewels\/1\.0\)/.test(api));

console.log('\n· C · the doctor explains itself (privacy-safe)');
ok('tc_snip masks EVERY digit run and any 16+ char token blob before anything is stored',
  /function tc_snip\(string \$raw, int \$cap = 200\)/.test(api) && api.includes("preg_replace('/\\d+/', '#', $s)") && /\{16,\}/.test(api));
ok('both consent FAILURE notes carry the snippet AND the normalised endpoint (lastEp)',
  (api.match(/'lastEp' => mb_substr\(tc_norm_endpoint\(\$ep\), 0, 120\)/g) || []).length === 2 &&
  (api.match(/\.\s*\(string\)\(\$res\['snip'\] \?\? ''\)/g) || []).length >= 2);
ok('the refetch writes its OWN line (lastRefetchError) — the CONSENT evidence survives next to it (v149 overwrote it: the whole point)',
  /'lastRefetchError' => mb_substr\(\$why, 0, 300\), 'lastRefetchAt' => time\(\)/.test(api) &&
  !/'lastKind' => 'refetch', 'lastOk' => 0, 'lastError'/.test(api));
ok('a refetch SUCCESS clears the refetch line and lights lastOk',
  /'lastOk' => 1, 'lastError' => '', 'lastRefetchError' => ''/.test(api));
ok('the public config route exposes lastEp + lastRefetchError, caps them, and STILL leaks no phone/token/body',
  /'lastEp'        => is_array\(\$st\)/.test(api) && /'lastRefetchError' => is_array\(\$st\)/.test(api) &&
  !/'tk'|'accessToken'|"snip"/.test(api.slice(api.indexOf("auth/truecaller/config' && $method === 'GET'"), api.indexOf("auth/truecaller/config' && $method === 'GET'") + 2600)));

console.log('\n· D · the last shape hole: JSON riding as an escaped string');
ok('tc_profile_extract parses JSON-in-a-string and keeps walking (same budget)',
  /v\[0\] === '\{' \|\| \$v\[0\] === '\['/.test(api) && /\$sub = json_decode\(\$v, true\)/.test(api));
ok('recursion stays guarded: depth ≤6, budget, skip-list for id/token keys — all still there',
  /\$depth > 6/.test(api) && /--\$budget/.test(api) && /skipKeys\s*=\s*\[/.test(api));

console.log('\n· E · nothing on the page side moved except the stamp (server-only release)');
ok('the instant engine + card engine are intact (v149 markers)',
  /Shivaa\.tcInstant = async/.test(app) && /reading the number hiccuped/.test(app) && (app.match(/data-tcinstant="1"/g) || []).length === 3);
ok('the refetch-first rescue stays wired in BOTH engines',
  (app.match(/truecaller\/refetch\?nonce='/g) || []).length === 2);

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v150 static checks passed  ${n === results.length ? '✦' : ''}`);
process.exit(n === results.length ? 0 : 1);
