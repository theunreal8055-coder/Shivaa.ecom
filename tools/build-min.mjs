#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   tools/build-min.mjs — v249 · the two files the phone actually downloads,
   minified, with a fingerprint that proves they are current.

   WHY
   ---
   `cms/js/app.js` is the application and `cms/js/rel.js` is every behaviour
   layer (tools/build-js-bundle.py). Together they are 1,249,464 bytes of
   JavaScript that a phone must download, parse and compile before the shop
   answers a tap — and the owner's report is “still slow loading”. Both files are
   unusually comment-rich on purpose (each layer explains the defect it answers),
   which is exactly what a build step is for: the explanation stays in the source
   for whoever reads it next, and the shopper gets the code without it.

   Measured on this tree (terser 5, compress passes 2, no top-level mangling):

     app.js   828,622 → 577,193 raw   (gzip 259,430 → 179,550)
     rel.js   420,842 → 204,232 raw   (gzip 123,679 →  63,634)
     total  1,249,464 → 781,425 raw   (gzip 383,109 → 243,184)

   That is 468 KB less to download on a host that does not compress, 140 KB less
   on one that does, and roughly 40 % less to parse in both cases.

   SAFETY — why this cannot ship stale code
   ----------------------------------------
   Every minified file carries a banner with the sha256 of the source it was
   built from. `qa/check-handoff.py` recomputes that hash from the source and
   fails the handover if it disagrees, so a forgotten rebuild is a red gate, not
   a silent old release. The sources themselves stay in the repo and in the
   update zip; `index.html` is the only thing that points at the minified pair,
   so a rollback is two script tags.

   TOP-LEVEL NAMES ARE NEVER MANGLED. app.js defines `route`, `toast`,
   `Shivaa`, … and index.html carries inline `onclick="…"` handlers that call
   them by name. `mangle.toplevel` and `compress.toplevel` stay false for exactly
   that reason. Nothing else here is clever.

   USAGE
   -----
     npm i --no-save terser@5      (once, anywhere node can resolve it)
     node tools/build-min.mjs      # writes cms/js/app.min.js + cms/js/rel.min.js
     node tools/build-min.mjs --check   # verify only; exit 1 if stale
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const JS = path.join(ROOT, 'cms', 'js');
const RELEASE = Number((fs.readFileSync(path.join(ROOT, 'cms', 'index.html'), 'utf8')
  .match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0);
const CHECK = process.argv.includes('--check');
const PAIRS = [['app.js', 'app.min.js'], ['rel.js', 'rel.min.js']];

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const banner = (src, hash) =>
  `/* SHIVAA v${RELEASE} · generated from cms/js/${src} (sha256 ${hash}) by tools/build-min.mjs — DO NOT EDIT */\n`;

/* terser may live in a throwaway install (/tmp/mindeps), in the repo, or
   globally — this build must not require a node_modules in the repository */
function loadTerser() {
  const bases = [
    path.join(ROOT, 'package.json'),
    '/tmp/mindeps/package.json',
    path.join(process.cwd(), 'package.json'),
  ];
  for (const base of bases) {
    try {
      return createRequire(base)('terser');
    } catch (e) { /* next */ }
  }
  try { return createRequire(import.meta.url)('terser'); } catch (e) {}
  return null;
}

let stale = 0;
const terser = CHECK ? null : loadTerser();
if (!CHECK && !terser) {
  console.error('build-min: terser not found. Run:  npm i --no-save terser@5   (in any directory node can see)');
  process.exit(2);
}

for (const [src, out] of PAIRS) {
  const srcPath = path.join(JS, src);
  const outPath = path.join(JS, out);
  const code = fs.readFileSync(srcPath, 'utf8');
  const hash = sha(Buffer.from(code));

  if (CHECK) {
    if (!fs.existsSync(outPath)) { console.log(`STALE  ${out} is missing`); stale++; continue; }
    const head = fs.readFileSync(outPath, 'utf8').slice(0, 400);
    const got = (head.match(/sha256 ([0-9a-f]{64})/) || [])[1];
    if (got !== hash) { console.log(`STALE  ${out} was built from ${got ? got.slice(0, 12) : 'nothing'}, ${src} is now ${hash.slice(0, 12)}`); stale++; }
    else console.log(`ok     ${out} matches ${src}`);
    continue;
  }

  const res = await terser.minify(code, {
    /* the two settings that must never change: app.js's top-level names are
       called from inline HTML handlers */
    compress: { passes: 2, toplevel: false, drop_debugger: true },
    mangle: { toplevel: false, reserved: ['Shivaa'] },
    format: { comments: false, ascii_only: false },
  });
  if (res.error) { console.error(`build-min: ${src} —`, res.error); process.exit(1); }
  fs.writeFileSync(outPath, banner(src, hash) + res.code);
  const before = Buffer.byteLength(code), after = fs.statSync(outPath).size;
  console.log(`${src.padEnd(8)} ${String(before).padStart(9)} B → ${String(after).padStart(9)} B  (-${Math.round(100 - after / before * 100)} %)   sha ${hash.slice(0, 12)}`);
  /* the output must still parse — a minifier that breaks the app is a broken
     release, and node can tell us before a phone does */
  const { execFileSync } = await import('node:child_process');
  try { execFileSync(process.execPath, ['--check', outPath], { stdio: 'pipe' }); }
  catch (e) { console.error('build-min: node --check failed on ' + out); process.exit(1); }
}

if (CHECK) {
  if (stale) { console.error(`\n${stale} minified file(s) are stale — run: node tools/build-min.mjs`); process.exit(1); }
  console.log('\nthe minified pair matches the sources');
}
