#!/usr/bin/env node
/**
 * v162-check.js — Comprehensive verification suite for Shivaa v162 release
 * Tests:
 * 1. Stamp alignment across index.html, sw.js, app.js, and api.php (all 162).
 * 2. Preconnect and defer of Cashfree SDK v3 in index.html.
 * 3. Stepper styles in cms/css/finale.css: position relative !important on desktop and mobile.
 * 4. Aura HUD styles in cms/css/finale.css: z-index 15 !important, clear: both, margin.
 * 5. App.js scrollTo vs scrollIntoView for stepper docking.
 * 6. App.js buyCampaignStud and cashfreeCheckout with direct form submission fallback.
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

console.log('🧪 Starting Shivaa v162 Verification Suite...\n');

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

// 1. Version Stamps
check('Index.html stamps window.__SHIVAA_REL = 162', () => {
  const index = fs.readFileSync(path.join(root, 'cms/index.html'), 'utf8');
  assert(index.includes('window.__SHIVAA_REL=162;'), 'Missing __SHIVAA_REL=162 in index.html');
  assert(index.includes('/css/finale.css?v=162'), 'Missing finale.css?v=162 in index.html');
  assert(index.includes('/js/app.js?v=162'), 'Missing app.js?v=162 in index.html');
});

check('Service Worker sw.js stamps SHELL = "shivaa-shell-v162"', () => {
  const sw = fs.readFileSync(path.join(root, 'cms/sw.js'), 'utf8');
  assert(sw.includes("const SHELL = 'shivaa-shell-v162';"), 'Missing shivaa-shell-v162 in sw.js');
  assert(sw.includes('/css/finale.css?v=162'), 'Missing finale.css?v=162 in sw.js');
  assert(sw.includes('/js/app.js?v=162'), 'Missing app.js?v=162 in sw.js');
});

check('App.js stamps APP_REL = 162', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes('const APP_REL = 162;'), 'Missing APP_REL = 162 in app.js');
});

check('Api.php GET /api/version stamps rel = 162', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes("'rel'   => 162,"), 'Missing rel => 162 in api.php');
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
  assert(app.includes('submitHostedForm'), 'cashfreeCheckout must include submitHostedForm fallback');
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

// 9. Api.php campaign_studs_catalog sync
check('Api.php campaign_studs_catalog matches v160/v161/v162 product weights and 15% MC', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes("'weightG' => 3.0, 'purity' => '22K', 'metal' => 'Gold', 'category' => 'earrings', 'mcScheme' => 'percent', 'mcValue' => 15"), 'Gents studs must have 3.0g and 15% MC');
  assert(api.includes("'p_stud_w1' => ['id' => 'p_stud_w1', 'sku' => 'SHV-LST-01', 'name' => \"Shivaa Heer Paisley-Heart 22K Gold Ladies Tops (Pair)\", 'weightG' => 3.255"), 'Heer stud must be 3.255g with 15% MC');
  assert(api.includes("'p_stud_w2' => ['id' => 'p_stud_w2', 'sku' => 'SHV-LST-02', 'name' => \"Shivaa Morni Swirl 22K Gold Ladies Drop Tops (Pair)\", 'weightG' => 2.928"), 'Morni stud must be 2.928g with 15% MC');
  assert(api.includes("'p_stud_w3' => ['id' => 'p_stud_w3', 'sku' => 'SHV-LST-03', 'name' => \"Shivaa Sitara Star 22K Gold Ladies Round Tops (Pair)\", 'weightG' => 3.086"), 'Sitara stud must be 3.086g with 15% MC');
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
console.log('🎉 All v162 verification tests PASSED!\n');
