/* v183 — the Play Store release: Digital Asset Links, the web-manifest identity,
   the in-app account erasure Play requires, and the launch kit's own invariants.
   Static + executed: the PHP half runs under v183-php-run.js.

   SUPERSEDED-PROBE v183 — stamp-exact suite for release 183: on a NEWER tree it
   SKIPs (its regression content re-executes inside the current chain php-run);
   on its own release or an overlay of its zip it runs in full. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 183) {
    console.log('SKIP v183-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in the current chain php-run)');
    process.exit(0);
  }
}

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const ROOT = path.resolve(__dirname, '../../..');
const KIT = path.join(ROOT, 'playstore');
const rd = n => fs.readFileSync(path.join(CMS, n), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'), api = rd('api.php');
let pass = 0, fail = 0;
setTimeout(() => { console.error('v183 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  await test('S01', 'release 183 in lockstep across all four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=183;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 183;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v183';") && sw.includes('const REL = 183;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 183,"), 'api version endpoint');
  });

  await test('S02', 'every asset URL re-stamped to 183, zero 182 leftovers, media untouched', async () => {
    assert.ok((index.match(/\?v=183/g) || []).length >= 56, 'index carries the full asset sheet, got ' + (index.match(/\?v=183/g) || []).length);
    assert.equal((sw.match(/\?v=183/g) || []).length, 51, 'worker precache list');
    for (const [name, src] of [['index.html', index], ['js/app.js', app], ['sw.js', sw]])
      assert.ok(!src.includes('?v=182'), name + ' still pins a v182 asset URL');
    assert.ok(!app.includes('APP_REL = 182') && !index.includes('__SHIVAA_REL=182'), 'no old release stamps');
    assert.ok(!sw.includes("SHELL = 'shivaa-shell-v182'") && !sw.includes('const REL = 182;'), 'no old worker stamps');
    assert.ok(!api.includes("'rel'   => 182,"), 'api rel bumped');
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'MEDIA generation must not move without new media');
  });

  /* ── the Play Store substrate ── */
  await test('P01', 'the web manifest gained a stable id in BOTH copies', async () => {
    for (const f of ['manifest.json', 'manifest.webmanifest']) {
      const m = JSON.parse(rd(f));
      assert.ok(m.id, f + ' has no "id" — the PWA and the Play app would be two identities');
      assert.equal(m.display, 'standalone', f + ' display');
      assert.ok(m.icons.some(i => i.sizes === '512x512' && (i.purpose || 'any').includes('any')), f + ' 512 any icon');
      assert.ok(m.icons.some(i => i.purpose && i.purpose.includes('maskable')), f + ' maskable icon');
      for (const i of m.icons)
        if (i.src.startsWith('/images/')) assert.ok(fs.existsSync(path.join(CMS, i.src)), f + ' points at a missing icon ' + i.src);
    }
    assert.equal(rd('manifest.json').trim(), rd('manifest.webmanifest').trim(), 'the two copies drifted');
  });

  await test('P02', 'assetlinks.json ships in .well-known with the right delegation', async () => {
    const f = path.join(CMS, '.well-known', 'assetlinks.json');
    assert.ok(fs.existsSync(f), 'cms/.well-known/assetlinks.json is not in the tree');
    const links = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.ok(Array.isArray(links) && links.length === 1, 'must be a 1-element array');
    assert.ok(links[0].relation.includes('delegate_permission/common.handle_all_urls'), 'must delegate handle_all_urls');
    assert.equal(links[0].target.namespace, 'android_app', 'namespace');
    assert.equal(links[0].target.package_name, 'in.shivaa.jewels', 'package name must match twa-manifest.json');
    const fps = links[0].target.sha256_cert_fingerprints || [];
    assert.ok(fps.length >= 2, 'needs the upload key AND the Play App Signing key');
    const placeholder = /^REPLACE_WITH_(UPLOAD_KEY|PLAY_APP_SIGNING)_SHA256_FINGERPRINT$/;
    for (const fp of fps) {
      assert.ok(placeholder.test(fp) || /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fp) || /^[0-9A-F]{64}$/.test(fp),
        'neither a SHA-256 fingerprint nor the exact kit placeholder: ' + fp);
    }
    // Until the keystore exists the file must say so out loud, in BOTH slots.
    if (fps.every(f => placeholder.test(f)))
      assert.ok(fs.readFileSync(path.join(KIT, 'assetlinks.json'), 'utf8').includes('REPLACE_WITH_UPLOAD_KEY'),
        'kit and shipped copies disagree about being unfilled');
  });

  await test('P03', 'a .htaccess in .well-known/ defeats the *.json deny rule', async () => {
    const f = path.join(CMS, '.well-known', '.htaccess');
    assert.ok(fs.existsSync(f), 'cms/.well-known/.htaccess is missing — Google would fetch a 403');
    const h = fs.readFileSync(f, 'utf8');
    assert.ok(/Require\s+all\s+granted/i.test(h), 'no "Require all granted"');
    assert.ok(/FilesMatch[^>]*json/.test(rd('.htaccess')), 'the parent *.json deny rule is gone — this guard assumed it');
  });

  await test('P04', 'the launch kit exists and is internally consistent', async () => {
    for (const f of ['twa-manifest.json', 'assetlinks.json', 'htaccess-wellknown.txt', 'verify.mjs', 'CHECKLIST.md'])
      assert.ok(fs.existsSync(path.join(KIT, f)), 'playstore/' + f + ' is missing');
    const twa = JSON.parse(fs.readFileSync(path.join(KIT, 'twa-manifest.json'), 'utf8'));
    const links = JSON.parse(fs.readFileSync(path.join(KIT, 'assetlinks.json'), 'utf8'));
    assert.equal(twa.packageId, links[0].target.package_name, 'kit package names disagree');
    assert.equal(twa.host, 'shivaa.in', 'host');
    assert.ok(twa.iconUrl.startsWith('https://'), 'iconUrl must be absolute https');
    assert.ok(Number.isInteger(twa.appVersionCode) && twa.appVersionCode >= 1, 'appVersionCode');
    assert.equal(twa.enableNotifications, false, 'web push must stay off — no VAPID backend ships');
    // the kit must never carry a credential
    const raw = fs.readFileSync(path.join(KIT, 'twa-manifest.json'), 'utf8');
    for (const bad of ['keystorePassword', 'keyPassword', 'storePassword', 'BEGIN PRIVATE KEY', 'service_account'])
      assert.ok(!raw.toLowerCase().includes(bad.toLowerCase()), 'credential in twa-manifest.json: ' + bad);
  });

  await test('P05', 'no keystore or generated Android project is tracked in git', async () => {
    const tracked = require('node:child_process').execSync('git ls-files playstore cms/.well-known', {cwd: ROOT}).toString().split('\n');
    for (const f of tracked) {
      assert.ok(!/\.(keystore|jks|p12|pfx)$/i.test(f), 'a signing key is committed: ' + f);
      assert.ok(!/^playstore\/twa\//.test(f), 'the generated Android project is committed: ' + f);
      assert.ok(!/service[-_]?account/i.test(f), 'a service-account key is committed: ' + f);
    }
    const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
    for (const pat of ['*.keystore', '*.jks', 'playstore/twa/'])
      assert.ok(gi.includes(pat), '.gitignore has no "' + pat + '" rule');
  });

  /* ── the account erasure Play requires ── */
  await test('D01', 'POST /api/auth/delete-account exists, is gated, and erases instead of hard-deleting', async () => {
    assert.ok(api.includes("$route === 'auth/delete-account'"), 'route missing');
    let body = api.slice(api.indexOf("$route === 'auth/delete-account'"));
    const end = body.indexOf("$route === 'addresses'");
    assert.ok(end > 0, 'could not isolate the route body');
    body = body.slice(0, end);
    assert.ok(body.includes('rate_block('), 'no throttling — a script could mass-erase accounts');
    assert.ok(body.includes('req_user($db)'), 'no session path');
    assert.ok(body.includes('hash_equals('), 'no OTP verification for the logged-out path');
    assert.ok(body.includes("trim((string)($b['confirm'] ?? '')) !== 'DELETE'"), 'no explicit confirmation word');
    assert.ok(body.includes("'admin'"), 'the owner account must be protected');
    assert.ok(body.includes("'partner'"), 'a B2B partner account must be protected');
    assert.ok(body.includes("'Deleted customer'") && body.includes('@privacy.local'), 'must anonymise the way v86 does');
    assert.ok(body.includes('anonymizedAt'), 'must stamp the erasure');
    assert.ok(body.includes("$db['tokens']"), 'must revoke every login token for the account');
    // a whole ROW may go (it would orphan every order); a single field may not be mistaken for one
    assert.ok(!/unset\(\$db\['users'\]\[\$[a-zA-Z_]+\]\)/.test(body), 'hard-deleting the user row would break order history');
    assert.ok(!/array_splice\(\$db\['users'\]/.test(body), 're-indexing the users array would corrupt ids');
    assert.ok(body.includes("$db['users'][$ui]['name']"), 'erasure must rewrite the row in place, the way admin anonymise does');
  });

  await test('D02', 'the app offers the erasure page and links to it from the account screen', async () => {
    assert.ok(app.includes("pages['delete-account']"), 'no in-app erasure page');
    assert.ok(app.includes("'#/delete-account'"), 'the account screen does not link to it');
    assert.ok(app.includes("'/api/auth/delete-account'"), 'the page never calls the route');
    assert.ok(app.includes('Erase my account'), 'no visible affordance');
    const sm = rd('sitemap.php');
    assert.ok(sm.includes('/#/delete-account'), 'the erasure page must be crawlable — Play Console needs a working URL');
  });

  console.log(`\nv183-check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
