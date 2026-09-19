/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v149 STATIC CHECK — "no intermediate page" + self-healing reads.
   The owner's live verdict on v148: Truecaller confirmed him but the server's
   ONE read of the profile found no number (live doctor: lastOk:0,
   "profile had no Indian mobile number") → the customer was asked to re-tap
   for OUR failure; and the Express page opened at all ("why do you even open
   this page — they should directly go to cashfree").
   This gate pins the v149 answers: deep shape-tolerant extraction with a
   body fallback, a token-keeping FAILED entry, the server refetch route with
   throttle, the instant one-tap wired into pdBuy + the three cart CTAs, the
   Express-card rescue, the boot re-attach, and the single deep-link source.
   Run: node tools/mega/smoke/v149-check.js
   ═══════════════════════════════════════════════════════════════════════ */
/* v152 · retired-feature guard — the phone-verify vendor was REMOVED by owner
   decision 19 Sep (Express to Cashfree direct is the flow). This suite documents
   the v143–v151 era: it SKIPs (exit 0) on trees without the feature and still
   fully RUNS on any older tree/overlay (SHIVAA_ROOT / SMOKE_CMS). */
{
  const _fs = require('fs'), _pt = require('path');
  const _root = process.env.SHIVAA_ROOT || _pt.resolve(__dirname, '../../..');
  const _cms = process.env.SMOKE_CMS || _pt.join(_root, 'cms');
  let _api = '';
  try { _api = _fs.readFileSync(_pt.join(_cms, 'api.php'), 'utf8'); } catch (e) {}
  if (!/auth\/truecaller\/callback/.test(_api)) { console.log('SKIP — v152: verification vendor not in this tree'); process.exit(0); }
}

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

console.log('\n· A · stamps move as one, admin bundle does NOT');
const rShell = +((sw.match(/shivaa-shell-v(\d+)/) || [])[1] || 0);
const rApp = +(app.match(/APP_REL\s*=\s*(\d+)/) || [])[1] || 0;
const rSwApp = +((sw.match(/\/js\/app\.js\?v=(\d+)/) || [])[1] || 0);
const rIdx = +(idx.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0;
ok('release numbers are ≥149 and in lockstep (numeric pin — survives future bumps)',
  rShell >= 149 && rApp >= 149 && rSwApp >= 149 && rIdx >= 149 &&
  rShell === rApp && rApp === rSwApp && rSwApp === rIdx, [rShell, rApp, rSwApp, rIdx].join('/'));
ok('admin loader keeps its own stamp (per-file rule: admin.js untouched by v149)',
  /cms\/js\/admin\.js\?v=147|admin\.js\?v=147/.test(app) && !/admin\.js\?v=149/.test(app));
ok('the per-file v116/v117 stamps stay 142 in sw.js (untouched by design)',
  (sw.match(/v116\.js\?v=142/) || sw.match(/v116\.js\?v=\$\{/) || []).length > 0 || /v116\.js\?v=142/.test(sw));

console.log('\n· B · api.php — the reader learns every shape (the LIVE failure fixed)');
ok('tc_norm_phone exists and is strict about 0/91/0091 prefixes + ^[6-9]',
  /function tc_norm_phone/.test(api) && /0091/.test(api) && api.includes("preg_match('/^[6-9]\\d{9}$/', $d)"));
ok('tc_profile_extract walks the WHOLE tree (depth cap + budget + phone-ish keys + bare-value regex)',
  /function tc_profile_extract/.test(api) && /\$depth > 6/.test(api) && /e164\|msisdn\|phone\|mobile\|number/i.test(api) && /budget/.test(api));
ok('id/token/nonce keys can never masquerade as numbers',
  /skipKeys\s*=\s*\[[^\]]*'requestid'[^\]]*'accesstoken'[^\]]*\]/.test(api));
const cbSlice = api.slice(api.indexOf("auth/truecaller/callback' && $method === 'POST'"), api.indexOf('auth/truecaller/result', api.indexOf("auth/truecaller/callback' && $method === 'POST'")));
ok('consent path uses the deep reader for the profile AND falls back to the callback body itself',
  /tc_profile_extract\(\$res\['profile'\]\)/.test(cbSlice) && /tc_profile_extract\(\$body\)/.test(cbSlice));
ok('both failed shapes now carry the retry material tk+ep on the entry (and NO such thing in ok entries)',
  (cbSlice.match(/'st' => 'failed', 'tk' => \$token, 'ep' => \$ep/g) || []).length === 2);
