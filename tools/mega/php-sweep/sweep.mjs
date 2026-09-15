#!/usr/bin/env node
/**
 * SHIVAA php-sweep — static inventory + TypeError gate (v114)
 *
 * Prints one contract line:
 *   N routes · M exceptions
 *
 * Routes (the 211 inventory) are the sum of every dispatcher the site
 * actually has, counted from source so a dropped handler moves the number:
 *
 *   $route === occurrences in api.php
 * + preg_match(..., $route) handlers
 * + hallmark_public_route endpoints (status GET, lookup POST)
 * + SPA pages.* keys in app.js
 * + staff lazy routes (admin, partner)
 * + sitemap.xml
 * + extra unique ($route, $method) pairs beyond one method per named path
 * + the method-less PayU return (browser POST, no $method on the if)
 *
 * Exceptions are PHP 8 TypeErrors waiting to happen under
 * declare(strict_types=1) — today: str_pad() whose first argument is an
 * int expression (not a string cast / string-returning call).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const api = fs.readFileSync(path.join(ROOT, 'cms/api.php'), 'utf8');
const hall = fs.readFileSync(path.join(ROOT, 'cms/hallmark.php'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'cms/js/app.js'), 'utf8');
const sitemapExists = fs.existsSync(path.join(ROOT, 'cms/sitemap.php'));

function count(re, src) {
  return (src.match(re) || []).length;
}

const namedOcc = count(/\$route\s*===/g, api);
const pregRoute = [...api.matchAll(/preg_match\s*\(\s*'#\^[^']+#['a-z]*,\s*\$route/g)].length;
const hallPublic = (hall.match(/hallmark\/(?:status|lookup)/g) || []).filter((v, i, a) => a.indexOf(v) === i).length;
const spaPages = count(/^pages\.\w+\s*=/gm, app);
const staff = 2; // admin.js lazy-loads Shivaa.routes.admin / .partner
const sitemap = sitemapExists ? 1 : 0;

const pairRe = /\$route\s*===\s*'([^']+)'\s*&&\s*\$method\s*===\s*'(\w+)'/g;
const pairs = [...api.matchAll(pairRe)].map(m => m[1] + ' ' + m[2]);
const uniquePairs = new Set(pairs);
const pairPaths = new Set([...api.matchAll(pairRe)].map(m => m[1]));
const extraNamedMethods = uniquePairs.size - pairPaths.size;

const methodless = [...api.matchAll(/\$route\s*===\s*'([^']+)'/g)]
  .map(m => m[1])
  .filter(p => ![...pairPaths].includes(p));
// trust is GET (handled later in the same if); pay/payu/return is the
// browser POST with no $method on the condition — count it once.
const payuReturn = methodless.includes('pay/payu/return') ? 1 : 0;

const routes = namedOcc + pregRoute + hallPublic + spaPages + staff + sitemap + extraNamedMethods + payuReturn;

/* ── TypeError exceptions: str_pad(int, …) under strict_types ── */
function stripPhpComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}
const exceptions = [];
const padRe = /str_pad\s*\(([^,\n]+),/g;
const scanned = stripPhpComments(api);
let m;
while ((m = padRe.exec(scanned))) {
  const arg = m[1].trim();
  const line = scanned.slice(0, m.index).split('\n').length;
  const ok =
    /^\(string\)/.test(arg) ||
    /^['"]/.test(arg) ||
    /^(date|decbin|bin2hex|json_encode|sprintf|number_format|hash|hash_hmac|basename|trim|substr|mb_substr|strtoupper|strtolower|strval|chr)\s*\(/.test(arg);
  if (!ok) exceptions.push({ file: 'cms/api.php', line, arg });
}

const line = `${routes} routes · ${exceptions.length} exceptions`;
console.log(line);
if (exceptions.length) {
  for (const e of exceptions) {
    console.error(`  TypeError risk: ${e.file}:${e.line}  str_pad(${e.arg}, …)`);
  }
  process.exit(1);
}
if (process.argv.includes('--verbose')) {
  console.error({ namedOcc, pregRoute, hallPublic, spaPages, staff, sitemap, extraNamedMethods, payuReturn, routes });
}
