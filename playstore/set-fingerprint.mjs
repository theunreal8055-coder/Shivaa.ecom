#!/usr/bin/env node
/* playstore/set-fingerprint.mjs — paste the two signing fingerprints into BOTH
   copies of the Digital Asset Links file, in one command.

   The kit warns about it twice, because it is the failure everybody makes:
   `playstore/assetlinks.json` and `cms/.well-known/assetlinks.json` must be
   byte-identical, and the one Google fetches is the SHIPPED copy. Editing only
   the kit copy means the app opens with a browser address bar and Play says
   "your app is not linked to your website".

   Usage
     node playstore/set-fingerprint.mjs --status
     node playstore/set-fingerprint.mjs <upload-sha256> <play-signing-sha256>

   Both arguments are the colon form Bubblewrap prints, e.g.
     AA:BB:CC:...:99   (32 byte pairs = 95 characters)

   Nothing here talks to Google; it only edits two JSON files in this repo.
*/
import fs from 'node:fs';

const KIT = 'playstore/assetlinks.json';
const SHIPPED = 'cms/.well-known/assetlinks.json';
const PLACEHOLDERS = [
  'REPLACE_WITH_UPLOAD_KEY_SHA256_FINGERPRINT',
  'REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT'
];

const FP = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));

function status() {
  let bad = 0;
  for (const p of [KIT, SHIPPED]) {
    if (!fs.existsSync(p)) { console.log('MISSING ' + p); bad++; continue; }
    const j = read(p);
    const fps = (j[0] && j[0].target && j[0].target.sha256_cert_fingerprints) || [];
    const placeholders = fps.filter(f => PLACEHOLDERS.includes(f)).length;
    console.log(p + ': ' + fps.length + ' fingerprint(s), ' + placeholders + ' still a placeholder');
    if (placeholders) bad++;
  }
  const same = JSON.stringify(read(KIT)) === JSON.stringify(read(SHIPPED));
  console.log('the two copies are ' + (same ? 'identical' : 'DIFFERENT — fix this before anything'));
  if (!same) bad++;
  if (bad) {
    console.log('\nNot ready. Run:\n  node playstore/set-fingerprint.mjs <upload-sha256> <play-signing-sha256>');
    process.exit(2);
  }
  console.log('\nReady: both copies carry real fingerprints and agree.');
  process.exit(0);
}

const args = process.argv.slice(2);
if (!args.length || args[0] === '--status' || args[0] === '-s') status();

if (args.length !== 2) {
  console.error('Usage: node playstore/set-fingerprint.mjs <upload-sha256> <play-signing-sha256>');
  process.exit(1);
}
const upper = args.map(a => String(a).trim().toUpperCase().replace(/\s+/g, ''));
for (const [i, fp] of upper.entries()) {
  if (!FP.test(fp)) {
    console.error(
      'Argument ' + (i + 1) + ' is not a SHA-256 fingerprint.\n' +
      '  expected: AA:BB:CC:…:99 (32 byte pairs, 95 characters, colons between)\n' +
      '  got:      ' + (fp.slice(0, 60) || '(empty)')
    );
    process.exit(1);
  }
}
if (upper[0] === upper[1]) {
  console.error('The upload key and the Play app signing key cannot be the same fingerprint here —\n' +
    'with Play App Signing Google holds one key and you hold the other. Paste the two different values.');
  process.exit(1);
}

/* The shape is fixed by v183's kit: one delegation entry, one package. Only the
   fingerprints change — nothing else in the file is rewritten. */
const shape = read(KIT);
shape[0].target.sha256_cert_fingerprints = upper;

const text = JSON.stringify(shape, null, 2) + '\n';
fs.writeFileSync(KIT, text);
fs.writeFileSync(SHIPPED, text);

const same = fs.readFileSync(KIT, 'utf8') === fs.readFileSync(SHIPPED, 'utf8');
console.log('wrote both copies' + (same ? ' (identical)' : ' — THEY DIFFER, stop!'));
console.log('  ' + KIT);
console.log('  ' + SHIPPED);
console.log('\nNext: deploy the web tree, then check from a phone or a terminal:');
console.log('  curl -s https://shivaa.in/.well-known/assetlinks.json | head -20');
console.log('It must return this JSON — a 403 means cms/.well-known/.htaccess did not land.');
if (!same) process.exit(1);
