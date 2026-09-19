/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v156 PHP RUN — the 24K premium EXECUTED against the real
   interpreter (php-wasm 8.3), not grepped:
     1  /api/rates: jaipur.gold24 = anchor + 398 (the SAME figure as 22K),
        gold22 / gold18 / silver byte-identical to the v119/v155 math.
     2  premium.gold24 = 398 is published beside premium.gold22 = 398, and
        premium.gold stays the legacy 55 (back-compat for older payloads).
     3  the knob turns: gold24Premium = 500 moves ONLY the 24K line
        (anchor + 500); 22K/18K/silver do not twitch.
     4  B2B UNTOUCHED: the rtgs block of the SAME response is byte-identical
        between runs 1 and 3 — the desk never met the retail premium.
     5  /api/products publishes rates.gold24 = anchor + 398 (the premium
        reaches storefront pricing), and /api/version tells rel 156 with
        self-consistent stamps.
   Run: node tools/mega/smoke/v156-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v156-php-run.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

let PHP, loadNodeRuntime;
try {
  ({ PHP } = require('@php-wasm/universal'));
  ({ loadNodeRuntime } = require('@php-wasm/node'));
} catch (e) {
  console.log('SKIP  @php-wasm/node not installed — static v156-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const ANCHOR_G = 15084, ANCHOR_S = 233.2;
const EXP = {
  gold24: ANCHOR_G + 398,                                   // 15482 — v156
  gold22: Math.round(ANCHOR_G * 0.9167) + 398,              // 14226 — v119 math untouched
  gold18: Math.round(ANCHOR_G * 0.75) + Math.round(55 * 0.75), // 11354 — legacy ×0.75 line
  silver: +(ANCHOR_S + 3).toFixed(1),                       // 236.2
};

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 2 } }));
  const t0 = new Date();
  const mkDb = (mut = {}) => {
    const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
    db.settings = Object.assign({}, db.settings, mut);
    delete db.settings.gold24Premium;      // prove the DEFAULT first; the knob run re-adds it
    Object.assign(db.settings, mut);
    db.rates = db.rates || {};
    /* a fresh, deterministic SPOT stamp: rates_stale() is false, no refresh
       fires, the tick file is absent, mcx stays off → the anchor IS rates.last */
    const stamp = (mins) => ({
      t: new Date(t0.getTime() - mins * 60000).toISOString(),
      gold24: ANCHOR_G, gold22: Math.round(ANCHOR_G * 0.9167), gold18: Math.round(ANCHOR_G * 0.75),
      silver: ANCHOR_S, usdGold: 2600, usdSilver: 31.1, usdInr: 88.4,
      usdGoldHigh: 2605, usdGoldLow: 2595, usdGoldPct: 0.1,
      usdSilverHigh: 31.2, usdSilverLow: 31.0, usdSilverPct: 0.1,
      usdInrHigh: 88.5, usdInrLow: 88.3, usdInrPct: 0.05,
      spotSrc: { gold: 'qa', silver: 'qa', fx: 'qa' }, spotKind: 'live', source: 'spot',
    });
    db.rates.last = stamp(2);
    db.rates.history = [stamp(62), stamp(2)];
    delete db.rates.override; delete db.rates.mcx;
    return db;
  };
  php.mkdirTree('/tcrun/data');
  for (const f of ['api.php', 'hallmark.php', 'trust.php', 'sms.php', 'mail.php']) {
    php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  }
  php.mkdirTree('/tcrun/js');
  php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb()));
  for (const f of ['sw.js', 'index.html']) php.writeFile('/tcrun/' + f, fs.readFileSync(path.join(CMS, f), 'utf8'));
  php.writeFile('/tcrun/js/app.js', fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8'));

  const b64 = s => Buffer.from(s).toString('base64');
  async function req(method, route, body, q) {
    q = q || {};
    const code = `<?php
$GLOBALS['SHV_BODY'] = "${b64(body ? JSON.stringify(body) : '')}";
class ShvIn { public $context; private $d; private $p = 0;
  public function stream_open($u, $m, $o, &$x) { $this->d = base64_decode($GLOBALS['SHV_BODY']); return true; }
  public function stream_read($n) { $r = substr($this->d, $this->p, $n); $this->p += strlen($r); return $r; }
  public function stream_eof() { return $this->p >= strlen($this->d); }
  public function stream_stat() { return ['size' => strlen($this->d)]; }
  public function stream_seek($o2, $w) { if ($w === SEEK_SET) { $this->p = $o2; return true; } return false; }
}
stream_wrapper_unregister('php');
stream_wrapper_register('php', 'ShvIn');
$_SERVER['REQUEST_METHOD'] = '${method}';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_HOST'] = 'www.shivaa.in';
$_SERVER['REQUEST_URI'] = '/api/${route}';
$_GET = array_merge(['__route' => '${route}'], (array) json_decode(base64_decode("${b64(JSON.stringify(q || {}))}"), true));
$_POST = [];
register_shutdown_function(function () {
  $c = http_response_code(); if (!$c) { $c = (int)($_SERVER['http_response_code'] ?? 200); }
  echo "\\n@@HTTP " . $c;
});
try { include '/tcrun/api.php'; } catch (Throwable $e) { echo "\\n@@FATAL " . get_class($e) . ': ' . $e->getMessage(); }
`;
    const out = await php.run({ code });
    const text = Buffer.from(out.bytes).toString();
    let http = 200, fatal = '', payload = text;
    const hm = text.match(/@@HTTP (\d+)/);
    if (hm) { http = parseInt(hm[1], 10); payload = text.replace(/\n?@@HTTP \d+[\s\S]*$/, ''); }
    const fm = text.match(/@@FATAL ([\s\S]*)/);
    if (fm) { fatal = fm[1].trim(); payload = text.replace(/\n?@@FATAL[\s\S]*$/, ''); }
    let json = null; try { json = JSON.parse(payload); } catch (e) {}
    return { http, fatal, json, raw: payload };
  }

  console.log('\n· 1 — /api/rates EXECUTED: the 24K line carries the 22K premium:');
  const r1 = await req('GET', 'rates');
  ok('no fatal, 200, jaipur block present', r1.http === 200 && !r1.fatal && r1.json && r1.json.jaipur,
    `http=${r1.http} fatal=${r1.fatal} raw=${(r1.raw || '').slice(0, 200)}`);
  const j1 = (r1.json || {}).jaipur || {};
  ok(`jaipur.gold24 = ${EXP.gold24} (15,084 anchor + 398 — the SAME ₹398 as 22K)`, j1.gold24 === EXP.gold24, JSON.stringify(j1));
  ok(`jaipur.gold22 = ${EXP.gold22} (v119 math byte-intact)`, j1.gold22 === EXP.gold22, `gold22=${j1.gold22}`);
  ok(`jaipur.gold18 = ${EXP.gold18} (legacy ₹55 now feeds ONLY this line, ×0.75 = ₹41)`, j1.gold18 === EXP.gold18, `gold18=${j1.gold18}`);
  ok(`jaipur.silver = ${EXP.silver} (silver premium untouched)`, j1.silver === EXP.silver, `silver=${j1.silver}`);

  console.log('\n· 2 — the premium block publishes gold24 beside gold22:');
  const p1 = (r1.json || {}).premium || {};
  ok('premium.gold24 = 398 AND premium.gold22 = 398 (both desk premiums visible)',
    p1.gold24 === 398 && p1.gold22 === 398, JSON.stringify(p1));
  ok('premium.gold stays the legacy 55 (older payloads read it for the 24K line no more)',
    p1.gold === 55 && p1.silver === 3, JSON.stringify(p1));

  console.log('\n· 3 — the knob turns: gold24Premium = 500 moves ONLY the 24K line:');
  php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb({ gold24Premium: 500 })));
  const r3 = await req('GET', 'rates');
  const j3 = (r3.json || {}).jaipur || {};
  ok('gold24 = 15584 with the knob at 500 (anchor + 500, exactly)', j3.gold24 === ANCHOR_G + 500, `gold24=${j3.gold24}`);
  ok('gold22 / gold18 / silver did NOT twitch', j3.gold22 === EXP.gold22 && j3.gold18 === EXP.gold18 && j3.silver === EXP.silver,
    JSON.stringify(j3));
  ok('premium.gold24 reports 500 (the rate card stays honest)', ((r3.json || {}).premium || {}).gold24 === 500);

  console.log('\n· 4 — B2B UNTOUCHED: the rtgs block is byte-identical across the two premium worlds:');
  ok('rtgs block identical between premium 398 and premium 500 runs',
    JSON.stringify((r1.json || {}).rtgs || null) === JSON.stringify((r3.json || {}).rtgs || null),
    `a=${JSON.stringify((r1.json || {}).rtgs || {}).rows ? 'rows' : 'empty'} b=${JSON.stringify((r3.json || {}).rtgs || {}).rows ? 'rows' : 'empty'}`);

  console.log('\n· 5 — the premium reaches storefront pricing + version truth:');
  php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb()));
  const r5 = await req('GET', 'products');
  const rt5 = (r5.json || {}).rates || {};
  ok('/api/products rates.gold24 = 15482 (storefront pricing carries the premium)', rt5.gold24 === EXP.gold24,
    `rates=${JSON.stringify(rt5)}`);
  ok('/api/products rates.gold22 = 14226 (22K pricing untouched)', rt5.gold22 === EXP.gold22);
  const v = await req('GET', 'version');
  /* v157 — forward-tolerant era guard (house pattern): v156's semantics became
     the baseline, so a later release must stay SELF-CONSISTENT at its own
     stamp rather than pin 156 forever. Exactness is v157-check's job. */
  ok('/api/version rel ≥ 156 with self-consistent stamps (index = app = shell)',
    v.http === 200 && v.json && v.json.rel >= 156 && v.json.shell === 'shivaa-shell-v' + v.json.rel
    && v.json.stamp && v.json.stamp.index === v.json.rel && v.json.stamp.app === v.json.rel,
    JSON.stringify(v.json));

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v156 PHP-run checks passed  ${pass === results.length ? '✦ — 24K carries the 22K premium, the desk never noticed' : '✗ FAILED'}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('HARNESS FAIL', e); process.exit(1); });
