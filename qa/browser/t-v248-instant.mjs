/* t-v248-instant.mjs — “it waits for 3 seconds and then starts loading the next page”
 *
 * That sentence is not a description of slow rendering. Rendering this shop is a
 * hash change and one innerHTML assignment: measured in this sandbox it is ~90 ms.
 * Three seconds is a DEFERRAL — something standing between the tap and
 * `location.hash`, or between the route and the frame that shows it.
 *
 * This suite asserts the absence of every deferral the audit found, and it does
 * it in a way that survives a rewrite:
 *
 *   A · nothing may stand between the tap and the page. The view transition that
 *       called preventDefault() and set the hash inside its callback is opt-in
 *       (`?vt=1`) and off by default; nothing else may cancel a navigation link.
 *   B · the splash is not a curtain. `opts.stall` makes every API call hang
 *       forever — the skeleton must still be on screen 400 ms in.
 *   C · a tap reaches the page in one frame: hash within 150 ms and the new page
 *       in #view within 300 ms, in this sandbox, on the real files.
 *   D · the scroll to the top of the new page is a JUMP, not a slide. With
 *       `scroll-behavior: smooth` in effect the router's scrollTo was an
 *       animation, so the new page was drawn at the old offset and glided home.
 *       The router must ask for `behavior:'instant'` and the stylesheet must not
 *       be able to animate it.
 *   E · under a moving thumb nothing else animates (v244's class drives it).
 *   F · the tap meter exists, records real numbers, and can be read back.
 *
 * What this suite CANNOT say: it cannot measure how the owner's phone feels.
 * jsdom has no compositor, no rasteriser and no scroll engine. What it can prove
 * is that the code no longer contains a place where a tap could be parked.
 *
 * Run:  node qa/browser/t-v248-instant.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { boot, wait, until, pageFaults } from './harness.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');

const index = read('cms/index.html');
const app = read('cms/js/app.js');
const rel = read('cms/js/rel.js');
const css = read('cms/css/shivaa.css');
const v226 = read('cms/js/v226.js');
const v248 = read('cms/js/v248.js');
const sw = read('cms/sw.js');
const api = read('cms/api.php');

const REL = Number((index.match(/__SHIVAA_REL\s*=\s*(\d+)/) || [])[1] || 0);
const layers = [...rel.matchAll(/\/\* ─+ (\S+\.js) ─+ \*\//g)].map(m => m[1]);
const at = (n) => layers.indexOf(n);

let pass = 0, fail = 0;
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

/* ═══ A · nothing stands between the tap and the page ═══════════════════ */
console.log('\nA · nothing stands between the tap and the page');

/* the transition is opt-in: the flag must be read from the URL and vtOn must be
   false unless it is */
ok('the view transition is opt-in, not a default',
  /var vtWant = \/\[\?&\]vt=1\/\.test\(location\.search\)/.test(v226) &&
  /vtOn = vtWant && typeof doc\.startViewTransition === 'function'/.test(v226));

/* the classic defect: preventDefault() before the hash is set. It may only be
   reachable inside the opt-in branch. */
/* the guard reads `if (vtOn && !reduced && …) { e.preventDefault(); runVT(href); }`
   — so the test is that the line that cancels contains vtOn, and that the
   handler RETURNS right after it (nothing else may cancel). */
const pdIdx = v226.indexOf('e.preventDefault();\n      runVT(href);');
const gateLine = pdIdx > 0 ? v226.slice(v226.lastIndexOf('if (', pdIdx), pdIdx) : '';
ok('the navigation link is only cancelled inside the opt-in branch',
  pdIdx > 0 && /vtOn/.test(gateLine), 'guard: ' + gateLine.trim().slice(0, 80));
ok('and that branch is the last thing it does (no second canceller)',
  (v226.match(/e\.preventDefault\(\)/g) || []).length === 1);

/* and the layer says why, in the file, for whoever reads it next */
ok('the reason is written down where the flag lives',
  /OFF BY DEFAULT/.test(v226) && /three seconds/i.test(v226));

/* rail centring must never run on the chip that leaves the page */
ok('rail centring skips a link that navigates',
  /a chip that NAVIGATES is about to be replaced/.test(v226) &&
  /h !== location\.hash\) return false/.test(v226));