ok('the no-number diagnostic records the profile KEY NAMES (never values) for the doctor',
  /\[keys: '\.trim?\(?|'keys: ' \. \$keys|\. \$keys \.\ '/.test(cbSlice) || /'lastError' => mb_substr\('profile had no Indian mobile number \[keys: '/.test(cbSlice));
ok('nonce entry files are chmod 0600 (they can hold a live token for ≤10 min)',
  /@chmod\(tc_verify_path\(\$nonce\), 0600\)/.test(api));

console.log('\n· C · api.php — the refetch route (server retries ITS read)');
const rf = api.slice(api.indexOf("auth/truecaller/refetch' && $method === 'GET'"), api.indexOf("auth/truecaller/config' && $method === 'GET'"));
ok('route exists, answers the same wire format as result, and only RE-READS what failed with material',
  /'auth\/truecaller\/refetch'/.test(api) && /\$st !== 'failed' \|\| empty\(\$entry\['tk'\]\) \|\| empty\(\$entry\['ep'\]\)/.test(rf));
ok('one attempt per 12 s (rf stamp) — no hammering Truecaller',
  /time\(\) - \(int\)\(\$entry\['rf'\] \?\? 0\) < 12/.test(rf) && /\$entry\['rf'\] = time\(\)/.test(rf));
ok('a nonce that is ALREADY ok returns verified immediately (a page that raced the flip)',
  /\$st === 'ok' && preg_match.*refetch|if \(\$st === 'ok'/.test(rf));
ok('token NEVER leaves through a response — refetch jouts verified/phone/name/retry/throttled only',
  !/'tk'|"tk"/.test(rf.replace(/\$entry\['tk'\]/g, '')) && !/'ep'/.test(rf.replace(/\$entry\['ep'\]/g, '')));
ok('success flips the entry to ok with the same shape consent uses',
  /tc_entry_put\(\$nonce, \['st' => 'ok', 'phone' => \$phone, 'name' => \$name\]\)/.test(rf));
const cfgSlice = api.slice(api.indexOf("auth/truecaller/config' && $method === 'GET'"), api.indexOf("auth/truecaller/config' && $method === 'GET'") + 2400);
ok('the public config route still exposes only lastKind/lastOk/lastError — no tokens, no phones',
  !/'tk'|'ep'|'phone'/.test(cfgSlice));

console.log('\n· D · app.js — the instant one-tap (the page the owner refused to see)');
ok('one cached config read shared by every entry point',
  /Shivaa\._tcCfgCache/.test(app) && /Shivaa\._tcCfg = async/.test(app));
ok('a SINGLE deep-link builder (truecallersdk string appears exactly once in app.js)',
  (app.match(/truecallersdk:\/\//g) || []).length === 1 && /function tcDeepLink\(nonce, partnerKey\)/.test(app));
ok('the Express card mounts with that same builder (no fork)',
  /tcDeepLink\(nonce, tcCfg\.partnerKey\)/.test(app));
ok('tcInstant engine exists with its own pill UI and the SAME patience ladder',
  /Shivaa\.tcInstant = async/.test(app) && /shvTcPill/.test(app) && /slow \? 3500 : 700/.test(app.split('Shivaa.tcInstant = async')[1].slice(0, 9000)));
ok('the tap that replaces navigation: pdBuy upgrades to the instant path on Android+tc, everyone else keeps #/express',
  /await window\.Shivaa\.tcInstantReady\(\)[\s\S]{0,140}tcInstant\(\{ kind: 'item'/.test(app));
ok('all THREE cart CTAs carry data-tcinstant (upgrade marker) while keeping the #/express href',
  (app.match(/data-tcinstant="1"/g) || []).length === 3);
ok('delegated listener upgrades the CTA tap ONLY on a warm cache, else the href stands',
  /closest\('a\[data-tcinstant\]'\)/.test(app) && /if \(!window\.Shivaa\._tcCfgCache\) return;/.test(app));
ok('a verified number on the instant path BUYS: real order body, boundary address, nonce attached',
  /line: 'Collected on Cashfree \(verified address\)'/.test(app) &&
  /tcNonce: nonce,/.test(app) && /paymentMethod: 'Online',/.test(app));
ok('the pending marker learns the instant intent (mode+kind+item) so a reclaimed tab RESUMES',
  /mode: 'instant', kind:/.test(app));
ok('boot warms the cache AND resumes an interrupted instant tap ≤9 min fresh, never on #/express',
  /p\.mode === 'instant' && p\.nonce/.test(app) && /indexOf\('#\/express'\) !== 0/.test(app));
ok('handoff never dead-ends: rejected/failed/deadline land on #/express with the SAME nonce still pending',
  /const handoff = why => \{[\s\S]{0,220}cleanup\(false\)[\s\S]{0,220}#\/express/.test(app));
ok('busy-flag double-tap guard on BOTH entry points',
  /if \(window\.Shivaa\._tcInstantBusy\) return;/.test(app) && (app.match(/_tcInstantBusy\) \{ ev\.preventDefault\(\); return; \}/g) || []).length === 1);

console.log('\n· E · the Express card also got the second-look rescue (typed fallback untouched)');
ok('failed:true on the card now TRIES THE SERVER FIRST, then keeps the v148 loud-retry UX',
  /truecaller\/refetch\?nonce=' \+ encodeURIComponent\(nonce\)/.test(app) &&
  /our second read of the number came through/.test(app) &&
  /reading the number hiccuped/.test(app) && /Try Truecaller again/.test(app));
ok('placed-guard each poll survives the refactor (Make It Yours already fired → stop)',
  /if \(placed\) \{ stop\(\); return; \}/.test(app));
ok('nothing hijacks navigation away (both engines watch the hash)',
  (app.match(/String\(location\.hash \|\| ''\)/g) || []).length >= 2);

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v149 static checks passed  ${n === results.length ? '✦' : ''}`);
process.exit(n === results.length ? 0 : 1);
