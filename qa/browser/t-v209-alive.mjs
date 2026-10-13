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

/* ── 1 · the card (v214: the flip feature is REMOVED) ── */
{ log('S1 card no-flip start');
  const { window, doc, errors } = await boot('#/black-card', {});
  await wait(400);
  const card = doc.querySelector('.bc-card');
  T('card exists as a display object', !!card && card.className.includes('bc-card'));
  T('flip affordances are gone (no data-flip-card / role=button)',
    !doc.querySelector('[data-flip-card]') && (!card || card.getAttribute('role') !== 'button'));
  T('no flip hint anywhere', !doc.querySelector('[data-flip-hint]') && !doc.querySelector('.bc-flip-hint'));
  if (card) {
    click(window, card); await wait(900);
    T('tap does NOT flip the card (feature removed)', !card.classList.contains('is-flipped'));
    T('flip API removed', typeof window.Shivaa.flipBlackCard === 'undefined');
    T('no real page errors around the card', realErrs(errors).length === 0, String(realErrs(errors)[0] || '').slice(0, 90));
  }
  log('S1 card no-flip done');
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
    const probe = () => (stage.querySelector('.sv-case-card') || {}).style ? stage.querySelector('.sv-case-card').style.transform : '';
    const before = probe();
    stage.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 300, pointerId: 1 }));
    for (let x = 300; x >= 200; x -= 25) {
      stage.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: x, pointerId: 1 }));
    }
    stage.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 200, pointerId: 1 }));
    await wait(300);
    const after = probe();
    T('drag turns the case (flat layout)', !!after && after !== before, String(after).slice(0, 40));
    /* arrows */
    const nxt = doc.getElementById('svCaseNext');
    if (nxt) {
      const mid = probe();
      click(window, nxt); await wait(350);
      T('arrow spins the case', probe() !== mid);
    }
    /* give the auto-tour one tick */
    const toured = probe();
    await wait(7600);
    T('self-tour turns on its own', probe() !== toured);
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

