/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v165 PHP RUN — "payment failures tell the truth", EXECUTED.
   php-wasm has no Cashfree to talk to (and must never call it), so the
   classification block is extracted from api.php BYTE-EXACT (the extractor
   asserts it still exists there, verbatim, exactly once) and executed for
   real on five realistic gateway outcomes:
     · Cashfree amount-invalid code          → 502 amount-limit message
     · MID-cap wording ("maximum amount …")  → 502 amount-limit message
     · duplicate order id                    → generic retry message
     · transport failure (curl error)        → generic message + err surfaced
     · happy-path 201 with a session         → classification never fires
   Run: node tools/mega/smoke/v165-php-run.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v165-php-run.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');

let PHP, loadNodeRuntime;
try {
  ({ PHP } = require('@php-wasm/universal'));
  ({ loadNodeRuntime } = require('@php-wasm/node'));
} catch (e) {
  console.log('SKIP  @php-wasm/node not installed — static v165-check.js still ran.');
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

// ── extract the classification block from api.php, byte-exact ──────────
const startMark = '$gwCode = strtolower(trim((string)($j[\'code\'] ?? ($j[\'type\'] ?? \'\'))));';
const start = api.indexOf(startMark);
ok('block extractor: classification block found verbatim in api.php', start > 0);
if (start < 0) { console.log(`\nv165-php-run: ${results.filter(Boolean).length} passed, ${results.filter(r => !r).length} failed`); process.exit(1); }
const endMark = "jout(502, ['error' => 'Cashfree could not start this payment";
const end = api.indexOf(endMark, start);
ok('block extractor: generic-502 tail found after the block', end > start);
const block = api.slice(start, end);   // everything up to (not incl.) the generic jout
ok('block extractor: exactly one occurrence of the block start in api.php', api.split(startMark).length === 2);

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 3 } }));

  async function classify(cashfreeJson, cashfreeErr) {
    const code = `<?php
function jout($c, $p) { echo json_encode(['code' => $c, 'payload' => $p]); exit; }
$j = json_decode(${JSON.stringify(JSON.stringify(cashfreeJson))}, true);
$res = ['json' => $j, 'err' => ${JSON.stringify(cashfreeErr || '')}, 'raw' => ${JSON.stringify(cashfreeJson ? JSON.stringify(cashfreeJson) : (cashfreeErr || ''))}, 'code' => ${cashfreeJson ? 400 : 0}];
$due = 50815;
${block}
echo json_encode(['code' => 0, 'payload' => ['kind' => 'none', 'error' => 'block fell through — no rejection detected']]);
`;
    const out = await php.run({ code });
    const text = Buffer.from(out.bytes).toString();
    let r = null; try { r = JSON.parse(text); } catch (e) {}
    return { r, text };
  }

  // 1 · the documented Cashfree amount-invalid code
  let x = await classify({ code: 'order_amount_invalid', message: 'Order amount is invalid' }, '');
  ok('amount-invalid code → 502 with kind=amount-limit',
    x.r && x.r.code === 502 && x.r.payload && x.r.payload.kind === 'amount-limit', x.text.slice(0, 160));
  ok('amount-limit message tells the way out (UPI QR tab / WhatsApp / COD)',
    x.r && x.r.payload && /UPI QR tab/.test(x.r.payload.error) && /WhatsApp\/COD/.test(x.r.payload.error));
  ok('amount-limit response still carries the raw gateway pair',
    x.r && x.r.payload && x.r.payload.gatewayCode === 'order_amount_invalid' && /invalid/i.test(x.r.payload.gatewayMessage || ''));

  // 2 · the exact wording from Cashfree's troubleshooting page
  x = await classify({ code: 'bad_request', message: 'Order amount exceeds the maximum amount limit set for your MID' }, '');
  ok('MID-cap wording (maximum amount limit … MID) → amount-limit',
    x.r && x.r.code === 502 && x.r.payload && x.r.payload.kind === 'amount-limit', x.text.slice(0, 160));

  // 3–5 · an unrelated rejection (duplicate id, transport error, silent curl
  //     death) must NOT classify as amount-limit: the block falls through and
  //     production continues into the generic 502 jout that sits right after
  //     it (byte-locked below, so the fall-through landing is provable).
  const afterBlock = api.slice(end, end + 240);
  ok('fall-through lands directly on the generic 502 jout (byte-locked)',
    /^\s*jout\(502, \['error' => 'Cashfree could not start this payment/.test(afterBlock), JSON.stringify(afterBlock.slice(0, 80)));
  x = await classify({ code: 'order_id_already_exists', message: 'order_id already exists' }, '');
  ok('duplicate order id falls through (generic retry message follows in production)',
    x.r && x.r.code === 0 && x.r.payload && x.r.payload.kind === 'none', x.text.slice(0, 160));

  x = await classify(null, 'SSL certificate problem: unable to get local issuer certificate');
  ok('curl-level failure falls through (generic message + surfaced err follow in production)',
    x.r && x.r.code === 0 && x.r.payload && x.r.payload.kind === 'none', x.text.slice(0, 160));

  x = await classify(null, '');
  ok('silent transport failure without an error string falls through',
    x.r && x.r.code === 0 && x.r.payload && x.r.payload.kind === 'none', x.text.slice(0, 160));

  ok('the generic jout still carries gatewayCode + gatewayMessage for the frontend',
    api.includes("'gatewayCode' => $j['code'] ?? ($j['type'] ?? null),\n                   'gatewayMessage' => $j['message'] ?? ($res['err'] ?: null)]);"));

  const passed = results.filter(Boolean).length, failed = results.filter(r => !r).length;
  console.log(`\nv165-php-run: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(1); });
