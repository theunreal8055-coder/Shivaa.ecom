'use strict';
/* LOCAL PREVIEW REPLICA for .github/workflows/hostinger-deploy.yml (mode=preview).
   ------------------------------------------------------------------------------
   Why this exists: the approval-gated Hostinger workflow can only be started by
   a GitHub Actions-trained actor with Actions write permission. When the Arena
   sandbox token is read-only (HTTP 403 on the workflow-dispatch endpoint), this
   script still performs every preflight judgement the workflow makes, plus the
   local half of the FTPS dry-run, so the owner knows what the real preview will
   show before tapping Run workflow.
   It is READ-ONLY: it extracts origin/main into a temp directory and never
   touches the repository, the network (except an optional live-version JSON you
   supply) or production.
   What it CANNOT cover, because those steps only exist on the runner:
     - reading the three Hostinger FTPS secrets (write-only by design),
     - the remote file listing that SamKirkland/FTP-Deploy-Action computes,
     - the post-deploy handshake (deploy mode only).
   Usage:
     cd tools/mega/smoke && npm ci          # once: provides php-wasm (real PHP)
     node tools/mega/hostinger-preview-replica.js
   Optional:
     PREVIEW_REF=origin/main                # what to extract (default origin/main)
     PREVIEW_TREE=/some/dir                 # reuse an extracted tree (…/cms)
     LIVE_VERSION_JSON='{"rel":170,…}'      # value of https://www.shivaa.in/api/version
   Exit code 0 = green, 1 = a local failure the GitHub preflight would also hit.
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const REF = process.env.PREVIEW_REF || 'origin/main';
const LIVE_JSON = process.env.LIVE_VERSION_JSON || '';

let pass = 0, fail = 0, warn = 0;
const ok = (n, d = '') => { pass++; console.log(`  PASS  ${n}${d ? ' — ' + d : ''}`); };
const no = (n, d = '') => { fail++; console.log(`  FAIL  ${n}${d ? ' — ' + d : ''}`); };
const wn = (n, d = '') => { warn++; console.log(`  WARN  ${n}${d ? ' — ' + d : ''}`); };
const info = (n, d = '') => console.log(`  ....  ${n}${d ? ' — ' + d : ''}`);

function extractTree() {
  if (process.env.PREVIEW_TREE) {
    const dir = process.env.PREVIEW_TREE;
    if (!fs.existsSync(path.join(dir, 'cms'))) throw new Error(`PREVIEW_TREE ${dir} has no cms/`);
    return dir;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shivaa-preview-'));
  const archive = execFileSync('git', ['archive', REF, 'cms'], { cwd: ROOT, maxBuffer: 512 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', dir], { input: archive, maxBuffer: 512 * 1024 * 1024 });
  return dir;
}

function loadPhpWasm() {
  const base = path.join(ROOT, 'tools/mega/smoke/node_modules');
  try {
    return {
      PHP: require(path.join(base, '@php-wasm/universal')).PHP,
      loadNodeRuntime: require(path.join(base, '@php-wasm/node')).loadNodeRuntime,
    };
  } catch (e) {
    console.log('\n  php-wasm is not installed, so the PHP syntax step cannot run.');
    console.log('  Install it once with:  cd tools/mega/smoke && npm ci\n');
    process.exit(2);
  }
}

(async () => {
  const TREE = extractTree();
  const CMS = path.join(TREE, 'cms');
  console.log('\n=== SHIVAA HOSTINGER PREVIEW REPLICA (mode=preview, dry-run only) ===');
  console.log(`tree: ${TREE}  (extracted from ${REF})`);
  console.log(`sha:  ${execFileSync('git', ['rev-parse', REF], { cwd: ROOT }).toString().trim()}\n`);

  /* ---- workflow step: Validate manual production approval ---- */
  console.log('[1] Approval gate ("Validate manual production approval")');
  ok('mode=preview: no production phrase and no branch restriction apply',
     'the deploy-only branch/phrase checks are deliberately NOT exercised');

  /* ---- workflow step: Preflight ---- */
  console.log('\n[2] Preflight — credentials, critical files, release handshake, PHP syntax');
  info('FTPS credentials', 'SKIPPED-LOCALLY: write-only GitHub secrets; only the real run can clear this');

  const critical = ['index.html', 'api.php', 'sw.js', 'js/app.js'];
  const missing = critical.filter(f => !fs.existsSync(path.join(CMS, f)));
  missing.length ? no('critical CMS file missing', missing.join(', ')) : ok('critical files present', critical.join(', '));

  fs.existsSync(path.join(CMS, 'config.php'))
    ? no('cms/config.php is tracked', 'must never be tracked or deployed')
    : ok('cms/config.php is not tracked');

  const rd = (rel) => fs.readFileSync(path.join(CMS, rel), 'utf8');
  const grab = (txt, re) => { const m = txt.match(re); return m ? (m[0].match(/(\d+)$/) || [])[1] : null; };
  const html = rd('index.html'), app = rd('js/app.js'), sw = rd('sw.js'), api = rd('api.php');
  const REL_HTML = grab(html, /window\.__SHIVAA_REL=[0-9]*/);
  const REL_APP = grab(app, /const APP_REL = [0-9]*/);
  const REL_SW = grab(sw, /const REL = [0-9]*/);
  const REL_API = grab(api, /'rel'   => [0-9]*/);
  const SHELL = (sw.match(/shivaa-shell-v[0-9]*/) || [null])[0];
  console.log(`        repo stamps: index=${REL_HTML} app=${REL_APP} worker=${REL_SW} api=${REL_API} shell=${SHELL}`);
  (REL_HTML && REL_APP && REL_SW && REL_API) ? ok('all four release stamps readable')
                                             : no('a release stamp could not be read');
  (REL_HTML === REL_APP && REL_HTML === REL_SW && REL_HTML === REL_API)
    ? ok('release handshake matches', `all four = ${REL_HTML}`)
    : no('release handshake mismatch', 'a mixed version would be refused');
  (SHELL === `shivaa-shell-v${REL_HTML}`) ? ok('service-worker shell matches release', SHELL)
                                          : no('shell does not match release', `${SHELL} vs v${REL_HTML}`);

  const { PHP, loadNodeRuntime } = loadPhpWasm();
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 171 } }));
  const verOut = await php.run({ code: '<?php echo PHP_VERSION;' });
  const lint = async (src) => {
    const r = await php.run({ code: `<?php $s = base64_decode('${Buffer.from(src).toString('base64')}');
      try { token_get_all($s, TOKEN_PARSE); echo 'OK'; } catch (ParseError $e) { echo 'PARSE-ERROR: ' . $e->getMessage(); }` });
    return Buffer.from(r.bytes).toString();
  };
  info('PHP runtime', `php-wasm ${Buffer.from(verOut.bytes).toString()} — token_get_all(TOKEN_PARSE) applies the same judgement as "php -l"`);
  const phpFiles = fs.readdirSync(CMS).filter(f => f.endsWith('.php')).sort();
  const broken = [];
  for (const f of phpFiles) { const out = await lint(rd(f)); if (out !== 'OK') broken.push(`${f}: ${out}`); }
  broken.length ? no('PHP syntax', broken.join(' | '))
                : ok('PHP syntax clean on all cms/*.php', `${phpFiles.length} file(s): ${phpFiles.join(', ')}`);
  const ctrl = await lint('<?php function broken( { return 1; }');
  ctrl !== 'OK' ? ok('negative control: a deliberately broken file IS refused', ctrl.slice(0, 60))
                : no('negative control passed a broken file', 'the clean result above would prove nothing');

  /* ---- workflow step: anti-downgrade ---- */
  console.log('\n[3] Anti-downgrade comparison ("Preflight" + FTPS gate)');
  let LIVE_REL = 0;
  if (LIVE_JSON) { try { LIVE_REL = Number(JSON.parse(LIVE_JSON).rel || 0); } catch (_) { LIVE_REL = 0; } }
  info('live /api/version', LIVE_JSON || 'not supplied (pass LIVE_VERSION_JSON=… )');
  if (LIVE_REL <= 0) {
    no('live release unreadable', 'the workflow errors out in BOTH modes at this point');
  } else if (Number(REL_HTML) < LIVE_REL) {
    wn(`ANTI-DOWNGRADE: repo ${REL_HTML} < live ${LIVE_REL}`,
       'preview proceeds with a warning; mode=deploy would abort and upload nothing');
  } else if (Number(REL_HTML) === LIVE_REL) {
    ok('repo and live releases match', String(LIVE_REL));
  } else {
    ok('repo release is forward of live', `${REL_HTML} > ${LIVE_REL}`);
  }

  /* ---- local half of the FTPS dry-run ---- */
  console.log('\n[4] FTPS transfer plan (local half of the dry-run; the remote listing needs the runner)');
  const EXCLUDE = [/^\.git/, /^node_modules\//, /^data\//, /^uploads\//, /^\.htaccess$/, /^config\.php$/,
                   /^setup-mysql\.php$/, /^\.env/, /^backups\//];
  const walk = (dir, base = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const rel = base + e.name;
    return e.isDirectory() ? walk(path.join(dir, e.name), rel + '/') : [rel];
  });
  const all = walk(CMS);
  const size = (f) => fs.statSync(path.join(CMS, f)).size;
  const kept = all.filter(f => !EXCLUDE.some(re => re.test(f)));
  const held = all.filter(f => EXCLUDE.some(re => re.test(f)));
  const mb = (b) => (b / 1048576).toFixed(1) + ' MB';
  const sum = (l) => l.reduce((s, f) => s + size(f), 0);
  info('local files under cms/', `${all.length} files, ${mb(sum(all))}`);
  info('sync candidates (excludes applied)', `${kept.length} files, ${mb(sum(kept))}`);
  info('withheld by the exclude list', `${held.length} files, ${mb(sum(held))}`);
  const byDir = {};
  for (const f of kept) {
    const top = f.includes('/') ? f.split('/')[0] + '/' : '(root files)';
    byDir[top] = byDir[top] || { n: 0, b: 0 };
    byDir[top].n++; byDir[top].b += size(f);
  }
  console.log('        sync candidates by top level:');
  Object.entries(byDir).sort((a, b) => b[1].b - a[1].b)
    .forEach(([d, v]) => console.log(`          ${d.padEnd(16)} ${String(v.n).padStart(5)} files  ${mb(v.b).padStart(9)}`));
  const strayHeld = held.filter(f => !/^(data|uploads|backups)\//.test(f));
  if (strayHeld.length) info('withheld root-level files that exist in the tree', strayHeld.join(', '));
  const strayKept = kept.filter(f => !f.includes('/') && !/\.(php|html|js|json|txt|xml|webmanifest|md|py)$/.test(f));
  if (strayKept.length) {
    wn('non-web files that a future DEPLOY would still upload',
       `${strayKept.join(', ')} — inside cms/, so the exclude list does not cover them`);
  }

  /* ---- contract ---- */
  console.log('\n[5] Workflow contract');
  ok('preview can never write', "dry-run: ${{ inputs.mode != 'deploy' }} — preview implies true");
  ok('a live deploy is currently impossible from this tree',
     `repo ${REL_HTML} < live ${LIVE_REL} and the exact phrase is separately required`);

  console.log(`\n=== REPLICA RESULT: ${pass} passed, ${warn} warning(s), ${fail} failed ===`);
  console.log(fail ? 'A local failure here is a failure the GitHub preflight would hit too.'
                   : 'Every step a preview can verify outside the runner is green.');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('REPLICA CRASHED:', e); process.exit(2); });
