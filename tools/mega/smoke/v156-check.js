/* ══════════════════════════════════════════════════════════════════════════
   SHIVAA v156 check — "SHIVAA'S OWN RATES" + the 24K premium + B2B FROZEN.

   The owner's order, 19 Sep 2026:
     1  "wherever there is Jaipur mentioned, mention shivaa or shivaa's rates"
     2  "add premium to 24 karat gold rates in the b2c section, add same
         premium as you have added in the 22 karat"
     3  "find some bugs in the app and solve"
     4  "don't disturb b2b section"

   A · stamps        (7)  the release moves as one lockstep triple + loaders
   B · the 24K premium(7)  source: one helper, every retail path, 18K derives
   C · the brand sweep(10) every surviving "Jaipur" is geography or internal,
                           every description render site is filtered, and the
                           master db.json moved in its 77 descriptions ONLY
   D · B2B FROZEN     (6)  the desk's own code is byte-identical to v155 and
                           its four partner pages differ in the brand word only
   E · PHP executed  (11)  the retail ladder, the raw history, the alias
   F · PHP vs v155    (5)  RTGS board, all 77 prices, and a DEEP DIFF of the
                           whole payload: exactly 7 retail paths moved
   G · knob & pin     (3)  admin override, pinned counter rate, version truth

   Run: node tools/mega/smoke/v156-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v156-check.js   (zip overlay)
   ══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
/* the v155 baseline this release was branched from — the B2B comparison runs
   against the REAL bytes of that commit, not against a memory of them. */
const BASE = 'b3e7f6dd36699c5c68b3b55e50e4d957eb380d5a';

const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
const read = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const md5 = s => crypto.createHash('md5').update(s).digest('hex');

const idx = read('index.html'), app = read('js/app.js'), sw = read('sw.js'), api = read('api.php');
const adm = read('js/admin.js'), v107 = read('js/v107.js'), v120 = read('js/v120.js');
const manW = read('manifest.webmanifest'), manJ = read('manifest.json');
const dbJson = read('data/db.json'), DB = JSON.parse(dbJson);
const styles = read('css/styles.css');

/* ══════════════ A · the release moves as ONE lockstep triple ══════════════ */
console.log('\nSHIVAA v156 check\n\n· A · stamps (156 lockstep, loader stamps included)');
const num = (re, t) => Number((re.exec(t) || [0, 0])[1]);
const relIdx = num(/window\.__SHIVAA_REL=(\d+);/, idx);
const relApp = num(/APP_REL\s*=\s*(\d+)/, app);
const relSw = num(/SHELL = 'shivaa-shell-v(\d+)'/, sw);
const relApi = num(/'rel'\s+=> (\d+),/, api);           // note the 3-space gap — greps missed it once
ok('index __SHIVAA_REL = 156', relIdx === 156, String(relIdx));
ok('app.js APP_REL = 156', relApp === 156, String(relApp));
ok('sw.js SHELL = shivaa-shell-v156', relSw === 156, String(relSw));
ok("api.php version 'rel' => 156", relApi === 156, String(relApi));
ok('the LOADER stamps moved too (the v152 near-miss: index + worker agree on app.js?v=156)',
  idx.includes('/js/app.js?v=156"') && sw.includes("'/js/app.js?v=156'"));
ok('every file v156 edited carries its new ?v= (immutable cache is one year)',
  num(/\/js\/v107\.js\?v=(\d+)/, idx) === 156 && num(/\/js\/v120\.js\?v=(\d+)/, idx) === 156 &&
  sw.includes("'/js/v107.js?v=156'") && sw.includes("'/js/v120.js?v=156'"),
  'index v107=' + num(/\/js\/v107\.js\?v=(\d+)/, idx) + ' v120=' + num(/\/js\/v120\.js\?v=(\d+)/, idx));
ok('no stale 155 left in the boot files', !idx.includes('155') && !sw.includes('155') && !/APP_REL\s*=\s*155/.test(app) && !/'rel'\s+=> 155,/.test(api));

/* ══════════════ B · the 24K premium, in the source ══════════════ */
console.log('\n· B · the 24K retail premium = the 22K premium (owner\'s order)');
const g24fn = (api.match(/function gold24_premium\(array \$db\): int \{[\s\S]{0,260}?\n\}/) || [''])[0];
ok('gold24_premium() exists, reads the new knob and FALLS BACK TO the 22K premium (the two karats cannot drift)',
  /\['gold24Premium'\]/.test(g24fn) && /:\s*gold22_premium\(\$db\);/.test(g24fn),
  g24fn || 'gold24_premium() not found');
