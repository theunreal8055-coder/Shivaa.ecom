/* Runs any PHP fixture under php-wasm against cms/billing/lib.php.
   Usage: node php-run.cjs <fixture.php> */
const fs = require('fs');
const { PHP } = require('@php-wasm/universal');
const { loadNodeRuntime } = require('@php-wasm/node');
const B = '/home/user/Shivaa.ecom/cms/billing/';
const fixture = process.argv[2];
if (!fixture) { console.error('usage: node php-run.cjs <fixture.php>'); process.exit(2); }

(async () => {
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 203 } }));
  php.mkdirTree('/b');
  php.writeFile('/b/lib.php', fs.readFileSync(B + 'lib.php', 'utf8'));
  php.writeFile('/b/schema.sql', fs.readFileSync(B + 'schema.sql', 'utf8'));
  php.writeFile('/b/reports.php', fs.readFileSync(B + 'reports.php', 'utf8'));
  const out = await php.run({ code: fs.readFileSync(fixture, 'utf8') });
  process.stdout.write(Buffer.from(out.bytes).toString());
  if (out.errors) console.log('ERRORS:', String(out.errors).slice(0, 800));
  process.exit(out.exitCode || 0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