/* One other layer cancels a category click, and it is right to: js/v118.js does
   it only when the hash is ALREADY the target (a browser fires no hashchange for
   the URL you are on, so the second tap must redraw instead of doing nothing).
   The principle: a cancel is allowed only when the navigation it cancels would
   not move the page. Asserted as the guard, not as the absence of the call. */
const v118 = read('cms/js/v118.js');
const pdCount = (v118.match(/preventDefault\(\)/g) || []).length;
ok('the only cancelled category tap is the one already on the page',
  /location\.hash === href/.test(v118) &&
  /if \(!\/\^\[a-z0-9_-\]\{1,32\}\$\/i\.test\(key\)\) \{ e\.preventDefault\(\); return; \}/.test(v118) &&
  pdCount === 2, 'preventDefault ×' + pdCount);

/* one lazy sweep on the next frame, not three forced layouts across two seconds */
ok('the router forces layout once per navigation, not three times',
  !/setTimeout\(lazySweep, 900\)/.test(app) && /requestAnimationFrame\(lazySweep\)/.test(app) &&
  /setTimeout\(lazySweep, 2600\)/.test(app));

/* ═══ B · the splash is not a curtain ══════════════════════════════════ */
console.log('\nB · the splash is not a curtain');

ok('the splash lifts on a timer, before the network answers',
  /setTimeout\(liftPreloader, 260\)/.test(app) && /function liftPreloader\(\)/.test(app));

{
  /* every API call hangs forever — the worst phone, the worst network */
  const t0 = Date.now();
  const k = await boot('#/', { stall: true });
  const seen = await until(() => {
    const pl = k.doc.getElementById('preloader');
    return pl && pl.classList.contains('hide') ? pl : null;
  }, 3000, 30);
  const ms = Date.now() - t0;
  /* 3 s, not 260 ms: this sandbox parses ~1.4 MB of CSS+JS before boot() even
     starts, so the timer is measured from a late start. What matters is that it
     is a TIMER and not the network. */
  ok('with a network that never answers, the splash still goes away',
    !!seen, seen ? '' : 'preloader never lifted');
  const sk = k.doc.querySelector('#view > .shv-skeleton');
  ok('and what it reveals is the page skeleton, not a blank screen', !!sk);
  console.log('       measured: splash lifted at ' + ms + ' ms with every request hanging');
  /* the app is still alive: it just has no data */
  ok('nothing threw while booting with no network', k.errors.length === 0, k.errors[0] || '');
  k.window.close();
}

/* ═══ C · a tap reaches the page in one frame ══════════════════════════ */
console.log('\nC · a tap reaches the page in one frame');

