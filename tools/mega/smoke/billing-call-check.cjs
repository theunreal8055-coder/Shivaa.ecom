// Every billing_* function called in the billing app must be defined in
// lib.php or reports.php. A missing one is a fatal error at request time that
// no syntax check will catch — billing_csv() shipped in v3 exactly like that.
const fs = require('fs');
const path = require('path');

const B = path.join(__dirname, '..', '..', '..', 'cms', 'billing');
const files = ['lib.php', 'reports.php', 'api.php', 'install.php', 'inbox.php', 'index.php'];
const src = {};
files.forEach((f) => { src[f] = fs.readFileSync(path.join(B, f), 'utf8'); });

// Definitions, across every file — both real functions and closures held in a
// variable ($billing_order_fields = function (...) {...}), which are called the
// same way.
const defined = new Set();
for (const f of files) {
  for (const m of src[f].matchAll(/function\s+(billing_[A-Za-z0-9_]+)\s*\(/g)) defined.add(m[1]);
  for (const m of src[f].matchAll(/\$(billing_[A-Za-z0-9_]+)\s*=\s*function\s*\(/g)) defined.add(m[1]);
}

// Calls: billing_x( not preceded by "function ".
const called = new Map();
for (const f of files) {
  for (const m of src[f].matchAll(/(?:^|[^A-Za-z0-9_>])(billing_[A-Za-z0-9_]+)\s*\(/g)) {
    const name = m[1];
    const before = src[f].slice(Math.max(0, m.index - 12), m.index + m[0].indexOf(name));
    if (/function\s+$/.test(before)) continue;
    if (!called.has(name)) called.set(name, new Set());
    called.get(name).add(f);
  }
}

const missing = [...called.keys()].filter((n) => !defined.has(n)).sort();
console.log('billing_* defined :', defined.size);
console.log('billing_* called  :', called.size);
missing.forEach((n) => console.log('  UNDEFINED  ' + n + '  called from ' + [...called.get(n)].join(', ')));

// Route shadowing: a regex route declared earlier that also matches a literal
// route declared later makes the later one unreachable dead code.
const api = src['api.php'];
const routes = [];
for (const m of api.matchAll(/preg_match\('#\^(.+?)\$#', \$route, \$m\) && \$method === '(\w+)'/g)) {
  routes.push({ kind: 're', pattern: m[1], method: m[2], at: m.index });
}
for (const m of api.matchAll(/\$route === '([a-z0-9\/\-]+)' && \$method === '(\w+)'/g)) {
  routes.push({ kind: 'lit', route: m[1], method: m[2], at: m.index });
}
routes.sort((a, b) => a.at - b.at);
const shadowed = [];
for (const r of routes) {
  if (r.kind !== 'lit') continue;
  for (const q of routes) {
    if (q.kind !== 're' || q.method !== r.method || q.at >= r.at) continue;
    if (new RegExp('^' + q.pattern + '$').test(r.route)) shadowed.push(r.route + ' <- /' + q.pattern + '/');
  }
}
console.log('routes parsed     :', routes.length);
console.log('shadowed routes   :', shadowed.length ? shadowed.join('; ') : 'none');

const ok = missing.length === 0 && shadowed.length === 0;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
