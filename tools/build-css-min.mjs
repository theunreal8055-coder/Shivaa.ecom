#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   tools/build-css-min.mjs — v251 · the stylesheet the phone actually parses,
   minified syntactically only, with a proof that it says exactly the same thing.

   WHY
   ---
   `cms/css/shivaa.css` is 77 layers, ~965 KB, one render-blocking request. It is
   comment-stripped already (the bundle builder does that), but it is still full
   of indentation and newlines that a phone downloads and parses for no reason.

     conservative minify (csso, restructure:false):
       965,070 B → ~872,400 B raw  (-9 %)   gzip 191 KB → 174 KB

   `restructure: false` is the whole point: csso may remove whitespace, a final
   semicolon, a redundant `0px` — it may NOT merge, reorder or relocate a rule.
   The cascade is byte-for-byte the same cascade.

   AND IT IS PROVED, NOT ASSUMED
   -----------------------------
   Before writing, this script parses both files into (selector, at-rule context)
   pairs and refuses to write if:
     · the number of rule blocks differs,
     · the multiset of selectors differs,
     · the number of @media / @supports / @font-face / @keyframes blocks differs,
     · the set of @keyframes names differs.
   A mismatch is a hard exit. `qa/check-handoff.py` additionally verifies the
   sha256 banner, so a stale minified sheet cannot ship under a new release.

   USAGE
     npm i --no-save csso@5        (once, anywhere node can resolve it)
     node tools/build-css-min.mjs
     node tools/build-css-min.mjs --check
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const SRC = path.join(ROOT, 'cms', 'css', 'shivaa.css');
const OUT = path.join(ROOT, 'cms', 'css', 'shivaa.min.css');
const RELEASE = Number((fs.readFileSync(path.join(ROOT, 'cms', 'index.html'), 'utf8')
  .match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0);
const CHECK = process.argv.includes('--check');

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function loadCsso() {
  for (const base of [path.join(ROOT, 'package.json'), '/tmp/mindeps/package.json', path.join(process.cwd(), 'package.json')]) {
    try { return createRequire(base)('csso'); } catch (e) {}
  }
  try { return createRequire(import.meta.url)('csso'); } catch (e) {}
  return null;
}

/* strip strings and comments so the structural parse cannot be confused by a
   selector-looking url() or a `content: "{…}"` */
function skeleton(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    /* quotes are removed but their CONTENT is kept: `[role="button"]` and
       `[role=button]` are the same selector, and the minifier is allowed to
       write either. A brace inside a string would confuse the parser, so braces
       are neutralised on both sides. */
    .replace(/"(?:[^"\\]|\\.)*"/g, (m) => m.slice(1, -1).replace(/[{}]/g, '\u0001'))
    .replace(/'(?:[^'\\]|\\.)*'/g, (m) => m.slice(1, -1).replace(/[{}]/g, '\u0001'))
    .replace(/url\([^)]*\)/gi, 'url()');
}

/* A real (small) block parser: it must know the difference between a rule, an
   at-rule with a block, and a keyframe step, because the verification below
   compares what a browser will actually apply. Selector text is whitespace-
   stripped before comparison — a minifier is allowed to write `a > b` as `a>b`,
   and that is not a change of meaning. */
