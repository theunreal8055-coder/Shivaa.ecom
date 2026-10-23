/* t-v221 — the clean-up release: the dead revolving-case code is removed from
   v125.js and from every stylesheet layer, and NOTHING live goes with it.

   The one thing that must survive: the gold thread's markup reuses
   `class="sv-case-no"` for its FILM badge, so bare `.sv-case-no` is a LIVE
   selector. `.sv-case-card .sv-case-no` (dead ancestor) is not.

   Static checks read the shipped files; one jsdom boot proves the thread still
   mounts, still carries its badges, and still opens the reel. */
import fs from 'node:fs';
import { boot, wait, click } from './harness.mjs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));

const v125 = fs.readFileSync('cms/js/v125.js', 'utf8');
const index = fs.readFileSync('cms/index.html', 'utf8');
const sw = fs.readFileSync('cms/sw.js', 'utf8');
const app = fs.readFileSync('cms/js/app.js', 'utf8');
const CSS_BUNDLE_V221 = fs.readFileSync('cms/css/shivaa.css', 'utf8');
const api = fs.readFileSync('cms/api.php', 'utf8');

/* the stylesheets this release edited */
const TOUCHED = ['v125', 'v196', 'v200', 'v207', 'v208', 'v209', 'v210',
                 'v211', 'v213', 'v214', 'v215'];
const CSS = {};
for (const f of TOUCHED) CSS[f] = fs.readFileSync('cms/css/' + f + '.css', 'utf8');
const ALL_CSS = Object.entries(CSS);

/* every case class that can no longer exist in the DOM */
const DEAD = /sv-case-(card|stage|arrow|thumb|ring|rail|glow|hint|ui|head|name|count)/;

/* ── 1 · the dead JavaScript is gone ─────────────────────────────── */
T('v125: the dead case mount routine is gone', !v125.includes('mountCase'));
T('v125: the case runtime scaffolding is gone',
  !/caseApi|casePlaces|caseResizeBound/.test(v125));
T('v125: no dead case element class is referenced anywhere',
  !DEAD.test(v125));
T('v125: the dead case members left the test surface',
  !/caseNext|caseFront|caseCount|openCase/.test(v125));

/* ── 2 · everything live in v125.js survives ─────────────────────── */
T('v125: CASE_FILMS kept — it is still the reel\'s default list',
  v125.includes('CASE_FILMS') && /reel\.list\s*=\s*list\s*\|\|\s*CASE_FILMS/.test(v125));
T('v125: filmMedia poster + broken-file fallback kept',
  v125.includes('sv-film-poster') && v125.includes('wrap.appendChild(posterImg)')
  && v125.includes('sv-film-poster-only'));
T('v125: the gold thread still mounts itself',
  v125.includes('function mountThread') && v125.includes('svThreadMount'));
T('v125: the thread still carries its .sv-case-no FILM badge (LIVE class)',
  v125.includes('class="sv-case-no"'));
T('v125: the surviving test surface is intact',
  ['open', 'close', 'isOpen', 'threadFilms', 'openThread', 'lite'].every(k => v125.includes(k + ':')));

/* ── 3 · the dead CSS is gone, the live selector is not ──────────── */
const stillDead = ALL_CSS.filter(([, css]) => DEAD.test(css)).map(([f]) => f);
T('css: no dead case rule is left in any edited stylesheet',
  stillDead.length === 0, stillDead.join(','));

