/* php-parser parse check + negative control (a parse check is NOT a run) */
const fs = require('fs');
const Engine = require('php-parser');
const eng = new Engine({ parser: { extractDoc: false }, ast: { withPositions: false } });
function check(label, src) {
  try {
    const ast = eng.parseCode(src, 'x.php');
    const top = (ast.children || []).length;
    console.log(`  OK    ${label} — parsed, ${top} top-level nodes`);
    return true;
  } catch (e) {
    console.log(`  FAIL  ${label} — ${e.message.split('\n')[0]}`);
    return false;
  }
}
const api = fs.readFileSync('/home/user/Shivaa.ecom/cms/api.php', 'utf8');
const a = check('cms/api.php (as edited for v139)', api);
/* negative control: break the file the same way a real slip would, and prove
   the checker actually catches it — otherwise "OK" above proves nothing. */
const broken = api.replace('function cashfree_occ_block(', 'function cashfree_occ_block( {{{ ');
const b = check('negative control (deliberately broken copy)', broken);
console.log(b ? '  !! the checker did NOT catch the broken copy — results above are worthless'
              : '  control behaved: the broken copy is rejected, so the clean parse above means something');
process.exit(a && !b ? 0 : 1);
