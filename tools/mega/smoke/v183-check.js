/* v183 — mobile responsive recovery layer + Design Selection phone pass.
   Static build gate: lockstep release/cache wiring, responsive hooks, mobile
   breakpoints/touch controls, and preserved B2B desk billing behaviour. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const read = name => fs.readFileSync(path.join(CMS, name), 'utf8');
const index = read('index.html');
const sw = read('sw.js');
const app = read('js/app.js');
const api = read('api.php');
const css = read('css/v183.css');
const relMatch = /window\.__SHIVAA_REL\s*=\s*(\d+)/.exec(index);
const rel = relMatch ? Number(relMatch[1]) : 0;
if (rel > 183) {
  console.log(`SKIP v183-check superseded by release ${rel} (stamp-exact; current release gate owns these invariants)`);
  process.exit(0);
}

let pass = 0, fail = 0;
function test(name, run) {
  try { run(); pass++; console.log(`PASS ${name}`); }
  catch (e) { fail++; console.error(`FAIL ${name}: ${e.message}`); }
}

const stylesheetLinks = [...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/css\/[^"]+)"/g)].map(m => m[1]);
const indexAssets = [...new Set([...index.matchAll(/(?:href|src)="(\/(?:css|js|fonts)\/[^" ]+\?v=183)"/g)].map(m => m[1]))];
const swAssets = new Set([...sw.matchAll(/'\/(?:css|js|fonts)\/[^']+\?v=183'/g)].map(m => m[0].slice(1, -1)));

test('release 183 is in lockstep across HTML, app, worker and API', () => {
  assert.equal(rel, 183, 'index release stamp');
  assert.ok(app.includes('const APP_REL = 183;'), 'APP_REL');
  assert.ok(sw.includes("const SHELL = 'shivaa-shell-v183';") && sw.includes('const REL = 183;'), 'service worker stamps');
  assert.ok(api.includes("'rel'   => 183,"), 'API version response');
});

test('new stylesheet is the final CSS layer and is in the offline shell', () => {
  assert.equal(stylesheetLinks.at(-1), '/css/v183.css?v=183', 'v183 wins the stylesheet cascade');
  assert.ok(sw.includes("'/css/v183.css?v=183'"), 'new CSS precached');
  assert.equal((index.match(/\?v=183/g) || []).length, 57, 'all index assets moved to 183');
  assert.equal((sw.match(/\?v=183/g) || []).length, 52, 'all precache URLs moved to 183');
  assert.equal((index.match(/\?v=182/g) || []).length, 0, 'no stale index asset URL');
  assert.equal((sw.match(/\?v=182/g) || []).length, 0, 'no stale worker asset URL');
  for (const asset of indexAssets) assert.ok(swAssets.has(asset), `missing worker precache entry: ${asset}`);
  assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'media cache unchanged because no media changed');
});

test('responsive safety layer remains scoped to mobile/tablet and honors reduced motion', () => {
  for (const needle of [
    '@media (max-width: 920px)', '@media (max-width: 768px)', '@media (max-width: 390px)',
    '@media (prefers-reduced-motion: reduce)',
    'grid-template-columns: minmax(0, 1fr)',
    'max-width: 100%', 'min-width: 0', 'env(safe-area-inset-bottom',
    'animation-duration: .01ms !important',
  ]) assert.ok(css.includes(needle), `missing responsive rule: ${needle}`);
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, 'CSS braces balance');
});

test('Design Selection filter hooks and phone reflow guard the weight-range overflow', () => {
  for (const hook of [
    'dsf-search-field', 'dsf-category-field', 'dsf-stone-field', 'dsf-colour-field',
    'dsf-purity-field', 'dsf-sort-field', 'dsf-weight-field', 'dsf-quick-field',
  ]) assert.ok(app.includes(hook), `missing generated filter hook ${hook}`);
  assert.ok(css.includes('.ds-wrap .dsf-weight-field .pf-w input'), 'weight inputs can shrink equally');
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'phone filter and design grids use zero-minimum columns');
  assert.ok(css.includes('.ds-card > .ds-img') && css.includes('.ds-card > .ds-qty'), 'small-phone horizontal card layout');
});

test('quantity, filter and photo controls keep mobile hit areas; billing copy remains intact', () => {
  for (const needle of [
    'min-height: 44px !important', '.ds-arrow { width: 44px; height: 44px;',
    'padding: 19px;', 'min-height: 48px;',
  ]) assert.ok(css.includes(needle), `missing touch target rule: ${needle}`);
  for (const needle of [
    'id="dsProceed"', 'ShivaaDS.proceed()', 'ShivaaDS.qty(',
    'fine gold grams', 'ZERO making charges',
  ]) assert.ok(app.includes(needle), `existing desk function/copy missing: ${needle}`);
});

test('the shipped JavaScript parses cleanly', () => {
  for (const file of ['js/app.js', 'js/admin.js', 'sw.js'])
    execFileSync(process.execPath, ['--check', path.join(CMS, file)], { stdio: 'pipe' });
});

console.log(`\nv183 check: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
