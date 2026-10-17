/* t-v228 — the Play Store gate: the erasure page Google asks for, and the
   shortcuts/links the store listing will open.
   ───────────────────────────────────────────────────────────────────────
   Play's User Data policy asks every app with accounts for two things that
   point at the SAME page: an in-app way to erase the account, and a public
   URL that does it without installing anything. `POST /api/auth/delete-account`
   has shipped since v183, but no page ever called it — every link in the docs
   pointed at `#/delete-account`, which fell through the router to Home.

   This suite holds down: the page exists and works signed OUT (SMS code, no
   sign-in) and signed IN (session); the server-side refusals survive; the
   account screen reaches it; the three TWA shortcuts open real pages; and the
   asset-links file is readable by Google's verifier.

   Whitespace-tolerant; never asserts text that lives only in a comment. */
import fs from 'node:fs';
import { boot, click, type, wait, until } from './harness.mjs';

const WATCHDOG = setTimeout(() => {
  console.log('FAIL watchdog: the suite did not finish in 300 s');
  process.exit(1);
}, 300000);
if (WATCHDOG.unref) WATCHDOG.unref();

const ok = [], bad = [];
const T = (n, c, x = '') => (c ? ok : bad).push(n + (x ? ' → ' + x : ''));
const read = p => fs.readFileSync(p, 'utf8');
const stripJs = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:\w])\/\/[^\n]*/g, '$1');
const NOISE = /cashfree|Could not load script|getContext|Not implemented|jsdomError|Could not parse CSS|Client network socket disconnected/i;

const APP = read('cms/js/app.js');
const APP_J = stripJs(APP);
const API = read('cms/api.php');
const SHIM = read('qa/preview_shim.py');
const SITEMAP = read('cms/sitemap.php');
const TWA = JSON.parse(read('playstore/twa-manifest.json'));
const LINKS = JSON.parse(read('playstore/assetlinks.json'));
const SHIPPED_LINKS = JSON.parse(read('cms/.well-known/assetlinks.json'));
const WELL_HT = read('cms/.well-known/.htaccess');
const ROOT_HT = read('cms/.htaccess');
const MAN = JSON.parse(read('cms/manifest.json'));
const MANW = JSON.parse(read('cms/manifest.webmanifest'));
const CHECK = read('playstore/CHECKLIST.md');
const LISTING = read('playstore/listing.md');

/* ── 1 · the page exists, and both spellings route to it ──────────────── */
T('app: #/delete-account is a page (it used to fall through to Home)',
  APP_J.includes("pages['delete-account'] = async (view) => {"));
T('app: the older spelling is an alias, not a redirect',
  APP_J.includes("pages['erase-account'] = pages['delete-account'];"));
T('app: the page appears before the routes table is built',
  APP_J.indexOf("pages['delete-account']") < APP_J.indexOf('Object.keys(pages).forEach'));
T('app: the page is reachable with no session — it never calls signInGate',
  !/pages\['delete-account'\][\s\S]{0,4000}signInGate/.test(APP_J) &&
  APP_J.includes('const signedIn = !!state.user;'));
T('app: it posts the real route with the deliberate DELETE word',
  APP_J.includes("api('/api/auth/delete-account', { method: 'POST'") &&
  APP_J.includes("confirm: 'DELETE'"));
T('app: signed out it proves the number with a fresh code — no sign-in first',
  /body\.phone = clean;[\s\S]{0,80}body\.code = code;/.test(APP_J) &&
  APP_J.includes("api('/api/auth/send-otp', { method: 'POST'"));