/* ── 3d · v212 offer-banner layout (flip asserts retired at v214) ── */
{ log('S3d offer layout');
  const css212 = fs.readFileSync('cms/css/v212.css', 'utf8');
  T('offer banners: art band on top, words below (no overlap)',
    /\.shv-offer-art\s*\{[^}]*position: relative/s.test(css212) && /\.shv-offer-art\s*\{[^}]*height: 104px/s.test(css212));
  T('offer banners: four crisp painted scenes',
    css212.includes('.shv-offer-making .shv-offer-art::before') && css212.includes('.shv-offer-delivery .shv-offer-art::before')
    && css212.includes('.shv-offer-premium .shv-offer-art::before') && css212.includes('.shv-offer-cert .shv-offer-art::before'));
  T('offer banners: long certificate title cannot overflow',
    /\.shv-offer-cert \.shv-offer-pct\s*\{[^}]*font-size: clamp\(28px/s.test(css212));
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

/* ── 3f · v214 · smooth release — float, phone case, flicker kills ── */
{ log('S3f v214 smooth');
  const css214 = fs.readFileSync('cms/css/v214.css', 'utf8');
  const v125 = fs.readFileSync('cms/js/v125.js', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  T('card floats (compositor-only translate/rotate keyframes)',
    css214.includes('v214Float') && /@keyframes v214Float[\s\S]*?translate: 0 -8px/.test(css214));
  T('card gleam is transform+opacity only', css214.includes('v214Gleam') && css214.includes('translateX'));
  T('flip hint hidden if any layer still styles it', css214.includes('.bc-card-wrap .bc-flip-hint'));
  T('case cards: touch-action pan-y restored (v213 regression)',
    /\.sv-case-card\s*\{[^}]*touch-action: pan-y/s.test(css214));
  T('case: all-four thumb rail styled for phones',
    css214.includes('.sv-case-rail') && css214.includes('.sv-case-thumb'));
  T('case JS: inline transforms written with webkit prefix',
    v125.includes('el.style.webkitTransform') && v125.includes('function setT('));
  T('case JS: thumb rail built with tap-to-front',
    v125.includes('svCaseRail') && v125.includes('sv-case-thumb'));
  T('flicker: motion blur-up images flattened (no filter on load)',
    css214.includes('html.js-motion #view .pc-imgwrap img') && css214.includes('filter: none !important'));
  T('flicker: aurum shimmer words + hero glow pulse + CTA halo frozen',
    css214.includes('html.js-aurum .hero h1 em.shimmer .au-w') && css214.includes('html.js-aurum:not(.au-lite) .hero-stage::before') && css214.includes('html.js-aurum:not(.au-lite) .hero-cta .btn-gold'));
  T('flicker: bc-home-final img filter removed', /\.bc-home-final img\s*\{[^}]*filter: none/s.test(css214));
  T('load: off-screen sections use content-visibility', css214.includes('content-visibility: auto'));

  const { window: w4, doc: d4 } = await boot('#/', { mobile: true });
  await wait(2200);
  const thumbs = d4.querySelectorAll('.sv-case-thumb');
  T('phone: rail shows all four films', thumbs.length === 4, String(thumbs.length));
  T('phone: ring still holds four film cards', d4.querySelectorAll('.sv-case-card').length === 4);
  T('phone: no flip hint, no flip API', !d4.querySelector('.bc-flip-hint') && typeof w4.Shivaa.flipBlackCard === 'undefined');
  log('S3f done');
}

/* ── 3g · v215: the proof release — flat case, blur-up dead, float alive ── */
{ log('S3g v215 proof');
  const fs = await import('node:fs');
  const css215 = fs.readFileSync('cms/css/v215.css', 'utf8');
  const v125 = fs.readFileSync('cms/js/v125.js', 'utf8');
  const index = fs.readFileSync('cms/index.html', 'utf8');
  const sw = fs.readFileSync('cms/sw.js', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  const api = fs.readFileSync('cms/api.php', 'utf8');
  const open = (css215.match(/\{/g) || []).length, close = (css215.match(/\}/g) || []).length;
  T('v215.css exists with balanced braces', open === close && open > 10, open + '/' + close);

  T('case JS: flat 2D cover-flow layout (no ring rotation)', v125.includes('function layoutCards(') && v125.includes('shrink') && !v125.includes('setT(ring'));
  T('case CSS: ring detached from 3D (transform-style flat)', /\.sv-case-ring\s*\{[^}]*transform-style: ?flat/s.test(css215));
  T('case CSS: stage + ring + cards all give horizontal drags to the case', /\.sv-case-stage,\.sv-case-ring,\.sv-case-card\s*\{[^}]*touch-action: ?pan-y/s.test(css215));
  T('case CSS: thumb rail visible on every screen size', /\.sv-case-rail\s*\{[^}]*display: ?flex/s.test(css215));
  T('case JS: wrap point folded to x=0 (spin is continuous)', v125.includes('Math.pow(ao / (n / 2), 6)'));

  T('flicker: motion blur-up killed — images fade with opacity only',
    /html\.js-motion #view \.pc-imgwrap img[\s\S]*?filter: ?none/.test(css215) && /transition: ?opacity \.5s ease/.test(css215) && !/filter: ?blur\(/.test(css215));
  T('flicker: img-ok state also filter-free', /html\.js-motion #view img\.img-ok\s*\{[^}]*filter: ?none/s.test(css215));
  T('load: footer + testimonial grid reserved with content-visibility', css215.includes('#view footer') && /content-visibility: ?auto/.test(css215));

  T('card: organic float on three compositor properties',
    css215.includes('v215Float') && css215.includes('v215Sway') && css215.includes('v215Breathe') && /@keyframes v215Float[\s\S]*?translate: ?0 -11px/.test(css215));
  T('card: gleam sweeps more often (5.2s)', css215.includes('v215Gleam') && css215.includes('5.2s'));
  T('card: reduced-motion guard present', /prefers-reduced-motion[\s\S]*?v215Float|prefers-reduced-motion[\s\S]*?animation: none/.test(css215) || css215.includes('prefers-reduced-motion'));

  T('stamps: index 215 + v215.css linked', index.includes('__SHIVAA_REL=215') && index.includes('v215.css?v=215') && !index.includes('?v=214'));
  T('stamps: sw.js shell v215 + v215.css precached', sw.includes('shivaa-shell-v215') && sw.includes('/css/v215.css?v=215') && sw.includes('const REL = 215;'));
  T('stamps: app.js + api.php at 215', app.includes('const APP_REL = 215;') && api.includes("'rel' => 215,"));

  const { window: w5, doc: d5 } = await boot('#/', { mobile: true });
  await wait(2200);
  T('phone: four film cards + four rail posters on screen',
    d5.querySelectorAll('.sv-case-card').length === 4 && d5.querySelectorAll('.sv-case-thumb').length === 4);
  const count0 = (d5.querySelector('#svCaseCount') || {}).textContent || '';
  const nextBtn = d5.querySelector('#svCaseNext');
  if (nextBtn) nextBtn.click();
  await wait(900);
  const count1 = (d5.querySelector('#svCaseCount') || {}).textContent || '';
  T('phone: spinning the case updates the front film', count0 !== count1 && count1.length > 0, JSON.stringify([count0, count1]));
  T('phone: no flip affordance anywhere on the home card',
    !d5.querySelector('[data-flip-card], .bc-flip-hint') && (!w5.Shivaa || typeof w5.Shivaa.flipBlackCard === 'undefined'));
  log('S3g done');
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
