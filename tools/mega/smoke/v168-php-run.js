/* N40: execute the production upload-signature block in PHP 8.3. No upload,
   gateway call, or DB write. Use SMOKE_CMS for a before/after control. */
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { PHP } = require('@php-wasm/universal');
const { loadNodeRuntime } = require('@php-wasm/node');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
const start = api.indexOf('    $headOk =', api.indexOf("$route === 'media'"));
const end = api.indexOf('    if (!$headOk)', start);
assert(start > 0 && end > start);
const block = api.slice(start, end);
const cases = [
  ['webm','1a45dfa30000000000000000',true],
  ['mp4','000000186674797069736f6d',true],
  ['mov','000000146674797071742020',true],
  ['jpg','ffd8ff000000000000000000',true],
  ['jpeg','ffd8ff000000000000000000',true],
  ['png','89504e470d0a1a0a00000000',true],
  ['webp','524946460000000057454250',true],
  ['png','ffd8ff000000000000000000',false],
  ['webm','000000186674797069736f6d',false],
  ['mp4','1a45dfa30000000000000000',false],
  ['jpg','3c7363726970743e00000000',false],
  ['png','',false],
];
(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 168 } }));
  let passed = 0;
  for (const [ext, hex, expected] of cases) {
    const out = await php.run({ code: `<?php $ext='${ext}'; $head=hex2bin('${hex}'); $isImg=in_array($ext,['jpg','jpeg','png','webp']); ${block} echo json_encode($headOk);` });
    const actual = JSON.parse(new TextDecoder().decode(out.bytes));
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${ext} ${hex || '(empty)'} → ${actual}`); if (ok) passed++;
  }
  console.log(`N40 PHP upload signatures: ${passed}/${cases.length}`);
  process.exit(passed === cases.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
