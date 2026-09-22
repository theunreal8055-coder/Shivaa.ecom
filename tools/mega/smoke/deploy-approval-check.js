'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const host = read('.github/workflows/hostinger-deploy.yml');
const catalogue = read('.github/workflows/catalogue-deploy.yml');
const rings = read('.github/workflows/ring-reset.yml');
const guide = read('HOSTINGER-AUTO-DEPLOY.md');

let passed = 0;
let failed = 0;
function check(name, ok) {
  if (ok) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`);
  }
}

check('D01 Hostinger has no push-to-production trigger', !/^  push:/m.test(host));
check('D02 Hostinger remains manually dispatchable', /^  workflow_dispatch:/m.test(host));
check('D03 live code deploy requires the exact owner phrase', host.includes('DEPLOY SHIVAA LIVE') && host.includes('if [ "$APPROVAL" != "DEPLOY SHIVAA LIVE" ]'));
check('D04 live code deploy is restricted to main', host.includes('if [ "$GITHUB_REF" != "refs/heads/main" ]'));
check('D05 preview is enforced as an FTPS dry-run', host.includes("dry-run: ${{ inputs.mode != 'deploy' }}"));
check('D06 source checks all four release stamps', ['REL_HTML=', 'REL_APP=', 'REL_SW=', 'REL_API='].every((s) => host.includes(s)));
check('D07 anti-downgrade compares repository and live releases', host.includes('if [ "$REL_HTML" -lt "$LIVE_REL" ]') && host.includes('ANTI-DOWNGRADE'));
check('D08 live version must be readable before sync', host.includes('api/version?deploy-check=') && host.includes('Could not verify the current live release'));
check('D09 protected server state is excluded', ['data/**', 'uploads/**', '.htaccess', 'config.php', 'setup-mysql.php', '.env.*', 'backups/**'].every((s) => host.includes(s)));
check('D10 tracked credentials are a hard failure', host.includes('test ! -f cms/config.php'));
check('D11 post-deploy verifies matched live stamps', host.includes('api/version?verify=') && host.includes('["stamp"]["matched"]'));
check('D12 catalogue has no push-to-live trigger', !/^  push:/m.test(catalogue));
check('D13 catalogue live writes require their own phrase', catalogue.includes('DEPLOY CATALOGUE LIVE') && catalogue.includes('if [ "$APPROVAL" != "DEPLOY CATALOGUE LIVE" ]'));
check('D14 catalogue live writes are main-only', catalogue.includes('Live catalogue deployment is allowed only from main'));
check('D15 PR catalogue checks remain dry-runs', catalogue.includes("LIVE: ${{ github.event_name == 'pull_request' && 'NO' || inputs.live }}"));
check('D16 ring reset remains manual-only', /^  workflow_dispatch:/m.test(rings) && !/^  push:/m.test(rings));
check('D17 destructive ring reset requires a separate phrase', rings.includes('RESET RINGS LIVE') && rings.includes('if [ "$APPROVAL" != "RESET RINGS LIVE" ]'));
check('D18 runbook says merges are not deployment approval', guide.includes('GitHub pushes and PR merges do **not** update the website'));
check('D19 runbook records the 170-live/169-source downgrade boundary', guide.includes('public website reports release **170**') && guide.includes('GitHub `main` reports release **169**'));
check('D20 runbook keeps credentials out of chat', guide.includes('Never paste FTP credentials into Arena chat'));

console.log(`\nDeployment approval gate: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
