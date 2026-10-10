/* v184 — Amrita ji's private thank-you page + the coupon-scope money fix.
   Static half. The executed-PHP half runs under v184-php-run.js.

   Two things are checked here that no parser can catch:
     · the service worker actually PARSES — a stray comment-closer in the
       changelog had made sw.js a syntax error, and a worker that cannot parse
       never registers, so the offline shell and every release announcement
       were silently dead
     · the private page cannot be reached while its switch is off
   SUPERSEDED-PROBE — stamp-exact for release 184: on a NEWER tree it SKIPs. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 184) {
    console.log('SKIP v184-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in the current chain php-run)');
    process.exit(0);
  }
}

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const rd = n => fs.readFileSync(path.join(CMS, n), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'),
      api = rd('api.php'), admin = rd('js/admin.js'), css184 = rd('css/v184.css');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v184 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  await test('A01', 'release 184 in lockstep across all four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=184;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 184;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v184';") && sw.includes('const REL = 184;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 184,"), 'api version endpoint');
  });

  await test('A02', 'every asset re-stamped to 184, no 183 leftovers, media untouched', async () => {
    assert.ok((index.match(/\?v=184/g) || []).length >= 56, 'index asset sheet, got ' + (index.match(/\?v=184/g) || []).length);
    assert.equal((sw.match(/\?v=184/g) || []).length, 52, 'worker precache list (51 + v184.css)');
    assert.equal((sw.match(/\?v=183/g) || []).length, 0, 'worker still pins 183');
    for (const [n, src] of [['index.html', index], ['js/app.js', app], ['sw.js', sw]])
      assert.equal((src.match(/\?v=183/g) || []).length, 0, n + ' still pins ?v=183');
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'MEDIA must stay at 168');
  });

  await test('A03', 'the service worker PARSES — a stray */ in the changelog had broken it', async () => {
    // The v183 note was inserted after the comment block's closing */, which
    // made the whole worker a syntax error. node --check is the only thing that
    // catches that class of mistake, so it is a test, not a manual step.
    execFileSync(process.execPath, ['--check', path.join(CMS, 'sw.js')], { stdio: 'pipe' });
    // and it is still ONE comment block: exactly one opener and one closer
    const head = sw.slice(0, sw.indexOf("'use strict';"));
    assert.equal((head.match(/\/\*/g) || []).length, 1, 'the changelog comment was closed early');
    assert.equal((head.match(/\*\//g) || []).length, 1, 'the changelog comment has more than one closer');
    for (const f of ['js/app.js', 'js/admin.js']) execFileSync(process.execPath, ['--check', path.join(CMS, f)], { stdio: 'pipe' });
  });

  await test('A04', 'v184.css is the LAST stylesheet and is precached by the worker', async () => {
    const links = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
    assert.equal(links[links.length - 1], '/css/v184.css?v=184', 'v184.css must load last so it wins');
    assert.ok(sw.includes("'/css/v184.css?v=184'"), 'the worker does not precache the new layer');
    assert.ok(css184.includes('@media (prefers-reduced-motion:reduce)'), 'no reduced-motion guard');
    // the animation layer must be inert when the phone asks for less motion
    assert.ok(/\.am-confetti\{display:none\}/.test(css184.replace(/\s/g, '')), 'confetti survives reduced motion');
  });

  await test('A05', 'the page is phone-first: 16px inputs, safe-area padding, no hover-only affordance', async () => {
    assert.ok(/font-size:16px/.test(css184), 'inputs must be 16px or iOS zooms on focus');
    assert.ok(/env\(safe-area-inset-bottom\)/.test(css184), 'no safe-area padding for the home-bar');
    assert.ok(/min-height:100svh/.test(css184), 'no svh height (mobile browser chrome)');
    assert.ok(css184.includes('.am-star'), 'no tappable stars');
    assert.ok(css184.includes('.am-dish'), 'no dish cards');
  });

  await test('A06', 'the private page exists, is dark by default, and bounces home when off', async () => {
    assert.ok(app.includes('pages.amrita = async (view) =>'), 'no amrita page');
    assert.ok(app.includes("if (!(state.settings && state.settings.amritaPage)) { location.hash = '#/'; return; }"),
      'the page does not check the switch before rendering');
    assert.ok(!index.includes('href="#/amrita"'), 'the page must not be linked unconditionally — it is private');
    assert.ok(app.includes("${state.settings && state.settings.amritaPage ? `"), 'the home card is not gated on the switch');
    assert.ok(app.includes('href="#/amrita"'), 'no way in while the switch is on');
  });

  await test('A07', 'the page walks the owner\'s five steps in order', async () => {
    assert.ok(/const AM = \{ step: 1,/.test(app), 'no star step');
    assert.ok(/am-stars/.test(app) && app.includes("data-n=\"${n}\""), 'no 1–5 star control');
    assert.ok(app.includes('AM.stars === 5'), 'no 5-star branch');
    assert.ok(app.includes('is-five'), 'no celebration variant');
    assert.ok(app.includes('is-warm'), 'no graceful variant for a lower rating');
    assert.ok(app.includes('just a <em>trailer</em>, mam.'), 'the "trailer" reveal is missing');
    for (const d of ['idli', 'dosa', 'paneer']) assert.ok(app.includes("'" + d + "'"), 'dish ' + d + ' missing');
    assert.ok(app.includes('/api/auth/send-otp'), 'the page does not reuse the retail OTP door');
    assert.ok(app.includes('/api/auth/otp-login'), 'no OTP login step');
    assert.ok(app.includes('/api/auth/register'), 'no sign-up step for a new number');
    assert.ok(app.includes('/api/amrita/card'), 'the card is never requested');
    assert.ok(app.includes('Optional &mdash; only if you want to'), 'the optional details are not marked optional');
  });

  await test('A08', 'the card is system-allotted, never chosen by the guest', async () => {
    assert.ok(api.includes('function amrita_card_code'), 'no server-side card generator');
    assert.ok(api.includes("'AMR-' . $a . '-' . $b"), 'card number shape missing');
    // the client only ever DISPLAYS the code the server returns
    assert.ok(app.includes('${esc(AM.card || \'\')}'), 'the client must render the server number');
    assert.ok(!/AM\.card\s*=\s*['\"]AMR-/.test(app), 'the client must not invent a card number');
    assert.ok(api.includes("$code = amrita_card_code($db);"), 'the route does not allot the code');
  });

  await test('A09', 'a percent coupon can be scoped to making charges, and the default is unchanged', async () => {
    assert.ok(api.includes('function coupon_scope('), 'no coupon_scope helper');
    assert.ok(api.includes('function coupon_discount('), 'no single discount calculator');
    assert.ok(api.includes("in_array($s, ['making', 'makingcharge', 'making_charge'], true) ? 'making' : 'all'"),
      'an unknown scope must fall back to all');
    // the order route must slice the right base
    assert.ok(api.includes('$makingBase += ((float)($pr[\'makingCharge\'] ?? 0)) * $qty;'), 'making base never accumulated');
    assert.ok(api.includes("$calc = coupon_discount($coupon, $subtotal, $makingBase);"), 'the order route does not use the calculator');
    assert.ok(api.includes("'couponScope' => $couponScope,"), 'the order row does not record which base was used');
    // the checkout preview must show the server number, not its own arithmetic
    assert.ok(app.includes('makingTotal: window._co.makingTotal'), 'the preview does not send the making base');
    assert.ok(app.includes('Number.isFinite(+c.discount) ? +c.discount'), 'the preview still recomputes the discount');
  });

  await test('A10', 'the owner can switch the page off in one click, and the server enforces it', async () => {
    assert.ok(admin.includes('name="amritaPage"'), 'no admin toggle');
    assert.ok(admin.includes('amritaPage: !!document.querySelector'), 'the toggle is never saved');
    assert.ok(api.includes("'amritaPage'") && api.includes("'forceLatestVersion', 'amritaPage'"),
      'amritaPage is not validated as a strict boolean');
    assert.ok(app.includes('window.Shivaa.amKill'), 'no one-click take-down on the page itself');
    assert.ok(app.includes("body: JSON.stringify({ amritaPage: false })"), 'the kill button does not clear the switch');
    assert.ok(api.includes("if (empty($db['settings']['amritaPage']))\n      jout(404,"), 'the card route does not check the switch server-side');
  });

  await test('A11', 'her details live in their own collection and survive the page being removed', async () => {
    assert.ok(api.includes("$db['amritaGuests'][] = $guest;"), 'no guest collection');
    assert.ok(api.includes("if (!is_array($db['amritaGuests'] ?? null)) $db['amritaGuests'] = [];"), 'collection is not initialised');
    assert.ok(!/unset\(\$db\['amritaGuests'\]\)/.test(api), 'something deletes the collection');
    // the kill path only clears a setting — it must not touch the guest rows
    assert.ok(!/amritaGuests.*=\s*\[\]/.test(api.replace("if (!is_array($db['amritaGuests'] ?? null)) $db['amritaGuests'] = [];", '')), 'the guest rows are wiped somewhere');
    assert.ok(api.includes("audit_log($db, 'amrita.card.issued'"), 'card issuance is not audited');
  });

  await test('A12', 'the card route cannot be driven by someone else\'s session', async () => {
    assert.ok(api.includes("if (!$u) jout(401,"), 'an anonymous request can mint a card');
    assert.ok(api.includes("if ($phone !== $uPhone)\n      jout(403,"), 'the submitted phone is not checked against the session');
    // a missing number is a form mistake (400), never a session error (403)
    assert.ok(api.includes("if (!preg_match('#^[6-9]\\d{9}$#', $phone))"), 'an empty phone is not reported as a form mistake');
    assert.ok(api.includes("rate_block($db, 'amrita-card-ip'"), 'no per-connection cap');
    assert.ok(api.includes("rate_block($db, 'amrita-card-u'"), 'no per-account cap');
    assert.ok(api.includes("'scope' => 'making',"), 'the issued card is not scoped to making charges');
    assert.ok(api.includes("'oncePerUser' => true, 'forUser' => \$u['id']"), 'the card is not single-use and personal');
  });

  await test('A13', 'the card is idempotent — a refresh never mints a second coupon', async () => {
    assert.ok(api.includes("if (\$existing && !empty(\$existing['cardCode']))"), 'no existing-card short circuit');
    assert.ok(api.includes("'already' => true"), 'the client cannot tell a fresh card from a repeat');
  });

  await test('A14', 'the owner can correct a mis-scoped coupon himself, in one click', async () => {
    assert.ok(api.includes("preg_match('#^coupons/([\\\\w-]+)$#', \$route, \$cpM) && \$method === 'PUT'"),
      'no coupon edit route');
    assert.ok(api.includes("\$cp['scope'] = coupon_scope(['scope' => \$b['scope']]);"), 'the edit route does not sanitise scope');
    assert.ok(api.includes("audit_log(\$db, 'coupon.updated'"), 'coupon edits are not audited');
    assert.ok(admin.includes('ShivaaAdmin.couponToggle'), 'the Active checkbox in the table still does nothing');
    assert.ok(admin.includes('ShivaaAdmin.couponFix'), 'no way to correct a scope from the admin');
    assert.ok(admin.includes('const body = { scope: g(\'scope\'), active: g(\'active\') === \'1\' };'),
      'the fix form does not send the scope');
    assert.ok(admin.includes('<th>Takes off</th>'), 'the scope is invisible in the coupons table');
  });

  await test('A15', 'nothing private about the guest leaks into the public surface', async () => {
    /* The page must never name her bank, her branch or her account status.
       Her blocked SBI account is the family's business, not the website's — the
       page is about the food and the thanks. (The shop's OWN town and the word
       "account" for a shop login are fine and are deliberately not in this
       list; the guard targets banking facts only.) */
    const page = app.slice(app.indexOf('pages.amrita = async'), app.indexOf('pages.shop = async'));
    for (const word of ['SBI', 'State Bank', 'blocked', 'frozen', 'IFSC', 'netbanking', 'branch manager'])
      assert.ok(!new RegExp(word.replace(/ /g, '\\s'), 'i').test(page),
        'the page mentions "' + word + '" — that is her business, not the site\'s');
    assert.ok(!rd('sitemap.php').includes('/#/amrita'), 'the private page must not be crawlable');
    assert.ok(api.includes("need_admin(\$db);\n    jout(200, ['guests' => array_values(\$db['amritaGuests'] ?? [])]);"),
      'the guest read-back is not admin-only');
  });

  console.log(`\nv184-check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
