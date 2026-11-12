/* t-v243-header.mjs — "PC main header se jo categories thi vo sab ud chuki hain", locked.
 *
 * The desktop header category bar is `#mainNav` — the SAME element that is the
 * side drawer on a phone. v238/v239 fixed the drawer's collapsed rows and v239
 * wrote the fix INLINE (`width:100% !important` on all nine rows) with no
 * viewport check; v240's cleanup kept that width on purpose. Inline beats every
 * css layer, so on a desktop nine equal links each demanded the whole 52 px bar
 * and the categories disappeared. Nothing was deleted.
 *
 * This suite pins both halves of the contract:
 *   · desktop → the bar carries NO inline drawer styles, the links and the mega
 *     menu are all still there, and the css rule that sizes the bar is intact;
 *   · mobile  → the drawer still gets the full-width rows that made it usable.
 *
 * Static assertions run without a server; the DOM section needs the preview
 * shim on :8090 and is skipped (loudly) when it is not up.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
};

const index = read('cms/index.html');
const css = read('cms/css/shivaa.css');
const v238 = read('cms/js/v238.js');
const v239 = read('cms/js/v239.js');
const v240 = read('cms/js/v240.js');
const v243 = read('cms/js/v243.js');
const sw = read('cms/sw.js');
const api = read('cms/api.php');
const app = read('cms/js/app.js');

/* ── 1 · the layer exists and is loaded ──────────────────────────────────── */
ok('js/v243.js ships the desktop/drawer split',
  /function barMode\(\)/.test(v243) && /min-width: 821px/.test(v243));
ok('index.html loads v243 after v242',
  index.indexOf('/js/v243.js?v=243') > index.indexOf('/js/v242.js?v=243'));
ok('index.html loads v243 exactly once', (index.match(/v243\.js/g) || []).length === 1);
ok('the release stamp is 243 everywhere it is written',
  /__SHIVAA_REL\s*=\s*243/.test(index) && /const APP_REL = 243;/.test(app) &&
  /'rel' => 243/.test(api) && /const REL = 243;/.test(sw));

/* ── 2 · the two guards that keep the fix from coming back ───────────────── */
ok('v239 only touches rows in drawer mode',
  /function drawerMode\(\)/.test(v239) && /if \(!drawerMode\(\)\) return;/.test(v239));
ok('v239 measures the drawer boundary at 820 px',
  /max-width:\s*820px/.test(v239));
ok('v240 undoes its rows only in drawer mode',
  /function isDrawer\(\)/.test(v240) && /if \(!isDrawer\(\)\) \{ restoreBar\(\); return; \}/.test(v240));
ok('v240 restores the bar when the viewport crosses the boundary',
  /addEventListener\('change', onMode\)/.test(v240));

/* ── 3 · v243 is subtractive only ────────────────────────────────────────── */
ok('v243 never writes a width, a height or an inline layout',
  !/\.style\.(width|height|display|gridTemplateColumns|flex)\s*=/.test(v243));
ok('v243 never hides or removes an element',
  !/\.hidden\s*=/.test(v243) && !/removeChild|\.remove\(\)/.test(v243) &&
  !/display\s*=\s*'none'/.test(v243));
ok('v243 only removes inline properties it knows by name',
  /removeProperty/.test(v243) && /'grid-template-columns'/.test(v243));
ok('v243 gives the phone back to the drawer untoched',
  /if \(!barMode\(\)\) return 0;/.test(v243));
ok('v243 re-checks after the late layers have run',
  /setTimeout\(run, 3500\)/.test(v243));

