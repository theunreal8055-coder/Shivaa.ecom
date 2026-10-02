/* v188 — B2B & B2C Daily WhatsApp Broadcast Studio, Unbranded Showroom Counter
   Mode, Family Gold Locker, Digital Shagun Referral Card & B2B Town Referrals,
   checked statically. Runtime behaviour executed by v188-php-run under PHP 8.3.

   SUPERSEDED-PROBE v188 — stamp-exact suite for release 188: on a NEWER
   tree it SKIPs; on its own release or an overlay of its zip it runs in full. */
{
  const fs0 = require('fs'), path0 = require('path');
  const cms0 = process.env.SMOKE_CMS || path0.resolve(__dirname, '../../../cms');
  const m0 = /__SHIVAA_REL\s*=\s*(\d+)/.exec(fs0.readFileSync(path0.join(cms0, 'index.html'), 'utf8'));
  const rel0 = m0 ? +m0[1] : 0;
  if (rel0 > 188) {
    console.log('SKIP v188-check superseded by release ' + rel0 + ' (stamp-exact; its regression content runs in the current chain php-run)');
    process.exit(0);
  }
}

const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const CMS = process.env.SMOKE_CMS || path.resolve(__dirname, '../../../cms');
const ROOT = path.resolve(__dirname, '../../..');
const rd = n => fs.readFileSync(path.join(CMS, n), 'utf8');
const index = rd('index.html'), sw = rd('sw.js'), app = rd('js/app.js'), admin = rd('js/admin.js'), api = rd('api.php');
const installer = rd('upgrade-sql.php');
const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/hostinger-deploy.yml'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
let pass = 0, fail = 0;
setTimeout(() => { console.error('v188 harness deadline exceeded'); process.exit(1); }, 60000);
async function test(id, name, f) { try { await f(); pass++; console.log(`PASS ${id} ${name}`); } catch (e) { fail++; console.log(`FAIL ${id} ${name}: ${e.message}`); } }

