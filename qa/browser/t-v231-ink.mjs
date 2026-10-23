/* t-v231 — the engraved layer: an ink fix that cannot be undone by accident,
   microtext, and a certificate that paints a fifth of what it did.
   ─────────────────────────────────────────────────────────────────────────
   v230 fixed the owner's report and measured it (foil ~1.4:1 on cream paper, ink
   15.4:1 after). This suite holds the three things v231 adds, and one thing it
   must not lose:

     1 · THE FIX IS NOW STRUCTURAL. v230 keyed its reset on
        `.bc-certificate.v230 .bc-cert-name` — correct, and one class-list edit
        away from dead. v231 states the same reset on the bare `.bc-cert-name`
        and gives every other line of the document
        `-webkit-text-fill-color: currentColor`, so no future foil utility can
        make a certificate illegible again. Both the ratios are recomputed here.
     2 · MICROTEXT — the banknote cue the HTML sheet never had (the canvas
        download has had it since v229). It is rendered from an attribute, so
        there is no text node for a screen reader to read out and nothing
        duplicated in the markup.
     3 · PAINT — the guilloche was a full-sheet element whose gradients were
        merely positioned as bands; the browser still rasterised the whole sheet.
        It is two 58px elements now. The suite asserts the height, because
        "less paint" is a claim about a number.
     4 · AND the member rate still ships at 20, still moves with the setting, and
        no shipped surface says 25.

   Re-runnable: no OTP, no renewal consumed, the setting is restored to 20. */
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
const V231 = stripCss(read('cms/css/v231.css'));
const V230 = stripCss(read('cms/css/v230.css'));
const BUNDLE = read('cms/css/shivaa.css');
const INDEX = read('cms/index.html');
const SW = read('cms/sw.js');
const SHIM = read('qa/preview_shim.py');
const ORDER = read('tools/css-bundle-order.txt').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

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
const INK = '#2b1a05', PAPER_LIGHT = '#fffdf1', PAPER_DARK = '#ead18a', FOIL = '#e8c877';

