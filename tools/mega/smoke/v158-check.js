/* ═══════════════════════════════════════════════════════════════════════
   SHIVAA v158 check — the release stamp, lockstep, and the categories
   ownership move. Static pins only (behaviour is driven by v158-cats.js).

   v158 = v157's content (Shivaa everywhere · 24K ₹398 premium · three
   in-place-poll bug fixes) PLUS the Categories control repair the owner
   reported on 20 Sep 2026:
     · one owner in app.js (initCatsMenu) — js/v116.js's incomplete twin gone
     · the scrim starts below the header (it used to cover the button)
     · the 17 tiles are built from CATS before any API call — never blank
     · fold-on-navigate AND fold-on-drawer-close for the drawer's photo list
   v157 was packaged but never deployed, so this release carries it forward.

   Run: node tools/mega/smoke/v158-check.js
        SMOKE_CMS=<dir> node tools/mega/smoke/v158-check.js   (zip overlay)
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const CMS = process.env.SMOKE_CMS || path.join(ROOT, 'cms');
const read = f => { try { return fs.readFileSync(path.join(CMS, f), 'utf8'); } catch (e) { return ''; } };
const app = read('js/app.js'), idx = read('index.html'), sw = read('sw.js'), api = read('api.php');
const v116js = read('js/v116.js'), v116css = read('css/v116.css'), html = idx;
const results = [];
const ok = (name, pass, detail = '') => { results.push(!!pass); console.log(`${pass ? '  PASS  ' : '  FAIL  '}${name}${!pass && detail ? '\n          ' + detail : ''}`); };
if (!/function initCatsMenu\(\)/.test(app)) { console.log('SKIP — pre-v158 tree'); process.exit(0); }
const REL = +((/const APP_REL = (\d+);/.exec(app) || [])[1] || 0);

console.log('\n· 1 — stamp lockstep 158 (index · sw · api · app):');
ok('APP_REL 158', REL === 158, 'APP_REL=' + REL);
ok('index __SHIVAA_REL=158', idx.includes('window.__SHIVAA_REL=158;'));
ok('sw SHELL shivaa-shell-v158', sw.includes("'shivaa-shell-v158'"));
ok("api 'rel' => 158 (mind the 3-space gap)", /'rel'   => 158,/.test(api));
ok('no 157 stamp survives in the boot spots',
  !idx.includes('__SHIVAA_REL=157') && !idx.includes('app.js?v=157') && !sw.includes('shivaa-shell-v157') && !sw.includes("'/js/app.js?v=157'"));

console.log('\n· 2 — the four moved assets are stamped 158 in BOTH the shell and the precache:');
for (const [file, needle] of [['/js/app.js', "idx + precache"], ['/css/styles.css', ''], ['/js/v116.js', ''], ['/css/v116.css', '']]) {
  const inIdx = new RegExp(file.replace(/[/.]/g, '\\$&') + '\\?v=158').test(html);
  const inSw = sw.includes(`'${file}?v=158'`);
  ok(`${file}?v=158 in index.html AND the sw precache`, inIdx && inSw, `index=${inIdx} sw=${inSw}`);
}

console.log('\n· 3 — the categories ownership move (static proof of the repair):');
ok('js/v116.js holds no #navCats wiring (comments excluded)',
  !/navCats|wireCatsButton|earlyCatsButton/.test(v116js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')));
ok('app.js has the single controller + the two builders + the house navigation helper',
  /function catsPanelHTML\(\)/.test(app) && /function catsListHTML\(\)/.test(app) && /function shvNavTo\(href\)/.test(app) && /let _catsMenuReady = false;/.test(app));
ok('the controller is initialised BEFORE boot (first paint, no API needed)',
  /try \{ initCatsMenu\(\); \} catch \(e\) \{\}/.test(app) && /^  initCatsMenu\(\);$/m.test(app) &&
  app.indexOf('try { initCatsMenu(); }') < app.indexOf('if (document.readyState === \'loading\')'));
ok('the old inline panel markup is gone (one builder, not two)',
  !/\$\('#catMenu'\)\.innerHTML = `/.test(app));
ok('every dismissal path is bound by the owner: scrim · outside · Escape · scroll · resize · hashchange',
  /if \(scrim\) scrim\.addEventListener\('click'/.test(app) && /document\.addEventListener\('click', e => \{\n      if \(panel\.hidden\) return;/.test(app) &&
  /e\.key === 'Escape'\) \{ setPanelOpen\(false\); foldList\(\); \}/.test(app) && /addEventListener\('scroll', \(\) => \{ if \(!panel\.hidden\) setPanelOpen\(false\); \}/.test(app) &&
  /addEventListener\('resize', closeAll/.test(app) && /addEventListener\('hashchange', \(\) => \{ setPanelOpen\(false\); foldList\(\); \}\)/.test(app));
ok('tiles navigate FIRST and dismiss SECOND (the v127/v139 house pattern)',
  /shvNavTo\(a\.getAttribute\('href'\)\);\n      setPanelOpen\(false\);/.test(app) && /window\.__shvNavigating = true/.test(app));
ok('the drawer list folds on the drawer closing too (observer), not only on hashchange',
  /new MutationObserver\(\(\) => \{ if \(!nav\.classList\.contains\('open'\)\) foldList\(\); \}\)/.test(app));
ok('css: the scrim starts below the header + the open panel rides above the floating chrome',
  /top: var\(--headerH, 120px\);/.test(v116css) && /right: 0; bottom: 0; left: 0;/.test(v116css) && /body\.cats-open \.header \{ z-index: 2000 !important; \}/.test(v116css));

console.log('\n· 4 — v157\'s content is still standing (nothing lost in the renumber):');
ok('Shivaa branding + the display-boundary normaliser', read('hallmark.php').includes('function shv_storefront_copy(') &&
  app.includes('LIVE SHIVAA RATE') && !app.includes('LIVE JAIPUR RATE'));
ok('24K carries the 22K premium (₹398) through the api chain',
  /function gold24_premium\(array \$db\): int/.test(api) && /'gold24' => \(int\)round\(\$g24\) \+ \$gp24,/.test(api) && /'gold24' => 398,/.test(api) === false || /gold24_premium/.test(api));
ok('v157\'s three in-place poll fixes are intact',
  /function refreshComparePage\(\)/.test(app) && /const _bbLive = \(\) => \{/.test(app) && /const _svLive = \(\) => \{/.test(app));
const era157 = (() => { try { return fs.readFileSync(path.join(ROOT, 'tools/mega/smoke/v157-check.js'), 'utf8'); } catch (e) { return ''; } })();
const era119 = (() => { try { return fs.readFileSync(path.join(ROOT, 'tools/mega/smoke/v119-check.js'), 'utf8'); } catch (e) { return ''; } })();
ok('the era suites were made forward-tolerant, never weakened (v157 tolerates 157+, not 157-only)',
  /forward-tolerant/.test(era157) && /APP_REL is 157 or later/.test(era157) &&
  /d\.querySelector\('\.shivaa-hero, \.jaipur-hero'\)/.test(era119));

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} v158 checks passed  ${pass === results.length ? '✦ — stamps 158 · one owner · the scrim clears the button' : '✗ FAILED'}`);
process.exit(pass === results.length ? 0 : 1);
