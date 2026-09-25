const fs = require('fs');
const Engine = require('php-parser');
const parser = new Engine({ ast: { withPositions: true } });
const B = '/home/user/Shivaa.ecom/cms/billing/';
let bad = 0;
for (const f of ['lib.php', 'api.php', 'index.php', 'install.php']) {
  const src = fs.readFileSync(B + f, 'utf8');
  try {
    parser.parseCode(src, f);
    console.log('PASS php  ', f.padEnd(13), src.split('\n').length + ' lines');
  } catch (e) { bad++; console.log('FAIL php  ', f, '->', e.message); }
}
process.exit(bad ? 1 : 0);