/* ── 1 · the ink fix is structural, not one selector deep ──────────────── */
{
  const at = V231.indexOf('.bc-cert-name,');
  const rule = at >= 0 ? V231.slice(at, at + 900) : '';
  T('ink: the reset is stated on the BARE selector, so no class list can lose it',
    at === V231.indexOf('.bc-cert-name') && /\.bc-cert-name,\s*\.bc-certificate \.bc-cert-name,\s*\.bc-certificate\.v231 \.bc-cert-name \{/.test(rule),
    rule.slice(0, 90));
  T('ink: all four mechanisms are still removed, each with !important',
    /background: none !important/.test(rule) && /background-image: none !important/.test(rule) &&
    /-webkit-background-clip: border-box !important/.test(rule) && /background-clip: border-box !important/.test(rule) &&
    /-webkit-text-fill-color: #2b1a05 !important/.test(rule) && /color: #2b1a05 !important/.test(rule) &&
    /filter: none !important/.test(rule));
  const guarded = ['h2', '.bc-cert-kicker', '.bc-cert-presents', '.bc-cert-copy', '.bc-cert-promise',
    '.bc-cert-meta small', '.bc-cert-meta b', '.bc-cert-sign b', '.bc-cert-sign small',
    '.bc-cert-verify', '.bc-cert-fine', '.bc-cert-state'];
  /* The end anchor is the closing brace of the declaration block, not a section
     comment: V231 has had its comments stripped, so indexOf('/* ── §2') was -1 and
     slice(start, -1) meant "everything but the last character" — which is how §4's
     corner colours ended up inside a check about §1's guard. */
  const gStart = V231.indexOf('.bc-certificate h2,');
  const gEnd = V231.indexOf('}', V231.indexOf('-webkit-background-clip: border-box;', gStart));
  const group = gStart >= 0 && gEnd > gStart ? V231.slice(gStart, gEnd + 1) : '';
  T('ink: every other line of the document can never be foil-clipped either',
    group.length > 200 && guarded.every(sel => group.includes('.bc-certificate ' + sel)) &&
    /-webkit-text-fill-color: currentColor;/.test(group) && /background-clip: border-box;/.test(group),
    guarded.filter(sel => !group.includes('.bc-certificate ' + sel)).join(','));
  T('ink: the guard restates no colours, so a future layer can still restyle the sheet',
    !/#[0-9a-f]{6}/i.test(group.replace(/-webkit-text-fill-color: currentColor/g, '')),
    (group.match(/#[0-9a-f]{6}/gi) || []).join(','));
}
T('ink: the shipped bundle carries the bare-selector reset',
  /^\.bc-cert-name,$/m.test(BUNDLE) && BUNDLE.includes('-webkit-text-fill-color: #2b1a05 !important'));
T('ink: it comes after the foil rule it replaces',
  BUNDLE.lastIndexOf('-webkit-text-fill-color: #2b1a05 !important') > BUNDLE.lastIndexOf('.bc-certificate .bc-cert-name {'));
T('ink: nothing after it makes certificate text transparent again',
  BUNDLE.lastIndexOf('color: #2b1a05 !important') > BUNDLE.lastIndexOf('color: transparent'));
{
  const foilLight = ratio(FOIL, PAPER_LIGHT), foilDark = ratio(FOIL, PAPER_DARK);
  const inkLight = ratio(INK, PAPER_LIGHT), inkDark = ratio(INK, PAPER_DARK);
  T('measured: the foil the owner reported was unreadable (' + foilDark.toFixed(2) + ':1 worst case)',
    foilLight < 2 && foilDark < 2, [foilLight.toFixed(2), foilDark.toFixed(2)].join(' / '));
  T('measured: the ink clears AAA on the lightest paper (' + inkLight.toFixed(1) + ':1)', inkLight >= 7, inkLight.toFixed(2));
  T('measured: and AAA on the darkest paper too (' + inkDark.toFixed(1) + ':1)', inkDark >= 7, inkDark.toFixed(2));
  T('measured: the microtext band is decoration, not text anyone must read (>= 3:1)',
    ratio('#6d4f16', PAPER_LIGHT) >= 3, ratio('#6d4f16', PAPER_LIGHT).toFixed(2));
}

/* ── 2 · microtext ─────────────────────────────────────────────────────── */
{
  const cert = APP.slice(APP.indexOf('function blackCertificateHTML(card)'), APP.indexOf('function blackRenewHTML'));
  const micro = /<span class="bc-cert-microtext" aria-hidden="true" data-microtext="([^"]+)">/.exec(cert);
  T('microtext: one band in the markup, hidden from assistive tech, text in an attribute',
    !!micro && !/<span class="bc-cert-microtext"[^>]*>[^<]/.test(cert), micro ? micro[1].slice(0, 40) : 'missing');
  T('microtext: it says what the document is and what it is not',
    !!micro && /SHIVAA FAMILY/.test(micro[1]) && /PRESTIGIOUS MEMBER/.test(micro[1]) &&
    /NOT A FINANCIAL INSTRUMENT/.test(micro[1]), micro && micro[1].slice(0, 70));
  T('microtext: long enough to fill the sheet, and repeated like a banknote',
    !!micro && micro[1].length > 120 && (micro[1].match(/SHIVAA FAMILY/g) || []).length >= 3,
    micro && micro[1].length + ' chars');
}
T('microtext: rendered from the attribute, so there is no node to read out twice',
  /\.bc-cert-microtext::before \{ content: attr\(data-microtext\)/.test(V231));
T('microtext: 5.5px, letterspaced, too small to photocopy cleanly',
  /\.bc-cert-microtext \{[\s\S]{0,500}?font-size: 5\.5px;[\s\S]{0,200}?letter-spacing: \.22em/.test(V231));
T('microtext: one band only — a pseudo-element cannot reach the foot of the sheet',
  !/\.bc-cert-microtext::after/.test(V231) && /\.bc-cert-microtext \{[\s\S]{0,200}?height: 9px/.test(V231));
T('microtext: out of the pointer\'s way, and dropped from print',
  /\.bc-cert-microtext \{[\s\S]{0,300}?pointer-events: none/.test(V231) &&
  /@media print \{[\s\S]{0,200}?\.bc-cert-microtext \{ display: none !important; \}/.test(V231));

/* ── 3 · paint: two bands, not a sheet ─────────────────────────────────── */
{
  const cert = APP.slice(APP.indexOf('function blackCertificateHTML(card)'), APP.indexOf('function blackRenewHTML'));
  T('paint: exactly two guilloche nodes, both decorative',
    (cert.match(/class="bc-cert-guilloche( bc-guilloche-foot)?" aria-hidden="true"/g) || []).length === 2 &&
    (cert.match(/bc-cert-guilloche/g) || []).length === 2,
    (cert.match(/bc-cert-guilloche/g) || []).length + ' nodes');
}
T('paint: each band is 58px tall, not the height of the sheet',
  /\.bc-certificate\.v231 \.bc-cert-guilloche \{[\s\S]{0,120}?height: 58px;/.test(V231) &&
  !/\.bc-certificate\.v231 \.bc-cert-guilloche \{[\s\S]{0,200}?height: 100%/.test(V231));
T('paint: the foot band is a second element with a modifier, not a positioned guess',
  /\.bc-certificate\.v231 \.bc-cert-guilloche\.bc-guilloche-foot \{\s*top: auto; bottom: 4px;/.test(V231) &&
  !/\.bc-cert-guilloche::after/.test(V231));
T('paint: the artwork is the same — three repeating gradients per band',
  ((V231.match(/repeating-linear-gradient/g) || []).length) === 6,
  (V231.match(/repeating-linear-gradient/g) || []).length + ' gradients');
T('paint: v230 still isolates the sheet, and nothing here promotes a layer',
  /\.bc-certificate\.v230 \{ contain: paint; \}/.test(V230) && !/will-change/.test(V231) && !/contain:/.test(V231));
T('paint: no keyframes, no transitions, no animation, no filter',
  !/@keyframes/.test(V231) && !/transition:/.test(V231) && !/animation:/.test(V231) &&
  V231.split('\n').filter(l => l.includes('filter:')).every(l => l.includes('filter: none !important')));

/* ── 4 · the rest of the graphics ──────────────────────────────────────── */
{
  const cert = APP.slice(APP.indexOf('function blackCertificateHTML(card)'), APP.indexOf('function blackRenewHTML'));
  T('graphics: still exactly four corner ornaments', (cert.match(/bc-cert-corner c\d/g) || []).length === 4,
    (cert.match(/bc-cert-corner c\d/g) || []).length + ' corners');
}
T('graphics: each corner is engraved with a diamond',
  /\.bc-certificate\.v231 \.bc-cert-corner::after \{[\s\S]{0,300}?transform: rotate\(45deg\)/.test(V231) &&
  ['.c1', '.c2', '.c3', '.c4'].every(c => V231.includes('.bc-cert-corner' + c + '::after')));
T('graphics: the title is letterspaced and pressed, not glowed',
  /\.bc-certificate\.v231 h2 \{ letter-spacing: \.045em; text-shadow: 0 1px 0 rgba\(255, 253, 244, \.8\); \}/.test(V231));
T('graphics: the card benefit plate — the number the owner reads first — is crisp',
  /\.bc-benefit b \{ text-shadow:/.test(V231) && /\.bc-benefit small \{ letter-spacing: \.14em; \}/.test(V231));
T('graphics: small screens keep the microtext, the bands and the diamonds',
  /@media \(max-width: 700px\) \{[\s\S]{0,600}?\.bc-cert-microtext \{[\s\S]{0,200}?font-size: 5px[\s\S]{0,400}?\.bc-cert-guilloche \{ height: 44px; \}/.test(V231));
T('graphics: !important is still only ink, foil resets and print — never layout',
  V231.split('\n').filter(l => l.includes('!important'))
    .every(l => /background|clip|text-fill-color|color|filter|display/.test(l)),
  V231.split('\n').filter(l => l.includes('!important') && !/background|clip|text-fill-color|color|filter|display/.test(l)).join(' | '));

/* ── 5 · the rate still ships at 20, and still moves ───────────────────── */
T('rate: api.php ships 20', /function black_pct_setting\([\s\S]{0,700}?return 20;/.test(API));
T('rate: app.js falls back to the same 20', /function blackPct\(\) \{[\s\S]{0,900}?return 20;\s*\}/.test(APP_J));
T('rate: the admin form shows and saves 20',
  ADMIN.includes(': 20}" style="max-width:160px"') && ADMIN.includes('?.value ?? 20) || 0))) };'));
T('rate: the dev mirror defaults to 20 as well', /except \(TypeError, ValueError\):\s*return 20/.test(SHIM));
{
  const shapes = [/25% off/i, /25<span>%<\/span>/, /Exactly what 25%/, /Flat 25%/, /flat 25% reduction/i,
    /Shop with my 25%/, /25% applies only/, /25% of listed making charges/, /blackDiscountPct['"]?\s*[:=]\s*25/];
  const hits = [];
  [['app.js', APP], ['admin.js', ADMIN], ['index.html', INDEX], ['sw.js', SW], ['api.php', API],
   ['v230.css', V230], ['v231.css', V231]].forEach(([n, src]) => shapes.forEach(re => { if (re.test(src)) hits.push(n + ' ' + re); }));
  T('rate: no shipped surface promises a member 25%', hits.length === 0, hits.join(' | '));
}
T('rate: historical receipts still derive their own percentage',
  /function blackOrderPct\(o\) \{[\s\S]{0,400}?disc \/ basis \* 100/.test(APP_J));

/* ── 6 · the release itself ────────────────────────────────────────────── */
T('stamps: every carrier is at 234',
  (INDEX.match(/\?v=234/g) || []).length === 32 && /__SHIVAA_REL\s*=\s*234/.test(INDEX) &&
  /shivaa-shell-v234/.test(SW) && /const REL = 234/.test(SW) && (SW.match(/\?v=234/g) || []).length === 32 &&
  /APP_REL = 234/.test(APP) && /'rel' => 234/.test(API));
T('bundle: v234.css is last in the cascade order, and in the bundle exactly once',
  ORDER[ORDER.length - 1] === 'v234.css' && ORDER[ORDER.length - 2] === 'v233.css' &&
  (BUNDLE.match(/^\/\* v231\.css \*\/$/gm) || []).length === 1 &&
  BUNDLE.lastIndexOf('/* v234.css */') > BUNDLE.lastIndexOf('/* v233.css */'),
  ORDER.slice(-2).join(' → '));
T('bundle: still exactly one blocking stylesheet',
  (INDEX.match(/<link[^>]+rel="stylesheet"/g) || []).length === 1);
T('markup: the sheet carries every release class that styles it',
  /class="bc-certificate v229 v230 v231"/.test(APP));

/* ── 7 · live ──────────────────────────────────────────────────────────── */
const login = await jpost('/api/auth/login', { email: 'aarti@example.com', password: 'shivaa123' });
const MEM = (login.body || {}).token;
T('live: the fixture member signs in', !!MEM, JSON.stringify(login.body).slice(0, 100));
const card0 = await jget('/api/black-card', MEM);
T('live: the server quotes 20 even though her card stores 25',
  ((card0.body || {}).membership || {}).discountPct === 20, ((card0.body || {}).membership || {}).discountPct);

const b = await boot('#/black-card', { seed: w => { try { w.localStorage.setItem('shv_token', JSON.stringify(MEM)); } catch (e) {} } });
const $ = s => b.doc.querySelector(s);
const $$ = s => [...b.doc.querySelectorAll(s)];
await until(() => $('.bc-certificate'), 15000);
await wait(320);

const cert = $('.bc-certificate');
T('live: the certificate rendered with all three layers',
  !!cert && ['v229', 'v230', 'v231'].every(c => cert.classList.contains(c)), cert && cert.className);
T('live: the name is the member, in caps', WS(($('.bc-cert-name') || {}).textContent) === 'AARTI SHARMA',
  WS(($('.bc-cert-name') || {}).textContent));
const micro = $('.bc-cert-microtext');
T('live: the microtext band is on the sheet, empty of nodes and hidden',
  !!micro && micro.getAttribute('aria-hidden') === 'true' && micro.textContent === '' &&
  (micro.getAttribute('data-microtext') || '').length > 120,
  micro ? (micro.textContent.length + ' chars of text, ' + (micro.getAttribute('data-microtext') || '').length + ' in the attribute') : 'missing');
const bands = $$('.bc-cert-guilloche');
T('live: exactly two guilloche bands, both decorative',
  bands.length === 2 && bands.every(x => x.getAttribute('aria-hidden') === 'true') &&
  bands.some(x => x.classList.contains('bc-guilloche-foot')), bands.length + ' bands');
T('live: still four corners, four record boxes, and the promise at 20%',
  $$('.bc-cert-corner').length === 4 && $$('.bc-cert-meta span').length === 4 &&
  /^20% off/.test(WS(($('.bc-cert-promise') || {}).textContent)),
  [$$('.bc-cert-corner').length, $$('.bc-cert-meta span').length, WS(($('.bc-cert-promise') || {}).textContent).slice(0, 24)].join(' | '));
T('live: signatory, title and verify line survived three layers of redesign',
  /For Shivaa Jewels/.test(WS(($('.bc-cert-sign') || {}).textContent)) &&
  /Proprietor/.test(WS(($('.bc-cert-sign') || {}).textContent)) &&
  /shivaa\.in/.test(WS(($('.bc-cert-verify') || {}).textContent)));
T('live: no page fault, no console error', faults().length === 0 && b.errors.filter(e => !NOISE.test(e)).length === 0,
  faults().concat(b.errors.filter(e => !NOISE.test(e))).slice(0, 2).join(' | '));

const owner = await jpost('/api/auth/login', { email: 'owner@shivaa.in', password: 'shivaa123' });
const ADMIN_TOK = (owner.body || {}).token;
T('live: the owner signs in', !!ADMIN_TOK, owner.status);
const put21 = await jput('/api/settings', { blackDiscountPct: 21 }, ADMIN_TOK);
T('live: the setting still moves', put21.status === 200, put21.status);
const b2 = await boot('#/black-card', { seed: w => { try { w.localStorage.setItem('shv_token', JSON.stringify(MEM)); } catch (e) {} } });
await until(() => b2.doc.querySelector('.bc-cert-promise'), 15000);
await wait(260);
T('live: the certificate follows it, so 20 is a default and not a literal',
  /^21% off/.test(WS((b2.doc.querySelector('.bc-cert-promise') || {}).textContent)),
  WS((b2.doc.querySelector('.bc-cert-promise') || {}).textContent).slice(0, 60));
const back = await jput('/api/settings', { blackDiscountPct: 20 }, ADMIN_TOK);
T('live: restored to the shipped 20', back.status === 200, back.status);

clearTimeout(WATCHDOG);
console.log('\n%d PASS · %d FAIL', ok.length, bad.length);
bad.forEach(x => console.log('  FAIL ' + x));
process.exit(bad.length ? 1 : 0);
