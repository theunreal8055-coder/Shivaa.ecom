/* Saathi brain tests — loads the REAL cms/js/bot.js under a minimal DOM stub
   and exercises the pure functions it exposes via window.Saathi._test.
   Run: node qa/test_bot_brain.js   (exits non-zero on any failure) */
'use strict';
const fs = require('fs');
const path = require('path');

/* ── minimal browser stubs ── */
const elStub = () => ({
  style: {}, dataset: {}, value: '', innerHTML: '', scrollTop: 0, children: [],
  classList: { add() {}, remove() {} },
  setAttribute() {}, addEventListener() {}, appendChild() {}, focus() {}, animate() {},
});
global.document = {
  querySelector: () => elStub(),          // truthy => mount() early-returns; closure still built
  querySelectorAll: () => [],
  createElement: elStub,
  body: { appendChild() {}, classList: { add() {}, remove() {} } },
};
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.sessionStorage = { getItem: () => null, setItem() {} };
global.fetch = () => Promise.reject(new Error('offline in test'));
global.setInterval = () => 0;
global.setTimeout = () => 0;
global.innerWidth = 1200;

/* ── load the real bot ── */
const src = fs.readFileSync(path.join(__dirname, '..', 'cms', 'js', 'bot.js'), 'utf8');
eval(src);
const T = global.window.Saathi._test;

/* ── assertions ── */
let ok = 0; const fails = [];
const t = (name, cond) => { if (cond) { ok++; console.log('PASS', name); } else { fails.push(name); console.log('FAIL', name); } };

t('budgetOf: "under 50 thousand" = 50000', T.budgetOf('under 50 thousand') === 50000);
t('budgetOf: "half lakh" = 50000', T.budgetOf('half lakh') === 50000);
t('budgetOf: "1.2 lakh" = 120000', T.budgetOf('1.2 lakh') === 120000);
t('budgetOf: "under ₹30k" = 30000', T.budgetOf('under ₹30k') === 30000);
t('budgetOf: no money → null', T.budgetOf('show me something nice') === null);

t('findCat: "jhumki dikhao" → earrings', T.findCat('jhumki dikhao') === 'earrings');
t('findCat: "angoothi" → rings', T.findCat('angoothi') === 'rings');
t('findCat: "kada" → bangles', T.findCat('kada') === 'bangles');
t('findOcc: "bhai dooj gift ideas" → festive', T.findOcc('bhai dooj gift ideas') === 'festive');
t('findOcc: "shaadi ka haar" → wedding', T.findOcc('shaadi ka haar') === 'wedding');

t('isHi: Devanagari detected', T.isHi('झुमका दिखाओ') === true);
t('isHi: Hinglish detected', T.isHi('sasta jhumka dikhao') === true);
t('isHi: plain English not flagged', T.isHi('show rings under 50k') === false);
t('HI_WORD: अंगूठी → ring', T.HI_WORD['अंगूठी'] === 'ring');

const fake = { name: 'Kundan Jhumka Earrings', tags: ['jhumka', 'festive'], desc: '' };
t('scoreSearch: typo-free match scores', T.scoreSearch(fake, T.tokens('jhumka')) > 0);
t('scoreSearch: synonym jhumki→jhumka scores', T.scoreSearch(fake, ['jhumki']) > 0);
t('scoreSearch: unrelated word scores 0', T.scoreSearch(fake, ['necklace']) === 0);

console.log(`\n${ok} passed · ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
