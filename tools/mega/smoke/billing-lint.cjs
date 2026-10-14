const fs = require('fs');
const Engine = require('php-parser');
const parser = new Engine({ ast: { withPositions: true } });
const files = [
  '/home/user/Shivaa.ecom/cms/billing/lib.php',
  '/home/user/Shivaa.ecom/cms/billing/api.php',
];
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  try { parser.parseCode(src, f); console.log('PASS parses  ', f.split('/').pop(), '(' + src.split('\n').length + ' lines)'); }
  catch (e) { bad++; console.log('FAIL parses  ', f.split('/').pop(), '->', e.message); }
}
process.exit(bad ? 1 : 0);
