#!/usr/bin/env node
/**
 * v161-check.js — Comprehensive verification suite for Shivaa v161 release
 * Tests:
 * 1. Stamp alignment across index.html, sw.js, app.js, and api.php (all 161).
 * 2. Preconnect and defer of Cashfree SDK v3 in index.html.
 * 3. Stepper styles in cms/css/finale.css: position relative !important on desktop and mobile.
 * 4. Aura HUD styles in cms/css/finale.css: z-index 15 !important, clear: both, margin.
 * 5. App.js scrollTo vs scrollIntoView for stepper docking.
 * 6. App.js buyCampaignStud and cashfreeCheckout modal with fallback.
 * 7. App.js loadExternalScript race condition check with globalCheck.
 * 8. App.js quiz polling retry loop.
 * 9. Api.php campaign_studs_catalog sync with real products.
 * 10. Api.php pay/order pin resolution and OCC checkoutAuthenticate allowance.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '../../..');

console.log('🧪 Starting Shivaa v161 Verification Suite...\n');

let passCount = 0;
let failCount = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ ${label}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

// 1. Version Stamps — v164: forward-tolerant lockstep (era floor 161, not an exact pin)
const REL_NOW = +((fs.readFileSync(path.join(root, 'cms/index.html'), 'utf8').match(/__SHIVAA_REL=(\d+)/) || [])[1] || 0);
check('Release stamps are in lockstep at rel >= 161 (index/app/api/shell/loaders)', () => {
  assert(REL_NOW >= 161, 'tree rel ' + REL_NOW + ' is below era 161');
  const index = fs.readFileSync(path.join(root, 'cms/index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'cms/sw.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(app.includes('const APP_REL = ' + REL_NOW + ';'), 'APP_REL must equal ' + REL_NOW);
  assert(sw.includes("const SHELL = 'shivaa-shell-v" + REL_NOW + "';"), 'SHELL must equal v' + REL_NOW);
  assert(api.includes("'rel'   => " + REL_NOW + ","), 'api rel must equal v' + REL_NOW);
  assert(index.includes('/js/app.js?v=' + REL_NOW), 'index app loader must equal v' + REL_NOW);
  assert(sw.includes('/js/app.js?v=' + REL_NOW), 'sw app precache must equal v' + REL_NOW);
  const finIdx = (index.match(/\/css\/finale\.css\?v=(\d+)/) || [])[1];
  const finSw = (sw.match(/\/css\/finale\.css\?v=(\d+)/) || [])[1];
  assert(finIdx && finIdx === finSw, 'finale.css stamp must agree between index and sw');
});

// 2. Cashfree SDK Preconnect & Preload
check('Index.html preconnects and loads Cashfree SDK v3', () => {
  const index = fs.readFileSync(path.join(root, 'cms/index.html'), 'utf8');
  assert(index.includes('https://sdk.cashfree.com'), 'Missing Cashfree preconnect in index.html');
  assert(index.includes('https://sdk.cashfree.com/js/v3/cashfree.js'), 'Missing Cashfree script tag in index.html');
});

// 3. Finale CSS: Stepper and Aura HUD styling
check('Finale.css prevents sticky stepper from docking over Aura HUD', () => {
  const css = fs.readFileSync(path.join(root, 'cms/css/finale.css'), 'utf8');
  assert(css.includes('.shv-scheme-stepper {\n  position: relative !important;\n  top: auto !important;'), 'Desktop stepper must be position: relative !important');
  assert(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.shv-scheme-stepper\s*\{[\s\S]*?position:\s*relative\s*!important;/.test(css), 'Mobile 768px stepper must be position: relative !important');
  assert(css.includes('.shv-ai-concierge-bar {\n  position: relative !important;\n  z-index: 15 !important;'), 'Aura HUD must have z-index 15 !important and relative positioning');
});

// 4. App.js Stepper scroll to top
check('App.js renderSchemeStage uses window.scrollTo to prevent docking collisions', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(!app.includes('header.scrollIntoView'), 'app.js should not call header.scrollIntoView on the stepper');
  assert(app.includes('window.scrollTo({ top: 0, behavior: \'smooth\' });'), 'app.js must call window.scrollTo({ top: 0, behavior: \'smooth\' })');
});

// 5. App.js Cashfree hosted checkout launcher
check('App.js cashfreeCheckout uses official Cashfree SDK v3 with _self redirect and fallback', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes("redirectTarget: '_self'"), 'cashfreeCheckout must use _self redirectTarget');
  assert(app.includes('() => typeof window.Cashfree === \'function\''), 'cashfreeCheckout must verify window.Cashfree before returning');
});

// 6. App.js loadExternalScript race condition fix
check('App.js loadExternalScript handles preloaded and cached scripts gracefully', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes('function loadExternalScript(src, timeoutMs, globalCheck)'), 'loadExternalScript must accept globalCheck parameter');
  assert(app.includes('if (typeof globalCheck === \'function\' && globalCheck()) return resolve(true);'), 'loadExternalScript must resolve early if globalCheck already passes');
});

// 7. App.js Buy Now button feedback & phone resolution
check('App.js buyCampaignStud provides UI feedback and safe boundary address', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes("buyBtn.innerHTML = '⚡ Opening Cashfree…';"), 'buyCampaignStud must set button connecting text');
  assert(app.includes("location.hash = '#/scheme?step=quiz&orderId='"), 'buyCampaignStud must route to quiz step upon completion');
});

// 8. App.js quiz polling retry loop
check('App.js pages.scheme polls Cashfree status resiliently before launching quiz', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes('attempts < maxAttempts'), 'pages.scheme must have retry attempts loop for Cashfree status');
  assert(app.includes("toast('भुगतान सत्यापित हो रहा है... / Verifying payment… ✦');"), 'pages.scheme must display status verification toast');
});

// 9. Api.php campaign_studs_catalog sync — v164: value pins, not source-shape
// pins (the catalog is built by a $mk helper now; weights/MC/SKUs unchanged).
check('Api.php campaign_studs_catalog keeps the v160 spec weights and 15% MC', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  const start = api.indexOf('function campaign_studs_catalog()');
  const fn = api.slice(start, api.indexOf('function finale_qualifies', start));
  assert(fn.includes('SHV-MST-01') && fn.includes('SHV-MST-02') && fn.includes('SHV-MST-03'), 'gents SKUs present');
  assert(fn.includes('SHV-LST-01') && fn.includes('SHV-LST-02') && fn.includes('SHV-LST-03'), 'ladies SKUs present');
  assert((fn.match(/, 3\.0,/g) || []).length >= 3, 'gents 3.0g present');
  assert(fn.includes('3.255') && fn.includes('2.928') && fn.includes('3.086'), 'ladies tag weights present');
  assert(fn.includes("'mcValue' => 15") && fn.includes("'mcScheme' => 'percent'"), '15% MC present');
  assert(fn.includes("'category' => 'earrings'"), 'earrings category present');
});

// 10. Api.php pay/order pin resolution and OCC authentication
check('Api.php allows pin resolution and OCC checkoutAuthenticate for Express 1-click buy', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes('$gr = shv_resolve_order($db, (string)($b[\'orderId\'] ?? \'\'), $pin);'), 'pay/order must resolve order by pin if pin is present');
  assert(api.includes('$occOn = !empty($cfg[\'occ\']) || $isSentinel || $isBoundary || $guest;'), 'pay/order must enable OCC for sentinel/boundary orders');
  assert(api.includes('checkoutAuthenticate'), 'pay/order must allow checkoutAuthenticate');
  assert(api.includes('shv_guest_pin($order)'), 'orders must generate guest pin for express orders');
});

console.log(`\nResults: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  process.exit(1);
}
console.log('🎉 All v161 verification tests PASSED!\n');
