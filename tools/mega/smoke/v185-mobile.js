/* v185: evidence-based mobile CSS/chrome regression checks. Does not claim
   real-device rendering: the QA sandbox cannot download a browser binary. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const rd = f => fs.readFileSync(path.join(CMS, f), 'utf8');
const idx = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'), api = rd('api.php');
const css = rd('css/v185.css'), base = rd('css/styles.css'), old = rd('css/mobile.css'), aurum = rd('css/aurum.css'), perf = rd('css/v117.css');
let passed = 0;
const test = (n, f) => { f(); passed++; console.log('PASS ' + n); };
test('M01 v185 handshakes and asset stamps; no lone SW', () => {
  assert.match(idx, /__SHIVAA_REL=185;/);
  assert.match(app, /APP_REL = 185;/);
  assert.match(api, /'rel'   => 185,/);
  assert.match(sw, /SHELL = 'shivaa-shell-v185'/);
  assert.match(sw, /const REL = 185;/);
  assert.match(sw, /MEDIA = 'shivaa-media-v168'/);
  assert.equal((idx.match(/\?v=185/g)||[]).length, 59);
  assert.equal((sw.match(/\?v=185/g)||[]).length, 54);
  assert.ok(idx.includes('/css/v184.css?v=185') && idx.includes('/css/v185.css?v=185'));
  assert.ok(sw.includes('/css/v185.css?v=185'));
  assert.ok(idx.indexOf('/css/v185.css?v=185') > idx.indexOf('/css/v184.css?v=185'));
});
test('M02 mobile-only cream canvas and light browser/PWA chrome, not brand blocks', () => {
  assert.match(old, /html\s*\{\s*background:\s*#1d0509/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*html\s*\{\s*background:\s*var\(--cream, #faf6ef\)/);
  assert.match(css, /body\s*\{\s*min-height:\s*100%/);
  assert.ok(!/html\s*\{[^}]*overflow-x\s*:\s*clip/.test(css), 'never root-clip the scrollport');
  assert.match(idx, /name="theme-color" content="#faf6ef"/);
  assert.match(idx, /apple-mobile-web-app-status-bar-style" content="default"/);
  const m1 = JSON.parse(rd('manifest.webmanifest')), m2 = JSON.parse(rd('manifest.json'));
  assert.deepEqual(m1, m2);
  assert.equal(m1.theme_color, '#faf6ef'); assert.equal(m1.background_color, '#faf6ef');
  assert.ok(idx.includes('href="/manifest.webmanifest?v=185"') && sw.includes("'/manifest.webmanifest?v=185'"));
  assert.match(base, /\.hero\{[^}]*var\(--maroon-deep\)/);
  assert.ok(!css.includes('.hero {'), 'the intentional maroon hero has not been recoloured');
});
test('M03 deferred footer fake height cannot override last-layer mobile repair', () => {
  assert.match(perf, /footer\.footer\s*\{[^}]*content-visibility:\s*auto/);
  assert.match(aurum, /html\.js-aurum \.footer\s*\{[^}]*content-visibility:\s*auto/);
  assert.match(css, /html\.js-aurum body footer\.footer,\s*body footer\.footer\s*\{\s*content-visibility:\s*visible;\s*contain-intrinsic-size:\s*none/);
  // v185 selector is strictly more specific than the deferred aurum rule.
  assert.ok(idx.indexOf('/css/v185.css?v=185') > idx.indexOf('/css/v178.css?v=185'));
});
test('M04 privacy table shrinks to viewport and scrolls internally', () => {
  assert.match(old, /\.priv-table\s*\{\s*min-width:\s*460px/);
  assert.match(css, /\.ps-body table\.priv-table\s*\{[^}]*width:\s*100%;[^}]*min-width:\s*0;[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.priv-hero-card\s*\{\s*flex-wrap:\s*wrap/);
});
console.log(`\nv185 mobile: ${passed} passed, 0 failed`);
