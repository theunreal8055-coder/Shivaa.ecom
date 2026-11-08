/* v221 browser QA — button geometry lock (no leaving space / expanding on click)
   + D2C fast boot, click & navigation (Zomato / Uber responsiveness). */
import fs from 'node:fs';
import { boot, click, until, wait } from './harness.mjs';

const ok = [], bad = [];
const T = (name, cond, detail = '') => (cond ? ok : bad).push(name + (detail ? ' — ' + detail : ''));

const index = fs.readFileSync('cms/index.html', 'utf8');
const sw = fs.readFileSync('cms/sw.js', 'utf8');
const app = fs.readFileSync('cms/js/app.js', 'utf8');
const api = fs.readFileSync('cms/api.php', 'utf8');
const css221 = fs.readFileSync('cms/css/v221.css', 'utf8');
const js221 = fs.readFileSync('cms/js/v221.js', 'utf8');
const mobCss = fs.readFileSync('cms/css/mobile.css', 'utf8');
const aurumCss = fs.readFileSync('cms/css/aurum.css', 'utf8');

const openB = (css221.match(/\{/g) || []).length;
const closeB = (css221.match(/\}/g) || []).length;
T('v221.css exists with balanced braces', openB === closeB && openB >= 8, `${openB}/${closeB}`);
T('v221.js exists and exposes __shivaaV221', js221.includes('__shivaaV221') && js221.includes('version: 221'));
T('index.html links v221.css and v221.js at ?v=221', index.includes('/css/v221.css?v=221') && index.includes('/js/v221.js?v=221'));
T('v221.css synchronous stylesheet guards .rip / .au-rip / .v194-rip / .au-p before deferred styles load',
  css221.includes('.au-rip') && css221.includes('.v194-rip') && css221.includes('display: none !important'));
T('index.html does not block DOMContentLoaded on external cashfree.js script tag',
  !index.includes('<script src="https://sdk.cashfree.com/js/v3/cashfree.js"'));
T('app.js still lazy-loads cashfree.js on checkout demand',
  app.includes("loadExternalScript('https://sdk.cashfree.com/js/v3/cashfree.js'"));
T('mobile.css no longer has blanket *:hover { transform: none !important }',
  !/\*:hover\s*\{\s*transform:\s*none\s*!important/.test(mobCss));
T('aurum.css .au-rip-host no longer forces position: relative',
  !/\.au-rip-host\s*\{[^}]*position:\s*relative/.test(aurumCss));
T('sw.js precaches v221.css and v221.js at v221',
  sw.includes('/css/v221.css?v=221') && sw.includes('/js/v221.js?v=221') && sw.includes('const REL = 221;'));
T('stamps aligned at 221 across index, sw, app, api',
  index.includes('__SHIVAA_REL=221') && app.includes('const APP_REL = 221;') && api.includes("'rel' => 221,"));

/* Live JSDOM verification */
const { dom, window, doc, errors } = await boot('#/', { mobile: true });
const $ = s => doc.querySelector(s);
const $$ = s => [...doc.querySelectorAll(s)];
await until(() => $$('#view .p-card').length > 0, 4000);

T('runtime: __shivaaV221 active', !!(window.__shivaaV221 && window.__shivaaV221.version === 221));

/* Click every category of interactive button and verify zero ripple expansion / inline position mutation */
const targets = [
  $('#navToggle'),
  $('#cartBtn'),
  $('#wishBtn'),
  $('.c-arrow'),
  $('.cb-arrow'),
  $('.pc-wish'),
  $('.btn-primary'),
  $('.btn-gold'),
  $('.btn-outline'),
].filter(Boolean);

const t0 = performance.now();
for (const btn of targets) {
  click(window, btn);
}
const clickMs = performance.now() - t0;

T('buttons: clicking 9 core buttons completes in < 150ms (no getComputedStyle freeze)',
  clickMs < 150, `${clickMs.toFixed(1)}ms`);
T('buttons: zero .rip / .au-rip / .v194-rip / .au-p spans injected on click',
  $$('.rip, .au-rip, .v194-rip, .au-p').length === 0);
T('buttons: zero .au-rip-host or .magnetic classes added to buttons',
  $$('.au-rip-host, .magnetic').length === 0);
T('buttons: zero inline style.position or style.overflow mutations on clicked buttons',
  targets.every(b => !b.style.position && !b.style.overflow && !b.style.transform));

/* Fast route transitions without .au-vt / .au-view-prev full-DOM clones */
window.location.hash = '#/shop';
await until(() => $$('#view .p-card').length > 0 && doc.body.dataset.page === 'shop', 3000);
await wait(100);
const realErrors = errors.filter(e => !/Not implemented: HTMLMediaElement\.prototype\.(play|pause|load)/.test(e));
T('navigation: zero .au-vt or .au-view-prev cloned DOM trees on body',
  $$('.au-vt, .au-view-prev').length === 0);
T('navigation: zero console/page errors', realErrors.length === 0, realErrors.join('; '));

dom.window.close();

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