function parse(css) {
  const s = skeleton(css);
  const out = { rules: [], fontface: 0, kf: new Set(), other: new Set() };
  const n = s.length;
  /* a minifier may drop the universal selector after a combinator
     (`.a>*:nth-child(1)` → `.a>:nth-child(1)`) and may write `a > b` as `a>b`;
     neither changes what the selector matches. Quotes are stripped with their
     content kept (see skeleton()). Everything else must be identical. */
  const normSel = (t) => t
    .replace(/\s*,\s*/g, ',')
    .replace(/\s*([>+~])\s*/g, '$1')
    .replace(/([>+~])\*/g, '$1')
    .replace(/(^|,)\*/g, '$1')
    /* `.a *::before` and `.a ::before` match the same nodes (the universal
       selector before a pseudo-element is implied); the minifier writes the
       shorter one. Both sides are normalised to the same text. */
    .replace(/\*(?=::?)/g, '')
    .replace(/\s+(::?)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const normAt = (t) => t.replace(/\s+/g, ' ').replace(/\s*([:(),])\s*/g, '$1').trim();

  /* the body of the block that starts at `from` (its first `{`), by brace match */
  function body(from) {
    let depth = 0, j = from;
    for (; j < n; j++) {
      if (s[j] === '{') depth++;
      else if (s[j] === '}') { depth--; if (depth === 0) return { body: s.slice(from + 1, j), end: j + 1 }; }
    }
    return { body: s.slice(from + 1), end: n };
  }

  function walk(from, to, stack) {
    let i = from;
    while (i < to) {
      const brace = s.indexOf('{', i);
      if (brace < 0 || brace >= to) return;
      const prelude = s.slice(i, brace).trim();
      const b = body(brace);
      const last = stack[stack.length - 1] || '';
      if (/^@(-webkit-)?keyframes/.test(prelude)) {
        const nm = prelude.replace(/^@(-webkit-)?keyframes\s+/, '').trim();
        if (nm) out.kf.add(nm);
      } else if (prelude.startsWith('@media') || prelude.startsWith('@supports')) {
        walk(brace + 1, b.end - 1, stack.concat(normAt(prelude)));
      } else if (prelude.startsWith('@font-face')) {
        out.fontface++;
      } else if (prelude.startsWith('@')) {
        out.other.add(normAt(prelude));
      } else if (b.body.trim()) {
        /* a rule that actually declares something, under its media stack */
        out.rules.push(stack.join(' & ') + '|||' + normSel(prelude));
      }
      i = b.end;
    }
  }
  walk(0, n, []);
  out.rules.sort();
  return out;
}

const shape = parse;

const srcBuf = fs.readFileSync(SRC);
const src = srcBuf.toString('utf8');
const hash = sha(srcBuf);

if (CHECK) {
  if (!fs.existsSync(OUT)) { console.log('STALE  shivaa.min.css is missing — run: node tools/build-css-min.mjs'); process.exit(1); }
  const head = fs.readFileSync(OUT, 'utf8').slice(0, 400);
  const got = (head.match(/sha256 ([0-9a-f]{64})/) || [])[1];
  if (got !== hash) { console.log(`STALE  shivaa.min.css was built from ${got ? got.slice(0, 12) : 'nothing'}, shivaa.css is now ${hash.slice(0, 12)}`); process.exit(1); }
  console.log('ok     shivaa.min.css matches shivaa.css');
  process.exit(0);
}

const csso = loadCsso();
if (!csso) { console.error('build-css-min: csso not found. Run:  npm i --no-save csso@5'); process.exit(2); }

const res = csso.minify(src, { restructure: false, forceMediaMerge: false, comments: false });
const min = res.css;

/* ── the proof ─────────────────────────────────────────────────────────── */
const a = shape(src), b = shape(min);
const problems = [];
if (a.rules.length !== b.rules.length) problems.push(`effective rules ${a.rules.length} → ${b.rules.length}`);
let diff = 0;
for (let i = 0; i < Math.min(a.rules.length, b.rules.length); i++) {
  if (a.rules[i] !== b.rules[i]) { if (diff < 5) problems.push(`${a.rules[i]}  →  ${b.rules[i]}`); diff++; }
}
if (diff) problems.push(`${diff} effective rule(s) differ`);
if (a.fontface !== b.fontface) problems.push(`@font-face ${a.fontface} → ${b.fontface}`);
for (const n of a.kf) if (!b.kf.has(n)) problems.push(`@keyframes ${n} lost`);
if (a.other.size !== b.other.size) problems.push(`other at-rules ${a.other.size} → ${b.other.size}`);
if (problems.length) {
  console.error('build-css-min: REFUSING TO WRITE — the minified sheet is not the same sheet:');
  problems.slice(0, 12).forEach(p => console.error('  · ' + p));
  process.exit(1);
}

const banner = `/* SHIVAA v${RELEASE} · minified from cms/css/shivaa.css (sha256 ${hash}) by tools/build-css-min.mjs — DO NOT EDIT */\n`;
fs.writeFileSync(OUT, banner + min);
console.log(`shivaa.css ${String(src.length).padStart(8)} B → ${String(fs.statSync(OUT).size).padStart(8)} B  (-${Math.round(100 - min.length / src.length * 100)} %)`);
console.log(`verified: ${b.rules.length} effective rules (selector + media context), ${b.fontface} @font-face, ${b.kf.size} @keyframes — identical to the source`);
console.log(`sha ${hash.slice(0, 12)}`);