T('css: the bare .sv-case-no rule survives in v125.css (thread badge)',
  /\.sv-case-no\s*\{/.test(CSS.v125));
T('css: the bare .sv-case-no rule survives in v209.css (thread badge)',
  /\.sv-case-no\s*\{/.test(CSS.v209));

const unbalanced = ALL_CSS.filter(([, css]) => {
  const o = (css.match(/\{/g) || []).length, c = (css.match(/\}/g) || []).length;
  return o !== c || o === 0;
}).map(([f]) => f);
T('css: every edited stylesheet still has balanced braces',
  unbalanced.length === 0, unbalanced.join(','));

const emptyMedia = ALL_CSS.filter(([, css]) => /@media[^{]*\{\s*\}/.test(css)).map(([f]) => f);
T('css: no empty @media block was left behind',
  emptyMedia.length === 0, emptyMedia.join(','));

/* the four shared selector lists: the live half must still be there */
T('css: shared film rule keeps its live selectors (v196)',
  /\.sv-thread video\s*,\s*\.sv-thread-item video\s*,\s*\.sv-film video\s*\{/.test(CSS.v196));
T('css: film-caption colour still applies to the thread (v200)',
  /\.sv-thread-film\s*\{[^}]*#fff8ea/.test(CSS.v200));
T('css: the shared carousel-arrow rule keeps .cb-wrap .cb-arrow (v208)',
  /\.cb-wrap \.cb-arrow\s*\{/.test(CSS.v208));
T('css: the film stacking rule keeps its thread selector (v211)',
  /\.sv-thread-film \.sv-film-wrap video\s*\{/.test(CSS.v211));

/* the stillness rules the alive suite depends on must be untouched */
T('css: v215 keeps the load/flicker guards the alive suite asserts',
  CSS.v215.includes('#view footer') && /content-visibility: ?auto/.test(CSS.v215)
  && /filter: ?none/.test(CSS.v215));
T('css: v209 keeps the header/flicker guards',
  /backdrop-filter:\s*none/.test(CSS.v209) && /is-lit\s*\{\s*filter:\s*none/s.test(CSS.v209));

/* ── 4 · the release stamps ──────────────────────────────────────── */
T('stamps: index at 227 with no older stamp left',
  index.includes('__SHIVAA_REL=236') && !index.includes('?v=226'));
T('stamps: sw.js shell v226', sw.includes('shivaa-shell-v236') && sw.includes('const REL = 236;'));
T('stamps: app.js APP_REL 227', app.includes('const APP_REL = 236;'));
T('stamps: api rel 227', api.includes("'rel' => 236,"));
/* v222 bundled the stylesheets, so the SW precaches the bundle rather than
   v125.css. The v125 CSS itself still has to be inside that bundle. */
T('stamps: sw precaches the bundle and the v125 script at 224',
  sw.includes('/css/shivaa.css?v=236') && sw.includes('/js/v125.js?v=236'));
T('v221: the v125 layer is inside the bundle', CSS_BUNDLE_V221.includes('/* v125.css */'));

/* ── 5 · jsdom: the live page still behaves ─────────────────────── */
const { window, doc, errors } = await boot('#/', { mobile: false });
await wait(2200);

T('dom: the case is absent (no mount, no cards, no thumbs)',
  !doc.getElementById('svCaseMount') && !doc.querySelector('.sv-case-card')
  && !doc.querySelector('.sv-case-thumb'));
T('dom: the gold thread renders', !!doc.querySelector('.sv-thread'));

const films = doc.querySelectorAll('.sv-thread-film');
T('dom: every thread film renders', films.length === 5, String(films.length));
T('dom: every thread film keeps its FILM badge',
  doc.querySelectorAll('.sv-thread-film .sv-case-no').length === films.length,
  doc.querySelectorAll('.sv-thread-film .sv-case-no').length + '/' + films.length);
T('dom: every thread film keeps its poster image',
  doc.querySelectorAll('.sv-thread-film .sv-film-poster').length === films.length,
  doc.querySelectorAll('.sv-thread-film .sv-film-poster').length + '/' + films.length);

/* the reel must still open from a thread film and close again */
let opened = false, closed = false;
if (films[0]) {
  click(window, films[0]);
  await wait(700);
  opened = !!(window.ShivaaV125 && window.ShivaaV125.isOpen());
  if (window.ShivaaV125) window.ShivaaV125.close();
  await wait(300);
  closed = !(window.ShivaaV125 && window.ShivaaV125.isOpen());
}
T('dom: the reel still opens from a thread film', opened);
T('dom: the reel still closes', closed);

const realErrs = errors.filter(e =>
  !/cashfree|Could not load script|getContext|Not implemented|jsdomError: Could not parse CSS|Client network socket disconnected/i.test(e));
T('dom: no real page errors on the home page', realErrs.length === 0,
  String(realErrs[0] || '').slice(0, 110));

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
