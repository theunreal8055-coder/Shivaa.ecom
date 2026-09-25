const fs = require('fs');
const { PHP } = require('@php-wasm/universal');
const { loadNodeRuntime } = require('@php-wasm/node');
const B = '/home/user/Shivaa.ecom/cms/billing/';
const F = '/home/user/Shivaa.ecom/tools/mega/smoke/fixtures/';

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 202 } }));
  php.mkdirTree('/b');
  php.writeFile('/b/lib.php', fs.readFileSync(B + 'lib.php', 'utf8'));
  php.writeFile('/b/schema.sql', fs.readFileSync(B + 'schema.sql', 'utf8'));
  const out = await php.run({ code: fs.readFileSync(F + 'billing-schema-check.php', 'utf8') });
  process.stdout.write(Buffer.from(out.bytes).toString());
  if (out.errors) console.log('ERRORS:', String(out.errors).slice(0, 600));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
