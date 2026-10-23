/* t-v230 — the two things the owner reported, proved rather than patched.
   ─────────────────────────────────────────────────────────────────────────
   REPORT 1 · "the name of the prestigious customer in the membership
   certificate is of same colour as of background". He was right, and this suite
   measures it: the foil gold that v201/v205 clipped into the name sits at about
   1.4:1 against the cream paper — WCAG asks 4.5:1, and large text 3:1. The fix
   is not "a darker colour", it is removing the whole treatment (clipped
   background, background-clip:text, the WebKit text fill, and a drop-shadow
   filter that was designed for a dark stage) and putting ink on paper. Both
   numbers are asserted here, the failing one and the fixed one, so nobody can
   "restore the foil" without a red line explaining what it costs.

   REPORT 2 · "25% is a false claim; prestigious members are 20% off making
   charges". The percentage became ONE setting at v229, so this asserts the
   default in all four places that carry it (server, client, admin form, dev
   mirror), that no shipped surface still says 25, and — because a hard-coded 20
   would be the same mistake wearing a different number — that moving the setting
   still moves the card, the certificate and the scope note together.

   Also here: the graphics the owner asked to be taken further (seal, border,
   guilloche, record boxes, promise cartouche, signature, verify strip, name
   flourish) and the smoothness half, which is mostly subtraction — a per-glyph
   filter and a gradient clipped to glyph outlines are gone from the most painted
   element on the member page, and the sheet's paint is now contained.

   Re-runnable: no OTP (the shim's has a 30 s cooldown), no renewal consumed, and
   the setting is restored to 20 before the suite finishes. */
import fs from 'node:fs';
import { boot, wait, until, BASE, pageFaults } from './harness.mjs';

const WATCHDOG = setTimeout(() => {
  console.log('FAIL watchdog: the suite did not finish in 300 s');
  process.exit(1);
}, 300000);
if (WATCHDOG.unref) WATCHDOG.unref();

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const read = p => fs.readFileSync(p, 'utf8');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const WS = s => String(s || '').replace(/\s+/g, ' ').trim();
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;
const faults = () => pageFaults.filter(f => !NOISE.test(f));

const API = read('cms/api.php');
const APP = read('cms/js/app.js');
const APP_J = stripJs(APP);
const ADMIN = read('cms/js/admin.js');
const V230 = stripCss(read('cms/css/v230.css'));
const V229 = stripCss(read('cms/css/v229.css'));
const V205 = stripCss(read('cms/css/v205.css'));
const V201 = stripCss(read('cms/css/v201.css'));
const BUNDLE = read('cms/css/shivaa.css');
const INDEX = read('cms/index.html');
const SW = read('cms/sw.js');
const SHIM = read('qa/preview_shim.py');

const jget = async (p, tok) => {
  const r = await fetch(BASE + p, tok ? { headers: { Authorization: 'Bearer ' + tok } } : {});
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};
const jpost = async (p, body, tok) => {
  const r = await fetch(BASE + p, {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
    body: JSON.stringify(body || {}),
  });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};
const jput = async (p, body, tok) => {
  const r = await fetch(BASE + p, {
    method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
    body: JSON.stringify(body || {}),
  });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { status: r.status, body: j };
};

/* WCAG 2.2 relative luminance and contrast — the same maths a browser uses, so
   "it looks readable to me" is not the test. */
