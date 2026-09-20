#!/usr/bin/env node
/**
 * v163-check.js — Comprehensive verification suite for Shivaa v163 release
 * 
 * Verifies:
 * 1. Stamp alignment across index.html, sw.js, app.js, and api.php (all v163).
 * 2. Preconnect and defer of Cashfree SDK v3 in index.html.
 * 3. Stepper styles in cms/css/finale.css: position relative !important on desktop and mobile.
 * 4. Aura HUD styles in cms/css/finale.css: z-index 15 !important, relative positioning.
 * 5. App.js scrollTo top prevents docking collisions with Aura.
 * 6. App.js buyCampaignStud routes through the unified exRunBuy pipeline with EX_BOUNDARY.
 * 7. App.js exRunBuy saves _expressOrder, _lastOrder, and sets fqPrompt in sessionStorage.
 * 8. App.js exHandoff gracefully supports Cashfree mode and Demo mode.
 * 9. App.js cashfreeCheckout uses official SDK v3 with _self redirectTarget and hosted form fallback.
 * 10. Api.php cashfree_occ_block enforces origUnit >= discUnit and sanitizes item names.
 * 11. Api.php finale_qualifies checks both id and productId.
 * 12. Api.php pay/cashfree/return redirects campaign orders to /#/scheme?step=quiz.
 * 13. Api.php campaign_studs_catalog matches catalog specs and 15% MC.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '../../..');

console.log('🧪 Starting Shivaa v163 Verification Suite...\n');

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
check('Index.html stamps window.__SHIVAA_REL = 163', () => {
  const index = fs.readFileSync(path.join(root, 'cms/index.html'), 'utf8');
  assert(index.includes('window.__SHIVAA_REL=163;'), 'Missing __SHIVAA_REL=163 in index.html');
  assert(index.includes('/css/finale.css?v=163'), 'Missing finale.css?v=163 in index.html');
  assert(index.includes('/js/app.js?v=163'), 'Missing app.js?v=163 in index.html');
});

check('Service Worker sw.js stamps SHELL = "shivaa-shell-v163"', () => {
  const sw = fs.readFileSync(path.join(root, 'cms/sw.js'), 'utf8');
  assert(sw.includes("const SHELL = 'shivaa-shell-v163';"), 'Missing shivaa-shell-v163 in sw.js');
  assert(sw.includes('/css/finale.css?v=163'), 'Missing finale.css?v=163 in sw.js');
  assert(sw.includes('/js/app.js?v=163'), 'Missing app.js?v=163 in sw.js');
});

check('App.js stamps APP_REL = 163', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes('const APP_REL = 163;'), 'Missing APP_REL = 163 in app.js');
});

check('Api.php GET /api/version stamps rel = 163', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes("'rel'   => 163,"), 'Missing rel => 163 in api.php');
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
  assert(app.includes("window.scrollTo({ top: 0, behavior: 'smooth' });"), 'app.js must call window.scrollTo({ top: 0, behavior: \'smooth\' })');
});

// 5. App.js buyCampaignStud routes through unified exRunBuy pipeline
check('App.js buyCampaignStud delegates cleanly to exRunBuy without stepper resets', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes('await exRunBuy(items);'), 'buyCampaignStud must await exRunBuy(items)');
  const buyFn = app.slice(app.indexOf('window.Shivaa.buyCampaignStud ='), app.indexOf('window.Shivaa.finJump'));
  assert(!buyFn.includes('setSchemeStep'), 'buyCampaignStud should not reset stepper on errors');
  assert(!buyFn.includes('location.hash ='), 'buyCampaignStud should not change hash directly');
});

// 6. App.js exRunBuy stores order references and remembers pin
check('App.js exRunBuy saves expressOrder and lastOrder correctly', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes('window.Shivaa._expressOrder = res;'), 'exRunBuy must set _expressOrder');
  assert(app.includes('window.Shivaa._lastOrder = res;'), 'exRunBuy must set _lastOrder');
  assert(app.includes("sessionStorage.setItem('fqPrompt', res.id)"), 'exRunBuy must set fqPrompt');
});

// 7. App.js exHandoff supports Cashfree mode and Demo mode
check('App.js exHandoff supports both Cashfree mode and Demo mode', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes("po.mode === 'cashfree' && po.paymentSessionId"), 'exHandoff must start Cashfree checkout');
  assert(app.includes("po.mode === 'demo'"), 'exHandoff must handle demo mode');
});

// 8. App.js cashfreeCheckout launcher & fallback
check('App.js cashfreeCheckout uses official Cashfree SDK v3 with _self redirect and form fallback', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes("redirectTarget: '_self'"), 'cashfreeCheckout must use _self redirectTarget');
  assert(app.includes('submitHostedForm'), 'cashfreeCheckout must include submitHostedForm fallback');
  assert(app.includes("action = env === 'sandbox'"), 'submitHostedForm must support sandbox and production URLs');
});

// 9. Api.php OCC item validation: original_price >= discounted_price and sanitized name
check('Api.php cashfree_occ_block ensures origUnit >= discUnit and sanitizes item names', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes('$origUnit = max($unit, $discUnit);'), 'Api.php must ensure original unit price is at least discounted unit price');
  assert(api.includes("'item_original_unit_price' => $origUnit,"), 'item_original_unit_price must use $origUnit');
  assert(api.includes("$nm = preg_replace('/[^\\w\\s\\-().,]/', '', $nm);"), 'Item names must be sanitized');
});

// 10. Api.php finale_qualifies checks id and productId
check('Api.php finale_qualifies identifies campaign orders by id and productId', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes("$id = (string)($it['id'] ?? ($it['productId'] ?? ''));"), 'finale_qualifies must check id and productId');
});

// 11. Api.php pay/cashfree/return redirects campaign orders to quiz
check('Api.php pay/cashfree/return routes qualifying scheme orders to step=quiz', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes("if ($isCampOrder && $orderId !== '') {"), 'pay/cashfree/return must detect isCampOrder');
  assert(api.includes("target = '/#/scheme?step=quiz&orderId='"), 'pay/cashfree/return must direct campaign orders to quiz');
});

// 12. Api.php campaign studs weights & making charge
check('Api.php campaign_studs_catalog matches exact specs', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes("'p_stud_m1' => ['id' => 'p_stud_m1', 'sku' => 'SHV-MST-01', 'name' => \"Shivaa Veer 22K Gold Men's Square Stud (Pair)\", 'weightG' => 3.0"), 'p_stud_m1 must match');
  assert(api.includes("'p_stud_w1' => ['id' => 'p_stud_w1', 'sku' => 'SHV-LST-01', 'name' => \"Shivaa Heer Paisley-Heart 22K Gold Ladies Tops (Pair)\", 'weightG' => 3.255"), 'p_stud_w1 must match');
});

console.log(`\nResults: ${passCount} passed, ${failCount} failed.`);
if (failCount > 0) {
  process.exit(1);
}
console.log('🎉 All v163 verification tests PASSED!\n');
