/* t-v209 — "the alive release" acceptance: the owner's five complaints.
   1 flip (tap/click/keys/hint; mid-flight taps queue; card always answers)
   2 film case: mounts 4 films, front marked, drag turns it, self-tour runs
   3 Amrita food offer banners render + selection works (walk the steps)
   4 scroll-flicker file invariants
   5 Passport sign-in sheet opens with its two doors */
import { boot, wait, click } from './harness.mjs';
import fs from 'node:fs';
const log = m => fs.appendFileSync('/tmp/t9step.txt', m + '\n');
fs.writeFileSync('/tmp/t9step.txt', '');

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const realErrs = es => es.filter(e => !/cashfree|Could not load script|getContext|Not implemented|jsdomError: Could not parse CSS/i.test(e));

/* ── 1 · the flip ── */
{ log('S1 flip start');
  const { window, doc, errors } = await boot('#/black-card', {});
  await wait(900);
  const card = doc.querySelector('[data-flip-card]');
  T('flip card exists', !!card);
  if (card) {
    T('card is div[role=button] (never <button>)', card.tagName === 'DIV' && card.getAttribute('role') === 'button');
    click(window, card); await wait(1200);
    T('click flips', card.classList.contains('is-flipped'));
    click(window, card); await wait(1200);
    T('second click flips back', !card.classList.contains('is-flipped'));
    /* touch tap (mobile) */
    const tap = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    card.dispatchEvent(tap); await wait(1200);
    T('tap (touch click) flips', card.classList.contains('is-flipped'));
    /* keyboard (after the flight has landed) */
    card.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await wait(1200);
    T('Enter flips', !card.classList.contains('is-flipped'));
    /* hint button */
    const hint = doc.querySelector('[data-flip-hint]');
    T('tap-hint exists', !!hint);
    if (hint) { click(window, hint); await wait(1200); T('hint flips the card', card.classList.contains('is-flipped')); }
    /* double-tap inside the 0.62s flight: second tap ignored (industry
       standard — no zigzag), the card still answers right after landing */
    const before = card.classList.contains('is-flipped');
    card.dispatchEvent(tap); card.dispatchEvent(tap);
    await wait(1400);
    T('mid-flight tap ignored — one clean flight', card.classList.contains('is-flipped') !== before);
    /* still responsive afterwards */
    card.dispatchEvent(tap); await wait(1200);
    T('tap after double-tap still works', card.classList.contains('is-flipped') === before);
    T('no real page errors during flip', realErrs(errors).length === 0, String(realErrs(errors)[0] || '').slice(0, 90));
  }
  log('S1 flip done');
}

/* ── 2 · the film case ── */
{ log('S2 case start');
  const { window, doc } = await boot('#/', {});
  await wait(1400);
  const mount = doc.getElementById('svCaseMount');
  T('case mounts', !!mount && mount.dataset.mnt === '1', mount ? 'mnt=' + mount.dataset.mnt : 'missing');
  const cards = doc.querySelectorAll('.sv-case-card');
  T('four film cards', cards.length === 4, String(cards.length));
  const vids = doc.querySelectorAll('.sv-case-card video');
  T('four videos embedded', vids.length === 4, String(vids.length));
  const v0 = vids[0];
  if (v0) {
    T('videos muted+loop+playsinline (autoplay-safe)',
      v0.muted && v0.loop && v0.hasAttribute('playsinline'));
  }
  T('front card is marked', !!doc.querySelector('.sv-case-card.is-front'));
  T('counter shows a film', /0[1-4]\s*\/\s*04|UNBOXING|BLESSING|MUSE|WEARING/i.test((doc.getElementById('svCaseCount') || {}).textContent || ''));
  /* drag the case */
  const stage = doc.getElementById('svCaseStage');
  if (stage) {
    const before = stage.querySelector('#svCaseRing').style.transform;
    stage.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 300, pointerId: 1 }));
    for (let x = 300; x >= 200; x -= 25) {
      stage.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: x, pointerId: 1 }));
    }
    stage.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 200, pointerId: 1 }));
    await wait(300);
    const after = doc.getElementById('svCaseRing').style.transform;
    T('drag turns the ring', !!after && after !== before, String(after).slice(0, 30));
    /* arrows */
    const nxt = doc.getElementById('svCaseNext');
    if (nxt) {
      const mid = doc.getElementById('svCaseRing').style.transform;
      click(window, nxt); await wait(350);
      T('arrow spins the ring', doc.getElementById('svCaseRing').style.transform !== mid);
    }
    /* give the auto-tour one tick */
    const toured = doc.getElementById('svCaseRing').style.transform;
    await wait(7600);
    T('self-tour turns on its own', doc.getElementById('svCaseRing').style.transform !== toured);
  }
  log('S2 case done');
}

/* ── 3 · food offer banners (Amrita) ── */
{ log('S3 amrita start');
  const { window, doc } = await boot('#/amrita', {});
  await wait(900);
  T('amrita page opens', !!(doc.getElementById('amRoot') || doc.querySelector('.am-card')));
  /* walk: rate 5 stars → "See what is next" → the menu of dishes */
  const stars = doc.querySelectorAll('.am-star');
  if (stars.length >= 5) { click(window, stars[4]); await wait(950); }  /* amrita advances at +620ms */
  const next1 = [...doc.querySelectorAll('button')].find(b => /See what is next|There is more/i.test(b.textContent));
  if (next1) { click(window, next1); await wait(300); }
  const dishes = doc.querySelectorAll('.am-dish');
  T('three food banners render', dishes.length === 3, String(dishes.length));
  T('banners carry the food photos', !!doc.querySelector('.am-dish-art img'));
  if (dishes[1]) {
    click(window, dishes[1]); await wait(150);
    T('picking a dish marks it', dishes[1].classList.contains('on') || !!doc.querySelector('.am-dish.on'));
    T('confirm button enables', !(doc.getElementById('amMenuGo') || {}).disabled);
  }
  log('S3 amrita done');
}

/* ── 4 · flicker file invariants ── */
{ log('S4 invariants');
  const css = fs.readFileSync('cms/css/v209.css', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  T('v209 strips header backdrop-filter', /backdrop-filter:\s*none/.test(css));
  T('v209 neutralises v208 parallax layers', /shv-hcc-art img, \.c-slide \.c-body\s*\{[^}]*transform:\s*none/s.test(css));
  T('parallax scroll-writer removed from app.js', !/--v208-ty/.test(app));
  T('no live filter on .bc-card in v209', !/\.bc-card\s*\{[^}]*filter:\s*(?!none)/s.test(css));
  T('is-lit filter neutralised', /is-lit\s*\{\s*filter:\s*none/s.test(css));
  log('S4 done');
}

/* ── 5 · the Passport sheet ── */
{ log('S5 passport start');
  const { window, doc } = await boot('#/', {});
  await wait(700);
  if (window.Shivaa && window.Shivaa.openLogin) window.Shivaa.openLogin();
  else window.location.hash = '#/login';
  await wait(700);
  const wrap = doc.getElementById('shvAuthWrap');
  T('Passport sheet opens', !!wrap && !wrap.hidden);
  const doors = doc.querySelectorAll('.shv-aud-btn');
  T('two audience doors', doors.length === 2, String(doors.length));
  const phone = doc.getElementById('shvPhoneIn');
  T('mobile field present', !!phone);
  const cta = doc.querySelector('.shv-cta');
  T('gold CTA present', !!cta);
  log('S5 done');
}

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
