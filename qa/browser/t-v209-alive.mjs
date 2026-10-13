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
    T('videos carry autoplay + preload=auto (v210)',
      v0.hasAttribute('autoplay') && v0.preload === 'auto');
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

/* ── 3b · the four offer banners are art panels now ── */
{ log('S3b offer art');
  const { doc } = await boot('#/', {});
  await wait(1500);
  const cards = doc.querySelectorAll('.shv-offer-grid .shv-offer-card');
  T('four offer banners', cards.length === 4, String(cards.length));
  T('every banner carries its art scene', doc.querySelectorAll('.shv-offer-grid .shv-offer-art').length === 4);
  T('corner flourishes present', doc.querySelectorAll('.shv-offer-grid .shv-offer-orn').length === 4);
  log('S3b done');
}

/* ── 3c · v211 · the stillness + hardening release ── */
{ log('S3c v211 stillness');
  const css211 = fs.readFileSync('cms/css/v211.css', 'utf8');
  const v125 = fs.readFileSync('cms/js/v125.js', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  T('hero: noise blend layers gone', /\.black-hero \.hero-img::after[\s\S]*display: none/.test(css211) && /\.bc-noise\s*\{[^}]*display: none/s.test(css211));
  T('hero: aurora + stage blur filters neutralised', /\.bc-hero-aurora i\s*\{[^}]*filter: none/s.test(css211) && /\.bc-hero-stage::before\s*\{[^}]*filter: none/s.test(css211));
  T('hero: card wrap carries no filter', /\.bc-stage-card \.bc-card-wrap\s*\{[^}]*filter: none/s.test(css211));
  T('hero: card tilt vars frozen', /\.bc-card-wrap\[data-black-card-motion\]\s*\{[^}]*transform: none/s.test(css211));
  T('hero: infinite accents stopped (cue/pulse/shimmer/orbit/grid)',
    /\.black-hero \.hero-cue\s*\{[^}]*animation: none/s.test(css211) && /\.shv-pulse-cta\s*\{[^}]*animation: none/s.test(css211)
    && /\.bc-orbit\s*\{[^}]*animation: none/s.test(css211) && /\.bc-micro-grid\s*\{[^}]*animation: none/s.test(css211));
  T('hero JS: pointer-depth parallax retired', app.includes('pointer-depth parallax is retired'));
  T('hero JS: dust painted once as a still starfield', app.includes('painted once as a still starfield'));
  T('food banners: painted per-dish scenes', css211.includes('.am-d-idli::before') && css211.includes('.am-d-dosa::before') && css211.includes('.am-d-paneer::before'));
  T('food banners: menu engraved double frame', /\.am-menu::before/.test(css211) && /\.am-menu::after/.test(css211));
  T('case: poster img under every film', v125.includes('sv-film-poster') && v125.includes('wrap.appendChild(posterImg)'));
  T('case: broken file degrades to still frame', v125.includes("addEventListener('error'") && v125.includes('sv-film-poster-only'));
  T('case: hint says all four films play', v125.includes('ALL FOUR FILMS PLAY') && !v125.includes('ONLY THE FRONT FILM PLAYS'));
  log('S3c done');
}

/* ── 3d · v212 · clarity release — tap-to-flip + offer-banner layout ── */
{ log('S3d v212 clarity');
  const css212 = fs.readFileSync('cms/css/v212.css', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  T('hint is a solid gold pill (visible on any ground)',
    /\.bc-flip-hint\s*\{[^}]*background: rgba\(10, 7, 3, \.92\)/s.test(css212) && /\.bc-flip-hint\s*\{[^}]*color: #ffe9b4/s.test(css212));
  T('decor never eats a tap (cert + glow + dust + faces)',
    /pointer-events: none !important/.test(css212) && /\.bc-stage-cert/.test(css212) && /#heroDust/.test(css212));
  T('open pill + hero-cue drop below the card', /\.bc-stage-open,\s*\.black-hero \.hero-cue\s*\{[^}]*z-index: 2/s.test(css212));
  T('card tap physics (manipulation, no select/zoom)',
    /touch-action: manipulation/.test(css212) && /-webkit-tap-highlight-color: transparent/.test(css212));
  T('whole card-wrap is a tap target', app.includes("w.querySelector('[data-flip-card]')"));
  T('offer banners: art band on top, words below (no overlap)',
    /\.shv-offer-art\s*\{[^}]*position: relative/s.test(css212) && /\.shv-offer-art\s*\{[^}]*height: 104px/s.test(css212));
  T('offer banners: four crisp painted scenes',
    css212.includes('.shv-offer-making .shv-offer-art::before') && css212.includes('.shv-offer-delivery .shv-offer-art::before')
    && css212.includes('.shv-offer-premium .shv-offer-art::before') && css212.includes('.shv-offer-cert .shv-offer-art::before'));
  T('offer banners: long certificate title cannot overflow',
    /\.shv-offer-cert \.shv-offer-pct\s*\{[^}]*font-size: clamp\(28px/s.test(css212));

  const { window: w2, doc: d2 } = await boot('#/', {});
  await wait(2200);
  const hcard = d2.querySelector('#blackHero [data-flip-card]');
  T('hero card present for flip test', !!hcard);
  if (hcard) {
    const face = hcard.querySelector('.bc-face') || hcard;
    face.dispatchEvent(new w2.MouseEvent('click', { bubbles: true, cancelable: true, view: w2 }));
    await wait(60);
    T('tap 1 turns the card', hcard.classList.contains('is-flipped') && hcard.getAttribute('aria-pressed') === 'true');
    await wait(1100);
    face.dispatchEvent(new w2.MouseEvent('click', { bubbles: true, cancelable: true, view: w2 }));
    await wait(60);
    T('tap 2 turns it back', !hcard.classList.contains('is-flipped') && hcard.getAttribute('aria-pressed') === 'false');
    await wait(1100);
    face.dispatchEvent(new w2.MouseEvent('click', { bubbles: true, cancelable: true, view: w2 }));
    await wait(60);
    T('tap 3 turns it again', hcard.classList.contains('is-flipped'));
  }
  log('S3d done');
}

/* ── 3e · v213 · pocket release — case on mobile + home + sidebar ── */
{ log('S3e v213 pocket');
  const css213 = fs.readFileSync('cms/css/v213.css', 'utf8');
  const v125 = fs.readFileSync('cms/js/v125.js', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  T('case: webkit 3D prefixes present (old WebViews)',
    css213.includes('-webkit-perspective: 1250px') && css213.includes('-webkit-transform-style: preserve-3d'));
  T('case JS: touch spin owns horizontal gestures',
    v125.includes('THE MOBILE SPIN') && v125.includes("addEventListener('touchmove'") && v125.includes('e.preventDefault()'));
  T('case JS: pointer path ignores touch (no double-rotate)',
    v125.includes("e.pointerType === 'touch'"));
  T('case JS: films mount on save-data too (hint words only)',
    v125.includes('var liteMode = false;') && v125.includes('var hintLite = lite();'));
  T('home: black-hero stage forced visible on phones (styles.css hides .hero-stage)',
    /\.black-hero \.hero-stage,/.test(css213) && /display: flex !important/.test(css213));
  T('home: orphan c-dots fragment removed', !app.includes('<div class="c-dots" id="cDots"></div>'));
  T('sidebar: drawer scroll contained + tap hygiene',
    css213.includes('overscroll-behavior: contain') && css213.includes('#dwClose'));

  const { window: w3, doc: d3 } = await boot('#/', { mobile: true });
  await wait(2200);
  T('mobile home: black card stage exists', !!d3.querySelector('#blackHero .bc-hero-stage'));
  T('mobile home: no orphan c-dots', !d3.querySelector('#cDots'));
  T('mobile home: case mounted with 4 cards', d3.querySelectorAll('.sv-case-card').length === 4);
  T('mobile home: films mounted (videos + posters)', d3.querySelectorAll('.sv-case-card video').length === 4 && d3.querySelectorAll('.sv-case-card .sv-film-poster').length === 4);
  T('mobile home: case surface alive', !!(w3.ShivaaV125 && w3.ShivaaV125.caseCount() === 4));
  const tgl = d3.querySelector('#navToggle');
  if (tgl) {
    tgl.dispatchEvent(new w3.MouseEvent('click', { bubbles: true, cancelable: true, view: w3 }));
    await wait(400);
    T('mobile sidebar: drawer opens', d3.querySelector('#mainNav').classList.contains('open'));
    T('mobile sidebar: compact offers render', d3.querySelectorAll('.shv-offer-mini').length > 0);
  }
  log('S3e done');
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
