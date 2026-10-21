#!/usr/bin/env node
/* playstore/version-bump.mjs — the version-code ledger.

   Play refuses an AAB whose `versionCode` has ever been uploaded for this
   package. That is the one number a rushed "update today" gets wrong, and the
   error arrives *after* a 40 MB upload. So the rule in this repo is:

     twa-manifest.json always holds the NEXT, NEVER-UPLOADED version code.
     uploads.json records every code that actually went to Play.

   Workflow
     1. build the AAB from the manifest as it stands
     2. upload it
     3. node playstore/version-bump.mjs uploaded <track> ["note"]
        -> records that code as used and moves the manifest to the next one

   Commands
     node playstore/version-bump.mjs --status
     node playstore/version-bump.mjs uploaded internal "first upload"
     node playstore/version-bump.mjs uploaded production "v228 content"

   Exit codes: 0 ok · 1 bad input · 2 the manifest would reuse an uploaded code
*/
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MAN = path.join(HERE, 'twa-manifest.json');
const LEDGER = path.join(HERE, 'uploads.json');
const TRACKS = ['internal', 'closed', 'open', 'production'];

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const man = readJson(MAN);
const ledger = fs.existsSync(LEDGER)
  ? readJson(LEDGER)
  : { packageId: man.packageId, uploads: [] };

function fail(code, msg) { console.error(msg); process.exit(code); }

if (ledger.packageId && ledger.packageId !== man.packageId) {
  fail(1, 'packageId mismatch: manifest is ' + man.packageId + ', ledger is ' + ledger.packageId +
    '\nA different package id means a different app. Fix the ledger by hand only if the id change is intended.');
}

const rows = Array.isArray(ledger.uploads) ? ledger.uploads.slice() : [];
const used = new Map(rows.map(r => [r.versionCode, r]));
const current = man.appVersionCode;
const reusing = used.has(current);

function status() {
  console.log('package      ' + man.packageId);
  console.log('manifest     versionCode ' + current + '  ·  version ' + man.appVersion +
    (reusing ? '   ← ALREADY UPLOADED (blocker)' : '   (next, unused)'));
  if (!rows.length) {
    console.log('ledger       empty — nothing has been uploaded yet');
  } else {
    console.log('ledger       ' + rows.length + ' upload(s):');
    for (const r of rows) {
      console.log('  #' + String(r.versionCode).padEnd(4) + ' ' + String(r.version).padEnd(8) +
        String(r.track || '?').padEnd(11) + String(r.at || '') + (r.note ? '  — ' + r.note : ''));
    }
    const max = Math.max(...rows.map(r => r.versionCode));
    if (current <= max) {
      console.log('\nBLOCKER: the manifest code ' + current + ' is not above the highest uploaded code (' + max + ').');
      console.log('Play would reject the upload after 40 MB. Bump it:');
      console.log('  node playstore/version-bump.mjs set ' + (max + 1));
      return 2;
    }
  }
  console.log('\nOK — the manifest holds a code Play has never seen.');
  return 0;
}

const args = process.argv.slice(2);
if (!args.length || args[0] === '--status' || args[0] === '-s') process.exit(status());

if (args[0] === 'set') {
  const n = Number(args[1]);
  if (!Number.isInteger(n) || n < 1) fail(1, 'Usage: node playstore/version-bump.mjs set <positive integer>');
  if (used.has(n)) fail(2, 'STOP: versionCode ' + n + ' was already uploaded (row #' + n + ' in uploads.json). Play rejects reused codes.');
  if (n <= Math.max(0, ...rows.map(r => r.versionCode))) {
    fail(2, 'STOP: ' + n + ' is not above the highest uploaded code (' + Math.max(0, ...rows.map(r => r.versionCode)) + ').');
  }
  man.appVersionCode = n;
  fs.writeFileSync(MAN, JSON.stringify(man, null, 2) + '\n');
  console.log('manifest versionCode -> ' + n + ' (version ' + man.appVersion + ' unchanged)');
  process.exit(0);
}

if (args[0] === 'uploaded') {
  const track = args[1];
  if (!TRACKS.includes(track)) fail(1, 'Usage: node playstore/version-bump.mjs uploaded <' + TRACKS.join('|') + '> ["note"]\n  got: ' + (track || '(nothing)'));
  if (reusing) {
    fail(2, 'STOP: versionCode ' + current + ' is already in uploads.json (row #' + current + ').\n' +
      'That means this AAB was uploaded before. Play will reject it.\n' +
      'Bump first, rebuild, upload:\n  node playstore/version-bump.mjs set ' +
      (Math.max(0, ...rows.map(r => r.versionCode)) + 1));
  }
  const note = args.slice(2).join(' ').trim();
  const at = new Date().toISOString().slice(0, 10);
  rows.push({ versionCode: current, version: man.appVersion, track, at, ...(note ? { note } : {}) });
  ledger.packageId = man.packageId;
  ledger.uploads = rows;
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');

  /* move the manifest to the next unused code and a patch-bumped version */
  const next = Math.max(current, ...rows.map(r => r.versionCode)) + 1;
  const parts = String(man.appVersion || '1.0.0').split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  man.appVersionCode = next;
  man.appVersion = parts.join('.');
  fs.writeFileSync(MAN, JSON.stringify(man, null, 2) + '\n');

  console.log('recorded: versionCode ' + current + ' · ' + rows[rows.length - 1].version + ' · ' + track + ' · ' + at);
  console.log('manifest moved to: versionCode ' + next + ' · version ' + man.appVersion + ' (for the NEXT build)');
  console.log('\nCommit uploads.json and twa-manifest.json so no machine ever reuses a code.');
  process.exit(0);
}

fail(1, 'Unknown command "' + args[0] + '".\n' +
  'Commands:\n  --status\n  uploaded <internal|closed|open|production> ["note"]\n  set <versionCode>');
