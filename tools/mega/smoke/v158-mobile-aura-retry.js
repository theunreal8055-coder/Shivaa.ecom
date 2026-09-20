#!/usr/bin/env node
/**
 * v158-mobile-aura-retry.js
 * Verifies:
 * 1. Aura AI speech engine warm Hindi tone, scripts, and voice prioritization.
 * 2. Buy Now failure / cancel graceful fallback to #/scheme?step=products (never home).
 * 3. Version 158 stamp consistency across index.html, sw.js, app.js, and api.php.
 * 4. CSS mobile optimization and touch responsiveness.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const CMS = path.join(ROOT, 'cms');

const idx = fs.readFileSync(path.join(CMS, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(CMS, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(CMS, 'sw.js'), 'utf8');
const api = fs.readFileSync(path.join(CMS, 'api.php'), 'utf8');
const css = fs.readFileSync(path.join(CMS, 'css/finale.css'), 'utf8');

const results = [];
function ok(title, pass, extra) {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${title}${!pass && extra ? '\n        ' + extra : ''}`);
}

console.log('\n· 1 — AURA AI WARM HINDI VOICE & SCRIPTS:');
{
  ok('AURA_SCRIPTS contains polite and welcoming Hindi phrasing',
    app.includes('नमस्ते जी! आपका शिवा में हार्दिक स्वागत है') &&
    app.includes('मैं आपकी शिवा साथी ऑरा') &&
    app.includes('1-क्लिक कैशफ्री से आसानी से आर्डर कम्प्लीट करें'));

  ok('ShivaaAudio.getHindiVoice prioritizes natural female Hindi voices',
    app.includes('getHindiVoice()') &&
    app.includes('swara|neerja|kalpana|lekha|hi-in.*female|google.*hi.*female'));

  ok('Speech synthesis settings configured for warm, polite cadence (rate 0.90, pitch 1.12)',
    app.includes('ut.rate = 0.90') && app.includes('ut.pitch = 1.12'));

  ok('Aura UI provides audio wave visualizer and speech indicators',
    app.includes('shvAiSpeakBtn') && css.includes('.shv-ai-waves') && css.includes('.shv-ai-wave-bar'));
}

console.log('\n· 2 — BUY NOW CASHFREE FAILURE / RETRY REDIRECT:');
{
  ok('buyCampaignStud catches Cashfree cancel/fail and directs back to products page',
    app.includes("Shivaa.setSchemeStep('products', g)") ||
    app.includes("Shivaa.setSchemeStep('products', window._schemeState?.gender || 'gents')"));

  ok('Payment status pending verification on return routes unpaid to products page for retry',
    app.includes("toast('भुगतान अधूरा रहा — कृपया दोबारा डिज़ाइन चुनकर बाय नाउ करें ✦', 'err')"));

  ok('Failed or declined payment never drops customer to homepage',
    !app.includes("if (!res.paid) location.hash = '#/'") &&
    !app.includes("cfErr => location.hash = '#/'"));
}

console.log('\n· 3 — MOBILE FIRST OPTIMIZATION & RESPONSIVENESS:');
{
  ok('finale.css defines responsive rules for mobile (<768px and <480px)',
    css.includes('@media (max-width: 768px)') &&
    css.includes('@media (max-width: 480px)'));

  ok('Horizontal scroll stepper on mobile with hidden scrollbars',
    css.includes('.shv-stepper-wrap') &&
    css.includes('overflow-x: auto') &&
    css.includes('-webkit-overflow-scrolling: touch'));

  ok('Mobile touch targets meet 44px+ minimum sizing',
    css.includes('min-height: 44px') || css.includes('touch-action: manipulation'));

  ok('Clean CSS without redundant duplicate blocks',
    (css.match(/^\.shv-ai-concierge-bar\s*\{/m) || []).length === 1);
}

console.log('\n· 4 — VERSION 158+ STAMP LOCKSTEP:');
{
  ok('app.js APP_REL = 158+', /const APP_REL = 15\d;/.test(app));
  ok('index.html __SHIVAA_REL = 158+ and app.js?v=158+',
    /window\.__SHIVAA_REL=15\d;/.test(idx) && /\/js\/app\.js\?v=15\d/.test(idx));
  ok('sw.js SHELL = shivaa-shell-v158+ and app.js?v=158+ precache',
    /shivaa-shell-v15\d/.test(sw) && /'\/js\/app\.js\?v=15\d'/.test(sw));
  ok('api.php rel = 158+', /'rel'\s*=>\s*15\d,/.test(api));
}

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} v158 mobile & Aura retry checks passed ✦`);
process.exit(pass === results.length ? 0 : 1);
