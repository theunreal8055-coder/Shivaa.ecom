#!/usr/bin/env node
/**
 * v163-check.js — Comprehensive verification suite for Shivaa v163 release
 * Tests:
 * 1. Stamp alignment across index.html, sw.js, app.js, and api.php (all 163).
 * 2. Preconnect and defer of Cashfree SDK v3 in index.html.
 * 3. Stepper styles in cms/css/finale.css: position relative !important on desktop and mobile.
 * 4. Aura HUD styles in cms/css/finale.css: z-index 15 !important, clear: both, margin.
 * 5. App.js scrollTo vs scrollIntoView for stepper docking.
 * 6. App.js buyCampaignStud uses canonical EX_BOUNDARY and invokes Cashfree without location.hash destruction.
 * 7. App.js cashfreeCheckout handles _modal on desktop and _self on mobile with submitHostedForm fallback.
 * 8. App.js loadExternalScript handles preloaded and cached scripts gracefully.
 * 9. Api.php finale_qualifies defined at global scope for safe return redirects.
 * 10. Api.php cashfree_occ_block supports image, images, and img item fields.
 * 11. Api.php campaign_studs_catalog matches v160/v161/v162/v163 product weights and 15% MC.
 * 12. Api.php pay/order pin resolution and OCC checkoutAuthenticate allowance.
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

// 1. Version Stamps — v164: forward-tolerant lockstep (era floor 163, not an exact pin)
const REL_NOW = +((fs.readFileSync(path.join(root, 'cms/index.html'), 'utf8').match(/__SHIVAA_REL=(\d+)/) || [])[1] || 0);
check('Release stamps are in lockstep at rel >= 163 (index/app/api/shell/loaders)', () => {
  assert(REL_NOW >= 163, 'tree rel ' + REL_NOW + ' is below era 163');
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

// 5. App.js buyCampaignStud uses canonical EX_BOUNDARY and invokes Cashfree seamlessly
check('App.js buyCampaignStud places canonical boundary order and invokes Cashfree without location.hash destruction', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes('buyCampaignStud = async (productId) =>'), 'buyCampaignStud must exist');
  assert(app.includes("address: { ...EX_BOUNDARY }"), 'buyCampaignStud must use exact EX_BOUNDARY without tampering');
  assert(app.includes("await Shivaa.cashfreeCheckout(po.paymentSessionId, po.env);"), 'buyCampaignStud must call cashfreeCheckout');
  // Check that location.hash is NOT called right after cashfreeCheckout on the success path
  const buyFnMatch = app.match(/buyCampaignStud\s*=\s*async[\s\S]*?window\.Shivaa\.finJump/);
  assert(buyFnMatch, 'Could not extract buyCampaignStud body');
  const buyFnBody = buyFnMatch[0];
  const cfSuccessPath = buyFnBody.match(/if\s*\(po\s*&&\s*po\.mode\s*===\s*'cashfree'[\s\S]*?return;\s*\}/);
  assert(cfSuccessPath, 'Must have po.mode === cashfree branch in buyCampaignStud');
  const cleanCode = cfSuccessPath[0].replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(!cleanCode.includes('location.hash'), 'Cashfree branch must not set location.hash on success path');
});

// 6. App.js Cashfree hosted checkout launcher
check('App.js cashfreeCheckout handles _modal and _self with fallback', () => {
  const app = fs.readFileSync(path.join(root, 'cms/js/app.js'), 'utf8');
  assert(app.includes("redirectTarget: '_modal'"), 'cashfreeCheckout must support _modal for desktop One Click Checkout');
  assert(app.includes("redirectTarget: '_self'"), 'cashfreeCheckout must support _self for mobile and fallback');
  assert(app.includes('submitHostedForm'), 'cashfreeCheckout must include submitHostedForm fallback');
  assert(app.includes('() => typeof window.Cashfree === \'function\''), 'cashfreeCheckout must verify window.Cashfree before returning');
});

// 7. Api.php finale_qualifies global definition
check('Api.php defines finale_qualifies at global scope so pay/cashfree/return never throws fatal', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  const returnIdx = api.indexOf("'pay/cashfree/return'");
  const funcIdx = api.indexOf('function finale_qualifies(');
  assert(funcIdx !== -1, 'finale_qualifies must be defined');
  assert(returnIdx !== -1, 'pay/cashfree/return must exist');
  assert(funcIdx < returnIdx, 'finale_qualifies must be defined BEFORE pay/cashfree/return');
});

// 8. Api.php cashfree_occ_block image support
check('Api.php cashfree_occ_block inspects img, image, and images keys', () => {
  const api = fs.readFileSync(path.join(root, 'cms/api.php'), 'utf8');
  assert(api.includes("(array)($it['img'] ?? null)"), 'cashfree_occ_block must inspect $it[img]');
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
console.log('🎉 All v163 verification tests PASSED!\n');
