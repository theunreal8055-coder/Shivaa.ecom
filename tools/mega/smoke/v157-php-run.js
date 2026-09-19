/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v157 PHP RUN — executed against the real interpreter (php-wasm
   8.3), not grepped:
     1  THE DISPLAY-BOUNDARY SWEEP: a catalogue row that still says "the live
        Jaipur bullion rate" is served to the STOREFRONT as Shivaa — while the
        stored row itself is never rewritten (the live database is not part of
        a code release, and staff/partner views read the raw records).
     2  /api/products carries the normalised copy on the public projection.
     3  the 24K B2C premium is still executed: jaipur.gold24 = anchor + 398,
        the same ₹398 as 22K (v156's semantics, guarded against regression).
     4  B2B UNTOUCHED: the rtgs block stays byte-identical across premium
        worlds — the bullion desk never met the retail premium.
     5  /api/version tells rel 157 with self-consistent stamps, and the raw
        db.json on disk still holds the legacy phrase it always held.
   Run: node tools/mega/smoke/v157-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v157-php-run.js   (zip overlay)
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
  console.log('SKIP  @php-wasm/node not installed — static v157-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const ANCHOR_G = 15084, ANCHOR_S = 233.2;
const LEGACY = 'Gold price follows the live Jaipur bullion rate of the day.';
const EXPECT_COPY = 'Gold price follows the live Shivaa rate of the day.';

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 1 } }));
  const t0 = new Date();
  const mkDb = (mut = {}) => {
    const db = JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8'));
    db.settings = Object.assign({}, db.settings, mut);
    delete db.settings.gold24Premium;
    Object.assign(db.settings, mut);
    db.rates = db.rates || {};
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
    /* plant the LEGACY phrase on a live row — exactly what the owner's
       catalogue still carries — so the boundary has something to normalise */
    if (db.products[0]) db.products[0].desc = LEGACY;
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

  console.log('\n· 1 — THE DISPLAY BOUNDARY: a legacy row is served as Shivaa, stored text untouched:');
  {
    /* in-process proof on the exact public projection function */
    const code = `<?php
define('SHV_RUN', 1);
require '/tcrun/hallmark.php';
$stored = [
  'id' => 'p_qa', 'name' => 'QA Ring',
  'desc' => ${JSON.stringify(LEGACY)},
  'mediaNote' => 'Shot for the ${JSON.stringify('live Jaipur bullion rate')} card.',
  'pickupNote' => 'Pickup & drop in Jaipur & Nagaur — real geography, never renamed.',
];
$served = hallmark_product($stored);
echo json_encode([
  'stored_desc' => $stored['desc'],
  'served_desc' => $served['desc'],
  'stored_media' => $stored['mediaNote'],
  'served_media' => $served['mediaNote'],
  'served_pickup' => $served['pickupNote'],
]);`;
    const out = await php.run({ code });
    let j = null; try { j = JSON.parse(Buffer.from(out.bytes).toString().trim()); } catch (e) {}
    ok('shv_storefront_copy() rewrites the legacy phrase on the way OUT',
      !!j && j.served_desc === EXPECT_COPY, JSON.stringify(j && j.served_desc));
    ok('the stored row is NEVER rewritten by the projection (PHP array untouched)',
      !!j && j.stored_desc === LEGACY, JSON.stringify(j && j.stored_desc));
    ok('the same normaliser covers the other public copy fields (mediaNote)',
      !!j && /live Shivaa rate/.test(j.served_media || '') && !/Jaipur bullion rate/.test(j.served_media || ''),
      JSON.stringify(j && j.served_media));
    ok('…and it NEVER touches real geography (pickup city lines keep their name)',
      !!j && j.served_pickup === 'Pickup & drop in Jaipur & Nagaur — real geography, never renamed.',
      JSON.stringify(j && j.served_pickup));
  }

  console.log('\n· 2 — /api/products: the STOREFRONT response carries the Shivaa copy:');
  {
    php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb()));
    const r = await req('GET', 'products');
    const list = (r.json || {}).products || [];
    const p0 = list.find(x => x.id === ((JSON.parse(fs.readFileSync(path.join(CMS, 'data/db.json'), 'utf8')).products[0] || {}).id));
    ok('products list served (200, no fatal)', r.http === 200 && !r.fatal && list.length > 0, `http=${r.http} fatal=${r.fatal}`);
    ok('the planted legacy row is served WITHOUT the old rate brand',
      !!p0 && /Shivaa/.test(p0.desc || '') && !/Jaipur/.test(p0.desc || ''), p0 && p0.desc);
    ok('every served product description is Jaipur-free (the whole catalogue)',
      list.every(x => !/Jaipur/i.test(String(x.desc || ''))));
    /* the raw store on disk still holds what it held — the release ships no data */
    let disk = ''; try { disk = php.readFileAsText('/tcrun/data/db.json'); } catch (e) {}
    ok('the raw db.json on disk still contains the legacy phrase (data files are never shipped)',
      disk.includes('Jaipur bullion rate'), disk.slice(0, 0) || 'raw row untouched');
  }

  console.log('\n· 3 — the 24K B2C premium is still executed (v156 carried forward):');
  {
    php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb()));
    const r = await req('GET', 'rates');
    const j = (r.json || {}).jaipur || {};
    ok(`jaipur.gold24 = ${ANCHOR_G + 398} = anchor + ₹398 (the same premium as 22K)`, j.gold24 === ANCHOR_G + 398, JSON.stringify(j));
    ok('22K / 18K / silver math untouched', j.gold22 === Math.round(ANCHOR_G * 0.9167) + 398
      && j.gold18 === Math.round(ANCHOR_G * 0.75) + Math.round(55 * 0.75) && j.silver === +(ANCHOR_S + 3).toFixed(1), JSON.stringify(j));
    ok('premium.gold24 = 398 published beside premium.gold22 = 398',
      ((r.json || {}).premium || {}).gold24 === 398 && ((r.json || {}).premium || {}).gold22 === 398);
  }

  console.log('\n· 4 — B2B UNTOUCHED: the rtgs block is byte-identical when the premium moves:');
  {
    php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb()));
    const a = await req('GET', 'rates');
    php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb({ gold24Premium: 500 })));
    const b2 = await req('GET', 'rates');
    const rt = x => JSON.stringify(((x.json || {}).rtgs) || null);
    ok('rtgs block identical across premium 398 and premium 500',
      rt(a) === rt(b2) && ((a.json || {}).rtgs) !== undefined && rt(a).length > 50);
    ok('the knob moves ONLY the 24K line', ((b2.json || {}).jaipur || {}).gold24 === ANCHOR_G + 500
      && ((b2.json || {}).jaipur || {}).gold22 === Math.round(ANCHOR_G * 0.9167) + 398);
  }

  console.log('\n· 5 — version truth: rel 157 with self-consistent stamps:');
  {
    php.writeFile('/tcrun/data/db.json', JSON.stringify(mkDb()));
    const v = await req('GET', 'version');
    ok('/api/version rel 157 · shell shivaa-shell-v157 · index/app stamps 157',
      v.http === 200 && v.json && v.json.rel === 157 && v.json.shell === 'shivaa-shell-v157'
      && v.json.stamp && v.json.stamp.index === 157 && v.json.stamp.app === 157,
      JSON.stringify(v.json));
  }

  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} v157 PHP-run checks passed  ${pass === results.length ? '✦ — the copy boundary holds · 24K premium holds · the desk never noticed' : '✗ FAILED'}`);
  process.exit(pass === results.length ? 0 : 1);
})();
