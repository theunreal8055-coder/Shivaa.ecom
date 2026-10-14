// Two invariants on prepared statements, both of which are invisible to a PHP
// syntax check and both of which break at request time:
//   1. an INSERT's column list and its VALUES list are the same length
//      (values may be literals — VALUES (1,?,NOW()) is 3 values, 1 placeholder)
//   2. the number of ? in a prepared statement equals the number of elements
//      in the array passed to the execute() that follows it
// The v4 supplier INSERT broke invariant 1: 15 columns, 14 placeholders.
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..', '..', '..', 'cms', 'billing');
const files = ['lib.php', 'api.php', 'reports.php', 'install.php'];

// Split on commas that are not inside parentheses or quotes. A trailing comma
// (PHP allows one) must not add a phantom element.
function topCommas(raw) {
  const s = raw.replace(/,\s*$/, '').trim();
  let depth = 0, inS = false, inD = false, n = 1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (inS || inD) continue;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) n++;
  }
  return s.trim() === '' ? 0 : n;
}

let checked = 0;
const bad = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(B, f), 'utf8');

  // (1) INSERT column count vs VALUES slot count
  for (const m of src.matchAll(/INSERT INTO\s+`(\w+)`\s*\(([^)]*)\)\s*VALUES\s*\(((?:[^()]|\([^()]*\))*)\)/gi)) {
    const cols = topCommas(m[2]);
    const vals = topCommas(m[3]);
    checked++;
    if (cols !== vals) bad.push(`${f}: INSERT ${m[1]} — ${cols} columns, ${vals} values`);
  }

  // (2) placeholders vs execute() argument count, for the statement that follows
  for (const m of src.matchAll(/prepare\(\s*(['"])((?:\\.|(?!\1)[\s\S])*?)\1\s*\)/g)) {
    const sql = m[2];
    const qs = (sql.match(/\?/g) || []).length;
    if (qs === 0) continue;

    // Pair the prepare with ITS OWN execute. If it was assigned to a variable,
    // find that variable's execute — otherwise the next execute() in source
    // order may belong to a different statement prepared nearby.
    const before = src.slice(Math.max(0, m.index - 40), m.index);
    const owner = (before.match(/\$(\w+)\s*=\s*[^;]*$/) || [])[1];
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 2000);
    const re = owner
      ? new RegExp('\\$' + owner + '\\s*->\\s*execute\\s*\\(([\\\\s\\\\S]*?)\\)\\s*;', 'm')
      : /^\s*(?:->|\))\s*execute\s*\(([\s\S]*?)\)\s*[;)]/;
    const hit = owner ? after.match(re) : after.match(/^\s*->\s*execute\s*\(([\s\S]*?)\)\s*[;)]/) || after.match(/^\s*\)\s*->\s*execute\s*\(([\s\S]*?)\)\s*[;)]/);
    if (!hit) continue;
    const inner = hit[1].trim();
    // execute($vals) passes a variable — its length is not known statically.
    if (!inner.startsWith('[')) continue;
    const args = topCommas(inner.slice(1, -1));
    checked++;
    if (args !== qs) {
      const name = (sql.match(/(?:INSERT INTO|UPDATE)\s+`(\w+)`/i) || [, 'query'])[1];
      bad.push(`${f}: ${name} — ${qs} placeholders but ${args} execute() arguments`);
    }
  }
}
console.log('statements checked :', checked);
bad.forEach((b) => console.log('  MISMATCH  ' + b));
console.log(bad.length === 0 && checked > 0 ? 'PASS' : 'FAIL');
process.exit(bad.length === 0 && checked > 0 ? 0 : 1);
