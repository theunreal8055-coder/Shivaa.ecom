// The bridge forwards into api.php by setting $_GET['r']. If a whitelisted
// route does not exist there as a POST handler, the bridge answers 404 and
// the owner's chat instruction silently goes nowhere.
const fs = require('fs');
const path = require('path');
const B = path.join(__dirname, '..', '..', '..', 'cms', 'billing');
const inbox = fs.readFileSync(path.join(B, 'inbox.php'), 'utf8');
const api = fs.readFileSync(path.join(B, 'api.php'), 'utf8');
const install = fs.readFileSync(path.join(B, 'install.php'), 'utf8');

// Whitelisted routes
const wlBlock = inbox.split('const BILLING_BRIDGE_ROUTES = [', 2)[1].split('];', 1)[0];
const whitelist = [...wlBlock.matchAll(/^\s*'([a-z0-9\-\/]+)'\s*=>/gm)].map((m) => m[1]);

// POST routes api.php actually serves (literal and regex forms)
const postRoutes = new Set();
for (const m of api.matchAll(/\$route === '([a-z0-9\-\/]+)' && \$method === 'POST'/g)) postRoutes.add(m[1]);
const postRegex = [];
for (const m of api.matchAll(/preg_match\('#\^(.+?)\$#', \$route, \$m\) && \$method === 'POST'/g)) {
  postRegex.push(new RegExp('^' + m[1] + '$'));
}
const serves = (r) => postRoutes.has(r) || postRegex.some((re) => re.test(r));

const dead = whitelist.filter((r) => !serves(r));
console.log('bridge whitelist :', whitelist.join(', '));
whitelist.forEach((r) => console.log((serves(r) ? '  route OK   ' : '  route DEAD ') + r));

// inbox.php reads these settings columns — the installer must create them
const needsCols = ['bridge_enabled', 'bridge_calls'];
const missingCols = needsCols.filter((c) => !install.includes("'" + c + "'"));
missingCols.forEach((c) => console.log('  MISSING COLUMN in migration: ' + c));

// The kill switch must be checked BEFORE the password check
const iSwitch = inbox.indexOf('bridge_enabled');
const iAuth = inbox.indexOf('bridge_admin_ok($pdo, $auth)');
const ordered = iSwitch > 0 && iAuth > 0 && iSwitch < iAuth;
console.log('  kill switch before auth :', ordered ? 'yes' : 'NO');

const ok = dead.length === 0 && missingCols.length === 0 && ordered;
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
