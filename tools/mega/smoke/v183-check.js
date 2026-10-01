/* v183 — responsive homepage hero/banner regression gate.
   The Gold Biscuit campaign is deliberately excluded from the carousel change.
   On a newer release this stamp-exact check skips; its cases should be carried
   into that release's own forward regression suite. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 183) {
    console.log('SKIP v183-check superseded by release ' + rel0 + ' (stamp-exact; migrate its regressions into the current suite)');
    process.exit(0);
  }
}

const fs = require('fs');
const path = require('path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const ROOT = path.resolve(__dirname, '../../..');
const rd = name => fs.readFileSync(path.join(CMS, name), 'utf8');
const index = rd('index.html'), app = rd('js/app.js'), sw = rd('sw.js'), api = rd('api.php'), css = rd('css/v183.css');
let pass = 0, fail = 0;
function test(id, name, run) {
  try { run(); pass++; console.log(`PASS ${id} ${name}`); }
  catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); }
}
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

// Execute only the pure template block with inert helpers, then inspect its output DOM.
const helperStart = app.indexOf('/* v183 — shared, art-directed hero/banner renderer.');
const helperEnd = app.indexOf('pages.home = async (view) => {', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'template block boundaries');
const templateSource = app.slice(helperStart, helperEnd) + '\nglobalThis.__v183Slides = renderHomeCarouselSlides();';
const context = {
  ASSET_V: '?v=183',
  esc: value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
};
vm.runInNewContext(templateSource, context, { timeout: 1000 });
const slideDom = new JSDOM(`<main id="slides">${context.__v183Slides}</main>`);
const slides = [...slideDom.window.document.querySelectorAll('.c-slide')];
const HOME_CAROUSEL_SLIDES_TEXT = app.slice(app.indexOf('const HOME_CAROUSEL_SLIDES = Object.freeze(['), app.indexOf('function renderHomeCarouselSlides()'));

(async () => {
  test('S01', 'release 183 and cache-busting are in lockstep', () => {
    assert.ok(index.includes('window.__SHIVAA_REL=183;'));
    assert.ok(app.includes('const APP_REL = 183;'));
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v183';") && sw.includes('const REL = 183;'));
    assert.ok(api.includes("'rel'   => 183,"));
    assert.ok((index.match(/\?v=183/g) || []).length >= 59, 'index asset URLs carry the new build number');
    assert.equal((sw.match(/\?v=183/g) || []).length, 52, 'worker shell references the new build');
    for (const [name, body] of [['index', index], ['worker', sw], ['app', app]])
      assert.ok(!body.includes('?v=182'), `${name} contains an old asset URL`);
    assert.ok(sw.includes("'/css/v183.css?v=183'"));
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'unrelated media-cache generation stays unchanged');
    const cssLinks = [...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/css\/[^"]+)"/g)].map(m => m[1]);
    assert.equal(cssLinks.at(-1), '/css/v183.css?v=183', 'new override layer is last');
  });

  test('S02', 'the primary hero is a responsive picture with an accessible alt and one CTA', () => {
    const homeStart = app.indexOf('pages.home = async (view) => {');
    const campaignStart = app.indexOf('<!-- HOME CAMPAIGN ENTRY CARD -->', homeStart);
    const hero = app.slice(homeStart, campaignStart);
    assert.ok(hero.includes("responsiveBannerPicture('hero-main', 'hero-main-mobile'"));
    assert.ok(hero.includes('Bridal gold necklace set on rich maroon velvet'));
    const cta = /<div class="hero-cta">([\s\S]*?)<\/div>/.exec(hero);
    assert.ok(cta, 'hero CTA container exists');
    assert.equal((cta[1].match(/<a\b/g) || []).length, 1, 'exactly one primary hero action');
    assert.ok(cta[1].includes('href="#/scheme"') && cta[1].includes('Win 10g Gold Biscuit'), 'existing campaign route and CTA copy remain available');
    assert.ok(index.includes('hero-main-mobile.webp?v=183') && index.includes('hero-main.webp?v=183'), 'viewport-matched hero preloads');
  });

  test('S03', 'the four unlocked carousel slides render from one shared template and retain their order', () => {
    assert.deepEqual(slides.map(s => s.dataset.banner), ['heritage', 'bridal', 'everyday', 'swarna-nidhi']);
    for (const slide of slides) {
      assert.ok(slide.querySelector('.c-picture'), `${slide.dataset.banner} has a picture`);
      assert.ok(slide.querySelector('.c-body h3'), `${slide.dataset.banner} has a headline`);
      assert.ok(slide.querySelector('.c-body p'), `${slide.dataset.banner} has a supporting line`);
      assert.equal(slide.querySelectorAll('.c-cta a').length, 1, `${slide.dataset.banner} has one CTA`);
      assert.ok(slide.querySelector('.c-picture source[media="(max-width: 820px)"][type="image/webp"]'), `${slide.dataset.banner} has mobile WebP art direction`);
      assert.ok(slide.querySelector('.c-picture source[media="(max-width: 820px)"]:not([type])'), `${slide.dataset.banner} has a mobile JPEG fallback`);
      assert.ok(slide.querySelector('.c-picture source[type="image/webp"]:not([media])'), `${slide.dataset.banner} has desktop WebP art direction`);
      assert.ok(slide.querySelector('.c-picture img[alt]'), `${slide.dataset.banner} has descriptive alt text`);
    }
    assert.equal(slides[0].querySelector('img').getAttribute('loading'), 'eager');
    assert.equal(slides[0].querySelector('img').getAttribute('fetchpriority'), 'high');
    for (const slide of slides.slice(1)) {
      assert.equal(slide.querySelector('img').getAttribute('loading'), 'lazy');
      assert.equal(slide.querySelector('img').getAttribute('fetchpriority'), 'low');
    }
    assert.ok(!templateSource.includes('gold-biscuit-campaign'), 'campaign artwork is not part of the carousel template');
  });

  test('S04', 'all responsive derivatives are real, compact image files', () => {
    const names = [
      'hero-main.webp', 'hero-main-mobile.jpg', 'hero-main-mobile.webp',
      'poster-heritage.webp', 'poster-heritage-mobile.jpg', 'poster-heritage-mobile.webp',
      'poster-bridal.webp', 'poster-bridal-mobile.jpg', 'poster-bridal-mobile.webp',
      'poster-everyday.webp', 'poster-everyday-mobile.jpg', 'poster-everyday-mobile.webp',
      'wedding.webp', 'wedding-mobile.jpg', 'wedding-mobile.webp'
    ];
    for (const name of names) {
      const file = path.join(CMS, 'images/banners', name);
      const bytes = fs.readFileSync(file);
      assert.ok(bytes.length < 200_000, `${name} is under 200 KB`);
      if (name.endsWith('.webp')) {
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${name} RIFF header`);
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `${name} WebP signature`);
      } else {
        assert.equal(bytes[0], 0xff, `${name} JPEG SOI`);
        assert.equal(bytes[1], 0xd8, `${name} JPEG SOI`);
      }
    }
  });

  test('S05', 'the separate Gold Biscuit entry card and its campaign image are unchanged', () => {
    const a = app.indexOf('  <!-- HOME CAMPAIGN ENTRY CARD -->');
    const b = app.indexOf('  <div class="catbar-outer">', a);
    assert.ok(a >= 0 && b > a);
    const lockedBlock = app.slice(a, b);
    assert.equal(sha256(Buffer.from(lockedBlock)), '062bee45f2429f86ba34ea4678b8d71156003195e2bb1b852cb7dba64d12843b');
    const campaignImage = fs.readFileSync(path.join(CMS, 'images/banners/gold-biscuit-campaign.jpg'));
    assert.equal(sha256(campaignImage), 'b979aa9adfd0f2524af465b95f1f1c89534ef5d2275cf8d223067fa86b95286e');
    assert.ok(!HOME_CAROUSEL_SLIDES_TEXT.includes('gold-biscuit'), 'no campaign slide was introduced');
  });

  test('S06', 'the invalid visit-reset countdown and static everyday price lock are removed', () => {
    assert.ok(!app.includes("bindCountdown($('#wedCd'), Date.now()"));
    assert.ok(!app.includes('id="wedCd"'));
    assert.ok(!templateSource.includes('price-lock'));
    assert.ok(!templateSource.includes('flash-countdown'));
  });

  test('S07', 'carousel dots and off-slide links are accessible; autoplay respects interaction and reduced motion', () => {
    assert.ok(app.includes('class="c-dot ${i === 0 ? \'on\' : \'\'}"'));
    assert.ok(app.includes('aria-label="Show ${esc(slide.dataset.label'));
    assert.ok(app.includes('aria-current="${i === 0 ? \'true\' : \'false\'}"'));
    assert.ok(app.includes("if ('inert' in sl) sl.inert = j !== idx;"));
    assert.ok(app.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"));
    assert.ok(app.includes("if (e.pointerType === 'mouse') { mouseHovering = true; stop(); }"));
    assert.ok(app.includes("if (e.pointerType === 'mouse') { mouseHovering = false; start(); }"));
    assert.ok(app.includes("car.addEventListener('pointerdown'"));
    assert.ok(app.includes("car.addEventListener('focusin', stop)"));
    assert.match(css, /#heroCarousel \.c-track\s*\{\s*transition: none !important/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /300ms ease-out/);
  });

  test('S08', 'logo remains the supplied navy artwork on an opaque white card and has a text alternative', () => {
    assert.ok(app.includes('alt="Shivaa Inc. logo"'));
    assert.match(css, /\.hero \.hero-logo\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?background:\s*#fff;/);
    assert.ok(fs.existsSync(path.join(CMS, 'images/logo.png')));
  });

  test('S09', 'release-specific regression suite is wired into npm test', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts.test.includes('v183-check.js'));
  });

  console.log(`\nv183 check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
