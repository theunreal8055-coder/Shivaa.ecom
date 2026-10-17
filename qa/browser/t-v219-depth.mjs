/* t-v219 — the depth release: 10 g button readable, offer depth + CTA, smoothness guards.
   Static checks read the shipped files; one jsdom boot confirms the 10 g button is in the DOM. */
import fs from 'node:fs';
import { boot, wait } from './harness.mjs';

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const css = fs.readFileSync('cms/css/v219.css', 'utf8');
const js = fs.readFileSync('cms/js/v219.js', 'utf8');
const CSS_BUNDLE = fs.readFileSync('cms/css/shivaa.css', 'utf8');
const index = fs.readFileSync('cms/index.html', 'utf8');
const sw = fs.readFileSync('cms/sw.js', 'utf8');
const app = fs.readFileSync('cms/js/app.js', 'utf8');

const open = (css.match(/\{/g) || []).length, close = (css.match(/\}/g) || []).length;
T('v219.css balanced braces', open === close && open > 20, open + '/' + close);

// 1 · the 10 g button: explicit gold fill AND dark ink, on that button only
T('10g: explicit gold fill on the campaign CTA',
  /\.shv-home-campaign-card \.shv-hcc-cta-row a\.btn-gold \{[^}]*background: linear-gradient\(180deg, #fbe9ad/s.test(css));
T('10g: dark ink set with the fill (readable on gold)',
  /\.shv-home-campaign-card \.shv-hcc-cta-row a\.btn-gold \{[^}]*color: #2a1405 !important/s.test(css));
T('10g: the gold colour is not set on the other gold buttons', !/(^|\n)\.btn-gold \{[^}]*#fbe9ad/s.test(css));
T('10g: app.js still renders the entry as a.btn-gold', app.includes('class="btn btn-gold btn-lg shv-pulse-cta">Enter 10g Gold Scheme Funnel'));

// 2 · offer depth: mouse-only tilt, glare, art layer, paused sheen
T('offers: tilt class wired in css', css.includes('.shv-offer-card.v219-tilt'));
T('offers: glare follows pointer variables', css.includes('--v219-gx') && css.includes('--v219-gy'));
T('offers: artwork is a separate parallax layer', /\.shv-offer-card \.shv-offer-art \{[^}]*translate: var\(--v219-ax/s.test(css));
T('offers: js ignores touch pointers', js.includes("e.pointerType !== 'mouse'"));
T('offers: js tilt capped at 7 degrees', js.includes('* 7).toFixed(2)'));
T('offers: js never calls preventDefault', !js.includes('preventDefault'));
T('offers: js writes CSS variables, no inline 3D transforms', !/style\.transform|style\.webkitTransform|setT\(/.test(js));
T('offers: off-screen cards pause the sheen', css.includes('.shv-offer-card.v219-off .shv-offer-shine') && js.includes('v219-off'));
T('offers: no tilt on phones or with reduced motion', /\(hover: none\), \(pointer: coarse\)/.test(css) && /prefers-reduced-motion: reduce\)[\s\S]*v219-tilt/.test(css));

// 3 · the offer button
T('cta: gold pill with explicit ink', /\.shv-offer-card \.shv-offer-go \{[^}]*color: #2a1405 !important/s.test(css));
T('cta: light sweep is transform-only', /\.shv-offer-card \.shv-offer-go:hover::after[\s\S]*?transform: skewX\(-18deg\) translateX\(330%\)/.test(css));
T('cta: visible focus ring', css.includes('.shv-offer-card .shv-offer-go:focus-visible { outline'));

// 4 · no filter or background-position loops added (v211 stillness)
T('stillness: no filter or background-position animation in v219', !/filter:\s*(?!none)/.test(css) && !/background-position[^;]*animation/.test(css));

// 5 · wiring and stamps
T('the bundle carries the v219 layer and index loads v219.js',
  CSS_BUNDLE.includes('/* v219.css */') && index.includes('/js/v219.js?v=228'));
T('sw precaches the bundle + v219.js and names shell v226',
  sw.includes('shivaa-shell-v228') && sw.includes('/css/shivaa.css?v=228') && sw.includes('/js/v219.js?v=228') && sw.includes('const REL = 228;'));
T('app.js APP_REL = 228', app.includes('const APP_REL = 228;'));

// 6 · jsdom: the 10 g entry is present on the home page
const { doc } = await boot('#/', { mobile: false });
await wait(1500);
const entry = doc.querySelector('.shv-home-campaign-card .shv-hcc-cta-row a.btn-gold');
T('jsdom: 10g entry renders as a.btn-gold on home', !!entry, entry ? entry.textContent.trim().slice(0, 40) : 'missing');

console.log('PASS ' + ok.length + ' / FAIL ' + bad.length);
ok.forEach(o => console.log('  ✓ ' + o));
bad.forEach(b => console.log('  ✗ ' + b));
process.exit(bad.length ? 1 : 0);
