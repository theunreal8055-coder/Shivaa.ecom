/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v159 check — the release stamp + the category-tap guarantee, static.

   v159 = v158 (one owner for the Categories control · the scrim clears the
   button · 17 tiles with no API call) PLUS the guarantee that a category tap
   can never go nowhere, plus everything v157 carried (which was never
   deployed). Behaviour is driven by v159-cats.js; this file pins the release.

   Run: node tools/mega/smoke/v159-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v159-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = f => { try { return fs.readFileSync(path.join(CMS, f), 'utf8'); } catch (e) { return ''; } };
const app = read('js/app.js'), idx = read('index.html'), sw = read('sw.js'), api = read('api.php');
const v116js = read('js/v116.js'), v116css = read('css/v116.css');
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
if (!/function initCategoryTapGuarantee\(\)/.test(app)) { console.log('SKIP — pre-v159 tree'); process.exit(0); }
const REL = +((/const APP_REL = (\d+);/.exec(app) || [])[1] || 0);
const stampOf = (t, file) => { const m = new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=(\\d+)').exec(t); return m ? Number(m[1]) : 0; };
const paired = (file, min) => { const a = stampOf(idx, file), b = stampOf(sw, file); return a >= min && a === b; };

console.log('\n· 1 — stamp lockstep 159:');
ok('APP_REL 159', REL === 159, 'APP_REL=' + REL);
ok('index __SHIVAA_REL=159', idx.includes('window.__SHIVAA_REL=159;'));
ok('sw SHELL shivaa-shell-v159', sw.includes("'shivaa-shell-v159'"));
ok("api 'rel' => 159 (mind the 3-space gap)", /'rel'   => 159,/.test(api));
ok('app.js ?v= rides 159 in index.html AND the sw precache', paired('/js/app.js', 159));
ok('nothing regressed to an older stamp anywhere in the boot spots',
  !idx.includes('__SHIVAA_REL=158') && !sw.includes('shivaa-shell-v158') && !idx.includes('app.js?v=158') && !sw.includes("'/js/app.js?v=158'"));
ok('the other shipped assets keep their valid stamps (index == worker, 158+)',
  ['/js/v116.js', '/css/v116.css', '/css/styles.css'].every(f => paired(f, 158)));

console.log('\n· 2 — the guarantee (v159):');
ok('shvNavTo takes opts and runs the watchdog only on request',
  /function shvNavTo\(href, opts\)/.test(app) && /if \(opts && opts\.watchdog\) \{/.test(app));
ok('the watchdog never fights a real navigation — it bails the moment the hash moves',
  /if \(location\.hash === target\) return;\s+\/\/ arrived/.test(app) &&
  /if \(location\.hash !== from\) return;\s+\/\/ something else navigated on purpose/.test(app));
ok('third belt exists: pushState + route() if even the hash assignment is blocked',
  /history\.pushState\(null, '', target\)/.test(app) && /catch \(e\) \{\}\s+\s*_lastShvNav = Date\.now\(\);/.test(app));
ok('the app-wide guarantee listens in capture at the document, ahead of every owner',
  /function initCategoryTapGuarantee\(\)/.test(app) && /document\.addEventListener\('click', e => \{/.test(app) &&
  /\}, true\);/.test(app.slice(app.indexOf('function initCategoryTapGuarantee()'), app.indexOf('function initCategoryTapGuarantee()') + 3000)));
ok('…and it consumes nothing: no preventDefault / stopPropagation inside it',
  (() => { const body = app.slice(app.indexOf('function initCategoryTapGuarantee()'), app.indexOf('let _catsMenuReady')); 
           return !/preventDefault/.test(body) && !/stopPropagation/.test(body); })());
ok('it is initialised at first paint, together with the categories controller',
  /try \{ initCatsMenu\(\); \} catch \(e\) \{\}\ntry \{ initCategoryTapGuarantee\(\); \} catch \(e\) \{\}/.test(app));
ok('the panel no longer hides the tile out from under the tap (dismiss on the next tick)',
  /shvNavTo\(a\.getAttribute\('href'\), \{ watchdog: true, ev: e \}\);\n      setTimeout\(\(\) => setPanelOpen\(false\), 0\);/.test(app));
ok('the scroll-close (the mid-tap kill) is gone', !/addEventListener\('scroll', \(\) => \{ if \(!panel\.hidden\) setPanelOpen\(false\); \}/.test(app));
ok('one tap, one render: the repeat-tap redraw is debounced and skips an event another owner already handled',
  /let _lastShvNav = 0;/.test(app) && /if \(!\(ev && ev\.defaultPrevented\) && now - _lastShvNav > 250\)/.test(app));

console.log('\n· 3 — v158 + v157 content still standing:');
ok('one owner for the Categories control (controller + both builders + no v116 wiring)',
  /function initCatsMenu\(\)/.test(app) && /function catsPanelHTML\(\)/.test(app) && /function catsListHTML\(\)/.test(app) &&
  !/navCats|wireCatsButton/.test(v116js.replace(/\/\*[\s\S]*?\*\//g, '')));
ok('the scrim clears the button and the open panel rides above the chrome',
  /top: var\(--headerH, 120px\);/.test(v116css) && /body\.cats-open \.header \{ z-index: 2000 !important; \}/.test(v116css));
ok('Shivaa branding + the display-boundary normaliser + no Jaipur rate brand',
  read('hallmark.php').includes('function shv_storefront_copy(') && app.includes('LIVE SHIVAA RATE') && !app.includes('LIVE JAIPUR RATE') && !/class="jaipur-hero"/.test(app));
ok('24K premium chain intact (₹398 alongside 22K)',
  /function gold24_premium\(array \$db\): int/.test(api) && /'gold24' => \(int\)round\(\$g24\) \+ \$gp24,/.test(api));
ok('v157\'s three in-place poll fixes intact',
  /function refreshComparePage\(\)/.test(app) && /const _bbLive = \(\) => \{/.test(app) && /const _svLive = \(\) => \{/.test(app));

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} v159 checks passed  ${pass === results.length ? '✦ — stamps 159 · the tap guarantee is in' : '✗ FAILED'}`);
process.exit(pass === results.length ? 0 : 1);