const lum = hex => {
  const c = String(hex).replace('#', '');
  const ch = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const PAPER_LIGHT = '#fffdf1';   // the certificate gradient's lightest stop
const PAPER_DARK = '#ead18a';    // and its darkest
const INK = '#2b1a05';           // v230's ink
const FOIL = '#e8c877';          // v201/v205's foil mid-stop, clipped into the glyphs

/* ── 1 · the report, measured ──────────────────────────────────────────── */
T('cause: v201/v205 clipped a gold foil into the name and made the colour transparent',
  /background-clip:\s*text/.test(V205) && /color:\s*transparent/.test(V205) && /background-clip:\s*text/.test(V201));
T('cause: that foil was designed for a DARK stage, not this cream paper',
  /\.bc-commerce \{[\s\S]{0,400}?#0a0806/.test(V201));
{
  const foilOnLight = ratio(FOIL, PAPER_LIGHT), foilOnDark = ratio(FOIL, PAPER_DARK);
  T('measured: the old foil name was unreadable on the paper (worst case ' + foilOnDark.toFixed(2) + ':1)',
    foilOnLight < 2 && foilOnDark < 2, [foilOnLight.toFixed(2), foilOnDark.toFixed(2)].join(' / '));
  const inkOnLight = ratio(INK, PAPER_LIGHT), inkOnDark = ratio(INK, PAPER_DARK);
  T('measured: the ink name clears AAA on the lightest paper (' + inkOnLight.toFixed(1) + ':1)', inkOnLight >= 7, inkOnLight.toFixed(2));
  T('measured: and clears AA large-text on the darkest paper (' + inkOnDark.toFixed(1) + ':1)', inkOnDark >= 4.5, inkOnDark.toFixed(2));
}

/* ── 2 · the fix removes the treatment, not just the colour ────────────── */
{
  const at = V230.indexOf('.bc-certificate.v230 .bc-cert-name {');
  const rule = at >= 0 ? V230.slice(at, at + 900) : '';
  T('fix: all four mechanisms are reset, each with !important',
    /background: none !important/.test(rule) &&
    /background-image: none !important/.test(rule) &&
    /-webkit-background-clip: border-box !important/.test(rule) &&
    /background-clip: border-box !important/.test(rule) &&
    /-webkit-text-fill-color: #2b1a05 !important/.test(rule) &&
    /color: #2b1a05 !important/.test(rule), rule.slice(0, 120));
  T('fix: the dark-stage filter is gone, and a cheap letterpress shadow replaces it',
    /filter: none !important/.test(rule) && /text-shadow: 0 1px 0 rgba\(255, 253, 244, \.85\)/.test(rule));
  /* Counting !important against two slices of the same file breaks whenever the
     layer is edited, for reasons unrelated to what this protects. What matters is
     narrower and stable: every !important here is ink, a foil reset or a print
     declaration — never a layout property. */
  const imp = V230.split('\n').filter(l => l.includes('!important'));
  T('fix: !important is used only for ink, foil resets and print — never for layout',
    imp.length >= 8 && imp.every(l => /background|clip|text-fill-color|color|filter|text-shadow/.test(l)),
    imp.filter(l => !/background|clip|text-fill-color|color|filter|text-shadow/.test(l)).join(' | ') ||
      imp.length + ' declarations, all ink/foil/print');
  T('fix: the foil utilities that use !important elsewhere cannot beat it',
    /-webkit-text-fill-color:\s*transparent\s*!important/.test(read('cms/css/styles.css')));
}
/* Compared against v205's own selector, not against '.bc-cert-name {': the v230
   layer's PRINT rule ends with exactly that selector, so the check was comparing
   the fix against itself — and losing. */
T('cascade: the v230 name rule comes after the foil rule it replaces',
  BUNDLE.lastIndexOf('.bc-certificate.v230 .bc-cert-name') > BUNDLE.lastIndexOf('.bc-certificate .bc-cert-name {') &&
  BUNDLE.lastIndexOf('.bc-certificate.v230 .bc-cert-name') > BUNDLE.lastIndexOf('.bc-cert-name {\n  background: linear-gradient'),
  [BUNDLE.lastIndexOf('.bc-certificate.v230 .bc-cert-name'),
   BUNDLE.lastIndexOf('.bc-certificate .bc-cert-name {')].join(' vs '));
T('cascade: the last word on the name colour is the v230 ink',
  BUNDLE.lastIndexOf('color: #2b1a05 !important') > BUNDLE.lastIndexOf('color: transparent'));
T('cascade: the copy line was cream-on-cream too, and is ink now',
  /\.bc-certificate\.v230 \.bc-cert-copy \{ color: #4b3410/.test(V230) &&
  ratio('#4b3410', PAPER_LIGHT) >= 7, ratio('#4b3410', PAPER_LIGHT).toFixed(2));
T('markup: the sheet carries every release class that styles it', /class="bc-certificate v229 v230 v231"/.test(APP));
T('canvas: the downloaded A4 sheet draws the name in the same ink',
  /x\.fillStyle = '#2b1a05'; const name = String\(card\.holderName/.test(APP_J));
T('print: ink prints as ink, with the foil shadow off',
  /@media print \{[\s\S]{0,700}?\.bc-cert-name \{ color: #000 !important/.test(V230));

/* ── 3 · the second report: 20%, everywhere, and still one setting ─────── */
T('api: the shipped default is 20', /function black_pct_setting\([\s\S]{0,700}?return 20;/.test(API));
T('api: the clamp is unchanged (0-40) — the owner can still move it',
  /function black_pct_setting\([\s\S]{0,700}?max\(0, min\(40,/.test(API));
T('app: the client fallback is 20, so the page and the server quote one offer',
  /function blackPct\(\) \{[\s\S]{0,900}?return 20;\s*\}/.test(APP_J));
T('admin: the form shows the shipped 20, and saves 20 when it is blank',
  ADMIN.includes(': 20}" style="max-width:160px"') && ADMIN.includes('?.value ?? 20) || 0))) };'));
T('shim: the dev mirror defaults to the same 20', /except \(TypeError, ValueError\):\s*return 20/.test(SHIM));
{
  /* No shipped surface may still promise 25 to a member. `25` alone is far too
     common (weights, percentages of width, opacity), so this looks only at the
     shapes that actually reach a customer's eye. */
  const shapes = [/25% off/i, /25<span>%<\/span>/, /Exactly what 25%/, /Flat 25%/, /flat 25% reduction/i,
    /Shop with my 25%/, /25% applies only/, /25% of listed making charges/, /blackDiscountPct['"]?\s*[:=]\s*25/];
  const hits = [];
  [['app.js', APP], ['admin.js', ADMIN], ['index.html', INDEX], ['sw.js', SW], ['api.php', API],
   ['v229.css', read('cms/css/v229.css')], ['v230.css', read('cms/css/v230.css')]].forEach(([n, src]) => {
    shapes.forEach(re => { if (re.test(src)) hits.push(n + ' ' + re); });
  });
  T('offer: nothing shipped still says 25% to a member', hits.length === 0, hits.join(' | '));
}
T('offer: the card, the certificate and checkout all read the one setting',
  /\$\{blackPct\(\)\}<span>%<\/span>/.test(APP) && /bc-cert-promise">\$\{pct\}% off/.test(APP) &&
  /\$\{\+window\._co\.couponValue \|\| blackPct\(\)\}% off/.test(APP));
T('offer: a historical receipt still derives its own rate, and never follows the setting',
  /function blackOrderPct\(o\) \{[\s\S]{0,400}?disc \/ basis \* 100/.test(APP_J) &&
  /blackOrderPct\(o\)/.test(APP_J) && /blackOrderPct\(order\)/.test(APP_J));
T('offer: Premium, Amrita ji and the public banner keep their OWN 20 — untouched',
  /bc-prem-copy"><b>20% off making charges<\/b>/.test(APP) && /Premium card activated: 20% off making charges/.test(APP) &&
  /shv-offer-pct">20%/.test(APP) && /bannerOfferOn/.test(API));

/* ── 4 · graphics taken further ────────────────────────────────────────── */
T('graphics: the name gets a flourish rule, hidden from assistive tech',
  /\.bc-cert-name-rule \{[\s\S]{0,900}?radial-gradient\(circle at 50% 4\.5px, #b98a2f/.test(V230) &&
  /<span class="bc-cert-name-rule" aria-hidden="true"><\/span>/.test(APP));
T('graphics: the seal is a seal — tick band, two rings, a foil sheen',
  /\.bc-cert-seal \{[\s\S]{0,700}?conic-gradient\(from 0deg, rgba\(155, 110, 27, \.55\) 0 1\.2deg/.test(V230) &&
  /inset 0 0 0 5px rgba\(255, 253, 244, \.7\), inset 0 0 0 6px rgba\(155, 110, 27, \.5\)/.test(V230));
T('graphics: the sheet is engraved with a double rule, not printed on a card',
  /\.bc-certificate\.v230 \{[\s\S]{0,500}?inset 0 0 0 7px #fff9df[\s\S]{0,200}?inset 0 0 0 12px #fffdf5/.test(V230));
T('graphics: the guilloche is denser and gained a vertical band',
  /\.bc-cert-guilloche \{[\s\S]{0,900}?transparent 1px 4px[\s\S]{0,900}?repeating-linear-gradient\(90deg/.test(V230));
T('graphics: the record boxes read as records (accent top, inset highlight)',
  /\.bc-cert-meta span \{[\s\S]{0,500}?border-top: 2px solid rgba\(155, 110, 27, \.7\)[\s\S]{0,200}?inset 0 1px 0 rgba\(255, 255, 255, \.8\)/.test(V230));
T('graphics: the promise line sits in a cartouche, because it is the legal line',
  /\.bc-cert-promise \{[\s\S]{0,500}?border-top: 1px solid rgba\(155, 110, 27, \.45\);[\s\S]{0,200}?border-bottom: 1px solid/.test(V230));
T('graphics: the signature has a line to sign on',
  /\.bc-cert-sign b \{[\s\S]{0,300}?border-bottom: 1px solid rgba\(155, 110, 27, \.75\)/.test(V230));
T('graphics: the verify line is a strip with hairlines either side',
  /\.bc-cert-verify \{[\s\S]{0,300}?display: flex/.test(V230) &&
  /\.bc-cert-verify::before[\s\S]{0,300}?linear-gradient\(90deg, transparent, rgba\(155, 110, 27, \.55\), transparent\)/.test(V230));
T('graphics: small screens keep every one of those decisions',
  /@media \(max-width: 700px\) \{[\s\S]{0,900}?\.bc-cert-name \{[\s\S]{0,200}?clamp\(27px/.test(V230));
T('graphics: still exactly four corner ornaments, and they are crisper',
  /\.bc-cert-corner \{ border-color: #9b6e1b; opacity: \.8; width: 54px; height: 54px; \}/.test(V230) &&
  (APP.slice(APP.indexOf('function blackCertificateHTML'), APP.indexOf('function blackRenewHTML')).match(/bc-cert-corner c\d/g) || []).length === 4);

/* ── 5 · smooth: what this layer REMOVES ───────────────────────────────── */
T('smooth: no keyframes and no transitions in the new layer',
  !/@keyframes/.test(V230) && !/transition:/.test(V230) && !/animation:/.test(V230));
/* `!/filter:\s*(?!none)/` cannot work — `\s*` matches zero characters, so the
   lookahead is tested at the space and passes on `filter: none`. Say the rule
   instead: the layer promotes nothing, and its only filter declaration turns one
   off. */
T('smooth: no will-change, and the only filter in the layer switches one off',
  !/will-change/.test(V230) &&
  V230.split('\n').filter(l => l.includes('filter:')).every(l => l.includes('filter: none !important')),
  V230.split('\n').filter(l => l.includes('filter:') && !l.includes('filter: none !important')).join(' | '));
T('smooth: the sheet isolates its own paint',
  /\.bc-certificate\.v230 \{ contain: paint; \}/.test(V230));
T('smooth: the decorative layers stay out of the pointer\'s way',
  /\.bc-cert-frame,[\s\S]{0,200}?\.bc-cert-guilloche,[\s\S]{0,200}?\.bc-cert-corner \{ pointer-events: none; \}/.test(V230));
T('smooth: the per-glyph filter is really gone from the shipped bundle',
  BUNDLE.lastIndexOf('filter: none !important') > BUNDLE.lastIndexOf('filter: drop-shadow(0 1px 0 rgba(0,0,0,.6))'));
T('smooth: still exactly one blocking stylesheet',
  (INDEX.match(/<link[^>]+rel="stylesheet"/g) || []).length === 1,
  (INDEX.match(/<link[^>]+rel="stylesheet"/g) || []).length + ' stylesheet links');
T('bundle: the v230 layer is in the shipped bundle, exactly once, after v229',
  (BUNDLE.match(/^\/\* v230\.css \*\/$/gm) || []).length === 1 &&
  BUNDLE.lastIndexOf('/* v230.css */') > BUNDLE.lastIndexOf('/* v229.css */'),
  BUNDLE.lastIndexOf('/* v230.css */') + ' vs ' + BUNDLE.lastIndexOf('/* v229.css */'));
T('stamps: every carrier is at 235',
  (INDEX.match(/\?v=235/g) || []).length === 32 && /__SHIVAA_REL\s*=\s*235/.test(INDEX) &&
  /shivaa-shell-v235/.test(SW) && /const REL = 235/.test(SW) && (SW.match(/\?v=235/g) || []).length === 32 &&
  /APP_REL = 235/.test(APP) && /'rel' => 235/.test(API));

/* ── 6 · live: what the member actually sees ───────────────────────────── */
const login = await jpost('/api/auth/login', { email: 'aarti@example.com', password: 'shivaa123' });
const MEM = (login.body || {}).token;
T('live: the fixture member signs in', !!MEM, JSON.stringify(login.body).slice(0, 110));
const card0 = await jget('/api/black-card', MEM);
T('live: the server overrides the 25 stored on her card with the shipped 20',
  ((card0.body || {}).membership || {}).discountPct === 20, ((card0.body || {}).membership || {}).discountPct);

const b = await boot('#/black-card', { seed: w => { try { w.localStorage.setItem('shv_token', JSON.stringify(MEM)); } catch (e) {} } });
const $ = s => b.doc.querySelector(s);
const $$ = s => [...b.doc.querySelectorAll(s)];
await until(() => $('.bc-certificate'), 15000);
await wait(320);

const cert = $('.bc-certificate');
T('live: the certificate rendered with every layer', !!cert && ['v229', 'v230', 'v231'].every(c => cert.classList.contains(c)),
  cert && cert.className);
const nameEl = $('.bc-cert-name');
T('live: the name is the member name, in caps', !!nameEl && WS(nameEl.textContent) === 'AARTI SHARMA', WS(nameEl && nameEl.textContent));
T('live: the flourish is there and hidden from assistive tech',
  !!$('.bc-cert-name-rule') && $('.bc-cert-name-rule').getAttribute('aria-hidden') === 'true');
T('live: the card face quotes 20', /20/.test(WS(($('.bc-benefit') || {}).textContent)), WS(($('.bc-benefit') || {}).textContent));
const promise = WS(($('.bc-cert-promise') || {}).textContent);
T('live: the promise line quotes 20%, both dates and the scope',
  /^20% off/.test(promise) && /\d{1,2} \w{3} \d{4}/.test(promise) && /never on metal value, stones, GST or shipping/.test(promise),
  promise.slice(0, 120));
T('live: the scope note quotes the same 20', /Exactly what 20% means/.test(WS(($('.bc-scope') || {}).textContent)),
  WS(($('.bc-scope') || {}).textContent).slice(0, 60));
T('live: the CTA quotes the same 20', /Shop with my 20%/.test(WS(($('.bc-member-actions') || {}).textContent)));
T('live: the fine print quotes the same 20', /The 20% making-charge privilege/.test(WS(($('.bc-cert-fine') || {}).textContent)),
  WS(($('.bc-cert-fine') || {}).textContent).slice(0, 90));
T('live: four record boxes still, and the certificate number is not the member id',
  $$('.bc-cert-meta span').length === 4 &&
  WS($$('.bc-cert-meta b')[0].textContent) !== WS($$('.bc-cert-meta b')[1].textContent),
  $$('.bc-cert-meta b').map(x => WS(x.textContent)).join(' | '));
T('live: signatory, title and verify line survived the redesign',
  /For Shivaa Jewels/.test(WS(($('.bc-cert-sign') || {}).textContent)) &&
  /Proprietor/.test(WS(($('.bc-cert-sign') || {}).textContent)) &&
  /shivaa\.in/.test(WS(($('.bc-cert-verify') || {}).textContent)));
T('live: no page fault, no console error', faults().length === 0 && b.errors.filter(e => !NOISE.test(e)).length === 0,
  faults().concat(b.errors.filter(e => !NOISE.test(e))).slice(0, 2).join(' | '));

/* and it is still ONE setting, not a new hard-coded 20 */
const owner = await jpost('/api/auth/login', { email: 'owner@shivaa.in', password: 'shivaa123' });
const ADMIN_TOK = (owner.body || {}).token;
T('live: the owner signs in', !!ADMIN_TOK, owner.status);
const put22 = await jput('/api/settings', { blackDiscountPct: 22 }, ADMIN_TOK);
T('live: moving the setting still works', put22.status === 200, put22.status);
const b2 = await boot('#/black-card', { seed: w => { try { w.localStorage.setItem('shv_token', JSON.stringify(MEM)); } catch (e) {} } });
await until(() => b2.doc.querySelector('.bc-cert-promise'), 15000);
await wait(260);
T('live: the certificate follows it (so 20 is a default, not a literal)',
  /^22% off/.test(WS((b2.doc.querySelector('.bc-cert-promise') || {}).textContent)),
  WS((b2.doc.querySelector('.bc-cert-promise') || {}).textContent).slice(0, 60));
T('live: the card face follows it', /22/.test(WS((b2.doc.querySelector('.bc-benefit') || {}).textContent)));
const back = await jput('/api/settings', { blackDiscountPct: 20 }, ADMIN_TOK);
T('live: restored to the shipped 20 for whoever runs this next', back.status === 200, back.status);
const card3 = await jget('/api/black-card', MEM);
T('live: and the server agrees', ((card3.body || {}).membership || {}).discountPct === 20,
  ((card3.body || {}).membership || {}).discountPct);

clearTimeout(WATCHDOG);
console.log('\n%d PASS · %d FAIL', ok.length, bad.length);
bad.forEach(x => console.log('  FAIL ' + x));
process.exit(bad.length ? 1 : 0);