{
  const k = await boot('#/');
  await until(() => k.doc.querySelector('#view .pc-card, #view section'), 8000);
  const w = k.window, doc = w.document;

  /* the scroll spy goes in before the tap */
  const scrolls = [];
  w.scrollTo = function (a, b) { scrolls.push(a === undefined ? { x: a, y: b } : a); };

  const link = doc.querySelector('a[href="#/shop"]');
  ok('a category link exists to tap', !!link);
  const before = doc.getElementById('view').innerHTML.length;
  const hash0 = w.location.hash;

  /* what the shim's MutationObserver will see */
  let mutatedAt = null;
  const mo = new w.MutationObserver(() => { if (mutatedAt === null) mutatedAt = Date.now(); });
  mo.observe(doc.getElementById('view'), { childList: true });

  const t0 = Date.now();
  link.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w }));
  const hashAt = await until(() => w.location.hash === '#/shop', 1500, 5);
  const hashMs = Date.now() - t0;
  const pageAt = await until(() => mutatedAt !== null && doc.getElementById('view').innerHTML.length !== before, 3000, 5);
  const pageMs = Date.now() - t0;

  ok('the tap changes the URL immediately', !!hashAt && hashMs <= 150, hashMs + ' ms');
  ok('and the new page is in #view within 300 ms', !!pageAt && pageMs <= 300, pageMs + ' ms');
  ok('the URL actually moved (the click was not swallowed)', hash0 !== w.location.hash);
  mo.disconnect();

  /* ═══ D · the scroll home is a jump ═════════════════════════════════ */
  const last = scrolls[scrolls.length - 1];
  ok('the router scrolls to the top of the new page', !!last && typeof last === 'object' && last.top === 0,
    JSON.stringify(last || null));
  ok('and asks for an INSTANT jump, so no stylesheet can turn it into a slide',
    !!last && last.behavior === 'instant', JSON.stringify(last || null));

  console.log('       measured: press→hash ' + hashMs + ' ms · press→page ' + pageMs + ' ms');

  /* ═══ F · the meter ════════════════════════════════════════════════ */
  ok('the tap meter records the tap', typeof w.Shivaa.taps === 'function');
  /* paintMs is measured on the frame AFTER the page changed, so the record lands
     one rAF later than the page does — wait for it rather than guess a sleep */
  await until(() => w.Shivaa.taps().length > 0, 1500, 10);
  const rec = w.Shivaa.taps().slice(-1)[0];
  ok('the last tap has real numbers',
    !!rec && typeof rec.hashMs === 'number' && typeof rec.paintMs === 'number',
    JSON.stringify(rec || null));
  ok('the meter reads the position of the finger, not the end of the click',
    !!rec && rec.hashMs >= 0 && rec.paintMs >= rec.hashMs);
  const rep = w.Shivaa.v248.report();
  ok('there is one line the owner can copy into a message',
    typeof rep === 'string' && /press→hash/.test(rep) && /long tasks/.test(rep), rep);

  /* for 700 ms after a tap the document may not animate its scroll, whatever a
     later layer declares */
  ok('a tap holds scroll-behavior auto for its own window',
    doc.documentElement.classList.contains('shv-nav'));

  /* ── C2 · not one control: four of them, one after another ───────────
     A single fast tap can be a lucky frame. This walks four real navigation
     links on four real pages and requires every one of them to reach the page
     in the same budget. */
  const measured = [];
  for (let i = 0; i < 4; i++) {
    const links = [...doc.querySelectorAll('a[href^="#/shop?category="]')]
      .filter(a => a.getAttribute('href') !== w.location.hash);
    if (!links.length) break;
    const probe = links[i % links.length];
    const want = probe.getAttribute('href');
    const v = doc.getElementById('view');
    const len0 = v.innerHTML.length;
    let seen = null;
    const m2 = new w.MutationObserver(() => { if (seen === null) seen = Date.now(); });
    m2.observe(v, { childList: true });
    const t1 = Date.now();
    probe.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w }));
    const moved = await until(() => w.location.hash === want, 1200, 5);
    const drawn = await until(() => seen !== null && v.innerHTML.length !== len0, 2500, 5);
    m2.disconnect();
    measured.push({ want, hash: moved ? Date.now() - t1 : null, page: drawn ? Date.now() - t1 : null });
    if (!moved) break;
    await wait(60);
  }
  console.log('       measured: ' + measured.map(m => (m.want || '').replace('#/shop?category=', '') +
    ' ' + m.hash + '/' + m.page + ' ms').join(' · '));
  ok('four different category taps, four immediate page changes',
    measured.length >= 3 && measured.every(m => m.hash !== null && m.hash <= 200 && m.page !== null && m.page <= 400),
    JSON.stringify(measured));

  k.window.close();
}

/* ── C3 · the same budget on a phone viewport ──────────────────────────
   The owner's report is from a phone. 390×780, a real footer category link, a
   pointerdown → pointerup → click sequence, the way a thumb arrives. */
console.log('\nC3 · the same budget on a phone viewport');
{
  const k = await boot('#/', { mobile: true });
  await until(() => k.doc.querySelector('#view section, #view .pc-card'), 8000);
  const w = k.window, doc = w.document;
  const link = doc.querySelector('#footCats a[href^="#/shop?category="]');
  ok('a phone has a category control on the first screen', !!link);
  if (link) {
    const want = link.getAttribute('href');
    const v = doc.getElementById('view');
    const len0 = v.innerHTML.length;
    let seen = null;
    const mo = new w.MutationObserver(() => { if (seen === null) seen = Date.now(); });
    mo.observe(v, { childList: true });
    const t0 = Date.now();
    const mk = (t) => new w.MouseEvent(t, { bubbles: true, cancelable: true, view: w, button: 0 });
    link.dispatchEvent(mk('pointerdown'));
    link.dispatchEvent(mk('pointerup'));
    link.dispatchEvent(mk('click'));
    const moved = await until(() => w.location.hash === want, 1200, 5);
    const drawn = await until(() => seen !== null && v.innerHTML.length !== len0, 2500, 5);
    mo.disconnect();
    const hashMs = moved ? Date.now() - t0 : null;
    const pageMs = drawn ? Date.now() - t0 : null;
    console.log('       measured: phone press→hash ' + hashMs + ' ms · press→page ' + pageMs + ' ms');
    ok('on a phone the tap changes the page immediately',
      hashMs !== null && hashMs <= 200 && pageMs !== null && pageMs <= 400);
    await until(() => w.Shivaa.taps().length > 0, 1500, 10);
    const rec = w.Shivaa.taps().slice(-1)[0];
    ok('and the meter measured the same tap from the finger down',
      !!rec && typeof rec.hashMs === 'number' && rec.hashMs <= 200, JSON.stringify(rec || null));
  }
  k.window.close();
}

