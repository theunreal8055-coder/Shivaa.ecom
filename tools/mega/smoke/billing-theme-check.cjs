// Every icon name referenced in app.js must exist in the ICONS map, otherwise
// it silently renders the fallback dot. Also checks every class app.js emits
// has a rule in style.css, so a restyle cannot drop styling.
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..', '..', '..', 'cms', 'billing');
const js = fs.readFileSync(path.join(B, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(B, 'style.css'), 'utf8');

// ICONS keys
const mapSrc = js.split('var ICONS = {', 2)[1].split('\n  };', 1)[0];
const defined = new Set([...mapSrc.matchAll(/^\s{4}([a-zA-Z]+):/gm)].map((m) => m[1]));

// icon("name") calls
const used = new Set([...js.matchAll(/icon\("([a-zA-Z]+)"/g)].map((m) => m[1]));
// NAV third column
const navSrc = js.split('var NAV = [', 2)[1].split('];', 1)[0];
for (const m of navSrc.matchAll(/"[a-z]*",\s*"[^"]+",\s*"([a-zA-Z]+)"/g)) used.add(m[1]);

const missingIcons = [...used].filter((n) => !defined.has(n)).sort();
console.log('icons defined :', defined.size);
console.log('icons used    :', used.size);
missingIcons.forEach((n) => console.log('  MISSING ICON  ' + n));

// classes emitted vs classes styled
const emitted = new Set();
for (const m of js.matchAll(/class:\s*"([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => c && emitted.add(c));
const styled = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map((m) => m[1]));
const unstyled = [...emitted].filter((c) => !styled.has(c)).sort();
console.log('classes used  :', emitted.size);
unstyled.forEach((c) => console.log('  UNSTYLED      .' + c));

// the ERP design tokens must be present
const tokens = {
  'Plus Jakarta Sans': /Plus\+Jakarta\+Sans/,
  '#F8FAFC slate-50 bg': /--bg:\s*#F8FAFC/,
  'amber accent': /--amber:\s*#F59E0B/,
  'slate ink': /--ink:\s*#1E293B/,
  'mobile bottom nav': /position:\s*fixed;\s*bottom:\s*0/,
  'print stylesheet': /@media print/,
};
let badTokens = [];
for (const [name, re] of Object.entries(tokens)) {
  if (!re.test(css)) badTokens.push(name);
  console.log((re.test(css) ? '  token OK   ' : '  token MISS ') + name);
}

// no warm-cream leftovers from the v2 theme
const legacy = ['#17150f', '#faf9f5', '#cdc7ba', '#8a7c63'].filter((c) => css.toLowerCase().includes(c));
if (legacy.length) console.log('  LEGACY COLOURS STILL PRESENT:', legacy.join(', '));

const ok = missingIcons.length === 0 && unstyled.length === 0 && badTokens.length === 0 && legacy.length === 0;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