ok('gold18_premium() keeps the house derivation: 0.75 × the 24K premium (owner picked this)',
  /function gold18_premium\(array \$db\): int \{[\s\S]{0,120}gold24_premium\(\$db\) \* 0\.75/.test(api));
ok('the ONE retail derivation adds them: 24K flat, 22K flat, 18K derived',
  /'gold24' => \(int\)round\(\$g24\) \+ \$gp24,/.test(api) &&
  /'gold22' => \(int\)round\(\$g24 \* PURITY_22\) \+ \$gp22,/.test(api) &&
  /'gold18' => \(int\)round\(\$g24 \* PURITY_18\) \+ \$gp18,/.test(api));
ok("the last-resort path in current_rates() uses the SAME helpers (a quiet feed can't drop the premium)",
  /'gold24' => \(int\)\$l\['gold24'\] \+ gold24_premium\(\$db\)[\s\S]{0,160}'gold18' => \(int\)\$l\['gold18'\] \+ gold18_premium\(\$db\)/.test(api));
ok("the legacy ₹55 jaipurPremium no longer drives ANY retail gold line",
  !/\$gp\s*=\s*\(int\)\(\$db\['settings'\]\['jaipurPremium'\]/.test(api) &&
  (api.match(/jaipurPremium/g) || []).length === 3,          // bootstrap default + whitelist + one comment
  'jaipurPremium reads left: ' + (api.match(/jaipurPremium/g) || []).length);
ok('settings PUT whitelists the new knob so the owner can tune it in admin',
  /'gold24Premium' => \[0, 100000, 'int'\]/.test(api));
ok('/api/rates publishes EVERY line\'s premium (so the storefront can re-base its history)',
  /'premium' =>[\s\S]{0,420}'gold22' => gold22_premium\(\$db\), 'gold24' => gold24_premium\(\$db\), 'gold18' => gold18_premium\(\$db\)/.test(api) &&
  /'pinned' => true/.test(api) && /'pinned' => false/.test(api));

/* ══════════════ C · the brand sweep ══════════════ */
console.log('\n· C · "wherever there is Jaipur mentioned" — the sweep');
/* Jaipur as a real CITY is NOT a rate brand and must survive: it is where a
   customer lives, where the shop picks up, which cities it serves. */
const GEO = [
  "['Sneha Kulkarni', 'Jaipur', 'OTP login",
  "['Sneha Kulkarni', 'Jaipur', '/images/reviews/cust-5.jpg'",
  'at-home pickup available in Jaipur &amp; Nagaur',
  'pickup &amp; drop in Jaipur &amp; Nagaur',
  '<option>Pickup &amp; drop (Jaipur / Nagaur)</option>',
  "'Jodhpur', 'Jaipur', 'Ajmer'",
];
/* Internal identifiers are kept on purpose: the live database already stores
   jaipurPremium / jaipurSilverPremium, a phone on a cached v155 shell still
   reads the `jaipur` payload key, and renaming the .jaipur-hero CSS class
   would pair fresh JS with a year-immutable cached stylesheet — exactly the
   v126 "all elements scattered" failure mode. */
const INTERNAL = [
  /jaipur-hero/, /jaipurPremium/, /jaipurSilverPremium/,
  /jaipur_from_anchor/, /jaipur_live_from_tick/,
  /[.(]jaipur\b/, /'jaipur' =>/, /`jaipur` key/, /jaipur` payload key/,
  /* v156 — three survivors that are NOT customer-facing copy and MUST keep the
     word: (a) a doc comment that quotes the legacy phrase it is fixing,
     (b) the brandify helper itself — a regex can only rewrite the phrase it
     names — and (c) a backticked `jaipur` in a comment, i.e. the wire key. */
  /"the live Jaipur bullion rate"/, /brandRate/, /`jaipur`/,
];
function sweep(label, text) {
  const bad = [];
  const re = /jaipur/gi; let m;
  while ((m = re.exec(text))) {
    const ctx = text.slice(Math.max(0, m.index - 70), m.index + 80).replace(/\s+/g, ' ');
    if (GEO.some(g => ctx.includes(g.slice(0, 26).replace(/\s+/g, ' ')))) continue;
    if (INTERNAL.some(r => r.test(ctx))) continue;
    bad.push(ctx);
  }
  ok(label, bad.length === 0, bad.slice(0, 4).join('\n          '));
  return bad.length;
}
sweep('app.js: every surviving Jaipur is a CITY, an internal key, or the brandify helper that rewrites it', app);
sweep('index.html + both manifests: zero Jaipur anywhere', idx + manW + manJ);
sweep('v107.js + v120.js (both ship in the zip): zero customer-facing Jaipur', v107 + v120);
/* v109.js and bot.js were rebranded in the repo for consistency, but neither is
   loaded by index.html nor precached by sw.js (bot.js has been out of the shell
   since v99; v109.js never went in), so make-v156-zip.py leaves them out — and
   a SMOKE_CMS overlay therefore still carries their v155 bytes. Repo-only. */
if (CMS === path.join(ROOT, 'cms'))
  sweep('v109.js + bot.js (repo-only, dead since v99 — they do not ship): zero customer-facing Jaipur',
    read('js/v109.js') + read('js/bot.js'));
else console.log('  SKIP  v109.js + bot.js — dead files, deliberately not in the zip, so an overlay still holds their v155 bytes');
sweep('admin.js: only the legacy settings KEY names survive', adm);
sweep('api.php: only function names, legacy setting keys, the alias and its doc comments survive', api);
/* The rebrand lives at RENDER time because the live database belongs to the
   server and a deploy zip never touches data/. That only holds if EVERY site
   that prints a product description goes through the filter — one unwrapped
   `esc(p.desc)` and a live-era "Jaipur bullion rate" is back on screen. */
const descSites = app.match(/esc\((?:brandRate\()?[A-Za-z_$][\w$]*\.desc/g) || [];
ok('every customer-facing `.desc` render site is wrapped in brandRate (no live-era description can leak)',
  descSites.length >= 2 && descSites.every(x => x.indexOf('brandRate(') >= 0), JSON.stringify(descSites));
/* The repo MASTER db.json is corrected too (the owner's call: the live database
   belongs to the server, so the zip never ships data/ — but the master must not
   keep teaching the old brand). It has to move in the DESCRIPTIONS ONLY: this
   file is the shape of the live database, and one reordered key or one edited
   setting would be a silent data migration nobody asked for. */
if (CMS === path.join(ROOT, 'cms')) {
  const descs = (DB.products || []).map(p => String(p.desc || ''));
  ok('the master db.json: all 77 descriptions rebranded, and not one rate phrase left saying Jaipur',
    descs.length === 77 &&
    descs.every(d => /Shivaa[\s\-–—]*(?:bullion\s*)?rate/i.test(d)) &&
    !descs.some(d => /Jaipur[\s\-–—]*(?:bullion\s*)?rate/i.test(d)),
    `${descs.length} products, ${descs.filter(d => /Shivaa[\s\-–—]*(bullion\s*)?rate/i.test(d)).length} rebranded`);
  const baseDb = JSON.parse(execSync(`git show ${BASE}:cms/data/db.json`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const strip = o => { const c = JSON.parse(JSON.stringify(o)); (c.products || []).forEach(p => { if ('desc' in p) p.desc = '@'; }); return JSON.stringify(c); };
  const leftovers = (dbJson.match(/jaipur/gi) || []).length;
  ok('...and NOTHING else in it moved: same orders, settings, products, images and key order — the only "jaipur" left is the two internal settings keys',
    strip(baseDb) === strip(DB) && dbJson.length === execSync(`git show ${BASE}:cms/data/db.json`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).length &&
    leftovers === 2 && /"jaipurPremium"/.test(dbJson) && /"jaipurSilverPremium"/.test(dbJson),
    `sameByteLength=${dbJson.length} jaipurOccurrences=${leftovers} (want 2: jaipurPremium, jaipurSilverPremium)`);
} else {
  console.log('  SKIP  the master db.json checks — SMOKE_CMS overlay carries the LIVE-era database on purpose (the zip never ships data/)');
}
ok('the rate card, the ticker and the strip now say SHIVAA',
  app.includes('✦ SHIVAA MARKET RATE') && app.includes("'MCX LIVE' : 'SHIVAA LIVE'") &&
  app.includes('✦ Shivaa Gold 22K / g') && app.includes('GOLD 24K · SHIVAA') &&
  app.includes('LIVE SHIVAA RATE') && idx.includes('Shivaa gold &amp; silver, live'));

/* ══════════════ D · B2B FROZEN ══════════════ */
console.log('\n· D · "don\'t disturb b2b section" — the desk code is byte-identical');
/* The partner desk prices off bullion_anchors() × bullion_defs() with the
   owner's own calibration in bullion.rtgs; it never calls the retail premium
   helpers. Prove that with bytes, not with assurances. */
function b2bBlock(src) {
  const a = src.indexOf('function bullion_anchors(');
  const b = src.indexOf('function bullion_defaults(');
  const c = src.indexOf('function gstin_check(');
  return (a < 0 || b < 0 || c < 0) ? null : src.slice(a, b) + '\n@@@\n' + src.slice(src.indexOf('function bullion_rows('), c);
}
const mineB2B = b2bBlock(api);
let baseApi = null;
try { baseApi = execSync(`git show ${BASE}:cms/api.php`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] }); } catch (e) {}
ok('bullion_anchors + bullion_defs + rtgs_strip + bullion_rows are UNCHANGED (md5 of the extracted block)',
  !!mineB2B && !!baseApi && md5(mineB2B) === md5(b2bBlock(baseApi)),
  baseApi ? ('mine ' + md5(mineB2B || '') + ' vs v155 ' + md5(b2bBlock(baseApi) || '')) : 'v155 baseline unavailable');
ok('no retail premium helper leaked into the B2B block',
  !!mineB2B && !/gold24_premium|gold22_premium|gold18_premium|jaipur_from_anchor/.test(mineB2B));
let baseApp = null;
try { baseApp = execSync(`git show ${BASE}:cms/js/app.js`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] }); } catch (e) {}
/* The owner approved a TEXT-ONLY rebrand inside the partner pages. Prove that
   is all it is: slice each B2B page out of both trees and compare them with the
   brand word normalised away — so any changed number, key, selector, call or
   condition fails the build. */
function pageSrc(src, name) {
  const i = src.indexOf('pages.' + name + ' = async');
  if (i < 0) return '';
  const next = (() => { const re = /\npages\.[a-z0-9]+ = /g; re.lastIndex = i + 10; const m = re.exec(src); return m ? m.index : src.length; })();
  return src.slice(i, next);
}
const noBrand = t => t.replace(/Jaipur/gi, '@').replace(/Shivaa/gi, '@');
for (const pg of ['catalogues', 'b2b', 'metal', 'deadstock']) {
  const a = baseApp ? pageSrc(baseApp, pg) : '', b = pageSrc(app, pg);
  ok(`B2B page pages.${pg} differs from v155 in the BRAND WORD ONLY (${b.length} bytes)`,
    !!a && !!b && noBrand(a) === noBrand(b),
    a ? (noBrand(a) === noBrand(b) ? '' : 'first difference near: ' + (() => { const x = noBrand(a), y = noBrand(b); let i = 0; while (i < Math.min(x.length, y.length) && x[i] === y[i]) i++; return JSON.stringify(y.slice(Math.max(0, i - 60), i + 60)); })()) : 'v155 baseline unavailable');
}

/* ══════════════ E/F/G · the API, EXECUTED ══════════════ */
let PHP, loadNodeRuntime;
try { ({ PHP } = require('@php-wasm/universal')); ({ loadNodeRuntime } = require('@php-wasm/node')); }
catch (e) { console.log('\nSKIP  E/F/G — @php-wasm/node not installed; the static gates above still ran.'); finish(); }

const b64 = s => Buffer.from(s).toString('base64');
async function instance(dir, apiSrc, supportFromDisk) {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: dir === '/base' ? 3 : 2 } }));
  php.mkdirTree(dir + '/data'); php.mkdirTree(dir + '/js');
  php.writeFile(dir + '/api.php', apiSrc);
  for (const f of ['hallmark.php', 'trust.php', 'sms.php', 'mail.php']) {
    php.writeFile(dir + '/' + f, supportFromDisk ? read(f) : execSync(`git show ${BASE}:cms/${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  }
  for (const f of ['sw.js', 'index.html']) php.writeFile(dir + '/' + f, supportFromDisk ? read(f) : execSync(`git show ${BASE}:cms/${f}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  php.writeFile(dir + '/js/app.js', supportFromDisk ? app : execSync(`git show ${BASE}:cms/js/app.js`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const req = async (route, mutate) => {
    /* the db is rewritten before EVERY call: /api/rates can refresh + persist,
       and the two instances must start from identical bytes to be comparable. */
    const d = JSON.parse(dbJson);
    if (mutate) mutate(d);
    php.writeFile(dir + '/data/db.json', JSON.stringify(d));
    const code = `<?php
$GLOBALS['SHV_BODY'] = "";
class ShvIn { public $context; private $d = ''; private $p = 0;
  public function stream_open($u, $m, $o, &$x) { $this->d = base64_decode($GLOBALS['SHV_BODY']); return true; }
  public function stream_read($n) { $r = substr($this->d, $this->p, $n); $this->p += strlen($r); return $r; }
  public function stream_eof() { return $this->p >= strlen($this->d); }
  public function stream_stat() { return ['size' => strlen($this->d)]; }
  public function stream_seek($o2, $w) { if ($w === SEEK_SET) { $this->p = $o2; return true; } return false; }
}
stream_wrapper_unregister('php'); stream_wrapper_register('php', 'ShvIn');
$_SERVER['REQUEST_METHOD'] = 'GET'; $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_HOST'] = 'www.shivaa.in'; $_SERVER['REQUEST_URI'] = '/api/${route}';
$_GET = ['__route' => '${route}']; $_POST = [];
register_shutdown_function(function () { $c = http_response_code(); echo "\\n@@HTTP " . ($c ?: 200); });
try { include '${dir}/api.php'; } catch (Throwable $e) { echo "\\n@@FATAL " . get_class($e) . ': ' . $e->getMessage(); }
`;
    const out = await php.run({ code });
    const text = Buffer.from(out.bytes).toString();
    const hm = text.match(/@@HTTP (\d+)/);
    const fm = text.match(/@@FATAL ([\s\S]*)/);
    const payload = text.replace(/\n?@@HTTP \d+[\s\S]*$/, '').replace(/\n?@@FATAL[\s\S]*$/, '');
    let json = null; try { json = JSON.parse(payload); } catch (e) {}
    return { http: hm ? +hm[1] : 200, fatal: fm ? fm[1].trim() : '', json, raw: payload };
  };
  return { php, req };
}

async function finish() {
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v156 checks passed  ${pass === results.length ? "✦ — SHIVAA'S OWN RATES, 24K PREMIUM IN, B2B FROZEN" : '✗ FAILED'}`);
  process.exit(pass === results.length ? 0 : 1);
}

(async () => {
  /* a market the test controls: MCX future OFF, a persisted stamp + two history
     stamps so the retail ladder, the raw history and the deltas are all real. */
  /* ONE clock for the whole suite: the seed is written before every call, and
     both instances must receive byte-identical db.json — otherwise anchorLevel.at
     (which comes straight off rates.last.t) drifts a second between the two runs
     and the B2B comparison measures the test harness, not the release. */
  const NOW = Math.floor(Date.now() / 1000);
  const seed = d => {
    /* ISO-8601 WITH its offset, the shape now_iso() writes. A naive
       'YYYY-MM-DD HH:MM:SS' UTC string is read by PHP as IST, the stamp looks
       5½ hours old, rates_stale() fires and the seeded market is replaced by a
       simulated one clamped to BASE_GOLD × 1.04 — the checks below would then
       all still pass (they are relative to the payload) while testing a market
       nobody chose. Section E now asserts the anchor it seeded survived. */
    const iso = off => new Date((NOW - off + 19800) * 1000).toISOString().slice(0, 19) + '+05:30';
    d.rates = d.rates || {};
    d.rates.mcx = null;
    d.rates.override = null;
    d.rates.last = { t: iso(300), gold24: 15600, gold22: 14301, gold18: 11700, silver: 236, source: 'live' };
    d.rates.history = [
      { t: iso(1500), gold24: 15520, gold22: 14227, gold18: 11640, silver: 234, source: 'live' },
      { t: iso(900), gold24: 15560, gold22: 14264, gold18: 11670, silver: 235, source: 'live' },
      { t: iso(300), gold24: 15600, gold22: 14301, gold18: 11700, silver: 236, source: 'live' },
    ];
    d.settings = Object.assign({}, d.settings, { guestCheckout: false });
  };

  console.log('\n· E · /api/rates EXECUTED — the retail ladder');
  const NEW = await instance('/new', api, true);
  const r1 = await NEW.req('rates', seed);
  const J = (r1.json || {});
  const A = J.anchorLevel || {};
  ok('no fatal, HTTP 200', r1.http === 200 && !r1.fatal, `http=${r1.http} fatal=${r1.fatal} raw=${(r1.raw || '').slice(0, 200)}`);
  ok('the seeded market HELD (anchorLevel is the stamp this suite wrote — no simulated refresh)',
    A.goldPerG === 15600 && J.source === 'live' && Array.isArray(J.history) && J.history.length === 3,
    `anchor=${A.goldPerG} source=${J.source} history=${(J.history || []).length}`);
  const P = J.premium || {};
  ok('premium.gold24 === premium.gold22 (the owner\'s order, published for the card)',
    P.gold24 === P.gold22 && P.gold24 === 398, JSON.stringify(P));
  ok('premium.gold18 === 0.75 × the 24K premium = 299 (the derivation the owner picked)',
    P.gold18 === Math.round(398 * 0.75) && P.gold18 === 299, String(P.gold18));
  ok('shivaa.gold24 = anchor + 398 (was anchor + 55)',
    J.shivaa && J.shivaa.gold24 === Math.round(A.goldPerG) + 398, `${J.shivaa && J.shivaa.gold24} vs ${Math.round(A.goldPerG)}+398`);
  ok('shivaa.gold22 = round(anchor × 0.9167) + 398 — unchanged by this release',
    J.shivaa && J.shivaa.gold22 === Math.round(A.goldPerG * 0.9167) + 398, String(J.shivaa && J.shivaa.gold22));
  ok('shivaa.gold18 = round(anchor × 0.75) + 299',
    J.shivaa && J.shivaa.gold18 === Math.round(A.goldPerG * 0.75) + 299, String(J.shivaa && J.shivaa.gold18));
  ok('shivaa.silver = anchor + 3 (silver untouched)',
    J.shivaa && Math.abs(J.shivaa.silver - (A.silverPerG + 3)) < 0.05, String(J.shivaa && J.shivaa.silver));
  ok('the `jaipur` key is still published and is IDENTICAL (a cached v155 shell keeps pricing)',
    J.jaipur && J.shivaa && JSON.stringify(J.jaipur) === JSON.stringify(J.shivaa));
  ok('the published `history` stays RAW (no premium) — the B2B day bands read those stamps',
    Array.isArray(J.history) && J.history.length >= 2 &&
    J.history.every(h => Math.abs(h.gold22 - Math.round(h.gold24 * 0.9167)) <= 1),
    JSON.stringify((J.history || []).slice(-1)));
  ok('the top-level gold22 is still the raw stamp and `spot` is untouched',
    J.gold22 === J.spot.gold22 && J.gold22 + 398 === J.shivaa.gold22, `${J.gold22} / ${J.spot && J.spot.gold22} / ${J.shivaa && J.shivaa.gold22}`);

  console.log('\n· F · the SAME call on the v155 baseline — B2B and every price must not move');
  if (!baseApi) { ok('v155 baseline available for the comparison', false, 'git show ' + BASE + ' failed'); }
  else {
    const OLD = await instance('/base', baseApi, false);
    const b1 = await OLD.req('rates', seed);
    const b2 = await NEW.req('rates', seed);
    ok('the B2B RTGS board is IDENTICAL to v155, row for row (buy/sell/mid/change/unit)',
      JSON.stringify(((b1.json || {}).rtgs || {}).rows || {}) === JSON.stringify(((b2.json || {}).rtgs || {}).rows || {}),
      'v155 ' + JSON.stringify(((b1.json || {}).rtgs || {}).rows || {}).slice(0, 160) + '\n          v156 ' + JSON.stringify(((b2.json || {}).rtgs || {}).rows || {}).slice(0, 160));
    ok('the B2B anchor block is IDENTICAL to v155',
      JSON.stringify((b1.json || {}).anchorLevel || {}) === JSON.stringify((b2.json || {}).anchorLevel || {}));
    /* Not just the two blocks the B2B desk reads — the WHOLE payload. A deep
       diff of v155 vs v156 must produce exactly the retail lines this release
       was ordered to change, and nothing else: if a future edit moves a band, a
       countdown, a history stamp or an RTGS row, this check names the path. */
    const VOLATILE = k => /^(t|nextUpdateIn)$/.test(k) || /ageMs$/.test(k);  /* wall-clock, second-granular */
    const diffs = [];
    (function walk(x, y, p) {
      const keys = new Set([...Object.keys(x || {}), ...Object.keys(y || {})]);
      for (const k of keys) {
        if (VOLATILE(k)) continue;
        const np = p ? p + '.' + k : k;
        const vx = x ? x[k] : undefined, vy = y ? y[k] : undefined;
        if (JSON.stringify(vx) === JSON.stringify(vy)) continue;
        if (vx && vy && typeof vx === 'object' && typeof vy === 'object' && !Array.isArray(vx) && !Array.isArray(vy)) walk(vx, vy, np);
        else diffs.push(np);
      }
    })((b1.json || {}), (b2.json || {}), '');
    const EXPECT = ['jaipur.gold24', 'jaipur.gold18', 'premium.gold', 'premium.gold24', 'premium.gold18', 'premium.pinned', 'shivaa'];
    ok('the ENTIRE /api/rates payload differs from v155 in EXACTLY those 7 retail places (rtgs, anchorLevel, spot, history, override, usd*, marketHours byte-identical)',
      diffs.length === EXPECT.length && EXPECT.every(e => diffs.includes(e)),
      'changed: ' + JSON.stringify(diffs) + '\n          expected: ' + JSON.stringify(EXPECT));
    const pOld = await OLD.req('products', seed), pNew = await NEW.req('products', seed);
    const priceMap = r => Object.fromEntries((((r.json || {}).products) || []).map(p => [p.id, JSON.stringify(p.price || p.pricing || p.total || null)]));
    const a = priceMap(pOld), b = priceMap(pNew);
    ok('all 77 product prices are IDENTICAL to v155 (every piece is 22K — the 24K premium cannot touch a price)',
      Object.keys(a).length === 77 && JSON.stringify(a) === JSON.stringify(b),
      `${Object.keys(a).length} vs ${Object.keys(b).length} products; differing: ${Object.keys(a).filter(k => a[k] !== b[k]).slice(0, 5).join(',') || 'none'}`);
    ok('the 22K retail rate itself is IDENTICAL to v155 (only 24K/18K moved)',
      ((b1.json || {}).shivaa || (b1.json || {}).jaipur || {}).gold22 === ((b2.json || {}).shivaa || {}).gold22 &&
      ((b1.json || {}).jaipur || {}).silver === ((b2.json || {}).shivaa || {}).silver);
  }

  console.log('\n· G · the knob, the pinned counter rate, the version truth');
  const r2 = await NEW.req('rates', d => { seed(d); d.settings.gold24Premium = 500; });
  const A2 = (r2.json || {}).anchorLevel || {}, S2 = (r2.json || {}).shivaa || {}, P2 = (r2.json || {}).premium || {};
  ok('an explicit gold24Premium wins: 24K +500, 18K +375, and 22K STILL +398',
    P2.gold24 === 500 && P2.gold18 === 375 && P2.gold22 === 398 &&
    S2.gold24 === Math.round(A2.goldPerG) + 500 && S2.gold18 === Math.round(A2.goldPerG * 0.75) + 375 &&
    S2.gold22 === Math.round(A2.goldPerG * 0.9167) + 398, JSON.stringify({ P2, S2 }));
  const r3 = await NEW.req('rates', d => { seed(d); d.rates.override = { gold24: 16000, gold22: 14700, gold18: 12000, silver: 250 }; });
  const J3 = r3.json || {}, P3 = J3.premium || {};
  ok('a PINNED admin override is absolute: premium.pinned = true, every premium 0, retail = the pin',
    P3.pinned === true && P3.gold22 === 0 && P3.gold24 === 0 &&
    J3.shivaa.gold24 === 16000 && J3.shivaa.gold22 === 14700 && J3.shivaa.silver === 250 &&
    J3.anchorLevel.mode === 'override', JSON.stringify({ P3, s: J3.shivaa }));
  const r4 = await NEW.req('version');
  const V = r4.json || {};
  ok('/api/version tells the truth: rel 156 and the stamps it reads from its own docroot agree',
    V.rel === 156 && V.stamp && V.stamp.index === 156 && V.stamp.app === 156 && /v156/.test(V.shell || ''),
    JSON.stringify(V));

  await finish();
})();