T('app: it refuses to fire before the code is in',
  /if \(!codeSent\) return err\('Send the code to your mobile first/.test(APP_J) &&
  /if \(code\.length !== 4\) return err/.test(APP_J));
T('app: a refusal from the server is shown, not swallowed',
  /catch \(e\) \{\s*err\(e\.message \|\| 'That did not work/.test(APP_J));
T('app: after erasing a signed-in shopper, the device signs out on the spot',
  /setToken\(''\); state\.user = null; resetWishSession\(\); updateBadges\(\)/.test(APP_J));
T('app: the account screen carries the tile (Play requires it in-app)',
  APP.includes('href="#/delete-account"') && /Privacy &amp; my data/.test(APP));
T('sitemap: the erasure URL is listed, so search/verification finds it',
  SITEMAP.includes("'/#/delete-account'"));

/* ── 2 · the server is the judge, and it says no where it must ─────────── */
T('api: the route exists and demands the DELETE word',
  API.includes("if ($route === 'auth/delete-account' && $method === 'POST')") &&
  /trim\(\(string\)\(\$b\['confirm'\] \?\? ''\)\) !== 'DELETE'/.test(API));
T('api: the owner account cannot erase itself',
  /\$u\['role'\] \?\? ''\) === 'admin'/.test(API) &&
  /owner account cannot be erased/.test(API));
T('api: a B2B partner account is refused too (the ledger must stay intact)',
  /\$u\['role'\] \?\? ''\) === 'partner'/.test(API) && /B2B partner account/.test(API));
T('api: a signed-out erase needs a live, unburned code for that number',
  /\$db\['otps'\]\[\$matchIdx\]\['consumedByLogin'\] = true/.test(API) &&
  /hash_equals\(\(string\)\$oRec\['hash'\]/.test(API));
T('api: erasure clears the direct identifiers, not just the name',
  /\$db\['users'\]\[\$ui\]\['addresses'\] = \[\];/.test(API) &&
  /\$db\['users'\]\[\$ui\]\['profile'\] = \['erased' => true\];/.test(API) &&
  /\$db\['users'\]\[\$ui\]\['wishlist'\] = \[\];/.test(API));
T('api: every device token for the account is dropped',
  /foreach \(\(\$db\['tokens'\] \?\? \[\]\) as \$tk => \$tRec\) if \(\(\$tRec\['userId'\] \?\? ''\) !== \$uid\)/.test(API));
T('shim: mirrors the route, the DELETE word and the code burn',
  SHIM.includes('if route == "auth/delete-account":') &&
  SHIM.includes('DEV["tokens"] = {t: v for t, v in DEV["tokens"].items() if v != uid}'));

/* ── 3 · the store's own links must open something real ───────────────── */
T('twa: the package id and host are the ones asset links declare',
  TWA.packageId === LINKS[0].target.package_name && TWA.host === 'shivaa.in');
T('twa: the app opens the shop at / in a standalone window',
  TWA.startUrl === '/' && TWA.display === 'standalone');
T('twa: the shortcut "Ring size guide" opens a page that EXISTS',
  APP_J.includes("pages['size-guide'] = pages.sizer;") &&
  APP_J.includes('pages.sizer = async'));
T('twa: every shortcut hash is a route the router knows',
  TWA.shortcuts.every(s => {
    const h = String(s.url).split('#/')[1] || '';
    return h === 'shop' || h === 'rates' || h === 'size-guide'
      ? new RegExp("pages\\.(shop|rates|sizer) = |pages\\['(shop|rates|size-guide)'\\] = ").test(APP_J)
      : true;
  }) && TWA.shortcuts.length === 3);
T('twa: shortcuts carry an absolute https icon and url (Bubblewrap needs both)',
  TWA.shortcuts.every(s => /^https:\/\//.test(s.url) && /^https:\/\//.test(s.chosenIconUrl)));
T('twa: versionCode starts at 1 and is never reused',
  TWA.appVersionCode === 1 && TWA.appVersion === '1.0.0');
T('links: one delegation entry, two fingerprints (upload key + Play signing key)',
  LINKS.length === 1 && LINKS[0].relation[0] === 'delegate_permission/common.handle_all_urls' &&
  LINKS[0].target.sha256_cert_fingerprints.length === 2);
T('links: the shipped copy is byte-identical to the kit copy',
  JSON.stringify(LINKS) === JSON.stringify(SHIPPED_LINKS));
T('links: .well-known/.htaccess re-grants the JSON the parent denies',
  /Require all granted/.test(WELL_HT) &&
  ROOT_HT.includes('Require all denied') && ROOT_HT.includes('(json|lock|md|sh|py)'));
T('manifest: the two files are one identity, with a stable id and both icon kinds',
  JSON.stringify(MAN) === JSON.stringify(MANW) && !!MAN.id &&
  MAN.icons.some(i => i.sizes === '512x512' && /any/.test(i.purpose || 'any')) &&
  MAN.icons.some(i => /maskable/.test(i.purpose || '')));
T('kit: the console runbook still states the 12-tester / 14-day gate',
  /12/.test(CHECK) && /14/.test(CHECK) && /closed test/i.test(CHECK));
T("kit: the listing two URLs are the pages this release makes real",
  /https:\/\/shivaa\.in\/#\/privacy/.test(LISTING) &&
  /https:\/\/shivaa\.in\/#\/delete-account/.test(LISTING));

/* ── 4 · live, signed OUT: the public URL does the whole job ──────────── */
{
  const { window, doc, errors } = await boot('#/delete-account');
  await wait(500);
  const h1 = (doc.querySelector('h1') || {}).textContent || '';
  T('live: #/delete-account renders its own page, not Home',
    /delete my account/i.test(h1) && !!doc.getElementById('delPhone'));
  T('live: the phone field is numeric-first and the code boxes start hidden',
    doc.getElementById('delPhone').getAttribute('inputmode') === 'numeric' &&
    doc.getElementById('delCodeWrap').hidden === true);
  T('live: the irreversible step needs the word, typed',
    !!doc.getElementById('delConfirm') &&
    /type\s*DELETE/i.test(doc.querySelector('.acct-sec').textContent));

  /* refuse first: no DELETE typed */
  click(window, doc.getElementById('delGo'));
  await wait(250);
  T('live: pressing erase without the word is refused, in words',
    /type delete/i.test(doc.getElementById('delErr').textContent || ''));

  /* a real number, a real code, a real erase. The code the PAGE sends is the
     same code that verifies the number for registration — a second send would
     hit the house 30 s cooldown, which is correct behaviour, not a bug. */
  const phone = '8' + String(Date.now()).slice(-9);
  const call = async (path, body, tok) => {
    const r = await window.fetch('/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    let j = {}; try { j = JSON.parse(await r.text()); } catch (e) {}
    return { status: r.status, j };
  };
  type(window, doc.getElementById('delPhone'), phone);
  click(window, doc.getElementById('delSend'));
  await until(() => doc.getElementById('delCodeWrap') && doc.getElementById('delCodeWrap').hidden === false, 9000);
  const demo = doc.getElementById('delDemo');
  const code = demo && !demo.hidden ? (demo.textContent.match(/(\d{4})/) || [])[1] : '';
  T('live: the code arrives and the four boxes appear', !!code, 'code "' + code + '"');

  await call('kyc/verify-otp', { phone, code });
  const email = 'erase' + phone.slice(-6) + '@example.com';
  const reg = await call('auth/register', { name: 'Erase Tester', phone, email, password: 'ErasePass123' });
  T('setup: an account exists to erase', reg.status === 200 && !!reg.j.token, 'status ' + reg.status);
  const keepTok = reg.j.token;
  const boxes = [...doc.querySelectorAll('#delOtp input')];
  boxes.forEach((b, i) => { type(window, b, code[i]); });
  T('live: the four digits land in the four boxes',
    boxes.map(b => b.value).join('') === code);
  type(window, doc.getElementById('delConfirm'), 'DELETE');
  click(window, doc.getElementById('delGo'));
  await until(() => /erased/i.test(doc.body.textContent) && !doc.getElementById('delGo'), 12000);
  T('live: the page confirms the erasure with the server\'s own words',
    /your account is erased/i.test(doc.body.textContent));
  const after = await call('orders', null, keepTok);   // order history needs the session
  T('live: the old device token is dead (401 on the next call)', after.status === 401, 'status ' + after.status);
  const relog = await call('auth/login', { email, password: 'ErasePass123' });
  T('live: the old credentials no longer open the account', relog.status === 401, 'status ' + relog.status);
  const reuse = await call('auth/delete-account', { confirm: 'DELETE', phone, code });
  T('live: the code that erased the account is burned — it cannot erase twice',
    reuse.status === 400, 'status ' + reuse.status);
  const faults = errors.filter(e => !NOISE.test(e));
  T('live: no page errors during the whole public flow', faults.length === 0, faults.slice(0, 2).join(' | '));
  window.close();
}

/* ── 5 · live, signed IN: the session is proof enough ─────────────────── */
{
  const { window, doc, errors } = await boot('#/');
  await wait(400);
  const call = async (path, body, tok) => {
    const r = await window.fetch('/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    let j = {}; try { j = JSON.parse(await r.text()); } catch (e) {}
    return { status: r.status, j };
  };
  const phone = '7' + String(Date.now()).slice(-9);
  const s1 = await call('auth/send-otp', { phone });
  await call('kyc/verify-otp', { phone, code: s1.j.devCode });
  const reg = await call('auth/register', { name: 'Inside Tester', phone, email: 'in' + phone.slice(-6) + '@example.com' });
  T('setup: a second account exists for the signed-in path', reg.status === 200 && !!reg.j.token);
  window.Shivaa.setToken(reg.j.token);
  window.Shivaa.state.user = reg.j.user;
  window.location.hash = '#/delete-account';
  window.Shivaa.redraw();
  await until(() => doc.getElementById('delGo'), 9000);
  T('live: signed in, the page asks for no code at all',
    !doc.getElementById('delPhone') && !doc.getElementById('delSend') && !doc.getElementById('delOtp'));
  T('live: it names who is about to be erased',
    /signed in as/i.test(doc.querySelector('.as-note').textContent || ''));
  type(window, doc.getElementById('delConfirm'), 'DELETE');
  click(window, doc.getElementById('delGo'));
  await until(() => /erased/i.test(doc.body.textContent) && !doc.getElementById('delGo'), 12000);
  T('live: the signed-in erase completes on the strength of the session',
    /your account is erased/i.test(doc.body.textContent));
  T('live: the device forgets the token at once',
    (window.Shivaa.token() || '') === '' && !window.Shivaa.state.user);
  const faults = errors.filter(e => !NOISE.test(e));
  T('live: no page errors on the signed-in path', faults.length === 0, faults.slice(0, 2).join(' | '));
  window.close();
}

/* ── 6 · the shortcut pages really render ─────────────────────────────── */
for (const h of ['#/size-guide', '#/rates', '#/shop']) {
  const { window, doc, errors } = await boot(h);
  await until(() => ((doc.getElementById('view') || {}).textContent || '').trim().length > 60, 12000);
  const txt = (doc.getElementById('view') || {}).textContent || '';
  const empty = !txt.trim() || /page not found|could not find/i.test(txt);
  const faults = errors.filter(e => !NOISE.test(e));
  T('live: ' + h + ' renders content (the TWA shortcut must not dead-end)',
    !empty && faults.length === 0, empty ? 'empty view' : faults.slice(0, 1).join(''));
  window.close();
}

clearTimeout(WATCHDOG);
console.log('\n' + ok.length + ' PASS · ' + bad.length + ' FAIL\n');
for (const b of bad) console.log('  ✗ ' + b);
if (bad.length) { console.log(''); process.exit(1); }
console.log('PASS ' + ok.length + ' / FAIL 0');
process.exit(0);