/* ── 4 · the desktop bar's own css is still the one in charge ────────────── */
const desktopBlock = (flat(css).match(/@media \(min-width:821px\)\{(.{0,1200})/) || [])[1] || '';
ok('the desktop bar keeps its 52 px height rule',
  /\.header > \.nav\{[^}]*height:52px/.test(flat(css)) ||
  /\.header > \.nav\{[^}]*height:52px/.test(desktopBlock), desktopBlock.slice(0, 160));
ok('the desktop bar is a centred flex row',
  /\.header > \.nav\{[^}]*justify-content:center/.test(flat(css)));
ok('no desktop rule forces the rows to full width',
  !/@media \(min-width:821px\)[\s\S]{0,4000}?\.nav-scroll > a\{[^}]*width:100%!important/.test(flat(css)));
ok('the mobile width guard (v238-injected) is scoped to .nav.open',
  /\.nav\.open \.nav-scroll>\*\{[^}]*width:100%!important/.test(v238));
ok('v243 is in the service-worker shell',
  /'\/js\/v243\.js\?v=243'/.test(sw) && /shivaa-shell-v243/.test(sw));

/* ── 5 · live DOM: desktop bar vs mobile drawer ──────────────────────────── */
const BASE = process.env.SHIVAA_BASE || 'http://127.0.0.1:8090';
let up = false;
try {
  const r = await fetch(BASE + '/index.html', { signal: AbortSignal.timeout(2500) });
  up = r.ok;
} catch (e) { up = false; }

if (!up) {
  skip++;
  console.log('  skip live DOM section — preview shim not answering on ' + BASE);
} else {
  const { boot, wait } = await import('./harness.mjs');
  /* jsdom cannot play media; that "error" is the harness's own stub, not the site */
  const real = (list) => list.filter(e => !/Not implemented: HTMLMediaElement/.test(e));

  const d = await boot('#/', { mobile: false });
  await wait(2300);
  const doc = d.window.document;
  const nav = doc.getElementById('mainNav');
  const rows = [...doc.querySelectorAll('#mainNav .nav-scroll > a')];
  const inline = rows.filter(a => /(^|;)\s*(width|display|grid-template-columns)\s*:/.test(a.getAttribute('style') || ''));
  const labels = rows.map(a => a.querySelector('.dw-tx')).filter(Boolean);
  const labelInline = labels.filter(t => /(^|;)\s*(min-width|width|display)\s*:/.test(t.getAttribute('style') || ''));
  const cats = doc.getElementById('navCats');
  const tiles = doc.querySelectorAll('#catMenu .mega-tile, #catMenu a');

  ok('desktop: #mainNav is still the header bar', !!nav && nav.parentElement && nav.parentElement.tagName === 'HEADER',
    nav ? 'parent=' + nav.parentElement.tagName : 'missing #mainNav');
  ok('desktop: all nine category links are in the bar', rows.length === 9, 'rows=' + rows.length);
  ok('desktop: not one row carries an inline width/display', inline.length === 0,
    inline.length + ' e.g. ' + (inline[0] && inline[0].getAttribute('style')));
  ok('desktop: labels carry no inline min-width', labelInline.length === 0,
    labelInline.length + ' e.g. ' + (labelInline[0] && labelInline[0].getAttribute('style')));
  ok('desktop: the scroll strip has no inline column layout',
    !/flex-direction|display/.test((doc.querySelector('#mainNav .nav-scroll') || { getAttribute: () => '' }).getAttribute('style') || ''));
  ok('desktop: every link still has its text', labels.length === 9 && labels.every(t => (t.textContent || '').trim().length > 1));
  ok('desktop: "All categories" button is still in the bar', !!cats);
  ok('desktop: the mega menu still holds its tiles', tiles.length >= 17, 'tiles=' + tiles.length);
  ok('desktop: the header is not stuck in compact mode', !doc.getElementById('header').classList.contains('compact'));
  ok('desktop: v243 reports bar mode', !!d.window.Shivaa.v243 && d.window.Shivaa.v243.barMode() === true);

  /* the bar is not decoration: a category link must still route, and the
     "All categories" button must still open the mega menu, with the drawer
     guards in place. */
  const shopLink = rows.find(a => (a.getAttribute('href') || '').indexOf('/shop') > -1) || rows[0];
  const wantHash = shopLink.getAttribute('href');
  shopLink.click();
  await wait(500);
  ok('desktop: a bar link still routes', d.window.location.hash === wantHash,
    'hash=' + d.window.location.hash + ' want=' + wantHash);
  if (cats) {
    cats.click();
    await wait(400);
    const panel = doc.getElementById('catMenu');
    const opened = /open|show|active/.test((panel && panel.className) || '') ||
      (cats.getAttribute('aria-expanded') === 'true');
    ok('desktop: the "All categories" button still opens the mega menu', opened,
      'class=' + (panel && panel.className) + ' expanded=' + cats.getAttribute('aria-expanded'));
    cats.click();
    await wait(300);
  }
  ok('desktop: v243 removed nothing from the bar after the taps',
    doc.querySelectorAll('#mainNav .nav-scroll > a').length === 9);
  ok('desktop: no page errors while the bar was repaired', real(d.errors).length === 0, (real(d.errors)[0] || '').slice(0, 160));
  d.window.close();

  const m = await boot('#/', { mobile: true });
  await wait(2300);
  const mdoc = m.window.document;
  const mrows = [...mdoc.querySelectorAll('#mainNav .nav-scroll > a')];
  const mFull = mrows.filter(a => /width:\s*100%/.test(a.getAttribute('style') || ''));
  ok('mobile: the drawer still gets its nine full-width rows', mrows.length === 9 && mFull.length === 9,
    'rows=' + mrows.length + ' full=' + mFull.length);
  ok('mobile: v243 stayed out of the way', !!m.window.Shivaa.v243 && m.window.Shivaa.v243.cleaned() === 0);
  ok('mobile: the quick-nav bar (nav#mnav) is untouched', !!mdoc.getElementById('mnav'));
  ok('mobile: no page errors', real(m.errors).length === 0, (real(m.errors)[0] || '').slice(0, 160));
  m.window.close();
}

console.log('\n' + pass + ' passed, ' + fail + ' failed' + (skip ? ', ' + skip + ' skipped section' : '') + '\n');
process.exit(fail ? 1 : 0);
