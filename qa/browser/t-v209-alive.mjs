/* t-v209 — "the alive release" acceptance: the owner's five complaints.
   1 flip (tap/click/keys/hint; mid-flight taps queue; card always answers)
   2 film case: retired at v218 (asserted absent)
   3 Amrita food offer banners render + selection works (walk the steps)
   4 scroll-flicker file invariants
   5 Passport sign-in sheet opens with its two doors */
import { boot, wait, click, until } from './harness.mjs';
import fs from 'node:fs';
const log = m => fs.appendFileSync('/tmp/t9step.txt', m + '\n');
fs.writeFileSync('/tmp/t9step.txt', '');

/* v222 — index.html now links ONE stylesheet (/css/shivaa.css) built from
   every layer; assertions that used to look for a layer's own <link> now
   check the layer is inside the bundle. */
const CSS_BUNDLE = fs.readFileSync('cms/css/shivaa.css', 'utf8');

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
/* v219: the sandbox has no outbound TLS to sdk.cashfree.com, so the Cashfree SDK socket drops here — environmental, not a page fault */
const realErrs = es => es.filter(e => !/cashfree|Could not load script|getContext|Not implemented|jsdomError: Could not parse CSS|Client network socket disconnected/i.test(e));

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

/* ── 2 · v218: the film case is removed for good ── */
{ log('S2 case removed');
  const idx = fs.readFileSync('cms/index.html', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  const v125 = fs.readFileSync('cms/js/v125.js', 'utf8');
  T('case: script tag gone from index.html', !idx.includes('v217-case.js'));
  T('case: no svCaseMount section in app.js', !app.includes('svCaseMount'));
  T('case: v125 no longer mounts the case', !v125.includes('ShivaaCase217.mount') && !v125.includes("getElementById('svCaseMount')"));
  T('case: v217-case.js deleted', !fs.existsSync('cms/js/v217-case.js'));
  T('case: sw.js no longer precaches it', !fs.readFileSync('cms/sw.js', 'utf8').includes('v217-case'));
  log('S2 done');
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
  /* v219: poll for the grid (the offers fetch can lag under a full-suite load) */
  await until(() => doc.querySelectorAll('.shv-offer-grid .shv-offer-card').length === 4, 8000);
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
  T('case: the dead case code is gone from v125.js (v221)',
    !v125.includes('mountCase') && !v125.includes('caseApi') && !v125.includes('sv-case-card')
    && v125.includes('sv-case-no'));   /* .sv-case-no is LIVE: the thread's FILM badge */
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

/* ── 3e · v213 · pocket release — home + sidebar (case assertions retired at v218) ── */
{ log('S3e v213 pocket');
  const css213 = fs.readFileSync('cms/css/v213.css', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  T('home: black-hero stage forced visible on phones (styles.css hides .hero-stage)',
    /\.black-hero \.hero-stage,/.test(css213) && /display: flex !important/.test(css213));
  T('home: orphan c-dots fragment removed', !app.includes('<div class="c-dots" id="cDots"></div>'));
  T('sidebar: drawer scroll contained + tap hygiene', css213.includes('overscroll-behavior: contain') && css213.includes('#dwClose'));

  const { window: w3, doc: d3 } = await boot('#/', { mobile: true });
  await until(() => d3.querySelector('#blackHero .bc-hero-stage') && d3.querySelectorAll('.shv-offer-mini').length > 0, 9000);
  T('mobile home: black card stage exists', !!d3.querySelector('#blackHero .bc-hero-stage'));
  T('mobile home: no orphan c-dots', !d3.querySelector('#cDots'));
  T('mobile home: case gone (no mount, no cards)', !d3.querySelector('#svCaseMount') && !d3.querySelector('.sv-case-card'));
  const tgl = d3.querySelector('#navToggle');
  if (tgl) {
    tgl.dispatchEvent(new w3.MouseEvent('click', { bubbles: true, cancelable: true, view: w3 }));
    await until(() => d3.querySelector('#mainNav').classList.contains('open'), 3000);
    T('mobile sidebar: drawer opens', d3.querySelector('#mainNav').classList.contains('open'));
    T('mobile sidebar: compact offers render', d3.querySelectorAll('.shv-offer-mini').length > 0);
  }
  log('S3e done');
}
/* ── 3f · v214 · smooth release — float, flicker kills (case assertions retired at v218) ── */
{ log('S3f v214 smooth');
  const css214 = fs.readFileSync('cms/css/v214.css', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  T('card floats (compositor-only translate/rotate keyframes)',
    css214.includes('v214Float') && /@keyframes v214Float[\s\S]*?translate: 0 -8px/.test(css214));
  T('card gleam is transform+opacity only', css214.includes('v214Gleam') && css214.includes('translateX'));
  T('flip hint hidden if any layer still styles it', css214.includes('.bc-card-wrap .bc-flip-hint'));
  T('flicker: motion blur-up images flattened (no filter on load)',
    css214.includes('html.js-motion #view .pc-imgwrap img') && css214.includes('filter: none !important'));
  T('flicker: aurum shimmer words + hero glow pulse + CTA halo frozen',
    css214.includes('html.js-aurum .hero h1 em.shimmer .au-w') && css214.includes('html.js-aurum:not(.au-lite) .hero-stage::before') && css214.includes('html.js-aurum:not(.au-lite) .hero-cta .btn-gold'));
  T('flicker: bc-home-final img filter removed', /\.bc-home-final img\s*\{[^}]*filter: none/s.test(css214));
  T('load: off-screen sections use content-visibility', css214.includes('content-visibility: auto'));

  const { window: w4, doc: d4 } = await boot('#/', { mobile: true });
  await wait(2200);
  T('phone: no case on the home', !d4.querySelector('.sv-case-thumb') && !d4.querySelector('.sv-case-card'));
  T('phone: no flip hint, no flip API', !d4.querySelector('.bc-flip-hint') && typeof w4.Shivaa.flipBlackCard === 'undefined');
  log('S3f done');
}
/* ── 3g · v215: the proof release — blur-up dead, float alive (case assertions retired at v218) ── */
{ log('S3g v215 proof');
  const css215 = fs.readFileSync('cms/css/v215.css', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  const index = fs.readFileSync('cms/index.html', 'utf8');
  const sw = fs.readFileSync('cms/sw.js', 'utf8');
  const api = fs.readFileSync('cms/api.php', 'utf8');
  const open = (css215.match(/\{/g) || []).length, close = (css215.match(/\}/g) || []).length;
  T('v215.css exists with balanced braces', open === close && open > 10, open + '/' + close);

  T('flicker: motion blur-up killed — images fade with opacity only',
    /html\.js-motion #view \.pc-imgwrap img[\s\S]*?filter: ?none/.test(css215) && /transition: ?opacity \.5s ease/.test(css215) && !/filter: ?blur\(/.test(css215));
  T('flicker: img-ok state also filter-free', /html\.js-motion #view img\.img-ok\s*\{[^}]*filter: ?none/s.test(css215));
  T('load: footer + testimonial grid reserved with content-visibility', css215.includes('#view footer') && /content-visibility: ?auto/.test(css215));

  T('card: organic float on three compositor properties',
    css215.includes('v215Float') && css215.includes('v215Sway') && css215.includes('v215Breathe') && /@keyframes v215Float[\s\S]*?translate: ?0 -11px/.test(css215));
  T('card: gleam sweeps more often (5.2s)', css215.includes('v215Gleam') && css215.includes('5.2s'));
  T('card: reduced-motion guard present', css215.includes('prefers-reduced-motion'));

  T('stamps: index at 226 with the one bundled stylesheet, no old 216/215 stamps', index.includes('__SHIVAA_REL=228') && index.includes('/css/shivaa.css?v=228') && !index.includes('?v=216') && !index.includes('?v=215'));
  T('stamps: sw.js shell v228 + the css bundle precached', sw.includes('shivaa-shell-v228') && sw.includes('/css/shivaa.css?v=228') && sw.includes('const REL = 228;'));
  T('stamps: app.js + api.php at 228', app.includes('const APP_REL = 228;') && api.includes("'rel' => 228,"));

  const { window: w5, doc: d5 } = await boot('#/', { mobile: true });
  await wait(2200);
  T('phone: no flip affordance anywhere on the home card',
    !d5.querySelector('[data-flip-card], .bc-flip-hint') && (!w5.Shivaa || typeof w5.Shivaa.flipBlackCard === 'undefined'));
  log('S3g done');
}
/* ── 3h · v216: wow banners, organised hero (films retired at v218) ── */
{ log('S3h v216 wow release');
  const css216 = fs.readFileSync('cms/css/v216.css', 'utf8');
  const open = (css216.match(/\{/g) || []).length, close = (css216.match(/\}/g) || []).length;
  T('v216.css exists with balanced braces', open === close && open > 10, open + '/' + close);
  T('offers: four real artwork bands wired (making/delivery/premium/cert)',
    ['art-making.jpg','art-delivery.jpg','art-premium.jpg','art-cert.jpg'].every(f => css216.includes('/images/offers/' + f)));
  T('offers: cartoon shape pseudos switched off on every band', /shv-offer-making \.shv-offer-art::before[\s\S]*?display: ?none !important/.test(css216) && css216.includes('.shv-offer-cert .shv-offer-art::after'));
  T('offers: sheen is transform-only (no background-position loop)', /@keyframes v216Sheen[\s\S]*?translateX/.test(css216) && !/background-position[^;]*\banimation/.test(css216));
  T('hero: one column stage (card, certificate, status stacked)', /\.bc-hero-stage\s*\{[^}]*flex-direction: ?column/s.test(css216) && /\.bc-stage-cert\s*\{[^}]*position: ?relative/s.test(css216));
  T('hero: single float keyframes, no drop-shadow filter on the stage card', css216.includes('@keyframes v216HeroFloat') && /\.bc-stage-card\s*\{[^}]*filter: ?none/s.test(css216));
  T('stamps: v218 css linked and the case script is gone from index', CSS_BUNDLE.includes('/* v218.css */') && !fs.readFileSync('cms/index.html', 'utf8').includes('v217-case'));
}
/* ── 3i · v217: steady release — scroll fix, search, campaign (case + drawer retired at v218) ── */
{ log('S3i v217 steady release');
  const css217 = fs.readFileSync('cms/css/v217.css', 'utf8');
  const oc = (css217.match(/\{/g) || []).length, cc = (css217.match(/\}/g) || []).length;
  T('v217.css exists with balanced braces', oc === cc && oc > 20, oc + '/' + cc);
  T('scroll fix: content-visibility forced visible on home sections', /#view \*[\s\S]*?content-visibility: visible !important/.test(css217));
  T('search: phones get one full-screen panel, inline box hidden', /#hdrSearch \{ display: none !important/.test(css217) && /#searchDrawer \{[\s\S]*?position: fixed/.test(css217));
  T('campaign: outline button is cream text on dark glass (not the same colour)', /btn-outline \{[\s\S]*?color: #fff3d6/.test(css217) && /btn-outline \{[\s\S]*?background: rgba\(14, 8, 5/.test(css217));
  T('offers: four distinct sparkle motifs', ['v217Spin','v217Ribbon','v217Seal','v217Twinkle'].every(k => css217.includes(k)));
}
/* ── 3j · v218: funnel stays put, 10g entry highlighted, login sheet redesigned ── */
{ log('S3j v218 release');
  const css218 = fs.readFileSync('cms/css/v218.css', 'utf8');
  const app = fs.readFileSync('cms/js/app.js', 'utf8');
  const auth = fs.readFileSync('cms/js/auth.js', 'utf8');
  const css217 = fs.readFileSync('cms/css/v217.css', 'utf8');
  const oc = (css218.match(/\{/g) || []).length, cc = (css218.match(/\}/g) || []).length;
  T('v218.css exists with balanced braces', oc === cc && oc > 40, oc + '/' + cc);
  T('10g entry: halo ring, larger target', css218.includes('v218Halo') && css218.includes('min-height: 60px'));
  const i = app.indexOf('function renderSchemeStage');
  const body = app.slice(i, i + 4000);
  T('funnel: no unconditional scroll-to-top in renderSchemeStage', i > 0 && !/scrollTo\(\{ top: 0/.test(body) && body.includes('activeStage'));
  T('sidebar: v217 drawer block removed (earlier drawer returns)', !css217.includes('translate3d(-104%'));
  T('login: v218 layer scoped to #shvAuthWrap', (css218.match(/#shvAuthWrap/g) || []).length > 20);
  T('login: error box respects [hidden]', css218.includes('#shvAuthWrap .shv-err[hidden]'));
  T('login: every ID kept in auth.js', ['shvStartForm','shvPhoneIn','shvPhoneBtn','shvJwForm','shvJwEm','shvJwPw','shvJwBtn','shvEye3','shvJwApply','shvJwForgot','shvSavedGo','shvSavedX','shvHeadSub','paneRetail','paneJwl'].every(id => auth.includes(id)));
  log('S3j done');
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
  T('v218: error boxes start hidden (the [hidden] guard holds)', [...doc.querySelectorAll('.shv-err')].every(x => x.hidden || x.closest('[hidden]')));
  const jwlDoor = doc.querySelector('.shv-aud-btn[data-aud="jwl"]');
  if (jwlDoor) click(window, jwlDoor);
  await wait(200);
  T('v218: B2B door shows the jeweller pane only', !!doc.getElementById('paneJwl') && !doc.getElementById('paneJwl').hidden && doc.getElementById('paneRetail').hidden);
  T('v218: B2B form keeps its IDs', ['shvJwForm','shvJwEm','shvJwPw','shvJwBtn'].every(id => !!doc.getElementById(id)));
  const retailDoor = doc.querySelector('.shv-aud-btn[data-aud="retail"]');
  if (retailDoor) click(window, retailDoor);
  await wait(200);
  T('v218: Retail door shows the retail pane only', !doc.getElementById('paneRetail').hidden && doc.getElementById('paneJwl').hidden);
  T('v218: retail form keeps its IDs', ['shvStartForm','shvPhoneIn','shvPhoneBtn'].every(id => !!doc.getElementById(id)));
  T('v218: the layer is inside the bundled stylesheet', CSS_BUNDLE.includes('/* v218.css */'));
  log('S5 done');
}

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