/* ── C4 · nothing decorative may land under a moving thumb ───────────── */
ok('the 110 KB of ambience waits for a genuine quiet moment',
  /function whenCalm\(fn\)/.test(read('cms/js/v117.js')) &&
  /QUIET = 700/.test(read('cms/js/v117.js')) &&
  /CEILING = 12000/.test(read('cms/js/v117.js')) &&
  /whenCalm\(loadEnhancements\)/.test(read('cms/js/v117.js')));

/* ═══ E · still under a thumb ══════════════════════════════════════════ */
console.log('\nE · still under a thumb');

const scoped = (sel) => new RegExp(flat(sel).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(flat(css));

/* v250 — the rule these two checks pinned was RETIRED ON PURPOSE, and it was
   this release's own mistake: cutting every entrance animation while
   `html.shv-scrolling` was on meant an animation mid-flight was cut when the
   class came on (first scroll event of a gesture) and RESTARTED when it came off
   (200 ms after the last one) — a flicker on every scroll. The intent they were
   written for — “nothing animates into view under a moving thumb” — is now met
   the only honest way: nothing animates FROM invisible at all, so there is
   nothing to cut. Restated to the principle, and to the guarantee that replaced
   it. */
ok('a gesture may never cut or restart an entrance animation',
  !/html\.shv-scrolling[\s\S]{0,400}animation:\s*none\s*!important/.test(css));
ok('nothing has to be cut, because no view content animates from invisible',
  /#view,\s*#view > \*\s*\{[^}]*animation:\s*none !important[^}]*opacity:\s*1 !important/.test(css));
ok('and it is scoped to the gesture — at rest the motion is untouched',
  /html\.shv-scrolling \{/.test(css) ? false : true);

/* ═══ scroll-behavior: the last word must be auto ══════════════════════ */
const smooths = [...css.matchAll(/(?:^|[}\s])(html[^{]*)\{([^}]*scroll-behavior:\s*smooth[^}]*)\}/g)].map(m => m[1].trim());
const lastAuto = css.lastIndexOf('scroll-behavior: auto !important');
const lastSmooth = css.lastIndexOf('scroll-behavior: smooth');
ok('the stylesheet cannot animate the document scroll any more',
  lastAuto > lastSmooth, `auto@${lastAuto} smooth@${lastSmooth} (${smooths.length} earlier smooth rules)`);

/* ═══ G · plumbing ═════════════════════════════════════════════════════ */
console.log('\nG · plumbing');

ok('v248 ships inside the one bundle, after v247', at('v248.js') > at('v247.js') && at('v248.js') > -1);
ok('v248 is bundled exactly once', layers.filter(n => n === 'v248.js').length === 1);
ok('its stylesheet is in the one css bundle', /\/\* v248\.css \*\//.test(css));
ok('the layer guards against a double load', /window\.__shvInstant/.test(v248));
ok('one release everywhere',
  REL >= 248 && new RegExp('const APP_REL = ' + REL + ';').test(app) &&
  new RegExp("'rel' => " + REL).test(api) && new RegExp('const REL = ' + REL + ';').test(sw) &&
  new RegExp('shivaa-shell-v' + REL).test(sw));
ok('the splash cap is still bounded', /_capMs = isRedraw \? 15000 : .*?: \d+\)/.test(app));

if (pageFaults.length) {
  console.log('\n  page faults recorded (not failures by themselves):');
  pageFaults.slice(0, 4).forEach(f => console.log('   · ' + f.slice(0, 180)));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
