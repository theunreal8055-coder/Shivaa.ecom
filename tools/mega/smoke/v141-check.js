/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v141 check — the admin panel was invisible to the release.

   Owner report: "I can't see any one click check out in my website… I have
   applied all of your things but still can't see."

   Root cause found: the Cashfree One Click Checkout switches live in
   js/admin.js (added in v139), but app.js fetched the admin bundle as
   `/js/admin.js?v=128` — a stamp from BEFORE that change. .htaccess marks
   every `?v=` asset immutable for a year, so the owner's browser kept the
   pre-v139 admin.js and never rendered the new switches, no matter what
   live keys were saved.

   Fix: the staff-bundle stamp moves with every release that touches
   admin.js. v141 re-stamps `/js/admin.js?v=141` so a fresh copy loads; the
   release triple also moves 140 → 141 together.

   A · static — the stamp actually moved, the triple is consistent, and the
                OCC switches really exist in the shipped admin.js
   B · control — a v128-stamped admin.js must NOT resurrect (guard against
                the regression coming back)

   Run: node tools/mega/smoke/v141-check.js
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');

const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };

const shell = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const admin = fs.readFileSync(path.join(CMS, 'js/admin.js'), 'utf8');

console.log('\n· A · static');

ok('the release triple moves together to 141 (index.html · app.js · sw.js)',
  /window\.__SHIVAA_REL=14[1-9];/.test(shell) && /APP_REL\s*=\s*14[1-9]/.test(app) && /SHELL = 'shivaa-shell-v14[1-9]'/.test(sw),
  'index.html/app.js/sw.js stamps must all read 141 or newer');

ok('index.html loads app.js at v141 and the worker precaches it at v141',
  /\/js\/app\.js\?v=14[1-9]/.test(shell) && /'\/js\/app\.js\?v=14[1-9]'/.test(sw));

ok('the admin panel bundle stamp moved OFF v128 (the pre-v139 stamp that hid the switches)',
  /injectScript\('\/js\/admin\.js\?v=14[1-9]'\)/.test(app) && !/admin\.js\?v=128/.test(app),
  'app.js must load /js/admin.js?v=141+, never v128');

ok('the One Click Checkout switches really exist in the shipped admin.js',
  /⚡ Cashfree One Click Checkout/.test(admin) &&
  /name="cfOcc"/.test(admin) && /name="cfOccAddress"/.test(admin) && /name="cfOccAuth"/.test(admin) &&
  /cfOcc: !!document\.querySelector\('\[name="cfOcc"\]'\)/.test(admin));

console.log('\n· B · control');

ok('no file still references a stale admin.js?v=128 stamp (the regression can not come back silently)',
  !/admin\.js\?v=128/.test(shell) && !/admin\.js\?v=128/.test(app) && !/admin\.js\?v=128/.test(sw));

const n = results.filter(Boolean).length;
console.log(`\n${n}/${results.length} v141 checks passed  ✦`);
process.exit(n === results.length ? 0 : 1);
