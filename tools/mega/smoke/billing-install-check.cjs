const fs = require('fs');
const Engine = require('php-parser');
const SRC = '/home/user/Shivaa.ecom/cms/install-billing.php';
const code = fs.readFileSync(SRC, 'utf8');

// 1. Syntax check with the same parser the smoke belt uses for api.php
const parser = new Engine({ ast: { withPositions: true }, parser: { extractDoc: false } });
let ast = null, parseErr = null;
try { ast = parser.parseCode(code, 'install-billing.php'); }
catch (e) { parseErr = e.message; }
console.log('1. parses cleanly        :', parseErr ? 'NO — ' + parseErr : 'yes');

// 2. Count the DDL entries the parser sees
let arr = null;
(function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.kind === 'array' && Array.isArray(node.items) && node.items.length > 5
      && node.items.every(i => i.value && i.value.kind === 'string')) { arr = node; return; }
  for (const [k, v] of Object.entries(node)) if (k !== 'loc') {
    if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v);
  }
})(ast);
const n = arr ? arr.items.length : 0;
console.log('2. DDL statements found  :', n);

// 3. Every entry must start with the guard prefix
const stmts = (arr?.items || []).map(i => i.value.value);
const re = /^CREATE TABLE IF NOT EXISTS `billing_[a-z_]+` \(/;
const bad = stmts.filter(s => !re.test(s));
console.log('3. all pass the guard    :', bad.length === 0, bad.length ? bad.slice(0,2) : '');
const mut = stmts.filter(s => /\b(DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|RENAME)\b/i.test(s));
console.log('4. none mutate data      :', mut.length === 0, mut.length ? mut.slice(0,2) : '');
console.log('5. table names           :', stmts.map(s => s.match(/`(billing_[a-z_]+)`/)[1]).join(', '));