(async () => {
  await test('S01', 'release 188 in lockstep across all four stamp sites', async () => {
    assert.ok(index.includes('window.__SHIVAA_REL=188;'), 'index stamp');
    assert.ok(app.includes('const APP_REL = 188;'), 'app stamp');
    assert.ok(sw.includes("const SHELL = 'shivaa-shell-v188';") && sw.includes('const REL = 188;'), 'worker stamps');
    assert.ok(api.includes("'rel'   => 188,"), 'api version endpoint');
  });

  await test('S02', 'every asset URL re-stamped to 188, zero 187 leftovers, media cache preserved', async () => {
    assert.equal((index.match(/\?v=188/g) || []).length, 60, 'index carries the full 60x asset sheet');
    assert.equal((sw.match(/\?v=188/g) || []).length, 53, 'worker precache list 53x');
    for (const [name, src] of [['index.html', index], ['sw.js', sw], ['js/app.js', app]])
      assert.ok(!src.includes('?v=187'), name + ' still pins a v187 asset URL');
    assert.ok(!app.includes('APP_REL = 187') && !index.includes('__SHIVAA_REL=187'), 'no old release stamps');
    assert.ok(sw.includes("const MEDIA = 'shivaa-media-v168';"), 'ring photo cache preserved');
  });

  await test('S03', 'api.php exposes v188 WhatsApp Broadcast Studio, vCard, Subscriber & B2B Referral routes', async () => {
    assert.ok(api.includes("$route === 'whatsapp/vcard' && $method === 'GET'"), 'whatsapp/vcard GET route');
    assert.ok(api.includes("$route === 'whatsapp/subscribe' && $method === 'POST'"), 'whatsapp/subscribe POST route');
    assert.ok(api.includes("$route === 'b2b/refer-partner' && $method === 'POST'"), 'b2b/refer-partner POST route');
    assert.ok(api.includes("$route === 'admin/broadcast-pack' && $method === 'GET'"), 'admin/broadcast-pack GET route');
    for (const k of ['b2c_daily', 'b2c_ratedrop', 'b2c_poll', 'b2c_first_pitch', 'b2b_morning', 'b2b_first_pitch', 'b2b_deadstock']) {
      assert.ok(api.includes(`'${k}' =>`), `broadcast template ${k} present`);
    }
  });

  await test('S04', 'admin.js wires WA Broadcast tab, Dual-PDF generator (Unbranded Counter + Partner 0.92), and Partner Referral form', async () => {
    assert.ok(admin.includes("['broadcast','📲','WA Broadcast']"), 'admin sidebar WA Broadcast tab');
    assert.ok(admin.includes("if (tab === 'broadcast')"), 'admin broadcast tab renderer');
    assert.ok(admin.includes('/api/admin/broadcast-pack'), 'admin fetches broadcast-pack');
    assert.ok(admin.includes('window.ShivaaAdmin.printUnbrandedCatalogue ='), 'unbranded customer PDF printer');
    assert.ok(admin.includes('window.ShivaaAdmin.printPartnerCatalogue ='), 'B2B partner 0.92 PDF printer');
    assert.ok(admin.includes('window.ShivaaAdmin.submitPartnerReferral ='), 'partner referral submit handler');
  });

  await test('S05', 'app.js wires B2C Daily WhatsApp Club, Family Gold Locker, Digital Shagun Card, B2B Counter Mode & Unbranded PDF', async () => {
    assert.ok(app.includes('id="waDailyClubCard"'), 'rates page Daily WhatsApp Club card');
    assert.ok(app.includes('window.Shivaa.subscribeWhatsApp ='), 'WhatsApp subscribe handler');
    assert.ok(app.includes('window.Shivaa.referB2BPartner ='), 'B2B partner referral handler');
    assert.ok(app.includes('id="familyGoldLocker"'), 'account page Family Gold Locker');
    assert.ok(app.includes('DIGITAL SHAGUN PRIVILEGE CARD'), 'refer page Digital Shagun Privilege Card');
    assert.ok(app.includes('toggleCounterMode()') && app.includes('printCustomerPdf()'), 'B2B Design Selection Counter Mode & Unbranded PDF');
    assert.ok(app.includes('id="b2bGrowthDesk"'), 'B2B page 9:45 AM Broadcast & Town Referral desk');
  });

  await test('S06', 'v187 private KYC storage, Phase 1-4 SQL, relay & Hostinger deploy safety nets remain intact', async () => {
    assert.ok(api.includes('function shv_kyc_private_dir(): ?string'), 'v187 private KYC storage intact');
    assert.ok(admin.includes('ShivaaAdmin.viewBusinessCard(this)'), 'v187 secure admin KYC viewer intact');
    assert.ok(admin.includes('function v179HealthStrip(R)'), 'v179 relay health strip');
    assert.ok(admin.includes('v180DbStrip'), 'v180 db strip');
    assert.ok(admin.includes("if (tab === 'intake')"), 'v182 catalogue intake tab');
    assert.ok(workflow.includes('data/**') && workflow.includes('uploads/**') && workflow.includes('config.php'), 'deploy exclusions intact');
  });

  await test('S07', 'app.js, admin.js, sw.js, api.php and upgrade-sql.php parse with zero syntax errors', async () => {
    execFileSync(process.execPath, ['--check', path.join(CMS, 'js/app.js')]);
    execFileSync(process.execPath, ['--check', path.join(CMS, 'js/admin.js')]);
    execFileSync(process.execPath, ['--check', path.join(CMS, 'sw.js')]);
    const Engine = require('php-parser');
    const p = new Engine({ parser: { extractDoc: false, php7: true }, ast: { withPositions: false } });
    p.parseCode(api, 'api.php');
    p.parseCode(installer, 'upgrade-sql.php');
  });

  await test('S08', 'smoke package.json chains v188-check and v188-php-run alongside the v187–v168 regression belt', async () => {
    assert.ok(pkg.scripts.test.includes('v188-check.js') && pkg.scripts.test.includes('v188-php-run.js'), 'v188 suites on chain');
    assert.ok(pkg.scripts.test.includes('v187-check.js') && pkg.scripts.test.includes('v187-php-run.js'), 'v187 suites on chain');
    assert.ok(pkg.scripts.test.includes('v186-check.js'), 'v186 check carried');
  });

  console.log(`\nv188 check: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
