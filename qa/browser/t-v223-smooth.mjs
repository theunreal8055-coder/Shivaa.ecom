/* t-v223 — "the smooth release": the home page must not pull media the reader
   has not reached, and must not keep decoding what they have scrolled past.

   The v210 release autoplayed every film, which meant every mounted <video>
   set preload=auto AND its src at mount. Five thread films is ~4.5 MB, all of
   it requested the moment the home page rendered, before the shopper had
   scrolled anywhere near the films — and each one kept decoding off-screen
   frames while they scrolled. That was the remaining hitching.

   This suite proves the new behaviour from both sides:
     1 · with observers silent (nothing on screen yet) NOT ONE film has a src —
         so a fresh home page requests zero video bytes;
     2 · with observers live, the films still load and still play.
   It also locks the safeguards the earlier releases added around them. */
import fs from 'node:fs';
import { boot, wait, click } from './harness.mjs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));

const v125 = fs.readFileSync('cms/js/v125.js', 'utf8');
const index = fs.readFileSync('cms/index.html', 'utf8');
const sw = fs.readFileSync('cms/sw.js', 'utf8');
const app = fs.readFileSync('cms/js/app.js', 'utf8');
const api = fs.readFileSync('cms/api.php', 'utf8');

/* ── 1 · nothing is eager any more ─────────────────────────────────── */
T('v125: the film starts with preload=none', /v\.preload = 'none'/.test(v125));
T('v125: the film is NOT given autoplay at mount', !/v\.autoplay = true/.test(v125));
T('v125: no autoplay attribute is set on the film',
  !/v\.setAttribute\('autoplay'/.test(v125));
T('v125: the file is requested only from wake()',
  /function wake\(\)[\s\S]{0,160}?v\.src = fl\.f/.test(v125),
  /function wake\(\)[\s\S]{0,160}?v\.src = fl\.f/.test(v125) ? '' : 'src is not inside wake()');
T('v125: wake() is idempotent (never re-requests a loaded film)',
  /function wake\(\) \{\s*\n\s*if \(v\.getAttribute\('src'\)\) return;/.test(v125));

/* ── 2 · the buffer is handed back past the films ──────────────────── */
T('v125: there is a release path', /function rest\(\)/.test(v125));
T('v125: release drops the src and resets the element',
  /removeAttribute\('src'\)[\s\S]{0,80}?v\.load\(\)/.test(v125));
T('v125: release also clears the "visible" flag it feeds resumeVisibleFilms',
  /function rest\(\)[\s\S]{0,200}?dataset\.svVis = '0'/.test(v125));
T('v125: a released film is not mistaken for a broken film',
  /addEventListener\('error', function \(\) \{\s*\n\s*if \(!v\.getAttribute\('src'\)\) return;/.test(v125));

/* ── 3 · the observer does all three jobs ──────────────────────────── */
T('v125: the observer span is widened so approach starts the download',
  /rootMargin: '1200px 0px 1200px 0px'/.test(v125));
T('v125: on screen → wake + play', /if \(shown\) \{[\s\S]{0,200}?wake\(\)/.test(v125));
T('v125: near → stop playing but keep the buffer', /else if \(e\.isIntersecting\) \{\s*\n\s*shut\(v\);/.test(v125));
T('v125: far → release', /else \{\s*\n\s*rest\(\);/.test(v125));
T('v125: reduced motion never fetches a film at all',
  /if \(!REDUCED\) wake\(\)/.test(v125));

/* ── 4 · everything the earlier releases added still stands ────────── */
T('v211: the poster img is still under every film',
  v125.includes('sv-film-poster') && v125.includes('wrap.appendChild(posterImg)'));
T('v211: a broken file still degrades to the still frame',
  v125.includes('sv-film-poster-only') && v125.includes("addEventListener('error'"));
T('v213: the films still run on phones (no save-data gating of the mount)',
  !/if \(lite\(\)\) \{ return wrap/.test(v125));
T('v221: the dead case code has not come back',
  !/mountCase|caseApi|sv-case-card/.test(v125));
T('v221: the thread badge class is still the live one', v125.includes('class="sv-case-no"'));
T('v191/v11x: playsinline is still set (iOS must not go fullscreen)',
  v125.includes("setAttribute('playsinline'") && v125.includes("setAttribute('webkit-playsinline'"));

/* ── 5 · other smoothness guards this release checked and locks ────── */
T('layout: product card images still reserve their space (no shift on load)',
  /\.pc-imgwrap\s*\{[^}]*aspect-ratio/.test(fs.readFileSync('cms/css/shivaa.css', 'utf8')));

/* A scroll/wheel/touch listener without `passive: true` makes the browser stop
   and wait for our JS before it is allowed to scroll — the single biggest cause
   of "smooth on the desktop, steppy on a phone". v223 audited every one of them
   and found only ONE that is legitimately blocking: the product gallery's
   horizontal drag, which must call preventDefault() to stop the page panning
   while a shopper drags the photos sideways. This test parses each listener
   properly (balanced parens, comments stripped) so a future release cannot slip
   a blocking listener in unnoticed. */
function blockingListeners(src, file) {
  // strip comments first — a paren inside a comment breaks naive matching
  const s = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
                 .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1 ');
  const out = [];
  const re = /addEventListener\(\s*'(scroll|wheel|touchmove|touchstart)'/g;
  let m;
  while ((m = re.exec(s))) {
    const open = s.indexOf('(', m.index + 'addEventListener'.length);
    let depth = 0, i = open, end = -1;
    while (i < s.length) {
      const c = s[i];
      if (c === '"' || c === "'") { const q = c; i++; while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; } }
      else if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) { end = i; break; } }
      i++;
    }
    if (end < 0) continue;
    const call = s.slice(m.index, end + 1);
    if (!/passive:\s*true/.test(call)) {
      out.push({ file, event: m[1], blocking: /passive:\s*false/.test(call),
                 line: s.slice(0, m.index).split('\n').length, text: call.slice(0, 90) });
    }
  }
  return out;
}

const SHIPPED_JS = ['otp-autofill', 'app', 'hallmark', 'trust', 'auth', 'v219', 'v107',
  'v116', 'v117', 'v118', 'v119', 'v120', 'v122', 'v125', 'v127', 'v139', 'v140',
  'v166', 'v167', 'v178', 'v194', 'motion', 'aurum', 'boost'];
const blocking = SHIPPED_JS.flatMap(f =>
  blockingListeners(fs.readFileSync('cms/js/' + f + '.js', 'utf8'), f + '.js'));

T('scroll: every listener is passive except the deliberate gallery drag',
  blocking.length === 1 && blocking[0].file === 'app.js' && blocking[0].event === 'touchmove'
  && blocking[0].blocking && /onMove/.test(blocking[0].text),
  blocking.map(b => `${b.file}:${b.line}(${b.event})`).join(', ') || 'none found');
T('stamps: index at 224', index.includes('__SHIVAA_REL=224') && !index.includes('?v=223'));
T('stamps: sw.js shell v224', sw.includes('shivaa-shell-v224') && sw.includes('const REL = 224;'));
T('stamps: app.js APP_REL 224', app.includes('const APP_REL = 224;'));
T('stamps: api rel 224', api.includes("'rel' => 224,"));

/* ── 6 · proof 1: with nothing on screen, ZERO video bytes are asked for ── */
{
  const { doc } = await boot('#/', { noObservers: true });
  await wait(2200);
  const films = doc.querySelectorAll('.sv-thread-film');
  const vids = [...doc.querySelectorAll('.sv-thread-film video')];
  T('quiet home: the films are mounted', films.length === 5, String(films.length));
  T('quiet home: every film has a poster to show instead',
    doc.querySelectorAll('.sv-thread-film .sv-film-poster').length === films.length,
    doc.querySelectorAll('.sv-thread-film .sv-film-poster').length + '/' + films.length);
  T('quiet home: NOT ONE film has requested its file',
    vids.length > 0 && vids.every(v => !v.getAttribute('src')),
    vids.filter(v => v.getAttribute('src')).length + ' of ' + vids.length + ' had a src');
  T('quiet home: no film is set to preload=auto',
    vids.every(v => v.getAttribute('preload') !== 'auto'));
  T('quiet home: no film carries autoplay',
    vids.every(v => !v.hasAttribute('autoplay') && v.autoplay !== true));
}

/* ── 7 · proof 3: the page does not grow while it sits idle ────────── */
{
  const { doc } = await boot('#/', {});
  await wait(2500);
  const a = doc.getElementsByTagName('*').length;
  await wait(4000);
  const b = doc.getElementsByTagName('*').length;
  T('idle: the DOM stops growing (no leak, no re-render loop)',
    Math.abs(b - a) <= 60, a + ' → ' + b);
  T('idle: the home page stays a sane size', b < 3500, String(b));
}

/* ── 8 · proof 2: with observers live, the films still work ────────── */
{
  const { window, doc, errors } = await boot('#/', {});
  await wait(2500);
  const vids = [...doc.querySelectorAll('.sv-thread-film video')];
  T('normal home: the films still mount', vids.length === 5, String(vids.length));
  T('normal home: an on-screen film does request its file',
    vids.some(v => !!v.getAttribute('src')),
    vids.filter(v => v.getAttribute('src')).length + ' of ' + vids.length + ' attached');
  T('normal home: the thread still shows all five FILM badges',
    doc.querySelectorAll('.sv-thread-film .sv-case-no').length === 5);

  const film = doc.querySelector('.sv-thread-film');
  let opened = false, closed = false;
  if (film) {
    click(window, film);
    await wait(700);
    opened = !!(window.ShivaaV125 && window.ShivaaV125.isOpen());
    if (window.ShivaaV125) window.ShivaaV125.close();
    await wait(300);
    closed = !(window.ShivaaV125 && window.ShivaaV125.isOpen());
  }
  T('normal home: the reel still opens from a film', opened);
  T('normal home: the reel still closes', closed);

  const realErrs = errors.filter(e =>
    !/cashfree|Could not load script|getContext|Not implemented|jsdomError: Could not parse CSS|Client network socket disconnected/i.test(e));
  T('normal home: no real page errors', realErrs.length === 0,
    String(realErrs[0] || '').slice(0, 110));
}

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
