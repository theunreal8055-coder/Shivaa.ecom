/* v187 — visual polish for Amrita ji's private thank-you page.
   Static checks only. Proves the release is lockstep, the new layer loads
   last and is precached, the reduced-motion and 16px-input guards survive,
   and that the copy, flow and money paths the owner signed off on did not move.
   SUPERSEDED-PROBE — stamp-exact for release 187: on a NEWER tree it SKIPs. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 187) {
    console.log('SKIP v187-check superseded by release ' + rel0 + ' (stamp-exact)');
    process.exit(0);
  }
}

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const rd = n => fs.readFileSync(path.join(CMS, n), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'),
      api = rd('api.php'), css187 = rd('css/v187.css'), css184 = rd('css/v184-amrita.css');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v187 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  await test('B01', 'release 187 in lockstep across the four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=187;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 187;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v187';") && sw.includes('const REL = 187;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 187,"), 'api version endpoint');
  });

  await test('B02', 'no 184 asset stamps left in the shell or the worker', async () => {
    assert.equal((index.match(/\?v=184/g) || []).length, 0, 'index still has ?v=184');
    assert.equal((sw.match(/\?v=184/g) || []).length, 0, 'sw still has ?v=184');
  });

  await test('B03', 'v187.css loads LAST in the shell and is precached by the worker', async () => {
    const links = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
    assert.equal(links[links.length - 1], '/css/v187.css?v=187', 'v187.css must load last so it wins');
    assert.ok(sw.includes("'/css/v187.css?v=187'"), 'the worker does not precache the polish layer');
  });

  await test('B04', 'the v187 layer keeps the reduced-motion and iOS-zoom guards', async () => {
    assert.ok(/@media \(prefers-reduced-motion:reduce\)/.test(css184), 'v184 reduced-motion guard missing');
    assert.ok(/font-size:16px/.test(css184), 'v184 16px input rule missing');
    assert.ok(!/@keyframes/.test(css187), 'v187 is visual-only: it must not add animation');
    assert.ok(!/animation\s*:/.test(css187), 'v187 is visual-only: it must not add animation');
  });

  await test('B05', 'focus rings exist for keyboard users, tap targets are at least 44px', async () => {
    assert.ok(css187.includes('.am-star:focus-visible'), 'no focus ring on the stars');
    assert.ok(css187.includes('.am-dish:focus-visible'), 'no focus ring on the dishes');
    assert.ok(/\.am-dish\{min-height:44px\}/.test(css187.replace(/\s/g, '')), 'dish tap target under 44px');
  });

  await test('B06', 'the page copy and flow are unchanged from v184', async () => {
    const page = app.slice(app.indexOf('pages.amrita = async'), app.indexOf('pages.shop = async'));
    assert.ok(page.includes('Namaste, <em>Amrita ji</em>'), 'the greeting moved');
    assert.ok(page.includes('Those sandwiches were<br>just a <em>trailer</em>, mam.'), 'the step-3 line moved');
    assert.ok(page.includes("settings && state.settings.amritaPage") || page.includes('state.settings && state.settings.amritaPage'),
      'the owner switch is no longer checked on the page');
  });

  await test('B07', 'no money, route or API surface changed in this release', async () => {
    assert.ok(api.includes("'/api/amrita/card'") || api.includes('amrita/card'), 'the card route is gone');
    assert.ok(api.includes('function coupon_discount'), 'the v184 coupon discount is gone');
    assert.ok(!/css\/v187/.test(api), 'api should not reference the css layer');
  });

  await test('B08', 'service worker and app.js still parse', async () => {
    execFileSync(process.execPath, ['--check', path.join(CMS, 'sw.js')], { stdio: 'pipe' });
    execFileSync(process.execPath, ['--check', path.join(CMS, 'js/app.js')], { stdio: 'pipe' });
  });

  console.log(`\nv187-check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
