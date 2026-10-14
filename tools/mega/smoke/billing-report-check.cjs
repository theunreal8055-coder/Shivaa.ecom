// Every report flagged live in the catalogue must have a matching engine case,
// and no engine may exist for a report flagged pending. Otherwise the UI shows
// a report that 500s, or hides one that works.
const fs = require('fs');
const Parser = require('php-parser');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', '..', 'cms', 'billing', 'reports.php');
const src = fs.readFileSync(SRC, 'utf8');

const engine = new Parser({ parser: { suppressErrors: true } });
const ast = engine.parseCode(src, 'reports.php');

// Walk to the catalogue array literal.
function findArray(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.kind === 'constantstatement') {
    for (const c of node.constants || []) {
      const nm = c.name && typeof c.name === 'object' ? c.name.name : c.name;
      if (String(nm).toUpperCase() === 'BILLING_REPORT_CATALOGUE') {
        return c.value.kind === 'array' ? c.value : null;
      }
    }
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const x of v) { const r = findArray(x); if (r) return r; } }
    else if (v && typeof v === 'object') { const r = findArray(v); if (r) return r; }
  }
  return null;
}
const cat = findArray(ast);
if (!cat) { console.log('FAIL  catalogue constant not found'); process.exit(1); }

function str(v) { return v && v.kind === 'string' ? v.value : String(v.value); }
function boolTrue(v) { return v && (v.kind === 'boolean' ? v.value : v.name === 'true'); }

const live = new Set(), pending = new Set();
let titleCount = 0;
for (const catItem of cat.items) {
  const catArr = catItem.value; // ['title'=>..., 'reports'=>[...]]
  let reports = null;
  for (const kv of catArr.items) if (str(kv.key) === 'reports') reports = kv.value;
  if (!reports) continue;
  for (const rk of reports.items) {
    titleCount++;
    const id = str(rk.key);
    let isLive = false;
    for (const kv of rk.value.items) if (str(kv.key) === 'live') isLive = boolTrue(kv.value);
    (isLive ? live : pending).add(id);
  }
}

// Engine cases: "case 'r1_1':"
const engines = new Set();
for (const m of src.matchAll(/^\s*case '(r\d+_\d+)':/gm)) engines.add(m[1]);

const missingEngine = [...live].filter((id) => !engines.has(id)).sort();
const orphanEngine = [...engines].filter((id) => !live.has(id)).sort();
const badLive = [...live].filter((id) => pending.has(id));

console.log('reports in catalogue :', titleCount);
console.log('flagged available    :', live.size);
console.log('flagged pending      :', pending.size);
console.log('engines written      :', engines.size);
console.log('live without engine  :', missingEngine.length ? missingEngine.join(', ') : 'none');
console.log('engine flagged off   :', orphanEngine.length ? orphanEngine.join(', ') : 'none');

// pending entries must carry a reason
let noReason = [];
for (const catItem of cat.items) {
  let reports = null;
  for (const kv of catItem.value.items) if (str(kv.key) === 'reports') reports = kv.value;
  if (!reports) continue;
  for (const rk of reports.items) {
    let isLive = false, why = null;
    for (const kv of rk.value.items) {
      if (str(kv.key) === 'live') isLive = boolTrue(kv.value);
      if (str(kv.key) === 'why') why = str(kv.value);
    }
    if (!isLive && (!why || !why.length)) noReason.push(str(rk.key));
  }
}
console.log('pending without reason:', noReason.length ? noReason.join(', ') : 'none');

const ok = titleCount === 51 && missingEngine.length === 0 && orphanEngine.length === 0
  && noReason.length === 0 && live.size === engines.size;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
