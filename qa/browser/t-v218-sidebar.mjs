/* t-v218 — the sidebar (drawer) and the funnel scroll, in jsdom.
   Sidebar: toggle opens; link, scrim, close button and Escape each close it;
   a left swipe closes it; an up/down gesture does not. Funnel: stepping through
   the 10 g scheme never calls window.scrollTo(top:0) by itself. */
import { boot, wait, click } from './harness.mjs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));

const { window: w, doc: d } = await boot('#/', { mobile: true });
await wait(1500);

const tgl = d.querySelector('#navToggle');
const nav = d.querySelector('#mainNav');
const scrim = d.querySelector('#drawerScrim');
const dwClose = d.querySelector('#dwClose');
const mouse = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w }));
const isOpen = () => nav.classList.contains('open');
const openDrawer = async () => { if (!isOpen()) { mouse(tgl); await wait(120); } };

T('sidebar: toggle, nav, scrim and close button exist', !!(tgl && nav && scrim && dwClose));

// open via the hamburger
await openDrawer();
T('sidebar: hamburger opens the menu', isOpen());
T('sidebar: scrim shown + body locked', scrim.classList.contains('on') && d.body.classList.contains('drawer-open'));
T('sidebar: aria-expanded true', tgl.getAttribute('aria-expanded') === 'true');

// hamburger toggles closed
mouse(tgl); await wait(120);
T('sidebar: hamburger closes the menu again', !isOpen() && !scrim.classList.contains('on'));

// close button
await openDrawer(); mouse(dwClose); await wait(120);
T('sidebar: close button closes', !isOpen());

// scrim
await openDrawer(); mouse(scrim); await wait(120);
T('sidebar: tapping the scrim closes', !isOpen());

// Escape
await openDrawer(); w.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(120);
T('sidebar: Escape closes', !isOpen());

// a link closes it (drawer link to another route)
await openDrawer();
const link = [...nav.querySelectorAll('a[href^="#/"]')].find(a => a.getAttribute('href') !== (w.location.hash || '#/'));
if (link) link.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, view: w }));
await wait(500);
T('sidebar: choosing a link closes it', !!link && !isOpen());

// swipe left closes
const gesture = (el, type, x, y) => {
  const t = { clientX: x, clientY: y, target: el };
  const ev = new w.Event(type, { bubbles: true, cancelable: true });
  ev.touches = type === 'touchend' ? [] : [t];
  ev.changedTouches = [t];
  el.dispatchEvent(ev);
};
await openDrawer();
gesture(nav, 'touchstart', 220, 300); gesture(nav, 'touchend', 90, 306);
await wait(60);
T('sidebar: swipe left closes', !isOpen());

// an up/down scroll inside the menu must not close it
await openDrawer();
gesture(nav, 'touchstart', 200, 300); gesture(nav, 'touchend', 190, 520);
await wait(60);
T('sidebar: vertical scroll gesture keeps it open', isOpen());
mouse(scrim); await wait(120);

// ── funnel: no scroll-to-top when a step renders ──
const { window: w2, doc: d2 } = await boot('#/scheme', { mobile: false });
await wait(1500);
const calls = [];
w2.scrollTo = (...a) => { calls.push(a[0] && typeof a[0] === 'object' ? a[0] : { args: a }); };
const stepBtn = d2.querySelector('.shv-step-btn[data-step]');
if (stepBtn) { click(w2, stepBtn); await wait(400); }
const topZero = calls.filter(c => c && c.top === 0);
T('funnel: stepping does not scroll the page to top', topZero.length === 0, JSON.stringify(calls).slice(0, 120));
T('funnel: a step control exists to test', !!stepBtn);

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
